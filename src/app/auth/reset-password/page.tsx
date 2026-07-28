"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";

/* Système « D » : bouton d'action toujours violet vers magenta. */
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";
const TEAL = "#2BD4A0"; // réussite

/* Le fond de /auth : le dégradé du haut de la page de présentation, statique. */
const FOND_PRESENTATION = [
  "radial-gradient(700px 620px at 4% -10%, rgba(var(--accent-rgb),0.30) 0%, transparent 68%)",
  "radial-gradient(660px 600px at 98% 106%, rgba(var(--gold-rgb),0.26) 0%, transparent 68%)",
  "linear-gradient(to top, rgba(var(--gold-rgb),0.16) 0%, rgba(var(--gold-rgb),0.05) 38%, transparent 70%)",
].join(",");

function pwdStrength(p: string) {
  if (!p) return null;
  let s = 0;
  if (p.length >= 8)          s++;
  if (p.length >= 12)         s++;
  if (/[A-Z]/.test(p))       s++;
  if (/[0-9]/.test(p))       s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const levels = [
    { label: "Trop court",     color: "#E86A6A", bars: 1 },
    { label: "Faible",         color: "#E86A6A", bars: 1 },
    { label: "Passable",       color: "var(--gold)", bars: 2 },
    { label: "Sécurisé",       color: TEAL, bars: 3 },
    { label: "Très sécurisé",  color: TEAL, bars: 4 },
    { label: "Excellent",      color: TEAL, bars: 5 },
  ];
  return { score: s, ...levels[Math.min(s, 5)] };
}

function StrengthBar({ password }: { password: string }) {
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [showCfm, setShowCfm]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [status, setStatus]         = useState<"loading" | "ready" | "invalid">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type       = params.get("type");
    const code       = params.get("code");

    // Tokens parfois renvoyés dans le hash (#access_token=...&type=recovery)
    const hash       = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashAccess = hash.get("access_token");
    const hashRefresh = hash.get("refresh_token");
    const hashError  = hash.get("error") || params.get("error");

    const ready = () => setStatus("ready");
    const invalid = () => setStatus("invalid");

    if (hashError) {
      // Lien expiré / déjà utilisé → Supabase renvoie ?error=... ou #error=...
      invalid();
    } else if (code) {
      // Flux PKCE (par défaut avec createBrowserClient) : ?code=XXXX
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        error ? invalid() : ready();
      });
    } else if (token_hash && type === "recovery") {
      // Flux token_hash (templates email avec {{ .TokenHash }})
      supabase.auth.verifyOtp({ token_hash, type: "recovery" }).then(({ error }) => {
        error ? invalid() : ready();
      });
    } else if (hashAccess && hashRefresh) {
      // Flux implicite : tokens dans le hash
      supabase.auth.setSession({ access_token: hashAccess, refresh_token: hashRefresh }).then(({ error }) => {
        error ? invalid() : ready();
      });
    } else {
      // Session déjà établie (ex: onAuthStateChange a consommé le lien)
      supabase.auth.getSession().then(({ data }) => {
        data.session ? ready() : invalid();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setError(error.message); return; }
    setSuccess(true);
    setTimeout(() => router.push("/"), 2500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--page-bg)" }}>

      {/* Même fond que /auth : le dégradé du haut de la page de présentation, fixe. */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: FOND_PRESENTATION }} />

      <motion.div initial={{ opacity:0,y:36,scale:0.93 }} animate={{ opacity:1,y:0,scale:1 }}
        transition={{ duration:0.6,ease:[0.25,0.46,0.45,0.94] }}
        className="relative z-10 w-full max-w-md mx-4">

        <div className="relative rounded-3xl px-8 py-10"
          style={{ background:"rgba(var(--surface-rgb),0.88)",backdropFilter:"blur(12px) saturate(180%)",border:"1px solid rgba(var(--accent-rgb),0.16)",boxShadow:"0 1px 0 rgba(var(--surface-rgb),0.95) inset,0 32px 80px -16px rgba(var(--accent-rgb),0.22)" }}>

          <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
            style={{ background:"linear-gradient(90deg,transparent,rgba(var(--accent-rgb),0.55),transparent)" }} />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background:"rgb(var(--surface-rgb))", border:"1px solid rgba(var(--accent-rgb),0.22)", boxShadow:"0 10px 30px -8px rgba(139,92,246,0.35)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-vaiiya.png" alt="Vaiiya" className="w-11 h-11 object-contain relative z-10" />
            </div>
            <h1 className="text-xl font-extralight tracking-[0.2em]" style={{ color:"var(--text-1)" }}>Vaiiya</h1>
            <p className="text-[11px] font-light mt-0.5" style={{ color:"var(--text-3)" }}>Coach IA · Musculation · Nutrition</p>
          </div>

          {/* ── Loading ── */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <motion.div className="w-8 h-8 rounded-full border-2"
                style={{ borderColor:"rgba(var(--accent-rgb),0.2)",borderTopColor:"var(--accent)" }}
                animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
              <p className="text-sm font-light" style={{ color:"var(--text-2)" }}>Vérification du lien…</p>
            </div>
          )}

          {/* ── Lien invalide ── */}
          {status === "invalid" && (
            <motion.div initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }}
              className="flex flex-col items-center gap-5 py-4 text-center">
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:"spring",bounce:0.5 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:"rgba(252,129,129,0.1)" }}>
                <AlertCircle size={30} style={{ color:"#FC8181" }} strokeWidth={1.5} />
              </motion.div>
              <div>
                <p className="text-base font-medium mb-2" style={{ color:"var(--text-1)" }}>Lien invalide ou expiré</p>
                <p className="text-xs font-light leading-relaxed" style={{ color:"var(--text-2)" }}>
                  Ce lien a peut-être déjà été utilisé ou a expiré.<br/>
                  Demande un nouveau lien de réinitialisation.
                </p>
              </div>
              <motion.button whileHover={{ scale:1.02,y:-1 }} whileTap={{ scale:0.97 }}
                onClick={() => router.push("/auth")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                style={{ background:ACTION_BG,color:"#fff",boxShadow:"0 4px 20px rgba(139,92,246,0.42)" }}>
                <ArrowLeft size={14} strokeWidth={2} />
                Retour à la connexion
              </motion.button>
            </motion.div>
          )}

          {/* ── Formulaire ── */}
          {status === "ready" && !success && (
            <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}>
              <h2 className="text-lg font-light mb-1 text-center" style={{ color:"var(--text-1)" }}>Nouveau mot de passe</h2>
              <p className="text-xs font-light mb-6 text-center" style={{ color:"var(--text-3)" }}>Choisis un mot de passe fort et sécurisé</p>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity:0,y:-8,height:0 }} animate={{ opacity:1,y:0,height:"auto" }} exit={{ opacity:0,height:0 }}
                    className="mb-4 px-4 py-3 rounded-2xl text-xs font-medium overflow-hidden"
                    style={{ background:"rgba(252,129,129,0.12)",border:"1px solid rgba(252,129,129,0.25)",color:"#E53E3E" }}>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <motion.div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                    style={{ background:"rgba(var(--tint-violet-rgb),0.62)",border:"1px solid rgba(var(--accent-rgb),0.14)",boxShadow:"0 2px 8px rgba(var(--accent-rgb),0.04)" }}>
                    <Lock size={15} style={{ color:"var(--text-3)" }} />
                    <input type={showPwd?"text":"password"} placeholder="Nouveau mot de passe" value={password}
                      onChange={e => setPassword(e.target.value)} required autoFocus
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-3)]"
                      style={{ color:"var(--text-1)" }} />
                    <button type="button" onClick={() => setShowPwd(v=>!v)} className="cursor-pointer flex-shrink-0">
                      {showPwd ? <EyeOff size={14} style={{ color:"var(--text-3)" }}/> : <Eye size={14} style={{ color:"var(--text-3)" }}/>}
                    </button>
                  </motion.div>
                  <StrengthBar password={password} />
                </div>

                <motion.div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background:"rgba(var(--tint-violet-rgb),0.62)",border:"1px solid rgba(var(--accent-rgb),0.14)",boxShadow:"0 2px 8px rgba(var(--accent-rgb),0.04)" }}>
                  <Lock size={15} style={{ color:"var(--text-3)" }} />
                  <input type={showCfm?"text":"password"} placeholder="Confirmer le mot de passe" value={confirm}
                    onChange={e => setConfirm(e.target.value)} required
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-3)]"
                    style={{ color:"var(--text-1)" }} />
                  <button type="button" onClick={() => setShowCfm(v=>!v)} className="cursor-pointer flex-shrink-0">
                    {showCfm ? <EyeOff size={14} style={{ color:"var(--text-3)" }}/> : <Eye size={14} style={{ color:"var(--text-3)" }}/>}
                  </button>
                </motion.div>

                <motion.button type="submit" disabled={loading||!password||!confirm}
                  whileHover={!loading?{scale:1.02,y:-2}:{}} whileTap={!loading?{scale:0.97}:{}}
                  className="relative mt-1 w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
                  style={{ background:ACTION_BG,color:"#fff",boxShadow:"0 4px 24px rgba(139,92,246,0.42),inset 0 1px 0 rgba(255,255,255,0.28)",opacity:(!password||!confirm)?0.6:1 }}>
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%)" }}
                    animate={{ x:["-120%","120%"] }} transition={{ duration:2.5,repeat:Infinity,repeatDelay:1.2 }} />
                  {loading ? (
                    <motion.div className="w-4 h-4 rounded-full border-2 mx-auto relative z-10"
                      style={{ borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff" }}
                      animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
                  ) : (
                    <span className="relative z-10">Enregistrer le nouveau mot de passe</span>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── Succès ── */}
          {success && (
            <motion.div initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }}
              className="flex flex-col items-center gap-5 py-4 text-center">
              <motion.div initial={{ scale:0,rotate:-180 }} animate={{ scale:1,rotate:0 }}
                transition={{ type:"spring",bounce:0.5 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:`rgba(43,212,160,0.14)`,border:`1px solid ${TEAL}44` }}>
                <CheckCircle2 size={32} style={{ color:TEAL }} strokeWidth={1.5} />
              </motion.div>
              <div>
                <p className="text-lg font-light mb-1" style={{ color:"var(--text-1)" }}>Mot de passe mis à jour</p>
                <p className="text-xs font-light" style={{ color:"var(--text-2)" }}>Redirection vers l&rsquo;accueil…</p>
              </div>
              <motion.div className="w-40 h-0.5 rounded-full overflow-hidden" style={{ background:"rgba(var(--accent-rgb),0.15)" }}>
                <motion.div className="h-full rounded-full"
                  style={{ background:ACTION_BG }}
                  initial={{ width:"100%" }} animate={{ width:"0%" }}
                  transition={{ duration:2.5,ease:"linear" }} />
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
