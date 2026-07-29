"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import GemmeRang from "@/components/GemmeRang";
import type { Cosmetiques, Rang } from "@/lib/aura";

/**
 * Le rendu RÉEL des récompenses de rang (l'aura).
 *
 * Règle posée le 2026-07-29 : la galerie des rangs ne doit annoncer que ce qui
 * existe et se voit. Elle utilise donc EXACTEMENT ces composants pour ses
 * aperçus — un cosmétique qui n'est pas rendu ici n'a rien à faire dans
 * `RECOMPENSE_RANG`. Tout se calcule depuis le rang déjà connu : aucun réglage,
 * aucune colonne en base, aucune migration SQL.
 *
 * Chaque composant prend un objet `Cosmetiques` explicite (et non un rang) pour
 * que l'aperçu puisse en forcer un seul à la fois sans dupliquer le rendu.
 */

/* ─────────────────────────────────────────────────────────────────────────────
 * La photo : cadre doré (Or) + anneau animé (Platine)
 * ────────────────────────────────────────────────────────────────────────── */

export function AvatarRang({
  rang,
  cosmetiques,
  size,
  className,
  children,
}: {
  rang: Rang;
  cosmetiques: Cosmetiques;
  /** Diamètre de la photo, en px. Les décorations débordent autour. */
  size: number;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [neon0, neon1] = rang.neon;

  return (
    <div className={`relative${className ? ` ${className}` : ""}`} style={{ width: size, height: size }}>
      {children}

      {/* Cadre doré — un liseré net collé à la photo. */}
      {cosmetiques.cadre && (
        <span
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -4,
            padding: 2.5,
            background: "linear-gradient(140deg,#FFE9A8,#E8A015 45%,#FFD34E)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            maskComposite: "exclude",
            boxShadow: "0 0 14px rgba(232,160,21,0.45)",
          }}
        />
      )}

      {/* Anneau animé — un arc aux couleurs du rang qui tourne autour de la photo. */}
      {cosmetiques.anneau && (
        <motion.svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="absolute pointer-events-none"
          style={{ inset: -11, width: "auto", height: "auto" }}
          {...(reduce
            ? {}
            : {
                animate: { rotate: 360 },
                transition: { duration: 7, ease: "linear" as const, repeat: Infinity },
              })}
        >
          <defs>
            <linearGradient id={`anneau-${rang.id}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={neon0} />
              <stop offset="1" stopColor={neon1} stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke={`url(#anneau-${rang.id})`}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="86 209"
          />
        </motion.svg>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Le pseudo : gemme en badge (Argent) + dégradé lumineux (Éternel)
 * ────────────────────────────────────────────────────────────────────────── */

export function PseudoRang({
  rang,
  cosmetiques,
  pseudo,
  className,
  style,
  tailleGemme = 18,
}: {
  rang: Rang;
  cosmetiques: Cosmetiques;
  pseudo: string;
  className?: string;
  style?: CSSProperties;
  tailleGemme?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <TexteBrillant brillant={cosmetiques.brillant} className={className} style={style}>
        {pseudo}
      </TexteBrillant>
      {cosmetiques.badge && (
        <span
          className="inline-flex shrink-0"
          title={`Rang ${rang.nom}`}
          aria-label={`Rang ${rang.nom}`}
          style={{ lineHeight: 0 }}
        >
          <GemmeRang rang={rang} size={tailleGemme} flotte={false} />
        </span>
      )}
    </span>
  );
}

/** Le pseudo scintillant de l'Éternel. Sans la récompense : texte normal. */
function TexteBrillant({
  brillant,
  className,
  style,
  children,
}: {
  brillant: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();

  if (!brillant) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  const brillance: CSSProperties = {
    ...style,
    backgroundImage: "linear-gradient(100deg,#FFD34E,#C13BC1 35%,#8B5CF6 50%,#FFD34E 70%,#FFD34E)",
    backgroundSize: "220% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };

  return (
    <motion.span
      className={className}
      style={brillance}
      {...(reduce
        ? {}
        : {
            animate: { backgroundPosition: ["0% 50%", "220% 50%"] },
            transition: { duration: 5, ease: "linear" as const, repeat: Infinity },
          })}
    >
      {children}
    </motion.span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Le titre du Diamant, sous le pseudo
 * ────────────────────────────────────────────────────────────────────────── */

export function TitreRang({ cosmetiques }: { cosmetiques: Cosmetiques }) {
  if (!cosmetiques.titre) return null;
  return (
    <span
      className="mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
      style={{
        background: "linear-gradient(135deg,rgba(139,92,246,0.14),rgba(193,59,193,0.14))",
        border: "1px solid rgba(var(--accent-rgb),0.28)",
        color: "var(--accent)",
      }}
    >
      {cosmetiques.titre}
    </span>
  );
}
