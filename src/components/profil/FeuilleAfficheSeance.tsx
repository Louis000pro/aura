"use client";

/* ─────────────────────────────────────────────────────────────
   L'affiche d'une séance, ouverte depuis Profil › Progrès.

   Elle remplace la ligne « Refaire · corbeille » de l'historique
   (Louis, 2026-10-14) : on voit l'affiche en grand, on change son mot
   ou son fond, on la supprime. Refaire reste possible, en action
   discrète : ce n'est plus le sujet de l'écran.
   La suppression s'arme en deux temps, comme partout dans l'app.
   ───────────────────────────────────────────────────────────── */

import { useState } from "react";
import { Play, Trash2 } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import CouvertureSeance, { MOTS_PROPOSES, NB_FONDS, fondCouverture, motCouverture } from "./CouvertureSeance";
import type { PerformanceData } from "@/components/PerformanceCard";
import type { ReglageAffiche } from "@/lib/afficheSeance";

export default function FeuilleAfficheSeance({ data, reglage, onReglage, onRefaire, onSupprimer, onFermer }: {
  data: PerformanceData;
  reglage: ReglageAffiche;
  onReglage: (r: ReglageAffiche) => void;
  onRefaire: () => void;
  onSupprimer: () => Promise<boolean>;
  onFermer: () => void;
}) {
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const motAuto = motCouverture(data.title || "Séance");
  const motActif = reglage.mot || motAuto;
  const teinte = reglage.teinte ?? 0;
  const mots = MOTS_PROPOSES.includes(motAuto) ? MOTS_PROPOSES : [motAuto, ...MOTS_PROPOSES];

  return (
    <Sheet onFermer={onFermer}>
      <div className="max-h-[78dvh] overflow-y-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex justify-center">
          <CouvertureSeance data={data} mot={motActif} teinte={teinte} />
        </div>
        <p className="vy-sous mt-4 truncate text-center" style={{ color: "var(--text-0)" }}>{data.title || "Séance"}</p>

        <p className="vy-label mt-5 mb-2" style={{ color: "var(--text-3)" }}>Le mot</p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: "none" }}>
          {mots.map((m) => {
            const actif = m === motActif;
            return (
              <button key={m} type="button" onClick={() => onReglage({ ...reglage, mot: m === motAuto ? null : m })}
                className="h-9 flex-shrink-0 rounded-full px-4 text-[13px] font-semibold"
                style={{
                  background: actif ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--text-3-rgb),0.12)",
                  color: actif ? "#fff" : "var(--text-1)",
                }}>
                {m}
              </button>
            );
          })}
        </div>

        <p className="vy-label mt-4 mb-2" style={{ color: "var(--text-3)" }}>Le fond</p>
        <div className="flex gap-3">
          {Array.from({ length: NB_FONDS }, (_, i) => (
            <button key={i} type="button" aria-label={`Fond ${i + 1}`} onClick={() => onReglage({ ...reglage, teinte: i })}
              className="h-11 w-11 rounded-full"
              style={{
                background: fondCouverture(i),
                boxShadow: i === teinte ? "0 0 0 2px rgb(var(--surface-rgb)), 0 0 0 4px #8B5CF6" : "none",
              }} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={onRefaire} className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--exp-encre)" }}>
            <Play size={13} strokeWidth={2.2} /> Refaire la séance
          </button>
          {!confirmer ? (
            <button type="button" onClick={() => setConfirmer(true)} className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "#E5484D" }}>
              <Trash2 size={13} strokeWidth={2} /> Supprimer
            </button>
          ) : (
            <button type="button" disabled={enCours}
              onClick={async () => { setEnCours(true); const ok = await onSupprimer(); setEnCours(false); if (!ok) setConfirmer(false); }}
              className="h-9 rounded-full px-4 text-[13px] font-bold text-white" style={{ background: "#E5484D" }}>
              {enCours ? "Suppression…" : "Oui, supprimer la séance"}
            </button>
          )}
        </div>
        {confirmer && (
          <p className="mt-2 text-right text-[11px]" style={{ color: "var(--text-3)" }}>
            La séance quitte ton historique, pour de bon.
          </p>
        )}
      </div>
    </Sheet>
  );
}
