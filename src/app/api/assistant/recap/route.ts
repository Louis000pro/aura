/**
 * POST /api/assistant/recap — le récap d'hier, fait par le Guide.
 *
 * Avantage Vaiiya+ : un compte gratuit reçoit 403 AVANT tout comptage.
 * Les faits sont lus ICI, en base, avec l'identité vérifiée par
 * `garderIA` : le client ne donne que ses bornes de temps (son fuseau),
 * sa série et son rang, qui ne changent que le ton, jamais les faits.
 * Voir `lib/recapJour.ts` pour les règles.
 */
import { NextResponse } from "next/server";
import { garderIA } from "@/lib/aiLimits";
import { createAdminClient } from "@/lib/supabase-admin";
import { llm, optionsIA, hasLLMKey } from "@/lib/llm";
import { ouvertureGuide, tonDuGuide, type GuideRef } from "@/lib/guides";
import {
  CONSIGNE_RECAP,
  faitsEnTexte,
  nettoyerRecap,
  recapDeRepli,
  type FaitsRecap,
} from "@/lib/recapJour";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  let corps: {
    jour?: string; debut?: string; fin?: string;
    serie?: number; rang?: string; guide?: string;
  };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "corps_invalide" }, { status: 400 });
  }

  const jour = typeof corps.jour === "string" && JOUR.test(corps.jour) ? corps.jour : null;
  const debut = corps.debut ? new Date(corps.debut) : null;
  const fin = corps.fin ? new Date(corps.fin) : null;
  if (!jour || !debut || !fin || isNaN(+debut) || isNaN(+fin)
      || +fin <= +debut || +fin - +debut > 26 * 3600_000) {
    return NextResponse.json({ error: "bornes_invalides" }, { status: 400 });
  }

  const garde = await garderIA(req, "recap");
  if (!garde.ok) return garde.reponse;
  if (!garde.acces.premium) {
    return NextResponse.json({ error: "vaiiya_plus" }, { status: 403 });
  }
  const userId = garde.acces.userId;

  const admin = createAdminClient();
  const [seancesRes, repasRes, expRes] = await Promise.all([
    admin.from("workout_sessions").select("title, duration_minutes")
      .eq("user_id", userId).gte("started_at", debut.toISOString()).lt("started_at", fin.toISOString())
      .order("started_at", { ascending: true }).limit(6),
    admin.from("nutrition_logs").select("calories").eq("user_id", userId).eq("date", jour).limit(40),
    admin.from("aura_mission_credits").select("points").eq("user_id", userId).eq("period_key", jour),
  ]);

  const faits: FaitsRecap = {
    seances: (seancesRes.data ?? []).map((s) => ({
      titre: String(s.title ?? "Séance").slice(0, 60),
      minutes: Math.max(1, Math.round(Number(s.duration_minutes) || 1)),
    })),
    repas: (repasRes.data ?? []).length,
    calories: Math.round((repasRes.data ?? []).reduce((t, r) => t + (Number(r.calories) || 0), 0)),
    exp: Math.round((expRes.data ?? []).reduce((t, r) => t + (Number(r.points) || 0), 0)),
    serie: Math.max(0, Math.min(3650, Math.round(Number(corps.serie) || 0))),
    rang: typeof corps.rang === "string" ? corps.rang.slice(0, 30) : "",
  };

  const guide: GuideRef = corps.guide === "nora" || corps.guide === "sasha" ? corps.guide : null;
  const repli = recapDeRepli(faits);

  if (!hasLLMKey()) return NextResponse.json({ texte: repli, source: "repli" });

  try {
    const r = await llm.chat.completions.create({
      ...optionsIA("coach", 180),
      temperature: 0.7,
      messages: [
        { role: "system", content: `${ouvertureGuide(guide)}\n\n${CONSIGNE_RECAP}${tonDuGuide(guide)}` },
        { role: "user", content: faitsEnTexte(faits) },
      ],
    });
    const texte = nettoyerRecap(r.choices[0]?.message?.content ?? "");
    if (texte.length < 12) return NextResponse.json({ texte: repli, source: "repli" });
    return NextResponse.json({ texte, source: "ia" });
  } catch (e) {
    console.warn("[recap] génération échouée, repli:", e instanceof Error ? e.message : e);
    return NextResponse.json({ texte: repli, source: "repli" });
  }
}
