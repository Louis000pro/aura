/* ════════════════════════════════════════════════════════════════════
   profilsPublics.ts — LA SEULE FAÇON DE LIRE LE PROFIL DE QUELQU'UN D'AUTRE.

   ⚠️ POURQUOI CE FICHIER EXISTE, ET CE N'EST PAS UNE PRÉCAUTION DE STYLE.
   `20260501_profiles_and_trigger.sql` pose `USING (true)` en lecture sur
   `profiles`. La table ne portait alors qu'un pseudo et un avatar ; elle
   porte aujourd'hui l'âge, le poids, la taille, le sexe, le régime, les
   goûts, le lieu d'entraînement, l'état de l'abonnement, l'identifiant de
   client Stripe et la marque de bannissement. La clé anonyme vit dans le
   bundle du navigateur — c'est son rôle, elle n'est pas un secret — donc
   n'importe qui peut lire ces colonnes pour TOUS les comptes.

   ⚠️ LA RLS EST PAR LIGNE, JAMAIS PAR COLONNE : on ne peut pas « garder
   public le pseudo et cacher le poids » sur la même table. Il faut deux
   surfaces, et c'est exactement ce que le produit fait déjà pour les mêmes
   raisons (`profil_public()`, `rangs_aura()`, `badges_aura()` existent
   parce que `workout_sessions` et `aura_mission_credits` sont
   propriétaires). D'où la vue `profils_publics`, et d'où ce fichier.

   ⚠️ LE CODE PART AVANT LA MIGRATION, DONC IL SAIT VIVRE SANS ELLE.
   `supabase/migrations/20260915_profils_publics.sql` se colle à la main :
   tant qu'il ne l'est pas, la vue n'existe pas et demander à PostgREST une
   relation absente fait échouer la requête ENTIÈRE. `lireProfils` retombe
   alors sur la table, et l'app se comporte EXACTEMENT comme avant.
   ════════════════════════════════════════════════════════════════════ */

/** La surface publique, posée par la migration. */
export const VUE_PROFILS = "profils_publics";
/** La table, qui reste le seul chemin vers SON propre profil. */
export const TABLE_PROFILS = "profiles";

/**
 * Les colonnes que la vue expose, et rien d'autre.
 *
 * ⚠️ NE JAMAIS Y AJOUTER une colonne du corps (age, poids, taille, sexe,
 * régime), des goûts, du lieu d'entraînement, de l'abonnement ou de la
 * modération. C'est la liste que la migration écrit et que
 * `npm run check:profils` relit : ajouter un nom ici sans l'ajouter à la
 * vue casserait toutes les lectures de la communauté, et l'ajouter à la
 * vue sans le justifier rouvrirait la fuite qu'on vient de fermer.
 *
 * `onboarding_goals` et `onboarding_level` en font partie parce que la
 * décision du 2026-08-30 est écrite : « sur le profil d'un ami, l'objectif
 * est de l'IDENTITÉ, pas de la donnée de santé : on montre le libellé,
 * jamais l'âge, le poids ni la taille ».
 */
export const COLONNES_PUBLIQUES = [
  "id",
  "pseudo",
  "full_name",
  "bio",
  "avatar_url",
  "onboarding_goals",
  "onboarding_level",
  "is_certified",
  "is_admin",
  "created_at",
] as const;

/* ⚠️ MÉMORISÉ, MAIS SEULEMENT SUR UNE RÉPONSE DÉFINITIVE, et c'est toute la
   différence avec un sondage naïf. Un sondage qui échoue pour une raison
   de RÉSEAU mémoriserait « la vue n'existe pas » pour toute la session :
   une fois la migration collée, une seule coupure au mauvais moment
   viderait tous les avatars de la communauté jusqu'au rechargement. On ne
   mémorise donc que l'absence de RELATION, qui est une propriété du schéma
   et pas de la liaison. C'est la même discipline qu'`enrichUser`, qui
   distingue « la colonne n'existe pas » de « la requête a échoué ». */
let vueAbsente = false;

/** La vue est-elle absente du schéma ? (Pour les bancs et les diagnostics.) */
export function vueProfilsAbsente(): boolean {
  return vueAbsente;
}

/** Remet la mémoire à zéro. Réservé aux bancs d'essai. */
export function oublierSchemaProfils(): void {
  vueAbsente = false;
}

/**
 * PostgREST ne dit pas « 404 », il rend un message. Les trois formes
 * rencontrées : la relation inconnue, le cache de schéma pas encore au
 * courant, et le code `42P01` de PostgreSQL.
 *
 * ⚠️ LE MOTIF EST ÉTROIT EXPRÈS. Prendre toute erreur pour une absence de
 * vue ferait retomber sur la table au premier refus de la RLS, c'est-à-dire
 * exactement là où il ne faut pas.
 */
export function absenceDeVue(erreur: { message?: string; code?: string } | null): boolean {
  if (!erreur) return false;
  if (erreur.code === "42P01" || erreur.code === "PGRST205") return true;
  const msg = erreur.message ?? "";
  return /does not exist|schema cache|could not find the table|unknown relation/i.test(msg);
}

type ReponsePostgrest = { data: unknown; error: { message?: string; code?: string } | null };

/**
 * Lit le profil de quelqu'un d'autre, par la vue si elle existe, par la
 * table sinon.
 *
 * ⚠️ LA REQUÊTE EST UNE FONCTION, ET PAS UN OBJET DÉJÀ CONSTRUIT. C'est ce
 * qui permet de la REJOUER à l'identique sur l'autre source : un
 * constructeur Supabase déjà attendu ne se relance pas. Corollaire : la
 * fonction ne doit rien faire d'autre que bâtir la requête, elle peut être
 * appelée deux fois.
 *
 * ⚠️ AUCUN ALLER-RETOUR EN PLUS DANS LE CAS NORMAL, contrairement à un
 * sondage : quand la vue existe, la première tentative est la bonne, et
 * quand elle n'existe pas on ne paie le détour qu'une seule fois par
 * session.
 */
export async function lireProfils<R extends ReponsePostgrest>(
  requete: (source: string) => PromiseLike<R>,
): Promise<R> {
  if (!vueAbsente) {
    const res = await requete(VUE_PROFILS);
    if (!absenceDeVue(res.error)) return res;
    vueAbsente = true;
  }
  return requete(TABLE_PROFILS);
}
