"use client";

/* ─────────────────────────────────────────────────────────────
   Graphiques de progression — extraits de progression/page.tsx
   pour être réutilisables (onglet Progression d'origine + nouvel
   accueil-dashboard). Composants purement présentationnels :
   ils reçoivent leurs données + handlers en props.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, X, Pencil, Trash2, Zap, Dumbbell } from "lucide-react";
import type { PerformanceType } from "@/components/PerformanceCard";

/* ─── Types & helpers partagés ──────────────────────────── */
export type WeightEntry = { date: string; weight: number; id?: string };

/* Carte pleine (aplat solide) — direction « clarté » : plus de verre translucide
   ni de flou (rendait le mode sombre boueux). Fond opaque + hairline discret. */
export const CHART_CARD = {
  background: "rgb(var(--surface-rgb))",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  boxShadow: "0 4px 22px rgba(var(--accent-rgb),0.10)",
};

/* ─── PRChart ────────────────────────────────────────────── */
export function PRChart({
  prs,
  onAdd,
  onDelete,
}: {
  prs: Array<{ id: string; exercise: string; value: number; unit: string; date: string }>;
  onAdd: (exercise: string, value: number, unit: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const exercises = [...new Set(prs.map(p => p.exercise))].sort();
  const [selected, setSelected] = useState(exercises[0] ?? "");
  const [adding, setAdding] = useState(false);
  const [newEx, setNewEx] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected && exercises.length > 0) setSelected(exercises[0]);
  }, [exercises, selected]);

  const pts = prs
    .filter(p => p.exercise === selected)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20);

  const W = 320, H = 110, PX = 36, PY = 14;
  const vals = pts.map(p => p.value);
  const minV = vals.length > 0 ? Math.min(...vals) - Math.max(1, (Math.max(...vals) - Math.min(...vals)) * 0.1) : 0;
  const maxV = vals.length > 0 ? Math.max(...vals) + Math.max(1, (Math.max(...vals) - Math.min(...vals)) * 0.1) : 10;
  const ty = (v: number) => PY + ((maxV - v) / (maxV - minV || 1)) * (H - 2 * PY);
  const tx = (i: number) => pts.length < 2 ? W / 2 : PX + (i / (pts.length - 1)) * (W - 2 * PX);

  let linePath = "", areaPath = "";
  if (pts.length >= 2) {
    const sp = pts.map((p, i) => ({ x: tx(i), y: ty(p.value) }));
    linePath = `M ${sp[0].x} ${sp[0].y}`;
    areaPath = `M ${sp[0].x} ${H} L ${sp[0].x} ${sp[0].y}`;
    for (let i = 1; i < sp.length; i++) {
      const cx = (sp[i-1].x + sp[i].x) / 2;
      linePath += ` C ${cx} ${sp[i-1].y}, ${cx} ${sp[i].y}, ${sp[i].x} ${sp[i].y}`;
      areaPath += ` C ${cx} ${sp[i-1].y}, ${cx} ${sp[i].y}, ${sp[i].x} ${sp[i].y}`;
    }
    areaPath += ` L ${sp.at(-1)!.x} ${H} Z`;
  } else if (pts.length === 1) {
    const x = W/2, y = ty(pts[0].value);
    linePath = `M ${x-1} ${y} L ${x+1} ${y}`;
  }

  const best = pts.length > 0 ? pts.reduce((a, b) => a.value >= b.value ? a : b) : null;
  const unit = prs.find(p => p.exercise === selected)?.unit ?? "kg";
  const delta = pts.length >= 2 ? pts.at(-1)!.value - pts[0].value : null;
  const commonExercisesPR = ["Développé couché", "Squat", "Soulevé de terre", "Développé militaire", "Rowing barre", "Tractions", "Dips", "Curl biceps", "Extension triceps", "Leg press"];

  const handleAdd = async () => {
    const ex = newEx.trim() || selected;
    const v = parseFloat(newVal.replace(",", "."));
    if (!ex || isNaN(v) || v <= 0) return;
    setSaving(true);
    await onAdd(ex, v, newUnit);
    setSaving(false);
    setAdding(false);
    setNewEx(""); setNewVal("");
    if (!selected) setSelected(ex);
  };

  return (
    <div className="rounded-3xl overflow-hidden" style={CHART_CARD}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-0.5" style={{ color: "var(--text-3)" }}>RECORDS PERSO</p>
            <div className="flex items-end gap-1.5">
              <span className="text-[2.2rem] font-extralight leading-none" style={{ color: "var(--text-0)" }}>
                {best ? best.value : "—"}
              </span>
              {best && <span className="text-base font-light mb-0.5" style={{ color: "var(--text-3)" }}>{unit}</span>}
              {delta !== null && (
                <span className="text-xs font-semibold mb-1 ml-1 px-1.5 py-0.5 rounded-lg"
                  style={{
                    background: delta >= 0 ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                    color: delta >= 0 ? "#059669" : "#DC2626",
                  }}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {exercises.length > 0 && (
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold outline-none cursor-pointer max-w-[120px]"
                style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)", color: "var(--text-1)" }}
              >
                {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdding(a => !a)}
              className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
              <span className="text-sm font-bold leading-none" style={{ color: "#34D399" }}>+</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="px-5 pb-3 overflow-hidden">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input type="text" placeholder="Exercice (ex: Squat)" value={newEx}
                  onChange={e => setNewEx(e.target.value)} list="pr-exercise-list"
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }} />
                <datalist id="pr-exercise-list">
                  {commonExercisesPR.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>
              <div className="flex gap-2">
                <input type="number" step="0.5" placeholder="Valeur" value={newVal}
                  onChange={e => setNewVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }} />
                <select value={newUnit} onChange={e => setNewUnit(e.target.value)}
                  className="px-2.5 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}>
                  <option value="kg">kg</option>
                  <option value="reps">reps</option>
                  <option value="km">km</option>
                  <option value="s">sec</option>
                </select>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleAdd} disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#6EE7B7,#34D399)", color: "white" }}>
                  {saving ? "…" : "OK"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      {pts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 px-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(52,211,153,0.08)" }}>
            <TrendingUp size={18} strokeWidth={1.5} style={{ color: "#34D399" }} />
          </div>
          <p className="text-xs text-center font-light" style={{ color: "var(--text-3)" }}>
            {exercises.length === 0
              ? "Aucun record encore.\nClique sur + pour ajouter ton premier PR !"
              : "Clique sur + pour ajouter\nun record pour cet exercice."}
          </p>
        </div>
      ) : (
        <div className="px-2 pb-2">
          <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="prAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#34D399" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
              </linearGradient>
              <filter id="prGlow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {[0.2, 0.5, 0.8].map((p, i) => {
              const y = PY + p * (H - 2 * PY);
              const v = minV + (1 - p) * (maxV - minV);
              return (
                <g key={i}>
                  <line x1={PX} y1={y} x2={W - PX/2} y2={y} stroke="rgba(52,211,153,0.08)" strokeWidth="1" strokeDasharray="3,5" />
                  <text x={PX - 6} y={y + 3.5} textAnchor="end" fontSize="8" fill="rgba(var(--text-3-rgb),0.9)" fontWeight="500">{v.toFixed(0)}</text>
                </g>
              );
            })}
            {areaPath && <path d={areaPath} fill="url(#prAreaGrad)" />}
            {linePath && pts.length >= 2 && (
              <path d={linePath} fill="none" stroke="#34D399" strokeWidth="2.8"
                strokeLinecap="round" strokeLinejoin="round" filter="url(#prGlow)" />
            )}
            {pts.map((p, i) => {
              const isLast = i === pts.length - 1;
              const cx = tx(i), cy = ty(p.value);
              return isLast ? (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={11} fill="#34D399" fillOpacity="0.1" />
                  <circle cx={cx} cy={cy} r={6} fill="#34D399"
                    style={{ filter: "drop-shadow(0 0 6px rgba(52,211,153,0.7))" }} />
                  <circle cx={cx} cy={cy} r={2.5} fill="white" />
                </g>
              ) : (
                <circle key={i} cx={cx} cy={cy} r={3} fill="white" stroke="#34D399" strokeWidth="1.8" />
              );
            })}
            {pts.length >= 2 && [0, pts.length - 1].map(i => {
              const d = new Date(pts[i].date + "T00:00:00");
              const lbl = `${d.getDate()}/${d.getMonth() + 1}`;
              return (
                <text key={i} x={i === 0 ? PX : W - PX/2} y={H + 13} textAnchor={i === 0 ? "start" : "end"}
                  fontSize="8" fill="rgba(var(--text-3-rgb),0.9)" fontWeight="500">{lbl}</text>
              );
            })}
          </svg>
        </div>
      )}

      {/* Last 3 entries */}
      {pts.length > 0 && (
        <div className="px-4 pb-4">
          <div style={{ height: 1, background: "rgba(52,211,153,0.08)", marginBottom: 10 }} />
          <div className="flex flex-col gap-1">
            {[...pts].reverse().slice(0, 3).map(entry => {
              const d = new Date(entry.date + "T00:00:00");
              const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
              return (
                <div key={entry.id} className="flex items-center gap-2 px-2 py-1 rounded-xl"
                  style={{ background: "transparent" }}>
                  <span className="text-[11px] font-light flex-shrink-0 w-16" style={{ color: "var(--text-3)" }}>{label}</span>
                  <span className="flex-1 text-xs font-semibold" style={{ color: "var(--text-1)" }}>{entry.value} {unit}</span>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => onDelete(entry.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(252,129,129,0.1)" }}>
                    <Trash2 size={10} strokeWidth={2} style={{ color: "#FC8181" }} />
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── VolumeChart ────────────────────────────────────────── */
export function VolumeChart({ data }: { data: Array<{ label: string; cals: number; sessions: number }> }) {
  const maxCals = Math.max(...data.map(d => d.cals), 1);
  const W = 320, H = 100, PX = 10, PY = 10;
  const slotW = (W - 2 * PX) / Math.max(data.length, 1);
  const barW = Math.max(6, slotW * 0.55);
  const totalSessions = data.reduce((s, d) => s + d.sessions, 0);
  const totalCals = data.reduce((s, d) => s + d.cals, 0);
  const currentWeekSessions = data.at(-1)?.sessions ?? 0;

  return (
    <div className="rounded-3xl overflow-hidden" style={CHART_CARD}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-0.5" style={{ color: "var(--text-3)" }}>VOLUME · 8 SEMAINES</p>
            <div className="flex items-end gap-2">
              <span className="text-[2.2rem] font-extralight leading-none" style={{ color: "var(--text-0)" }}>{totalSessions}</span>
              <span className="text-base font-light mb-0.5" style={{ color: "var(--text-3)" }}>séance{totalSessions > 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="text-right mt-1">
            {totalCals > 0 && (
              <p className="text-xs font-semibold" style={{ color: "var(--gold)" }}>{totalCals.toLocaleString("fr-FR")} kcal</p>
            )}
            <p className="text-[10px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>
              Cette sem. : {currentWeekSessions} séance{currentWeekSessions > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {data.every(d => d.cals === 0) ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.08)" }}>
            <Zap size={18} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-xs text-center font-light" style={{ color: "var(--text-3)" }}>Lance des séances pour voir<br/>ton volume d&apos;entraînement !</p>
        </div>
      ) : (
        <div className="px-3 pb-4">
          <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ overflow: "visible" }}>
            <defs>
              {data.map((_, i) => (
                <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6FB0FF" stopOpacity={i === data.length - 1 ? "1" : "0.55"} />
                  <stop offset="100%" stopColor="#2E6BE0" stopOpacity={i === data.length - 1 ? "0.95" : "0.4"} />
                </linearGradient>
              ))}
            </defs>
            {/* Grid lines */}
            {[0.33, 0.66, 1].map((p, i) => (
              <line key={i} x1={PX} y1={H - PY - p * (H - 2*PY)} x2={W - PX} y2={H - PY - p * (H - 2*PY)}
                stroke="rgba(var(--accent-rgb),0.06)" strokeWidth="1" strokeDasharray="3,5" />
            ))}
            {data.map((d, i) => {
              const barH = d.cals > 0 ? Math.max(5, (d.cals / maxCals) * (H - PY * 2)) : 0;
              const x = PX + i * slotW + (slotW - barW) / 2;
              const y = H - PY - barH;
              const isLast = i === data.length - 1;
              return (
                <g key={i}>
                  {/* Background track */}
                  <rect x={x} y={PY} width={barW} height={H - 2*PY} rx="4" fill="rgba(var(--accent-rgb),0.05)" />
                  {/* Actual bar */}
                  {d.cals > 0 && (
                    <rect x={x} y={y} width={barW} height={barH} rx="4"
                      fill={`url(#barGrad${i})`}
                      style={isLast ? { filter: "drop-shadow(0 3px 8px rgba(var(--accent-rgb),0.45))" } : {}} />
                  )}
                  {/* Session count dot */}
                  {d.sessions > 0 && (
                    <g>
                      <circle cx={x + barW/2} cy={y - 6} r={5} fill={isLast ? "var(--accent)" : "#C4B5FD"} fillOpacity={isLast ? 1 : 0.7} />
                      <text x={x + barW/2} y={y - 2.5} textAnchor="middle" fontSize="5.5" fill="white" fontWeight="700">{d.sessions}</text>
                    </g>
                  )}
                  <text x={x + barW/2} y={H + 14} textAnchor="middle"
                    fontSize="7.5" fill={isLast ? "var(--accent)" : "rgba(var(--text-3-rgb),0.8)"} fontWeight={isLast ? "700" : "500"}>
                    {d.label.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

/* ─── WeightChart ────────────────────────────────────────── */
export function WeightChart({
  data, range, onRangeChange, onAdd, onDelete, onUpdate, goalType,
}: {
  data: WeightEntry[];
  range: "week" | "month";
  onRangeChange: (r: "week" | "month") => void;
  onAdd: (kg: number) => void;
  onDelete: (date: string) => void;
  onUpdate: (date: string, kg: number) => void;
  goalType?: "masse" | "poids" | null;
}) {
  const [inputVal, setInputVal]   = useState("");
  const [adding, setAdding]       = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editVal, setEditVal]     = useState("");

  const pts     = range === "week" ? data.slice(-7) : data.slice(-30);
  const current = pts.at(-1)?.weight ?? null;
  const lineColor = "#2BD4A0";   // Poids = teal (palette multicolore du dashboard)
  const gradColor = "#2BD4A0";

  const W = 320, H = 110, PX = 32, PY = 14;
  const ws   = pts.map(p => p.weight);
  const minW = ws.length > 0 ? Math.min(...ws) - 2 : 60;
  const maxW = ws.length > 0 ? Math.max(...ws) + 2 : 90;

  // Espacement proportionnel au temps réel
  const timestamps = pts.map(p => new Date(p.date + "T00:00:00").getTime());
  const minT = timestamps[0] ?? 0;
  const maxT = timestamps[timestamps.length - 1] ?? 1;
  const tx = (i: number) => {
    if (pts.length < 2) return W / 2;
    const range = maxT - minT || 1;
    return PX + ((timestamps[i] - minT) / range) * (W - 2 * PX);
  };
  const ty   = (w: number) => PY + ((maxW - w) / (maxW - minW)) * (H - 2*PY);

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

  const goalLabel = goalType === "masse" ? "Prise de masse" : goalType === "poids" ? "Perte de poids" : null;

  return (
    <div className="rounded-3xl overflow-hidden" style={CHART_CARD}>
      {/* Header band */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--text-3)" }}>POIDS</p>
              {goalLabel && (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)" }}>
                  {goalLabel}
                </span>
              )}
            </div>
            <button onClick={() => setAdding(true)} className="flex items-end gap-2 cursor-pointer"
              style={{ background: "none", border: "none", padding: 0 }} aria-label="Ajouter mon poids">
              <span className="text-[2.2rem] font-extralight leading-none" style={{ color: current !== null ? "var(--text-0)" : "var(--accent)" }}>
                {current !== null ? current.toFixed(1) : "+"}
              </span>
              <span className="text-base font-light mb-0.5" style={{ color: "var(--text-3)" }}>
                {current !== null ? "kg" : "kg ?"}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
              {(["week", "month"] as const).map(r => (
                <button key={r} onClick={() => onRangeChange(r)}
                  className="px-2.5 py-1 text-[10px] font-semibold cursor-pointer"
                  style={{
                    background: range === r ? "linear-gradient(135deg,#2BD4A0,#12A87E)" : "transparent",
                    color: range === r ? "#06231B" : "var(--text-3)",
                  }}>
                  {r === "week" ? "7j" : "30j"}
                </button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdding(a => !a)}
              className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
              <span className="text-sm font-bold leading-none" style={{ color: "var(--accent)" }}>+</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Input */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="px-5 pb-3 overflow-hidden">
            <div className="flex gap-2">
              <input type="number" step="0.1" placeholder="Ex : 72.5 kg"
                value={inputVal} onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }} />
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleAdd}
                className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#C4A8FF,var(--accent))", color: "white" }}>
                OK
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      {pts.length === 0 ? (
        <button onClick={() => setAdding(true)}
          className="w-full flex flex-col items-center justify-center py-9 gap-3 cursor-pointer"
          style={{ background: "none", border: "none" }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.1)" }}>
            <TrendingUp size={18} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-xs text-center font-light" style={{ color: "var(--text-2)" }}>
            Aucun poids enregistré pour le moment
          </p>
          <span className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#C4A8FF,var(--accent))", color: "#fff", boxShadow: "0 4px 14px rgba(var(--accent-rgb),0.3)" }}>
            + Ajouter mon poids
          </span>
        </button>
      ) : (
        <div className="px-2 pb-2">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="wAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={gradColor} stopOpacity="0.2" />
                <stop offset="80%"  stopColor={gradColor} stopOpacity="0.04" />
                <stop offset="100%" stopColor={gradColor} stopOpacity="0" />
              </linearGradient>
              <filter id="wGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {[0.25, 0.5, 0.75].map((p, i) => {
              const y = PY + p * (H - 2 * PY);
              const w = minW + (1 - p) * (maxW - minW);
              return (
                <g key={i}>
                  <line x1={PX} y1={y} x2={W - PX/2} y2={y}
                    stroke="rgba(var(--accent-rgb),0.07)" strokeWidth="1" strokeDasharray="3,4" />
                  <text x={PX - 4} y={y + 3.5} textAnchor="end"
                    fontSize="7.5" fill="rgba(var(--text-3-rgb),0.8)" fontWeight="500">
                    {w.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {areaPath && <path d={areaPath} fill="url(#wAreaGrad)" />}
            {linePath && (
              <path d={linePath} fill="none" stroke={lineColor}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                filter="url(#wGlow)" />
            )}

            {pts.map((p, i) => {
              const isLast = i === pts.length - 1;
              const cx = tx(i), cy = ty(p.weight);
              return isLast ? (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={9} fill={lineColor} fillOpacity="0.12" />
                  <circle cx={cx} cy={cy} r={5} fill={lineColor}
                    style={{ filter: `drop-shadow(0 0 4px ${lineColor})` }} />
                  <circle cx={cx} cy={cy} r={2} fill="white" />
                </g>
              ) : (
                <circle key={i} cx={cx} cy={cy}
                  r={2.5} fill="white" stroke={lineColor} strokeWidth="1.5" />
              );
            })}

            {/* Labels date : premier + dernier uniquement, bien ancrés */}
            {pts.length >= 1 && (() => {
              const indices = pts.length === 1 ? [0] : [0, pts.length - 1];
              return indices.map(i => {
                const d = new Date(pts[i].date + "T00:00:00");
                const lbl = `${d.getDate()}/${d.getMonth() + 1}`;
                const anchor = i === 0 ? "start" : "end";
                const x = i === 0 ? PX : W - PX / 2;
                return (
                  <text key={i} x={x} y={H + 13} textAnchor={anchor}
                    fontSize="8" fill="rgba(var(--text-3-rgb),0.9)" fontWeight="500">
                    {lbl}
                  </text>
                );
              });
            })()}
          </svg>
        </div>
      )}

      {/* ── Liste des entrées avec édition / suppression ── */}
      {pts.length > 0 && (
        <div className="px-4 pb-4">
          <div style={{ height: 1, background: "rgba(var(--accent-rgb),0.07)", marginBottom: 10 }} />
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {[...pts].reverse().map(entry => {
              const d = new Date(entry.date + "T00:00:00");
              const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
              const isEditing = editingDate === entry.date;
              return (
                <motion.div
                  key={entry.date}
                  layout
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: isEditing ? "rgba(var(--accent-rgb),0.08)" : "transparent" }}
                >
                  <span className="text-[11px] font-light flex-shrink-0 w-16" style={{ color: "var(--text-3)" }}>{label}</span>
                  {isEditing ? (
                    <>
                      <input
                        type="number" step="0.1" autoFocus
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const kg = parseFloat(editVal.replace(",", "."));
                            if (!isNaN(kg) && kg >= 20 && kg <= 300) { onUpdate(entry.date, kg); setEditingDate(null); }
                          }
                          if (e.key === "Escape") setEditingDate(null);
                        }}
                        className="flex-1 px-2 py-0.5 rounded-lg text-xs outline-none"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
                      />
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const kg = parseFloat(editVal.replace(",", "."));
                          if (!isNaN(kg) && kg >= 20 && kg <= 300) { onUpdate(entry.date, kg); setEditingDate(null); }
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer"
                        style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--accent))", color: "white" }}>
                        OK
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditingDate(null)}
                        className="cursor-pointer" style={{ color: "var(--text-3)" }}>
                        <X size={12} />
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs font-semibold" style={{ color: "var(--text-1)" }}>{entry.weight.toFixed(1)} kg</span>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => { setEditingDate(entry.date); setEditVal(String(entry.weight)); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(var(--accent-rgb),0.1)" }}>
                        <Pencil size={10} strokeWidth={2} style={{ color: "var(--accent)" }} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(entry.date)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(252,129,129,0.1)" }}>
                        <Trash2 size={10} strokeWidth={2} style={{ color: "#FC8181" }} />
                      </motion.button>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── WorkoutWeekCard ────────────────────────────────────── */
/* Prop minimale (structurellement compatible avec TimelineEvent) pour
   rester découplé du type Timeline de la page Progression. */
type WeekCardSession = {
  type: PerformanceType;
  date: string;
  performance: { date?: string; metrics?: Array<{ label: string; value: string; unit?: string }> };
};

export function WorkoutWeekCard({ sessions }: { sessions: WeekCardSession[] }) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 6);

  const weekSessions = sessions.filter(s => {
    if (s.type !== "workout") return false;
    const d = new Date(s.performance.date ?? "");
    return d >= startOfWeek;
  });

  // Calcul stats depuis performance_data
  const totalDuration = weekSessions.reduce((sum, s) => {
    const dur = s.performance.metrics?.find(m => m.label === "Durée");
    return sum + (dur ? parseInt(dur.value) || 0 : 0);
  }, 0);
  const totalCals = weekSessions.reduce((sum, s) => {
    const cal = s.performance.metrics?.find(m => m.label === "Calories");
    return sum + (cal ? parseInt(cal.value) || 0 : 0);
  }, 0);

  // Jours de la semaine avec dot si séance
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  const dayDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const hasSession = weekSessions.some(s => (s.performance.date ?? "").startsWith(dateStr) || s.date === dateStr);
    const isToday = i === 6;
    return { label: days[d.getDay() === 0 ? 6 : d.getDay() - 1], hasSession, isToday };
  });

  return (
    <div className="rounded-3xl overflow-hidden" style={CHART_CARD}>
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: "var(--text-3)" }}>SÉANCES · 7 JOURS</p>

        {weekSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Dumbbell size={24} strokeWidth={1.4} style={{ color: "var(--violet-mid)" }} />
            <p className="text-xs font-light text-center" style={{ color: "var(--text-3)" }}>Aucune séance cette semaine<br/>Lance-toi !</p>
          </div>
        ) : (
          <>
            {/* Gros chiffre */}
            <div className="flex items-end gap-2 mb-4">
              <span className="text-[2.2rem] font-extralight leading-none" style={{ color: "var(--text-0)" }}>{weekSessions.length}</span>
              <span className="text-base font-light mb-0.5" style={{ color: "var(--text-3)" }}>séance{weekSessions.length > 1 ? "s" : ""}</span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-5">
              <div>
                <p className="text-[9px] uppercase font-semibold tracking-wide mb-0.5" style={{ color: "var(--text-3)" }}>Durée totale</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
                  {totalDuration >= 60 ? `${Math.floor(totalDuration/60)}h${totalDuration%60 > 0 ? String(totalDuration%60).padStart(2,"0") : ""}` : `${totalDuration} min`}
                </p>
              </div>
              {totalCals > 0 && (
                <>
                  <div style={{ width: 1, height: 28, background: "rgba(var(--accent-rgb),0.15)" }} />
                  <div>
                    <p className="text-[9px] uppercase font-semibold tracking-wide mb-0.5" style={{ color: "var(--text-3)" }}>Calories</p>
                    <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{totalCals.toLocaleString("fr-FR")} kcal</p>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Dots jours */}
        <div style={{ height: 1, background: "rgba(var(--accent-rgb),0.07)", marginBottom: 16 }} />
        <div className="flex justify-between">
          {dayDots.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: d.hasSession
                    ? "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)"
                    : d.isToday
                    ? "rgba(var(--accent-rgb),0.12)"
                    : "rgba(0,0,0,0.04)",
                  border: d.isToday && !d.hasSession ? "1.5px solid rgba(var(--accent-rgb),0.35)" : "none",
                  boxShadow: d.hasSession ? "0 2px 8px rgba(var(--accent-rgb),0.35)" : "none",
                }}
              >
                {d.hasSession && <Dumbbell size={11} strokeWidth={2} style={{ color: "white" }} />}
              </motion.div>
              <span className="text-[9px] font-medium" style={{ color: d.isToday ? "var(--accent)" : "var(--text-3)" }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
