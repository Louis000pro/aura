/* ════════════════════════════════════════════════════════════════════
   planning.ts — LE socle du planning unique (Phase 1 de la refonte).

   - Une seule source de vérité : la table Supabase `planning_days`
     (une ligne = un jour, date réelle, portant SA séance structurée).
   - Génération LOCALE et instantanée des séances (aucune IA) à partir
     du profil + lieu/matériel — exactement l'algo de l'ancien
     WeeklyProgramme, mais sortant des séances STRUCTURÉES (sets/reps),
     donc lançables dans WorkoutGuideModal et pilotables par l'IA.
   - La bibliothèque (custom_sessions) reste séparée : on ne crée RIEN
     dedans automatiquement. Un jour peut pointer vers un modèle via
     `sessionId`, mais sa séance reste auto-suffisante dans exerciseList.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { levelToDifficulty, type WorkoutDifficulty, type WorkoutCategory } from "@/lib/assistantActions";
import type { Exercise } from "@/components/WorkoutGuideModal";

export type Ctx = "salle" | "halteres" | "poids";
export type DayStatus = "planned" | "done" | "skipped";

/** Un jour du planning, avec sa séance directement dedans. */
export interface PlanningDay {
  date: string;                 // YYYY-MM-DD
  type: string;                 // "Force" | "HIIT" | "Repos" (label d'affichage)
  title: string;                // nom du split ("Push", "Haut du corps"…) ou ""
  difficulty: WorkoutDifficulty;
  location: Ctx | null;
  exerciseList: Exercise[];
  sessionId: string | null;     // renvoi optionnel vers un modèle de la biblio
  status: DayStatus;
}

export interface GenInput {
  ctx: Ctx;
  sessions: number;             // séances/semaine (onboarding)
  goals: string[];              // objectifs (labels FR)
  level: string | null;         // niveau onboarding
  variant: number;              // incrémenté par « Régénérer »
  seed: string;                 // graine déterministe (= user.id)
}

/* ═══════════════════════════ Banque d'exercices ═══════════════════════════ */
const EX: Record<Ctx, Record<string, string[]>> = {
  salle: {
    "Full Body": ["Presse à cuisses", "Développé couché", "Tirage poitrine", "Développé épaules machine", "Leg curl", "Rowing assis poulie", "Élévations latérales", "Crunch machine"],
    "Haut du corps": ["Développé couché", "Tirage poitrine", "Développé épaules machine", "Rowing assis poulie", "Pec deck", "Tirage vertical", "Élévations latérales", "Curl haltères", "Extensions triceps poulie"],
    "Bas du corps": ["Presse à cuisses", "Leg extension", "Leg curl", "Hip thrust machine", "Fentes haltères", "Mollets debout", "Abducteurs machine", "Soulevé de terre roumain"],
    "Push": ["Développé couché", "Développé incliné haltères", "Développé épaules machine", "Pec deck", "Élévations latérales", "Extensions triceps poulie", "Dips machine"],
    "Pull": ["Tirage vertical", "Rowing assis poulie", "Tirage poitrine", "Rowing haltère", "Curl barre EZ", "Curl haltères", "Face pull poulie", "Tirage horizontal"],
    "Cardio / HIIT": ["Tapis course 20 min", "Vélo 15 min", "Rameur 10 min", "Burpees 4x15", "Corde à sauter 5x2 min", "Mountain climbers 4x30s"],
  },
  halteres: {
    "Full Body": ["Squat haltères", "Développé couché haltères", "Rowing haltère", "Développé épaules haltères", "Fentes haltères", "Curl haltères", "Pompes", "Gainage 3x45s"],
    "Haut du corps": ["Développé couché haltères", "Rowing haltère", "Développé épaules haltères", "Élévations latérales", "Curl haltères", "Extensions triceps haltère", "Pompes", "Oiseau haltères"],
    "Bas du corps": ["Squat haltères", "Fentes haltères", "Soulevé de terre roumain haltères", "Hip thrust haltère", "Mollets haltères", "Squat bulgare", "Fentes marchées"],
    "Push": ["Développé couché haltères", "Développé épaules haltères", "Élévations latérales", "Pompes", "Extensions triceps haltère", "Développé incliné haltères"],
    "Pull": ["Rowing haltère", "Tirage menton haltères", "Curl haltères", "Oiseau haltères", "Curl marteau", "Rowing buste penché"],
    "Cardio / HIIT": ["Burpees 4x15", "Corde à sauter 5x2 min", "Mountain climbers 4x30s", "Jumping jacks 4x40s", "Squats sautés 4x20", "Gainage dynamique 4x45s"],
  },
  poids: {
    "Full Body": ["Pompes", "Squats", "Fentes", "Gainage 3x45s", "Dips sur chaise", "Superman 3x15", "Mountain climbers 3x30s", "Chaise contre le mur 3x45s"],
    "Haut du corps": ["Pompes", "Pompes diamant", "Dips sur chaise", "Pompes inclinées", "Pike push-ups", "Gainage 3x45s", "Superman 3x15", "Pompes serrées"],
    "Bas du corps": ["Squats", "Fentes", "Fentes sautées", "Squats sautés", "Chaise contre le mur 3x45s", "Mollets debout", "Pont fessier 4x15", "Squat bulgare"],
    "Push": ["Pompes", "Pike push-ups", "Dips sur chaise", "Pompes diamant", "Pompes inclinées", "Gainage 3x45s"],
    "Pull": ["Tractions (ou rowing serviette)", "Rowing inversé sous table", "Superman 3x15", "Gainage dorsal 3x40s", "Bird dog 3x12", "Pont fessier 4x15"],
    "Cardio / HIIT": ["Burpees 4x15", "Corde à sauter 5x2 min", "Mountain climbers 4x30s", "Jumping jacks 4x40s", "Squats sautés 4x20", "Montées de genoux 4x40s"],
  },
};

// Répartition des séances sur la semaine (indices de jours, 0 = Lundi)
const REST_PATTERN: Record<number, number[]> = {
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 4, 5, 6],
};
function buildSplit(sessions: number): string[] {
  if (sessions <= 1) return ["Full Body"];
  if (sessions === 2) return ["Haut du corps", "Bas du corps"];
  if (sessions === 3) return ["Full Body", "Haut du corps", "Bas du corps"];
  if (sessions === 4) return ["Haut du corps", "Bas du corps", "Push", "Pull"];
  if (sessions === 5) return ["Push", "Pull", "Bas du corps", "Haut du corps", "Cardio / HIIT"];
  return ["Push", "Pull", "Bas du corps", "Haut du corps", "Full Body", "Cardio / HIIT"];
}
function repSchemeFor(goals: string[]): string {
  const g = goals.join(" ").toLowerCase();
  if (g.includes("force")) return "5x5";
  if (g.includes("masse")) return "4x10";
  if (g.includes("poids") || g.includes("endurance") || g.includes("souplesse")) return "3x15";
  return "4x12";
}

/* PRNG déterministe (mulberry32) */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleArr<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* Transforme une entrée de banque ("Développé couché" ou "Burpees 4x15"
   ou "Tapis course 20 min") en exercice STRUCTURÉ. `scheme` = "4x10" etc. */
function toExercise(raw: string, scheme: string): Exercise {
  const withReps = /\d/.test(raw) ? raw : `${raw} ${scheme}`;
  // "Nom 4x10" / "Nom 3x45s" / "Nom 5x2 min"
  const m = withReps.match(/^(.+?)\s+(\d+)\s*[x×]\s*(.+)$/);
  if (m) {
    return { name: m[1].trim(), sets: parseInt(m[2], 10) || 3, reps: m[3].trim(), rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] };
  }
  // "Nom 20 min" / "Nom 30s" → un seul bloc chronométré
  const m2 = withReps.match(/^(.+?)\s+(\d+\s*(?:min|sec|s)\b.*)$/i);
  if (m2) {
    return { name: m2[1].trim(), sets: 1, reps: m2[2].trim(), rest: 45, restAfter: 60, tip: "", benefit: "", muscles: [] };
  }
  return { name: withReps.trim(), sets: 3, reps: "10", rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] };
}

/* Normalise une liste d'exercices STRUCTURÉS (sortie LLM ou ligne Supabase
   `exercise_list`) en Exercise[] propre, avec valeurs par défaut sûres. */
export function normalizeExercises(raw: unknown): Exercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const e = (x ?? {}) as Record<string, unknown>;
      return {
        name: String(e.name ?? "").trim(),
        sets: Number(e.sets) || 3,
        reps: String(e.reps ?? "10"),
        rest: Number(e.rest) || 60,
        restAfter: Number(e.restAfter) || 90,
        tip: typeof e.tip === "string" ? e.tip : "",
        benefit: typeof e.benefit === "string" ? e.benefit : "",
        muscles: Array.isArray(e.muscles) ? (e.muscles as string[]) : [],
      };
    })
    .filter((e) => e.name);
}

/* ═══════════════════════════ Dates ═══════════════════════════ */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Lundi (minuit local) de la semaine contenant `ref`. */
function mondayOf(ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); // Dim=0 → -6, sinon 1-jour
  return d;
}
/** Les 7 dates (Lundi → Dimanche) de la semaine contenant `ref`. */
export function weekDates(ref: Date = new Date()): string[] {
  const monday = mondayOf(ref);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday); x.setDate(monday.getDate() + i); return ymd(x);
  });
}
/** Les 7 dates de la semaine décalée de `offset` semaines vs aujourd'hui. */
export function weekDatesForOffset(offset: number): string[] {
  const ref = new Date(); ref.setDate(ref.getDate() + offset * 7);
  return weekDates(ref);
}
/** Décalage en semaines d'une date (YYYY-MM-DD) vs la semaine courante. */
export function weekOffsetOf(date: string): number {
  const diff = mondayOf(new Date(date + "T00:00:00")).getTime() - mondayOf().getTime();
  return Math.round(diff / (7 * 86_400_000));
}
/** Date du jour (YYYY-MM-DD, heure locale). */
export function todayYmd(): string { return ymd(new Date()); }
/** Index Lu→Di (0…6) d'une date (YYYY-MM-DD). */
export function weekdayIndex(date: string): number {
  const d = new Date(date + "T00:00:00").getDay();
  return d === 0 ? 6 : d - 1;
}
/** Index du jour courant dans la semaine (0 = Lundi … 6 = Dimanche). */
export function todayWeekIndex(): number { return weekdayIndex(todayYmd()); }

/* ═══════════════════════════ Génération ═══════════════════════════ */
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function generateWeek(gen: GenInput, dates: string[]): PlanningDay[] {
  const sessions = Math.max(1, Math.min(6, gen.sessions || 3));
  const rng = mulberry32(hashStr(`${gen.seed}-${gen.ctx}-s${sessions}-v${gen.variant}`));
  const split = buildSplit(sessions);
  const trainingDays = REST_PATTERN[sessions] ?? [0, 2, 4];
  const scheme = repSchemeFor(gen.goals);
  const difficulty = levelToDifficulty(gen.level);

  return dates.map((date, dayIdx) => {
    const pos = trainingDays.indexOf(dayIdx);
    if (pos === -1) {
      return { date, type: "Repos", title: "", difficulty, location: gen.ctx, exerciseList: [], sessionId: null, status: "planned" as DayStatus };
    }
    const sessionType = split[pos % split.length];
    const isCardio = sessionType.includes("Cardio");
    const bank = EX[gen.ctx][sessionType] ?? EX[gen.ctx]["Full Body"];
    const exerciseList = shuffleArr(bank, rng).slice(0, 5).map((p) => toExercise(p, scheme));
    return {
      date,
      type: isCardio ? "HIIT" : "Force",
      title: sessionType,
      difficulty,
      location: gen.ctx,
      exerciseList,
      sessionId: null,
      status: "planned" as DayStatus,
    };
  });
}

/** Génère la semaine SANS rien écrire — pour préparer une carte de
    confirmation (l'écriture n'arrive qu'au clic, via saveDay). */
export function previewWeek(gen: GenInput, dates: string[] = weekDates()): PlanningDay[] {
  return generateWeek(gen, dates);
}

/** Titre lisible d'un jour de planning (pour le lancement / l'historique). */
export function dayTitle(day: PlanningDay): string {
  return day.title || day.type;
}
/** Label du jour de la semaine pour une date (Lundi…Dimanche). */
export function dayLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return DAY_LABELS[idx];
}

/* ═══════════════════════════ Persistance Supabase ═══════════════════════════ */
interface PlanningRow {
  date: string;
  type: string;
  title: string | null;
  difficulty: string | null;
  location: string | null;
  exercise_list: Exercise[] | null;
  session_id: string | null;
  status: string | null;
}

function rowToDay(r: PlanningRow): PlanningDay {
  return {
    date: r.date,
    type: r.type,
    title: r.title ?? "",
    difficulty: (r.difficulty as WorkoutDifficulty) ?? "Intermédiaire",
    location: (r.location as Ctx | null) ?? null,
    exerciseList: Array.isArray(r.exercise_list) ? r.exercise_list : [],
    sessionId: r.session_id ?? null,
    status: (r.status as DayStatus) ?? "planned",
  };
}

function dayToRow(userId: string, d: PlanningDay) {
  return {
    user_id: userId,
    date: d.date,
    type: d.type,
    title: d.title,
    difficulty: d.difficulty,
    location: d.location,
    exercise_list: d.exerciseList,
    session_id: d.sessionId,
    status: d.status,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Charge le planning d'une semaine, en l'AMORÇANT si des jours manquent.
 * Idempotent : si deux composants l'appellent en même temps, l'upsert
 * `ignoreDuplicates` évite les doublons (contrainte UNIQUE user/date).
 */
export async function ensureWeek(userId: string, gen: GenInput, dates: string[] = weekDates()): Promise<PlanningDay[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("planning_days")
    .select("date, type, title, difficulty, location, exercise_list, session_id, status")
    .eq("user_id", userId)
    .in("date", dates);

  const existing = new Map<string, PlanningDay>(
    ((data ?? []) as PlanningRow[]).map((r) => [r.date, rowToDay(r)]),
  );
  const missing = dates.filter((d) => !existing.has(d));

  if (missing.length > 0) {
    const generated = generateWeek(gen, dates);
    const toInsert = generated.filter((d) => missing.includes(d.date)).map((d) => dayToRow(userId, d));
    await supabase.from("planning_days").upsert(toInsert, { onConflict: "user_id,date", ignoreDuplicates: true });
    for (const d of generated) if (missing.includes(d.date)) existing.set(d.date, d);
  }

  return dates.map((d) => existing.get(d)!).filter(Boolean);
}

/**
 * Régénère la semaine : efface les jours « planned » (préserve l'historique
 * done/skipped) puis ré-amorce avec le `gen` fourni (nouveau variant ou lieu).
 */
export async function regenerateWeek(userId: string, gen: GenInput, dates: string[] = weekDates()): Promise<PlanningDay[]> {
  const supabase = createClient();
  await supabase
    .from("planning_days")
    .delete()
    .eq("user_id", userId)
    .eq("status", "planned")
    .in("date", dates);
  return ensureWeek(userId, gen, dates);
}

/** Récupère un seul jour (sans amorçage). null si absent. */
export async function fetchDay(userId: string, date: string): Promise<PlanningDay | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("planning_days")
    .select("date, type, title, difficulty, location, exercise_list, session_id, status")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  return data ? rowToDay(data as PlanningRow) : null;
}

/** Récupère plusieurs jours en UNE requête, indexés par date (YYYY-MM-DD). */
export async function fetchRange(userId: string, dates: string[]): Promise<Record<string, PlanningDay>> {
  if (dates.length === 0) return {};
  const supabase = createClient();
  const { data } = await supabase
    .from("planning_days")
    .select("date, type, title, difficulty, location, exercise_list, session_id, status")
    .eq("user_id", userId)
    .in("date", dates);
  const out: Record<string, PlanningDay> = {};
  for (const row of (data ?? [])) { const d = rowToDay(row as PlanningRow); out[d.date] = d; }
  return out;
}

/** Vrai si le jour porte une vraie séance (ni vide, ni Repos). */
export function hasSeance(day: PlanningDay | null | undefined): day is PlanningDay {
  return !!day && day.type.toLowerCase() !== "repos" && day.exerciseList.length > 0;
}

/** Enregistre / remplace un jour (utilisé par l'IA en Phase 2). */
export async function saveDay(userId: string, day: PlanningDay): Promise<void> {
  const supabase = createClient();
  await supabase.from("planning_days").upsert(dayToRow(userId, day), { onConflict: "user_id,date" });
}

/** Met à jour le statut d'un jour (planned → done après une séance). */
export async function setDayStatus(userId: string, date: string, status: DayStatus): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("planning_days")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("date", date);
}

/* ═══════════════════════════ Helpers lieu/contexte ═══════════════════════════ */
/** Lit le lieu + matériel enregistrés (localStorage) pour un utilisateur. */
export function readLieu(userId: string): { location: "salle" | "maison" | null; equip: "halteres" | "poids" | null } {
  if (typeof window === "undefined") return { location: null, equip: null };
  try {
    const v = localStorage.getItem(`vaiiya_lieu_${userId}`);
    const e = localStorage.getItem(`vaiiya_lieu_equip_${userId}`);
    return {
      location: v === "salle" || v === "maison" ? v : null,
      equip: e === "halteres" || e === "poids" ? e : null,
    };
  } catch {
    return { location: null, equip: null };
  }
}

/** Contexte matériel effectif (salle / haltères / poids du corps). */
export function ctxFromLieu(location: "salle" | "maison" | null, equip: "halteres" | "poids" | null): Ctx {
  return location === "salle" ? "salle" : equip === "halteres" ? "halteres" : "poids";
}

/** Lit le variant « Régénérer » courant (localStorage). */
export function readVariant(userId: string): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem(`vaiiya_prog_variant_${userId}`) || "0", 10) || 0; }
  catch { return 0; }
}

/* ═══════════════════════════ Pilotage par l'IA (Phase 2) ═══════════════════════════ */

/** Type d'affichage (badge) d'un jour selon la catégorie de séance générée. */
export const PLANNING_TYPE_BY_CATEGORY: Record<WorkoutCategory, string> = {
  force: "Force", cardio: "Cardio", mobilite: "Mobilité", fullbody: "Full Body",
};

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * Résout un descripteur de jour produit par l'IA en date réelle (YYYY-MM-DD).
 * Accepte : aujourd_hui, demain, apres_demain, dans_N_jours, semaine_prochaine,
 * ou un nom de jour (lundi…dimanche → prochaine occurrence, aujourd'hui inclus).
 * Retourne null si non résolu.
 */
export function resolveWhen(tokenRaw: string, ref: Date = new Date()): string | null {
  const t = (tokenRaw || "")
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[\s'-]+/g, "_").replace(/^le_/, "").trim();
  const base = new Date(ref); base.setHours(0, 0, 0, 0);
  const add = (n: number) => { const d = new Date(base); d.setDate(base.getDate() + n); return ymd(d); };
  if (t === "aujourd_hui" || t === "aujourdhui" || t === "ce_jour") return ymd(base);
  if (t === "demain") return add(1);
  if (t === "apres_demain") return add(2);
  if (t === "semaine_prochaine") return add(7);
  const m = t.match(/^dans_(\d+)_jour/);
  if (m) return add(parseInt(m[1], 10) || 0);
  const wd = WEEKDAYS_FR.indexOf(t);
  if (wd >= 0) return add((wd - base.getDay() + 7) % 7);
  return null;
}

/** Libellé long FR d'une date (« vendredi 20 juin »). */
export function dayLabelLong(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
