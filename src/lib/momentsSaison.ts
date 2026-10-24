/* ════════════════════════════════════════════════════════════════════
   Les moments de l'année sur l'écran Nutrition (Louis, 2026-10-24 :
   maquette « La saison », piste A, puis « La saison, en décor »,
   niveau 2, en clair et en sombre).

   Un moment, c'est une affiche entre « Une idée » et « Trouver une
   recette » : un mot géant, quatre produits de la saison, une phrase, et
   ses recettes, toutes déjà dans la banque. Ce fichier est PUR (aucune
   lecture, aucune horloge) : on lui donne le jour, il rend le moment.

   ⚠️ UN SEUL MOMENT À LA FOIS, AUX MÊMES DATES CHAQUE ANNÉE. Pâques est
   le seul qui bouge : il se calcule (`dimancheDePaques`). Entre deux
   moments, rien ne s'affiche et l'écran reste celui de tous les jours :
   aucun moment ne comble un vide.

   ⚠️ UN MOMENT NE S'AFFICHE QU'AVEC AU MOINS 4 RECETTES POUR LE RÉGIME
   DE LA PERSONNE (`SEUIL_MOMENT`). En végétarien, le mijoté n'en garde
   qu'une : il ne s'affiche pas. Une affiche de deux recettes ferait un
   trou, pas une saison.

   Ajouter un moment, c'est une entrée ici (deux dates, des recettes de la
   banque, quatre produits de `public/saison/`) et sa lumière dans
   `AfficheSaison.module.css`, en clair et en sombre. `check:nutrition`
   refuse un moment sans l'une des deux.
   ════════════════════════════════════════════════════════════════════ */

import { RECIPES, type DietKey, type Recipe } from "@/lib/recipeBank";
import { convient } from "@/lib/collectionsRecettes";

export const SEUIL_MOMENT = 4;

export type IdMoment =
  | "agrumes" | "crepes" | "matins-hiver" | "paques" | "salades" | "barbecue"
  | "glaces" | "rentree" | "soupes" | "gratins" | "mijote" | "fetes";

/** Ce qui bouge sur l'affiche. Un moment qui n'a pas encore été dessiné n'en a pas. */
export type MotifSaison = "feuilles" | "guirlande" | "neige" | "soleil" | null;

/** Un produit de la nature morte : sa vignette, sa place et sa taille en
 *  pixels dans la boîte de 256 × 164 posée en haut à droite de l'affiche.
 *  Le premier de la liste est derrière les autres. */
export type ProduitSaison = { nom: string; x: number; y: number; taille: number; angle: number };

export type MomentSaison = {
  id: IdMoment;
  /** Le mot géant. Un mot par ligne. */
  titre: string;
  /** Au-dessus du mot : la saison, ou la fête qui arrive. */
  surtitre: string;
  /** Le début de la phrase, avant « , jusqu’au 9 novembre. ». */
  phrase: string;
  /** Ce que la personne demande au Guide au bas des recettes du moment.
   *  Ce sont SES mots, comme `DEMANDE_AU_GUIDE` des collections. */
  demande: string;
  /** Le premier et le dernier jour, compris, pour une année donnée. */
  periode: (annee: number) => [string, string];
  /** Les recettes, dans l'ordre du rail. */
  recettes: string[];
  produits: ProduitSaison[];
  motif: MotifSaison;
  /** La vapeur au-dessus du mot, pour ce qui se mange chaud. */
  vapeur: boolean;
};

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const iso = (a: number, m: number, j: number) => `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;

/** Un jour YYYY-MM-DD décalé de `n` jours (calcul en UTC, sans fuseau). */
export function decaler(jour: string, n: number): string {
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10);
}

/** Le dimanche de Pâques (calendrier grégorien, méthode de Meeus). */
export function dimancheDePaques(annee: number): string {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(annee, mois, jour);
}

/** « 9 novembre », « 1er avril », avec l'espace insécable. */
export function jourEnLettres(jour: string): string {
  const [, m, j] = jour.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
}

const fixe = (m1: number, j1: number, m2: number, j2: number) =>
  (a: number): [string, string] => [iso(a, m1, j1), iso(a, m2, j2)];

const finFevrier = (a: number) => new Date(Date.UTC(a, 2, 0)).getUTCDate();

/* Les douze moments, dans l'ordre de l'année. Les quatre premiers dessinés
   (soupes, fêtes, matins d'hiver, glaces) ont leur motif ; les autres ont
   leur lumière et leurs produits, et leur motif viendra quand il sera
   dessiné. */
export const MOMENTS_SAISON: MomentSaison[] = [
  {
    id: "agrumes", titre: "Agrumes", surtitre: "C’est l’hiver",
    phrase: "Des recettes aux agrumes",
    demande: "Tu as une autre idée de recette aux agrumes ?",
    periode: fixe(1, 1, 1, 19),
    recettes: ["salade-d-agrumes-et-grenade", "bowl-de-skyr-kiwi-et-clementine", "magret-de-canard-a-l-orange", "verrines-avocat-crevettes", "vin-chaud-sans-alcool"],
    produits: [
      { nom: "orange", x: 96, y: -14, taille: 148, angle: 6 },
      { nom: "citron-jaune", x: 186, y: 94, taille: 72, angle: -10 },
      { nom: "citron-vert", x: 0, y: 60, taille: 96, angle: -8 },
      { nom: "pamplemousse-rose", x: 66, y: 40, taille: 126, angle: 0 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "crepes", titre: "Crêpes", surtitre: "Pour la Chandeleur",
    phrase: "Des crêpes, des galettes et des pancakes",
    demande: "Tu as une autre idée de crêpes ou de pancakes ?",
    periode: fixe(1, 20, 2, 2),
    recettes: ["crepes-moelleuses", "galettes-de-sarrasin-completes", "pancakes-proteines"],
    produits: [
      { nom: "lait", x: 150, y: -10, taille: 110, angle: 0 },
      { nom: "citron-jaune", x: 188, y: 98, taille: 66, angle: -12 },
      { nom: "oeuf", x: 8, y: 74, taille: 80, angle: -8 },
      { nom: "banane", x: 70, y: 40, taille: 130, angle: -8 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "matins-hiver", titre: "Matins d’hiver", surtitre: "C’est l’hiver",
    phrase: "Des petits-déjeuners pour les matins froids",
    demande: "Tu as une autre idée de petit-déjeuner chaud pour l’hiver ?",
    periode: (a) => [iso(a, 2, 3), iso(a, 2, finFevrier(a))],
    recettes: ["porridge-poire-cannelle", "chocolat-chaud-proteine", "pain-perdu-proteine-a-la-cannelle", "oeufs-cocotte-epinards-jambon", "granola-maison-pomme-cannelle", "bowl-de-skyr-kiwi-et-clementine", "golden-latte-au-curcuma"],
    produits: [
      { nom: "lait", x: 152, y: -8, taille: 104, angle: 0 },
      { nom: "poire", x: 94, y: 18, taille: 116, angle: -6 },
      { nom: "pomme", x: 2, y: 66, taille: 92, angle: 4 },
      { nom: "cerneaux-de-noix", x: 178, y: 94, taille: 70, angle: 10 },
    ],
    motif: "neige", vapeur: false,
  },
  {
    id: "paques", titre: "Pâques", surtitre: "C’est le printemps",
    phrase: "Des recettes au chocolat",
    demande: "Tu as une autre idée de dessert au chocolat pour Pâques ?",
    periode: (a) => { const p = dimancheDePaques(a); return [decaler(p, -13), p]; },
    recettes: ["brookie-fondant", "brownie-fondant-au-chocolat", "muffins-chocolat-moelleux", "mugcake-banane-cacao", "energy-balls-chocolat-amande", "barres-proteinees-maison-chocolat-cacahuete"],
    produits: [
      { nom: "amandes", x: 110, y: -4, taille: 120, angle: 0 },
      { nom: "cerneaux-de-noix", x: 186, y: 96, taille: 70, angle: 8 },
      { nom: "banane", x: 0, y: 56, taille: 104, angle: -14 },
      { nom: "oeuf", x: 100, y: 44, taille: 104, angle: -6 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "salades", titre: "Salades", surtitre: "Les beaux jours",
    phrase: "Des salades et des plats frais",
    demande: "Tu as une autre idée de salade fraîche ?",
    periode: fixe(6, 1, 6, 30),
    recettes: ["salade-de-pates-estivale-a-la-feta", "salade-de-pates-d-ete", "fusilli-mediterraneens", "salade-nicoise", "panzanella-toscane", "tartare-tomates-burrata", "salade-cesar-legere-et-croustillante"],
    produits: [
      { nom: "roquette", x: 66, y: -12, taille: 160, angle: -4 },
      { nom: "avocat", x: 184, y: 94, taille: 76, angle: 8 },
      { nom: "concombre", x: 0, y: 60, taille: 98, angle: -10 },
      { nom: "tomate", x: 94, y: 38, taille: 124, angle: 2 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "barbecue", titre: "Barbecue", surtitre: "C’est l’été",
    phrase: "Des recettes pour le barbecue",
    demande: "Tu as une autre idée de recette pour le barbecue ?",
    periode: fixe(7, 1, 7, 20),
    recettes: ["brochettes-halloumi-legumes", "brochettes-boeuf-poivron-oignon", "gambas-grillees-ail-persil", "poisson-entier-a-la-plancha", "burger-maison-gourmand-equilibre", "coleslaw-maison"],
    produits: [
      { nom: "poivron-jaune", x: 100, y: -12, taille: 140, angle: 10 },
      { nom: "citron-vert", x: 186, y: 98, taille: 68, angle: -8 },
      { nom: "oignon-rouge", x: 2, y: 60, taille: 94, angle: -6 },
      { nom: "poivron-rouge", x: 74, y: 38, taille: 128, angle: -6 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "glaces", titre: "Glaces", surtitre: "C’est l’été",
    phrase: "Des sorbets, des esquimaux et des granités",
    demande: "Tu as une autre idée de glace ou de sorbet maison ?",
    periode: fixe(7, 21, 8, 31),
    recettes: ["batonnets-glaces-smoothie-mangue-passion", "granite-citron-menthe", "creme-glacee-vanille-maison", "sorbet-framboise-minute", "esquimaux-yaourt-fruits-rouges", "frozen-yogurt-fruits-rouges", "nice-cream-banane", "semifreddo-amande", "banana-split", "cheesecake-glace-sans-cuisson"],
    produits: [
      { nom: "citron-jaune", x: 134, y: 6, taille: 88, angle: 8 },
      { nom: "mangue", x: 58, y: 42, taille: 96, angle: -6 },
      { nom: "framboise", x: 156, y: 76, taille: 86, angle: 4 },
      { nom: "menthe-fraiche", x: 6, y: 90, taille: 64, angle: -18 },
    ],
    motif: "soleil", vapeur: false,
  },
  {
    id: "rentree", titre: "Rentrée", surtitre: "C’est la rentrée",
    phrase: "Des repas faciles à emporter",
    demande: "Tu as une autre idée de repas facile à emporter ?",
    periode: fixe(9, 1, 9, 30),
    recettes: ["wrap-poulet-crudites-sauce-yaourt", "bowl-mexicain-poulet-mais-haricots-noirs", "buddha-bowl-pois-chiches-rotis-houmous", "bowl-de-poulet-quinoa-et-avocat", "quesadillas-jambon-fromage", "muffins-sales-epinards-feta-tomates-sechees", "overnight-oats-chocolat-noisette"],
    produits: [
      { nom: "epinards", x: 72, y: -14, taille: 156, angle: -6 },
      { nom: "citron-vert", x: 186, y: 98, taille: 68, angle: 8 },
      { nom: "tomates-cerises", x: 0, y: 62, taille: 98, angle: -6 },
      { nom: "avocat", x: 96, y: 38, taille: 120, angle: 4 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "soupes", titre: "Soupes", surtitre: "C’est l’automne",
    phrase: "Des soupes et des veloutés",
    demande: "Tu as une autre idée de soupe ou de velouté ?",
    periode: fixe(10, 20, 11, 9),
    recettes: ["veloute-de-potimarron-et-chataignes", "minestrone-d-hiver", "harira-aux-lentilles-et-pois-chiches", "pho-au-boeuf", "ramen-au-poulet-et-oeuf-mollet", "veloute-de-carottes"],
    produits: [
      { nom: "poireau", x: 70, y: -12, taille: 172, angle: -4 },
      { nom: "navet", x: 186, y: 96, taille: 70, angle: 10 },
      { nom: "carotte", x: 0, y: 58, taille: 100, angle: -12 },
      { nom: "potimarron", x: 92, y: 36, taille: 130, angle: 3 },
    ],
    motif: "feuilles", vapeur: true,
  },
  {
    id: "gratins", titre: "Gratins", surtitre: "C’est l’automne",
    phrase: "Des plats qui gratinent au four",
    demande: "Tu as une autre idée de gratin ?",
    periode: fixe(11, 10, 11, 30),
    recettes: ["gratin-de-chou-fleur", "tartiflette-allegee", "lasagnes-epinards-ricotta", "endives-au-jambon-gratinees", "hachis-parmentier-a-la-patate-douce", "soupe-a-l-oignon-gratinee"],
    produits: [
      { nom: "oignon", x: 74, y: -14, taille: 150, angle: -6 },
      { nom: "emmental-rape", x: 178, y: 98, taille: 78, angle: -6 },
      { nom: "epinards", x: 0, y: 58, taille: 100, angle: -10 },
      { nom: "pomme-de-terre", x: 88, y: 40, taille: 128, angle: 4 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "mijote", titre: "Mijoté", surtitre: "Les premiers froids",
    phrase: "Des plats qui mijotent longtemps",
    demande: "Tu as une autre idée de plat mijoté ?",
    periode: fixe(12, 1, 12, 14),
    recettes: ["pot-au-feu", "boeuf-bourguignon", "blanquette-de-veau-legere", "petit-sale-aux-lentilles", "mafe-de-poulet", "poulet-tikka-masala", "chili-con-carne", "chili-sin-carne", "tajine-d-agneau-aux-abricots-citron-confit-et-couscous"],
    produits: [
      { nom: "panais", x: 64, y: -10, taille: 168, angle: -14 },
      { nom: "ail", x: 184, y: 96, taille: 70, angle: 8 },
      { nom: "champignons", x: 2, y: 62, taille: 94, angle: -6 },
      { nom: "oignon-rouge", x: 94, y: 34, taille: 124, angle: 4 },
    ],
    motif: null, vapeur: false,
  },
  {
    id: "fetes", titre: "Fêtes", surtitre: "Le temps des fêtes",
    phrase: "De l’entrée à la bûche",
    demande: "Tu as une autre idée de recette pour les fêtes ?",
    periode: fixe(12, 15, 12, 31),
    recettes: ["blinis-au-saumon-fume", "noix-de-saint-jacques-puree-de-celeri", "buche-roulee-au-chocolat", "magret-de-canard-a-l-orange", "verrines-avocat-crevettes", "salade-d-agrumes-et-grenade", "vin-chaud-sans-alcool", "chocolat-chaud-proteine"],
    produits: [
      { nom: "orange", x: 122, y: -2, taille: 112, angle: 6 },
      { nom: "graines-de-grenade", x: 42, y: 36, taille: 132, angle: -4 },
      { nom: "cerneaux-de-noix", x: 172, y: 92, taille: 76, angle: -8 },
      { nom: "anis-etoile", x: 8, y: 98, taille: 54, angle: 12 },
    ],
    motif: "guirlande", vapeur: false,
  },
];

/** L'image d'un produit de la nature morte. */
export const imageProduit = (nom: string) => `/saison/${nom}.webp`;

export type MomentActif = {
  moment: MomentSaison;
  /** Les recettes du moment qui conviennent au régime, dans l'ordre du rail. */
  recettes: Recipe[];
  /** Le dernier jour, compris. */
  fin: string;
  surtitre: string;
  /** La phrase entière : « Des soupes et des veloutés, jusqu’au 9 novembre. » */
  phrase: string;
};

const parId = new Map(RECIPES.map((r) => [r.id, r]));

/** Les recettes d'un moment qui conviennent au régime (une recette qui a
 *  quitté la banque disparaît sans rien casser). */
export function recettesDuMoment(m: MomentSaison, regime: DietKey[]): Recipe[] {
  return m.recettes.map((id) => parId.get(id)).filter((r): r is Recipe => !!r && convient(r, regime));
}

/** Le moment tel qu'il s'affiche pour l'année d'un jour, ou `null` s'il
 *  garde moins de `SEUIL_MOMENT` recettes pour ce régime. */
export function momentActif(m: MomentSaison, jour: string, regime: DietKey[]): MomentActif | null {
  const recettes = recettesDuMoment(m, regime);
  if (recettes.length < SEUIL_MOMENT) return null;
  const [, fin] = m.periode(Number(jour.slice(0, 4)));
  const date = jourEnLettres(fin);
  return {
    moment: m, recettes, fin,
    surtitre: m.surtitre,
    phrase: `${m.phrase}, jusqu’au ${date}.`,
  };
}

/** Le moment de ce jour (YYYY-MM-DD, heure du téléphone), ou `null` : entre
 *  deux moments, ou quand il manque des recettes pour ce régime. */
export function momentDuJour(jour: string, regime: DietKey[]): MomentActif | null {
  const annee = Number(jour.slice(0, 4));
  const m = MOMENTS_SAISON.find((x) => {
    const [debut, fin] = x.periode(annee);
    return debut <= jour && jour <= fin;
  });
  return m ? momentActif(m, jour, regime) : null;
}

/** Un moment montré hors de ses dates, pour l'aperçu de l'administration. */
export function apercuMoment(id: string, jour: string, regime: DietKey[]): MomentActif | null {
  const m = MOMENTS_SAISON.find((x) => x.id === id);
  return m ? momentActif(m, jour, regime) : null;
}
