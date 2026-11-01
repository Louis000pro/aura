import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 14 du catalogue : deux séances liées à ce qu'on mange (lot 3 de
   la banque de séances, la suite ; GO de Louis le 2026-11-01 : « go pour
   les séances liées à l'alimentation »).

   · « Garder sa force pendant un régime » : quand on mange moins, des
     charges lourdes en peu de séries aident la force à tenir (Murphy et
     Koehler 2022, lu pour la proposition). La proposition l'appelait
     « Pendant une sèche » : le mot ne parle pas à tout le monde, le nom
     dit ce qu'on fait.
   · « À jeun le matin » : un effort facile. Ce qu'elle dit (le rythme où
     l'on peut parler, les signaux qui arrêtent, les protéines après)
     reprend le cours « S'entraîner à jeun », dont les sources sont dans
     docs/cours-nutrition/carnet-lot-2.md. Le cardio facile sert
     d'échauffement : aucun échauffement n'est compté en plus.

   ⚠️ Aucune promesse sur le gras ni sur le poids : à jeun, on ne perd pas
   plus de gras sur la durée (Schoenfeld 2014, cité par le cours).
   ════════════════════════════════════════════════════════════════════ */

const CUISSES = ["Quadriceps", "Fessiers"];
/** Le cardio facile du début tient lieu d'échauffement. */
const doux = (exos: Exercise[]): Exercise[] => exos.map((e) => ({ ...e, sansEchauffement: true }));

export const WAVE_14_EXERCISES: Record<string, Exercise[]> = {
  "force-regime": [
    { name: "Squat barre", sets: 4, reps: "5 reps", rest: 150,
      tip: "Garde les charges d’avant ton régime, quitte à faire une série de moins. Une répétition de marge à chaque série.",
      benefit: "Quand tu manges moins, des charges lourdes aident ta force à tenir.", muscles: CUISSES },
    { name: "Développé couché", sets: 4, reps: "5 reps", rest: 150,
      tip: "Omoplates serrées, pieds ancrés au sol, descente contrôlée.",
      benefit: "La poussée, lourde, en peu de séries.", muscles: ["Pectoraux", "Triceps"] },
    { name: "Rowing barre", sets: 4, reps: "6 reps", rest: 120,
      tip: "Buste penché, dos plat, tire la barre vers le nombril sans te redresser.",
      benefit: "Le tirage, pour équilibrer la poussée.", muscles: ["Dos", "Biceps"] },
    { name: "Soulevé de terre roumain", sets: 2, reps: "10 reps", rest: 90,
      tip: "La barre glisse le long des cuisses, dos plat, jusqu’à sentir l’arrière des cuisses s’étirer.",
      benefit: "L’arrière des cuisses, en deux séries seulement.", muscles: ["Ischio-jambiers", "Fessiers"] },
    { name: "Développé militaire haltères", sets: 2, reps: "10 reps", rest: 90,
      tip: "Pousse les haltères au-dessus de la tête sans cambrer le bas du dos.",
      benefit: "Les épaules, en complément.", muscles: ["Épaules", "Triceps"] },
  ],

  "a-jeun-matin": doux([
    { name: "Montées de genoux", sets: 3, reps: "2 min", auto: 120, rest: 15, bloc: "cardio-facile", format: "circuit",
      tip: "En marchant, sans sauter, à un rythme où tu peux parler. Si la tête tourne, arrête-toi et mange quelque chose de sucré.",
      benefit: "Un réveil en douceur, le ventre vide.", muscles: ["Cardio", "Quadriceps"] },
    { name: "Step up banc", sets: 3, reps: "2 min", auto: 120, rest: 45, restAfter: 60, bloc: "cardio-facile",
      tip: "Sur une marche basse, monte et descends en changeant de jambe, sans élan.",
      benefit: "Le souffle monte doucement, sans impact.", muscles: ["Quadriceps", "Fessiers", "Cardio"] },
    { name: "Squat", sets: 2, reps: "12 reps", rest: 30,
      tip: "Descends lentement, jusqu’où tu restes à l’aise.",
      benefit: "Les jambes, sans charge.", muscles: CUISSES },
    { name: "Pompes inclinées", sets: 2, reps: "10 reps", rest: 30,
      tip: "Mains sur une table ou le bord d’un lit, le corps bien aligné.",
      benefit: "Le haut du corps, à ton niveau.", muscles: ["Pectoraux", "Triceps"] },
    { name: "Pont fessier", sets: 2, reps: "15 reps", rest: 30,
      tip: "Sur le dos, pieds à plat, monte le bassin et serre les fessiers en haut.",
      benefit: "Les fessiers et l’arrière des cuisses.", muscles: ["Fessiers", "Ischio-jambiers"] },
    { name: "Bird dog", sets: 2, reps: "8 par côté", rest: 30,
      tip: "À quatre pattes, tends un bras et la jambe opposée sans bouger le dos.",
      benefit: "Le tronc, en douceur.", muscles: ["Core", "Lombaires"] },
    { name: "Gainage", sets: 2, reps: "30 sec", auto: 30, rest: 30,
      tip: "Sur les avant-bras, corps aligné. Après la séance, un petit-déjeuner avec des protéines, comme des œufs, du fromage blanc ou du skyr.",
      benefit: "Le tronc qui tient le reste.", muscles: ["Core", "Abdominaux"] },
  ]),
};
