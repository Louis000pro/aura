import { noindexEcranApp } from "@/lib/noindexEcranApp";

/**
 * Écran applicatif : hors des moteurs de recherche. Voir noindexEcranApp.
 *
 * Ce layout couvre aussi `/profil/[username]`, et c'est voulu : les profils
 * sont privés par défaut, ils n'ont donc rien à faire dans un index public.
 * D'où un titre neutre, qui vaut pour son profil comme pour celui d'un autre.
 */
export const metadata = noindexEcranApp("Profil");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
