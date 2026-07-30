"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { stats } from "@/data/statsData";
import type { StatData } from "@/data/statsData";
import StatDetailModal from "@/components/StatDetailModal";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function StatsPanel() {
  const goodStats = stats.filter((s) => s.trendUp).length;
  const [selected, setSelected] = useState<StatData | null>(null);

  return (
    <>
      <div className="lg-surface lg-highlight relative rounded-3xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0 border-b border-white/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                Aujourd&apos;hui
              </p>
              <p className="text-base font-light mt-0.5" style={{ color: "var(--text-1)" }}>
                Votre journée
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(var(--tint-violet-rgb),0.9) 0%, rgba(255,251,240,0.9) 100%)",
                border: "1px solid rgba(var(--surface-rgb),0.8)",
              }}
            >
              <TrendingUp size={11} strokeWidth={2} style={{ color: "var(--gold)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>
                {goodStats}/{stats.length}
              </span>
            </div>
          </div>
        </div>

        {/* Stats list */}
        <motion.div
          className="flex-1 flex flex-col gap-2 overflow-y-auto p-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat) => {
            const { icon: Icon, label, value, unit, target, progress, trend, trendUp, iconColor, barGradient, cardClass } = stat;
            return (
              <motion.button
                key={label}
                type="button"
                variants={itemVariants}
                whileHover={{ x: -2, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                onClick={() => setSelected(stat)}
                className={`${cardClass} lg-highlight relative rounded-2xl p-3 cursor-pointer w-full text-left`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(var(--surface-rgb),0.6)",
                      boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
                    }}
                  >
                    <Icon size={14} strokeWidth={1.5} style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-2)" }}>
                      {label}
                    </p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
                        {value}
                      </span>
                      {unit && (
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-2)" }}>
                          {unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>
                      {target}
                    </span>
                    <div
                      className="flex items-center gap-0.5"
                      style={{ color: trendUp ? "var(--gold)" : "var(--accent)" }}
                    >
                      {trendUp ? (
                        <TrendingUp size={9} strokeWidth={2} />
                      ) : (
                        <TrendingDown size={9} strokeWidth={2} />
                      )}
                      <span className="text-[9px] font-semibold">{trend}</span>
                    </div>
                  </div>
                </div>
                <div
                  className="mt-2.5 h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(var(--surface-rgb),0.5)" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="h-full rounded-full"
                    style={{ background: barGradient }}
                  />
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <StatDetailModal key="statdetail" stat={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
