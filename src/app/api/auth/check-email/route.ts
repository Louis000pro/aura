import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autoriserRafale } from "@/lib/rateLimit";

const FORME_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Dit si une adresse correspond à un compte EXISTANT, pour l'étape 1 de la
 * connexion : on ne montre le mot de passe que si l'email est vraiment inscrite.
 *
 * L'existence se vérifie côté serveur avec la clé service, contre auth.users,
 * via generateLink(recovery) — exactement le contrôle déjà utilisé par
 * reset-password (l'appel rend une erreur / aucun lien quand le compte n'existe
 * pas). Aucun email n'est envoyé : on ne fait que générer le lien, sans s'en
 * servir. C'est la seule source de vérité (la table profiles n'a pas toujours
 * l'email renseigné), donc « inscrite » n'est jamais une fausse promesse.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email || !FORME_EMAIL.test(email)) {
      return Response.json({ inscrite: false, raison: "invalide" }, { status: 200 });
    }

    // Garde-fou anti-abus : on limite les vérifications par adresse. Le but est
    // d'éviter qu'un script énumère les comptes, pas d'arrêter une attaque
    // distribuée (compteur en mémoire, cf. rateLimit.ts).
    if (!autoriserRafale("check-email", email.toLowerCase(), 30)) {
      return Response.json({ error: "Trop de tentatives. Réessaie dans un moment." }, { status: 429 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    const inscrite = !error && !!data?.properties?.action_link;
    return Response.json({ inscrite }, { status: 200 });
  } catch (e) {
    console.error("check-email error:", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
