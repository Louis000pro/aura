"use client";

import { motion } from "framer-motion";
import { X, Check, Plus, Sparkles } from "lucide-react";
import ExerciseThumb from "./ExerciseThumb";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { EQUIPS, libelleReps, estAnime, type LibExercise } from "@/lib/exerciseLibrary";

/* ════════════════════════════════════════════════════════════════════
   LA FICHE D'UN MOUVEMENT · l'animation en grand, avec sa description.

   Elle ne LANCE rien (choix de Louis, 2026-07-29) : c'est une vidéo et sa
   légende, pas un deuxième lecteur à côté du tunnel. Tout ce qu'elle
   montre existe déjà dans EXERCISE_LIBRARY, il n'y a aucun contenu à
   écrire pour l'alimenter.

   Le seul geste possible est d'ajouter le mouvement à la sélection en
   cours, et il est réversible depuis la même fiche.

   ⚠️ LA CONSIGNE ET LE BÉNÉFICE SONT SIGNÉS, ET LE TUNNEL LE FAISAIT
   DÉJÀ. `cur.tip` s'affiche pendant la séance avec le visage du Guide
   (« Le geste : ») ; ici, le MÊME texte s'affichait sous une étiquette en
   capitales, sans personne derrière. C'était le même mot avec deux
   auteurs. Le visage reprend donc la place des deux étiquettes.

   ⚠️ AUCUNE PHRASE N'A ÉTÉ AJOUTÉE, ET C'EST LE POINT. Cette fiche est
   celle des sept surfaces qui frôle le plus le bavardage : cent-deux
   écrans d'un coup. Une phrase d'introduction du genre « voilà comment
   je te le ferais faire » retarderait la consigne sans rien apprendre.
   Un visage à côté d'un paragraphe dit qui parle mieux qu'une phrase qui
   le déclare, donc rien n'entre dans `guides.ts` pour cet écran.

   ⚠️ ET IL NE VA PAS PLUS LOIN. Les fiches publiques `/exercices/[slug]`
   montrent les mêmes `tip` et `benefit` et gardent leur voix neutre :
   elles s'adressent à quelqu'un qui n'a pas de compte, donc pas de
   Guide. La liste dépliable des mouvements du tunnel les garde aussi :
   c'est une liste qui défile, pas un seuil.
   ════════════════════════════════════════════════════════════════════ */

export default function ExerciseDetailSheet({
  exo,
  choisi,
  dejaDansLaSeance,
  onBasculer,
  onClose,
}: {
  exo: LibExercise;
  choisi: boolean;
  /** Déjà présent dans la séance en cours d'écriture : plus rien à faire. */
  dejaDansLaSeance: boolean;
  onBasculer: () => void;
  onClose: () => void;
}) {
  const { guide } = useGuideActif();
  const materiel = EQUIPS.find(e => e.id === exo.equip)?.label ?? "Sans matériel";
  const dosage = `${exo.sets} × ${libelleReps(exo.mode, exo.reps, exo.seconds, exo.unite)}`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[106] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(12,8,22,0.55)", backdropFilter: "blur(5px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.14)",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.4)",
          maxHeight: "min(90dvh, 780px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        </div>

        {/* ── Le mouvement, en grand ── */}
        <div className="relative flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(var(--tint-violet-rgb),0.55)", paddingTop: 14, paddingBottom: 14 }}>
          <ExerciseThumb name={exo.name} size={190} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="absolute top-2.5 right-3 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--surface-rgb),0.85)" }} aria-label="Fermer">
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4" style={{ scrollbarWidth: "none" }}>
          <h2 className="text-[21px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
            {exo.name}
          </h2>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)" }}>
              {materiel}
            </span>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)" }}>
              {dosage}
            </span>
            {estAnime(exo.name) && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: "rgba(43,212,160,0.13)", color: "var(--teal-encre)" }}>
                <Sparkles size={9} strokeWidth={2.4} /> Animé
              </span>
            )}
          </div>

          <section className="mt-5">
            <p className="text-[9.5px] font-extrabold tracking-[0.16em] uppercase mb-2"
              style={{ color: "var(--text-3)" }}>
              Ce que ça travaille
            </p>
            <div className="flex flex-wrap gap-1.5">
              {exo.muscles.map(m => (
                <span key={m} className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)" }}>
                  {m}
                </span>
              ))}
            </div>
          </section>

          {/* Ce qu'il en dit : comment le faire, puis ce que ça apporte, dans
              le même souffle. Deux étiquettes en capitales au-dessus de deux
              phrases de quelqu'un qui parle, c'était une mise en forme, pas
              une explication. Un seul visage sur l'écran, donc les deux
              paragraphes vivent sous celui-là. */}
          <section className="mt-5 pb-5 flex gap-3 items-start">
            <span className="flex-shrink-0 mt-0.5">
              <VisageGuide guide={guide} etat="explain" size={34} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                {exo.tip}
              </p>
              <p className="text-[12.5px] font-light leading-relaxed mt-2.5" style={{ color: "var(--text-3)" }}>
                {exo.benefit}
              </p>
            </div>
          </section>
        </div>

        {/* ── Le seul geste de l'écran ── */}
        <div className="px-5 pt-3 flex-shrink-0"
          style={{
            borderTop: "1px solid rgba(var(--tint-violet-rgb),0.8)",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}>
          {dejaDansLaSeance ? (
            <div className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(43,212,160,0.1)", color: "var(--teal-encre)", border: "1px solid rgba(43,212,160,0.25)" }}>
              <Check size={15} strokeWidth={2.4} /> Déjà dans ta séance
            </div>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} onClick={onBasculer}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              style={choisi
                ? { background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)" }
                : { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 8px 24px rgba(139,92,246,0.28)" }
              }>
              {choisi
                ? <><X size={15} strokeWidth={2.4} /> Retirer de ma sélection</>
                : <><Plus size={15} strokeWidth={2.4} /> Ajouter à ma séance</>}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
