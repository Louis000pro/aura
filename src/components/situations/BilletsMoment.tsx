"use client";

/* ════════════════════════════════════════════════════════════════════
   « EN CE MOMENT » : LES BILLETS EN HAUT DU PLANNING (lot 2)

   Un billet par situation en cours ou à venir, et un par absence. Chaque
   genre a sa bande, la même que celle qui court le long des jours dans
   le fil : on relie le billet et les jours qu'il touche d'un coup d'œil.
   Le dernier billet ouvre « Changer quelque chose ».
   ════════════════════════════════════════════════════════════════════ */

import { effetCourt, nomGene, periode, TITRE, type GenreSituation, type Situation } from "@/lib/situations";
import { dateCourte } from "@/lib/situations";
import type { Absence } from "@/lib/projection";

/** La bande d'un genre : la même dans le billet et le long des jours. */
export const BANDE: Record<GenreSituation | "absence", React.CSSProperties> = {
  moins_de_temps: { backgroundImage: "radial-gradient(circle, #E8620C 1.6px, transparent 1.9px)", backgroundSize: "5px 6px", backgroundPosition: "center top" },
  gene: { backgroundImage: "repeating-linear-gradient(135deg, #6D4BD6 0 2px, transparent 2px 5px)" },
  energie: { backgroundImage: "repeating-linear-gradient(to bottom, #2BD4A0 0 3px, transparent 3px 6px)" },
  materiel: { background: "rgba(139,92,246,.45)" },
  evenement: { background: "linear-gradient(to bottom, transparent 0 60%, #E8620C 60%)" },
  autre_sport: { backgroundImage: "repeating-linear-gradient(to bottom, #E8620C 0 2px, transparent 2px 7px)" },
  jours_moment: { backgroundImage: "repeating-linear-gradient(to bottom, #6D4BD6 0 6px, transparent 6px 9px)" },
  absence: { background: "var(--text-2)" },
};

export function genreDe(s: Situation): GenreSituation { return s.reglages.genre; }

export default function BilletsMoment({ situations, absences, aujourdhui, nomEtape, onOuvrir, onAbsence, onAjouter }: {
  situations: Situation[];
  absences: Absence[];
  aujourdhui: string;
  nomEtape: (id: string) => string | null;
  onOuvrir: (s: Situation) => void;
  onAbsence: () => void;
  onAjouter: () => void;
}) {
  return (
    <div className="mt-4">
      <span className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>En ce moment</span>
      <div className="flex gap-2 mt-1.5 -mx-5 px-5 pb-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {absences.map((a) => (
          <Billet key={`abs-${a.debut}`} bande={BANDE.absence} titre="Absence"
            sous={`${a.debut === a.fin ? `le ${dateCourte(a.debut)}` : `du ${dateCourte(a.debut)} au ${dateCourte(a.fin)}`} · programme en pause`}
            onClick={onAbsence} />
        ))}
        {situations.map((s) => (
          <Billet key={s.id} bande={BANDE[genreDe(s)]}
            titre={s.reglages.genre === "gene" ? nomGene(s.reglages.zones) : s.reglages.genre === "evenement" && s.motif ? s.motif : TITRE[genreDe(s)]}
            sous={s.reglages.genre === "evenement" ? `le ${dateCourte(s.fin)} · pas de séance ce jour-là` : `${periode(s, aujourdhui)} · ${effetCourt(s, nomEtape)}`}
            onClick={() => onOuvrir(s)} />
        ))}
        <button type="button" onClick={onAjouter}
          className="flex-none flex items-center px-[13px] py-2 rounded-[14px] text-[13px] font-bold cursor-pointer bg-transparent whitespace-nowrap"
          style={{ border: "1.5px dashed rgba(109,75,214,.5)", color: "var(--exp-encre)", minHeight: 48 }}>
          + Il se passe quelque chose
        </button>
      </div>
    </div>
  );
}

function Billet({ bande, titre, sous, onClick }: { bande: React.CSSProperties; titre: string; sous: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex-none flex items-stretch gap-[9px] text-left border-none cursor-pointer rounded-[14px]"
      style={{ padding: "8px 12px 8px 9px", minHeight: 48, background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)" }}>
      <span aria-hidden className="rounded-[3px] flex-none" style={{ width: 5, ...bande }} />
      <span className="min-w-0">
        <b className="block text-[13px] font-bold leading-tight whitespace-nowrap" style={{ color: "var(--text-0)" }}>{titre}</b>
        <small className="block text-[11px] leading-snug whitespace-nowrap" style={{ color: "var(--text-2)" }}>{sous}</small>
      </span>
    </button>
  );
}
