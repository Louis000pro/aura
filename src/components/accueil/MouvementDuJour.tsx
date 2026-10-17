"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA CARTE DU MOUVEMENT DU JOUR (Louis, 2026-10-17, page « Revenir
   chaque jour »), dans le mot du Guide.

   Fermée, elle ne montre que la silhouette du personnage : on la touche
   pour le découvrir, comme on retourne une carte, et ce geste rapporte
   +5 EXP, une fois par jour. Ouverte, le mouvement bouge, avec ce qu'il
   travaille et sa consigne, et on peut l'essayer tout de suite.

   ⭐ LA RÉVÉLATION, EN QUATRE TEMPS (Louis : « une belle animation quand
   on touche pour découvrir »). ① L'éveil : la silhouette s'allume, un
   reflet traverse la carte (0,36 s). ② La carte se retourne. ③ L'éclosion :
   une onde et des étincelles violet et or partent du personnage, qui
   bondit à sa place pendant que son nom monte. ④ Le sceau « +5 EXP » se
   pose là où était la pastille, et « +5 EXP » s'envole.

   ⚠️ LE SCEAU N'APPARAÎT QUE SUR LA RÉPONSE DE LA BASE (`gain`). Si elle
   ne répond pas, la carte se retourne quand même, sans aucun gain : un
   chiffre qui s'envole sans avoir été crédité serait un mensonge.
   ⚠️ Rien ne bouge pour qui demande moins d'animations : la carte passe
   d'une face à l'autre en fondu, le sceau se pose sans s'envoler.
   ⚠️ Le choix du mouvement et le crédit vivent dans
   `lib/mouvementDuJour.ts` : cette carte ne décide de rien.
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Play } from "lucide-react";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { frameSrc, pickGenre, resolveGuide } from "@/lib/exerciseGuides";
import { EXP_MOUVEMENT } from "@/lib/aura";
import type { LibExercise } from "@/lib/exerciseLibrary";
import styles from "./MouvementDuJour.module.css";

/** Ce que la base a répondu. `gagne` : les 5 EXP viennent d'être crédités.
 *  `deja` : ils l'étaient déjà aujourd'hui. `null` : rien de confirmé. */
export type GainMouvement = "gagne" | "deja" | null;

type Phase = "fermee" | "eveil" | "ouverte";

/** La durée de l'éveil, avant que la carte ne tourne. */
const EVEIL_MS = 360;

/** easeOutBack : la carte dépasse un peu sa place et y revient. */
const REBOND = [0.34, 1.56, 0.64, 1] as const;

const COULEURS = ["#8B5CF6", "#F5B120", "#C13BC1"];

/* Neuf éclats autour du personnage, à des angles et des distances FIXES :
   aucun hasard, donc la même éclosion à chaque fois et partout. */
const ECLATS = Array.from({ length: 9 }, (_, i) => {
  const angle = -Math.PI / 2 + (i / 9) * Math.PI * 2;
  const loin = i % 2 === 0;
  const rayon = loin ? 98 : 70;
  return {
    x: Math.round(Math.cos(angle) * rayon),
    y: Math.round(Math.sin(angle) * rayon * 0.82),
    taille: loin ? 14 : 9,
    couleur: COULEURS[i % COULEURS.length],
    point: i % 3 === 1,
    tour: loin ? 90 : -70,
  };
});

export default function CarteMouvementDuJour({
  mouvement,
  ouverte,
  gain,
  bonus,
  reduce,
  onDecouvrir,
  onRetournee,
  onEssayer,
  onVoirFiche,
}: {
  mouvement: LibExercise;
  /** Déjà retournée aujourd'hui : la carte s'ouvre telle quelle, sans rien rejouer. */
  ouverte: boolean;
  gain: GainMouvement;
  /** La base sait créditer les 5 EXP : la carte fermée peut les annoncer. */
  bonus: boolean;
  reduce: boolean;
  /** Le toucher : c'est là que l'appelant demande le crédit. */
  onDecouvrir: () => void;
  /** La carte vient de finir de se retourner. */
  onRetournee: () => void;
  onEssayer: () => void;
  onVoirFiche: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(ouverte ? "ouverte" : "fermee");
  // Retournée sous nos yeux : l'éclosion se joue. Ouverte d'avance : rien.
  const [touchee, setTouchee] = useState(false);
  // La face ouverte a fini d'arriver : le sceau peut se poser.
  const [posee, setPosee] = useState(ouverte);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Deux touchers dans la même image arrivent avant que le bouton ne se
  // désactive : la découverte ne se lance qu'une fois.
  const lancee = useRef(false);
  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);

  const guide = resolveGuide(mouvement.name);
  const silhouette = guide ? frameSrc(guide, pickGenre(guide), 0) : null;

  // Les poses se chargent pendant que la carte est fermée : à la
  // révélation, le personnage bouge tout de suite au lieu d'arriver vide.
  useEffect(() => {
    const g = resolveGuide(mouvement.name);
    if (!g) return;
    const genre = pickGenre(g);
    for (let i = 0; i < g.frames; i++) {
      const img = new Image();
      img.src = frameSrc(g, genre, i);
    }
  }, [mouvement.name]);

  const toucher = () => {
    if (phase !== "fermee" || lancee.current) return;
    lancee.current = true;
    onDecouvrir();
    setTouchee(true);
    if (reduce) {
      setPhase("ouverte");
      setPosee(true);
      onRetournee();
      return;
    }
    setPhase("eveil");
    minuteur.current = setTimeout(() => setPhase("ouverte"), EVEIL_MS);
  };

  const fermee = phase !== "ouverte";
  const eclore = touchee && !reduce;
  const annonce = touchee && posee
    ? `${mouvement.name}${gain === "gagne" ? `, plus ${EXP_MOUVEMENT} EXP` : ""}`
    : "";

  return (
    <div>
      <div className={styles.scene}>
        <AnimatePresence initial={false} mode="wait">
          {fermee ? (
            <motion.button
              key="fermee"
              type="button"
              onClick={toucher}
              disabled={phase === "eveil"}
              aria-label={bonus ? `Découvrir le mouvement du jour, plus ${EXP_MOUVEMENT} EXP` : "Découvrir le mouvement du jour"}
              className={`${styles.face} ${styles.fermee}`}
              data-eveil={phase === "eveil" ? "" : undefined}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              animate={{ scale: phase === "eveil" ? 1.035 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              exit={reduce
                ? { opacity: 0, transition: { duration: 0.15 } }
                : { rotateY: 90, scale: 1.035, transition: { duration: 0.19, ease: [0.55, 0, 0.9, 0.4] } }}
            >
              <span className={styles.lueur} aria-hidden="true" />
              {silhouette && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={silhouette} alt="" aria-hidden="true" className={styles.silhouette} />
              )}
              {bonus && (
                <span className={styles.pastille} aria-hidden="true">
                  <b className="vy-nombre">+{EXP_MOUVEMENT}</b> EXP
                </span>
              )}
              <span className={styles.titreFerme}>Touche pour le découvrir</span>
              <span className={styles.sousFerme}>Le même pour tout le monde, aujourd’hui</span>
            </motion.button>
          ) : (
            <motion.div
              key="ouverte"
              className={`${styles.face} ${styles.ouverte}`}
              initial={reduce ? { opacity: 0 } : { rotateY: -90, scale: 1.035 }}
              animate={reduce ? { opacity: 1 } : { rotateY: 0, scale: 1 }}
              transition={reduce ? { duration: 0.2 } : { duration: 0.5, ease: REBOND }}
              onAnimationComplete={() => {
                if (!touchee || posee) return;
                setPosee(true);
                onRetournee();
              }}
            >
              {eclore && <Eclosion />}
              <motion.span
                className={styles.personnage}
                initial={eclore ? { scale: 0.5, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.08 }}
              >
                <ExerciseThumb name={mouvement.name} size={136} />
              </motion.span>
              {gain && posee && <Sceau envol={gain === "gagne" && eclore} />}
              <motion.strong
                className={styles.nom}
                initial={eclore ? { y: 12, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
              >
                {mouvement.name}
              </motion.strong>
              <motion.span
                className={styles.muscles}
                initial={eclore ? { y: 8, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.28, ease: "easeOut" }}
              >
                {mouvement.muscles.join(" · ")}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toujours là, vide au départ : une zone annoncée doit exister avant
          que son texte change, sinon la synthèse vocale ne dit rien. */}
      <span className="sr-only" role="status">{annonce}</span>

      {/* La consigne et les boutons se déplient sous la carte une fois
          qu'elle a tourné : la carte ne change jamais de hauteur. */}
      <AnimatePresence initial={false}>
        {!fermee && (
          <motion.div
            key="suite"
            className={styles.suite}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={reduce
              ? { duration: 0.2 }
              : { height: { duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.35, delay: 0.5 } }}
          >
            <div className={styles.suiteCorps}>
              <p className={styles.consigne}>{mouvement.tip}</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onEssayer}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 cursor-pointer"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", fontSize: 16, fontWeight: 800, boxShadow: "var(--ombre-action)" }}
              >
                <Play size={13} strokeWidth={2.5} fill="#fff" aria-hidden="true" /> L’essayer maintenant
              </motion.button>
              <button
                type="button"
                onClick={onVoirFiche}
                className="mt-1.5 block w-full py-1.5 cursor-pointer"
                style={{ color: "var(--exp-encre)", fontSize: 13, fontWeight: 700 }}
              >
                Voir la fiche
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── ④ Le sceau gagné, et ce qui s'en envole ── */
function Sceau({ envol }: { envol: boolean }) {
  return (
    <>
      <motion.span
        className={styles.sceau}
        initial={envol ? { scale: 0, rotate: -24 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 15 }}
      >
        <Check size={11} strokeWidth={3.6} aria-hidden="true" />
        <b className="vy-nombre">+{EXP_MOUVEMENT}</b> EXP
      </motion.span>
      {envol && (
        <motion.span
          className={styles.envol}
          aria-hidden="true"
          initial={{ y: 10, opacity: 0, scale: 0.7 }}
          animate={{ y: -44, opacity: [0, 1, 1, 0], scale: 1 }}
          transition={{
            y: { duration: 1.15, ease: [0.2, 0.8, 0.3, 1] },
            scale: { type: "spring", stiffness: 420, damping: 13 },
            opacity: { duration: 1.15, times: [0, 0.14, 0.62, 1] },
          }}
        >
          <b className="vy-nombre">+{EXP_MOUVEMENT}</b>
          <small>EXP</small>
        </motion.span>
      )}
    </>
  );
}

/* ── ③ L'éclosion : un halo, une onde, des étincelles ── */
function Eclosion() {
  return (
    <span className={styles.eclosion} aria-hidden="true">
      <motion.span
        className={styles.halo}
        initial={{ scale: 0.35, opacity: 0.95 }}
        animate={{ scale: 1.3, opacity: 0 }}
        transition={{ duration: 0.85, ease: "easeOut" }}
      />
      <motion.span
        className={styles.onde}
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.75, ease: [0.2, 0.7, 0.3, 1] }}
      />
      {ECLATS.map((e, i) => {
        const delai = 0.05 + i * 0.018;
        return (
          <motion.span
            key={i}
            className={styles.eclat}
            style={{ width: e.taille, height: e.taille, marginLeft: -e.taille / 2, marginTop: -e.taille / 2 }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{ x: e.x, y: e.y, scale: [0, 1.15, 0.45], opacity: [1, 1, 0], rotate: e.tour }}
            transition={{
              default: { duration: 0.85, delay: delai, ease: [0.15, 0.75, 0.3, 1] },
              scale: { duration: 0.85, delay: delai, times: [0, 0.4, 1] },
              opacity: { duration: 0.85, delay: delai, times: [0, 0.6, 1] },
            }}
          >
            {e.point ? (
              <span className={styles.point} style={{ background: e.couleur }} />
            ) : (
              <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
                <path d="M12 0C12.9 7.1 16.9 11.1 24 12C16.9 12.9 12.9 16.9 12 24C11.1 16.9 7.1 12.9 0 12C7.1 11.1 11.1 7.1 12 0Z" fill={e.couleur} />
              </svg>
            )}
          </motion.span>
        );
      })}
    </span>
  );
}
