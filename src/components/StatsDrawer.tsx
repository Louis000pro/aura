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

                {/* ─── ZONE 2 : Plats du jour — Assiette hero ─── */}
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

                  {/* Assiette SVG hero */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <motion.button
                      type="button"
                      onClick={onOpenRepas}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.02 }}
                      className="relative outline-none"
                      style={{ width: 220, height: 220 }}
                      aria-label={meals.length === 0 ? "Ajouter un repas" : "Voir les détails du repas"}
                    >
                      {/* Ombre portée sous l'assiette */}
                      <div className="absolute pointer-events-none"
                        style={{
                          bottom: -6, left: "50%", transform: "translateX(-50%)",
                          width: 200, height: 18, borderRadius: "50%",
                          background: "radial-gradient(ellipse, rgba(45,55,72,0.18) 0%, transparent 70%)",
                          filter: "blur(8px)",
                        }} />

                      <svg viewBox="0 0 220 220" width="220" height="220" style={{ overflow: "visible" }}>
                        <defs>
                          {/* Gradient principal de l'assiette */}
                          <radialGradient id="plateBody" cx="40%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="55%" stopColor="#F8F4FB" />
                            <stop offset="100%" stopColor="#E8DEF0" />
                          </radialGradient>
                          {/* Gradient de la zone creuse intérieure */}
                          <radialGradient id="plateInner" cx="45%" cy="40%" r="60%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="100%" stopColor="#F0E8F5" />
                          </radialGradient>
                          {/* Reflet brillant en haut */}
                          <linearGradient id="plateShine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                          </linearGradient>
                        </defs>

                        {/* Corps de l'assiette */}
                        <circle cx="110" cy="110" r="105" fill="url(#plateBody)" />
                        {/* Bord intérieur (creux) */}
                        <circle cx="110" cy="110" r="82" fill="url(#plateInner)" />
                        {/* Ligne de séparation entre bord et creux */}
                        <circle cx="110" cy="110" r="82" fill="none" stroke="rgba(167,139,250,0.18)" strokeWidth="0.5" />
                        {/* Reflet en haut */}
                        <ellipse cx="85" cy="55" rx="55" ry="22" fill="url(#plateShine)" opacity="0.6" />
                        {/* Petite touche de brillance latérale */}
                        <ellipse cx="170" cy="100" rx="8" ry="35" fill="rgba(255,255,255,0.35)" />

                        {/* ─── Si pleine : aliments stylisés sur l'assiette ─── */}
                        {meals.length > 0 && (
                          <>
                            {/* Blob principal (protéine - or/saumon) */}
                            <ellipse cx="90" cy="105" rx="32" ry="24"
                              fill="url(#foodProtein)" opacity="0.92" />
                            {/* Blob secondaire (féculents - violet pâle) */}
                            <ellipse cx="135" cy="125" rx="26" ry="20"
                              fill="url(#foodCarbs)" opacity="0.88" />
                            {/* Blob veggies (vert pastel) */}
                            <ellipse cx="125" cy="85" rx="20" ry="15"
                              fill="url(#foodVeggies)" opacity="0.85" />
                            <defs>
                              <radialGradient id="foodProtein" cx="40%" cy="35%">
                                <stop offset="0%" stopColor="#F5C99B" />
                                <stop offset="100%" stopColor="#D4A05A" />
                              </radialGradient>
                              <radialGradient id="foodCarbs" cx="40%" cy="35%">
                                <stop offset="0%" stopColor="#E8D7FF" />
                                <stop offset="100%" stopColor="#C4A8E8" />
                              </radialGradient>
                              <radialGradient id="foodVeggies" cx="40%" cy="35%">
                                <stop offset="0%" stopColor="#C9E5C0" />
                                <stop offset="100%" stopColor="#8FB682" />
                              </radialGradient>
                            </defs>
                            {/* Petits détails (grains/morceaux) */}
                            <circle cx="80" cy="95" r="2.5" fill="#B8804F" opacity="0.7" />
                            <circle cx="98" cy="115" r="2" fill="#B8804F" opacity="0.7" />
                            <circle cx="142" cy="120" r="2" fill="#9F84BF" opacity="0.7" />
                            <circle cx="130" cy="135" r="2.5" fill="#9F84BF" opacity="0.7" />
                            <circle cx="120" cy="90" r="1.8" fill="#6E9C5B" opacity="0.7" />
                          </>
                        )}
                      </svg>

                      {/* Mini overlay icône camera si vide */}
                      {meals.length === 0 && (
                        <div className="absolute pointer-events-none"
                          style={{
                            top: "50%", left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 48, height: 48,
                            borderRadius: 16,
                            background: "rgba(167,139,250,0.15)",
                            backdropFilter: "blur(4px)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                          <Camera size={20} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                        </div>
                      )}
                    </motion.button>

                    {/* Légende sous l'assiette */}
                    <div className="text-center">
                      {meals.length === 0 ? (
                        <>
                          <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                            Assiette vide
                          </p>
                          <p className="text-[11px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>
                            Tap pour ajouter — photo, code-barres ou saisie
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                            {meals.length} repas {meals.length > 1 ? "ajoutés" : "ajouté"} aujourd'hui
                          </p>
                          <p className="text-[11px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>
                            Tap pour inspecter ou ajouter
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Si pleine : récap mini en bas */}
                  {meals.length > 0 && (
                    <div className="flex gap-2 flex-shrink-0">
                      {[
                        { label: "kcal", value: totalCals,        color: "#A78BFA" },
                        { label: "Prot", value: `${totalProteins}g`, color: "#D4A843" },
                        { label: "Repas", value: meals.length,    color: "#A78BFA" },
                      ].map(s => (
                        <div key={s.label}
                          className="flex-1 rounded-2xl p-2.5 text-center"
                          style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(212,192,255,0.25)" }}>
                          <p className="text-[8px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{s.label}</p>
                          <p className="text-base font-semibold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
