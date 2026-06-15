/**
 * plans.ts — Source unique de vérité pour les offres Vaiiya.
 * Utilisé par : page /premium, API Stripe checkout, webhook, et le gating
 * (quotas + choix du modèle IA selon le tier).
 */

export type PlanId = "free" | "premium" | "creator";

export interface Plan {
  id: PlanId;
  name: string;
  /** Prix mensuel TTC en centimes (0 = gratuit). */
  priceCents: number;
  currency: "eur";
  /** Jours d'essai gratuit (0 = pas d'essai). */
  trialDays: number;
  tagline: string;
  features: string[];
  /** Modèle Groq utilisé pour le Coach IA sur ce tier. */
  aiModel: string;
  /** Limites quotidiennes (Infinity = illimité). */
  limits: {
    chatPerDay: number;
    nutritionPerDay: number;
    ads: boolean;
    exclusiveContent: boolean;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Gratuit",
    priceCents: 0,
    currency: "eur",
    trialDays: 0,
    tagline: "Pour découvrir Vaiiya",
    aiModel: "llama-3.1-8b-instant", // modèle léger & rapide → coûts maîtrisés
    features: [
      "Accès au feed & à la communauté",
      "Publier, liker, commenter",
      "Coach IA — 5 messages/jour",
      "Analyse nutrition — 3/jour",
    ],
    limits: { chatPerDay: 5, nutritionPerDay: 3, ads: true, exclusiveContent: false },
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceCents: 899,
    currency: "eur",
    trialDays: 3,
    tagline: "L'expérience Vaiiya complète",
    aiModel: "llama-3.3-70b-versatile", // modèle avancé
    features: [
      "Coach IA avancé — illimité",
      "Analyse nutrition illimitée",
      "Contenus & programmes exclusifs",
      "Sans publicité",
      "Badge Premium",
    ],
    limits: { chatPerDay: Infinity, nutritionPerDay: Infinity, ads: false, exclusiveContent: true },
  },
  creator: {
    id: "creator",
    name: "Créateur",
    priceCents: 1499,
    currency: "eur",
    trialDays: 3,
    tagline: "Pour les coachs & créateurs qui veulent grandir",
    aiModel: "llama-3.3-70b-versatile",
    features: [
      "Tout le Premium",
      "Mise en avant dans le feed & la découverte",
      "Statistiques détaillées sur tes posts",
      "Badge Créateur",
    ],
    limits: { chatPerDay: Infinity, nutritionPerDay: Infinity, ads: false, exclusiveContent: true },
  },
};

export const PAID_PLANS: PlanId[] = ["premium", "creator"];

export function getPlan(id: string | null | undefined): Plan {
  if (id && (id === "premium" || id === "creator")) return PLANS[id];
  return PLANS.free;
}

/** Prix formaté pour l'affichage, ex. "8,99 €". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
}
