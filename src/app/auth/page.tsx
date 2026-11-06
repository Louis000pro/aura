"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { destinationDepuisUrl } from "@/lib/destinationInterne";
import s from "./auth.module.css";
import { compteConnu } from "@/lib/comptesConnus";

/* Système « D » : le bouton d'action principal est TOUJOURS violet vers magenta,
   jamais violet vers or. Même couleur que le CTA de la page de présentation. */
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";
/* L'entrée est toujours claire, comme la vitrine (Louis, 2026-10-12) : ses
   encres sont écrites en dur et ne suivent pas le mode sombre. */
const ENCRE = "#1C1626";
const ENCRE_2 = "#5C5468";
const ENCRE_3 = "#7B7389";
const LIEN = "#5B3FC4";
/** Le dessous de la page : voir la note de globals.css (« le dessous des pages »). */
const DESSOUS = "html:root{--html-bg:#FFF6FB;overscroll-behavior:none;color-scheme:light}body::before{display:none}";
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
        className={`flex-1 min-w-0 text-[16px] outline-none ${s.champ}`}
        style={{ color: ENCRE }} />
      {suffix}
    </div>
  );
}

/* Destination après connexion : ?next=/chemin (invitation à un relais…).
   On n'accepte qu'un chemin interne, jamais une URL absolue, sinon
   n'importe qui peut fabriquer un lien de login qui renvoie ailleurs.
   Lu sur window plutôt qu'avec useSearchParams : pas de Suspense à poser. */
const destinationApres = () => destinationDepuisUrl("/");

/* Créer un compte passe par les premiers pas : les questions viennent avant le
   compte (Louis, 2026-11-05). La destination voulue suit. */
const versPremiersPas = () => {
  const suite = destinationDepuisUrl("");
  return suite ? `/premiers-pas?next=${encodeURIComponent(suite)}` : "/premiers-pas";
};

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

  /* Connexion : 1 = on demande l'identifiant (email ou pseudo), 2 = le mot
     de passe. `parPseudo` mémorise si l'étape 1 a résolu un pseudo : l'étape
     2 passe alors par la route serveur au lieu du signIn email direct. */
  const [etapeConnexion, setEtapeConnexion] = useState<1|2>(1);
  const [parPseudo, setParPseudo] = useState(false);
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]           = useState<string|null>(null);

  /* Forgot password */
  const [forgotMode, setForgotMode]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState("");
  const [forgotSent, setForgotSent]     = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    /* Les anciens liens `?mode=signup` mènent aux premiers pas. */
    if (new URLSearchParams(window.location.search).get("mode") === "signup") router.replace(versPremiersPas());
  }, [router]);

  const canSubmit = etapeConnexion === 1 ? identifiantValide(email) : !!(email && password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    // Connexion en deux temps : l'étape 1 vérifie VRAIMENT que le compte
    // existe avant d'ouvrir le mot de passe. On ne montre jamais « c'est bon »
    // sur un compte inexistant. L'identifiant peut être un email OU un pseudo.
    if (etapeConnexion === 1) {
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

    const err = parPseudo
      ? await signInIdentifiant({ identifiant: email.trim(), password })
      : await signIn({ email, password });
    if (err) { setError(err.message === "Invalid login credentials" ? "Identifiant ou mot de passe incorrect." : err.message); setLoading(false); return; }

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
  const titre = etapeConnexion === 2
    ? <>Plus qu’une <span className={s.grad}>étape.</span></>
    : <>Te <span className={s.grad}>revoilà.</span></>;

  /* Déjà connecté sur cet appareil ? Sa photo au lieu d'une initiale. */
  const connu = etapeConnexion === 2 ? compteConnu(email) : null;

  // Déjà connecté : la redirection est en route, on ne repeint pas un
  // formulaire qui va disparaître dans la seconde.
  if (!isLoading && user) return <div className={s.page} aria-busy="true"><style>{DESSOUS}</style></div>;

  return (
    <div className={s.page}>
      <style>{DESSOUS}</style>

      {/* ── Ordinateur : la phrase et les signes du chemin ── */}
      <div className={s.cote}>
        <h1 className={s.coteTitre}>{titre}</h1>
        <p className={s.coteSous}>Ta série, ton rang et ta séance du jour t’attendent là où tu les as laissés.</p>
      </div>

      <div className={s.zone}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={s.carte}>

          {/* Sur téléphone, le titre vit dans la carte ; sur ordinateur, à gauche. */}
          <div className={s.titreMobile}>
            <h1 className={s.titre}>{titre}</h1>
            {etapeConnexion === 1 && <p className={s.sous} style={{ marginTop: 8 }}>Ta série t’attend là où tu l’as laissée.</p>}
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
          {etapeConnexion === 2 ? (
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
                Continuer avec Google
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
            {/* À l'étape 2, l'email est validé et disparaît : on ne montre plus
               que le mot de passe. On revient en arrière par « Changer ». */}
            {etapeConnexion === 1 && (
              <Field
                icon={<Mail size={15}/>}
                type="text"
                placeholder="Ton email ou ton pseudo"
                value={email}
                onChange={setEmail}
                required
                autoFocus
                name="username"
                autoComplete="username"
              />
            )}
            {/* À l’étape 2, le champ email a disparu de l’écran : sans lui, le
               gestionnaire de mots de passe ne sait pas À QUEL compte rattacher
               le mot de passe, et ne propose pas de l’enregistrer. On le garde
               donc dans le formulaire, invisible et non modifiable. */}
            {etapeConnexion === 2 && (
              <input type="text" name="username" autoComplete="username" value={email} readOnly
                tabIndex={-1} aria-hidden="true"
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
            )}

            {etapeConnexion === 2 && (
              <div className="flex flex-col gap-2">
                <Field icon={<Lock size={15}/>}
                  type={showPwd?"text":"password"} placeholder="Mot de passe" value={password} onChange={setPassword} required
                  name="password" autoComplete="current-password"
                  autoFocus
                  suffix={
                    <button type="button" onClick={() => setShowPwd(v=>!v)} className="cursor-pointer flex-shrink-0"
                      aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {showPwd ? <EyeOff size={15} style={{ color:ENCRE_3 }}/> : <Eye size={15} style={{ color:ENCRE_3 }}/>}
                    </button>
                  } />
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
                  <span>{etapeConnexion===1 ? "Vérification…" : "Connexion…"}</span>
                </>
              ) : (
                <>
                  <span>{etapeConnexion===1 ? "Continuer" : "Se connecter"}</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </motion.button>

            {etapeConnexion === 2 && (
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

          {/* Créer un compte passe par les premiers pas. */}
          {etapeConnexion === 1 && (
            <p className="text-center text-[13px] font-semibold" style={{ color:ENCRE_2 }}>
              Pas encore de compte ?{" "}
              <button type="button" onClick={() => router.push(versPremiersPas())}
                className="font-extrabold cursor-pointer underline underline-offset-4 decoration-2"
                style={{ color:ENCRE, textDecorationColor:"rgba(28,22,38,0.25)" }}>
                Créer un compte
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
