/* ════════════════════════════════════════════════════════════════════
   vignettesRecettes — la vignette d'un ingrédient ou d'un ustensile de
   recette. Une seule règle pour toute l'app.

   Les images viennent de scripts/build-vignettes.mjs (`npm run vignettes`) :
   des emojis Fluent de Microsoft (licence MIT) et nos propres dessins dans
   le même style. Plus aucune image de TheMealDB.

   Un nom se lit sans accents et en minuscules (`slugify`), puis passe par
   des règles dans l'ORDRE : les noms composés d'abord, parce qu'ils
   contiennent le nom d'un autre ingrédient (« poireau » contient « poire »,
   « vinaigre de vin rouge » contient « vin rouge », « noix de coco »
   contient « noix »). La première règle qui reconnaît le nom gagne.

   Ajouter un ingrédient à la banque : s'il ne passe par aucune règle,
   `npm run check:vignettes` échoue. On ajoute alors une règle ici et, s'il
   le faut, un dessin dans scripts/vignettes/dessins/.
   ════════════════════════════════════════════════════════════════════ */

import { slugify } from "@/lib/recipeBank";

type Regle = [RegExp, string];

const INGREDIENTS: Regle[] = [
  // Préparations : leur nom contient celui d'un autre ingrédient.
  [/bouillon/, "bouillon"],
  [/saint-jacques/, "saint-jacques"],
  [/noix-de-coco|lait-de-coco|huile-de-coco|creme-de-coco/, "noix-de-coco"],
  [/muscade/, "muscade"],
  [/lait-de-soja|lait-d-avoine|lait-d-amande|lait-vegetal|boisson-vegetale/, "lait-vegetal"],
  [/pousses-de-soja/, "pousses-soja"],
  [/sauce-soja/, "sauce-soja"],
  [/nuoc-mam|sauce-poisson/, "sauce-poisson"],
  [/beurre-de-cacahuete/, "beurre-cacahuete"],
  [/beurre-d-amande/, "amande"],
  [/puree-de-noisette/, "puree-noisette"],
  [/creme-de-marron/, "chataigne"],
  [/pate-de-curry/, "pate-curry"],
  [/pate-(feuilletee|sablee|brisee)|pate-a-tarte/, "pate-tarte"],
  [/sauce-chocolat/, "sauce-chocolat"],
  [/caramel/, "caramel"],
  [/pepites-de-chocolat/, "pepites-chocolat"],
  [/oeufs?-en-chocolat/, "oeufs-chocolat"],
  [/proteine.*chocolat/, "proteine-chocolat"],
  [/proteine/, "proteine-vanille"],
  [/tomates?-cerises?/, "tomates-cerises"],
  [/sucre-glace/, "sucre"],
  [/glacons?$/, "glacons"],
  [/(^|-)glaces?(-|$)/, "glace"],
  [/coulis-de-fraise/, "fraise"],
  [/citron-vert/, "citron-vert"],
  [/jus-de-raisin/, "raisin"],
  [/vinaigre/, "vinaigre"],
  [/farine/, "farine"],
  [/fecule|maizena|amidon/, "fecule"],
  [/petales-de-mais|cereales/, "cereales"],
  [/chips/, "chips-mais"],
  [/nouilles-de-riz|vermicelle/, "nouilles-riz"],
  [/galette-de-riz/, "galette-riz"],
  [/galette-de-ble|tortilla|wrap/, "tortilla"],
  [/compote/, "compote"],
  [/confiture/, "confiture"],
  [/coriandre-et-menthe/, "herbes"],
  [/piment-doux|paprika|piment-d-espelette/, "epice-rouge"],
  [/melange-d-epices|quatre-epices/, "epices"],

  // Crèmerie et œufs
  [/chantilly/, "chantilly"],
  [/creme-liquide/, "creme-liquide"],
  [/(^|-)creme(-|$)/, "creme"],
  [/fromage-blanc|skyr|yaourt/, "yaourt"],
  [/ricotta|mascarpone|fromage-frais/, "fromage-frais"],
  [/chevre/, "chevre"],
  [/reblochon/, "reblochon"],
  [/feta|halloumi/, "feta"],
  [/mozzarella|burrata/, "mozzarella"],
  [/parmesan/, "parmesan"],
  [/(emmental|comte|gruyere|fromage)-rape/, "fromage-rape"],
  [/emmental|comte|gruyere|cheddar|fromage/, "fromage"],
  [/jaune-d-oeuf|blanc-d-oeuf/, "oeuf-casse"],
  [/(^|-)oeufs?(-|$)/, "oeuf"],
  [/beurre/, "beurre"],
  [/(^|-)lait(-|$)/, "lait"],

  // Boissons
  [/eau-gazeuse/, "eau-gazeuse"],
  [/^eau(-|$)/, "eau"],
  [/cafe/, "cafe"],
  [/^the(-|$)/, "the"],
  [/vin-blanc/, "vin-blanc"],
  [/vin-rouge/, "vin-rouge"],

  // Épicerie salée
  [/^sel(-|$)|fleur-de-sel/, "sel"],
  [/poivre/, "poivre"],
  [/huile-d-olive/, "huile-olive"],
  [/huile/, "huile"],
  [/moutarde/, "moutarde"],
  [/mayonnaise/, "mayonnaise"],
  [/pesto/, "pesto"],
  [/tahini/, "tahini"],
  [/houmous|hummus/, "houmous"],
  [/tomates?-concassees?|pulpe-de-tomate|concentre-de-tomate|coulis-de-tomate|sauce-tomate/, "conserve-tomate"],
  [/thon/, "thon"],

  // Épices et aromates
  [/cumin|garam-masala/, "epice-brune"],
  [/curcuma|curry/, "epice-jaune"],
  [/cannelle/, "cannelle"],
  [/vanille/, "vanille"],
  [/anis/, "anis-etoile"],
  [/girofle/, "girofle"],
  [/cardamome/, "cardamome"],
  [/gingembre/, "gingembre"],
  [/^ail(-|$)/, "ail"],
  [/persil/, "persil"],
  [/coriandre/, "coriandre"],
  [/basilic/, "basilic"],
  [/menthe/, "menthe"],
  [/thym/, "thym"],
  [/romarin/, "romarin"],
  [/aneth/, "aneth"],
  [/ciboulette/, "ciboulette"],
  [/sauge/, "sauge"],
  [/laurier/, "laurier"],
  [/citronnelle/, "citronnelle"],
  [/origan|herbes/, "herbes-sechees"],
  [/flocons-de-piment|piment/, "piment"],

  // Sucré
  [/cacao/, "cacao"],
  [/sucre-roux|sucre-complet|cassonade|vergeoise/, "sucre-roux"],
  [/sucre/, "sucre"],
  [/miel/, "miel"],
  [/sirop-d-erable/, "sirop-erable"],
  [/sirop/, "sirop"],
  [/chocolat/, "chocolat"],
  [/levure/, "levure"],
  [/gelatine/, "gelatine"],
  [/biscuits?-a-la-cuillere|boudoir/, "boudoir"],
  [/gaufrette/, "gaufrette"],
  [/biscuit/, "biscuit"],

  // Céréales, pâtes, pains
  [/flocons?-d-avoine|avoine/, "flocons-avoine"],
  [/granola|muesli/, "granola"],
  [/quinoa/, "quinoa"],
  [/boulgour|semoule|couscous/, "semoule"],
  [/riz/, "riz"],
  [/nouilles|ramen/, "ramen"],
  [/spaghetti/, "spaghetti"],
  [/tagliatelle/, "tagliatelles"],
  [/lasagne/, "lasagnes"],
  [/gnocchi/, "gnocchis"],
  [/^pates|rigatoni|fusilli|penne|macaroni/, "pates"],
  [/pain-a-burger|pain-burger/, "pain-burger"],
  [/pain/, "pain"],

  // Légumineuses, graines et fruits secs
  [/lentilles?-corail/, "lentilles-corail"],
  [/lentille/, "lentilles-vertes"],
  [/pois-casses/, "pois-casses"],
  [/pois-chiche/, "pois-chiches"],
  [/petits-pois|edamame/, "petits-pois"],
  [/haricots?-verts?/, "haricots-verts"],
  [/haricots?-blancs?/, "haricots-blancs"],
  [/haricots?-noirs?/, "haricots-noirs"],
  [/haricot/, "haricots-rouges"],
  [/tofu/, "tofu"],
  [/chia/, "graines-chia"],
  [/sesame/, "sesame"],
  [/grenade/, "grenade"],
  [/amande/, "amande"],
  [/noisette/, "noisette"],
  [/noix|cerneaux/, "noix"],
  [/cacahuete/, "cacahuete"],
  [/chataigne|(^|-)marrons?(-|$)/, "chataigne"],

  // Fruits
  [/pamplemousse/, "pamplemousse"],
  [/clementine|mandarine|orange/, "orange"],
  [/citron/, "citron"],
  [/banane/, "banane"],
  [/pomme-de-terre|grenaille/, "pomme-de-terre"],
  [/pomme/, "pomme"],
  [/poireau/, "poireau"],
  [/poire/, "poire"],
  [/peche/, "peche"],
  [/abricot/, "abricots-secs"],
  [/mangue/, "mangue"],
  [/kiwi/, "kiwi"],
  [/fruits-rouges/, "fruits-rouges"],
  [/fraise/, "fraise"],
  [/framboise/, "framboise"],
  [/myrtille/, "myrtille"],
  [/cerise/, "cerise"],
  [/passion/, "fruit-passion"],
  [/pasteque/, "pasteque"],
  [/melon/, "melon"],
  [/datte/, "datte"],
  [/raisin/, "raisin"],
  [/avocat/, "avocat"],
  [/olives?-noires?/, "olive-noire"],
  [/olive/, "olive"],
  [/capres/, "capres"],
  [/cornichon/, "cornichon"],

  // Légumes
  [/patate-douce/, "patate-douce"],
  [/carotte/, "carotte"],
  [/panais/, "panais"],
  [/navet/, "navet"],
  [/betterave/, "betterave"],
  [/celeri/, "celeri-rave"],
  [/fenouil/, "fenouil"],
  [/endive/, "endive"],
  [/courgette/, "courgette"],
  [/concombre/, "concombre"],
  [/aubergine/, "aubergine"],
  [/butternut|courge/, "butternut"],
  [/potimarron|potiron|citrouille/, "potimarron"],
  [/brocoli/, "brocoli"],
  [/chou-fleur/, "chou-fleur"],
  [/chou-rouge/, "chou-rouge"],
  [/pak-choi|bok-choy/, "pak-choi"],
  [/chou/, "chou"],
  [/champignon/, "champignon"],
  [/(^|-)mais(-|$)/, "mais"],
  [/tomate/, "tomate"],
  [/poivron-jaune/, "poivron-jaune"],
  [/poivron-vert/, "poivron-vert"],
  [/poivron/, "poivron-rouge"],
  [/oignon-rouge/, "oignon-rouge"],
  [/oignon-nouveau|cebette/, "oignon-nouveau"],
  [/echalote/, "echalote"],
  [/oignon/, "oignon"],
  [/epinard/, "epinards"],
  [/roquette|jeunes-pousses|mesclun/, "jeunes-pousses"],
  [/mache|laitue|salade|romaine/, "salade"],

  // Viandes et poissons
  [/lardon|guanciale|pancetta|bacon/, "lardons"],
  [/jambon/, "jambon"],
  [/saucisse|chipolata|merguez/, "saucisse"],
  [/hache/, "steak-hache"],
  [/magret|canard/, "magret"],
  [/poulet|dinde|volaille/, "poulet"],
  [/agneau|cotelette/, "agneau"],
  [/porc|(^|-)veau(-|$)/, "porc"],
  [/boeuf|paleron|steak/, "boeuf"],
  [/saumon-fume/, "saumon-fume"],
  [/saumon/, "saumon"],
  [/cabillaud|colin|merlu|poisson-blanc/, "poisson-blanc"],
  [/poisson/, "poisson"],
  [/crevette|gambas/, "crevette"],
  [/moule/, "moules"],
];

const USTENSILES: Regle[] = [
  [/couteau/, "couteau"],
  [/planche/, "planche"],
  [/grande-casserole|faitout/, "faitout"],
  [/casserole/, "casserole"],
  [/saladier/, "saladier"],
  [/assiette/, "assiette"],
  [/tajine|cocotte/, "cocotte"],
  [/plat-a-gratin/, "plat-gratin"],
  [/plat/, "plat"],
  [/grille-pain/, "grille-pain"],
  [/poele-grill|^gril|plancha/, "grill"],
  [/wok/, "wok"],
  [/poele|sauteuse/, "poele"],
  [/spatule-en-bois|cuillere-en-bois/, "cuillere-bois"],
  [/spatule/, "spatule"],
  [/cuillere-a-glace/, "cuillere-glace"],
  [/cuillere/, "cuillere"],
  [/fourchette/, "fourchette"],
  [/fouet/, "fouet"],
  [/passoire/, "passoire"],
  [/ecumoire/, "ecumoire"],
  [/louche/, "louche"],
  [/papier-cuisson/, "papier-cuisson"],
  [/plaque/, "plaque"],
  [/rape/, "rape"],
  [/mixeur-plongeant/, "mixeur-plongeant"],
  [/blender|mixeur/, "blender"],
  [/batteur/, "batteur"],
  [/presse-agrumes/, "presse-agrumes"],
  [/presse-puree/, "presse-puree"],
  [/econome/, "econome"],
  [/congelateur/, "congelateur"],
  [/refrigerateur|frigo/, "refrigerateur"],
  [/micro-ondes/, "micro-ondes"],
  [/four/, "four"],
  [/verrine/, "verrine"],
  [/bocal|bocaux/, "bocal"],
  [/carafe/, "carafe"],
  [/mug|tasse/, "tasse"],
  [/coupe/, "coupe"],
  [/verre/, "verre"],
  [/bol/, "bol"],
  [/ramequin/, "ramequin"],
  [/cercle/, "cercle"],
  [/pinceau/, "pinceau"],
  [/moule-a-muffins|moule-a-financiers|moules-individuels/, "moule-muffins"],
  [/moule-a-madeleines/, "moule-madeleines"],
  [/moule-a-tarte/, "moule-tarte"],
  [/moule-a-cake|moule-rectangulaire/, "moule-cake"],
  [/moule-carre/, "moule-carre"],
  [/esquimau/, "moule-esquimaux"],
  [/moule/, "moule-rond"],
  [/batonnet/, "batonnets"],
  [/brochette/, "brochettes"],
  [/boite/, "boite"],
  [/pince/, "pince"],
  [/torchon/, "torchon"],
  [/balance/, "balance"],
  [/cafetiere/, "cafetiere"],
];

const lire = (regles: Regle[], nom: string): string | null => {
  const s = slugify(nom);
  for (const [re, cle] of regles) if (re.test(s)) return cle;
  return null;
};

/** Le nom de la vignette d'un ingrédient (« lardons » pour « Lardons allégés »), ou `null`. */
export const vignetteIngredient = (nom: string) => lire(INGREDIENTS, nom);
/** Le nom de la vignette d'un ustensile (« poele » pour « Poêle profonde »), ou `null`. */
export const vignetteUstensile = (nom: string) => lire(USTENSILES, nom);

export const cheminIngredient = (nom: string) => {
  const v = vignetteIngredient(nom);
  return v ? `/ingredients/${v}.webp` : null;
};
export const cheminUstensile = (nom: string) => {
  const v = vignetteUstensile(nom);
  return v ? `/utensils/${v}.webp` : null;
};
