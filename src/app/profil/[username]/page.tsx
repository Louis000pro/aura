"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserCheck, Dumbbell, Flame, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Profile = {
  id: string;
  pseudo: string;
  name?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  level?: string;
  goals?: string[];
};

type DbSession = {
  id: string;
  title: string;
  started_at: string;
};

export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;
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
  const [toast, setToast] = useState<string | null>(null);

  const isOwnProfile = !!(user && profile && user.id === profile.id);

  useEffect(() => {
    if (!username) return;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("id, pseudo, name, full_name, bio, avatar_url, level, goals")
      .eq("pseudo", username)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(data);

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
      if (error) { showToast(`Erreur : ${error.message}`); setFollowLoading(false); return; }
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
      showToast("Abonnement annulé");
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert(
          { follower_id: user.id, following_id: profile.id },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true }
        );
      if (error) { showToast(`Erreur : ${error.message}`); setFollowLoading(false); return; }
      supabase.from("notifications").insert({
        user_id: profile.id,
        from_user_id: user.id,
        from_pseudo: user.pseudo,
        from_avatar_url: user.avatar ?? null,
        type: "follow",
      }).then(() => {}).catch(() => {});
      // Email de notification (silencieux)
      fetch("/api/notifications/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
      }).catch(() => {});
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      showToast("Abonné ! 🎉");
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
          style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
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
          style={{ background: "rgba(240,235,255,0.6)" }}
        >
          👤
        </div>
        <p className="text-lg font-light" style={{ color: "#2D3748" }}>
          Profil introuvable
        </p>
        <p className="text-sm" style={{ color: "#A0AEC0" }}>
          @{username} n&apos;existe pas
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-2xl text-sm font-medium cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
            color: "#2D3748",
          }}
        >
          Retour
        </motion.button>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.pseudo || profile?.name || username;
  const displayPseudo = profile?.pseudo ?? username;
  const displayAvatar = profile?.avatar_url ?? "";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen px-6 pt-10 pb-12 max-w-2xl mx-auto relative overflow-hidden">
      {/* Blobs */}
      <div
        className="fixed top-0 left-0 pointer-events-none -z-10"
        style={{
          width: 320,
          height: 320,
          background: "radial-gradient(circle, rgba(212,192,255,0.35) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="fixed bottom-0 right-0 pointer-events-none -z-10"
        style={{
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(245,230,163,0.3) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        whileTap={{ scale: 0.93 }}
        className="flex items-center gap-2 mb-8 cursor-pointer"
        style={{ color: "#A0AEC0" }}
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
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 4px 32px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
      >
        <motion.div
          className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(212,192,255,0.35) 0%, transparent 70%)" }}
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
              background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
              boxShadow: "0 6px 24px rgba(167,139,250,0.28)",
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-3xl font-semibold"
              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#F0EBFF 0%,#FFFBF0 100%)", color: "#2D3748" }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span>{initial}</span>}
            </div>
          </div>

          {/* Name */}
          <p className="text-xl font-semibold leading-tight" style={{ color: "#2D3748" }}>
            {displayName}
          </p>
          <p className="text-sm font-light mt-0.5" style={{ color: "#A78BFA" }}>
            @{displayPseudo}
          </p>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm mt-2 max-w-xs leading-relaxed" style={{ color: "#718096" }}>
              {profile.bio}
            </p>
          )}

          {/* Level badge */}
          {profile?.level && (
            <span
              className="inline-block mt-2 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA" }}
            >
              {profile.level}
            </span>
          )}
        </div>

        {/* Follow button row */}
        <div className="flex justify-center relative z-10">
          <div className="flex gap-2">

          {!isOwnProfile && user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleFollow}
              disabled={followLoading}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer flex-shrink-0"
              style={
                isFollowing
                  ? {
                      background: "rgba(240,235,255,0.7)",
                      color: "#A78BFA",
                      border: "1px solid rgba(167,139,250,0.2)",
                    }
                  : {
                      background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                      color: "#2D3748",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 14px rgba(167,139,250,0.25)",
                    }
              }
            >
              {isFollowing ? (
                <>
                  <UserCheck size={13} strokeWidth={2} />
                  Suivi
                </>
              ) : (
                <>
                  <UserPlus size={13} strokeWidth={2} />
                  Suivre
                </>
              )}
            </motion.button>
          )}

          {isOwnProfile && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => router.push("/profil")}
              className="px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer"
              style={{
                background: "rgba(240,235,255,0.6)",
                color: "#A78BFA",
                border: "1px solid rgba(167,139,250,0.15)",
              }}
            >
              Modifier
            </motion.button>
          )}
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex items-center mt-5 pt-4 relative z-10"
          style={{ borderTop: "1px solid rgba(167,139,250,0.1)" }}
        >
          {[
            { label: "Séances", value: String(sessionCount) },
            {
              label: "Abonnés",
              value:
                followerCount >= 1000
                  ? `${(followerCount / 1000).toFixed(1)}k`
                  : String(followerCount),
            },
            { label: "Abonnements", value: String(followingCount) },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex items-center flex-1">
              {i > 0 && (
                <div
                  className="w-px self-stretch mx-2"
                  style={{ background: "rgba(167,139,250,0.15)" }}
                />
              )}
              <div className="flex-1 flex flex-col items-center py-1">
                <span className="text-xl font-light" style={{ color: "#2D3748" }}>
                  {value}
                </span>
                <span
                  className="text-[9px] font-semibold tracking-wider uppercase mt-0.5"
                  style={{ color: "#A0AEC0" }}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Activity stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-3 mb-8"
      >
        {[
          {
            icon: Dumbbell,
            label: "Séances totales",
            value: String(sessionCount),
            color: "#A78BFA",
            bg: "linear-gradient(135deg, rgba(212,192,255,0.45) 0%, rgba(167,139,250,0.2) 100%)",
          },
          {
            icon: Flame,
            label: "Streak",
            value: "—",
            color: "#D4A843",
            bg: "linear-gradient(135deg, rgba(245,230,163,0.45) 0%, rgba(212,168,67,0.2) 100%)",
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <motion.div
            key={label}
            whileHover={{ y: -2, scale: 1.02 }}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: bg, border: "1px solid rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.6)" }}
            >
              <Icon size={18} strokeWidth={1.5} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-light leading-none" style={{ color: "#2D3748" }}>
                {value}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "#718096" }}>
                {label}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p
            className="text-[10px] font-semibold tracking-widest uppercase mb-3"
            style={{ color: "#A0AEC0" }}
          >
            Séances récentes
          </p>
          <div className="flex flex-col gap-2">
            {recentSessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(167,139,250,0.12)" }}
                >
                  <Dumbbell size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#2D3748" }}>
                    {s.title}
                  </p>
                  <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>
                    {formatDate(s.started_at)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

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
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 8px 32px rgba(167,139,250,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
