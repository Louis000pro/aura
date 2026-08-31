"use client";

import { useState, useEffect, Fragment, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AiMemoryManager from "@/components/AiMemoryManager";
import TasteProfileModal from "@/components/TasteProfileModal";
import { AssistantSpark, VisageGuide } from "@/components/AssistantMark";
import { Lock, LogOut, ChevronRight, Eye, EyeOff, Check, AlertTriangle, X, Shield, Moon, Sun, Target, Compass, Gauge, Gem, Utensils, CreditCard, Sparkles, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { useVisualQuality, type VisualQuality } from "@/lib/perfMode";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { subscribeToPush, unsubscribeFromPush, getPushPermission } from "@/lib/push";
import { fetchTasteProfile } from "@/lib/tasteProfile";
import { calculerAura, type EtatAura } from "@/lib/aura";
import { libelleObjectif } from "@/lib/profilOnboarding";
import { PLANS, VENTE_OUVERTE } from "@/lib/plans";
import { ouvrirNouveautes } from "@/lib/nouveautes";
import { useGuideActif } from "@/context/GuideContext";
import { PORTRAIT_GUIDE, PRENOM_GUIDE, type GuideId } from "@/lib/guides";

/* ════════════════════════════════════════════════════════════
   Un écran de réglages se LIT avant de s'ouvrir.

   D'où trois partis pris (maquette validée par Louis le 2026-07-29) :
   1. une carte par famille, avec des lignes séparées par un filet,
      au lieu de treize cartes en verre qui flottent toutes pareil ;
   2. la valeur courante à droite de chaque ligne (poids, souvenirs,
      option active) : on sait où on en est sans toucher ;
   3. le violet plein reste l'ACTION (système D) → un réglage ne
      s'affiche plus en trois gros boutons violets pleine largeur.
   ════════════════════════════════════════════════════════════ */

/* ── Une famille de réglages : un titre, une carte, des lignes ── */
function Groupe({ titre, children }: { titre: string; children: ReactNode[] }) {
  const lignes = children.filter(Boolean);
  return (
    <section className="flex flex-col">
      <p className="text-[10px] font-semibold tracking-widest uppercase px-1.5 mb-2" style={{ color: "var(--text-3)" }}>
        {titre}
      </p>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(var(--surface-rgb),0.75)",
          border: "1px solid rgba(var(--text-3-rgb),0.16)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 1px 3px rgba(var(--accent-rgb),0.05)",
        }}
      >
        {lignes.map((ligne, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="h-px ml-[52px]" style={{ background: "rgba(var(--text-3-rgb),0.16)" }} />}
            {ligne}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/* ── Une ligne : icône fine, libellé, valeur lisible à droite ── */
function Ligne({
  icon: Icon,
  mark,
  label,
  sub,
  value,
  right,
  chevron = true,
  onClick,
}: {
  icon?: LucideIcon;
  /** Remplace l'icône (l'étincelle ✦ garde son visage à elle). */
  mark?: ReactNode;
  label: string;
  sub?: string;
  /** Valeur courante, en clair, à droite du libellé. */
  value?: string;
  /** Contrôle posé dans la ligne (sélecteur, interrupteur, pastille). */
  right?: ReactNode;
  /** Le chevron dit « ça ouvre autre chose » : un interrupteur qui bascule sur
      place n'en a pas. */
  chevron?: boolean;
  onClick?: () => void;
}) {
  const contenu = (
    <>
      <span className="w-5 flex-shrink-0 flex items-center justify-center" style={{ color: "var(--text-2)" }}>
        {mark ?? (Icon ? <Icon size={18} strokeWidth={1.6} /> : null)}
      </span>
      <span className="flex flex-col gap-0.5 min-w-[120px] flex-1 text-left">
        <span className="text-[14.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>{label}</span>
        {sub && <span className="text-xs font-light truncate" style={{ color: "var(--text-3)" }}>{sub}</span>}
      </span>
      {value && (
        <span className="text-[13px] font-light flex-shrink-0 max-w-[45%] truncate" style={{ color: "var(--text-3)" }}>
          {value}
        </span>
      )}
      {right}
      {onClick && chevron && <ChevronRight size={15} strokeWidth={1.6} className="flex-shrink-0" style={{ color: "var(--text-3)", opacity: 0.6 }} />}
    </>
  );

  const classe = "w-full flex items-center flex-wrap gap-x-3 gap-y-2 px-4 py-3.5";
  if (!onClick) return <div className={classe}>{contenu}</div>;
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`${classe} text-left cursor-pointer transition-colors hover:bg-[rgba(var(--accent-rgb),0.06)]`}
    >
      {contenu}
    </motion.button>
  );
}

/* ── Sélecteur compact : violet UNIQUEMENT sur l'option active ── */
function Selecteur<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(var(--tint-violet-rgb),0.95)" }}>
      {options.map((opt) => (
        <motion.button
          key={opt.key}
          whileTap={{ scale: 0.94 }}
          onClick={() => onChange(opt.key)}
          className="px-2.5 py-1.5 rounded-full text-[11.5px] font-semibold cursor-pointer transition-colors"
          style={opt.key === value
            ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 1px 4px rgba(139,92,246,0.32)" }
            : { color: "var(--text-2)" }
          }
        >
          {opt.label}
        </motion.button>
      ))}
    </div>
  );
}

/* ── Interrupteur ────────────────────────────────────────── */
function Interrupteur({ on }: { on: boolean }) {
  return (
    <div
      className="relative flex-shrink-0 rounded-full transition-colors duration-300"
      style={{ width: 44, height: 26, background: on ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--text-3-rgb),0.35)" }}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-[3px] rounded-full"
        style={{ width: 20, height: 20, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}
      />
    </div>
  );
}

/* ── Pastille d'état (Premium, Admin) ────────────────────── */
function Pastille({ texte, ton = "or" }: { texte: string; ton?: "or" | "teal" }) {
  return (
    <span
      className="text-[10.5px] font-bold tracking-wide px-2 py-1 rounded-full flex-shrink-0"
      style={ton === "teal"
        ? { background: "rgba(43,212,160,0.16)", color: "#1FA47B" }
        : { background: "rgba(var(--gold-rgb),0.18)", color: "var(--gold)" }
      }
    >
      {texte}
    </span>
  );
}

/* Réglage de qualité visuelle (impacte la fluidité) — voir lib/perfMode.ts.
   `court` = la même chose en une ligne, pour tenir dans la ligne de réglage
   sans jamais laisser croire que c'est un simple goût esthétique. */
const QUALITY_OPTS: { key: VisualQuality; label: string; court: string }[] = [
  { key: "auto", label: "Auto",   court: "S’adapte à la puissance de ton appareil" },
  { key: "high", label: "Élevée", court: "Tous les effets visuels" },
  { key: "lite", label: "Fluide", court: "Effets allégés, plus fluide si ça saccade" },
];

/* Le prix vient de la source unique des offres : rien à retoucher ici le jour
   où il change. */
const PRIX_PREMIUM = (PLANS.premium.priceCents / 100).toFixed(2).replace(".", ",");

const THEME_OPTS: { key: ThemePreference; label: string }[] = [
  { key: "system", label: "Auto" },
  { key: "light", label: "Clair" },
  { key: "dark", label: "Sombre" },
];

/* ── Changer de Guide ─────────────────────────────────────
   Le changement est IMMÉDIAT, GRATUIT, sans délai d'attente et sans rien
   perdre : ni séance, ni planning, ni souvenir de la conversation. C'est
   la conséquence directe d'une règle produit, pas une faveur : Nora et
   Sasha ont exactement les mêmes capacités, les mêmes données et les
   mêmes conseils de fond, donc changer de Guide ne change que la façon
   dont on te parle. Il n'y a rien à re-gagner, donc rien à protéger par
   un cooldown.

   ⚠️ On n'écrit RIEN tant que la base n'a pas confirmé. `choisirGuide`
   rend `false` si l'écriture échoue, et dans ce cas on le dit au lieu de
   basculer l'écran : un choix qui disparaît au prochain chargement, sans
   explication, est pire que le refus lui-même. */
function GuideModal({ onClose, onChoisi }: { onClose: () => void; onChoisi: (g: GuideId) => void }) {
  const { guide, choisirGuide } = useGuideActif();
  const [enCours, setEnCours] = useState<GuideId | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  /* ⚠️ Le refus a besoin de DEUX oranges, pas d'un. Mesuré sur les fonds de
     l'app : #E8620C ne tient que 3,3:1 en clair, donc il échoue AA sur du
     petit texte ; et un orange assez sombre pour passer en clair devient
     illisible sur le fond sombre. D'où la paire, choisie ici en JS parce
     que cet écran s'écrit en styles en ligne, qui ne savent pas dépendre
     du thème. */
  const { isDark } = useTheme();
  const orangeRefus = isDark ? "#FF9A4D" : "#B54708";

  const basculer = async (g: GuideId) => {
    if (g === guide || enCours) return;
    setErreur(null);
    setEnCours(g);
    const ok = await choisirGuide(g);
    setEnCours(null);
    if (!ok) { setErreur("Le changement n’a pas pu être enregistré. Vérifie ta connexion et réessaie."); return; }
    onChoisi(g);
    onClose();
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
        style={{ background: "rgba(var(--surface-rgb),0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "0 20px 60px rgba(var(--accent-rgb),0.15), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Ton Guide</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>
        <p className="text-xs font-light mb-4" style={{ color: "var(--text-3)" }}>
          Mêmes séances, mêmes données, mêmes conseils dans les deux cas. C&apos;est la façon de te parler qui change.
        </p>

        <div className="flex flex-col gap-2.5">
          {(["nora", "sasha"] as GuideId[]).map((g) => {
            const actif = g === guide;
            return (
              <motion.button
                key={g}
                whileTap={actif ? undefined : { scale: 0.98 }}
                onClick={() => { void basculer(g); }}
                disabled={actif || enCours !== null}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl text-left"
                style={{
                  background: actif ? "rgba(var(--accent-rgb),0.10)" : "rgba(var(--tint-violet-rgb),0.5)",
                  border: actif ? "1px solid rgba(var(--accent-rgb),0.42)" : "1px solid rgba(var(--accent-rgb),0.14)",
                  cursor: actif ? "default" : "pointer",
                  opacity: enCours && enCours !== g ? 0.5 : 1,
                }}
              >
                <VisageGuide guide={g} size={52} />
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{PRENOM_GUIDE[g]}</span>
                  <span className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>{PORTRAIT_GUIDE[g].trait}</span>
                  <span className="text-[11.5px] font-light" style={{ color: "var(--text-3)" }}>{PORTRAIT_GUIDE[g].pour}</span>
                </span>
                {actif
                  ? <Pastille texte="Actif" ton="teal" />
                  : enCours === g
                    ? <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--text-3)" }}>…</span>
                    : <ChevronRight size={16} strokeWidth={1.8} className="flex-shrink-0" style={{ color: "var(--text-3)", opacity: 0.6 }} />}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {erreur && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="status"
              className="text-[12px] font-medium mt-3"
              style={{ color: orangeRefus }}
            >
              {erreur}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="text-[11.5px] font-light mt-4" style={{ color: "var(--text-3)" }}>
          Tu peux changer quand tu veux. Tes séances, ton planning et ce que ton Guide retient de toi ne bougent pas.
        </p>
      </motion.div>
    </motion.div>
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
        style={{ background: "rgba(var(--surface-rgb),0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "0 20px 60px rgba(var(--accent-rgb),0.15), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Changer le mot de passe</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        {success ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
              <Check size={20} strokeWidth={2.5} style={{ color: "var(--text-1)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Mot de passe mis à jour !</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {[
              { label: "Mot de passe actuel", value: current, onChange: setCurrent, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
              { label: "Nouveau mot de passe", value: next, onChange: setNext, show: showNext, toggle: () => setShowNext(p => !p) },
              { label: "Confirmer le nouveau", value: confirm, onChange: setConfirm, show: showNext, toggle: () => setShowNext(p => !p) },
            ].map(({ label, value, onChange, show, toggle }, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-3)" }}>{label}</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}>
                  <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--text-1)" }}
                  />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={toggle} className="cursor-pointer">
                    {show ? <EyeOff size={14} strokeWidth={1.5} style={{ color: "var(--text-3)" }} /> : <Eye size={14} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />}
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
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(var(--accent-rgb),0.3), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }}
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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sess.session.access_token}`,
        },
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
        style={{ background: "rgba(var(--surface-rgb),0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(252,165,165,0.3)", boxShadow: "0 20px 60px rgba(239,68,68,0.1), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#EF4444" }}>Supprimer le compte</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-2xl mb-4" style={{ background: "rgba(254,226,226,0.5)", border: "1px solid rgba(252,165,165,0.3)" }}>
          <AlertTriangle size={16} strokeWidth={1.5} style={{ color: "#EF4444", flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs font-light leading-relaxed" style={{ color: "#EF4444" }}>
            Cette action est <strong>irréversible</strong>. Toutes tes données (posts, séances, messages) seront définitivement supprimées.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-3)" }}>
            Tape <span style={{ color: "#EF4444" }}>SUPPRIMER</span> pour confirmer
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            placeholder="SUPPRIMER"
            className="px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: "rgba(254,226,226,0.3)", border: "1px solid rgba(252,165,165,0.3)", color: "var(--text-1)" }}
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
            background: confirm === "SUPPRIMER" ? "linear-gradient(135deg, #FCA5A5, #EF4444)" : "rgba(var(--tint-violet-rgb),0.5)",
            color: confirm === "SUPPRIMER" ? "#FFFFFF" : "var(--text-3)",
            boxShadow: confirm === "SUPPRIMER" ? "0 4px 16px rgba(239,68,68,0.3), inset 0 1px 0 rgba(var(--surface-rgb),0.3)" : "none",
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
  const { user, session, logout } = useAuth();
  const router = useRouter();
  const { isDark, preference, setPreference } = useTheme();
  const { quality, setQuality } = useVisualQuality();
  const { start: startTour } = useGuidedTour();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [portail, setPortail]                     = useState(false);
  const [portailErreur, setPortailErreur]         = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [showMemoryModal, setShowMemoryModal]     = useState(false);
  const [showTasteModal, setShowTasteModal]       = useState(false);
  const [showGuideModal, setShowGuideModal]      = useState(false);
  /* ⚠️ L'état « inconnu » n'affiche PAS la ligne. Il veut dire « la lecture
     a échoué » (colonne pas encore en base, réseau coupé, session expirée),
     pas « pas de Guide » : montrer un réglage qu'on ne saurait ni lire ni
     écrire, c'est promettre un bouton qui refusera après le clic. Tant que
     `20260818_guide_id.sql` n'est pas collé, la ligne n'existe simplement
     pas et l'écran est celui d'avant. */
  const { etat: etatGuide, guide } = useGuideActif();
  const [toast, setToast] = useState<string | null>(null);
  const [pushLoading, setPushLoading]             = useState(false);
  const [pushEnabled, setPushEnabled]             = useState(false);

  // Ce que chaque ligne affiche à droite : on le lit une fois à l'ouverture.
  const [resumeCorps, setResumeCorps]   = useState<string | null>(null);
  const [resumeGouts, setResumeGouts]   = useState<string | null>(null);
  const [nbMemoires, setNbMemoires]     = useState<number | null>(null);
  const [aura, setAura]                 = useState<EtatAura | null>(null);

  // Initialise push status on mount
  useEffect(() => {
    const perm = getPushPermission();
    setPushEnabled(perm === "granted");
  }, []);

  // Résumés des lignes (aucun ne bloque l'affichage : la valeur apparaît quand
  // elle arrive, la ligne reste utilisable avant).
  useEffect(() => {
    if (!user?.id) return;
    let vivant = true;
    const supabase = createClient();

    supabase.from("profiles")
      .select("onboarding_weight,onboarding_goals")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!vivant) return;
        const premier = data?.onboarding_goals?.[0];
        const objectif = premier ? libelleObjectif(premier) : null;
        const bouts = [data?.onboarding_weight ? `${data.onboarding_weight} kg` : null, objectif].filter(Boolean);
        setResumeCorps(bouts.length ? bouts.join(" · ") : "À remplir");
      });

    fetchTasteProfile(user.id).then((p) => {
      if (!vivant) return;
      setResumeGouts(p?.time ?? "À remplir");
    });

    supabase.from("ai_memories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => { if (vivant) setNbMemoires(count ?? 0); });

    calculerAura(supabase, user.id)
      .then((e) => { if (vivant) setAura(e); })
      .catch(() => {});

    return () => { vivant = false; };
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handlePushToggle = async () => {
    if (!user?.id) { showToast("Connecte-toi d’abord"); return; }
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
        showToast("Notifications push désactivées");
      } else {
        const result = await subscribeToPush();
        if (result === "granted") {
          setPushEnabled(true);
          showToast("Notifications push activées !");
        } else if (result === "denied") {
          showToast("Permission refusée — autorise dans les réglages du navigateur");
        } else if (result === "unsupported") {
          showToast("Non supporté sur ce navigateur");
        } else {
          showToast("Erreur lors de l’activation");
        }
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  /**
   * Envoie vers le portail Stripe (factures, carte, résiliation).
   * Une erreur se lit sous la ligne : un bouton d'annulation qui ne dit rien
   * quand il rate, c'est exactement ce qui fait écrire un client en colère.
   */
  const ouvrirPortail = async () => {
    if (!session?.access_token) { setPortailErreur("Reconnecte-toi pour continuer"); return; }
    setPortail(true);
    setPortailErreur(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setPortailErreur(data.message || "Impossible d’ouvrir la gestion de l’abonnement");
    } catch {
      setPortailErreur("Impossible d’ouvrir la gestion de l’abonnement");
    } finally {
      setPortail(false);
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-8 pt-8 pb-24 max-w-2xl lg:max-w-5xl mx-auto">
      {/* Titre */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="text-2xl font-semibold tracking-tight mb-5"
        style={{ color: "var(--text-1)" }}
      >
        Paramètres
      </motion.h1>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex flex-col">

        {/* Qui je suis : l'avatar, le pseudo, le rang. Remplace le
            « Connecté en tant que » en gris clair. */}
        <div
          className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl mb-6"
          style={{
            background: "rgba(var(--surface-rgb),0.75)",
            border: "1px solid rgba(var(--text-3-rgb),0.16)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 1px 3px rgba(var(--accent-rgb),0.05)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden text-lg font-semibold"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }}
          >
            {user?.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              : (user?.pseudo?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold truncate" style={{ color: "var(--text-1)" }}>@{user?.pseudo}</p>
            <p className="text-xs font-light truncate" style={{ color: "var(--text-3)" }}>{user?.email}</p>
          </div>
          {aura && (
            <div
              className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.16), rgba(var(--gold-rgb),0.20))" }}
            >
              {aura.rang.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={aura.rang.image} alt="" className="h-[18px] w-auto" />
                : <span className="w-2.5 h-2.5 rotate-45 rounded-[2px]" style={{ background: `linear-gradient(135deg,${aura.rang.neon[0]},${aura.rang.neon[1]})` }} />}
              <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "var(--text-2)" }}>
                {aura.rang.nom} · {aura.exp} EXP
              </span>
            </div>
          )}
        </div>

        {/* Trois familles. Sur grand écran elles se rangent en deux
            colonnes au lieu de laisser la moitié droite vide. */}
        <div className="grid lg:grid-cols-2 gap-x-8 gap-y-6 items-start">

          <Groupe titre="Toi">
            <Ligne
              icon={Target}
              label="Mon corps et mes objectifs"
              sub="Ce sur quoi ton Guide calibre tes séances"
              value={resumeCorps ?? undefined}
              onClick={() => router.push("/bienvenue")}
            />
            {(etatGuide === "actif" || etatGuide === "aucun") && (
              <Ligne
                mark={<VisageGuide guide={guide} size={20} />}
                label="Ton Guide"
                sub={guide ? PORTRAIT_GUIDE[guide].trait : "Nora ou Sasha, à toi de voir"}
                value={guide ? PRENOM_GUIDE[guide] : "Pas encore choisi"}
                onClick={() => setShowGuideModal(true)}
              />
            )}
            <Ligne
              icon={Utensils}
              label="Mes goûts cuisine"
              sub="Cuisine, temps, ingrédients, plats préférés"
              value={resumeGouts ?? undefined}
              onClick={() => setShowTasteModal(true)}
            />
            <Ligne
              mark={<AssistantSpark px={18} />}
              label={guide ? `Ce que ${PRENOM_GUIDE[guide]} retient de toi` : "Ce que ton Guide retient de toi"}
              sub="Consulter, corriger, effacer"
              value={nbMemoires === null ? undefined : nbMemoires === 1 ? "1 souvenir" : `${nbMemoires} souvenirs`}
              onClick={() => setShowMemoryModal(true)}
            />
          </Groupe>

          <Groupe titre="L’application">
            <Ligne
              icon={isDark ? Moon : Sun}
              label="Thème"
              right={
                <Selecteur
                  options={THEME_OPTS.map((o) => ({ key: o.key, label: o.label }))}
                  value={preference}
                  onChange={(k) => { setPreference(k); showToast(`Thème : ${THEME_OPTS.find((o) => o.key === k)?.label}`); }}
                />
              }
            />
            {/* Ce réglage sert vraiment à quelque chose : il allège les effets
                sur un appareil qui rame. Le sous-titre décrit toujours l'option
                active pour que personne ne le règle à l'aveugle. */}
            <Ligne
              icon={Gauge}
              label="Qualité visuelle"
              sub={QUALITY_OPTS.find((o) => o.key === quality)?.court}
              right={
                <Selecteur
                  options={QUALITY_OPTS.map((o) => ({ key: o.key, label: o.label }))}
                  value={quality}
                  onChange={(k) => { setQuality(k); showToast(`Qualité : ${QUALITY_OPTS.find((o) => o.key === k)?.label}`); }}
                />
              }
            />
            <Ligne
              icon={Shield}
              label="Notifications push"
              sub={pushLoading ? "Traitement…" : pushEnabled ? "Activées sur cet appareil" : "Désactivées sur cet appareil"}
              right={<Interrupteur on={pushEnabled} />}
              chevron={false}
              onClick={pushLoading ? undefined : handlePushToggle}
            />
            <Ligne
              icon={Compass}
              label="Refaire la visite"
              sub="Tout ce que Vaiiya sait faire, en une minute"
              // La visite se joue par-dessus l'écran courant : on ne quitte
              // plus les paramètres pour la lancer.
              onClick={() => startTour()}
            />
            {/* Le récap ne se voit qu'une fois tout seul : il doit rester
                retrouvable, sinon un message important disparaît d'un clic. */}
            <Ligne
              icon={Sparkles}
              label="Nouveautés"
              sub="Le récap de la dernière mise à jour"
              onClick={() => ouvrirNouveautes()}
            />
          </Groupe>

          <Groupe titre="Compte">
            <Ligne
              icon={Gem}
              label="Vaiiya Premium"
              sub={user?.is_premium ? "Ton abonnement est actif" : "Séances exclusives, missions illimitées"}
              right={
                user?.is_premium
                  ? <Pastille texte="Actif" ton="teal" />
                  : VENTE_OUVERTE
                    ? <Pastille texte={`${PRIX_PREMIUM} €`} />
                    : <Pastille texte="Bientôt" />
              }
              onClick={() => router.push("/premium")}
            />
            {/* Résilier doit être aussi simple que souscrire : la ligne vit
                dans les réglages, là où on la cherche, et pas seulement sur la
                page de vente. */}
            {user?.is_premium && (
              <Ligne
                icon={CreditCard}
                label="Gérer mon abonnement"
                sub={portailErreur ?? "Factures, moyen de paiement, résiliation"}
                right={portail ? <Pastille texte="Ouverture…" /> : undefined}
                onClick={portail ? undefined : ouvrirPortail}
              />
            )}
            <Ligne
              icon={Lock}
              label="Mot de passe"
              sub="Mets à jour ta sécurité"
              onClick={() => setShowPasswordModal(true)}
            />
            {(user?.is_admin || user?.email === "teyprox@gmail.com") && (
              <Ligne
                icon={Shield}
                label="Administration"
                sub="Gérer les utilisateurs, bannir, certifier"
                right={<Pastille texte="Admin" />}
                onClick={() => router.push("/admin")}
              />
            )}
            <Ligne
              icon={LogOut}
              label="Se déconnecter"
              sub="Tu peux te reconnecter à tout moment"
              onClick={handleLogout}
            />
          </Groupe>

        </div>

        {/* Pied de page : le légal et l'irréversible, une seule fois. */}
        <div className="flex flex-col items-center gap-3 mt-10">
          <div className="flex items-center gap-2 text-[11px] font-light" style={{ color: "var(--text-3)" }}>
            <Link href="/conditions" className="hover:underline" style={{ color: "var(--text-2)" }}>Conditions</Link>
            <span>·</span>
            <Link href="/mentions-legales" className="hover:underline" style={{ color: "var(--text-2)" }}>Mentions légales</Link>
            <span>·</span>
            <Link href="/confidentialite" className="hover:underline" style={{ color: "var(--text-2)" }}>Confidentialité</Link>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowDeleteModal(true)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-xl cursor-pointer hover:underline"
            style={{ color: "#D9646A" }}
          >
            Supprimer mon compte
          </motion.button>
          <p className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>
            Vaiiya v1.0 · Fait avec ✦ pour ta santé
          </p>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        {showDeleteModal   && <DeleteAccountModal  onClose={() => setShowDeleteModal(false)} />}
        {showMemoryModal   && <AiMemoryManager     onClose={() => setShowMemoryModal(false)} />}
        {showTasteModal    && <TasteProfileModal   onClose={() => setShowTasteModal(false)} onSaved={() => showToast("Goûts enregistrés ✓")} />}
        {showGuideModal    && <GuideModal          onClose={() => setShowGuideModal(false)} onChoisi={(g) => showToast(`${PRENOM_GUIDE[g]} est ton Guide ✓`)} />}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(var(--surface-rgb),0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2), inset 0 1px 0 rgba(var(--surface-rgb),0.9)", color: "var(--text-1)", whiteSpace: "nowrap" }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
