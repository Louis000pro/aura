"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Intro de marque : au chargement du site, le logo Vaiiya apparaît avec une
 * animation, puis l'écran s'efface pour révéler l'app.
 * S'affiche une fois par session (sessionStorage).
 */
export default function SplashIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Une seule fois par session de navigation
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("vaiiya_splash")) return;
    sessionStorage.setItem("vaiiya_splash", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{ background: "linear-gradient(150deg,#faf8ff 0%,#fdfaff 45%,#fffdf6 100%)" }}
        >
          {/* Halo lumineux derrière le logo */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 360, height: 360, background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(245,230,163,0.12) 45%, transparent 70%)" }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.15, 1], opacity: [0, 1, 0.85] }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />

          {/* Anneau qui s'étend */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ border: "1.5px solid rgba(167,139,250,0.4)" }}
            initial={{ width: 90, height: 90, opacity: 0.7 }}
            animate={{ width: 260, height: 260, opacity: 0 }}
            transition={{ duration: 1.3, ease: "easeOut", delay: 0.2 }}
          />

          <div className="relative flex flex-col items-center">
            {/* Logo */}
            <motion.img
              src="/icons/icon-512.png"
              alt="Vaiiya"
              className="w-28 h-28 object-contain"
              initial={{ scale: 0.55, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 180, delay: 0.05 }}
              style={{ filter: "drop-shadow(0 8px 24px rgba(167,139,250,0.35))" }}
            />
            {/* Wordmark */}
            <motion.div
              className="mt-4 flex items-center gap-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              <span className="text-2xl font-black tracking-tight" style={{ color: "#2D2150", letterSpacing: "0.04em" }}>
                VAIIYA
              </span>
              <span className="text-xl" style={{ color: "#A78BFA" }}>✦</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
