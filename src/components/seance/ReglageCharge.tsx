"use client";

/* ════════════════════════════════════════════════════════════════════
   R3 · LES COMPTEURS DU TUNNEL (maquette 07, écrans 02 et 04)

   Deux petits réglages, sans logique propre : les valeurs et les pas
   viennent de `saisieSerie.ts`.

   ⚠️ LA CHARGE SE TOUCHE POUR ÊTRE ÉCRITE EXACTEMENT (tour 26 de Codex).
   − / + sont des raccourcis ; 1,25 kg ou une machine à 7 kg doivent
   pouvoir s'écrire. Une valeur vidée redevient inconnue, jamais zéro.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { chargeSaisie, crancherCharge, nombreFr, type TypeChargeReglable } from "@/lib/saisieSerie";

const BOUTON = "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer";
const FOND = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "#F0ECFA" };

/** − valeur + : un compteur simple (les répétitions). */
export function Compteur({ valeur, onMoins, onPlus }: { valeur: string; onMoins: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onMoins} className={BOUTON} style={FOND} aria-label="Moins"><Minus size={16} /></button>
      <span className="vy-nombre text-[20px] w-12 text-center" style={{ fontWeight: 700, color: "#fff" }}>{valeur}</span>
      <button type="button" onClick={onPlus} className={BOUTON} style={FOND} aria-label="Plus"><Plus size={16} /></button>
    </div>
  );
}

/** − charge + ; toucher la valeur ouvre la saisie exacte. */
export function ReglageCharge({ valeur, type, onChange, onFin }: {
  valeur: number | null;
  type: TypeChargeReglable;
  onChange: (v: number | null) => void;
  /** Présent sous les répétitions : un « OK » referme le réglage. */
  onFin?: () => void;
}) {
  const [saisie, setSaisie] = useState<string | null>(null);
  const suffixe = type === "par_haltere" ? "kg / haltère" : "kg";
  const valider = () => {
    if (saisie !== null) onChange(chargeSaisie(saisie));
    setSaisie(null);
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(crancherCharge(valeur, type, -1))} className={BOUTON} style={FOND} aria-label="Moins lourd">
        <Minus size={16} />
      </button>
      {saisie !== null ? (
        <input
          autoFocus
          inputMode="decimal"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onBlur={valider}
          onKeyDown={(e) => { if (e.key === "Enter") valider(); }}
          className="vy-nombre w-20 text-center rounded-lg py-1.5 text-[20px] outline-none"
          style={{ fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(201,184,255,0.5)" }}
          aria-label={`Charge en ${suffixe}`}
        />
      ) : (
        <button type="button" onClick={() => setSaisie(valeur === null ? "" : nombreFr(valeur))}
          className="flex flex-col items-center w-20 cursor-pointer" aria-label="Écrire la charge exacte">
          <span className="vy-nombre text-[20px] leading-none" style={{ fontWeight: 700, color: "#fff" }}>
            {valeur === null ? "?" : nombreFr(valeur)}
          </span>
          <span className="text-[11px] mt-1" style={{ color: "#A79FC0" }}>{suffixe}</span>
        </button>
      )}
      <button type="button" onClick={() => onChange(crancherCharge(valeur, type, 1))} className={BOUTON} style={FOND} aria-label="Plus lourd">
        <Plus size={16} />
      </button>
      {onFin && (
        <button type="button" onClick={() => { valider(); onFin(); }}
          className="ml-1 px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer text-white"
          style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)" }}>
          OK
        </button>
      )}
    </div>
  );
}
