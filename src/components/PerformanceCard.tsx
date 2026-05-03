"use client";

import { motion } from "framer-motion";
import { Dumbbell, Apple, Sun, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PerformanceType = "workout" | "meal" | "day";

export type PerformanceData = {
  type: PerformanceType;
  title: string;
  date: string;
  metrics: { label: string; value: string; unit?: string }[];
  highlight?: string;
};

const config: Record<PerformanceType, { icon: LucideIcon; accent: string; label: string }> = {
  workout: { icon: Dumbbell, accent: "#F9A8C9", label: "Séance" },
  meal:    { icon: Apple,    accent: "#7ED8D8", label: "Repas" },
  day:     { icon: Sun,      accent: "#FBBF24", label: "Journée" },
};

export default function PerformanceCard({
  data,
  size = "md",
  interactive = false,
}: {
  data: PerformanceData;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}) {
  const { icon: Icon, accent, label } = config[data.type];
  const [hero, ...subs] = data.metrics;

  // sm  = profil scroll horizontal (card étroite ~180px, ratio 2/3)
  // md  = communauté feed (pleine largeur, ratio 4/5)
  // lg  = modal de partage (ratio 4/5 large)
  const isSmall = size === "sm";

  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(160deg, #0D0D1A 0%, #170D2A 50%, #0B1820 100%)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 4px 24px rgba(249,168,201,0.08)",
    aspectRatio: isSmall ? "2 / 3" : "4 / 5",
  };

  const heroFontSize = isSmall ? "1.55rem" : "clamp(2.4rem, 6vw, 3.4rem)";
  const pad = isSmall ? "p-4" : "p-6";
  const gapY = isSmall ? "my-3" : "my-4";
  const subMb = isSmall ? "mb-3" : "mb-4";
  const hlMb  = isSmall ? "mb-2" : "mb-4";

  return (
    <motion.div
      whileHover={interactive ? { y: -4, scale: 1.015 } : undefined}
      transition={{ duration: 0.25 }}
      className="relative rounded-3xl overflow-hidden"
      style={cardStyle}
    >
      {/* Ambient glows */}
      <div
        className="absolute -top-24 -left-24 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 65%)` }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(126,216,216,0.1) 0%, transparent 65%)" }}
      />

      {/* Top shimmer border */}
      <div
        className="absolute top-0 left-8 right-8 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }}
      />

      {/* Content */}
      <div className={`relative z-10 flex flex-col h-full ${pad}`}>

        {/* Top row — type badge + date */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: `${accent}18`, border: `1px solid ${accent}38` }}
            >
              <Icon size={isSmall ? 12 : 14} strokeWidth={1.5} style={{ color: accent }} />
            </div>
            <span
              className="text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: accent }}
            >
              {label}
            </span>
          </div>
          <span className="text-[10px] font-light tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
            {data.date}
          </span>
        </div>

        {/* Hero metric — flex-1 pour centrer verticalement */}
        {hero && (
          <div className="flex-1 flex flex-col justify-center">
            <p
              className="text-[9px] font-bold tracking-[0.25em] uppercase mb-1"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {hero.label}
            </p>
            <div className="flex items-end gap-1.5 mb-2">
              <span
                className="font-extralight leading-none whitespace-nowrap"
                style={{ color: "#FFFFFF", fontSize: heroFontSize }}
              >
                {hero.value}
              </span>
              {hero.unit && (
                <span
                  className="font-light mb-1"
                  style={{ color: "rgba(255,255,255,0.4)", fontSize: isSmall ? "0.75rem" : "1rem" }}
                >
                  {hero.unit}
                </span>
              )}
            </div>
            <p
              className="font-light leading-snug"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: isSmall ? "0.7rem" : "0.8rem" }}
            >
              {data.title}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className={`h-px ${gapY}`} style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Sub metrics */}
        {subs.length > 0 && (
          <div className={`grid grid-cols-3 gap-2 ${subMb}`}>
            {subs.slice(0, 3).map((m) => (
              <div key={m.label}>
                <p
                  className="text-[8px] font-semibold tracking-widest uppercase mb-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {m.label}
                </p>
                <div className="flex items-baseline gap-0.5">
                  <span
                    className="font-light"
                    style={{ color: "#FFFFFF", fontSize: isSmall ? "0.85rem" : "1rem" }}
                  >
                    {m.value}
                  </span>
                  {m.unit && (
                    <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {m.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Highlight */}
        {data.highlight && (
          <div
            className={`rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 ${hlMb}`}
            style={{ background: `${accent}12`, border: `1px solid ${accent}22` }}
          >
            <Activity size={9} strokeWidth={2} style={{ color: accent }} />
            <span
              className="font-medium leading-tight"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: isSmall ? "0.6rem" : "0.625rem" }}
            >
              {data.highlight}
            </span>
          </div>
        )}

        {/* Branding */}
        <div className="flex items-center">
          <div className="h-px flex-1 mr-3" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span
            className="text-[9px] font-bold tracking-[0.45em] uppercase"
            style={{
              background: `linear-gradient(135deg, ${accent}, #7ED8D8)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AURA
          </span>
        </div>
      </div>
    </motion.div>
  );
}
