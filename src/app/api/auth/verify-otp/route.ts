import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autoriserEssai } from "@/lib/rateLimit";
import { verifierJeton } from "@/lib/jetonCode";

/**
 * Vérifie le code reçu par e-mail ET crée le compte, dans le même geste.
 *
 * Avant, ce contrôle ne décidait de rien : la page créait le compte elle-même
 * avec `supabase.auth.signUp`, et Supabase confirmait l'adresse d'office.
 * N'importe qui pouvait donc s'inscrire avec l'adresse de quelqu'un d'autre
 * sans jamais voir le code. Désormais le compte n'existe que si le serveur a
 * vu le bon code, et il naît avec son adresse confirmée.
 */
const MAX_ESSAIS_PAR_CODE = 5;
const MDP_MIN = 6;

const propre = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Le jeton porte sa propre signature : on la sert de clé pour compter les
    // essais. Cinq mauvais codes, et ce jeton est grillé (6 chiffres = un
    // million de possibilités, cinq essais n'en couvrent rien).
    const cleJeton = typeof body?.token === "string" ? body.token.slice(-64) : "";
    if (!cleJeton || !(await autoriserEssai("code-inscription", cleJeton, MAX_ESSAIS_PAR_CODE, 15 * 60 * 1000))) {
      return Response.json({ error: "Trop d’essais. Renvoie un nouveau code." }, { status: 429 });
    }

    const v = verifierJeton(body?.token, body?.otp);
    if (!v.ok) return Response.json({ error: v.erreur }, { status: 400 });

    const pseudo = propre(body?.pseudo, 40);
    const name = propre(body?.name, 60);
    const lastName = propre(body?.lastName, 60);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!pseudo) return Response.json({ error: "Choisis un pseudo." }, { status: 400 });
    if (password.length < MDP_MIN || password.length > 200) {
      return Response.json({ error: `Ton mot de passe doit faire au moins ${MDP_MIN} caractères.` }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: v.email,
      password,
      email_confirm: true,
      user_metadata: { pseudo, name, last_name: lastName },
    });
    if (error) {
      const deja = /already|registered|exists/i.test(error.message);
      return Response.json(
        { error: deja ? "Un compte existe déjà avec cet email. Connecte-toi." : "Impossible de créer le compte. Réessaie." },
        { status: deja ? 409 : 500 },
      );
    }

    return Response.json({ success: true, email: v.email });
  } catch (e) {
    console.error("verify-otp error:", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
