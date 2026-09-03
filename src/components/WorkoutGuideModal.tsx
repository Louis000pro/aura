"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { aiFetch } from "@/lib/aiFetch";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, Share2, Bookmark, BookmarkCheck, ChevronDown, ChevronRight, Check, Plus } from "lucide-react";
import { AssistantSpark, VisageGuide, CelebrationGuide } from "@/components/AssistantMark";
import { voix, type CleVoix } from "@/lib/guides";
import { useGuideActif } from "@/context/GuideContext";
import ExerciseGuide from "@/components/ExerciseGuide";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { createClient } from "@/lib/supabase";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  validerMaillon, CLE_DEVOILE, etatPoster, imageEtat,
  type MaillonFranchi,
} from "@/lib/defi";
import { calculerAura } from "@/lib/aura";
import { noterRang } from "@/lib/celebrationRang";
import { noterBadges } from "@/lib/celebrationBadge";
import { chargerBadgesAura } from "@/lib/badgesAura";
import type { Badge } from "@/lib/badges";
import { useAuth } from "@/context/AuthContext";
import { useAssistant } from "@/context/AssistantContext";
import EnvoyerAffiche from "@/components/communaute/EnvoyerAffiche";
import PerfShareCard from "@/components/PerfShareCard";
import type { PerfShareData } from "@/lib/perfShareExport";
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
          <span className="text-xs font-semibold">Voir la démo sur YouTube</span>
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
  onComplete?: () => void;
  exerciseList?: Exercise[];
  /** Présent = la séance n'existe nulle part (une impro) et peut être gardée.
      La page décide, le tunnel ne fait qu'afficher la proposition. */
  onGarder?: () => void;
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
const HIIT_WORK = 20;
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

/**
 * Résout l'id de session depuis le titre d'un post.
 * Retourne null si aucune séance intégrée ne correspond
 * (séance perso ou titre inconnu).
 */
export function resolveSessionId(title: string): string | null {
  /* ⚠️ CETTE TABLE PORTE DES ALIAS, ET CE N'EST PAS DU DOUBLON. Un titre de
     séance n'est pas qu'un libellé : il est écrit dans `workout_sessions.title`
     au moment où la séance est faite, et c'est par lui que « Refaire » retrouve
     le tunnel des années plus tard. Renommer un titre à l'écran sans garder
     l'ancien ici ferait perdre son animation à tout l'historique déjà écrit.
     Le premier de chaque paire est le titre affiché aujourd'hui, le second
     l'ancien. Précédent : « HIIT Brûle-Graisses », renommé le 2026-07-26. */
  const MAP: Record<string, string> = {
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
  if (MAP[title]) return MAP[title];
  // recherche partielle (ex: "Force Haut du Corps · 42 min" → "force-haut")
  for (const [key, val] of Object.entries(MAP)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return null; // séance perso ou titre inconnu
}

/* ─── Component ──────────────────────────────────────────── */
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
  const avant = etatPoster(maillon.faits - 1, maillon.objectif);
  const apres = etatPoster(maillon.faits, maillon.objectif);
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
        <strong className="block text-[12.5px] font-bold" style={{ color: or }}>
          {maillon.reussi ? "L’affiche est complète" : "Maillon franchi"}
        </strong>
        <small className="block text-[11px]" style={{ color: encre }}>
          {maillon.reussi
            ? `Elle est à vous${maillon.equipier ? ` et à ${maillon.equipier.pseudo}` : ""}.`
            : `L’affiche se dévoile · ${maillon.faits} jour${maillon.faits > 1 ? "s" : ""} sur ${maillon.objectif}`}
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
          : <span className="text-[14px] font-black tabular-nums" style={{ color: "#fff", letterSpacing: "-0.04em" }}>{premier.nombre ?? "\u2726"}</span>}
      </span>

      <span className="flex-1 min-w-0">
        <strong className="block text-[12.5px] font-bold" style={{ color: "#C3AEFF" }}>
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
  sessionId, title, duration, category, heroImage, onClose, onComplete, exerciseList,
  onGarder,
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
  const [doneMap,       setDoneMap]       = useState<Record<number, Record<number, boolean>>>({});
  const [startMs,       setStartMs]       = useState(0);
  const [elapsed,       setElapsed]       = useState(0);
  const [paused,        setPaused]        = useState(false);
  const [showInfo,      setShowInfo]      = useState(false);
  const [introOpen,     setIntroOpen]     = useState<number | null>(null); // exo déplié dans la liste "Au programme"
  const [shareStatus,   setShareStatus]   = useState<"idle" | "saving" | "done" | "error">("idle");
  const [sessionSaved,  setSessionSaved]  = useState(false);
  const [envoiAffiche, setEnvoiAffiche] = useState(false);
  /* La série APRÈS cette séance, lue en base une fois l'enregistrement fait.
     `null` tant qu'on ne la connaît pas : on ne montre jamais un compteur
     provisoire qui se corrigerait sous les yeux. */
  const [serieDuJour, setSerieDuJour] = useState<number | null>(null);
  /* Le maillon du relais, quand cette séance vient d'en franchir un.
     `null` couvre TOUS les cas silencieux : pas de relais, jour déjà pris
     par l'équipier, deux jours de suite, séance trop courte. Aucune bande,
     aucun reproche. */
  const [maillon,       setMaillon]       = useState<MaillonFranchi | null>(null);
  const [garde,         setGarde]         = useState<"idle" | "gardee" | "refusee">("idle");

  const { user, session } = useAuth();

  const pausedAtRef = useRef<number>(0);

  /* ── Masque la barre de navigation du bas tant que la séance guidée est ouverte
        (sinon, sur mobile, elle se superpose au bas de la modale). ── */
  useEffect(() => lockBodyModal(), []);

  /* ── Notify parent + auto-save session when workout is done ── */
  useEffect(() => {
    if (phase !== "done") return;
    onComplete?.();
    // Auto-save to workout_sessions with actual elapsed time + exercises
    if (!user) return;
    const supabase = createClient();
    const resolvedCategory = category ?? (sessionId.includes("-") ? sessionId.split("-")[0] : null) ?? "force";
    supabase.from("workout_sessions").insert({
      user_id:          user.id,
      title,
      category:         resolvedCategory,
      duration_minutes: Math.round(elapsed / 60) || 1,
      calories_burned:  Math.round((elapsed / 60) * 6.5),
      elapsed_seconds:  elapsed,
      exercises:        exercises,
      started_at:       new Date().toISOString(),
    }).select("id").single().then(({ data, error }) => {
      if (error) return;
      setSessionSaved(true);
      // Le maillon du jour, si un relais est en cours. Volontairement
      // silencieux : pas de défi, séance trop courte ou jour déjà
      // franchi par l'équipier → il ne se passe rien, et on ne
      // reproche rien à personne.
      if (data?.id) {
        void validerMaillon(user.id, String(data.id)).then((r) => {
          if (!r) return;
          // Le drapeau reste : si on quitte sans toucher la bande, la
          // grande affiche rejouera la bascule à la première ouverture.
          sessionStorage.setItem(CLE_DEVOILE, "1");
          setMaillon(r);
        });
      }
      // La séance qui fait passer un rang doit se fêter ICI, pas à la prochaine
      // ouverture de l'accueil. Silencieux si le rang n'a pas bougé.
      /* La séance vient de valider la journée : c'est le bon moment pour
         montrer la série, pas la prochaine ouverture de l'accueil. Même
         lecture pour le passage de rang, silencieux si rien n'a bougé. */
      void calculerAura(supabase, user.id)
        .then((etat) => {
          if (!etat) return;
          noterRang(user.id, etat.rang);
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
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ── Garder l'affiche dans son profil ──
     ⚠️ CE BOUTON NE PARTAGE RIEN, ET NE L'A JAMAIS FAIT. Il écrivait
     `audience: "friends"`, alors que la policy de `posts` est
     `audience = 'public' OR auth.uid() = user_id` : le mot « friends »
     ne donnait accès à personne, la rangée « Ses affiches de perf » d'un
     profil public était vide par construction, et l'app annonçait quand
     même « visible par tes amis ».

     Le mot devient donc `private`, qui décrit ce qui se passe vraiment :
     l'affiche entre dans TA galerie. Envoyer l'affiche à quelqu'un est
     une autre intention, et c'est le second bouton. */
  const shareAsPost = useCallback(async () => {
    if (!user) return;
    setShareStatus("saving");
    const resolvedCategory = category ?? (sessionId.includes("-") ? sessionId.split("-")[0] : null) ?? "force";
    const supabase = createClient();
    const elapsedMin = Math.round(elapsed / 60) || 1;
    const { error } = await supabase.from("posts").insert({
      user_id:  user.id,
      type:     "workout",
      caption:  "",
      audience: "private",
      performance_data: {
        type:      "workout",
        title,
        date:      new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
        metrics:   [
          { label: "Durée",     value: String(elapsedMin),           unit: "min" },
          { label: "Exercices", value: String(exercises.length),     unit: ""    },
          { label: "Séries",    value: String(exercises.reduce((a, e) => a + e.sets, 0)), unit: "" },
          { label: "Calories",  value: String(Math.round(elapsedMin * 6.5)), unit: "kcal" },
        ],
        exercise_list: exercises,
        category: resolvedCategory,
      },
    });
    setShareStatus(error ? "error" : "done");
  }, [user, category, sessionId, title, elapsed, exercises]);

  const cur      = exercises[exerciseIdx];
  const isHiit   = !!cur?.hiit;
  const isTimered = !!(cur?.auto || cur?.hiit);
  const totalSets = exercises.reduce((a, e) => a + e.sets, 0);

  /* ── Données du poster de perf « aura » (aperçu + export) ── */
  const elapsedMinCard = Math.round(elapsed / 60) || 1;
  const perfShareData: PerfShareData = {
    brand: "✦ VAIIYA",
    date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
    category: title,
    hero: { value: String(elapsedMinCard), unit: "min" },
    subs: [
      { v: String(exercises.length), l: "exos" },
      { v: String(totalSets), l: "séries" },
      { v: String(Math.round(elapsedMinCard * 6.5)), l: "kcal" },
    ],
    user: "",
    bg: "/perf/aura.jpg",
  };

  /* ── Elapsed clock ── */
  useEffect(() => {
    if (phase === "intro" || phase === "done" || startMs === 0 || paused) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startMs, paused]);

  /* ── Skip the entire current exercise ── */
  const skipExercise = useCallback(() => {
    const nextEx = exerciseIdx + 1;
    setShowInfo(false);
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
  const completeSet = useCallback(() => {
    setDoneMap(prev => ({
      ...prev,
      [exerciseIdx]: { ...(prev[exerciseIdx] ?? {}), [setIdx]: true },
    }));
    const ex         = exercises[exerciseIdx];
    const dernierSet = setIdx + 1 >= (ex?.sets ?? 1);
    const resteUnExo = exerciseIdx + 1 < exercises.length;
    if (dernierSet && !resteUnExo) { advance(); return; }
    const attente = dernierSet
      ? ((ex?.restAfter ?? 0) > 0 ? (ex?.restAfter as number) : (ex?.rest ?? 0))
      : (ex?.rest ?? 0);
    if (attente > 0) {
      setRestMode(dernierSet ? "exercise" : "set");
      setRestTotal(attente); setRestCountdown(attente); setPhase("resting");
    } else advance();
  }, [exercises, exerciseIdx, setIdx, advance]);

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
    if (phase !== "resting" || paused) return;
    if (restCountdown <= 0) {
      vibrer([70, 50, 70]); // fin de récup
      if (restMode === "exercise") { setRestMode("set"); skipExercise(); }
      else advance();
      return;
    }
    const t = setTimeout(() => setRestCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restCountdown, paused, restMode]);

  /* ── Décompte 3-2-1 avant chaque effort chronométré ── */
  useEffect(() => {
    if (phase !== "exercising" || paused || prep <= 0) return;
    const t = setTimeout(() => setPrep(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prep, paused]);

  /* ── Auto / HIIT countdown ── */
  useEffect(() => {
    if (phase !== "exercising" || paused) return;
    if (prep > 0) return; // on attend la fin du 3-2-1
    if (!cur?.auto && !cur?.hiit) return;
    if (autoCountdown <= 0) {
      vibrer(90); // fin d'effort chronométré (ou fin d'un segment HIIT)
      if (cur.hiit && hiitSub === "work") { setHiitSub("rest"); setAutoCountdown(HIIT_REST); return; }
      completeSet(); return;
    }
    const t = setTimeout(() => setAutoCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, autoCountdown, hiitSub, cur, paused, prep]);

  /* ── Start ── */
  const startWorkout = () => {
    setStartMs(Date.now());
    setExerciseIdx(0); setSetIdx(0); setDoneMap({}); setPaused(false); setShowInfo(false);
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
  const TUN = {
    t1: "#F0ECFA", t2: "#A79FC0", t3: "#6E6690", lav: "#C9B8FF",
    line: "rgba(255,255,255,0.08)",
    violet: "#8B5CF6", orange: "#F5B120", ring2: "#FF7A1A", teal: "#2BD4A0",
  };

  /* ── Dérivés fiche & fin ── */
  const kcalEst  = Math.round(duration * 6.5);
  const kcalReal = Math.round((elapsed / 60) * 6.5);
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
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
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
              <span className="text-[11.5px] font-semibold tabular-nums px-2.5 py-1.5 rounded-full"
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
                      style={{ fontSize: 27, textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}>{title}</h2>
                    {muscleSummary && (
                      <p className="text-[10px] font-extrabold tracking-[0.14em] mt-1.5" style={{ color: "#C9B8FF" }}>{muscleSummary}</p>
                    )}
                    <div className="flex gap-1.5 mt-3">
                      <span className="text-[10.5px] font-bold text-white px-2.5 py-1.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.16)" }}>{exercises.length} exercices</span>
                      <span className="text-[10.5px] font-bold text-white px-2.5 py-1.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.16)" }}>{totalSets} séries</span>
                      <span className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-full"
                        style={{ color: "#FFC96B", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(4px)", border: "1px solid rgba(245,177,32,0.35)" }}>~{kcalEst} kcal</span>
                    </div>
                  </div>
                </div>

                {/* Programme — une colonne calme, chaque exo déplie sa démo */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-baseline justify-between mb-1.5 px-1">
                    <p className="text-[10px] font-extrabold tracking-[0.18em]" style={{ color: "var(--text-3)" }}>AU PROGRAMME</p>
                    <p className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>Touche un exo pour la démo</p>
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
                            <span className="text-[15px] font-black w-4 text-center flex-shrink-0" style={{ color: "rgba(var(--accent-rgb),0.55)" }}>{i + 1}</span>
                            <span className="flex-1 min-w-0">
                              <b className="block text-[13.5px] font-bold tracking-tight truncate" style={{ color: "var(--text-1)" }}>{ex.name}</b>
                              <span className="block text-[8.5px] font-extrabold tracking-[0.1em] truncate" style={{ color: "var(--text-3)" }}>{ex.muscles.join(" · ").toUpperCase()}</span>
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
                                    <p className="text-[12.5px] font-light leading-relaxed" style={{ color: "var(--text-body)" }}>{ex.tip}</p>
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
                  <p className="text-[10px] font-extrabold tracking-[0.24em]" style={{ color: TUN.lav }}>
                    EXERCICE {exerciseIdx + 1} / {exercises.length}
                  </p>
                  <h2 className="font-black uppercase tracking-tight leading-none mt-2" style={{ fontSize: 30, color: "#fff" }}>{cur.name}</h2>
                  <button onClick={() => setShowInfo(v => !v)}
                    className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-2 rounded-full cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(4px)", color: TUN.t1 }}
                    aria-expanded={showInfo}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#C9B8FF"><path d="M8 5v14l11-7z" /></svg>
                    <span className="text-[11.5px] font-bold">Démo · ton coach</span>
                    <motion.span animate={{ rotate: showInfo ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex">
                      <ChevronDown size={12} strokeWidth={2.4} style={{ color: TUN.t3 }} />
                    </motion.span>
                  </button>
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
                            ? <motion.span key={prep} initial={{ scale: 1.6, opacity: 0.3 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="text-6xl font-black tabular-nums" style={{ color: TUN.orange, fontFamily: "var(--chiffre)", fontVariationSettings: "var(--w-nombre)", letterSpacing: "-0.045em" }}>{prep}</motion.span>
                            : <span className="text-5xl font-black tabular-nums" style={{ color: "#fff", fontFamily: "var(--chiffre)", fontVariationSettings: "var(--w-nombre)", letterSpacing: "-0.045em" }}>{autoCountdown}</span>}
                      </div>
                    </motion.button>
                    <p className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: TUN.t2 }}>SÉRIE <b style={{ color: "#fff" }}>{setIdx + 1}</b> / {cur.sets}</p>
                  </div>
                ) : (
                  <div className="relative z-[2] text-center mt-5">
                    <p className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: TUN.t2 }}>SÉRIE <b style={{ color: "#fff" }}>{setIdx + 1}</b> / {cur.sets}</p>
                    <p className="font-black tabular-nums leading-none mt-2" style={{ fontSize: 60, color: "#fff", fontFamily: "var(--chiffre)", fontVariationSettings: "var(--w-nombre)", letterSpacing: "-0.045em" }}>{repsHero}</p>
                    {repsSub && <p className="text-[12px] font-medium mt-1" style={{ color: TUN.t3 }}>{repsSub}</p>}
                    <div className="flex gap-2.5 justify-center mt-4">
                      {Array.from({ length: cur.sets }).map((_, i) => {
                        const isDone = doneMap[exerciseIdx]?.[i];
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
                      <span className="text-xs font-semibold" style={{ color: TUN.lav }}>
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
                {cur.tip && (
                  <div className="relative z-[2] flex gap-3 items-start rounded-2xl px-3.5 py-3.5 mt-5"
                    style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)" }}>
                    <span className="flex-shrink-0 mt-0.5">
                      {guide ? <VisageGuide guide={guide} etat="explain" size={26} /> : <AssistantSpark px={17} />}
                    </span>
                    <p className="text-[12px] leading-relaxed" style={{ color: TUN.t2 }}><b style={{ color: TUN.t1 }}>Le geste : </b>{cur.tip}</p>
                  </div>
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
                            <span className="text-[10px] font-extrabold tracking-[0.3em]" style={{ color: TUN.orange }}>REPOS</span>
                            <span className="font-black tabular-nums leading-none" style={{ fontSize: 52, color: "#fff", fontFamily: "var(--chiffre)", fontVariationSettings: "var(--w-nombre)", letterSpacing: "-0.045em" }}>{fmt(restCountdown)}</span>
                            <span className="text-[11px] font-medium tabular-nums" style={{ color: TUN.t3 }}>sur {fmt(restTotal)}</span>
                          </>}
                    </div>
                  </motion.button>
                  <div className="flex gap-2.5 mt-6">
                    <button onClick={add15} className="text-[12.5px] font-bold px-5 py-2.5 rounded-full cursor-pointer"
                      style={{ color: TUN.t1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}>+ 15 s</button>
                    <button onClick={() => setRestCountdown(0)} className="text-[12.5px] font-bold px-5 py-2.5 rounded-full cursor-pointer"
                      style={{ color: TUN.t1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}>Passer le repos</button>
                  </div>
                </div>

                {/* Ensuite */}
                {(() => {
                  const isLastSet = setIdx === (cur?.sets ?? 1) - 1;
                  const nx  = isLastSet ? exercises[exerciseIdx + 1] : cur;
                  if (!nx) return null;
                  const sub = isLastSet
                    ? `${nx.sets} × ${nx.reps} · ${nx.muscles.join(" · ")}`.toUpperCase()
                    : `SÉRIE ${setIdx + 2} / ${cur?.sets}`;
                  const num = isLastSet ? exerciseIdx + 2 : exerciseIdx + 1;
                  return (
                    <div className="relative z-[2] mt-7">
                      <p className="text-[10px] font-extrabold tracking-[0.2em] mb-2" style={{ color: TUN.t3 }}>ENSUITE</p>
                      <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${TUN.line}` }}>
                        <span className="w-11 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-[15px] font-black"
                          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.18)", color: TUN.lav }}>{num}</span>
                        <div className="min-w-0">
                          <b className="block text-sm font-extrabold tracking-tight truncate" style={{ color: "#fff" }}>{nx.name}</b>
                          <span className="block text-[9.5px] font-extrabold tracking-[0.08em] truncate" style={{ color: TUN.lav }}>{sub}</span>
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
                {(() => {
                  const cle = cleRepos(exerciseIdx, setIdx, cur?.sets ?? 1, exercises.length);
                  const etat = cle === "seance.repos.fin" ? "encourage" : "explain";
                  return (
                    <div className="relative z-[2] flex gap-3 items-center rounded-2xl px-3.5 py-3 mt-4"
                      style={{ background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)" }}>
                      <span className="flex-shrink-0">
                        {guide ? <VisageGuide guide={guide} etat={etat} size={26} /> : <AssistantSpark px={16} />}
                      </span>
                      <p className="text-[12px]" style={{ color: TUN.t2 }}>{voix(guide, cle)}</p>
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
                      style={{ right: -12, bottom: 4, width: 46, height: 46, borderRadius: "50%", border: `2.5px solid ${TUN.teal}`, background: "rgba(10,10,14,0.86)", boxShadow: "0 0 30px rgba(43,212,160,0.4)" }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TUN.teal} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </motion.span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 240, delay: 0.05 }}
                    className="flex items-center justify-center"
                    style={{ width: 92, height: 92, borderRadius: "50%", border: `3px solid ${TUN.teal}`, background: "rgba(43,212,160,0.1)", boxShadow: "0 0 44px rgba(43,212,160,0.35)" }}
                  >
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={TUN.teal} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </motion.div>
                )}
                <h2 className="font-black uppercase tracking-tight mt-4" style={{ fontSize: 24, color: "#fff" }}>Séance terminée</h2>
                <p className="text-[12.5px] mt-1.5" style={{ color: TUN.t2 }}>{guide ? title : `${title} · rien lâché`}</p>
                {guide && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="text-[13px] font-semibold leading-snug mt-2.5 max-w-[19rem]"
                    style={{ color: TUN.lav }}
                  >
                    {voix(guide, "seance.fin")}
                  </motion.p>
                )}

                {/* ── LA SÉRIE, AU MOMENT OÙ ELLE SE GAGNE ──
                    C'est ici qu'elle veut dire quelque chose : la journée
                    vient d'être validée par cette séance. Deux lignes, pas
                    un tableau (règle produit : la série se lit, elle ne se
                    calcule pas). Orange, parce que chez nous 🔥 = énergie. */}
                <AnimatePresence>
                  {serieDuJour !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl mt-4"
                      style={{ background: "rgba(245,177,32,0.10)", border: "1px solid rgba(245,177,32,0.28)" }}
                    >
                      <span style={{ fontSize: 17 }} aria-hidden="true">🔥</span>
                      <span className="text-left">
                        <strong className="block text-[12.5px] font-bold" style={{ color: "#FFD34E" }}>
                          Journée validée
                        </strong>
                        <small className="block text-[11px]" style={{ color: TUN.t2 }}>
                          Série de {serieDuJour} jour{serieDuJour > 1 ? "s" : ""}
                        </small>
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

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

                <div className="grid grid-cols-2 gap-2.5 w-full mt-6">
                  {[
                    { l: "DURÉE RÉELLE", v: fmt(elapsed),                c: "#fff",      s: "" },
                    { l: "SÉRIES",       v: String(totalSets),           c: TUN.teal,    s: ` / ${totalSets}` },
                    { l: "CALORIES",     v: `~${kcalReal || kcalEst}`,   c: TUN.orange,  s: " kcal" },
                    { l: "EXERCICES",    v: String(exercises.length),    c: TUN.teal,    s: "" },
                  ].map(st => (
                    <div key={st.l} className="rounded-2xl px-3.5 py-3.5 text-left" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${TUN.line}` }}>
                      <p className="text-[9px] font-extrabold tracking-[0.18em]" style={{ color: TUN.t3 }}>{st.l}</p>
                      <p className="font-black tabular-nums mt-1" style={{ fontSize: 21, color: st.c, fontFamily: "var(--chiffre)", fontVariationSettings: "var(--w-nombre)", letterSpacing: "-0.045em" }}>
                        {st.v}<small className="text-[11px] font-bold" style={{ color: TUN.t3, letterSpacing: 0 }}>{st.s}</small>
                      </p>
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {sessionSaved && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl mt-3"
                      style={{ background: "rgba(43,212,160,0.09)", border: "1px solid rgba(43,212,160,0.22)" }}>
                      <BookmarkCheck size={12} strokeWidth={2} style={{ color: TUN.teal }} />
                      <span className="text-[11px] font-medium" style={{ color: TUN.teal }}>Enregistrée dans ton profil</span>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-[15px] cursor-pointer text-white"
                style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L4.09 12.11a.6.6 0 0 0 .45 1h5.56l-1.1 8.89L17.91 11.9a.6.6 0 0 0-.45-1h-5.56z" /></svg>
                C&apos;est parti
              </motion.button>
            )}

            {phase === "exercising" && !isTimered && (
              <motion.div key="set-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-1.5">
                <motion.button whileTap={{ scale: 0.97 }} onClick={completeSet}
                  className="w-full py-[18px] rounded-[22px] flex items-center justify-center gap-2 font-extrabold text-base cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
                >
                  Série terminée ✓
                </motion.button>
                {exerciseIdx < exercises.length - 1 && (
                  <button onClick={skipExercise} className="text-[12.5px] font-semibold py-2 cursor-pointer" style={{ color: TUN.t3 }}>
                    Passer l&apos;exercice
                  </button>
                )}
              </motion.div>
            )}

            {phase === "exercising" && isTimered && (
              <motion.div key="skip-timed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-1.5">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAutoCountdown(0)}
                  className="w-full py-[18px] rounded-[22px] flex items-center justify-center gap-2 font-extrabold text-base cursor-pointer text-white"
                  style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}
                >
                  {isHiit && hiitSub === "work" ? "Passer l’effort" : "Valider ✓"}
                </motion.button>
                {exerciseIdx < exercises.length - 1 && (
                  <button onClick={skipExercise} className="text-[12.5px] font-semibold py-2 cursor-pointer" style={{ color: TUN.t3 }}>
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
                        <span className="text-[12.5px] font-semibold" style={{ color: TUN.teal }}>
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
                            <p className="text-[10.5px] leading-snug mt-1" style={{ color: TUN.t2 }}>
                              Elle rejoint tes séances, tu pourras la relancer ou la modifier.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <motion.button whileTap={{ scale: 0.97 }}
                            onClick={() => { onGarder(); setGarde("gardee"); }}
                            className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12.5px] cursor-pointer text-white"
                            style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 22px -6px rgba(193,59,193,0.5)" }}>
                            <Plus size={14} strokeWidth={2.6} /> Garder la séance
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.97 }}
                            onClick={() => setGarde("refusee")}
                            className="px-4 py-2.5 rounded-xl font-semibold text-[12.5px] cursor-pointer"
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: TUN.t2 }}>
                            Non
                          </motion.button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                <div className="flex justify-center mb-1">
                  <PerfShareCard data={perfShareData} width="min(200px, 56%)" />
                </div>
                {user && shareStatus !== "done" && (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={shareAsPost} disabled={shareStatus === "saving"}
                    className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm cursor-pointer text-white"
                    style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)", boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)", opacity: shareStatus === "saving" ? 0.7 : 1 }}
                  >
                    {shareStatus === "saving"
                      ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block" }}>⏳</motion.span> Publication…</>
                      : <><Bookmark size={15} strokeWidth={2} /> Garder cette affiche</>
                    }
                  </motion.button>
                )}
                {/* ⚠️ « Partager ma carte » n'avait qu'une sortie, le partage
                    natif du téléphone. La feuille en propose deux : une de tes
                    discussions, ou le dehors. Le mot dit enfin la vérité. */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEnvoiAffiche(true)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm cursor-pointer"
                  style={{ background: "rgba(139,92,246,0.12)", color: TUN.lav, border: "1px solid rgba(139,92,246,0.4)" }}
                >
                  <Share2 size={15} strokeWidth={2} /> Envoyer à quelqu&apos;un
                </motion.button>
                {shareStatus === "done" && (
                  <div className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                    style={{ background: "rgba(43,212,160,0.1)", color: TUN.teal, border: "1px solid rgba(43,212,160,0.25)" }}
                  >
                    ✓ Affiche gardée dans ton profil
                  </div>
                )}
                {shareStatus === "error" && (
                  <button onClick={() => setShareStatus("idle")} className="text-xs cursor-pointer py-2" style={{ color: "#F87171" }}>
                    Erreur, réessayer
                  </button>
                )}
                <button onClick={onClose}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center font-bold text-sm cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.06)", color: TUN.t1, border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  Terminer
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        )}

        {/* La feuille d'envoi. Elle vit au-dessus du tunnel (z-[90]/[91]
            posés par `Sheet`), et elle n'existe que si on a un compte :
            envoyer suppose un fil, et un fil suppose quelqu'un. */}
        <AnimatePresence>
          {envoiAffiche && user && (
            <EnvoyerAffiche
              data={perfShareData}
              moi={user.id}
              accessToken={session?.access_token}
              onFermer={() => setEnvoiAffiche(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
