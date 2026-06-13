"use client";

/**
 * TourSlide — Slide narratif plein écran (intro / outro de la visite).
 *
 * Composition : fond violet profond radial, orbe de marque au centre
 * (halo conique Siri-style — c'est l'identité de l'orbe IA), eyebrow
 * "VAIIYA" letterspaced, titre en font-light serré, CTA gradient marque.
 * Les révélations sont décalées (orbe → eyebrow → titre → sous-titre → CTA).
 */

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  cta?: string;
  decoration?: string;
  onNext: () => void;
};

/* Positions déterministes des particules (pas de Math.random → pas d'hydration mismatch) */
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  left: `${(i * 41 + 13) % 100}%`,
  top: `${(i * 59 + 7) % 100}%`,
  gold: i % 3 === 0,
  delay: i * 0.35,
  duration: 3.2 + (i % 3) * 0.7,
}));

export default function TourSlide({ title, subtitle, cta, decoration = "✦", onNext }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(120% 85% at 50% 42%, rgba(42,28,82,0.94) 0%, rgba(14,9,32,0.99) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Particules discrètes */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2.5,
            height: 2.5,
            left: p.left,
            top: p.top,
            background: p.gold ? "#F5E6A3" : "#A78BFA",
            boxShadow: `0 0 10px ${p.gold ? "rgba(245,230,163,0.8)" : "rgba(167,139,250,0.8)"}`,
          }}
          animate={{ opacity: [0.15, 0.75, 0.15], scale: [0.8, 1.25, 0.8] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}

      {/* ── Orbe de marque ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-10"
      >
        {/* Halo conique Siri-style — l'identité de l'orbe IA */}
        <motion.div
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: 170,
            height: 170,
            left: "50%",
            top: "50%",
            x: "-50%",
            y: "-50%",
            background: "conic-gradient(from 0deg, #A78BFA, #22D3EE, #F5E6A3, #A78BFA)",
            filter: "blur(30px)",
            opacity: 0.5,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: 124,
            height: 124,
            background:
              "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.96) 0%, rgba(212,192,255,0.72) 58%, rgba(167,139,250,0.5) 100%)",
            boxShadow: "0 0 56px rgba(167,139,250,0.55), inset 0 4px 18px rgba(255,255,255,0.85)",
          }}
          animate={{ scale: [1, 1.045, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span
            className="select-none"
            style={{ fontSize: 44, color: "#5A4A8A", textShadow: "0 2px 10px rgba(255,255,255,0.65)" }}
          >
            {decoration}
          </span>
        </motion.div>
      </motion.div>

      {/* Eyebrow de marque */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
        className="uppercase select-none mb-3"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.38em",
          color: "rgba(212,192,255,0.75)",
          textIndent: "0.38em", // compense le tracking du dernier caractère
        }}
      >
        Vaiiya
      </motion.p>

      {/* Titre */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.55, ease: "easeOut" }}
        className="text-center mb-4 max-w-md"
        style={{
          fontSize: "clamp(28px, 5vw, 40px)",
          fontWeight: 300,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          color: "#FFFFFF",
          textShadow: "0 2px 20px rgba(167,139,250,0.35)",
        }}
      >
        {title}
      </motion.h1>

      {/* Sous-titre */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.55, ease: "easeOut" }}
        className="text-center max-w-sm mb-10"
        style={{
          fontSize: 14.5,
          fontWeight: 300,
          lineHeight: 1.65,
          color: "rgba(255,255,255,0.74)",
        }}
      >
        {subtitle}
      </motion.p>

      {/* CTA — même gradient que le tooltip (cohérence) */}
      {cta && (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.5, ease: "easeOut" }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="flex items-center gap-2.5 cursor-pointer"
          style={{
            padding: "14px 30px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "#1A1535",
            background: "linear-gradient(135deg, #D4C0FF 0%, #E8DDFF 45%, #F5E6A3 100%)",
            boxShadow: "0 10px 36px rgba(167,139,250,0.45), inset 0 1px 0 rgba(255,255,255,0.92)",
            border: "none",
          }}
        >
          <span>{cta}</span>
          <ArrowRight size={15} strokeWidth={2.4} />
        </motion.button>
      )}
    </motion.div>
  );
}
