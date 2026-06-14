"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { BarChart3, Flame, Zap, Utensils, Sparkles, X, Check, Moon, ArrowRight, Dumbbell, Brain, Activity, Footprints, Play, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HomeOrb from "@/components/HomeOrb";
import StatsDrawer from "@/components/StatsDrawer";
import DailyDrawer from "@/components/DailyDrawer";
import NotificationBell from "@/components/NotificationBell";
import AIChatPanel, { initialChatMessages, type Message } from "@/components/AIChatPanel";
import StatDetailModal from "@/components/StatDetailModal";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import type { StatData } from "@/data/statsData";
import { createClient } from "@/lib/supabase";

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
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#D4A843" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={strokeW} />
        <motion.circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="url(#scoreGrad)" strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-2xl font-light leading-none" style={{ color: "#2D3748" }}>{score}</motion.span>
        <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: "#A0AEC0" }}>/100</span>
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
      style={{ background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 50%, #faf8ff 100%)" }}
      onClick={onDismiss}
    >
      {/* Halos de fond */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-20%", left: "-15%", width: 640, height: 640, background: "radial-gradient(circle, rgba(212,192,255,0.55) 0%, transparent 65%)", filter: "blur(60px)" }}
        animate={{ scale: [1,1.12,1], x: [-8,18,-8] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-20%", right: "-15%", width: 560, height: 560, background: "radial-gradient(circle, rgba(245,230,163,0.5) 0%, transparent 65%)", filter: "blur(60px)" }}
        animate={{ scale: [1,1.18,1], x: [8,-18,8] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} />

      {/* Carte principale */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: -16 }}
        transition={{ type: "spring", damping: 22, stiffness: 260, delay: 0.05 }}
        className="relative z-10 flex flex-col items-center text-center mx-5 rounded-[2.5rem] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.92)",
          boxShadow: "0 40px 100px rgba(167,139,250,0.18), 0 8px 32px rgba(212,168,67,0.1), inset 0 1px 0 rgba(255,255,255,1)",
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
            style={{ width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, background: i % 2 === 0 ? "rgba(167,139,250,0.75)" : "rgba(212,168,67,0.65)", left: `${8 + i * 16}%`, top: `${8 + (i % 3) * 20}%`, willChange: "transform, opacity" }}
            animate={{ y: [0, -70, 0], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: 2.2, delay: 0.4 + i * 0.22, repeat: Infinity, repeatDelay: 2 }} />
        ))}

        {/* Badge salutation */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full mb-7"
          style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(212,168,67,0.10))", border: "1px solid rgba(167,139,250,0.18)" }}>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
            {isNew ? "Nouvelle aventure" : timeGreeting}
          </span>
          <span className="text-sm" style={{ color: "#D4A843" }}>✦</span>
        </motion.div>

        {/* Avatar */}
        <div className="relative mb-6">
          {/* Halo pulsant derrière l'avatar */}
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ inset: -16, background: "radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity }} />
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.52, delay: 0.14 }}
            className="w-24 h-24 rounded-[1.8rem] flex items-center justify-center text-4xl font-bold"
            style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "0 14px 48px rgba(167,139,250,0.38), 0 4px 16px rgba(212,168,67,0.18), inset 0 1px 0 rgba(255,255,255,0.85)" }}
          >
            {(pseudo || "?")[0]?.toUpperCase()}
          </motion.div>
          {[0,1,2,3].map((i) => (
            <motion.div key={i} className="absolute pointer-events-none"
              style={{ left: `${[2,82,42,-14][i]}%`, top: `${[-10,-6,96,42][i]}%` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0,1.4,0], opacity: [0,1,0], y: i % 2 === 0 ? [-3,-18,-3] : [3,18,3] }}
              transition={{ duration: 1.6, delay: 0.28 + i * 0.22, repeat: Infinity, repeatDelay: 1.4 }}>
              <Sparkles size={12} style={{ color: i % 2 === 0 ? "#A78BFA" : "#D4A843" }} />
            </motion.div>
          ))}
        </div>

        {/* Texte */}
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}
          className="text-3xl font-extralight mb-1" style={{ color: "#2D3748" }}>
          {isNew ? "Bienvenue !" : "Bon retour !"}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="text-xl font-light mb-3" style={{ background: "linear-gradient(135deg, #A78BFA, #D4A843)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          @{pseudo || "toi"}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
          className="text-sm font-light leading-relaxed mb-8" style={{ color: "#718096" }}>
          {isNew ? "Votre parcours commence maintenant ✦" : "Prêt à repousser vos limites ? 💪"}
        </motion.p>

        {/* Barre de progression en bas de la carte */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52 }}
          className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(167,139,250,0.1)" }}>
          <div className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #A78BFA, #D4A843)", width: `${progress}%`, transition: progress === 0 ? `width ${duration.current}ms linear` : "none" }} />
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
      style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 32px rgba(167,139,250,0.2),inset 0 1px 0 rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}
    >
      <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
      <span className="text-sm font-medium" style={{ color: "#2D3748" }}>{message}</span>
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
      style={{ background: "rgba(240,235,255,0.4)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(167,139,250,0.15),inset 0 1px 0 rgba(255,255,255,0.95)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Nutrition</p><h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Ajouter un repas</h2></div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}><X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} /></motion.button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {mealTypesList.map(({ id, label, emoji }) => (
            <motion.button key={id} whileTap={{ scale: 0.93 }} onClick={() => setType(id)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-2xl cursor-pointer transition-all duration-150"
              style={type === id ? { background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" } : { background: "rgba(240,235,255,0.5)" }}>
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-[9px] font-semibold" style={{ color: type === id ? "#2D3748" : "#A0AEC0" }}>{label}</span>
            </motion.button>
          ))}
        </div>
        <div className="mb-3">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>Aliment / Plat</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Poulet grillé, riz complet…" autoFocus className="w-full px-4 py-3 rounded-2xl text-sm outline-none" style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.6)", color: "#2D3748" }} />
        </div>
        <div className="mb-5">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>Calories (kcal)</label>
          <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Ex : 450" className="w-full px-4 py-3 rounded-2xl text-sm outline-none" style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.6)", color: "#2D3748" }} />
        </div>
        <motion.button whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }} disabled={saving} onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer transition-all duration-200"
          style={{ background: name.trim() && !saving ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "rgba(220,220,220,0.45)", color: name.trim() && !saving ? "#2D3748" : "#A0AEC0", boxShadow: name.trim() && !saving ? "inset 0 1px 0 rgba(255,255,255,0.9),0 4px 16px rgba(167,139,250,0.2)" : "none" }}>
          {saving ? "Enregistrement…" : "Enregistrer le repas"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Objectif Modal ─── */
type GoalType = "workouts" | "calories" | "steps" | "sleep";
const goalTypesList: { id: GoalType; label: string; desc: string; unit: string; defaultVal: string; icon: React.ElementType; color: string }[] = [
  { id: "workouts", label: "Séances",  desc: "/ semaine", unit: "séances/sem", defaultVal: "4",     icon: Flame,     color: "#A78BFA" },
  { id: "calories", label: "Calories", desc: "/ jour",    unit: "kcal/jour",   defaultVal: "2000",  icon: Zap,       color: "#A78BFA" },
  { id: "steps",    label: "Pas",      desc: "/ jour",    unit: "pas/jour",    defaultVal: "10000", icon: BarChart3, color: "#D4A843" },
  { id: "sleep",    label: "Sommeil",  desc: "/ nuit",    unit: "h/nuit",      defaultVal: "8",     icon: Moon,      color: "#D4A843" },
];
function ObjectifModal({ onClose, onSave }: { onClose: () => void; onSave: (label: string) => void }) {
  const [type, setType] = useState<GoalType>("workouts");
  const [value, setValue] = useState("4");
  const selected = goalTypesList.find((g) => g.id === type)!;
  const handleTypeChange = (id: GoalType) => { setType(id); setValue(goalTypesList.find((g) => g.id === id)!.defaultVal); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(255,251,240,0.4)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(212,168,67,0.12),inset 0 1px 0 rgba(255,255,255,0.95)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Performance</p><h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Définir un objectif</h2></div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(255,251,240,0.8)" }}><X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} /></motion.button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {goalTypesList.map(({ id, label, desc, icon: Icon, color }) => (
            <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => handleTypeChange(id)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-2xl cursor-pointer text-left transition-all duration-150"
              style={type === id ? { background: "linear-gradient(135deg,rgba(240,235,255,0.95) 0%,rgba(255,251,240,0.95) 100%)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" } : { background: "rgba(240,235,255,0.45)", border: "1px solid transparent" }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: type === id ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)" }}>
                <Icon size={13} strokeWidth={1.5} style={{ color: type === id ? color : "#A0AEC0" }} />
              </div>
              <div><p className="text-xs font-semibold" style={{ color: type === id ? "#2D3748" : "#A0AEC0" }}>{label}</p><p className="text-[9px]" style={{ color: "#A0AEC0" }}>{desc}</p></div>
            </motion.button>
          ))}
        </div>
        <div className="mb-5">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>Cible</label>
          <div className="relative">
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-4 py-3 pr-28 rounded-2xl text-sm outline-none" style={{ background: "rgba(255,251,240,0.35)", border: "1px solid rgba(245,230,163,0.55)", color: "#2D3748" }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: "#A0AEC0" }}>{selected.unit}</span>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => onSave(`${value} ${selected.unit}`)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9),0 4px 16px rgba(167,139,250,0.2)" }}>
          Définir l'objectif
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Quick Action Card ─── */
function QuickActionCard({ icon: Icon, label, color, bg, index, onClick }: { icon: React.ElementType; label: string; color: string; bg: string; index: number; onClick?: () => void }) {
  const [tapped, setTapped] = useState(false);
  return (
    <motion.button type="button" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, type: "spring", bounce: 0.35 }}
      whileHover={{ y: -3, scale: 1.03, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.93, transition: { duration: 0.08 } }}
      onClick={() => { setTapped(true); setTimeout(() => setTapped(false), 500); onClick?.(); }}
      className={`${bg} lg-highlight relative flex-1 rounded-2xl py-4 flex flex-col items-center gap-2 cursor-pointer overflow-hidden`}>
      <AnimatePresence>
        {tapped && (<motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "rgba(255,255,255,0.4)" }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />)}
      </AnimatePresence>
      <Icon size={17} strokeWidth={1.5} style={{ color }} />
      <span className="text-[10px] font-semibold tracking-wide" style={{ color: "#2D3748" }}>{label}</span>
    </motion.button>
  );
}
const quickActionsConfig = [
  { icon: Flame,    label: "Séance",   color: "#A78BFA", bg: "lg-rose" },
  { icon: Utensils, label: "Repas",    color: "#D4A843", bg: "lg-turquoise" },
  { icon: Zap,      label: "Objectif", color: "#A78BFA", bg: "lg-bicolor" },
];

/* ─────────────────────────────────────────────────
   LANDING PAGE — Spectaculaire
───────────────────────────────────────────────── */
type Particle = { id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number };

const heroLines = ["Devenez", "inarrêtable."];

const features = [
  { icon: Dumbbell, label: "Musculation",  desc: "Suivi musculaire précis" },
  { icon: Brain,    label: "Coach IA",     desc: "Vocal & personnalisé" },
  { icon: Utensils, label: "Nutrition",    desc: "Plans adaptatifs" },
  { icon: Activity, label: "Performance",  desc: "Analyse en temps réel" },
];

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
    <div className="relative w-full min-h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 50%, #faf8ff 100%)" }}>

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
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, willChange: "transform, opacity", background: id % 3 === 0 ? `rgba(167,139,250,${opacity})` : id % 3 === 1 ? `rgba(212,168,67,${opacity})` : `rgba(212,192,255,${opacity * 0.8})` }}
          animate={{ y: ["-16px","16px","-16px"], opacity: [opacity * 0.2, opacity, opacity * 0.2] }}
          transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }} />
      ))}

      {/* ── Anneau décoratif ── */}
      <div className="absolute pointer-events-none rounded-full"
        style={{ width: 600, height: 600, border: "1px solid rgba(167,139,250,0.07)", top: "50%", left: "50%", marginTop: -300, marginLeft: -300 }} />

      {/* ── Nav bar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between gap-2 px-4 md:px-10 py-4"
      >
        <span className="text-xl md:text-2xl font-extralight tracking-[0.12em] flex-shrink-0" style={{ color: "#2D3748" }}>
          Vaiiya
        </span>
        <div className="flex items-stretch gap-2">
          <Link href="/auth?mode=login" className="flex">
            <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
              className="flex items-center justify-center h-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.85)", color: "#4A5568", boxShadow: "0 2px 12px rgba(167,139,250,0.1)" }}>
              Se connecter
            </motion.div>
          </Link>
          <Link href="/auth?mode=signup" className="flex">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}
              className="relative flex items-center justify-center h-full px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer overflow-hidden text-center leading-tight max-w-[120px]"
              style={{ background: "linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)", color: "#fff", boxShadow: "0 6px 24px rgba(167,139,250,0.45), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.3) 50%,transparent 65%)" }}
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
          style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 4px 20px rgba(167,139,250,0.12)" }}
        >
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#A78BFA" }} animate={{ opacity: [1,0.3,1], scale: [1,1.4,1] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#5A6177" }}>IA · Musculation · Nutrition</span>
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#D4A843" }} animate={{ opacity: [0.3,1,0.3], scale: [1.4,1,1.4] }} transition={{ duration: 1.6, repeat: Infinity }} />
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
                style={li === 1 ? { backgroundImage: "linear-gradient(135deg,#A78BFA 0%,#C4902A 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent" } : { color: "#1A202C" }}
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
          style={{ color: "#718096" }}
        >
          Ton coach IA vocal, ton suivi musculaire, ta nutrition —<br />
          <span style={{ color: "#A78BFA", fontWeight: 500 }}>tout au même endroit.</span>
        </motion.p>

        {/* ── Visuel central : mesh lumineux animé ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center mb-10 md:mb-14"
          style={{ width: 340, height: 200 }}
        >
          {/* Halos gradient animés en couches */}
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ width: 320, height: 180, background: "radial-gradient(ellipse at 40% 50%, rgba(167,139,250,0.55) 0%, rgba(212,168,67,0.32) 50%, transparent 75%)", filter: "blur(28px)" }}
            animate={{ scale: [1,1.12,1], x: [-12,12,-12], rotate: [0,8,0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ width: 260, height: 140, background: "radial-gradient(ellipse at 60% 40%, rgba(212,168,67,0.5) 0%, rgba(167,139,250,0.3) 55%, transparent 75%)", filter: "blur(22px)" }}
            animate={{ scale: [1,1.18,1], x: [10,-10,10], rotate: [0,-6,0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} />

          {/* Lignes decoratives */}
          {[0,1,2].map((i) => (
            <motion.div key={i} className="absolute pointer-events-none rounded-full"
              style={{ width: 180 + i * 60, height: 100 + i * 35, border: `1px solid rgba(167,139,250,${0.2 - i * 0.05})` }}
              animate={{ rotate: i % 2 === 0 ? [0, 360] : [0, -360], scale: [1, 1.04, 1] }}
              transition={{ rotate: { duration: 18 + i * 8, repeat: Infinity, ease: "linear" }, scale: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 } }} />
          ))}

          {/* Glass card centrale — aperçu app */}
          <motion.div className="relative z-10 px-7 py-5 rounded-3xl"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 16px 56px rgba(167,139,250,0.2), 0 4px 16px rgba(212,168,67,0.1), inset 0 1px 0 rgba(255,255,255,0.95)" }}
            animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-4">
              {/* Score ring mini */}
              <div className="relative flex-shrink-0" style={{ width: 52, height: 52 }}>
                <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth="3.5" />
                  <motion.circle cx="26" cy="26" r="22" fill="none" stroke="url(#sg2)" strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={138.2} initial={{ strokeDashoffset: 138.2 }}
                    animate={{ strokeDashoffset: 138.2 * 0.09 }} transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }} />
                  <defs><linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#A78BFA" /><stop offset="100%" stopColor="#D4A843" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-light leading-none" style={{ color: "#2D3748" }}>91</span>
                  <span className="text-[7px] font-semibold" style={{ color: "#A0AEC0" }}>/100</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>Score du jour</p>
                <p className="text-sm font-medium" style={{ color: "#2D3748" }}>Récupération top 🔥</p>
                <p className="text-[10px] font-light" style={{ color: "#A78BFA" }}>+12% cette semaine</p>
              </div>
              <div className="ml-2 flex flex-col gap-1.5">
                {[["💪", "+23%"], ["🔥", "1 847"], ["😴", "7h24"]].map(([emoji, val]) => (
                  <div key={val} className="flex items-center gap-1.5">
                    <span className="text-[11px]">{emoji}</span>
                    <span className="text-[10px] font-semibold" style={{ color: "#4A5568" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Feature pills ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {features.map(({ icon: Icon, label, desc }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.15 + i * 0.09, type: "spring", bounce: 0.35 }}
              whileHover={{ y: -3, scale: 1.04 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 4px 18px rgba(167,139,250,0.07)", cursor: "default" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: i % 2 === 0 ? "linear-gradient(135deg,rgba(240,235,255,0.95) 0%,rgba(212,192,255,0.75) 100%)" : "linear-gradient(135deg,rgba(255,251,240,0.95) 0%,rgba(245,230,163,0.75) 100%)" }}>
                <Icon size={15} strokeWidth={1.5} style={{ color: i % 2 === 0 ? "#A78BFA" : "#D4A843" }} />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold leading-none mb-0.5" style={{ color: "#2D3748" }}>{label}</p>
                <p className="text-[10px] font-light leading-none" style={{ color: "#A0AEC0" }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dégradé de bas */}
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(250,248,255,0.85), transparent)" }} />
    </div>
  );
}

/* ─── Dashboard ─── */
// Limite quotidienne de messages avec le coach IA pour les comptes gratuits
// (aligné sur plans.ts free.limits.chatPerDay = 5 et l'affichage page /premium)
const DAILY_AI_LIMIT = 5;
// Cache module : les stats de l'accueil s'affichent instantanément au retour
let __statsCache = { score: 0, calories: 0, steps: 0, sleepHours: 0, streak: 0, sessionsWeek: 0, loaded: false };

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
  void mobilePanel; void setMobilePanel; void logout; void router; // legacy refs, unused dans la nouvelle layout
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
      .select("score, calories, steps, sleep_hours, streak")
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

  // Clé de cache programme (même logique que WeeklyProgramme)
  const getProgrammeCacheKey = useCallback(() => {
    if (!user) return null;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `aura_programme_${user.id}_w${week}_${now.getFullYear()}`;
  }, [user]);

  // Applique une mise à jour de jour dans le programme localStorage — retourne le label pour le toast
  const applyProgrammeUpdate = useCallback((rawJson: string): string | null => {
    if (!user) return null;
    try {
      // Nettoyage : retire les backticks markdown éventuels
      const clean = rawJson.replace(/```json?/g, "").replace(/```/g, "").trim();
      const update = JSON.parse(clean);
      if (!update.jour) return null;
      // Jour normalisé (Lundi, Mardi…) pour matcher le programme local
      const j = String(update.jour).trim().toLowerCase();
      const dayKey = j.charAt(0).toUpperCase() + j.slice(1);
      // On stocke la modif dans un store "overrides" séparé : la régénération
      // locale du programme ne pourra JAMAIS l'écraser.
      const okey = `vaiiya_prog_overrides_${user.id}`;
      let overrides: Record<string, unknown> = {};
      try { overrides = JSON.parse(localStorage.getItem(okey) || "{}"); } catch { /* ignore */ }
      overrides[dayKey] = { ...update, jour: dayKey };
      localStorage.setItem(okey, JSON.stringify(overrides));
      window.dispatchEvent(new CustomEvent("programme-updated"));
      return `${dayKey} : ${update.titre || update.type}`;
    } catch (e) {
      console.error("Programme update parse error", e);
      return null;
    }
  }, [user]);

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

    // Programme actuel (pour que l'IA sache ce qu'il y a déjà)
    const cacheKey = getProgrammeCacheKey();
    let programmeText: string | null = null;
    if (cacheKey) {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const p = JSON.parse(raw);
          programmeText = p.semaine?.map((d: { jour: string; type: string; titre: string }) => `${d.jour}: ${d.type} - ${d.titre}`).join(", ") ?? null;
        }
      } catch { /* ignore */ }
    }

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

      // Détecte et applique une mise à jour de programme (regex souple)
      const match = fullText.match(/\[PROGRAMME_UPDATE\]([\s\S]*?)\[\/PROGRAMME_UPDATE\]/i);
      if (match) {
        const label = applyProgrammeUpdate(match[1].trim());
        if (label) showToast(`✅ ${label} mis à jour`);
        // Nettoie le bloc JSON du message affiché
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
            case "communaute":
            case "communauté":     router.push("/communaute"); break;
            case "decouverte":
            case "découverte":     router.push("/decouverte"); break;
            case "parametres":
            case "paramètres":     router.push("/parametres"); break;
            default: break;
          }
        }, 700);
      }
    } catch {
      setAiTyping(false);
      const errMsg: Message = { id: Date.now() + 1, from: "ai", text: "Désolé, une erreur est survenue. Réessaie dans quelques secondes ✨", time };
      chatMessagesRef.current = [...chatMessagesRef.current, errMsg];
      setChatMessages(chatMessagesRef.current);
    }
  }, [user, userContext, liveStats, getProgrammeCacheKey, applyProgrammeUpdate]);

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
  void quickActionHandlers;

  return (
    <div className="fixed inset-0 md:left-[88px] flex flex-col overflow-y-hidden overscroll-none" style={{ background: "linear-gradient(180deg, #faf8ff 0%, #fffef8 100%)", height: "100dvh" }}>

      {/* ────────────────── TOP : 4 cadrans + croissant ────────────────── */}
      <button
        type="button"
        onClick={() => setShowStatsDrawer(true)}
        data-tour-anchor="stats"
        className="relative w-full flex-shrink-0 outline-none active:opacity-95 transition-opacity"
        style={{ height: "31%" }}
      >
        {/* Header en haut : greeting + avatar (remonté un peu pour dégager le label) */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5" style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}>
          <div className="text-left">
            <p className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: "#7C6BAA" }}>{greeting}</p>
            <h1 className="text-xl font-light mt-0.5" style={{ color: "#1A1535" }}>
              {user?.pseudo ?? user?.name ?? ""}
            </h1>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <NotificationBell side="bottom" />
          </div>
        </div>

        {/* Bloc bas : label au-dessus + 3 cadrans, ancré en bas (assez d'air, rien de coupé) */}
        <div className="absolute bottom-7 left-0 right-0 px-5 flex flex-col items-center gap-2.5">
          {/* Label compact (une seule ligne) : indique clairement le tap */}
          <motion.div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(212,192,255,0.6)", boxShadow: "0 2px 10px rgba(167,139,250,0.18)" }}
            animate={{ y: [0, 1.5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
            <Dumbbell size={11} strokeWidth={2} style={{ color: "#A78BFA" }} />
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#6B5BA0" }}>Séances &amp; repas recommandés</span>
            <ChevronDown size={12} strokeWidth={2.5} style={{ color: "#A78BFA" }} />
          </motion.div>

          {/* 3 mini-cadrans : Score · Série · Séances */}
          <div className="w-full grid grid-cols-3 gap-2">
          {[
            { label: "Score",   icon: Sparkles, value: liveStats.loaded && liveStats.score > 0 ? `${liveStats.score}` : "—", unit: liveStats.score > 0 ? "/100" : "" },
            { label: "Série",   icon: Flame,    value: liveStats.loaded && liveStats.streak > 0 ? `${liveStats.streak}` : "—", unit: liveStats.streak > 0 ? (liveStats.streak > 1 ? "jours" : "jour") : "" },
            { label: "Séances", icon: Dumbbell, value: liveStats.loaded ? `${liveStats.sessionsWeek}` : "—", unit: "/ sem" },
          ].map((s, i) => {
            const Icon = s.icon;
            const isHero = i === 1; // Série mis en avant avec la DA du site
            const isScore = i === 0;
            const bumping = isScore && scoreBump != null;
            return (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, scale: bumping ? [isHero ? 1.07 : 1, 1.22, isHero ? 1.07 : 1] : (isHero ? 1.07 : 1) }}
                transition={bumping ? { duration: 0.6, ease: "easeOut" } : { delay: 0.15 + i * 0.05, type: "spring", bounce: 0.35 }}
                className="rounded-2xl px-2 py-2 flex flex-col items-center gap-1 relative"
                style={isHero
                  ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", border: "1px solid rgba(255,255,255,0.95)", boxShadow: "0 10px 28px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.95)", zIndex: 2 }
                  : { background: bumping ? "linear-gradient(135deg, rgba(212,192,255,0.85) 0%, rgba(245,230,163,0.7) 100%)" : "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: bumping ? "0 0 22px rgba(167,139,250,0.6), 0 6px 18px rgba(212,168,67,0.35)" : "0 4px 16px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)", zIndex: bumping ? 3 : 1, transition: "box-shadow 0.4s, background 0.4s" }}>

                {/* +N qui s'envole quand le score monte */}
                <AnimatePresence>
                  {bumping && (
                    <motion.div
                      key="bump"
                      initial={{ opacity: 0, y: 4, scale: 0.6 }}
                      animate={{ opacity: 1, y: -26, scale: 1 }}
                      exit={{ opacity: 0, y: -40 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute left-1/2 -translate-x-1/2 -top-1 pointer-events-none px-2 py-0.5 rounded-full text-[11px] font-extrabold"
                      style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", color: "#fff", boxShadow: "0 4px 12px rgba(167,139,250,0.5)", whiteSpace: "nowrap" }}
                    >
                      +{scoreBump}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: isHero ? "rgba(255,255,255,0.6)" : "linear-gradient(135deg, rgba(240,235,255,0.95) 0%, rgba(255,251,240,0.95) 100%)" }}>
                  {isHero ? (
                    <motion.div
                      style={{ display: "flex" }}
                      animate={{
                        scale: [1, 1.15, 1],
                        filter: [
                          "drop-shadow(0 0 2px rgba(240,180,41,0.7))",
                          "drop-shadow(0 0 7px rgba(240,180,41,1)) drop-shadow(0 0 13px rgba(232,140,20,0.75))",
                          "drop-shadow(0 0 2px rgba(240,180,41,0.7))",
                        ],
                      }}
                      transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Icon size={15} strokeWidth={2} style={{ color: "#E8A11E" }} fill="#F0B429" />
                    </motion.div>
                  ) : (
                    <Icon size={13} strokeWidth={1.5}
                      style={{ color: bumping ? "#D4A843" : "#A78BFA", filter: bumping ? "drop-shadow(0 0 6px rgba(212,168,67,0.9))" : "none", transition: "color 0.3s" }}
                      fill="none" />
                  )}
                </div>
                <p className="text-[10px] font-bold tracking-widest uppercase leading-none" style={{ color: isHero ? "#2D3748" : "#A0AEC0" }}>{s.label}</p>
                <div className="flex items-baseline gap-0.5">
                  <span className={`${isHero ? "text-lg font-extrabold" : "text-base font-semibold"} leading-none`} style={{ color: "#2D3748" }}>{s.value}</span>
                  {s.unit && <span className="text-[10px] font-medium" style={{ color: isHero ? "#5A4A8A" : "#A0AEC0" }}>{s.unit}</span>}
                </div>
              </motion.div>
            );
          })}
          </div>
        </div>

        {/* Croissant SVG (courbe douce qui s'incurve vers le bas) — étendu jusqu'à la sidebar sur desktop */}
        <svg className="absolute -bottom-px left-0 w-full md:-left-[88px] md:w-[calc(100%+88px)] pointer-events-none" viewBox="0 0 100 6" preserveAspectRatio="none" style={{ height: "20px" }}>
          <defs>
            <linearGradient id="topCrescentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(212,192,255,0.5)" />
              <stop offset="100%" stopColor="rgba(245,230,163,0.0)" />
            </linearGradient>
          </defs>
          <path d="M 0 0 Q 50 10 100 0 L 100 6 L 0 6 Z" fill="url(#topCrescentGrad)" />
        </svg>

      </button>

      {/* ────────────────── CENTRE : HomeOrb ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 relative pb-[240px] md:pb-[34dvh]">
        <div data-tour-anchor="orb" style={{ display: "inline-block", lineHeight: 0 }}>
          <HomeOrb
            onTap={() => setShowChat(true)}
            onTranscript={handleVoiceTranscript}
            size={isMobile ? 138 : 176}
          />
        </div>
      </div>

      {/* ────────────────── BOTTOM : VOTD carte large + croissant — AU-DESSUS de la nav ─ */}
      <button
        type="button"
        onClick={() => setShowDailyDrawer(true)}
        className="absolute left-0 right-0 outline-none active:opacity-95 transition-opacity md:bottom-2 h-[146px] md:h-[32dvh]"
        style={{ bottom: "calc(70px + env(safe-area-inset-bottom))" }}
        aria-label="Ouvrir Du Jour"
      >
        {/* Croissant SVG (courbe douce qui s'incurve vers le haut) — étendu jusqu'à la sidebar sur desktop */}
        <svg className="absolute -top-px left-0 w-full md:-left-[88px] md:w-[calc(100%+88px)] pointer-events-none" viewBox="0 0 100 6" preserveAspectRatio="none" style={{ height: "22px" }}>
          <defs>
            <linearGradient id="bottomCrescentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(245,230,163,0.0)" />
              <stop offset="100%" stopColor="rgba(212,192,255,0.5)" />
            </linearGradient>
          </defs>
          <path d="M 0 6 Q 50 -4 100 6 L 100 0 L 0 0 Z" fill="url(#bottomCrescentGrad)" />
        </svg>

        {/* Hint chevron */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <ChevronUp size={14} strokeWidth={1.5} style={{ color: "rgba(167,139,250,0.55)" }} />
        </div>

        {/* VOTD carte horizontale large — vidéo à gauche + texte à droite (centrée verticalement dans la demi-lune) */}
        <div className="absolute inset-x-4 top-[9dvh] bottom-0 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", bounce: 0.3 }}
            data-tour-anchor="votd"
            className="relative w-full pointer-events-none"
            style={{ maxWidth: 600 }}>

            {/* ✦ Barre LED le long du contour — masque "border-only", aucun débordement */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                zIndex: 5,
                borderRadius: 28,
                padding: 2, // épaisseur de la barre lumineuse
                WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                maskComposite: "exclude",
              } as React.CSSProperties}
            >
              {/* Contour de marque FIXE (dégradé doux, couvre tout le rectangle) */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(120deg, #A78BFA 0%, #C4A8FF 30%, #F5E6A3 65%, #FFB088 100%)", opacity: 0.55 }}
              />
              {/* UN seul reflet lumineux qui glisse autour, doucement */}
              <motion.div
                className="absolute"
                style={{
                  top: "-50%", left: "-50%", width: "200%", height: "200%",
                  background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(255,255,255,0.85) 340deg, rgba(212,192,255,0.5) 352deg, transparent 360deg)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* La carte (au-dessus de l'anneau) */}
            <div
            className="relative flex items-stretch gap-4 p-2.5 rounded-[28px] w-full overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 12px 36px rgba(167,139,250,0.22), inset 0 1px 0 rgba(255,255,255,0.95)",
            }}>

            {/* Reflet brillant qui balaie la carte (shimmer) */}
            <motion.div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                width: "45%",
                background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                filter: "blur(2px)",
              }}
              animate={{ left: ["-50%", "140%"] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
            />
            {/* Vidéo verticale à gauche — plus grande */}
            <div className="relative overflow-hidden rounded-2xl flex-shrink-0"
              style={{
                width: isMobile ? 62 : 118, height: isMobile ? 98 : 182,
                background: "linear-gradient(135deg, #1A1A2E 0%, #2D2A4E 100%)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
              }}>
              {dailyVideoUrl ? (
                <video
                  src={dailyVideoUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="auto"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>
                    <Play size={24} strokeWidth={2} style={{ color: "#FFFFFF", marginLeft: 3 }} fill="#FFFFFF" />
                  </div>
                </div>
              )}
              {/* Indicateur LIVE en haut */}
              {dailyVideoUrl && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FC8181", boxShadow: "0 0 5px rgba(252,129,129,0.9)" }} />
                  <span className="text-[8px] font-bold tracking-widest text-white">LIVE</span>
                </div>
              )}
              {/* Petit bouton play overlay quand vidéo */}
              {dailyVideoUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(2px)" }}>
                    <Play size={18} strokeWidth={2} style={{ color: "#fff", marginLeft: 2 }} fill="#fff" />
                  </div>
                </div>
              )}
              {/* Gradient noir bas pour lisibilité éventuelle */}
              <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
                style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.45))" }} />
            </div>

            {/* Texte à droite */}
            <div className="flex-1 min-w-0 flex flex-col justify-center py-1 pr-2">
              <p className="text-[10px] font-bold tracking-widest uppercase leading-none mb-1" style={{ color: "#A78BFA" }}>
                Du jour
              </p>
              <p className="text-xl font-light leading-tight" style={{ color: "#1A1535" }}>
                Vidéo · Séance · Perf
              </p>
              <p className="text-[11px] font-light mt-1.5 leading-snug" style={{ color: "#8B82A8" }}>
                Tap pour explorer ton contenu
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)", boxShadow: "0 2px 8px rgba(167,139,250,0.25)" }}>
                  <Play size={11} strokeWidth={2.5} style={{ color: "#2D3748", marginLeft: 0.5 }} fill="#2D3748" />
                  <span className="text-[12px] font-bold" style={{ color: "#2D3748" }}>Voir</span>
                </div>
                <ChevronUp size={13} strokeWidth={2} style={{ color: "rgba(167,139,250,0.7)" }} />
              </div>
            </div>
            </div>{/* fin carte intérieure */}
          </motion.div>
        </div>
      </button>

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
              className="fixed inset-0 md:left-[88px] z-[55]" style={{ background: "rgba(240,235,255,0.5)", backdropFilter: "blur(10px)" }} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-2 md:left-[96px] bottom-2 z-[60] overflow-hidden rounded-3xl"
              style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
              <button type="button" onClick={() => setShowChat(false)} aria-label="Fermer"
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(167,139,250,0.15)", backdropFilter: "blur(8px)" }}>
                <X size={16} strokeWidth={2} style={{ color: "#A78BFA" }} />
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
              .then((c) => setLiveStats(prev => ({ ...prev, score: c.score, calories: c.calories, loaded: true })))
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
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 100%)" }}>
      <motion.div
        className="w-10 h-10 rounded-full border-2"
        style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
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