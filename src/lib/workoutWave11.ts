import type { Exercise } from "@/components/WorkoutGuideModal";

/* ════════════════════════════════════════════════════════════════════
   Vague 11 du catalogue : un sport à côté (lot 4 de la banque de
   séances, la partie qui n'attend aucun dessin). Course à pied, football,
   vélo, ski : une séance pour s'y préparer, une pour récupérer. Les
   séances qui demandent des mouvements à dessiner (talons-fesses, la
   course elle-même, les ischios nordiques, la planche de Copenhague,
   les appuis de raquette) viendront avec leurs planches.

   ⚠️ LES RÉCUPÉRATIONS NE COMPTENT PAS D'ÉCHAUFFEMENT (`doux()`, comme
   les routines du lot 3) : on les fait après l'effort, le corps est déjà
   chaud. Les séances de saut et de renfo gardent leurs cinq minutes.

   ⚠️ Une tenue d'un côté puis de l'autre s'écrit en deux séries qui
   alternent ; « par jambe » est ce que l'estimation lit (« par côté »
   ne l'est pas, lib/dureeLibre.ts).
   ════════════════════════════════════════════════════════════════════ */

const CUISSES = ["Quadriceps", "Fessiers"];
const GAINAGE = ["Core", "Abdominaux"];
const SOUFFLE = ["Respiration"];

/** Une séance sans échauffement à part : le drapeau sur chaque exercice. */
const doux = (liste: Exercise[]): Exercise[] => liste.map((e) => ({ ...e, sansEchauffement: true }));

export const WAVE_11_EXERCISES: Record<string, Exercise[]> = {
  /* ── Course à pied ──────────────────────────────────────────────── */
  "apres-sortie": doux([
    { name: "Étirement mollet au mur", sets: 2, reps: "30 sec", rest: 5, restAfter: 10, auto: 30,
      tip: "Un côté puis l’autre. Mains au mur, jambe arrière tendue, talon au sol.",
      benefit: "Les mollets, qui ont porté chaque foulée.", muscles: ["Mollets", "Chevilles"] },
    { name: "Étirement quadriceps", sets: 2, reps: "30 sec", rest: 5, restAfter: 10, auto: 30,
      tip: "Un côté puis l’autre. Debout, attrape la cheville et rapproche le talon de la fesse, genoux serrés.",
      benefit: "L’avant des cuisses.", muscles: ["Quadriceps"] },
    { name: "Étirement chaîne postérieure", sets: 1, reps: "40 sec", rest: 10, auto: 40,
      tip: "Jambes tendues, penche-toi en avant en gardant le dos long, sans forcer.",
      benefit: "L’arrière des jambes et le bas du dos.", muscles: ["Ischio-jambiers", "Dos"] },
    { name: "Pigeon", sets: 2, reps: "40 sec", rest: 5, restAfter: 10, auto: 40,
      tip: "Un côté puis l’autre. Une jambe pliée devant, l’autre tendue derrière, et le buste descend doucement.",
      benefit: "Relâche le fessier et l’avant de la hanche.", muscles: ["Hanches", "Fessiers"] },
    { name: "Cohérence cardiaque", sets: 1, reps: "2 min", rest: 0, auto: 120,
      tip: "Inspire cinq secondes, expire cinq secondes, jusqu’à la fin du chrono.",
      benefit: "Le souffle se pose après la sortie.", muscles: SOUFFLE },
  ]),

  "pliometrie-coureur": [
    { name: "Corde à sauter", sets: 4, reps: "45 sec", rest: 30, auto: 45,
      tip: "Petits sauts sur l’avant des pieds, poignets qui tournent, coudes près du corps. Sans corde, fais le geste.",
      benefit: "Des chevilles réactives, à chaque appui.", muscles: ["Mollets", "Cardio"] },
    { name: "Squats sautés", sets: 4, reps: "6 reps", rest: 60,
      tip: "Saute le plus haut possible et reçois-toi en douceur. Six sauts nets valent mieux que dix qui s’écrasent.",
      benefit: "La puissance des jambes, saut après saut.", muscles: CUISSES },
    { name: "Skaters", sets: 3, reps: "8 par jambe", rest: 45,
      tip: "Bonds sur le côté, d’un pied sur l’autre, et tiens chaque réception une seconde.",
      benefit: "Les appuis latéraux et l’équilibre.", muscles: ["Fessiers", "Cardio"] },
    { name: "Box jump", sets: 3, reps: "5 reps", rest: 60,
      tip: "Sur une marche solide ou un banc stable, saute à deux pieds et redescends en marchant.",
      benefit: "Un saut vers le haut, sans le choc de la réception au sol.", muscles: CUISSES },
    { name: "Fentes sautées", sets: 3, reps: "6 par jambe", rest: 60,
      tip: "Change de jambe en l’air et reçois-toi genoux souples.",
      benefit: "Chaque jambe pousse à son tour, comme dans la foulée.", muscles: CUISSES },
  ],

  /* ── Football ───────────────────────────────────────────────────── */
  "explosivite-terrain": [
    { name: "Sprint sur place", sets: 6, reps: "10 sec", rest: 50, auto: 10,
      tip: "Dix secondes à fond, genoux hauts et bras rapides, puis récupère complètement.",
      benefit: "La vitesse des premiers mètres.", muscles: ["Cardio", "Jambes"] },
    { name: "Squats sautés", sets: 4, reps: "5 reps", rest: 60,
      tip: "Chaque saut à fond, réception souple, puis repars.",
      benefit: "La détente verticale.", muscles: CUISSES },
    { name: "Skaters", sets: 4, reps: "6 par jambe", rest: 60,
      tip: "Bonds latéraux le plus loin possible, réception stable sur un pied.",
      benefit: "Les changements de direction.", muscles: ["Fessiers", "Cardio"] },
    { name: "Box jump", sets: 4, reps: "4 reps", rest: 75,
      tip: "Sur une marche solide ou un banc stable. Saute, stabilise, et redescends en marchant.",
      benefit: "L’explosivité, sans le choc de la réception au sol.", muscles: CUISSES },
    { name: "Burpees", sets: 3, reps: "6 reps", rest: 60,
      tip: "Six burpees rapides et propres, le saut final le plus haut possible.",
      benefit: "Se relever vite, tout le corps d’un coup.", muscles: ["Corps entier", "Cardio"] },
  ],

  "lendemain-match": doux([
    { name: "Cercles de hanches", sets: 2, reps: "8 par sens", rest: 10, restAfter: 15, auto: 40,
      tip: "Debout, mains sur les hanches, de grands cercles lents dans un sens puis dans l’autre.",
      benefit: "Les hanches se remettent à bouger.", muscles: ["Hanches"] },
    { name: "Étirement quadriceps", sets: 2, reps: "40 sec", rest: 5, restAfter: 15, auto: 40,
      tip: "Un côté puis l’autre. Debout, attrape la cheville et rapproche le talon de la fesse.",
      benefit: "L’avant des cuisses, après les sprints et les frappes.", muscles: ["Quadriceps"] },
    { name: "Étirement chaîne postérieure", sets: 2, reps: "40 sec", rest: 10, restAfter: 15, auto: 40,
      tip: "Jambes tendues, penche-toi en avant dos long, sans chercher à toucher le sol.",
      benefit: "L’arrière des cuisses.", muscles: ["Ischio-jambiers", "Dos"] },
    { name: "Papillon hanches", sets: 1, reps: "1 min", rest: 15, auto: 60,
      tip: "Plantes de pieds collées, genoux qui descendent d’eux-mêmes, dos long.",
      benefit: "L’intérieur des cuisses, très sollicité par les appuis.", muscles: ["Hanches", "Adducteurs"] },
    { name: "Pigeon", sets: 2, reps: "45 sec", rest: 5, restAfter: 15, auto: 45,
      tip: "Un côté puis l’autre. Une jambe pliée devant, l’autre tendue derrière.",
      benefit: "Relâche le fessier et l’avant de la hanche.", muscles: ["Hanches", "Fessiers"] },
    { name: "Cohérence cardiaque", sets: 1, reps: "3 min", rest: 0, auto: 180,
      tip: "Inspire cinq secondes, expire cinq secondes, jusqu’à la fin du chrono.",
      benefit: "Trois minutes au calme pour finir.", muscles: SOUFFLE },
  ]),

  /* ── Vélo ───────────────────────────────────────────────────────── */
  "renfo-cycliste": [
    { name: "Squat", sets: 3, reps: "15 reps", rest: 45,
      tip: "Descends en poussant les hanches en arrière, genoux dans l’axe des pieds.",
      benefit: "Les cuisses, celles qui poussent sur les pédales.", muscles: CUISSES },
    { name: "Fentes", sets: 3, reps: "10 par jambe", rest: 45,
      tip: "Alterne les jambes, buste droit, genou arrière qui frôle le sol.",
      benefit: "Chaque jambe seule, comme à chaque coup de pédale.", muscles: CUISSES },
    { name: "Pont fessier", sets: 3, reps: "15 reps", rest: 45,
      tip: "Sur le dos, pieds à plat, monte le bassin en serrant les fessiers.",
      benefit: "Les fessiers, que la position en selle laisse au repos.", muscles: ["Fessiers", "Ischio-jambiers"] },
    { name: "Superman", sets: 3, reps: "15 reps", rest: 45,
      tip: "Sur le ventre, décolle les bras et les jambes ensemble, regard vers le sol.",
      benefit: "Le bas du dos, qui reste penché sur le guidon.", muscles: ["Lombaires", "Fessiers"] },
    { name: "Gainage", sets: 3, reps: "40 sec", rest: 30, auto: 40,
      tip: "Avant-bras sous les épaules, corps aligné, fessiers serrés.",
      benefit: "Un tronc solide pour rester stable sur le vélo.", muscles: GAINAGE },
    { name: "Planche latérale", sets: 4, reps: "30 sec", rest: 10, auto: 30,
      tip: "Deux séries par côté, en alternant. Bassin haut, épaules l’une au-dessus de l’autre.",
      benefit: "Les côtés du tronc.", muscles: ["Obliques", "Core"] },
  ],

  "hanches-velo": doux([
    { name: "Cat-cow", sets: 2, reps: "6 respirations", rest: 10, restAfter: 15, auto: 60,
      tip: "À quatre pattes, creuse le dos en inspirant, arrondis-le en expirant.",
      benefit: "Le dos, resté arrondi pendant toute la sortie.", muscles: ["Dos", "Mobilité"] },
    { name: "World's greatest stretch", sets: 2, reps: "4 par jambe", rest: 15,
      tip: "Un grand pas en avant, une main au sol, puis le bras monte vers le plafond.",
      benefit: "Ouvre l’avant des hanches, fermé par la selle.", muscles: ["Hanches", "Dos", "Ischio-jambiers"] },
    { name: "Étirement quadriceps", sets: 2, reps: "40 sec", rest: 5, restAfter: 15, auto: 40,
      tip: "Un côté puis l’autre. Debout, attrape la cheville et rapproche le talon de la fesse.",
      benefit: "L’avant des cuisses.", muscles: ["Quadriceps"] },
    { name: "Pigeon", sets: 2, reps: "1 min", rest: 5, restAfter: 15, auto: 60,
      tip: "Un côté puis l’autre. Une jambe pliée devant, l’autre tendue derrière, et laisse le buste descendre.",
      benefit: "Relâche le fessier et l’avant de la hanche.", muscles: ["Hanches", "Fessiers"] },
    { name: "Papillon hanches", sets: 1, reps: "1 min", rest: 0, auto: 60,
      tip: "Plantes de pieds collées, genoux qui descendent d’eux-mêmes, dos long.",
      benefit: "L’intérieur des cuisses pour finir.", muscles: ["Hanches", "Adducteurs"] },
  ]),

  /* ── Ski et montagne ────────────────────────────────────────────── */
  "cuisses-skieur": [
    { name: "Chaise au mur", sets: 3, reps: "1 min", rest: 45, auto: 60,
      tip: "Dos contre le mur, cuisses parallèles au sol, comme dans une longue descente.",
      benefit: "Des cuisses qui tiennent longtemps en flexion.", muscles: ["Quadriceps"] },
    { name: "Skaters", sets: 4, reps: "30 sec", rest: 30, auto: 30,
      tip: "Bonds d’un pied sur l’autre, comme un virage après l’autre.",
      benefit: "Les appuis latéraux et l’équilibre.", muscles: ["Fessiers", "Cardio"] },
    { name: "Squat", sets: 4, reps: "15 reps", rest: 45,
      tip: "Trois secondes pour descendre, puis remonte franchement.",
      benefit: "Freiner en descendant, ce que font les cuisses à chaque virage.", muscles: CUISSES },
    { name: "Fentes sautées", sets: 3, reps: "8 par jambe", rest: 60,
      tip: "Change de jambe en l’air, reçois-toi genoux souples et repars aussitôt.",
      benefit: "Réagir vite sur chaque jambe.", muscles: CUISSES },
    { name: "Gainage", sets: 3, reps: "45 sec", rest: 30, auto: 45,
      tip: "Avant-bras sous les épaules, corps aligné, respire lentement.",
      benefit: "Un tronc stable sur les skis.", muscles: GAINAGE },
  ],

  "apres-ski": doux([
    { name: "Étirement quadriceps", sets: 2, reps: "40 sec", rest: 5, restAfter: 15, auto: 40,
      tip: "Un côté puis l’autre. Debout, attrape la cheville et rapproche le talon de la fesse.",
      benefit: "L’avant des cuisses, qui a freiné toute la journée.", muscles: ["Quadriceps"] },
    { name: "Étirement mollet au mur", sets: 2, reps: "30 sec", rest: 5, restAfter: 15, auto: 30,
      tip: "Un côté puis l’autre. Mains au mur, jambe arrière tendue, talon au sol.",
      benefit: "Les mollets, restés serrés dans les chaussures.", muscles: ["Mollets", "Chevilles"] },
    { name: "Étirement chaîne postérieure", sets: 2, reps: "40 sec", rest: 10, restAfter: 15, auto: 40,
      tip: "Jambes tendues, penche-toi en avant dos long, sans forcer.",
      benefit: "L’arrière des jambes et le bas du dos.", muscles: ["Ischio-jambiers", "Dos"] },
    { name: "Pigeon", sets: 2, reps: "45 sec", rest: 5, restAfter: 15, auto: 45,
      tip: "Un côté puis l’autre. Une jambe pliée devant, l’autre tendue derrière.",
      benefit: "Relâche les hanches.", muscles: ["Hanches", "Fessiers"] },
    { name: "Torsion allongée", sets: 2, reps: "30 sec", rest: 5, restAfter: 15, auto: 30,
      tip: "Un côté puis l’autre. Sur le dos, les genoux d’un côté et les épaules au sol.",
      benefit: "Détend le dos.", muscles: ["Dos", "Hanches"] },
    { name: "Cohérence cardiaque", sets: 1, reps: "3 min", rest: 0, auto: 180,
      tip: "Inspire cinq secondes, expire cinq secondes, jusqu’à la fin du chrono.",
      benefit: "Le soir à la station, trois minutes au calme.", muscles: SOUFFLE },
  ]),
};
