"use client";

/**
 * TourSlide — Slide narratif plein écran (intro / outro).
 *
 * Style cohérent avec la palette Vaiiya : fond sombre violet profond,
 * orbe lumineuse centrale, gradient conique animé, particules scintillantes.
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

export default function TourSlide({ title, subtitle, cta, decoration = "✦", onNext }: Props) {
  return (
    <motion.div
      key="slide"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{
        background: "radial-gradient(120% 80% at 50% 50%, rgba(40, 25, 80, 0.92) 0%, rgba(15, 10, 35, 0.98) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Particules scintillantes en fond */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 3,
            height: 3,
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            background: i % 2 === 0 ? "#A78BFA" : "#22D3EE",
            boxShadow: `0 0 12px ${i % 2 === 0 ? "#A78BFA" : "#22D3EE"}`,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.5, 0.8],
          }}
          transition={{
            duration: 2.5 + (i % 3) * 0.5,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Orbe centrale animée */}
      <div className="relative mb-12">
        {/* Halo conique animé */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            width: 180,
            height: 180,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: "conic-gradient(from 0deg, #A78BFA, #22D3EE, #F5E6A3, #A78BFA)",
            filter: "blur(28px)",
            opacity: 0.6,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        {/* Orbe blanche au centre avec respiration */}
        <motion.div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: 130,
            height: 130,
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95) 0%, rgba(212,192,255,0.7) 60%, rgba(167,139,250,0.5) 100%)",
            boxShadow: "0 0 60px rgba(167,139,250,0.6), inset 0 4px 16px rgba(255,255,255,0.8)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-5xl select-none" style={{ color: "#5A4A8A", textShadow: "0 2px 8px rgba(255,255,255,0.6)" }}>
            {decoration}
          </span>
        </motion.div>
      </div>

      {/* Titre */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-3xl md:text-4xl font-light tracking-tight text-center mb-4 max-w-md"
        style={{ color: "#FFFFFF", textShadow: "0 2px 16px rgba(167,139,250,0.4)" }}
      >
        {title}
      </motion.h1>

      {/* Sous-titre */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="text-sm md:text-base font-light text-center max-w-md leading-relaxed mb-10"
        style={{ color: "rgba(255,255,255,0.78)" }}
      >
        {subtitle}
      </motion.p>

      {/* CTA */}
      {cta && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
            color: "#2D3748",
            boxShadow: "0 8px 32px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <span>{cta}</span>
          <ArrowRight size={16} strokeWidth={2.2} />
        </motion.button>
      )}
    </motion.div>
  );
}
