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
import { Send, Sparkles, X, Mic, Square, Dumbbell, Check, CalendarDays } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { CATEGORY_LABEL } from "@/lib/assistantActions";

const SUGGESTIONS = [
  "Comment créer une séance ?",
  "Où voir ma progression ?",
  "Suivre ma nutrition",
  "Passer en mode sombre",
];

export default function AssistantSheet() {
  const { isOpen, close, messages, isStreaming, sendMessage, pseudo, memoryNotice, pendingSeance, pendingPlan, actionLoading, confirmSeance, cancelSeance, confirmPlan, cancelPlan } = useAssistant();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const voice = useVoiceCapture({ onTranscript: (t) => sendMessage(t) });

  useEffect(() => { setMounted(true); }, []);

  // Auto-scroll en bas à chaque nouveau contenu
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // La carte de séance s'anime et grandit après le 1er rendu : on re-scroll
    // une fois sa hauteur stabilisée pour que ses boutons (Créer/Annuler)
    // soient toujours visibles et cliquables.
    if (pendingSeance || pendingPlan) {
      const t = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 360);
      return () => clearTimeout(t);
    }
  }, [messages, isOpen, pendingSeance, pendingPlan, actionLoading]);

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

            {/* Zone d'action ÉPINGLÉE au-dessus de la saisie : la carte reste
                TOUJOURS entièrement visible (boutons compris), quelle que soit
                la longueur de la conversation — elle n'est plus écrasée par le
                fil de messages qui, lui, se réduit (flex-1) pour lui faire place. */}
            <div className="flex-shrink-0 px-3 pb-1 flex flex-col gap-2">

              {/* Génération en cours */}
              {actionLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="self-start max-w-[85%] flex items-center gap-2.5 px-4 py-3 rounded-3xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
                  <motion.span className="w-4 h-4 rounded-full border-2" style={{ borderColor: "var(--violet-mid)", borderTopColor: "var(--accent)" }}
                    animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                  <span className="text-[13px] font-light" style={{ color: "var(--text-1)" }}>Je te prépare une séance…</span>
                </motion.div>
              )}

              {/* Carte de confirmation — création de séance (aucune écriture sans clic) */}
              {pendingSeance && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full rounded-3xl overflow-hidden"
                  style={{ background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.18)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
                      <Dumbbell size={16} strokeWidth={1.8} style={{ color: "#fff" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Nouvelle séance</p>
                      <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingSeance.title}</p>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                    {[CATEGORY_LABEL[pendingSeance.category], `${pendingSeance.duration} min`, pendingSeance.difficulty, `${pendingSeance.exercisesCount} exercices`].map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                        style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>{t}</span>
                    ))}
                  </div>

                  <div className="px-4 pb-2 flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 150, scrollbarWidth: "none" }}>
                    {pendingSeance.exerciseList.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-xl"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.45)" }}>
                        <span className="text-[13px] font-light truncate" style={{ color: "var(--text-1)" }}>{ex.name}</span>
                        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>{ex.sets} × {ex.reps}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={cancelSeance}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                      style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Annuler
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmSeance}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff" }}>
                      <Check size={15} strokeWidth={2.4} /> Créer la séance
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Carte de confirmation — modification du planning (aucune écriture sans clic) */}
              {pendingPlan && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full rounded-3xl overflow-hidden"
                  style={{ background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.18)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
                      <CalendarDays size={16} strokeWidth={1.8} style={{ color: "#fff" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Modifier le planning</p>
                      <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingPlan.title}</p>
                    </div>
                  </div>

                  <div className="px-4 pt-2.5 pb-1">
                    <p className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{pendingPlan.summary}</p>
                  </div>

                  {pendingPlan.preview && pendingPlan.preview.exerciseList.length > 0 && (
                    <div className="px-4 pb-2 pt-1 flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 150, scrollbarWidth: "none" }}>
                      {pendingPlan.preview.exerciseList.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-xl"
                          style={{ background: "rgba(var(--tint-violet-rgb),0.45)" }}>
                          <span className="text-[13px] font-light truncate" style={{ color: "var(--text-1)" }}>{ex.name}</span>
                          <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>{ex.sets} × {ex.reps}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={cancelPlan}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                      style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Annuler
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmPlan}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff" }}>
                      <Check size={15} strokeWidth={2.4} /> Confirmer
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 pt-2"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}>
              {/* Puce mémoire — « Je m'en souviendrai » */}
              <AnimatePresence>
                {memoryNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="flex items-center gap-1.5 w-fit mx-auto mb-2 px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.22)" }}>
                    {memoryNotice}
                  </motion.div>
                )}
              </AnimatePresence>
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
