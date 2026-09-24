/* ════════════════════════════════════════════════════════════════════
   Types partagés des avis publics.

   Ce fichier ne fait AUCUN accès base : il est importable aussi bien par un
   composant serveur (`lib/avisPublics.ts`) que par un composant client (la
   landing), sans tirer le client admin (donc la clé service_role) dans le
   bundle du navigateur.
   ════════════════════════════════════════════════════════════════════ */

/** Un avis, réduit à ce qui s'affiche publiquement. */
export type AvisPublic = {
  id: string;
  note: number;
  texte: string;
  created_at: string;
  pseudo: string;
  avatar_url: string | null;
};

/** Le résumé descendu à la landing : moyenne, total, et un aperçu. */
export type ResumeAvis = {
  total: number;
  moyenne: number;
  apercu: AvisPublic[];
};

/**
 * Seuil d'affichage public. En dessous, la section de la page d'accueil ET la
 * note moyenne ne s'affichent pas du tout : « 5,0 ★ (1 avis) » a l'air fabriqué,
 * c'est l'inverse de l'effet recherché.
 */
export const SEUIL_AVIS_PUBLIC = 5;
