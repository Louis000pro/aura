"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Crown, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PLANS, formatPrice, type PlanId } from "@/lib/plans";

const ICONS: Record<PlanId, React.ReactNode> = {
  free: <Sparkles size={20} strokeWidth={1.8} />,
  premium: <Crown size={20} strokeWidth={1.8} />,
  creator: <Star size={20} strokeWidth={1.8} />,
};

export default function PremiumPage() {
  return (
    <Suspense fallback={null}>
      <PremiumInner />
    </Suspense>
  );
}

function PremiumInner() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
    if (params?.get("success")) setCelebrate(true);
    else if (params?.get("canceled")) setMsg("Paiement annulé — tu peux réessayer quand tu veux 💜");
  }, [params]);

  const subscribe = async (plan: PlanId) => {
    if (plan === "free") return;
    if (!user) { router.push("/auth?mode=signup"); return; }
    setLoading(plan);
    setMsg(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, email: user.email, plan }),
      });
      const data = await res.json();
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setMsg(data.message || "Les paiements seront bientôt activés 💜");
    } catch {
      setMsg("Une erreur est survenue, réessaie 💜");
    } finally {
      setLoading(null);
    }
  };

  const order: PlanId[] = ["free", "premium", "creator"];

  return (
    <div className="relative h-dvh overflow-hidden px-4 py-4 md:py-10 flex flex-col"
      style={{ background: "linear-gradient(135deg,#faf8ff 0%,#fffef8 50%,#faf8ff 100%)" }}>

      {/* Halos d'ambiance (statiques sur mobile pour la fluidité) */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-12%", left: "-8%", width: 460, height: 460, background: "rgba(212,192,255,0.40)", filter: isMobile ? "blur(60px)" : "blur(90px)" }}
        animate={isMobile ? undefined : { scale: [1, 1.15, 1] }}
        transition={isMobile ? undefined : { duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-12%", right: "-8%", width: 420, height: 420, background: "rgba(245,230,163,0.38)", filter: isMobile ? "blur(60px)" : "blur(90px)" }}
        animate={isMobile ? undefined : { scale: [1, 1.12, 1] }}
        transition={isMobile ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-4 md:mb-8 flex-shrink-0">
          <span className="inline-block text-xs font-bold tracking-[0.2em] mb-3 px-3 py-1 rounded-full"
            style={{ color: "#7C5CFA", background: "rgba(167,139,250,0.12)" }}>VAIIYA PREMIUM ✦</span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight" style={{ color: "#2D2150" }}>
            Passe au niveau supérieur
          </h1>
          <p className="mt-3 text-sm md:text-base font-light max-w-md mx-auto" style={{ color: "#7C6BAA" }}>
            Coach IA illimité, contenus exclusifs, sans pub.
            <br className="hidden md:block" /> <strong style={{ color: "#6D28D9" }}>7 jours d'essai gratuit</strong> — sans engagement.
          </p>
        </motion.div>

        {msg && (
          <div className="max-w-md mx-auto mb-8 px-4 py-3 rounded-2xl text-center text-sm font-medium"
            style={{ background: "rgba(167,139,250,0.12)", color: "#6D28D9", border: "1px solid rgba(167,139,250,0.25)" }}>
            {msg}
          </div>
        )}

        {/* Tiers */}
        <div className="flex flex-col md:grid md:grid-cols-3 gap-2.5 md:gap-5 items-stretch flex-1 min-h-0">
          {order.map((id) => {
            const p = PLANS[id];
            const highlight = id === "premium";
            return (
              <motion.div key={id}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: order.indexOf(id) * 0.08 }}
                className="relative rounded-[26px] p-[1.5px] flex-1 md:flex-none min-h-0"
                style={{
                  background: highlight
                    ? "linear-gradient(150deg,#A78BFA 0%,#C4A8FF 35%,#F5E6A3 70%,#FFB088 100%)"
                    : "rgba(220,215,235,0.7)",
                  boxShadow: highlight ? "0 24px 60px -16px rgba(167,139,250,0.45)" : "0 10px 30px rgba(167,139,250,0.10)",
                }}>
                <div className="relative rounded-[24px] p-4 md:p-6 h-full flex flex-col overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.97)", backdropFilter: isMobile ? "none" : "blur(8px)" }}>

                  {highlight && (
                    <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider text-white"
                      style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)" }}>POPULAIRE</div>
                  )}

                  <div className="flex items-center gap-2 mb-1" style={{ color: highlight ? "#7C5CFA" : "#A78BFA" }}>
                    {ICONS[id]}
                    <span className="text-lg font-extrabold" style={{ color: "#2D2150" }}>{p.name}</span>
                  </div>
                  <p className="text-xs font-light mb-2.5 md:mb-5 md:min-h-[32px]" style={{ color: "#9488B5" }}>{p.tagline}</p>

                  <div className="mb-3 md:mb-5 flex items-end gap-1">
                    <span className="text-3xl md:text-4xl font-black" style={{ color: "#2D2150" }}>
                      {p.priceCents === 0 ? "0 €" : formatPrice(p.priceCents)}
                    </span>
                    {p.priceCents > 0 && <span className="text-sm font-light mb-1.5" style={{ color: "#9488B5" }}>/mois</span>}
                  </div>

                  <ul className="flex flex-col gap-1.5 md:gap-2.5 mb-3 md:mb-6 flex-1 overflow-hidden">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#4A4060" }}>
                        <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: highlight ? "linear-gradient(135deg,#A78BFA,#7C5CFA)" : "rgba(167,139,250,0.18)" }}>
                          <Check size={11} strokeWidth={3} style={{ color: highlight ? "#fff" : "#A78BFA" }} />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {id === "free" ? (
                    <div className="text-center py-3 rounded-2xl text-sm font-semibold"
                      style={{ background: "rgba(240,235,255,0.7)", color: "#9488B5" }}>Ton offre actuelle</div>
                  ) : (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => subscribe(id)} disabled={loading === id}
                      className="py-2.5 md:py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer disabled:opacity-60"
                      style={{
                        background: highlight ? "linear-gradient(135deg,#A78BFA,#7C5CFA)" : "linear-gradient(135deg,#C4A8FF,#A78BFA)",
                        boxShadow: "0 8px 24px rgba(167,139,250,0.35)",
                      }}>
                      {loading === id ? "Redirection…" : "Essayer 7 jours gratuits"}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[11px] md:text-xs font-light mt-3 md:mt-6 flex-shrink-0" style={{ color: "#9488B5" }}>
          Sans engagement · annulable à tout moment · paiement sécurisé par Stripe 🔒
        </p>
      </div>

      {/* ── Célébration au retour de paiement ── */}
      <AnimatePresence>
        {celebrate && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(45,33,80,0.45)", backdropFilter: "blur(8px)" }}
            onClick={() => { setCelebrate(false); router.replace("/premium"); }}>
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 18, stiffness: 260 }}
              className="relative w-full max-w-sm rounded-[28px] px-8 py-10 text-center overflow-hidden"
              style={{ background: "linear-gradient(160deg,#fff,#f6f1ff)", boxShadow: "0 30px 80px -16px rgba(124,92,250,0.5)" }}>

              {/* sparkles */}
              {!isMobile && [...Array(10)].map((_, i) => (
                <motion.div key={i} className="absolute rounded-full"
                  style={{ width: 6, height: 6, top: "50%", left: "50%", background: ["#A78BFA","#F5E6A3","#FFB088","#C4A8FF"][i % 4] }}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                  animate={{ scale: [0, 1, 0], x: Math.cos((i / 10) * 6.28) * 120, y: Math.sin((i / 10) * 6.28) * 120, opacity: [1, 1, 0] }}
                  transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }} />
              ))}

              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12, delay: 0.1 }}
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 12px 30px rgba(124,92,250,0.45)" }}>
                <Crown size={38} strokeWidth={1.8} color="#fff" />
              </motion.div>

              <h2 className="text-2xl font-black mb-2" style={{ color: "#2D2150" }}>Bienvenue dans Premium ✦</h2>
              <p className="text-sm font-light mb-6" style={{ color: "#7C6BAA" }}>
                Ton essai de 7 jours est lancé. Coach IA illimité, contenus exclusifs, zéro pub — tout est débloqué. 🎉
              </p>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setCelebrate(false); router.replace("/"); }}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 8px 24px rgba(167,139,250,0.35)" }}>
                C'est parti 🚀
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
