"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Bell, Shield, Star, LogOut, X, Check, BellOff, Lock,
  ExternalLink, Share2, Venus, Mars, Search, UserCheck, UserPlus, Camera, ChevronRight, Plus,
  Target, Pencil, Dumbbell, Play, Clock, Globe, Users, Flame, Wind, Layers, Sparkles, Settings, Film, Heart,
  MoreHorizontal, MessageCircle, Repeat2, Bookmark, Send, Trash2,
} from "lucide-react";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import VideoPlayer from "@/components/VideoPlayer";

/* ─────────────── Tab data types ─────────────── */
type UserPost = {
  id: string;
  type: string;
  caption: string | null;
  description?: string | null;
  performance_data: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
  media_url?: string | null;
  media_type?: string | null;
  likes_count?: number;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
  post_reposts: { user_id: string }[];
};

/* ─────────────── CommentsSection ─────────────── */
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

function CommentsSection({ postId, initialCount, onClose, onCommentAdded }: { postId: string; initialCount: number; onClose: () => void; onCommentAdded?: () => void }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProfilComment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
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
    const optimistic: ProfilComment = {
      id: tmpId, content, created_at: new Date().toISOString(), user_id: user.id,
      author: { pseudo: user.pseudo, avatar_url: user.avatar ?? null },
    };
    setComments((prev) => [...prev, optimistic]);
    const supabase = createClient();
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content });
    setSending(false);
    if (error) { setComments((prev) => prev.filter((c) => c.id !== tmpId)); setInput(content); }
    else { onCommentAdded?.(); }
  };

  void onClose;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(240,235,255,0.8)" }}>
        <div className="flex flex-col gap-2.5 mb-3 max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-3">
              <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "#A0AEC0" }}>Sois le premier à commenter</p>
          ) : comments.map((c, i) => {
            const pseudo = c.author?.pseudo ?? "inconnu";
            const avatar = c.author?.avatar_url;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i < 5 ? i * 0.04 : 0 }} className="flex items-start gap-2">
                <Link href={`/profil/${pseudo}`} className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden" style={{ background: avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                    {avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={avatar} alt={pseudo} className="w-full h-full object-cover" />
                      : pseudo[0]?.toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed" style={{ color: "#2D3748" }}>
                    <Link href={`/profil/${pseudo}`}><span className="font-semibold mr-1.5 hover:underline">{pseudo}</span></Link>
                    <span className="font-light">{c.content}</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>{postTimeAgo(c.created_at)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={user ? "Ajouter un commentaire…" : "Connecte-toi pour commenter"} disabled={!user}
            className="flex-1 text-xs outline-none px-3 py-2 rounded-xl"
            style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim() || !user || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: input.trim() && user ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(240,235,255,0.5)", transition: "background 0.2s" }}>
            <Send size={12} strokeWidth={2} style={{ color: input.trim() && user ? "#2D3748" : "#A0AEC0" }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
type WorkoutSessionItem = {
  id: string;
  title: string | null;
  started_at: string | null;
  duration_minutes: number;
  elapsed_seconds: number;
};
import NotificationBell from "@/components/NotificationBell";
import StoryHighlightViewer, { type HighlightItem, type HighlightViewData } from "@/components/StoryHighlightViewer";
import WorkoutGuideModal, { type Exercise, resolveSessionId } from "@/components/WorkoutGuideModal";
import Link from "next/link";
import type { OnboardingData } from "@/components/OnboardingModal";
import { useAuth } from "@/context/AuthContext";
import { useProfileSettings } from "@/hooks/useProfileSettings";
import { createClient } from "@/lib/supabase";

/* ─────────────── Toast ─────────────── */
function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
      className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(240,235,255,0.9)",
        boxShadow: "0 8px 32px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
        color: "#2D3748",
        whiteSpace: "nowrap",
      }}
    >
      <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

/* ─────────────── Edit Profile Modal ─────────────── */
function EditProfileModal({
  pseudo, fullName, bio, avatarUrl, userId, onSave, onClose,
}: {
  pseudo: string; fullName: string; bio: string; avatarUrl?: string; userId: string;
  onSave: (pseudo: string, fullName: string, bio: string, avatarUrl: string) => void;
  onClose: () => void;
}) {
  const [editPseudo, setEditPseudo] = useState(pseudo);
  const [editFullName, setEditFullName] = useState(fullName);
  const [editBio, setEditBio] = useState(bio);
  const [previewUrl, setPreviewUrl] = useState(avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        setPreviewUrl(urlData.publicUrl + "?t=" + Date.now());
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editPseudo.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({
          pseudo: editPseudo.trim(),
          full_name: editFullName.trim(),
          bio: editBio.trim(),
          avatar_url: previewUrl || null,
        })
        .eq("id", userId);
      onSave(editPseudo.trim(), editFullName.trim(), editBio.trim(), previewUrl);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-0 md:px-4"
      style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 pb-8 md:pb-6"
        style={{
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 -12px 60px rgba(167,139,250,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center mb-4 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "#2D3748" }}>Modifier le profil</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Avatar upload */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-light cursor-pointer relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
              boxShadow: "0 4px 20px rgba(167,139,250,0.3)",
              color: "#2D3748",
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{editPseudo.charAt(0).toUpperCase() || "?"}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.75)" }}>
                <motion.div
                  className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: "rgba(167,139,250,0.3)", borderTopColor: "#A78BFA" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}
            <div
              className="absolute bottom-0 inset-x-0 h-8 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.32)" }}
            >
              <Camera size={14} strokeWidth={2} style={{ color: "white" }} />
            </div>
          </motion.div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <p className="text-xs mt-2" style={{ color: "#A0AEC0" }}>Appuie pour changer la photo</p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Full name */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>
              Nom complet
            </label>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.6)", color: "#2D3748" }}
              placeholder="Ton prénom et nom"
            />
          </div>

          {/* Pseudo */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>
              Pseudo
            </label>
            <input
              type="text"
              value={editPseudo}
              onChange={(e) =>
                setEditPseudo(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))
              }
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.6)", color: "#2D3748" }}
              placeholder="ton_pseudo"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 flex items-center justify-between" style={{ color: "#A0AEC0" }}>
              <span>Bio</span>
              <span>{editBio.length}/150</span>
            </label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value.slice(0, 150))}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
              style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.6)", color: "#2D3748" }}
              placeholder="Dis quelque chose sur toi…"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || uploading || !editPseudo.trim()}
          className="w-full mt-5 py-3.5 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
            color: "#2D3748",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 16px rgba(167,139,250,0.2)",
            opacity: saving || uploading ? 0.7 : 1,
          }}
        >
          {saving ? (
            <>
              <motion.div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: "rgba(45,55,72,0.3)", borderTopColor: "#2D3748" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              Sauvegarde…
            </>
          ) : (
            "Sauvegarder"
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Follow List Modal (vraies données Supabase) ─────────────── */
type RealFollowUser = {
  id: string;
  pseudo: string;
  full_name?: string;
  avatar_url?: string;
};

function FollowListModal({ type, userId, onClose }: { type: "Abonnés" | "Abonnements"; userId: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState<RealFollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    const fetchList = async () => {
      // Récupérer les IDs
      const col = type === "Abonnés" ? "follower_id" : "following_id";
      const filter = type === "Abonnés" ? "following_id" : "follower_id";

      const { data: rows } = await supabase
        .from("followers")
        .select(col)
        .eq(filter, userId);

      if (!rows || rows.length === 0) { setList([]); setLoading(false); return; }

      const ids = rows.map((r) => r[col] as string);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url")
        .in("id", ids);

      setList(profiles ?? []);

      // Charger aussi les abonnements actuels pour afficher le bon état du bouton
      const { data: myFollows } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId);
      setFollowingIds(new Set((myFollows ?? []).map((r) => r.following_id as string)));
      setLoading(false);
    };

    fetchList();
  }, [type, userId]);

  const handleFollow = async (profile: RealFollowUser) => {
    const supabase = createClient();
    const isF = followingIds.has(profile.id);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      isF ? next.delete(profile.id) : next.add(profile.id);
      return next;
    });
    if (isF) {
      await supabase.from("followers").delete().eq("follower_id", userId).eq("following_id", profile.id);
    } else {
      await supabase.from("followers").insert({ follower_id: userId, following_id: profile.id });
      void Promise.resolve(supabase.from("notifications").insert({ user_id: profile.id, from_user_id: userId, from_pseudo: profile.pseudo, type: "follow" })).then(() => {}).catch(() => {});
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch("/api/notifications/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ follower_id: userId, followed_id: profile.id }),
        }).catch(() => {});
      });
    }
  };

  const filtered = query.trim()
    ? list.filter((u) => (u.pseudo + (u.full_name ?? "")).toLowerCase().includes(query.toLowerCase()))
    : list;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.18)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", boxShadow: "0 -12px 48px rgba(167,139,250,0.18)", maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <h2 className="text-base font-semibold" style={{ color: "#2D3748" }}>{type}</h2>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: "rgba(0,0,0,0.06)" }}>
            <X size={14} strokeWidth={2.5} style={{ color: "#718096" }} />
          </motion.button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <Search size={13} strokeWidth={2.5} style={{ color: "#A0AEC0", flexShrink: 0 }} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: "#2D3748" }} />
          </div>
        </div>
        <div className="h-px mx-4" style={{ background: "rgba(0,0,0,0.06)" }} />
        <div className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <motion.div className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-3xl">👤</span>
              <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                {query ? "Aucun résultat" : type === "Abonnés" ? "Pas encore d'abonnés" : "Vous ne suivez personne"}
              </p>
            </div>
          ) : (
            filtered.map((u, i) => {
              const isF = followingIds.has(u.id);
              const isOwn = u.id === userId;
              return (
                <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 px-4 py-2.5">
                  <Link href={`/profil/${u.pseudo}`} onClick={onClose} className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                      style={{ background: u.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                      {u.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={u.avatar_url} alt={u.pseudo} className="w-full h-full object-cover" />
                        : (u.pseudo[0] ?? "?").toUpperCase()}
                    </div>
                  </Link>
                  <Link href={`/profil/${u.pseudo}`} onClick={onClose} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{u.full_name || u.pseudo}</p>
                    <p className="text-[11px] font-light truncate" style={{ color: "#A0AEC0" }}>@{u.pseudo}</p>
                  </Link>
                  {!isOwn && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleFollow(u)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                      style={isF
                        ? { background: "rgba(0,0,0,0.05)", color: "#718096", border: "1px solid rgba(0,0,0,0.08)" }
                        : { background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }
                      }
                    >
                      {isF ? <><UserCheck size={11} strokeWidth={2.5} />Abonné</> : <><UserPlus size={11} strokeWidth={2.5} />Suivre</>}
                    </motion.button>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
        <div className="pb-safe h-6" />
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Goals Edit Modal ─────────────── */
const GOALS_LIST = [
  { id: "masse",     label: "Prise de masse",  emoji: "💪" },
  { id: "poids",     label: "Perte de poids",  emoji: "🔥" },
  { id: "force",     label: "Force",            emoji: "🏋️" },
  { id: "endurance", label: "Endurance",        emoji: "⚡" },
  { id: "sante",     label: "Santé générale",   emoji: "🌿" },
  { id: "souplesse", label: "Souplesse",        emoji: "🧘" },
];
const LEVELS_LIST = [
  { id: "debutant",      label: "Débutant",      sub: "< 6 mois" },
  { id: "intermediaire", label: "Intermédiaire", sub: "6 mois – 2 ans" },
  { id: "avance",        label: "Avancé",        sub: "> 2 ans" },
];
const DIETS_LIST = [
  { id: "omnivore",   label: "Omnivore",    emoji: "🥩" },
  { id: "vegetarien", label: "Végétarien",  emoji: "🥗" },
  { id: "vegan",      label: "Vegan",       emoji: "🌱" },
  { id: "sansgluten", label: "Sans gluten", emoji: "🌾" },
];

function GoalsEditModal({ pseudo, onClose, onSave }: { pseudo: string; onClose: () => void; onSave: () => void }) {
  const storageKey = `aura_onboarding_${pseudo}`;
  const [data, setData] = useState<OnboardingData>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...{ age: "", height: "", weight: "", gender: "", goals: [], level: "", sessionsPerWeek: "", mealsPerDay: "", diet: "" }, ...JSON.parse(raw) };
    } catch {}
    return { age: "", height: "", weight: "", gender: "", goals: [], level: "", sessionsPerWeek: "", mealsPerDay: "", diet: "" };
  });

  const set = (key: keyof OnboardingData, val: string) => setData(d => ({ ...d, [key]: val }));
  const toggleGoal = (id: string) =>
    setData(d => ({
      ...d,
      goals: d.goals.includes(id) ? d.goals.filter(g => g !== id) : [...d.goals, id],
    }));

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(data));
    onSave();
    onClose();
  };

  const inputStyle = {
    background: "rgba(240,235,255,0.5)",
    border: "1px solid rgba(212,192,255,0.6)",
    color: "#2D3748",
  };

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2.5" style={{ color: "#A0AEC0" }}>{text}</p>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-0 md:px-4"
      style={{ background: "rgba(0,0,0,0.22)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl flex flex-col"
        style={{
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 -12px 60px rgba(167,139,250,0.18)",
          maxHeight: "90vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#2D3748" }}>Mes objectifs</h2>
            <p className="text-xs mt-0.5" style={{ color: "#A0AEC0" }}>Mise à jour de ton profil sportif</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="h-px mx-6" style={{ background: "rgba(212,192,255,0.3)" }} />

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5" style={{ scrollbarWidth: "none" }}>

          {/* Corps */}
          <div>
            {sectionLabel("Corps")}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Âge", unit: "ans", key: "age" as const, placeholder: "25" },
                { label: "Taille", unit: "cm", key: "height" as const, placeholder: "175" },
                { label: "Poids", unit: "kg", key: "weight" as const, placeholder: "70" },
              ].map(({ label, unit, key, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{label}</label>
                  <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl" style={inputStyle}>
                    <input
                      type="number"
                      value={data[key]}
                      onChange={e => set(key, e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:text-[#C4CAD4]"
                      style={{ color: "#2D3748" }}
                    />
                    <span className="text-[10px] font-medium flex-shrink-0" style={{ color: "#A0AEC0" }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Objectifs */}
          <div>
            {sectionLabel("Objectifs")}
            <div className="flex flex-wrap gap-2">
              {GOALS_LIST.map(({ id, label, emoji }) => {
                const active = data.goals.includes(id);
                return (
                  <motion.button key={id} whileTap={{ scale: 0.93 }} onClick={() => toggleGoal(id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium cursor-pointer border"
                    style={active
                      ? { background: "linear-gradient(135deg,rgba(212,192,255,0.9) 0%,rgba(245,230,163,0.9) 100%)", borderColor: "rgba(167,139,250,0.5)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }
                      : { background: "rgba(240,235,255,0.45)", borderColor: "rgba(212,192,255,0.3)", color: "#718096" }
                    }>
                    <span className="text-sm">{emoji}</span>
                    <span className="text-xs font-semibold">{label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Niveau */}
          <div>
            {sectionLabel("Niveau")}
            <div className="flex flex-col gap-2">
              {LEVELS_LIST.map(({ id, label, sub }) => {
                const active = data.level === id;
                return (
                  <motion.button key={id} whileTap={{ scale: 0.97 }} onClick={() => set("level", active ? "" : id)}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer border"
                    style={active
                      ? { background: "linear-gradient(135deg,rgba(212,192,255,0.7) 0%,rgba(245,230,163,0.7) 100%)", borderColor: "rgba(167,139,250,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                      : { background: "rgba(240,235,255,0.4)", borderColor: "rgba(212,192,255,0.25)" }
                    }>
                    <span className="text-sm font-semibold" style={{ color: active ? "#2D3748" : "#718096" }}>{label}</span>
                    <span className="text-[10px] font-medium" style={{ color: active ? "#A78BFA" : "#A0AEC0" }}>{sub}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Séances / semaine */}
          <div>
            {sectionLabel("Séances par semaine")}
            <div className="flex gap-2 flex-wrap">
              {["1","2","3","4","5","6","7"].map(n => {
                const active = data.sessionsPerWeek === n;
                return (
                  <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => set("sessionsPerWeek", active ? "" : n)}
                    className="w-11 h-11 rounded-2xl text-sm font-semibold cursor-pointer border flex items-center justify-center"
                    style={active
                      ? { background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", borderColor: "rgba(167,139,250,0.5)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                      : { background: "rgba(240,235,255,0.4)", borderColor: "rgba(212,192,255,0.25)", color: "#718096" }
                    }>
                    {n}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Repas / jour */}
          <div>
            {sectionLabel("Repas par jour")}
            <div className="flex gap-2 flex-wrap">
              {["2","3","4","5","6+"].map(n => {
                const active = data.mealsPerDay === n;
                return (
                  <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => set("mealsPerDay", active ? "" : n)}
                    className="px-4 h-10 rounded-2xl text-sm font-semibold cursor-pointer border flex items-center justify-center"
                    style={active
                      ? { background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", borderColor: "rgba(167,139,250,0.5)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                      : { background: "rgba(240,235,255,0.4)", borderColor: "rgba(212,192,255,0.25)", color: "#718096" }
                    }>
                    {n}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Régime */}
          <div>
            {sectionLabel("Régime alimentaire")}
            <div className="grid grid-cols-2 gap-2">
              {DIETS_LIST.map(({ id, label, emoji }) => {
                const active = data.diet === id;
                return (
                  <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => set("diet", active ? "" : id)}
                    className="flex items-center gap-2 px-3.5 py-3 rounded-2xl text-sm font-medium cursor-pointer border"
                    style={active
                      ? { background: "linear-gradient(135deg,rgba(212,192,255,0.8) 0%,rgba(245,230,163,0.8) 100%)", borderColor: "rgba(167,139,250,0.5)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                      : { background: "rgba(240,235,255,0.4)", borderColor: "rgba(212,192,255,0.25)", color: "#718096" }
                    }>
                    <span className="text-base">{emoji}</span>
                    <span className="text-xs font-semibold">{label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-8 pt-3 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
              color: "#2D3748",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 16px rgba(167,139,250,0.2)",
            }}
          >
            Sauvegarder
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Privacy Modal ─────────────── */
function PrivacyModal({ onClose }: { onClose: () => void }) {
  const [dataSharing, setDataSharing] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(167,139,250,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lock size={16} strokeWidth={1.5} style={{ color: "#D4A843" }} />
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Confidentialité</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: "Partage de données", desc: "Partager vos stats avec la communauté", state: dataSharing, toggle: () => setDataSharing(v => !v) },
            { label: "Analytiques", desc: "Améliorer l'app avec vos données anonymisées", state: analytics, toggle: () => setAnalytics(v => !v) },
          ].map(({ label, desc, state, toggle }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(240,235,255,0.4)" }}>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
                <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>{desc}</p>
              </div>
              <motion.button
                onClick={toggle}
                className="relative w-11 h-6 rounded-full cursor-pointer flex-shrink-0"
                style={{ background: state ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "rgba(220,220,220,0.6)" }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ x: state ? 20 : 2 }}
                  transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                  className="absolute top-1 w-4 h-4 rounded-full"
                  style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                />
              </motion.button>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-4 text-center" style={{ color: "#A0AEC0" }}>Conforme au RGPD · Données hébergées en France</p>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Published session types ─────────────── */
type PublishedSession = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  duration: number;
  difficulty: string;
  exercises: number;
  muscles: string[];
  accent: string;
  icon: string;
  exercise_list: Exercise[];
  visibility: "friends" | "public";
};

const PROF_ICON_MAP: Record<string, typeof Dumbbell> = { Dumbbell, Flame, Wind, Layers, Sparkles };
const resolveProfileIcon = (name: string): typeof Dumbbell => PROF_ICON_MAP[name] ?? Dumbbell;

const PROF_DIFF_COLOR: Record<string, string> = {
  "Débutant": "#34D399", "Intermédiaire": "#FBBF24", "Avancé": "#A78BFA",
};

const VIS_LABELS: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  friends: { label: "Amis",   icon: Users,  color: "#60A5FA" },
  public:  { label: "Public", icon: Globe,  color: "#34D399" },
};

type Highlight = { id: string; name: string; cover_url: string; user_id?: string };

/* ─────────────── Create Highlight Modal ─────────────── */
function NewHighlightModal({ userId, onCreated, onClose }: {
  userId: string;
  onCreated: (h: Highlight) => void;
  onClose: () => void;
}) {
  const [name, setName]         = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext  = file.name.split(".").pop();
      const path = `${userId}/highlight_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setCoverUrl(data.publicUrl + "?t=" + Date.now());
      }
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("highlights")
        .insert({ user_id: userId, name: name.trim(), cover_url: coverUrl || null })
        .select("id, name, cover_url, user_id")
        .single();
      if (!error && data) {
        onCreated(data as Highlight);
      }
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 pb-8"
        style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 -12px 60px rgba(167,139,250,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-5 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black tracking-tight" style={{ color: "#1A202C" }}>Nouvelle catégorie</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Cover */}
        <div className="flex flex-col items-center mb-6">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => coverRef.current?.click()}
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
            style={{ background: coverUrl ? "transparent" : "linear-gradient(135deg,rgba(212,192,255,0.4),rgba(245,230,163,0.4))" }}>
            {coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
              : uploading
              ? <div className="text-xs font-medium" style={{ color: "#A78BFA" }}>Upload…</div>
              : <div className="flex flex-col items-center gap-1">
                  <Camera size={20} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                  <span className="text-[9px] font-semibold" style={{ color: "#A78BFA" }}>Cover</span>
                </div>
            }
          </motion.div>
          <input ref={coverRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleCover} />
          <p className="text-[11px] mt-2 font-light" style={{ color: "#A0AEC0" }}>Photo de couverture (optionnel)</p>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="text-[10px] font-bold tracking-widest uppercase mb-2 block" style={{ color: "#A0AEC0" }}>Nom</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Sport, Voyage, Nutrition…" maxLength={24}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: "rgba(240,235,255,0.55)", border: "1px solid rgba(167,139,250,0.2)", color: "#1A202C" }}
          />
        </div>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!name.trim() || saving || uploading}
          className="w-full py-3.5 rounded-2xl text-sm font-black tracking-tight cursor-pointer"
          style={{
            background: name.trim() ? "linear-gradient(135deg,#C4A8FF 0%,#F5E6A3 100%)" : "rgba(220,220,220,0.5)",
            color: name.trim() ? "#3D2F6B" : "#A0AEC0",
            boxShadow: name.trim() ? "0 4px 18px rgba(167,139,250,0.3)" : "none",
            opacity: saving || uploading ? 0.7 : 1,
          }}>
          {saving ? "Création…" : "Créer la catégorie"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Edit Highlight Modal (médias, rename, delete) ─────────────── */
function EditHighlightModal({ highlight, userId, onUpdated, onDeleted, onClose }: {
  highlight: Highlight;
  userId: string;
  onUpdated: (h: Highlight) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [name, setName]           = useState(highlight.name);
  const [coverUrl, setCoverUrl]   = useState(highlight.cover_url ?? "");
  const [items, setItems]         = useState<HighlightItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  /* Load items */
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("highlight_items")
      .select("id, media_url, media_type, caption")
      .eq("highlight_id", highlight.id)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setItems((data ?? []) as HighlightItem[]);
        setLoadingItems(false);
      });
  }, [highlight.id]);

  /* Cover upload */
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext  = file.name.split(".").pop();
      const path = `${userId}/highlight_cover_${highlight.id}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setCoverUrl(data.publicUrl + "?t=" + Date.now());
      }
    } finally { setUploading(false); }
  };

  /* Add media items */
  const handleAddMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 50 - items.length);
    if (!files.length) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const newItems: HighlightItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext  = file.name.split(".").pop();
        const isVid = file.type.startsWith("video/");
        const path = `${userId}/hi_${highlight.id}_${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (error) continue;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        const order = items.length + newItems.length;
        const { data: inserted } = await supabase
          .from("highlight_items")
          .insert({
            highlight_id: highlight.id,
            media_url: urlData.publicUrl + "?t=" + Date.now(),
            media_type: isVid ? "video" : "image",
            display_order: order,
          })
          .select("id, media_url, media_type, caption")
          .single();
        if (inserted) newItems.push(inserted as HighlightItem);
      }
      setItems((prev) => [...prev, ...newItems]);
      // Update cover if first item and no cover
      if (!coverUrl && newItems[0]) {
        await supabase.from("highlights").update({ cover_url: newItems[0].media_url }).eq("id", highlight.id);
        setCoverUrl(newItems[0].media_url);
      }
    } finally { setUploading(false); if (mediaRef.current) mediaRef.current.value = ""; }
  };

  /* Delete item */
  const handleDeleteItem = async (itemId: string) => {
    const supabase = createClient();
    await supabase.from("highlight_items").delete().eq("id", itemId);
    const remaining = items.filter((i) => i.id !== itemId);
    setItems(remaining);
    // Update cover if deleted item was cover
    if (remaining.length > 0 && coverUrl.includes(itemId)) {
      await supabase.from("highlights").update({ cover_url: remaining[0].media_url }).eq("id", highlight.id);
      setCoverUrl(remaining[0].media_url);
    }
  };

  /* Save info (name + cover) */
  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("highlights").update({ name: name.trim(), cover_url: coverUrl || null }).eq("id", highlight.id);
      onUpdated({ ...highlight, name: name.trim(), cover_url: coverUrl });
    } finally { setSaving(false); }
  };

  /* Delete highlight */
  const handleDelete = async () => {
    const supabase = createClient();
    await supabase.from("highlights").delete().eq("id", highlight.id);
    onDeleted();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl flex flex-col"
        style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 -12px 60px rgba(167,139,250,0.2)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 flex-shrink-0">
          <h2 className="text-base font-black tracking-tight" style={{ color: "#1A202C" }}>Modifier la catégorie</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: "none" }}>

          {/* Name + Cover row */}
          <div className="flex items-center gap-4 mb-5">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => coverRef.current?.click()}
              className="w-[60px] h-[60px] rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer"
              style={{ background: coverUrl ? "transparent" : "linear-gradient(135deg,rgba(212,192,255,0.4),rgba(245,230,163,0.4))" }}>
              {coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
                : <Camera size={16} strokeWidth={1.5} style={{ color: "#A78BFA" }} />}
            </motion.div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            <div className="flex-1">
              <label className="text-[9px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "#A0AEC0" }}>Nom</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={24}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(240,235,255,0.55)", border: "1px solid rgba(167,139,250,0.2)", color: "#1A202C" }} />
            </div>
          </div>

          {/* Media grid */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
              Médias ({items.length}/50)
            </span>
            {items.length < 50 && (
              <motion.button whileTap={{ scale: 0.93 }} onClick={() => mediaRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.7),rgba(245,230,163,0.7))", color: "#3D2F6B" }}>
                <Plus size={11} strokeWidth={3} />
                {uploading ? "Upload…" : "Ajouter"}
              </motion.button>
            )}
          </div>
          <input ref={mediaRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleAddMedia} />

          {loadingItems ? (
            <div className="flex justify-center py-8">
              <motion.div className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : items.length === 0 ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => mediaRef.current?.click()}
              className="w-full py-10 rounded-2xl flex flex-col items-center gap-3 cursor-pointer"
              style={{ border: "2px dashed rgba(167,139,250,0.3)", background: "rgba(240,235,255,0.2)" }}>
              <Plus size={24} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
              <span className="text-sm font-medium" style={{ color: "#A78BFA" }}>Ajouter des photos / vidéos</span>
              <span className="text-xs font-light" style={{ color: "#A0AEC0" }}>Jusqu&apos;à 50 médias</span>
            </motion.button>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {items.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  {item.media_type === "video"
                    ? <video src={item.media_url} className="w-full h-full object-cover" muted playsInline />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={item.media_url} alt="" className="w-full h-full object-cover" />}
                  <motion.button
                    onClick={() => handleDeleteItem(item.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <X size={9} strokeWidth={3} style={{ color: "white" }} />
                  </motion.button>
                  {item.media_type === "video" && (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(0,0,0,0.55)", color: "white" }}>
                      VID
                    </div>
                  )}
                </div>
              ))}
              {items.length < 50 && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => mediaRef.current?.click()}
                  className="aspect-square rounded-xl flex items-center justify-center cursor-pointer"
                  style={{ border: "2px dashed rgba(167,139,250,0.35)", background: "rgba(240,235,255,0.2)" }}>
                  <Plus size={18} strokeWidth={1.8} style={{ color: "#A78BFA" }} />
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 flex-shrink-0 flex flex-col gap-2">
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full py-3.5 rounded-2xl text-sm font-black tracking-tight cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#C4A8FF 0%,#F5E6A3 100%)",
              color: "#3D2F6B",
              boxShadow: "0 4px 18px rgba(167,139,250,0.3)",
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </motion.button>

          {!delConfirm ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDelConfirm(true)}
              className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer"
              style={{ color: "#E53E3E", background: "rgba(229,62,62,0.06)", border: "1px solid rgba(229,62,62,0.15)" }}>
              Supprimer la catégorie
            </motion.button>
          ) : (
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDelConfirm(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                style={{ background: "rgba(240,235,255,0.8)", color: "#718096" }}>
                Annuler
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl text-sm font-bold cursor-pointer"
                style={{ background: "#E53E3E", color: "white" }}>
                Confirmer
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Main Page ─────────────── */
export default function ProfilPage() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"performances" | "seances" | "reglages" | "enregistres">("performances");
  const [showEdit, setShowEdit] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"Abonnés" | "Abonnements" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showNewHighlight, setShowNewHighlight] = useState(false);
  const [editHighlight, setEditHighlight]   = useState<Highlight | null>(null);
  const [viewingHighlight, setViewingHighlight] = useState<HighlightViewData | null>(null);
  const [viewerLoading, setViewerLoading]   = useState(false);
  const [highlights, setHighlights]         = useState<Highlight[]>([]);
  const [activeStories, setActiveStories]   = useState<HighlightItem[]>([]);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [profilePseudo, setProfilePseudo] = useState(user?.pseudo ?? "");
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar ?? "");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileGoals, setProfileGoals] = useState<string[]>([]);
  const [profileLevel, setProfileLevel] = useState<string>("");
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number>(0);
  const [showGoals, setShowGoals] = useState(false);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<UserPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(new Set());
  const [openPostComments, setOpenPostComments] = useState<Set<string>>(new Set());
  const [burstPostId, setBurstPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const [editingSelectedPost, setEditingSelectedPost] = useState(false);
  const [profileWorkout, setProfileWorkout] = useState<{
    sessionId: string; title: string; accent: string; duration: number;
    difficulty: string; category: string; exerciseList: Exercise[];
  } | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionItem[]>([]);
  const { settings, updateSettings } = useProfileSettings();

  /* Fetch highlights + active stories from Supabase */
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    // Highlights
    supabase
      .from("highlights")
      .select("id, name, cover_url, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setHighlights(data as Highlight[]); });

    // Toutes les stories actives (photo, vidéo, texte, repas, séance) — ring + viewer
    void Promise.resolve(
      supabase
        .from("stories")
        .select("id, media_url, media_type, caption, content_type, content_data")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
    ).then(({ data }) => {
      if (data) {
        setActiveStories(data as HighlightItem[]);
        setHasActiveStory(data.length > 0);
      }
    }).catch(() => {});
  }, [user?.id]);

  /* Open highlight viewer — loads items lazily */
  const openHighlightViewer = async (h: Highlight) => {
    setViewerLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("highlight_items")
      .select("id, media_url, media_type, caption")
      .eq("highlight_id", h.id)
      .order("display_order", { ascending: true });
    setViewingHighlight({ id: h.id, name: h.name, cover_url: h.cover_url, items: (data ?? []) as HighlightItem[] });
    setViewerLoading(false);
  };

  /* Delete viewer item — update items list live */
  const handleViewerDeleteItem = async (itemId: string) => {
    if (!viewingHighlight) return;
    const supabase = createClient();
    // "__stories__" = story propre de l'utilisateur → supprimer dans la table stories
    if (viewingHighlight.id === "__stories__") {
      await supabase.from("stories").delete().eq("id", itemId);
      // Refresh activeStories state too
      setActiveStories((prev) => prev.filter((s) => s.id !== itemId));
      if (activeStories.length <= 1) setHasActiveStory(false);
    } else {
      await supabase.from("highlight_items").delete().eq("id", itemId);
    }
    setViewingHighlight((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : null);
  };

  /* Fetch profile + stats */
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("pseudo, avatar_url, full_name, bio")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.pseudo) setProfilePseudo(data.pseudo);
          if (data.avatar_url) setProfileAvatar(data.avatar_url);
          if (data.full_name) setProfileFullName(data.full_name);
          if (data.bio) setProfileBio(data.bio);
        }
      });

    Promise.all([
      supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([f1, f2, f3, f4]) => {
      setFollowerCount(f1.count ?? 0);
      setFollowingCount(f2.count ?? 0);
      setSessionCount(f3.count ?? 0);
      setPostCount(f4.count ?? 0);
    });

    // Temps réel — mise à jour du compteur publications
    const supabaseRT = createClient();
    const channel = supabaseRT
      .channel("post-count")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "posts",
        filter: `user_id=eq.${user.id}`,
      }, async () => {
        const { count } = await supabaseRT
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        setPostCount(count ?? 0);
      })
      .subscribe();

    return () => { supabaseRT.removeChannel(channel).catch(() => {}); };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    // Publications : posts de l'utilisateur
    supabase
      .from("posts")
      .select("id, type, caption, description, performance_data, created_at, user_id, media_url, media_type, post_likes(user_id), post_comments(id), post_reposts(user_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error("posts query error:", error.message); return; }
        if (data) {
          const posts = (data as unknown as UserPost[]).map((p) => ({
            ...p,
            post_likes: p.post_likes ?? [],
            post_comments: p.post_comments ?? [],
            post_reposts: p.post_reposts ?? [],
            likes_count: p.post_likes?.length ?? 0,
          }));
          setUserPosts(posts);
          // Initialiser les sets de likes/reposts
          const liked = new Set<string>();
          const reposted = new Set<string>();
          posts.forEach((p) => {
            if (p.post_likes.some((l) => l.user_id === user.id)) liked.add(p.id);
            if (p.post_reposts.some((r) => r.user_id === user.id)) reposted.add(p.id);
          });
          setLikedPostIds(liked);
          setRepostedPostIds(reposted);
        }
      });

    // Vidéos enregistrées depuis post_saves (distinct des likes)
    supabase
      .from("post_saves")
      .select("post_id, posts!post_id(id, type, caption, performance_data, created_at, user_id, media_url, media_type)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const posts = data.map((d: { posts: UserPost }) => d.posts).filter(Boolean);
          setSavedPosts(posts);
        }
      });

    // Séances enregistrées : workout sessions
    supabase
      .from("workout_sessions")
      .select("id, title, started_at, duration_minutes, elapsed_seconds")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setWorkoutSessions(data as WorkoutSessionItem[]); });

    // ── Temps réel : likes / commentaires / reposts ──
    const rt = createClient();

    // Quelqu'un like un post de l'utilisateur
    const likesChannel = rt.channel("profile-post-likes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_likes" }, (payload) => {
        const { post_id, user_id } = payload.new as { post_id: string; user_id: string };
        setUserPosts((prev) => prev.map((p) => p.id !== post_id ? p : {
          ...p,
          post_likes: p.post_likes.some((l) => l.user_id === user_id) ? p.post_likes : [...p.post_likes, { user_id }],
          likes_count: (p.likes_count ?? p.post_likes.length) + 1,
        }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_likes" }, (payload) => {
        const { post_id, user_id } = payload.old as { post_id: string; user_id: string };
        setUserPosts((prev) => prev.map((p) => p.id !== post_id ? p : {
          ...p,
          post_likes: p.post_likes.filter((l) => l.user_id !== user_id),
          likes_count: Math.max(0, (p.likes_count ?? p.post_likes.length) - 1),
        }));
      })
      .subscribe();

    // Quelqu'un commente un post de l'utilisateur
    const commentsChannel = rt.channel("profile-post-comments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments" }, (payload) => {
        const { post_id, id } = payload.new as { post_id: string; id: string };
        setUserPosts((prev) => prev.map((p) => p.id !== post_id ? p : {
          ...p,
          post_comments: p.post_comments.some((c) => c.id === id) ? p.post_comments : [...p.post_comments, { id }],
        }));
      })
      .subscribe();

    // Quelqu'un reposte un post de l'utilisateur
    const repostsChannel = rt.channel("profile-post-reposts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_reposts" }, (payload) => {
        const { post_id, user_id } = payload.new as { post_id: string; user_id: string };
        setUserPosts((prev) => prev.map((p) => p.id !== post_id ? p : {
          ...p,
          post_reposts: p.post_reposts.some((r) => r.user_id === user_id) ? p.post_reposts : [...p.post_reposts, { user_id }],
        }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_reposts" }, (payload) => {
        const { post_id, user_id } = payload.old as { post_id: string; user_id: string };
        setUserPosts((prev) => prev.map((p) => p.id !== post_id ? p : {
          ...p,
          post_reposts: p.post_reposts.filter((r) => r.user_id !== user_id),
        }));
      })
      .subscribe();

    return () => {
      rt.removeChannel(likesChannel).catch(() => {});
      rt.removeChannel(commentsChannel).catch(() => {});
      rt.removeChannel(repostsChannel).catch(() => {});
    };
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const togglePostLike = async (postId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isLiked = likedPostIds.has(postId);
    setLikedPostIds((prev) => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setUserPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      post_likes: isLiked ? p.post_likes.filter((l) => l.user_id !== user.id) : [...p.post_likes, { user_id: user.id }],
      likes_count: isLiked ? (p.likes_count ?? 1) - 1 : (p.likes_count ?? 0) + 1,
    }));
    if (!isLiked) {
      setBurstPostId(postId);
      setTimeout(() => setBurstPostId(null), 700);
      await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const togglePostRepost = async (postId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isReposted = repostedPostIds.has(postId);
    setRepostedPostIds((prev) => { const n = new Set(prev); isReposted ? n.delete(postId) : n.add(postId); return n; });
    setUserPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      post_reposts: isReposted ? p.post_reposts.filter((r) => r.user_id !== user.id) : [...p.post_reposts, { user_id: user.id }],
    }));
    if (!isReposted) {
      await supabase.from("post_reposts").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
      showToast("Post boosté ! 🔄");
    } else {
      await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/auth");
  };

  const handleSaveProfile = (newPseudo: string, newFullName: string, newBio: string, newAvatar: string) => {
    setProfilePseudo(newPseudo);
    setProfileFullName(newFullName);
    setProfileBio(newBio);
    setProfileAvatar(newAvatar);
    setShowEdit(false);
    showToast("Profil mis à jour ✓");
    // Rafraîchit le user dans le contexte (nav, initiale, avatar partout)
    void refreshProfile();
  };

  const handleHighlightCreated = (h: Highlight) => {
    setHighlights((prev) => [...prev, h]);
    setShowNewHighlight(false);
    showToast("Catégorie créée ✓");
    // Open edit immediately so user can add media
    setEditHighlight(h);
  };

  const handleHighlightUpdated = (updated: Highlight) => {
    setHighlights((prev) => prev.map((h) => h.id === updated.id ? updated : h));
    setEditHighlight(null);
    showToast("Catégorie modifiée ✓");
  };

  const handleHighlightDeleted = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    setEditHighlight(null);
    showToast("Catégorie supprimée");
  };

  const displayPseudo = profilePseudo || user?.pseudo || "";
  const displayAvatar = profileAvatar || user?.avatar || "";

  const refreshGoals = () => {
    const pseudo = displayPseudo;
    if (!pseudo) return;
    try {
      const raw = localStorage.getItem(`aura_onboarding_${pseudo}`);
      if (raw) {
        const d = JSON.parse(raw) as { goals?: string[]; level?: string };
        setProfileGoals(Array.isArray(d.goals) ? d.goals : []);
        setProfileLevel(d.level ?? "");
      }
    } catch {}
  };

  // Charge les objectifs depuis le localStorage quand le pseudo est disponible
  useEffect(() => {
    refreshGoals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPseudo]);

  return (
    <div className="relative min-h-screen pb-28">

      {/* ─── Gradient background blob ─── */}
      <div
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(212,192,255,0.22) 0%, rgba(245,230,163,0.08) 60%, transparent 100%)",
          zIndex: 0,
        }}
      />

      {/* ─── Notifs + Settings — top RIGHT ─── */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <NotificationBell side="top" />
        <Link href="/parametres">
          <motion.div
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(212,192,255,0.45)",
              boxShadow: "0 2px 14px rgba(167,139,250,0.15)",
            }}
          >
            <Settings size={15} strokeWidth={1.6} style={{ color: "#A78BFA" }} />
          </motion.div>
        </Link>
      </div>

      {/* ─── Header ─── */}
      <div className="relative z-10 pt-12 px-5 md:px-8 max-w-3xl mx-auto">

        {/* Avatar + pseudo + bio */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center mb-6"
        >
          {/* Avatar — container 120x120, crayon en badge bottom-right en dehors */}
          <div className="relative mb-4" style={{ width: 120, height: 120 }}>
            {/* Cercle avatar cliquable */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => hasActiveStory
                ? setViewingHighlight({ id: "__stories__", name: "Ma story", cover_url: activeStories[0]?.media_url ?? null, items: activeStories })
                : setShowEdit(true)}
              className="absolute inset-0 cursor-pointer rounded-full"
            >
              {/* Ring rotatif story */}
              {hasActiveStory && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: "conic-gradient(#C4A8FF, #A78BFA, #7C5CFA, #F5E6A3, #D4A843, #C4A8FF)" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}
              {/* Séparateur blanc */}
              <div className="absolute rounded-full bg-white" style={{ inset: hasActiveStory ? 3 : 0 }} />
              {/* Photo */}
              <div
                className="absolute rounded-full overflow-hidden flex items-center justify-center text-4xl"
                style={{
                  inset: hasActiveStory ? 7 : 3,
                  background: displayAvatar ? "transparent" : "linear-gradient(135deg,#F0EBFF,#FFFBF0)",
                  color: "#7C5CFA",
                  fontWeight: 300,
                  boxShadow: hasActiveStory ? "none" : "0 12px 40px rgba(167,139,250,0.35)",
                }}
              >
                {displayAvatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span>{displayPseudo.charAt(0).toUpperCase() || "?"}</span>}
              </div>
            </motion.div>

            {/* Crayon — badge bottom-right, légèrement en dehors du cercle */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowEdit(true)}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: 32, height: 32,
                bottom: -6, right: -6,
                background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                boxShadow: "0 3px 12px rgba(167,139,250,0.45)",
                border: "3px solid white",
                zIndex: 30,
              }}
            >
              <Pencil size={13} strokeWidth={2.3} style={{ color: "#3D2F6B" }} />
            </motion.button>
          </div>

          {/* Pseudo + badge vérifié */}
          <div className="flex items-center gap-2">
            <h1
              className="text-[28px] font-black tracking-[-0.03em] leading-none"
              style={{ color: "#1A202C" }}
            >
              {displayPseudo}
            </h1>
            {(user?.is_admin || user?.email === "teyprox@gmail.com") && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
                title="Compte certifié"
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 24, height: 24,
                  background: "linear-gradient(135deg,#A78BFA,#7C5CFA)",
                  boxShadow: "0 2px 8px rgba(124,92,250,0.4)",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}
          </div>

          {/* Goals / titre */}
          {profileGoals.length > 0 && (
            <p className="text-[12px] font-semibold mt-1.5 max-w-[260px]" style={{ color: "#A78BFA" }}>
              {profileGoals
                .map((id) => GOALS_LIST.find((g) => g.id === id))
                .filter(Boolean)
                .map((g) => `${g!.emoji} ${g!.label}`)
                .join(" · ")}
            </p>
          )}

          {/* Niveau */}
          {profileLevel && (
            <span
              className="mt-1 text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(212,192,255,0.3)", color: "#7C5CFA", border: "1px solid rgba(167,139,250,0.25)" }}
            >
              {LEVELS_LIST.find((l) => l.id === profileLevel)?.label ?? profileLevel}
            </span>
          )}

          {/* Bio */}
          {profileBio && (
            <p className="text-[13px] mt-2 max-w-[240px] leading-relaxed font-light" style={{ color: "#718096" }}>
              {profileBio}
            </p>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="flex items-stretch mb-3 rounded-3xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,1)",
            backdropFilter: "blur(10px)",
          }}
        >
          {[
            { label: "Publications", value: String(postCount), clickable: false },
            { label: "Abonnés", value: followerCount !== null ? String(followerCount) : "0", clickable: true },
            { label: "Abonnements", value: followingCount !== null ? String(followingCount) : "0", clickable: true },
          ].map(({ label, value, clickable }, i) => (
            <div key={label} className="flex items-stretch flex-1">
              {i > 0 && (
                <div className="w-px self-stretch my-3.5" style={{ background: "rgba(212,192,255,0.3)" }} />
              )}
              <motion.button
                whileHover={clickable ? { scale: 1.05 } : {}}
                whileTap={clickable ? { scale: 0.94 } : {}}
                onClick={() => { if (clickable) setShowFollowList(label as "Abonnés" | "Abonnements"); }}
                className="flex-1 flex flex-col items-center py-4"
                style={{ cursor: clickable ? "pointer" : "default" }}
              >
                <span className="text-[24px] font-black leading-none" style={{ color: "#1A202C", letterSpacing: "-0.03em" }}>
                  {value}
                </span>
                <span className="text-[9px] font-bold tracking-[0.12em] uppercase mt-1.5" style={{ color: clickable ? "#A78BFA" : "#B0BBCA" }}>
                  {label}
                </span>
              </motion.button>
            </div>
          ))}
        </motion.div>

        {/* ─── Stories à la une ─── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="flex items-center gap-4 mb-5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Bouton Nouveau */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowNewHighlight(true)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <div
              className="w-[68px] h-[68px] rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "2px dashed rgba(167,139,250,0.45)",
                boxShadow: "0 3px 14px rgba(167,139,250,0.1)",
              }}
            >
              <Plus size={24} strokeWidth={1.6} style={{ color: "#A78BFA" }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: "#A0AEC0", letterSpacing: "0.02em" }}>Nouveau</span>
          </motion.button>

          {/* Highlights créés */}
          {highlights.map((h, i) => (
            <motion.div
              key={h.id}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, type: "spring", bounce: 0.4 }}
            >
              {/* Circle — tap = open viewer */}
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => openHighlightViewer(h)}
                  className="cursor-pointer"
                  style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#C4A8FF 0%,#F5E6A3 100%)", padding: "2.5px", boxShadow: "0 4px 18px rgba(167,139,250,0.25)" }}
                >
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "white", padding: "2px" }}>
                    <div
                      style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: h.cover_url ? "transparent" : "linear-gradient(135deg,rgba(212,192,255,0.5),rgba(245,230,163,0.5))", color: "#5A4A8A", fontSize: 20, fontWeight: 700 }}
                    >
                      {h.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={h.cover_url} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : h.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </motion.div>
                {/* Loading spinner */}
                {viewerLoading && (
                  <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)" }}>
                    <motion.div className="w-5 h-5 rounded-full border-2"
                      style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                  </div>
                )}
                {/* Pencil badge — tap = edit */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); setEditHighlight(h); }}
                  className="absolute -bottom-0.5 -right-0.5 w-[20px] h-[20px] rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#C4A8FF,#F5E6A3)", border: "2.5px solid white", boxShadow: "0 1px 6px rgba(167,139,250,0.4)" }}
                >
                  <Pencil size={8} strokeWidth={3} style={{ color: "#3D2F6B" }} />
                </motion.button>
              </div>
              <span className="text-[10px] font-semibold max-w-[68px] truncate text-center" style={{ color: "#718096", letterSpacing: "0.02em" }}>{h.name}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Tabs ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-1 mb-6 p-1 rounded-2xl"
          style={{
            background: "rgba(240,235,255,0.6)",
            border: "1px solid rgba(212,192,255,0.2)",
          }}
        >
          {([
            { id: "performances" as const, Icon: Camera,   label: "Posts" },
            { id: "seances"      as const, Icon: Film,     label: "Vidéos" },
            { id: "enregistres"  as const, Icon: Bookmark, label: "Enregistrés" },
            { id: "reglages"     as const, Icon: Dumbbell, label: "Séances" },
          ]).map(({ id, Icon, label }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 py-2 rounded-xl text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
              animate={{
                background: activeTab === id ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "transparent",
                color: activeTab === id ? "#3D2F6B" : "#A0AEC0",
              }}
              style={{
                boxShadow: activeTab === id ? "0 2px 10px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)" : "none",
                letterSpacing: "0.02em",
              }}
            >
              <Icon size={13} strokeWidth={2} />
              <span>{label}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ─── Tab content ─── */}
      <AnimatePresence mode="wait">
        {activeTab === "performances" && (
          <motion.div
            key="publications"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {userPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85) 0%,rgba(240,235,255,0.5) 100%)", border: "1.5px dashed rgba(167,139,250,0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4) 0%,rgba(245,230,163,0.35) 100%)", boxShadow: "0 8px 32px rgba(167,139,250,0.15)", border: "1px solid rgba(212,192,255,0.3)" }}>
                  <Camera size={28} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune publication</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Tes publications apparaîtront ici dès que tu en partageras une.</p>
                </div>
              </motion.div>
            ) : (() => {
                const allPosts = userPosts;
                return allPosts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                    style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85) 0%,rgba(240,235,255,0.5) 100%)", border: "1.5px dashed rgba(167,139,250,0.25)" }}
                  >
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4) 0%,rgba(245,230,163,0.35) 100%)", boxShadow: "0 8px 32px rgba(167,139,250,0.15)", border: "1px solid rgba(212,192,255,0.3)" }}>
                      <Camera size={28} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                    </div>
                    <div className="text-center px-8">
                      <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune publication</p>
                      <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Tes publications apparaîtront ici dès que tu en partageras une.</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {allPosts.map((post, idx) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.06 }}
                        className="rounded-3xl overflow-hidden"
                        style={{
                          background: "rgba(255,255,255,0.85)",
                          border: "1px solid rgba(255,255,255,0.9)",
                          boxShadow: "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,1)",
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold flex-shrink-0"
                              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                              {displayAvatar
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                                : displayPseudo.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>@{displayPseudo}</p>
                                {(user?.is_admin || user?.email === "teyprox@gmail.com") && (
                                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)" }}>
                                    <svg width="8" height="8" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px]" style={{ color: "#A0AEC0" }}>
                                {(() => {
                                  const diff = Date.now() - new Date(post.created_at).getTime();
                                  const h = Math.floor(diff / 3600000);
                                  const d = Math.floor(h / 24);
                                  if (h < 1) return "À l'instant";
                                  if (h < 24) return `${h}h`;
                                  if (d < 7) return `${d}j`;
                                  return new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                                })()}
                              </p>
                            </div>
                          </div>
                          {/* Bouton options */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setSelectedPost(post); setEditCaption(post.caption ?? ""); setEditBio(post.description ?? ""); setEditingSelectedPost(true); }}
                            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(167,139,250,0.1)" }}
                          >
                            <MoreHorizontal size={16} strokeWidth={2} style={{ color: "#7C5CFA" }} />
                          </motion.button>
                        </div>

                        {/* Titre / Caption */}
                        {post.caption && (
                          <p className="px-4 pb-2 text-sm font-semibold leading-snug" style={{ color: "#2D3748" }}>
                            {post.caption}
                          </p>
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

                        {/* PerformanceCard — cliquable pour ouvrir le détail */}
                        {post.performance_data && (["workout", "meal", "day"] as const).includes(
                          (post.performance_data as { type?: string }).type as "workout" | "meal" | "day"
                        ) && (
                          <motion.div
                            className="px-4 mb-3 cursor-pointer"
                            whileTap={{ scale: 0.985 }}
                            onClick={() => { setSelectedPost(post); setEditingSelectedPost(false); }}
                          >
                            <PerformanceCard data={post.performance_data as PerformanceData} size="md" interactive />
                          </motion.div>
                        )}

                        {/* Description */}
                        {post.description && (
                          <p className="px-4 pb-2 text-sm font-light leading-relaxed" style={{ color: "#718096" }}>
                            {post.description}
                          </p>
                        )}

                        {/* Action bar */}
                        {(() => {
                          const liked = likedPostIds.has(post.id);
                          const reposted = repostedPostIds.has(post.id);
                          const commentsOpen = openPostComments.has(post.id);
                          const likesCount = post.post_likes?.length ?? post.likes_count ?? 0;
                          const commentsCount = post.post_comments?.length ?? 0;
                          const repostsCount = post.post_reposts?.length ?? 0;
                          return (
                            <>
                              <div className="flex items-center gap-4 px-4 pt-3">
                                {/* Like */}
                                <motion.button whileTap={{ scale: 0.7 }} onClick={() => togglePostLike(post.id)} className="relative flex items-center cursor-pointer">
                                  {burstPostId === post.id && [0,1,2,3,4].map((i) => (
                                    <motion.div key={`b-${post.id}-${i}`} className="absolute pointer-events-none"
                                      style={{ width: 5, height: 5, borderRadius: "50%", background: i % 2 === 0 ? "#F43F5E" : "#FB7185" }}
                                      initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                      animate={{ scale: [0,1.2,0], x: [0,(i-2)*18], y: [0,-20-i*4], opacity: [1,1,0] }}
                                      transition={{ duration: 0.55, delay: i*0.04 }} />
                                  ))}
                                  <motion.div animate={liked ? { scale: [1,1.5,0.9,1.15,1] } : { scale: 1 }} transition={{ duration: 0.5 }}>
                                    <Heart size={20} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#F43F5E" : "none"} style={{ color: liked ? "#F43F5E" : "#2D3748" }} />
                                  </motion.div>
                                </motion.button>

                                {/* Commentaire */}
                                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85, rotate: -15 }}
                                  onClick={() => setOpenPostComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                                  className="flex items-center cursor-pointer">
                                  <MessageCircle size={20} strokeWidth={1.5} fill={commentsOpen ? "rgba(167,139,250,0.2)" : "none"} style={{ color: commentsOpen ? "#A78BFA" : "#2D3748" }} />
                                </motion.button>

                                {/* Repost */}
                                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => togglePostRepost(post.id)} className="flex items-center cursor-pointer">
                                  <motion.div animate={reposted ? { rotate: [0,360], scale: [1,1.3,1] } : { rotate: 0 }} transition={{ duration: 0.45 }}>
                                    <Repeat2 size={20} strokeWidth={1.5} style={{ color: reposted ? "#34D399" : "#2D3748" }} />
                                  </motion.div>
                                </motion.button>

                                {/* Partager */}
                                <motion.button whileHover={{ scale: 1.15, rotate: 15 }} whileTap={{ scale: 0.85 }} className="flex items-center cursor-pointer">
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
                                  onClick={() => setOpenPostComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}>
                                  {commentsOpen ? "Masquer les commentaires" : commentsCount > 0 ? `Voir les ${commentsCount} commentaires` : "Ajouter un commentaire"}
                                </motion.p>
                              </div>

                              {/* Section commentaires */}
                              <AnimatePresence>
                                {commentsOpen && (
                                  <CommentsSection
                                    postId={post.id}
                                    initialCount={commentsCount}
                                    onClose={() => setOpenPostComments((p) => { const n = new Set(p); n.delete(post.id); return n; })}
                                    onCommentAdded={() => setUserPosts((prev) => prev.map((pp) => pp.id !== post.id ? pp : { ...pp, post_comments: [...pp.post_comments, { id: `opt-${Date.now()}` }] }))}
                                  />
                                )}
                              </AnimatePresence>
                            </>
                          );
                        })()}
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
          </motion.div>
        )}

        {activeTab === "seances" && (
          <motion.div
            key="videos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {(() => {
              const videoPosts = userPosts.filter(p => p.media_type === "video");
              return videoPosts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                  style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85) 0%,rgba(240,235,255,0.5) 100%)", border: "1.5px dashed rgba(167,139,250,0.25)" }}
                >
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4) 0%,rgba(245,230,163,0.35) 100%)", boxShadow: "0 8px 32px rgba(167,139,250,0.15)", border: "1px solid rgba(212,192,255,0.3)" }}>
                    <Film size={28} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                  </div>
                  <div className="text-center px-8">
                    <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune vidéo</p>
                    <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Tes publications vidéo apparaîtront ici automatiquement.</p>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {videoPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      className="aspect-square rounded-lg overflow-hidden relative cursor-pointer"
                      style={{ background: "#000" }}
                      whileHover={{ scale: 0.97 }}
                      onClick={() => setSelectedPost(post)}
                    >
                      <video src={post.media_url ?? undefined} className="w-full h-full object-cover" muted playsInline />
                      {/* Play icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
                          <svg width="12" height="14" viewBox="0 0 12 14" fill="white"><path d="M1 1l10 6L1 13V1z"/></svg>
                        </div>
                      </div>
                      {(post.likes_count ?? 0) > 0 && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                          <span style={{ color: "#F43F5E", fontSize: 10 }}>♥</span>
                          <span className="text-[10px] font-semibold text-white">{post.likes_count}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        )}

        {activeTab === "enregistres" && (
          <motion.div
            key="enregistres"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {savedPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85) 0%,rgba(240,235,255,0.5) 100%)", border: "1.5px dashed rgba(167,139,250,0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4) 0%,rgba(245,230,163,0.35) 100%)", boxShadow: "0 8px 32px rgba(167,139,250,0.15)", border: "1px solid rgba(212,192,255,0.3)" }}>
                  <Bookmark size={28} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucun enregistrement</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Les vidéos que tu sauvegardes dans le feed apparaîtront ici.</p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {savedPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    className="aspect-square rounded-lg overflow-hidden relative cursor-pointer"
                    style={{ background: "#000" }}
                    whileHover={{ scale: 0.97 }}
                    onClick={() => setSelectedPost(post)}
                  >
                    {post.media_type === "video"
                      ? <video src={post.media_url ?? undefined} className="w-full h-full object-cover" muted playsInline />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={post.media_url ?? undefined} alt="" className="w-full h-full object-cover" />
                    }
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
                        {post.media_type === "video"
                          ? <svg width="12" height="14" viewBox="0 0 12 14" fill="white"><path d="M1 1l10 6L1 13V1z"/></svg>
                          : <Bookmark size={12} fill="white" style={{ color: "white" }} />
                        }
                      </div>
                    </div>
                    {/* Badge bookmark */}
                    <div className="absolute top-1.5 right-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(167,139,250,0.85)" }}>
                        <Bookmark size={10} fill="white" style={{ color: "white" }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "reglages" && (
          <motion.div
            key="seances-enr"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {workoutSessions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85) 0%,rgba(240,235,255,0.5) 100%)", border: "1.5px dashed rgba(167,139,250,0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4) 0%,rgba(245,230,163,0.35) 100%)", boxShadow: "0 8px 32px rgba(167,139,250,0.15)", border: "1px solid rgba(212,192,255,0.3)" }}>
                  <Dumbbell size={28} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune séance enregistrée</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Tes séances enregistrées apparaîtront ici une fois complétées.</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3">
                {workoutSessions.map((session) => {
                  const durationMin = session.elapsed_seconds
                    ? Math.round(session.elapsed_seconds / 60)
                    : session.duration_minutes || null;
                  return (
                    <motion.div
                      key={session.id}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(212,192,255,0.2)", boxShadow: "0 2px 12px rgba(167,139,250,0.06)" }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
                        <Dumbbell size={16} strokeWidth={1.5} style={{ color: "#5A4A8A" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1A202C" }}>{session.title || "Séance"}</p>
                        <p className="text-[11px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>
                          {session.started_at ? new Date(session.started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Date inconnue"}
                          {durationMin ? ` · ${durationMin} min` : ""}
                        </p>
                      </div>
                      {/* Delete button */}
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={async () => {
                          const supabase = createClient();
                          const { error } = await supabase.from("workout_sessions").delete().eq("id", session.id);
                          if (!error) setWorkoutSessions(prev => prev.filter(s => s.id !== session.id));
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                        style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.18)" }}
                        title="Supprimer cette séance"
                      >
                        <Trash2 size={13} strokeWidth={1.8} style={{ color: "#FC8181" }} />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showEdit && user && (
          <EditProfileModal
            pseudo={profilePseudo || user.pseudo}
            fullName={profileFullName}
            bio={profileBio}
            avatarUrl={displayAvatar}
            userId={user.id}
            onSave={handleSaveProfile}
            onClose={() => setShowEdit(false)}
          />
        )}
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
        {showGoals && (
          <GoalsEditModal
            pseudo={displayPseudo}
            onClose={() => setShowGoals(false)}
            onSave={() => { showToast("Objectifs mis à jour ✓"); refreshGoals(); }}
          />
        )}
        {showNewHighlight && user && (
          <NewHighlightModal
            userId={user.id}
            onCreated={handleHighlightCreated}
            onClose={() => setShowNewHighlight(false)}
          />
        )}
        {editHighlight && user && (
          <EditHighlightModal
            highlight={editHighlight}
            userId={user.id}
            onUpdated={handleHighlightUpdated}
            onDeleted={() => handleHighlightDeleted(editHighlight.id)}
            onClose={() => setEditHighlight(null)}
          />
        )}
        {viewingHighlight && user && (
          <StoryHighlightViewer
            highlight={viewingHighlight}
            isOwner={viewingHighlight.id === "__stories__" || (!!viewingHighlight.id && highlights.some((h) => h.id === viewingHighlight.id))}
            onClose={() => setViewingHighlight(null)}
            onDeleteItem={handleViewerDeleteItem}
            onAddItems={() => {
              setViewingHighlight(null);
              const h = highlights.find((x) => x.id === viewingHighlight.id);
              if (h) setEditHighlight(h);
            }}
          />
        )}
        {showFollowList && user && (
          <FollowListModal type={showFollowList} userId={user.id} onClose={() => setShowFollowList(null)} />
        )}
        {toast && <Toast message={toast} />}
        {/* WorkoutGuideModal lancé depuis un post du profil */}
        {profileWorkout && (
          <WorkoutGuideModal
            sessionId={profileWorkout.sessionId}
            title={profileWorkout.title}
            accent={profileWorkout.accent}
            duration={profileWorkout.duration}
            difficulty={profileWorkout.difficulty}
            category={profileWorkout.category}
            exerciseList={profileWorkout.exerciseList}
            onClose={() => setProfileWorkout(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Post detail / edit modal ─── */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)" }}
            onClick={() => { setSelectedPost(null); setEditingSelectedPost(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", bounce: 0.22, duration: 0.4 }}
              className="w-full max-w-sm rounded-t-3xl md:rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 -12px 48px rgba(167,139,250,0.2)",
                maxHeight: "92vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}
                  >
                    {displayAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                      : displayPseudo.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>@{displayPseudo}</p>
                      {(user?.is_admin || user?.email === "teyprox@gmail.com") && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)" }}>
                          <svg width="8" height="8" viewBox="0 0 13 13" fill="none">
                            <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px]" style={{ color: "#A0AEC0" }}>
                      {new Date(selectedPost.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Bouton modifier */}
                  {!editingSelectedPost && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setEditCaption(selectedPost.caption ?? "");
                        setEditBio(selectedPost.description ?? "");
                        setEditingSelectedPost(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(167,139,250,0.15)", color: "#7C5CFA" }}
                    >
                      <Pencil size={11} strokeWidth={2} />
                      Modifier
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setSelectedPost(null); setEditingSelectedPost(false); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(240,235,255,0.8)" }}
                  >
                    <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                  </motion.button>
                </div>
              </div>

              {/* ── Mode lecture ── */}
              {!editingSelectedPost && (
                <>
                  {selectedPost.caption && (
                    <p className="px-4 pb-2 text-sm font-semibold leading-snug" style={{ color: "#2D3748" }}>
                      {selectedPost.caption}
                    </p>
                  )}
                  {selectedPost.media_url && (
                    <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
                      {selectedPost.media_type === "video"
                        ? <VideoPlayer src={selectedPost.media_url} maxHeight={380} controls />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={selectedPost.media_url} alt="" className="w-full object-cover rounded-2xl" style={{ maxHeight: 380 }} />
                      }
                    </div>
                  )}
                  {/* PerformanceCard — taille complète dans le modal */}
                  {selectedPost.performance_data && (["workout", "meal", "day"] as const).includes(
                    (selectedPost.performance_data as { type?: string }).type as "workout" | "meal" | "day"
                  ) && (
                    <div className="px-4 pb-3">
                      <PerformanceCard data={selectedPost.performance_data as PerformanceData} size="md" />
                    </div>
                  )}

                  {/* Bouton "Faire cette séance" pour les posts workout */}
                  {selectedPost.type === "workout" && (() => {
                    const pd = selectedPost.performance_data as PerformanceData & { exercise_list?: unknown[]; category?: string };
                    const exList = (pd?.exercise_list ?? []) as Exercise[];
                    const durMetric = pd?.metrics?.find(m => m.label === "Durée");
                    const dur = durMetric ? parseInt(durMetric.value) || 30 : 30;
                    const builtinId  = resolveSessionId(pd?.title ?? "");
                    const hasEmbedded = exList.length > 0;
                    const hasBuiltin  = !!builtinId;
                    const unavailable = !hasEmbedded && !hasBuiltin;
                    return (
                      <div className="px-4 pt-2 pb-3">
                        {unavailable ? (
                          <div className="w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs"
                            style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(167,139,250,0.15)", color: "#A0AEC0" }}>
                            <span>Séance perso — exercices non embarqués</span>
                            <span className="text-[10px]" style={{ color: "#C4B5FD" }}>Repartage via l&apos;écran de fin pour l&apos;activer</span>
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setSelectedPost(null);
                              setProfileWorkout({
                                sessionId:    hasEmbedded ? "profile-post" : builtinId!,
                                title:        pd?.title ?? "Séance",
                                accent:       "#A78BFA",
                                duration:     dur,
                                difficulty:   "Intermédiaire",
                                category:     pd?.category ?? "force",
                                exerciseList: exList,
                              });
                            }}
                            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
                            style={{
                              background: "linear-gradient(135deg,rgba(167,139,250,0.18) 0%,rgba(212,192,255,0.12) 100%)",
                              border: "1px solid rgba(167,139,250,0.28)",
                              color: "#7C5CFA",
                            }}
                          >
                            <Play size={14} strokeWidth={2} />
                            Faire cette séance
                          </motion.button>
                        )}
                      </div>
                    );
                  })()}

                  {selectedPost.description && (
                    <p className="px-4 pb-3 text-sm font-light leading-relaxed" style={{ color: "#718096" }}>
                      {selectedPost.description}
                    </p>
                  )}
                  <div className="px-4 pb-5 flex items-center gap-2">
                    <Heart size={16} strokeWidth={0} fill="#F43F5E" style={{ color: "#F43F5E" }} />
                    <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                      {selectedPost.likes_count ?? 0}{" "}j&apos;aime
                    </span>
                  </div>
                </>
              )}

              {/* ── Mode édition ── */}
              {editingSelectedPost && (
                <div className="px-4 pb-5 flex flex-col gap-4">
                  {/* Aperçu media */}
                  {selectedPost.media_url && (
                    <div className="rounded-2xl overflow-hidden">
                      {selectedPost.media_type === "video"
                        ? <VideoPlayer src={selectedPost.media_url} maxHeight={200} muted autoPlay />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={selectedPost.media_url} alt="" className="w-full object-cover" style={{ maxHeight: 200 }} />
                      }
                    </div>
                  )}

                  {/* Titre */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Titre</label>
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      maxLength={200}
                      className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                      style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.6)", color: "#2D3748" }}
                      placeholder="Titre du post..."
                      autoFocus
                    />
                  </div>

                  {/* Bio */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none leading-relaxed"
                      style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.6)", color: "#2D3748" }}
                      placeholder="Description du post..."
                    />
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setEditingSelectedPost(false)}
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                      style={{ background: "rgba(240,235,255,0.6)", color: "#718096" }}
                    >
                      Annuler
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={editSaving}
                      onClick={async () => {
                        setEditSaving(true);
                        const supabase = createClient();
                        const newCaption = editCaption.trim();
                        const newBio = editBio.trim() || null;

                        // Sauvegarde caption (toujours)
                        const { error } = await supabase
                          .from("posts")
                          .update({ caption: newCaption })
                          .eq("id", selectedPost.id);

                        if (error) {
                          showToast("Erreur : " + error.message);
                          setEditSaving(false);
                          return;
                        }

                        // Sauvegarde description (si la colonne existe)
                        await supabase
                          .from("posts")
                          .update({ description: newBio })
                          .eq("id", selectedPost.id);

                        // Mise à jour locale
                        const updated = { ...selectedPost, caption: newCaption, description: newBio };
                        setSelectedPost(updated);
                        setUserPosts((prev) => prev.map((p) => p.id === selectedPost.id ? updated : p));
                        setEditingSelectedPost(false);
                        setEditSaving(false);
                        showToast("Post modifié ✓");
                      }}
                      className="flex-[2] py-3 rounded-2xl text-sm font-bold"
                      style={{
                        background: editSaving ? "rgba(212,192,255,0.5)" : "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                        color: "#3D2F6B",
                        boxShadow: editSaving ? "none" : "0 4px 16px rgba(167,139,250,0.3)",
                      }}
                    >
                      {editSaving ? "Sauvegarde..." : "Sauvegarder"}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
