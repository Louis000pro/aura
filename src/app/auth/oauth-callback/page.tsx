"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AtSign, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function pseudoKey(email: string) {
  return `aura_oauth_pseudo_${email}`;
}

export default function OAuthCallbackPage() {
  const { data: session, status } = useSession();
  const { login } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<"loading" | "pseudo" | "done">("loading");
  const [pseudo, setPseudo] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ref de garde : empêche de lancer login() plusieurs fois
  const didLogin = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (didLogin.current) return;

    if (status === "unauthenticated" || !session?.user) {
      router.push("/auth");
      return;
    }

    const email = session.user.email ?? "";
    const saved = localStorage.getItem(pseudoKey(email));

    if (saved) {
      didLogin.current = true;
      const parts = (session.user.name ?? "").split(" ");
      login(
        { pseudo: saved, name: parts[0] ?? saved, lastName: parts.slice(1).join(" "), email },
        false,
      );
      router.push("/");
    } else {
      setPhase("pseudo");
    }
  // On veut que cet effet tourne uniquement quand status/session change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = pseudo.trim();
    if (!p || !session?.user || didLogin.current) return;
    didLogin.current = true;
    setSubmitting(true);

    const email = session.user.email ?? "";
    localStorage.setItem(pseudoKey(email), p);

    await new Promise((r) => setTimeout(r, 600));

    const parts = (session.user.name ?? "").split(" ");
    login(
      { pseudo: p, name: parts[0] ?? p, lastName: parts.slice(1).join(" "), email },
      true,
    );
    router.push("/");
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg,#faf8ff 0%,#fffef8 50%,#faf8ff 100%)" }}
    >
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-10%", left: "-5%", width: 500, height: 500, background: "rgba(212,192,255,0.45)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.2,1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-10%", right: "-5%", width: 450, height: 450, background: "rgba(245,230,163,0.4)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.15,1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div key="loading"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-5"
          >
            <motion.div
              className="w-14 h-14 rounded-full border-2"
              style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sm font-light tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Connexion…</p>
          </motion.div>
        )}

        {phase === "pseudo" && (
          <motion.div key="pseudo"
            initial={{ opacity: 0, y: 30, scale: 0.93 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="relative z-10 w-full max-w-sm mx-4"
          >
            <div className="relative rounded-3xl px-8 py-10 overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(48px)",
                border: "1px solid rgba(255,255,255,0.9)",
                boxShadow: "0 32px 80px -16px rgba(167,139,250,0.22),inset 0 1px 0 rgba(255,255,255,0.95)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
                style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)" }} />

              {session?.user?.image && (
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={session.user.image} alt="" className="w-16 h-16 rounded-2xl object-cover"
                      style={{ boxShadow: "0 8px 24px rgba(167,139,250,0.3)" }} />
                    <motion.div className="absolute inset-0 rounded-2xl"
                      style={{ border: "2px solid rgba(167,139,250,0.4)" }}
                      animate={{ scale: [1,1.3,1], opacity: [0.7,0,0.7] }}
                      transition={{ duration: 2, repeat: Infinity }} />
                  </div>
                </div>
              )}

              <div className="text-center mb-7">
                <h1 className="text-xl font-extralight" style={{ color: "#2D3748" }}>
                  Bonjour,{" "}
                  <span style={{ color: "#A78BFA" }}>
                    {session?.user?.name?.split(" ")[0] ?? ""}
                  </span>{" "}!
                </h1>
                <p className="text-xs font-light mt-1.5 leading-relaxed" style={{ color: "#718096" }}>
                  Dernière étape — choisis ton pseudo.<br />
                  C'est le nom que la communauté verra.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <motion.div
                  className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.8)", backdropFilter: "blur(20px)" }}
                  animate={{ boxShadow: focused ? "0 0 0 2px rgba(167,139,250,0.5),0 8px 24px rgba(167,139,250,0.15)" : "0 4px 16px rgba(167,139,250,0.06)" }}
                >
                  <AtSign size={15} style={{ color: focused ? "#A78BFA" : "#A0AEC0", flexShrink: 0 }} />
                  <input
                    autoFocus type="text" placeholder="ton_pseudo"
                    value={pseudo}
                    onChange={e => setPseudo(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
                    style={{ color: "#2D3748" }}
                  />
                  {pseudo.trim() && (
                    <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-semibold flex-shrink-0" style={{ color: "#A78BFA" }}>
                      @{pseudo}
                    </motion.span>
                  )}
                </motion.div>

                <motion.button type="submit" disabled={!pseudo.trim() || submitting}
                  whileHover={pseudo.trim() && !submitting ? { scale: 1.02, y: -2 } : {}}
                  whileTap={{ scale: 0.97 }}
                  className="relative w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer overflow-hidden"
                  style={{
                    background: pseudo.trim() ? "linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)" : "rgba(220,220,220,0.5)",
                    color: pseudo.trim() ? "#fff" : "#A0AEC0",
                    boxShadow: pseudo.trim() ? "0 4px 24px rgba(167,139,250,0.4)" : "none",
                    opacity: !pseudo.trim() ? 0.6 : 1,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {submitting ? (
                      <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2">
                        <motion.div className="w-4 h-4 rounded-full border-2"
                          style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                          animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                        <span>Finalisation…</span>
                      </motion.div>
                    ) : (
                      <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2">
                        <Sparkles size={14} strokeWidth={1.5} />
                        <span>Commencer</span>
                        <ArrowRight size={14} strokeWidth={2} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
