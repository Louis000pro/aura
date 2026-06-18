import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { buildSiteKnowledgePrompt } from "@/lib/siteKnowledge";
import { buildMemoryPrompt, type AiMemory } from "@/lib/aiMemory";

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
  // Date du jour (YYYY-MM-DD, fuseau utilisateur) pour distinguer "aujourd'hui"
  todayDate?: string;
  // Repas RÉELS loggés/scannés par l'utilisateur (détail, pas agrégat)
  mealsDetail?: {
    date: string;
    mealType?: string;
    name: string;
    calories?: number;
    proteins?: number;
    time?: string;
    description?: string | null;
  }[];
}

// Libellé lisible d'un type de repas
function mealTypeLabel(t?: string): string {
  if (!t) return "Repas";
  const k = t.toLowerCase().replace(/[-_]/g, "");
  const map: Record<string, string> = {
    "petitdejeuner": "Petit-déjeuner", "petitdej": "Petit-déjeuner", "breakfast": "Petit-déjeuner",
    "dejeuner": "Déjeuner", "lunch": "Déjeuner", "midi": "Déjeuner",
    "diner": "Dîner", "dinner": "Dîner", "soir": "Dîner",
    "gouter": "Goûter", "snack": "Collation", "collation": "Collation",
  };
  return map[k] ?? t;
}

function buildSystemPrompt(
  ctx: UserContext | null,
  pseudo: string,
  live?: LiveStats | null,
  programme?: string | null,
  rich?: RichProfile | null,
  lieu?: string | null,
  equip?: string | null,
  currentPage?: string | null,
  memories?: AiMemory[] | null,
  memoryEnabled?: boolean
): string {
  // ── Repère temporel (fuseau France) ──
  let dateContext = "";
  try {
    const now = new Date();
    const jourSemaine = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }).format(now);
    const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(now);
    const jourCap = jourSemaine.charAt(0).toUpperCase() + jourSemaine.slice(1);
    dateContext = `\n\nREPÈRE TEMPOREL (très important) :\nNous sommes aujourd'hui ${dateLongue}. Le jour de la semaine EN COURS est "${jourCap}".\n- Quand l'utilisateur dit "aujourd'hui", "séance du jour", "ma séance", "ce soir", etc., tu te bases TOUJOURS sur ${jourCap}.\n- Si tu proposes la séance du jour depuis son programme, prends la ligne du jour "${jourCap}" — JAMAIS Lundi par défaut.\n- "Demain" = le jour suivant ${jourCap}, "hier" = le jour précédent.`;
  } catch { /* ignore */ }

  const base = `Tu es Vaiiya, un coach de santé IA premium, bienveillant, motivant et expert en nutrition, fitness et bien-être.
Tu réponds toujours en français, de manière concise et encourageante (2-4 phrases maximum sauf si on te demande un plan détaillé).
Tu es personnalisé, précis et tu utilises des données réelles de l'utilisateur quand elles sont disponibles.${dateContext}

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
- SUPER positif et enthousiaste en permanence — chaque réponse doit donner de l'énergie et le sourire 😊
- Toujours rassurant, bienveillant, jamais négatif ; tu tires la personne vers le haut et valorises chaque effort
- Tu es avant tout là pour AIDER concrètement : propose des solutions, des idées, des actions précises, jamais de réponse vague
- Tu motives sans pression excessive et tu célèbres les progrès, même les plus petits
- Tu es direct et honnête, mais toujours positif dans la forme

MÉMOIRE & CONTEXTE (très important) :
- Tu tiens compte de TOUT ce que l'utilisateur t'a dit dans la conversation ET de ses données de profil/stats. Ne redemande jamais une info déjà donnée, réutilise-la.
- Tu relies tes conseils à ses objectifs, son niveau, ses séances et sa nutrition réels quand ils sont disponibles.

DONNÉES RÉELLES DU COMPTE (repas & séances) :
- Tu as accès aux REPAS réellement loggés/scannés par l'utilisateur et à ses SÉANCES réalisées (plus bas dans ce message).
- Quand il demande ce qu'il a mangé ("qu'est-ce que j'ai mangé ce matin / aujourd'hui / hier", "mon petit-déj", "mes repas", "combien de calories aujourd'hui"), tu réponds À PARTIR de ces données réelles, en citant les aliments et leurs calories. "Ce matin" = le petit-déjeuner ; "ce midi" = le déjeuner ; "ce soir" = le dîner.
- Quand il demande ce qu'il a fait comme sport ("ma dernière séance", "qu'est-ce que j'ai fait à la salle"), tu réponds à partir de ses séances réalisées (titre, exercices, durée).
- Si aucune donnée n'est enregistrée pour la période demandée, dis-le simplement et propose-lui d'ajouter/scanner son repas. N'INVENTE JAMAIS un repas ou une séance qui n'est pas dans les données.

TOUJOURS FINIR PAR UNE QUESTION :
- Termine SYSTÉMATIQUEMENT chaque réponse par une question courte, bienveillante et engageante pour relancer l'échange (ex : "Tu veux que je t'aide à planifier ça ?", "Comment tu te sens là-dessus ?", "On regarde ensemble ta séance de demain ?").
- Une seule question, naturelle, jamais robotique.

REDIRECTION VERS LES PAGES (navigation) :
Quand l'utilisateur veut OUVRIR une rubrique ou ALLER quelque part dans l'app (ex: "fais-moi mes repas", "montre mes plats", "ouvre mon programme", "je veux passer au plan supérieur / m'abonner / premium", "montre ma progression", "va sur la communauté", "ouvre le suivi nutrition"), tu réponds en 1 phrase enthousiaste PUIS tu termines EXACTEMENT par ce tag sur la dernière ligne (sans markdown) :
[NAV]cible[/NAV]
Où "cible" est EXACTEMENT l'une de ces valeurs :
- repas        → ouvrir les repas/plats recommandés
- seances      → ouvrir les séances recommandées / le programme
- premium      → page d'abonnement (plan supérieur, premium, s'abonner)
- progression  → page de progression / statistiques
- nutrition    → suivi nutritionnel (journal, calendrier)
- communaute   → fil communauté
- decouverte   → page découverte
- parametres   → réglages / profil
Exemples :
- "fais-moi mes repas" → "C'est parti, voici tes repas du moment ! 🍽️\n[NAV]repas[/NAV]"
- "je veux passer au plan supérieur" → "Excellent choix, je t'emmène voir les offres Premium 🚀\n[NAV]premium[/NAV]"
- "montre ma progression" → "Allons voir tes progrès 💪\n[NAV]progression[/NAV]"
N'utilise [NAV] QUE si l'utilisateur veut clairement naviguer/ouvrir quelque chose. Sinon, réponds normalement.

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
- Génère TOUJOURS 3 à 5 exercices pertinents avec sets×reps

LIEU D'ENTRAÎNEMENT (TRÈS IMPORTANT) :
${lieu === "salle"
  ? `L'utilisateur s'entraîne EN SALLE DE SPORT type BASIC FIT. Base TES exercices UNIQUEMENT sur le matériel d'une salle Basic Fit : machines guidées (presse à cuisses, leg extension/curl, pec deck, tirage vertical/poitrine, rowing, développé épaules, abducteurs, mollets), machine Smith, poulies/câbles, haltères, barres, et cardio. JAMAIS d'exercice nécessitant du matériel absent d'une Basic Fit.`
  : lieu === "maison"
  ? (equip === "halteres"
      ? `L'utilisateur s'entraîne À LA MAISON AVEC DES HALTÈRES. Utilise EXCLUSIVEMENT des exercices au poids du corps ET avec haltères (banc/chaise éventuels). AUCUNE machine, AUCUNE poulie.`
      : equip === "poids"
      ? `L'utilisateur s'entraîne À LA MAISON SANS MATÉRIEL. Utilise EXCLUSIVEMENT le POIDS DU CORPS (aucun haltère, aucune machine, aucun élastique). Joue sur variations, tempo et répétitions.`
      : `L'utilisateur s'entraîne À LA MAISON mais tu ne sais pas s'il a du matériel. Avant de proposer des exercices, demande-lui : "Tu as des haltères à la maison, ou je te fais tout au poids du corps ? 💪" et attends sa réponse.`)
  : `Tu ne sais PAS encore où l'utilisateur s'entraîne. Dès qu'il te demande un programme, une séance ou une modification d'exercices, tu DOIS d'abord lui demander : "Tu t'entraînes en salle de sport (type Basic Fit) ou à la maison ? 💪" et attendre sa réponse avant de proposer des exercices. S'il répond la maison, demande ensuite s'il a des haltères.`}
Quand l'utilisateur t'indique son lieu d'entraînement (ex: "à la maison", "en salle", "chez moi", "à la gym"), termine ta réponse EXACTEMENT par ce tag sur la dernière ligne (sans markdown) :
[LIEU_UPDATE]maison[/LIEU_UPDATE]  (ou [LIEU_UPDATE]salle[/LIEU_UPDATE])

${buildSiteKnowledgePrompt(currentPage ?? undefined)}${memoryEnabled ? buildMemoryPrompt(memories) : ""}${memoryEnabled ? `\n\nACTIONS (création de séance) — RÈGLE ABSOLUE : Quand l'utilisateur demande de CRÉER / GÉNÉRER / ENREGISTRER / AJOUTER une séance, tu n'écris JAMAIS toi-même la liste des exercices, séries ou répétitions, et tu ne prétends PAS l'avoir créée. Réponds UNIQUEMENT par une phrase courte et enthousiaste (ex: « Voici une proposition de séance, regarde juste en dessous 👇 »). Une carte de confirmation contenant la séance s'affiche AUTOMATIQUEMENT sous ton message, et c'est l'utilisateur qui valide la création en cliquant. Tu n'as rien d'autre à faire.` : ""}${programme ? `\n\nProgramme actuel :\n${programme}` : ""}`;

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

    // ── Repas RÉELS loggés/scannés (le coach doit pouvoir dire ce que l'utilisateur a mangé) ──
    if (rich.mealsDetail && rich.mealsDetail.length > 0) {
      const today = rich.todayDate;
      const todays = today ? rich.mealsDetail.filter(m => m.date === today) : [];
      const previous = today ? rich.mealsDetail.filter(m => m.date !== today) : rich.mealsDetail;

      richBlock += `\n\nREPAS LOGGÉS PAR L'UTILISATEUR (données réelles, à utiliser pour répondre précisément à "qu'est-ce que j'ai mangé") :`;
      if (todays.length > 0) {
        richBlock += `\nAUJOURD'HUI :`;
        todays.forEach(m => {
          richBlock += `\n  • ${mealTypeLabel(m.mealType)}${m.time ? ` (${m.time})` : ""} : ${m.name}${m.calories ? ` — ${m.calories} kcal` : ""}${m.proteins ? `, ${m.proteins}g prot` : ""}`;
          if (m.description) richBlock += ` [${String(m.description).slice(0, 80)}]`;
        });
      } else {
        richBlock += `\nAUJOURD'HUI : aucun repas enregistré pour le moment.`;
      }
      if (previous.length > 0) {
        richBlock += `\nJOURS PRÉCÉDENTS :`;
        previous.slice(0, 12).forEach(m => {
          richBlock += `\n  • ${m.date.slice(5)} — ${mealTypeLabel(m.mealType)} : ${m.name}${m.calories ? ` (${m.calories} kcal)` : ""}`;
        });
      }
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
  let lieu: string | null = null;
  let lieuEquip: string | null = null;
  let currentPage: string | null = null;
  let memories: AiMemory[] | null = null;
  let memoryEnabled = false;
  let maxTokens = 600;

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    userContext = body.userContext ?? null;
    pseudo = body.pseudo ?? "";
    liveStats = body.liveStats ?? null;
    programme = body.programme ?? null;
    richProfile = body.richProfile ?? null;
    lieu = body.lieu ?? null;
    lieuEquip = body.lieu_equip ?? null;
    currentPage = body.currentPage ?? null;
    memories = body.memories ?? null;
    memoryEnabled = body.memoryEnabled === true;
    // Les tâches de génération (programme, plan repas) peuvent demander plus de tokens
    // pour éviter un JSON tronqué. Plafonné pour rester raisonnable.
    if (body.maxTokens) maxTokens = Math.min(Math.max(Number(body.maxTokens) || 800, 800), 4000);
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(userContext, pseudo, liveStats, programme, richProfile, lieu, lieuEquip, currentPage, memories, memoryEnabled);

  try {
    // Les grosses générations (programme, repas) → modèle léger (limites bien plus hautes)
    // La conversation → modèle premium 70b. Fallback auto vers le léger si saturé (429).
    const LIGHT_MODEL = "llama-3.1-8b-instant";
    const HEAVY_MODEL = "llama-3.3-70b-versatile";
    const primaryModel = maxTokens > 1500 ? LIGHT_MODEL : HEAVY_MODEL;

    const makeStream = (model: string) =>
      groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: maxTokens,
        temperature: 0.4,
      });

    let stream;
    try {
      stream = await makeStream(primaryModel);
    } catch (primErr) {
      // Saturation/erreur du modèle principal → on bascule sur le léger
      console.warn("[chat] primary model failed, fallback:", (primErr as { message?: string })?.message);
      stream = await makeStream(LIGHT_MODEL);
    }

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
    const e = err as { status?: number; message?: string; error?: { message?: string } };
    const detail = `[${e?.status ?? "?"}] ${(e?.error?.message ?? e?.message ?? "erreur inconnue").slice(0, 200)}`;
    console.error("Groq chat error:", detail);
    const msg =
      e?.status === 429
        ? "⏳ La limite gratuite de l'IA est atteinte pour l'instant. Réessaie dans une minute — et si ça persiste aujourd'hui, c'est le quota du jour (ça repart demain) 🙏"
        : e?.status === 401 || e?.status === 403
        ? "🔑 Souci de configuration de l'IA côté serveur (clé API à vérifier)."
        : `Désolé, une erreur est survenue 😕 — détail technique : ${detail}\n(copie-moi ce message stp, ça m'aide à corriger ✨)`;
    return new Response(msg, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
