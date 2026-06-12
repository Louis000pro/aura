"use client";

/**
 * TourSpotlight — Overlay plein écran qui :
 *  1. Assombrit toute l'interface (opacité ajustable via softOverlay)
 *  2. Découpe un "trou" autour de l'élément ancré (data-tour-anchor)
 *  3. Affiche un halo néon pulsé autour de ce trou
 *  4. Place un tooltip avec titre + description, positionné automatiquement
 *
 * Améliorations clés :
 *  - Sélectionne l'élément data-tour-anchor VISIBLE (utile car nav mobile + desktop
 *    portent souvent le même anchor — on prend celui qui a une vraie taille).
 *  - Tooltip clampé dans les bornes du viewport (jamais hors écran).
 *  - softOverlay (45% opacité au lieu de 78%) pour les "tours de page" :
 *    l'utilisateur voit la page derrière, pas juste un trou noir.
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
  softOverlay?: boolean;
  onNext: () => void;
};

/** Sélectionne le 1er élément data-tour-anchor qui a une vraie taille (rect > 0). */
function findVisibleAnchor(anchorId: string): DOMRect | null {
  const els = document.querySelectorAll(`[data-tour-anchor="${anchorId}"]`);
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  return null;
}

export default function TourSpotlight({
  anchorId,
  title,
  description,
  shape = "rounded",
  padding = 8,
  tooltipPosition = "auto",
  softOverlay = false,
  onNext,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [missing, setMissing] = useState(false);

  /* ── Mesurer la position de l'élément cible (en cherchant le 1er visible) ── */
  useLayoutEffect(() => {
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const r = findVisibleAnchor(anchorId);
      if (!r) {
        setRect(null);
        return false;
      }
      setRect({
        x: r.left - padding,
        y: r.top - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      });
      setMissing(false);
      return true;
    };

    let found = measure();

    // Si pas trouvé, poll quelques fois (l'élément peut être en cours de montage après navigation)
    let attempts = 0;
    const interval = found ? null : window.setInterval(() => {
      attempts++;
      found = measure();
      if (found || attempts > 30) {
        if (interval) window.clearInterval(interval);
        if (!found) setMissing(true);
      }
    }, 100);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      if (interval) window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorId, padding]);

  /* ── Auto-skip si l'élément reste introuvable ── */
  useEffect(() => {
    if (missing) {
      const t = setTimeout(() => onNext(), 1000);
      return () => clearTimeout(t);
    }
  }, [missing, onNext]);

  /* ── Loading state ── */
  if (!rect || viewport.width === 0) {
    return (
      <motion.div
        key="spotlight-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        style={{
          background: softOverlay ? "rgba(15,10,35,0.45)" : "rgba(15,10,35,0.75)",
          backdropFilter: "blur(6px)",
        }}
      />
    );
  }

  /* ─────────── Calculs de positionnement ─────────── */

  // Position verticale du tooltip
  const elementCenterY = rect.y + rect.height / 2;
  const decidedPosition: "top" | "bottom" =
    tooltipPosition === "auto"
      ? elementCenterY > viewport.height / 2 ? "top" : "bottom"
      : tooltipPosition;

  const tooltipMargin = 20;
  // Tooltip largeur responsive : max 320, mais au minimum on garde 16px de marge à gauche/droite
  const tooltipWidth = Math.min(320, viewport.width - 32);
  const horizontalMargin = 16;

  // Centre X de l'élément cible
  const elementCenterX = rect.x + rect.width / 2;
  // Position left du tooltip : centré sur l'élément, mais clampé dans le viewport
  let tooltipLeft = elementCenterX - tooltipWidth / 2;
  tooltipLeft = Math.max(
    horizontalMargin,
    Math.min(viewport.width - tooltipWidth - horizontalMargin, tooltipLeft)
  );

  // Position top du tooltip
  // Si "top" : tooltip placé AU-DESSUS de l'élément (tooltipY = bord supérieur)
  // Si "bottom" : tooltip placé EN-DESSOUS de l'élément (tooltipY = bord supérieur du tooltip)
  let tooltipTop: number;
  // Estimation hauteur tooltip (titre + description + bouton). Marge confortable.
  const estimatedTooltipHeight = 160;
  if (decidedPosition === "top") {
    tooltipTop = rect.y - tooltipMargin - estimatedTooltipHeight;
    // Si le tooltip dépasse en haut, on bascule en-dessous
    if (tooltipTop < horizontalMargin + 56 /* safe area + skip btn */) {
      tooltipTop = rect.y + rect.height + tooltipMargin;
    }
  } else {
    tooltipTop = rect.y + rect.height + tooltipMargin;
    // Si dépasse en bas, basculer au-dessus
    if (tooltipTop + estimatedTooltipHeight > viewport.height - 80 /* dots + safe area */) {
      tooltipTop = rect.y - tooltipMargin - estimatedTooltipHeight;
    }
  }
  // Clamp final tooltipTop
  tooltipTop = Math.max(
    horizontalMargin + 56,
    Math.min(viewport.height - estimatedTooltipHeight - 80, tooltipTop)
  );

  // Rayon du masque
  const cornerRadius = shape === "circle" ? Math.max(rect.width, rect.height) / 2 : 20;
  // Couleur de l'overlay sombre
  const overlayColor = softOverlay ? "rgba(10, 5, 25, 0.45)" : "rgba(10, 5, 25, 0.78)";

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
            <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
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
        <rect
          x="0"
          y="0"
          width={viewport.width}
          height={viewport.height}
          fill={overlayColor}
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

      {/* ── Tooltip (positionné en absolu, clampé dans le viewport) ── */}
      <motion.div
        initial={{ opacity: 0, y: decidedPosition === "top" ? 12 : -12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.15, type: "spring", bounce: 0.25, duration: 0.5 }}
        className="absolute pointer-events-auto px-5 py-4 rounded-2xl"
        style={{
          left: tooltipLeft,
          top: tooltipTop,
          width: tooltipWidth,
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
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
              color: "#2D3748",
              boxShadow: "0 4px 14px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <span>Suivant</span>
            <ArrowRight size={12} strokeWidth={2.5} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
