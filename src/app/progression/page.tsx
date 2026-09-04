"use client";

/* ════════════════════════════════════════════════════════════════════
   /progression — l'onglet ENTRAÎNEMENT (direction finale validée).

   Philosophie : l'app RÉPOND quand elle sait, elle ne QUESTIONNE que
   quand elle ne sait pas.
   ① Héros « Aujourd'hui »   — la séance du jour, un seul geste.
   ② « Pas ce qui était prévu ? » — J'improvise (IA) / Je choisis
      (catalogue Vaiiya + bibliothèque perso FUSIONNÉS, badge Perso).
   ③ « Ma semaine »          — 7 pastilles + « Organiser » (planning
      complet — WeeklyProgramme — dans une sheet).
   Tout le reste vit derrière un tap. L'historique a quitté la page.
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { aiFetch } from "@/lib/aiFetch";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Clock, ChevronRight, ChevronLeft, Dumbbell, Play, Flame, Wind, Sparkles, Layers,
  Check, X, Plus, Trash2, Pencil, Globe, Lock, Users,
  Moon, Zap, Home, Sun, CalendarDays, MoreHorizontal, GripVertical, BookOpen,
} from "lucide-react";
import WeeklyProgramme from "@/components/WeeklyProgramme";
import WorkoutGuideModal, { exerciseData, type Exercise } from "@/components/WorkoutGuideModal";
import ExerciseGuide from "@/components/ExerciseGuide";
import CreateSessionModal, { type SessionDraft } from "@/components/seance/CreateSessionModal";
import MouvementsRow from "@/components/seance/MouvementsRow";
import ExerciseLibrarySheet from "@/components/seance/ExerciseLibrarySheet";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import AdviceReaderSheet from "@/components/AdviceReaderSheet";
import {
  titreDepuisExercices, categorieDepuisExercices, libelleReps,
  type LibExercise,
} from "@/lib/exerciseLibrary";
import { useAuth } from "@/context/AuthContext";
import { useAssistant } from "@/context/AssistantContext";
import { useGuideActif } from "@/context/GuideContext";
import { AssistantSpark, VisageGuide } from "@/components/AssistantMark";
import { voix } from "@/lib/guides";
import { createClient } from "@/lib/supabase";
import { lockBodyModal } from "@/lib/bodyModal";
import { PLANS } from "@/lib/plans";
import { levelToDifficulty, normalizeDifficulty } from "@/lib/assistantActions";
import { FAMILY, resolveArt, type Family } from "@/lib/workoutArt";
import {
  ADVICE_ARTICLES,
  ADVICE_THEMES,
  getAdviceArticle,
  type AdviceArticle,
  type AdviceTheme,
} from "@/lib/adviceArticles";
import {
  ensureWeek, setDayStatus, saveDay, hasSeance, readLieu, loadLieu, readVariant, ctxFromLieu,
  weekDates, weekDatesForOffset, todayYmd, weekOffsetOf, dayTitle, normalizeExercises,
  parDate, weekdayIndex, prochainsJours,
  dayLabelLong, PLANNING_TYPE_BY_CATEGORY,
  type PlanningDay, type GenInput, type Ctx,
} from "@/lib/planning";

/* ─── Workout sessions data (catalogue Vaiiya) ─────────────── */
type WorkoutCategory = "force" | "cardio" | "mobilite" | "fullbody";
type CatalogCollection =
  | "express" | "masse" | "perte" | "renfo" | "cardiohiit"
  | "abdos" | "jambes" | "haut" | "fullbody" | "salle"
  | "sansmateriel" | "debuter" | "mobilite" | "recup"
  | "defis" | "conseils";

type WorkoutSession = {
  id: string;
  category: WorkoutCategory;
  title: string;
  subtitle: string;
  duration: number;
  difficulty: "Débutant" | "Intermédiaire" | "Avancé";
  exercises: number;
  muscles: string[];
  accent: string;
  icon: typeof Dumbbell | string;   // composant (catalogue) ou nom stocké en base (perso)
  exerciseList?: Exercise[];
  visibility?: "private" | "friends" | "public";
  access?: "free" | "premium";
  collections?: CatalogCollection[];
  previewExercises?: string[];
  contentType?: "article";
};

const workoutSessions: WorkoutSession[] = [
  {
    id: "force-haut", category: "force",
    title: "Force Haut du Corps", subtitle: "Pectoraux · Dos · Épaules",
    duration: 45, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Pectoraux", "Dos", "Épaules"],
    accent: "#8B5CF6", icon: Dumbbell, access: "free",
    collections: ["salle", "masse", "renfo", "haut"],
  },
  {
    id: "salle-decouverte", category: "fullbody",
    title: "Découverte des machines", subtitle: "Premiers réglages · Corps complet",
    duration: 40, difficulty: "Débutant", exercises: 6,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Layers, access: "free",
    collections: ["salle", "masse", "renfo", "fullbody", "debuter"],
  },
  {
    id: "fullbody-deb", category: "fullbody",
    title: "Full Body Débutant", subtitle: "Corps complet · Sans matériel",
    duration: 35, difficulty: "Débutant", exercises: 7,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Layers, access: "free",
    collections: ["sansmateriel", "debuter", "fullbody", "renfo"],
  },
  {
    id: "express-12", category: "fullbody",
    title: "Express 12", subtitle: "Corps complet · Peu de temps, une vraie séance",
    duration: 12, difficulty: "Débutant", exercises: 5,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Zap, access: "free",
    collections: ["sansmateriel", "express", "debuter", "fullbody"],
  },
  {
    id: "reprise-douce", category: "fullbody",
    title: "Reprendre en douceur", subtitle: "Sans saut · À ton rythme · Corps complet",
    duration: 22, difficulty: "Débutant", exercises: 7,
    muscles: ["Corps entier", "Mobilité"],
    accent: "#8B5CF6", icon: Wind, access: "free",
    collections: ["sansmateriel", "debuter", "fullbody"],
  },
  {
    id: "appartement-silencieux", category: "fullbody",
    title: "Appartement silencieux", subtitle: "Zéro saut · Zéro impact · Sans matériel",
    duration: 20, difficulty: "Intermédiaire", exercises: 5,
    muscles: ["Corps entier", "Core"],
    accent: "#8B5CF6", icon: Home, access: "premium",
    collections: ["sansmateriel", "express", "renfo", "fullbody"],
    previewExercises: ["Chaise au mur", "Pike push-ups", "Fentes"],
  },
  {
    id: "jambes-poids-corps", category: "force",
    title: "Jambes au poids du corps", subtitle: "Cuisses · Fessiers · Mollets",
    duration: 30, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Quadriceps", "Fessiers", "Mollets"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["sansmateriel", "jambes", "renfo"],
    previewExercises: ["Squat", "Fentes", "Pont fessier"],
  },
  {
    id: "haut-corps-sol", category: "force",
    title: "Haut du corps au sol", subtitle: "Poussée · Épaules · Posture",
    duration: 25, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Pectoraux", "Épaules", "Dos"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["sansmateriel", "haut", "renfo"],
    previewExercises: ["Pompes", "Pike push-ups", "Pompes diamant"],
  },
  {
    id: "fullbody-inter", category: "fullbody",
    title: "Full Body Intermédiaire", subtitle: "Volume · Cardio · Corps complet",
    duration: 32, difficulty: "Intermédiaire", exercises: 7,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Layers, access: "premium",
    collections: ["sansmateriel", "fullbody", "renfo", "cardiohiit", "perte"],
    previewExercises: ["Squats sautés", "Pompes", "Fentes"],
  },
  {
    id: "puissance-sans-materiel", category: "cardio",
    title: "Puissance sans matériel", subtitle: "Explosivité · Vitesse · Cardio",
    duration: 22, difficulty: "Avancé", exercises: 5,
    muscles: ["Corps entier", "Cardio"],
    accent: "#8B5CF6", icon: Flame, access: "premium",
    collections: ["sansmateriel", "fullbody", "cardiohiit", "perte", "defis"],
    previewExercises: ["Sprint sur place", "Fentes sautées", "Pompes explosives"],
  },
  {
    id: "cardio-sans-saut", category: "cardio",
    title: "Cardio sans saut", subtitle: "Appuis contrôlés · Souffle · Zéro impact",
    duration: 18, difficulty: "Débutant", exercises: 6,
    muscles: ["Cardio", "Corps entier"],
    accent: "#8B5CF6", icon: Wind, access: "free",
    collections: ["cardiohiit", "perte", "debuter", "sansmateriel", "express"],
  },
  {
    id: "hiit", category: "cardio",
    title: "HIIT 20/10", subtitle: "8 mouvements · 20 sec effort · 10 sec repos",
    duration: 25, difficulty: "Intermédiaire", exercises: 8,
    muscles: ["Cardio", "Corps entier"],
    accent: "#8B5CF6", icon: Flame, access: "free",
    collections: ["cardiohiit", "perte", "sansmateriel"],
  },
  {
    id: "tabata-express", category: "cardio",
    title: "Tabata Express", subtitle: "Intervalles courts · Intensité nette · Corps entier",
    duration: 18, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Cardio", "Corps entier"],
    accent: "#8B5CF6", icon: Zap, access: "premium",
    collections: ["cardiohiit", "perte", "sansmateriel", "express"],
    previewExercises: ["Jumping jacks", "Mountain climbers", "Squats sautés"],
  },
  {
    id: "cardio-salle", category: "cardio",
    title: "Cardio de salle", subtitle: "Rameur · Tapis · Vélo · Kettlebell",
    duration: 35, difficulty: "Intermédiaire", exercises: 5,
    muscles: ["Cardio", "Corps entier"],
    accent: "#8B5CF6", icon: Flame, access: "premium",
    collections: ["cardiohiit", "perte", "salle", "fullbody"],
    previewExercises: ["Rameur", "Tapis de course", "Vélo"],
  },
  {
    id: "pyramide-cardio", category: "cardio",
    title: "Pyramide cardio", subtitle: "20 → 50 → 20 sec · Intensité progressive",
    duration: 22, difficulty: "Intermédiaire", exercises: 8,
    muscles: ["Cardio", "Corps entier"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["cardiohiit", "perte", "sansmateriel", "defis"],
    previewExercises: ["Jumping jacks", "Mountain climbers", "Montées de genoux"],
  },
  {
    id: "cardio-halteres", category: "cardio",
    title: "Cardio et force aux haltères", subtitle: "Circuit complet · Charges · Repos courts",
    duration: 32, difficulty: "Avancé", exercises: 6,
    muscles: ["Cardio", "Corps entier"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["cardiohiit", "perte", "salle", "renfo", "fullbody"],
    previewExercises: ["Thruster haltères", "Kettlebell swing", "Goblet squat"],
  },
  {
    id: "jambes", category: "force",
    title: "Jambes & Fessiers", subtitle: "Squats · Fentes · Hip Thrust",
    duration: 50, difficulty: "Intermédiaire", exercises: 5,
    muscles: ["Quadriceps", "Fessiers"],
    accent: "#8B5CF6", icon: Dumbbell, access: "free",
    collections: ["salle", "masse", "renfo", "jambes"],
  },
  {
    id: "mobilite", category: "mobilite",
    title: "Mobilité Matinale", subtitle: "Yoga flow · Étirements actifs",
    duration: 20, difficulty: "Débutant", exercises: 10,
    muscles: ["Mobilité", "Souplesse"],
    accent: "#8B5CF6", icon: Wind, access: "free",
    collections: ["mobilite", "express", "debuter"],
  },
  {
    id: "posture-ecran", category: "mobilite",
    title: "Posture après écran", subtitle: "Nuque · Épaules · Haut du dos",
    duration: 15, difficulty: "Débutant", exercises: 6,
    muscles: ["Nuque", "Épaules", "Dos"],
    accent: "#8B5CF6", icon: Wind, access: "free",
    collections: ["mobilite", "express", "debuter"],
  },
  {
    id: "hanches-libres", category: "mobilite",
    title: "Hanches libres", subtitle: "Rotation · Ouverture · Chaîne postérieure",
    duration: 20, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Hanches", "Fessiers", "Ischio-jambiers"],
    accent: "#8B5CF6", icon: Wind, access: "premium",
    collections: ["mobilite", "express"],
    previewExercises: ["Cercles de hanches", "World’s greatest stretch", "Pigeon"],
  },
  {
    id: "epaules-haut-dos-mobilite", category: "mobilite",
    title: "Épaules & haut du dos", subtitle: "Rotation · Ouverture · Posture",
    duration: 18, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Épaules", "Pectoraux", "Dos"],
    accent: "#8B5CF6", icon: Wind, access: "premium",
    collections: ["mobilite", "express"],
    previewExercises: ["Cat-cow", "Thread the needle", "Downward dog / cobra"],
  },
  {
    id: "chevilles-squat", category: "mobilite",
    title: "Chevilles & squat", subtitle: "Appuis · Hanches · Amplitude",
    duration: 15, difficulty: "Intermédiaire", exercises: 5,
    muscles: ["Chevilles", "Hanches", "Jambes"],
    accent: "#8B5CF6", icon: Wind, access: "premium",
    collections: ["mobilite", "express"],
    previewExercises: ["Étirement mollet au mur", "Cercles de hanches", "World’s greatest stretch"],
  },
  {
    id: "colonne-mobile", category: "mobilite",
    title: "Colonne mobile", subtitle: "Flexion · Rotation · Respiration",
    duration: 18, difficulty: "Débutant", exercises: 6,
    muscles: ["Colonne vertébrale", "Dos"],
    accent: "#8B5CF6", icon: Wind, access: "premium",
    collections: ["mobilite", "express"],
    previewExercises: ["Cat-cow", "Thread the needle", "Downward dog / cobra"],
  },
  {
    id: "mobilite-complete", category: "mobilite",
    title: "Mobilité complète", subtitle: "Tout le corps · Routine profonde",
    duration: 30, difficulty: "Intermédiaire", exercises: 10,
    muscles: ["Corps entier", "Mobilité"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["mobilite"],
    previewExercises: ["Cercles de hanches", "Cat-cow", "World’s greatest stretch"],
  },
  {
    id: "mobilite-active", category: "mobilite",
    title: "Mobilité active", subtitle: "Avant séance · Fluide · Corps entier",
    duration: 20, difficulty: "Intermédiaire", exercises: 7,
    muscles: ["Corps entier", "Mobilité"],
    accent: "#8B5CF6", icon: Zap, access: "premium",
    collections: ["mobilite", "express"],
    previewExercises: ["Cercles de hanches", "Cat-cow", "World’s greatest stretch"],
  },
  {
    id: "dos-biceps", category: "force",
    title: "Dos & Biceps", subtitle: "Tractions · Rowing · Curls",
    duration: 40, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Dos", "Biceps"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["salle", "masse", "renfo", "haut"],
    previewExercises: ["Tractions supination", "Rowing barre buste penché", "Curl marteau"],
  },
  {
    id: "core", category: "fullbody",
    title: "Core & Gainage", subtitle: "Planche · Crunchs · Relevés",
    duration: 30, difficulty: "Intermédiaire", exercises: 8,
    muscles: ["Abdominaux", "Lombaires"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["sansmateriel", "abdos", "renfo"],
    previewExercises: ["Planche frontale", "Crunch", "Russian Twist"],
  },
  {
    id: "cardio-endurance", category: "cardio",
    title: "Endurance Cardio", subtitle: "Rameur · Tapis · Vélo · Allure régulière",
    duration: 40, difficulty: "Débutant", exercises: 4,
    muscles: ["Cardio"],
    accent: "#8B5CF6", icon: Wind, access: "free",
    collections: ["cardiohiit", "perte", "debuter", "salle"],
  },
  {
    id: "salle-haut", category: "force",
    title: "Haut du corps en salle", subtitle: "Barre · Machines · Poulie",
    duration: 50, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Pectoraux", "Dos", "Épaules"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["salle", "masse", "renfo", "haut"],
    previewExercises: ["Développé couché barre", "Rowing machine assis", "Écarté à la poulie vis-à-vis"],
  },
  {
    id: "push-salle", category: "force",
    title: "Push, pectoraux et épaules", subtitle: "Barre · Haltères · Poulie",
    duration: 45, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Pectoraux", "Épaules", "Triceps"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["salle", "masse", "renfo", "haut"],
    previewExercises: ["Développé couché", "Développé incliné haltères", "Développé militaire haltères"],
  },
  {
    id: "jambes-quadriceps", category: "force",
    title: "Jambes, dominante quadriceps", subtitle: "Charges · Unilatéral · Machines",
    duration: 45, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Quadriceps", "Fessiers", "Mollets"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["salle", "masse", "renfo", "jambes"],
    previewExercises: ["Squat barre", "Presse à cuisses", "Squat bulgare"],
  },
  {
    id: "chaine-posterieure", category: "force",
    title: "Chaîne postérieure", subtitle: "Ischios · Fessiers · Lombaires",
    duration: 45, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Ischio-jambiers", "Fessiers", "Dos"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["salle", "masse", "renfo", "jambes"],
    previewExercises: ["Soulevé de terre roumain", "Hip thrust machine", "Leg curl allongé"],
  },
  {
    id: "epaules-bras", category: "force",
    title: "Épaules & bras", subtitle: "Deltoïdes · Biceps · Triceps",
    duration: 40, difficulty: "Intermédiaire", exercises: 7,
    muscles: ["Épaules", "Biceps", "Triceps"],
    accent: "#8B5CF6", icon: Dumbbell, access: "premium",
    collections: ["salle", "masse", "renfo", "haut"],
    previewExercises: ["Développé Arnold", "Élévations latérales", "Oiseau haltères"],
  },
  {
    id: "fullbody-machines", category: "fullbody",
    title: "Full Body Machines", subtitle: "Corps complet · Trajectoires guidées",
    duration: 45, difficulty: "Intermédiaire", exercises: 8,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Layers, access: "premium",
    collections: ["salle", "masse", "renfo", "fullbody"],
    previewExercises: ["Presse à cuisses", "Développé épaules machine", "Tirage poitrine"],
  },
  {
    id: "recup-active", category: "mobilite",
    title: "Récupération active", subtitle: "Respiration · Étirements doux · Détente",
    duration: 25, difficulty: "Débutant", exercises: 7,
    muscles: ["Souplesse", "Respiration"],
    accent: "#8B5CF6", icon: Wind, access: "free",
    collections: ["mobilite", "recup", "debuter"],
  },
  {
    id: "retour-au-calme", category: "mobilite",
    title: "Retour au calme", subtitle: "Après l’effort · Souffle · Étirements simples",
    duration: 12, difficulty: "Débutant", exercises: 5,
    muscles: ["Corps entier", "Respiration"],
    accent: "#8B5CF6", icon: Wind, access: "free",
    collections: ["recup", "mobilite", "express", "debuter"],
  },
  {
    id: "pause-detente", category: "mobilite",
    title: "Pause détente", subtitle: "Nuque · Épaules · Dos · 12 minutes",
    duration: 12, difficulty: "Débutant", exercises: 5,
    muscles: ["Nuque", "Épaules", "Dos"],
    accent: "#8B5CF6", icon: Moon, access: "free",
    collections: ["recup", "mobilite", "express", "debuter"],
  },
  {
    id: "recup-jambes", category: "mobilite",
    title: "Récupération jambes", subtitle: "Cuisses · Mollets · Hanches · Fessiers",
    duration: 22, difficulty: "Intermédiaire", exercises: 7,
    muscles: ["Jambes", "Hanches", "Fessiers"],
    accent: "#8B5CF6", icon: Wind, access: "premium",
    collections: ["recup", "mobilite", "jambes"],
    previewExercises: ["Cercles de hanches", "Étirement quadriceps", "Étirement chaîne postérieure"],
  },
  {
    id: "recup-haut-corps", category: "mobilite",
    title: "Haut du corps relâché", subtitle: "Nuque · Épaules · Pectoraux · Dos",
    duration: 20, difficulty: "Intermédiaire", exercises: 7,
    muscles: ["Épaules", "Pectoraux", "Dos"],
    accent: "#8B5CF6", icon: Wind, access: "premium",
    collections: ["recup", "mobilite", "haut"],
    previewExercises: ["Étirement du cou", "Cat-cow", "Thread the needle"],
  },
  {
    id: "dos-relache", category: "mobilite",
    title: "Dos relâché", subtitle: "Colonne · Rotations · Chaîne postérieure",
    duration: 18, difficulty: "Débutant", exercises: 6,
    muscles: ["Dos", "Hanches", "Ischio-jambiers"],
    accent: "#8B5CF6", icon: Wind, access: "premium",
    collections: ["recup", "mobilite", "express"],
    previewExercises: ["Cat-cow", "Thread the needle", "Downward dog / cobra"],
  },
  {
    id: "soir-calme", category: "mobilite",
    title: "Soir calme", subtitle: "Mouvements lents · Sol · Respiration",
    duration: 18, difficulty: "Débutant", exercises: 6,
    muscles: ["Corps entier", "Respiration"],
    accent: "#8B5CF6", icon: Moon, access: "premium",
    collections: ["recup", "mobilite", "express"],
    previewExercises: ["Étirement du cou", "Papillon hanches", "Pigeon"],
  },
  {
    id: "lendemain-seance", category: "mobilite",
    title: "Lendemain de séance", subtitle: "Mobilité active · Tout le corps · Sans forcer",
    duration: 20, difficulty: "Débutant", exercises: 7,
    muscles: ["Corps entier", "Mobilité"],
    accent: "#8B5CF6", icon: Sun, access: "premium",
    collections: ["recup", "mobilite", "debuter"],
    previewExercises: ["Cercles de hanches", "Cat-cow", "World’s greatest stretch"],
  },
  {
    id: "recup-complete", category: "mobilite",
    title: "Récupération complète", subtitle: "30 minutes · Tout le corps · Routine profonde",
    duration: 30, difficulty: "Intermédiaire", exercises: 10,
    muscles: ["Corps entier", "Mobilité", "Respiration"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["recup", "mobilite"],
    previewExercises: ["Cohérence cardiaque", "Cat-cow", "Cercles de hanches"],
  },
  ...ADVICE_ARTICLES.map((article): WorkoutSession => ({
    id: article.id,
    category: "fullbody",
    title: article.title,
    subtitle: article.subtitle,
    duration: article.readingMinutes,
    difficulty: "Débutant",
    exercises: article.sections.length,
    muscles: [article.theme],
    accent: "#8B5CF6",
    icon: BookOpen,
    access: article.access,
    collections: ["conseils"],
    contentType: "article",
  })),
  {
    id: "bases-mouvement", category: "fullbody",
    title: "Les bases du mouvement", subtitle: "6 gestes · 6 repères · Pour bien commencer",
    duration: 20, difficulty: "Débutant", exercises: 6,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Layers, access: "free",
    collections: ["debuter", "fullbody", "renfo"],
  },
  {
    id: "squat-maitrise", category: "force",
    title: "Squat maîtrisé", subtitle: "Chevilles · Appuis · Descente · Progression",
    duration: 22, difficulty: "Débutant", exercises: 5,
    muscles: ["Quadriceps", "Fessiers", "Chevilles"],
    accent: "#8B5CF6", icon: Dumbbell, access: "free",
    collections: ["debuter", "jambes", "renfo"],
  },
  {
    id: "pompes-maitrise", category: "force",
    title: "Pompes maîtrisées", subtitle: "Du support au sol · Placement · Variantes",
    duration: 20, difficulty: "Débutant", exercises: 5,
    muscles: ["Pectoraux", "Triceps", "Épaules"],
    accent: "#8B5CF6", icon: Dumbbell, access: "free",
    collections: ["debuter", "haut", "renfo", "sansmateriel"],
  },
  {
    id: "tractions-progression", category: "force",
    title: "Tractions, construire le mouvement", subtitle: "Omoplates · Tirages · Premières répétitions",
    duration: 30, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Dos", "Biceps", "Épaules"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["haut", "renfo", "salle"],
    previewExercises: ["Ouverture des épaules", "Face pull poulie", "Rowing inversé"],
  },
  {
    id: "charniere-hanche", category: "force",
    title: "Charnière de hanche", subtitle: "Placement · Fessiers · Soulevé de terre",
    duration: 30, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Fessiers", "Ischio-jambiers", "Dos"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["jambes", "renfo", "salle"],
    previewExercises: ["Cat-cow", "Pont fessier", "Soulevé de terre roumain"],
  },
  {
    id: "gainage-progression", category: "fullbody",
    title: "Gainage, progresser", subtitle: "Stabilité · Leviers · Mouvement contrôlé",
    duration: 25, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Core", "Abdominaux", "Dos"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["abdos", "renfo", "sansmateriel"],
    previewExercises: ["Dead bug", "Bird dog", "Planche frontale"],
  },
  {
    id: "epaules-controle", category: "force",
    title: "Épaules, mobilité et contrôle", subtitle: "Bouger · Stabiliser · Puis charger",
    duration: 28, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Épaules", "Haut du dos", "Triceps"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["haut", "renfo", "salle", "mobilite"],
    previewExercises: ["Ouverture des épaules", "Étirement pectoraux au mur", "Pike push-ups"],
  },
  {
    id: "unilateral-maitrise", category: "force",
    title: "Unilatéral, maîtriser les appuis", subtitle: "Droite · Gauche · Équilibre · Contrôle",
    duration: 28, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Jambes", "Fessiers", "Core"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["jambes", "renfo", "sansmateriel"],
    previewExercises: ["Bird dog", "Step up banc", "Fentes"],
  },
  {
    id: "tempo-controle", category: "fullbody",
    title: "Tempo, ralentir pour progresser", subtitle: "Descente · Pause · Contrôle · Tout le corps",
    duration: 32, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Sparkles, access: "premium",
    collections: ["renfo", "salle", "fullbody"],
    previewExercises: ["Squat", "Pompes", "Fentes"],
  },
  {
    id: "defi-gainage", category: "fullbody",
    title: "Défi Gainage", subtitle: "Un chrono, un record à battre",
    duration: 15, difficulty: "Intermédiaire", exercises: 5,
    muscles: ["Core", "Abdominaux", "Gainage"],
    accent: "#8B5CF6", icon: Flame,
  },
];

const VIS_CONFIG = {
  private: { label: "Privée", icon: Lock,  color: "var(--text-3)" },
  friends: { label: "Amis",   icon: Users, color: "#8B5CF6" },
  public:  { label: "Public", icon: Globe, color: "var(--teal-encre)" },
} as const;
type Visibility = keyof typeof VIS_CONFIG;
const VIS_ORDER: Visibility[] = ["private", "friends", "public"];

/* ─── Libellés FR des objectifs onboarding (même map que WeeklyProgramme) ── */
const goalLabels: Record<string, string> = {
  masse: "prise de masse",
  prise_de_masse: "prise de masse",
  poids: "perte de poids",
  perte_de_poids: "perte de poids",
  force: "force",
  endurance: "endurance",
  sante: "santé générale",
  sante_generale: "santé générale",
  souplesse: "souplesse",
};

/* ════════════════════════════════════════════════════════════════════
   Banque photo (public/entrainement) — dans le CATALOGUE, les photos
   sont NATURELLES : aucun filtre, aucune teinte. La cohérence vient du
   cadrage portrait, du scrim bas et de la typo blanche — pas d'une
   couleur plaquée. Les familles restent en coulisse : elles servent
   uniquement à choisir LA BONNE PHOTO d'une séance (resolveArt). Le
   blend couleur ne s'applique plus qu'aux widgets d'ambiance
   (repos / done / setup / improvise).
   ════════════════════════════════════════════════════════════════════ */
// Banque photo (familles, règles image, resolveArt) → SOURCE UNIQUE dans
// src/lib/workoutArt.ts, partagée avec le lanceur global. Types/valeurs
// importés en tête de fichier (Family, FAMILY, Art, resolveArt).

/** Ambiances des états fixes (widgets) — couleur appliquée in-app, comme la banque. */
const WIDGET: Record<"repos" | "done" | "setup" | "improvise", {
  img: string; pos: string;
}> = {
  repos:     { img: "repos",     pos: "68% center" },
  done:      { img: "done",      pos: "center 40%" },
  setup:     { img: "setup",     pos: "center 45%" },
  improvise: { img: "improvise", pos: "center 40%" },
};

/** Photo naturelle — la banque parle d'elle-même. Juste l'image, cadrée,
    sur fond sombre le temps du chargement. Le scrim vit chez l'appelant. */
function Photo({ img, pos = "center 25%", className, style, children }: {
  img: string; pos?: string;
  className?: string; style?: React.CSSProperties; children?: React.ReactNode;
}) {
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", background: "#101018", ...style }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(/entrainement/${img}.webp)`, backgroundSize: "cover", backgroundPosition: pos }} />
      {children}
    </div>
  );
}

/** Lieu lisible d'une séance du planning. */
function lieuLabel(loc: Ctx | null): string {
  if (loc === "salle") return "À la salle";
  if (loc === "halteres") return "Maison · haltères";
  if (loc === "poids") return "Maison · poids du corps";
  return "";
}

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_FULL = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/* ════════════════════════════════════════════════════════════════════
   Sheet — enveloppe commune des bottom sheets (Organiser / Choisir /
   Improviser). Masque la nav du bas tant qu'elle est ouverte.
   ════════════════════════════════════════════════════════════════════ */
function Sheet({ onClose, children, maxHeight = "88vh", height }: {
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  height?: string;              // imposée → sheet « plein écran » (catalogue)
}) {
  useEffect(() => lockBodyModal(), []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(12,8,22,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 64, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.14)",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.35)",
          maxHeight,
          height,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ① Héros « Aujourd'hui » — un seul emplacement, quatre vérités.
   ════════════════════════════════════════════════════════════════════ */
type HeroState = "loading" | "setup" | "seance" | "repos" | "done";

function TodayHero({
  state, day, nextLabel, doneStats, onStart, onImprovise, onOrganise, onShift, onReplace,
}: {
  state: HeroState;
  day: PlanningDay | null;
  nextLabel: string | null;                       // « Jambes · demain » (état repos)
  doneStats: { minutes: number; kcal: number } | null;
  onStart: () => void;
  onImprovise: () => void;
  onOrganise: () => void;
  onShift: () => void;
  onReplace: () => void;
}) {
  /* Skeleton — même silhouette que la carte, aucune culpabilité d'attente */
  if (state === "loading") {
    return (
      <div className="overflow-hidden relative" style={{ height: 380, borderRadius: "var(--r-affiche)", background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
        <motion.div
          className="absolute inset-0"
          style={{ background: "linear-gradient(100deg, transparent 30%, rgba(var(--accent-rgb),0.08) 50%, transparent 70%)" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  const viz =
    state === "setup" ? WIDGET.setup
    : state === "done" ? WIDGET.done
    : state === "repos" ? WIDGET.repos
    : { img: resolveArt({ title: day ? `${day.title} ${day.type}` : "" }).img, pos: "center 24%" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="overflow-hidden relative"
      style={{ minHeight: state === "seance" ? 400 : 320, borderRadius: "var(--r-affiche)", boxShadow: "var(--ombre-pose)" }}
    >
      <Photo img={viz.img} pos={viz.pos} style={{ position: "absolute", inset: 0 }} />

      {/* Chips du haut */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
        <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{ background: "var(--verre-photo)", color: "#fff", border: "1px solid var(--verre-photo-bord)", backdropFilter: "blur(6px)" }}>
          {state === "setup" ? "Première fois ici" : "Aujourd’hui"}
        </span>
        {state === "done" && (
          <span className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4FE8B8,#1FBF8C)", boxShadow: "var(--ombre-pose)" }}>
            <Check size={18} strokeWidth={3.2} style={{ color: "#06281E" }} />
          </span>
        )}
        {state === "repos" && <Moon size={22} strokeWidth={1.6} style={{ color: "#9FD8C6", opacity: 0.85 }} />}
        {state === "setup" && <AssistantSpark px={22} />}
      </div>

      {/* Légende sur l'image (style validé nutrition) */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16"
        style={{ background: "var(--voile-affiche)" }}>

        {state === "seance" && day && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#C9B8FF" }}>
              {day.type}{lieuLabel(day.location) ? ` · ${lieuLabel(day.location)}` : ""}
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">{dayTitle(day)}</h2>
            <p className="mt-2.5 mb-4 text-[11.5px] font-medium" style={{ color: "rgba(255,255,255,0.62)" }}>
              {day.type === "HIIT" ? 30 : 45} min · {day.exerciseList.length} exercices · {day.difficulty}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
            >
              <Play size={14} strokeWidth={2.5} fill="#fff" /> C&apos;est parti
            </motion.button>
            <div className="flex justify-center gap-5 mt-2.5">
              <button onClick={onShift} className="text-[11.5px] font-semibold cursor-pointer bg-transparent border-none"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                Décaler
              </button>
              <button onClick={onReplace} className="text-[11.5px] font-semibold cursor-pointer bg-transparent border-none flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                <span style={{ color: "#C9B8FF" }}>✦</span> Remplacer
              </button>
            </div>
          </>
        )}

        {state === "repos" && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#9FD8C6" }}>
              Aujourd&apos;hui
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">Repos.</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Ton corps construit pendant que tu récupères.
              {nextLabel && <> Prochaine : <b className="font-bold text-white">{nextLabel}</b>.</>}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onImprovise}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[13.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(4px)" }}
            >
              ✦ J&apos;ai quand même envie de bouger
            </motion.button>
          </>
        )}

        {state === "done" && day && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#7FE8C8" }}>
              Aujourd&apos;hui · fait
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">C&apos;est fait.</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5" style={{ color: "rgba(255,255,255,0.72)" }}>
              {dayTitle(day)}
              {doneStats && doneStats.minutes > 0 && <> · {doneStats.minutes} min</>}
              {doneStats && doneStats.kcal > 0 && <> · <b className="font-bold" style={{ color: "#EF9F27" }}>{doneStats.kcal} kcal</b></>}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[13.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(4px)" }}
            >
              <Play size={12} strokeWidth={2.5} fill="#fff" /> Refaire la séance
            </motion.button>
          </>
        )}

        {state === "setup" && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#C9B8FF" }}>
              On fait connaissance
            </p>
            {/* La question n'apparaît QUE quand l'app ne sait pas — même logique que Nutrition */}
            <h2 className="text-[30px] md:text-[34px] leading-[1.04] font-extralight text-white">On s&apos;entraîne comment&nbsp;?</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Quelques questions, et ta semaine est prête.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onOrganise}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
            >
              ✦ Créer mon planning
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ② Cartes de bifurcation — J'improvise / Je choisis
   ════════════════════════════════════════════════════════════════════ */
/** « Je choisis » : éventail de 3 cartes-séances déployées sur un fond en
    profondeur → « plusieurs séances, choisis la tienne ». Cartes distinctes
    (liseré clair + ombre = carte, pas écran), rotation en éventail, dégagées
    du texte. Ancrage horizontal au centre (dx en px) → forme identique quelle
    que soit la largeur de la carte. */
/** Écartement horizontal responsive : serré sur mobile (plancher 30px), il
    s'élargit avec la largeur de la carte (13cqw) jusqu'à 72px → l'éventail
    occupe plus de place là où il y a de la largeur (nécessite container-type
    sur le parent). */
const CHOISIS_DX = "clamp(30px, 13cqw, 72px)";
/** L'éventail grandit avec la HAUTEUR de la carte (cqh) : plus haute sur desktop
    (148 → 188) → cartes de l'éventail plus grandes. La formule `top` verrouille
    le bas de la carte pivotée à une ligne constante (100cqh − 64px), donc l'écart
    au texte reste ~constant à toute hauteur (`sway` compense le débord de la
    rotation). Nécessite `container-type: size` sur le parent. */
type FanCard = { img: string; pos: string; wv: string; hv: string; dir: -1 | 0 | 1; rot: number; z: number; sway: number };
const CHOISIS_FAN: FanCard[] = [
  { img: "legs-squat",    pos: "center 32%", wv: "clamp(66px,44cqh,100px)", hv: "clamp(70px,47cqh,104px)", dir: -1, rot: -11, z: 1, sway: 0.095 },
  { img: "pull-traction", pos: "center 26%", wv: "clamp(66px,44cqh,100px)", hv: "clamp(70px,47cqh,104px)", dir:  1, rot:  11, z: 2, sway: 0.095 },
  { img: "push-couche",   pos: "center 30%", wv: "clamp(75px,51cqh,112px)", hv: "clamp(80px,54cqh,120px)", dir:  0, rot:   0, z: 3, sway: 0    },
];

function ForkCard({ kind, count, onClick }: {
  kind: "improvise" | "choisis";
  count?: number;
  onClick: () => void;
}) {
  const isIA = kind === "improvise";
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="overflow-hidden relative cursor-pointer text-left border-none p-0 h-[148px] md:h-[188px]"
      style={{ borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)" }}
    >
      {isIA ? (
        <>
          <Photo img={WIDGET.improvise.img} pos={WIDGET.improvise.pos}
            style={{ position: "absolute", inset: 0 }} />
          <span className="absolute top-3 right-3"><AssistantSpark px={22} /></span>
        </>
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ isolation: "isolate", containerType: "size" }}>
          {/* fond en profondeur — la bibliothèque derrière l'éventail */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/entrainement/pull-rowing.webp)", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(4px) brightness(0.42)", transform: "scale(1.12)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(var(--voile-photo-rgb),0.5), rgba(var(--voile-photo-rgb),0.72))" }} />
          {/* halo — centré sur la carte du milieu, suit sa hauteur */}
          <div style={{ position: "absolute", left: "50%", top: "calc(100cqh - 64px - (clamp(80px,54cqh,120px) / 2))", width: 96, height: 96, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(155,130,255,0.35), transparent 68%)", filter: "blur(6px)" }} />
          {/* l'éventail de séances — grandit avec la hauteur de la carte */}
          {CHOISIS_FAN.map((c) => (
            <div key={c.img} style={{
              position: "absolute", left: "50%",
              top: c.sway
                ? `calc(100cqh - 64px - ${c.hv} - (${c.wv} * ${c.sway}))`
                : `calc(100cqh - 64px - ${c.hv})`,
              width: c.wv, height: c.hv, zIndex: c.z,
              transform: `translateX(calc(-50% + (${c.dir} * ${CHOISIS_DX}))) rotate(${c.rot}deg)`,
              transformOrigin: "center",
              borderRadius: 9,
              backgroundImage: `url(/entrainement/${c.img}.webp)`, backgroundSize: "cover", backgroundPosition: c.pos,
              boxShadow: "0 7px 15px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1.5px rgba(255,255,255,0.55)",
            }} />
          ))}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-8"
        style={{ background: "var(--voile-affiche)" }}>
        <p className="text-[11px] font-semibold mb-0.5" style={{ color: "#C9B8FF" }}>
          {isIA ? "Nouvelle séance" : "Mes séances"}
        </p>
        <p className="text-[16.5px] font-semibold text-white leading-tight">{isIA ? "J’improvise" : "Je choisis"}</p>
        <p className="text-[10.5px] font-normal mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.68)" }}>
          {isIA ? "Ton temps, ton matériel" : `${count ?? 0} séances et cours`}
        </p>
      </div>
    </motion.button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ③ Ma semaine — 7 pastilles + « Organiser ». Une phrase qui raconte,
   pas un tableau.
   ════════════════════════════════════════════════════════════════════ */
function WeekStrip({ week, dates, today, onOrganise }: {
  week: PlanningDay[] | null;
  /** Les sept dates affichées, du lundi au dimanche. C'est ELLES qui font la
   *  colonne : le tableau `week` ne garantit ni sept entrées ni leur ordre. */
  dates: string[];
  today: string;
  onOrganise: () => void;
}) {
  const parJour = useMemo(() => parDate(week), [week]);
  const doneCount = week?.filter((d) => d.status === "done").length ?? 0;
  const todayDay = parJour[today] ?? null;

  let story: React.ReactNode = null;
  if (week) {
    if (todayDay?.status === "done") {
      story = <><b style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{doneCount} séance{doneCount > 1 ? "s" : ""} faite{doneCount > 1 ? "s" : ""}</b>, dont celle d&apos;aujourd&apos;hui.</>;
    } else if (hasSeance(todayDay)) {
      story = doneCount > 0
        ? <><b style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{doneCount} séance{doneCount > 1 ? "s" : ""} faite{doneCount > 1 ? "s" : ""}</b>, la {doneCount + 1}<sup>e</sup> t&apos;attend aujourd&apos;hui.</>
        : <>Ta semaine commence, <b style={{ color: "var(--text-1)", fontWeight: 700 }}>première séance aujourd&apos;hui</b>.</>;
    } else {
      story = doneCount > 0
        ? <><b style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{doneCount} séance{doneCount > 1 ? "s" : ""} faite{doneCount > 1 ? "s" : ""}</b>, repos aujourd&apos;hui.</>
        : <>Repos aujourd&apos;hui, ta semaine se construit.</>;
    }
  }

  return (
    <div className="px-4 pt-3.5 pb-3.5">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onOrganise} className="flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer">
          <span className="vy-sous" style={{ color: "var(--text-0)" }}>Ma semaine</span>
          <ChevronRight size={13} strokeWidth={2.6} style={{ color: "var(--text-3)" }} />
        </button>
        <button onClick={onOrganise}
          className="vy-label flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
          style={{ color: "var(--exp-encre)" }}>
          <CalendarDays size={12} strokeWidth={2.2} />
          Organiser
        </button>
      </div>

      <div className="flex gap-1.5">
        {DAY_LETTERS.map((letter, i) => {
          const date = dates[i];
          const d = parJour[date] ?? null;
          /* Comparaison de chaînes : en YYYY-MM-DD l'ordre alphabétique EST
             l'ordre chronologique. Pas de Date à construire pour ça. */
          const isToday = date === today;
          const isDone = d?.status === "done";
          const isSeance = hasSeance(d);
          const isPast = date < today;
          const art = isSeance ? resolveArt({ title: `${d!.title} ${d!.type}` }) : null;

          return (
            <button key={date} onClick={onOrganise}
              aria-label={`${DAY_FULL[i]}, ${isSeance ? dayTitle(d!) : "repos"}`}
              className="relative flex-1 overflow-hidden cursor-pointer border-none p-0 block"
              style={{
                height: 60, borderRadius: "var(--r-controle)", background: "#0f0d17",
                outline: isToday ? "2px solid #8B5CF6" : undefined,
                outlineOffset: isToday ? 2 : undefined,
                opacity: isPast && !isDone && isSeance ? 0.5 : 1,
              }}>
              {isSeance && art ? (
                <>
                  <Photo img={art.img} pos="center 22%" style={{ position: "absolute", inset: 0 }} />
                  <div className="absolute inset-0" style={{ background: "var(--voile-carte)" }} />
                  {isDone && (
                    <span className="absolute top-1 right-1 rounded-full flex items-center justify-center"
                      style={{ width: 14, height: 14, background: "#8B5CF6", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                      <Check size={9} strokeWidth={3.4} style={{ color: "#fff" }} />
                    </span>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(var(--accent-rgb),0.22)", borderRadius: "var(--r-controle)" }}>
                  <Moon size={13} strokeWidth={1.8} style={{ color: "var(--text-3)", opacity: 0.7 }} />
                </div>
              )}
              <span className="absolute inset-x-0 bottom-[3px] text-center text-[8.5px] font-extrabold tracking-wide"
                style={{
                  color: isSeance ? "rgba(255,255,255,0.92)" : "var(--text-3)",
                  textShadow: isSeance ? "0 1px 4px rgba(0,0,0,0.7)" : "none",
                }}>
                {letter}
              </span>
            </button>
          );
        })}
      </div>

      {story && (
        <p className="vy-corps mt-3">{story}</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ④ Ton élan — la preuve qu'on avance. Série de semaines actives +
   totaux de la semaine + 7 derniers jours. Teal = progrès. Aucune
   culpabilité : un jour vide est un trait discret, jamais un reproche.
   ════════════════════════════════════════════════════════════════════ */
type ElanData = {
  bars: { label: string; min: number; done: boolean; today: boolean }[];
  sessions: number; minutes: number; kcal: number; streak: number; hasHistory: boolean;
  prevMinutes: number;   // total de la semaine dernière (pour la comparaison)
  record: number;        // plus longue séance sur la fenêtre (8 sem.)
};

const fmtDur = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;

function ElanStrip({ data, onOpen }: { data: ElanData | null; onOpen: () => void }) {
  if (!data) return null; // le temps du chargement : rien, pas de flash
  const { bars, sessions, minutes, kcal, streak, hasHistory } = data;
  const maxMin = Math.max(1, ...bars.map((b) => b.min));
  const barH = (min: number) => (min <= 0 ? 4 : Math.round(6 + (min / maxMin) * 30));

  return (
    <motion.button
      whileTap={{ scale: 0.98 }} onClick={onOpen}
      className="w-full text-left cursor-pointer block px-4 pt-3.5 pb-3.5">
      <div className="flex items-center justify-between mb-3.5">
        <p className="vy-sous flex items-center gap-0.5" style={{ color: "var(--text-0)" }}>
          Ton élan
          <ChevronRight size={13} strokeWidth={2.6} style={{ color: "var(--text-3)" }} />
        </p>
        {streak > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-extrabold"
            style={{ background: "rgba(239,159,39,0.14)", color: "var(--feu-encre)" }}>
            <Flame size={12} strokeWidth={2.4} fill="#EF9F27" />
            {streak} sem.
          </span>
        )}
      </div>

      {hasHistory ? (
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-[7px]">
            {bars.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="w-[9px] rounded-full" style={{
                  height: barH(b.min),
                  background: b.today ? "#8B5CF6" : b.done ? "rgba(139,92,246,0.55)" : "rgba(var(--text-3-rgb),0.28)",
                }} />
                <span className="text-[8.5px] font-bold" style={{ color: b.today ? "#8B5CF6" : "var(--text-3)" }}>{b.label}</span>
              </div>
            ))}
          </div>
          <div className="text-right">
            <p className="vy-label mb-1">Cette semaine</p>
            <p className="leading-none">
              <span className="vy-nombre text-[26px]" style={{ color: "var(--exp-encre)" }}>{sessions}</span>
              <span className="vy-label ml-1">séance{sessions > 1 ? "s" : ""}</span>
            </p>
            <p className="vy-label mt-1.5 flex items-center justify-end gap-1.5">
              <Clock size={11} strokeWidth={2.4} />{fmtDur(minutes)}
              <span className="w-[3px] h-[3px] rounded-full" style={{ background: "var(--text-3)" }} />
              <Zap size={11} strokeWidth={2.4} style={{ color: "#EF9F27" }} fill="#EF9F27" />
              <span style={{ color: "var(--feu-encre)" }}>{kcal.toLocaleString("fr-FR")} kcal</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 pb-0.5">
          <div className="flex items-end gap-[7px]">
            {bars.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="w-[9px] rounded-full" style={{ height: 8 + (i % 3) * 6, background: "rgba(var(--text-3-rgb),0.22)" }} />
                <span className="text-[8.5px] font-bold" style={{ color: "var(--text-3)" }}>{b.label}</span>
              </div>
            ))}
          </div>
          <p className="vy-corps leading-snug">
            Ton élan démarre à la première séance.
          </p>
        </div>
      )}
    </motion.button>
  );
}

/** Sheet « Ton élan » — le détail au tap : graphique agrandi à gauche,
    chiffres à droite, comparaison vs semaine dernière. Unité discrète
    (« en minutes ») pour ne pas lasser les habitués. Zéro culpabilité :
    une semaine plus légère devient un objectif, pas un reproche. */
function ElanSheet({ data, onClose }: { data: ElanData; onClose: () => void }) {
  const { bars, sessions, minutes, kcal, streak, prevMinutes, record } = data;
  const maxMin = Math.max(1, ...bars.map((b) => b.min));
  const barH = (min: number) => (min <= 0 ? 6 : Math.round(10 + (min / maxMin) * 100));
  const avg = sessions > 0 ? Math.round(minutes / sessions) : 0;
  const delta = minutes - prevMinutes;

  return (
    <Sheet onClose={onClose} maxHeight="72vh">
      <div className="px-5 pt-2 pb-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-bold" style={{ color: "var(--text-1)" }}>Ton élan</p>
          {streak > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-extrabold"
              style={{ background: "rgba(239,159,39,0.14)", color: "#EF9F27" }}>
              <Flame size={13} strokeWidth={2.4} fill="#EF9F27" />
              {streak} sem.
            </span>
          )}
        </div>
        <p className="vy-label mt-0.5 mb-5">
          7 derniers jours · en minutes
        </p>

        <div className="flex items-end gap-5">
          {/* Graphique agrandi */}
          <div className="flex-1 flex items-end justify-between" style={{ height: 150 }}>
            {bars.map((b, i) => (
              <div key={i} className="flex flex-col items-center justify-end gap-1.5 h-full">
                {b.min > 0 && b.min === maxMin && (
                  <span className="vy-nombre text-[10px]" style={{ color: "var(--exp-encre)" }}>{b.min} min</span>
                )}
                <span className="w-[12px] rounded-full" style={{
                  height: barH(b.min),
                  background: b.today && b.min > 0 ? "#8B5CF6"
                    : b.done ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.09)",
                }} />
                <span className="text-[9px] font-bold" style={{ color: b.today ? "#8B5CF6" : "var(--text-3)" }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* Détails */}
          <div style={{ width: 128 }}>
            {([
              ["Séances", sessions > 0 ? String(sessions) : "—", "#8B5CF6"],
              ["Temps", minutes > 0 ? fmtDur(minutes) : "—", "var(--text-1)"],
              ["Calories", kcal > 0 ? kcal.toLocaleString("fr-FR") : "—", "#EF9F27"],
              ["Moyenne", avg > 0 ? `${avg} min` : "—", "var(--text-1)"],
              ["Record", record > 0 ? `${record} min` : "—", "var(--text-1)"],
            ] as const).map(([k, v, c], i, arr) => (
              <div key={k} className="flex items-baseline justify-between py-[7px]"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span className="text-[10.5px] font-semibold" style={{ color: "var(--text-3)" }}>{k}</span>
                <span className="text-[13px] font-extrabold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparaison vs semaine dernière — jamais un reproche */}
        {prevMinutes > 0 && delta > 0 && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 text-[11.5px] font-bold"
            style={{ borderRadius: "var(--r-controle)", background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)", color: "var(--exp-encre)" }}>
            ▲ +{delta} min vs la semaine dernière, ça monte.
          </div>
        )}
        {prevMinutes > 0 && delta <= 0 && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 text-[11.5px] font-semibold"
            style={{ borderRadius: "var(--r-controle)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-2)" }}>
            Encore {Math.abs(delta) + 1} min pour égaler la semaine dernière.
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « Je choisis » — catalogue Vaiiya + bibliothèque perso FUSIONNÉS.
   Un seul jeu de filtres, badge « Perso » doré, actions perso sous la tuile.
   ════════════════════════════════════════════════════════════════════ */
type MergedSession = WorkoutSession & { perso: boolean };

/* Une carte du catalogue ne porte pas toujours sa liste : le tunnel la
   retrouve par id. Tout ce qui montre ou recopie les exercices d'une
   séance passe par ici, sinon les deux résolutions divergent. */
function exosDeLaSeance(s: MergedSession): Exercise[] {
  return s.exerciseList?.length ? s.exerciseList : (exerciseData[s.id] ?? []);
}

/* Difficulté → nombre de pastilles allumées. L'orange (énergie, système D)
   dit l'intensité ; on garde le teal pour le corps, la lavande pour l'identité. */
const DIFF_LEVEL: Record<WorkoutSession["difficulty"], number> = {
  "Débutant": 1, "Intermédiaire": 2, "Avancé": 3,
};

/* Dé-doublonnage des photos DANS une rangée. resolveArt est déterministe :
   deux séances qui matchent la même règle (ou tombent sur le même hash)
   reçoivent la MÊME photo. Ici on parcourt la rangée dans l'ordre et, dès
   qu'une image est déjà prise, on tourne vers une autre variante libre de la
   même famille — la 1re carte garde sa photo « juste », les suivantes varient.
   Une rangée ne répète donc plus une photo tant qu'il reste des variantes. */
function dedupeRowArt(list: MergedSession[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const s of list) {
    const advice = getAdviceArticle(s.id);
    if (advice) {
      used.add(advice.image);
      out.set(s.id, advice.image);
      continue;
    }
    const art = resolveArt({ title: s.title, category: s.category, muscles: s.muscles });
    let img = art.img;
    if (used.has(img)) {
      const variants = FAMILY[art.fam].variants;
      const start = variants.indexOf(img);
      for (let k = 1; k <= variants.length; k++) {
        const cand = variants[(start + k) % variants.length];
        if (!used.has(cand)) { img = cand; break; }
      }
    }
    used.add(img);
    out.set(s.id, img);
  }
  return out;
}

/* ── LES DEUX DÉGRADÉS DE PREMIUM ─────────────────────────────────────
   Ce sont EXACTEMENT ceux des missions de l'accueil (`.mission[data-premium]`
   et `.tagPremium` dans AccueilSignature.module.css), recopiés ici parce
   que cet écran s'écrit en styles en ligne. Il n'y a donc qu'une seule
   façon de dessiner Premium dans toute l'app : or clair → or → magenta.
   L'ancienne paire violet → or de cet écran en inventait une deuxième, et
   le violet est déjà pris : dans le système D, il veut dire « action ».
   Si l'un des deux change un jour, les deux changent ensemble. */
const PREMIUM_PUCE = "linear-gradient(120deg,#FFD34E,#F5B120)";
/* Le cadre de la carte : le liseré or → magenta des missions, en anneau.
   ⚠️ SON ÉPAISSEUR ET LE RAYON INTÉRIEUR SONT LIÉS : `PREMIUM_RAYON` doit
   TOUJOURS valoir 20 (le rayon extérieur) moins `PREMIUM_CADRE_PX`, sinon
   l'anneau est plus épais dans les angles que sur les côtés, et c'est
   exactement le défaut que Louis a vu la première fois (« l'or dépasse un
   peu sur les cartes ») : le cadre était dessiné pour 3 px mais posé avec
   1 px de padding, donc les coins gardaient leur épaisseur d'origine.
   3 px n'est pas non plus un choix esthétique libre : en dessous, le
   dégradé n'a pas la place de se voir, surtout sur fond clair, et l'anneau
   redevient un filet uni. C'est la largeur du liseré des missions.

   ⚠️ ET L'OR NE S'ÉTALE PAS POUR AUTANT : il est saturé sur des formes
   étroites (cet anneau, la puce du bandeau, le cachet du cadenas), jamais
   en grande surface. Deux fonds dorés ont été refusés, même cause les deux
   fois, une carte ne fait que 150 px de large : la puce des missions
   étirée en aplat sur toute la largeur (« c'est nul »), puis le lavis
   or → magenta, qui sur une ligne large de 330 px s'éteint avant le bord
   mais qui sur une carte n'en montre que sa tranche la plus dense, donc un
   aplat crème dont les coins virent au jaune sale. Le bandeau porte la
   surface de l'app ; tout mettre en encre a été essayé aussi et manquait
   de couleur, d'où la puce. */
const PREMIUM_CADRE_PX = 3;
const PREMIUM_RAYON = 20 - PREMIUM_CADRE_PX;
const PREMIUM_CADRE = "linear-gradient(180deg,#FFD34E,#F5B120 38%,#C13BC1)";
/* Le lavis or → magenta des lignes Premium de l'accueil. ⚠️ Il ne sert que
   sur des surfaces LARGES (la feuille d'aperçu), jamais sur une carte du
   carrousel : voir `PREMIUM_TRAIT` pour la raison. Exactement horizontal,
   comme sur les missions. */
const PREMIUM_LAVIS = "linear-gradient(90deg,rgba(245,177,32,0.17),rgba(193,59,193,0.09) 62%,transparent)";
/* L'étincelle de la marque, telle qu'elle est dessinée sur l'affiche
   Premium de l'accueil (`.brandSpark`) : violet → or, deux barres. */
const PREMIUM_SPARK = "linear-gradient(135deg,#8B5CF6,#F5B120)";

function EtincellePremium({ taille = 11 }: { taille?: number }) {
  const barre = Math.max(2, Math.round(taille * 0.23));
  return (
    <span aria-hidden className="relative inline-block flex-shrink-0" style={{ width: taille, height: taille }}>
      <span className="absolute inset-0 m-auto rounded-full" style={{ width: barre, height: taille, background: PREMIUM_SPARK }} />
      <span className="absolute inset-0 m-auto rounded-full" style={{ width: taille, height: barre, background: PREMIUM_SPARK }} />
    </span>
  );
}

/* Le cadenas doré, posé là où vit le ⋯ des autres cartes, et seulement sur
   une séance ou un cours qu'on n'a pas encore. C'est le même cachet que sur
   les missions de l'accueil (`Cadenas` dans AccueilSignature.tsx) : un seul
   signe de verrou dans toute l'app, appris une fois.

   ⚠️ Un « + » a tenu la place pendant une journée, puis Louis est revenu au
   verrou : il ne se reconnaissait pas et ne donnait pas l'idée qu'on
   pouvait toucher. Ne pas refaire l'aller-retour.

   Il ne se touche pas : la carte entière ouvre déjà l'aperçu Premium, et
   deux boutons superposés au même endroit ne donneraient pas deux
   destinations, juste une cible à moitié fiable. */
function Cadenas() {
  return (
    <span aria-hidden
      className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none"
      style={{ background: PREMIUM_PUCE, color: "#3A2402", boxShadow: "0 3px 10px rgba(84,52,2,0.42)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <rect x="4" y="10.5" width="16" height="11" rx="2.6" fill="currentColor" stroke="none" />
        <path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9" />
      </svg>
    </span>
  );
}

function SessionTile({ session, onStart, onManage, onPremium, canAccessPremium, imgOverride }: {
  session: MergedSession;
  onStart: (s: MergedSession) => void;
  onManage: (s: MergedSession) => void;
  onPremium: (s: MergedSession) => void;
  canAccessPremium: boolean;
  imgOverride?: string;
}) {
  const advice = getAdviceArticle(session.id);
  const tileArt = resolveArt({ title: session.title, category: session.category, muscles: session.muscles });
  const img = imgOverride ?? advice?.image ?? tileArt.img;
  const level = DIFF_LEVEL[session.difficulty];
  const isPremium = session.access === "premium";
  const premiumLocked = isPremium && !canAccessPremium;
  // Le différenciateur : les muscles. À défaut (séance sans muscles listés),
  // la famille de mouvement (« Poussée », « Tirage »…) fait un repli parlant.
  const muscles = session.muscles.filter(Boolean).slice(0, 3).join(" · ") || tileArt.label;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${isPremium ? "rounded-[20px] overflow-hidden" : ""}`}
      style={isPremium ? {
        padding: PREMIUM_CADRE_PX,
        background: PREMIUM_CADRE,
        boxShadow: "0 12px 28px -14px rgba(198,140,20,0.55)",
      } : undefined}
    >
      {/* Le bandeau dit le MOT, ce qu'aucune couleur ne fait seule : l'étincelle
          de la marque, puis « Premium » en or. La surface est celle de l'app et
          le filet doré fait la séparation ; deux fonds dorés ont été essayés
          puis refusés avant celui-là, le raisonnement est sur PREMIUM_TRAIT.
          Le signe « incluse dans ton offre » est parti avec eux : chez un
          abonné, une séance Premium est simplement une séance, on ne lui
          revend pas ce qu'il paie déjà. */}
      {isPremium && (
        <div className="h-7 px-2 flex items-center gap-[6px]"
          style={{
            background: "rgb(var(--surface-rgb))",
            borderBottom: "1px solid rgba(245,177,32,0.22)",
            borderTopLeftRadius: PREMIUM_RAYON,
            borderTopRightRadius: PREMIUM_RAYON,
          }}>
          <EtincellePremium />
          {/* La couleur revient par la PUCE, pas par le fond : c'est la
              `.tagPremium` des missions, à sa vraie taille. Un or saturé de
              50 px se lit comme un bijou ; le même étalé sur 150 px se lit
              comme une tache. */}
          <span className="px-[5px] py-[2px] rounded-[5px] text-[11px] font-semibold"
            style={{ background: PREMIUM_PUCE, color: "#3A2402" }}>
            Premium
          </span>
        </div>
      )}
      {/* La tuile = un seul geste : lancer. Photo NATURELLE plein cadre.
          Quatre repères à leur place : difficulté (pastilles orange, coin
          haut-gauche) · durée (badge, coin haut-droite) · nom · muscles
          (lavande maison). Les coins portent la méta, le bas l'identité. */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => premiumLocked ? onPremium(session) : onStart(session)}
        className={`w-full overflow-hidden relative cursor-pointer border-none p-0 block ${isPremium ? "" : "rounded-[18px]"}`}
        style={{
          aspectRatio: "3 / 4",
          boxShadow: "var(--ombre-pose)",
          // Le bas de la carte Premium épouse l'anneau ; le haut est droit,
          // c'est le bandeau qui porte les deux coins hauts.
          ...(isPremium ? { borderBottomLeftRadius: PREMIUM_RAYON, borderBottomRightRadius: PREMIUM_RAYON } : null),
        }}
        aria-label={premiumLocked
          ? `${session.title}, réservé à Premium`
          : advice ? `Lire : ${session.title}` : `Lancer : ${session.title}`}
      >
        <Photo img={img} pos={advice?.imagePosition ?? "center 20%"} style={{ position: "absolute", inset: 0 }} />

        {/* Difficulté — pastilles (orange = énergie/intensité, système D).
            forcedColorAdjust:none → l'orange survit au mode « couleurs forcées »
            (hérité par les 3 points). */}
        {advice ? (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-[7px] py-[4px] rounded-full"
            style={{ background: "var(--verre-photo)", backdropFilter: "blur(6px)", border: "1px solid var(--verre-photo-bord)" }}>
            <BookOpen size={9} strokeWidth={2.4} className="flex-shrink-0 text-white" aria-hidden />
            <span className="text-[7.5px] leading-none font-semibold text-white">
              {session.duration} min · lire
            </span>
          </span>
        ) : (
          <span className="absolute top-2 left-2 flex items-center gap-[3px] px-[7px] py-[4px] rounded-full"
            style={{ background: "var(--verre-photo)", backdropFilter: "blur(6px)", border: "1px solid var(--verre-photo-bord)", forcedColorAdjust: "none" }}
            aria-label={`Difficulté : ${session.difficulty}`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 rounded-full"
                style={{ background: i < level ? "#EF9F27" : "rgba(255,255,255,0.3)" }} />
            ))}
          </span>
        )}

        {/* Durée — badge discret */}
        {!advice && (
          <span className="absolute top-2 right-2 px-2 py-[3px] rounded-full text-[8px] font-extrabold tracking-[0.05em] text-white"
            style={{ background: "var(--verre-photo)", backdropFilter: "blur(6px)", border: "1px solid var(--verre-photo-bord)" }}>
            {session.duration} MIN
          </span>
        )}

        {/* Scrim bas : nom (blanc) + muscles (lavande = notre identité).
            forcedColorAdjust:none → en mode « couleurs forcées », on garde
            NOTRE dégradé, le nom blanc et la lavande des muscles (hérité par
            les deux <p>), au lieu d'un repeint système illisible. */}
        <div className="absolute inset-x-0 bottom-0 pl-2.5 pb-3 pt-12 flex flex-col items-start text-left"
          style={{
            // On dégage le coin quand une pastille l'occupe : le ⋯ des séances
            // à soi, le cadenas d'une séance qu'on n'a pas encore.
            paddingRight: session.perso || premiumLocked ? 34 : 10,
            background: "var(--voile-affiche)",
            forcedColorAdjust: "none",
          }}>
          <p className="text-[12.5px] font-semibold text-white leading-[1.12] tracking-tight"
            style={{
              display: "-webkit-box", WebkitLineClamp: advice ? 3 : 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}>
            {session.title}
          </p>
          <p className="text-[10.5px] font-semibold mt-1 leading-snug"
            style={{
              color: "#C9B8FF",
              display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
              textShadow: "0 1px 6px rgba(0,0,0,0.45)",
            }}>
            {advice?.theme ?? muscles}
          </p>
          {!session.perso && !isPremium && (
            <span className="mt-1.5 text-[11px] font-bold"
              style={{ color: "rgba(255,255,255,0.68)", textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>
              Incluse
            </span>
          )}
        </div>
      </motion.button>

      {/* Gérer — un ⋯ discret en bas-droite, hors du chemin du nom.
          Sur TOUTES les cartes depuis le 2026-07-29 : sur une séance
          Vaiiya, il ouvre « M'en inspirer », le chemin le moins
          intimidant vers une séance à soi (pas de page blanche). */}
      {!advice && !premiumLocked && (
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => onManage(session)}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
          style={{ background: "var(--verre-photo)", backdropFilter: "blur(6px)", border: "1px solid var(--verre-photo-bord)" }}
          aria-label={session.perso ? `Gérer : ${session.title}` : `Options : ${session.title}`}>
          <MoreHorizontal size={14} strokeWidth={2.2} style={{ color: "rgba(255,255,255,0.88)" }} />
        </motion.button>
      )}

      {/* Le coin que le ⋯ laisse vide sur une carte verrouillée. Il ne
          restait rien à cet endroit, alors qu'il pouvait dire d'un coup
          d'œil que la carte est fermée. */}
      {premiumLocked && <Cadenas />}
    </motion.div>
  );
}

/* Aperçu avant achat : on montre la valeur exacte de la séance avant de
   parler prix. La photo reste naturelle et trois gestes animés rendent le
   contenu concret ; le CTA Premium n'arrive qu'après cette preuve. */
function PremiumPreviewSheet({ session, premiumCount, onClose, onUpgrade }: {
  session: MergedSession;
  premiumCount: number;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const advice = getAdviceArticle(session.id);
  const art = resolveArt({ title: session.title, category: session.category, muscles: session.muscles });
  const preview = (session.previewExercises
    ?? session.exerciseList?.slice(0, 3).map((exercise) => exercise.name)
    ?? []).slice(0, 3);
  const others = Math.max(0, premiumCount - 1);
  const promise = advice?.subtitle ?? session.subtitle ?? session.muscles.join(" · ");
  const premiumSubject = advice ? "Ce cours" : "Cette séance";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[145] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(8,5,16,0.64)", backdropFilter: "blur(5px)" }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 44, opacity: 0 }}
        transition={{ type: "spring", stiffness: 390, damping: 34 }}
        className="w-full max-w-lg rounded-t-[28px] md:rounded-[28px] overflow-hidden"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.2)",
          boxShadow: "0 -18px 54px rgba(0,0,0,0.46)",
          maxHeight: "92dvh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-8 px-4 flex items-center justify-center gap-2"
          style={{ background: `${PREMIUM_LAVIS},rgb(var(--surface-rgb))`, borderBottom: "1px solid rgba(245,177,32,0.2)" }}>
          <EtincellePremium taille={12} />
          <span className="text-[11px] font-semibold" style={{ color: "var(--or-encre)" }}>
            {advice ? "Aperçu du cours Premium" : "Aperçu Premium"}
          </span>
        </div>

        <div className="relative" style={{ aspectRatio: "16 / 9" }}>
          <Photo img={advice?.image ?? art.img} pos={advice?.imagePosition ?? "center 24%"} style={{ position: "absolute", inset: 0 }} />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-16"
            style={{ background: "var(--voile-affiche)" }}>
            <p className="text-[20px] font-semibold leading-[1.05] text-white"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.58)" }}>
              {session.title}
            </p>
            <p className="text-[11px] font-semibold mt-1.5 text-white/75">{promise}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: "var(--verre-photo)", border: "1px solid var(--verre-photo-bord)", backdropFilter: "blur(6px)" }}
            aria-label="Fermer l’aperçu"
          >
            <X size={14} strokeWidth={2.2} />
          </motion.button>
        </div>

        <div className="px-5 pt-4 pb-5">
          <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: "var(--text-2)" }}>
            <span>{session.duration} min{advice ? " de lecture" : ""}</span>
            <span aria-hidden style={{ color: "var(--text-3)" }}>·</span>
            {advice ? (
              <span className="truncate">{advice.theme}</span>
            ) : (
              <>
                <span>{session.difficulty}</span>
                <span aria-hidden style={{ color: "var(--text-3)" }}>·</span>
                <span className="truncate">{session.muscles.slice(0, 2).join(" · ")}</span>
              </>
            )}
          </div>

          {advice ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>
                Dans ce mini-cours
              </p>
              <p className="text-[12.5px] font-semibold leading-relaxed mt-2" style={{ color: "var(--text-2)" }}>
                {advice.intro}
              </p>
              <div className="mt-3 space-y-2">
                {advice.sections.slice(0, 3).map((section, index) => (
                  <div key={section.title} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(var(--accent-rgb),0.07)", border: "1px solid rgba(var(--accent-rgb),0.11)" }}>
                    <span className="text-[9px] font-black" style={{ color: "var(--accent)" }}>0{index + 1}</span>
                    <span className="text-[11px] font-bold" style={{ color: "var(--text-1)" }}>{section.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : preview.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>
                Les premiers mouvements
              </p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {preview.map((name) => (
                  <div key={name} className="rounded-2xl px-1.5 pt-1.5 pb-2 overflow-hidden text-center"
                    style={{ background: "rgba(var(--accent-rgb),0.07)", border: "1px solid rgba(var(--accent-rgb),0.11)" }}>
                    <ExerciseGuide name={name} compact loading="lazy" />
                    <p className="text-[9px] font-bold leading-tight line-clamp-2 min-h-[22px]" style={{ color: "var(--text-2)" }}>
                      {name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl px-4 py-3.5"
            style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.14)" }}>
            <p className="text-[13px] font-bold leading-snug" style={{ color: "var(--text-1)" }}>
              {others > 0
                ? `${premiumSubject} et ${others} autre${others > 1 ? "s" : ""} sont inclus${advice ? "" : "es"} avec Premium.`
                : `${premiumSubject} est inclus${advice ? "" : "e"} avec Premium.`}
            </p>
            <p className="text-[10.5px] mt-1 leading-relaxed" style={{ color: "var(--text-3)" }}>
              Débloque tout le catalogue, pas seulement {advice ? "cette lecture" : "cette séance"}.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onUpgrade}
            className="w-full h-12 mt-4 rounded-2xl text-[13px] font-black text-white"
            style={{
              background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
              boxShadow: "var(--ombre-action)",
            }}
          >
            Débloquer {advice ? "tous les cours" : "toutes les séances"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="w-full h-10 mt-1 text-[11.5px] font-semibold"
            style={{ color: "var(--text-3)" }}
          >
            Pas maintenant
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Menu « Gérer » d'une séance perso — remplace la barre de réglages sous
   les tuiles : la grille reste pure, les réglages ont leur propre écran. */
/* Une ligne du menu — même gabarit pour toutes, l'icône porte le sens. */
function LigneMenu({ icon: Icon, label, sub, onClick }: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 cursor-pointer text-left border-none bg-transparent">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
        <Icon size={14} strokeWidth={1.9} style={{ color: "var(--accent)" }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{label}</span>
        {sub && (
          <span className="block text-[10.5px] font-light mt-0.5 leading-snug" style={{ color: "var(--text-3)" }}>{sub}</span>
        )}
      </span>
      <ChevronRight size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
    </motion.button>
  );
}

function ManageSheet({ session, week, onClose, onEdit, onDelete, onVisibilityChange, onInspirer, onPlanifier }: {
  session: MergedSession;
  week: PlanningDay[] | null;
  onClose: () => void;
  onEdit: (s: WorkoutSession) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, vis: Visibility) => void;
  onInspirer: (s: MergedSession) => void;
  onPlanifier: (s: MergedSession, date: string) => void;
}) {
  const art = resolveArt({ title: session.title, category: session.category, muscles: session.muscles });
  const [vis, setVis] = useState<Visibility>((session.visibility ?? "private") as Visibility);
  /* Les deux détours restent DANS la feuille : empiler une modale sur une
     modale sur téléphone, on ne sait plus d'où on vient ni où on ferme. */
  const [vue, setVue] = useState<"menu" | "jours" | "exos">("menu");
  const exos = exosDeLaSeance(session);
  const dates = weekDates();
  const today = todayYmd();
  const parJour = useMemo(() => parDate(week), [week]);

  const retour = (
    <div className="flex items-center gap-2 px-5 pt-1 pb-2">
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => setVue("menu")}
        className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer border-none flex-shrink-0"
        style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Retour">
        <ChevronLeft size={15} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
      </motion.button>
      <p className="text-[13.5px] font-bold" style={{ color: "var(--text-1)" }}>
        {vue === "jours" ? "Quel jour ?" : `Les exercices · ${exos.length}`}
      </p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(12,8,22,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.14)",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.4)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        </div>

        {/* La séance dont on parle — sa vignette, son nom */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-4">
          <Photo img={art.img} pos="center 20%"
            className="rounded-xl flex-shrink-0" style={{ width: 46, height: 61 }} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight truncate" style={{ color: "var(--text-1)" }}>{session.title}</p>
            <p className="text-[10.5px] font-medium mt-1" style={{ color: "var(--text-3)" }}>
              {session.perso ? "Séance perso" : "Séance Vaiiya"} · {session.duration} min
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div aria-hidden className="h-px mx-5" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />

        {/* ── Le détour « quel jour ? » ── on écrit sur la semaine réelle,
           donc on montre ce qui est déjà posé : remplacer, ça se voit. */}
        {vue === "jours" ? (
          <>
            {retour}
            <div className="px-5 pb-4">
              {DAY_FULL.map((nom, i) => {
                const date = dates[i];
                const jour = parJour[date] ?? null;
                const passe = date < today;
                const prise = hasSeance(jour);
                const faite = jour?.status === "done";
                const bloque = passe || faite;
                return (
                  <motion.button key={date} whileTap={bloque ? undefined : { scale: 0.98 }}
                    onClick={() => { if (!bloque) { onPlanifier(session, date); onClose(); } }}
                    disabled={bloque}
                    className="w-full flex items-center gap-3 py-2.5 text-left border-none bg-transparent"
                    style={{ opacity: bloque ? 0.38 : 1, cursor: bloque ? "default" : "pointer" }}>
                    <span className="w-[42px] text-[11px] font-semibold flex-shrink-0"
                      style={{ color: date === today ? "var(--accent)" : "var(--text-2)" }}>
                      {nom.slice(0, 3)}
                    </span>
                    <span className="flex-1 min-w-0 text-[12.5px] font-semibold truncate"
                      style={{ color: prise ? "var(--text-2)" : "var(--text-3)" }}>
                      {faite ? "Séance faite ✓" : prise ? dayTitle(jour!) : "Repos"}
                    </span>
                    {!bloque && (
                      <span className="text-[10px] font-bold flex-shrink-0"
                        style={{ color: prise ? "#EF9F27" : "var(--accent)" }}>
                        {prise ? "Remplacer" : date === today ? "Aujourd’hui" : "Choisir"}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </>
        ) : vue === "exos" ? (
          <>
            {retour}
            <div className="px-5 pb-4 overflow-y-auto" style={{ maxHeight: "58vh", scrollbarWidth: "none" }}>
              {exos.map((e, i) => (
                <div key={`${e.name}-${i}`} className="flex items-center gap-3 py-1.5">
                  <span className="rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.55)", width: 52, height: 52 }}>
                    <ExerciseThumb name={e.name} size={48} delay={i * 130} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{e.name}</span>
                    <span className="block text-[10.5px] font-medium mt-0.5" style={{ color: "var(--text-3)" }}>
                      {e.sets} × {e.reps}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : !session.perso ? (
          /* ── Séance Vaiiya : on ne la modifie pas, on s'en sert ──
             La copie n'est écrite nulle part tant que la création
             n'est pas validée. */
          <>
            <LigneMenu icon={Layers} label="M’en inspirer"
              sub="Ses exercices dans une séance à toi, à modifier comme tu veux"
              onClick={() => { onInspirer(session); onClose(); }} />
            <LigneMenu icon={CalendarDays} label="Ajouter à ma semaine"
              sub="Elle se pose sur le jour que tu choisis"
              onClick={() => setVue("jours")} />
            {exos.length > 0 && (
              <LigneMenu icon={Dumbbell} label="Voir les exercices"
                sub={`Les ${exos.length} mouvements, avant de te lancer`}
                onClick={() => setVue("exos")} />
            )}
            <div style={{ height: 6 }} />
          </>
        ) : (
        <>
        {/* Poser sa propre séance sur un jour : même geste que le catalogue */}
        <LigneMenu icon={CalendarDays} label="Ajouter à ma semaine"
          sub="Elle se pose sur le jour que tu choisis"
          onClick={() => setVue("jours")} />

        <div aria-hidden className="h-px mx-5" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />

        {/* Modifier */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onEdit(session)}
          className="w-full flex items-center gap-3 px-5 py-3.5 cursor-pointer text-left border-none bg-transparent">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
            <Pencil size={14} strokeWidth={1.9} style={{ color: "var(--accent)" }} />
          </span>
          <span className="flex-1 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Modifier la séance</span>
          <ChevronRight size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        </motion.button>

        <div aria-hidden className="h-px mx-5" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />

        {/* Visibilité — les 3 choix visibles d'un coup, plus de cycle mystère */}
        <div className="px-5 pt-3.5 pb-1">
          <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--text-3)" }}>
            Qui peut la voir ?
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {VIS_ORDER.map((k) => {
              const cfg = VIS_CONFIG[k];
              const CfgIcon = cfg.icon;
              const active = vis === k;
              return (
                <motion.button key={k} whileTap={{ scale: 0.95 }}
                  onClick={() => { setVis(k); onVisibilityChange(session.id, k); }}
                  className="h-[52px] rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
                  style={active
                    ? { background: "rgba(var(--accent-rgb),0.1)", border: "1.5px solid rgba(var(--accent-rgb),0.55)" }
                    : { background: "rgba(var(--tint-violet-rgb),0.4)", border: "1.5px solid transparent" }}
                  aria-pressed={active}>
                  <CfgIcon size={14} strokeWidth={2} style={{ color: active ? "var(--accent)" : "var(--text-3)" }} />
                  <span className="text-[9.5px] font-bold" style={{ color: active ? "var(--accent)" : "var(--text-3)" }}>{cfg.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Supprimer — à l'écart, en rouge, aucune ambiguïté */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onDelete(session.id)}
          className="w-full flex items-center gap-3 px-5 py-3.5 mt-2 mb-1 cursor-pointer text-left border-none bg-transparent">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(252,129,129,0.1)" }}>
            <Trash2 size={14} strokeWidth={1.9} style={{ color: "#FC8181" }} />
          </span>
          <span className="text-[13px] font-semibold" style={{ color: "#FC8181" }}>Supprimer la séance</span>
        </motion.button>
        </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   « Mon espace » — le bandeau qui ouvre le catalogue.

   Le haut de l'écran doit dire qu'il y a DEUX univers : ce que Vaiiya
   propose (les collections photo, en dessous) et ce qui est à toi. D'où
   un bloc qui ne ressemble à aucune tuile de collection : pas de photo,
   la couleur de marque, un personnage animé. Il ne montre AUCUNE séance
   — les tiennes sont derrière « Les voir », comme une collection.
   ════════════════════════════════════════════════════════════════════ */
function MonEspaceBloc({ count, max, onComposer, onVoir }: {
  count: number;
  max: number;            // Infinity = illimité
  onComposer: () => void;
  onVoir: () => void;
}) {
  const plein = count >= max;
  /* Au-dessus du plafond (ancien abonné, plafond baissé) on ne montre pas
     un « 5 sur 3 » absurde : ses séances sont à lui, elles restent. */
  const compteur = max === Infinity || count > max
    ? `${count} séance${count > 1 ? "s" : ""} à toi`
    : `${count} sur ${max} gardées`;

  return (
    <section className="mb-7">
      <div className="relative rounded-[22px] overflow-hidden"
        style={{
          background: "linear-gradient(118deg, rgba(var(--accent-rgb),0.16), rgba(var(--accent-rgb),0.05) 62%, rgba(var(--accent-rgb),0.11))",
          border: "1px solid rgba(var(--accent-rgb),0.2)",
        }}>
        {/* Le halo + le personnage : la signature Vaiiya, jamais une photo */}
        <div aria-hidden className="absolute pointer-events-none"
          style={{
            right: -34, top: "50%", transform: "translateY(-50%)",
            width: 210, height: 210, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(var(--accent-rgb),0.22), transparent 68%)",
          }} />
        <div aria-hidden className="absolute right-2 sm:right-5 bottom-0 pointer-events-none opacity-90">
          <ExerciseThumb name="Squat" size={112} />
        </div>

        <div className="relative px-4 py-4 sm:px-5 sm:py-5" style={{ paddingRight: 124 }}>
          <p className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
            Ton espace
          </p>
          <h3 className="text-[19px] sm:text-[21px] font-semibold leading-tight mt-1" style={{ color: "var(--text-1)" }}>
            Mes séances
          </h3>
          <p className="text-[11px] font-light mt-1 leading-snug" style={{ color: "var(--text-3)" }}>
            {count === 0
              ? "Composée par toi, dans 102 exercices animés."
              : <>
                  <span className="font-bold" style={{ color: plein ? "var(--gold)" : "var(--text-2)" }}>{compteur}</span>
                  {" · 102 exercices animés"}
                </>}
          </p>

          <div className="flex items-center gap-2 mt-3.5">
            <motion.button whileTap={{ scale: 0.96 }} onClick={onComposer}
              className="h-9 px-3.5 rounded-full flex items-center gap-1.5 cursor-pointer border-none text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 6px 16px rgba(139,92,246,0.32)" }}>
              <Plus size={14} strokeWidth={2.6} />
              <span className="text-[12px] font-bold">Composer</span>
            </motion.button>
            {count > 0 && (
              <motion.button whileTap={{ scale: 0.96 }} onClick={onVoir}
                className="h-9 px-3 rounded-full flex items-center gap-0.5 cursor-pointer bg-transparent flex-shrink-0"
                style={{ border: "1px solid rgba(var(--accent-rgb),0.28)", color: "var(--accent)" }}>
                <span className="text-[12px] font-bold">Les voir</span>
                <ChevronRight size={13} strokeWidth={2.6} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Le mur, quand les places gratuites sont prises. Il se voit AVANT
   d'avoir composé quoi que ce soit, et il nomme la sortie gratuite. */
function PleinSheet({ max, onVoir, onPremium, onClose }: {
  max: number;
  onVoir: () => void;
  onPremium: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(8,5,16,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="w-full max-w-md rounded-t-[26px] md:rounded-[26px] overflow-hidden"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.18)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-6 pb-5">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(var(--gold-rgb),0.14)" }}>
            <Layers size={18} strokeWidth={1.9} style={{ color: "var(--gold)" }} />
          </span>
          <p className="text-[17px] font-semibold mt-3" style={{ color: "var(--text-1)" }}>
            Tes places sont prises
          </p>
          <p className="text-[12px] font-light mt-1.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
            En gratuit, tu gardes {max} séances. Supprime celle que tu ne fais plus, la place
            se libère tout de suite. Avec Premium, tu en gardes autant que tu veux.
          </p>

          <motion.button whileTap={{ scale: 0.97 }} onClick={onPremium}
            className="w-full h-12 mt-5 rounded-2xl text-[13px] font-black text-white cursor-pointer border-none"
            style={{ background: "linear-gradient(120deg,var(--accent),var(--gold))", boxShadow: "0 8px 22px rgba(139,92,246,0.3)" }}>
            Passer Premium
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onVoir}
            className="w-full h-11 mt-1 text-[12px] font-semibold cursor-pointer bg-transparent border-none"
            style={{ color: "var(--text-2)" }}>
            Voir mes séances
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Largeur d'une carte du carrousel — 2,2 cartes visibles sur téléphone (peek). */
const ROW_CARD_W = 150;

/* Une rangée = un slide horizontal. Sur téléphone : swipe natif. Sur PC :
   deux flèches discrètes dans l'en-tête (pas de barre de scroll moche). */
function SessionRow({ label, count, children }: {
  label: string; count: number; children: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * (ROW_CARD_W + 12) * 2, behavior: "smooth" });

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <span className="vy-label">{label}</span>
        <span className="vy-label" style={{ color: "var(--text-3)" }}>{count}</span>
        <span aria-hidden className="flex-1 h-px" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />
        {/* Flèches — desktop uniquement, discrètes */}
        <div className="hidden md:flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.86 }} onClick={() => nudge(-1)}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.6)" }} aria-label="Précédent">
            <ChevronLeft size={13} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.86 }} onClick={() => nudge(1)}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.6)" }} aria-label="Suivant">
            <ChevronRight size={13} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
          </motion.button>
        </div>
      </div>
      {/* -mx-5 px-5 : les cartes filent jusqu'au bord tout en restant alignées */}
      <div ref={scroller} className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5"
        style={{ scrollbarWidth: "none", scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
    </section>
  );
}

/* Le bloc Premium du catalogue, aligné sur celui de l'accueil
   (`.premiumVault`) : il garde la SURFACE de l'app comme les autres
   rangées, et ne porte que sa bordure dorée. Ce n'est pas le bloc qui dit
   Premium, ce sont les cartes, avec exactement les mêmes signes que
   partout ailleurs. Le lavis violet → or qu'il portait avant faisait
   l'inverse : il criait au niveau du cadre et laissait les cartes muettes.

   Le compte a changé de place et d'encre : il était un « 9 » gris collé au
   titre, il devient le chiffre en or qu'on lit à droite. C'est la réponse à
   « pourquoi payer », et elle tient en un nombre, comme le « +70 EXP » des
   missions. */
function PremiumSessionRow({ count, children, title = "Continue avec Premium", unite = "séance", description = "Des séances plus ciblées." }: {
  count: number;
  children: React.ReactNode;
  title?: string;
  unite?: string;
  description?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * (ROW_CARD_W + 12) * 2, behavior: "smooth" });
  // « cours » ne prend pas de s de plus : la règle, pas une exception.
  const mot = count > 1 && !/[sxz]$/.test(unite) ? `${unite}s` : unite;

  return (
    <section className="mb-7 rounded-[24px] overflow-hidden"
      style={{
        background: "rgba(var(--surface-rgb),0.9)",
        border: "1px solid rgba(245,177,32,0.32)",
        boxShadow: "0 14px 30px -22px rgba(198,140,20,0.62)",
      }}>
      <div className="px-4 pt-4 pb-3.5 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(245,177,32,0.18)" }}>
        {/* L'étincelle de la marque, dessinée comme sur l'accueil : le sceau
            violet → magenta. L'or de ce bloc dit « Premium », il ne dit
            jamais « appuie ici », donc il ne touche pas au sceau. */}
        <span aria-hidden className="relative flex-shrink-0"
          style={{
            width: 38, height: 38,
            clipPath: "polygon(50% 0, 88% 17%, 100% 55%, 75% 90%, 34% 100%, 4% 72%, 8% 27%)",
            background: "linear-gradient(145deg,#8B5CF6,#C13BC1)",
            filter: "drop-shadow(0 7px 10px rgba(139,92,246,0.22))",
          }}>
          <span className="absolute inset-0 m-auto rounded-full" style={{ width: 3, height: 15, background: "#fff" }} />
          <span className="absolute inset-0 m-auto rounded-full" style={{ width: 15, height: 3, background: "#fff" }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold leading-tight" style={{ color: "var(--text-0)" }}>
            {title}
          </p>
          <p className="text-[10.5px] leading-relaxed mt-1" style={{ color: "var(--text-3)" }}>
            {description}
          </p>
        </div>
        <div className="flex-shrink-0 text-right" style={{ color: "var(--or-encre)" }}>
          <p className="text-[19px] font-black leading-none tracking-[-0.02em]">{count}</p>
          <p className="text-[11px] font-semibold mt-1" style={{ opacity: 0.74 }}>
            {mot}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.86 }} onClick={() => nudge(-1)}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Précédent">
            <ChevronLeft size={13} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.86 }} onClick={() => nudge(1)}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Suivant">
            <ChevronRight size={13} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
          </motion.button>
        </div>
      </div>
      <div ref={scroller} className="flex gap-3 overflow-x-auto px-4 pt-4 pb-4"
        style={{ scrollbarWidth: "none", scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   L'ENTONNOIR — grandes collections d'intention (réf. validée : ShapeYou).
   Volontairement chevauchantes : une séance vit dans PLUSIEURS collections
   (multi-appartenance par prédicat). Une collection vide reste une porte
   ouverte : on la montre « Bientôt », on ne la cache pas — la banque se
   remplira. Les photos sont naturelles, les titres blancs font le reste.
   ════════════════════════════════════════════════════════════════════ */
type CatFamille = "objectif" | "zone" | "terrain" | "moment" | "lire";

type CatDef = {
  id: string;
  name: string;
  tag: string;                                   // la promesse, en une ligne
  img: string;
  pos?: string;
  /** La rangée éditoriale où la collection se range au niveau 1.
   *  « tiennes » n'en a pas : elle est épinglée en tête, hors grille. */
  famille?: CatFamille;
  match: (s: MergedSession, hay: string) => boolean;
};

/** Les quatre familles, dans l'ordre où l'on cherche : ce qu'on veut,
 *  ce qu'on travaille, où on est, et où on en est. « Pour comprendre »
 *  ferme la marche parce qu'elle ne contient pas de séance du tout. */
const FAMILLES: { id: CatFamille; label: string }[] = [
  { id: "objectif", label: "Un objectif" },
  { id: "zone", label: "Une zone" },
  { id: "terrain", label: "Un terrain" },
  { id: "moment", label: "Un moment" },
  { id: "lire", label: "Pour comprendre" },
];

const hayOf = (s: MergedSession) =>
  `${s.title} ${s.subtitle ?? ""} ${(s.muscles ?? []).join(" ")}`.toLowerCase();

/** Les séances Vaiiya récentes déclarent leurs collections explicitement.
    Les créations perso et l'ancien catalogue gardent le prédicat historique
    en repli jusqu'à leur migration, sans perdre leur multi-appartenance. */
const matchCollection = (
  id: CatalogCollection,
  fallback: (s: MergedSession, hay: string) => boolean,
) => (s: MergedSession, hay: string) =>
  s.collections ? s.collections.includes(id) : fallback(s, hay);

const CATALOG: CatDef[] = [
  { id: "tiennes", name: "Les tiennes", tag: "Tes créations, elles vivent aussi dans les autres collections.",
    img: "cat-tiennes", match: (s) => s.perso },
  { id: "express", famille: "objectif", name: "Séances express", tag: "Peu de temps, mais une vraie séance.",
    img: "cat-express", match: matchCollection("express", (s) => s.duration <= 20) },
  { id: "masse", famille: "objectif", name: "Prise de masse", tag: "Construire du muscle, brique par brique.",
    img: "cat-masse", match: matchCollection("masse", (s, hay) => /masse|hypertroph|volume/.test(hay) || (s.category === "force" && s.duration >= 40)) },
  { id: "perte", famille: "objectif", name: "Perte de poids", tag: "Brûler, sans se cramer.",
    img: "cat-perte", match: matchCollection("perte", (s, hay) => /perte|brûle|brule|minceur|sèche|seche|calorie/.test(hay) || s.category === "cardio") },
  { id: "renfo", famille: "objectif", name: "Renfo musculaire", tag: "Plus fort, partout, pour de vrai.",
    img: "cat-renfo", match: matchCollection("renfo", (s, hay) => s.category === "force" || /renfo|force|muscu/.test(hay)) },
  { id: "cardiohiit", famille: "objectif", name: "Cardio & HIIT", tag: "Le souffle court, le cœur solide.",
    img: "cat-cardiohiit", match: matchCollection("cardiohiit", (s, hay) => s.category === "cardio" || /cardio|hiit|fractionn|endurance|sprint|course|vélo|velo/.test(hay)) },
  { id: "abdos", famille: "zone", name: "Abdos & gainage", tag: "Le centre qui tient tout le reste.",
    img: "cat-abdos", match: matchCollection("abdos", (_s, hay) => /abdo|gainage|core|planche|oblique|sangle|ventre/.test(hay)) },
  { id: "jambes", famille: "zone", name: "Jambes & fessiers", tag: "La base, on ne triche pas avec les jambes.",
    img: "cat-jambes", match: matchCollection("jambes", (_s, hay) => /jambe|fessier|squat|cuisse|mollet|ischio|glute|\bleg|bas du corps|fente/.test(hay)) },
  { id: "haut", famille: "zone", name: "Haut du corps", tag: "Dos, pecs, épaules, bras, l’armure.",
    img: "cat-haut", match: matchCollection("haut", (_s, hay) => /pec|\bdos\b|épaule|epaule|bras|biceps|triceps|haut du corps|push|pull|tirage|traction|rowing|upper|poussé/.test(hay)) },
  { id: "fullbody", famille: "zone", name: "Full body", tag: "Tout le corps, une seule séance.",
    img: "cat-fullbody", match: matchCollection("fullbody", (s, hay) => s.category === "fullbody" || /full|complet|corps entier|total/.test(hay)) },
  { id: "salle", famille: "terrain", name: "À la salle", tag: "Machines, barres, charges, ton terrain.",
    img: "cat-salle", match: matchCollection("salle", (_s, hay) => /salle|machine|barre|rack|poulie|banc/.test(hay)) },
  { id: "sansmateriel", famille: "terrain", name: "Sans matériel", tag: "Ton corps suffit, partout, tout le temps.",
    img: "cat-sansmateriel", match: matchCollection("sansmateriel", (_s, hay) => /sans mat|poids du corps|maison|nomade/.test(hay)) },
  { id: "debuter", famille: "moment", name: "Débuter & reprendre", tag: "Le premier pas compte double.",
    img: "cat-debuter", match: matchCollection("debuter", (s, hay) => s.difficulty === "Débutant" || /débutant|debutant|starter|reprise|découverte|decouverte|doux/.test(hay)) },
  { id: "mobilite", famille: "moment", name: "Mobilité & posture", tag: "Bouger mieux avant de bouger plus.",
    img: "cat-mobilite", match: matchCollection("mobilite", (s, hay) => s.category === "mobilite" || /mobilit|étirement|etirement|souplesse|posture|stretch/.test(hay)) },
  { id: "recup", famille: "moment", name: "Récupération", tag: "Le muscle se construit au repos.",
    img: "cat-recup", match: matchCollection("recup", (_s, hay) => /récup|recup|détente|detente|relax|respiration|repos/.test(hay)) },
  { id: "defis", famille: "moment", name: "Défis", tag: "Un max, un chrono, un record à battre.",
    img: "cat-defis", match: matchCollection("defis", (_s, hay) => /défi|defi|challenge|\bmax\b|record/.test(hay)) },
  { id: "conseils", famille: "lire", name: "Conseils & progresser", tag: "Des conseils francs et utiles, à lire partout.",
    img: "cat-conseils", match: matchCollection("conseils", () => false) },
];

/** Tuile de collection — photo naturelle, titre blanc centré, compte.
    Une collection vide dit « Bientôt » : la porte reste ouverte. */
function CatTile({ cat, count, freeCount, premiumCount, large, onOpen }: {
  cat: CatDef;
  count: number;
  freeCount: number;
  premiumCount: number;
  /** Pleine largeur, cadrage à plat, promesse écrite. Réservé à ce qui
   *  n'est pas de la même nature que le reste de la grille. */
  large?: boolean;
  onOpen: () => void;
}) {
  const sub = count > 0
    ? premiumCount > 0
      ? `${freeCount} incluse${freeCount > 1 ? "s" : ""} · ${premiumCount} Premium`
      : `${count} séance${count > 1 ? "s" : ""}`
    : cat.id === "tiennes" ? "À toi de jouer" : "Bientôt";
  return (
    <motion.button
      whileTap={{ scale: 0.97 }} onClick={onOpen}
      className="relative w-full overflow-hidden cursor-pointer border-none p-0 block"
      style={{ aspectRatio: large ? "16 / 7" : "3 / 4", borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)" }}
      aria-label={`${cat.name}, ${sub}`}
    >
      <Photo img={cat.img} pos={cat.pos} style={{ position: "absolute", inset: 0 }} />
      {large ? (
        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-4 pt-10 text-left"
          style={{ background: "linear-gradient(90deg, rgba(var(--voile-photo-rgb),0.9) 8%, rgba(var(--voile-photo-rgb),0.62) 52%, rgba(var(--voile-photo-rgb),0.18))" }}>
          <p className="text-[18px] font-semibold text-white leading-[1.06] tracking-tight"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
            {cat.name}
          </p>
          <p className="text-[11.5px] font-light mt-1 max-w-[30ch] leading-snug" style={{ color: "rgba(255,255,255,0.78)" }}>
            {cat.tag}
          </p>
          <p className="text-[9px] font-bold mt-2" style={{ color: "rgba(255,255,255,0.62)" }}>{sub}</p>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-3.5 pt-14 flex flex-col items-center text-center"
          style={{ background: "var(--voile-affiche)" }}>
          <p className="text-[14.5px] font-semibold text-white leading-[1.08] tracking-tight"
            style={{ textWrap: "balance", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
            {cat.name}
          </p>
          <p className="text-[8.5px] font-bold mt-1" style={{ color: "rgba(255,255,255,0.68)" }}>{sub}</p>
        </div>
      )}
    </motion.button>
  );
}

function ChooseSheet({ sessions, week, loading, canAccessPremium, maxSeances, catInitial, onClose, onStart, onUpgrade, onCreate, onEdit, onDelete, onVisibilityChange, onInspirer, onPlanifier }: {
  sessions: MergedSession[];
  week: PlanningDay[] | null;
  loading: boolean;
  canAccessPremium: boolean;
  maxSeances: number;
  catInitial: string | null;
  onClose: () => void;
  onStart: (s: MergedSession) => void;
  onUpgrade: () => void;
  onCreate: () => void;
  onEdit: (s: WorkoutSession) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, vis: Visibility) => void;
  onInspirer: (s: MergedSession) => void;
  onPlanifier: (s: MergedSession, date: string) => void;
}) {
  /* Le catalogue peut s'ouvrir directement sur une collection (« libérer
     une place » mène droit aux tiennes). Lu au montage seulement : la clé
     de l'appelant remonte la feuille quand la cible change. */
  const [catId, setCatId] = useState<string | null>(catInitial ?? null);
  const [manage, setManage] = useState<MergedSession | null>(null);
  const [premiumPreview, setPremiumPreview] = useState<MergedSession | null>(null);
  const [adviceTheme, setAdviceTheme] = useState<AdviceTheme | "Tous">("Tous");

  const cat = catId ? CATALOG.find((c) => c.id === catId) ?? null : null;

  /* Multi-appartenance : chaque collection filtre la banque par prédicat. */
  const matchedAll = cat ? sessions.filter((s) => cat.match(s, hayOf(s))) : [];
  const matched = cat?.id === "conseils" && adviceTheme !== "Tous"
    ? matchedAll.filter((session) => getAdviceArticle(session.id)?.theme === adviceTheme)
    : matchedAll;
  const vaiiya = matched.filter((s) => !s.perso);
  const vaiiyaFree = vaiiya.filter((s) => s.access !== "premium");
  const vaiiyaPremium = vaiiya.filter((s) => s.access === "premium");
  const perso = matched.filter((s) => s.perso);
  const totalPremiumCount = matchedAll.filter((s) => !s.perso && s.access === "premium").length;

  /* Épinglées en haut du catalogue : ta bibliothèque n'est pas une
     catégorie éditoriale de plus, elle ne se range pas entre « Cardio »
     et « Mobilité » (décision de Louis, 2026-07-29). */
  const mesSeances = sessions.filter((s) => s.perso);

  /* Photo par séance, dé-doublonnée PAR RANGÉE (Vaiiya et « les tiennes »
     indépendamment) : deux cartes d'une même rangée ne tombent plus sur la
     même image. Fusionné en une map id → image (les id sont uniques). */
  const artById = new Map<string, string>();
  dedupeRowArt(vaiiyaFree).forEach((img, id) => artById.set(id, img));
  dedupeRowArt(vaiiyaPremium).forEach((img, id) => artById.set(id, img));
  dedupeRowArt(perso).forEach((img, id) => artById.set(id, img));

  const rowTile = (s: MergedSession, index = 0, premium = false) => (
    <div key={s.id} className="flex-shrink-0"
      style={{ width: premium && index === 0 ? 174 : ROW_CARD_W, scrollSnapAlign: "start" }}>
      <SessionTile
        session={s}
        onStart={onStart}
        onManage={setManage}
        onPremium={setPremiumPreview}
        canAccessPremium={canAccessPremium}
        imgOverride={artById.get(s.id)}
      />
    </div>
  );

  const createCard = (
    <motion.button
      whileTap={{ scale: 0.96 }} onClick={onCreate}
      className="w-full flex flex-col items-center justify-center gap-2 cursor-pointer px-3"
      style={{ aspectRatio: "3 / 4", borderRadius: "var(--r-bloc)", background: "rgba(var(--tint-violet-rgb),0.25)", border: "2px dashed rgba(var(--accent-rgb),0.32)" }}
    >
      <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
        <Plus size={17} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
      </span>
      <span className="text-[11.5px] font-bold text-center" style={{ color: "var(--text-2)" }}>Composer ma séance</span>
      <span className="text-[9px] font-medium text-center leading-snug" style={{ color: "var(--text-3)" }}>
        102 exercices animés
      </span>
    </motion.button>
  );

  return (
    <>
    <Sheet onClose={onClose} height="94dvh" maxHeight="94dvh">
      {/* Header — niveau 1 : l'invitation. Niveau 2 : retour + nom + promesse. */}
      <div className="px-5 pt-2 pb-3 flex-shrink-0 flex items-center gap-3">
        {cat ? (
          <>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setCatId(null); setAdviceTheme("Tous"); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Retour aux collections">
              <ChevronLeft size={15} strokeWidth={2.2} style={{ color: "var(--text-2)" }} />
            </motion.button>
            <div className="flex-1 min-w-0">
              <h2 className="vy-sous leading-tight truncate" style={{ color: "var(--text-0)" }}>{cat.name}</h2>
              <p className="vy-label mt-0.5 truncate">{cat.tag}</p>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <h2 className="vy-titre leading-tight" style={{ color: "var(--text-0)" }}>
              Entraînements
            </h2>
            {/* ⚠️ `.vy-corps` pose `--text-body` : l'emphase qu'il contient etait
                en `--text-2`, donc PLUS CLAIRE que la phrase autour. */}
            <p className="vy-corps mt-1">
              Un but, une envie. <span className="font-semibold" style={{ color: "var(--text-0)" }}>{sessions.length} séances et cours</span>
            </p>
          </div>
        )}
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
          <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        </motion.button>
      </div>

      {/* Le corps — remonté par clé : l'entrée glisse dans le sens du voyage */}
      <motion.div
        key={cat ? cat.id : "collections"}
        initial={{ opacity: 0, x: cat ? 26 : -26 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="overflow-y-auto px-5 flex-1"
        style={{ scrollbarWidth: "none", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        {cat?.id === "conseils" && (
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-4"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {(["Tous", ...ADVICE_THEMES] as const).map((theme) => {
              const active = adviceTheme === theme;
              return (
                <motion.button
                  key={theme}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAdviceTheme(theme)}
                  className="vy-label h-8 px-3 rounded-full flex-shrink-0 whitespace-nowrap"
                  style={active
                    ? { color: "white", background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }
                    : { color: "var(--text-2)", background: "rgba(var(--tint-violet-rgb),0.55)", border: "1px solid rgba(var(--accent-rgb),0.1)" }}
                  aria-pressed={active}
                >
                  {theme}
                </motion.button>
              );
            })}
          </div>
        )}
        {!cat ? (
          /* ── Niveau 1 : la grille des collections ── */
          loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse"
                  style={{ aspectRatio: "3 / 4", borderRadius: "var(--r-bloc)", background: "rgba(var(--tint-violet-rgb),0.5)" }} />
              ))}
            </div>
          ) : (
            <>
            {/* ── Deux univers : le tien d'abord, les collections ensuite ── */}
            <MonEspaceBloc
              count={mesSeances.length}
              max={maxSeances}
              onComposer={onCreate}
              onVoir={() => setCatId("tiennes")}
            />

            {FAMILLES.map(({ id: famille, label }) => {
              const cats = CATALOG.filter((c) => c.famille === famille);
              if (cats.length === 0) return null;
              /* La rangée « Pour comprendre » n'en contient qu'une, et
                 c'est justement la seule qui ne range pas des séances :
                 elle s'étale, les autres restent en grille. */
              const seule = cats.length === 1;
              return (
                <section key={famille} className="mb-6">
                  <div className="flex items-center gap-2 mb-2.5 px-0.5">
                    <span className="vy-label">{label}</span>
                    <span aria-hidden className="flex-1 h-px" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />
                  </div>
                  <div className={seule ? "" : "grid grid-cols-2 md:grid-cols-3 gap-3"}>
                    {cats.map((c) => {
                      const catSessions = sessions.filter((s) => c.match(s, hayOf(s)));
                      const official = catSessions.filter((s) => !s.perso);
                      const premiumCount = official.filter((s) => s.access === "premium").length;
                      const freeCount = official.length - premiumCount;
                      const count = premiumCount > 0 ? official.length : catSessions.length;
                      return (
                        <CatTile
                          key={c.id}
                          cat={c}
                          count={count}
                          freeCount={freeCount}
                          premiumCount={premiumCount}
                          large={seule}
                          onOpen={() => { setCatId(c.id); setAdviceTheme("Tous"); }}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
            </>
          )
        ) : cat.id === "tiennes" ? (
          /* ── Niveau 2, « Les tiennes » : ta bibliothèque + créer ── */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {perso.map((s) => (
              <SessionTile
                key={s.id}
                session={s}
                onStart={onStart}
                onManage={setManage}
                onPremium={setPremiumPreview}
                canAccessPremium={canAccessPremium}
                imgOverride={artById.get(s.id)}
              />
            ))}
            {createCard}
          </div>
        ) : matched.length === 0 ? (
          /* ── Niveau 2, collection vide : la porte reste ouverte ── */
          <div className="flex flex-col items-center text-center pt-12 px-6">
            <p className="vy-sous" style={{ color: "var(--text-0)" }}>Cette collection arrive</p>
            <p className="vy-corps mt-1.5 leading-relaxed max-w-[260px]">
              On la remplit séance après séance. Crée la tienne, elle apparaîtra ici.
            </p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onCreate}
              className="mt-5 px-5 h-10 rounded-full text-[12px] font-bold text-white cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
              Créer la mienne
            </motion.button>
          </div>
        ) : (
          /* ── Niveau 2 : le seuil Gratuit → Premium est volontairement
             visible. On montre la base incluse, puis l'univers payant. ── */
          <>
            {vaiiyaFree.length > 0 && (
              <SessionRow label={cat.id === "conseils" ? "À lire gratuitement" : "Pour commencer"} count={vaiiyaFree.length}>
                {vaiiyaFree.map((session, index) => rowTile(session, index))}
              </SessionRow>
            )}
            {vaiiyaPremium.length > 0 && (
              <PremiumSessionRow
                count={vaiiyaPremium.length}
                title={cat.id === "conseils" ? "Approfondis avec Premium" : undefined}
                unite={cat.id === "conseils" ? "cours" : undefined}
                description={cat.id === "conseils"
                  ? "Plateaux, récupération, programmation."
                  : undefined}
              >
                {vaiiyaPremium.map((session, index) => rowTile(session, index, true))}
              </PremiumSessionRow>
            )}
            {perso.length > 0 && (
              <SessionRow label="Les tiennes" count={perso.length}>
                {perso.map((session, index) => rowTile(session, index))}
              </SessionRow>
            )}
          </>
        )}
      </motion.div>
    </Sheet>

    {/* Menu d'une carte : réglages si elle est à toi, « m'en inspirer » sinon */}
    <AnimatePresence>
      {manage && (
        <ManageSheet
          session={manage}
          week={week}
          onClose={() => setManage(null)}
          onEdit={(s) => { setManage(null); onEdit(s); }}
          onDelete={(id) => { setManage(null); onDelete(id); }}
          onVisibilityChange={onVisibilityChange}
          onInspirer={(s) => { setManage(null); onInspirer(s); }}
          onPlanifier={(s, date) => { setManage(null); onPlanifier(s, date); }}
        />
      )}
    </AnimatePresence>
    <AnimatePresence>
      {premiumPreview && (
        <PremiumPreviewSheet
          session={premiumPreview}
          premiumCount={totalPremiumCount}
          onClose={() => setPremiumPreview(null)}
          onUpgrade={() => { setPremiumPreview(null); onUpgrade(); }}
        />
      )}
    </AnimatePresence>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « J'improvise » — 2 réponses (temps + lieu), l'IA crée.
   ════════════════════════════════════════════════════════════════════ */
const IMPRO_TIMES = [15, 30, 45, 60] as const;
type ImproPlace = "salle" | "maison" | "dehors";

function ImproviseSheet({ defaultPlace, defaultHalteres, difficulty, onClose, onLaunch }: {
  defaultPlace: ImproPlace;
  defaultHalteres: boolean;
  difficulty: string;
  onClose: () => void;
  onLaunch: (t: { id: string; title: string; duration: number; difficulty: string; category: string; exerciseList: Exercise[] }) => void;
}) {
  const [time, setTime] = useState<number>(30);
  const [place, setPlace] = useState<ImproPlace>(defaultPlace);
  const [halteres, setHalteres] = useState(defaultHalteres);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    // Même vocabulaire de lieu que le reste de l'app → la route applique
    // ses contraintes strictes de matériel.
    const lieuTxt =
      place === "salle" ? "en salle de sport"
      : place === "dehors" ? "en extérieur (parc), sans matériel, au poids du corps"
      : halteres ? "à la maison avec haltères"
      : "à la maison au poids du corps, sans matériel";
    try {
      const res = await aiFetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `Séance improvisée de ${time} min ${lieuTxt}. Équilibrée et efficace, pour une envie spontanée de bouger.`,
          category: "fullbody",
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Erreur serveur");
      const exerciseList = normalizeExercises(data.exercises);
      if (exerciseList.length === 0) throw new Error("Séance vide");
      onLaunch({
        id: `improv-${Date.now()}`,
        title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Séance improvisée",
        duration: time,
        difficulty,
        category: "Full Body",
        exerciseList,
      });
    } catch {
      setError("Pas de réponse, réessaie.");
      setLoading(false);
    }
  };

  const placeMeta: { key: ImproPlace; label: string; icon: typeof Dumbbell }[] = [
    { key: "salle",  label: "Salle",  icon: Dumbbell },
    { key: "maison", label: "Maison", icon: Home },
    { key: "dehors", label: "Dehors", icon: Sun },
  ];

  return (
    <Sheet onClose={onClose} maxHeight="80vh">
      <div className="px-5 pt-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-light flex items-center gap-2" style={{ color: "var(--text-1)" }}>
            <span style={{ color: "var(--accent)" }}>✦</span> J&apos;improvise
          </h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>
        <p className="text-[11.5px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>
          Dis-moi ta réalité, je m&apos;occupe du reste.
        </p>
      </div>

      <div className="px-5 overflow-y-auto" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
        {/* Temps */}
        <p className="vy-label mt-4 mb-2">
          Tu as combien de temps ?
        </p>
        <div className="flex gap-2">
          {IMPRO_TIMES.map((t) => (
            <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => setTime(t)}
              className="flex-1 py-2.5 cursor-pointer text-center"
              style={{ borderRadius: "var(--r-controle)", ...(time === t
                ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", border: "1px solid transparent" }
                : { background: "rgba(var(--tint-violet-rgb),0.45)", border: "1px solid rgba(var(--accent-rgb),0.14)" }) }}>
              <span className="text-[13px] font-extrabold block leading-none" style={{ color: time === t ? "#fff" : "var(--text-3)" }}>
                {t === 60 ? "60+" : t}
              </span>
              <span className="text-[8.5px] font-semibold" style={{ color: time === t ? "rgba(255,255,255,0.75)" : "var(--text-3)", opacity: 0.85 }}>min</span>
            </motion.button>
          ))}
        </div>

        {/* Lieu */}
        <p className="vy-label mt-4 mb-2">
          Tu es où ?
        </p>
        <div className="flex gap-2">
          {placeMeta.map(({ key, label, icon: PIcon }) => (
            <motion.button key={key} whileTap={{ scale: 0.94 }} onClick={() => setPlace(key)}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 cursor-pointer"
              style={{ borderRadius: "var(--r-controle)", ...(place === key
                ? { background: "rgba(var(--accent-rgb),0.13)", border: "1.5px solid var(--accent)", boxShadow: "0 0 0 3px rgba(var(--accent-rgb),0.14)" }
                : { background: "rgba(var(--tint-violet-rgb),0.45)", border: "1.5px solid rgba(var(--accent-rgb),0.14)" }) }}>
              <PIcon size={17} strokeWidth={1.8} style={{ color: place === key ? "var(--accent)" : "var(--text-3)" }} />
              <span className="text-[11px] font-bold" style={{ color: place === key ? "var(--text-1)" : "var(--text-3)" }}>{label}</span>
            </motion.button>
          ))}
        </div>

        {/* Matériel — seulement pertinent à la maison */}
        <AnimatePresence initial={false}>
          {place === "maison" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
              <button onClick={() => setHalteres((v) => !v)}
                className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-full cursor-pointer"
                style={halteres
                  ? { background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.4)" }
                  : { background: "rgba(43,212,160,0.1)", border: "1px solid rgba(43,212,160,0.4)" }}>
                <span className="text-[11px] font-bold" style={{ color: halteres ? "#8B5CF6" : "#12A87E" }}>
                  {halteres ? "J’ai des haltères" : "Sans matériel, poids du corps"}
                </span>
                <span className="relative block w-[26px] h-[15px] rounded-full" style={{ background: halteres ? "#8B5CF6" : "#2BD4A0" }}>
                  <span className="absolute top-[2px] w-[11px] h-[11px] rounded-full bg-white transition-all duration-150"
                    style={{ left: halteres ? 13 : 2 }} />
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-[11px] font-medium mt-3" style={{ color: "#FC8181" }}>{error}</p>
        )}

        {/* CTA */}
        <motion.button
          whileTap={{ scale: loading ? 1 : 0.97 }}
          onClick={generate}
          disabled={loading}
          className="w-full mt-4 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[14.5px] font-extrabold text-white"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: loading ? 0.85 : 1 }}
        >
          {loading ? (
            <>
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} className="flex">
                <Sparkles size={15} strokeWidth={2} />
              </motion.span>
              Ta séance se prépare…
            </>
          ) : (
            <>✦ Prépare ma séance</>
          )}
        </motion.button>
      </div>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « Ma semaine » — l'agenda vivant (phase 2). La semaine entière,
   jour par jour, en photos : verdict d'équilibre + charge prévue en tête,
   navigation entre semaines, actions par jour déléguées à l'IA (décaler /
   remplacer / repos) — cohérent avec le héros. Le drag direct viendra en
   phase 3.

   ⚠️ LE VERDICT A UN JUGE DEPUIS LE 2026-08-29. « Équilibrée ✦ » et
   « Ciblée » étaient une appréciation sur le travail de quelqu'un, signée
   d'une marque, et qui ne disait pas POURQUOI. Le Guide l'explique en une
   phrase au-dessus des pastilles, et l'✦ QUITTE la pastille pour revenir
   sur celui qui parle : deux signatures pour une seule opinion, c'était
   une de trop.

   ⚠️ LE CALCUL NE BOUGE PAS D'UNE LIGNE. `buckets` et `verdict` sont
   exactement ceux d'avant ; le Guide lit ce que l'écran a compté, il ne
   recompte rien. Une deuxième règle d'équilibre serait une deuxième
   vérité sur la même semaine.

   ⚠️ « Refais ma semaine » GARDE SON LIBELLÉ. C'est un mot de l'app, pas
   une parole de Guide (même règle que partout ailleurs) : ce qui le
   transforme en proposition plutôt qu'en commande adressée à une machine,
   c'est la phrase juste au-dessus, pas un nouveau texte sur le bouton.
   ════════════════════════════════════════════════════════════════════ */
const DAY_ABBR = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const MAX_WEEK_AHEAD = 6;
/** Regroupe les 6 familles en 4 grands rôles lisibles pour le verdict. */
const BALANCE_BUCKET: Record<Family, string> = {
  push: "haut", pull: "haut", legs: "jambes", core: "gainage", cardio: "cardio", full: "full body",
};
const fmtDay = (ymd: string) =>
  new Date(ymd + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function SemaineSheet({ week, today, fetchWeekAt, onClose, onStartDay, onAsk, onAddSession, onMove }: {
  week: PlanningDay[] | null;
  today: string;
  fetchWeekAt: (offset: number) => Promise<PlanningDay[] | null>;
  onClose: () => void;
  onStartDay: (day: PlanningDay) => void;
  onAsk: (prompt: string) => void;
  onAddSession: () => void;
  onMove: (a: PlanningDay, b: PlanningDay, msg: string) => Promise<void>;
}) {
  const { guide } = useGuideActif();
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState<PlanningDay[] | null>(week);
  const [loading, setLoading] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  /* Les sept dates de la semaine regardée, et ce qu'on a trouvé pour chacune.
     Les index qui restent (`openIdx`, `dragIdx`, `hoverIdx`, `rowRefs`) sont
     des positions de LIGNE À L'ÉCRAN, pas des clés de donnée : ils désignent
     la rangée qu'on ouvre ou qu'on survole, et ça reste juste. */
  const wd = weekDatesForOffset(offset);
  const parJour = useMemo(() => parDate(days), [days]);

  /* ── Drag & drop : déplacer une séance d'un jour à l'autre ── */
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const canDrop = (from: number, to: number) => {
    const t = parJour[wd[to]];
    return to !== from && !!t && t.status !== "done" && t.date >= todayYmd();
  };
  const hoverFromY = (y: number): number | null => {
    for (let i = 0; i < 7; i++) {
      const r = rowRefs.current[i]?.getBoundingClientRect();
      if (r && y >= r.top && y <= r.bottom) return i;
    }
    return null;
  };
  const handleDragStart = (i: number) => { setOpenIdx(null); setDragIdx(i); };
  const handleDragMove = (i: number, y: number) => {
    const h = hoverFromY(y);
    setHoverIdx(h !== null && canDrop(i, h) ? h : null);
  };
  const handleDragEnd = (i: number) => {
    const to = hoverIdx;
    setDragIdx(null); setHoverIdx(null);
    if (to === null || !canDrop(i, to) || !days) return;
    const a = parJour[wd[i]], b = parJour[wd[to]];
    if (!a || !b) return;
    // Échange des contenus (les dates restent aux jours) ; tout redevient « prévu ».
    const swap = (x: PlanningDay, y2: PlanningDay): PlanningDay => ({
      ...x, type: y2.type, title: y2.title, difficulty: y2.difficulty,
      location: y2.location, exerciseList: y2.exerciseList, sessionId: y2.sessionId,
      status: "planned",
    });
    const newA = swap(a, b), newB = swap(b, a);
    setDays(days.map((d) => (d.date === newA.date ? newA : d.date === newB.date ? newB : d)));
    const msg = hasSeance(newA) ? "Séances échangées ✓" : `${dayTitle(newB)} → ${DAY_FULL[to]} ✓`;
    void onMove(newA, newB, msg);
  };

  /* offset 0 = la semaine du héros (déjà chargée) ; sinon on va la chercher. */
  useEffect(() => {
    let alive = true;
    if (offset === 0) { setDays(week); return; }
    setLoading(true);
    fetchWeekAt(offset).then((d) => { if (alive) { setDays(d); setLoading(false); } });
    return () => { alive = false; };
  }, [offset, week, fetchWeekAt]);

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(MAX_WEEK_AHEAD, offset + delta));
    if (next === offset) return;
    setOpenIdx(null);
    setOffset(next);
  };

  const rangeLabel = `${fmtDay(wd[0])} – ${fmtDay(wd[6])}`;
  const weekTag = offset === 0 ? "Cette semaine" : offset === 1 ? "Semaine prochaine" : `Dans ${offset} sem.`;

  /* ── Verdict d'équilibre + charge (lus depuis les familles en coulisse) ── */
  const seances = (days ?? []).filter(hasSeance);
  const totalMin = seances.reduce((s, d) => s + (d.type === "HIIT" ? 30 : 45), 0);
  const buckets = new Map<string, number>();
  for (const d of seances) {
    const b = BALANCE_BUCKET[resolveArt({ title: `${d.title} ${d.type}` }).fam];
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const verdict = seances.length === 0 ? null : buckets.size >= 3 ? "Équilibrée" : "Ciblée";
  /* La phrase du Guide DÉCOULE du verdict déjà calculé : elle l'explique,
     elle ne le décide pas. Semaine vide comprise, qui est le seul cas où
     il n'y a rien à expliquer et tout à proposer (visage `listen`, il
     laisse la main). */
  const cleVerdict = seances.length === 0
    ? "semaine.vide" as const
    : buckets.size >= 3 ? "semaine.equilibree" as const : "semaine.ciblee" as const;

  return (
    <Sheet onClose={onClose} height="90vh">
      {/* En-tête + navigation semaine */}
      <div className="px-5 pt-1 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[17px] font-bold" style={{ color: "var(--text-1)" }}>Ma semaine</p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-3)" }}>{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => go(-1)} disabled={offset <= 0} aria-label="Semaine précédente"
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.1)", opacity: offset <= 0 ? 0.3 : 1, cursor: offset <= 0 ? "default" : "pointer" }}>
            <ChevronLeft size={15} strokeWidth={2.4} style={{ color: "var(--accent)" }} />
          </button>
          <span className="text-[10.5px] font-bold w-[92px] text-center" style={{ color: "var(--text-2)" }}>{weekTag}</span>
          <button onClick={() => go(1)} disabled={offset >= MAX_WEEK_AHEAD} aria-label="Semaine suivante"
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.1)", opacity: offset >= MAX_WEEK_AHEAD ? 0.3 : 1, cursor: offset >= MAX_WEEK_AHEAD ? "default" : "pointer" }}>
            <ChevronRight size={15} strokeWidth={2.4} style={{ color: "var(--accent)" }} />
          </button>
        </div>
      </div>

      {/* Ce que le Guide lit dans la semaine, puis les pastilles qu'il
          commente. Sans Guide résolu, l'étincelle ✦ reprend la pastille et
          la phrase reste la version commune. */}
      <div className="px-5 pb-3 flex items-start gap-2.5 flex-shrink-0">
        <VisageGuide guide={guide} etat={verdict ? "explain" : "listen"} size={32} />
        <p className="text-[12.5px] font-light leading-snug pt-0.5" style={{ color: "var(--text-2)" }}>
          {voix(guide, cleVerdict, { seances: seances.length })}
        </p>
      </div>

      {/* Verdict d'équilibre + charge */}
      {verdict && (
        <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap flex-shrink-0">
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(43,212,160,0.12)", color: "var(--teal-encre)" }}>{verdict}</span>
          {[...buckets.entries()].sort((a, b) => b[1] - a[1]).map(([b, n]) => (
            <span key={b} className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.055)", color: "var(--text-2)" }}>{n}× {b}</span>
          ))}
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: "rgba(239,159,39,0.12)", color: "#EF9F27" }}>{fmtDur(totalMin)} prévues</span>
        </div>
      )}

      {/* Liste des 7 jours */}
      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none" }}>
        {days?.some((d) => hasSeance(d) && d.status !== "done") && (
          <p className="text-[9.5px] font-semibold pb-1" style={{ color: "var(--text-3)", opacity: 0.8 }}>
            Maintiens <GripVertical size={9} strokeWidth={2.4} style={{ display: "inline", verticalAlign: "-1px" }} /> pour déplacer une séance.
          </p>
        )}
        {DAY_ABBR.map((abbr, i) => (
          <DayRow
            key={wd[i]}
            day={parJour[wd[i]] ?? null}
            idx={i}
            abbr={abbr}
            isToday={wd[i] === today}
            open={openIdx === i}
            dropHover={hoverIdx === i && dragIdx !== null}
            dimmed={dragIdx !== null && dragIdx !== i && hoverIdx !== i}
            registerRef={(el) => { rowRefs.current[i] = el; }}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            onStartDay={onStartDay}
            onAsk={onAsk}
            onDragStart={() => handleDragStart(i)}
            onDragMove={(y) => handleDragMove(i, y)}
            onDragEnd={() => handleDragEnd(i)}
          />
        ))}
        {loading && <p className="text-[11px] font-medium text-center py-4" style={{ color: "var(--text-3)" }}>Chargement…</p>}
        <div style={{ height: 8 }} />
      </div>

      {/* Footer — IA + ajout */}
      <div className="px-5 pt-3 flex gap-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(var(--tint-violet-rgb),0.8)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onAsk("Refais toute ma semaine d’entraînement")}
          className="flex-1 py-3 rounded-2xl text-[13px] font-extrabold text-white cursor-pointer flex items-center justify-center gap-1.5"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
          ✦ Refais ma semaine
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onAddSession}
          className="px-4 rounded-2xl text-[12.5px] font-bold cursor-pointer flex items-center gap-1"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--text-2)" }}>
          <Plus size={14} strokeWidth={2.4} /> Séance
        </motion.button>
      </div>
    </Sheet>
  );
}

/** Y du pointeur, quel que soit le type d'événement (souris / touch). */
const clientYOf = (e: unknown, fallback: number): number => {
  const ev = e as { clientY?: number; touches?: Array<{ clientY: number }> };
  return ev.clientY ?? ev.touches?.[0]?.clientY ?? fallback;
};

/** Un jour de l'agenda — carte draggable (poignée dédiée, pour laisser le
    scroll tranquille) + actions dépliées au tap. */
function DayRow({ day, idx, abbr, isToday, open, dropHover, dimmed, registerRef, onToggle, onStartDay, onAsk, onDragStart, onDragMove, onDragEnd }: {
  day: PlanningDay | null;
  idx: number;
  abbr: string;
  isToday: boolean;
  open: boolean;
  dropHover: boolean;
  dimmed: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onToggle: () => void;
  onStartDay: (d: PlanningDay) => void;
  onAsk: (p: string) => void;
  onDragStart: () => void;
  onDragMove: (clientY: number) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const d = day;
  const isDone = d?.status === "done";
  const isSeance = hasSeance(d);
  const draggable = isSeance && !isDone;
  const art = isSeance ? resolveArt({ title: `${d!.title} ${d!.type}` }) : null;
  const num = d ? new Date(d.date + "T00:00:00").getDate() : "";

  return (
    <div ref={registerRef} className="py-1" style={{ opacity: dimmed ? 0.45 : 1, transition: "opacity 0.15s" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 flex-shrink-0 text-center">
          <span className="block text-[9px] font-extrabold tracking-wide" style={{ color: isToday ? "#A78BFA" : "var(--text-3)" }}>{abbr}</span>
          <span className="block text-[15px] font-light" style={{ color: isToday ? "#A78BFA" : "var(--text-2)" }}>{num}</span>
        </div>
        <motion.div
          drag={draggable ? "y" : false}
          dragControls={controls}
          dragListener={false}
          dragSnapToOrigin
          dragMomentum={false}
          dragElastic={0.1}
          onDragStart={onDragStart}
          onDrag={(e, info) => onDragMove(clientYOf(e, info.point.y))}
          onDragEnd={onDragEnd}
          whileDrag={{ scale: 1.04, rotate: -1.5, zIndex: 40, boxShadow: "0 14px 34px rgba(0,0,0,0.55)" }}
          className="flex-1 flex items-center gap-2 rounded-2xl px-2.5 py-2 min-w-0 relative"
          style={{
            background: dropHover ? "rgba(139,92,246,0.13)"
              : isToday ? "rgba(139,92,246,0.1)"
              : isSeance ? "rgba(255,255,255,0.04)" : "transparent",
            border: dropHover ? "1.5px dashed rgba(139,92,246,0.75)"
              : isToday ? "1px solid rgba(139,92,246,0.55)"
              : isSeance ? "1px solid rgba(255,255,255,0.06)" : "1px dashed rgba(var(--accent-rgb),0.18)",
            opacity: isDone ? 0.72 : 1,
          }}
        >
          <button onClick={onToggle}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left bg-transparent border-none p-0 cursor-pointer">
            {isSeance && art ? (
              <Photo img={art.img} pos="center 22%" className="rounded-xl flex-shrink-0" style={{ width: 38, height: 38 }} />
            ) : (
              <span className="rounded-xl flex-shrink-0 flex items-center justify-center" style={{ width: 38, height: 38, background: "rgba(255,255,255,0.03)" }}>
                <Moon size={14} strokeWidth={1.8} style={{ color: "var(--text-3)", opacity: 0.7 }} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold truncate" style={{ color: "var(--text-1)" }}>{isSeance ? dayTitle(d!) : "Repos"}</p>
              <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: dropHover ? "#C9B8FF" : "var(--text-3)" }}>
                {dropHover ? "Dépose la séance ici ✦"
                  : isSeance ? `${d!.type === "HIIT" ? 30 : 45} min${lieuLabel(d!.location) ? ` · ${lieuLabel(d!.location)}` : ""}`
                  : "Ton corps construit"}
              </p>
            </div>
            {isDone ? (
              <span className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: 18, height: 18, background: "rgba(43,212,160,0.16)", border: "1px solid rgba(43,212,160,0.5)" }}>
                <Check size={10} strokeWidth={3.2} style={{ color: "var(--teal-encre)" }} />
              </span>
            ) : isToday ? (
              <span className="flex-shrink-0 text-[9px] font-extrabold tracking-wide" style={{ backgroundImage: "linear-gradient(135deg,var(--accent),var(--gold))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>AUJOURD&apos;HUI</span>
            ) : (
              <ChevronRight size={14} strokeWidth={2.4} className="flex-shrink-0"
                style={{ color: "var(--text-3)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.18s" }} />
            )}
          </button>
          {draggable && (
            <div
              onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
              className="flex-shrink-0 flex items-center justify-center cursor-grab"
              style={{ touchAction: "none", width: 24, height: 34 }}
              aria-label="Déplacer la séance"
            >
              <GripVertical size={15} strokeWidth={2.2} style={{ color: "var(--text-3)", opacity: 0.8 }} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Actions du jour — dépliées au tap */}
      <AnimatePresence initial={false}>
        {open && d && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex gap-1.5 flex-wrap pl-[42px] pt-2 pb-1">
              {isSeance && (
                <ActChip onClick={() => onStartDay(d)} primary>
                  <Play size={11} strokeWidth={2.5} fill="#fff" style={{ color: "#fff" }} /> Commencer
                </ActChip>
              )}
              {isSeance && <ActChip onClick={() => onAsk(`Remplace ma séance de ${DAY_FULL[idx]} par autre chose`)}><span style={{ color: "#C9B8FF" }}>✦</span> Remplacer</ActChip>}
              {isSeance && <ActChip onClick={() => onAsk(`Décale ma séance de ${DAY_FULL[idx]} à un autre jour`)}>Décaler</ActChip>}
              {isSeance
                ? <ActChip onClick={() => onAsk(`Mets repos le ${DAY_FULL[idx]}`)}>☾ Repos</ActChip>
                : <ActChip onClick={() => onAsk(`Ajoute une séance le ${DAY_FULL[idx]}`)}><span style={{ color: "#C9B8FF" }}>✦</span> Ajouter une séance</ActChip>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Petit bouton d'action d'un jour de l'agenda. */
function ActChip({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer border-none"
      style={primary
        ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }
        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-2)" }}>
      {children}
    </motion.button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « Organiser » — le planning complet (WeeklyProgramme) : semaines,
   jours, tutos, régénération, lieu. Réservé au chemin setup (le héros
   « Créer mon planning » quand l'app ne sait pas encore).
   ════════════════════════════════════════════════════════════════════ */
function OrganiserSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose} maxHeight="92vh">
      <div className="px-5 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-[19px] font-light" style={{ color: "var(--text-1)" }}>Organiser ma semaine</h2>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
          <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        </motion.button>
      </div>
      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <WeeklyProgramme />
        <p className="text-[11px] font-light mt-4 leading-snug" style={{ color: "var(--text-3)" }}>
          Demande à l&apos;orbe ✦ de remplacer, décaler ou changer le lieu d&apos;un jour.
        </p>
      </div>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Création / édition de séance perso : la modale vit maintenant dans
   src/components/seance/CreateSessionModal.tsx (parcours en 3 temps +
   bibliothèque d'exercices animés). La page garde ce qui la regarde :
   l'identifiant, l'accent, l'icône et l'enregistrement en base.
   ════════════════════════════════════════════════════════════════════ */

// Système D — les séances sont toutes le même type d'objet → toutes VIOLET (action).
// La couleur ne code que les métriques (série/calories/poids) et l'état « fait » (teal).
const ACCENT_BY_CATEGORY: Record<WorkoutCategory, string> = {
  force: "#8B5CF6", cardio: "#8B5CF6", mobilite: "#8B5CF6", fullbody: "#8B5CF6",
};
const ICON_BY_CATEGORY: Record<WorkoutCategory, typeof Dumbbell> = {
  force: Dumbbell, cardio: Flame, mobilite: Wind, fullbody: Layers,
};
const SOUS_TITRE_CATEGORIE: Record<WorkoutCategory, string> = {
  force: "Force", cardio: "Cardio", mobilite: "Mobilité", fullbody: "Full body",
};

/* Une séance lancée porte une catégorie libre (« Full Body » de l'impro,
   « HIIT » du planning). Pour la ranger dans la bibliothèque perso, il
   faut la ramener aux quatre types de l'app. */
function normaliserCategorie(c?: string): WorkoutCategory {
  const t = (c ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/cardio|hiit|course|velo/.test(t)) return "cardio";
  if (/mobil|etirement|yoga|souplesse|recup/.test(t)) return "mobilite";
  if (/full/.test(t)) return "fullbody";
  return "force";
}
/** Hors composant : l'horloge n'a rien à faire dans un rendu React. */
const nouvelIdSeance = () => `custom-${Date.now()}`;


/* ════════════════════════════════════════════════════════════════════
   Page — Entraînement. La page vit au PRÉSENT : plus de sous-onglets,
   plus d'historique ici.
   ════════════════════════════════════════════════════════════════════ */

/** Séance prête à être lancée dans le lecteur guidé, quelle que soit sa source. */
type LaunchTarget = {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
  category?: string;
  exerciseList?: Exercise[];
  planningDate?: string;   // présent = séance du planning → marquer « done » à la fin
};

export default function ProgressionPage() {
  const { user } = useAuth();
  const { open: openAssistant } = useAssistant();
  const router = useRouter();
  const canAccessPremium = Boolean(user?.is_premium || user?.is_admin);

  /* ── Planning de la semaine (source de vérité du héros + du bandeau) ── */
  const [week, setWeek] = useState<PlanningDay[] | null>(null);
  const [heroReady, setHeroReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [profileLevel, setProfileLevel] = useState<string | null>(null);

  /* ── UI ── */
  const [sheet, setSheet] = useState<null | "choisir" | "improviser" | "organiser" | "elan" | "semaine">(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | null>(null);
  /* Séance pré-remplie : arrive de la bibliothèque (mouvements cochés) ou
     d'une séance Vaiiya dont on s'inspire. Rien n'est enregistré tant que
     la création n'est pas validée (choix de Louis, 2026-07-29). */
  const [draftSeed, setDraftSeed] = useState<SessionDraft | null>(null);
  /* Change à chaque ouverture : la modale ne lit `initial` qu'au montage,
     et une réouverture rapide peut réutiliser l'instance qui sort encore
     de l'écran. Sans ce compteur, la 2ᵉ sélection serait ignorée. */
  const [numeroCreation, setNumeroCreation] = useState(0);
  /* La vitrine des mouvements : ouverte à vide, ou sur une fiche précise. */
  const [mouvements, setMouvements] = useState<{ fiche: LibExercise | null } | null>(null);
  /* Les places gratuites sont prises : on l'explique, on ne bloque pas sec. */
  const [plein, setPlein] = useState(false);
  /* Collection sur laquelle ouvrir le catalogue (null = la grille). */
  const [choisirCible, setChoisirCible] = useState<string | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<LaunchTarget | null>(null);
  const [activeArticle, setActiveArticle] = useState<AdviceArticle | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  /* ── Bibliothèque perso ── */
  const [customSessions, setCustomSessions] = useState<WorkoutSession[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  /* On limite le STOCK de séances gardées, jamais le fait de créer ni de
     s'entraîner. Supprimer en libère une, et ce qui est déjà gardé n'est
     jamais verrouillé : un abonnement qui s'arrête ne reprend rien. */
  const maxSeances = canAccessPremium ? Infinity : PLANS.free.limits.sessionsMax;
  const peutGarderUneSeance = customSessions.length < maxSeances;

  /* ── Stats du jour (état « fait » du héros) ── */
  const [doneStats, setDoneStats] = useState<{ minutes: number; kcal: number } | null>(null);
  const [elan, setElan] = useState<ElanData | null>(null);

  const today = todayYmd();
  /* Les sept dates de la semaine affichée. On les DÉRIVE de `today` au lieu
     de relire l'horloge : le calcul devient une pure fonction de sa
     dépendance, donc il suit exactement la cadence de `today` au passage de
     minuit, et il n'y a rien d'impur dans le mémo. */
  const semaineDates = useMemo(() => weekDates(new Date(today + "T00:00:00")), [today]);

  /* ── Charge la semaine — même recette que WeeklyProgramme (idempotent) ── */
  const loadWeek = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
      .eq("id", user.id)
      .maybeSingle();

    const hasOnboarding = !!(prof && (prof.onboarding_level || prof.onboarding_sessions_week
      || (Array.isArray(prof.onboarding_goals) && prof.onboarding_goals.length > 0)));
    const { location, equip } = await loadLieu(user.id);
    setProfileLevel(prof?.onboarding_level ?? null);

    if (!hasOnboarding) {
      // Vraiment rien à générer (onboarding pas fait) → héros de mise en route.
      setNeedsSetup(true);
      setWeek(null);
      setHeroReady(true);
      return;
    }
    // Lieu OPTIONNEL : tant que la synchro cross-device n'a pas eu lieu, le
    // localStorage de cet appareil peut être vide. On ne bloque JAMAIS sur
    // « 7 repos » pour ça — on retombe sur le poids du corps (ctxFromLieu(null,
    // null) === "poids") et l'utilisateur affine son lieu via « Organiser ».

    const gen: GenInput = {
      ctx: ctxFromLieu(location, equip),
      sessions: prof!.onboarding_sessions_week ?? 3,
      goals: ((prof!.onboarding_goals as string[] | null) ?? []).map((g) => goalLabels[g] ?? g),
      level: prof!.onboarding_level,
      variant: readVariant(user.id),
      seed: user.id,
    };
    try {
      const days = await ensureWeek(user.id, gen, weekDates());
      setWeek(days);
      setNeedsSetup(false);
    } catch (e) {
      console.error("Planning load error", e);
    }
    setHeroReady(true);
  }, [user]);

  useEffect(() => { void loadWeek(); }, [loadWeek]);

  /* ── Charge une autre semaine (navigation de l'agenda) sans toucher au héros ── */
  const fetchWeekAt = useCallback(async (offset: number): Promise<PlanningDay[] | null> => {
    if (!user) return null;
    const supabase = createClient();
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
      .eq("id", user.id)
      .maybeSingle();
    const hasOnboarding = !!(prof && (prof.onboarding_level || prof.onboarding_sessions_week
      || (Array.isArray(prof.onboarding_goals) && prof.onboarding_goals.length > 0)));
    const { location, equip } = await loadLieu(user.id);
    if (!hasOnboarding) return null;
    // Lieu optionnel (voir loadWeek) : défaut poids du corps si non réglé.
    const gen: GenInput = {
      ctx: ctxFromLieu(location, equip),
      sessions: prof!.onboarding_sessions_week ?? 3,
      goals: ((prof!.onboarding_goals as string[] | null) ?? []).map((g) => goalLabels[g] ?? g),
      level: prof!.onboarding_level,
      variant: readVariant(user.id),
      seed: user.id,
    };
    try { return await ensureWeek(user.id, gen, weekDatesForOffset(offset)); }
    catch (e) { console.error("Week fetch error", e); return null; }
  }, [user]);

  /* Recharge si le planning ou le lieu changent ailleurs (orbe, Organiser…) */
  useEffect(() => {
    const handler = () => { void loadWeek(); };
    window.addEventListener("programme-updated", handler);
    window.addEventListener("lieu-updated", handler);
    return () => {
      window.removeEventListener("programme-updated", handler);
      window.removeEventListener("lieu-updated", handler);
    };
  }, [loadWeek]);

  /* ── État du héros ── */
  const parJour = useMemo(() => parDate(week), [week]);
  const todayDay = parJour[today] ?? null;
  const heroState: HeroState = !heroReady ? "loading"
    : needsSetup ? "setup"
    : todayDay?.status === "done" ? "done"
    : hasSeance(todayDay) ? "seance"
    : "repos";

  /* Prochaine séance de la semaine (état repos) — « Jambes · demain » */
  const nextLabel = useMemo(() => {
    if (!week) return null;
    const demain = prochainsJours(2)[1];
    for (const date of semaineDates) {
      if (date <= today) continue;
      const jour = parJour[date];
      if (hasSeance(jour) && jour.status !== "done") {
        const when = date === demain ? "demain" : DAY_FULL[weekdayIndex(date)];
        return `${dayTitle(jour)} · ${when}`;
      }
    }
    return null;
  }, [week, parJour, semaineDates, today]);

  /* Durée / kcal de la séance faite aujourd'hui (une seule petite requête) */
  useEffect(() => {
    if (heroState !== "done" || !user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const startOfDay = new Date(today + "T00:00:00").toISOString();
      const { data } = await supabase
        .from("workout_sessions")
        .select("duration_minutes, elapsed_seconds, calories_burned")
        .eq("user_id", user.id)
        .gte("started_at", startOfDay)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) {
        setDoneStats({
          minutes: data.elapsed_seconds ? Math.max(1, Math.round(data.elapsed_seconds / 60)) : (data.duration_minutes ?? 0),
          kcal: data.calories_burned ?? 0,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [heroState, user, today]);

  /* ── Ton élan : agrégat des séances faites sur 8 semaines glissantes ── */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const since = new Date(today + "T00:00:00");
      since.setDate(since.getDate() - 55);
      const { data } = await supabase
        .from("workout_sessions")
        .select("started_at, elapsed_seconds, duration_minutes, calories_burned")
        .eq("user_id", user.id)
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: true });
      if (cancelled) return;

      const ymdLocal = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const dayMin = new Map<string, number>();
      const dayCount = new Map<string, number>();
      const activeWeeks = new Set<number>();
      let sessions = 0, minutes = 0, kcal = 0, prevMinutes = 0, record = 0;

      for (const r of data ?? []) {
        const started = r.started_at as string | null;
        if (!started) continue;
        const key = ymdLocal(new Date(started));
        const min = r.elapsed_seconds
          ? Math.max(1, Math.round((r.elapsed_seconds as number) / 60))
          : ((r.duration_minutes as number) ?? 0);
        dayMin.set(key, (dayMin.get(key) ?? 0) + min);
        dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
        if (min > record) record = min;
        const off = weekOffsetOf(key);
        activeWeeks.add(off);
        if (off === 0) { sessions += 1; minutes += min; kcal += (r.calories_burned as number) ?? 0; }
        if (off === -1) prevMinutes += min;
      }

      // Série : semaines consécutives actives (la semaine en cours pas encore lancée ne casse rien)
      let streak = 0;
      let o = activeWeeks.has(0) ? 0 : -1;
      while (activeWeeks.has(o)) { streak += 1; o -= 1; }

      const DL = ["L", "M", "M", "J", "V", "S", "D"];
      const bars: ElanData["bars"] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today + "T00:00:00");
        d.setDate(d.getDate() - i);
        const key = ymdLocal(d);
        const wd = d.getDay(); const idx = wd === 0 ? 6 : wd - 1;
        bars.push({ label: DL[idx], min: dayMin.get(key) ?? 0, done: (dayCount.get(key) ?? 0) > 0, today: key === today });
      }

      setElan({ bars, sessions, minutes, kcal, streak, hasHistory: (data?.length ?? 0) > 0, prevMinutes, record });
    })();
    return () => { cancelled = true; };
  }, [user, today]);

  /* ── Bibliothèque perso (Supabase) ── */
  const fetchCustomSessions = useCallback(async () => {
    if (!user) return;
    setLoadingCustom(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("custom_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setLoadingCustom(false);
    if (error) { console.error("custom_sessions fetch:", error); return; }
    if (!data) return;
    setCustomSessions(data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      subtitle: r.subtitle as string,
      category: r.category as WorkoutCategory,
      duration: r.duration as number,
      difficulty: r.difficulty as WorkoutSession["difficulty"],
      exercises: r.exercises as number,
      muscles: (r.muscles as string[]) ?? [],
      // Système D : toutes les séances = violet (action).
      accent: "#8B5CF6",
      icon: r.icon as string,
      exerciseList: (r.exercise_list as Exercise[]) ?? [],
      visibility: (r.visibility as Visibility) ?? "private",
    })));
  }, [user]);

  useEffect(() => { void fetchCustomSessions(); }, [fetchCustomSessions]);

  /* Catalogue + perso fusionnés — les tiennes d'abord, c'est TA bibliothèque */
  const allSessions = useMemo<MergedSession[]>(() => [
    ...customSessions.map((s) => ({ ...s, perso: true })),
    ...workoutSessions.map((s) => ({ ...s, perso: false })),
  ], [customSessions]);

  /* ── Lancements ── */
  const startDay = (d: PlanningDay) => {
    if (!hasSeance(d)) return;
    setActiveWorkout({
      id: `planning-${d.date}`,
      title: dayTitle(d),
      duration: d.type === "HIIT" ? 30 : 45,
      difficulty: d.difficulty,
      category: d.type,
      exerciseList: d.exerciseList,
      planningDate: d.date,
    });
  };
  const startToday = () => { if (todayDay) startDay(todayDay); };

  /* Drag & drop de l'agenda : persiste les deux jours échangés, puis
     resynchronise le héros (l'agenda a déjà fait sa mise à jour optimiste). */
  const moveDays = async (a: PlanningDay, b: PlanningDay, msg: string) => {
    if (!user) return;
    await Promise.all([saveDay(user.id, a), saveDay(user.id, b)]);
    showToast(msg);
    void loadWeek();
  };

  const startSession = (s: MergedSession) => {
    if (s.access === "premium" && !canAccessPremium) {
      setSheet(null);
      router.push("/premium");
      return;
    }
    const article = getAdviceArticle(s.id);
    if (article) {
      setActiveArticle(article);
      return;
    }
    setSheet(null);
    setActiveWorkout({
      id: s.id,
      title: s.title,
      duration: s.duration,
      difficulty: s.difficulty,
      category: s.category,
      exerciseList: s.exerciseList,
    });
    showToast(`${s.title} démarrée ✓`);
  };

  const handleWorkoutComplete = (target: LaunchTarget) => {
    if (target.planningDate && user) {
      void setDayStatus(user.id, target.planningDate, "done");
      setWeek((prev) => prev?.map((d) => d.date === target.planningDate ? { ...d, status: "done" as const } : d) ?? prev);
    }
  };

  /* ── Actions bibliothèque perso ── */
  const handleVisibilityChange = useCallback(async (sessionId: string, vis: Visibility) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("custom_sessions").update({ visibility: vis }).eq("id", sessionId);
    }
    setCustomSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, visibility: vis } : s));
    const labels = { private: "Séance privée ✓", friends: "Visible par tes amis ✓", public: "Séance publiée 🌐" };
    showToast(labels[vis]);
  }, [user]);

  const handleDelete = async (id: string) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("custom_sessions").delete().eq("id", id);
    }
    setCustomSessions((p) => p.filter((cs) => cs.id !== id));
    showToast("Séance supprimée");
  };

  /* ── Les trois portes vers la création ──────────────────────────────
     Elles mènent toutes au même parcours, jamais à une page blanche :
     depuis la bibliothèque (mouvements cochés), depuis une séance Vaiiya
     dont on s'inspire, ou depuis la fin d'une impro qu'on veut garder. */

  const ouvrirCreation = (seed: SessionDraft | null) => {
    /* Le mur avant l'effort : on ne laisse jamais quelqu'un composer huit
       exercices pour lui dire ensuite que sa place est prise. */
    if (!peutGarderUneSeance) { setPlein(true); return; }
    setEditSession(null);
    setDraftSeed(seed);
    setNumeroCreation((n) => n + 1);
    setShowCreateModal(true);
  };

  /* La bibliothèque rend ses propres exos ; la création relit les reps
     (« 45s », « 12 par jambe »), d'où le passage par leur libellé. */
  const depuisMouvements = (exos: LibExercise[]) => {
    if (exos.length === 0) return;
    setMouvements(null);
    setSheet(null);
    ouvrirCreation({
      title: titreDepuisExercices(exos),
      category: categorieDepuisExercices(exos),
      difficulty: levelToDifficulty(profileLevel),
      duration: 0,               // recalculée par la modale
      muscles: [],               // déduits des exercices
      exerciseList: exos.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: libelleReps(e.mode, e.reps, e.seconds, e.unite),
        rest: e.rest,
        restAfter: 90,
        auto: e.mode === "temps" ? e.seconds : undefined,
        tip: e.tip,
        benefit: e.benefit,
        muscles: e.muscles,
      })),
    });
  };

  /* « M'en inspirer » : on part d'une séance qui existe, la page blanche
     est la première friction de toute création. Rien n'est écrit tant que
     la création n'est pas validée. */
  const inspirerDe = (s: MergedSession) => {
    /* Une carte du catalogue ne porte pas forcément sa liste : le tunnel
       la retrouve par id. On fait pareil, sinon on ouvrirait une création
       vide en ayant promis « ses exercices ». */
    const exos = exosDeLaSeance(s);
    setSheet(null);
    ouvrirCreation({
      title: `${s.title} (ma version)`,
      category: s.category,
      difficulty: s.difficulty,
      duration: s.duration,
      muscles: s.muscles,
      exerciseList: exos,
    });
    if (exos.length === 0) showToast("Séance sans liste détaillée, à toi de la composer");
  };

  /* « Ajouter à ma semaine » : on COPIE la séance sur le jour choisi et on
     garde le renvoi vers son modèle (sessionId), comme le fait l'assistant.
     Le jour cible est réécrit : c'est le sens de « Remplacer » à l'écran. */
  const planifierSeance = async (s: MergedSession, date: string) => {
    if (!user) return;
    const saved = readLieu(user.id);
    const jour: PlanningDay = {
      date,
      type: PLANNING_TYPE_BY_CATEGORY[s.category] ?? "Force",
      title: s.title,
      difficulty: normalizeDifficulty(s.difficulty),
      location: ctxFromLieu(saved.location, saved.equip),
      exerciseList: exosDeLaSeance(s),
      sessionId: s.id,
      status: "planned",
    };
    try {
      await saveDay(user.id, jour);
      setWeek((prev) => prev?.map((d) => (d.date === date ? jour : d)) ?? prev);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date } }));
      }
      showToast(`${s.title} · ${dayLabelLong(date)} ✓`);
    } catch {
      showToast("Impossible de l’ajouter à ta semaine");
    }
  };

  /* Fin d'une impro : elle n'existe nulle part, on propose de la garder. */
  const garderImpro = (t: LaunchTarget) => {
    const exos = t.exerciseList ?? [];
    handleCreateOrEdit({
      id: nouvelIdSeance(),
      title: t.title,
      subtitle: `${SOUS_TITRE_CATEGORIE[normaliserCategorie(t.category)]} · Ma séance`,
      category: normaliserCategorie(t.category),
      duration: t.duration,
      difficulty: normalizeDifficulty(t.difficulty),
      exercises: exos.length || 1,
      muscles: [...new Set(exos.flatMap((e) => e.muscles ?? []))],
      accent: ACCENT_BY_CATEGORY[normaliserCategorie(t.category)],
      icon: ICON_BY_CATEGORY[normaliserCategorie(t.category)],
      exerciseList: exos,
    });
    showToast("Séance ajoutée à tes séances ✓");
  };

  /* La modale ne connaît que le contenu de la séance ; l'identité (id,
     accent, icône, sous-titre) reste ici, avec l'enregistrement. */
  const handleDraft = (draft: SessionDraft) => {
    handleCreateOrEdit({
      id: editSession?.id ?? nouvelIdSeance(),
      title: draft.title,
      subtitle: `${SOUS_TITRE_CATEGORIE[draft.category]} · Ma séance`,
      category: draft.category,
      duration: draft.duration,
      difficulty: draft.difficulty,
      exercises: draft.exerciseList.length || 1,
      muscles: draft.muscles,
      accent: ACCENT_BY_CATEGORY[draft.category],
      icon: ICON_BY_CATEGORY[draft.category],
      exerciseList: draft.exerciseList,
      visibility: editSession?.visibility,
      collections: editSession?.collections,
    });
  };

  const handleCreateOrEdit = async (s: WorkoutSession) => {
    const supabase = createClient();
    const existingSession = customSessions.find((cs) => cs.id === s.id);
    /* Dernier filet : modifier reste toujours possible, seul l'ajout compte. */
    if (!existingSession && !peutGarderUneSeance) { setPlein(true); return; }
    const row = {
      id: s.id,
      user_id: user?.id,
      title: s.title,
      subtitle: s.subtitle,
      category: s.category,
      duration: s.duration,
      difficulty: s.difficulty,
      exercises: s.exercises,
      muscles: s.muscles,
      accent: s.accent,
      icon: s.icon,
      exercise_list: s.exerciseList ?? [],
      visibility: existingSession?.visibility ?? "private",
      updated_at: new Date().toISOString(),
    };
    if (editSession) {
      if (user) {
        const { error } = await supabase.from("custom_sessions").update(row).eq("id", s.id);
        if (error) { console.error(error); showToast("Erreur lors de la modification"); return; }
      }
      setCustomSessions((p) => p.map((cs) => cs.id === s.id ? s : cs));
      showToast(`"${s.title}" modifiée ✓`);
    } else {
      if (user) {
        const { error } = await supabase.from("custom_sessions").insert(row);
        if (error) { console.error(error); showToast("Erreur lors de la création"); return; }
      }
      setCustomSessions((p) => [s, ...p]);
      showToast(`"${s.title}" créée ✓`);
    }
    setEditSession(null);
  };

  /* ── Bifurcation : le libellé vit avec la réalité du jour ── */
  const askLabel =
    heroState === "done" ? "Encore de l’énergie ?"
    : heroState === "repos" ? "Envie de bouger quand même ?"
    : heroState === "setup" ? "Ou directement :"
    : "Pas ce qui était prévu ?";

  /* Défauts « J'improvise » depuis le lieu connu */
  const lieu = user ? readLieu(user.id) : { location: null, equip: null };
  const improDefaultPlace: ImproPlace = lieu.location === "salle" ? "salle" : "maison";
  const improDefaultHalteres = lieu.equip === "halteres";

  /* En-tête : la date du jour — cette page vit au présent */
  const dateLabel = useMemo(() => {
    const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+72px)] pb-36 md:pl-28 md:pr-8 md:pt-12 md:pb-16 relative overflow-x-hidden">
      <div className="w-full max-w-xl flex flex-col">

        {/* ── En-tête : date + titre ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-3.5 flex items-baseline justify-between gap-3"
        >
          <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "var(--text-1)" }}>
            <em className="not-italic font-light" style={{
              background: "linear-gradient(135deg,var(--accent),var(--gold))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
              display: "inline-block", paddingRight: "0.14em",  // même traitement que « nutrition »
            }}>Entraînement</em>
          </h1>
          <p className="vy-label flex-shrink-0 text-right" style={{ color: "var(--text-3)" }}>
            {dateLabel}
          </p>
        </motion.div>

        {/* ── ① Héros « Aujourd'hui » ── */}
        <section data-tour-anchor="prog-hero">
          <TodayHero
            state={heroState}
            day={todayDay}
            nextLabel={nextLabel}
            doneStats={doneStats}
            onStart={startToday}
            onImprovise={() => setSheet("improviser")}
            onOrganise={() => setSheet("organiser")}
            onShift={() => openAssistant("Décale ma séance d’aujourd’hui à un autre jour")}
            onReplace={() => openAssistant("Remplace ma séance d’aujourd’hui par autre chose")}
          />
        </section>

        {/* ── ② Bifurcation ── */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
          className="vy-corps mt-6 mb-3"
        >
          {askLabel}
        </motion.p>
        <motion.div
          data-tour-anchor="prog-forks"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <ForkCard kind="improvise" onClick={() => setSheet("improviser")} />
          <ForkCard kind="choisis" count={allSessions.length} onClick={() => setSheet("choisir")} />
        </motion.div>

        {/* ── ③ Les mouvements ──
           La vitrine passe APRÈS la bifurcation : on répond d'abord à
           « je fais quoi maintenant », on donne envie ensuite. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.22 }}
          className="mt-6"
        >
          <MouvementsRow onOuvrir={(exo) => setMouvements({ fiche: exo ?? null })} />
        </motion.div>

        {/* ── ④ Ma semaine · ⑤ Ton élan ──
           Un seul groupe, deux sections separees par un filet. Les deux blocs
           portaient EXACTEMENT le meme dessin (meme surface pleine, meme rayon
           de 20, meme halo a 0,08) a 12 px l'un de l'autre : seule la TEINTE
           changeait, violet puis teal. Deux surfaces pour une seule idee, c'est
           la forme qui fait « tableau de bord genere ».

           Le filet vient de `.vy-filet + .vy-filet`, donc c'est le SECOND enfant
           qui le porte : quand l'elan n'a rien a dire, il n'y a pas de trait
           orphelin. D'ou aussi le `{elan && ...}` ici, et pas seulement le
           `return null` interne du composant : un enfant vide porterait quand
           meme sa bordure. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-6 overflow-hidden"
          style={{
            borderRadius: "var(--r-bloc)",
            background: "rgba(var(--surface-rgb),0.9)",
            border: "1px solid rgba(var(--text-3-rgb),0.16)",
          }}
        >
          <div data-tour-anchor="prog-semaine" className="vy-filet">
            <WeekStrip week={week} dates={semaineDates} today={today} onOrganise={() => setSheet("semaine")} />
          </div>
          {elan && (
            <div data-tour-anchor="prog-elan" className="vy-filet">
              <ElanStrip data={elan} onOpen={() => setSheet("elan")} />
            </div>
          )}
        </motion.div>
      </div>

      {/* ══ Sheets ══ */}
      <AnimatePresence>
        {sheet === "semaine" && (
          <SemaineSheet
            week={week}
            today={today}
            fetchWeekAt={fetchWeekAt}
            onClose={() => { setSheet(null); void loadWeek(); }}
            onStartDay={(d) => { setSheet(null); startDay(d); }}
            onAsk={(p) => { setSheet(null); openAssistant(p); }}
            onAddSession={() => setSheet("choisir")}
            onMove={moveDays}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "organiser" && (
          <OrganiserSheet onClose={() => { setSheet(null); void loadWeek(); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "elan" && elan && (
          <ElanSheet data={elan} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "choisir" && (
          <ChooseSheet
            key={choisirCible ?? "collections"}
            sessions={allSessions}
            week={week}
            loading={loadingCustom}
            canAccessPremium={canAccessPremium}
            maxSeances={maxSeances}
            catInitial={choisirCible}
            onClose={() => { setSheet(null); setChoisirCible(null); }}
            onStart={startSession}
            onUpgrade={() => { setSheet(null); router.push("/premium"); }}
            onCreate={() => ouvrirCreation(null)}
            onEdit={(s) => { setDraftSeed(null); setEditSession(s); setShowCreateModal(true); }}
            onDelete={handleDelete}
            onVisibilityChange={handleVisibilityChange}
            onInspirer={inspirerDe}
            onPlanifier={(s, date) => { void planifierSeance(s, date); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {plein && (
          <PleinSheet
            max={maxSeances}
            onClose={() => setPlein(false)}
            onVoir={() => { setPlein(false); setChoisirCible("tiennes"); setSheet("choisir"); }}
            onPremium={() => { setPlein(false); router.push("/premium"); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "improviser" && (
          <ImproviseSheet
            defaultPlace={improDefaultPlace}
            defaultHalteres={improDefaultHalteres}
            difficulty={levelToDifficulty(profileLevel)}
            onClose={() => setSheet(null)}
            onLaunch={(t) => { setSheet(null); setActiveWorkout(t); showToast(`${t.title} prête ✦`); }}
          />
        )}
      </AnimatePresence>

      {/* ══ La vitrine des mouvements ══ */}
      <AnimatePresence>
        {mouvements && (
          <ExerciseLibrarySheet
            mode="exploration"
            dejaChoisis={[]}
            ficheInitiale={mouvements.fiche}
            onClose={() => setMouvements(null)}
            onAjouter={depuisMouvements}
            onAjouterLibre={(nom) => {
              /* Exo maison : il part sans animation, l'écran l'a dit. */
              setMouvements(null);
              ouvrirCreation({
                title: "",
                category: "force",
                difficulty: levelToDifficulty(profileLevel),
                duration: 0,
                muscles: [],
                exerciseList: [{
                  name: nom, sets: 3, reps: "12 reps", rest: 60, restAfter: 90,
                  tip: "", benefit: "", muscles: [],
                }],
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* ══ Lecteur guidé ══ */}
      <AnimatePresence>
        {activeWorkout && (
          <WorkoutGuideModal
            sessionId={activeWorkout.id}
            title={activeWorkout.title}
            accent="var(--accent)"
            duration={activeWorkout.duration}
            difficulty={activeWorkout.difficulty}
            category={activeWorkout.category}
            heroImage={`/entrainement/${resolveArt({ title: activeWorkout.title, category: activeWorkout.category as WorkoutCategory | undefined }).img}.webp`}
            exerciseList={activeWorkout.exerciseList}
            onClose={() => setActiveWorkout(null)}
            onComplete={() => handleWorkoutComplete(activeWorkout)}
            /* Seule une impro n'existe nulle part : c'est elle qu'on
               perdrait. Une séance du catalogue ou du planning est déjà
               quelque part, on ne propose rien. Places prises : on ne
               propose rien non plus, plutôt qu'un mur en fin de séance. */
            onGarder={user && peutGarderUneSeance && activeWorkout.id.startsWith("improv-") && activeWorkout.exerciseList?.length
              ? () => garderImpro(activeWorkout)
              : undefined}
          />
        )}
      </AnimatePresence>

      {/* ══ Lecteur des mini-cours ══ */}
      <AnimatePresence>
        {activeArticle && (
          <AdviceReaderSheet
            article={activeArticle}
            onClose={() => setActiveArticle(null)}
          />
        )}
      </AnimatePresence>

      {/* ══ Création / édition de séance perso ══ */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSessionModal
            key={editSession?.id ?? `new-${numeroCreation}`}
            isEdit={!!editSession}
            initial={editSession ? {
              title: editSession.title,
              category: editSession.category,
              difficulty: editSession.difficulty,
              duration: editSession.duration,
              muscles: editSession.muscles,
              exerciseList: editSession.exerciseList ?? [],
            } : draftSeed}
            onClose={() => { setShowCreateModal(false); setEditSession(null); setDraftSeed(null); }}
            onSubmit={handleDraft}
          />
        )}
      </AnimatePresence>

      {/* ══ Toast ══ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(var(--surface-rgb),0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "var(--ombre-flottant)", whiteSpace: "nowrap" }}>
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
