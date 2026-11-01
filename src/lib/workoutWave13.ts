import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 13 du catalogue : la course hybride (lot 4 de la banque de
   séances, la suite). De la course et des ateliers en alternance, comme
   sur une course hybride ; la marque n'apparaît dans aucun titre.

   ⚠️ LA COURSE ET LE RAMEUR SE COMPTENT EN MINUTES, PAS EN MÈTRES. La
   proposition écrivait « tapis 800 m · rameur 500 m » ; le lecteur et
   l'estimation ne connaissent que des répétitions et des durées (un
   « 800 m » serait lu comme 800 répétitions). Quatre minutes de tapis et
   deux de rameur, à une allure soutenue, couvrent à peu près ces distances.

   ⚠️ « HYBRIDE À LA MAISON » REMPLACE LA CORDE À SAUTER PAR DES JUMPING
   JACKS. Elle est rangée dans « Haltères à la maison », qui ne demande que
   des haltères et une chaise (`check:catalogue`) ; une corde n'en fait pas
   partie.

   « Les ateliers hybrides », la troisième séance de la proposition,
   attend ses mouvements dessinés (ski erg, traîneau, marche du fermier,
   wall ball). D'ici là, « Hybride » n'a pas de tuile : le banc en refuse
   une à moins de trois séances.
   ════════════════════════════════════════════════════════════════════ */

const CUISSES = ["Quadriceps", "Fessiers"];
const TOUT = ["Corps entier", "Cardio"];

export const WAVE_13_EXERCISES: Record<string, Exercise[]> = {
  "hybride-decouverte": [
    { name: "Tapis de course", sets: 4, reps: "4 min", auto: 240, rest: 15, bloc: "hybride", format: "circuit",
      tip: "Une allure soutenue, que tu peux tenir quatre fois. Puis passe au rameur sans t’arrêter.",
      benefit: "La course, le fil rouge d’une course hybride.", muscles: ["Cardio", "Jambes"] },
    { name: "Rameur", sets: 4, reps: "2 min", auto: 120, rest: 15, bloc: "hybride",
      tip: "Jambes, puis buste, puis bras, à un rythme régulier. Un effort que tu peux répéter, pas un sprint.",
      benefit: "Tout le corps travaille, sans impact.", muscles: TOUT },
    { name: "Fentes", sets: 4, reps: "10 par jambe", rest: 15, bloc: "hybride",
      tip: "Alterne les jambes, un grand pas, genou avant stable, et pousse dans le talon pour revenir.",
      benefit: "Les jambes, sur un souffle déjà court.", muscles: CUISSES },
    { name: "Burpees", sets: 4, reps: "10 reps", rest: 15, bloc: "hybride",
      tip: "Poitrine au sol, puis debout avec un petit saut. Garde un rythme que tu tiens jusqu’au dixième.",
      benefit: "Tout le corps, et le cardio qui remonte.", muscles: TOUT },
    { name: "Thruster haltères", sets: 4, reps: "15 reps", rest: 90, bloc: "hybride",
      tip: "Deux haltères aux épaules, descends en squat et pousse-les au-dessus de la tête en remontant, d’un seul geste. Ensuite, une minute et demie de repos avant le tour suivant.",
      benefit: "Le dernier atelier du tour, jambes et épaules ensemble.", muscles: TOUT },
  ],

  "hybride-maison": [
    { name: "Jumping jacks", sets: 5, reps: "2 min", auto: 120, rest: 15, bloc: "hybride", format: "circuit",
      tip: "À la place de la course, un rythme souple que tu tiens deux minutes, les bras jusqu’au-dessus de la tête.",
      benefit: "Le cardio qui remplace le tapis.", muscles: ["Cardio"] },
    { name: "Fentes", sets: 5, reps: "10 par jambe", rest: 15, bloc: "hybride",
      tip: "Alterne les jambes, un grand pas, genou avant stable. Sans haltères, le souffle suffit.",
      benefit: "Les jambes, une à une.", muscles: CUISSES },
    { name: "Thruster haltères", sets: 5, reps: "15 reps", rest: 15, bloc: "hybride",
      tip: "Deux haltères aux épaules, descends en squat et pousse-les au-dessus de la tête en remontant, d’un seul geste.",
      benefit: "Jambes et épaules ensemble.", muscles: TOUT },
    { name: "Burpees", sets: 5, reps: "10 reps", rest: 15, bloc: "hybride",
      tip: "Poitrine au sol, puis debout avec un petit saut. Garde un rythme que tu tiens jusqu’au dixième.",
      benefit: "Tout le corps, et le cardio qui remonte.", muscles: TOUT },
    { name: "Gainage dynamique", sets: 5, reps: "40 sec", auto: 40, rest: 60, bloc: "hybride",
      tip: "Passe des coudes aux mains, une main après l’autre, sans balancer les hanches. Puis une minute de repos avant le tour suivant.",
      benefit: "Le tronc, pour finir le tour.", muscles: ["Core", "Épaules"] },
  ],
};
