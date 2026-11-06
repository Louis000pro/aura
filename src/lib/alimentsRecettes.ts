/* ═══ Ce qu'une recette contient ═══
   Une seule écriture des aliments qui se lisent sur une ligne d'ingrédient
   normalisée (« jaune d oeuf », « noix de saint jacques ») : la loupe des recettes
   s'en sert pour « sans porc », et le filtre de Nutrition pour ce qu'on a dit ne
   pas manger dans les premiers pas. Deux listes finiraient par ne plus être
   d'accord sur ce qu'est du porc. */

export const PORC = /\b(porc|jambon|lardons?|bacon|guanciale|pancetta|chorizo|saucisses?|petit sale|filet mignon)\b/;
export const VIANDES = /\b(boeuf|veau|agneau|porc|steaks?|saucisses?|lardons?|canard|magret|guanciale|pancetta|chorizo|jambon|bacon|poulet|dinde|volaille|lapin|merguez)\b/;
export const POISSONS = /\b(saumon|cabillaud|thon|crevettes?|gambas|moules?|saint jacques|poissons?|sardines?|maquereau|truite|dorade|merlu|colin|crabe|calamars?|anchois|nuoc mam)\b/;
export const OEUFS = /\boeufs?\b/;
