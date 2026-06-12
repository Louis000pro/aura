"use client";

/**
 * TourSpotlight — Overlay plein écran qui :
 *  1. Assombrit toute l'interface
 *  2. Découpe un "trou" autour de l'élément ancré (data-tour-anchor)
 *  3. Affiche un halo néon pulsé autour de ce trou
 *  4. Place un tooltip avec titre + description, positionné automatiquement
 *
 * Technique : SVG plein écran avec un <mask> qui contient
 *  - un rectangle blanc (= visible/sombre) pour tout l'écran
 *  - un rectangle noir (= invisible/transparent) pour la zone spotlightée
 *
 * Le tooltip est positionné en HTML par-dessus le SVG.
 *
 * Recalcule la position à chaque scroll/resize pour rester collé à l'élément.
 */

import { useEffect, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  anchorId: string;
  title: string;
  description: string;
  shape?: "circle" | "rounded";
  padding?: number;
  tooltipPosition?: "auto" | "top" | "bottom";
  onNext: () => void;
};

export default function TourSpotlight({
  anchorId,
  title,
  description,
  shape = "rounded",
  padding = 8,
  tooltipPosition = "auto",
  onNext,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [missing, setMissing] = useState(false);

  /* ── Mesurer la position de l'élément cible ── */
  useLayoutEffect(() => {
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const el = document.querySelector(`[data-tour-anchor="${anchorId}"]`);
      if (!el) {
        // L'élément n'est pas (encore) dans le DOM → on retentera après un délai
        setRect(null);
        return false;
      }
      const r = el.getBoundingClientRect();
      setRect({
        x: r.left - padding,
        y: r.top - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      });
      setMissing(false);
      return true;
    };

    // Premier essai immédiat
    let found = measure();

    // Si pas trouvé, on poll quelques fois (l'élément peut être en train d'être monté/animé)
    let attempts = 0;
    const interval = found ? null : window.setInterval(() => {
      attempts++;
      found = measure();
      if (found || attempts > 20) {
        if (interval) window.clearInterval(interval);
        if (!found) setMissing(true);
      }
    }, 100);

    // Recalcule sur resize/scroll
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      if (interval) window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorId, padding]);

  /* ── Auto-skip si l'élément est introuvable ── */
  useEffect(() => {
    if (missing) {
      const t = setTimeout(() => onNext(), 800);
      return () => clearTimeout(t);
    }
  }, [missing, onNext]);

  if (!rect || viewport.width === 0) {
    return (
      <motion.div
        key="spotlight-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        style={{ background: "rgba(15,10,35,0.75)", backdropFilter: "blur(8px)" }}
      />
    );
  }

  /* ── Position du tooltip ── */
  const elementCenterY = rect.y + rect.height / 2;
  const decidedPosition: "top" | "bottom" =
    tooltipPosition === "auto"
      ? elementCenterY > viewport.height / 2 ? "top" : "bottom"
      : tooltipPosition;

  const tooltipMargin = 24;
  const tooltipY = decidedPosition === "top"
    ? rect.y - tooltipMargin
    : rect.y + rect.height + tooltipMargin;

  /* ── Rayon du masque (cercle vs rounded rect) ── */
  const cornerRadius = shape === "circle" ? Math.max(rect.width, rect.height) / 2 : 20;

  return (
    <motion.div
      key="spotlight"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] pointer-events-none"
    >
      {/* ── SVG avec mask pour le découpage ── */}
      <svg width={viewport.width} height={viewport.height} className="absolute inset-0 pointer-events-auto">
        <defs>
          <mask id={`mask-${anchorId}`}>
            {/* Tout en blanc = visible (sombre) */}
            <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
            {/* Zone spotlightée en noir = invisible (transparent) */}
            {shape === "circle" ? (
              <circle
                cx={rect.x + rect.width / 2}
                cy={rect.y + rect.height / 2}
                r={cornerRadius}
                fill="black"
              />
            ) : (
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={cornerRadius}
                ry={cornerRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Fond sombre avec trou */}
        <rect
          x="0"
          y="0"
          width={viewport.width}
          height={viewport.height}
          fill="rgba(10, 5, 25, 0.78)"
          mask={`url(#mask-${anchorId})`}
        />
      </svg>

      {/* ── Halo néon animé autour du trou ── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: rect.x - 12,
          top: rect.y - 12,
          width: rect.width + 24,
          height: rect.height + 24,
          borderRadius: shape === "circle" ? "50%" : cornerRadius + 12,
          background: "conic-gradient(from 0deg, #A78BFA, #22D3EE, #F5E6A3, #A78BFA)",
          filter: "blur(14px)",
          opacity: 0.6,
          zIndex: -1,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* Bordure néon nette */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: rect.x - 2,
          top: rect.y - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          borderRadius: shape === "circle" ? "50%" : cornerRadius + 2,
          border: "2px solid rgba(212,192,255,0.9)",
          boxShadow: "0 0 24px rgba(167,139,250,0.7), inset 0 0 12px rgba(212,192,255,0.4)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Particules scintillantes autour de la zone */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radiusX = rect.width / 2 + 30;
        const radiusY = rect.height / 2 + 30;
        const px = rect.x + rect.width / 2 + Math.cos(angle) * radiusX;
        const py = rect.y + rect.height / 2 + Math.sin(angle) * radiusY;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: px - 3,
              top: py - 3,
              width: 6,
              height: 6,
              background: i % 2 === 0 ? "#A78BFA" : "#22D3EE",
              boxShadow: `0 0 16px ${i % 2 === 0 ? "#A78BFA" : "#22D3EE"}`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.7, 1.4, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* ── Tooltip ── */}
      <motion.div
        initial={{ opacity: 0, y: decidedPosition === "top" ? 12 : -12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.15, type: "spring", bounce: 0.25, duration: 0.5 }}
        className="absolute pointer-events-auto px-5 py-4 rounded-2xl max-w-[320px]"
        style={{
          left: "50%",
          top: tooltipY,
          transform: `translate(-50%, ${decidedPosition === "top" ? "-100%" : "0%"})`,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(212,192,255,0.7)",
          boxShadow: "0 12px 40px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
      >
        <h3 className="text-base font-semibold mb-1.5" style={{ color: "#2D3748" }}>
          {title}
        </h3>
        <p className="text-[13px] font-light leading-relaxed mb-3" style={{ color: "#4A5568" }}>
          {description}
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer ml-auto"
          style={{
            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
            color: "#2D3748",
            boxShadow: "0 4px 14px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <span>Suivant</span>
          <ArrowRight size={12} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
