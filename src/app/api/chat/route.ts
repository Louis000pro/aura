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

interface RichProfile {
  bio?: string | null;
  fullName?: string | null;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  // Derniers posts (max 8)
  recentPosts?: {
    type: string;
    caption?: string | null;
    createdAt: string;
    performanceSummary?: string | null;
  }[];
  // Nutrition des 7 derniers jours
  nutritionWeek?: {
    date: string;
    calories: number;
    proteins: number;
    carbs?: number;
    fats?: number;
  }[];
  // Historique poids (max 10)
  weightHistory?: { date: string; weight: number }[];
  // Séances détaillées (max 10)
  workoutHistory?: {
    title: string;
    date: string;
    durationMinutes?: number;
    caloriesBurned?: number;
    exercises?: string[];
  }[];
  // Totaux du mois
  monthWorkouts?: number;
  monthCaloriesAvg?: number;
}

function buildSystemPrompt(
  ctx: UserContext | null,
  pseudo: string,
  live?: LiveStats | null,
  programme?: string | null,
  rich?: RichProfile | null
): string {
  const base = `Tu es Vaiiya, un coach de santé IA premium, bienveillant, motivant et expert en nutrition, fitness et bien-être.
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

  // ── Bloc stats du jour ──
  const statsBlock = live ? `
Statistiques du jour :
- Calories : ${live.calories ?? "—"} kcal${live.calorieGoal ? ` / objectif ${live.calorieGoal} kcal` : ""}
- Protéines : ${live.proteins ?? "—"} g
- Pas : ${live.steps ? `${live.steps} / 10 000` : "—"}
- Sommeil : ${live.sleepHours ? `${Math.floor(live.sleepHours)}h${String(Math.round((live.sleepHours % 1) * 60)).padStart(2, "0")}` : "—"}
- Score du jour : ${live.score ?? "—"}/100
- Streak : ${live.streak ?? "—"} jours${live.lastWeight ? `\n- Dernier poids enregistré : ${live.lastWeight} kg` : ""}${live.recentSessions?.length ? `\n- Dernières séances : ${live.recentSessions.join(", ")}` : ""}` : `
Statistiques du jour :
- Données non disponibles (profil à compléter)`;

  // ── Bloc profil enrichi ──
  let richBlock = "";
  if (rich) {
    if (rich.bio) richBlock += `\nBio : "${rich.bio}"`;
    if (rich.followersCount !== undefined) richBlock += `\nCommunauté : ${rich.followersCount} abonnés, ${rich.followingCount ?? 0} abonnements, ${rich.postsCount ?? 0} publications`;

    if (rich.weightHistory && rich.weightHistory.length > 1) {
      const oldest = rich.weightHistory[rich.weightHistory.length - 1];
      const newest = rich.weightHistory[0];
      const diff = Math.round((newest.weight - oldest.weight) * 10) / 10;
      const trend = diff > 0 ? `+${diff} kg` : `${diff} kg`;
      richBlock += `\nÉvolution du poids : ${oldest.weight} kg → ${newest.weight} kg (${trend} sur ${rich.weightHistory.length} mesures)`;
    }

    if (rich.nutritionWeek && rich.nutritionWeek.length > 0) {
      const avgCals = Math.round(rich.nutritionWeek.reduce((s, d) => s + d.calories, 0) / rich.nutritionWeek.length);
      const avgProt = Math.round(rich.nutritionWeek.reduce((s, d) => s + d.proteins, 0) / rich.nutritionWeek.length);
      richBlock += `\nMoyenne nutrition (7j) : ${avgCals} kcal/j, ${avgProt}g protéines/j`;
      const days = rich.nutritionWeek.slice(0, 5).map(d => `${d.date.slice(5)}: ${d.calories}kcal`).join(" | ");
      richBlock += `\nDétail : ${days}`;
    }

    if (rich.workoutHistory && rich.workoutHistory.length > 0) {
      richBlock += `\nSéances récentes (${rich.workoutHistory.length}) :`;
      rich.workoutHistory.slice(0, 5).forEach(s => {
        richBlock += `\n  • ${s.date.slice(5)} — ${s.title}${s.durationMinutes ? ` (${s.durationMinutes} min)` : ""}${s.caloriesBurned ? `, ${s.caloriesBurned} kcal` : ""}`;
        if (s.exercises?.length) richBlock += ` : ${s.exercises.slice(0, 3).join(", ")}`;
      });
    }

    if (rich.monthWorkouts !== undefined) richBlock += `\nSéances ce mois-ci : ${rich.monthWorkouts}`;

    if (rich.recentPosts && rich.recentPosts.length > 0) {
      const workoutPosts = rich.recentPosts.filter(p => p.type === "workout");
      const mealPosts = rich.recentPosts.filter(p => p.type === "meal");
      if (workoutPosts.length) richBlock += `\nPublications sport récentes (${workoutPosts.length}) : ${workoutPosts.slice(0, 3).map(p => `"${p.caption?.slice(0, 40) ?? p.performanceSummary ?? p.type}"`).join(", ")}`;
      if (mealPosts.length) richBlock += `\nPublications repas récentes (${mealPosts.length}) : ${mealPosts.slice(0, 3).map(p => `"${p.caption?.slice(0, 40) ?? p.type}"`).join(", ")}`;
    }
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

  if (!ctx || ctx.skipped) {
    return `${base}

Tu parles à ${pseudo || "un utilisateur"} qui n'a pas encore renseigné son profil sportif complet.
${statsBlock}${richBlock}`;
  }

  const goalsText = ctx.goals?.map((g) => goalLabels[g] ?? g).join(", ") || "non précisé";

  return `${base}

Profil de ${ctx.pseudo || pseudo || "l'utilisateur"} :
- Âge : ${ctx.age || "?"} ans | Taille : ${ctx.height || "?"} cm | Poids : ${ctx.weight || "?"} kg | Genre : ${ctx.gender || "non précisé"}
- Objectifs : ${goalsText}
- Niveau : ${ctx.level || "non précisé"} | ${ctx.sessionsPerWeek || "?"} séances/semaine
- Alimentation : régime ${ctx.diet || "non précisé"}, ${ctx.mealsPerDay || "?"} repas/jour
${statsBlock}${richBlock}`;
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
  let richProfile: RichProfile | null = null;

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    userContext = body.userContext ?? null;
    pseudo = body.pseudo ?? "";
    liveStats = body.liveStats ?? null;
    programme = body.programme ?? null;
    richProfile = body.richProfile ?? null;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(userContext, pseudo, liveStats, programme, richProfile);

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
