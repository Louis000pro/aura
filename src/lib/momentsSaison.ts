/* ════════════════════════════════════════════════════════════════════
   Les moments de l'année sur l'écran Nutrition (Louis, 2026-10-24 :
   maquette « La saison », piste A, puis « La saison, en décor »,
   niveau 2, en clair et en sombre).

   Un moment, c'est une affiche entre « Une idée » et « Trouver une
   recette » : un mot géant, quatre ou cinq produits de la saison, une
   phrase, et ses recettes, toutes déjà dans la banque. Ce fichier est PUR
   (aucune lecture, aucune horloge) : on lui donne le jour, il rend le
   moment.

   ⚠️ UN SEUL MOMENT À LA FOIS, AUX MÊMES DATES CHAQUE ANNÉE. Pâques est
   le seul qui bouge : il se calcule (`dimancheDePaques`). Entre deux
   moments, rien ne s'affiche et l'écran reste celui de tous les jours :
   aucun moment ne comble un vide.

   ⚠️ UN MOMENT NE S'AFFICHE QU'AVEC AU MOINS 4 RECETTES POUR LE RÉGIME
   DE LA PERSONNE (`SEUIL_MOMENT`). En végan, les agrumes n'en gardent
   que trois et les gratins aucune : ils ne s'affichent pas. Une affiche
   de deux recettes ferait un trou, pas une saison.

   Ajouter un moment, c'est une entrée ici (deux dates, des recettes de la
   banque, quatre ou cinq produits de `public/saison/`, son motif) et sa
   lumière dans `AfficheSaison.module.css`, en clair et en sombre, avec
   les couleurs de son motif. `check:nutrition` refuse un moment à qui il
   manque sa lumière ou une couleur de son motif, dans l'un des deux
   thèmes.
   ════════════════════════════════════════════════════════════════════ */

import { RECIPES, type DietKey, type Recipe } from "@/lib/recipeBank";
import { convient } from "@/lib/collectionsRecettes";

export const SEUIL_MOMENT = 4;

export type IdMoment =
  | "agrumes" | "crepes" | "matins-hiver" | "paques" | "salades" | "barbecue"
  | "glaces" | "rentree" | "soupes" | "gratins" | "mijote" | "fetes";

/** Le décor de l'affiche, un par moment : ce qui tombe, s'envole, tourne
 *  ou scintille derrière le texte et les photos (le cahier, lui, ne bouge
 *  pas). Chaque motif se dessine dans `AfficheSaison.tsx`. */
export type MotifSaison =
  | "tranche" | "crepe" | "neige" | "petales" | "aigrettes" | "braises"
  | "soleil" | "cahier" | "feuilles" | "pluie" | "givre" | "guirlande";

/** Ce que l'affiche dessine pour un produit : le carré de sa vignette, sa
 *  place et sa taille en pixels dans la boîte de la nature morte
 *  (`NATURE_MORTE`). Le premier de la liste est au fond. */
export type ProduitSaison = { nom: string; x: number; y: number; taille: number };

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

/* ── La nature morte ──────────────────────────────────────────────────

   Une boîte de 340 × 172, calée sur le bord droit de l'affiche (donc sur
   le bord de l'écran, sur un téléphone) et posée DERRIÈRE le mot : le mot
   commence à 144 px du haut de la boîte, et le haut de ses minuscules
   tombe vers 163 px. Tous les produits se posent sur une même ligne
   (`NATURE_MORTE.sol`), que les minuscules cachent. La boîte vit aussi
   dans `.nature` du module CSS, et `check:nutrition` vérifie qu'ils
   disent la même chose.

   ⚠️ UN PRODUIT SE PLACE PAR CE QU'ON VOIT DE LUI, jamais par le carré de
   sa vignette : chaque image a sa propre marge transparente (le lait est
   un carton étroit au milieu de son carré, les œufs en chocolat une bande
   basse). `VISIBLE` donne la partie visible de chaque vignette, et
   `check:nutrition` la remesure sur les fichiers de `public/saison/`.

   Le gabarit : un petit produit à gauche, un moyen, le héros (le plus
   haut, vers les deux tiers de la largeur), puis un dernier, plus bas, à
   droite. Les Soupes laissent leur gauche à la vapeur. Rien ne pivote, et
   rien ne s'approche à moins de 8 px des bords de la boîte. */

export const NATURE_MORTE = { largeur: 340, hauteur: 172, sol: 168, marge: 8 } as const;

/** La partie visible de chaque vignette (alpha au-dessus de 25 sur 255),
 *  en fractions de son côté : [gauche, haut, droite, bas]. */
export const VISIBLE: Record<string, readonly [number, number, number, number]> = {
  "anis-etoile": [0, 0.0778, 0.9889, 0.9917],
  "avocat": [0.025, 0.0278, 0.9778, 0.9389],
  "cannelle": [0.0833, 0.1361, 0.9056, 0.8056],
  "caramels": [0.0806, 0.2528, 0.9028, 0.8361],
  "carotte": [0.025, 0.2278, 0.9806, 0.7833],
  "cerneaux-de-noix": [0.0278, 0.1389, 0.9278, 0.8389],
  "champignons": [0.075, 0.0667, 0.9194, 0.9389],
  "citron-jaune": [0.0111, 0.1028, 0.9861, 0.8944],
  "citron-vert": [0.0222, 0.0472, 0.9333, 0.9722],
  "concombre": [0.05, 0.175, 0.9639, 0.8556],
  "emmental": [0.1917, 0.1222, 0.7639, 0.9083],
  "figues": [0.0028, 0.0972, 1, 0.9028],
  "fraises": [0.0639, 0.0778, 0.9361, 0.8944],
  "framboise": [0, 0.0917, 1, 0.9083],
  "graines-de-grenade": [0.0889, 0.1861, 0.8972, 0.7583],
  "lait": [0.3111, 0.0139, 0.6861, 0.9861],
  "laitue": [0.0028, 0.15, 0.9778, 0.925],
  "mangue": [0.0278, 0.0861, 0.9611, 0.8889],
  "menthe-fraiche": [0.1056, 0.0167, 0.8944, 0.9722],
  "navet": [0.0556, 0.1694, 0.9417, 0.8417],
  "noisettes": [0, 0.0194, 1, 0.975],
  "oeuf": [0.2056, 0.0833, 0.8083, 0.9222],
  "oeufs-chocolat": [0, 0.2472, 1, 0.7528],
  "oignon-rouge": [0.0389, 0.0361, 0.9667, 0.9611],
  "oignon": [0.0639, 0.0556, 0.9333, 0.9389],
  "orange": [0.0028, 0.0472, 0.9944, 0.9083],
  "pamplemousse-rose": [0.0667, 0.2194, 0.95, 0.7444],
  "pepites-chocolat": [0.025, 0.2306, 0.9806, 0.8167],
  "poire": [0.1861, 0.0139, 0.8139, 0.9861],
  "poireau": [0.0556, 0.0472, 0.9222, 0.9778],
  "poivron-jaune": [0.0056, 0.0833, 0.9944, 0.9167],
  "poivron-rouge": [0.0361, 0.1639, 0.95, 0.85],
  "pomme-de-terre": [0.0222, 0.2194, 0.9778, 0.7778],
  "pomme": [0.0111, 0.2194, 0.9833, 0.7917],
  "pommes-rouges": [0.05, 0.0917, 0.95, 0.9111],
  "potimarron": [0, 0.0917, 1, 0.9083],
  "radis": [0.0694, 0.175, 0.9333, 0.7972],
  "tete-d-ail": [0.125, 0.0611, 0.875, 0.8944],
  "thym": [0.1583, 0.0194, 0.8444, 0.9806],
  "tomate": [0.0361, 0.0556, 0.9639, 0.9444],
  "tomates-cerises": [0.05, 0.2111, 0.95, 0.7444],
};

/** Un produit tel qu'on le compose : son centre `cx`, et sa hauteur `h` ou
 *  sa largeur `w`, en pixels VISIBLES dans la boîte. `devant` le pose de
 *  quelques pixels sous la ligne commune, au premier plan. */
type PoseProduit = { nom: string; cx: number; devant?: number } & ({ h: number } | { w: number });

/** Le carré de la vignette qui montre ce qu'on veut voir. Une vignette sans
 *  mesure se pose comme un carré plein, et `check:nutrition` la refuse. */
export function poser(p: PoseProduit): ProduitSaison {
  const [x0, y0, x1, y1] = VISIBLE[p.nom] ?? [0, 0, 1, 1];
  const taille = "h" in p ? p.h / (y1 - y0) : p.w / (x1 - x0);
  const sol = NATURE_MORTE.sol + (p.devant ?? 0);
  return { nom: p.nom, x: p.cx - (taille * (x0 + x1)) / 2, y: sol - taille * y1, taille };
}

const nature = (poses: PoseProduit[]) => poses.map(poser);

/* Les douze moments, dans l'ordre de l'année, chacun avec son motif
   (maquettes « La saison, en décor » et « Les huit autres moments »,
   validées par Louis le 2026-10-24). */
export const MOMENTS_SAISON: MomentSaison[] = [
  {
    id: "agrumes", titre: "Agrumes", surtitre: "C’est l’hiver",
    phrase: "Des recettes aux agrumes",
    demande: "Tu as une autre idée de recette aux agrumes ?",
    periode: fixe(1, 1, 1, 19),
    recettes: ["salade-d-agrumes-et-grenade", "bowl-de-skyr-kiwi-et-clementine", "magret-de-canard-a-l-orange", "verrines-avocat-crevettes", "vin-chaud-sans-alcool", "poulet-au-citron-et-aux-olives", "tartare-de-saumon-aux-agrumes", "salade-de-fenouil-a-l-orange-et-aux-olives", "gateau-moelleux-a-l-orange-et-aux-amandes", "crepes-suzette-sans-alcool", "tarte-au-citron-meringuee"],
    produits: nature([
      { nom: "pamplemousse-rose", cx: 128, w: 140 },
      { nom: "orange", cx: 232, h: 132 },
      { nom: "citron-jaune", cx: 56, w: 84, devant: 4 },
      { nom: "citron-vert", cx: 296, h: 70, devant: 4 },
    ]),
    motif: "tranche", vapeur: false,
  },
  {
    id: "crepes", titre: "Crêpes", surtitre: "Pour la Chandeleur",
    phrase: "Des crêpes, des galettes et des pancakes",
    demande: "Tu as une autre idée de crêpes ou de pancakes ?",
    periode: fixe(1, 20, 2, 2),
    recettes: ["crepes-moelleuses", "crepes-suzette-sans-alcool", "galettes-de-sarrasin-completes", "galettes-de-sarrasin-poireaux-et-chevre", "crepes-au-jambon-gratinees", "galette-saucisse", "crepes-aux-epinards-et-a-la-ricotta", "galettes-au-saumon-fume-et-creme-a-l-aneth", "crepes-aux-pommes-et-caramel-au-beurre-sale", "gateau-de-crepes-au-chocolat", "crepes-vegetales-aux-poires-et-au-sirop-d-erable", "crepes-proteinees-au-skyr", "pancakes-proteines"],
    produits: nature([
      { nom: "lait", cx: 220, h: 150 },
      { nom: "caramels", cx: 106, w: 90, devant: 2 },
      { nom: "oeuf", cx: 166, h: 74, devant: 2 },
      { nom: "citron-jaune", cx: 288, w: 88, devant: 4 },
    ]),
    motif: "crepe", vapeur: false,
  },
  {
    id: "matins-hiver", titre: "Matins d’hiver", surtitre: "C’est l’hiver",
    phrase: "Des petits-déjeuners pour les matins froids",
    demande: "Tu as une autre idée de petit-déjeuner chaud pour l’hiver ?",
    periode: (a) => [iso(a, 2, 3), iso(a, 2, finFevrier(a))],
    recettes: ["porridge-poire-cannelle", "chocolat-chaud-proteine", "pain-perdu-proteine-a-la-cannelle", "oeufs-cocotte-epinards-jambon", "granola-maison-pomme-cannelle", "bowl-de-skyr-kiwi-et-clementine", "golden-latte-au-curcuma", "porridge-de-quinoa-pomme-cannelle", "oeufs-brouilles-au-saumon-fume-et-a-l-avocat", "banana-bread-aux-noix", "chai-latte-maison", "bowl-cake-pomme-cannelle", "omelette-aux-blancs-d-oeufs-epinards-et-feta"],
    produits: nature([
      { nom: "lait", cx: 250, h: 150 },
      { nom: "poire", cx: 196, h: 118 },
      { nom: "pomme", cx: 124, w: 120, devant: 2 },
      { nom: "cannelle", cx: 56, w: 84, devant: 4 },
      { nom: "cerneaux-de-noix", cx: 294, w: 74, devant: 4 },
    ]),
    motif: "neige", vapeur: false,
  },
  {
    id: "paques", titre: "Pâques", surtitre: "C’est le printemps",
    phrase: "Des recettes au chocolat",
    demande: "Tu as une autre idée de dessert au chocolat pour Pâques ?",
    periode: (a) => { const p = dimancheDePaques(a); return [decaler(p, -13), p]; },
    recettes: ["brookie-fondant", "brownie-fondant-au-chocolat", "muffins-chocolat-moelleux", "mugcake-banane-cacao", "energy-balls-chocolat-amande", "barres-proteinees-maison-chocolat-cacahuete", "cookies-proteines-aux-pepites-de-chocolat", "mousse-au-chocolat-proteinee", "gateau-de-crepes-au-chocolat", "fondant-au-chocolat-coeur-coulant", "nids-de-paques-au-chocolat"],
    produits: nature([
      { nom: "oeuf", cx: 44, h: 80 },
      { nom: "oeufs-chocolat", cx: 198, w: 204 },
      { nom: "pepites-chocolat", cx: 98, w: 86, devant: 6 },
      { nom: "noisettes", cx: 298, h: 58, devant: 4 },
    ]),
    motif: "petales", vapeur: false,
  },
  {
    id: "salades", titre: "Salades", surtitre: "Les beaux jours",
    phrase: "Des salades et des plats frais",
    demande: "Tu as une autre idée de salade fraîche ?",
    periode: fixe(6, 1, 6, 30),
    recettes: ["salade-de-pates-estivale-a-la-feta", "salade-de-pates-d-ete", "fusilli-mediterraneens", "salade-nicoise", "panzanella-toscane", "tartare-tomates-burrata", "salade-cesar-legere-et-croustillante", "taboule-libanais", "salade-grecque", "salade-de-pasteque-feta-et-menthe", "salade-de-riz-au-thon-et-au-mais", "salade-de-quinoa-pois-chiches-et-legumes-croquants"],
    produits: nature([
      { nom: "concombre", cx: 124, w: 120 },
      { nom: "laitue", cx: 222, w: 160 },
      { nom: "radis", cx: 60, w: 90, devant: 4 },
      { nom: "tomate", cx: 288, h: 84, devant: 4 },
    ]),
    motif: "aigrettes", vapeur: false,
  },
  {
    id: "barbecue", titre: "Barbecue", surtitre: "C’est l’été",
    phrase: "Des recettes pour le barbecue",
    demande: "Tu as une autre idée de recette pour le barbecue ?",
    periode: fixe(7, 1, 7, 20),
    recettes: ["brochettes-halloumi-legumes", "brochettes-boeuf-poivron-oignon", "gambas-grillees-ail-persil", "poisson-entier-a-la-plancha", "burger-maison-gourmand-equilibre", "coleslaw-maison", "brochettes-de-poulet-citron-paprika", "brochettes-de-legumes-et-tofu-marine", "epis-de-mais-grilles-au-beurre-et-au-paprika", "salade-de-pommes-de-terre-a-la-moutarde", "cotelettes-d-agneau-grillees-au-romarin", "aubergines-grillees-au-yaourt-et-a-la-menthe"],
    produits: nature([
      { nom: "poivron-rouge", cx: 204, w: 148 },
      { nom: "poivron-jaune", cx: 112, h: 86, devant: 2 },
      { nom: "citron-vert", cx: 44, h: 60, devant: 4 },
      { nom: "oignon-rouge", cx: 292, h: 78, devant: 4 },
    ]),
    motif: "braises", vapeur: false,
  },
  {
    id: "glaces", titre: "Glaces", surtitre: "C’est l’été",
    phrase: "Des sorbets, des esquimaux et des granités",
    demande: "Tu as une autre idée de glace ou de sorbet maison ?",
    periode: fixe(7, 21, 8, 31),
    recettes: ["batonnets-glaces-smoothie-mangue-passion", "granite-citron-menthe", "creme-glacee-vanille-maison", "sorbet-framboise-minute", "esquimaux-yaourt-fruits-rouges", "frozen-yogurt-fruits-rouges", "nice-cream-banane", "semifreddo-amande", "banana-split", "cheesecake-glace-sans-cuisson", "glace-proteinee-au-chocolat"],
    produits: nature([
      { nom: "menthe-fraiche", cx: 262, h: 104 },
      { nom: "mangue", cx: 204, w: 140 },
      { nom: "fraises", cx: 118, h: 90, devant: 2 },
      { nom: "citron-jaune", cx: 54, w: 78, devant: 4 },
      { nom: "framboise", cx: 290, w: 84, devant: 4 },
    ]),
    motif: "soleil", vapeur: false,
  },
  {
    id: "rentree", titre: "Rentrée", surtitre: "C’est la rentrée",
    phrase: "Des repas faciles à emporter",
    demande: "Tu as une autre idée de repas facile à emporter ?",
    periode: fixe(9, 1, 9, 30),
    recettes: ["wrap-poulet-crudites-sauce-yaourt", "bowl-mexicain-poulet-mais-haricots-noirs", "buddha-bowl-pois-chiches-rotis-houmous", "bowl-de-poulet-quinoa-et-avocat", "quesadillas-jambon-fromage", "muffins-sales-epinards-feta-tomates-sechees", "overnight-oats-chocolat-noisette", "meal-prep-poulet-riz-et-brocoli", "spaghetti-aux-boulettes-de-dinde", "salade-de-riz-au-thon-et-au-mais", "salade-de-quinoa-pois-chiches-et-legumes-croquants", "frittata-aux-legumes"],
    produits: nature([
      { nom: "pommes-rouges", cx: 218, h: 128 },
      { nom: "figues", cx: 132, w: 118, devant: 2 },
      { nom: "tomates-cerises", cx: 62, w: 96, devant: 4 },
      { nom: "avocat", cx: 286, h: 88, devant: 4 },
    ]),
    motif: "cahier", vapeur: false,
  },
  {
    id: "soupes", titre: "Soupes", surtitre: "C’est l’automne",
    phrase: "Des soupes et des veloutés",
    demande: "Tu as une autre idée de soupe ou de velouté ?",
    periode: fixe(10, 20, 11, 9),
    recettes: ["veloute-de-potimarron-et-chataignes", "minestrone-d-hiver", "harira-aux-lentilles-et-pois-chiches", "pho-au-boeuf", "ramen-au-poulet-et-oeuf-mollet", "veloute-de-carottes", "soupe-poireaux-pommes-de-terre", "soupe-de-pois-casses", "veloute-de-champignons", "soupe-thaie-au-poulet-et-au-lait-de-coco", "veloute-de-chou-fleur-au-curry-et-lait-de-coco"],
    produits: nature([
      { nom: "poireau", cx: 214, h: 150 },
      { nom: "potimarron", cx: 246, w: 146, devant: 2 },
      { nom: "carotte", cx: 190, w: 110, devant: 4 },
      { nom: "navet", cx: 288, h: 66, devant: 6 },
    ]),
    motif: "feuilles", vapeur: true,
  },
  {
    id: "gratins", titre: "Gratins", surtitre: "C’est l’automne",
    phrase: "Des plats qui gratinent au four",
    demande: "Tu as une autre idée de gratin ?",
    periode: fixe(11, 10, 11, 30),
    recettes: ["gratin-de-chou-fleur", "tartiflette-allegee", "lasagnes-epinards-ricotta", "endives-au-jambon-gratinees", "hachis-parmentier-a-la-patate-douce", "soupe-a-l-oignon-gratinee", "gratin-dauphinois-leger", "parmentier-vegetarien-aux-lentilles", "brandade-de-cabillaud-gratinee", "gratin-de-pates-au-poulet-et-au-brocoli", "crepes-au-jambon-gratinees", "gratin-de-butternut-au-lait-de-coco-et-aux-noisettes"],
    produits: nature([
      { nom: "emmental", cx: 244, h: 128 },
      { nom: "pomme-de-terre", cx: 150, w: 150, devant: 2 },
      { nom: "oignon", cx: 56, h: 84, devant: 4 },
      { nom: "tete-d-ail", cx: 296, h: 78, devant: 4 },
    ]),
    motif: "pluie", vapeur: false,
  },
  {
    id: "mijote", titre: "Mijoté", surtitre: "Les premiers froids",
    phrase: "Des plats qui mijotent longtemps",
    demande: "Tu as une autre idée de plat mijoté ?",
    periode: fixe(12, 1, 12, 14),
    recettes: ["pot-au-feu", "boeuf-bourguignon", "blanquette-de-veau-legere", "petit-sale-aux-lentilles", "mafe-de-poulet", "poulet-tikka-masala", "chili-con-carne", "chili-sin-carne", "tajine-d-agneau-aux-abricots-citron-confit-et-couscous", "bourguignon-de-champignons", "curry-de-pois-chiches-et-patate-douce", "haricots-blancs-mijotes-a-la-tomate-et-au-romarin", "coq-au-vin", "poulet-au-citron-et-aux-olives"],
    produits: nature([
      { nom: "thym", cx: 210, h: 140 },
      { nom: "champignons", cx: 134, h: 104, devant: 2 },
      { nom: "oignon", cx: 56, h: 82, devant: 4 },
      { nom: "carotte", cx: 262, w: 136, devant: 4 },
    ]),
    motif: "givre", vapeur: false,
  },
  {
    id: "fetes", titre: "Fêtes", surtitre: "Le temps des fêtes",
    phrase: "De l’entrée à la bûche",
    demande: "Tu as une autre idée de recette pour les fêtes ?",
    periode: fixe(12, 15, 12, 31),
    recettes: ["blinis-au-saumon-fume", "noix-de-saint-jacques-puree-de-celeri", "buche-roulee-au-chocolat", "magret-de-canard-a-l-orange", "verrines-avocat-crevettes", "salade-d-agrumes-et-grenade", "vin-chaud-sans-alcool", "chocolat-chaud-proteine", "roti-de-dinde-aux-marrons", "tartare-de-saumon-aux-agrumes", "truffes-au-chocolat-noir", "gateau-a-la-creme-de-marrons", "potimarron-farci-au-quinoa-et-aux-chataignes"],
    produits: nature([
      { nom: "orange", cx: 226, h: 128 },
      { nom: "graines-de-grenade", cx: 124, w: 130, devant: 2 },
      { nom: "anis-etoile", cx: 48, w: 62, devant: 4 },
      { nom: "cerneaux-de-noix", cx: 294, w: 76, devant: 4 },
    ]),
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
