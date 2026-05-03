"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Bell, Shield, ChevronRight, Star, LogOut, Edit2, X, Check, BellOff, Lock, ExternalLink, Share2, Venus, Mars } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import SharePerformanceModal from "@/components/SharePerformanceModal";
import { useProfileSettings } from "@/hooks/useProfileSettings";

const samplePerformances: PerformanceData[] = [
  {
    type: "workout",
    title: "Push Day · Poitrine & Épaules",
    date: "Aujourd'hui",
    metrics: [
      { label: "Volume",  value: "12 400", unit: "kg" },
      { label: "Durée",   value: "58",     unit: "min" },
      { label: "Séries",  value: "24" },
    ],
    highlight: "Record personnel sur développé couché 🎯",
  },
  {
    type: "day",
    title: "Journée optimale",
    date: "Hier",
    metrics: [
      { label: "Score",    value: "91",   unit: "/100" },
      { label: "Calories", value: "1 847", unit: "kcal" },
      { label: "Pas",      value: "8 200" },
    ],
    highlight: "Meilleure récupération du mois",
  },
  {
    type: "meal",
    title: "Nutrition parfaite",
    date: "Aujourd'hui",
    metrics: [
      { label: "Calories",   value: "1 847", unit: "kcal" },
      { label: "Protéines",  value: "142",   unit: "g" },
      { label: "Glucides",   value: "210",   unit: "g" },
    ],
    highlight: "Objectif protéines atteint ✓",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
      className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,240,245,0.9)",
        boxShadow: "0 8px 32px rgba(249,168,201,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
        color: "#2D3748",
        whiteSpace: "nowrap",
      }}
    >
      <Check size={14} strokeWidth={2.5} style={{ color: "#7ED8D8" }} />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

function EditProfileModal({ name, email, onSave, onClose }: {
  name: string; email: string;
  onSave: (name: string, email: string) => void;
  onClose: () => void;
}) {
  const [editName, setEditName] = useState(name);
  const [editEmail, setEditEmail] = useState(email);

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
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(249,168,201,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Modifier le profil</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,240,245,0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-light cursor-pointer relative"
            style={{
              background: "linear-gradient(135deg, #FFF0F5 0%, #E0FFFF 100%)",
              boxShadow: "0 4px 16px rgba(249,168,201,0.2)",
              color: "#2D3748",
            }}
          >
            {editName.charAt(0).toUpperCase() || "?"}
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)" }}
            >
              <Edit2 size={10} strokeWidth={2.5} style={{ color: "#2D3748" }} />
            </div>
          </motion.div>
          <p className="text-xs mt-2" style={{ color: "#A0AEC0" }}>Appuyer pour changer la photo</p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>Nom</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(255,240,245,0.5)",
                border: "1px solid rgba(255,214,231,0.6)",
                color: "#2D3748",
              }}
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block" style={{ color: "#A0AEC0" }}>Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(255,240,245,0.5)",
                border: "1px solid rgba(255,214,231,0.6)",
                color: "#2D3748",
              }}
              placeholder="votre@email.com"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSave(editName, editEmail)}
          className="w-full mt-5 py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)",
            color: "#2D3748",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 16px rgba(249,168,201,0.2)",
          }}
        >
          Sauvegarder
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

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
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(249,168,201,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lock size={16} strokeWidth={1.5} style={{ color: "#7ED8D8" }} />
            <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Confidentialité</h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(255,240,245,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: "Partage de données", desc: "Partager vos stats avec la communauté", state: dataSharing, toggle: () => setDataSharing(v => !v) },
            { label: "Analytiques", desc: "Améliorer l'app avec vos données anonymisées", state: analytics, toggle: () => setAnalytics(v => !v) },
          ].map(({ label, desc, state, toggle }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,240,245,0.4)" }}>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
                <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>{desc}</p>
              </div>
              <motion.button
                onClick={toggle}
                className="relative w-11 h-6 rounded-full cursor-pointer flex-shrink-0"
                style={{ background: state ? "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)" : "rgba(220,220,220,0.6)" }}
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

        <p className="text-[10px] mt-4 text-center" style={{ color: "#A0AEC0" }}>
          Conforme au RGPD · Données hébergées en France
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function ProfilPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(user?.name || "Marie Dubois");
  const [profileEmail, setProfileEmail] = useState(user?.email || "marie@example.com");
  const [shareData, setShareData] = useState<PerformanceData | null>(null);
  const { settings, updateSettings } = useProfileSettings();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleLogout = () => {
    logout();
    router.push("/auth");
  };

  const handleSaveProfile = (name: string, email: string) => {
    setProfileName(name);
    setProfileEmail(email);
    setShowEdit(false);
    showToast("Profil mis à jour ✓");
  };

  const sections = [
    {
      title: "Abonnement",
      items: [
        {
          icon: Star,
          label: "Plan Premium",
          desc: "Actif jusqu'au 15 juin 2025",
          action: "Gérer",
          onClick: () => showToast("Redirection vers la gestion de l'abonnement…"),
        },
        {
          icon: CreditCard,
          label: "Paiement",
          desc: "•••• 4242 · Stripe",
          action: "Modifier",
          onClick: () => showToast("Ouverture du portail de paiement Stripe…"),
        },
      ],
    },
    {
      title: "Préférences",
      items: [
        {
          icon: notifEnabled ? Bell : BellOff,
          label: "Notifications",
          desc: notifEnabled ? "Rappels & insights activés" : "Notifications désactivées",
          action: null,
          onClick: () => {
            setNotifEnabled((v) => !v);
            showToast(notifEnabled ? "Notifications désactivées" : "Notifications activées ✓");
          },
        },
        {
          icon: Shield,
          label: "Confidentialité",
          desc: "Données sécurisées · RGPD",
          action: null,
          onClick: () => setShowPrivacy(true),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col px-6 pt-10 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "#A0AEC0" }}>
          Mon Compte
        </p>
        <h1 className="text-2xl font-light" style={{ color: "#2D3748" }}>Profil</h1>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-3xl p-6 mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FFF0F5 0%, #E0FFFF 50%, #FFF0F5 100%)",
          boxShadow: "0 4px 32px 0 rgba(249,168,201,0.15)",
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #FFD6E7 0%, transparent 70%)" }}
        />
        <div className="flex items-center gap-4 relative z-10">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-light flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.7)",
              boxShadow: "0 4px 16px 0 rgba(249,168,201,0.2)",
              color: "#2D3748",
            }}
          >
            {profileName.charAt(0).toUpperCase()}
          </motion.div>
          <div className="flex-1">
            <p className="text-lg font-medium" style={{ color: "#2D3748" }}>{profileName}</p>
            <p className="text-xs font-light" style={{ color: "#718096" }}>{profileEmail}</p>
            <div
              className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,0.7)", color: "#F9A8C9" }}
            >
              <Star size={9} fill="#F9A8C9" strokeWidth={0} />
              Premium
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowEdit(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.7)" }}
            aria-label="Modifier le profil"
          >
            <Edit2 size={15} strokeWidth={1.5} style={{ color: "#2D3748" }} />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          { label: "Séances", value: "48", gradient: "linear-gradient(135deg, #E0FFFF 0%, #B2F0F0 100%)" },
          { label: "Jours actifs", value: "31", gradient: "linear-gradient(135deg, #FFF0F5 0%, #FFD6E7 100%)" },
          { label: "Score moyen", value: "91", gradient: "linear-gradient(135deg, #FFF0F5 0%, #E0FFFF 100%)" },
        ].map(({ label, value, gradient }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl p-4 text-center cursor-pointer"
            style={{ background: gradient, boxShadow: "0 2px 12px 0 rgba(249,168,201,0.08)" }}
            onClick={() => showToast(`${value} ${label} au total`)}
          >
            <p className="text-2xl font-light" style={{ color: "#2D3748" }}>{value}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: "#718096" }}>{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Performances à partager */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-8"
      >
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#A0AEC0" }}>
          Performances
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {samplePerformances.map((perf, i) => (
            <motion.div
              key={i}
              className="flex-shrink-0 relative"
              style={{ width: 172 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.1, type: "spring", bounce: 0.3 }}
            >
              <PerformanceCard data={perf} size="sm" interactive />
              {/* Share button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShareData(perf)}
                className="absolute bottom-3 right-3 w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  backdropFilter: "blur(8px)",
                }}
                aria-label="Partager"
              >
                <Share2 size={12} strokeWidth={1.5} style={{ color: "#FFFFFF" }} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Profil physique — Genre */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.32 }}
        className="mb-6"
      >
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#A0AEC0" }}>
          Profil physique
        </p>
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px -4px rgba(249,168,201,0.12)",
            backdropFilter: "blur(32px)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "#2D3748" }}>Genre</p>
              <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>
                Utilisé pour personnaliser les illustrations
              </p>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
                  style={
                    settings.gender === g
                      ? {
                          background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)",
                          color: "#2D3748",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                        }
                      : {
                          background: "rgba(0,0,0,0.04)",
                          color: "#A0AEC0",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }
                  }
                >
                  {g === "homme"
                    ? <Mars size={12} strokeWidth={1.8} />
                    : <Venus size={12} strokeWidth={1.8} />
                  }
                  {g === "homme" ? "Homme" : "Femme"}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6"
      >
        {sections.map(({ title, items }) => (
          <motion.div key={title} variants={itemVariants}>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#A0AEC0" }}>
              {title}
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.7)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px -4px rgba(249,168,201,0.12)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
              }}
            >
              {items.map(({ icon: Icon, label, desc, action, onClick }, i) => (
                <div key={label}>
                  <motion.button
                    type="button"
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.4)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onClick}
                    className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors duration-150"
                    style={{ background: "transparent" }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #FFF0F5 0%, #E0FFFF 100%)" }}
                    >
                      <Icon size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
                      <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>{desc}</p>
                    </div>
                    {action ? (
                      <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: "#F9A8C9" }}>
                        {action}
                        <ExternalLink size={10} strokeWidth={2} />
                      </span>
                    ) : (
                      label === "Notifications" ? (
                        <motion.div
                          animate={{ background: notifEnabled ? "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)" : "rgba(220,220,220,0.6)" }}
                          className="relative w-10 h-5 rounded-full flex-shrink-0"
                        >
                          <motion.div
                            animate={{ x: notifEnabled ? 18 : 2 }}
                            transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                            className="absolute top-0.5 w-4 h-4 rounded-full"
                            style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                          />
                        </motion.div>
                      ) : (
                        <ChevronRight size={16} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                      )
                    )}
                  </motion.button>
                  {i < items.length - 1 && (
                    <div className="h-px mx-5" style={{ background: "rgba(255,240,245,0.9)" }} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Logout */}
        <motion.div variants={itemVariants}>
          <motion.button
            whileHover={{ scale: 1.01, background: "rgba(255,240,245,0.5)" }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl cursor-pointer transition-all duration-200"
            style={{
              border: "1px solid rgba(255,214,231,0.6)",
              color: "#A0AEC0",
              background: "transparent",
            }}
          >
            <motion.div
              whileHover={{ rotate: -10, x: -2 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <LogOut size={15} strokeWidth={1.5} />
            </motion.div>
            <span className="text-sm font-medium">Se déconnecter</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showEdit && (
          <EditProfileModal
            name={profileName}
            email={profileEmail}
            onSave={handleSaveProfile}
            onClose={() => setShowEdit(false)}
          />
        )}
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Share Performance Modal */}
      {shareData && (
        <SharePerformanceModal
          open={!!shareData}
          onClose={() => setShareData(null)}
          data={shareData}
        />
      )}
    </div>
  );
}
