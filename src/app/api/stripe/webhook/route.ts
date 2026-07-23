/**
 * POST /api/stripe/webhook
 * Reçoit les événements Stripe et met à jour le statut d'abonnement dans `profiles`.
 * Vérifie la signature avec STRIPE_WEBHOOK_SECRET.
 *
 * Colonnes attendues sur `profiles` :
 *   subscription_tier text, is_premium bool, subscription_status text,
 *   stripe_customer_id text, current_period_end timestamptz
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import type { PlanId } from "@/lib/plans";

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

  const setTier = async (
    userId: string,
    tier: PlanId,
    status: string,
    customerId?: string | null,
    periodEnd?: number | null
  ) => {
    const patch: Record<string, unknown> = {
      subscription_tier: tier,
      is_premium: tier !== "free",
      subscription_status: status,
    };
    if (customerId) patch.stripe_customer_id = customerId;
    if (periodEnd) patch.current_period_end = new Date(periodEnd * 1000).toISOString();
    const { error } = await admin.from("profiles").update(patch).eq("id", userId);
    if (error) console.error("[stripe/webhook] update profile:", error.message);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.user_id;
        const plan = (s.metadata?.plan as PlanId) || "premium";
        if (userId) await setTier(userId, plan, "active", s.customer as string);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = (sub.metadata?.plan as PlanId) || "premium";
        if (userId) {
          // statuts considérés "actifs" : active, trialing, past_due (grâce)
          const active = ["active", "trialing", "past_due"].includes(sub.status);
          await setTier(
            userId,
            active ? plan : "free",
            sub.status,
            sub.customer as string,
            (sub as unknown as { current_period_end?: number }).current_period_end ?? null
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) await setTier(userId, "free", "canceled", sub.customer as string);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler:", err);
  }

  return NextResponse.json({ received: true });
}
