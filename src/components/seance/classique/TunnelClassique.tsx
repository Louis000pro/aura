"use client";

/* ════════════════════════════════════════════════════════════════════
   LE CHRONO DES CLASSIQUES (maquette « Le chrono et le score », version 3 ;
   GO de Louis le 2026-11-01).

   Pendant l'effort d'un classique, ce composant prend tout le tunnel :
   le chrono en grand, le personnage qui joue le geste, ce qu'il reste à
   faire, et ton meilleur. Cinq façons de compter, cinq écrans proches :
     · au chrono (Le Décompte…)  : le chrono monte, une étape après l'autre ;
     · le max (12 ou 20 minutes) : le chrono descend, les tours s'enchaînent,
       puis « TEMPS ! » et la grille des répétitions du tour en cours ;
     · le compte (les burpees)   : le chrono descend, on touche à chaque burpee ;
     · la tenue (la chaise)      : le chrono monte jusqu'à « J'arrête » ;
     · la minute (une de plus)   : un burpee de plus chaque minute.

   ⚠️ L'HORLOGE EST CELLE DU TUNNEL (`elapsed`, `secondes`) : la pause,
   l'écran qui se verrouille et l'arrêt passent tous par lui, et le
   journal garde la même durée que l'écran. Le chrono du classique part
   après son 3-2-1 (`depart`), sauf si l'intro « Prêt ? » vient de jouer
   le sien.

   ⚠️ TON MEILLEUR NE SE MONTRE QUE DEVANT (Louis, 2026-10-31) : l'avance
   en répétitions, jamais un retard. Dans la dernière minute d'un max,
   l'écran dit ce qu'il reste pour le battre, et c'est tout.

   ⚠️ RIEN NE S'ÉCRIT ICI : la fin passe par `onFin`, et c'est le tunnel
   qui donne l'essai au journal (une seule autorité de fin de séance).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Pause, Play, Star, X } from "lucide-react";
import SceneTunnel from "@/components/seance/SceneTunnel";
import TexteAjuste from "@/components/seance/classique/TexteAjuste";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { jouerSon } from "@/lib/sons";
import {
  avanceSurMeilleur, chrono, dateLongue, meilleurQue, milliers, minuteEnCours, minuteRatee, morceauNumero,
  morceauxAuChrono, pourBattre, repsApres, repsAuTotal, scoreLong, scoreMinute, scoreReps, scoreTemps, scoreTenue,
  scoreTours, tempsCourt, typo, unite,
  type Classique, type ScoreClassique, type ScoreDate,
} from "@/lib/classiques";
import styles from "./TunnelClassique.module.css";

const E = {
  t1: "#1D1530", t2: "#6B6580", t3: "#9A93AE", feu: "#B4470A", feuVif: "#E8620C", orange: "#FF7A1A",
  teal: "#2BD4A0", tealEncre: "#0B8A68", lav: "#6B4BD6",
};
const DEGRADE = "linear-gradient(100deg,#8B5CF6,#C13BC1)";
const TEXTE_DEGRADE: React.CSSProperties = {
  background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
};
const NB = String.fromCharCode(160);
const CHIFFRE: React.CSSProperties = { fontWeight: 800 };
const MOT: React.CSSProperties = { fontWeight: 900, fontVariationSettings: "var(--w-voix)", letterSpacing: "-0.01em" };

/** Ce qu'un essai laisse au tunnel, qui le donne au journal. */
export type ResultatClassique = {
  score: ScoreClassique | null;
  passages: number[];
  partiel?: number;
  compte?: number;
  tenue?: number;
};

function vibrer(p: number | number[]) {
  try { navigator.vibrate?.(p); } catch { /* le téléphone ne vibre pas : rien à faire */ }
}

/** L'étiquette du haut : le nom, et la façon de jouer quand le nom ne la dit pas. */
function etiquetteDe(c: Classique): string {
  return c.format === "temps" ? `${c.titre} · au chrono` : c.titre;
}

export default function TunnelClassique({
  classique: c, elapsed, secondes, paused, onPause, onQuitter, onFin, meilleur, sansDecompte,
}: {
  classique: Classique;
  /** L'horloge du tunnel, en secondes entières (elle s'arrête en pause). */
  elapsed: number;
  /** La même horloge, à la fraction de seconde : l'instant d'un « Fait ». */
  secondes: () => number;
  paused: boolean;
  onPause: () => void;
  /** Rien n'a été fait : on ferme, rien n'est gardé. */
  onQuitter: () => void;
  onFin: (r: ResultatClassique) => void;
  /** Ton meilleur sur ce classique, ou `null` (premier essai, ou la base
   *  n'a pas répondu : l'écran ne dit alors rien de ton meilleur). */
  meilleur: ScoreDate | null;
  /** L'intro « Prêt ? » vient de jouer son 3-2-1. */
  sansDecompte: boolean;
}) {
  const [depart] = useState(() => (sansDecompte ? 0 : 3));
  const [passages, setPassages] = useState<number[]>([]);
  const [arret, setArret] = useState(false);
  const [partiel, setPartiel] = useState<number | null>(null);
  const [correction, setCorrection] = useState<number | null>(null);
  const [indice, setIndice] = useState(false);
  const pauseParArret = useRef(false);
  const finie = useRef(false);

  const enDecompte = elapsed < depart;
  const t = Math.max(0, elapsed - depart);
  const tPrecis = () => Math.max(0, secondes() - depart);

  const faits = passages.length;
  const morceaux = useMemo(() => morceauxAuChrono(c), [c]);
  const auMorceau = c.sorte === "temps" || c.sorte === "tours";
  const enCours = auMorceau ? morceauNumero(c, faits) : null;
  const suivant = auMorceau ? morceauNumero(c, faits + 1) : null;
  const plafond = c.plafond ?? 0;
  const aRebours = c.sorte === "tours" || c.sorte === "reps";
  const reste = aRebours ? Math.max(0, plafond - t) : 0;
  const sonne = aRebours && !enDecompte && t >= plafond;
  const derniereMinute = aRebours && !enDecompte && !sonne && reste <= 60;
  const minute = minuteEnCours(t);
  const minuteFaite = c.sorte === "minute" && faits >= minute;

  /* ── Les sons : le 3-2-1, les trois dernières secondes, la sonnerie ── */
  const dernierSon = useRef<string>("");
  useEffect(() => {
    if (paused) return;
    const jouer = (cle: string, son: Parameters<typeof jouerSon>[0], v?: number | number[]) => {
      if (dernierSon.current === cle) return;
      dernierSon.current = cle;
      jouerSon(son);
      if (v) vibrer(v);
    };
    if (enDecompte) jouer(`dec-${depart - elapsed}`, "tic");
    else if (depart > 0 && elapsed === depart) jouer("go", "go", 60);
    if (aRebours && !enDecompte) {
      if (reste > 0 && reste <= 3) jouer(`fin-${reste}`, "tic");
      if (sonne) jouer("sonnerie", "finEffort", [120, 60, 120]);
    }
    if (c.sorte === "minute" && !enDecompte && t % 60 === 0 && t > 0) jouer(`min-${minute}`, "go", 40);
  }, [elapsed, paused, enDecompte, depart, aRebours, reste, sonne, c.sorte, t, minute]);

  /* ── La minute ratée : c'est la fin, et la dernière minute finie est le score ── */
  useEffect(() => {
    if (c.sorte !== "minute" || enDecompte || paused || finie.current) return;
    if (!minuteRatee(t, faits) && t < plafond) return;
    finie.current = true;
    jouerSon("finEffort");
    vibrer([90, 50, 90]);
    const score = scoreMinute(c, passages);
    if (score) onFin({ score, passages });
    else onQuitter();
  }, [c, t, faits, passages, enDecompte, paused, plafond, onFin, onQuitter]);

  /* ── Les gestes ── */
  const fait = () => {
    if (enDecompte || paused || sonne || finie.current) return;
    if (c.sorte === "minute" && minuteFaite) return;
    const suite = [...passages, Math.round(tPrecis() * 10) / 10];
    setPassages(suite);
    vibrer(25);
    if (c.sorte === "temps" && suite.length >= morceaux.length) {
      finie.current = true;
      jouerSon("finEffort");
      vibrer([90, 50, 90]);
      onFin({ score: scoreTemps(c, suite), passages: suite });
    }
  };
  const revenir = () => {
    if (paused || finie.current) return;
    setPassages((p) => p.slice(0, -1));
  };
  const jArrete = () => {
    if (enDecompte || finie.current) return;
    finie.current = true;
    jouerSon("finEffort");
    const s = tPrecis();
    const score = scoreTenue(c, s);
    if (score) onFin({ score, passages: [], tenue: s });
    else onQuitter();
  };

  const ouvrirArret = () => {
    if (!paused && !enDecompte) { pauseParArret.current = true; onPause(); }
    setArret(true);
  };
  const continuer = () => {
    setArret(false);
    if (pauseParArret.current) { pauseParArret.current = false; onPause(); }
  };
  const arreter = () => {
    setArret(false);
    pauseParArret.current = false;
    finie.current = true;
    if (c.sorte === "tenue") {
      const s = tPrecis();
      const score = scoreTenue(c, s);
      return score ? onFin({ score, passages: [], tenue: s }) : onQuitter();
    }
    if (c.sorte === "minute") {
      const score = scoreMinute(c, passages);
      return score ? onFin({ score, passages }) : onQuitter();
    }
    if (faits === 0) return onQuitter();
    /* Au chrono, le max et le compte : ce qui est fait est gardé, sans score. */
    onFin({ score: null, passages, ...(c.sorte === "reps" ? { compte: faits } : {}) });
  };

  const voirScore = () => {
    if (finie.current) return;
    if (c.sorte === "tours") {
      if (partiel === null) { setIndice(true); return; }
      finie.current = true;
      const s = scoreTours(c, passages, partiel);
      onFin({ score: s.valeur > 0 ? s : null, passages, partiel });
      return;
    }
    finie.current = true;
    const n = correction ?? faits;
    onFin({ score: scoreReps(c, passages, n), passages, compte: n });
  };

  /* ── Ton meilleur, pendant l'effort ── */
  const avance = !enDecompte && meilleur && (auMorceau || c.sorte === "reps") ? avanceSurMeilleur(c, faits, meilleur, t) : 0;
  const besoin = derniereMinute && meilleur ? pourBattre(c, repsApres(c, faits), meilleur) : null;
  const scoreEnCours = c.sorte === "tours" ? scoreTours(c, passages, 0) : null;

  const texteArret = c.sorte === "tenue"
    ? "Le temps tenu devient ton score."
    : c.sorte === "minute"
      ? (faits ? `Ton score est gardé : minute ${faits}.` : "Aucune minute n'est finie : rien n'est gardé.")
      : faits ? "Ce que tu as fait est gardé dans ta séance, sans score cette fois." : "Tu n'as encore rien fait : rien n'est gardé.";

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className={styles.chaleur} data-on={derniereMinute ? "1" : "0"} aria-hidden="true" />
      <div className="relative flex flex-col h-full overflow-y-auto px-5 pt-4" style={{ scrollbarWidth: "none" }}>
        {/* ── L'en-tête : le nom, la pause, l'arrêt ── */}
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-[13px] font-bold px-3.5 py-2 rounded-full truncate min-w-0"
            style={{ background: "rgba(255,122,26,0.10)", border: "1px solid rgba(232,98,12,0.28)", color: E.feu }}>
            {etiquetteDe(c)}
          </span>
          {sonne ? (
            <span className="flex items-baseline gap-1.5 flex-shrink-0">
              <span className="text-[13px] font-bold" style={{ color: E.feu }}>Fini</span>
              <span className="vy-nombre text-[26px]" style={{ ...CHIFFRE, color: E.feuVif }}>00:00</span>
            </span>
          ) : (
            <div className="flex gap-2.5 flex-shrink-0">
              <RondBouton onClick={onPause} label={paused ? "Reprendre" : "Mettre en pause"}>
                {paused ? <Play size={18} strokeWidth={2.4} /> : <Pause size={18} strokeWidth={2.4} />}
              </RondBouton>
              <RondBouton onClick={ouvrirArret} label="Arrêter">
                <X size={18} strokeWidth={2.4} />
              </RondBouton>
            </div>
          )}
        </div>

        {sonne ? (
          <Sonnerie c={c} passages={passages} partiel={partiel} setPartiel={(n) => { setPartiel(n); setIndice(false); }}
            correction={correction} setCorrection={setCorrection} meilleur={meilleur} indice={indice}
            onScore={voirScore} onPasEncore={() => { setPartiel(0); setIndice(false); if (!finie.current) { finie.current = true; const s = scoreTours(c, passages, 0); onFin({ score: s.valeur > 0 ? s : null, passages, partiel: 0 }); } }} />
        ) : (
          <>
            {/* ── Le chrono ── */}
            <div className="flex-shrink-0 mt-3">
              <div className="flex items-center justify-between gap-2 h-[26px]">
                {enDecompte ? (
                  <span className="text-[13px] font-bold" style={{ color: E.feu }}>En position</span>
                ) : derniereMinute ? (
                  <span className="inline-flex items-center gap-2 text-[16px] font-bold text-white px-3 py-1 rounded-full" style={{ background: E.feu }}>
                    <span className={styles.point} style={{ background: "#FFD34E" }} aria-hidden="true" />Dernière minute
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-[16px] font-bold" style={{ color: E.feu }}>
                    {!paused && <span className={styles.point} aria-hidden="true" />}
                    {aRebours ? "Il reste" : c.sorte === "minute" ? "Il reste dans la minute" : "Chrono"}
                  </span>
                )}
                {meilleur && (c.sorte === "temps" || c.sorte === "tenue") && (
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[13px]" style={{ color: E.t2 }}>Ton meilleur</span>
                    <span className="vy-nombre text-[20px]" style={{ ...CHIFFRE, color: E.t1 }}>{tempsCourt(meilleur.valeur)}</span>
                  </span>
                )}
              </div>
              <div className="mt-3" aria-live="off">
                <TexteAjuste plafond={116} gabarit={t >= 3600 ? "0:00:00" : "00:00"} className="vy-nombre"
                  style={{ ...CHIFFRE, lineHeight: 1, color: derniereMinute || enDecompte ? E.feuVif : E.t1 }}
                  texte={enDecompte ? `0${depart - elapsed}` : aRebours ? chrono(reste) : c.sorte === "minute" ? chrono(60 - (t % 60)) : chrono(t)} />
              </div>
              {c.sorte === "tours" && <Piste minutes={c.minutes} t={t} />}
              {avance > 0 && c.sorte === "temps" && (
                <div className="inline-flex items-center gap-2.5 mt-2 pl-1.5 pr-4 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(193,59,193,0.24)" }}>
                  <span className="vy-nombre inline-flex items-center justify-center rounded-full text-white text-[16px]"
                    style={{ ...CHIFFRE, width: 34, height: 34, background: DEGRADE }}>{avance}</span>
                  <span className="text-[16px] font-semibold" style={{ color: E.t1 }}>
                    {avance > 1 ? "répétitions" : "répétition"} d’avance sur ton meilleur
                  </span>
                </div>
              )}
              {c.sorte === "tenue" && meilleur && !enDecompte && (
                <p className="text-[16px] font-semibold mt-2" style={{ color: t > meilleur.valeur ? E.lav : E.t1 }}>
                  {t > meilleur.valeur
                    ? "Tu bats ton meilleur."
                    : `Encore ${meilleur.valeur - t >= 60 ? tempsCourt(meilleur.valeur - t) : `${meilleur.valeur - t}${NB}s`} pour battre ton meilleur`}
                </p>
              )}
            </div>

            {/* ── La scène : le geste, avec ce qui compte autour ── */}
            <div className="relative flex flex-1 min-h-[150px]">
              <SceneTunnel key={enCours?.exercice ?? c.mouvement ?? ""} nom={enCours?.exercice ?? c.mouvement ?? ""} fige={enDecompte} enPause={paused} />
              <div className="absolute left-0 top-3 pointer-events-none">
                <Gauche c={c} faits={faits} minute={minute} morceaux={morceaux} />
              </div>
              {(c.sorte === "tours" || c.sorte === "reps") && (derniereMinute || avance > 0) && (
                <div className="absolute right-0 top-3 rounded-[18px] px-3.5 py-3 pointer-events-none"
                  style={{ width: 128, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(193,59,193,0.24)", boxShadow: "var(--ombre-pose)" }}>
                  {derniereMinute ? (
                    <>
                      <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>Ton score</p>
                      {c.sorte === "tours" && scoreEnCours ? (
                        <>
                          <p className="leading-none mt-1">
                            <span className="vy-nombre text-[34px]" style={{ ...CHIFFRE, color: E.t1 }}>{scoreEnCours.tours}</span>
                            <span className="text-[16px] font-bold" style={{ color: E.t2 }}>{NB}+{NB}</span>
                            <span className="vy-nombre text-[34px]" style={{ ...CHIFFRE, color: E.t1 }}>{scoreEnCours.reste}</span>
                          </p>
                          <p className="text-[13px] mt-1 leading-tight" style={{ color: E.t2 }}>tours + répétitions</p>
                        </>
                      ) : (
                        <>
                          <p className="vy-nombre text-[34px] leading-none mt-1" style={{ ...CHIFFRE, color: E.t1 }}>{faits}</p>
                          <p className="text-[13px] mt-1" style={{ color: E.t2 }}>{unite(c.mouvement ?? "", 2)}</p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="vy-nombre text-[34px] leading-none" style={{ ...CHIFFRE, ...TEXTE_DEGRADE }}>{avance}</p>
                      <p className="text-[13px] mt-1.5 leading-snug font-semibold" style={{ color: E.t1 }}>
                        {c.sorte === "reps" ? unite(c.mouvement ?? "", avance) : avance > 1 ? "répétitions" : "répétition"} d’avance sur ton meilleur
                      </p>
                    </>
                  )}
                </div>
              )}
              {c.sorte === "reps" && !enDecompte && !paused && (
                <button type="button" onClick={fait} className="absolute inset-0 cursor-pointer" aria-label={`Un ${unite(c.mouvement ?? "", 1)} de plus`} />
              )}
            </div>

            {/* ── Dans la dernière minute : ce qu'il reste pour battre ton meilleur ── */}
            {besoin !== null && meilleur && (
              <div className="flex-shrink-0 mt-2 rounded-[22px] p-[2px]" style={{ background: DEGRADE }}>
                <div className="flex items-center gap-3.5 rounded-[20px] bg-white px-4 py-3">
                  {besoin > 0
                    ? <span className="vy-nombre text-[48px] leading-none flex-shrink-0" style={{ ...CHIFFRE, ...TEXTE_DEGRADE }}>{besoin}</span>
                    : <span className="flex-shrink-0 inline-flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: DEGRADE }}><Star size={20} fill="#fff" color="#fff" /></span>}
                  <div className="min-w-0">
                    <p className="text-[20px] leading-[1.1]" style={{ ...MOT, color: E.t1 }}>
                      {besoin === 0 ? "Tu es en train de battre ton meilleur."
                        : `${enCours && c.sorte === "tours" && besoin <= enCours.nombre ? unite(enCours.exercice, besoin) : c.sorte === "reps" ? unite(c.mouvement ?? "", besoin) : besoin > 1 ? "répétitions" : "répétition"} de plus, et tu bats ton meilleur`}
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: E.t2 }}>
                      {typo(`Ton meilleur : ${scoreLong(c, meilleur)}, le ${dateLongue(meilleur.quand)}`)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Maintenant ── */}
            <Maintenant c={c} enCours={enCours} suivant={suivant} minute={minute} minuteFaite={minuteFaite} meilleur={meilleur} />

            {/* ── Ce qui reste ── */}
            {c.sorte === "tours" && <TourEnCours c={c} faits={faits} />}
            {c.sorte === "temps" && <Escalier c={c} faits={faits} morceaux={morceaux} />}

            {/* ── Le geste ── */}
            <div className="flex-shrink-0 mt-auto pt-3 pb-5">
              {paused ? (
                <BoutonViolet onClick={onPause}>Reprendre</BoutonViolet>
              ) : c.sorte === "tenue" ? (
                <BoutonViolet onClick={jArrete} eteint={enDecompte}>J’arrête</BoutonViolet>
              ) : c.sorte === "reps" ? (
                <BoutonViolet onClick={fait} eteint={enDecompte}>+1 {unite(c.mouvement ?? "", 1)}</BoutonViolet>
              ) : c.sorte === "minute" && minuteFaite ? (
                <BoutonViolet eteint>Repos jusqu’à la minute {minute + 1}</BoutonViolet>
              ) : (
                <BoutonViolet onClick={fait} eteint={enDecompte}>Fait</BoutonViolet>
              )}
              <div className="flex items-center justify-between mt-1">
                {c.sorte !== "tenue" ? (
                  <button type="button" onClick={revenir} disabled={!faits || paused}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold min-h-[44px] px-1 cursor-pointer disabled:opacity-40"
                    style={{ color: E.t2 }}>
                    <ChevronLeft size={16} strokeWidth={2.4} />{c.sorte === "reps" ? "Un de moins" : "Revenir"}
                  </button>
                ) : <span />}
                {c.sorte === "minute" && (
                  <button type="button" onClick={ouvrirArret} className="text-[13px] font-semibold min-h-[44px] px-1 cursor-pointer" style={{ color: E.t2 }}>
                    J’arrête
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── S'arrêter : on dit ce qui est gardé, avant ── */}
      <AnimatePresence>
        {arret && (
          <motion.div className="absolute inset-0 z-20 flex items-end" style={{ background: "rgba(29,21,48,0.34)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={continuer}>
            <motion.div className="w-full bg-white px-5 pt-5 pb-7" style={{ borderTopLeftRadius: "var(--r-feuille)", borderTopRightRadius: "var(--r-feuille)" }}
              initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(e) => e.stopPropagation()}
              role="dialog" aria-modal="true" aria-label="S’arrêter">
              <p className="text-[26px] leading-tight" style={{ ...MOT, color: E.t1 }}>{typo("Tu t'arrêtes là ?")}</p>
              <p className="text-[16px] mt-2 leading-snug" style={{ color: E.t2 }}>{typo(texteArret)}</p>
              <div className="mt-5"><BoutonViolet onClick={continuer}>Continuer</BoutonViolet></div>
              <button type="button" onClick={arreter} className="w-full text-[16px] font-semibold mt-2 min-h-[44px] cursor-pointer" style={{ color: E.t2 }}>
                Arrêter
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Les morceaux de l'écran ─────────────────────────────────────────── */

function RondBouton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex items-center justify-center rounded-full cursor-pointer"
      style={{ width: 44, height: 44, background: "rgba(255,255,255,0.78)", color: E.t1, boxShadow: "var(--ombre-pose)" }}>
      {children}
    </button>
  );
}

function BoutonViolet({ onClick, eteint = false, children }: { onClick?: () => void; eteint?: boolean; children: React.ReactNode }) {
  return (
    <motion.button type="button" whileTap={eteint ? undefined : { scale: 0.97 }} onClick={eteint ? undefined : onClick}
      aria-disabled={eteint || undefined}
      className="w-full flex items-center justify-center text-white font-bold text-[20px] cursor-pointer"
      style={{ height: 58, borderRadius: 22, background: DEGRADE, boxShadow: eteint ? "none" : "0 10px 30px -6px rgba(193,59,193,0.45)", opacity: eteint ? 0.45 : 1 }}>
      {children}
    </motion.button>
  );
}

/** Les minutes du max, une barre par minute, qui se remplissent en orange. */
function Piste({ minutes, t }: { minutes: number; t: number }) {
  const enCours = Math.min(minutes, Math.floor(t / 60) + 1);
  return (
    <div className="mt-3" aria-hidden="true">
      <div className="flex gap-1">
        {Array.from({ length: minutes }).map((_, i) => {
          const part = Math.max(0, Math.min(1, (t - i * 60) / 60));
          return (
            <span key={i} className="flex-1 overflow-hidden rounded-full" style={{ height: 8, background: "rgba(26,32,44,0.09)" }}>
              <span className="block h-full rounded-full origin-left"
                style={{ transform: `scaleX(${part})`, background: "linear-gradient(90deg,#FFD34E,#FF7A1A)", boxShadow: part > 0 ? "0 0 8px rgba(255,122,26,0.45)" : "none" }} />
            </span>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[11px]" style={{ color: E.t2 }}>
        <span>0</span><span className="font-semibold">minute {enCours}</span><span>{minutes}{NB}min</span>
      </div>
    </div>
  );
}

/** La colonne de gauche de la scène : le tour, l'étape, le compte, la minute. */
function Gauche({ c, faits, minute, morceaux }: {
  c: Classique; faits: number; minute: number; morceaux: { etape: number }[];
}) {
  if (c.sorte === "tours") {
    const L = (c.tour ?? []).length || 1;
    const toursFaits = Math.floor(faits / L);
    const points = Math.min(toursFaits, 12);
    return (
      <div>
        <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>Tour</p>
        <p className="vy-nombre text-[64px] leading-[0.9]" style={{ ...CHIFFRE, color: E.t1 }}>{toursFaits + 1}</p>
        <div className="flex flex-wrap gap-1 mt-2" style={{ maxWidth: 120 }}>
          {Array.from({ length: points }).map((_, i) => (
            <span key={i} className="rounded-full" style={{ width: 9, height: 9, background: E.teal }} />
          ))}
          <span className="rounded-full" style={{ width: 9, height: 9, border: `2px solid ${E.orange}`, background: `linear-gradient(90deg, ${E.orange} 50%, transparent 50%)` }} />
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: E.t2 }}>
          {toursFaits === 0 ? "premier tour" : `${toursFaits}${NB}${toursFaits > 1 ? "tours faits" : "tour fait"}`}
        </p>
      </div>
    );
  }
  if (c.sorte === "temps") {
    const total = (c.etapes ?? []).length;
    const etape = Math.min(total, (morceaux[faits]?.etape ?? total - 1) + 1);
    return (
      <div>
        <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>Étape</p>
        <p className="vy-nombre text-[64px] leading-[0.9]" style={{ ...CHIFFRE, color: E.t1 }}>{etape}</p>
        <p className="text-[13px] mt-1" style={{ color: E.t2 }}>sur {total}</p>
      </div>
    );
  }
  if (c.sorte === "reps") {
    return (
      <div>
        <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>{unite(c.mouvement ?? "", 2).replace(/^./, (x) => x.toUpperCase())}</p>
        <p className="vy-nombre text-[64px] leading-[0.9]" style={{ ...CHIFFRE, color: E.t1 }}>{faits}</p>
      </div>
    );
  }
  if (c.sorte === "minute") {
    return (
      <div>
        <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>Minute</p>
        <p className="vy-nombre text-[64px] leading-[0.9]" style={{ ...CHIFFRE, color: E.t1 }}>{minute}</p>
        <p className="text-[11px] mt-1.5" style={{ color: E.t2 }}>
          {faits === 0 ? "c’est parti" : `${faits}${NB}${faits > 1 ? "minutes finies" : "minute finie"}`}
        </p>
      </div>
    );
  }
  return null;
}

/** « Maintenant · 10 squats · puis 15 crunchs ». */
function Maintenant({ c, enCours, suivant, minute, minuteFaite, meilleur }: {
  c: Classique; enCours: { exercice: string; nombre: number } | null; suivant: { exercice: string; nombre: number } | null;
  minute: number; minuteFaite: boolean; meilleur: ScoreDate | null;
}) {
  let nombre: string | null = null, mot = "", apres: string | null = null, titre = "Maintenant";
  if (enCours) {
    nombre = enCours.exercice === "Rameur" ? milliers(enCours.nombre) : String(enCours.nombre);
    mot = enCours.exercice === "Rameur" ? "mètres" : unite(enCours.exercice, enCours.nombre);
    if (suivant) apres = `puis ${suivant.exercice === "Rameur" ? `${milliers(suivant.nombre)}${NB}m` : `${suivant.nombre}${NB}${unite(suivant.exercice, suivant.nombre)}`}`;
  } else if (c.sorte === "reps") {
    mot = `Des ${unite(c.mouvement ?? "", 2)}`;
    apres = "touche l’écran à chaque fois";
  } else if (c.sorte === "tenue") {
    mot = "Tiens la position";
    apres = "dos au mur";
  } else if (c.sorte === "minute") {
    if (minuteFaite) { titre = "Repos"; mot = `jusqu’à la minute ${minute + 1}`; }
    else { nombre = String(minute); mot = unite(c.mouvement ?? "", minute); apres = "dans la minute"; }
    if (meilleur) apres = minute > meilleur.valeur ? "tu bats ton meilleur" : `ton meilleur : minute ${meilleur.valeur}`;
  }
  return (
    <div className="flex-shrink-0 mt-3">
      <p className="text-[13px] font-bold" style={{ color: E.feu }}>{titre}</p>
      <div className="flex items-end justify-between gap-3 mt-0.5">
        <p className="min-w-0 leading-none">
          {nombre && <span className="vy-nombre text-[44px] mr-2" style={{ ...CHIFFRE, color: E.t1 }}>{nombre}</span>}
          <span className="text-[34px]" style={{ ...MOT, color: E.t1 }}>{mot}</span>
        </p>
        {apres && <p className="text-[13px] font-semibold text-right pb-1 flex-shrink-0 max-w-[40%]" style={{ color: E.t2 }}>{apres}</p>}
      </div>
    </div>
  );
}

/** Le tour en cours, ses trois exercices : fait, en cours, à venir. */
function TourEnCours({ c, faits }: { c: Classique; faits: number }) {
  const tour = c.tour ?? [];
  const L = tour.length || 1;
  const position = faits % L;
  return (
    <div className="flex-shrink-0 grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${L}, minmax(0, 1fr))` }}>
      {tour.map((m, i) => {
        const fait = i < position, courant = i === position;
        return (
          <div key={i} className="relative flex items-center gap-1.5 rounded-[16px] px-2 py-1.5"
            style={{
              height: 62, opacity: !fait && !courant ? 0.55 : 1,
              background: courant ? "rgba(255,122,26,0.10)" : "rgba(255,255,255,0.72)",
              border: courant ? `2px solid ${E.orange}` : "1px solid rgba(26,32,44,0.08)",
            }}>
            <span className="flex-shrink-0"><ExerciseThumb name={m.exercice} size={36} /></span>
            <span className="min-w-0">
              <b className="vy-nombre block text-[20px] leading-none" style={{ ...CHIFFRE, color: fait ? E.tealEncre : E.t1 }}>{m.nombre}</b>
              <span className="block text-[11px] font-semibold truncate" style={{ color: courant ? E.feu : E.t2 }}>{unite(m.exercice, m.nombre)}</span>
            </span>
            {fait && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full" style={{ width: 20, height: 20, background: E.teal }}>
                <Check size={12} strokeWidth={3} color="#fff" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** L'escalier des étapes : faites en teal, celle en cours en orange. */
function Escalier({ c, faits, morceaux }: { c: Classique; faits: number; morceaux: { etape: number }[] }) {
  const etapes = c.etapes ?? [];
  const rameur = etapes[0]?.[0]?.exercice === "Rameur";
  const hauteurs = etapes.map((e) => e[0].nombre);
  const haut = Math.max(...hauteurs, 1);
  const enCours = morceaux[faits]?.etape ?? etapes.length;
  const faites = repsApres(c, faits), total = repsAuTotal(c);
  return (
    <div className="flex-shrink-0 mt-3">
      <div className="flex items-end gap-1.5" style={{ height: 76 }} aria-hidden="true">
        {etapes.map((_, i) => {
          const fait = i < enCours, courant = i === enCours;
          const h = 26 + (50 * hauteurs[i]) / haut;
          const etiquette = rameur ? milliers(250 * (i + 1)) : String(hauteurs[i]);
          return (
            <span key={i} className="relative flex-1 flex justify-center rounded-[10px] pt-1"
              style={{
                height: h,
                background: fait ? E.teal : courant ? "linear-gradient(180deg,#FFD34E,#FF7A1A)" : "rgba(26,32,44,0.08)",
              }}>
              {courant && <span className="absolute -top-3 rounded-full" style={{ width: 6, height: 6, background: E.orange }} />}
              <span className="vy-nombre text-[11px]" style={{ ...CHIFFRE, color: fait ? "#063D2E" : courant ? "#5A2204" : E.t2 }}>{etiquette}</span>
            </span>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[13px]" style={{ color: E.t2 }}>
        <span><b className="vy-nombre" style={{ ...CHIFFRE, color: E.t1 }}>{milliers(faites)}</b> sur {milliers(total)}{rameur ? `${NB}m` : " répétitions"}</span>
        <span>plus que <b className="vy-nombre" style={{ ...CHIFFRE, color: E.t1 }}>{milliers(total - faites)}</b>{rameur ? `${NB}m` : ""}</span>
      </div>
    </div>
  );
}

/* ── La sonnerie : « TEMPS ! », puis ce qu'on a fait du tour en cours ── */

function Sonnerie({ c, passages, partiel, setPartiel, correction, setCorrection, meilleur, indice, onScore, onPasEncore }: {
  c: Classique; passages: number[]; partiel: number | null; setPartiel: (n: number) => void;
  correction: number | null; setCorrection: (n: number) => void; meilleur: ScoreDate | null; indice: boolean;
  onScore: () => void; onPasEncore: () => void;
}) {
  const faits = passages.length;
  if (c.sorte === "reps") {
    const n = correction ?? faits;
    const score = scoreReps(c, passages, n);
    const nouveau = !!(score && meilleur && meilleurQue(score, meilleur));
    return (
      <div className="flex flex-col flex-1 pb-5">
        <div className={`${styles.temps} mt-4`}>
          <TexteAjuste plafond={120} texte={`TEMPS${NB}!`} style={{ ...MOT, fontVariationSettings: "'wdth' 125", lineHeight: 0.95, color: E.t1 }} />
        </div>
        <div className="mt-6 rounded-[26px] bg-white px-5 py-5" style={{ boxShadow: "var(--ombre-pose)", border: "1px solid rgba(26,32,44,0.06)" }}>
          <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>Un oubli ? Corrige le compte.</p>
          <div className="flex items-center justify-between mt-3">
            <button type="button" onClick={() => setCorrection(Math.max(0, n - 1))} aria-label="Un de moins"
              className="flex items-center justify-center rounded-full text-[26px] font-bold cursor-pointer"
              style={{ width: 52, height: 52, background: "rgba(26,32,44,0.06)", color: E.t1 }}>−</button>
            <p className="text-center leading-none">
              <span className="vy-nombre text-[64px]" style={{ ...CHIFFRE, color: E.t1 }}>{n}</span>
              <span className="block text-[16px] mt-1" style={{ color: E.t2 }}>{unite(c.mouvement ?? "", n)}</span>
            </p>
            <button type="button" onClick={() => setCorrection(n + 1)} aria-label="Un de plus"
              className="flex items-center justify-center rounded-full text-[26px] font-bold cursor-pointer"
              style={{ width: 52, height: 52, background: "rgba(26,32,44,0.06)", color: E.t1 }}>+</button>
          </div>
        </div>
        {nouveau && <div className="mt-4"><BadgeNouveau /></div>}
        <div className="mt-auto pt-5"><BoutonViolet onClick={onScore}>Voir mon score</BoutonViolet></div>
      </div>
    );
  }

  /* Le max : les tours finis sont déjà comptés, avec les morceaux finis du tour en cours. */
  const tour = c.tour ?? [];
  const L = tour.length || 1;
  const toursFinis = Math.floor(faits / L);
  const position = faits % L;
  const enCours = tour[position];
  const dejaDuTour = tour.slice(0, position);
  const score = scoreTours(c, passages, partiel ?? 0);
  const nouveau = partiel !== null && !!meilleur && score.valeur > 0 && meilleurQue(score, meilleur);
  const avec = dejaDuTour.length
    ? `, avec ${dejaDuTour.map((m) => `les ${m.nombre}${NB}${unite(m.exercice, m.nombre)}`).join(" et ")} du tour ${toursFinis + 1}`
    : "";
  return (
    <div className="flex flex-col flex-1 pb-5">
      <div className={`${styles.temps} mt-4`}>
        <TexteAjuste plafond={120} texte={`TEMPS${NB}!`} style={{ ...MOT, fontVariationSettings: "'wdth' 125", lineHeight: 0.95, color: E.t1 }} />
      </div>
      <p className="mt-4 leading-none">
        <span className="vy-nombre text-[64px] mr-3" style={{ ...CHIFFRE, color: E.t1 }}>{toursFinis}</span>
        <span className="text-[34px]" style={{ ...MOT, color: E.t1 }}>{toursFinis > 1 ? "tours finis" : "tour fini"}</span>
      </p>
      <p className="text-[16px] mt-2" style={{ color: E.t2 }}>Déjà comptés{avec}.</p>

      <div className="mt-4 rounded-[26px] bg-white px-5 py-4" style={{ boxShadow: "var(--ombre-pose)", border: "1px solid rgba(26,32,44,0.06)" }}>
        <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>Tu étais aux {unite(enCours.exercice, 2)} du tour {toursFinis + 1}</p>
        <p className="text-[26px] leading-tight mt-1" style={{ ...MOT, color: E.t1 }}>{typo("Combien en as-tu faits ?")}</p>
        <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }} role="radiogroup" aria-label="Répétitions faites">
          {Array.from({ length: enCours.nombre + 1 }).map((_, n) => {
            const choisi = partiel === n;
            return (
              <button key={n} type="button" role="radio" aria-checked={choisi} onClick={() => setPartiel(n)}
                className="vy-nombre flex items-center justify-center rounded-[14px] text-[20px] cursor-pointer"
                style={{
                  ...CHIFFRE, aspectRatio: "1 / 1",
                  background: choisi ? DEGRADE : "#FFFFFF", color: choisi ? "#FFFFFF" : E.t1,
                  border: choisi ? "none" : "1px solid rgba(26,32,44,0.12)", boxShadow: choisi ? "0 8px 20px -6px rgba(193,59,193,0.5)" : "none",
                }}>
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-[13px] mt-2.5" style={{ color: indice ? E.feu : E.t2 }}>
          {indice ? typo("Choisis un nombre, ou dis que tu n'y étais pas encore.") : `sur ${enCours.nombre}${NB}${unite(enCours.exercice, enCours.nombre)}`}
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 mt-4">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: E.t2 }}>Ton score</p>
          <p className="leading-none mt-1">
            <span className="vy-nombre text-[44px]" style={{ ...CHIFFRE, color: E.t1 }}>{score.tours}</span>
            <span className="text-[20px] font-bold" style={{ color: E.t1 }}>{NB}{score.tours && score.tours > 1 ? "tours" : "tour"}{NB}+{NB}</span>
            <span className="vy-nombre text-[44px]" style={{ ...CHIFFRE, color: partiel === null ? E.t3 : E.t1 }}>{score.reste}</span>
          </p>
        </div>
        {nouveau && <BadgeNouveau />}
      </div>

      <div className="mt-auto pt-5">
        <BoutonViolet onClick={onScore}>Voir mon score</BoutonViolet>
        <button type="button" onClick={onPasEncore} className="w-full text-[16px] font-semibold mt-2 min-h-[44px] cursor-pointer" style={{ color: E.t2 }}>
          Je n’étais pas encore aux {unite(enCours.exercice, 2)}
        </button>
      </div>
    </div>
  );
}

function BadgeNouveau() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full p-[2px] flex-shrink-0" style={{ background: DEGRADE }}>
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[16px] font-bold" style={{ color: "#9B3BB5" }}>
        <Star size={15} fill="#C13BC1" color="#C13BC1" />Nouveau meilleur
      </span>
    </span>
  );
}
