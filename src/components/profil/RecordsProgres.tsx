"use client";

/* ─────────────────────────────────────────────────────────────
   La fiche d'un record (maquette « Les records Vaiiya », 2026-10-22).
   La liste des records vit dans Entraînement › Progrès depuis le lot 4
   (« Avant, maintenant », `components/progres/VueProgres.tsx`).

   ⚠️ Gratuit, sans EXP, sans comparaison : un record ne se mesure qu'à soi.
   ───────────────────────────────────────────────────────────── */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Share2, X } from "lucide-react";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import ExerciseDetailSheet from "@/components/seance/ExerciseDetailSheet";
import Sheet from "@/components/communaute/Sheet";
import { useAuth } from "@/context/AuthContext";
import { partagerAfficheRecord } from "@/lib/recordShareExport";
import { trouverExercice } from "@/lib/exerciseLibrary";
import {
  retirerRecordManuel, valeurRecord, uniteRecord, texteRecord, dateRecord, dateCourte, phraseChemin,
  type RecordMouvement,
} from "@/lib/records";

const DEGRADE = "linear-gradient(135deg, #8B5CF6, #C13BC1)";
const CHIFFRE_DEGRADE: React.CSSProperties = {
  background: DEGRADE, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
};

/** La fiche d'un record : le chiffre, l'escalier de ses marches, le chemin. */
export function FicheRecord({ record: r, onFermer, onRetire }: {
  record: RecordMouvement;
  onFermer: () => void;
  /** Donné seulement là où on peut retirer une valeur ajoutée à la main. */
  onRetire?: () => void;
}) {
  const [mouvement, setMouvement] = useState(false);
  const exo = trouverExercice(r.nom);
  const marches = r.marches.slice(-5);
  const max = Math.max(...marches.map((m) => m.valeur));
  const min = Math.min(...marches.map((m) => m.valeur));
  const hauteur = (v: number) => (max === min ? 84 : 30 + ((v - min) / (max - min)) * 54);
  const chemin = phraseChemin(r);

  const { user } = useAuth();
  const [envoi, setEnvoi] = useState(false);
  const [retrait, setRetrait] = useState<"repos" | "confirmer" | "envoi" | "rate">("repos");
  /* Seule une valeur ajoutée à la main se retire : une séance se supprime
     depuis son affiche, et ses séries partent avec elle. */
  const idManuel = onRetire ? r.meilleur.manuel : undefined;
  const retirer = async () => {
    if (!idManuel || retrait === "envoi") return;
    setRetrait("envoi");
    const ok = await retirerRecordManuel(idManuel);
    if (ok) onRetire?.(); else setRetrait("rate");
  };
  /* L'affiche du record (`recordShareExport`) : le chiffre, ce qu'il y
     avait avant, l'escalier. Le texte seul ne reste qu'en dernier recours. */
  const partager = async () => {
    if (envoi) return;
    setEnvoi(true);
    try {
      const avant = r.marches.length > 1 ? r.marches[r.marches.length - 2] : null;
      const res = await partagerAfficheRecord({ nom: r.nom, mesure: r.mesure, meilleur: r.meilleur, avant, marches: r.marches, user: user?.pseudo });
      if (res === "error") {
        const texte = `Mon record sur Vaiiya · ${r.nom} : ${texteRecord(r.mesure, r.meilleur)}.`;
        if (navigator.share) await navigator.share({ text: texte, url: "https://vaiiya.fr" });
      }
    } catch { /* partage annulé */ }
    finally { setEnvoi(false); }
  };

  return (
    <>
      <Sheet onFermer={onFermer}>
        <div className="flex flex-col px-[22px] pb-6" role="dialog" aria-label={`Record : ${r.nom}`}>
          <div className="mt-1 flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px]" style={{ color: "var(--text-2)" }}>Ton record</span>
              <h2 className="vy-titre" style={{ fontSize: 26 }}>{r.nom}</h2>
            </div>
            <button type="button" onClick={onFermer} aria-label="Fermer"
              className="flex h-10 w-10 items-center justify-center rounded-full cursor-pointer"
              style={{ background: "rgba(var(--text-3-rgb),0.1)", color: "var(--text-2)" }}>
              <X size={18} />
            </button>
          </div>

          <div className="mt-2 flex items-end">
            <div className="flex flex-1 flex-col">
              <b className="vy-nombre leading-[0.86]" style={{ fontSize: 92, fontWeight: 800, ...CHIFFRE_DEGRADE }}>
                {valeurRecord(r.mesure, r.meilleur)}
              </b>
              <span className="mt-1.5 text-[16px] font-semibold" style={{ color: "var(--text-2)" }}>
                {r.mesure === "reps" ? "répétitions d’affilée" : uniteRecord(r.mesure, r.meilleur)} · {dateRecord(r.meilleur.quand)}
              </span>
            </div>
            <span className="-mr-2.5 flex-shrink-0"><ExerciseThumb name={r.nom} size={116} /></span>
          </div>

          {marches.length > 1 && (
            <div className="mt-6 flex flex-col gap-2.5">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-2)" }}>Le chemin jusqu’ici</span>
              <div className="flex h-[112px] items-end gap-2">
                {marches.map((m, i) => {
                  const derniere = i === marches.length - 1;
                  return (
                    <div key={m.quand} className="flex flex-1 flex-col items-center gap-1.5">
                      <b className="vy-nombre text-[16px]" style={{ fontWeight: derniere ? 800 : 700, color: derniere ? "var(--exp-encre)" : "var(--text-2)" }}>
                        {valeurRecord(r.mesure, m)}
                      </b>
                      <span className="w-full" style={{
                        height: hauteur(m.valeur), borderRadius: "8px 8px 3px 3px",
                        background: derniere ? "linear-gradient(180deg, #8B5CF6, #C13BC1)" : `rgba(139,92,246,${0.1 + (i / marches.length) * 0.18})`,
                      }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {marches.map((m) => (
                  <span key={m.quand} className="flex-1 text-center text-[11px]" style={{ color: "var(--text-2)" }}>{dateCourte(m.quand)}</span>
                ))}
              </div>
            </div>
          )}

          {chemin && <p className="mt-5 text-[16px] leading-relaxed" style={{ color: "var(--text-1)" }}>{chemin}</p>}

          <div className="mt-6 flex flex-col gap-1">
            <button type="button" onClick={partager}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold text-white cursor-pointer"
              style={{ background: DEGRADE, boxShadow: "var(--ombre-action)" }}>
              <Share2 size={17} /> {envoi ? "Un instant…" : "Partager mon record"}
            </button>
            {exo && (
              <button type="button" onClick={() => setMouvement(true)}
                className="min-h-[44px] text-[16px] font-medium cursor-pointer" style={{ color: "var(--text-2)" }}>
                Voir le mouvement
              </button>
            )}
            {idManuel && (
              retrait === "repos" ? (
                <button type="button" onClick={() => setRetrait("confirmer")}
                  className="min-h-[44px] text-[13px] font-medium cursor-pointer" style={{ color: "var(--text-3)" }}>
                  Retirer ce chiffre ajouté à la main
                </button>
              ) : (
                <button type="button" onClick={retirer}
                  className="min-h-[44px] text-[13px] font-semibold cursor-pointer" style={{ color: "#E5484D" }}>
                  {retrait === "envoi" ? "Un instant…" : retrait === "rate" ? "Ça n’a pas marché, réessayer" : "Toucher encore pour retirer"}
                </button>
              )
            )}
          </div>
        </div>
      </Sheet>
      <AnimatePresence>
        {mouvement && exo && <ExerciseDetailSheet exo={exo} onClose={() => setMouvement(false)} />}
      </AnimatePresence>
    </>
  );
}
