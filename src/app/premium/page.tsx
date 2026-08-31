"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PLANS, VENTE_OUVERTE, formatPrice, type PlanId } from "@/lib/plans";
import PremiumCelebration from "@/components/PremiumCelebration";
import { VitrinePied } from "@/components/seo/VitrineChrome";
import InfosPremium from "./InfosPremium";
import styles from "./page.module.css";

const ICONS: Record<PlanId, React.ReactNode> = {
  free: <Sparkles size={20} strokeWidth={1.8} />,
  premium: <Crown size={20} strokeWidth={1.8} />,
};

/**
 * Lecteur des paramètres d'URL, isolé exprès dans son propre composant.
 *
 * `useSearchParams` force Next à rendre côté CLIENT tout ce qui se trouve dans
 * sa frontière `<Suspense>`. Toute la page était dans cette frontière : le
 * serveur ne renvoyait donc que le `fallback` (null), et /premium servait
 * 61 caractères de texte à un robot, sans titre ni prix. Le retour de paiement
 * est la seule chose qui a besoin de l'URL : il est seul à basculer côté
 * client, le reste de la page est rendu par le serveur.
 */
function LecteurParams({ onParams }: { onParams: (p: URLSearchParams) => void }) {
  const search = useSearchParams();
  useEffect(() => {
    onParams(new URLSearchParams(search?.toString() ?? ""));
  }, [search, onParams]);
  return null;
}

export default function PremiumPage() {
  return <PremiumInner />;
}

function PremiumInner() {
  const { user, session, refreshProfile } = useAuth();
  const router = useRouter();
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [verifPaiement, setVerifPaiement] = useState(false);
  const [portail, setPortail] = useState(false);
  // Acceptation des conditions avant paiement. On vend un abonnement qui se
  // reconduit tout seul : le contrat doit être accepté explicitement, pas
  // supposé accepté parce qu'un lien traînait en bas de page.
  const [cguOk, setCguOk] = useState(false);
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
    if (params?.get("canceled")) setMsg("Paiement annulé, tu peux réessayer quand tu veux");
    else if (params?.get("welcome")) setMsg("Bienvenue sur Vaiiya 👋 Commence gratuitement, ou débloque tout avec 3 jours d’essai offerts.");
  }, [params]);

  /**
   * Retour de paiement : on ne fête RIEN sur la foi du paramètre d'URL.
   * On demande à Stripe l'état réel de l'abonnement (ce qui répare aussi le
   * compte si le webhook s'est perdu), et seulement ensuite on célèbre.
   * Sans ce filet, un paiement encaissé dont le webhook a échoué laissait un
   * compte en Gratuit avec une célébration à l'écran.
   */
  const retourTraite = useRef(false);
  useEffect(() => {
    if (!params?.get("success") || !session?.access_token || retourTraite.current) return;
    retourTraite.current = true;

    (async () => {
      setVerifPaiement(true);
      try {
        const res = await fetch("/api/stripe/reconcile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ session_id: params.get("session_id") || undefined }),
        });
        const data = await res.json();
        if (data?.premium) {
          await refreshProfile();
          setCelebrate(true);
        } else {
          setMsg(
            "Ton paiement est bien reçu, l’activation prend parfois une minute. Recharge la page, et écris-nous si rien ne change."
          );
        }
      } catch {
        setMsg(
          "Ton paiement est bien reçu, l’activation prend parfois une minute. Recharge la page, et écris-nous si rien ne change."
        );
      } finally {
        setVerifPaiement(false);
      }
    })();
  }, [params, session?.access_token, refreshProfile]);

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
    // Le compte est identifié par le token côté serveur : on n'envoie plus
    // d'identifiant dans le corps de la requête.
    if (!session?.access_token) { setMsg("Reconnecte-toi pour continuer"); return; }
    // Le bouton reste cliquable exprès : un bouton éteint sans explication
    // laisse croire à une panne. On dit ce qui manque.
    if (!cguOk) { setMsg("Coche la case pour accepter les conditions"); return; }
    setLoading(plan);
    setMsg(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.url) { window.location.href = data.url; return; }
      // 409 : un abonnement tourne déjà. Le serveur vient de remettre le profil
      // d'aplomb, on rafraîchit pour que l'écran le montre.
      if (res.status === 409) await refreshProfile();
      setMsg(data.message || "Les paiements seront bientôt activés");
    } catch {
      setMsg("Une erreur est survenue, réessaie");
    } finally {
      setLoading(null);
    }
  };

  /** Ouvre le portail Stripe : factures, carte, résiliation. */
  const ouvrirPortail = async () => {
    if (!session?.access_token) { setMsg("Reconnecte-toi pour continuer"); return; }
    setPortail(true);
    setMsg(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setMsg(data.message || "Impossible d’ouvrir la gestion de l’abonnement");
    } catch {
      setMsg("Une erreur est survenue, réessaie");
    } finally {
      setPortail(false);
    }
  };

  const order: PlanId[] = ["free", "premium"];

  return (
    <div className={`${styles.page} relative min-h-dvh overflow-x-hidden px-4 md:py-10 flex flex-col`}
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}>

      {/* Halos d'ambiance (statiques sur mobile pour la fluidité) */}
      <motion.div className={`${styles.violetHalo} absolute rounded-full pointer-events-none`}
        style={{ top: "-12%", left: "-8%", width: 460, height: 460, filter: isMobile ? "blur(60px)" : "blur(90px)" }}
        animate={isMobile ? undefined : { scale: [1, 1.15, 1] }}
        transition={isMobile ? undefined : { duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      {/* Touche dorée subtile en haut à droite (rappel de marque, sans couper le bas) */}
      <motion.div className={`${styles.goldHalo} absolute rounded-full pointer-events-none`}
        style={{ top: "6%", right: "-12%", width: 340, height: 340, filter: isMobile ? "blur(60px)" : "blur(90px)" }}
        animate={isMobile ? undefined : { scale: [1, 1.1, 1] }}
        transition={isMobile ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

      <Suspense fallback={null}>
        <LecteurParams onParams={setParams} />
      </Suspense>

      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-4 md:mb-8 flex-shrink-0">
          {/* La pastille de marque est DANS le h1 : le titre de la page se lit
              alors « Vaiiya Premium · Passe au niveau supérieur », donc il nomme
              l'offre au lieu de la sous-entendre. Rien ne bouge à l'écran. */}
          <h1 style={{ color: "var(--text-0)" }}>
            <span className={`${styles.eyebrow} inline-block text-xs font-bold tracking-[0.2em] mb-3 px-3 py-1 rounded-full`}>
              VAIIYA PREMIUM ✦
            </span>
            <span className="block text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Passe au <span className={styles.titleAccent}>niveau supérieur</span>
            </span>
          </h1>
          <p className="mt-3 text-sm md:text-base font-light max-w-md mx-auto" style={{ color: "var(--text-soft)" }}>
            Coach IA <strong style={{ color: "var(--accent)" }}>sans limite</strong>, programmes exclusifs, zéro pub.
            {VENTE_OUVERTE ? (
              <>
                <br className="hidden md:block" /> <strong style={{ color: "var(--accent)" }}>3 jours gratuits</strong>{" "}· 0 € aujourd&apos;hui · annule en 1 clic.
              </>
            ) : (
              <>
                {/* Tant que la vente est fermée, on ne promet ni essai ni
                    « annule en 1 clic » : ce serait vendre une porte close. */}
                <br className="hidden md:block" /> L&apos;abonnement n&apos;est <strong style={{ color: "var(--accent)" }}>pas encore ouvert</strong> à la souscription.
              </>
            )}
          </p>
        </motion.div>

        {msg && (
          <div className="max-w-md mx-auto mb-8 px-4 py-3 rounded-2xl text-center text-sm font-medium"
            style={{ background: "rgba(167,139,250,0.12)", color: "var(--accent)", border: "1px solid rgba(167,139,250,0.25)" }}>
            {msg}
          </div>
        )}

        {/* Tiers — carrousel horizontal sur mobile, grille sur desktop */}
        <div
          ref={carouselRef}
          onScroll={onCarouselScroll}
          className="flex md:grid md:grid-cols-2 md:max-w-3xl md:mx-auto overflow-x-auto md:overflow-visible snap-x snap-mandatory gap-4 md:gap-5 -mx-4 px-4 md:mx-0 md:px-0 items-stretch"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch" as never,
            scrollSnapType: "x mandatory",
            overscrollBehaviorX: "contain",
          }}
        >
          {order.map((id) => {
            const p = PLANS[id];
            const highlight = id === "premium";
            return (
              <motion.div key={id} data-tier={id}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: order.indexOf(id) * 0.08 }}
                className={`${styles.cardFrame} relative rounded-[26px] p-[1.5px] snap-center shrink-0 w-[82vw] max-w-[340px] md:w-auto md:max-w-none min-h-0`}
                style={{
                  scrollSnapAlign: "center",
                  scrollSnapStop: "always",
                }}>
                <div className={`${styles.cardSurface} relative rounded-[24px] p-4 md:p-6 h-full flex flex-col overflow-hidden`}
                  style={{ backdropFilter: isMobile ? "none" : "blur(8px)" }}>

                  {highlight && (
                    <div className={`${styles.popularBadge} absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider text-white`}>
                      POPULAIRE
                    </div>
                  )}

                  {/* Nom de l'offre */}
                  <div className="flex items-center gap-2 mb-3" style={{ color: highlight ? "#7C5CFA" : "#A78BFA" }}>
                    {ICONS[id]}
                    <span className="text-lg font-extrabold" style={{ color: "var(--text-0)" }}>{p.name}</span>
                  </div>

                  {/* Prix */}
                  <div className="flex items-end gap-1.5 flex-wrap mb-2.5">
                    <span className="text-3xl md:text-4xl font-black" style={{ color: "var(--text-0)" }}>
                      {p.priceCents === 0 ? "0 €" : formatPrice(p.priceCents)}
                    </span>
                    {p.priceCents > 0 && <span className="text-sm font-light mb-1.5" style={{ color: "var(--text-3)" }}>/mois</span>}
                    {p.priceCents > 0 && (
                      <span className="text-[11px] font-semibold mb-1.5 px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(167,139,250,0.1)", color: "#7C5CFA" }}>
                        ≈ {(p.priceCents / 100 / 30).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/jour
                      </span>
                    )}
                  </div>

                  {/* Petite phrase entre le prix et le bouton (façon ChatGPT) */}
                  <p className="text-sm font-light mb-4" style={{ color: "var(--text-soft)", minHeight: 40 }}>{p.tagline}</p>

                  {/* CTA — juste sous le prix. L'offre en cours ne propose
                      jamais de repayer : elle propose de gérer ou d'arrêter. */}
                  {id === "free" ? (
                    !user?.is_premium && (
                      <div className={`${styles.currentPlan} text-center py-3 rounded-2xl text-sm font-semibold`}>
                        Ton offre actuelle
                      </div>
                    )
                  ) : user?.is_premium ? (
                    <>
                      <div className={`${styles.currentPlan} text-center py-3 rounded-2xl text-sm font-semibold`}>
                        Ton abonnement est actif
                      </div>
                      <button onClick={ouvrirPortail} disabled={portail}
                        className="mt-2 py-2 text-xs font-semibold underline underline-offset-4 cursor-pointer disabled:opacity-60"
                        style={{ color: "var(--text-3)" }}>
                        {portail ? "Ouverture…" : "Gérer ou résilier mon abonnement"}
                      </button>
                    </>
                  ) : !VENTE_OUVERTE ? (
                    /* La vente n'est pas ouverte : on le dit franchement au lieu
                       d'afficher un bouton qui refuserait après le clic. */
                    <div className="text-center py-3 px-3 rounded-2xl"
                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.28)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#7C5CFA" }}>Bientôt disponible</p>
                      <p className="text-[11px] font-light leading-snug mt-1" style={{ color: "var(--text-3)" }}>
                        L&apos;abonnement n&apos;est pas encore ouvert. En attendant, tout ce qui est
                        gratuit le reste, et rien ne t&apos;est facturé.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="flex items-start gap-2.5 mb-3 cursor-pointer text-left">
                        <input
                          type="checkbox"
                          checked={cguOk}
                          onChange={(e) => { setCguOk(e.target.checked); if (e.target.checked) setMsg(null); }}
                          className="mt-0.5 flex-shrink-0 w-4 h-4 cursor-pointer"
                          style={{ accentColor: "#7C5CFA" }}
                        />
                        <span className="text-[11px] font-light leading-snug" style={{ color: "var(--text-3)" }}>
                          J&apos;ai lu et j&apos;accepte les{" "}
                          <Link href="/conditions" className="underline" style={{ color: "var(--text-2)" }}>
                            conditions générales
                          </Link>{" "}
                          et je demande que l&apos;accès commence tout de suite.
                        </span>
                      </label>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => subscribe(id)} disabled={loading === id || verifPaiement}
                        className={`${styles.cta} ${highlight ? styles.ctaPrimary : styles.ctaSecondary} py-2.5 md:py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer disabled:opacity-60`}>
                        {loading === id ? "Redirection…" : verifPaiement ? "Vérification…" : "Démarrer mes 3 jours gratuits"}
                      </motion.button>
                    </>
                  )}

                  {/* Séparateur */}
                  <div className="h-px my-4 md:my-5" style={{ background: "rgba(167,139,250,0.12)" }} />

                  {/* Avantages — listés en bas, tous visibles */}
                  <ul className="flex flex-col gap-2.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-body)" }}>
                        <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: highlight ? "linear-gradient(135deg,#A78BFA,#7C5CFA)" : "rgba(167,139,250,0.18)" }}>
                          <Check size={11} strokeWidth={3} style={{ color: highlight ? "#fff" : "#A78BFA" }} />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
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
          <span className="ml-1.5 text-[11px] font-medium" style={{ color: "var(--text-3)" }}>2 offres · glisse pour comparer</span>
        </div>

        {/* Information précontractuelle : la reconduction et le contrat doivent
            se lire AVANT de payer, pas après. */}
        {VENTE_OUVERTE ? (
          <p className="text-center text-[11px] md:text-xs font-light mt-3 md:mt-6 flex-shrink-0" style={{ color: "var(--text-3)" }}>
            <strong style={{ color: "#7C5CFA" }}>0 € aujourd&apos;hui</strong>{" "}· annulable en 1 clic avant la fin de l&apos;essai · paiement sécurisé Stripe 🔒
            <br />
            Puis {formatPrice(PLANS.premium.priceCents)}/mois, reconduit automatiquement, résiliable à tout moment.
            {" "}
            <Link href="/conditions" className="underline" style={{ color: "var(--text-2)" }}>Conditions</Link>
          </p>
        ) : (
          <p className="text-center text-[11px] md:text-xs font-light mt-3 md:mt-6 flex-shrink-0" style={{ color: "var(--text-3)" }}>
            Aucun paiement n&apos;est possible aujourd&apos;hui, et aucun moyen de paiement ne t&apos;est demandé.
            {" "}
            <Link href="/conditions" className="underline" style={{ color: "var(--text-2)" }}>Conditions</Link>
          </p>
        )}

        {/* Le contenu écrit : ce qui est gratuit, ce que Premium ajoute, le prix. */}
        <InfosPremium />

        {/*
          Données structurées de la page.

          On rattache /premium à l'entité déjà décrite dans le layout racine
          (`#application`, `#website`) au lieu de redéclarer une application ou
          une organisation, ce qui créerait deux entités concurrentes pour la
          même chose.

          Aucun nœud `Offer` ni `Product` n'est déclaré ici tant que la vente est
          fermée : annoncer une offre en données structurées, c'est la déclarer
          souscriptible. Le layout racine porte déjà l'offre gratuite et dit
          explicitement que l'abonnement n'est pas ouvert.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "@id": "https://vaiiya.fr/premium#page",
              url: "https://vaiiya.fr/premium",
              name: `Vaiiya ${PLANS.premium.name}`,
              inLanguage: "fr-FR",
              description: VENTE_OUVERTE
                ? `Ce que contient Vaiiya ${PLANS.premium.name} à ${formatPrice(PLANS.premium.priceCents)} par mois, et ce que le compte gratuit donne déjà.`
                : `Ce que contient Vaiiya ${PLANS.premium.name} et ce que le compte gratuit donne déjà. L’abonnement n’est pas encore ouvert à la souscription.`,
              isPartOf: { "@id": "https://vaiiya.fr/#website" },
              about: { "@id": "https://vaiiya.fr/#application" },
            }),
          }}
        />

        {/* Le maillage public, exactement celui des autres pages vitrine.
            /premium ne renvoyait vers aucune autre page publique : on y
            arrivait depuis un moteur et on n'en repartait que par la barre
            d'adresse. Rien de nouveau ici, c'est le composant partagé.

            `pb-28` reprend la respiration de `PageVitrine` : sur mobile, un
            membre connecté garde sa barre du bas, qui recouvrirait sinon la
            dernière ligne. */}
        <div className="pb-28">
          {/* Seule page publique dont le fond suit le thème de l'app : son pied
              doit suivre aussi, sinon les liens tombent à 3,63:1 sur le noir. */}
          <VitrinePied suitLeTheme />
        </div>
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
