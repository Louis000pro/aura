"use client";

/* ─────────────────────────────────────────────────────────────────────
   « MA JOURNÉE » EN BENTO (essai verre, validé en maquette par Louis le
   2026-10-11 : `docs/maquettes/trois-accueils.html`, variante 2).

   Sous le héros, une grille de trois tuiles de verre, puis les quêtes
   qui restent en cartes illustrées qui défilent sur le côté :
     · la SÉRIE, en grand, avec les jours validés de la semaine ;
     · le RANG, sa gemme, et l'EXP (le seul affichage d'EXP de l'accueil) ;
     · l'avancée des QUÊTES du jour, en anneau ;
     · le rail : les quêtes du jour pas encore remplies, plus la mission
       Premium du jour.

   Il ne décide RIEN : tout vient de `aura` (l'évaluation de la base) et de
   `missionsAccueil.ts`. Une quête déjà remplie quitte le rail ; la grille
   en garde le compte.
   ───────────────────────────────────────────────────────────────────── */

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import GemmeRang from "@/components/GemmeRang";
import { MISSIONS_JOUR, resteMission, type EtatAura, type Mission } from "@/lib/aura";
import { apercuPremiumDuJour, compteMissionsJour, missionDebloquee } from "@/lib/missionsAccueil";
import styles from "./MaJournee.module.css";

export default function MaJournee({
  aura,
  jour,
  premiumDebloque,
  expGain,
  reduce,
  onNavigate,
  onVoirTout,
  onOpenRangs,
}: {
  aura: EtatAura;
  /** Le jour parisien courant, `YYYY-MM-DD` : il décide quelle mission
   *  Premium est mise en avant (rotation déterministe). */
  jour: string;
  premiumDebloque: boolean;
  expGain: number | null;
  reduce: boolean;
  onNavigate: (path: string) => void;
  onVoirTout: () => void;
  onOpenRangs: () => void;
}) {
  const { fait, total } = compteMissionsJour(aura);
  const semaine = Math.max(0, Math.min(7, aura.detail.joursActifsSemaine));
  const part = total > 0 ? fait / total : 0;

  // « Journée complète » se remplit toute seule : elle reste dans le compte,
  // pas dans le rail, où elle se lirait comme un geste à faire.
  const restantes = MISSIONS_JOUR.filter((m) => m.id !== "journee" && !aura.missions[m.id]?.complete);
  const premium = apercuPremiumDuJour(jour);
  const rail: Mission[] = [...restantes, ...(premium && !aura.missions[premium.id]?.complete ? [premium] : [])];

  const R = 16;
  const C = 2 * Math.PI * R;

  return (
    <section className={styles.bloc} aria-label="Ma journée">
      <div className={styles.bento}>
        <button type="button" className={`${styles.tuile} ${styles.serie}`} onClick={onOpenRangs}>
          <small>Série</small>
          <span className={styles.flamme} aria-hidden="true">🔥</span>
          <span className={styles.valeur}>
            <b className="vy-nombre">{aura.serie}</b>
            <small>{aura.serie > 1 ? "jours" : "jour"}</small>
          </span>
          <span className={styles.jours} aria-label={`${semaine} jours validés cette semaine`}>
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} data-on={i < semaine ? "" : undefined} />
            ))}
          </span>
          <small className={styles.statut}>
            {aura.jourValide ? "Journée validée" : "Une action pour continuer"}
          </small>
        </button>

        <button type="button" className={`${styles.tuile} ${styles.ligne}`} onClick={onOpenRangs}>
          <GemmeRang rang={aura.rang} size={34} flotte={false} />
          <span className={styles.texte}>
            <small>Rang</small>
            <strong>{aura.rang.nom}</strong>
            <span className={styles.exp}>
              <b className="vy-nombre">{aura.exp}</b> / {aura.seuilHaut} EXP
              <AnimatePresence>
                {expGain !== null && (
                  <motion.em
                    initial={reduce ? false : { opacity: 0, y: 6, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    +{expGain}
                  </motion.em>
                )}
              </AnimatePresence>
            </span>
          </span>
        </button>

        <button type="button" className={`${styles.tuile} ${styles.ligne}`} onClick={onVoirTout}>
          <svg className={styles.anneau} viewBox="0 0 40 40" aria-hidden="true">
            <defs>
              <linearGradient id="anneau-quetes" x1="0" x2="1">
                <stop offset="0" stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#C13BC1" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r={R} className={styles.anneauFond} />
            <circle
              cx="20" cy="20" r={R}
              className={styles.anneauPlein}
              strokeDasharray={`${C * part} ${C}`}
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span className={styles.texte}>
            <small>Quêtes</small>
            <strong className="vy-nombre">{fait} / {total}</strong>
          </span>
        </button>
      </div>

      <button type="button" className={styles.titre} onClick={onVoirTout}>
        <span>Tes quêtes</span>
        <span className={styles.voir}>
          Voir tout <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </button>

      {rail.length > 0 ? (
        <div className={styles.rail}>
          {rail.map((m) => (
            <CarteQuete
              key={m.id}
              mission={m}
              reste={resteMission(m, aura.missions[m.id])}
              debloquee={missionDebloquee(m, premiumDebloque)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <div className={styles.fini}>Toutes tes quêtes du jour sont faites.</div>
      )}
    </section>
  );
}

function CarteQuete({
  mission,
  reste,
  debloquee,
  onNavigate,
}: {
  mission: Mission;
  reste: string | null;
  debloquee: boolean;
  onNavigate: (path: string) => void;
}) {
  const cible = !debloquee ? "/premium" : mission.route;
  return (
    <button
      type="button"
      className={styles.carte}
      data-premium={mission.premium ? "" : undefined}
      onClick={() => cible && onNavigate(cible)}
      disabled={!cible}
    >
      <span className={styles.picto}>
        <Image src={mission.image} alt="" width={46} height={46} />
        {!debloquee && (
          <span className={styles.cadenas} aria-label="Premium">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
        )}
      </span>
      <b>{mission.titre}</b>
      {reste && <small>{reste}</small>}
      <span className={`${styles.sceau} vy-nombre`}>+{mission.exp}</span>
    </button>
  );
}
