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

/* Système « D » : le bouton d'action principal est TOUJOURS violet vers magenta,
   jamais violet vers or. Même couleur que le CTA de la page de présentation. */
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";
const TEAL = "#2BD4A0"; // réussite

/* Le fond repris du haut de la page de présentation : une nappe chaude ancrée
   en bas, une lueur violette en haut. Statique : aucune particule, aucun anneau
   qui tourne, rien qui bouge derrière un formulaire. */
const FOND_PRESENTATION = [
  "radial-gradient(700px 620px at 4% -10%, rgba(var(--accent-rgb),0.30) 0%, transparent 68%)",
  "radial-gradient(660px 600px at 98% 106%, rgba(var(--gold-rgb),0.26) 0%, transparent 68%)",
  "linear-gradient(to top, rgba(var(--gold-rgb),0.16) 0%, rgba(var(--gold-rgb),0.05) 38%, transparent 70%)",
].join(",");

/* ── Champ input ── */
function Field({
  icon, type, placeholder, value, onChange, required, suffix, autoFocus,
}: {
  icon: React.ReactNode; type: string; placeholder: string; value: string;
  onChange: (v: string) => void; required?: boolean; suffix?: React.ReactNode; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    /* Contour et icône passent par du CSS pur : framer-motion ne sait interpoler
       ni le raccourci « border » ni une couleur écrite en variable, il les
       ignorait en silence et les champs n'avaient aucun contour. */
    <div className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{
        background: "rgba(var(--tint-violet-rgb),0.62)",
        border: focused ? "1px solid rgba(var(--accent-rgb),0.5)" : "1px solid rgba(var(--accent-rgb),0.16)",
        boxShadow: focused ? "0 4px 20px rgba(var(--accent-rgb),0.14)" : "0 2px 8px rgba(var(--accent-rgb),0.04)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <span style={{ color: focused ? "var(--accent)" : "var(--text-3)", transition: "color 0.15s ease" }}>
        {icon}
      </span>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        required={required} autoFocus={autoFocus}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-3)]"
        style={{ color: "var(--text-1)" }} />
      {suffix}
    </div>
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
  /* Rouge tant que ça ne tient pas, or quand c'est passable, teal dès que
     c'est solide : les mêmes rôles de couleur que partout ailleurs. */
  const levels = [
    { label: "Trop court",      color: "#E86A6A", bars: 1 },
    { label: "Faible",          color: "#E86A6A", bars: 1 },
    { label: "Passable",        color: "var(--gold)", bars: 2 },
    { label: "Sécurisé",        color: TEAL, bars: 3 },
    { label: "Très sécurisé",   color: TEAL, bars: 4 },
    { label: "Excellent",       color: TEAL, bars: 5 },
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
          <div key={i} className="flex-1 h-1 rounded-full"
            style={{ background: i <= s.bars ? s.color : "rgba(var(--accent-rgb),0.14)", transition: "background 0.3s ease" }} />
        ))}
      </div>
      <p className="text-[10px] font-semibold" style={{ color: s.color, transition: "color 0.3s ease" }}>
        {s.label}
      </p>
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
              background: "rgba(var(--tint-violet-rgb),0.62)",
              border: digit ? "1.5px solid rgba(var(--accent-rgb),0.55)" : "1.5px solid rgba(var(--accent-rgb),0.14)",
              color: "var(--text-1)",
              boxShadow: digit ? "0 4px 16px rgba(var(--accent-rgb),0.18)" : "0 2px 8px rgba(var(--accent-rgb),0.04)",
              transition: "all 0.15s ease",
            }}
          />
        );
      })}
    </div>
  );
}

/* Destination après connexion : ?next=/chemin (invitation à un relais…).
   On n'accepte qu'un chemin interne, jamais une URL absolue, sinon
   n'importe qui peut fabriquer un lien de login qui renvoie ailleurs.
   Lu sur window plutôt qu'avec useSearchParams : pas de Suspense à poser. */
function destinationApres(): string {
  if (typeof window === "undefined") return "/";
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export default function AuthPage() {
  const router = useRouter();
  const { signUp, signIn, signInWithGoogle, resetPassword, verifySignupOtp, resendSignupOtp, user, isLoading } = useAuth();

  // Redirige vers le dashboard si déjà connecté
  useEffect(() => {
    if (!isLoading && user) router.replace(destinationApres());
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
  const [isMobile, setIsMobile]     = useState(false);

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
    // Le fond est statique : il ne reste que le flou de verre de la carte,
    // qu'on coupe sur mobile pour ne pas faire ramer le GPU.
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
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
    setTimeout(() => router.push(destinationApres()), 900);
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
    setTimeout(() => router.push(destinationApres()), 1000);
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
      style={{ background: "var(--page-bg)" }}>

      {/* Le même dégradé qu'en haut de la page de présentation. Une image fixe :
          rien ne tourne, rien ne flotte, on entre et on remplit le formulaire. */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: FOND_PRESENTATION }} />

      <motion.div initial={{ opacity:0,y:36,scale:0.93 }} animate={{ opacity:1,y:0,scale:1 }}
        transition={{ duration:0.6,ease:[0.25,0.46,0.45,0.94] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="relative rounded-3xl px-8 py-10 overflow-hidden"
          style={{ background: isMobile ? "rgba(var(--surface-rgb),0.96)" : "rgba(var(--surface-rgb),0.88)", backdropFilter: isMobile ? "none" : "blur(12px) saturate(180%)", border:"1px solid rgba(var(--accent-rgb),0.16)",boxShadow:"0 1px 0 rgba(var(--surface-rgb),0.95) inset,0 32px 80px -16px rgba(var(--accent-rgb),0.22)" }}>

          {/* Liseré violet en haut de la carte : la marque, pas un reflet blanc. */}
          <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
            style={{ background:"linear-gradient(90deg,transparent,rgba(var(--accent-rgb),0.55),transparent)" }} />

          {/* Success overlay (connexion) */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity:0,scale:0.85 }} animate={{ opacity:1,scale:1 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl gap-3"
                style={{ background:"rgba(var(--surface-rgb),0.97)",backdropFilter:"blur(10px)" }}>
                <motion.div initial={{ scale:0,rotate:-180 }} animate={{ scale:1,rotate:0 }} transition={{ type:"spring",bounce:0.5 }}>
                  <CheckCircle2 size={52} style={{ color:TEAL }} strokeWidth={1.5} />
                </motion.div>
                <p className="text-lg font-light" style={{ color:"var(--text-1)" }}>Bon retour !</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay OTP (inscription) */}
          <AnimatePresence>
            {signupSent && (
              <motion.div initial={{ opacity:0,scale:0.92 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:0.92 }}
                transition={{ duration:0.35,ease:[0.25,0.46,0.45,0.94] }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl gap-5 px-8 py-10"
                style={{ background:"rgba(var(--surface-rgb),0.97)",backdropFilter:"blur(10px)" }}>

                {/* Icône */}
                <motion.div initial={{ scale:0,rotate:-180 }} animate={{ scale:1,rotate:0 }}
                  transition={{ type:"spring",bounce:0.5,delay:0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background:ACTION_BG,boxShadow:"0 8px 28px rgba(139,92,246,0.35)" }}>
                  <Mail size={26} strokeWidth={1.6} color="#fff" />
                </motion.div>

                {/* Texte */}
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.15 }}
                  className="text-center">
                  <p className="text-lg font-light mb-1" style={{ color:"var(--text-1)" }}>Code de confirmation</p>
                  <p className="text-xs font-light leading-relaxed" style={{ color:"var(--text-2)" }}>
                    Un code à 6 chiffres a été envoyé à<br/>
                    <strong style={{ color:"var(--text-1)" }}>{email}</strong>
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
                      background:ACTION_BG,
                      color:"#fff",
                      opacity: otpCode.length < 6 || otpLoading ? 0.5 : 1,
                      boxShadow:"0 4px 24px rgba(139,92,246,0.42),inset 0 1px 0 rgba(255,255,255,0.28)",
                      transition:"opacity 0.2s",
                    }}>
                    <motion.div className="absolute inset-0 pointer-events-none"
                      style={{ background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%)" }}
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
                    style={{ color: resendCooldown > 0 ? "var(--text-3)" : "var(--accent)" }}>
                    {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer le code"}
                  </button>
                  <button onClick={() => { setSignupSent(false); setOtpCode(""); setOtpError(null); }}
                    className="text-xs cursor-pointer" style={{ color:"var(--text-3)" }}>
                    Annuler
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            {/* Posé, sans pulsation ni anneau qui grandit : le logo se regarde,
                il ne réclame pas l'attention. */}
            <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center mb-3"
              style={{ background:"rgb(var(--surface-rgb))", border:"1px solid rgba(var(--accent-rgb),0.22)", boxShadow:"0 10px 30px -8px rgba(139,92,246,0.35)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-vaiiya.png" alt="Vaiiya" className="w-20 h-20 object-contain relative z-10" />
            </div>
            <h1 className="text-xl font-extralight tracking-[0.2em]" style={{ color:"var(--text-1)" }}>Vaiiya</h1>
            <p className="text-[11px] font-light mt-0.5" style={{ color:"var(--text-3)" }}>Coach IA · Musculation · Nutrition</p>
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
            style={{ background:"rgba(var(--surface-rgb),0.8)",border:"1px solid rgba(var(--accent-rgb),0.18)",backdropFilter:"blur(10px)",color:"var(--text-1)",boxShadow:"0 2px 12px rgba(var(--accent-rgb),0.08),inset 0 1px 0 rgba(var(--surface-rgb),0.95)" }}>
            {googleLoading ? (
              <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor:"rgba(var(--accent-rgb),0.2)",borderTopColor:"var(--accent)" }}
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
            <div className="flex-1 h-px" style={{ background:"rgba(var(--accent-rgb),0.12)" }} />
            <span className="text-[11px]" style={{ color:"var(--text-3)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background:"rgba(var(--accent-rgb),0.12)" }} />
          </div>

          {/* Tabs */}
          {/* Onglet actif = violet, comme partout dans l'app. */}
          <div className="relative flex rounded-2xl p-1 mb-5 gap-1" style={{ background:"rgba(var(--tint-violet-rgb),0.5)",border:"1px solid rgba(var(--accent-rgb),0.12)" }}>
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className="relative flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer z-10"
                style={{ color:mode===m?"var(--accent)":"var(--text-3)" }}>
                {mode===m && <motion.div layoutId="auth-tab" className="absolute inset-0 rounded-xl"
                  style={{ background:"rgba(var(--surface-rgb),0.95)",border:"1px solid rgba(var(--accent-rgb),0.28)",boxShadow:"0 2px 12px rgba(var(--accent-rgb),0.18)" }}
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
                    {showPwd ? <EyeOff size={14} style={{ color:"var(--text-3)" }}/> : <Eye size={14} style={{ color:"var(--text-3)" }}/>}
                  </button>
                } />
              {mode === "signup" && <PasswordStrengthBar password={password} />}
            </div>

            <motion.button type="submit" disabled={loading||!canSubmit}
              whileHover={!loading?{scale:1.02,y:-2}:{}} whileTap={!loading?{scale:0.97}:{}}
              className="relative mt-1 w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
              style={{ background:ACTION_BG,color:"#fff",boxShadow:"0 4px 24px rgba(139,92,246,0.42),inset 0 1px 0 rgba(255,255,255,0.28)",opacity:!canSubmit?0.6:1 }}>
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%)" }}
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
                <div className="rounded-2xl p-4" style={{ background:"rgba(var(--tint-violet-rgb),0.5)",border:"1px solid rgba(var(--accent-rgb),0.15)" }}>
                  {forgotSent ? (
                    <motion.div initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }} className="flex flex-col items-center gap-2 py-1">
                      <CheckCircle2 size={28} style={{ color:"var(--accent)" }} strokeWidth={1.5}/>
                      <p className="text-xs text-center font-light" style={{ color:"var(--text-1)" }}>
                        Email envoyé à <strong>{forgotEmail}</strong>.<br/>
                        <span style={{ color:"var(--text-3)" }}>Vérifie ta boîte mail (et les spams).</span>
                      </p>
                      <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}
                        className="text-[11px] cursor-pointer hover:underline" style={{ color:"var(--accent)" }}>Fermer</button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgot} className="flex flex-col gap-3">
                      <p className="text-xs font-light" style={{ color:"var(--text-2)" }}>Entre ton email pour recevoir un lien de réinitialisation.</p>
                      <Field icon={<Mail size={15}/>} type="email" placeholder="ton@email.com" value={forgotEmail} onChange={setForgotEmail} required />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setForgotMode(false)}
                          className="flex-1 py-2.5 rounded-2xl text-xs font-medium cursor-pointer"
                          style={{ background:"rgba(var(--surface-rgb),0.6)",border:"1px solid rgba(var(--accent-rgb),0.18)",color:"var(--text-2)" }}>Annuler</button>
                        <motion.button type="submit" disabled={forgotLoading||!forgotEmail.trim()}
                          whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                          className="flex-1 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer flex items-center justify-center"
                          style={{ background:ACTION_BG,color:"#fff",opacity:!forgotEmail.trim()?0.6:1 }}>
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

          <p className="text-center text-[11px] mt-5 font-light" style={{ color:"var(--text-3)" }}>
            {mode==="login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button onClick={() => { setMode(mode==="login"?"signup":"login"); setError(null); }}
              className="font-medium cursor-pointer hover:underline" style={{ color:"var(--text-1)" }}>
              {mode==="login"?"Créer un compte":"Se connecter"}
            </button>
            {mode==="login" && <>{" · "}<button onClick={() => setForgotMode(v=>!v)}
              className="font-medium cursor-pointer hover:underline" style={{ color:"var(--accent)" }}>Mot de passe oublié ?</button></>}
          </p>

          <p className="text-center text-[10px] mt-4 font-light leading-relaxed" style={{ color:"var(--text-3)" }}>
            En continuant, tu acceptes nos{" "}
            <Link href="/mentions-legales" className="font-medium hover:underline" style={{ color:"var(--accent)" }}>Mentions légales</Link>
            {" "}et notre{" "}
            <Link href="/confidentialite" className="font-medium hover:underline" style={{ color:"var(--accent)" }}>Politique de confidentialité</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
