"use client";

/* ════════════════════════════════════════════════════════════════════
   GardeGuide — la porte qui mène à l'écran de choix du Guide.

   MONTÉ dans `app/layout.tsx` depuis le 2026-08-22 (phase 1C), sous
   `<GuideProvider>`. Il a dormi jusque-là, le temps que `/bienvenue`
   soit réellement parcourable : se tromper ici, c'est enfermer tous les
   comptes de la production dans un écran qui n'est pas prêt.

   ⚠️ IL NE REDIRIGE QUE SUR L'ÉTAT « AUCUN », c'est-à-dire quand la base
   a répondu et que `guide_id` vaut réellement NULL. « chargement » veut
   dire qu'on ne sait pas encore, et « inconnu » que la lecture a échoué
   (colonne pas encore là, hors ligne, session expirée) : dans ces deux
   cas on ne bouge pas. Tant que `20260818_guide_id.sql` n'est pas collée,
   cette garde n'envoie donc personne nulle part, et l'app se comporte
   exactement comme avant.

   ⚠️ Et `/bienvenue` sait vivre sans lui : quand l'état est « inconnu »,
   le parcours saute la question du Guide et pose directement celles du
   profil, plutôt que d'offrir un choix qu'il ne pourrait pas écrire.
   C'est ce qui garantit qu'aucune porte de l'app ne mène à un mur.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { estSurfacePublique } from "@/lib/surfacesPubliques";
import { destinationInterne } from "@/lib/destinationInterne";

/** La route du questionnaire d'entrée : le choix du Guide, puis le
 *  profil. C'est la SEULE porte, depuis le 2026-08-22 : la ligne « Mon
 *  corps et mes objectifs » des Paramètres et le rappel du Guide y
 *  mènent aussi. */
export const ROUTE_BIENVENUE = "/bienvenue";

/* Routes où la question ne doit jamais s'imposer, en plus des surfaces
   publiques (vitrine, pages SEO, légal, /premium pour un anonyme) :
     · l'écran de choix lui-même, sinon il se redirige en boucle ;
     · l'authentification, où l'on n'a pas encore de compte à écrire ;
     · l'invitation au relais, qui se lit sans compte et dont c'est tout
       l'intérêt (voir la page publique /rejoindre). */
const EXEMPTES = [ROUTE_BIENVENUE, "/auth", "/rejoindre"];

function estExempte(pathname: string): boolean {
  return EXEMPTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export default function GardeGuide() {
  const { user } = useAuth();
  const { etat } = useGuideActif();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    /* SEULEMENT `aucun`. `chargement` veut dire qu'on ne sait pas encore,
       et `inconnu` que la lecture a échoué : rediriger dans ces deux cas
       enverrait vers un écran qui a besoin du réseau pour écrire
       quelqu'un qui n'a justement pas de réseau. */
    if (etat !== "aucun") return;
    if (estExempte(pathname)) return;
    if (estSurfacePublique(pathname, true)) return;

    /* La destination voulue est conservée : une notification touchée mène
       bien à sa conversation, après le choix du Guide, pas à l'accueil.
       La requête est relue sur `window` plutôt qu'avec `useSearchParams`,
       qui imposerait une frontière <Suspense> autour de ce composant le
       jour où il sera monté dans le layout racine. */
    const q = typeof window !== "undefined" ? window.location.search : "";
    const voulue = destinationInterne(pathname + q, "");
    router.replace(voulue ? `${ROUTE_BIENVENUE}?next=${encodeURIComponent(voulue)}` : ROUTE_BIENVENUE);
  }, [user, etat, pathname, router]);

  return null;
}
