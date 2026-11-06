"use client";

/* L'ancien questionnaire. Depuis les premiers pas (`/premiers-pas`), il ne sert
   plus qu'à MODIFIER ses réponses (`?edit=1`, depuis les Paramètres et le rappel
   du Guide), et à les relire en mode revue (`?review=1`).

   Une arrivée sans l'un des deux part sur les premiers pas, avec sa destination :
   un ancien lien ne doit pas remontrer l'ancien écran. */

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import ParcoursBienvenue from "@/components/bienvenue/ParcoursBienvenue";

const sansAbonnement = () => () => {};
const seGarde = () => {
  const q = new URLSearchParams(window.location.search);
  return q.get("edit") === "1" || q.get("review") === "1";
};

export default function BienvenuePage() {
  const router = useRouter();
  const garder = useSyncExternalStore(sansAbonnement, seGarde, () => false);

  useEffect(() => {
    if (seGarde()) return;
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next ? `/premiers-pas?next=${encodeURIComponent(next)}` : "/premiers-pas");
  }, [router]);

  return garder ? <ParcoursBienvenue /> : null;
}
