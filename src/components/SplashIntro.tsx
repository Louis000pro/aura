"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Intro de marque : au chargement du site, le logo Vaiiya apparaît avec une
 * animation, puis l'écran s'efface pour révéler l'app.
 * S'affiche une fois par session (sessionStorage).
 *
 * ⚠️ Il couvre le VIEWPORT ENTIER, et c'est une correction, pas un détail. Il
 * commençait à 88 px du bord sur desktop pour laisser voir le rail pendant
 * l'intro. Sur une page publique il n'y a pas de rail : cette bande laissait
 * voir la page en dessous, en particulier son en-tête coupé en plein milieu du
 * mot « VAIIYA ». Un écran de chargement ne peut pas dépendre de ce qu'il y a
 * derrière lui.
 */
export default function SplashIntro() {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sobre = useReducedMotion();

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
          aria-hidden
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{ background: "#ffffff" }}
        >
          {/* Logo + wordmark — remontés sur mobile pour s'aligner sur l'orbe */}
          <div className="flex flex-col items-center" style={{ transform: isMobile ? "translateY(-4vh)" : "none" }}>
            <motion.img
              src="/logo-vaiiya.png"
              alt=""
              className="w-40 h-40 object-contain"
              initial={sobre ? { opacity: 1 } : { scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={sobre ? { duration: 0 } : { type: "spring", damping: 12, stiffness: 180, delay: 0.05 }}
              style={{ filter: "drop-shadow(0 8px 24px rgba(167,139,250,0.30))" }}
            />
            <motion.span
              className="mt-3 text-2xl font-black tracking-tight"
              style={{ color: "#2D2150", letterSpacing: "0.04em" }}
              initial={sobre ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={sobre ? { duration: 0 } : { delay: 0.45, duration: 0.5 }}
            >
              VAIIYA
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
