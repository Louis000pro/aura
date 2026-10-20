"use client";

/* ════════════════════════════════════════════════════════════════════
   LA FORME DE L'ACCUEIL, PENDANT QU'IL SE CHARGE (Louis, 2026-10-20).

   L'accueil se montait morceau par morceau : le bonjour, puis le héros,
   puis la journée, chacun à son rythme, et la page sautait à chaque
   arrivée. Il se montre désormais d'un seul bloc, et ce squelette tient
   la place en attendant : les mêmes blocs, à la même hauteur, en lilas
   très pâle. La photo de la dernière séance vue est déjà là (elle est
   en cache), donc le plus gros de l'écran ne change pas à l'arrivée.

   Ce n'est pas un écran d'attente : l'accueil n'attend jamais plus
   d'une seconde et demie (`AccueilClient`), puis montre ce qu'il a.
   ════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import { Photo, photoHerosRetenue } from "@/components/entrainement/PhotoSeance";

const sansAbonnement = () => () => {};
const PALE = "rgba(var(--accent-rgb),0.09)";

export default function SqueletteAccueil() {
  const photoVue = useSyncExternalStore(sansAbonnement, photoHerosRetenue, () => null);
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full flex-shrink-0" style={{ width: 44, height: 44, background: PALE }} />
        <div className="flex flex-col gap-2">
          <div className="rounded-full" style={{ width: 84, height: 11, background: PALE }} />
          <div className="rounded-full" style={{ width: 150, height: 20, background: PALE }} />
        </div>
      </div>
      {photoVue ? (
        <Photo img={photoVue} prioritaire style={{ height: 400, borderRadius: "var(--r-affiche)", boxShadow: "var(--ombre-pose)" }} />
      ) : (
        <div style={{ height: 400, borderRadius: "var(--r-affiche)", background: PALE }} />
      )}
      <div style={{ height: 196, borderRadius: "var(--r-bloc)", background: PALE }} />
    </div>
  );
}
