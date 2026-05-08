"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";

function pwdStrength(p: string) {
  if (!p) return null;
  let s = 0;
  if (p.length >= 8)          s++;
  if (p.length >= 12)         s++;
  if (/[A-Z]/.test(p))       s++;
  if (/[0-9]/.test(p))       s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const levels = [
    { label: "Trop court",       color: "#FC8181", bars: 1 },
    { label: "Faible 😬",        color: "#FC8181", bars: 1 },
    { label: "Passable 👌",       color: "#F6AD55", bars: 2 },
    { label: "Sécurisé 🔒",      color: "#68D391", bars: 3 },
    { label: "Très sécurisé 💪", color: "#A78BFA", bars: 4 },
    { label: "Incroyable 🔥",    color: "#D4A843", bars: 5 },
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

    if (token_hash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash, type: "recovery" }).then(({ error }) => {
        setStatus(error ? "invalid" : "ready");
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        setStatus(data.session ? "ready" : "invalid");
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
      style={{ background: "linear-gradient(135deg,#faf8ff 0%,#fffef8 50%,#faf8ff 100%)" }}>

      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top:"-10%",left:"-5%",width:500,height:500,background:"rgba(212,192,255,0.45)",filter:"blur(80px)" }}
        animate={{ scale:[1,1.25,1],x:[-20,30,-20],y:[-15,20,-15] }}
        transition={{ duration:9,repeat:Infinity,ease:"easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom:"-10%",right:"-5%",width:450,height:450,background:"rgba(245,230,163,0.4)",filter:"blur(80px)" }}
        animate={{ scale:[1,1.2,1],x:[20,-25,20] }}
        transition={{ duration:8,repeat:Infinity,ease:"easeInOut",delay:1 }} />

      <motion.div initial={{ opacity:0,y:36,scale:0.93 }} animate={{ opacity:1,y:0,scale:1 }}
        transition={{ duration:0.6,ease:[0.25,0.46,0.45,0.94] }}
        className="relative z-10 w-full max-w-md mx-4">

        <div className="relative rounded-3xl px-8 py-10"
          style={{ background:"rgba(255,255,255,0.85)",backdropFilter:"blur(48px) saturate(200%)",border:"1px solid rgba(255,255,255,0.88)",boxShadow:"0 1px 0 rgba(255,255,255,0.95) inset,0 32px 80px -16px rgba(167,139,250,0.2),0 8px 32px -8px rgba(245,230,163,0.15)" }}>

          <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
            style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)" }} />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background:"linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" }}
              animate={{ boxShadow:["0 8px 28px rgba(167,139,250,0.4)","0 8px 36px rgba(212,168,67,0.45)","0 8px 28px rgba(167,139,250,0.4)"] }}
              transition={{ duration:3,repeat:Infinity }}>
              <motion.div className="absolute inset-0 rounded-2xl" style={{ border:"1px solid rgba(167,139,250,0.5)" }}
                animate={{ scale:[1,1.35,1],opacity:[0.6,0,0.6] }} transition={{ duration:2,repeat:Infinity }} />
              <span className="text-xl font-light relative z-10" style={{ color:"#2D3748" }}>A</span>
            </motion.div>
            <h1 className="text-xl font-extralight tracking-[0.2em]" style={{ color:"#2D3748" }}>Aura</h1>
            <p className="text-[11px] font-light mt-0.5" style={{ color:"#A0AEC0" }}>Coach IA · Musculation · Nutrition</p>
          </div>

          {/* ── Loading ── */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <motion.div className="w-8 h-8 rounded-full border-2"
                style={{ borderColor:"rgba(167,139,250,0.2)",borderTopColor:"#A78BFA" }}
                animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }} />
              <p className="text-sm font-light" style={{ color:"#718096" }}>Vérification du lien…</p>
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
                <p className="text-base font-medium mb-2" style={{ color:"#2D3748" }}>Lien invalide ou expiré</p>
                <p className="text-xs font-light leading-relaxed" style={{ color:"#718096" }}>
                  Ce lien a peut-être déjà été utilisé ou a expiré.<br/>
                  Demande un nouveau lien de réinitialisation.
                </p>
              </div>
              <motion.button whileHover={{ scale:1.02,y:-1 }} whileTap={{ scale:0.97 }}
                onClick={() => router.push("/auth")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                style={{ background:"linear-gradient(135deg,#A78BFA,#D4A843)",color:"#fff",boxShadow:"0 4px 20px rgba(167,139,250,0.4)" }}>
                <ArrowLeft size={14} strokeWidth={2} />
                Retour à la connexion
              </motion.button>
            </motion.div>
          )}

          {/* ── Formulaire ── */}
          {status === "ready" && !success && (
            <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}>
              <h2 className="text-lg font-light mb-1 text-center" style={{ color:"#2D3748" }}>Nouveau mot de passe</h2>
              <p className="text-xs font-light mb-6 text-center" style={{ color:"#A0AEC0" }}>Choisis un mot de passe fort et sécurisé</p>

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
                    style={{ background:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.8)",backdropFilter:"blur(20px)",boxShadow:"0 4px 16px rgba(167,139,250,0.06)" }}>
                    <Lock size={15} style={{ color:"#A0AEC0" }} />
                    <input type={showPwd?"text":"password"} placeholder="Nouveau mot de passe" value={password}
                      onChange={e => setPassword(e.target.value)} required autoFocus
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
                      style={{ color:"#2D3748" }} />
                    <button type="button" onClick={() => setShowPwd(v=>!v)} className="cursor-pointer flex-shrink-0">
                      {showPwd ? <EyeOff size={14} style={{ color:"#A0AEC0" }}/> : <Eye size={14} style={{ color:"#A0AEC0" }}/>}
                    </button>
                  </motion.div>
                  <StrengthBar password={password} />
                </div>

                <motion.div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.8)",backdropFilter:"blur(20px)",boxShadow:"0 4px 16px rgba(167,139,250,0.06)" }}>
                  <Lock size={15} style={{ color:"#A0AEC0" }} />
                  <input type={showCfm?"text":"password"} placeholder="Confirmer le mot de passe" value={confirm}
                    onChange={e => setConfirm(e.target.value)} required
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
                    style={{ color:"#2D3748" }} />
                  <button type="button" onClick={() => setShowCfm(v=>!v)} className="cursor-pointer flex-shrink-0">
                    {showCfm ? <EyeOff size={14} style={{ color:"#A0AEC0" }}/> : <Eye size={14} style={{ color:"#A0AEC0" }}/>}
                  </button>
                </motion.div>

                <motion.button type="submit" disabled={loading||!password||!confirm}
                  whileHover={!loading?{scale:1.02,y:-2}:{}} whileTap={!loading?{scale:0.97}:{}}
                  className="relative mt-1 w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
                  style={{ background:"linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)",color:"#fff",boxShadow:"0 4px 24px rgba(167,139,250,0.38),inset 0 1px 0 rgba(255,255,255,0.25)",opacity:(!password||!confirm)?0.6:1 }}>
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.28) 50%,transparent 60%)" }}
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
                style={{ background:"linear-gradient(135deg,rgba(212,192,255,0.6),rgba(245,230,163,0.6))" }}>
                <CheckCircle2 size={32} style={{ color:"#A78BFA" }} strokeWidth={1.5} />
              </motion.div>
              <div>
                <p className="text-lg font-light mb-1" style={{ color:"#2D3748" }}>Mot de passe mis à jour ! 🎉</p>
                <p className="text-xs font-light" style={{ color:"#718096" }}>Redirection vers l'accueil…</p>
              </div>
              <motion.div className="w-40 h-0.5 rounded-full overflow-hidden" style={{ background:"rgba(167,139,250,0.15)" }}>
                <motion.div className="h-full rounded-full"
                  style={{ background:"linear-gradient(90deg,#A78BFA,#D4A843)" }}
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
