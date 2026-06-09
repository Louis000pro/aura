/**
 * POST /api/stripe/checkout
 * Crée une session Stripe Checkout (abonnement) avec essai gratuit.
 * Body: { user_id, email, plan: "premium" | "creator" }
 * Renvoie { url } vers la page de paiement hébergée par Stripe.
 *
 * Inactif tant que STRIPE_SECRET_KEY n'est pas défini (renvoie 503 clair).
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PLANS, type PlanId } from "@/lib/plans";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vaiiya.fr";

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { error: "not_configured", message: "Les paiements seront bientôt activés 💜" },
      { status: 503 }
    );
  }

  try {
    const { user_id, email, plan } = (await req.json()) as {
      user_id?: string;
      email?: string;
      plan?: PlanId;
    };

    if (!user_id || !plan || (plan !== "premium" && plan !== "creator")) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const p = PLANS[plan];
    const stripe = new Stripe(SECRET);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email || undefined,
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
        metadata: { user_id, plan },
      },
      metadata: { user_id, plan },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/premium?success=1`,
      cancel_url: `${APP_URL}/premium?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }
}
