"use client";

import { cheminDuGuide } from "@/lib/photosGuide";
import { jouerSon } from "@/lib/sons";
import { Fragment, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { marquesDeReprise, type AvancementSeance } from "@/lib/seanceInterrompue";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, ChevronRight, Check, Plus, Pencil, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { createPortal } from "react-dom";
import { Compteur, ReglageCharge } from "@/components/seance/ReglageCharge";
import { AssistantSpark, VisageGuide, CelebrationGuide, MarqueAssistant } from "@/components/AssistantMark";
import { voix, nomGuide, type CleVoix } from "@/lib/guides";
import { CouvertureFin, TitreFin, ChiffresFin, CarteProgres, CarteRecord, SerieEtRang, CoinAvis, gainDuFait } from "@/components/seance/FinDeSeance";
import { useGuideActif } from "@/context/GuideContext";
import IntroSeance, { introDuJourAJouer, noterIntroDuJour } from "@/components/seance/IntroSeance";
import SceneTunnel, { PastilleScene } from "@/components/seance/SceneTunnel";
import ExerciseDetailSheet from "@/components/seance/ExerciseDetailSheet";
import { trouverExercice, type LibExercise } from "@/lib/exerciseLibrary";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { createClient } from "@/lib/supabase";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  CLE_DEVOILE, EVT_RELAIS, etatPoster, imageEtat,
  type MaillonFranchi,
} from "@/lib/defi";
import { calculerAura } from "@/lib/aura";
import { noterRang, rangMemorise } from "@/lib/celebrationRang";
import { jouerFinSeance } from "@/lib/musiqueRang";
import { noterBadges } from "@/lib/celebrationBadge";
import { peutProposerAvis, proposerAvis, SEANCES_AVANT_AVIS } from "@/lib/invitationAvis";
import { motCouverture } from "@/components/profil/CouvertureSeance";
import { chargerBadgesAura } from "@/lib/badgesAura";
import type { Badge } from "@/lib/badges";
import { useAuth } from "@/context/AuthContext";
import type { CibleSeance } from "@/lib/finSeance";
import {
  DUREE_EFFORT_HIIT, afficheDe, dependancesReelles, etatFinDeSeance, exercicesFaits, finaliserSeance, lignesDuJournal,
  emplacementDe, journalDe, nouveauLancement, nouvelleAttente, proprietaireDeLaSeance, seriesConfirmees,
  type EtatFin, type JournalSeance, type MarquesSeance, type Validation,
} from "@/lib/journalSeance";
import { secondesDeReps } from "@/lib/dureeLibre";
import {
  attenteApresSerie, blocDe, blocsDe, doseDe, enTeteDuBloc, pasPrecedent, pasSuivant, repsDeLaSerie,
  reperesDuPas, resteApres, type FormatBloc, type MarquesTours,
} from "@/lib/toursSeance";
import type { ExercicePrescrit } from "@/lib/banqueEtapes";
import {
  chargeReglable, cibleReps, crancherReps, declareDesRepetitions,
  libelleCharge, libelleEnregistre, libelleFait, libelleFourchette, type TypeChargeReglable,
} from "@/lib/saisieSerie";
import {
  equivalents, exerciceAffiche, exerciceCourant, lieuPourEquivalents, peutChanger, remplacer,
  type Equivalent, type Remplacements,
} from "@/lib/remplacement";
import {
  poserQuestion, prescriptionDe, propositionsDeSeance, questionUtile, type Marge, type SerieHistorique,
  cleReference,
} from "@/lib/progression";
import { fileDeMarges } from "@/lib/fileMarges";
import { cleCharge, corrigerMarge, cransConfirmes, historiqueDesExercices, referencesDepuisSeries } from "@/lib/progressionBase";
import { faitMarquant, sousGroupesParExercice, texteSerie } from "@/lib/recapSeance";
import { lireRecords, recordsParCle, cleRecord, recordBattu, perfDe, depasse, valeurRecord, type RecordMouvement, type Perf } from "@/lib/records";
import { perfDataToShare, type PerfShareData } from "@/lib/perfShareExport";
import EnvoyerAffiche from "@/components/communaute/EnvoyerAffiche";
import QuestionMarge from "@/components/seance/QuestionMarge";
import LaProchaineFois from "@/components/seance/LaProchaineFois";
import { afficheDuRecordBattu, partagerAfficheRecord } from "@/lib/recordShareExport";
import { choixApplicable, pasDeLEffort, pasDuRepos, repsADeclarer, type PositionTunnel, type SaisieReps } from "@/lib/transitionsTunnel";
import { useGestesAssistant } from "@/context/AssistantContext";
import { exerciseData } from "@/lib/exercicesCatalogue";

/* ── LE MOMENT DE REPOS, DÉDUIT DU COMPTEUR ────────────────────────────
   Le repos revient quinze à vingt-cinq fois par séance : une phrase unique
   répétée vingt fois cesse d'être lue au bout de trois. Le Guide en a donc
   quatre, et laquelle il prononce se DÉDUIT de l'état du tunnel, jamais du
   texte : premier repos de la séance, dernier exercice en cours, on change
   d'exercice après cette pause, ou une série de plus sur le même exercice.

   L'ordre des questions compte. « Dernier exercice » passe avant « on
   change d'exercice » parce qu'il porte l'information la plus utile à ce
   moment-là, et le premier repos passe avant tout le reste sauf le cas
   d'une séance à un seul exercice, où « dernier » reste vrai et plus
   parlant. */
function cleRepos(exerciseIdx: number, setIdx: number, sets: number, total: number): CleVoix {
  const dernierExo = exerciseIdx === total - 1;
  const dernierSet = setIdx === sets - 1;
  if (dernierExo) return "seance.repos.fin";
  if (exerciseIdx === 0 && setIdx === 0) return "seance.repos.debut";
  return dernierSet ? "seance.repos.exo" : "seance.repos.serie";
}

/* Dans un bloc ou un EMOM (lot 2) : « dernier exercice » devient le
   dernier tour d'un bloc qui finit la séance, la fin d'un tour a sa phrase,
   et on change d'exercice dès que la série qui vient est celle d'un autre. */
function cleReposTours(exos: Exercise[], exerciseIdx: number, setIdx: number, prochain: { e: number; s: number } | null): CleVoix {
  const b = blocDe(exos, exerciseIdx);
  const dernier = b ? b.fin === exos.length && setIdx === b.tours - 1 : exerciseIdx === exos.length - 1;
  if (dernier) return "seance.repos.fin";
  if (exerciseIdx === 0 && setIdx === 0) return "seance.repos.debut";
  if (b && prochain && prochain.e >= b.debut && prochain.e < b.fin && prochain.s > setIdx) return "seance.repos.tour";
  return prochain && prochain.e === exerciseIdx ? "seance.repos.serie" : "seance.repos.exo";
}

/* ─── Types ──────────────────────────────────────────────── */
export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  restAfter?: number;
  auto?: number;
  hiit?: boolean;
  tip: string;
  benefit: string;
  muscles: string[];
  /** Les exercices CONSÉCUTIFS qui portent le même `bloc` se jouent en
   *  tours : une série de chacun, dans l'ordre (lib/toursSeance.ts). */
  bloc?: string;
  /** Le nom du bloc à l'écran, lu sur son premier exercice. */
  format?: FormatBloc;
  /** Les répétitions de chaque série (pyramide, échelle, descente) ;
   *  `reps` reste le résumé d'une ligne. */
  repsParSerie?: string[];
  /** EMOM : chaque série dispose de ce nombre de secondes, et ce qui en
   *  reste est le repos. */
  emom?: number;
}

export interface WorkoutGuideModalProps {
  sessionId: string;
  title: string;
  accent: string;
  duration: number;
  difficulty: string;
  category?: string;
  heroImage?: string;
  onClose: () => void;
  /** Ce que la séance referme au planning une fois ENREGISTRÉE (R1) :
   *  le journal d'abord, la cible ensuite, jamais l'inverse. */
  cible?: CibleSeance | null;
  exerciseList?: Exercise[];
  /** Présent = la séance n'existe nulle part (une impro) et peut être gardée.
      La page décide, le tunnel ne fait qu'afficher la proposition. */
  onGarder?: () => void | boolean | Promise<boolean>;
  executionId?: string;
  reprise?: AvancementSeance;
  demarreeLe?: number;
  proprietaireReprise?: string;
  onProgress?: (exercises: Exercise[], avancement: AvancementSeance, debutMs: number) => void;
  onTerminee?: (gardee: boolean) => void;
  /** Présent quand cette séance EST le maillon d'un relais (lancée par
   *  « Lancer mon maillon »). C'est la SEULE façon de franchir un maillon :
   *  une séance ordinaire ne valide plus rien côté relais. */
  relaisRunId?: string;
}

type GuidePhase = "intro" | "exercising" | "resting" | "done";
type HiitSub    = "work" | "rest";

/* `secondesDeReps` (« 45s », « 2 min » → secondes) vient de `dureeLibre` :
   l'estimation d'une séance et ce chrono la lisent de la même façon. */
/* Vibration (best-effort) : ignorée si le navigateur/appareil ne la supporte pas. */
function vibrer(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

/* ─── Constants ──────────────────────────────────────────── */
const HIIT_WORK = DUREE_EFFORT_HIIT;
const HIIT_REST = 10;

/* ─── Util ───────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ─── Component ──────────────────────────────────────────── */
/* Les encres de la fin de séance, CLAIRE quel que soit le thème depuis le
   2026-10-22 (Louis, maquette « Les records Vaiiya », écran 4 en clair). */
const TUN = {
  t1: "#1F1B2E", t2: "#6B6580", t3: "#9A93AE", lav: "#6B4BD6",
  line: "rgba(31,27,46,0.08)",
  violet: "#8B5CF6", orange: "#F5B120", ring2: "#FF7A1A", teal: "#0B8A68",
};

/* Le tunnel est TOUT CLAIR depuis le 2026-10-18 (Louis : la composition de
   la piste A, « juste pour le fond je veux le tout clair »). Ses encres sont
   écrites en dur, comme celles de la vitrine : il ne suit pas le thème. La
   fin de séance l'a suivi le 2026-10-22 (Louis) : même fond, encres `TUN`. */
const CLAIR = {
  fond: "radial-gradient(150% 75% at 0% 0%, rgba(167,139,250,.30) 0%, rgba(167,139,250,.16) 35%, rgba(167,139,250,.05) 65%, transparent 90%), radial-gradient(150% 75% at 100% 100%, rgba(244,164,222,.28) 0%, rgba(244,164,222,.14) 35%, rgba(244,164,222,.04) 65%, transparent 90%), linear-gradient(180deg, #F3EEFF 0%, #FAF8FF 45%, #FFF6FB 100%)",
  t0: "#1A202C", t1: "#2D3748", t2: "#718096", t3: "#A0AEC0",
  exp: "#6D4BD6",
  /* L'orange de l'énergie sur un fond clair : l'encre pour un mot, le chiffre pour le 3-2-1. */
  feuEncre: "#B4470A", feuChiffre: "#E8620C",
  teal: "#2BD4A0", tealEncre: "#0B8A68",
  piste: "rgba(26,32,44,0.10)", ligne: "rgba(26,32,44,0.08)", rond: "rgba(255,255,255,0.78)",
};

/* ════════════════════════════════════════════════════════════════════
   R5 · LE FAIT MARQUANT (maquette 07, écran 08)

   Une phrase, avec son périmètre : l'exercice, la série, le jour. Le
   chiffre du jour en teal (réussite, système D), l'ancien en encre neutre.
   La règle vit dans `recapSeance.ts` ; ici on ne fait que la dire.
   ════════════════════════════════════════════════════════════════════ */
/* ── Les deux gestes de navigation sous le bouton principal ──
   Secondaires (système D) : du texte en encre discrète, jamais une
   surface. Le retour à gauche, le saut à droite, comme on lit une
   séance. Un geste impossible ne s'affiche pas. */
function NavExercice({ precedent, suivant }: { precedent: (() => void) | null; suivant: (() => void) | null }) {
  if (!precedent && !suivant) return null;
  const style = { color: CLAIR.t2 };
  return (
    <div className="w-full flex items-center justify-between">
      {precedent ? (
        <button onClick={precedent} className="text-[13px] font-semibold py-2 pr-3 cursor-pointer" style={style}>
          ‹ Exercice précédent
        </button>
      ) : <span />}
      {suivant ? (
        <button onClick={suivant} className="text-[13px] font-semibold py-2 pl-3 cursor-pointer" style={style}>
          Passer l’exercice ›
        </button>
      ) : <span />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   R5 · « VOIR MES N EXERCICES »

   Ce qui a été réellement fait, série par série, tel que le journal
   l'écrit. Pour un repère dont la marge a été donnée, la réponse se lit
   et se change ici (décision 54) : elle part par `corriger_marge`, et la
   base ne touche jamais une cible déjà acceptée.

   ⚠️ UN PORTAIL, À L'ÉTAGE 106 : le tunnel vit à 100, et la carte animée
   du tunnel ferait d'elle le référentiel d'un enfant `fixed`.
   ════════════════════════════════════════════════════════════════════ */
type LigneDuDetail = {
  emplacement: number; serie: number; exercice_nom: string;
  statut: "terminee" | "passee" | "non_atteinte";
  reps_declarees?: number | null; duree_s?: number | null; charge?: number | null; charge_type?: string | null;
};
function DetailExercices({ lignes, margeDe, estRepere, onMarge, onFermer, visage, question }: {
  lignes: LigneDuDetail[];
  question: string;
  margeDe: (e: number) => Marge | null;
  estRepere: (e: number) => boolean;
  onMarge: (e: number, m: Marge) => void;
  onFermer: () => void;
  visage: React.ReactNode;
}) {
  const groupes = [...new Set(lignes.map((l) => l.emplacement))].sort((a, b) => a - b)
    .map((e) => ({ e, lignes: lignes.filter((l) => l.emplacement === e).sort((a, b) => a.serie - b.serie) }))
    .filter((g) => g.lignes.some((l) => l.statut === "terminee"));
  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 106 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Fermer" onClick={onFermer} className="absolute inset-0 cursor-pointer" style={{ background: "rgba(26,20,40,0.35)" }} />
      <motion.div role="dialog" aria-label="Mes exercices"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="relative w-full max-w-md flex flex-col"
        style={{ maxHeight: "82dvh", background: "#FFFFFF", borderTopLeftRadius: "var(--r-feuille)", borderTopRightRadius: "var(--r-feuille)", border: `1px solid ${TUN.line}`, borderBottom: "none" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-[16px] font-bold" style={{ color: TUN.t1 }}>Mes exercices</h3>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="cursor-pointer p-1" style={{ color: TUN.t2 }}><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">
          {groupes.map(({ e, lignes: ls }) => {
            const marge = margeDe(e);
            return (
              <div key={e} className="py-3" style={{ borderTop: `1px solid ${TUN.line}` }}>
                {/* Un sous-groupe par passage d'exercice : le nom et la
                    vignette vont avec LEURS séries, jamais avec celles d'un
                    remplaçant (`sousGroupesParExercice`). */}
                {sousGroupesParExercice(ls).map((g, i) => (
                  <div key={`${g.nom}-${g.lignes[0].serie}`} className={i > 0 ? "mt-3" : undefined}>
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ width: 36, height: 36, background: "rgba(139,92,246,0.07)" }}>
                        <ExerciseThumb name={g.nom} size={34} />
                      </span>
                      <p className="text-[13px] font-bold" style={{ color: TUN.t1 }}>{g.nom}</p>
                    </div>
                    <ul className="mt-2 flex flex-col gap-1">
                      {g.lignes.map((l) => (
                        <li key={l.serie} className="flex justify-between text-[13px]">
                          <span style={{ color: TUN.t3 }}>Série {l.serie}</span>
                          <span className="vy-nombre" style={{ color: l.statut === "terminee" ? TUN.t1 : TUN.t3 }}>{texteSerie(l)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {estRepere(e) && marge !== null && (
                  <div className="mt-3">
                    <QuestionMarge clair question={question}
                      reponse={marge} visage={visage} onRepondre={(m) => onMarge(e, m)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/* ── LA BANDE DU MAILLON ──────────────────────────────────────────
   Le dévoilement de l'affiche attendait qu'on aille le chercher sur un
   écran que rien ne reliait au reste : on franchissait un maillon en
   silence. Il se voit maintenant là où il se gagne, dans la même famille
   que « Journée validée » juste au-dessus, avec la mini-affiche qui
   bascule sous les yeux de son état précédent au nouveau.

   ⚠️ Le bouton ouvre LA CONVERSATION, pas /defi : c'est là que vit
   l'équipier, et c'est le moment où on a envie de lui écrire. L'affiche
   en grand est à un tap de là. */
function BandeMaillon({ maillon, onAller }: { maillon: MaillonFranchi; onAller: () => void }) {
  // L'affiche suit l'avancée COMMUNE (le min des deux). Mon maillon ne la
  // fait avancer que si je viens de rattraper le binôme.
  const avant = etatPoster(Math.min(maillon.mine - 1, maillon.partner), maillon.objectif);
  const apres = etatPoster(maillon.min, maillon.objectif);
  const [etat, setEtat] = useState(avant);

  useEffect(() => {
    if (avant === apres) return;           // le 3ᵉ jour ne change pas l'image
    const t = setTimeout(() => setEtat(apres), 900);
    return () => clearTimeout(t);
  }, [avant, apres]);

  // La fin de séance est claire : l'or y devient une encre (5,9:1 sur blanc).
  const or = "#8A5A06";
  const encre = "#6B6580";

  return (
    <motion.button
      type="button"
      onClick={onAller}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75 }}
      className="flex items-center gap-3 w-full max-w-[19rem] px-3.5 py-2.5 rounded-2xl mt-2.5 text-left"
      style={{ background: "rgba(245,177,32,0.10)", border: "1px solid rgba(245,177,32,0.28)" }}
    >
      <span
        className="relative flex-shrink-0 overflow-hidden"
        style={{ width: 32, height: 44, borderRadius: 7, background: "rgba(31,27,46,0.12)" }}
        aria-hidden="true"
      >
        <AnimatePresence mode="sync">
          <motion.img
            key={etat}
            src={imageEtat(maillon.serie, etat)}
            alt=""
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
      </span>

      <span className="flex-1 min-w-0">
        <strong className="block text-[13px] font-bold" style={{ color: or }}>
          {maillon.reussi ? "L’affiche est complète" : "Maillon franchi"}
        </strong>
        <small className="block text-[11px]" style={{ color: encre }}>
          {maillon.reussi
            ? `Elle est à vous${maillon.equipier ? ` et à ${maillon.equipier.pseudo}` : ""}.`
            : maillon.bloque
              ? `Maillon ${maillon.maillon} fait · on attend ${maillon.enGroupe ? "le groupe" : (maillon.equipier?.pseudo ?? "ton binôme")}.`
              : `Maillon ${maillon.maillon} sur ${maillon.objectif} · continue !`}
        </small>
      </span>

      <ChevronRight size={16} strokeWidth={2.5} style={{ color: or, flexShrink: 0 }} />
    </motion.button>
  );
}

/* ── LA BANDE DU BADGE ────────────────────────────────────────────
   Un badge qui apparaît en silence n'existe pas : sans cette bande, on
   ne le découvrirait qu'en allant sur son profil, c'est-à-dire jamais.
   Elle se pose dans la même famille que « Journée validée » et
   « Maillon franchi », au même endroit, à la suite. Aucun écran neuf :
   c'est le geste déjà validé trois fois dans ce projet.

   Elle est VIOLETTE là où les deux autres sont oranges, parce qu'un
   badge n'est pas de l'énergie : c'est ce qu'on garde. */
function BandeBadge({ badges, onAller }: { badges: Badge[]; onAller: () => void }) {
  const premier = badges[0];
  const autres = badges.length - 1;

  return (
    <motion.button
      type="button"
      onClick={onAller}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="flex items-center gap-3 w-full max-w-[19rem] px-3.5 py-2.5 rounded-2xl mt-2.5 text-left"
      style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.28)" }}
    >
      <span
        className="relative flex-shrink-0 grid place-items-center overflow-hidden rounded-full"
        style={{ width: 38, height: 38, background: premier.degrade, border: "2px solid #D7A62A" }}
        aria-hidden="true"
      >
        {premier.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={premier.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          : <span className="text-[16px] font-black tabular-nums" style={{ color: "#fff", letterSpacing: "-0.04em" }}>{premier.nombre ?? "\u2726"}</span>}
      </span>

      <span className="flex-1 min-w-0">
        <strong className="block text-[13px] font-bold" style={{ color: "#6D4BD6" }}>
          {autres > 0 ? `${badges.length} badges gagnés` : "Badge gagné"}
        </strong>
        <small className="block text-[11px]" style={{ color: "#6B6580" }}>
          {premier.nom}{autres > 0 ? ` et ${autres} autre${autres > 1 ? "s" : ""}` : ""}
        </small>
      </span>

      <ChevronRight size={16} strokeWidth={2.5} style={{ color: "#6D4BD6", flexShrink: 0 }} />
    </motion.button>
  );
}

export default function WorkoutGuideModal({
  sessionId, title, duration, category, heroImage, onClose, cible, exerciseList,
  onGarder, relaisRunId, executionId, reprise, demarreeLe, proprietaireReprise, onProgress, onTerminee,
}: WorkoutGuideModalProps) {
  const router = useRouter();
  // On injecte un `auto` (durée) déduit des reps pour les exos chronométrés d'une
  // séance custom (gainage « 45s », tenue « 30 sec »…) qui n'en portent pas.
  const exercises = useMemo<Exercise[]>(() => {
    const base = (exerciseList && exerciseList.length > 0) ? exerciseList : (exerciseData[sessionId] ?? []);
    return base.map((e) => {
      if (e.auto || e.hiit) return e;
      const sec = secondesDeReps(e.reps);
      return sec ? { ...e, auto: sec } : e;
    });
  }, [exerciseList, sessionId]);

  const { open: openAssistant } = useGestesAssistant();
  const { guide } = useGuideActif();

  const [phase,         setPhase]         = useState<GuidePhase>(reprise?.phase ?? "intro");
  const [exerciseIdx,   setExerciseIdx]   = useState(reprise?.exerciseIdx ?? 0);
  const [setIdx,        setSetIdx]        = useState(reprise?.setIdx ?? 0);
  const [restCountdown, setRestCountdown] = useState(reprise?.restCountdown ?? 0);
  const [restTotal,     setRestTotal]     = useState(reprise?.restTotal ?? 0);
  const [restMode,      setRestMode]      = useState<"set" | "exercise">(reprise?.restMode ?? "set");
  const [autoCountdown, setAutoCountdown] = useState(reprise?.autoCountdown ?? 0);
  const [prep,          setPrep]          = useState(reprise?.prep ?? 0);
  const [badgesGagnes,  setBadgesGagnes]  = useState<Badge[]>([]);
  const [hiitSub,       setHiitSub]       = useState<HiitSub>(reprise?.hiitSub ?? "work");
  const [doneMap,       setDoneMap]       = useState<MarquesSeance>(() => marquesDeReprise(reprise));
  /* R1 · un identifiant par lancement, tiré une fois : la base refuse
     d'enregistrer deux fois le même, donc un appel rejoué ne double rien. */
  const [lancementId] = useState(() => executionId ?? nouveauLancement());
  /* Comment la série chronométrée en cours se termine si on la valide à la
     main (« Valider », « Passer l'effort ») : posé par le bouton, lu par
     l'effet du minuteur. Sans ça, un minuteur abrégé passerait pour fini. */
  const validationRef = useRef<{ validation: Validation; dureeS: number | null } | null>(reprise?.validationEnCours ?? null);
  /* ── R3 · ce que les séances PRESCRITES déclarent ──
     `remplacements` : l'exercice des séries qui restent, par emplacement
     (chaque série validée garde le sien dans sa marque). `chargeCourante` :
     la charge saisie pour l'exercice en cours d'un emplacement ; elle
     repart inconnue à chaque changement d'exercice, jamais héritée.
     `correction` : la série qu'on corrige pendant le repos. */
  const [remplacements, setRemplacements] = useState<Remplacements>(reprise?.remplacements ?? {});
  const [chargeCourante, setChargeCourante] = useState<Record<number, number | null>>(reprise?.chargeCourante ?? {});
  const [editCharge,    setEditCharge]    = useState(false);
  const [correction,    setCorrection]    = useState<{ emplacement: number; serie: number; reps: number; charge: number | null } | null>(reprise?.correction ?? null);
  /* Le panneau « Changer » retient la série de son ouverture : son choix
     ne s'applique qu'à elle (tour 27). */
  const [changer,       setChanger]       = useState<(PositionTunnel & { choisi: Equivalent | null }) | null>(null);
  /* Les répétitions réellement faites, réglées AVANT « Fait » : elles ne
     valent que pour la série où on les a saisies (tour 27). */
  const [repsSaisie,    setRepsSaisie]    = useState<SaisieReps | null>(reprise?.repsSaisie ?? null);
  const [editReps,      setEditReps]      = useState(false);
  /* R4 · ce qui sert à la progression, lu une fois au montage. `null` =
     pas encore lu, ou illisible : la charge de départ reste alors
     inconnue et aucun cran n'est supposé. */
  /* R5 · l'historique des exercices prescrits, lu par séances entières :
     la charge de départ (R4) et le fait marquant de la fin s'en servent. */
  const [historique,    setHistorique]    = useState<SerieHistorique[] | null>(null);
  const [crans,         setCrans]         = useState<Map<string, number> | null>(null);
  /* Les records d'avant la séance, mouvement par mouvement (`lib/records`). */
  const [records,       setRecords]       = useState<Map<string, RecordMouvement> | null>(null);
  /* Les réponses données dans l'écran de fin, quand le repère terminait
     la séance : elles s'écrivent après l'enregistrement (`corriger_marge`). */
  const [margesFin,     setMargesFin]     = useState<Record<number, Marge>>(reprise?.margesFin ?? {});
  /* Écrites dans l'ordre, avec la dernière réponse confirmée, et rejouées
     après un échec (`fileDeMarges`, tour 30). */
  const [fileMarges] = useState(() => fileDeMarges((e, m) => corrigerMarge(lancementId, e, m)));
  /* Les questions déjà présentées : c'est elles que compte le plafond de
     deux, pas les exercices éligibles à l'instant (tour 30). */
  const [questionsPosees, setQuestionsPosees] = useState<number[]>(reprise?.questionsPosees ?? []);
  /* La vibration de fin de repos ne joue qu'une fois, même quand une
     correction ouverte fait attendre la reprise. */
  const finReposVibreeRef = useRef(false);
  const [startMs,       setStartMs]       = useState(() => reprise ? Date.now() - reprise.elapsed * 1000 : 0);
  const [elapsed,       setElapsed]       = useState(reprise?.elapsed ?? 0);
  /* EMOM (lib/toursSeance) : le temps passé sur la série en cours, compté
     sur le chrono de la séance, pauses exclues. Une reprise repart d'une
     minute neuve. */
  const elapsedRef = useRef(reprise?.elapsed ?? 0);
  const debutPasRef = useRef(reprise?.elapsed ?? 0);
  const [paused,        setPaused]        = useState(false);
  /* La fiche d'un mouvement, ouverte depuis la scène ou « Au programme ». */
  const [fiche,         setFiche]         = useState<LibExercise | null>(null);
  const [sessionSaved,  setSessionSaved]  = useState(false);
  /* Ce qui n'est pas allé au bout : le journal lui-même, ou une suite
     (planning, relais, affiche). L'écran le DIT au lieu de faire comme si,
     et propose de réessayer. La phrase vient de `etatFinDeSeance`. */
  const [finIncomplete, setFinIncomplete] = useState<Exclude<EtatFin, { genre: "ok" }> | null>(null);
  // L'affiche s'enregistre TOUTE SEULE dans le profil en fin de séance ; ce
  // drapeau ne sert qu'à le confirmer à l'écran. Elle se revoit, s'envoie et se
  // supprime depuis le profil (galerie « Tes affiches de perf »).
  const [afficheSaved, setAfficheSaved] = useState(false);
  /* La série APRÈS cette séance, lue en base une fois l'enregistrement fait.
     `null` tant qu'on ne la connaît pas : on ne montre jamais un compteur
     provisoire qui se corrigerait sous les yeux. */
  const [serieDuJour, setSerieDuJour] = useState<number | null>(null);
  /* L'invite à laisser un avis, proposée UNE SEULE FOIS par compte, au moment
     fort qu'est la fin de séance. Le drapeau se pose à l'affichage (dans l'effet
     de complétion), donc « Plus tard » comme « Laisser un avis » la referment
     pour de bon. Jamais après un abandon : on n'atteint « done » qu'en finissant. */
  // Choix de Louis : l'invite à laisser un avis s'affiche à CHAQUE fin de séance.
  // On la rend dès que la séance est finie (phase « done ») ; ce drapeau ne sert
  // qu'à la masquer si on touche « Plus tard », et il repart à faux à la séance
  // suivante (le tunnel se remonte à chaque lancement).
  const [avisMasque, setAvisMasque] = useState(false);
  /* Le maillon du relais, quand cette séance vient d'en franchir un.
     `null` couvre TOUS les cas silencieux : pas de relais, jour déjà pris
     par l'équipier, deux jours de suite, séance trop courte. Aucune bande,
     aucun reproche. */
  const [maillon,       setMaillon]       = useState<MaillonFranchi | null>(null);
  const [garde,         setGarde]         = useState<"idle" | "en_cours" | "echec" | "gardee" | "refusee">("idle");
  const gardeEnCours = useRef(false);
  /* R5 · le rang après la séance (le dernier étage), l'affiche à envoyer,
     et la feuille « Voir mes exercices ». */
  const [expFin,        setExpFin]        = useState<number | null>(null);
  const [afficheData,   setAfficheData]   = useState<PerfShareData | null>(null);
  const [envoyerOuvert, setEnvoyerOuvert] = useState(false);
  const [detailOuvert,  setDetailOuvert]  = useState(false);
  const [seanceIdFin,   setSeanceIdFin]   = useState<string | null>(null);
  /* Le propriétaire du journal dont l'affiche vient. Le partage n'existe
     que pour LUI : si un autre compte se connecte tunnel ouvert, la feuille
     se ferme et le bouton disparaît (le journal, lui, reste à son
     propriétaire et se reprend à son retour). */
  const [afficheProprio, setAfficheProprio] = useState<string | null>(null);

  const { user, session } = useAuth();

  /* R1 bis · le compte qui a COMMENCÉ la séance, figé au départ. Le
     journal et ses suites lui appartiennent, même si la session change
     avant la fin (`proprietaireDeLaSeance`). */
  const proprietaireRef = useRef<string | null>(reprise ? proprietaireReprise ?? null : null);
  const pausedAtRef = useRef<number>(0);
  /** L'instant réel du départ : `startMs` se décale à chaque pause. */
  const debutRef = useRef<number | null>(reprise ? demarreeLe ?? null : null);

  const memoriser = useCallback(() => {
    if (phase !== "exercising" && phase !== "resting") return;
    onProgress?.(exercises, { phase, exerciseIdx, setIdx, doneMap,
      elapsed: paused || !startMs ? elapsed : Math.max(elapsed, Math.floor((Date.now() - startMs) / 1000)),
      restCountdown, restTotal, restMode, autoCountdown: validationRef.current && hiitSub === "work" ? 0 : autoCountdown, prep, hiitSub,
      remplacements, chargeCourante, repsSaisie, correction, margesFin, questionsPosees,
      validationEnCours: validationRef.current,
    }, debutRef.current ?? Date.now());
  }, [phase, exerciseIdx, setIdx, doneMap, paused, startMs, elapsed, restCountdown, restTotal, restMode, autoCountdown, prep, hiitSub, exercises, onProgress, remplacements, chargeCourante, repsSaisie, correction, margesFin, questionsPosees]);
  useEffect(() => { memoriser(); }, [memoriser]);
  useEffect(() => {
    const interrompre = () => {
      if (phase !== "exercising" && phase !== "resting") return;
      memoriser();
      if (!paused) { pausedAtRef.current = Date.now(); setPaused(true); }
    };
    const visibilite = () => { if (document.hidden) interrompre(); };
    document.addEventListener("visibilitychange", visibilite);
    window.addEventListener("pagehide", interrompre);
    return () => { document.removeEventListener("visibilitychange", visibilite); window.removeEventListener("pagehide", interrompre); };
  }, [phase, paused, memoriser]);
  const quitter = () => { memoriser(); onClose(); };

  /* ── Masque la barre de navigation du bas tant que la séance guidée est ouverte
        (sinon, sur mobile, elle se superpose au bas de la modale). ── */
  useEffect(() => lockBodyModal(), []);

  /* ── R1 · LA FIN DE SÉANCE : LE JOURNAL D'ABORD ──
     L'ordre est la règle (`journalSeance.ts`) : on enregistre la séance et
     ses séries, ENSUITE on referme la cible du planning, ENSUITE viennent
     le maillon et l'affiche. Tout ce travail est gardé sur l'appareil tant
     qu'il n'est pas fait, et se reprend sans doublon (R1 bis). */
  /* ⚠️ LE JOURNAL SE CONSTRUIT UNE SEULE FOIS. « Réessayer » le réutilise :
     le reconstruire déplacerait l'heure de fin du même lancement. */
  const journalRef = useRef<JournalSeance | null>(null);
  /* Les lectures d'après séance (rang, série, badges) ne se font qu'une fois. */
  const lecturesFaitesRef = useRef(false);
  const enregistrer = () => {
    const proprietaire = proprietaireDeLaSeance(proprietaireRef.current, user?.id ?? null);
    if (!proprietaire) return;
    const supabase = createClient();
    const resolvedCategory = category ?? (sessionId.includes("-") ? sessionId.split("-")[0] : null) ?? "force";
    journalRef.current ??= journalDe({
      lancementId,
      proprietaire,
      titre: title,
      categorie: resolvedCategory,
      /* ⚠️ L'HEURE DU DÉBUT, PLUS CELLE DE LA FIN. `started_at` recevait
         l'instant de l'enregistrement : une séance commencée à 8 h 30 et
         finie à 9 h 10 ne comptait pas pour « Lève-tôt ». */
      debutMs: debutRef.current,
      dureeS: elapsed,
      exercices: exercises,
      marques: doneMap,
      remplacements,
    });
    const finalisation = finaliserSeance(dependancesReelles(supabase), nouvelleAttente({
      journal: journalRef.current,
      cible: cible ?? null,
      relaisRunId: relaisRunId ?? null,
    }));
    // Le journal et ses suites sont maintenant dans l'attente R1. Ne plus
    // proposer de refaire la dernière série sous le même lancement.
    onTerminee?.(false);
    void finalisation.then((r) => {
      onTerminee?.(r.gardeeSurAppareil || r.journal === "enregistre");
      const etat = etatFinDeSeance(r);
      setFinIncomplete(etat.genre === "ok" ? null : etat);
      if (r.journal !== "enregistre") return;
      setSessionSaved(true);
      if (r.seanceId) setSeanceIdFin(r.seanceId);
      if (r.afficheGardee) {
        setAfficheSaved(true);
        if (r.seanceId && journalRef.current) {
          setAfficheData(perfDataToShare(afficheDe(journalRef.current, r.seanceId), { user: user?.pseudo }));
          setAfficheProprio(journalRef.current.proprietaire);
        }
      }
      if (r.maillon) {
        // Le drapeau reste : si on quitte sans toucher la bande, la
        // grande affiche rejouera la bascule à la première ouverture.
        sessionStorage.setItem(CLE_DEVOILE, "1");
        setMaillon(r.maillon);
        // L'écran /defi vit sous ce tunnel (overlay global) : on lui dit
        // de se recharger pour montrer le nouvel état co-op.
        window.dispatchEvent(new Event(EVT_RELAIS));
      }
      /* Le rang, la série et les badges se lisent pour la session : on ne
         les lit que si c'est bien elle qui a fait la séance. */
      if (!lecturesFaitesRef.current && user?.id === proprietaire) {
        lecturesFaitesRef.current = true;
        lireApresSeance(supabase);
      }
    });
  };

  /* Ce qui se LIT après une séance enregistrée : la série, le rang, les
     badges. Rien ne s'écrit ici ; la célébration reste ponctuelle. */
  const lireApresSeance = (supabase: ReturnType<typeof createClient>) => {
    if (!user) return;
    /* La séance vient de valider la journée : c'est le bon moment pour
       montrer la série, pas la prochaine ouverture de l'accueil. Même
       lecture pour le passage de rang, silencieux si rien n'a bougé. */
    void calculerAura(supabase, user.id)
      .then((etat) => {
        if (!etat) return;
        noterRang(user.id, etat.rang);
        setExpFin(etat.exp);
        if (etat.jourValide) setSerieDuJour(etat.serie);
      })
      .catch(() => {});

    /* Les badges se lisent APRÈS l'insertion : le compte de séances et le
       crédit du jour sont déjà écrits, donc ce que le serveur rend est
       bien l'état d'après la séance. Silencieux au premier passage et
       quand rien n'a bougé (voir `noterBadges`). */
    void chargerBadgesAura(user.id)
      .then(({ slugs }) => {
        const neufs = noterBadges(user.id, slugs);
        if (neufs.length) setBadgesGagnes(neufs);
      })
      .catch(() => {});

    /* La 3ᵉ séance terminée ouvre la question de l'avis, une seule fois par
       personne. On ne compte que si la porte est encore ouverte : passé ce
       jour, plus aucune séance ne paie cette lecture. */
    if (peutProposerAvis(user.id)) {
      const minutes = Math.max(1, Math.round(elapsed / 60));
      const series = seriesConfirmees(doneMap);
      void supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id)
        .then(({ count }) => {
          if (count === SEANCES_AVANT_AVIS) {
            proposerAvis(user.id, { pourquoi: "seances", surtitre: "Séance terminée", mot: motCouverture(title || "Séance"), minutes, series });
          }
        });
    }
  };

  useEffect(() => {
    if (phase !== "done") return;
    enregistrer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Les références de charge (R4), tirées de cet historique. `null` tant
     qu'il n'est pas lu, ou s'il est illisible. */
  const references = useMemo(() => {
    if (!historique) return null;
    const reglables = exercises.flatMap((ex) => {
      const p = (ex as ExercicePrescrit).prescription;
      return p && chargeReglable(p.charge_type) ? [{ ...p, series: ex.sets }] : [];
    });
    return referencesDepuisSeries(historique, reglables);
  }, [historique, exercises]);
  /* R4 · LA CHARGE DE DÉPART D'UN EMPLACEMENT, tant que personne n'y a
     touché : la cible ACCEPTÉE recopiée dans la prescription, sinon la
     dernière réalisation complète et comparable (« La dernière fois »).
     Après un remplacement, rien : la charge du premier exercice ne devient
     jamais celle du remplaçant (décision 56). */
  const departDe = useCallback((e: number): { charge: number; origine: "acceptee" | "historique"; termineLe?: string } | null => {
    const pr = (exercises[e] as ExercicePrescrit | undefined)?.prescription;
    if (!pr || !chargeReglable(pr.charge_type) || remplacements[e]) return null;
    if (typeof pr.charge_cible === "number" && pr.charge_cible > 0) return { charge: pr.charge_cible, origine: "acceptee" };
    const ref = references?.get(cleReference({ ...pr, series: exercises[e]?.sets ?? 0 }));
    return ref ? { charge: ref.charge, origine: "historique", termineLe: ref.termineLe } : null;
  }, [exercises, remplacements, references]);
  /* R4 · une seule lecture au montage : l'historique des exercices
     prescrits (R5 : de tous les types, le fait marquant en a besoin au
     poids du corps aussi) et les crans. Sans prescription, rien n'est lu. */
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    const prescrits = exercises
      .flatMap((ex) => { const p = (ex as ExercicePrescrit).prescription; return p ? [{ ...p, series: ex.sets }] : []; });
    if (prescrits.length === 0) return;
    let vivant = true;
    void historiqueDesExercices(userId, prescrits.map((p) => p.cle))
      .then((h) => { if (vivant) setHistorique(h); });
    const reglables = prescrits.filter((p) => chargeReglable(p.charge_type));
    if (reglables.length > 0) {
      void cransConfirmes(userId, reglables.map((p) => p.cle))
        .then((m) => { if (vivant) setCrans(m); });
    }
    return () => { vivant = false; };
  }, [userId, exercises]);
  /* Les records se lisent une fois, au montage, sur les mouvements prescrits :
     ce sont les seuls où l'on déclare un chiffre. */
  useEffect(() => {
    if (!userId) return;
    const cles = exercises.flatMap((ex) => { const p = (ex as ExercicePrescrit).prescription; return p ? [p.cle] : []; });
    if (cles.length === 0) return;
    let vivant = true;
    void lireRecords(userId, cles).then((r) => { if (vivant && r) setRecords(recordsParCle(r)); });
    return () => { vivant = false; };
  }, [userId, exercises]);
  const chargeEnCours = useCallback(
    (e: number): number | null => (e in chargeCourante ? (chargeCourante[e] ?? null) : (departDe(e)?.charge ?? null)),
    [chargeCourante, departDe],
  );

  /* R3 · ce que l'écran montre : la prescription d'origine (séries,
     répétitions, repos), avec le nom, le conseil et les muscles du
     remplaçant. Le journal, lui, part de `exercises` et des marques. */
  const exercisesAff = useMemo(
    () => exercises.map((e, i) => exerciceAffiche(e as ExercicePrescrit, i, remplacements)),
    [exercises, remplacements],
  );
  const cur      = exercisesAff[exerciseIdx];
  const curPrescrit = exercises[exerciseIdx] as ExercicePrescrit | undefined;
  const declare  = declareDesRepetitions(curPrescrit);
  const effectif = curPrescrit ? exerciceCourant(curPrescrit, exerciseIdx, remplacements) : null;
  const typeCharge = effectif?.chargeType ?? null;
  const reglable = declare && chargeReglable(typeCharge);
  const chargeCur = reglable ? chargeEnCours(exerciseIdx) : null;
  const departCur = reglable && !(exerciseIdx in chargeCourante) ? departDe(exerciseIdx) : null;

  /* ── R4 · la question et la proposition, avec les mêmes critères ──
     Les séries de chaque emplacement telles que le journal les écrirait,
     puis les emplacements où la question a sa place (au plus deux). */
  const prescriptionsR4 = useMemo(() => exercises.map((e) => prescriptionDe(e as ExercicePrescrit)), [exercises]);
  /* Le partage appartient au propriétaire du journal, jamais au compte
     connecté par hasard (R5, tour 35). */
  const partageOuvert = !!afficheData && !!user && user.id === afficheProprio;
  /* Au changement de compte, la feuille se FERME (tour 36) : elle ne
     revient pas toute seule au retour du propriétaire, il faut un nouveau
     geste. Ajustement pendant le rendu, comme React le recommande pour un
     état qui dépend d'une autre valeur, plutôt qu'un effet. */
  if (envoyerOuvert && !partageOuvert) setEnvoyerOuvert(false);
  const lignesCourantes = useMemo(() => lignesDuJournal(exercises, doneMap, remplacements), [exercises, doneMap, remplacements]);
  const aQuestion = questionsPosees;
  /* Revue finale (P1) · l'index du tunnel NAVIGUE, l'emplacement IDENTIFIE.
     Dans une version courte ils divergent : tout ce qui part du tunnel
     (journal, marge, acceptation) porte l'emplacement de la prescription. */
  const idDe = (i: number) => emplacementDe(exercises[i], i);
  const navDe = (id: number) => exercises.findIndex((ex, i) => emplacementDe(ex, i) === id);
  const margeNav = (e: number): Marge | null =>
    doneMap[e]?.[(exercises[e]?.sets ?? 1) - 1]?.statut === "terminee"
      ? (margesFin[e] ?? (doneMap[e]?.[(exercises[e]?.sets ?? 1) - 1] as { marge?: Marge | null }).marge ?? null)
      : null;
  /** La marge d'un emplacement PERSISTÉ. */
  const margeDe = (id: number): Marge | null => { const e = navDe(id); return e < 0 ? null : margeNav(e); };
  /* Un repère sans repos derrière lui (dernier exercice, ou attente nulle) :
     sa question est facultative dans l'écran de fin. */
  const sansRepos = (e: number) => {
    const ex = exercises[e];
    if (!ex || e === exercises.length - 1) return true;
    return ((ex.restAfter ?? 0) > 0 ? (ex.restAfter as number) : (ex.rest ?? 0)) <= 0;
  };
  /* R4 · les propositions de la fin, et R5 · le fait marquant : les deux
     lisent les séries telles que le journal les écrit. */
  const emplacementsFinis = prescriptionsR4.flatMap((p, e) => p ? [{
    emplacement: idDe(e), nom: exercises[e].name, prescription: p,
    series: lignesCourantes.filter((l) => l.emplacement === idDe(e)),
  }] : []);
  const propositionsFin = propositionsDeSeance(
    emplacementsFinis.map((x) => ({ ...x, marge: margeDe(x.emplacement) })),
    (cle, type) => crans?.get(cleCharge(cle, type)) ?? null,
  );
  const fait = phase === "done" ? faitMarquant(emplacementsFinis, historique, seanceIdFin) : null;
  const gainFin = fait ? gainDuFait(fait) : null;
  const repondreAuRepos = (m: Marge) => setDoneMap((prev) => {
    const marque = prev[exerciseIdx]?.[setIdx];
    if (!marque || marque.statut !== "terminee") return prev;
    return { ...prev, [exerciseIdx]: { ...prev[exerciseIdx], [setIdx]: { ...marque, marge: m } } };
  });
  const cibleCur = cibleReps(cur);
  const repsCur  = declare ? repsADeclarer(cibleCur, repsSaisie, { emplacement: exerciseIdx, serie: setIdx }) : null;
  /* Le record du mouvement en cours, et ce que la série en cours en fait. */
  const recordCur = effectif ? records?.get(cleRecord(effectif.cle, effectif.nom)) : undefined;
  const battuCur = recordCur && repsCur !== null
    ? recordBattu(recordCur, perfDe(recordCur.mesure, { reps: repsCur, dureeS: null, charge: chargeCur }))
    : null;
  /* La fin : le premier mouvement dont le meilleur de la séance dépasse son record d'avant. */
  const recordFin = phase === "done" && records ? (() => {
    const meilleurs = new Map<string, Perf>();
    for (const l of lignesCourantes) {
      if (l.statut !== "terminee") continue;
      const r = records.get(cleRecord(l.exercice_cle, l.exercice_nom));
      if (!r) continue;
      const p = perfDe(r.mesure, { reps: l.reps_declarees, dureeS: l.duree_s, charge: l.charge ?? null });
      const deja = meilleurs.get(r.cle);
      if (p && (!deja || depasse(r.mesure, p, deja))) meilleurs.set(r.cle, p);
    }
    for (const [cle, p] of meilleurs) {
      const r = records.get(cle)!;
      const b = recordBattu(r, p);
      if (b) return { record: r, ...b };
    }
    return null;
  })() : null;
  /* Le panneau ne vaut que pour la série où il a été ouvert ; tant qu'il
     vaut, le 3-2-1 et le chrono sont suspendus. */
  const choixOuvert = !!changer && choixApplicable(changer, { emplacement: exerciseIdx, serie: setIdx, enEffort: phase === "exercising" });
  const isHiit   = !!cur?.hiit;
  const isTimered = !!(cur?.auto || cur?.hiit);
  const totalSets = exercises.reduce((a, e) => a + e.sets, 0);
  /* Lot 2 · le bloc de l'exercice en cours (circuit, superset, EMOM) et,
     pendant un repos, la série qui vient (lib/toursSeance). Un exercice
     joué seul garde l'affichage d'avant. */
  const blocsDuProgramme = useMemo(() => blocsDe(exercises), [exercises]);
  const blocCur = blocDe(exercises, exerciseIdx);
  const enTours = !!blocCur || (cur?.emom ?? 0) > 0;
  const prochainPas = phase === "resting" && enTours
    ? pasSuivant(exercises, doneMap as MarquesTours, exerciseIdx, setIdx, "serie") : null;
  const reperes = reperesDuPas(exercises, exerciseIdx, setIdx);

  /* R4 · les réponses de l'écran de fin s'écrivent une fois la séance
     enregistrée, sans bloquer sa finalisation. */
  useEffect(() => {
    if (!sessionSaved) return;
    for (const [e, m] of Object.entries(margesFin)) void fileMarges.demander(emplacementDe(exercises[Number(e)], Number(e)), m);
  }, [sessionSaved, margesFin, fileMarges, exercises]);

  /* ── Elapsed clock ── */
  useEffect(() => {
    if (phase === "intro" || phase === "done" || startMs === 0 || paused) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      const s = Math.floor((Date.now() - startMs) / 1000);
      elapsedRef.current = s;
      setElapsed(s);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, startMs, paused]);

  /* ── Où reprendre un exercice ──
     Depuis qu'on peut revenir en arrière, un exercice peut avoir déjà des
     séries TERMINÉES quand on y entre. On reprend à la première qui ne
     l'est pas, et un exercice entièrement terminé ne se refait pas tout
     seul en avançant. Une série « passée » reste ouverte : la passer
     n'est pas l'avoir faite.
     Depuis le lot 2, cette règle vit dans `lib/toursSeance` (`pasSuivant`,
     `pasPrecedent`) : la même pour un exercice seul, et elle joue un bloc
     (circuit, superset) tour après tour. */

  /** Pose le tunnel sur une série, chrono et décompte compris. */
  const entrerDans = useCallback((e: number, s: number) => {
    setFiche(null); setChanger(null); setEditReps(false); setEditCharge(false);
    validationRef.current = null;
    setRestMode("set");
    setExerciseIdx(e); setSetIdx(s);
    setAutoCountdown(0); setHiitSub("work");
    setPhase("exercising");
    debutPasRef.current = elapsedRef.current;
    const ex = exercises[e];
    if (ex?.auto)      { setAutoCountdown(ex.auto); setPrep(3); }
    else if (ex?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); setPrep(3); }
  }, [exercises]);

  /* ── Quitter l'exercice en cours ──
     Les marques se passent quand l'appelant vient de les changer
     (« Passer l'exercice ») : l'état n'est pas encore à jour, et un
     exercice passé reviendrait au tour suivant d'un bloc. */
  const skipExercise = useCallback((marques?: MarquesSeance) => {
    const p = pasSuivant(exercises, (marques ?? doneMap) as MarquesTours, exerciseIdx, setIdx, "exercice");
    if (p) { entrerDans(p.e, p.s); return; }
    setFiche(null); setChanger(null); setEditReps(false);
    setPhase("done");
  }, [exercises, exerciseIdx, setIdx, doneMap, entrerDans]);

  /* ── Revenir à l'exercice précédent ──
     Le geste inverse de « Passer l'exercice ». On reprend l'exercice
     d'avant à sa première série non terminée (ou au début s'il était
     fini, pour pouvoir le refaire). Ses séries marquées « passées » sont
     effacées : on est revenu dessus, il n'est plus sauté. Les séries
     terminées ne bougent pas ; en refaire une remplace sa marque. Dans un
     bloc, c'est la série d'avant dans l'ordre du jeu. */
  const revenirExercice = useCallback(() => {
    const p = pasPrecedent(exercises, doneMap as MarquesTours, exerciseIdx, setIdx);
    if (!p) return;
    setDoneMap(m => {
      const parSerie = { ...(m[p.e] ?? {}) };
      for (const k of Object.keys(parSerie)) if (parSerie[Number(k)]?.statut === "passee") delete parSerie[Number(k)];
      return { ...m, [p.e]: parSerie };
    });
    entrerDans(p.e, p.s);
  }, [exercises, exerciseIdx, setIdx, doneMap, entrerDans]);

  /* ── Advance to next set / exercise ── */
  const advance = useCallback(() => {
    const nextSet = setIdx + 1;
    const nextEx  = exerciseIdx + 1;
    setFiche(null);
    /* Un bloc se joue tour après tour : la série suivante est celle de
       l'exercice suivant du tour, ou du tour d'après. */
    if (blocDe(exercises, exerciseIdx)) {
      const p = pasSuivant(exercises, doneMap as MarquesTours, exerciseIdx, setIdx, "serie");
      if (p) entrerDans(p.e, p.s);
      else { setChanger(null); setEditReps(false); setPhase("done"); }
      return;
    }
    if (nextSet < (exercises[exerciseIdx]?.sets ?? 1)) {
      setSetIdx(nextSet); setPhase("exercising");
      debutPasRef.current = elapsedRef.current;
      const e = exercises[exerciseIdx];
      if (e?.auto)      { setAutoCountdown(e.auto); setPrep(3); }
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); setPrep(3); }
    } else if (nextEx < exercises.length) {
      /* Plus aucune attente posée ici : l’unique temps du changement
         d’exercice est décidé dans `completeSet`, juste en dessous. Le
         passage à l’exercice suivant est celui de « Passer l’exercice » :
         il saute ce qui est déjà terminé (on a pu revenir en arrière). */
      skipExercise();
    } else {
      setPhase("done");
    }
  }, [exercises, exerciseIdx, setIdx, skipExercise, doneMap, entrerDans]);

  /* ── Complete a set ──

     ⚠️ UN SEUL TEMPS D’ATTENTE AU CHANGEMENT D’EXERCICE. `rest` est le repos
     entre deux SÉRIES du même exercice ; `restAfter` est la TRANSITION vers
     l’exercice suivant, et elle contient déjà la récupération plus le temps de
     changer de place ou de matériel. Le tunnel servait les deux à la suite,
     donc 60 s puis 90 s entre deux exercices, et la séance dépassait d’autant
     la durée annoncée : les trois estimateurs (le prompt de
     /api/workout/generate, `calcDuration` dans assistantActions, `calculerDuree`
     dans CreateSessionModal) comptent tous `(sets - 1) × rest` PUIS `restAfter`,
     jamais un repos de série après la dernière série. Le doublon ne se voyait
     que sur les séances qui portent une transition : celles de l’IA, celles
     qu’on compose soi-même, celles du planning. Le catalogue n’en déclare
     aucune, d’où le repli sur `rest` pour lui garder son comportement.

     Après la toute dernière série de la séance, plus rien ne suit : on va droit
     à l’écran de fin au lieu d’imposer un compte à rebours devant une carte
     « Ensuite » vide et une phrase qui annonce un dernier exercice déjà fini. */
  const completeSet = useCallback((validation: Validation, dureeS: number | null = null) => {
    /* R3 · une série prescrite garde l'exercice réellement fait ; en
       répétitions, elle déclare exactement ce que le bouton affichait. */
    const pr = exercises[exerciseIdx] as ExercicePrescrit | undefined;
    const exo = pr ? exerciceCourant(pr, exerciseIdx, remplacements) : null;
    const decl = declareDesRepetitions(pr);
    const reps = decl ? repsADeclarer(cibleReps(pr), repsSaisie, { emplacement: exerciseIdx, serie: setIdx }) : null;
    const charge = decl && chargeReglable(exo?.chargeType) ? chargeEnCours(exerciseIdx) : null;
    const marque = {
      statut: "terminee" as const, validation, dureeS,
      ...(exo ? { exercice: exo } : {}),
      ...(decl ? { reps, charge } : {}),
    };
    setDoneMap(prev => ({
      ...prev,
      [exerciseIdx]: { ...(prev[exerciseIdx] ?? {}), [setIdx]: marque },
    }));
    setEditCharge(false); setEditReps(false); setChanger(null);
    finReposVibreeRef.current = false;
    const ex         = exercises[exerciseIdx];
    const dernierSet = setIdx + 1 >= (ex?.sets ?? 1);
    /* R4 · la dernière série d'un repère : sa question est présentée ici,
       une fois pour toutes, si elle est utile et s'il reste de la place. */
    if (dernierSet) {
      const p = prescriptionDe(ex as ExercicePrescrit);
      if (p) {
        const series = lignesDuJournal(exercises, { ...doneMap, [exerciseIdx]: { ...(doneMap[exerciseIdx] ?? {}), [setIdx]: marque } }, remplacements)
          .filter((l) => l.emplacement === emplacementDe(ex, exerciseIdx));
        setQuestionsPosees((prev) => poserQuestion(prev, exerciseIdx, questionUtile(series, p)));
      }
    }
    /* Un bloc ou un EMOM (lib/toursSeance) : la série suivante peut être
       celle d'un autre exercice, et l'attente vient de la règle des tours
       (EMOM : ce qui reste de la minute). Le repos finit par `advance`,
       qui sait jouer un bloc. */
    if (blocDe(exercises, exerciseIdx) || (ex?.emom ?? 0) > 0) {
      const marques = { ...doneMap, [exerciseIdx]: { ...(doneMap[exerciseIdx] ?? {}), [setIdx]: marque } };
      const prochain = pasSuivant(exercises, marques as MarquesTours, exerciseIdx, setIdx, "serie");
      const attenteTour = attenteApresSerie(exercises, exerciseIdx, setIdx, prochain, elapsedRef.current - debutPasRef.current);
      if (prochain && attenteTour > 0) {
        setRestMode("set");
        setRestTotal(attenteTour); setRestCountdown(attenteTour); setPhase("resting");
      } else advance();
      return;
    }
    const resteUnExo = exerciseIdx + 1 < exercises.length;
    if (dernierSet && !resteUnExo) { advance(); return; }
    const attente = dernierSet
      ? ((ex?.restAfter ?? 0) > 0 ? (ex?.restAfter as number) : (ex?.rest ?? 0))
      : (ex?.rest ?? 0);
    if (attente > 0) {
      setRestMode(dernierSet ? "exercise" : "set");
      setRestTotal(attente); setRestCountdown(attente); setPhase("resting");
    } else advance();
  }, [exercises, exerciseIdx, setIdx, advance, remplacements, chargeEnCours, repsSaisie, doneMap]);

  /* ── « Passer l'exercice » : un geste explicite, qui se dit au journal ──
     Les séries restantes sont « passées », pas « non atteintes » : c'est
     la seule différence entre sauter et ne pas avoir eu le temps. */
  const passerExercice = useCallback(() => {
    const ex = exercises[exerciseIdx];
    const parSerie = { ...(doneMap[exerciseIdx] ?? {}) };
    for (let s = setIdx; s < (ex?.sets ?? 1); s++) if (!parSerie[s]) parSerie[s] = { statut: "passee" };
    const marques = { ...doneMap, [exerciseIdx]: parSerie };
    setDoneMap(marques);
    validationRef.current = null;
    /* Dans un bloc, l'exercice passé ne revient pas aux tours suivants. */
    skipExercise(marques);
  }, [exercises, exerciseIdx, setIdx, doneMap, skipExercise]);

  /* ── R3 · Corriger la série qu'on vient d'enregistrer ──
     Facultatif : sans y toucher, la série reste telle que le bouton l'a
     dite. Une correction de charge vaut aussi pour les séries suivantes du
     même exercice ; une correction de répétitions ne vaut que pour elle. */
  const ouvrirCorrection = () => {
    const m = doneMap[exerciseIdx]?.[setIdx];
    if (!m || m.statut !== "terminee" || typeof m.reps !== "number") return;
    setCorrection({ emplacement: exerciseIdx, serie: setIdx, reps: m.reps, charge: m.charge ?? null });
  };
  const enregistrerCorrection = () => {
    if (!correction) return;
    const { emplacement, serie, reps, charge } = correction;
    const avant = doneMap[emplacement]?.[serie];
    setDoneMap(prev => {
      const m = prev[emplacement]?.[serie];
      if (!m || m.statut !== "terminee") return prev;
      return { ...prev, [emplacement]: { ...prev[emplacement], [serie]: { ...m, reps, charge } } };
    });
    /* La nouvelle charge suit, tant que l'exercice n'a pas changé depuis. */
    const pr = exercises[emplacement] as ExercicePrescrit | undefined;
    const courant = pr ? exerciceCourant(pr, emplacement, remplacements) : null;
    if (avant?.statut === "terminee" && avant.exercice && courant && avant.exercice.cle === courant.cle) {
      setChargeCourante(c => ({ ...c, [emplacement]: charge }));
    }
    setCorrection(null);
  };

  /* ── R3 · Changer d'exercice (pour cette séance seulement) ──
     Les séries déjà faites restent à l'exercice d'origine (leur marque
     porte l'exercice réellement fait). Le remplaçant prend la série en
     cours et les suivantes, avec une charge inconnue. */
  const appliquerRemplacement = (ouvert: PositionTunnel, par: Equivalent) => {
    /* Refusé si le tunnel a bougé depuis l'ouverture : le choix ne tombe
       jamais sur un autre exercice que celui qu'on regardait. */
    if (!choixApplicable(ouvert, { emplacement: exerciseIdx, serie: setIdx, enEffort: phase === "exercising" })) {
      setChanger(null); return;
    }
    const { emplacement } = ouvert;
    const pr = exercises[emplacement] as ExercicePrescrit | undefined;
    if (!pr) return;
    setRemplacements(r => remplacer(pr, emplacement, r, par));
    setChargeCourante(c => ({ ...c, [emplacement]: null }));
    setEditCharge(false); setEditReps(false); setFiche(null); setChanger(null);
    if (pr.auto) { setAutoCountdown(pr.auto); setPrep(3); }
  };

  /* ── Pause / resume ── */
  const togglePause = useCallback(() => {
    if (!paused) {
      pausedAtRef.current = Date.now();
      setPaused(true);
    } else {
      const pausedDuration = Date.now() - pausedAtRef.current;
      setStartMs(prev => prev + pausedDuration);
      setPaused(false);
    }
  }, [paused]);

  /* Toucher la scène ouvre la fiche du mouvement (elle remplace la démo
     YouTube). Pendant un chrono ou un repos, la séance se met en pause le
     temps de la lire, et reprend à la fermeture si c'est la fiche qui l'a
     arrêtée. */
  const pauseParFiche = useRef(false);
  const ouvrirFiche = (exo: LibExercise) => {
    if (!paused && (phase === "resting" || (phase === "exercising" && isTimered))) {
      pauseParFiche.current = true;
      togglePause();
    }
    setFiche(exo);
  };
  const fermerFiche = () => {
    setFiche(null);
    if (pauseParFiche.current) {
      pauseParFiche.current = false;
      if (paused) togglePause();
    }
  };

  /* L'écran reste allumé pendant la séance (maquette « Le tunnel ») : un
     repos ne doit pas laisser le téléphone se mettre en veille. Là où le
     navigateur ne sait pas le faire, rien ne change. Le verrou tombe tout
     seul quand l'app passe en arrière-plan : on le redemande au retour. */
  const seanceEnCours = phase === "exercising" || phase === "resting";
  useEffect(() => {
    if (!seanceEnCours || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    type Verrou = { release: () => Promise<void> };
    const api = (navigator as unknown as { wakeLock: { request: (t: "screen") => Promise<Verrou> } }).wakeLock;
    let verrou: Verrou | null = null;
    let actif = true;
    const demander = () => {
      if (document.visibilityState !== "visible") return;
      api.request("screen").then((v) => { if (actif) verrou = v; else void v.release().catch(() => {}); }).catch(() => {});
    };
    demander();
    document.addEventListener("visibilitychange", demander);
    return () => {
      actif = false;
      document.removeEventListener("visibilitychange", demander);
      void verrou?.release().catch(() => {});
    };
  }, [seanceEnCours]);

  /* ── Rest countdown ── */
  useEffect(() => {
    if (phase !== "resting") return;
    /* R3 · SAISIE PROTÉGÉE (décision 55) : une correction ouverte ne
       disparaît jamais. Le compteur reste à zéro et la reprise attend
       qu'on enregistre ou qu'on annule ; fermer la correction relance
       cet effet, qui avance alors UNE fois. La décision vit dans
       `pasDuRepos`, que le banc rejoue. */
    const pas = pasDuRepos({ restant: restCountdown, enPause: paused, correctionOuverte: !!correction, vibree: finReposVibreeRef.current });
    if (pas.action === "attendre") return;
    if (pas.action === "zero") {
      if (pas.vibrer) { vibrer([70, 50, 70]); jouerSon("finRepos"); finReposVibreeRef.current = true; } // fin de récup
      if (!pas.reprendre) return;
      if (restMode === "exercise") { setRestMode("set"); skipExercise(); }
      else advance();
      return;
    }
    const t = setTimeout(() => { if (!document.hidden) setRestCountdown(c => c - 1); }, 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restCountdown, paused, restMode, correction]);

  /* ── Les sons du tunnel (lib/sons.ts) ──
     Le 3-2-1 sonne parce que le téléphone est souvent posé : on doit
     savoir que l'effort part sans regarder l'écran. Mêmes trois dernières
     secondes à la fin d'un repos. Chaque son se joue sur un CHANGEMENT de
     valeur (ref), jamais à chaque rendu. */
  const prepPrecRef = useRef(prep);
  useEffect(() => {
    const avant = prepPrecRef.current;
    prepPrecRef.current = prep;
    if (phase !== "exercising" || paused || prep === avant) return;
    if (prep > 0 && prep <= 3) jouerSon("tic");
    else if (prep === 0 && avant > 0) jouerSon("go");
  }, [prep, phase, paused]);

  const reposPrecRef = useRef(restCountdown);
  useEffect(() => {
    const avant = reposPrecRef.current;
    reposPrecRef.current = restCountdown;
    if (phase !== "resting" || paused || restCountdown === avant) return;
    if (restCountdown > 0 && restCountdown <= 3 && restCountdown < avant) jouerSon("tic");
  }, [restCountdown, phase, paused]);

  /* La séance finie joue la musique DU RANG, en court (Louis, 2026-10-24) :
     on entend son rang chaque fois qu'on termine. Le rang est celui que cet
     appareil a vu en dernier ; si la séance le fait monter, la scène du
     passage prend le relais et chasse cette musique. */
  const compteSon = user?.id;
  useEffect(() => {
    if (phase === "done") jouerFinSeance(rangMemorise(compteSon)?.id);
  }, [phase, compteSon]);

  /* ── Décompte 3-2-1 avant chaque effort chronométré ── */
  /* R3 · le choix d'un remplaçant suspend le 3-2-1 ET le chrono
     (`pasDeLEffort`) : aucune série ne se valide derrière le panneau, et
     l'annuler reprend là où on en était. */
  useEffect(() => {
    if (phase !== "exercising") return;
    if (pasDeLEffort({ enPause: paused, choixOuvert, prep, chronometre: !!(cur?.auto || cur?.hiit), restant: autoCountdown }) !== "decompter_prep") return;
    const t = setTimeout(() => { if (!document.hidden) setPrep(p => p - 1); }, 1000);
    return () => clearTimeout(t);
  }, [phase, prep, paused, choixOuvert, cur, autoCountdown]);

  /* ── Auto / HIIT countdown ── */
  useEffect(() => {
    if (phase !== "exercising" || !cur) return;
    const pas = pasDeLEffort({ enPause: paused, choixOuvert, prep, chronometre: !!(cur.auto || cur.hiit), restant: autoCountdown });
    if (pas === "attendre" || pas === "decompter_prep") return;
    if (pas === "terminer") {
      vibrer(90); jouerSon("finEffort"); // fin d'effort chronométré (ou fin d'un segment HIIT)
      if (cur.hiit && hiitSub === "work") { setHiitSub("rest"); setAutoCountdown(HIIT_REST); return; }
      /* Arrivé au bout tout seul, sauf si un bouton l'a abrégé juste avant. */
      const v = validationRef.current
        ?? { validation: "minuteur_fini" as const, dureeS: cur.hiit ? HIIT_WORK : (cur.auto ?? null) };
      validationRef.current = null;
      completeSet(v.validation, v.dureeS); return;
    }
    const t = setTimeout(() => { if (!document.hidden) setAutoCountdown(c => c - 1); }, 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, autoCountdown, hiitSub, cur, paused, prep, choixOuvert]);

  /* ── Start ── */
  /* La première séance du jour s'ouvre sur l'intro « Prêt ? » (IntroSeance) ;
     son 3-2-1 remplace celui du premier effort chronométré. */
  const [introOuverte, setIntroOuverte] = useState(false);
  const lancerSeance = () => {
    if (user?.id && introDuJourAJouer(user.id, guide)) {
      noterIntroDuJour(user.id);
      setIntroOuverte(true);
      return;
    }
    startWorkout();
  };
  const sansDecompteRef = useRef(false);
  const finIntro = () => { setIntroOuverte(false); sansDecompteRef.current = true; startWorkout(); };
  const startWorkout = () => {
    setStartMs(Date.now());
    debutRef.current = Date.now();
    elapsedRef.current = 0; debutPasRef.current = 0;
    proprietaireRef.current = user?.id ?? null;
    setExerciseIdx(0); setSetIdx(0); setDoneMap({}); setPaused(false); setFiche(null);
    setRemplacements({}); setChargeCourante({}); setCorrection(null); setEditCharge(false); setChanger(null);
    setRepsSaisie(null); setEditReps(false);
    setPhase("exercising");
    const prep0 = sansDecompteRef.current ? 0 : 3;
    sansDecompteRef.current = false;
    if (exercises[0]?.auto)      { setAutoCountdown(exercises[0].auto); setPrep(prep0); }
    else if (exercises[0]?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); setPrep(prep0); }
  };

  /* ── Timers ── */
  const autoTotal  = isHiit ? (hiitSub === "work" ? HIIT_WORK : HIIT_REST) : (cur?.auto ?? 0);
  const add15      = () => { setRestTotal(t => t + 15); setRestCountdown(c => c + 15); };

  /* ── L'effort et le repos sont clairs depuis le 2026-10-18, la fin de
     séance depuis le 2026-10-22 : tout le tunnel l'est, quel que soit le thème. ── */
  const isTunnel = phase !== "intro";
  /* L'effort et le repos prennent tout l'écran, et leur squelette ne bouge
     plus : la scène en haut, la console, le bouton au même endroit. */
  const tunnelActif = phase === "exercising" || phase === "resting";

  /* ── Dérivés fiche & fin ── */
  const kcalEst  = Math.round(duration * 6.5);
  const muscleSummary = Array.from(new Set(exercises.flatMap(e => e.muscles)))
    .slice(0, 3).join(" · ").toUpperCase();
  /* Une pyramide prévoit autre chose à chaque série (lib/toursSeance). */
  const repsTexte = cur ? repsDeLaSerie(cur, setIdx) : "";
  const repsMatch = repsTexte.match(/^(\d+)\s*(.*)$/);
  const repsHero  = repsMatch ? repsMatch[1] : repsTexte;
  const repsSub   = repsMatch ? (repsMatch[2] || "répétitions") : "";

  /* ─────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(8,5,16,0.62)", backdropFilter: "blur(12px)" }}
    >
      {introOuverte && guide && <IntroSeance guide={guide} onFin={finIntro} />}
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className={tunnelActif
          ? "relative w-full h-[100dvh] sm:h-[min(860px,94dvh)] sm:max-w-md sm:rounded-[var(--r-feuille)] flex flex-col overflow-hidden"
          : "relative w-full sm:max-w-md rounded-t-[var(--r-feuille)] sm:rounded-[var(--r-feuille)] flex flex-col overflow-hidden"}
        style={tunnelActif ? {
          background: CLAIR.fond,
          boxShadow: "0 -4px 60px rgba(0,0,0,0.3)",
        } : {
          background: isTunnel ? CLAIR.fond : "rgba(var(--surface-rgb),0.98)",
          backdropFilter: "blur(24px)",
          boxShadow: isTunnel
            ? "0 -4px 60px rgba(0,0,0,0.3)"
            : "0 -4px 60px rgba(var(--accent-rgb),0.12), 0 0 0 1px rgba(var(--surface-rgb),0.9)",
          maxHeight: "94dvh",
        }}
      >
        {tunnelActif ? (
          <>
            {/* ══ L'EN-TÊTE : les segments « stories » (teal = fait, violet =
                en cours), le temps, le Guide, la pause, fermer ══ */}
            <div className="flex-shrink-0 px-4" style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}>
              <div className="flex gap-[5px]">
                {exercises.map((ex, e) => {
                  /* Un segment par exercice, rempli par ses séries déjà
                     marquées : dans un circuit, plusieurs exercices avancent
                     ensemble, tour après tour. */
                  const marquees = Object.values(doneMap[e] ?? {}).filter(Boolean).length;
                  const part   = Math.min(1, marquees / Math.max(1, ex.sets));
                  const done   = part >= 1;
                  const curSeg = !done && (e === exerciseIdx || marquees > 0);
                  const fill   = part * 100;
                  return (
                    <span key={e} className="h-1 flex-1 rounded-full overflow-hidden"
                      style={{ background: done ? CLAIR.teal : CLAIR.piste }}>
                      {curSeg && (
                        <motion.span className="block h-full rounded-full"
                          style={{ background: "linear-gradient(90deg,#8B5CF6,#C13BC1)" }}
                          animate={{ width: `${fill}%` }} transition={{ duration: 0.5 }} />
                      )}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="vy-nombre text-[13px] px-3 py-1.5 rounded-full"
                  style={{ color: CLAIR.t2, background: CLAIR.rond, border: `1px solid ${CLAIR.ligne}` }}>
                  {fmt(elapsed)}
                </span>
                <div className="flex items-center gap-2">
                  {/* Raccourci discret vers le Guide : une question pendant l'effort */}
                  <button onClick={() => openAssistant()}
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                    style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.35)" }}
                    aria-label="Poser une question au coach IA">
                    {guide ? <MarqueAssistant guide={guide} px={28} /> : <AssistantSpark px={15} />}
                  </button>
                  <button onClick={togglePause}
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: CLAIR.rond, border: `1px solid ${CLAIR.ligne}`, color: CLAIR.t2 }}
                    aria-label={paused ? "Reprendre" : "Pause"}>
                    {paused ? <Play size={14} strokeWidth={2} /> : <Pause size={14} strokeWidth={2} />}
                  </button>
                  <button onClick={quitter}
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: CLAIR.rond, border: `1px solid ${CLAIR.ligne}`, color: CLAIR.t2 }}
                    aria-label="Fermer">
                    <X size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            {/* ══ LA SCÈNE : le geste en grand. Au repos, elle joue déjà le
                mouvement qui vient ; au 3-2-1, elle montre la position de
                départ ; en pause, elle se fige. Toucher la scène ouvre la
                fiche du mouvement (la démo YouTube n'existe plus). ══ */}
            {(() => {
              const dernierSet = setIdx === (cur?.sets ?? 1) - 1;
              const ensuite = phase !== "resting" ? null
                : enTours ? (prochainPas ? exercisesAff[prochainPas.e] : null)
                : (dernierSet ? exercisesAff[exerciseIdx + 1] : cur);
              const nomScene = phase === "resting" ? (ensuite?.name ?? cur?.name ?? "") : (cur?.name ?? "");
              const exoScene = trouverExercice(nomScene);
              const enPrep = phase === "exercising" && isTimered && prep > 0;
              const chrono = phase === "exercising" && isTimered && !enPrep && autoTotal > 0 ? autoCountdown / autoTotal : null;
              const changerOuvrable = phase === "exercising" && !enPrep && peutChanger(curPrescrit, setIdx);
              const coin = phase === "resting" ? (
                ensuite ? (
                  <PastilleScene>
                    <span className="flex-shrink-0" style={{ color: CLAIR.feuEncre }}>Ensuite</span>
                    {/* Un nom long se coupe : la pastille ne passe jamais sous « Voir en grand ». */}
                    <span className="min-w-0 truncate">
                      {enTours && prochainPas
                        ? `· ${ensuite.name}, ${repsDeLaSerie(exercises[prochainPas.e], prochainPas.s)}`
                        : dernierSet ? `· ${ensuite.name}, ${doseDe(ensuite)}`
                        : `· série ${setIdx + 2} sur ${cur?.sets ?? 1}${cur?.repsParSerie ? `, ${repsDeLaSerie(cur, setIdx + 1)}` : ""}`}
                    </span>
                  </PastilleScene>
                ) : null
              ) : enPrep ? (
                <PastilleScene>En position</PastilleScene>
              ) : (
                <>
                  {isHiit && (
                    <PastilleScene>
                      <span style={{ color: hiitSub === "work" ? CLAIR.feuEncre : CLAIR.tealEncre }}>{hiitSub === "work" ? "Effort" : "Récupère"}</span>
                    </PastilleScene>
                  )}
                  {/* R3 · « Changer » : seulement sur un exercice prescrit, tant
                      qu'une série reste à faire (`peutChanger`). */}
                  {changerOuvrable && (
                    <PastilleScene onClick={() => setChanger({ emplacement: exerciseIdx, serie: setIdx, choisi: null })}>
                      <ArrowLeftRight size={14} strokeWidth={2.4} style={{ color: CLAIR.exp }} aria-hidden="true" /> Changer
                    </PastilleScene>
                  )}
                </>
              );
              return (
                <SceneTunnel
                  key={`${phase}-${nomScene}`}
                  nom={nomScene}
                  fige={enPrep}
                  enPause={paused}
                  barre={enPrep ? 1 : chrono}
                  encreBarre={isHiit && hiitSub === "rest" ? "teal" : "feu"}
                  coin={coin}
                  onOuvrir={exoScene ? () => ouvrirFiche(exoScene) : undefined}
                />
              );
            })()}

            {/* ══ LA CONSOLE : où l'on est, le chiffre qu'on regarde de loin, et
                le Guide. Elle défile en elle-même sur un petit écran : la
                scène et le bouton ne bougent pas.
                ⚠️ La hauteur minimale est celle d'un effort ordinaire (titre
                sur une ligne, consigne sur deux) : sans elle, la console du
                repos, plus courte, faisait descendre la ligne de sol de 38 px
                (18 en pause), et le personnage sautait d'un état à l'autre. ══ */}
            <div className="flex-shrink-0 overflow-y-auto px-5 pt-3" style={{ minHeight: "min(210px, 32dvh)", maxHeight: "52dvh", scrollbarWidth: "none" }}>
              {phase === "exercising" && cur && (
                <div>
                  <p className="text-[13px] font-bold" style={{ color: CLAIR.exp }}>{reperes.titre}</p>
                  <h2 className="font-black uppercase leading-[1.04] tracking-tight mt-1" style={{ fontSize: 26, color: CLAIR.t0, textWrap: "balance" }}>{cur.name}</h2>
                  {/* Un exercice écrit à la main n'a ni animation ni fiche : il
                      garde un simple lien, qui ouvre YouTube à part. */}
                  {!trouverExercice(cur.name) && (
                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${cur.name} technique`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-[13px] font-semibold" style={{ color: CLAIR.exp }}>
                      Voir une démo sur YouTube <ArrowUpRight size={13} strokeWidth={2.4} aria-hidden="true" />
                    </a>
                  )}

                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      {isTimered ? (
                        prep > 0 ? (
                          <div className="flex items-end gap-2.5">
                            <motion.span key={prep} initial={{ scale: 1.25, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}
                              className="vy-nombre leading-none" style={{ fontSize: 80, fontWeight: 800, color: CLAIR.feuChiffre }}>{prep}</motion.span>
                            <span className="text-[16px] font-semibold mb-1.5" style={{ color: CLAIR.t2 }}>Mets-toi en position</span>
                          </div>
                        ) : (
                          <div className="flex items-end gap-2.5">
                            <span className="vy-nombre leading-none" style={{ fontSize: 80, fontWeight: 800, color: CLAIR.t0 }}>{autoCountdown}</span>
                            <span className="text-[16px] font-semibold mb-1.5" style={{ color: CLAIR.t2 }}>{autoCountdown > 1 ? "secondes" : "seconde"}</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-end gap-2.5">
                          {/* R3 · tour 27 : sur une série prescrite, toucher le nombre
                              règle les répétitions réellement faites AVANT « Fait ».
                              La cible prescrite reste affichée et ne change pas. */}
                          {declare && repsCur !== null ? (
                            editReps ? (
                              <div className="flex items-center gap-2 py-2">
                                <Compteur clair valeur={String(repsCur)}
                                  onMoins={() => setRepsSaisie({ emplacement: exerciseIdx, serie: setIdx, reps: crancherReps(repsCur, -1) })}
                                  onPlus={() => setRepsSaisie({ emplacement: exerciseIdx, serie: setIdx, reps: crancherReps(repsCur, 1) })} />
                                <button type="button" onClick={() => setEditReps(false)}
                                  className="ml-1 px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer text-white"
                                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)" }}>
                                  OK
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setEditReps(true)} className="inline-flex items-end gap-1.5 cursor-pointer"
                                aria-label="Régler les répétitions faites">
                                <span className="vy-nombre leading-none" style={{ fontSize: 80, fontWeight: 800, color: CLAIR.t0 }}>{repsCur}</span>
                                <Pencil size={16} strokeWidth={2.2} style={{ color: CLAIR.exp, marginBottom: 10 }} />
                              </button>
                            )
                          ) : (
                            <span className="vy-nombre leading-none" style={{ fontSize: String(repsHero).length > 4 ? 44 : 80, fontWeight: 800, color: CLAIR.t0 }}>{repsHero}</span>
                          )}
                          {!editReps && (() => {
                            /* R3 · la fourchette remplace le mot « répétitions » quand
                               la séance est prescrite ; elle ne demande aucune saisie. */
                            const f = declare ? libelleFourchette(curPrescrit?.prescription?.reps_min, curPrescrit?.prescription?.reps_max) : null;
                            const sous = f ?? repsSub;
                            const cible = declare && repsCur !== null && cibleCur !== null && repsCur !== cibleCur;
                            return sous || cible ? (
                              <span className="flex flex-col mb-1.5 min-w-0">
                                {cible && <span className="text-[13px] font-semibold" style={{ color: CLAIR.t3 }}>Cible {cibleCur}</span>}
                                {sous && <span className="text-[16px] font-semibold" style={{ color: CLAIR.t2 }}>{sous}</span>}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      )}
                      {/* Le record du mouvement : la marque ne s'allume que quand
                          la série en cours le dépasse. Elle ne dit rien avant. */}
                      {battuCur && phase === "exercising" && (
                        <span className="inline-flex items-center gap-1.5 self-start mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.6L21 9.3l-5 4.4 1.6 6.8L12 17l-5.6 3.5L8 13.7 3 9.3l6.4-.7z" /></svg>
                          Nouveau record · avant {valeurRecord(recordCur!.mesure, battuCur.avant)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 pb-1.5">
                      <span className="text-[13px] font-semibold" style={{ color: CLAIR.t2 }}>{reperes.position}</span>
                      <span className="flex flex-wrap justify-end gap-[7px]">
                        {Array.from({ length: cur.sets }).map((_, i) => {
                          const isDone = doneMap[exerciseIdx]?.[i]?.statut === "terminee";
                          const isCur  = i === setIdx;
                          return (
                            <span key={i} className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center"
                              style={{
                                background: isDone ? "rgba(43,212,160,0.16)" : "transparent",
                                border: isDone ? `1.5px solid ${CLAIR.teal}` : isCur ? "2px solid #8B5CF6" : "1.5px solid rgba(26,32,44,0.16)",
                                boxShadow: isCur ? "0 0 10px rgba(139,92,246,0.35)" : "none",
                              }}>
                              {isDone && <Check size={10} strokeWidth={3.4} style={{ color: CLAIR.tealEncre }} />}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  </div>

                  {/* R3 · la charge, sous les répétitions, avec son crayon. Une
                      charge inconnue reste inconnue : rien n'est inventé. R4 ·
                      d'où vient la charge de départ, discrètement. */}
                  {!isTimered && reglable && (
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      {editCharge ? (
                        <ReglageCharge
                          clair
                          valeur={chargeCur}
                          type={typeCharge as TypeChargeReglable}
                          onChange={(v) => setChargeCourante(c => ({ ...c, [exerciseIdx]: v }))}
                          onFin={() => setEditCharge(false)}
                        />
                      ) : (
                        <button onClick={() => setEditCharge(true)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full cursor-pointer"
                          style={{ background: CLAIR.rond, border: `1px solid ${CLAIR.ligne}`, color: CLAIR.t1 }}
                          aria-label="Modifier la charge">
                          {/* Le visage du chiffre pour une charge, jamais pour le mot « Charge ». */}
                          <span className={chargeCur === null ? "text-[16px]" : "vy-nombre text-[16px]"} style={{ fontWeight: 700 }}>
                            {chargeCur === null ? "Charge ?" : libelleCharge(chargeCur, typeCharge as TypeChargeReglable)}
                          </span>
                          <Pencil size={13} strokeWidth={2.2} style={{ color: CLAIR.exp }} />
                        </button>
                      )}
                      {departCur && !editCharge && (
                        <span className="flex flex-col text-[13px] leading-tight">
                          <span style={{ color: CLAIR.t3 }}>{departCur.origine === "acceptee" ? "Objectif accepté" : "La dernière fois"}</span>
                          {departCur.origine !== "acceptee" && (
                            <span className="font-semibold" style={{ color: CLAIR.t2 }}>
                              {new Date(departCur.termineLe ?? "").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Le Guide qui parle : son visage, sa phrase, aucune carte autour.
                      En pause, il attend (`listen`, le vrai emploi de cet état côté
                      sport). Charge inconnue : il dit comment la choisir, À LA PLACE
                      du geste (décision 50). Sinon, le geste. Les séances du planning
                      arrivent parfois sans conseil : mieux vaut alors rien du tout. */}
                  {paused ? (
                    <div className="flex gap-3 items-center mt-4">
                      <span className="flex-shrink-0">
                        {guide ? <VisageGuide guide={guide} etat="listen" size={44} /> : <Pause size={18} strokeWidth={2} style={{ color: CLAIR.exp }} />}
                      </span>
                      <p className="text-[16px] font-semibold" style={{ color: CLAIR.t1 }}>{guide ? voix(guide, "seance.pause") : "En pause"}</p>
                    </div>
                  ) : reglable && chargeCur === null ? (
                    <div className="flex gap-3 items-start mt-4">
                      <span className="flex-shrink-0 mt-0.5">
                        {guide ? <VisageGuide guide={guide} etat="explain" size={30} /> : <AssistantSpark px={17} />}
                      </span>
                      <p className="text-[13px] leading-relaxed" style={{ color: CLAIR.t2 }}>
                        {voix(guide, "seance.charge.choisir", { reps: curPrescrit?.prescription?.reps_max ?? cibleCur ?? 12 })}
                      </p>
                    </div>
                  ) : cur.tip ? (
                    <div className="flex gap-3 items-start mt-4">
                      <span className="flex-shrink-0 mt-0.5">
                        {guide ? <VisageGuide guide={guide} etat="explain" size={30} /> : <AssistantSpark px={17} />}
                      </span>
                      <p className="text-[13px] leading-relaxed" style={{ color: CLAIR.t2 }}><b style={{ color: CLAIR.t0 }}>Le geste&nbsp;: </b>{cur.tip}</p>
                    </div>
                  ) : null}
                </div>
              )}

              {phase === "resting" && (
                <div>
                  <p className="text-[13px] font-extrabold" style={{ color: CLAIR.feuEncre }}>Repos</p>
                  <div className="flex items-end gap-2.5 mt-1">
                    <span className="vy-nombre leading-none" style={{ fontSize: 80, fontWeight: 800, color: CLAIR.t0 }}>{fmt(Math.max(0, restCountdown))}</span>
                    <span className="text-[13px] font-semibold mb-2" style={{ color: CLAIR.t3 }}>
                      {restCountdown <= 0 ? "terminé" : (cur?.emom ?? 0) > 0 ? "avant la minute suivante" : `sur ${fmt(restTotal)}`}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: CLAIR.piste }}>
                    <div className="h-full w-full rounded-full"
                      style={{
                        transformOrigin: "left center",
                        transform: `scaleX(${restTotal > 0 ? Math.max(0, restCountdown) / restTotal : 0})`,
                        transition: "transform 1s linear",
                        background: "linear-gradient(90deg,#FF7A1A,#F5B120)",
                        boxShadow: "0 0 10px rgba(255,122,26,0.4)",
                      }} />
                  </div>

                  {/* R3 · ce qui vient d'être enregistré, et « Corriger ».
                      Rien à remplir : sans y toucher, la série reste telle que
                      le bouton l'a dite. */}
                  {(() => {
                    const m = doneMap[exerciseIdx]?.[setIdx];
                    if (!declare || !m || m.statut !== "terminee" || typeof m.reps !== "number") return null;
                    const t = m.exercice?.chargeType ?? null;
                    if (correction) {
                      return (
                        <div className="mt-4 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.72)", border: `1px solid ${CLAIR.ligne}` }}>
                          <p className="text-[13px] font-bold mb-3" style={{ color: CLAIR.t0 }}>Série {correction.serie + 1} · {m.exercice?.nom ?? cur?.name}</p>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[13px]" style={{ color: CLAIR.t2 }}>Répétitions</span>
                            <Compteur
                              clair
                              valeur={String(correction.reps)}
                              onMoins={() => setCorrection(c => c && { ...c, reps: crancherReps(c.reps, -1) })}
                              onPlus={() => setCorrection(c => c && { ...c, reps: crancherReps(c.reps, 1) })}
                            />
                          </div>
                          {chargeReglable(t) && (
                            <div className="flex items-center justify-between">
                              <span className="text-[13px]" style={{ color: CLAIR.t2 }}>Charge</span>
                              <ReglageCharge clair valeur={correction.charge} type={t} onChange={(v) => setCorrection(c => c && { ...c, charge: v })} />
                            </div>
                          )}
                          <div className="flex gap-2.5 mt-4">
                            <button onClick={() => setCorrection(null)} className="flex-1 py-3 rounded-xl text-[13px] font-semibold cursor-pointer"
                              style={{ color: CLAIR.t2, background: "rgba(26,32,44,0.05)" }}>Annuler</button>
                            <button onClick={enregistrerCorrection} className="flex-[2] py-3 rounded-xl text-[13px] font-bold cursor-pointer text-white"
                              style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)" }}>
                              {restCountdown <= 0 ? "Enregistrer et reprendre" : "Enregistrer"}
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-[13px] font-semibold min-w-0" style={{ color: CLAIR.t1 }}>
                          <Check size={14} strokeWidth={2.6} style={{ color: CLAIR.tealEncre, flexShrink: 0 }} />
                          <span className="truncate">{libelleEnregistre(setIdx + 1, m.reps, m.charge ?? null, t)}</span>
                        </span>
                        <button onClick={ouvrirCorrection} className="text-[13px] font-semibold cursor-pointer flex-shrink-0" style={{ color: CLAIR.exp }}>
                          Corriger
                        </button>
                      </div>
                    );
                  })()}

                  {/* Le mot du repos, choisi par le COMPTEUR (cf. `cleRepos`) :
                      sur le dernier exercice il encourage, partout ailleurs il
                      explique. R4 · après la dernière série d'un repère, la
                      question prend la place de la phrase, sans toucher au chrono. */}
                  {aQuestion.includes(exerciseIdx) && setIdx === (cur?.sets ?? 1) - 1 ? (
                    <div className="mt-4">
                      <QuestionMarge clair question={voix(guide, "seance.marge.question")} reponse={margeNav(exerciseIdx)} onRepondre={repondreAuRepos}
                        visage={guide ? <VisageGuide guide={guide} etat="listen" size={30} /> : <AssistantSpark px={16} />} />
                    </div>
                  ) : (() => {
                    const cle = enTours ? cleReposTours(exercises, exerciseIdx, setIdx, prochainPas)
                      : cleRepos(exerciseIdx, setIdx, cur?.sets ?? 1, exercises.length);
                    const etat = cle === "seance.repos.fin" ? "encourage" : "explain";
                    return (
                      <div className="flex gap-3 items-center mt-4">
                        <span className="flex-shrink-0">
                          {guide ? <VisageGuide guide={guide} etat={etat} size={30} /> : <AssistantSpark px={16} />}
                        </span>
                        <p className="text-[13px] leading-relaxed" style={{ color: CLAIR.t2 }}>{voix(guide, cle)}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* ══ LE PIED : le bouton d'action, toujours violet, toujours au
                même endroit. Au repos, les deux gestes du repos prennent sa
                place ; en pause, « Reprendre ». ══ */}
            <div className="flex-shrink-0 px-5 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              {paused ? (
                <motion.button whileTap={{ scale: 0.97 }} onClick={togglePause}
                  className="w-full h-[58px] rounded-[22px] flex items-center justify-center gap-2 font-extrabold text-[16px] cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}>
                  <Play size={16} fill="#fff" aria-hidden="true" /> Reprendre
                </motion.button>
              ) : phase === "resting" ? (
                <div className="flex gap-2.5 h-[58px]">
                  <button onClick={add15} className="flex-1 rounded-[22px] text-[16px] font-bold cursor-pointer"
                    style={{ color: CLAIR.t1, background: CLAIR.rond, border: `1px solid ${CLAIR.ligne}` }}>
                    + 15&nbsp;s
                  </button>
                  <button onClick={() => setRestCountdown(0)} className="flex-[2] rounded-[22px] text-[16px] font-bold cursor-pointer"
                    style={{ color: CLAIR.t1, background: CLAIR.rond, border: `1px solid ${CLAIR.ligne}` }}>
                    Passer le repos
                  </button>
                </div>
              ) : phase === "exercising" && !isTimered ? (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => completeSet("bouton")}
                  className="w-full h-[58px] rounded-[22px] flex items-center justify-center gap-2 font-extrabold text-[16px] cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
                >
                  {/* R3 · le bouton dit ce qui sera enregistré. */}
                  {declare && repsCur !== null ? libelleFait(repsCur, chargeCur, typeCharge) : "Série terminée ✓"}
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                    /* Abréger n'est pas finir : on note la durée réellement tenue.
                       En HIIT, la marque posée sur l'effort survit au repos qui suit. */
                    const effort = isHiit ? (hiitSub === "work" ? HIIT_WORK - autoCountdown : null) : (cur?.auto ?? 0) - autoCountdown;
                    if (!isHiit || hiitSub === "work") validationRef.current = { validation: "minuteur_abrege", dureeS: effort };
                    setAutoCountdown(0);
                  }}
                  className="w-full h-[58px] rounded-[22px] flex items-center justify-center gap-2 font-extrabold text-[16px] cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
                >
                  {isHiit && hiitSub === "work" ? "Passer l’effort" : "Valider ✓"}
                </motion.button>
              )}
              {/* Les deux gestes de navigation, sous le bouton ; leur ligne garde
                  sa place au repos, pour que rien ne saute d'un état à l'autre. */}
              <div className="min-h-[40px] mt-1">
                {phase === "exercising" && !paused && (
                  <NavExercice
                    precedent={pasPrecedent(exercises, doneMap as MarquesTours, exerciseIdx, setIdx) ? revenirExercice : null}
                    suivant={resteApres(exercises, exerciseIdx, setIdx) ? passerExercice : null}
                  />
                )}
              </div>
            </div>

                {/* R3 · « Changer » (écran 06). Dans un portail : la carte du
                    tunnel est animée, donc un enfant `fixed` s'y caserait. */}
                {changer && choixOuvert && curPrescrit?.prescription && typeof document !== "undefined" && createPortal(
                  (() => {
                    const ouvert = changer;
                    const pr = curPrescrit.prescription!;
                    const actuel = effectif ?? { cle: pr.cle, nom: curPrescrit.name, chargeType: pr.charge_type };
                    const liste = equivalents({
                      fonction: pr.fonction,
                      mesure: curPrescrit.auto || curPrescrit.hiit ? "duree" : "reps",
                      lieu: lieuPourEquivalents(cible?.genre === "etape" ? cible.location : null, curPrescrit.name),
                      cleActuelle: actuel.cle,
                    });
                    /* L'exercice prévu redevient proposable quand on l'a quitté. */
                    const prevu = { cle: pr.cle, nom: curPrescrit.name, chargeType: pr.charge_type, muscles: curPrescrit.muscles, tip: curPrescrit.tip };
                    const choix = actuel.cle !== pr.cle && !liste.some((e) => e.cle === pr.cle) ? [prevu, ...liste] : liste;
                    const restantes = curPrescrit.sets - setIdx;
                    return (
                      <div className="fixed inset-0 z-[106] flex items-end justify-center" style={{ background: "rgba(8,6,16,0.45)" }}
                        onClick={() => setChanger(null)}>
                        <div className="w-full max-w-md rounded-t-[var(--r-feuille)] p-5 pb-7" onClick={(e) => e.stopPropagation()}
                          style={{ background: "#FFFFFF", borderTop: `1px solid ${CLAIR.ligne}` }}>
                          <p className="text-[16px] font-extrabold mb-1" style={{ color: CLAIR.t0 }}>Remplacer {actuel.nom.toLowerCase()}</p>
                          {setIdx > 0 && (
                            <p className="flex items-center gap-2 text-[13px] mb-3" style={{ color: CLAIR.t2 }}>
                              <Check size={13} strokeWidth={2.6} style={{ color: CLAIR.tealEncre }} />
                              {setIdx === 1 ? "Ta série faite reste enregistrée." : `Tes ${setIdx} séries faites restent enregistrées.`}
                            </p>
                          )}
                          {choix.length === 0 ? (
                            <p className="text-[13px] py-4" style={{ color: CLAIR.t2 }}>Aucun mouvement équivalent ici pour celui-ci.</p>
                          ) : (
                            <div className="flex flex-col gap-2 mt-2 max-h-[50dvh] overflow-y-auto">
                              {choix.map((e) => {
                                const sel = changer.choisi?.cle === e.cle;
                                return (
                                  <button key={e.cle} onClick={() => setChanger({ ...ouvert, choisi: e })}
                                    className="flex items-center gap-3 rounded-2xl p-3 text-left cursor-pointer"
                                    style={{ background: sel ? "rgba(139,92,246,0.10)" : "rgba(26,32,44,0.03)", border: `1px solid ${sel ? "rgba(109,75,214,0.5)" : CLAIR.ligne}` }}>
                                    <ExerciseThumb name={e.nom} size={44} />
                                    <span className="min-w-0">
                                      <b className="block text-[16px] font-bold truncate" style={{ color: CLAIR.t0 }}>{e.nom}</b>
                                      <span className="block text-[13px]" style={{ color: CLAIR.t2 }}>
                                        {restantes} série{restantes > 1 ? "s" : ""} restante{restantes > 1 ? "s" : ""}
                                        {chargeReglable(e.chargeType) ? " · charge à choisir" : ""}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <button disabled={!changer.choisi} onClick={() => changer.choisi && appliquerRemplacement(ouvert, changer.choisi)}
                            className="w-full mt-4 py-4 rounded-2xl font-bold text-[16px] text-white cursor-pointer disabled:opacity-40"
                            style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)" }}>
                            Remplacer
                          </button>
                        </div>
                      </div>
                    );
                  })(),
                  document.body,
                )}
          </>
        ) : (
          <>
        {/* ══ Contenu ══ */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence mode="wait">

            {/* ─────────── 01 · LA FICHE — l'affiche (thème clair/sombre) ─────────── */}
            {phase === "intro" && (
              <motion.div key="intro"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }}
                className="flex flex-col"
              >
                {/* Héros — la photo de la séance en plein cadre */}
                <div className="relative flex-shrink-0" style={{ height: 232 }}>
                  {heroImage ? (
                    <img src={cheminDuGuide(heroImage, guide)} alt="" className="w-full h-full object-cover" style={{ objectPosition: "50% 28%" }} />
                  ) : (
                    <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }} />
                  )}
                  <div className="absolute inset-0"
                    style={{ background: "var(--voile-affiche)" }} />
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-full"
                      style={{ background: "var(--verre-photo)", backdropFilter: "blur(16px) saturate(170%)", WebkitBackdropFilter: "blur(16px) saturate(170%)", border: "1px solid var(--verre-photo-bord)" }}>
                      ≈ {duration} min
                    </span>
                    <button onClick={quitter}
                      className="ml-auto w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-white"
                      style={{ background: "var(--verre-photo)", backdropFilter: "blur(16px) saturate(170%)", WebkitBackdropFilter: "blur(16px) saturate(170%)", border: "1px solid var(--verre-photo-bord)" }}
                      aria-label="Fermer">
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                  <div className="absolute left-[18px] right-[18px] bottom-4">
                    <h2 className="font-black uppercase leading-[0.98] tracking-tight text-white"
                      style={{ fontSize: 26, textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}>{title}</h2>
                    {muscleSummary && (
                      <p className="text-[11px] font-extrabold tracking-[0.14em] mt-1.5" style={{ color: "#C9B8FF" }}>{muscleSummary}</p>
                    )}
                    <div className="flex gap-1.5 mt-3">
                      <span className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.16)" }}>{exercises.length} exercice{exercises.length > 1 ? "s" : ""}</span>
                      <span className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.16)" }}>{totalSets} série{totalSets > 1 ? "s" : ""}</span>
                      <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-full"
                        style={{ color: "#FFC96B", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(245,177,32,0.35)" }}>~{kcalEst} kcal</span>
                    </div>
                  </div>
                </div>

                {/* Au programme : les mouvements bougent déjà, et toucher l'un d'eux
                    ouvre sa fiche (la démo YouTube n'existe plus). Un exercice
                    écrit à la main, sans fiche, garde un lien vers YouTube. */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-baseline justify-between mb-1.5 px-1">
                    <p className="text-[13px] font-bold" style={{ color: "var(--text-2)" }}>Au programme</p>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--exp-encre)" }}>Touche un mouvement pour le voir</p>
                  </div>
                  <div className="flex flex-col">
                    {exercises.map((ex, i) => {
                      const exo = trouverExercice(ex.name);
                      /* Lot 2 · un bloc (circuit, superset, EMOM) a son en-tête,
                         qui dit les tours ; ses lignes ne disent que la dose
                         d'un tour. Un EMOM seul se présente pareil. */
                      const bloc = blocsDuProgramme.find((b) => i >= b.debut && i < b.fin) ?? null;
                      const emomSeul = !bloc && (ex.emom ?? 0) > 0;
                      const enTete = bloc && bloc.debut === i ? enTeteDuBloc(exercises, bloc)
                        : emomSeul ? `EMOM · ${ex.sets} minute${ex.sets > 1 ? "s" : ""}` : null;
                      const dose = doseDe(ex, !!bloc || emomSeul);
                      const contenu = (
                        <>
                          <span className="flex-shrink-0 rounded-2xl overflow-hidden flex items-center justify-center"
                            style={{ width: 54, height: 54, background: "rgba(139,92,246,0.08)" }}>
                            <ExerciseThumb name={ex.name} size={52} delay={i * 150} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <b className="block text-[16px] font-bold tracking-tight truncate" style={{ color: "var(--text-1)" }}>{ex.name}</b>
                            <span className="block text-[13px] truncate" style={{ color: "var(--text-2)" }}>{ex.muscles.join(" · ")}</span>
                          </span>
                          <span className="text-[13px] font-extrabold flex-shrink-0" style={{ color: "var(--text-1)" }}>{dose}</span>
                          {exo
                            ? <ChevronRight size={16} strokeWidth={2.2} className="flex-shrink-0" style={{ color: "var(--text-3)" }} />
                            : <ArrowUpRight size={15} strokeWidth={2.2} className="flex-shrink-0" style={{ color: "var(--text-3)" }} />}
                        </>
                      );
                      const filet = "1px solid rgba(var(--accent-rgb),0.1)";
                      /* Les lignes d'un bloc se tiennent derrière un trait, sous leur en-tête. */
                      const style = {
                        borderTop: i > 0 && !enTete ? filet : "none",
                        ...(bloc || emomSeul ? { paddingLeft: 10, boxShadow: "inset 2px 0 0 rgba(var(--accent-rgb),0.22)" } : {}),
                      };
                      return (
                        <Fragment key={i}>
                          {enTete && (
                            <p className="text-[13px] font-bold pt-3 pb-1 px-1" style={{ color: "var(--exp-encre)", borderTop: i > 0 ? filet : "none" }}>
                              {enTete}
                            </p>
                          )}
                          {exo ? (
                            <button type="button" onClick={() => setFiche(exo)}
                              className="w-full flex items-center gap-3 py-2 cursor-pointer text-left" style={style}>
                              {contenu}
                            </button>
                          ) : (
                            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} technique`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="w-full flex items-center gap-3 py-2 text-left" style={style}>
                              {contenu}
                            </a>
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────── 04 · L'APRÈS · LA RÉCOMPENSE (teal) ─────────── */}
            {phase === "done" && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className={`relative flex flex-col items-center px-5 pb-4 text-center ${guide ? "pt-3" : "pt-10"}`}
              >
                {/* ── LE MOMENT FORT ──
                    C'est le seul endroit de la séance où le Guide est
                    franchement grand : ailleurs il tient dans une pastille.
                    Il ACCOMPAGNE la réussite, il ne la résume pas : la coche
                    teal reste le signe que la séance est validée (teal =
                    réussite, système D), les chiffres restent intacts juste
                    en dessous, et lui n'ajoute qu'une phrase.
                    Sans Guide résolu, l'écran d'avant revient à l'identique. */}
                {/* ── LA FIN DONT ON EST FIER (maquette du 2026-10-17) ──
                    Le mot de la séance en géant, le Guide devant, puis les
                    chiffres, le progrès et la série. Les morceaux vivent
                    dans `seance/FinDeSeance.tsx` ; le tunnel ne leur donne
                    que ce que le journal a enregistré. */}
                <CouvertureFin titre={title} fete={!!gainFin || !!recordFin}
                  guide={guide ? <CelebrationGuide guide={guide} hauteur="clamp(210px, 32vh, 260px)" /> : null} />
                <TitreFin
                  titre={voix(guide, gainFin || recordFin ? "seance.fin.titre.fait" : "seance.fin.titre.calme")}
                  phrase={voix(guide, gainFin || recordFin ? "seance.fin.fait" : "seance.fin.calme")}
                  nom={guide ? nomGuide(guide) : null} />
                <ChiffresFin items={[
                  { v: Math.max(1, Math.round(elapsed / 60)), l: "minutes" },
                  { v: seriesConfirmees(doneMap), l: seriesConfirmees(doneMap) > 1 ? "séries" : "série" },
                  { v: exercicesFaits(doneMap), l: exercicesFaits(doneMap) > 1 ? "mouvements" : "mouvement" },
                ]} />

                {/* 2 · Le progrès : vérifiable, et jamais un chiffre négatif. */}
                {/* Un nouveau record passe devant : un seul fait marquant à la fois. */}
                {recordFin
                  ? <CarteRecord record={recordFin.record} avant={recordFin.avant} apres={recordFin.apres} />
                  : fait && gainFin && <CarteProgres fait={fait} gain={gainFin} />}

                {/* 4 · La série et le rang, un seul groupe à filet. */}
                <SerieEtRang serie={serieDuJour} exp={expFin} />

                {/* 3 · La question facultative d'un repère qui terminait la
                    séance (écran 10), puis « La prochaine fois ». */}
                {aQuestion.filter((e) => sansRepos(e) && !(doneMap[e]?.[(exercises[e]?.sets ?? 1) - 1] as { marge?: Marge | null } | undefined)?.marge).map((e) => (
                  <div key={`q-${e}`} className="w-full mt-3 rounded-2xl p-3.5" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.20)" }}>
                    <QuestionMarge clair titre={exercisesAff[e]?.name} question={voix(guide, "seance.marge.question")} reponse={margesFin[e] ?? null}
                      visage={guide ? <VisageGuide guide={guide} etat="listen" size={26} /> : <AssistantSpark px={16} />}
                      onRepondre={(m) => setMargesFin((prev) => ({ ...prev, [e]: m }))} />
                  </div>
                ))}
                <LaProchaineFois
                  lancementId={lancementId}
                  enregistree={sessionSaved}
                  margeDe={margeDe}
                  propositions={propositionsFin}
                />

                {/* Le reste est un geste plus loin. */}
                {exercicesFaits(doneMap) > 0 && (
                  <button type="button" onClick={() => setDetailOuvert(true)}
                    className="flex items-center justify-between w-full py-2.5 text-[13px] cursor-pointer"
                    style={{ borderTop: `1px solid ${TUN.line}`, color: TUN.t2 }}>
                    <b style={{ color: TUN.t1, fontWeight: 650 }}>{exercicesFaits(doneMap) > 1 ? `Voir mes ${exercicesFaits(doneMap)} exercices` : "Voir mon exercice"}</b>
                    <ChevronRight size={16} strokeWidth={2.2} />
                  </button>
                )}

                {/* En secondaire : le relais et les badges, à leur place. */}
                <AnimatePresence>
                  {maillon && (
                    <BandeMaillon
                      maillon={maillon}
                      onAller={() => {
                        onClose();
                        router.push(
                          maillon.conversationId
                            ? `/communaute/${maillon.conversationId}`
                            : "/defi",
                        );
                      }}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {badgesGagnes.length > 0 && (
                    <BandeBadge
                      badges={badgesGagnes}
                      onAller={() => { quitter(); router.push("/profil"); }}
                    />
                  )}
                </AnimatePresence>

                {/* R1 · un enregistrement raté se DIT, et une suite restée en
                    route aussi (R1 bis) : la séance reste une réussite, une
                    ligne secondaire dit ce qui reste. « Réessayer » réutilise
                    le même journal et reprend où le travail s'est arrêté.
                    R5 : la réussite, elle, ne s'annonce plus (c'est l'état
                    normal) ; seul l'échec se dit. */}
                {finIncomplete && (
                  <div className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl mt-3 text-left"
                    style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${TUN.line}` }}>
                    <span className="flex-1 text-[13px]" style={{ color: TUN.t2 }}>{finIncomplete.texte}</span>
                    <button onClick={() => { setFinIncomplete(null); enregistrer(); }} className="text-[13px] font-bold cursor-pointer flex-shrink-0" style={{ color: TUN.lav }}>
                      Réessayer
                    </button>
                  </div>
                )}

                {/* L'invite à laisser un avis, à chaque fin de séance (choix
                    de Louis), mais en ligne discrète : plus une carte qui
                    passerait avant le reste. */}
                {user && !avisMasque && (
                  <CoinAvis onAvis={() => { quitter(); router.push("/avis"); }} onPlusTard={() => setAvisMasque(true)} />
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ══ CTA bas : la fiche et la fin (l'effort et le repos ont le leur) ══ */}
        {(phase === "intro" || phase === "done") && (
        <div className="px-5 pb-6 pt-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${isTunnel ? TUN.line : "rgba(var(--accent-rgb),0.08)"}` }}>
          <AnimatePresence mode="wait">

            {phase === "intro" && (
              <motion.button key="start"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={lancerSeance}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-[16px] cursor-pointer text-white"
                style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L4.09 12.11a.6.6 0 0 0 .45 1h5.56l-1.1 8.89L17.91 11.9a.6.6 0 0 0-.45-1h-5.56z" /></svg>
                C&apos;est parti
              </motion.button>
            )}

            {phase === "done" && (
              <motion.div key="done-actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2.5">

                {/* ── Garder la séance ──
                   Une impro disparaissait une fois terminée : du travail
                   jeté, à l'instant précis où l'on vient de prouver que la
                   séance marchait. La carte passe AVANT le partage, et
                   « Non » ne fait aucun commentaire. */}
                {onGarder && garde !== "refusee" && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-3.5"
                    style={{
                      background: "linear-gradient(150deg, rgba(139,92,246,0.19), rgba(193,59,193,0.11))",
                      border: "1px solid rgba(139,92,246,0.42)",
                    }}>
                    {garde === "gardee" ? (
                      <div className="flex items-center justify-center gap-2 py-1">
                        <Check size={14} strokeWidth={2.6} style={{ color: TUN.teal }} />
                        <span className="text-[13px] font-semibold" style={{ color: TUN.teal }}>
                          Ajoutée à tes séances
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-shrink-0">
                            {exercises.slice(0, 3).map((e, i) => (
                              <span key={`${e.name}-${i}`}
                                className="rounded-xl flex items-center justify-center overflow-hidden"
                                style={{
                                  width: 36, height: 40, marginLeft: i === 0 ? 0 : -10,
                                  background: "rgba(255,255,255,0.85)",
                                  border: "1px solid rgba(139,92,246,0.18)",
                                }}>
                                <ExerciseThumb name={e.name} size={34} delay={i * 200} />
                              </span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold leading-tight" style={{ color: TUN.t1 }}>Tu la gardes ?</p>
                            <p className="text-[11px] leading-snug mt-1" style={{ color: TUN.t2 }}>
                              Elle rejoint tes séances, tu pourras la relancer ou la modifier.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <motion.button whileTap={{ scale: 0.97 }}
                            disabled={garde === "en_cours"}
                            onClick={async () => {
                              if (gardeEnCours.current) return;
                              gardeEnCours.current = true; setGarde("en_cours");
                              try { setGarde(await onGarder() === false ? "echec" : "gardee"); }
                              catch { setGarde("echec"); }
                              finally { gardeEnCours.current = false; }
                            }}
                            className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[13px] cursor-pointer text-white"
                            style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 22px -6px rgba(193,59,193,0.5)" }}>
                            <Plus size={14} strokeWidth={2.6} /> {garde === "en_cours" ? "Un instant…" : "Garder la séance"}
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.97 }}
                            disabled={garde === "en_cours"} onClick={() => setGarde("refusee")}
                            className="px-4 py-2.5 rounded-xl font-semibold text-[13px] cursor-pointer"
                            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(31,27,46,0.10)", color: TUN.t2 }}>
                            Non
                          </motion.button>
                        </div>
                        {garde === "echec" && <p role="status" className="text-[13px] mt-2" style={{ color: TUN.t2 }}>La séance n’a pas pu être ajoutée. Tu peux réessayer.</p>}
                      </>
                    )}
                  </motion.div>
                )}

                {/* R5 · le pied de la maquette : « Continuer » est L'ACTION
                    (violet plein), le partage de l'affiche un lien discret.
                    L'affiche s'est gardée toute seule dans le profil ; elle
                    ne se propose qu'une fois gardée. */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={quitter}
                  className="w-full py-4 rounded-2xl flex items-center justify-center font-extrabold text-[16px] cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
                >
                  Continuer
                </motion.button>
                {/* Un record battu a son affiche à lui, au propriétaire du journal seulement. */}
                {partageOuvert && recordFin && (
                  <button type="button"
                    onClick={() => { void partagerAfficheRecord(afficheDuRecordBattu(recordFin.record, recordFin.avant, recordFin.apres, user?.pseudo)); }}
                    className="text-[13px] font-bold min-h-[44px] cursor-pointer" style={{ color: TUN.lav }}>
                    Partager l&apos;affiche du record ›
                  </button>
                )}
                {partageOuvert && afficheSaved && (
                  <button type="button" onClick={() => setEnvoyerOuvert(true)}
                    className="text-[13px] font-bold min-h-[44px] cursor-pointer" style={{ color: TUN.lav }}>
                    {recordFin ? "Partager l’affiche de la séance ›" : "Partager l’affiche ›"}
                  </button>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        )}
          </>
        )}
      </motion.div>

      {/* La fiche d'un mouvement, ouverte depuis la scène ou « Au programme ».
          Dans un portail, à l'étage 106 : le tunnel vit à 100. */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {fiche && (
            <ExerciseDetailSheet exo={fiche} onClose={fermerFiche} action={
              <motion.button whileTap={{ scale: 0.97 }} onClick={fermerFiche}
                className="w-full py-3.5 rounded-2xl text-[16px] font-bold cursor-pointer text-white"
                style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
                {phase === "intro" ? "Fermer" : "Revenir à la séance"}
              </motion.button>
            } />
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* R5 · le détail et l'envoi de l'affiche, au-dessus du tunnel. */}
      <AnimatePresence>
        {detailOuvert && (
          <DetailExercices
            lignes={lignesCourantes}
            margeDe={margeDe}
            estRepere={(id) => prescriptionsR4[navDe(id)]?.statut === "repere"}
            onMarge={(id, m) => { const e = navDe(id); if (e >= 0) setMargesFin((prev) => ({ ...prev, [e]: m })); }}
            onFermer={() => setDetailOuvert(false)}
            question={voix(guide, "seance.marge.question")}
            visage={guide ? <VisageGuide guide={guide} etat="listen" size={26} /> : <AssistantSpark px={16} />}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {envoyerOuvert && partageOuvert && afficheData && user && (
          <EnvoyerAffiche data={{
            ...afficheData,
            bg: heroImage ? cheminDuGuide(heroImage, guide) : afficheData.bg,
            /* Le progrès du jour sur l'affiche, en rose : jamais négatif. */
            gain: fait && gainFin ? {
              v: gainFin.valeur,
              l: gainFin.libelle.includes("assistance") ? `${gainFin.unite} ${gainFin.libelle}` : `${gainFin.unite} · ${fait.nom}`,
            } : null,
          }} moi={user.id} accessToken={session?.access_token} seanceId={seanceIdFin} onFermer={() => setEnvoyerOuvert(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
