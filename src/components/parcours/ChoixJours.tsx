"use client";

/* Les jours d'un programme : sept pastilles, on en choisit autant que le
   programme compte de séances par semaine. Toucher un jour de trop
   remplace le plus ancien choisi : on ne bloque jamais le doigt. */

import { LETTRES } from "@/lib/parcours";
import { DEGRADE, E } from "./commun";

const NOMS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export default function ChoixJours({ jours, nombre, onChange }: {
  jours: number[];
  /** Combien de jours choisir. */
  nombre: number;
  onChange: (jours: number[]) => void;
}) {
  const basculer = (j: number) => {
    if (jours.includes(j)) { onChange(jours.filter((x) => x !== j)); return; }
    const suite = [...jours, j];
    onChange((suite.length > nombre ? suite.slice(suite.length - nombre) : suite).sort((a, b) => a - b));
  };
  return (
    <div role="group" aria-label="Tes jours" className="flex gap-1.5">
      {LETTRES.map((l, i) => {
        const j = i + 1;
        const choisi = jours.includes(j);
        return (
          <button key={j} type="button" onClick={() => basculer(j)} aria-pressed={choisi} aria-label={NOMS[i]}
            className="flex-1 flex items-center justify-center cursor-pointer text-[16px]"
            style={{
              height: 44, borderRadius: 12,
              background: choisi ? DEGRADE : "#FFFFFF",
              color: choisi ? "#FFFFFF" : E.t1,
              fontWeight: choisi ? 700 : 500,
              border: choisi ? "none" : "1px solid rgba(31,27,46,0.12)",
            }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}
