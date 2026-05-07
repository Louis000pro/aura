"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import type { StatData } from "@/data/statsData";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function StatDetailModal({
  stat,
  onClose,
}: {
  stat: StatData;
  onClose: () => void;
}) {
  const {
    icon: Icon,
    label,
    value,
    unit,
    target,
    progress,
    trend,
    trendUp,
    iconColor,
    barGradient,
    description,
    importance,
    weekData,
    weekMax,
    breakdown,
    tip,
    todayIndex,
  } = stat;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-4 md:pb-0"
      style={{ background: "rgba(240,235,255,0.45)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl"
        style={{
          background: "rgba(255,255,255,0.93)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 24px 64px rgba(167,139,250,0.18), inset 0 1px 0 rgba(255,255,255,0.95)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(212,192,255,0.18)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <Icon size={18} strokeWidth={1.5} style={{ color: iconColor }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                  Statistique
                </p>
                <p className="text-base font-medium" style={{ color: "#2D3748" }}>
                  {label}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: "rgba(240,235,255,0.8)" }}
            >
              <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
            </motion.button>
          </div>

          {/* Big value + trend */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-4xl font-extralight" style={{ color: "#2D3748" }}>
              {value}
            </span>
            {unit && (
              <span className="text-sm font-medium" style={{ color: "#718096" }}>
                {unit}
              </span>
            )}
            <span
              className="ml-auto flex items-center gap-1"
              style={{ color: trendUp ? "#D4A843" : "#A78BFA" }}
            >
              {trendUp ? (
                <TrendingUp size={14} strokeWidth={2} />
              ) : (
                <TrendingDown size={14} strokeWidth={2} />
              )}
              <span className="text-sm font-semibold">{trend}</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(0,0,0,0.07)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: barGradient }}
              />
            </div>
            <span
              className="text-[11px] font-medium flex-shrink-0"
              style={{ color: "#A0AEC0" }}
            >
              {target}
            </span>
          </div>
        </div>

        {/* ── Weekly bar chart ── */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(212,192,255,0.18)" }}>
          <p
            className="text-[10px] font-semibold tracking-widest uppercase mb-3"
            style={{ color: "#A0AEC0" }}
          >
            Cette semaine
          </p>
          <div className="flex items-end gap-1.5" style={{ height: 64 }}>
            {weekData.map((v, i) => {
              const hasData = v !== null && v > 0;
              const barH = hasData ? Math.max(8, (v! / weekMax) * 52) : 0;
              const isToday = i === todayIndex;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="flex-1 w-full flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: hasData ? barH : 3 }}
                      transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                      className="w-full rounded-t-md"
                      style={{
                        background: isToday
                          ? barGradient
                          : hasData
                          ? "rgba(212,192,255,0.45)"
                          : "rgba(0,0,0,0.05)",
                        boxShadow: isToday
                          ? "0 2px 8px rgba(167,139,250,0.22)"
                          : "none",
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: isToday ? iconColor : "#A0AEC0" }}
                  >
                    {DAYS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Détail du jour ── */}
        {breakdown.length > 0 && (
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(212,192,255,0.18)" }}>
            <p
              className="text-[10px] font-semibold tracking-widest uppercase mb-3"
              style={{ color: "#A0AEC0" }}
            >
              Détail du jour
            </p>
            <div className="flex flex-col gap-1.5">
              {breakdown.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: "rgba(240,235,255,0.45)" }}
                >
                  <span className="text-xs font-light" style={{ color: "#4A5568" }}>
                    {item.title}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#2D3748" }}>
                    {item.amount}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── À savoir ── */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(212,192,255,0.18)" }}>
          <p
            className="text-[10px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: "#A0AEC0" }}
          >
            À savoir
          </p>
          <p className="text-xs font-light leading-relaxed" style={{ color: "#4A5568" }}>
            {description}
          </p>
          <p className="text-xs font-light leading-relaxed mt-2" style={{ color: "#4A5568" }}>
            {importance}
          </p>
        </div>

        {/* ── Conseil ── */}
        <div className="px-6 py-4">
          <div
            className="flex gap-3 p-3.5 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(240,235,255,0.65) 0%, rgba(255,251,240,0.65) 100%)",
              border: "1px solid rgba(255,255,255,0.75)",
            }}
          >
            <span className="text-base flex-shrink-0 leading-none mt-0.5">💡</span>
            <p className="text-xs font-light leading-relaxed" style={{ color: "#4A5568" }}>
              {tip}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
