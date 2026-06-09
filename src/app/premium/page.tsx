"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PLANS, formatPrice, type PlanId } from "@/lib/plans";

const ICONS: Record<PlanId, React.ReactNode> = {
  free: <Sparkles size={22} strokeWidth={1.8} />,
  premium: <Crown size={22} strokeWidth={1.8} />,
  creator: <Star size={22} strokeWidth={1.8} />,
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
  const [msg, setMsg] = useState<string | null>(
    params?.get("success") ? "🎉 Bienvenue dans Vaiiya Premium !" :
    params?.get("canceled") ? "Paiement annulé — tu peux réessayer quand tu veux." : null
  );

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
    <div className="min-h-screen px-4 py-10 md:py-16" style={{ background: "linear-gradient(135deg,#faf8ff 0%,#fffef8 50%,#faf8ff 100%)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: "#2D2150" }}>
            Passe au niveau supérieur ✦
          </h1>
          <p className="mt-3 text-sm md:text-base font-light" style={{ color: "#7C6BAA" }}>
            Coach IA illimité, contenus exclusifs, sans pub. <strong>7 jours d'essai gratuit.</strong>
          </p>
        </div>

        {msg && (
          <div className="max-w-md mx-auto mb-8 px-4 py-3 rounded-2xl text-center text-sm font-medium"
            style={{ background: "rgba(167,139,250,0.12)", color: "#6D28D9", border: "1px solid rgba(167,139,250,0.25)" }}>
            {msg}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {order.map((id) => {
            const p = PLANS[id];
            const highlight = id === "premium";
            return (
              <motion.div key={id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: order.indexOf(id) * 0.08 }}
                className="relative rounded-3xl p-6 flex flex-col"
                style={{
                  background: highlight ? "linear-gradient(160deg,#fff,#f6f1ff)" : "rgba(255,255,255,0.96)",
                  border: highlight ? "2px solid #A78BFA" : "1px solid rgba(220,215,235,0.7)",
                  boxShadow: highlight ? "0 20px 50px -12px rgba(167,139,250,0.35)" : "0 8px 28px rgba(167,139,250,0.10)",
                }}>
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)" }}>
                    POPULAIRE
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1" style={{ color: highlight ? "#7C5CFA" : "#A78BFA" }}>
                  {ICONS[id]}
                  <span className="text-lg font-extrabold" style={{ color: "#2D2150" }}>{p.name}</span>
                </div>
                <p className="text-xs font-light mb-4" style={{ color: "#9488B5" }}>{p.tagline}</p>

                <div className="mb-5">
                  <span className="text-3xl font-black" style={{ color: "#2D2150" }}>
                    {p.priceCents === 0 ? "0 €" : formatPrice(p.priceCents)}
                  </span>
                  {p.priceCents > 0 && <span className="text-sm font-light" style={{ color: "#9488B5" }}>/mois</span>}
                </div>

                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#4A4060" }}>
                      <Check size={16} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" style={{ color: highlight ? "#7C5CFA" : "#A78BFA" }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {id === "free" ? (
                  <div className="text-center py-3 rounded-2xl text-sm font-semibold" style={{ background: "rgba(240,235,255,0.6)", color: "#9488B5" }}>
                    Ton offre actuelle
                  </div>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => subscribe(id)} disabled={loading === id}
                    className="py-3 rounded-2xl text-sm font-bold text-white cursor-pointer disabled:opacity-60"
                    style={{ background: highlight ? "linear-gradient(135deg,#A78BFA,#7C5CFA)" : "linear-gradient(135deg,#C4A8FF,#A78BFA)", boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}>
                    {loading === id ? "Redirection…" : `Essayer 7 jours gratuits`}
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs font-light mt-8" style={{ color: "#9488B5" }}>
          Sans engagement · annulable à tout moment · paiement sécurisé par Stripe
        </p>
      </div>
    </div>
  );
}
