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

  // sm = profil horizontal scroll (narrow card, compact)
  // md = communauté feed (full-width, auto-height)
  // lg = share modal (portrait fixed ratio)
  const heroFontSize =
    size === "sm" ? "1.6rem" :
    size === "lg" ? "clamp(2.8rem,9vw,4rem)" :
    "clamp(2rem,5vw,2.8rem)";

  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(160deg, #0D0D1A 0%, #170D2A 50%, #0B1820 100%)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 4px 24px rgba(249,168,201,0.08)",
    ...(size === "lg" ? { aspectRatio: "4 / 5" } : {}),
  };

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
      <div className="relative z-10 flex flex-col h-full p-6">

        {/* Top row — type badge + date */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${accent}18`, border: `1px solid ${accent}38` }}
            >
              <Icon size={14} strokeWidth={1.5} style={{ color: accent }} />
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

        {/* Hero metric */}
        {hero && (
          <div className={size === "sm" ? "py-3" : "flex-1 flex flex-col justify-center py-2"}>
            <p
              className="text-[9px] font-bold tracking-[0.25em] uppercase mb-1.5"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {hero.label}
            </p>
            <div className="flex items-end gap-2 mb-3">
              <span
                className="font-extralight leading-none whitespace-nowrap"
                style={{ color: "#FFFFFF", fontSize: heroFontSize }}
              >
                {hero.value}
              </span>
              {hero.unit && (
                <span className="text-base font-light mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {hero.unit}
                </span>
              )}
            </div>
            <p className="text-[13px] font-light leading-snug" style={{ color: "rgba(255,255,255,0.55)" }}>
              {data.title}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px my-4" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Sub metrics */}
        {subs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {subs.slice(0, 3).map((m) => (
              <div key={m.label}>
                <p
                  className="text-[9px] font-semibold tracking-widest uppercase mb-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {m.label}
                </p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-base font-light" style={{ color: "#FFFFFF" }}>
                    {m.value}
                  </span>
                  {m.unit && (
                    <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>
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
            className="rounded-2xl px-3 py-2 flex items-center gap-2 mb-4"
            style={{ background: `${accent}12`, border: `1px solid ${accent}22` }}
          >
            <Activity size={10} strokeWidth={2} style={{ color: accent }} />
            <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
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
