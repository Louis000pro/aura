import { noindexEcranApp } from "@/lib/noindexEcranApp";

/** Écran applicatif : hors des moteurs de recherche. Voir noindexEcranApp. */
export const metadata = noindexEcranApp("Paramètres");

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
