import type { Metadata } from "next";

/**
 * L'écran est une page d'application, pas une page de site.
 *
 * Il renvoie 200, il est atteignable, mais il n'a rien à faire dans un moteur
 * de recherche : sans session il ne montre qu'une coquille vide, et il portait
 * jusqu'ici le titre de l'accueil, donc il se présentait comme un doublon.
 *
 * `robots.txt` ne suffit PAS quand le but est la désindexation : un Disallow
 * empêche la visite, il n'efface pas une URL déjà connue, et un moteur qui ne
 * peut pas lire la page ne peut pas y lire non plus l'ordre de la retirer.
 * C'est pourquoi la consigne est posée ici, en `<meta name="robots">`, servie
 * dans le HTML donc réellement lisible par le crawler.
 *
 * Aucun canonical n'est posé : une page qu'on ne veut pas indexer n'a pas
 * besoin d'une stratégie d'URL.
 */
export function noindexEcranApp(titre: string): Metadata {
  return {
    title: titre,
    robots: { index: false, follow: true },
  };
}
