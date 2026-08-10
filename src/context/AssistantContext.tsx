"use client";

/* ════════════════════════════════════════════════════════════════════
   AssistantContext — LE cerveau unique de l'assistant Vaiiya.

   Un seul moteur, monté globalement (layout), exposé partout via
   useAssistant(). L'orbe de navigation (NavOrb) l'ouvre ; le bottom
   sheet (AssistantSheet) l'affiche. Il connaît la PAGE COURANTE et
   sait orienter (tag [NAV] → navigation réelle).

   v1 = ORIENTATION (lecture + navigation). Les tags d'écriture
   ([PROGRAMME_UPDATE], [LIEU_UPDATE]) sont nettoyés de l'affichage mais
   PAS appliqués ici (ils restent gérés par la page coach historique).
   ════════════════════════════════════════════════════════════════════ */

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { aiFetch, messageDeRefus } from "@/lib/aiFetch";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { goalsFromRow } from "@/lib/nutritionGoals";
import { resolveNavTarget } from "@/lib/siteKnowledge";
import { normalizeForDedupe, stripMemoryTags, normalizeCategory, type AiMemory } from "@/lib/aiMemory";
import { setThemePreference, type ThemePreference } from "@/hooks/useTheme";
import { assembleSeance, seanceToRow, normalizeCategory as normalizeWorkoutCategory, normalizeDifficulty, levelToDifficulty, type ProposedSeance } from "@/lib/assistantActions";
import { phraseDeRepli, normaliserChoix, type AssistantAction, type ChatEvent, type QuestionCliquable } from "@/lib/assistantTools";
import { PLANS } from "@/lib/plans";
import {
  resolveWhen, dayLabel, dayLabelLong, dayTitle, fetchDay, fetchRange, hasSeance, saveDay, prochainsJours,
  ctxFromLieu, readLieu, loadLieu, persistLieu, readVariant, weekDates, todayYmd, normalizeExercises, previewWeek,
  PLANNING_TYPE_BY_CATEGORY, type PlanningDay, type GenInput,
} from "@/lib/planning";

type MemoryAction =
  | { type: "save"; category?: string; fact?: string }
  | { type: "forget"; keywords?: string }
  | { type: "none" };

/* ── Filet anti-balises ──────────────────────────────────────────────
   Le coach n'a plus aucun outil : c'est l'aiguilleur qui décide, et la carte
   s'affiche toute seule. Sauf qu'un modèle à qui on décrit une carte finit
   par essayer de l'invoquer avec un mot-clé qu'il invente. Signalé par Louis
   le 2026-07-30 : « Je prépare une séance pecs […] [CARTE]Séance Pectoraux -
   Débutant[/CARTE] » — du code au milieu d'une conversation.

   La cause est traitée dans le prompt (plus aucune grammaire à crochets
   enseignée au coach), ceci est le filet : on ne peut pas lister à l'avance
   les balises qu'un modèle inventera, donc on les enlève toutes. Le motif est
   volontairement étroit — MAJUSCULES, chiffres et tirets bas uniquement — pour
   ne jamais toucher à une vraie phrase entre crochets. */
const BALISE = /\[\/?[A-Z][A-Z0-9_]{1,23}\]/g;
/** Coupe une balise en cours de frappe (« …prépare ça [CAR ») pendant le flux. */
const BALISE_EN_COURS = /\[\/?[A-Z][A-Z0-9_]*$/;

function sansBalises(texte: string): string {
  return texte.replace(BALISE, "").replace(/[ \t]{2,}/g, " ");
}

/** Clés d'objectif (onboarding) → libellés compris par le générateur. */
const GOAL_LABELS: Record<string, string> = {
  masse: "prise de masse", prise_de_masse: "prise de masse",
  poids: "perte de poids", perte_de_poids: "perte de poids",
  force: "force", endurance: "endurance",
  sante: "santé générale", sante_generale: "santé générale",
  souplesse: "souplesse",
};

/** Recette proposée par l'IA, en attente d'ajout aux repas du jour. */
export type PendingRecipe = {
  nom: string;
  portions: number;
  prepMin: number;
  cookMin: number;
  difficulty: string;
  ingredients: { nom: string; quantite: string }[];
  steps: string[];
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  safetyNote?: string;
};

/** Repas décrit par l'utilisateur, estimé, en attente d'ajout au journal. */
export type PendingMeal = {
  foodName: string;
  mealType: string; // petit-dejeuner | dejeuner | gouter | diner
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  confidence?: string;
};

/** Changement de planning proposé par l'IA, en attente de confirmation.
 *  `kicker`/`meta`/`cta` sont ce que la carte AFFICHE : ils sont composés ici,
 *  au moment où on connaît le jour visé et ce qu'on va écraser. La carte, elle,
 *  ne devine rien (elle ne saurait pas dire « à la place de Jambes »). */
type PendingPlan = {
  kicker: string;           // « Jeudi 6 août · à la place de « Jambes » »
  title: string;            // titre de la carte (nom de la séance ou jour déplacé)
  meta: string;             // « Force · 5 mouvements · en salle »
  cta: string;              // « Remplacer jeudi »
  writes: PlanningDay[];    // jours à écrire en base à la confirmation
  preview: PlanningDay | null; // jour dont on prévisualise les exercices
  /** Le jour visé peut-il être changé depuis la carte ? (faux pour la semaine entière) */
  retargetable?: boolean;
  /** Cette séance peut-elle rejoindre la bibliothèque en plus du planning ? */
  gardable?: boolean;
};

/** Un jour proposé dans le choix « quand ? » d'une carte. */
export type JourDispo = { ymd: string; label: string; occupe?: string | null; bloque?: boolean };

export type AssistantMsg = {
  role: "user" | "assistant";
  content: string;
  id: string;
  streaming?: boolean;
  /** Question à choix cliquables posée sous cette bulle. */
  question?: QuestionCliquable;
  /** Message envoyé au coach mais PAS affiché : la réponse à une question
   *  cliquable est déjà visible sous la forme de la puce cochée, l'écrire une
   *  seconde fois en bulle utilisateur dirait deux fois la même chose. */
  masque?: boolean;
};

interface UserContext {
  pseudo?: string; age?: string; height?: string; weight?: string;
  gender?: string; goals?: string[]; level?: string; sessionsPerWeek?: string;
  mealsPerDay?: string; diet?: string; skipped?: boolean;
}
interface LiveStats {
  calories?: number; calorieGoal?: number; proteins?: number; proteinGoal?: number; streak?: number;
  lastWeight?: number; recentSessions?: string[];
}

type AssistantContextValue = {
  isOpen: boolean;
  open: (prefill?: string) => void;
  close: () => void;
  toggle: () => void;
  clear: () => void;
  messages: AssistantMsg[];
  isStreaming: boolean;
  sendMessage: (text: string) => void;
  /** Réponse à une question cliquable (clic sur une puce). */
  repondreQuestion: (msgId: string, choix: string) => void;
  pseudo?: string;
  memoryNotice: string | null;
  pendingSeance: ProposedSeance | null;
  pendingPlan: PendingPlan | null;
  pendingRecipe: PendingRecipe | null;
  pendingMeal: PendingMeal | null;
  actionLoading: boolean;
  /** Le stock gratuit de séances gardées est plein : la carte n'offre alors que ce qui reste possible. */
  bibliothequePleine: boolean;
  /** Garde la séance proposée. `jour` la pose aussi sur le planning, en UNE
   *  validation : le jour se choisit maintenant AVANT de valider, plus après. */
  confirmSeance: (jour?: string | null) => void;
  /** Range une séance proposée dans la bibliothèque (aussi utilisé APRÈS une séance lancée sans l'avoir gardée). */
  garderSeance: (s: ProposedSeance) => Promise<boolean>;
  cancelSeance: () => void;
  confirmPlan: (garderAussi?: boolean) => void;
  /** Change le jour visé par la carte planning (mêmes exercices, autre date). */
  retargetPlan: (ymd: string) => void;
  cancelPlan: () => void;
  /** Les 7 prochains jours avec ce qui y est déjà prévu (choix « quand ? »). */
  chargerJours: () => Promise<JourDispo[]>;
  confirmRecipe: () => void;
  cancelRecipe: () => void;
  confirmMeal: () => void;
  cancelMeal: () => void;
};

const Ctx = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAssistant doit être utilisé dans <AssistantProvider>");
  return c;
}

let _counter = 0;
const uid = () => `${Date.now()}-${++_counter}`;

const CAP = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** « aujourd'hui », « demain », sinon le jour de la semaine (« jeudi »).
 *  Sert au libellé du bouton, qui doit tenir sur une ligne. */
function jourCourt(date: string): string {
  if (date === todayYmd()) return "aujourd'hui";
  if (date === resolveWhen("demain")) return "demain";
  return dayLabel(date).toLowerCase();
}

/* Les deux questions que le CODE pose (jamais le modèle) quand le lieu
   d'entraînement manque. Le TEXTE varie avec le contexte — « cette semaine »,
   « avant de te préparer ça » — mais les puces, elles, ne varient jamais :
   `repondreQuestion` relit la réponse au libellé (/salle/i, /halt/i), donc une
   copie qui divergerait (« En club ») enregistrerait le mauvais lieu en
   silence. Elles étaient recopiées à cinq endroits ; elles s'écrivent ici. */
const questionLieu = (relance?: string): QuestionCliquable =>
  ({ choix: ["En salle", "À la maison"], genre: "lieu", ...(relance ? { relance } : {}) });
const questionEquip = (relance?: string): QuestionCliquable =>
  ({ choix: ["Oui, des haltères", "Au poids du corps"], genre: "equip", ...(relance ? { relance } : {}) });

/** Lieu d'un jour de planning, en français lisible. */
const LIEU_LABEL: Record<string, string> = {
  salle: "en salle",
  halteres: "à la maison, haltères",
  poids: "au poids du corps",
};

/** Ce que la carte planning affiche. Composé ICI, où l'on sait quel jour est
 *  visé et ce qu'il portait déjà : la carte, elle, n'a aucun moyen de deviner
 *  « à la place de Jambes ». Nommer ce qu'on écrase AVANT le clic, c'est la
 *  même règle que « rien ne s'écrit sans validation ». */
function texteCartePlan(jour: PlanningDay, remplace: string | null, verbe = "Programmer") {
  return {
    kicker: CAP(dayLabelLong(jour.date)) + (remplace ? ` · à la place de « ${remplace} »` : ""),
    meta: [jour.type, `${jour.exerciseList.length} mouvements`, LIEU_LABEL[jour.location ?? ""] ?? ""]
      .filter(Boolean).join(" · "),
    cta: `${remplace ? "Remplacer" : verbe} ${jourCourt(jour.date)}`,
  };
}

/** Normalise un moment de repas vers les 4 valeurs canoniques du journal. */
function normalizeMealType(raw?: string): string {
  const t = (raw || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/petit|matin|breakfast/.test(t)) return "petit-dejeuner";
  if (/dejeun|midi|lunch/.test(t)) return "dejeuner";
  if (/gout|collation|snack/.test(t)) return "gouter";
  if (/diner|soir|dinner/.test(t)) return "diner";
  return "";
}
/** Repas le plus probable selon l'heure (repli quand le moment n'est pas dit). */
function mealTypeFromHour(h = new Date().getHours()): string {
  return h < 10 ? "petit-dejeuner" : h < 15 ? "dejeuner" : h < 18 ? "gouter" : "diner";
}

/** Garde-fou anti-faux-positif du thème. Le petit modèle d'analyse hallucinait
 *  parfois l'intention set_theme sur un message sans rapport → l'app basculait
 *  en sombre « sans raison ». On n'applique le thème QUE si le message parle
 *  vraiment de l'apparence (thème/mode/sombre/clair/luminosité/yeux/écran). */
function textMentionsTheme(text: string): boolean {
  const t = (text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /(theme|mode\s*(?:sombre|clair|nuit|jour|noir|blanc|auto)|\bsombre\b|\bclair\b|\bnuit\b|dark\s*mode|night\s*mode|apparence|affichage|luminos|eblou|trop\s*(?:blanc|lumineu|clair|brillant|vif)|mal\s*aux\s*yeux|\becran\b|\bfond\b\s*(?:noir|blanc|sombre|clair))/.test(t);
}

/* Au-delà de cette absence (app en arrière-plan / onglet en veille), revenir
   dans l'app rouvre un chat vierge. sessionStorage gère déjà les vraies
   fermetures ; ce filet couvre les PWA qui restent chaudes. */
const IDLE_RESET_MS = 30 * 60 * 1000; // 30 min

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);
  const [pendingSeance, setPendingSeance] = useState<ProposedSeance | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<PendingRecipe | null>(null);
  const [pendingMeal, setPendingMeal] = useState<PendingMeal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  /* Le stock gratuit de séances gardées est plein ? La carte le dit AVANT le
     clic et ne propose alors que ce qui reste possible (s'entraîner). On ne
     limite jamais le fait de créer ni de s'entraîner, seulement le rangement. */
  const [bibliothequePleine, setBibliothequePleine] = useState(false);

  const userContextRef = useRef<UserContext | null>(null);
  const liveStatsRef = useRef<LiveStats | null>(null);
  const richProfileRef = useRef<Record<string, unknown> | null>(null);
  const memoriesRef = useRef<AiMemory[]>([]);
  const dataLoadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  /* La demande mise en attente parce qu'il nous manquait le lieu. Elle repart
     dès qu'on l'apprend, PAR N'IMPORTE QUEL CHEMIN : la puce touchée, mais
     aussi la réponse tapée à la main (outil save_lieu). C'était le trou : on
     enregistrait le lieu, on disait « c'est noté », et il fallait redemander
     sa séance. Vu de l'utilisateur, la première demande ne donnait jamais de
     carte. */
  const attenteRef = useRef<string | null>(null);
  /* `sendMessage` est défini plus bas ; `runAction` doit pouvoir relancer une
     demande. Un ref évite de tout réordonner (et la boucle de dépendances). */
  const sendRef = useRef<((text: string, masque?: boolean) => void) | null>(null);

  /* Le lieu vit dans le localStorage (lecture synchrone) mais la source
     durable, c'est la base. Sans cette hydratation, un appareil neuf, un
     stockage vidé ou un navigateur privé refaisait poser la question alors
     qu'on connaît déjà la réponse — et seul /progression hydratait. */
  useEffect(() => {
    if (!user?.id) return;
    void loadLieu(user.id);
  }, [user?.id]);

  /* ── Historique de SESSION (par utilisateur) ──
     Le fil de conversation ne vit QUE le temps de la session : il est rangé
     dans sessionStorage (et non localStorage) → fermer puis rouvrir l'app =
     chat vierge, plus jamais un mur de messages d'il y a un mois. On estampille
     le fil pour aussi repartir à zéro quand on revient après une longue absence
     (PWA restée chaude). La mémoire long terme (ai_memories, Supabase) n'est
     JAMAIS concernée. */
  const historyKey = user?.id ? `aura_coach_history_${user.id}` : null;

  const readHistory = useCallback((): AssistantMsg[] => {
    if (!historyKey || typeof window === "undefined") return [];
    // Purge de l'ancien historique PERSISTANT (localStorage) des versions
    // précédentes — sinon un vieux fil ressort à la première ouverture.
    try { localStorage.removeItem(historyKey); } catch { /* ignore */ }
    try {
      const raw = sessionStorage.getItem(historyKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { ts?: number; msgs?: AssistantMsg[] };
      if (!parsed || (parsed.ts != null && Date.now() - parsed.ts > IDLE_RESET_MS)) {
        try { sessionStorage.removeItem(historyKey); } catch { /* ignore */ }
        return [];
      }
      return Array.isArray(parsed.msgs) ? parsed.msgs : [];
    } catch { return []; }
  }, [historyKey]);

  useEffect(() => { setMessages(readHistory()); }, [readHistory]);

  const persist = useCallback((msgs: AssistantMsg[]) => {
    if (!historyKey || typeof window === "undefined") return;
    try {
      const clean = msgs.slice(-60).map((m) => ({ ...m, streaming: false }));
      sessionStorage.setItem(historyKey, JSON.stringify({ ts: Date.now(), msgs: clean }));
    } catch { /* ignore */ }
  }, [historyKey]);

  // Retour dans l'app (onglet ré-affiché) après une longue absence → si le
  // dernier message dépasse IDLE_RESET_MS, on rouvre sur un chat vierge. Ne
  // touche à rien tant que le fil est frais (pas d'écrasement d'une conversation
  // en cours).
  useEffect(() => {
    if (!historyKey || typeof window === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const raw = sessionStorage.getItem(historyKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { ts?: number };
        if (parsed?.ts != null && Date.now() - parsed.ts > IDLE_RESET_MS) {
          try { sessionStorage.removeItem(historyKey); } catch { /* ignore */ }
          setMessages([]);
        }
      } catch { /* ignore */ }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [historyKey]);

  /* ── Collecte du contexte utilisateur (LAZY : au 1er besoin seulement) ── */
  const ensureContext = useCallback(async () => {
    if (dataLoadedRef.current || !user?.id) return;
    dataLoadedRef.current = true;
    const supabase = createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_age, onboarding_height, onboarding_weight, onboarding_gender, onboarding_goals, onboarding_level, onboarding_sessions_week, onboarding_meals_day, onboarding_diet")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && (profile.onboarding_age || profile.onboarding_weight || profile.onboarding_level)) {
      userContextRef.current = {
        pseudo: user.pseudo,
        age: profile.onboarding_age?.toString(),
        height: profile.onboarding_height?.toString(),
        weight: profile.onboarding_weight?.toString(),
        gender: profile.onboarding_gender,
        goals: profile.onboarding_goals ?? [],
        level: profile.onboarding_level,
        sessionsPerWeek: profile.onboarding_sessions_week?.toString(),
        mealsPerDay: profile.onboarding_meals_day?.toString(),
        diet: profile.onboarding_diet,
      };
    } else {
      userContextRef.current = { pseudo: user.pseudo, skipped: true };
    }

    /* `todayYmd` (date LOCALE), pas `toISOString()` : les repas sont écrits
       avec la date locale (toDateStr de NutritionTab), donc une clé UTC lisait
       la veille entre minuit et 2 h du matin à Paris, et le coach annonçait
       les calories d'hier comme celles du jour. */
    const today = todayYmd();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

    const [nutritionTodayRes, nutritionWeekRes, sessionsRes, weightHistoryRes, followersRes, followingRes, postsRes, profileBioRes, memoriesRes] = await Promise.all([
      supabase.from("nutrition_logs").select("calories, proteins").eq("user_id", user.id).eq("date", today),
      supabase.from("nutrition_logs").select("date, meal_type, food_name, calories, proteins, carbs, fats, time, description").eq("user_id", user.id).gte("date", sevenDaysAgo).order("date", { ascending: false }).order("time", { ascending: true }),
      supabase.from("workout_sessions").select("title, started_at, duration_minutes, calories_burned, exercises").eq("user_id", user.id).gte("started_at", thirtyDaysAgo).order("started_at", { ascending: false }).limit(15),
      supabase.from("weight_logs").select("weight_kg, date").eq("user_id", user.id).order("date", { ascending: false }).limit(10),
      supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("posts").select("type, caption, performance_data, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("profiles").select("bio, full_name").eq("id", user.id).maybeSingle(),
      supabase.from("ai_memories").select("id, content, category, source, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
    ]);

    const nutritionRows = nutritionTodayRes.data ?? [];
    const totalCalories = nutritionRows.reduce((s: number, r: { calories: number }) => s + (r.calories ?? 0), 0);
    const totalProteins = nutritionRows.reduce((s: number, r: { proteins: number }) => s + (r.proteins ?? 0), 0);

    const sessionRows = sessionsRes.data ?? [];
    const sessionDays = new Set((sessionRows as { started_at: string }[]).map((s) => s.started_at.slice(0, 10)));
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (sessionDays.has(d.toISOString().slice(0, 10))) streak++;
      else if (i > 0) break;
    }

    const weightHistory = (weightHistoryRes.data ?? []) as { weight_kg: number; date: string }[];
    const recentSessions = sessionRows.slice(0, 5).map((s: { title: string; started_at: string; duration_minutes?: number }) => {
      const d = new Date(s.started_at);
      const dayNames = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
      return `${dayNames[d.getDay()]} : ${s.title}${s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}`;
    });

    // Objectif du jour : même calcul partagé que l'écran Nutrition (profil central
    // + dernière pesée qui prime) → l'IA et l'écran ne peuvent plus diverger.
    const hasBodyProfile = !!(profile && (profile.onboarding_age || profile.onboarding_weight || profile.onboarding_level));
    const dayGoals = hasBodyProfile
      ? goalsFromRow(profile as Record<string, unknown>, weightHistory[0]?.weight_kg ?? null)
      : null;

    liveStatsRef.current = {
      calories: Math.round(totalCalories),
      calorieGoal: dayGoals?.calories,
      proteins: Math.round(totalProteins),
      proteinGoal: dayGoals?.proteins,
      streak: streak > 0 ? streak : undefined,
      lastWeight: weightHistory[0]?.weight_kg ?? undefined,
      recentSessions: recentSessions.length > 0 ? recentSessions : undefined,
    };

    const nutritionWeekMap: Record<string, { calories: number; proteins: number; carbs: number; fats: number }> = {};
    for (const row of (nutritionWeekRes.data ?? []) as { date: string; calories: number; proteins: number; carbs?: number; fats?: number }[]) {
      if (!nutritionWeekMap[row.date]) nutritionWeekMap[row.date] = { calories: 0, proteins: 0, carbs: 0, fats: 0 };
      nutritionWeekMap[row.date].calories += row.calories ?? 0;
      nutritionWeekMap[row.date].proteins += row.proteins ?? 0;
    }
    const nutritionWeek = Object.entries(nutritionWeekMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, v]) => ({ date, calories: Math.round(v.calories), proteins: Math.round(v.proteins) }));

    const mealsDetail = ((nutritionWeekRes.data ?? []) as { date: string; meal_type?: string; food_name?: string; calories?: number; proteins?: number; time?: string; description?: string | null }[])
      .slice(0, 12)
      .map((m) => ({ date: m.date, mealType: m.meal_type, name: m.food_name ?? "Repas", calories: m.calories, proteins: m.proteins, time: m.time, description: m.date === today ? (m.description ?? null) : null }));

    const recentPosts = (postsRes.data ?? []).map((p: { type: string; caption?: string | null; created_at: string }) => ({
      type: p.type, caption: p.caption, createdAt: p.created_at.slice(0, 10),
    }));

    const workoutHistory = sessionRows.map((s: { title: string; started_at: string; duration_minutes?: number; calories_burned?: number; exercises?: unknown }) => ({
      title: s.title, date: s.started_at.slice(0, 10), durationMinutes: s.duration_minutes, caloriesBurned: s.calories_burned,
      exercises: Array.isArray(s.exercises) ? (s.exercises as { name?: string; title?: string }[]).slice(0, 5).map((e) => e.name ?? e.title ?? "exercice") : undefined,
    }));

    richProfileRef.current = {
      bio: profileBioRes.data?.bio ?? null,
      fullName: profileBioRes.data?.full_name ?? null,
      followersCount: followersRes.count ?? 0,
      followingCount: followingRes.count ?? 0,
      postsCount: recentPosts.length,
      recentPosts, todayDate: today, mealsDetail, nutritionWeek,
      weightHistory: weightHistory.map((w) => ({ date: w.date, weight: w.weight_kg })),
      workoutHistory, monthWorkouts: sessionRows.length,
    };

    memoriesRef.current = (memoriesRes.data ?? []) as AiMemory[];
  }, [user?.id, user?.pseudo]);

  /* Repère nutrition OPTIONNEL pour la génération de séance — renvoie une courte
     note SEULEMENT si l'utilisateur suit sa nutrition aujourd'hui ET qu'un signal
     clair existe. Sinon null → séance générée comme d'habitude, jamais de pénalité.
     C'est un BONUS, pas une condition (même esprit que la règle côté /api/chat). */
  const buildNutritionNote = useCallback((): string | null => {
    const ls = liveStatsRef.current;
    const rich = richProfileRef.current as { todayDate?: string; mealsDetail?: { date: string }[] } | null;
    const goal = ls?.calorieGoal;
    const consumed = ls?.calories;
    if (!goal || consumed == null) return null;
    const today = rich?.todayDate;
    const mealsToday = (rich?.mealsDetail ?? []).filter((m) => m.date === today).length;
    if (mealsToday === 0) return null; // ne note pas ses repas aujourd'hui → on n'y touche pas
    const ratio = consumed / goal;
    if (ratio >= 0.9) {
      return `L'utilisateur est bien rechargé aujourd'hui (~${consumed}/${goal} kcal mangées). Tu PEUX te permettre une séance un peu plus intense si c'est pertinent.`;
    }
    if (new Date().getHours() >= 16 && ratio <= 0.5) {
      return `L'utilisateur a peu mangé aujourd'hui (~${consumed}/${goal} kcal). Tu PEUX privilégier une séance un peu plus courte ou d'intensité modérée.`;
    }
    return null;
  }, []);

  /* ── Mémoire long terme : persiste une action d'extraction (save / forget) ── */
  const persistMemoryAction = useCallback(async (action: MemoryAction) => {
    if (!user?.id) return;
    const supabase = createClient();

    if (action.type === "forget" && action.keywords) {
      const nk = normalizeForDedupe(action.keywords);
      if (!nk) return;
      const targets = memoriesRef.current.filter((mm) => {
        const c = normalizeForDedupe(mm.content);
        return c.includes(nk) || nk.includes(c);
      });
      if (targets.length === 0) return;
      const ids = targets.map((t) => t.id);
      await supabase.from("ai_memories").delete().in("id", ids);
      const idSet = new Set(ids);
      memoriesRef.current = memoriesRef.current.filter((mm) => !idSet.has(mm.id));
      setMemoryNotice("C'est noté, j'oublie ça.");
      return;
    }

    if (action.type === "save" && action.fact) {
      const content = String(action.fact).trim();
      const ns = normalizeForDedupe(content);
      if (!ns) return;
      const dup = memoriesRef.current.some((mm) => {
        const c = normalizeForDedupe(mm.content);
        return c === ns || c.includes(ns) || ns.includes(c);
      });
      if (dup) return;
      const { data, error } = await supabase
        .from("ai_memories")
        .insert({ user_id: user.id, content, category: normalizeCategory(action.category), source: "auto" })
        .select("id, content, category, source, created_at")
        .single();
      if (!error && data) {
        memoriesRef.current = [data as AiMemory, ...memoriesRef.current];
        setMemoryNotice("Je m'en souviendrai 🧠");
      }
    }
  }, [user?.id]);

  /* ── Reste-t-il une place dans la bibliothèque ? ──
     Même règle que /progression : on plafonne le STOCK, jamais la création ni
     l'entraînement. Supprimer une séance libère une place tout de suite, et ce
     qui est déjà gardé n'est ni verrouillé ni effacé. Compteur côté client :
     c'est une limite douce assumée, pas une frontière de sécurité. */
  const verifierPlaces = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    if (user.is_premium || user.is_admin) { setBibliothequePleine(false); return false; }
    const { count } = await createClient()
      .from("custom_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const pleine = (count ?? 0) >= PLANS.free.limits.sessionsMax;
    setBibliothequePleine(pleine);
    return pleine;
    // `user` en entier (et pas ses champs un à un) : c'est ce que le compilateur
    // React déduit, et une dépendance plus fine lui fait renoncer à optimiser.
  }, [user]);

  /* Pose une question à choix cliquables sous une nouvelle bulle du coach.
     `relance` = la demande d'origine, renvoyée au coach une fois la réponse
     connue, pour qu'il enchaîne au lieu de repartir de zéro. */
  const poserQuestion = useCallback((contenu: string, q: QuestionCliquable) => {
    // Mémorisée ici aussi : si l'utilisateur tape sa réponse au lieu de toucher
    // une puce, c'est `save_lieu` qui la reprendra.
    if (q.relance) attenteRef.current = q.relance;
    setMessages((prev) => [...prev, { role: "assistant" as const, content: contenu, id: uid(), question: q }]);
  }, []);

  /* ── Action PLANNING (Phase 2) : prépare une carte de confirmation.
     Aucune écriture en base ici — tout passe par confirmPlan() (clic). ── */
  const preparePlanAction = useCallback(async (action: AssistantAction, text: string) => {
    if (!user?.id) return;
    // Réponse courte du coach dans le fil (chaque impasse est explicite, jamais muette).
    const say = (content: string) => setMessages((prev) => [...prev, { role: "assistant" as const, content, id: uid() }]);

    // DÉPLACEMENT : pas de génération, on copie la séance vers le jour cible
    // et on libère (Repos) le jour source. Aucun échec silencieux : chaque
    // impasse renvoie un message clair (sinon « la carte ne s'ouvre pas »).
    if (action.intent === "plan_move") {
      let to = action.to ? resolveWhen(action.to) : null;
      // Jour source : celui indiqué s'il porte une séance ; sinon le prochain
      // jour d'entraînement à venir cette semaine (« déplace ma séance dans 2
      // jours » sans préciser le départ doit marcher même si aujourd'hui = repos).
      let from = action.when ? resolveWhen(action.when) : null;
      let src = from ? await fetchDay(user.id, from) : null;
      const weekMap = await fetchRange(user.id, weekDates());
      if (!hasSeance(src)) {
        const next = weekDates().find((d) => d >= todayYmd() && d !== to && hasSeance(weekMap[d]));
        if (next) { from = next; src = weekMap[next]; }
      }
      if (!hasSeance(src) || !from) {
        say("Je ne trouve pas de séance à déplacer cette semaine 🤔 Dis-moi le jour de départ, par ex. « déplace la séance de jeudi à vendredi ».");
        return;
      }
      // Empêchement sans destination (« je ne peux pas jeudi ») → on choisit
      // le premier jour de repos à venir de la semaine (après le jour source
      // de préférence), plutôt que de renvoyer une question.
      if (!to) {
        const rest = (d: string) => {
          const day = weekMap[d];
          return !!day && day.status !== "done" && !hasSeance(day);
        };
        to = weekDates().find((d) => d > from! && rest(d))
          ?? weekDates().find((d) => d >= todayYmd() && d !== from && rest(d))
          ?? null;
        if (!to) {
          say("Vers quel jour veux-tu déplacer la séance ? (par ex. « demain », « dans 2 jours » ou « vendredi ») 📅");
          return;
        }
      }
      if (from === to) {
        say(`La séance est déjà prévue le ${dayLabelLong(to)} 🙂`);
        return;
      }
      const movedDay: PlanningDay = { ...src, date: to, status: "planned" };
      const restDay: PlanningDay = { date: from, type: "Repos", title: "", difficulty: src.difficulty, location: src.location, exerciseList: [], sessionId: null, status: "planned" };
      const ecrase = hasSeance(weekMap[to]) ? dayTitle(weekMap[to]) : null;
      const t = texteCartePlan(movedDay, ecrase, "Déplacer vers");
      setPendingPlan({
        ...t,
        kicker: `${CAP(dayLabelLong(from))} → ${dayLabelLong(to)}${ecrase ? ` · à la place de « ${ecrase} »` : ""}`,
        title: dayTitle(src),
        writes: [movedDay, restDay],
        preview: movedDay,
        retargetable: true,
      });
      return;
    }

    // SEMAINE ENTIÈRE : « refais ma semaine » / « plus légère » / « plus de
    // cardio »… On génère la semaine SANS écrire (previewWeek) et on propose
    // une carte ; le passé et les jours déjà faits sont préservés.
    if (action.intent === "plan_regen") {
      const supabase = createClient();
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
        .eq("id", user.id)
        .maybeSingle();
      const saved = readLieu(user.id);
      if (!saved.location || (saved.location === "maison" && !saved.equip)) {
        // Lieu incomplet : on le demande en puces plutôt que de rester muet
        // sur une promesse. La demande d'origine repart dès qu'on a la réponse.
        if (!saved.location) {
          poserQuestion("Tu t'entraînes où cette semaine ?", questionLieu(text));
        } else {
          poserQuestion("Tu as des haltères à la maison ?", questionEquip(text));
        }
        return;
      }
      const adjust = action.adjust ?? "none";
      let sessions = prof?.onboarding_sessions_week ?? 3;
      const goals = (((prof?.onboarding_goals as string[] | null) ?? [])).map((g) => GOAL_LABELS[g] ?? g);
      if (adjust === "leger") sessions = Math.max(2, sessions - 1);
      if (adjust === "intense") sessions = Math.min(6, sessions + 1);
      if (adjust === "cardio") goals.push("endurance");
      if (adjust === "force") goals.push("force");
      // Variant frais pour que « refais » change vraiment le contenu.
      const variant = readVariant(user.id) + 1;
      try { localStorage.setItem(`vaiiya_prog_variant_${user.id}`, String(variant)); } catch { /* ignore */ }
      const gen: GenInput = {
        ctx: ctxFromLieu(saved.location, saved.equip),
        sessions, goals,
        level: prof?.onboarding_level ?? null,
        variant,
        seed: user.id,
      };
      const dates = weekDates();
      const existing = await fetchRange(user.id, dates);
      const writes = previewWeek(gen, dates)
        .filter((d) => d.date >= todayYmd() && existing[d.date]?.status !== "done");
      const nbSeances = writes.filter(hasSeance).length;
      if (nbSeances === 0) {
        say("Il ne reste plus de jour modifiable cette semaine 🙂 Décale plutôt une séance précise, ou redemande-moi lundi pour la semaine d'après.");
        return;
      }
      const adjustLabel = adjust === "leger" ? " · plus légère"
        : adjust === "intense" ? " · plus intense"
        : adjust === "cardio" ? " · plus de cardio"
        : adjust === "force" ? " · plus de force" : "";
      setPendingPlan({
        kicker: "Toute la semaine",
        title: "Nouvelle semaine ✦",
        meta: `Dès aujourd'hui · ${nbSeances} séance${nbSeances > 1 ? "s" : ""}${adjustLabel}`,
        cta: "Remplacer ma semaine",
        writes,
        preview: writes.find(hasSeance) ?? null,
      });
      return;
    }

    // BIBLIOTHÈQUE → PLANNING : poser une séance DÉJÀ créée sur un jour (pas de
    // génération : on copie la séance existante et on la lie via session_id).
    if (action.intent === "plan_library") {
      const day = resolveWhen(action.when || "aujourd_hui");
      if (!day) {
        say("Quel jour veux-tu programmer cette séance ? (par ex. « mardi » ou « demain ») 📅");
        return;
      }
      const title = (action.title || "").trim();
      if (!title) {
        say("Quelle séance de ta bibliothèque veux-tu programmer ? Donne-moi son nom 🙂");
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("custom_sessions")
        .select("id, title, category, difficulty, exercise_list")
        .eq("user_id", user.id)
        .ilike("title", `%${title}%`)
        .order("updated_at", { ascending: false })
        .limit(1);
      const row = data?.[0] as { id: string; title: string; category: string | null; difficulty: string | null; exercise_list: unknown } | undefined;
      if (!row) {
        say(`Je ne trouve pas de séance « ${title} » dans ta bibliothèque 🤔 Vérifie le nom, ou demande-moi de la créer.`);
        return;
      }
      const category = normalizeWorkoutCategory(row.category);
      const saved = readLieu(user.id);
      const libDay: PlanningDay = {
        date: day,
        type: PLANNING_TYPE_BY_CATEGORY[category] ?? "Force",
        title: row.title,
        difficulty: normalizeDifficulty(row.difficulty),
        location: ctxFromLieu(saved.location, saved.equip),
        exerciseList: normalizeExercises(row.exercise_list),
        sessionId: row.id,
        status: "planned",
      };
      const avant = await fetchDay(user.id, day);
      setPendingPlan({
        ...texteCartePlan(libDay, hasSeance(avant) ? dayTitle(avant) : null),
        title: row.title,
        writes: [libDay],
        preview: libDay,
        retargetable: true,
      });
      return;
    }

    // SET / LOCATION : on génère une vraie séance pour le jour cible.
    const when = resolveWhen(action.when || "aujourd_hui");
    if (!when) return;

    const saved = readLieu(user.id);
    let location: "salle" | "maison" | null = saved.location;
    let equip: "halteres" | "poids" | null = saved.equip;
    if (action.intent === "plan_location") {
      location = action.location === "salle" ? "salle" : "maison";
      if (location === "maison" && equip !== "halteres") equip = "poids";
    }
    const ctx = ctxFromLieu(location, equip);

    const category = normalizeWorkoutCategory(action.category);
    const muscles: string[] = Array.isArray(action.muscles)
      ? (action.muscles as unknown[]).filter((m): m is string => typeof m === "string")
      : [];
    let baseDesc = (action.description || "").trim();
    const existing = await fetchDay(user.id, when);
    if (action.intent === "plan_location") {
      baseDesc = existing && existing.title ? existing.title : "séance complète";
    }

    setActionLoading(true);
    setPendingPlan(null);
    try {
      const difficulty = levelToDifficulty(userContextRef.current?.level);
      const lieuTxt = location === "maison"
        ? (equip === "halteres" ? " à la maison avec haltères" : " à la maison au poids du corps")
        : " en salle de sport";
      const description = `${baseDesc || "séance complète"}${lieuTxt}`.slice(0, 400);
      // Bonus nutrition uniquement si on planifie AUJOURD'HUI (jamais un jour futur)
      const nutritionNote = when === richProfileRef.current?.todayDate ? buildNutritionNote() : null;

      const genRes = await aiFetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, difficulty, muscles, nutritionNote }),
      });
      if (!genRes.ok) throw new Error("generation HTTP " + genRes.status);
      const data = await genRes.json();
      if (!data || data.error) throw new Error("generation: " + (data?.error ?? "réponse vide"));

      const seance = assembleSeance({
        title: data.title,
        category,
        difficulty,
        muscles: (Array.isArray(data.muscles) && data.muscles.length > 0) ? data.muscles : muscles,
        rawExercises: Array.isArray(data.exercises) ? data.exercises : [],
      });

      const day: PlanningDay = {
        date: when,
        type: PLANNING_TYPE_BY_CATEGORY[category] ?? "Force",
        title: seance.title,
        difficulty,
        location: ctx,
        exerciseList: normalizeExercises(seance.exerciseList),
        sessionId: null,
        status: "planned",
      };

      const pleine = await verifierPlaces();
      setPendingPlan({
        ...texteCartePlan(day, hasSeance(existing) ? dayTitle(existing) : null),
        title: seance.title,
        writes: [day],
        preview: day,
        retargetable: true,
        // Générée à l'instant : elle n'existe nulle part ailleurs, donc on peut
        // proposer de la garder AUSSI dans la bibliothèque, pas seulement sur
        // ce jour-là (une séance de la biblio, elle, y est déjà). Sauf si le
        // stock gratuit est plein : on ne propose pas un bouton qui refusera.
        gardable: !pleine,
      });
    } catch (e) {
      const detail = (e as { message?: string })?.message ?? String(e);
      say(`⚠️ Modification du planning échouée — ${detail}`);
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, buildNutritionNote, poserQuestion, verifierPlaces]);

  /* ── Mémoire long terme (silencieuse, best-effort) ──
     Volontairement restée sur son propre petit appel : elle n'a rien à voir
     avec ce que le coach répond à l'écran, personne ne la voit arriver, et
     son prompt est affûté depuis des mois. Les ACTIONS, elles, ont quitté
     cet appel : elles viennent maintenant du même tour que le texte. ── */
  const extractMemory = useCallback(async (text: string, context: string) => {
    if (!user?.id || !text.trim()) return;
    try {
      const res = await aiFetch("/api/assistant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });
      if (!res.ok) return;
      const parsed = (await res.json()) as { memory?: MemoryAction } | null;
      const mem = parsed?.memory;
      if (mem && (mem.type === "save" || mem.type === "forget")) void persistMemoryAction(mem);
    } catch { /* silencieux par nature */ }
  }, [user?.id, persistMemoryAction]);

  /* ── Exécution d'une action décidée par le coach ──
     L'action arrive du MÊME appel que sa phrase (outils de /api/chat), donc
     le texte et la carte ne peuvent plus se contredire. Ajouter une capacité :
     une entrée dans `assistantTools.ts`, une branche ici, une carte si ça écrit. ── */
  const runAction = useCallback(async (action: AssistantAction, text: string) => {
    if (!user?.id || !action?.intent) return;

    // La question du coach (ask_choice) est rattachée à sa bulle dans
    // sendMessage : ici il n'y a rien à exécuter.
    if (action.intent === "ask_choice") return;

    // NAVIGATION : le coach emmène l'utilisateur sur une page de l'app.
    if (action.intent === "open_page") {
      const route = resolveNavTarget(action.cible ?? "");
      if (route && route !== pathname) setTimeout(() => router.push(route), 700);
      return;
    }

    // LIEU D'ENTRAÎNEMENT : mémorisé dès que l'utilisateur l'indique, pour que
    // le tour suivant ne repose pas la question (localStorage + base).
    if (action.intent === "save_lieu") {
      const loc = action.lieu === "salle" ? "salle" : action.lieu === "maison" ? "maison" : null;
      const eq = action.materiel === "halteres" ? "halteres" : action.materiel === "poids" ? "poids" : null;
      if (!loc && !eq) return;
      void persistLieu(user.id, { ...(loc ? { location: loc } : {}), ...(eq ? { equip: eq } : {}) });

      /* Une demande attendait ce lieu : elle repart toute seule. Sans ça, le
         coach répondait « c'est noté ✦ » et l'utilisateur devait redemander sa
         séance — d'où l'impression que la première demande ne marche jamais.
         (localStorage est déjà écrit par persistLieu, la relecture est bonne.) */
      const attente = attenteRef.current;
      if (!attente) return;
      const { location, equip } = readLieu(user.id);
      if (!location) return;
      if (location === "maison" && !equip) {
        // Une seule question à la fois : le matériel arrive maintenant, et
        // c'est lui qui relancera la demande.
        poserQuestion("Tu as des haltères à la maison ?", questionEquip(attente));
        return;
      }
      attenteRef.current = null;
      sendRef.current?.(attente, true);
      return;
    }

    // 2a-bis) THÈME du site (sombre / clair / auto). Appliqué TOUT DE SUITE,
    // sans carte de confirmation : c'est instantané, visible et réversible d'un
    // mot — demander « tu confirmes ? » pour un changement de couleur serait
    // plus lourd que l'action elle-même.
    if (action.intent === "set_theme") {
      const t = (action.theme ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const pref: ThemePreference | null =
        /somb|dark|nuit|noir/.test(t) ? "dark"
        : /clair|light|jour|blanc/.test(t) ? "light"
        : /auto|system/.test(t) ? "system"
        : null;
      if (!pref) return;
      // Garde anti-faux-positif : le petit modèle hallucinait parfois set_theme
      // sur un message sans rapport (l'app basculait en sombre « sans raison »).
      // On n'applique QUE si l'utilisateur a vraiment parlé d'apparence.
      if (!textMentionsTheme(text)) return;
      setThemePreference(pref);
      // Pas de message ici : le coach parle et agit dans le même tour, et
      // `phraseDeRepli` annonce déjà le changement. En ajouter un deuxième
      // ferait dire deux fois la même chose.
      return;
    }

    // 2a-ter) RECETTE : l'IA cuisine (un plat, un thème, ou les restes qu'on a
    // sous la main) puis propose une carte. Rien n'est loggé sans validation.
    if (action.intent === "create_recipe") {
      setActionLoading(true);
      setPendingRecipe(null);
      try {
        const ingredients = Array.isArray(action.ingredients)
          ? (action.ingredients as unknown[]).filter((i): i is string => typeof i === "string")
          : [];
        const res = await aiFetch("/api/nutrition/recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dish: action.dish ?? "",
            theme: action.theme_recette ?? "",
            ingredients,
            mealType: action.mealType ?? "",
            portions: 2,
          }),
        });
        if (!res.ok) throw new Error("recette HTTP " + res.status);
        const data = await res.json();
        if (!data?.recipe) throw new Error(data?.error ?? "réponse vide");
        setPendingRecipe(data.recipe as PendingRecipe);
      } catch (e) {
        const detail = (e as { message?: string })?.message ?? String(e);
        setMessages((prev) => [...prev, {
          role: "assistant" as const,
          content: `⚠️ Je n'ai pas réussi à écrire la recette — ${detail}`,
          id: uid(),
        }]);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // 2a-quater) REPAS : l'utilisateur raconte ce qu'il a mangé/bu → on estime
    // les macros (endpoint nutrition existant) et on propose une carte. Rien
    // n'est loggé sans clic (même règle que la recette et les séances). Zéro
    // jugement : on note ce qui a été mangé, quoi que ce soit.
    if (action.intent === "log_meal") {
      const food = (action.food ?? "").trim();
      if (!food) return;
      setActionLoading(true);
      setPendingMeal(null);
      try {
        const res = await aiFetch("/api/nutrition/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: food }),
        });
        if (!res.ok) throw new Error("estimation HTTP " + res.status);
        const data = await res.json();
        if (!data || data.error || typeof data.calories !== "number") {
          throw new Error(data?.error ?? "réponse vide");
        }
        const mealType = normalizeMealType(action.mealType) || normalizeMealType(data.mealType) || mealTypeFromHour();
        setPendingMeal({
          foodName: typeof data.foodName === "string" && data.foodName.trim() ? data.foodName.trim() : food,
          mealType,
          calories: Math.max(0, Math.round(data.calories ?? 0)),
          proteins: Math.max(0, Math.round(data.proteins ?? 0)),
          carbs: Math.max(0, Math.round(data.carbs ?? 0)),
          fats: Math.max(0, Math.round(data.fats ?? 0)),
          confidence: typeof data.confidence === "string" ? data.confidence : undefined,
        });
      } catch (e) {
        const detail = (e as { message?: string })?.message ?? String(e);
        setMessages((prev) => [...prev, {
          role: "assistant" as const,
          content: `⚠️ Je n'ai pas réussi à estimer ce repas — ${detail}`,
          id: uid(),
        }]);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // 2a) Pilotage du PLANNING (remplacer / décaler / changer le lieu / poser une séance de la biblio / refaire la semaine)
    if (action.intent === "plan_set" || action.intent === "plan_location" || action.intent === "plan_move" || action.intent === "plan_library" || action.intent === "plan_regen") {
      void preparePlanAction(action, text);
      return;
    }

    // 2b) Création d'une séance réutilisable (bibliothèque) → génération + carte
    if (action.intent !== "create_seance") return;

    /* Le lieu conditionne le contenu (machines vs poids du corps). Il est
       normalement déjà connu — `questionManquante` le vérifie avant d'exécuter
       l'action — mais ce filet ne renvoie JAMAIS en silence : un `return` nu
       ici, c'était une demande sans réponse et sans explication. */
    const { location: lieu, equip } = readLieu(user.id);
    if (!lieu) {
      poserQuestion("Avant de te préparer ça, tu t'entraînes où ?", questionLieu(text));
      return;
    }

    setActionLoading(true);
    setPendingSeance(null);
    try {
      const category = normalizeWorkoutCategory(action.category);
      const difficulty = action.difficulty
        ? normalizeDifficulty(action.difficulty)
        : levelToDifficulty(userContextRef.current?.level);
      const muscles: string[] = Array.isArray(action.muscles)
        ? (action.muscles as unknown[]).filter((m): m is string => typeof m === "string")
        : [];

      const lieuTxt = lieu === "maison"
        ? (equip === "halteres" ? " à la maison avec haltères" : " à la maison au poids du corps")
        : " en salle de sport";
      const description = `${action.description || text}${lieuTxt}`.slice(0, 400);
      // Bonus nutrition : créer une séance = pour maintenant (aujourd'hui)
      const nutritionNote = buildNutritionNote();

      const genRes = await aiFetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, difficulty, muscles, nutritionNote }),
      });
      if (!genRes.ok) throw new Error("generation HTTP " + genRes.status);
      const data = await genRes.json();
      if (!data || data.error) throw new Error("generation: " + (data?.error ?? "réponse vide"));

      await verifierPlaces();
      setPendingSeance(assembleSeance({
        title: data.title,
        category,
        difficulty,
        muscles: (Array.isArray(data.muscles) && data.muscles.length > 0) ? data.muscles : muscles,
        rawExercises: Array.isArray(data.exercises) ? data.exercises : [],
      }));
    } catch (e) {
      // Échec de génération : on le DIT, avec le détail (diagnostic temporaire)
      const detail = (e as { message?: string })?.message ?? String(e);
      setMessages((prev) => [...prev, {
        role: "assistant" as const,
        content: `⚠️ Génération séance échouée (${detail})\n(copie-moi ce message stp)`,
        id: uid(),
      }]);
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, pathname, router, preparePlanAction, buildNutritionNote, poserQuestion, verifierPlaces]);

  /* ── Ce qui manque AVANT d'agir ──
     C'est le CODE qui sait de quoi il a besoin, pas le modèle : lui demander
     de retenir nos prérequis marchait mal (il écrivait la question en texte au
     lieu d'appeler l'outil, donc sans réponses à toucher). Ici c'est
     déterministe : si le lieu manque pour une action qui en dépend, la bulle
     du coach EST la question, et la demande d'origine repart après la réponse.
     Sans ça le coach promettrait une carte, puis poserait une question. ── */
  const questionManquante = useCallback((action: AssistantAction, text: string): { texte: string; question: QuestionCliquable } | null => {
    if (!user?.id) return null;
    const besoinDuLieu = action.intent === "create_seance" || action.intent === "plan_set" || action.intent === "plan_regen";
    if (!besoinDuLieu) return null;
    const { location, equip } = readLieu(user.id);
    // La demande est mise de côté : elle repart dès qu'on connaît la réponse,
    // qu'elle soit touchée (puce) ou tapée à la main (outil save_lieu).
    if (!location) {
      attenteRef.current = text;
      return { texte: "Avant de te préparer ça, tu t'entraînes où ?", question: questionLieu(text) };
    }
    if (location === "maison" && !equip) {
      attenteRef.current = text;
      return { texte: "Tu as des haltères à la maison ?", question: questionEquip(text) };
    }
    return null;
  }, [user?.id]);

  /* ── Envoi d'un message ──
     `masque` : le message part au coach mais ne s'affiche pas. Sert aux
     réponses cliquables, déjà visibles sous la forme de la puce cochée. ── */
  const sendMessage = useCallback(async (text: string, masque?: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    void ensureContext();

    const userMsg: AssistantMsg = { role: "user", content: trimmed, id: uid(), ...(masque ? { masque: true } : {}) };
    const assistantId = uid();
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", id: assistantId, streaming: true }]);
    setIsStreaming(true);

    /* Il y avait ici un compteur de messages dans le localStorage, qui bloquait
       à 12/jour. Il est retiré : le plafond réel est tenu par `garderIA` dans
       /api/chat (5/jour en gratuit, la valeur qu'annonce /premium), et
       `messageDeRefus` rend plus bas le message du serveur. Ce compteur-ci
       annonçait donc un chiffre faux, refusait avant même d'avoir demandé au
       serveur, et se remettait à zéro en vidant son navigateur : il ne
       protégeait rien et contredisait la page qui vend l'abonnement. */

    /* Le lieu d'entraînement n'est plus DEVINÉ ici. Deux regex tentaient de
       reconnaître qu'un message répondait à la question du tour précédent
       (`coachAskedLieu` + `sniffLieu`), avec les faux positifs que ça suppose.
       Désormais la question est posée en puces : un clic donne une réponse
       structurée, et si l'utilisateur préfère taper, le coach dispose de
       l'outil save_lieu. Plus rien à deviner. */

    // Mémoire long terme uniquement (l'action, elle, est décidée côté serveur
    // dans le même aller-retour que le texte). ⚠️ Mistral palier gratuit =
    // 1 req/s, et /api/chat en consomme désormais DEUX à la suite
    // (l'aiguilleur puis le coach) : on décale d'autant cet appel secondaire,
    // dont rien à l'écran ne dépend, pour lui laisser la voie libre.
    const recentContext = messages
      .slice(-4)
      .map((m) => `${m.role === "user" ? "Utilisateur" : "Coach"}: ${m.content}`)
      .join("\n");
    setTimeout(() => { void extractMemory(trimmed, recentContext); }, 2500);

    // On n'envoie que les derniers échanges au modèle (limite la taille de requête
    // → évite le 413 « request too large » sur les longues conversations).
    const history = [...messages, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));

    try {
      const abort = new AbortController();
      abortRef.current = abort;
      const res = await aiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          userContext: userContextRef.current,
          pseudo: user?.pseudo,
          liveStats: liveStatsRef.current,
          richProfile: richProfileRef.current,
          currentPage: pathname,
          memories: memoriesRef.current,
          memoryEnabled: true,
          // Lieu connu → le chat ne redemande pas « salle ou maison ? »
          lieu: user?.id ? (localStorage.getItem(`vaiiya_lieu_${user.id}`) || null) : null,
          lieu_equip: user?.id ? (localStorage.getItem(`vaiiya_lieu_equip_${user.id}`) || null) : null,
        }),
        signal: abort.signal,
      });

      // Refus de quota ou de session : la réponse est un JSON, pas le flux
      // NDJSON. Sans ce filet, la boucle de lecture ci-dessous ne trouverait
      // ni `t` ni `a` et laisserait une bulle vide à l'écran.
      const refus = await messageDeRefus(res);
      if (refus) {
        setMessages((prev) => {
          const next = prev.map((m) => m.id === assistantId
            ? { ...m, content: refus, streaming: false } : m);
          persist(next);
          return next;
        });
        return;
      }

      if (!res.body) throw new Error("No response body");

      /* ── Lecture du flux NDJSON ──
         Une ligne = un événement : `t` un morceau de texte, `a` l'action
         décidée dans le MÊME tour, `e` une erreur. Une ligne illisible est
         traitée comme du texte brut (filet pour les réponses en clair). */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let action: AssistantAction | null = null;

      const lire = (raw: string) => {
        const l = raw.trim();
        if (!l) return;
        if (l[0] !== "{") { accumulated += l; return; }
        try {
          const ev = JSON.parse(l) as ChatEvent;
          if ("t" in ev) accumulated += ev.t;
          else if ("a" in ev && ev.a?.intent) action = ev.a;
          else if ("e" in ev) accumulated += `\n⚠️ ${ev.e}`;
        } catch { accumulated += l; }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lignes = buffer.split("\n");
        buffer = lignes.pop() ?? "";
        for (const l of lignes) lire(l);
        // `accumulated` reste BRUT (les tags historiques sont relus plus bas) :
        // on ne nettoie que ce qui s'affiche, sinon une balise clignoterait le
        // temps d'un chunk.
        const enCours = sansBalises(accumulated).replace(BALISE_EN_COURS, "");
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: enCours, streaming: true } : m));
      }
      if (buffer) lire(buffer);

      // Filets pour les anciens tags : ils ne devraient plus arriver (le coach
      // appelle open_page / save_lieu), mais un modèle peut encore en écrire un.
      const lieuMatch = accumulated.match(/\[LIEU_UPDATE\]\s*(salle|maison)\s*\[\/LIEU_UPDATE\]/i);
      if (lieuMatch && user?.id) {
        void persistLieu(user.id, { location: lieuMatch[1].toLowerCase() as "salle" | "maison" });
      }

      let cleaned = stripMemoryTags(accumulated)
        .replace(/\[PROGRAMME_UPDATE\][\s\S]*?\[\/PROGRAMME_UPDATE\]/gi, "")
        .replace(/\[LIEU_UPDATE\][\s\S]*?\[\/LIEU_UPDATE\]/gi, "")
        .replace(/\[NAV\][\s\S]*?\[\/NAV\]/gi, "");
      // Les balises ci-dessus emportent leur contenu (c'était de la donnée) ;
      // celles que le modèle invente encadrent une vraie phrase, on garde donc
      // le texte et on ne retire que les crochets.
      cleaned = sansBalises(cleaned).trim();

      // `action` n'est renseignée que dans une closure : TypeScript ne suit pas
      // cette affectation et la croit toujours nulle. Le cast rétablit son vrai
      // type pour les branches ci-dessous.
      const recue = action as AssistantAction | null;

      // Une information nous manque pour agir → la bulle EST la question, et
      // l'action attend. Le coach ne promet donc jamais une carte qu'il ne
      // peut pas encore préparer.
      const manque = recue ? questionManquante(recue, trimmed) : null;
      let questionAttachee: QuestionCliquable | undefined;

      if (manque) {
        cleaned = manque.texte;
        questionAttachee = manque.question;
      } else if (recue) {
        // Question posée par le modèle lui-même : la bulle DOIT être cette
        // question et pas la phrase du coach, sinon les puces répondraient à
        // autre chose que ce qui est écrit au-dessus d'elles.
        if (recue.intent === "ask_choice") {
          const choix = normaliserChoix(recue.choix);
          if (choix.length >= 2) {
            questionAttachee = { choix, genre: "libre" };
            cleaned = phraseDeRepli(recue);
          }
        }
        // Filet : le coach parle normalement sur ces tours depuis que la
        // décision d'action est sortie de son prompt, mais un flux coupé ou
        // un refus laisserait une bulle vide.
        if (!cleaned) cleaned = phraseDeRepli(recue);
      }

      // Ni texte ni action : ça ne doit JAMAIS passer inaperçu. Une version
      // précédente supprimait la bulle vide, du coup l'utilisateur envoyait un
      // message et il ne se passait rien du tout, sans la moindre explication.
      if (!cleaned) cleaned = "Je n'ai pas réussi à répondre à ce message 😕 Réessaie, ou reformule-le autrement.";

      setMessages((prev) => {
        const next = prev.map((m) => m.id === assistantId
          ? { ...m, content: cleaned, streaming: false, ...(questionAttachee ? { question: questionAttachee } : {}) }
          : m);
        persist(next);
        return next;
      });

      // L'action ne part que si rien ne manque. Sinon elle repartira toute
      // seule après la réponse (`relance`).
      if (recue && !manque) void runAction(recue, trimmed);

      const navMatch = accumulated.match(/\[NAV\]\s*([^[\]]+?)\s*\[\/NAV\]/i);
      if (navMatch) {
        const route = resolveNavTarget(navMatch[1]);
        if (route && route !== pathname) setTimeout(() => router.push(route), 700);
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? { ...m, content: "Désolé, une erreur est survenue. Réessaie ✨", streaming: false } : m));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, user, pathname, router, ensureContext, persist, extractMemory, runAction, questionManquante]);

  // `runAction` relance une demande mise en attente sans dépendre de
  // `sendMessage`, défini après lui (et qui dépend de lui).
  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

  /* ── Réponse à une question cliquable ──
     La puce touchée reste affichée, cochée ; les autres disparaissent. On ne
     crée PAS de bulle utilisateur : la réponse est déjà lisible sur la puce,
     l'écrire une seconde fois dirait deux fois la même chose. Le coach, lui,
     reçoit bien la réponse (message masqué).

     Pour le lieu, la réponse est ENREGISTRÉE avant de relancer : le coach du
     tour suivant le connaît déjà et ne repose pas la question. C'est ce qui
     remplace les anciennes regex qui devinaient. ── */
  const repondreQuestion = useCallback((msgId: string, choix: string) => {
    if (isStreaming) return;
    const cible = messages.find((m) => m.id === msgId);
    const q = cible?.question;
    if (!q || q.repondu) return; // on ne répond qu'une fois

    setMessages((prev) => {
      const next = prev.map((m) => m.id === msgId && m.question
        ? { ...m, question: { ...m.question, repondu: choix } }
        : m);
      persist(next);
      return next;
    });

    const relance = q.relance ?? "";

    if (q.genre === "lieu" && user?.id) {
      const location = /salle/i.test(choix) ? "salle" : "maison";
      void persistLieu(user.id, { location });
      // Une seule question à la fois : le matériel n'arrive qu'ICI, une fois
      // le lieu connu, et jamais en même temps que la première question.
      if (location === "maison" && !readLieu(user.id).equip) {
        setMessages((prev) => [...prev, {
          role: "assistant" as const, content: "Tu as des haltères à la maison ?", id: uid(),
          question: questionEquip(relance),
        }]);
        return;
      }
      attenteRef.current = null;
      if (relance) sendMessage(relance, true);
      return;
    }

    if (q.genre === "equip" && user?.id) {
      void persistLieu(user.id, { equip: /halt/i.test(choix) ? "halteres" : "poids" });
      attenteRef.current = null;
      if (relance) sendMessage(relance, true);
      return;
    }

    // Question libre du coach : sa réponse repart telle quelle.
    sendMessage(choix, true);
  }, [messages, isStreaming, user?.id, persist, sendMessage]);

  /* ── Contrôles ── */
  const open = useCallback((prefill?: string) => {
    setIsOpen(true);
    void ensureContext();
    if (prefill && prefill.trim()) sendMessage(prefill);
  }, [ensureContext, sendMessage]);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const clear = useCallback(() => {
    setMessages([]);
    if (historyKey) {
      try { sessionStorage.removeItem(historyKey); } catch { /* ignore */ }
      try { localStorage.removeItem(historyKey); } catch { /* ignore */ }
    }
  }, [historyKey]);

  /* ── Ranger une séance dans la bibliothèque ──
     Sortie de `confirmSeance` parce qu'elle sert aussi APRÈS coup : une séance
     lancée depuis la carte n'est enregistrée nulle part, et le tunnel propose
     de la garder une fois terminée (même carte « Tu la gardes ? » que l'impro).
     Sans ça, on jette le travail à l'instant où il vient de faire ses preuves. */
  const garderSeance = useCallback(async (s: ProposedSeance): Promise<boolean> => {
    if (!user?.id) return false;
    // Filet : le plafond gratuit se voit déjà sur la carte, mais une séance
    // lancée puis gardée en fin de tunnel repasse par ici longtemps après.
    if (await verifierPlaces()) return false;
    const { error } = await createClient().from("custom_sessions").insert(seanceToRow(s, user.id));
    return !error;
  }, [user?.id, verifierPlaces]);

  /* ── Validation de la carte séance ──
     Une SEULE validation fait tout : la séance rejoint la bibliothèque, et si
     un jour a été choisi sur la carte, elle est posée dessus dans la foulée
     (liée par `sessionId`, même plomberie que « poser une séance de la
     biblio »). Avant, il fallait créer, PUIS répondre à une deuxième carte qui
     demandait quand la faire — deux cartes pour une seule intention. ── */
  const confirmSeance = useCallback(async (jour?: string | null) => {
    if (!user?.id || !pendingSeance) return;
    const s = pendingSeance;
    if (await verifierPlaces()) {
      setMemoryNotice(`Tes ${PLANS.free.limits.sessionsMax} séances gardées sont prises. Libère une place, ou passe en Premium.`);
      return;
    }
    const ok = await garderSeance(s);
    if (!ok) { setMemoryNotice("Oups, impossible de garder la séance."); return; }

    if (!jour) {
      setPendingSeance(null);
      setMemoryNotice(`« ${s.title} » est dans tes séances ✓`);
      return;
    }

    const category = normalizeWorkoutCategory(s.category);
    const saved = readLieu(user.id);
    try {
      await saveDay(user.id, {
        date: jour,
        type: PLANNING_TYPE_BY_CATEGORY[category] ?? "Force",
        title: s.title,
        difficulty: normalizeDifficulty(s.difficulty),
        location: ctxFromLieu(saved.location, saved.equip),
        exerciseList: normalizeExercises(s.exerciseList),
        sessionId: s.id,
        status: "planned",
      });
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date: jour } }));
      setPendingSeance(null);
      setMemoryNotice(`Gardée et programmée · ${dayLabelLong(jour)} ✓`);
      setTimeout(() => setIsOpen(false), 1100);
    } catch {
      // La séance EST gardée : on ne fait pas croire l'inverse, on ne signale
      // que ce qui a raté.
      setPendingSeance(null);
      setMemoryNotice("Gardée, mais impossible de la programmer.");
    }
  }, [user?.id, pendingSeance, garderSeance, verifierPlaces]);

  const cancelSeance = useCallback(() => setPendingSeance(null), []);

  /* ── Les 7 prochains jours, avec ce qui y est déjà prévu ──
     Le choix « quand ? » doit dire ce qu'il va écraser AVANT le clic, et ne
     jamais proposer un jour passé ni une séance déjà faite. ── */
  const chargerJours = useCallback(async (): Promise<JourDispo[]> => {
    if (!user?.id) return [];
    const dates = prochainsJours(7);
    let map: Record<string, PlanningDay> = {};
    try { map = await fetchRange(user.id, dates); } catch { /* planning illisible → jours nus */ }
    return dates.map((d, i) => ({
      ymd: d,
      label: i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : CAP(dayLabel(d)).slice(0, 3) + ". " + Number(d.slice(8)),
      occupe: hasSeance(map[d]) ? dayTitle(map[d]) : null,
      bloque: map[d]?.status === "done",
    }));
  }, [user?.id]);

  /* ── Changer le jour visé par une carte planning ──
     Les exercices ne bougent pas, seule la date change : régénérer une séance
     parce qu'on la décale d'un jour serait absurde (et coûterait un appel IA).
     Le déplacement garde son jour de départ, qui reste libéré. ── */
  const retargetPlan = useCallback((ymd: string) => {
    setPendingPlan((prev) => {
      if (!prev || !prev.preview) return prev;
      const cible = prev.preview.date;
      const writes = prev.writes
        .map((w) => (w.date === cible ? { ...w, date: ymd } : w))
        // Un déplacement écrit AUSSI un « Repos » sur le jour de départ. Si on
        // ramène la séance sur ce jour-là, les deux écritures viseraient la même
        // date et le Repos, écrit en dernier, effacerait la séance.
        .filter((w, i, all) => all.findIndex((x) => x.date === w.date) === i);
      const preview = { ...prev.preview, date: ymd };
      // Le libellé doit suivre : il nomme le jour et ce qu'on y remplace. On ne
      // connaît pas encore le contenu du nouveau jour → on repart d'un « à la
      // place de » vide, la carte le redira à la validation.
      return { ...prev, ...texteCartePlan(preview, null), writes, preview };
    });
  }, []);

  /* ── Validation de la carte planning : écrit les jours en base (aucune écriture sans clic) ── */
  const confirmPlan = useCallback(async (garderAussi?: boolean) => {
    if (!user?.id || !pendingPlan) return;
    try {
      for (const w of pendingPlan.writes) await saveDay(user.id, w);
      // On transporte la date de destination → le planning saute sur la bonne
      // semaine/jour pour que la modif soit visible (même en semaine suivante).
      const focusDate = pendingPlan.preview?.date ?? pendingPlan.writes[0]?.date ?? null;
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date: focusDate } }));

      // « La garder aussi » : la séance générée pour ce jour rejoint la
      // bibliothèque, sinon elle n'existerait QUE sur cette case du planning.
      let gardee = false;
      const p = pendingPlan.preview;
      if (garderAussi && p && p.exerciseList.length > 0) {
        const seance = assembleSeance({
          title: p.title || pendingPlan.title,
          category: normalizeWorkoutCategory(p.type),
          difficulty: normalizeDifficulty(p.difficulty),
          muscles: [],
          rawExercises: p.exerciseList,
        });
        const { error } = await createClient().from("custom_sessions").insert(seanceToRow(seance, user.id));
        gardee = !error;
      }
      setPendingPlan(null);
      setMemoryNotice(gardee ? "Planning mis à jour, séance gardée ✓" : "Planning mis à jour ✓");
      setTimeout(() => setIsOpen(false), 900);
    } catch {
      setMemoryNotice("Oups, impossible de mettre à jour le planning.");
    }
  }, [user?.id, pendingPlan]);

  const cancelPlan = useCallback(() => setPendingPlan(null), []);

  /* ── Validation de la recette : la logge dans les repas du jour (même
     plomberie que la nutrition — une portion, macros de la recette). ── */
  const confirmRecipe = useCallback(async () => {
    if (!user?.id || !pendingRecipe) return;
    const supabase = createClient();
    const now = new Date();
    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id,
      date: now.toISOString().slice(0, 10),
      meal_type: "dejeuner",
      food_name: pendingRecipe.nom,
      description: null,
      calories: pendingRecipe.calories,
      proteins: pendingRecipe.proteins,
      carbs: pendingRecipe.carbs,
      fats: pendingRecipe.fats,
      has_photo: false,
      time: now.toTimeString().slice(0, 8),
    });
    if (error) { setMemoryNotice("Oups, impossible d'ajouter le repas."); return; }
    const nom = pendingRecipe.nom;
    setPendingRecipe(null);
    setMemoryNotice(`« ${nom} » ajouté à tes repas ✓`);
    setTimeout(() => { setIsOpen(false); router.push("/nutrition"); }, 900);
  }, [user?.id, pendingRecipe, router]);

  const cancelRecipe = useCallback(() => setPendingRecipe(null), []);

  /* ── Validation d'un repas raconté : l'écrit dans le journal du jour (même
     plomberie que la nutrition — le moment déduit, les macros estimées). ── */
  const confirmMeal = useCallback(async () => {
    if (!user?.id || !pendingMeal) return;
    const supabase = createClient();
    const now = new Date();
    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id,
      date: now.toISOString().slice(0, 10),
      meal_type: pendingMeal.mealType,
      food_name: pendingMeal.foodName,
      description: null,
      calories: pendingMeal.calories,
      proteins: pendingMeal.proteins,
      carbs: pendingMeal.carbs,
      fats: pendingMeal.fats,
      has_photo: false,
      time: now.toTimeString().slice(0, 8),
    });
    if (error) { setMemoryNotice("Oups, impossible d'ajouter le repas."); return; }
    const nom = pendingMeal.foodName;
    setPendingMeal(null);
    setMemoryNotice(`« ${nom} » ajouté à tes repas ✓`);
    setTimeout(() => { setIsOpen(false); router.push("/nutrition"); }, 900);
  }, [user?.id, pendingMeal, router]);

  const cancelMeal = useCallback(() => setPendingMeal(null), []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // La notice mémoire ("Je m'en souviendrai") s'efface seule
  useEffect(() => {
    if (!memoryNotice) return;
    const t = setTimeout(() => setMemoryNotice(null), 3400);
    return () => clearTimeout(t);
  }, [memoryNotice]);

  return (
    <Ctx.Provider value={{ isOpen, open, close, toggle, clear, messages, isStreaming, sendMessage, repondreQuestion, pseudo: user?.pseudo, memoryNotice, pendingSeance, pendingPlan, pendingRecipe, pendingMeal, actionLoading, bibliothequePleine, confirmSeance, garderSeance, cancelSeance, confirmPlan, retargetPlan, cancelPlan, chargerJours, confirmRecipe, cancelRecipe, confirmMeal, cancelMeal }}>
      {children}
    </Ctx.Provider>
  );
}
