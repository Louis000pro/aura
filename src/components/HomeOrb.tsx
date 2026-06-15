"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { usePerfMode } from "@/lib/perfMode";

/* ─── Détection geste : tap court vs long press ────────────────────────
   - Tap court  (<350 ms) → ouvre le chat
   - Long press (≥350 ms) → démarre l'enregistrement vocal
   - Pendant long press : feedback visuel (scale + halo qui pulse)
   - Au relâchement après long press : stop l'enregistrement et envoie le transcript
   ────────────────────────────────────────────────────────────────────── */

type OrbState = "idle" | "pressing" | "recording" | "processing";

const LONG_PRESS_MS = 350;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function extFromMime(mime: string) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}

export default function HomeOrb({
  onTap,
  onTranscript,
  size = 176,
}: {
  onTap: () => void;
  onTranscript?: (text: string) => void;
  size?: number;
}) {
  const [state, setState] = useState<OrbState>("idle");
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  // Appareils faibles : on allège l'orbe (moins de blobs, pas de sheen ni d'arcs).
  const lite = usePerfMode();

  const pressStartRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupRecording = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  /* ─── Démarrage de l'enregistrement vocal ────────────────────────── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMimeType();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        cleanupRecording();

        if (blob.size < 1000) {
          setState("idle");
          return;
        }

        try {
          const form = new FormData();
          form.append("audio", blob, `voice.${extFromMime(mime)}`);
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          if (data?.text?.trim() && onTranscript) onTranscript(data.text.trim());
        } catch (e) {
          setError("Transcription échouée 🙏");
          setTimeout(() => setError(null), 2500);
        } finally {
          setState("idle");
        }
      };

      // Setup analyser pour vumètre
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        ctx.resume().catch(() => {});
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const bands = [0.05, 0.15, 0.3, 0.5, 0.7].map((r) =>
            Math.min(1, (data[Math.floor(r * data.length)] ?? 0) / 180),
          );
          setLevels(bands);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {/* vumètre désactivé mais l'enregistrement marche */}

      recorder.start();
      setState("recording");
    } catch (e) {
      setError("Micro inaccessible 🙏");
      setTimeout(() => setError(null), 2500);
      setState("idle");
    }
  }, [onTranscript]);

  /* ─── Gestion des gestures (pointer events pour mobile + desktop) ─── */
  const handlePointerDown = useCallback(() => {
    if (state === "recording" || state === "processing") return;
    isLongPressRef.current = false;
    pressStartRef.current = Date.now();
    setState("pressing");
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRecording();
    }, LONG_PRESS_MS);
  }, [state, startRecording]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const wasPressing = state === "pressing";
    const wasRecording = state === "recording";

    if (wasRecording && isLongPressRef.current) {
      // Stop recording → onstop callback s'occupe du transcript
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } else if (wasPressing && !isLongPressRef.current) {
      // Tap rapide → ouvre chat
      setState("idle");
      onTap();
    } else if (wasPressing) {
      setState("idle");
    }
  }, [state, onTap]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (state === "recording" && mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (state === "pressing") setState("idle");
  }, [state]);

  /* ─── Rendu ────────────────────────────────────────────────────────── */
  const accentSize = size + 64;
  // Vitesse des animations : recording = plus vif
  const speedMult = state === "recording" ? 0.55 : 1;

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 select-none touch-none">
      {/* Halo de fond ultra-doux */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 90,
          height: size + 90,
          background: "radial-gradient(circle, rgba(212,192,255,0.14) 0%, rgba(245,230,163,0.07) 50%, transparent 75%)",
        }}
        animate={{ scale: [1, 1.04, 1], opacity: [0.55, 0.4, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ─── Anneaux extérieurs irréguliers (très subtils) — coupés en perf-lite ─── */}
      {!lite && <svg
        className="absolute pointer-events-none"
        width={accentSize}
        height={accentSize}
        viewBox={`0 0 ${accentSize} ${accentSize}`}
        style={{ overflow: "visible" }}
      >
        {/* Arc irrégulier 1 — courbe organique violet, rotation lente */}
        <motion.path
          d={`M ${accentSize * 0.92} ${accentSize / 2}
              C ${accentSize * 0.92} ${accentSize * 0.75},
                ${accentSize * 0.72} ${accentSize * 0.94},
                ${accentSize * 0.48} ${accentSize * 0.92}
              C ${accentSize * 0.22} ${accentSize * 0.9},
                ${accentSize * 0.06} ${accentSize * 0.62},
                ${accentSize * 0.08} ${accentSize * 0.42}`}
          fill="none"
          stroke="rgba(167,139,250,0.22)"
          strokeWidth="0.7"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${accentSize / 2}px ${accentSize / 2}px` }}
        />
        {/* Arc irrégulier 2 — courbe or, rotation inverse plus lente */}
        <motion.path
          d={`M ${accentSize * 0.1} ${accentSize * 0.5}
              C ${accentSize * 0.15} ${accentSize * 0.25},
                ${accentSize * 0.4} ${accentSize * 0.08},
                ${accentSize * 0.62} ${accentSize * 0.1}
              C ${accentSize * 0.78} ${accentSize * 0.12},
                ${accentSize * 0.9} ${accentSize * 0.28},
                ${accentSize * 0.88} ${accentSize * 0.48}`}
          fill="none"
          stroke="rgba(245,230,163,0.18)"
          strokeWidth="0.6"
          strokeLinecap="round"
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${accentSize / 2}px ${accentSize / 2}px` }}
        />
      </svg>}

      {/* Pulses pendant recording */}
      <AnimatePresence>
        {state === "recording" && (
          <>
            <motion.div
              key="pulse1"
              className="absolute rounded-full border pointer-events-none"
              style={{ width: size, height: size, borderColor: "rgba(167,139,250,0.4)" }}
              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              key="pulse2"
              className="absolute rounded-full border pointer-events-none"
              style={{ width: size, height: size, borderColor: "rgba(245,230,163,0.45)" }}
              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ─── L'ORBE PRINCIPAL — sphère 3D avec blobs Siri-fluides ─── */}
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        className="relative rounded-full overflow-hidden cursor-pointer outline-none"
        style={{
          width: size,
          height: size,
          // Fond clair et lumineux
          background: "radial-gradient(circle at 50% 42%, #FFFFFF 0%, #F6F1FE 65%, #EFE8FA 100%)",
          boxShadow:
            state === "recording"
              ? "0 0 72px 18px rgba(167,139,250,0.38), 0 0 140px 36px rgba(212,168,67,0.22), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 8px rgba(167,139,250,0.15)"
              : "0 16px 64px 0 rgba(167,139,250,0.3), 0 4px 16px rgba(212,168,67,0.12), inset 0 2px 4px rgba(255,255,255,0.95), inset 0 -2px 8px rgba(167,139,250,0.1)",
        }}
        animate={
          state === "recording" ? { scale: [1, 1.05, 1], y: 0 } :
          state === "pressing"  ? { scale: 0.95, y: 0 } :
          state === "processing"? { scale: [1, 0.97, 1], y: 0 } :
          { scale: [1, 1.025, 0.99, 1], y: [0, -6, 0, -3, 0] } // respiration + flottement idle
        }
        transition={
          state === "recording"  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } :
          state === "processing" ? { duration: 1, repeat: Infinity, ease: "easeInOut" } :
          state === "pressing"   ? { duration: 0.2 } :
          { duration: 6, repeat: Infinity, ease: "easeInOut" } // respiration + flottement lent idle
        }
      >
        {/* ═══ BLOBS FLUIDES INTÉRIEURS (Siri-style) ═══ */}
        {/* Chaque blob est un cercle saturé avec blur, animé en X/Y/scale */}

        {/* Blob 1 — Violet profond */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.78,
            height: size * 0.78,
            top: "50%", left: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(139,92,246,0.4) 48%, transparent 78%)",
            filter: `blur(${size * 0.13}px)`,
            mixBlendMode: "multiply",
            x: "-50%", y: "-50%",
          }}
          animate={{
            x: ["-65%", "-28%", "-58%", "-40%", "-65%"],
            y: ["-55%", "-68%", "-28%", "-50%", "-55%"],
            scale: [1, 1.2, 0.92, 1.1, 1],
          }}
          transition={{
            duration: 4.2 * speedMult,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Blob 2 — Or chaud */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.7,
            height: size * 0.7,
            top: "50%", left: "50%",
            background: "radial-gradient(circle, rgba(224,174,58,0.5) 0%, rgba(224,174,58,0.35) 50%, transparent 80%)",
            filter: `blur(${size * 0.13}px)`,
            mixBlendMode: "multiply",
            x: "-50%", y: "-50%",
          }}
          animate={{
            x: ["-35%", "-58%", "-28%", "-48%", "-35%"],
            y: ["-30%", "-52%", "-62%", "-38%", "-30%"],
            scale: [1.05, 0.92, 1.14, 1, 1.05],
          }}
          transition={{
            duration: 5 * speedMult,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
            delay: 0.5,
          }}
        />

        {/* Blobs 3-5 + sheen rotatif — coupés en perf-lite (allège fortement le GPU) */}
        {!lite && <>
        {/* Blob 3 — Pêche corail */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            top: "50%", left: "50%",
            background: "radial-gradient(circle, rgba(255,149,128,0.55) 0%, rgba(255,149,128,0.4) 50%, transparent 80%)",
            filter: `blur(${size * 0.12}px)`,
            mixBlendMode: "screen",
            x: "-50%", y: "-50%",
          }}
          animate={{
            x: ["-45%", "-68%", "-48%", "-58%", "-45%"],
            y: ["-65%", "-38%", "-58%", "-45%", "-65%"],
            scale: [0.9, 1.15, 1, 1.08, 0.9],
          }}
          transition={{
            duration: 4.6 * speedMult,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
            delay: 1,
          }}
        />

        {/* Blob 4 — Lavande clair */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.64,
            height: size * 0.64,
            top: "50%", left: "50%",
            background: "radial-gradient(circle, #C4A8FF 0%, rgba(196,168,255,0.65) 50%, transparent 80%)",
            filter: `blur(${size * 0.12}px)`,
            mixBlendMode: "screen",
            x: "-50%", y: "-50%",
          }}
          animate={{
            x: ["-55%", "-32%", "-68%", "-45%", "-55%"],
            y: ["-40%", "-62%", "-42%", "-58%", "-40%"],
            scale: [1, 0.9, 1.12, 1.02, 1],
          }}
          transition={{
            duration: 5.4 * speedMult,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
            delay: 0.3,
          }}
        />

        {/* Blob 5 — Rose magenta (profondeur supplémentaire) */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            top: "50%", left: "50%",
            background: "radial-gradient(circle, rgba(244,114,182,0.45) 0%, rgba(244,114,182,0.3) 50%, transparent 80%)",
            filter: `blur(${size * 0.13}px)`,
            mixBlendMode: "screen",
            x: "-50%", y: "-50%",
          }}
          animate={{
            x: ["-48%", "-62%", "-38%", "-52%", "-48%"],
            y: ["-52%", "-42%", "-60%", "-48%", "-52%"],
            scale: [0.95, 1.1, 0.88, 1.05, 0.95],
          }}
          transition={{
            duration: 6 * speedMult,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
            delay: 1.5,
          }}
        />

        {/* ═══ SHEEN ROTATIF (conic) — donne de la vie/fluidité ═══ */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(167,139,250,0.18) 70deg, transparent 140deg, rgba(245,230,163,0.14) 220deg, transparent 300deg)",
            mixBlendMode: "screen",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14 * speedMult, repeat: Infinity, ease: "linear" }}
        />
        </>}

        {/* ═══ GLASS HIGHLIGHT (effet 3D verre) ═══ */}
        {/* Reflet brillant en haut-gauche pour sphère */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-10%", left: "-10%",
            width: "80%", height: "80%",
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.15) 35%, transparent 60%)",
            borderRadius: "50%",
          }}
        />
        {/* Mince reflet linéaire en haut */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "8%", left: "20%",
            width: "55%", height: "15%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)",
            borderRadius: "50%",
            filter: "blur(4px)",
          }}
        />
        {/* Bord intérieur soft (verre profond) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 -8px 24px rgba(139,92,246,0.12)",
          }}
        />

        {/* ═══ Contenu central — au-dessus des blobs et du glass ═══ */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
          <AnimatePresence mode="wait">
            {state === "pressing" && (
              <motion.div
                key="pressing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                style={{ filter: "drop-shadow(0 1px 2px rgba(255,255,255,0.6))" }}
              >
                <Mic size={30} strokeWidth={2} style={{ color: "#FFFFFF" }} />
              </motion.div>
            )}
            {state === "recording" && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-[4px]"
                style={{ filter: "drop-shadow(0 1px 2px rgba(255,255,255,0.6))" }}
              >
                {levels.map((lvl, i) => (
                  <motion.span
                    key={i}
                    className="block w-[3px] rounded-full"
                    style={{ background: "#FFFFFF" }}
                    animate={{ height: `${Math.max(8, lvl * 38)}px` }}
                    transition={{ duration: 0.08, ease: "linear" }}
                  />
                ))}
              </motion.div>
            )}
            {state === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
                  opacity: { duration: 0.2 },
                }}
              >
                <div
                  className="w-8 h-8 rounded-full border-[2px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.35)",
                    borderTopColor: "#FFFFFF",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-[11px] font-medium tracking-[0.18em] uppercase text-center"
          style={{ color: "#8B7FB0" }}
        >
          {state === "idle" && "Appuie pour écrire · Maintiens pour parler"}
          {state === "pressing" && "Maintiens pour parler…"}
          {state === "recording" && "Relâche pour envoyer"}
          {state === "processing" && "Transcription…"}
        </motion.p>
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-[11px] text-center"
            style={{ color: "#A78BFA" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
