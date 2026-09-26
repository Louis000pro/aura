// ─────────────────────────────────────────────────────────────────────────────
// L'invitation à laisser un avis TRUSTPILOT (public, hors du site)
//
// À NE PAS CONFONDRE avec `lib/avis.ts`, qui gère les avis INTERNES modérés
// affichés sur la landing (§17). Ici, on invite à laisser un avis sur Trustpilot,
// et on ne fait qu'ouvrir un lien : aucune donnée, aucune base.
//
// Un avis se demande APRÈS un pic de satisfaction, jamais au hasard : une montée
// de rang, un relais gagné. On propose, on n'insiste pas, et on ne demande JAMAIS
// un « bon » avis (interdit par le positionnement §14/§17 comme par Trustpilot :
// pas de review-gating, pas de récompense contre un avis).
//
// Zéro backend, même patron que `celebrationRang.ts` : un flag en localStorage
// par compte. Deux garde-fous qui comptent :
//   • une seule fois par personne, POUR TOUJOURS. Le flag se pose dès que
//     l'invitation s'AFFICHE (pas seulement au clic) : quelqu'un qui l'ignore ne
//     la revoit jamais. Une invitation d'avis qui revient est du harcèlement.
//   • stockage refusé (navigation privée) → on ne propose rien, on ne casse rien.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le lien d'évaluation DIRECT de Trustpilot : il ouvre le formulaire d'avis en un
 * clic, au lieu d'envoyer chercher la fiche. C'est celui qu'on met partout.
 */
export const LIEN_AVIS = "https://fr.trustpilot.com/evaluate/vaiiya.fr";

export const EVENEMENT_PROPOSER_AVIS = "vaiiya:proposer-avis";

/** Par compte : sur un appareil partagé, l'avis de l'un ne parle pas pour l'autre. */
const cle = (userId: string) => `vaiiya_invite_avis_${userId}`;

/** Vrai tant que personne n'a encore vu (ni donné, ni ignoré) l'invitation. */
export function peutProposerAvis(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return localStorage.getItem(cle(userId)) === null;
  } catch {
    return false; // stockage refusé : on ne propose pas
  }
}

/** Ferme la porte pour toujours : `vu` (affichée), `fait` (avis donné). */
export function marquerAvis(userId: string, etat: "vu" | "fait"): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    // On n'écrase pas un `fait` par un `vu` : le clic est l'information forte.
    if (etat === "vu" && localStorage.getItem(cle(userId)) === "fait") return;
    localStorage.setItem(cle(userId), etat);
  } catch {
    /* ignore */
  }
}

/**
 * À appeler à un moment de satisfaction (rang monté, relais gagné). Si la personne
 * n'a jamais vu l'invitation, déclenche son affichage ; sinon ne fait rien. Sans
 * effet serveur, idempotent, sûr à rappeler.
 */
export function proposerAvis(userId: string): void {
  if (!peutProposerAvis(userId)) return;
  window.dispatchEvent(new CustomEvent(EVENEMENT_PROPOSER_AVIS));
}
