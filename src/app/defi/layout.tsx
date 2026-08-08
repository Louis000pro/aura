import { noindexEcranApp } from "@/lib/noindexEcranApp";

/** Écran applicatif : hors des moteurs de recherche. Voir noindexEcranApp. */
export const metadata = noindexEcranApp("Le relais");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
