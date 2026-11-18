/**
 * tableAliments.ts — les valeurs de référence des aliments courants.
 *
 * ⭐ LE MODÈLE ESTIME LES POIDS, LA TABLE DONNE LES VALEURS (2026-11-18).
 * Un modèle connaît à peu près les calories du riz, mais pas toujours
 * exactement : d'une photo à l'autre il écrivait 110, 130 ou 360 kcal pour
 * 100 g de riz (cuit ou cru, il confondait). La valeur pour 100 g d'un
 * aliment courant est un FAIT, pas une estimation : on la lit ici, et le
 * modèle n'a plus à fournir que ce qu'il est seul à pouvoir dire, le poids.
 *
 * Valeurs pour 100 g TELS QUE SERVIS (cuit quand ça se mange cuit), proches
 * de la table Ciqual. `piece` = poids d'une unité standard (un œuf, une
 * tranche), pour convertir « 2 œufs » en grammes. `max` = la plus grosse
 * portion plausible d'un seul élément dans une assiette : au-delà, c'est une
 * erreur d'échelle, pas un appétit.
 *
 * ⚠️ L'ORDRE COMPTE : les noms précis passent avant les noms généraux
 * (« patate douce » avant « pomme de terre », « poulet pané » avant
 * « poulet »), et un mot peut en contenir un autre (« bœuf » contient
 * « œuf ») : chaque motif pose ses bornes de mot.
 */

export type Reference = {
  nom: string;
  motif: RegExp;
  kcal: number;
  p: number;
  c: number;
  f: number;
  piece?: number;
  max?: number;
};

/** Minuscules, sans accents, « œ » défait, ponctuation en espaces. */
export function normaliserNom(s: string): string {
  return ` ${s
    .toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

/* Un nom qui dit une préparation ou un plat composé (frit, pané, en sauce,
   mousse, curry, sandwich…) ne se lit pas dans la table générale : « poulet
   pané » n'est pas du poulet, « mousse au chocolat » n'est pas du chocolat.
   Le modèle garde alors ses propres valeurs, sauf si une ligne est écrite
   POUR ce mot (« frites », « poulet pané », « sauce tomate »). */
const COMPOSE = / (frit|frite|frites|frits|pane|panee|panes|beignets?|tempura|gratine?e?s?|creme|carbonara|sauce|farcie?s?|confite?s?|caramelise?e?s?|mousse|gateaux?|fondant|brownies?|cookies?|glaces?|chaud|boissons?|cereales|muffins?|tartes?|tartelettes?|biscuits?|barres?|cake|crepes?|gaufres?|soupe|veloute|curry|tajine|risotto|paella|sandwichs?|burgers?|kebab|tacos|wraps?|smoothie|jus|milkshake|shake|bowl|salade de|cantonais|saute|sautes|au lait|lait de coco|d amande|de soja|vegetal) /;

const R = (nom: string, motif: RegExp, kcal: number, p: number, c: number, f: number, extra: { piece?: number; max?: number } = {}): Reference =>
  ({ nom, motif, kcal, p, c, f, ...extra });

/* Les motifs s'appliquent à un nom normalisé entouré d'espaces : « (^| ) »
   se dit simplement « » (une espace de chaque côté). */
export const REFERENCES: Reference[] = [
  // ── Préparations qui ont leur propre valeur (avant les ingrédients) ──
  R("frites", / frites? (de pommes? de terre )?| potatoes /, 290, 3.4, 37, 14, { max: 400 }),
  R("chips", / chips /, 540, 6, 50, 34, { max: 150 }),
  R("poulet pané", / (nuggets?|tenders?|poulet panee?|escalope panee?|cordon bleu) /, 260, 15, 17, 15, { piece: 20, max: 400 }),
  R("poisson pané", / (poisson pane|panes? de poisson|fish (and chips|stick)|batonnets? de poisson) /, 220, 13, 19, 10, { piece: 28, max: 350 }),
  R("purée", / puree( de pommes? de terre)? /, 90, 1.9, 13, 3.4, { max: 500 }),
  R("hachis parmentier", / hachis parmentier /, 140, 7.5, 10, 7.5, { max: 600 }),
  R("lasagnes", / lasagnes? /, 150, 7.5, 13, 7.5, { max: 600 }),
  R("pizza", / pizza /, 250, 11, 29, 9.5, { max: 900 }),
  R("quiche", / quiche /, 260, 9, 17, 17, { max: 400 }),
  R("croissant", / croissants? /, 410, 8, 45, 21, { piece: 60, max: 240 }),
  R("pain au chocolat", / (pains? au chocolat|chocolatines?) /, 420, 7.5, 46, 22, { piece: 65, max: 260 }),

  // ── Féculents (cuits) ──
  R("riz cuit", / riz /, 130, 2.7, 28, 0.3, { max: 700 }),
  R("pâtes cuites", / (pates|spaghettis?|tagliatelles?|penne|fusilli|macaronis?|coquillettes|linguine|farfalle|nouilles?) /, 150, 5.3, 30, 0.9, { max: 700 }),
  R("gnocchis", / gnocchis? /, 140, 3.3, 30, 0.6, { max: 500 }),
  R("quinoa cuit", / quinoa /, 120, 4.4, 21, 1.9, { max: 500 }),
  R("semoule cuite", / (semoule|couscous) /, 112, 3.8, 23, 0.2, { max: 500 }),
  R("boulgour cuit", / boulgour /, 83, 3.1, 19, 0.2, { max: 500 }),
  R("lentilles cuites", / lentilles? /, 116, 9, 20, 0.4, { max: 500 }),
  R("pois chiches", / pois chiches? /, 140, 7.5, 21, 2.6, { max: 400 }),
  R("haricots rouges", / haricots? (rouges?|noirs?) /, 110, 8.5, 15, 0.5, { max: 400 }),
  R("patate douce", / patates? douces? /, 90, 2, 20, 0.2, { max: 500 }),
  R("pomme de terre", / (pommes? de terre|patates?) /, 85, 2, 18, 0.1, { piece: 150, max: 600 }),
  R("pain de mie", / pain de mie /, 270, 8.5, 48, 4, { piece: 25, max: 250 }),
  R("baguette", / (baguette|pain(?! (d epices|perdu|aux raisins))) /, 270, 9, 55, 1.2, { piece: 40, max: 300 }),
  R("tortilla", / (tortillas?|wraps?|galette de ble) /, 310, 8.5, 52, 7.5, { piece: 60, max: 240 }),

  // ── Protéines (cuites) ──
  R("blanc de poulet", / (blanc de poulet|filet de poulet|poulet|dinde) /, 150, 29, 0, 3.5, { max: 450 }),
  R("cuisse de poulet", / (cuisses? de poulet|pilons?) /, 200, 26, 0, 10.5, { piece: 110, max: 450 }),
  R("steak haché", / steak hache /, 220, 26, 0, 13, { piece: 100, max: 400 }),
  R("bœuf", / (boeuf|steak|bavette|entrecote|rumsteck|faux filet) /, 190, 28, 0, 8.5, { max: 450 }),
  R("porc", / (porc|cote de porc|filet mignon|roti de porc) /, 210, 27, 0, 11, { max: 450 }),
  R("jambon", / jambon (blanc|cuit|de paris)? /, 115, 20, 1, 3.5, { piece: 40, max: 200 }),
  R("lardons", / lardons? /, 300, 15, 0.5, 27, { max: 150 }),
  R("saucisse", / (saucisses?|chipolatas?|merguez) /, 290, 14, 1.5, 25, { piece: 60, max: 360 }),
  R("saumon", / saumon /, 210, 23, 0, 13, { max: 400 }),
  R("thon", / thon /, 130, 28, 0, 1.5, { max: 300 }),
  R("poisson blanc", / (cabillaud|colin|merlu|lieu|dorade|bar|poisson blanc|filet de poisson) /, 100, 21, 0, 1.5, { max: 400 }),
  R("crevettes", / crevettes? /, 100, 22, 0, 1, { max: 300 }),
  R("œuf", / (oeufs?|omelette|oeufs? brouilles?|oeuf au plat) /, 150, 12.5, 0.7, 11, { piece: 55, max: 330 }),
  R("tofu", / tofu /, 140, 14, 2, 8.5, { max: 350 }),

  // ── Produits laitiers ──
  R("fromage râpé", / (fromage rape|emmental rape|gruyere rape|parmesan) /, 400, 28, 0, 31, { max: 80 }),
  R("mozzarella", / mozzarella /, 250, 18, 2, 19, { max: 250 }),
  R("feta", / feta /, 270, 16, 1, 22, { max: 150 }),
  R("fromage blanc", / fromage blanc /, 75, 7.5, 4, 3, { max: 500 }),
  R("fromage", / (fromage|emmental|comte|cheddar|camembert|brie|chevre|raclette) /, 370, 24, 0.5, 30, { max: 200 }),
  R("yaourt nature", / (yaourts?|yogourt|skyr) /, 60, 4.5, 5, 2.5, { piece: 125, max: 500 }),
  R("lait", / lait /, 47, 3.3, 4.8, 1.6, { max: 600 }),
  R("crème fraîche", / creme (fraiche|liquide|epaisse|entiere) /, 290, 2.5, 3, 30, { max: 120 }),
  R("beurre de cacahuète", / beurre de cacahuetes? /, 600, 25, 15, 50, { max: 60 }),
  R("beurre", / beurre /, 740, 0.7, 0.7, 82, { max: 40 }),

  // ── Matières grasses, sauces ──
  R("huile", / (huile|matiere grasse de cuisson|vinaigrette) /, 900, 0, 0, 100, { max: 40 }),
  R("mayonnaise", / mayo(nnaise)? /, 700, 1.5, 2, 76, { max: 60 }),
  R("ketchup", / ketchup /, 110, 1.3, 25, 0.3, { max: 60 }),
  R("sauce tomate", / sauce tomate /, 50, 1.5, 7, 1.5, { max: 250 }),
  R("pesto", / pesto /, 450, 5, 6, 45, { max: 60 }),
  R("houmous", / (houmous|hummus) /, 270, 7.5, 13, 21, { max: 150 }),

  // ── Légumes ──
  R("avocat", / avocats? /, 160, 2, 1.8, 15, { piece: 140, max: 300 }),
  R("salade verte", / (salade verte|laitue|roquette|mache|jeunes pousses|mesclun|epinards? frais) /, 15, 1.3, 1.5, 0.2, { max: 200 }),
  R("tomate", / (tomates?|tomates? cerises?) /, 18, 0.9, 3, 0.2, { piece: 120, max: 400 }),
  R("concombre", / concombres? /, 13, 0.7, 2, 0.1, { max: 300 }),
  R("carotte", / carottes? /, 35, 0.8, 7, 0.2, { piece: 90, max: 300 }),
  R("brocoli", / (brocolis?|chou fleur) /, 30, 2.8, 3, 0.4, { max: 400 }),
  R("haricots verts", / haricots? verts? /, 30, 2, 4.5, 0.2, { max: 400 }),
  R("courgette", / courgettes? /, 18, 1.3, 2.5, 0.3, { max: 400 }),
  R("poivron", / poivrons? /, 28, 1, 5, 0.3, { max: 300 }),
  R("champignons", / champignons? /, 25, 3, 1.5, 0.4, { max: 300 }),
  R("oignon", / oignons? /, 40, 1.2, 8, 0.2, { max: 200 }),
  R("maïs", / mais /, 95, 3, 18, 1.2, { max: 250 }),
  R("petits pois", / petits pois /, 80, 5.5, 12, 0.4, { max: 300 }),
  R("épinards cuits", / epinards? /, 25, 3, 1, 0.4, { max: 300 }),
  R("légumes", / (legumes?|ratatouille|poelee de legumes) /, 40, 1.5, 6, 1, { max: 500 }),

  // ── Fruits, sucré ──
  R("banane", / bananes? /, 90, 1.1, 20, 0.3, { piece: 120, max: 360 }),
  R("pomme", / pommes? /, 54, 0.3, 12, 0.2, { piece: 150, max: 450 }),
  R("orange", / (oranges?|clementines?|mandarines?) /, 45, 0.9, 9, 0.2, { piece: 130, max: 400 }),
  R("fruits rouges", / (fraises?|framboises?|myrtilles?|fruits rouges) /, 40, 0.9, 7, 0.4, { max: 300 }),
  R("raisin", / raisins? /, 70, 0.6, 16, 0.2, { max: 300 }),
  R("flocons d'avoine", / (flocons? d avoine|porridge|avoine) /, 370, 13, 60, 7, { max: 150 }),
  R("chocolat", / chocolat /, 540, 6.5, 50, 33, { piece: 10, max: 150 }),
  R("miel", / miel /, 320, 0.4, 80, 0, { max: 50 }),
  R("confiture", / confitures? /, 250, 0.4, 60, 0.1, { max: 60 }),
  R("sucre", / sucre /, 400, 0, 100, 0, { piece: 5, max: 50 }),
  R("amandes", / (amandes?|noix|noisettes?|cacahuetes?|oleagineux) /, 600, 20, 12, 52, { max: 80 }),
];

/**
 * La référence d'un aliment nommé par le modèle, ou `null` si le nom n'est
 * pas un aliment courant de la table (un plat composé, une préparation, une
 * marque) : le modèle garde alors ses propres valeurs.
 */
export function referenceDe(nom: string): Reference | null {
  const n = normaliserNom(nom);
  for (const r of REFERENCES) {
    if (!r.motif.test(n)) continue;
    const compose = n.match(COMPOSE);
    if (compose) {
      /* Le mot qui fait du nom une préparation doit être écrit dans la
         ligne elle-même (« frite » pour les frites, « sauce » pour la sauce
         tomate). Sinon on ne sait pas, et on ne prétend pas savoir. */
      const racine = compose[1].replace(/(es|e|s)$/, "");
      if (!r.motif.source.includes(racine)) return null;
    }
    return r;
  }
  return null;
}
