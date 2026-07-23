"use client";

/* ════════════════════════════════════════════════════════════════════
   PremiumBanner — le rappel Premium, façon chess.com.

   À chaque arrivée sur le site, un bandeau descend du haut de l'écran et
   met l'abonnement en valeur. Règles :
   • JAMAIS pour un abonné (is_premium) ni un admin — on ne vend pas à
     quelqu'un qui a déjà payé.
   • UNE fois par session (sessionStorage) : il revient à chaque nouvelle
     visite, jamais deux fois dans la même navigation.
   • Jamais sur /premium (on y est déjà), ni sur les pages publiques
     (/auth, /rejoindre) où il n'a aucun sens.
   • Le message est PERSONNALISÉ (pseudo + un bénéfice qui tourne) — un
     rappel qui parle à la personne, pas une bannière publicitaire.
   • Se referme tout seul, et `prefers-reduced-motion` est respecté.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { X, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PLANS, formatPrice } from "@/lib/plans";

const DELAI_APPARITION = 1400;   // laisse l'app se poser avant de solliciter

/**
 * Qui a déjà vu le rappel dans CE chargement de page.
 *
 * Volontairement une variable de module et PAS sessionStorage : sessionStorage
 * survit aux rechargements, donc le bandeau ne revenait plus tant que l'onglet
 * était ouvert. Ici la variable repart à zéro à chaque chargement du site →
 * **le rappel réapparaît à chaque connexion / réouverture**, tout en ne se
 * rejouant pas quand on navigue d'une page à l'autre.
 */
let dernierUtilisateurMontre: string | null = null;

/** Les bénéfices tournent : le rappel ne dit pas deux fois la même chose. */
const BENEFICES = [
  "Missions illimitées pour faire monter ton EXP",
  "Analyse nutrition illimitée, sans compteur",
  "Tes entraînements en détail complet",
  "Programmes & entraînements exclusifs",
  "Ton coach ✦ en illimité",
];

export default function PremiumBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [benefice, setBenefice] = useState(BENEFICES[0]);

  const estAbonne = !!(user?.is_premium || user?.is_admin);
  const pageExclue =
    pathname.startsWith("/premium") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/rejoindre");

  useEffect(() => {
    // Déconnecté → on réarme : la prochaine connexion réaffichera le rappel.
    if (!user) { dernierUtilisateurMontre = null; return; }
    if (estAbonne || pageExclue) return;
    // Déjà montré à cette personne depuis le chargement → on ne rejoue pas
    // à chaque navigation interne.
    if (dernierUtilisateurMontre === user.id) return;

    dernierUtilisateurMontre = user.id;
    setBenefice(BENEFICES[Math.floor(Math.random() * BENEFICES.length)]);

    // Pas de fermeture automatique : le rappel reste tant que l'utilisateur ne
    // l'a pas fermé (ou n'a pas touché « Voir »). C'est un rappel, pas un flash.
    const tOuvre = setTimeout(() => setVisible(true), DELAI_APPARITION);
    return () => clearTimeout(tOuvre);
  }, [user, estAbonne, pageExclue]);

  const ouvrirPremium = () => {
    setVisible(false);
    router.push("/premium");
  };

  const prix = formatPrice(PLANS.premium.priceCents);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -70 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -70 }}
          transition={{ type: "spring", bounce: 0.22, duration: 0.5 }}
          className="fixed left-0 right-0 z-[70] flex justify-center px-3 md:left-[88px]"
          style={{ top: "calc(env(safe-area-inset-top) + 10px)" }}
          role="status"
        >
          <div
            className="w-full max-w-md rounded-[22px] p-[1.5px]"
            style={{
              background: "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 55%,#F5B120 100%)",
              boxShadow: "0 14px 40px -14px rgba(193,59,193,0.55)",
            }}
          >
            <div
              className="flex items-center gap-3 rounded-[20px] px-3.5 py-3"
              style={{ background: "rgb(var(--surface-rgb))", backdropFilter: "blur(12px)" }}
            >
              {/* Étincelle */}
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-[20px]"
                style={{
                  background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                  boxShadow: "0 4px 14px -4px rgba(193,59,193,0.7)",
                  color: "#fff",
                }}
              >
                ✦
              </div>

              {/* Texte personnalisé */}
              <button
                type="button"
                onClick={ouvrirPremium}
                className="flex-1 min-w-0 text-left cursor-pointer outline-none"
              >
                <p
                  className="truncate text-[13.5px] font-black tracking-[-0.01em]"
                  style={{ color: "var(--text-0)" }}
                >
                  {user?.pseudo ? `${user.pseudo}, passe Premium` : "Passe Premium"}
                  <span style={{ color: "var(--accent)" }}> · {prix}/mois</span>
                </p>
                <p
                  className="truncate text-[11.5px] font-medium"
                  style={{ color: "var(--text-3)" }}
                >
                  {benefice}
                </p>
              </button>

              {/* CTA */}
              <button
                type="button"
                onClick={ouvrirPremium}
                aria-label="Découvrir Premium"
                className="flex flex-shrink-0 items-center gap-0.5 rounded-xl px-3 py-2 text-[12px] font-bold text-white cursor-pointer outline-none"
                style={{
                  background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                  boxShadow: "0 4px 14px -4px rgba(193,59,193,0.6)",
                }}
              >
                Voir
                <ChevronRight size={13} strokeWidth={2.6} />
              </button>

              {/* Fermer */}
              <button
                type="button"
                onClick={() => setVisible(false)}
                aria-label="Fermer"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full cursor-pointer outline-none"
                style={{ background: "rgba(var(--tint-violet-rgb),0.9)" }}
              >
                <X size={13} strokeWidth={2.4} style={{ color: "var(--text-3)" }} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
