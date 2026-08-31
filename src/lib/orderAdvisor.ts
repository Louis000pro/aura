/* ════════════════════════════════════════════════════════════════════
   orderAdvisor — le cerveau de « Conseille-moi » (livraison).

   Le jumeau de rankRecipes (recipeBank) côté commande. On ne connaît pas la
   carte de chaque enseigne, donc on conseille au niveau du GENRE : on classe
   les 7 genres (orderEstimate) selon ce qu'il reste dans la journée
   (kcal + protéines), avec un bonus de goût dégressif (top 3 des endroits
   préférés). Le fit calorique reste DOMINANT — honnête, ça départage sans
   prescrire. Les macros réelles restent calculées par l'estimateur une fois
   le genre choisi. Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { CATEGORY_ORDER, type OrderCategory } from "@/lib/orderEstimate";

/* Profil macro « moyen » d'une commande de ce genre — assumé comme des
   moyennes honnêtes, jamais présenté comme un chiffre exact. `article` = le
   plat type qui pré-remplit le parcours d'estimation. */
export type GenreProfile = {
  cal: number;          // kcal typiques d'une commande de ce genre
  protDensity: number;  // g de protéines par kcal (densité protéique)
  title: string;        // titre de la reco (« Un poké, ou des sushis »)
  short: string;        // suffixe court pour les lignes compactes (« poké, sushis »)
  vise: string;         // commande maligne : ce qu'on vise
  saute?: string;       // ce qu'on saute
  article: string;      // plat type pré-rempli dans le parcours livraison
};

export const GENRE_PROFILE: Record<OrderCategory, GenreProfile> = {
  burger: {
    cal: 950, protDensity: 0.045,
    title: "Un burger, sans le menu maxi", short: "burger",
    vise: "Burger simple + une eau", saute: "saute le menu XL et le soda",
    article: "Burger",
  },
  tacos: {
    cal: 1050, protDensity: 0.042,
    title: "Un tacos taille raisonnable", short: "tacos",
    vise: "Un M viande, sauce à part", saute: "évite le gratiné XL",
    article: "Tacos M viande",
  },
  pizza: {
    cal: 950, protDensity: 0.038,
    title: "Une pizza, la moitié suffit", short: "pizza",
    vise: "La moitié + une salade", saute: "garde le reste pour demain",
    article: "Pizza",
  },
  asiatique: {
    cal: 600, protDensity: 0.06,
    title: "Un poké, ou des sushis", short: "poké, sushis",
    vise: "Saumon · riz · edamame", saute: "saute les tempuras et nems frits",
    article: "Poké saumon",
  },
  bistro: {
    cal: 750, protDensity: 0.052,
    title: "Un grillé + légumes", short: "un grillé",
    vise: "Viande ou poisson grillé, légumes à côté", saute: "sauces à part",
    article: "Plat grillé + légumes",
  },
  "petit-dej": {
    cal: 500, protDensity: 0.045,
    title: "Un brunch salé", short: "brunch salé",
    vise: "Œufs + pain complet, un fruit", saute: "évite la viennoiserie en plus",
    article: "Œufs + pain complet",
  },
  dessert: {
    cal: 400, protDensity: 0.015,
    title: "Un dessert, en petit plaisir", short: "petit plaisir",
    vise: "Parfait en complément", saute: "peu de protéines : pas un vrai repas",
    article: "Dessert",
  },
};

export type AdvisorNeeds = {
  goalCalories: number;     // objectif du jour (0 = inconnu → pas de « X kcal restantes »)
  remaining: number;        // kcal encore dispo aujourd'hui
  proteinRemaining: number; // g de protéines encore à couvrir
  mealShare: number;        // part typique de ce repas dans la journée
  likedPlaces: string[];    // top 3 des genres préférés (ordonné)
};

export type RankedGenre = {
  category: OrderCategory;
  profile: GenreProfile;
  reason: string | null;    // « pourquoi ce genre », honnête, chiffré
};

/* Cible calorique du repas : la part normale de ce repas, plafonnée à ce qui
   reste réellement aujourd'hui (comme mealCalorieTarget côté recettes). */
function mealTarget(needs: AdvisorNeeds): number {
  if (needs.goalCalories <= 0) return 0;
  const share = (needs.mealShare > 0 ? needs.mealShare : 0.32) * needs.goalCalories;
  return Math.max(0, Math.min(share, Math.max(needs.remaining, 0)));
}

const TASTE_BONUS = [1, 0.66, 0.34]; // #1 pousse plus fort que #2 que #3

export function rankGenres(needs: AdvisorNeeds): RankedGenre[] {
  const hasGoal = needs.goalCalories > 0;
  const ideal = mealTarget(needs);
  const wantDensity = needs.remaining > 0 ? needs.proteinRemaining / needs.remaining : 0;

  return CATEGORY_ORDER
    .map((c, i) => {
      const p = GENRE_PROFILE[c];

      // Fit calorique (dominant)
      let calScore = 0.5;
      if (ideal > 0) {
        calScore = 1 - Math.min(Math.abs(p.cal - ideal) / Math.max(ideal, 400), 1);
      } else if (hasGoal) {
        // budget épuisé : on préfère le plus léger
        calScore = 1 - Math.min(p.cal / 1100, 1);
      }

      // Besoin de protéines
      let protScore = 0;
      if (wantDensity > 0) protScore = Math.min(p.protDensity / wantDensity, 1.5) / 1.5;

      // Goût (top 3 dégressif)
      const rank = needs.likedPlaces.indexOf(c);
      const tasteScore = rank >= 0 ? (TASTE_BONUS[rank] ?? 0) : 0;

      const jitter = Math.random() * 0.1;
      const score = calScore * 3 + protScore * 1.2 + tasteScore * 1.4 + jitter;
      return { c, p, score, i };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ c, p }) => ({ category: c, profile: p, reason: genreReason(c, needs, ideal) }));
}

function genreReason(c: OrderCategory, needs: AdvisorNeeds, ideal: number): string | null {
  const p = GENRE_PROFILE[c];
  const left = Math.max(needs.remaining, 0);
  const share = (needs.mealShare > 0 ? needs.mealShare : 0.32) * needs.goalCalories;

  if (ideal > 0) {
    const gap = Math.abs(p.cal - ideal) / ideal;
    if (gap <= 0.28) {
      if (needs.goalCalories > 0 && left < share && left >= 150)
        return `Cale bien dans tes ~${Math.round(left / 50) * 50} kcal restantes`;
      return "Bien calibré pour ce repas";
    }
    if (p.cal <= ideal * 0.72) return "Léger, tu gardes de la marge";
  } else if (needs.goalCalories > 0) {
    // budget serré
    if (p.cal <= 550) return "Léger, tu as déjà bien mangé";
  }

  if (needs.remaining > 0 && needs.proteinRemaining >= 25) {
    const wantDensity = needs.proteinRemaining / needs.remaining;
    if (p.protDensity >= wantDensity * 1.05) return "Riche en protéines pour ta journée";
  }

  if (needs.likedPlaces.includes(c)) return "Un de tes endroits préférés";
  return null;
}
