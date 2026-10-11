"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { positionDeReprise, type SeanceInterrompue as Brouillon } from "@/lib/seanceInterrompue";
import { lockBodyModal } from "@/lib/bodyModal";
import { exerciceAffiche } from "@/lib/remplacement";

const chrono = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const encre = { color: "var(--text-2)" };
const action = { background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" };

function RepriseCard({ brouillon, erreur, supplement, onReprendre, onAbandonner }: {
  brouillon: Brouillon; erreur: string | null; onReprendre: () => void; onAbandonner: () => void;
  supplement: boolean;
}) {
  const [replie, setReplie] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const pos = positionDeReprise(brouillon);
  const ex = exerciceAffiche(brouillon.seance.exerciseList[pos.exerciseIdx], pos.exerciseIdx, brouillon.avancement.remplacements ?? {});
  const a = brouillon.avancement;
  if (replie) return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-[13px]" style={encre}>
      <span>Séance en pause · {brouillon.seance.title}</span>
      <button onClick={() => setReplie(false)} className="min-h-11 px-2 cursor-pointer font-semibold" style={{ color: "var(--exp-encre)" }}>Retrouver ma séance</button>
    </div>
  );
  return (
    <section aria-label="Séance à reprendre" className="mb-6 p-5 rounded-[var(--r-bloc)]" style={{ background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)" }}>
      <p className="vy-label flex items-center gap-1.5 mb-3"><Pause size={13} aria-hidden="true" /> Séance en pause</p>
      <h2 className="vy-titre mb-4">{confirmer ? "Abandonner cette séance ?" : "On reprend ?"}</h2>
      {confirmer ? <p className="vy-corps mb-5">Elle ne sera pas enregistrée comme terminée.</p> : <>
        <p className="text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>{brouillon.seance.title}</p>
        <div className="py-4 my-4 border-y" style={{ borderColor: "rgba(var(--text-3-rgb),0.22)" }}>
          <p className="text-[13px]" style={encre}>Exercice <span className="vy-nombre">{pos.exerciseIdx + 1}</span> sur <span className="vy-nombre">{brouillon.seance.exerciseList.length}</span></p>
          <p className="vy-sous my-1">{ex.name}</p>
          <p className="text-[13px]" style={encre}>Série <span className="vy-nombre">{pos.setIdx + 1}</span> sur <span className="vy-nombre">{ex.sets}</span>{a.phase !== "resting" && <> · {ex.reps}</>}</p>
          {a.phase === "resting" && <p className="text-[13px] mt-1" style={encre}>Repos · <span className="vy-nombre">{chrono(a.restCountdown)}</span> restantes</p>}
          {a.phase === "exercising" && (ex.auto || ex.hiit) && <p className="text-[13px] mt-1" style={encre}>{ex.hiit && a.hiitSub === "rest" ? "Récupération" : "Effort"} · <span className="vy-nombre">{chrono(a.autoCountdown)}</span> restantes</p>}
        </div>
        <p className="text-[13px] mb-5" style={encre}><span className="vy-nombre" style={{ color: "var(--feu-encre)" }}>{chrono(a.elapsed)}</span> déjà effectuées</p>
      </>}
      {erreur && <p role="status" className="text-[13px] mb-4" style={{ color: "var(--text-1)" }}>{erreur}</p>}
      <button onClick={confirmer ? () => setConfirmer(false) : onReprendre} className="w-full min-h-[52px] rounded-[var(--r-controle)] px-4 py-3 text-[16px] font-semibold text-white flex items-center justify-center gap-2 cursor-pointer" style={action}>
        {!confirmer && <Play size={17} aria-hidden="true" />}{confirmer ? "Garder ma place" : supplement ? "Reprendre sans modifier le programme" : "Reprendre ma séance"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-3 mt-2">
        {!confirmer && <button onClick={() => setReplie(true)} className="min-h-11 text-[13px] cursor-pointer" style={encre}>Plus tard</button>}
        <button onClick={confirmer ? onAbandonner : () => setConfirmer(true)} className="min-h-11 text-[13px] cursor-pointer" style={encre}>Abandonner la séance</button>
      </div>
    </section>
  );
}

export default function SeanceInterrompue() {
  const { reprise, reprendre, abandonner, erreurReprise, repriseSupplement } = useWorkoutLaunch();
  if (!reprise) return null;
  return <RepriseCard key={reprise.executionId} brouillon={reprise} erreur={erreurReprise} supplement={repriseSupplement} onReprendre={reprendre} onAbandonner={() => abandonner(reprise.executionId)} />;
}

/** Une autre séance ne peut pas écraser la place gardée sans décision. */
export function ConflitReprise({ brouillon, erreur, supplement, onReprendre, onFermer, onRemplacer }: {
  brouillon: Brouillon | null; erreur: string | null;
  supplement: boolean;
  onReprendre: () => void; onFermer: () => void; onRemplacer: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const liberer = lockBodyModal();
    d.showModal();
    return () => { d.close(); liberer(); };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="reprise-conflit-titre" onCancel={(e) => { e.preventDefault(); onFermer(); }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[90dvh] overflow-y-auto p-6 border-0 rounded-[var(--r-feuille)] backdrop:bg-black/50"
      style={{ background: "rgb(var(--surface-rgb))", color: "var(--text-1)", boxShadow: "var(--ombre-flottant)" }}>
      <button onClick={onFermer} aria-label="Fermer" className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center cursor-pointer" style={encre}><X size={18} /></button>
      <h2 id="reprise-conflit-titre" className="vy-titre mb-4 pr-6">{confirmer ? "Abandonner et commencer ?" : "Une séance est en pause."}</h2>
      {brouillon && <p className="text-[16px] font-semibold mb-3">{brouillon.seance.title}</p>}
      <p className="vy-corps mb-5">{confirmer ? "La séance en pause ne sera pas enregistrée comme terminée." : "Retrouve ta place ou abandonne cette séance pour en commencer une autre."}</p>
      {erreur && <p role="status" className="text-[13px] mb-4">{erreur}</p>}
      <button onClick={confirmer || !brouillon ? onFermer : onReprendre} className="w-full min-h-[52px] rounded-[var(--r-controle)] px-4 py-3 text-[16px] font-semibold text-white cursor-pointer" style={action}>
        {confirmer || !brouillon ? "Garder ma place" : supplement ? "Reprendre sans modifier le programme" : "Reprendre ma séance"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
        {!confirmer && <button onClick={onFermer} className="min-h-11 text-[13px] cursor-pointer" style={encre}>Plus tard</button>}
        <button aria-disabled={occupe} onClick={async () => {
          if (occupe) return;
          if (!confirmer) { setConfirmer(true); return; }
          setOccupe(true);
          try { await onRemplacer(); } finally { setOccupe(false); }
        }} className="min-h-11 text-[13px] cursor-pointer" style={encre}>{occupe ? "Un instant…" : "Abandonner et commencer"}</button>
      </div>
    </dialog>
  );
}
