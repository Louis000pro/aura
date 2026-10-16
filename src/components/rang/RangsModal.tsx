"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import GemmeRang from "@/components/GemmeRang";
import ApercuRecompense from "@/components/rang/ApercuRecompense";
import { rejouerCelebration } from "@/lib/celebrationRang";
import { RANGS, RECOMPENSE_RANG, progressionRang, type Rang } from "@/lib/aura";

/**
 * LA GALERIE DES RANGS, UN RANG PAR ÉCRAN (maquette B, choisie par Louis le
 * 2026-10-15), ET L'ANNEAU SEULEMENT SUR TON RANG (piste 1, Louis, 2026-10-17).
 *
 * La gemme en très grand. Sur TON rang, et sur lui seul, un ANNEAU se remplit
 * vers le suivant : « 75 % vers Platine », puis « Plus que 110 EXP avant
 * Platine ». Le pourcentage dit où tu en es, le nombre dit combien il reste.
 *
 * ⚠️ Les autres rangs se REGARDENT, ils ne se mesurent pas : leur seuil, leur
 * décoration, une puce « Le prochain » sur celui qui suit le tien, et aucun
 * pourcentage. La première version posait un anneau partout, compté
 * `EXP / seuil` depuis zéro : un Or à 690 EXP lisait 86 % sur son rang ET 86 %
 * sur Platine (les deux visent 800), et 23 % sur l'Éternel. Ne pas remettre
 * d'anneau ni de pourcentage sur un rang qui n'est pas le tien.
 *
 * ⚠️ Le pourcentage vient de `progressionRang` (`lib/aura.ts`), compté DANS le
 * rang : c'est la même mesure que la carte du profil et la tuile de l'accueil.
 * Ne jamais le recalculer ici.
 *
 * ⚠️ La décoration de chaque rang reste montrée EN VRAI sur le pseudo et la
 * photo (`ApercuRecompense`, décision du 2026-07-29) : une récompense qu'on ne
 * peut pas montrer ici ne doit pas être annoncée.
 *
 * Ouverte depuis la carte « Ton rang » du profil et la tuile Rang de
 * l'accueil. La flamme, elle, ouvre les jours de la série depuis le 2026-10-15.
 */
export default function RangsModal({
  open,
  onClose,
  expActuel,
  rangActuelId,
  pseudo,
  avatarUrl,
  isAdmin = false,
}: {
  open: boolean;
  onClose: () => void;
  expActuel: number;
  rangActuelId: string;
  /** Pour montrer les aperçus sur SON pseudo (et pas un exemple abstrait). */
  pseudo: string;
  avatarUrl?: string | null;
  /** Admin : rejouer la célébration d'un rang pour la vérifier sur son téléphone. */
  isAdmin?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ background: "rgba(10,6,20,0.55)" }}
        >
          <motion.div
            className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[var(--r-feuille)] sm:rounded-[var(--r-feuille)] pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--page-bg)", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}
          >
            <Carrousel
              expActuel={expActuel}
              rangActuelId={rangActuelId}
              pseudo={pseudo}
              avatarUrl={avatarUrl}
              onClose={onClose}
            />

            {isAdmin && (
              <div className="mx-5 mt-5 border-t pt-3" style={{ borderColor: "rgba(var(--accent-rgb),0.1)" }}>
                <p className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
                  Admin · rejouer la célébration
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {RANGS.map((rang) => (
                    <button
                      key={rang.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        rejouerCelebration(rang.id);
                      }}
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold active:opacity-80"
                      style={{
                        background: "rgba(var(--accent-rgb),0.08)",
                        color: "var(--exp-encre)",
                        border: "1px solid rgba(var(--accent-rgb),0.14)",
                      }}
                    >
                      {rang.nom}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* Monté seulement quand la feuille est ouverte : il part donc toujours du
   rang courant, sans effet de remise à zéro. */
function Carrousel({
  expActuel,
  rangActuelId,
  pseudo,
  avatarUrl,
  onClose,
}: {
  expActuel: number;
  rangActuelId: string;
  pseudo: string;
  avatarUrl?: string | null;
  onClose: () => void;
}) {
  const indexCourant = Math.max(0, RANGS.findIndex((r) => r.id === rangActuelId));
  const [index, setIndex] = useState(indexCourant);
  const rail = useRef<HTMLDivElement>(null);

  // Le rail s'ouvre directement sur ton rang, sans animation.
  useEffect(() => {
    const el = rail.current;
    if (el) el.scrollLeft = indexCourant * el.clientWidth;
  }, [indexCourant]);

  const aller = (i: number) => {
    const el = rail.current;
    if (!el) return;
    const cible = Math.max(0, Math.min(RANGS.length - 1, i));
    el.scrollTo({ left: cible * el.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = rail.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <>
      <div className="flex items-center justify-between px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid place-items-center h-11 w-11 rounded-full outline-none active:opacity-80"
          style={{ background: "rgba(var(--accent-rgb),0.08)", color: "var(--text-soft)" }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
        <span className="vy-nombre text-[13px]" style={{ color: "var(--text-3)" }}>
          {index + 1} / {RANGS.length}
        </span>
        <span className="w-11" />
      </div>

      <div className="relative">
        <div
          ref={rail}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {RANGS.map((rang, i) => (
            <Ecran
              key={rang.id}
              rang={rang}
              courant={i === indexCourant}
              prochain={i === indexCourant + 1}
              expActuel={expActuel}
              pseudo={pseudo}
              avatarUrl={avatarUrl}
            />
          ))}
        </div>

        {/* Flèches : sur ordinateur, glisser au doigt n'existe pas. */}
        <button
          type="button"
          aria-label="Rang précédent"
          onClick={() => aller(index - 1)}
          disabled={index === 0}
          className="absolute left-2 top-[150px] grid place-items-center h-11 w-11 rounded-full disabled:opacity-0 transition-opacity"
          style={{ background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)", color: "var(--text-0)" }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Rang suivant"
          onClick={() => aller(index + 1)}
          disabled={index === RANGS.length - 1}
          className="absolute right-2 top-[150px] grid place-items-center h-11 w-11 rounded-full disabled:opacity-0 transition-opacity"
          style={{ background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)", color: "var(--text-0)" }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {RANGS.map((r, i) => (
          <button
            key={r.id}
            type="button"
            aria-label={`Voir ${r.nom}`}
            onClick={() => aller(i)}
            className="h-11 flex items-center"
          >
            <i
              className="block h-[7px] rounded-full transition-all"
              style={{
                width: i === index ? 22 : 7,
                background: i === index
                  ? "linear-gradient(90deg,#8B5CF6,#C13BC1)"
                  : "rgba(139,92,246,0.22)",
              }}
            />
          </button>
        ))}
      </div>
    </>
  );
}

function Ecran({
  rang,
  courant,
  prochain,
  expActuel,
  pseudo,
  avatarUrl,
}: {
  rang: Rang;
  courant: boolean;
  /** Le rang juste après le tien : il porte une puce, jamais un pourcentage. */
  prochain: boolean;
  expActuel: number;
  pseudo: string;
  avatarUrl?: string | null;
}) {
  const atteint = expActuel >= rang.min;
  const reco = RECOMPENSE_RANG[rang.id];

  /* Ta progression, et seulement sur ton rang : les autres n'en ont pas. */
  const prog = courant ? progressionRang(expActuel) : null;

  /* La valeur sous la gemme. Elle occupe la même place sur tous les écrans,
     pour que le nom et la décoration ne sautent pas quand on glisse : ta
     progression sur ton rang, le prix d'un rang partout ailleurs. */
  let valeur: React.ReactNode = null;
  let mot: React.ReactNode;
  let couleurMot = "var(--text-3)";
  if (prog?.suivant) {
    valeur = <>{prog.pourcent}&nbsp;%</>;
    mot = `vers ${prog.suivant.nom}`;
  } else if (prog) {
    valeur = expActuel;
    mot = "EXP au total";
  } else if (atteint) {
    couleurMot = "var(--teal-encre)";
    if (rang.min > 0) valeur = rang.min;
    mot = (
      <>
        {rang.min > 0 ? "EXP · gagné" : "Le point de départ"}{" "}
        <Check size={14} strokeWidth={2.6} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px" }} />
      </>
    );
  } else {
    valeur = rang.min;
    mot = "EXP pour l’atteindre";
  }

  return (
    <section className="snap-center shrink-0 w-full px-5" aria-label={rang.nom}>
      <div className="flex flex-col items-center pt-3">
        <Anneau part={prog ? prog.part : null} couleurs={rang.neon}>
          <div style={{ filter: atteint ? "none" : "grayscale(0.85) opacity(0.5)" }}>
            <GemmeRang rang={rang} size={150} />
          </div>
        </Anneau>

        <div className="mt-3 flex h-9 items-baseline gap-2">
          {valeur !== null && (
            <span className="vy-nombre" style={{ fontSize: 26, fontWeight: 800, color: "var(--text-0)" }}>{valeur}</span>
          )}
          <span className="text-[13px]" style={{ color: couleurMot }}>{mot}</span>
        </div>

        {/* La puce, ou sa place vide : le nom reste à la même hauteur d'un
            rang à l'autre. */}
        {courant || prochain ? (
          <span
            className="mt-3 inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-bold"
            style={courant
              ? { background: "rgba(245,177,32,0.18)", color: "var(--or-encre)" }
              : { background: "rgba(139,92,246,0.12)", color: "var(--exp-encre)" }}
          >
            {courant ? "Ton rang" : "Le prochain"}
          </span>
        ) : (
          <span className="mt-3 block h-[22px]" aria-hidden="true" />
        )}
        <h2
          className="mt-1"
          style={{ fontSize: 52, lineHeight: 0.95, fontWeight: 900, fontVariationSettings: "var(--w-affiche)", color: "var(--text-0)" }}
        >
          {rang.nom}
        </h2>
        {/* Combien il reste, sur ton rang seulement. Ailleurs la ligne garde
            sa place, pour que la décoration ne remonte pas d'un écran à
            l'autre. */}
        <p className="mt-2 min-h-[18px] text-[13px] text-center" style={{ color: "var(--text-2)" }}>
          {prog?.suivant && (
            <>Plus que <b className="vy-nombre" style={{ color: "var(--exp-encre)" }}>{prog.restant}</b> EXP avant {prog.suivant.nom}</>
          )}
          {prog && !prog.suivant && <>Tu as atteint le dernier rang.</>}
        </p>
      </div>

      {reco && (
        <div
          className="mt-5 flex items-center gap-3.5 px-4 py-3.5"
          style={{ borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)" }}
        >
          <div className="shrink-0" style={{ filter: atteint ? "none" : "grayscale(0.6) opacity(0.75)" }}>
            <ApercuRecompense kind={reco.apercu} rang={rang} pseudo={pseudo} avatarUrl={avatarUrl} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold" style={{ color: atteint ? "var(--teal-encre)" : "var(--text-3)" }}>
              {atteint ? "Débloqué" : "À débloquer"}
            </p>
            <p className="text-[16px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>{reco.titre}</p>
            <p className="mt-0.5 text-[13px] leading-snug" style={{ color: "var(--text-3)" }}>{reco.desc}</p>
          </div>
        </div>
      )}
    </section>
  );
}

/** L'anneau de progression autour de la gemme, aux couleurs du rang.
 *  `part` à `null` : la même place, sans anneau. Seul ton rang en porte un,
 *  mais la gemme reste au même endroit sur tous les écrans. */
function Anneau({
  part,
  couleurs,
  children,
}: {
  part: number | null;
  couleurs: [string, string];
  children: React.ReactNode;
}) {
  const taille = 236;
  const epaisseur = 10;
  const r = (taille - epaisseur) / 2;
  const tour = 2 * Math.PI * r;
  const id = `anneau-${couleurs[0].slice(1)}-${couleurs[1].slice(1)}`;
  return (
    <div className="relative grid place-items-center" style={{ width: taille, height: taille }}>
      {part !== null && (
        <svg width={taille} height={taille} className="absolute inset-0 -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={couleurs[0]} />
              <stop offset="1" stopColor={couleurs[1]} />
            </linearGradient>
          </defs>
          <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth={epaisseur} />
          <motion.circle
            cx={taille / 2}
            cy={taille / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={epaisseur}
            strokeLinecap="round"
            strokeDasharray={tour}
            initial={{ strokeDashoffset: tour }}
            animate={{ strokeDashoffset: tour * (1 - part) }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      )}
      {children}
    </div>
  );
}
