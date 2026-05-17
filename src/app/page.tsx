"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { MessageCircle, BarChart3, Flame, Zap, Utensils, Sparkles, X, LogIn, Check, Moon, ArrowRight, Dumbbell, Brain, Target, Activity, User2, Settings, LogOut, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VocalOrb from "@/components/VocalOrb";
import AIChatPanel, { initialChatMessages, type Message } from "@/components/AIChatPanel";
import StatDetailModal from "@/components/StatDetailModal";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import WeeklyProgramme from "@/components/WeeklyProgramme";
import { stats } from "@/data/statsData";
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

  // Upsert dans daily_stats
  await supabase.from("daily_stats").upsert({
    user_id: userId,
    date: today,
    score,
    calories,
    burned,
    streak: 1,
  }, { onConflict: "user_id,date" });

  return { score, calories, burned, steps: 0, sleepHours: 0, streak: 1 };
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
type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const mealTypesList: { id: MealType; label: string; emoji: string }[] = [
  { id: "breakfast", label: "Petit-déj", emoji: "☀️" },
  { id: "lunch",     label: "Déjeuner",  emoji: "🍽️" },
  { id: "dinner",    label: "Dîner",     emoji: "🌙" },
  { id: "snack",     label: "Collation", emoji: "🍎" },
];
function RepasModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [type, setType] = useState<MealType>("lunch");
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
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { if (name.trim()) onSave(name.trim()); }}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer transition-all duration-200"
          style={{ background: name.trim() ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "rgba(220,220,220,0.45)", color: name.trim() ? "#2D3748" : "#A0AEC0", boxShadow: name.trim() ? "inset 0 1px 0 rgba(255,255,255,0.9),0 4px 16px rgba(167,139,250,0.2)" : "none" }}>
          Enregistrer le repas
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
        className="relative z-20 flex items-center justify-between px-6 md:px-10 py-5"
      >
        <span className="text-2xl font-extralight tracking-[0.15em]" style={{ color: "#2D3748" }}>
          Aura
        </span>
        <div className="flex items-center gap-3">
          <Link href="/auth?mode=login">
            <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
              className="px-4 py-2.5 rounded-2xl text-sm font-medium cursor-pointer"
              style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.85)", color: "#4A5568", boxShadow: "0 2px 12px rgba(167,139,250,0.1)" }}>
              Se connecter
            </motion.div>
          </Link>
          <Link href="/auth?mode=signup">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}
              className="relative px-5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
              style={{ background: "linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)", color: "#fff", boxShadow: "0 6px 24px rgba(167,139,250,0.45), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.3) 50%,transparent 65%)" }}
                animate={{ x: ["-120%","120%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.5 }} />
              <span className="relative z-10 flex items-center gap-1.5">
                Commencer gratuitement
                <ArrowRight size={14} strokeWidth={2.5} />
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
function Dashboard() {
  const now = new Date();
  const hour = now.getHours();
  const { user, logout } = useAuth();
  const router = useRouter();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const [mobilePanel, setMobilePanel] = useState<"chat"|"stats"|null>(null);
  const [showRepas, setShowRepas] = useState(false);
  const [showObjectif, setShowObjectif] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [selectedStat, setSelectedStat] = useState<StatData | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>(initialChatMessages);
  const [aiTyping, setAiTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userContext, setUserContext] = useState<OnboardingData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [liveStats, setLiveStats] = useState({ score: 0, calories: 0, steps: 0, sleepHours: 0, streak: 0, loaded: false });
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          setLiveStats({
            score:      data.score       ?? 0,
            calories:   data.calories    ?? 0,
            steps:      data.steps       ?? 0,
            sleepHours: data.sleep_hours ?? 0,
            streak:     data.streak      ?? 0,
            loaded:     true,
          });
        } else {
          // Score absent ou nul — calcul dynamique
          try {
            const computed = await computeAndSaveScore(user.id, supabase);
            setLiveStats({
              score:      computed.score,
              calories:   computed.calories,
              steps:      computed.steps,
              sleepHours: computed.sleepHours,
              streak:     computed.streak,
              loaded:     true,
            });
          } catch {
            setLiveStats(prev => ({ ...prev, loaded: true }));
          }
        }
      });
  }, [user]);

  // Charge le contexte onboarding depuis localStorage (essaie plusieurs clés)
  useEffect(() => {
    if (!user) return;
    const keys = [
      `aura_onboarding_${user.pseudo}`,
      `aura_onboarding_${user.name}`,
      `aura_onboarding_${user.email?.split("@")[0]}`,
    ].filter(Boolean);
    let found = false;
    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserContext(parsed);
          found = true;
          break;
        } catch { /* ignore */ }
      }
    }
    if (!found) {
      const t = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(t);
    }
  }, [user]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    if (!user) return;
    const key = `aura_onboarding_${user.pseudo ?? user.name}`;
    localStorage.setItem(key, JSON.stringify(data));
    setUserContext(data);
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    if (!user) return;
    const key = `aura_onboarding_${user.pseudo ?? user.name}`;
    const skipped = { skipped: true };
    localStorage.setItem(key, JSON.stringify(skipped));
    setUserContext(skipped as unknown as OnboardingData);
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
    const cacheKey = getProgrammeCacheKey();
    if (!cacheKey) return null;
    try {
      // Nettoyage : retire les backticks markdown éventuels
      const clean = rawJson.replace(/```json?/g, "").replace(/```/g, "").trim();
      const update = JSON.parse(clean);
      if (!update.jour) return null;
      const raw = localStorage.getItem(cacheKey);
      const programme = raw ? JSON.parse(raw) : { semaine: [] };
      if (!Array.isArray(programme.semaine)) programme.semaine = [];
      const idx = programme.semaine.findIndex(
        (d: { jour: string }) => d.jour?.toLowerCase() === update.jour.toLowerCase()
      );
      if (idx >= 0) {
        programme.semaine[idx] = update;
      } else {
        programme.semaine.push(update);
      }
      localStorage.setItem(cacheKey, JSON.stringify(programme));
      window.dispatchEvent(new CustomEvent("programme-updated"));
      return `${update.jour} : ${update.titre || update.type}`;
    } catch (e) {
      console.error("Programme update parse error", e);
      return null;
    }
  }, [getProgrammeCacheKey]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const n = new Date();
    const time = `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;

    // Ajoute le message utilisateur
    const userMsg: Message = { id: Date.now(), from: "me", text, time };
    const newMessages = [...chatMessagesRef.current, userMsg];
    chatMessagesRef.current = newMessages;
    setChatMessages(newMessages);
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          userContext,
          pseudo: user?.pseudo ?? user?.name ?? "",
          liveStats: liveStats.loaded ? {
            calories: liveStats.calories || undefined,
            steps: liveStats.steps || undefined,
            sleepHours: liveStats.sleepHours || undefined,
            score: liveStats.score || undefined,
            streak: liveStats.streak || undefined,
          } : null,
          programme: programmeText,
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
    } catch {
      setAiTyping(false);
      const errMsg: Message = { id: Date.now() + 1, from: "ai", text: "Désolé, une erreur est survenue. Réessaie dans quelques secondes ✨", time };
      chatMessagesRef.current = [...chatMessagesRef.current, errMsg];
      setChatMessages(chatMessagesRef.current);
    }
  }, [user, userContext, liveStats, getProgrammeCacheKey, applyProgrammeUpdate]);

  const handleVoiceTranscript = useCallback((text: string) => {
    sendMessage(text);
    if (typeof window !== "undefined" && window.innerWidth < 768) setMobilePanel("chat");
  }, [sendMessage]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const quickActionHandlers = [
    () => { setMobilePanel("chat"); sendMessage("Génère-moi une séance d'entraînement pour aujourd'hui selon mon profil et mes objectifs"); },
    () => { setMobilePanel("chat"); sendMessage("Propose-moi un repas équilibré pour ce soir selon mon régime et mes objectifs caloriques"); },
    () => { setMobilePanel("chat"); sendMessage("Aide-moi à définir un nouvel objectif fitness motivant et réaliste pour les 4 prochaines semaines"); },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* ── Header ── */}
      <motion.header className="relative z-10 flex items-center justify-between px-5 pt-7 pb-2 md:px-8 md:pt-9 flex-shrink-0"
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <div>
          <motion.p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#A0AEC0" }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>{greeting}</motion.p>
          <motion.h1 className="text-2xl md:text-3xl font-extralight mt-0.5" style={{ color: "#2D3748" }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            {user ? `${user.pseudo ?? user.name}, prêt aujourd'hui ?` : "Comment vous sentez-vous ?"}
          </motion.h1>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Avatar + menu */}
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", bounce: 0.4 }} ref={menuRef} style={{ position: "relative" }}>
            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  onClick={() => setShowMenu(v => !v)}
                  className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer select-none"
                  style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", boxShadow: showMenu ? "0 0 0 2.5px rgba(167,139,250,0.5),0 4px 16px rgba(167,139,250,0.3)" : "inset 0 1px 0 rgba(255,255,255,0.9),0 4px 16px 0 rgba(167,139,250,0.3)", transition: "box-shadow 0.2s" }}>
                  <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{(user.pseudo ?? user.name ?? "?")[0]?.toUpperCase()}</span>
                </motion.div>
                {typeof window !== "undefined" && createPortal(
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div ref={dropdownRef} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        style={{ position: "fixed", right: 16, top: 70, zIndex: 99999, minWidth: 210 }}>
                        <div style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 16px 56px rgba(167,139,250,0.25),0 4px 16px rgba(0,0,0,0.12)" }}>
                          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(167,139,250,0.1)" }}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
                                <span className="text-sm font-bold" style={{ color: "#2D3748" }}>{(user.pseudo ?? user.name ?? "?")[0]?.toUpperCase()}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{user.pseudo ?? user.name}</p>
                                <p className="text-[11px] truncate" style={{ color: "#A0AEC0" }}>{user.email}</p>
                              </div>
                            </div>
                          </div>
                          {[
                            { icon: User2,    label: "Mon profil", action: () => { router.push(user?.pseudo ? `/profil/${user.pseudo}` : "/profil"); setShowMenu(false); } },
                            { icon: Settings, label: "Réglages",   action: () => { router.push("/profil"); setShowMenu(false); } },
                          ].map(({ icon: Icon, label, action }) => (
                            <button key={label} onClick={action}
                              className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-purple-50"
                              style={{ display: "flex", width: "100%", background: "none", border: "none", outline: "none", cursor: "pointer" }}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)" }}>
                                  <Icon size={13} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                                </div>
                                <span className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</span>
                              </div>
                              <ChevronRight size={12} strokeWidth={2} style={{ color: "#D1D5DB" }} />
                            </button>
                          ))}
                          <div style={{ height: 1, margin: "4px 12px", backgroundColor: "rgba(167,139,250,0.1)" }} />
                          <button onClick={async () => { setShowMenu(false); await logout(); router.push("/auth"); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 mb-1 transition-colors hover:bg-red-50"
                            style={{ display: "flex", width: "100%", background: "none", border: "none", outline: "none", cursor: "pointer" }}>
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(252,129,129,0.1)" }}>
                              <LogOut size={13} strokeWidth={1.5} style={{ color: "#FC8181" }} />
                            </div>
                            <span className="text-sm font-medium" style={{ color: "#FC8181" }}>Déconnexion</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
              </>
            ) : (
              <Link href="/auth">
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  className="lg-bicolor lg-highlight relative flex items-center gap-1.5 px-3 py-2 rounded-full cursor-pointer">
                  <LogIn size={12} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>Connexion</span>
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* ── DESKTOP : 3 colonnes ── */}
      <div className="hidden md:grid relative z-10 grid-cols-[300px_1fr_300px] gap-4 px-5 pb-5 pt-3" style={{ height: "calc(100vh - 90px)" }}>

        {/* ─ Gauche : Chat IA ─ */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="min-h-0" style={{ height: "100%" }}>
          <AIChatPanel messages={chatMessages} aiTyping={aiTyping} onSend={sendMessage} />
        </motion.div>

        {/* ─ Centre : VocalOrb + Score + Quick actions ─ */}
        <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center justify-center gap-5 py-4" style={{ overflow: "visible" }}>

          {/* VocalOrb — héros de la page */}
          <VocalOrb onTranscript={handleVoiceTranscript} />

        </motion.div>

        {/* ─ Droite : Stats + Programme ─ */}
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col min-h-0 overflow-y-auto rounded-3xl p-4 gap-3"
          style={{ height: "100%", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(212,192,255,0.25)", boxShadow: "0 8px 32px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,1)" }}>

          {/* ── Aujourd'hui ── */}
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase flex-shrink-0" style={{ color: "#A0AEC0" }}>Aujourd'hui</p>

          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            {[
              { label: "Calories", value: liveStats.loaded && liveStats.calories > 0 ? `${liveStats.calories}` : "—",  unit: "kcal",     accent: "#A78BFA", icon: "🔥" },
              { label: "Pas",      value: liveStats.loaded && liveStats.steps > 0 ? (liveStats.steps >= 1000 ? `${(liveStats.steps/1000).toFixed(1)}k` : `${liveStats.steps}`) : "—", unit: "/10k", accent: "#D4A843", icon: "👟" },
              { label: "Sommeil",  value: liveStats.loaded && liveStats.sleepHours > 0 ? `${Math.floor(liveStats.sleepHours)}h${String(Math.round((liveStats.sleepHours%1)*60)).padStart(2,"0")}` : "—", unit: "", accent: "#A78BFA", icon: "😴" },
            ].map((s, i) => {
              const matchStat = stats.find((st) => st.label === s.label);
              return (
                <motion.div key={s.label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07, type: "spring", bounce: 0.3 }}
                  whileHover={{ y: -2 }} whileTap={matchStat ? { scale: 0.96 } : {}}
                  onClick={() => matchStat && setSelectedStat(matchStat)}
                  className={`rounded-2xl p-3 flex flex-col gap-1.5 ${matchStat ? "cursor-pointer" : "cursor-default"}`}
                  style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))`, border: "1px solid rgba(212,192,255,0.2)", boxShadow: "0 2px 8px rgba(167,139,250,0.06)" }}>
                  <span className="text-base leading-none">{s.icon}</span>
                  <p className="text-[8px] font-semibold tracking-widest uppercase leading-none" style={{ color: "#A0AEC0" }}>{s.label}</p>
                  <p className="text-sm font-semibold leading-none" style={{ color: "#2D3748" }}>
                    {s.value}
                    {s.unit && <span className="text-[9px] font-normal ml-0.5" style={{ color: "#A0AEC0" }}>{s.unit}</span>}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Séparateur */}
          <div className="h-px flex-shrink-0" style={{ background: "rgba(167,139,250,0.1)" }} />

          {/* ── Programme ── */}
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase flex-shrink-0" style={{ color: "#A0AEC0" }}>Programme</p>
          {user && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <WeeklyProgramme />
            </div>
          )}
        </motion.div>
      </div>

      {/* ── MOBILE ── */}
      <div className="md:hidden flex flex-col relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="px-5 pb-2">
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {[
              { label: "Score",     value: liveStats.loaded && liveStats.score > 0 ? `${liveStats.score}` : "—",  unit: liveStats.score > 0 ? "/100" : "", bg: "lg-bicolor",   statKey: "Score" },
              { label: "Calories",  value: liveStats.loaded && liveStats.calories > 0 ? (liveStats.calories >= 1000 ? `${(liveStats.calories/1000).toFixed(1)}k` : `${liveStats.calories}`) : "—", unit: liveStats.calories > 0 ? "kcal" : "", bg: "lg-rose", statKey: "Calories" },
              { label: "Pas",       value: liveStats.loaded && liveStats.steps > 0 ? (liveStats.steps >= 1000 ? `${(liveStats.steps/1000).toFixed(1)}k` : `${liveStats.steps}`) : "—", unit: "", bg: "lg-turquoise", statKey: "Pas" },
              { label: "Sommeil",   value: liveStats.loaded && liveStats.sleepHours > 0 ? `${Math.floor(liveStats.sleepHours)}h${String(Math.round((liveStats.sleepHours%1)*60)).padStart(2,"0")}` : "—", unit: "", bg: "lg-bicolor", statKey: "Sommeil" },
            ].map((s, i) => {
              const matchStat = stats.find((st) => st.label === s.statKey);
              return (
                <motion.div key={s.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.06, type: "spring", bounce: 0.35 }}
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={matchStat ? { scale: 0.97 } : {}}
                  onClick={() => matchStat && setSelectedStat(matchStat)}
                  className={`${s.bg} lg-highlight relative rounded-2xl px-4 py-3 flex-shrink-0 min-w-[100px] ${matchStat ? "cursor-pointer" : "cursor-default"}`}>
                  <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{s.label}</p>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-xl font-semibold" style={{ color: "#2D3748" }}>{s.value}</span>
                    {s.unit && <span className="text-[10px] font-medium" style={{ color: "#718096" }}>{s.unit}</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }} className="flex-1 flex items-center justify-center px-6 py-6">
          <VocalOrb onTranscript={handleVoiceTranscript} />
        </motion.div>
        <div className="px-5 pb-4 grid grid-cols-2 gap-3">
          {[
            { key: "chat" as const, icon: MessageCircle, label: "Chat IA",   color: "#A78BFA", bg: "lg-rose" },
            { key: "stats" as const, icon: BarChart3,    label: "Stats & Programme", color: "#D4A843", bg: "lg-turquoise" },
          ].map(({ key, icon: Icon, label, color, bg }, i) => (
            <motion.button key={key} onClick={() => setMobilePanel(key)}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, type: "spring", bounce: 0.35 }}
              whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}
              className={`${bg} lg-highlight relative rounded-2xl py-3 px-4 flex items-center justify-center gap-2 cursor-pointer`}>
              <Icon size={15} strokeWidth={1.5} style={{ color }} />
              <span className="text-xs font-medium" style={{ color: "#2D3748" }}>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobilePanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobilePanel(null)}
              className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(240,235,255,0.4)", backdropFilter: "blur(8px)" }} />
            <motion.div initial={{ y: "100%", scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-2 bottom-2 top-20 z-50 md:hidden overflow-y-auto">
              {mobilePanel === "chat" ? (
                <AIChatPanel messages={chatMessages} aiTyping={aiTyping} onSend={sendMessage} />
              ) : (
                <div className="h-full rounded-3xl overflow-y-auto p-4 flex flex-col gap-3"
                  style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(167,139,250,0.15)" }}>
                  <p className="text-[10px] font-semibold tracking-[0.18em] uppercase px-1 pt-1" style={{ color: "#A0AEC0" }}>Aujourd'hui</p>
                  {[
                    { label: "Calories",   value: liveStats.loaded && liveStats.calories > 0 ? `${liveStats.calories}` : "—",  unit: "kcal",     bg: "lg-rose",      statKey: "Calories" },
                    { label: "Pas",        value: liveStats.loaded && liveStats.steps > 0 ? (liveStats.steps >= 1000 ? `${(liveStats.steps/1000).toFixed(1)}k` : `${liveStats.steps}`) : "—", unit: "/ 10 000", bg: "lg-bicolor", statKey: "Pas" },
                    { label: "Sommeil",    value: liveStats.loaded && liveStats.sleepHours > 0 ? `${Math.floor(liveStats.sleepHours)}h${String(Math.round((liveStats.sleepHours%1)*60)).padStart(2,"0")}` : "—", unit: "", bg: "lg-turquoise", statKey: "Sommeil" },
                  ].map((s) => {
                    const matchStat = stats.find((st) => st.label === s.statKey);
                    return (
                      <div key={s.label}
                        onClick={() => matchStat && setSelectedStat(matchStat)}
                        className={`${s.bg} lg-highlight rounded-2xl px-4 py-3 flex items-center justify-between ${matchStat ? "cursor-pointer" : ""}`}>
                        <div>
                          <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{s.label}</p>
                          <p className="text-base font-semibold mt-0.5" style={{ color: "#2D3748" }}>{s.value}
                            {s.unit && <span className="text-[11px] font-normal ml-1" style={{ color: "#718096" }}>{s.unit}</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="h-px mx-1 rounded-full" style={{ background: "rgba(167,139,250,0.12)" }} />
                  <p className="text-[10px] font-semibold tracking-[0.18em] uppercase px-1" style={{ color: "#A0AEC0" }}>Programme</p>
                  {user && <WeeklyProgramme />}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRepas && <RepasModal key="repas" onClose={() => setShowRepas(false)} onSave={(n) => { setShowRepas(false); showToast(`${n} enregistré ✓`); }} />}
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

/* ─── Page principale ─── */
export default function HomePage() {
  const { user, isLoading, justLoggedIn, isNewUser, clearWelcome } = useAuth();
  // Affiche un spinner pendant le chargement de la session (évite la page blanche)
  if (isLoading) return <LoadingSpinner />;
  return (
    <>
      <AnimatePresence>
        {justLoggedIn && user && (
          <WelcomeBanner key="welcome" pseudo={user.pseudo} isNew={isNewUser} onDismiss={clearWelcome} />
        )}
      </AnimatePresence>
      {user ? <Dashboard /> : <LandingPage />}
    </>
  );
}
