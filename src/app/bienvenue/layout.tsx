import { noindexEcranApp } from "@/lib/noindexEcranApp";
import { GuideProvider } from "@/context/GuideContext";

export const metadata = noindexEcranApp("Bienvenue · Vaiiya");

/* ⚠️ `GuideProvider` est monté ICI, sur cette seule route, et PAS dans
   `app/layout.tsx`.

   Monté globalement, il ferait une lecture de `profiles.guide_id` à
   chaque ouverture de l'app, pour tout le monde. Tant que la migration
   `20260818_guide_id.sql` n'est pas collée, ce serait une requête en
   échec par session et par compte, sur un projet dont l'egress Supabase
   a déjà explosé une fois.

   Ici, seul quelqu'un qui vient réellement choisir son Guide déclenche
   la lecture. Le jour où la garde s'active (phase 1C), le provider
   remontera dans le layout racine et ce fichier n'aura plus qu'à
   disparaître : le contexte est le même, aucun composant ne change. */
export default function BienvenueLayout({ children }: { children: React.ReactNode }) {
  return <GuideProvider>{children}</GuideProvider>;
}
