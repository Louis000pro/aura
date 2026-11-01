"use client";

/* ════════════════════════════════════════════════════════════════════
   LES FEUILLES DE FILTRES (maquette « Trouver ma séance », version 2) :
   un filtre seul (« Zone », « Durée »…) dans une petite feuille, ou tous
   d'un coup (« Filtres »).

   On coche sur un BROUILLON : la feuille ne change rien tant qu'on n'a
   pas touché « Voir N séances », et ce bouton dit combien de séances
   restent avant de fermer (zéro : « Voir les plus proches »). La croix
   ferme sans rien changer.

   ⚠️ Aucun filtre Vaiiya+ : une séance Vaiiya+ est marquée, jamais cachée.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  GROUPES, SANS_FILTRE, basculer, choisis, compter, effacerGroupe, pluriel,
  type Filtres, type IdGroupe, type SeanceTrouvable,
} from "@/lib/trouverSeance";

export default function FeuilleFiltres({ groupe, filtres, seances, onAppliquer, onFermer }: {
  /** Un groupe seul, ou « tout ». */
  groupe: IdGroupe | "tout";
  filtres: Filtres;
  seances: SeanceTrouvable[];
  onAppliquer: (f: Filtres) => void;
  onFermer: () => void;
}) {
  useEffect(() => lockBodyModal(), []);
  const [brouillon, setBrouillon] = useState<Filtres>(filtres);
  const n = compter(seances, brouillon);
  const tout = groupe === "tout";
  const def = tout ? null : GROUPES.find((g) => g.id === groupe)!;
  const effacer = () => setBrouillon(tout ? SANS_FILTRE : effacerGroupe(brouillon, groupe as IdGroupe));

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[105] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(12,8,22,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}
    >
      <motion.div
        initial={{ y: 64, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        role="dialog" aria-modal="true" aria-label={tout ? "Filtres" : def!.titre}
        className="w-full max-w-lg rounded-t-[var(--r-feuille)] md:rounded-[var(--r-feuille)] overflow-hidden flex flex-col"
        style={{ maxHeight: tout ? "92dvh" : "80dvh", background: "rgb(var(--surface-rgb))", boxShadow: "0 -12px 40px rgba(20,16,32,0.22)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 md:hidden flex-shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.35 }} />
        </div>
        <div className="relative h-[52px] flex items-center justify-between pl-2 pr-3 flex-shrink-0"
          style={{ borderBottom: tout ? "1px solid rgba(var(--accent-rgb),0.1)" : undefined }}>
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="w-10 h-10 flex items-center justify-center cursor-pointer bg-transparent border-none">
            <X size={20} strokeWidth={2.2} style={{ color: "var(--text-0)" }} />
          </button>
          <p className="absolute inset-x-0 text-center vy-sous pointer-events-none" style={{ color: "var(--text-0)" }}>
            {tout ? "Filtres" : def!.titre}
          </p>
          <button type="button" onClick={effacer}
            className="relative px-2 py-2 text-[13px] font-semibold cursor-pointer bg-transparent border-none"
            style={{ color: "var(--exp-encre)" }}>
            {tout ? "Tout effacer" : "Effacer"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
          {tout ? (
            <>
              {GROUPES.map((g) => (
                <section key={g.id} className="mt-6">
                  <p className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>{g.titre}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {g.options.map((o) => {
                      const actif = choisis(brouillon, g.id).includes(o.id);
                      return (
                        <button key={o.id} type="button" aria-pressed={actif}
                          onClick={() => setBrouillon(basculer(brouillon, g.id, o.id))}
                          className="h-10 rounded-full inline-flex items-center gap-1.5 text-[16px] cursor-pointer whitespace-nowrap"
                          style={actif
                            ? { padding: "0 14px 0 11px", border: "1.5px solid var(--accent)", background: "rgba(var(--accent-rgb),0.12)", color: "var(--exp-encre)", fontWeight: 600 }
                            : { padding: "0 14px", border: "1px solid rgba(var(--accent-rgb),0.18)", background: "transparent", color: "var(--text-0)", fontWeight: 500 }}>
                          {actif && <Check size={14} strokeWidth={3} />}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  {g.aide && <p className="text-[13px] font-medium mt-2" style={{ color: "var(--text-2)" }}>{g.aide}</p>}
                </section>
              ))}
              <div className="mt-6 pt-4 flex items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.1)" }}>
                <div>
                  <p className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>Sans saut</p>
                  <p className="text-[13px] font-medium mt-0.5" style={{ color: "var(--text-2)" }}>Rien qui résonne chez les voisins.</p>
                </div>
                <button type="button" role="switch" aria-checked={brouillon.sansSaut} aria-label="Sans saut"
                  onClick={() => setBrouillon({ ...brouillon, sansSaut: !brouillon.sansSaut })}
                  className="relative flex-shrink-0 w-[52px] h-8 rounded-full cursor-pointer border-none p-0 transition-colors"
                  style={{ background: brouillon.sansSaut ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--accent-rgb),0.18)" }}>
                  <span className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-all"
                    style={{ left: brouillon.sansSaut ? 23 : 3, boxShadow: "0 1px 3px rgba(31,27,46,0.25)" }} />
                </button>
              </div>
            </>
          ) : (
            <div role={def!.unique ? "radiogroup" : "group"} aria-label={def!.titre}>
              {def!.options.map((o, i) => {
                const actif = choisis(brouillon, def!.id).includes(o.id);
                return (
                  <button key={o.id} type="button"
                    role={def!.unique ? "radio" : "checkbox"} aria-checked={actif}
                    onClick={() => setBrouillon(basculer(brouillon, def!.id, o.id))}
                    className="w-full h-12 flex items-center justify-between text-left cursor-pointer bg-transparent border-none"
                    style={{ borderTop: i === 0 ? "none" : "1px solid rgba(var(--accent-rgb),0.08)" }}>
                    <span className="text-[16px]" style={{ color: actif ? "var(--exp-encre)" : "var(--text-0)", fontWeight: actif ? 600 : 500 }}>{o.label}</span>
                    <span aria-hidden className="w-[22px] h-[22px] flex items-center justify-center flex-shrink-0"
                      style={{
                        borderRadius: def!.unique ? 999 : 7,
                        background: actif ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "transparent",
                        border: actif ? "none" : "1.5px solid rgba(var(--accent-rgb),0.32)",
                      }}>
                      {actif && <Check size={14} strokeWidth={3.2} color="#FFFFFF" />}
                    </span>
                  </button>
                );
              })}
              {def!.aide && <p className="text-[13px] font-medium mt-2" style={{ color: "var(--text-2)" }}>{def!.aide}</p>}
            </div>
          )}
        </div>

        <div className="px-5 pt-3 flex-shrink-0" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(var(--accent-rgb),0.08)" }}>
          <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => onAppliquer(brouillon)}
            className="w-full h-[52px] rounded-full text-[16px] font-bold text-white cursor-pointer border-none"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
            {n > 0 ? <>Voir <span className="vy-nombre" style={{ fontWeight: 700 }}>{n}</span> {pluriel(n).replace(/^\d+ /, "")}</> : "Voir les plus proches"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
