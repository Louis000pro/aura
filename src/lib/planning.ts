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

/**
 * Ce que la ligne DIT : une seance, ou un repos voulu.
 *
 * ATTENTION : aujourd'hui la nature se deduit du champ `type`, qui est un
 * LIBELLE D'AFFICHAGE (Force, HIIT, Repos). C'est justement le probleme :
 * renommer un badge changerait le sens des donnees. La colonne
 * `planning_days.nature` existe desormais en base (V2) et prendra le
 * relais quand le code cessera d'ecrire a la lecture ; d'ici la, la
 * deduction vit ICI et nulle part ailleurs.
 */
export type Nature = "seance" | "repos";

/**
 * Le dernier auteur DELIBERE de la ligne. La regeneration ne touchera que
 * `systeme` : avant V5, `regenerateWeek` effaçait sans distinction le
 * remplissage automatique et les jours qu'on a poses soi-meme.
 */
export type Origine = "systeme" | "utilisateur" | "guide";

/**
 * UNE INTENTION d'entraînement, avec sa séance directement dedans.
 *
 * ⚠️ LE NOM MENT DEPUIS V6b, ET IL RESTE POUR NE PAS RENOMMER 4 000
 * LIGNES DANS LA MÊME VAGUE : ce n'est plus « un jour du planning », une
 * journée pouvant désormais en porter plusieurs (la séance principale et
 * son supplément). Tout le reste du fichier en tire les conséquences.
 */
export interface PlanningDay {
  /**
   * ⚠️ L'IDENTITÉ DE LA LIGNE, ET C'EST V6b QUI LA REND INDISPENSABLE.
   * Une date ne désigne plus une intention : elle en désigne autant que
   * la journée en porte. `null` veut dire « cette intention n'existe pas
   * encore en base » (une séance générée, une prévisualisation), donc
   * l'écrire la CRÉE. Le champ est obligatoire exprès : chaque endroit
   * qui fabrique une intention doit répondre à la question.
   */
  id: string | null;
  date: string;                 // YYYY-MM-DD
  type: string;                 // "Force" | "HIIT" | "Repos" (label d'affichage)
  title: string;                // nom du split ("Push", "Haut du corps"…) ou ""
  difficulty: WorkoutDifficulty;
  location: Ctx | null;
  exerciseList: Exercise[];
  sessionId: string | null;     // renvoi optionnel vers un modèle de la biblio
  status: DayStatus;
  /**
   * L'étape du cycle que cette intention referme. Elle décide de la
   * hiérarchie de la journée : l'étape d'abord, les suppléments ensuite
   * (leur étape vaut `null`). Absente d'une intention qu'on vient de
   * fabriquer et qui n'a encore rien refermé.
   */
  etapeId?: string | null;
  /**
   * Le programme dont vient cette étape. Il n'a de sens QU'AVEC `etapeId`,
   * et les deux s'écrivent ensemble : la base porte deux clés étrangères
   * COMPOSITES (V4), pour qu'une intention ne puisse pas déclarer un
   * programme et pointer l'étape d'un autre.
   */
  programmeId?: string | null;
  /** Départage deux suppléments : le plus ancien d'abord. Absente d'une
   *  intention qui n'est pas encore en base. */
  creeLe?: string | null;
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
    "Full Body": ["Presse à cuisses", "Développé couché", "Tirage poitrine", "Développé épaules machine", "Leg curl assis", "Rowing assis poulie", "Élévations latérales", "Crunch machine"],
    "Haut du corps": ["Développé couché", "Tirage poitrine", "Développé épaules machine", "Rowing assis poulie", "Pec deck", "Tirage vertical", "Élévations latérales", "Curl haltères", "Extensions triceps poulie"],
    "Bas du corps": ["Presse à cuisses", "Leg extension", "Leg curl allongé", "Hip thrust machine", "Fentes haltères", "Mollets debout", "Abducteurs machine", "Soulevé de terre roumain"],
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
/**
 * Le CYCLE de référence : la rotation des séances, et rien d'autre.
 *
 * ⚠️ Ce sont ces mêmes lignes qui deviennent `programme_seances` (V4.5).
 * Il n'existe donc qu'UNE définition du cycle dans le produit, partagée
 * par l'ancien moteur (qui la date tout de suite) et par le nouveau (qui
 * ne la date jamais). En écrire une seconde pour le programme, c'était
 * garantir que les deux divergent au premier ajustement.
 */
export function seancesDuCycle(sessions: number): number {
  return Math.max(1, Math.min(6, sessions || 3));
}
export function cycleDeReference(sessions: number): string[] {
  return buildSplit(seancesDuCycle(sessions));
}

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
/** Les `n` prochaines dates À PARTIR d'aujourd'hui (et non du lundi) : c'est
 *  ce qu'attend un choix « quand veux-tu la faire ? », qui ne doit jamais
 *  proposer un jour déjà passé. */
export function prochainsJours(n = 7): string[] {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(d0); x.setDate(d0.getDate() + i); return ymd(x);
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
  const sessions = seancesDuCycle(gen.sessions);
  const rng = mulberry32(hashStr(`${gen.seed}-${gen.ctx}-s${sessions}-v${gen.variant}`));
  const split = buildSplit(sessions);
  const trainingDays = REST_PATTERN[sessions] ?? [0, 2, 4];
  const scheme = repSchemeFor(gen.goals);
  const difficulty = levelToDifficulty(gen.level);

  return dates.map((date, dayIdx) => {
    const pos = trainingDays.indexOf(dayIdx);
    if (pos === -1) {
      return { id: null, date, type: "Repos", title: "", difficulty, location: gen.ctx, exerciseList: [], sessionId: null, status: "planned" as DayStatus };
    }
    const sessionType = split[pos % split.length];
    const isCardio = sessionType.includes("Cardio");
    const bank = EX[gen.ctx][sessionType] ?? EX[gen.ctx]["Full Body"];
    const exerciseList = shuffleArr(bank, rng).slice(0, 5).map((p) => toExercise(p, scheme));
    return {
      id: null,
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

/**
 * L'INSTANCE d'une étape du cycle : sa liste d'exercices concrète.
 *
 * ⚠️ C'est le troisième étage du modèle, et il se matérialise TARD :
 * l'étape (« Push ») est stable des mois, sa liste d'exercices se fabrique
 * au moment de faire la séance et reste jetable tant qu'elle n'a pas été
 * consommée. C'est un calcul local et instantané, aucune écriture, aucun
 * appel d'IA : rien n'oblige à l'écrire d'avance, et écrire d'avance est
 * précisément ce qui figeait le programme.
 */
export function instanceDeLEtape(nomEtape: string, gen: GenInput): Exercise[] {
  const rng = mulberry32(hashStr(`${gen.seed}-${gen.ctx}-${nomEtape}-v${gen.variant}`));
  const bank = EX[gen.ctx][nomEtape] ?? EX[gen.ctx]["Full Body"];
  return shuffleArr(bank, rng).slice(0, 5).map((p) => toExercise(p, repSchemeFor(gen.goals)));
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
/** Lieu lisible d'une séance du planning. Il vit ici, avec `dayTitle`,
 *  parce que deux écrans l'écrivent désormais : le héros de la journée
 *  (sur l'accueil) et le détail d'un jour (sur Entraînement). */
export function lieuLabel(loc: Ctx | null): string {
  if (loc === "salle") return "À la salle";
  if (loc === "halteres") return "Maison · haltères";
  if (loc === "poids") return "Maison · poids du corps";
  return "";
}

export function dayLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return DAY_LABELS[idx];
}

/* ═══════════════════ La couche d'accès transitoire (V6) ═══════════════════

   ⚠️ LE CODE COMPREND LES DEUX VOCABULAIRES, ET C'EST LA CORRECTION POSÉE
   PAR LOUIS AU PLAN. Une vue de compatibilité protégerait le NOM de la
   table, pas le SENS de ses valeurs : un déploiement qui lit `status` et
   reçoit `prevue` ne plante pas, il comprend de travers, et « faite »
   cesse silencieusement d'être reconnue. L'ordre de déploiement est donc
   celui-ci, et il n'est pas négociable :

     1. ce code transitoire part en production (il lit et écrit l'ancien
        schéma tant que le nouveau n'existe pas) ;
     2. ensuite seulement, la migration renomme ;
     3. plus tard, quand plus aucun déploiement n'a l'ancien contrat en
        tête, cette couche disparaît.

   ⚠️ TANT QUE LA MIGRATION N'EST PAS APPLIQUÉE, RIEN NE CHANGE. Le
   sondage échoue sur la table neuve, on retombe sur l'ancienne, et
   l'application se comporte exactement comme avant.                     */

export type SchemaIntentions = {
  table: string;
  /** Le nom de la colonne de statut : `status` hier, `statut` demain. */
  colStatut: string;
  /** Le mot écrit en base pour un statut du code. */
  versBase: Record<DayStatus, string>;
  /** Le statut du code pour un mot lu en base. */
  versCode: Record<string, DayStatus>;
};

export const ANCIEN: SchemaIntentions = {
  table: "planning_days",
  colStatut: "status",
  versBase: { planned: "planned", done: "done", skipped: "skipped" },
  versCode: { planned: "planned", done: "done", skipped: "skipped" },
};

export const NOUVEAU: SchemaIntentions = {
  table: "intentions_entrainement",
  colStatut: "statut",
  versBase: { planned: "prevue", done: "faite", skipped: "passee" },
  versCode: { prevue: "planned", faite: "done", passee: "skipped" },
};

/* Sondé UNE fois par session, puis mémorisé : la question ne change pas
   d'une requête à l'autre. Le coût est d'une requête au premier accès.

   ⚠️ LE CLIENT EST UN ARGUMENT, PARCE QUE LE CRON N'A PAS LE MÊME. Le
   rappel du soir et les statistiques d'administration lisent ces lignes
   avec le client de service, côté serveur : s'ils gardaient l'ancien
   contrat en dur, la première nuit après la migration serait une nuit
   sans aucun rappel, et personne ne le verrait. */
type ClientLike = { from: (t: string) => { select: (c: string) => { limit: (n: number) => PromiseLike<{ error: unknown }> } } };

let schemaResolu: SchemaIntentions | null = null;
let sondage: Promise<SchemaIntentions> | null = null;

export async function schemaIntentions(client?: ClientLike): Promise<SchemaIntentions> {
  if (schemaResolu) return schemaResolu;
  if (sondage) return sondage;
  sondage = (async () => {
    try {
      const c = client ?? (createClient() as unknown as ClientLike);
      const { error } = await c.from(NOUVEAU.table).select("id").limit(1);
      schemaResolu = error ? ANCIEN : NOUVEAU;
    } catch {
      schemaResolu = ANCIEN;
    }
    sondage = null;
    return schemaResolu;
  })();
  return sondage;
}

/** Les colonnes de l'intention, avec le bon nom de statut. Exporté pour
 *  les lectures serveur, qui composent leur propre requête. */
export function colonnesIntention(s: SchemaIntentions, extra = ""): string {
  return `${extra ? extra + ", " : ""}${s.colStatut}`;
}

/** Les colonnes à demander, avec le bon nom de statut.
 *
 *  ⚠️ `id` ET `created_at` ONT REJOINT LA LISTE EN V6b, et ce n'est pas du
 *  confort : une date ne désigne plus une ligne, donc il faut de quoi
 *  désigner celle qu'on modifie, et de quoi ordonner celles d'une même
 *  journée. `etape_consommee_id` porte la hiérarchie (l'étape d'abord). */
function colonnes(s: SchemaIntentions): string {
  return `id, date, type, title, difficulty, location, exercise_list, session_id, programme_id, etape_consommee_id, created_at, ${s.colStatut}`;
}

/* ═══════════════════════════ Persistance Supabase ═══════════════════════════ */
interface PlanningRow {
  id: string;
  date: string;
  type: string;
  title: string | null;
  difficulty: string | null;
  location: string | null;
  exercise_list: Exercise[] | null;
  session_id: string | null;
  programme_id?: string | null;
  etape_consommee_id?: string | null;
  created_at?: string | null;
  /* ⚠️ LES DEUX NOMS, ET LES DEUX VOCABULAIRES. Une ligne peut arriver de
     l'ancien contrat (`status: 'planned'`) comme du nouveau
     (`statut: 'prevue'`). Lire l'un en croyant l'autre ne plante pas, ça
     comprend de travers : « faite » cesserait simplement d'être reconnue. */
  status?: string | null;
  statut?: string | null;
}

function rowToDay(r: PlanningRow, s: SchemaIntentions): PlanningDay {
  const brut = String((r as unknown as Record<string, unknown>)[s.colStatut] ?? "");
  return {
    id: r.id,
    date: r.date,
    type: r.type,
    title: r.title ?? "",
    difficulty: (r.difficulty as WorkoutDifficulty) ?? "Intermédiaire",
    location: (r.location as Ctx | null) ?? null,
    exerciseList: Array.isArray(r.exercise_list) ? r.exercise_list : [],
    sessionId: r.session_id ?? null,
    // Un mot inconnu vaut « prévue » : on ne fait jamais passer pour faite
    // une intention dont on n'a pas compris le statut.
    status: s.versCode[brut] ?? "planned",
    etapeId: r.etape_consommee_id ?? null,
    /* ⚠️ RELU POUR QUE LE DÉPLACEMENT NE PERDE PAS LE LIEN. Une intention
       qui réserve une étape se déplace comme n'importe quelle autre, et
       `saveDay` réécrit la ligne entière : sans cette lecture, changer de
       jour effacerait la réservation en silence. */
    programmeId: r.programme_id ?? null,
    creeLe: r.created_at ?? null,
  };
}

/**
 * ⚠️ `origine` EST UN ARGUMENT OBLIGATOIRE, ET C'EST VOULU (V5). C'est le
 * dernier auteur DÉLIBÉRÉ de la ligne, et lui seul décide si la ligne est
 * du mobilier qu'on peut remplacer ou une intention qu'on doit protéger.
 * Un défaut cacherait la question à l'endroit exact où il faut se la poser.
 */
/**
 * ⚠️ `session_id` A UNE CLÉ ÉTRANGÈRE VERS `custom_sessions`, ET C'EST CE
 * QUI A REFUSÉ SILENCIEUSEMENT « Ajouter à ma semaine » PENDANT TROIS MOIS.
 * La colonne est un renvoi vers un modèle de la BIBLIOTHÈQUE (des lignes
 * `custom-…`), pas vers une séance du catalogue, dont l'identifiant est un
 * slug (`hiit`, `force-haut`) qui n'existe dans aucune table. Poser ce slug
 * là fait rendre `23503` à la base, donc 409 à l'écran, et l'intention n'est
 * jamais écrite.
 *
 * Une séance du catalogue n'a donc PAS de renvoi, et elle n'en a pas besoin :
 * l'intention porte déjà son titre et sa liste d'exercices, c'est-à-dire tout
 * ce que le tunnel relit. La règle vit ici, à l'unique endroit où l'on
 * fabrique la ligne, pour qu'aucun appelant ne puisse la réintroduire.
 */
export function refModele(sessionId: string | null | undefined): string | null {
  return sessionId && sessionId.startsWith("custom-") ? sessionId : null;
}

/**
 * Le lien de cette intention avec le programme : les trois colonnes, ou
 * les trois à `null`. JAMAIS un mélange.
 *
 * ⚠️ IL SE DÉCLARE, IL NE SE DEVINE PAS. Une intention ne referme une
 * étape que si celui qui l'a écrite l'a voulu : dater explicitement la
 * prochaine étape du programme, oui ; ajouter une séance du catalogue ou
 * une séance perso qui s'appelle « Push », non. Déduire la consommation
 * du titre ferait avancer le cycle sur une ressemblance de mots.
 *
 * ⚠️ LES DEUX MOITIÉS SONT INDISSOCIABLES. Les clés étrangères sont
 * COMPOSITES (V4) et deux `CHECK` refusent une étape sans son programme :
 * écrire `etape_consommee_id` seul ferait rejeter la ligne par la base.
 * D'où le « les deux, ou aucun » plutôt que deux champs indépendants.
 *
 * ⚠️ ET IL S'ÉCRIT TOUJOURS, MÊME À `null`. Omettre les colonnes dans un
 * `update` les laisserait en place : remplacer une réservation d'étape
 * par une séance du catalogue lui ferait alors refermer une étape que
 * personne ne lui a confiée.
 */
export function lienProgramme(d: Pick<PlanningDay, "programmeId" | "etapeId">) {
  const lie = !!d.programmeId && !!d.etapeId;
  return {
    programme_id: lie ? d.programmeId! : null,
    // D'OÙ VIENT LE CONTENU / QUELLE ÉTAPE EST REFERMÉE. Ici les deux
    // valent la même étape : la personne a daté ce que le programme
    // proposait. Le jour où elle fera autre chose « à la place », ils
    // divergeront, et c'est pour ça qu'il y a deux colonnes.
    programme_seance_id: lie ? d.etapeId! : null,
    etape_consommee_id: lie ? d.etapeId! : null,
  };
}

function dayToRow(userId: string, d: PlanningDay, origine: Origine, s: SchemaIntentions) {
  const maintenant = new Date().toISOString();
  return {
    user_id: userId,
    date: d.date,
    type: d.type,
    title: d.title,
    difficulty: d.difficulty,
    location: d.location,
    exercise_list: d.exerciseList,
    session_id: refModele(d.sessionId),
    [s.colStatut]: s.versBase[d.status],
    nature: natureDe(d),
    origine,
    /* ⚠️ ÉCRITE ICI PARCE QUE L'INVARIANT EST ENTRÉ EN BASE (V6) :
       `consommee_le` est non nulle si ET SEULEMENT SI l'intention est
       résolue. Sans cette ligne, réécrire une intention déjà faite en
       « prévue » laisserait la date en place et la CHECK refuserait
       l'écriture. Le mauvais échec serait de ne s'en apercevoir qu'en
       production, sur le premier remplacement d'une séance faite. */
    consommee_le: d.status === "planned" ? null : maintenant,
    ...lienProgramme(d),
    updated_at: maintenant,
  };
}

/**
 * Lit une semaine. C'EST TOUT : elle n'écrit plus rien.
 *
 * ⚠️ C'ÉTAIT `ensureWeek`, ET LE NOM DISAIT EXACTEMENT LE PROBLÈME. Ouvrir
 * son planning écrivait sept lignes en base, dont les jours de repos que
 * personne n'avait posés : le planning était à 95 % du mobilier
 * automatique (mesuré : 469 lignes, dont 227 « Repos » et 447 jamais
 * retouchées). Désormais l'absence de ligne veut dire ce qu'elle dit :
 * rien de prévu ce jour-là.
 *
 * ⚠️ ELLE REND UN TABLEAU CREUX, DONC ON N'Y ACCÈDE QUE PAR `parDate`.
 * Un jour sans ligne ne laisse pas de trou dans le tableau, il le
 * RACCOURCIT : la garantie « toujours sept lignes dans l'ordre du lundi »
 * vient de tomber avec l'écriture à la lecture. C'est exactement le
 * scénario que V1 avait préparé.
 *
 * ⚠️ ET DEPUIS V6b IL PEUT AUSSI ÊTRE PLUS LONG QUE SEPT : une journée
 * porte autant d'intentions qu'on y a posées. La seule lecture juste est
 * donc `parDate`, qui rend LA LISTE d'une date, puis `principale` et
 * `supplements` pour la hiérarchie.
 */
export async function lireSemaine(userId: string, dates: string[] = weekDates()): Promise<PlanningDay[]> {
  const map = await fetchRange(userId, dates);
  return dates.flatMap((d) => map[d] ?? []);
}

/**
 * Repose le mobilier automatique de la semaine, à la demande EXPLICITE de
 * quelqu'un (le bouton « Refais ma semaine », le Guide).
 *
 * ⚠️ ELLE N'EFFACE QUE `origine = 'systeme'`. C'est toute la raison d'être
 * de cette colonne : avant, un `delete where status='planned'` emportait
 * sans distinction le remplissage automatique et les jours posés à la
 * main. Une intention explicite ne se fait plus écraser par une
 * régénération.
 *
 * ⚠️ ELLE N'ÉCRIT QUE LES SÉANCES, JAMAIS DE REPOS. Un repos est une
 * intention qu'on pose, pas un trou qu'on remplit : reposer sept lignes
 * dont quatre « Repos » recréerait exactement le mobilier que V5 retire.
 * Les jours sans séance restent vides, et vides veut dire libre.
 */
export async function reposerLaSemaine(userId: string, gen: GenInput, dates: string[] = weekDates()): Promise<PlanningDay[]> {
  const supabase = createClient();
  const sc = await schemaIntentions();
  await supabase
    .from(sc.table)
    .delete()
    .eq("user_id", userId)
    .eq(sc.colStatut, sc.versBase.planned)
    .eq("origine", "systeme")
    .in("date", dates);

  /* ⚠️ ON NE POSE QUE SUR LES JOURS RESTÉS LIBRES. Ce qui a survécu au
     `delete` ci-dessus, ce sont précisément les jours qu'on doit
     protéger : les séances déjà faites, et celles posées par la personne
     ou par le Guide. Un `upsert` aveugle sur toutes les dates de la
     semaine les écraserait, et l'écran ne montrerait rien de l'accident. */
  const restant = await fetchRange(userId, dates);
  const seances = generateWeek(gen, dates)
    .filter(hasSeance)
    .filter((d) => (restant[d.date] ?? []).length === 0);
  /* ⚠️ UN `insert`, PLUS UN `upsert` : c'est V6b. L'ancienne écriture
     s'appuyait sur `on_conflict=user_id,date` pour ignorer les doublons,
     or cette contrainte disparaît. Le tri ci-dessus fait déjà le travail
     qu'elle faisait, et il le fait mieux : il ne pose une séance que sur
     une date où il ne reste RIEN, suppléments compris. */
  if (seances.length > 0) {
    await supabase
      .from(sc.table)
      .insert(seances.map((d) => dayToRow(userId, d, "systeme", sc)));
  }
  return lireSemaine(userId, dates);
}

/**
 * TOUTES les intentions d'une date, dans l'ordre de lecture.
 *
 * ⚠️ C'ÉTAIT `fetchDay`, ET IL RENDAIT UNE SEULE LIGNE VIA `maybeSingle()`.
 * Ce n'est pas qu'une question de type : `maybeSingle()` ÉCHOUE dès que la
 * requête ramène deux lignes. Le jour où quelqu'un pose une seconde séance
 * sur une journée, l'ancienne version n'aurait pas montré la première,
 * elle aurait rendu une erreur. Le renommage est là pour qu'aucun appelant
 * ne la retrouve en croyant qu'elle rend encore un jour.
 */
export async function lireJour(userId: string, date: string): Promise<PlanningDay[]> {
  const supabase = createClient();
  const sc = await schemaIntentions();
  const { data } = await supabase
    .from(sc.table)
    .select(colonnes(sc))
    .eq("user_id", userId)
    .eq("date", date);
  return ordonner((data ?? []).map((r) => rowToDay(r as unknown as PlanningRow, sc)));
}

/** Récupère plusieurs jours en UNE requête, indexés par date (YYYY-MM-DD).
 *  Chaque date porte SA LISTE d'intentions, déjà ordonnée. */
export async function fetchRange(userId: string, dates: string[]): Promise<Record<string, PlanningDay[]>> {
  if (dates.length === 0) return {};
  const supabase = createClient();
  const sc = await schemaIntentions();
  const { data } = await supabase
    .from(sc.table)
    .select(colonnes(sc))
    .eq("user_id", userId)
    .in("date", dates);
  return parDate((data ?? []).map((r) => rowToDay(r as unknown as PlanningRow, sc)));
}

/**
 * Indexe une liste de jours PAR DATE.
 *
 * ⚠️ C'EST LA SEULE FAÇON D'ALLER CHERCHER UN JOUR, ET LE TABLEAU N'EN EST
 * PAS UNE. `lireSemaine` rend `dates.map(...).filter(Boolean)` : le jour
 * qu'on n'a pas ne laisse pas de trou, il RACCOURCIT le tableau, donc tous
 * les jours suivants glissent d'un cran. Ce n'est plus une hypothèse depuis
 * V5 : l'écriture à la lecture s'est arrêtée, donc une semaine rend
 * couramment deux ou trois lignes au lieu de sept. `week[i]` et
 * `days[selectedDay]` désignent maintenant le mauvais jour pour de bon.
 */
export function parDate(days: PlanningDay[] | null | undefined): Record<string, PlanningDay[]> {
  const out: Record<string, PlanningDay[]> = {};
  for (const d of days ?? []) (out[d.date] ??= []).push(d);
  for (const date of Object.keys(out)) out[date] = ordonner(out[date]);
  return out;
}

/**
 * L'ORDRE DE LECTURE D'UNE JOURNÉE : l'étape du programme d'abord, les
 * suppléments ensuite, du plus ancien au plus récent.
 *
 * ⚠️ IL N'Y A PAS DE COLONNE D'ORDRE, ET IL NE FAUT PAS EN AJOUTER UNE.
 * La hiérarchie se DÉDUIT : ce qui referme une étape du cycle est la
 * séance du programme, tout le reste est venu en plus. Une colonne
 * `position` serait une seconde autorité, à tenir à jour à chaque
 * écriture, et elle se désynchroniserait comme tous les compteurs qu'on a
 * déjà retirés du produit (l'EXP, la série).
 *
 * ⚠️ UNE INTENTION PAS ENCORE EN BASE PASSE EN DERNIER. Elle n'a pas de
 * date de création, et c'est justement la plus récente : la faire passer
 * en tête ferait sauter la carte du héros le temps d'un enregistrement.
 */
const JAMAIS_ECRITE = "~"; // trie après n'importe quel horodatage ISO

export function ordonner(jour: PlanningDay[] | null | undefined): PlanningDay[] {
  return [...(jour ?? [])].sort((a, b) => {
    const ea = a.etapeId ? 0 : 1;
    const eb = b.etapeId ? 0 : 1;
    if (ea !== eb) return ea - eb;
    const ca = a.creeLe ?? JAMAIS_ECRITE;
    const cb = b.creeLe ?? JAMAIS_ECRITE;
    if (ca !== cb) return ca < cb ? -1 : 1;
    return (a.id ?? "").localeCompare(b.id ?? "");
  });
}

/**
 * L'intention qui REPRÉSENTE la journée : celle que montrent le héros et
 * la bande semaine quand il n'y a la place que pour une.
 *
 * ⚠️ ELLE PEUT ÊTRE `null` SANS QUE LA JOURNÉE SOIT VIDE au sens de V5 :
 * une liste vide veut dire « rien de prévu », et c'est une réponse.
 */
export function principale(jour: PlanningDay[] | null | undefined): PlanningDay | null {
  return ordonner(jour)[0] ?? null;
}

/** Ce qui vient EN PLUS ce jour-là. Jamais masqué : c'est toute la vague. */
export function supplements(jour: PlanningDay[] | null | undefined): PlanningDay[] {
  return ordonner(jour).slice(1);
}

/** Les intentions de la journée qui portent une vraie séance. */
export function seancesDuJour(jour: PlanningDay[] | null | undefined): PlanningDay[] {
  return ordonner(jour).filter(hasSeance);
}

/** La première séance encore à faire ce jour-là, s'il y en a une. */
export function prochaineSeanceDuJour(jour: PlanningDay[] | null | undefined): PlanningDay | null {
  return seancesDuJour(jour).find((d) => d.status === "planned") ?? null;
}

/**
 * La nature d'un jour, deduite de son libelle tant que la colonne n'est pas
 * lue. Verifie en base avant d'ecrire V2 : ZERO ligne Repos porte des
 * exercices et zero ligne non-Repos n'en porte aucun, donc cette deduction
 * et l'ancien `hasSeance` coincident exactement sur les donnees reelles.
 */
export function natureDe(day: PlanningDay | null | undefined): Nature {
  return day && day.type.toLowerCase() === "repos" ? "repos" : "seance";
}

/** Un repos VOULU. L'absence de ligne, elle, ne veut rien dire du tout. */
export function estRepos(day: PlanningDay | null | undefined): boolean {
  return !!day && natureDe(day) === "repos";
}

/** Vrai si le jour porte une vraie séance (ni vide, ni Repos). */
export function hasSeance(day: PlanningDay | null | undefined): day is PlanningDay {
  return !!day && natureDe(day) === "seance" && day.exerciseList.length > 0;
}

/**
 * Seance non faite : le predicat, ecrit UNE SEULE FOIS.
 *
 * ATTENTION : il a TROIS conditions, et la premiere est celle qu'on oublie.
 * Sans `nature === "seance"`, tous les repos passes remontent comme des
 * seances ratees, et le Guide finit par proposer de deplacer un jour de
 * repos. Il etait jusqu'ici ecrit a la main dans Ma semaine (l'opacite 0,5
 * d'un jour passe) ; il n'y a plus qu'un endroit ou le corriger.
 *
 * ATTENTION : une intention SANS date n'est jamais non faite. Elle est la
 * prochaine etape, elle n'a simplement pas encore de jour.
 */
export function seanceNonFaite(day: PlanningDay | null | undefined, today: string): boolean {
  return (
    !!day &&
    natureDe(day) === "seance" &&
    !!day.date &&
    day.date < today &&
    day.status === "planned"
  );
}

/**
 * ⚠️ LES DEUX SEULES FAÇONS D'ÉCRIRE UNE INTENTION, ET LA DIFFÉRENCE EST
 * LA RÈGLE DU MODÈLE : REMPLACER, C'EST MODIFIER L'INTENTION EXISTANTE ;
 * AJOUTER, C'EST EN CRÉER UNE. Un remplacement ne crée jamais de seconde
 * ligne, un ajout n'écrase jamais la première.
 *
 * ⚠️ ET PLUS AUCUN `on_conflict=user_id,date` : la contrainte disparaît
 * en V6b, donc PostgREST n'a plus rien sur quoi arbitrer. Ce qui décidait
 * en base décide désormais ici, en une seule fonction, à partir d'une
 * lecture de la journée visée.
 */
async function poser(
  userId: string,
  day: PlanningDay,
  origine: Origine,
  mode: "remplacer" | "ajouter",
): Promise<PlanningDay> {
  const supabase = createClient();
  const sc = await schemaIntentions();
  /* La journée VISÉE, pas celle d'où l'intention vient : c'est elle qui
     porte les voisines et la règle repos/séance. */
  const jour = await lireJour(userId, day.date);

  /* Quelle ligne écrit-on ? Une intention qui a une identité se modifie
     elle-même (on la déplace, on la remplace) ; sinon on reprend la
     principale de la journée, et JAMAIS une séance déjà faite : la
     réécrire effacerait un fait pour y mettre une intention. */
  const cible = day.id
    ?? (mode === "remplacer" ? ordonner(jour).find((i) => i.status !== "done")?.id ?? null : null);

  /* ⚠️ UNE ÉCRITURE REFUSÉE DOIT SE VOIR, ET C'EST LA FENÊTRE DE
     DÉPLOIEMENT QUI L'IMPOSE. Entre le moment où ce code part en
     production et celui où la migration retire `UNIQUE (user_id, date)`,
     poser une SECONDE intention sur une journée est refusé par la base.
     Avaler l'erreur laisserait l'écran afficher une séance qui n'existe
     pas : on la remonte, l'appelant dit que ça n'a pas marché. */
  let ecrit: PlanningDay;
  if (cible) {
    const { error } = await supabase
      .from(sc.table)
      .update(dayToRow(userId, day, origine, sc))
      .eq("id", cible)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    ecrit = { ...day, id: cible };
  } else {
    const { data, error } = await supabase
      .from(sc.table)
      .insert(dayToRow(userId, day, origine, sc))
      .select("id, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const ligne = (data ?? null) as { id?: string; created_at?: string } | null;
    ecrit = { ...day, id: ligne?.id ?? null, creeLe: ligne?.created_at ?? null };
  }

  /* ⚠️ LA RÈGLE QUE LA BASE NE PEUT PAS TENIR : UN REPOS ET UNE SÉANCE NE
     COEXISTENT PAS À LA MÊME DATE. Un `EXCLUDE` l'imposerait, mais il
     interdirait du même coup les suppléments, qui sont justement ce que
     V6b ouvre. C'est donc une règle d'ÉCRITURE, et elle vit ici, à
     l'endroit unique où l'on pose une intention délibérée : poser une
     séance sur un jour de repos retire le repos, poser un repos sur un
     jour de séances retire les séances encore prévues. Une journée qui
     porterait les deux serait exactement l'état ambigu qu'on refuse.

     ⚠️ ELLE NE TOUCHE JAMAIS UNE INTENTION FAITE. « Faire une séance non
     prévue un jour de repos ne touche à rien » : le fait est enregistré,
     le repos reste, et personne ne réécrit le passé. */
  const contraires = jour.filter(
    (i) => i.id && i.id !== ecrit.id && i.status !== "done" && natureDe(i) !== natureDe(day),
  );
  if (contraires.length > 0) {
    await supabase
      .from(sc.table)
      .delete()
      .eq("user_id", userId)
      .in("id", contraires.map((i) => i.id as string));
  }

  return ecrit;
}

/**
 * REMPLACE l'intention principale du jour (ou celle que `day.id` désigne).
 * C'est le geste de « Remplacer » et celui d'un déplacement : rien ne se
 * duplique. `origine` dit QUI l'a voulu.
 */
export async function saveDay(userId: string, day: PlanningDay, origine: Origine): Promise<PlanningDay> {
  return poser(userId, day, origine, "remplacer");
}

/**
 * AJOUTE une intention à la journée, sans toucher à ce qui s'y trouve
 * déjà. C'est le supplément : une séance principale et un extra le même
 * jour est un cas normal, et c'est la raison d'être de V6b.
 *
 * ⚠️ ELLE NE REFERME AUCUNE ÉTAPE (`etape_consommee_id` reste nul), ce qui
 * est exactement ce qui la range après la principale dans l'ordre de
 * lecture, et ce qui la laisse échapper à `uniq_intention_par_etape`.
 */
export async function ajouterIntention(userId: string, day: PlanningDay, origine: Origine): Promise<PlanningDay> {
  return poser(userId, { ...day, id: null }, origine, "ajouter");
}

/** Libère un jour : plus aucune intention, donc rien de prévu. C'est ce qui
 *  remplace le « Repos » qu'on écrivait sur le jour de départ d'un
 *  déplacement, et qui affirmait un repos que personne n'avait choisi.
 *
 *  ⚠️ ELLE EMPORTE TOUTE LA JOURNÉE, SUPPLÉMENTS COMPRIS, et c'est bien ce
 *  que « libérer le jour » veut dire. Ce qui est FAIT ne bouge jamais. */
export async function libererJours(userId: string, dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  const supabase = createClient();
  const sc = await schemaIntentions();
  await supabase
    .from(sc.table)
    .delete()
    .eq("user_id", userId)
    .neq(sc.colStatut, sc.versBase.done)
    .in("date", dates);
}

/**
 * Met à jour le statut d'UNE intention (planned → done après une séance).
 *
 * ⚠️ ELLE POSE AUSSI `consommee_le`, ET SANS ÇA LE CURSEUR DU CYCLE NE
 * PEUT PAS SE DÉRIVER : il s'ordonne par cette date, jamais par `date`,
 * une intention non datée n'en ayant pas. V2 a rempli la colonne pour
 * l'existant ; c'est ici qu'elle se tient à jour.
 */
export async function marquerIntention(userId: string, intentionId: string | null, status: DayStatus): Promise<void> {
  /* ⚠️ ELLE VISE UNE INTENTION, PLUS UNE DATE, ET C'EST TOUT V6b EN UNE
     LIGNE. Marquer « faite » par la date créditerait d'un coup la séance
     principale ET le supplément du même jour : on aurait fait une séance,
     l'app en compterait deux. Sans identité, on ne marque rien. */
  if (!intentionId) return;
  const supabase = createClient();
  const sc = await schemaIntentions();
  const maintenant = new Date().toISOString();
  await supabase
    .from(sc.table)
    .update({
      [sc.colStatut]: sc.versBase[status],
      consommee_le: status === "planned" ? null : maintenant,
      updated_at: maintenant,
    })
    .eq("id", intentionId)
    .eq("user_id", userId);
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

type Lieu = { location: "salle" | "maison" | null; equip: "halteres" | "poids" | null };

/** Le localStorage n'est PAS une autorite : c'est le cache qui permet a
 *  `readLieu` de repondre de facon synchrone. Il se remplit depuis la base,
 *  jamais l'inverse. */
function hydraterLieuLocal(userId: string, location: string | null, equip: string | null): void {
  try {
    if (location) localStorage.setItem(`vaiiya_lieu_${userId}`, location);
    if (equip) localStorage.setItem(`vaiiya_lieu_equip_${userId}`, equip);
  } catch { /* navigation privee, stockage plein : le cache est optionnel */ }
}

/**
 * Lit le lieu depuis la BASE (cross-device) puis retombe sur le localStorage.
 * Hydrate le localStorage de l'appareil au passage (pour les lectures synchrones
 * de `readLieu`). Défensif : si les colonnes n'existent pas encore (migration non
 * passée), la requête échoue silencieusement → fallback localStorage, zéro régression.
 */
export async function loadLieu(userId: string): Promise<Lieu> {
  /* ── 1. La source unique (V3) ──────────────────────────────────────
     `contexte_entrainement` est le DEFAUT de la chaine de surcharge
     (intention -> adaptation -> programme -> contexte). On la demande en
     premier ; si la table n'existe pas encore (migration non collee), la
     requete echoue et on retombe sur `profiles` exactement comme avant.
     Une absence de ligne veut dire "on ne sait pas", pas "rien". */
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contexte_entrainement")
      .select("lieu, materiel")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) {
      const row = data as { lieu?: string | null; materiel?: string | null };
      const location = row.lieu === "salle" || row.lieu === "maison" ? row.lieu : null;
      const equip = row.materiel === "halteres" || row.materiel === "poids" ? row.materiel : null;
      if (location || equip) {
        hydraterLieuLocal(userId, location, equip);
        return { location, equip };
      }
    }
  } catch { /* table absente -> on continue sur l'ancien modele */ }

  /* ── 2. L'ancien modele, tenu a jour par le dual-write ── */
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("training_location, training_equipment")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) {
      const row = data as { training_location?: string | null; training_equipment?: string | null };
      const location = row.training_location === "salle" || row.training_location === "maison" ? row.training_location : null;
      const equip = row.training_equipment === "halteres" || row.training_equipment === "poids" ? row.training_equipment : null;
      if (location || equip) {
        hydraterLieuLocal(userId, location, equip);
        return { location, equip };
      }
    }
  } catch { /* colonnes absentes → fallback */ }
  // Rien en base : on prend le localStorage de cet appareil et on le REMONTE en
  // base (fire-and-forget) → la synchro cross-device démarre sans re-réglage.
  const local = readLieu(userId);
  if (local.location || local.equip) {
    void persistLieu(userId, {
      ...(local.location ? { location: local.location } : {}),
      ...(local.equip ? { equip: local.equip } : {}),
    });
  }
  return local;
}

/**
 * Persiste le lieu en base (cross-device) ET en localStorage. On ne passe que les
 * champs fournis (une carte qui ne règle que le lieu ne doit pas effacer le
 * matériel). Défensif : si les colonnes n'existent pas, on garde au moins le
 * localStorage.
 */
export async function persistLieu(userId: string, patch: { location?: "salle" | "maison"; equip?: "halteres" | "poids" }): Promise<void> {
  try {
    if (patch.location) localStorage.setItem(`vaiiya_lieu_${userId}`, patch.location);
    if (patch.equip) localStorage.setItem(`vaiiya_lieu_equip_${userId}`, patch.equip);
  } catch { /* ignore */ }
  /* ⚠️ DUAL-WRITE, ET C'EST LA CORRECTION POSEE PAR LOUIS AU PLAN DE V3.
     On ecrit dans LES DEUX modeles jusqu'a stabilisation. Sans ca, le
     rollback de cette vague supposerait que `profiles.training_location`
     reste a jour, ce qui cesse d'etre vrai des que la nouvelle table
     devient l'autorite : revenir en arriere demanderait alors un backfill
     inverse. Les deux ecritures sont INDEPENDANTES : l'une qui echoue ne
     doit pas emporter l'autre. */
  try {
    const supabase = createClient();
    const dbPatch: Record<string, string> = {};
    if (patch.location) dbPatch.training_location = patch.location;
    if (patch.equip) dbPatch.training_equipment = patch.equip;
    if (Object.keys(dbPatch).length) await supabase.from("profiles").update(dbPatch).eq("id", userId);
  } catch { /* colonnes absentes → localStorage seul */ }

  try {
    const supabase = createClient();
    const ctxPatch: Record<string, string> = { user_id: userId };
    if (patch.location) ctxPatch.lieu = patch.location;
    if (patch.equip) ctxPatch.materiel = patch.equip;
    /* `upsert` et pas `update` : la personne peut n'avoir jamais eu de
       ligne (rien a reprendre au backfill). On ne passe QUE les champs
       fournis, donc regler le lieu n'efface pas le materiel. */
    if (Object.keys(ctxPatch).length > 1) {
      await supabase.from("contexte_entrainement").upsert(ctxPatch, { onConflict: "user_id" });
    }
  } catch { /* table absente → ancien modele seul, zero regression */ }
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
