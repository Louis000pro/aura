import { NextRequest } from "next/server";
import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { ANALYZE_SYSTEM as SYSTEM } from "@/lib/analyzePrompt";
import { garderIA } from "@/lib/aiLimits";

/* ════════════════════════════════════════════════════════════════════
   /api/assistant/analyze — extraction de la MÉMOIRE long terme.

   Décide, pour le dernier message de l'utilisateur, s'il y a un fait
   DURABLE à retenir ou à oublier (blessure, régime, objectif de fond…).

   ⚠️ Cet endpoint ne décide PLUS d'actions : elles sont devenues des outils
   appelés par le coach dans /api/chat, donc dans le même tour que sa
   réponse (`lib/assistantTools.ts`). C'est ce qui a supprimé les
   désynchronisations entre ce que le coach dit et ce que l'app fait.
   ════════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  // Cet appel part en parallèle de chaque message au coach : il a son propre
  // compteur (mêmes plafonds que `chat`) pour ne pas consommer deux fois le
  // quota de l'utilisateur sur un seul message.
  const garde = await garderIA(req, "memoire");
  if (!garde.ok) {
    // La mémoire est silencieuse : si elle est bloquée, on ne dérange pas
    // l'utilisateur avec une erreur, on n'apprend simplement rien ce tour-ci.
    return Response.json({ memory: null });
  }

  if (!hasLLMKey()) return Response.json({ memory: null });

  let message = "";
  let context = "";
  try {
    const body = await req.json();
    message = String(body.message ?? "").slice(0, 1000);
    context = String(body.context ?? "").slice(0, 800);
  } catch {
    return Response.json({ memory: null });
  }
  if (!message.trim()) return Response.json({ memory: null });

  const messages = [
    { role: "system" as const, content: SYSTEM },
    {
      role: "user" as const,
      content: context
        ? `Contexte (derniers échanges) :\n${context}\n\nDernier message de l’utilisateur (à analyser) : ${message}`
        : `Message de l’utilisateur : ${message}`,
    },
  ];
  const ask = () => llm.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0,
    max_tokens: 280,
    response_format: { type: "json_object" },
  });

  // Mistral palier gratuit = 1 req/s : cet appel suit de près celui du chat
  // et peut se prendre un 429. On retente UNE fois après la fenêtre de débit
  // plutôt que de perdre le fait à retenir.
  try {
    let completion;
    try {
      completion = await ask();
    } catch {
      await new Promise((r) => setTimeout(r, 1300));
      completion = await ask();
    }
    const raw = completion.choices[0]?.message?.content ?? '{"memory":null}';
    return new Response(raw, { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (err) {
    console.warn("[assistant/analyze] échec après retry:", (err as { message?: string })?.message);
    return Response.json({ memory: null });
  }
}
