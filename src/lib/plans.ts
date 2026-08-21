/**
 * plans.ts — Source unique de vérité pour les offres Vaiiya.
 * Utilisé par : page /premium, API Stripe checkout, webhook, et le gating
 * (quotas + choix du modèle IA selon le tier).
 */

/**
 * L'abonnement est-il en vente ?
 *
 * Vendre au public en France suppose une entreprise déclarée : identité du
 * vendeur, SIRET, adresse et médiateur de la consommation sont obligatoires
 * dès le premier euro. Tant que ce n'est pas en place, on n'encaisse pas.
 *
 * Ce n'est PAS un drapeau de fonctionnalité : c'est une porte fermée. Elle est
 * lue à la fois par l'écran (/premium) et par le serveur (/api/stripe/checkout),
 * parce qu'une porte fermée seulement côté écran s'ouvre avec une requête.
 *
 * Pour rouvrir : passer à `true`, ET remplir l'identité dans
 * /mentions-legales et /conditions, ET désigner le médiateur.
 *
 * Ce que ça ne coupe PAS, volontairement : les abonnements déjà actifs
 * continuent, et le portail Stripe reste ouvert pour qu'on puisse toujours
 * résilier. Fermer la sortie serait pire que fermer l'entrée.
 */
export const VENTE_OUVERTE = false;

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
    /**
     * Combien de séances à soi on GARDE (Infinity = illimité).
     * On limite le stock, jamais le fait de créer ni de s'entraîner :
     * supprimer une séance libère toujours une place, et ce qui est déjà
     * gardé ne se verrouille jamais (un abonnement qui s'arrête ne
     * reprend rien).
     */
    sessionsMax: number;
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
      "4 missions par jour, jusqu'à 50 EXP",
      "3 séances à toi, gardées",
      "Coach IA : 5 messages/jour",
      "Analyse nutrition : 2/jour",
    ],
    limits: { chatPerDay: 5, nutritionPerDay: 2, sessionsMax: 3, ads: false, exclusiveContent: false },
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
      "8 missions par jour, jusqu'à 120 EXP",
      "Un palier de plus dans les défis de la semaine",
      "Tes propres séances, sans limite",
      "Coach IA avancé : illimité",
      "Analyse nutrition illimitée",
      "Détails complets de tes entraînements",
      "Programmes & entraînements exclusifs",
      "Badge Premium",
    ],
    limits: { chatPerDay: Infinity, nutritionPerDay: Infinity, sessionsMax: Infinity, ads: false, exclusiveContent: true },
  },
};

/**
 * Un plan payant donne les accès Premium.
 * Le palier « Premium+ » a été retiré le 2026-07-29 : il était facturé 9,99 €
 * pour « des avantages exclusifs à venir », donc pour rien. On ne remet une
 * offre en vente que le jour où elle contient quelque chose de réel.
 */
export function isPaidPlan(id: string | null | undefined): boolean {
  return id === "premium";
}

/** Prix formaté pour l'affichage, ex. "5,99 €". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
}
