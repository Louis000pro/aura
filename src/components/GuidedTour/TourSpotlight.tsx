"use client";

/**
 * TourSpotlight — Couche spotlight persistante de la visite guidée.
 *
 * Différence clé avec une implémentation naïve : ce composant reste MONTÉ
 * entre deux étapes spotlight de la même page. Le trou de lumière, la bordure
 * et le tooltip GLISSENT d'un élément au suivant (morphing), au lieu de
 * disparaître/réapparaître. C'est ce qui donne la sensation premium.
 *
 * Pipeline à chaque changement d'ancre :
 *  1. findVisibleAnchor : sélectionne l'élément data-tour-anchor qui a une
 *     vraie taille (la nav mobile et desktop partagent les mêmes ids).
 *  2. Auto-scroll : scrollIntoView({ center }) — vertical ET horizontal
 *     (les cartes du carousel "Mes Séances" sont hors-champ à droite).
 *  3. Polling + listeners scroll/resize : le rect est suivi en continu,
 *     le spotlight reste collé à l'élément pendant le smooth scroll.
 *  4. Morphing : mask SVG, bordure et tooltip animés vers la nouvelle position.
 *
 * Cadrage du tooltip :
 *  - largeur ≤ 360px, clampé à 16px des bords
 *  - au-dessus ou en-dessous de l'élément selon l'espace (auto-flip)
 *  - mode "pleine page" : si l'élément couvre > 62 % de la hauteur d'écran
 *    (présentation d'un onglet entier), le tooltip se pose au centre,
 *    composition intentionnelle plutôt que collage sur un bord.
 *
 * ADN visuel : carte blanche, trait gradient violet→or, ✦ doré,
 * compteur d'étape discret, CTA gradient marque.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  anchorId: string;
  title: string;
  description: string;
  shape?: "circle" | "rounded";
  padding?: number;
  tooltipPosition?: "auto" | "top" | "bottom";
  softOverlay?: boolean;
  stepNumber: number;
  totalSteps: number;
  canPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** Courbe d'animation signature — décélération douce, zéro rebond sur les masques. */
const EASE = [0.32, 0.72, 0, 1] as const;

/** Sélectionne le 1er élément data-tour-anchor qui a une vraie taille à l'écran. */
function findVisibleAnchor(anchorId: string): Element | null {
  const els = document.querySelectorAll(`[data-tour-anchor="${anchorId}"]`);
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
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
  stepNumber,
  totalSteps,
  canPrev,
  onPrev,
  onNext,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [missing, setMissing] = useState(false);
  const [tooltipH, setTooltipH] = useState(176);
  const scrolledFor = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* ── Mesure continue : scroll auto + polling + listeners ── */
  useLayoutEffect(() => {
    let cancelled = false;

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport((v) => (v.width === vw && v.height === vh ? v : { width: vw, height: vh }));

      const el = findVisibleAnchor(anchorId);
      if (!el) return false;

      // Auto-scroll une seule fois par ancre, dès qu'elle apparaît dans le DOM.
      // block+inline "center" gère le scroll vertical de la page ET le scroll
      // horizontal du carousel de séances.
      if (scrolledFor.current !== anchorId) {
        scrolledFor.current = anchorId;
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        } catch {
          el.scrollIntoView();
        }
      }

      const r = el.getBoundingClientRect();
      const margin = 6;
      const left = Math.max(margin, r.left - padding);
      const top = Math.max(margin, r.top - padding);
      const right = Math.min(vw - margin, r.right + padding);
      const bottom = Math.min(vh - margin, r.bottom + padding);
      const nr: Rect = {
        x: left,
        y: top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      };
      // Identité stable si la position n'a pas bougé (évite les re-renders du polling)
      setRect((prev) =>
        prev &&
        Math.abs(prev.x - nr.x) < 0.5 &&
        Math.abs(prev.y - nr.y) < 0.5 &&
        Math.abs(prev.width - nr.width) < 0.5 &&
        Math.abs(prev.height - nr.height) < 0.5
          ? prev
          : nr
      );
      setMissing(false);
      return true;
    };

    setMissing(false); // reset à chaque changement d'ancre (évite un faux auto-skip)
    let found = measure();

    // Polling : capture l'élément qui se monte après une navigation + suit le smooth scroll.
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts++;
      found = measure() || found;
      if (attempts > 45) {
        window.clearInterval(interval);
        if (!found && !cancelled) setMissing(true);
      }
    }, 80);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorId, padding]);

  /* ── Hauteur réelle du tooltip (positionnement précis, pas d'estimation) ── */
  const hasRect = rect !== null;
  useLayoutEffect(() => {
    if (cardRef.current) setTooltipH(cardRef.current.offsetHeight);
  }, [anchorId, title, description, hasRect]);

  /* ── Auto-skip si l'ancre reste introuvable ── */
  useEffect(() => {
    if (missing) {
      const t = setTimeout(() => onNext(), 1200);
      return () => clearTimeout(t);
    }
  }, [missing, onNext]);

  /* ── Phase de chargement : voile sombre simple ── */
  if (!rect || viewport.width === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        style={{
          background: softOverlay ? "rgba(10,5,25,0.45)" : "rgba(10,5,25,0.78)",
          backdropFilter: "blur(6px)",
        }}
      />
    );
  }

  /* ─────────────── Calculs de cadrage ─────────────── */

  const cornerRadius = shape === "circle" ? Math.max(rect.width, rect.height) / 2 : 22;

  const tooltipWidth = Math.min(360, viewport.width - 32);
  const sideMargin = 16;
  const gap = 22;          // espace entre l'élément et le tooltip
  const safeTop = 72;      // safe-area + bouton Passer
  const safeBottom = 84;   // nav + safe-area

  // Mode "pleine page" : l'élément couvre la majorité de l'écran
  const coverMode = rect.height > viewport.height * 0.62;

  const elementCenterX = rect.x + rect.width / 2;
  let tooltipLeft = elementCenterX - tooltipWidth / 2;
  tooltipLeft = Math.max(sideMargin, Math.min(viewport.width - tooltipWidth - sideMargin, tooltipLeft));

  let tooltipTop: number;
  if (coverMode) {
    // Composition centrée : le tooltip flotte sur le tiers inférieur du contenu
    tooltipTop = viewport.height * 0.5 - tooltipH / 2 + viewport.height * 0.06;
  } else {
    const decided: "top" | "bottom" =
      tooltipPosition === "auto"
        ? rect.y + rect.height / 2 > viewport.height / 2 ? "top" : "bottom"
        : tooltipPosition;

    if (decided === "top") {
      tooltipTop = rect.y - gap - tooltipH;
      if (tooltipTop < safeTop) tooltipTop = rect.y + rect.height + gap; // flip
    } else {
      tooltipTop = rect.y + rect.height + gap;
      if (tooltipTop + tooltipH > viewport.height - safeBottom) {
        tooltipTop = rect.y - gap - tooltipH; // flip
      }
    }
  }
  tooltipTop = Math.max(safeTop, Math.min(viewport.height - tooltipH - 24, tooltipTop));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] pointer-events-none"
    >
      {/* ── Voile sombre avec découpe morphante ── */}
      <svg
        width={viewport.width}
        height={viewport.height}
        className="absolute inset-0 pointer-events-auto"
      >
        <defs>
          <mask id="vaiiya-tour-mask">
            <rect width={viewport.width} height={viewport.height} fill="white" />
            <motion.rect
              initial={false}
              animate={{
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                rx: cornerRadius,
              }}
              transition={{ duration: 0.5, ease: EASE }}
              fill="black"
            />
          </mask>
        </defs>
        <motion.rect
          width={viewport.width}
          height={viewport.height}
          fill="#0A0519"
          initial={false}
          animate={{ fillOpacity: softOverlay ? 0.45 : 0.78 }}
          transition={{ duration: 0.4 }}
          mask="url(#vaiiya-tour-mask)"
        />
      </svg>

      {/* ── Liseré lumineux qui glisse avec la découpe ── */}
      <motion.div
        className="absolute pointer-events-none"
        initial={false}
        animate={{
          left: rect.x - 2,
          top: rect.y - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          borderRadius: shape === "circle" ? Math.max(rect.width, rect.height) / 2 + 2 : 24,
        }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{
          border: "1.5px solid rgba(255,255,255,0.9)",
          boxShadow: "0 0 28px rgba(255,255,255,0.38), 0 0 64px rgba(167,139,250,0.3)",
        }}
      >
        {/* Respiration intérieure douce (opacité seule, aucune rotation) */}
        <motion.div
          className="absolute inset-0"
          style={{ borderRadius: "inherit", boxShadow: "inset 0 0 16px rgba(212,192,255,0.35)" }}
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* ─────────── Tooltip signature Vaiiya ─────────── */}
      <motion.div
        ref={cardRef}
        className="absolute pointer-events-auto overflow-hidden"
        initial={{ opacity: 0, left: tooltipLeft, top: tooltipTop + 10 }}
        animate={{ opacity: 1, left: tooltipLeft, top: tooltipTop }}
        transition={{ duration: 0.5, ease: EASE, opacity: { duration: 0.3 } }}
        style={{
          width: tooltipWidth,
          borderRadius: 22,
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(212,192,255,0.5)",
          boxShadow:
            "0 24px 64px rgba(26,21,53,0.28), 0 6px 20px rgba(167,139,250,0.18), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
      >
        {/* Trait gradient violet → or — signature ADN sur le bord supérieur */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              "linear-gradient(90deg, transparent 0%, #A78BFA 18%, #C4A8FF 45%, #F5E6A3 78%, transparent 100%)",
          }}
        />

        {/* Contenu — remonté à chaque étape avec un micro fade-up */}
        <motion.div
          key={anchorId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.14, ease: "easeOut" }}
          className="px-6 pt-5 pb-3.5"
        >
          <div className="flex items-start gap-2 mb-2">
            <span
              aria-hidden
              style={{
                color: "#D4A843",
                fontSize: 14,
                lineHeight: 1,
                marginTop: 4,
                textShadow: "0 1px 6px rgba(212,168,67,0.35)",
              }}
            >
              ✦
            </span>
            <h3
              style={{
                color: "#1A1535",
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {title}
            </h3>
          </div>
          <p
            style={{
              color: "#5A4E70",
              fontSize: 13.5,
              fontWeight: 300,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {description}
          </p>
        </motion.div>

        {/* Footer : compteur + navigation (stable, ne re-render pas entre étapes) */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <span
            style={{
              color: "#B4ABC8",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.06em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {stepNumber} / {totalSteps}
          </span>

          <div className="flex items-center gap-2">
            {canPrev && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPrev}
                aria-label="Étape précédente"
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "rgba(240,235,255,0.7)",
                  border: "1px solid rgba(167,139,250,0.22)",
                  color: "#7C6BAA",
                }}
              >
                <ArrowLeft size={13} strokeWidth={2.4} />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.025 }}
              whileTap={{ scale: 0.96 }}
              onClick={onNext}
              className="flex items-center gap-1.5 cursor-pointer"
              style={{
                padding: "9px 18px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.01em",
                color: "#1A1535",
                background: "linear-gradient(135deg, #D4C0FF 0%, #E8DDFF 45%, #F5E6A3 100%)",
                boxShadow: "0 6px 18px rgba(167,139,250,0.32), inset 0 1px 0 rgba(255,255,255,0.9)",
                border: "none",
              }}
            >
              <span>Suivant</span>
              <ArrowRight size={12} strokeWidth={2.6} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
