"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, UserCheck, Dumbbell, ArrowLeft, Check,
  MessageCircle, Heart, Share2, Repeat2, X, Send, Camera, Film,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import VideoPlayer from "@/components/VideoPlayer";
import StoryHighlightViewer, { type HighlightItem, type HighlightViewData } from "@/components/StoryHighlightViewer";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";

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

type DbPost = {
  id: string;
  type: string;
  caption: string | null;
  description?: string | null;
  media_url: string | null;
  media_type: string | null;
  performance_data: Record<string, unknown> | null;
  created_at: string;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
  post_reposts: { user_id: string }[];
};

type Highlight = {
  id: string;
  name: string;
  cover_url: string | null;
};

type ProfilComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { pseudo: string; avatar_url?: string | null } | null;
};

function postTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

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
      { id: tmpId, content, created_at: new Date().toISOString(), user_id: user.id, author: { pseudo: user.pseudo, avatar_url: user.avatar ?? null } },
    ]);
    const supabase = createClient();
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content });
    setSending(false);
    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tmpId));
      setInput(content);
    } else if (postOwnerId && postOwnerId !== user.id) {
      void supabase.from("notifications").insert({
        user_id: postOwnerId, from_user_id: user.id, from_pseudo: user.pseudo,
        from_avatar_url: user.avatar ?? null, type: "comment", post_id: postId,
      });
      fetch("/api/notifications/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commenter_id: user.id, post_owner_id: postOwnerId, post_id: postId, comment_preview: content }),
      }).catch(() => {});
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
              <motion.div className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "#A0AEC0" }}>Sois le premier à commenter</p>
          ) : comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden flex-shrink-0"
                style={{ background: c.author?.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                {c.author?.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (c.author?.pseudo?.[0] ?? "?").toUpperCase()}
              </div>
              <p className="text-xs" style={{ color: "#2D3748" }}>
                <span className="font-semibold mr-1">{c.author?.pseudo}</span>
                <span className="font-light">{c.content}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={user ? "Ajouter un commentaire…" : "Connecte-toi"}
            disabled={!user}
            className="flex-1 text-xs outline-none px-3 py-2 rounded-xl"
            style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend}
            disabled={!input.trim() || !user || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: input.trim() && user ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(240,235,255,0.5)" }}>
            <Send size={12} strokeWidth={2} style={{ color: input.trim() && user ? "#2D3748" : "#A0AEC0" }} />
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Highlights + stories
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [profileStories, setProfileStories] = useState<HighlightItem[]>([]);
  const [viewingStories, setViewingStories] = useState<HighlightViewData | null>(null);

  // Posts
  const [userPosts, setUserPosts] = useState<DbPost[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [profileTab, setProfileTab] = useState<"posts" | "sessions">("posts");
  const [recentSessions, setRecentSessions] = useState<{ id: string; title: string; started_at: string }[]>([]);

  // Interactions
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [burstId, setBurstId] = useState<string | null>(null);

  // Scroll state for sticky header
  const [scrolled, setScrolled] = useState(false);

  const isOwnProfile = !!(user && profile && user.id === profile.id);

  // ── Scroll reset (useLayoutEffect = before paint, setTimeout = after Next.js)
  useLayoutEffect(() => {
    history.scrollRestoration = "manual";
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [username]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const id = setTimeout(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
    return () => clearTimeout(id);
  }, [username]);

  // ── Scroll listener for sticky header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Data fetch
  useEffect(() => {
    if (!username) return;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("id, pseudo, name, full_name, bio, avatar_url, level, goals, is_admin")
      .eq("pseudo", username)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        setProfile(data);

        const [followersRes, followingRes, sessionsRes, recentRes, postsRes] = await Promise.all([
          supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", data.id),
          supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", data.id),
          supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", data.id),
          supabase.from("workout_sessions").select("id, title, started_at").eq("user_id", data.id).order("started_at", { ascending: false }).limit(5),
          supabase.from("posts")
            .select("id, type, caption, description, media_url, media_type, performance_data, created_at, post_likes(user_id), post_comments(id), post_reposts(user_id)", { count: "exact" })
            .eq("user_id", data.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        setFollowerCount(followersRes.count ?? 0);
        setFollowingCount(followingRes.count ?? 0);
        void sessionsRes;
        if (recentRes.data) setRecentSessions(recentRes.data);

        if (postsRes.data) {
          setUserPosts(postsRes.data as unknown as DbPost[]);
          setPostCount(postsRes.count ?? 0);
          if (user) {
            const liked = new Set<string>();
            const reposted = new Set<string>();
            (postsRes.data as unknown as DbPost[]).forEach((p) => {
              if (p.post_likes.some((l) => l.user_id === user.id)) liked.add(p.id);
              if (p.post_reposts?.some((r) => r.user_id === user.id)) reposted.add(p.id);
            });
            setLikedIds(liked);
            setRepostedIds(reposted);
          }
        }

        // Highlights (stories à la une)
        const { data: hlData } = await supabase
          .from("highlights")
          .select("id, name, cover_url")
          .eq("user_id", data.id)
          .order("created_at", { ascending: true });
        if (hlData) setHighlights(hlData as Highlight[]);

        // Active stories
        const { data: storiesData } = await supabase
          .from("stories")
          .select("id, media_url, media_type, caption")
          .eq("user_id", data.id)
          .gt("expires_at", new Date().toISOString())
          .not("media_url", "is", null)
          .order("created_at", { ascending: true });
        if (storiesData) setProfileStories(storiesData as HighlightItem[]);

        // Follow status
        if (user && user.id !== data.id) {
          const { data: followData } = await supabase
            .from("followers").select("follower_id")
            .eq("follower_id", user.id).eq("following_id", data.id).maybeSingle();
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
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
      showToast("Abonnement annulé");
    } else {
      await supabase.from("followers").upsert({ follower_id: user.id, following_id: profile.id }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
      void supabase.from("notifications").insert({ user_id: profile.id, from_user_id: user.id, from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "follow" });
      fetch("/api/notifications/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }) }).catch(() => {});
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      showToast("Abonné ! 🎉");
    }
    setFollowLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const toggleLike = async (postId: string) => {
    if (!user || !profile) return;
    const supabase = createClient();
    const isLiked = likedIds.has(postId);
    setLikedIds((prev) => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setUserPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      post_likes: isLiked ? p.post_likes.filter((l) => l.user_id !== user.id) : [...p.post_likes, { user_id: user.id }],
    }));
    if (!isLiked) {
      setBurstId(postId); setTimeout(() => setBurstId(null), 700);
      await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
      if (profile.id !== user.id) {
        void supabase.from("notifications").insert({ user_id: profile.id, from_user_id: user.id, from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "like", post_id: postId });
        fetch("/api/notifications/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liker_id: user.id, post_owner_id: profile.id, post_id: postId }),
        }).catch(() => {});
      }
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const toggleRepost = async (postId: string) => {
    if (!user || !profile) return;
    const supabase = createClient();
    const isReposted = repostedIds.has(postId);
    setRepostedIds((prev) => { const n = new Set(prev); isReposted ? n.delete(postId) : n.add(postId); return n; });
    setUserPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      post_reposts: isReposted ? (p.post_reposts ?? []).filter((r) => r.user_id !== user.id) : [...(p.post_reposts ?? []), { user_id: user.id }],
    }));
    if (!isReposted) {
      await supabase.from("post_reposts").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
      if (profile.id !== user.id) {
        void supabase.from("notifications").insert({ user_id: profile.id, from_user_id: user.id, from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "repost", post_id: postId });
        fetch("/api/notifications/repost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reposter_id: user.id, post_owner_id: profile.id, post_id: postId }),
        }).catch(() => {});
      }
      showToast("Post boosté ! 🔄");
    } else {
      await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    if (new Date(now.getTime() - 86400000).toDateString() === d.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl" style={{ background: "rgba(240,235,255,0.6)" }}>👤</div>
        <p className="text-lg font-light" style={{ color: "#2D3748" }}>Profil introuvable</p>
        <p className="text-sm" style={{ color: "#A0AEC0" }}>@{username} n&apos;existe pas</p>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => router.back()}
          className="px-5 py-2.5 rounded-2xl text-sm font-medium cursor-pointer"
          style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748" }}>
          Retour
        </motion.button>
      </div>
    );
  }

  const displayPseudo = profile?.pseudo ?? username;
  const displayAvatar = profile?.avatar_url ?? "";
  const initial = displayPseudo[0]?.toUpperCase() ?? "?";
  const isCertified = profile?.is_admin === true;
  const hasStories = profileStories.length > 0;

  return (
    <div className="relative min-h-screen pb-28">

      {/* ── Gradient background ── */}
      <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(212,192,255,0.22) 0%, rgba(245,230,163,0.08) 60%, transparent 100%)", zIndex: 0 }} />

      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4 transition-all"
        style={{
          height: 52,
          background: scrolled ? "rgba(250,248,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(212,192,255,0.25)" : "none",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="flex items-center gap-1.5 cursor-pointer rounded-xl px-2 py-1.5"
          style={{ color: "#718096" }}
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </motion.button>

        <AnimatePresence>
          {scrolled && profile && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                {displayAvatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                  : initial}
              </div>
              <p className="text-sm font-semibold flex-1 truncate" style={{ color: "#2D3748" }}>@{displayPseudo}</p>
              {!isOwnProfile && user && (
                <motion.button whileTap={{ scale: 0.93 }} onClick={handleFollow} disabled={followLoading}
                  className="px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                  style={isFollowing
                    ? { background: "rgba(240,235,255,0.7)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }
                    : { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                  {isFollowing ? "Suivi" : "Suivre"}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Profile header ── */}
      <div className="relative z-10 px-5 md:px-8 max-w-3xl mx-auto">

        {/* Avatar + infos */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center mb-5"
        >
          {/* Avatar */}
          <motion.div
            className="relative mb-4 cursor-pointer"
            style={{
              width: 112, height: 112, borderRadius: "50%",
              padding: 3,
              background: hasStories
                ? "conic-gradient(#C4A8FF, #A78BFA, #7C5CFA, #F5E6A3, #D4A843, #C4A8FF)"
                : "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
              boxShadow: hasStories ? "0 6px 28px rgba(167,139,250,0.5)" : "0 6px 24px rgba(167,139,250,0.28)",
            }}
            whileHover={{ scale: hasStories ? 1.04 : 1 }}
            whileTap={{ scale: hasStories ? 0.96 : 1 }}
            onClick={() => hasStories && setViewingStories({
              id: "__profile_stories__", name: displayPseudo,
              cover_url: profileStories[0]?.media_url, items: profileStories,
            })}
          >
            {hasStories && (
              <motion.div className="absolute inset-0 rounded-full"
                style={{ background: "conic-gradient(#C4A8FF, #A78BFA, #7C5CFA, #F5E6A3, #D4A843, #C4A8FF)" }}
                animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
            )}
            <div className="absolute rounded-full bg-white" style={{ inset: hasStories ? 3 : 0 }} />
            <div className="absolute rounded-full overflow-hidden flex items-center justify-center text-3xl font-light"
              style={{ inset: hasStories ? 7 : 3, background: displayAvatar ? "transparent" : "linear-gradient(135deg,#F0EBFF,#FFFBF0)", color: "#7C5CFA" }}>
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span>{initial}</span>}
            </div>
            {hasStories && (
              <div className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold z-10"
                style={{ background: "linear-gradient(135deg,#A78BFA,#F5E6A3)", color: "#3D2F6B", border: "2px solid white" }}>
                STORY
              </div>
            )}
          </motion.div>

          {/* Pseudo + badge */}
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-[26px] font-black tracking-tight leading-none" style={{ color: "#1A202C" }}>
              @{displayPseudo}
            </h1>
            {isCertified && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="flex items-center justify-center rounded-full flex-shrink-0"
                title="Compte certifié"
                style={{ width: 24, height: 24, background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 2px 8px rgba(124,92,250,0.4)" }}
              >
                <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                  <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}
          </div>

          {/* Goals */}
          {profile?.goals && profile.goals.length > 0 && (
            <p className="text-sm mt-1.5 font-medium" style={{ color: "#A78BFA" }}>{profile.goals.join(" · ")}</p>
          )}

          {/* Level */}
          {profile?.level && (
            <span className="mt-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(212,192,255,0.3)", color: "#7C5CFA", border: "1px solid rgba(167,139,250,0.25)" }}>
              {profile.level}
            </span>
          )}

          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm mt-2 max-w-xs leading-relaxed font-light" style={{ color: "#718096" }}>{profile.bio}</p>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-stretch mb-4 rounded-3xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,1)",
            backdropFilter: "blur(10px)",
          }}
        >
          {[
            { label: "Posts", value: String(postCount) },
            { label: "Abonnés", value: followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}k` : String(followerCount) },
            { label: "Abonnements", value: String(followingCount) },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex items-stretch flex-1">
              {i > 0 && <div className="w-px self-stretch my-3.5" style={{ background: "rgba(212,192,255,0.3)" }} />}
              <div className="flex-1 flex flex-col items-center py-4">
                <span className="text-[22px] font-black leading-none" style={{ color: "#1A202C", letterSpacing: "-0.03em" }}>{value}</span>
                <span className="text-[9px] font-bold tracking-[0.1em] uppercase mt-1.5" style={{ color: "#A0AEC0" }}>{label}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Follow / Message buttons */}
        {!isOwnProfile && user && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex gap-2 mb-5">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.93 }}
              onClick={handleFollow} disabled={followLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer"
              style={isFollowing
                ? { background: "rgba(240,235,255,0.8)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }
                : { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748", boxShadow: "0 4px 14px rgba(167,139,250,0.25)" }}>
              {isFollowing ? <><UserCheck size={14} strokeWidth={2} />Suivi</> : <><UserPlus size={14} strokeWidth={2} />Suivre</>}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.93 }}
              onClick={() => profile && router.push(`/communaute?dm=${profile.id}&pseudo=${profile.pseudo}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer"
              style={{ background: "rgba(255,255,255,0.8)", color: "#718096", border: "1px solid rgba(212,192,255,0.4)", backdropFilter: "blur(8px)" }}>
              <MessageCircle size={14} strokeWidth={1.5} />
              Message
            </motion.button>
          </motion.div>
        )}
        {isOwnProfile && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5">
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => router.push("/profil")}
              className="w-full py-2.5 rounded-2xl text-sm font-semibold cursor-pointer"
              style={{ background: "rgba(240,235,255,0.7)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }}>
              Modifier le profil
            </motion.button>
          </motion.div>
        )}

        {/* ── Stories à la une (Highlights) ── */}
        {(highlights.length > 0 || hasStories) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Stories actives */}
            {hasStories && (
              <motion.div
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setViewingStories({ id: "__stories__", name: displayPseudo, cover_url: profileStories[0]?.media_url, items: profileStories })}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "conic-gradient(#C4A8FF, #A78BFA, #7C5CFA, #F5E6A3, #D4A843, #C4A8FF)", padding: "2.5px", boxShadow: "0 4px 18px rgba(167,139,250,0.35)" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "white", padding: "2px" }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: displayAvatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
                      {displayAvatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={displayAvatar} alt={displayPseudo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 22, fontWeight: 700, color: "#5A4A8A" }}>{initial}</span>}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: "#A0AEC0" }}>Story</span>
              </motion.div>
            )}

            {/* Highlights */}
            {highlights.map((h, i) => (
              <motion.div key={h.id}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, type: "spring", bounce: 0.4 }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <motion.div
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                  onClick={async () => {
                    const supabase = createClient();
                    const { data } = await supabase.from("highlight_items")
                      .select("id, media_url, media_type, caption")
                      .eq("highlight_id", h.id)
                      .order("display_order", { ascending: true });
                    if (data && data.length > 0) {
                      setViewingStories({ id: h.id, name: h.name, cover_url: h.cover_url, items: data as HighlightItem[] });
                    }
                  }}
                  className="cursor-pointer"
                  style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#C4A8FF 0%,#F5E6A3 100%)", padding: "2.5px", boxShadow: "0 4px 18px rgba(167,139,250,0.25)" }}
                >
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "white", padding: "2px" }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: h.cover_url ? "transparent" : "linear-gradient(135deg,rgba(212,192,255,0.5),rgba(245,230,163,0.5))", color: "#5A4A8A", fontSize: 20, fontWeight: 700 }}>
                      {h.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={h.cover_url} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : h.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </motion.div>
                <span className="text-[10px] font-semibold max-w-[68px] text-center truncate" style={{ color: "#A0AEC0" }}>{h.name}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Tab switcher ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="flex gap-1 mb-5 p-1 rounded-2xl"
          style={{ background: "rgba(240,235,255,0.6)", border: "1px solid rgba(212,192,255,0.2)" }}>
          {([
            { key: "posts" as const, icon: Camera, label: "Publications" },
            { key: "sessions" as const, icon: Dumbbell, label: "Séances" },
          ]).map(({ key, label, icon: Icon }) => (
            <motion.button key={key} whileTap={{ scale: 0.96 }} onClick={() => setProfileTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold cursor-pointer"
              animate={{
                background: profileTab === key ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "transparent",
                color: profileTab === key ? "#3D2F6B" : "#A0AEC0",
              }}
              style={{ boxShadow: profileTab === key ? "0 2px 10px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)" : "none" }}>
              <Icon size={13} strokeWidth={2} />
              {label}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">

        {/* Publications */}
        {profileTab === "posts" && (
          <motion.div key="posts-tab"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {userPosts.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85),rgba(240,235,255,0.5))", border: "1.5px dashed rgba(167,139,250,0.25)" }}>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4),rgba(245,230,163,0.35))", boxShadow: "0 8px 32px rgba(167,139,250,0.15)" }}>
                  <Camera size={28} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune publication</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Aucune publication partagée pour l&apos;instant.</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {userPosts.map((post, idx) => {
                  const liked = likedIds.has(post.id);
                  const reposted = repostedIds.has(post.id);
                  const commentsOpen = openComments.has(post.id);
                  const likesCount = post.post_likes?.length ?? 0;
                  const repostsCount = post.post_reposts?.length ?? 0;
                  const commentsCount = post.post_comments?.length ?? 0;
                  return (
                    <motion.div key={post.id}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: idx * 0.05 }}
                      className="rounded-3xl overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,1)" }}
                    >
                      {/* Header du post */}
                      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold flex-shrink-0"
                          style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                          {displayAvatar
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                            : initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>@{displayPseudo}</p>
                            {isCertified && (
                              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)" }}>
                                <svg width="8" height="8" viewBox="0 0 13 13" fill="none">
                                  <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px]" style={{ color: "#A0AEC0" }}>{postTimeAgo(post.created_at)}</p>
                        </div>
                      </div>

                      {/* Caption */}
                      {post.caption && (
                        <p className="px-4 pb-2 text-sm font-semibold leading-snug" style={{ color: "#2D3748" }}>{post.caption}</p>
                      )}

                      {/* Media */}
                      {post.media_url && (
                        <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
                          {post.media_type === "video"
                            ? <VideoPlayer src={post.media_url} maxHeight={380} controls />
                            // eslint-disable-next-line @next/next/no-img-element
                            : <img src={post.media_url} alt="" className="w-full object-cover rounded-2xl" style={{ maxHeight: 380 }} />
                          }
                        </div>
                      )}

                      {/* PerformanceCard */}
                      {post.performance_data && (["workout", "meal", "day"] as const).includes(
                        (post.performance_data as { type?: string }).type as "workout" | "meal" | "day"
                      ) && (
                        <div className="px-4 mb-3">
                          <PerformanceCard data={post.performance_data as PerformanceData} size="md" interactive />
                        </div>
                      )}

                      {/* Description */}
                      {post.description && (
                        <p className="px-4 pb-2 text-sm font-light leading-relaxed" style={{ color: "#718096" }}>{post.description}</p>
                      )}

                      {/* Action bar */}
                      <div className="flex items-center gap-4 px-4 pt-3">
                        {/* Like */}
                        <motion.button whileTap={{ scale: 0.7 }} onClick={() => toggleLike(post.id)} className="relative flex items-center cursor-pointer">
                          {burstId === post.id && [0,1,2,3,4].map((i) => (
                            <motion.div key={i} className="absolute pointer-events-none"
                              style={{ width: 5, height: 5, borderRadius: "50%", background: i % 2 === 0 ? "#F43F5E" : "#FB7185" }}
                              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                              animate={{ scale: [0,1.2,0], x: [0,(i-2)*18], y: [0,-20-i*4], opacity: [1,1,0] }}
                              transition={{ duration: 0.55, delay: i*0.04 }} />
                          ))}
                          <motion.div animate={liked ? { scale: [1,1.5,0.9,1.15,1] } : { scale: 1 }}>
                            <Heart size={20} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#F43F5E" : "none"} style={{ color: liked ? "#F43F5E" : "#2D3748" }} />
                          </motion.div>
                        </motion.button>

                        {/* Commentaire */}
                        <motion.button whileTap={{ scale: 0.85 }}
                          onClick={() => setOpenComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                          className="cursor-pointer">
                          <MessageCircle size={20} strokeWidth={1.5} fill={commentsOpen ? "rgba(167,139,250,0.2)" : "none"}
                            style={{ color: commentsOpen ? "#A78BFA" : "#2D3748" }} />
                        </motion.button>

                        {/* Repost */}
                        <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleRepost(post.id)} className="cursor-pointer">
                          <motion.div animate={reposted ? { rotate: [0,360], scale: [1,1.3,1] } : { rotate: 0 }}>
                            <Repeat2 size={20} strokeWidth={1.5} style={{ color: reposted ? "#34D399" : "#2D3748" }} />
                          </motion.div>
                        </motion.button>

                        {/* Partager */}
                        <motion.button whileTap={{ scale: 0.85 }} className="cursor-pointer">
                          <Share2 size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                        </motion.button>
                      </div>

                      {/* Stats */}
                      <div className="px-4 pt-2 pb-1">
                        {likesCount > 0 && (
                          <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                            {likesCount} j&apos;aime{repostsCount > 0 ? ` · ${repostsCount} repartage${repostsCount > 1 ? "s" : ""}` : ""}
                          </p>
                        )}
                        <motion.p whileHover={{ color: "#2D3748" }}
                          className="text-[11px] mt-1 cursor-pointer mb-3" style={{ color: "#A0AEC0" }}
                          onClick={() => setOpenComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}>
                          {commentsOpen ? "Masquer les commentaires" : commentsCount > 0 ? `Voir les ${commentsCount} commentaires` : "Ajouter un commentaire"}
                        </motion.p>
                      </div>

                      {/* Comments */}
                      <AnimatePresence>
                        {commentsOpen && <InlineComments postId={post.id} postOwnerId={profile?.id} />}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Séances */}
        {profileTab === "sessions" && (
          <motion.div key="sessions-tab"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {recentSessions.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85),rgba(240,235,255,0.5))", border: "1.5px dashed rgba(167,139,250,0.25)" }}>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4),rgba(245,230,163,0.35))" }}>
                  <Dumbbell size={28} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune séance</p>
                  <p className="text-[13px] font-light mt-2" style={{ color: "#A0AEC0" }}>Aucune séance enregistrée.</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentSessions.map((s, i) => (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)", backdropFilter: "blur(10px)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(167,139,250,0.12)" }}>
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

      {/* Videos tab (placeholder pour compatibilité future) */}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 32px rgba(167,139,250,0.2)", whiteSpace: "nowrap" }}>
            <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>{toast}</span>
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

      {/* Film tab icon needed for potential future use */}
      <div style={{ display: "none" }}><Film size={1} /></div>
      <div style={{ display: "none" }}><X size={1} /></div>
    </div>
  );
}
