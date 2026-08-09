/* ════════════════════════════════════════════════════════════════════
   Les surfaces publiques : les routes qu'on sert à quelqu'un qui ne
   connaît pas encore Vaiiya.

   Une surface publique porte l'en-tête vitrine (logo + « Créer mon
   compte »), son contenu, son fil d'Ariane et son pied de page
   crawlable. Elle ne porte AUCUNE chrome applicative mobile : ni la
   barre du bas, ni la cloche flottante. Un visiteur arrivé depuis un
   moteur de recherche verrait sinon la navigation d'une application
   dans laquelle il n'est pas entré, juste sous un en-tête qui l'invite
   à créer un compte. Les deux se contredisent.

   Une surface applicative garde sa navigation, inchangée.

   ── Pourquoi cette liste ne contient que /exercices ──────────────
   Les autres pages vitrine (/coach-ia, /prise-de-masse,
   /perte-de-poids, /musculation-maison, /nutrition-sportive,
   /premium, les pages légales) ont exactement le même symptôme. Ce
   n'est pas un oubli : les y ajouter est une décision de produit qui
   dépasse le pilote SEO 3, et elle appartient à Louis. Le jour où
   elle est prise, une ligne suffit ici, les deux composants qui
   lisent ce fichier suivent tout seuls.

   ⚠️ /guides est volontairement absente : c'est un écran de revue
   interne (noindex), pas une surface publique.
   ════════════════════════════════════════════════════════════════════ */

/** Les racines publiques. Une racine couvre aussi ses sous-routes. */
const RACINES_PUBLIQUES = ["/exercices"];

/** Vrai si ce chemin est servi au grand public plutôt qu'à l'application. */
export function estSurfacePublique(pathname: string): boolean {
  return RACINES_PUBLIQUES.some(
    (racine) => pathname === racine || pathname.startsWith(`${racine}/`),
  );
}
