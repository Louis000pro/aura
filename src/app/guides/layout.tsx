import type { Metadata } from "next";

/**
 * Métadonnées de /guides (la page est un composant client).
 *
 * On ne pose ici qu'un canonical vers elle-même, rien d'autre. L'architecture
 * de cette page fait partie du chantier « bibliothèque d'exercices », qui n'est
 * pas ouvert : ce fichier ne préjuge donc ni de son indexation ni de son URL
 * finale, il l'empêche seulement d'hériter d'un canonical vers l'accueil.
 */
export const metadata: Metadata = {
  alternates: { canonical: "https://vaiiya.fr/guides" },
};

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
