"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Dumbbell, Trophy, Clock, Flame, ChevronRight, Volume2, VolumeX, BadgeCheck, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@/context/AuthContext";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";
import { ensureWeek, fetchDay, readLieu, ctxFromLieu, dayTitle, setDayStatus, todayYmd, type GenInput } from "@/lib/planning";

/* ─── Types ──────────────────────────────────────────────────────────── */
type WorkoutSummary = {
  title: string;
  duration: number;
  difficulty: string;
  category: string;
  id: string;
  date: string;
  exerciseList: Exercise[];
};

type DailyPerf = {
  label: string;
  value: string;
  delta?: string;
  context?: string;
};

type DailyVideo = {
  id: string;
  media_url: string;
  caption: string;
  views: number;
  pseudo: string;
  avatar_url?: string | null;
  is_admin: boolean;
  is_certified?: boolean;
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
  const [showGuide, setShowGuide] = useState(false);
  const [perfs, setPerfs] = useState<DailyPerf[]>([]);
  const [dailyVideo, setDailyVideo] = useState<DailyVideo | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  /* ─ Charge la VIDÉO DU JOUR : la plus vue des dernières 24h ─ */
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    const since = new Date(Date.now() - 86400000).toISOString();
    supabase
      .from("posts")
      .select(`id, media_url, caption, views, user_id, created_at,
               author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified)`)
      .eq("media_type", "video")
      .gte("created_at", since)
      .order("views", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.media_url) {
          const author = Array.isArray(data.author) ? data.author[0] : data.author;
          setDailyVideo({
            id:        String(data.id),
            media_url: data.media_url as string,
            caption:   (data.caption as string) ?? "",
            views:     (data.views as number) ?? 0,
            pseudo:    (author?.pseudo as string) ?? "aura",
            avatar_url: author?.avatar_url ?? null,
            is_admin:  Boolean(author?.is_admin),
                is_certified: Boolean((author as { is_certified?: boolean } | null)?.is_certified),
          });
          return;
        }
        // Fallback : la plus vue de la semaine si rien dans les 24h
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        supabase
          .from("posts")
          .select(`id, media_url, caption, views, user_id, created_at,
                   author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified)`)
          .eq("media_type", "video")
          .gte("created_at", weekAgo)
          .order("views", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()
          .then(({ data: fb }) => {
            if (fb && fb.media_url) {
              const author = Array.isArray(fb.author) ? fb.author[0] : fb.author;
              setDailyVideo({
                id:        String(fb.id),
                media_url: fb.media_url as string,
                caption:   (fb.caption as string) ?? "",
                views:     (fb.views as number) ?? 0,
                pseudo:    (author?.pseudo as string) ?? "aura",
                avatar_url: author?.avatar_url ?? null,
                is_admin:  Boolean(author?.is_admin),
                is_certified: Boolean((author as { is_certified?: boolean } | null)?.is_certified),
              });
            }
          });
      });
  }, [open]);

  /* ─ Pause/play vidéo selon visibilité de la tab ─ */
  useEffect(() => {
    if (!videoElRef.current) return;
    if (activeIdx === 0 && open) videoElRef.current.play().catch(() => {});
    else videoElRef.current.pause();
  }, [activeIdx, open]);

  /* ─ Charge la séance du jour depuis le planning (base Supabase) ─ */
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const today = todayYmd();
      let day = await fetchDay(user.id, today);
      // Pas encore amorcé (l'utilisateur n'a pas ouvert son planning) → on amorce si le lieu est connu
      if (!day) {
        const { location, equip } = readLieu(user.id);
        if (location) {
          const supabase = createClient();
          const { data: prof } = await supabase
            .from("profiles")
            .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
            .eq("id", user.id)
            .maybeSingle();
          if (prof) {
            let variant = 0;
            try { variant = parseInt(localStorage.getItem(`vaiiya_prog_variant_${user.id}`) || "0") || 0; } catch { /* ignore */ }
            const gen: GenInput = {
              ctx: ctxFromLieu(location, equip),
              sessions: (prof.onboarding_sessions_week as number) ?? 3,
              goals: (prof.onboarding_goals as string[]) ?? [],
              level: (prof.onboarding_level as string) ?? null,
              variant,
              seed: user.id,
            };
            const wk = await ensureWeek(user.id, gen);
            day = wk.find((d) => d.date === today) ?? null;
          }
        }
      }
      if (cancelled) return;
      if (day && day.type !== "Repos" && day.exerciseList.length > 0) {
        setTodayWorkout({
          id:         `planning-${day.date}`,
          date:       day.date,
          title:      dayTitle(day),
          duration:   day.type === "HIIT" ? 30 : 45,
          difficulty: day.difficulty,
          category:   day.type,
          exerciseList: day.exerciseList,
        });
      } else {
        setTodayWorkout(null);
      }
    })();
    return () => { cancelled = true; };
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
          label: "Score Vaiiya",
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
            className="fixed inset-0 md:left-[88px] z-[55]"
            style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(10px)" }}
          />

          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 md:left-[88px] top-0 z-[60] md:h-[100dvh]"
            style={{ height: "calc(100dvh - 112px - env(safe-area-inset-bottom))" }}
          >
            <div className="relative h-full m-2 rounded-3xl overflow-hidden flex flex-col"
              style={{
                background: "rgba(var(--surface-rgb),0.95)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(var(--surface-rgb),0.95)",
                boxShadow: "0 -20px 60px rgba(var(--accent-rgb),0.2)",
              }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
                <h2 className="text-lg font-extralight" style={{ color: "var(--text-1)" }}>Du jour</h2>
                <button type="button" onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
                  <X size={16} strokeWidth={2} style={{ color: "var(--accent)" }} />
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
                          ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.85)" }
                          : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--violet-mid-rgb),0.25)" }
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

                {/* ─── VOTD : Vidéo du jour — player TikTok plein hauteur ─── */}
                <section
                  className="flex-shrink-0 w-full h-full flex flex-col items-center px-3 pb-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  {dailyVideo ? (
                    <div className="relative rounded-3xl overflow-hidden h-full max-w-full"
                      style={{
                        aspectRatio: "9 / 16",
                        background: "linear-gradient(135deg, #1A1A2E 0%, #2D2A4E 100%)",
                        boxShadow: "0 16px 56px rgba(45,42,78,0.4), 0 0 0 1px rgba(var(--accent-rgb),0.25)",
                      }}>
                      {/* La vraie vidéo */}
                      <video
                        ref={videoElRef}
                        src={dailyVideo.media_url}
                        muted={videoMuted}
                        loop
                        playsInline
                        autoPlay
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Overlay haut : badge VIDÉO DU JOUR + mute */}
                      <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none z-10">
                        <div className="flex flex-col gap-2 items-start">
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full pointer-events-auto"
                            style={{
                              background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.95), rgba(124,92,250,0.95))",
                              backdropFilter: "blur(8px)",
                              boxShadow: "0 4px 12px rgba(124,92,250,0.4)",
                            }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#fff" }} />
                            <span className="text-[10px] font-bold tracking-widest text-white uppercase">
                              Vidéo du jour
                            </span>
                            <span className="text-sm leading-none">🔥</span>
                          </div>
                          {dailyVideo.views > 0 && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full pointer-events-none"
                              style={{
                                background: "rgba(0,0,0,0.45)",
                                backdropFilter: "blur(8px)",
                              }}>
                              <Eye size={11} strokeWidth={2} color="#fff" />
                              <span className="text-[10px] font-semibold text-white">
                                {dailyVideo.views >= 1000 ? `${(dailyVideo.views / 1000).toFixed(1)}k` : dailyVideo.views} vues
                              </span>
                            </div>
                          )}
                        </div>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setVideoMuted(v => !v)}
                          className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto"
                          style={{
                            background: "rgba(0,0,0,0.45)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(var(--surface-rgb),0.18)",
                          }}
                          aria-label={videoMuted ? "Activer le son" : "Couper le son"}
                        >
                          {videoMuted
                            ? <VolumeX size={15} strokeWidth={2} color="#fff" />
                            : <Volume2 size={15} strokeWidth={2} color="#fff" />}
                        </motion.button>
                      </div>

                      {/* Overlay bas : auteur + bouton Voir */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between gap-2 z-10"
                        style={{
                          background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.8))",
                        }}>
                        <Link
                          href={`/profil/${encodeURIComponent(dailyVideo.pseudo)}`}
                          className="flex items-center gap-2 min-w-0 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                            style={{ border: "2px solid rgba(var(--surface-rgb),0.85)" }}>
                            {dailyVideo.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img loading="lazy" decoding="async" src={dailyVideo.avatar_url} alt={dailyVideo.pseudo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold"
                                style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}>
                                {dailyVideo.pseudo[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-bold truncate text-white">@{dailyVideo.pseudo}</p>
                              {(dailyVideo.is_certified || dailyVideo.is_admin) && (
                                <BadgeCheck size={13} strokeWidth={2} className="flex-shrink-0" style={{ color: "var(--accent)", fill: "rgba(var(--surface-rgb),0.95)" }} />
                              )}
                            </div>
                            {dailyVideo.caption && (
                              <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                                {dailyVideo.caption}
                              </p>
                            )}
                          </div>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* Empty / loading state */
                    <div className="relative rounded-3xl overflow-hidden h-full max-w-full flex items-center justify-center"
                      style={{
                        aspectRatio: "9 / 16",
                        background: "linear-gradient(135deg, rgba(var(--violet-mid-rgb),0.18), rgba(var(--cream-mid-rgb),0.12))",
                        border: "1px solid rgba(var(--violet-mid-rgb),0.3)",
                      }}>
                      <div className="text-center px-6">
                        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                          style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" }}>
                          <Play size={22} strokeWidth={1.5} style={{ color: "var(--text-1)" }} fill="currentColor" />
                        </div>
                        <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>
                          Vidéo du jour
                        </p>
                        <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>
                          Aucune vidéo populaire récente
                        </p>
                      </div>
                    </div>
                  )}
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
                            background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)",
                            boxShadow: "0 12px 36px rgba(var(--accent-rgb),0.25), inset 0 1px 0 rgba(var(--surface-rgb),0.85)",
                          }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "rgba(45,55,72,0.6)" }}>
                                Aujourd'hui
                              </p>
                              <h3 className="text-2xl font-extralight mt-1 leading-tight" style={{ color: "var(--text-1)" }}>
                                {todayWorkout.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-3">
                                <div className="flex items-center gap-1">
                                  <Clock size={12} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
                                  <span className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{todayWorkout.duration} min</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Flame size={12} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
                                  <span className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{todayWorkout.difficulty}</span>
                                </div>
                              </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(var(--surface-rgb),0.45)", backdropFilter: "blur(8px)" }}>
                              <Dumbbell size={20} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
                            </div>
                          </div>
                        </div>

                        {/* CTA lancer — ouvre le guide de séance */}
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowGuide(true)}
                          className="w-full rounded-2xl p-4 flex items-center justify-between cursor-pointer flex-shrink-0"
                          style={{
                            background: "rgba(var(--surface-rgb),0.98)",
                            border: "1px solid rgba(var(--violet-mid-rgb),0.5)",
                            boxShadow: "0 8px 24px rgba(var(--accent-rgb),0.18), inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
                          }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{ background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)" }}>
                              <Play size={14} strokeWidth={2} style={{ color: "var(--text-1)", marginLeft: 2 }} fill="currentColor" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Lancer la séance</p>
                              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                                {todayWorkout.category}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} strokeWidth={2} style={{ color: "var(--accent)" }} />
                        </motion.button>

                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--text-3)" }}>
                            Pourquoi cette séance
                          </p>
                          <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-1)" }}>
                            Adaptée à ton programme hebdomadaire et au niveau d'effort de tes derniers jours. Reste à l'écoute de tes sensations.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, rgba(var(--tint-violet-rgb),0.95) 0%, rgba(255,251,240,0.95) 100%)" }}>
                          <Dumbbell size={22} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>
                            Jour de repos
                          </p>
                          <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>
                            Pas de séance prévue aujourd'hui. La récup, c'est de l'entraînement aussi ✦
                          </p>
                        </div>
                        <Link href="/progression"
                          className="mt-2 px-4 py-2 rounded-2xl text-xs font-semibold"
                          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }}>
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
                                background: "linear-gradient(135deg, #C4A8FF 0%, var(--accent) 100%)",
                                boxShadow: "0 12px 36px rgba(var(--gold-rgb),0.3), inset 0 1px 0 rgba(var(--surface-rgb),0.5)",
                              }}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "rgba(45,55,72,0.6)" }}>
                                    {hero.label}
                                  </p>
                                  <h3 className="text-4xl font-extralight mt-1 leading-none" style={{ color: "var(--text-1)" }}>
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
                                  style={{ background: "rgba(var(--surface-rgb),0.45)", backdropFilter: "blur(8px)" }}>
                                  <Trophy size={20} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
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
                                style={{ background: "rgba(var(--surface-rgb),0.85)", border: "1px solid rgba(var(--violet-mid-rgb),0.25)" }}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                                    {p.label}
                                  </p>
                                  <div className="flex items-baseline gap-2 mt-0.5">
                                    <p className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>{p.value}</p>
                                    {p.delta && (
                                      <p className="text-[10px] font-semibold" style={{ color: p.delta.startsWith("+") ? "#0F766E" : p.delta === "stable" ? "var(--text-3)" : "#9B2C2C" }}>
                                        {p.delta}
                                      </p>
                                    )}
                                  </div>
                                  {p.context && (
                                    <p className="text-[10px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>{p.context}</p>
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
                          style={{ background: "linear-gradient(135deg, rgba(255,251,240,0.95) 0%, rgba(var(--cream-mid-rgb),0.5) 100%)" }}>
                          <Trophy size={22} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>
                            Aucune perf encore
                          </p>
                          <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>
                            Bouge un peu et reviens — Vaiiya aime célébrer les progrès ✦
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
                      background: activeIdx === i ? "linear-gradient(90deg, var(--accent), var(--gold))" : "rgba(var(--accent-rgb),0.25)",
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Guide de séance lancé */}
          {showGuide && todayWorkout && (
            <WorkoutGuideModal
              sessionId={todayWorkout.id}
              title={todayWorkout.title}
              accent="var(--accent)"
              duration={todayWorkout.duration}
              difficulty={todayWorkout.difficulty}
              category={todayWorkout.category}
              exerciseList={todayWorkout.exerciseList}
              onClose={() => setShowGuide(false)}
              onComplete={() => { if (user) void setDayStatus(user.id, todayWorkout.date, "done"); }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
