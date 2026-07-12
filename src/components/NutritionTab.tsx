"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, Camera, Upload, Loader2, Edit2, Barcode, Minus, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, BookOpen, Heart, Sparkles, SwitchCamera, Star, Target, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import WeighInPrompt from "@/components/WeighInPrompt";
import TastePrefsPrompt from "@/components/TastePrefsPrompt";
import RecipesByTheme from "@/components/RecipesByTheme";
import MealSituationHero from "@/components/MealSituationHero";
import MacroTiles from "@/components/MacroTiles";

/* ─── Types ─────────────────────────────────────────────────────────── */
type MealType = "petit-dejeuner" | "dejeuner" | "gouter" | "diner";

type MealEntry = {
  id: string;
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  time: string;
  mealType: MealType;
  description?: string;
  hasPhoto?: boolean;
};

type AnalysisResult = {
  foodName: string;
  description: string;
  mealType: MealType;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
};

type DaySummary = {
  date: string;
  total_calories: number;
  total_proteins: number;
  total_carbs: number;
  total_fats: number;
  meal_count: number;
  water_ml: number;
};

type RecentMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number; count?: number };

/* ─── Constants ─────────────────────────────────────────────────────── */
const MEAL_META: Record<MealType, { label: string; icon: string }> = {
  "petit-dejeuner": { label: "Petit-déjeuner", icon: "🌅" },
  "dejeuner":       { label: "Déjeuner",        icon: "☀️"  },
  "gouter":         { label: "Goûter",           icon: "🍎" },
  "diner":          { label: "Dîner",            icon: "🌙" },
};

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/* calculateGoals → extrait dans src/lib/nutritionGoals.ts (partagé avec les plats suggérés) */

/* ─── Helpers ───────────────────────────────────────────────────────── */
function getMondayWeek(ref: Date): Date[] {
  const base = new Date(ref);
  const dow = base.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  base.setDate(base.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMealTypeFromTime(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return "petit-dejeuner";
  if (h >= 10 && h < 15) return "dejeuner";
  if (h >= 15 && h < 18) return "gouter";
  return "diner";
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ─── CalorieRing ───────────────────────────────────────────────────── */
function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const R = 88, SW = 16, C = 2 * Math.PI * R;
  const pct = Math.min(consumed / goal, 1);
  return (
    <div className="relative flex-shrink-0" style={{ width: 216, height: 216 }}>
      <svg width="216" height="216" viewBox="0 0 216 216" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="caloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#FFD34E" />
            <stop offset="52%"  stopColor="#FF9A3D" />
            <stop offset="100%" stopColor="#FF7A1A" />
          </linearGradient>
        </defs>
        <circle cx="108" cy="108" r={R} fill="none" stroke="rgba(var(--accent-rgb),0.16)" strokeWidth={SW} />
        <motion.circle cx="108" cy="108" r={R} fill="none"
          stroke="url(#caloGrad)" strokeWidth={SW} strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 7px rgba(255,140,30,0.5))" }}
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>CONSOMMÉ</p>
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[2.5rem] font-light leading-none" style={{ color: "var(--text-1)" }}>
          {consumed.toLocaleString("fr-FR")}
        </motion.p>
        <p className="text-xs font-light" style={{ color: "var(--text-3)" }}>
          kcal sur {goal.toLocaleString("fr-FR")}
        </p>
      </div>
    </div>
  );
}

/* ─── MacroBar ──────────────────────────────────────────────────────── */
function MacroBar({ label, hint, consumed, goal, color }: { label: string; hint?: string; consumed: number; goal: number; color: string }) {
  const pct = Math.min(Math.round((consumed / goal) * 100), 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>{label}</span>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>{pct}%</span>
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
          {consumed}g <span className="font-normal text-xs" style={{ color: "var(--text-3)" }}>/ {goal}g</span>
        </span>
      </div>
      {hint && (
        <p className="text-[11px] leading-snug mb-2 ml-4" style={{ color: "var(--text-3)" }}>{hint}</p>
      )}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(var(--accent-rgb),0.14)" }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.35 }} />
      </div>
    </div>
  );
}


/* ─── PhotoAnalysisModal ─────────────────────────────────────────────── */
type PhotoPhase = "select" | "analyzing" | "result" | "edit";

function PhotoAnalysisModal({ onClose, onAdd, onBack }: {
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
  onBack?: () => void;   // présent quand on arrive depuis la carte → revenir au classement (misclic)
}) {
  const [phase, setPhase] = useState<PhotoPhase>("select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editData, setEditData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);          // fallback caméra native (si getUserMedia refusé)
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Masque la barre de nav du bas tant que la modale est ouverte (sinon elle recouvre les boutons sur mobile).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const analyze = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoUrl(dataUrl);
      setPhase("analyzing");
      setError(null);

      const base64 = dataUrl.split(",")[1];
      try {
        // Jeton d'auth (l'endpoint vision est protégé + limité par jour pour les gratuits)
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/nutrition/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ image: base64, mimeType: file.type }),
        });
        if (res.status === 429) {
          const err = await res.json().catch(() => ({}));
          setError(`Tu as atteint ta limite gratuite de ${err.dailyLimit ?? 3} analyses photo/jour 📸 Passe en Premium pour des analyses illimitées.`);
          setPhase("select");
          return;
        }
        if (res.status === 401) {
          setError("Connecte-toi pour analyser tes repas.");
          setPhase("select");
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Analyse échouée");
        }
        const data: AnalysisResult = await res.json();
        setEditData({ ...data });
        setPhase("result");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        setError(msg.includes("GROQ_API_KEY")
          ? "Clé API manquante — ajoute GROQ_API_KEY dans Vercel."
          : "Analyse impossible, essaie à nouveau.");
        setPhase("select");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!editData) return;
    onAdd({
      name: editData.foodName,
      calories: editData.calories,
      proteins: editData.proteins,
      carbs: editData.carbs,
      fats: editData.fats,
      time: nowHHMM(),
      mealType: editData.mealType,
      description: editData.description,
      hasPhoto: true,
    });
  };

  const reset = () => { setPhase("select"); setPhotoUrl(null); setEditData(null); setError(null); };

  // ── Caméra live in-app (getUserMedia) — viseur + obturateur, comme le scanner code-barres.
  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  const startCam = async (mode: "environment" | "user"): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) { setCamReady(false); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setCamReady(true);
      return true;
    } catch {
      setCamReady(false);
      return false;
    }
  };
  const flipCam = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    stopCam();
    if (await startCam(next)) setFacingMode(next);
    else await startCam(facingMode); // pas de 2ᵉ caméra → on revient
  };
  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopCam();
      analyze(new File([blob], `repas-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  // Démarre la caméra sur l'écran de capture, la coupe ailleurs / à la fermeture.
  useEffect(() => {
    if (phase === "select") startCam(facingMode);
    else stopCam();
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const CARD_STYLE = {
    background: "rgb(var(--surface-rgb))",
    border: "1px solid rgba(var(--accent-rgb),0.14)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
    maxHeight: "90dvh",
    overflowY: "auto" as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-x-hidden"
        style={CARD_STYLE}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }} aria-label="Revenir au classement de la carte">
                <ChevronLeft size={16} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
              </motion.button>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>{onBack ? "Retour à la carte" : "IA Nutrition"}</p>
              <h2 className="text-lg font-semibold truncate" style={{ color: "var(--text-1)" }}>
                {phase === "analyzing" ? "Je regarde…"
                  : phase === "result"   ? "Repas identifié"
                  : phase === "edit"     ? "Ajuster"
                  : "Snap ton assiette"}
              </h2>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">

            {/* SELECT — viseur immersif (tap = caméra) */}
            {phase === "select" && (
              <motion.div key="select"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs font-medium"
                    style={{ background: "rgba(242,109,109,0.12)", color: "#F2685F", border: "1px solid rgba(242,109,109,0.28)" }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* inputs cachés : caméra native (fallback) + galerie */}
                <input ref={camRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />
                <input ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />

                {/* Viseur — caméra LIVE dans l'app */}
                <div className="relative w-full rounded-2xl overflow-hidden"
                  style={{ height: 320, background: "linear-gradient(160deg,#2A2140,#140E22)" }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: camReady ? 1 : 0, transition: "opacity .3s" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(8,4,14,0.12),rgba(8,4,14,0.32))" }} />
                  {/* repères d'angle */}
                  {[["top-3 left-3", "border-t-2 border-l-2 rounded-tl-xl"],
                    ["top-3 right-3", "border-t-2 border-r-2 rounded-tr-xl"],
                    ["bottom-3 left-3", "border-b-2 border-l-2 rounded-bl-xl"],
                    ["bottom-3 right-3", "border-b-2 border-r-2 rounded-br-xl"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-7 h-7 ${pos} ${cls} pointer-events-none`} style={{ borderColor: "rgba(255,255,255,0.85)" }} />
                  ))}

                  {camReady ? (
                    <>
                      <div className="absolute top-1/2 left-1/2 rounded-full pointer-events-none" style={{ width: 150, height: 150, transform: "translate(-50%,-50%)", border: "1.5px dashed rgba(255,255,255,0.4)" }} />
                      <div className="absolute left-1/2 bottom-3 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none"
                        style={{ background: "rgba(10,6,16,0.45)", color: "#fff", backdropFilter: "blur(4px)" }}>
                        Cadre ton assiette
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => camRef.current?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 24px rgba(139,92,246,0.5)" }}>
                        <Camera size={26} strokeWidth={1.8} style={{ color: "#fff" }} />
                      </div>
                      <div className="text-center px-6">
                        <p className="text-sm font-semibold" style={{ color: "#fff" }}>Prendre une photo</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>Autorise la caméra, ou touche pour l&apos;appareil photo</p>
                      </div>
                    </button>
                  )}
                </div>

                {camReady ? (
                  /* Barre d'obturateur : galerie · déclencheur · flip */
                  <div className="flex items-center justify-between mt-4 px-6">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <ImageIcon size={19} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={capturePhoto}
                      className="rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ width: 68, height: 68, border: "3px solid rgba(var(--accent-rgb),0.35)" }}>
                      <span className="rounded-full" style={{ width: 52, height: 52, background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 6px 18px rgba(139,92,246,0.5)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={flipCam}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <SwitchCamera size={19} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
                    </motion.button>
                  </div>
                ) : (
                  /* Fallback : galerie */
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                    className="w-full mt-3 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                    <Upload size={15} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
                    <span className="font-medium text-sm" style={{ color: "var(--text-2)" }}>Choisir dans la galerie</span>
                  </motion.button>
                )}

                <p className="text-[11px] text-center mt-4 font-light" style={{ color: "var(--text-3)" }}>
                  L&apos;IA détecte les aliments et estime calories &amp; macros automatiquement
                </p>
              </motion.div>
            )}

            {/* ANALYZING — l'IA regarde (balayage lumineux) */}
            {phase === "analyzing" && (
              <motion.div key="analyzing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4">
                {photoUrl && (
                  <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: 300 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={photoUrl} alt="repas" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(8,4,14,0.05),rgba(8,4,14,0.5))" }} />
                    {/* balayage */}
                    <motion.div className="absolute left-0 right-0"
                      style={{ height: 56, background: "linear-gradient(180deg,transparent,rgba(139,92,246,0.55) 60%,transparent)", boxShadow: "0 2px 12px rgba(255,217,138,0.55)" }}
                      animate={{ top: ["4%", "82%", "4%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                    <div className="absolute left-0 right-0 flex items-center justify-center gap-2" style={{ bottom: 16 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}>
                        <Sparkles size={16} style={{ color: "#FFD98A" }} />
                      </motion.div>
                      <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity }}
                        className="text-xs font-semibold" style={{ color: "#fff" }}>
                        J&apos;identifie les aliments…
                      </motion.span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="rounded-2xl animate-pulse" style={{ height: 52, background: "rgba(var(--tint-violet-rgb),0.6)" }} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* RESULT */}
            {phase === "result" && editData && (
              <motion.div key="result"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {photoUrl && (
                  <div className="w-full h-36 rounded-2xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={photoUrl} alt="repas" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Titre + kcal */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-semibold tracking-widest uppercase flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                      <Check size={11} strokeWidth={3} style={{ color: "#2BD4A0" }} /> Repas identifié
                    </p>
                    <p className="font-semibold text-base leading-tight mt-1" style={{ color: "var(--text-1)" }}>
                      {editData.foodName}
                    </p>
                    {editData.description && (
                      <p className="text-xs mt-0.5 font-light" style={{ color: "var(--text-2)" }}>
                        {editData.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[28px] font-light leading-none" style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{editData.calories}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>kcal</p>
                  </div>
                </div>

                {/* Macros — composant partagé Système D */}
                <MacroTiles proteins={editData.proteins} carbs={editData.carbs} fats={editData.fats} />

                {/* Type de repas + ajuster */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)" }}>
                    <span style={{ fontSize: 13 }}>{MEAL_META[editData.mealType]?.icon}</span>
                    {MEAL_META[editData.mealType]?.label}
                  </span>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPhase("edit")}
                    className="flex items-center gap-1 text-xs font-medium cursor-pointer" style={{ color: "var(--accent)" }}>
                    <Edit2 size={11} strokeWidth={2} /> estimation · ajuster
                  </motion.button>
                </div>

                <div className="flex gap-2 mt-0.5">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                    Reprendre
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    className="flex-[2] py-3 rounded-2xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 6px 18px rgba(139,92,246,0.4)" }}>
                    <Plus size={16} strokeWidth={2.5} /> Ajouter à ma journée
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* EDIT */}
            {phase === "edit" && editData && (
              <motion.div key="edit"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-2.5">

                {[
                  { key: "foodName", label: "Nom du plat",     type: "text"   },
                  { key: "calories", label: "Calories (kcal)", type: "number" },
                  { key: "proteins", label: "Protéines (g)",   type: "number" },
                  { key: "carbs",    label: "Glucides (g)",    type: "number" },
                  { key: "fats",     label: "Lipides (g)",     type: "number" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-[10px] font-semibold tracking-widest uppercase mb-1 block"
                      style={{ color: "var(--text-3)" }}>{label}</label>
                    <input
                      type={type}
                      value={editData[key as keyof AnalysisResult] as string | number}
                      onChange={e => setEditData(prev => prev ? {
                        ...prev,
                        [key]: type === "number" ? (parseInt(e.target.value) || 0) : e.target.value,
                      } : prev)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
                    />
                  </div>
                ))}

                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                    style={{ color: "var(--text-3)" }}>TYPE DE REPAS</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                      <motion.button key={mt} whileTap={{ scale: 0.95 }}
                        onClick={() => setEditData(prev => prev ? { ...prev, mealType: mt } : prev)}
                        className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          background: editData.mealType === mt
                            ? "linear-gradient(135deg,rgba(var(--accent-rgb),0.2),rgba(var(--gold-rgb),0.12))"
                            : "rgba(var(--tint-violet-rgb),0.4)",
                          border: editData.mealType === mt
                            ? "1px solid rgba(var(--accent-rgb),0.4)"
                            : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                          color: editData.mealType === mt ? "var(--text-1)" : "var(--text-2)",
                        }}>
                        <span style={{ fontSize: 13 }}>{MEAL_META[mt].icon}</span>
                        <span>{MEAL_META[mt].label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase("result")}
                  className="w-full py-3 rounded-2xl text-sm font-bold cursor-pointer mt-1"
                  style={{
                    background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                    color: "#fff",
                    boxShadow: "0 6px 18px rgba(139,92,246,0.4)",
                  }}>
                  Valider les modifications
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── BarcodeScannerModal ────────────────────────────────────────────── */
type BarcodePhase = "scan" | "loading" | "result" | "fallback";

interface BarcodeProduct {
  name: string;
  brand: string | null;
  image: string | null;
  nutriscore: string | null;
  quantity: string | null;
  per100: { calories: number; proteins: number; carbs: number; fats: number; fiber: number };
}

/* Couleurs officielles du Nutri-Score (fixes, non liées au thème). */
const NUTRISCORE_COLOR: Record<string, string> = {
  A: "#038141", B: "#85BB2F", C: "#FECB02", D: "#EE8100", E: "#E63E11",
};

interface BarcodeEstimated {
  foodName: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  mealType: MealType;
}

function BarcodeScannerModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
}) {
  const [phase, setPhase] = useState<BarcodePhase>("scan");
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [grams, setGrams] = useState("100");
  const [mealType, setMealType] = useState<MealType>(getMealTypeFromTime());
  const [error, setError] = useState<string | null>(null);
  // Fallback IA
  const [fallbackName, setFallbackName] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimated, setEstimated] = useState<BarcodeEstimated | null>(null);
  const [estimateMealType, setEstimateMealType] = useState<MealType>(getMealTypeFromTime());

  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);
  const didStop = useRef(false);

  // Masque la barre de nav du bas tant que la modale est ouverte (sinon elle recouvre les boutons sur mobile).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const stopScanner = async () => {
    if (html5QrRef.current && !didStop.current) {
      didStop.current = true;
      try { await html5QrRef.current.stop(); } catch { /* already stopped */ }
    }
  };

  const lookupBarcode = async (code: string) => {
    await stopScanner();
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/nutrition/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.status === 404) {
        // Produit totalement inconnu
        setFallbackName("");
        setEstimated(null);
        setPhase("fallback");
        return;
      }
      if (!res.ok) throw new Error("Erreur réseau");
      if (data.partial) {
        // Produit trouvé mais sans nutrition → fallback IA pré-rempli
        const pre = data.brand ? `${data.name} ${data.brand}` : data.name;
        setFallbackName(pre);
        setEstimated(null);
        setPhase("fallback");
        return;
      }
      setProduct(data as BarcodeProduct);
      setPhase("result");
    } catch {
      setError("Impossible de récupérer le produit, réessaie.");
      setPhase("scan");
      didStop.current = false;
      startScanner();
    }
  };

  const estimateByAI = async () => {
    if (!fallbackName.trim()) return;
    setEstimating(true);
    setError(null);
    try {
      const res = await fetch("/api/nutrition/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: fallbackName.trim() }),
      });
      if (!res.ok) throw new Error("Estimation échouée");
      const data = await res.json();
      setEstimated({
        foodName: data.foodName || fallbackName,
        calories: data.calories || 0,
        proteins: data.proteins || 0,
        carbs: data.carbs || 0,
        fats: data.fats || 0,
        mealType: data.mealType || getMealTypeFromTime(),
      });
      setEstimateMealType(data.mealType || getMealTypeFromTime());
    } catch {
      setError("L'IA n'a pas pu estimer ce produit.");
    } finally {
      setEstimating(false);
    }
  };

  const handleConfirmEstimate = () => {
    if (!estimated) return;
    onAdd({
      name: estimated.foodName,
      calories: estimated.calories,
      proteins: estimated.proteins,
      carbs: estimated.carbs,
      fats: estimated.fats,
      time: nowHHMM(),
      mealType: estimateMealType,
    });
  };

  const startScanner = () => {
    if (!scannerRef.current) return;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scannerId = "aura-barcode-reader";
      // Ensure container exists
      if (!document.getElementById(scannerId)) return;
      const scanner = new Html5Qrcode(scannerId, { verbose: false });
      html5QrRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        // Pas de `qrbox` : la lib ne dessine pas son propre cadre → on garde
        // seulement notre viseur (repères + balayage), cohérent avec la Photo IA.
        { fps: 10, aspectRatio: 1 },
        (decodedText: string) => { lookupBarcode(decodedText); },
        () => { /* scan attempt, ignore errors */ }
      ).catch((err: unknown) => {
        console.error("Camera error:", err);
        setError("Caméra inaccessible — autorise l'accès à l'appareil photo.");
      });
    });
  };

  useEffect(() => {
    const t = setTimeout(startScanner, 120);
    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, []); // eslint-disable-line

  const computedMacros = product ? {
    calories: Math.round(product.per100.calories * Number(grams) / 100),
    proteins: Math.round(product.per100.proteins * Number(grams) / 100 * 10) / 10,
    carbs:    Math.round(product.per100.carbs    * Number(grams) / 100 * 10) / 10,
    fats:     Math.round(product.per100.fats     * Number(grams) / 100 * 10) / 10,
  } : null;

  const handleConfirm = () => {
    if (!product || !computedMacros) return;
    const label = product.brand ? `${product.name} (${product.brand})` : product.name;
    onAdd({
      name: label,
      calories: computedMacros.calories,
      proteins: computedMacros.proteins,
      carbs: computedMacros.carbs,
      fats: computedMacros.fats,
      time: nowHHMM(),
      mealType,
    });
  };

  const restart = () => {
    setPhase("scan");
    setProduct(null);
    setGrams("100");
    setError(null);
    didStop.current = false;
    setTimeout(startScanner, 80);
  };

  const CARD_STYLE = {
    background: "rgb(var(--surface-rgb))",
    border: "1px solid rgba(var(--accent-rgb),0.14)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
    maxHeight: "90dvh",
    overflowY: "auto" as const,
  };

  const adjustGrams = (delta: number) => {
    setGrams(g => String(Math.max(1, (parseInt(g) || 100) + delta)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-x-hidden"
        style={CARD_STYLE}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
              Scanner
            </p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>
              {phase === "scan"     ? "Scanner un produit"
               : phase === "loading" ? "Recherche du produit…"
               : phase === "fallback"
                 ? (estimated ? "Produit estimé" : "Décris le produit")
               : "Produit identifié"}
            </h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">

            {/* SCAN */}
            {phase === "scan" && (
              <motion.div key="scan"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {error && (
                  <div className="px-3 py-2.5 rounded-2xl text-xs font-medium"
                    style={{ background: "rgba(242,109,109,0.12)", color: "#F2685F", border: "1px solid rgba(242,109,109,0.28)" }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Viseur caméra LIVE — plein cadre, cohérent avec la Photo IA */}
                <div className="relative rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(160deg,#2A2140,#140E22)", height: 320 }}>
                  {/* html5-qrcode injecte sa <video> ici → forcée en object-fit cover (globals.css) */}
                  <div id="aura-barcode-reader" ref={scannerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(8,4,14,0.12),rgba(8,4,14,0.32))" }} />
                  {/* repères d'angle (mêmes que la Photo IA) */}
                  {[["top-3 left-3", "border-t-2 border-l-2 rounded-tl-xl"],
                    ["top-3 right-3", "border-t-2 border-r-2 rounded-tr-xl"],
                    ["bottom-3 left-3", "border-b-2 border-l-2 rounded-bl-xl"],
                    ["bottom-3 right-3", "border-b-2 border-r-2 rounded-br-xl"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-7 h-7 ${pos} ${cls} pointer-events-none`} style={{ borderColor: "rgba(255,255,255,0.85)" }} />
                  ))}
                  {/* Balayage lumineux violet↗or (signature Vaiiya) */}
                  <motion.div
                    className="absolute left-6 right-6 pointer-events-none"
                    style={{ height: 2, background: "linear-gradient(90deg,transparent,#FFD98A,var(--accent),transparent)", boxShadow: "0 0 10px rgba(255,217,138,0.6)" }}
                    animate={{ top: ["12%", "88%", "12%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="absolute left-1/2 bottom-3 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none"
                    style={{ background: "rgba(10,6,16,0.45)", color: "#fff", backdropFilter: "blur(4px)" }}>
                    Centre le code-barres
                  </div>
                </div>
              </motion.div>
            )}

            {/* LOADING */}
            {phase === "loading" && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}>
                  <Loader2 size={36} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                </motion.div>
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}
                  className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                  Recherche dans Open Food Facts…
                </motion.p>
              </motion.div>
            )}

            {/* FALLBACK IA — produit non référencé ou sans nutrition */}
            {phase === "fallback" && (
              <motion.div key="fallback"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {/* Bandeau d'info — ton positif, tokenisé (clair + sombre) */}
                {!estimated && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-2xl"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                    <Sparkles size={15} strokeWidth={2} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
                    <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                      {fallbackName
                        ? "Trouvé, mais sans données nutritionnelles — décris-le, je m'occupe des chiffres."
                        : "Pas encore dans la base — décris-le, je m'occupe des chiffres."}
                    </p>
                  </div>
                )}

                {/* Champ nom + bouton estimer */}
                {!estimated && (
                  <>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                        style={{ color: "var(--text-3)" }}>NOM DU PRODUIT</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fallbackName}
                          onChange={e => setFallbackName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && fallbackName.trim()) estimateByAI(); }}
                          placeholder="Ex : Yaourt grec Fage 0%, 150g…"
                          autoFocus
                          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={estimateByAI}
                          disabled={!fallbackName.trim() || estimating}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                          style={{
                            background: fallbackName.trim() && !estimating
                              ? "linear-gradient(135deg,#8B5CF6,#C13BC1)"
                              : "rgba(var(--tint-violet-rgb),0.6)",
                            color: fallbackName.trim() && !estimating ? "#fff" : "var(--text-3)",
                            boxShadow: fallbackName.trim() && !estimating ? "0 4px 14px rgba(139,92,246,0.35)" : "none",
                            minWidth: 80, justifyContent: "center",
                          }}>
                          {estimating
                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
                                <Loader2 size={13} strokeWidth={2} />
                              </motion.div>
                            : <>✨ Estimer</>}
                        </motion.button>
                      </div>
                      <p className="text-[10px] mt-1.5 font-light" style={{ color: "var(--text-3)" }}>
                        Précise la marque et la quantité pour une meilleure estimation
                      </p>
                    </div>

                    {error && (
                      <div className="px-3 py-2 rounded-xl text-xs"
                        style={{ background: "rgba(252,129,129,0.1)", color: "#E53E3E" }}>
                        ⚠️ {error}
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={restart}
                        className="flex-1 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
                        ↩ Rescanner
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
                        className="flex-1 py-2.5 rounded-2xl text-xs font-medium cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.4)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                        Annuler
                      </motion.button>
                    </div>
                  </>
                )}

                {/* Résultat IA */}
                {estimated && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3">

                    {/* Estimation IA — mini fiche */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-semibold tracking-widest uppercase flex items-center gap-1" style={{ color: "var(--accent)" }}>
                          <Sparkles size={11} strokeWidth={2} /> Estimé par l&apos;IA
                        </p>
                        <p className="font-semibold text-sm leading-tight mt-1" style={{ color: "var(--text-1)" }}>
                          {estimated.foodName}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[26px] font-light leading-none" style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{estimated.calories}</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>kcal</p>
                      </div>
                    </div>
                    <MacroTiles proteins={estimated.proteins} carbs={estimated.carbs} fats={estimated.fats} />

                    {/* Type de repas */}
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                        style={{ color: "var(--text-3)" }}>TYPE DE REPAS</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                          <motion.button key={mt} whileTap={{ scale: 0.95 }}
                            onClick={() => setEstimateMealType(mt)}
                            className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                            style={{
                              background: estimateMealType === mt ? "rgba(var(--accent-rgb),0.15)" : "rgba(var(--tint-violet-rgb),0.5)",
                              border: estimateMealType === mt ? "1px solid rgba(var(--accent-rgb),0.35)" : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                              color: estimateMealType === mt ? "var(--text-1)" : "var(--text-2)",
                            }}>
                            <span style={{ fontSize: 12 }}>{MEAL_META[mt].icon}</span>
                            <span>{MEAL_META[mt].label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }}
                        onClick={() => { setEstimated(null); setError(null); }}
                        className="flex-1 py-3 rounded-2xl text-sm font-medium cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                        Modifier
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleConfirmEstimate}
                        className="flex-[2] py-3 rounded-2xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 6px 18px rgba(139,92,246,0.4)" }}>
                        <Plus size={16} strokeWidth={2.5} /> Ajouter à ma journée
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* RESULT */}
            {phase === "result" && product && computedMacros && (
              <motion.div key="result"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {/* Product card */}
                <div className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.4)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={product.image} alt={product.name}
                      className="w-14 h-14 rounded-xl object-contain flex-shrink-0"
                      style={{ background: "#fff" }} />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(var(--accent-rgb),0.1)" }}>
                      <Barcode size={20} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight" style={{ color: "var(--text-1)" }}>
                      {product.name}
                    </p>
                    {product.brand && (
                      <p className="text-xs mt-0.5 font-light" style={{ color: "var(--text-2)" }}>{product.brand}</p>
                    )}
                    {product.quantity && (
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{product.quantity}</p>
                    )}
                  </div>
                  {/* Nutri-Score (si connu) */}
                  {product.nutriscore && (
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <span className="text-[7px] font-bold tracking-widest" style={{ color: "var(--text-3)" }}>NUTRI</span>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black"
                        style={{ background: NUTRISCORE_COLOR[product.nutriscore], color: "#fff" }}>
                        {product.nutriscore}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quantity stepper */}
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase mb-2 block"
                    style={{ color: "var(--text-3)" }}>QUANTITÉ</label>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.86 }}
                      onClick={() => adjustGrams(-10)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
                      <Minus size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
                    </motion.button>
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="number" value={grams} min="1" max="2000"
                        onChange={e => setGrams(e.target.value)}
                        className="flex-1 text-center py-2 rounded-xl text-sm font-semibold outline-none"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
                      />
                      <span className="text-sm font-light" style={{ color: "var(--text-3)" }}>g</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.86 }}
                      onClick={() => adjustGrams(10)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
                      <Plus size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
                    </motion.button>
                  </div>
                </div>

                {/* Macros calculées pour la quantité */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Pour {grams} g</span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-2xl font-light" style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{computedMacros.calories}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-3)" }}>kcal</span>
                  </span>
                </div>
                <MacroTiles proteins={computedMacros.proteins} carbs={computedMacros.carbs} fats={computedMacros.fats} />

                {/* Meal type */}
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                    style={{ color: "var(--text-3)" }}>TYPE DE REPAS</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                      <motion.button key={mt} whileTap={{ scale: 0.95 }}
                        onClick={() => setMealType(mt)}
                        className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          background: mealType === mt ? "rgba(var(--accent-rgb),0.15)" : "rgba(var(--tint-violet-rgb),0.5)",
                          border: mealType === mt ? "1px solid rgba(var(--accent-rgb),0.35)" : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                          color: mealType === mt ? "var(--text-1)" : "var(--text-2)",
                        }}>
                        <span style={{ fontSize: 12 }}>{MEAL_META[mt].icon}</span>
                        <span>{MEAL_META[mt].label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={restart}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                    Rescanner
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    className="flex-[2] py-3 rounded-2xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 6px 18px rgba(139,92,246,0.4)" }}>
                    <Plus size={16} strokeWidth={2.5} /> Ajouter à ma journée
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── MenuScanModal ──────────────────────────────────────────────────────
   « La carte » du resto en photo → l'IA lit et CLASSE les plats selon
   l'objectif du moment. Aucune macro inventée ici (on n'a pas vu l'assiette) :
   juste un verdict + une raison relative. Le vrai décompte se fait ensuite
   avec la Photo IA de l'assiette (onPickDish → ouvre PhotoAnalysisModal).
   Voir [[nutrition-onmangeou-redesign]].
   ─────────────────────────────────────────────────────────────────────── */
type MenuVerdict = "recommande" | "correct" | "eviter";
type MenuDish = { name: string; verdict: MenuVerdict; reason: string; best: boolean };
type MenuScanResult = { place: string | null; dishes: MenuDish[]; goalKnown: boolean };
type MenuPhase = "select" | "analyzing" | "result";

const MENU_VERDICT_META: Record<MenuVerdict, { label: string; color: string; tint: string; stripe: string }> = {
  recommande: { label: "Recommandé", color: "#0E8A68", tint: "rgba(31,192,152,0.14)",  stripe: "#1FC098" },
  correct:    { label: "Correct",    color: "#B5730A", tint: "rgba(239,159,39,0.15)",  stripe: "#EF9F27" },
  eviter:     { label: "À éviter",   color: "#C0525C", tint: "rgba(224,106,115,0.14)", stripe: "#E06A73" },
};

function MenuScanModal({ objectiveLine, objectiveChip, goalKnown, initialResult, onClose, onResult, onPickDish }: {
  objectiveLine: string;
  objectiveChip: string;
  goalKnown: boolean;
  initialResult?: MenuScanResult | null;   // rouvre directement sur le classement (retour depuis la photo)
  onClose: () => void;
  onResult?: (r: MenuScanResult) => void;  // remonte le scan au parent pour pouvoir y revenir
  onPickDish: (dishName: string) => void;
}) {
  const [phase, setPhase] = useState<MenuPhase>(initialResult ? "result" : "select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MenuScanResult | null>(initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);  // plat « déplié » dans la liste (évite la sélection au 1er tap)
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const analyze = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoUrl(dataUrl);
      setPhase("analyzing");
      setError(null);
      const base64 = dataUrl.split(",")[1];
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/nutrition/carte", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ image: base64, mimeType: file.type, objective: objectiveLine, goalKnown }),
        });
        if (res.status === 401) { setError("Connecte-toi pour lire une carte."); setPhase("select"); return; }
        if (res.status === 422) { setError("Je n'ai pas réussi à lire les plats — rapproche-toi et recadre la carte."); setPhase("select"); return; }
        if (!res.ok) throw new Error();
        const data: MenuScanResult = await res.json();
        if (!data?.dishes?.length) { setError("Aucun plat lisible — réessaie."); setPhase("select"); return; }
        setResult(data);
        onResult?.(data);          // le parent garde le classement en cache → retour depuis la photo sans re-scan
        setPhase("result");
      } catch {
        setError("Lecture impossible, réessaie.");
        setPhase("select");
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Caméra live in-app (identique à la Photo IA) ──
  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  const startCam = async (mode: "environment" | "user"): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) { setCamReady(false); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setCamReady(true); return true;
    } catch { setCamReady(false); return false; }
  };
  const flipCam = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    stopCam();
    if (await startCam(next)) setFacingMode(next); else await startCam(facingMode);
  };
  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopCam();
      analyze(new File([blob], `carte-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };
  useEffect(() => {
    if (phase === "select") startCam(facingMode); else stopCam();
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const CARD_STYLE = {
    background: "rgb(var(--surface-rgb))",
    border: "1px solid rgba(var(--accent-rgb),0.14)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
    maxHeight: "90dvh",
    overflowY: "auto" as const,
  };

  const best = result?.dishes.find(d => d.best) ?? result?.dishes[0] ?? null;
  const others = result ? result.dishes.filter(d => d !== best) : [];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-x-hidden"
        style={CARD_STYLE}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>Carte du resto</p>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>
              {phase === "analyzing" ? "Je lis la carte…" : phase === "result" ? "Trié pour toi" : "Photographie la carte"}
            </h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">

            {/* SELECT — viseur immersif */}
            {phase === "select" && (
              <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs font-medium"
                    style={{ background: "rgba(242,109,109,0.12)", color: "#F2685F", border: "1px solid rgba(242,109,109,0.28)" }}>
                    ⚠️ {error}
                  </div>
                )}
                <input ref={camRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />
                <input ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />

                <div className="relative w-full rounded-2xl overflow-hidden"
                  style={{ height: 320, background: "linear-gradient(160deg,#2A2140,#140E22)" }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: camReady ? 1 : 0, transition: "opacity .3s" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(8,4,14,0.12),rgba(8,4,14,0.32))" }} />
                  {[["top-3 left-3", "border-t-2 border-l-2 rounded-tl-xl"],
                    ["top-3 right-3", "border-t-2 border-r-2 rounded-tr-xl"],
                    ["bottom-3 left-3", "border-b-2 border-l-2 rounded-bl-xl"],
                    ["bottom-3 right-3", "border-b-2 border-r-2 rounded-br-xl"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-7 h-7 ${pos} ${cls} pointer-events-none`} style={{ borderColor: "rgba(255,255,255,0.85)" }} />
                  ))}

                  {camReady ? (
                    <>
                      <div className="absolute pointer-events-none" style={{ left: "13%", right: "13%", top: "17%", bottom: "17%", border: "1.5px dashed rgba(255,255,255,0.4)", borderRadius: 10 }} />
                      <div className="absolute left-1/2 bottom-3 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none inline-flex items-center gap-1.5"
                        style={{ background: "rgba(10,6,16,0.45)", color: "#fff", backdropFilter: "blur(4px)" }}>
                        <Sparkles size={12} style={{ color: "#D79BFF" }} /> Cadre la carte entière
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => camRef.current?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 24px rgba(139,92,246,0.5)" }}>
                        <BookOpen size={26} strokeWidth={1.8} style={{ color: "#fff" }} />
                      </div>
                      <div className="text-center px-6">
                        <p className="text-sm font-semibold" style={{ color: "#fff" }}>Photographier la carte</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>Autorise la caméra, ou touche pour l&apos;appareil photo</p>
                      </div>
                    </button>
                  )}
                </div>

                {camReady ? (
                  <div className="flex items-center justify-between mt-4 px-6">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <ImageIcon size={19} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={capturePhoto}
                      className="rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ width: 68, height: 68, border: "3px solid rgba(var(--accent-rgb),0.35)" }}>
                      <span className="rounded-full" style={{ width: 52, height: 52, background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 6px 18px rgba(139,92,246,0.5)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={flipCam}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <SwitchCamera size={19} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                    className="w-full mt-3 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                    <Upload size={15} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
                    <span className="font-medium text-sm" style={{ color: "var(--text-2)" }}>Choisir dans la galerie</span>
                  </motion.button>
                )}

                <p className="text-[11px] text-center mt-4 font-light" style={{ color: "var(--text-3)" }}>
                  L&apos;IA lit les plats et te dit lesquels collent à ton objectif — sans chiffres inventés.
                </p>
              </motion.div>
            )}

            {/* ANALYZING */}
            {phase === "analyzing" && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4">
                {photoUrl && (
                  <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: 300 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={photoUrl} alt="carte" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(8,4,14,0.05),rgba(8,4,14,0.5))" }} />
                    <motion.div className="absolute left-0 right-0"
                      style={{ height: 56, background: "linear-gradient(180deg,transparent,rgba(139,92,246,0.55) 60%,transparent)", boxShadow: "0 2px 12px rgba(193,59,193,0.55)" }}
                      animate={{ top: ["4%", "82%", "4%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                    <div className="absolute left-0 right-0 flex items-center justify-center gap-2" style={{ bottom: 16 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}>
                        <Sparkles size={16} style={{ color: "#D79BFF" }} />
                      </motion.div>
                      <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity }}
                        className="text-xs font-semibold" style={{ color: "#fff" }}>
                        Je lis les plats…
                      </motion.span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="rounded-2xl animate-pulse" style={{ height: 44, background: "rgba(var(--tint-violet-rgb),0.6)" }} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* RESULT — le classement */}
            {phase === "result" && best && result && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {/* Contexte : objectif + resto */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)", color: "var(--text-2)" }}>
                    <Target size={12} strokeWidth={2} style={{ color: "var(--accent)" }} /> {objectiveChip}
                  </span>
                  {result.place && <span className="text-[11px]" style={{ color: "var(--text-3)" }}>· {result.place}</span>}
                </div>
                <p className="flex items-start gap-1.5 text-[11px] leading-snug -mt-1" style={{ color: "var(--text-3)" }}>
                  <Sparkles size={12} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
                  Estimations d&apos;après la carte — le vrai compte se fera à l&apos;assiette.
                </p>

                {/* Hero — le meilleur choix */}
                <div className="relative rounded-2xl p-4 overflow-hidden"
                  style={{ background: "linear-gradient(160deg,rgba(31,192,152,0.12),rgba(var(--tint-violet-rgb),0.15))", border: "1px solid rgba(31,192,152,0.34)" }}>
                  <span aria-hidden className="absolute top-0 left-0 right-0" style={{ height: 3, background: "linear-gradient(90deg,#1FC098,#39E0B5)" }} />
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                    style={{ color: "#0E8A68", background: "rgba(31,192,152,0.14)", border: "1px solid rgba(31,192,152,0.3)" }}>
                    <Star size={11} strokeWidth={2.5} fill="#1FC098" style={{ color: "#1FC098" }} /> Le meilleur choix
                  </span>
                  <p className="font-semibold text-lg leading-tight mt-2.5" style={{ color: "var(--text-1)" }}>{best.name}</p>
                  {best.reason && <p className="text-xs mt-1 leading-snug" style={{ color: "var(--text-2)" }}>{best.reason}</p>}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPickDish(best.name)}
                    className="w-full mt-3.5 py-3 rounded-2xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 6px 18px rgba(139,92,246,0.4)" }}>
                    <Camera size={16} strokeWidth={2} /> Je pars là-dessus
                  </motion.button>
                </div>

                {/* Les autres plats — 1er tap = on DÉPLIE le plat sur place (pas de sélection accidentelle),
                    2e tap sur « Je pars là-dessus » = vraie sélection. Voir [[nutrition-onmangeou-redesign]]. */}
                {others.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold tracking-widest uppercase mt-0.5" style={{ color: "var(--text-3)" }}>
                      Les autres plats <span className="font-normal tracking-normal normal-case">· touche pour choisir</span>
                    </p>
                    <div className="flex flex-col gap-2">
                      {others.map((d, i) => {
                        const vm = MENU_VERDICT_META[d.verdict];
                        const open = focusedIdx === i;
                        return (
                          <motion.div key={`${d.name}-${i}`} layout
                            className="rounded-2xl overflow-hidden"
                            style={{
                              background: open
                                ? `linear-gradient(160deg, ${vm.tint}, rgba(var(--tint-violet-rgb),0.15))`
                                : "rgba(var(--tint-violet-rgb),0.4)",
                              border: open ? `1px solid ${vm.stripe}59` : "1px solid rgba(var(--violet-mid-rgb),0.28)",
                            }}>
                            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setFocusedIdx(open ? null : i)}
                              className="w-full flex items-center gap-3 p-3 cursor-pointer text-left">
                              <span className="self-stretch rounded-full flex-shrink-0" style={{ width: 4, background: vm.stripe }} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold leading-tight ${open ? "text-base" : "text-sm"}`} style={{ color: "var(--text-1)" }}>{d.name}</p>
                                {d.reason && <p className="text-[11px] mt-0.5 leading-snug" style={{ color: open ? "var(--text-2)" : "var(--text-3)" }}>{d.reason}</p>}
                              </div>
                              <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                                style={{ color: vm.color, background: vm.tint }}>{vm.label}</span>
                            </motion.button>
                            <AnimatePresence initial={false}>
                              {open && (
                                <motion.div key="cta"
                                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="px-3 pb-3">
                                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPickDish(d.name)}
                                      className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                                      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 6px 18px rgba(139,92,246,0.35)" }}>
                                      <Camera size={15} strokeWidth={2} /> Je pars là-dessus
                                    </motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}

                <p className="text-[11px] text-center mt-1 font-light" style={{ color: "var(--text-3)" }}>
                  Tu choisis → tu photographies l&apos;assiette quand elle arrive pour le vrai décompte.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── ManualModal ────────────────────────────────────────────────────── */
function ManualModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [mealType, setMealType] = useState<MealType>(getMealTypeFromTime());
  const [estimating, setEstimating] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Masque la barre de nav du bas tant que la modale est ouverte (sinon elle recouvre les boutons sur mobile).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const estimate = async () => {
    if (!name.trim()) return;
    setEstimating(true);
    setEstimateError(null);
    setEstimated(false);
    try {
      const res = await fetch("/api/nutrition/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: name.trim() }),
      });
      if (!res.ok) throw new Error("Estimation échouée");
      const data = await res.json();
      if (data.foodName) setName(data.foodName);
      if (data.calories) setKcal(String(data.calories));
      if (data.proteins !== undefined) setProteins(String(data.proteins));
      if (data.carbs !== undefined) setCarbs(String(data.carbs));
      if (data.fats !== undefined) setFats(String(data.fats));
      if (data.mealType) setMealType(data.mealType as MealType);
      setEstimated(true);
    } catch {
      setEstimateError("Impossible d'estimer, remplis manuellement.");
    } finally {
      setEstimating(false);
    }
  };

  const submit = () => {
    if (!name.trim() || !kcal) return;
    onAdd({
      name: name.trim(),
      calories: parseInt(kcal),
      proteins: parseInt(proteins) || 0,
      carbs: parseInt(carbs) || 0,
      fats: parseInt(fats) || 0,
      time: nowHHMM(),
      mealType,
    });
  };

  const valid = name.trim() && kcal;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-violet-rgb),0.45)", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-5 overflow-x-hidden"
        style={{
          background: "rgba(var(--surface-rgb),0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(var(--surface-rgb),0.9)",
          boxShadow: "0 20px 60px rgba(var(--accent-rgb),0.15)",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>IA Nutrition</p>
            <h2 className="text-lg font-light" style={{ color: "var(--text-1)" }}>Décrire un repas</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="flex flex-col gap-3 mb-4">

          {/* Champ description + bouton estimer */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "var(--text-3)" }}>
              Ce que tu as mangé
            </label>
            <div className="flex gap-2">
              <input
                type="text" value={name}
                onChange={e => { setName(e.target.value); setEstimated(false); setEstimateError(null); }}
                onKeyDown={e => { if (e.key === "Enter" && name.trim()) estimate(); }}
                placeholder="Ex : 5 madeleines et un bol de lait…"
                autoFocus
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
              />
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={estimate}
                disabled={!name.trim() || estimating}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                style={{
                  background: name.trim() && !estimating
                    ? "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))"
                    : "rgba(220,220,220,0.4)",
                  color: name.trim() && !estimating ? "var(--text-1)" : "var(--text-3)",
                  boxShadow: name.trim() ? "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none",
                  minWidth: 80,
                  justifyContent: "center",
                }}>
                {estimating ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
                    <Loader2 size={13} strokeWidth={2} />
                  </motion.div>
                ) : (
                  <>✨ Estimer</>
                )}
              </motion.button>
            </div>
            <p className="text-[10px] mt-1.5 font-light" style={{ color: "var(--text-3)" }}>
              L&apos;IA calcule automatiquement les calories & macros — ou appuie sur Entrée
            </p>
          </div>

          {/* Erreur estimation */}
          {estimateError && (
            <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(252,129,129,0.1)", color: "#E53E3E" }}>
              ⚠️ {estimateError}
            </div>
          )}

          {/* Résultat estimation */}
          <AnimatePresence>
            {estimated && kcal && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}>
                <Check size={12} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                  Estimation IA — vérifie et modifie si besoin
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Champs nutritionnels */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Calories (kcal)", val: kcal,     set: setKcal,     ph: "420" },
              { label: "Protéines (g)",   val: proteins,  set: setProteins, ph: "30"  },
              { label: "Glucides (g)",    val: carbs,     set: setCarbs,    ph: "50"  },
              { label: "Lipides (g)",     val: fats,      set: setFats,     ph: "15"  },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="text-[10px] font-semibold tracking-widest uppercase mb-1 block"
                  style={{ color: "var(--text-3)" }}>{label}</label>
                <motion.input
                  type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  animate={estimated && val ? { borderColor: "rgba(var(--accent-rgb),0.5)" } : {}}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: estimated && val ? "rgba(var(--tint-violet-rgb),0.6)" : "rgba(var(--tint-violet-rgb),0.5)",
                    border: "1px solid rgba(var(--violet-mid-rgb),0.5)",
                    color: "var(--text-1)",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Type de repas */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "var(--text-3)" }}>
              Type de repas
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                <motion.button key={mt} whileTap={{ scale: 0.95 }}
                  onClick={() => setMealType(mt)}
                  className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    background: mealType === mt ? "rgba(var(--accent-rgb),0.15)" : "rgba(var(--tint-violet-rgb),0.5)",
                    border: mealType === mt ? "1px solid rgba(var(--accent-rgb),0.35)" : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                    color: mealType === mt ? "var(--text-1)" : "var(--text-2)",
                  }}>
                  <span style={{ fontSize: 13 }}>{MEAL_META[mt].icon}</span>
                  <span>{MEAL_META[mt].label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <motion.button whileHover={{ scale: valid ? 1.02 : 1 }} whileTap={{ scale: valid ? 0.97 : 1 }}
          onClick={submit} disabled={!valid}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{
            background: valid ? "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)" : "rgba(220,220,220,0.45)",
            color: valid ? "var(--text-1)" : "var(--text-3)",
            boxShadow: valid ? "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none",
          }}>
          Enregistrer
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Helpers Supabase ──────────────────────────────────────────────── */
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMeal(r: any): MealEntry {
  return {
    id: String(r.id), name: r.food_name, calories: r.calories,
    proteins: r.proteins, carbs: r.carbs, fats: r.fats,
    time: r.time, mealType: r.meal_type as MealType,
    description: r.description ?? undefined, hasPhoto: r.has_photo ?? false,
  };
}

/* ─── Nutrition Calendar ─────────────────────────────────────────────── */
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const WEEK_SHORT = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function calBg(pct: number): React.CSSProperties {
  if (pct <= 0)   return {};
  if (pct < 0.25) return { background: "rgba(var(--violet-mid-rgb),0.28)" };
  if (pct < 0.50) return { background: "rgba(var(--accent-rgb),0.38)" };
  if (pct < 0.75) return { background: "rgba(var(--accent-rgb),0.58)" };
  if (pct < 0.90) return { background: "rgba(var(--accent-rgb),0.76)" };
  return { background: "linear-gradient(135deg,rgba(var(--accent-rgb),0.9) 0%,rgba(var(--gold-rgb),0.75) 100%)" };
}

function NutritionCalendar({ onDayClick }: { onDayClick: (date: Date) => void }) {
  const { user } = useAuth();
  const today = new Date(); today.setHours(0,0,0,0);

  const [calMonth, setCalMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [allData, setAllData]   = useState<Map<string, DaySummary>>(new Map());
  const [loading, setLoading]   = useState(true);
  const [regDate, setRegDate]   = useState<Date | null>(null);

  /* Objectif du jour — lu depuis le profil central (base), partagé avec l'IA. */
  const { goals } = useNutritionGoals();

  /* Registration date */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.created_at) {
        const d = new Date(data.session.user.created_at);
        d.setHours(0,0,0,0);
        setRegDate(d);
      }
    });
  }, [user]);

  /* Load all nutrition data */
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    supabase.from("nutrition_logs").select("date,calories,proteins,carbs,fats").eq("user_id", user.id)
      .then(({ data: nutr }) => {
      const map = new Map<string, DaySummary>();
      const blank = (): DaySummary => ({ date:"", total_calories:0, total_proteins:0, total_carbs:0, total_fats:0, meal_count:0, water_ml:0 });

      (nutr ?? []).forEach((r: { date:string; calories:number; proteins:number; carbs:number; fats:number }) => {
        const e = map.get(r.date) ?? { ...blank(), date: r.date };
        map.set(r.date, { ...e,
          total_calories: e.total_calories + (r.calories ?? 0),
          total_proteins: e.total_proteins + (r.proteins ?? 0),
          total_carbs:    e.total_carbs    + (r.carbs    ?? 0),
          total_fats:     e.total_fats     + (r.fats     ?? 0),
          meal_count:     e.meal_count + 1,
        });
      });

      setAllData(map);
      setLoading(false);
    });
  }, [user]);

  /* Calendar grid — mémorisé pour éviter les recalculs à chaque render */
  const { weeks, canPrev, canNext } = useMemo(() => {
    const firstOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const dow0 = firstOfMonth.getDay();
    const offset = dow0 === 0 ? -6 : 1 - dow0;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() + offset);
    const allDays = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
    const ws: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const w = allDays.slice(i, i+7);
      if (w.some(d => d.getMonth() === calMonth.getMonth())) ws.push(w);
    }
    const regMonth = regDate ? new Date(regDate.getFullYear(), regDate.getMonth(), 1) : null;
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      weeks: ws,
      canPrev: regMonth ? calMonth > regMonth : true,
      canNext: calMonth < todayMonth,
    };
  }, [calMonth, regDate, today]);

  /* Monthly stats — mémorisé */
  const { trackedThisMonth, daysInMonth, avgCal } = useMemo(() => {
    const mk = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,"0")}`;
    const monthEntries = [...allData.entries()].filter(([k]) => k.startsWith(mk)).map(([,v]) => v);
    const tracked = monthEntries.filter(d => d.meal_count > 0);
    return {
      trackedThisMonth: tracked.length,
      daysInMonth: new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 0).getDate(),
      avgCal: tracked.length > 0 ? Math.round(tracked.reduce((s,d) => s + d.total_calories,0) / tracked.length) : 0,
    };
  }, [allData, calMonth]);

  /* Streak calculation — mémorisé */
  const { streak, bestStreak } = useMemo(() => {
    const sorted = [...allData.entries()].filter(([,v]) => v.meal_count > 0).map(([k]) => k).sort();
    let best = 0, cur = 0;
    for (let i = 0; i < sorted.length; i++) {
      cur = i === 0 ? 1
        : (new Date(sorted[i]).getTime() - new Date(sorted[i-1]).getTime()) / 86400000 === 1 ? cur+1 : 1;
      best = Math.max(best, cur);
    }
    let current = 0;
    for (let i = sorted.length-1; i >= 0; i--) {
      const diff = Math.round((today.getTime() - new Date(sorted[i]).getTime()) / 86400000);
      if (i === sorted.length-1 && diff > 1) break;
      if (i < sorted.length-1 && Math.round((new Date(sorted[i+1]).getTime() - new Date(sorted[i]).getTime()) / 86400000) !== 1) break;
      current++;
    }
    return { streak: current, bestStreak: best };
  }, [allData, today]);

  /* All-time aggregates — mémorisé (allTracked au niveau composant pour le rendu) */
  const allTracked = useMemo(() => [...allData.values()].filter(d => d.meal_count > 0), [allData]);
  const globalAvgCal = useMemo(() =>
    allTracked.length > 0
      ? Math.round(allTracked.reduce((s, d) => s + d.total_calories, 0) / allTracked.length)
      : 0,
  [allTracked]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="max-w-5xl">

      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => canPrev && setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1))}
          disabled={!canPrev}
          className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
          style={{ background: canPrev ? "rgba(var(--tint-violet-rgb),0.85)" : "transparent", opacity: canPrev ? 1 : 0.3,
            border: "1px solid rgba(var(--violet-mid-rgb),0.3)", boxShadow: canPrev ? "0 2px 8px rgba(var(--accent-rgb),0.08), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none" }}
        >
          <ChevronLeft size={16} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
        </motion.button>

        <div className="text-center">
          <p className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
            {MONTHS_FR[calMonth.getMonth()]} {calMonth.getFullYear()}
          </p>
          {regDate && (
            <p className="text-[10px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>
              Suivi depuis le {regDate.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(calMonth.getMonth() !== today.getMonth() || calMonth.getFullYear() !== today.getFullYear()) && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-xl cursor-pointer"
              style={{ background: "rgba(var(--accent-rgb),0.15)", color: "var(--accent)" }}
            >
              Auj.
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => canNext && setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1))}
            disabled={!canNext}
            className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{ background: canNext ? "rgba(var(--tint-violet-rgb),0.85)" : "transparent", opacity: canNext ? 1 : 0.3,
              border: "1px solid rgba(var(--violet-mid-rgb),0.3)", boxShadow: canNext ? "0 2px 8px rgba(var(--accent-rgb),0.08), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none" }}
          >
            <ChevronRight size={16} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div className="w-5 h-5 rounded-full border-2"
            style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
            animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {WEEK_SHORT.map((d) => (
              <div key={d} className="flex justify-center py-1">
                <span className="text-[10px] font-semibold tracking-wide" style={{ color: "var(--text-3)" }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex flex-col gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => {
                  const ds = toDateStr(day);
                  const s = allData.get(ds);
                  const inMonth    = day.getMonth() === calMonth.getMonth();
                  const isToday    = day.toDateString() === today.toDateString();
                  const isFuture   = day > today;
                  const isBeforeReg= regDate ? day < regDate : false;
                  const hasData    = !!s && s.meal_count > 0;
                  const pct        = hasData ? Math.min(s.total_calories / goals.calories, 1) : 0;
                  const highContrast = pct >= 0.5;
                  const isClickable= inMonth && !isFuture && !isBeforeReg;

                  return (
                    <motion.button
                      key={di}
                      whileHover={isClickable ? { scale: 1.07, y: -1 } : {}}
                      whileTap={isClickable  ? { scale: 0.92 } : {}}
                      onClick={() => isClickable && onDayClick(day)}
                      disabled={!isClickable}
                      className="relative flex flex-col items-center justify-start py-1.5 px-0.5 rounded-xl overflow-hidden"
                      style={{
                        minHeight: 56,
                        cursor: isClickable ? "pointer" : "default",
                        opacity: !inMonth || isBeforeReg ? 0.2 : isFuture ? 0.4 : 1,
                        border: isToday
                          ? "2px solid rgba(var(--accent-rgb),0.8)"
                          : hasData ? "1px solid rgba(var(--accent-rgb),0.15)" : "1px solid rgba(var(--violet-mid-rgb),0.12)",
                        ...calBg(pct),
                        ...(isToday && !hasData ? { background: "rgba(var(--tint-violet-rgb),0.5)" } : {}),
                      }}
                    >
                      {/* Date number */}
                      <span className="text-[11px] font-bold leading-none"
                        style={{ color: highContrast ? "#fff" : isToday ? "#7C3AED" : "var(--text-1)" }}>
                        {day.getDate()}
                      </span>

                      {/* Calories */}
                      {hasData && (
                        <span className="text-[9px] font-semibold leading-none mt-0.5"
                          style={{ color: highContrast ? "rgba(var(--surface-rgb),0.9)" : "#6B5FC0" }}>
                          {s.total_calories >= 1000
                            ? `${(s.total_calories/1000).toFixed(1)}k`
                            : `${s.total_calories}`}
                        </span>
                      )}

                      {/* Progress sliver */}
                      {hasData && (
                        <div className="w-full px-1 mt-auto pt-0.5">
                          <div className="h-0.5 rounded-full overflow-hidden"
                            style={{ background: highContrast ? "rgba(var(--surface-rgb),0.2)" : "rgba(var(--accent-rgb),0.15)" }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.min(pct*100,100)}%`,
                                background: highContrast ? "rgba(var(--surface-rgb),0.7)" : "rgba(var(--accent-rgb),0.8)" }} />
                          </div>
                        </div>
                      )}

                      {/* Today ring */}
                      {isToday && (
                        <div className="absolute inset-0 rounded-[10px] pointer-events-none"
                          style={{ boxShadow: "inset 0 0 0 2px rgba(var(--accent-rgb),0.8)" }} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { c: "rgba(var(--violet-mid-rgb),0.4)",  l: "< 25 %"  },
              { c: "rgba(var(--accent-rgb),0.45)", l: "25–50 %"  },
              { c: "rgba(var(--accent-rgb),0.68)", l: "50–75 %"  },
              { c: "linear-gradient(90deg,rgba(var(--accent-rgb),0.9),rgba(var(--gold-rgb),0.85))", l: "≥ 90 %" },
            ].map(({ c, l }) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
                <span className="text-[9px] font-light" style={{ color: "var(--text-3)" }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Monthly stats tiles */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: "📅", label: "Jours trackés",  val: `${trackedThisMonth}`,   unit: `/ ${daysInMonth}`, color: "var(--text-1)" },
              { icon: "🔥", label: "Moy. calories",  val: avgCal > 0 ? avgCal.toLocaleString("fr-FR") : "—", unit: avgCal > 0 ? "kcal/j" : "", color: "var(--accent)" },
              { icon: "⚡", label: "Streak actuel",  val: streak > 0 ? `${streak}` : "—", unit: streak > 0 ? "jours" : "", color: "var(--gold)" },
            ].map(({ icon, label, val, unit, color }) => (
              <motion.div key={label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1.5 p-3.5 rounded-2xl"
                style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--surface-rgb),0.9)",
                  backdropFilter: "blur(16px)", boxShadow: "0 4px 16px rgba(var(--accent-rgb),0.06), inset 0 1px 0 rgba(var(--surface-rgb),0.95)" }}>
                <span className="text-base">{icon}</span>
                <div>
                  <span className="text-lg font-light leading-none" style={{ color }}>{val}</span>
                  {unit && <span className="text-[10px] font-light ml-1" style={{ color: "var(--text-3)" }}>{unit}</span>}
                </div>
                <p className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>{label}</p>
              </motion.div>
            ))}
          </div>

          {/* All-time summary banner */}
          {allTracked.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="mt-4 p-4 rounded-2xl"
              style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.22) 0%,rgba(var(--cream-mid-rgb),0.16) 100%)",
                border: "1px solid rgba(var(--accent-rgb),0.14)", backdropFilter: "blur(12px)" }}>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-3)" }}>
                Depuis l'inscription
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { val: allTracked.length, unit: "jours", label: "trackés",   color: "var(--text-1)" },
                  { val: bestStreak,        unit: "jours", label: "meil. série",color: "var(--accent)" },
                  { val: globalAvgCal > 0 ? globalAvgCal.toLocaleString("fr-FR") : "—",
                    unit: globalAvgCal > 0 ? "kcal" : "", label: "moy./jour",   color: "var(--gold)" },
                ].map(({ val, unit, label, color }) => (
                  <div key={label}>
                    <p className="text-xl font-extralight leading-tight" style={{ color }}>
                      {val}
                      <span className="text-xs font-light ml-0.5" style={{ color: "var(--text-3)" }}>{unit}</span>
                    </p>
                    <p className="text-[10px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

/* ─── Page principale ────────────────────────────────────────────────── */
export default function NutritionTab({ showBackButton = false, fullPage = true }: { showBackButton?: boolean; fullPage?: boolean }) {
  const { user } = useAuth();
  const supabase = createClient();
  const today = new Date();
  const [calView, setCalView] = useState<"journal" | "calendrier">("journal");
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);   // « La carte » du resto en photo → classement
  const [menuResult, setMenuResult] = useState<MenuScanResult | null>(null);  // classement gardé en cache → retour photo→carte sans re-scan
  const [photoFromMenu, setPhotoFromMenu] = useState(false);                  // la photo a été ouverte depuis la carte (affiche le retour)
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false); // journal relégué en pied, déplié à la demande

  /* Objectif du jour — lu depuis le profil central (base), partagé avec l'IA. */
  const { goals } = useNutritionGoals();

  /* Derived stats */
  const totalCals  = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt  = meals.reduce((s, m) => s + m.proteins, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFats  = meals.reduce((s, m) => s + m.fats, 0);
  const remaining  = Math.max(goals.calories - totalCals, 0);

  /* ── Coups de cœur : tes plats les plus souvent enregistrés (ajout en 1 tap).
     Classés par FRÉQUENCE (et non plus par simple récence) ; la récence
     départage. Macros = celles de la dernière fois que tu l'as mangé. ─── */
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const loadRecents = useCallback(async () => {
    if (!user) { setRecentMeals([]); return; }
    const { data } = await supabase
      .from("nutrition_logs")
      .select("food_name, calories, proteins, carbs, fats")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("time", { ascending: false })
      .limit(200);
    if (!data) return;
    // Regroupe par nom : compte la fréquence, garde les macros de l'occurrence la
    // plus récente (les lignes arrivent déjà du plus récent au plus ancien).
    const byName = new Map<string, RecentMeal & { rank: number }>();
    (data as { food_name: string; calories: number; proteins: number; carbs: number; fats: number }[]).forEach((r, i) => {
      const key = (r.food_name ?? "").trim().toLowerCase();
      if (!key) return;
      const existing = byName.get(key);
      if (existing) { existing.count = (existing.count ?? 1) + 1; }
      else { byName.set(key, { name: r.food_name, calories: r.calories, proteins: r.proteins, carbs: r.carbs, fats: r.fats, count: 1, rank: i }); }
    });
    const ranked = [...byName.values()]
      .sort((a, b) => ((b.count ?? 1) - (a.count ?? 1)) || (a.rank - b.rank))
      .slice(0, 8)
      .map(({ name, calories, proteins, carbs, fats, count }) => ({ name, calories, proteins, carbs, fats, count }));
    setRecentMeals(ranked);
  }, [user]); // eslint-disable-line
  useEffect(() => { loadRecents(); }, [loadRecents]);

  /* ── Plats épinglés (favoris manuels) — localStorage : passent devant, jamais évincés ── */
  const [pinned, setPinned] = useState<RecentMeal[]>([]);
  const [pinHintSeen, setPinHintSeen] = useState(true); // true par défaut → pas de flash avant lecture
  useEffect(() => {
    if (!user) { setPinned([]); return; }
    try { const raw = localStorage.getItem(`vaiiya_pinned_meals_${user.id}`); setPinned(raw ? JSON.parse(raw) : []); } catch { setPinned([]); }
    try { setPinHintSeen(!!localStorage.getItem(`vaiiya_pin_hint_seen_${user.id}`)); } catch { /* ignore */ }
  }, [user]);

  const normName = (s: string) => s.trim().toLowerCase();
  const isPinned = (name: string) => pinned.some((p) => normName(p.name) === normName(name));
  const togglePin = (r: RecentMeal) => {
    if (!user) return;
    const exists = isPinned(r.name);
    const next = exists
      ? pinned.filter((p) => normName(p.name) !== normName(r.name))
      : [...pinned, { name: r.name, calories: r.calories, proteins: r.proteins, carbs: r.carbs, fats: r.fats }];
    setPinned(next);
    try { localStorage.setItem(`vaiiya_pinned_meals_${user.id}`, JSON.stringify(next)); } catch { /* ignore */ }
    if (!pinHintSeen) { setPinHintSeen(true); try { localStorage.setItem(`vaiiya_pin_hint_seen_${user.id}`, "1"); } catch { /* ignore */ } }
    showToast(exists ? `${r.name} retiré des favoris` : `${r.name} épinglé ✓`);
  };

  // Affichage : épinglés d'abord (jamais coupés), puis le reste par fréquence.
  // Plafonné pour rester une vraie shortlist (tout visible, sans défilement).
  const displayRecents = useMemo(() => {
    const keys = new Set(pinned.map((p) => normName(p.name)));
    const rest = recentMeals.filter((r) => !keys.has(normName(r.name)));
    return [...pinned, ...rest].slice(0, Math.max(8, pinned.length));
  }, [pinned, recentMeals]);

  // Appui long = épingler/désépingler ; tap simple = ajouter (sans déclencher les deux).
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startPress = (r: RecentMeal) => {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => { longPressFired.current = true; togglePin(r); }, 480);
  };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };
  const onChipTap = (r: RecentMeal) => {
    if (longPressFired.current) { longPressFired.current = false; return; } // l'appui long a déjà agi
    void quickAddRecent(r);
  };

  useEffect(() => { setWeekDays(getMondayWeek(today)); }, []); // eslint-disable-line

  /* ── Chargement Supabase ─── */
  const loadData = useCallback(async (date: Date) => {
    if (!user) return;
    setIsLoading(true);
    const dateStr = toDateStr(date);
    const { data: md } = await supabase
      .from("nutrition_logs").select("*")
      .eq("user_id", user.id).eq("date", dateStr).order("time", { ascending: true });
    setMeals(md ? md.map(rowToMeal) : []);
    setIsLoading(false);
  }, [user]); // eslint-disable-line

  useEffect(() => { loadData(selectedDate); }, [selectedDate, user]); // eslint-disable-line

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  /* ── Ajout repas photo IA ─── */
  const handleAddPhoto = async (meal: Omit<MealEntry, "id">) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: toDateStr(selectedDate), meal_type: meal.mealType,
      food_name: meal.name, description: meal.description ?? null,
      calories: meal.calories, proteins: meal.proteins, carbs: meal.carbs,
      fats: meal.fats, has_photo: meal.hasPhoto ?? false, time: meal.time,
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, rowToMeal(data)]); showToast(`${meal.name} ajouté — ${meal.calories} kcal ✓`); }
    else showToast("Erreur lors de l'ajout");
    setShowPhoto(false);
    setPhotoFromMenu(false);
  };

  /* ── Ajout repas code-barres ─── */
  const handleAddBarcode = async (meal: Omit<MealEntry, "id">) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: toDateStr(selectedDate), meal_type: meal.mealType,
      food_name: meal.name, calories: meal.calories, proteins: meal.proteins,
      carbs: meal.carbs, fats: meal.fats, has_photo: false, time: meal.time,
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, rowToMeal(data)]); showToast(`${meal.name} ajouté ✓`); }
    else showToast("Erreur lors de l'ajout");
    setShowBarcode(false);
  };

  /* ── Ajout repas manuel ─── */
  const handleAddManual = async (meal: Omit<MealEntry, "id">) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: toDateStr(selectedDate), meal_type: meal.mealType,
      food_name: meal.name, calories: meal.calories, proteins: meal.proteins,
      carbs: meal.carbs, fats: meal.fats, has_photo: false, time: meal.time,
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, rowToMeal(data)]); showToast(`${meal.name} ajouté ✓`); }
    else showToast("Erreur lors de l'ajout");
    setShowManual(false);
  };

  /* ── Ajout rapide depuis les repas récents (1 tap) ─── */
  const quickAddRecent = async (r: RecentMeal) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: toDateStr(selectedDate), meal_type: getMealTypeFromTime(),
      food_name: r.name, calories: r.calories, proteins: r.proteins,
      carbs: r.carbs, fats: r.fats, has_photo: false, time: nowHHMM(),
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, rowToMeal(data)]); showToast(`${r.name} ajouté ✓`); void loadRecents(); }
    else showToast("Erreur lors de l'ajout");
  };

  /* ── Ajout d'une recette (IA) au journal du jour — même flux que ci-dessus ─── */
  const addRecipeMeal = async (m: { name: string; calories: number; proteins: number; carbs: number; fats: number }) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: toDateStr(selectedDate), meal_type: getMealTypeFromTime(),
      food_name: m.name, calories: m.calories, proteins: m.proteins,
      carbs: m.carbs, fats: m.fats, has_photo: false, time: nowHHMM(),
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, rowToMeal(data)]); showToast(`${m.name} ajouté ✓`); void loadRecents(); }
    else showToast("Erreur lors de l'ajout");
  };

  /* ── Suppression repas ─── */
  const deleteMeal = async (id: string) => {
    await supabase.from("nutrition_logs").delete().eq("id", id);
    setMeals(prev => prev.filter(m => m.id !== id));
    showToast("Repas supprimé");
  };

  /* Group meals by type (only groups that have meals) */
  const mealGroups = (Object.keys(MEAL_META) as MealType[])
    .map(mt => ({ type: mt, ...MEAL_META[mt], meals: meals.filter(m => m.mealType === mt) }))
    .filter(g => g.meals.length > 0);

  const CARD = {
    background: "rgb(var(--surface-rgb))",
    border: "1px solid rgba(var(--accent-rgb),0.12)",
    boxShadow: "0 6px 26px rgba(var(--accent-rgb),0.16)",
  };

  return (
    <div className={fullPage ? "min-h-screen px-4 pt-10 pb-36 md:pl-24 md:pr-8 md:pt-10 md:pb-10" : "w-full px-0 pt-4 pb-12"}>
      <WeighInPrompt />
      <TastePrefsPrompt />

      {/* ── Titre « Suivi nutrition » (le seul titre qui fait sens, en tête) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-5 max-w-5xl">
        <div>
          {/* Bouton retour vers Progression */}
          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 mb-3 text-xs font-semibold"
              style={{ color: "var(--accent)" }}
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              Progression
            </button>
          )}
          <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--text-3)" }}>
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-3xl font-extralight" style={{ color: "var(--text-1)" }}>
            Suivi{" "}
            <em className="not-italic font-light" style={{
              background: "linear-gradient(135deg,var(--accent),var(--gold))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
            }}>
              nutrition
            </em>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(var(--gold-rgb),0.12)", border: "1px solid rgba(var(--gold-rgb),0.25)" }}>
            <span style={{ color: "var(--gold)", fontSize: 11 }}>★</span>
            <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>14 j</span>
          </motion.div>
          {/* Barcode CTA */}
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
            onClick={() => setShowBarcode(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer"
            style={{
              background: "rgba(var(--accent-rgb),0.12)",
              border: "1px solid rgba(var(--accent-rgb),0.3)",
            }}>
            <Barcode size={16} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
            <span className="text-xs font-semibold hidden sm:block" style={{ color: "var(--accent)" }}>
              Code-barres
            </span>
          </motion.button>
          {/* Photo CTA */}
          <motion.button
            data-tour-anchor="nutrition-photo-cta"
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
            onClick={() => setShowPhoto(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
              boxShadow: "0 4px 16px rgba(147,60,200,0.45)",
            }}>
            <Camera size={16} strokeWidth={1.5} style={{ color: "#fff" }} />
            <span className="text-xs font-semibold hidden sm:block" style={{ color: "#fff" }}>
              Photo IA
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── On mange où ? — le nouveau #1 (dominant) ─────────── */}
      {calView === "journal" && (
        <div className="mb-6">
          <MealSituationHero
            name={user?.name}
            userId={user?.id}
            goals={goals}
            consumed={{ calories: totalCals, proteins: totalProt, carbs: totalCarbs, fats: totalFats }}
            eatenToday={meals.map((m) => m.name)}
            onPhoto={() => setShowPhoto(true)}
            onBarcode={() => setShowBarcode(true)}
            onManual={() => setShowManual(true)}
            onMenuScan={() => { setMenuResult(null); setPhotoFromMenu(false); setShowMenu(true); }}
            onSkip={() => showToast("Noté — on ne t'embête pas 👌")}
            classics={displayRecents}
            onQuickAdd={(r) => { void quickAddRecent(r); }}
            onLogIdea={(m) => { void addRecipeMeal(m); }}
          />
        </div>
      )}

      {/* ── Tab toggle: Journal / Calendrier ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="flex items-center gap-2 mb-5 max-w-5xl"
      >
        {(["journal", "calendrier"] as const).map((v) => {
          const active = calView === v;
          const Icon = v === "journal" ? BookOpen : CalendarDays;
          const labels = { journal: "Journal", calendrier: "Calendrier" };
          return (
            <motion.button
              key={v}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCalView(v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer transition-all duration-200"
              style={{
                background: active ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--accent-rgb),0.10)",
                color: active ? "#fff" : "var(--text-3)",
                boxShadow: active ? "0 4px 14px rgba(147,60,200,0.4)" : "none",
                border: active ? "none" : "1px solid rgba(var(--accent-rgb),0.2)",
              }}
            >
              <Icon size={13} strokeWidth={1.8} />
              {labels[v]}
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Calendar view ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {calView === "calendrier" && (
          <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NutritionCalendar
              onDayClick={(date) => {
                setSelectedDate(date);
                setWeekDays(getMondayWeek(date));
                setCalView("journal");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Week selector ────────────────────────────────────── */}
      {calView === "journal" && <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex justify-between mb-6 max-w-5xl">
        {weekDays.map((day, i) => {
          const isSel = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          const isPast = day < today && !isToday;
          return (
            <motion.button key={i} whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center gap-1 w-10 py-2 rounded-2xl cursor-pointer"
              style={{
                background: isSel ? "linear-gradient(135deg,var(--accent) 0%,#9270E0 100%)" : "transparent",
                boxShadow: isSel ? "0 4px 14px rgba(var(--accent-rgb),0.38)" : "none",
              }}>
              <span className="text-[9px] font-semibold"
                style={{ color: isSel ? "rgba(var(--surface-rgb),0.65)" : "var(--text-3)" }}>
                {DAY_LABELS[i]}
              </span>
              <span className="text-sm font-semibold" style={{ color: isSel ? "#fff" : "var(--text-1)" }}>
                {day.getDate()}
              </span>
              <div className="w-1 h-1 rounded-full" style={{
                background: isSel ? "rgba(var(--surface-rgb),0.55)" : (isPast || isToday) ? "var(--accent)" : "transparent",
              }} />
            </motion.button>
          );
        })}
      </motion.div>}

      {/* ── Statut ──────────────────────────────────────────────── */}
      {calView === "journal" && isLoading && (
        <div className="flex items-center gap-2 mb-4 max-w-5xl" style={{ color: "var(--text-3)" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 size={14} strokeWidth={1.5} />
          </motion.div>
          <span className="text-xs font-light">Chargement…</span>
        </div>
      )}
      {calView === "journal" && !user && !isLoading && (
        <div className="max-w-5xl mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "rgba(var(--gold-rgb),0.08)", border: "1px solid rgba(var(--gold-rgb),0.2)" }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <p className="text-xs font-medium" style={{ color: "var(--gold)" }}>
            Connecte-toi pour synchroniser tes repas sur tous tes appareils
          </p>
        </div>
      )}

      {/* ── Journal du jour — relégué en pied, dépliable ────────── */}
      {calView === "journal" && (
        <button
          onClick={() => setJournalOpen((o) => !o)}
          className="w-full max-w-5xl flex items-center justify-between px-5 py-4 rounded-3xl mb-4 cursor-pointer"
          style={CARD}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
              <BookOpen size={16} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                Journal du jour
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                {totalCals.toLocaleString("fr-FR")}
                <span className="font-normal" style={{ color: "var(--text-3)" }}> / {goals.calories.toLocaleString("fr-FR")} kcal</span>
              </p>
            </div>
          </div>
          <motion.div animate={{ rotate: journalOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.div>
        </button>
      )}

      {/* ── 2-column grid (détail du journal, déplié) ───────────── */}
      {calView === "journal" && journalOpen && (
      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-5 max-w-5xl">

        {/* LEFT — Ring + Macros */}
        <div className="flex flex-col gap-4">

          {/* Calorie ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}
            className="rounded-3xl p-6" style={CARD}>
            <div className="flex flex-col items-center gap-5">
              <CalorieRing consumed={totalCals} goal={goals.calories} />
              <div className="w-full grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "RESTANT", val: remaining, color: "#2BD4A0" },
                  { label: "BRÛLÉ",   val: goals.burned, color: "#FF7A1A" },
                  { label: "OBJECTIF",val: goals.calories, color: "#B79CFF" },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-0.5"
                      style={{ color: "var(--text-3)" }}>{label}</p>
                    <p className="text-lg font-light leading-tight" style={{ color }}>
                      {val.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-3)" }}>kcal</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-center leading-snug px-2" style={{ color: "var(--text-3)" }}>
                Restant = ce qu&apos;il te reste à manger · Brûlé = dépensé en bougeant
              </p>
            </div>
          </motion.div>

          {/* Macros */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-3xl p-5" style={CARD}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                  MACROS DU JOUR
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  Les 3 familles d&apos;aliments qui composent ton assiette
                </p>
              </div>
              <button className="text-xs font-semibold cursor-pointer flex-shrink-0" style={{ color: "var(--accent)" }}>
                Ajuster
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <MacroBar label="Protéines" hint="Pour construire tes muscles"     consumed={totalProt}  goal={goals.proteins} color="#B79CFF" />
              <MacroBar label="Glucides"  hint="Ton énergie pour la journée"      consumed={totalCarbs} goal={goals.carbs}    color="#FF9A3D" />
              <MacroBar label="Lipides"   hint="Les graisses utiles à ton corps"  consumed={totalFats}  goal={goals.fats}     color="#2BD4A0" />
            </div>
          </motion.div>
        </div>

        {/* RIGHT — Meals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="rounded-3xl p-5" style={CARD}>

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                REPAS DU JOUR
              </p>
              <p className="text-sm font-light mt-0.5" style={{ color: "var(--text-2)" }}>
                {totalCals} kcal consommés
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowBarcode(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "rgba(var(--tint-violet-rgb),0.7)",
                  color: "var(--accent)",
                  border: "1px solid rgba(var(--accent-rgb),0.25)",
                }}>
                <Barcode size={12} strokeWidth={2} />
                Scanner
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowPhoto(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))",
                  color: "var(--text-1)",
                  boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
                }}>
                <Camera size={12} strokeWidth={2} />
                Photo IA
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowManual(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "rgba(var(--tint-violet-rgb),0.7)",
                  color: "var(--text-2)",
                  border: "1px solid rgba(var(--violet-mid-rgb),0.4)",
                }}>
                <Plus size={12} strokeWidth={2.5} />
                Manuel
              </motion.button>
            </div>
          </div>

          {/* Ajout rapide — coups de cœur (fréquence) + épinglés (appui long) en 1 tap */}
          {displayRecents.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Heart size={11} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                  Tes coups de cœur
                </p>
                {!pinHintSeen && (
                  <span className="text-[9px] font-normal tracking-normal" style={{ color: "#C4B5FD", textTransform: "none" }}>
                    · appui long pour épingler
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {displayRecents.map((r, i) => {
                  const pin = isPinned(r.name);
                  return (
                    <motion.button key={i} whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.03 }}
                      onPointerDown={() => startPress(r)} onPointerUp={cancelPress}
                      onPointerLeave={cancelPress} onPointerMove={cancelPress}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => onChipTap(r)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl cursor-pointer"
                      style={{
                        background: pin ? "rgba(244,194,231,0.30)" : "rgba(var(--tint-violet-rgb),0.6)",
                        border: pin ? "1px solid rgba(236,153,201,0.55)" : "1px solid rgba(var(--violet-mid-rgb),0.4)",
                        WebkitTouchCallout: "none",
                      }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(var(--accent-rgb),0.15)" }}>
                        <Plus size={11} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium leading-tight flex items-center gap-1" style={{ color: "var(--text-1)", whiteSpace: "nowrap" }}>
                          {pin && <Heart size={9} strokeWidth={2.5} style={{ color: "#8B5CF6", fill: "#8B5CF6" }} />}
                          {r.name}
                        </p>
                        <p className="text-[9px] leading-tight" style={{ color: "var(--text-3)" }}>
                          {r.calories} kcal{(r.count ?? 0) >= 2 ? ` · ${r.count}×` : ""}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recettes par thème — générées par l'IA, ajoutables au journal du jour */}
          <div id="nutrition-idees">
            <RecipesByTheme onAdd={addRecipeMeal} />
          </div>

          {/* Empty state */}
          {meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(var(--accent-rgb),0.08)" }}>
                <Camera size={24} strokeWidth={1.5} style={{ color: "#C4B5FD" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                  Aucun repas enregistré
                </p>
                <p className="text-xs mt-1 font-light max-w-xs" style={{ color: "var(--text-3)" }}>
                  Prends une photo — l&apos;IA identifie les aliments et remplit tout automatiquement
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowPhoto(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))",
                  color: "var(--text-1)",
                  boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
                }}>
                <Camera size={16} strokeWidth={1.5} />
                Analyser mon premier repas
              </motion.button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <AnimatePresence initial={false}>
                {mealGroups.map(group => (
                  <motion.div key={group.type}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

                    {/* Group header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ fontSize: 15 }}>{group.icon}</span>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>{group.label}</p>
                      <div className="flex-1 h-px" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />
                      <p className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
                        {group.meals.reduce((s, m) => s + m.calories, 0)} kcal
                      </p>
                    </div>

                    {/* Meals */}
                    <div className="flex flex-col gap-2">
                      {group.meals.map(meal => (
                        <motion.div key={meal.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                          className="flex items-center gap-3 p-3 rounded-2xl group"
                          style={{
                            background: "rgba(250,249,255,0.7)",
                            border: "1px solid rgba(var(--accent-rgb),0.06)",
                          }}>

                          {/* Icon */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: meal.hasPhoto ? "rgba(var(--accent-rgb),0.12)" : "rgba(var(--accent-rgb),0.07)" }}>
                            {meal.hasPhoto
                              ? <Camera size={14} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                              : <span style={{ fontSize: 15 }}>{group.icon}</span>
                            }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate" style={{ color: "var(--text-1)" }}>
                              {meal.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{meal.time}</span>
                              {meal.proteins > 0 && (
                                <>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)" }}>
                                    P {meal.proteins}g
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(123,92,196,0.08)", color: "#7B5CC4" }}>
                                    G {meal.carbs}g
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full hidden sm:inline-block"
                                    style={{ background: "rgba(var(--gold-rgb),0.1)", color: "var(--gold)" }}>
                                    L {meal.fats}g
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Calories + delete */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{meal.calories}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>kcal</p>
                            </div>
                            <motion.button whileTap={{ scale: 0.85 }}
                              onClick={() => deleteMeal(meal.id)}
                              className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-opacity opacity-30 group-hover:opacity-100"
                              style={{ background: "rgba(252,129,129,0.15)" }}>
                              <X size={10} strokeWidth={2} style={{ color: "#FC8181" }} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
      )}

      {/* ── Modals + Toast ──────────────────────────────────────── */}
      <AnimatePresence>
        {showBarcode && (
          <BarcodeScannerModal key="barcode" onClose={() => setShowBarcode(false)} onAdd={handleAddBarcode} />
        )}
        {showPhoto && (
          <PhotoAnalysisModal key="photo"
            onClose={() => { setShowPhoto(false); setPhotoFromMenu(false); }}
            onAdd={handleAddPhoto}
            onBack={photoFromMenu ? () => { setShowPhoto(false); setPhotoFromMenu(false); setShowMenu(true); } : undefined}
          />
        )}
        {showManual && (
          <ManualModal key="manual" onClose={() => setShowManual(false)} onAdd={handleAddManual} />
        )}
        {showMenu && (() => {
          // Objectif du moment (données RÉELLES du jour, pas une estimation du plat)
          const known = !!goals && goals.calories > 0;
          const h = new Date().getHours();
          const mealLabel = h < 11 ? "petit-déjeuner" : h < 15 ? "déjeuner" : h < 18 ? "goûter" : "dîner";
          const cap = mealLabel.charAt(0).toUpperCase() + mealLabel.slice(1);
          let diet: string[] = [];
          try { if (user?.id) { const raw = localStorage.getItem(`vaiiya_diet_${user.id}`); if (raw) diet = JSON.parse(raw); } } catch { /* ignore */ }
          const dietTxt = diet.length ? ` Régime/contraintes à respecter : ${diet.join(", ")}.` : "";
          const remaining = known ? Math.max(0, Math.round((goals?.calories ?? 0) - totalCals)) : 0;
          const protLeft = known ? Math.max(0, Math.round((goals?.proteins ?? 0) - totalProt)) : 0;
          const objectiveLine = known
            ? `Repas : ${mealLabel}. Il reste environ ${remaining} kcal sur la journée et ~${protLeft} g de protéines à couvrir.${dietTxt}`
            : `Repas : ${mealLabel}. Objectif calorique inconnu — privilégie un plat équilibré et un bon apport en protéines.${dietTxt}`;
          const objectiveChip = known ? `${cap} · ~${remaining} kcal restantes` : `${cap} · équilibre`;
          return (
            <MenuScanModal key="menu"
              objectiveLine={objectiveLine} objectiveChip={objectiveChip} goalKnown={known}
              initialResult={menuResult} onResult={setMenuResult}
              onClose={() => setShowMenu(false)}
              onPickDish={(name) => {
                // On garde le classement en cache (menuResult) → la photo pourra revenir dessus
                setShowMenu(false);
                setPhotoFromMenu(true);
                showToast(`Bon choix : « ${name} » 🍽️ Photographie ton assiette quand elle arrive pour le vrai décompte.`);
                setShowPhoto(true);
              }}
            />
          );
        })()}
        {toast && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(var(--surface-rgb),0.92)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(var(--surface-rgb),0.9)",
              boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2)",
              whiteSpace: "nowrap",
            }}>
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

