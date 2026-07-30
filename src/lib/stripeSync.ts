/**
 * stripeSync.ts — source unique de la mise à jour d'un abonnement dans `profiles`.
 *
 * Trois endroits écrivent le statut d'abonnement : le webhook Stripe, la reprise
 * au retour de paiement (`/api/stripe/reconcile`) et le garde-fou du checkout.
 * Ils passent TOUS par ici, sinon les règles (quels statuts comptent comme
 * actifs, où lire la fin de période) divergeraient d'un fichier à l'autre.
 *
 * Règle de fond : toute écriture qui rate LÈVE une erreur. L'appelant doit
 * répondre en échec à Stripe pour qu'il rejoue l'événement. Un paiement encaissé
 * dont l'écriture échoue en silence, c'est un client qui a payé dans le vide.
 */
import type Stripe from "stripe";
import type { createAdminClient } from "./supabase-admin";
import type { PlanId } from "./plans";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Statuts Stripe qui donnent accès au Premium.
 * `past_due` est inclus volontairement : le premier prélèvement a échoué mais
 * Stripe va réessayer, on ne coupe pas l'accès d'un client au premier incident.
 * Stripe finit par passer la souscription en `canceled` si rien ne rentre.
 */
export const STATUTS_ACTIFS = ["active", "trialing", "past_due"];

export function estActif(status: string | null | undefined): boolean {
  return !!status && STATUTS_ACTIFS.includes(status);
}

/**
 * Fin de la période payée.
 * ⚠️ Depuis l'API 2025 (on est en 2026-05-27.dahlia), `current_period_end` n'est
 * PLUS sur la souscription : il vit sur ses items. L'ancien code lisait
 * `sub.current_period_end`, qui vaut toujours undefined → la colonne n'était
 * jamais remplie. Ne pas remettre la lecture à la racine.
 */
export function finDePeriode(sub: Stripe.Subscription): string | null {
  const ts = sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/**
 * Le plan acheté. Il n'existe qu'une offre payante aujourd'hui : le jour où il
 * y en a plusieurs, c'est ici qu'on lit `sub.metadata.plan`.
 */
export function planDeLaSouscription(): PlanId {
  return "premium";
}

export interface EtatAbonnement {
  tier: PlanId;
  status: string;
  customerId?: string | null;
  periodEnd?: string | null;
}

/**
 * Écrit l'état d'abonnement sur le profil. Lève si l'écriture échoue.
 */
export async function appliquerAbonnement(
  admin: Admin,
  userId: string,
  etat: EtatAbonnement
): Promise<void> {
  const patch: Record<string, unknown> = {
    subscription_tier: etat.tier,
    is_premium: etat.tier !== "free",
    subscription_status: etat.status,
  };
  if (etat.customerId) patch.stripe_customer_id = etat.customerId;
  if (etat.periodEnd) patch.current_period_end = etat.periodEnd;

  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) {
    throw new Error(`profil ${userId} non mis à jour : ${error.message}`);
  }
}

/**
 * Retrouve le compte Vaiiya derrière un événement Stripe.
 * D'abord les métadonnées (posées à la création du checkout), sinon le client
 * Stripe déjà enregistré sur un profil. Rend null si on ne peut pas attribuer :
 * l'appelant doit alors échouer bruyamment plutôt que d'ignorer l'événement.
 */
export async function trouverUtilisateur(
  admin: Admin,
  opts: { userId?: string | null; customerId?: string | null }
): Promise<string | null> {
  if (opts.userId) return opts.userId;
  if (!opts.customerId) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", opts.customerId)
    .maybeSingle();

  if (error) throw new Error(`recherche du client ${opts.customerId} : ${error.message}`);
  return data?.id ?? null;
}

/**
 * Applique une souscription Stripe telle quelle sur le profil.
 * Un statut non actif fait retomber le compte en gratuit, sans rien effacer
 * d'autre : ce que l'utilisateur a créé pendant son abonnement lui reste.
 */
export async function synchroniserSouscription(
  admin: Admin,
  sub: Stripe.Subscription,
  userIdConnu?: string | null
): Promise<{ userId: string; premium: boolean } | null> {
  const userId = await trouverUtilisateur(admin, {
    userId: userIdConnu ?? sub.metadata?.user_id ?? null,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
  });
  if (!userId) return null;

  const actif = estActif(sub.status);
  await appliquerAbonnement(admin, userId, {
    tier: actif ? planDeLaSouscription() : "free",
    status: sub.status,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    periodEnd: finDePeriode(sub),
  });

  return { userId, premium: actif };
}

/**
 * Cherche chez Stripe si ce client a une souscription qui tourne.
 * Sert au garde-fou anti double abonnement et à la resynchronisation manuelle :
 * c'est Stripe qui fait foi, pas notre base.
 */
export async function souscriptionActiveChezStripe(
  stripe: Stripe,
  customerId: string
): Promise<Stripe.Subscription | null> {
  const liste = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return liste.data.find((s) => estActif(s.status)) ?? null;
}
