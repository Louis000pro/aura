"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Dumbbell, Trophy, Clock, Flame, ChevronRight, Volume2, VolumeX, BadgeCheck, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type DailyVideo = {
  id: string;
  media_url: string;
  caption: string;
  views: number;
  pseudo: string;
  avatar_url?: string | null;
  is_admin: boolean;
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
               author:profiles!user_id(pseudo, avatar_url, is_admin)`)
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
          });
          return;
        }
        // Fallback : la plus vue de la semaine si rien dans les 24h
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        supabase
          .from("posts")
          .select(`id, media_url, caption, views, user_id, created_at,
                   author:profiles!user_id(pseudo, avatar_url, is_admin)`)
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
            className="fixed inset-0 md:left-[88px] z-[55]"
            style={{ background: "rgba(240,235,255,0.5)", backdropFilter: "blur(10px)" }}
          />

          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 md:left-[88px] top-0 z-[60]"
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

                {/* ─── VOTD : Vidéo du jour — player TikTok plein hauteur ─── */}
                <section
                  className="flex-shrink-0 w-full h-full flex flex-col items-stretch px-3 pb-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  {dailyVideo ? (
                    <div className="relative rounded-3xl overflow-hidden flex-1 mx-auto w-full"
                      style={{
                        maxWidth: "min(calc((100dvh - 230px) * 9/16), 100%)",
                        background: "linear-gradient(135deg, #1A1A2E 0%, #2D2A4E 100%)",
                        boxShadow: "0 16px 56px rgba(45,42,78,0.4), 0 0 0 1px rgba(167,139,250,0.25)",
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
                              background: "linear-gradient(135deg, rgba(167,139,250,0.95), rgba(124,92,250,0.95))",
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
                            border: "1px solid rgba(255,255,255,0.18)",
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
                          href={`/profil/${dailyVideo.pseudo}`}
                          className="flex items-center gap-2 min-w-0 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                            style={{ border: "2px solid rgba(255,255,255,0.85)" }}>
                            {dailyVideo.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={dailyVideo.avatar_url} alt={dailyVideo.pseudo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold"
                                style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                                {dailyVideo.pseudo[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-bold truncate text-white">@{dailyVideo.pseudo}</p>
                              {dailyVideo.is_admin && (
                                <BadgeCheck size={13} strokeWidth={2} className="flex-shrink-0" style={{ color: "#A78BFA", fill: "rgba(255,255,255,0.95)" }} />
                              )}
                            </div>
                            {dailyVideo.caption && (
                              <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                                {dailyVideo.caption}
                              </p>
                            )}
                          </div>
                        </Link>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => router.push(`/communaute?video=${dailyVideo.id}`)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full flex-shrink-0"
                          style={{
                            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                            boxShadow: "0 4px 14px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.6)",
                          }}>
                          <Play size={12} strokeWidth={2.5} style={{ color: "#2D3748", marginLeft: 1 }} fill="#2D3748" />
                          <span className="text-xs font-bold" style={{ color: "#2D3748" }}>Voir</span>
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    /* Empty / loading state */
                    <div className="relative rounded-3xl overflow-hidden flex-1 mx-auto w-full flex items-center justify-center"
                      style={{
                        maxWidth: "min(calc((100dvh - 230px) * 9/16), 100%)",
                        background: "linear-gradient(135deg, rgba(212,192,255,0.18), rgba(245,230,163,0.12))",
                        border: "1px solid rgba(212,192,255,0.3)",
                      }}>
                      <div className="text-center px-6">
                        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                          style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
                          <Play size={22} strokeWidth={1.5} style={{ color: "#2D3748" }} fill="#2D3748" />
                        </div>
                        <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>
                          Vidéo du jour
                        </p>
                        <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
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
