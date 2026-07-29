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
import { phraseDeRepli, type AssistantAction, type ChatEvent } from "@/lib/assistantTools";
import {
  resolveWhen, dayLabelLong, dayTitle, fetchDay, fetchRange, hasSeance, saveDay,
  ctxFromLieu, readLieu, persistLieu, readVariant, weekDates, todayYmd, normalizeExercises, previewWeek,
  PLANNING_TYPE_BY_CATEGORY, type PlanningDay, type GenInput,
} from "@/lib/planning";

type MemoryAction =
  | { type: "save"; category?: string; fact?: string }
  | { type: "forget"; keywords?: string }
  | { type: "none" };

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

/** Changement de planning proposé par l'IA, en attente de confirmation. */
type PendingPlan = {
  title: string;            // titre de la carte (nom de la séance ou jour déplacé)
  summary: string;          // ligne contexte ("📅 vendredi 20 juin · à la maison")
  writes: PlanningDay[];    // jours à écrire en base à la confirmation
  preview: PlanningDay | null; // jour dont on prévisualise les exercices
};

export type AssistantMsg = {
  role: "user" | "assistant";
  content: string;
  id: string;
  streaming?: boolean;
  /** Data URL d'une image jointe (messages user). Non persistée (trop lourde). */
  image?: string;
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
  sendMessage: (text: string, image?: string) => void;
  pseudo?: string;
  memoryNotice: string | null;
  pendingSeance: ProposedSeance | null;
  pendingPlan: PendingPlan | null;
  pendingRecipe: PendingRecipe | null;
  pendingMeal: PendingMeal | null;
  /** Séance qui vient d'être créée : on demande quand la faire (jour) ou de la lancer tout de suite. */
  pendingCreated: ProposedSeance | null;
  actionLoading: boolean;
  confirmSeance: () => void;
  cancelSeance: () => void;
  scheduleCreated: (when: string) => void;
  dismissCreated: () => void;
  confirmPlan: () => void;
  cancelPlan: () => void;
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
const todayISODate = () => new Date().toISOString().slice(0, 10);

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

/** Repère un lieu d'entraînement / du matériel mentionné dans un message libre. */
function sniffLieu(text: string): { location?: "salle" | "maison"; equip?: "halteres" | "poids" } {
  const t = (text || "").toLowerCase();
  const out: { location?: "salle" | "maison"; equip?: "halteres" | "poids" } = {};
  if (/salle|\bgym\b|basic\s*fit|fitness\s*park/.test(t)) out.location = "salle";
  else if (/maison|chez\s*moi|domicile|appart|sans\s*mat|poids\s*du\s*corps|halt[èe]re/.test(t)) out.location = "maison";
  if (/halt[èe]re|dumbbell|kettlebell|\bbanc\b|\bbarre\b/.test(t)) out.equip = "halteres";
  else if (/poids\s*du\s*corps|sans\s*mat[ée]riel|sans\s*rien|au\s*poids/.test(t)) out.equip = "poids";
  return out;
}

/** Le dernier message du coach demandait-il le lieu / le matériel ? (→ le message
 *  suivant de l'utilisateur est une RÉPONSE au lieu, on peut l'enregistrer). */
function coachAskedLieu(messages: { role: string; content: string }[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "assistant")?.content?.toLowerCase() ?? "";
  return /salle ou maison|maison ou (?:à la )?salle|halt[èe]re|poids du corps|o[ùu] tu t'entra[îi]n/.test(last);
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
  const [pendingCreated, setPendingCreated] = useState<ProposedSeance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userContextRef = useRef<UserContext | null>(null);
  const liveStatsRef = useRef<LiveStats | null>(null);
  const richProfileRef = useRef<Record<string, unknown> | null>(null);
  const memoriesRef = useRef<AiMemory[]>([]);
  const dataLoadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

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
      // On ne persiste PAS les data URLs d'images (base64 lourd → quota
      // sessionStorage explosé). Le fil garde le texte ; l'image ne vit que
      // le temps de la session en mémoire.
      const clean = msgs.slice(-60).map(({ image: _img, ...m }) => ({ ...m, streaming: false }));
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

    const today = todayISODate();
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

  /* ── Action PLANNING (Phase 2) : prépare une carte de confirmation.
     Aucune écriture en base ici — tout passe par confirmPlan() (clic). ── */
  const preparePlanAction = useCallback(async (action: AssistantAction) => {
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
      setPendingPlan({
        title: dayTitle(src),
        summary: `📅 ${dayLabelLong(from)} → ${dayLabelLong(to)}`,
        writes: [movedDay, restDay],
        preview: movedDay,
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
        // Lieu incomplet. Le coach est censé poser la question AVANT d'appeler
        // l'outil ; s'il ne l'a pas fait, on la pose ici plutôt que de rester
        // muet sur une promesse (« je te prépare ça » suivi de rien).
        say(!saved.location
          ? "Tu t'entraînes en salle ou à la maison cette semaine ? 💪"
          : "Tu as des haltères à la maison, ou je te fais tout au poids du corps ? 💪");
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
        title: "Nouvelle semaine ✦",
        summary: `📅 dès aujourd'hui · ${nbSeances} séance${nbSeances > 1 ? "s" : ""}${adjustLabel}`,
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
      setPendingPlan({
        title: row.title,
        summary: `📅 ${dayLabelLong(day)} · depuis ta bibliothèque`,
        writes: [libDay],
        preview: libDay,
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
    if (action.intent === "plan_location") {
      const existing = await fetchDay(user.id, when);
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

      const locTxt = location === "maison" ? "à la maison" : "en salle";
      setPendingPlan({
        title: seance.title,
        summary: `📅 ${dayLabelLong(when)} · ${locTxt}`,
        writes: [day],
        preview: day,
      });
    } catch (e) {
      const detail = (e as { message?: string })?.message ?? String(e);
      say(`⚠️ Modification du planning échouée — ${detail}`);
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, buildNutritionNote]);

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
  const runAction = useCallback(async (action: AssistantAction, text: string, coachAParle: boolean) => {
    if (!user?.id || !action?.intent) return;

    // Réponse courte du coach dans le fil (aucune impasse muette).
    const say = (content: string) => setMessages((prev) => [...prev, { role: "assistant" as const, content, id: uid() }]);

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
      // Le coach parle et agit dans le même tour : s'il a déjà annoncé le
      // changement, on n'ajoute pas une deuxième bulle qui dit la même chose.
      if (coachAParle) return;
      const motTheme =
        pref === "dark" ? "C'est passé en sombre ✦"
        : pref === "light" ? "Retour en clair ✦"
        : "Thème réglé sur automatique, il suivra ton téléphone ✦";
      setMessages((prev) => [...prev, { role: "assistant" as const, content: motTheme, id: uid() }]);
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
      void preparePlanAction(action);
      return;
    }

    // 2b) Création d'une séance réutilisable (bibliothèque) → génération + carte
    if (action.intent !== "create_seance") return;

    // Le lieu conditionne le contenu de la séance (machines vs poids du corps).
    // Le prompt demande au coach de poser la question AVANT d'appeler l'outil ;
    // s'il l'appelle quand même, on ne reste plus MUET (c'était le bug : la
    // phrase promettait une carte qui n'arrivait jamais), on pose la question.
    let lieu: string | null = null;
    try { lieu = localStorage.getItem(`vaiiya_lieu_${user.id}`); } catch { /* ignore */ }
    if (!lieu) {
      const blob = text.toLowerCase();
      if (/maison|chez\s*moi|domicile|sans\s*mat|halt[èe]re|poids\s*du\s*corps/.test(blob)) lieu = "maison";
      else if (/salle|gym|basic\s*fit/.test(blob)) lieu = "salle";
    }
    if (!lieu) {
      say("Avant de te la préparer : tu t'entraînes en salle ou à la maison ? 💪");
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

      let equip: string | null = null;
      try { equip = localStorage.getItem(`vaiiya_lieu_equip_${user.id}`); } catch { /* ignore */ }
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
  }, [user?.id, pathname, router, preparePlanAction, buildNutritionNote]);

  /* ── Envoi d'un message (avec image optionnelle → vision) ── */
  const sendMessage = useCallback(async (text: string, image?: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || isStreaming) return;

    void ensureContext();

    const userMsg: AssistantMsg = { role: "user", content: trimmed, id: uid(), ...(image ? { image } : {}) };
    const assistantId = uid();
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", id: assistantId, streaming: true }]);
    setIsStreaming(true);

    // Limite quotidienne (comptes gratuits) — admin/premium illimité
    const isUnlimited = !!(user?.is_admin || user?.is_premium);
    if (!isUnlimited && user) {
      const dayKey = `vaiiya_ai_count_${user.id}_${todayISODate()}`;
      const count = parseInt(localStorage.getItem(dayKey) || "0") || 0;
      if (count >= 12) {
        setMessages((prev) => prev.map((m) => m.id === assistantId
          ? { ...m, content: "🚀 Tu as atteint ta limite gratuite de 12 messages/jour. Passe au plan supérieur pour un coach illimité — je t'emmène voir les offres…", streaming: false }
          : m));
        setIsStreaming(false);
        setTimeout(() => router.push("/premium"), 1900);
        return;
      }
      try { localStorage.setItem(dayKey, String(count + 1)); } catch { /* ignore */ }
    }

    // ── Réponse au LIEU d'entraînement ──
    // Si le coach venait de demander le lieu (salle/maison) ou le matériel et que
    // l'utilisateur y répond, on l'enregistre TOUT DE SUITE (persistLieu écrit le
    // localStorage de façon synchrone) : le coach de CE tour le connaît déjà et
    // ne reboucle plus sur la question, et la génération de séance/semaine peut
    // s'y fier. Scopé à une vraie réponse (le coach vient de poser la question)
    // pour éviter les faux positifs — un « je mange à la maison » ne change pas
    // le lieu d'entraînement. (Le tag [LIEU_UPDATE] du chat restait en retard d'un tour.)
    if (user?.id && trimmed && coachAskedLieu(messages)) {
      const sn = sniffLieu(trimmed);
      if (sn.location || sn.equip) {
        void persistLieu(user.id, {
          ...(sn.location ? { location: sn.location } : {}),
          ...(sn.equip ? { equip: sn.equip } : {}),
        });
      }
    }

    // Mémoire long terme uniquement (l'action, elle, vient du même appel que
    // le texte). ⚠️ Mistral palier gratuit = 1 req/s : on décale cet appel
    // secondaire pour qu'il n'entre pas en collision avec le chat, qui reste
    // prioritaire. Rien de visible n'en dépend.
    const recentContext = messages
      .slice(-4)
      .map((m) => `${m.role === "user" ? "Utilisateur" : "Coach"}: ${m.content}`)
      .join("\n");
    setTimeout(() => { void extractMemory(trimmed, recentContext); }, 1200);

    // On n'envoie que les derniers échanges au modèle (limite la taille de requête
    // → évite le 413 « request too large » de Groq sur les longues conversations).
    // Un message user porteur d'une image devient un contenu multimodal
    // (texte + image_url) que le modèle vision sait lire.
    const history = [...messages, userMsg].slice(-10).map((m) => {
      if (m.role === "user" && m.image) {
        return {
          role: m.role,
          content: [
            ...(m.content ? [{ type: "text" as const, text: m.content }] : [{ type: "text" as const, text: "Regarde cette image." }]),
            { type: "image_url" as const, image_url: { url: m.image } },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

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
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated, streaming: true } : m));
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
        .replace(/\[NAV\][\s\S]*?\[\/NAV\]/gi, "")
        .trim();

      // Le coach a agi sans écrire un mot : plutôt qu'une bulle vide suivie
      // d'une carte, on met la phrase qui correspond à l'action. Elle en est
      // déduite, donc elle ne peut pas la contredire.
      if (!cleaned && action) cleaned = phraseDeRepli((action as AssistantAction).intent);

      setMessages((prev) => {
        const next = prev
          .map((m) => m.id === assistantId ? { ...m, content: cleaned, streaming: false } : m)
          .filter((m) => m.content !== "" || m.role === "user");
        persist(next);
        return next;
      });

      if (action) void runAction(action, trimmed, !!cleaned);

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
  }, [messages, isStreaming, user, pathname, router, ensureContext, persist, extractMemory, runAction]);

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

  /* ── Validation de la carte : crée réellement la séance dans custom_sessions ── */
  const confirmSeance = useCallback(async () => {
    if (!user?.id || !pendingSeance) return;
    const supabase = createClient();
    const { error } = await supabase.from("custom_sessions").insert(seanceToRow(pendingSeance, user.id));
    if (error) { setMemoryNotice("Oups, impossible de créer la séance."); return; }
    // La séance existe désormais dans la bibliothèque. Au lieu de la « perdre »
    // dans /progression, on enchaîne : on demande QUAND la faire (un jour du
    // planning) ou de la LANCER tout de suite. La carte de suite s'affiche.
    const created = pendingSeance;
    setPendingSeance(null);
    setMemoryNotice(`Séance « ${created.title} » créée ✓`);
    setPendingCreated(created);
  }, [user?.id, pendingSeance]);

  const cancelSeance = useCallback(() => setPendingSeance(null), []);

  /* ── Suite de création : programmer la séance sur un jour du planning.
     On copie la séance créée sur le jour cible (liée via sessionId) — même
     plomberie que « poser une séance de la biblio ». ── */
  const scheduleCreated = useCallback(async (whenRaw: string) => {
    if (!user?.id || !pendingCreated) return;
    const day = resolveWhen(whenRaw);
    if (!day) return;
    const s = pendingCreated;
    const category = normalizeWorkoutCategory(s.category);
    const saved = readLieu(user.id);
    const planningDay: PlanningDay = {
      date: day,
      type: PLANNING_TYPE_BY_CATEGORY[category] ?? "Force",
      title: s.title,
      difficulty: normalizeDifficulty(s.difficulty),
      location: ctxFromLieu(saved.location, saved.equip),
      exerciseList: normalizeExercises(s.exerciseList),
      sessionId: s.id,
      status: "planned",
    };
    try {
      await saveDay(user.id, planningDay);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date: day } }));
      setPendingCreated(null);
      setMemoryNotice(`Programmée · ${dayLabelLong(day)} ✓`);
      setTimeout(() => setIsOpen(false), 1100);
    } catch {
      setMemoryNotice("Oups, impossible de programmer la séance.");
    }
  }, [user?.id, pendingCreated]);

  const dismissCreated = useCallback(() => setPendingCreated(null), []);

  /* ── Validation de la carte planning : écrit les jours en base (aucune écriture sans clic) ── */
  const confirmPlan = useCallback(async () => {
    if (!user?.id || !pendingPlan) return;
    try {
      for (const w of pendingPlan.writes) await saveDay(user.id, w);
      // On transporte la date de destination → le planning saute sur la bonne
      // semaine/jour pour que la modif soit visible (même en semaine suivante).
      const focusDate = pendingPlan.preview?.date ?? pendingPlan.writes[0]?.date ?? null;
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date: focusDate } }));
      setPendingPlan(null);
      setMemoryNotice("Planning mis à jour ✓");
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
    <Ctx.Provider value={{ isOpen, open, close, toggle, clear, messages, isStreaming, sendMessage, pseudo: user?.pseudo, memoryNotice, pendingSeance, pendingPlan, pendingRecipe, pendingMeal, pendingCreated, actionLoading, confirmSeance, cancelSeance, scheduleCreated, dismissCreated, confirmPlan, cancelPlan, confirmRecipe, cancelRecipe, confirmMeal, cancelMeal }}>
      {children}
    </Ctx.Provider>
  );
}
