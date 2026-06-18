import { NextRequest } from "next/server";
import Groq from "groq-sdk";

/* ════════════════════════════════════════════════════════════════════
   /api/assistant/analyze — analyse unifiée (mémoire + action).

   UN seul appel 8b qui décide, pour le dernier message de l'utilisateur :
   - s'il y a un FAIT DURABLE à retenir / oublier (mémoire long terme)
   - s'il demande une ACTION (créer une séance) + ses paramètres

   Remplace les deux appels séparés (/memory-extract + /assistant/action)
   → moitié moins d'appels Groq par message (limite de débit du palier
   gratuit moins vite atteinte).
   ════════════════════════════════════════════════════════════════════ */

const groq = new Groq({ apiKey: process.env.COACH_AURA_KEY ?? "placeholder" });

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
- "create_seance" UNIQUEMENT si l'utilisateur veut qu'on lui CRÉE / GÉNÈRE / AJOUTE / ENREGISTRE une séance d'entraînement (ex: "crée-moi une séance pecs", "fais-moi une séance jambes de 30 min", "ajoute une séance dos à mes séances").
- Une simple QUESTION sur l'entraînement ("c'est quoi une bonne séance pecs ?") = null.
- "muscles", "category", "difficulty" sont OPTIONNELS : ne les mets que s'ils sont déduits du message.

RÈGLES : n'invente jamais. Les deux champs sont indépendants (l'un peut être non-null et l'autre null). Si rien : {"memory":null,"action":null}.`;

export async function POST(req: NextRequest) {
  if (!process.env.COACH_AURA_KEY) return Response.json({ memory: null, action: null });

  let message = "";
  let context = "";
  try {
    const body = await req.json();
    message = String(body.message ?? "").slice(0, 1000);
    context = String(body.context ?? "").slice(0, 500);
  } catch {
    return Response.json({ memory: null, action: null });
  }
  if (!message.trim()) return Response.json({ memory: null, action: null });

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: context
            ? `Contexte (dernier message du coach) : ${context}\n\nMessage de l'utilisateur : ${message}`
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
