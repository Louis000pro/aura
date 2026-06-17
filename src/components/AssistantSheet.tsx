"use client";

/* ════════════════════════════════════════════════════════════════════
   AssistantSheet — le chat global, en bottom sheet par-dessus la page.

   S'ouvre depuis l'orbe de navigation (ou open()), reste contextuel
   (la page derrière est visible/grisée). Lit tout son état depuis
   useAssistant() : un seul cerveau, une seule UI. Thématisé (clair/sombre)
   via les design tokens.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, X, Mic, Square } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";

const SUGGESTIONS = [
  "Comment créer une séance ?",
  "Où voir ma progression ?",
  "Suivre ma nutrition",
  "Passer en mode sombre",
];

export default function AssistantSheet() {
  const { isOpen, close, messages, isStreaming, sendMessage, pseudo } = useAssistant();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const voice = useVoiceCapture({ onTranscript: (t) => sendMessage(t) });

  useEffect(() => { setMounted(true); }, []);

  // Auto-scroll en bas à chaque nouveau contenu
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  // Échap pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Voile (page visible derrière) */}
          <motion.div
            key="assistant-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-[70]"
            style={{ background: "rgba(10,7,24,0.42)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          />

          {/* Sheet */}
          <motion.div
            key="assistant-sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed z-[71] left-0 right-0 bottom-0 mx-auto flex flex-col overflow-hidden
                       md:left-auto md:right-6 md:bottom-6 md:w-[420px] md:rounded-3xl"
            style={{
              height: "min(88vh, 760px)",
              maxWidth: 640,
              background: "rgba(var(--surface-rgb),0.97)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              border: "1px solid rgba(var(--accent-rgb),0.18)",
              boxShadow: "0 -12px 48px rgba(0,0,0,0.28)",
            }}
          >
            {/* Poignée + header */}
            <div className="relative flex-shrink-0">
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(var(--accent-rgb),0.35)" }} />
              </div>
              <div className="flex items-center gap-3 px-4 pb-3 pt-1"
                style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.12)" }}>
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}>
                  <Sparkles size={16} strokeWidth={1.6} style={{ color: "#fff" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold leading-tight" style={{ color: "var(--text-0)" }}>Vaiiya ✦</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>Ton assistant — partout, tout le temps</p>
                </div>
                <button onClick={close} aria-label="Fermer"
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                  style={{ background: "rgba(var(--accent-rgb),0.10)" }}>
                  <X size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0"
              style={{ scrollbarWidth: "none" }}>
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center gap-5 flex-1 text-center px-4">
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-[24px] flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))", boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.3)" }}>
                    <Sparkles size={26} strokeWidth={1.3} style={{ color: "#fff" }} />
                  </motion.div>
                  <div>
                    <p className="text-base font-semibold mb-1" style={{ color: "var(--text-0)" }}>
                      Salut{pseudo ? `, ${pseudo}` : ""} ✦
                    </p>
                    <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-soft)" }}>
                      Demande-moi n'importe quoi, ou dis-moi où tu veux aller dans l'app.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={s}
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.08 + i * 0.06 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => sendMessage(s)}
                        className="px-3.5 py-2 rounded-2xl text-[13px] font-medium cursor-pointer"
                        style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-1)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5"
                        style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
                        <Sparkles size={12} strokeWidth={1.8} style={{ color: "#fff" }} />
                      </div>
                    )}
                    <div className="px-4 py-2.5 rounded-3xl text-[14px] font-light leading-relaxed"
                      style={{
                        maxWidth: "80%", wordBreak: "break-word", whiteSpace: "pre-wrap",
                        ...(msg.role === "user"
                          ? { background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff", borderBottomRightRadius: 8 }
                          : { background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-1)", borderBottomLeftRadius: 8, border: "1px solid rgba(var(--accent-rgb),0.10)" }),
                      }}>
                      {msg.content}
                      {msg.streaming && msg.role === "assistant" && msg.content === "" && (
                        <span className="flex items-center gap-1 py-0.5">
                          {[0, 1, 2].map((i) => (
                            <motion.span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-3)" }}
                              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                          ))}
                        </span>
                      )}
                      {msg.streaming && msg.role === "assistant" && msg.content !== "" && (
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                          style={{ color: "var(--accent)", marginLeft: 1 }}>|</motion.span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 pt-2"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}>
              {voice.error && (
                <p className="text-[11px] text-center mb-1.5" style={{ color: "var(--accent)" }}>{voice.error}</p>
              )}
              <form onSubmit={submit} className="flex items-center gap-2">
                <div className="flex-1 flex items-center px-4 py-2.5 rounded-3xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
                  <input
                    type="text" value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder={voice.state === "recording" ? "Écoute en cours…" : "Pose ta question…"}
                    disabled={isStreaming || voice.state !== "idle"}
                    className="flex-1 bg-transparent text-[14px] outline-none disabled:opacity-60"
                    style={{ color: "var(--text-0)" }}
                  />
                </div>

                {/* Micro */}
                <motion.button type="button" whileTap={{ scale: 0.92 }}
                  onClick={() => (voice.state === "recording" ? voice.stop() : voice.start())}
                  disabled={isStreaming || voice.state === "processing"}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer"
                  style={voice.state === "recording"
                    ? { background: "linear-gradient(135deg, #FC8181, #F56565)" }
                    : { background: "rgba(var(--accent-rgb),0.12)" }}
                  aria-label={voice.state === "recording" ? "Arrêter" : "Parler"}>
                  {voice.state === "recording"
                    ? <Square size={15} strokeWidth={2.4} style={{ color: "#fff" }} />
                    : <Mic size={17} strokeWidth={2} style={{ color: "var(--accent)" }} />}
                </motion.button>

                {/* Envoyer */}
                <motion.button type="submit" whileTap={input.trim() && !isStreaming ? { scale: 0.92 } : {}}
                  disabled={!input.trim() || isStreaming}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer"
                  style={{
                    background: input.trim() && !isStreaming ? "linear-gradient(135deg, var(--accent), var(--violet-mid))" : "rgba(var(--accent-rgb),0.12)",
                    opacity: input.trim() && !isStreaming ? 1 : 0.55,
                  }}
                  aria-label="Envoyer">
                  <Send size={15} strokeWidth={2.2} style={{ color: "#fff" }} />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
