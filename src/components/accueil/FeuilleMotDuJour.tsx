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
   ⚠️ LES 5 EXP DE LA CARTE SONT DEMANDÉS À LA BASE (`crediterMouvement`),
   jamais comptés ici. Le gain ne remonte à l'accueil (`onGain`) que sur
   un crédit confirmé : c'est lui qui fait relire l'aura à la fermeture.
   ⚠️ LA CARTE N'EST PLUS UNE QUÊTE (Louis, 2026-10-17 au soir) : ses 5 EXP
   ne s'annoncent que sur elle. Tant que la base ne connaît pas ce gain
   (`dejaGagne` à `null`, SQL pas collé), la carte n'en promet aucun et
   ne le demande pas : un chiffre promis puis jamais crédité est un mensonge.
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Play } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { VisageGuide } from "@/components/AssistantMark";
import ExerciseDetailSheet from "@/components/seance/ExerciseDetailSheet";
import CarteMouvementDuJour, { type GainMouvement } from "@/components/accueil/MouvementDuJour";
import { createClient } from "@/lib/supabase";
import { useJournee } from "@/hooks/useJournee";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { dayTitle } from "@/lib/planning";
import { voix, PRENOM_GUIDE, type GuideRef } from "@/lib/guides";
import { lignesDuMot, type PlanDuJour } from "@/lib/motDuJour";
import type { MomentAccueil } from "@/lib/momentAccueil";
import { EXERCISE_LIBRARY } from "@/lib/exerciseLibrary";
import {
  ajouterAuCarnet,
  carteRetournee,
  crediterMouvement,
  exerciceDuMouvement,
  lireCarnet,
  lireRetournee,
  minutesDuMouvement,
  mouvementDuJour,
  noterRetournee,
  zoneDuMouvement,
} from "@/lib/mouvementDuJour";

export default function FeuilleMotDuJour({
  guide,
  moment,
  serie,
  userId,
  jour,
  dejaGagne,
  onGain,
  onFermer,
  onRepondre,
}: {
  guide: GuideRef;
  /** Le mot que le Guide avait pour l'accueil aujourd'hui, s'il en avait un. */
  moment: MomentAccueil | null;
  serie: number;
  userId: string;
  jour: string;
  /** La base dit que la carte a déjà rapporté ses 5 EXP aujourd'hui (ici ou
   *  ailleurs). `null` : la base ne connaît pas encore ce gain. */
  dejaGagne: boolean | null;
  /** Les 5 EXP viennent d'être crédités. */
  onGain: () => void;
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
  const [fiche, setFiche] = useState(false);

  /* ── La carte et ses 5 EXP ── */
  const [ouverteAuMontage] = useState(() =>
    carteRetournee({ retourneeLe: lireRetournee(userId), jour, dejaGagne: dejaGagne === true }),
  );
  const [gain, setGain] = useState<GainMouvement>(dejaGagne ? "deja" : null);
  const demander = () => {
    if (dejaGagne === null) return;
    void crediterMouvement(createClient()).then((r) => {
      if (r === null) return;
      setGain(r ? "gagne" : "deja");
      if (r) onGain();
    });
  };
  const decouvrir = () => {
    noterRetournee(userId, jour);
    ajouterAuCarnet(userId, mouvement.name);
    demander();
  };
  /* Retournée sur cet appareil sans que la base l'ait comptée (le réseau a
     lâché au mauvais moment) : on redemande le crédit en ouvrant le mot,
     sinon les 5 EXP resteraient promis sans plus aucune carte à toucher.
     La base ne crédite jamais deux fois. */
  const relance = useRef(false);
  useEffect(() => {
    if (relance.current || !ouverteAuMontage || dejaGagne !== false) return;
    relance.current = true;
    demander();
  });

  // Le carnet compte aussi la carte retournée AILLEURS aujourd'hui.
  const compte = carnet.length + (ouverteAuMontage && !carnet.includes(mouvement.name) ? 1 : 0);
  const [compteAuMontage] = useState(compte);

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
            Ton carnet&nbsp;:{" "}
            <motion.span
              key={compte}
              className="vy-nombre inline-block"
              style={{ color: "var(--text-0)" }}
              initial={compte !== compteAuMontage && !reduce ? { scale: 1.9, y: -2 } : false}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 14 }}
            >
              {compte}
            </motion.span>{" "}
            / {EXERCISE_LIBRARY.length}
          </p>
        </div>
        <div className="mt-2.5">
          <CarteMouvementDuJour
            mouvement={mouvement}
            ouverte={ouverteAuMontage}
            gain={gain}
            bonus={dejaGagne !== null}
            reduce={reduce}
            onDecouvrir={decouvrir}
            onRetournee={() => setCarnet(lireCarnet(userId))}
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
