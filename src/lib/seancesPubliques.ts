/* ════════════════════════════════════════════════════════════════════
   LES SÉANCES, CÔTÉ PUBLIC (vague 4 de la bibliothèque publique).

   La séance vit dans le catalogue (`lib/catalogueSeances.ts`, et ses
   exercices dans `lib/exercicesCatalogue.ts`). Ce fichier ne fait que la
   présenter à quelqu'un qui n'a pas de compte : son title, sa description,
   son matériel en clair, sa photo et ce qu'on montre de ses exercices.

   ⚠️ Vaiiya+ en aperçu, comme dans l'application pour un compte gratuit :
   une séance Vaiiya+ montre ses trois premiers mouvements, pas la liste
   complète avec ses séries.
   ⚠️ Les classiques ont leur propre page (/defis) : ils ne sont pas
   repris ici, et les mini-cours (« Conseils & progresser ») non plus.
   ⚠️ L'adresse est l'identifiant de la séance, figé pour toujours.
   ════════════════════════════════════════════════════════════════════ */
import type { Exercise } from "@/components/WorkoutGuideModal";
import { workoutSessions, type WorkoutSession } from "./catalogueSeances";
import { classiqueDe } from "./classiques";
import { exerciseData } from "./exercicesCatalogue";
import { heroImageForSeance } from "./workoutArt";
import { VENTE_OUVERTE } from "./plans";

const NB = String.fromCharCode(160);

export const CATEGORIES_SEANCES: { id: WorkoutSession["category"]; titre: string; mot: string }[] = [
  { id: "force", titre: "Renforcement", mot: "de renforcement" },
  { id: "fullbody", titre: "Corps entier", mot: "full body" },
  { id: "cardio", titre: "Cardio", mot: "cardio" },
  { id: "mobilite", titre: "Mobilité et récupération", mot: "de mobilité" },
];

/** Le matériel, lu dans les collections de la séance. */
export function materielDe(s: WorkoutSession): string | null {
  const c = s.collections ?? [];
  if (c.includes("sansmateriel")) return "Sans matériel";
  if (c.includes("halteres")) return "Haltères";
  if (c.includes("kettlebell")) return "Kettlebell";
  if (c.includes("salle")) return "À la salle";
  return null;
}

const LIEU_TITRE: Record<string, string> = {
  "Sans matériel": "sans matériel",
  "Haltères": "aux haltères",
  "Kettlebell": "au kettlebell",
  "À la salle": "à la salle",
};

/** Une séance ouverte à tous aujourd'hui (comme dans l'application). */
export function seanceOuverte(s: WorkoutSession): boolean {
  return s.access !== "premium" || (!!s.bientotPlus && !VENTE_OUVERTE);
}

export function seancesPubliees(): WorkoutSession[] {
  return workoutSessions.filter((s) => s.contentType !== "article" && !classiqueDe(s.id));
}

export function seanceParSlug(slug: string): WorkoutSession | null {
  return seancesPubliees().find((s) => s.id === slug) ?? null;
}

export function exercicesDe(s: WorkoutSession): Exercise[] {
  return s.exerciseList ?? exerciseData[s.id] ?? [];
}

export const photoDe = (s: WorkoutSession) => heroImageForSeance({ title: s.title, category: s.category, muscles: s.muscles });

export function motCategorie(s: WorkoutSession): string {
  return CATEGORIES_SEANCES.find((c) => c.id === s.category)?.mot ?? "";
}

/** « Express 12 : séance full body de 12 min sans matériel ». */
export function titleSeance(s: WorkoutSession): string {
  const m = materielDe(s);
  return `${s.title}${NB}: séance ${motCategorie(s)} de ${s.duration}${NB}min${m ? ` ${LIEU_TITRE[m]}` : ""}`;
}

export function descriptionSeance(s: WorkoutSession): string {
  const m = materielDe(s);
  const n = s.exercises;
  return `${s.title}, une séance ${motCategorie(s)} de ${s.duration}${NB}min${m ? ` ${LIEU_TITRE[m]}` : ""} : ${n}${NB}exercice${n > 1 ? "s" : ""}, niveau ${s.difficulty.toLowerCase()}, guidée mouvement par mouvement avec le geste en animation.`;
}

/** Trois séances de la même famille d'intention, les suivantes dans le
    catalogue : un choix stable, sans tirage au hasard. */
export function seancesVoisines(s: WorkoutSession, n = 3): WorkoutSession[] {
  const toutes = seancesPubliees();
  const premiere = (s.collections ?? [])[0];
  const memes = toutes.filter((x) => x.id !== s.id && (premiere ? (x.collections ?? []).includes(premiere) : x.category === s.category));
  const i = toutes.indexOf(s);
  const apres = memes.filter((x) => toutes.indexOf(x) > i);
  return [...apres, ...memes].slice(0, n);
}
