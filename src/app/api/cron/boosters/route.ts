/**
 * /api/cron/boosters — prévient quand le booster revient.
 * Appelée toutes les 15 min par pg_cron (Supabase, en-tête `x-cron-key` = BOOSTER_CRON_KEY),
 * ou à la main avec `Bearer CRON_SECRET`. Le booster revient 3 h après l'ouverture
 * (`ouvrir_booster_exercices_v4`). Une seule notification par retour (`boosters_notifies`),
 * jamais la nuit (8 h–22 h, Paris), et seulement si l'interrupteur « rappels » est allumé.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { preferencesDeLot, PAR_DEFAUT } from "@/lib/notificationPrefs";
import { iconeGuide, pousserA } from "@/lib/pushServeur";

const TROIS_H = 3 * 3600_000;

function autorise(req: NextRequest) {
  const cle = process.env.BOOSTER_CRON_KEY;
  if (cle && req.headers.get("x-cron-key") === cle) return true;
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

function heureParis() {
  return Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));
}

async function traiter(req: NextRequest) {
  if (!autorise(req)) return NextResponse.json({ error: "non_autorisé" }, { status: 401 });
  const h = heureParis();
  if (h < 8 || h >= 22) return NextResponse.json({ ok: true, envoyes: 0, nuit: true });

  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("user_id");
  const ids = [...new Set((subs ?? []).map(s => s.user_id as string))];
  if (!ids.length) return NextResponse.json({ ok: true, envoyes: 0 });

  const [ouverts, notifies, prefs, profils] = await Promise.all([
    admin.from("boosters_illimites").select("user_id, ouvert_le").eq("cadence_3h", true).in("user_id", ids),
    admin.from("boosters_notifies").select("user_id, dernier_envoi").in("user_id", ids),
    preferencesDeLot(admin, ids),
    admin.from("profiles").select("id, guide_id").in("id", ids),
  ]);
  if (ouverts.error || notifies.error) {
    return NextResponse.json({ ok: false, error: (ouverts.error ?? notifies.error)?.message }, { status: 500 });
  }

  const dernier = new Map<string, number>();
  for (const o of ouverts.data ?? []) {
    const t = Date.parse(o.ouvert_le as string);
    if (t > (dernier.get(o.user_id as string) ?? 0)) dernier.set(o.user_id as string, t);
  }
  const envoi = new Map<string, number>();
  for (const n of notifies.data ?? []) envoi.set(n.user_id as string, Date.parse(n.dernier_envoi as string));
  const guides = new Map<string, string | null>();
  if (!profils.error) for (const p of profils.data ?? []) guides.set(p.id as string, (p as { guide_id?: string | null }).guide_id ?? null);

  const maintenant = Date.now();
  let envoyes = 0;
  for (const id of ids) {
    if (!(prefs.get(id) ?? PAR_DEFAUT).rappel) continue;
    const pret = (dernier.get(id) ?? 0) + TROIS_H; // jamais ouvert = prêt depuis toujours
    if (pret > maintenant) continue;
    const deja = envoi.get(id);
    if (deja !== undefined && deja >= pret) continue; // déjà prévenu pour ce retour
    try {
      const n = await pousserA(admin, id, {
        title: "Ton booster est prêt",
        body: "Un nouveau booster t’attend. Tu peux en garder jusqu’à trois.",
        url: "/",
        icon: iconeGuide(guides.get(id)),
      });
      if (n > 0) {
        envoyes += n;
        await admin.from("boosters_notifies").upsert({ user_id: id, dernier_envoi: new Date().toISOString() });
      }
    } catch { /* un compte en erreur ne bloque pas les autres */ }
  }
  return NextResponse.json({ ok: true, envoyes });
}

export const GET = traiter;
export const POST = traiter;
