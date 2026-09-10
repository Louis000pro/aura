/* ════════════════════════════════════════════════════════════════════
   catalogueSeances — LE catalogue Vaiiya, une seule fois.

   Il vivait au milieu des 4 000 lignes de l'écran Entraînement, donc il
   n'existait que pour cet écran. V9C bis en a besoin ailleurs : quand le
   Guide s'entend nommer une séance (« remplace aujourd'hui par Express
   12 »), il doit retrouver SA vraie fiche, pas en composer une qui lui
   ressemble. Trois choses ne sont lisibles QUE là : le titre affiché, sa
   catégorie et sa difficulté réelles, et surtout son `access`.

   ⚠️ `access` EST UN VERROU, PAS UNE ÉTIQUETTE. Poser une séance
   Premium sur le planning de quelqu'un qui ne l'a pas, ce serait lui
   ouvrir par la conversation exactement ce que le catalogue lui ferme.
   Le filtre vit dans `contenuNomme`, la donnée vit ici.

   ⚠️ LES IDENTIFIANTS SONT CEUX DE `exerciseData` ET DE `SESSION_SLUGS`
   (WorkoutGuideModal) : c'est ce qui permet de passer d'un titre à un
   contenu sans jamais deviner. Ajouter une séance, c'est donc TROIS
   entrées à tenir ensemble : ici, dans `exerciseData`, et dans
   `SESSION_SLUGS` si on veut que le Guide sache la nommer.
   ════════════════════════════════════════════════════════════════════ */
import { BookOpen, Dumbbell, Flame, Home, Layers, Moon, Sparkles, Sun, Wind, Zap } from "lucide-react";
import type { Exercise } from "@/components/WorkoutGuideModal";
import type { WorkoutCategory } from "@/lib/assistantActions";
import { ADVICE_ARTICLES } from "@/lib/adviceArticles";

export type { WorkoutCategory };

export type CatalogCollection =
  | "express" | "masse" | "perte" | "renfo" | "cardiohiit"
  | "abdos" | "jambes" | "haut" | "fullbody" | "salle"
  | "sansmateriel" | "debuter" | "mobilite" | "recup"
  | "defis" | "conseils";

export type WorkoutSession = {
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

export const workoutSessions: WorkoutSession[] = [
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
