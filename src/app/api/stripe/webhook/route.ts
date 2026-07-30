/**
 * POST /api/stripe/webhook
 * Reçoit les événements Stripe et met à jour le statut d'abonnement dans `profiles`.
 * Vérifie la signature avec STRIPE_WEBHOOK_SECRET.
 *
 * ⚠️ RÈGLE À NE PAS DÉFAIRE : si on n'arrive pas à écrire en base, ou si on
 * n'arrive pas à savoir de quel compte il s'agit, cette route répond en ERREUR.
 * Avant, elle répondait 200 quoi qu'il arrive : Stripe considérait l'événement
 * traité, ne le rejouait jamais, et un client pouvait avoir payé sans que son
 * compte bouge, sans que personne soit prévenu. En répondant en erreur, Stripe
 * rejoue l'événement pendant 3 jours et alerte par e-mail après plusieurs
 * échecs. C'est notre seul filet d'alarme, il ne coûte rien.
 *
 * Colonnes attendues sur `profiles` (vérifiées présentes le 2026-07-29) :
 *   subscription_tier text, is_premium bool, subscription_status text,
 *   stripe_customer_id text, current_period_end timestamptz
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  appliquerAbonnement,
  synchroniserSouscription,
  trouverUtilisateur,
  finDePeriode,
  planDeLaSouscription,
} from "@/lib/stripeSync";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  if (!SECRET || !WEBHOOK_SECRET) {
    // Pas encore configuré → on ne casse rien
    return NextResponse.json({ received: true, configured: false });
  }

  const stripe = new Stripe(SECRET);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] signature invalide:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;

        // Une session peut se terminer sans paiement (essai gratuit mis à part,
        // un virement en attente reste `unpaid`) : on ne donne l'accès que si
        // Stripe considère la session réglée ou l'abonnement lancé.
        if (s.status !== "complete") break;

        const userId = await trouverUtilisateur(admin, {
          userId: s.metadata?.user_id ?? null,
          customerId,
        });
        if (!userId) {
          throw new Error(`session ${s.id} non rattachée à un compte`);
        }

        // La souscription porte le statut qui fait foi (trialing, active…).
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await appliquerAbonnement(admin, userId, {
            tier: planDeLaSouscription(),
            status: sub.status,
            customerId,
            periodEnd: finDePeriode(sub),
          });
        } else {
          await appliquerAbonnement(admin, userId, {
            tier: planDeLaSouscription(),
            status: "active",
            customerId,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const resultat = await synchroniserSouscription(admin, sub);
        if (!resultat) {
          throw new Error(`souscription ${sub.id} non rattachée à un compte`);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Erreur volontairement remontée à Stripe : il rejouera l'événement.
    console.error("[stripe/webhook]", event.type, err);
    return NextResponse.json(
      { error: "traitement_impossible", event: event.type },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
