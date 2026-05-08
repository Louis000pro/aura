"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Video, CheckCircle, Clock, ChevronRight, ChevronLeft, Upload,
  Share2, Dumbbell, Apple, Sun, Play, Flame, Wind, Sparkles, Layers, Check,
  X, CameraOff, Square, RefreshCw,
} from "lucide-react";
import SharePerformanceModal from "@/components/SharePerformanceModal";
import WorkoutGuideModal from "@/components/WorkoutGuideModal";
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

/* ─── Animation variants ────────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
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

/* ─── Page ──────────────────────────────────────────────── */
export default function ProgressionPage() {
  const [shareData, setShareData]           = useState<PerformanceData | null>(null);
  const [activeWorkout, setActiveWorkout]   = useState<WorkoutSession | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<"tous" | WorkoutCategory>("tous");
  const [toast, setToast] = useState<string | null>(null);
  const [realTimeline, setRealTimeline] = useState<TimelineEvent[]>([]);
  const { settings } = useProfileSettings();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "right" ? 250 : -250, behavior: "smooth" });
  const [particles, setParticles] = useState<{id:number,x:number,y:number,size:number,delay:number,duration:number,opacity:number}[]>([]);
  useEffect(() => {
    setParticles(Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: i < 3 ? 12 + Math.random() * 10 : i < 6 ? 5 + Math.random() * 4 : 3 + Math.random() * 2,
      delay: Math.random() * 6,
      duration: 9 + Math.random() * 8,
      opacity: 0.72 + Math.random() * 0.22,
    })));
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

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

  useEffect(() => {
    setParticles(Array.from({ length: 10 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: i < 3 ? 12 + Math.random() * 10 : i < 6 ? 5 + Math.random() * 4 : 3 + Math.random() * 2,
      delay: Math.random() * 6, duration: 9 + Math.random() * 8,
      opacity: 0.72 + Math.random() * 0.22,
    })));
  }, []);

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
    <div className="min-h-screen flex flex-col px-6 pt-10 pb-4 max-w-3xl mx-auto md:mx-0 relative overflow-x-hidden" style={{ background: "linear-gradient(135deg, #f2eeff 0%, #fffef5 50%, #f2eeff 100%)" }}>
      {/* ── Calque déco : blobs · anneaux · particules ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {/* Blobs statiques */}
        <div className="absolute rounded-full"
          style={{ top: "-5%", right: "-8%", width: 560, height: 560, background: "rgba(147,112,219,0.65)", filter: "blur(80px)" }} />
        <div className="absolute rounded-full"
          style={{ bottom: "-5%", left: "-8%", width: 520, height: 520, background: "rgba(200,155,50,0.55)", filter: "blur(80px)" }} />
        {/* Rings — GPU composited */}
        {[500, 370, 260].map((size, i) => (
          <motion.div key={size} className="absolute rounded-full"
            style={{
              width: size, height: size,
              border: `1px solid rgba(167,139,250,${i === 0 ? 0.30 : i === 1 ? 0.42 : 0.30})`,
              top: "50%", left: "50%", marginLeft: -size / 2, marginTop: -size / 2,
              willChange: "transform",
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {particles.map((p) => (
          <motion.div key={p.id} className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
              background: p.id % 3 === 0 ? `rgba(167,139,250,${p.opacity})` : p.id % 3 === 1 ? `rgba(212,192,255,${p.opacity})` : `rgba(212,168,67,${p.opacity * 0.85})`,
              willChange: "transform",
            }}
            animate={{ y: ["-15px", "15px", "-15px"] }}
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
            onClose={() => setActiveWorkout(null)}
            onComplete={() =>
              setCompletedWorkouts((prev) => new Set([...prev, activeWorkout.id]))
            }
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
