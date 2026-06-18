import { NextRequest } from "next/server";
import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";

/* ════════════════════════════════════════════════════════════════════
   /api/assistant/analyze — analyse unifiée (mémoire + action).

   UN seul appel 8b qui décide, pour le dernier message de l'utilisateur :
   - s'il y a un FAIT DURABLE à retenir / oublier (mémoire long terme)
   - s'il demande une ACTION (créer une séance) + ses paramètres

   Remplace les deux appels séparés (/memory-extract + /assistant/action)
   → moitié moins d'appels LLM par message (limite de débit du palier
   gratuit moins vite atteinte).
   ════════════════════════════════════════════════════════════════════ */

const SYSTEM = `Tu analyses le DERNIER message d'un utilisateur à son coach de fitness. Tu produis DEUX informations indépendantes en un seul objet JSON : "memory" et "action".

Réponds UNIQUEMENT par cet objet JSON (rien autour) :
{
  "memory": null | {"type":"save","category":"sante|nutrition|planning|objectif|preference","fact":"<fait court, 3e personne>"} | {"type":"forget","keywords":"<mots-clés>"},
  "action": null | {"intent":"create_seance","description":"<reformulation courte>","muscles":["<muscles en français>"],"category":"force|cardio|mobilite|fullbody","difficulty":"Débutant|Intermédiaire|Avancé"}
}

MÉMOIRE — quand remplir "memory" :
- "save" si l'utilisateur révèle un fait DURABLE et important : blessure / douleur / gêne physique (TOUJOURS category "sante", même dit en passant), régime / allergie / restriction alimentaire (nutrition), planning d'entraînement habituel (planning), objectif de fond (objectif), forte préférence (preference).
- "forget" si l'utilisateur demande explicitement d'oublier quelque chose.
- null pour le temporaire / banal / une simple question.

ACTION — quand remplir "action" :
- "create_seance" si l'utilisateur veut qu'on lui CRÉE / GÉNÈRE / AJOUTE / ENREGISTRE une séance d'entraînement (ex: "crée-moi une séance pecs", "fais-moi une séance jambes de 30 min", "ajoute une séance dos à mes séances").
- LE CONTEXTE COMPTE : si le coach vient de demander une précision pour préparer une séance (lieu, matériel, durée, niveau…) et que l'utilisateur répond (ex: "à la maison", "sans matériel", "30 min", "en salle"), c'est TOUJOURS "create_seance". Reprends alors les muscles / l'objectif mentionnés plus tôt dans le contexte.
- Une simple QUESTION sur l'entraînement ("c'est quoi une bonne séance pecs ?") = null.
- "muscles", "category", "difficulty" sont OPTIONNELS : déduis-les du message ET du contexte (ex: si "pecs" a été dit plus tôt, mets muscles:["pectoraux"]).

RÈGLES : n'invente jamais. Les deux champs sont indépendants (l'un peut être non-null et l'autre null). Si rien : {"memory":null,"action":null}.`;

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
