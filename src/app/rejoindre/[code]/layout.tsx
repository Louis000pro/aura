import { noindexEcranApp } from "@/lib/noindexEcranApp";

/**
 * Invitation à un relais. Page publique par nécessité (on doit pouvoir
 * l'ouvrir sans compte), mais chaque URL est un code d'invitation jetable et
 * personnel : rien qui doive vivre dans un index de moteur de recherche.
 */
export const metadata = noindexEcranApp("Rejoindre un relais");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
