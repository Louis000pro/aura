"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Clock, Zap, Trophy, SkipForward } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */
interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;       // seconds of rest between sets (0 = none)
  auto?: number;      // if set: auto-countdown per set (seconds)
  hiit?: boolean;     // HIIT mode: 20 s work / 10 s rest auto
  tip: string;
  muscles: string[];
}

export interface WorkoutGuideModalProps {
  sessionId: string;
  title: string;
  accent: string;
  duration: number;
  difficulty: string;
  onClose: () => void;
}

type GuidePhase = "intro" | "exercising" | "resting" | "done";
type HiitSub  = "work" | "rest";

/* ─── Constants ──────────────────────────────────────────── */
const HIIT_WORK = 20;
const HIIT_REST = 10;
const CR        = 46;
const CC        = 2 * Math.PI * CR; // circle circumference

/* ─── Exercise data ──────────────────────────────────────── */
const exerciseData: Record<string, Exercise[]> = {
  "force-haut": [
    { name: "Développé couché", sets: 4, reps: "8 reps", rest: 90,
      tip: "Rétracte les omoplates avant de saisir la barre. Garde les coudes à 45° du buste. Descends en 3 secondes, pousse en explosif.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Tractions larges pronation", sets: 4, reps: "Max reps", rest: 90,
      tip: "Bras complètement tendus en bas. Imagine que tu plies la barre autour de ta tête. Monte jusqu'au menton au-dessus de la barre.",
      muscles: ["Dos", "Biceps"] },
    { name: "Développé militaire haltères", sets: 3, reps: "10 reps", rest: 75,
      tip: "Gainé, sans arquer le dos. Pousse verticalement, haltères qui se rejoignent presque en haut. Tempo 2-0-2.",
      muscles: ["Épaules", "Triceps"] },
    { name: "Rowing barre buste penché", sets: 3, reps: "12 reps", rest: 75,
      tip: "Dos plat à 45°. Tire la barre vers le nombril, coudes proches du corps. Contracte les omoplates 1 seconde en haut.",
      muscles: ["Dos", "Biceps"] },
    { name: "Élévations latérales", sets: 3, reps: "15 reps", rest: 60,
      tip: "Légère flexion du coude. Monte jusqu'à l'horizontale, pas plus. Descends en 3 secondes. Sens le faisceau moyen de l'épaule brûler.",
      muscles: ["Épaules"] },
    { name: "Curl barre", sets: 3, reps: "12 reps", rest: 60,
      tip: "Coudes fixes contre le buste. Contracte fort en haut 1 seconde. Descends lentement en 3 secondes. Évite tout balancement.",
      muscles: ["Biceps"] },
  ],

  "fullbody-deb": [
    { name: "Squats", sets: 3, reps: "15 reps", rest: 60,
      tip: "Pieds à largeur d'épaules, orteils légèrement vers l'extérieur. Descends comme pour t'asseoir sur une chaise. Talons au sol, dos droit.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Pompes", sets: 3, reps: "10 reps", rest: 60,
      tip: "Corps droit de la tête aux talons, coudes à 45°. Descends la poitrine à 2 cm du sol. Genoux au sol si trop difficile.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Fentes avant", sets: 3, reps: "12 par jambe", rest: 60,
      tip: "Grand pas, genou arrière à 2 cm du sol. Cuisse avant parallèle au sol. Pousse sur le talon avant pour revenir.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Hip Thrust au sol", sets: 3, reps: "15 reps", rest: 45,
      tip: "Allongé, pieds à plat. Monte le bassin en contractant fort les fessiers. Maintiens 1 seconde en haut avant de redescendre.",
      muscles: ["Fessiers"] },
    { name: "Planche frontale", sets: 3, reps: "30 sec", rest: 45, auto: 30,
      tip: "Avant-bras au sol, corps en ligne parfaite. Rentre le nombril, serre les fessiers. Si tu trembles, c'est bon signe — tiens bon !",
      muscles: ["Core"] },
    { name: "Crunch", sets: 3, reps: "20 reps", rest: 45,
      tip: "Mains à peine derrière les tempes, sans tirer sur la nuque. Expire en montant. Soulève les épaules, pas le bas du dos.",
      muscles: ["Abdominaux"] },
    { name: "Superman", sets: 3, reps: "12 reps", rest: 45,
      tip: "Ventre au sol, bras tendus devant. Décolle bras ET jambes simultanément. Maintiens 2 secondes. C'est ton dos qui travaille.",
      muscles: ["Dos", "Lombaires"] },
  ],

  "hiit": [
    { name: "Burpees", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Plonge au sol, pompe, saute — tout en fluidité. Qualité > vitesse. Atterris pieds fléchis, jamais genou bloqué.",
      muscles: ["Corps entier"] },
    { name: "Jumping Jacks", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Bras au-dessus de la tête et pieds qui s'écartent en même temps. Rythme régulier, coordination parfaite.",
      muscles: ["Cardio", "Épaules"] },
    { name: "Mountain Climbers", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Planche haute, ramène les genoux vers la poitrine en alternant rapidement. Hanches basses, core engagé.",
      muscles: ["Core", "Cardio"] },
    { name: "Jump Squats", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Squat complet puis explose vers le haut. Atterris doucement, amortis avec les genoux. Si les articulations souffrent, squats normaux.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "High Knees", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Cours sur place en montant les genoux au niveau des hanches. Bras qui pompent. Reste sur l'avant du pied. Fréquence maximale !",
      muscles: ["Cardio", "Abdominaux"] },
    { name: "Pompes explosives", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Descends lentement, pousse en explosif jusqu'à décoller les mains. Si trop difficile : pompes rapides normales.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Skaters", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Sauts latéraux en imitant un patineur. Touche le sol de la main opposée au pied d'appui. Amplitude maximale.",
      muscles: ["Fessiers", "Cardio"] },
    { name: "Sprint sur place", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Allure maximale, fréquence absolue. C'est le dernier — tout donner ! Bras qui pompent à fond.",
      muscles: ["Cardio", "Corps entier"] },
  ],

  "jambes": [
    { name: "Squat barre", sets: 4, reps: "10 reps", rest: 90,
      tip: "Barre sur les trapèzes, pas sur le cou. Descends jusqu'à cuisses parallèles au sol. Pousse dans le sol avec les talons. Genoux dans l'axe des orteils.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Presse à cuisses", sets: 3, reps: "15 reps", rest: 75,
      tip: "Pieds à mi-hauteur de la plateforme. Descends à 90° de flexion. Ne verrouille jamais les genoux en haut. Contrôle la montée ET la descente.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Fentes marchées", sets: 3, reps: "12 par jambe", rest: 75,
      tip: "Grand pas, genou arrière proche du sol. Alterne les jambes en avançant. Buste droit, regard devant. Sens le fessier de la jambe avant.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Hip Thrust barre", sets: 4, reps: "12 reps", rest: 75,
      tip: "Épaules sur le banc, barre sur les hanches avec une serviette. Pousse avec les talons. En haut : dos plat, hanches à hauteur d'épaules. Contracte 1 sec.",
      muscles: ["Fessiers"] },
    { name: "Extensions mollets", sets: 4, reps: "20 reps", rest: 60,
      tip: "Monte sur la pointe des pieds, maintiens 1 seconde. Descends lentement, étire bien le mollet en bas. Varie l'angle des pieds pour cibler différentes zones.",
      muscles: ["Mollets"] },
  ],

  "mobilite": [
    { name: "Cat-Cow", sets: 2, reps: "10 respirations", rest: 30,
      tip: "Inspiration : creuse le dos, regard vers le haut. Expiration : arrondis le dos, menton vers la poitrine. Sens chaque vertèbre bouger.",
      muscles: ["Colonne vertébrale"] },
    { name: "Hip Circles", sets: 2, reps: "10 par côté", rest: 20,
      tip: "Mains sur les hanches, pieds écartés. Trace les plus grands cercles possibles. Insiste sur les zones de restriction.",
      muscles: ["Hanches"] },
    { name: "World's Greatest Stretch", sets: 2, reps: "30 sec par côté", rest: 20, auto: 30,
      tip: "En fente basse, main intérieure au sol, ouvre l'autre bras vers le ciel. Respire profondément. Le meilleur étirement total du corps.",
      muscles: ["Corps entier"] },
    { name: "Pigeon Yoga", sets: 2, reps: "45 sec par côté", rest: 20, auto: 45,
      tip: "Jambe avant à 90°, jambe arrière tendue. Coussin sous la fesse si besoin. Laisse la gravité faire le travail. Respire vers la zone tendue.",
      muscles: ["Hanches", "Fessiers"] },
    { name: "Thread the Needle", sets: 2, reps: "30 sec par côté", rest: 20, auto: 30,
      tip: "À quatre pattes, glisse un bras sous l'autre jusqu'à l'épaule au sol. Idéal pour ouvrir les dorsaux et les rotateurs internes.",
      muscles: ["Épaules", "Dos"] },
    { name: "Downward Dog → Cobra", sets: 2, reps: "8 transitions", rest: 30,
      tip: "Chien tête en bas : talons vers le sol, dos plat. Cobra : hanches au sol, coudes sous les épaules. Enchaîne fluidement, 3 secondes chaque position.",
      muscles: ["Dos", "Pectoraux"] },
    { name: "Shoulder Opener", sets: 2, reps: "30 sec", rest: 20, auto: 30,
      tip: "Mains dans le dos, doigts croisés. Pousse les épaules en arrière et les bras vers le bas. Ouvre la poitrine. Respire profondément.",
      muscles: ["Épaules", "Pectoraux"] },
    { name: "Neck Release", sets: 2, reps: "20 sec par côté", rest: 15, auto: 20,
      tip: "Très doux ! Incline la tête vers l'épaule, aide légèrement avec la main — aucune pression forcée. Respire vers la zone tendue.",
      muscles: ["Nuque"] },
    { name: "Étirement quadriceps", sets: 2, reps: "30 sec par jambe", rest: 20, auto: 30,
      tip: "Debout, pied vers la fesse. Genou proche de l'autre genou. Sens l'étirement en face de la cuisse. Tiens un mur si besoin.",
      muscles: ["Quadriceps"] },
    { name: "Posture de l'enfant", sets: 1, reps: "60 sec", rest: 0, auto: 60,
      tip: "Genoux écartés, front au sol, bras tendus devant. Laisse le dos s'ouvrir complètement. Respiration lente et profonde. Belle séance 🙏",
      muscles: ["Dos", "Hanches"] },
  ],

  "dos-biceps": [
    { name: "Tractions supination", sets: 4, reps: "Max reps", rest: 90,
      tip: "Prise en dessous (paumes vers toi), mains à largeur d'épaules. Bras complètement tendus en bas. Monte jusqu'au menton, descends en 3 secondes.",
      muscles: ["Dos", "Biceps"] },
    { name: "Rowing barre buste penché", sets: 4, reps: "10 reps", rest: 90,
      tip: "Dos plat à 45°, barre sous les genoux. Tire vers le nombril, coudes proches du corps. Contracte les omoplates ensemble en haut. Ne balance pas.",
      muscles: ["Dos"] },
    { name: "Tirage poulie haute", sets: 3, reps: "12 reps", rest: 75,
      tip: "Tire vers la poitrine, pas la nuque. Coudes pointent vers le bas. Buste légèrement incliné en arrière. Sens les grands dorsaux s'étirer en haut.",
      muscles: ["Dos"] },
    { name: "Rowing unilatéral haltère", sets: 3, reps: "12 par bras", rest: 60,
      tip: "Genou et main sur le banc. Tire l'haltère vers la hanche, coude haut. Ne tords pas le tronc. Descends lentement, contrôle le poids.",
      muscles: ["Dos", "Biceps"] },
    { name: "Curl barre", sets: 3, reps: "12 reps", rest: 60,
      tip: "Coudes fixes contre le corps. Contracte fort en haut 1 seconde. Descends en 3 secondes. Évite tout balancement du buste.",
      muscles: ["Biceps"] },
    { name: "Curl marteau", sets: 3, reps: "12 par bras", rest: 60,
      tip: "Paumes face à face tout au long du mouvement. Cible le brachial et le brachioradial en plus du biceps. Idéal pour des bras complets.",
      muscles: ["Biceps"] },
  ],

  "core": [
    { name: "Planche frontale", sets: 4, reps: "45 sec", rest: 30, auto: 45,
      tip: "Avant-bras au sol, corps en ligne parfaite. Rentre le nombril, serre les fessiers. Pense à te grandir vers l'avant. Respire normalement.",
      muscles: ["Core", "Épaules"] },
    { name: "Crunch", sets: 3, reps: "20 reps", rest: 45,
      tip: "Mains à peine derrière les tempes, sans tirer sur la nuque. Expire en montant. Soulève les épaules, pas le bas du dos.",
      muscles: ["Abdominaux"] },
    { name: "Russian Twist", sets: 3, reps: "20 reps (10/côté)", rest: 45,
      tip: "Pieds au sol ou levés pour plus de difficulté. Torse à 45°. Tourne depuis la taille, pas les épaules.",
      muscles: ["Obliques"] },
    { name: "Relevés de jambes", sets: 3, reps: "15 reps", rest: 45,
      tip: "Mains sous les fesses pour protéger le bas du dos. Monte les jambes à 90° puis descends lentement. Garde les genoux légèrement fléchis.",
      muscles: ["Abdominaux"] },
    { name: "Planche latérale", sets: 3, reps: "30 sec par côté", rest: 30, auto: 30,
      tip: "Corps droit de la tête aux pieds, hanche décollée du sol. Pour faciliter : genou inférieur au sol. Pour difficile : soulève la jambe du dessus.",
      muscles: ["Obliques", "Core"] },
    { name: "Dead Bug", sets: 3, reps: "12 reps (6/côté)", rest: 45,
      tip: "Bas du dos collé au sol. Étends le bras opposé à la jambe en simultané. Expire pendant le mouvement. Contrôle total, aucun balancement.",
      muscles: ["Core"] },
    { name: "Bird Dog", sets: 3, reps: "12 reps (6/côté)", rest: 45,
      tip: "À quatre pattes. Étends le bras droit et la jambe gauche simultanément. Garde le bassin horizontal. Maintiens 2 secondes en haut.",
      muscles: ["Core", "Dos"] },
    { name: "Superman", sets: 3, reps: "15 reps", rest: 45,
      tip: "Ventre au sol, bras devant. Décolle bras ET jambes simultanément. Maintiens 2 secondes. Excellent pour prévenir les maux de dos.",
      muscles: ["Dos", "Lombaires"] },
  ],

  "cardio-endurance": [
    { name: "Échauffement · Marche rapide", sets: 1, reps: "5 min", rest: 0, auto: 300,
      tip: "Commence à allure modérée, augmente progressivement. Balancement naturel des bras. Prépare tes articulations. Respiration nasale si possible.",
      muscles: ["Cardio"] },
    { name: "Course continue Zone 2", sets: 1, reps: "20 min", rest: 60, auto: 1200,
      tip: "Allure conversationnelle : tu dois pouvoir parler par phrases courtes. FC cible 60-70% de ton max. Ne va pas trop vite — c'est le fondamental.",
      muscles: ["Cardio", "Endurance"] },
    { name: "Fractionné (1 min / 2 min récup)", sets: 4, reps: "3 min par répét.", rest: 0, auto: 180,
      tip: "1 min à 85-90% de ton max, puis 2 min de trot récupérateur. Qualité > quantité. Réduis le tempo si tu ne tiens pas les 4 répétitions.",
      muscles: ["Cardio", "VO2max"] },
    { name: "Retour au calme · Marche", sets: 1, reps: "5 min", rest: 0, auto: 300,
      tip: "Réduis progressivement. Respiration abdominale profonde. C'est pendant la récupération que les adaptations se font — ne l'ignore jamais !",
      muscles: ["Récupération"] },
  ],
};

/* ─── Util ───────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ─── Component ──────────────────────────────────────────── */
export default function WorkoutGuideModal({
  sessionId, title, accent, duration, difficulty, onClose,
}: WorkoutGuideModalProps) {
  const exercises = exerciseData[sessionId] ?? [];

  const [phase,          setPhase]          = useState<GuidePhase>("intro");
  const [exerciseIdx,    setExerciseIdx]    = useState(0);
  const [setIdx,         setSetIdx]         = useState(0);
  const [restCountdown,  setRestCountdown]  = useState(0);
  const [restTotal,      setRestTotal]      = useState(0);
  const [autoCountdown,  setAutoCountdown]  = useState(0);
  const [hiitSub,        setHiitSub]        = useState<HiitSub>("work");
  const [doneMap,        setDoneMap]        = useState<Record<number, Record<number, boolean>>>({});
  const [startMs,        setStartMs]        = useState(0);
  const [elapsed,        setElapsed]        = useState(0);

  const cur = exercises[exerciseIdx];
  const isHiit = !!cur?.hiit;
  const totalSets = exercises.reduce((a, e) => a + e.sets, 0);

  /* elapsed clock */
  useEffect(() => {
    if (phase === "intro" || phase === "done" || startMs === 0) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startMs]);

  /* ── Advance to next set / exercise ── */
  const advance = useCallback(() => {
    const nextSet = setIdx + 1;
    const nextEx  = exerciseIdx + 1;
    if (nextSet < (exercises[exerciseIdx]?.sets ?? 1)) {
      setSetIdx(nextSet);
      setPhase("exercising");
      const e = exercises[exerciseIdx];
      if (e?.auto)  setAutoCountdown(e.auto);
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); }
    } else if (nextEx < exercises.length) {
      setExerciseIdx(nextEx);
      setSetIdx(0);
      setPhase("exercising");
      const e = exercises[nextEx];
      if (e?.auto)  setAutoCountdown(e.auto);
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); }
      else setAutoCountdown(0);
    } else {
      setPhase("done");
    }
  }, [exercises, exerciseIdx, setIdx]);

  /* ── Complete a set (mark done, start rest or advance) ── */
  const completeSet = useCallback(() => {
    setDoneMap(prev => ({
      ...prev,
      [exerciseIdx]: { ...(prev[exerciseIdx] ?? {}), [setIdx]: true },
    }));
    const rest = exercises[exerciseIdx]?.rest ?? 0;
    if (rest > 0) {
      setRestTotal(rest);
      setRestCountdown(rest);
      setPhase("resting");
    } else {
      advance();
    }
  }, [exercises, exerciseIdx, setIdx, advance]);

  /* ── Rest countdown ── */
  useEffect(() => {
    if (phase !== "resting") return;
    if (restCountdown <= 0) { advance(); return; }
    const t = setTimeout(() => setRestCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // advance changes when exerciseIdx/setIdx change, which is correct
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restCountdown]);

  /* ── Auto / HIIT countdown ── */
  useEffect(() => {
    if (phase !== "exercising") return;
    if (!cur?.auto && !cur?.hiit) return;
    if (autoCountdown <= 0) {
      if (cur.hiit && hiitSub === "work") {
        setHiitSub("rest");
        setAutoCountdown(HIIT_REST);
        return;
      }
      completeSet();
      return;
    }
    const t = setTimeout(() => setAutoCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, autoCountdown, hiitSub, cur]);

  /* ── Start ── */
  const startWorkout = () => {
    setStartMs(Date.now());
    setExerciseIdx(0); setSetIdx(0); setDoneMap({});
    setPhase("exercising");
    if (exercises[0]?.auto)  setAutoCountdown(exercises[0].auto);
    else if (exercises[0]?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); }
  };

  /* ── Progress ── */
  const progressPct = exercises.length
    ? ((exerciseIdx + (setIdx + 1) / (cur?.sets || 1)) / exercises.length) * 100
    : 0;

  /* ── SVG circle helpers ── */
  const autoTotal  = isHiit ? (hiitSub === "work" ? HIIT_WORK : HIIT_REST) : (cur?.auto ?? 0);
  const autoOffset = CC * (1 - (autoTotal > 0 ? autoCountdown / autoTotal : 0));
  const restOffset = CC * (1 - (restTotal > 0 ? restCountdown / restTotal  : 1));

  /* ─────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(160deg,#1a1625 0%,#1e1a2e 100%)", maxHeight: "92vh" }}
      >
        {/* ── Progress bar ── */}
        {phase !== "intro" && phase !== "done" && (
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "rgba(255,255,255,0.07)" }}>
            <motion.div
              className="h-full"
              style={{ background: `linear-gradient(90deg,${accent},${accent}99)` }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            {(phase === "exercising" || phase === "resting") && (
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-0.5"
                style={{ color: accent }}>
                Exercice {exerciseIdx + 1} / {exercises.length}
              </p>
            )}
            <p className="text-sm font-light" style={{ color: "#E2E8F0" }}>{title}</p>
          </div>
          <div className="flex items-center gap-3">
            {phase !== "intro" && phase !== "done" && (
              <div className="flex items-center gap-1">
                <Clock size={11} strokeWidth={1.5} style={{ color: "#718096" }} />
                <span className="text-[11px] font-mono" style={{ color: "#718096" }}>{fmt(elapsed)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence mode="wait">

            {/* ── INTRO ── */}
            {phase === "intro" && (
              <motion.div key="intro"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="flex flex-col gap-5 pb-2"
              >
                {/* Hero card */}
                <div className="rounded-2xl p-5 flex flex-col gap-4"
                  style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: `${accent}28` }}>
                      <Zap size={20} strokeWidth={1.5} style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: "#fff" }}>{title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#718096" }}>{difficulty} · {duration} min</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Exercices",     value: String(exercises.length) },
                      { label: "Séries totales", value: String(totalSets) },
                      { label: "Durée est.",     value: `~${duration} min` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl p-2.5 text-center"
                        style={{ background: "rgba(255,255,255,0.06)" }}>
                        <p className="text-sm font-semibold" style={{ color: "#fff" }}>{value}</p>
                        <p className="text-[9px] font-medium mt-0.5" style={{ color: "#718096" }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exercise list */}
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mb-3"
                    style={{ color: "#4A5568" }}>Au programme</p>
                  <div className="flex flex-col gap-1.5">
                    {exercises.map((ex, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: `${accent}22`, color: accent }}>{i + 1}</div>
                        <p className="flex-1 text-sm font-light truncate" style={{ color: "#CBD5E0" }}>{ex.name}</p>
                        <p className="text-[10px] flex-shrink-0" style={{ color: "#4A5568" }}>
                          {ex.sets}×{ex.reps}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── EXERCISING ── */}
            {phase === "exercising" && cur && (
              <motion.div key={`ex-${exerciseIdx}-${setIdx}`}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                className="flex flex-col gap-4 pb-2"
              >
                {/* Name + set dots */}
                <div>
                  <h2 className="text-2xl font-light leading-tight" style={{ color: "#fff" }}>
                    {cur.name}
                  </h2>
                  <div className="flex items-center gap-2.5 mt-2">
                    <div className="flex gap-1.5">
                      {Array.from({ length: cur.sets }).map((_, i) => (
                        <motion.div key={i}
                          layout
                          className="rounded-full"
                          style={{
                            width:  i === setIdx ? 18 : 8,
                            height: 8,
                            background: doneMap[exerciseIdx]?.[i]
                              ? accent
                              : i === setIdx
                              ? `${accent}99`
                              : "rgba(255,255,255,0.13)",
                          }}
                          transition={{ duration: 0.25 }}
                        />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: "#718096" }}>
                      Série {setIdx + 1}/{cur.sets} · {cur.reps}
                    </span>
                  </div>
                </div>

                {/* Auto / HIIT timer */}
                {(cur.auto || isHiit) && (
                  <div className="flex flex-col items-center gap-2.5">
                    {isHiit && (
                      <motion.div key={hiitSub}
                        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="px-5 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
                        style={{
                          background: hiitSub === "work" ? "rgba(239,68,68,0.18)" : "rgba(52,211,153,0.18)",
                          color:      hiitSub === "work" ? "#f87171"              : "#34D399",
                        }}
                      >
                        {hiitSub === "work" ? "⚡ Effort !" : "✓ Repos"}
                      </motion.div>
                    )}
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={CR} fill="none"
                          stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                        <motion.circle cx="50" cy="50" r={CR} fill="none"
                          stroke={isHiit ? (hiitSub === "work" ? "#f87171" : "#34D399") : accent}
                          strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={CC}
                          animate={{ strokeDashoffset: autoOffset }}
                          transition={{ duration: 0.6 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-extralight tabular-nums" style={{ color: "#fff" }}>
                          {autoCountdown}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Muscles */}
                <div className="flex flex-wrap gap-1.5">
                  {cur.muscles.map(m => (
                    <span key={m} className="px-2 py-0.5 rounded-lg text-[10px] font-medium"
                      style={{ background: `${accent}18`, color: accent }}>{m}</span>
                  ))}
                </div>

                {/* Aura tip */}
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>A</div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
                      Conseil Aura
                    </p>
                  </div>
                  <p className="text-sm font-light leading-relaxed" style={{ color: "#A0AEC0" }}>{cur.tip}</p>
                </div>
              </motion.div>
            )}

            {/* ── RESTING ── */}
            {phase === "resting" && (
              <motion.div key="rest"
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-6"
              >
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#4A5568" }}>
                  Récupération
                </p>
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={CR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <motion.circle cx="50" cy="50" r={CR} fill="none"
                      stroke="#A78BFA" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={CC}
                      animate={{ strokeDashoffset: restOffset }}
                      transition={{ duration: 0.6 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extralight tabular-nums" style={{ color: "#fff" }}>
                      {restCountdown}
                    </span>
                    <span className="text-[9px] mt-0.5" style={{ color: "#4A5568" }}>sec</span>
                  </div>
                </div>

                {/* What's next */}
                {(() => {
                  const isLastSet = setIdx === (cur?.sets ?? 1) - 1;
                  const nextLabel = isLastSet && exercises[exerciseIdx + 1]
                    ? exercises[exerciseIdx + 1].name
                    : !isLastSet ? cur?.name
                    : null;
                  const nextSub = isLastSet ? "Prochain exercice" : `Série ${setIdx + 2}/${cur?.sets}`;
                  return nextLabel ? (
                    <div className="text-center">
                      <p className="text-[10px] font-medium" style={{ color: "#4A5568" }}>{nextSub}</p>
                      <p className="text-sm font-light mt-0.5" style={{ color: "#CBD5E0" }}>{nextLabel}</p>
                    </div>
                  ) : null;
                })()}

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRestCountdown(0)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#718096" }}
                >
                  <SkipForward size={12} strokeWidth={2} />
                  Passer le repos
                </motion.button>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {phase === "done" && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-5 py-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: `${accent}28`, border: `2px solid ${accent}55` }}
                >
                  <Trophy size={36} strokeWidth={1.2} style={{ color: accent }} />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-light" style={{ color: "#fff" }}>Séance terminée !</h2>
                  <p className="text-sm mt-1.5 font-light" style={{ color: "#718096" }}>
                    Excellent travail — tu es plus fort qu&apos;hier 💪
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full">
                  {[
                    { label: "Durée",      value: fmt(elapsed) },
                    { label: "Exercices",  value: String(exercises.length) },
                    { label: "Séries",     value: String(totalSets) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-2xl p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <p className="text-lg font-light" style={{ color: "#fff" }}>{value}</p>
                      <p className="text-[9px] font-medium mt-0.5" style={{ color: "#4A5568" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="px-5 pb-6 pt-3 flex-shrink-0">
          <AnimatePresence mode="wait">

            {phase === "intro" && (
              <motion.button key="start"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={startWorkout}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
                style={{ background: `linear-gradient(135deg,${accent}ee,${accent}bb)`, boxShadow: `0 8px 24px ${accent}44`, color: "#fff" }}
              >
                <Zap size={16} strokeWidth={2} />
                Commencer la séance
              </motion.button>
            )}

            {phase === "exercising" && !cur?.auto && !isHiit && (
              <motion.button key="set-done"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={completeSet}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
                style={{ background: `linear-gradient(135deg,${accent}ee,${accent}bb)`, boxShadow: `0 6px 18px ${accent}44`, color: "#fff" }}
              >
                <CheckCircle size={16} strokeWidth={2} />
                Série terminée ✓
              </motion.button>
            )}

            {phase === "exercising" && (cur?.auto || isHiit) && (
              <motion.button key="skip"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setAutoCountdown(0)}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
                style={{ background: "rgba(255,255,255,0.06)", color: "#718096" }}
              >
                <SkipForward size={13} strokeWidth={2} />
                {isHiit && hiitSub === "work" ? "Passer l'effort" : "Passer"}
              </motion.button>
            )}

            {phase === "done" && (
              <motion.button key="close"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)", color: "#E2E8F0" }}
              >
                Retour à la progression
              </motion.button>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
