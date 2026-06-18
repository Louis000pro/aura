import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { SYSTEM as ANALYZE_SYSTEM } from "@/app/api/assistant/analyze/route";

/* Diagnostic temporaire : exécute côté serveur, sous Mistral, l'ANALYSE
   (détection d'action) ET la GÉNÉRATION de séance, puis renvoie les bruts.
   Ouvre /api/assistant/ping dans le navigateur (authentifié) → on voit
   exactement où ça casse. À SUPPRIMER une fois validé. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Diag = Record<string, unknown>;

function errInfo(e: unknown) {
  const x = e as { status?: number; message?: string; error?: unknown };
  return { status: x?.status ?? null, message: x?.message ?? String(e), error: x?.error ?? null };
}

export async function GET() {
  if (!hasLLMKey()) return Response.json({ ok: false, reason: "MISTRAL_API_KEY absente" });
  const out: Diag = { model: CHAT_MODEL };

  // 1) ANALYSE — est-ce que Mistral détecte create_seance ?
  try {
    const a = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: ANALYZE_SYSTEM },
        { role: "user", content: "Dernier message de l'utilisateur (à analyser) : fais moi une seance pecs" },
      ],
      temperature: 0,
      max_tokens: 280,
      response_format: { type: "json_object" },
    });
    const raw = a.choices[0]?.message?.content ?? "";
    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); } catch { /* garde le raw */ }
    out.analyze = { raw, parsed };
  } catch (e) {
    out.analyze = { ERROR: errInfo(e) };
  }

  // 2) GÉNÉRATION — est-ce que Mistral renvoie une séance JSON valide ?
  try {
    const g = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: "Tu es un coach sportif expert. Reponds UNIQUEMENT avec un objet JSON valide, sans texte ni markdown." },
        { role: "user", content: `Genere une seance pecs a la maison sans materiel. Retourne UNIQUEMENT un JSON : {"title":"...","muscles":["..."],"exercises":[{"name":"...","sets":3,"reps":10,"rest":60,"restAfter":90}]}` },
      ],
      max_tokens: 1000,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });
    const raw = g.choices[0]?.message?.content ?? "";
    let parsed: { exercises?: unknown[] } | null = null;
    try { parsed = JSON.parse(raw); } catch { /* garde le raw */ }
    out.generate = {
      rawFirst200: raw.slice(0, 200),
      exercisesCount: Array.isArray(parsed?.exercises) ? parsed!.exercises.length : null,
    };
  } catch (e) {
    out.generate = { ERROR: errInfo(e) };
  }

  return Response.json(out);
}
