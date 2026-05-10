"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Camera, Video, CheckCircle, Clock, ChevronRight, ChevronLeft, Upload,
  Share2, Dumbbell, Apple, Sun, Play, Flame, Wind, Sparkles, Layers, Check,
  X, CameraOff, Square, RefreshCw, Plus, Trash2, Pencil,
  Globe, Lock, Users,
} from "lucide-react";
import SharePerformanceModal from "@/components/SharePerformanceModal";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";
import type { PerformanceData, PerformanceType } from "@/components/PerformanceCard";
import BodyAvatar from "@/components/BodyAvatar";
import { useProfileSettings } from "@/hooks/useProfileSettings";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

/* ─── DB types ───────────────────────────────────────────── */
type DbWorkoutSession = {
  id: string; user_id: string; title: string; category: string;
  duration_minutes: number; calories_burned: number; started_at: string;
};

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
  exerciseList?: Exercise[];
  visibility?: "private" | "friends" | "public";
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

/* ─── Icon resolver (Supabase stores icon name as string) ── */
const ICON_MAP: Record<string, typeof Dumbbell> = {
  Dumbbell, Flame, Wind, Layers, Sparkles,
};
function resolveIcon(icon: unknown): typeof Dumbbell {
  if (typeof icon === "string") return ICON_MAP[icon] ?? Dumbbell;
  if (typeof icon === "function") return icon as typeof Dumbbell;
  return Dumbbell;
}

/* ─── Chart helpers ─────────────────────────────────────── */
type WeightEntry = { date: string; weight: number };
type CalorieDay  = { date: string; total: number; label: string };

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const CHART_CARD = {
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 4px 32px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
};

/* ─── WeightChart ────────────────────────────────────────── */
function WeightChart({
  data, range, onRangeChange, onAdd,
}: {
  data: WeightEntry[];
  range: "week" | "month";
  onRangeChange: (r: "week" | "month") => void;
  onAdd: (kg: number) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [adding, setAdding]     = useState(false);

  const pts     = range === "week" ? data.slice(-7) : data.slice(-30);
  const current = pts.at(-1)?.weight ?? null;
  const prev    = pts.at(-2)?.weight ?? null;
  const trend   = current !== null && prev !== null ? +(current - prev).toFixed(1) : null;

  const W = 300, H = 90, PX = 14, PY = 10;
  const ws   = pts.map(p => p.weight);
  const minW = ws.length > 0 ? Math.min(...ws) - 1.5 : 60;
  const maxW = ws.length > 0 ? Math.max(...ws) + 1.5 : 90;

  const tx = (i: number) =>
    pts.length < 2 ? W / 2 : PX + (i / (pts.length - 1)) * (W - 2 * PX);
  const ty = (w: number) =>
    PY + ((maxW - w) / (maxW - minW)) * (H - 2 * PY);

  let linePath = "", areaPath = "";
  if (pts.length >= 2) {
    const sp = pts.map((p, i) => ({ x: tx(i), y: ty(p.weight) }));
    linePath = `M ${sp[0].x} ${sp[0].y}`;
    areaPath = `M ${sp[0].x} ${H} L ${sp[0].x} ${sp[0].y}`;
    for (let i = 1; i < sp.length; i++) {
      const cx = (sp[i-1].x + sp[i].x) / 2;
      linePath += ` C ${cx} ${sp[i-1].y}, ${cx} ${sp[i].y}, ${sp[i].x} ${sp[i].y}`;
      areaPath += ` C ${cx} ${sp[i-1].y}, ${cx} ${sp[i].y}, ${sp[i].x} ${sp[i].y}`;
    }
    areaPath += ` L ${sp.at(-1)!.x} ${H} Z`;
  }

  const handleAdd = () => {
    const kg = parseFloat(inputVal.replace(",", "."));
    if (isNaN(kg) || kg < 20 || kg > 300) return;
    onAdd(kg); setInputVal(""); setAdding(false);
  };

  return (
    <div className="rounded-3xl p-5" style={CHART_CARD}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>POIDS</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            {current !== null ? (
              <>
                <span className="text-2xl font-light" style={{ color: "#2D3748" }}>{current.toFixed(1)}</span>
                <span className="text-sm" style={{ color: "#A0AEC0" }}>kg</span>
                {trend !== null && (
                  <span className="text-xs font-semibold"
                    style={{ color: trend < 0 ? "#34D399" : trend > 0 ? "#FC8181" : "#A0AEC0" }}>
                    {trend > 0 ? "+" : ""}{trend} kg
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm font-light" style={{ color: "#A0AEC0" }}>Aucune mesure</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,192,255,0.4)" }}>
            {(["week", "month"] as const).map(r => (
              <button key={r} onClick={() => onRangeChange(r)}
                className="px-2.5 py-1 text-[10px] font-semibold cursor-pointer"
                style={{
                  background: range === r ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "transparent",
                  color: range === r ? "#2D3748" : "#A0AEC0",
                }}>
                {r === "week" ? "7j" : "30j"}
              </button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdding(a => !a)}
            className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <span className="text-sm font-bold leading-none" style={{ color: "#A78BFA" }}>+</span>
          </motion.button>
        </div>
      </div>

      {/* Input */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex gap-2">
              <input type="number" step="0.1" placeholder="Ex : 72.5 kg"
                value={inputVal} onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleAdd}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                OK
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG chart */}
      {pts.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-center font-light" style={{ color: "#A0AEC0" }}>
            Appuie sur + pour enregistrer<br />ton premier poids
          </p>
        </div>
      ) : (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#A78BFA" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill="url(#wGrad)" />}
          {linePath && <path d={linePath} fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          {pts.map((p, i) => (
            <circle key={i} cx={tx(i)} cy={ty(p.weight)}
              r={i === pts.length - 1 ? 4 : 2.5}
              fill={i === pts.length - 1 ? "#A78BFA" : "white"}
              stroke="#A78BFA" strokeWidth={i === pts.length - 1 ? 0 : 1.5} />
          ))}
          {pts.length > 0 && (
            <text x={tx(pts.length - 1)} y={ty(pts.at(-1)!.weight) - 8}
              textAnchor="middle" fontSize="9" fontWeight="600" fill="#A78BFA">
              {pts.at(-1)!.weight.toFixed(1)}
            </text>
          )}
        </svg>
      )}
    </div>
  );
}

/* ─── CalorieChart ───────────────────────────────────────── */
function CalorieChart({ data, goal }: { data: CalorieDay[]; goal: number }) {
  const today      = toDateStr(new Date());
  const todayTotal = data.find(d => d.date === today)?.total ?? 0;
  const activeDays = data.filter(d => d.total > 0);
  const avgCals    = activeDays.length > 0
    ? Math.round(activeDays.reduce((s, d) => s + d.total, 0) / activeDays.length) : 0;
  const maxCals  = Math.max(...data.map(d => d.total), goal, 1);
  const goalPct  = (goal / maxCals) * 85;

  return (
    <div className="rounded-3xl p-5" style={CHART_CARD}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>CALORIES · 7J</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-light" style={{ color: "#2D3748" }}>
              {todayTotal > 0 ? todayTotal.toLocaleString("fr-FR") : "—"}
            </span>
            <span className="text-sm" style={{ color: "#A0AEC0" }}>aujourd&apos;hui</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>MOY.</p>
          <p className="text-sm font-semibold mt-0.5"
            style={{ color: avgCals > 0 ? (avgCals > goal ? "#FC8181" : "#34D399") : "#A0AEC0" }}>
            {avgCals > 0 ? avgCals.toLocaleString("fr-FR") : "—"}
          </p>
        </div>
      </div>

      {/* Bars */}
      <div className="relative" style={{ height: 80 }}>
        <div className="absolute left-0 right-0 pointer-events-none"
          style={{ bottom: `${goalPct}%`, borderTop: "1px dashed rgba(167,139,250,0.35)" }} />
        <div className="flex items-end gap-1.5 h-full">
          {data.map((d, i) => {
            const isToday  = d.date === today;
            const barPct   = d.total > 0 ? (d.total / maxCals) * 85 : 1;
            const overGoal = d.total > goal;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <motion.div className="w-full rounded-t-lg"
                  initial={{ height: 0 }}
                  animate={{ height: `${barPct}%` }}
                  transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                  style={{
                    background: d.total === 0
                      ? "rgba(167,139,250,0.08)"
                      : overGoal  ? "linear-gradient(to top, #FC8181, #FCA5A5)"
                      : isToday   ? "linear-gradient(to top, #A78BFA, #C4B5FD)"
                      :             "linear-gradient(to top, #7B5CC4, #A78BFA)",
                    minHeight: "3px",
                  }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Day labels */}
      <div className="flex gap-1.5 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] font-semibold"
              style={{ color: d.date === today ? "#A78BFA" : "#A0AEC0" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#A78BFA" }} />
          <span className="text-[10px]" style={{ color: "#A0AEC0" }}>Consommé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 border-t" style={{ borderColor: "rgba(167,139,250,0.5)", borderStyle: "dashed" }} />
          <span className="text-[10px]" style={{ color: "#A0AEC0" }}>Objectif {goal.toLocaleString("fr-FR")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#FC8181" }} />
          <span className="text-[10px]" style={{ color: "#A0AEC0" }}>Dépassé</span>
        </div>
      </div>
    </div>
  );
}

/* ─── CameraCapture Modal ───────────────────────────────── */
type CaptureMode = "photo" | "video";
type CapturePhase = "loading" | "preview" | "recording" | "captured" | "error";

function CameraCapture({
  mode, label, onCapture, onClose,
}: {
  mode: CaptureMode;
  label: string;
  onCapture: (blob: Blob, objectUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const capturedBlobRef = useRef<Blob | null>(null);
  const capturedUrlRef  = useRef<string | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase]               = useState<CapturePhase>("loading");
  const [capturedUrl, setCapturedUrl]   = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  /* Start camera on mount */
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: mode === "video",
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase("preview");
      } catch {
        if (!cancelled) setPhase("error");
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      capturedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      capturedUrlRef.current = url;
      setCapturedUrl(url);
      setPhase("captured");
      /* Freeze live feed */
      streamRef.current?.getVideoTracks().forEach(t => { t.enabled = false; });
    }, "image/jpeg", 0.92);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      capturedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      capturedUrlRef.current = url;
      setCapturedUrl(url);
      setPhase("captured");
    };
    recorder.start();
    setPhase("recording");
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const retake = () => {
    if (capturedUrlRef.current) { URL.revokeObjectURL(capturedUrlRef.current); capturedUrlRef.current = null; }
    capturedBlobRef.current = null;
    setCapturedUrl(null);
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = true; });
    setPhase("preview");
  };

  const useCapture = () => {
    if (!capturedBlobRef.current || !capturedUrlRef.current) return;
    onCapture(capturedBlobRef.current, capturedUrlRef.current);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "#1a1625", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <X size={16} strokeWidth={2} style={{ color: "#fff" }} />
        </button>

        {/* Title */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
            {mode === "photo" ? "Scan Nutrition" : "Analyse Posture"}
          </p>
          <h3 className="text-base font-light mt-0.5" style={{ color: "#fff" }}>{label}</h3>
        </div>

        {/* Viewfinder */}
        <div
          className="relative mx-4 rounded-2xl overflow-hidden"
          style={{ aspectRatio: "4/3", background: "#0d0d1a" }}
        >
          {/* Live feed */}
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ display: phase === "captured" ? "none" : "block" }}
          />
          {/* Captured photo preview */}
          {phase === "captured" && capturedUrl && mode === "photo" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedUrl} alt="Capture" className="w-full h-full object-cover" />
          )}
          {/* Captured video preview */}
          {phase === "captured" && capturedUrl && mode === "video" && (
            <video src={capturedUrl} controls className="w-full h-full object-cover" />
          )}
          {/* Loading spinner */}
          {phase === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-8 h-8 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.3)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          )}
          {/* Error */}
          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <CameraOff size={32} strokeWidth={1.5} style={{ color: "#718096" }} />
              <p className="text-xs text-center px-6" style={{ color: "#718096" }}>
                Accès à la caméra refusé.<br/>Vérifiez les permissions du navigateur.
              </p>
            </div>
          )}
          {/* Recording badge */}
          {phase === "recording" && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.55)" }}>
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: "#ef4444" }}
                animate={{ opacity: [1, 0.2] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-xs font-mono font-medium" style={{ color: "#fff" }}>{fmt(recordingTime)}</span>
            </div>
          )}
          {/* Subtle grid overlay for photo mode */}
          {(phase === "preview") && mode === "photo" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(rgba(167,139,250,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.12) 1px, transparent 1px)",
                backgroundSize: "33.33% 33.33%",
              }}
            />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="px-5 py-5 flex items-center justify-center gap-3">
          {phase === "preview" && mode === "photo" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={takePhoto}
              className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                boxShadow: "0 0 0 4px rgba(167,139,250,0.22), 0 6px 20px rgba(167,139,250,0.35)",
              }}
              aria-label="Prendre une photo"
            >
              <Camera size={22} strokeWidth={1.5} style={{ color: "#2D3748" }} />
            </motion.button>
          )}

          {phase === "preview" && mode === "video" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #FBBF24dd, #F59E0Bdd)",
                boxShadow: "0 0 0 4px rgba(251,191,36,0.22), 0 6px 20px rgba(251,191,36,0.30)",
              }}
              aria-label="Démarrer l'enregistrement"
            >
              <Video size={22} strokeWidth={1.5} style={{ color: "#fff" }} />
            </motion.button>
          )}

          {phase === "recording" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                background: "rgba(239,68,68,0.9)",
                boxShadow: "0 0 0 4px rgba(239,68,68,0.22), 0 6px 20px rgba(239,68,68,0.35)",
              }}
              aria-label="Arrêter l'enregistrement"
            >
              <Square size={20} strokeWidth={2} fill="white" style={{ color: "#fff" }} />
            </motion.button>
          )}

          {phase === "captured" && (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={retake}
                className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)" }}
              >
                <RefreshCw size={13} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                <span className="text-sm font-medium" style={{ color: "#A0AEC0" }}>Reprendre</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={useCapture}
                className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }}
              >
                <CheckCircle size={13} strokeWidth={2} style={{ color: "#2D3748" }} />
                <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>Utiliser</span>
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── UploadZone ────────────────────────────────────────── */
type UploadState = "idle" | "uploading" | "done";

function UploadZone({
  icon: Icon, label, sublabel, accept, cardClass, captureMode, captureLabel,
}: {
  icon: typeof Camera; label: string; sublabel: string;
  accept: string; cardClass: string;
  captureMode: CaptureMode; captureLabel: string;
}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [showCamera, setShowCamera]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    setUploadState("uploading");
    setTimeout(() => setUploadState("done"),  1800);
    setTimeout(() => setUploadState("idle"),  4000);
  };

  const handleCapture = () => {
    setShowCamera(false);
    triggerUpload();
  };

  return (
    <>
      <motion.div
        className={`${cardClass} lg-highlight relative flex-1 rounded-3xl p-5 flex flex-col items-center gap-3 overflow-hidden`}
        style={{ minHeight: 160 }}
        whileHover={{ y: -2 }}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={triggerUpload} />
        <AnimatePresence mode="wait">
          {uploadState === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 w-full">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                <Icon size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
                <p className="text-xs mt-0.5 font-light" style={{ color: "#718096" }}>{sublabel}</p>
              </div>
              {/* Two action buttons */}
              <div className="flex gap-2 w-full mt-1">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => inputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold tracking-wider uppercase cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.55)", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.6)" }}
                >
                  <Upload size={10} /><span>Importer</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowCamera(true)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold tracking-wider uppercase cursor-pointer"
                  style={{ background: "rgba(167,139,250,0.14)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.28)" }}
                >
                  <Icon size={10} /><span>Capturer</span>
                </motion.button>
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

      {/* Camera modal — rendered in portal-like position */}
      <AnimatePresence>
        {showCamera && (
          <CameraCapture
            mode={captureMode}
            label={captureLabel}
            onCapture={handleCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── WorkoutCard ───────────────────────────────────────── */
function WorkoutCard({
  session, gender, isActive, isDone, onStart,
}: {
  session: WorkoutSession;
  gender: "homme" | "femme";
  isActive: boolean;
  isDone?: boolean;
  onStart?: (s: WorkoutSession) => void;
}) {
  const Icon = session.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isDone ? 0.48 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: isDone ? 0 : -3, transition: { duration: 0.2 } }}
      layout
      className="flex-shrink-0 rounded-3xl overflow-hidden flex flex-col relative"
      style={{
        width: isDone ? 190 : 230,
        background: isDone
          ? "rgba(255,255,255,0.45)"
          : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(10px)",
        border: isDone
          ? "1px solid rgba(255,255,255,0.55)"
          : "1px solid rgba(255,255,255,0.88)",
        boxShadow: isDone
          ? "0 4px 16px rgba(0,0,0,0.04)"
          : "inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 32px rgba(0,0,0,0.06)",
        filter: isDone ? "grayscale(0.35)" : "none",
        transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Done ribbon */}
      {isDone && (
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.35)" }}
        >
          <CheckCircle size={9} strokeWidth={2.5} style={{ color: "#34D399" }} />
          <span className="text-[8px] font-bold tracking-wider uppercase" style={{ color: "#34D399" }}>Faite</span>
        </div>
      )}
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
          onClick={() => onStart?.(session)}
          className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          style={
            isActive
              ? { background: `${session.accent}22`, border: `1px solid ${session.accent}40` }
              : isDone
              ? { background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.07)" }
              : { background: `linear-gradient(135deg, ${session.accent}dd, ${session.accent}aa)`, boxShadow: `0 4px 14px ${session.accent}44` }
          }
        >
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.span key="on" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <CheckCircle size={12} strokeWidth={2} style={{ color: session.accent }} />
                <span className="text-[11px] font-semibold" style={{ color: session.accent }}>En cours !</span>
              </motion.span>
            ) : isDone ? (
              <motion.span key="redo" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <RefreshCw size={10} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#A0AEC0" }}>Refaire</span>
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

/* ─── LibraryCard ───────────────────────────────────────── */
const VIS_CONFIG = {
  private: { label: "Privée",  desc: "Visible par toi uniquement",    icon: Lock,  color: "#A0AEC0", bg: "rgba(160,174,192,0.08)", border: "rgba(160,174,192,0.2)" },
  friends: { label: "Amis",    desc: "Visible par tes abonnés",       icon: Users, color: "#60A5FA", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.25)" },
  public:  { label: "Public",  desc: "Trouvable par tout le monde",   icon: Globe, color: "#34D399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.25)" },
} as const;

function LibraryCard({
  session, isActive, onStart, onEdit, onDelete, onVisibilityChange,
}: {
  session: WorkoutSession;
  isActive: boolean;
  onStart: (s: WorkoutSession) => void;
  onEdit: (s: WorkoutSession) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, vis: "private" | "friends" | "public") => void;
}) {
  const [visOpen, setVisOpen] = useState(false);
  const Icon = resolveIcon(session.icon);
  const visKey = (session.visibility ?? "private") as keyof typeof VIS_CONFIG;
  const vis = VIS_CONFIG[visKey];
  const VisIcon = vis.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
      className="rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(255,255,255,0.92)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 4px 24px rgba(0,0,0,0.05)",
      }}
    >
      {/* Colored header */}
      <div className="px-4 pt-4 pb-3" style={{ background: `${session.accent}10`, borderBottom: `1px solid ${session.accent}18` }}>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${session.accent}24`, border: `1px solid ${session.accent}44` }}
            >
              <Icon size={14} strokeWidth={1.5} style={{ color: session.accent }} />
            </div>
            <span
              className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={{ background: `${difficultyColor[session.difficulty]}18`, color: difficultyColor[session.difficulty] }}
            >
              {session.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => onEdit(session)}
              className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}
              aria-label="Modifier"
            >
              <Pencil size={11} strokeWidth={1.8} style={{ color: "#A78BFA" }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => onDelete(session.id)}
              className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.2)" }}
              aria-label="Supprimer"
            >
              <Trash2 size={11} strokeWidth={1.8} style={{ color: "#FC8181" }} />
            </motion.button>
          </div>
        </div>
        <h3 className="text-sm font-semibold leading-tight mb-2" style={{ color: "#2D3748" }}>{session.title}</h3>
        {/* Muscle tags */}
        <div className="flex flex-wrap gap-1">
          {session.muscles.slice(0, 3).map(m => (
            <span
              key={m}
              className="text-[9px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${session.accent}16`, color: session.accent }}
            >
              {m}
            </span>
          ))}
          {session.muscles.length > 3 && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(160,174,192,0.12)", color: "#A0AEC0" }}
            >
              +{session.muscles.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-1" style={{ borderBottom: "1px solid rgba(240,235,255,0.5)" }}>
        <div className="flex items-center gap-1.5">
          <Clock size={10} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
          <span className="text-[11px] font-medium" style={{ color: "#4A5568" }}>{session.duration} min</span>
        </div>
        <div className="w-px h-3" style={{ background: "rgba(0,0,0,0.08)" }} />
        <div className="flex items-center gap-1.5">
          <Dumbbell size={10} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
          <span className="text-[11px] font-medium" style={{ color: "#4A5568" }}>{session.exercises} exos</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-3 pb-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onStart(session)}
          className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
          style={
            isActive
              ? { background: `${session.accent}22`, border: `1px solid ${session.accent}44` }
              : { background: `linear-gradient(135deg, ${session.accent}ee, ${session.accent}aa)`, boxShadow: `0 4px 14px ${session.accent}44` }
          }
        >
          {isActive ? (
            <>
              <CheckCircle size={13} strokeWidth={2} style={{ color: session.accent }} />
              <span className="text-xs font-semibold" style={{ color: session.accent }}>En cours !</span>
            </>
          ) : (
            <>
              <Play size={12} strokeWidth={2.5} style={{ color: "#fff" }} />
              <span className="text-xs font-semibold" style={{ color: "#fff" }}>Commencer</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Visibility picker */}
      <div className="px-4 pb-3 relative">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setVisOpen(v => !v)}
          className="flex items-center gap-1.5 w-full px-3 py-1.5 rounded-xl text-[10px] font-semibold cursor-pointer"
          style={{ background: vis.bg, color: vis.color, border: `1px solid ${vis.border}` }}
        >
          <VisIcon size={10} strokeWidth={2} />
          <span>{vis.label}</span>
          <motion.span
            className="ml-auto opacity-50 text-[9px]"
            animate={{ rotate: visOpen ? 180 : 0 }}
            transition={{ duration: 0.15 }}
          >▾</motion.span>
        </motion.button>

        <AnimatePresence>
          {visOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setVisOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full mb-1 left-0 right-0 rounded-2xl overflow-hidden z-50"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(240,235,255,0.9)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
                onClick={e => e.stopPropagation()}
              >
                {(["private", "friends", "public"] as const).map(key => {
                  const cfg = VIS_CONFIG[key];
                  const CfgIcon = cfg.icon;
                  const isCurrent = visKey === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { onVisibilityChange(session.id, key); setVisOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left cursor-pointer"
                      style={isCurrent ? { background: `${cfg.color}12` } : { background: "transparent" }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${cfg.color}18` }}
                      >
                        <CfgIcon size={12} strokeWidth={2} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: isCurrent ? cfg.color : "#2D3748" }}>{cfg.label}</p>
                        <p className="text-[9px] font-light" style={{ color: "#A0AEC0" }}>{cfg.desc}</p>
                      </div>
                      {isCurrent && <Check size={11} strokeWidth={2.5} style={{ color: cfg.color }} />}
                    </motion.button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Animation variants ────────────────────────────────── */
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

/* ─── Helpers ──────────────────────────────────────────── */
function dbSessionToEvent(s: DbWorkoutSession): TimelineEvent {
  const d = new Date(s.started_at);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const date = isToday ? "Aujourd'hui" : isYesterday ? "Hier" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const time = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  return {
    date, time, type: "workout", title: s.title,
    desc: `${s.duration_minutes} min${s.calories_burned ? ` · ${s.calories_burned} kcal` : ""}`,
    cardClass: "lg-turquoise", dot: "#D4A843",
    performance: {
      type: "workout", title: s.title, date: `${date} · ${time}`,
      metrics: [
        { label: "Durée", value: String(s.duration_minutes), unit: "min" },
        ...(s.calories_burned ? [{ label: "Calories", value: String(s.calories_burned), unit: "kcal" }] : []),
      ],
    },
  };
}

/* ─── Custom session type & creation modal ────────────────── */

const ACCENT_BY_CATEGORY: Record<WorkoutCategory, string> = {
  force: "#A78BFA", cardio: "#FBBF24", mobilite: "#34D399", fullbody: "#FB923C",
};
const ICON_BY_CATEGORY: Record<WorkoutCategory, typeof Dumbbell> = {
  force: Dumbbell, cardio: Flame, mobilite: Wind, fullbody: Layers,
};

const ALL_MUSCLES = [
  "Pectoraux", "Dos", "Épaules", "Biceps", "Triceps",
  "Abdominaux", "Obliques", "Core", "Lombaires",
  "Quadriceps", "Fessiers", "Mollets", "Hanches", "Cardio",
];

type ExerciseForm = { name: string; sets: number; reps: number; rest: number; restAfter: number };
const DEFAULT_EX: ExerciseForm = { name: "", sets: 3, reps: 10, rest: 60, restAfter: 90 };

function CreateSessionModal({ onClose, onCreate, editSession }: {
  onClose: () => void;
  onCreate: (s: WorkoutSession) => void;
  editSession?: WorkoutSession | null;
}) {
  const isEdit = !!editSession;

  const [title, setTitle]       = useState(editSession?.title ?? "");
  const [category, setCategory] = useState<WorkoutCategory>(editSession?.category ?? "force");
  const [duration, setDuration] = useState(editSession?.duration ?? 30);
  const [difficulty, setDifficulty] = useState<WorkoutSession["difficulty"]>(editSession?.difficulty ?? "Intermédiaire");
  // Custom muscles = muscles from editSession that are not in the predefined list
  const [customMuscles, setCustomMuscles] = useState<string[]>(
    editSession?.muscles?.filter(m => !ALL_MUSCLES.includes(m)) ?? []
  );
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(editSession?.muscles ?? []);
  const [newMuscleInput, setNewMuscleInput] = useState("");
  const [exForms, setExForms] = useState<ExerciseForm[]>(
    editSession?.exerciseList?.map(e => ({ name: e.name, sets: e.sets, reps: parseInt(String(e.reps)) || 10, rest: e.rest, restAfter: e.restAfter ?? 90 }))
    ?? [{ ...DEFAULT_EX }]
  );

  const toggleMuscle = (m: string) =>
    setSelectedMuscles(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);

  const addCustomMuscle = () => {
    const trimmed = newMuscleInput.trim();
    if (!trimmed) return;
    const allKnown = [...ALL_MUSCLES, ...customMuscles];
    if (allKnown.some(m => m.toLowerCase() === trimmed.toLowerCase())) return;
    setCustomMuscles(p => [...p, trimmed]);
    setSelectedMuscles(p => [...p, trimmed]);
    setNewMuscleInput("");
  };

  const removeCustomMuscle = (m: string) => {
    setCustomMuscles(p => p.filter(x => x !== m));
    setSelectedMuscles(p => p.filter(x => x !== m));
  };

  const addEx = () => setExForms(p => [...p, { ...DEFAULT_EX }]);
  const removeEx = (i: number) => setExForms(p => p.filter((_, idx) => idx !== i));
  const updateEx = <K extends keyof ExerciseForm>(i: number, key: K, val: ExerciseForm[K]) =>
    setExForms(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  const handleCreate = () => {
    if (!title.trim()) return;
    const validExs = exForms.filter(e => e.name.trim());
    const exerciseList: Exercise[] = validExs.map(e => ({
      name: e.name.trim(),
      sets: e.sets,
      reps: String(e.reps),
      rest: e.rest,
      restAfter: e.restAfter,
      tip: "Concentre-toi sur la forme et la respiration.",
      benefit: "Renforce et améliore les performances.",
      muscles: selectedMuscles.length > 0 ? selectedMuscles : ["Corps entier"],
    }));
    onCreate({
      id: editSession?.id ?? `custom-${Date.now()}`,
      title: title.trim(),
      subtitle: `${category.charAt(0).toUpperCase() + category.slice(1)} · Ma séance`,
      category,
      duration,
      difficulty,
      exercises: validExs.length || 1,
      muscles: selectedMuscles.length > 0 ? selectedMuscles : ["Corps entier"],
      accent: ACCENT_BY_CATEGORY[category],
      icon: ICON_BY_CATEGORY[category],
      exerciseList: exerciseList.length > 0 ? exerciseList : [{
        name: "Exercice libre",
        sets: 3, reps: "10", rest: 60,
        tip: "Concentre-toi sur la forme.",
        benefit: "Renforce et améliore les performances.",
        muscles: selectedMuscles.length > 0 ? selectedMuscles : ["Corps entier"],
      }],
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-0"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(167,139,250,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
          maxHeight: "92vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(240,235,255,0.8)" }}>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
              {isEdit ? "Modifier la séance" : "Nouvelle séance"}
            </p>
            <h2 className="text-lg font-light mt-0.5" style={{ color: "#2D3748" }}>
              {isEdit ? "Éditer ma séance" : "Créer ma séance"}
            </h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={15} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6" style={{ scrollbarWidth: "none" }}>

          {/* ── 1. Infos générales ── */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A78BFA" }}>Informations</p>

            {/* Nom */}
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nom de la séance (ex : Push Day, Cardio matin…)"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(240,235,255,0.45)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
              autoFocus={!isEdit}
            />

            {/* Catégorie */}
            <div className="grid grid-cols-4 gap-2">
              {(["force", "cardio", "mobilite", "fullbody"] as WorkoutCategory[]).map(cat => (
                <motion.button key={cat} whileTap={{ scale: 0.93 }} onClick={() => setCategory(cat)}
                  className="py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  style={category === cat
                    ? { background: `${ACCENT_BY_CATEGORY[cat]}22`, color: ACCENT_BY_CATEGORY[cat], border: `1px solid ${ACCENT_BY_CATEGORY[cat]}55` }
                    : { background: "rgba(255,255,255,0.7)", color: "#A0AEC0", border: "1px solid rgba(240,235,255,0.9)" }
                  }>
                  {cat === "mobilite" ? "Mobilité" : cat === "fullbody" ? "Full" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </motion.button>
              ))}
            </div>

            {/* Durée + Difficulté */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase block mb-2" style={{ color: "#A0AEC0" }}>Durée estimée</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "rgba(240,235,255,0.45)", border: "1px solid rgba(212,192,255,0.5)" }}>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setDuration(d => Math.max(10, d - 5))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.8)" }}>
                    <span className="text-sm font-bold leading-none" style={{ color: "#A78BFA" }}>−</span>
                  </motion.button>
                  <span className="flex-1 text-center text-sm font-semibold" style={{ color: "#2D3748" }}>{duration} min</span>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setDuration(d => Math.min(180, d + 5))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.8)" }}>
                    <span className="text-sm font-bold leading-none" style={{ color: "#A78BFA" }}>+</span>
                  </motion.button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase block mb-2" style={{ color: "#A0AEC0" }}>Niveau</label>
                <div className="flex flex-col gap-1">
                  {(["Débutant", "Intermédiaire", "Avancé"] as const).map(d => (
                    <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setDifficulty(d)}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer text-left"
                      style={difficulty === d
                        ? { background: `${difficultyColor[d]}22`, color: difficultyColor[d], border: `1px solid ${difficultyColor[d]}44` }
                        : { background: "rgba(255,255,255,0.6)", color: "#A0AEC0", border: "1px solid rgba(240,235,255,0.9)" }
                      }>
                      {d}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Groupes musculaires ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
                Muscles ciblés
              </p>
              {selectedMuscles.length > 0 && (
                <button onClick={() => setSelectedMuscles([])} className="text-[10px] cursor-pointer" style={{ color: "#A0AEC0" }}>
                  Tout décocher
                </button>
              )}
            </div>

            {/* Predefined muscles */}
            <div className="flex flex-wrap gap-2">
              {ALL_MUSCLES.map(m => {
                const selected = selectedMuscles.includes(m);
                return (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => toggleMuscle(m)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                    style={selected
                      ? { background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category], border: `1px solid ${ACCENT_BY_CATEGORY[category]}55` }
                      : { background: "rgba(255,255,255,0.7)", color: "#A0AEC0", border: "1px solid rgba(240,235,255,0.8)" }
                    }
                  >
                    {selected ? "✓ " : ""}{m}
                  </motion.button>
                );
              })}

              {/* Custom muscles — with × to remove */}
              {customMuscles.map(m => {
                const selected = selectedMuscles.includes(m);
                return (
                  <div key={m} className="flex items-center gap-0.5">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => toggleMuscle(m)}
                      className="pl-3 pr-1.5 py-1.5 rounded-l-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                      style={selected
                        ? { background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category], border: `1px solid ${ACCENT_BY_CATEGORY[category]}55`, borderRight: "none" }
                        : { background: "rgba(255,255,255,0.7)", color: "#A0AEC0", border: "1px solid rgba(240,235,255,0.8)", borderRight: "none" }
                      }
                    >
                      {selected ? "✓ " : ""}{m}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => removeCustomMuscle(m)}
                      className="pr-2 py-1.5 rounded-r-full text-[10px] flex items-center cursor-pointer transition-all duration-150"
                      style={selected
                        ? { background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category], border: `1px solid ${ACCENT_BY_CATEGORY[category]}55`, borderLeft: "none" }
                        : { background: "rgba(255,255,255,0.7)", color: "#A0AEC0", border: "1px solid rgba(240,235,255,0.8)", borderLeft: "none" }
                      }
                    >
                      <X size={9} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                );
              })}
            </div>

            {/* Add custom muscle */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newMuscleInput}
                onChange={e => setNewMuscleInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomMuscle(); } }}
                placeholder="Ajouter un muscle personnalisé…"
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,192,255,0.35)", color: "#2D3748" }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={addCustomMuscle}
                disabled={!newMuscleInput.trim()}
                className="px-3 py-2 rounded-xl flex items-center justify-center cursor-pointer"
                style={newMuscleInput.trim()
                  ? { background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.35)" }
                  : { background: "rgba(240,235,255,0.4)", color: "#C4B5FD", border: "1px solid rgba(212,192,255,0.2)" }
                }
              >
                <Plus size={13} strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* ── 3. Exercices ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
                Exercices ({exForms.length})
              </p>
              <motion.button whileTap={{ scale: 0.9 }} onClick={addEx}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl cursor-pointer text-[10px] font-semibold"
                style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.25)" }}>
                <Plus size={10} strokeWidth={2.5} /> Ajouter
              </motion.button>
            </div>

            <div className="flex flex-col gap-3">
              {exForms.flatMap((ex, i) => {
                const card = (
                  <motion.div
                    key={`ex-${i}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4"
                    style={{ background: "rgba(240,235,255,0.3)", border: "1px solid rgba(212,192,255,0.4)" }}
                  >
                    {/* Name row */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold w-6 text-center flex-shrink-0 rounded-lg py-0.5"
                        style={{ background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category] }}>
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={ex.name}
                        onChange={e => updateEx(i, "name", e.target.value)}
                        placeholder={`Exercice ${i + 1} (ex : Squat, Pompes…)`}
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(212,192,255,0.3)", color: "#2D3748" }}
                      />
                      {exForms.length > 1 && (
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeEx(i)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                          style={{ background: "rgba(252,129,129,0.12)" }}>
                          <Trash2 size={11} strokeWidth={1.8} style={{ color: "#FC8181" }} />
                        </motion.button>
                      )}
                    </div>

                    {/* Controls — 3 cols */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Séries */}
                      <div>
                        <p className="text-[9px] font-semibold tracking-widest uppercase mb-1.5 text-center" style={{ color: "#A0AEC0" }}>Séries</p>
                        <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,192,255,0.3)" }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "sets", Math.max(1, ex.sets - 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "#A78BFA" }}>−</motion.button>
                          <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{ex.sets}</span>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "sets", Math.min(10, ex.sets + 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "#A78BFA" }}>+</motion.button>
                        </div>
                      </div>

                      {/* Reps */}
                      <div>
                        <p className="text-[9px] font-semibold tracking-widest uppercase mb-1.5 text-center" style={{ color: "#A0AEC0" }}>Répétitions</p>
                        <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,192,255,0.3)" }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "reps", Math.max(1, ex.reps - 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "#A78BFA" }}>−</motion.button>
                          <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{ex.reps}</span>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "reps", Math.min(100, ex.reps + 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "#A78BFA" }}>+</motion.button>
                        </div>
                      </div>

                      {/* Repos entre séries */}
                      <div>
                        <p className="text-[9px] font-semibold tracking-widest uppercase mb-1.5 text-center" style={{ color: "#A0AEC0" }}>Repos (s)</p>
                        <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,192,255,0.3)" }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "rest", Math.max(0, ex.rest - 15))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "#A78BFA" }}>−</motion.button>
                          <span className="text-xs font-semibold" style={{ color: "#2D3748" }}>{ex.rest}s</span>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "rest", Math.min(300, ex.rest + 15))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "#A78BFA" }}>+</motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );

                /* Séparateur de récupération — uniquement entre deux exercices */
                const separator = (i < exForms.length - 1) ? (
                  <div key={`sep-${i}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(167,139,250,0.07)", border: "1px dashed rgba(167,139,250,0.28)" }}
                  >
                    <Clock size={11} strokeWidth={1.8} style={{ color: "#A78BFA", flexShrink: 0 }} />
                    <span className="text-[10px] font-medium flex-1" style={{ color: "#A78BFA" }}>
                      Récupération entre exercices
                    </span>
                    <div className="flex items-center gap-1.5">
                      <motion.button whileTap={{ scale: 0.85 }}
                        onClick={() => updateEx(i, "restAfter", Math.max(0, ex.restAfter - 15))}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                        style={{ color: "#A78BFA" }}>−</motion.button>
                      <span className="text-xs font-semibold w-8 text-center tabular-nums" style={{ color: "#2D3748" }}>
                        {ex.restAfter}s
                      </span>
                      <motion.button whileTap={{ scale: 0.85 }}
                        onClick={() => updateEx(i, "restAfter", Math.min(300, ex.restAfter + 15))}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                        style={{ color: "#A78BFA" }}>+</motion.button>
                    </div>
                  </div>
                ) : null;

                return separator ? [card, separator] : [card];
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(240,235,255,0.8)" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={!title.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
            style={{
              background: title.trim()
                ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)"
                : "rgba(240,235,255,0.5)",
              color: title.trim() ? "#2D3748" : "#A0AEC0",
              boxShadow: title.trim() ? "inset 0 1px 0 rgba(255,255,255,0.8)" : "none",
            }}
          >
            {isEdit ? "Enregistrer les modifications" : "Créer la séance"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────── */
export default function ProgressionPage() {
  const [activeTab, setActiveTab]           = useState<"progression" | "mes-seances">("progression");
  const [shareData, setShareData]           = useState<PerformanceData | null>(null);
  const [activeWorkout, setActiveWorkout]   = useState<WorkoutSession | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<"tous" | WorkoutCategory>("tous");
  const [customSessions, setCustomSessions] = useState<WorkoutSession[]>([]);
  const [loadingCustom, setLoadingCustom]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [realTimeline, setRealTimeline] = useState<TimelineEvent[]>([]);
  const [libraryFilter, setLibraryFilter] = useState<"tous" | WorkoutCategory>("tous");
  const { settings } = useProfileSettings();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "right" ? 250 : -250, behavior: "smooth" });
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleVisibilityChange = useCallback(async (sessionId: string, vis: "private" | "friends" | "public") => {
    if (user) {
      const supabase = createClient();
      await supabase.from("custom_sessions").update({ visibility: vis }).eq("id", sessionId);
    }
    setCustomSessions(prev => prev.map(s => s.id === sessionId ? { ...s, visibility: vis } : s));
    const labels = { private: "Séance privée ✓", friends: "Visible par tes amis ✓", public: "Séance publiée 🌐" };
    showToast(labels[vis]);
  }, [user]); // eslint-disable-line

  // Charts state
  const [weights, setWeights]         = useState<WeightEntry[]>([]);
  const [weightRange, setWeightRange] = useState<"week" | "month">("week");
  const [calorieWeek, setCalorieWeek] = useState<CalorieDay[]>([]);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, user_id, title, category, duration_minutes, calories_burned, started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(15);
    if (!error && data && data.length > 0) setRealTimeline(data.map(dbSessionToEvent));
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Charger les séances personnalisées depuis Supabase ──
  const fetchCustomSessions = useCallback(async () => {
    if (!user) return;
    setLoadingCustom(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("custom_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setLoadingCustom(false);
    if (error) { console.error("custom_sessions fetch:", error); return; }
    if (!data) return;
    setCustomSessions(data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      subtitle: r.subtitle as string,
      category: r.category as WorkoutCategory,
      duration: r.duration as number,
      difficulty: r.difficulty as WorkoutSession["difficulty"],
      exercises: r.exercises as number,
      muscles: (r.muscles as string[]) ?? [],
      accent: r.accent as string,
      icon: r.icon as string,
      exerciseList: (r.exercise_list as Exercise[]) ?? [],
      visibility: (r.visibility as "private" | "friends" | "public") ?? "private",
    })));
  }, [user]);

  useEffect(() => { fetchCustomSessions(); }, [fetchCustomSessions]);

  const fetchProgressData = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 29);
    const sevenAgo  = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 6);
    const [{ data: wData }, { data: cData }] = await Promise.all([
      supabase.from("weight_logs").select("date, weight_kg")
        .eq("user_id", user.id).gte("date", toDateStr(thirtyAgo))
        .order("date", { ascending: true }),
      supabase.from("nutrition_logs").select("date, calories")
        .eq("user_id", user.id).gte("date", toDateStr(sevenAgo)),
    ]);
    if (wData) setWeights(wData.map((r: { date: string; weight_kg: number }) => ({ date: r.date, weight: r.weight_kg })));
    const dayNames = ["D", "L", "M", "M", "J", "V", "S"];
    const calMap: Record<string, number> = {};
    (cData ?? []).forEach((r: { date: string; calories: number }) => {
      calMap[r.date] = (calMap[r.date] ?? 0) + r.calories;
    });
    setCalorieWeek(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const ds = toDateStr(d);
      return { date: ds, total: calMap[ds] ?? 0, label: dayNames[d.getDay()] };
    }));
  }, [user]); // eslint-disable-line

  useEffect(() => { fetchProgressData(); }, [fetchProgressData]);

  const addWeight = async (kg: number) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    const supabase = createClient();
    const today = toDateStr(new Date());
    const { error } = await supabase.from("weight_logs").upsert(
      { user_id: user.id, date: today, weight_kg: kg },
      { onConflict: "user_id,date" }
    );
    if (!error) {
      setWeights(prev => {
        const filtered = prev.filter(w => w.date !== today);
        return [...filtered, { date: today, weight: kg }].sort((a, b) => a.date.localeCompare(b.date));
      });
      showToast(`Poids enregistré : ${kg} kg ✓`);
    }
  };

  const handleStartWorkout = async (session: WorkoutSession) => {
    /* Always open the guided workout modal */
    setActiveWorkout(session);
    /* Log to Supabase if authenticated */
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("workout_sessions").insert({
      user_id: user.id, title: session.title, category: session.category,
      duration_minutes: session.duration, calories_burned: Math.round(session.duration * 6.5),
      started_at: new Date().toISOString(),
    });
    if (!error) { showToast(`${session.title} démarrée ✓`); setTimeout(fetchSessions, 500); }
  };

  const displayTimeline = realTimeline.length > 0 ? realTimeline : timelineEvents;

  const filteredSessions = workoutSessions
    .filter((s) => categoryFilter === "tous" || s.category === categoryFilter)
    .sort((a, b) => {
      const aD = completedWorkouts.has(a.id) ? 1 : 0;
      const bD = completedWorkouts.has(b.id) ? 1 : 0;
      return aD - bD;
    });

  const groups = displayTimeline.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    (acc[event.date] = acc[event.date] || []).push(event);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col px-4 pt-10 pb-36 md:pl-24 md:pr-8 md:pt-10 md:pb-10 relative overflow-x-hidden">
      {/* ── Contenu ── */}
      <div className="relative flex flex-col flex-1">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#A0AEC0" }}>
          Votre Journey
        </p>
        <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>Ma Progression</h1>
      </motion.div>

      {/* ── Tab switcher ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex gap-2 mb-8"
      >
        {([
          { key: "progression", label: "Progression" },
          { key: "mes-seances", label: "Mes Séances" },
        ] as const).map(({ key, label }) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(key)}
            className="px-5 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200"
            style={activeTab === key
              ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 12px rgba(167,139,250,0.2)" }
              : { background: "rgba(255,255,255,0.55)", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.7)" }
            }
          >
            {label}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">

      {/* ══════════ TAB PROGRESSION ══════════ */}
      {activeTab === "progression" && (
        <motion.div
          key="progression-tab"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-0"
        >

      {/* ── Graphiques ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mb-8 max-w-5xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-0.5" style={{ color: "#A0AEC0" }}>
              Analyse
            </p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Statistiques</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WeightChart
            data={weights}
            range={weightRange}
            onRangeChange={setWeightRange}
            onAdd={addWeight}
          />
          <CalorieChart data={calorieWeek} goal={2200} />
        </div>
      </motion.div>

      {/* Upload Zones */}
      <motion.div
        className="flex gap-3 mb-10 max-w-5xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <UploadZone
          icon={Camera} label="Scan Nutrition" sublabel="L'IA reconnaît vos repas"
          accept="image/*" cardClass="lg-rose"
          captureMode="photo" captureLabel="Photographier votre repas"
        />
        <UploadZone
          icon={Video} label="Analyse Posture" sublabel="Feedback en temps réel"
          accept="video/*" cardClass="lg-turquoise"
          captureMode="video" captureLabel="Enregistrer votre mouvement"
        />
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

        </motion.div>
      )}

      {/* ══════════ TAB MES SÉANCES ══════════ */}
      {activeTab === "mes-seances" && (
        <motion.div
          key="mes-seances-tab"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-0"
        >

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between mb-6 max-w-5xl"
          >
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-0.5" style={{ color: "#A0AEC0" }}>
                Catalogue
              </p>
              <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Séances Aura</h2>
            </div>
            <span
              className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA" }}
            >
              {workoutSessions.length} séances
            </span>
          </motion.div>

          {/* Category filter + arrow buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex items-center gap-2 mb-4 max-w-5xl"
          >
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
            <div className="hidden md:flex gap-1 flex-shrink-0">
              {([{ dir: "left" as const, Icon: ChevronLeft }, { dir: "right" as const, Icon: ChevronRight }]).map(({ dir, Icon }) => (
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
          </motion.div>

          {/* Cards carousel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative -mx-6 mb-10"
          >
            <div className="absolute left-0 top-0 bottom-4 w-8 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, rgba(248,247,252,0.9) 0%, transparent 100%)" }} />
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
                  <WorkoutCard
                    key={session.id}
                    session={session}
                    gender={settings.gender}
                    isActive={activeWorkout?.id === session.id}
                    isDone={completedWorkouts.has(session.id)}
                    onStart={handleStartWorkout}
                  />
                ))}
              </AnimatePresence>
              {/* "Créer" placeholder card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCreateModal(true)}
                className="flex-shrink-0 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer"
                style={{
                  width: 180,
                  minHeight: 280,
                  background: "rgba(255,255,255,0.5)",
                  backdropFilter: "blur(10px)",
                  border: "2px dashed rgba(167,139,250,0.35)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)" }}
                >
                  <Plus size={20} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium" style={{ color: "#2D3748" }}>Créer</p>
                  <p className="text-[10px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>Ma propre séance</p>
                </div>
              </motion.div>
              <div className="flex-shrink-0 w-6" />
            </div>
          </motion.div>

          {/* ── Ma Bibliothèque ── */}
          {(() => {
            const filteredCustom = customSessions.filter(
              s => libraryFilter === "tous" || s.category === libraryFilter
            );
            const totalMin = customSessions.reduce((acc, s) => acc + s.duration, 0);

            return (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="max-w-5xl mb-8"
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-0.5" style={{ color: "#A0AEC0" }}>
                      Mes créations
                    </p>
                    <h2 className="text-lg font-light flex items-center gap-2" style={{ color: "#2D3748" }}>
                      Ma Bibliothèque
                      {customSessions.length > 0 && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA" }}
                        >
                          {customSessions.length}
                        </span>
                      )}
                    </h2>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
                  >
                    <Plus size={13} strokeWidth={2} />
                    Créer
                  </motion.button>
                </div>

                {/* Summary banner */}
                {customSessions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
                    style={{
                      background: "linear-gradient(135deg, rgba(212,192,255,0.16) 0%, rgba(245,230,163,0.13) 100%)",
                      border: "1px solid rgba(167,139,250,0.16)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, rgba(212,192,255,0.45) 0%, rgba(245,230,163,0.4) 100%)" }}
                    >
                      <Sparkles size={15} strokeWidth={1.4} style={{ color: "#A78BFA" }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#2D3748" }}>
                        {customSessions.length} séance{customSessions.length > 1 ? "s" : ""} personnalisée{customSessions.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-[10px] font-light" style={{ color: "#A0AEC0" }}>
                        {totalMin} min de contenu créé sur mesure
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Category filter chips */}
                {customSessions.length > 0 && (
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {categoryFilters.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setLibraryFilter(key)}
                        className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                        style={libraryFilter === key
                          ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                          : { background: "rgba(255,255,255,0.55)", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.6)" }
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid content */}
                {loadingCustom ? (
                  <div className="flex items-center gap-2 py-4">
                    <motion.div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: "rgba(167,139,250,0.3)", borderTopColor: "#A78BFA" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                    />
                    <span className="text-xs font-light" style={{ color: "#A0AEC0" }}>Chargement de ta bibliothèque…</span>
                  </div>
                ) : filteredCustom.length > 0 ? (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredCustom.map(s => (
                        <LibraryCard
                          key={s.id}
                          session={s}
                          isActive={activeWorkout?.id === s.id}
                          onStart={handleStartWorkout}
                          onEdit={(session) => { setEditSession(session); setShowCreateModal(true); }}
                          onDelete={async (id) => {
                            if (user) {
                              const supabase = createClient();
                              await supabase.from("custom_sessions").delete().eq("id", id);
                            }
                            setCustomSessions(p => p.filter(cs => cs.id !== id));
                          }}
                          onVisibilityChange={handleVisibilityChange}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : customSessions.length === 0 ? (
                  /* Empty state */
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-14 gap-5 rounded-3xl"
                    style={{ background: "rgba(255,255,255,0.55)", border: "1px dashed rgba(167,139,250,0.3)" }}
                  >
                    <div
                      className="w-16 h-16 rounded-3xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, rgba(212,192,255,0.35) 0%, rgba(245,230,163,0.3) 100%)",
                        border: "1px solid rgba(167,139,250,0.15)",
                      }}
                    >
                      <Sparkles size={24} strokeWidth={1.3} style={{ color: "#A78BFA" }} />
                    </div>
                    <div className="text-center px-6">
                      <p className="text-base font-light" style={{ color: "#2D3748" }}>Ta bibliothèque est vide</p>
                      <p className="text-xs font-light mt-1.5 leading-relaxed" style={{ color: "#A0AEC0" }}>
                        Crée ta première séance sur mesure et retrouve-la ici à tout moment.
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                        color: "#2D3748",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                      }}
                    >
                      <Plus size={14} strokeWidth={2} />
                      Créer ma première séance
                    </motion.button>
                  </motion.div>
                ) : (
                  /* No sessions match filter */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center py-10 gap-2 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.6)" }}
                  >
                    <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                      Aucune séance dans cette catégorie
                    </p>
                    <button
                      onClick={() => setLibraryFilter("tous")}
                      className="text-xs font-medium cursor-pointer mt-1"
                      style={{ color: "#A78BFA" }}
                    >
                      Voir toutes les séances
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })()}

        </motion.div>
      )}

      </AnimatePresence>

      <SharePerformanceModal
        open={shareData !== null}
        onClose={() => setShareData(null)}
        data={shareData ?? (displayTimeline[0]?.performance ?? timelineEvents[0].performance)}
      />

      {/* ── Guided workout modal ── */}
      <AnimatePresence>
        {activeWorkout && (
          <WorkoutGuideModal
            sessionId={activeWorkout.id}
            title={activeWorkout.title}
            accent={activeWorkout.accent}
            duration={activeWorkout.duration}
            difficulty={activeWorkout.difficulty}
            category={activeWorkout.category}
            exerciseList={activeWorkout.exerciseList}
            onClose={() => setActiveWorkout(null)}
            onComplete={() =>
              setCompletedWorkouts((prev) => new Set([...prev, activeWorkout.id]))
            }
          />
        )}
      </AnimatePresence>

      {/* ── Create session modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSessionModal
            key={editSession?.id ?? "new"}
            onClose={() => { setShowCreateModal(false); setEditSession(null); }}
            editSession={editSession}
            onCreate={async (s) => {
              const supabase = createClient();
              const existingSession = customSessions.find(cs => cs.id === s.id);
              const row = {
                id: s.id,
                user_id: user?.id,
                title: s.title,
                subtitle: s.subtitle,
                category: s.category,
                duration: s.duration,
                difficulty: s.difficulty,
                exercises: s.exercises,
                muscles: s.muscles,
                accent: s.accent,
                icon: s.icon,
                exercise_list: s.exerciseList ?? [],
                visibility: existingSession?.visibility ?? "private",
                updated_at: new Date().toISOString(),
              };
              if (editSession) {
                if (user) {
                  const { error } = await supabase.from("custom_sessions").update(row).eq("id", s.id);
                  if (error) { console.error(error); showToast("Erreur lors de la modification"); return; }
                }
                setCustomSessions(p => p.map(cs => cs.id === s.id ? s : cs));
                showToast(`"${s.title}" modifiée ✓`);
              } else {
                if (user) {
                  const { error } = await supabase.from("custom_sessions").insert(row);
                  if (error) { console.error(error); showToast("Erreur lors de la création"); return; }
                }
                setCustomSessions(p => [s, ...p]);
                showToast(`"${s.title}" créée ✓`);
              }
              setEditSession(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 32px rgba(167,139,250,0.2)", whiteSpace: "nowrap" }}>
            <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
