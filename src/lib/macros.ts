/* ════════════════════════════════════════════════════════════════════
   Macros d'une recette générée : cohérentes avec ses calories.

   reconcileMacros : si l'IA fournit des macros dont la somme calorique
   s'écarte trop des calories annoncées, on les recale (en gardant le ratio
   voulu), pour qu'aucun chiffre incohérent ne passe tel quel.

   Ces valeurs restent des ESTIMATIONS. L'estimation depuis le seul nom d'un
   plat (estimateMacros, macrosForDish) servait aux plats suggérés, retirés
   au gel du 2026-09-12 ; elle est supprimée depuis le 2026-10-27.
   Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

export type Macros = { proteins: number; carbs: number; fats: number };

/* Recale des macros fournies pour qu'elles collent aux calories. */
export function reconcileMacros(calories: number, p: number, c: number, f: number): Macros {
  const round = (m: Macros): Macros => ({ proteins: Math.round(m.proteins), carbs: Math.round(m.carbs), fats: Math.round(m.fats) });
  const macroKcal = p * 4 + c * 4 + f * 9;
  if (calories <= 0 || macroKcal <= 0) return round({ proteins: p, carbs: c, fats: f });
  const deviation = Math.abs(macroKcal - calories) / calories;
  if (deviation <= 0.12) return round({ proteins: p, carbs: c, fats: f }); // déjà cohérent
  const k = calories / macroKcal; // mise à l'échelle proportionnelle (préserve le ratio voulu)
  return round({ proteins: p * k, carbs: c * k, fats: f * k });
}
