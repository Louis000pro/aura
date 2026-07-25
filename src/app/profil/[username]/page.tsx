"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, UserCheck, Dumbbell, Flame, ArrowLeft, Check, LayoutList,
  X, Sparkles, Lock, Users, ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import VideoPlayer from "@/components/VideoPlayer";
import FollowListModal from "@/components/FollowListModal";
import GemmeRang from "@/components/GemmeRang";
import PerfShareCard from "@/components/PerfShareCard";
import { perfDataToShare } from "@/lib/perfShareExport";
import { type PerformanceData } from "@/components/PerformanceCard";
import { calculerAura, type EtatAura } from "@/lib/aura";
import { SERIES, imageEtat, type SerieSlug } from "@/lib/defi";
import { chargerBadges } from "@/lib/messagerie";

type Profile = {
  id: string;
  pseudo: string;
  name?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  level?: string;
  goals?: string[];
  is_admin?: boolean;
};

type DbSession = {
  id: string;
  title: string;
  started_at: string;
};

type DbPost = {
  id: string;
  type: string;
  caption: string | null;
  description?: string | null;
  media_url: string | null;
  media_type: string | null;
  performance_data: Record<string, unknown> | null;
  created_at: string;
  views?: number;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
  post_reposts: { user_id: string }[];
};


export default function PublicProfilePage() {
  const params = useParams();
  // Décode l'URL (les pseudos avec espaces/accents arrivent encodés : "La%20France" → "La France")
  const rawUsername = (params?.username as string) ?? "";
  let username = rawUsername;
  try { username = decodeURIComponent(rawUsername); } catch { /* déjà décodé */ }
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<DbSession[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"Abonnés" | "Abonnements" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [certified, setCertified] = useState(false); // is_certified (fetch défensif)
  const [userPosts, setUserPosts] = useState<DbPost[]>([]);
  const [streak, setStreak] = useState(0);
  const [profileTab, setProfileTab] = useState<"sillages" | "seances">("sillages");
  const [aura, setAura] = useState<EtatAura | null>(null);
  const [badgeSlugs, setBadgeSlugs] = useState<Set<string>>(new Set());

  // Sticky mini-header
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowStickyHeader(window.scrollY > 160);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Action bar state
  const [selectedPost, setSelectedPost] = useState<DbPost | null>(null);

  // ── Compter une vue quand on ouvre une vidéo depuis le profil d'une personne ──
  useEffect(() => {
    if (!selectedPost || selectedPost.media_type !== "video") return;
    const id = selectedPost.id;
    void createClient().rpc("increment_post_views", { p_post_id: id });
    setUserPosts((prev) => prev.map((p) => p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost?.id]);


  const isOwnProfile = !!(user && profile && user.id === profile.id);

  // Reset scroll position when navigating to a public profile
  // useLayoutEffect runs synchronously before paint — prevents browser scroll restoration
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("id, pseudo, name, full_name, bio, avatar_url, level, goals, is_admin")
      .ilike("pseudo", username.trim())
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(data);

        // Certification (fetch défensif : la colonne is_certified peut ne pas exister)
        supabase.from("profiles").select("is_certified").eq("id", data.id).maybeSingle()
          .then(({ data: c }) => { if (c && (c as { is_certified?: boolean }).is_certified) setCertified(true); });

        const [followersRes, followingRes, sessionsRes, recentRes] = await Promise.all([
          supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", data.id),
          supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", data.id),
          supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", data.id),
          supabase.from("workout_sessions").select("id, title, started_at").eq("user_id", data.id).order("started_at", { ascending: false }).limit(3),
        ]);

        setFollowerCount(followersRes.count ?? 0);
        setFollowingCount(followingRes.count ?? 0);
        setSessionCount(sessionsRes.count ?? 0);
        if (recentRes.data) setRecentSessions(recentRes.data);

        // ── Posts de l'utilisateur ──
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, type, caption, description, media_url, media_type, performance_data, created_at, views")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (postsData) setUserPosts(postsData as unknown as DbPost[]);

        // ── Streak (jours consécutifs avec séance) ──
        const { data: streakData } = await supabase
          .from("workout_sessions")
          .select("started_at")
          .eq("user_id", data.id)
          .order("started_at", { ascending: false })
          .limit(60);
        if (streakData && streakData.length > 0) {
          const days = new Set<string>(streakData.map((s: { started_at: string }) => s.started_at.slice(0, 10)));
          let s = 0; const today = new Date();
          for (let i = 0; i < 60; i++) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            if (days.has(d.toISOString().slice(0, 10))) s++;
            else if (i > 0) break;
          }
          setStreak(s);
        }

        // ── Rang (aura) + affiches de relais débloquées ──
        void calculerAura(supabase, data.id).then(setAura).catch(() => {});
        void chargerBadges(data.id).then((slugs) => setBadgeSlugs(new Set(slugs))).catch(() => {});

        if (user && user.id !== data.id) {
          const { data: followData } = await supabase
            .from("followers")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", data.id)
            .maybeSingle();
          setIsFollowing(!!followData);
        }

        setLoading(false);
      });
  }, [username, user]);

  const handleFollow = async () => {
    if (!user || !profile || isOwnProfile) return;
    const supabase = createClient();
    setFollowLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
      if (error) { console.error("unfollow:", error); showToast("Impossible de retirer, réessaie"); setFollowLoading(false); return; }
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
      showToast("Retiré de tes amis");
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert(
          { follower_id: user.id, following_id: profile.id },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true }
        );
      if (error) { console.error("follow:", error); showToast("Impossible d'ajouter, réessaie"); setFollowLoading(false); return; }
      // Notification in-app + email via route admin (insertion unique)
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch("/api/notifications/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
        }).catch(() => {});
      });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      showToast("Ami ajouté ! 🎉");
    }

    setFollowLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
    if (isToday) return "Aujourd'hui";
    if (isYesterday) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
          style={{ background: "rgba(var(--tint-violet-rgb),0.6)" }}
        >
          👤
        </div>
        <p className="text-lg font-light" style={{ color: "var(--text-1)" }}>
          Profil introuvable
        </p>
        <p className="text-sm" style={{ color: "var(--text-3)" }}>
          @{username} n&apos;existe pas
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-2xl text-sm font-medium cursor-pointer"
          style={{
            background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)",
            color: "var(--text-1)",
          }}
        >
          Retour
        </motion.button>
      </div>
    );
  }

  const displayPseudo = profile?.pseudo ?? username;
  const displayAvatar = profile?.avatar_url ?? "";
  const initial = displayPseudo[0]?.toUpperCase() ?? "?";
  const isCertified = certified || profile?.is_admin === true;

  return (
    <div className="min-h-screen px-6 pt-10 pb-12 max-w-2xl mx-auto relative overflow-x-hidden">
      {/* Blobs */}
      <div
        className="fixed top-0 left-0 pointer-events-none -z-10"
        style={{
          width: 320,
          height: 320,
          background: "radial-gradient(circle, rgba(var(--violet-mid-rgb),0.35) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="fixed bottom-0 right-0 pointer-events-none -z-10"
        style={{
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(var(--cream-mid-rgb),0.3) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* ── Sticky mini-header (visible quand on scrolle) ── */}
      <AnimatePresence>
        {showStickyHeader && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-5 py-3 md:left-[88px]"
            style={{
              background: "rgba(250,248,255,0.92)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(var(--violet-mid-rgb),0.2)",
            }}
          >
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="flex items-center gap-1 cursor-pointer" style={{ color: "var(--text-3)" }}>
              <ArrowLeft size={15} strokeWidth={1.5} />
            </motion.button>
            <div
              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" decoding="async" src={displayAvatar} alt="" className="w-full h-full object-cover" />
                : initial}
            </div>
            <p className="text-sm font-semibold flex-1" style={{ color: "var(--text-1)" }}>@{displayPseudo}</p>
            {!isOwnProfile && user && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleFollow}
                disabled={followLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={isFollowing
                  ? { background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.2)" }
                  : { background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }
                }
              >
                {isFollowing ? "Ami" : "Ajouter"}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        whileTap={{ scale: 0.93 }}
        className="flex items-center gap-2 mb-8 cursor-pointer"
        style={{ color: "var(--text-3)" }}
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        <span className="text-sm font-medium">Retour</span>
      </motion.button>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl p-6 mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #faf8ff 0%, #fffef8 100%)",
          border: "1px solid rgba(var(--surface-rgb),0.9)",
          boxShadow: "0 4px 32px rgba(var(--accent-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),0.95)",
        }}
      >
        <motion.div
          className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(var(--violet-mid-rgb),0.35) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="flex flex-col items-center text-center relative z-10 mb-4">
          {/* Avatar */}
          <div
            className="relative mb-3"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              padding: 3,
              background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
              boxShadow: "0 6px 24px rgba(var(--accent-rgb),0.28)",
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-3xl font-semibold"
              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#F0EBFF 0%,#FFFBF0 100%)", color: "var(--text-1)" }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" decoding="async" src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span>{initial}</span>}
            </div>
          </div>

          {/* Pseudo + badge certifié */}
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-none" style={{ color: "var(--text-0)" }}>
              {displayPseudo}
            </h1>
            {isCertified && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                title="Compte certifié"
                style={{ width: 22, height: 22, background: "linear-gradient(135deg,var(--accent),#7C5CFA)", boxShadow: "0 2px 8px rgba(124,92,250,0.4)" }}
              >
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                  <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}
          </div>

          {/* Goals / titre */}
          {profile?.goals && profile.goals.length > 0 && (
            <p className="text-sm mt-1.5 font-medium" style={{ color: "var(--text-2)" }}>
              {profile.goals.join(" · ")}
            </p>
          )}

          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm mt-1.5 max-w-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
              {profile.bio}
            </p>
          )}

          {/* Level badge */}
          {profile?.level && (
            <span
              className="inline-block mt-2 text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(var(--violet-mid-rgb),0.3)", color: "#7C5CFA", border: "1px solid rgba(var(--accent-rgb),0.25)" }}
            >
              {profile.level}
            </span>
          )}
        </div>

        {/* Follow button row */}
        <div className="flex justify-center relative z-10">
          <div className="flex gap-2">

          {!isOwnProfile && user && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleFollow}
                disabled={followLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer flex-shrink-0"
                style={
                  isFollowing
                    ? {
                        background: "rgba(var(--tint-violet-rgb),0.7)",
                        color: "var(--accent)",
                        border: "1px solid rgba(var(--accent-rgb),0.2)",
                      }
                    : {
                        background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)",
                        color: "var(--text-1)",
                        boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8), 0 4px 14px rgba(var(--accent-rgb),0.25)",
                      }
                }
              >
                {isFollowing ? (
                  <><UserCheck size={13} strokeWidth={2} />Ami</>
                ) : (
                  <><UserPlus size={13} strokeWidth={2} />Ajouter</>
                )}
              </motion.button>
            </>
          )}

          {isOwnProfile && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => router.push("/profil")}
              className="px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer"
              style={{
                background: "rgba(var(--tint-violet-rgb),0.6)",
                color: "var(--accent)",
                border: "1px solid rgba(var(--accent-rgb),0.15)",
              }}
            >
              Modifier
            </motion.button>
          )}
          </div>
        </div>

        {/* ─── Rang (l'aura) ─── */}
        {aura && (
          <div
            className="flex items-center gap-4 mt-5 px-4 py-3.5 rounded-3xl relative z-10"
            style={{
              background: "rgba(var(--surface-rgb),0.8)",
              border: "1px solid rgba(var(--accent-rgb),0.14)",
              boxShadow: "0 4px 24px rgba(var(--accent-rgb),0.1)",
            }}
          >
            <div className="flex-shrink-0"><GemmeRang rang={aura.rang} size={44} /></div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--text-3)" }}>Rang</span>
              <p className="text-[19px] font-black tracking-[-0.02em] leading-tight" style={{ color: "var(--text-0)" }}>{aura.rang.nom}</p>
              <p className="text-[12.5px] font-semibold mt-0.5" style={{ color: "var(--text-soft)" }}>
                <span style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{aura.exp}</span> / {aura.seuilHaut} EXP
              </p>
              <div className="h-[7px] rounded-full mt-2 overflow-hidden" style={{ background: "rgba(var(--tint-violet-rgb),0.9)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, Math.max(4, ((aura.exp - aura.seuilBas) / Math.max(1, aura.seuilHaut - aura.seuilBas)) * 100))}%`,
                  background: "linear-gradient(90deg,#8B5CF6,#C13BC1)",
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div
          className="flex items-center mt-4 pt-4 relative z-10"
          style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.1)" }}
        >
          {([
            { label: "Amis", value: String(followingCount), tab: "Abonnements" },
            { label: "Séances", value: String(sessionCount), tab: null },
            { label: "Série", value: `🔥 ${streak}`, tab: null },
          ] as { label: string; value: string; tab: "Abonnés" | "Abonnements" | null }[]).map(({ label, value, tab }, i) => (
            <div key={label} className="flex items-center flex-1">
              {i > 0 && (
                <div
                  className="w-px self-stretch mx-2"
                  style={{ background: "rgba(var(--accent-rgb),0.15)" }}
                />
              )}
              <motion.div
                onClick={() => tab && setShowFollowList(tab)}
                whileTap={tab ? { scale: 0.94 } : undefined}
                whileHover={tab ? { backgroundColor: "rgba(var(--accent-rgb),0.07)" } : undefined}
                className={`flex-1 flex flex-col items-center py-1 rounded-xl ${tab ? "cursor-pointer" : ""}`}
              >
                <span className="text-xl font-light" style={{ color: "var(--text-1)" }}>
                  {value}
                </span>
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase mt-0.5"
                  style={{ color: "var(--text-3)" }}
                >
                  {label}
                </span>
              </motion.div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Tab switcher Posts / Séances ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 mb-4">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
          {([
            { key: "sillages", label: "Sillages", icon: Sparkles },
            { key: "seances", label: "Séances", icon: LayoutList },
          ] as const).map(({ key, label, icon: Icon }) => (
            <motion.button key={key} whileTap={{ scale: 0.96 }} onClick={() => setProfileTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              style={profileTab === key
                ? { background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
                : { color: "var(--text-3)" }
              }
            >
              <Icon size={13} strokeWidth={1.8} />
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

      {/* ── Sillages : les affiches ── */}
      {profileTab === "sillages" && (
        <motion.div key="sillages-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25 }}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
            Affiches du relais
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {(Object.keys(SERIES) as SerieSlug[]).map((slug) => {
              const serie = SERIES[slug];
              const gagnee = badgeSlugs.has(`serie-${slug}`);
              return (
                <div
                  key={slug}
                  className="relative rounded-2xl overflow-hidden"
                  style={{ aspectRatio: "9/16", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 26px -12px rgba(0,0,0,0.5)" }}
                >
                  <Image
                    src={imageEtat(slug, 4)}
                    alt={serie.nom}
                    fill
                    sizes="(max-width:768px) 45vw, 200px"
                    className="object-cover"
                    style={{ filter: gagnee ? "none" : "grayscale(1) brightness(0.5)" }}
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 45%,rgba(0,0,0,0.72))" }} />
                  {gagnee && <div className="absolute top-2.5 right-3 text-[13px] font-black" style={{ color: "rgba(255,255,255,0.9)" }}>✦</div>}
                  <div className="absolute left-3 right-3 bottom-3" style={{ color: "#fff" }}>
                    <p className="text-[14px] font-black leading-tight">{serie.nom}</p>
                    <p className="text-[10.5px] font-semibold mt-0.5" style={{ opacity: 0.75 }}>
                      {gagnee ? "Dévoilée · à deux" : serie.promesse}
                    </p>
                  </div>
                  {!gagnee && (
                    <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(10,6,18,0.42)" }}>
                      <Lock size={22} strokeWidth={2} style={{ color: "rgba(255,255,255,0.55)" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
            Ses affiches de perf
          </p>
          {(() => {
            const posters = userPosts.filter((p) => p.type === "workout" && p.performance_data);
            return posters.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="text-4xl">✦</div>
                <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>Aucune affiche pour l&apos;instant</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {posters.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: idx * 0.05 }}
                    className="cursor-pointer flex justify-center"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPost(post)}
                  >
                    <PerfShareCard data={perfDataToShare(post.performance_data as PerformanceData, { user: profile?.pseudo ?? "" })} width="100%" />
                  </motion.div>
                ))}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* ── Séances : historique ── */}
      {profileTab === "seances" && (
        <motion.div key="seances-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}>
          {recentSessions.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="text-4xl">🏋️</div>
              <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>Aucune séance enregistrée</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentSessions.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--surface-rgb),0.7)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)", backdropFilter: "blur(10px)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
                    <Dumbbell size={14} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{s.title}</p>
                    <p className="text-[11px] font-light" style={{ color: "var(--text-3)" }}>{formatDate(s.started_at)}</p>
                  </div>
                  <span className="text-[12px] font-black flex-shrink-0" style={{ color: "#2BD4A0" }}>+30</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      </AnimatePresence>

      {/* Modal post sélectionné */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl overflow-hidden overflow-y-auto"
              style={{ background: "rgba(var(--surface-rgb),0.97)", maxHeight: "90dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold"
                    style={{
                      background: displayAvatar
                        ? "transparent"
                        : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))",
                      color: "var(--text-1)",
                    }}
                  >
                    {displayAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" decoding="async" src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                      : initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>@{displayPseudo}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                      {(() => {
                        const diff = Date.now() - new Date(selectedPost.created_at).getTime();
                        const h = Math.floor(diff / 3600000);
                        const d = Math.floor(h / 24);
                        if (h < 1) return "À l'instant";
                        if (h < 24) return `${h}h`;
                        if (d < 7) return `${d}j`;
                        return new Date(selectedPost.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                      })()}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedPost(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}
                >
                  <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                </motion.button>
              </div>

              {/* Caption */}
              {selectedPost.caption && (
                <p className="px-4 pb-2 text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  {selectedPost.caption}
                </p>
              )}

              {/* Media */}
              {selectedPost.media_url && (
                <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
                  {selectedPost.media_type === "video"
                    ? <VideoPlayer src={selectedPost.media_url} maxHeight={380} controls />
                    : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async"
                        src={selectedPost.media_url}
                        alt=""
                        className="w-full object-cover rounded-2xl"
                        style={{ maxHeight: 380 }}
                      />
                    )
                  }
                </div>
              )}

              {/* Affiche de perf (posts séance) */}
              {selectedPost.type === "workout" && selectedPost.performance_data && (
                <div className="px-4 pb-4 flex justify-center">
                  <PerfShareCard
                    data={perfDataToShare(selectedPost.performance_data as PerformanceData, { user: profile?.pseudo ?? "" })}
                    width="min(320px, 100%)"
                  />
                </div>
              )}

              {selectedPost.description && (
                <p className="px-4 pb-5 text-sm font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {selectedPost.description}
                </p>
              )}
              <div className="pb-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(var(--surface-rgb),0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(var(--surface-rgb),0.9)",
              boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2)",
              whiteSpace: "nowrap",
            }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des abonnés / abonnements (cliquable depuis les stats) */}
      <AnimatePresence>
        {showFollowList && profile && (
          <FollowListModal
            type={showFollowList}
            ownerId={profile.id}
            onClose={() => setShowFollowList(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
