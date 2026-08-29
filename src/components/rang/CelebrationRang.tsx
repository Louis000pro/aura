"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import GemmeRang from "@/components/GemmeRang";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import ApercuRecompense from "@/components/rang/ApercuRecompense";
import { EVENEMENT_RANG_MONTE, type DetailRangMonte } from "@/lib/celebrationRang";
import { RANGS, RECOMPENSE_RANG, type Rang } from "@/lib/aura";

/**
 * La scène de passage de rang. Monté une fois dans le layout : le rang peut
 * monter n'importe où (fin de séance, repas noté, simple présence), donc la
 * célébration ne peut pas vivre dans un écran.
 *
 * Sobre par contrat (limite dure du rang : jamais de peau jeu-vidéo fluo) :
 * un voile, la gemme qui arrive, le nom, ET SURTOUT la décoration débloquée
 * montrée en vrai sur ton pseudo/ta photo. C'est le seul moment où l'on peut
 * dire « voilà ce que tu viens de gagner » en le montrant.
 *
 * Aucun réseau, aucune écriture serveur : `noterRang` (lib/celebrationRang.ts)
 * a déjà tout tranché avant d'émettre l'évènement.
 *
 * ⚠️ LA GEMME RESTE LE HÉROS. Le Guide ne recouvre pas la scène, il te
 * tend la récompense : visage de 34 px sur le côté de sa phrase, contre
 * 116 px pour la gemme. Un portrait de la même taille ferait deux ronds
 * l'un sous l'autre, c'est-à-dire deux héros ; c'est exactement
 * l'arbitrage déjà rendu en fin de séance, où la coche teal est passée de
 * médaillon à sceau.
 *
 * ⚠️ ET IL N'EN DIT PAS PLUS. La phrase remplace « Tu as tenu, ça se voit
 * maintenant. », elle ne s'ajoute pas à elle : la gemme dit déjà le rang,
 * la carte du dessous dit déjà ce qui est débloqué. Sans Guide résolu,
 * `VisageGuide` retombe sur l'étincelle ✦ et `voix` sur le texte commun.
 */
export default function CelebrationRang() {
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const reduce = useReducedMotion();
  const [rang, setRang] = useState<Rang | null>(null);
  const [monte, setMonte] = useState(false);

  useEffect(() => setMonte(true), []);

  useEffect(() => {
    const onMonte = (e: Event) => {
      const detail = (e as CustomEvent<DetailRangMonte>).detail;
      const trouve = RANGS.find((r) => r.id === detail?.rangId);
      if (trouve) setRang(trouve);
    };
    window.addEventListener(EVENEMENT_RANG_MONTE, onMonte);
    return () => window.removeEventListener(EVENEMENT_RANG_MONTE, onMonte);
  }, []);

  const fermer = useCallback(() => setRang(null), []);

  useEffect(() => {
    if (!rang) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rang, fermer]);

  if (!monte) return null;

  const reco = rang ? RECOMPENSE_RANG[rang.id] : null;

  return createPortal(
    <AnimatePresence>
      {rang && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={fermer}
          role="dialog"
          aria-label={`Nouveau rang : ${rang.nom}`}
          style={{ background: "rgba(12,7,24,0.72)", backdropFilter: "blur(6px)" }}
        >
          {!reduce && <Confettis rang={rang} />}

          <motion.div
            className="relative w-full max-w-[360px] rounded-[28px] px-6 pt-7 pb-6 text-center"
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--page-bg)",
              border: "1px solid rgba(var(--accent-rgb),0.18)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
            }}
          >
            <span
              className="text-[10.5px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--gold)" }}
            >
              Nouveau rang
            </span>

            {/* La gemme, posée sur son halo aux couleurs du rang. */}
            <div className="relative mx-auto mt-3 grid h-[168px] w-[168px] place-items-center">
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${rang.neon[0]}55 0%, transparent 68%)` }}
                {...(reduce
                  ? {}
                  : {
                      animate: { scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] },
                      transition: { duration: 3.2, ease: "easeInOut" as const, repeat: Infinity },
                    })}
              />
              <motion.div
                initial={reduce ? false : { scale: 0.4, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.08 }}
              >
                <GemmeRang rang={rang} size={116} />
              </motion.div>
            </div>

            <h2
              className="mt-2 text-[30px] font-black leading-none tracking-[-0.03em]"
              style={{ color: "var(--text-0)" }}
            >
              {rang.nom}
            </h2>
            {/* Celui qui te la tend. `encourage` est le seul état qui vaille
                ici : quelque chose vient d'aboutir. */}
            <div className="mx-auto mt-3 flex max-w-[300px] items-start gap-2.5 text-left">
              <VisageGuide guide={guide} etat="encourage" size={34} />
              <p className="pt-0.5 text-[13px] leading-snug" style={{ color: "var(--text-soft)" }}>
                {voix(guide, "rang.montee", { rang: rang.nom, exp: rang.min })}
              </p>
            </div>

            {/* Ce qui est débloqué, montré pour de vrai (pas une promesse). */}
            {reco && (
              <div
                className="mt-4 rounded-2xl px-3.5 py-3 text-left"
                style={{
                  background: "rgba(var(--accent-rgb),0.06)",
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[17px] shrink-0">{reco.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
                      {reco.titre}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "var(--text-3)" }}>
                      {reco.desc}
                    </p>
                  </div>
                </div>
                <div
                  className="mt-2.5 flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    background: "rgba(var(--tint-violet-rgb),0.55)",
                    border: "1px dashed rgba(var(--accent-rgb),0.16)",
                  }}
                >
                  <ApercuRecompense
                    kind={reco.apercu}
                    rang={rang}
                    pseudo={user?.pseudo ?? user?.name ?? ""}
                    avatarUrl={user?.avatar}
                  />
                  <span
                    className="ml-auto shrink-0 text-[9.5px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--accent)" }}
                  >
                    Actif
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={fermer}
              className="mt-5 w-full rounded-2xl py-3.5 text-[15px] font-bold active:opacity-90"
              style={{
                background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                color: "#fff",
                boxShadow: "0 8px 26px rgba(139,92,246,0.35)",
              }}
            >
              Continuer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Les confettis — une seule chute, pas de boucle. Couleurs du système D
 * (violet/magenta = marque, or = énergie, teal = réussite) plus le néon du rang.
 * ────────────────────────────────────────────────────────────────────────── */

function Confettis({ rang }: { rang: Rang }) {
  const morceaux = useMemo(() => {
    const couleurs = ["#8B5CF6", "#C13BC1", "#FFD34E", "#2BD4A0", rang.neon[0]];
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      gauche: 6 + Math.random() * 88,
      couleur: couleurs[i % couleurs.length],
      delai: Math.random() * 0.45,
      duree: 1.7 + Math.random() * 0.9,
      derive: (Math.random() - 0.5) * 90,
      tour: (Math.random() - 0.5) * 520,
      largeur: 5 + Math.random() * 4,
      hauteur: 9 + Math.random() * 7,
    }));
  }, [rang.neon]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {morceaux.map((m) => (
        <motion.span
          key={m.id}
          className="absolute rounded-[2px]"
          style={{
            left: `${m.gauche}%`,
            top: "-6%",
            width: m.largeur,
            height: m.hauteur,
            background: m.couleur,
          }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", x: m.derive, rotate: m.tour, opacity: 0 }}
          transition={{
            duration: m.duree,
            delay: m.delai,
            ease: "easeIn",
            // Le morceau ne s'efface que sur la fin de sa chute, pas tout du long.
            opacity: { duration: m.duree * 0.3, delay: m.delai + m.duree * 0.7, ease: "linear" },
          }}
        />
      ))}
    </div>
  );
}
