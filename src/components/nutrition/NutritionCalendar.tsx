"use client";

/* Le mois des repas. Sorti de NutritionTab.tsx le 2026-10-22 : il s'ouvre
   désormais depuis le détail de la journée. */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HistoriqueMasque from "@/components/historique/HistoriqueMasque";
import { debutHistorique, historiqueComplet } from "@/lib/historique";
import { localDateStr } from "@/lib/dates";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";

type DaySummary = {
  date: string;
  total_calories: number;
  total_proteins: number;
  total_carbs: number;
  total_fats: number;
  meal_count: number;
  water_ml: number;
};

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

export default function NutritionCalendar({ onDayClick }: { onDayClick: (date: Date) => void }) {
  const { user } = useAuth();
  /* Compte gratuit : on MONTRE les 7 derniers jours, la base garde tout
     (lib/historique). Les séries du calendrier restent calculées sur tout
     l'historique : les conditions promettent qu'elles en tiennent compte. */
  const debutHisto = debutHistorique(historiqueComplet(user));
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

  /* Ce qui se montre : les jours de la fenêtre, et seulement eux. */
  const visibleData = useMemo(
    () => (debutHisto ? new Map([...allData.entries()].filter(([k]) => k >= debutHisto)) : allData),
    [allData, debutHisto],
  );
  const aDesJoursMasques = !!debutHisto
    && [...allData.entries()].some(([k, v]) => k < debutHisto && v.meal_count > 0);

  /* Monthly stats — mémorisé */
  const { trackedThisMonth, daysInMonth, avgCal } = useMemo(() => {
    const mk = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,"0")}`;
    const monthEntries = [...visibleData.entries()].filter(([k]) => k.startsWith(mk)).map(([,v]) => v);
    const tracked = monthEntries.filter(d => d.meal_count > 0);
    return {
      trackedThisMonth: tracked.length,
      daysInMonth: new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 0).getDate(),
      avgCal: tracked.length > 0 ? Math.round(tracked.reduce((s,d) => s + d.total_calories,0) / tracked.length) : 0,
    };
  }, [visibleData, calMonth]);

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
  const allTracked = useMemo(() => [...visibleData.values()].filter(d => d.meal_count > 0), [visibleData]);
  const globalAvgCal = useMemo(() =>
    allTracked.length > 0
      ? Math.round(allTracked.reduce((s, d) => s + d.total_calories, 0) / allTracked.length)
      : 0,
  [allTracked]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="max-w-5xl">

      {aDesJoursMasques && <HistoriqueMasque className="mb-4" />}

      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => canPrev && setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1))}
          disabled={!canPrev}
          className="w-10 h-10 flex items-center justify-center cursor-pointer"
          style={{ borderRadius: "var(--r-controle)", background: canPrev ? "rgba(var(--tint-violet-rgb),0.85)" : "transparent", opacity: canPrev ? 1 : 0.3,
            border: "1px solid rgba(var(--violet-mid-rgb),0.3)", boxShadow: canPrev ? "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none" }}
        >
          <ChevronLeft size={16} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
        </motion.button>

        <div className="text-center">
          <p className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>
            {MONTHS_FR[calMonth.getMonth()]} {calMonth.getFullYear()}
          </p>
          {regDate && (
            <p className="text-[11px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>
              Suivi depuis le {regDate.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(calMonth.getMonth() !== today.getMonth() || calMonth.getFullYear() !== today.getFullYear()) && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl cursor-pointer"
              style={{ background: "rgba(var(--accent-rgb),0.15)", color: "var(--exp-encre)" }}
            >
              Auj.
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => canNext && setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1))}
            disabled={!canNext}
            className="w-10 h-10 flex items-center justify-center cursor-pointer"
            style={{ borderRadius: "var(--r-controle)", background: canNext ? "rgba(var(--tint-violet-rgb),0.85)" : "transparent", opacity: canNext ? 1 : 0.3,
              border: "1px solid rgba(var(--violet-mid-rgb),0.3)", boxShadow: canNext ? "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" : "none" }}
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
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: "var(--text-3)" }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex flex-col gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => {
                  const ds = localDateStr(day);
                  /* Un jour masqué est VOILÉ et ne s'ouvre pas : l'ouvrir
                     montrerait un journal vide, donc un faux « rien mangé ». */
                  const isMasque   = !!debutHisto && ds < debutHisto;
                  const s = isMasque ? undefined : allData.get(ds);
                  const inMonth    = day.getMonth() === calMonth.getMonth();
                  const isToday    = day.toDateString() === today.toDateString();
                  const isFuture   = day > today;
                  const isBeforeReg= regDate ? day < regDate : false;
                  const hasData    = !!s && s.meal_count > 0;
                  const pct        = hasData ? Math.min(s.total_calories / goals.calories, 1) : 0;
                  const highContrast = pct >= 0.5;
                  const isClickable= inMonth && !isFuture && !isBeforeReg && !isMasque;

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
                        opacity: !inMonth || isBeforeReg ? 0.2 : isFuture || isMasque ? 0.4 : 1,
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
                        <span className="text-[11px] font-semibold leading-none mt-0.5"
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
                <span className="text-[11px] font-light" style={{ color: "var(--text-3)" }}>{l}</span>
              </div>
            ))}
          </div>

          {/* ── Ce que le mois raconte, ce que tout raconte ──
             Deux trios de chiffres de MEME nature qui se suivaient a 16 px,
             l'un en trois tuiles de verre, l'autre dans un lavis violet :
             deux ecritures pour une seule idee. Un cadre, deux sections, un
             filet. Le verre est parti parce qu'il n'y avait rien derriere a
             laisser deviner : c'etait une surface statique, pas un element
             flottant. Les pictogrammes decoratifs partent avec (l'⚡ disait
             meme la serie, alors que la serie se dit 🔥 partout ailleurs). */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 overflow-hidden"
            style={{ borderRadius: "var(--r-bloc)", border: "1px solid rgba(var(--text-3-rgb),0.16)" }}>

            <div className="vy-filet p-4">
              <p className="vy-label mb-3" style={{ color: "var(--text-3)" }}>Ce mois-ci</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Jours trackés", val: `${trackedThisMonth}`, unit: `/ ${daysInMonth}`, color: "var(--text-1)" },
                  { label: "Moy. calories", val: avgCal > 0 ? avgCal.toLocaleString("fr-FR") : "—", unit: avgCal > 0 ? "kcal/j" : "", color: "var(--exp-encre)" },
                  { label: "Série en cours", val: streak > 0 ? `${streak}` : "—", unit: streak > 0 ? "jours" : "", color: "var(--feu-encre)" },
                ].map(({ label, val, unit, color }) => (
                  <div key={label}>
                    <p className="text-[20px] font-extralight leading-tight" style={{ color }}>
                      {val}
                      {unit && <span className="text-[11px] font-light ml-0.5" style={{ color: "var(--text-3)" }}>{unit}</span>}
                    </p>
                    <p className="vy-label mt-0.5" style={{ color: "var(--text-3)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {allTracked.length > 0 && (
              <div className="vy-filet p-4">
                <p className="vy-label mb-3" style={{ color: "var(--text-3)" }}>
                  Depuis l’inscription
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { val: allTracked.length, unit: "jours", label: "trackés",   color: "var(--text-1)" },
                    { val: bestStreak,        unit: "jours", label: "meil. série",color: "var(--exp-encre)" },
                    { val: globalAvgCal > 0 ? globalAvgCal.toLocaleString("fr-FR") : "—",
                      unit: globalAvgCal > 0 ? "kcal" : "", label: "moy./jour",   color: "var(--feu-encre)" },
                  ].map(({ val, unit, label, color }) => (
                    <div key={label}>
                      <p className="text-[20px] font-extralight leading-tight" style={{ color }}>
                        {val}
                        <span className="text-[11px] font-light ml-0.5" style={{ color: "var(--text-3)" }}>{unit}</span>
                      </p>
                      <p className="vy-label mt-0.5" style={{ color: "var(--text-3)" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
