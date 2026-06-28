/* ════════════════════════════════════════════════════════════════════
   Macros des plats suggérés — fiabilité honnête.

   Les plats proposés (menu IA + catalogue de secours) n'ont jamais de macros
   MESURÉES. Ce module rend leurs protéines/glucides/lipides aussi crédibles que
   possible, et SURTOUT cohérents avec les calories :

   - reconcileMacros (A) : si l'IA fournit des macros mais que leur somme
     calorique s'écarte trop des calories annoncées, on les recale (en gardant
     le ratio voulu) → fini les chiffres incohérents qui passaient tels quels.
   - estimateMacros (B) : si on n'a QUE les calories (catalogue de secours),
     on estime un profil P/G/L à partir du NOM du plat (un steak ≠ des pâtes),
     au lieu d'une répartition uniforme 20/50/30 qui était la même pour tout.
   - macrosForDish : point d'entrée unique (affichage ET enregistrement passent
     par lui → ce qu'on montre = ce qu'on logue).

   Ces valeurs restent des ESTIMATIONS → l'UI les marque d'un « ≈ ». Les vraies
   données de l'utilisateur (coups de cœur) ne passent pas par ici.
   Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

export type Macros = { proteins: number; carbs: number; fats: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* Normalise pour la détection : minuscules, œ→oe, accents retirés. */
function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* Mots-clés (déjà normalisés) qui orientent le profil du plat. */
const PROTEIN_HINTS = [
  "poulet", "volaille", "dinde", "escalope", "steak", "boeuf", "viande", "bavette",
  "saumon", "poisson", "thon", "cabillaud", "crevette", "fruits de mer", "oeuf",
  "jambon", "porc", "tofu", "lentille", "pois chiche", "legumineuse", "haricot rouge",
  "skyr", "fromage blanc", "yaourt grec", "whey", "proteine", "blanc de poulet",
];
const CARB_HINTS = [
  "riz", "pate", "pasta", "pain", "frite", "pomme de terre", "patate", "semoule",
  "couscous", "quinoa", "boulgour", "avoine", "cereale", "granola", "muesli",
  "banane", "miel", "confiture", "sucre", "crepe", "pancake", "brioche", "gaufre",
  "tartine", "sandwich", "wrap", "pizza", "nouille", "porridge", "sirop",
];
const FAT_HINTS = [
  "burger", "carbonara", "fromage", "beurre", "huile", "bacon", "lardon", "mayo",
  "avocat", "noix", "cacahuete", "chocolat", "tartiner", "creme", "gratin",
  "raclette", "charcuterie", "saucisse", "croissant", "viennoiserie", "frite", "chips",
];

/* (A) Recale des macros fournies pour qu'elles collent aux calories. */
export function reconcileMacros(calories: number, p: number, c: number, f: number): Macros {
  const round = (m: Macros): Macros => ({ proteins: Math.round(m.proteins), carbs: Math.round(m.carbs), fats: Math.round(m.fats) });
  const macroKcal = p * 4 + c * 4 + f * 9;
  if (calories <= 0 || macroKcal <= 0) return round({ proteins: p, carbs: c, fats: f });
  const deviation = Math.abs(macroKcal - calories) / calories;
  if (deviation <= 0.12) return round({ proteins: p, carbs: c, fats: f }); // déjà cohérent
  const k = calories / macroKcal; // mise à l'échelle proportionnelle (préserve le ratio voulu)
  return round({ proteins: p * k, carbs: c * k, fats: f * k });
}

/* (B) Estime un profil P/G/L à partir du nom du plat + des calories. */
export function estimateMacros(name: string, calories: number): Macros {
  if (calories <= 0) return { proteins: 0, carbs: 0, fats: 0 };
  const n = normalize(name);
  const hit = (arr: string[]) => arr.some((k) => n.includes(k));

  // Fractions caloriques de départ (base équilibrée), nudgées par les indices.
  let p = 0.20, c = 0.50, f = 0.30;
  if (hit(PROTEIN_HINTS)) p += 0.16;
  if (hit(CARB_HINTS)) c += 0.12;
  if (hit(FAT_HINTS)) f += 0.14;

  // Renormalise puis borne pour rester physiologiquement plausible.
  let s = p + c + f; p /= s; c /= s; f /= s;
  p = clamp(p, 0.10, 0.45); c = clamp(c, 0.20, 0.65); f = clamp(f, 0.15, 0.45);
  s = p + c + f; p /= s; c /= s; f /= s;

  return {
    proteins: Math.round((calories * p) / 4),
    carbs: Math.round((calories * c) / 4),
    fats: Math.round((calories * f) / 9),
  };
}

/* Point d'entrée unique : macros fiables pour un plat suggéré.
   - macros complètes fournies (IA) → on recale (A)
   - sinon (calories seules) → on estime depuis le nom (B) */
export function macrosForDish(name: string, calories: number, p?: number, c?: number, f?: number): Macros {
  if (p != null && c != null && f != null) return reconcileMacros(calories, p, c, f);
  return estimateMacros(name, calories);
}
