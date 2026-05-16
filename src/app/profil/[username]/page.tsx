"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, UserCheck, Dumbbell, Flame, ArrowLeft, Check,
  MessageCircle, Grid3X3, LayoutList,
  Heart, Share2, Repeat2, X, Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import VideoPlayer from "@/components/VideoPlayer";
import StoryHighlightViewer, { type HighlightItem, type HighlightViewData } from "@/components/StoryHighlightViewer";

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
  media_url: string | null;
  media_type: string | null;
  performance_data: Record<string, unknown> | null;
  created_at: string;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
  post_reposts: { user_id: string }[];
};

type ProfilComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { pseudo: string; avatar_url?: string | null } | null;
};

function InlineComments({ postId, postOwnerId }: { postId: string; postOwnerId?: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProfilComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("post_comments")
      .select("id, content, created_at, user_id, author:profiles!user_id(pseudo, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setComments((data as unknown as ProfilComment[]) ?? []);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      });
  }, [postId]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    const tmpId = `tmp-${Date.now()}`;
    setComments((prev) => [
      ...prev,
      {
        id: tmpId,
        content,
        created_at: new Date().toISOString(),
        user_id: user.id,
        author: { pseudo: user.pseudo, avatar_url: user.avatar ?? null },
      },
    ]);
    const supabase = createClient();
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, content });
    setSending(false);
    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tmpId));
      setInput(content);
    } else if (postOwnerId && postOwnerId !== user.id) {
      void supabase.from("notifications").insert({
        user_id: postOwnerId,
        from_user_id: user.id,
        from_pseudo: user.pseudo,
        from_avatar_url: user.avatar ?? null,
        type: "comment",
        post_id: postId,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(240,235,255,0.8)" }}>
        <div className="flex flex-col gap-2 mb-3 max-h-40 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-3">
              <motion.div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "#A0AEC0" }}>
              Sois le premier à commenter
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden flex-shrink-0"
                  style={{
                    background: c.author?.avatar_url
                      ? "transparent"
                      : "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                    color: "#2D3748",
                  }}
                >
                  {c.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (c.author?.pseudo?.[0] ?? "?").toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#2D3748" }}>
                    <span className="font-semibold mr-1">{c.author?.pseudo}</span>
                    <span className="font-light">{c.content}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={user ? "Ajouter un commentaire…" : "Connecte-toi"}
            disabled={!user}
            className="flex-1 text-xs outline-none px-3 py-2 rounded-xl"
            style={{
              background: "rgba(240,235,255,0.5)",
              border: "1px solid rgba(212,192,255,0.5)",
              color: "#2D3748",
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || !user || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{
              background:
                input.trim() && user
                  ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)"
                  : "rgba(240,235,255,0.5)",
            }}
          >
            <Send
              size={12}
              strokeWidth={2}
              style={{ color: input.trim() && user ? "#2D3748" : "#A0AEC0" }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

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
  const [profileStories, setProfileStories] = useState<HighlightItem[]>([]);
  const [viewingStories, setViewingStories] = useState<HighlightViewData | null>(null);
  const [userPosts, setUserPosts] = useState<DbPost[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [profileTab, setProfileTab] = useState<"posts" | "sessions">("posts");

  // Scroll-based profile bar visibility
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Action bar state
  const [selectedPost, setSelectedPost] = useState<DbPost | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [burstId, setBurstId] = useState<string | null>(null);

  const isOwnProfile = !!(user && profile && user.id === profile.id);

  // Reset scroll position when navigating to a public profile.
  // Direct scrollTop assignment bypasses CSS scroll-behavior:smooth (unlike window.scrollTo).
  useLayoutEffect(() => {
    history.scrollRestoration = "manual";
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0; // Safari fallback
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("id, pseudo, name, full_name, bio, avatar_url, level, goals, is_admin")
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

        // ── Posts de l'utilisateur ──
        const { data: postsData, count: postsCount } = await supabase
          .from("posts")
          .select("id, type, caption, media_url, media_type, performance_data, created_at, post_likes(user_id), post_comments(id), post_reposts(user_id)", { count: "exact" })
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (postsData) {
          setUserPosts(postsData as unknown as DbPost[]);
          const liked = new Set<string>();
          const reposted = new Set<string>();
          if (user) {
            (postsData as unknown as DbPost[]).forEach((p) => {
              if (p.post_likes.some((l) => l.user_id === user.id)) liked.add(p.id);
              if (p.post_reposts?.some((r) => r.user_id === user.id)) reposted.add(p.id);
            });
          }
          setLikedIds(liked);
          setRepostedIds(reposted);
        }
        setPostCount(postsCount ?? 0);

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

        if (user && user.id !== data.id) {
          const { data: followData } = await supabase
            .from("followers")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", data.id)
            .maybeSingle();
          setIsFollowing(!!followData);
        }

        // Charger les stories actives du profil
        const { data: storiesData } = await supabase
          .from("stories")
          .select("id, media_url, media_type, caption")
          .eq("user_id", data.id)
          .gt("expires_at", new Date().toISOString())
          .not("media_url", "is", null)
          .order("created_at", { ascending: true });
        if (storiesData) setProfileStories(storiesData as HighlightItem[]);

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
      void Promise.resolve(supabase.from("notifications").insert({
        user_id: profile.id,
        from_user_id: user.id,
        from_pseudo: user.pseudo,
        from_avatar_url: user.avatar ?? null,
        type: "follow",
      })).then(() => {}).catch(() => {});
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

  const toggleLike = async (postId: string) => {
    if (!user || !profile) return;
    const supabase = createClient();
    const isLiked = likedIds.has(postId);
    setLikedIds((prev) => {
      const n = new Set(prev);
      isLiked ? n.delete(postId) : n.add(postId);
      return n;
    });
    setUserPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              post_likes: isLiked
                ? p.post_likes.filter((l) => l.user_id !== user.id)
                : [...p.post_likes, { user_id: user.id }],
            }
      )
    );
    if (!isLiked) {
      setBurstId(postId);
      setTimeout(() => setBurstId(null), 700);
      await supabase
        .from("post_likes")
        .upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
      if (profile.id !== user.id) {
        void supabase.from("notifications").insert({
          user_id: profile.id,
          from_user_id: user.id,
          from_pseudo: user.pseudo,
          from_avatar_url: user.avatar ?? null,
          type: "like",
          post_id: postId,
        });
      }
    } else {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
    }
  };

  const toggleRepost = async (postId: string) => {
    if (!user || !profile) return;
    const supabase = createClient();
    const isReposted = repostedIds.has(postId);
    setRepostedIds((prev) => {
      const n = new Set(prev);
      isReposted ? n.delete(postId) : n.add(postId);
      return n;
    });
    setUserPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              post_reposts: isReposted
                ? (p.post_reposts ?? []).filter((r) => r.user_id !== user.id)
                : [...(p.post_reposts ?? []), { user_id: user.id }],
            }
      )
    );
    if (!isReposted) {
      await supabase
        .from("post_reposts")
        .upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
      if (profile.id !== user.id) {
        void supabase.from("notifications").insert({
          user_id: profile.id,
          from_user_id: user.id,
          from_pseudo: user.pseudo,
          from_avatar_url: user.avatar ?? null,
          type: "repost",
          post_id: postId,
        });
      }
      showToast("Post boosté ! 🔄");
    } else {
      await supabase
        .from("post_reposts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
    }
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

  const displayPseudo = profile?.pseudo ?? username;
  const displayAvatar = profile?.avatar_url ?? "";
  const initial = displayPseudo[0]?.toUpperCase() ?? "?";
  const isCertified = profile?.is_admin === true;

  return (
    <div className="min-h-screen px-6 pb-12 max-w-2xl mx-auto relative" style={{ paddingTop: 64 }}>
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

      {/* ── Barre de navigation permanente (toujours visible) ── */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 md:left-[88px]"
        style={{
          height: 52,
          background: scrolled ? "rgba(250,248,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(212,192,255,0.25)" : "none",
          transition: "background 0.25s ease, border-color 0.25s ease",
        }}
      >
        {/* Bouton retour — toujours visible */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 rounded-xl px-2 py-1.5"
          style={{ color: scrolled ? "#718096" : "#A0AEC0" }}
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          {!scrolled && <span className="text-sm font-medium">Retour</span>}
        </button>

        {/* Identité — apparaît quand on scrolle */}
        {scrolled && profile && (
          <>
            <div
              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                : initial}
            </div>
            <p className="text-sm font-semibold flex-1 truncate" style={{ color: "#2D3748" }}>@{displayPseudo}</p>
            {!isOwnProfile && user && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                style={isFollowing
                  ? { background: "rgba(240,235,255,0.7)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }
                  : { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }
                }
              >
                {isFollowing ? "Suivi" : "Suivre"}
              </button>
            )}
          </>
        )}
      </div>

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
          {/* Avatar — ring animé si story active */}
          <motion.div
            className="relative mb-3 cursor-pointer"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              padding: 3,
              background: profileStories.length > 0
                ? "linear-gradient(135deg,#A78BFA 0%,#F5E6A3 50%,#C4A8FF 100%)"
                : "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
              boxShadow: profileStories.length > 0
                ? "0 6px 28px rgba(167,139,250,0.5)"
                : "0 6px 24px rgba(167,139,250,0.28)",
            }}
            whileHover={{ scale: profileStories.length > 0 ? 1.05 : 1 }}
            whileTap={{ scale: profileStories.length > 0 ? 0.95 : 1 }}
            onClick={() => profileStories.length > 0 && setViewingStories({
              id: "__profile_stories__",
              name: displayPseudo,
              cover_url: profileStories[0]?.media_url,
              items: profileStories,
            })}
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
            {/* Indicateur story */}
            {profileStories.length > 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                style={{ background: "linear-gradient(135deg,#A78BFA,#F5E6A3)", color: "#3D2F6B", border: "2px solid white" }}>
                STORY
              </div>
            )}
          </motion.div>

          {/* Pseudo + badge certifié */}
          <div className="flex items-center gap-2 justify-center">
            <p className="text-xl font-semibold leading-tight" style={{ color: "#2D3748" }}>
              @{displayPseudo}
            </p>
            {isCertified && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                title="Compte certifié"
                style={{ width: 22, height: 22, background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 2px 8px rgba(124,92,250,0.4)" }}
              >
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                  <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}
          </div>

          {/* Goals / titre */}
          {profile?.goals && profile.goals.length > 0 && (
            <p className="text-sm mt-1.5 font-medium" style={{ color: "#718096" }}>
              {profile.goals.join(" · ")}
            </p>
          )}

          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm mt-1.5 max-w-xs leading-relaxed" style={{ color: "#718096" }}>
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
                        background: "rgba(240,235,255,0.7)",
                        color: "#A78BFA",
                        border: "1px solid rgba(167,139,250,0.2)",
                      }
                    : {
                        background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                        color: "#2D3748",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 14px rgba(167,139,250,0.25)",
                      }
                }
              >
                {isFollowing ? (
                  <><UserCheck size={13} strokeWidth={2} />Suivi</>
                ) : (
                  <><UserPlus size={13} strokeWidth={2} />Suivre</>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => profile && router.push(`/communaute?dm=${profile.id}&pseudo=${profile.pseudo}`)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  color: "#718096",
                  border: "1px solid rgba(212,192,255,0.4)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <MessageCircle size={13} strokeWidth={1.5} />
                Message
              </motion.button>
            </>
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
            { label: "Posts", value: String(postCount) },
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
            value: streak > 0 ? `${streak}j` : "—",
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

      {/* ── Tab switcher Posts / Séances ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 mb-4">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(167,139,250,0.12)" }}>
          {([
            { key: "posts", label: "Posts", icon: Grid3X3 },
            { key: "sessions", label: "Séances", icon: LayoutList },
          ] as const).map(({ key, label, icon: Icon }) => (
            <motion.button key={key} whileTap={{ scale: 0.96 }} onClick={() => setProfileTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              style={profileTab === key
                ? { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                : { color: "#A0AEC0" }
              }
            >
              <Icon size={13} strokeWidth={1.8} />
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

      {/* ── Posts grid ── */}
      {profileTab === "posts" && (
        <motion.div key="posts-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25 }}>
          {userPosts.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="text-4xl">📸</div>
              <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Aucun post partagé</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {userPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative rounded-2xl overflow-hidden aspect-square cursor-pointer"
                  style={{ background: post.type === "workout" ? "linear-gradient(135deg,#F0EBFF,#D4C0FF)" : post.type === "meal" ? "linear-gradient(135deg,#ECFDF5,#A7F3D0)" : "linear-gradient(135deg,#FFFBF0,#FDE68A)" }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setSelectedPost(post)}
                >
                  {post.media_url && (post.media_type === "image" || post.media_type?.startsWith("image"))
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                    : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-1">
                        <span className="text-2xl">{post.type === "workout" ? "🏋️" : post.type === "meal" ? "🥗" : "📊"}</span>
                        {post.caption && <p className="text-[9px] text-center leading-tight font-medium line-clamp-2" style={{ color: "#4A5568" }}>{post.caption}</p>}
                      </div>
                    )
                  }
                  {/* Likes overlay */}
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.35)" }}>
                    <span style={{ fontSize: 8 }}>❤️</span>
                    <span className="text-[9px] font-semibold text-white">{post.post_likes.length}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Sessions list ── */}
      {profileTab === "sessions" && (
        <motion.div key="sessions-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}>
          {recentSessions.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="text-4xl">🏋️</div>
              <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Aucune séance enregistrée</p>
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
                  style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)", backdropFilter: "blur(10px)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(167,139,250,0.12)" }}>
                    <Dumbbell size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#2D3748" }}>{s.title}</p>
                    <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>{formatDate(s.started_at)}</p>
                  </div>
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
              style={{ background: "rgba(255,255,255,0.97)", maxHeight: "90vh" }}
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
                        : "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                      color: "#2D3748",
                    }}
                  >
                    {displayAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                      : initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>@{displayPseudo}</p>
                    <p className="text-[10px]" style={{ color: "#A0AEC0" }}>
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
                  style={{ background: "rgba(240,235,255,0.8)" }}
                >
                  <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
              </div>

              {/* Caption */}
              {selectedPost.caption && (
                <p className="px-4 pb-2 text-sm font-semibold" style={{ color: "#2D3748" }}>
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
                      <img
                        src={selectedPost.media_url}
                        alt=""
                        className="w-full object-cover rounded-2xl"
                        style={{ maxHeight: 380 }}
                      />
                    )
                  }
                </div>
              )}

              {/* Action bar */}
              {(() => {
                const liked = likedIds.has(selectedPost.id);
                const reposted = repostedIds.has(selectedPost.id);
                const commentsOpen = openComments.has(selectedPost.id);
                const likesCount = selectedPost.post_likes?.length ?? 0;
                const repostsCount = selectedPost.post_reposts?.length ?? 0;
                return (
                  <>
                    <div className="flex items-center gap-4 px-4 pt-2">
                      <motion.button
                        whileTap={{ scale: 0.7 }}
                        onClick={() => toggleLike(selectedPost.id)}
                        className="relative flex items-center cursor-pointer"
                      >
                        {burstId === selectedPost.id &&
                          [0, 1, 2, 3, 4].map((i) => (
                            <motion.div
                              key={i}
                              className="absolute pointer-events-none"
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: i % 2 === 0 ? "#F43F5E" : "#FB7185",
                              }}
                              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                              animate={{
                                scale: [0, 1.2, 0],
                                x: [0, (i - 2) * 18],
                                y: [0, -20 - i * 4],
                                opacity: [1, 1, 0],
                              }}
                              transition={{ duration: 0.55, delay: i * 0.04 }}
                            />
                          ))}
                        <motion.div
                          animate={liked ? { scale: [1, 1.5, 0.9, 1.15, 1] } : { scale: 1 }}
                        >
                          <Heart
                            size={20}
                            strokeWidth={liked ? 0 : 1.5}
                            fill={liked ? "#F43F5E" : "none"}
                            style={{ color: liked ? "#F43F5E" : "#2D3748" }}
                          />
                        </motion.div>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          setOpenComments((p) => {
                            const n = new Set(p);
                            n.has(selectedPost.id) ? n.delete(selectedPost.id) : n.add(selectedPost.id);
                            return n;
                          })
                        }
                        className="cursor-pointer"
                      >
                        <MessageCircle
                          size={20}
                          strokeWidth={1.5}
                          fill={commentsOpen ? "rgba(167,139,250,0.2)" : "none"}
                          style={{ color: commentsOpen ? "#A78BFA" : "#2D3748" }}
                        />
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => toggleRepost(selectedPost.id)}
                        className="cursor-pointer"
                      >
                        <motion.div
                          animate={reposted ? { rotate: [0, 360], scale: [1, 1.3, 1] } : { rotate: 0 }}
                        >
                          <Repeat2
                            size={20}
                            strokeWidth={1.5}
                            style={{ color: reposted ? "#34D399" : "#2D3748" }}
                          />
                        </motion.div>
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.85 }} className="cursor-pointer">
                        <Share2 size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                      </motion.button>
                    </div>

                    <div className="px-4 pt-2 pb-1">
                      {likesCount > 0 && (
                        <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                          {likesCount} j&apos;aime
                          {repostsCount > 0
                            ? ` · ${repostsCount} repartage${repostsCount > 1 ? "s" : ""}`
                            : ""}
                        </p>
                      )}
                      <motion.p
                        whileHover={{ color: "#2D3748" }}
                        className="text-[11px] mt-1 cursor-pointer mb-3"
                        style={{ color: "#A0AEC0" }}
                        onClick={() =>
                          setOpenComments((p) => {
                            const n = new Set(p);
                            n.has(selectedPost.id) ? n.delete(selectedPost.id) : n.add(selectedPost.id);
                            return n;
                          })
                        }
                      >
                        {commentsOpen ? "Masquer" : "Voir les commentaires"}
                      </motion.p>
                    </div>

                    {/* Comments inline */}
                    <AnimatePresence>
                      {commentsOpen && (
                        <InlineComments postId={selectedPost.id} postOwnerId={profile?.id} />
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
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
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(10px)",
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
        {viewingStories && (
          <StoryHighlightViewer
            highlight={viewingStories}
            isOwner={false}
            onClose={() => setViewingStories(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
