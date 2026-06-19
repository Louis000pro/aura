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
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { resolveNavTarget } from "@/lib/siteKnowledge";
import { normalizeForDedupe, stripMemoryTags, normalizeCategory, type AiMemory } from "@/lib/aiMemory";
import { assembleSeance, seanceToRow, normalizeCategory as normalizeWorkoutCategory, normalizeDifficulty, levelToDifficulty, type ProposedSeance } from "@/lib/assistantActions";
import {
  resolveWhen, dayLabelLong, dayTitle, fetchDay, fetchRange, hasSeance, saveDay,
  ctxFromLieu, readLieu, weekDates, todayYmd,
  PLANNING_TYPE_BY_CATEGORY, type PlanningDay,
} from "@/lib/planning";

type MemoryAction =
  | { type: "save"; category?: string; fact?: string }
  | { type: "forget"; keywords?: string }
  | { type: "none" };

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
};

interface UserContext {
  pseudo?: string; age?: string; height?: string; weight?: string;
  gender?: string; goals?: string[]; level?: string; sessionsPerWeek?: string;
  mealsPerDay?: string; diet?: string; skipped?: boolean;
}
interface LiveStats {
  calories?: number; proteins?: number; streak?: number;
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
  pseudo?: string;
  memoryNotice: string | null;
  pendingSeance: ProposedSeance | null;
  pendingPlan: PendingPlan | null;
  actionLoading: boolean;
  confirmSeance: () => void;
  cancelSeance: () => void;
  confirmPlan: () => void;
  cancelPlan: () => void;
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
  const [actionLoading, setActionLoading] = useState(false);

  const userContextRef = useRef<UserContext | null>(null);
  const liveStatsRef = useRef<LiveStats | null>(null);
  const richProfileRef = useRef<Record<string, unknown> | null>(null);
  const memoriesRef = useRef<AiMemory[]>([]);
  const dataLoadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Historique persistant (par utilisateur) ── */
  const historyKey = user?.id ? `aura_coach_history_${user.id}` : null;
  useEffect(() => {
    if (!historyKey || typeof window === "undefined") { setMessages([]); return; }
    try {
      const raw = localStorage.getItem(historyKey);
      setMessages(raw ? JSON.parse(raw) : []);
    } catch { setMessages([]); }
  }, [historyKey]);

  const persist = useCallback((msgs: AssistantMsg[]) => {
    if (!historyKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(historyKey, JSON.stringify(msgs.slice(-60).map((m) => ({ ...m, streaming: false }))));
    } catch { /* ignore */ }
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

    liveStatsRef.current = {
      calories: Math.round(totalCalories),
      proteins: Math.round(totalProteins),
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
  const preparePlanAction = useCallback(async (action: {
    intent?: string; when?: string; to?: string; location?: string;
    muscles?: unknown; category?: string; description?: string;
  }) => {
    if (!user?.id) return;

    // DÉPLACEMENT : pas de génération, on copie la séance vers le jour cible
    // et on libère (Repos) le jour source. Aucun échec silencieux : chaque
    // impasse renvoie un message clair (sinon « la carte ne s'ouvre pas »).
    if (action.intent === "plan_move") {
      const to = action.to ? resolveWhen(action.to) : null;
      if (!to) {
        setMessages((prev) => [...prev, { role: "assistant" as const, content: "Vers quel jour veux-tu déplacer la séance ? (par ex. « demain », « dans 2 jours » ou « vendredi ») 📅", id: uid() }]);
        return;
      }
      // Jour source : celui indiqué s'il porte une séance ; sinon le prochain
      // jour d'entraînement à venir cette semaine (« déplace ma séance dans 2
      // jours » sans préciser le départ doit marcher même si aujourd'hui = repos).
      let from = action.when ? resolveWhen(action.when) : null;
      let src = from ? await fetchDay(user.id, from) : null;
      if (!hasSeance(src)) {
        const upcoming = weekDates().filter((d) => d >= todayYmd() && d !== to);
        const found = await fetchRange(user.id, upcoming);
        const next = upcoming.find((d) => hasSeance(found[d]));
        if (next) { from = next; src = found[next]; }
      }
      if (!hasSeance(src) || !from) {
        setMessages((prev) => [...prev, { role: "assistant" as const, content: `Je ne trouve pas de séance à déplacer cette semaine 🤔 Dis-moi le jour de départ, par ex. « déplace la séance de jeudi à ${dayLabelLong(to)} ».`, id: uid() }]);
        return;
      }
      if (from === to) {
        setMessages((prev) => [...prev, { role: "assistant" as const, content: `La séance est déjà prévue le ${dayLabelLong(to)} 🙂`, id: uid() }]);
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

      const genRes = await fetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, difficulty, muscles }),
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
        exerciseList: seance.exerciseList.map((e) => ({
          name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, restAfter: e.restAfter,
          tip: e.tip ?? "", benefit: e.benefit ?? "", muscles: e.muscles ?? [],
        })),
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
      setMessages((prev) => [...prev, { role: "assistant" as const, content: `⚠️ Modification du planning échouée — ${detail}`, id: uid() }]);
    } finally {
      setActionLoading(false);
    }
  }, [user?.id]);

  /* ── Analyse unifiée : UN seul appel 8b décide s'il y a un fait à retenir
     ET/OU une action (créer une séance) → moitié moins d'appels Groq ── */
  const analyzeMessage = useCallback(async (text: string, context: string) => {
    if (!user?.id || !text.trim()) return;

    let parsed: {
      memory?: MemoryAction;
      action?: { intent?: string; description?: string; muscles?: unknown; category?: string; difficulty?: string; when?: string; to?: string; location?: string };
    } | null = null;
    try {
      const res = await fetch("/api/assistant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });
      if (!res.ok) return;
      parsed = await res.json();
    } catch { return; }
    if (!parsed) return;

    // 1) Mémoire (best-effort, silencieux)
    const mem = parsed.memory;
    if (mem && (mem.type === "save" || mem.type === "forget")) {
      void persistMemoryAction(mem);
    }

    // 2) Action
    const action = parsed.action;
    if (!action || !action.intent) return;

    // 2a) Pilotage du PLANNING (remplacer / décaler / changer le lieu d'un jour)
    if (action.intent === "plan_set" || action.intent === "plan_location" || action.intent === "plan_move") {
      void preparePlanAction(action);
      return;
    }

    // 2b) Création d'une séance réutilisable (bibliothèque) → génération + carte
    if (action.intent !== "create_seance") return;

    // Coordination avec le chat : si le lieu d'entraînement est inconnu, le chat
    // pose d'abord la question (« salle ou maison ? »). On NE génère donc PAS la
    // carte tant qu'on ne connaît pas le lieu — sinon la séance se créerait avant
    // que l'utilisateur ait répondu. Source = localStorage (la même que le chat,
    // tenu à jour par [LIEU_UPDATE]) OU, en secours, le MESSAGE COURANT (pas le
    // contexte : un « maison » d'un échange précédent ne doit pas court-circuiter).
    let lieu: string | null = null;
    try { lieu = localStorage.getItem(`vaiiya_lieu_${user.id}`); } catch { /* ignore */ }
    if (!lieu) {
      const blob = text.toLowerCase();
      if (/maison|chez\s*moi|domicile|sans\s*mat|halt[èe]re|poids\s*du\s*corps/.test(blob)) lieu = "maison";
      else if (/salle|gym|basic\s*fit/.test(blob)) lieu = "salle";
    }
    if (!lieu) return; // lieu inconnu → on laisse le chat demander, on attend la réponse

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

      const genRes = await fetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, difficulty, muscles }),
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
        content: `⚠️ Génération séance échouée — ${detail}\n(copie-moi ce message stp)`,
        id: uid(),
      }]);
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, persistMemoryAction, preparePlanAction]);

  /* ── Envoi d'un message ── */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    void ensureContext();

    const userMsg: AssistantMsg = { role: "user", content: trimmed, id: uid() };
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

    // Analyse (mémoire + action) en UN appel. On passe les derniers échanges
    // (pas juste le dernier message) pour que le détecteur suive une demande
    // étalée (ex: "séance pecs" puis "à la maison").
    // ⚠️ Mistral free tier = 1 req/s : on DÉCALE l'analyse pour qu'elle n'entre
    // pas en collision avec la requête de chat (sinon 429 → carte + mémoire
    // perdues silencieusement). Le chat reste prioritaire et instantané.
    const recentContext = messages
      .slice(-4)
      .map((m) => `${m.role === "user" ? "Utilisateur" : "Coach"}: ${m.content}`)
      .join("\n");
    setTimeout(() => { void analyzeMessage(trimmed, recentContext); }, 1200);

    // On n'envoie que les derniers échanges au modèle (limite la taille de requête
    // → évite le 413 « request too large » de Groq sur les longues conversations).
    const history = [...messages, userMsg].slice(-10).map(({ role, content }) => ({ role, content }));

    try {
      const abort = new AbortController();
      abortRef.current = abort;
      const res = await fetch("/api/chat", {
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
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated, streaming: true } : m));
      }

      // Mémorise le lieu d'entraînement annoncé par le chat → il ne le
      // redemandera plus, et la création de séance peut s'y fier (même source).
      const lieuMatch = accumulated.match(/\[LIEU_UPDATE\]\s*(salle|maison)\s*\[\/LIEU_UPDATE\]/i);
      if (lieuMatch && user?.id) {
        try { localStorage.setItem(`vaiiya_lieu_${user.id}`, lieuMatch[1].toLowerCase()); } catch { /* ignore */ }
      }

      const cleaned = stripMemoryTags(accumulated)
        .replace(/\[PROGRAMME_UPDATE\][\s\S]*?\[\/PROGRAMME_UPDATE\]/gi, "")
        .replace(/\[LIEU_UPDATE\][\s\S]*?\[\/LIEU_UPDATE\]/gi, "")
        .replace(/\[NAV\][\s\S]*?\[\/NAV\]/gi, "")
        .trim();
      setMessages((prev) => {
        const next = prev.map((m) => m.id === assistantId ? { ...m, content: cleaned, streaming: false } : m);
        persist(next);
        return next;
      });

      // Orientation : exécute le tag [NAV] s'il est présent et connu
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
  }, [messages, isStreaming, user, pathname, router, ensureContext, persist, analyzeMessage]);

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
    if (historyKey) { try { localStorage.removeItem(historyKey); } catch { /* ignore */ } }
  }, [historyKey]);

  /* ── Validation de la carte : crée réellement la séance dans custom_sessions ── */
  const confirmSeance = useCallback(async () => {
    if (!user?.id || !pendingSeance) return;
    const supabase = createClient();
    const { error } = await supabase.from("custom_sessions").insert(seanceToRow(pendingSeance, user.id));
    if (error) { setMemoryNotice("Oups, impossible de créer la séance."); return; }
    const title = pendingSeance.title;
    setPendingSeance(null);
    setMemoryNotice(`Séance « ${title} » créée ✓`);
    setTimeout(() => { setIsOpen(false); router.push("/progression"); }, 900);
  }, [user?.id, pendingSeance, router]);

  const cancelSeance = useCallback(() => setPendingSeance(null), []);

  /* ── Validation de la carte planning : écrit les jours en base (aucune écriture sans clic) ── */
  const confirmPlan = useCallback(async () => {
    if (!user?.id || !pendingPlan) return;
    try {
      for (const w of pendingPlan.writes) await saveDay(user.id, w);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("programme-updated"));
      setPendingPlan(null);
      setMemoryNotice("Planning mis à jour ✓");
      setTimeout(() => setIsOpen(false), 900);
    } catch {
      setMemoryNotice("Oups, impossible de mettre à jour le planning.");
    }
  }, [user?.id, pendingPlan]);

  const cancelPlan = useCallback(() => setPendingPlan(null), []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // La notice mémoire ("Je m'en souviendrai") s'efface seule
  useEffect(() => {
    if (!memoryNotice) return;
    const t = setTimeout(() => setMemoryNotice(null), 3400);
    return () => clearTimeout(t);
  }, [memoryNotice]);

  return (
    <Ctx.Provider value={{ isOpen, open, close, toggle, clear, messages, isStreaming, sendMessage, pseudo: user?.pseudo, memoryNotice, pendingSeance, pendingPlan, actionLoading, confirmSeance, cancelSeance, confirmPlan, cancelPlan }}>
      {children}
    </Ctx.Provider>
  );
}
