import { NextRequest } from "next/server";
import Groq from "groq-sdk";

/* ════════════════════════════════════════════════════════════════════
   /api/memory-extract — extracteur de mémoire dédié.

   Un petit modèle rapide (8b) dont l'UNIQUE tâche est de regarder le
   dernier message de l'utilisateur et décider s'il contient un fait
   DURABLE à retenir (ou un ordre d'oubli). Bien plus fiable que de
   demander au gros modèle de chat d'émettre un tag noyé dans un énorme
   system prompt. Réponse en JSON strict.
   ════════════════════════════════════════════════════════════════════ */

const groq = new Groq({ apiKey: process.env.COACH_AURA_KEY ?? "placeholder" });

const SYSTEM = `Tu es un EXTRACTEUR DE MÉMOIRE pour un coach de santé et fitness. Tu regardes le DERNIER message de l'utilisateur (et un éventuel contexte) et tu décides s'il faut RETENIR un fait durable sur lui, OUBLIER quelque chose, ou ne rien faire.

Catégories possibles :
- sante : blessure, douleur, gêne physique, contre-indication, condition médicale
- nutrition : régime, allergie, intolérance, restriction, aliment évité ou préféré durablement
- planning : jours / horaires / fréquence d'entraînement habituels
- objectif : objectif de fond (prise de masse, perte de poids, marathon…)
- preference : matériel, lieu d'entraînement, style de coaching préféré

Réponds UNIQUEMENT par un objet JSON, rien autour :
- fait à retenir   -> {"type":"save","category":"<categorie>","fact":"<fait court, 3e personne, ex: Douleur à l'épaule droite>"}
- demande d'oublier -> {"type":"forget","keywords":"<mots-clés du sujet à oublier>"}
- rien à faire      -> {"type":"none"}

RÈGLES :
- Une douleur, une gêne ou une blessure mentionnée = TOUJOURS {"type":"save","category":"sante",...}, même dite en passant ("j'ai mal à l'épaule").
- Un régime / une allergie / une restriction alimentaire durable = save (nutrition).
- NE retiens PAS le temporaire ni les banalités : humeur du jour, fatigue passagère, un repas ponctuel ("j'ai mangé une pomme"), une simple question.
- N'invente jamais. Le "fact" doit refléter ce que l'utilisateur a réellement dit.`;

export async function POST(req: NextRequest) {
  if (!process.env.COACH_AURA_KEY) return Response.json({ type: "none" });

  let message = "";
  let context = "";
  try {
    const body = await req.json();
    message = String(body.message ?? "").slice(0, 1000);
    context = String(body.context ?? "").slice(0, 500);
  } catch {
    return Response.json({ type: "none" });
  }
  if (!message.trim()) return Response.json({ type: "none" });

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
      max_tokens: 120,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? '{"type":"none"}';
    return new Response(raw, { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (err) {
    console.warn("[memory-extract] échec:", (err as { message?: string })?.message);
    return Response.json({ type: "none" });
  }
}
