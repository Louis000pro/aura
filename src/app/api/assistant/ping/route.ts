import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";

/* Diagnostic temporaire : appel Gemini minimal NON-streamé.
   Ouvre /api/assistant/ping dans le navigateur → renvoie l'erreur brute
   (status + message + en-têtes Google) pour comprendre le 429. À SUPPRIMER
   une fois le souci de clé/quota réglé. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasLLMKey()) {
    return Response.json({ ok: false, reason: "GEMINI_API_KEY absente de l'environnement" });
  }
  try {
    const r = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });
    return Response.json({ ok: true, model: CHAT_MODEL, reply: r.choices[0]?.message?.content ?? "" });
  } catch (err) {
    const e = err as {
      status?: number; message?: string; code?: unknown; type?: unknown;
      requestID?: string; error?: unknown; headers?: unknown;
    };
    // Extraction défensive des en-têtes (objet simple OU instance Headers)
    const headers: Record<string, string> = {};
    const h = e?.headers as { forEach?: (cb: (v: string, k: string) => void) => void } | Record<string, string> | undefined;
    if (h && typeof (h as { forEach?: unknown }).forEach === "function") {
      (h as { forEach: (cb: (v: string, k: string) => void) => void }).forEach((v, k) => { headers[k] = v; });
    } else if (h && typeof h === "object") {
      Object.assign(headers, h);
    }
    return Response.json({
      ok: false,
      status: e?.status ?? null,
      message: e?.message ?? null,
      code: e?.code ?? null,
      type: e?.type ?? null,
      requestID: e?.requestID ?? null,
      error: e?.error ?? null,
      headers,
    });
  }
}
