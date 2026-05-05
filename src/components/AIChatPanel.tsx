"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";

export type Message = { id: number; from: "ai" | "me"; text: string; time: string };

export const initialChatMessages: Message[] = [
  { id: 1, from: "ai", text: "Bonjour ✦ Comment vous sentez-vous aujourd'hui ?", time: "08:02" },
  { id: 2, from: "me", text: "Un peu fatiguée, mal dormi", time: "08:03" },
  {
    id: 3,
    from: "ai",
    text: "Je note. Je vous propose une séance douce de mobilité 20 min, et un petit-déjeuner riche en magnésium.",
    time: "08:03",
  },
];

const suggestions = ["Plan du jour", "Ma récup'", "Repas idéal"];

export default function AIChatPanel({
  messages,
  aiTyping,
  onSend,
}: {
  messages: Message[];
  aiTyping: boolean;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, aiTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    onSend(text.trim());
    setInput("");
  };

  return (
    <div className="lg-surface lg-highlight relative rounded-3xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-white/40">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(167,139,250,0.2)",
          }}
        >
          <Sparkles size={15} strokeWidth={1.5} style={{ color: "#2D3748" }} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight" style={{ color: "#2D3748" }}>Aura</p>
          <p className="text-[10px] font-medium" style={{ color: "#D4A843" }}>● En ligne</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
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
                className="px-3.5 py-2 rounded-2xl text-[13px] font-light max-w-[85%] leading-snug"
                style={
                  msg.from === "me"
                    ? {
                        background: "linear-gradient(135deg, rgba(212,192,255,0.95) 0%, rgba(245,230,163,0.95) 100%)",
                        color: "#2D3748",
                        borderBottomRightRadius: 6,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(167,139,250,0.12)",
                      }
                    : {
                        background: "rgba(255,255,255,0.6)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.7)",
                        color: "#2D3748",
                        borderBottomLeftRadius: 6,
                      }
                }
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          {aiTyping && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-1"
                style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.7)", borderBottomLeftRadius: 6 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: "#A0AEC0" }}
                    animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggestions + Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/40">
        <div className="flex gap-1.5 mb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-all hover:scale-105 flex-shrink-0"
              style={{ background: "rgba(240,235,255,0.7)", color: "#A78BFA", border: "1px solid rgba(255,255,255,0.6)" }}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demandez à Aura…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#A0AEC0]"
            style={{ color: "#2D3748" }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }}
            aria-label="Envoyer"
          >
            <Send size={12} strokeWidth={2} style={{ color: "#2D3748" }} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
