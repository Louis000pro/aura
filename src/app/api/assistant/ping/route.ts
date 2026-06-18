import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";

/* Diagnostic temporaire : appel LLM minimal NON-streamé via le client de
   l'app. Ouvre /api/assistant/ping dans le navigateur → confirme que la clé
   + l'URL + le modèle marchent de bout en bout, ou renvoie l'erreur exacte.
   À SUPPRIMER une fois la bascule validée. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasLLMKey()) {
    return Response.json({ ok: false, reason: "MISTRAL_API_KEY absente de l'environnement" });
  }
  try {
    const r = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: "Réponds juste : pong" }],
      max_tokens: 10,
    });
    return Response.json({ ok: true, model: CHAT_MODEL, reply: r.choices[0]?.message?.content ?? "" });
  } catch (err) {
    const e = err as { status?: number; message?: string; error?: unknown };
    return Response.json({
      ok: false,
      status: e?.status ?? null,
      message: e?.message ?? null,
      error: e?.error ?? null,
    });
  }
}
