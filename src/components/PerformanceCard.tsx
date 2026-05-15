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

const config: Record<PerformanceType, {
  icon: LucideIcon;
  accent: string;
  label: string;
  grad: string;
  glow: string;
}> = {
  workout: {
    icon: Dumbbell,
    accent: "#F9A8C9",
    label: "Séance",
    grad: "linear-gradient(135deg, #F9A8C9 0%, #C4A0FF 100%)",
    glow: "rgba(249,168,201,0.5)",
  },
  meal: {
    icon: Apple,
    accent: "#7ED8D8",
    label: "Repas",
    grad: "linear-gradient(135deg, #7ED8D8 0%, #60D8A0 100%)",
    glow: "rgba(126,216,216,0.5)",
  },
  day: {
    icon: Sun,
    accent: "#FBBF24",
    label: "Journée",
    grad: "linear-gradient(135deg, #FBBF24 0%, #F97316 100%)",
    glow: "rgba(251,191,36,0.5)",
  },
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
  const { icon: Icon, accent, label, grad, glow } = config[data.type];
  const [hero, ...subs] = data.metrics;
  const isSmall = size === "sm";
  const pad = isSmall ? "p-4" : "p-5";
  const heroFontSize = isSmall ? "1.55rem" : "clamp(2.8rem, 6vw, 3.6rem)";

  return (
    <motion.div
      whileHover={interactive ? { y: -4, scale: 1.015 } : undefined}
      transition={{ duration: 0.25 }}
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #07060F 0%, #0F0A1C 40%, #08101A 100%)",
        boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 4px 32px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.05)`,
        ...(isSmall ? { aspectRatio: "2 / 3" } : {}),
      }}
    >
      {/* ── Ambient glows ── */}
      <div className="absolute pointer-events-none" style={{
        top: -100, left: -80, width: 320, height: 320,
        background: `radial-gradient(circle, ${accent}2A 0%, transparent 60%)`,
        filter: "blur(24px)",
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: -80, right: -80, width: 280, height: 280,
        background: "radial-gradient(circle, rgba(90,160,200,0.10) 0%, transparent 60%)",
        filter: "blur(20px)",
      }} />
      <div className="absolute pointer-events-none" style={{
        top: "35%", left: "20%", width: 220, height: 220,
        background: `radial-gradient(circle, rgba(120,80,180,0.07) 0%, transparent 65%)`,
        filter: "blur(28px)",
      }} />

      {/* ── Top prismatic shimmer ── */}
      <div className="absolute top-0 inset-x-0 h-px pointer-events-none" style={{
        background: `linear-gradient(90deg, transparent 0%, ${accent}40 25%, rgba(255,255,255,0.35) 50%, ${accent}40 75%, transparent 100%)`,
      }} />
      {/* ── Second subtle rim ── */}
      <div className="absolute top-px inset-x-0 h-px pointer-events-none" style={{
        background: `linear-gradient(90deg, transparent 10%, ${accent}12 50%, transparent 90%)`,
      }} />

      {/* ── Decorative arcs — bottom-right corner ── */}
      {!isSmall && (
        <svg className="absolute bottom-0 right-0 pointer-events-none" width="120" height="120" viewBox="0 0 120 120" fill="none">
          {[55, 75, 95, 112].map((r, i) => (
            <circle key={r} cx="120" cy="120" r={r}
              stroke={`${accent}`}
              strokeWidth={i === 0 ? "0.8" : "0.5"}
              strokeOpacity={[0.2, 0.12, 0.08, 0.05][i]}
              fill="none"
            />
          ))}
          {/* Tiny accent dot on first arc */}
          <circle cx="120" cy="65" r="2" fill={accent} opacity="0.4" />
        </svg>
      )}

      {/* ── Horizontal scan line ── */}
      {!isSmall && (
        <div className="absolute inset-x-0 pointer-events-none" style={{
          top: "36%", height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${accent}18 30%, transparent 100%)`,
        }} />
      )}

      {/* ── Content ── */}
      <div className={`relative z-10 flex flex-col h-full ${pad}`}>

        {/* Top row — type badge + date */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-2 rounded-xl"
            style={{
              background: `${accent}14`,
              border: `1px solid ${accent}30`,
              padding: isSmall ? "5px 10px" : "6px 12px",
              backdropFilter: "blur(8px)",
            }}
          >
            <Icon size={isSmall ? 11 : 13} strokeWidth={1.5} style={{ color: accent }} />
            <span
              className="font-bold tracking-[0.22em] uppercase"
              style={{ color: accent, fontSize: isSmall ? "0.5rem" : "0.58rem" }}
            >
              {label}
            </span>
          </div>
          <span
            className="font-light tracking-wider"
            style={{ color: "rgba(255,255,255,0.22)", fontSize: isSmall ? "0.55rem" : "0.62rem" }}
          >
            {data.date}
          </span>
        </div>

        {/* Hero metric */}
        {hero && (
          <div className={isSmall ? "flex-1 flex flex-col justify-center" : "py-2"}>
            <p
              className="font-bold tracking-[0.30em] uppercase mb-2"
              style={{ color: "rgba(255,255,255,0.25)", fontSize: isSmall ? "0.48rem" : "0.58rem" }}
            >
              {hero.label}
            </p>
            <div className="flex items-end gap-2 mb-2.5">
              <span
                className="font-extralight leading-none whitespace-nowrap"
                style={{
                  fontSize: heroFontSize,
                  color: "#FFFFFF",
                  textShadow: `0 0 32px ${glow}, 0 0 64px ${glow.replace("0.5", "0.25")}`,
                  letterSpacing: "-0.02em",
                }}
              >
                {hero.value}
              </span>
              {hero.unit && (
                <span
                  className="font-light"
                  style={{
                    color: "rgba(255,255,255,0.32)",
                    fontSize: isSmall ? "0.72rem" : "1rem",
                    marginBottom: isSmall ? "0.2rem" : "0.4rem",
                  }}
                >
                  {hero.unit}
                </span>
              )}
            </div>
            <p
              className="font-light leading-snug"
              style={{ color: "rgba(255,255,255,0.42)", fontSize: isSmall ? "0.68rem" : "0.78rem" }}
            >
              {data.title}
            </p>
          </div>
        )}

        {/* Divider with gradient */}
        <div
          className="h-px"
          style={{
            margin: isSmall ? "12px 0" : "16px 0",
            background: `linear-gradient(90deg, transparent 0%, ${accent}35 30%, rgba(255,255,255,0.12) 50%, ${accent}35 70%, transparent 100%)`,
          }}
        />

        {/* Sub metrics — individual pill containers */}
        {subs.length > 0 && (
          <div className={`grid gap-2 ${isSmall ? "mb-3" : "mb-3"}`}
            style={{ gridTemplateColumns: `repeat(${Math.min(subs.length, 3)}, 1fr)` }}>
            {subs.slice(0, 3).map((m) => (
              <div
                key={m.label}
                className="rounded-xl flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.032)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: isSmall ? "6px 8px" : "8px 10px",
                }}
              >
                <p
                  className="font-bold tracking-widest uppercase mb-1"
                  style={{ color: "rgba(255,255,255,0.22)", fontSize: isSmall ? "0.42rem" : "0.48rem" }}
                >
                  {m.label}
                </p>
                <div className="flex items-baseline gap-0.5">
                  <span
                    className="font-light"
                    style={{ color: "rgba(255,255,255,0.82)", fontSize: isSmall ? "0.85rem" : "1rem" }}
                  >
                    {m.value}
                  </span>
                  {m.unit && (
                    <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "0.5rem" }}>
                      {m.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Highlight badge */}
        {data.highlight && (
          <div
            className="rounded-xl flex items-center gap-1.5"
            style={{
              background: `${accent}0E`,
              border: `1px solid ${accent}20`,
              padding: isSmall ? "5px 10px" : "6px 12px",
              marginBottom: isSmall ? 10 : 12,
            }}
          >
            <Activity size={isSmall ? 8 : 9} strokeWidth={2} style={{ color: accent, flexShrink: 0 }} />
            <span
              className="font-medium leading-tight"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: isSmall ? "0.58rem" : "0.65rem" }}
            >
              {data.highlight}
            </span>
          </div>
        )}

        {/* Branding — centered with flanking lines */}
        <div className="flex items-center gap-3 mt-auto">
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.08))` }} />
          <span
            className="font-black tracking-[0.5em] uppercase flex-shrink-0"
            style={{
              fontSize: isSmall ? "0.5rem" : "0.6rem",
              background: grad,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ✦ AURA
          </span>
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, rgba(255,255,255,0.08), transparent)` }} />
        </div>
      </div>
    </motion.div>
  );
}
