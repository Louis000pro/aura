"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Bell, Shield, Star, LogOut, X, Check, BellOff, Lock,
  ExternalLink, Share2, Venus, Mars, Search, UserCheck, UserPlus, Camera, ChevronRight, Plus,
  Target, Pencil, Dumbbell, Play, Clock, Globe, Users, Flame, Wind, Layers, Sparkles, Settings,
} from "lucide-react";

/* ─────────────── Tab data types ─────────────── */
type UserPost = {
  id: string;
  type: string;
  caption: string | null;
  performance_data: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
};
type WorkoutSessionItem = {
  id: string;
  title: string | null;
  started_at: string | null;
};
import NotificationBell from "@/components/NotificationBell";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";
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
        backdropFilter: "blur(24px)",
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
          backdropFilter: "blur(40px)",
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
      supabase.from("notifications").insert({ user_id: profile.id, from_user_id: userId, from_pseudo: profile.pseudo, type: "follow" }).then(() => {}).catch(() => {});
      fetch("/api/notifications/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_id: userId, followed_id: profile.id }),
      }).catch(() => {});
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
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(40px)", boxShadow: "0 -12px 48px rgba(167,139,250,0.18)", maxHeight: "82vh" }}
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
          backdropFilter: "blur(40px)",
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

type Highlight = { id: string; name: string; coverUrl: string };

/* ─────────────── New Highlight Modal ─────────────── */
function NewHighlightModal({ userId, onSave, onClose }: {
  userId: string;
  onSave: (h: Highlight) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${userId}/highlight_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setCoverUrl(data.publicUrl + "?t=" + Date.now());
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: Date.now().toString(), name: name.trim(), coverUrl });
    onClose();
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
        {/* Handle */}
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

        {/* Cover picker */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => coverRef.current?.click()}
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer relative"
            style={{
              background: coverUrl ? "transparent" : "linear-gradient(135deg,rgba(212,192,255,0.4),rgba(245,230,163,0.4))",
              border: "2.5px solid transparent",
              backgroundClip: "padding-box",
              boxShadow: "0 0 0 2.5px transparent, 0 4px 20px rgba(167,139,250,0.2)",
              outline: "2.5px solid",
              outlineColor: "transparent",
              background: coverUrl ? "transparent" : "linear-gradient(135deg,rgba(212,192,255,0.35),rgba(245,230,163,0.35))",
            }}
          >
            {coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
              : uploading
              ? <div className="text-xs font-medium" style={{ color: "#A78BFA" }}>Upload…</div>
              : <div className="flex flex-col items-center gap-1">
                  <Camera size={20} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                  <span className="text-[9px] font-semibold" style={{ color: "#A78BFA" }}>Photo / Vidéo</span>
                </div>
            }
          </motion.div>
          <input ref={coverRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleCover} />
          <p className="text-[11px] mt-2 font-light" style={{ color: "#A0AEC0" }}>Appuie pour importer</p>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="text-[10px] font-bold tracking-widest uppercase mb-2 block" style={{ color: "#A0AEC0" }}>Nom de la catégorie</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Fitness, Voyage, Nutrition…"
            maxLength={24}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{
              background: "rgba(240,235,255,0.55)",
              border: "1px solid rgba(167,139,250,0.2)",
              color: "#1A202C",
            }}
          />
        </div>

        {/* Save */}
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3.5 rounded-2xl text-sm font-black tracking-tight cursor-pointer"
          style={{
            background: name.trim() ? "linear-gradient(135deg,#C4A8FF 0%,#F5E6A3 100%)" : "rgba(220,220,220,0.5)",
            color: name.trim() ? "#3D2F6B" : "#A0AEC0",
            boxShadow: name.trim() ? "0 4px 18px rgba(167,139,250,0.3)" : "none",
          }}
        >
          Créer la catégorie
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Main Page ─────────────── */
export default function ProfilPage() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"performances" | "seances" | "reglages">("performances");
  const [showEdit, setShowEdit] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"Abonnés" | "Abonnements" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showNewHighlight, setShowNewHighlight] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("aura_highlights") ?? "[]"); } catch { return []; }
  });
  const [profilePseudo, setProfilePseudo] = useState(user?.pseudo ?? "");
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar ?? "");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [showGoals, setShowGoals] = useState(false);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<UserPost[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionItem[]>([]);
  const { settings, updateSettings } = useProfileSettings();

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
    ]).then(([f1, f2, f3]) => {
      setFollowerCount(f1.count ?? 0);
      setFollowingCount(f2.count ?? 0);
      setSessionCount(f3.count ?? 0);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    // Publications : posts de l'utilisateur
    supabase
      .from("posts")
      .select("id, type, caption, performance_data, created_at, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setUserPosts(data as UserPost[]); });

    // Vidéos enregistrées : posts que l'user a likés
    supabase
      .from("post_likes")
      .select("post_id, posts!post_id(id, type, caption, performance_data, created_at, user_id)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          const posts = data.map((d: { posts: UserPost }) => d.posts).filter(Boolean);
          setSavedPosts(posts);
        }
      });

    // Séances enregistrées : workout sessions
    supabase
      .from("workout_sessions")
      .select("id, title, started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setWorkoutSessions(data as WorkoutSessionItem[]); });
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
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

  const handleAddHighlight = (h: Highlight) => {
    const updated = [...highlights, h];
    setHighlights(updated);
    localStorage.setItem("aura_highlights", JSON.stringify(updated));
    showToast("Catégorie créée ✓");
  };

  const displayPseudo = profilePseudo || user?.pseudo || "";
  const displayAvatar = profileAvatar || user?.avatar || "";

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
          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowEdit(true)}
            className="relative mb-4 cursor-pointer"
            style={{
              width: 108,
              height: 108,
              borderRadius: "50%",
              padding: 3,
              background: "linear-gradient(135deg,#C4A8FF 0%,#D4C0FF 50%,#F5E6A3 100%)",
              boxShadow: "0 12px 40px rgba(167,139,250,0.35), 0 0 0 1px rgba(255,255,255,0.6)",
            }}
          >
            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg,#C4A8FF 0%,#D4C0FF 50%,#F5E6A3 100%)",
                filter: "blur(8px)",
                opacity: 0.4,
                transform: "scale(1.08)",
              }}
            />
            <div
              className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center text-4xl"
              style={{
                background: displayAvatar ? "transparent" : "linear-gradient(135deg,#F0EBFF 0%,#FFFBF0 100%)",
                color: "#7C5CFA",
                fontWeight: 300,
              }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span>{displayPseudo.charAt(0).toUpperCase() || "?"}</span>}
            </div>
            <div
              className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                border: "2.5px solid white",
              }}
            >
              <Pencil size={13} strokeWidth={2.2} style={{ color: "#2D3748" }} />
            </div>
          </motion.div>

          {/* Pseudo — bold, impactful */}
          <h1
            className="text-[28px] font-black tracking-[-0.03em] leading-none"
            style={{ color: "#1A202C" }}
          >
            {displayPseudo}
          </h1>

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
            backdropFilter: "blur(20px)",
          }}
        >
          {[
            { label: "Séances", value: sessionCount !== null ? String(sessionCount) : "0", clickable: false },
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
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.85)",
                border: "2px dashed rgba(167,139,250,0.4)",
                boxShadow: "0 2px 12px rgba(167,139,250,0.1)",
              }}
            >
              <Plus size={22} strokeWidth={1.8} style={{ color: "#A78BFA" }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: "#A0AEC0", letterSpacing: "0.02em" }}>Nouveau</span>
          </motion.button>

          {/* Highlights créés */}
          {highlights.map((h, i) => (
            <motion.button
              key={h.id}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.93 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, type: "spring", bounce: 0.4 }}
            >
              <div
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  background: "linear-gradient(white,white) padding-box, linear-gradient(135deg,#C4A8FF,#F5E6A3) border-box",
                  border: "2.5px solid transparent",
                  boxShadow: "0 3px 14px rgba(167,139,250,0.18)",
                }}
              >
                {h.coverUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={h.coverUrl} alt={h.name} className="w-full h-full object-cover" />
                  : <span className="text-2xl">{h.name.charAt(0).toUpperCase()}</span>}
              </div>
              <span className="text-[10px] font-semibold max-w-[64px] truncate text-center" style={{ color: "#718096", letterSpacing: "0.02em" }}>{h.name}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* ─── Tabs ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-1.5 mb-6 p-1.5 rounded-2xl"
          style={{
            background: "rgba(240,235,255,0.6)",
            border: "1px solid rgba(212,192,255,0.2)",
          }}
        >
          {([
            { id: "performances" as const, emoji: "📸", label: "Publications" },
            { id: "seances"      as const, emoji: "🎥", label: "Vidéos" },
            { id: "reglages"     as const, emoji: "🏋️", label: "Séances" },
          ]).map(({ id, emoji, label }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer flex flex-col items-center gap-0.5 relative"
              animate={{
                background: activeTab === id
                  ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)"
                  : "transparent",
                color: activeTab === id ? "#3D2F6B" : "#A0AEC0",
              }}
              style={{
                boxShadow: activeTab === id
                  ? "0 3px 12px rgba(167,139,250,0.22), inset 0 1px 0 rgba(255,255,255,0.9)"
                  : "none",
                letterSpacing: "0.02em",
              }}
            >
              <span className="text-base leading-none">{emoji}</span>
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
                  <span className="text-3xl">📸</span>
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune publication</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Tes publications apparaîtront ici dès que tu en partageras une.</p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.3) 0%,rgba(245,230,163,0.3) 100%)", border: "1px solid rgba(255,255,255,0.5)" }}
                    whileHover={{ scale: 0.97 }}
                  >
                    <div className="text-center p-2">
                      <p className="text-xs font-medium truncate" style={{ color: "#2D3748" }}>{post.caption || post.type}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
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
            {savedPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-5 rounded-3xl"
                style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.85) 0%,rgba(240,235,255,0.5) 100%)", border: "1.5px dashed rgba(167,139,250,0.25)" }}
              >
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4) 0%,rgba(245,230,163,0.35) 100%)", boxShadow: "0 8px 32px rgba(167,139,250,0.15)", border: "1px solid rgba(212,192,255,0.3)" }}>
                  <span className="text-3xl">🎥</span>
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune vidéo enregistrée</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Les vidéos que tu enregistreras s&apos;afficheront ici automatiquement.</p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {savedPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.3) 0%,rgba(245,230,163,0.3) 100%)", border: "1px solid rgba(255,255,255,0.5)" }}
                    whileHover={{ scale: 0.97 }}
                  >
                    <div className="text-center p-2">
                      <p className="text-xs font-medium truncate" style={{ color: "#2D3748" }}>{post.caption || post.type}</p>
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
                  <span className="text-3xl">🏋️</span>
                </div>
                <div className="text-center px-8">
                  <p className="text-[17px] font-black tracking-tight" style={{ color: "#2D3748" }}>Aucune séance enregistrée</p>
                  <p className="text-[13px] font-light mt-2 leading-relaxed" style={{ color: "#A0AEC0" }}>Tes séances enregistrées apparaîtront ici une fois complétées.</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3">
                {workoutSessions.map((session) => (
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
                      </p>
                    </div>
                  </motion.div>
                ))}
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
            onSave={() => showToast("Objectifs mis à jour ✓")}
          />
        )}
        {showNewHighlight && user && (
          <NewHighlightModal
            userId={user.id}
            onSave={handleAddHighlight}
            onClose={() => setShowNewHighlight(false)}
          />
        )}
        {showFollowList && user && (
          <FollowListModal type={showFollowList} userId={user.id} onClose={() => setShowFollowList(null)} />
        )}
        {toast && <Toast message={toast} />}
      </AnimatePresence>

    </div>
  );
}
