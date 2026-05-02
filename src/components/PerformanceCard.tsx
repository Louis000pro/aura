"use client";

import { motion } from "framer-motion";
import { Dumbbell, Apple, Sun, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PerformanceType = "workout" | "meal" | "day";

export type PerformanceData = {
  type: PerformanceType;
  title: string;
  date: string;
  metrics: { label: string; value: string; unit?: string }[];
  highlight?: string;
};

const themes: Record<PerformanceType, { icon: LucideIcon; gradient: string; tagBg: string; tagColor: string; label: string }> = {
  workout: {
    icon: Dumbbell,
    gradient: "linear-gradient(135deg, #FFF0F5 0%, #FFD6E7 60%, #B2F0F0 100%)",
    tagBg: "rgba(255,255,255,0.65)",
    tagColor: "#F9A8C9",
    label: "Séance",
  },
  meal: {
    icon: Apple,
    gradient: "linear-gradient(135deg, #E0FFFF 0%, #B2F0F0 60%, #FFF0F5 100%)",
    tagBg: "rgba(255,255,255,0.65)",
    tagColor: "#7ED8D8",
    label: "Repas",
  },
  day: {
    icon: Sun,
    gradient: "linear-gradient(135deg, #FFF0F5 0%, #E0FFFF 50%, #FFD6E7 100%)",
    tagBg: "rgba(255,255,255,0.65)",
    tagColor: "#F9A8C9",
    label: "Journée",
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
  const theme = themes[data.type];
  const Icon = theme.icon;

  const sizing = {
    sm: { p: "p-4", title: "text-base", value: "text-xl", label: "text-[9px]" },
    md: { p: "p-6", title: "text-lg", value: "text-2xl", label: "text-[10px]" },
    lg: { p: "p-8", title: "text-2xl", value: "text-4xl", label: "text-xs" },
  }[size];

  return (
    <motion.div
      whileHover={interactive ? { y: -3, scale: 1.01 } : undefined}
      transition={{ duration: 0.3 }}
      className={`relative rounded-3xl overflow-hidden aspect-square ${sizing.p}`}
      style={{
        background: theme.gradient,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 32px -8px rgba(249,168,201,0.25)",
      }}
    >
      {/* Decorative blob */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%)", filter: "blur(20px)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, rgba(255,214,231,0.6) 0%, transparent 70%)", filter: "blur(30px)" }}
      />

      {/* Top row */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.7)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <Icon size={16} strokeWidth={1.5} style={{ color: theme.tagColor }} />
          </div>
          <span
            className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: theme.tagBg, color: theme.tagColor }}
          >
            {theme.label}
          </span>
        </div>
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.6)" }}
        >
          <span className="text-[9px] font-light tracking-wider" style={{ color: "#2D3748" }}>
            ✦
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 mt-4">
        <p className={`${sizing.label} font-medium tracking-wider uppercase`} style={{ color: "#A0AEC0" }}>
          {data.date}
        </p>
        <h3 className={`${sizing.title} font-semibold mt-0.5 leading-tight`} style={{ color: "#2D3748" }}>
          {data.title}
        </h3>
      </div>

      {/* Metrics */}
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
        {data.metrics.slice(0, 4).map((m) => (
          <div
            key={m.label}
            className="rounded-2xl p-3"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(8px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <p className={`${sizing.label} font-medium`} style={{ color: "#718096" }}>
              {m.label}
            </p>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className={`${sizing.value} font-semibold leading-none`} style={{ color: "#2D3748" }}>
                {m.value}
              </span>
              {m.unit && (
                <span className="text-[10px] font-medium" style={{ color: "#718096" }}>
                  {m.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Highlight */}
      {data.highlight && (
        <div
          className="relative z-10 mt-4 rounded-2xl p-3 flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(8px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <TrendingUp size={12} strokeWidth={2} style={{ color: theme.tagColor }} />
          <span className="text-[11px] font-medium" style={{ color: "#2D3748" }}>
            {data.highlight}
          </span>
        </div>
      )}

      {/* Aura watermark */}
      <div className="absolute bottom-3 right-4 text-[9px] font-semibold tracking-[0.2em] uppercase z-10" style={{ color: "rgba(45,55,72,0.4)" }}>
        Aura
      </div>
    </motion.div>
  );
}
