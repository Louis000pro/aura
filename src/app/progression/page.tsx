"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Video, CheckCircle, Clock, ChevronRight, Upload, Share2, Dumbbell, Apple, Sun } from "lucide-react";
import SharePerformanceModal from "@/components/SharePerformanceModal";
import type { PerformanceData, PerformanceType } from "@/components/PerformanceCard";

type TimelineEvent = {
  date: string;
  time: string;
  type: PerformanceType;
  title: string;
  desc: string;
  cardClass: string;
  dot: string;
  performance: PerformanceData;
};

const timelineEvents: TimelineEvent[] = [
  {
    date: "Aujourd'hui",
    time: "08:30",
    type: "workout",
    title: "Séance Force · Haut du corps",
    desc: "47 min · Volume 3.2 t · 412 kcal",
    cardClass: "lg-turquoise",
    dot: "#7ED8D8",
    performance: {
      type: "workout",
      title: "Force · Haut du corps",
      date: "Aujourd'hui · 08:30",
      metrics: [
        { label: "Durée", value: "47", unit: "min" },
        { label: "Volume", value: "3.2", unit: "t" },
        { label: "Calories", value: "412", unit: "kcal" },
        { label: "Intensité", value: "8.4", unit: "/10" },
      ],
      highlight: "Record perso au développé couché : 70 kg",
    },
  },
  {
    date: "Aujourd'hui",
    time: "07:15",
    type: "meal",
    title: "Petit-déjeuner protéiné",
    desc: "487 kcal · 32g protéines",
    cardClass: "lg-rose",
    dot: "#F9A8C9",
    performance: {
      type: "meal",
      title: "Petit-déjeuner protéiné",
      date: "Aujourd'hui · 07:15",
      metrics: [
        { label: "Calories", value: "487", unit: "kcal" },
        { label: "Protéines", value: "32", unit: "g" },
        { label: "Glucides", value: "54", unit: "g" },
        { label: "Lipides", value: "12", unit: "g" },
      ],
      highlight: "Riche en magnésium · Idéal post-réveil",
    },
  },
  {
    date: "Hier",
    time: "23:00",
    type: "day",
    title: "Bilan de la journée",
    desc: "Score 91/100 · Récupération optimale",
    cardClass: "lg-bicolor",
    dot: "#B2F0F0",
    performance: {
      type: "day",
      title: "Bilan du mardi",
      date: "Hier",
      metrics: [
        { label: "Pas", value: "11.2k", unit: "" },
        { label: "Sommeil", value: "7h45", unit: "" },
        { label: "FC repos", value: "62", unit: "bpm" },
        { label: "Score", value: "91", unit: "/100" },
      ],
      highlight: "Récupération optimale",
    },
  },
  {
    date: "Hier",
    time: "12:45",
    type: "meal",
    title: "Déjeuner équilibré",
    desc: "612 kcal · 48g protéines",
    cardClass: "lg-rose",
    dot: "#F9A8C9",
    performance: {
      type: "meal",
      title: "Bowl protéiné",
      date: "Hier · 12:45",
      metrics: [
        { label: "Calories", value: "612", unit: "kcal" },
        { label: "Protéines", value: "48", unit: "g" },
        { label: "Glucides", value: "67", unit: "g" },
        { label: "Lipides", value: "18", unit: "g" },
      ],
      highlight: "Idéal pour la récupération musculaire",
    },
  },
];

const eventIcons: Record<PerformanceType, typeof Dumbbell> = {
  workout: Dumbbell,
  meal: Apple,
  day: Sun,
};

type UploadState = "idle" | "uploading" | "done";

function UploadZone({
  icon: Icon,
  label,
  sublabel,
  accept,
  cardClass,
}: {
  icon: typeof Camera;
  label: string;
  sublabel: string;
  accept: string;
  cardClass: string;
}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = () => {
    setUploadState("uploading");
    setTimeout(() => setUploadState("done"), 1800);
    setTimeout(() => setUploadState("idle"), 4000);
  };

  return (
    <motion.div
      className={`${cardClass} lg-highlight relative flex-1 rounded-3xl p-5 flex flex-col items-center gap-3 cursor-pointer overflow-hidden`}
      style={{ minHeight: 150 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <AnimatePresence mode="wait">
        {uploadState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
            >
              <Icon size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
              <p className="text-xs mt-0.5 font-light" style={{ color: "#718096" }}>{sublabel}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase" style={{ color: "#A0AEC0" }}>
              <Upload size={10} />
              <span>Importer</span>
            </div>
          </motion.div>
        )}
        {uploadState === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 justify-center h-full"
          >
            <motion.div
              className="w-10 h-10 rounded-full border-[2px]"
              style={{ borderColor: "rgba(45,55,72,0.15)", borderTopColor: "#2D3748" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-xs font-medium" style={{ color: "#718096" }}>Analyse IA en cours…</p>
          </motion.div>
        )}
        {uploadState === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 justify-center h-full"
          >
            <CheckCircle size={28} strokeWidth={1.5} style={{ color: "#7ED8D8" }} />
            <p className="text-xs font-medium" style={{ color: "#2D3748" }}>Analyse terminée !</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function ProgressionPage() {
  const [shareData, setShareData] = useState<PerformanceData | null>(null);

  const groups = timelineEvents.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    (acc[event.date] = acc[event.date] || []).push(event);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col px-6 pt-10 pb-4 max-w-3xl mx-auto md:mx-0">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#A0AEC0" }}>
          Votre Journey
        </p>
        <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>Ma Progression</h1>
      </motion.div>

      {/* Upload Zones */}
      <motion.div
        className="flex gap-3 mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <UploadZone
          icon={Camera}
          label="Scan Nutrition"
          sublabel="L'IA reconnaît vos repas"
          accept="image/*"
          cardClass="lg-rose"
        />
        <UploadZone
          icon={Video}
          label="Analyse Posture"
          sublabel="Feedback en temps réel"
          accept="video/*"
          cardClass="lg-turquoise"
        />
      </motion.div>

      {/* Timeline */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6"
      >
        {Object.entries(groups).map(([date, events]) => (
          <div key={date}>
            <motion.p
              variants={itemVariants}
              className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3"
              style={{ color: "#A0AEC0" }}
            >
              {date}
            </motion.p>
            <div className="relative flex flex-col gap-3">
              <div
                className="absolute left-[19px] top-6 bottom-0 w-px"
                style={{ background: "linear-gradient(to bottom, rgba(255,214,231,0.6), rgba(178,240,240,0.6), transparent)" }}
              />
              {events.map((event, i) => {
                const EvIcon = eventIcons[event.type];
                return (
                  <motion.div key={i} variants={itemVariants} className="flex items-start gap-4 group">
                    <div className="relative flex-shrink-0 mt-1">
                      <div
                        className={`${event.cardClass} lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center`}
                      >
                        <EvIcon size={14} strokeWidth={1.5} style={{ color: event.dot }} />
                      </div>
                    </div>
                    <div className="lg-surface lg-highlight relative flex-1 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium" style={{ color: "#2D3748" }}>
                          {event.title}
                        </p>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setShareData(event.performance)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer flex-shrink-0"
                          style={{
                            background: "linear-gradient(135deg, rgba(255,240,245,0.95) 0%, rgba(224,255,255,0.95) 100%)",
                            border: "1px solid rgba(255,255,255,0.8)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                          }}
                          aria-label="Partager cette performance"
                        >
                          <Share2 size={11} strokeWidth={1.7} style={{ color: "#2D3748" }} />
                          <span className="text-[10px] font-semibold" style={{ color: "#2D3748" }}>Partager</span>
                        </motion.button>
                      </div>
                      <p className="text-xs mt-0.5 font-light" style={{ color: "#718096" }}>{event.desc}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Clock size={10} style={{ color: "#A0AEC0" }} />
                          <span className="text-[10px]" style={{ color: "#A0AEC0" }}>{event.time}</span>
                        </div>
                        <ChevronRight size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>

      <SharePerformanceModal
        open={shareData !== null}
        onClose={() => setShareData(null)}
        data={shareData ?? timelineEvents[0].performance}
      />
    </div>
  );
}
