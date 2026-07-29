"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
import { Sparkles, X, Check, ArrowRight, Play, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatsDrawer from "@/components/StatsDrawer";
import DailyDrawer from "@/components/DailyDrawer";
import AIChatPanel, { initialChatMessages, type Message } from "@/components/AIChatPanel";
import StatDetailModal from "@/components/StatDetailModal";
import LandingStory from "@/components/Landing/LandingStory";
import LandingHero from "@/components/Landing/LandingHero";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import type { StatData } from "@/data/statsData";
import { createClient } from "@/lib/supabase";
import { stripMemoryTags } from "@/lib/aiMemory";
import AccueilSignature from "@/components/AccueilSignature";
import RangsModal from "@/components/rang/RangsModal";
import { calculerAura, etatDepuisExp, histoireSerie, EXP_CONNEXION, type EtatAura } from "@/lib/aura";
import { noterRang } from "@/lib/celebrationRang";
import { persistLieu, hasSeance, dayTitle, dayLabel, type PlanningDay } from "@/lib/planning";
import { SERIES, type Defi, type SerieSlug } from "@/lib/defi";
import { observeParisDay, parisDateStr, shiftDateStr } from "@/lib/dates";
import { marquerPresence } from "@/lib/presence";

/* ─── Compute & save Aura score dynamically ─── */
async function computeAndSaveScore(userId: string, supabase: ReturnType<typeof createClient>) {
  const today = parisDateStr();

  const [{ data: sessions }, { data: nutrition }, { data: weight }] = await Promise.all([
    supabase.from("workout_sessions")
      .select("id, duration_minutes, calories_burned")
      .eq("user_id", userId)
      .gte("started_at", today + "T00:00:00")
      .lt("started_at", today + "T23:59:59"),
    supabase.from("nutrition_logs")
      .select("calories")
      .eq("user_id", userId)
      .eq("date", today),
    supabase.from("weight_logs")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1),
  ]);

  let score = 30; // base score pour les utilisateurs actifs
  const todaySessions = sessions ?? [];
  const todayNutrition = nutrition ?? [];

  // Points pour les séances (max 35 pts)
  if (todaySessions.length > 0) {
    const totalDuration = todaySessions.reduce((sum: number, s: { duration_minutes: number }) => sum + (s.duration_minutes || 0), 0);
    score += Math.min(35, Math.floor(totalDuration / 2));
  }

  // Points pour la nutrition loggée (max 25 pts)
  if (todayNutrition.length > 0) {
    const totalCals = todayNutrition.reduce((sum: number, n: { calories: number }) => sum + (n.calories || 0), 0);
    if (totalCals > 0) score += Math.min(25, Math.floor(todayNutrition.length * 8));
  }

  // Points pour le suivi du poids (10 pts)
  if ((weight ?? []).length > 0) score += 10;

  score = Math.min(100, score);

  const calories = todayNutrition.reduce((sum: number, n: { calories: number }) => sum + (n.calories || 0), 0);
  const burned = todaySessions.reduce((sum: number, s: { calories_burned?: number }) => sum + (s.calories_burned || 0), 0);

  // ── Série de connexion : +1 par jour consécutif où l'on ouvre le site, reset si un jour est sauté ──
  const yesterday = shiftDateStr(today, -1);
  const { data: streakRows } = await supabase.from("daily_stats")
    .select("date, streak").eq("user_id", userId).in("date", [yesterday, today]);
  const todayRow = streakRows?.find((r: { date: string; streak: number }) => r.date === today);
  const yRow = streakRows?.find((r: { date: string; streak: number }) => r.date === yesterday);
  let streak: number;
  if (todayRow && (todayRow.streak ?? 0) > 0) {
    streak = todayRow.streak; // déjà compté aujourd'hui → on ne ré-incrémente pas
  } else {
    streak = (yRow && (yRow.streak ?? 0) > 0) ? yRow.streak + 1 : 1; // hier présent → +1, sinon repart à 1
  }

  // Upsert dans daily_stats
  await supabase.from("daily_stats").upsert({
    user_id: userId,
    date: today,
    score,
    calories,
    burned,
    streak,
  }, { onConflict: "user_id,date" });

  return { score, calories, burned, steps: 0, sleepHours: 0, streak };
}

/* ─── Home Toast ─── */
function HomeToast({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
      className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
      style={{ background: "rgba(var(--surface-rgb),0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2),inset 0 1px 0 rgba(var(--surface-rgb),0.9)", whiteSpace: "nowrap" }}
    >
      <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
      <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{message}</span>
    </motion.div>
  );
}

/* ─── Repas Modal ─── */
type MealType = "petit-dejeuner" | "dejeuner" | "diner" | "gouter";
const mealTypesList: { id: MealType; label: string; emoji: string }[] = [
  { id: "petit-dejeuner", label: "Petit-déj", emoji: "☀️" },
  { id: "dejeuner",       label: "Déjeuner",  emoji: "🍽️" },
  { id: "diner",          label: "Dîner",     emoji: "🌙" },
  { id: "gouter",         label: "Goûter",    emoji: "🍎" },
];
type RepasModalSaveArgs = { name: string; calories: number; type: MealType };
function RepasModal({ onClose, onSave }: { onClose: () => void; onSave: (meal: RepasModalSaveArgs) => Promise<void> | void }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [type, setType] = useState<MealType>("dejeuner");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), calories: parseInt(calories) || 0, type });
    } finally {
      setSaving(false);
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-violet-rgb),0.4)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "rgba(var(--surface-rgb),0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "0 20px 60px rgba(var(--accent-rgb),0.15),inset 0 1px 0 rgba(var(--surface-rgb),0.95)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>Nutrition</p><h2 className="text-lg font-light" style={{ color: "var(--text-1)" }}>Ajouter un repas</h2></div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}><X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} /></motion.button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {mealTypesList.map(({ id, label, emoji }) => (
            <motion.button key={id} whileTap={{ scale: 0.93 }} onClick={() => setType(id)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-2xl cursor-pointer transition-all duration-150"
              style={type === id ? { background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" } : { background: "rgba(var(--tint-violet-rgb),0.5)" }}>
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-[9px] font-semibold" style={{ color: type === id ? "var(--text-1)" : "var(--text-3)" }}>{label}</span>
            </motion.button>
          ))}
        </div>
        <div className="mb-3">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "var(--text-3)" }}>Aliment / Plat</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Poulet grillé, riz complet…" autoFocus className="w-full px-4 py-3 rounded-2xl text-sm outline-none" style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.6)", color: "var(--text-1)" }} />
        </div>
        <div className="mb-5">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "var(--text-3)" }}>Calories (kcal)</label>
          <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Ex : 450" className="w-full px-4 py-3 rounded-2xl text-sm outline-none" style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.6)", color: "var(--text-1)" }} />
        </div>
        <motion.button whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }} disabled={saving} onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer transition-all duration-200"
          style={{ background: name.trim() && !saving ? "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)" : "rgba(220,220,220,0.45)", color: name.trim() && !saving ? "var(--text-1)" : "var(--text-3)", boxShadow: name.trim() && !saving ? "inset 0 1px 0 rgba(var(--surface-rgb),0.9),0 4px 16px rgba(var(--accent-rgb),0.2)" : "none" }}>
          {saving ? "Enregistrement…" : "Enregistrer le repas"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}


/* ─────────────────────────────────────────────────
   LANDING PAGE — visiteur non connecté
   Hero + présentation vivent dans src/components/Landing/ pour garder
   ce fichier (partagé entre agents) le plus petit possible.
───────────────────────────────────────────────── */
function LandingPage() {
  return (
    <div className="relative w-full" style={{ overflowX: "clip", background: "var(--page-bg)" }}>
      <LandingHero />
      <LandingStory />
    </div>
  );
}

/* ─── Dashboard ─── */
// Limite quotidienne de messages avec le coach IA pour les comptes gratuits
// (aligné sur plans.ts free.limits.chatPerDay = 5 et l'affichage page /premium)
const DAILY_AI_LIMIT = 5;
// Cache module : les stats de l'accueil s'affichent instantanément au retour
let __statsCache = { score: 0, calories: 0, burned: 0, steps: 0, sleepHours: 0, streak: 0, sessionsWeek: 0, loaded: false };

/* ════════════════════════════════════════════════════════════════════
   La série, racontée comme une histoire — avec une animation SCOPÉE au
   rectangle (jamais plein écran) : la flamme pulse, le compteur s'égrène
   « jour 1 → jour 2 → … » jusqu'au jour courant, puis le gain d'EXP du
   jour (+5, connexion) pop. Rejouée à chaque arrivée sur l'accueil.
   ════════════════════════════════════════════════════════════════════ */
function SerieCard({ streak }: { streak: number }) {
  const reduce = useReducedMotion();
  const h = histoireSerie(streak);
  const hasStreak = streak > 0;

  const [dayShown, setDayShown] = useState(streak);
  const [showExp, setShowExp] = useState(false);
  // Change à chaque (re)lecture de la série → retriggere l'embrasement + le glint.
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    setPlayKey((k) => k + 1);
    if (reduce || !hasStreak) { setDayShown(streak); setShowExp(hasStreak); return; }
    setDayShown(1);
    setShowExp(false);
    // Compteur « Jour 1 → Jour N » : ~230 ms par palier, borné à ~1,4 s.
    const step = streak > 1 ? Math.min(230, 1400 / (streak - 1)) : 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let d = 2; d <= streak; d++) timers.push(setTimeout(() => setDayShown(d), 300 + step * (d - 1)));
    timers.push(setTimeout(() => setShowExp(true), 300 + step * (streak - 1) + 200));
    return () => timers.forEach(clearTimeout);
  }, [streak, hasStreak, reduce]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.97, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: "linear-gradient(135deg,rgba(245,177,32,0.16),rgba(232,98,12,0.12))", border: "1px solid rgba(232,98,12,0.20)" }}
    >
      {/* Glint doré qui balaie la carte une fois à l'arrivée */}
      {!reduce && (
        <motion.div
          key={`glint-${playKey}`}
          initial={{ x: "-120%" }}
          animate={{ x: "220%" }}
          transition={{ duration: 0.9, ease: "easeInOut", delay: 0.15 }}
          className="absolute inset-y-0 w-1/3 pointer-events-none"
          style={{ background: "linear-gradient(105deg,transparent,rgba(255,255,255,0.45),transparent)", filter: "blur(2px)" }}
        />
      )}

      {/* Flamme qui s'embrase à l'arrivée puis flare en boucle */}
      <motion.span
        key={`flame-${playKey}`}
        className="text-[26px] leading-none flex-shrink-0 relative z-10"
        style={{ transformOrigin: "center bottom" }}
        initial={reduce ? false : { scale: 0.4, rotate: -12 }}
        animate={reduce ? {} : { scale: [0.4, 1.45, 0.92, 1.14, 1], rotate: [-12, 6, -4, 2, 0] }}
        transition={{ duration: 1.05, ease: "easeOut", times: [0, 0.35, 0.6, 0.82, 1] }}
      >
        🔥
      </motion.span>

      <div className="min-w-0 flex-1 relative z-10">
        <p className="text-[14px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>{h.titre}</p>
        <p className="text-[11.5px] font-medium mt-0.5" style={{ color: "#b06a1e" }}>{h.sous}</p>
      </div>

      {hasStreak && (
        <div className="flex flex-col items-end gap-1 flex-shrink-0 relative z-10">
          <motion.div
            className="flex items-baseline gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "linear-gradient(135deg,#F5B120,#E8620C)", boxShadow: "0 3px 12px rgba(232,98,12,0.45)" }}
            animate={reduce ? {} : { scale: [1, 1.14, 1], boxShadow: ["0 3px 12px rgba(232,98,12,0.45)", "0 4px 18px rgba(232,98,12,0.65)", "0 3px 12px rgba(232,98,12,0.45)"] }}
            transition={{ duration: 0.5, ease: "easeOut", repeat: Infinity, repeatDelay: 2.8 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>Jour</span>
            <motion.span
              key={`${playKey}-${dayShown}`}
              initial={reduce ? false : { scale: 0.3, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 20 }}
              className="text-[16px] font-extrabold leading-none tabular-nums"
              style={{ color: "#fff" }}
            >
              {dayShown}
            </motion.span>
          </motion.div>
          <AnimatePresence>
            {showExp && (
              <motion.span
                key="exp"
                initial={reduce ? false : { opacity: 0, y: -6, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
                className="text-[11px] font-extrabold whitespace-nowrap"
                style={{ color: "#c05a12" }}
              >
                +{EXP_CONNEXION} EXP aujourd&apos;hui
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/**
 * La liste défilante de TOUTES les missions (bottom-sheet, comme RangsModal).
 * Montre chaque mission, ce qu'elle rapporte en EXP, et une coche si elle est
 * déjà faite aujourd'hui. En bas : les « bonnes habitudes » (sans EXP).
 */
function MissionsModal({
  open,
  onClose,
  seanceOk,
  repasOk,
  isPremium,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  seanceOk: boolean;
  repasOk: boolean;
  isPremium: boolean;
  onNavigate: (path: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  // Missions qui rapportent de l'EXP (le barème rendu lisible).
  const missionsExp: { emoji: string; bg: string; titre: string; sous: string; exp: string; done?: boolean; path?: string }[] = [
    { emoji: "🏋️", bg: "linear-gradient(135deg,#8B5CF6,#C13BC1)", titre: "Terminer une séance", sous: "La plus grosse montée d'EXP", exp: "+30", done: seanceOk, path: "/progression" },
    { emoji: "🔥", bg: "linear-gradient(135deg,#F5B120,#E8620C)", titre: "Enchaîner les séances", sous: "Bonus « série » après chaque séance", exp: "+5" },
    { emoji: "👋", bg: "linear-gradient(135deg,#FF8FC7,#F45BA0)", titre: "Connexion du jour", sous: "Rien qu'en revenant aujourd'hui", exp: "+5", done: true },
    { emoji: "🍽️", bg: "linear-gradient(135deg,#F5B120,#E8620C)", titre: "Logger un repas", sous: "Estime les calories, ça s'enregistre", exp: "+5", done: repasOk, path: "/nutrition" },
  ];
  // Bonnes habitudes : pas d'EXP, mais elles font avancer.
  const habitudes: { emoji: string; bg: string; titre: string; sous: string; path: string }[] = [
    { emoji: "⚖️", bg: "rgba(43,212,160,0.14)", titre: "Note ton poids", sous: "Suis ta progression corps", path: "/profil" },
    { emoji: "🤝", bg: "rgba(139,92,246,0.14)", titre: "Lance un défi à deux", sous: "Tiens la série avec un pote", path: "/communaute" },
  ];
  // Missions supplémentaires — débloquées en Premium (illimitées).
  const missionsPremium: { emoji: string; bg: string; titre: string; sous: string; exp: string; path?: string }[] = [
    { emoji: "⚡", bg: "linear-gradient(135deg,#8B5CF6,#C13BC1)", titre: "Double séance", sous: "Deux séances dans la même journée", exp: "+60", path: "/progression" },
    { emoji: "🌅", bg: "linear-gradient(135deg,#FF8FC7,#F45BA0)", titre: "Lève-tôt", sous: "Une séance avant 9h du matin", exp: "+40", path: "/progression" },
    { emoji: "🏆", bg: "linear-gradient(135deg,#8B5CF6,#C13BC1)", titre: "Semaine intense", sous: "5 séances dans la semaine", exp: "+50", path: "/progression" },
    { emoji: "📸", bg: "linear-gradient(135deg,#F5B120,#E8620C)", titre: "Journée nutrition complète", sous: "Tous tes repas du jour loggés", exp: "+15", path: "/nutrition" },
    { emoji: "🔥", bg: "linear-gradient(135deg,#F5B120,#E8620C)", titre: "Semaine parfaite", sous: "7 jours de connexion d'affilée", exp: "+35" },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ background: "rgba(10,6,20,0.55)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--page-bg)", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}
          >
            <div className="mx-auto sm:hidden h-1.5 w-10 rounded-full mb-3" style={{ background: "rgba(var(--accent-rgb),0.25)" }} />
            <div className="flex items-center justify-between mb-1 mt-1">
              <h2 className="text-[18px] font-extrabold" style={{ color: "var(--text-0)" }}>Toutes les missions</h2>
              <button
                type="button" onClick={onClose} aria-label="Fermer"
                className="grid place-items-center h-8 w-8 rounded-full outline-none active:opacity-80"
                style={{ background: "rgba(var(--accent-rgb),0.08)", color: "var(--text-soft)" }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-3)" }}>Chaque action fait monter ton EXP.</p>

            {/* Missions à EXP */}
            <div className="flex flex-col gap-2.5">
              {missionsExp.map((m) => (
                <div
                  key={m.titre}
                  {...(m.path ? { role: "button" as const, tabIndex: 0, onClick: () => onNavigate(m.path!) } : {})}
                  className="w-full text-left rounded-2xl px-3.5 py-3 flex items-center gap-3 outline-none active:opacity-95 transition-opacity"
                  style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.08)", boxShadow: "0 3px 10px rgba(var(--accent-rgb),0.08)", opacity: m.done ? 0.72 : 1, cursor: m.path ? "pointer" : "default" }}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[19px] flex-shrink-0" style={{ background: m.bg }}>{m.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold" style={{ color: "var(--text-0)" }}>{m.titre}</span>
                    <span className="block text-[11.5px]" style={{ color: m.done ? "#2B9E7A" : "var(--text-3)" }}>{m.done ? "Déjà fait aujourd'hui" : m.sous}</span>
                  </span>
                  {m.done
                    ? <CocheMission />
                    : <span className="rounded-full px-2.5 py-1 text-[12px] font-extrabold flex-shrink-0" style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--accent)" }}>{m.exp} EXP</span>}
                </div>
              ))}
            </div>

            {/* Bonnes habitudes (sans EXP) */}
            <p className="text-[11px] font-bold tracking-[0.06em] uppercase mt-5 mb-2" style={{ color: "var(--text-3)" }}>Bonnes habitudes</p>
            <div className="flex flex-col gap-2">
              {habitudes.map((m) => (
                <button
                  key={m.titre}
                  type="button"
                  onClick={() => onNavigate(m.path)}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-2.5 outline-none active:opacity-90 transition-opacity"
                  style={{ background: "rgba(var(--accent-rgb),0.04)", border: "1px dashed rgba(var(--accent-rgb),0.16)" }}
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0" style={{ background: m.bg }}>{m.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold" style={{ color: "var(--text-0)" }}>{m.titre}</span>
                    <span className="block text-[11px]" style={{ color: "var(--text-3)" }}>{m.sous}</span>
                  </span>
                  <ArrowRight size={16} strokeWidth={2.4} style={{ color: "var(--text-3)" }} />
                </button>
              ))}
            </div>

            {isPremium ? (
              /* Abonné Premium : ses missions supplémentaires, en illimité */
              <>
                <p className="text-[11px] font-bold tracking-[0.06em] uppercase mt-5 mb-2" style={{ color: "var(--accent)" }}>
                  Missions Premium ✦
                </p>
                <div className="flex flex-col gap-2.5">
                  {missionsPremium.map((m) => (
                    <div
                      key={m.titre}
                      {...(m.path ? { role: "button" as const, tabIndex: 0, onClick: () => onNavigate(m.path!) } : {})}
                      className="w-full text-left rounded-2xl px-3.5 py-3 flex items-center gap-3 outline-none active:opacity-95 transition-opacity"
                      style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.18)", boxShadow: "0 3px 10px rgba(var(--accent-rgb),0.10)", cursor: m.path ? "pointer" : "default" }}
                    >
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[19px] flex-shrink-0" style={{ background: m.bg }}>{m.emoji}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-semibold" style={{ color: "var(--text-0)" }}>{m.titre}</span>
                        <span className="block text-[11.5px]" style={{ color: "var(--text-3)" }}>{m.sous}</span>
                      </span>
                      <span className="rounded-full px-2.5 py-1 text-[12px] font-extrabold flex-shrink-0" style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--accent)" }}>{m.exp} EXP</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Gratuit : teaser Premium — plus de missions + le reste de l'offre */
              <button
                type="button"
                onClick={() => onNavigate("/premium")}
                className="w-full text-left rounded-2xl px-4 py-3.5 mt-5 flex items-center gap-3 outline-none active:opacity-95 transition-opacity"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 6px 20px rgba(193,59,193,0.30)" }}
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}>
                  <Sparkles size={20} strokeWidth={2.4} color="#fff" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-extrabold" style={{ color: "#fff" }}>Débloque les missions supplémentaires</span>
                  <span className="block text-[11.5px]" style={{ color: "rgba(255,255,255,0.85)" }}>En illimité avec le Premium — et pas que : assistant &amp; nutrition illimités</span>
                </span>
                <ArrowRight size={18} strokeWidth={2.6} color="#fff" className="flex-shrink-0" />
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Pastille « mission accomplie » : un rond teal avec une coche (réussite = teal). */
function CocheMission() {
  return (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: "linear-gradient(135deg,#2BD4A0,#12b98a)", boxShadow: "0 2px 8px rgba(43,212,160,0.35)" }}
      aria-label="Mission accomplie"
    >
      <Check size={16} strokeWidth={3} color="#fff" />
    </span>
  );
}

/* ═══════════ Accueil « Ta journée, en un écran » — briques ═══════════ */
const TUILE_STYLE = {
  background: "rgb(var(--surface-rgb))",
  border: "1px solid rgba(var(--accent-rgb),0.08)",
  boxShadow: "0 3px 10px rgba(var(--accent-rgb),0.06)",
};

/** Phrase d'accueil (bloc 1). CÉLÈBRE ce qui est DÉJÀ fait — elle ne répète
 *  jamais la séance du jour (le héros s'en charge), pour éviter le doublon. */
function phraseDuJour(seanceOk: boolean, repasOk: boolean, hour: number): string {
  if (seanceOk && repasOk) return "Séance faite, repas noté — journée solide 💪";
  if (seanceOk) return "Séance bouclée aujourd'hui — bien joué 💪";
  if (repasOk) return "Déjà un repas noté — continue comme ça ✦";
  // Rien de fait encore : un mot chaleureux selon l'heure, jamais culpabilisant.
  if (hour < 12) return "Nouvelle journée — on avance ✦";
  if (hour < 18) return "L'après-midi est à toi ✦";
  return "Il reste du temps pour bouger ✦";
}

/** Le mot du coach (dernier bloc). Ne parle JAMAIS de la séance du jour (le héros
 *  s'en charge) : il apporte sa valeur propre = l'assistant à qui parler. */
function motDuCoach(streak: number): { titre: string; texte: string } {
  if (new Date().getDay() === 0) {
    return { titre: "Ton bilan de la semaine", texte: "Ouvre l'assistant : je te fais le point sur tes séances et ta nutrition des 7 derniers jours." };
  }
  if (streak >= 3) {
    return { titre: `${streak} jours d'affilée, continue`, texte: "Ta régularité paie. Dis-moi comment tu te sens, j'ajuste la suite." };
  }
  return { titre: "Je suis là quand tu veux", texte: "Une question nutrition, une séance à créer, un programme à revoir ? Parle-moi." };
}

/** Bloc 2 — le nœud du jour : la séance planifiée, en grand. */
function NoeudDuJour({ seance, loaded, onGo }: { seance: PlanningDay | null; loaded: boolean; onGo: () => void }) {
  const reduce = useReducedMotion();
  if (!loaded) {
    return <div className="rounded-3xl h-[150px] animate-pulse" style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.06)" }} />;
  }
  // Jour de repos → carte violette avec une LUEUR qui tourne autour (conic-gradient
  // animé, clippé au bord par le contour intérieur). Zéro culpabilisation.
  if (seance && seance.type.toLowerCase() === "repos") {
    return (
      <div className="relative rounded-3xl">
        <div className="relative w-full flex items-start gap-3 rounded-3xl p-4" style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(193,59,193,0.06)), rgb(var(--surface-rgb))", border: "1px solid rgba(139,92,246,0.16)" }}>
          <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 text-[17px]" style={{ background: "linear-gradient(150deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 6px 16px -6px rgba(139,92,246,0.75)" }}>🌙</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold tracking-wide uppercase" style={{ color: "#8B5CF6" }}>Aujourd&apos;hui · {dayLabel(seance.date)}</p>
            <p className="text-[15px] font-extrabold mt-0.5" style={{ color: "var(--text-0)" }}>Jour de repos</p>
            <p className="text-[12.5px] leading-snug mt-0.5" style={{ color: "var(--text-soft)" }}>Ton corps encaisse le travail. Reviens demain, plus fort.</p>
          </div>
        </div>
        {/* Une lueur qui court le long du contour EXACT du rectangle (tracé rect
            SVG, segment qui se déplace via pathOffset). prefers-reduced-motion → rien. */}
        {!reduce && (
          <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="reposGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#C13BC1" />
              </linearGradient>
            </defs>
            <motion.rect
              x="0" y="0" width="100%" height="100%" rx="24"
              fill="none" stroke="url(#reposGlow)" strokeWidth="2" strokeLinecap="round" strokeOpacity={0.8}
              pathLength={100}
              strokeDasharray="46 54"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -100 }}
              transition={{ duration: 3.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
              style={{ filter: "drop-shadow(0 0 2.5px rgba(139,92,246,0.5))" }}
            />
          </svg>
        )}
      </div>
    );
  }
  // Rien de planifié → invitation
  if (!seance || !hasSeance(seance)) {
    return (
      <button type="button" onClick={onGo} className="w-full text-left rounded-3xl px-5 py-6 flex items-center gap-4 outline-none active:opacity-95" style={{ background: "rgb(var(--surface-rgb))", border: "1px dashed rgba(var(--accent-rgb),0.28)" }}>
        <span className="text-[28px]">✦</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-wide uppercase" style={{ color: "var(--text-3)" }}>Aujourd&apos;hui</p>
          <h2 className="text-[18px] font-extrabold" style={{ color: "var(--text-0)" }}>Rien de prévu</h2>
          <p className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>Choisis ta séance du jour — l&apos;assistant peut t&apos;en proposer une.</p>
        </div>
        <ChevronRight size={20} style={{ color: "var(--text-3)" }} />
      </button>
    );
  }
  // Séance planifiée → héros
  const fait = seance.status === "done";
  const nbEx = seance.exerciseList.length;
  const lieu = seance.location === "salle" ? "En salle" : seance.location === "halteres" ? "Haltères" : seance.location === "poids" ? "Poids du corps" : "";
  return (
    <div className="rounded-3xl overflow-hidden relative flex flex-col justify-end min-h-[210px]" style={{ boxShadow: "0 10px 30px -16px rgba(139,92,246,0.5)", background: "linear-gradient(180deg, rgba(10,6,20,0) 30%, rgba(10,6,20,0.82) 100%), radial-gradient(120% 90% at 80% 0%, #7C4DD6, transparent 55%), linear-gradient(150deg, #4B2E86 0%, #7A2E9E 48%, #C13BC1 120%)" }}>
      <div className="absolute top-3.5 left-3.5 text-[10.5px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-full" style={{ color: "#fff", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)" }}>Aujourd&apos;hui · {dayLabel(seance.date)}</div>
      <div className="p-4">
        <p className="text-[11px] font-bold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.72)" }}>{seance.type}</p>
        <h2 className="text-[23px] font-extrabold leading-tight mt-0.5" style={{ color: "#fff" }}>{dayTitle(seance)}</h2>
        <p className="text-[12.5px] mb-3" style={{ color: "rgba(255,255,255,0.82)" }}>{nbEx} exercice{nbEx > 1 ? "s" : ""}{lieu ? " · " + lieu : ""}</p>
        {fait ? (
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3 justify-center" style={{ background: "rgba(43,212,160,0.92)", color: "#06231A" }}>
            <Check size={17} strokeWidth={3} /> <span className="text-[14px] font-extrabold">Séance faite aujourd&apos;hui</span>
          </div>
        ) : (
          <button type="button" onClick={onGo} className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 outline-none active:opacity-95" style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 10px 24px -10px rgba(193,59,193,0.7)" }}>
            <Play size={16} fill="#fff" /> <span className="text-[15px] font-extrabold">Lancer la séance</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Bloc 4 — le relais en cours (n'apparaît que s'il existe). La vignette est un
 *  emblème ✦ bleu-violet (réflexion de l'✦) plutôt qu'une mini-affiche sombre :
 *  l'affiche complète se regarde en grand sur /defi. */
function BlocRelais({ defi, moi, onGo }: { defi: Defi; moi: string; onGo: () => void }) {
  const joursFaits = defi.actions.length;
  const equipier = defi.membres.find((m) => m.userId !== moi) ?? null;
  const reste = defi.objectif - joursFaits;
  const reussi = defi.statut === "reussi";
  const serieNom = SERIES[defi.serie as SerieSlug]?.nom ?? "Relais";
  return (
    <button type="button" onClick={onGo} className="w-full flex items-center gap-3.5 rounded-3xl p-3 text-left outline-none active:opacity-95" style={TUILE_STYLE}>
      <div className="w-[52px] h-[66px] rounded-xl flex-shrink-0 grid place-items-center text-[24px]" style={{ background: "linear-gradient(150deg,#5B7CFA,#8B5CF6)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 18px -8px rgba(123,92,246,0.7)" }}>✦</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-bold tracking-wide uppercase truncate" style={{ color: "#7B5CF6" }}>{serieNom}{equipier ? " · avec " + equipier.pseudo : ""}</p>
        <h3 className="text-[15px] font-extrabold mt-0.5" style={{ color: "var(--text-0)" }}>{reussi ? "Affiche débloquée ✦" : reste <= 1 ? "Plus qu'un maillon" : `Encore ${reste} maillons`}</h3>
        <p className="text-[12px]" style={{ color: "var(--text-soft)" }}>{reussi ? "Vous l'avez fait à deux." : "L'affiche se dévoile à chaque séance."}</p>
      </div>
      <ChevronRight size={20} style={{ color: "var(--text-3)" }} className="flex-shrink-0" />
    </button>
  );
}

function Dashboard() {
  const now = new Date();
  const hour = now.getHours();
  const { user, logout, isNewUser } = useAuth();
  const router = useRouter();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const [mobilePanel, setMobilePanel] = useState<"chat"|"stats"|null>(null);
  // Détection mobile pour adapter les tailles (orbe, carte Du Jour)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // Nouveaux états pour la refonte mobile portrait
  const [showChat, setShowChat] = useState(false);
  // Masque la barre du bas quand le chat IA est ouvert (évite la superposition)
  useEffect(() => {
    document.body.classList.toggle("chat-open", showChat);
    return () => document.body.classList.remove("chat-open");
  }, [showChat]);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);
  const [showDailyDrawer, setShowDailyDrawer] = useState(false);
  void mobilePanel; void setMobilePanel; void logout; void router; void isMobile; // legacy refs, unused dans la nouvelle layout (dashboard scrollable)
  const [showRepas, setShowRepas] = useState(false);
  const [mealsRefreshKey, setMealsRefreshKey] = useState(0);
  const [parisDay, setParisDay] = useState(() => parisDateStr());
  const [toast, setToast] = useState<string|null>(null);
  const [selectedStat, setSelectedStat] = useState<StatData | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>(initialChatMessages);
  const [aiTyping, setAiTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userContext, setUserContext] = useState<OnboardingData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [liveStats, setLiveStatsRaw] = useState(() => __statsCache);
  const setLiveStats: typeof setLiveStatsRaw = (v) => {
    setLiveStatsRaw((prev) => {
      const next = typeof v === "function" ? (v as (p: typeof prev) => typeof prev)(prev) : v;
      __statsCache = next; // garde le cache à jour
      return next;
    });
  };

  // Une app laissée ouverte traverse réellement minuit : toutes les requêtes
  // quotidiennes repartent alors sur le nouveau jour Europe/Paris.
  useEffect(() => observeParisDay(setParisDay), []);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── L'aura (rang personnel) : EXP dérivée des vraies données de l'utilisateur ──
  // `statsTick` est incrémenté quand l'effet des stats a fini d'écrire daily_stats
  // (connexion du jour). On recalcule l'aura APRÈS, sinon la connexion du jour ne
  // serait pas comptée (0 EXP, Jour 0) à cause de la race entre les deux effets.
  const [statsTick, setStatsTick] = useState(0);
  const [aura, setAura] = useState<EtatAura>(() => etatDepuisExp(0));
  const [auraLoaded, setAuraLoaded] = useState(false);
  const didInitAuraRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const cacheKey = `vaiiya_aura_exp_${user.id}`;
    const firstRun = !didInitAuraRef.current;
    didInitAuraRef.current = true;

    // Affichage OPTIMISTE : au tout premier chargement, on montre tde suite le
    // dernier rang connu (cache localStorage) au lieu d'un « — » le temps que
    // les 5 requêtes de calculerAura reviennent. Le vrai calcul rafraîchit juste après.
    if (firstRun) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached != null) {
          const exp = parseInt(cached, 10) || 0;
          prevExpRef.current = exp;           // pas de faux « +EXP » quand le frais arrive
          setAura(etatDepuisExp(exp));
          setAuraLoaded(true);
        }
      } catch { /* ignore */ }
    }

    calculerAura(supabase, user.id)
      .then((etat) => {
        if (firstRun) prevExpRef.current = etat.exp; // le premier chargement ne s'anime jamais
        setAura(etat);
        setAuraLoaded(true);
        try { localStorage.setItem(cacheKey, String(etat.exp)); } catch { /* ignore */ }
        // Passage de rang : on note le rang FRAIS (jamais celui du cache d'affichage).
        noterRang(user.id, etat.rang);
      })
      .catch(() => setAuraLoaded(true));
  }, [user, mealsRefreshKey, statsTick, parisDay]);

  // Animation quand l'EXP augmente : un « +N EXP » s'envole au-dessus du compteur
  // et la pastille pulse. On garde la 1re valeur en référence (pas d'anim au chargement).
  const [expGain, setExpGain] = useState<number | null>(null);
  const [showRangs, setShowRangs] = useState(false);
  const prevExpRef = useRef<number | null>(null);
  useEffect(() => {
    if (!auraLoaded) return;
    const prev = prevExpRef.current;
    prevExpRef.current = aura.exp;
    if (prev !== null && aura.exp > prev) {
      setExpGain(aura.exp - prev);
      const t = setTimeout(() => setExpGain(null), 2000);
      return () => clearTimeout(t);
    }
  }, [aura.exp, auraLoaded]);


  // Ferme le menu au clic extérieur (vérifie les deux refs : bouton avatar + portal dropdown)
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      const inTrigger = menuRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // Fetch stats du jour depuis Supabase
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const today = parisDay;
    (async () => {
      try {
        // La connexion du jour ne dépend PAS de ce calcul : elle part du
        // layout, depuis n'importe quelle page. On l'attend d'abord ici pour
        // que la ligne du jour existe et que l'aura recalculée juste après
        // la voie déjà créditée.
        await marquerPresence(supabase, user.id);

        const { data, error } = await supabase
          .from("daily_stats")
          .select("score, calories, burned, steps, sleep_hours, streak")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();
        if (!error && data && data.score > 0) {
          // Données existantes avec un score valide — on les utilise directement
          setLiveStats(prev => ({
            ...prev,
            score:      data.score       ?? 0,
            calories:   data.calories    ?? 0,
            burned:     data.burned      ?? 0,
            steps:      data.steps       ?? 0,
            sleepHours: data.sleep_hours ?? 0,
            streak:     data.streak      ?? 0,
            loaded:     true,
          }));
        } else {
          // Score absent ou nul — calcul dynamique (crée aussi la ligne du jour)
          const computed = await computeAndSaveScore(user.id, supabase);
          setLiveStats(prev => ({
            ...prev,
            score:      computed.score,
            calories:   computed.calories,
            burned:     computed.burned,
            steps:      computed.steps,
            sleepHours: computed.sleepHours,
            streak:     computed.streak,
            loaded:     true,
          }));
        }
      } catch {
        setLiveStats(prev => ({ ...prev, loaded: true }));
      } finally {
        // daily_stats du jour est désormais garantie écrite → on recalcule l'aura
        // (la connexion du jour +5 est enfin comptée, et la série passe à Jour 1).
        setStatsTick((t) => t + 1);
      }
    })();
  }, [user, parisDay]);

  // Fetch le nombre de séances de la semaine (lundi → maintenant)
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // lundi de la semaine en cours
    monday.setHours(0, 0, 0, 0);
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("started_at", monday.toISOString())
      .then(({ count }) => setLiveStats(prev => ({ ...prev, sessionsWeek: count ?? 0 })));
  }, [user]);

  // Onboarding : clé STABLE par ID de compte + flag "vu" → ne s'affiche QU'UNE fois.
  // Une fois le compte créé / l'onboarding fermé, il ne réapparaît plus jamais
  // automatiquement (on peut le rouvrir via Paramètres → ?ob=1).
  useEffect(() => {
    if (!user) return;
    const seenKey = `vaiiya_ob_seen_${user.id}`;
    // Charge le contexte (nouvelle clé stable + anciennes clés pour compat)
    const ctxKeys = [
      `vaiiya_ob_${user.id}`,
      `aura_onboarding_${user.pseudo}`,
      `aura_onboarding_${user.name}`,
      `aura_onboarding_${user.email?.split("@")[0]}`,
    ].filter(Boolean);
    for (const key of ctxKeys) {
      const stored = localStorage.getItem(key);
      if (stored) { try { setUserContext(JSON.parse(stored)); } catch { /* ignore */ } break; }
    }
    // Ouverture UNIQUEMENT manuelle via Paramètres (?ob=1). L'onboarding des
    // nouveaux comptes est géré par <OnboardingWrapper /> (évite le double modal/boucle).
    const forced = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ob") === "1";
    void seenKey;
    if (forced) {
      const t = setTimeout(() => setShowOnboarding(true), 0);
      return () => clearTimeout(t);
    }
  }, [user, isNewUser]);

  const markOnboardingSeen = () => {
    if (user) localStorage.setItem(`vaiiya_ob_seen_${user.id}`, "1");
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    if (!user) return;
    localStorage.setItem(`vaiiya_ob_${user.id}`, JSON.stringify(data));
    markOnboardingSeen();
    setUserContext(data);
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    markOnboardingSeen();
    setShowOnboarding(false);
  };

  const chatMessagesRef = useRef<Message[]>(initialChatMessages);

  // (Ancien pilotage de programme via localStorage retiré — le planning est
  //  désormais en base et piloté par l'orbe via cartes de confirmation.)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const n = new Date();
    const time = `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;

    // Ajoute le message utilisateur
    const userMsg: Message = { id: Date.now(), from: "me", text, time };
    const newMessages = [...chatMessagesRef.current, userMsg];
    chatMessagesRef.current = newMessages;
    setChatMessages(newMessages);

    // ── Limite quotidienne du coach pour les comptes gratuits (admins/premium = illimité) ──
    const isUnlimited = !!(user?.is_admin || user?.is_premium);
    if (!isUnlimited && user) {
      const dayKey = `vaiiya_ai_count_${user.id}_${new Date().toISOString().slice(0, 10)}`;
      const count = parseInt(localStorage.getItem(dayKey) || "0") || 0;
      if (count >= DAILY_AI_LIMIT) {
        const upMsg: Message = { id: Date.now() + 1, from: "ai", time,
          text: `🚀 Tu as atteint ta limite gratuite de ${DAILY_AI_LIMIT} messages/jour avec le coach Vaiiya. Passe au plan supérieur pour un coach illimité — je t'emmène voir les offres…` };
        const withUp = [...chatMessagesRef.current, upMsg];
        chatMessagesRef.current = withUp;
        setChatMessages(withUp);
        setTimeout(() => router.push("/premium"), 1900);
        return;
      }
      try { localStorage.setItem(dayKey, String(count + 1)); } catch { /* ignore */ }
    }

    setAiTyping(true);

    // Historique pour l'API
    const apiMessages = newMessages.slice(initialChatMessages.length).map((m) => ({
      role: m.from === "me" ? "user" as const : "assistant" as const,
      content: m.text,
    }));

    // Planning désormais en base (piloté par l'orbe) — non injecté ici.
    const programmeText: string | null = null;

    // ── Données RÉELLES du compte (repas loggés/scannés + séances) pour que l'IA réponde précisément ──
    let richProfile: unknown = null;
    if (user) {
      try {
        const sb = createClient();
        const pad = (x: number) => String(x).padStart(2, "0");
        const d0 = new Date();
        const todayStr = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;
        const d7 = new Date(d0.getTime() - 6 * 86400000);
        const weekAgoStr = `${d7.getFullYear()}-${pad(d7.getMonth() + 1)}-${pad(d7.getDate())}`;

        const [mealsRes, workoutsRes] = await Promise.all([
          sb.from("nutrition_logs")
            .select("date, meal_type, food_name, calories, proteins, carbs, fats, time, description")
            .eq("user_id", user.id).gte("date", weekAgoStr)
            .order("date", { ascending: false }).order("time", { ascending: true }).limit(120),
          sb.from("workout_sessions")
            .select("title, category, duration_minutes, calories_burned, exercises, started_at")
            .eq("user_id", user.id)
            .order("started_at", { ascending: false }).limit(10),
        ]);

        const meals = mealsRes.data ?? [];
        const mealsDetail = meals.slice(0, 40).map((m) => ({
          date: m.date, mealType: m.meal_type, name: m.food_name,
          calories: m.calories, proteins: m.proteins, time: m.time,
          description: m.date === todayStr ? m.description : null,
        }));
        // Agrégats 7 jours (par jour)
        const byDay: Record<string, { calories: number; proteins: number; carbs: number; fats: number }> = {};
        meals.forEach((m) => {
          const day = (byDay[m.date] ||= { calories: 0, proteins: 0, carbs: 0, fats: 0 });
          day.calories += m.calories || 0; day.proteins += m.proteins || 0;
          day.carbs += m.carbs || 0; day.fats += m.fats || 0;
        });
        const nutritionWeek = Object.entries(byDay)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, v]) => ({ date, calories: Math.round(v.calories), proteins: Math.round(v.proteins), carbs: Math.round(v.carbs), fats: Math.round(v.fats) }));

        const workoutHistory = (workoutsRes.data ?? []).map((w) => ({
          title: w.title, date: String(w.started_at ?? "").slice(0, 10),
          durationMinutes: w.duration_minutes, caloriesBurned: w.calories_burned,
          exercises: Array.isArray(w.exercises)
            ? (w.exercises as unknown[]).map((e) => (typeof e === "string" ? e : ((e as { name?: string; title?: string })?.name ?? (e as { title?: string })?.title ?? ""))).filter(Boolean).slice(0, 8)
            : undefined,
        }));

        richProfile = { todayDate: todayStr, mealsDetail, nutritionWeek, workoutHistory };
      } catch { /* ignore — l'IA marchera sans, juste moins précise */ }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          userContext,
          pseudo: user?.pseudo ?? user?.name ?? "",
          richProfile,
          liveStats: liveStats.loaded ? {
            calories: liveStats.calories || undefined,
            steps: liveStats.steps || undefined,
            sleepHours: liveStats.sleepHours || undefined,
            score: liveStats.score || undefined,
            streak: liveStats.streak || undefined,
          } : null,
          programme: programmeText,
          lieu: user ? (localStorage.getItem(`vaiiya_lieu_${user.id}`) || null) : null,
          lieu_equip: user ? (localStorage.getItem(`vaiiya_lieu_equip_${user.id}`) || null) : null,
        }),
      });

      if (!response.ok || !response.body) throw new Error("API error");

      setAiTyping(false);
      const aiMsgId = Date.now() + 1;
      const withAi = [...chatMessagesRef.current, { id: aiMsgId, from: "ai" as const, text: "", time }];
      chatMessagesRef.current = withAi;
      setChatMessages(withAi);

      // Stream les tokens
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setChatMessages((m) => {
          const updated = m.map((msg) => msg.id === aiMsgId ? { ...msg, text: msg.text + chunk } : msg);
          chatMessagesRef.current = updated;
          return updated;
        });
      }

      // Le pilotage du planning passe désormais par l'orbe (cartes de confirmation).
      // Défensif : on retire un éventuel ancien tag du message affiché.
      if (/\[PROGRAMME_UPDATE\]/i.test(fullText)) {
        setChatMessages((m) => {
          const updated = m.map((msg) =>
            msg.id === aiMsgId
              ? { ...msg, text: msg.text.replace(/\[PROGRAMME_UPDATE\][\s\S]*?\[\/PROGRAMME_UPDATE\]/gi, "").trim() }
              : msg
          );
          chatMessagesRef.current = updated;
          return updated;
        });
      }

      // Détecte le lieu d'entraînement indiqué par l'utilisateur (salle / maison)
      const lieuMatch = fullText.match(/\[LIEU_UPDATE\]\s*(salle|maison)\s*\[\/LIEU_UPDATE\]/i);
      if (lieuMatch && user) {
        const lieu = lieuMatch[1].toLowerCase() as "salle" | "maison";
        void persistLieu(user.id, { location: lieu }); // localStorage + base (cross-device)
        window.dispatchEvent(new CustomEvent("lieu-updated"));
        showToast(lieu === "maison" ? "🏠 Séances adaptées à la maison" : "🏋️ Séances adaptées à la salle");
        // Nettoie le tag du message affiché
        setChatMessages((m) => {
          const updated = m.map((msg) =>
            msg.id === aiMsgId
              ? { ...msg, text: msg.text.replace(/\[LIEU_UPDATE\][\s\S]*?\[\/LIEU_UPDATE\]/gi, "").trim() }
              : msg
          );
          chatMessagesRef.current = updated;
          return updated;
        });
      }

      // Détecte une demande de navigation [NAV]cible[/NAV] → ouvre la page/fenêtre
      const navMatch = fullText.match(/\[NAV\]\s*([a-zéè]+)\s*\[\/NAV\]/i);
      if (navMatch) {
        const target = navMatch[1].toLowerCase();
        // Nettoie le tag du message affiché
        setChatMessages((m) => {
          const updated = m.map((msg) =>
            msg.id === aiMsgId ? { ...msg, text: msg.text.replace(/\[NAV\][\s\S]*?\[\/NAV\]/gi, "").trim() } : msg
          );
          chatMessagesRef.current = updated;
          return updated;
        });
        setTimeout(() => {
          switch (target) {
            case "repas":
            case "seances":
            case "séances":
            case "recommandations": setShowChat(false); setShowStatsDrawer(true); break;
            case "premium":        router.push("/premium"); break;
            case "progression":    router.push("/progression"); break;
            case "nutrition":      router.push("/nutrition"); break;
            case "parametres":
            case "paramètres":     router.push("/parametres"); break;
            default: break;
          }
        }, 700);
      }

      // Sécurité : masque tout tag mémoire qui aurait fui (la mémoire long terme
      // est gérée par l'assistant orbe, pas par ce chat). Nettoie aussi l'historique.
      if (/\[MEMOIRE\]|\[OUBLI\]/i.test(fullText)) {
        setChatMessages((m) => {
          const updated = m.map((msg) =>
            msg.id === aiMsgId ? { ...msg, text: stripMemoryTags(msg.text).trim() } : msg
          );
          chatMessagesRef.current = updated;
          return updated;
        });
      }
    } catch {
      setAiTyping(false);
      const errMsg: Message = { id: Date.now() + 1, from: "ai", text: "Désolé, une erreur est survenue. Réessaie dans quelques secondes ✨", time };
      chatMessagesRef.current = [...chatMessagesRef.current, errMsg];
      setChatMessages(chatMessagesRef.current);
    }
  }, [user, userContext, liveStats]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  return (
    <div
      className="fixed inset-0 md:left-[88px] overflow-y-auto overscroll-none"
      style={{ background: "var(--page-bg)", height: "100dvh", WebkitOverflowScrolling: "touch" }}
    >
      <div
        className="mx-auto w-full max-w-2xl px-4 flex flex-col gap-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 62px)",
          paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
        }}
      >
        <AccueilSignature
          greeting={greeting}
          pseudo={user?.pseudo ?? user?.name ?? ""}
          aura={aura}
          auraLoaded={auraLoaded}
          expGain={expGain}
          isPremium={!!user?.is_premium}
          isAdmin={!!user?.is_admin}
          onNavigate={(path) => router.push(path)}
          onOpenRangs={() => setShowRangs(true)}
        />

        <RangsModal
          open={showRangs}
          onClose={() => setShowRangs(false)}
          expActuel={auraLoaded ? aura.exp : 0}
          rangActuelId={aura.rang.id}
          pseudo={user?.pseudo ?? user?.name ?? ""}
          avatarUrl={user?.avatar}
          isAdmin={!!user?.is_admin}
        />
      </div>

      {/* ────────────────── DRAWER STATS (top → down) — carousel 3 zones ── */}
      <StatsDrawer
        open={showStatsDrawer}
        onClose={() => setShowStatsDrawer(false)}
        user={user}
        onOpenStat={(s) => setSelectedStat(s)}
        onOpenRepas={() => setShowRepas(true)}
        mealsRefreshKey={mealsRefreshKey}
      />

      {/* ────────────────── DRAWER DAILY (bottom → up) — 3 cards swipables */}
      <DailyDrawer
        open={showDailyDrawer}
        onClose={() => setShowDailyDrawer(false)}
        user={user}
      />

      {/* ────────────────── CHAT PANEL (overlay) ─────────────────────── */}
      <AnimatePresence>
        {showChat && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="fixed inset-0 md:left-[88px] z-[55]" style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(10px)" }} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-2 md:left-[96px] bottom-2 z-[60] overflow-hidden rounded-3xl"
              style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
              <button type="button" onClick={() => setShowChat(false)} aria-label="Fermer"
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(var(--accent-rgb),0.15)", backdropFilter: "blur(8px)" }}>
                <X size={16} strokeWidth={2} style={{ color: "var(--accent)" }} />
              </button>
              <AIChatPanel messages={chatMessages} aiTyping={aiTyping} onSend={sendMessage} />
            </motion.div>
          </>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showRepas && <RepasModal key="repas" onClose={() => setShowRepas(false)} onSave={async (meal) => {
          if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
          const supabase = createClient();
          const now = new Date();
          const date = now.toISOString().slice(0, 10);
          const time = now.toTimeString().slice(0, 8);
          const { error } = await supabase.from("nutrition_logs").insert({
            user_id: user.id,
            date,
            meal_type: meal.type,
            food_name: meal.name,
            description: null,
            calories: meal.calories,
            proteins: 0, carbs: 0, fats: 0,
            has_photo: false,
            time,
          });
          if (error) {
            showToast("Erreur lors de l'ajout 🙏");
          } else {
            setShowRepas(false);
            setMealsRefreshKey(k => k + 1);
            showToast(`${meal.name} enregistré ✓`);
            // Recalcule le score → il monte en direct (déclenche l'animation)
            computeAndSaveScore(user.id, supabase)
              .then((c) => setLiveStats(prev => ({ ...prev, score: c.score, calories: c.calories, burned: c.burned, loaded: true })))
              .catch(() => {});
          }
        }} />}
        {selectedStat && <StatDetailModal key="statdetail" stat={selectedStat} onClose={() => setSelectedStat(null)} />}
        {toast && <HomeToast key="toast" message={toast} />}
        {showOnboarding && user && (
          <OnboardingModal key="onboarding" pseudo={user.pseudo ?? user.name ?? ""} onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Spinner de chargement ─── */
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
      <motion.div
        className="w-10 h-10 rounded-full border-2"
        style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── Bloc SEO ───
   Rendu de façon INCONDITIONNELLE (hors du verrou `isLoading`), donc présent
   dans le HTML servi côté serveur — Google le lit sans avoir à exécuter le JS.
   Masqué visuellement (sr-only) : aucun impact sur le design. Lui donne un vrai
   <h1> + un descriptif éditorial au lieu des chiffres décoratifs de l'aperçu. */
function SeoIntro() {
  return (
    <section className="sr-only">
      <h1>Vaiiya — Coach IA, musculation, nutrition et communauté</h1>
      <p>
        Vaiiya réunit tout ton coaching sportif au même endroit : un coach IA qui
        crée tes séances de musculation personnalisées, un suivi nutrition à partir
        d&apos;une simple photo, l&apos;analyse de ta progression et une communauté pour
        rester motivé. Prise de masse, perte de poids ou remise en forme : Vaiiya
        t&apos;accompagne au quotidien et te fait progresser plus vite.
      </p>
      <p>
        Crée et partage tes programmes d&apos;entraînement, suis tes performances et
        garde le cap grâce à ton score quotidien. Coach IA vocal, nutrition
        intelligente et suivi de progression — inscription gratuite, sur le web,
        iOS et Android.
      </p>
    </section>
  );
}

/* ─── Page principale ─── */
export default function HomePage() {
  const { user, isLoading, justLoggedIn, isNewUser, clearWelcome } = useAuth();
  // Le popup animé "Bonsoir" est retiré au profit de l'intro logo (SplashIntro).
  void justLoggedIn; void isNewUser; void clearWelcome;
  return (
    <>
      {/* Toujours rendu, même pendant le chargement → présent dans le HTML SSR (SEO). */}
      <SeoIntro />
      {isLoading ? <LoadingSpinner /> : user ? <Dashboard /> : <LandingPage />}
    </>
  );
}
