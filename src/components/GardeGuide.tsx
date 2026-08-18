"use client";

/* ════════════════════════════════════════════════════════════════════
   GardeGuide — la porte qui mène à l'écran de choix du Guide.

   ⚠️ FICHIER DORMANT. Il n'est monté NULLE PART, volontairement, et il
   ne doit pas l'être tant que les quatre conditions ne sont pas réunies :
     1. `20260818_guide_id.sql` est collé en base ;
     2. `/bienvenue` a été parcourue en vrai (Nora, Sasha, compte neuf,
        compte existant, `next=`, mobile) ;
     3. `<GuideProvider>` est remonté de `app/bienvenue/layout.tsx` vers
        `app/layout.tsx`, sans quoi la garde lirait un contexte absent et
        resterait bloquée sur « inconnu » partout ;
     4. la liste d'exemptions ci-dessous a été relue une dernière fois.

   Un fichier dormant et documenté vaut mieux qu'une redirection qui
   part trop tôt : ici, se tromper veut dire enfermer tous les comptes
   de la production dans un écran qui n'existe pas encore.

   Le monter, en phase 1C, c'est une ligne dans le layout, sous
   `<GuideProvider>`.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { estSurfacePublique } from "@/lib/surfacesPubliques";
import { destinationInterne } from "@/lib/destinationInterne";

/** La route de l'écran de choix. Elle existe depuis la phase 1B, mais
 *  rien n'y envoie personne : on y va soi-même, ou pas du tout. */
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
