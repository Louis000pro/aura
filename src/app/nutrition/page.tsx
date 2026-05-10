"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Plus, X, Check, Camera, Upload, Loader2, Edit2, Barcode, Minus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

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

/* ─── Constants ─────────────────────────────────────────────────────── */
const MEAL_META: Record<MealType, { label: string; icon: string }> = {
  "petit-dejeuner": { label: "Petit-déjeuner", icon: "🌅" },
  "dejeuner":       { label: "Déjeuner",        icon: "☀️"  },
  "gouter":         { label: "Goûter",           icon: "🍎" },
  "diner":          { label: "Dîner",            icon: "🌙" },
};

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

const GOALS = { calories: 2200, proteins: 140, carbs: 240, fats: 70, burned: 412 };

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
            <stop offset="0%"   stopColor="#A78BFA" />
            <stop offset="55%"  stopColor="#C49BE8" />
            <stop offset="100%" stopColor="#D4A843" />
          </linearGradient>
        </defs>
        <circle cx="108" cy="108" r={R} fill="none" stroke="rgba(167,139,250,0.10)" strokeWidth={SW} />
        <motion.circle cx="108" cy="108" r={R} fill="none"
          stroke="url(#caloGrad)" strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>CONSOMMÉ</p>
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[2.5rem] font-light leading-none" style={{ color: "#2D3748" }}>
          {consumed.toLocaleString("fr-FR")}
        </motion.p>
        <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>
          kcal sur {goal.toLocaleString("fr-FR")}
        </p>
      </div>
    </div>
  );
}

/* ─── MacroBar ──────────────────────────────────────────────────────── */
function MacroBar({ label, consumed, goal, color }: { label: string; consumed: number; goal: number; color: string }) {
  const pct = Math.min(Math.round((consumed / goal) * 100), 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-sm font-medium" style={{ color: "#4A5568" }}>{label}</span>
          <span className="text-xs" style={{ color: "#A0AEC0" }}>{pct}%</span>
        </div>
        <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>
          {consumed}g <span className="font-normal text-xs" style={{ color: "#A0AEC0" }}>/ {goal}g</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.35 }} />
      </div>
    </div>
  );
}

/* ─── HydrationWidget — icônes SVG ─────────────────────────────────── */
const PetitVerreIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {/* Verre court, large — forme trapèze */}
    <path d="M2.5 4h10L11 12.5H4L2.5 4Z" />
    {/* Niveau d'eau ~60% */}
    <path d="M4.6 9.5h5.8" />
  </svg>
);

const GrandVerreIcon = () => (
  <svg width="15" height="17" viewBox="0 0 15 17" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {/* Verre haut, effilé */}
    <path d="M2.5 2h10L10.5 15H4.5L2.5 2Z" />
    {/* Niveau d'eau ~60% */}
    <path d="M4.4 10.5h6.2" />
  </svg>
);

const BouteilleIcon = () => (
  <svg width="13" height="18" viewBox="0 0 13 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {/* Bouchon */}
    <rect x="4.2" y="1" width="4.6" height="1.8" rx="0.6" />
    {/* Col + épaules + corps */}
    <path d="M4.2 2.8V5L2.5 6.8V15.2a1 1 0 001 1h6a1 1 0 001-1V6.8L8.8 5V2.8" />
    {/* Niveau d'eau ~55% */}
    <path d="M2.5 11.5h8" />
  </svg>
);

/* ─── HydrationWidget ───────────────────────────────────────────────── */
function HydrationWidget({ waterMl, goalMl = 2000, onAdd, onRemove }: {
  waterMl: number; goalMl?: number;
  onAdd: (ml: number) => void;
  onRemove: (ml: number) => void;
}) {
  const pct = Math.min(Math.round((waterMl / goalMl) * 100), 100);
  const holdRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const barRef   = useRef<HTMLDivElement>(null);
  // Ref pour avoir la valeur courante dans les handlers sans re-registrer les events
  const mlRef    = useRef(waterMl);
  useEffect(() => { mlRef.current = waterMl; }, [waterMl]);

  const applyFromX = (clientX: number) => {
    if (!barRef.current) return;
    const { left, width } = barRef.current.getBoundingClientRect();
    const ratio  = Math.max(0, Math.min(1, (clientX - left) / width));
    const target = Math.round((ratio * goalMl) / 10) * 10;
    const delta  = target - mlRef.current;
    if (delta > 0) onAdd(delta);
    else if (delta < 0) onRemove(-delta);
  };

  const presets = [
    { ml: 150, label: "150 ml", Icon: PetitVerreIcon },
    { ml: 250, label: "250 ml", Icon: GrandVerreIcon },
    { ml: 500, label: "500 ml", Icon: BouteilleIcon },
  ] as const;

  const startHold = (action: () => void) => {
    action();
    holdRef.current = setInterval(action, 110);
  };

  const stopHold = () => {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header + stepper */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets size={15} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
          <span className="text-sm font-medium" style={{ color: "#4A5568" }}>Hydratation</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.86 }}
            disabled={waterMl === 0}
            onMouseDown={() => waterMl > 0 && startHold(() => onRemove(10))}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => waterMl > 0 && startHold(() => onRemove(10))}
            onTouchEnd={stopHold}
            onTouchCancel={stopHold}
            className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{
              background: "rgba(167,139,250,0.10)",
              border: "1px solid rgba(167,139,250,0.20)",
              opacity: waterMl === 0 ? 0.35 : 1,
            }}
          >
            <span className="text-sm font-bold leading-none" style={{ color: "#A78BFA" }}>−</span>
          </motion.button>

          <span className="text-sm font-semibold tabular-nums text-center" style={{ color: "#2D3748", minWidth: 110 }}>
            {waterMl.toLocaleString("fr-FR")}{" "}
            <span className="text-xs font-normal" style={{ color: "#A0AEC0" }}>
              / {goalMl.toLocaleString("fr-FR")} ml
            </span>
          </span>

          <motion.button
            whileTap={{ scale: 0.86 }}
            onMouseDown={() => startHold(() => onAdd(10))}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold(() => onAdd(10))}
            onTouchEnd={stopHold}
            onTouchCancel={stopHold}
            className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.20)" }}
          >
            <span className="text-sm font-bold leading-none" style={{ color: "#A78BFA" }}>+</span>
          </motion.button>
        </div>
      </div>

      {/* Barre interactive — clic ou glissement */}
      <div
        ref={barRef}
        className="relative select-none cursor-ew-resize"
        style={{ paddingBlock: 8 }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          applyFromX(e.clientX);
        }}
        onPointerMove={(e) => { if (e.buttons) applyFromX(e.clientX); }}
      >
        {/* Track */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(167,139,250,0.10)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#A78BFA 0%,#7B5CC4 100%)" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        </div>
        {/* Thumb */}
        {pct > 0 && (
          <motion.div
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(135deg,#A78BFA,#7B5CC4)",
              boxShadow: "0 0 0 3px rgba(167,139,250,0.25), 0 1px 4px rgba(80,40,150,0.2)",
              translateY: "-50%",
            }}
            animate={{ left: `calc(${pct}% - 7px)` }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        )}
      </div>

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-3 gap-2">
        {presets.map(({ ml, label, Icon }) => (
          <motion.button
            key={ml}
            whileTap={{ scale: 0.91 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => onAdd(ml)}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl cursor-pointer"
            style={{
              background: "rgba(167,139,250,0.07)",
              border: "1px solid rgba(167,139,250,0.15)",
              color: "#A78BFA",
            }}
          >
            <Icon />
            <span className="text-[10px] font-medium" style={{ color: "#718096" }}>{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── PhotoAnalysisModal ─────────────────────────────────────────────── */
type PhotoPhase = "select" | "analyzing" | "result" | "edit";

function PhotoAnalysisModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
}) {
  const [phase, setPhase] = useState<PhotoPhase>("select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editData, setEditData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const analyze = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoUrl(dataUrl);
      setPhase("analyzing");
      setError(null);

      const base64 = dataUrl.split(",")[1];
      try {
        const res = await fetch("/api/nutrition/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType: file.type }),
        });
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

  const CARD_STYLE = {
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(40px)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 24px 64px rgba(167,139,250,0.18)",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(240,235,255,0.5)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={CARD_STYLE}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>IA Nutrition</p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>
              {phase === "analyzing" ? "Analyse en cours…"
                : phase === "result"   ? "Repas identifié ✓"
                : phase === "edit"     ? "Modifier"
                : "Analyser un repas"}
            </h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">

            {/* SELECT */}
            {phase === "select" && (
              <motion.div key="select"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs font-medium"
                    style={{ background: "rgba(252,129,129,0.1)", color: "#E53E3E", border: "1px solid rgba(252,129,129,0.2)" }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Camera capture */}
                <input ref={camRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />
                {/* Gallery */}
                <input ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />

                <div className="flex flex-col gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => camRef.current?.click()}
                    className="w-full py-5 rounded-2xl flex flex-col items-center gap-2 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 20px rgba(167,139,250,0.25)",
                    }}>
                    <Camera size={26} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                    <span className="font-semibold text-sm" style={{ color: "#2D3748" }}>Prendre une photo</span>
                    <span className="text-[10px] font-light" style={{ color: "#718096" }}>
                      Pointe l&apos;appareil vers ton repas
                    </span>
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
                    style={{
                      background: "rgba(240,235,255,0.6)",
                      border: "1px solid rgba(212,192,255,0.5)",
                    }}>
                    <Upload size={15} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                    <span className="font-medium text-sm" style={{ color: "#4A5568" }}>Choisir dans la galerie</span>
                  </motion.button>
                </div>

                <p className="text-[11px] text-center mt-4 font-light" style={{ color: "#A0AEC0" }}>
                  L&apos;IA détecte les aliments et estime les calories & macros automatiquement
                </p>
              </motion.div>
            )}

            {/* ANALYZING */}
            {phase === "analyzing" && (
              <motion.div key="analyzing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4">
                {photoUrl && (
                  <div className="w-full h-44 rounded-2xl overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="repas" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                      style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(6px)" }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}>
                        <Loader2 size={36} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                      </motion.div>
                      <motion.p
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        className="text-xs font-medium" style={{ color: "#4A5568" }}>
                        Identification des aliments…
                      </motion.p>
                    </div>
                  </div>
                )}
                <div className="flex gap-4 w-full">
                  {["Calories", "Protéines", "Glucides"].map(l => (
                    <div key={l} className="flex-1 h-8 rounded-xl animate-pulse"
                      style={{ background: "rgba(167,139,250,0.08)" }} />
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
                    <img src={photoUrl} alt="repas" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Food card */}
                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(240,235,255,0.4)", border: "1px solid rgba(212,192,255,0.3)" }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base leading-tight" style={{ color: "#2D3748" }}>
                        {editData.foodName}
                      </p>
                      {editData.description && (
                        <p className="text-xs mt-0.5 font-light" style={{ color: "#718096" }}>
                          {editData.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-light" style={{ color: "#A78BFA" }}>{editData.calories}</p>
                      <p className="text-[10px]" style={{ color: "#A0AEC0" }}>kcal</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Protéines", val: editData.proteins, color: "#A78BFA" },
                      { label: "Glucides",  val: editData.carbs,    color: "#7B5CC4" },
                      { label: "Lipides",   val: editData.fats,     color: "#D4A843" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="text-center rounded-xl py-2.5"
                        style={{ background: "rgba(255,255,255,0.75)" }}>
                        <p className="text-sm font-semibold" style={{ color }}>{val}g</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: 14 }}>{MEAL_META[editData.mealType]?.icon}</span>
                      <span className="text-xs font-medium" style={{ color: "#718096" }}>
                        {MEAL_META[editData.mealType]?.label}
                      </span>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => setPhase("edit")}
                      className="flex items-center gap-1 text-xs cursor-pointer"
                      style={{ color: "#A78BFA" }}>
                      <Edit2 size={10} strokeWidth={2} /> Modifier
                    </motion.button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium cursor-pointer"
                    style={{ background: "rgba(240,235,255,0.6)", color: "#718096", border: "1px solid rgba(212,192,255,0.4)" }}>
                    Reprendre
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    className="flex-[2] py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                      color: "#2D3748",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                    }}>
                    Ajouter à mes repas ✓
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
                      style={{ color: "#A0AEC0" }}>{label}</label>
                    <input
                      type={type}
                      value={editData[key as keyof AnalysisResult] as string | number}
                      onChange={e => setEditData(prev => prev ? {
                        ...prev,
                        [key]: type === "number" ? (parseInt(e.target.value) || 0) : e.target.value,
                      } : prev)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
                    />
                  </div>
                ))}

                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                    style={{ color: "#A0AEC0" }}>TYPE DE REPAS</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                      <motion.button key={mt} whileTap={{ scale: 0.95 }}
                        onClick={() => setEditData(prev => prev ? { ...prev, mealType: mt } : prev)}
                        className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          background: editData.mealType === mt
                            ? "linear-gradient(135deg,rgba(167,139,250,0.2),rgba(212,168,67,0.12))"
                            : "rgba(240,235,255,0.4)",
                          border: editData.mealType === mt
                            ? "1px solid rgba(167,139,250,0.4)"
                            : "1px solid rgba(212,192,255,0.3)",
                          color: editData.mealType === mt ? "#2D3748" : "#718096",
                        }}>
                        <span style={{ fontSize: 13 }}>{MEAL_META[mt].icon}</span>
                        <span>{MEAL_META[mt].label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase("result")}
                  className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer mt-1"
                  style={{
                    background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                    color: "#2D3748",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
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
  quantity: string | null;
  per100: { calories: number; proteins: number; carbs: number; fats: number; fiber: number };
}

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
        { fps: 10, qrbox: { width: 260, height: 130 }, aspectRatio: 1.7 },
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
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(40px)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 24px 64px rgba(167,139,250,0.18)",
  };

  const adjustGrams = (delta: number) => {
    setGrams(g => String(Math.max(1, (parseInt(g) || 100) + delta)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(240,235,255,0.5)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={CARD_STYLE}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
              Scanner
            </p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>
              {phase === "scan"     ? "Scanner un code-barres"
               : phase === "loading" ? "Recherche du produit…"
               : phase === "fallback"
                 ? (estimated ? "Estimation IA ✓" : "Non référencé — estimer")
               : "Produit identifié ✓"}
            </h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
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
                    style={{ background: "rgba(252,129,129,0.1)", color: "#E53E3E", border: "1px solid rgba(252,129,129,0.2)" }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Camera viewport */}
                <div className="relative rounded-2xl overflow-hidden"
                  style={{ background: "#1A202C", minHeight: 200 }}>
                  <div id="aura-barcode-reader" ref={scannerRef} style={{ width: "100%" }} />
                  {/* Viewfinder overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative" style={{ width: 260, height: 100 }}>
                      {/* Corner brackets */}
                      {[["top-0 left-0","border-t-2 border-l-2 rounded-tl-lg"],
                        ["top-0 right-0","border-t-2 border-r-2 rounded-tr-lg"],
                        ["bottom-0 left-0","border-b-2 border-l-2 rounded-bl-lg"],
                        ["bottom-0 right-0","border-b-2 border-r-2 rounded-br-lg"]
                      ].map(([pos, cls], i) => (
                        <div key={i} className={`absolute w-6 h-6 ${pos} ${cls}`}
                          style={{ borderColor: "#A78BFA" }} />
                      ))}
                      {/* Animated scan line */}
                      <motion.div
                        className="absolute left-1 right-1 h-px"
                        style={{ background: "linear-gradient(90deg,transparent,#A78BFA,transparent)" }}
                        animate={{ top: ["10%", "90%", "10%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center font-light" style={{ color: "#A0AEC0" }}>
                  Centre le code-barres entre les repères — détection automatique
                </p>
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
                  <Loader2 size={36} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                </motion.div>
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}
                  className="text-xs font-medium" style={{ color: "#4A5568" }}>
                  Recherche dans Open Food Facts…
                </motion.p>
              </motion.div>
            )}

            {/* FALLBACK IA — produit non référencé ou sans nutrition */}
            {phase === "fallback" && (
              <motion.div key="fallback"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {/* Bandeau d'info */}
                {!estimated && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-2xl"
                    style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}>
                    <span className="text-sm mt-0.5">⚠️</span>
                    <p className="text-xs font-light leading-relaxed" style={{ color: "#92400E" }}>
                      {fallbackName
                        ? "Produit trouvé, mais sans données nutritionnelles. L'IA peut les estimer."
                        : "Ce code-barres n'est pas dans notre base. Décris le produit pour que l'IA estime les macros."}
                    </p>
                  </div>
                )}

                {/* Champ nom + bouton estimer */}
                {!estimated && (
                  <>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                        style={{ color: "#A0AEC0" }}>NOM DU PRODUIT</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fallbackName}
                          onChange={e => setFallbackName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && fallbackName.trim()) estimateByAI(); }}
                          placeholder="Ex : Yaourt grec Fage 0%, 150g…"
                          autoFocus
                          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={estimateByAI}
                          disabled={!fallbackName.trim() || estimating}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                          style={{
                            background: fallbackName.trim() && !estimating
                              ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)"
                              : "rgba(220,220,220,0.4)",
                            color: fallbackName.trim() && !estimating ? "#2D3748" : "#A0AEC0",
                            boxShadow: fallbackName.trim() ? "inset 0 1px 0 rgba(255,255,255,0.9)" : "none",
                            minWidth: 80, justifyContent: "center",
                          }}>
                          {estimating
                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
                                <Loader2 size={13} strokeWidth={2} />
                              </motion.div>
                            : <>✨ Estimer</>}
                        </motion.button>
                      </div>
                      <p className="text-[10px] mt-1.5 font-light" style={{ color: "#A0AEC0" }}>
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
                        style={{ background: "rgba(240,235,255,0.6)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.25)" }}>
                        ↩ Rescanner
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
                        className="flex-1 py-2.5 rounded-2xl text-xs font-medium cursor-pointer"
                        style={{ background: "rgba(240,235,255,0.4)", color: "#718096", border: "1px solid rgba(212,192,255,0.3)" }}>
                        Annuler
                      </motion.button>
                    </div>
                  </>
                )}

                {/* Résultat IA */}
                {estimated && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3">

                    {/* Macros estimées */}
                    <div className="rounded-2xl p-4"
                      style={{ background: "rgba(240,235,255,0.4)", border: "1px solid rgba(212,192,255,0.3)" }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA" }}>✨ IA</span>
                          </div>
                          <p className="font-semibold text-sm leading-tight" style={{ color: "#2D3748" }}>
                            {estimated.foodName}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-light" style={{ color: "#A78BFA" }}>{estimated.calories}</p>
                          <p className="text-[10px]" style={{ color: "#A0AEC0" }}>kcal</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Protéines", val: estimated.proteins, color: "#A78BFA" },
                          { label: "Glucides",  val: estimated.carbs,    color: "#7B5CC4" },
                          { label: "Lipides",   val: estimated.fats,     color: "#D4A843" },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="text-center rounded-xl py-2.5"
                            style={{ background: "rgba(255,255,255,0.75)" }}>
                            <p className="text-sm font-semibold" style={{ color }}>{val}g</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Type de repas */}
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                        style={{ color: "#A0AEC0" }}>TYPE DE REPAS</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                          <motion.button key={mt} whileTap={{ scale: 0.95 }}
                            onClick={() => setEstimateMealType(mt)}
                            className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                            style={{
                              background: estimateMealType === mt ? "rgba(167,139,250,0.15)" : "rgba(240,235,255,0.5)",
                              border: estimateMealType === mt ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(212,192,255,0.3)",
                              color: estimateMealType === mt ? "#2D3748" : "#718096",
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
                        style={{ background: "rgba(240,235,255,0.6)", color: "#718096", border: "1px solid rgba(212,192,255,0.4)" }}>
                        Modifier
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleConfirmEstimate}
                        className="flex-[2] py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                        style={{
                          background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                          color: "#2D3748",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                        }}>
                        Ajouter à mes repas ✓
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
                  style={{ background: "rgba(240,235,255,0.4)", border: "1px solid rgba(212,192,255,0.3)" }}>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt={product.name}
                      className="w-14 h-14 rounded-xl object-contain flex-shrink-0"
                      style={{ background: "#fff" }} />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(167,139,250,0.1)" }}>
                      <Barcode size={20} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight" style={{ color: "#2D3748" }}>
                      {product.name}
                    </p>
                    {product.brand && (
                      <p className="text-xs mt-0.5 font-light" style={{ color: "#718096" }}>{product.brand}</p>
                    )}
                    {product.quantity && (
                      <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>{product.quantity}</p>
                    )}
                  </div>
                </div>

                {/* Quantity stepper */}
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase mb-2 block"
                    style={{ color: "#A0AEC0" }}>QUANTITÉ</label>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.86 }}
                      onClick={() => adjustGrams(-10)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                      <Minus size={14} strokeWidth={2} style={{ color: "#A78BFA" }} />
                    </motion.button>
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="number" value={grams} min="1" max="2000"
                        onChange={e => setGrams(e.target.value)}
                        className="flex-1 text-center py-2 rounded-xl text-sm font-semibold outline-none"
                        style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
                      />
                      <span className="text-sm font-light" style={{ color: "#A0AEC0" }}>g</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.86 }}
                      onClick={() => adjustGrams(10)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                      <Plus size={14} strokeWidth={2} style={{ color: "#A78BFA" }} />
                    </motion.button>
                  </div>
                </div>

                {/* Computed macros */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Calories", val: `${computedMacros.calories}`, unit: "kcal", color: "#A78BFA" },
                    { label: "Protéines", val: `${computedMacros.proteins}`, unit: "g", color: "#A78BFA" },
                    { label: "Glucides", val: `${computedMacros.carbs}`, unit: "g", color: "#7B5CC4" },
                    { label: "Lipides", val: `${computedMacros.fats}`, unit: "g", color: "#D4A843" },
                  ].map(({ label, val, unit, color }) => (
                    <div key={label} className="text-center rounded-xl py-2.5"
                      style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(212,192,255,0.15)" }}>
                      <p className="text-sm font-semibold" style={{ color }}>{val}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: "#A0AEC0" }}>{unit}</p>
                      <p className="text-[8px] mt-0.5 leading-tight" style={{ color: "#CBD5E0" }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Meal type */}
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block"
                    style={{ color: "#A0AEC0" }}>TYPE DE REPAS</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                      <motion.button key={mt} whileTap={{ scale: 0.95 }}
                        onClick={() => setMealType(mt)}
                        className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          background: mealType === mt ? "rgba(167,139,250,0.15)" : "rgba(240,235,255,0.5)",
                          border: mealType === mt ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(212,192,255,0.3)",
                          color: mealType === mt ? "#2D3748" : "#718096",
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
                    style={{ background: "rgba(240,235,255,0.6)", color: "#718096", border: "1px solid rgba(212,192,255,0.4)" }}>
                    Rescanner
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    className="flex-[2] py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                      color: "#2D3748",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                    }}>
                    Ajouter à mes repas ✓
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
      style={{ background: "rgba(240,235,255,0.45)", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-5"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(167,139,250,0.15)",
        }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>IA Nutrition</p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Décrire un repas</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="flex flex-col gap-3 mb-4">

          {/* Champ description + bouton estimer */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>
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
                style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
              />
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={estimate}
                disabled={!name.trim() || estimating}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                style={{
                  background: name.trim() && !estimating
                    ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)"
                    : "rgba(220,220,220,0.4)",
                  color: name.trim() && !estimating ? "#2D3748" : "#A0AEC0",
                  boxShadow: name.trim() ? "inset 0 1px 0 rgba(255,255,255,0.9)" : "none",
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
            <p className="text-[10px] mt-1.5 font-light" style={{ color: "#A0AEC0" }}>
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
                style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <Check size={12} strokeWidth={2.5} style={{ color: "#A78BFA" }} />
                <span className="text-xs font-medium" style={{ color: "#A78BFA" }}>
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
                  style={{ color: "#A0AEC0" }}>{label}</label>
                <motion.input
                  type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  animate={estimated && val ? { borderColor: "rgba(167,139,250,0.5)" } : {}}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: estimated && val ? "rgba(240,235,255,0.6)" : "rgba(240,235,255,0.5)",
                    border: "1px solid rgba(212,192,255,0.5)",
                    color: "#2D3748",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Type de repas */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>
              Type de repas
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                <motion.button key={mt} whileTap={{ scale: 0.95 }}
                  onClick={() => setMealType(mt)}
                  className="py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    background: mealType === mt ? "rgba(167,139,250,0.15)" : "rgba(240,235,255,0.5)",
                    border: mealType === mt ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(212,192,255,0.3)",
                    color: mealType === mt ? "#2D3748" : "#718096",
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
            background: valid ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "rgba(220,220,220,0.45)",
            color: valid ? "#2D3748" : "#A0AEC0",
            boxShadow: valid ? "inset 0 1px 0 rgba(255,255,255,0.9)" : "none",
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

/* ─── Page principale ────────────────────────────────────────────────── */
export default function NutritionPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const waterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waterInitialized = useRef(false);

  /* Derived stats */
  const totalCals  = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt  = meals.reduce((s, m) => s + m.proteins, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFats  = meals.reduce((s, m) => s + m.fats, 0);
  const remaining  = Math.max(GOALS.calories - totalCals, 0);

  useEffect(() => { setWeekDays(getMondayWeek(today)); }, []); // eslint-disable-line

  /* ── Chargement Supabase ─── */
  const loadData = useCallback(async (date: Date) => {
    if (!user) return;
    setIsLoading(true);
    waterInitialized.current = false;
    const dateStr = toDateStr(date);
    const [{ data: md }, { data: hd }] = await Promise.all([
      supabase.from("nutrition_logs").select("*").eq("user_id", user.id).eq("date", dateStr).order("time", { ascending: true }),
      supabase.from("hydration_logs").select("water_ml").eq("user_id", user.id).eq("date", dateStr).maybeSingle(),
    ]);
    setMeals(md ? md.map(rowToMeal) : []);
    setWaterMl(hd?.water_ml ?? 0);
    waterInitialized.current = true;
    setIsLoading(false);
  }, [user]); // eslint-disable-line

  useEffect(() => { loadData(selectedDate); }, [selectedDate, user]); // eslint-disable-line

  /* ── Sauvegarde hydratation debounce 800ms ─── */
  useEffect(() => {
    if (!user || !waterInitialized.current) return;
    if (waterTimer.current) clearTimeout(waterTimer.current);
    waterTimer.current = setTimeout(async () => {
      await supabase.from("hydration_logs").upsert(
        { user_id: user.id, date: toDateStr(selectedDate), water_ml: waterMl },
        { onConflict: "user_id,date" }
      );
    }, 800);
    return () => { if (waterTimer.current) clearTimeout(waterTimer.current); };
  }, [waterMl]); // eslint-disable-line

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
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 4px 32px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
  };

  return (
    <div className="min-h-screen px-4 pt-10 pb-36 md:pl-24 md:pr-8 md:pt-10 md:pb-10">

      {/* ── Header ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 max-w-5xl">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#A0AEC0" }}>
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-3xl font-extralight" style={{ color: "#2D3748" }}>
            Suivi{" "}
            <em className="not-italic font-light" style={{
              background: "linear-gradient(135deg,#A78BFA,#D4A843)",
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
            style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)" }}>
            <span style={{ color: "#D4A843", fontSize: 11 }}>★</span>
            <span className="text-xs font-semibold" style={{ color: "#D4A843" }}>14 j</span>
          </motion.div>
          {/* Barcode CTA */}
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
            onClick={() => setShowBarcode(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer"
            style={{
              background: "rgba(240,235,255,0.85)",
              border: "1px solid rgba(167,139,250,0.3)",
              boxShadow: "0 2px 10px rgba(167,139,250,0.15)",
            }}>
            <Barcode size={16} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
            <span className="text-xs font-semibold hidden sm:block" style={{ color: "#A78BFA" }}>
              Code-barres
            </span>
          </motion.button>
          {/* Photo CTA */}
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
            onClick={() => setShowPhoto(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
              boxShadow: "0 4px 16px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}>
            <Camera size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
            <span className="text-xs font-semibold hidden sm:block" style={{ color: "#2D3748" }}>
              Photo IA
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Week selector ────────────────────────────────────── */}
      <motion.div
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
                background: isSel ? "linear-gradient(135deg,#A78BFA 0%,#9270E0 100%)" : "transparent",
                boxShadow: isSel ? "0 4px 14px rgba(167,139,250,0.38)" : "none",
              }}>
              <span className="text-[9px] font-semibold"
                style={{ color: isSel ? "rgba(255,255,255,0.65)" : "#A0AEC0" }}>
                {DAY_LABELS[i]}
              </span>
              <span className="text-sm font-semibold" style={{ color: isSel ? "#fff" : "#2D3748" }}>
                {day.getDate()}
              </span>
              <div className="w-1 h-1 rounded-full" style={{
                background: isSel ? "rgba(255,255,255,0.55)" : (isPast || isToday) ? "#A78BFA" : "transparent",
              }} />
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Statut ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center gap-2 mb-4 max-w-5xl" style={{ color: "#A0AEC0" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 size={14} strokeWidth={1.5} />
          </motion.div>
          <span className="text-xs font-light">Chargement…</span>
        </div>
      )}
      {!user && !isLoading && (
        <div className="max-w-5xl mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <p className="text-xs font-medium" style={{ color: "#D4A843" }}>
            Connecte-toi pour synchroniser tes repas sur tous tes appareils
          </p>
        </div>
      )}

      {/* ── 2-column grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-5 max-w-5xl">

        {/* LEFT — Ring + Macros */}
        <div className="flex flex-col gap-4">

          {/* Calorie ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}
            className="rounded-3xl p-6" style={CARD}>
            <div className="flex flex-col items-center gap-5">
              <CalorieRing consumed={totalCals} goal={GOALS.calories} />
              <div className="w-full grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "RESTANT", val: remaining, color: "#A78BFA" },
                  { label: "BRÛLÉ",   val: GOALS.burned, color: "#D4A843" },
                  { label: "OBJECTIF",val: GOALS.calories, color: "#2D3748" },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <p className="text-[8px] font-semibold tracking-widest uppercase mb-0.5"
                      style={{ color: "#A0AEC0" }}>{label}</p>
                    <p className="text-lg font-light leading-tight" style={{ color }}>
                      {val.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px]" style={{ color: "#A0AEC0" }}>kcal</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Macros + hydration */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-3xl p-5" style={CARD}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                MACROS DU JOUR
              </p>
              <button className="text-xs font-semibold cursor-pointer" style={{ color: "#A78BFA" }}>
                Ajuster
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <MacroBar label="Protéines" consumed={totalProt}  goal={GOALS.proteins} color="#A78BFA" />
              <MacroBar label="Glucides"  consumed={totalCarbs} goal={GOALS.carbs}    color="#7B5CC4" />
              <MacroBar label="Lipides"   consumed={totalFats}  goal={GOALS.fats}     color="#D4A843" />
              <div style={{ height: 1, background: "rgba(167,139,250,0.08)" }} />
              <HydrationWidget
                waterMl={waterMl}
                goalMl={2000}
                onAdd={(ml) => setWaterMl(w => Math.min(w + ml, 5000))}
                onRemove={(ml) => setWaterMl(w => Math.max(w - ml, 0))}
              />
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
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                REPAS DU JOUR
              </p>
              <p className="text-sm font-light mt-0.5" style={{ color: "#718096" }}>
                {totalCals} kcal consommés
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowBarcode(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "rgba(240,235,255,0.7)",
                  color: "#A78BFA",
                  border: "1px solid rgba(167,139,250,0.25)",
                }}>
                <Barcode size={12} strokeWidth={2} />
                Scanner
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowPhoto(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                  color: "#2D3748",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                }}>
                <Camera size={12} strokeWidth={2} />
                Photo IA
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowManual(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "rgba(240,235,255,0.7)",
                  color: "#718096",
                  border: "1px solid rgba(212,192,255,0.4)",
                }}>
                <Plus size={12} strokeWidth={2.5} />
                Manuel
              </motion.button>
            </div>
          </div>

          {/* Empty state */}
          {meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(167,139,250,0.08)" }}>
                <Camera size={24} strokeWidth={1.5} style={{ color: "#C4B5FD" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "#2D3748" }}>
                  Aucun repas enregistré
                </p>
                <p className="text-xs mt-1 font-light max-w-xs" style={{ color: "#A0AEC0" }}>
                  Prends une photo — l&apos;IA identifie les aliments et remplit tout automatiquement
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowPhoto(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                  color: "#2D3748",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
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
                      <p className="text-sm font-semibold" style={{ color: "#4A5568" }}>{group.label}</p>
                      <div className="flex-1 h-px" style={{ background: "rgba(167,139,250,0.1)" }} />
                      <p className="text-xs font-medium" style={{ color: "#A0AEC0" }}>
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
                            border: "1px solid rgba(167,139,250,0.06)",
                          }}>

                          {/* Icon */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: meal.hasPhoto ? "rgba(167,139,250,0.12)" : "rgba(167,139,250,0.07)" }}>
                            {meal.hasPhoto
                              ? <Camera size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                              : <span style={{ fontSize: 15 }}>{group.icon}</span>
                            }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate" style={{ color: "#2D3748" }}>
                              {meal.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px]" style={{ color: "#A0AEC0" }}>{meal.time}</span>
                              {meal.proteins > 0 && (
                                <>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA" }}>
                                    P {meal.proteins}g
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(123,92,196,0.08)", color: "#7B5CC4" }}>
                                    G {meal.carbs}g
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full hidden sm:inline-block"
                                    style={{ background: "rgba(212,168,67,0.1)", color: "#D4A843" }}>
                                    L {meal.fats}g
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Calories + delete */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>{meal.calories}</p>
                              <p className="text-[10px]" style={{ color: "#A0AEC0" }}>kcal</p>
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

      {/* ── Modals + Toast ──────────────────────────────────────── */}
      <AnimatePresence>
        {showBarcode && (
          <BarcodeScannerModal key="barcode" onClose={() => setShowBarcode(false)} onAdd={handleAddBarcode} />
        )}
        {showPhoto && (
          <PhotoAnalysisModal key="photo" onClose={() => setShowPhoto(false)} onAdd={handleAddPhoto} />
        )}
        {showManual && (
          <ManualModal key="manual" onClose={() => setShowManual(false)} onAdd={handleAddManual} />
        )}
        {toast && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 8px 32px rgba(167,139,250,0.2)",
              whiteSpace: "nowrap",
            }}>
            <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
