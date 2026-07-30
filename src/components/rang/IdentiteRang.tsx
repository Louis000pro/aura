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
  // Les décorations débordent PROPORTIONNELLEMENT : à 120 px sur un profil elles
  // respirent, à 46 px dans une ligne de conversation elles ne doivent pas mordre
  // sur le texte d'à côté ni sur la ligne du dessus.
  const debordCadre = Math.max(2, size / 28);
  const debordAnneau = Math.max(4, size / 11);
  const epaisseurCadre = Math.max(1.5, size / 48);

  return (
    <div className={`relative${className ? ` ${className}` : ""}`} style={{ width: size, height: size }}>
      {children}

      {/* Cadre doré — un liseré net collé à la photo. */}
      {cosmetiques.cadre && (
        <span
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -debordCadre,
            padding: epaisseurCadre,
            background: "linear-gradient(140deg,#FFE9A8,#E8A015 45%,#FFD34E)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            maskComposite: "exclude",
            boxShadow: `0 0 ${Math.max(6, size / 9)}px rgba(232,160,21,0.45)`,
          }}
        />
      )}

      {/* Anneau animé — un arc aux couleurs du rang qui tourne autour de la photo. */}
      {cosmetiques.anneau && (
        <motion.svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="absolute pointer-events-none"
          style={{ inset: -debordAnneau, width: "auto", height: "auto" }}
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
  classNameEnveloppe = "inline-flex items-center gap-1.5",
  style,
  tailleGemme = 18,
}: {
  rang: Rang;
  cosmetiques: Cosmetiques;
  pseudo: string;
  /** Classes du TEXTE (c'est lui qui tronque dans une liste). */
  className?: string;
  /** Classes de l'enveloppe, à surcharger dans une ligne qui tronque
   *  (« flex min-w-0 items-center gap-1.5 »). */
  classNameEnveloppe?: string;
  style?: CSSProperties;
  tailleGemme?: number;
}) {
  return (
    <span className={classNameEnveloppe}>
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

/**
 * Le pseudo scintillant de l'Éternel. Sans la récompense : texte normal.
 *
 * ⚠️ L'animation est 100 % CSS (`.pseudo-brillant` dans `globals.css`), surtout
 * PAS framer-motion : la première version pilotait `backgroundPosition` en JS et
 * saccadait dès que le fil principal travaillait (retour de séance, ouverture
 * d'un fil). Le raccord de boucle est traité côté CSS. Ne pas repasser en JS.
 */
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
  if (!brillant) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  // `color` viendrait écraser la transparence qui laisse voir le dégradé.
  const reste: CSSProperties = { ...style };
  delete reste.color;
  return (
    <span className={`pseudo-brillant${className ? ` ${className}` : ""}`} style={reste}>
      {children}
    </span>
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
