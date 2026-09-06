"use client";

/* ════════════════════════════════════════════════════════════════════
   V7A · LE HÉROS DE LA JOURNÉE, MONTÉ SUR L'ACCUEIL.

   Il assemble les trois pièces et n'en décide aucune : `useJournee` dit
   ce qu'il y a à montrer, `TodayHero` le montre, `terminerSeance`
   referme ce que la séance referme.

   ⚠️ LES ACTIONS SECONDAIRES PARTENT VERS ENTRAÎNEMENT, ET C'EST VOULU.
   « Organiser », « J'ai envie de bouger » et « Lui donner un jour »
   ouvrent des feuilles qui vivent dans l'écran Entraînement, avec la
   semaine et le catalogue qu'elles manipulent. Les dupliquer sur
   l'accueil ferait deux « Organiser » à tenir d'accord ; on y va, et
   `?ouvrir=` dit laquelle ouvrir. L'action PRINCIPALE, elle, ne quitte
   jamais l'accueil : lancer sa séance depuis l'écran où l'on arrive est
   tout l'intérêt du déplacement.

   « Décaler » et « Remplacer » parlent au Guide, qui est global : ils
   marchent ici exactement comme sur Entraînement.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAssistant } from "@/context/AssistantContext";
import { useJournee } from "@/hooks/useJournee";
import { dayTitle, hasSeance } from "@/lib/planning";
import ChoixJour from "./ChoixJour";
import TodayHero from "./TodayHero";

export default function HeroJournee() {
  const router = useRouter();
  const { open: openAssistant } = useAssistant();
  const j = useJournee();
  /* « Lui donner un jour » : le seul geste du héros qui écrit. */
  const [quand, setQuand] = useState(false);

  const ouvrir = (feuille: "organiser" | "improviser") =>
    router.push(`/progression?ouvrir=${feuille}`);

  /* ⚠️ IL NE RENVOIE PLUS VERS « ORGANISER », ET C'ÉTAIT UN CUL-DE-SAC.
     Le bouton promettait de donner un jour à l'étape et ouvrait le
     planificateur de la semaine, qui ne sait pas dater une étape : on en
     ressortait avec une séance ordinaire, sans lien vers le programme.
     On la faisait, elle passait « faite », le cycle n'avançait pas, et
     le héros reproposait la même étape le lendemain. Il ouvre désormais
     le choix du jour, et `daterEtape` écrit l'intention AVEC son étape. */
  const donnerUnJour = j.etat === "etape" ? () => setQuand(true) : () => ouvrir("organiser");

  return (
    <section>
      <TodayHero
        state={j.etat}
        day={j.jour}
        etape={j.etape}
        reserveLe={j.reserveLe}
        nbExos={j.nbExos}
        nextLabel={j.nextLabel}
        doneStats={j.doneStats}
        onStart={j.lancerAujourdhui}
        /* « Refaire la séance » relance ce qui vient d'être fait, jamais
           ce qui vient après : deux questions différentes, deux chemins. */
        onRedo={j.refaire}
        onImprovise={() => ouvrir("improviser")}
        onOrganise={donnerUnJour}
        onShift={() => openAssistant("Décale ma séance d’aujourd’hui à un autre jour")}
        onReplace={() => openAssistant("Remplace ma séance d’aujourd’hui par autre chose")}
      />

      {/* ⚠️ CE QUI VIENT EN PLUS AUJOURD'HUI (V6b). Le héros ne montre
          qu'une séance, et c'est très bien : il répond à « je fais quoi
          maintenant ». Mais une seconde intention existe en base, donc
          elle doit exister à l'écran, sinon on l'a écrite pour rien. Une
          ligne, lançable, sous le héros : la mise en scène d'une journée
          chargée est un travail de composition, et c'est V7B. */}
      {j.extras.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {j.extras.map((extra) => (
            <button key={extra.id ?? extra.title}
              onClick={() => j.lancerIntention(extra)}
              disabled={!hasSeance(extra)}
              className="w-full flex items-center gap-2 py-1.5 text-left border-none bg-transparent"
              style={{ cursor: hasSeance(extra) ? "pointer" : "default" }}>
              <span className="vy-label flex-shrink-0" style={{ color: "var(--text-3)" }}>En plus</span>
              <span className="flex-1 min-w-0 text-[12.5px] font-semibold truncate" style={{ color: "var(--text-2)" }}>
                {dayTitle(extra)}
              </span>
              {hasSeance(extra) && (
                <span className="text-[10px] font-bold flex-shrink-0"
                  style={{ color: extra.status === "done" ? "var(--teal-encre)" : "var(--exp-encre)" }}>
                  {extra.status === "done" ? "Faite ✓" : "Commencer"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {quand && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-end md:items-center justify-center md:px-4"
            style={{ background: "rgba(12,8,22,0.55)", backdropFilter: "blur(3px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setQuand(false); }}
          >
            <motion.div
              initial={{ y: 56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden"
              style={{
                background: "rgb(var(--surface-rgb))",
                border: "1px solid rgba(var(--accent-rgb),0.14)",
                boxShadow: "0 -14px 44px rgba(0,0,0,0.4)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-2.5 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
              </div>
              <div className="flex items-center gap-3 px-5 pt-2 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-tight truncate" style={{ color: "var(--text-1)" }}>
                    Quel jour&nbsp;?
                  </p>
                  <p className="text-[10.5px] font-medium mt-1" style={{ color: "var(--text-3)" }}>
                    {j.etape?.nom} · {j.reserveLe ? `posée ${j.reserveLe}` : "ta prochaine étape"}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setQuand(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0 border-none"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
                  <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                </motion.button>
              </div>
              <div aria-hidden className="h-px mx-5" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />
              <div className="px-5 pt-2 pb-4">
                <ChoixJour onChoisir={(date) => {
                  setQuand(false);
                  void j.daterEtape(date);
                }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
