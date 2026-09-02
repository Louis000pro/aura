"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Check, Lock, Crown, Camera, ChevronRight,
  Pencil, Dumbbell, Play, Users, Sparkles, Settings, Trash2, Shield, Share2,
} from "lucide-react";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import PerfShareCard from "@/components/PerfShareCard";
import { perfDataToShare, type PerfShareData } from "@/lib/perfShareExport";
import VideoPlayer from "@/components/VideoPlayer";
import Image from "next/image";
import GemmeRang from "@/components/GemmeRang";
import EtatVideGuide from "@/components/EtatVideGuide";
import RangsModal from "@/components/rang/RangsModal";
import { AvatarRang, PseudoRang, TitreRang } from "@/components/rang/IdentiteRang";
import { calculerAura, cosmetiquesDuRang, RANGS, type EtatAura } from "@/lib/aura";
import { noterRang } from "@/lib/celebrationRang";
import { SERIES, imageEtat, type SerieSlug } from "@/lib/defi";
import { chargerBadgesAura } from "@/lib/badgesAura";
import type { ProgresBadges } from "@/lib/badges";
import EtagereBadges from "@/components/profil/EtagereBadges";
import CourbePoids from "@/components/profil/CourbePoids";
import CarteConstance from "@/components/profil/CarteConstance";
import WeighInPrompt from "@/components/WeighInPrompt";
import AvecQui from "@/components/communaute/AvecQui";
import EnvoyerAffiche from "@/components/communaute/EnvoyerAffiche";

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
        boxShadow: "var(--ombre-flottant)",
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
        style={{ background: "rgba(var(--surface-rgb),0.98)", boxShadow: "var(--ombre-flottant)" }}
      >
        <p className="text-base font-semibold mb-1" style={{ color: "var(--text-1)" }}>Recadre ta photo</p>
        <p className="text-[11px] mb-4" style={{ color: "var(--text-3)" }}>Glisse pour déplacer · zoome avec le curseur</p>

        {/* Viewport circulaire */}
        <div
          className="relative overflow-hidden select-none"
          style={{ width: V, height: V, borderRadius: "50%", touchAction: "none", cursor: "grab", background: "rgba(var(--text-3-rgb),0.18)" }}
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
            style={{ background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--accent) 100%)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
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
              boxShadow: "var(--ombre-action)",
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
            <label className="vy-label mb-1.5 block" style={{ color: "var(--text-3)" }}>
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
            <label className="vy-label mb-1.5 block" style={{ color: "var(--text-3)" }}>
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
            <label className="vy-label mb-1.5 flex items-center justify-between" style={{ color: "var(--text-3)" }}>
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
            boxShadow: "var(--ombre-action)",
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


/* La feuille « Confidentialité » a été supprimée le 2026-08-30. Aucun
   chemin ne pouvait l'ouvrir (`setShowPrivacy(true)` n'était appelé nulle
   part) et son unique interrupteur, « Partage de données », n'était qu'un
   `useState` local : il ne lisait rien, n'écrivait rien et ne pilotait rien.
   Un réglage qui ne règle rien est pire qu'un réglage absent. Les vrais
   réglages vivent dans /parametres. */

/* ─────────────── Main Page ─────────────── */
export default function ProfilPage() {
  const { user, session, refreshProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"collection" | "progres" | "amis">("collection");
  const [avecQui, setAvecQui] = useState(false);
  const [afficheAEnvoyer, setAfficheAEnvoyer] = useState<PerfShareData | null>(null);
  const [aura, setAura] = useState<EtatAura | null>(null);
  const [amis, setAmis] = useState<{ id: string; pseudo: string; avatar_url?: string }[] | null>(null);
  const [badgeSlugs, setBadgeSlugs] = useState<Set<string>>(new Set());
  /* Ce qu'il reste à faire pour le prochain badge. Le serveur ne le rend
     que pour soi : sur le profil de quelqu'un d'autre, il vaut `null` et
     l'étagère se tait là-dessus. */
  const [progresBadges, setProgresBadges] = useState<ProgresBadges | null>(null);
  /* La carte de constance ne remonte jamais avant l'inscription : des
     semaines vides d'avant l'arrivée dessineraient un échec pour une
     période où la personne ne connaissait pas Vaiiya. */
  const [inscritLe, setInscritLe] = useState<string | null>(null);
  const [pesee, setPesee] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRangs, setShowRangs] = useState(false);
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
      .select("pseudo, avatar_url, full_name, bio, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.pseudo) setProfilePseudo(data.pseudo);
          if (data.avatar_url) setProfileAvatar(data.avatar_url);
          if (data.full_name) setProfileFullName(data.full_name);
          if (data.bio) setProfileBio(data.bio);
          if (data.created_at) setInscritLe(data.created_at as string);
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
    void chargerBadgesAura(uid)
      .then(({ slugs, progres }) => { setBadgeSlugs(slugs); setProgresBadges(progres); })
      .catch(() => {});
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

  /* ⚠️ Les objectifs se lisaient dans `aura_onboarding_<pseudo>`, la clé de
     la modale d'inscription SUPPRIMÉE le 2026-08-22. Depuis ce jour-là, tout
     compte créé répondait au questionnaire /bienvenue et voyait quand même un
     profil muet : ni objectif, ni niveau. Il n'y a qu'un questionnaire et
     qu'une source, `profiles.onboarding_*` (`lib/profilOnboarding.ts`).
     La copie locale `vaiiya_ob_<id>`, écrite par le même module, sert de
     repli hors ligne : elle est toujours à jour, mais jamais autoritaire. */
  useEffect(() => {
    if (!user?.id) return;
    let vivant = true;

    const poser = (goals: string[], level: string) => {
      if (!vivant) return;
      setProfileGoals(goals);
      setProfileLevel(level);
    };

    void createClient()
      .from("profiles")
      .select("onboarding_goals, onboarding_level")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data.onboarding_goals || data.onboarding_level)) {
          poser(
            Array.isArray(data.onboarding_goals) ? data.onboarding_goals : [],
            data.onboarding_level ?? "",
          );
          return;
        }
        try {
          const brut = localStorage.getItem(`vaiiya_ob_${user.id}`);
          if (!brut) return;
          const d = JSON.parse(brut) as { goals?: string[]; level?: string };
          poser(Array.isArray(d.goals) ? d.goals : [], d.level ?? "");
        } catch { /* rien à lire, on n'affiche rien */ }
      });

    return () => { vivant = false; };
  }, [user?.id]);

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
        {/* L'icône chaîne « provisoire » vers /defi a été retirée le
            2026-08-30 : le relais a maintenant sa place, et c'est la
            conversation. Cinq boutons y menaient dans l'app, aucun là où
            l'on arrive ; celui-ci ouvrait un écran qui n'était relié à
            rien et dont on ne ressortait que par le bouton du navigateur.
            Les affiches gagnées, elles, restent dans la galerie ci-dessous. */}
        <Link href="/premium">
          <motion.div
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
              boxShadow: "var(--ombre-action)",
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
              /* Le verre, la bordure dorée et le halo sont partis : la cloche
                 juste à côté est une icône NUE, donc c'était ce bouton-ci
                 l'intrus. Une seule action colorée dans la rangée, la couronne. */
              className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
              aria-label="Administration"
            >
              <Shield size={17} strokeWidth={1.8} style={{ color: "var(--or-encre)" }} />
            </motion.div>
          </Link>
        )}
        <Link href="/parametres">
          <motion.div
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
          >
            <Settings size={17} strokeWidth={1.7} style={{ color: "var(--text-2)" }} />
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
              <div className="absolute rounded-full" style={{ inset: 0, background: "rgb(var(--surface-rgb))" }} />
              {/* Photo */}
              <div
                className="absolute rounded-full overflow-hidden flex items-center justify-center text-4xl"
                style={{
                  inset: 3,
                  background: displayAvatar ? "transparent" : "linear-gradient(135deg,rgba(var(--tint-violet-rgb),1),rgba(var(--tint-cream-rgb),1))",
                  color: "var(--exp-encre)",
                  fontWeight: 300,
                  boxShadow: "var(--ombre-pose)",
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
                background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                boxShadow: "var(--ombre-action)",
                border: "3px solid rgb(var(--surface-rgb))",
                zIndex: 30,
              }}
            >
              <Pencil size={13} strokeWidth={2.3} style={{ color: "#fff" }} />
            </motion.button>
          </AvatarRang>

          {/* Pseudo + badge vérifié (+ gemme de rang à l'Argent, brillance à l'Éternel) */}
          <div className="flex items-center gap-2">
            <h1 className="vy-titre" style={{ color: "var(--text-0)" }}>
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
                  background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
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

          {/* Objectifs et niveau : une seule ligne, une seule idée. */}
          {(profileGoals.length > 0 || profileLevel) && (
            <p className="vy-label mt-2 max-w-[290px]" style={{ color: "var(--exp-encre)" }}>
              {[
                ...profileGoals
                  .map((id) => GOALS_LIST.find((g) => g.id === id))
                  .filter(Boolean)
                  .map((g) => `${g!.emoji} ${g!.label}`),
                ...(profileLevel
                  ? [LEVELS_LIST.find((l) => l.id === profileLevel)?.label ?? profileLevel]
                  : []),
              ].join(" · ")}
            </p>
          )}

          {/* Bio */}
          {profileBio && (
            <p className="vy-corps mt-2.5 max-w-[280px]">
              {profileBio}
            </p>
          )}
        </motion.div>

        {/* ─── LE RANG ET LES TROIS CHIFFRES SONT UN SEUL ENSEMBLE ───
             C'étaient deux cartes au style STRICTEMENT identique (même surface
             translucide, même bordure violette, même halo, même verre dépoli),
             posées l'une sous l'autre avec 12 px entre elles. Deux surfaces
             pour une seule idée, « où j'en suis », c'est la forme qui fait
             « tableau de bord généré ».
             Le modèle est celui des Paramètres : UN groupe, des filets à
             l'intérieur. La séparation vient du trait, pas d'une deuxième
             surface. Et comme le bloc ne flotte au-dessus de rien, il n'a ni
             ombre ni verre. ─── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 overflow-hidden"
          style={{
            borderRadius: "var(--r-bloc)",
            background: "rgba(var(--surface-rgb),0.9)",
            border: "1px solid rgba(var(--text-3-rgb),0.16)",
          }}
        >
          {/* Le rang. `.vy-filet` porte le trait qui le sépare du trio :
              la règle est `.vy-filet + .vy-filet`, donc c'est le SECOND qui
              le reçoit, et un jour où l'un des deux disparaîtrait il n'y
              aurait pas de trait orphelin. */}
          <motion.button
            whileTap={{ scale: 0.99 }}
            /* Tant que l'aura n'est pas lue, la ligne montre un squelette : on
               n'ouvre pas la galerie dessus, elle annoncerait « Bronze · 0 EXP »
               comme rang courant à quelqu'un qui est peut-être Diamant. */
            onClick={() => { if (aura) setShowRangs(true); }}
            className="vy-filet w-full flex items-center gap-4 px-4 py-4 cursor-pointer text-left"
          >
            {aura ? (
              <>
                <div className="flex-shrink-0"><GemmeRang rang={aura.rang} size={44} /></div>
                <div className="flex-1 min-w-0">
                  <span className="vy-label block">Ton rang</span>
                  <p className="vy-sous mt-0.5" style={{ color: "var(--text-0)" }}>{aura.rang.nom}</p>
                  <p className="vy-label mt-1" style={{ color: "var(--text-soft)" }}>
                    <span style={{ color: "var(--exp-encre)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{aura.exp}</span> / {aura.seuilHaut} EXP
                  </p>
                  <div className="h-[6px] rounded-full mt-2 overflow-hidden" style={{ background: "rgba(var(--tint-violet-rgb),0.9)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, Math.max(4, ((aura.exp - aura.seuilBas) / Math.max(1, aura.seuilHaut - aura.seuilBas)) * 100))}%`,
                      background: "linear-gradient(90deg,#8B5CF6,#C13BC1)",
                    }} />
                  </div>
                </div>
                <ChevronRight size={18} strokeWidth={2} style={{ color: "var(--text-3)" }} />
              </>
            ) : (
              <div className="h-[60px] w-full animate-pulse" style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--tint-violet-rgb),0.5)" }} />
            )}
          </motion.button>

          {/* Les trois chiffres : la même question, « où j'en suis », donc le
              même ensemble. */}
          <div className="vy-filet flex items-stretch">
            {[
              { label: "Amis", value: followingCount !== null ? String(followingCount) : "0", clickable: true, tab: "amis" as const, encre: "var(--text-0)" },
              { label: "Séances", value: sessionCount !== null ? String(sessionCount) : "0", clickable: true, tab: "progres" as const, encre: "var(--text-0)" },
              /* La série est le seul des trois qui porte une couleur, et c'est
                 l'orange de l'ÉNERGIE (système D). Elle était en encre normale,
                 donc la flamme était le seul signe et elle se lisait comme un
                 emoji décoratif posé devant un chiffre. */
              { label: "Série", value: `🔥 ${aura?.detail.streak ?? 0}`, clickable: false, tab: null, encre: "var(--feu-encre)" },
            ].map(({ label, value, clickable, tab, encre }, i) => (
              <div key={label} className="flex items-stretch flex-1">
                {i > 0 && (
                  <div className="w-px self-stretch my-4" style={{ background: "rgba(var(--text-3-rgb),0.16)" }} />
                )}
                <motion.button
                  whileTap={clickable ? { scale: 0.96 } : {}}
                  onClick={() => { if (tab) setActiveTab(tab); }}
                  className="flex-1 flex flex-col items-center py-4"
                  style={{ cursor: clickable ? "pointer" : "default" }}
                >
                  {/* Les trois chiffres du profil. Ils étaient à 24 px en graisse 900,
                      soit la même présence qu'un titre de section : rien ne disait que
                      c'était eux qu'on vient regarder ici. Ils grandissent, leur graisse
                      descend (900 n'existait pas dans les fichiers de la police, le
                      navigateur le fabriquait) et ils passent en chasse fixe, pour que
                      la ligne ne se décale pas quand la série passe de 9 à 10. */}
                  <span className="vy-nombre text-[30px] leading-none" style={{ color: encre }}>
                    {value}
                  </span>
                  {/* ⚠️ L'encre, pas `--accent` : le violet décoratif tombe à 2,6:1 sur
                      le blanc, et ce libellé porte une action. */}
                  <span className="vy-label mt-2" style={{ color: clickable ? "var(--exp-encre)" : "var(--text-2)" }}>
                    {label}
                  </span>
                </motion.button>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ─── Tabs ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex gap-1 mb-6 p-1"
          style={{
            borderRadius: "calc(var(--r-controle) + 4px)",
            background: "rgba(var(--tint-violet-rgb),0.7)",
          }}
        >
          {([
            { id: "collection" as const, Icon: Sparkles, label: "Collection" },
            { id: "progres"    as const, Icon: Dumbbell, label: "Progrès" },
            { id: "amis"       as const, Icon: Users,    label: "Amis" },
          ]).map(({ id, Icon, label }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              className="vy-label flex-1 py-2 cursor-pointer flex items-center justify-center gap-1.5"
              animate={{
                background: activeTab === id ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "transparent",
                color: activeTab === id ? "#fff" : "var(--text-3)",
              }}
              style={{
                borderRadius: "var(--r-controle)",
                boxShadow: activeTab === id ? "var(--ombre-action)" : "none",
                fontWeight: 600,
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
        {activeTab === "collection" && (
          <motion.div
            key="collection"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {/* Affiches du relais — gagnées en clair, verrouillées en cadenas */}
            <p className="vy-label mb-3" style={{ color: "var(--text-3)" }}>
              Affiches du relais
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {(Object.keys(SERIES) as SerieSlug[]).map((slug) => {
                const serie = SERIES[slug];
                const gagnee = badgeSlugs.has(`serie-${slug}`);
                // ⚠️ C'est l'affiche VERROUILLÉE qui s'ouvre, pas celle qu'on a
                // gagnée : la galerie arrête d'être une vitrine et devient une
                // porte, exactement comme une carte Premium verrouillée ouvre
                // l'aperçu au lieu de ne rien faire. Une affiche déjà gagnée n'a
                // rien à ouvrir, elle reste donc inerte et sans affordance.
                const Cadre = gagnee ? "div" : "button";
                return (
                  <Cadre
                    key={slug}
                    {...(gagnee ? {} : {
                      type: "button" as const,
                      onClick: () => setAvecQui(true),
                      "aria-label": `Lancer un relais pour dévoiler ${serie.nom}`,
                    })}
                    /* Une affiche est une IMAGE : c'est le grand rayon, celui
                       qu'aucun bloc ni aucun contrôle ne porte. Le liseré blanc
                       à 6 % ne séparait rien, il décorait. */
                    className={`relative overflow-hidden w-full text-left${gagnee ? "" : " cursor-pointer"}`}
                    style={{ aspectRatio: "9/16", borderRadius: "var(--r-affiche)", boxShadow: "var(--ombre-pose)" }}
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
                      <p className="vy-sous">{serie.nom}</p>
                      <p className="vy-label mt-0.5" style={{ color: "#fff", opacity: 0.78 }}>
                        {gagnee ? "Dévoilée · à deux" : serie.promesse}
                      </p>
                    </div>
                    {!gagnee && (
                      <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(10,6,18,0.42)" }}>
                        <Lock size={22} strokeWidth={2} style={{ color: "rgba(255,255,255,0.55)" }} />
                      </div>
                    )}
                  </Cadre>
                );
              })}
            </div>

            {/* L'étagère : ce que le relais a donné en plus des affiches.
                Muette tant qu'on n'a rien gagné. */}
            <EtagereBadges slugs={badgeSlugs} titre="Tes badges" progres={progresBadges} />

            {/* Tes affiches de perf (posts séance) */}
            <p className="vy-label mb-3" style={{ color: "var(--text-3)" }}>
              Tes affiches de perf
            </p>
            {(() => {
              const posters = userPosts.filter((p) => p.type === "workout" && p.performance_data);
              return posters.length === 0 ? (
                /* Le post-it en pointillés est parti avec les deux autres :
                   Séances et Amis parlent déjà par la bouche du Guide, et un
                   troisième dialecte sur le même écran, c'en était un de trop.
                   Une porte, jamais deux : l'affiche se gagne en TERMINANT
                   une séance, donc le bouton ouvre le catalogue et rien
                   d'autre. */
                <EtatVideGuide
                  cle="vide.affiches"
                  action={{ libelle: "Voir les séances", onClick: () => router.push("/progression") }}
                />
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

        {/* ─── Progrès : le poids, la constance, puis l'historique ───
             L'onglet s'appelait « Séances » et ne portait qu'une liste.
             Le poids et l'historique répondent à la même question, où
             j'en suis, donc ils vivent ensemble plutôt que dans un
             quatrième onglet : sur un écran de 360 px, quatre onglets
             font 80 px chacun. ─── */}
        {activeTab === "progres" && (
          <motion.div
            key="progres"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 md:px-8 max-w-3xl mx-auto"
          >
            {/* Le poids et la constance répondent à la même question, « est-ce
                que ça bouge ? », et ils portaient DEUX fois exactement le même
                dessin de carte. Un seul cadre, un filet entre les deux. */}
            {user && (
              <div
                className="mb-6 overflow-hidden"
                style={{
                  borderRadius: "var(--r-bloc)",
                  background: "rgba(var(--surface-rgb),0.9)",
                  border: "1px solid rgba(var(--text-3-rgb),0.16)",
                }}
              >
                <CourbePoids userId={user.id} onPeser={() => setPesee(true)} />
                <CarteConstance
                  userId={user.id}
                  inscritLe={inscritLe}
                  /* La plus longue série vient de `badges_aura`, jamais d'un
                     second calcul : c'est le même nombre qui débloque les
                     badges de régularité, et il n'en existe qu'un. */
                  serieRecord={progresBadges?.serie ?? null}
                />
              </div>
            )}

            <p className="vy-label mb-3" style={{ color: "var(--text-3)" }}>
              Tes séances
            </p>

            {workoutSessions.length === 0 ? (
              /* Le Guide prend la place du texte gris : c'est lui qui
                 ouvre la porte, et il n'en ouvre qu'une. Le « +30 EXP »
                 d'avant a disparu avec le cadre : sur un écran vide, un
                 barème n'apprend rien à quelqu'un qui cherche par où
                 commencer. */
              <EtatVideGuide
                cle="vide.seances"
                action={{ libelle: "Voir les séances", onClick: () => router.push("/progression") }}
              />
            ) : (
              /* C'était le cas d'école : autant de cartes que de séances,
                 toutes au même dessin, séparées par 12 px de vide. Une liste
                 de choses de MÊME nature se pose en liste, pas en cartes :
                 un seul contour, des filets entre les lignes. Le commentaire
                 de `.vy-filet` dans globals.css dit exactement ça, et c'est
                 son premier emploi réel. */
              <div
                className="overflow-hidden"
                style={{
                  borderRadius: "var(--r-bloc)",
                  background: "rgba(var(--surface-rgb),0.9)",
                  border: "1px solid rgba(var(--text-3-rgb),0.16)",
                }}
              >
                {workoutSessions.map((session) => {
                  const durationMin = session.elapsed_seconds
                    ? Math.round(session.elapsed_seconds / 60)
                    : session.duration_minutes || null;
                  return (
                    <motion.div
                      key={session.id}
                      onClick={() => refaireSeance(session)}
                      className="vy-filet flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" }}>
                        <Dumbbell size={16} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
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
                        className="h-8 px-3 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                        style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--accent-rgb),0.12)" }}
                        title="Refaire cette séance"
                      >
                        <Play size={12} strokeWidth={2.2} style={{ color: "var(--exp-encre)" }} />
                        <span className="text-[11.5px] font-bold" style={{ color: "var(--exp-encre)" }}>Refaire</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const supabase = createClient();
                          const { error } = await supabase.from("workout_sessions").delete().eq("id", session.id);
                          if (!error) setWorkoutSessions(prev => prev.filter(s => s.id !== session.id));
                        }}
                        className="w-8 h-8 flex items-center justify-center flex-shrink-0 cursor-pointer"
                        style={{ borderRadius: "var(--r-controle)", background: "rgba(252,129,129,0.12)" }}
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
              <EtatVideGuide
                cle="vide.amis"
                action={{ libelle: "Ouvrir la communauté", onClick: () => router.push("/communaute") }}
              />
            ) : (
              <div className="grid grid-cols-4 gap-x-2 gap-y-5">
                {amis.map((ami) => (
                  <Link key={ami.id} href={`/profil/${ami.pseudo}`} className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold"
                      style={{ background: ami.avatar_url ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)", border: "2px solid rgba(var(--surface-rgb),1)" }}>
                      {ami.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img loading="lazy" decoding="async" src={ami.avatar_url} alt={ami.pseudo} className="w-full h-full object-cover" />
                        : ami.pseudo.charAt(0).toUpperCase()}
                    </div>
                    <span className="vy-label max-w-[64px] truncate">{ami.pseudo}</span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* La galerie des rangs s'ouvre ICI (elle porte son propre portail) : la
          carte « Ton rang » renvoyait vers l'accueil, on perdait l'utilisateur. */}
      {/* La MÊME feuille que le rendez-vous mensuel de la nutrition, pilotée
          d'ici. Une seule porte pour se peser dans toute l'app : une seconde
          saisie écrirait la même colonne avec ses propres règles. */}
      <WeighInPrompt ouvert={pesee} onFermer={() => setPesee(false)} />

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
                          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}>
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
                      style={{ background: "rgba(var(--accent-rgb),0.15)", color: "var(--exp-encre)" }}
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

                  {/* Envoyer l'affiche. La même feuille et les mêmes deux
                      sorties qu'en fin de séance : une discussion, ou le
                      dehors. Une affiche gardée doit rester envoyable, sinon
                      elle n'est partageable que pendant les trente secondes
                      qui suivent la séance. */}
                  {selectedPost.type === "workout" && selectedPost.performance_data && (
                    <div className="px-4 pb-3">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setAfficheAEnvoyer(
                          perfDataToShare(selectedPost.performance_data as PerformanceData, { user: displayPseudo })
                        )}
                        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
                        style={{ background: "rgba(139,92,246,0.1)", color: "var(--exp-encre)", border: "1px solid rgba(139,92,246,0.3)" }}
                      >
                        <Share2 size={16} strokeWidth={2} /> Envoyer à quelqu&apos;un
                      </motion.button>
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
                            <span>Séance perso, exercices non embarqués</span>
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
                              color: "var(--exp-encre)",
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
                    <label className="text-[11px] font-boldst" style={{ color: "var(--text-3)" }}>Titre</label>
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
                    <label className="text-[11px] font-boldst" style={{ color: "var(--text-3)" }}>Bio</label>
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
                        background: editSaving ? "rgba(var(--violet-mid-rgb),0.5)" : "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                        color: "#fff",
                        boxShadow: editSaving ? "none" : "var(--ombre-action)",
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

      {/* La porte du relais, ouverte depuis une affiche verrouillée.
          C'est la MÊME feuille que dans la communauté, pas une seconde
          écrite ici : elle vit dans `components/communaute/AvecQui`. */}
      <AnimatePresence>
        {afficheAEnvoyer && user && (
          <EnvoyerAffiche
            data={afficheAEnvoyer}
            moi={user.id}
            accessToken={session?.access_token}
            onFermer={() => setAfficheAEnvoyer(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {avecQui && user && (
          <AvecQui
            moi={user.id}
            onFermer={() => setAvecQui(false)}
            onFil={(id) => { setAvecQui(false); router.push(`/communaute/${id}`); }}
            onLien={() => { setAvecQui(false); router.push("/defi"); }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
