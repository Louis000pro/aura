import type { Metadata } from "next";

/**
 * Métadonnées de /guides — l'écran de revue des planches d'animation.
 *
 * Cette page est un OUTIL DE PRODUCTION, pas une page publique : elle affiche
 * les 102 personnages-guides d'un coup d'œil pour vérifier une vague après un
 * `npm run guides`. Elle n'a aucun lien entrant dans le site, aucun texte, et
 * ne répond à aucune question qu'un visiteur se poserait.
 *
 * Elle était pourtant indexable, et pire : sans `title` propre, elle héritait
 * de celui de l'accueil, donc Google voyait deux URL portant exactement le même
 * titre. Un doublon de title sur un domaine de dix pages est un vrai gâchis.
 *
 * On la sort donc de l'index sans la supprimer :
 *
 * - `index: false` : elle ne doit plus apparaître dans les résultats.
 * - `follow: true` : ses liens internes restent suivis, il n'y a aucune raison
 *   d'y couper la circulation.
 * - un `title` à elle, pour que le doublon disparaisse même le temps que les
 *   moteurs repassent, et pour que l'onglet du navigateur dise la vérité.
 *
 * Le canonical vers elle-même reste, et il n'est pas décoratif : sans lui, la
 * page hérite du canonical racine et annonce aux moteurs qu'elle EST l'accueil.
 * C'est un signal bien plus dommageable que la redondance avec le noindex.
 *
 * Aucun changement de son fonctionnement : le composant de la page n'est pas
 * touché, elle reste accessible à la même URL pour qui la connaît.
 */
export const metadata: Metadata = {
  title: "Galerie des personnages-guides",
  description:
    "Écran interne de revue des animations d'exercices Vaiiya. Cette page n'est pas destinée aux visiteurs.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://vaiiya.fr/guides" },
};

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
