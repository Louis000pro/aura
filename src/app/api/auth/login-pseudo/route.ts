import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase-admin";
import { autoriserRafale } from "@/lib/rateLimit";

const FORME_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Connexion par PSEUDO (ou email) sans jamais renvoyer l'email au client.
 *
 * Un pseudo est public (il s'affiche sur les profils, dans la communauté) ;
 * une adresse email ne l'est pas. Résoudre pseudo → email côté client
 * laisserait n'importe qui moissonner des emails en essayant des pseudos.
 * Toute la résolution ET la vérification du mot de passe vivent donc ici :
 *   - sans `password` → on répond seulement `{ existe }` (étape 1) ;
 *   - avec `password`  → on se connecte côté serveur et on rend les JETONS
 *     de session, que le client pose avec `setSession`. L'email ne sort pas.
 *
 * L'email reste géré par `/api/auth/check-email` + le `signIn` client : cette
 * route ne s'occupe que du cas pseudo, plus le repli email par sécurité.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifiant = typeof body?.identifiant === "string" ? body.identifiant.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!identifiant || identifiant.length < 2) {
      return Response.json({ existe: false }, { status: 200 });
    }

    // Garde-fou anti-énumération : on limite les tentatives par identifiant.
    if (!autoriserRafale("login-pseudo", identifiant.toLowerCase(), 30)) {
      return Response.json({ error: "Trop de tentatives. Réessaie dans un moment." }, { status: 429 });
    }

    const admin = createAdminClient();

    /* Résolution de l'email associé, en base et jamais renvoyée. Un email
       reste un email ; un pseudo se cherche dans `profiles` (égalité
       insensible à la casse, sans joker : `ilike` sur la valeur exacte). */
    let email = "";
    if (FORME_EMAIL.test(identifiant)) {
      email = identifiant;
    } else {
      const { data: profil } = await admin
        .from("profiles")
        .select("id")
        .ilike("pseudo", identifiant)
        .limit(1)
        .maybeSingle();
      const id = (profil as { id?: string } | null)?.id;
      if (id) {
        const { data: u } = await admin.auth.admin.getUserById(id);
        email = u?.user?.email ?? "";
      }
    }

    // Étape 1 : on dit seulement si le compte existe, jamais lequel.
    if (!password) {
      return Response.json({ existe: !!email }, { status: 200 });
    }

    // Étape 2 : sans email résolu, on ne distingue jamais « pseudo inconnu »
    // de « mauvais mot de passe » — même message générique.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!email || !url || !anon) {
      return Response.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
    }

    const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    const session = data?.session;
    if (error || !session) {
      return Response.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
    }

    return Response.json(
      { access_token: session.access_token, refresh_token: session.refresh_token },
      { status: 200 },
    );
  } catch (e) {
    console.error("login-pseudo error:", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
