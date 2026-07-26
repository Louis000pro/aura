import type { Exercise } from "@/components/WorkoutGuideModal";

/* ═══════════════════════════════════════════════════════════════════
   Vague 4 du catalogue — Cardio & HIIT.

   La vague couvre six intentions réellement différentes : sans impact,
   endurance, Tabata, cardio de salle, pyramide et circuit aux haltères.
   Chaque mouvement possède déjà son personnage-guide dans
   exerciseGuides.ts ; les aperçus Premium montrent donc de vraies
   animations avant l'achat.
   ═══════════════════════════════════════════════════════════════════ */

export const WAVE_4_EXERCISES: Record<string, Exercise[]> = {
  "cardio-sans-saut": [
    {
      name: "Squat", sets: 3, reps: "12 reps", rest: 30,
      tip: "Descends à une amplitude confortable puis remonte avec un rythme régulier.",
      benefit: "Met les grandes chaînes musculaires en mouvement sans impact au sol.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Step up banc", sets: 3, reps: "10 par jambe", rest: 35,
      tip: "Choisis une marche basse et pousse avec la jambe posée, sans prendre d'élan.",
      benefit: "Fait monter progressivement le rythme avec des appuis maîtrisés.",
      muscles: ["Quadriceps", "Fessiers", "Cardio"],
    },
    {
      name: "Mountain climbers", sets: 3, reps: "30 sec", rest: 25, auto: 30,
      tip: "Avance un genou après l'autre sans saut, épaules au-dessus des mains.",
      benefit: "Active le cardio et le centre du corps avec une variante contrôlée.",
      muscles: ["Cardio", "Core"],
    },
    {
      name: "Bear crawl", sets: 3, reps: "30 sec", rest: 30, auto: 30,
      tip: "Fais de petits pas et garde les genoux proches du sol.",
      benefit: "Relie coordination, épaules et souffle sans choc répété.",
      muscles: ["Épaules", "Core", "Cardio"],
    },
    {
      name: "Chaise au mur", sets: 3, reps: "35 sec", rest: 30, auto: 35,
      tip: "Choisis un angle que tu peux tenir en respirant sans bloquer.",
      benefit: "Prolonge l'effort des jambes avec une position totalement silencieuse.",
      muscles: ["Quadriceps"],
    },
    {
      name: "Cohérence cardiaque", sets: 1, reps: "90 sec", rest: 0, auto: 90,
      tip: "Inspire cinq secondes puis expire cinq secondes, tranquillement.",
      benefit: "Ramène progressivement le souffle vers un rythme calme.",
      muscles: ["Respiration"],
    },
  ],

  "cardio-endurance": [
    {
      name: "Rameur · mise en route", sets: 1, reps: "5 min", rest: 20, auto: 300,
      tip: "Commence souple : pousse avec les jambes, puis accompagne avec les bras.",
      benefit: "Élève progressivement la température du corps avant le bloc principal.",
      muscles: ["Cardio", "Dos", "Jambes"],
    },
    {
      name: "Tapis de course · allure facile", sets: 1, reps: "12 min", rest: 30, auto: 720,
      tip: "Garde une allure où tu peux encore prononcer une phrase courte.",
      benefit: "Installe un effort continu et accessible pour développer l'endurance.",
      muscles: ["Cardio", "Jambes"],
    },
    {
      name: "Vélo · cadence régulière", sets: 1, reps: "12 min", rest: 30, auto: 720,
      tip: "Pédale de façon fluide avec une résistance qui ne bloque jamais la cadence.",
      benefit: "Prolonge le travail aérobie avec peu d'impact articulaire.",
      muscles: ["Cardio", "Quadriceps"],
    },
    {
      name: "Rameur · retour au calme", sets: 1, reps: "5 min", rest: 0, auto: 300,
      tip: "Réduis progressivement la cadence et allonge chaque expiration.",
      benefit: "Fait redescendre le rythme sans couper brutalement l'effort.",
      muscles: ["Cardio", "Récupération"],
    },
  ],

  "tabata-express": [
    {
      name: "Jumping jacks", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Garde un rythme vif mais régulier, avec des réceptions souples.",
      benefit: "Ouvre le Tabata avec un mouvement simple qui engage tout le corps.",
      muscles: ["Cardio", "Épaules"],
    },
    {
      name: "Mountain climbers", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Ramène les genoux rapidement sans laisser le bassin monter.",
      benefit: "Maintient le rythme tout en sollicitant fortement le gainage.",
      muscles: ["Cardio", "Core"],
    },
    {
      name: "Squats sautés", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Saute avec intention puis amortis avant de repartir.",
      benefit: "Ajoute une séquence explosive centrée sur les jambes.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Montées de genoux", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Reste haut dans le buste et utilise activement les bras.",
      benefit: "Accélère la fréquence des appuis et le travail cardiovasculaire.",
      muscles: ["Cardio", "Abdominaux"],
    },
    {
      name: "Skaters", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Déplace-toi latéralement et stabilise chaque réception.",
      benefit: "Introduit un effort latéral qui change des déplacements avant-arrière.",
      muscles: ["Fessiers", "Cardio"],
    },
    {
      name: "Burpees", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Choisis la version avec ou sans pompe et conserve un geste propre.",
      benefit: "Termine le bloc avec un mouvement complet et très dynamique.",
      muscles: ["Corps entier", "Cardio"],
    },
  ],

  "cardio-salle": [
    {
      name: "Rameur", sets: 3, reps: "60 sec", rest: 25, auto: 60,
      tip: "Pousse d'abord avec les jambes, ouvre le buste, puis termine avec les bras.",
      benefit: "Associe jambes, dos et souffle sur un mouvement global.",
      muscles: ["Cardio", "Dos", "Jambes"],
    },
    {
      name: "Tapis de course", sets: 3, reps: "75 sec", rest: 30, auto: 75,
      tip: "Choisis une allure vive que tu peux conserver sans t'agripper.",
      benefit: "Apporte un bloc de course court et facile à calibrer.",
      muscles: ["Cardio", "Jambes"],
    },
    {
      name: "Vélo", sets: 3, reps: "75 sec", rest: 30, auto: 75,
      tip: "Accélère la cadence avec une résistance modérée et un bassin stable.",
      benefit: "Permet de pousser le souffle en limitant les impacts.",
      muscles: ["Cardio", "Quadriceps"],
    },
    {
      name: "Kettlebell swing", sets: 3, reps: "15 reps", rest: 40,
      tip: "Envoie les hanches vers l'arrière puis propulse la kettlebell avec les jambes.",
      benefit: "Relie puissance de hanche et effort cardiovasculaire.",
      muscles: ["Fessiers", "Ischio-jambiers", "Cardio"],
    },
    {
      name: "Corde à sauter", sets: 4, reps: "45 sec", rest: 25, auto: 45,
      tip: "Reste léger sur l'avant du pied et garde les coudes près du corps.",
      benefit: "Termine avec un travail rapide des appuis et de la coordination.",
      muscles: ["Cardio", "Mollets"],
    },
  ],

  "pyramide-cardio": [
    {
      name: "Jumping jacks", sets: 2, reps: "20 sec", rest: 15, auto: 20,
      tip: "Commence fluide : cette première marche doit te laisser de la marge.",
      benefit: "Lance la montée d'intensité avec un geste facile à rythmer.",
      muscles: ["Cardio", "Épaules"],
    },
    {
      name: "Mountain climbers", sets: 2, reps: "30 sec", rest: 15, auto: 30,
      tip: "Garde les épaules fixes et accélère progressivement les genoux.",
      benefit: "Ajoute dix secondes de travail et engage davantage le centre du corps.",
      muscles: ["Cardio", "Core"],
    },
    {
      name: "Montées de genoux", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Trouve un rythme soutenu que tu peux conserver jusqu'au signal.",
      benefit: "Amène la pyramide vers sa zone haute avec des appuis rapides.",
      muscles: ["Cardio", "Abdominaux"],
    },
    {
      name: "Burpees", sets: 2, reps: "50 sec", rest: 30, auto: 50,
      tip: "Reste constant et choisis la variante sans saut si ton geste se dégrade.",
      benefit: "Forme le sommet de la pyramide avec un effort complet.",
      muscles: ["Corps entier", "Cardio"],
    },
    {
      name: "Skaters", sets: 2, reps: "40 sec", rest: 20, auto: 40,
      tip: "Commence la descente en stabilisant chaque appui latéral.",
      benefit: "Fait redescendre la durée tout en changeant de plan de mouvement.",
      muscles: ["Fessiers", "Cardio"],
    },
    {
      name: "Sprint sur place", sets: 2, reps: "30 sec", rest: 15, auto: 30,
      tip: "Reste léger et donne le rythme avec les bras.",
      benefit: "Conserve une intensité franche sur l'avant-dernière marche.",
      muscles: ["Cardio", "Jambes"],
    },
    {
      name: "Corde à sauter", sets: 2, reps: "20 sec", rest: 20, auto: 20,
      tip: "Relâche les épaules et termine avec des rebonds courts.",
      benefit: "Referme la pyramide par un dernier effort bref et précis.",
      muscles: ["Cardio", "Mollets"],
    },
    {
      name: "Cohérence cardiaque", sets: 1, reps: "90 sec", rest: 0, auto: 90,
      tip: "Laisse l'expiration ralentir progressivement le rythme.",
      benefit: "Crée une vraie transition entre l'effort et la fin de séance.",
      muscles: ["Respiration"],
    },
  ],

  "cardio-halteres": [
    {
      name: "Thruster haltères", sets: 4, reps: "10 reps", rest: 45,
      tip: "Utilise la poussée des jambes pour accompagner les haltères au-dessus de la tête.",
      benefit: "Combine squat et poussée dans un mouvement très complet.",
      muscles: ["Quadriceps", "Épaules", "Cardio"],
    },
    {
      name: "Kettlebell swing", sets: 4, reps: "15 reps", rest: 40,
      tip: "Produis l'élan avec les hanches plutôt qu'avec les bras.",
      benefit: "Développe une puissance répétée de la chaîne postérieure.",
      muscles: ["Fessiers", "Ischio-jambiers", "Cardio"],
    },
    {
      name: "Goblet squat", sets: 4, reps: "12 reps", rest: 40,
      tip: "Garde la charge près du buste et les pieds entièrement posés.",
      benefit: "Accumule du travail sur les jambes avec une charge facile à contrôler.",
      muscles: ["Quadriceps", "Fessiers"],
    },
    {
      name: "Rowing buste penché haltères", sets: 4, reps: "12 reps", rest: 40,
      tip: "Maintiens le dos long et tire les coudes vers l'arrière sans te redresser.",
      benefit: "Équilibre le circuit avec une traction pour le dos.",
      muscles: ["Dos", "Biceps"],
    },
    {
      name: "Soulevé de terre roumain", sets: 4, reps: "12 reps", rest: 45,
      tip: "Recule les hanches en gardant les haltères proches des jambes.",
      benefit: "Renforce l'arrière du corps dans un format à repos courts.",
      muscles: ["Ischio-jambiers", "Fessiers", "Dos"],
    },
    {
      name: "Mountain climbers", sets: 4, reps: "30 sec", rest: 30, auto: 30,
      tip: "Termine chaque tour avec les épaules stables et un rythme franc.",
      benefit: "Ajoute une relance sans charge pour maintenir le souffle.",
      muscles: ["Cardio", "Core"],
    },
  ],
};
