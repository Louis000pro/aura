/**
 * POST /api/stripe/reconcile
 * Filet de sécurité : demande à Stripe l'état réel de l'abonnement du compte et
 * remet le profil d'aplomb. En-tête Authorization: Bearer <access_token>.
 *
 * Body optionnel : { session_id } (la session de checkout qu'on vient de payer).
 * Sans session_id, on repart du client Stripe déjà enregistré sur le profil.
 *
 * À quoi ça sert : le webhook peut échouer (base indisponible, déploiement en
 * cours, endpoint mal configuré). Dans ce cas le client a payé et son compte
 * n'a pas bougé. La page de retour appelle donc cette route, qui vérifie
 * directement auprès de Stripe. C'est Stripe qui fait foi, jamais le client :
 * on ne fait confiance ni au paramètre d'URL ni à ce que le navigateur affirme.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { souscriptionActiveChezStripe, synchroniserSouscription } from "@/lib/stripeSync";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ premium: false, configured: false });
  }

  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const compte = authData?.user;
    if (authError || !compte) {
      return NextResponse.json({ error: "session_invalide" }, { status: 401 });
    }

    const { session_id } = (await req.json().catch(() => ({}))) as { session_id?: string };
    const stripe = new Stripe(SECRET);

    let clientStripe: string | null = null;

    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      // La session doit appartenir au compte qui appelle : sinon n'importe qui
      // pourrait passer l'identifiant de session d'un autre.
      if (session.metadata?.user_id && session.metadata.user_id !== compte.id) {
        return NextResponse.json({ error: "session_etrangere" }, { status: 403 });
      }
      clientStripe = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;
    }

    if (!clientStripe) {
      const { data: profil } = await admin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", compte.id)
        .maybeSingle();
      clientStripe = (profil?.stripe_customer_id as string | null) ?? null;
    }

    if (!clientStripe) {
      return NextResponse.json({ premium: false, trouve: false });
    }

    const active = await souscriptionActiveChezStripe(stripe, clientStripe);
    if (!active) {
      return NextResponse.json({ premium: false, trouve: true });
    }

    const resultat = await synchroniserSouscription(admin, active, compte.id);
    return NextResponse.json({ premium: !!resultat?.premium, trouve: true });
  } catch (err) {
    console.error("[stripe/reconcile]", err);
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }
}
