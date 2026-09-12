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
  /**
   * D'OÙ VIENT LE CONTENU, ce qui n'est PAS « quelle étape est refermée ».
   *
   * ⚠️ LES DEUX COLONNES EXISTENT DEPUIS V4 ET UNE SEULE ÉTAIT ÉCRITE,
   * C'EST LE DÉFAUT DU 2026-09-08. « Refais ma semaine » compose ses
   * journées depuis le cycle de référence : leur contenu vient bel et
   * bien d'une étape, mais elles n'en RÉSERVENT aucune (la rotation part
   * toujours de la première étape, elle ignore le curseur). Sans cette
   * colonne, ces journées n'avaient plus aucun lien avec le programme,
   * et une adaptation ne pouvait pas voir qu'une étape qu'elle masque
   * était déjà posée : le conflit ne se déclenchait jamais.
   *
   * ⚠️ ELLE NE REFERME RIEN, ET C'EST TOUT L'INTÉRÊT. Elle échappe donc à
   * `uniq_intention_par_etape` (qui ne porte que sur `etape_consommee_id`),
   * elle ne bouge pas le curseur, et une semaine peut reposer deux fois
   * la même étape sans que la base ne s'y oppose.
   */
  provenanceId?: string | null;
  /**
   * V8 · L'ADAPTATION SOUS LAQUELLE CETTE INTENTION A ÉTÉ MATÉRIALISÉE.
   *
   * ⚠️ ELLE TRACE, ELLE NE DÉCIDE RIEN. Aucune lecture ne s'en sert pour
   * savoir quoi proposer : ce que le moteur applique, c'est l'adaptation
   * ACTIVE aujourd'hui, jamais celle qu'une vieille ligne cite. Et rien
   * ne rétro-étiquette une intention parce que sa date tombe dans une
   * période : on n'écrit cette colonne qu'au moment où l'on écrit la
   * ligne.
   */
  adaptationId?: string | null;
  /** Départage deux suppléments : le plus ancien d'abord. Absente d'une
   *  intention qui n'est pas encore en base. */
  creeLe?: string | null;
  /**
   * V9B · LE DERNIER AUTEUR DÉLIBÉRÉ, ENFIN RELU.
   *
   * La colonne existe depuis V2 et personne ne la lisait : `dayToRow`
   * l'écrivait depuis son argument, et aucun `select` ne la redemandait.
   * Conséquence, trouvée en auditant `plan_regen` : le Guide ne pouvait
   * pas distinguer le mobilier automatique d'une séance posée à la main,
   * donc « refais ma semaine » les effaçait toutes les deux.
   *
   * ⚠️ ELLE SE LIT, ELLE NE S'ÉCRIT PAS D'ICI. C'est toujours l'argument
   * `origine` de `saveDay` / `ajouterIntention` qui décide de ce qui part
   * en base : deux sources pour la même colonne finiraient par diverger.
   * Absente d'une intention qu'on vient de fabriquer.
   */
  origine?: Origine | null;
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

/** Les 7 dates de la semaine décalée de `offset` semaines vs `ref`. */
export function weekDatesForOffset(offset: number, ref: Date = new Date()): string[] {
  const base = new Date(ref); base.setDate(base.getDate() + offset * 7);
  return weekDates(base);
}

/**
 * V9C ter · LA PÉRIODE QU'UNE RÉGÉNÉRATION VISE.
 *
 * ⚠️ ELLE N'EXISTAIT PAS, ET C'ÉTAIT LE TROU : « refais ma semaine » et
 * « fais ma prochaine semaine » arrivaient sous exactement la même forme,
 * donc les deux visaient `weekDates()`, c'est-à-dire la semaine civile en
 * cours. Un vendredi, il n'en restait presque plus rien à écrire ; un
 * dimanche, plus rien du tout, et le Guide répondait « redemande-moi
 * lundi » à quelqu'un qui préparait justement la semaine d'après.
 */
export type PeriodeSemaine = "cette_semaine" | "semaine_prochaine";

/**
 * Les 7 dates (lundi → dimanche) de la semaine visée.
 *
 * ⚠️ `ref` EST INJECTABLE EXPRÈS. Le défaut ne se voit qu'un jour sur
 * sept, et les deux passages qui cassent une arithmétique de dates (le
 * changement de mois, le changement d'année) ne se voient qu'une fois par
 * mois et une fois par an. Un banc qui ne peut pas choisir son jour ne
 * les rencontrera jamais.
 */
export function semaineVisee(periode: PeriodeSemaine, ref: Date = new Date()): string[] {
  return weekDatesForOffset(periode === "semaine_prochaine" ? 1 : 0, ref);
}

/**
 * « du jeudi 11 au dimanche 14 septembre », pour NOMMER la période avant
 * le clic.
 *
 * ⚠️ ON NOMME LA FENÊTRE RÉELLEMENT CONCERNÉE, PAS LA SEMAINE CIVILE.
 * Une régénération de la semaine en cours ne touche pas au passé : dire
 * « la semaine du lundi 8 » alors qu'on est jeudi promettrait de refaire
 * trois jours déjà vécus.
 *
 * Le mois ne s'écrit qu'une fois quand les deux bornes le partagent : une
 * semaine qui chevauche deux mois (ou deux années) les porte tous les
 * deux, sinon la borne de départ deviendrait ambiguë.
 */
export function libelleFenetre(dates: string[]): string {
  const debut = dates[0];
  const fin = dates[dates.length - 1];
  if (!debut) return "";
  if (!fin || fin === debut) return `le ${dayLabelLong(debut)}`;
  const memeMois = debut.slice(0, 7) === fin.slice(0, 7);
  const court = new Date(debut + "T00:00:00")
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
  return `du ${memeMois ? court : dayLabelLong(debut)} au ${dayLabelLong(fin)}`;
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

/**
 * LE CYCLE PERSISTÉ, TEL QUE LE GÉNÉRATEUR DE SEMAINE A BESOIN DE LE
 * CONNAÎTRE.
 *
 * ⚠️ IL NE SERT PAS À CHOISIR LES SÉANCES, IL SERT À LEUR DONNER LEUR
 * IDENTITÉ. `buildSplit` compose déjà exactement les mêmes noms que
 * `programme_seances` (c'est la même fonction depuis V4.5, et
 * l'équivalence a été balayée) : ce qui manquait, c'était de RETROUVER
 * l'étape derrière le nom au moment d'écrire, pour que la ligne porte sa
 * provenance au lieu d'un titre.
 */
export interface CycleSemaine {
  programmeId: string;
  /** Le cycle du programme actif, avec son identifiant par étape. */
  etapes: { id: string; nom: string }[];
  /** Les IDENTIFIANTS d'étapes qu'une adaptation masque. */
  masquees: string[];
}

/**
 * ⚠️ V8 · CE CHEMIN DOIT RESPECTER L'ADAPTATION COMME LE HÉROS.
 * « Refais ma semaine » est le second endroit du produit capable de POSER
 * une étape du cycle : le laisser reposer une étape que l'adaptation
 * masque, c'est réintroduire par la porte du planning ce qu'on vient
 * d'écarter à l'accueil, et la personne le découvrirait le jour où la
 * séance arrive.
 *
 * ⚠️ ET IL MASQUE PAR IDENTIFIANT, PLUS PAR NOM (2026-09-08). Il était
 * jusqu'ici le seul endroit du produit qui raisonnait encore en noms de
 * split, faute de connaître le cycle persisté. Maintenant qu'il le
 * connaît, l'exception disparaît : les axes d'adaptation portent des
 * identifiants partout, sans traduction.
 *
 * ⚠️ ON FILTRE LE SPLIT, ON NE SAUTE PAS UN JOUR. La rotation ne tourne
 * plus que sur les étapes compatibles, exactement comme `etapeSuivante`.
 * Si aucune ne l'est, la semaine ne porte AUCUNE séance : on n'invente
 * pas une séance de remplacement, et une séance vide serait pire.
 *
 * ⚠️ CE QU'IL POSE PROVIENT D'UNE ÉTAPE, IL N'EN RÉSERVE AUCUNE. La
 * rotation repart toujours de la première étape et ignore le curseur :
 * lui faire écrire `etape_consommee_id` ferait refermer des étapes que
 * personne n'a choisi de réserver, et deux jours qui retombent sur la
 * même étape se feraient refuser par `uniq_intention_par_etape`.
 */
function generateWeek(gen: GenInput, dates: string[], cycle: CycleSemaine | null = null): PlanningDay[] {
  const sessions = seancesDuCycle(gen.sessions);
  const rng = mulberry32(hashStr(`${gen.seed}-${gen.ctx}-s${sessions}-v${gen.variant}`));
  const parNom = new Map((cycle?.etapes ?? []).map((e) => [e.nom, e]));
  const masquees = new Set(cycle?.masquees ?? []);
  const estMasquee = (nom: string) => {
    const e = parNom.get(nom);
    return !!e && masquees.has(e.id);
  };
  const split = buildSplit(sessions).filter((nom) => !estMasquee(nom));
  const trainingDays = REST_PATTERN[sessions] ?? [0, 2, 4];
  const scheme = repSchemeFor(gen.goals);
  const difficulty = levelToDifficulty(gen.level);

  return dates.map((date, dayIdx) => {
    const pos = split.length === 0 ? -1 : trainingDays.indexOf(dayIdx);
    if (pos === -1) {
      return { id: null, date, type: "Repos", title: "", difficulty, location: gen.ctx, exerciseList: [], sessionId: null, status: "planned" as DayStatus, provenanceId: null, programmeId: null };
    }
    const sessionType = split[pos % split.length];
    const isCardio = sessionType.includes("Cardio");
    const bank = EX[gen.ctx][sessionType] ?? EX[gen.ctx]["Full Body"];
    const exerciseList = shuffleArr(bank, rng).slice(0, 5).map((p) => toExercise(p, scheme));
    const source = parNom.get(sessionType) ?? null;
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
      /* Les deux ensemble ou aucun des deux : la clé étrangère est
         COMPOSITE, et un `CHECK` refuse une provenance sans programme. */
      programmeId: source ? cycle!.programmeId : null,
      provenanceId: source ? source.id : null,
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
export function previewWeek(gen: GenInput, dates: string[] = weekDates(), cycle: CycleSemaine | null = null): PlanningDay[] {
  return generateWeek(gen, dates, cycle);
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

/* ⚠️ V8 · LE MÊME PROCÉDÉ, POUR LA COLONNE `adaptation_id`, ET IL EST
   AUSSI OBLIGATOIRE QU'EN V6. Les migrations SQL se collent à la main :
   entre le déploiement du code et l'application de la migration, demander
   une colonne qui n'existe pas fait échouer la requête ENTIÈRE. Sans ce
   sondage, toutes les lectures et toutes les écritures du planning
   tomberaient d'un coup pendant cette fenêtre, pour une colonne qui ne
   sert qu'à tracer.

   Une requête par session, mémorisée, et le repli est le comportement
   d'avant V8 : pas de colonne, pas d'adaptation, l'app d'hier. */
let adaptationsResolu: boolean | null = null;
let sondageAdaptations: Promise<boolean> | null = null;

export async function adaptationsDisponibles(client?: ClientLike): Promise<boolean> {
  if (adaptationsResolu !== null) return adaptationsResolu;
  if (sondageAdaptations) return sondageAdaptations;
  sondageAdaptations = (async () => {
    try {
      const c = client ?? (createClient() as unknown as ClientLike);
      const { error } = await c.from("adaptations_entrainement").select("id").limit(1);
      adaptationsResolu = !error;
    } catch {
      adaptationsResolu = false;
    }
    sondageAdaptations = null;
    return adaptationsResolu;
  })();
  return sondageAdaptations;
}

/** Les colonnes à demander, avec le bon nom de statut.
 *
 *  ⚠️ `id` ET `created_at` ONT REJOINT LA LISTE EN V6b, et ce n'est pas du
 *  confort : une date ne désigne plus une ligne, donc il faut de quoi
 *  désigner celle qu'on modifie, et de quoi ordonner celles d'une même
 *  journée. `etape_consommee_id` porte la hiérarchie (l'étape d'abord). */
function colonnes(s: SchemaIntentions, avecAdaptation: boolean): string {
  return `id, date, type, title, difficulty, location, exercise_list, session_id, programme_id, programme_seance_id, etape_consommee_id, origine, created_at, ${s.colStatut}`
    + (avecAdaptation ? ", adaptation_id" : "");
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
  programme_seance_id?: string | null;
  etape_consommee_id?: string | null;
  adaptation_id?: string | null;
  origine?: string | null;
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
    /* ⚠️ RELUE POUR LA MÊME RAISON QUE `programmeId` : `saveDay` réécrit la
       ligne entière, donc sans cette lecture un simple déplacement
       effacerait la provenance, et l'adaptation cesserait de voir le
       conflit dès qu'on aurait bougé la séance d'un jour. */
    provenanceId: r.programme_seance_id ?? null,
    adaptationId: r.adaptation_id ?? null,
    /* ⚠️ RELUE EN V9B, ET SANS ELLE « refais ma semaine » NE PEUT PAS
       FAIRE LA DIFFÉRENCE entre le mobilier qu'il a le droit de retirer
       et une séance que quelqu'un a posée. Un mot inconnu ne vaut donc
       jamais « systeme » : dans le doute, la ligne est protégée. */
    origine: (r.origine as Origine | null) ?? null,
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
 * Le lien de cette intention avec le programme, EN TROIS COLONNES QUI NE
 * DISENT PAS LA MÊME CHOSE.
 *
 * ⚠️ IL SE DÉCLARE, IL NE SE DEVINE PAS. Une intention ne referme une
 * étape que si celui qui l'a écrite l'a voulu : dater explicitement la
 * prochaine étape du programme, oui ; ajouter une séance du catalogue ou
 * une séance perso qui s'appelle « Push », non. Déduire la consommation
 * du titre ferait avancer le cycle sur une ressemblance de mots.
 *
 * ⚠️ ⚠️ ET LA PROVENANCE NE SE DÉDUIT PLUS DE LA CONSOMMATION (V9C).
 * Cette fonction écrivait `source = d.etapeId ?? d.provenanceId` : dès
 * qu'une étape était refermée, la provenance valait cette étape, quoi que
 * l'appelant ait déclaré. C'était juste tant que les deux seuls gestes
 * possibles étaient « je fais ce que le programme propose » et « je pose
 * autre chose sans rien refermer ». Une SUBSTITUTION est exactement le
 * troisième cas : elle referme Pull et son contenu vient d'ailleurs, donc
 * `programme_seance_id` doit pouvoir rester nul alors que
 * `etape_consommee_id` ne l'est pas. Cette ligne était LE SEUL endroit du
 * TypeScript qui rendait ce cas impossible à représenter.
 *
 * Corollaire, et c'est la contrepartie du gain : LES GESTES QUI VEULENT
 * LES DEUX LES DÉCLARENT TOUS LES DEUX. Réserver la prochaine étape
 * (`intentionDeLEtape`, V7A) écrit désormais `provenanceId` en toutes
 * lettres au lieu de l'obtenir par effet de bord.
 *
 * ⚠️ `programme_id` RESTE INDISSOCIABLE DES DEUX AUTRES. Les clés
 * étrangères sont COMPOSITES (V4) et deux `CHECK` refusent une étape ou
 * une provenance sans son programme : écrire `etape_consommee_id` seul
 * ferait rejeter la ligne par la base. En revanche `programme_seance_id`
 * nul À CÔTÉ d'un `etape_consommee_id` posé est parfaitement légal, la FK
 * composite étant en `MATCH SIMPLE` : c'est exactement ce qui autorise
 * une substitution par le catalogue ou par la bibliothèque.
 *
 * ⚠️ ET IL S'ÉCRIT TOUJOURS, MÊME À `null`. Omettre les colonnes dans un
 * `update` les laisserait en place : remplacer une réservation d'étape
 * par une séance du catalogue lui ferait alors refermer une étape que
 * personne ne lui a confiée.
 */
export function lienProgramme(d: Pick<PlanningDay, "programmeId" | "etapeId" | "provenanceId">) {
  const prog = d.programmeId ?? null;
  /* D'OÙ VIENT LE CONTENU : ce que l'appelant DÉCLARE, et rien d'autre. */
  const provenance = prog ? d.provenanceId ?? null : null;
  /* QUELLE ÉTAPE EST REFERMÉE : seulement si on a déclaré la réserver. */
  const consommee = prog ? d.etapeId ?? null : null;
  return {
    programme_id: provenance || consommee ? prog : null,
    programme_seance_id: provenance,
    etape_consommee_id: consommee,
  };
}

function dayToRow(userId: string, d: PlanningDay, origine: Origine, s: SchemaIntentions, avecAdaptation: boolean) {
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
    /* ⚠️ ÉCRITE COMME `lienProgramme` : toujours, même à `null`. Omettre
       la colonne dans un `update` laisserait la trace d'une adaptation
       finie sur une intention qu'on vient de réécrire ; et parce que
       `rowToDay` la relit, un simple déplacement la conserve. */
    ...(avecAdaptation ? { adaptation_id: d.adaptationId ?? null } : {}),
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
export async function reposerLaSemaine(
  userId: string,
  gen: GenInput,
  dates: string[] = weekDates(),
  /* Le cycle du programme actif, avec les étapes que l'adaptation masque.
     `null` = aucun programme lu, donc exactement le comportement d'avant
     V8 : des séances composées par nom, sans lien avec le programme. */
  cycle: CycleSemaine | null = null,
): Promise<PlanningDay[]> {
  const supabase = createClient();
  const sc = await schemaIntentions();
  const avecAdaptation = await adaptationsDisponibles();
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
  const seances = generateWeek(gen, dates, cycle)
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
      .insert(seances.map((d) => dayToRow(userId, d, "systeme", sc, avecAdaptation)));
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
  const avecAdaptation = await adaptationsDisponibles();
  const { data } = await supabase
    .from(sc.table)
    .select(colonnes(sc, avecAdaptation))
    .eq("user_id", userId)
    .eq("date", date);
  return ordonner((data ?? []).map((r) => rowToDay(r as unknown as PlanningRow, sc)));
}

/**
 * UNE intention, par son identité.
 *
 * ⚠️ ELLE EXISTE POUR QU'UNE QUESTION POSÉE AU GUIDE SURVIVE À UN
 * RECHARGEMENT (V9B). Quand deux séances portent le même nom, on demande
 * laquelle : la réponse désigne un identifiant, et c'est la base qui rend
 * la ligne au moment du clic. Garder les candidates en mémoire aurait
 * rendu la question inerte au premier rafraîchissement, sans rien dire.
 */
export async function lireIntention(userId: string, intentionId: string): Promise<PlanningDay | null> {
  const supabase = createClient();
  const sc = await schemaIntentions();
  const avecAdaptation = await adaptationsDisponibles();
  const { data } = await supabase
    .from(sc.table)
    .select(colonnes(sc, avecAdaptation))
    .eq("user_id", userId)
    .eq("id", intentionId)
    .maybeSingle();
  return data ? rowToDay(data as unknown as PlanningRow, sc) : null;
}

/** Récupère plusieurs jours en UNE requête, indexés par date (YYYY-MM-DD).
 *  Chaque date porte SA LISTE d'intentions, déjà ordonnée. */
export async function fetchRange(userId: string, dates: string[]): Promise<Record<string, PlanningDay[]>> {
  if (dates.length === 0) return {};
  const supabase = createClient();
  const sc = await schemaIntentions();
  const avecAdaptation = await adaptationsDisponibles();
  const { data } = await supabase
    .from(sc.table)
    .select(colonnes(sc, avecAdaptation))
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

/* ═══════ V9B · CE QU'UN GESTE A LE DROIT DE TOUCHER ═══════

   Trois prédicats, tous nés d'un défaut réel, et tous PURS pour qu'un banc
   puisse les exercer hors ligne.

   ⚠️ RÉSERVER UNE ÉTAPE N'EST PAS PROVENIR D'UNE ÉTAPE, et la nuance sert
   à DIRE, pas à décider qui se fait écraser. Une réservation (V7A) porte
   `etape_consommee_id` : c'est la PROMESSE qu'une étape du cycle sera
   refermée ce jour-là. Une séance composée par « refais ma semaine » ne
   porte que sa provenance : elle dit d'où venait son contenu, elle ne
   referme rien. La carte n'annonce donc pas la même conséquence dans les
   deux cas.

   ⚠️ ⚠️ MAIS AUCUNE DES DEUX N'EST UNE CIBLE IMPLICITE, ET C'EST LA
   CORRECTION DU 2026-09-09, TROUVÉE PAR LOUIS AU PREMIER ESSAI RÉEL.
   La première version de V9B n'écartait que la réservation, en se disant
   qu'une provenance « tombe avec le contenu qu'elle décrivait ». C'est
   faux dès qu'on le regarde en face : `dayToRow` réécrit la ligne
   ENTIÈRE, `lienProgramme` écrit ses trois colonnes même à `null`, donc
   remplacer une séance qui provient d'une étape DÉTRUIT son lien au
   programme, en silence, exactement comme pour une réservation. Et ce
   lien n'est pas décoratif : depuis V8 c'est lui qui fait qu'une séance
   posée sur une étape masquée BLOQUE l'activation d'une adaptation
   (`reservationsEnConflit` lit `etapeId ?? provenanceId`). Le geste
   annonçait « ta progression de programme ne change pas » et emportait
   l'identité que la vague d'avant avait passé un correctif entier à
   écrire.

   La règle est donc plus simple qu'elle ne l'était : UNE LIGNE QUI PORTE
   UNE IDENTITÉ DE PROGRAMME NE SE FAIT PAS ÉCRASER PAR UN GESTE QU'ON N'A
   PAS DEMANDÉ. On s'écarte, on ajoute à côté, et la carte le dit. La
   remplacer pour de bon est une SUBSTITUTION : elle se déclare, elle
   nomme son effet sur le cycle, et c'est V9C.
*/

/** Cette intention RÉSERVE-t-elle une étape du cycle ? */
export function reserveUneEtape(d: PlanningDay | null | undefined): boolean {
  return !!d?.etapeId;
}

/**
 * Cette intention porte-t-elle une identité de programme, quelle qu'elle
 * soit : la promesse de refermer une étape, ou seulement l'étape d'où son
 * contenu venait ?
 *
 * ⚠️ C'EST LE MÊME COUPLE DE COLONNES QUE `reservationsEnConflit` (V8),
 * ET CE N'EST PAS UNE COÏNCIDENCE : ce qui vaut identité pour bloquer une
 * adaptation vaut identité pour refuser un écrasement muet. Deux
 * définitions du « lien au programme » finiraient par diverger, d'où
 * `etapeLiee` juste au-dessus : elle est désormais la SEULE, et les trois
 * endroits qui posaient la question passent par elle.
 *
 * ⚠️ ET L'ORDRE DES DEUX COLONNES EST LA RÈGLE, PAS UN RACCOURCI.
 * `etapeId` dit QUELLE étape la ligne referme ; `provenanceId` dit
 * seulement d'où son contenu venait. Quand les deux existent (une
 * substitution déjà posée), c'est la promesse de fermeture qui compte.
 */
export function etapeLiee(
  d: Pick<PlanningDay, "etapeId" | "provenanceId"> | null | undefined,
): string | null {
  return d?.etapeId ?? d?.provenanceId ?? null;
}

export function vientDuProgramme(d: PlanningDay | null | undefined): boolean {
  return etapeLiee(d) !== null;
}

/**
 * L'intention qu'un « remplacer » a le droit de réécrire sur cette
 * journée, ou `null` s'il n'y en a aucune (le geste devient alors un
 * ajout, jamais un écrasement).
 *
 * ⚠️ C'EST LA CORRECTION DU DÉFAUT LE PLUS COÛTEUX DE V9B, ET IL ÉTAIT
 * MUET. `poser` prenait « la première intention non résolue » ; or
 * `ordonner` met justement l'étape en tête, donc dès qu'une réservation
 * existait, c'était ELLE que le geste visait. `dayToRow` réécrit la ligne
 * entière et `lienProgramme` écrit ses trois colonnes MÊME À `null` : une
 * réservation ciblée cessait donc d'être une réservation. Elle restait
 * là, à la bonne date, prévue, mais sans son étape. Le curseur ne bougeait
 * pas, le héros reproposait l'étape comme libre, et personne n'était
 * prévenu. C'est exactement la substitution non déclarée que le modèle
 * interdit depuis V4.
 *
 * ⚠️ ET LE FILTRE PORTE SUR `vientDuProgramme`, PAS SUR LA SEULE
 * RÉSERVATION. Écarter la réservation et garder la séance régénérée
 * laissait le geste réécrire une ligne qui portait `programme_id` et
 * `programme_seance_id` : le lien partait à `null` sans un mot, et la
 * carte annonçait pourtant « ta progression de programme ne change pas ».
 * Ce qui reste remplaçable est ce qui ne vient d'aucune étape : une
 * séance du catalogue, une impro, une séance perso, une semaine posée
 * avant que la provenance ne s'écrive.
 *
 * ⚠️ ON NE CONVERTIT PAS, ON NE DEVINE PAS : on s'écarte. Remplacer le
 * CONTENU d'une séance de programme est une substitution, elle se
 * déclarera en V9C avec sa confirmation à elle.
 */
export function cibleRemplacable(jour: PlanningDay[] | null | undefined): PlanningDay | null {
  return ordonner(jour).find((i) => i.status !== "done" && !vientDuProgramme(i)) ?? null;
}

/**
 * Cette intention est-elle du MOBILIER, c'est-à-dire quelque chose que
 * personne n'a délibérément posé et qu'une régénération peut retirer ?
 *
 * ⚠️ TROIS CONDITIONS, ET AUCUNE N'EST DÉCORATIVE : encore prévue (un
 * fait ne se retire pas), écrite par le système (`origine`, la colonne
 * que V9B a enfin rebranchée en lecture), et ne réservant aucune étape
 * (une réservation n'est jamais du mobilier, quoi qu'en dise son
 * origine). Un statut ou une origine qu'on ne comprend pas rend `false` :
 * dans le doute, on protège.
 *
 * ⚠️ ET CE PRÉDICAT-CI GARDE `reserveUneEtape`, LÀ OÙ `cibleRemplacable`
 * EST PASSÉ À `vientDuProgramme` : la différence n'est pas un oubli,
 * c'est la portée du geste. « Refais ma semaine » a précisément pour
 * métier de remplacer le mobilier qu'il a lui-même posé, provenance
 * comprise ; l'en empêcher rendrait le bouton inerte dès la deuxième
 * fois. `plan_set`, lui, vise UN jour qu'on ne lui a pas demandé de
 * refaire.
 */
export function estMobilier(d: PlanningDay | null | undefined): boolean {
  return !!d && d.status === "planned" && d.origine === "systeme" && !reserveUneEtape(d);
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
  const avecAdaptation = await adaptationsDisponibles();
  /* La journée VISÉE, pas celle d'où l'intention vient : c'est elle qui
     porte les voisines et la règle repos/séance. */
  const jour = await lireJour(userId, day.date);

  /* Quelle ligne écrit-on ? Une intention qui a une identité se modifie
     elle-même (on la déplace, on la remplace) ; sinon on reprend la
     principale de la journée, et JAMAIS une séance déjà faite : la
     réécrire effacerait un fait pour y mettre une intention. */
  /* ⚠️ UNE SEULE RÈGLE DE CIBLAGE, ET LE GUIDE LIT LA MÊME (V9B). Elle
     est exportée exprès : la carte de confirmation doit pouvoir NOMMER ce
     qu'elle va remplacer avant le clic, et une seconde règle écrite
     ailleurs finirait par annoncer autre chose que ce qui s'écrit. */
  const cible = day.id
    ?? (mode === "remplacer" ? cibleRemplacable(jour)?.id ?? null : null);

  /* ⚠️ UNE ÉCRITURE REFUSÉE DOIT SE VOIR, ET C'EST LA FENÊTRE DE
     DÉPLOIEMENT QUI L'IMPOSE. Entre le moment où ce code part en
     production et celui où la migration retire `UNIQUE (user_id, date)`,
     poser une SECONDE intention sur une journée est refusé par la base.
     Avaler l'erreur laisserait l'écran afficher une séance qui n'existe
     pas : on la remonte, l'appelant dit que ça n'a pas marché. */
  let ecrit: PlanningDay;
  if (cible) {
    const { data, error } = await supabase
      .from(sc.table)
      .update(dayToRow(userId, day, origine, sc, avecAdaptation))
      .eq("id", cible)
      .eq("user_id", userId)
      /* ⚠️ ON NE RÉÉCRIT JAMAIS UN FAIT. `retirerIntention` porte ce
         filtre depuis V8 ; il manquait ici, alors que c'est la seule
         écriture capable d'effacer une séance déjà terminée. */
      .neq(sc.colStatut, sc.versBase.done)
      .select("id");
    if (error) throw new Error(error.message);
    /* ⚠️ ZÉRO LIGNE TOUCHÉE EST UN ÉCHEC, PAS UN SUCCÈS SILENCIEUX, ET
       V9B EN A BESOIN. Le Guide DÉCLARE désormais l'identité qu'il vise au
       moment de composer sa carte, et l'applique au clic : entre les deux,
       la ligne peut avoir été retirée ailleurs ou terminée. Sans ce
       contrôle, l'écran annoncerait un déplacement que la base n'a jamais
       fait — le mode d'échec muet qu'on passe cette vague à fermer. */
    if (!data || data.length === 0) throw new Error("cette séance a changé depuis, relis ton planning");
    ecrit = { ...day, id: cible };
  } else {
    const { data, error } = await supabase
      .from(sc.table)
      .insert(dayToRow(userId, day, origine, sc, avecAdaptation))
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
  /* ⚠️ « ENCORE PRÉVUE », ET PLUS « PAS FAITE » (V9C). Le filtre disait
     `status !== "done"`, ce qui était sans conséquence tant que rien
     n'écrivait `passee` : les deux seuls statuts en base étaient `prevue`
     et `faite`. V9C écrit le troisième, et poser un repos sur une journée
     portant une étape SAUTÉE aurait supprimé la ligne du saut, donc fait
     RECULER le curseur du cycle sans un mot. On ne touche donc qu'à ce
     qui est encore prévu : une intention résolue est un fait, quelle que
     soit la façon dont elle s'est résolue. */
  const contraires = jour.filter(
    (i) => i.id && i.id !== ecrit.id && i.status === "planned" && natureDe(i) !== natureDe(day),
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

/* ⚠️ `libererJours` A ÉTÉ SUPPRIMÉE À LA CLÔTURE DU CHANTIER, ET CE
   N'EST PAS DU RANGEMENT : ELLE N'AVAIT PLUS D'APPELANT DEPUIS V9B ET
   ELLE SUPPRIMAIT UNE JOURNÉE ENTIÈRE. Suppléments, séances posées à la
   main et réservations d'étape partaient avec le mobilier : c'est
   exactement la destruction silencieuse que V9B a passé un correctif à
   fermer, et son nom (« libérer le jour ») est celui qu'un futur
   appelant choisirait spontanément. Une arme chargée qui dort dans un
   tiroir finit par servir. Ce qui la remplace existe et vise juste :
   `libererMobilier` (V9B, trois conditions) pour une régénération,
   `retirerIntention` (V8) pour UNE ligne. */

/**
 * V9B · LIBÈRE LE MOBILIER AUTOMATIQUE DE CES JOURS, ET RIEN D'AUTRE.
 *
 * ⚠️ C'EST LA CORRECTION DU SECOND DÉFAUT PROUVÉ. « Refais ma semaine »
 * dit au Guide appelait `libererJours` sur tous les jours à venir, donc il
 * supprimait TOUTES les intentions encore prévues : les réservations
 * d'étapes, les suppléments, et les séances posées à la main. Le bouton
 * d'Entraînement, lui, ne retirait que `origine = 'systeme'` depuis V5 :
 * les deux chemins faisaient le même geste avec deux portées, et c'est le
 * plus destructeur qui n'avait aucune carte pour le dire.
 *
 * ⚠️ LE TRI SE FAIT EN BASE, PAS SUR CE QUE L'ÉCRAN A LU. Une
 * régénération porte sur des dates, pas sur des lignes chargées : filtrer
 * côté client laisserait passer tout ce qui a été écrit depuis le dernier
 * rafraîchissement. Les trois conditions sont celles d'`estMobilier`.
 *
 * ⚠️ ET `etape_consommee_id IS NULL` EST UNE CEINTURE, PAS UNE ÉLÉGANCE.
 * Une réservation ne devrait jamais porter `origine = 'systeme'` ; si elle
 * le faisait, c'est ce filtre-là qui l'empêcherait de disparaître.
 */
export async function libererMobilier(userId: string, dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  const supabase = createClient();
  const sc = await schemaIntentions();
  const { error } = await supabase
    .from(sc.table)
    .delete()
    .eq("user_id", userId)
    .eq(sc.colStatut, sc.versBase.planned)
    .eq("origine", "systeme")
    .is("etape_consommee_id", null)
    .in("date", dates);
  if (error) throw new Error(error.message);
}

/**
 * Retire UNE intention du planning, par son identité.
 *
 * ⚠️ C'EST `libererJours` RESSERRÉ SUR UNE LIGNE, ET LA GRANULARITÉ EST
 * TOUT LE SUJET DEPUIS V6b : une date ne désigne plus une intention, elle
 * en désigne autant que la journée en porte. Libérer la journée pour
 * retirer une séance emporterait le supplément posé à côté, qui n'a rien
 * demandé. On vise donc l'identifiant, jamais la date.
 *
 * ⚠️ ELLE SUPPRIME, ELLE NE MARQUE RIEN, ET C'EST LA MÊME SÉMANTIQUE QUE
 * `libererJours`. Écrire `passee` dirait qu'une séance a été écartée
 * alors qu'elle n'a jamais eu lieu ; écrire `faite` refermerait une étape
 * que personne n'a faite. Les deux mentiraient à l'historique et au
 * curseur du cycle, qui s'ordonne justement sur les intentions résolues.
 * Une intention prévue qu'on retire n'est pas un fait, c'est l'absence
 * de fait.
 *
 * ⚠️ ET ELLE NE TOUCHE JAMAIS À CE QUI EST FAIT : le filtre de statut vit
 * dans la requête, donc même appelée sur l'identifiant d'une séance déjà
 * terminée, elle n'efface aucun fait.
 *
 * ⚠️ ELLE REMONTE SON ÉCHEC. Un retrait avalé laisserait l'écran affirmer
 * qu'une séance a disparu alors qu'elle est toujours en base : c'est
 * exactement le défaut muet de trois mois qu'a révélé V6b.
 */
export async function retirerIntention(userId: string, intentionId: string | null): Promise<void> {
  if (!intentionId) return;
  const supabase = createClient();
  const sc = await schemaIntentions();
  const { error } = await supabase
    .from(sc.table)
    .delete()
    .eq("user_id", userId)
    .eq("id", intentionId)
    .neq(sc.colStatut, sc.versBase.done);
  if (error) throw new Error(error.message);
}

/**
 * La réservation EN ATTENTE d'une étape du cycle, où qu'elle soit posée.
 *
 * ⚠️ ELLE NE PEUT PAS SE CHERCHER DANS « LA SEMAINE », ET C'EST TOUT
 * L'INTÉRÊT. Les écrans ne lisent que la semaine courante ; une étape
 * datée pour la semaine prochaine y serait invisible, donc redonner un
 * jour aurait tenté d'en CRÉER une seconde. `uniq_intention_par_etape`
 * l'aurait refusée, et le geste aurait échoué sans rien dire. On
 * interroge donc la base sur la clé de l'invariant lui-même.
 *
 * ⚠️ ELLE REND L'INTENTION ENTIÈRE, PLUS SON SEUL IDENTIFIANT, ET C'EST
 * CE QUI RÉPARE LE DÉFAUT DU 2026-09-06. Le héros ne savait pas qu'une
 * étape avait déjà un jour : il la reproposait comme une étape LIBRE, et
 * la terminer écrivait une SECONDE ligne portant la même étape. Pour
 * qu'il puisse dire « Push · mardi 8 » et lancer CETTE intention-là, il
 * lui faut sa date et son contenu, pas seulement sa clé.
 */
export async function reservationDeLEtape(userId: string, etapeId: string): Promise<PlanningDay | null> {
  const supabase = createClient();
  const sc = await schemaIntentions();
  const avecAdaptation = await adaptationsDisponibles();
  const { data } = await supabase
    .from(sc.table)
    .select(colonnes(sc, avecAdaptation))
    .eq("user_id", userId)
    .eq("etape_consommee_id", etapeId)
    .eq(sc.colStatut, sc.versBase.planned)
    .limit(1);
  const ligne = (data ?? [])[0];
  return ligne ? rowToDay(ligne as unknown as PlanningRow, sc) : null;
}

/**
 * Met à jour le statut d'UNE intention (planned → done après une séance).
 *
 * ⚠️ ELLE POSE AUSSI `consommee_le`, ET SANS ÇA LE CURSEUR DU CYCLE NE
 * PEUT PAS SE DÉRIVER : il s'ordonne par cette date, jamais par `date`,
 * une intention non datée n'en ayant pas. V2 a rempli la colonne pour
 * l'existant ; c'est ici qu'elle se tient à jour.
 *
 * ⚠️ `dateDuFait` DATE LE FAIT DU JOUR OÙ IL A EU LIEU, ET C'EST UNE
 * RÈGLE PRODUIT, PAS UN CONFORT. Une séance réservée pour mardi et faite
 * dimanche resterait écrite au mardi : le planning affirmerait une séance
 * « faite » un jour à venir. `consommee_le` porte déjà l'heure exacte (et
 * c'est lui qui ordonne le curseur, jamais `date`), mais c'est `date` que
 * la semaine donne à lire. L'autre branche de `terminerSeance` le fait
 * depuis toujours : `consommerEtape` écrit son fait au jour du jour.
 */
export async function marquerIntention(
  userId: string,
  intentionId: string | null,
  status: DayStatus,
  dateDuFait?: string,
): Promise<void> {
  /* ⚠️ ELLE VISE UNE INTENTION, PLUS UNE DATE, ET C'EST TOUT V6b EN UNE
     LIGNE. Marquer « faite » par la date créditerait d'un coup la séance
     principale ET le supplément du même jour : on aurait fait une séance,
     l'app en compterait deux. Sans identité, on ne marque rien.
     `dateDuFait` est ce qu'on ÉCRIT, jamais ce sur quoi on vise. */
  if (!intentionId) return;
  const supabase = createClient();
  const sc = await schemaIntentions();
  const maintenant = new Date().toISOString();
  await supabase
    .from(sc.table)
    .update({
      [sc.colStatut]: sc.versBase[status],
      consommee_le: status === "planned" ? null : maintenant,
      ...(dateDuFait && status !== "planned" ? { date: dateDuFait } : {}),
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
