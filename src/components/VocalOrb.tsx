"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

type OrbState = "idle" | "listening" | "processing";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // Firefox prefers ogg/opus, Chrome/Edge prefer webm/opus, Safari uses mp4
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

export default function VocalOrb({ onTranscript }: { onTranscript?: (text: string) => void }) {
  const [state, setState] = useState<OrbState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopAudioAnalysis();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ── Vumètre live ── */
  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      // Firefox sometimes needs an explicit resume after user gesture
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
    } catch {
      // AudioContext failed — vumètre won't animate but recording still works
    }
  };

  const stopAudioAnalysis = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevels([0, 0, 0, 0, 0]);
  };

  /* ── Enregistrement ── */
  const startListening = useCallback(async () => {
    setError(null);
    setDebugInfo(null);
    chunksRef.current = [];

    try {
      // ⚠️ No sampleRate constraint — Firefox rejects exact sampleRate values
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      startAudioAnalysis(stream);

      const mimeType = pickMimeType();
      setDebugInfo(`Format: ${mimeType || "auto"}`);

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopAudioAnalysis();
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const usedMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: usedMime });
        chunksRef.current = [];

        setDebugInfo(`Audio: ${(blob.size / 1024).toFixed(1)} ko — envoi…`);
        setState("processing");

        if (blob.size < 100) {
          setError("Aucun audio capté. Vérifiez que votre micro est autorisé dans Firefox.");
          setDebugInfo(null);
          setTimeout(() => setError(null), 5000);
          setState("idle");
          return;
        }

        try {
          const ext = extFromMime(usedMime);
          const form = new FormData();
          form.append("audio", blob, `rec.${ext}`);

          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error ?? `HTTP ${res.status}`);
          }

          const text: string = data.text?.trim() ?? "";
          setDebugInfo(null);

          if (text) {
            onTranscript?.(text);
          } else {
            setError("Aucun texte reconnu — parlez plus fort ou plus clairement.");
            setTimeout(() => setError(null), 4000);
          }
        } catch (err) {
          console.error("Transcription error:", err);
          setError(`Erreur : ${err instanceof Error ? err.message : "transcription échouée"}`);
          setDebugInfo(null);
          setTimeout(() => setError(null), 5000);
        } finally {
          setState("idle");
        }
      };

      // timeslice 200 ms → les chunks arrivent régulièrement
      recorder.start(200);
      setState("listening");
    } catch (err: unknown) {
      stopAudioAnalysis();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("permission")) {
        setError("Accès au micro refusé. Autorisez-le dans Firefox : 🔒 dans la barre d'adresse.");
      } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("device")) {
        setError("Aucun micro détecté sur cet appareil.");
      } else {
        setError(`Erreur micro : ${msg}`);
      }
      setTimeout(() => setError(null), 6000);
      setState("idle");
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.requestData(); // flush le dernier chunk avant stop
      rec.stop();
    }
  }, []);

  const handleClick = () => {
    if (state === "listening") stopListening();
    else if (state === "idle") startListening();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── Orb ── */}
      <div className="relative flex items-center justify-center">
        {state === "listening" && (
          <>
            <motion.div className="absolute rounded-full pointer-events-none"
              style={{ width: 240, height: 240, background: "radial-gradient(circle, rgba(255,214,231,0.18) 0%, transparent 70%)" }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
            <motion.div className="absolute rounded-full pointer-events-none"
              style={{ width: 200, height: 200, background: "radial-gradient(circle, rgba(178,240,240,0.2) 0%, transparent 70%)" }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} />
          </>
        )}
        {state === "idle" && (
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ width: 180, height: 180, background: "radial-gradient(circle, rgba(255,214,231,0.1) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        )}

        <motion.button
          onClick={handleClick}
          className="relative rounded-full flex items-center justify-center cursor-pointer outline-none"
          style={{
            width: 140, height: 140,
            background:
              state === "listening"
                ? "radial-gradient(135deg at 30% 30%, #FFD6E7 0%, #B2F0F0 60%, #E0FFFF 100%)"
                : state === "processing"
                ? "radial-gradient(135deg at 30% 30%, #B2F0F0 0%, #FFD6E7 100%)"
                : "radial-gradient(135deg at 30% 30%, #FFF0F5 0%, #E0FFFF 60%, #FFF0F5 100%)",
            boxShadow:
              state === "listening"
                ? "0 0 64px 16px rgba(249,168,201,0.28), 0 0 120px 32px rgba(126,216,216,0.18), inset 0 1px 0 rgba(255,255,255,0.8)"
                : "0 8px 48px 0 rgba(249,168,201,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
          animate={
            state === "listening" ? { scale: [1, 1.04, 1] }
            : state === "processing" ? { scale: [1, 0.97, 1] }
            : { scale: 1 }
          }
          transition={
            state === "listening" ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            : state === "processing" ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
          }
          whileTap={{ scale: 0.93 }}
        >
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div key="mic"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}>
                <Mic size={36} strokeWidth={1.5} style={{ color: "#2D3748" }} />
              </motion.div>
            )}
            {state === "listening" && (
              <motion.div key="listening"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-[4px]">
                {levels.map((lvl, i) => (
                  <motion.span key={i} className="block w-[3px] rounded-full"
                    style={{ background: "#2D3748" }}
                    animate={{ height: `${Math.max(8, lvl * 36)}px` }}
                    transition={{ duration: 0.08, ease: "linear" }} />
                ))}
              </motion.div>
            )}
            {state === "processing" && (
              <motion.div key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}>
                <div className="w-8 h-8 rounded-full border-[2px]"
                  style={{ borderColor: "rgba(45,55,72,0.2)", borderTopColor: "#2D3748" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        <motion.p key={state}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-light tracking-widest uppercase text-center"
          style={{ color: "#A0AEC0", letterSpacing: "0.15em" }}>
          {state === "idle" && "Appuyez pour parler"}
          {state === "listening" && "Parlez… appuyez pour envoyer"}
          {state === "processing" && "Transcription en cours…"}
        </motion.p>
      </AnimatePresence>

      {/* Debug info (taille du blob, format) */}
      <AnimatePresence>
        {debugInfo && (
          <motion.p key="debug"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-[10px] text-center font-mono"
            style={{ color: "#C4CACE" }}>
            {debugInfo}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Stop button */}
      <AnimatePresence>
        {state === "listening" && (
          <motion.button key="stop"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            onClick={stopListening}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer"
            style={{ background: "rgba(255,240,245,0.75)", border: "1px solid rgba(255,214,231,0.5)", backdropFilter: "blur(12px)" }}>
            <MicOff size={13} strokeWidth={2} style={{ color: "#F9A8C9" }} />
            <span className="text-xs font-medium" style={{ color: "#718096" }}>Terminer</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p key="err"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-xs text-center px-6 leading-relaxed"
            style={{ color: "#F9A8C9", maxWidth: 280 }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
