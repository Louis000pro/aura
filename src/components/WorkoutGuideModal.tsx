"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { aiFetch } from "@/lib/aiFetch";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, ChevronDown, ChevronRight, Check, Plus, Pencil, ArrowLeftRight } from "lucide-react";
import { createPortal } from "react-dom";
import { Compteur, ReglageCharge } from "@/components/seance/ReglageCharge";
import { AssistantSpark, VisageGuide, CelebrationGuide } from "@/components/AssistantMark";
import { voix, type CleVoix } from "@/lib/guides";
import { useGuideActif } from "@/context/GuideContext";
import ExerciseGuide from "@/components/ExerciseGuide";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { createClient } from "@/lib/supabase";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  CLE_DEVOILE, EVT_RELAIS, etatPoster, imageEtat,
  type MaillonFranchi,
} from "@/lib/defi";
import { calculerAura, type Rang } from "@/lib/aura";
import { noterRang } from "@/lib/celebrationRang";
import { noterBadges } from "@/lib/celebrationBadge";
import { chargerBadgesAura } from "@/lib/badgesAura";
import type { Badge } from "@/lib/badges";
import { useAuth } from "@/context/AuthContext";
import type { CibleSeance } from "@/lib/finSeance";
import {
  DUREE_EFFORT_HIIT, afficheDe, dependancesReelles, etatFinDeSeance, exercicesFaits, finaliserSeance, lignesDuJournal,
  journalDe, nouveauLancement, nouvelleAttente, proprietaireDeLaSeance, seriesConfirmees,
  type EtatFin, type JournalSeance, type MarquesSeance, type Validation,
} from "@/lib/journalSeance";
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
import { faitMarquant, quandRelatif, serieNommee, texteSerie, type FaitMarquant } from "@/lib/recapSeance";
import { perfDataToShare, type PerfShareData } from "@/lib/perfShareExport";
import EnvoyerAffiche from "@/components/communaute/EnvoyerAffiche";
import QuestionMarge from "@/components/seance/QuestionMarge";
import LaProchaineFois from "@/components/seance/LaProchaineFois";
import { choixApplicable, pasDeLEffort, pasDuRepos, repsADeclarer, type PositionTunnel, type SaisieReps } from "@/lib/transitionsTunnel";
import { useAssistant } from "@/context/AssistantContext";
import { GUIDE_SECTIONS, sectionSessionId } from "@/lib/guideSections";
import { WAVE_1_EXERCISES } from "@/lib/workoutWave1";
import { WAVE_2_EXERCISES } from "@/lib/workoutWave2";
import { WAVE_3_EXERCISES } from "@/lib/workoutWave3";
import { WAVE_4_EXERCISES } from "@/lib/workoutWave4";
import { WAVE_5_EXERCISES } from "@/lib/workoutWave5";
import { WAVE_6_EXERCISES } from "@/lib/workoutWave6";

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

/* ─── Référence humaine : vidéo YouTube de démo par exercice ── */
function ExerciseVideo({ exerciseName }: { exerciseName: string }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading"); setVideoId(null);
    aiFetch(`/api/exercise-video?q=${encodeURIComponent(exerciseName)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.videoId) { setVideoId(d.videoId); setState("ready"); }
        else setState("none");
      })
      .catch(() => { if (!cancelled) setState("none"); });
    return () => { cancelled = true; };
  }, [exerciseName]);

  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " technique")}`;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md" style={{ background: "#FF0000" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
        </span>
        <p className="text-[11px] font-boldst" style={{ color: "var(--accent)" }}>Référence humaine</p>
      </div>
      {state === "loading" && (
        <div className="aspect-video w-full flex items-center justify-center" style={{ background: "rgba(var(--accent-rgb),0.06)" }}>
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(var(--accent-rgb),0.25)", borderTopColor: "var(--accent)" }} />
        </div>
      )}
      {state === "ready" && videoId && (
        <div className="aspect-video w-full">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={`Démo ${exerciseName}`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {state === "none" && (
        <a href={ytSearch} target="_blank" rel="noopener noreferrer"
          className="aspect-video w-full flex flex-col items-center justify-center gap-2 text-center px-4"
          style={{ background: "rgba(var(--accent-rgb),0.06)", color: "var(--accent)" }}>
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full" style={{ background: "#FF0000" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="text-[13px] font-semibold">Voir la démo sur YouTube</span>
        </a>
      )}
    </div>
  );
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
  onGarder?: () => void;
  /** Présent quand cette séance EST le maillon d'un relais (lancée par
   *  « Lancer mon maillon »). C'est la SEULE façon de franchir un maillon :
   *  une séance ordinaire ne valide plus rien côté relais. */
  relaisRunId?: string;
}

type GuidePhase = "intro" | "exercising" | "resting" | "done";
type HiitSub    = "work" | "rest";

/* Déduit une durée en secondes d'un libellé de reps (« 45s », « 30 sec »,
   « 2 min », « 3x45s » → 45). null si ce n'est PAS un exercice chronométré
   (« 12 reps », « Max reps », « 12 par jambe »…). Sert à lancer un vrai chrono
   pour les gainages/tenues venus d'une séance custom (qui n'ont pas de champ auto). */
function secondesDeReps(reps: string): number | null {
  const r = (reps || "").toLowerCase();
  const min = r.match(/(\d+)\s*min/);
  if (min) return (parseInt(min[1], 10) || 0) * 60 || null;
  const sec = r.match(/(\d+)\s*(?:secondes?|sec|s)\b/);
  if (sec) return parseInt(sec[1], 10) || null;
  return null;
}

/* Vibration (best-effort) : ignorée si le navigateur/appareil ne la supporte pas. */
function vibrer(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

/* ─── Constants ──────────────────────────────────────────── */
const HIIT_WORK = DUREE_EFFORT_HIIT;
const HIIT_REST = 10;
const CR        = 46;
const CC        = 2 * Math.PI * CR;

/* ─── Exercise data ──────────────────────────────────────── */

/* « Défi Animations » — les ateliers qui enchaînent les gestes animés,
   un thème par séance (la liste unique vit dans src/lib/guideSections.ts).
   sets:1 + repos court = on défile vite et on voit les animations d'une
   traite. TEMPORAIRE : ces séances servent à valider chaque vague de
   sprites dans le vrai tunnel ; on les retire à la mise à jour. */

/* Exporté depuis le 2026-07-29 : « M'en inspirer » a besoin des mêmes
   exercices que le tunnel. Une carte du catalogue ne porte pas toujours
   son `exerciseList` (le tunnel les retrouve ici par id), donc dupliquer
   cette table côté page rejouerait la divergence déjà vécue ailleurs. */
export const exerciseData: Record<string, Exercise[]> = {
  ...WAVE_1_EXERCISES,
  ...WAVE_2_EXERCISES,
  ...WAVE_3_EXERCISES,
  ...WAVE_5_EXERCISES,
  ...WAVE_6_EXERCISES,

  ...Object.fromEntries(GUIDE_SECTIONS.map((sec) => [
    sectionSessionId(sec),
    sec.items.map((name) => ({
      name, sets: 1, reps: "Observe le geste", rest: 8,
      tip: "Reproduis le mouvement du personnage-guide.",
      benefit: "", muscles: [],
    })),
  ])),

  "demo-avatars": [
    // ─── Bas du corps ────────────────────────────────────────
    { name: "Air Squat",         sets: 2, reps: "12 reps", rest: 30,
      tip: "Pieds largeur d’épaules, descends comme pour t’asseoir. Talons au sol.",
      benefit: "Squat sans matériel, base du bas du corps.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Back Squat",        sets: 2, reps: "10 reps", rest: 30,
      tip: "Barre sur les trapèzes, gainé. Descends sous parallèle.",
      benefit: "Le roi des exercices, force du bas du corps.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Overhead Squat",    sets: 2, reps: "8 reps",  rest: 30,
      tip: "Barre tendue au-dessus de la tête, gainage maximal. Descends sous parallèle.",
      benefit: "Mobilité totale + force, exo très technique.",
      muscles: ["Quadriceps", "Épaules", "Core"] },

    // ─── Haut du corps ───────────────────────────────────────
    { name: "Pompes",            sets: 2, reps: "12 reps", rest: 30,
      tip: "Corps droit, coudes à 45°. Descends la poitrine près du sol.",
      benefit: "Polyarticulaire du haut du corps.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Pompes explosives", sets: 2, reps: "8 reps",  rest: 30,
      tip: "Pompe normale mais pousse explosif, mains qui décollent du sol.",
      benefit: "Développe la puissance des pectoraux.",
      muscles: ["Pectoraux", "Triceps"] },

    // ─── Core / Abdos ────────────────────────────────────────
    { name: "Plank",             sets: 1, reps: "30 sec",  rest: 30, auto: 30,
      tip: "Avant-bras au sol, corps en ligne parfaite.",
      benefit: "Renforce le core profond.",
      muscles: ["Core"] },
    { name: "Sit-ups",           sets: 2, reps: "15 reps", rest: 30,
      tip: "Allongé, genoux fléchis. Monte le buste, expire en montant.",
      benefit: "Cible les grands droits.",
      muscles: ["Abdominaux"] },
    { name: "Bicycle Crunch",    sets: 2, reps: "20 reps", rest: 30,
      tip: "Allongé, coude vers genou opposé en alternance.",
      benefit: "Abdos + obliques en rotation.",
      muscles: ["Abdominaux", "Obliques"] },
    { name: "Circle Crunch",     sets: 2, reps: "10 reps", rest: 30,
      tip: "Dessine un cercle avec le buste en flexion abdominale.",
      benefit: "Sollicite les abdos sur 360°.",
      muscles: ["Abdominaux"] },

    // ─── Cardio / HIIT ───────────────────────────────────────
    { name: "Burpees",           sets: 2, reps: "10 reps", rest: 30,
      tip: "Plonge au sol, pompe, saute. Qualité > vitesse.",
      benefit: "Brûleur cardio corps entier.",
      muscles: ["Corps entier"] },
    { name: "Jumping Jacks",     sets: 1, reps: "30 sec",  rest: 30, auto: 30,
      tip: "Bras au-dessus + pieds qui s’écartent simultanément.",
      benefit: "Cardio rapide à activer.",
      muscles: ["Cardio"] },
    { name: "Box Jump",          sets: 2, reps: "8 reps",  rest: 30,
      tip: "Saut explosif sur une box. Atterris en flexion.",
      benefit: "Puissance verticale.",
      muscles: ["Jambes", "Cardio"] },

    // ─── Force avec matériel ─────────────────────────────────
    { name: "Bicep Curl",        sets: 2, reps: "12 reps", rest: 30,
      tip: "Coudes fixes contre le buste, contracte en haut.",
      benefit: "Isolation des biceps.",
      muscles: ["Biceps"] },
    { name: "Front Raises",      sets: 2, reps: "12 reps", rest: 30,
      tip: "Bras tendus, lève les haltères devant à hauteur d’épaules.",
      benefit: "Faisceau antérieur du deltoïde.",
      muscles: ["Épaules"] },
    { name: "Kettlebell Swing",  sets: 2, reps: "15 reps", rest: 30,
      tip: "Hanches en arrière, propulsion explosive vers l’avant.",
      benefit: "Chaîne postérieure explosive.",
      muscles: ["Fessiers", "Dos", "Core"] },

    // ─── Olympic lifts ───────────────────────────────────────
    { name: "Clean And Jerk",    sets: 2, reps: "5 reps",  rest: 45,
      tip: "Épaulé-jeté : barre du sol aux épaules, puis jet au-dessus de la tête.",
      benefit: "Puissance complète, exo olympique.",
      muscles: ["Corps entier"] },

    // ─── Mobilité / Échauffement ─────────────────────────────
    { name: "Pike Walk",         sets: 1, reps: "10 reps", rest: 30,
      tip: "Mains au sol, marche en pike vers les pieds et retour en planche.",
      benefit: "Mobilité ischios + gainage dynamique.",
      muscles: ["Ischios", "Core", "Épaules"] },
  ],

  "force-haut": [
    { name: "Développé couché", sets: 4, reps: "8 reps", rest: 90,
      tip: "Rétracte les omoplates avant de saisir la barre. Garde les coudes à 45° du buste. Descends en 3 secondes, pousse en explosif.",
      benefit: "Développe la masse et la force du grand pectoral. C’est l’exercice roi pour élargir la cage thoracique et renforcer toute la puissance de poussée des membres supérieurs.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Tractions larges pronation", sets: 4, reps: "Max reps", rest: 90,
      tip: "Bras complètement tendus en bas. Imagine que tu plies la barre autour de ta tête. Monte jusqu’au menton.",
      benefit: "Développe les grands dorsaux et crée le fameux dos en V. Améliore la posture en contrant les épaules arrondies du quotidien et renforce la force de traction globale.",
      muscles: ["Dos", "Biceps"] },
    { name: "Développé militaire haltères", sets: 3, reps: "10 reps", rest: 75,
      tip: "Gainé, sans arquer le dos. Pousse verticalement, haltères qui se rejoignent presque en haut. Tempo 2-0-2.",
      benefit: "Renforce les trois faisceaux du deltoïde et stabilise l’articulation de l’épaule. Améliore la force fonctionnelle pour tous les mouvements au-dessus de la tête.",
      muscles: ["Épaules", "Triceps"] },
    { name: "Rowing barre buste penché", sets: 3, reps: "12 reps", rest: 75,
      tip: "Dos plat à 45°. Tire la barre vers le nombril, coudes proches du corps. Contracte les omoplates 1 seconde en haut.",
      benefit: "Épaissit le dos en ciblant les rhomboïdes, trapèzes et grand dorsal. Essentiel pour l’équilibre musculaire push/pull et la prévention des blessures d’épaules.",
      muscles: ["Dos", "Biceps"] },
    { name: "Élévations latérales", sets: 3, reps: "15 reps", rest: 60,
      tip: "Légère flexion du coude. Monte jusqu’à l’horizontale, pas plus. Descends en 3 secondes.",
      benefit: "Isole le deltoïde médian pour élargir les épaules et créer l’illusion de la taille. Protège aussi l’articulation de l’épaule lors des mouvements de poussée lourds.",
      muscles: ["Épaules"] },
    { name: "Curl barre", sets: 3, reps: "12 reps", rest: 60,
      tip: "Coudes fixes contre le buste. Contracte fort en haut 1 seconde. Descends lentement en 3 secondes.",
      benefit: "Développe le biceps brachial en masse et en définition. Améliore la force de traction et contribue à l’esthétique des bras.",
      muscles: ["Biceps"] },
  ],

  "fullbody-deb": [
    { name: "Squats", sets: 3, reps: "15 reps", rest: 60,
      tip: "Pieds à largeur d’épaules, orteils légèrement vers l’extérieur. Descends comme pour t’asseoir sur une chaise. Talons au sol, dos droit.",
      benefit: "Le roi des exercices. Développe l’intégralité du bas du corps et stimule la sécrétion naturelle d’hormones anaboliques. Améliore la mobilité des hanches et la force fonctionnelle au quotidien.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Pompes", sets: 3, reps: "10 reps", rest: 60,
      tip: "Corps droit de la tête aux talons, coudes à 45°. Descends la poitrine à 2 cm du sol. Genoux au sol si trop difficile.",
      benefit: "Exercice polyarticulaire complet qui développe la force fonctionnelle du haut du corps et renforce la ceinture scapulaire. Praticable partout, à vie.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Fentes avant", sets: 3, reps: "12 par jambe", rest: 60,
      tip: "Grand pas, genou arrière à 2 cm du sol. Cuisse avant parallèle au sol. Pousse sur le talon avant pour revenir.",
      benefit: "Développe chaque jambe indépendamment, corrigeant les déséquilibres gauche/droite. Améliore l’équilibre, la coordination et la mobilité des hanches.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Hip Thrust au sol", sets: 3, reps: "15 reps", rest: 45,
      tip: "Allongé, pieds à plat. Monte le bassin en contractant fort les fessiers. Maintiens 1 seconde en haut.",
      benefit: "Activation maximale du grand fessier. Améliore la puissance athlétique (sprint, saut), corrige la posture et réduit les douleurs lombaires en renforçant la chaîne postérieure.",
      muscles: ["Fessiers"] },
    { name: "Planche frontale", sets: 3, reps: "30 sec", rest: 45, auto: 30,
      tip: "Avant-bras au sol, corps en ligne parfaite. Rentre le nombril, serre les fessiers. Si tu trembles, c’est bon signe, tiens bon.",
      benefit: "Renforce l’ensemble du core profond (transverse de l’abdomen). Améliore la posture, protège le bas du dos et stabilise la colonne pour tous les mouvements sportifs.",
      muscles: ["Core"] },
    { name: "Crunch", sets: 3, reps: "20 reps", rest: 45,
      tip: "Mains à peine derrière les tempes, sans tirer sur la nuque. Expire en montant. Soulève les épaules, pas le bas du dos.",
      benefit: "Cible les abdominaux droits pour améliorer la stabilité lombaire. Combiné au gainage, il contribue à une ceinture abdominale fonctionnelle et solide.",
      muscles: ["Abdominaux"] },
    { name: "Superman", sets: 3, reps: "12 reps", rest: 45,
      tip: "Ventre au sol, bras tendus devant. Décolle bras ET jambes simultanément. Maintiens 2 secondes.",
      benefit: "Renforce les érecteurs spinaux et les muscles profonds du dos. Indispensable pour prévenir et réduire les douleurs lombaires, compense la vie sédentaire.",
      muscles: ["Dos", "Lombaires"] },
  ],

  "hiit": [
    { name: "Burpees", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Plonge au sol, pompe, saute, tout en fluidité. Qualité > vitesse. Atterris pieds fléchis.",
      benefit: "Exercice complet par excellence. Combine force et cardio pour brûler un maximum de calories. Développe l’explosivité, la coordination et sollicite chaque groupe musculaire.",
      muscles: ["Corps entier"] },
    { name: "Jumping Jacks", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Bras au-dessus de la tête et pieds qui s’écartent en même temps. Rythme régulier, coordination parfaite.",
      benefit: "Active le système cardiovasculaire en quelques secondes. Améliore la coordination, la proprioception et brûle efficacement les graisses en maintenant la FC haute.",
      muscles: ["Cardio", "Épaules"] },
    { name: "Mountain Climbers", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Planche haute, ramène les genoux vers la poitrine en alternant rapidement. Hanches basses, core engagé.",
      benefit: "Sollicite simultanément le core, les épaules et le système cardio. Simule le pattern naturel de course et améliore la coordination neuromusculaire.",
      muscles: ["Core", "Cardio"] },
    { name: "Jump Squats", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Squat complet puis explose vers le haut. Atterris doucement, amortis avec les genoux.",
      benefit: "Développe la puissance explosive des jambes et fessiers. Augmente rapidement la fréquence cardiaque et améliore les capacités athlétiques de saut et de sprint.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "High Knees", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Cours sur place en montant les genoux au niveau des hanches. Bras qui pompent. Reste sur l’avant du pied.",
      benefit: "Élève rapidement la FC en zone haute. Renforce les fléchisseurs de hanches et améliore la fréquence de foulée, bénéfique pour tous les sports de course.",
      muscles: ["Cardio", "Abdominaux"] },
    { name: "Pompes explosives", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Descends lentement, pousse en explosif jusqu’à décoller les mains. Si trop difficile : pompes normales rapides.",
      benefit: "Développe la puissance du haut du corps tout en maintenant une FC élevée. Améliore la force rapide des pectoraux et triceps pour les sports de contact.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Skaters", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Sauts latéraux en imitant un patineur. Touche le sol de la main opposée au pied d’appui. Amplitude maximale.",
      benefit: "Renforce les muscles stabilisateurs du genou et cheville dans le plan frontal. Améliore l’équilibre dynamique et la puissance latérale souvent négligée.",
      muscles: ["Fessiers", "Cardio"] },
    { name: "Sprint sur place", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Allure maximale, fréquence absolue. C’est le dernier, tout donner.",
      benefit: "Maximise la fréquence cardiaque pour créer un effet EPOC intense : le corps continue de brûler des calories jusqu’à 24h après la séance.",
      muscles: ["Cardio", "Corps entier"] },
  ],

  "jambes": [
    { name: "Squat barre", sets: 4, reps: "10 reps", rest: 90,
      tip: "Barre sur les trapèzes, pas sur le cou. Descends jusqu’à cuisses parallèles. Pousse avec les talons. Genoux dans l’axe des orteils.",
      benefit: "Le squat chargé est le meilleur bâtisseur de masse musculaire du bas du corps. Stimule massivement la testostérone et l’hormone de croissance pour des gains globaux.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Presse à cuisses", sets: 3, reps: "15 reps", rest: 75,
      tip: "Pieds à mi-hauteur de la plateforme. Descends à 90° de flexion. Ne verrouille jamais les genoux en haut.",
      benefit: "Permet de surcharger le bas du corps en sécurité. Cible précisément les quadriceps avec moins de stress lombaire que le squat, idéal pour varier les stimuli.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Fentes marchées", sets: 3, reps: "12 par jambe", rest: 75,
      tip: "Grand pas, genou arrière proche du sol. Alterne les jambes en avançant. Buste droit, regard devant.",
      benefit: "Développe chaque jambe indépendamment pour corriger les déséquilibres. Améliore l’équilibre dynamique et la mobilité des hanches essentiels aux sports.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Hip Thrust barre", sets: 4, reps: "12 reps", rest: 75,
      tip: "Épaules sur le banc, barre sur les hanches avec serviette. Pousse avec les talons. Contracte les fessiers 1 sec en haut.",
      benefit: "L’exercice le plus efficace pour activer le grand fessier. Renforce la chaîne postérieure, améliore la puissance de sprint et la posture assise prolongée.",
      muscles: ["Fessiers"] },
    { name: "Extensions mollets", sets: 4, reps: "20 reps", rest: 60,
      tip: "Monte sur la pointe des pieds, maintiens 1 seconde. Descends lentement, étire bien en bas.",
      benefit: "Renforce les jumeaux et le soléaire, muscles souvent négligés. Améliore la stabilité de la cheville, la puissance de sprint et prévient les tendinites d’Achille.",
      muscles: ["Mollets"] },
  ],

  "mobilite": [
    { name: "Cat-Cow", sets: 2, reps: "10 respirations", rest: 30,
      tip: "Inspiration : creuse le dos, regard vers le haut. Expiration : arrondis le dos, menton vers la poitrine.",
      benefit: "Lubrifie les disques intervertébraux et améliore la mobilité de toute la colonne. Soulage les raideurs matinales et prépare le dos à l’effort.",
      muscles: ["Colonne vertébrale"] },
    { name: "Hip Circles", sets: 2, reps: "10 par côté", rest: 20,
      tip: "Mains sur les hanches, pieds écartés. Trace les plus grands cercles possibles.",
      benefit: "Mobilise l’articulation coxo-fémorale dans toutes ses amplitudes. Prévient les blessures et améliore la fluidité des mouvements du bas du corps.",
      muscles: ["Hanches"] },
    { name: "World’s Greatest Stretch", sets: 2, reps: "30 sec par côté", rest: 20, auto: 30,
      tip: "En fente basse, main intérieure au sol, ouvre l’autre bras vers le ciel. Respire profondément.",
      benefit: "Mobilise simultanément les hanches, la colonne thoracique et les ischio-jambiers. C’est l’étirement total du corps, considéré comme le meilleur étirement polyarticulaire.",
      muscles: ["Corps entier"] },
    { name: "Pigeon Yoga", sets: 2, reps: "45 sec par côté", rest: 20, auto: 45,
      tip: "Jambe avant à 90°, jambe arrière tendue. Coussin sous la fesse si besoin. Laisse la gravité faire le travail.",
      benefit: "Étire profondément le piriforme et les fléchisseurs de hanches. Soulage les douleurs sciatiques et la tension lombaire liée à la position assise prolongée.",
      muscles: ["Hanches", "Fessiers"] },
    { name: "Thread the Needle", sets: 2, reps: "30 sec par côté", rest: 20, auto: 30,
      tip: "À quatre pattes, glisse un bras sous l’autre jusqu’à l’épaule au sol.",
      benefit: "Améliore la rotation thoracique et ouvre les grands dorsaux. Contre les effets de la posture assise et réduit les douleurs inter-scapulaires.",
      muscles: ["Épaules", "Dos"] },
    { name: "Downward Dog → Cobra", sets: 2, reps: "8 transitions", rest: 30,
      tip: "Chien tête en bas : talons vers le sol, dos plat. Cobra : hanches au sol, coudes sous les épaules. 3 sec chaque position.",
      benefit: "Étire la chaîne postérieure (ischio-jambiers, mollets) et la chaîne antérieure (pectoraux, abdos). Améliore la souplesse globale et réveille le système nerveux.",
      muscles: ["Dos", "Pectoraux"] },
    { name: "Shoulder Opener", sets: 2, reps: "30 sec", rest: 20, auto: 30,
      tip: "Mains dans le dos, doigts croisés. Pousse les épaules en arrière et les bras vers le bas. Ouvre la poitrine.",
      benefit: "Étire les pectoraux et les biceps souvent raccourcis par le travail sur ordinateur. Améliore l’ouverture thoracique et réduit les tensions cervicales.",
      muscles: ["Épaules", "Pectoraux"] },
    { name: "Neck Release", sets: 2, reps: "20 sec par côté", rest: 15, auto: 20,
      tip: "Très doux. Incline la tête vers l’épaule, aide légèrement avec la main, aucune pression forcée.",
      benefit: "Relâche les trapèzes et les scalènes sous tension chronique. Réduit les céphalées de tension et améliore la mobilité cervicale.",
      muscles: ["Nuque"] },
    { name: "Étirement quadriceps", sets: 2, reps: "30 sec par jambe", rest: 20, auto: 30,
      tip: "Debout, pied vers la fesse. Genou proche de l’autre genou. Tiens un mur si besoin.",
      benefit: "Étire le droit fémoral et les fléchisseurs de hanche raccourcis par la position assise. Soulage les douleurs aux genoux et à la hanche antérieure.",
      muscles: ["Quadriceps"] },
    { name: "Posture de l’enfant", sets: 1, reps: "60 sec", rest: 0, auto: 60,
      tip: "Genoux écartés, front au sol, bras tendus devant. Laisse le dos s’ouvrir complètement. Respiration lente.",
      benefit: "La position de récupération par excellence. Décomprime les vertèbres lombaires, relâche les tenseurs du fascia lata et active le système nerveux parasympathique.",
      muscles: ["Dos", "Hanches"] },
  ],

  "dos-biceps": [
    { name: "Tractions supination", sets: 4, reps: "Max reps", rest: 90,
      tip: "Prise en dessous (paumes vers toi), mains à largeur d’épaules. Bras complètement tendus en bas. Monte jusqu’au menton, descends en 3 sec.",
      benefit: "Combine l’activation maximale du grand dorsal et du biceps dans un seul mouvement. Développe la force relative (force/poids de corps) et l’épaisseur du dos.",
      muscles: ["Dos", "Biceps"] },
    { name: "Rowing barre buste penché", sets: 4, reps: "10 reps", rest: 90,
      tip: "Dos plat à 45°, barre sous les genoux. Tire vers le nombril, coudes proches. Contracte les omoplates en haut.",
      benefit: "Développe l’épaisseur globale du dos (grand dorsal, rhomboïdes, trapèzes moyens). Améliore la posture et contrebalance les effets du travail sédentaire.",
      muscles: ["Dos"] },
    { name: "Tirage poulie haute", sets: 3, reps: "12 reps", rest: 75,
      tip: "Tire vers la poitrine, pas la nuque. Coudes pointent vers le bas. Buste légèrement incliné.",
      benefit: "Développe les grands dorsaux avec moins de contrainte que les tractions. Améliore l’amplitude articulaire de l’épaule et la force de traction verticale.",
      muscles: ["Dos"] },
    { name: "Rowing unilatéral haltère", sets: 3, reps: "12 par bras", rest: 60,
      tip: "Genou et main sur le banc. Tire l’haltère vers la hanche, coude haut. Descends lentement.",
      benefit: "Corrige les déséquilibres gauche/droite du dos. Permet une amplitude supérieure au rowing barre et cible mieux le grand dorsal inférieur.",
      muscles: ["Dos", "Biceps"] },
    { name: "Curl barre", sets: 3, reps: "12 reps", rest: 60,
      tip: "Coudes fixes contre le corps. Contracte fort en haut 1 seconde. Descends en 3 secondes.",
      benefit: "Développe le biceps brachial en masse et en définition. Améliore la force de traction et contribue à l’esthétique des bras.",
      muscles: ["Biceps"] },
    { name: "Curl marteau", sets: 3, reps: "12 par bras", rest: 60,
      tip: "Paumes face à face tout au long du mouvement. Contrôle total sur toute l’amplitude.",
      benefit: "Cible le brachial et le brachioradial en plus du biceps pour des bras complets et équilibrés. Améliore la force de prise indispensable à tous les exercices de traction.",
      muscles: ["Biceps"] },
  ],

  "core": [
    { name: "Planche frontale", sets: 4, reps: "45 sec", rest: 30, auto: 45,
      tip: "Avant-bras au sol, corps en ligne parfaite. Rentre le nombril, serre les fessiers. Pense à te grandir vers l’avant.",
      benefit: "Active le transverse de l’abdomen, véritable corset naturel du corps. Protège le bas du dos, améliore la posture et stabilise la colonne pour tous les mouvements.",
      muscles: ["Core", "Épaules"] },
    { name: "Crunch", sets: 3, reps: "20 reps", rest: 45,
      tip: "Mains à peine derrière les tempes. Expire en montant. Soulève les épaules, pas le bas du dos.",
      benefit: "Renforce le droit de l’abdomen pour une ceinture abdominale solide. Améliore la stabilité lombaire et la capacité à maintenir une bonne posture debout.",
      muscles: ["Abdominaux"] },
    { name: "Russian Twist", sets: 3, reps: "20 reps (10/côté)", rest: 45,
      tip: "Pieds au sol ou levés. Torse à 45°. Tourne depuis la taille, pas les épaules.",
      benefit: "Cible les obliques internes et externes pour un core fonctionnel à 360°. Améliore la rotation du tronc essentielle dans tous les sports et mouvements quotidiens.",
      muscles: ["Obliques"] },
    { name: "Relevés de jambes", sets: 3, reps: "15 reps", rest: 45,
      tip: "Mains sous les fesses pour protéger le bas du dos. Monte les jambes à 90° puis descends lentement.",
      benefit: "Renforce la portion inférieure des abdominaux et les fléchisseurs de hanche. Améliore la stabilité pelvienne et la force pour les mouvements de kick et de course.",
      muscles: ["Abdominaux"] },
    { name: "Planche latérale", sets: 3, reps: "30 sec par côté", rest: 30, auto: 30,
      tip: "Corps droit de la tête aux pieds, hanche décollée du sol. Pour faciliter : genou inférieur au sol.",
      benefit: "Renforce les obliques et le carré des lombes pour prévenir les douleurs lombaires latérales. Améliore la stabilité du tronc dans le plan frontal, souvent négligée.",
      muscles: ["Obliques", "Core"] },
    { name: "Dead Bug", sets: 3, reps: "12 reps (6/côté)", rest: 45,
      tip: "Bas du dos collé au sol. Étends le bras opposé à la jambe en simultané. Contrôle total.",
      benefit: "Améliore la coordination et la stabilité du core profond en conditions de charge asymétrique. Excellent pour la prévention des blessures lombaires lors des sports.",
      muscles: ["Core"] },
    { name: "Bird Dog", sets: 3, reps: "12 reps (6/côté)", rest: 45,
      tip: "À quatre pattes. Étends le bras droit et la jambe gauche simultanément. Maintiens 2 secondes.",
      benefit: "Renforce les muscles stabilisateurs de la colonne tout en améliorant l’équilibre et la coordination. Idéal pour réhabiliter et prévenir les douleurs lombaires.",
      muscles: ["Core", "Dos"] },
    { name: "Superman", sets: 3, reps: "15 reps", rest: 45,
      tip: "Ventre au sol, bras devant. Décolle bras ET jambes simultanément. Maintiens 2 secondes.",
      benefit: "Renforce les érecteurs spinaux, souvent négligés. Prévient les douleurs lombaires, améliore la posture et compense les effets néfastes de la position assise.",
      muscles: ["Dos", "Lombaires"] },
  ],

  "cardio-endurance": [
    { name: "Échauffement · Marche rapide", sets: 1, reps: "5 min", rest: 0, auto: 300,
      tip: "Commence à allure modérée, augmente progressivement. Balancement naturel des bras. Respiration nasale.",
      benefit: "Élève progressivement la température corporelle et lubrifie les articulations. Prépare le système cardiovasculaire et réduit le risque de blessure musculaire.",
      muscles: ["Cardio"] },
    { name: "Course continue Zone 2", sets: 1, reps: "20 min", rest: 60, auto: 1200,
      tip: "Allure conversationnelle : tu dois pouvoir parler par phrases courtes. FC cible 60-70% de ton max.",
      benefit: "Développe les mitochondries musculaires et améliore l’utilisation des graisses comme carburant. C’est le fondamental de l’endurance aérobie à long terme.",
      muscles: ["Cardio", "Endurance"] },
    { name: "Fractionné (1 min / 2 min récup)", sets: 4, reps: "3 min par répét.", rest: 0, auto: 180,
      tip: "1 min à 85-90% de ton max, puis 2 min de trot récupérateur. Qualité > quantité.",
      benefit: "Améliore le VO2max et la capacité anaérobie. Stimule l’effet EPOC pour une combustion de graisses prolongée après la séance et augmente le seuil lactique.",
      muscles: ["Cardio", "VO2max"] },
    { name: "Retour au calme · Marche", sets: 1, reps: "5 min", rest: 0, auto: 300,
      tip: "Réduis progressivement. Respiration abdominale profonde.",
      benefit: "Permet un retour progressif à l’état de repos pour le système cardiovasculaire. Active la récupération parasympathique et prévient les étourdissements post-effort.",
      muscles: ["Récupération"] },
  ],

  "salle-haut": [
    { name: "Développé couché barre", sets: 4, reps: "8 reps", rest: 90,
      tip: "Allongé, omoplates rétractées et serrées, pieds bien ancrés au sol. Descends la barre au niveau des tétons en 3 secondes, coudes à 45°, puis pousse en explosif sans décoller les fessiers.",
      benefit: "L’exercice roi pour la masse et la force des pectoraux. Le format barre permet de charger lourd en sécurité et de progresser semaine après semaine sur un mouvement mesurable.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Tirage vertical poulie", sets: 4, reps: "10 reps", rest: 90,
      tip: "Prise large, buste légèrement incliné en arrière. Amène la barre vers le haut des pectoraux en tirant avec les coudes, pas avec les mains. Contrôle la remontée en 3 secondes.",
      benefit: "Cible les grands dorsaux pour construire le dos en V. Alternative accessible à la traction qui permet de doser précisément la charge et de bâtir la force de tirage.",
      muscles: ["Dos", "Biceps"] },
    { name: "Développé militaire barre", sets: 3, reps: "10 reps", rest: 75,
      tip: "Debout ou assis, gainage serré pour ne pas cambrer le bas du dos. Pousse la barre à la verticale jusqu’à extension complète, tête qui avance légèrement en fin de mouvement. Tempo 2-0-2.",
      benefit: "Développe des épaules larges et puissantes et renforce la stabilité du tronc. Mouvement de force fonctionnelle pour tout ce qui se pousse au-dessus de la tête.",
      muscles: ["Épaules", "Triceps"] },
    { name: "Rowing machine assis", sets: 3, reps: "12 reps", rest: 75,
      tip: "Dos droit, poitrine sortie. Tire la poignée vers le nombril en serrant les omoplates, marque une seconde de contraction en fin de course, puis laisse revenir sans t’affaisser.",
      benefit: "Épaissit le milieu du dos (rhomboïdes, trapèzes) et équilibre le travail de poussée. Essentiel pour une posture solide et des épaules protégées sur le long terme.",
      muscles: ["Dos", "Biceps"] },
    { name: "Écarté à la poulie vis-à-vis", sets: 3, reps: "12 reps", rest: 60,
      tip: "Léger buste en avant, coudes à peine fléchis et figés tout le mouvement. Rassemble les poignées devant toi en pensant à « serrer » les pectoraux, puis ouvre lentement en gardant la tension.",
      benefit: "Isole le pectoral en étirement et en contraction, là où la barre s’arrête. Sculpte la poitrine et renforce la connexion muscle-esprit sur les pectoraux.",
      muscles: ["Pectoraux"] },
    { name: "Élévations latérales poulie", sets: 3, reps: "15 reps", rest: 60,
      tip: "Poulie basse dans la main opposée, léger relâchement du coude. Monte le bras jusqu’à l’horizontale, pas plus haut, en menant avec le coude. Descends en 3 secondes.",
      benefit: "Isole le deltoïde latéral pour élargir visuellement les épaules et parfaire la carrure. La poulie garde une tension constante que les haltères perdent en position basse.",
      muscles: ["Épaules"] },
  ],

  "recup-active": [
    { name: "Cohérence cardiaque", sets: 1, reps: "3 min", rest: 0, auto: 180,
      tip: "Assis confortablement, inspire 5 secondes par le nez, expire 5 secondes par la bouche. Aucune tension : laisse le ventre se gonfler à l’inspiration, se vider à l’expiration.",
      benefit: "Active le système nerveux parasympathique et fait redescendre le rythme cardiaque. Amorce la récupération, réduit le cortisol et prépare le corps au relâchement.",
      muscles: ["Respiration"] },
    { name: "Étirement chaîne postérieure", sets: 2, reps: "45 sec", rest: 15, auto: 45,
      tip: "Assis jambes tendues, avance le buste vers les pieds en gardant le dos long, sans arrondir. Va jusqu’à une tension douce, jamais à la douleur, et respire dans l’étirement.",
      benefit: "Détend les ischio-jambiers et le bas du dos souvent raccourcis par la position assise. Restaure l’amplitude des hanches et soulage les tensions lombaires.",
      muscles: ["Ischio-jambiers", "Dos"] },
    { name: "Ouverture des hanches (papillon)", sets: 2, reps: "45 sec", rest: 15, auto: 45,
      tip: "Assis, plantes de pieds l’une contre l’autre. Laisse les genoux descendre vers le sol par leur propre poids, dos droit. Tu peux basculer doucement le bassin d’avant en arrière.",
      benefit: "Relâche les adducteurs et mobilise les hanches en rotation externe. Compense les heures assises et prépare des jambes plus libres pour la prochaine séance.",
      muscles: ["Hanches", "Adducteurs"] },
    { name: "Torsion vertébrale allongée", sets: 2, reps: "30 sec par côté", rest: 10, auto: 30,
      tip: "Sur le dos, ramène un genou et laisse-le tomber de l’autre côté, bras en croix, regard opposé. Garde les deux épaules au sol. Respiration lente et profonde.",
      benefit: "Décompresse la colonne et étire les muscles paravertébraux et fessiers. Réduit les raideurs du dos et apaise le système nerveux en fin de journée.",
      muscles: ["Colonne vertébrale", "Fessiers"] },
    { name: "Étirement des pectoraux au mur", sets: 2, reps: "30 sec par côté", rest: 10, auto: 30,
      tip: "Avant-bras contre un mur, coude à hauteur d’épaule. Pivote doucement le buste dans le sens opposé jusqu’à sentir l’ouverture de la poitrine. Ne force jamais sur l’épaule.",
      benefit: "Ouvre les pectoraux et l’avant de l’épaule fermés par les écrans et le travail de poussée. Améliore la posture et libère la respiration thoracique.",
      muscles: ["Pectoraux", "Épaules"] },
    { name: "Étirement quadriceps debout", sets: 2, reps: "30 sec par jambe", rest: 10, auto: 30,
      tip: "Debout, attrape un pied vers la fesse, genoux serrés l’un contre l’autre. Rentre légèrement le bassin pour accentuer. Appuie-toi à un mur pour l’équilibre.",
      benefit: "Détend le droit fémoral et l’avant de la hanche raccourcis par la position assise. Soulage les genoux et rééquilibre la tension autour du bassin.",
      muscles: ["Quadriceps"] },
    { name: "Posture de l’enfant", sets: 1, reps: "90 sec", rest: 0, auto: 90,
      tip: "Genoux écartés, front au sol, bras tendus loin devant. Laisse tout le poids du haut du corps se déposer. Respiration lente : allonge progressivement l’expiration.",
      benefit: "La position de récupération par excellence. Décompresse les lombaires, étire le dos et bascule définitivement le corps en mode parasympathique pour clôturer la séance.",
      muscles: ["Dos", "Hanches"] },
  ],

  "defi-gainage": [
    { name: "Planche frontale", sets: 3, reps: "45 sec", rest: 30, auto: 45,
      tip: "Avant-bras au sol sous les épaules, corps en ligne parfaite de la tête aux talons. Rentre le nombril, serre fessiers et cuisses. Ne laisse jamais les hanches s’affaisser ni monter.",
      benefit: "Construit l’endurance du gainage profond (transverse). C’est la base qui protège le bas du dos et transfère la force entre le haut et le bas du corps.",
      muscles: ["Core"] },
    { name: "Planche latérale", sets: 3, reps: "30 sec par côté", rest: 20, auto: 30,
      tip: "En appui sur un avant-bras, corps aligné, hanche haute. Empile les pieds ou décale-les pour plus de stabilité. Le bassin ne descend pas, c’est là que tout se joue.",
      benefit: "Renforce les obliques et le carré des lombes, stabilisateurs latéraux souvent négligés. Améliore l’équilibre du tronc et prévient les déséquilibres droite/gauche.",
      muscles: ["Obliques"] },
    { name: "Hollow hold", sets: 3, reps: "30 sec", rest: 30, auto: 30,
      tip: "Sur le dos, bas du dos plaqué au sol. Décolle épaules et jambes tendues, bras vers l’arrière. Si c’est trop dur, plie les genoux ou rapproche les bras du corps.",
      benefit: "Le gainage anti-extension des gymnastes. Verrouille toute la sangle abdominale sous tension et crée un ventre plat et solide, base de tous les mouvements dynamiques.",
      muscles: ["Abdominaux"] },
    { name: "Relevés de jambes lents", sets: 3, reps: "12 reps", rest: 30,
      tip: "Allongé, mains sous les fessiers. Monte les jambes tendues à la verticale, puis descends en 4 secondes sans que le bas du dos se creuse. Contrôle absolu, zéro élan.",
      benefit: "Cible le bas des abdominaux et apprend à garder le bassin verrouillé. La descente lente maximise la tension et développe une vraie force de gainage.",
      muscles: ["Abdominaux"] },
    { name: "Planche, le record", sets: 1, reps: "Max", rest: 0,
      tip: "Le défi final : tiens la planche parfaite le plus longtemps possible. Position irréprochable jusqu’à la dernière seconde. Note ton temps, c’est lui que tu battras la prochaine fois.",
      benefit: "Un repère concret de ta progression. Mesurer ton gainage maximal te donne un objectif clair à dépasser et transforme chaque séance en défi personnel.",
      muscles: ["Core", "Gainage"] },
  ],

  // Placée à la fin pour moderniser aussi la séance cardio-endurance historique.
  ...WAVE_4_EXERCISES,
};

/* ─── Util ───────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ⚠️ CETTE TABLE PORTE DES ALIAS, ET CE N'EST PAS DU DOUBLON. Un titre de
   séance n'est pas qu'un libellé : il est écrit dans `workout_sessions.title`
   au moment où la séance est faite, et c'est par lui que « Refaire » retrouve
   le tunnel des années plus tard. Renommer un titre à l'écran sans garder
   l'ancien ici ferait perdre son animation à tout l'historique déjà écrit.
   Le premier de chaque paire est le titre affiché aujourd'hui, le second
   l'ancien. Précédent : « HIIT Brûle-Graisses », renommé le 2026-07-26.

   ⚠️ ELLE EST SORTIE DE `resolveSessionId` EN V9C bis, ET C'EST TOUT
   L'INTÉRÊT : le Guide a besoin de reconnaître une séance du catalogue
   qu'on lui NOMME (« remplace aujourd'hui par Express 12 »), et il doit
   le faire sur la même table que « Refaire ». En recopier une seconde
   ailleurs, ce serait garantir qu'elles divergent au premier titre
   ajouté, et qu'une séance existe pour un écran et pas pour l'autre.
   L'ORDRE COMPTE : pour un slug donné, la PREMIÈRE clé est le titre
   affiché, c'est celle que `contenuNomme` rend à l'écran. */
export const SESSION_SLUGS: Record<string, string> = {
  "Force Haut du Corps":   "force-haut",
  "Full Body Débutant":    "fullbody-deb",
  "HIIT 20/10":            "hiit",
  "HIIT Brûle-Graisses":   "hiit",
  "Jambes & Fessiers":     "jambes",
  "Mobilité Matinale":     "mobilite",
  "Dos & Biceps":          "dos-biceps",
  "Core & Gainage":        "core",
  "Endurance Cardio":      "cardio-endurance",
  "Haut du corps en salle": "salle-haut",
  "Haut du corps — Salle": "salle-haut",
  "Récupération active":   "recup-active",
  "Défi Gainage":          "defi-gainage",
  "Express 12":            "express-12",
  "Reprendre en douceur":  "reprise-douce",
  "Appartement silencieux":"appartement-silencieux",
  "Jambes au poids du corps": "jambes-poids-corps",
  "Haut du corps au sol":  "haut-corps-sol",
  "Full Body Intermédiaire": "fullbody-inter",
  "Puissance sans matériel": "puissance-sans-materiel",
  "Découverte des machines": "salle-decouverte",
  "Push, pectoraux et épaules": "push-salle",
  "Push — Pectoraux & épaules": "push-salle",
  "Jambes, dominante quadriceps": "jambes-quadriceps",
  "Jambes — Dominante quadriceps": "jambes-quadriceps",
  "Chaîne postérieure": "chaine-posterieure",
  "Épaules & bras": "epaules-bras",
  "Full Body Machines": "fullbody-machines",
  "Posture après écran": "posture-ecran",
  "Hanches libres": "hanches-libres",
  "Épaules & haut du dos": "epaules-haut-dos-mobilite",
  "Chevilles & squat": "chevilles-squat",
  "Colonne mobile": "colonne-mobile",
  "Mobilité complète": "mobilite-complete",
  "Mobilité active": "mobilite-active",
  "Cardio sans saut": "cardio-sans-saut",
  "Tabata Express": "tabata-express",
  "Cardio de salle": "cardio-salle",
  "Pyramide cardio": "pyramide-cardio",
  "Cardio et force aux haltères": "cardio-halteres",
  "Cardio & force — Haltères": "cardio-halteres",
  "Retour au calme": "retour-au-calme",
  "Pause détente": "pause-detente",
  "Récupération jambes": "recup-jambes",
  "Haut du corps relâché": "recup-haut-corps",
  "Dos relâché": "dos-relache",
  "Soir calme": "soir-calme",
  "Lendemain de séance": "lendemain-seance",
  "Récupération complète": "recup-complete",
  "Les bases du mouvement": "bases-mouvement",
  "Squat maîtrisé": "squat-maitrise",
  "Pompes maîtrisées": "pompes-maitrise",
  "Tractions, construire le mouvement": "tractions-progression",
  "Tractions — Construire le mouvement": "tractions-progression",
  "Charnière de hanche": "charniere-hanche",
  "Gainage, progresser": "gainage-progression",
  "Gainage — Progresser": "gainage-progression",
  "Épaules, mobilité et contrôle": "epaules-controle",
  "Épaules — Mobilité & contrôle": "epaules-controle",
  "Unilatéral, maîtriser les appuis": "unilateral-maitrise",
  "Unilatéral — Maîtriser les appuis": "unilateral-maitrise",
  "Tempo, ralentir pour progresser": "tempo-controle",
  "Tempo — Ralentir pour progresser": "tempo-controle",
};

/**
 * Résout l'id de session depuis le titre d'un post.
 * Retourne null si aucune séance intégrée ne correspond
 * (séance perso ou titre inconnu).
 */
export function resolveSessionId(title: string): string | null {
  if (SESSION_SLUGS[title]) return SESSION_SLUGS[title];
  // recherche partielle (ex: "Force Haut du Corps . 42 min" -> "force-haut")
  for (const [key, val] of Object.entries(SESSION_SLUGS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return null; // seance perso ou titre inconnu
}

/* ─── Component ──────────────────────────────────────────── */
/* Les encres du tunnel, toujours sombre quel que soit le thème. */
const TUN = {
  t1: "#F0ECFA", t2: "#A79FC0", t3: "#6E6690", lav: "#C9B8FF",
  line: "rgba(255,255,255,0.08)",
  violet: "#8B5CF6", orange: "#F5B120", ring2: "#FF7A1A", teal: "#2BD4A0",
};

/* ════════════════════════════════════════════════════════════════════
   R5 · LE FAIT MARQUANT (maquette 07, écran 08)

   Une phrase, avec son périmètre : l'exercice, la série, le jour. Le
   chiffre du jour en teal (réussite, système D), l'ancien en encre neutre.
   La règle vit dans `recapSeance.ts` ; ici on ne fait que la dire.
   ════════════════════════════════════════════════════════════════════ */
function LigneFait({ fait }: { fait: FaitMarquant }) {
  const [maintenant] = useState(() => new Date());
  const quand = quandRelatif(fait.termineLe, maintenant);
  const up = { color: TUN.teal, fontWeight: 800 } as const;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="flex items-center gap-3 w-full mt-3 py-2.5 text-left"
      style={{ borderTop: `1px solid ${TUN.line}` }}>
      <span className="flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{ width: 40, height: 40, background: "rgba(43,212,160,0.10)" }}>
        <ExerciseThumb name={fait.nom} size={38} />
      </span>
      <p className="text-[13px] leading-snug" style={{ color: TUN.t2 }}>
        <b style={{ color: TUN.t1 }}>{fait.nom}</b>{" : "}
        {fait.genre === "charge" ? (
          <><span className="vy-nombre" style={up}>{libelleCharge(fait.charge, fait.type)}</span>, contre <span className="vy-nombre">{libelleCharge(fait.avant, fait.type)}</span> {quand}.</>
        ) : (
          <><span className="vy-nombre" style={up}>{fait.reps}</span>
            {fait.charge !== null && fait.type ? <> à <span className="vy-nombre">{libelleCharge(fait.charge, fait.type)}</span></> : " répétitions"}
            {" "}{serieNommee(fait.serie)}, contre <span className="vy-nombre">{fait.avant}</span> {quand}.</>
        )}
      </p>
    </motion.div>
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
function DetailExercices({ lignes, margeDe, estRepere, onMarge, onFermer, visage }: {
  lignes: LigneDuDetail[];
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
      <button type="button" aria-label="Fermer" onClick={onFermer} className="absolute inset-0 cursor-pointer" style={{ background: "rgba(5,3,12,0.6)" }} />
      <motion.div role="dialog" aria-label="Mes exercices"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="relative w-full max-w-md flex flex-col"
        style={{ maxHeight: "82dvh", background: "#120D22", borderTopLeftRadius: "var(--r-feuille)", borderTopRightRadius: "var(--r-feuille)", border: `1px solid ${TUN.line}`, borderBottom: "none" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-[16px] font-bold" style={{ color: "#fff" }}>Mes exercices</h3>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="cursor-pointer p-1" style={{ color: TUN.t2 }}><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">
          {groupes.map(({ e, lignes: ls }) => {
            const marge = margeDe(e);
            return (
              <div key={e} className="py-3" style={{ borderTop: `1px solid ${TUN.line}` }}>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)" }}>
                    <ExerciseThumb name={ls[0].exercice_nom} size={34} />
                  </span>
                  <p className="text-[13px] font-bold" style={{ color: "#fff" }}>{ls[0].exercice_nom}</p>
                </div>
                <ul className="mt-2 flex flex-col gap-1">
                  {ls.map((l) => (
                    <li key={l.serie} className="flex justify-between text-[13px]">
                      <span style={{ color: TUN.t3 }}>Série {l.serie}</span>
                      <span className="vy-nombre" style={{ color: l.statut === "terminee" ? TUN.t1 : TUN.t3 }}>{texteSerie(l)}</span>
                    </li>
                  ))}
                </ul>
                {estRepere(e) && marge !== null && (
                  <div className="mt-3">
                    <QuestionMarge question="Ta dernière série : tu aurais pu faire encore combien de répétitions ?"
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

  // Le tunnel est toujours sombre : l'or decor y tient ses 8,4:1.
  const or = "#F5B120";
  const encre = "#A79FC0";

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
        style={{ width: 32, height: 44, borderRadius: 7, background: "rgba(0,0,0,0.35)" }}
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
              ? `Maillon ${maillon.maillon} fait · on attend ${maillon.equipier?.pseudo ?? "ton binôme"}.`
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
      style={{ background: "rgba(139,92,246,0.13)", border: "1px solid rgba(139,92,246,0.35)" }}
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
        <strong className="block text-[13px] font-bold" style={{ color: "#C3AEFF" }}>
          {autres > 0 ? `${badges.length} badges gagnés` : "Badge gagné"}
        </strong>
        <small className="block text-[11px]" style={{ color: "#A79FC0" }}>
          {premier.nom}{autres > 0 ? ` et ${autres} autre${autres > 1 ? "s" : ""}` : ""}
        </small>
      </span>

      <ChevronRight size={16} strokeWidth={2.5} style={{ color: "#C3AEFF", flexShrink: 0 }} />
    </motion.button>
  );
}

export default function WorkoutGuideModal({
  sessionId, title, duration, category, heroImage, onClose, cible, exerciseList,
  onGarder, relaisRunId,
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

  const { open: openAssistant } = useAssistant();
  const { guide } = useGuideActif();

  const [phase,         setPhase]         = useState<GuidePhase>("intro");
  const [exerciseIdx,   setExerciseIdx]   = useState(0);
  const [setIdx,        setSetIdx]        = useState(0);
  const [restCountdown, setRestCountdown] = useState(0);
  const [restTotal,     setRestTotal]     = useState(0);
  const [restMode,      setRestMode]      = useState<"set" | "exercise">("set");
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [prep,          setPrep]          = useState(0); // décompte 3-2-1 avant un effort chronométré
  const [badgesGagnes,  setBadgesGagnes]  = useState<Badge[]>([]);
  const [hiitSub,       setHiitSub]       = useState<HiitSub>("work");
  const [doneMap,       setDoneMap]       = useState<MarquesSeance>({});
  /* R1 · un identifiant par lancement, tiré une fois : la base refuse
     d'enregistrer deux fois le même, donc un appel rejoué ne double rien. */
  const [lancementId] = useState(nouveauLancement);
  /* Comment la série chronométrée en cours se termine si on la valide à la
     main (« Valider », « Passer l'effort ») : posé par le bouton, lu par
     l'effet du minuteur. Sans ça, un minuteur abrégé passerait pour fini. */
  const validationRef = useRef<{ validation: Validation; dureeS: number | null } | null>(null);
  /* ── R3 · ce que les séances PRESCRITES déclarent ──
     `remplacements` : l'exercice des séries qui restent, par emplacement
     (chaque série validée garde le sien dans sa marque). `chargeCourante` :
     la charge saisie pour l'exercice en cours d'un emplacement ; elle
     repart inconnue à chaque changement d'exercice, jamais héritée.
     `correction` : la série qu'on corrige pendant le repos. */
  const [remplacements, setRemplacements] = useState<Remplacements>({});
  const [chargeCourante, setChargeCourante] = useState<Record<number, number | null>>({});
  const [editCharge,    setEditCharge]    = useState(false);
  const [correction,    setCorrection]    = useState<{ emplacement: number; serie: number; reps: number; charge: number | null } | null>(null);
  /* Le panneau « Changer » retient la série de son ouverture : son choix
     ne s'applique qu'à elle (tour 27). */
  const [changer,       setChanger]       = useState<(PositionTunnel & { choisi: Equivalent | null }) | null>(null);
  /* Les répétitions réellement faites, réglées AVANT « Fait » : elles ne
     valent que pour la série où on les a saisies (tour 27). */
  const [repsSaisie,    setRepsSaisie]    = useState<SaisieReps | null>(null);
  const [editReps,      setEditReps]      = useState(false);
  /* R4 · ce qui sert à la progression, lu une fois au montage. `null` =
     pas encore lu, ou illisible : la charge de départ reste alors
     inconnue et aucun cran n'est supposé. */
  /* R5 · l'historique des exercices prescrits, lu par séances entières :
     la charge de départ (R4) et le fait marquant de la fin s'en servent. */
  const [historique,    setHistorique]    = useState<SerieHistorique[] | null>(null);
  const [crans,         setCrans]         = useState<Map<string, number> | null>(null);
  /* Les réponses données dans l'écran de fin, quand le repère terminait
     la séance : elles s'écrivent après l'enregistrement (`corriger_marge`). */
  const [margesFin,     setMargesFin]     = useState<Record<number, Marge>>({});
  /* Écrites dans l'ordre, avec la dernière réponse confirmée, et rejouées
     après un échec (`fileDeMarges`, tour 30). */
  const [fileMarges] = useState(() => fileDeMarges((e, m) => corrigerMarge(lancementId, e, m)));
  /* Les questions déjà présentées : c'est elles que compte le plafond de
     deux, pas les exercices éligibles à l'instant (tour 30). */
  const [questionsPosees, setQuestionsPosees] = useState<number[]>([]);
  /* La vibration de fin de repos ne joue qu'une fois, même quand une
     correction ouverte fait attendre la reprise. */
  const finReposVibreeRef = useRef(false);
  const [startMs,       setStartMs]       = useState(0);
  const [elapsed,       setElapsed]       = useState(0);
  const [paused,        setPaused]        = useState(false);
  const [showInfo,      setShowInfo]      = useState(false);
  const [introOpen,     setIntroOpen]     = useState<number | null>(null); // exo déplié dans la liste "Au programme"
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
  const [garde,         setGarde]         = useState<"idle" | "gardee" | "refusee">("idle");
  /* R5 · le rang après la séance (le dernier étage), l'affiche à envoyer,
     et la feuille « Voir mes exercices ». */
  const [rangFin,       setRangFin]       = useState<Rang | null>(null);
  const [afficheData,   setAfficheData]   = useState<PerfShareData | null>(null);
  const [envoyerOuvert, setEnvoyerOuvert] = useState(false);
  const [detailOuvert,  setDetailOuvert]  = useState(false);
  const [seanceIdFin,   setSeanceIdFin]   = useState<string | null>(null);

  const { user, session } = useAuth();

  /* R1 bis · le compte qui a COMMENCÉ la séance, figé au départ. Le
     journal et ses suites lui appartiennent, même si la session change
     avant la fin (`proprietaireDeLaSeance`). */
  const proprietaireRef = useRef<string | null>(null);
  const pausedAtRef = useRef<number>(0);
  /** L'instant réel du départ : `startMs` se décale à chaque pause. */
  const debutRef = useRef<number | null>(null);

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
    void finaliserSeance(dependancesReelles(supabase), nouvelleAttente({
      journal: journalRef.current,
      cible: cible ?? null,
      relaisRunId: relaisRunId ?? null,
    })).then((r) => {
      const etat = etatFinDeSeance(r);
      setFinIncomplete(etat.genre === "ok" ? null : etat);
      if (r.journal !== "enregistre") return;
      setSessionSaved(true);
      if (r.seanceId) setSeanceIdFin(r.seanceId);
      if (r.afficheGardee) {
        setAfficheSaved(true);
        if (r.seanceId && journalRef.current) {
          setAfficheData(perfDataToShare(afficheDe(journalRef.current, r.seanceId), { user: user?.pseudo }));
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
        setRangFin(etat.rang);
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
  const lignesCourantes = useMemo(() => lignesDuJournal(exercises, doneMap, remplacements), [exercises, doneMap, remplacements]);
  const aQuestion = questionsPosees;
  const margeDe = (e: number): Marge | null =>
    doneMap[e]?.[(exercises[e]?.sets ?? 1) - 1]?.statut === "terminee"
      ? (margesFin[e] ?? (doneMap[e]?.[(exercises[e]?.sets ?? 1) - 1] as { marge?: Marge | null }).marge ?? null)
      : null;
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
    emplacement: e, nom: exercises[e].name, prescription: p,
    series: lignesCourantes.filter((l) => l.emplacement === e),
  }] : []);
  const propositionsFin = propositionsDeSeance(
    emplacementsFinis.map((x) => ({ ...x, marge: margeDe(x.emplacement) })),
    (cle, type) => crans?.get(cleCharge(cle, type)) ?? null,
  );
  const fait = phase === "done" ? faitMarquant(emplacementsFinis, historique, seanceIdFin) : null;
  const repondreAuRepos = (m: Marge) => setDoneMap((prev) => {
    const marque = prev[exerciseIdx]?.[setIdx];
    if (!marque || marque.statut !== "terminee") return prev;
    return { ...prev, [exerciseIdx]: { ...prev[exerciseIdx], [setIdx]: { ...marque, marge: m } } };
  });
  const cibleCur = cibleReps(cur);
  const repsCur  = declare ? repsADeclarer(cibleCur, repsSaisie, { emplacement: exerciseIdx, serie: setIdx }) : null;
  /* Le panneau ne vaut que pour la série où il a été ouvert ; tant qu'il
     vaut, le 3-2-1 et le chrono sont suspendus. */
  const choixOuvert = !!changer && choixApplicable(changer, { emplacement: exerciseIdx, serie: setIdx, enEffort: phase === "exercising" });
  const isHiit   = !!cur?.hiit;
  const isTimered = !!(cur?.auto || cur?.hiit);
  const totalSets = exercises.reduce((a, e) => a + e.sets, 0);

  /* R4 · les réponses de l'écran de fin s'écrivent une fois la séance
     enregistrée, sans bloquer sa finalisation. */
  useEffect(() => {
    if (!sessionSaved) return;
    for (const [e, m] of Object.entries(margesFin)) void fileMarges.demander(Number(e), m);
  }, [sessionSaved, margesFin, fileMarges]);

  /* ── Elapsed clock ── */
  useEffect(() => {
    if (phase === "intro" || phase === "done" || startMs === 0 || paused) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startMs, paused]);

  /* ── Skip the entire current exercise ── */
  const skipExercise = useCallback(() => {
    const nextEx = exerciseIdx + 1;
    setShowInfo(false); setChanger(null); setEditReps(false);
    if (nextEx < exercises.length) {
      setExerciseIdx(nextEx); setSetIdx(0);
      setAutoCountdown(0);   setHiitSub("work");
      setPhase("exercising");
      const e = exercises[nextEx];
      if (e?.auto)      { setAutoCountdown(e.auto); setPrep(3); }
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); setPrep(3); }
    } else {
      setPhase("done");
    }
  }, [exercises, exerciseIdx]);

  /* ── Advance to next set / exercise ── */
  const advance = useCallback(() => {
    const nextSet = setIdx + 1;
    const nextEx  = exerciseIdx + 1;
    setShowInfo(false);
    if (nextSet < (exercises[exerciseIdx]?.sets ?? 1)) {
      setSetIdx(nextSet); setPhase("exercising");
      const e = exercises[exerciseIdx];
      if (e?.auto)      { setAutoCountdown(e.auto); setPrep(3); }
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); setPrep(3); }
    } else if (nextEx < exercises.length) {
      /* Plus aucune attente posée ici : l’unique temps du changement
         d’exercice est décidé dans `completeSet`, juste en dessous. */
      setExerciseIdx(nextEx); setSetIdx(0); setPhase("exercising");
      const e = exercises[nextEx];
      if (e?.auto)      { setAutoCountdown(e.auto); setPrep(3); }
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); setPrep(3); }
      else              setAutoCountdown(0);
    } else {
      setPhase("done");
    }
  }, [exercises, exerciseIdx, setIdx]);

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
          .filter((l) => l.emplacement === exerciseIdx);
        setQuestionsPosees((prev) => poserQuestion(prev, exerciseIdx, questionUtile(series, p)));
      }
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
    setDoneMap(prev => {
      const parSerie = { ...(prev[exerciseIdx] ?? {}) };
      for (let s = setIdx; s < (ex?.sets ?? 1); s++) if (!parSerie[s]) parSerie[s] = { statut: "passee" };
      return { ...prev, [exerciseIdx]: parSerie };
    });
    validationRef.current = null;
    skipExercise();
  }, [exercises, exerciseIdx, setIdx, skipExercise]);

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
    setEditCharge(false); setEditReps(false); setShowInfo(false); setChanger(null);
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
      if (pas.vibrer) { vibrer([70, 50, 70]); finReposVibreeRef.current = true; } // fin de récup
      if (!pas.reprendre) return;
      if (restMode === "exercise") { setRestMode("set"); skipExercise(); }
      else advance();
      return;
    }
    const t = setTimeout(() => setRestCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restCountdown, paused, restMode, correction]);

  /* ── Décompte 3-2-1 avant chaque effort chronométré ── */
  /* R3 · le choix d'un remplaçant suspend le 3-2-1 ET le chrono
     (`pasDeLEffort`) : aucune série ne se valide derrière le panneau, et
     l'annuler reprend là où on en était. */
  useEffect(() => {
    if (phase !== "exercising") return;
    if (pasDeLEffort({ enPause: paused, choixOuvert, prep, chronometre: !!(cur?.auto || cur?.hiit), restant: autoCountdown }) !== "decompter_prep") return;
    const t = setTimeout(() => setPrep(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prep, paused, choixOuvert, cur, autoCountdown]);

  /* ── Auto / HIIT countdown ── */
  useEffect(() => {
    if (phase !== "exercising" || !cur) return;
    const pas = pasDeLEffort({ enPause: paused, choixOuvert, prep, chronometre: !!(cur.auto || cur.hiit), restant: autoCountdown });
    if (pas === "attendre" || pas === "decompter_prep") return;
    if (pas === "terminer") {
      vibrer(90); // fin d'effort chronométré (ou fin d'un segment HIIT)
      if (cur.hiit && hiitSub === "work") { setHiitSub("rest"); setAutoCountdown(HIIT_REST); return; }
      /* Arrivé au bout tout seul, sauf si un bouton l'a abrégé juste avant. */
      const v = validationRef.current
        ?? { validation: "minuteur_fini" as const, dureeS: cur.hiit ? HIIT_WORK : (cur.auto ?? null) };
      validationRef.current = null;
      completeSet(v.validation, v.dureeS); return;
    }
    const t = setTimeout(() => setAutoCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, autoCountdown, hiitSub, cur, paused, prep, choixOuvert]);

  /* ── Start ── */
  const startWorkout = () => {
    setStartMs(Date.now());
    debutRef.current = Date.now();
    proprietaireRef.current = user?.id ?? null;
    setExerciseIdx(0); setSetIdx(0); setDoneMap({}); setPaused(false); setShowInfo(false);
    setRemplacements({}); setChargeCourante({}); setCorrection(null); setEditCharge(false); setChanger(null);
    setRepsSaisie(null); setEditReps(false);
    setPhase("exercising");
    if (exercises[0]?.auto)      { setAutoCountdown(exercises[0].auto); setPrep(3); }
    else if (exercises[0]?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); setPrep(3); }
  };

  /* ── Timers ── */
  const autoTotal  = isHiit ? (hiitSub === "work" ? HIIT_WORK : HIIT_REST) : (cur?.auto ?? 0);
  const autoOffset = CC * (1 - (autoTotal > 0 ? autoCountdown / autoTotal : 0));
  const restOffset = CC * (1 - (restTotal > 0 ? restCountdown / restTotal : 1));
  const canPause   = (phase === "exercising" && isTimered) || phase === "resting";
  const add15      = () => { setRestTotal(t => t + 15); setRestCountdown(c => c + 15); };

  /* ── Le player est TOUJOURS sombre (le « tunnel »), quel que soit le thème ── */
  const isTunnel = phase !== "intro";

  /* ── Dérivés fiche & fin ── */
  const kcalEst  = Math.round(duration * 6.5);
  const muscleSummary = Array.from(new Set(exercises.flatMap(e => e.muscles)))
    .slice(0, 3).join(" · ").toUpperCase();
  const repsMatch = cur?.reps.match(/^(\d+)\s*(.*)$/);
  const repsHero  = repsMatch ? repsMatch[1] : (cur?.reps ?? "");
  const repsSub   = repsMatch ? (repsMatch[2] || "répétitions") : "";

  /* ─────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(8,5,16,0.62)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative w-full sm:max-w-md rounded-t-[var(--r-feuille)] sm:rounded-[var(--r-feuille)] flex flex-col overflow-hidden"
        style={{
          background: isTunnel ? "#0B0714" : "rgba(var(--surface-rgb),0.98)",
          backdropFilter: "blur(24px)",
          boxShadow: isTunnel
            ? "0 -4px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)"
            : "0 -4px 60px rgba(var(--accent-rgb),0.12), 0 0 0 1px rgba(var(--surface-rgb),0.9)",
          maxHeight: "94dvh",
        }}
      >
        {/* ══ Barre segmentée « stories » — teal = fait, violet = en cours ══ */}
        {(phase === "exercising" || phase === "resting") && (
          <div className="relative z-[3] px-4 pt-4 flex-shrink-0">
            <div className="flex gap-[5px]">
              {exercises.map((_, e) => {
                const done   = e < exerciseIdx;
                const curSeg = e === exerciseIdx;
                const fill   = curSeg
                  ? Math.min(100, ((setIdx + (phase === "resting" ? 1 : 0)) / (cur?.sets || 1)) * 100)
                  : 0;
                return (
                  <span key={e} className="h-[3.5px] flex-1 rounded-full overflow-hidden"
                    style={{ background: done ? TUN.teal : "rgba(255,255,255,0.14)" }}>
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
              <span className="text-[11px] font-semibold tabular-nums px-2.5 py-1.5 rounded-full"
                style={{ color: TUN.t2, background: "rgba(255,255,255,0.06)", border: `1px solid ${TUN.line}` }}>
                {fmt(elapsed)}
              </span>
              <div className="flex items-center gap-2">
                {/* Raccourci discret vers le coach IA — une question pendant l'effort */}
                <button onClick={() => openAssistant()}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.32)" }}
                  aria-label="Poser une question au coach IA">
                  <AssistantSpark px={15} />
                </button>
                {canPause && (
                  <button onClick={togglePause}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${TUN.line}`, color: TUN.t2 }}
                    aria-label={paused ? "Reprendre" : "Pause"}>
                    {paused ? <Play size={13} strokeWidth={2} /> : <Pause size={13} strokeWidth={2} />}
                  </button>
                )}
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${TUN.line}`, color: TUN.t2 }}
                  aria-label="Fermer">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        )}

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
                    <img src={heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: "50% 28%" }} />
                  ) : (
                    <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }} />
                  )}
                  <div className="absolute inset-0"
                    style={{ background: "var(--voile-affiche)" }} />
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-full"
                      style={{ background: "var(--verre-photo)", backdropFilter: "blur(6px)", border: "1px solid var(--verre-photo-bord)" }}>
                      ≈ {duration} min
                    </span>
                    <button onClick={onClose}
                      className="ml-auto w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-white"
                      style={{ background: "var(--verre-photo)", backdropFilter: "blur(6px)", border: "1px solid var(--verre-photo-bord)" }}
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
                        style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.16)" }}>{exercises.length} exercices</span>
                      <span className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.16)" }}>{totalSets} séries</span>
                      <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-full"
                        style={{ color: "#FFC96B", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(245,177,32,0.35)" }}>~{kcalEst} kcal</span>
                    </div>
                  </div>
                </div>

                {/* Programme — une colonne calme, chaque exo déplie sa démo */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-baseline justify-between mb-1.5 px-1">
                    <p className="text-[11px] font-extrabold tracking-[0.18em]" style={{ color: "var(--text-3)" }}>AU PROGRAMME</p>
                    <p className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>Touche un exo pour la démo</p>
                  </div>
                  <div className="flex flex-col">
                    {exercises.map((ex, i) => {
                      const open = introOpen === i;
                      const setrep = `${ex.sets}×${ex.reps.replace(/\s*reps?/i, "").replace(/\s*sec/i, "s")}`;
                      return (
                        <div key={i}>
                          <button
                            onClick={() => setIntroOpen(open ? null : i)}
                            className="w-full flex items-center gap-3 py-2.5 cursor-pointer text-left"
                            style={{ borderBottom: i < exercises.length - 1 ? "1px solid rgba(var(--accent-rgb),0.1)" : "none" }}
                            aria-expanded={open}
                          >
                            {/* ⚠️ 13 px, PAS 16, ET LA BOITE COMMANDE : `w-4` fait 16 px de large, donc
                                deux chiffres en `font-black` a 16 px n'y entrent pas. Un numero
                                d'ordre n'est de toute facon pas une donnee forte, il se lit en
                                second. Monter une taille sans regarder sa boite, c'est deplacer
                                le defaut. */}
                            <span className="text-[13px] font-black w-4 text-center flex-shrink-0" style={{ color: "rgba(var(--accent-rgb),0.55)" }}>{i + 1}</span>
                            <span className="flex-1 min-w-0">
                              <b className="block text-[16px] font-bold tracking-tight truncate" style={{ color: "var(--text-1)" }}>{ex.name}</b>
                              {/* ⚠️ L'INTERLETTRAGE BAISSE PARCE QUE LA TAILLE MONTE. Il valait
                                  0,1 em pour aérer du 8,5 px ; à 11 px il ajoutait 29 % de largeur
                                  à une ligne déjà `truncate`, donc il aurait tronqué des muscles
                                  au lieu de les rendre lisibles. */}
                              <span className="block text-[11px] font-extrabold tracking-[0.04em] truncate" style={{ color: "var(--text-3)" }}>{ex.muscles.join(" · ").toUpperCase()}</span>
                            </span>
                            <span className="text-[13px] font-extrabold tabular-nums flex-shrink-0" style={{ color: "var(--text-1)" }}>{setrep}</span>
                            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 flex">
                              <ChevronDown size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
                            </motion.span>
                          </button>
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }} className="overflow-hidden"
                              >
                                <div className="pb-3 pt-1 flex flex-col gap-2.5">
                                  {ex.tip && (
                                    <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-body)" }}>{ex.tip}</p>
                                  )}
                                  <ExerciseVideo exerciseName={ex.name} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────── 02 · LE TUNNEL · L'EFFORT ─────────── */}
            {phase === "exercising" && cur && (
              <motion.div key={`ex-${exerciseIdx}-${setIdx}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="relative flex flex-col px-5 pt-4 pb-4"
              >
                {/* Titre + démo dépliable */}
                <div className="relative z-[2]">
                  <p className="text-[11px] font-extrabold tracking-[0.24em]" style={{ color: TUN.lav }}>
                    EXERCICE {exerciseIdx + 1} / {exercises.length}
                  </p>
                  <h2 className="font-black uppercase tracking-tight leading-none mt-2" style={{ fontSize: 26, color: "#fff" }}>{cur.name}</h2>
                  <button onClick={() => setShowInfo(v => !v)}
                    className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-2 rounded-full cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(4px)", color: TUN.t1 }}
                    aria-expanded={showInfo}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#C9B8FF"><path d="M8 5v14l11-7z" /></svg>
                    <span className="text-[11px] font-bold">Démo · ton coach</span>
                    <motion.span animate={{ rotate: showInfo ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex">
                      <ChevronDown size={12} strokeWidth={2.4} style={{ color: TUN.t3 }} />
                    </motion.span>
                  </button>
                  {/* R3 · « Changer » : seulement sur un exercice prescrit, tant
                      qu'une série reste à faire (`peutChanger`). */}
                  {peutChanger(curPrescrit, setIdx) && (
                    <button onClick={() => setChanger({ emplacement: exerciseIdx, serie: setIdx, choisi: null })}
                      className="inline-flex items-center gap-1.5 mt-3.5 ml-2 px-3 py-2 rounded-full cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)", color: TUN.t1 }}>
                      <ArrowLeftRight size={12} strokeWidth={2.4} style={{ color: "#C9B8FF" }} />
                      <span className="text-[11px] font-bold">Changer</span>
                    </button>
                  )}
                  <AnimatePresence initial={false}>
                    {showInfo && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="pt-3"><ExerciseVideo exerciseName={cur.name} /></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Personnage-guide : rejoue le geste en fondu si un sprite existe,
                    sinon halo épuré. Brancher une vague = éditer src/lib/exerciseGuides.ts */}
                <ExerciseGuide name={cur.name} />

                {/* Héros : le chrono (exos minutés) OU les reps */}
                {isTimered ? (
                  <div className="relative z-[2] flex flex-col items-center gap-3 mt-6">
                    {isHiit && (
                      <motion.span key={hiitSub} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="px-5 py-1.5 rounded-full text-[11px] font-bold"
                        style={{
                          background: hiitSub === "work" ? "rgba(245,177,32,0.12)" : "rgba(43,212,160,0.12)",
                          color:      hiitSub === "work" ? TUN.orange : TUN.teal,
                          border: `1px solid ${hiitSub === "work" ? "rgba(245,177,32,0.3)" : "rgba(43,212,160,0.3)"}`,
                        }}>
                        {hiitSub === "work" ? "⚡ Effort" : "Repos"}
                      </motion.span>
                    )}
                    <motion.button onClick={togglePause} whileTap={{ scale: 0.94 }} className="relative w-36 h-36 cursor-pointer" aria-label={paused ? "Reprendre" : "Pause"}>
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={CR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                        <motion.circle cx="50" cy="50" r={CR} fill="none"
                          stroke={isHiit ? (hiitSub === "work" ? TUN.orange : TUN.teal) : TUN.orange}
                          strokeWidth="5" strokeLinecap="round" strokeDasharray={CC}
                          style={{ strokeDashoffset: autoOffset }}
                          animate={{ strokeDashoffset: paused ? undefined : autoOffset }} transition={{ duration: 0.6 }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {paused
                          ? <Play size={30} strokeWidth={1.5} style={{ color: TUN.lav }} />
                          : prep > 0
                            ? <motion.span key={prep} initial={{ scale: 1.6, opacity: 0.3 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="vy-nombre text-[60px]" style={{ fontWeight: 800, color: TUN.orange }}>{prep}</motion.span>
                            : <span className="vy-nombre text-[48px]" style={{ fontWeight: 800, color: "#fff" }}>{autoCountdown}</span>}
                      </div>
                    </motion.button>
                    <p className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: TUN.t2 }}>SÉRIE <b style={{ color: "#fff" }}>{setIdx + 1}</b> / {cur.sets}</p>
                  </div>
                ) : (
                  <div className="relative z-[2] text-center mt-5">
                    <p className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: TUN.t2 }}>SÉRIE <b style={{ color: "#fff" }}>{setIdx + 1}</b> / {cur.sets}</p>
                    {/* R3 · tour 27 : sur une série prescrite, toucher le nombre
                        règle les répétitions réellement faites AVANT « Fait ».
                        La cible prescrite reste affichée et ne change pas. */}
                    {declare && repsCur !== null ? (
                      editReps ? (
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <Compteur valeur={String(repsCur)}
                            onMoins={() => setRepsSaisie({ emplacement: exerciseIdx, serie: setIdx, reps: crancherReps(repsCur, -1) })}
                            onPlus={() => setRepsSaisie({ emplacement: exerciseIdx, serie: setIdx, reps: crancherReps(repsCur, 1) })} />
                          <button type="button" onClick={() => setEditReps(false)}
                            className="ml-1 px-3.5 py-2 rounded-full text-[13px] font-bold cursor-pointer text-white"
                            style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)" }}>
                            OK
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setEditReps(true)} className="inline-flex items-center gap-2 mt-2 cursor-pointer"
                          aria-label="Régler les répétitions faites">
                          <span className="vy-nombre text-[60px] leading-none" style={{ fontWeight: 800, color: "#fff" }}>{repsCur}</span>
                          <Pencil size={15} strokeWidth={2.2} style={{ color: TUN.lav }} />
                        </button>
                      )
                    ) : (
                      <p className="vy-nombre text-[60px] leading-none mt-2" style={{ fontWeight: 800, color: "#fff" }}>{repsHero}</p>
                    )}
                    {declare && repsCur !== null && cibleCur !== null && repsCur !== cibleCur && (
                      <p className="text-[13px] font-medium mt-1" style={{ color: TUN.t3 }}>Cible {cibleCur}</p>
                    )}
                    {/* R3 · la fourchette remplace le mot « répétitions » quand la
                        séance est prescrite ; elle ne demande aucune saisie. */}
                    {(() => {
                      const f = declare ? libelleFourchette(curPrescrit?.prescription?.reps_min, curPrescrit?.prescription?.reps_max) : null;
                      const sous = f ?? repsSub;
                      return sous ? <p className="text-[13px] font-medium mt-1" style={{ color: TUN.t3 }}>{sous}</p> : null;
                    })()}
                    {/* R3 · la charge, sous les répétitions, avec son crayon. Une
                        charge inconnue reste inconnue : rien n'est inventé. */}
                    {reglable && (
                      editCharge ? (
                        <div className="mt-3 flex justify-center">
                          <ReglageCharge
                            valeur={chargeCur}
                            type={typeCharge as TypeChargeReglable}
                            onChange={(v) => setChargeCourante(c => ({ ...c, [exerciseIdx]: v }))}
                            onFin={() => setEditCharge(false)}
                          />
                        </div>
                      ) : (
                        <button onClick={() => setEditCharge(true)}
                          className="inline-flex items-center gap-2 mt-3 px-3.5 py-2 rounded-full cursor-pointer"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: TUN.t1 }}
                          aria-label="Modifier la charge">
                          <span className="vy-nombre text-[16px]" style={{ fontWeight: 700 }}>
                            {chargeCur === null ? "Charge ?" : libelleCharge(chargeCur, typeCharge as TypeChargeReglable)}
                          </span>
                          <Pencil size={13} strokeWidth={2.2} style={{ color: TUN.lav }} />
                        </button>
                      )
                    )}
                    {/* R4 · d'où vient la charge de départ, discrètement. */}
                    {departCur && !editCharge && (
                      <p className="text-[11px] mt-1.5" style={{ color: TUN.t3 }}>
                        {departCur.origine === "acceptee"
                          ? "Objectif accepté"
                          : `La dernière fois · ${new Date(departCur.termineLe ?? "").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}`}
                      </p>
                    )}
                    <div className="flex gap-2.5 justify-center mt-4">
                      {Array.from({ length: cur.sets }).map((_, i) => {
                        const isDone = doneMap[exerciseIdx]?.[i]?.statut === "terminee";
                        const isCur  = i === setIdx;
                        return (
                          <span key={i} className="w-[22px] h-[22px] rounded-full inline-flex items-center justify-center"
                            style={{
                              background: isDone ? "rgba(43,212,160,0.16)" : "transparent",
                              border: isDone ? `1.5px solid ${TUN.teal}` : isCur ? `2px solid ${TUN.violet}` : "1.5px solid rgba(255,255,255,0.16)",
                              boxShadow: isCur ? "0 0 12px rgba(139,92,246,0.5)" : "none",
                            }}>
                            {isDone && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={TUN.teal} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bandeau pause */}
                <AnimatePresence>
                  {paused && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="relative z-[2] flex items-center justify-center gap-2 rounded-2xl py-2.5 mt-4"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
                      {/* La pause est le seul moment de la séance où le Guide
                          n'explique rien et ne pousse à rien : il attend. C'est
                          le vrai emploi de `listen` côté sport. */}
                      {guide
                        ? <VisageGuide guide={guide} etat="listen" size={24} />
                        : <Pause size={12} strokeWidth={2} style={{ color: TUN.lav }} />}
                      <span className="text-[13px] font-semibold" style={{ color: TUN.lav }}>
                        {guide ? voix(guide, "seance.pause") : "En pause"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Conseil du geste, porté par le GUIDE et plus par la marque :
                    une consigne s'adresse à quelqu'un, elle vient donc d'une
                    personne. Le visage est `explain`, l'état exact de ce
                    qu'il fait ici. Le texte, lui, ne change pas d'un Guide à
                    l'autre : c'est une donnée d'exercice, pas une opinion.
                    Sans Guide résolu, l'étincelle reprend sa place.
                    Les séances du planning arrivent avec tip: "" (cf. toExercise
                    dans lib/planning.ts) : sans ce garde-fou, l'étincelle promet
                    « Le geste : » puis ne dit rien. Mieux vaut pas de carte. */}
                {/* R3 · charge inconnue : le Guide dit comment la choisir, À LA
                    PLACE du conseil du geste (une seule phrase, pas une carte de
                    plus). Décision 50. */}
                {reglable && chargeCur === null ? (
                  <div className="relative z-[2] flex gap-3 items-start rounded-2xl px-3.5 py-3.5 mt-5"
                    style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)" }}>
                    <span className="flex-shrink-0 mt-0.5">
                      {guide ? <VisageGuide guide={guide} etat="explain" size={26} /> : <AssistantSpark px={17} />}
                    </span>
                    <p className="text-[13px] leading-relaxed" style={{ color: TUN.t2 }}>
                      {voix(guide, "seance.charge.choisir", { reps: curPrescrit?.prescription?.reps_max ?? cibleCur ?? 12 })}
                    </p>
                  </div>
                ) : cur.tip && (
                  <div className="relative z-[2] flex gap-3 items-start rounded-2xl px-3.5 py-3.5 mt-5"
                    style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)" }}>
                    <span className="flex-shrink-0 mt-0.5">
                      {guide ? <VisageGuide guide={guide} etat="explain" size={26} /> : <AssistantSpark px={17} />}
                    </span>
                    <p className="text-[13px] leading-relaxed" style={{ color: TUN.t2 }}><b style={{ color: TUN.t1 }}>Le geste : </b>{cur.tip}</p>
                  </div>
                )}

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
                      <div className="fixed inset-0 z-[106] flex items-end justify-center" style={{ background: "rgba(8,6,16,0.6)" }}
                        onClick={() => setChanger(null)}>
                        <div className="w-full max-w-md rounded-t-[var(--r-feuille)] p-5 pb-7" onClick={(e) => e.stopPropagation()}
                          style={{ background: "#16122A", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                          <p className="text-[16px] font-extrabold mb-1" style={{ color: "#fff" }}>Remplacer {actuel.nom.toLowerCase()}</p>
                          {setIdx > 0 && (
                            <p className="flex items-center gap-2 text-[13px] mb-3" style={{ color: TUN.t2 }}>
                              <Check size={13} strokeWidth={2.6} style={{ color: TUN.teal }} />
                              {setIdx === 1 ? "Ta série faite reste enregistrée." : `Tes ${setIdx} séries faites restent enregistrées.`}
                            </p>
                          )}
                          {choix.length === 0 ? (
                            <p className="text-[13px] py-4" style={{ color: TUN.t2 }}>Aucun mouvement équivalent ici pour celui-ci.</p>
                          ) : (
                            <div className="flex flex-col gap-2 mt-2 max-h-[50dvh] overflow-y-auto">
                              {choix.map((e) => {
                                const sel = changer.choisi?.cle === e.cle;
                                return (
                                  <button key={e.cle} onClick={() => setChanger({ ...ouvert, choisi: e })}
                                    className="flex items-center gap-3 rounded-2xl p-3 text-left cursor-pointer"
                                    style={{ background: sel ? "rgba(139,92,246,0.16)" : "rgba(255,255,255,0.05)", border: `1px solid ${sel ? "rgba(139,92,246,0.6)" : TUN.line}` }}>
                                    <ExerciseThumb name={e.nom} size={44} />
                                    <span className="min-w-0">
                                      <b className="block text-[16px] font-bold truncate" style={{ color: "#fff" }}>{e.nom}</b>
                                      <span className="block text-[13px]" style={{ color: TUN.t3 }}>
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
              </motion.div>
            )}

            {/* ─────────── 03 · LE TUNNEL · LE REPOS (écran signature orange) ─────────── */}
            {phase === "resting" && (
              <motion.div key="rest"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="relative flex flex-col px-5 pt-2 pb-4"
              >
                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{ top: "6%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,122,26,0.2), transparent 65%)" }} />

                <div className="relative z-[2] flex flex-col items-center mt-6">
                  <motion.button onClick={togglePause} whileTap={{ scale: 0.96 }} className="relative cursor-pointer" style={{ width: 210, height: 210 }} aria-label={paused ? "Reprendre" : "Pause"}>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={CR} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="6" />
                      <motion.circle cx="50" cy="50" r={CR} fill="none" stroke={TUN.ring2} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={CC} style={{ strokeDashoffset: restOffset }} animate={{ strokeDashoffset: restOffset }} transition={{ duration: 0.6 }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                      {paused
                        ? <Play size={34} strokeWidth={1.5} style={{ color: TUN.orange }} />
                        : <>
                            <span className="text-[11px] font-extrabold tracking-[0.3em]" style={{ color: TUN.orange }}>REPOS</span>
                            <span className="vy-nombre text-[48px] leading-none" style={{ fontWeight: 800, color: "#fff" }}>{fmt(Math.max(0, restCountdown))}</span>
                            <span className="text-[11px] font-medium tabular-nums" style={{ color: TUN.t3 }}>
                              {restCountdown <= 0 ? "terminé" : `sur ${fmt(restTotal)}`}
                            </span>
                          </>}
                    </div>
                  </motion.button>
                  <div className="flex gap-2.5 mt-6">
                    <button onClick={add15} className="text-[13px] font-bold px-5 py-2.5 rounded-full cursor-pointer"
                      style={{ color: TUN.t1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}>+ 15 s</button>
                    <button onClick={() => setRestCountdown(0)} className="text-[13px] font-bold px-5 py-2.5 rounded-full cursor-pointer"
                      style={{ color: TUN.t1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}>Passer le repos</button>
                  </div>
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
                      <div className="relative z-[2] mt-6 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${TUN.line}` }}>
                        <p className="text-[13px] font-bold mb-3" style={{ color: "#fff" }}>Série {correction.serie + 1} · {m.exercice?.nom ?? cur?.name}</p>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[13px]" style={{ color: TUN.t2 }}>Répétitions</span>
                          <Compteur
                            valeur={String(correction.reps)}
                            onMoins={() => setCorrection(c => c && { ...c, reps: crancherReps(c.reps, -1) })}
                            onPlus={() => setCorrection(c => c && { ...c, reps: crancherReps(c.reps, 1) })}
                          />
                        </div>
                        {chargeReglable(t) && (
                          <div className="flex items-center justify-between">
                            <span className="text-[13px]" style={{ color: TUN.t2 }}>Charge</span>
                            <ReglageCharge valeur={correction.charge} type={t} onChange={(v) => setCorrection(c => c && { ...c, charge: v })} />
                          </div>
                        )}
                        <div className="flex gap-2.5 mt-4">
                          <button onClick={() => setCorrection(null)} className="flex-1 py-3 rounded-xl text-[13px] font-semibold cursor-pointer"
                            style={{ color: TUN.t2, background: "rgba(255,255,255,0.06)" }}>Annuler</button>
                          <button onClick={enregistrerCorrection} className="flex-[2] py-3 rounded-xl text-[13px] font-bold cursor-pointer text-white"
                            style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)" }}>
                            {restCountdown <= 0 ? "Enregistrer et reprendre" : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="relative z-[2] mt-6 flex items-center justify-between gap-3 px-1">
                      <span className="flex items-center gap-2 text-[13px] font-semibold min-w-0" style={{ color: TUN.t1 }}>
                        <Check size={14} strokeWidth={2.6} style={{ color: TUN.teal, flexShrink: 0 }} />
                        <span className="truncate">{libelleEnregistre(setIdx + 1, m.reps, m.charge ?? null, t)}</span>
                      </span>
                      <button onClick={ouvrirCorrection} className="text-[13px] font-semibold cursor-pointer flex-shrink-0" style={{ color: TUN.lav }}>
                        Corriger
                      </button>
                    </div>
                  );
                })()}

                {/* Ensuite */}
                {(() => {
                  const isLastSet = setIdx === (cur?.sets ?? 1) - 1;
                  const nx  = isLastSet ? exercisesAff[exerciseIdx + 1] : cur;
                  if (!nx) return null;
                  const sub = isLastSet
                    ? `${nx.sets} × ${nx.reps} · ${nx.muscles.join(" · ")}`.toUpperCase()
                    : `SÉRIE ${setIdx + 2} / ${cur?.sets}`;
                  const num = isLastSet ? exerciseIdx + 2 : exerciseIdx + 1;
                  return (
                    <div className="relative z-[2] mt-7">
                      <p className="text-[11px] font-extrabold tracking-[0.2em] mb-2" style={{ color: TUN.t3 }}>ENSUITE</p>
                      <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${TUN.line}` }}>
                        <span className="w-11 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-[16px] font-black"
                          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.18)", color: TUN.lav }}>{num}</span>
                        <div className="min-w-0">
                          <b className="block text-[16px] font-extrabold tracking-tight truncate" style={{ color: "#fff" }}>{nx.name}</b>
                          <span className="block text-[11px] font-extrabold tracking-[0.08em] truncate" style={{ color: TUN.lav }}>{sub}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Le mot du repos. Petit format volontairement : l'écran de
                    repos appartient au chrono et à « ensuite », le Guide s'y
                    invite sans prendre la place. La phrase et le visage sont
                    choisis par le COMPTEUR (cf. `cleRepos`) : sur le dernier
                    exercice il encourage, partout ailleurs il explique. */}
                {/* R4 · après la dernière série d'un repère, la question prend
                    la place de la phrase du Guide, sans toucher au chrono. */}
                {aQuestion.includes(exerciseIdx) && setIdx === (cur?.sets ?? 1) - 1 ? (
                  <div className="relative z-[2] rounded-2xl px-3.5 py-3.5 mt-4"
                    style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)" }}>
                    <QuestionMarge question={voix(guide, "seance.marge.question")} reponse={margeDe(exerciseIdx)} onRepondre={repondreAuRepos}
                      visage={guide ? <VisageGuide guide={guide} etat="listen" size={26} /> : <AssistantSpark px={16} />} />
                  </div>
                ) : (() => {
                  const cle = cleRepos(exerciseIdx, setIdx, cur?.sets ?? 1, exercises.length);
                  const etat = cle === "seance.repos.fin" ? "encourage" : "explain";
                  return (
                    <div className="relative z-[2] flex gap-3 items-center rounded-2xl px-3.5 py-3 mt-4"
                      style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)" }}>
                      <span className="flex-shrink-0">
                        {guide ? <VisageGuide guide={guide} etat={etat} size={26} /> : <AssistantSpark px={16} />}
                      </span>
                      <p className="text-[13px]" style={{ color: TUN.t2 }}>{voix(guide, cle)}</p>
                    </div>
                  );
                })()}
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
                {guide ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="relative"
                  >
                    <CelebrationGuide guide={guide} hauteur="clamp(120px, 20vh, 168px)" />
                    <motion.span
                      initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 240, delay: 0.35 }}
                      className="absolute flex items-center justify-center"
                      style={{ right: -12, bottom: 4, width: 46, height: 46, borderRadius: "50%", border: "2.5px solid rgba(168,85,247,0.9)", background: "rgba(20,15,38,0.88)", boxShadow: "0 0 30px rgba(139,92,246,0.45)" }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D9C6FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </motion.span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 240, delay: 0.05 }}
                    className="flex items-center justify-center"
                    style={{ width: 92, height: 92, borderRadius: "50%", border: "3px solid rgba(168,85,247,0.9)", background: "rgba(139,92,246,0.14)", boxShadow: "0 0 44px rgba(139,92,246,0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
                  >
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#D9C6FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </motion.div>
                )}
                {/* ── R5 · LES QUATRE ÉTAGES (décision 58) ──
                    Lus dans l'ordre, séparés par des filets, jamais quatre
                    cartes : le moment, un fait marquant éventuel, une
                    proposition au plus, puis la série et le rang. Sans
                    comparaison fiable, les étages 2 et 3 disparaissent et
                    l'écran reste calme (écran 09). */}
                <h2 className="mt-3" style={{ fontSize: 26, fontWeight: 850, fontVariationSettings: "var(--w-voix)", lineHeight: 1, color: "#fff" }}>Séance terminée</h2>
                <p className="vy-nombre text-[13px] mt-2" style={{ color: TUN.t2 }}>
                  <b style={{ color: TUN.t1, fontWeight: 700 }}>{Math.max(1, Math.round(elapsed / 60))} min</b>
                  {" · "}
                  <b style={{ color: TUN.t1, fontWeight: 700 }}>{seriesConfirmees(doneMap)}</b> série{seriesConfirmees(doneMap) > 1 ? "s" : ""}
                </p>

                {/* 2 · Le fait marquant : une comparaison précise et vérifiable. */}
                {fait && <LigneFait fait={fait} />}

                {/* 3 · La question facultative d'un repère qui terminait la
                    séance (écran 10), puis « La prochaine fois ». */}
                {aQuestion.filter((e) => sansRepos(e) && !(doneMap[e]?.[(exercises[e]?.sets ?? 1) - 1] as { marge?: Marge | null } | undefined)?.marge).map((e) => (
                  <div key={`q-${e}`} className="w-full mt-3 rounded-2xl p-3.5" style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)" }}>
                    <QuestionMarge titre={exercisesAff[e]?.name} question={voix(guide, "seance.marge.question")} reponse={margesFin[e] ?? null}
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

                {/* 4 · La série et le rang, sur une ligne. Orange : 🔥 = énergie. */}
                {(serieDuJour !== null || rangFin) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    className="flex items-center justify-between w-full mt-3 py-2.5 text-[13px] font-bold"
                    style={{ borderTop: `1px solid ${TUN.line}` }}>
                    <span style={{ color: "#F5B120" }}>
                      {serieDuJour !== null ? `🔥 ${serieDuJour} jour${serieDuJour > 1 ? "s" : ""} · Journée validée` : ""}
                    </span>
                    {rangFin && (
                      <span className="flex items-center gap-1.5" style={{ color: "#C3AEFF" }}>
                        <i aria-hidden="true" className="block" style={{ width: 11, height: 11, borderRadius: 3, transform: "rotate(45deg)", background: `linear-gradient(135deg, ${rangFin.neon[0]}, ${rangFin.neon[1]})` }} />
                        {rangFin.nom}
                      </span>
                    )}
                  </motion.div>
                )}

                {/* Le reste est un geste plus loin. */}
                {exercicesFaits(doneMap) > 0 && (
                  <button type="button" onClick={() => setDetailOuvert(true)}
                    className="flex items-center justify-between w-full py-2.5 text-[13px] cursor-pointer"
                    style={{ borderTop: `1px solid ${TUN.line}`, color: TUN.t2 }}>
                    <b style={{ color: TUN.t1, fontWeight: 650 }}>Voir mes {exercicesFaits(doneMap)} exercice{exercicesFaits(doneMap) > 1 ? "s" : ""}</b>
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
                      onAller={() => { onClose(); router.push("/profil"); }}
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
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${TUN.line}` }}>
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
                  <div className="flex items-center justify-between w-full py-2.5 text-[13px]" style={{ borderTop: `1px solid ${TUN.line}` }}>
                    <button type="button" onClick={() => { onClose(); router.push("/avis"); }} className="font-semibold cursor-pointer" style={{ color: TUN.lav }}>
                      Laisser un avis sur Vaiiya
                    </button>
                    <button type="button" onClick={() => setAvisMasque(true)} className="cursor-pointer" style={{ color: TUN.t3 }}>
                      Plus tard
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ══ CTA bas (le repos s'enchaîne tout seul → pas de barre) ══ */}
        {phase !== "resting" && (
        <div className="px-5 pb-6 pt-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${isTunnel ? "rgba(255,255,255,0.08)" : "rgba(var(--accent-rgb),0.08)"}` }}>
          <AnimatePresence mode="wait">

            {phase === "intro" && (
              <motion.button key="start"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={startWorkout}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-[16px] cursor-pointer text-white"
                style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L4.09 12.11a.6.6 0 0 0 .45 1h5.56l-1.1 8.89L17.91 11.9a.6.6 0 0 0-.45-1h-5.56z" /></svg>
                C&apos;est parti
              </motion.button>
            )}

            {phase === "exercising" && !isTimered && (
              <motion.div key="set-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-1.5">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => completeSet("bouton")}
                  className="w-full py-[18px] rounded-[22px] flex items-center justify-center gap-2 font-extrabold text-[16px] cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
                >
                  {/* R3 · le bouton dit ce qui sera enregistré. */}
                  {declare && repsCur !== null ? libelleFait(repsCur, chargeCur, typeCharge) : "Série terminée ✓"}
                </motion.button>
                {exerciseIdx < exercises.length - 1 && (
                  <button onClick={passerExercice} className="text-[13px] font-semibold py-2 cursor-pointer" style={{ color: TUN.t3 }}>
                    Passer l&apos;exercice
                  </button>
                )}
              </motion.div>
            )}

            {phase === "exercising" && isTimered && (
              <motion.div key="skip-timed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-1.5">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                    /* Abréger n'est pas finir : on note la durée réellement tenue.
                       En HIIT, la marque posée sur l'effort survit au repos qui suit. */
                    const effort = isHiit ? (hiitSub === "work" ? HIIT_WORK - autoCountdown : null) : (cur?.auto ?? 0) - autoCountdown;
                    if (!isHiit || hiitSub === "work") validationRef.current = { validation: "minuteur_abrege", dureeS: effort };
                    setAutoCountdown(0);
                  }}
                  className="w-full py-[18px] rounded-[22px] flex items-center justify-center gap-2 font-extrabold text-[16px] cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
                >
                  {isHiit && hiitSub === "work" ? "Passer l’effort" : "Valider ✓"}
                </motion.button>
                {exerciseIdx < exercises.length - 1 && (
                  <button onClick={passerExercice} className="text-[13px] font-semibold py-2 cursor-pointer" style={{ color: TUN.t3 }}>
                    Passer l&apos;exercice
                  </button>
                )}
              </motion.div>
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
                                  background: "rgba(255,255,255,0.07)",
                                  border: "1px solid rgba(255,255,255,0.14)",
                                }}>
                                <ExerciseThumb name={e.name} size={34} delay={i * 200} />
                              </span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-white leading-tight">Tu la gardes ?</p>
                            <p className="text-[11px] leading-snug mt-1" style={{ color: TUN.t2 }}>
                              Elle rejoint tes séances, tu pourras la relancer ou la modifier.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <motion.button whileTap={{ scale: 0.97 }}
                            onClick={() => { onGarder(); setGarde("gardee"); }}
                            className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[13px] cursor-pointer text-white"
                            style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 22px -6px rgba(193,59,193,0.5)" }}>
                            <Plus size={14} strokeWidth={2.6} /> Garder la séance
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.97 }}
                            onClick={() => setGarde("refusee")}
                            className="px-4 py-2.5 rounded-xl font-semibold text-[13px] cursor-pointer"
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: TUN.t2 }}>
                            Non
                          </motion.button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* R5 · le pied de la maquette : « Continuer » est L'ACTION
                    (violet plein), le partage de l'affiche un lien discret.
                    L'affiche s'est gardée toute seule dans le profil ; elle
                    ne se propose qu'une fois gardée. */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
                  className="w-full py-4 rounded-2xl flex items-center justify-center font-extrabold text-[16px] cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
                >
                  Continuer
                </motion.button>
                {user && afficheSaved && afficheData && (
                  <button type="button" onClick={() => setEnvoyerOuvert(true)}
                    className="text-[13px] font-semibold py-1 cursor-pointer" style={{ color: TUN.t3 }}>
                    Partager l&apos;affiche
                  </button>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        )}
      </motion.div>

      {/* R5 · le détail et l'envoi de l'affiche, au-dessus du tunnel. */}
      <AnimatePresence>
        {detailOuvert && (
          <DetailExercices
            lignes={lignesCourantes}
            margeDe={margeDe}
            estRepere={(e) => prescriptionsR4[e]?.statut === "repere"}
            onMarge={(e, m) => setMargesFin((prev) => ({ ...prev, [e]: m }))}
            onFermer={() => setDetailOuvert(false)}
            visage={guide ? <VisageGuide guide={guide} etat="listen" size={26} /> : <AssistantSpark px={16} />}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {envoyerOuvert && afficheData && user && (
          <EnvoyerAffiche data={afficheData} moi={user.id} accessToken={session?.access_token} onFermer={() => setEnvoyerOuvert(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
