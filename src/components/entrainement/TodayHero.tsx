"use client";

/* ════════════════════════════════════════════════════════════════════
   V7A · LE HÉROS « AUJOURD'HUI » A QUITTÉ ENTRAÎNEMENT.

   Il vivait dans `/progression`, où il répondait à « je fais quoi
   maintenant » au milieu d'un écran qui est par ailleurs une
   bibliothèque. Sa vraie place est l'accueil : c'est l'écran où l'on
   arrive, et la question qu'on s'y pose est celle de la journée.

   Ce fichier ne porte que l'AFFICHAGE. Ce qu'il montre est décidé par
   `useJournee` (src/hooks/useJournee.ts), et ce qui s'écrit à la fin
   d'une séance est décidé par `terminerSeance` (src/lib/finSeance.ts).
   Les trois sont séparés exprès : l'écran ne juge pas, et il n'écrit
   rien.

   ⚠️ V7A EST UNE MIGRATION FONCTIONNELLE, PAS UN REDESIGN. Le dessin
   est celui validé sur Entraînement, au pixel près ; la restructuration
   mobile-first de l'accueil est V7B.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Check, Moon, Play } from "lucide-react";
import { AssistantSpark } from "@/components/AssistantMark";
import { resolveArt } from "@/lib/workoutArt";
import { dayTitle, lieuLabel, type PlanningDay } from "@/lib/planning";
import type { EtatJournee } from "@/lib/journee";
import type { EtapeCycle } from "@/lib/programme";
import { Photo, WIDGET } from "./PhotoSeance";

/* ════════════════════════════════════════════════════════════════════
   ① Héros « Aujourd'hui » — un seul emplacement, quatre vérités.
   ════════════════════════════════════════════════════════════════════ */
/* Le vocabulaire des états vit dans `lib/journee.ts`, avec la fonction
   pure qui les décide : l'écran affiche, il ne juge pas. */
export type HeroState = EtatJournee;

export default function TodayHero({
  state, day, etape, reserveLe, nbExos, nextLabel, doneStats, onStart, onImprovise, onOrganise, onShift, onReplace,
}: {
  state: HeroState;
  day: PlanningDay | null;
  etape: EtapeCycle | null;                       // l'étape du cycle (état « etape »)
  /* ⚠️ LE JOUR DE L'ÉTAPE, QUAND ELLE EN A UN. `null` veut dire « pas de
     réservation », et c'est le seul cas où « quand tu veux » est vrai. */
  reserveLe: string | null;
  nbExos: number;                                 // taille de son instance, calculée sans rien écrire
  nextLabel: string | null;                       // « Jambes · demain » (état repos)
  doneStats: { minutes: number; kcal: number } | null;
  onStart: () => void;
  onImprovise: () => void;
  onOrganise: () => void;
  onShift: () => void;
  onReplace: () => void;
}) {
  /* Skeleton — même silhouette que la carte, aucune culpabilité d'attente */
  if (state === "loading") {
    return (
      <div className="overflow-hidden relative" style={{ height: 380, borderRadius: "var(--r-affiche)", background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
        <motion.div
          className="absolute inset-0"
          style={{ background: "linear-gradient(100deg, transparent 30%, rgba(var(--accent-rgb),0.08) 50%, transparent 70%)" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  const viz =
    state === "setup" ? WIDGET.setup
    : state === "done" ? WIDGET.done
    : state === "repos" || state === "libre" ? WIDGET.repos
    : state === "etape" ? { img: resolveArt({ title: etape?.nom ?? "" }).img, pos: "center 24%" }
    : { img: resolveArt({ title: day ? `${day.title} ${day.type}` : "" }).img, pos: "center 24%" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="overflow-hidden relative"
      style={{ minHeight: state === "seance" || state === "etape" ? 400 : 320, borderRadius: "var(--r-affiche)", boxShadow: "var(--ombre-pose)" }}
    >
      <Photo img={viz.img} pos={viz.pos} style={{ position: "absolute", inset: 0 }} />

      {/* Chips du haut */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
        <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{ background: "var(--verre-photo)", color: "#fff", border: "1px solid var(--verre-photo-bord)", backdropFilter: "blur(6px)" }}>
          {state === "setup" ? "Première fois ici"
            : state === "etape" ? "Ton programme"
            : "Aujourd’hui"}
        </span>
        {state === "done" && (
          <span className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4FE8B8,#1FBF8C)", boxShadow: "var(--ombre-pose)" }}>
            <Check size={18} strokeWidth={3.2} style={{ color: "#06281E" }} />
          </span>
        )}
        {(state === "repos" || state === "libre") && <Moon size={22} strokeWidth={1.6} style={{ color: "#9FD8C6", opacity: 0.85 }} />}
        {state === "setup" && <AssistantSpark px={22} />}
      </div>

      {/* Légende sur l'image (style validé nutrition) */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16"
        style={{ background: "var(--voile-affiche)" }}>

        {state === "seance" && day && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#C9B8FF" }}>
              {day.type}{lieuLabel(day.location) ? ` · ${lieuLabel(day.location)}` : ""}
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">{dayTitle(day)}</h2>
            <p className="mt-2.5 mb-4 text-[11.5px] font-medium" style={{ color: "rgba(255,255,255,0.62)" }}>
              {day.type === "HIIT" ? 30 : 45} min · {day.exerciseList.length} exercices · {day.difficulty}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
            >
              <Play size={14} strokeWidth={2.5} fill="#fff" /> C&apos;est parti
            </motion.button>
            <div className="flex justify-center gap-5 mt-2.5">
              <button onClick={onShift} className="text-[11.5px] font-semibold cursor-pointer bg-transparent border-none"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                Décaler
              </button>
              <button onClick={onReplace} className="text-[11.5px] font-semibold cursor-pointer bg-transparent border-none flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                <span style={{ color: "#C9B8FF" }}>✦</span> Remplacer
              </button>
            </div>
          </>
        )}

        {/* ⚠️ L'ÉTAPE N'A PAS DE DATE, ET LA CARTE NE DOIT PAS EN INVENTER UNE.
            Le programme dit QUOI faire ensuite ; le planning, facultatif, dit
            éventuellement QUAND. D'où « quand tu veux » à la place du jour :
            écrire « Aujourd'hui » ici reposerait la promesse d'agenda que V5
            retire.

            ⚠️ MAIS QUAND ELLE EN A UN, ELLE LE DIT (2026-09-06). Une étape
            déjà réservée pour mardi restait annoncée « quand tu veux » : ce
            n'était pas qu'une imprécision d'affichage, c'est ce qui laissait
            la lancer comme une étape LIBRE, donc en refermer une seconde
            fois. La carte dit le jour, et le bouton propose d'en changer au
            lieu de « lui donner » celui qu'elle a déjà. */}
        {state === "etape" && etape && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#C9B8FF" }}>
              Ta prochaine séance
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">{etape.nom}</h2>
            <p className="mt-2.5 mb-4 text-[11.5px] font-medium" style={{ color: "rgba(255,255,255,0.62)" }}>
              {reserveLe ?? "Quand tu veux"}{nbExos > 0 ? ` · ${nbExos} exercices` : ""}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
            >
              <Play size={14} strokeWidth={2.5} fill="#fff" /> C&apos;est parti
            </motion.button>
            <div className="flex justify-center gap-5 mt-2.5">
              <button onClick={onOrganise} className="text-[11.5px] font-semibold cursor-pointer bg-transparent border-none"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                {reserveLe ? "Changer de jour" : "Lui donner un jour"}
              </button>
            </div>
          </>
        )}

        {state === "libre" && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#9FD8C6" }}>
              Aujourd&apos;hui
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">Rien de prévu.</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Tu t&apos;entraînes quand tu veux.
              {nextLabel && <> Ensuite : <b className="font-bold text-white">{nextLabel}</b>.</>}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onImprovise}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[13.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(4px)" }}
            >
              ✦ J&apos;ai envie de bouger
            </motion.button>
          </>
        )}

        {state === "repos" && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#9FD8C6" }}>
              Aujourd&apos;hui
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">Repos.</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Ton corps construit pendant que tu récupères.
              {nextLabel && <> Prochaine : <b className="font-bold text-white">{nextLabel}</b>.</>}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onImprovise}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[13.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(4px)" }}
            >
              ✦ J&apos;ai quand même envie de bouger
            </motion.button>
          </>
        )}

        {state === "done" && day && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#7FE8C8" }}>
              Aujourd&apos;hui · fait
            </p>
            <h2 className="text-[34px] md:text-[38px] leading-[1.02] font-extralight text-white">C&apos;est fait.</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5" style={{ color: "rgba(255,255,255,0.72)" }}>
              {dayTitle(day)}
              {doneStats && doneStats.minutes > 0 && <> · {doneStats.minutes} min</>}
              {doneStats && doneStats.kcal > 0 && <> · <b className="font-bold" style={{ color: "#EF9F27" }}>{doneStats.kcal} kcal</b></>}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[13.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(4px)" }}
            >
              <Play size={12} strokeWidth={2.5} fill="#fff" /> Refaire la séance
            </motion.button>
          </>
        )}

        {state === "setup" && (
          <>
            <p className="text-[11px] font-semibold mb-1" style={{ color: "#C9B8FF" }}>
              On fait connaissance
            </p>
            {/* La question n'apparaît QUE quand l'app ne sait pas — même logique que Nutrition */}
            <h2 className="text-[30px] md:text-[34px] leading-[1.04] font-extralight text-white">On s&apos;entraîne comment&nbsp;?</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Quelques questions, et ta semaine est prête.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onOrganise}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
            >
              ✦ Créer mon planning
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
