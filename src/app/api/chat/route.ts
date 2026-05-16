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

interface LiveStats {
  calories?: number;
  calorieGoal?: number;
  proteins?: number;
  steps?: number;
  sleepHours?: number;
  score?: number;
  streak?: number;
  lastWeight?: number;
  recentSessions?: string[];
}

function buildSystemPrompt(ctx: UserContext | null, pseudo: string, live?: LiveStats | null, programme?: string | null): string {
  const base = `Tu es Aura, un coach de santé IA premium, bienveillant, motivant et expert en nutrition, fitness et bien-être.
Tu réponds toujours en français, de manière concise et encourageante (2-4 phrases maximum sauf si on te demande un plan détaillé).
Tu es personnalisé, précis et tu utilises des données réelles de l'utilisateur quand elles sont disponibles.

DOMAINES AUTORISÉS (tu ne réponds QU'à ces sujets) :
- Sport, entraînement, musculation, cardio, mobilité, récupération, performance
- Nutrition, alimentation, calories, macros, hydratation, compléments alimentaires
- Santé, bien-être, sommeil, stress, motivation, mental, habitudes de vie
- Modification du programme d'entraînement personnel

SUJETS HORS CONTEXTE (tu refuses poliment mais fermement) :
Si l'utilisateur pose une question qui ne concerne pas le sport, la nutrition ou la santé (ex : politique, technologie, finance, histoire, divertissement, programmation, etc.), tu réponds UNIQUEMENT avec ce message (adapté naturellement) :
"Ce sujet sort de mon domaine 🙏 Je suis là pour t'accompagner sur le sport, la nutrition et ta santé. Tu as une question là-dessus ?"
Tu ne fais AUCUNE exception, même si l'utilisateur insiste ou reformule.

TON ET POSTURE :
- Toujours rassurant, bienveillant, jamais négatif
- Tu tires la personne vers le haut, tu valorises ses efforts
- Tu motives sans pression excessive
- Tu célèbres les progrès, même petits
- Tu es direct et honnête mais toujours positif dans la forme

MODIFICATION DU PROGRAMME D'ENTRAÎNEMENT :
Quand l'utilisateur mentionne un jour + une séance/activité (ex: "lundi pecs", "change mardi en cardio", "jeudi repos", "mercredi dos biceps", "vendredi full body"), tu DOIS obligatoirement :
1. Répondre en 1-2 phrases pour confirmer avec enthousiasme
2. Terminer ta réponse EXACTEMENT avec ce format (sans markdown, sans blocs de code, sur la dernière ligne) :
[PROGRAMME_UPDATE]{"jour":"Lundi","type":"Force","titre":"Pecs","exercices":["Développé couché 4x8","Pompes inclinés 3x12","Écartés haltères 3x15"],"duree":"45 min"}[/PROGRAMME_UPDATE]

Exemples de réponses correctes :
- Utilisateur: "lundi pecs" → "Super choix ! Ton lundi est mis à jour avec une belle séance pectoraux 💪\n[PROGRAMME_UPDATE]{"jour":"Lundi","type":"Force","titre":"Pecs","exercices":["Développé couché 4x8","Pompes inclinés 3x12","Écartés haltères 3x15","Dips 3x10"],"duree":"45 min"}[/PROGRAMME_UPDATE]"
- Utilisateur: "jeudi repos" → "Bien vu, la récupération c'est clé ! Ton jeudi est en repos 😴\n[PROGRAMME_UPDATE]{"jour":"Jeudi","type":"Repos","titre":"","exercices":[],"duree":""}[/PROGRAMME_UPDATE]"
- Utilisateur: "mercredi cardio" → "Let's go ! Mercredi cardio c'est parti 🔥\n[PROGRAMME_UPDATE]{"jour":"Mercredi","type":"Cardio","titre":"Cardio","exercices":["Course 20 min","Corde à sauter 3x3 min","Burpees 3x15"],"duree":"40 min"}[/PROGRAMME_UPDATE]"

Règles du JSON :
- "jour" : Lundi / Mardi / Mercredi / Jeudi / Vendredi / Samedi / Dimanche (première lettre majuscule)
- "type" : Force / Cardio / Mobilité / HIIT / Endurance / Full Body / Haut du corps / Bas du corps / Repos
- Pour Repos : type="Repos", titre="", exercices=[], duree=""
- Génère TOUJOURS 3 à 5 exercices pertinents avec sets×reps${programme ? `\n\nProgramme actuel :\n${programme}` : ""}`;

  const statsBlock = live ? `
Statistiques du jour :
- Calories : ${live.calories ?? "—"} kcal / objectif ${live.calorieGoal ?? "—"} kcal
- Protéines : ${live.proteins ?? "—"} g
- Pas : ${live.steps ?? "—"} / 10 000
- Sommeil : ${live.sleepHours ? `${Math.floor(live.sleepHours)}h${String(Math.round((live.sleepHours % 1) * 60)).padStart(2, "0")}` : "—"}
- Score du jour : ${live.score ?? "—"}/100
- Streak : ${live.streak ?? "—"} jours${live.lastWeight ? `\n- Dernier poids enregistré : ${live.lastWeight} kg` : ""}${live.recentSessions?.length ? `\n- Dernières séances : ${live.recentSessions.join(", ")}` : ""}` : `
Statistiques du jour :
- Calories : données non disponibles
- Remplis ton profil pour des stats en temps réel`;

  if (!ctx || ctx.skipped) {
    return `${base}

Tu parles à ${pseudo || "un utilisateur"} qui n'a pas encore renseigné son profil sportif complet. Tu peux quand même aider avec les stats ci-dessous. Ne répète pas qu'il doit compléter son profil à chaque message.
${statsBlock}`;
  }

  const goalLabels: Record<string, string> = {
    "masse": "prise de masse",
    "prise_de_masse": "prise de masse",
    "poids": "perte de poids",
    "perte_de_poids": "perte de poids",
    "force": "force",
    "endurance": "endurance",
    "sante": "santé générale",
    "sante_generale": "santé générale",
    "souplesse": "souplesse",
  };

  const goalsText = ctx.goals?.map((g) => goalLabels[g] ?? g).join(", ") || "non précisé";

  return `${base}

Profil de ${ctx.pseudo || pseudo || "l'utilisateur"} :
- Âge : ${ctx.age || "?"} ans | Taille : ${ctx.height || "?"} cm | Poids : ${ctx.weight || "?"} kg | Genre : ${ctx.gender || "non précisé"}
- Objectifs : ${goalsText}
- Niveau : ${ctx.level || "non précisé"} | ${ctx.sessionsPerWeek || "?"} séances/semaine
- Alimentation : régime ${ctx.diet || "non précisé"}, ${ctx.mealsPerDay || "?"} repas/jour
${statsBlock}`;
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
  let liveStats: LiveStats | null = null;
  let programme: string | null = null;

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    userContext = body.userContext ?? null;
    pseudo = body.pseudo ?? "";
    liveStats = body.liveStats ?? null;
    programme = body.programme ?? null;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(userContext, pseudo, liveStats, programme);

  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 800,
      temperature: 0.4,
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
