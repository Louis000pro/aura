import CommunauteShell from "@/components/communaute/CommunauteShell";
import { noindexEcranApp } from "@/lib/noindexEcranApp";

/**
 * Écran applicatif : hors des moteurs de recherche. Voir noindexEcranApp.
 * Couvre aussi `/communaute/[id]` et ses infos : ce sont des conversations
 * privées, elles ne doivent apparaître dans aucun index.
 *
 * Le layout était un composant client, et un composant client ne peut pas
 * exporter de `metadata`. La partie interactive (le panneau persistant des
 * conversations) a donc été déplacée dans `CommunauteShell`, à l'identique.
 */
export const metadata = noindexEcranApp("Messages");

export default function CommunauteLayout({ children }: { children: React.ReactNode }) {
  return <CommunauteShell>{children}</CommunauteShell>;
}
