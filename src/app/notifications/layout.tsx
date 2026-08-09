import { noindexEcranApp } from "@/lib/noindexEcranApp";

/** Écran applicatif : hors des moteurs de recherche. Voir noindexEcranApp. */
export const metadata = noindexEcranApp("Notifications");

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
