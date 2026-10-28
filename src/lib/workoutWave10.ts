import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 10 du catalogue : les haltères à la maison (lot 6 de la banque
   de séances, la partie qui n'attend aucun dessin). Une paire d'haltères,
   une chaise ou un canapé, et rien d'autre ; plus Cent swings, la seule
   séance au kettlebell que la bibliothèque sait déjà animer.

   ⚠️ « SOULEVÉ DE TERRE ROUMAIN » SE FAIT ICI AVEC DEUX HALTÈRES, ET LA
   CONSIGNE LE DIT. La bibliothèque le range avec la barre (le Guide ne le
   propose pas à quelqu'un qui n'a que des haltères), mais c'est le même
   geste et la même fiche : le nom reste celui de la fiche, la variante se
   dit dans la consigne, comme pour « Fessiers aux haltères » (lot 1).

   ⚠️ UN COMPLEXE SE JOUE SANS POSER LES HALTÈRES : dans le bloc, l'attente
   entre deux mouvements vaut 0 et le lecteur enchaîne directement
   (lib/toursSeance.ts). Le repos vient après le dernier mouvement du tour.
   ════════════════════════════════════════════════════════════════════ */

const CUISSES = ["Quadriceps", "Fessiers"];
const ARRIERE = ["Ischio-jambiers", "Fessiers"];

export const WAVE_10_EXERCISES: Record<string, Exercise[]> = {
  "corps-entier-halteres": [
    { name: "Goblet squat", sets: 3, reps: "12 reps", rest: 60,
      tip: "Un haltère tenu contre la poitrine, coudes vers le bas, descends entre les genoux en gardant le buste droit.",
      benefit: "Les jambes et les fessiers, avec le buste qui reste droit.", muscles: CUISSES },
    { name: "Rowing haltère", sets: 3, reps: "10 par bras", rest: 60,
      tip: "Une main et un genou sur une chaise ou le canapé, tire l’haltère vers la hanche, dos plat.",
      benefit: "Le dos, un côté après l’autre.", muscles: ["Dos", "Biceps"] },
    { name: "Développé militaire haltères", sets: 3, reps: "10 reps", rest: 60,
      tip: "Debout, le tronc gainé, pousse les deux haltères au-dessus de la tête sans cambrer le dos.",
      benefit: "Les épaules, avec le tronc qui tient.", muscles: ["Épaules", "Triceps"] },
    { name: "Soulevé de terre roumain", sets: 3, reps: "10 reps", rest: 60,
      tip: "Un haltère dans chaque main, jambes presque tendues, recule les fesses et laisse les haltères descendre le long des cuisses, dos plat.",
      benefit: "L’arrière des cuisses et les fessiers.", muscles: ARRIERE },
    { name: "Pont fessier", sets: 3, reps: "15 reps", rest: 45,
      tip: "Sur le dos, un haltère posé sur les hanches, monte le bassin et serre les fessiers en haut.",
      benefit: "La séance se termine par les fessiers.", muscles: ["Fessiers", "Ischio-jambiers"] },
  ],

  complexe: [
    { name: "Soulevé de terre roumain", sets: 5, reps: "6 reps", rest: 0, bloc: "complexe", format: "complexe",
      tip: "Un haltère dans chaque main, une charge que tu tiens pour les cinq mouvements. Six soulevés, dos plat, puis enchaîne sans poser les haltères.",
      benefit: "Le tour commence par l’arrière du corps.", muscles: ARRIERE },
    { name: "Rowing buste penché haltères", sets: 5, reps: "6 reps", rest: 0, bloc: "complexe",
      tip: "Reste penché après le dernier soulevé, dos plat, et tire les deux haltères vers le nombril.",
      benefit: "Le dos, dans la même position.", muscles: ["Dos", "Biceps"] },
    { name: "Développé militaire haltères", sets: 5, reps: "6 reps", rest: 0, bloc: "complexe",
      tip: "Remonte les haltères aux épaules, puis pousse-les au-dessus de la tête.",
      benefit: "Les épaules, au milieu du tour.", muscles: ["Épaules", "Triceps"] },
    { name: "Squat", sets: 5, reps: "6 reps", rest: 0, bloc: "complexe",
      tip: "Les haltères gardés aux épaules, descends en squat et remonte.",
      benefit: "Les jambes, toujours sans lâcher les haltères.", muscles: CUISSES },
    { name: "Fentes", sets: 5, reps: "6 par jambe", rest: 120, bloc: "complexe",
      tip: "Haltères le long du corps, alterne les jambes. Ensuite seulement, pose les haltères pour deux minutes de repos.",
      benefit: "Chaque jambe à son tour, pour finir le tour.", muscles: CUISSES },
  ],

  "haut-halteres": [
    { name: "Développé couché haltères", sets: 3, reps: "10 reps", rest: 15, bloc: "pousser-tirer", format: "superset",
      tip: "Sur un banc, ou au sol si tu n’en as pas. Descends les haltères au niveau de la poitrine puis pousse.",
      benefit: "La poussée, première moitié du duo.", muscles: ["Pectoraux", "Triceps"] },
    { name: "Rowing haltère", sets: 3, reps: "10 par bras", rest: 75, restAfter: 90, bloc: "pousser-tirer",
      tip: "Une main sur une chaise, tire l’haltère vers la hanche, dos plat.",
      benefit: "Le tirage qui répond à la poussée.", muscles: ["Dos", "Biceps"] },
    { name: "Développé militaire haltères", sets: 3, reps: "10 reps", rest: 15, bloc: "epaules", format: "superset",
      tip: "Debout ou sur une chaise, pousse les haltères au-dessus de la tête, le tronc gainé.",
      benefit: "L’avant et le milieu des épaules.", muscles: ["Épaules", "Triceps"] },
    { name: "Oiseau haltères", sets: 3, reps: "15 reps", rest: 75, restAfter: 90, bloc: "epaules",
      tip: "Buste penché, haltères légers, écarte les bras sur les côtés en serrant les omoplates.",
      benefit: "L’arrière des épaules, souvent oublié.", muscles: ["Épaules", "Haut du dos"] },
    { name: "Curl haltères", sets: 3, reps: "12 reps", rest: 15, bloc: "bras", format: "superset",
      tip: "Coudes collés au corps, monte les haltères sans balancer le buste.",
      benefit: "Les biceps.", muscles: ["Biceps"] },
    { name: "Extension triceps haltère", sets: 3, reps: "12 reps", rest: 75, bloc: "bras",
      tip: "Un haltère tenu à deux mains derrière la tête, tends les bras vers le plafond, coudes serrés.",
      benefit: "Les triceps, pour finir.", muscles: ["Triceps"] },
  ],

  "bas-halteres": [
    { name: "Goblet squat", sets: 4, reps: "8 reps", rest: 90,
      tip: "Ton haltère le plus lourd contre la poitrine. Huit répétitions, avec une ou deux de marge.",
      benefit: "La partie lourde commence par le squat.", muscles: CUISSES },
    { name: "Soulevé de terre roumain", sets: 4, reps: "10 reps", rest: 90,
      tip: "Un haltère dans chaque main, recule les hanches, haltères près des jambes, dos plat.",
      benefit: "L’arrière des cuisses, lourd lui aussi.", muscles: ARRIERE },
    { name: "Squat bulgare", sets: 3, reps: "10 par jambe", rest: 60,
      tip: "Pied arrière sur le canapé, un haltère dans chaque main, descends droit.",
      benefit: "Chaque jambe seule, plus léger que le goblet squat.", muscles: CUISSES },
    { name: "Pont fessier", sets: 3, reps: "20 reps", rest: 45,
      tip: "Un haltère sur les hanches, monte le bassin et marque une seconde en haut.",
      benefit: "La série longue de la fin, pour les fessiers.", muscles: ["Fessiers", "Ischio-jambiers"] },
  ],

  "cent-swings": [
    { name: "Kettlebell swing", sets: 10, reps: "10 reps", rest: 0, emom: 60,
      tip: "Dix swings au début de chaque minute, lancés par les hanches, bras relâchés, dos plat. Le reste de la minute est ton repos.",
      benefit: "Cent swings en dix minutes, réglés par l’horloge.", muscles: ["Fessiers", "Ischio-jambiers", "Cardio"] },
  ],
};
