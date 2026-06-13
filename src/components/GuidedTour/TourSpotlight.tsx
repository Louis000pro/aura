"use client";

/**
 * TourSpotlight — Couche spotlight persistante de la visite guidée.
 *
 * Ce composant reste MONTÉ entre deux étapes spotlight de la même page :
 * le trou de lumière, le liseré et le tooltip MORPHENT d'un élément au
 * suivant au lieu de disparaître/réapparaître.
 *
 * Hiérarchie visuelle à deux niveaux :
 *  · ZONE PRINCIPALE  — grande découpe + liseré blanc respirant.
 *  · ACCENTS          — `secondaryAnchors` : petites découpes + anneau
 *    gradient violet→or pulsant. Usage : pill du sous-onglet actif
 *    (« tu es ICI dans Progression »), bouton Photo IA…
 *
 * Orientation : `breadcrumb` affiché en pill uppercase au-dessus du titre
 * (« Progression · Nutrition ») — l'utilisateur sait toujours où il est.
 *
 * Cadrage :
 *  · auto-scroll vertical + horizontal vers l'ancre (carousel inclus)
 *  · le rect suit l'élément en continu (polling + listeners scroll/resize)
 *  · tooltip ≤ 360 px, hauteur réelle mesurée, flip auto, clamp 16 px
 *  · mode « pleine page » (> 62 % de la hauteur) : tooltip composé au centre
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  anchorId: string;
  title?: string;
  description?: string;
  breadcrumb?: string;
  shape?: "circle" | "rounded";
  padding?: number;
  tooltipPosition?: "auto" | "top" | "bottom";
  softOverlay?: boolean;
  secondaryAnchors?: string[];
  /**
   * Mode « focus » : si défini, pas de carte tooltip — l'élément est entouré
   * d'un anneau gradient violet→or + une étiquette courte à côté
   * (« Onglet · Progression »). Utilisé pour MONTRER les transitions
   * d'onglet / sous-onglet. L'auto-avance est gérée par GuidedTour.
   */
  focusLabel?: string;
  canPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** Courbe signature — décélération douce, zéro rebond sur les masques. */
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

function sameRect(a: Rect | undefined, b: Rect): boolean {
  return (
    !!a &&
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export default function TourSpotlight({
  anchorId,
  title = "",
  description = "",
  breadcrumb,
  shape = "rounded",
  padding = 8,
  tooltipPosition = "auto",
  softOverlay = false,
  secondaryAnchors,
  focusLabel,
  canPrev,
  onPrev,
  onNext,
}: Props) {
  const isFocus = !!focusLabel;
  const [rect, setRect] = useState<Rect | null>(null);
  const [secRects, setSecRects] = useState<Record<string, Rect>>({});
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [missing, setMissing] = useState(false);
  const [tooltipH, setTooltipH] = useState(176);
  const scrolledFor = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const secKey = secondaryAnchors?.join(",") ?? "";

  /* ── Mesure continue : scroll auto + polling + listeners ── */
  useLayoutEffect(() => {
    let cancelled = false;
    const secIds = secKey ? secKey.split(",") : [];

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport((v) => (v.width === vw && v.height === vh ? v : { width: vw, height: vh }));

      const el = findVisibleAnchor(anchorId);
      if (!el) return false;

      // Auto-scroll une seule fois par ancre, dès qu'elle apparaît.
      // block+inline "center" : scroll vertical de page ET horizontal de carousel.
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
      setRect((prev) => (prev && sameRect(prev, nr) ? prev : nr));

      // Accents secondaires — mesure souple : absents = ignorés
      const next: Record<string, Rect> = {};
      for (const id of secIds) {
        const sEl = findVisibleAnchor(id);
        if (!sEl) continue;
        const sr = sEl.getBoundingClientRect();
        // visible à l'écran uniquement
        if (sr.bottom < 0 || sr.top > vh || sr.right < 0 || sr.left > vw) continue;
        next[id] = { x: sr.left - 5, y: sr.top - 5, width: sr.width + 10, height: sr.height + 10 };
      }
      setSecRects((prev) => {
        const pk = Object.keys(prev);
        const nk = Object.keys(next);
        if (pk.length === nk.length && nk.every((k) => sameRect(prev[k], next[k]))) return prev;
        return next;
      });

      setMissing(false);
      return true;
    };

    setMissing(false); // reset à chaque changement d'ancre (évite un faux auto-skip)
    let found = measure();

    // Polling : capture l'élément qui se monte après navigation + suit le smooth scroll.
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
  }, [anchorId, padding, secKey]);

  /* ── Hauteur réelle du tooltip (positionnement précis) ── */
  const hasRect = rect !== null;
  useLayoutEffect(() => {
    if (cardRef.current) setTooltipH(cardRef.current.offsetHeight);
  }, [anchorId, title, description, breadcrumb, hasRect]);

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
  const gap = 22;
  const safeTop = 72;
  const safeBottom = 84;

  const coverMode = rect.height > viewport.height * 0.62;

  const elementCenterX = rect.x + rect.width / 2;
  let tooltipLeft = elementCenterX - tooltipWidth / 2;
  tooltipLeft = Math.max(sideMargin, Math.min(viewport.width - tooltipWidth - sideMargin, tooltipLeft));

  let tooltipTop: number;
  if (coverMode) {
    tooltipTop = viewport.height * 0.5 - tooltipH / 2 + viewport.height * 0.06;
  } else {
    const decided: "top" | "bottom" =
      tooltipPosition === "auto"
        ? rect.y + rect.height / 2 > viewport.height / 2 ? "top" : "bottom"
        : tooltipPosition;

    if (decided === "top") {
      tooltipTop = rect.y - gap - tooltipH;
      if (tooltipTop < safeTop) tooltipTop = rect.y + rect.height + gap;
    } else {
      tooltipTop = rect.y + rect.height + gap;
      if (tooltipTop + tooltipH > viewport.height - safeBottom) {
        tooltipTop = rect.y - gap - tooltipH;
      }
    }
  }
  tooltipTop = Math.max(safeTop, Math.min(viewport.height - tooltipH - 24, tooltipTop));

  /* ── Anti-recouvrement ──
     Si la carte chevauche encore l'élément spotlighté (typique d'un élément
     petit collé à un bord : le bouton + de la sidebar desktop), on la déplace
     SUR LE CÔTÉ qui a le plus de place, centrée verticalement sur l'élément.
     Évite que le texte cache l'onglet présenté. ── */
  if (!coverMode) {
    const overlapX = tooltipLeft < rect.x + rect.width + gap && tooltipLeft + tooltipWidth > rect.x - gap;
    const overlapY = tooltipTop < rect.y + rect.height + gap && tooltipTop + tooltipH > rect.y - gap;
    if (overlapX && overlapY) {
      const roomRight = viewport.width - (rect.x + rect.width) - gap - sideMargin;
      const roomLeft = rect.x - gap - sideMargin;
      if (roomRight >= tooltipWidth || roomRight >= roomLeft) {
        // À droite de l'élément
        tooltipLeft = Math.min(
          viewport.width - tooltipWidth - sideMargin,
          rect.x + rect.width + gap
        );
      } else {
        // À gauche de l'élément
        tooltipLeft = Math.max(sideMargin, rect.x - gap - tooltipWidth);
      }
      // Recentrer verticalement sur l'élément, clampé
      tooltipTop = Math.max(
        safeTop,
        Math.min(
          viewport.height - tooltipH - 24,
          rect.y + rect.height / 2 - tooltipH / 2
        )
      );
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] pointer-events-none"
    >
      {/* ── Voile sombre avec découpes morphantes ── */}
      <svg
        width={viewport.width}
        height={viewport.height}
        className="absolute inset-0 pointer-events-auto"
      >
        <defs>
          <mask id="vaiiya-tour-mask">
            <rect width={viewport.width} height={viewport.height} fill="white" />
            {/* Découpe principale */}
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
            {/* Découpes des accents secondaires */}
            {Object.entries(secRects).map(([id, sr]) => (
              <motion.rect
                key={id}
                initial={false}
                animate={{ x: sr.x, y: sr.y, width: sr.width, height: sr.height, rx: 16 }}
                transition={{ duration: 0.5, ease: EASE }}
                fill="black"
              />
            ))}
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

      {/* ── Liseré de la zone principale ──
          spotlight : liseré blanc respirant
          focus     : anneau GRADIENT violet→or (signal « c'est ICI ») ── */}
      {isFocus ? (
        <motion.div
          className="absolute pointer-events-none"
          initial={false}
          animate={{
            left: rect.x - 4,
            top: rect.y - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Halo doux */}
          <motion.div
            className="absolute inset-0"
            style={{
              borderRadius: shape === "circle" ? "50%" : 20,
              boxShadow: "0 0 26px rgba(167,139,250,0.6), 0 0 52px rgba(245,230,163,0.35)",
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Anneau gradient (masque border-only, centre transparent) */}
          <motion.div
            className="absolute inset-0"
            style={{
              borderRadius: shape === "circle" ? "50%" : 20,
              padding: 3,
              background: "linear-gradient(135deg, #A78BFA 0%, #C4A8FF 40%, #F5E6A3 100%)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
            } as React.CSSProperties}
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      ) : (
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
          <motion.div
            className="absolute inset-0"
            style={{ borderRadius: "inherit", boxShadow: "inset 0 0 16px rgba(212,192,255,0.35)" }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {/* ── Anneaux gradient des accents secondaires ── */}
      <AnimatePresence>
        {Object.entries(secRects).map(([id, sr]) => (
          <motion.div
            key={id}
            className="absolute pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: sr.x - 3,
              top: sr.y - 3,
              width: sr.width + 6,
              height: sr.height + 6,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE, opacity: { duration: 0.35, delay: 0.3 } }}
          >
            {/* Halo doux derrière l'anneau */}
            <motion.div
              className="absolute inset-0"
              style={{
                borderRadius: 18,
                boxShadow: "0 0 22px rgba(167,139,250,0.55), 0 0 40px rgba(245,230,163,0.3)",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Anneau gradient violet→or (masque border-only, centre transparent) */}
            <motion.div
              className="absolute inset-0"
              style={{
                borderRadius: 18,
                padding: 2.5,
                background: "linear-gradient(135deg, #A78BFA 0%, #C4A8FF 40%, #F5E6A3 100%)",
                WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                maskComposite: "exclude",
              } as React.CSSProperties}
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Mode focus : étiquette courte près de l'élément ── */}
      {isFocus && (
        <motion.div
          key={`focus-${anchorId}`}
          className="absolute pointer-events-none flex items-center gap-1.5"
          initial={{ opacity: 0, y: 6, x: "-50%" }}
          animate={{
            opacity: 1,
            y: 0,
            x: "-50%",
            left: Math.max(
              90,
              Math.min(viewport.width - 90, rect.x + rect.width / 2)
            ),
            top:
              rect.y + rect.height + 56 > viewport.height - 90
                ? rect.y - 54
                : rect.y + rect.height + 16,
          }}
          transition={{ duration: 0.4, ease: EASE, opacity: { duration: 0.3, delay: 0.2 } }}
          style={{
            padding: "9px 16px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.97)",
            border: "1px solid rgba(212,192,255,0.6)",
            boxShadow: "0 10px 32px rgba(26,21,53,0.35), 0 4px 14px rgba(167,139,250,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden style={{ color: "#D4A843", fontSize: 12, lineHeight: 1 }}>✦</span>
          <span style={{ color: "#1A1535", fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>
            {focusLabel}
          </span>
        </motion.div>
      )}

      {/* ─────────── Tooltip signature Vaiiya ─────────── */}
      {!isFocus && (
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
        {/* Trait gradient violet → or — signature ADN */}
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

        {/* Contenu — micro fade-up à chaque étape */}
        <motion.div
          key={anchorId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.14, ease: "easeOut" }}
          className="px-6 pt-5 pb-3.5"
        >
          {/* Fil d'Ariane — l'utilisateur sait toujours où il est */}
          {breadcrumb && (
            <span
              className="inline-flex items-center uppercase select-none"
              style={{
                padding: "4px 11px",
                borderRadius: 999,
                marginBottom: 10,
                background:
                  "linear-gradient(135deg, rgba(212,192,255,0.25) 0%, rgba(245,230,163,0.22) 100%)",
                border: "1px solid rgba(167,139,250,0.28)",
                color: "#6B4FB8",
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              {breadcrumb}
            </span>
          )}

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

        {/* Footer : navigation (stable entre les étapes) */}
        <div className="px-6 pb-4 flex items-center justify-end gap-2">
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
      </motion.div>
      )}
    </motion.div>
  );
}
