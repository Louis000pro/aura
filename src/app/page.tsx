"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, BarChart3, Flame, Zap, Utensils, Sparkles, X, LogIn, Check, Moon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VocalOrb from "@/components/VocalOrb";
import AIChatPanel from "@/components/AIChatPanel";
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
            <stop offset="0%" stopColor="#F9A8C9" />
            <stop offset="100%" stopColor="#7ED8D8" />
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

/* ─── Welcome Banner ─── */
function WelcomeBanner({ name, isNew, onDismiss }: { name: string; isNew: boolean; onDismiss: () => void }) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStarted(true), 50);
    const t2 = setTimeout(onDismiss, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -60, scale: 0.9 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className="fixed top-5 left-1/2 z-[100] pointer-events-auto"
      style={{ transform: "translateX(-50%)", width: "min(400px, calc(100vw - 32px))" }}
    >
      <div
        className="relative rounded-2xl px-5 py-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 100%)",
          backdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 8px 48px rgba(249,168,201,0.28), 0 2px 16px rgba(178,240,240,0.18), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
      >
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: `${20 + i * 40}%`,
              top: i % 2 === 0 ? "-4px" : "auto",
              bottom: i % 2 === 1 ? "-4px" : "auto",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0], y: i % 2 === 0 ? [-4, -16, -4] : [4, 16, 4] }}
            transition={{ duration: 1.2, delay: 0.2 + i * 0.15 }}
          >
            <Sparkles size={10} style={{ color: i % 2 === 0 ? "#F9A8C9" : "#7ED8D8" }} />
          </motion.div>
        ))}

        <div className="flex items-center gap-3 relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-semibold text-sm"
            style={{
              background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)",
              color: "#2D3748",
              boxShadow: "0 4px 12px rgba(249,168,201,0.3), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            {name[0]?.toUpperCase()}
          </motion.div>

          <div className="flex-1 min-w-0">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-semibold"
              style={{ color: "#2D3748" }}
            >
              {isNew ? `Bienvenue sur Aura, ${name} !` : `Bon retour, ${name} !`}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[11px] font-light"
              style={{ color: "#718096" }}
            >
              {isNew ? "Votre parcours santé commence maintenant ✦" : "Prêt à battre vos records aujourd'hui ? 🔥"}
            </motion.p>
          </div>

          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.6)" }}
          >
            <X size={12} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </button>
        </div>

        {/* Progress bar — CSS transition only */}
        <div className="mt-3 relative z-10 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #F9A8C9, #7ED8D8)",
              width: started ? "0%" : "100%",
              transition: started ? "width 4s linear" : "none",
            }}
          />
        </div>
      </div>
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
        boxShadow: "0 8px 32px rgba(249,168,201,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
        whiteSpace: "nowrap",
      }}
    >
      <Check size={14} strokeWidth={2.5} style={{ color: "#7ED8D8" }} />
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
      style={{ background: "rgba(255,240,245,0.4)", backdropFilter: "blur(12px)" }}
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
          boxShadow: "0 20px 60px rgba(249,168,201,0.15), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Nutrition</p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Ajouter un repas</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,240,245,0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Meal type selector */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {mealTypesList.map(({ id, label, emoji }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.93 }}
              onClick={() => setType(id)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-2xl cursor-pointer transition-all duration-150"
              style={
                type === id
                  ? { background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }
                  : { background: "rgba(255,240,245,0.5)" }
              }
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-[9px] font-semibold" style={{ color: type === id ? "#2D3748" : "#A0AEC0" }}>
                {label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Name */}
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
              background: "rgba(255,240,245,0.5)",
              border: "1px solid rgba(255,214,231,0.6)",
              color: "#2D3748",
            }}
          />
        </div>

        {/* Calories */}
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
              background: "rgba(255,240,245,0.5)",
              border: "1px solid rgba(255,214,231,0.6)",
              color: "#2D3748",
            }}
          />
        </div>

        {/* Save */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer transition-all duration-200"
          style={{
            background: name.trim()
              ? "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)"
              : "rgba(220,220,220,0.45)",
            color: name.trim() ? "#2D3748" : "#A0AEC0",
            boxShadow: name.trim() ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(249,168,201,0.2)" : "none",
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
  { id: "workouts", label: "Séances",  desc: "/ semaine", unit: "séances/sem", defaultVal: "4",     icon: Flame,    color: "#F9A8C9" },
  { id: "calories", label: "Calories", desc: "/ jour",    unit: "kcal/jour",   defaultVal: "2000",  icon: Zap,      color: "#F9A8C9" },
  { id: "steps",    label: "Pas",      desc: "/ jour",    unit: "pas/jour",    defaultVal: "10000", icon: BarChart3, color: "#7ED8D8" },
  { id: "sleep",    label: "Sommeil",  desc: "/ nuit",    unit: "h/nuit",      defaultVal: "8",     icon: Moon,     color: "#7ED8D8" },
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
      style={{ background: "rgba(224,255,255,0.4)", backdropFilter: "blur(12px)" }}
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
          boxShadow: "0 20px 60px rgba(178,240,240,0.15), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Performance</p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Définir un objectif</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(224,255,255,0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Goal type grid */}
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
                      background: "linear-gradient(135deg, rgba(255,240,245,0.95) 0%, rgba(224,255,255,0.95) 100%)",
                      border: "1px solid rgba(255,255,255,0.8)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                    }
                  : { background: "rgba(255,240,245,0.45)", border: "1px solid transparent" }
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

        {/* Value input */}
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
                background: "rgba(224,255,255,0.35)",
                border: "1px solid rgba(178,240,240,0.55)",
                color: "#2D3748",
              }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium" style={{ color: "#A0AEC0" }}>
              {selected.unit}
            </span>
          </div>
        </div>

        {/* Save */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSave(`${value} ${selected.unit}`)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)",
            color: "#2D3748",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(249,168,201,0.2)",
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
  { icon: Flame,    label: "Séance",  color: "#F9A8C9", bg: "lg-rose" },
  { icon: Utensils, label: "Repas",   color: "#7ED8D8", bg: "lg-turquoise" },
  { icon: Zap,      label: "Objectif",color: "#F9A8C9", bg: "lg-bicolor" },
];

export default function HomePage() {
  const now = new Date();
  const hour = now.getHours();
  const { user, justLoggedIn, isNewUser, clearWelcome } = useAuth();
  const router = useRouter();

  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const [mobilePanel, setMobilePanel] = useState<"chat" | "stats" | null>(null);
  const [showRepas, setShowRepas] = useState(false);
  const [showObjectif, setShowObjectif] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      {/* Welcome banner */}
      <AnimatePresence>
        {justLoggedIn && user && (
          <WelcomeBanner name={user.name} isNew={isNewUser} onDismiss={clearWelcome} />
        )}
      </AnimatePresence>

      {/* Ambient blobs — static */}
      <div
        className="lg-blob absolute pointer-events-none"
        style={{ top: "3%", left: "6%", width: 320, height: 320, background: "rgba(255, 214, 231, 0.6)" }}
      />
      <div
        className="lg-blob absolute pointer-events-none"
        style={{ bottom: "8%", right: "5%", width: 360, height: 360, background: "rgba(178, 240, 240, 0.55)" }}
      />
      <div
        className="lg-blob absolute pointer-events-none"
        style={{ top: "42%", left: "48%", width: 240, height: 240, background: "rgba(255, 240, 245, 0.65)" }}
      />

      {/* Header */}
      <motion.header
        className="relative z-10 flex items-center justify-between px-6 pt-8 pb-2 md:px-10 md:pt-10 flex-shrink-0"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div>
          <motion.p
            className="text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "#A0AEC0" }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {greeting}
          </motion.p>
          <motion.h1
            className="text-2xl md:text-3xl font-extralight mt-1"
            style={{ color: "#2D3748" }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            {user ? `${user.name.split(" ")[0]}, prêt aujourd'hui ?` : "Comment vous sentez-vous ?"}
          </motion.h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: "spring", bounce: 0.4 }}
            className="lg-rose lg-highlight relative flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default"
          >
            <Flame size={11} strokeWidth={2} style={{ color: "#F9A8C9" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>7 jours</span>
          </motion.div>

          {/* Avatar / Login */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
          >
            {user ? (
              <motion.div
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.92 }}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px 0 rgba(249,168,201,0.3)",
                }}
              >
                <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                  {user.name[0]?.toUpperCase()}
                </span>
              </motion.div>
            ) : (
              <Link href="/auth">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
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
      <div
        className="hidden md:grid relative z-10 grid-cols-[320px_1fr_320px] gap-5 px-6 pb-6 pt-4"
        style={{ height: "calc(100vh - 96px)" }}
      >
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="min-h-0" style={{ height: "100%" }}
        >
          <AIChatPanel />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col items-center justify-center gap-7 overflow-y-auto py-4"
        >
          <VocalOrb />

          {/* Score du jour */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
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

          {/* Quick actions */}
          <div className="flex gap-3 w-full max-w-sm">
            {quickActionsConfig.map(({ icon, label, color, bg }, i) => (
              <QuickActionCard
                key={label}
                icon={icon} label={label} color={color} bg={bg} index={i}
                onClick={quickActionHandlers[i]}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="min-h-0" style={{ height: "100%" }}
        >
          <StatsPanel />
        </motion.div>
      </div>

      {/* MOBILE layout */}
      <div className="md:hidden flex flex-col relative z-10">
        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="px-6 pb-2"
        >
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {[
              { label: "Score", value: "91", unit: "/100", bg: "lg-bicolor" },
              { label: "Calories", value: "1847", unit: "kcal", bg: "lg-rose" },
              { label: "Pas", value: "8.2k", unit: "", bg: "lg-turquoise" },
              { label: "Sommeil", value: "7h24", unit: "", bg: "lg-bicolor" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.06, type: "spring", bounce: 0.35 }}
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

        {/* Mobile Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          className="flex-1 flex items-center justify-center px-6 py-6"
        >
          <VocalOrb />
        </motion.div>

        {/* Quick actions */}
        <div className="px-6 pb-3 flex gap-2">
          {quickActionsConfig.map(({ icon, label, color, bg }, i) => (
            <QuickActionCard
              key={label}
              icon={icon} label={label} color={color} bg={bg} index={i}
              onClick={quickActionHandlers[i]}
            />
          ))}
        </div>

        {/* Chat & Stats triggers */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          {[
            { key: "chat" as const, icon: MessageCircle, label: "Chat IA", color: "#F9A8C9", bg: "lg-rose" },
            { key: "stats" as const, icon: BarChart3, label: "Détails", color: "#7ED8D8", bg: "lg-turquoise" },
          ].map(({ key, icon: Icon, label, color, bg }, i) => (
            <motion.button
              key={key}
              onClick={() => setMobilePanel(key)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.07, type: "spring", bounce: 0.35 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96 }}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobilePanel(null)}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(255,240,245,0.4)", backdropFilter: "blur(8px)" }}
            />
            <motion.div
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-2 bottom-2 top-20 z-50 md:hidden"
            >
              {mobilePanel === "chat" ? <AIChatPanel /> : <StatsPanel />}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals & Toast */}
      <AnimatePresence>
        {showRepas && (
          <RepasModal
            key="repas-modal"
            onClose={() => setShowRepas(false)}
            onSave={(name) => {
              setShowRepas(false);
              showToast(`${name} enregistré ✓`);
            }}
          />
        )}
        {showObjectif && (
          <ObjectifModal
            key="objectif-modal"
            onClose={() => setShowObjectif(false)}
            onSave={(label) => {
              setShowObjectif(false);
              showToast(`Objectif défini : ${label} ✓`);
            }}
          />
        )}
        {toast && <HomeToast key="home-toast" message={toast} />}
      </AnimatePresence>
    </div>
  );
}
