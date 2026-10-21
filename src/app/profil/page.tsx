"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Check, Lock, Camera, ChevronRight, ChevronDown,
  Pencil, Settings, Share2,
} from "lucide-react";
import { type PerformanceData } from "@/components/PerformanceCard";
import Image from "next/image";
import GemmeRang from "@/components/GemmeRang";
import EtatVideGuide from "@/components/EtatVideGuide";
import RangsModal from "@/components/rang/RangsModal";
import { AvatarRang, PseudoRang, TitreRang } from "@/components/rang/IdentiteRang";
import FlammeSerie from "@/components/serie/FlammeSerie";
import { calculerAura, cosmetiquesDuRang, progressionRang, RANGS, type EtatAura } from "@/lib/aura";
import { noterRang } from "@/lib/celebrationRang";
import { SERIES, imageEtat, type SerieSlug } from "@/lib/defi";
import { chargerBadgesAura } from "@/lib/badgesAura";
import type { ProgresBadges } from "@/lib/badges";
import EtagereBadges from "@/components/profil/EtagereBadges";
import CouvertureSeance from "@/components/profil/CouvertureSeance";
import FeuilleAfficheSeance from "@/components/profil/FeuilleAfficheSeance";
import { type ReglageAffiche, ecrireReglagesAffiches, lireReglagesAffiches } from "@/lib/afficheSeance";
import CourbePoids from "@/components/profil/CourbePoids";
import CarteConstance from "@/components/profil/CarteConstance";
import HistoriqueMasque from "@/components/historique/HistoriqueMasque";
import { debutHistorique, estVisible, historiqueComplet } from "@/lib/historique";
import WeighInPrompt from "@/components/WeighInPrompt";
import AvecQui from "@/components/communaute/AvecQui";

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

/** L'affiche d'une séance du journal : son titre, sa date, sa durée et
 *  son nombre d'exercices. On lit le journal, on n'invente aucun chiffre. */
function afficheDeSeance(w: WorkoutSessionItem): PerformanceData {
  const minutes = w.elapsed_seconds ? Math.round(w.elapsed_seconds / 60) : w.duration_minutes || 0;
  const exos = Array.isArray(w.exercises) ? w.exercises.length : 0;
  const metrics: PerformanceData["metrics"] = [];
  if (minutes) metrics.push({ label: "Durée", value: String(minutes), unit: "min" });
  if (exos) metrics.push({ label: "Exercices", value: String(exos), unit: exos > 1 ? "exercices" : "exercice" });
  return {
    type: "workout",
    title: w.title || "Séance",
    date: w.started_at ? new Date(w.started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "",
    metrics,
  };
}
import NotificationBell from "@/components/NotificationBell";
import { type Exercise, resolveSessionId } from "@/components/WorkoutGuideModal";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
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
      <span className="text-[13px] font-medium">{message}</span>
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
  useEffect(() => { setOffset((o) => clamp(o)); }, [zoom, natural]);

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
        <p className="text-[16px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>Recadre ta photo</p>
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
            className="flex-1 py-3 rounded-2xl text-[13px] font-semibold cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)", color: "var(--text-2)" }}>
            Annuler
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={confirm}
            className="flex-1 py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
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
        className="w-full max-w-md rounded-t-[var(--r-feuille)] md:rounded-[var(--r-feuille)] p-6 pb-8 md:pb-6"
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
          <h2 className="text-[20px] font-semibold" style={{ color: "var(--text-1)" }}>Modifier le profil</h2>
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
            className="w-24 h-24 rounded-full flex items-center justify-center text-[26px] font-light cursor-pointer relative overflow-hidden"
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
          <p className="text-[11px] mt-2" style={{ color: "var(--text-3)" }}>Appuie pour changer la photo</p>
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
              className="w-full px-4 py-3 rounded-2xl text-[16px] outline-none"
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
              className="w-full px-4 py-3 rounded-2xl text-[16px] outline-none"
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
              className="w-full px-4 py-3 rounded-2xl text-[16px] outline-none resize-none"
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
          className="w-full mt-5 py-3.5 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2"
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
  const { user, refreshProfile } = useAuth();
  const { launchWorkout } = useWorkoutLaunch();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"collection" | "progres" | "amis">("collection");
  const [objectifsOuverts, setObjectifsOuverts] = useState(false);
  const [avecQui, setAvecQui] = useState(false);
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
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionItem[]>([]);
  const [afficheOuverte, setAfficheOuverte] = useState<WorkoutSessionItem | null>(null);
  const [afficheGardee, setAfficheGardee] = useState<{ post: UserPost; numero: number; teinte: number } | null>(null);
  const [reglagesAffiches, setReglagesAffiches] = useState<Record<string, ReglageAffiche>>({});
  useEffect(() => {
    if (!user?.id) return;
    const id = user.id;
    // Lu après le montage : le stockage n'existe pas au rendu serveur.
    queueMicrotask(() => setReglagesAffiches(lireReglagesAffiches(id)));
  }, [user?.id]);
  /* Compte gratuit : l'écran MONTRE les 7 derniers jours, la base garde
     tout (lib/historique, conditions article 3). Un seul encart pour tout
     l'onglet, allumé dès qu'un des trois blocs a quelque chose de masqué. */
  const debutHisto = debutHistorique(historiqueComplet(user));
  const seancesVisibles = workoutSessions.filter((w) => !w.started_at || estVisible(w.started_at, debutHisto));
  const [poidsMasque, setPoidsMasque] = useState(false);
  const [constanceMasquee, setConstanceMasquee] = useState(false);
  const historiqueMasque = !!debutHisto
    && (poidsMasque || constanceMasquee || seancesVisibles.length < workoutSessions.length);

  /* Fetch profile + stats */
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    supabase
      // `mon_profil` : le nom complet est une colonne privée (audit du 2026-10-17).
      .from("mon_profil")
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
    launchWorkout({
      sessionId: exList.length > 0 ? "profile-history" : builtinId!,
      title: session.title ?? "Séance",
      accent: "var(--accent)",
      duration: session.elapsed_seconds ? Math.round(session.elapsed_seconds / 60) : (session.duration_minutes || 30),
      difficulty: "Intermédiaire",
      category: session.category ?? "force",
      heroImage: heroImageForSeance({ title: session.title ?? "Séance", category: session.category as WorkoutCategory }),
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

  /* Les dérivés de l'en-tête (maquette du 2026-10-14). */
  const objectifs: string[] = [];
  for (const id of profileGoals) {
    const libelle = GOALS_LIST.find((g) => g.id === id)?.label;
    if (libelle) objectifs.push(libelle);
  }
  const niveau = profileLevel ? (LEVELS_LIST.find((l) => l.id === profileLevel)?.label ?? profileLevel) : null;
  const serieJours = Math.max(1, aura?.detail.streak ?? 0);
  // La même mesure que la galerie des rangs et la tuile de l'accueil.
  const progression = aura ? progressionRang(aura.exp) : null;
  const rangSuivant = progression?.suivant ?? null;
  const membreDepuis = inscritLe
    ? new Date(inscritLe).toLocaleDateString("fr-FR", new Date(inscritLe).getFullYear() === new Date().getFullYear() ? { month: "long" } : { month: "long", year: "numeric" })
    : null;
  const partagerProfil = async () => {
    const url = `${window.location.origin}/profil/${encodeURIComponent(displayPseudo)}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${displayPseudo} sur Vaiiya`, url }); return; }
      await navigator.clipboard.writeText(url);
      showToast("Lien du profil copié");
    } catch { /* partage annulé : rien à dire */ }
  };

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

      {/* ─── LE PROFIL REFAIT (maquette « Le profil Vaiiya », validée par
           Louis le 2026-10-14) ───
           Le nom devient le titre de l'écran, la photo passe à droite, les
           trois chiffres perdent leur carte, le rang dit ce qui reste à
           faire, et les onglets se soulignent au lieu de se remplir de
           violet. La couronne Vaiiya+ et le bouclier admin quittent la
           rangée du haut : les deux vivent dans les Paramètres, et le violet
           plein reste réservé à l'action. ─── */}
      <div data-tour-anchor="profil-header" className="relative z-10 pt-7 md:pt-10 px-5 md:px-8 max-w-3xl mx-auto">

        <div className="flex items-center justify-between">
          <span className="vy-label" style={{ color: "var(--text-2)" }}>Ton profil</span>
          <div className="flex items-center gap-2.5">
            <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(var(--surface-rgb),0.62)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "var(--ombre-pose)" }}>
              <NotificationBell side="top" />
            </span>
            <Link
              href="/parametres"
              aria-label="Paramètres"
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "rgba(var(--surface-rgb),0.62)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "var(--ombre-pose)" }}
            >
              <Settings size={19} strokeWidth={1.8} style={{ color: "var(--text-0)" }} />
            </Link>
          </div>
        </div>

        {/* Le nom à gauche, en héros ; la photo à droite, dans son cadre de rang. */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-4 mt-6"
        >
          <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1
                className="min-w-0"
                style={{ margin: 0, fontSize: 34, lineHeight: 1, fontWeight: 850, fontVariationSettings: "var(--w-affiche)", letterSpacing: "-0.02em", color: "var(--text-0)", overflowWrap: "anywhere" }}
              >
                {/* Sans la gemme : le rang s'écrit juste en dessous, une fois suffit. */}
                <PseudoRang rang={rangCourant} cosmetiques={{ ...cosmetiques, badge: false }} pseudo={displayPseudo} />
              </h1>
            </div>

            <TitreRang cosmetiques={cosmetiques} />

            {/* Le rang et l'ancienneté, en une ligne discrète. */}
            {aura && (
              <div className="flex items-center gap-1.5 vy-label" style={{ color: "var(--text-2)" }}>
                <GemmeRang rang={aura.rang} size={18} flotte={false} />
                <span style={{ fontWeight: 700, color: "var(--or-encre)" }}>{aura.rang.nom}</span>
                {membreDepuis && <><span>·</span><span>membre depuis {membreDepuis}</span></>}
              </div>
            )}

            {/* Un objectif et le niveau ; le reste se déplie au toucher. Cinq
                objectifs en violet prenaient deux lignes et se lisaient comme
                une liste de mots-clés. */}
            {(objectifs.length > 0 || niveau) && (
              <p className="vy-corps" style={{ margin: 0, color: "var(--text-0)" }}>
                {(objectifsOuverts ? objectifs : objectifs.slice(0, 1)).concat(niveau ? [niveau] : []).join(" · ")}
                {objectifs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setObjectifsOuverts((o) => !o)}
                    className="ml-1.5 inline-flex items-center gap-0.5 cursor-pointer align-middle"
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--exp-encre)" }}
                    aria-expanded={objectifsOuverts}
                    aria-label={objectifsOuverts ? "Replier les objectifs" : `Voir les ${objectifs.length - 1} autres objectifs`}
                  >
                    {!objectifsOuverts && <span>+{objectifs.length - 1}</span>}
                    <ChevronDown size={15} strokeWidth={2.2} style={{ transform: objectifsOuverts ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </button>
                )}
              </p>
            )}

            {profileBio && (
              <p className="vy-label" style={{ margin: 0, color: "var(--text-2)", fontWeight: 400 }}>
                {profileBio}
              </p>
            )}
          </div>

          <AvatarRang rang={rangCourant} cosmetiques={cosmetiques} size={108} className="flex-shrink-0 mt-0.5">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              aria-label="Modifier la photo"
              className="absolute inset-0 cursor-pointer rounded-full"
            >
              <div className="absolute rounded-full" style={{ inset: 0, background: "rgb(var(--surface-rgb))" }} />
              <div
                className="absolute rounded-full overflow-hidden flex items-center justify-center text-[34px]"
                style={{
                  inset: 3,
                  background: displayAvatar ? "transparent" : "linear-gradient(135deg,rgba(var(--tint-violet-rgb),1),rgba(var(--tint-cream-rgb),1))",
                  color: "var(--exp-encre)",
                  fontWeight: 300,
                }}
              >
                {displayAvatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img loading="lazy" decoding="async" src={displayAvatar} alt="" className="w-full h-full object-cover" />
                  : <span>{displayPseudo.charAt(0).toUpperCase() || "?"}</span>}
              </div>
            </button>
            {/* Le crayon passe en encre sombre : le violet plein est l'action
                de l'écran, et changer sa photo n'en est pas une. */}
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              aria-label="Modifier le profil"
              className="absolute flex items-center justify-center rounded-full cursor-pointer"
              style={{ width: 34, height: 34, bottom: -2, right: -4, background: "var(--text-0)", border: "2px solid rgb(var(--surface-rgb))", zIndex: 30 }}
            >
              <Pencil size={14} strokeWidth={2.2} style={{ color: "rgb(var(--surface-rgb))" }} />
            </button>
          </AvatarRang>
        </motion.div>

        {/* Deux gestes de même rang, donc deux boutons discrets et égaux. */}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="flex-1 h-11 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--text-3-rgb),0.16)", fontSize: 13, fontWeight: 700, color: "var(--text-0)" }}
          >
            Modifier le profil
          </button>
          <button
            type="button"
            onClick={partagerProfil}
            className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--text-3-rgb),0.16)", fontSize: 13, fontWeight: 700, color: "var(--text-0)" }}
          >
            <Share2 size={15} strokeWidth={2} />
            Partager
          </button>
        </div>

        {/* Les trois chiffres, sans carte : des traits suffisent à les séparer. */}
        <div
          className="grid grid-cols-3 mt-6"
          style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.16)", borderBottom: "1px solid rgba(var(--text-3-rgb),0.16)" }}
        >
          {[
            { label: (followingCount ?? 0) > 1 ? "amis" : "ami", value: String(followingCount ?? 0), tab: "amis" as const, feu: false },
            { label: (sessionCount ?? 0) > 1 ? "séances" : "séance", value: String(sessionCount ?? 0), tab: "progres" as const, feu: false },
            { label: serieJours > 1 ? "jours de série" : "jour de série", value: String(serieJours), tab: null, feu: true },
          ].map(({ label, value, tab, feu }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => { if (tab) setActiveTab(tab); }}
              className="flex flex-col items-start gap-0.5 py-4 text-left"
              style={{ cursor: tab ? "pointer" : "default", paddingLeft: i === 0 ? 2 : 18, borderLeft: i > 0 ? "1px solid rgba(var(--text-3-rgb),0.16)" : "none" }}
            >
              <span className="vy-nombre flex items-center gap-1 text-[26px] leading-none" style={{ color: feu ? "var(--feu-encre)" : "var(--text-0)", fontWeight: 700 }}>
                {/* La même flamme que l'accueil, au palier de la série. */}
                {feu && <FlammeSerie jours={serieJours} taille={16} />}
                {value}
              </span>
              <span className="vy-label" style={{ color: "var(--text-2)", fontWeight: 400 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Le rang dit ce qui reste à faire, et montre le suivant. */}
        <button
          type="button"
          /* Tant que l'aura n'est pas lue, on n'ouvre pas la galerie : elle
             annoncerait « Bronze · 0 EXP » à quelqu'un qui est peut-être Diamant. */
          onClick={() => { if (aura) setShowRangs(true); }}
          className="w-full flex items-center gap-4 mt-4 p-4 pl-3.5 cursor-pointer text-left"
          style={{ borderRadius: "var(--r-affiche)", background: "rgba(var(--surface-rgb),0.66)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "var(--ombre-pose)" }}
        >
          {aura ? (
            <>
              <div className="flex-shrink-0"><GemmeRang rang={aura.rang} size={58} flotte={false} /></div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="vy-sous" style={{ color: "var(--text-0)" }}>{aura.rang.nom}</span>
                  <span className="vy-nombre text-[13px]" style={{ color: "var(--text-2)" }}>
                    <span style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{aura.exp}</span>{rangSuivant ? ` / ${rangSuivant.min}` : ""} EXP
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(139,92,246,0.14)" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.max(4, (progression?.part ?? 0) * 100)}%`,
                    background: "linear-gradient(90deg,#8B5CF6,#C13BC1)",
                  }} />
                </div>
                {rangSuivant ? (
                  <div className="flex items-center justify-between gap-2 vy-label" style={{ color: "var(--text-2)", fontWeight: 400 }}>
                    <span>Plus que <b style={{ color: "var(--text-0)" }}>{aura.restant} EXP</b> avant {rangSuivant.nom}</span>
                    <span style={{ opacity: 0.55 }}><GemmeRang rang={rangSuivant} size={22} flotte={false} /></span>
                  </div>
                ) : (
                  <span className="vy-label" style={{ color: "var(--text-2)", fontWeight: 400 }}>Le sommet. Tu y es.</span>
                )}
              </div>
              <ChevronRight size={18} strokeWidth={2} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            </>
          ) : (
            <div className="h-[64px] w-full animate-pulse" style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--tint-violet-rgb),0.5)" }} />
          )}
        </button>

        {/* Les onglets se soulignent : c'est une navigation, pas trois boutons d'action. */}
        <nav aria-label="Sections du profil" className="flex gap-6 mt-7 mb-6" style={{ borderBottom: "1px solid rgba(var(--text-3-rgb),0.16)" }}>
          {([
            { id: "collection" as const, label: "Collection", compte: null },
            { id: "progres"    as const, label: "Progrès",    compte: null },
            { id: "amis"       as const, label: "Amis",       compte: followingCount },
          ]).map(({ id, label, compte }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className="pb-3 cursor-pointer flex items-baseline gap-1.5"
              style={{
                fontSize: 16,
                fontWeight: activeTab === id ? 800 : 600,
                color: activeTab === id ? "var(--text-0)" : "var(--text-3)",
                borderBottom: activeTab === id ? "2px solid #8B5CF6" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {label}
              {compte ? <span className="vy-nombre text-[11px]">{compte}</span> : null}
            </button>
          ))}
        </nav>
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
            {/* Affiches du relais — gagnées en clair, verrouillées en cadenas.
                Trois de front : la série tient en une rangée, on voit d'un
                coup d'œil ce qui est gagné et ce qui reste. */}
            <div className="flex items-baseline justify-between mb-3.5">
              <h2 className="vy-sous" style={{ margin: 0, color: "var(--text-0)" }}>Affiches du relais</h2>
              <span className="vy-nombre text-[13px]" style={{ color: "var(--text-2)" }}>
                {(Object.keys(SERIES) as SerieSlug[]).filter((s) => badgeSlugs.has(`serie-${s}`)).length} / {Object.keys(SERIES).length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-8">
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
                    style={{ aspectRatio: "9/16", borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)", background: "#1C1626" }}
                  >
                    <Image
                      src={imageEtat(slug, 4)}
                      alt={serie.nom}
                      fill
                      sizes="(max-width:768px) 31vw, 200px"
                      className="object-cover"
                      style={{ filter: gagnee ? "none" : "grayscale(1) brightness(0.45)" }}
                    />
                    {gagnee ? (
                      <>
                        <div className="absolute inset-0" style={{ background: "var(--voile-affiche)" }} />
                        <div className="absolute left-2.5 right-2.5 bottom-2.5" style={{ color: "#fff" }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>{serie.nom}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.78)" }}>Dévoilée à deux</p>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2.5 text-center">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.3)" }}>
                          <Lock size={14} strokeWidth={2.2} style={{ color: "#fff" }} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontVariationSettings: "var(--w-voix)" }}>{serie.nom}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Avec qui ?</span>
                      </div>
                    )}
                  </Cadre>
                );
              })}
            </div>

            {/* L'étagère : ce que le relais a donné en plus des affiches.
                Muette tant qu'on n'a rien gagné. */}
            <EtagereBadges slugs={badgeSlugs} titre="Badges" progres={progresBadges} />

            {/* Tes affiches de perf (posts séance) */}
            <h2 className="vy-sous" style={{ margin: "0 0 14px", color: "var(--text-0)" }}>
              Affiches de séance
            </h2>
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
                /* LE KIOSQUE (maquette « Le profil Vaiiya », 2026-10-14) :
                   chaque affiche se lit comme une couverture de magazine.
                   Le nom de la séance prend la carte, les deux premiers
                   chiffres en bas. L'affiche partageable, elle, s'ouvre au
                   toucher, comme avant. */
                <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2" style={{ scrollbarWidth: "none" }}>
                  {posters.map((post, idx) => (
                    <CouvertureSeance
                      key={post.id}
                      data={post.performance_data as PerformanceData}
                      numero={posters.length - idx}
                      teinte={idx % 2}
                      onClick={() => setAfficheGardee({ post, numero: posters.length - idx, teinte: idx % 2 })}
                    />
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
                <CourbePoids userId={user.id} onPeser={() => setPesee(true)}
                  debut={debutHisto} onMasques={setPoidsMasque} />
                <CarteConstance
                  userId={user.id}
                  debut={debutHisto}
                  onMasques={setConstanceMasquee}
                  inscritLe={inscritLe}
                  /* La plus longue série vient de `badges_aura`, jamais d'un
                     second calcul : c'est le même nombre qui débloque les
                     badges de régularité, et il n'en existe qu'un. */
                  serieRecord={progresBadges?.serie ?? null}
                />
              </div>
            )}

            {historiqueMasque && <HistoriqueMasque className="mb-6" />}

            <p className="vy-label mb-3" style={{ color: "var(--text-3)" }}>
              Tes séances
            </p>

            {seancesVisibles.length === 0 && workoutSessions.length > 0 ? (
              /* Des séances existent, mais plus anciennes que la fenêtre :
                 on ne dit surtout pas « aucune séance ». L'encart du dessus
                 dit qu'elles sont conservées. */
              <p className="vy-corps">Pas de séance ces derniers jours.</p>
            ) : workoutSessions.length === 0 ? (
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
              /* ⭐ L'HISTORIQUE EST UNE GRILLE D'AFFICHES (Louis, 2026-10-14) :
                 chaque séance faite devient sa couverture, et la toucher
                 l'ouvre pour changer son mot, son fond, ou la supprimer.
                 « Refaire » vit dans la feuille, en action discrète. */
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {seancesVisibles.map((session) => (
                  <CouvertureSeance
                    key={session.id}
                    compact
                    data={afficheDeSeance(session)}
                    mot={reglagesAffiches[session.id]?.mot}
                    teinte={reglagesAffiches[session.id]?.teinte ?? 0}
                    onClick={() => setAfficheOuverte(session)}
                  />
                ))}
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
                    <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-[20px] font-bold"
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
      </AnimatePresence>

      {/* ─── Post detail / edit modal ─── */}
      <AnimatePresence>
        {afficheGardee && (
          <FeuilleAfficheSeance
            quoi="affiche"
            data={afficheGardee.post.performance_data as PerformanceData}
            numero={afficheGardee.numero}
            reglage={{ teinte: afficheGardee.teinte }}
            onSupprimer={async () => {
              const id = afficheGardee.post.id;
              const { error } = await createClient().from("posts").delete().eq("id", id);
              if (error) { showToast("Impossible de supprimer l’affiche pour l’instant."); return false; }
              setUserPosts((prev) => prev.filter((p) => p.id !== id));
              setAfficheGardee(null);
              return true;
            }}
            onFermer={() => setAfficheGardee(null)}
          />
        )}

        {afficheOuverte && user && (
          <FeuilleAfficheSeance
            data={afficheDeSeance(afficheOuverte)}
            reglage={reglagesAffiches[afficheOuverte.id] ?? {}}
            onReglage={(r) => {
              const tous = { ...reglagesAffiches, [afficheOuverte.id]: r };
              setReglagesAffiches(tous);
              ecrireReglagesAffiches(user.id, tous);
            }}
            onRefaire={() => { const s = afficheOuverte; setAfficheOuverte(null); refaireSeance(s); }}
            onSupprimer={async () => {
              const { error } = await createClient().from("workout_sessions").delete().eq("id", afficheOuverte.id);
              if (error) { showToast("Impossible de supprimer la séance pour l'instant."); return false; }
              setWorkoutSessions((prev) => prev.filter((w) => w.id !== afficheOuverte.id));
              setAfficheOuverte(null);
              return true;
            }}
            onFermer={() => setAfficheOuverte(null)}
          />
        )}
      </AnimatePresence>

      {/* La porte du relais, ouverte depuis une affiche verrouillée.
          C'est la MÊME feuille que dans la communauté, pas une seconde
          écrite ici : elle vit dans `components/communaute/AvecQui`. */}

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
