"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Utensils, Camera, Dumbbell, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { User } from "@/context/AuthContext";
import WeeklyProgramme from "@/components/WeeklyProgramme";
import { stats } from "@/data/statsData";
import type { StatData } from "@/data/statsData";

/* ─── Types ──────────────────────────────────────────────────────────── */
type Meal = {
  id: string;
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  time: string;
  mealType: string;
  hasPhoto?: boolean;
};

const MEAL_EMOJI: Record<string, string> = {
  "petit-dejeuner": "🥐",
  "dejeuner":       "🍽️",
  "gouter":         "🍪",
  "diner":          "🍲",
};

const MEAL_LABEL: Record<string, string> = {
  "petit-dejeuner": "Petit-déj",
  "dejeuner":       "Déjeuner",
  "gouter":         "Goûter",
  "diner":          "Dîner",
};

/* ─── Composant ──────────────────────────────────────────────────────── */
export default function StatsDrawer({
  open,
  onClose,
  user,
  onOpenStat,
  onOpenRepas,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onOpenStat: (stat: StatData) => void;
  onOpenRepas: () => void;
}) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activeIdx, setActiveIdx] = useState(0); // 0=séance, 1=plats, 2=stats
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ─ Fetch meals du jour ─ */
  useEffect(() => {
    if (!open || !user) return;
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("nutrition_logs")
      .select("id, food_name, calories, proteins, carbs, fats, time, meal_type, has_photo")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("time", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMeals(data.map((r: Record<string, unknown>) => ({
            id:        String(r.id),
            name:      r.food_name as string,
            calories:  (r.calories as number) ?? 0,
            proteins:  (r.proteins as number) ?? 0,
            carbs:     (r.carbs as number) ?? 0,
            fats:      (r.fats as number) ?? 0,
            time:      (r.time as string) ?? "",
            mealType:  (r.meal_type as string) ?? "dejeuner",
            hasPhoto:  Boolean(r.has_photo),
          })));
        }
      });
  }, [open, user]);

  /* ─ Détection scroll pour mettre à jour les dots ─ */
  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const h = scrollRef.current.clientHeight;
    const t = scrollRef.current.scrollTop;
    const idx = Math.round(t / h);
    setActiveIdx(Math.max(0, Math.min(2, idx)));
  }, []);

  /* ─ Aller à une zone via clic dot ─ */
  const goTo = (i: number) => {
    if (!scrollRef.current) return;
    const h = scrollRef.current.clientHeight;
    scrollRef.current.scrollTo({ top: i * h, behavior: "smooth" });
  };

  /* ─ Calcul totaux du jour ─ */
  const totalCals = meals.reduce((s, m) => s + m.calories, 0);
  const totalProteins = meals.reduce((s, m) => s + m.proteins, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(240,235,255,0.5)", backdropFilter: "blur(10px)" }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 top-0 z-50"
            style={{ height: "calc(100dvh - 112px)" }}
          >
            <div className="relative h-full m-2 rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.95)",
                boxShadow: "0 20px 60px rgba(167,139,250,0.2)",
              }}>

              {/* Header sticky avec bouton close */}
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-4 pb-2 pointer-events-none">
                <h2 className="text-lg font-extralight pointer-events-auto" style={{ color: "#2D3748" }}>Aujourd'hui</h2>
                <button type="button" onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto"
                  style={{ background: "rgba(167,139,250,0.12)" }}>
                  <X size={16} strokeWidth={2} style={{ color: "#A78BFA" }} />
                </button>
              </div>

              {/* Dots indicateur (verticale, droite) */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Aller à la zone ${i + 1}`}
                    className="block rounded-full transition-all"
                    style={{
                      width: activeIdx === i ? 7 : 5,
                      height: activeIdx === i ? 7 : 5,
                      background: activeIdx === i ? "#A78BFA" : "rgba(167,139,250,0.3)",
                    }}
                  />
                ))}
              </div>

              {/* Scroll container avec snap */}
              <div
                ref={scrollRef}
                onScroll={onScroll}
                className="h-full overflow-y-scroll"
                style={{
                  scrollSnapType: "y mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                }}
              >

                {/* ─── ZONE 1 : Séance recommandée ─── */}
                <section
                  className="h-full flex flex-col pt-16 pb-6 px-5 gap-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Dumbbell size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                      Séance recommandée
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto -mx-1 px-1">
                    {user ? <WeeklyProgramme /> : (
                      <p className="text-sm font-light text-center mt-8" style={{ color: "#A0AEC0" }}>Connecte-toi pour voir ton programme</p>
                    )}
                  </div>
                </section>

                {/* ─── ZONE 2 : Plats du jour ─── */}
                <section
                  className="h-full flex flex-col pt-16 pb-6 px-5 gap-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Utensils size={14} strokeWidth={1.5} style={{ color: "#D4A843" }} />
                      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                        Plats du jour
                      </p>
                    </div>
                    {meals.length > 0 && (
                      <p className="text-[10px] font-semibold" style={{ color: "#A78BFA" }}>
                        {totalCals} kcal · {totalProteins}g P
                      </p>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 -mx-1 px-1">
                    {meals.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, rgba(255,251,240,0.95) 0%, rgba(245,230,163,0.4) 100%)" }}>
                          <Utensils size={22} strokeWidth={1.5} style={{ color: "#D4A843" }} />
                        </div>
                        <p className="text-sm font-light px-4" style={{ color: "#A0AEC0" }}>
                          Pas encore de repas aujourd'hui
                        </p>
                      </div>
                    ) : (
                      meals.map((m) => (
                        <motion.div key={m.id}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl p-3 flex items-center gap-3"
                          style={{
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(212,168,67,0.18)",
                            boxShadow: "0 2px 8px rgba(167,139,250,0.04)",
                          }}>
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, rgba(255,251,240,0.95) 0%, rgba(245,230,163,0.55) 100%)" }}>
                            {MEAL_EMOJI[m.mealType] ?? "🍽️"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{m.name}</p>
                              <p className="text-[10px] font-medium flex-shrink-0" style={{ color: "#A0AEC0" }}>{m.time?.substring(0,5) ?? ""}</p>
                            </div>
                            <p className="text-[11px] mt-0.5" style={{ color: "#A0AEC0" }}>
                              {MEAL_LABEL[m.mealType] ?? ""} · {m.calories} kcal · {m.proteins}g prot
                            </p>
                          </div>
                          {m.hasPhoto && (
                            <Camera size={12} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>

                  <button type="button" onClick={onOpenRepas}
                    className="rounded-2xl p-3.5 flex items-center justify-between cursor-pointer flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,251,240,0.95) 0%, rgba(245,230,163,0.45) 100%)",
                      border: "1px solid rgba(212,168,67,0.25)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(212,168,67,0.18)" }}>
                        <Camera size={15} strokeWidth={1.5} style={{ color: "#D4A843" }} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>Ajouter un repas</p>
                        <p className="text-[10px]" style={{ color: "#A0AEC0" }}>Photo · code-barres · texte</p>
                      </div>
                    </div>
                    <ChevronRight size={15} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                  </button>
                </section>

                {/* ─── ZONE 3 : Statistiques ─── */}
                <section
                  className="h-full flex flex-col pt-16 pb-6 px-5 gap-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <BarChart3 size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                      Mes statistiques
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {stats.slice(0, 6).map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <motion.button type="button" key={stat.label}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onOpenStat(stat)}
                          className="rounded-2xl p-3 flex flex-col items-start gap-1.5 cursor-pointer text-left"
                          style={{
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(212,192,255,0.3)",
                            boxShadow: "0 2px 8px rgba(167,139,250,0.06)",
                          }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(167,139,250,0.1)" }}>
                            <Icon size={14} strokeWidth={1.5} style={{ color: stat.iconColor }} />
                          </div>
                          <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{stat.label}</p>
                          <p className="text-base font-semibold leading-none" style={{ color: "#2D3748" }}>
                            {stat.value}<span className="text-[10px] font-normal ml-1" style={{ color: "#A0AEC0" }}>{stat.unit}</span>
                          </p>
                          {/* Mini bar de progression */}
                          <div className="w-full h-1 rounded-full overflow-hidden mt-1"
                            style={{ background: "rgba(167,139,250,0.12)" }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, stat.progress * 100)}%`,
                                background: stat.barGradient,
                              }} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
