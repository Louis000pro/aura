import { NextRequest } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.COACH_AURA_KEY ?? "placeholder" });

type ChatMessage = { role: "user" | "assistant"; content: string };

interface UserContext {
  pseudo?: string;
  age?: string;
  height?: string;
  weight?: string;
  gender?: string;
  goals?: string[];
  level?: string;
  sessionsPerWeek?: string;
  mealsPerDay?: string;
  diet?: string;
  skipped?: boolean;
}

function buildSystemPrompt(ctx: UserContext | null, pseudo: string): string {
  const base = `Tu es Aura, un coach de santé IA premium, bienveillant, motivant et expert en nutrition, fitness et bien-être.
Tu réponds toujours en français, de manière concise et encourageante (2-4 phrases maximum sauf si on te demande un plan détaillé).
Tu es personnalisé, précis et tu utilises des données réelles de l'utilisateur quand elles sont disponibles.`;

  if (!ctx || ctx.skipped) {
    return `${base}

Tu parles à ${pseudo || "un utilisateur"} qui n'a pas encore renseigné son profil. Encourage-le à le compléter pour des conseils plus personnalisés.

Statistiques du jour (valeurs types) :
- Calories consommées : 1 847 kcal / objectif 2 200 kcal
- Dépense active : 612 kcal
- Pas : 8 234 / 10 000
- Fréquence cardiaque repos : 68 bpm
- Hydratation : 1,6 L / 2,5 L
- Sommeil : 7h24`;
  }

  const goalLabels: Record<string, string> = {
    "prise_de_masse": "prise de masse",
    "perte_de_poids": "perte de poids",
    "force": "force",
    "endurance": "endurance",
    "sante_generale": "santé générale",
    "souplesse": "souplesse",
  };

  const goalsText = ctx.goals?.map((g) => goalLabels[g] ?? g).join(", ") || "non précisé";

  return `${base}

Profil de ${ctx.pseudo || pseudo || "l'utilisateur"} :
- Âge : ${ctx.age || "?"}  ans | Taille : ${ctx.height || "?"}  cm | Poids : ${ctx.weight || "?"}  kg | Genre : ${ctx.gender || "non précisé"}
- Objectifs : ${goalsText}
- Niveau : ${ctx.level || "non précisé"} | ${ctx.sessionsPerWeek || "?"} séances/semaine
- Alimentation : régime ${ctx.diet || "non précisé"}, ${ctx.mealsPerDay || "?"} repas/jour

Statistiques du jour :
- Calories consommées : 1 847 kcal / objectif 2 200 kcal (84%)
- Dépense active : 612 kcal
- Pas : 8 234 / 10 000 (82%)
- Fréquence cardiaque repos : 68 bpm
- Hydratation : 1,6 L / 2,5 L (64%)
- Sommeil : 7h24
- Score du jour : 91/100 — récupération excellente`;
}

export async function POST(req: NextRequest) {
  if (!process.env.COACH_AURA_KEY) {
    return new Response(
      "⚠️ Clé API Groq manquante. Ajoute GROQ_API_KEY dans ton fichier .env.local (https://console.groq.com/keys)",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  let messages: ChatMessage[] = [];
  let userContext: UserContext | null = null;
  let pseudo = "";

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    userContext = body.userContext ?? null;
    pseudo = body.pseudo ?? "";
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(userContext, pseudo);

  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 800,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Groq chat error:", err);
    return new Response(
      "Désolé, une erreur est survenue. Réessaie dans quelques secondes ✨",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
