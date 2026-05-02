"use client";

import { motion } from "framer-motion";
import { Flame, Heart, Footprints, Moon, Droplet, Activity, TrendingUp, TrendingDown } from "lucide-react";

const stats = [
  {
    icon: Flame,
    label: "Calories",
    value: "1 847",
    unit: "kcal",
    target: "/ 2 200",
    progress: 0.84,
    trend: "+5%",
    trendUp: true,
    iconColor: "#F9A8C9",
    barGradient: "linear-gradient(90deg, #F9A8C9 0%, #FFD6E7 100%)",
    cardClass: "lg-rose",
  },
  {
    icon: Activity,
    label: "Dépense",
    value: "612",
    unit: "kcal",
    target: "active",
    progress: 0.7,
    trend: "+12%",
    trendUp: true,
    iconColor: "#7ED8D8",
    barGradient: "linear-gradient(90deg, #7ED8D8 0%, #B2F0F0 100%)",
    cardClass: "lg-turquoise",
  },
  {
    icon: Footprints,
    label: "Pas",
    value: "8 234",
    unit: "",
    target: "/ 10 000",
    progress: 0.82,
    trend: "+3%",
    trendUp: true,
    iconColor: "#F9A8C9",
    barGradient: "linear-gradient(90deg, #F9A8C9 0%, #B2F0F0 100%)",
    cardClass: "lg-bicolor",
  },
  {
    icon: Heart,
    label: "FC moyenne",
    value: "68",
    unit: "bpm",
    target: "Repos",
    progress: 0.4,
    trend: "-2%",
    trendUp: false,
    iconColor: "#F9A8C9",
    barGradient: "linear-gradient(90deg, #FFD6E7 0%, #F9A8C9 100%)",
    cardClass: "lg-rose",
  },
  {
    icon: Droplet,
    label: "Hydratation",
    value: "1.6",
    unit: "L",
    target: "/ 2.5L",
    progress: 0.64,
    trend: "-8%",
    trendUp: false,
    iconColor: "#7ED8D8",
    barGradient: "linear-gradient(90deg, #B2F0F0 0%, #7ED8D8 100%)",
    cardClass: "lg-turquoise",
  },
  {
    icon: Moon,
    label: "Sommeil",
    value: "7h24",
    unit: "",
    target: "+18 min",
    progress: 0.92,
    trend: "+6%",
    trendUp: true,
    iconColor: "#7ED8D8",
    barGradient: "linear-gradient(90deg, #FFD6E7 0%, #B2F0F0 100%)",
    cardClass: "lg-bicolor",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function StatsPanel() {
  const goodStats = stats.filter((s) => s.trendUp).length;

  return (
    <div className="lg-surface lg-highlight relative rounded-3xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0 border-b border-white/40">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: "#A0AEC0" }}
            >
              Aujourd&apos;hui
            </p>
            <p className="text-base font-light mt-0.5" style={{ color: "#2D3748" }}>
              Votre journée
            </p>
          </div>
          {/* Mini summary */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(255,240,245,0.9) 0%, rgba(224,255,255,0.9) 100%)",
              border: "1px solid rgba(255,255,255,0.8)",
            }}
          >
            <TrendingUp size={11} strokeWidth={2} style={{ color: "#7ED8D8" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#2D3748" }}>
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
        {stats.map(({ icon: Icon, label, value, unit, target, progress, trend, trendUp, iconColor, barGradient, cardClass }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            whileHover={{ x: -2, transition: { duration: 0.2 } }}
            className={`${cardClass} lg-highlight relative rounded-2xl p-3 cursor-default`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <Icon size={14} strokeWidth={1.5} style={{ color: iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium" style={{ color: "#718096" }}>
                  {label}
                </p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-semibold leading-tight" style={{ color: "#2D3748" }}>
                    {value}
                  </span>
                  {unit && (
                    <span className="text-[10px] font-medium" style={{ color: "#718096" }}>
                      {unit}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-medium" style={{ color: "#A0AEC0" }}>
                  {target}
                </span>
                <div
                  className="flex items-center gap-0.5"
                  style={{ color: trendUp ? "#7ED8D8" : "#F9A8C9" }}
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
            {/* Progress bar */}
            <div
              className="mt-2.5 h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="h-full rounded-full"
                style={{ background: barGradient }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
