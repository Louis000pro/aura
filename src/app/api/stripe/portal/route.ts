/**
 * POST /api/stripe/portal
 * Ouvre le portail client Stripe : voir ses factures, changer sa carte, et
 * surtout RÉSILIER. En-tête Authorization: Bearer <access_token>.
 *
 * Pourquoi cette route existe : la page /premium promettait « annule en 1 clic »
 * alors qu'aucun écran ne permettait d'arrêter l'abonnement. En France, résilier
 * doit être aussi simple que souscrire, et c'est le premier motif de litige.
 *
 * ⚠️ Côté Stripe, le portail doit être activé une fois dans le dashboard
 * (Paramètres → Portail client), sinon l'API renvoie une erreur de configuration.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase-admin";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vaiiya.fr";

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { error: "not_configured", message: "Les paiements ne sont pas encore activés" },
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

    const { data: profil } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", compte.id)
      .maybeSingle();

    const clientStripe = (profil?.stripe_customer_id as string | null) ?? null;
    if (!clientStripe) {
      return NextResponse.json(
        { error: "aucun_abonnement", message: "Aucun abonnement n’est rattaché à ce compte" },
        { status: 404 }
      );
    }

    const stripe = new Stripe(SECRET);
    const session = await stripe.billingPortal.sessions.create({
      customer: clientStripe,
      return_url: `${APP_URL}/parametres`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json(
      { error: "stripe_error", message: "Impossible d’ouvrir la gestion de l’abonnement" },
      { status: 500 }
    );
  }
}
