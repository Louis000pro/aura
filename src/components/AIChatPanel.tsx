"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Maximize2, Minimize2, X } from "lucide-react";

export type Message = { id: number; from: "ai" | "me"; text: string; time: string };

export const initialChatMessages: Message[] = [
  { id: 1, from: "ai", text: "Bonjour ✦ Comment tu vas aujourd'hui ? Je suis là pour toi — dis-moi ce que tu veux qu'on fasse ensemble 💪", time: "" },
];

const suggestions = ["Plan du jour", "Ma récup", "Repas idéal", "Séance du jour", "Objectif calorique"];

/* ─── Shared chat UI ─── */
function ChatUI({
  messages,
  aiTyping,
  onSend,
  isFullscreen,
  onToggleFullscreen,
}: {
  messages: Message[];
  aiTyping: boolean;
  onSend: (text: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen?: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll en bas seulement si l'utilisateur est déjà proche du bas
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, aiTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    onSend(text.trim());
    setInput("");
  };

  return (
    <div className="relative flex flex-col overflow-hidden h-full"
      style={isFullscreen ? {} : { borderRadius: "1.5rem" }}>

      {/* Solid background (only for inline) */}
      {!isFullscreen && (
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: "rgba(var(--surface-rgb),1)", border: "1.5px solid rgba(var(--violet-mid-rgb),0.55)", boxShadow: "0 12px 48px rgba(var(--accent-rgb),0.2), 0 2px 8px rgba(var(--accent-rgb),0.12), inset 0 1px 0 rgba(var(--surface-rgb),1)" }} />
      )}

      {/* Header */}
      <div className="relative px-5 pt-5 pb-3 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(var(--surface-rgb),0.45)" }}>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--cream-mid) 100%)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9), 0 2px 8px rgba(var(--accent-rgb),0.2)" }}>
          <Sparkles size={15} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-1)" }}>Vaiiya</p>
          <p className="text-[10px] font-medium" style={{ color: "var(--gold)" }}>● En ligne</p>
        </div>
        {/* Fullscreen toggle — uniquement si un handler est fourni (évite le doublon avec le X) */}
        {onToggleFullscreen && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleFullscreen}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}
            aria-label={isFullscreen ? "Réduire" : "Agrandir"}
          >
            {isFullscreen
              ? <Minimize2 size={14} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
              : <Maximize2 size={14} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
            }
          </motion.button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="px-3.5 py-2 rounded-2xl text-[13px] font-light leading-relaxed"
                style={{
                  maxWidth: isFullscreen ? "70%" : "85%",
                  ...(msg.from === "me"
                    ? {
                        background: "linear-gradient(135deg, rgba(var(--violet-mid-rgb),0.95) 0%, rgba(var(--cream-mid-rgb),0.95) 100%)",
                        color: "var(--text-1)",
                        borderBottomRightRadius: 6,
                        boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.7), 0 2px 8px rgba(var(--accent-rgb),0.12)",
                      }
                    : {
                        background: "rgba(var(--surface-rgb),0.65)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(var(--surface-rgb),0.75)",
                        color: "var(--text-1)",
                        borderBottomLeftRadius: 6,
                        boxShadow: "0 2px 8px rgba(var(--accent-rgb),0.06)",
                      })
                }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          {aiTyping && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl flex items-center gap-1"
                style={{ background: "rgba(var(--surface-rgb),0.65)", border: "1px solid rgba(var(--surface-rgb),0.75)", borderBottomLeftRadius: 6 }}>
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-3)" }}
                    animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggestions + Input */}
      <div className="relative px-4 pb-4 pt-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(var(--surface-rgb),0.45)" }}>
        <div className="flex gap-1.5 mb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {suggestions.map((s) => (
            <button key={s} onClick={() => handleSend(s)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-all hover:scale-105 flex-shrink-0"
              style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--accent)", border: "1px solid rgba(var(--surface-rgb),0.6)" }}>
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl"
          style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--surface-rgb),0.7)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demandez à Vaiiya…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-3)]"
            style={{ color: "var(--text-1)" }}
          />
          <motion.button whileTap={{ scale: 0.9 }} type="submit"
            className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--cream-mid) 100%)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.7)" }}
            aria-label="Envoyer">
            <Send size={12} strokeWidth={2} style={{ color: "var(--text-1)" }} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main export ─── */
export default function AIChatPanel({
  messages,
  aiTyping,
  onSend,
}: {
  messages: Message[];
  aiTyping: boolean;
  onSend: (text: string) => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      {/* Inline panel */}
      <div className="lg-surface lg-highlight relative rounded-3xl flex flex-col h-full overflow-hidden">
        <ChatUI
          messages={messages}
          aiTyping={aiTyping}
          onSend={onSend}
          isFullscreen={false}
        />
      </div>

      {/* Fullscreen portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9999] flex flex-col"
              style={{ background: "rgba(var(--tint-violet-rgb),0.6)", backdropFilter: "blur(12px)" }}
            >
              {/* Blobs décoratifs */}
              <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(var(--violet-mid-rgb),0.4) 0%, transparent 70%)", filter: "blur(60px)" }} />
              <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(var(--cream-mid-rgb),0.35) 0%, transparent 70%)", filter: "blur(60px)" }} />

              <motion.div
                initial={{ scale: 0.96, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 20 }}
                transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
                className="relative flex-1 flex flex-col mx-auto w-full overflow-hidden"
                style={{
                  maxWidth: 760,
                  margin: "16px auto",
                  background: "rgba(var(--surface-rgb),0.88)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 28,
                  border: "1px solid rgba(var(--surface-rgb),0.9)",
                  boxShadow: "0 24px 80px rgba(var(--accent-rgb),0.2), inset 0 1px 0 rgba(var(--surface-rgb),0.95)",
                }}
              >
                <ChatUI
                  messages={messages}
                  aiTyping={aiTyping}
                  onSend={onSend}
                  isFullscreen={true}
                  onToggleFullscreen={() => setIsFullscreen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
