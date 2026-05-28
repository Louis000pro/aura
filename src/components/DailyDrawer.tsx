"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Dumbbell, Trophy, Clock, Flame, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { User } from "@/context/AuthContext";

/* ─── Types ──────────────────────────────────────────────────────────── */
type WorkoutSummary = {
  title: string;
  duration: number;
  difficulty: string;
  category: string;
  id: string;
};

type DailyPerf = {
  label: string;
  value: string;
  delta?: string;
  context?: string;
};

/* ─── Composant ──────────────────────────────────────────────────────── */
export default function DailyDrawer({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const [activeIdx, setActiveIdx] = useState(0); // 0=VOTD, 1=SOTD, 2=POTD
  const [todayWorkout, setTodayWorkout] = useState<WorkoutSummary | null>(null);
  const [perfs, setPerfs] = useState<DailyPerf[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ─ Charge séance du jour depuis le programme localStorage ─ */
  useEffect(() => {
    if (!open || !user) return;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const key = `aura_programme_${user.id}_w${week}_${now.getFullYear()}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const today = jours[now.getDay()];
      const todayJour = data.semaine?.find((d: { jour: string }) => d.jour === today);
      if (todayJour && todayJour.type !== "Repos") {
        setTodayWorkout({
          id:         todayJour.id ?? "session-today",
          title:      todayJour.titre || todayJour.type,
          duration:   parseInt(todayJour.duree) || 45,
          difficulty: todayJour.niveau || "Intermédiaire",
          category:   todayJour.type,
        });
      } else {
        setTodayWorkout(null);
      }
    } catch { /* ignore */ }
  }, [open, user]);

  /* ─ Charge perfs du jour : compare stats aujourd'hui vs hier ─ */
  useEffect(() => {
    if (!open || !user) return;
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    Promise.all([
      supabase.from("daily_stats").select("score, calories, steps, sleep_hours, streak")
        .eq("user_id", user.id).eq("date", today).maybeSingle(),
      supabase.from("daily_stats").select("score, calories, steps, sleep_hours")
        .eq("user_id", user.id).eq("date", yesterday).maybeSingle(),
    ]).then(([{ data: t }, { data: y }]) => {
      if (!t) return;
      const list: DailyPerf[] = [];
      if (t.score && t.score > 0) {
        const delta = y?.score ? t.score - y.score : 0;
        list.push({
          label: "Score Aura",
          value: `${t.score}/100`,
          delta: delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "stable",
          context: t.score >= 80 ? "Excellent" : t.score >= 60 ? "Bien" : "À améliorer",
        });
      }
      if (t.steps && t.steps > 0) {
        const delta = y?.steps ? Math.round(((t.steps - y.steps) / Math.max(y.steps, 1)) * 100) : 0;
        list.push({
          label: "Pas",
          value: t.steps >= 1000 ? `${(t.steps/1000).toFixed(1)}k` : `${t.steps}`,
          delta: delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : "stable",
          context: t.steps >= 10000 ? "Objectif atteint" : `${Math.round((t.steps/10000)*100)}% objectif`,
        });
      }
      if (t.streak && t.streak > 0) {
        list.push({
          label: "Streak",
          value: `${t.streak}j`,
          context: t.streak >= 7 ? "Belle régularité 🔥" : "Continue !",
        });
      }
      if (t.calories && t.calories > 0) {
        list.push({
          label: "Calories",
          value: `${t.calories} kcal`,
          context: "Apport du jour",
        });
      }
      setPerfs(list);
    });
  }, [open, user]);

  /* ─ Tracking de l'index actif via scroll ─ */
  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.clientWidth;
    const t = scrollRef.current.scrollLeft;
    const idx = Math.round(t / w);
    setActiveIdx(Math.max(0, Math.min(2, idx)));
  }, []);

  /* ─ Naviguer vers une card via tap dot ─ */
  const goTo = (i: number) => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: i * w, behavior: "smooth" });
  };

  const tabs = [
    { key: "votd", label: "Vidéo",  icon: Play },
    { key: "sotd", label: "Séance", icon: Dumbbell },
    { key: "potd", label: "Perf",   icon: Trophy },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(240,235,255,0.5)", backdropFilter: "blur(10px)" }}
          />

          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 top-0 z-50"
            style={{ height: "calc(100dvh - 112px)" }}
          >
            <div className="relative h-full m-2 rounded-3xl overflow-hidden flex flex-col"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.95)",
                boxShadow: "0 -20px 60px rgba(167,139,250,0.2)",
              }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
                <h2 className="text-lg font-extralight" style={{ color: "#2D3748" }}>Du jour</h2>
                <button type="button" onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(167,139,250,0.12)" }}>
                  <X size={16} strokeWidth={2} style={{ color: "#A78BFA" }} />
                </button>
              </div>

              {/* Tabs avec indicateur actif */}
              <div className="flex gap-2 px-5 pb-3 flex-shrink-0">
                {tabs.map((t, i) => {
                  const Icon = t.icon;
                  const active = activeIdx === i;
                  return (
                    <button type="button" key={t.key}
                      onClick={() => goTo(i)}
                      className="flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={
                        active
                          ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)" }
                          : { background: "rgba(255,255,255,0.7)", color: "#A0AEC0", border: "1px solid rgba(212,192,255,0.25)" }
                      }>
                      <Icon size={13} strokeWidth={active ? 2 : 1.5} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Carousel horizontal */}
              <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex-1 overflow-x-scroll overflow-y-hidden flex"
                style={{
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                }}
              >

                {/* ─── VOTD : Vidéo du jour ─── */}
                <section
                  className="flex-shrink-0 w-full h-full flex flex-col"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex-1 px-5 pb-4 flex flex-col gap-3 overflow-y-auto">
                    {/* Mock vidéo card */}
                    <div className="relative rounded-3xl overflow-hidden flex-shrink-0"
                      style={{
                        aspectRatio: "16/9",
                        background: "linear-gradient(135deg, #2D2A4E 0%, #4C3A6C 50%, #6B4E8C 100%)",
                        boxShadow: "0 12px 36px rgba(45,42,78,0.35)",
                      }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer"
                          style={{
                            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,230,163,0.9) 100%)",
                            boxShadow: "0 8px 24px rgba(167,139,250,0.4)",
                          }}>
                          <Play size={22} strokeWidth={2} style={{ color: "#2D3748", marginLeft: 3 }} fill="#2D3748" />
                        </motion.button>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.7)" }}>
                            Aujourd'hui · 8 min
                          </p>
                          <p className="text-sm font-semibold mt-0.5" style={{ color: "#fff" }}>
                            Routine mobilité matinale
                          </p>
                        </div>
                        <div className="px-2 py-1 rounded-lg text-[10px] font-semibold"
                          style={{ background: "rgba(255,255,255,0.18)", color: "#fff", backdropFilter: "blur(8px)" }}>
                          NEW
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "#A0AEC0" }}>
                        À retenir
                      </p>
                      <p className="text-sm font-light leading-relaxed" style={{ color: "#2D3748" }}>
                        8 minutes de mouvements ciblés pour débloquer hanches et épaules. Idéal pour préparer ton corps avant n'importe quel effort ✦
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {["Mobilité", "Matin", "5 min", "Débutant"].map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                          style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ─── SOTD : Séance du jour ─── */}
                <section
                  className="flex-shrink-0 w-full h-full flex flex-col"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex-1 px-5 pb-4 flex flex-col gap-3 overflow-y-auto">
                    {todayWorkout ? (
                      <>
                        {/* Card séance hero */}
                        <div className="relative rounded-3xl p-5 flex-shrink-0"
                          style={{
                            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                            boxShadow: "0 12px 36px rgba(167,139,250,0.25), inset 0 1px 0 rgba(255,255,255,0.85)",
                          }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "rgba(45,55,72,0.6)" }}>
                                Aujourd'hui
                              </p>
                              <h3 className="text-2xl font-extralight mt-1 leading-tight" style={{ color: "#2D3748" }}>
                                {todayWorkout.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-3">
                                <div className="flex items-center gap-1">
                                  <Clock size={12} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                                  <span className="text-xs font-medium" style={{ color: "#2D3748" }}>{todayWorkout.duration} min</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Flame size={12} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                                  <span className="text-xs font-medium" style={{ color: "#2D3748" }}>{todayWorkout.difficulty}</span>
                                </div>
                              </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(8px)" }}>
                              <Dumbbell size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                            </div>
                          </div>
                        </div>

                        {/* CTA lancer */}
                        <Link href="/progression"
                          className="rounded-2xl p-4 flex items-center justify-between cursor-pointer flex-shrink-0"
                          style={{
                            background: "rgba(45,55,72,0.95)",
                            boxShadow: "0 8px 24px rgba(45,55,72,0.25)",
                          }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }}>
                              <Play size={14} strokeWidth={2} style={{ color: "#2D3748", marginLeft: 2 }} fill="#2D3748" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold" style={{ color: "#fff" }}>Lancer la séance</p>
                              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                                {todayWorkout.category}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} strokeWidth={2} style={{ color: "rgba(255,255,255,0.5)" }} />
                        </Link>

                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "#A0AEC0" }}>
                            Pourquoi cette séance
                          </p>
                          <p className="text-sm font-light leading-relaxed" style={{ color: "#2D3748" }}>
                            Adaptée à ton programme hebdomadaire et au niveau d'effort de tes derniers jours. Reste à l'écoute de tes sensations.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.95) 0%, rgba(255,251,240,0.95) 100%)" }}>
                          <Dumbbell size={22} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>
                            Jour de repos
                          </p>
                          <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                            Pas de séance prévue aujourd'hui. La récup, c'est de l'entraînement aussi ✦
                          </p>
                        </div>
                        <Link href="/progression"
                          className="mt-2 px-4 py-2 rounded-2xl text-xs font-semibold"
                          style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748" }}>
                          Voir mon programme
                        </Link>
                      </div>
                    )}
                  </div>
                </section>

                {/* ─── POTD : Perf du jour ─── */}
                <section
                  className="flex-shrink-0 w-full h-full flex flex-col"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex-1 px-5 pb-4 flex flex-col gap-3 overflow-y-auto">
                    {perfs.length > 0 ? (
                      <>
                        {/* Hero perf — la plus saillante */}
                        {(() => {
                          const hero = perfs[0];
                          return (
                            <div className="relative rounded-3xl p-5 flex-shrink-0"
                              style={{
                                background: "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)",
                                boxShadow: "0 12px 36px rgba(212,168,67,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
                              }}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "rgba(45,55,72,0.6)" }}>
                                    {hero.label}
                                  </p>
                                  <h3 className="text-4xl font-extralight mt-1 leading-none" style={{ color: "#2D3748" }}>
                                    {hero.value}
                                  </h3>
                                  {hero.delta && (
                                    <p className="text-xs font-semibold mt-2" style={{ color: hero.delta.startsWith("+") ? "#0F766E" : hero.delta === "stable" ? "rgba(45,55,72,0.6)" : "#9B2C2C" }}>
                                      {hero.delta} vs hier
                                    </p>
                                  )}
                                  {hero.context && (
                                    <p className="text-xs font-light mt-1" style={{ color: "rgba(45,55,72,0.7)" }}>
                                      {hero.context}
                                    </p>
                                  )}
                                </div>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(8px)" }}>
                                  <Trophy size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Autres perfs en liste */}
                        {perfs.length > 1 && (
                          <div className="flex flex-col gap-2">
                            {perfs.slice(1).map((p) => (
                              <div key={p.label}
                                className="rounded-2xl p-3 flex items-center gap-3"
                                style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(212,192,255,0.25)" }}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                                    {p.label}
                                  </p>
                                  <div className="flex items-baseline gap-2 mt-0.5">
                                    <p className="text-lg font-semibold" style={{ color: "#2D3748" }}>{p.value}</p>
                                    {p.delta && (
                                      <p className="text-[10px] font-semibold" style={{ color: p.delta.startsWith("+") ? "#0F766E" : p.delta === "stable" ? "#A0AEC0" : "#9B2C2C" }}>
                                        {p.delta}
                                      </p>
                                    )}
                                  </div>
                                  {p.context && (
                                    <p className="text-[10px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>{p.context}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, rgba(255,251,240,0.95) 0%, rgba(245,230,163,0.5) 100%)" }}>
                          <Trophy size={22} strokeWidth={1.5} style={{ color: "#D4A843" }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>
                            Aucune perf encore
                          </p>
                          <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                            Bouge un peu et reviens — Aura aime célébrer les progrès ✦
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

              </div>

              {/* Dots indicateur horizontal */}
              <div className="flex items-center justify-center gap-2 py-3 flex-shrink-0">
                {[0, 1, 2].map(i => (
                  <button key={i} type="button" onClick={() => goTo(i)}
                    aria-label={`Aller à la card ${i + 1}`}
                    className="rounded-full transition-all"
                    style={{
                      width: activeIdx === i ? 24 : 6,
                      height: 6,
                      background: activeIdx === i ? "linear-gradient(90deg, #A78BFA, #D4A843)" : "rgba(167,139,250,0.25)",
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
