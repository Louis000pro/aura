"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CameraOff, Play, Square, RotateCcw,
  TrendingUp, Target, Zap, CheckCircle, AlertTriangle, XCircle, Loader2,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
type Landmark   = { x: number; y: number; z: number; visibility?: number };
type ExerciseId = "squat" | "pushup" | "curl" | "lunge" | "plank";
type MsgType    = "good" | "warn" | "error";
interface FeedMsg { text: string; type: MsgType }

interface ExerciseDef {
  id: ExerciseId;
  name: string;
  muscles: string;
  tip: string;
}

/* ─── Exercices ──────────────────────────────────────────────────── */
const EXERCISES: ExerciseDef[] = [
  { id: "squat",  name: "Squat",       muscles: "Quadriceps · Fessiers", tip: "Pieds écartés épaule, descends jusqu'à 90°, dos droit" },
  { id: "pushup", name: "Pompes",      muscles: "Pectoraux · Triceps",   tip: "Corps aligné, coudes à 90° en bas" },
  { id: "curl",   name: "Curl Biceps", muscles: "Biceps",                tip: "Coude fixe, monte jusqu'en haut" },
  { id: "lunge",  name: "Fente",       muscles: "Quadriceps · Fessiers", tip: "Genou avant à 90°, buste bien droit" },
  { id: "plank",  name: "Gainage",     muscles: "Abdos · Dos",           tip: "Corps aligné de la tête aux talons" },
];

/* ─── Landmarks MediaPipe (indices) ─────────────────────────────── */
const L = {
  NOSE: 0, L_SHO: 11, R_SHO: 12, L_ELB: 13, R_ELB: 14,
  L_WRI: 15, R_WRI: 16, L_HIP: 23, R_HIP: 24,
  L_KNE: 25, R_KNE: 26, L_ANK: 27, R_ANK: 28,
};
const MIN_LM = 29; // minimum landmark count required

/* ─── Angle entre 3 points (degrés) ─────────────────────────────── */
function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let d = Math.abs(r * 180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}

/* ─── Visibilité minimale ────────────────────────────────────────── */
function vis(lm: Landmark, thresh = 0.4): boolean {
  return (lm.visibility ?? 1) >= thresh;
}

/* ─── Analyses par exercice ──────────────────────────────────────── */
type AnalysisResult = { msgs: FeedMsg[]; score: number; newPhase: "up" | "down" };

function analyzeSquat(lm: Landmark[], phase: "up" | "down"): AnalysisResult {
  const msgs: FeedMsg[] = [];
  let score = 100;
  const lHip = lm[L.L_HIP], lKne = lm[L.L_KNE], lAnk = lm[L.L_ANK];
  const rHip = lm[L.R_HIP], rKne = lm[L.R_KNE], rAnk = lm[L.R_ANK];
  const lSho = lm[L.L_SHO];

  const kAngle = (angleDeg(lHip, lKne, lAnk) + angleDeg(rHip, rKne, rAnk)) / 2;
  const back   = angleDeg(lSho, lHip, lKne);
  let newPhase = phase;

  if (kAngle < 115) newPhase = "down";
  if (kAngle > 158) newPhase = "up";

  if (newPhase === "down") {
    if (kAngle > 118) { msgs.push({ text: "Descends encore", type: "warn" }); score -= 20; }
    else              { msgs.push({ text: "Bonne profondeur", type: "good" }); }
  }
  if (back < 62) {
    msgs.push({ text: "Garde le dos droit", type: "error" }); score -= 28;
  } else if (back > 78) {
    msgs.push({ text: "Dos bien droit", type: "good" });
  }
  return { msgs: msgs.slice(0, 2), score: Math.max(0, score), newPhase };
}

function analyzePushup(lm: Landmark[], phase: "up" | "down"): AnalysisResult {
  const msgs: FeedMsg[] = [];
  let score = 100;
  const lSho = lm[L.L_SHO], lElb = lm[L.L_ELB], lWri = lm[L.L_WRI], lHip = lm[L.L_HIP], lAnk = lm[L.L_ANK];
  const rSho = lm[L.R_SHO], rElb = lm[L.R_ELB], rWri = lm[L.R_WRI];

  const eAngle = (angleDeg(lSho, lElb, lWri) + angleDeg(rSho, rElb, rWri)) / 2;
  const body   = angleDeg(lSho, lHip, lAnk);
  let newPhase = phase;

  if (eAngle < 112) newPhase = "down";
  if (eAngle > 158) newPhase = "up";

  if (newPhase === "down") {
    if (eAngle > 118) { msgs.push({ text: "Descends encore", type: "warn" }); score -= 20; }
    else              { msgs.push({ text: "Belle descente", type: "good" }); }
  }
  if (body < 152) {
    msgs.push({ text: lHip.y < lSho.y ? "Baisse les hanches" : "Lève les hanches", type: "error" });
    score -= 28;
  } else {
    msgs.push({ text: "Corps aligné", type: "good" });
  }
  return { msgs: msgs.slice(0, 2), score: Math.max(0, score), newPhase };
}

function analyzeCurl(lm: Landmark[], phase: "up" | "down"): AnalysisResult {
  const msgs: FeedMsg[] = [];
  let score = 100;
  const lSho = lm[L.L_SHO], lElb = lm[L.L_ELB], lWri = lm[L.L_WRI], lHip = lm[L.L_HIP];
  const rSho = lm[L.R_SHO], rElb = lm[L.R_ELB], rWri = lm[L.R_WRI];

  const eAngle = Math.min(angleDeg(lSho, lElb, lWri), angleDeg(rSho, rElb, rWri));
  const sAngle = angleDeg(lHip, lSho, lElb);
  let newPhase = phase;

  if (eAngle < 58)  newPhase = "down";
  if (eAngle > 152) newPhase = "up";

  if (sAngle < 138) {
    msgs.push({ text: "Ne balance pas l'épaule", type: "error" }); score -= 25;
  } else {
    msgs.push({ text: "Épaule stable", type: "good" });
  }
  if (newPhase === "down" && eAngle > 35) {
    msgs.push({ text: "Monte plus haut", type: "warn" }); score -= 15;
  } else if (newPhase === "down") {
    msgs.push({ text: "Belle amplitude", type: "good" });
  }
  return { msgs: msgs.slice(0, 2), score: Math.max(0, score), newPhase };
}

function analyzeLunge(lm: Landmark[], phase: "up" | "down"): AnalysisResult {
  const msgs: FeedMsg[] = [];
  let score = 100;
  const lHip = lm[L.L_HIP], lKne = lm[L.L_KNE], lAnk = lm[L.L_ANK], lSho = lm[L.L_SHO];
  const rHip = lm[L.R_HIP], rKne = lm[L.R_KNE], rAnk = lm[L.R_ANK];

  const frontKnee = Math.min(angleDeg(lHip, lKne, lAnk), angleDeg(rHip, rKne, rAnk));
  const torso     = angleDeg(lSho, lHip, lKne);
  let newPhase = phase;

  if (frontKnee < 108) newPhase = "down";
  if (frontKnee > 162) newPhase = "up";

  if (newPhase === "down") {
    if (frontKnee > 112) { msgs.push({ text: "Descends encore", type: "warn" }); score -= 20; }
    else                 { msgs.push({ text: "Bonne profondeur", type: "good" }); }
  }
  if (torso < 68) { msgs.push({ text: "Redresse le buste", type: "error" }); score -= 22; }
  return { msgs: msgs.slice(0, 2), score: Math.max(0, score), newPhase };
}

function analyzePlank(lm: Landmark[]): AnalysisResult {
  const msgs: FeedMsg[] = [];
  let score = 100;
  const lSho = lm[L.L_SHO], lHip = lm[L.L_HIP], lAnk = lm[L.L_ANK];
  const nose  = lm[L.NOSE];

  const body = angleDeg(lSho, lHip, lAnk);
  const neck = angleDeg(nose, lSho, lHip);

  if (body < 155) {
    msgs.push({ text: lHip.y < lSho.y ? "Baisse les hanches" : "Lève les hanches", type: "error" });
    score -= 32;
  } else {
    msgs.push({ text: "Corps parfaitement aligné", type: "good" });
  }
  if (neck < 142) { msgs.push({ text: "Regarde le sol", type: "warn" }); score -= 15; }
  return { msgs: msgs.slice(0, 2), score: Math.max(0, score), newPhase: "up" };
}

function runAnalysis(id: ExerciseId, lm: Landmark[], phase: "up" | "down"): AnalysisResult {
  if (lm.length < MIN_LM) return { msgs: [], score: 100, newPhase: phase };
  // Skip analysis if key landmarks are not visible
  const keyOk = vis(lm[L.L_HIP]) || vis(lm[L.R_HIP]);
  if (!keyOk) return { msgs: [], score: 100, newPhase: phase };

  switch (id) {
    case "squat":  return analyzeSquat(lm, phase);
    case "pushup": return analyzePushup(lm, phase);
    case "curl":   return analyzeCurl(lm, phase);
    case "lunge":  return analyzeLunge(lm, phase);
    case "plank":  return analyzePlank(lm);
    default:       return { msgs: [], score: 100, newPhase: phase };
  }
}

/* ─── Feedback icon ──────────────────────────────────────────────── */
function FeedIcon({ type }: { type: MsgType }) {
  if (type === "good")  return <CheckCircle  size={14} style={{ color: "#059669", flexShrink: 0 }} />;
  if (type === "warn")  return <AlertTriangle size={14} style={{ color: "#D97706", flexShrink: 0 }} />;
  return <XCircle size={14} style={{ color: "#DC2626", flexShrink: 0 }} />;
}

/* ─── Composant principal ─────────────────────────────────────────── */
export default function ExerciseAnalyzer() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);
  const activeRef  = useRef(false); // true while detection loop should run

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connectionsRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DrawingUtilsRef  = useRef<any>(null);

  const [selected,   setSelected]   = useState<ExerciseId>("squat");
  const [running,    setRunning]     = useState(false);
  const [loading,    setLoading]     = useState(false);
  const [mpReady,    setMpReady]     = useState(false);
  const [mpError,    setMpError]     = useState(false);
  const [reps,       setReps]        = useState(0);
  const [score,      setScore]       = useState(100);
  const [messages,   setMessages]    = useState<FeedMsg[]>([]);
  const [phase,      setPhase]       = useState<"up" | "down">("up");
  const [camError,   setCamError]    = useState<string | null>(null);

  const phaseRef    = useRef<"up" | "down">("up");
  const repsRef     = useRef(0);
  const selectedRef = useRef<ExerciseId>("squat");
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /* ── Chargement MediaPipe (une seule fois au montage) ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { PoseLandmarker, FilesetResolver, DrawingUtils } = vision;
        const fs = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const pl = await PoseLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (!cancelled) {
          landmarkerRef.current    = pl;
          connectionsRef.current   = PoseLandmarker.POSE_CONNECTIONS;
          DrawingUtilsRef.current  = DrawingUtils;
          setMpReady(true);
        }
      } catch (e) {
        console.error("MediaPipe load error:", e);
        if (!cancelled) setMpError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Arrêt propre de la boucle + caméra ── */
  const stopAnalysis = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setRunning(false);
    // Effacer le canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => () => stopAnalysis(), [stopAnalysis]);

  /* ── Démarrage ── */
  const startAnalysis = useCallback(async () => {
    if (!mpReady || !landmarkerRef.current) return;
    setCamError(null);
    setLoading(true);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
    } catch {
      setLoading(false);
      setCamError("Accès caméra refusé. Vérifie les permissions du navigateur.");
      return;
    }

    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach(t => t.stop()); setLoading(false); return; }

    streamRef.current = stream;
    video.srcObject = stream;

    // Attendre les métadonnées + lecture
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout")), 8000);
        const onMeta = () => { clearTimeout(timeout); resolve(); };
        if (video.readyState >= 1) { clearTimeout(timeout); resolve(); }
        else video.addEventListener("loadedmetadata", onMeta, { once: true });
      });
      await video.play();
    } catch {
      stream.getTracks().forEach(t => t.stop());
      setLoading(false);
      setCamError("Impossible de lire le flux caméra.");
      return;
    }

    // Reset counters
    repsRef.current = 0; phaseRef.current = "up";
    setReps(0); setScore(100); setMessages([]); setPhase("up");
    setLoading(false);
    setRunning(true);
    activeRef.current = true;

    /* ── Boucle de détection ── */
    const detect = () => {
      if (!activeRef.current) return;

      const vid    = videoRef.current;
      const canvas = canvasRef.current;
      const lm_ref = landmarkerRef.current;

      if (!vid || !canvas || !lm_ref || vid.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      canvas.width  = vid.videoWidth  || 640;
      canvas.height = vid.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(detect); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let result;
      try {
        result = lm_ref.detectForVideo(vid, performance.now());
      } catch {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      if (result?.landmarks?.length > 0) {
        const landmarks: Landmark[] = result.landmarks[0];

        /* Dessin du squelette */
        if (DrawingUtilsRef.current && connectionsRef.current) {
          try {
            const du = new DrawingUtilsRef.current(ctx);
            du.drawConnectors(landmarks, connectionsRef.current, {
              color: "rgba(167,139,250,0.55)", lineWidth: 2,
            });
            du.drawLandmarks(landmarks, { color: "#A78BFA", radius: 3.5, lineWidth: 1.5 });
          } catch { /* DrawingUtils failure non-fatal */ }
        }

        /* Analyse + feedback */
        const res = runAnalysis(selectedRef.current, landmarks, phaseRef.current);

        /* Comptage rep : transition down → up */
        if (res.newPhase !== phaseRef.current) {
          if (res.newPhase === "up" && phaseRef.current === "down") {
            repsRef.current += 1;
            setReps(repsRef.current);
          }
          phaseRef.current = res.newPhase;
          setPhase(res.newPhase);
        }

        setScore(res.score);
        if (res.msgs.length > 0) setMessages(res.msgs);
      } else {
        // Aucune pose détectée — on vide les messages
        setMessages([]);
      }

      rafRef.current = requestAnimationFrame(detect);
    };
    rafRef.current = requestAnimationFrame(detect);
  }, [mpReady]);

  const reset = useCallback(() => {
    repsRef.current = 0; phaseRef.current = "up";
    setReps(0); setScore(100); setMessages([]); setPhase("up");
  }, []);

  const changeExercise = (id: ExerciseId) => {
    if (running) stopAnalysis();
    setSelected(id);
    reset();
  };

  const scoreColor = score >= 80 ? "#34D399" : score >= 55 ? "#FBBF24" : "#F87171";
  const ex = EXERCISES.find(e => e.id === selected)!;

  return (
    <div className="flex flex-col gap-5">

      {/* En-tête */}
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#A0AEC0" }}>
          Intelligence Mouvement
        </p>
        <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Analyse en temps réel</h2>
      </div>

      {/* Sélecteur d'exercice */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {EXERCISES.map(e => (
          <motion.button key={e.id} whileTap={{ scale: 0.92 }}
            onClick={() => changeExercise(e.id)}
            className="flex items-center px-3.5 py-2 rounded-2xl text-xs font-semibold flex-shrink-0 cursor-pointer transition-all"
            style={selected === e.id
              ? { background: "linear-gradient(135deg,#818CF8,#6366F1)", color: "#fff", boxShadow: "0 3px 14px rgba(99,102,241,0.38)" }
              : { background: "rgba(240,235,255,0.6)", color: "#A0AEC0", border: "1px solid rgba(212,192,255,0.3)" }
            }>
            {e.name}
          </motion.button>
        ))}
      </div>

      {/* Info exercice */}
      <div className="px-4 py-3 rounded-2xl"
        style={{ background: "rgba(240,235,255,0.45)", border: "1px solid rgba(212,192,255,0.28)" }}>
        <p className="text-sm font-semibold leading-tight" style={{ color: "#2D3748" }}>{ex.name}</p>
        <p className="text-[11px] mt-1 font-light leading-snug" style={{ color: "#718096" }}>{ex.tip}</p>
        <p className="text-[10px] mt-1.5 font-medium" style={{ color: "#A78BFA" }}>{ex.muscles}</p>
      </div>

      {/* Zone caméra */}
      <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3", maxHeight: 380 }}>
        {/* Vidéo mirroir */}
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }} playsInline muted />
        {/* Canvas skeleton (même miroir pour alignement parfait) */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
          style={{ transform: "scaleX(-1)" }} />

        {/* Overlay démarrage / erreur */}
        {!running && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
            {camError ? (
              <>
                <CameraOff size={26} style={{ color: "#F87171" }} />
                <p className="text-sm text-red-300 text-center px-6 leading-snug">{camError}</p>
              </>
            ) : mpError ? (
              <>
                <XCircle size={26} style={{ color: "#F87171" }} />
                <p className="text-sm text-red-300 text-center px-6 leading-snug">
                  Erreur de chargement du modèle IA.<br />Vérifie ta connexion internet.
                </p>
              </>
            ) : (
              <>
                <Camera size={26} style={{ color: "rgba(255,255,255,0.45)" }} />
                <p className="text-sm font-light" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Lance l&apos;analyse pour démarrer
                </p>
              </>
            )}
          </div>
        )}

        {/* Chargement caméra */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(0,0,0,0.72)" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}>
              <Loader2 size={24} style={{ color: "#A78BFA" }} />
            </motion.div>
            <p className="text-sm font-light" style={{ color: "rgba(255,255,255,0.5)" }}>Caméra en cours…</p>
          </div>
        )}

        {/* Badge LIVE */}
        {running && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#F87171" }}
              animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-[10px] font-bold text-white tracking-widest">LIVE</span>
          </div>
        )}

        {/* Indicateur phase */}
        {running && selected !== "plank" && (
          <motion.div key={phase} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest"
            style={{
              background: phase === "down" ? "rgba(99,102,241,0.82)" : "rgba(52,211,153,0.82)",
              color: "#fff", backdropFilter: "blur(6px)",
            }}>
            {phase === "down" ? "BAS" : "HAUT"}
          </motion.div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "RÉPÉTITIONS", value: String(reps),       icon: TrendingUp, color: "#A78BFA" },
          { label: "FORM SCORE",  value: `${score}%`,        icon: Target,     color: scoreColor },
          { label: "PHASE",       value: selected === "plank" ? "—" : phase === "up" ? "HAUT" : "BAS", icon: Zap, color: "#D4A843" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-3 flex flex-col gap-1.5"
            style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(212,192,255,0.2)", boxShadow: "0 2px 8px rgba(167,139,250,0.06)" }}>
            <div className="flex items-center gap-1">
              <Icon size={11} style={{ color }} />
              <p className="text-[7px] font-semibold tracking-widest uppercase leading-none" style={{ color: "#A0AEC0" }}>{label}</p>
            </div>
            <p className="text-lg font-bold leading-none truncate" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Feedback temps réel */}
      <div className="flex flex-col gap-2 min-h-[56px]">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div key={msg.text + i}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
              style={{
                background: msg.type === "good" ? "rgba(52,211,153,0.08)" : msg.type === "warn" ? "rgba(251,191,36,0.08)" : "rgba(248,113,113,0.08)",
                border: `1px solid ${msg.type === "good" ? "rgba(52,211,153,0.25)" : msg.type === "warn" ? "rgba(251,191,36,0.25)" : "rgba(248,113,113,0.25)"}`,
              }}>
              <FeedIcon type={msg.type} />
              <p className="text-sm font-medium" style={{ color: msg.type === "good" ? "#059669" : msg.type === "warn" ? "#D97706" : "#DC2626" }}>
                {msg.text}
              </p>
            </motion.div>
          ))}

          {running && messages.length === 0 && (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
              style={{ background: "rgba(240,235,255,0.4)", border: "1px solid rgba(212,192,255,0.22)" }}>
              <Camera size={13} style={{ color: "#A0AEC0", flexShrink: 0 }} />
              <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Place-toi devant la caméra…</p>
            </motion.div>
          )}

          {!mpReady && !mpError && !running && (
            <motion.div key="loading-mp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
              style={{ background: "rgba(240,235,255,0.4)", border: "1px solid rgba(212,192,255,0.22)" }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                <Loader2 size={13} style={{ color: "#A78BFA" }} />
              </motion.div>
              <p className="text-sm font-light" style={{ color: "#718096" }}>Chargement du modèle IA…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contrôles */}
      <div className="flex gap-3">
        {!running ? (
          <motion.button whileTap={{ scale: 0.96 }} onClick={startAnalysis}
            disabled={!mpReady || loading || mpError}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold cursor-pointer"
            style={(mpReady && !loading && !mpError)
              ? { background: "linear-gradient(135deg,#818CF8,#6366F1)", color: "#fff", boxShadow: "0 4px 18px rgba(99,102,241,0.4)" }
              : { background: "rgba(240,235,255,0.6)", color: "#A0AEC0", cursor: "not-allowed" }
            }>
            <Play size={14} fill="currentColor" />
            {mpError ? "Modèle indisponible" : !mpReady ? "Chargement…" : "Lancer l'analyse"}
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.96 }} onClick={stopAnalysis}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold cursor-pointer"
            style={{ background: "rgba(248,113,113,0.1)", color: "#DC2626", border: "1px solid rgba(248,113,113,0.3)" }}>
            <Square size={12} fill="currentColor" /> Arrêter
          </motion.button>
        )}
        {(reps > 0 || running) && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={reset}
            className="w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(240,235,255,0.7)", border: "1px solid rgba(212,192,255,0.3)" }}>
            <RotateCcw size={14} style={{ color: "#A78BFA" }} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
