"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { MessageCircle, BarChart3, Flame, Zap, Utensils, Sparkles, X, LogIn } from "lucide-react";
import Link from "next/link";
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
          transition={{ duration: 1.8, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="text-2xl font-light leading-none" style={{ color: "#2D3748" }}
        >{score}</motion.span>
        <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: "#A0AEC0" }}>/100</span>
      </div>
    </div>
  );
}

/* ─── Floating Particle ─── */
type FloatParticle = { id: number; x: number; y: number; size: number; delay: number; duration: number; color: string };

function FloatingParticle({ x, y, size, delay, duration, color }: Omit<FloatParticle, "id">) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: "blur(0.5px)" }}
      animate={{ y: [0, -30, 0], x: [0, 15, 0], opacity: [0, 0.6, 0], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

/* ─── Magnetic Button ─── */
function MagneticButton({ children, className, style, onClick }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.3);
    y.set((e.clientY - cy) * 0.3);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY, ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Welcome Banner ─── */
function WelcomeBanner({ name, isNew, onDismiss }: { name: string; isNew: boolean; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const duration = 4000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) { clearInterval(interval); onDismiss(); }
    }, 50);
    return () => clearInterval(interval);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -60, scale: 0.9 }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
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
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["-100% 0", "300% 0"] }}
          transition={{ duration: 1.5, delay: 0.3 }}
        />

        {/* Sparkles flying around */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: `${15 + i * 22}%`,
              top: i % 2 === 0 ? "-4px" : "auto",
              bottom: i % 2 === 1 ? "-4px" : "auto",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0], y: i % 2 === 0 ? [-4, -16, -4] : [4, 16, 4] }}
            transition={{ duration: 1.2, delay: 0.2 + i * 0.15, repeat: 2 }}
          >
            <Sparkles size={10} style={{ color: i % 2 === 0 ? "#F9A8C9" : "#7ED8D8" }} />
          </motion.div>
        ))}

        <div className="flex items-center gap-3 relative z-10">
          {/* Animated avatar */}
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

        {/* Progress bar */}
        <div className="mt-3 relative z-10 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #F9A8C9, #7ED8D8)",
              transition: "width 50ms linear",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Quick Action Card ─── */
function QuickActionCard({
  icon: Icon, label, color, bg, index,
}: {
  icon: React.ElementType; label: string; color: string; bg: string; index: number;
}) {
  const [tapped, setTapped] = useState(false);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 + index * 0.08, type: "spring", bounce: 0.4 }}
      whileHover={{ y: -4, scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      onTap={() => { setTapped(true); setTimeout(() => setTapped(false), 600); }}
      className={`${bg} lg-highlight relative flex-1 rounded-2xl py-4 flex flex-col items-center gap-2 cursor-pointer overflow-hidden`}
    >
      {/* Ripple on tap */}
      <AnimatePresence>
        {tapped && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: "rgba(255,255,255,0.4)" }}
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      <motion.div animate={{ rotate: tapped ? [0, -10, 10, 0] : 0 }} transition={{ duration: 0.4 }}>
        <Icon size={17} strokeWidth={1.5} style={{ color }} />
      </motion.div>
      <span className="text-[10px] font-semibold tracking-wide" style={{ color: "#2D3748" }}>{label}</span>
    </motion.button>
  );
}

const quickActions = [
  { icon: Flame, label: "Séance", color: "#F9A8C9", bg: "lg-rose" },
  { icon: Utensils, label: "Repas", color: "#7ED8D8", bg: "lg-turquoise" },
  { icon: Zap, label: "Objectif", color: "#F9A8C9", bg: "lg-bicolor" },
];

export default function HomePage() {
  const now = new Date();
  const hour = now.getHours();
  const { user, justLoggedIn, isNewUser, clearWelcome } = useAuth();

  const greeting = user
    ? (hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir")
    : (hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir");

  const [mobilePanel, setMobilePanel] = useState<"chat" | "stats" | null>(null);
  const [particles, setParticles] = useState<FloatParticle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 90,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 4,
        color: i % 2 === 0 ? "rgba(249,168,201,0.4)" : "rgba(126,216,216,0.35)",
      }))
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Welcome banner */}
      <AnimatePresence>
        {justLoggedIn && user && (
          <WelcomeBanner name={user.name} isNew={isNewUser} onDismiss={clearWelcome} />
        )}
      </AnimatePresence>

      {/* Animated ambient blobs */}
      <motion.div
        className="lg-blob absolute pointer-events-none"
        style={{ top: "3%", left: "6%", width: 320, height: 320, background: "rgba(255, 214, 231, 0.6)" }}
        animate={{ scale: [1, 1.2, 1], x: [-15, 20, -15], y: [-10, 15, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="lg-blob absolute pointer-events-none"
        style={{ bottom: "8%", right: "5%", width: 360, height: 360, background: "rgba(178, 240, 240, 0.55)" }}
        animate={{ scale: [1, 1.18, 1], x: [10, -20, 10], y: [8, -18, 8] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="lg-blob absolute pointer-events-none"
        style={{ top: "42%", left: "48%", width: 240, height: 240, background: "rgba(255, 240, 245, 0.65)" }}
        animate={{ scale: [1, 1.35, 1], rotate: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="lg-blob absolute pointer-events-none"
        style={{ top: "20%", right: "10%", width: 180, height: 180, background: "rgba(249,168,201,0.2)" }}
        animate={{ scale: [1, 1.4, 1], y: [-20, 20, -20] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <FloatingParticle key={p.id} x={p.x} y={p.y} size={p.size} delay={p.delay} duration={p.duration} color={p.color} />
      ))}

      {/* Header */}
      <motion.header
        className="relative z-10 flex items-center justify-between px-6 pt-8 pb-2 md:px-10 md:pt-10 flex-shrink-0"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div>
          <motion.p
            className="text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "#A0AEC0" }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {greeting}
          </motion.p>
          <motion.h1
            className="text-2xl md:text-3xl font-extralight mt-1"
            style={{ color: "#2D3748" }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {user ? `${user.name.split(" ")[0]}, prêt aujourd'hui ?` : "Comment vous sentez-vous ?"}
          </motion.h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak badge */}
          <MagneticButton>
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", bounce: 0.5 }}
              className="lg-rose lg-highlight relative flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Flame size={11} strokeWidth={2} style={{ color: "#F9A8C9" }} />
              </motion.div>
              <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>7 jours</span>
            </motion.div>
          </MagneticButton>

          {/* Avatar / Login button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45, type: "spring", bounce: 0.5 }}
          >
            {user ? (
              <MagneticButton>
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
              </MagneticButton>
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
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="min-h-0" style={{ height: "100%" }}
        >
          <AIChatPanel />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center justify-center gap-7 overflow-y-auto py-4"
        >
          <VocalOrb />

          {/* Score du jour */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="lg-surface lg-highlight relative rounded-3xl px-6 py-5 flex items-center gap-5 w-full max-w-sm"
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden"
              style={{ mixBlendMode: "screen" }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["-100% 0", "300% 0"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.div>
            <ScoreRing score={91} />
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>Score du jour</p>
              <p className="text-sm font-medium leading-snug" style={{ color: "#2D3748" }}>Récupération excellente</p>
              <p className="text-xs font-light mt-0.5" style={{ color: "#718096" }}>Idéal pour intensité modérée</p>
            </div>
          </motion.div>

          {/* Quick actions */}
          <div className="flex gap-3 w-full max-w-sm">
            {quickActions.map(({ icon, label, color, bg }, i) => (
              <QuickActionCard key={label} icon={icon} label={label} color={color} bg={bg} index={i} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
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
          transition={{ duration: 0.5, delay: 0.2 }}
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
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.07, type: "spring", bounce: 0.4 }}
                whileHover={{ scale: 1.05, y: -2 }}
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
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1 flex items-center justify-center px-6 py-6"
        >
          <VocalOrb />
        </motion.div>

        {/* Quick actions */}
        <div className="px-6 pb-3 flex gap-2">
          {quickActions.map(({ icon, label, color, bg }, i) => (
            <QuickActionCard key={label} icon={icon} label={label} color={color} bg={bg} index={i} />
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
              transition={{ delay: 0.7 + i * 0.08, type: "spring", bounce: 0.4 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.95 }}
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
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="fixed inset-x-2 bottom-2 top-20 z-50 md:hidden"
            >
              {mobilePanel === "chat" ? <AIChatPanel /> : <StatsPanel />}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
