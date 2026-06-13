"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Crown, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PLANS, formatPrice, type PlanId } from "@/lib/plans";
import PremiumCelebration from "@/components/PremiumCelebration";

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
  const [activeIdx, setActiveIdx] = useState(1); // Premium centré par défaut
  const carouselRef = useRef<HTMLDivElement>(null);

  const onCarouselScroll = () => {
    const c = carouselRef.current; if (!c) return;
    const cards = Array.from(c.querySelectorAll("[data-tier]")) as HTMLElement[];
    const center = c.scrollLeft + c.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    cards.forEach((card, i) => {
      const cc = card.offsetLeft + card.offsetWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActiveIdx(best);
  };

  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
    if (params?.get("success")) setCelebrate(true);
    else if (params?.get("canceled")) setMsg("Paiement annulé — tu peux réessayer quand tu veux");
    else if (params?.get("welcome")) setMsg("Bienvenue sur Vaiiya 👋 Commence gratuitement, ou débloque tout avec 7 jours d'essai offerts.");
  }, [params]);

  // À l'arrivée sur mobile : centrer parfaitement le carrousel sur la carte Premium.
  // Plusieurs passes pour gérer le layout/polices qui se stabilisent (PWA & web).
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const center = () => {
      const c = carouselRef.current;
      const card = c?.querySelector('[data-tier="premium"]') as HTMLElement | null;
      if (c && card) {
        c.scrollLeft = Math.max(0, card.offsetLeft + card.offsetWidth / 2 - c.clientWidth / 2);
      }
    };
    center();
    const r = requestAnimationFrame(center);
    const t1 = setTimeout(center, 120);
    const t2 = setTimeout(center, 350);
    const t3 = setTimeout(center, 700);
    return () => { cancelAnimationFrame(r); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

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
      setMsg(data.message || "Les paiements seront bientôt activés");
    } catch {
      setMsg("Une erreur est survenue, réessaie");
    } finally {
      setLoading(null);
    }
  };

  const order: PlanId[] = ["free", "premium", "creator"];

  return (
    <div className="relative h-dvh overflow-hidden px-4 md:py-10 flex flex-col"
      style={{ background: "linear-gradient(180deg,#faf8ff 0%,#f4eeff 50%,#ece4ff 100%)", paddingTop: "calc(env(safe-area-inset-top) + 14px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}>

      {/* Halos d'ambiance (statiques sur mobile pour la fluidité) */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-12%", left: "-8%", width: 460, height: 460, background: "rgba(212,192,255,0.40)", filter: isMobile ? "blur(60px)" : "blur(90px)" }}
        animate={isMobile ? undefined : { scale: [1, 1.15, 1] }}
        transition={isMobile ? undefined : { duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      {/* Touche dorée subtile en haut à droite (rappel de marque, sans couper le bas) */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "6%", right: "-12%", width: 340, height: 340, background: "rgba(245,230,163,0.28)", filter: isMobile ? "blur(60px)" : "blur(90px)" }}
        animate={isMobile ? undefined : { scale: [1, 1.1, 1] }}
        transition={isMobile ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
      {/* Halo violet en bas → le dégradé continue jusqu'en bas (plus de coupure jaune) */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-14%", left: "50%", x: "-50%", width: 520, height: 420, background: "rgba(167,139,250,0.30)", filter: isMobile ? "blur(70px)" : "blur(100px)" }}
        animate={isMobile ? undefined : { scale: [1, 1.12, 1] }}
        transition={isMobile ? undefined : { duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />

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
            Coach IA <strong style={{ color: "#6D28D9" }}>sans limite</strong>, programmes exclusifs, zéro pub.
            <br className="hidden md:block" /> <strong style={{ color: "#6D28D9" }}>7 jours gratuits</strong> · 0 € aujourd&apos;hui · annule en 1 clic.
          </p>
        </motion.div>

        {msg && (
          <div className="max-w-md mx-auto mb-8 px-4 py-3 rounded-2xl text-center text-sm font-medium"
            style={{ background: "rgba(167,139,250,0.12)", color: "#6D28D9", border: "1px solid rgba(167,139,250,0.25)" }}>
            {msg}
          </div>
        )}

        {/* Tiers — carrousel horizontal sur mobile, grille sur desktop */}
        <div
          ref={carouselRef}
          onScroll={onCarouselScroll}
          className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory gap-4 md:gap-5 -mx-4 px-4 md:mx-0 md:px-0 items-stretch flex-1 min-h-0"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" as never }}
        >
          {order.map((id) => {
            const p = PLANS[id];
            const highlight = id === "premium";
            return (
              <motion.div key={id} data-tier={id}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: order.indexOf(id) * 0.08 }}
                className="relative rounded-[26px] p-[1.5px] snap-center shrink-0 w-[82vw] max-w-[340px] md:w-auto md:max-w-none min-h-0"
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

                  <div className="mb-3 md:mb-5 flex items-end gap-1.5 flex-wrap">
                    <span className="text-3xl md:text-4xl font-black" style={{ color: "#2D2150" }}>
                      {p.priceCents === 0 ? "0 €" : formatPrice(p.priceCents)}
                    </span>
                    {p.priceCents > 0 && <span className="text-sm font-light mb-1.5" style={{ color: "#9488B5" }}>/mois</span>}
                    {p.priceCents > 0 && (
                      <span className="text-[11px] font-semibold mb-1.5 px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(167,139,250,0.1)", color: "#7C5CFA" }}>
                        ≈ {(p.priceCents / 100 / 30).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/jour
                      </span>
                    )}
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
                      {loading === id ? "Redirection…" : "Démarrer mes 7 jours gratuits"}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Points indicateurs — montrent qu'il y a 3 offres à faire défiler (mobile) */}
        <div className="flex md:hidden justify-center items-center gap-2 mt-3 flex-shrink-0">
          {order.map((id, i) => (
            <button key={id} aria-label={`Offre ${i + 1}`}
              onClick={() => {
                const c = carouselRef.current;
                const card = c?.querySelector(`[data-tier="${id}"]`) as HTMLElement | null;
                if (c && card) c.scrollTo({ left: Math.max(0, card.offsetLeft + card.offsetWidth / 2 - c.clientWidth / 2), behavior: "smooth" });
              }}
              className="rounded-full transition-all cursor-pointer"
              style={{ width: activeIdx === i ? 20 : 7, height: 7, background: activeIdx === i ? "linear-gradient(90deg,#A78BFA,#D4A843)" : "rgba(167,139,250,0.3)" }} />
          ))}
          <span className="ml-1.5 text-[11px] font-medium" style={{ color: "#9488B5" }}>3 offres · glisse pour comparer</span>
        </div>

        <p className="text-center text-[11px] md:text-xs font-light mt-3 md:mt-6 flex-shrink-0" style={{ color: "#9488B5" }}>
          <strong style={{ color: "#7C5CFA" }}>0 € aujourd&apos;hui</strong> · annulable en 1 clic avant la fin de l&apos;essai · paiement sécurisé Stripe 🔒
        </p>
      </div>

      {/* ── Célébration au retour de paiement ── */}
      <AnimatePresence>
        {celebrate && (
          <PremiumCelebration onClose={() => { setCelebrate(false); router.replace("/"); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
