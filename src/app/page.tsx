"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { BarChart3, Flame, Zap, Utensils, Sparkles, X, Check, Moon, ArrowRight, Dumbbell, Footprints, Play, ChevronUp, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProgressionStats from "@/components/ProgressionStats";
import StatsDrawer from "@/components/StatsDrawer";
import DailyDrawer from "@/components/DailyDrawer";
import AIChatPanel, { initialChatMessages, type Message } from "@/components/AIChatPanel";
import StatDetailModal from "@/components/StatDetailModal";
import LandingStory, { DISCOVER_ANCHOR } from "@/components/Landing/LandingStory";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import type { StatData } from "@/data/statsData";
import { createClient } from "@/lib/supabase";
import { stripMemoryTags } from "@/lib/aiMemory";

/* ─── Compute & save Aura score dynamically ─── */
async function computeAndSaveScore(userId: string, supabase: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);

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
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
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

/* ─── Score Ring ─── */
function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const strokeW = 4;
  const radius = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD34E" />
            <stop offset="100%" stopColor="#FF7A1A" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(var(--accent-rgb),0.18)" strokeWidth={strokeW} />
        <motion.circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="url(#scoreGrad)" strokeWidth={strokeW} strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 5px rgba(var(--gold-rgb),0.55))" }}
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-2xl font-light leading-none" style={{ color: "var(--text-1)" }}>{score}</motion.span>
        <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: "var(--text-3)" }}>/100</span>
      </div>
    </div>
  );
}

/* ─── Welcome Overlay ─── */
function WelcomeBanner({ pseudo, isNew, onDismiss }: { pseudo: string; isNew: boolean; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const duration = useRef(3500);

  const hour = new Date().getHours();
  const timeGreeting = hour < 5 ? "Bonne nuit" : hour < 12 ? "Bon matin" : hour < 18 ? "Bonjour" : "Bonsoir";

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(0), 100);
    const t2 = setTimeout(onDismiss, duration.current);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: "var(--page-bg)" }}
      onClick={onDismiss}
    >
      {/* Halos de fond */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-20%", left: "-15%", width: 640, height: 640, background: "radial-gradient(circle, rgba(var(--violet-mid-rgb),0.55) 0%, transparent 65%)", filter: "blur(60px)" }}
        animate={{ scale: [1,1.12,1], x: [-8,18,-8] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-20%", right: "-15%", width: 560, height: 560, background: "radial-gradient(circle, rgba(var(--cream-mid-rgb),0.5) 0%, transparent 65%)", filter: "blur(60px)" }}
        animate={{ scale: [1,1.18,1], x: [8,-18,8] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} />

      {/* Carte principale */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: -16 }}
        transition={{ type: "spring", damping: 22, stiffness: 260, delay: 0.05 }}
        className="relative z-10 flex flex-col items-center text-center mx-5 rounded-[2.5rem] overflow-hidden"
        style={{
          background: "rgba(var(--surface-rgb),0.78)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(var(--surface-rgb),0.92)",
          boxShadow: "0 40px 100px rgba(var(--accent-rgb),0.18), 0 8px 32px rgba(var(--gold-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),1)",
          maxWidth: 360,
          width: "100%",
          paddingTop: 40,
          paddingBottom: 0,
          paddingLeft: 32,
          paddingRight: 32,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Particules internes */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div key={i} className="absolute rounded-full pointer-events-none"
            style={{ width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, background: i % 2 === 0 ? "rgba(var(--accent-rgb),0.75)" : "rgba(var(--gold-rgb),0.65)", left: `${8 + i * 16}%`, top: `${8 + (i % 3) * 20}%`, willChange: "transform, opacity" }}
            animate={{ y: [0, -70, 0], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: 2.2, delay: 0.4 + i * 0.22, repeat: Infinity, repeatDelay: 2 }} />
        ))}

        {/* Badge salutation */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full mb-7"
          style={{ background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.12), rgba(var(--gold-rgb),0.10))", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--accent)" }}>
            {isNew ? "Nouvelle aventure" : timeGreeting}
          </span>
          <span className="text-sm" style={{ color: "var(--gold)" }}>✦</span>
        </motion.div>

        {/* Avatar */}
        <div className="relative mb-6">
          {/* Halo pulsant derrière l'avatar */}
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ inset: -16, background: "radial-gradient(circle, rgba(var(--accent-rgb),0.22) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity }} />
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.52, delay: 0.14 }}
            className="w-24 h-24 rounded-[1.8rem] flex items-center justify-center text-4xl font-bold"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 14px 48px rgba(var(--accent-rgb),0.38), 0 4px 16px rgba(var(--gold-rgb),0.18), inset 0 1px 0 rgba(var(--surface-rgb),0.85)" }}
          >
            {(pseudo || "?")[0]?.toUpperCase()}
          </motion.div>
          {[0,1,2,3].map((i) => (
            <motion.div key={i} className="absolute pointer-events-none"
              style={{ left: `${[2,82,42,-14][i]}%`, top: `${[-10,-6,96,42][i]}%` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0,1.4,0], opacity: [0,1,0], y: i % 2 === 0 ? [-3,-18,-3] : [3,18,3] }}
              transition={{ duration: 1.6, delay: 0.28 + i * 0.22, repeat: Infinity, repeatDelay: 1.4 }}>
              <Sparkles size={12} style={{ color: i % 2 === 0 ? "var(--accent)" : "var(--gold)" }} />
            </motion.div>
          ))}
        </div>

        {/* Texte */}
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}
          className="text-3xl font-extralight mb-1" style={{ color: "var(--text-1)" }}>
          {isNew ? "Bienvenue !" : "Bon retour !"}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="text-xl font-light mb-3" style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          @{pseudo || "toi"}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
          className="text-sm font-light leading-relaxed mb-8" style={{ color: "var(--text-2)" }}>
          {isNew ? "Votre parcours commence maintenant ✦" : "Prêt à repousser vos limites ? 💪"}
        </motion.p>

        {/* Barre de progression en bas de la carte */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52 }}
          className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(var(--accent-rgb),0.1)" }}>
          <div className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, var(--accent), var(--gold))", width: `${progress}%`, transition: progress === 0 ? `width ${duration.current}ms linear` : "none" }} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
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

/* ─── Objectif Modal ─── */
type GoalType = "workouts" | "calories" | "steps" | "sleep";
const goalTypesList: { id: GoalType; label: string; desc: string; unit: string; defaultVal: string; icon: LucideIcon; color: string }[] = [
  { id: "workouts", label: "Séances",  desc: "/ semaine", unit: "séances/sem", defaultVal: "4",     icon: Flame,     color: "var(--accent)" },
  { id: "calories", label: "Calories", desc: "/ jour",    unit: "kcal/jour",   defaultVal: "2000",  icon: Zap,       color: "var(--accent)" },
  { id: "steps",    label: "Pas",      desc: "/ jour",    unit: "pas/jour",    defaultVal: "10000", icon: BarChart3, color: "var(--gold)" },
  { id: "sleep",    label: "Sommeil",  desc: "/ nuit",    unit: "h/nuit",      defaultVal: "8",     icon: Moon,      color: "var(--gold)" },
];
function ObjectifModal({ onClose, onSave }: { onClose: () => void; onSave: (label: string) => void }) {
  const [type, setType] = useState<GoalType>("workouts");
  const [value, setValue] = useState("4");
  const selected = goalTypesList.find((g) => g.id === type)!;
  const handleTypeChange = (id: GoalType) => { setType(id); setValue(goalTypesList.find((g) => g.id === id)!.defaultVal); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-cream-rgb),0.4)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "rgba(var(--surface-rgb),0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "0 20px 60px rgba(var(--gold-rgb),0.12),inset 0 1px 0 rgba(var(--surface-rgb),0.95)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>Performance</p><h2 className="text-lg font-light" style={{ color: "var(--text-1)" }}>Définir un objectif</h2></div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(var(--tint-cream-rgb),0.8)" }}><X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} /></motion.button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {goalTypesList.map(({ id, label, desc, icon: Icon, color }) => (
            <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => handleTypeChange(id)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-2xl cursor-pointer text-left transition-all duration-150"
              style={type === id ? { background: "linear-gradient(135deg,rgba(var(--tint-violet-rgb),0.95) 0%,rgba(var(--tint-cream-rgb),0.95) 100%)", border: "1px solid rgba(var(--surface-rgb),0.8)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" } : { background: "rgba(var(--tint-violet-rgb),0.45)", border: "1px solid transparent" }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: type === id ? "rgba(var(--surface-rgb),0.8)" : "rgba(var(--surface-rgb),0.5)" }}>
                <Icon size={13} strokeWidth={1.5} style={{ color: type === id ? color : "var(--text-3)" }} />
              </div>
              <div><p className="text-xs font-semibold" style={{ color: type === id ? "var(--text-1)" : "var(--text-3)" }}>{label}</p><p className="text-[9px]" style={{ color: "var(--text-3)" }}>{desc}</p></div>
            </motion.button>
          ))}
        </div>
        <div className="mb-5">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "var(--text-3)" }}>Cible</label>
          <div className="relative">
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-4 py-3 pr-28 rounded-2xl text-sm outline-none" style={{ background: "rgba(var(--tint-cream-rgb),0.35)", border: "1px solid rgba(var(--cream-mid-rgb),0.55)", color: "var(--text-1)" }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: "var(--text-3)" }}>{selected.unit}</span>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => onSave(`${value} ${selected.unit}`)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{ background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9),0 4px 16px rgba(var(--accent-rgb),0.2)" }}>
          Définir l'objectif
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Quick Action Card ─── */
function QuickActionCard({ icon: Icon, label, color, bg, index, onClick }: { icon: LucideIcon; label: string; color: string; bg: string; index: number; onClick?: () => void }) {
  const [tapped, setTapped] = useState(false);
  return (
    <motion.button type="button" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, type: "spring", bounce: 0.35 }}
      whileHover={{ y: -3, scale: 1.03, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.93, transition: { duration: 0.08 } }}
      onClick={() => { setTapped(true); setTimeout(() => setTapped(false), 500); onClick?.(); }}
      className={`${bg} lg-highlight relative flex-1 rounded-2xl py-4 flex flex-col items-center gap-2 cursor-pointer overflow-hidden`}>
      <AnimatePresence>
        {tapped && (<motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "rgba(var(--surface-rgb),0.4)" }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />)}
      </AnimatePresence>
      <Icon size={17} strokeWidth={1.5} style={{ color }} />
      <span className="text-[10px] font-semibold tracking-wide" style={{ color: "var(--text-1)" }}>{label}</span>
    </motion.button>
  );
}
const quickActionsConfig = [
  { icon: Flame,    label: "Séance",   color: "var(--accent)", bg: "lg-rose" },
  { icon: Utensils, label: "Repas",    color: "var(--gold)", bg: "lg-turquoise" },
  { icon: Zap,      label: "Objectif", color: "var(--accent)", bg: "lg-bicolor" },
];

/* ─────────────────────────────────────────────────
   LANDING PAGE — Spectaculaire
───────────────────────────────────────────────── */
type Particle = { id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number };

const heroLines = ["Devenez", "inarrêtable."];

function LandingPage() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: i < 8 ? 2 + Math.random() * 2 : i < 14 ? 4 + Math.random() * 4 : 8 + Math.random() * 10,
      delay: Math.random() * 4,
      duration: 8 + Math.random() * 6,
      opacity: i < 8 ? 0.7 : i < 14 ? 0.45 : 0.2,
    })));
  }, []);

  return (
    <div className="relative w-full" style={{ overflowX: "clip", background: "var(--page-bg)" }}>

      {/* ════════ HERO — premier écran ════════ */}
      <section className="relative w-full min-h-[100svh] flex flex-col overflow-hidden">

      {/* ── Grands blobs ambiants ── */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-20%", left: "-12%", width: 800, height: 800, background: "rgba(196,170,255,0.32)", filter: "blur(100px)", willChange: "transform" }}
        animate={{ scale: [1,1.12,1], y: [-15,20,-15] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-20%", right: "-12%", width: 750, height: 750, background: "rgba(245,220,130,0.3)", filter: "blur(100px)", willChange: "transform" }}
        animate={{ scale: [1,1.1,1], y: [20,-25,20] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }} />

      {/* ── Particules ── */}
      {mounted && particles.map(({ id, x, y, size, delay, duration, opacity }) => (
        <motion.div key={id} className="absolute rounded-full pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, willChange: "transform, opacity", background: id % 3 === 0 ? `rgba(var(--accent-rgb),${opacity})` : id % 3 === 1 ? `rgba(var(--gold-rgb),${opacity})` : `rgba(var(--violet-mid-rgb),${opacity * 0.8})` }}
          animate={{ y: ["-16px","16px","-16px"], opacity: [opacity * 0.2, opacity, opacity * 0.2] }}
          transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }} />
      ))}

      {/* ── Anneau décoratif ── */}
      <div className="absolute pointer-events-none rounded-full"
        style={{ width: 600, height: 600, border: "1px solid rgba(var(--accent-rgb),0.07)", top: "50%", left: "50%", marginTop: -300, marginLeft: -300 }} />

      {/* ── Nav bar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between gap-2 px-4 md:px-10 py-4"
      >
        <span className="text-xl md:text-2xl font-extralight tracking-[0.12em] flex-shrink-0" style={{ color: "var(--text-1)" }}>
          Vaiiya
        </span>
        <div className="flex items-stretch gap-2">
          <Link href="/auth?mode=login" className="flex">
            <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
              className="flex items-center justify-center h-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{ background: "rgba(var(--surface-rgb),0.65)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--surface-rgb),0.85)", color: "var(--text-body)", boxShadow: "0 2px 12px rgba(var(--accent-rgb),0.1)" }}>
              Se connecter
            </motion.div>
          </Link>
          <Link href="/auth?mode=signup" className="flex">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}
              className="relative flex items-center justify-center h-full px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer overflow-hidden text-center leading-tight max-w-[120px]"
              style={{ background: "linear-gradient(135deg,var(--accent) 0%,var(--gold) 100%)", color: "#fff", boxShadow: "0 6px 24px rgba(var(--accent-rgb),0.45), inset 0 1px 0 rgba(var(--surface-rgb),0.25)" }}>
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg,transparent 35%,rgba(var(--surface-rgb),0.3) 50%,transparent 65%)" }}
                animate={{ x: ["-120%","120%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.5 }} />
              <span className="relative z-10 inline-flex items-center gap-1">
                Commencer gratuitement
                <ArrowRight size={12} strokeWidth={2.5} className="flex-shrink-0" />
              </span>
            </motion.div>
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero principal ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center" style={{ paddingTop: "2vh", paddingBottom: "4vh" }}>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 md:mb-10"
          style={{ background: "rgba(var(--surface-rgb),0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--accent-rgb),0.25)", boxShadow: "0 4px 20px rgba(var(--accent-rgb),0.12)" }}
        >
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} animate={{ opacity: [1,0.3,1], scale: [1,1.4,1] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#5A6177" }}>IA · Musculation · Nutrition</span>
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)" }} animate={{ opacity: [0.3,1,0.3], scale: [1.4,1,1.4] }} transition={{ duration: 1.6, repeat: Infinity }} />
        </motion.div>

        {/* Titre — ligne par ligne */}
        <div className="mb-6 md:mb-8">
          {heroLines.map((line, li) => (
            <div key={li} className="overflow-hidden">
              <motion.div
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.3 + li * 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="text-[clamp(3.2rem,10vw,7rem)] font-extralight leading-[0.95] tracking-tight"
                style={li === 1 ? { backgroundImage: "linear-gradient(135deg,var(--accent) 0%,#C4902A 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent" } : { color: "var(--text-0)" }}
              >
                {line}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Sous-titre */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}
          className="text-base md:text-lg font-light max-w-md leading-relaxed mb-10 md:mb-12"
          style={{ color: "var(--text-2)" }}
        >
          Ton coach IA vocal, ton suivi musculaire, ta nutrition —<br />
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>tout au même endroit.</span>
        </motion.p>

        {/* ── Indice de scroll — invite claire à dérouler la page ── */}
        <motion.button type="button" aria-label="Découvrir Vaiiya"
          onClick={() => document.getElementById(DISCOVER_ANCHOR)?.scrollIntoView({ behavior: "smooth" })}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7 }}
          whileHover={{ y: -2 }}
          className="absolute left-1/2 -translate-x-1/2 bottom-10 flex flex-col items-center cursor-pointer"
        >
          <motion.div
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "rgba(var(--surface-rgb),0.72)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--accent-rgb),0.3)", boxShadow: "0 8px 26px rgba(var(--accent-rgb),0.28)" }}
            animate={{ y: [0, 9, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={23} strokeWidth={2.4} style={{ color: "var(--accent)" }} />
          </motion.div>
        </motion.button>
      </div>
      </section>

      {/* ════════ STORY — présentation scrollable ════════ */}
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
  const [dailyVideoUrl, setDailyVideoUrl] = useState<string | null>(null);
  void mobilePanel; void setMobilePanel; void logout; void router; void isMobile; // legacy refs, unused dans la nouvelle layout (dashboard scrollable)
  const [showRepas, setShowRepas] = useState(false);
  const [mealsRefreshKey, setMealsRefreshKey] = useState(0);
  const [showObjectif, setShowObjectif] = useState(false);
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
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Animation quand le score augmente (+N qui s'envole + pop)
  const [scoreBump, setScoreBump] = useState<number | null>(null);
  const prevScoreRef = useRef<number | null>(null);
  useEffect(() => {
    if (!liveStats.loaded) return;
    const prev = prevScoreRef.current;
    prevScoreRef.current = liveStats.score;
    if (prev !== null && liveStats.score > prev) {
      setScoreBump(liveStats.score - prev);
      const t = setTimeout(() => setScoreBump(null), 2200);
      return () => clearTimeout(t);
    }
  }, [liveStats.score, liveStats.loaded]);

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
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("daily_stats")
      .select("score, calories, burned, steps, sleep_hours, streak")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(async ({ data, error }) => {
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
          // Score absent ou nul — calcul dynamique
          try {
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
          } catch {
            setLiveStats(prev => ({ ...prev, loaded: true }));
          }
        }
      });
  }, [user]);

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

  // Fetch la vidéo du jour : 24h → 7j → la plus vue de tous les temps (garantit un aperçu)
  useEffect(() => {
    const supabase = createClient();
    const pickVideo = async () => {
      const tryWindow = async (sinceIso: string | null) => {
        let q = supabase.from("posts").select("media_url, views, created_at")
          .eq("media_type", "video")
          .not("media_url", "is", null);
        if (sinceIso) q = q.gte("created_at", sinceIso);
        const { data } = await q
          .order("views", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle();
        return (data?.media_url as string | undefined) ?? null;
      };
      const day  = new Date(Date.now() - 86400000).toISOString();
      const week = new Date(Date.now() - 7 * 86400000).toISOString();
      const url = (await tryWindow(day)) ?? (await tryWindow(week)) ?? (await tryWindow(null));
      if (url) setDailyVideoUrl(url);
    };
    void pickVideo();
  }, []);

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
        const lieu = lieuMatch[1].toLowerCase();
        try { localStorage.setItem(`vaiiya_lieu_${user.id}`, lieu); } catch { /* ignore */ }
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

  const handleVoiceTranscript = useCallback((text: string) => {
    sendMessage(text);
    setShowChat(true);
  }, [sendMessage]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const quickActionHandlers = [
    () => { setShowChat(true); sendMessage("Génère-moi une séance d'entraînement pour aujourd'hui selon mon profil et mes objectifs"); },
    () => { setShowChat(true); sendMessage("Propose-moi un repas équilibré pour ce soir selon mon régime et mes objectifs caloriques"); },
    () => { setShowChat(true); sendMessage("Aide-moi à définir un nouvel objectif fitness motivant et réaliste pour les 4 prochaines semaines"); },
  ];
  void quickActionHandlers; void handleVoiceTranscript;

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
        {/* ── Salutation ── */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: "var(--text-soft)" }}>{greeting}</p>
          <h1 className="text-2xl font-light mt-0.5" style={{ color: "var(--text-0)" }}>
            {user?.pseudo ?? user?.name ?? ""}
          </h1>
        </div>

        {/* ── Aujourd'hui → séances & repas recommandés (StatsDrawer) ── */}
        <button
          type="button"
          onClick={() => setShowStatsDrawer(true)}
          data-tour-anchor="stats"
          className="w-full text-left rounded-3xl p-4 outline-none active:opacity-95 transition-opacity"
          style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.1)", boxShadow: "0 6px 26px rgba(var(--accent-rgb),0.16)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--text-3)" }}>Aujourd&apos;hui</p>
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
              <Dumbbell size={11} strokeWidth={2} />
              Séances &amp; repas
              <ChevronDown size={12} strokeWidth={2.5} />
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ScoreRing score={liveStats.loaded ? liveStats.score : 0} size={82} />
              <AnimatePresence>
                {scoreBump != null && (
                  <motion.div key="bump"
                    initial={{ opacity: 0, y: 6, scale: 0.6 }}
                    animate={{ opacity: 1, y: -8, scale: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none px-2 py-0.5 rounded-full text-[11px] font-extrabold"
                    style={{ background: "linear-gradient(135deg,var(--accent),var(--gold))", color: "#fff", boxShadow: "0 4px 12px rgba(var(--accent-rgb),0.5)", whiteSpace: "nowrap" }}>
                    +{scoreBump}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2.5">
              {/* Série — dégradé orange (flamme) */}
              <div className="rounded-2xl px-3 py-2.5" style={{ background: "linear-gradient(135deg,#F5B120,#E8620C)", boxShadow: "0 5px 16px rgba(232,98,12,0.4)" }}>
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase" style={{ color: "#fff" }}><Flame size={12} strokeWidth={2} />Série</span>
                <p className="mt-1 text-xl font-extrabold leading-none" style={{ color: "#fff" }}>
                  {liveStats.loaded && liveStats.streak > 0 ? liveStats.streak : "—"}
                  {liveStats.streak > 0 && <span className="text-[11px] font-medium ml-1" style={{ opacity: 0.85 }}>{liveStats.streak > 1 ? "jours" : "jour"}</span>}
                </p>
              </div>
              {/* Séances — dégradé violet → magenta */}
              <div className="rounded-2xl px-3 py-2.5" style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 5px 16px rgba(147,60,200,0.4)" }}>
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase" style={{ color: "#fff" }}><Dumbbell size={12} strokeWidth={2} />Séances</span>
                <p className="mt-1 text-xl font-semibold leading-none" style={{ color: "#fff" }}>
                  {liveStats.loaded ? liveStats.sessionsWeek : "—"}
                  <span className="text-[11px] font-medium ml-1" style={{ opacity: 0.85 }}>/ sem</span>
                </p>
              </div>
            </div>
          </div>
          {/* Calories mangées / brûlées */}
          <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.08)" }}>
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#FF9A3D" }}>
              <Flame size={12} strokeWidth={2} />
              {liveStats.calories > 0 ? `${liveStats.calories.toLocaleString("fr-FR")} kcal mangées` : "Aucun repas loggé"}
            </span>
            {liveStats.burned > 0 && (
              <span className="text-xs font-medium" style={{ color: "#E8620C" }}>{liveStats.burned.toLocaleString("fr-FR")} kcal brûlées</span>
            )}
          </div>
        </button>

        {/* ── Du jour (vidéo) → DailyDrawer ── */}
        <button
          type="button"
          onClick={() => setShowDailyDrawer(true)}
          data-tour-anchor="votd"
          aria-label="Ouvrir Du Jour"
          className="w-full rounded-3xl p-2.5 flex items-stretch gap-3 outline-none active:opacity-95 transition-opacity overflow-hidden"
          style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.1)", boxShadow: "0 6px 26px rgba(var(--accent-rgb),0.16)" }}
        >
          <div className="relative overflow-hidden rounded-2xl flex-shrink-0" style={{ width: 66, height: 92, background: "linear-gradient(135deg, #1A1A2E 0%, #2D2A4E 100%)" }}>
            {dailyVideoUrl ? (
              <video src={dailyVideoUrl} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline preload="auto" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Play size={20} strokeWidth={2} style={{ color: "#fff", marginLeft: 2 }} fill="#fff" />
              </div>
            )}
            {dailyVideoUrl && (
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.55)" }}>
                <div className="w-1 h-1 rounded-full" style={{ background: "#FC8181" }} />
                <span className="text-[7px] font-bold tracking-widest text-white">LIVE</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
            <p className="text-[10px] font-bold tracking-widest uppercase leading-none mb-1" style={{ color: "var(--text-3)" }}>Du jour</p>
            <p className="text-lg font-light leading-tight" style={{ color: "var(--text-0)" }}>Vidéo · Séance · Perf</p>
            <p className="text-[11px] font-light mt-1" style={{ color: "var(--text-soft)" }}>Tap pour explorer ton contenu</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 3px 12px rgba(193,59,193,0.4)" }}>
                <Play size={10} strokeWidth={2.5} style={{ color: "#fff", marginLeft: 0.5 }} fill="#fff" />
                <span className="text-[11px] font-bold text-white">Voir</span>
              </span>
              <ChevronRight size={14} strokeWidth={2} style={{ color: "rgba(var(--accent-rgb),0.6)" }} />
            </div>
          </div>
        </button>

        {/* ── Ta progression (courbes remontées de l'onglet Progression) ── */}
        <section className="mt-2">
          <div className="mb-3 px-1">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-0.5" style={{ color: "var(--text-3)" }}>Analyse</p>
            <h2 className="text-lg font-light" style={{ color: "var(--text-0)" }}>Ta progression</h2>
          </div>
          <ProgressionStats onToast={showToast} />
        </section>
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
        {showObjectif && <ObjectifModal key="objectif" onClose={() => setShowObjectif(false)} onSave={(l) => { setShowObjectif(false); showToast(`Objectif : ${l} ✓`); }} />}
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
