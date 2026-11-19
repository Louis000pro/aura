"use client";

/* ════════════════════════════════════════════════════════════════════
   « CHANGER QUELQUE CHOSE » (maquette « Entraînement repensé », lot 1)

   La feuille qu'ouvre le champ en haut du Planning. On écrit ce qu'on
   veut changer, la liste se resserre (sans IA, `filtrerGestes`), et on
   touche un geste. Le Guide n'est appelé que par « Le dire à … » : la
   phrase part dans la saisie de la conversation, rien n'est envoyé
   tout seul (Louis : jamais d'appel à l'API à l'ouverture).
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { ChevronRight, Pencil, X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { PRENOM_GUIDE } from "@/lib/guides";
import { GROUPES, filtrerGestes, motsDeSaisie, type Geste } from "@/lib/changerQuelqueChose";

export default function ChangerQuelqueChose({ onClose, onGeste, onDemander }: {
  onClose: () => void;
  onGeste: (g: Geste) => void;
  onDemander: (phrase: string) => void;
}) {
  const { guide } = useGuideActif();
  const prenom = guide ? PRENOM_GUIDE[guide] : null;
  const [saisie, setSaisie] = useState("");
  const gestes = useMemo(() => filtrerGestes(saisie), [saisie]);
  const tape = motsDeSaisie(saisie).length > 0;
  const phrase = saisie.trim();

  return (
    <FeuilleBas onClose={onClose} hauteur="82dvh">
      <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
        <p className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>Changer quelque chose</p>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>
      <div className="px-5 flex-shrink-0">
        <label className="flex items-center gap-2.5 px-3.5 rounded-2xl" style={{ height: 48, background: "rgba(var(--text-3-rgb),0.14)" }}>
          <Pencil size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          <input autoFocus value={saisie} onChange={(e) => setSaisie(e.target.value)}
            placeholder="Écris-le : je pars 4 jours…" aria-label="Ce que tu veux changer" autoComplete="off"
            className="flex-1 min-w-0 bg-transparent border-none outline-none"
            style={{ color: "var(--text-0)" }} />
        </label>
      </div>

      <div className="overflow-y-auto px-5 flex-1 pt-1" style={{ scrollbarWidth: "none" }}>
        {GROUPES.map((gr) => {
          const liste = gestes.filter((g) => g.groupe === gr.id);
          if (!liste.length) return null;
          return (
            <div key={gr.id} className="mt-4">
              <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--text-2)" }}>{gr.titre}</p>
              {liste.map((g) => (
                <button key={g.id} type="button" onClick={() => onGeste(g)}
                  className="w-full flex items-center justify-between text-left bg-transparent border-none cursor-pointer py-[11px]"
                  style={{ borderBottom: "1px solid rgba(var(--text-3-rgb),0.12)" }}>
                  <span className="text-[16px] font-medium" style={{ color: "var(--text-0)" }}>{g.libelle}</span>
                  <ChevronRight size={15} strokeWidth={2.4} style={{ color: "var(--text-3)" }} />
                </button>
              ))}
            </div>
          );
        })}
        <div style={{ height: 8 }} />
      </div>

      <button type="button"
        onClick={() => onDemander(phrase)}
        className="mx-5 mt-2 mb-3 flex items-center gap-2.5 text-left bg-transparent border-none cursor-pointer flex-shrink-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <VisageGuide guide={guide} etat="listen" size={32} />
        <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
          {tape && !gestes.length ? "Rien de prévu pour ça. " : tape ? "Ou " : "Tu ne trouves pas ? "}
          <b style={{ color: "var(--exp-encre)" }}>
            {tape ? `Le dire à ${prenom ?? "ton Guide"} : « ${phrase} »` : `Dis-le à ${prenom ?? "ton Guide"}.`}
          </b>
        </span>
      </button>
    </FeuilleBas>
  );
}
