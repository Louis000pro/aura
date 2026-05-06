"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ArrowRight, Sparkles,
  User, Mail, Lock, CheckCircle2, AtSign, UserCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type ParticleData = {
  id: number; x: number; y: number;
  size: number; delay: number; duration: number; color: string;
};

function Particle({ x, y, size, delay, duration, color }: Omit<ParticleData, "id">) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: "blur(1px)" }}
      animate={{ y: ["-20px","20px","-20px"], x: ["-10px","10px","-10px"], opacity: [0.2,0.7,0.2], scale: [1,1.3,1] }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function InputField({
  icon, type, placeholder, value, onChange, required, suffix, autoFocus,
}: {
  icon: React.ReactNode; type: string; placeholder: string; value: string;
  onChange: (v: string) => void; required?: boolean; suffix?: React.ReactNode; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg,rgba(255,255,255,0.8) 0%,rgba(255,255,255,0.6) 100%)",
        border: "1px solid rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
      }}
      animate={{ boxShadow: focused ? "0 0 0 2px rgba(167,139,250,0.5),0 8px 24px rgba(167,139,250,0.15)" : "0 4px 16px rgba(167,139,250,0.06),inset 0 1px 0 rgba(255,255,255,0.9)" }}
      transition={{ duration: 0.2 }}
    >
      <motion.span animate={{ color: focused ? "#A78BFA" : "#A0AEC0" }} transition={{ duration: 0.2 }}>
        {icon}
      </motion.span>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        required={required} autoFocus={autoFocus}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
        style={{ color: "#2D3748" }}
      />
      {suffix}
    </motion.div>
  );
}

/* ── Bouton OAuth générique ── */
function OAuthButton({
  provider, label, icon, onClick, loading,
}: {
  provider: string; label: string; icon: React.ReactNode;
  onClick: () => void; loading: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={loading}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(255,255,255,0.9)",
        backdropFilter: "blur(20px)",
        color: "#2D3748",
        boxShadow: "0 2px 12px rgba(167,139,250,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <motion.div
          className="w-4 h-4 rounded-full border-2"
          style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      ) : icon}
      {label}
    </motion.button>
  );
}

/* ── Icônes SVG ── */
const GoogleIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#2D3748">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pseudo, setPseudo]       = useState("");
  const [name, setName]           = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google"|"apple"|null>(null);
  const [success, setSuccess]     = useState(false);
  const [particles, setParticles] = useState<ParticleData[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

  useEffect(() => {
    setParticles(
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 10,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 3,
        color: i % 3 === 0
          ? "rgba(167,139,250,0.55)"
          : i % 3 === 1
          ? "rgba(212,168,67,0.45)"
          : "rgba(240,235,255,0.7)",
      }))
    );
  }, []);

  const canSubmit = mode === "login"
    ? pseudo && password
    : pseudo && name && lastName && email && password;

  /* ── Connexion classique (simulée, pas de vrai backend) ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const userData = mode === "signup"
      ? { pseudo: pseudo.trim(), name: name.trim(), lastName: lastName.trim(), email: email.trim() }
      : { pseudo: pseudo.trim(), name: pseudo.trim(), lastName: "", email: "" };
    login(userData, mode === "signup");
    setLoading(false);
    setSuccess(true);
    await new Promise((r) => setTimeout(r, 900));
    router.push("/");
  };

  /* ── OAuth Google / Apple (vrai redirect) ── */
  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    await signIn(provider, { callbackUrl: "/auth/oauth-callback" });
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg,#faf8ff 0%,#fffef8 50%,#faf8ff 100%)" }}
    >
      {/* Blobs */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-10%", left: "-5%", width: 500, height: 500, background: "rgba(212,192,255,0.5)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.25,1], x: [-20,30,-20], y: [-15,20,-15] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-10%", right: "-5%", width: 450, height: 450, background: "rgba(245,230,163,0.45)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.2,1], x: [20,-25,20], y: [10,-20,10] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

      {particles.map(({ id, ...rest }) => <Particle key={id} {...rest} />)}

      <motion.div className="absolute pointer-events-none rounded-full"
        style={{ width: 520, height: 520, border: "1px solid rgba(167,139,250,0.15)" }}
        animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute pointer-events-none rounded-full"
        style={{ width: 440, height: 440, border: "1px solid rgba(212,168,67,0.12)" }}
        animate={{ rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25,0.46,0.45,0.94] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="relative rounded-3xl px-8 py-10 overflow-hidden"
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0.6) 100%)",
            backdropFilter: "blur(48px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow: "0 1px 0 0 rgba(255,255,255,0.95) inset,0 32px 80px -16px rgba(167,139,250,0.22),0 8px 32px -8px rgba(245,230,163,0.18)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)" }} />

          {/* Success overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl gap-3"
                style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.97) 0%,rgba(245,230,163,0.97) 100%)", backdropFilter: "blur(20px)" }}
              >
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5 }}>
                  <CheckCircle2 size={56} style={{ color: "#2D3748" }} strokeWidth={1.5} />
                </motion.div>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-lg font-light" style={{ color: "#2D3748" }}>
                  Bienvenue, @{pseudo} !
                </motion.p>
                <motion.div className="flex gap-1.5 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {[0,1,2].map((i) => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#2D3748" }}
                      animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <motion.div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" }}
              animate={{ boxShadow: ["0 8px 32px rgba(167,139,250,0.4)","0 8px 40px rgba(212,168,67,0.45)","0 8px 32px rgba(167,139,250,0.4)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.div className="absolute inset-0 rounded-2xl" style={{ border: "1px solid rgba(167,139,250,0.5)" }}
                animate={{ scale: [1,1.35,1], opacity: [0.6,0,0.6] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="text-2xl font-light relative z-10" style={{ color: "#2D3748", letterSpacing: "0.05em" }}>A</span>
            </motion.div>
            <motion.h1 className="text-xl font-extralight tracking-[0.2em]" style={{ color: "#2D3748" }}>Aura</motion.h1>
            <p className="text-[11px] font-light mt-0.5 tracking-wider" style={{ color: "#A0AEC0" }}>Coach IA · Musculation · Nutrition</p>
          </div>

          {/* ── Boutons OAuth ── */}
          <div className="flex gap-2.5 mb-5">
            <OAuthButton
              provider="google" label="Google" icon={GoogleIcon}
              onClick={() => handleOAuth("google")}
              loading={oauthLoading === "google"}
            />
            <OAuthButton
              provider="apple" label="Apple" icon={AppleIcon}
              onClick={() => handleOAuth("apple")}
              loading={oauthLoading === "apple"}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "rgba(167,139,250,0.15)" }} />
            <span className="text-[11px] font-medium" style={{ color: "#A0AEC0" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "rgba(167,139,250,0.15)" }} />
          </div>

          {/* Tab toggle */}
          <div className="relative flex rounded-2xl p-1 mb-5 gap-1"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
            {(["login","signup"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="relative flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer z-10"
                style={{ color: mode === m ? "#2D3748" : "#A0AEC0" }}>
                {mode === m && (
                  <motion.div layoutId="auth-tab" className="absolute inset-0 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 12px rgba(167,139,250,0.18),inset 0 1px 0 rgba(255,255,255,0.95)" }}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.4 }} />
                )}
                <span className="relative z-10">{m === "login" ? "Se connecter" : "Créer un compte"}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <InputField icon={<AtSign size={15} />} type="text"
              placeholder="Pseudo (ex: atlas_92)" value={pseudo} onChange={setPseudo} required autoFocus />

            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div key="signup-fields"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }} style={{ overflow: "hidden" }}
                  className="flex flex-col gap-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <InputField icon={<User size={15} />} type="text" placeholder="Prénom" value={name} onChange={setName} required />
                    <InputField icon={<UserCheck size={15} />} type="text" placeholder="Nom" value={lastName} onChange={setLastName} required />
                  </div>
                  <InputField icon={<Mail size={15} />} type="email" placeholder="Email" value={email} onChange={setEmail} required />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField
              icon={<Lock size={15} />}
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={setPassword}
              required
              suffix={
                <button type="button" onClick={() => setShowPassword(v => !v)} className="cursor-pointer flex-shrink-0">
                  {showPassword
                    ? <EyeOff size={14} style={{ color: "#A0AEC0" }} />
                    : <Eye size={14} style={{ color: "#A0AEC0" }} />}
                </button>
              }
            />

            <motion.button type="submit" disabled={loading || !canSubmit}
              whileHover={!loading ? { scale: 1.02, y: -2 } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
              className="relative mt-1 w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
              style={{
                background: "linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)",
                color: "#fff",
                boxShadow: "0 4px 24px rgba(167,139,250,0.4),inset 0 1px 0 rgba(255,255,255,0.25)",
                opacity: !canSubmit ? 0.6 : 1,
              }}
            >
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%)" }}
                animate={{ x: ["-120%","120%"] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2 }} />
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="l" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="flex items-center justify-center gap-2">
                    <motion.div className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    <span>{mode === "login" ? "Connexion…" : "Création…"}</span>
                  </motion.div>
                ) : (
                  <motion.div key="i" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="flex items-center justify-center gap-2">
                    <Sparkles size={14} strokeWidth={1.5} />
                    <span>{mode === "login" ? "Se connecter" : "Créer mon compte"}</span>
                    <ArrowRight size={14} strokeWidth={2} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <p className="text-center text-[11px] mt-5 font-light" style={{ color: "#A0AEC0" }}>
            {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-medium cursor-pointer hover:underline" style={{ color: "#2D3748" }}>
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
