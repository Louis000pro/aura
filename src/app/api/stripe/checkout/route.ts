/**
 * POST /api/stripe/checkout
 * Crée une session Stripe Checkout (abonnement) avec essai gratuit.
 * Body: { plan: "premium" } + en-tête Authorization: Bearer <access_token>
 * Renvoie { url } vers la page de paiement hébergée par Stripe.
 *
 * Le compte vient du TOKEN, jamais du corps de la requête : avant, n'importe
 * qui pouvait envoyer l'identifiant d'un autre utilisateur.
 *
 * Deux garde-fous anti double prélèvement, dans cet ordre :
 *   1. notre base dit déjà premium → on refuse ;
 *   2. Stripe dit qu'une souscription tourne déjà → on refuse ET on répare le
 *      profil au passage (cas d'un webhook qui s'était perdu).
 *
 * Inactif tant que STRIPE_SECRET_KEY n'est pas défini (renvoie 503 clair).
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { PLANS, isPaidPlan, type PlanId } from "@/lib/plans";
import { souscriptionActiveChezStripe, synchroniserSouscription } from "@/lib/stripeSync";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vaiiya.fr";

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { error: "not_configured", message: "Les paiements seront bientôt activés" },
      { status: 503 }
    );
  }

  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json(
        { error: "non_authentifie", message: "Reconnecte-toi pour continuer" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const compte = authData?.user;
    if (authError || !compte) {
      return NextResponse.json(
        { error: "session_invalide", message: "Reconnecte-toi pour continuer" },
        { status: 401 }
      );
    }

    const { plan } = (await req.json()) as { plan?: PlanId };
    if (!isPaidPlan(plan)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const planId = plan as PlanId;
    const p = PLANS[planId];
    const stripe = new Stripe(SECRET);

    const { data: profil } = await admin
      .from("profiles")
      .select("is_premium, stripe_customer_id")
      .eq("id", compte.id)
      .maybeSingle();

    if (profil?.is_premium) {
      return NextResponse.json(
        { error: "deja_abonne", message: "Ton abonnement est déjà actif" },
        { status: 409 }
      );
    }

    const clientStripe = (profil?.stripe_customer_id as string | null) ?? null;

    if (clientStripe) {
      const active = await souscriptionActiveChezStripe(stripe, clientStripe);
      if (active) {
        // Notre base était en retard : on la remet d'aplomb plutôt que de
        // laisser la personne payer une deuxième fois.
        await synchroniserSouscription(admin, active, compte.id);
        return NextResponse.json(
          { error: "deja_abonne", message: "Ton abonnement est déjà actif" },
          { status: 409 }
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      // On réutilise le client Stripe existant s'il y en a un : sinon chaque
      // passage en caisse créerait un doublon impossible à réconcilier.
      customer: clientStripe ?? undefined,
      customer_email: clientStripe ? undefined : compte.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: p.currency,
            unit_amount: p.priceCents,
            recurring: { interval: "month" },
            product_data: {
              name: `Vaiiya ${p.name}`,
              description: p.tagline,
            },
          },
        },
      ],
      subscription_data: {
        trial_period_days: p.trialDays || undefined,
        metadata: { user_id: compte.id, plan: planId },
      },
      metadata: { user_id: compte.id, plan: planId },
      allow_promotion_codes: true,
      // `session_id` permet à la page de retour de vérifier elle-même le
      // paiement si le webhook a échoué (voir /api/stripe/reconcile).
      success_url: `${APP_URL}/premium?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/premium?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }
}
