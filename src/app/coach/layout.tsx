import { noindexEcranApp } from "@/lib/noindexEcranApp";

/**
 * Écran applicatif : le chat de l'assistant, pas une page vitrine. Il a aussi
 * quitté le sitemap. Ne pas le confondre avec `/coach-ia`, qui est la page
 * publique sur le coach sportif IA et reste indexable.
 */
export const metadata = noindexEcranApp("Coach");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
