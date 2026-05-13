"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Sparkles, ArrowLeft, UserCog } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

/* ─── Profile completeness check ───────────────────────── */
function isProfileIncomplete(ctx: UserContext | null): boolean {
  if (!ctx) return false;
  return !ctx.age || !ctx.weight || !ctx.level || ctx.skipped === true;
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

  /* ── Conversation persistence helpers ── */
  const historyKey = user?.id ? `aura_coach_history_${user.id}` : null;

  const loadHistory = (): Msg[] => {
    if (!historyKey || typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(historyKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const saveHistory = (msgs: Msg[]) => {
    if (!historyKey || typeof window === "undefined") return;
    try {
      // Keep last 60 messages to avoid storage overflow
      const toStore = msgs.slice(-60).map(m => ({ ...m, streaming: false }));
      localStorage.setItem(historyKey, JSON.stringify(toStore));
    } catch {}
  };

  /* ── State ── */
  const [messages, setMessages] = useState<Msg[]>(() => loadHistory());
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

  /* ── Auto-scroll + persist history ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    if (messages.length > 0 && !isStreaming) saveHistory(messages);
  }, [messages, isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-focus input ── */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ── Load user context + today nutrition ── */
  useEffect(() => {
    if (!user?.id) return;

    const loadContext = async () => {
      /* 1 — Try Supabase first */
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "onboarding_age, onboarding_height, onboarding_weight, onboarding_gender, onboarding_goals, onboarding_level, onboarding_sessions_week, onboarding_meals_day, onboarding_diet"
        )
        .eq("id", user.id)
        .maybeSingle();

      const hasSupabaseData = profile && (profile.onboarding_age || profile.onboarding_weight || profile.onboarding_level);

      if (hasSupabaseData) {
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
        /* 2 — Fallback: check localStorage (data saved from /profil "Mes objectifs") */
        const lsKey = `aura_onboarding_${user.pseudo}`;
        let lsData: Record<string, unknown> | null = null;
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem(lsKey) : null;
          if (raw) lsData = JSON.parse(raw);
        } catch {}

        if (lsData && (lsData.age || lsData.weight || lsData.level)) {
          /* Use it immediately */
          setUserContext({
            pseudo: user.pseudo,
            age: lsData.age as string,
            height: lsData.height as string,
            weight: lsData.weight as string,
            gender: (lsData.gender as string) || "non précisé",
            goals: (lsData.goals as string[]) ?? [],
            level: lsData.level as string,
            sessionsPerWeek: lsData.sessionsPerWeek as string,
            mealsPerDay: lsData.mealsPerDay as string,
            diet: lsData.diet as string,
          });

          /* Sync localStorage → Supabase so it's available next time */
          supabase.from("profiles").update({
            onboarding_age: lsData.age ? parseInt(lsData.age as string) : null,
            onboarding_height: lsData.height ? parseInt(lsData.height as string) : null,
            onboarding_weight: lsData.weight ? parseFloat(lsData.weight as string) : null,
            onboarding_gender: lsData.gender,
            onboarding_goals: lsData.goals,
            onboarding_level: lsData.level,
            onboarding_sessions_week: lsData.sessionsPerWeek ? parseInt(lsData.sessionsPerWeek as string) : null,
            onboarding_meals_day: lsData.mealsPerDay ? parseInt(lsData.mealsPerDay as string) : null,
            onboarding_diet: lsData.diet,
            onboarding_completed: true,
          }).eq("id", user.id).then(() => {});
        } else {
          setUserContext({ pseudo: user.pseudo, skipped: true });
        }
      }

      /* Today's nutrition */
      const { data: nutritionRows } = await supabase
        .from("nutrition_logs")
        .select("calories, proteins")
        .eq("user_id", user.id)
        .eq("date", todayISODate());

      let totalCalories = 0, totalProteins = 0;
      if (nutritionRows && nutritionRows.length > 0) {
        totalCalories = nutritionRows.reduce((sum: number, r: { calories: number }) => sum + (r.calories ?? 0), 0);
        totalProteins = nutritionRows.reduce((sum: number, r: { proteins: number }) => sum + (r.proteins ?? 0), 0);
      }

      /* Recent workout sessions (last 5) */
      const { data: sessionRows } = await supabase
        .from("workout_sessions")
        .select("title, started_at, duration_minutes, calories_burned")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(5);

      const recentSessions = (sessionRows ?? []).map((s: { title: string; started_at: string; duration_minutes?: number }) => {
        const d = new Date(s.started_at);
        const dayNames = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
        return `${dayNames[d.getDay()]} : ${s.title}${s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}`;
      });

      /* Last recorded weight */
      const { data: weightRow } = await supabase
        .from("weight_logs")
        .select("weight_kg, date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      /* Streak */
      const { data: streakData } = await supabase
        .from("workout_sessions")
        .select("started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(60);
      let streak = 0;
      if (streakData && streakData.length > 0) {
        const days = new Set((streakData as { started_at: string }[]).map(s => s.started_at.slice(0, 10)));
        const today = new Date();
        for (let i = 0; i < 60; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          if (days.has(d.toISOString().slice(0, 10))) streak++;
          else if (i > 0) break;
        }
      }

      setLiveStats({
        calories: Math.round(totalCalories),
        proteins: Math.round(totalProteins),
        streak: streak > 0 ? streak : undefined,
        lastWeight: weightRow?.weight_kg ?? undefined,
        recentSessions: recentSessions.length > 0 ? recentSessions : undefined,
      });
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
      className="fixed inset-0 md:left-[88px] flex flex-col"
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

              {/* Profile incomplete banner */}
              {isProfileIncomplete(userContext) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="w-full max-w-xs mx-auto"
                >
                  <Link href="/parametres" className="block">
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, rgba(212,192,255,0.25) 0%, rgba(245,230,163,0.2) 100%)",
                        border: "1px solid rgba(167,139,250,0.25)",
                        boxShadow: "0 2px 12px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
                      }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }}>
                        <UserCog size={15} strokeWidth={1.8} style={{ color: "#2D3748" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "#2D3748" }}>Complète ton profil</p>
                        <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>Pour des plans vraiment personnalisés →</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}
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

        {/* Profile CTA after last AI message if profile incomplete */}
        {isProfileIncomplete(userContext) && messages.length > 0 && !isStreaming && messages[messages.length - 1]?.role === "assistant" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex justify-start pl-9"
          >
            <Link href="/parametres">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, rgba(212,192,255,0.3) 0%, rgba(245,230,163,0.25) 100%)",
                  border: "1px solid rgba(167,139,250,0.3)",
                  boxShadow: "0 2px 10px rgba(167,139,250,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <UserCog size={13} strokeWidth={2} style={{ color: "#A78BFA" }} />
                <span className="text-[12px] font-semibold" style={{ color: "#7C3AED" }}>
                  Remplir mon profil →
                </span>
              </motion.div>
            </Link>
          </motion.div>
        )}

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
