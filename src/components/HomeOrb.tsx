"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MessageCircle } from "lucide-react";

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
  size = 156,
}: {
  onTap: () => void;
  onTranscript?: (text: string) => void;
  size?: number;
}) {
  const [state, setState] = useState<OrbState>("idle");
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

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
  const ringSize = size + 90; // diamètre des liserés rotatifs

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 select-none touch-none">
      {/* Halo de fond doux */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 80,
          height: size + 80,
          background: "radial-gradient(circle, rgba(212,192,255,0.16) 0%, rgba(245,230,163,0.08) 50%, transparent 75%)",
        }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.4, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ─── Liserés Siri-style : 4 cercles thin rotatifs ─── */}
      <svg
        className="absolute pointer-events-none"
        width={ringSize}
        height={ringSize}
        viewBox={`0 0 ${ringSize} ${ringSize}`}
        style={{ overflow: "visible" }}
      >
        {/* Anneau 1 — violet pâle, rotation horaire 18s, arc 80% */}
        <motion.circle
          cx={ringSize / 2} cy={ringSize / 2} r={(ringSize / 2) - 4}
          fill="none"
          stroke="rgba(167,139,250,0.45)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="240 80"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${ringSize / 2}px ${ringSize / 2}px` }}
        />
        {/* Anneau 2 — or pâle, rotation anti-horaire 24s, arc différent */}
        <motion.circle
          cx={ringSize / 2} cy={ringSize / 2} r={(ringSize / 2) - 12}
          fill="none"
          stroke="rgba(245,230,163,0.55)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeDasharray="180 120"
          animate={{ rotate: -360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${ringSize / 2}px ${ringSize / 2}px` }}
        />
        {/* Anneau 3 — lavande, rotation horaire 14s, arc fin */}
        <motion.circle
          cx={ringSize / 2} cy={ringSize / 2} r={(ringSize / 2) - 20}
          fill="none"
          stroke="rgba(212,192,255,0.4)"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeDasharray="60 280"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${ringSize / 2}px ${ringSize / 2}px` }}
        />
        {/* Anneau 4 — pêche/or, rotation anti-horaire 20s, arc mi-long */}
        <motion.circle
          cx={ringSize / 2} cy={ringSize / 2} r={(ringSize / 2) - 28}
          fill="none"
          stroke="rgba(255,212,163,0.5)"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="100 200"
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${ringSize / 2}px ${ringSize / 2}px` }}
        />
      </svg>

      {/* Pulses pendant recording */}
      <AnimatePresence>
        {state === "recording" && (
          <>
            <motion.div
              key="pulse1"
              className="absolute rounded-full border pointer-events-none"
              style={{
                width: size,
                height: size,
                borderColor: "rgba(167,139,250,0.4)",
              }}
              animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              key="pulse2"
              className="absolute rounded-full border pointer-events-none"
              style={{
                width: size,
                height: size,
                borderColor: "rgba(245,230,163,0.45)",
              }}
              animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* L'orbe — le bouton principal */}
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        className="relative rounded-full flex items-center justify-center cursor-pointer outline-none"
        style={{
          width: size,
          height: size,
          background:
            state === "recording"
              ? "radial-gradient(135deg at 30% 30%, #D4C0FF 0%, #F5E6A3 60%, #FFFBF0 100%)"
              : state === "processing"
              ? "radial-gradient(135deg at 30% 30%, #F5E6A3 0%, #D4C0FF 100%)"
              : "radial-gradient(135deg at 30% 30%, #F0EBFF 0%, #FFFBF0 60%, #F0EBFF 100%)",
          boxShadow:
            state === "recording"
              ? "0 0 64px 16px rgba(167,139,250,0.32), 0 0 120px 32px rgba(212,168,67,0.20), inset 0 1px 0 rgba(255,255,255,0.85)"
              : "0 12px 56px 0 rgba(167,139,250,0.25), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
        animate={
          state === "recording"
            ? { scale: [1, 1.05, 1] }
            : state === "pressing"
            ? { scale: 0.94 }
            : state === "processing"
            ? { scale: [1, 0.97, 1] }
            : { scale: 1 }
        }
        transition={
          state === "recording"
            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            : state === "processing"
            ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-1"
            >
              <MessageCircle size={28} strokeWidth={1.5} style={{ color: "#2D3748" }} />
            </motion.div>
          )}
          {state === "pressing" && (
            <motion.div
              key="pressing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Mic size={32} strokeWidth={1.5} style={{ color: "#2D3748" }} />
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
            >
              {levels.map((lvl, i) => (
                <motion.span
                  key={i}
                  className="block w-[3px] rounded-full"
                  style={{ background: "#2D3748" }}
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
                  borderColor: "rgba(45,55,72,0.2)",
                  borderTopColor: "#2D3748",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-[11px] font-light tracking-[0.18em] uppercase text-center"
          style={{ color: "#A0AEC0" }}
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
