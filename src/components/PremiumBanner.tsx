"use client";

/*
 * Rappel Premium occasionnel.
 *
 * - Jamais pour un abonné.
 * - Jamais sur l'accueil, qui porte sa propre campagne, ni sur les pages
 *   publiques / Premium.
 * - Une apparition maximum tous les 7 jours et par utilisateur.
 * - Fermeture automatique après 7 secondes.
 * - `?promo=1` reste la trappe de contrôle, sans modifier la cadence réelle.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { AssistantSpark } from "@/components/AssistantMark";
import { useAuth } from "@/context/AuthContext";
import { PLANS, formatPrice } from "@/lib/plans";
import styles from "./PremiumBanner.module.css";

const DELAI_APPARITION = 2900;
const DUREE_AFFICHAGE = 7000;
const CADENCE_RAPPEL = 7 * 24 * 60 * 60 * 1000;
const CLE_RAPPEL = "vaiiya:premium-rappel:v3";

let utilisateurMontreDansCeChargement: string | null = null;

const BENEFICES = [
  "Des missions en plus pour faire monter ton EXP.",
  "Ton analyse nutrition, sans compteur.",
  "Tous les détails de tes entraînements.",
  "Des programmes et entraînements exclusifs.",
  "Ton coach ✦ disponible en illimité.",
];

function dernierRappel(userId: string) {
  try {
    const rappels = JSON.parse(localStorage.getItem(CLE_RAPPEL) ?? "{}") as Record<string, number>;
    return Number(rappels[userId]) || 0;
  } catch {
    return 0;
  }
}

function memoriserRappel(userId: string) {
  try {
    const rappels = JSON.parse(localStorage.getItem(CLE_RAPPEL) ?? "{}") as Record<string, number>;
    localStorage.setItem(CLE_RAPPEL, JSON.stringify({ ...rappels, [userId]: Date.now() }));
  } catch {
    // Le rappel reste fonctionnel si le stockage privé du navigateur est bloqué.
  }
}

export default function PremiumBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [benefice, setBenefice] = useState(BENEFICES[0]);

  const estAbonne = !!user?.is_premium;
  const pageExclue =
    pathname === "/" ||
    pathname.startsWith("/premium") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/rejoindre");

  useEffect(() => {
    if (!user) {
      utilisateurMontreDansCeChargement = null;
      setVisible(false);
      return;
    }

    const force = new URLSearchParams(window.location.search).get("promo") === "1";
    if (!force) {
      if (estAbonne || pageExclue) {
        setVisible(false);
        return;
      }
      if (utilisateurMontreDansCeChargement === user.id) return;
      if (Date.now() - dernierRappel(user.id) < CADENCE_RAPPEL) return;
    }

    utilisateurMontreDansCeChargement = user.id;
    setBenefice(BENEFICES[Math.floor(Math.random() * BENEFICES.length)]);

    const ouverture = window.setTimeout(() => {
      if (!force) memoriserRappel(user.id);
      setVisible(true);
    }, force ? 350 : DELAI_APPARITION);

    return () => window.clearTimeout(ouverture);
  }, [user, estAbonne, pageExclue, pathname]);

  useEffect(() => {
    if (!visible) return;
    const fermeture = window.setTimeout(() => setVisible(false), DUREE_AFFICHAGE);
    return () => window.clearTimeout(fermeture);
  }, [visible]);

  const ouvrirPremium = () => {
    setVisible(false);
    router.push("/premium");
  };

  const prix = formatPrice(PLANS.premium.priceCents);

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -36, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.98 }}
          transition={reduce
            ? { duration: 0.18 }
            : { type: "spring", stiffness: 390, damping: 30, mass: 0.85 }}
          className={styles.position}
          style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
          aria-label="Découvrir Vaiiya Premium"
        >
          <div className={styles.halo} aria-hidden="true" />

          <div className={styles.border}>
            <div className={styles.card}>
              <div className={styles.topline}>
                <div className={styles.spark}>
                  <AssistantSpark px={30} />
                </div>

                <div className={styles.heading}>
                  <span className={styles.eyebrow}>VAIIYA PREMIUM</span>
                  <h2 className={styles.title}>
                    {user?.pseudo ? `${user.pseudo}, va plus loin.` : "Va plus loin avec Vaiiya."}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className={styles.close}
                  aria-label="Fermer le rappel Premium"
                >
                  <X size={17} strokeWidth={2.3} />
                </button>
              </div>

              <p className={styles.benefit}>{benefice}</p>

              <div className={styles.actions}>
                <div className={styles.price}>
                  <strong>{prix}</strong>
                  <span>/ mois · 3 jours offerts</span>
                </div>

                <button type="button" onClick={ouvrirPremium} className={styles.cta}>
                  Découvrir Premium
                  <ArrowRight size={17} strokeWidth={2.5} />
                </button>
              </div>

              <div
                className={`${styles.timer} ${reduce ? styles.timerReduced : ""}`}
                aria-hidden="true"
              />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
