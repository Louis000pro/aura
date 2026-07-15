"use client";

/* ════════════════════════════════════════════════════════════════════
   NavOrb — le bouton assistant au centre de la navigation.

   Visuel : glyphe SVG vectoriel (« pictogramme ») — un cercle au trait de 2
   sur grille 24 (le poids exact des icônes lucide voisines), traversé par un
   ruban, avec une étincelle d'or. Il hérite des couleurs du thème (violet
   action + or) → mode sombre automatique, net à toutes les tailles. Remplace
   l'ancien PNG photoréaliste qui jurait avec la barre ; le PNG reste le
   visage du chat dans AssistantSheet.

   • FIGÉ au repos (aucune animation continue → conso minimale).
   • Ne s'anime QU'À l'activation : appui (scale + micro), enregistrement
     (pulses + vumètre), traitement (spinner) — le tout DANS le cercle.
   • Tap court  → ouvre le chat global (bottom sheet).
   • Appui long → enregistrement vocal → transcription → message envoyé.
   • `size` = zone tactile (≥ 44 px) ; `glyph` = taille dessinée. Des marges
     négatives réduisent l'empreinte de MISE EN PAGE à `glyph` → le glyphe
     s'aligne sur la rangée d'icônes tout en gardant une vraie cible tactile.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";

const LONG_PRESS_MS = 350;

/* Le glyphe. `quiet` retire le ruban et l'étincelle pour laisser le cercle
   servir de cadre au contenu d'état (micro / vumètre / spinner). */
function OrbGlyph({ px, quiet }: { px: number; quiet: boolean }) {
  const clipId = useId();
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <clipPath id={clipId}><circle cx="12" cy="12" r="9" /></clipPath>
      </defs>
      <circle cx="12" cy="12" r="9" style={{ fill: "rgba(var(--accent-rgb),0.14)" }} />
      {!quiet && (
        <g clipPath={`url(#${clipId})`}>
          <path d="M1.5 14.5 C 8 8, 16 18.5, 22.5 11" strokeWidth={1.7} strokeLinecap="round"
            style={{ stroke: "var(--accent)", opacity: 0.8 }} />
        </g>
      )}
      <circle cx="12" cy="12" r="9" strokeWidth={2} style={{ stroke: "var(--accent)" }} />
      {!quiet && (
        <path d="M15.9 6.7 Q16.15 7.85 17.3 8.1 Q16.15 8.35 15.9 9.5 Q15.65 8.35 14.5 8.1 Q15.65 7.85 15.9 6.7 Z"
          style={{ fill: "var(--gold)" }} />
      )}
    </svg>
  );
}

export default function NavOrb({ size = 48, glyph }: { size?: number; glyph?: number }) {
  const px = glyph ?? Math.round(size * 0.56);
  const { open } = useAssistant();
  const voice = useVoiceCapture({ onTranscript: (t) => open(t) });
  const [pressing, setPressing] = useState(false);

  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongRef = useRef(false);
  const suppressClickRef = useRef(false);

  const clearTimer = () => {
    if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; }
  };

  // L'appui démarre le timer d'appui long. Le TAP est géré par onClick (natif),
  // bien plus fiable au toucher que pointerup — qui « saute » au moindre
  // micro-mouvement du doigt et faisait que le chat ne s'ouvrait pas sur mobile.
  const onDown = useCallback(() => {
    if (voice.state === "recording" || voice.state === "processing") return;
    isLongRef.current = false;
    setPressing(true);
    longTimer.current = setTimeout(() => {
      isLongRef.current = true;
      suppressClickRef.current = true; // appui long → ce n'est pas un tap
      voice.start();
    }, LONG_PRESS_MS);
  }, [voice]);

  const endPress = useCallback(() => {
    clearTimer();
    setPressing(false);
    if (voice.state === "recording" && isLongRef.current) voice.stop();
  }, [voice]);

  const onClick = useCallback(() => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    open();
  }, [open]);

  const recording = voice.state === "recording";
  const processing = voice.state === "processing";
  const quiet = pressing || recording || processing;

  return (
    <div className="relative flex items-center justify-center select-none touch-none"
      style={{ width: size, height: size, margin: (px - size) / 2 }}>

      {/* Pulses pendant l'enregistrement — naissent au bord du glyphe */}
      <AnimatePresence>
        {recording && (
          <>
            <motion.span key="p1" className="absolute rounded-full pointer-events-none"
              style={{ width: px, height: px, border: "1.5px solid rgba(var(--accent-rgb),0.5)" }}
              animate={{ scale: [1, 2.1], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
            <motion.span key="p2" className="absolute rounded-full pointer-events-none"
              style={{ width: px, height: px, border: "1.5px solid rgba(var(--gold-rgb),0.5)" }}
              animate={{ scale: [1, 2.1], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }} />
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onPointerDown={onDown}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Assistant Vaiiya — appuie pour écrire, maintiens pour parler"
        className="relative cursor-pointer outline-none flex items-center justify-center"
        style={{ width: size, height: size }}
        // Anime UNIQUEMENT à l'activation (sinon parfaitement figé)
        animate={
          recording  ? { scale: [1, 1.06, 1] } :
          processing ? { scale: [1, 0.97, 1] } :
          pressing   ? { scale: 0.92 } : { scale: 1 }
        }
        transition={
          recording  ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } :
          processing ? { duration: 1, repeat: Infinity, ease: "easeInOut" } :
          { duration: 0.18 }
        }
      >
        <OrbGlyph px={px} quiet={quiet} />

        {/* Contenu d'état, DANS le cercle (couleurs du thème, plus de blanc) */}
        <span className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <AnimatePresence mode="wait">
            {recording ? (
              <motion.span key="rec" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-end gap-[2px]">
                {voice.levels.map((lvl, i) => (
                  <motion.span key={i} className="block w-[2px] rounded-full" style={{ background: "var(--accent)" }}
                    animate={{ height: `${Math.max(4, lvl * (px * 0.5))}px` }} transition={{ duration: 0.08, ease: "linear" }} />
                ))}
              </motion.span>
            ) : processing ? (
              <motion.span key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1, rotate: 360 }} exit={{ opacity: 0 }}
                transition={{ rotate: { duration: 1.4, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}
                className="rounded-full"
                style={{ width: px * 0.55, height: px * 0.55, border: "2px solid rgba(var(--accent-rgb),0.3)", borderTopColor: "var(--accent)" }} />
            ) : pressing ? (
              <motion.span key="press" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <Mic size={Math.round(px * 0.52)} strokeWidth={2} style={{ color: "var(--accent)" }} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </motion.button>
    </div>
  );
}
