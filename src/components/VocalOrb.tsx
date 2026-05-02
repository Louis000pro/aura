"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

type OrbState = "idle" | "listening" | "processing";

export default function VocalOrb() {
  const [state, setState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
      return;
    }
    const SpeechRecognitionAPI =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setState("listening");
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(text);
    };
    recognition.onend = () => {
      setState("processing");
      setTimeout(() => {
        setState("idle");
      }, 2000);
    };
    recognition.onerror = () => setState("idle");

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  const handleClick = () => {
    if (state === "listening") stopListening();
    else if (state === "idle") startListening();
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Orb */}
      <div className="relative flex items-center justify-center">
        {/* Outer ambient glow rings */}
        {state === "listening" && (
          <>
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 240,
                height: 240,
                background: "radial-gradient(circle, rgba(255,214,231,0.18) 0%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 200,
                height: 200,
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
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              background: "radial-gradient(circle, rgba(255,214,231,0.1) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Main Orb Button */}
        <motion.button
          onClick={handleClick}
          className="relative rounded-full flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-aura-rose-deep"
          style={{
            width: 140,
            height: 140,
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
          aria-label={state === "listening" ? "Arrêter l'écoute" : "Parler à Aura"}
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
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
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
                transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}
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
          {state === "listening" && "À votre écoute…"}
          {state === "processing" && "Aura réfléchit…"}
        </motion.p>
      </AnimatePresence>

      {/* Transcript bubble */}
      <AnimatePresence>
        {transcript && state !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="max-w-xs rounded-2xl px-5 py-3 text-sm text-center"
            style={{
              background: "rgba(255,240,245,0.7)",
              backdropFilter: "blur(12px)",
              color: "#2D3748",
              boxShadow: "0 4px 20px 0 rgba(249,168,201,0.12)",
              border: "1px solid rgba(255,240,245,0.9)",
            }}
          >
            "{transcript}"
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
