"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Plus, X, Check, Camera, Upload, Loader2, Edit2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ─────────────────────────────────────────────────────────── */
type MealType = "petit-dejeuner" | "dejeuner" | "gouter" | "diner";

type MealEntry = {
  id: number;
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

/* ─── HydrationTracker ──────────────────────────────────────────────── */
function HydrationTracker({ cups, goal = 8, onAdd, onRemove }: {
  cups: number; goal?: number; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Droplets size={15} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
        <span className="text-sm font-medium" style={{ color: "#4A5568" }}>Hydratation</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          {Array.from({ length: goal }).map((_, i) => (
            <motion.button key={i}
              onClick={i < cups ? onRemove : onAdd}
              whileTap={{ scale: 0.88 }}
              style={{
                width: 18, height: 22, borderRadius: 4,
                background: i < cups
                  ? "linear-gradient(180deg,rgba(167,139,250,0.65) 0%,rgba(167,139,250,0.35) 100%)"
                  : "rgba(167,139,250,0.10)",
                border: "1px solid rgba(167,139,250,0.18)",
                cursor: "pointer",
              }} />
          ))}
        </div>
        <span className="text-xs font-semibold ml-0.5" style={{ color: "#718096" }}>
          {cups} / {goal} verres
        </span>
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

  const reset = () => { setPhase("select"); setPhotoUrl(null); setResult(null); setError(null); };

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
          <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Ajouter manuellement</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="flex flex-col gap-2.5 mb-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1 block" style={{ color: "#A0AEC0" }}>
              Aliment / Plat
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Poulet riz, yaourt…" autoFocus
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Calories (kcal)", val: kcal, set: setKcal, ph: "420" },
              { label: "Protéines (g)",   val: proteins, set: setProteins, ph: "30" },
              { label: "Glucides (g)",    val: carbs, set: setCarbs, ph: "50" },
              { label: "Lipides (g)",     val: fats, set: setFats, ph: "15" },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="text-[10px] font-semibold tracking-widest uppercase mb-1 block"
                  style={{ color: "#A0AEC0" }}>{label}</label>
                <input type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
              </div>
            ))}
          </div>

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

/* ─── Page principale ────────────────────────────────────────────────── */
export default function NutritionPage() {
  useAuth();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [cups, setCups] = useState(5);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [meals, setMeals] = useState<MealEntry[]>([
    { id: 1, name: "Petit-déjeuner protéiné", calories: 487, proteins: 32, carbs: 45, fats: 12, time: "07:30", mealType: "petit-dejeuner" },
    { id: 2, name: "Bowl poulet riz", calories: 612, proteins: 42, carbs: 68, fats: 18, time: "12:45", mealType: "dejeuner" },
    { id: 3, name: "Yaourt + fruits rouges", calories: 225, proteins: 8, carbs: 35, fats: 6, time: "16:00", mealType: "gouter" },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  /* Derived stats */
  const totalCals  = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt  = meals.reduce((s, m) => s + m.proteins, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFats  = meals.reduce((s, m) => s + m.fats, 0);
  const remaining  = Math.max(GOALS.calories - totalCals, 0);

  useEffect(() => { setWeekDays(getMondayWeek(today)); }, []); // eslint-disable-line

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleAddPhoto = (meal: Omit<MealEntry, "id">) => {
    setMeals(prev => [...prev, { id: Date.now(), ...meal }]);
    setShowPhoto(false);
    showToast(`${meal.name} ajouté — ${meal.calories} kcal ✓`);
  };

  const handleAddManual = (meal: Omit<MealEntry, "id">) => {
    setMeals(prev => [...prev, { id: Date.now(), ...meal }]);
    setShowManual(false);
    showToast(`${meal.name} ajouté ✓`);
  };

  const deleteMeal = (id: number) => {
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
              <HydrationTracker cups={cups} goal={8}
                onAdd={() => setCups(c => Math.min(c + 1, 8))}
                onRemove={() => setCups(c => Math.max(c - 1, 0))} />
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
