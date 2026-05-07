"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Video, CheckCircle, Clock, ChevronRight, ChevronLeft, Upload,
  Share2, Dumbbell, Apple, Sun, Play, Flame, Wind, Sparkles, Layers,
} from "lucide-react";
import SharePerformanceModal from "@/components/SharePerformanceModal";
import type { PerformanceData, PerformanceType } from "@/components/PerformanceCard";
import BodyAvatar from "@/components/BodyAvatar";
import { useProfileSettings } from "@/hooks/useProfileSettings";

/* ─── Timeline data ─────────────────────────────────────── */
type TimelineEvent = {
  date: string; time: string; type: PerformanceType;
  title: string; desc: string; cardClass: string; dot: string;
  performance: PerformanceData;
};

const timelineEvents: TimelineEvent[] = [
  {
    date: "Aujourd'hui", time: "08:30", type: "workout",
    title: "Séance Force · Haut du corps", desc: "47 min · Volume 3.2 t · 412 kcal",
    cardClass: "lg-turquoise", dot: "#D4A843",
    performance: {
      type: "workout", title: "Force · Haut du corps", date: "Aujourd'hui · 08:30",
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
    date: "Aujourd'hui", time: "07:15", type: "meal",
    title: "Petit-déjeuner protéiné", desc: "487 kcal · 32g protéines",
    cardClass: "lg-rose", dot: "#A78BFA",
    performance: {
      type: "meal", title: "Petit-déjeuner protéiné", date: "Aujourd'hui · 07:15",
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
    date: "Hier", time: "23:00", type: "day",
    title: "Bilan de la journée", desc: "Score 91/100 · Récupération optimale",
    cardClass: "lg-bicolor", dot: "#F5E6A3",
    performance: {
      type: "day", title: "Bilan du mardi", date: "Hier",
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
    date: "Hier", time: "12:45", type: "meal",
    title: "Déjeuner équilibré", desc: "612 kcal · 48g protéines",
    cardClass: "lg-rose", dot: "#A78BFA",
    performance: {
      type: "meal", title: "Bowl protéiné", date: "Hier · 12:45",
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
  workout: Dumbbell, meal: Apple, day: Sun,
};

/* ─── Workout sessions data ─────────────────────────────── */
type WorkoutCategory = "force" | "cardio" | "mobilite" | "fullbody";

type WorkoutSession = {
  id: string;
  category: WorkoutCategory;
  title: string;
  subtitle: string;
  duration: number;
  difficulty: "Débutant" | "Intermédiaire" | "Avancé";
  exercises: number;
  muscles: string[];
  accent: string;
  icon: typeof Dumbbell;
};

const workoutSessions: WorkoutSession[] = [
  {
    id: "force-haut", category: "force",
    title: "Force Haut du Corps", subtitle: "Pectoraux · Dos · Épaules",
    duration: 45, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Pectoraux", "Dos", "Épaules"],
    accent: "#A78BFA", icon: Dumbbell,
  },
  {
    id: "fullbody-deb", category: "fullbody",
    title: "Full Body Débutant", subtitle: "Corps complet · Sans matériel",
    duration: 35, difficulty: "Débutant", exercises: 7,
    muscles: ["Corps entier"],
    accent: "#D4A843", icon: Layers,
  },
  {
    id: "hiit", category: "cardio",
    title: "HIIT Brûle-Graisses", subtitle: "Cardio intensif · 20 / 10 sec",
    duration: 25, difficulty: "Avancé", exercises: 8,
    muscles: ["Cardio", "Corps entier"],
    accent: "#FBBF24", icon: Flame,
  },
  {
    id: "jambes", category: "force",
    title: "Jambes & Fessiers", subtitle: "Squats · Fentes · Hip Thrust",
    duration: 50, difficulty: "Intermédiaire", exercises: 5,
    muscles: ["Quadriceps", "Fessiers"],
    accent: "#A78BFA", icon: Dumbbell,
  },
  {
    id: "mobilite", category: "mobilite",
    title: "Mobilité Matinale", subtitle: "Yoga flow · Étirements actifs",
    duration: 20, difficulty: "Débutant", exercises: 10,
    muscles: ["Mobilité", "Souplesse"],
    accent: "#34D399", icon: Wind,
  },
  {
    id: "dos-biceps", category: "force",
    title: "Dos & Biceps", subtitle: "Tractions · Rowing · Curls",
    duration: 40, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Dos", "Biceps"],
    accent: "#60A5FA", icon: Dumbbell,
  },
  {
    id: "core", category: "fullbody",
    title: "Core & Gainage", subtitle: "Planche · Crunchs · Relevés",
    duration: 30, difficulty: "Intermédiaire", exercises: 8,
    muscles: ["Abdominaux", "Lombaires"],
    accent: "#FB923C", icon: Sparkles,
  },
  {
    id: "cardio-endurance", category: "cardio",
    title: "Endurance Cardio", subtitle: "Fractionné modéré · Zone 2",
    duration: 40, difficulty: "Débutant", exercises: 4,
    muscles: ["Cardio"],
    accent: "#38BDF8", icon: Wind,
  },
];

const categoryFilters: { key: "tous" | WorkoutCategory; label: string }[] = [
  { key: "tous",     label: "Tous" },
  { key: "force",    label: "Force" },
  { key: "cardio",   label: "Cardio" },
  { key: "mobilite", label: "Mobilité" },
  { key: "fullbody", label: "Full Body" },
];

const difficultyColor: Record<string, string> = {
  "Débutant":      "#34D399",
  "Intermédiaire": "#FBBF24",
  "Avancé":        "#A78BFA",
};

/* ─── UploadZone ────────────────────────────────────────── */
type UploadState = "idle" | "uploading" | "done";

function UploadZone({
  icon: Icon, label, sublabel, accept, cardClass,
}: {
  icon: typeof Camera; label: string; sublabel: string;
  accept: string; cardClass: string;
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
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
              <Icon size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
              <p className="text-xs mt-0.5 font-light" style={{ color: "#718096" }}>{sublabel}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase" style={{ color: "#A0AEC0" }}>
              <Upload size={10} /><span>Importer</span>
            </div>
          </motion.div>
        )}
        {uploadState === "uploading" && (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 justify-center h-full">
            <motion.div className="w-10 h-10 rounded-full border-[2px]" style={{ borderColor: "rgba(45,55,72,0.15)", borderTopColor: "#2D3748" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            <p className="text-xs font-medium" style={{ color: "#718096" }}>Analyse IA en cours…</p>
          </motion.div>
        )}
        {uploadState === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 justify-center h-full">
            <CheckCircle size={28} strokeWidth={1.5} style={{ color: "#D4A843" }} />
            <p className="text-xs font-medium" style={{ color: "#2D3748" }}>Analyse terminée !</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── WorkoutCard ───────────────────────────────────────── */
function WorkoutCard({ session, gender }: { session: WorkoutSession; gender: "homme" | "femme" }) {
  const [started, setStarted] = useState(false);
  const Icon = session.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="flex-shrink-0 rounded-3xl overflow-hidden flex flex-col"
      style={{
        width: 230,
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.88)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 32px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2" style={{ background: `${session.accent}14` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${session.accent}28`, border: `1px solid ${session.accent}45` }}
          >
            <Icon size={13} strokeWidth={1.5} style={{ color: session.accent }} />
          </div>
          <span
            className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
            style={{ background: `${difficultyColor[session.difficulty]}18`, color: difficultyColor[session.difficulty] }}
          >
            {session.difficulty}
          </span>
        </div>
        <p className="text-sm font-semibold leading-tight" style={{ color: "#2D3748" }}>{session.title}</p>
        <p className="text-[11px] font-light mt-0.5" style={{ color: "#718096" }}>{session.subtitle}</p>
      </div>

      {/* Body avatar — full width, centered */}
      <div
        className="flex items-center justify-center py-3"
        style={{ background: `${session.accent}08`, borderTop: `1px solid ${session.accent}18`, borderBottom: `1px solid ${session.accent}18` }}
      >
        <BodyAvatar
          gender={gender}
          muscles={session.muscles}
          accent={session.accent}
          width={160}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock size={11} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
            <span className="text-[11px] font-medium" style={{ color: "#4A5568" }}>{session.duration} min</span>
          </div>
          <div className="w-px h-3" style={{ background: "rgba(0,0,0,0.08)" }} />
          <div className="flex items-center gap-1">
            <Dumbbell size={11} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
            <span className="text-[11px] font-medium" style={{ color: "#4A5568" }}>{session.exercises} exos</span>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setStarted((s) => !s)}
          className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          style={
            started
              ? { background: `${session.accent}22`, border: `1px solid ${session.accent}40` }
              : { background: `linear-gradient(135deg, ${session.accent}dd, ${session.accent}aa)`, boxShadow: `0 4px 14px ${session.accent}44` }
          }
        >
          <AnimatePresence mode="wait">
            {started ? (
              <motion.span key="on" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <CheckCircle size={12} strokeWidth={2} style={{ color: session.accent }} />
                <span className="text-[11px] font-semibold" style={{ color: session.accent }}>En cours !</span>
              </motion.span>
            ) : (
              <motion.span key="off" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <Play size={11} strokeWidth={2.5} style={{ color: "#fff" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#fff" }}>Commencer</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Animation variants ────────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ─── Page ──────────────────────────────────────────────── */
export default function ProgressionPage() {
  const [shareData, setShareData] = useState<PerformanceData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"tous" | WorkoutCategory>("tous");
  const { settings } = useProfileSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "right" ? 250 : -250, behavior: "smooth" });
  const [particles, setParticles] = useState<{id:number,x:number,y:number,size:number,delay:number,duration:number,opacity:number}[]>([]);
  useEffect(() => {
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 8,
      opacity: 0.35 + Math.random() * 0.45,
    })));
  }, []);

  const filteredSessions = workoutSessions.filter(
    (s) => categoryFilter === "tous" || s.category === categoryFilter
  );

  const groups = timelineEvents.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    (acc[event.date] = acc[event.date] || []).push(event);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col px-6 pt-10 pb-4 max-w-3xl mx-auto md:mx-0 relative overflow-x-hidden">
      {/* ── Calque déco : blobs · anneaux · particules ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <motion.div className="absolute rounded-full"
          style={{ top: "-5%", right: "-8%", width: 420, height: 420, background: "rgba(212,192,255,0.35)", filter: "blur(85px)" }}
          animate={{ scale: [1,1.18,1], x: [20,-30,20] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute rounded-full"
          style={{ bottom: "-5%", left: "-8%", width: 400, height: 400, background: "rgba(245,230,163,0.3)", filter: "blur(85px)" }}
          animate={{ scale: [1,1.2,1], x: [-20,30,-20] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
        {[580, 440, 310].map((size, i) => (
          <motion.div key={size} className="absolute rounded-full"
            style={{
              width: size, height: size,
              border: `1px solid rgba(167,139,250,${i === 0 ? 0.18 : i === 1 ? 0.26 : 0.18})`,
              top: "50%", left: "50%", marginLeft: -size / 2, marginTop: -size / 2,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 40 + i * 15, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {particles.map((p) => (
          <motion.div key={p.id} className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`, width: p.size + 1, height: p.size + 1,
              background: p.id % 3 === 0 ? `rgba(167,139,250,${p.opacity})` : p.id % 3 === 1 ? `rgba(212,192,255,${p.opacity})` : `rgba(212,168,67,${p.opacity * 0.85})`,
            }}
            animate={{ y: ["-20px", "20px", "-20px"], opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.4] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>
      {/* ── Contenu ── */}
      <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>

      {/* Header */}
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
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <UploadZone icon={Camera} label="Scan Nutrition" sublabel="L'IA reconnaît vos repas" accept="image/*" cardClass="lg-rose" />
        <UploadZone icon={Video} label="Analyse Posture" sublabel="Feedback en temps réel" accept="video/*" cardClass="lg-turquoise" />
      </motion.div>

      {/* ── Séances prêtes ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-10"
      >
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-0.5" style={{ color: "#A0AEC0" }}>
              Prêt à l&apos;emploi
            </p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Séances du jour</h2>
          </div>
          <span
            className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: "rgba(249,168,201,0.15)", color: "#A78BFA" }}
          >
            {workoutSessions.length} séances
          </span>
        </div>

        {/* Category filter + arrow buttons */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-2 flex-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {categoryFilters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                style={
                  categoryFilter === key
                    ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                    : { background: "rgba(255,255,255,0.55)", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.6)" }
                }
              >
                {label}
              </button>
            ))}
          </div>
          {/* Desktop scroll arrows */}
          <div className="hidden md:flex gap-1 flex-shrink-0">
            {[
              { dir: "left"  as const, Icon: ChevronLeft },
              { dir: "right" as const, Icon: ChevronRight },
            ].map(({ dir, Icon }) => (
              <motion.button
                key={dir}
                whileTap={{ scale: 0.88 }}
                onClick={() => scroll(dir)}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.8)" }}
              >
                <Icon size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Cards — break out of parent px-6 so scroll reaches viewport edge */}
        <div className="relative -mx-6">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-4 w-8 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, rgba(248,247,252,0.9) 0%, transparent 100%)" }} />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-4 w-14 z-10 pointer-events-none flex items-center justify-end pr-3"
            style={{ background: "linear-gradient(to left, rgba(248,247,252,0.95) 0%, transparent 100%)" }}>
            <motion.button
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
              onClick={() => scroll("right")}
              whileTap={{ scale: 0.85 }}
              className="cursor-pointer"
              style={{ pointerEvents: "all", background: "none", border: "none", padding: 4 }}
              aria-label="Défiler à droite"
            >
              <ChevronRight size={16} strokeWidth={2.5} style={{ color: "#C8B8D8" }} />
            </motion.button>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-4 px-6"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            <AnimatePresence mode="popLayout">
              {filteredSessions.map((session) => (
                <WorkoutCard key={session.id} session={session} gender={settings.gender} />
              ))}
            </AnimatePresence>
            <div className="flex-shrink-0 w-6" />
          </div>
        </div>
      </motion.div>

      {/* ── Timeline ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6"
      >
        <motion.div variants={itemVariants}>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#A0AEC0" }}>
            Historique
          </p>
          <h2 className="text-lg font-light mb-4" style={{ color: "#2D3748" }}>Activité récente</h2>
        </motion.div>

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
                style={{ background: "linear-gradient(to bottom, rgba(212,192,255,0.6), rgba(245,230,163,0.6), transparent)" }}
              />
              {events.map((event, i) => {
                const EvIcon = eventIcons[event.type];
                return (
                  <motion.div key={i} variants={itemVariants} className="flex items-start gap-4 group">
                    <div className="relative flex-shrink-0 mt-1">
                      <div className={`${event.cardClass} lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center`}>
                        <EvIcon size={14} strokeWidth={1.5} style={{ color: event.dot }} />
                      </div>
                    </div>
                    <div className="lg-surface lg-highlight relative flex-1 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{event.title}</p>
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
    </div>
  );
}
