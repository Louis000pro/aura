"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Sparkles, User, Mail, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type ParticleData = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
};

function Particle({ x, y, size, delay, duration, color }: Omit<ParticleData, "id">) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: "blur(1px)" }}
      animate={{
        y: ["-20px", "20px", "-20px"],
        x: ["-10px", "10px", "-10px"],
        opacity: [0.2, 0.7, 0.2],
        scale: [1, 1.3, 1],
      }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function InputField({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
  suffix,
  autoFocus,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  suffix?: React.ReactNode;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)",
        border: "1px solid rgba(255,255,255,0.8)",
        backdropFilter: "blur(20px)",
      }}
      animate={{
        boxShadow: focused
          ? "0 0 0 2px rgba(167,139,250,0.5), 0 8px 24px rgba(167,139,250,0.15)"
          : "0 4px 16px rgba(167,139,250,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
      transition={{ duration: 0.2 }}
    >
      <motion.span
        animate={{ color: focused ? "#A78BFA" : "#A0AEC0" }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
        style={{ color: "#2D3748" }}
      />
      {suffix}
    </motion.div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const displayName = (mode === "signup" && name) ? name : email.split("@")[0];
    login({ name: displayName, email }, mode === "signup");
    setLoading(false);
    setSuccess(true);
    await new Promise((r) => setTimeout(r, 900));
    router.push("/");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated morphing blobs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ top: "-10%", left: "-5%", width: 500, height: 500, background: "rgba(212,192,255,0.55)", filter: "blur(70px)" }}
        animate={{
          scale: [1, 1.25, 1],
          x: [-20, 30, -20],
          y: [-15, 20, -15],
          borderRadius: ["60% 40% 30% 70% / 60% 30% 70% 40%", "30% 60% 70% 40% / 50% 60% 30% 60%", "60% 40% 30% 70% / 60% 30% 70% 40%"],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-10%", right: "-5%", width: 450, height: 450, background: "rgba(245,230,163,0.5)", filter: "blur(70px)" }}
        animate={{
          scale: [1, 1.2, 1],
          x: [20, -25, 20],
          y: [10, -20, 10],
          borderRadius: ["50% 60% 30% 60% / 30% 60% 70% 40%", "60% 30% 40% 60% / 70% 40% 60% 30%", "50% 60% 30% 60% / 30% 60% 70% 40%"],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ top: "40%", right: "15%", width: 300, height: 300, background: "rgba(167,139,250,0.3)", filter: "blur(60px)" }}
        animate={{ scale: [1, 1.4, 1], x: [-15, 20, -15] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Floating particles */}
      {particles.map(({ id, ...rest }) => (
        <Particle key={id} {...rest} />
      ))}

      {/* Rotating rings */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ width: 520, height: 520, border: "1px solid rgba(167,139,250,0.2)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ width: 460, height: 460, border: "1px solid rgba(212,168,67,0.15)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="relative rounded-3xl px-8 py-10 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.55) 100%)",
            backdropFilter: "blur(48px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "0 1px 0 0 rgba(255,255,255,0.95) inset, 0 -1px 0 0 rgba(240,235,255,0.4) inset, 0 32px 80px -16px rgba(167,139,250,0.22), 0 8px 32px -8px rgba(245,230,163,0.18)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)" }} />

          {/* Success overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl gap-3"
                style={{ background: "linear-gradient(135deg, rgba(212,192,255,0.96) 0%, rgba(245,230,163,0.96) 100%)", backdropFilter: "blur(20px)" }}
              >
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}>
                  <CheckCircle2 size={56} style={{ color: "#2D3748" }} strokeWidth={1.5} />
                </motion.div>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-lg font-light" style={{ color: "#2D3748" }}>
                  Connexion réussie !
                </motion.p>
                <motion.div className="flex gap-1 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#2D3748" }}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              className="relative w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }}
              animate={{
                boxShadow: [
                  "0 8px 32px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
                  "0 8px 48px rgba(212,168,67,0.45), inset 0 1px 0 rgba(255,255,255,0.8)",
                  "0 8px 32px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.div className="absolute inset-0 rounded-3xl" style={{ border: "1px solid rgba(167,139,250,0.4)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.div className="absolute inset-0 rounded-3xl" style={{ border: "1px solid rgba(212,168,67,0.3)" }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
              <span className="text-3xl font-semibold relative z-10" style={{ color: "#2D3748" }}>A</span>
            </motion.div>

            <motion.h1 className="text-2xl font-extralight tracking-wide" style={{ color: "#2D3748" }}
              animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 4, repeat: Infinity }}
            >
              Aura
            </motion.h1>
            <p className="text-xs font-light mt-1 tracking-wider" style={{ color: "#A0AEC0" }}>
              Votre concierge de santé IA
            </p>
          </div>

          {/* Tab toggle */}
          <div
            className="relative flex rounded-2xl p-1 mb-7 gap-1"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="relative flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors z-10"
                style={{ color: mode === m ? "#2D3748" : "#A0AEC0" }}
              >
                {mode === m && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 12px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)" }}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{m === "login" ? "Se connecter" : "Créer un compte"}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <InputField icon={<User size={15} />} type="text" placeholder="Votre prénom" value={name} onChange={setName} autoFocus />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField icon={<Mail size={15} />} type="email" placeholder="Adresse email" value={email} onChange={setEmail} required />

            <InputField
              icon={<Lock size={15} />}
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={setPassword}
              required
              suffix={
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="cursor-pointer flex-shrink-0 p-0.5" aria-label={showPassword ? "Cacher" : "Afficher"}>
                  {showPassword ? <EyeOff size={14} style={{ color: "#A0AEC0" }} /> : <Eye size={14} style={{ color: "#A0AEC0" }} />}
                </button>
              }
            />

            <motion.button
              type="submit"
              disabled={loading || !email || !password}
              whileHover={!loading ? { scale: 1.02, y: -2 } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
              className="relative mt-2 w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #A78BFA 0%, #D4A843 100%)",
                color: "#fff",
                boxShadow: "0 4px 24px rgba(167,139,250,0.4), 0 1px 0 rgba(255,255,255,0.25) inset",
                opacity: !email || !password ? 0.6 : 1,
              }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)", backgroundSize: "200% 100%" }}
                animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
              />
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center justify-center gap-2">
                    <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    <span>Connexion en cours…</span>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center justify-center gap-2">
                    <Sparkles size={14} strokeWidth={1.5} />
                    <span>{mode === "login" ? "Se connecter" : "Créer mon compte"}</span>
                    <ArrowRight size={14} strokeWidth={2} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-[11px] mt-6 font-light" style={{ color: "#A0AEC0" }}>
            {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-medium cursor-pointer hover:underline" style={{ color: "#2D3748" }}>
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
