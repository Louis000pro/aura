"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Check, Lock, Crown, Link2, Camera, ChevronRight,
  Pencil, Dumbbell, Play, Users, Sparkles, Settings, Trash2, Shield,
} from "lucide-react";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import PerfShareButton from "@/components/PerfShareButton";
import PerfShareCard from "@/components/PerfShareCard";
import { perfDataToShare } from "@/lib/perfShareExport";
import VideoPlayer from "@/components/VideoPlayer";
import Image from "next/image";
import GemmeRang from "@/components/GemmeRang";
import RangsModal from "@/components/rang/RangsModal";
import { AvatarRang, PseudoRang, TitreRang } from "@/components/rang/IdentiteRang";
import { calculerAura, cosmetiquesDuRang, RANGS, type EtatAura } from "@/lib/aura";
import { noterRang } from "@/lib/celebrationRang";
import { SERIES, imageEtat, type SerieSlug } from "@/lib/defi";
import { chargerBadges } from "@/lib/messagerie";

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
};

type WorkoutSessionItem = {
  id: string;
  title: string | null;
  started_at: string | null;
  duration_minutes: number;
  elapsed_seconds: number;
  exercises?: unknown;
  category?: string | null;
};
import NotificationBell from "@/components/NotificationBell";
import WorkoutGuideModal, { type Exercise, resolveSessionId } from "@/components/WorkoutGuideModal";
import { heroImageForSeance } from "@/lib/workoutArt";
import type { WorkoutCategory } from "@/lib/assistantActions";
import Link from "next/link";
import { GOALS as GOALS_LIST, LEVELS as LEVELS_LIST } from "@/lib/profilOnboarding";
import { useAuth } from "@/context/AuthContext";
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
      className="fixed inset-0 z-[90] flex items-end md:items-center justify-center px-0 md:px-4 overflow-y-auto"
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
          maxHeight: "100dvh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
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


/* ─────────────── Privacy Modal ─────────────── */
function PrivacyModal({ onClose }: { onClose: () => void }) {
  const [dataSharing, setDataSharing] = useState(false);

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
            // « Analytiques » a été retiré avec PostHog le 2026-07-29 : l'interrupteur
            // ne pilotait rien (état local jamais enregistré) et promettait une
            // collecte qui n'existe plus.
            { label: "Partage de données", desc: "Partager vos stats avec la communauté", state: dataSharing, toggle: () => setDataSharing(v => !v) },
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

/* ─────────────── Main Page ─────────────── */
export default function ProfilPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"sillages" | "seances" | "amis">("sillages");
  const [aura, setAura] = useState<EtatAura | null>(null);
  const [amis, setAmis] = useState<{ id: string; pseudo: string; avatar_url?: string }[] | null>(null);
  const [badgeSlugs, setBadgeSlugs] = useState<Set<string>>(new Set());
  const [showEdit, setShowEdit] = useState(false);
  const [showRangs, setShowRangs] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [profilePseudo, setProfilePseudo] = useState(user?.pseudo ?? "");
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar ?? "");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileGoals, setProfileGoals] = useState<string[]>([]);
  const [profileLevel, setProfileLevel] = useState<string>("");
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
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
      supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([f2, f3]) => {
      setFollowingCount(f2.count ?? 0);
      setSessionCount(f3.count ?? 0);
    });
  }, [user?.id]);

  /* Rang (aura), amis (les gens que je suis) + affiches gagnées */
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const uid = user.id;

    void calculerAura(supabase, uid)
      .then((etat) => {
        // `null` = la base n'a pas répondu. On ne montre alors aucun rang
        // plutôt qu'un Bronze par défaut, qui serait faux pour la plupart.
        if (!etat) return;
        setAura(etat);
        noterRang(uid, etat.rang); // passage de rang : la célébration part du layout
      })
      .catch(() => {});

    // Amis = les profils que je suis (following)
    void (async () => {
      const { data: rows } = await supabase.from("followers").select("following_id").eq("follower_id", uid);
      const ids = (rows ?? []).map((r) => r.following_id as string);
      if (ids.length === 0) { setAmis([]); return; }
      const { data: profiles } = await supabase
        .from("profiles").select("id, pseudo, avatar_url").in("id", ids);
      setAmis((profiles ?? []) as { id: string; pseudo: string; avatar_url?: string }[]);
    })().catch(() => setAmis([]));

    // Affiches de relais débloquées (slugs serie-<x>)
    void chargerBadges(uid).then((slugs) => setBadgeSlugs(new Set(slugs))).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    // Affiches de perf : posts « séance » de l'utilisateur
    supabase
      .from("posts")
      .select("id, type, caption, description, performance_data, created_at, user_id, media_url, media_type, views")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error("posts query error:", error.message); return; }
        if (data) setUserPosts(data as unknown as UserPost[]);
      });

    // Séances : workout sessions
    supabase
      .from("workout_sessions")
      .select("id, title, started_at, duration_minutes, elapsed_seconds, exercises, category")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setWorkoutSessions(data as WorkoutSessionItem[]); });
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Rejouer une séance de l'historique : on relance le tunnel avec ses exercices
  // enregistrés ; à défaut, on tente de retrouver une séance « builtin » par son
  // titre. Si rien n'est rejouable (vieille séance sans exercices), on prévient.
  const refaireSeance = (session: WorkoutSessionItem) => {
    const exList = Array.isArray(session.exercises) ? (session.exercises as Exercise[]) : [];
    const builtinId = resolveSessionId(session.title ?? "");
    if (exList.length === 0 && !builtinId) {
      showToast("Séance trop ancienne pour être rejouée 🙏");
      return;
    }
    setProfileWorkout({
      sessionId: exList.length > 0 ? "profile-history" : builtinId!,
      title: session.title ?? "Séance",
      accent: "var(--accent)",
      duration: session.elapsed_seconds ? Math.round(session.elapsed_seconds / 60) : (session.duration_minutes || 30),
      difficulty: "Intermédiaire",
      category: session.category ?? "force",
      exerciseList: exList,
    });
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

  const displayPseudo = profilePseudo || user?.pseudo || "";
  const displayAvatar = profileAvatar || user?.avatar || "";
  // Les décorations gagnées (gemme, cadre, anneau, titre, pseudo brillant) se
  // déduisent du rang déjà calculé : rien à activer, rien à stocker.
  const rangCourant = aura?.rang ?? RANGS[0];
  const cosmetiques = cosmetiquesDuRang(aura?.rang.id ?? "");

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
        {/* Entrée provisoire vers le relais, le temps que l'accueil-parcours
            lui donne sa vraie place. */}
        <Link href="/defi">
          <motion.div
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(var(--surface-rgb),0.88)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(var(--violet-mid-rgb),0.45)",
              boxShadow: "0 2px 14px rgba(var(--accent-rgb),0.15)",
            }}
            aria-label="Le relais"
          >
            <Link2 size={15} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
          </motion.div>
        </Link>
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
        {/* Administration : l'écran existait déjà sur téléphone, mais au bout de
            quatre taps (Profil → Paramètres → tout en bas). Il vit là où on le
            cherche, et seulement pour un admin. */}
        {user?.is_admin && (
          <Link href="/admin">
            <motion.div
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
              style={{
                background: "rgba(var(--surface-rgb),0.88)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(var(--gold-rgb),0.5)",
                boxShadow: "0 2px 14px rgba(var(--gold-rgb),0.18)",
              }}
              aria-label="Administration"
            >
              <Shield size={15} strokeWidth={1.8} style={{ color: "var(--gold)" }} />
            </motion.div>
          </Link>
        )}
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
          {/* Avatar — container 120x120, crayon en badge bottom-right en dehors.
              AvatarRang pose par-dessus les décorations gagnées (cadre doré à l'Or,
              anneau animé au Platine) : rien à activer, ça suit le rang. */}
          <AvatarRang rang={rangCourant} cosmetiques={cosmetiques} size={120} className="mb-4">
            {/* Cercle avatar cliquable */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowEdit(true)}
              className="absolute inset-0 cursor-pointer rounded-full"
            >
              {/* Séparateur blanc */}
              <div className="absolute rounded-full bg-white" style={{ inset: 0 }} />
              {/* Photo */}
              <div
                className="absolute rounded-full overflow-hidden flex items-center justify-center text-4xl"
                style={{
                  inset: 3,
                  background: displayAvatar ? "transparent" : "linear-gradient(135deg,rgba(var(--tint-violet-rgb),1),rgba(var(--tint-cream-rgb),1))",
                  color: "#7C5CFA",
                  fontWeight: 300,
                  boxShadow: "0 12px 40px rgba(var(--accent-rgb),0.35)",
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
          </AvatarRang>

          {/* Pseudo + badge vérifié (+ gemme de rang à l'Argent, brillance à l'Éternel) */}
          <div className="flex items-center gap-2">
            <h1
              className="text-[28px] font-black tracking-[-0.03em] leading-none"
              style={{ color: "var(--text-0)" }}
            >
              <PseudoRang
                rang={rangCourant}
                cosmetiques={cosmetiques}
                pseudo={displayPseudo}
                tailleGemme={22}
              />
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

          {/* Titre débloqué au Diamant */}
          <TitreRang cosmetiques={cosmetiques} />

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

        {/* ─── Rang (l'aura) — la pièce maîtresse ─── */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          whileTap={{ scale: 0.985 }}
          /* Tant que l'aura n'est pas lue, la carte montre un squelette : on
             n'ouvre pas la galerie dessus, elle annoncerait « Bronze · 0 EXP »
             comme rang courant à quelqu'un qui est peut-être Diamant. */
          onClick={() => { if (aura) setShowRangs(true); }}
          className="w-full flex items-center gap-4 mb-3 px-4 py-3.5 rounded-3xl overflow-hidden cursor-pointer text-left"
          style={{
            background: "rgba(var(--surface-rgb),0.8)",
            border: "1px solid rgba(var(--accent-rgb),0.14)",
            boxShadow: "0 4px 24px rgba(var(--accent-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),1)",
            backdropFilter: "blur(10px)",
          }}
        >
          {aura ? (
            <>
              <div className="flex-shrink-0"><GemmeRang rang={aura.rang} size={44} /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--text-3)" }}>Ton rang</span>
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
              <ChevronRight size={18} strokeWidth={2} style={{ color: "var(--text-3)" }} />
            </>
          ) : (
            <div className="h-[60px] w-full rounded-2xl animate-pulse" style={{ background: "rgba(var(--tint-violet-rgb),0.5)" }} />
          )}
        </motion.button>

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
            { label: "Amis", value: followingCount !== null ? String(followingCount) : "0", clickable: true, tab: "amis" as const },
            { label: "Séances", value: sessionCount !== null ? String(sessionCount) : "0", clickable: true, tab: "seances" as const },
            { label: "Série", value: `🔥 ${aura?.detail.streak ?? 0}`, clickable: false, tab: null },
          ].map(({ label, value, clickable, tab }, i) => (
            <div key={label} className="flex items-stretch flex-1">
              {i > 0 && (
                <div className="w-px self-stretch my-3.5" style={{ background: "rgba(var(--violet-mid-rgb),0.3)" }} />
              )}
              <motion.button
                whileHover={clickable ? { scale: 1.05 } : {}}
                whileTap={clickable ? { scale: 0.94 } : {}}
                onClick={() => { if (tab) setActiveTab(tab); }}
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
            { id: "sillages" as const, Icon: Sparkles, label: "Sillages" },
            { id: "seances"  as const, Icon: Dumbbell, label: "Séances" },
            { id: "amis"     as const, Icon: Users,    label: "Amis" },
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
        {/* ─── Sillages : les affiches ─── */}
        {activeTab === "sillages" && (
          <motion.div
            key="sillages"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {/* Affiches du relais — gagnées en clair, verrouillées en cadenas */}
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

            {/* Tes affiches de perf (posts séance) */}
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
              Tes affiches de perf
            </p>
            {(() => {
              const posters = userPosts.filter((p) => p.type === "workout" && p.performance_data);
              return posters.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-14 gap-4 rounded-3xl"
                  style={{ background: "linear-gradient(135deg,rgba(var(--surface-rgb),0.85) 0%,rgba(var(--tint-violet-rgb),0.5) 100%)", border: "1.5px dashed rgba(var(--accent-rgb),0.25)" }}
                >
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4),rgba(var(--cream-mid-rgb),0.35))" }}>
                    <Sparkles size={24} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="text-center px-8">
                    <p className="text-[15px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Pas encore d&apos;affiche</p>
                    <p className="text-[12.5px] font-light mt-1.5 leading-relaxed" style={{ color: "var(--text-3)" }}>Termine une séance pour créer ton premier sillage.</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push("/progression")}
                    className="px-6 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                    style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--accent))", color: "#fff", boxShadow: "0 6px 20px rgba(var(--accent-rgb),0.3)" }}
                  >
                    Lancer une séance
                  </motion.button>
                </motion.div>
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
                      onClick={() => { setSelectedPost(post); setEditingSelectedPost(false); }}
                    >
                      <PerfShareCard data={perfDataToShare(post.performance_data as PerformanceData, { user: displayPseudo })} width="100%" />
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ─── Séances : historique ─── */}
        {activeTab === "seances" && (
          <motion.div
            key="seances-list"
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
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Aucune séance</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>Tes séances terminées apparaîtront ici, chacune vaut +30 EXP.</p>
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
                      onClick={() => refaireSeance(session)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer"
                      style={{ background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--violet-mid-rgb),0.2)", boxShadow: "0 2px 12px rgba(var(--accent-rgb),0.06)" }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.99 }}
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
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => { e.stopPropagation(); refaireSeance(session); }}
                        className="h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                        style={{ background: "rgba(var(--accent-rgb),0.10)", border: "1px solid rgba(var(--accent-rgb),0.22)" }}
                        title="Refaire cette séance"
                      >
                        <Play size={12} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
                        <span className="text-[11.5px] font-bold" style={{ color: "var(--accent)" }}>Refaire</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={async (e) => {
                          e.stopPropagation();
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

        {/* ─── Amis ─── */}
        {activeTab === "amis" && (
          <motion.div
            key="amis"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {amis === null ? (
              <div className="flex justify-center py-16">
                <motion.div className="w-6 h-6 rounded-full border-2"
                  style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
                  animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
              </div>
            ) : amis.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                style={{ background: "linear-gradient(135deg,rgba(var(--surface-rgb),0.85) 0%,rgba(var(--tint-violet-rgb),0.5) 100%)", border: "1.5px dashed rgba(var(--accent-rgb),0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.4) 0%,rgba(var(--cream-mid-rgb),0.35) 100%)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                  <Users size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>Aucun ami pour l&apos;instant</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>Lance un relais à deux pour t&apos;entourer.</p>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push("/communaute")}
                  className="px-6 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--accent))", color: "#fff", boxShadow: "0 6px 20px rgba(var(--accent-rgb),0.3)" }}>
                  Ouvrir la communauté
                </motion.button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-4 gap-x-2 gap-y-5">
                {amis.map((ami) => (
                  <Link key={ami.id} href={`/profil/${ami.pseudo}`} className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold"
                      style={{ background: ami.avatar_url ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)", border: "2px solid rgba(var(--surface-rgb),1)", boxShadow: "0 3px 10px -3px rgba(var(--accent-rgb),0.5)" }}>
                      {ami.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img loading="lazy" decoding="async" src={ami.avatar_url} alt={ami.pseudo} className="w-full h-full object-cover" />
                        : ami.pseudo.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10.5px] font-semibold max-w-[64px] truncate" style={{ color: "var(--text-2)" }}>{ami.pseudo}</span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* La galerie des rangs s'ouvre ICI (elle porte son propre portail) : la
          carte « Ton rang » renvoyait vers l'accueil, on perdait l'utilisateur. */}
      <RangsModal
        open={showRangs}
        onClose={() => setShowRangs(false)}
        expActuel={aura?.exp ?? 0}
        rangActuelId={rangCourant.id}
        pseudo={displayPseudo}
        avatarUrl={displayAvatar || null}
        isAdmin={!!user?.is_admin}
      />

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
            heroImage={heroImageForSeance({ title: profileWorkout.title, category: profileWorkout.category as WorkoutCategory })}
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
                  <div className="pb-3" />
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
