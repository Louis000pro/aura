"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

const TWINKLE_STARS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 4,
  delay: Math.random() * 2,
  duration: 1.2 + Math.random() * 1.5,
}));

const RING_R = 110;
const RING_C = 2 * Math.PI * RING_R;

export default function WelcomeCelebration({
  isFirstTime,
  onDone,
}: {
  isFirstTime: boolean;
  onDone: () => void;
}) {
  const { isDark } = useTheme();

  if (typeof document === "undefined") return null;

  // ── Thème clair
  const light = {
    bg: "linear-gradient(160deg,#F5F0FF 0%,#FFFFFF 50%,#FFF8E7 100%)",
    starColor: "rgba(167,139,250,0.5)",
    halo: "radial-gradient(circle,rgba(167,139,250,0.12) 0%,transparent 70%)",
    ringTrack: "rgba(167,139,250,0.15)",
    ringGradStart: "#A78BFA",
    ringGradEnd: "#D4A843",
    checkBg: "linear-gradient(135deg,#A78BFA,#7C3AED)",
    checkShadow: "0 0 30px rgba(124,58,237,0.35)",
    labelColor: "rgba(124,58,237,0.6)",
    titleGrad: "linear-gradient(135deg,#4C1D95 0%,#7C3AED 45%,#D4A843 100%)",
    subColor: "rgba(45,55,72,0.5)",
    btnBg: "linear-gradient(135deg,#A78BFA 0%,#7C3AED 100%)",
    btnText: "#FFFFFF",
    btnShadow: "0 8px 32px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
  };

  // ── Thème sombre
  const dark = {
    bg: "linear-gradient(160deg,#1A0A3C 0%,#0D0520 50%,#1A0A3C 100%)",
    starColor: "#ffffff",
    halo: "radial-gradient(circle,rgba(167,139,250,0.18) 0%,transparent 70%)",
    ringTrack: "rgba(255,255,255,0.07)",
    ringGradStart: "#D4C0FF",
    ringGradEnd: "#F5E6A3",
    checkBg: "linear-gradient(135deg,#D4C0FF,#A78BFA)",
    checkShadow: "0 0 30px rgba(167,139,250,0.7)",
    labelColor: "rgba(212,192,255,0.7)",
    titleGrad: "linear-gradient(135deg,#FFFFFF 0%,#D4C0FF 45%,#F5E6A3 100%)",
    subColor: "rgba(255,255,255,0.55)",
    btnBg: "linear-gradient(135deg,#D4C0FF 0%,#A78BFA 50%,#F5E6A3 100%)",
    btnText: "#1A0A3C",
    btnShadow: "0 8px 32px rgba(167,139,250,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
  };

  const t = isDark ? dark : light;
  const gradId = isDark ? "ringGradDark" : "ringGradLight";

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: t.bg, zIndex: 99999 }}
    >
      {/* Étoiles */}
      {TWINKLE_STARS.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: t.starColor }}
          animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Halo */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 500, height: 500, background: t.halo }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col items-center gap-8">

        {/* Ring + étoile */}
        <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
          <svg width="260" height="260" className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="130" cy="130" r={RING_R} fill="none" stroke={t.ringTrack} strokeWidth="3" />
            <motion.circle
              cx="130" cy="130" r={RING_R} fill="none"
              stroke={`url(#${gradId})`} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={RING_C}
              initial={{ strokeDashoffset: RING_C }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 2.8, ease: "easeInOut", delay: 0.2 }}
            />
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={t.ringGradStart} />
                <stop offset="100%" stopColor={t.ringGradEnd} />
              </linearGradient>
            </defs>
          </svg>

          {/* Étoile orbitante */}
          <motion.div
            className="absolute" style={{ width: 260, height: 260 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.8, ease: "easeInOut", delay: 0.2 }}
          >
            <div className="absolute" style={{ top: 130 - RING_R - 10, left: "50%", transform: "translateX(-50%)" }}>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: 20, filter: isDark ? "drop-shadow(0 0 8px #F5E6A3)" : "drop-shadow(0 0 8px #D4A843)" }}
              >
                ⭐
              </motion.div>
            </div>
          </motion.div>

          {/* Centre */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 220, delay: 0.4 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: t.checkBg, boxShadow: t.checkShadow }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: 0.65, ease: "easeOut" }}
                />
              </svg>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: t.labelColor }}
            >
              Enregistré
            </motion.p>
          </div>
        </div>

        {/* Texte */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 160, delay: 0.6 }}
          className="flex flex-col items-center gap-3 px-8 text-center"
        >
          <h1
            className="font-black tracking-tight leading-tight whitespace-pre-line"
            style={{
              fontSize: "clamp(2rem,7vw,3.2rem)",
              background: t.titleGrad,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {isFirstTime ? "Bienvenue 🎉" : "Bon retour\nparmi nous 👋"}
          </h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.95, duration: 0.5 }}
            className="text-sm font-light"
            style={{ color: t.subColor, maxWidth: 260 }}
          >
            Tes informations ont bien été enregistrées
          </motion.p>
        </motion.div>

        {/* Bouton Continuer */}
        <motion.button
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 200, delay: 1.1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDone}
          className="px-10 py-4 rounded-2xl text-base font-bold cursor-pointer tracking-wide"
          style={{
            background: t.btnBg,
            color: t.btnText,
            boxShadow: t.btnShadow,
            letterSpacing: "0.04em",
          }}
        >
          Continuer ✦
        </motion.button>
      </div>
    </motion.div>,
    document.body
  );
}
