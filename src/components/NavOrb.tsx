"use client";

/* ════════════════════════════════════════════════════════════════════
   NavOrb — l'orbe-assistant au centre de la navigation.

   • FIGÉE au repos (aucune animation continue → conso minimale).
   • Ne s'anime QU'À l'activation : appui (scale), enregistrement (pulses
     + vumètre), traitement (spinner).
   • Tap court  → ouvre le chat global (bottom sheet).
   • Appui long → enregistrement vocal → transcription → message envoyé.

   Identité de marque (lavande → violet → or) sans le coût GPU de la
   grande orbe d'accueil.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mic } from "lucide-react";
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
        className="relative rounded-full overflow-hidden cursor-pointer outline-none"
        style={{
          width: size, height: size,
          // Sphère figée — lavande → violet → or (identité de marque)
          background: "radial-gradient(circle at 38% 30%, #F6EEFF 0%, #C9B3FF 38%, #8B5CF6 100%)",
          boxShadow: recording
            ? "0 0 0 0 rgba(0,0,0,0), 0 6px 22px rgba(167,139,250,0.55), inset 0 2px 4px rgba(255,255,255,0.85)"
            : "0 4px 16px rgba(167,139,250,0.45), 0 1px 4px rgba(224,174,58,0.18), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -3px 8px rgba(139,92,246,0.25)",
        }}
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
        {/* Reflet spéculaire haut-gauche (3D verre) — statique */}
        <span className="absolute pointer-events-none" style={{
          top: "-12%", left: "-12%", width: "70%", height: "70%",
          background: "radial-gradient(circle at 32% 32%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.12) 38%, transparent 62%)",
          borderRadius: "50%",
        }} />
        {/* Liseré or chaud, statique */}
        <span className="absolute inset-0 rounded-full pointer-events-none" style={{
          background: "conic-gradient(from 210deg, transparent 0deg, rgba(224,174,58,0.28) 50deg, transparent 120deg)",
          mixBlendMode: "screen",
        }} />

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
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 0.92 }} exit={{ opacity: 0 }}
                style={{ filter: "drop-shadow(0 1px 2px rgba(124,92,250,0.5))" }}>
                <Sparkles size={size * 0.42} strokeWidth={1.6} style={{ color: "#fff" }} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </div>
  );
}
