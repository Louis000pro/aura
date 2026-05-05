"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, BarChart3, Flame, Zap, Utensils, Sparkles, X, LogIn, Check, Moon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VocalOrb from "@/components/VocalOrb";
import AIChatPanel, { initialChatMessages, type Message } from "@/components/AIChatPanel";
import StatsPanel from "@/components/StatsPanel";
import { useAuth } from "@/context/AuthContext";

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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={strokeW} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#scoreGrad)" strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="text-2xl font-light leading-none" style={{ color: "#2D3748" }}
        >{score}</motion.span>
        <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: "#A0AEC0" }}>/100</span>
      </div>
    </div>
  );
}

/* ─── Welcome Overlay (plein écran, 2 secondes) ─── */
function WelcomeBanner({ name, isNew, onDismiss }: { name: string; isNew: boolean; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(0), 50);
    const t2 = setTimeout(onDismiss, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: "rgba(240,235,255,0.75)", backdropFilter: "blur(24px)" }}
    >
      {/* Blobs animés */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ top: "-5%", left: "-5%", width: 500, height: 500, background: "rgba(212,192,255,0.45)", filter: "blur(80px)" }}
        animate={{ scale: [1, 1.15, 1], x: [-10, 20, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-5%", right: "-5%", width: 450, height: 450, background: "rgba(245,230,163,0.45)", filter: "blur(80px)" }}
        animate={{ scale: [1, 1.2, 1], x: [10, -20, 10] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Contenu central */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: -16 }}
        transition={{ type: "spring", damping: 20, stiffness: 260, delay: 0.05 }}
        className="relative z-10 flex flex-col items-center text-center px-8"
      >
        {/* Avatar avec sparkles */}
        <div className="relative mb-6">
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                inset: -8 - i * 10,
                border: `1px solid rgba(167,139,250,${0.3 - i * 0.12})`,
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.55, delay: 0.15 }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-semibold"
            style={{
              background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
              color: "#2D3748",
              boxShadow: "0 12px 48px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            {name[0]?.toUpperCase()}
          </motion.div>

          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{ left: `${[10, 75, 45][i]}%`, top: `${[-5, -5, 90][i]}%` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0], y: i % 2 === 0 ? [-4, -18, -4] : [4, 18, 4] }}
              transition={{ duration: 1.4, delay: 0.25 + i * 0.18, repeat: Infinity, repeatDelay: 1.2 }}
            >
              <Sparkles size={11} style={{ color: i % 2 === 0 ? "#A78BFA" : "#D4A843" }} />
            </motion.div>
          ))}
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-3xl font-extralight mb-2"
          style={{ color: "#2D3748" }}
        >
          {isNew ? `Bienvenue sur Aura !` : `Bon retour !`}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-base font-light mb-1"
          style={{ color: "#718096" }}
        >
          {isNew ? `Votre parcours santé commence maintenant ✦` : `Prêt à battre vos records, ${name.split(" ")[0]} ? 🔥`}
        </motion.p>

        {/* Barre de progression 2s */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 w-48 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(167,139,250,0.15)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #A78BFA, #D4A843)",
              width: `${progress}%`,
              transition: progress === 0 ? "width 2s linear" : "none",
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Home Toast ─── */
function HomeToast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
      className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 8px 32px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
        whiteSpace: "nowrap",
      }}
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(240,235,255,0.4)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Nutrition</p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Ajouter un repas</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {mealTypesList.map(({ id, label, emoji }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.93 }}
              onClick={() => setType(id)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-2xl cursor-pointer transition-all duration-150"
              style={
                type === id
                  ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }
                  : { background: "rgba(240,235,255,0.5)" }
              }
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-[9px] font-semibold" style={{ color: type === id ? "#2D3748" : "#A0AEC0" }}>
                {label}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="mb-3">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>
            Aliment / Plat
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Poulet grillé, riz complet…"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{
              background: "rgba(240,235,255,0.5)",
              border: "1px solid rgba(212,192,255,0.6)",
              color: "#2D3748",
            }}
          />
        </div>

        <div className="mb-5">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>
            Calories (kcal)
          </label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="Ex : 450"
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{
              background: "rgba(240,235,255,0.5)",
              border: "1px solid rgba(212,192,255,0.6)",
              color: "#2D3748",
            }}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer transition-all duration-200"
          style={{
            background: name.trim()
              ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)"
              : "rgba(220,220,220,0.45)",
            color: name.trim() ? "#2D3748" : "#A0AEC0",
            boxShadow: name.trim() ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(167,139,250,0.2)" : "none",
          }}
        >
          Enregistrer le repas
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Objectif Modal ─── */
type GoalType = "workouts" | "calories" | "steps" | "sleep";
const goalTypesList: { id: GoalType; label: string; desc: string; unit: string; defaultVal: string; icon: React.ElementType; color: string }[] = [
  { id: "workouts", label: "Séances",  desc: "/ semaine", unit: "séances/sem", defaultVal: "4",     icon: Flame,    color: "#A78BFA" },
  { id: "calories", label: "Calories", desc: "/ jour",    unit: "kcal/jour",   defaultVal: "2000",  icon: Zap,      color: "#A78BFA" },
  { id: "steps",    label: "Pas",      desc: "/ jour",    unit: "pas/jour",    defaultVal: "10000", icon: BarChart3, color: "#D4A843" },
  { id: "sleep",    label: "Sommeil",  desc: "/ nuit",    unit: "h/nuit",      defaultVal: "8",     icon: Moon,     color: "#D4A843" },
];

function ObjectifModal({ onClose, onSave }: { onClose: () => void; onSave: (label: string) => void }) {
  const [type, setType] = useState<GoalType>("workouts");
  const [value, setValue] = useState("4");
  const selected = goalTypesList.find((g) => g.id === type)!;

  const handleTypeChange = (id: GoalType) => {
    setType(id);
    setValue(goalTypesList.find((g) => g.id === id)!.defaultVal);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(255,251,240,0.4)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(212,168,67,0.12), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Performance</p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Définir un objectif</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,251,240,0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {goalTypesList.map(({ id, label, desc, icon: Icon, color }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTypeChange(id)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-2xl cursor-pointer text-left transition-all duration-150"
              style={
                type === id
                  ? {
                      background: "linear-gradient(135deg, rgba(240,235,255,0.95) 0%, rgba(255,251,240,0.95) 100%)",
                      border: "1px solid rgba(255,255,255,0.8)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                    }
                  : { background: "rgba(240,235,255,0.45)", border: "1px solid transparent" }
              }
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: type === id ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)" }}
              >
                <Icon size={13} strokeWidth={1.5} style={{ color: type === id ? color : "#A0AEC0" }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: type === id ? "#2D3748" : "#A0AEC0" }}>{label}</p>
                <p className="text-[9px]" style={{ color: "#A0AEC0" }}>{desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mb-5">
          <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>
            Cible
          </label>
          <div className="relative">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-4 py-3 pr-28 rounded-2xl text-sm outline-none"
              style={{
                background: "rgba(255,251,240,0.35)",
                border: "1px solid rgba(245,230,163,0.55)",
                color: "#2D3748",
              }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: "#A0AEC0" }}>
              {selected.unit}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSave(`${value} ${selected.unit}`)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
            color: "#2D3748",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(167,139,250,0.2)",
          }}
        >
          Définir l'objectif
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Quick Action Card ─── */
function QuickActionCard({
  icon: Icon, label, color, bg, index, onClick,
}: {
  icon: React.ElementType; label: string; color: string; bg: string; index: number; onClick?: () => void;
}) {
  const [tapped, setTapped] = useState(false);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.07, type: "spring", bounce: 0.35 }}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.93 }}
      onClick={() => {
        setTapped(true);
        setTimeout(() => setTapped(false), 500);
        onClick?.();
      }}
      className={`${bg} lg-highlight relative flex-1 rounded-2xl py-4 flex flex-col items-center gap-2 cursor-pointer overflow-hidden`}
    >
      <AnimatePresence>
        {tapped && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: "rgba(255,255,255,0.4)" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
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

/* ─── Landing Page (quand non connecté) ─── */
type Particle = { id: number; x: number; y: number; size: number; delay: number; duration: number; color: string };

function LandingPage() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 3 + Math.random() * 8,
        delay: Math.random() * 4,
        duration: 4 + Math.random() * 4,
        color: i % 3 === 0
          ? "rgba(167,139,250,0.55)"
          : i % 3 === 1
          ? "rgba(212,168,67,0.45)"
          : "rgba(212,192,255,0.5)",
      }))
    );
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Blobs morphing */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ top: "-8%", left: "-8%", width: 560, height: 560, background: "rgba(212,192,255,0.5)", filter: "blur(80px)" }}
        animate={{
          scale: [1, 1.2, 1],
          x: [-15, 25, -15],
          y: [-10, 18, -10],
          borderRadius: ["60% 40% 30% 70% / 60% 30% 70% 40%", "30% 60% 70% 40% / 50% 60% 30% 60%", "60% 40% 30% 70% / 60% 30% 70% 40%"],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-8%", right: "-8%", width: 500, height: 500, background: "rgba(245,230,163,0.5)", filter: "blur(80px)" }}
        animate={{
          scale: [1, 1.18, 1],
          x: [15, -22, 15],
          y: [10, -18, 10],
          borderRadius: ["50% 60% 30% 60% / 30% 60% 70% 40%", "60% 30% 40% 60% / 70% 40% 60% 30%", "50% 60% 30% 60% / 30% 60% 70% 40%"],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ top: "35%", right: "10%", width: 280, height: 280, background: "rgba(167,139,250,0.3)", filter: "blur(60px)" }}
        animate={{ scale: [1, 1.3, 1], x: [-10, 15, -10] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Particules flottantes */}
      {particles.map(({ id, x, y, size, delay, duration, color }) => (
        <motion.div
          key={id}
          className="absolute rounded-full pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: "blur(0.5px)" }}
          animate={{ y: ["-15px", "15px", "-15px"], x: ["-8px", "8px", "-8px"], opacity: [0.2, 0.8, 0.2], scale: [1, 1.2, 1] }}
          transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
        />
      ))}

      {/* Anneaux rotatifs */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ width: 540, height: 540, border: "1px solid rgba(167,139,250,0.18)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ width: 440, height: 440, border: "1px solid rgba(212,168,67,0.12)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Contenu central */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 flex flex-col items-center text-center"
        style={{ maxWidth: 420 }}
      >
        {/* Logo animé */}
        <div className="relative mb-8">
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{ border: "1px solid rgba(167,139,250,0.45)" }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{ border: "1px solid rgba(212,168,67,0.3)" }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.55 }}
          />
          <motion.div
            className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
              boxShadow: "0 12px 48px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
            animate={{
              boxShadow: [
                "0 12px 48px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
                "0 12px 64px rgba(212,168,67,0.45), inset 0 1px 0 rgba(255,255,255,0.8)",
                "0 12px 48px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
              ],
            }}
            transition={{ duration: 3.5, repeat: Infinity }}
          >
            <span className="text-4xl font-semibold" style={{ color: "#2D3748" }}>A</span>
          </motion.div>
        </div>

        {/* Titre */}
        <motion.h1
          className="text-6xl font-extralight tracking-wide mb-3"
          style={{ color: "#2D3748" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Aura
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-base font-light mb-3 tracking-wide"
          style={{ color: "#718096" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Votre concierge de santé IA
        </motion.p>

        {/* Feature pills */}
        <motion.div
          className="flex flex-wrap gap-2 justify-center mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {["✦ Suivi intelligent", "✦ Coach vocal IA", "✦ Progression en temps réel"].map((f) => (
            <span
              key={f}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.7)",
                color: "#718096",
              }}
            >
              {f}
            </span>
          ))}
        </motion.div>

        {/* Boutons CTA */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 w-full"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/auth?mode=signup" className="flex-1">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="relative w-full py-4 rounded-2xl text-sm font-semibold text-center cursor-pointer overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #A78BFA 0%, #D4A843 100%)",
                color: "#fff",
                boxShadow: "0 6px 28px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)", backgroundSize: "200% 100%" }}
                animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                Créer un compte
                <ArrowRight size={14} strokeWidth={2} />
              </span>
            </motion.div>
          </Link>

          <Link href="/auth?mode=login" className="flex-1">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl text-sm font-semibold text-center cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.8)",
                color: "#2D3748",
                boxShadow: "0 4px 20px rgba(167,139,250,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <LogIn size={14} strokeWidth={1.5} />
                Se connecter
              </span>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Dashboard (quand connecté) ─── */
function Dashboard() {
  const now = new Date();
  const hour = now.getHours();
  const { user } = useAuth();
  const router = useRouter();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const [mobilePanel, setMobilePanel] = useState<"chat" | "stats" | null>(null);
  const [showRepas, setShowRepas] = useState(false);
  const [showObjectif, setShowObjectif] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<Message[]>(initialChatMessages);
  const [aiTyping, setAiTyping] = useState(false);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const n = new Date();
    const time = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
    setChatMessages((m) => [...m, { id: Date.now(), from: "me", text, time }]);
    setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      setChatMessages((m) => [...m, { id: Date.now() + 1, from: "ai", text: "Compris. Je personnalise votre programme en conséquence ✨", time }]);
    }, 1400);
  }, []);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      sendMessage(text);
      if (typeof window !== "undefined" && window.innerWidth < 768) setMobilePanel("chat");
    },
    [sendMessage],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const quickActionHandlers = [
    () => router.push("/progression"),
    () => setShowRepas(true),
    () => setShowObjectif(true),
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Blobs ambiants */}
      <div className="lg-blob absolute pointer-events-none" style={{ top: "3%", left: "6%", width: 320, height: 320, background: "rgba(212, 192, 255, 0.55)" }} />
      <div className="lg-blob absolute pointer-events-none" style={{ bottom: "8%", right: "5%", width: 360, height: 360, background: "rgba(245, 230, 163, 0.5)" }} />
      <div className="lg-blob absolute pointer-events-none" style={{ top: "42%", left: "48%", width: 240, height: 240, background: "rgba(240, 235, 255, 0.6)" }} />

      {/* Header */}
      <motion.header
        className="relative z-10 flex items-center justify-between px-6 pt-8 pb-2 md:px-10 md:pt-10 flex-shrink-0"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div>
          <motion.p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#A0AEC0" }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          >
            {greeting}
          </motion.p>
          <motion.h1 className="text-2xl md:text-3xl font-extralight mt-1" style={{ color: "#2D3748" }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          >
            {user ? `${user.name.split(" ")[0]}, prêt aujourd'hui ?` : "Comment vous sentez-vous ?"}
          </motion.h1>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, type: "spring", bounce: 0.4 }}
            className="lg-rose lg-highlight relative flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default"
          >
            <Flame size={11} strokeWidth={2} style={{ color: "#A78BFA" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>7 jours</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}>
            {user ? (
              <motion.div
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.92 }}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px 0 rgba(167,139,250,0.3)",
                }}
              >
                <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{user.name[0]?.toUpperCase()}</span>
              </motion.div>
            ) : (
              <Link href="/auth">
                <motion.div
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  className="lg-bicolor lg-highlight relative flex items-center gap-1.5 px-3 py-2 rounded-full cursor-pointer"
                >
                  <LogIn size={12} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>Connexion</span>
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* DESKTOP 3-column layout */}
      <div className="hidden md:grid relative z-10 grid-cols-[320px_1fr_320px] gap-5 px-6 pb-6 pt-4" style={{ height: "calc(100vh - 96px)" }}>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }} className="min-h-0" style={{ height: "100%" }}>
          <AIChatPanel messages={chatMessages} aiTyping={aiTyping} onSend={sendMessage} />
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }} className="flex flex-col items-center justify-center gap-7 overflow-y-auto py-4">
          <VocalOrb onTranscript={handleVoiceTranscript} />

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="lg-surface lg-highlight relative rounded-3xl px-6 py-5 flex items-center gap-5 w-full max-w-sm"
          >
            <ScoreRing score={91} />
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>Score du jour</p>
              <p className="text-sm font-medium leading-snug" style={{ color: "#2D3748" }}>Récupération excellente</p>
              <p className="text-xs font-light mt-0.5" style={{ color: "#718096" }}>Idéal pour intensité modérée</p>
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

      {/* MOBILE layout */}
      <div className="md:hidden flex flex-col relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="px-6 pb-2">
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {[
              { label: "Score", value: "91", unit: "/100", bg: "lg-bicolor" },
              { label: "Calories", value: "1847", unit: "kcal", bg: "lg-rose" },
              { label: "Pas", value: "8.2k", unit: "", bg: "lg-turquoise" },
              { label: "Sommeil", value: "7h24", unit: "", bg: "lg-bicolor" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.06, type: "spring", bounce: 0.35 }}
                whileHover={{ scale: 1.04, y: -2 }}
                className={`${s.bg} lg-highlight relative rounded-2xl px-4 py-3 flex-shrink-0 min-w-[100px] cursor-default`}
              >
                <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{s.label}</p>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-xl font-semibold" style={{ color: "#2D3748" }}>{s.value}</span>
                  {s.unit && <span className="text-[10px] font-medium" style={{ color: "#718096" }}>{s.unit}</span>}
                </div>
              </motion.div>
            ))}
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
          {[
            { key: "chat" as const, icon: MessageCircle, label: "Chat IA", color: "#A78BFA", bg: "lg-rose" },
            { key: "stats" as const, icon: BarChart3, label: "Détails", color: "#D4A843", bg: "lg-turquoise" },
          ].map(({ key, icon: Icon, label, color, bg }, i) => (
            <motion.button
              key={key}
              onClick={() => setMobilePanel(key)}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.07, type: "spring", bounce: 0.35 }}
              whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}
              className={`${bg} lg-highlight relative rounded-2xl py-3 px-4 flex items-center justify-center gap-2 cursor-pointer`}
            >
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
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobilePanel(null)}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(240,235,255,0.4)", backdropFilter: "blur(8px)" }}
            />
            <motion.div
              initial={{ y: "100%", scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-2 bottom-2 top-20 z-50 md:hidden"
            >
              {mobilePanel === "chat" ? (
                <AIChatPanel messages={chatMessages} aiTyping={aiTyping} onSend={sendMessage} />
              ) : (
                <StatsPanel />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals & Toast */}
      <AnimatePresence>
        {showRepas && (
          <RepasModal key="repas-modal" onClose={() => setShowRepas(false)} onSave={(name) => { setShowRepas(false); showToast(`${name} enregistré ✓`); }} />
        )}
        {showObjectif && (
          <ObjectifModal key="objectif-modal" onClose={() => setShowObjectif(false)} onSave={(label) => { setShowObjectif(false); showToast(`Objectif défini : ${label} ✓`); }} />
        )}
        {toast && <HomeToast key="home-toast" message={toast} />}
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
          <WelcomeBanner key="welcome" name={user.name} isNew={isNewUser} onDismiss={clearWelcome} />
        )}
      </AnimatePresence>

      {user ? <Dashboard /> : <LandingPage />}
    </>
  );
}
