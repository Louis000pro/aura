import { NextRequest } from "next/server";
import Groq from "groq-sdk";

/* ════════════════════════════════════════════════════════════════════
   /api/assistant/action — détecteur d'INTENTION D'ACTION.

   Un petit modèle rapide (8b) qui regarde le dernier message de
   l'utilisateur et décide s'il demande une ACTION concrète (pour l'instant :
   créer une séance) et avec quels paramètres. Pas une question, pas une
   simple discussion : une vraie demande de création.

   Réponse JSON strict. La génération + la carte de confirmation sont
   gérées ensuite côté client (l'utilisateur valide avant toute écriture).
   ════════════════════════════════════════════════════════════════════ */

const groq = new Groq({ apiKey: process.env.COACH_AURA_KEY ?? "placeholder" });

const SYSTEM = `Tu es un DÉTECTEUR D'INTENTION pour un coach fitness. Tu lis le DERNIER message de l'utilisateur et tu déduis s'il demande de CRÉER / GÉNÉRER / AJOUTER / ENREGISTRER une séance d'entraînement dans ses séances.

Réponds UNIQUEMENT par un objet JSON, rien autour :
- demande de créer une séance -> {"intent":"create_seance","description":"<reformulation courte de la demande>","muscles":["<muscles en français, ex: Pectoraux, Dos, Épaules>"],"category":"force|cardio|mobilite|fullbody","difficulty":"Débutant|Intermédiaire|Avancé"}
- tout le reste (question, discussion, navigation, conseil) -> {"intent":"none"}

RÈGLES :
- N'active "create_seance" QUE si l'utilisateur veut vraiment qu'on lui CRÉE/GÉNÈRE une séance (ex: "crée-moi une séance pecs", "fais-moi une séance jambes de 30 min", "génère une séance cardio", "ajoute une séance dos").
- Une simple QUESTION ("c'est quoi une bonne séance pecs ?", "comment muscler les pecs ?") = {"intent":"none"}.
- "muscles", "category" et "difficulty" sont OPTIONNELS : ne les mets que s'ils sont déduits du message, sinon omets-les (ne les invente pas).
- category : "force" par défaut pour la muscu, "cardio" pour course/HIIT/endurance, "mobilite" pour souplesse/étirements, "fullbody" pour corps entier.
- N'invente jamais de paramètres non mentionnés.`;

export async function POST(req: NextRequest) {
  if (!process.env.COACH_AURA_KEY) return Response.json({ intent: "none" });

  let message = "";
  let context = "";
  try {
    const body = await req.json();
    message = String(body.message ?? "").slice(0, 1000);
    context = String(body.context ?? "").slice(0, 500);
  } catch {
    return Response.json({ intent: "none" });
  }
  if (!message.trim()) return Response.json({ intent: "none" });

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
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? '{"intent":"none"}';
    return new Response(raw, { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (err) {
    console.warn("[assistant/action] échec:", (err as { message?: string })?.message);
    return Response.json({ intent: "none" });
  }
}
