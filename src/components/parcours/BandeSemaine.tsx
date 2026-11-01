"use client";

/* « Ta semaine 2 », sous le héros de l'accueil pendant un programme
   (maquette « Les programmes », version 2, écran « L'accueil pendant le
   programme »). Sept jours : fait (teal, coché), aujourd'hui (violet),
   prévu (pointillés). Toucher la bande ouvre la semaine du programme.
   Elle vit dans un écran à thème : ses couleurs passent par les jetons. */

import { Check, ChevronRight } from "lucide-react";
import type { EtatParcours } from "@/hooks/useJournee";

const NB = String.fromCharCode(160);

export default function BandeSemaine({ parcours, aujourdhui, onOuvrir }: {
  parcours: EtatParcours;
  aujourdhui: string;
  onOuvrir: () => void;
}) {
  const semaine = parcours.prochain?.semaine ?? parcours.lu.def.semaines;
  return (
    <button type="button" onClick={onOuvrir} aria-label={`Ta semaine ${semaine} du programme ${parcours.lu.def.titre}`}
      className="w-full text-left cursor-pointer block"
      style={{
        marginTop: 14, padding: "14px 16px", borderRadius: "var(--r-bloc)",
        background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)",
      }}>
      <span className="flex items-center justify-between">
        <span className="text-[13px] font-bold" style={{ color: "var(--text-2)" }}>Ta semaine{NB}{semaine}</span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden style={{ color: "var(--text-3)" }} />
      </span>
      <span className="flex justify-between mt-2.5">
        {parcours.semaine.map((d) => {
          const c = d.creneau;
          const auj = d.date === aujourdhui;
          const prochain = !!c && !c.fait && c.rang === parcours.prochain?.rang;
          return (
            <span key={d.date} className="flex flex-col items-center">
              <span className="text-[13px]" style={{ color: auj ? "var(--text-0)" : "var(--text-3)", fontWeight: auj ? 800 : 500 }}>{d.lettre}</span>
              <span className="mt-1.5 flex items-center justify-center rounded-full"
                style={{
                  width: 34, height: 34, boxSizing: "border-box",
                  background: c?.fait ? "var(--teal-encre)" : prochain && auj ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "transparent",
                  border: c && !c.fait && !(prochain && auj) ? "2px dashed rgba(139,92,246,0.45)" : "none",
                }}>
                {c?.fait && <Check size={16} strokeWidth={3} color="#FFFFFF" aria-hidden />}
              </span>
            </span>
          );
        })}
      </span>
    </button>
  );
}
