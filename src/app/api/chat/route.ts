import { NextRequest } from "next/server";
import type OpenAI from "openai";
import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { buildSiteKnowledgePrompt } from "@/lib/siteKnowledge";
import { buildMemoryPrompt, type AiMemory } from "@/lib/aiMemory";
import { type ChatEvent } from "@/lib/assistantTools";
import { deciderAction, cadreAction } from "@/lib/assistantRouter";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type ChatMessage = { role: "user" | "assistant"; content: string | ContentPart[] };

/** Un contenu (string ou parties) est-il vide ? */
function contentEmpty(content: string | ContentPart[]): boolean {
  if (typeof content === "string") return !content.trim();
  return content.length === 0;
}

/**
 * Nettoie l'historique pour Mistral (plus strict que Groq) : la conversation
 * doit commencer par un message `user`, alterner user/assistant, et n'avoir
 * aucun contenu vide. On ignore les messages vides, on retire les messages
 * `assistant` en tête, et on fusionne deux messages TEXTE consécutifs de même
 * rôle. Un contenu multimodal (avec image) n'est jamais fusionné : on le garde tel quel.
 */
function sanitizeHistory(msgs: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of msgs) {
    if (!m || contentEmpty(m.content)) continue;
    if (out.length === 0 && m.role !== "user") continue; // démarre sur un user
    const last = out[out.length - 1];
    // Fusion uniquement si les DEUX contenus sont du texte simple.
    if (last && last.role === m.role && typeof last.content === "string" && typeof m.content === "string") {
      last.content += `\n${m.content.trim()}`;
    } else {
      out.push({ role: m.role, content: typeof m.content === "string" ? m.content.trim() : m.content });
    }
  }
  return out;
}

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
  proteinGoal?: number;
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
- Santé et bien-être au sens LARGE : sommeil, stress, motivation, mental, habitudes de vie, mais AUSSI blessures, douleurs, maladies, pathologies et conditions chroniques (ex : maladie de Crohn, diabète, hypertension, troubles digestifs, allergies). Tout ce qui touche au corps et à la santé de l'utilisateur EST dans ton domaine.
- Modification du programme d'entraînement personnel

QUAND L'UTILISATEUR PARLE DE SA SANTÉ (douleur, blessure, maladie, symptôme, condition) :
Tu ne refuses JAMAIS et tu ne dis JAMAIS que ça sort de ton domaine. Tu accueilles avec empathie et bienveillance, puis tu adaptes tes conseils sport/nutrition à sa situation. Tu ne poses PAS de diagnostic et tu ne prescris aucun traitement : pour la prise en charge médicale, oriente avec douceur vers son médecin ou spécialiste, sans jamais te défausser ni le rembarrer.

PRINCIPE DE TOLÉRANCE (très important) : par DÉFAUT tu cherches à aider. Tu ne bloques QUE deux cas : (1) un message réellement abusif, insultant ou inapproprié ; (2) un sujet qui n'a VRAIMENT aucun lien avec le sport, la nutrition, le corps, la santé ou le bien-être de la personne. Tout le reste — un sujet tangent, une question formulée maladroitement, une confidence personnelle, une digression légère qui se rattache à son bien-être — tu y réponds avec bienveillance. Dans le moindre doute, tu RÉPONDS plutôt que de bloquer. Un blocage injustifié est bien plus grave qu'une petite digression tolérée.

SUJETS VRAIMENT HORS CONTEXTE (le cas 2 ci-dessus, sans aucun lien avec la personne — ex : politique, actualité, programmation, finance, histoire, divertissement) :
Tu réponds UNIQUEMENT avec ce message (adapté naturellement) :
"Ce sujet sort de mon domaine 🙏 Je suis là pour t'accompagner sur le sport, la nutrition et ta santé. Tu as une question là-dessus ?"

TON : positif, chaleureux, motivant, concret (propose des actions précises, jamais de réponse vague), célèbre les progrès. Termine TOUJOURS par UNE seule question courte et naturelle.

MISE EN FORME (important, lisibilité humaine) : écris en texte simple et naturel, comme un message. N'utilise AUCUN markdown : jamais d'astérisques (* ou **), de dièses (#), d'accents circonflexes (^), de tildes (~) ni de backticks (\`). Pour une liste, va à la ligne et commence par un tiret « - ». Pour insister sur un mot, choisis-le bien, ne le décore pas de symboles. Des phrases claires valent mieux qu'une mise en page chargée.

IMAGES : l'utilisateur peut t'envoyer une photo (un plat, une étiquette nutritionnelle, une machine de salle, une posture d'exercice, une blessure visible…). Regarde-la attentivement et réponds à partir de ce que tu vois, dans ton domaine (sport, nutrition, santé). Si l'image est floue ou hors sujet, dis-le gentiment et demande une précision.

DONNÉES : tiens compte de la conversation ET du profil/stats/repas/séances ci-dessous ; ne redemande jamais une info déjà donnée. Pour "qu'est-ce que j'ai mangé / ma dernière séance", réponds à partir des données réelles (matin = petit-déj, midi = déjeuner, soir = dîner). N'INVENTE JAMAIS un repas ou une séance absent des données ; si rien n'est enregistré, dis-le et propose d'ajouter.

TU AGIS, TU NE FAIS PAS QUE PARLER :
L'app sait faire des choses pour l'utilisateur : créer une séance, modifier son planning, noter un repas, écrire une recette, changer le thème, l'emmener sur une page, retenir son lieu d'entraînement. Tu n'as RIEN à déclencher toi-même : dès qu'il demande une de ces choses, une petite CARTE apparaît toute seule sous ta réponse, et c'est lui qui la valide d'un clic. Règles ABSOLUES :
1. Ne dis JAMAIS que c'est "déjà fait" ou "enregistré" : rien n'est écrit tant qu'il n'a pas validé. Dis que tu prépares ça et qu'il valide juste en dessous.
2. N'écris JAMAIS toi-même le contenu que la carte va afficher : ni la liste des exercices, ni les séries/répétitions, ni les calories ou les macros. La carte s'en charge, et l'écrire deux fois donnerait deux versions différentes.
3. Reste COURT sur ces tours : une ou deux phrases, chaleureuses et personnelles, jamais deux fois les mêmes mots. Le reste est sous tes yeux, en dessous.
4. Une simple QUESTION ("c'est quoi une bonne séance pecs ?", "combien de calories dans une banane ?", "je m'entraîne quel jour ?") ne prépare aucune carte : tu réponds pour de vrai, avec du contenu, sans annoncer quoi que ce soit à valider.
5. Tu PEUX placer une séance existante de sa bibliothèque sur un jour, ne dis jamais que tu n'y as pas accès ; si elle est introuvable, il sera prévenu.
⚠️ LE LIEU D'ENTRAÎNEMENT, tu n'as PAS à t'en occuper : si tu ne le connais pas encore (voir la section LIEU ci-dessous), n'en parle simplement pas. L'app sait ce qui lui manque, elle posera elle-même la question avec des réponses à toucher, puis reprendra la demande toute seule. Ne demande donc jamais le lieu en texte, et ne suppose aucun lieu dans ta phrase.
⚠️ Quand il te manque une précision pour répondre, pose UNE seule question courte, sur un choix fermé, et jamais une information que tu as déjà sous les yeux (profil, stats, conversation, lieu ci-dessous) : une question inutile est plus agaçante qu'une supposition raisonnable.

NUTRITION ↔ SÉANCES (la nutrition est un BONUS, JAMAIS une obligation) :
- Tu proposes et adaptes les séances normalement, que l'utilisateur note ou non ses repas. Une séance ne dépend JAMAIS du fait d'avoir enregistré sa nutrition.
- SI tu disposes de données nutrition récentes (repas/calories du jour ci-dessous), tu PEUX t'en servir comme un petit plus pour affiner la séance ou glisser une remarque utile (ex : "léger côté repas aujourd'hui, on part sur une séance plus courte"). Ça reste optionnel, léger, jamais le sujet principal.
- S'il n'y a AUCUNE donnée nutrition (l'utilisateur ne note pas), tu n'en parles pas, tu ne réclames rien, tu ne culpabilises jamais, et tu ne dis JAMAIS que tu "ne peux pas" adapter : tu proposes la séance comme d'habitude, point. Ne réclame pas de logger ses repas pour avoir une séance.
- Ne transforme jamais le suivi nutrition en passage obligé : c'est un confort pour ceux qui le veulent, pas une exigence pour s'entraîner.

LIEU D'ENTRAÎNEMENT (TRÈS IMPORTANT) :
${lieu === "salle"
  ? `Lieu : SALLE type Basic Fit → exercices basés UNIQUEMENT sur machines guidées, Smith, poulies/câbles, haltères, barres, cardio. Rien qui nécessite du matériel absent d'une Basic Fit.`
  : lieu === "maison"
  ? (equip === "halteres"
      ? `Lieu : MAISON avec haltères → uniquement poids du corps + haltères (banc/chaise ok). Aucune machine ni poulie.`
      : equip === "poids"
      ? `Lieu : MAISON sans matériel → uniquement poids du corps (ni haltère, ni machine, ni élastique) ; joue sur variations/tempo/reps.`
      : `Lieu : MAISON, matériel inconnu → appelle l'outil de séance normalement et reste NEUTRE sur le matériel dans ta phrase : l'app demandera elle-même s'il a des haltères avant de générer quoi que ce soit.`)
  : `Lieu d'entraînement inconnu → appelle l'outil de séance normalement et reste NEUTRE sur le lieu dans ta phrase (ne dis ni "en salle" ni "à la maison") : l'app posera elle-même la question avec des réponses à toucher, puis reprendra la demande. Tu ne DÉDUIS JAMAIS le lieu et tu n'en SUPPOSES aucun.`}
Quand l'utilisateur t'indique son lieu d'entraînement (ex: "à la maison", "en salle", "chez moi", "à la gym", "j'ai des haltères"), appelle l'outil save_lieu en même temps que ta réponse : il évite de reposer la question au tour suivant.

${buildSiteKnowledgePrompt(currentPage ?? undefined)}${memoryEnabled ? buildMemoryPrompt(memories) : ""}${programme ? `\n\nProgramme actuel :\n${programme}` : ""}`;

  // ── Bloc stats du jour ──
  const statsBlock = live ? `
Statistiques du jour :
- Calories : ${live.calories ?? "—"} kcal${live.calorieGoal ? ` / objectif ${live.calorieGoal} kcal (reste ${Math.max(live.calorieGoal - (live.calories ?? 0), 0)} kcal)` : ""}
- Protéines : ${live.proteins ?? "—"} g${live.proteinGoal ? ` / objectif ${live.proteinGoal} g` : ""}
- Pas : ${live.steps ? `${live.steps} / 10 000` : "—"}
- Sommeil : ${live.sleepHours ? `${Math.floor(live.sleepHours)}h${String(Math.round((live.sleepHours % 1) * 60)).padStart(2, "0")}` : "—"}
- Score du jour : ${live.score ?? "—"}/100
- Streak : ${live.streak ?? "—"} jours${live.lastWeight ? `\n- Dernier poids enregistré : ${live.lastWeight} kg` : ""}${live.recentSessions?.length ? `\n- Dernières séances : ${live.recentSessions.join(", ")}` : ""}` : `
Statistiques du jour :
- Données non disponibles (profil à compléter)`;

  // ── Bloc profil enrichi ──
  let richBlock = "";
  if (rich) {
    if (rich.weightHistory && rich.weightHistory.length > 1) {
      const oldest = rich.weightHistory[rich.weightHistory.length - 1];
      const newest = rich.weightHistory[0];
      const diff = Math.round((newest.weight - oldest.weight) * 10) / 10;
      richBlock += `\nPoids : ${oldest.weight} → ${newest.weight} kg (${diff > 0 ? `+${diff}` : diff} kg)`;
    }

    if (rich.nutritionWeek && rich.nutritionWeek.length > 0) {
      const avgCals = Math.round(rich.nutritionWeek.reduce((s, d) => s + d.calories, 0) / rich.nutritionWeek.length);
      const avgProt = Math.round(rich.nutritionWeek.reduce((s, d) => s + d.proteins, 0) / rich.nutritionWeek.length);
      richBlock += `\nNutrition moy. (7j) : ${avgCals} kcal/j, ${avgProt}g prot/j`;
    }

    if (rich.workoutHistory && rich.workoutHistory.length > 0) {
      richBlock += `\nDernières séances : ${rich.workoutHistory.slice(0, 3).map(s => `${s.date.slice(5)} ${s.title}`).join(", ")}`;
    }
    if (rich.monthWorkouts !== undefined) richBlock += `\nSéances ce mois : ${rich.monthWorkouts}`;

    // Repas du jour uniquement (pour répondre à "qu'est-ce que j'ai mangé")
    if (rich.mealsDetail && rich.mealsDetail.length > 0) {
      const today = rich.todayDate;
      const todays = today ? rich.mealsDetail.filter(m => m.date === today) : [];
      if (todays.length > 0) {
        richBlock += `\nRepas du jour : ${todays.map(m => `${mealTypeLabel(m.mealType)} ${m.name}${m.calories ? ` (${m.calories}kcal)` : ""}`).join(" ; ")}`;
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

/* ── Deux formats de réponse, selon l'appelant ──
   L'assistant global (memoryEnabled) reçoit du NDJSON : une ligne = un
   événement, `t` pour un morceau de texte, `a` pour l'action décidée.
   Les appelants historiques (page coach, chat de l'accueil) ne savent lire
   que du texte brut : ils gardent exactement l'ancien format, et aucune
   action ne leur est envoyée. */
const ligne = (e: ChatEvent) => JSON.stringify(e) + "\n";

function fluxTexte(texte: string, ndjson: boolean) {
  return new Response(ndjson ? ligne({ t: texte }) : texte, {
    status: 200,
    headers: {
      "Content-Type": ndjson ? "application/x-ndjson; charset=utf-8" : "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: NextRequest) {
  // Garde-fou : connexion obligatoire + plafond d'usage. Cette route était
  // ouverte à tout internet, donc n'importe qui pouvait faire tourner la
  // facture Mistral sans même avoir de compte Vaiiya.
  const garde = await garderIA(req, "chat");
  if (!garde.ok) return garde.reponse;

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

  // ── Plafonds de taille ──
  // Le compteur d'appels ne suffit pas : un seul message de 200 000 caractères
  // coûte autant que cent messages normaux. On coupe le texte (l'utilisateur
  // garde sa réponse) et on refuse une image trop lourde (on ne peut pas la
  // couper). Le client compresse déjà ses images à 1024 px.
  for (const m of messages) {
    if (typeof m.content === "string") {
      if (m.content.length > PLAFONDS.messageChars) m.content = m.content.slice(0, PLAFONDS.messageChars);
    } else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === "text" && part.text.length > PLAFONDS.messageChars) {
          part.text = part.text.slice(0, PLAFONDS.messageChars);
        }
        if (part.type === "image_url" && part.image_url.url.length > PLAFONDS.imageOctets) {
          return refusTaille("Cette image");
        }
      }
    }
  }
  // On ne renvoie au modèle que la fin de la conversation : au-delà, le
  // contexte coûte cher sans rien apporter à la réponse.
  if (messages.length > PLAFONDS.historique) messages = messages.slice(-PLAFONDS.historique);

  // Seul l'assistant global sait exécuter une action et lire le NDJSON.
  const ndjson = memoryEnabled;

  if (!hasLLMKey()) {
    return fluxTexte(
      "⚠️ Clé API Mistral manquante. Ajoute MISTRAL_API_KEY dans ton .env.local et sur Vercel (https://console.mistral.ai/api-keys)",
      ndjson
    );
  }

  const historique = sanitizeHistory(messages);

  /* L'aiguilleur passe AVANT le coach (~550 ms) : sa décision devient le
     contexte de la réponse. C'est ce qui rend le désaccord impossible — le
     coach ne devine plus ce qui va s'afficher sous lui, on le lui dit. Voir
     `assistantRouter` pour la mesure qui a imposé cette séparation. */
  const action = ndjson ? await deciderAction(historique) : null;

  const systemPrompt =
    buildSystemPrompt(userContext, pseudo, liveStats, programme, richProfile, lieu, lieuEquip, currentPage, memories, memoryEnabled) +
    (ndjson ? cadreAction(action) : "");

  try {
    const stream = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...historique,
      ] as OpenAI.Chat.ChatCompletionMessageParam[],
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.4,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let texteRecu = false;
        let finish: string | null = null;

        try {
          for await (const chunk of stream) {
            const choice = chunk.choices?.[0] as {
              delta?: { content?: string | null };
              message?: { content?: string | null };
              finish_reason?: string | null;
            } | undefined;
            if (choice?.finish_reason) finish = choice.finish_reason;

            // Le texte : `delta` en streaming, `message` si le fournisseur a
            // répondu d'un bloc. Jamais les deux (sinon on doublerait).
            const texte = choice?.delta
              ? (choice.delta.content ?? "")
              : (typeof choice?.message?.content === "string" ? choice.message.content : "");
            if (texte) {
              texteRecu = true;
              controller.enqueue(encoder.encode(ndjson ? ligne({ t: texte }) : texte));
            }
          }

          // L'action est déjà décidée : elle ferme le flux. Le client ne
          // l'exécute qu'une fois la lecture terminée, l'ordre n'a donc
          // aucune importance.
          if (action) controller.enqueue(encoder.encode(ligne({ a: action })));

          // Un tour totalement vide ne doit JAMAIS passer inaperçu : sans ça,
          // l'utilisateur envoie un message et il ne se passe rien du tout.
          if (ndjson && !texteRecu && !action) {
            console.error("[chat] tour vide", { finish });
            controller.enqueue(encoder.encode(ligne({
              e: `le modèle n'a rien renvoyé (fin: ${finish ?? "?"})\n(copie-moi ce message stp, ça m'aide à corriger ✨)`,
            })));
          }
        } catch (err) {
          const m = (err as { message?: string })?.message ?? "flux interrompu";
          if (ndjson) controller.enqueue(encoder.encode(ligne({ e: m.slice(0, 200) })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": ndjson ? "application/x-ndjson; charset=utf-8" : "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const e = err as { status?: number; message?: string; error?: { message?: string } };
    const detail = `[${e?.status ?? "?"}] ${(e?.error?.message ?? e?.message ?? "erreur inconnue").slice(0, 200)}`;
    console.error("LLM chat error:", detail);
    const msg =
      e?.status === 429
        ? `⏳ Limite/quota de l'IA atteint. Détail technique : ${detail}\n(copie-moi ce message stp, ça m'aide à diagnostiquer ✨)`
        : e?.status === 401 || e?.status === 403
        ? `🔑 Souci de clé API côté serveur. Détail : ${detail}`
        : `Désolé, une erreur est survenue 😕 (détail technique : ${detail})\n(copie-moi ce message stp, ça m'aide à corriger ✨)`;
    return fluxTexte(msg, ndjson);
  }
}
