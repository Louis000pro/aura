"use client";

/* ════════════════════════════════════════════════════════════════════
   LES ÉCRANS D'UN PROGRAMME, MONTÉS UNE FOIS PAR ÉCRAN HÔTE.

   L'accueil (le héros) et Entraînement (la rangée « Suivre un
   programme ») ouvrent les mêmes écrans : la semaine, le test, la fin et
   la fiche. Ils vivent ici, avec ce qui les relie (le test final ouvre la
   fin, la fin ouvre la fiche du suivant), pour ne pas écrire ce câblage
   deux fois.

   ⚠️ LA FIN GARDE LE PROGRAMME QU'ELLE MONTRE. Une fois le test final
   noté, la relecture ne trouve plus de programme en cours ; la fin a donc
   reçu sa copie au moment de la note.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import type { Journee } from "@/hooks/useJournee";
import type { ParcoursLu } from "@/lib/parcoursBase";
import { programmeParId, type IdParcours } from "@/lib/parcours";
import FicheProgramme, { nomsDuCycle } from "./FicheProgramme";
import FinParcours from "./FinParcours";
import SemaineParcours from "./SemaineParcours";
import TestParcours from "./TestParcours";

export type VueParcours =
  | { genre: "semaine" }
  | { genre: "test" }
  | { genre: "fiche"; id: IdParcours }
  | { genre: "fin"; lu: ParcoursLu; valeur: number }
  | null;

function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function ParcoursEcrans({ vue, onVue, j, premium, onPremium }: {
  vue: VueParcours;
  onVue: (v: VueParcours) => void;
  /** La journée de l'écran hôte (`useJournee`). */
  j: Pick<Journee, "parcours" | "lectureParcours" | "programme" | "etape" | "lancerParcours">;
  premium: boolean;
  onPremium: () => void;
}) {
  const [jour] = useState(aujourdhuiParis);
  const cycle = j.programme && j.programme.cycle.length > 0
    ? { noms: nomsDuCycle(j.programme.cycle.map((e) => e.nom)), etape: j.etape?.nom ?? null }
    : null;
  const reprise = cycle
    ? `${cycle.noms} ${cycle.noms.includes(" et ") ? "reprennent" : "reprend"}${cycle.etape ? ` à ${cycle.etape}` : ""}, là où tu en étais.`
    : null;
  const fermer = () => onVue(null);

  if (!vue) return null;

  if (vue.genre === "semaine" && j.parcours) {
    return (
      <SemaineParcours
        parcours={j.parcours}
        aujourdhui={jour}
        reprise={reprise}
        onFermer={fermer}
        onLancer={() => { fermer(); j.lancerParcours(); }}
        onTest={() => onVue({ genre: "test" })}
      />
    );
  }

  if (vue.genre === "test" && j.parcours) {
    const lu = j.parcours.lu;
    return (
      <TestParcours
        parcours={j.parcours}
        onFermer={fermer}
        onTermine={(valeur) => onVue({ genre: "fin", lu: { ...lu, testFin: valeur }, valeur })}
      />
    );
  }

  if (vue.genre === "fin") {
    return (
      <FinParcours
        lu={vue.lu}
        valeur={vue.valeur}
        cycle={cycle}
        onFermer={fermer}
        onProgramme={(id) => onVue({ genre: "fiche", id })}
      />
    );
  }

  if (vue.genre === "fiche") {
    const def = programmeParId(vue.id);
    if (!def) return null;
    return (
      <FicheProgramme
        def={def}
        ouvert
        onFermer={fermer}
        lecture={j.lectureParcours}
        cycle={cycle}
        premium={premium}
        onPremium={onPremium}
        onVoirEnCours={j.parcours ? () => onVue({ genre: "semaine" }) : undefined}
      />
    );
  }

  return null;
}
