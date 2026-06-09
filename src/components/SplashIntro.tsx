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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Une seule fois par session de navigation
    if (typeof window === "undefined") return;
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
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
          className="fixed top-0 right-0 bottom-0 left-0 md:left-[88px] z-[9999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{ background: "linear-gradient(150deg,#faf8ff 0%,#fdfaff 45%,#fffdf6 100%)" }}
        >
          {/* Logo + wordmark — remontés sur mobile pour s'aligner sur l'orbe */}
          <div className="flex flex-col items-center" style={{ transform: isMobile ? "translateY(-9vh)" : "none" }}>
            <motion.img
              src="/logo-vaiiya.png"
              alt="Vaiiya"
              className="w-40 h-40 object-contain"
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 180, delay: 0.05 }}
              style={{ filter: "drop-shadow(0 8px 24px rgba(167,139,250,0.30))" }}
            />
            <motion.span
              className="mt-3 text-2xl font-black tracking-tight"
              style={{ color: "#2D2150", letterSpacing: "0.04em" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              VAIIYA
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
