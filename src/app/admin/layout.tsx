import { noindexEcranApp } from "@/lib/noindexEcranApp";

/** Écran applicatif : hors des moteurs de recherche. Voir noindexEcranApp.
    L'accès, lui, ne dépend pas de ce fichier : la page se garde elle-même
    (redirection sans compte, redirection sans `is_admin`) et les données
    restent protégées par les policies Supabase. Une consigne d'indexation
    n'a jamais protégé quoi que ce soit. */
export const metadata = noindexEcranApp("Admin");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
