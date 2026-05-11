"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, LogOut, Trash2, ChevronRight, Eye, EyeOff, Check, AlertTriangle, X, Bell, Shield, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

/* ── Section header ─────────────────────────────────────── */
function Section({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase px-1 mb-2 mt-5 first:mt-0" style={{ color: "#A0AEC0" }}>
      {title}
    </p>
  );
}

/* ── Row item ────────────────────────────────────────────── */
function Row({
  icon: Icon,
  label,
  sublabel,
  onClick,
  danger = false,
  chevron = true,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
  chevron?: boolean;
  iconBg?: string;
}) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left cursor-pointer"
      style={{
        background: danger ? "rgba(254,226,226,0.4)" : "rgba(255,255,255,0.7)",
        border: danger ? "1px solid rgba(252,165,165,0.3)" : "1px solid rgba(255,255,255,0.8)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 2px 8px rgba(167,139,250,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg ?? (danger ? "linear-gradient(135deg, rgba(252,165,165,0.4), rgba(248,113,113,0.3))" : "linear-gradient(135deg, rgba(212,192,255,0.4), rgba(245,230,163,0.3))") }}
      >
        <Icon size={16} strokeWidth={1.5} style={{ color: danger ? "#EF4444" : "#A78BFA" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: danger ? "#EF4444" : "#2D3748" }}>{label}</p>
        {sublabel && <p className="text-xs font-light mt-0.5 truncate" style={{ color: "#A0AEC0" }}>{sublabel}</p>}
      </div>
      {chevron && <ChevronRight size={14} strokeWidth={1.5} style={{ color: "#C4C9D4", flexShrink: 0 }} />}
    </motion.button>
  );
}

/* ── Change Password Modal ───────────────────────────────── */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const supabase = createClient();

  const handleSubmit = async () => {
    setError(null);
    if (!current || !next || !confirm) { setError("Remplis tous les champs."); return; }
    if (next.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (next !== confirm) { setError("Les nouveaux mots de passe ne correspondent pas."); return; }

    setLoading(true);
    // Re-authenticate with current password
    const { data: sess } = await supabase.auth.getSession();
    const email = sess.session?.user.email;
    if (!email) { setError("Session expirée. Reconnecte-toi."); setLoading(false); return; }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (signInErr) { setError("Mot de passe actuel incorrect."); setLoading(false); return; }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updateErr) { setError(updateErr.message); return; }
    setSuccess(true);
    setTimeout(() => onClose(), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.9)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "#2D3748" }}>Changer le mot de passe</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {success ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)" }}>
              <Check size={20} strokeWidth={2.5} style={{ color: "#2D3748" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "#2D3748" }}>Mot de passe mis à jour !</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {[
              { label: "Mot de passe actuel", value: current, onChange: setCurrent, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
              { label: "Nouveau mot de passe", value: next, onChange: setNext, show: showNext, toggle: () => setShowNext(p => !p) },
              { label: "Confirmer le nouveau", value: confirm, onChange: setConfirm, show: showNext, toggle: () => setShowNext(p => !p) },
            ].map(({ label, value, onChange, show, toggle }, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "#A0AEC0" }}>{label}</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(167,139,250,0.15)" }}>
                  <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#2D3748" }}
                  />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={toggle} className="cursor-pointer">
                    {show ? <EyeOff size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} /> : <Eye size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />}
                  </motion.button>
                </div>
              </div>
            ))}

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-medium" style={{ color: "#EF4444" }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer mt-1"
              style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "0 4px 16px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.9)" }}
            >
              {loading ? "Mise à jour…" : "Mettre à jour"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Delete Account Modal ────────────────────────────────── */
function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm !== "SUPPRIMER") { setError("Tape exactement SUPPRIMER pour confirmer."); return; }
    setLoading(true);
    // We can only call admin.deleteUser with service role — so here we just sign out
    // and show instructions. A real deletion would go via a server API route.
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) {
      await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: sess.session.user.id }),
      }).catch(() => {});
    }
    await signOut();
    setLoading(false);
    router.replace("/");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(32px)", border: "1px solid rgba(252,165,165,0.3)", boxShadow: "0 20px 60px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.9)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#EF4444" }}>Supprimer le compte</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-2xl mb-4" style={{ background: "rgba(254,226,226,0.5)", border: "1px solid rgba(252,165,165,0.3)" }}>
          <AlertTriangle size={16} strokeWidth={1.5} style={{ color: "#EF4444", flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs font-light leading-relaxed" style={{ color: "#EF4444" }}>
            Cette action est <strong>irréversible</strong>. Toutes tes données (posts, séances, messages) seront définitivement supprimées.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "#A0AEC0" }}>
            Tape <span style={{ color: "#EF4444" }}>SUPPRIMER</span> pour confirmer
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            placeholder="SUPPRIMER"
            className="px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: "rgba(254,226,226,0.3)", border: "1px solid rgba(252,165,165,0.3)", color: "#2D3748" }}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-medium mb-3" style={{ color: "#EF4444" }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={handleDelete}
          disabled={loading || confirm !== "SUPPRIMER"}
          className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer"
          style={{
            background: confirm === "SUPPRIMER" ? "linear-gradient(135deg, #FCA5A5, #EF4444)" : "rgba(240,235,255,0.5)",
            color: confirm === "SUPPRIMER" ? "#FFFFFF" : "#A0AEC0",
            boxShadow: confirm === "SUPPRIMER" ? "0 4px 16px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.3)" : "none",
            transition: "all 0.3s ease",
          }}
        >
          {loading ? "Suppression…" : "Supprimer définitivement"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Settings Page ──────────────────────────────────── */
export default function ParametresPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <div className="min-h-screen px-4 md:px-8 pt-8 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>Paramètres</h1>
        {user && (
          <p className="text-sm font-light mt-1" style={{ color: "#A0AEC0" }}>
            Connecté en tant que <span className="font-medium" style={{ color: "#718096" }}>@{user.pseudo}</span>
          </p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex flex-col">

        {/* Compte */}
        <Section title="Compte" />
        <div className="flex flex-col gap-2">
          <Row
            icon={Lock}
            label="Changer le mot de passe"
            sublabel="Mets à jour ta sécurité"
            onClick={() => setShowPasswordModal(true)}
            iconBg="linear-gradient(135deg, rgba(167,139,250,0.25), rgba(212,192,255,0.2))"
          />
        </div>

        {/* Notifications */}
        <Section title="Notifications" />
        <div className="flex flex-col gap-2">
          <Row
            icon={Bell}
            label="Notifications email"
            sublabel="Abonnements, likes, commentaires"
            onClick={() => showToast("Bientôt disponible !")}
            iconBg="linear-gradient(135deg, rgba(245,230,163,0.4), rgba(212,168,67,0.2))"
          />
          <Row
            icon={Shield}
            label="Notifications push"
            sublabel="Sur cet appareil"
            onClick={async () => {
              if (!("Notification" in window)) { showToast("Non supporté sur ce navigateur"); return; }
              const perm = await Notification.requestPermission();
              showToast(perm === "granted" ? "Notifications activées !" : "Permission refusée");
            }}
            iconBg="linear-gradient(135deg, rgba(212,192,255,0.4), rgba(167,139,250,0.2))"
          />
        </div>

        {/* Apparence */}
        <Section title="Apparence" />
        <div className="flex flex-col gap-2">
          <Row
            icon={Palette}
            label="Thème"
            sublabel="Lumineux · Aura Classic"
            onClick={() => showToast("Bientôt disponible !")}
            iconBg="linear-gradient(135deg, rgba(245,230,163,0.35), rgba(212,192,255,0.25))"
          />
        </div>

        {/* Légal */}
        <Section title="Légal & confidentialité" />
        <div className="flex flex-col gap-2">
          {[
            { label: "Conditions d'utilisation", href: "/legal/cgu" },
            { label: "Politique de confidentialité", href: "/legal/privacy" },
          ].map(({ label, href }) => (
            <Row
              key={label}
              icon={Shield}
              label={label}
              onClick={() => router.push(href)}
              iconBg="linear-gradient(135deg, rgba(240,235,255,0.6), rgba(212,192,255,0.2))"
            />
          ))}
        </div>

        {/* Session */}
        <Section title="Session" />
        <div className="flex flex-col gap-2">
          <Row
            icon={LogOut}
            label="Se déconnecter"
            sublabel="Tu peux te reconnecter à tout moment"
            onClick={handleLogout}
            iconBg="linear-gradient(135deg, rgba(245,230,163,0.4), rgba(212,168,67,0.2))"
          />
        </div>

        {/* Zone danger */}
        <Section title="Zone de danger" />
        <div className="flex flex-col gap-2">
          <Row
            icon={Trash2}
            label="Supprimer mon compte"
            sublabel="Action irréversible"
            onClick={() => setShowDeleteModal(true)}
            danger
          />
        </div>

        <p className="text-center text-[10px] font-light mt-8" style={{ color: "#C4C9D4" }}>
          Aura v1.0 · Fait avec ✦ pour ta santé
        </p>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        {showDeleteModal   && <DeleteAccountModal  onClose={() => setShowDeleteModal(false)} />}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(240,235,255,0.9)", boxShadow: "0 8px 32px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)", color: "#2D3748", whiteSpace: "nowrap" }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
