"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Sparkles, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────── */
type Msg = {
  role: "user" | "assistant";
  content: string;
  id: string;
  streaming?: boolean;
};

interface UserContext {
  pseudo?: string;
  age?: string;
  height?: string;
  weight?: string;
  gender?: string;
  goals?: string[];
  level?: string;
  sessionsPerWeek?: string;
  mealsPerDay?: string;
  diet?: string;
  skipped?: boolean;
}

interface LiveStats {
  calories?: number;
  proteins?: number;
}

/* ─── Speech Recognition type shim ──────────────────────── */
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionResultItem;
  length: number;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionEventShim extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventShim) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/* ─── Suggestion chips ───────────────────────────────────── */
const SUGGESTIONS = [
  "Mon plan cette semaine",
  "Analyse mes repas d'aujourd'hui",
  "Comment progresser plus vite ?",
  "Bilan nutrition du jour",
];

/* ─── Unique ID helper ───────────────────────────────────── */
let _counter = 0;
function uid(): string {
  return `${Date.now()}-${++_counter}`;
}

/* ─── Today's date string ───────────────────────────────── */
function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ═══════════════════════════════════════════════════════════
   Page component
═══════════════════════════════════════════════════════════ */
export default function CoachPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  /* ── State ── */
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);

  /* ── Refs ── */
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Auto-scroll ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ── Auto-focus input ── */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ── Load user context + today nutrition ── */
  useEffect(() => {
    if (!user?.id) return;

    const loadContext = async () => {
      /* Profile */
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "onboarding_age, onboarding_height, onboarding_weight, onboarding_gender, onboarding_goals, onboarding_level, onboarding_sessions_week, onboarding_meals_day, onboarding_diet"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setUserContext({
          pseudo: user.pseudo,
          age: profile.onboarding_age?.toString(),
          height: profile.onboarding_height?.toString(),
          weight: profile.onboarding_weight?.toString(),
          gender: profile.onboarding_gender,
          goals: profile.onboarding_goals ?? [],
          level: profile.onboarding_level,
          sessionsPerWeek: profile.onboarding_sessions_week?.toString(),
          mealsPerDay: profile.onboarding_meals_day?.toString(),
          diet: profile.onboarding_diet,
        });
      } else {
        setUserContext({ pseudo: user.pseudo, skipped: true });
      }

      /* Today's nutrition */
      const { data: nutritionRows } = await supabase
        .from("nutrition_logs")
        .select("calories, proteins")
        .eq("user_id", user.id)
        .eq("date", todayISODate());

      if (nutritionRows && nutritionRows.length > 0) {
        const totalCalories = nutritionRows.reduce(
          (sum: number, r: { calories: number }) => sum + (r.calories ?? 0),
          0
        );
        const totalProteins = nutritionRows.reduce(
          (sum: number, r: { proteins: number }) => sum + (r.proteins ?? 0),
          0
        );
        setLiveStats({ calories: Math.round(totalCalories), proteins: Math.round(totalProteins) });
      }
    };

    loadContext();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Send message ─────────────────────────────────────── */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Msg = { role: "user", content: text.trim(), id: uid() };
      const assistantId = uid();
      const assistantMsg: Msg = {
        role: "assistant",
        content: "",
        id: assistantId,
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      /* Build history for API (excluding the placeholder assistant msg) */
      const history = [...messages, userMsg].map(({ role, content }) => ({
        role,
        content,
      }));

      try {
        const abort = new AbortController();
        abortRef.current = abort;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            userContext,
            pseudo: user?.pseudo,
            liveStats,
          }),
          signal: abort.signal,
        });

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated, streaming: true }
                : m
            )
          );
        }

        /* Mark streaming done */
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: accumulated, streaming: false }
              : m
          )
        );
      } catch (err: unknown) {
        if ((err as { name?: string }).name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Désolé, une erreur est survenue. Réessaie ✨",
                  streaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [messages, userContext, liveStats, user?.pseudo, isStreaming]
  );

  /* ─── Handle form submit ──────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  /* ─── Voice input ─────────────────────────────────────── */
  const toggleRecording = useCallback(() => {
    const SR: SpeechRecognitionConstructor | undefined =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;

    if (!SR) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEventShim) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        setIsRecording(false);
        sendMessage(transcript.trim());
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, sendMessage]);

  /* ─── Cleanup on unmount ──────────────────────────────── */
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.stop();
    };
  }, []);

  /* ═══════════════════════════════════════════════════════
     Render
  ═══════════════════════════════════════════════════════ */
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(240,235,255,0.4) 0%, rgba(255,255,255,0) 60%), #FAFAFA",
      }}
    >
      {/* Decorative background blobs */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,192,255,0.35) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 w-72 h-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(245,230,163,0.3) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* ── Header ── */}
      <header
        className="relative flex-shrink-0 flex items-center gap-3 px-4 pt-safe-top pb-3 pt-3"
        style={{
          borderBottom: "1px solid rgba(212,192,255,0.2)",
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer"
          style={{
            background: "rgba(240,235,255,0.8)",
            border: "1px solid rgba(212,192,255,0.3)",
          }}
          aria-label="Retour"
        >
          <ArrowLeft size={16} strokeWidth={2} style={{ color: "#A78BFA" }} />
        </motion.button>

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px rgba(167,139,250,0.25)",
          }}
        >
          <Sparkles size={18} strokeWidth={1.5} style={{ color: "#2D3748" }} />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1
            className="text-base font-semibold leading-tight tracking-tight"
            style={{ color: "#2D3748" }}
          >
            Coach Aura ✦
          </h1>
          <p className="text-[11px] font-medium" style={{ color: "#A78BFA" }}>
            IA · Nutrition · Fitness
          </p>
        </div>

        {/* Online indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <motion.span
            className="block w-2 h-2 rounded-full"
            style={{ background: "#68D391" }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span
            className="text-[11px] font-medium"
            style={{ color: "#68D391" }}
          >
            En ligne
          </span>
        </div>
      </header>

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 min-h-0"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Welcome / suggestion state */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center gap-6 flex-1 pb-4 pt-8"
            >
              {/* Hero avatar */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-[28px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                  boxShadow:
                    "0 8px 32px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <Sparkles size={32} strokeWidth={1.3} style={{ color: "#2D3748" }} />
              </motion.div>

              <div className="text-center px-6">
                <p
                  className="text-lg font-semibold mb-1"
                  style={{ color: "#2D3748" }}
                >
                  Bonjour{user?.pseudo ? `, ${user.pseudo}` : ""} ✦
                </p>
                <p
                  className="text-sm font-light leading-relaxed"
                  style={{ color: "#718096" }}
                >
                  Pose ta question ou choisis un sujet pour commencer.
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2.5 justify-center px-4">
                {SUGGESTIONS.map((suggestion, i) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => sendMessage(suggestion)}
                    className="px-4 py-2.5 rounded-2xl text-sm font-medium cursor-pointer transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(212,192,255,0.5)",
                      color: "#5B4B8A",
                      boxShadow:
                        "0 2px 8px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
                    }}
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message bubbles */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } items-end gap-2`}
            >
              {/* AI avatar dot */}
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                    boxShadow: "0 2px 8px rgba(167,139,250,0.2)",
                  }}
                >
                  <Sparkles size={12} strokeWidth={1.8} style={{ color: "#2D3748" }} />
                </div>
              )}

              {/* Bubble */}
              <div
                className="px-4 py-3 rounded-3xl text-[14px] font-light leading-relaxed"
                style={{
                  maxWidth: "78%",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  ...(msg.role === "user"
                    ? {
                        background:
                          "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)",
                        color: "#ffffff",
                        borderBottomRightRadius: 8,
                        boxShadow:
                          "0 4px 16px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
                      }
                    : {
                        background: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.85)",
                        color: "#2D3748",
                        borderBottomLeftRadius: 8,
                        boxShadow:
                          "0 4px 16px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
                      }),
                }}
              >
                {msg.content}
                {/* Streaming cursor */}
                {msg.streaming && msg.role === "assistant" && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ color: "#A78BFA", marginLeft: 1 }}
                  >
                    |
                  </motion.span>
                )}
                {/* Thinking state — empty assistant message still streaming */}
                {msg.streaming && msg.role === "assistant" && msg.content === "" && (
                  <span className="flex items-center gap-1 py-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full"
                        style={{ background: "#A0AEC0" }}
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bottom spacer so last msg isn't hidden behind input bar */}
        <div className="h-2 flex-shrink-0" />
      </div>

      {/* ── Input bar ── */}
      <div
        className="relative flex-shrink-0 px-4 pb-safe-bottom pb-4 pt-3"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(212,192,255,0.2)",
        }}
      >
        {/* Voice recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              key="recording-bar"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center justify-center gap-2 mb-2 py-1"
            >
              <motion.span
                className="block w-2 h-2 rounded-full"
                style={{ background: "#FC8181" }}
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
              <span
                className="text-[12px] font-medium"
                style={{ color: "#FC8181" }}
              >
                Écoute en cours…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
        >
          {/* Text input */}
          <div
            className="flex-1 flex items-center px-4 py-3 rounded-3xl"
            style={{
              background: "rgba(245,243,255,0.9)",
              border: "1px solid rgba(212,192,255,0.35)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(167,139,250,0.06)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose ta question…"
              disabled={isStreaming}
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#B8B0CC] disabled:opacity-50"
              style={{ color: "#2D3748" }}
            />
          </div>

          {/* Mic button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleRecording}
            className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer transition-colors"
            style={
              isRecording
                ? {
                    background: "linear-gradient(135deg, #FC8181 0%, #F56565 100%)",
                    boxShadow: "0 4px 14px rgba(252,129,129,0.4)",
                    border: "none",
                  }
                : {
                    background: "rgba(240,235,255,0.9)",
                    border: "1px solid rgba(212,192,255,0.4)",
                  }
            }
            aria-label={isRecording ? "Arrêter l'enregistrement" : "Enregistrement vocal"}
          >
            {isRecording ? (
              <MicOff size={17} strokeWidth={2} style={{ color: "#ffffff" }} />
            ) : (
              <Mic size={17} strokeWidth={2} style={{ color: "#A78BFA" }} />
            )}
          </motion.button>

          {/* Send button */}
          <motion.button
            type="submit"
            whileHover={input.trim() && !isStreaming ? { scale: 1.06 } : {}}
            whileTap={input.trim() && !isStreaming ? { scale: 0.92 } : {}}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer transition-opacity"
            style={{
              background:
                input.trim() && !isStreaming
                  ? "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)"
                  : "rgba(220,215,235,0.7)",
              boxShadow:
                input.trim() && !isStreaming
                  ? "0 4px 14px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.3)"
                  : "none",
              border: "none",
              opacity: input.trim() && !isStreaming ? 1 : 0.55,
            }}
            aria-label="Envoyer"
          >
            <Send size={15} strokeWidth={2.2} style={{ color: "#ffffff" }} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
