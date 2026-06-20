"use client";

/* ════════════════════════════════════════════════════════════════════
   NavOrb — l'orbe-assistant au centre de la navigation.

   • FIGÉE au repos (aucune animation continue → conso minimale).
   • Ne s'anime QU'À l'activation : appui (scale), enregistrement (pulses
     + vumètre), traitement (spinner).
   • Tap court  → ouvre le chat global (bottom sheet).
   • Appui long → enregistrement vocal → transcription → message envoyé.

   Visuel : PNG transparent (public/nav-orb.png) — verre violet + rubans
   façon Siri + halo doré, redimensionné en 256px (~12 Ko). Les animations
   (scale/pulses/vumètre/spinner) restent en CSS par-dessus.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";

const LONG_PRESS_MS = 350;

export default function NavOrb({ size = 52 }: { size?: number }) {
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

  return (
    <div className="relative flex items-center justify-center select-none touch-none"
      style={{ width: size, height: size }}>

      {/* Pulses pendant l'enregistrement */}
      <AnimatePresence>
        {recording && (
          <>
            <motion.span key="p1" className="absolute rounded-full pointer-events-none"
              style={{ width: size, height: size, border: "1.5px solid rgba(167,139,250,0.5)" }}
              animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
            <motion.span key="p2" className="absolute rounded-full pointer-events-none"
              style={{ width: size, height: size, border: "1.5px solid rgba(224,174,58,0.5)" }}
              animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
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
        className="relative cursor-pointer outline-none"
        style={{ width: size, height: size }}
        // Anime UNIQUEMENT à l'activation (sinon parfaitement figée)
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
        {/* Orbe (PNG transparent : verre + rubans + halo baked-in). Léger
            agrandissement pour remplir l'emplacement + glow violet doux. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nav-orb.png"
          alt=""
          draggable={false}
          className="absolute pointer-events-none select-none"
          style={{
            width: "106%", height: "106%", left: "-3%", top: "-3%",
            objectFit: "contain",
            // Calmée pour se fondre dans l'UI (moins voyante que les icônes ne
            // sont fines/plates) : AUCUN halo au repos, juste une ombre douce et
            // une légère désaturation. Le glow ne revient qu'à l'enregistrement.
            filter: recording
              ? "drop-shadow(0 0 8px rgba(167,139,250,0.5))"
              : "saturate(0.9) drop-shadow(0 1px 3px rgba(80,60,130,0.20))",
          }}
        />

        {/* Contenu central */}
        <span className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <AnimatePresence mode="wait">
            {recording ? (
              <motion.span key="rec" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-end gap-[3px]" style={{ filter: "drop-shadow(0 1px 2px rgba(255,255,255,0.6))" }}>
                {voice.levels.map((lvl, i) => (
                  <motion.span key={i} className="block w-[2.5px] rounded-full" style={{ background: "#fff" }}
                    animate={{ height: `${Math.max(6, lvl * (size * 0.42))}px` }} transition={{ duration: 0.08, ease: "linear" }} />
                ))}
              </motion.span>
            ) : processing ? (
              <motion.span key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1, rotate: 360 }} exit={{ opacity: 0 }}
                transition={{ rotate: { duration: 1.4, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}
                className="rounded-full" style={{ width: size * 0.4, height: size * 0.4, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff" }} />
            ) : pressing ? (
              <motion.span key="press" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ filter: "drop-shadow(0 1px 2px rgba(255,255,255,0.6))" }}>
                <Mic size={size * 0.4} strokeWidth={2} style={{ color: "#fff" }} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </motion.button>
    </div>
  );
}
