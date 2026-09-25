/**
 * /api/planning/modif — les modifications de planning faites par le COACH.
 *
 * Offre gratuite : `PLANS.free.limits.planningGuideSemaine` par semaine
 * (lundi → dimanche, heure de Paris). Vaiiya+ et admin : sans limite.
 * Ce que la personne fait elle-même (« Organiser », une séance posée à la
 * main) ne passe JAMAIS par ici : seules les cartes du Guide le consomment.
 *
 * GET  → lit sans consommer : { utilises, plafond } (null si illimité).
 * POST → consomme une modification, ou refuse en 429 quand c'est plein.
 *
 * Le compteur vit dans `ai_usage` (la table du garde-fou IA, RLS fermée au
 * client) sous une clé par semaine, mais PAS par `consommer_ia` : cette RPC
 * alimente aussi les statistiques d'appels IA de l'administration, et une
 * modification de planning n'est pas un appel au modèle.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { PLANS, SORTIE_PREMIUM } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** La semaine ISO du jour parisien, ex. « 2026-W39 ». */
function semaineParis(maintenant = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(maintenant);
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const jour = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - jour);
  const debutAnnee = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const semaine = Math.ceil(((+date - +debutAnnee) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(semaine).padStart(2, "0")}`;
}

async function compte(req: Request) {
  const admin = createAdminClient();
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: profil } = await admin
    .from("profiles").select("is_admin, is_premium").eq("id", data.user.id).maybeSingle();
  return { admin, userId: data.user.id, illimite: !!profil?.is_admin || !!profil?.is_premium };
}

const PLAFOND = PLANS.free.limits.planningGuideSemaine;

export async function GET(req: Request) {
  const c = await compte(req);
  if (!c) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  if (c.illimite) return NextResponse.json({ quota: null }, { headers: { "Cache-Control": "no-store" } });
  const { data } = await c.admin.from("ai_usage").select("compteur")
    .eq("user_id", c.userId).eq("cle", `planning:${semaineParis()}`).maybeSingle();
  return NextResponse.json(
    { quota: { utilises: Math.min(data?.compteur ?? 0, PLAFOND), plafond: PLAFOND } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const c = await compte(req);
  if (!c) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  if (c.illimite) return NextResponse.json({ ok: true, quota: null });

  const cle = `planning:${semaineParis()}`;
  const { data, error } = await c.admin.from("ai_usage").select("compteur")
    .eq("user_id", c.userId).eq("cle", cle).maybeSingle();
  if (error) {
    // Compteur illisible : on laisse passer plutôt que de bloquer un geste
    // légitime, et on le dit dans les logs.
    console.warn("[planning/modif] compteur indisponible:", error.message);
    return NextResponse.json({ ok: true, quota: null });
  }
  const utilises = data?.compteur ?? 0;
  if (utilises >= PLAFOND) {
    return NextResponse.json(
      {
        error: "plafond_planning",
        message: `Tu as utilisé tes ${PLAFOND} modifications de planning par le coach cette semaine. Elles reviennent lundi, et tu peux toujours organiser ta semaine toi-même. ${SORTIE_PREMIUM}`,
        quota: { utilises: PLAFOND, plafond: PLAFOND },
      },
      { status: 429 },
    );
  }
  const expire = new Date(Date.now() + 9 * 86_400_000).toISOString();
  const { error: ecriture } = await c.admin.from("ai_usage")
    .upsert({ user_id: c.userId, cle, compteur: utilises + 1, expire_at: expire }, { onConflict: "user_id,cle" });
  if (ecriture) console.warn("[planning/modif] écriture du compteur ratée:", ecriture.message);
  return NextResponse.json({ ok: true, quota: { utilises: utilises + 1, plafond: PLAFOND } });
}
