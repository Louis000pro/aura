/* ════════════════════════════════════════════════════════════════════
   assistantActions — actions structurées de l'assistant (v2).

   Pour l'instant : créer une séance. L'assistant détecte l'intention
   (via /api/assistant/analyze), génère la séance (via /api/workout/generate),
   l'assemble au format `custom_sessions`, et l'utilisateur la valide via
   une carte de confirmation avant insertion. Aucune écriture sans clic.

   Module PUR (pas de React/DOM) — partagé serveur + client.
   ════════════════════════════════════════════════════════════════════ */

export type WorkoutCategory = "force" | "cardio" | "mobilite" | "fullbody";
export type WorkoutDifficulty = "Débutant" | "Intermédiaire" | "Avancé";

export interface ProposedExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  restAfter: number;
  tip?: string;
  benefit?: string;
  muscles?: string[];
}

export interface ProposedSeance {
  id: string;
  title: string;
  subtitle: string;
  category: WorkoutCategory;
  difficulty: WorkoutDifficulty;
  duration: number;          // minutes
  exercisesCount: number;
  muscles: string[];
  accent: string;
  icon: string;              // nom d'icône lucide (stocké en TEXT)
  exerciseList: ProposedExercise[];
}

// HEX uniquement : les cartes de séance construisent leurs fonds par
// concaténation (`${accent}dd`…), donc un "var(--accent)" casserait le CSS et
// rendrait le bouton « Commencer » invisible. #A78BFA = valeur de --accent.
export const ACCENT_BY_CATEGORY: Record<WorkoutCategory, string> = {
  force: "#A78BFA", cardio: "#FBBF24", mobilite: "#34D399", fullbody: "#FB923C",
};
export const ICON_NAME_BY_CATEGORY: Record<WorkoutCategory, string> = {
  force: "Dumbbell", cardio: "Flame", mobilite: "Wind", fullbody: "Layers",
};
export const CATEGORY_LABEL: Record<WorkoutCategory, string> = {
  force: "Force", cardio: "Cardio", mobilite: "Mobilité", fullbody: "Full body",
};

const CATEGORIES: readonly WorkoutCategory[] = ["force", "cardio", "mobilite", "fullbody"];

export function normalizeCategory(c?: string | null): WorkoutCategory {
  const k = (c ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (k.startsWith("cardio")) return "cardio";
  if (k.startsWith("mobil") || k.startsWith("souplesse") || k.startsWith("stretch")) return "mobilite";
  if (k.startsWith("full") || k.includes("corps")) return "fullbody";
  if ((CATEGORIES as readonly string[]).includes(k)) return k as WorkoutCategory;
  return "force";
}

export function normalizeDifficulty(d?: string | null): WorkoutDifficulty {
  const k = (d ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (k.startsWith("deb") || k.startsWith("begin") || k.startsWith("facil")) return "Débutant";
  if (k.startsWith("av") || k.startsWith("expert") || k.startsWith("difficil")) return "Avancé";
  return "Intermédiaire";
}

/** Niveau d'onboarding (Débutant/Intermédiaire/Avancé) → difficulté de séance. */
export function levelToDifficulty(level?: string | null): WorkoutDifficulty {
  return normalizeDifficulty(level);
}

interface RawExercise {
  name?: string; sets?: number; reps?: number | string; rest?: number; restAfter?: number;
  tip?: string; benefit?: string; muscles?: string[];
}

/** Durée estimée (min), même formule que la page Progression. */
function calcDuration(exs: ProposedExercise[]): number {
  const SEC_PER_REP = 3;
  let total = 0;
  exs.forEach((ex, i) => {
    const reps = parseInt(ex.reps, 10) || 10;
    total += ex.sets * reps * SEC_PER_REP;
    total += (ex.sets - 1) * ex.rest;
    if (i < exs.length - 1) total += ex.restAfter;
  });
  return Math.max(5, Math.round((total / 60) / 5) * 5);
}

/**
 * Assemble une séance prête à insérer dans custom_sessions à partir de la
 * sortie de /api/workout/generate + des paramètres détectés.
 */
export function assembleSeance(input: {
  title?: string;
  category: WorkoutCategory;
  difficulty: WorkoutDifficulty;
  muscles?: string[];
  rawExercises: RawExercise[];
}): ProposedSeance {
  const { category, difficulty } = input;

  const exerciseList: ProposedExercise[] = (input.rawExercises ?? [])
    .filter((e) => (e.name ?? "").trim())
    .map((e) => ({
      name: String(e.name).trim(),
      sets: Number(e.sets) || 3,
      reps: String(Number(e.reps) || e.reps || 10),
      rest: Number(e.rest) || 60,
      restAfter: Number(e.restAfter) || 90,
      tip: e.tip ?? "Concentre-toi sur la forme et la respiration.",
      benefit: e.benefit ?? "Renforce et améliore les performances.",
      muscles: Array.isArray(e.muscles) && e.muscles.length > 0 ? e.muscles : (input.muscles ?? ["Corps entier"]),
    }));

  const muscles = (input.muscles && input.muscles.length > 0)
    ? input.muscles
    : Array.from(new Set(exerciseList.flatMap((e) => e.muscles ?? []))).slice(0, 6);

  const finalExercises = exerciseList.length > 0 ? exerciseList : [{
    name: "Exercice libre", sets: 3, reps: "10", rest: 60, restAfter: 90,
    tip: "Concentre-toi sur la forme.", benefit: "Renforce et améliore les performances.",
    muscles: muscles.length > 0 ? muscles : ["Corps entier"],
  }];

  const title = (input.title ?? "").trim() || "Ma séance";

  return {
    id: `custom-${Date.now()}`,
    title,
    subtitle: `${CATEGORY_LABEL[category]} · Ma séance`,
    category,
    difficulty,
    duration: calcDuration(finalExercises),
    exercisesCount: finalExercises.length,
    muscles: muscles.length > 0 ? muscles : ["Corps entier"],
    accent: ACCENT_BY_CATEGORY[category],
    icon: ICON_NAME_BY_CATEGORY[category],
    exerciseList: finalExercises,
  };
}

/** Ligne prête pour un INSERT dans custom_sessions. */
export function seanceToRow(s: ProposedSeance, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    title: s.title,
    subtitle: s.subtitle,
    category: s.category,
    duration: s.duration,
    difficulty: s.difficulty,
    exercises: s.exercisesCount,
    muscles: s.muscles,
    accent: s.accent,
    icon: s.icon,
    exercise_list: s.exerciseList,
    visibility: "private",
    updated_at: new Date().toISOString(),
  };
}
