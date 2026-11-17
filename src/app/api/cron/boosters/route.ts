/**
 * /api/cron/boosters — une fois par jour, prévient ceux qui n'ont pas encore ouvert le booster du jour.
 * Le booster se renouvelle à minuit (heure de Paris) ; on prévient en fin de matinée, jamais la nuit.
 * Respecte l'interrupteur « rappels » des préférences de notification.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { parisDateStr } from "@/lib/dates";
import { preferencesDeLot, PAR_DEFAUT } from "@/lib/notificationPrefs";
import { iconeGuide, pousserA } from "@/lib/pushServeur";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non_autorisé" }, { status: 401 });
  }
  const admin = createAdminClient();
  const jour = parisDateStr(new Date());

  const { data: subs } = await admin.from("push_subscriptions").select("user_id");
  const ids = [...new Set((subs ?? []).map(s => s.user_id as string))];
  if (!ids.length) return NextResponse.json({ ok: true, envoyes: 0 });

  const [ouverts, prefs, profils] = await Promise.all([
    admin.from("boosters_exercices").select("user_id").eq("jour", jour).in("user_id", ids),
    preferencesDeLot(admin, ids),
    admin.from("profiles").select("id, guide_id").in("id", ids),
  ]);
  if (ouverts.error) return NextResponse.json({ ok: false, error: ouverts.error.message }, { status: 500 });
  const dejaOuvert = new Set((ouverts.data ?? []).map(o => o.user_id as string));
  const guides = new Map<string, string | null>();
  if (!profils.error) for (const p of profils.data ?? []) guides.set(p.id as string, (p as { guide_id?: string | null }).guide_id ?? null);

  let envoyes = 0;
  for (const id of ids) {
    if (dejaOuvert.has(id) || !(prefs.get(id) ?? PAR_DEFAUT).rappel) continue;
    try {
      envoyes += await pousserA(admin, id, {
        title: "Ton booster est prêt",
        body: "Trois nouvelles cartes t’attendent aujourd’hui. Viens l’ouvrir.",
        url: "/",
        icon: iconeGuide(guides.get(id)),
      });
    } catch { /* un compte en erreur ne bloque pas les autres */ }
  }
  return NextResponse.json({ ok: true, envoyes });
}
