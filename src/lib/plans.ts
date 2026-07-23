/**
 * plans.ts — Source unique de vérité pour les offres Vaiiya.
 * Utilisé par : page /premium, API Stripe checkout, webhook, et le gating
 * (quotas + choix du modèle IA selon le tier).
 */

export type PlanId = "free" | "premium";

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
    /** Missions illimitées (les missions supplémentaires du Premium). */
    missionsUnlimited: boolean;
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
      "Les missions de base pour gagner de l'EXP",
      "Coach IA — 5 messages/jour",
      "Analyse nutrition — 2/jour",
    ],
    limits: { chatPerDay: 5, nutritionPerDay: 2, missionsUnlimited: false, ads: false, exclusiveContent: false },
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceCents: 599,
    currency: "eur",
    trialDays: 3,
    tagline: "L'expérience Vaiiya complète",
    aiModel: "llama-3.3-70b-versatile", // modèle avancé
    features: [
      "Missions supplémentaires en illimité",
      "Coach IA avancé — illimité",
      "Analyse nutrition illimitée",
      "Détails complets de tes entraînements",
      "Programmes & entraînements exclusifs",
      "Badge Premium",
    ],
    limits: { chatPerDay: Infinity, nutritionPerDay: Infinity, missionsUnlimited: true, ads: false, exclusiveContent: true },
  },
};

export const PAID_PLANS: PlanId[] = ["premium"];

export function getPlan(id: string | null | undefined): Plan {
  if (id === "premium") return PLANS.premium;
  return PLANS.free;
}

/** Prix formaté pour l'affichage, ex. "5,99 €". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
}
