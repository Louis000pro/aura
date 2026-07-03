/* ════════════════════════════════════════════════════════════════════
   mealIdeas — source d'idées de repas pour « À la maison ».

   Tape sur /api/nutrition/menu (IA : plats perso + macros + prepMin selon le
   profil de goûts, l'objectif calorique, le régime et les coups de cœur). Si
   l'IA n'est pas dispo (ex. pas de clé LLM en local), on retombe sur un secours
   compact pour que le flux marche toujours. Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { macrosForDish } from "@/lib/macros";

export type Idea = {
  nom: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  prepMin?: number;
  difficulty?: string;
};

/* Secours compact — utilisé UNIQUEMENT si l'API IA échoue.
   En prod, /api/nutrition/menu renvoie des plats personnalisés et variés. */
const FALLBACK: Record<string, { nom: string; calories: number; prepMin?: number }[]> = {
  "petit-dejeuner": [
    { nom: "Porridge avoine & banane", calories: 380, prepMin: 8 },
    { nom: "Œufs brouillés & pain complet", calories: 400, prepMin: 10 },
    { nom: "Tartines avocat & œuf", calories: 410, prepMin: 10 },
    { nom: "Skyr, muesli & myrtilles", calories: 330, prepMin: 5 },
    { nom: "Omelette 3 œufs & fromage", calories: 420, prepMin: 12 },
  ],
  "dejeuner": [
    { nom: "Poulet, riz & brocolis", calories: 600, prepMin: 25 },
    { nom: "Saumon, quinoa & épinards", calories: 580, prepMin: 20 },
    { nom: "Poke bowl saumon", calories: 540, prepMin: 15 },
    { nom: "Wrap poulet crudités", calories: 480, prepMin: 10 },
    { nom: "Pâtes au thon & tomate", calories: 560, prepMin: 15 },
  ],
  "gouter": [
    { nom: "Fromage blanc & noix", calories: 220, prepMin: 3 },
    { nom: "Banane & beurre de cacahuète", calories: 250, prepMin: 3 },
    { nom: "Skyr & myrtilles", calories: 160, prepMin: 2 },
    { nom: "Poignée d'amandes", calories: 200, prepMin: 1 },
  ],
  "diner": [
    { nom: "Omelette feta & épinards", calories: 380, prepMin: 8 },
    { nom: "Poulet & légumes vapeur", calories: 480, prepMin: 20 },
    { nom: "Soupe, pain & fromage", calories: 450, prepMin: 12 },
    { nom: "Filet de poisson & ratatouille", calories: 490, prepMin: 22 },
    { nom: "Buddha bowl", calories: 500, prepMin: 15 },
  ],
};

type RawIdea = {
  nom?: unknown; calories?: unknown; proteins?: unknown; carbs?: unknown;
  fats?: unknown; prepMin?: unknown; difficulty?: unknown;
};

/* Normalise : nom propre, macros cohérentes (recalées sur les calories). */
function normalize(raw: RawIdea[]): Idea[] {
  const num = (v: unknown) => (v == null || isNaN(Number(v)) ? undefined : Math.round(Number(v)));
  const out: Idea[] = [];
  for (const r of raw) {
    const nom = typeof r?.nom === "string" ? r.nom.trim() : "";
    if (!nom) continue;
    const cal = num(r?.calories) ?? 0;
    const mac = macrosForDish(nom, cal, num(r?.proteins), num(r?.carbs), num(r?.fats));
    out.push({
      nom,
      calories: cal,
      proteins: mac.proteins,
      carbs: mac.carbs,
      fats: mac.fats,
      prepMin: num(r?.prepMin),
      difficulty: typeof r?.difficulty === "string" ? r.difficulty : undefined,
    });
  }
  return out;
}

export const mealTypeFromHour = (h = new Date().getHours()): string =>
  h < 10 ? "petit-dejeuner" : h < 15 ? "dejeuner" : h < 18 ? "gouter" : "diner";

export async function fetchIdeas(params: {
  mealType: string;
  calorieTarget: number;
  taste?: unknown;
  diet?: string[];
  favorites?: string[];
}): Promise<Idea[]> {
  const { mealType, calorieTarget, taste, diet = [], favorites = [] } = params;
  try {
    const res = await fetch("/api/nutrition/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealTypes: [mealType], perType: 10, calorieTarget, taste, diet, favorites }),
    });
    if (res.ok) {
      const json = await res.json();
      const pool = json?.pools?.[mealType];
      if (Array.isArray(pool) && pool.length) {
        const norm = normalize(pool as RawIdea[]);
        if (norm.length) return norm;
      }
    }
  } catch {
    /* secours ci-dessous */
  }
  return normalize(FALLBACK[mealType] ?? FALLBACK["diner"]);
}
