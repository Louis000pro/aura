"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ArrowRight, Sparkles,
  User, Mail, Lock, CheckCircle2, AtSign, UserCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ── Particules ── */
type PData = { id: number; x: number; y: number; size: number; delay: number; duration: number; color: string };
function Particle({ x, y, size, delay, duration, color }: Omit<PData, "id">) {
  return (
    <motion.div className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: "blur(1px)" }}
      animate={{ y: ["-20px","20px","-20px"], x: ["-10px","10px","-10px"], opacity: [0.2,0.7,0.2], scale: [1,1.3,1] }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }} />
  );
}

/* ── Champ input ── */
function Field({
  icon, type, placeholder, value, onChange, required, suffix, autoFocus,
}: {
  icon: React.ReactNode; type: string; placeholder: string; value: string;
  onChange: (v: string) => void; required?: boolean; suffix?: React.ReactNode; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)" }}
      animate={{
        border: focused ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(220,215,235,0.6)",
        boxShadow: focused ? "0 4px 20px rgba(167,139,250,0.10)" : "0 2px 8px rgba(167,139,250,0.04)",
      }}
      transition={{ duration: 0.15 }}
    >
      <motion.span animate={{ color: focused ? "#A78BFA" : "#A0AEC0" }} transition={{ duration: 0.15 }}>
        {icon}
      </motion.span>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        required={required} autoFocus={autoFocus}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
        style={{ color: "#2D3748" }} />
      {suffix}
    </motion.div>
  );
}

/* ── Indicateur de force du mot de passe ── */
function pwdStrength(p: string) {
  if (!p) return null;
  let s = 0;
  if (p.length >= 8)  s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const levels = [
    { label: "Trop court",        color: "#FC8181", bars: 1 },
    { label: "Faible 😬",         color: "#FC8181", bars: 1 },
    { label: "Passable 👌",        color: "#F6AD55", bars: 2 },
    { label: "Sécurisé 🔒",       color: "#68D391", bars: 3 },
    { label: "Très sécurisé 💪",  color: "#A78BFA", bars: 4 },
    { label: "Incroyable 🔥",     color: "#D4A843", bars: 5 },
  ];
  return { score: s, ...levels[Math.min(s, 5)] };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const s = pwdStrength(password);
  if (!s) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <motion.div key={i} className="flex-1 h-1 rounded-full"
            animate={{ background: i <= s.bars ? s.color : "rgba(220,220,220,0.5)" }}
            transition={{ duration: 0.3 }} />
        ))}
      </div>
      <motion.p className="text-[10px] font-semibold" animate={{ color: s.color }} transition={{ duration: 0.3 }}>
        {s.label}
      </motion.p>
    </motion.div>
  );
}

/* ── Saisie du code OTP 6 chiffres ── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const arr = Array.from({ length: 6 }, (_, k) => value[k] ?? "");
    arr[i] = digit;
    onChange(arr.join(""));
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = Array.from({ length: 6 }, (_, k) => value[k] ?? "");
      if (arr[i]) { arr[i] = ""; onChange(arr.join("")); }
      else if (i > 0) { arr[i - 1] = ""; onChange(arr.join("")); refs.current[i - 1]?.focus(); }
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    if (pasted.length > 0) refs.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0,1,2,3,4,5].map(i => {
        const digit = value[i] ?? "";
        return (
          <input key={i}
            ref={el => { refs.current[i] = el; }}
            type="text" inputMode="numeric" maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={e => e.target.select()}
            className="w-11 h-14 text-center text-xl font-bold rounded-2xl outline-none"
            style={{
              background: "rgba(255,255,255,0.95)",
              border: digit ? "1.5px solid rgba(167,139,250,0.55)" : "1.5px solid rgba(220,215,235,0.7)",
              color: "#2D3748",
              boxShadow: digit ? "0 4px 16px rgba(167,139,250,0.18)" : "0 2px 8px rgba(167,139,250,0.04)",
              transition: "all 0.15s ease",
            }}
          />
        );
      })}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { signUp, signIn, signInWithGoogle, resetPassword, verifySignupOtp, resendSignupOtp, user, isLoading } = useAuth();

  // Redirige vers le dashboard si déjà connecté
  useEffect(() => {
    if (!isLoading && user) router.replace("/");
  }, [user, isLoading, router]);

  const [mode, setMode]             = useState<"login"|"signup">("login");
  const [pseudo, setPseudo]         = useState("");
  const [name, setName]             = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [error, setError]           = useState<string|null>(null);
  const [particles, setParticles]   = useState<PData[]>([]);

  /* OTP */
  const [otpCode, setOtpCode]           = useState("");
  const [otpToken, setOtpToken]         = useState<string|null>(null);
  const [otpLoading, setOtpLoading]     = useState(false);
  const [otpError, setOtpError]         = useState<string|null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Forgot password */
  const [forgotMode, setForgotMode]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState("");
  const [forgotSent, setForgotSent]     = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("mode") === "signup") setMode("signup");
    setParticles(Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random()*100, y: Math.random()*100,
      size: 4+Math.random()*10, delay: Math.random()*3, duration: 3+Math.random()*3,
      color: i%3===0 ? "rgba(167,139,250,0.5)" : i%3===1 ? "rgba(212,168,67,0.4)" : "rgba(240,235,255,0.65)",
    })));
  }, []);

  const canSubmit = mode === "login"
    ? (email && password)
    : (pseudo && name && lastName && email && password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      // Étape 1 : envoyer l'OTP via notre API Resend (avant de créer le compte)
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Erreur lors de l'envoi du code.");
        setLoading(false);
        return;
      }
      setOtpToken(json.token);
      setLoading(false);
      setSignupSent(true);
      return;
    } else {
      const err = await signIn({ email, password });
      if (err) { setError(err.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : err.message); setLoading(false); return; }
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push("/"), 900);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const err = await signInWithGoogle();
    if (err) { setError(err.message); setGoogleLoading(false); }
    // Si OK → redirect géré par Supabase
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6 || !otpToken) return;
    setOtpLoading(true);
    setOtpError(null);

    // Étape 2 : vérifier le code
    const verifyRes = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: otpToken, otp: otpCode }),
    });
    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok || verifyJson.error) {
      setOtpError(verifyJson.error ?? "Code incorrect ou expiré.");
      setOtpCode("");
      setOtpLoading(false);
      return;
    }

    // Étape 3 : créer le compte Supabase (email confirmé = vrai)
    const err = await signUp({ pseudo, name, lastName, email, password });
    if (err && err.message !== "User already registered") {
      setOtpLoading(false);
      setOtpError(err.message);
      return;
    }

    // Étape 4 : forcer la connexion immédiatement pour créer la session
    // (sinon l'utilisateur est rebouclé sur /auth car la confirmation
    // Supabase peut être encore active)
    const signInErr = await signIn({ email, password });
    setOtpLoading(false);
    if (signInErr) {
      // L'inscription a fonctionné mais la connexion auto a échoué :
      // demander à l'utilisateur de se reconnecter manuellement.
      setOtpError("Compte créé. Connecte-toi avec ton email et ton mot de passe.");
      setSignupSent(false);
      return;
    }

    setSignupSent(false);
    setSuccess(true);
    setTimeout(() => router.push("/"), 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError(null);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok || json.error) { setOtpError(json.error ?? "Erreur d'envoi."); return; }
    setOtpToken(json.token);
    setOtpCode("");
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(v => {
        if (v <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    const err = await resetPassword(forgotEmail.trim());
    setForgotLoading(false);
    if (err) { setError(err.message); return; }
    setForgotSent(true);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg,#faf8ff 0%,#fffef8 50%,#faf8ff 100%)" }}>

      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top:"-10%",left:"-5%",width:500,height:500,background:"rgba(212,192,255,0.45)",filter:"blur(80px)" }}
        animate={{ scale:[1,1.25,1],x:[-20,30,-20],y:[-15,20,-15] }}
        transition={{ duration:9,repeat:Infinity,ease:"easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom:"-10%",right:"-5%",width:450,height:450,background:"rgba(245,230,163,0.4)",filter:"blur(80px)" }}
        animate={{ scale:[1,1.2,1],x:[20,-25,20] }}
        transition={{ duration:8,repeat:Infinity,ease:"easeInOut",delay:1 }} />

      {particles.map(({ id, ...r }) => <Particle key={id} {...r} />)}

      <motion.div className="absolute pointer-events-none rounded-full"
        style={{ width:520,height:520,border:"1px solid rgba(167,139,250,0.12)" }}
        animate={{ rotate:360 }} transition={{ duration:30,repeat:Infinity,ease:"linear" }} />

      <motion.div initial={{ opacity:0,y:36,scale:0.93 }} animate={{ opacity:1,y:0,scale:1 }}
        transition={{ duration:0.6,ease:[0.25,0.46,0.45,0.94] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="relative rounded-3xl px-8 py-10 overflow-hidden"
          style={{ background:"rgba(255,255,255,0.85)",backdropFilter:"blur(12px) saturate(200%)",border:"1px solid rgba(255,255,255,0.88)",boxShadow:"0 1px 0 rgba(255,255,255,0.95) inset,0 32px 80px -16px rgba(167,139,250,0.2),0 8px 32px -8px rgba(245,230,163,0.15)" }}>

          <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
            style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)" }} />

          {/* Success overlay (connexion) */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity:0,scale:0.85 }} animate={{ opacity:1,scale:1 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl gap-3"
                style={{ background:"linear-gradient(135deg,rgba(212,192,255,0.97),rgba(245,230,163,0.97))",backdropFilter:"blur(10px)" }}>
                <motion.div initial={{ scale:0,rotate:-180 }} animate={{ scale:1,rotate:0 }} transition={{ type:"spring",bounce:0.5 }}>
                  <CheckCircle2 size={52} style={{ color:"#2D3748" }} strokeWidth={1.5} />
                </motion.div>
                <p className="text-lg font-light" style={{ color:"#2D3748" }}>Bon retour !</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay OTP (inscription) */}
          <AnimatePresence>
            {signupSent && (
              <motion.div initial={{ opacity:0,scale:0.92 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:0.92 }}
                transition={{ duration:0.35,ease:[0.25,0.46,0.45,0.94] }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl gap-5 px-8 py-10"
                style={{ background:"rgba(255,255,255,0.97)",backdropFilter:"blur(10px)" }}>

                {/* Icône */}
                <motion.div initial={{ scale:0,rotate:-180 }} animate={{ scale:1,rotate:0 }}
                  transition={{ type:"spring",bounce:0.5,delay:0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background:"linear-gradient(135deg,rgba(212,192,255,0.5),rgba(245,230,163,0.5))",boxShadow:"0 8px 28px rgba(167,139,250,0.2)" }}>
                  <span className="text-3xl">📧</span>
                </motion.div>

                {/* Texte */}
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.15 }}
                  className="text-center">
                  <p className="text-lg font-light mb-1" style={{ color:"#2D3748" }}>Code de confirmation</p>
                  <p className="text-xs font-light leading-relaxed" style={{ color:"#718096" }}>
                    Un code à 6 chiffres a été envoyé à<br/>
                    <strong style={{ color:"#2D3748" }}>{email}</strong>
                  </p>
                </motion.div>

                {/* Saisie OTP */}
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2 }}
                  className="w-full">
                  <OtpInput value={otpCode} onChange={v => { setOtpCode(v); setOtpError(null); }} />
                </motion.div>

                {/* Erreur OTP */}
                <AnimatePresence>
                  {otpError && (
                    <motion.p initial={{ opacity:0,y:-4,height:0 }} animate={{ opacity:1,y:0,height:"auto" }} exit={{ opacity:0,height:0 }}
                      className="text-xs font-medium text-center -mt-2" style={{ color:"#E53E3E" }}>
                      {otpError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Bouton valider */}
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.25 }}
                  className="w-full">
                  <motion.button
                    disabled={otpCode.length < 6 || otpLoading}
                    whileHover={otpCode.length === 6 && !otpLoading ? { scale:1.02,y:-1 } : {}}
                    whileTap={otpCode.length === 6 && !otpLoading ? { scale:0.97 } : {}}
                    onClick={handleVerifyOtp}
                    className="relative w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
                    style={{
                      background:"linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)",
                      color:"#fff",
                      opacity: otpCode.length < 6 || otpLoading ? 0.5 : 1,
                      boxShadow:"0 4px 24px rgba(167,139,250,0.38),inset 0 1px 0 rgba(255,255,255,0.25)",
                      transition:"opacity 0.2s",
                    }}>
                    <motion.div className="absolute inset-0 pointer-events-none"
                      style={{ background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.25) 50%,transparent 60%)" }}
                      animate={{ x:["-120%","120%"] }} transition={{ duration:2.5,repeat:Infinity,repeatDelay:1.2 }} />
                    {otpLoading ? (
                      <motion.div className="w-4 h-4 rounded-full border-2 mx-auto relative z-10"
                        style={{ borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff" }}
                        animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
                    ) : (
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <CheckCircle2 size={15} strokeWidth={2}/>
                        Vérifier le code
                      </span>
                    )}
                  </motion.button>
                </motion.div>

                {/* Actions secondaires */}
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
                  className="flex flex-col items-center gap-1.5">
                  <button onClick={handleResendOtp} disabled={resendCooldown > 0}
                    className="text-xs font-medium cursor-pointer"
                    style={{ color: resendCooldown > 0 ? "#A0AEC0" : "#A78BFA" }}>
                    {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer le code"}
                  </button>
                  <button onClick={() => { setSignupSent(false); setOtpCode(""); setOtpError(null); }}
                    className="text-xs cursor-pointer" style={{ color:"#A0AEC0" }}>
                    Annuler
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <motion.div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background:"linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" }}
              animate={{ boxShadow:["0 8px 28px rgba(167,139,250,0.4)","0 8px 36px rgba(212,168,67,0.45)","0 8px 28px rgba(167,139,250,0.4)"] }}
              transition={{ duration:3,repeat:Infinity }}>
              <motion.div className="absolute inset-0 rounded-2xl" style={{ border:"1px solid rgba(167,139,250,0.5)" }}
                animate={{ scale:[1,1.35,1],opacity:[0.6,0,0.6] }} transition={{ duration:2,repeat:Infinity }} />
              <span className="text-xl font-light relative z-10" style={{ color:"#2D3748" }}>A</span>
            </motion.div>
            <h1 className="text-xl font-extralight tracking-[0.2em]" style={{ color:"#2D3748" }}>Vaiiya</h1>
            <p className="text-[11px] font-light mt-0.5" style={{ color:"#A0AEC0" }}>Coach IA · Musculation · Nutrition</p>
          </div>

          {/* Erreur globale */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity:0,y:-8,height:0 }} animate={{ opacity:1,y:0,height:"auto" }} exit={{ opacity:0,height:0 }}
                className="mb-4 px-4 py-3 rounded-2xl text-xs font-medium"
                style={{ background:"rgba(252,129,129,0.12)",border:"1px solid rgba(252,129,129,0.25)",color:"#E53E3E" }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Google ── */}
          <motion.button type="button"
            whileHover={{ scale:1.02,y:-1 }} whileTap={{ scale:0.97 }}
            onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-sm font-medium cursor-pointer mb-5"
            style={{ background:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.9)",backdropFilter:"blur(10px)",color:"#2D3748",boxShadow:"0 2px 12px rgba(167,139,250,0.08),inset 0 1px 0 rgba(255,255,255,0.95)" }}>
            {googleLoading ? (
              <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor:"rgba(167,139,250,0.2)",borderTopColor:"#A78BFA" }}
                animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continuer avec Google
          </motion.button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background:"rgba(167,139,250,0.12)" }} />
            <span className="text-[11px]" style={{ color:"#A0AEC0" }}>ou</span>
            <div className="flex-1 h-px" style={{ background:"rgba(167,139,250,0.12)" }} />
          </div>

          {/* Tabs */}
          <div className="relative flex rounded-2xl p-1 mb-5 gap-1" style={{ background:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.7)" }}>
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className="relative flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer z-10"
                style={{ color:mode===m?"#2D3748":"#A0AEC0" }}>
                {mode===m && <motion.div layoutId="auth-tab" className="absolute inset-0 rounded-xl"
                  style={{ background:"rgba(255,255,255,0.92)",boxShadow:"0 2px 12px rgba(167,139,250,0.18),inset 0 1px 0 rgba(255,255,255,0.95)" }}
                  transition={{ type:"spring",bounce:0.25,duration:0.4 }} />}
                <span className="relative z-10">{m==="login"?"Se connecter":"Créer un compte"}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div key="pseudo-field"
                  initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }}
                  transition={{ duration:0.3 }} style={{ overflow:"hidden" }}>
                  <Field icon={<AtSign size={15}/>} type="text" placeholder="Pseudo (ex: Atlas92 ou atlas_92)" value={pseudo} onChange={setPseudo} required autoFocus />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div key="name-fields"
                  initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }}
                  transition={{ duration:0.3 }} style={{ overflow:"hidden" }} className="grid grid-cols-2 gap-3">
                  <Field icon={<User size={15}/>} type="text" placeholder="Prénom" value={name} onChange={setName} required />
                  <Field icon={<UserCheck size={15}/>} type="text" placeholder="Nom" value={lastName} onChange={setLastName} required />
                </motion.div>
              )}
            </AnimatePresence>

            <Field icon={<Mail size={15}/>} type="email" placeholder="Email" value={email} onChange={setEmail} required autoFocus={mode==="login"} />

            <div className="flex flex-col gap-2">
              <Field icon={<Lock size={15}/>}
                type={showPwd?"text":"password"} placeholder="Mot de passe" value={password} onChange={setPassword} required
                suffix={
                  <button type="button" onClick={() => setShowPwd(v=>!v)} className="cursor-pointer flex-shrink-0">
                    {showPwd ? <EyeOff size={14} style={{ color:"#A0AEC0" }}/> : <Eye size={14} style={{ color:"#A0AEC0" }}/>}
                  </button>
                } />
              {mode === "signup" && <PasswordStrengthBar password={password} />}
            </div>

            <motion.button type="submit" disabled={loading||!canSubmit}
              whileHover={!loading?{scale:1.02,y:-2}:{}} whileTap={!loading?{scale:0.97}:{}}
              className="relative mt-1 w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
              style={{ background:"linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)",color:"#fff",boxShadow:"0 4px 24px rgba(167,139,250,0.38),inset 0 1px 0 rgba(255,255,255,0.25)",opacity:!canSubmit?0.6:1 }}>
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.28) 50%,transparent 60%)" }}
                animate={{ x:["-120%","120%"] }} transition={{ duration:2.5,repeat:Infinity,repeatDelay:1.2 }} />
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="l" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }} className="flex items-center justify-center gap-2">
                    <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff" }}
                      animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
                    <span>{mode==="login"?"Connexion…":"Création…"}</span>
                  </motion.div>
                ) : (
                  <motion.div key="i" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }} className="flex items-center justify-center gap-2">
                    <Sparkles size={14} strokeWidth={1.5}/>
                    <span>{mode==="login"?"Se connecter":"Créer mon compte"}</span>
                    <ArrowRight size={14} strokeWidth={2}/>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {/* ── Mot de passe oublié ── */}
          <AnimatePresence>
            {forgotMode && (
              <motion.div key="forgot"
                initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }}
                transition={{ duration:0.3 }} style={{ overflow:"hidden" }} className="mt-4">
                <div className="rounded-2xl p-4" style={{ background:"rgba(240,235,255,0.5)",border:"1px solid rgba(167,139,250,0.15)" }}>
                  {forgotSent ? (
                    <motion.div initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }} className="flex flex-col items-center gap-2 py-1">
                      <CheckCircle2 size={28} style={{ color:"#A78BFA" }} strokeWidth={1.5}/>
                      <p className="text-xs text-center font-light" style={{ color:"#2D3748" }}>
                        Email envoyé à <strong>{forgotEmail}</strong>.<br/>
                        <span style={{ color:"#A0AEC0" }}>Vérifie ta boîte mail (et les spams).</span>
                      </p>
                      <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}
                        className="text-[11px] cursor-pointer hover:underline" style={{ color:"#A78BFA" }}>Fermer</button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgot} className="flex flex-col gap-3">
                      <p className="text-xs font-light" style={{ color:"#718096" }}>Entre ton email pour recevoir un lien de réinitialisation.</p>
                      <Field icon={<Mail size={15}/>} type="email" placeholder="ton@email.com" value={forgotEmail} onChange={setForgotEmail} required />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setForgotMode(false)}
                          className="flex-1 py-2.5 rounded-2xl text-xs font-medium cursor-pointer"
                          style={{ background:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.8)",color:"#718096" }}>Annuler</button>
                        <motion.button type="submit" disabled={forgotLoading||!forgotEmail.trim()}
                          whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                          className="flex-1 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer flex items-center justify-center"
                          style={{ background:"linear-gradient(135deg,#A78BFA,#D4A843)",color:"#fff",opacity:!forgotEmail.trim()?0.6:1 }}>
                          {forgotLoading
                            ? <motion.div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff" }}
                                animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }}/>
                            : "Envoyer le lien"}
                        </motion.button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-[11px] mt-5 font-light" style={{ color:"#A0AEC0" }}>
            {mode==="login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button onClick={() => { setMode(mode==="login"?"signup":"login"); setError(null); }}
              className="font-medium cursor-pointer hover:underline" style={{ color:"#2D3748" }}>
              {mode==="login"?"Créer un compte":"Se connecter"}
            </button>
            {mode==="login" && <>{" · "}<button onClick={() => setForgotMode(v=>!v)}
              className="font-medium cursor-pointer hover:underline" style={{ color:"#A78BFA" }}>Mot de passe oublié ?</button></>}
          </p>

          <p className="text-center text-[10px] mt-4 font-light leading-relaxed" style={{ color:"#A0AEC0" }}>
            En continuant, tu acceptes nos{" "}
            <Link href="/mentions-legales" className="font-medium hover:underline" style={{ color:"#A78BFA" }}>Mentions légales</Link>
            {" "}et notre{" "}
            <Link href="/confidentialite" className="font-medium hover:underline" style={{ color:"#A78BFA" }}>Politique de confidentialité</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
