"use client";

/* ════════════════════════════════════════════════════════════════════
   LA FIN D'UN CLASSIQUE (maquette « Le chrono et le score », version 3 :
   « Ton score », « Ton temps »).

   Le score en héros, le Guide qui célèbre, puis ce qui le situe : un
   nouveau meilleur (et ce que tu as gagné), ou ton premier score (ton
   repère). Puis l'escalier de tes meilleurs successifs et le prochain
   essai, au jour que tu choisis.

   ⚠️ JAMAIS UN RECUL. Un score moins bon que ton meilleur ne porte ni
   écart ni badge : une ligne rappelle ton meilleur, et c'est tout.
   ⚠️ AUCUN VERT SUR CET ÉCRAN, comme toute fin de séance : violet → rose.
   ⚠️ Il ne lit rien et n'écrit rien : le tunnel lui donne l'essai et
   l'historique lu avant la séance.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { CalendarDays, Star } from "lucide-react";
import { CouvertureFin, SerieEtRang } from "@/components/seance/FinDeSeance";
import { CelebrationGuide } from "@/components/AssistantMark";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import TexteAjuste from "@/components/seance/classique/TexteAjuste";
import {
  bilanDe, bonMoment, dateCourte, dateLongue, ecartProgres, meilleurQue, milliers, recapEssai, scoreCourt, scoreLong,
  tempsCourt, totauxDuMax, typo, unite,
  type Classique, type ScoreClassique, type ScoreDate,
} from "@/lib/classiques";
import type { GuideRef } from "@/lib/guides";

const E = { t1: "#1F1B2E", t2: "#6B6580", doux: "#4A4560", lav: "#6B4BD6", rose: "#9B3BB5" };
const DEGRADE = "linear-gradient(135deg,#8B5CF6,#C13BC1)";
const TEXTE_DEGRADE: React.CSSProperties = { background: DEGRADE, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
const GEANT: React.CSSProperties = { fontWeight: 900, fontVariationSettings: "'wdth' 112", letterSpacing: "-0.03em", lineHeight: 0.9 };
const MOT: React.CSSProperties = { fontWeight: 900, fontVariationSettings: "var(--w-voix)" };
const NB = String.fromCharCode(160);

const jourLong = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).replace(" ", NB);
const jourDeSemaine = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default function FinClassique({ classique: c, score, historique, faits, partiel, guide, aujourdhui, serie, exp, onChoisirJour, jourChoisi }: {
  classique: Classique;
  /** Le score de l'essai, ou `null` : arrêté avant la fin, gardé sans score. */
  score: ScoreClassique | null;
  /** Les scores d'avant la séance, ou `null` si la base n'a pas répondu
   *  (l'écran ne parle alors ni de meilleur ni de premier score). */
  historique: ScoreDate[] | null;
  /** Le max : les morceaux finis et ce qu'on a fait du morceau en cours. */
  faits: number;
  partiel: number;
  guide: GuideRef;
  /** L'instant de l'essai (ISO). */
  aujourdhui: string;
  /** La série et l'EXP après la séance, comme toute fin de séance. */
  serie: number | null;
  exp: number | null;
  onChoisirJour?: () => void;
  /** Le jour déjà choisi pour le prochain essai (AAAA-MM-JJ). */
  jourChoisi?: string | null;
}) {
  const bilanAvant = historique ? bilanDe(historique) : null;
  const avant = bilanAvant?.meilleur ?? null;
  const nouveau = !!(score && avant && meilleurQue(score, avant));
  const premier = !!(score && bilanAvant && bilanAvant.essais.length === 0);
  const ecart = score && avant ? ecartProgres(c, avant, score) : null;
  const ici: ScoreDate | null = score ? { ...score, quand: aujourdhui } : null;
  const marches = historique ? bilanDe([...historique, ...(ici ? [ici] : [])]).escalier.slice(-3) : [];
  const enTemps = c.sorte === "temps" || c.sorte === "tenue";
  const moment = bonMoment(new Date(aujourdhui));

  return (
    <div className="relative w-full flex flex-col items-center text-center">
      <CouvertureFin titre={c.titre} motImpose={c.mot} fete={nouveau || premier}
        guide={guide ? <CelebrationGuide guide={guide} hauteur="clamp(190px, 28vh, 240px)" /> : null} />

      {/* ── Le score en héros ── */}
      {score ? (
        <motion.div className="relative w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <p className="text-[16px] font-bold" style={{ color: E.lav }}>{enTemps ? "Ton temps" : "Ton score"}</p>
          <GrandScore c={c} score={score} />
          {/* Le max dit le détail dans sa carte, plus bas : une seule fois. */}
          {c.sorte !== "tours" && <p className="text-[16px] mt-2" style={{ color: E.doux }}>{typo(recapEssai(c, score))}</p>}
        </motion.div>
      ) : (
        <motion.div className="relative w-full px-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-[26px] leading-tight" style={{ ...MOT, color: E.t1 }}>Gardé dans ta séance</h2>
          <p className="text-[16px] mt-2 leading-snug" style={{ color: E.doux }}>
            Ce que tu as fait est gardé, sans score cette fois. Ton meilleur ne bouge pas.
          </p>
        </motion.div>
      )}

      {/* ── Ce qui le situe : un nouveau meilleur, ou ton premier score ── */}
      {nouveau && ecart && avant && score && (
        <Carte delai={0.4}>
          <Medaille />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
            <span className="text-[13px] font-semibold" style={{ color: E.rose }}>{enTemps ? "Nouveau meilleur temps" : "Nouveau meilleur"}</span>
            <span className="text-[16px] font-semibold" style={{ color: E.t1 }}>{enTemps ? `${c.titre} en ${tempsCourt(score.valeur)}` : c.titre}</span>
            <span className="text-[13px]" style={{ color: E.t2 }}>{typo(`Ton meilleur d'avant : ${scoreLong(c, avant)}, le ${dateLongue(avant.quand)}.`)}</span>
          </span>
          <span className="flex-shrink-0 text-right">
            <b className="vy-nombre block leading-none" style={{ fontSize: 34, fontWeight: 800, ...TEXTE_DEGRADE }}>{ecart.valeur}</b>
            <span className="block text-[13px] font-semibold mt-1" style={{ color: E.rose }}>{ecart.unite}</span>
          </span>
        </Carte>
      )}
      {premier && score && (
        <Carte delai={0.4}>
          <Medaille />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
            <span className="text-[13px] font-semibold" style={{ color: E.rose }}>{enTemps ? "Ton premier temps" : "Ton premier score"}</span>
            <span className="text-[16px] font-semibold" style={{ color: E.t1 }}>{c.titre}, {scoreLong(c, score)}</span>
            <span className="text-[13px]" style={{ color: E.t2 }}>{typo("C'est ton repère : la prochaine fois, tu essaies de le battre.")}</span>
          </span>
        </Carte>
      )}
      {score && avant && !nouveau && (
        <p className="relative w-full mt-5 text-[16px]" style={{ color: E.doux }}>
          {typo(`Ton meilleur : ${scoreLong(c, avant)}, le ${dateLongue(avant.quand)}.`)}
        </p>
      )}

      {/* ── Tes meilleurs successifs ── */}
      {marches.length >= 2 && <EscalierMeilleurs c={c} marches={marches} ici={ici} />}

      {/* ── Le max : combien de chaque exercice ── */}
      {c.sorte === "tours" && score && (
        <div className="relative w-full mt-5 rounded-[var(--r-bloc)] px-4 py-3.5 text-left"
          style={{ background: "rgba(255,255,255,0.78)", border: "1px solid rgba(31,27,46,0.08)" }}>
          <p className="text-[16px] font-bold" style={{ color: E.t1 }}>
            <span className="vy-nombre" style={{ fontWeight: 800 }}>{milliers(score.valeur)}</span> répétitions en {c.minutes}{NB}minutes
          </p>
          <div className="grid gap-2 mt-2.5" style={{ gridTemplateColumns: `repeat(${totauxDuMax(c, faits, partiel).length}, minmax(0, 1fr))` }}>
            {totauxDuMax(c, faits, partiel).map((x) => (
              <div key={x.exercice} className="flex items-center gap-1.5 min-w-0">
                <span className="flex-shrink-0"><ExerciseThumb name={x.exercice} size={40} /></span>
                <span className="min-w-0">
                  <b className="vy-nombre block text-[26px] leading-none" style={{ fontWeight: 800, color: E.t1 }}>{x.total}</b>
                  <span className="block text-[13px] truncate" style={{ color: E.t2 }}>{unite(x.exercice, x.total)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── La série et le rang, comme toute fin de séance ── */}
      <SerieEtRang serie={serie} exp={exp} />

      {/* ── Le prochain essai : le bon moment, et le jour reste libre ── */}
      {score && onChoisirJour && (
        <div className="relative w-full mt-5 rounded-[var(--r-bloc)] px-4 py-4 text-left"
          style={{ background: "rgba(255,255,255,0.78)", border: "1px solid rgba(31,27,46,0.08)" }}>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: "rgba(139,92,246,0.10)", color: E.lav }}>
              <CalendarDays size={18} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-bold" style={{ color: E.t1 }}>Ton prochain essai</span>
              <span className="block text-[13px] mt-0.5 leading-snug" style={{ color: E.t2 }}>
                {jourChoisi
                  ? typo(`C'est calé : ${jourDeSemaine(jourChoisi)}. Tu pourras le déplacer depuis ton planning.`)
                  : typo(`Le bon moment : du ${jourLong(moment.du)} au ${jourLong(moment.au)}. Tu choisis le jour.`)}
              </span>
            </span>
          </div>
          <button type="button" onClick={onChoisirJour}
            className="mt-3 rounded-[16px] px-4 min-h-[44px] text-[16px] font-bold cursor-pointer"
            style={{ border: "1.5px solid rgba(139,92,246,0.45)", color: E.lav, background: "#FFFFFF" }}>
            {jourChoisi ? "Changer le jour" : "Choisir le jour"}
          </button>
        </div>
      )}
    </div>
  );
}

function GrandScore({ c, score }: { c: Classique; score: ScoreClassique }) {
  if (c.sorte === "temps" || c.sorte === "tenue") {
    return <div className="mt-1"><TexteAjuste aligner="center" plafond={132} texte={tempsCourt(score.valeur)} style={{ ...GEANT, color: E.t1 }} /></div>;
  }
  if (c.sorte === "tours") {
    return (
      <div className="mt-1">
        <p>
          <span style={{ ...GEANT, fontSize: "clamp(96px, 28vw, 124px)", color: E.t1 }}>{score.tours ?? 0}</span>
          <span className="text-[34px]" style={{ ...MOT, color: E.t1 }}>{NB}{(score.tours ?? 0) > 1 ? "tours" : "tour"}</span>
        </p>
        {!!score.reste && (
          <p className="-mt-1">
            <span className="text-[34px]" style={{ ...MOT, color: E.t2 }}>+{NB}</span>
            <span style={{ ...GEANT, fontSize: "clamp(72px, 22vw, 96px)", ...TEXTE_DEGRADE }}>{score.reste}</span>
            <span className="text-[20px] font-bold" style={{ color: E.t2 }}>{NB}{score.reste > 1 ? "répétitions" : "répétition"}</span>
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="mt-1">
      {c.sorte === "minute" && <span className="text-[34px]" style={{ ...MOT, color: E.t2 }}>minute{NB}</span>}
      <span style={{ ...GEANT, fontSize: "clamp(96px, 30vw, 132px)", color: E.t1 }}>{score.valeur}</span>
    </p>
  );
}

function Carte({ children, delai }: { children: React.ReactNode; delai: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delai }}
      className="relative w-full mt-5" style={{ borderRadius: 20, padding: 1.5, background: DEGRADE }}>
      <div className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderRadius: 19, background: "#FFFFFF", boxShadow: "0 8px 24px rgba(139,92,246,0.14)" }}>
        {children}
      </div>
    </motion.section>
  );
}

function Medaille() {
  return (
    <span className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full" style={{ background: DEGRADE }}>
      <Star size={19} fill="#FFFFFF" color="#FFFFFF" />
    </span>
  );
}

/** Tes meilleurs, marche après marche : le dernier en violet → rose. */
function EscalierMeilleurs({ c, marches, ici }: { c: Classique; marches: ScoreDate[]; ici: ScoreDate | null }) {
  const enTemps = c.sorte === "temps" || c.sorte === "tenue";
  const hauteurs = marches.length === 2 ? [110, 190] : [90, 140, 200];
  return (
    <motion.section className="relative w-full mt-7 text-left" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
      <h3 className="text-[26px] leading-tight" style={{ ...MOT, color: E.t1 }}>{enTemps ? "Tes meilleurs temps" : "Tes meilleurs, marche après marche"}</h3>
      <div className="grid gap-3 mt-5 items-end" style={{ gridTemplateColumns: `repeat(${marches.length}, minmax(0, 1fr))` }}>
        {marches.map((m, i) => {
          const dernier = i === marches.length - 1;
          return (
            <div key={`${m.quand}-${i}`} className="flex flex-col items-center">
              <span className="vy-nombre text-[26px]" style={{ fontWeight: 800, color: dernier ? E.lav : E.t2 }}>{scoreCourt(m)}</span>
              <span className="w-full mt-2" style={{
                height: hauteurs[i], borderRadius: 14,
                background: dernier ? "linear-gradient(180deg,#8B5CF6,#C13BC1)" : i === 0 ? "#EFE8FB" : "#E5D9F8",
              }} />
              <span className="text-[13px] mt-2" style={{ color: dernier && m === ici ? E.t1 : E.t2, fontWeight: dernier && m === ici ? 700 : 400 }}>
                {m === ici ? "Aujourd’hui" : dateCourte(m.quand)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
