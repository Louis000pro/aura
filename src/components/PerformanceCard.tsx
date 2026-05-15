"use client";

import { motion } from "framer-motion";
import { Dumbbell, Apple, Sun } from "lucide-react";
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
  icon:  LucideIcon;
  label: string;
  bg:    string;
}> = {
  workout: {
    icon:  Dumbbell,
    label: "Séance",
    bg:    "linear-gradient(145deg, #3B0F8C 0%, #5B21B6 55%, #7C3AED 100%)",
  },
  meal: {
    icon:  Apple,
    label: "Repas",
    bg:    "linear-gradient(145deg, #065F46 0%, #059669 55%, #10B981 100%)",
  },
  day: {
    icon:  Sun,
    label: "Journée",
    bg:    "linear-gradient(145deg, #92400E 0%, #B45309 55%, #D97706 100%)",
  },
};

export default function PerformanceCard({
  data,
  size = "md",
  interactive = false,
}: {
  data:        PerformanceData;
  size?:       "sm" | "md" | "lg";
  interactive?: boolean;
}) {
  const { icon: Icon, label, bg } = config[data.type];
  const [hero, ...subs] = data.metrics;
  const isSmall = size === "sm";

  const heroSize = isSmall ? "2.2rem" : "clamp(3.2rem, 9vw, 4.5rem)";
  const px       = isSmall ? "px-4"   : "px-6";
  const py       = isSmall ? "py-4"   : "py-5";

  return (
    <motion.div
      whileHover={interactive ? { y: -3, scale: 1.012 } : undefined}
      transition={{ duration: 0.2 }}
      className={`relative rounded-3xl overflow-hidden flex flex-col ${px} ${py}`}
      style={{
        background:   bg,
        boxShadow:    "0 16px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)",
        gap:          isSmall ? 12 : 16,
        ...(isSmall ? { aspectRatio: "2 / 3" } : {}),
      }}
    >
      {/* Single top-edge highlight */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: "rgba(255,255,255,0.28)" }} />
      {/* Left-side inner highlight */}
      <div className="absolute inset-y-0 left-0 w-24 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)" }} />

      {/* ── Top row ── */}
      <div className="flex items-center justify-between relative z-10">
        <div
          className="flex items-center gap-1.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.18)",
            border:     "1px solid rgba(255,255,255,0.22)",
            padding:    isSmall ? "4px 10px" : "5px 12px",
          }}
        >
          <Icon
            size={isSmall ? 11 : 13}
            strokeWidth={2}
            style={{ color: "#fff" }}
          />
          <span
            className="font-bold text-white tracking-[0.2em] uppercase"
            style={{ fontSize: isSmall ? "0.5rem" : "0.58rem" }}
          >
            {label}
          </span>
        </div>

        <span
          className="font-light"
          style={{ color: "rgba(255,255,255,0.6)", fontSize: isSmall ? "0.58rem" : "0.68rem" }}
        >
          {data.date}
        </span>
      </div>

      {/* ── Hero metric ── */}
      {hero && (
        <div className={`relative z-10 ${isSmall ? "flex-1 flex flex-col justify-center" : ""}`}>
          <p
            className="font-semibold tracking-[0.24em] uppercase mb-2"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: isSmall ? "0.5rem" : "0.58rem" }}
          >
            {hero.label}
          </p>

          <div className="flex items-end gap-2 mb-2">
            <span
              className="font-bold leading-none text-white"
              style={{ fontSize: heroSize, letterSpacing: "-0.02em" }}
            >
              {hero.value}
            </span>
            {hero.unit && (
              <span
                className="font-normal leading-none"
                style={{
                  color:      "rgba(255,255,255,0.55)",
                  fontSize:   isSmall ? "0.9rem" : "1.25rem",
                  marginBottom: isSmall ? "0.25rem" : "0.5rem",
                }}
              >
                {hero.unit}
              </span>
            )}
          </div>

          <p
            className="font-medium"
            style={{ color: "rgba(255,255,255,0.72)", fontSize: isSmall ? "0.7rem" : "0.88rem" }}
          >
            {data.title}
          </p>
        </div>
      )}

      {/* ── Separator ── */}
      <div className="relative z-10 h-px w-full" style={{ background: "rgba(255,255,255,0.2)" }} />

      {/* ── Sub metrics ── */}
      {subs.length > 0 && (
        <div
          className="relative z-10 grid"
          style={{ gridTemplateColumns: `repeat(${Math.min(subs.length, 3)}, 1fr)`, gap: isSmall ? 8 : 12 }}
        >
          {subs.slice(0, 3).map((m) => (
            <div key={m.label}>
              <p
                className="font-semibold tracking-[0.2em] uppercase mb-1"
                style={{ color: "rgba(255,255,255,0.52)", fontSize: isSmall ? "0.44rem" : "0.52rem" }}
              >
                {m.label}
              </p>
              <div className="flex items-baseline gap-0.5">
                <span
                  className="font-bold text-white"
                  style={{ fontSize: isSmall ? "1.05rem" : "1.3rem" }}
                >
                  {m.value}
                </span>
                {m.unit && (
                  <span
                    className="font-normal"
                    style={{ color: "rgba(255,255,255,0.48)", fontSize: "0.58rem" }}
                  >
                    {m.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Branding ── */}
      <div className="relative z-10 flex items-center justify-between mt-auto">
        <div />
        <span
          className="font-black text-white tracking-[0.42em] uppercase"
          style={{ fontSize: isSmall ? "0.52rem" : "0.62rem", opacity: 0.85 }}
        >
          ✦ AURA
        </span>
      </div>
    </motion.div>
  );
}
