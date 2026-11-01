/* ════════════════════════════════════════════════════════════════════
   LES CLASSIQUES : la même séance, d'un mois sur l'autre, pour battre
   ton score (maquette « Le chrono et le score », version 3, les réponses
   de Louis du 2026-11-01, puis son GO le même jour : « GO, code-le »).

   Ce module est PUR. Il décrit les onze classiques et ce qu'on y compte,
   et il calcule tout ce que les écrans affichent : le score, ton
   meilleur, l'écart, l'escalier de tes meilleurs, ce que dit l'écran
   pendant l'effort, et ce qui part dans le journal. Il ne lit rien et
   n'écrit rien : `scoresClassiques.ts` lit la base, et
   `npm run check:classiques` vérifie les règles.

   ⚠️ UN SCORE NE SE COMPARE QU'À SOI. Pas de classement, pas de moyenne,
   et un score moins bon ne s'affiche jamais comme un recul : l'écart ne
   se dit que quand il est un progrès, et l'écran pendant l'effort ne
   parle de ton meilleur que quand tu es devant (la dernière minute d'un
   max dit ce qu'il reste pour le battre, jamais ce qui manque).

   ⚠️ LES NOMS SE DISENT EN CLAIR (Louis, 2026-10-31 et 2026-11-01) :
   « Le max en 12 minutes », jamais « AMRAP » à l'écran ; « étape », pas
   « palier » ; « fait 3 fois », pas « 3 passages ». Le mot du métier n'a
   sa place que dans l'explication (« C'est ce qu'on appelle un AMRAP »).

   ⚠️ DEUX TIERS OUVERTS, UN TIERS VAIIYA+ (Louis, 2026-10-31), et tant
   que la vente est fermée tout reste ouvert : les quatre futurs Vaiiya+
   (`ouvert: false`) portent « Bientôt Vaiiya+ ». C'est le catalogue qui
   décide de l'accès, avec `VENTE_OUVERTE` (rien ne se ferme qu'on ne
   puisse ouvrir).

   ⚠️ LES TEXTES S'ÉCRIVENT AVEC DES ESPACES ORDINAIRES : `typo()` pose
   les espaces insécables au rendu, comme `typoMatin`.
   ════════════════════════════════════════════════════════════════════ */
import type { Exercise } from "@/components/WorkoutGuideModal";
import type { MarquesSeance } from "@/lib/journalSeance";
import { trouverExercice } from "@/lib/exerciseLibrary";
import type { WorkoutCategory } from "@/lib/assistantActions";

const NB = String.fromCharCode(160);

/** La typographie française, posée au rendu : espaces insécables avant
 *  « : ; ? ! » et à l'intérieur des guillemets, apostrophes courbes. */
export function typo(s: string): string {
  return s
    .replace(/'/g, "’")
    .replace(/ ([:;?!])/g, NB + "$1")
    .replace(/« /g, "«" + NB)
    .replace(/ »/g, NB + "»")
    .replace(/(\d) (\d{3})(?!\d)/g, "$1" + NB + "$2");
}

/* ── Ce qu'on compte ─────────────────────────────────────────────────── */

/** Cinq façons de compter : un temps (le plus court gagne), des tours,
 *  des répétitions, une tenue (le plus long gagne), la dernière minute. */
export type SorteScore = "temps" | "tours" | "reps" | "tenue" | "minute";

/** Le format décide de l'écran pendant l'effort et de la feuille de
 *  première fois : une par format, une seule fois. */
export type FormatClassique = "temps" | "max" | "compte" | "tenue" | "minute";

/** Ce qu'on fait avant de toucher « Fait ». */
export type Morceau = { exercice: string; nombre: number };

/** Une ligne de « Comment ça marche ». */
export type LigneComment = { texte: string; gras?: string; note?: string; escalier?: number[] };

export type Classique = {
  /** L'identifiant de la séance au catalogue. Figé pour toujours : le
   *  score s'y accroche. */
  id: string;
  titre: string;
  /** La catégorie au catalogue et au planning. */
  categorie: WorkoutCategory;
  /** Le mot géant de la fin de séance (« Décompte », « Le max »). */
  mot: string;
  /** Le titre en géant, ligne par ligne. */
  lignes: string[];
  promesse: string;
  sorte: SorteScore;
  format: FormatClassique;
  /** `false` : un futur Vaiiya+, ouvert tant que la vente est fermée. */
  ouvert: boolean;
  /** La durée affichée. Un max ou un compte affiche sa durée d'effort,
   *  celle que son titre annonce ; les autres, une durée habituelle. */
  minutes: number;
  niveau: "Débutant" | "Intermédiaire" | "Avancé";
  materiel: string;
  /** Au chrono : les étapes, chacune d'un ou deux morceaux. */
  etapes?: Morceau[][];
  /** Le max : un tour. */
  tour?: Morceau[];
  /** Le max, le compte et la minute : la limite, en secondes. */
  plafond?: number;
  /** Le compte, la tenue et la minute : le seul mouvement. */
  mouvement?: string;
  /** Au chrono : ce qui arrête le chrono (« sur le dernier squat »). */
  derniere?: string;
  but: string;
  deroule: string;
  avant: string;
  comment: LigneComment[];
};

const de10a1 = (a: string, b: string): Morceau[][] =>
  [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((k) => [{ exercice: a, nombre: k }, { exercice: b, nombre: k }]);

export const CLASSIQUES: Classique[] = [
  {
    id: "decompte", categorie: "cardio", mot: "Décompte", titre: "Le Décompte", lignes: ["Le", "Décompte"],
    promesse: "Burpees et squats, de 10 à 1, le plus vite possible.",
    sorte: "temps", format: "temps", ouvert: true, minutes: 12, niveau: "Intermédiaire", materiel: "sans matériel",
    etapes: de10a1("Burpees", "Squat"), derniere: "sur le dernier squat",
    but: "Faire les 110 répétitions le plus vite possible. Ton temps, c'est ton score.",
    deroule: "10 burpees, puis 10 squats. Puis 9 et 9, 8 et 8, jusqu'à 1 et 1.",
    avant: "Échauffe-toi deux minutes : 45 secondes de jumping jacks, puis 10 squats lents.",
    comment: [
      { texte: "10 burpees, puis 10 squats." },
      { texte: "Puis 9 et 9, 8 et 8… jusqu'à 1 et 1.", note: "110 répétitions en tout.", escalier: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
      { texte: "Le chrono tourne du premier burpee au dernier squat.", gras: "Ton temps, c'est ton score.", note: "Souffle quand tu veux : le chrono continue." },
    ],
  },
  {
    id: "escalier", categorie: "fullbody", mot: "Escalier", titre: "L’Escalier", lignes: ["L’Escalier"],
    promesse: "Pompes de 1 à 10, squats de 10 à 1, le plus vite possible.",
    sorte: "temps", format: "temps", ouvert: true, minutes: 15, niveau: "Intermédiaire", materiel: "sans matériel",
    etapes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => [{ exercice: "Pompes", nombre: k }, { exercice: "Squat", nombre: 11 - k }]),
    derniere: "sur le dernier squat",
    but: "Faire les 110 répétitions le plus vite possible. Ton temps, c'est ton score.",
    deroule: "1 pompe et 10 squats, puis 2 pompes et 9 squats, jusqu'à 10 pompes et 1 squat.",
    avant: "Échauffe-toi deux minutes : 45 secondes de jumping jacks, puis 5 pompes sur les genoux et 10 squats lents.",
    comment: [
      { texte: "1 pompe, puis 10 squats." },
      { texte: "Puis 2 et 9, 3 et 8… jusqu'à 10 pompes et 1 squat.", note: "Les pompes montent pendant que les squats descendent.", escalier: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { texte: "Le chrono tourne de la première pompe au dernier squat.", gras: "Ton temps, c'est ton score.", note: "Souffle quand tu veux : le chrono continue." },
    ],
  },
  {
    id: "centurion", categorie: "force", mot: "Centurion", titre: "Le Centurion", lignes: ["Le", "Centurion"],
    promesse: "100 abdos en quatre exercices, le plus vite possible.",
    sorte: "temps", format: "temps", ouvert: true, minutes: 12, niveau: "Intermédiaire", materiel: "sans matériel",
    etapes: [
      [{ exercice: "Crunch", nombre: 25 }], [{ exercice: "Bicycle crunch", nombre: 25 }],
      [{ exercice: "Reverse crunch", nombre: 25 }], [{ exercice: "Russian twist", nombre: 25 }],
    ],
    derniere: "sur le dernier russian twist",
    but: "Faire les 100 répétitions d'abdos le plus vite possible. Ton temps, c'est ton score.",
    deroule: "25 crunchs, 25 bicycle crunchs, 25 reverse crunchs, puis 25 russian twists, dans cet ordre.",
    avant: "Échauffe-toi deux minutes : 30 secondes de gainage, puis 10 crunchs lents.",
    comment: [
      { texte: "25 crunchs, puis 25 bicycle crunchs." },
      { texte: "Puis 25 reverse crunchs et 25 russian twists.", note: "100 répétitions en tout." },
      { texte: "Le chrono tourne du premier crunch au dernier twist.", gras: "Ton temps, c'est ton score.", note: "Souffle quand tu veux : le chrono continue." },
    ],
  },
  {
    id: "max-12", categorie: "fullbody", mot: "Le max", titre: "Le max en 12 minutes", lignes: ["Le max en", "12 minutes"],
    promesse: "Le plus de tours de pompes, squats et crunchs en 12 minutes.",
    sorte: "tours", format: "max", ouvert: true, minutes: 12, niveau: "Intermédiaire", materiel: "sans matériel",
    tour: [{ exercice: "Pompes", nombre: 5 }, { exercice: "Squat", nombre: 10 }, { exercice: "Crunch", nombre: 15 }],
    plafond: 12 * 60,
    but: "Faire le plus de tours possible en 12 minutes.",
    deroule: "Un tour : 5 pompes, 10 squats, 15 crunchs. Tu enchaînes les tours sans attendre, jusqu'à la sonnerie.",
    avant: "Échauffe-toi deux minutes : 45 secondes de jumping jacks, puis 10 squats lents.",
    comment: [
      { texte: "Un tour : 5 pompes, 10 squats, 15 crunchs." },
      { texte: "Tu enchaînes les tours pendant 12 minutes.", note: "Tu touches « Fait » à la fin de chaque exercice." },
      { texte: "À la sonnerie, tes tours finis, plus les répétitions du tour en cours.", gras: "C'est ton score." },
    ],
  },
  {
    id: "cinq-minutes-burpees", categorie: "cardio", mot: "Burpees", titre: "Cinq minutes de burpees", lignes: ["Cinq minutes", "de burpees"],
    promesse: "Le plus de burpees possible en cinq minutes.",
    sorte: "reps", format: "compte", ouvert: true, minutes: 5, niveau: "Intermédiaire", materiel: "sans matériel",
    mouvement: "Burpees", plafond: 5 * 60,
    but: "Faire le plus de burpees possible en cinq minutes.",
    deroule: "Des burpees à ton rythme, pendant cinq minutes. Tu touches l'écran à chaque burpee : le compte se fait tout seul.",
    avant: "Échauffe-toi deux minutes : 45 secondes de jumping jacks, puis 5 burpees lents.",
    comment: [
      { texte: "Cinq minutes au chrono, des burpees à ton rythme." },
      { texte: "Tu touches l'écran à chaque burpee.", note: "Un oubli se corrige à la sonnerie." },
      { texte: "À la sonnerie, le nombre de burpees.", gras: "C'est ton score." },
    ],
  },
  {
    id: "record-chaise", categorie: "force", mot: "Chaise", titre: "Le record de la chaise", lignes: ["Le record", "de la chaise"],
    promesse: "Tenir la chaise au mur le plus longtemps possible.",
    sorte: "tenue", format: "tenue", ouvert: true, minutes: 5, niveau: "Débutant", materiel: "un mur",
    mouvement: "Chaise au mur",
    but: "Tenir la chaise au mur le plus longtemps possible, en une seule fois.",
    deroule: "Dos contre le mur, cuisses parallèles au sol. Le chrono monte, et tu touches « J'arrête » quand tu te relèves.",
    avant: "Échauffe-toi deux minutes : 10 squats lents, puis 30 secondes de marche sur place.",
    comment: [
      { texte: "Dos contre le mur, cuisses parallèles au sol." },
      { texte: "Le chrono monte tant que tu tiens.", note: "Tu touches « J'arrête » quand tu te relèves." },
      { texte: "Le temps tenu, en une seule fois.", gras: "C'est ton score." },
    ],
  },
  {
    id: "une-de-plus", categorie: "cardio", mot: "Minute", titre: "Une de plus chaque minute", lignes: ["Une de plus", "chaque minute"],
    promesse: "Un burpee la première minute, deux la deuxième… jusqu'où ?",
    sorte: "minute", format: "minute", ouvert: true, minutes: 15, niveau: "Avancé", materiel: "sans matériel",
    mouvement: "Burpees", plafond: 30 * 60,
    but: "Tenir le plus de minutes possible : chaque minute demande un burpee de plus que la précédente.",
    deroule: "Minute 1 : 1 burpee. Minute 2 : 2 burpees. Minute 3 : 3 burpees. Le reste de la minute, c'est ton repos. Ça s'arrête à la première minute que tu ne finis pas.",
    avant: "Échauffe-toi deux minutes : 45 secondes de jumping jacks, puis 5 burpees lents.",
    comment: [
      { texte: "Minute 1 : 1 burpee. Minute 2 : 2. Minute 3 : 3." },
      { texte: "Le reste de la minute, c'est ton repos.", note: "Plus tu avances, moins il en reste." },
      { texte: "Ça s'arrête à la première minute pas finie.", gras: "La dernière minute réussie, c'est ton score." },
    ],
  },
  /* ── Les quatre futurs Vaiiya+ (Louis, 2026-11-01) ── */
  {
    id: "la-centaine", categorie: "fullbody", mot: "Centaine", titre: "La Centaine", lignes: ["La", "Centaine"],
    promesse: "100 squats, 75 crunchs, 50 pompes, 25 burpees, dans l'ordre.",
    sorte: "temps", format: "temps", ouvert: false, minutes: 20, niveau: "Intermédiaire", materiel: "sans matériel",
    etapes: [
      [{ exercice: "Squat", nombre: 100 }], [{ exercice: "Crunch", nombre: 75 }],
      [{ exercice: "Pompes", nombre: 50 }], [{ exercice: "Burpees", nombre: 25 }],
    ],
    derniere: "sur le dernier burpee",
    but: "Faire les 250 répétitions le plus vite possible, dans l'ordre. Ton temps, c'est ton score.",
    deroule: "100 squats, puis 75 crunchs, puis 50 pompes, puis 25 burpees. Tu découpes chaque exercice comme tu veux.",
    avant: "Échauffe-toi deux minutes : 45 secondes de jumping jacks, puis 10 squats lents.",
    comment: [
      { texte: "100 squats, puis 75 crunchs." },
      { texte: "Puis 50 pompes et 25 burpees.", note: "Découpe chaque exercice comme tu veux." },
      { texte: "Le chrono tourne du premier squat au dernier burpee.", gras: "Ton temps, c'est ton score." },
    ],
  },
  {
    id: "cinq-cents", categorie: "fullbody", mot: "500", titre: "500 répétitions", lignes: ["500", "répétitions"],
    promesse: "Six exercices, 500 répétitions, découpées comme tu veux.",
    sorte: "temps", format: "temps", ouvert: false, minutes: 35, niveau: "Avancé", materiel: "sans matériel",
    etapes: [
      [{ exercice: "Squat", nombre: 100 }], [{ exercice: "Crunch", nombre: 100 }], [{ exercice: "Fentes", nombre: 100 }],
      [{ exercice: "Pont fessier", nombre: 100 }], [{ exercice: "Pompes", nombre: 50 }], [{ exercice: "Burpees", nombre: 50 }],
    ],
    derniere: "sur le dernier burpee",
    but: "Faire les 500 répétitions le plus vite possible, dans l'ordre. Ton temps, c'est ton score.",
    deroule: "100 squats, 100 crunchs, 100 fentes (50 par jambe), 100 ponts fessiers, 50 pompes, puis 50 burpees. Tu découpes chaque exercice comme tu veux.",
    avant: "Échauffe-toi trois minutes : une minute de jumping jacks, puis 10 squats et 10 fentes lents.",
    comment: [
      { texte: "100 squats, 100 crunchs, 100 fentes." },
      { texte: "Puis 100 ponts fessiers, 50 pompes et 50 burpees.", note: "Découpe chaque exercice comme tu veux." },
      { texte: "Tu touches « Fait » à la fin de chaque exercice.", gras: "Ton temps, c'est ton score." },
    ],
  },
  {
    id: "max-20-halteres", categorie: "force", mot: "Le max", titre: "Le max en 20 minutes aux haltères", lignes: ["Le max en 20 minutes", "aux haltères"],
    promesse: "Thrusters, rowings et fentes : le plus de tours en 20 minutes.",
    sorte: "tours", format: "max", ouvert: false, minutes: 20, niveau: "Avancé", materiel: "deux haltères",
    tour: [
      { exercice: "Thruster haltères", nombre: 8 }, { exercice: "Rowing buste penché haltères", nombre: 10 },
      { exercice: "Fentes", nombre: 12 },
    ],
    plafond: 20 * 60,
    but: "Faire le plus de tours possible en 20 minutes, avec la même paire d'haltères du début à la fin.",
    deroule: "Un tour : 8 thrusters, 10 rowings, 12 fentes (6 par jambe). Tu enchaînes les tours sans attendre, jusqu'à la sonnerie.",
    avant: "Échauffe-toi trois minutes sans charge : 10 squats, 10 fentes, 10 rowings à vide. Prends des haltères que tu pourrais soulever une quinzaine de fois au thruster.",
    comment: [
      { texte: "Un tour : 8 thrusters, 10 rowings, 12 fentes." },
      { texte: "Tu enchaînes les tours pendant 20 minutes.", note: "La même paire d'haltères du début à la fin." },
      { texte: "À la sonnerie, tes tours finis, plus les répétitions du tour en cours.", gras: "C'est ton score." },
    ],
  },
  {
    id: "kilometre-rameur", categorie: "cardio", mot: "Rameur", titre: "Le kilomètre de rameur", lignes: ["Le kilomètre", "de rameur"],
    promesse: "1 000 mètres de rameur, le plus vite possible.",
    sorte: "temps", format: "temps", ouvert: false, minutes: 12, niveau: "Intermédiaire", materiel: "un rameur",
    etapes: [1, 2, 3, 4].map(() => [{ exercice: "Rameur", nombre: 250 }]),
    derniere: "à 1 000 mètres",
    but: "Ramer 1 000 mètres le plus vite possible. Ton temps, c'est ton score.",
    deroule: "Quatre étapes de 250 mètres. Tu touches « Fait » à 250, 500, 750, puis 1 000 mètres sur le compteur du rameur.",
    avant: "Échauffe-toi cinq minutes en ramant tranquille, avec trois accélérations de dix coups.",
    comment: [
      { texte: "1 000 mètres au compteur du rameur." },
      { texte: "Tu touches « Fait » à 250, 500, 750 et 1 000 mètres.", note: "Ton meilleur te suit à chaque étape." },
      { texte: "Le chrono tourne du premier coup au dernier mètre.", gras: "Ton temps, c'est ton score." },
    ],
  },
];

const PAR_ID = new Map(CLASSIQUES.map((c) => [c.id, c]));
const sansAccents = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’']/g, "'").toLowerCase().trim();
const PAR_TITRE = new Map(CLASSIQUES.map((c) => [sansAccents(c.titre), c]));

/** Le classique d'une séance, par son identifiant de catalogue. */
export function classiqueDe(id: string | null | undefined): Classique | null {
  return (id && PAR_ID.get(id)) || null;
}

/** Le classique d'un titre (une séance posée au planning, l'historique). */
export function classiqueParTitre(titre: string | null | undefined): Classique | null {
  return (titre && PAR_TITRE.get(sansAccents(titre))) || null;
}

/* ── Les mots ────────────────────────────────────────────────────────── */

const UNITES: Record<string, [string, string]> = {
  "Burpees": ["burpee", "burpees"],
  "Squat": ["squat", "squats"],
  "Pompes": ["pompe", "pompes"],
  "Crunch": ["crunch", "crunchs"],
  "Bicycle crunch": ["bicycle crunch", "bicycle crunchs"],
  "Reverse crunch": ["reverse crunch", "reverse crunchs"],
  "Russian twist": ["russian twist", "russian twists"],
  "Fentes": ["fente", "fentes"],
  "Pont fessier": ["pont fessier", "ponts fessiers"],
  "Thruster haltères": ["thruster", "thrusters"],
  "Rowing buste penché haltères": ["rowing", "rowings"],
  "Rameur": ["mètre", "mètres"],
  "Chaise au mur": ["chaise au mur", "chaises au mur"],
};

/** « burpee » ou « burpees », selon le nombre. */
export function unite(exercice: string, n: number): string {
  const u = UNITES[exercice] ?? [exercice.toLowerCase(), exercice.toLowerCase()];
  return n > 1 ? u[1] : u[0];
}

/** « 7 burpees », « 250 m ». */
export function dose(m: Morceau): string {
  return m.exercice === "Rameur" ? `${m.nombre}${NB}m` : `${m.nombre}${NB}${unite(m.exercice, m.nombre)}`;
}

const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Ce qui se compte, en mots : « un temps », « des tours »… */
export const FACON: Record<SorteScore, string> = {
  temps: "un temps", tours: "des tours", reps: "des répétitions", tenue: "une tenue", minute: "la dernière minute",
};

/** La ligne sous le titre d'une fiche. */
export function surtitre(c: Classique): string {
  switch (c.format) {
    case "temps": return "Un classique · la même séance, pour battre ton temps";
    case "max": return `Un classique · le plus de tours en ${c.minutes} minutes`;
    case "compte": return `Un classique · le plus de ${unite(c.mouvement ?? "", 2)} en ${c.minutes} minutes`;
    case "tenue": return "Un classique · la tenue la plus longue";
    case "minute": return "Un classique · jusqu'à la dernière minute";
  }
}

/** « 12 min environ · sans matériel ». */
export function meta(c: Classique): string {
  const exact = c.format === "max" || c.format === "compte";
  return `${c.minutes}${NB}min${exact ? "" : " environ"} · ${c.materiel}`;
}

/* ── Le déroulé ──────────────────────────────────────────────────────── */

/** Les morceaux au chrono, dans l'ordre, avec leur étape. */
export function morceauxAuChrono(c: Classique): { m: Morceau; etape: number }[] {
  return (c.etapes ?? []).flatMap((e, i) => e.map((m) => ({ m, etape: i })));
}

/** Le k-ième morceau joué (à partir de 0) : les étapes à la suite, ou
 *  le tour qui se répète. */
export function morceauNumero(c: Classique, k: number): Morceau | null {
  if (c.sorte === "tours") {
    const t = c.tour ?? [];
    return t.length ? t[k % t.length] : null;
  }
  return morceauxAuChrono(c)[k]?.m ?? null;
}

export const repsDuTour = (c: Classique) => (c.tour ?? []).reduce((s, m) => s + m.nombre, 0);
export const repsAuTotal = (c: Classique) => morceauxAuChrono(c).reduce((s, x) => s + x.m.nombre, 0);

/** Les répétitions faites une fois les n premiers morceaux finis. */
export function repsApres(c: Classique, n: number): number {
  if (c.sorte === "reps") return n;
  let s = 0;
  for (let k = 0; k < n; k++) s += morceauNumero(c, k)?.nombre ?? 0;
  return s;
}

/** Combien de passages ont eu lieu à l'instant t (les passages sont dans l'ordre). */
function passagesAvant(passages: readonly number[], t: number): number {
  let n = 0;
  while (n < passages.length && passages[n] <= t) n++;
  return n;
}

/** Les mouvements d'un classique, pour la fiche (« Burpees · 55 en tout »). */
export function mouvements(c: Classique): { exercice: string; nom: string; detail: string }[] {
  const nomDe = (e: string) => (e === "Rameur" ? "Rameur" : maj(unite(e, 2)));
  if (c.sorte === "tours") {
    return (c.tour ?? []).map((m) => ({ exercice: m.exercice, nom: nomDe(m.exercice), detail: `${m.nombre} par tour` }));
  }
  if (c.etapes) {
    const totaux = new Map<string, number>();
    for (const { m } of morceauxAuChrono(c)) totaux.set(m.exercice, (totaux.get(m.exercice) ?? 0) + m.nombre);
    return [...totaux].map(([e, n]) => ({
      exercice: e, nom: nomDe(e),
      detail: e === "Rameur" ? `${milliers(n)}${NB}m en tout` : `${milliers(n)} en tout`,
    }));
  }
  const e = c.mouvement ?? "";
  const detail = c.sorte === "tenue" ? "le plus longtemps possible" : c.sorte === "minute" ? "un de plus chaque minute" : "le plus possible";
  return [{ exercice: e, nom: e === "Chaise au mur" ? "Chaise au mur" : nomDe(e), detail }];
}

const NOMBRES_TITRE = ["", "Le mouvement", "Les deux mouvements", "Les trois mouvements", "Les quatre mouvements", "Les cinq mouvements", "Les six mouvements"];
export const titreMouvements = (n: number) => NOMBRES_TITRE[n] ?? `Les ${n} mouvements`;

/** « 1 000 » avec l'espace insécable des milliers. */
export function milliers(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
}

/* ── Le score ────────────────────────────────────────────────────────── */

/** Ce que le journal garde d'un classique (`workout_sessions.score`). */
export type ScoreClassique = {
  v: 1;
  classique: string;
  sorte: SorteScore;
  /** Le nombre qui se compare : des secondes (temps, tenue), des
   *  répétitions (tours, reps), une minute. */
  valeur: number;
  /** Le max : les tours finis et les répétitions du tour en cours. */
  tours?: number;
  reste?: number;
  /** Les secondes écoulées à chaque « Fait » (chaque burpee pour un
   *  compte, chaque minute finie) : c'est ce qui permet à l'écran de dire
   *  quand tu es devant ton meilleur, la fois suivante. */
  passages: number[];
};

/** Un score et le jour où il a été posé. */
export type ScoreDate = ScoreClassique & { quand: string };

const plusCourtGagne = (s: SorteScore) => s === "temps";

/** `a` est-il strictement meilleur que `b` ? */
export function meilleurQue(a: Pick<ScoreClassique, "sorte" | "valeur">, b: Pick<ScoreClassique, "valeur">): boolean {
  return plusCourtGagne(a.sorte) ? a.valeur < b.valeur : a.valeur > b.valeur;
}

/** Un chrono : « 11:42 », « 1:02:05 ». */
export function chrono(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const deux = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${deux(m)}:${deux(r)}` : `${deux(m)}:${deux(r)}`;
}

/** Un temps comme on l'écrit dans une phrase : « 12:30 », « 2:05 ». */
export function tempsCourt(secondes: number): string {
  const c = chrono(secondes);
  return c.startsWith("0") && c.length === 5 ? c.slice(1) : c;
}

/** Le score en court, pour un escalier ou une ligne : « 6 + 11 »,
 *  « 11:42 », « 64 », « 2:05 », « 12 ». */
export function scoreCourt(s: Pick<ScoreClassique, "sorte" | "valeur" | "tours" | "reste">): string {
  switch (s.sorte) {
    case "temps": case "tenue": return tempsCourt(s.valeur);
    case "tours": return s.reste ? `${s.tours ?? 0}${NB}+${NB}${s.reste}` : String(s.tours ?? 0);
    default: return String(s.valeur);
  }
}

/** Le score en entier : « 6 tours + 11 », « 64 burpees », « minute 12 ». */
export function scoreLong(c: Classique, s: Pick<ScoreClassique, "sorte" | "valeur" | "tours" | "reste">): string {
  switch (s.sorte) {
    case "temps": case "tenue": return tempsCourt(s.valeur);
    case "tours": {
      const t = s.tours ?? 0;
      const tours = `${t}${NB}${t > 1 ? "tours" : "tour"}`;
      return s.reste ? `${tours}${NB}+${NB}${s.reste}` : tours;
    }
    case "reps": return `${s.valeur}${NB}${unite(c.mouvement ?? "", s.valeur)}`;
    case "minute": return `minute${NB}${s.valeur}`;
  }
}

/** L'écart d'un progrès, toujours positif, ou `null` quand ce n'en est
 *  pas un : « 48 s » gagnées, « +3 » répétitions. Jamais de signe moins. */
export function ecartProgres(c: Classique, avant: Pick<ScoreClassique, "valeur">, apres: Pick<ScoreClassique, "sorte" | "valeur">): { valeur: string; unite: string } | null {
  if (!meilleurQue(apres, avant)) return null;
  const d = Math.abs(apres.valeur - avant.valeur);
  switch (apres.sorte) {
    case "temps": {
      const m = Math.floor(d / 60), s = Math.round(d % 60);
      const v = m === 0 ? `${s}${NB}s` : s === 0 ? `${m}${NB}min` : `${m}${NB}min${NB}${s}${NB}s`;
      return { valeur: v, unite: d > 1 ? "gagnées" : "gagnée" };
    }
    case "tenue": {
      const m = Math.floor(d / 60), s = Math.round(d % 60);
      return { valeur: `+${m === 0 ? `${s}${NB}s` : `${m}${NB}min${s ? `${NB}${s}${NB}s` : ""}`}`, unite: "de plus" };
    }
    case "tours": return { valeur: `+${d}`, unite: d > 1 ? "répétitions" : "répétition" };
    case "reps": return { valeur: `+${d}`, unite: unite(c.mouvement ?? "", d) };
    case "minute": return { valeur: `+${d}`, unite: d > 1 ? "minutes" : "minute" };
  }
}

/** Ce qu'on sait de tes essais sur un classique. */
export type Bilan = {
  /** Les essais avec un score, du plus ancien au plus récent. */
  essais: ScoreDate[];
  meilleur: ScoreDate | null;
  premier: ScoreDate | null;
  /** Tes meilleurs successifs : chaque essai qui a battu tous ceux d'avant. */
  escalier: ScoreDate[];
};

export function bilanDe(historique: readonly ScoreDate[]): Bilan {
  const essais = [...historique].sort((a, b) => a.quand.localeCompare(b.quand));
  const escalier: ScoreDate[] = [];
  for (const e of essais) {
    const haut = escalier[escalier.length - 1];
    if (!haut || meilleurQue(e, haut)) escalier.push(e);
  }
  return { essais, meilleur: escalier[escalier.length - 1] ?? null, premier: essais[0] ?? null, escalier };
}

/** « fait 3 fois ». */
export const faitNFois = (n: number) => `fait ${n}${NB}fois`;

/* ── Les dates ───────────────────────────────────────────────────────── */

const PARIS = "Europe/Paris";

/** « 30 septembre ». */
export function dateLongue(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: PARIS }).replace(" ", NB);
}

/** « 30 sept. ». */
export function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: PARIS }).replace(" ", NB);
}

/** Le bon moment pour le refaire : de trois à cinq semaines après le
 *  dernier essai. Le jour reste libre : c'est une indication. */
export function bonMoment(dernier: Date): { du: Date; au: Date } {
  const jour = (n: number) => new Date(dernier.getFullYear(), dernier.getMonth(), dernier.getDate() + n);
  return { du: jour(21), au: jour(35) };
}

/* ── Pendant l'effort : ce que l'écran dit de ton meilleur ───────────── */

/** Les répétitions d'avance sur ton meilleur à l'instant t, ou 0. Une
 *  avance se compte en répétitions, pour tous les classiques qui se font
 *  en morceaux (au chrono, le max) ou en répétitions (le compte). */
export function avanceSurMeilleur(c: Classique, faits: number, meilleur: Pick<ScoreClassique, "passages"> | null, t: number): number {
  if (!meilleur || !meilleur.passages.length) return 0;
  const lui = repsApres(c, passagesAvant(meilleur.passages, t));
  return Math.max(0, repsApres(c, faits) - lui);
}

/** Dans la dernière minute d'un max ou d'un compte : ce qu'il reste à
 *  faire pour battre ton meilleur. `n` vaut 0 quand c'est déjà fait. */
export function pourBattre(c: Classique, faites: number, meilleur: Pick<ScoreClassique, "valeur"> | null): number | null {
  if (!meilleur) return null;
  return Math.max(0, meilleur.valeur + 1 - faites);
}

/* ── Les scores d'un essai ───────────────────────────────────────────── */

const arrondi = (s: number) => Math.round(s * 10) / 10;

/** Au chrono : le score n'existe que si tout est fait. */
export function scoreTemps(c: Classique, passages: readonly number[]): ScoreClassique | null {
  const n = morceauxAuChrono(c).length;
  if (c.sorte !== "temps" || passages.length < n || n === 0) return null;
  const p = passages.slice(0, n).map(arrondi);
  return { v: 1, classique: c.id, sorte: "temps", valeur: Math.round(p[n - 1]), passages: p };
}

/** Le max : les tours finis, plus le tour en cours (les morceaux finis,
 *  et ce qu'on a fait du morceau en cours, dit à la sonnerie). */
export function scoreTours(c: Classique, passages: readonly number[], partiel: number): ScoreClassique {
  const faits = passages.length;
  const enCours = morceauNumero(c, faits);
  const part = Math.max(0, Math.min(partiel, enCours?.nombre ?? 0));
  const total = repsApres(c, faits) + part;
  const parTour = repsDuTour(c) || 1;
  /* Un morceau en cours dit fini compte comme un morceau fait : le tour
     peut se boucler à la sonnerie. */
  const tours = Math.floor(total / parTour);
  const reste = total - tours * parTour;
  return { v: 1, classique: c.id, sorte: "tours", valeur: total, tours, reste, passages: passages.map(arrondi) };
}

/** Le compte : le nombre, corrigé à la sonnerie si besoin. */
export function scoreReps(c: Classique, passages: readonly number[], compte: number): ScoreClassique | null {
  const n = Math.max(0, Math.round(compte));
  if (n === 0) return null;
  return { v: 1, classique: c.id, sorte: "reps", valeur: n, passages: passages.slice(0, n).map(arrondi) };
}

/** La tenue : le temps tenu, à la seconde. */
export function scoreTenue(c: Classique, secondes: number): ScoreClassique | null {
  const s = Math.floor(secondes);
  if (s < 1) return null;
  return { v: 1, classique: c.id, sorte: "tenue", valeur: s, passages: [] };
}

/** La minute : la dernière minute finie à temps. */
export function scoreMinute(c: Classique, passages: readonly number[]): ScoreClassique | null {
  if (!passages.length) return null;
  return { v: 1, classique: c.id, sorte: "minute", valeur: passages.length, passages: passages.map(arrondi) };
}

/* ── Ce que la fin de séance raconte ────────────────────────────────── */

/** « a, b et c ». */
const enListe = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);

/** La ligne sous le score : ce qui a été fait (« 55 burpees et 55 squats. »). */
export function recapEssai(c: Classique, s: Pick<ScoreClassique, "valeur">): string {
  switch (c.sorte) {
    case "temps": {
      const ms = mouvements(c).map((m) => {
        const n = Number(m.detail.replace(/\D/g, ""));
        return m.exercice === "Rameur" ? `${milliers(n)}${NB}mètres de rameur` : `${milliers(n)}${NB}${unite(m.exercice, n)}`;
      });
      return `${enListe(ms)}.`;
    }
    case "tours": return `${milliers(s.valeur)}${NB}${s.valeur > 1 ? "répétitions" : "répétition"} en ${c.minutes}${NB}minutes`;
    case "reps": return `${unite(c.mouvement ?? "", s.valeur)} en ${enLettres(c.minutes)} minutes`;
    case "tenue": return "à la chaise au mur, en une seule fois";
    case "minute": return "la dernière minute finie à temps";
  }
}

/** Le max : combien de chaque exercice, tour en cours compris. */
export function totauxDuMax(c: Classique, faits: number, partiel = 0): { exercice: string; total: number }[] {
  const tour = c.tour ?? [];
  const L = tour.length;
  if (!L) return [];
  const totaux = tour.map((m) => ({ exercice: m.exercice, total: 0 }));
  for (let k = 0; k < faits; k++) totaux[k % L].total += tour[k % L].nombre;
  totaux[faits % L].total += Math.max(0, Math.min(partiel, tour[faits % L].nombre));
  /* Un même exercice deux fois dans le tour se compte une fois. */
  const fusion = new Map<string, number>();
  for (const x of totaux) fusion.set(x.exercice, (fusion.get(x.exercice) ?? 0) + x.total);
  return [...fusion].map(([exercice, total]) => ({ exercice, total }));
}

/* ── La minute : où on en est ───────────────────────────────────────── */

/** La minute en cours (à partir de 1) et ce qu'elle demande. */
export function minuteEnCours(t: number): number {
  return Math.floor(Math.max(0, t) / 60) + 1;
}

/** La minute est-elle ratée ? Quand la minute en cours dépasse d'un cran
 *  les minutes finies, la précédente n'a pas été finie à temps. */
export function minuteRatee(t: number, finies: number): boolean {
  return minuteEnCours(t) > finies + 1;
}

/* ── Ce que le catalogue et le journal lisent ───────────────────────── */

/** Les exercices d'un classique, comme le catalogue les range
 *  (`exerciseData`). Le chrono des classiques ne les lit pas : il suit
 *  ses morceaux. Ils servent à « Refaire », au Guide et au planning. */
export function exercicesDuClassique(c: Classique): Exercise[] {
  const lib = (nom: string) => trouverExercice(nom);
  const base = (nom: string): Pick<Exercise, "tip" | "benefit" | "muscles"> => ({
    tip: lib(nom)?.tip ?? "",
    benefit: lib(nom)?.benefit ?? "",
    muscles: lib(nom)?.muscles ?? [],
  });
  if (c.etapes) {
    const ordre: string[] = [];
    const doses = new Map<string, number[]>();
    for (const { m } of morceauxAuChrono(c)) {
      if (!doses.has(m.exercice)) { ordre.push(m.exercice); doses.set(m.exercice, []); }
      doses.get(m.exercice)!.push(m.nombre);
    }
    const enTours = (c.etapes[0]?.length ?? 1) > 1;
    return ordre.map((nom, i) => {
      const d = doses.get(nom)!;
      const texte = (n: number) => (nom === "Rameur" ? `${n} m` : `${n}`);
      const varie = new Set(d).size > 1;
      return {
        name: nom, sets: d.length, reps: varie ? `${texte(d[0])} à ${texte(d[d.length - 1])}` : texte(d[0]), rest: 0,
        ...(varie ? { repsParSerie: d.map(texte) } : {}),
        ...(enTours ? { bloc: c.id, ...(i === 0 ? { format: c.id === "decompte" ? "descente" as const : "echelle" as const } : {}) } : {}),
        ...base(nom),
      };
    });
  }
  if (c.tour) {
    return c.tour.map((m, i) => ({
      name: m.exercice, sets: 1, reps: m.exercice === "Fentes" ? `${m.nombre / 2} par jambe` : `${m.nombre}`, rest: 0,
      bloc: c.id, ...(i === 0 ? { format: "circuit" as const } : {}),
      ...base(m.exercice),
    }));
  }
  const nom = c.mouvement ?? "";
  if (c.sorte === "reps") return [{ name: nom, sets: 1, reps: `${c.minutes} min`, rest: 0, auto: c.plafond, ...base(nom) }];
  if (c.sorte === "tenue") return [{ name: nom, sets: 1, reps: "le plus longtemps possible", rest: 0, ...base(nom) }];
  return [{ name: nom, sets: 1, reps: "1 de plus chaque minute", rest: 0, ...base(nom) }];
}

/** Ce qu'un essai fini laisse au journal : les exercices tels qu'ils ont
 *  été joués et une marque par série faite. Une série pas faite n'a pas
 *  de marque : le journal la dit « non atteinte ».
 *
 *  ⚠️ Aucune répétition n'y est déclarée (R1 : le journal ne déclare des
 *  répétitions que pour une série prescrite par le programme). C'est ce
 *  qui garde les records à l'écart : 100 squats d'un classique se font en
 *  plusieurs fois, ce n'est pas un record de 100 d'affilée. Le score dit
 *  tout ce qui compte. */
export function journalDuClassique(c: Classique, essai: { passages: readonly number[]; partiel?: number; compte?: number; tenue?: number }): { exercices: Exercise[]; marques: MarquesSeance } {
  const marques: MarquesSeance = {};
  const marquer = (e: number, s: number, reps: number | null, dureeS: number | null = null) => {
    (marques[e] ??= {})[s] = { statut: "terminee", validation: "bouton", dureeS, reps };
  };
  const statiques = exercicesDuClassique(c);

  if (c.etapes) {
    /* Le k-ième morceau est la série « étape » de son exercice. */
    const index = new Map(statiques.map((e, i) => [e.name, i]));
    const vus = new Map<string, number>();
    morceauxAuChrono(c).forEach(({ m }, k) => {
      const s = vus.get(m.exercice) ?? 0;
      vus.set(m.exercice, s + 1);
      if (k < essai.passages.length) marquer(index.get(m.exercice) ?? 0, s, m.nombre);
    });
    return { exercices: statiques, marques };
  }

  if (c.tour) {
    const L = c.tour.length;
    const faits = essai.passages.length;
    const partiel = Math.max(0, essai.partiel ?? 0);
    const toursJoues = Math.max(1, Math.floor(faits / L) + (faits % L || partiel ? 1 : 0));
    for (let k = 0; k < faits; k++) marquer(k % L, Math.floor(k / L), c.tour[k % L].nombre);
    /* Le morceau entamé à la sonnerie n'est pas une série faite : ce
       qu'on en a fait vit dans le score (`reste`), pas dans le journal. */
    return { exercices: statiques.map((e) => ({ ...e, sets: toursJoues })), marques };
  }

  if (c.sorte === "reps") {
    const n = Math.max(0, Math.round(essai.compte ?? 0));
    if (n > 0) marquer(0, 0, n, c.plafond ?? null);
    return { exercices: statiques, marques };
  }
  if (c.sorte === "tenue") {
    const s = Math.floor(essai.tenue ?? 0);
    if (s > 0) marquer(0, 0, null, s);
    return { exercices: statiques, marques };
  }
  /* La minute : une série par minute tentée. */
  const finies = essai.passages.length;
  for (let m = 0; m < finies; m++) marquer(0, m, m + 1);
  return { exercices: statiques.map((e) => ({ ...e, sets: Math.max(1, finies + 1) })), marques };
}

/* ── Les explications ───────────────────────────────────────────────── */

/** La feuille de la première fois : une par format, une seule fois. */
export type Feuille = { format: FormatClassique; question: string; repere: string | null; points: { titre: string; texte: string }[] };

const POINT_MEILLEUR = {
  titre: "Ton meilleur te suit",
  texte: "Dès la deuxième fois, l'écran te dit quand tu es devant ton meilleur. Derrière, il ne dit rien.",
};

export function feuillePremiereFois(c: Classique): Feuille {
  switch (c.format) {
    case "temps": return {
      format: "temps", question: "Un classique, c'est quoi ?", repere: "Ton premier temps sera ton repère",
      points: [
        { titre: "Toujours la même séance", texte: "Mêmes mouvements, même ordre. Ton temps se compare d'une fois sur l'autre." },
        { titre: "Un seul chiffre à la fin", texte: "Un temps, des tours ou des répétitions, selon le classique. Il est gardé dans ton profil." },
        { titre: "Ton seul adversaire, c'est toi", texte: "Tu essaies de battre ton meilleur. Il n'y a aucun classement." },
      ],
    };
    case "max": return {
      format: "max", question: `${c.titre}, c'est quoi ?`, repere: null,
      points: [
        { titre: "Le plus de tours possible", texte: `C'est ce qu'on appelle un AMRAP, pour « as many rounds as possible ». Un tour : ${listeDoses(c.tour ?? [])}. Tu enchaînes les tours pendant ${c.minutes} minutes.` },
        POINT_MEILLEUR,
        { titre: "À la sonnerie, ton score", texte: "Tes tours finis, plus les répétitions du tour en cours : par exemple 6 tours + 11." },
      ],
    };
    case "compte": return {
      format: "compte", question: `${c.titre}, c'est quoi ?`, repere: null,
      points: [
        { titre: `Le plus de ${unite(c.mouvement ?? "", 2)} possible`, texte: `${maj(enLettres(c.minutes))} minutes au chrono, à ton rythme. Tu touches l'écran à chaque ${unite(c.mouvement ?? "", 1)}.` },
        POINT_MEILLEUR,
        { titre: "À la sonnerie, ton score", texte: `Le nombre de ${unite(c.mouvement ?? "", 2)} faits. Un oubli se corrige avant de valider.` },
      ],
    };
    case "tenue": return {
      format: "tenue", question: `${c.titre}, c'est quoi ?`, repere: null,
      points: [
        { titre: "Une seule tenue", texte: "Dos au mur, cuisses parallèles au sol, aussi longtemps que tu peux." },
        { titre: "Le chrono monte", texte: "Tu touches « J'arrête » quand tu te relèves. Ton temps, c'est ton score." },
        { titre: "Ton meilleur te suit", texte: "Dès la deuxième fois, l'écran te dit combien de secondes il reste pour le battre." },
      ],
    };
    case "minute": return {
      format: "minute", question: `${c.titre}, c'est quoi ?`, repere: null,
      points: [
        { titre: "Un burpee de plus chaque minute", texte: "1 la première minute, 2 la deuxième, 3 la troisième, et ainsi de suite." },
        { titre: "Le reste de la minute, c'est ton repos", texte: "Plus tu avances, moins il en reste." },
        { titre: "Ton score", texte: "La dernière minute que tu as finie à temps. Il n'y a aucun classement." },
      ],
    };
  }
}

/** « 5 pompes, 10 squats, 15 crunchs ». */
export function listeDoses(ms: readonly Morceau[]): string {
  return ms.map((m) => `${m.nombre} ${unite(m.exercice, m.nombre)}`).join(", ");
}

const LETTRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
const enLettres = (n: number) => LETTRES[n] ?? String(n);

/** Ce qui fait qu'une répétition compte, mouvement par mouvement. */
const QUI_COMPTE: Record<string, string> = {
  "Burpees": "Un burpee compte quand tu reviens debout et que tu sautes.",
  "Squat": "Un squat compte quand tu te redresses complètement.",
  "Pompes": "Une pompe compte quand ta poitrine descend près du sol et que tes bras se tendent en haut.",
  "Crunch": "Un crunch compte quand tes épaules décollent du sol.",
  "Bicycle crunch": "Au bicycle crunch, chaque coude qui rejoint le genou opposé compte pour un.",
  "Reverse crunch": "Un reverse crunch compte quand ton bassin décolle du sol.",
  "Russian twist": "Au russian twist, chaque côté touché compte pour un.",
  "Fentes": "Une fente compte quand le genou arrière frôle le sol et que tu remontes ; chaque jambe compte pour une.",
  "Pont fessier": "Un pont compte quand ton bassin monte jusqu'à l'alignement des épaules, des hanches et des genoux.",
  "Thruster haltères": "Un thruster compte quand les haltères arrivent bras tendus au-dessus de la tête.",
  "Rowing buste penché haltères": "Un rowing compte quand les haltères montent jusqu'à frôler tes côtes.",
  "Rameur": "Le compteur du rameur fait foi.",
  "Chaise au mur": "La tenue compte tant que tes cuisses restent parallèles au sol, le dos contre le mur.",
};

/** La règle complète, section par section. */
export function regleComplete(c: Classique): { titre: string; texte: string; escalier?: number[] }[] {
  const noms = [...new Set([
    ...(c.etapes ? morceauxAuChrono(c).map((x) => x.m.exercice) : []),
    ...(c.tour ?? []).map((m) => m.exercice),
    ...(c.mouvement ? [c.mouvement] : []),
  ])];
  const qui = noms.map((n) => QUI_COMPTE[n]).filter(Boolean).join(" ");
  const pareil = c.sorte === "tenue"
    ? "Tiens la même position à chaque fois : c'est ce qui rend ton temps comparable."
    : `Fais-les de la même façon à chaque fois : c'est ce qui rend ton ${c.sorte === "temps" ? "temps" : "score"} comparable.`;
  const escalier = c.comment.find((l) => l.escalier)?.escalier;

  const fait = c.sorte === "temps"
    ? " Chaque exercice fini, tu touches « Fait » : l'app passe au suivant."
    : c.sorte === "tours"
      ? " Chaque exercice fini, tu touches « Fait » : l'app passe au suivant, puis au tour suivant."
      : "";

  const chronoTexte: Record<SorteScore, string> = {
    temps: `Il part après « 3, 2, 1 » et s'arrête quand tu touches « Fait » ${c.derniere ?? "sur le dernier mouvement"}. Souffle quand tu veux : le chrono continue.`,
    tours: `Il part après « 3, 2, 1 » et sonne au bout de ${c.minutes} minutes. À la sonnerie, tu dis combien de répétitions tu as faites dans l'exercice en cours.`,
    reps: `Il part après « 3, 2, 1 » et sonne au bout de ${enLettres(c.minutes)} minutes.`,
    tenue: "Il part après « 3, 2, 1 », une fois en position, et s'arrête quand tu touches « J'arrête ».",
    minute: "Il part après « 3, 2, 1 ». Chaque nouvelle minute commence à l'heure, que tu aies fini la précédente ou non.",
  };

  const arret: { titre: string; texte: string } =
    c.sorte === "tenue" ? { titre: "Quand tu t'arrêtes", texte: "C'est la fin de la tenue : le temps tenu devient ton score." }
    : c.sorte === "minute" ? { titre: "Quand tu t'arrêtes", texte: "Tu peux t'arrêter à tout moment : la dernière minute finie devient ton score." }
    : {
      titre: c.sorte === "temps" ? "Si tu t'arrêtes avant la fin" : "Si tu t'arrêtes avant la sonnerie",
      texte: "Ce que tu as fait est gardé dans ta séance, sans score cette fois. Ton meilleur ne bouge pas.",
    };

  return [
    { titre: "Le but", texte: c.format === "max" ? `${c.but} C'est ce qu'on appelle un AMRAP, pour « as many rounds as possible ».` : c.but },
    { titre: "Le déroulé", texte: c.deroule + fait, ...(escalier ? { escalier } : {}) },
    { titre: c.sorte === "tenue" ? "Une tenue qui compte" : "Une répétition qui compte", texte: `${qui} ${pareil}`.trim() },
    { titre: "Le chrono", texte: chronoTexte[c.sorte] },
    arret,
    { titre: "Ton score", texte: `Il se compare à ton meilleur, jamais à quelqu'un d'autre. ${c.sorte === "temps" ? "Un temps moins bon" : "Un score moins bon"} ne s'affiche jamais comme un recul.` },
    { titre: "Le refaire", texte: "Le mieux : toutes les trois à cinq semaines, pour voir le chemin parcouru. Le jour reste libre : rien n'est bloqué avant ou après." },
    { titre: "Avant de commencer", texte: `${c.avant} Arrête-toi si tu as mal.` },
  ];
}
