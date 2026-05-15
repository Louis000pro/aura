"use client";

import { motion } from "framer-motion";
import { Dumbbell, Apple, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PerformanceType = "workout" | "meal" | "day";

export type PerformanceData = {
  type:     PerformanceType;
  title:    string;
  date:     string;
  metrics:  { label: string; value: string; unit?: string }[];
  highlight?: string;
};

/** Gradient presets — used as solid background when no photo */
export const GRADIENT_PRESETS: { key: string; bg: string; name: string }[] = [
  { key: "violet",  bg: "linear-gradient(145deg, #3B0F8C 0%, #5B21B6 55%, #7C3AED 100%)", name: "Violet" },
  { key: "indigo",  bg: "linear-gradient(145deg, #1E1B8B 0%, #3730A3 55%, #4F46E5 100%)", name: "Indigo" },
  { key: "rose",    bg: "linear-gradient(145deg, #881337 0%, #BE123C 55%, #E11D48 100%)", name: "Rose" },
  { key: "coral",   bg: "linear-gradient(145deg, #7F1D1D 0%, #B91C1C 55%, #EF4444 100%)", name: "Corail" },
  { key: "emerald", bg: "linear-gradient(145deg, #065F46 0%, #059669 55%, #10B981 100%)", name: "Vert" },
  { key: "sky",     bg: "linear-gradient(145deg, #0C4A6E 0%, #0369A1 55%, #0EA5E9 100%)", name: "Bleu" },
  { key: "amber",   bg: "linear-gradient(145deg, #92400E 0%, #B45309 55%, #D97706 100%)", name: "Ambre" },
  { key: "slate",   bg: "linear-gradient(145deg, #0F172A 0%, #1E293B 55%, #334155 100%)", name: "Ardoise" },
];

/** Photo filters — CSS filter strings applied to the background image */
export const PHOTO_FILTER_PRESETS: { key: string; name: string; filter: string }[] = [
  { key: "aura",    name: "Aura",    filter: "brightness(1.05) contrast(1.08) saturate(1.15)" },
  { key: "golden",  name: "Golden",  filter: "brightness(1.1) sepia(0.45) saturate(1.5) hue-rotate(-5deg)" },
  { key: "bloom",   name: "Bloom",   filter: "brightness(1.18) contrast(0.85) saturate(0.88)" },
  { key: "core",    name: "Core",    filter: "contrast(1.28) saturate(1.2) brightness(0.98)" },
  { key: "velvet",  name: "Velvet",  filter: "contrast(0.9) saturate(0.75) brightness(1.1) sepia(0.15)" },
  { key: "nova",    name: "Nova",    filter: "saturate(1.75) contrast(1.12) brightness(1.06) hue-rotate(5deg)" },
  { key: "noir",    name: "Noir",    filter: "grayscale(1) contrast(1.25) brightness(1.05)" },
  { key: "pulse",   name: "Pulse",   filter: "saturate(2.0) contrast(1.2) brightness(1.05)" },
  { key: "mocha",   name: "Mocha",   filter: "sepia(0.4) saturate(1.2) brightness(1.06) hue-rotate(5deg)" },
  { key: "ice",     name: "Ice",     filter: "brightness(1.12) saturate(0.5) contrast(1.06)" },
  { key: "burn",    name: "Burn",    filter: "contrast(1.4) saturate(1.5) brightness(0.9)" },
  { key: "dream",   name: "Dream",   filter: "brightness(1.15) saturate(0.8) contrast(0.85)" },
  { key: "vintage", name: "Vintage", filter: "sepia(0.55) contrast(0.88) brightness(1.08) saturate(0.72)" },
  { key: "neon",    name: "Neon",    filter: "brightness(1.05) saturate(2.2) contrast(1.25) hue-rotate(8deg)" },
  { key: "pure",    name: "Pure",    filter: "brightness(1.01) contrast(1.01) saturate(1.0)" },
  { key: "titan",   name: "Titan",   filter: "contrast(1.6) brightness(0.86) saturate(1.3)" },
  { key: "sunset",  name: "Sunset",  filter: "hue-rotate(-25deg) saturate(1.65) brightness(1.12) sepia(0.18)" },
  { key: "mono",    name: "Mono",    filter: "grayscale(0.88) contrast(1.18) brightness(1.04)" },
  { key: "prism",   name: "Prism",   filter: "saturate(2.0) brightness(1.1) hue-rotate(18deg) contrast(1.1)" },
  { key: "halo",    name: "Halo",    filter: "brightness(1.25) contrast(0.8) saturate(1.1)" },
];

const typeDefaults: Record<PerformanceType, { icon: LucideIcon; label: string; gradientKey: string }> = {
  workout: { icon: Dumbbell, label: "Séance",   gradientKey: "violet"  },
  meal:    { icon: Apple,    label: "Repas",     gradientKey: "emerald" },
  day:     { icon: Sun,      label: "Journée",   gradientKey: "amber"   },
};

export default function PerformanceCard({
  data,
  size        = "md",
  interactive = false,
  customBg,
  customBgImage,
  photoFilter,
  heroIndex   = 0,
  shownIndices,
}: {
  data:           PerformanceData;
  size?:          "sm" | "md" | "lg";
  interactive?:   boolean;
  /** Solid gradient background (used when no photo). */
  customBg?:      string;
  /** Photo background — image URL or data URL. */
  customBgImage?: string;
  /** CSS filter string to apply to the background photo (from PHOTO_FILTER_PRESETS). */
  photoFilter?:   string;
  /** Which metric index to display as the hero (large number). Default 0 */
  heroIndex?:     number;
  /** Which metric indices to show in the sub-grid. Undefined = all non-hero */
  shownIndices?:  number[];
}) {
  const { icon: Icon, label } = typeDefaults[data.type];
  const defaultBg = GRADIENT_PRESETS.find(p => p.key === typeDefaults[data.type].gradientKey)?.bg ?? GRADIENT_PRESETS[0].bg;
  const bg = customBg ?? defaultBg;

  const hasPhoto = !!customBgImage;
  // Text shadow for readability on photo
  const ts = hasPhoto ? "0 1px 10px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.5)" : undefined;

  // Resolve metrics
  const all  = data.metrics;
  const hero = all[heroIndex] ?? all[0];
  const subs = shownIndices !== undefined
    ? shownIndices.filter(i => i !== heroIndex && i < all.length).map(i => all[i])
    : all.filter((_, i) => i !== heroIndex);

  const isSmall  = size === "sm";
  const heroSize = isSmall ? "2.2rem" : "clamp(3.2rem, 9vw, 4.5rem)";
  const px       = isSmall ? "px-4" : "px-6";
  const py       = isSmall ? "py-4" : "py-5";

  return (
    <motion.div
      whileHover={interactive ? { y: -3, scale: 1.012 } : undefined}
      transition={{ duration: 0.2 }}
      className={`relative rounded-3xl overflow-hidden flex flex-col ${px} ${py}`}
      style={{
        background: hasPhoto ? "#111" : bg,
        boxShadow:  "0 16px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)",
        gap:        isSmall ? 12 : 16,
        ...(isSmall ? { aspectRatio: "2 / 3" } : {}),
      }}
    >
      {/* ── Photo background ── */}
      {customBgImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={customBgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0, filter: photoFilter ?? "none" }}
        />
      )}

      {/* ── Solid gradient (no photo) ── */}
      {!hasPhoto && (
        <div className="absolute inset-0" style={{ background: bg, zIndex: 1 }} />
      )}

      {/* ── Photo vignette (top + bottom) for text readability ── */}
      {hasPhoto && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, transparent 40%, transparent 58%, rgba(0,0,0,0.65) 100%)",
            zIndex: 2,
          }}
        />
      )}

      {/* ── Decorative highlights (solid-gradient mode only) ── */}
      {!hasPhoto && (
        <>
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: "rgba(255,255,255,0.28)", zIndex: 2 }} />
          <div className="absolute inset-y-0 left-0 w-24 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)", zIndex: 2 }} />
        </>
      )}

      {/* ── Top row ── */}
      <div className="flex items-center justify-between relative z-10">
        <div
          className="flex items-center gap-1.5 rounded-full"
          style={{
            background:     hasPhoto ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.18)",
            border:         `1px solid ${hasPhoto ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.22)"}`,
            padding:        isSmall ? "4px 10px" : "5px 12px",
            backdropFilter: hasPhoto ? "blur(6px)" : undefined,
          }}
        >
          <Icon size={isSmall ? 11 : 13} strokeWidth={2} style={{ color: "#fff" }} />
          <span className="font-bold text-white tracking-[0.2em] uppercase" style={{ fontSize: isSmall ? "0.5rem" : "0.58rem", textShadow: ts }}>
            {label}
          </span>
        </div>
        <span className="font-light" style={{ color: "rgba(255,255,255,0.85)", fontSize: isSmall ? "0.58rem" : "0.68rem", textShadow: ts }}>
          {data.date}
        </span>
      </div>

      {/* ── Hero metric ── */}
      {hero && (
        <div className={`relative z-10 ${isSmall ? "flex-1 flex flex-col justify-center" : ""}`}>
          <p className="font-semibold tracking-[0.24em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.75)", fontSize: isSmall ? "0.5rem" : "0.58rem", textShadow: ts }}>
            {hero.label}
          </p>
          <div className="flex items-end gap-2 mb-2">
            <span className="font-bold leading-none text-white" style={{ fontSize: heroSize, letterSpacing: "-0.02em", textShadow: ts }}>
              {hero.value}
            </span>
            {hero.unit && (
              <span className="font-normal leading-none" style={{ color: "rgba(255,255,255,0.7)", fontSize: isSmall ? "0.9rem" : "1.25rem", marginBottom: isSmall ? "0.25rem" : "0.5rem", textShadow: ts }}>
                {hero.unit}
              </span>
            )}
          </div>
          <p className="font-medium" style={{ color: "rgba(255,255,255,0.85)", fontSize: isSmall ? "0.7rem" : "0.88rem", textShadow: ts }}>
            {data.title}
          </p>
        </div>
      )}

      {/* ── Separator ── */}
      {subs.length > 0 && (
        <div className="relative z-10 h-px w-full" style={{ background: "rgba(255,255,255,0.25)" }} />
      )}

      {/* ── Sub metrics ── */}
      {subs.length > 0 && (
        <div
          className="relative z-10 grid"
          style={{ gridTemplateColumns: `repeat(${Math.min(subs.length, 3)}, 1fr)`, gap: isSmall ? 8 : 12 }}
        >
          {subs.slice(0, 3).map((m) => (
            <div key={m.label}>
              <p className="font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.65)", fontSize: isSmall ? "0.44rem" : "0.52rem", textShadow: ts }}>
                {m.label}
              </p>
              <div className="flex items-baseline gap-0.5">
                <span className="font-bold text-white" style={{ fontSize: isSmall ? "1.05rem" : "1.3rem", textShadow: ts }}>
                  {m.value}
                </span>
                {m.unit && (
                  <span className="font-normal" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.58rem", textShadow: ts }}>
                    {m.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Branding ── */}
      <div className="relative z-10 flex items-center justify-end mt-auto">
        <span
          className="font-black text-white tracking-[0.42em] uppercase"
          style={{ fontSize: isSmall ? "0.52rem" : "0.62rem", opacity: 0.85, textShadow: ts }}
        >
          ✦ AURA
        </span>
      </div>
    </motion.div>
  );
}
