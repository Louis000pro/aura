"use client";

/* La proposition du Guide, posée dans le fil sur le jour concerné (lot 5).
   Le visage, la phrase écrite d'avance, puis trois gestes en texte : le
   premier agit tout de suite, le second l'écarte sans rappel, le dernier
   pose une phrase dans la conversation (seul moment où l'IA peut être
   appelée, et c'est la personne qui envoie). Ni carte, ni cadre : c'est
   quelqu'un qui parle dans le fil, pas un bloc de plus. */

import { useState } from "react";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { programmeParId, type IdParcours } from "@/lib/parcours";
import type { ParcoursLu } from "@/lib/parcoursBase";
import { lireEcartees, noterEcartee } from "@/lib/propositionsBase";
import type { GuideRef } from "@/lib/guides";
import { propositionFinProgramme, type Proposition } from "@/lib/propositionsGuide";

export default function PropositionGuide({ proposition: p, guide, envoi, onGeste, onLaisser, onParler }: {
  proposition: Proposition;
  guide: GuideRef;
  envoi: boolean;
  onGeste: () => void;
  onLaisser: () => void;
  onParler: () => void;
}) {
  return (
    <div role="note" className="grid gap-2.5 py-2.5 pl-1.5 pr-2" style={{ gridTemplateColumns: "34px minmax(0,1fr)" }}>
      <VisageGuide guide={guide} etat="explain" size={34} />
      <div className="min-w-0">
        <p className="text-[13px]" style={{ color: "var(--text-1)", lineHeight: 1.4 }}>{p.phrase}</p>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-1.5">
          <button type="button" disabled={envoi} onClick={onGeste}
            className="text-[13px] font-bold bg-transparent border-none p-0 cursor-pointer min-h-[32px]"
            style={{ color: "var(--exp-encre)", opacity: envoi ? 0.5 : 1 }}>
            {p.geste}
          </button>
          <button type="button" disabled={envoi} onClick={onLaisser}
            className="text-[13px] font-semibold bg-transparent border-none p-0 cursor-pointer min-h-[32px]"
            style={{ color: "var(--text-2)" }}>
            {p.laisser}
          </button>
          <button type="button" disabled={envoi} onClick={onParler}
            className="text-[13px] font-semibold bg-transparent border-none p-0 cursor-pointer min-h-[32px]"
            style={{ color: "var(--text-2)" }}>
            En parler
          </button>
        </div>
      </div>
    </div>
  );
}

/** Pendant un programme daté, le fil n'est pas affiché : la seule
 *  proposition qui compte est la suite, dans la semaine qui finit. */
export function PropositionFinProgramme({ userId, parcours, fin, aujourdhui, onVoir, onDemander }: {
  userId: string;
  parcours: ParcoursLu;
  fin: string;
  aujourdhui: string;
  onVoir: (id: IdParcours) => void;
  onDemander: (phrase: string) => void;
}) {
  const { guide } = useGuideActif();
  const [ecartees, setEcartees] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : lireEcartees(userId)));
  const suivant = programmeParId(parcours.def.suivant);
  const p = propositionFinProgramme({
    aujourdhui, parcoursId: parcours.id, titre: parcours.def.titre, fin,
    suivant: suivant ? { id: suivant.id, titre: suivant.titre } : null, vues: ecartees,
  }, guide);
  if (!p || !suivant) return null;
  const ecarter = () => { noterEcartee(userId, p.cle); setEcartees((v) => new Set(v).add(p.cle)); };
  return (
    <PropositionGuide proposition={p} guide={guide} envoi={false}
      onGeste={() => { ecarter(); onVoir(suivant.id); }}
      onLaisser={ecarter}
      onParler={() => { ecarter(); onDemander(p.parler); }} />
  );
}
