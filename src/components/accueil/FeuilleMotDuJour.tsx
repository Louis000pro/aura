"use client";

/* ─────────────────────────────────────────────────────────────────────
   LE MOT DU JOUR (Louis, 2026-10-17, page « Revenir chaque jour »).

   Ce qu'ouvre la pastille posée sur le visage du Guide, en haut de
   l'accueil. Deux phrases vraies (la flamme, puis la journée), puis le
   mouvement du jour à découvrir. Il ne s'ouvre jamais tout seul : c'est
   un message qu'on a envie d'ouvrir, pas une fenêtre qui s'impose.

   ⚠️ LES PHRASES VIENNENT DE `lignesDuMot` ET DE `guides.ts`, jamais
   d'ici. Ce fichier apporte les faits et les affiche.
   ⚠️ LA JOURNÉE SE LIT AVEC `useJournee`, la seule lecture de la journée
   du produit : tant qu'elle charge, le mot n'a pas de deuxième phrase,
   parce que « rien de prévu » ne s'écrit jamais avant d'avoir lu.
   ───────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Play } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { VisageGuide } from "@/components/AssistantMark";
import ExerciseDetailSheet from "@/components/seance/ExerciseDetailSheet";
import CarteMouvementDuJour from "@/components/accueil/MouvementDuJour";
import { useJournee } from "@/hooks/useJournee";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { dayTitle } from "@/lib/planning";
import { voix, PRENOM_GUIDE, type GuideRef } from "@/lib/guides";
import { lignesDuMot, type PlanDuJour } from "@/lib/motDuJour";
import type { MomentAccueil } from "@/lib/momentAccueil";
import { EXERCISE_LIBRARY } from "@/lib/exerciseLibrary";
import {
  ajouterAuCarnet,
  exerciceDuMouvement,
  lireCarnet,
  minutesDuMouvement,
  mouvementDuJour,
  zoneDuMouvement,
} from "@/lib/mouvementDuJour";

export default function FeuilleMotDuJour({
  guide,
  moment,
  serie,
  userId,
  jour,
  onFermer,
  onRepondre,
}: {
  guide: GuideRef;
  /** Le mot que le Guide avait pour l'accueil aujourd'hui, s'il en avait un. */
  moment: MomentAccueil | null;
  serie: number;
  userId: string;
  jour: string;
  onFermer: () => void;
  onRepondre: () => void;
}) {
  const reduce = !!useReducedMotion();
  const j = useJournee();
  const { launchWorkout } = useWorkoutLaunch();
  const plan: PlanDuJour | null = j.etat === "loading" ? null : {
    etat: j.etat,
    titre: j.jour ? dayTitle(j.jour) : null,
    etape: j.etape?.nom ?? null,
    jour: j.reserveLe ?? j.prevuLe ?? null,
  };
  const lignes = lignesDuMot({ moment, serie, plan });
  const nom = guide ? PRENOM_GUIDE[guide] : "Vaiiya";

  const mouvement = mouvementDuJour(jour);
  const [carnet, setCarnet] = useState<string[]>(() => lireCarnet(userId));
  const decouvert = carnet.includes(mouvement.name);
  const [fiche, setFiche] = useState(false);

  // Le mouvement se joue comme une séance de bibliothèque : un supplément,
  // qui ne referme aucune étape du programme.
  const essayer = () => {
    launchWorkout({
      sessionId: `mouvement-du-jour-${jour}`,
      title: mouvement.name,
      duration: minutesDuMouvement(mouvement),
      difficulty: "Débutant",
      category: zoneDuMouvement(mouvement),
      exerciseList: [exerciceDuMouvement(mouvement)],
    });
    setFiche(false);
    onFermer();
  };

  const boutonEssayer = (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={essayer}
      className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 cursor-pointer"
      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", fontSize: 16, fontWeight: 800, boxShadow: "var(--ombre-action)" }}
    >
      <Play size={14} strokeWidth={2.5} fill="#fff" aria-hidden="true" /> L’essayer maintenant
    </motion.button>
  );

  return (
    <>
      <Sheet onFermer={onFermer}>
        <div className="flex items-center gap-3">
          <VisageGuide guide={guide} etat="welcome" size={48} />
          <div>
            <p style={{ color: "var(--text-0)", fontSize: 16, fontWeight: 800 }}>{nom}</p>
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>Ton mot du jour</p>
          </div>
        </div>

        <div className="mt-3.5 px-4 py-3.5" style={{ borderRadius: "4px 20px 20px 20px", background: "rgba(139,92,246,0.08)" }}>
          {lignes.map((l, i) => (
            <p key={l.cle} className={i > 0 ? "mt-2" : undefined} style={{ color: "var(--text-1)", fontSize: 16, lineHeight: 1.45 }}>
              {voix(guide, l.cle, l.ctx)}
            </p>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <p style={{ color: "var(--text-0)", fontSize: 16, fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
            Le mouvement du jour
          </p>
          <p style={{ color: "var(--text-3)", fontSize: 11, fontWeight: 700 }}>
            Ton carnet&nbsp;: <span className="vy-nombre" style={{ color: "var(--text-0)" }}>{carnet.length}</span> / {EXERCISE_LIBRARY.length}
          </p>
        </div>
        <div className="mt-2.5">
          <CarteMouvementDuJour
            mouvement={mouvement}
            decouvert={decouvert}
            reduce={reduce}
            onDecouvrir={() => setCarnet(ajouterAuCarnet(userId, mouvement.name))}
            onEssayer={essayer}
            onVoirFiche={() => setFiche(true)}
          />
        </div>

        <button
          type="button"
          onClick={onRepondre}
          className="mx-auto mt-3 flex items-center gap-0.5 py-2 cursor-pointer"
          style={{ color: "var(--exp-encre)", fontSize: 13, fontWeight: 700 }}
        >
          Répondre à {nom} <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </Sheet>

      {/* La fiche vit hors de la feuille : un enfant `fixed` se calerait sur
          la feuille animée au lieu de l'écran. */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {fiche && (
            <ExerciseDetailSheet exo={mouvement} action={boutonEssayer} onClose={() => setFiche(false)} />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
