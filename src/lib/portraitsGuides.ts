/* ════════════════════════════════════════════════════════════════════
   GÉNÉRÉ PAR `scripts/build-portraits.mjs` (npm run portraits).
   NE PAS ÉDITER À LA MAIN : la prochaine génération écrase ce fichier.

   Ce que ce fichier dit, et rien d'autre : QUELLES PLANCHES DE MOMENT
   EXISTENT VRAIMENT sur le disque.

   ⚠️ LE CODE NE DEVINE JAMAIS QU'UN FICHIER EXISTE. C'est toute la
   raison d'être de ce module. Un `<img src>` posé au hasard sur un
   fichier absent produit une requête 404 et un trou à l'écran, le temps
   que le navigateur s'en aperçoive. On lit donc la disponibilité au
   moment du rendu, sans requête et sans clignotement, et le repli est
   choisi avant que l'image ne parte.

   C'est ce qui rend le dessin autonome : déposer une planche dans
   `guides-src/portraits/`, lancer `npm run portraits`, et la pose
   s'allume. Aucune ligne de code à toucher, et tant que la planche
   n'existe pas l'écran est exactement celui d'aujourd'hui.

   Clé : `<guide>-<moment>-<cadrage>`, le nom du fichier sans `-v1.webp`.
   ════════════════════════════════════════════════════════════════════ */

const DISPONIBLES = new Set<string>([
  // Vide tant qu'aucune planche de moment n'a été générée.
]);

/** Cette planche existe-t-elle ? Sert à choisir entre le moment et son
 *  repli, jamais à décider qu'un écran s'affiche ou non. */
export function aPortrait(cle: string): boolean {
  return DISPONIBLES.has(cle);
}

/** Tout ce qui existe, pour les scripts de vérification et la revue. */
export function portraitsDisponibles(): string[] {
  return [...DISPONIBLES].sort();
}
