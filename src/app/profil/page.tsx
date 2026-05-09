"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Bell, Shield, Star, LogOut, X, Check, BellOff, Lock,
  ExternalLink, Share2, Venus, Mars, Search, UserCheck, UserPlus, Camera, ChevronRight,
  Target, Pencil,
} from "lucide-react";
import Link from "next/link";
import type { OnboardingData } from "@/components/OnboardingModal";
import { useAuth } from "@/context/AuthContext";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import SharePerformanceModal from "@/components/SharePerformanceModal";
import { useProfileSettings } from "@/hooks/useProfileSettings";
import { createClient } from "@/lib/supabase";

/* ─────────────── Sample data ─────────────── */
const samplePerformances: PerformanceData[] = [
  {
    type: "workout",
    title: "Push Day · Poitrine & Épaules",
    date: "Aujourd'hui",
    metrics: [
      { label: "Volume", value: "12 400", unit: "kg" },
      { label: "Durée", value: "58", unit: "min" },
      { label: "Séries", value: "24" },
    ],
    highlight: "Record personnel sur développé couché 🎯",
  },
  {
    type: "day",
    title: "Journée optimale",
    date: "Hier",
    metrics: [
      { label: "Score", value: "91", unit: "/100" },
      { label: "Calories", value: "1 847", unit: "kcal" },
      { label: "Pas", value: "8 200" },
    ],
    highlight: "Meilleure récupération du mois",
  },
  {
    type: "meal",
    title: "Nutrition parfaite",
    date: "Aujourd'hui",
    metrics: [
      { label: "Calories", value: "1 847", unit: "kcal" },
      { label: "Protéines", value: "142", unit: "g" },
      { label: "Glucides", value: "210", unit: "g" },
    ],
    highlight: "Objectif protéines atteint ✓",
  },
];

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

/* ─────────────── Main Page ─────────────── */
export default function ProfilPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"performances" | "reglages">("performances");
  const [showEdit, setShowEdit] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"Abonnés" | "Abonnements" | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [profilePseudo, setProfilePseudo] = useState(user?.pseudo ?? "");
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar ?? "");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [shareData, setShareData] = useState<PerformanceData | null>(null);
  const [showGoals, setShowGoals] = useState(false);
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
  };

  const displayPseudo = profilePseudo || user?.pseudo || "";
  const displayAvatar = profileAvatar || user?.avatar || "";

  return (
    <div className="min-h-screen pb-28">

      {/* ── Instagram-style header ── */}
      <div className="pt-10 px-5 md:px-8">

        {/* Avatar + name + bio */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col items-center text-center mb-5"
        >
          {/* Avatar ring */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowEdit(true)}
            className="relative mb-3 cursor-pointer"
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              padding: 3,
              background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
              boxShadow: "0 8px 32px rgba(167,139,250,0.28)",
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-4xl font-light"
              style={{ background: displayAvatar ? "transparent" : "linear-gradient(135deg,#F0EBFF 0%,#FFFBF0 100%)", color: "#2D3748" }}
            >
              {displayAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span>{displayPseudo.charAt(0).toUpperCase() || "?"}</span>}
            </div>
            {/* Camera badge */}
            <div
              className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                border: "2px solid white",
              }}
            >
              <Camera size={12} strokeWidth={2.5} style={{ color: "#2D3748" }} />
            </div>
          </motion.div>

          {/* Full name */}
          {profileFullName ? (
            <p className="text-[17px] font-semibold leading-tight" style={{ color: "#2D3748" }}>
              {profileFullName}
            </p>
          ) : null}

          {/* Pseudo */}
          <p className="text-sm font-light mt-0.5" style={{ color: "#A78BFA" }}>
            @{displayPseudo}
          </p>

          {/* Email subtle */}
          <p className="text-[11px] mt-0.5" style={{ color: "#C4CDD8" }}>
            {user?.email}
          </p>

          {/* Bio */}
          {profileBio && (
            <p className="text-sm mt-2.5 max-w-xs leading-relaxed" style={{ color: "#718096" }}>
              {profileBio}
            </p>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex items-stretch mb-3 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 16px rgba(167,139,250,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          {[
            { label: "Séances", value: sessionCount !== null ? String(sessionCount) : "—", clickable: false },
            { label: "Abonnés", value: followerCount !== null ? String(followerCount) : "—", clickable: true },
            { label: "Abonnements", value: followingCount !== null ? String(followingCount) : "—", clickable: true },
          ].map(({ label, value, clickable }, i) => (
            <div key={label} className="flex items-stretch flex-1">
              {i > 0 && (
                <div className="w-px self-stretch my-3" style={{ background: "rgba(212,192,255,0.35)" }} />
              )}
              <motion.button
                whileHover={clickable ? { scale: 1.04 } : {}}
                whileTap={clickable ? { scale: 0.93 } : {}}
                onClick={() => {
                  if (clickable) setShowFollowList(label as "Abonnés" | "Abonnements");
                }}
                className="flex-1 flex flex-col items-center py-3.5 cursor-pointer"
                style={{ cursor: clickable ? "pointer" : "default" }}
              >
                <span className="text-[22px] font-semibold leading-none" style={{ color: "#2D3748" }}>
                  {value}
                </span>
                <span
                  className="text-[9px] font-semibold tracking-widest uppercase mt-1"
                  style={{ color: clickable ? "#A78BFA" : "#B0BBCA" }}
                >
                  {label}
                </span>
              </motion.button>
            </div>
          ))}
        </motion.div>

        {/* Modifier le profil button */}
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.13 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowEdit(true)}
          className="w-full py-2.5 rounded-2xl text-sm font-semibold cursor-pointer mb-5"
          style={{
            background: "rgba(255,255,255,0.75)",
            border: "1.5px solid rgba(212,192,255,0.65)",
            color: "#2D3748",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
          }}
        >
          Modifier le profil
        </motion.button>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="flex gap-1 mb-5 p-1 rounded-2xl"
          style={{ background: "rgba(240,235,255,0.55)" }}
        >
          {(["performances", "reglages"] as const).map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
              animate={{
                background: activeTab === tab
                  ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)"
                  : "transparent",
                color: activeTab === tab ? "#2D3748" : "#A0AEC0",
              }}
              style={{
                boxShadow: activeTab === tab
                  ? "inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 8px rgba(167,139,250,0.15)"
                  : "none",
              }}
            >
              {tab === "performances" ? "🏆 Performances" : "⚙️ Réglages"}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {activeTab === "performances" ? (
          <motion.div
            key="performances"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28 }}
            className="px-5 md:px-8"
          >
            {/* Mini stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Séances", value: sessionCount !== null ? String(sessionCount) : "—", gradient: "linear-gradient(135deg,#FFFBF0 0%,#F5E6A3 100%)", accent: "#D4A843" },
                { label: "Jours actifs", value: "—", gradient: "linear-gradient(135deg,#F0EBFF 0%,#D4C0FF 100%)", accent: "#A78BFA" },
                { label: "Score moyen", value: "—", gradient: "linear-gradient(135deg,#F0EBFF 0%,#FFFBF0 100%)", accent: "#A0AEC0" },
              ].map(({ label, value, gradient }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="rounded-2xl p-3.5 text-center"
                  style={{
                    background: gradient,
                    boxShadow: "0 2px 12px rgba(167,139,250,0.08)",
                    border: "1px solid rgba(255,255,255,0.8)",
                  }}
                >
                  <p className="text-[22px] font-light leading-none" style={{ color: "#2D3748" }}>{value}</p>
                  <p className="text-[9px] font-semibold tracking-wider uppercase mt-1.5" style={{ color: "#718096" }}>{label}</p>
                </motion.div>
              ))}
            </div>

            {/* Performance cards */}
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#A0AEC0" }}>
              Dernières performances
            </p>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {samplePerformances.map((perf, i) => (
                <motion.div
                  key={i}
                  className="flex-shrink-0 relative"
                  style={{ width: 172 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, type: "spring", bounce: 0.3 }}
                >
                  <PerformanceCard data={perf} size="sm" interactive />
                  <motion.button
                    whileHover={{ scale: 1.08, y: -1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => { e.stopPropagation(); setShareData(perf); }}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg,rgba(212,192,255,0.92) 0%,rgba(245,230,163,0.92) 100%)",
                      border: "1px solid rgba(255,255,255,0.7)",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 2px 8px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                    aria-label="Partager"
                  >
                    <Share2 size={11} strokeWidth={2.5} style={{ color: "#2D3748" }} />
                    <span className="text-[10px] font-semibold" style={{ color: "#2D3748" }}>Partager</span>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reglages"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28 }}
            className="px-5 md:px-8 flex flex-col gap-4"
          >
            {/* Objectifs & morphologie */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowGoals(true)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer text-left"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 12px rgba(167,139,250,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" }}
              >
                <Target size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "#2D3748" }}>Objectifs & morphologie</p>
                <p className="text-[11px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>Poids, taille, goals, niveau…</p>
              </div>
              <Pencil size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
            </motion.button>

            {/* Genre selector */}
            <div
              className="rounded-2xl px-5 py-4"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 12px rgba(167,139,250,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#2D3748" }}>Genre</p>
                  <p className="text-[11px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>Personnalise les illustrations</p>
                </div>
                <div className="flex gap-2">
                  {(["homme", "femme"] as const).map((g) => (
                    <motion.button
                      key={g}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => {
                        updateSettings({ gender: g });
                        showToast(g === "homme" ? "Genre : Homme ✓" : "Genre : Femme ✓");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                      style={
                        settings.gender === g
                          ? { background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                          : { background: "rgba(0,0,0,0.04)", color: "#A0AEC0", border: "1px solid rgba(0,0,0,0.06)" }
                      }
                    >
                      {g === "homme" ? <Mars size={12} strokeWidth={1.8} /> : <Venus size={12} strokeWidth={1.8} />}
                      {g === "homme" ? "Homme" : "Femme"}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 12px rgba(167,139,250,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              {[
                {
                  icon: notifEnabled ? Bell : BellOff,
                  label: "Notifications",
                  desc: notifEnabled ? "Rappels & insights activés" : "Désactivées",
                  type: "toggle" as const,
                  onClick: () => {
                    setNotifEnabled((v) => !v);
                    showToast(notifEnabled ? "Notifications désactivées" : "Notifications activées ✓");
                  },
                },
                {
                  icon: Shield,
                  label: "Confidentialité",
                  desc: "Données sécurisées · RGPD",
                  type: "chevron" as const,
                  onClick: () => setShowPrivacy(true),
                },
                {
                  icon: Star,
                  label: "Plan Premium",
                  desc: "Actif jusqu'au 15 juin 2026",
                  type: "external" as const,
                  onClick: () => showToast("Gestion de l'abonnement…"),
                },
                {
                  icon: CreditCard,
                  label: "Paiement",
                  desc: "•••• 4242 · Stripe",
                  type: "external" as const,
                  onClick: () => showToast("Portail de paiement Stripe…"),
                },
              ].map(({ icon: Icon, label, desc, type, onClick }, i, arr) => (
                <div key={label}>
                  <motion.button
                    whileTap={{ scale: 0.99 }}
                    onClick={onClick}
                    className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer"
                    style={{ background: "transparent" }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#F0EBFF 0%,#FFFBF0 100%)" }}
                    >
                      <Icon size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
                      <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>{desc}</p>
                    </div>
                    {type === "toggle" ? (
                      <motion.div
                        animate={{ background: notifEnabled ? "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" : "rgba(220,220,220,0.6)" }}
                        className="relative w-10 h-5 rounded-full flex-shrink-0"
                      >
                        <motion.div
                          animate={{ x: notifEnabled ? 18 : 2 }}
                          transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full"
                          style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                        />
                      </motion.div>
                    ) : type === "external" ? (
                      <ExternalLink size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                    ) : (
                      <ChevronRight size={16} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                    )}
                  </motion.button>
                  {i < arr.length - 1 && (
                    <div className="h-px mx-5" style={{ background: "rgba(240,235,255,0.9)" }} />
                  )}
                </div>
              ))}
            </div>

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl cursor-pointer"
              style={{
                border: "1px solid rgba(212,192,255,0.6)",
                color: "#A0AEC0",
                background: "transparent",
              }}
            >
              <LogOut size={15} strokeWidth={1.5} />
              <span className="text-sm font-medium">Se déconnecter</span>
            </motion.button>
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
        {showFollowList && user && (
          <FollowListModal type={showFollowList} userId={user.id} onClose={() => setShowFollowList(null)} />
        )}
        {toast && <Toast message={toast} />}
      </AnimatePresence>

      <SharePerformanceModal
        open={!!shareData}
        onClose={() => setShareData(null)}
        data={shareData ?? samplePerformances[0]}
      />
    </div>
  );
}
