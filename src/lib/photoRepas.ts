/* ════════════════════════════════════════════════════════════════════
   La photo d'un repas noté, quand on en a une qui dit VRAIMENT ce plat.

   La photo prise pour l'analyse n'est pas gardée (aucun stockage) : on
   montre donc la photo d'une recette Vaiiya quand le repas en EST une
   (même nom), sinon celle d'un plat de la même famille quand le nom le
   dit sans ambiguïté (« pizza », « burger », « crêpes »…).

   ⚠️ JAMAIS UNE PHOTO TROMPEUSE. Les photos d'ambiance des restaurants
   (`/nutrition/ambiances`) montrent une salle, pas une assiette : elles
   ne servent pas ici. Un nom qu'on ne reconnaît pas rend `null`, et
   l'écran pose une tuile neutre au lieu d'inventer un plat.
   ════════════════════════════════════════════════════════════════════ */

import { RECIPES } from "@/lib/recipeBank";

const net = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").replace(/\s+/g, " ").trim();

const PAR_NOM = new Map(RECIPES.map((r) => [net(r.nom), r.image]));

/* Un mot du nom → la photo d'une recette qui montre exactement ce plat.
   L'ordre compte : le premier qui correspond gagne. */
const FAMILLES: [RegExp, string][] = [
  [/\bpizza/, "/nutrition/ambiances/pizza.jpg"],
  [/\bburger|\bcheeseburger/, "/recipes/burger-maison-gourmand-equilibre.jpg"],
  [/\bbolo(gnaise)?\b/, "/recipes/pates-bolognaise-maison.jpg"],
  [/\bcesar\b/, "/recipes/salade-cesar-legere-et-croustillante.jpg"],
  [/\bnicoise\b/, "/recipes/salade-nicoise.jpg"],
  [/\bpoke\b/, "/recipes/poke-bowl-saumon-avocat.jpg"],
  [/\bwrap\b/, "/recipes/wrap-poulet-crudites-sauce-yaourt.jpg"],
  [/\bsandwich|\bpanini|\bjambon[ -]beurre/, "/nutrition/pouce.jpg"],
  [/\bcrepes?\b/, "/recipes/crepes-moelleuses.jpg"],
  [/\bpancakes?\b/, "/recipes/pancakes-proteines.jpg"],
  [/\bbrownie/, "/recipes/brownie-fondant-au-chocolat.jpg"],
  [/\bmuffins?\b/, "/recipes/muffins-chocolat-moelleux.jpg"],
  [/\brisotto/, "/recipes/risotto-cremeux-aux-champignons.jpg"],
  [/\bchili\b/, "/recipes/chili-con-carne.jpg"],
  [/\briz cantonais\b/, "/recipes/riz-cantonais-maison.jpg"],
  [/\bquesadillas?\b/, "/recipes/quesadillas-jambon-fromage.jpg"],
  [/\bcroque[ -]monsieur/, "/recipes/croque-monsieur-poulet-pesto-revisite.jpg"],
  [/\bfish (and|&|n) chips\b/, "/recipes/fish-chips-maison.jpg"],
  [/\bavocado toast|\btartine (d |a l )?avocat/, "/recipes/avocado-toast.jpg"],
  [/\bovernight oats?\b/, "/recipes/overnight-oats-chocolat-noisette.jpg"],
  [/\bsmoothie bowl\b/, "/recipes/smoothie-bowl-fruits-rouges.jpg"],
  [/\bshakshuka\b/, "/recipes/shakshuka-express.jpg"],
  [/\btajine\b/, "/recipes/tajine-d-agneau-aux-abricots-citron-confit-et-couscous.jpg"],
  [/\bmadeleines?\b/, "/recipes/madeleines-a-la-coque.jpg"],
  [/\bfinanciers?\b/, "/recipes/financiers-amande.jpg"],
  [/\bpain d epices\b/, "/recipes/pain-d-epices.jpg"],
  [/\briz au lait\b/, "/recipes/riz-au-lait-vanille.jpg"],
  [/\bmilk ?shake/, "/recipes/milkshake-vanille-fraise.jpg"],
  [/\bguacamole\b/, "/recipes/guacamole-nachos.jpg"],
  [/\btzatziki\b/, "/recipes/tzatziki-concombre-yaourt.jpg"],
  [/\bbruschetta/, "/recipes/bruschetta-tomate-basilic.jpg"],
];

/** La photo qui montre ce repas, ou `null` si on n'en a pas de juste. */
export function photoDuRepas(nom: string): string | null {
  const n = net(nom);
  if (!n) return null;
  const exacte = PAR_NOM.get(n);
  if (exacte) return exacte;
  for (const [motif, image] of FAMILLES) if (motif.test(n)) return image;
  return null;
}

/** Vrai si le repas porte exactement le nom d'une recette Vaiiya. */
export function estRecetteVaiiya(nom: string): boolean {
  return PAR_NOM.has(net(nom));
}
