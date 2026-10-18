"use client";

/* ─────────────────────────────────────────────────────────────────────
   « MA JOURNÉE » EN BENTO (essai verre, validé en maquette par Louis le
   2026-10-11 : `docs/maquettes/trois-accueils.html`, variante 2).

   Sous le héros, une grille de trois tuiles de verre, puis les quêtes
   qui restent en cartes illustrées qui défilent sur le côté :
     · le RANG, en grand : sa gemme, l'EXP (le seul affichage d'EXP de
       l'accueil) et la barre jusqu'au rang suivant ;
     · la SÉRIE, avec ses jours en sept traits (jour 1 à jour 7) ;
     · l'avancée des QUÊTES du jour, en anneau ;
     · le rail : les quêtes du jour pas encore remplies, plus la mission
       Premium du jour.

   Il ne décide RIEN : tout vient de `aura` (l'évaluation de la base) et de
   `missionsAccueil.ts`. Une quête déjà remplie quitte le rail ; la grille
   en garde le compte.

   ⭐ LA FLAMME MONTE (Louis, 2026-10-17, page « Revenir chaque jour ») :
   à l'ouverture où la série a grandi, la tuile rejoue la montée (souffle,
   chiffre, trait, puis l'EXP qui part vers le rang). `lib/monteeSerie.ts`
   décide si elle joue ; ce fichier ne fait que la dessiner, une fois, et
   jamais quand il faut réduire les animations.
   ───────────────────────────────────────────────────────────────────── */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import GemmeRang from "@/components/GemmeRang";
import FlammeSerie from "@/components/serie/FlammeSerie";
import { MISSIONS_JOUR, progressionRang, resteMission, type EtatAura, type Mission } from "@/lib/aura";
import { etatFlamme } from "@/lib/flammesSerie";
import { decideMontee, lireVuSerie, noterVuSerie, type Montee } from "@/lib/monteeSerie";
import { publierFlamme } from "@/lib/evenementsFil";
import { apercuPremiumDuJour, compteMissionsJour, missionDebloquee } from "@/lib/missionsAccueil";
import styles from "./MaJournee.module.css";

/** Le jour parisien, `YYYY-MM-DD` : la clé d'une flamme dans le fil. */
const jourParis = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

/** Les temps de la montée, en secondes : chaque geste répond au précédent. */
const T = { souffle: 0.15, chiffre: 0.35, bascule: 0.75, jeton: 0.8, rang: 1.55, fin: 3.4 };

type Point = { x: number; y: number };
type MonteeVue = Montee & { trajet: { de: Point; a: Point } | null };

function useMontee(
  userId: string | undefined,
  serie: number,
  exp: number,
  reduce: boolean,
  mesurer: () => MonteeVue["trajet"],
): { montee: MonteeVue | null; bascule: boolean } {
  const [montee, setMontee] = useState<MonteeVue | null>(null);
  const [bascule, setBascule] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const actuel = { serie, exp };
    const brut = decideMontee(lireVuSerie(userId), actuel);
    // Une flamme qui naît se raconte dans le fil des potes, animation ou non.
    if (brut && brut.palierApres !== brut.palierAvant) publierFlamme(userId, brut.palierApres, brut.aSerie, jourParis());
    const m = reduce ? null : brut;
    if (!m) {
      noterVuSerie(userId, actuel);
      return;
    }
    // Noté au moment où elle part, pas avant : un démontage entre-temps
    // (React rejoue les effets en mode strict) ne doit pas la consommer.
    const t = setTimeout(() => {
      noterVuSerie(userId, actuel);
      setBascule(false);
      setMontee({ ...m, trajet: mesurer() });
    }, 250);
    return () => clearTimeout(t);
  }, [userId, serie, exp, reduce, mesurer]);

  useEffect(() => {
    if (!montee) return;
    const b = setTimeout(() => setBascule(true), T.bascule * 1000);
    const f = setTimeout(() => setMontee(null), T.fin * 1000);
    return () => { clearTimeout(b); clearTimeout(f); };
  }, [montee]);

  return { montee, bascule };
}

/** Quatre braises qui montent de la flamme, une seule fois. */
function Etincelles() {
  const braises: [number, number, number][] = [[-9, -24, 0], [3, -30, 0.05], [11, -20, 0.1], [-3, -34, 0.15]];
  return (
    <>
      {braises.map(([x, y, d], i) => (
        <motion.i
          key={i}
          className={styles.etincelle}
          aria-hidden="true"
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], x, y }}
          transition={{ delay: T.souffle + 0.1 + d, duration: 0.7, times: [0, 0.2, 1], ease: "easeOut" }}
        />
      ))}
    </>
  );
}

export default function MaJournee({
  aura,
  userId,
  jour,
  premiumDebloque,
  expGain,
  reduce,
  onNavigate,
  onVoirTout,
  onOpenRangs,
  onOpenSerie,
}: {
  aura: EtatAura;
  /** Le compte : la montée compare à ce que CET appareil a déjà montré. */
  userId?: string;
  /** Le jour parisien courant, `YYYY-MM-DD` : il décide quelle mission
   *  Premium est mise en avant (rotation déterministe). */
  jour: string;
  premiumDebloque: boolean;
  expGain: number | null;
  reduce: boolean;
  onNavigate: (path: string) => void;
  onVoirTout: () => void;
  onOpenRangs: () => void;
  /** La flamme ouvre les jours de la série, jamais les rangs (Louis, 2026-10-15). */
  onOpenSerie: () => void;
}) {
  const { fait, total } = compteMissionsJour(aura);
  const part = total > 0 ? fait / total : 0;
  // La série commence à UN jour, jamais à zéro (Louis, 2026-10-11) : voir
  // « 0 jour » ne donne pas envie de continuer. Aujourd'hui compte déjà.
  const serie = Math.max(1, aura.serie);

  // La montée : le jeton d'EXP vole de la tuile de série au chiffre du rang,
  // donc on mesure les deux au moment où elle part.
  const bentoRef = useRef<HTMLDivElement>(null);
  const serieRef = useRef<HTMLButtonElement>(null);
  const expRef = useRef<HTMLSpanElement>(null);
  const mesurer = useCallback((): MonteeVue["trajet"] => {
    const b = bentoRef.current?.getBoundingClientRect();
    const s = serieRef.current?.getBoundingClientRect();
    const e = expRef.current?.getBoundingClientRect();
    if (!b || !s || !e) return null;
    return {
      de: { x: s.right - b.left - 78, y: s.top - b.top + 8 },
      a: { x: e.left - b.left + e.width / 2 - 32, y: e.top - b.top - 6 },
    };
  }, []);
  const { montee, bascule } = useMontee(userId, serie, aura.exp, reduce, mesurer);
  // Pendant la montée, la tuile montre HIER jusqu'à la bascule, puis aujourd'hui.
  const avant = !!montee && !bascule;
  const serieVue = montee && avant ? montee.deSerie : serie;
  const changePalier = !!montee && montee.palierAvant !== montee.palierApres;
  const gagne = montee ? montee.aExp - montee.deExp : 0;

  // Les sept traits suivent la SÉRIE, pas la semaine civile (Louis, 2026-10-17) :
  // jour 1 = un trait, jour 7 = les sept, puis un nouveau tour de sept repart.
  // Avant, ils comptaient les jours avec séance ou repas : un jour où l'on
  // n'avait fait qu'ouvrir Vaiiya tenait la flamme mais n'allumait rien.
  const allumes = ((serie - 1) % 7) + 1;
  const allumesHier = montee ? ((montee.deSerie - 1) % 7) + 1 : allumes;
  // La flamme et l'habit de la tuile suivent le palier de la série.
  const flamme = etatFlamme(serieVue);

  // « Journée complète » se remplit toute seule : elle reste dans le compte,
  // pas dans le rail, où elle se lirait comme un geste à faire.
  const restantes = MISSIONS_JOUR.filter((m) => m.id !== "journee" && !aura.missions[m.id]?.complete);
  const premium = apercuPremiumDuJour(jour);
  const rail: Mission[] = [...restantes, ...(premium && !aura.missions[premium.id]?.complete ? [premium] : [])];

  // La même mesure que la galerie des rangs et le profil.
  const { part: progres, suivant, rang: rangActuel } = progressionRang(aura.exp);
  // La barre ne pousse que dans le même rang : un changement de rang a sa
  // propre célébration, et une barre qui recule n'a rien d'une montée.
  const partHier = montee && progressionRang(montee.deExp).rang.id === rangActuel.id ? progressionRang(montee.deExp).part : null;

  const R = 16;
  const C = 2 * Math.PI * R;

  return (
    <section className={styles.bloc} aria-label="Ma journée">
      <div className={styles.bento} ref={bentoRef}>
        {/* Le RANG prend la grande tuile (Louis, 2026-10-11). Son halo prend
            la couleur de la gemme : Bronze cuivré, Argent froid, Or chaud…
            donc la tuile change d'ambiance à chaque montée de rang. */}
        <button
          type="button"
          className={`${styles.tuile} ${styles.rang}`}
          style={{ "--halo": aura.rang.neon[0], "--halo-2": aura.rang.neon[1] } as React.CSSProperties}
          onClick={onOpenRangs}
        >
          <small>Rang</small>
          <span className={styles.gemme}>
            <GemmeRang rang={aura.rang} size={64} flotte={false} />
          </span>
          <strong className={styles.rangNom}>{aura.rang.nom}</strong>
          <span className={styles.exp} ref={expRef}>
            {montee && gagne > 0 ? (
              <span className={styles.rouleauExp}>
                <motion.span
                  className={styles.rouleau}
                  initial={{ y: 0 }}
                  animate={{ y: "-50%" }}
                  transition={{ delay: T.rang, duration: 0.4, ease: [0.3, 1.4, 0.5, 1] }}
                >
                  <b className="vy-nombre">{montee.deExp}</b>
                  <b className="vy-nombre">{montee.aExp}</b>
                </motion.span>
              </span>
            ) : (
              <b className="vy-nombre">{aura.exp}</b>
            )}
            {suivant ? ` / ${suivant.min}` : ""} EXP
            <AnimatePresence>
              {montee && gagne > 0 ? (
                <motion.em
                  key="montee"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: T.rang + 0.05, duration: 0.3 }}
                >
                  +{gagne}
                </motion.em>
              ) : expGain !== null && (
                <motion.em
                  key="gain"
                  initial={reduce ? false : { opacity: 0, y: 6, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  +{expGain}
                </motion.em>
              )}
            </AnimatePresence>
          </span>
          <span className={styles.progres} aria-hidden="true">
            {montee && partHier !== null ? (
              <motion.i
                key="montee"
                initial={{ width: `${partHier * 100}%` }}
                animate={{ width: `${progres * 100}%` }}
                transition={{ delay: T.rang, duration: 0.6, ease: "easeOut" }}
              />
            ) : (
              <i key="repos" style={{ width: `${progres * 100}%` }} />
            )}
          </span>
        </button>

        <button
          type="button"
          ref={serieRef}
          className={`${styles.tuile} ${styles.serie}`}
          // La tuile change d'habit à chaque flamme (Louis, 2026-10-17) : le
          // verre nu, la pêche, l'orange, l'or, puis l'or lumineux.
          data-palier={flamme.palier.id}
          data-eclat={montee && changePalier && !avant ? "" : undefined}
          aria-label={`${serie} ${serie > 1 ? "jours d’affilée" : "jour de série"}, flamme ${etatFlamme(serie).palier.nom}${etatFlamme(serie).nouvelle ? ", nouvelle aujourd’hui" : ""}`}
          onClick={onOpenSerie}
        >
          <span className={styles.serieTete}>
            {/* Le nombre de jours d'affilée se colle à la flamme (Louis, 2026-10-17). */}
            <span className={styles.flammeBoite}>
              {montee && changePalier && !avant ? (
                <motion.span
                  key="nouvelle"
                  className={styles.flammeVivante}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.22, 1], opacity: [0, 1, 1] }}
                  transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                >
                  <FlammeSerie jours={serieVue} taille={26} />
                </motion.span>
              ) : (
                <motion.span
                  key="flamme"
                  className={styles.flammeVivante}
                  animate={montee ? { scale: [1, 1.34, 1] } : { scale: 1 }}
                  transition={montee ? { delay: T.souffle, duration: 0.55, times: [0, 0.45, 1] } : { duration: 0 }}
                >
                  <FlammeSerie jours={serieVue} taille={26} />
                </motion.span>
              )}
              {montee && <Etincelles />}
              {montee && changePalier && !avant && (
                <motion.i
                  className={styles.onde}
                  aria-hidden="true"
                  initial={{ scale: 0.4, opacity: 0.9 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              )}
            </span>
            {montee ? (
              <span className={styles.rouleauBoite}>
                <motion.span
                  className={styles.rouleau}
                  initial={{ y: 0 }}
                  animate={{ y: "-50%" }}
                  transition={{ delay: T.chiffre, duration: 0.4, ease: [0.3, 1.4, 0.5, 1] }}
                >
                  <b className={`${styles.serieNombre} vy-nombre`}>{montee.deSerie}</b>
                  <b className={`${styles.serieNombre} vy-nombre`}>{montee.aSerie}</b>
                </motion.span>
              </span>
            ) : (
              <b className={`${styles.serieNombre} vy-nombre`}>{serie}</b>
            )}
            <span className={styles.texte}>
              <small>{serieVue > 1 ? "jours" : "jour"}</small>
              {/* Le jour où une flamme arrive, son nom remplace « d'affilée ». */}
              {flamme.nouvelle
                ? <small className={styles.nouvelle}>{flamme.palier.nom}</small>
                : <small>{serieVue > 1 ? "d’affilée" : "de série"}</small>}
            </span>
          </span>
          <span className={styles.jours} aria-label={`Jour ${allumes} sur 7`}>
            {Array.from({ length: 7 }, (_, i) => (
              <i
                key={i}
                data-on={i < allumes ? "" : undefined}
                // Pendant la montée, le trait du jour s'allume après le chiffre.
                data-neuf={montee && i >= allumesHier && i < allumes ? "" : undefined}
              />
            ))}
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

        {/* L'EXP gagnée depuis la dernière visite part de la série vers le
            rang : la récompense de connexion existait, elle se voit enfin.
            ⚠️ « +20 » seul, comme les deux autres gains du rang : le mot
            « EXP » ne s'écrit qu'une fois sur l'accueil, à l'arrivée du jeton. */}
        {montee?.trajet && gagne > 0 && (
          <motion.span
            className={styles.jeton}
            aria-hidden="true"
            initial={{ x: montee.trajet.de.x, y: montee.trajet.de.y, opacity: 0, scale: 0.6 }}
            animate={{
              x: [montee.trajet.de.x, montee.trajet.de.x, montee.trajet.a.x, montee.trajet.a.x],
              y: [montee.trajet.de.y, montee.trajet.de.y - 6, montee.trajet.a.y, montee.trajet.a.y],
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.08, 0.85, 0.7],
            }}
            transition={{ delay: T.jeton, duration: 0.85, times: [0, 0.2, 0.85, 1], ease: "easeInOut" }}
          >
            +{gagne}
          </motion.span>
        )}
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
