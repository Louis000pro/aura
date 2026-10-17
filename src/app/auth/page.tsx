"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff,
  User, Mail, Lock, CheckCircle2, AtSign, UserCheck, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { destinationDepuisUrl } from "@/lib/destinationInterne";
import s from "./auth.module.css";
import { compteConnu } from "@/lib/comptesConnus";

/* Système « D » : le bouton d'action principal est TOUJOURS violet vers magenta,
   jamais violet vers or. Même couleur que le CTA de la page de présentation. */
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";
const TEAL = "#2BD4A0"; // réussite
/* L'entrée est toujours claire, comme la vitrine (Louis, 2026-10-12) : ses
   encres sont écrites en dur et ne suivent pas le mode sombre. */
const ENCRE = "#1C1626";
const ENCRE_2 = "#5C5468";
const ENCRE_3 = "#7B7389";
const LIEN = "#5B3FC4";
/* Les champs en verre (Louis, 2026-10-12) : pas de liseré coloré, une
   surface claire et translucide avec un reflet en haut. */
const VERRE = {
  background: "rgba(255,255,255,0.58)",
  border: "1px solid rgba(255,255,255,0.95)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 6px 18px -14px rgba(90,40,140,0.4)",
  backdropFilter: "blur(14px) saturate(160%)",
  WebkitBackdropFilter: "blur(14px) saturate(160%)",
} as const;

/* ── Champ input ── */
function Field({
  icon, type, placeholder, value, onChange, required, suffix, autoFocus, name, autoComplete,
}: {
  icon: React.ReactNode; type: string; placeholder: string; value: string;
  onChange: (v: string) => void; required?: boolean; suffix?: React.ReactNode; autoFocus?: boolean;
  /* `name` + `autoComplete` : ce sont eux que le trousseau de l’iPhone,
     Chrome et les gestionnaires de mots de passe lisent pour proposer
     d’enregistrer puis de remplir les identifiants. */
  name?: string; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    /* Contour et icône passent par du CSS pur : framer-motion ne sait interpoler
       ni le raccourci « border » ni une couleur écrite en variable, il les
       ignorait en silence et les champs n'avaient aucun contour. */
    <div className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{
        ...VERRE,
        background: focused ? "rgba(255,255,255,0.86)" : VERRE.background,
        boxShadow: focused
          ? "inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 4px rgba(255,255,255,0.55), 0 10px 24px -14px rgba(90,40,140,0.45)"
          : VERRE.boxShadow,
        transition: "background 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <span style={{ color: focused ? "#8B5CF6" : ENCRE_3, transition: "color 0.15s ease" }}>
        {icon}
      </span>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        name={name} autoComplete={autoComplete}
        autoCapitalize={type === "password" || name === "username" || name === "email" ? "none" : undefined}
        autoCorrect={name === "username" || name === "email" ? "off" : undefined}
        spellCheck={name === "username" || name === "email" ? false : undefined}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        required={required} autoFocus={autoFocus}
        className="flex-1 min-w-0 bg-transparent text-[16px] outline-none placeholder:text-[#7B7389]"
        style={{ color: ENCRE }} />
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
    { label: "Passable",        color: "#D9900A", bars: 2 },
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
            style={{ background: i <= s.bars ? s.color : "rgba(28,22,38,0.1)", transition: "background 0.3s ease" }} />
        ))}
      </div>
      <p className="text-[11px] font-semibold" style={{ color: s.color, transition: "color 0.3s ease" }}>
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
            className="w-11 h-14 text-center text-[20px] font-bold rounded-2xl outline-none"
            style={{
              background: "#fff",
              border: digit ? "1.5px solid rgba(139,92,246,0.55)" : "1.5px solid rgba(28,22,38,0.12)",
              color: ENCRE,
              boxShadow: digit ? "0 4px 16px rgba(139,92,246,0.18)" : "none",
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
const destinationApres = () => destinationDepuisUrl("/");

/* Connexion en deux temps : on ne passe au mot de passe que sur un email
   qui a la forme d'un email. Vérif volontairement souple (le vrai contrôle,
   c'est Supabase) : elle sert juste à activer « Continuer ». */
const emailValide = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/* L'étape 1 de connexion accepte un email OU un pseudo. Avec « @ » on exige
   la forme email ; sinon c'est un pseudo, qu'on valide juste assez pour
   activer « Continuer » (le vrai contrôle est côté serveur). */
const identifiantValide = (v: string) => {
  const t = v.trim();
  return t.includes("@") ? emailValide(t) : t.length >= 2 && !/\s/.test(t);
};

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signInIdentifiant, signInWithGoogle, resetPassword, user, isLoading } = useAuth();

  // Redirige vers le dashboard si déjà connecté
  useEffect(() => {
    if (!isLoading && user) router.replace(destinationApres());
  }, [user, isLoading, router]);

  const [mode, setMode]             = useState<"login"|"signup">("login");
  /* Connexion : 1 = on demande l'identifiant (email ou pseudo), 2 = le mot
     de passe. `parPseudo` mémorise si l'étape 1 a résolu un pseudo : l'étape
     2 passe alors par la route serveur au lieu du signIn email direct. */
  const [etapeConnexion, setEtapeConnexion] = useState<1|2>(1);
  const [parPseudo, setParPseudo] = useState(false);
  const [pseudo, setPseudo]         = useState("");
  const [name, setName]             = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  /* La session est ouverte et la navigation part : on ne remontre plus le
     formulaire. Sans ça, l'écran « Te revoilà » clignotait entre la
     création du mot de passe et l'arrivée dans l'app. */
  const [entree, setEntree] = useState(false);
  const [error, setError]           = useState<string|null>(null);

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
  }, []);

  const canSubmit = mode === "signup"
    ? !!(pseudo && name && lastName && email && password)
    : etapeConnexion === 1
      ? identifiantValide(email)
      : !!(email && password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    // Connexion en deux temps : l'étape 1 vérifie VRAIMENT que le compte
    // existe avant d'ouvrir le mot de passe. On ne montre jamais « c'est bon »
    // sur un compte inexistant. L'identifiant peut être un email OU un pseudo.
    if (mode === "login" && etapeConnexion === 1) {
      setLoading(true);
      setError(null);
      const identifiant = email.trim();
      const estEmail = emailValide(identifiant);
      try {
        if (estEmail) {
          const res = await fetch("/api/auth/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: identifiant }),
          });
          const json = await res.json();
          if (res.status === 429) { setError(json.error ?? "Trop de tentatives. Réessaie dans un moment."); setLoading(false); return; }
          if (!res.ok) { setError("Impossible de vérifier ce compte. Réessaie."); setLoading(false); return; }
          if (!json.inscrite) { setError("Email invalide, ou pas encore de compte à cette adresse."); setLoading(false); return; }
          setParPseudo(false);
        } else {
          // Pseudo : la route résout en base et répond seulement { existe }.
          const res = await fetch("/api/auth/login-pseudo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifiant }),
          });
          const json = await res.json();
          if (res.status === 429) { setError(json.error ?? "Trop de tentatives. Réessaie dans un moment."); setLoading(false); return; }
          if (!res.ok) { setError("Impossible de vérifier ce compte. Réessaie."); setLoading(false); return; }
          if (!json.existe) { setError("Aucun compte à ce pseudo. Vérifie l’orthographe."); setLoading(false); return; }
          setParPseudo(true);
        }
      } catch {
        setError("Impossible de vérifier ce compte. Réessaie.");
        setLoading(false);
        return;
      }
      setLoading(false);
      setEtapeConnexion(2);
      return;
    }

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
        setError(json.error ?? "Erreur lors de l’envoi du code.");
        setLoading(false);
        return;
      }
      setOtpToken(json.token);
      setLoading(false);
      setSignupSent(true);
      return;
    } else {
      const err = parPseudo
        ? await signInIdentifiant({ identifiant: email.trim(), password })
        : await signIn({ email, password });
      if (err) { setError(err.message === "Invalid login credentials" ? "Identifiant ou mot de passe incorrect." : err.message); setLoading(false); return; }
    }

    // Pas d'écran « Bon retour » (Louis, 2026-09-25) : on entre directement.
    // Le bouton reste en chargement le temps de la navigation.
    router.push(destinationApres());
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

    // Étape 2 : le serveur vérifie le code ET crée le compte. La page ne
    // crée plus rien elle-même : sans le bon code, aucun compte n'existe.
    const verifyRes = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: otpToken, otp: otpCode, pseudo, name, lastName, password }),
    });
    const verifyJson = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || verifyJson.error) {
      setOtpError(verifyJson.error ?? "Code incorrect ou expiré.");
      setOtpCode("");
      setOtpLoading(false);
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

    // ⚠️ On garde l'écran du code affiché : le refermer ici remontrait le
    // formulaire de connexion le temps que la navigation se fasse.
    setEntree(true);
    router.push(destinationApres());
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
    if (!res.ok || json.error) { setOtpError(json.error ?? "Erreur d’envoi."); return; }
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

  /* Le titre suit l'étape : c'est lui qui dit où l'on en est. */
  const titre = mode === "signup"
    ? <>Deviens la personne <span className={s.grad}>qui y va.</span></>
    : etapeConnexion === 2
      ? <>Plus qu’une <span className={s.grad}>étape.</span></>
      : <>Te <span className={s.grad}>revoilà.</span></>;
  const sousTitre = mode === "signup"
    ? "Gratuit, sans carte bancaire."
    : etapeConnexion === 2
      ? null
      : "Ta série t’attend là où tu l’as laissée.";

  /* Déjà connecté sur cet appareil ? Sa photo au lieu d'une initiale. */
  const connu = mode === "login" && etapeConnexion === 2 ? compteConnu(email) : null;

  const changerMode = (m: "login" | "signup") => {
    setMode(m); setError(null); setEtapeConnexion(1); setForgotMode(false);
  };

  // Déjà connecté (ou en train d'entrer) : la redirection est en route, on
  // ne repeint pas un formulaire qui va disparaître dans la seconde.
  if (entree || (!isLoading && user)) return <div className={s.page} aria-busy="true" />;

  return (
    <div className={s.page}>

      {/* ── Ordinateur : la phrase et les signes du chemin ── */}
      <div className={s.cote}>
        <h1 className={s.coteTitre}>{titre}</h1>
        <p className={s.coteSous}>
          {mode === "signup"
            ? "Tes séances, tes repas et un assistant qui te connaît, réunis dans une seule appli. Gratuit, sans carte bancaire."
            : "Ta série, ton rang et ta séance du jour t’attendent là où tu les as laissés."}
        </p>
      </div>

      <div className={s.zone}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={s.carte}>

          {/* Overlay OTP (inscription) */}
          <AnimatePresence>
            {signupSent && (
              <motion.div initial={{ opacity:0,scale:0.96 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:0.96 }}
                transition={{ duration:0.3,ease:[0.25,0.46,0.45,0.94] }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6 py-8"
                style={{ background:"rgba(255,255,255,0.97)" }}>

                <motion.div initial={{ scale:0,rotate:-180 }} animate={{ scale:1,rotate:0 }}
                  transition={{ type:"spring",bounce:0.5,delay:0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background:ACTION_BG,boxShadow:"0 8px 28px rgba(139,92,246,0.35)" }}>
                  <Mail size={26} strokeWidth={1.6} color="#fff" />
                </motion.div>

                <div className="text-center">
                  <p className="text-[20px] font-bold mb-1" style={{ color:ENCRE }}>Code de confirmation</p>
                  <p className="text-[13px] leading-relaxed" style={{ color:ENCRE_2 }}>
                    Un code à 6 chiffres a été envoyé à<br/>
                    <strong style={{ color:ENCRE }}>{email}</strong>
                  </p>
                </div>

                <div className="w-full">
                  <OtpInput value={otpCode} onChange={v => { setOtpCode(v); setOtpError(null); }} />
                </div>

                <AnimatePresence>
                  {otpError && (
                    <motion.p initial={{ opacity:0,y:-4,height:0 }} animate={{ opacity:1,y:0,height:"auto" }} exit={{ opacity:0,height:0 }}
                      className="text-[13px] font-medium text-center -mt-2" style={{ color:"#C53030" }}>
                      {otpError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  disabled={otpCode.length < 6 || otpLoading}
                  whileTap={otpCode.length === 6 && !otpLoading ? { scale:0.97 } : {}}
                  onClick={handleVerifyOtp}
                  className="w-full py-4 rounded-2xl text-[16px] font-semibold cursor-pointer"
                  style={{ background:ACTION_BG, color:"#fff", opacity: otpCode.length < 6 || otpLoading ? 0.5 : 1, boxShadow:"0 12px 24px -12px rgba(139,92,246,0.9)", transition:"opacity 0.2s" }}>
                  {otpLoading ? (
                    <motion.div className="w-4 h-4 rounded-full border-2 mx-auto"
                      style={{ borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff" }}
                      animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 size={15} strokeWidth={2}/>
                      Vérifier le code
                    </span>
                  )}
                </motion.button>

                <div className="flex flex-col items-center gap-1.5">
                  <button onClick={handleResendOtp} disabled={resendCooldown > 0}
                    className="text-[13px] font-semibold cursor-pointer"
                    style={{ color: resendCooldown > 0 ? ENCRE_3 : LIEN }}>
                    {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer le code"}
                  </button>
                  <button onClick={() => { setSignupSent(false); setOtpCode(""); setOtpError(null); }}
                    className="text-[13px] cursor-pointer" style={{ color:ENCRE_3 }}>
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sur téléphone, le titre vit dans la carte ; sur ordinateur, à gauche. */}
          <div className={s.titreMobile}>
            <h1 className={s.titre}>{titre}</h1>
            {sousTitre && <p className={s.sous} style={{ marginTop: 8 }}>{sousTitre}</p>}
          </div>

          {/* Erreur globale */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity:0,y:-8,height:0 }} animate={{ opacity:1,y:0,height:"auto" }} exit={{ opacity:0,height:0 }}
                className="px-4 py-3 rounded-2xl text-[13px] font-medium"
                style={{ background:"rgba(252,129,129,0.12)",border:"1px solid rgba(252,129,129,0.3)",color:"#C53030" }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* À l'étape 2, l'identifiant validé se rappelle en haut, avec la
             porte pour le corriger. */}
          {mode === "login" && etapeConnexion === 2 ? (
            <div className="flex items-center gap-3 rounded-2xl py-2 pl-2 pr-3.5" style={VERRE}>
              <PhotoConnue avatar={connu?.avatar} lettre={((connu?.pseudo ?? email.trim())[0] ?? "?").toUpperCase()} />
              <span className="min-w-0 flex flex-col">
                {connu?.pseudo && <span className="text-[16px] font-bold truncate" style={{ color:ENCRE }}>{connu.pseudo}</span>}
                <span className={`truncate ${connu?.pseudo ? "text-[13px]" : "text-[16px] font-semibold"}`} style={{ color: connu?.pseudo ? ENCRE_3 : ENCRE }}>{email.trim()}</span>
              </span>
              <button type="button"
                onClick={() => { setEtapeConnexion(1); setPassword(""); setError(null); setForgotMode(false); }}
                className="ml-auto text-[13px] font-bold cursor-pointer flex-shrink-0" style={{ color:LIEN }}>
                Changer
              </button>
            </div>
          ) : (
            <>
              {/* ── Google ── */}
              <motion.button type="button"
                whileTap={{ scale:0.97 }}
                onClick={handleGoogle} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[16px] font-semibold cursor-pointer"
                style={{ ...VERRE, color:ENCRE }}>
                {googleLoading ? (
                  <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor:"rgba(139,92,246,0.2)",borderTopColor:"#8B5CF6" }}
                    animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {mode === "signup" ? "S’inscrire avec Google" : "Continuer avec Google"}
              </motion.button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background:"rgba(28,22,38,0.1)" }} />
                <span className="text-[11px]" style={{ color:ENCRE_3 }}>ou</span>
                <div className="flex-1 h-px" style={{ background:"rgba(28,22,38,0.1)" }} />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            {mode === "signup" && (
              <>
                <Field icon={<AtSign size={15}/>} type="text" placeholder="Pseudo (ex : atlas92)" value={pseudo} onChange={setPseudo} required autoFocus name="pseudo" autoComplete="nickname" />
                <div className="grid grid-cols-2 gap-2.5">
                  <Field icon={<User size={15}/>} type="text" placeholder="Prénom" value={name} onChange={setName} required name="given-name" autoComplete="given-name" />
                  <Field icon={<UserCheck size={15}/>} type="text" placeholder="Nom" value={lastName} onChange={setLastName} required name="family-name" autoComplete="family-name" />
                </div>
              </>
            )}

            {/* À l'étape 2, l'email est validé et disparaît : on ne montre plus
               que le mot de passe. On revient en arrière par « Changer ». */}
            {!(mode === "login" && etapeConnexion === 2) && (
              <Field
                icon={<Mail size={15}/>}
                type={mode === "login" ? "text" : "email"}
                placeholder={mode === "login" ? "Ton email ou ton pseudo" : "Ton email"}
                value={email}
                onChange={setEmail}
                required
                autoFocus={mode==="login"}
                name={mode === "login" ? "username" : "email"}
                autoComplete={mode === "login" ? "username" : "email"}
              />
            )}
            {/* À l’étape 2, le champ email a disparu de l’écran : sans lui, le
               gestionnaire de mots de passe ne sait pas À QUEL compte rattacher
               le mot de passe, et ne propose pas de l’enregistrer. On le garde
               donc dans le formulaire, invisible et non modifiable. */}
            {mode === "login" && etapeConnexion === 2 && (
              <input type="text" name="username" autoComplete="username" value={email} readOnly
                tabIndex={-1} aria-hidden="true"
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
            )}

            {(mode === "signup" || etapeConnexion === 2) && (
              <div className="flex flex-col gap-2">
                <Field icon={<Lock size={15}/>}
                  type={showPwd?"text":"password"} placeholder="Mot de passe" value={password} onChange={setPassword} required
                  name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  autoFocus={mode==="login" && etapeConnexion===2}
                  suffix={
                    <button type="button" onClick={() => setShowPwd(v=>!v)} className="cursor-pointer flex-shrink-0"
                      aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {showPwd ? <EyeOff size={15} style={{ color:ENCRE_3 }}/> : <Eye size={15} style={{ color:ENCRE_3 }}/>}
                    </button>
                  } />
                {mode === "signup" && <PasswordStrengthBar password={password} />}
              </div>
            )}

            <motion.button type="submit" disabled={loading||!canSubmit}
              whileTap={!loading?{scale:0.97}:{}}
              className="mt-1 w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[16px] font-bold cursor-pointer"
              style={{ background:ACTION_BG,color:"#fff",boxShadow:"0 14px 26px -12px rgba(139,92,246,0.9)",opacity:!canSubmit?0.6:1,transition:"opacity 0.2s" }}>
              {loading ? (
                <>
                  <motion.span className="w-4 h-4 rounded-full border-2" style={{ borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff" }}
                    animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
                  <span>{mode==="signup" ? "Création…" : etapeConnexion===1 ? "Vérification…" : "Connexion…"}</span>
                </>
              ) : (
                <>
                  <span>{mode==="signup" ? "Créer mon compte" : etapeConnexion===1 ? "Continuer" : "Se connecter"}</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </motion.button>

            {mode === "login" && etapeConnexion === 2 && (
              <button type="button" onClick={() => setForgotMode(v=>!v)}
                className="text-[13px] font-semibold cursor-pointer mx-auto py-1" style={{ color:LIEN }}>
                Mot de passe oublié ?
              </button>
            )}
          </form>

          {/* ── Mot de passe oublié ── */}
          <AnimatePresence>
            {forgotMode && (
              <motion.div key="forgot"
                initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }}
                transition={{ duration:0.3 }} style={{ overflow:"hidden" }}>
                <div className="rounded-2xl p-4" style={{ background:"rgba(241,235,255,0.7)",border:"1px solid rgba(139,92,246,0.15)" }}>
                  {forgotSent ? (
                    <motion.div initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }} className="flex flex-col items-center gap-2 py-1">
                      <CheckCircle2 size={28} style={{ color:"#0B8A68" }} strokeWidth={1.5}/>
                      <p className="text-[13px] text-center" style={{ color:ENCRE }}>
                        Email envoyé à <strong>{forgotEmail}</strong>.<br/>
                        <span style={{ color:ENCRE_3 }}>Vérifie ta boîte mail (et les spams).</span>
                      </p>
                      <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}
                        className="text-[13px] font-semibold cursor-pointer" style={{ color:LIEN }}>Fermer</button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgot} className="flex flex-col gap-3">
                      <p className="text-[13px]" style={{ color:ENCRE_2 }}>Entre ton email pour recevoir un lien de réinitialisation.</p>
                      <Field icon={<Mail size={15}/>} type="email" placeholder="ton@email.com" value={forgotEmail} onChange={setForgotEmail} required name="email" autoComplete="email" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setForgotMode(false)}
                          className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                          style={{ background:"#fff",border:"1px solid rgba(28,22,38,0.1)",color:ENCRE_2 }}>Annuler</button>
                        <motion.button type="submit" disabled={forgotLoading||!forgotEmail.trim()}
                          whileTap={{ scale:0.97 }}
                          className="flex-1 py-2.5 rounded-2xl text-[13px] font-bold cursor-pointer flex items-center justify-center"
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

          {/* Passer de la connexion à l'inscription : une ligne, plus d'onglets. */}
          {!(mode === "login" && etapeConnexion === 2) && (
            <p className="text-center text-[13px] font-semibold" style={{ color:ENCRE_2 }}>
              {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <button type="button" onClick={() => changerMode(mode === "login" ? "signup" : "login")}
                className="font-extrabold cursor-pointer underline underline-offset-4 decoration-2"
                style={{ color:ENCRE, textDecorationColor:"rgba(28,22,38,0.25)" }}>
                {mode === "login" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          )}

          <p className="text-center text-[11px] leading-relaxed" style={{ color:ENCRE_3 }}>
            En continuant, tu acceptes nos{" "}
            <Link href="/conditions" className="font-semibold hover:underline" style={{ color:LIEN }}>Conditions générales</Link>
            {", "}nos{" "}
            <Link href="/mentions-legales" className="font-semibold hover:underline" style={{ color:LIEN }}>Mentions légales</Link>
            {" "}et notre{" "}
            <Link href="/confidentialite" className="font-semibold hover:underline" style={{ color:LIEN }}>Politique de confidentialité</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* La photo du compte reconnu, ou son initiale sur un fond sombre neutre
   (Louis, 2026-10-12 : le dégradé derrière la lettre « fait trop IA »).
   Une photo qui ne se charge pas (lien périmé) retombe sur l'initiale au
   lieu de laisser une image cassée. */
function PhotoConnue({ avatar, lettre }: { avatar?: string; lettre: string }) {
  const [rate, setRate] = useState<string | null>(null);
  if (avatar && rate !== avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt="" onError={() => setRate(avatar)} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <span className="w-10 h-10 rounded-full grid place-items-center text-[16px] font-bold text-white flex-shrink-0"
      style={{ background:"#2A2730" }}>
      {lettre}
    </span>
  );
}
