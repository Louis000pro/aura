"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Bell, Shield, Star, LogOut, X, Check, BellOff, Lock, Crown,
  ExternalLink, Share2, Venus, Mars, Search, UserCheck, UserPlus, Camera, ChevronRight, Plus,
  Target, Pencil, Dumbbell, Play, Clock, Globe, Users, Flame, Wind, Layers, Sparkles, Settings, Film, Heart,
  MoreHorizontal, MessageCircle, Repeat2, Bookmark, Send, Trash2, Award,
} from "lucide-react";
import Badges from "@/components/Badges";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import PerfShareButton from "@/components/PerfShareButton";
import PerfShareCard from "@/components/PerfShareCard";
import { perfDataToShare } from "@/lib/perfShareExport";
import VideoPlayer from "@/components/VideoPlayer";
import FollowListModal from "@/components/FollowListModal";

/* ─────────────── Helpers ─────────────── */
function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(n);
}

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
  views?: number;
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
      .select("id, content:text, created_at, user_id, author:profiles!user_id(pseudo, avatar_url)")
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
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, text: content });
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
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(var(--tint-violet-rgb),0.8)" }}>
        <div className="flex flex-col gap-2.5 mb-3 max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-3">
              <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "var(--text-3)" }}>Sois le premier à commenter</p>
          ) : comments.map((c, i) => {
            const pseudo = c.author?.pseudo ?? "inconnu";
            const avatar = c.author?.avatar_url;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i < 5 ? i * 0.04 : 0 }} className="flex items-start gap-2">
                <Link href={`/profil/${encodeURIComponent(pseudo)}`} className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden" style={{ background: avatar ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}>
                    {avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" decoding="async" src={avatar} alt={pseudo} className="w-full h-full object-cover" />
                      : pseudo[0]?.toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-1)" }}>
                    <Link href={`/profil/${encodeURIComponent(pseudo)}`}><span className="font-semibold mr-1.5 hover:underline">{pseudo}</span></Link>
                    <span className="font-light">{c.content}</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{postTimeAgo(c.created_at)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={user ? "Ajouter un commentaire…" : "Connecte-toi pour commenter"} disabled={!user}
            className="flex-1 text-xs outline-none px-3 py-2 rounded-xl"
            style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim() || !user || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: input.trim() && user ? "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" : "rgba(var(--tint-violet-rgb),0.5)", transition: "background 0.2s" }}>
            <Send size={12} strokeWidth={2} style={{ color: input.trim() && user ? "var(--text-1)" : "var(--text-3)" }} />
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
        background: "rgba(var(--surface-rgb),0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(var(--tint-violet-rgb),0.9)",
        boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2), inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
        color: "var(--text-1)",
        whiteSpace: "nowrap",
      }}
    >
      <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

/* ─────────────── Edit Profile Modal ─────────────── */
/* ─────────────── Avatar Cropper (recadrage circulaire : drag + zoom) ─────────────── */
function AvatarCropper({ src, onCancel, onCropped }: {
  src: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const V = 280;   // taille du viewport à l'écran
  const OUT = 512; // taille de sortie (px)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const baseScale = natural ? V / Math.min(natural.w, natural.h) : 1;
  const dispScale = baseScale * zoom;
  const imgW = natural ? natural.w * dispScale : V;
  const imgH = natural ? natural.h * dispScale : V;

  const clamp = (o: { x: number; y: number }) => {
    const maxX = Math.max(0, (imgW - V) / 2);
    const maxY = Math.max(0, (imgH - V) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) };
  };

  // Re-clamp l'offset quand le zoom change
  useEffect(() => { setOffset((o) => clamp(o)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [zoom, natural]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }));
  };
  const onPointerUp = () => { drag.current = null; };

  const confirm = () => {
    if (!natural || !imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgLeft = V / 2 + offset.x - imgW / 2;
    const imgTop = V / 2 + offset.y - imgH / 2;
    const sx = (0 - imgLeft) / dispScale;
    const sy = (0 - imgTop) / dispScale;
    const sSize = V / dispScale;
    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
    canvas.toBlob((b) => { if (b) onCropped(b); }, "image/jpeg", 0.9);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      style={{ background: "rgba(30,22,55,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center"
        style={{ background: "rgba(var(--surface-rgb),0.98)", boxShadow: "0 24px 70px rgba(var(--accent-rgb),0.3)" }}
      >
        <p className="text-base font-semibold mb-1" style={{ color: "var(--text-1)" }}>Recadre ta photo</p>
        <p className="text-[11px] mb-4" style={{ color: "var(--text-3)" }}>Glisse pour déplacer · zoome avec le curseur</p>

        {/* Viewport circulaire */}
        <div
          className="relative overflow-hidden select-none"
          style={{ width: V, height: V, borderRadius: "50%", touchAction: "none", cursor: "grab", background: "#EEE" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => { const t = e.currentTarget; setNatural({ w: t.naturalWidth, h: t.naturalHeight }); }}
            style={{
              position: "absolute", left: "50%", top: "50%",
              width: imgW, height: imgH, maxWidth: "none",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              userSelect: "none", pointerEvents: "none",
            }}
          />
          {/* Anneau de cadrage */}
          <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: "inset 0 0 0 2px rgba(var(--surface-rgb),0.9)" }} />
        </div>

        {/* Zoom */}
        <input
          type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-full mt-5 accent-[var(--accent)]"
        />

        {/* Actions */}
        <div className="flex gap-3 w-full mt-5">
          <motion.button whileTap={{ scale: 0.96 }} onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "var(--text-2)" }}>
            Annuler
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={confirm}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--accent) 100%)", color: "#fff", boxShadow: "0 6px 20px rgba(var(--accent-rgb),0.3)" }}>
            <Check size={15} strokeWidth={2.5} /> Valider
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sélection d'un fichier → ouvre le recadrage (au lieu d'uploader directement)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = ""; // permet de re-sélectionner le même fichier
  };

  // Upload de l'image recadrée (JPEG)
  const handleCropped = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
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
          background: "rgba(var(--surface-rgb),0.98)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 -12px 60px rgba(var(--accent-rgb),0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center mb-4 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(var(--text-1-rgb),0.22)" }} />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>Modifier le profil</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
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
              background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
              boxShadow: "0 4px 20px rgba(var(--accent-rgb),0.3)",
              color: "var(--text-1)",
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{editPseudo.charAt(0).toUpperCase() || "?"}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(var(--surface-rgb),0.75)" }}>
                <motion.div
                  className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: "rgba(var(--accent-rgb),0.3)", borderTopColor: "var(--accent)" }}
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
          <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>Appuie pour changer la photo</p>
        </div>

        {/* Recadrage de la photo sélectionnée */}
        <AnimatePresence>
          {cropSrc && (
            <AvatarCropper
              src={cropSrc}
              onCancel={() => setCropSrc(null)}
              onCropped={handleCropped}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3">
          {/* Full name */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "var(--text-3)" }}>
              Nom complet
            </label>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.6)", color: "var(--text-1)" }}
              placeholder="Ton prénom et nom"
            />
          </div>

          {/* Pseudo */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "var(--text-3)" }}>
              Pseudo
            </label>
            <input
              type="text"
              value={editPseudo}
              onChange={(e) =>
                // On garde lettres (accents inclus), chiffres, espaces, séparateurs
                // courants ET les emojis (séquences ZWJ, drapeaux, teintes incluses).
                setEditPseudo(
                  e.target.value.replace(/[^\p{L}\p{N}\p{Emoji}\p{Extended_Pictographic}‍️ ._-]/gu, "").slice(0, 30)
                )
              }
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.6)", color: "var(--text-1)" }}
              placeholder="Ton pseudo (espaces & emojis ok)"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 flex items-center justify-between" style={{ color: "var(--text-3)" }}>
              <span>Bio</span>
              <span>{editBio.length}/150</span>
            </label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value.slice(0, 150))}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
              style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.6)", color: "var(--text-1)" }}
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
            background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
            color: "var(--text-1)",
            boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8), 0 4px 16px rgba(var(--accent-rgb),0.2)",
            opacity: saving || uploading ? 0.7 : 1,
          }}
        >
          {saving ? (
            <>
              <motion.div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: "rgba(var(--text-1-rgb),0.3)", borderTopColor: "var(--text-1)" }}
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

/* FollowListModal → extrait dans un composant partagé (utilisé aussi par le
   profil public) : src/components/FollowListModal.tsx */

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
  const { user } = useAuth();
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

  const handleSave = async () => {
    localStorage.setItem(storageKey, JSON.stringify(data));
    // Sync vers Supabase + mettre à jour onboarding_completed
    if (user?.id) {
      const isCompleted = !!(data.age && data.weight && data.gender && data.goals.length > 0 && data.level && data.sessionsPerWeek && data.mealsPerDay && data.diet);
      const supabase = createClient();
      await supabase.from("profiles").upsert({
        id: user.id,
        onboarding_age: data.age ? parseInt(data.age) : null,
        onboarding_height: data.height ? parseInt(data.height) : null,
        onboarding_weight: data.weight ? parseFloat(data.weight) : null,
        onboarding_gender: data.gender || null,
        onboarding_goals: data.goals.length ? data.goals : null,
        onboarding_level: data.level || null,
        onboarding_sessions_week: data.sessionsPerWeek ? parseInt(data.sessionsPerWeek) : null,
        onboarding_meals_day: data.mealsPerDay ? parseInt(data.mealsPerDay) : null,
        onboarding_diet: data.diet || null,
        onboarding_completed: isCompleted,
      }, { onConflict: "id" });
      if (!isCompleted) window.dispatchEvent(new Event("aura:objectives-reset"));
    }
    onSave();
    onClose();
  };

  const inputStyle = {
    background: "rgba(var(--tint-violet-rgb),0.5)",
    border: "1px solid rgba(var(--violet-mid-rgb),0.6)",
    color: "var(--text-1)",
  };

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2.5" style={{ color: "var(--text-3)" }}>{text}</p>
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
          background: "rgba(var(--surface-rgb),0.98)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 -12px 60px rgba(var(--accent-rgb),0.18)",
          maxHeight: "90dvh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(var(--text-1-rgb),0.22)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>Mes objectifs</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Mise à jour de ton profil sportif</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="h-px mx-6" style={{ background: "rgba(var(--violet-mid-rgb),0.3)" }} />

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
                  <label className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>{label}</label>
                  <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl" style={inputStyle}>
                    <input
                      type="number"
                      value={data[key]}
                      onChange={e => set(key, e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:text-[#C4CAD4]"
                      style={{ color: "var(--text-1)" }}
                    />
                    <span className="text-[10px] font-medium flex-shrink-0" style={{ color: "var(--text-3)" }}>{unit}</span>
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
                      ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.9) 0%,rgba(var(--cream-mid-rgb),0.9) 100%)", borderColor: "rgba(var(--accent-rgb),0.5)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
                      : { background: "rgba(var(--tint-violet-rgb),0.45)", borderColor: "rgba(var(--violet-mid-rgb),0.3)", color: "var(--text-2)" }
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
                      ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.7) 0%,rgba(var(--cream-mid-rgb),0.7) 100%)", borderColor: "rgba(var(--accent-rgb),0.5)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
                      : { background: "rgba(var(--tint-violet-rgb),0.4)", borderColor: "rgba(var(--violet-mid-rgb),0.25)" }
                    }>
                    <span className="text-sm font-semibold" style={{ color: active ? "var(--text-1)" : "var(--text-2)" }}>{label}</span>
                    <span className="text-[10px] font-medium" style={{ color: active ? "var(--accent)" : "var(--text-3)" }}>{sub}</span>
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
                      ? { background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)", borderColor: "rgba(var(--accent-rgb),0.5)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
                      : { background: "rgba(var(--tint-violet-rgb),0.4)", borderColor: "rgba(var(--violet-mid-rgb),0.25)", color: "var(--text-2)" }
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
                      ? { background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)", borderColor: "rgba(var(--accent-rgb),0.5)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
                      : { background: "rgba(var(--tint-violet-rgb),0.4)", borderColor: "rgba(var(--violet-mid-rgb),0.25)", color: "var(--text-2)" }
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
                      ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.8) 0%,rgba(var(--cream-mid-rgb),0.8) 100%)", borderColor: "rgba(var(--accent-rgb),0.5)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
                      : { background: "rgba(var(--tint-violet-rgb),0.4)", borderColor: "rgba(var(--violet-mid-rgb),0.25)", color: "var(--text-2)" }
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
        <div className="px-6 pb-8 pt-3 flex-shrink-0 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
            style={{
              background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
              color: "var(--text-1)",
              boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8), 0 4px 16px rgba(var(--accent-rgb),0.2)",
            }}
          >
            Sauvegarder
          </motion.button>

          {/* Séparateur */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(var(--violet-mid-rgb),0.3)" }} />
            <span className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "rgba(var(--violet-mid-rgb),0.3)" }} />
          </div>

          <div className="flex gap-2">
            {/* Recommencer */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (confirm("Réinitialiser tous tes objectifs ?")) {
                  setData({ age: "", height: "", weight: "", gender: "", goals: [], level: "", sessionsPerWeek: "", mealsPerDay: "", diet: "" });
                }
              }}
              className="flex-1 py-3 rounded-2xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              style={{
                background: "rgba(254,226,226,0.8)",
                border: "1.5px solid rgba(252,129,129,0.35)",
                color: "#E53E3E",
              }}
            >
              🔄 Recommencer
            </motion.button>

            {/* Créer un 2ème objectif */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (confirm("Créer un 2ème objectif ? Tes données actuelles seront remplacées après sauvegarde.")) {
                  setData({ age: "", height: "", weight: "", gender: "", goals: [], level: "", sessionsPerWeek: "", mealsPerDay: "", diet: "" });
                }
              }}
              className="flex-1 py-3 rounded-2xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              style={{
                background: "rgba(254,226,226,0.6)",
                border: "1.5px solid rgba(252,129,129,0.3)",
                color: "#C53030",
              }}
            >
              ➕ 2ème objectif
            </motion.button>
          </div>
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
        style={{ background: "rgba(var(--surface-rgb),0.96)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--accent-rgb),0.14)", boxShadow: "0 20px 60px rgba(var(--accent-rgb),0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lock size={16} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
            <h2 className="text-lg font-light" style={{ color: "var(--text-1)" }}>Confidentialité</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: "Partage de données", desc: "Partager vos stats avec la communauté", state: dataSharing, toggle: () => setDataSharing(v => !v) },
            { label: "Analytiques", desc: "Améliorer l'app avec vos données anonymisées", state: analytics, toggle: () => setAnalytics(v => !v) },
          ].map(({ label, desc, state, toggle }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(var(--tint-violet-rgb),0.4)" }}>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{label}</p>
                <p className="text-[11px] font-light" style={{ color: "var(--text-3)" }}>{desc}</p>
              </div>
              <motion.button
                onClick={toggle}
                className="relative w-11 h-6 rounded-full cursor-pointer flex-shrink-0"
                style={{ background: state ? "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)" : "rgba(220,220,220,0.6)" }}
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
        <p className="text-[10px] mt-4 text-center" style={{ color: "var(--text-3)" }}>Conforme au RGPD · Données hébergées en France</p>
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
  "Débutant": "#34D399", "Intermédiaire": "#FBBF24", "Avancé": "var(--accent)",
};

const VIS_LABELS: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  friends: { label: "Amis",   icon: Users,  color: "#8B5CF6" },
  public:  { label: "Public", icon: Globe,  color: "#2BD4A0" },
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
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "31536000" });
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
        style={{ background: "rgba(var(--surface-rgb),0.98)", boxShadow: "0 -12px 60px rgba(var(--accent-rgb),0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-5 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(var(--text-1-rgb),0.2)" }} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black tracking-tight" style={{ color: "var(--text-0)" }}>Nouvelle catégorie</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        {/* Cover */}
        <div className="flex flex-col items-center mb-6">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => coverRef.current?.click()}
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
            style={{ background: coverUrl ? "transparent" : "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4),rgba(var(--cream-mid-rgb),0.4))" }}>
            {coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img loading="lazy" decoding="async" src={coverUrl} alt="cover" className="w-full h-full object-cover" />
              : uploading
              ? <div className="text-xs font-medium" style={{ color: "var(--accent)" }}>Upload…</div>
              : <div className="flex flex-col items-center gap-1">
                  <Camera size={20} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                  <span className="text-[9px] font-semibold" style={{ color: "var(--accent)" }}>Cover</span>
                </div>
            }
          </motion.div>
          <input ref={coverRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleCover} />
          <p className="text-[11px] mt-2 font-light" style={{ color: "var(--text-3)" }}>Photo de couverture (optionnel)</p>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="text-[10px] font-bold tracking-widest uppercase mb-2 block" style={{ color: "var(--text-3)" }}>Nom</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Sport, Voyage, Nutrition…" maxLength={24}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: "rgba(var(--tint-violet-rgb),0.55)", border: "1px solid rgba(var(--accent-rgb),0.2)", color: "var(--text-0)" }}
          />
        </div>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!name.trim() || saving || uploading}
          className="w-full py-3.5 rounded-2xl text-sm font-black tracking-tight cursor-pointer"
          style={{
            background: name.trim() ? "linear-gradient(135deg,#C4A8FF 0%,var(--accent) 100%)" : "rgba(220,220,220,0.5)",
            color: name.trim() ? "#3D2F6B" : "var(--text-3)",
            boxShadow: name.trim() ? "0 4px 18px rgba(var(--accent-rgb),0.3)" : "none",
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
        const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "31536000" });
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
      const firstMediaUrl = newItems[0]?.media_url;
      if (!coverUrl && firstMediaUrl) {
        await supabase.from("highlights").update({ cover_url: firstMediaUrl }).eq("id", highlight.id);
        setCoverUrl(firstMediaUrl);
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
    const nextCoverUrl = remaining[0]?.media_url;
    if (coverUrl.includes(itemId) && nextCoverUrl) {
      await supabase.from("highlights").update({ cover_url: nextCoverUrl }).eq("id", highlight.id);
      setCoverUrl(nextCoverUrl);
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
        style={{ background: "rgba(var(--surface-rgb),0.98)", boxShadow: "0 -12px 60px rgba(var(--accent-rgb),0.2)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(var(--text-1-rgb),0.2)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 flex-shrink-0">
          <h2 className="text-base font-black tracking-tight" style={{ color: "var(--text-0)" }}>Modifier la catégorie</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: "none" }}>

          {/* Name + Cover row */}
          <div className="flex items-center gap-4 mb-5">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => coverRef.current?.click()}
              className="w-[60px] h-[60px] rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer"
              style={{ background: coverUrl ? "transparent" : "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4),rgba(var(--cream-mid-rgb),0.4))" }}>
              {coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" decoding="async" src={coverUrl} alt="cover" className="w-full h-full object-cover" />
                : <Camera size={16} strokeWidth={1.5} style={{ color: "var(--accent)" }} />}
            </motion.div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            <div className="flex-1">
              <label className="text-[9px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text-3)" }}>Nom</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={24}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(var(--tint-violet-rgb),0.55)", border: "1px solid rgba(var(--accent-rgb),0.2)", color: "var(--text-0)" }} />
            </div>
          </div>

          {/* Media grid */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
              Médias ({items.length}/50)
            </span>
            {items.length < 50 && (
              <motion.button whileTap={{ scale: 0.93 }} onClick={() => mediaRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.7),rgba(var(--cream-mid-rgb),0.7))", color: "#3D2F6B" }}>
                <Plus size={11} strokeWidth={3} />
                {uploading ? "Upload…" : "Ajouter"}
              </motion.button>
            )}
          </div>
          <input ref={mediaRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleAddMedia} />

          {loadingItems ? (
            <div className="flex justify-center py-8">
              <motion.div className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : items.length === 0 ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => mediaRef.current?.click()}
              className="w-full py-10 rounded-2xl flex flex-col items-center gap-3 cursor-pointer"
              style={{ border: "2px dashed rgba(var(--accent-rgb),0.3)", background: "rgba(var(--tint-violet-rgb),0.2)" }}>
              <Plus size={24} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>Ajouter des photos / vidéos</span>
              <span className="text-xs font-light" style={{ color: "var(--text-3)" }}>Jusqu&apos;à 50 médias</span>
            </motion.button>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {items.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  {item.media_url && (item.media_type === "video"
                    ? <video src={item.media_url} className="w-full h-full object-cover" muted playsInline />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img loading="lazy" decoding="async" src={item.media_url} alt="" className="w-full h-full object-cover" />)}
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
                  style={{ border: "2px dashed rgba(var(--accent-rgb),0.35)", background: "rgba(var(--tint-violet-rgb),0.2)" }}>
                  <Plus size={18} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
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
              background: "linear-gradient(135deg,#C4A8FF 0%,var(--accent) 100%)",
              color: "#3D2F6B",
              boxShadow: "0 4px 18px rgba(var(--accent-rgb),0.3)",
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
                style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "var(--text-2)" }}>
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
  const [activeTab, setActiveTab] = useState<"performances" | "seances" | "reglages" | "enregistres" | "badges">("performances");
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

  // ── Compter une vue quand on ouvre une vidéo depuis le profil ──
  useEffect(() => {
    if (!selectedPost || selectedPost.media_type !== "video") return;
    const id = selectedPost.id;
    void createClient().rpc("increment_post_views", { p_post_id: id });
    setUserPosts((prev) => prev.map((p) => p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost?.id]);
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
      .select("id, type, caption, description, performance_data, created_at, user_id, media_url, media_type, views, post_likes(user_id), post_comments(id), post_reposts(user_id)")
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
          const posts = data
            .map(({ posts }) => Array.isArray(posts) ? posts[0] : posts)
            .filter((post) => post != null)
            .map((post) => ({
              ...post,
              post_likes: [],
              post_comments: [],
              post_reposts: [],
            }));
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
      await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      // ── Notification au propriétaire du post ──
      const post = userPosts.find((p) => p.id === postId) ?? savedPosts.find((p) => p.id === postId);
      if (post && post.user_id !== user.id) {
        void fetch("/api/notifications/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liker_id: user.id, post_owner_id: post.user_id, post_id: postId }),
        }).catch(() => {});
      }
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
      await supabase.from("post_reposts").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      showToast("Post boosté ! 🔄");
      // ── Notification au propriétaire du post ──
      const post = userPosts.find((p) => p.id === postId) ?? savedPosts.find((p) => p.id === postId);
      if (post && post.user_id !== user.id) {
        void fetch("/api/notifications/repost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reposter_id: user.id, post_owner_id: post.user_id, post_id: postId }),
        }).catch(() => {});
      }
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
          background: "linear-gradient(180deg, rgba(var(--violet-mid-rgb),0.22) 0%, rgba(var(--cream-mid-rgb),0.08) 60%, transparent 100%)",
          zIndex: 0,
        }}
      />

      {/* ─── Notifs + Premium + Settings — top RIGHT ─── */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <NotificationBell side="top" />
        <Link href="/premium">
          <motion.div
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{
              background: "linear-gradient(135deg,var(--accent),#7C5CFA)",
              boxShadow: "0 2px 14px rgba(124,92,250,0.35)",
            }}
            aria-label="Vaiiya Premium"
          >
            <Crown size={15} strokeWidth={2} style={{ color: "#fff" }} />
          </motion.div>
        </Link>
        <Link href="/parametres">
          <motion.div
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(var(--surface-rgb),0.88)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(var(--violet-mid-rgb),0.45)",
              boxShadow: "0 2px 14px rgba(var(--accent-rgb),0.15)",
            }}
          >
            <Settings size={15} strokeWidth={1.6} style={{ color: "var(--accent)" }} />
          </motion.div>
        </Link>
      </div>

      {/* ─── Header ─── */}
      <div data-tour-anchor="profil-header" className="relative z-10 pt-12 px-5 md:px-8 max-w-3xl mx-auto">

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
                  style={{ background: "conic-gradient(#C4A8FF, var(--accent), #7C5CFA, var(--cream-mid), var(--gold), #C4A8FF)" }}
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
                  background: displayAvatar ? "transparent" : "linear-gradient(135deg,rgba(var(--tint-violet-rgb),1),rgba(var(--tint-cream-rgb),1))",
                  color: "#7C5CFA",
                  fontWeight: 300,
                  boxShadow: hasActiveStory ? "none" : "0 12px 40px rgba(var(--accent-rgb),0.35)",
                }}
              >
                {displayAvatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img loading="lazy" decoding="async" src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
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
                background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))",
                boxShadow: "0 3px 12px rgba(var(--accent-rgb),0.45)",
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
              style={{ color: "var(--text-0)" }}
            >
              {displayPseudo}
            </h1>
            {(user?.is_certified || user?.is_admin || user?.email === "teyprox@gmail.com") && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
                title="Compte certifié"
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 24, height: 24,
                  background: "linear-gradient(135deg,var(--accent),#7C5CFA)",
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
            <p className="text-[12px] font-semibold mt-1.5 max-w-[260px]" style={{ color: "var(--accent)" }}>
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
              style={{ background: "rgba(var(--violet-mid-rgb),0.3)", color: "#7C5CFA", border: "1px solid rgba(var(--accent-rgb),0.25)" }}
            >
              {LEVELS_LIST.find((l) => l.id === profileLevel)?.label ?? profileLevel}
            </span>
          )}

          {/* Bio */}
          {profileBio && (
            <p className="text-[13px] mt-2 max-w-[240px] leading-relaxed font-light" style={{ color: "var(--text-2)" }}>
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
            background: "rgba(var(--surface-rgb),0.8)",
            border: "1px solid rgba(var(--accent-rgb),0.14)",
            boxShadow: "0 4px 24px rgba(var(--accent-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),1)",
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
                <div className="w-px self-stretch my-3.5" style={{ background: "rgba(var(--violet-mid-rgb),0.3)" }} />
              )}
              <motion.button
                whileHover={clickable ? { scale: 1.05 } : {}}
                whileTap={clickable ? { scale: 0.94 } : {}}
                onClick={() => { if (clickable) setShowFollowList(label as "Abonnés" | "Abonnements"); }}
                className="flex-1 flex flex-col items-center py-4"
                style={{ cursor: clickable ? "pointer" : "default" }}
              >
                <span className="text-[24px] font-black leading-none" style={{ color: "var(--text-0)", letterSpacing: "-0.03em" }}>
                  {value}
                </span>
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase mt-1.5" style={{ color: clickable ? "var(--accent)" : "var(--text-3)" }}>
                  {label}
                </span>
              </motion.button>
            </div>
          ))}
        </motion.div>

        {/* ─── Stories à la une ─── */}
        <motion.div
          data-tour-anchor="profil-highlights"
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
                background: "rgba(var(--surface-rgb),0.9)",
                border: "2px dashed rgba(var(--accent-rgb),0.45)",
                boxShadow: "0 3px 14px rgba(var(--accent-rgb),0.1)",
              }}
            >
              <Plus size={24} strokeWidth={1.6} style={{ color: "var(--accent)" }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: "var(--text-3)", letterSpacing: "0.02em" }}>Nouveau</span>
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
                  style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#C4A8FF 0%,var(--accent) 100%)", padding: "2.5px", boxShadow: "0 4px 18px rgba(var(--accent-rgb),0.25)" }}
                >
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "white", padding: "2px" }}>
                    <div
                      style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: h.cover_url ? "transparent" : "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.5),rgba(var(--cream-mid-rgb),0.5))", color: "var(--accent)", fontSize: 20, fontWeight: 700 }}
                    >
                      {h.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img loading="lazy" decoding="async" src={h.cover_url} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : h.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </motion.div>
                {/* Loading spinner */}
                {viewerLoading && (
                  <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(var(--surface-rgb),0.7)" }}>
                    <motion.div className="w-5 h-5 rounded-full border-2"
                      style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                  </div>
                )}
                {/* Pencil badge — tap = edit */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); setEditHighlight(h); }}
                  className="absolute -bottom-0.5 -right-0.5 w-[20px] h-[20px] rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#C4A8FF,var(--accent))", border: "2.5px solid white", boxShadow: "0 1px 6px rgba(var(--accent-rgb),0.4)" }}
                >
                  <Pencil size={8} strokeWidth={3} style={{ color: "#3D2F6B" }} />
                </motion.button>
              </div>
              <span className="text-[10px] font-semibold max-w-[68px] truncate text-center" style={{ color: "var(--text-2)", letterSpacing: "0.02em" }}>{h.name}</span>
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
            background: "rgba(var(--tint-violet-rgb),0.6)",
            border: "1px solid rgba(var(--violet-mid-rgb),0.2)",
          }}
        >
          {([
            { id: "performances" as const, Icon: Camera,   label: "Posts" },
            { id: "seances"      as const, Icon: Film,     label: "Vidéos" },
            { id: "enregistres"  as const, Icon: Bookmark, label: "Enregistrés" },
            { id: "reglages"     as const, Icon: Dumbbell, label: "Séances" },
            { id: "badges"       as const, Icon: Award,    label: "Badges" },
          ]).map(({ id, Icon, label }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 py-2 rounded-xl text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
              animate={{
                background: activeTab === id ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "transparent",
                color: activeTab === id ? "#fff" : "var(--text-3)",
              }}
              style={{
                boxShadow: activeTab === id ? "0 3px 14px rgba(193,59,193,0.35)" : "none",
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
                style={{ background: "linear-gradient(135deg,rgba(var(--surface-rgb),0.85) 0%,rgba(var(--tint-violet-rgb),0.5) 100%)", border: "1.5px dashed rgba(var(--accent-rgb),0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4) 0%,rgba(var(--cream-mid-rgb),0.35) 100%)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                  <Camera size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Aucune publication</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>Partage ta première publication pour lancer ton feed 💜</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/communaute")}
                  className="px-6 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--accent) 100%)", color: "#fff", boxShadow: "0 6px 20px rgba(var(--accent-rgb),0.3)" }}
                >
                  Publier maintenant
                </motion.button>
              </motion.div>
            ) : (() => {
                const allPosts = userPosts;
                return allPosts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                    style={{ background: "linear-gradient(135deg,rgba(var(--surface-rgb),0.85) 0%,rgba(var(--tint-violet-rgb),0.5) 100%)", border: "1.5px dashed rgba(var(--accent-rgb),0.25)" }}
                  >
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4) 0%,rgba(var(--cream-mid-rgb),0.35) 100%)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                      <Camera size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="text-center px-8">
                      <p className="text-[17px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Aucune publication</p>
                      <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>Tes publications apparaîtront ici dès que tu en partageras une.</p>
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
                        className="rounded-3xl overflow-hidden cv-auto"
                        style={{
                          background: "rgba(var(--surface-rgb),0.85)",
                          border: "1px solid rgba(var(--accent-rgb),0.14)",
                          boxShadow: "0 4px 24px rgba(var(--accent-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),1)",
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold flex-shrink-0"
                              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}>
                              {displayAvatar
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img loading="lazy" decoding="async" src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                                : displayPseudo.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>@{displayPseudo}</p>
                                {(user?.is_certified || user?.is_admin || user?.email === "teyprox@gmail.com") && (
                                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,var(--accent),#7C5CFA)" }}>
                                    <svg width="8" height="8" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
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
                            style={{ background: "rgba(var(--accent-rgb),0.1)" }}
                          >
                            <MoreHorizontal size={16} strokeWidth={2} style={{ color: "#7C5CFA" }} />
                          </motion.button>
                        </div>

                        {/* Titre / Caption */}
                        {post.caption && (
                          <p className="px-4 pb-2 text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                            {post.caption}
                          </p>
                        )}

                        {/* Media */}
                        {post.media_url && (
                          <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
                            {post.media_type === "video"
                              ? <VideoPlayer src={post.media_url} maxHeight={380} controls />
                              // eslint-disable-next-line @next/next/no-img-element
                              : <img loading="lazy" decoding="async" src={post.media_url} alt="" className="w-full object-cover rounded-2xl" style={{ maxHeight: 380 }} />
                            }
                          </div>
                        )}

                        {/* Séance → poster « aura » (cliquable → détail) ; repas/jour → carte classique */}
                        {post.type === "workout" && post.performance_data ? (
                          <motion.div
                            className="px-4 mb-3 flex justify-center cursor-pointer"
                            whileTap={{ scale: 0.985 }}
                            onClick={() => { setSelectedPost(post); setEditingSelectedPost(false); }}
                          >
                            <PerfShareCard
                              data={perfDataToShare(post.performance_data as PerformanceData, { user: displayPseudo })}
                              width="min(330px, 100%)"
                            />
                          </motion.div>
                        ) : post.performance_data && (["meal", "day"] as const).includes(
                          (post.performance_data as { type?: string }).type as "meal" | "day"
                        ) ? (
                          <motion.div
                            className="px-4 mb-3 cursor-pointer"
                            whileTap={{ scale: 0.985 }}
                            onClick={() => { setSelectedPost(post); setEditingSelectedPost(false); }}
                          >
                            <PerformanceCard data={post.performance_data as PerformanceData} size="md" interactive />
                          </motion.div>
                        ) : null}

                        {/* Description */}
                        {post.description && (
                          <p className="px-4 pb-2 text-sm font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
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
                                    <Heart size={20} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#F43F5E" : "none"} style={{ color: liked ? "#F43F5E" : "var(--text-1)" }} />
                                  </motion.div>
                                </motion.button>

                                {/* Commentaire */}
                                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85, rotate: -15 }}
                                  onClick={() => setOpenPostComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                                  className="flex items-center cursor-pointer">
                                  <MessageCircle size={20} strokeWidth={1.5} fill={commentsOpen ? "rgba(var(--accent-rgb),0.2)" : "none"} style={{ color: commentsOpen ? "var(--accent)" : "var(--text-1)" }} />
                                </motion.button>

                                {/* Repost */}
                                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => togglePostRepost(post.id)} className="flex items-center cursor-pointer">
                                  <motion.div animate={reposted ? { rotate: [0,360], scale: [1,1.3,1] } : { rotate: 0 }} transition={{ duration: 0.45 }}>
                                    <Repeat2 size={20} strokeWidth={1.5} style={{ color: reposted ? "#2BD4A0" : "var(--text-1)" }} />
                                  </motion.div>
                                </motion.button>

                                {/* Partager */}
                                <motion.button whileHover={{ scale: 1.15, rotate: 15 }} whileTap={{ scale: 0.85 }} className="flex items-center cursor-pointer">
                                  <Share2 size={20} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
                                </motion.button>
                              </div>

                              {/* Stats */}
                              <div className="px-4 pt-2 pb-1">
                                {likesCount > 0 && (
                                  <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                                    {likesCount} j&apos;aime{repostsCount > 0 ? ` · ${repostsCount} repartage${repostsCount > 1 ? "s" : ""}` : ""}
                                  </p>
                                )}
                                <motion.p whileHover={{ color: "var(--text-1)" }}
                                  className="text-[11px] mt-1 cursor-pointer mb-3" style={{ color: "var(--text-3)" }}
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
                  style={{ background: "linear-gradient(135deg,rgba(var(--surface-rgb),0.85) 0%,rgba(var(--tint-violet-rgb),0.5) 100%)", border: "1.5px dashed rgba(var(--accent-rgb),0.25)" }}
                >
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4) 0%,rgba(var(--cream-mid-rgb),0.35) 100%)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                    <Film size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="text-center px-8">
                    <p className="text-[17px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Aucune vidéo</p>
                    <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>Tes publications vidéo apparaîtront ici automatiquement.</p>
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
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span className="text-[10px] font-semibold text-white">{formatViews(post.views ?? 0)}</span>
                      </div>
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
                style={{ background: "linear-gradient(135deg,rgba(var(--surface-rgb),0.85) 0%,rgba(var(--tint-violet-rgb),0.5) 100%)", border: "1.5px dashed rgba(var(--accent-rgb),0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4) 0%,rgba(var(--cream-mid-rgb),0.35) 100%)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                  <Bookmark size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Aucun enregistrement</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>Les vidéos que tu sauvegardes dans le feed apparaîtront ici.</p>
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
                      : <img loading="lazy" decoding="async" src={post.media_url ?? undefined} alt="" className="w-full h-full object-cover" />
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
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(var(--accent-rgb),0.85)" }}>
                        <Bookmark size={10} fill="white" style={{ color: "white" }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "badges" && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            <Badges />
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
                style={{ background: "linear-gradient(135deg,rgba(var(--surface-rgb),0.85) 0%,rgba(var(--tint-violet-rgb),0.5) 100%)", border: "1.5px dashed rgba(var(--accent-rgb),0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4) 0%,rgba(var(--cream-mid-rgb),0.35) 100%)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                  <Dumbbell size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Aucune séance enregistrée</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>Tes séances enregistrées apparaîtront ici une fois complétées.</p>
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
                      style={{ background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--violet-mid-rgb),0.2)", boxShadow: "0 2px 12px rgba(var(--accent-rgb),0.06)" }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" }}>
                        <Dumbbell size={16} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-0)" }}>{session.title || "Séance"}</p>
                        <p className="text-[11px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>
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
          <FollowListModal type={showFollowList} ownerId={user.id} onClose={() => setShowFollowList(null)} />
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
                background: "rgba(var(--surface-rgb),0.97)",
                boxShadow: "0 -12px 48px rgba(var(--accent-rgb),0.2)",
                maxHeight: "92dvh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}
                  >
                    {displayAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" decoding="async" src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                      : displayPseudo.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>@{displayPseudo}</p>
                      {(user?.is_certified || user?.is_admin || user?.email === "teyprox@gmail.com") && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,var(--accent),#7C5CFA)" }}>
                          <svg width="8" height="8" viewBox="0 0 13 13" fill="none">
                            <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
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
                      style={{ background: "rgba(var(--accent-rgb),0.15)", color: "#7C5CFA" }}
                    >
                      <Pencil size={11} strokeWidth={2} />
                      Modifier
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setSelectedPost(null); setEditingSelectedPost(false); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}
                  >
                    <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                  </motion.button>
                </div>
              </div>

              {/* ── Mode lecture ── */}
              {!editingSelectedPost && (
                <>
                  {selectedPost.caption && (
                    <p className="px-4 pb-2 text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                      {selectedPost.caption}
                    </p>
                  )}
                  {selectedPost.media_url && (
                    <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
                      {selectedPost.media_type === "video"
                        ? <VideoPlayer src={selectedPost.media_url} maxHeight={380} controls />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img loading="lazy" decoding="async" src={selectedPost.media_url} alt="" className="w-full object-cover rounded-2xl" style={{ maxHeight: 380 }} />
                      }
                    </div>
                  )}
                  {/* Séance → poster « aura » ; repas/jour → carte classique */}
                  {selectedPost.type === "workout" && selectedPost.performance_data ? (
                    <div className="px-4 pb-3 flex justify-center">
                      <PerfShareCard
                        data={perfDataToShare(selectedPost.performance_data as PerformanceData, { user: displayPseudo })}
                        width="min(320px, 100%)"
                      />
                    </div>
                  ) : selectedPost.performance_data && (["meal", "day"] as const).includes(
                    (selectedPost.performance_data as { type?: string }).type as "meal" | "day"
                  ) ? (
                    <div className="px-4 pb-3">
                      <PerformanceCard data={selectedPost.performance_data as PerformanceData} size="md" />
                    </div>
                  ) : null}

                  {/* Télécharger la carte de perf (posts workout) */}
                  {selectedPost.type === "workout" && selectedPost.performance_data && (
                    <div className="px-4 pb-3">
                      <PerfShareButton
                        data={perfDataToShare(selectedPost.performance_data as PerformanceData, { user: displayPseudo })}
                        label="Télécharger la carte"
                        iconSize={16}
                        ariaLabel="Télécharger la carte de perf"
                        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
                        style={{ background: "rgba(139,92,246,0.1)", color: "var(--accent)", border: "1px solid rgba(139,92,246,0.3)" }}
                      />
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
                            style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.15)", color: "var(--text-3)" }}>
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
                                accent:       "var(--accent)",
                                duration:     dur,
                                difficulty:   "Intermédiaire",
                                category:     pd?.category ?? "force",
                                exerciseList: exList,
                              });
                            }}
                            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
                            style={{
                              background: "linear-gradient(135deg,rgba(var(--accent-rgb),0.18) 0%,rgba(var(--violet-mid-rgb),0.12) 100%)",
                              border: "1px solid rgba(var(--accent-rgb),0.28)",
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
                    <p className="px-4 pb-3 text-sm font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                      {selectedPost.description}
                    </p>
                  )}
                  <div className="px-4 pb-5 flex items-center gap-2">
                    <Heart size={16} strokeWidth={0} fill="#F43F5E" style={{ color: "#F43F5E" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
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
                        : <img loading="lazy" decoding="async" src={selectedPost.media_url} alt="" className="w-full object-cover" style={{ maxHeight: 200 }} />
                      }
                    </div>
                  )}

                  {/* Titre */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>Titre</label>
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      maxLength={200}
                      className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.6)", color: "var(--text-1)" }}
                      placeholder="Titre du post..."
                      autoFocus
                    />
                  </div>

                  {/* Bio */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none leading-relaxed"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.6)", color: "var(--text-1)" }}
                      placeholder="Description du post..."
                    />
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setEditingSelectedPost(false)}
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)" }}
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
                          console.error("update caption:", error);
                          showToast("Modification non enregistrée, réessaie");
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
                        background: editSaving ? "rgba(var(--violet-mid-rgb),0.5)" : "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
                        color: "#3D2F6B",
                        boxShadow: editSaving ? "none" : "0 4px 16px rgba(var(--accent-rgb),0.3)",
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
