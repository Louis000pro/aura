import { NextRequest } from "next/server";
import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { ANALYZE_SYSTEM as SYSTEM } from "@/lib/analyzePrompt";

/* ════════════════════════════════════════════════════════════════════
   /api/assistant/analyze — analyse unifiée (mémoire + action).

   UN seul appel 8b qui décide, pour le dernier message de l'utilisateur :
   - s'il y a un FAIT DURABLE à retenir / oublier (mémoire long terme)
   - s'il demande une ACTION (créer une séance) + ses paramètres

   Remplace les deux appels séparés (/memory-extract + /assistant/action)
   → moitié moins d'appels LLM par message (limite de débit du palier
   gratuit moins vite atteinte).
   ════════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  if (!hasLLMKey()) return Response.json({ memory: null, action: null });

  let message = "";
  let context = "";
  try {
    const body = await req.json();
    message = String(body.message ?? "").slice(0, 1000);
    context = String(body.context ?? "").slice(0, 800);
  } catch {
    return Response.json({ memory: null, action: null });
  }
  if (!message.trim()) return Response.json({ memory: null, action: null });

  try {
    const completion = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: context
            ? `Contexte (derniers échanges) :\n${context}\n\nDernier message de l'utilisateur (à analyser) : ${message}`
            : `Message de l'utilisateur : ${message}`,
        },
      ],
      temperature: 0,
      max_tokens: 280,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? '{"memory":null,"action":null}';
    return new Response(raw, { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (err) {
    console.warn("[assistant/analyze] échec:", (err as { message?: string })?.message);
    return Response.json({ memory: null, action: null });
  }
}
