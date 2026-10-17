/**
 * GET /api/cron/inactifs · une fois par mois.
 *
 * La durée de conservation promise dans /confidentialite (décision de Louis,
 * 2026-10-17) : un compte qui ne vient plus depuis 3 ans est supprimé.
 *  · à 3 ans moins 30 jours sans venir, on prévient par e-mail ;
 *  · à 3 ans, si l'on a prévenu il y a au moins 30 jours et que la personne
 *    n'est pas revenue depuis, le compte est supprimé (`supprimerCompte`,
 *    abonnement Stripe compris).
 *
 * ⚠️ « Venir » ne se lit PAS dans `last_sign_in_at` seul : une PWA garde sa
 * session des mois sans jamais se reconnecter, et ce champ ne bouge pas.
 * On prend la date la plus récente entre la dernière connexion et la
 * dernière présence du jour (`daily_stats`, écrite à chaque visite par
 * `marquerPresence`). Supprimer quelqu'un qui vient tous les jours serait
 * la pire erreur possible de cette route.
 *
 * Sécurité : même serrure que le rappel du soir (Bearer CRON_SECRET),
 * fermée sans la variable.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { cleanEnv } from "@/lib/serverEnv";
import { supprimerCompte } from "@/lib/suppressionCompte";

const JOUR = 24 * 60 * 60 * 1000;
const DELAI_SUPPRESSION = 3 * 365 * JOUR;
const PREAVIS = 30 * JOUR;
/** Plafond de suppressions par passage : si quelque chose déraille (une
 *  lecture de présence vide, par exemple), on n'efface pas toute la base. */
const MAX_SUPPRESSIONS = 20;

async function prevenir(email: string): Promise<boolean> {
  const cle = cleanEnv(process.env.RESEND_API_KEY);
  if (!cle) return false;
  const from = cleanEnv(process.env.RESEND_FROM) || "Vaiiya <onboarding@resend.dev>";
  const texte =
    "Bonjour,\n\n" +
    "Tu ne t’es pas servi de Vaiiya depuis bientôt 3 ans. Pour ne pas garder tes données sans raison, " +
    "ton compte et tout ce qu’il contient seront supprimés dans 30 jours.\n\n" +
    "Pour le garder, il suffit d’ouvrir Vaiiya une fois : https://vaiiya.fr\n\n" +
    "L’équipe Vaiiya";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Ton compte Vaiiya sera supprimé dans 30 jours", text: texte }),
  });
  return res.ok;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non_autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const maintenant = Date.now();

  // Tous les comptes (pagination de l'API Auth).
  type Compte = { id: string; email?: string; created_at: string; last_sign_in_at?: string | null; user_metadata?: Record<string, unknown> };
  const comptes: Compte[] = [];
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    comptes.push(...(data.users as Compte[]));
    if (data.users.length < 1000) break;
  }

  // Dernière présence de chacun, en une requête.
  const { data: presences, error: errPresence } = await admin.rpc("derniere_presence_par_compte");
  // Sans cette lecture, on ne sait pas qui est actif : on ne supprime RIEN.
  if (errPresence) {
    return NextResponse.json({ error: "presence_illisible", detail: errPresence.message }, { status: 500 });
  }
  const derniere = new Map<string, number>();
  for (const p of (presences ?? []) as { user_id: string; jour: string }[]) {
    derniere.set(p.user_id, new Date(`${p.jour}T23:59:59Z`).getTime());
  }

  let prevenus = 0;
  let supprimes = 0;
  for (const c of comptes) {
    const venu = Math.max(
      new Date(c.created_at).getTime(),
      c.last_sign_in_at ? new Date(c.last_sign_in_at).getTime() : 0,
      derniere.get(c.id) ?? 0,
    );
    const absence = maintenant - venu;
    const prevenuLe = typeof c.user_metadata?.prevenu_inactivite_le === "string"
      ? new Date(c.user_metadata.prevenu_inactivite_le as string).getTime()
      : null;
    // Un préavis donné AVANT un retour ne compte plus.
    const preavisValable = prevenuLe !== null && prevenuLe > venu;

    if (absence >= DELAI_SUPPRESSION && preavisValable && maintenant - prevenuLe! >= PREAVIS) {
      if (supprimes >= MAX_SUPPRESSIONS) continue;
      const r = await supprimerCompte(admin, c.id);
      if (r.ok) supprimes++;
      else console.warn("[inactifs] suppression impossible :", c.id, r.raison);
    } else if (absence >= DELAI_SUPPRESSION - PREAVIS && !preavisValable && c.email) {
      if (await prevenir(c.email)) {
        await admin.auth.admin.updateUserById(c.id, {
          user_metadata: { ...(c.user_metadata ?? {}), prevenu_inactivite_le: new Date().toISOString() },
        });
        prevenus++;
      }
    }
  }

  return NextResponse.json({ ok: true, comptes: comptes.length, prevenus, supprimes });
}
