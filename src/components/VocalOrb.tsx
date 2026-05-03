"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

type OrbState = "idle" | "listening" | "processing";

function getAudioExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export default function VocalOrb({ onTranscript }: { onTranscript?: (text: string) => void }) {
  const [state, setState] = useState<OrbState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all mic tracks immediately
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        setState("processing");

        const mimeType = recorder.mimeType || "audio/webm";
        const ext = getAudioExtension(mimeType);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size < 1000) {
          // Too short / empty recording
          setState("idle");
          return;
        }

        try {
          const formData = new FormData();
          formData.append("audio", blob, `recording.${ext}`);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          const text: string = data.text?.trim() ?? "";

          if (text) {
            onTranscript?.(text);
          }
        } catch (err) {
          console.error("Transcription error:", err);
          setError("Transcription échouée, réessayez.");
          setTimeout(() => setError(null), 3000);
        } finally {
          setState("idle");
        }
      };

      recorder.start();
      setState("listening");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("denied") || msg.includes("Permission")) {
        setError("Accès au micro refusé.");
      } else {
        setError("Impossible d'accéder au micro.");
      }
      setTimeout(() => setError(null), 3500);
      setState("idle");
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleClick = () => {
    if (state === "listening") stopListening();
    else if (state === "idle") startListening();
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Orb */}
      <div className="relative flex items-center justify-center">

        {/* Listening glow rings */}
        {state === "listening" && (
          <>
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 240, height: 240,
                background: "radial-gradient(circle, rgba(255,214,231,0.18) 0%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 200, height: 200,
                background: "radial-gradient(circle, rgba(178,240,240,0.2) 0%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            />
          </>
        )}

        {/* Idle ambient pulse */}
        {state === "idle" && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 180, height: 180,
              background: "radial-gradient(circle, rgba(255,214,231,0.1) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Main Orb Button */}
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
            state === "listening"
              ? { scale: [1, 1.04, 1] }
              : state === "processing"
              ? { scale: [1, 0.97, 1] }
              : { scale: 1 }
          }
          transition={
            state === "listening"
              ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              : state === "processing"
              ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
          whileTap={{ scale: 0.93 }}
          aria-label={state === "listening" ? "Arrêter l'enregistrement" : "Parler à Aura"}
        >
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="mic"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Mic size={36} strokeWidth={1.5} style={{ color: "#2D3748" }} />
              </motion.div>
            )}
            {state === "listening" && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-end gap-[3px]"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="block w-[3px] rounded-full"
                    style={{ background: "#2D3748" }}
                    animate={{ height: ["8px", "24px", "8px"] }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
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
                  style={{ borderColor: "rgba(45,55,72,0.2)", borderTopColor: "#2D3748" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Status label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-light tracking-widest uppercase"
          style={{ color: "#A0AEC0", letterSpacing: "0.15em" }}
        >
          {state === "idle" && "Appuyez pour parler"}
          {state === "listening" && "À votre écoute… (retappez pour envoyer)"}
          {state === "processing" && "Transcription en cours…"}
        </motion.p>
      </AnimatePresence>

      {/* Stop hint while listening */}
      <AnimatePresence>
        {state === "listening" && (
          <motion.button
            key="stop-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            onClick={stopListening}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer"
            style={{
              background: "rgba(255,240,245,0.75)",
              border: "1px solid rgba(255,214,231,0.5)",
              backdropFilter: "blur(12px)",
            }}
          >
            <MicOff size={13} strokeWidth={2} style={{ color: "#F9A8C9" }} />
            <span className="text-xs font-medium" style={{ color: "#718096" }}>
              Terminer
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-xs text-center px-4"
            style={{ color: "#F9A8C9" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
