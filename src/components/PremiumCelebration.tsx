"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

const COLORS = ["#A78BFA", "#C4A8FF", "#7C5CFA", "#F5E6A3", "#FFB088", "#FFFFFF"];

/**
 * Célébration de paiement réussi — confettis + couronne + rayons.
 * Reste dans la DA Vaiiya (dégradés violet/doré/corail).
 */
export default function PremiumCelebration({ onClose }: { onClose: () => void }) {
  const [vh, setVh] = useState(900);
  const [vw, setVw] = useState(500);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setVh(window.innerHeight);
    setVw(window.innerWidth);
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
  }, []);

  // Confettis qui pleuvent
  const confetti = useMemo(() => {
    const n = isMobile ? 28 : 50;
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      left: Math.random() * 100,             // %
      size: 7 + Math.random() * 9,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 160,    // px
      rounded: Math.random() > 0.5,
      spin: 180 + Math.random() * 540,
    }));
  }, [isMobile]);

  // Étincelles qui explosent autour de la couronne
  const sparks = useMemo(() => {
    const n = isMobile ? 12 : 18;
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      angle: (i / n) * Math.PI * 2,
      dist: 90 + Math.random() * 60,
      size: 5 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
      delay: 0.25 + Math.random() * 0.2,
    }));
  }, [isMobile]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6 overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: "radial-gradient(circle at 50% 40%, rgba(76,52,140,0.72) 0%, rgba(35,24,66,0.88) 100%)", backdropFilter: "blur(6px)" }}
      onClick={() => onClose()}
    >
      {/* Rayons lumineux */}
      {!isMobile && [...Array(10)].map((_, i) => (
        <motion.div key={`ray-${i}`} className="absolute pointer-events-none"
          style={{
            top: "40%", left: "50%", width: 3, height: 320, transformOrigin: "top center",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)",
            rotate: `${(i / 10) * 360}deg`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 0.9], opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.6, delay: 0.15, ease: "easeOut" }} />
      ))}

      {/* Confettis (pluie) */}
      {confetti.map((c) => (
        <motion.div key={`c-${c.id}`} className="absolute pointer-events-none"
          style={{
            top: -20, left: `${c.left}%`, width: c.size, height: c.size * 1.4,
            background: c.color, borderRadius: c.rounded ? "50%" : 2,
            boxShadow: `0 0 6px ${c.color}55`,
          }}
          initial={{ y: -30, x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: vh + 60, x: c.drift, opacity: [0, 1, 1, 0.9], rotate: c.spin }}
          transition={{ duration: c.duration, delay: c.delay, ease: "easeIn" }} />
      ))}

      {/* Carte centrale */}
      <motion.div onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.78, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 16, stiffness: 240 }}
        className="relative w-full max-w-sm rounded-[30px] p-[2px] overflow-hidden"
        style={{ boxShadow: "0 40px 100px -20px rgba(124,92,250,0.7)" }}
      >
        {/* Bordure dégradée signature + reflet rotatif (DA "Du Jour") */}
        <div className="absolute inset-0 rounded-[30px]" style={{ background: "linear-gradient(130deg,#A78BFA 0%,#C4A8FF 30%,#F5E6A3 65%,#FFB088 100%)", opacity: 0.9 }} />
        <motion.div className="absolute" style={{ top: "-60%", left: "-60%", width: "220%", height: "220%", background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(255,255,255,0.9) 340deg, transparent 360deg)" }}
          animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />

        {/* Contenu */}
        <div className="relative rounded-[28px] px-8 py-10 text-center"
          style={{ background: "linear-gradient(165deg,#ffffff,#f5f0ff)" }}>

          {/* Couronne + halo + étincelles */}
          <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
            <motion.div className="absolute rounded-full"
              style={{ width: 96, height: 96, background: "radial-gradient(circle, rgba(167,139,250,0.55), transparent 70%)" }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
            {sparks.map((s) => (
              <motion.div key={`s-${s.id}`} className="absolute rounded-full"
                style={{ width: s.size, height: s.size, background: s.color, boxShadow: `0 0 8px ${s.color}` }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: Math.cos(s.angle) * s.dist, y: Math.sin(s.angle) * s.dist, scale: [0, 1.2, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 1.1, delay: s.delay, ease: "easeOut" }} />
            ))}
            <motion.div className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 14px 34px rgba(124,92,250,0.55)" }}
              initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.1 }}>
              <Crown size={38} strokeWidth={1.9} color="#fff" />
            </motion.div>
          </div>

          {/* Titre dégradé animé */}
          <motion.h2 className="text-[26px] font-black mb-2 leading-tight"
            style={{
              backgroundImage: "linear-gradient(90deg,#7C5CFA,#A78BFA,#FFB088,#7C5CFA)",
              backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            }}
            initial={{ backgroundPositionX: "0%", opacity: 0, y: 8 }}
            animate={{ backgroundPositionX: ["0%", "200%"], opacity: 1, y: 0 }}
            transition={{ backgroundPositionX: { duration: 3, repeat: Infinity, ease: "linear" }, opacity: { delay: 0.2 }, y: { delay: 0.2 } }}>
            Bienvenue dans Premium
          </motion.h2>

          <motion.p className="text-sm font-light mb-6" style={{ color: "#7C6BAA" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            Ton essai de 7 jours est lancé 🎉<br />
            Coach IA illimité · contenus exclusifs · zéro pub — <strong style={{ color: "#6D28D9" }}>tout est débloqué.</strong>
          </motion.p>

          {/* Bouton avec shimmer */}
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => onClose()}
            className="relative w-full py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer overflow-hidden"
            style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 10px 28px rgba(124,92,250,0.45)" }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <motion.span className="absolute top-0 bottom-0 w-1/3 pointer-events-none"
              style={{ background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.55), transparent)" }}
              animate={{ left: ["-40%", "140%"] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }} />
            <span className="relative">Découvrir mes avantages 🚀</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
