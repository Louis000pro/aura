"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { MessageCircle, BarChart3, Flame, Zap, Utensils, Sparkles, X, LogIn, Check, Moon, ArrowRight, Dumbbell, Brain, Target, Activity, User2, Settings, LogOut, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VocalOrb from "@/components/VocalOrb";
import AIChatPanel, { initialChatMessages, type Message } from "@/components/AIChatPanel";
import StatsPanel from "@/components/StatsPanel";
import StatDetailModal from "@/components/StatDetailModal";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import { stats } from "@/data/statsData";
import type { StatData } from "@/data/statsData";
import { createClient } from "@/lib/supabase";

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

/* ─── Welcome Overlay (plein écran, 2–4 secondes aléatoires) ─── */
function WelcomeBanner({ pseudo, isNew, onDismiss }: { pseudo: string; isNew: boolean; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const duration = useRef(2000 + Math.floor(Math.random() * 2001));

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(0), 80);
    const t2 = setTimeout(onDismiss, duration.current);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: "rgba(240,235,255,0.8)", backdropFilter: "blur(28px)" }}
    >
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-5%", left: "-5%", width: 500, height: 500, background: "rgba(212,192,255,0.5)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.15,1], x: [-10,20,-10] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-5%", right: "-5%", width: 450, height: 450, background: "rgba(245,230,163,0.5)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.2,1], x: [10,-20,10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />

      {/* Particules de célébration */}
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div key={i} className="absolute rounded-full pointer-events-none"
          style={{ width: 6 + Math.random() * 8, height: 6 + Math.random() * 8, background: i % 2 === 0 ? "rgba(167,139,250,0.7)" : "rgba(212,168,67,0.6)", left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
          animate={{ y: [0, -(80 + Math.random() * 120), 0], x: [0, (Math.random() - 0.5) * 80, 0], opacity: [0, 0.9, 0], scale: [0, 1, 0] }}
          transition={{ duration: 1.8 + Math.random() * 1.5, delay: 0.1 + i * 0.12, repeat: Infinity, repeatDelay: 1.5 }} />
      ))}

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: -20 }}
        transition={{ type: "spring", damping: 18, stiffness: 240, delay: 0.06 }}
        className="relative z-10 flex flex-col items-center text-center px-8"
      >
        {/* Avatar pulsant */}
        <div className="relative mb-7">
          {[0,1,2].map((i) => (
            <motion.div key={i} className="absolute rounded-full"
              style={{ inset: -(12 + i * 14), border: `1px solid rgba(167,139,250,${0.35 - i * 0.1})` }}
              animate={{ scale: [1,1.12,1], opacity: [0.6,0.08,0.6] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.45 }} />
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.55, delay: 0.15 }}
            className="w-28 h-28 rounded-[2rem] flex items-center justify-center text-5xl font-bold"
            style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", color: "#2D3748", boxShadow: "0 16px 56px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            {(pseudo || "?")[0]?.toUpperCase()}
          </motion.div>
          {[0,1,2,3].map((i) => (
            <motion.div key={i} className="absolute pointer-events-none"
              style={{ left: `${[5,80,40,-10][i]}%`, top: `${[-8,-8,100,40][i]}%` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0,1.5,0], opacity: [0,1,0], y: i % 2 === 0 ? [-4,-22,-4] : [4,22,4] }}
              transition={{ duration: 1.5, delay: 0.3 + i * 0.2, repeat: Infinity, repeatDelay: 1 }}
            >
              <Sparkles size={13} style={{ color: i % 2 === 0 ? "#A78BFA" : "#D4A843" }} />
            </motion.div>
          ))}
        </div>

        <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="text-4xl font-extralight mb-2" style={{ color: "#2D3748" }}>
          {isNew ? "Bienvenue sur Aura !" : "Bon retour !"}
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="text-xl font-light mb-2" style={{ color: "#A78BFA" }}>
          @{pseudo || "toi"}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
          className="text-sm font-light" style={{ color: "#718096" }}>
          {isNew ? "Votre parcours commence maintenant ✦" : "Prêt à repousser vos limites ? 💪"}
        </motion.p>

        {/* Barre de progression durée variable */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-8 w-52 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(167,139,250,0.15)" }}>
          <div className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#A78BFA,#D4A843)", width: `${progress}%`, transition: progress === 0 ? `width ${duration.current}ms linear` : "none" }} />
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
      style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 32px rgba(167,139,250,0.2),inset 0 1px 0 rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}
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
        style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(167,139,250,0.15),inset 0 1px 0 rgba(255,255,255,0.95)" }}
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
        style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(212,168,67,0.12),inset 0 1px 0 rgba(255,255,255,0.95)" }}
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
    setParticles(Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: i < 20 ? 1.5 + Math.random() * 2 : i < 45 ? 3 + Math.random() * 5 : 7 + Math.random() * 12,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 7,
      opacity: i < 20 ? 0.85 : i < 45 ? 0.55 : 0.25,
    })));
  }, []);

  return (
    <div className="relative w-full min-h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 50%, #faf8ff 100%)" }}>

      {/* ── Grands blobs ambiants ── */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-20%", left: "-12%", width: 800, height: 800, background: "rgba(196,170,255,0.32)", filter: "blur(100px)" }}
        animate={{ scale: [1,1.15,1], x: [-25,40,-25], y: [-15,25,-15], borderRadius: ["60% 40% 30% 70%/60% 30% 70% 40%","30% 60% 70% 40%/50% 60% 30% 60%","60% 40% 30% 70%/60% 30% 70% 40%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-20%", right: "-12%", width: 750, height: 750, background: "rgba(245,220,130,0.3)", filter: "blur(100px)" }}
        animate={{ scale: [1,1.12,1], x: [25,-35,25], y: [20,-30,20], borderRadius: ["50% 60% 30% 60%/30% 60% 70% 40%","60% 30% 40% 60%/70% 40% 60% 30%","50% 60% 30% 60%/30% 60% 70% 40%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "20%", right: "8%", width: 420, height: 420, background: "rgba(167,139,250,0.18)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.3,1], y: [0,40,0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }} />

      {/* ── Particules ── */}
      {mounted && particles.map(({ id, x, y, size, delay, duration, opacity }) => (
        <motion.div key={id} className="absolute rounded-full pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: id % 3 === 0 ? `rgba(167,139,250,${opacity})` : id % 3 === 1 ? `rgba(212,168,67,${opacity})` : `rgba(212,192,255,${opacity * 0.8})` }}
          animate={{ y: ["-20px","20px","-20px"], x: ["-8px","8px","-8px"], opacity: [opacity * 0.15, opacity, opacity * 0.15], scale: [1,1.4,1] }}
          transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }} />
      ))}

      {/* ── Anneaux rotatifs ── */}
      {[700, 560, 420].map((size, i) => (
        <motion.div key={size} className="absolute pointer-events-none rounded-full"
          style={{ width: size, height: size, border: `1px solid rgba(${i % 2 === 0 ? "167,139,250" : "212,168,67"},${0.1 - i * 0.025})`, top: "50%", left: "50%", marginTop: -size/2, marginLeft: -size/2 }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 35 + i * 12, repeat: Infinity, ease: "linear" }} />
      ))}

      {/* ── Nav bar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between px-6 md:px-10 py-5"
      >
        <motion.span className="text-2xl font-extralight tracking-[0.15em]" style={{ color: "#2D3748" }}
          animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 4, repeat: Infinity }}>
          Aura
        </motion.span>
        <div className="flex items-center gap-3">
          <Link href="/auth?mode=login">
            <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
              className="px-4 py-2.5 rounded-2xl text-sm font-medium cursor-pointer"
              style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.85)", color: "#4A5568", boxShadow: "0 2px 12px rgba(167,139,250,0.1)" }}>
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
          style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 4px 20px rgba(167,139,250,0.12)" }}
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
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 16px 56px rgba(167,139,250,0.2), 0 4px 16px rgba(212,168,67,0.1), inset 0 1px 0 rgba(255,255,255,0.95)" }}
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
              style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 4px 18px rgba(167,139,250,0.07)", cursor: "default" }}
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
  const [liveStats, setLiveStats] = useState({ score: 91, calories: 1847, steps: 8234, sleepHours: 7.4, streak: 7 });
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
      .then(({ data, error }) => {
        if (!error && data) {
          setLiveStats({
            score:      data.score       ?? 91,
            calories:   data.calories    ?? 1847,
            steps:      data.steps       ?? 8234,
            sleepHours: data.sleep_hours ?? 7.4,
            streak:     data.streak      ?? 7,
          });
        }
      });
  }, [user]);

  // Charge le contexte onboarding depuis localStorage
  useEffect(() => {
    if (!user) return;
    const key = `aura_onboarding_${user.pseudo ?? user.name}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { setUserContext(JSON.parse(stored)); } catch { /* ignore */ }
    } else {
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

    // Historique pour l'API : exclut les 3 messages initiaux hardcodés
    const apiMessages = newMessages.slice(initialChatMessages.length).map((m) => ({
      role: m.from === "me" ? "user" as const : "assistant" as const,
      content: m.text,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          userContext,
          pseudo: user?.pseudo ?? user?.name ?? "",
        }),
      });

      if (!response.ok || !response.body) throw new Error("API error");

      setAiTyping(false);
      const aiMsgId = Date.now() + 1;
      const withAi = [...chatMessagesRef.current, { id: aiMsgId, from: "ai" as const, text: "", time }];
      chatMessagesRef.current = withAi;
      setChatMessages(withAi);

      // Stream les tokens au fur et à mesure
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setChatMessages((m) => {
          const updated = m.map((msg) => msg.id === aiMsgId ? { ...msg, text: msg.text + chunk } : msg);
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
  }, [user, userContext]);

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
      <div className="lg-blob absolute pointer-events-none" style={{ top: "3%", left: "6%", width: 320, height: 320, background: "rgba(212,192,255,0.55)" }} />
      <div className="lg-blob absolute pointer-events-none" style={{ bottom: "8%", right: "5%", width: 360, height: 360, background: "rgba(245,230,163,0.5)" }} />
      <div className="lg-blob absolute pointer-events-none" style={{ top: "42%", left: "48%", width: 240, height: 240, background: "rgba(240,235,255,0.6)" }} />

      <motion.header className="relative z-10 flex items-center justify-between px-6 pt-8 pb-2 md:px-10 md:pt-10 flex-shrink-0"
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <div>
          <motion.p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#A0AEC0" }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>{greeting}</motion.p>
          <motion.h1 className="text-2xl md:text-3xl font-extralight mt-1" style={{ color: "#2D3748" }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            {user ? `${user.pseudo ?? user.name}, prêt aujourd'hui ?` : "Comment vous sentez-vous ?"}
          </motion.h1>
        </div>
        <div className="flex items-center gap-3">
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, type: "spring", bounce: 0.4 }}
            className="lg-rose lg-highlight relative flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default">
            <Flame size={11} strokeWidth={2} style={{ color: "#A78BFA" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>{liveStats.streak} jours</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
            ref={menuRef} style={{ position: "relative" }}>
            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  onClick={() => setShowMenu(v => !v)}
                  className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer select-none"
                  style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", boxShadow: showMenu ? "0 0 0 2.5px rgba(167,139,250,0.5),0 4px 16px rgba(167,139,250,0.3)" : "inset 0 1px 0 rgba(255,255,255,0.9),0 4px 16px 0 rgba(167,139,250,0.3)", transition: "box-shadow 0.2s" }}>
                  <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{(user.pseudo ?? user.name ?? "?")[0]?.toUpperCase()}</span>
                </motion.div>

                {/* PORTAL — rendu direct dans <body>, hors de tout stacking context */}
                <AnimatePresence>
                  {showMenu && typeof window !== "undefined" && createPortal(
                    <motion.div
                      ref={dropdownRef}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      style={{ position: "fixed", right: 16, top: 70, zIndex: 99999, minWidth: 210, pointerEvents: "auto" }}>
                      <div style={{
                        backgroundColor: "#fff",
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid rgba(167,139,250,0.2)",
                        boxShadow: "0 16px 56px rgba(167,139,250,0.25),0 4px 16px rgba(0,0,0,0.12)",
                      }}>
                        {/* Infos utilisateur */}
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(167,139,250,0.1)" }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
                              <span className="text-sm font-bold" style={{ color: "#2D3748" }}>{(user.pseudo ?? user.name ?? "?")[0]?.toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{user.pseudo ?? user.name}</p>
                              <p className="text-[11px] truncate" style={{ color: "#A0AEC0" }}>{user.email}</p>
                            </div>
                          </div>
                        </div>

                        {[
                          { icon: User2, label: "Mon profil", action: () => { router.push(user?.pseudo ? `/profil/${user.pseudo}` : "/profil"); setShowMenu(false); } },
                          { icon: Settings, label: "Réglages",   action: () => { router.push("/profil"); setShowMenu(false); } },
                        ].map(({ icon: Icon, label, action }) => (
                          <button key={label} onClick={action}
                            className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-purple-50"
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

                        <button
                          onClick={async () => { setShowMenu(false); await logout(); router.push("/auth"); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 mb-1 cursor-pointer transition-colors hover:bg-red-50"
                          style={{ display: "flex", width: "100%", background: "none", border: "none", outline: "none", cursor: "pointer" }}>
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(252,129,129,0.1)" }}>
                            <LogOut size={13} strokeWidth={1.5} style={{ color: "#FC8181" }} />
                          </div>
                          <span className="text-sm font-medium" style={{ color: "#FC8181" }}>Déconnexion</span>
                        </button>
                      </div>
                    </motion.div>,
                    document.body
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link href="/auth">
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} className="lg-bicolor lg-highlight relative flex items-center gap-1.5 px-3 py-2 rounded-full cursor-pointer">
                  <LogIn size={12} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>Connexion</span>
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* DESKTOP 3-column */}
      <div className="hidden md:grid relative z-10 grid-cols-[320px_1fr_320px] gap-5 px-6 pb-6 pt-4" style={{ height: "calc(100vh - 96px)" }}>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }} className="min-h-0" style={{ height: "100%" }}>
          <AIChatPanel messages={chatMessages} aiTyping={aiTyping} onSend={sendMessage} />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }} className="flex flex-col items-center justify-center gap-7 overflow-y-auto py-4">
          <VocalOrb onTranscript={handleVoiceTranscript} />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="lg-surface lg-highlight relative rounded-3xl px-6 py-5 flex items-center gap-5 w-full max-w-sm">
            <ScoreRing score={liveStats.score} />
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>Score du jour</p>
              <p className="text-sm font-medium leading-snug" style={{ color: "#2D3748" }}>{liveStats.score >= 85 ? "Récupération excellente" : liveStats.score >= 65 ? "Forme correcte" : "Récupération en cours"}</p>
              <p className="text-xs font-light mt-0.5" style={{ color: "#718096" }}>{liveStats.score >= 85 ? "Idéal pour séance intensive" : "Intensité modérée conseillée"}</p>
            </div>
          </motion.div>
          <div className="flex gap-3 w-full max-w-sm">
            {quickActionsConfig.map(({ icon, label, color, bg }, i) => (
              <QuickActionCard key={label} icon={icon} label={label} color={color} bg={bg} index={i} onClick={quickActionHandlers[i]} />
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }} className="min-h-0" style={{ height: "100%" }}>
          <StatsPanel />
        </motion.div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden flex flex-col relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="px-6 pb-2">
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {[
              { label:"Score",    value:`${liveStats.score}`,   unit:"/100",  bg:"lg-bicolor" },
              { label:"Calories", value: liveStats.calories >= 1000 ? `${(liveStats.calories/1000).toFixed(1)}k` : `${liveStats.calories}`, unit:"kcal", bg:"lg-rose" },
              { label:"Pas",      value: liveStats.steps >= 1000 ? `${(liveStats.steps/1000).toFixed(1)}k` : `${liveStats.steps}`, unit:"", bg:"lg-turquoise" },
              { label:"Sommeil",  value:`${Math.floor(liveStats.sleepHours)}h${String(Math.round((liveStats.sleepHours%1)*60)).padStart(2,"0")}`, unit:"", bg:"lg-bicolor" },
            ].map((s,i) => {
              const matchStat = stats.find((st) => st.label === s.label);
              return (
                <motion.div key={s.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.06, type: "spring", bounce: 0.35 }}
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={matchStat ? { scale: 0.97 } : {}}
                  onClick={() => matchStat && setSelectedStat(matchStat)}
                  className={`${s.bg} lg-highlight relative rounded-2xl px-4 py-3 flex-shrink-0 min-w-[100px] ${matchStat ? "cursor-pointer" : "cursor-default"}`}>
                  <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{s.label}</p>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-xl font-semibold" style={{ color: "#2D3748" }}>{s.value}</span>
                    {s.unit && <span className="text-[10px] font-medium" style={{ color: "#718096" }}>{s.unit}</span>}
                  </div>
                  {matchStat && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: matchStat.iconColor, opacity: 0.6 }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }} className="flex-1 flex items-center justify-center px-6 py-6">
          <VocalOrb onTranscript={handleVoiceTranscript} />
        </motion.div>
        <div className="px-6 pb-3 flex gap-2">
          {quickActionsConfig.map(({ icon, label, color, bg }, i) => (
            <QuickActionCard key={label} icon={icon} label={label} color={color} bg={bg} index={i} onClick={quickActionHandlers[i]} />
          ))}
        </div>
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          {[{key:"chat" as const,icon:MessageCircle,label:"Chat IA",color:"#A78BFA",bg:"lg-rose"},{key:"stats" as const,icon:BarChart3,label:"Détails",color:"#D4A843",bg:"lg-turquoise"}].map(({key,icon:Icon,label,color,bg},i) => (
            <motion.button key={key} onClick={() => setMobilePanel(key)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, type: "spring", bounce: 0.35 }}
              whileHover={{ scale: 1.03, y: -2, transition: { duration: 0.15 } }} whileTap={{ scale: 0.96, transition: { duration: 0.08 } }}
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
              className="fixed inset-x-2 bottom-2 top-20 z-50 md:hidden">
              {mobilePanel === "chat" ? <AIChatPanel messages={chatMessages} aiTyping={aiTyping} onSend={sendMessage} /> : <StatsPanel />}
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
          <OnboardingModal
            key="onboarding"
            pseudo={user.pseudo ?? user.name ?? ""}
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page principale ─── */
export default function HomePage() {
  const { user, isLoading, justLoggedIn, isNewUser, clearWelcome } = useAuth();
  if (isLoading) return null;
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
