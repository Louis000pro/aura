"use client";

/* ════════════════════════════════════════════════════════════════════
   Le bouton retour du téléphone ferme une vue interne au lieu de quitter
   l'écran.

   Même procédé que la feuille de la semaine ensemble : une entrée
   d'historique posée à l'ouverture, consommée à la fermeture.

   ⚠️ LES VUES S'EMPILENT, D'OÙ LA CLÉ. Le détail de la journée ouvre le
   mois par-dessus lui. Fermer le mois rejoue `history.back()`, donc un
   `popstate` que le détail entend aussi : s'il se fermait à chaque
   `popstate`, les deux vues partiraient d'un coup. Chaque vue vérifie
   donc qu'on a bien quitté SON entrée (sa clé n'est plus dans l'état) :
   revenir sur l'entrée du détail ne ferme que le mois.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";

export function useRetourTelephone(ouverte: boolean, cle: string, fermer: () => void) {
  const fermerRef = useRef(fermer);
  useEffect(() => { fermerRef.current = fermer; });

  useEffect(() => {
    if (!ouverte) return;
    history.pushState({ [cle]: true }, "");
    const surRetour = () => {
      if (!history.state?.[cle]) fermerRef.current();
    };
    window.addEventListener("popstate", surRetour);
    return () => {
      window.removeEventListener("popstate", surRetour);
      if (history.state?.[cle]) history.back();
    };
  }, [ouverte, cle]);
}
