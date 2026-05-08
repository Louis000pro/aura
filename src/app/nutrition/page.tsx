"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Plus, X, Check, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ────────────────────────────────────────────────── */
type MacroItem = { consumed: number; goal: number };
type NutritionData = {
  calories: { consumed: number; goal: number; burned: number };
  proteines: MacroItem;
  glucides: MacroItem;
  lipides: MacroItem;
};

type MealEntry = { id: number; name: string; calories: number; time: string };

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

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

/* ─── Anneau calories ──────────────────────────────────────── */
function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const R = 78;
  const SW = 14;
  const C = 2 * Math.PI * R;
  const pct = Math.min(consumed / goal, 1);

  return (
    <div className="relative flex-shrink-0" style={{ width: 196, height: 196 }}>
      <svg width="196" height="196" viewBox="0 0 196 196" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="caloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#A78BFA" />
            <stop offset="55%"  stopColor="#C49BE8" />
            <stop offset="100%" stopColor="#D4A843" />
          </linearGradient>
        </defs>
        <circle cx="98" cy="98" r={R} fill="none"
          stroke="rgba(167,139,250,0.10)" strokeWidth={SW} />
        <motion.circle cx="98" cy="98" r={R} fill="none"
          stroke="url(#caloGrad)" strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1.3, ease: "easeOut", delay: 0.2 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>CONSOMMÉ</p>
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[2.2rem] font-light leading-none" style={{ color: "#2D3748" }}>
          {consumed.toLocaleString("fr-FR")}
        </motion.p>
        <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>
          kcal sur {goal.toLocaleString("fr-FR")}
        </p>
      </div>
    </div>
  );
}

/* ─── Barre macro ──────────────────────────────────────────── */
function MacroBar({ label, consumed, goal, color }: { label: string; consumed: number; goal: number; color: string }) {
  const pct = Math.min(Math.round((consumed / goal) * 100), 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-sm font-medium" style={{ color: "#4A5568" }}>{label}</span>
          <span className="text-xs" style={{ color: "#A0AEC0" }}>{pct}%</span>
        </div>
        <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>
          {consumed} <span className="font-normal text-xs" style={{ color: "#A0AEC0" }}>/ {goal}g</span>
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

/* ─── Hydratation ──────────────────────────────────────────── */
function HydrationTracker({ cups, goal = 8, onAdd, onRemove }: {
  cups: number; goal?: number; onAdd: () => void; onRemove: () => void;
}) {
  const liters = (cups * 0.25).toFixed(2);
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
              className="rounded cursor-pointer"
              style={{
                width: 18, height: 22, borderRadius: 4,
                background: i < cups
                  ? "linear-gradient(180deg,rgba(167,139,250,0.65) 0%,rgba(167,139,250,0.35) 100%)"
                  : "rgba(167,139,250,0.10)",
                border: "1px solid rgba(167,139,250,0.18)",
              }} />
          ))}
        </div>
        <span className="text-xs font-semibold ml-0.5" style={{ color: "#718096" }}>{liters} L</span>
      </div>
    </div>
  );
}

/* ─── Modal ajout repas ────────────────────────────────────── */
function AddMealModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (name: string, kcal: number) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const submit = () => {
    if (!name.trim() || !kcal) return;
    onAdd(name.trim(), parseInt(kcal));
  };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(240,235,255,0.4)", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(167,139,250,0.15)",
        }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Nutrition</p>
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Ajouter un repas</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>Aliment / Plat</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Poulet, riz, salade…" autoFocus
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>Calories (kcal)</label>
            <input type="number" value={kcal} onChange={e => setKcal(e.target.value)}
              placeholder="Ex : 420"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={submit} disabled={!name.trim() || !kcal}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{
            background: name.trim() && kcal
              ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)"
              : "rgba(220,220,220,0.45)",
            color: name.trim() && kcal ? "#2D3748" : "#A0AEC0",
            boxShadow: name.trim() && kcal ? "inset 0 1px 0 rgba(255,255,255,0.9)" : "none",
          }}>
          Enregistrer
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Page principale ──────────────────────────────────────── */
export default function NutritionPage() {
  const { user } = useAuth();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [cups, setCups] = useState(5);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [meals, setMeals] = useState<MealEntry[]>([
    { id: 1, name: "Petit-déjeuner protéiné", calories: 487, time: "07:30" },
    { id: 2, name: "Déjeuner — bowl poulet riz", calories: 612, time: "12:45" },
    { id: 3, name: "Collation — yaourt + fruits", calories: 225, time: "16:00" },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  const data: NutritionData = {
    calories: {
      consumed: meals.reduce((s, m) => s + m.calories, 0),
      goal: 2200,
      burned: 412,
    },
    proteines: { consumed: 66,  goal: 140 },
    glucides:  { consumed: 141, goal: 240 },
    lipides:   { consumed: 46,  goal: 70  },
  };
  const remaining = Math.max(data.calories.goal - data.calories.consumed, 0);

  useEffect(() => { setWeekDays(getMondayWeek(today)); }, []); // eslint-disable-line

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const handleAddMeal = (name: string, kcal: number) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMeals(prev => [...prev, { id: Date.now(), name, calories: kcal, time }]);
    setShowAddMeal(false);
    showToast(`${name} ajouté ✓`);
  };

  return (
    <div className="min-h-screen px-5 pt-10 pb-36 md:pl-28 md:pt-10 md:pb-10 max-w-lg mx-auto md:mx-0 md:max-w-xl">

      {/* ── Header ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6">
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
        <motion.div
          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)" }}>
          <span style={{ color: "#D4A843", fontSize: 11 }}>★</span>
          <span className="text-xs font-semibold" style={{ color: "#D4A843" }}>14 j</span>
        </motion.div>
      </motion.div>

      {/* ── Sélecteur semaine ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex justify-between mb-5">
        {weekDays.map((day, i) => {
          const isSel  = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          const isPast  = day < today && !isToday;
          return (
            <motion.button key={i} whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center gap-1 w-9 py-2 rounded-2xl cursor-pointer"
              style={{
                background: isSel ? "linear-gradient(135deg,#A78BFA 0%,#9270E0 100%)" : "transparent",
                boxShadow: isSel ? "0 4px 14px rgba(167,139,250,0.38)" : "none",
              }}>
              <span className="text-[9px] font-semibold" style={{ color: isSel ? "rgba(255,255,255,0.65)" : "#A0AEC0" }}>
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

      {/* ── Anneau calories ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}
        className="rounded-3xl p-6 mb-4"
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 4px 32px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}>
        <div className="flex items-center gap-5">
          <CalorieRing consumed={data.calories.consumed} goal={data.calories.goal} />
          <div className="flex flex-col gap-3.5 flex-1 min-w-0">
            <div>
              <p className="text-[9px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#A0AEC0" }}>RESTANT</p>
              <p className="text-2xl font-light" style={{ color: "#A78BFA" }}>
                {remaining.toLocaleString("fr-FR")} <span className="text-sm">kcal</span>
              </p>
            </div>
            <div style={{ height: 1, background: "rgba(167,139,250,0.1)" }} />
            <div>
              <p className="text-[9px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#A0AEC0" }}>BRÛLÉ</p>
              <p className="text-2xl font-light" style={{ color: "#D4A843" }}>
                {data.calories.burned} <span className="text-sm">kcal</span>
              </p>
            </div>
            <div style={{ height: 1, background: "rgba(212,168,67,0.1)" }} />
            <div>
              <p className="text-[9px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#A0AEC0" }}>OBJECTIF</p>
              <p className="text-2xl font-light" style={{ color: "#2D3748" }}>
                {data.calories.goal.toLocaleString("fr-FR")} <span className="text-sm">kcal</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Macros + Hydratation ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-3xl p-5 mb-4"
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 4px 32px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>MACROS DU JOUR</p>
          <button className="text-xs font-semibold cursor-pointer" style={{ color: "#A78BFA" }}>Ajuster</button>
        </div>
        <div className="flex flex-col gap-4">
          <MacroBar label="Protéines" consumed={data.proteines.consumed} goal={data.proteines.goal} color="#A78BFA" />
          <MacroBar label="Glucides"  consumed={data.glucides.consumed}  goal={data.glucides.goal}  color="#7B5CC4" />
          <MacroBar label="Lipides"   consumed={data.lipides.consumed}   goal={data.lipides.goal}   color="#D4A843" />
          <div style={{ height: 1, background: "rgba(167,139,250,0.08)" }} />
          <HydrationTracker cups={cups} goal={8}
            onAdd={() => setCups(c => Math.min(c + 1, 8))}
            onRemove={() => setCups(c => Math.max(c - 1, 0))} />
        </div>
      </motion.div>

      {/* ── Repas du jour ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="rounded-3xl p-5"
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 4px 32px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>REPAS DU JOUR</p>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            onClick={() => setShowAddMeal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
            <Plus size={11} strokeWidth={2.5} />
            Ajouter
          </motion.button>
        </div>
        <AnimatePresence initial={false}>
          {meals.map((meal, i) => (
            <motion.div key={meal.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12, height: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-2.5"
              style={{ borderBottom: i < meals.length - 1 ? "1px solid rgba(167,139,250,0.07)" : "none" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: i % 2 === 0 ? "rgba(167,139,250,0.1)" : "rgba(212,168,67,0.1)" }}>
                  <span style={{ fontSize: 14 }}>
                    {["☀️","🍽️","🍎","🌙"][i % 4]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight" style={{ color: "#2D3748" }}>{meal.name}</p>
                  <p className="text-[11px]" style={{ color: "#A0AEC0" }}>{meal.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{meal.calories}</span>
                <span className="text-xs" style={{ color: "#A0AEC0" }}>kcal</span>
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={() => { setMeals(prev => prev.filter(m => m.id !== meal.id)); showToast("Repas supprimé"); }}
                  className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ml-1"
                  style={{ background: "rgba(252,129,129,0.12)" }}>
                  <X size={9} strokeWidth={2} style={{ color: "#FC8181" }} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {meals.length === 0 && (
          <p className="text-sm text-center py-6 font-light" style={{ color: "#A0AEC0" }}>
            Aucun repas enregistré aujourd&apos;hui
          </p>
        )}
      </motion.div>

      {/* ── Modals + Toast ───────────────────────────────── */}
      <AnimatePresence>
        {showAddMeal && (
          <AddMealModal key="add-meal" onClose={() => setShowAddMeal(false)} onAdd={handleAddMeal} />
        )}
        {toast && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.9)", backdropFilter: "blur(24px)",
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
