"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle, Clock, Zap, Trophy, SkipForward,
  Pause, Play, HelpCircle, ArrowLeft, Share2, BookmarkCheck, ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Référence humaine : vidéo YouTube de démo par exercice ── */
function ExerciseVideo({ exerciseName }: { exerciseName: string }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading"); setVideoId(null);
    fetch(`/api/exercise-video?q=${encodeURIComponent(exerciseName)}`)
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
      style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(167,139,250,0.12)" }}>
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md" style={{ background: "#FF0000" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
        </span>
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A78BFA" }}>Référence humaine</p>
      </div>
      {state === "loading" && (
        <div className="aspect-video w-full flex items-center justify-center" style={{ background: "rgba(167,139,250,0.06)" }}>
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(167,139,250,0.25)", borderTopColor: "#A78BFA" }} />
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
          style={{ background: "rgba(167,139,250,0.06)", color: "#A78BFA" }}>
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
  onClose: () => void;
  onComplete?: () => void;
  exerciseList?: Exercise[];
}

type GuidePhase = "intro" | "exercising" | "resting" | "done";
type HiitSub    = "work" | "rest";

/* ─── Constants ──────────────────────────────────────────── */
const HIIT_WORK = 20;
const HIIT_REST = 10;
const CR        = 46;
const CC        = 2 * Math.PI * CR;

/* ─── Exercise data ──────────────────────────────────────── */
const exerciseData: Record<string, Exercise[]> = {
  "demo-avatars": [
    // ─── Bas du corps ────────────────────────────────────────
    { name: "Air Squat",         sets: 2, reps: "12 reps", rest: 30,
      tip: "Pieds largeur d'épaules, descends comme pour t'asseoir. Talons au sol.",
      benefit: "Squat sans matériel — base du bas du corps.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Back Squat",        sets: 2, reps: "10 reps", rest: 30,
      tip: "Barre sur les trapèzes, gainé. Descends sous parallèle.",
      benefit: "Le roi des exercices — force du bas du corps.",
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
      tip: "Bras au-dessus + pieds qui s'écartent simultanément.",
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
      tip: "Bras tendus, lève les haltères devant à hauteur d'épaules.",
      benefit: "Faisceau antérieur du deltoïde.",
      muscles: ["Épaules"] },
    { name: "Kettlebell Swing",  sets: 2, reps: "15 reps", rest: 30,
      tip: "Hanches en arrière, propulsion explosive vers l'avant.",
      benefit: "Chaîne postérieure explosive.",
      muscles: ["Fessiers", "Dos", "Core"] },

    // ─── Olympic lifts ───────────────────────────────────────
    { name: "Clean And Jerk",    sets: 2, reps: "5 reps",  rest: 45,
      tip: "Épaulé-jeté : barre du sol aux épaules, puis jet au-dessus de la tête.",
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
      benefit: "Développe la masse et la force du grand pectoral. C'est l'exercice roi pour élargir la cage thoracique et renforcer toute la puissance de poussée des membres supérieurs.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Tractions larges pronation", sets: 4, reps: "Max reps", rest: 90,
      tip: "Bras complètement tendus en bas. Imagine que tu plies la barre autour de ta tête. Monte jusqu'au menton.",
      benefit: "Développe les grands dorsaux et crée le fameux dos en V. Améliore la posture en contrant les épaules arrondies du quotidien et renforce la force de traction globale.",
      muscles: ["Dos", "Biceps"] },
    { name: "Développé militaire haltères", sets: 3, reps: "10 reps", rest: 75,
      tip: "Gainé, sans arquer le dos. Pousse verticalement, haltères qui se rejoignent presque en haut. Tempo 2-0-2.",
      benefit: "Renforce les trois faisceaux du deltoïde et stabilise l'articulation de l'épaule. Améliore la force fonctionnelle pour tous les mouvements au-dessus de la tête.",
      muscles: ["Épaules", "Triceps"] },
    { name: "Rowing barre buste penché", sets: 3, reps: "12 reps", rest: 75,
      tip: "Dos plat à 45°. Tire la barre vers le nombril, coudes proches du corps. Contracte les omoplates 1 seconde en haut.",
      benefit: "Épaissit le dos en ciblant les rhomboïdes, trapèzes et grand dorsal. Essentiel pour l'équilibre musculaire push/pull et la prévention des blessures d'épaules.",
      muscles: ["Dos", "Biceps"] },
    { name: "Élévations latérales", sets: 3, reps: "15 reps", rest: 60,
      tip: "Légère flexion du coude. Monte jusqu'à l'horizontale, pas plus. Descends en 3 secondes.",
      benefit: "Isole le deltoïde médian pour élargir les épaules et créer l'illusion de la taille. Protège aussi l'articulation de l'épaule lors des mouvements de poussée lourds.",
      muscles: ["Épaules"] },
    { name: "Curl barre", sets: 3, reps: "12 reps", rest: 60,
      tip: "Coudes fixes contre le buste. Contracte fort en haut 1 seconde. Descends lentement en 3 secondes.",
      benefit: "Développe le biceps brachial en masse et en définition. Améliore la force de traction et contribue à l'esthétique des bras.",
      muscles: ["Biceps"] },
  ],

  "fullbody-deb": [
    { name: "Squats", sets: 3, reps: "15 reps", rest: 60,
      tip: "Pieds à largeur d'épaules, orteils légèrement vers l'extérieur. Descends comme pour t'asseoir sur une chaise. Talons au sol, dos droit.",
      benefit: "Le roi des exercices. Développe l'intégralité du bas du corps et stimule la sécrétion naturelle d'hormones anaboliques. Améliore la mobilité des hanches et la force fonctionnelle au quotidien.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Pompes", sets: 3, reps: "10 reps", rest: 60,
      tip: "Corps droit de la tête aux talons, coudes à 45°. Descends la poitrine à 2 cm du sol. Genoux au sol si trop difficile.",
      benefit: "Exercice polyarticulaire complet qui développe la force fonctionnelle du haut du corps et renforce la ceinture scapulaire. Praticable partout, à vie.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Fentes avant", sets: 3, reps: "12 par jambe", rest: 60,
      tip: "Grand pas, genou arrière à 2 cm du sol. Cuisse avant parallèle au sol. Pousse sur le talon avant pour revenir.",
      benefit: "Développe chaque jambe indépendamment, corrigeant les déséquilibres gauche/droite. Améliore l'équilibre, la coordination et la mobilité des hanches.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Hip Thrust au sol", sets: 3, reps: "15 reps", rest: 45,
      tip: "Allongé, pieds à plat. Monte le bassin en contractant fort les fessiers. Maintiens 1 seconde en haut.",
      benefit: "Activation maximale du grand fessier. Améliore la puissance athlétique (sprint, saut), corrige la posture et réduit les douleurs lombaires en renforçant la chaîne postérieure.",
      muscles: ["Fessiers"] },
    { name: "Planche frontale", sets: 3, reps: "30 sec", rest: 45, auto: 30,
      tip: "Avant-bras au sol, corps en ligne parfaite. Rentre le nombril, serre les fessiers. Si tu trembles, c'est bon signe — tiens bon !",
      benefit: "Renforce l'ensemble du core profond (transverse de l'abdomen). Améliore la posture, protège le bas du dos et stabilise la colonne pour tous les mouvements sportifs.",
      muscles: ["Core"] },
    { name: "Crunch", sets: 3, reps: "20 reps", rest: 45,
      tip: "Mains à peine derrière les tempes, sans tirer sur la nuque. Expire en montant. Soulève les épaules, pas le bas du dos.",
      benefit: "Cible les abdominaux droits pour améliorer la stabilité lombaire. Combiné au gainage, il contribue à une ceinture abdominale fonctionnelle et solide.",
      muscles: ["Abdominaux"] },
    { name: "Superman", sets: 3, reps: "12 reps", rest: 45,
      tip: "Ventre au sol, bras tendus devant. Décolle bras ET jambes simultanément. Maintiens 2 secondes.",
      benefit: "Renforce les érecteurs spinaux et les muscles profonds du dos. Indispensable pour prévenir et réduire les douleurs lombaires — compense la vie sédentaire.",
      muscles: ["Dos", "Lombaires"] },
  ],

  "hiit": [
    { name: "Burpees", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Plonge au sol, pompe, saute — tout en fluidité. Qualité > vitesse. Atterris pieds fléchis.",
      benefit: "Exercice complet par excellence. Combine force et cardio pour brûler un maximum de calories. Développe l'explosivité, la coordination et sollicite chaque groupe musculaire.",
      muscles: ["Corps entier"] },
    { name: "Jumping Jacks", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Bras au-dessus de la tête et pieds qui s'écartent en même temps. Rythme régulier, coordination parfaite.",
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
      tip: "Cours sur place en montant les genoux au niveau des hanches. Bras qui pompent. Reste sur l'avant du pied.",
      benefit: "Élève rapidement la FC en zone haute. Renforce les fléchisseurs de hanches et améliore la fréquence de foulée — bénéfique pour tous les sports de course.",
      muscles: ["Cardio", "Abdominaux"] },
    { name: "Pompes explosives", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Descends lentement, pousse en explosif jusqu'à décoller les mains. Si trop difficile : pompes normales rapides.",
      benefit: "Développe la puissance du haut du corps tout en maintenant une FC élevée. Améliore la force rapide des pectoraux et triceps pour les sports de contact.",
      muscles: ["Pectoraux", "Triceps"] },
    { name: "Skaters", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Sauts latéraux en imitant un patineur. Touche le sol de la main opposée au pied d'appui. Amplitude maximale.",
      benefit: "Renforce les muscles stabilisateurs du genou et cheville dans le plan frontal. Améliore l'équilibre dynamique et la puissance latérale souvent négligée.",
      muscles: ["Fessiers", "Cardio"] },
    { name: "Sprint sur place", sets: 3, reps: "20 sec effort", rest: 0, hiit: true,
      tip: "Allure maximale, fréquence absolue. C'est le dernier — tout donner !",
      benefit: "Maximise la fréquence cardiaque pour créer un effet EPOC intense : le corps continue de brûler des calories jusqu'à 24h après la séance.",
      muscles: ["Cardio", "Corps entier"] },
  ],

  "jambes": [
    { name: "Squat barre", sets: 4, reps: "10 reps", rest: 90,
      tip: "Barre sur les trapèzes, pas sur le cou. Descends jusqu'à cuisses parallèles. Pousse avec les talons. Genoux dans l'axe des orteils.",
      benefit: "Le squat chargé est le meilleur bâtisseur de masse musculaire du bas du corps. Stimule massivement la testostérone et l'hormone de croissance pour des gains globaux.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Presse à cuisses", sets: 3, reps: "15 reps", rest: 75,
      tip: "Pieds à mi-hauteur de la plateforme. Descends à 90° de flexion. Ne verrouille jamais les genoux en haut.",
      benefit: "Permet de surcharger le bas du corps en sécurité. Cible précisément les quadriceps avec moins de stress lombaire que le squat — idéal pour varier les stimuli.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Fentes marchées", sets: 3, reps: "12 par jambe", rest: 75,
      tip: "Grand pas, genou arrière proche du sol. Alterne les jambes en avançant. Buste droit, regard devant.",
      benefit: "Développe chaque jambe indépendamment pour corriger les déséquilibres. Améliore l'équilibre dynamique et la mobilité des hanches essentiels aux sports.",
      muscles: ["Quadriceps", "Fessiers"] },
    { name: "Hip Thrust barre", sets: 4, reps: "12 reps", rest: 75,
      tip: "Épaules sur le banc, barre sur les hanches avec serviette. Pousse avec les talons. Contracte les fessiers 1 sec en haut.",
      benefit: "L'exercice le plus efficace pour activer le grand fessier. Renforce la chaîne postérieure, améliore la puissance de sprint et la posture assise prolongée.",
      muscles: ["Fessiers"] },
    { name: "Extensions mollets", sets: 4, reps: "20 reps", rest: 60,
      tip: "Monte sur la pointe des pieds, maintiens 1 seconde. Descends lentement, étire bien en bas.",
      benefit: "Renforce les jumeaux et le soléaire, muscles souvent négligés. Améliore la stabilité de la cheville, la puissance de sprint et prévient les tendinites d'Achille.",
      muscles: ["Mollets"] },
  ],

  "mobilite": [
    { name: "Cat-Cow", sets: 2, reps: "10 respirations", rest: 30,
      tip: "Inspiration : creuse le dos, regard vers le haut. Expiration : arrondis le dos, menton vers la poitrine.",
      benefit: "Lubrifie les disques intervertébraux et améliore la mobilité de toute la colonne. Soulage les raideurs matinales et prépare le dos à l'effort.",
      muscles: ["Colonne vertébrale"] },
    { name: "Hip Circles", sets: 2, reps: "10 par côté", rest: 20,
      tip: "Mains sur les hanches, pieds écartés. Trace les plus grands cercles possibles.",
      benefit: "Mobilise l'articulation coxo-fémorale dans toutes ses amplitudes. Prévient les blessures et améliore la fluidité des mouvements du bas du corps.",
      muscles: ["Hanches"] },
    { name: "World's Greatest Stretch", sets: 2, reps: "30 sec par côté", rest: 20, auto: 30,
      tip: "En fente basse, main intérieure au sol, ouvre l'autre bras vers le ciel. Respire profondément.",
      benefit: "Mobilise simultanément les hanches, la colonne thoracique et les ischio-jambiers. C'est l'étirement total du corps — considéré comme le meilleur étirement polyarticulaire.",
      muscles: ["Corps entier"] },
    { name: "Pigeon Yoga", sets: 2, reps: "45 sec par côté", rest: 20, auto: 45,
      tip: "Jambe avant à 90°, jambe arrière tendue. Coussin sous la fesse si besoin. Laisse la gravité faire le travail.",
      benefit: "Étire profondément le piriforme et les fléchisseurs de hanches. Soulage les douleurs sciatiques et la tension lombaire liée à la position assise prolongée.",
      muscles: ["Hanches", "Fessiers"] },
    { name: "Thread the Needle", sets: 2, reps: "30 sec par côté", rest: 20, auto: 30,
      tip: "À quatre pattes, glisse un bras sous l'autre jusqu'à l'épaule au sol.",
      benefit: "Améliore la rotation thoracique et ouvre les grands dorsaux. Contre les effets de la posture assise et réduit les douleurs inter-scapulaires.",
      muscles: ["Épaules", "Dos"] },
    { name: "Downward Dog → Cobra", sets: 2, reps: "8 transitions", rest: 30,
      tip: "Chien tête en bas : talons vers le sol, dos plat. Cobra : hanches au sol, coudes sous les épaules. 3 sec chaque position.",
      benefit: "Étire la chaîne postérieure (ischio-jambiers, mollets) et la chaîne antérieure (pectoraux, abdos). Améliore la souplesse globale et réveille le système nerveux.",
      muscles: ["Dos", "Pectoraux"] },
    { name: "Shoulder Opener", sets: 2, reps: "30 sec", rest: 20, auto: 30,
      tip: "Mains dans le dos, doigts croisés. Pousse les épaules en arrière et les bras vers le bas. Ouvre la poitrine.",
      benefit: "Étire les pectoraux et les biceps souvent raccourcis par le travail sur ordinateur. Améliore l'ouverture thoracique et réduit les tensions cervicales.",
      muscles: ["Épaules", "Pectoraux"] },
    { name: "Neck Release", sets: 2, reps: "20 sec par côté", rest: 15, auto: 20,
      tip: "Très doux ! Incline la tête vers l'épaule, aide légèrement avec la main — aucune pression forcée.",
      benefit: "Relâche les trapèzes et les scalènes sous tension chronique. Réduit les céphalées de tension et améliore la mobilité cervicale.",
      muscles: ["Nuque"] },
    { name: "Étirement quadriceps", sets: 2, reps: "30 sec par jambe", rest: 20, auto: 30,
      tip: "Debout, pied vers la fesse. Genou proche de l'autre genou. Tiens un mur si besoin.",
      benefit: "Étire le droit fémoral et les fléchisseurs de hanche raccourcis par la position assise. Soulage les douleurs aux genoux et à la hanche antérieure.",
      muscles: ["Quadriceps"] },
    { name: "Posture de l'enfant", sets: 1, reps: "60 sec", rest: 0, auto: 60,
      tip: "Genoux écartés, front au sol, bras tendus devant. Laisse le dos s'ouvrir complètement. Respiration lente.",
      benefit: "La position de récupération par excellence. Décomprime les vertèbres lombaires, relâche les tenseurs du fascia lata et active le système nerveux parasympathique.",
      muscles: ["Dos", "Hanches"] },
  ],

  "dos-biceps": [
    { name: "Tractions supination", sets: 4, reps: "Max reps", rest: 90,
      tip: "Prise en dessous (paumes vers toi), mains à largeur d'épaules. Bras complètement tendus en bas. Monte jusqu'au menton, descends en 3 sec.",
      benefit: "Combine l'activation maximale du grand dorsal et du biceps dans un seul mouvement. Développe la force relative (force/poids de corps) et l'épaisseur du dos.",
      muscles: ["Dos", "Biceps"] },
    { name: "Rowing barre buste penché", sets: 4, reps: "10 reps", rest: 90,
      tip: "Dos plat à 45°, barre sous les genoux. Tire vers le nombril, coudes proches. Contracte les omoplates en haut.",
      benefit: "Développe l'épaisseur globale du dos (grand dorsal, rhomboïdes, trapèzes moyens). Améliore la posture et contrebalance les effets du travail sédentaire.",
      muscles: ["Dos"] },
    { name: "Tirage poulie haute", sets: 3, reps: "12 reps", rest: 75,
      tip: "Tire vers la poitrine, pas la nuque. Coudes pointent vers le bas. Buste légèrement incliné.",
      benefit: "Développe les grands dorsaux avec moins de contrainte que les tractions. Améliore l'amplitude articulaire de l'épaule et la force de traction verticale.",
      muscles: ["Dos"] },
    { name: "Rowing unilatéral haltère", sets: 3, reps: "12 par bras", rest: 60,
      tip: "Genou et main sur le banc. Tire l'haltère vers la hanche, coude haut. Descends lentement.",
      benefit: "Corrige les déséquilibres gauche/droite du dos. Permet une amplitude supérieure au rowing barre et cible mieux le grand dorsal inférieur.",
      muscles: ["Dos", "Biceps"] },
    { name: "Curl barre", sets: 3, reps: "12 reps", rest: 60,
      tip: "Coudes fixes contre le corps. Contracte fort en haut 1 seconde. Descends en 3 secondes.",
      benefit: "Développe le biceps brachial en masse et en définition. Améliore la force de traction et contribue à l'esthétique des bras.",
      muscles: ["Biceps"] },
    { name: "Curl marteau", sets: 3, reps: "12 par bras", rest: 60,
      tip: "Paumes face à face tout au long du mouvement. Contrôle total sur toute l'amplitude.",
      benefit: "Cible le brachial et le brachioradial en plus du biceps pour des bras complets et équilibrés. Améliore la force de prise indispensable à tous les exercices de traction.",
      muscles: ["Biceps"] },
  ],

  "core": [
    { name: "Planche frontale", sets: 4, reps: "45 sec", rest: 30, auto: 45,
      tip: "Avant-bras au sol, corps en ligne parfaite. Rentre le nombril, serre les fessiers. Pense à te grandir vers l'avant.",
      benefit: "Active le transverse de l'abdomen, véritable corset naturel du corps. Protège le bas du dos, améliore la posture et stabilise la colonne pour tous les mouvements.",
      muscles: ["Core", "Épaules"] },
    { name: "Crunch", sets: 3, reps: "20 reps", rest: 45,
      tip: "Mains à peine derrière les tempes. Expire en montant. Soulève les épaules, pas le bas du dos.",
      benefit: "Renforce le droit de l'abdomen pour une ceinture abdominale solide. Améliore la stabilité lombaire et la capacité à maintenir une bonne posture debout.",
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
      tip: "Corps droit de la tête aux pieds, hanche décollée du sol. Pour faciliter : genou inférieur au sol.",
      benefit: "Renforce les obliques et le carré des lombes pour prévenir les douleurs lombaires latérales. Améliore la stabilité du tronc dans le plan frontal, souvent négligée.",
      muscles: ["Obliques", "Core"] },
    { name: "Dead Bug", sets: 3, reps: "12 reps (6/côté)", rest: 45,
      tip: "Bas du dos collé au sol. Étends le bras opposé à la jambe en simultané. Contrôle total.",
      benefit: "Améliore la coordination et la stabilité du core profond en conditions de charge asymétrique. Excellent pour la prévention des blessures lombaires lors des sports.",
      muscles: ["Core"] },
    { name: "Bird Dog", sets: 3, reps: "12 reps (6/côté)", rest: 45,
      tip: "À quatre pattes. Étends le bras droit et la jambe gauche simultanément. Maintiens 2 secondes.",
      benefit: "Renforce les muscles stabilisateurs de la colonne tout en améliorant l'équilibre et la coordination. Idéal pour réhabiliter et prévenir les douleurs lombaires.",
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
      tip: "Allure conversationnelle : tu dois pouvoir parler par phrases courtes. FC cible 60-70% de ton max.",
      benefit: "Développe les mitochondries musculaires et améliore l'utilisation des graisses comme carburant. C'est le fondamental de l'endurance aérobie à long terme.",
      muscles: ["Cardio", "Endurance"] },
    { name: "Fractionné (1 min / 2 min récup)", sets: 4, reps: "3 min par répét.", rest: 0, auto: 180,
      tip: "1 min à 85-90% de ton max, puis 2 min de trot récupérateur. Qualité > quantité.",
      benefit: "Améliore le VO2max et la capacité anaérobie. Stimule l'effet EPOC pour une combustion de graisses prolongée après la séance et augmente le seuil lactique.",
      muscles: ["Cardio", "VO2max"] },
    { name: "Retour au calme · Marche", sets: 1, reps: "5 min", rest: 0, auto: 300,
      tip: "Réduis progressivement. Respiration abdominale profonde.",
      benefit: "Permet un retour progressif à l'état de repos pour le système cardiovasculaire. Active la récupération parasympathique et prévient les étourdissements post-effort.",
      muscles: ["Récupération"] },
  ],
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
  const MAP: Record<string, string> = {
    "Force Haut du Corps":   "force-haut",
    "Full Body Débutant":    "fullbody-deb",
    "HIIT Brûle-Graisses":   "hiit",
    "Jambes & Fessiers":     "jambes",
    "Mobilité Matinale":     "mobilite",
    "Dos & Biceps":          "dos-biceps",
    "Core & Gainage":        "core",
    "Endurance Cardio":      "cardio-endurance",
  };
  if (MAP[title]) return MAP[title];
  // recherche partielle (ex: "Force Haut du Corps · 42 min" → "force-haut")
  for (const [key, val] of Object.entries(MAP)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return null; // séance perso ou titre inconnu
}

/* ─── Component ──────────────────────────────────────────── */
export default function WorkoutGuideModal({
  sessionId, title, accent, duration, difficulty, category, onClose, onComplete, exerciseList,
}: WorkoutGuideModalProps) {
  const exercises = (exerciseList && exerciseList.length > 0) ? exerciseList : (exerciseData[sessionId] ?? []);

  const [phase,         setPhase]         = useState<GuidePhase>("intro");
  const [exerciseIdx,   setExerciseIdx]   = useState(0);
  const [setIdx,        setSetIdx]        = useState(0);
  const [restCountdown, setRestCountdown] = useState(0);
  const [restTotal,     setRestTotal]     = useState(0);
  const [restMode,      setRestMode]      = useState<"set" | "exercise">("set");
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [hiitSub,       setHiitSub]       = useState<HiitSub>("work");
  const [doneMap,       setDoneMap]       = useState<Record<number, Record<number, boolean>>>({});
  const [startMs,       setStartMs]       = useState(0);
  const [elapsed,       setElapsed]       = useState(0);
  const [paused,        setPaused]        = useState(false);
  const [showInfo,      setShowInfo]      = useState(false);
  const [introOpen,     setIntroOpen]     = useState<number | null>(null); // exo déplié dans la liste "Au programme"
  const [shareStatus,   setShareStatus]   = useState<"idle" | "saving" | "done" | "error">("idle");
  const [sessionSaved,  setSessionSaved]  = useState(false);

  const { user } = useAuth();

  const pausedAtRef = useRef<number>(0);

  /* ── Masque la barre de navigation du bas tant que la séance guidée est ouverte
        (sinon, sur mobile, elle se superpose au bas de la modale). ── */
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

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
    }).then(({ error }) => {
      if (!error) setSessionSaved(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ── Partager la séance comme publication permanente ── */
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
      audience: "friends",
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
      if (e?.auto)      setAutoCountdown(e.auto);
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); }
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
      if (e?.auto)      setAutoCountdown(e.auto);
      else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); }
    } else if (nextEx < exercises.length) {
      const restAfter = exercises[exerciseIdx]?.restAfter ?? 0;
      if (restAfter > 0) {
        setRestMode("exercise");
        setRestTotal(restAfter);
        setRestCountdown(restAfter);
        setPhase("resting");
      } else {
        setExerciseIdx(nextEx); setSetIdx(0); setPhase("exercising");
        const e = exercises[nextEx];
        if (e?.auto)      setAutoCountdown(e.auto);
        else if (e?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); }
        else              setAutoCountdown(0);
      }
    } else {
      setPhase("done");
    }
  }, [exercises, exerciseIdx, setIdx]);

  /* ── Complete a set ── */
  const completeSet = useCallback(() => {
    setDoneMap(prev => ({
      ...prev,
      [exerciseIdx]: { ...(prev[exerciseIdx] ?? {}), [setIdx]: true },
    }));
    const rest = exercises[exerciseIdx]?.rest ?? 0;
    if (rest > 0) { setRestTotal(rest); setRestCountdown(rest); setPhase("resting"); }
    else          advance();
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
      if (restMode === "exercise") { setRestMode("set"); skipExercise(); }
      else advance();
      return;
    }
    const t = setTimeout(() => setRestCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, restCountdown, paused, restMode]);

  /* ── Auto / HIIT countdown ── */
  useEffect(() => {
    if (phase !== "exercising" || paused) return;
    if (!cur?.auto && !cur?.hiit) return;
    if (autoCountdown <= 0) {
      if (cur.hiit && hiitSub === "work") { setHiitSub("rest"); setAutoCountdown(HIIT_REST); return; }
      completeSet(); return;
    }
    const t = setTimeout(() => setAutoCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, autoCountdown, hiitSub, cur, paused]);

  /* ── Start ── */
  const startWorkout = () => {
    setStartMs(Date.now());
    setExerciseIdx(0); setSetIdx(0); setDoneMap({}); setPaused(false); setShowInfo(false);
    setPhase("exercising");
    if (exercises[0]?.auto)      setAutoCountdown(exercises[0].auto);
    else if (exercises[0]?.hiit) { setHiitSub("work"); setAutoCountdown(HIIT_WORK); }
  };

  /* ── SVG helpers ── */
  const progressPct = exercises.length
    ? ((exerciseIdx + (setIdx + 1) / (cur?.sets || 1)) / exercises.length) * 100 : 0;
  const autoTotal  = isHiit ? (hiitSub === "work" ? HIIT_WORK : HIIT_REST) : (cur?.auto ?? 0);
  const autoOffset = CC * (1 - (autoTotal > 0 ? autoCountdown / autoTotal : 0));
  const restOffset = CC * (1 - (restTotal > 0 ? restCountdown / restTotal : 1));

  const canPause = (phase === "exercising" && isTimered) || phase === "resting";

  /* ─────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(15,10,30,0.55)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 -4px 60px rgba(167,139,250,0.12), 0 0 0 1px rgba(255,255,255,0.9)",
          maxHeight: "92dvh",
        }}
      >
        {/* ── Progress bar ── */}
        {phase !== "intro" && phase !== "done" && (
          <div className="h-1" style={{ background: "rgba(167,139,250,0.1)" }}>
            <motion.div
              className="h-full"
              style={{ background: `linear-gradient(90deg, #A78BFA, ${accent})` }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0"
          style={{ borderBottom: (phase !== "intro" && phase !== "done") ? "1px solid rgba(167,139,250,0.08)" : "none" }}
        >
          <div>
            {(phase === "exercising" || phase === "resting") && (
              <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: accent }}>
                Exercice {exerciseIdx + 1} / {exercises.length}
              </p>
            )}
            <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {phase !== "intro" && phase !== "done" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <Clock size={10} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                <span className="text-[11px] font-mono font-medium" style={{ color: "#A78BFA" }}>{fmt(elapsed)}</span>
              </div>
            )}
            {canPause && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={togglePause}
                className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
                style={{
                  background: paused ? "rgba(167,139,250,0.12)" : "rgba(0,0,0,0.04)",
                  border: paused ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(0,0,0,0.06)",
                }}
                aria-label={paused ? "Reprendre" : "Pause"}
              >
                {paused
                  ? <Play  size={13} strokeWidth={2} style={{ color: "#A78BFA" }} />
                  : <Pause size={13} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                }
              </motion.button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence mode="wait">

            {/* ── INTRO ── */}
            {phase === "intro" && (
              <motion.div key="intro"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="flex flex-col gap-4 py-4"
              >
                {/* Session info card */}
                <div className="rounded-3xl p-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,192,255,0.25) 0%, rgba(245,230,163,0.25) 100%)",
                    border: "1px solid rgba(167,139,250,0.2)",
                  }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                      <Zap size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                    </div>
                    <div>
                      <p className="text-base font-medium" style={{ color: "#2D3748" }}>{title}</p>
                      <p className="text-xs mt-0.5 font-light" style={{ color: "#A0AEC0" }}>{difficulty} · {duration} min</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Exercices",      value: String(exercises.length) },
                      { label: "Séries totales", value: String(totalSets) },
                      { label: "Durée est.",     value: `~${duration} min` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-2xl p-3 text-center"
                        style={{ background: "rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                        <p className="text-base font-light" style={{ color: "#2D3748" }}>{value}</p>
                        <p className="text-[9px] font-semibold mt-1 tracking-wider uppercase" style={{ color: "#A0AEC0" }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exercise list — chaque exo est dépliable (technique + démo vidéo) */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                      Au programme
                    </p>
                    <p className="text-[10px] font-light" style={{ color: "#A78BFA" }}>
                      Touche un exo pour la démo
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {exercises.map((ex, i) => {
                      const open = introOpen === i;
                      return (
                        <div key={i} className="rounded-2xl overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.6)", border: `1px solid ${open ? "rgba(167,139,250,0.25)" : "rgba(167,139,250,0.08)"}`, boxShadow: "0 1px 4px rgba(167,139,250,0.05)" }}>
                          <button
                            onClick={() => setIntroOpen(open ? null : i)}
                            className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
                            aria-expanded={open}
                          >
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748" }}>
                              {i + 1}
                            </div>
                            <p className="flex-1 text-sm font-light truncate" style={{ color: "#2D3748" }}>{ex.name}</p>
                            <p className="text-[10px] font-medium flex-shrink-0" style={{ color: "#A0AEC0" }}>
                              {ex.sets}×{ex.reps}
                            </p>
                            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 flex">
                              <ChevronDown size={14} strokeWidth={2} style={{ color: "#A78BFA" }} />
                            </motion.span>
                          </button>
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
                                  {/* Technique */}
                                  <div className="rounded-xl p-3"
                                    style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.1)" }}>
                                    <p className="text-[9px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "#A78BFA" }}>
                                      Comment faire
                                    </p>
                                    <p className="text-[13px] font-light leading-relaxed" style={{ color: "#4A5568" }}>{ex.tip}</p>
                                  </div>
                                  {/* Démo vidéo (chargée à l'ouverture seulement) */}
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

            {/* ── EXERCISING ── */}
            {phase === "exercising" && cur && (
              <AnimatePresence mode="wait">
                {showInfo ? (
                  /* ── Info panel ── */
                  <motion.div key="info"
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                    className="flex flex-col gap-4 py-4"
                  >
                    <button
                      onClick={() => setShowInfo(false)}
                      className="flex items-center gap-1.5 text-xs font-medium cursor-pointer w-fit"
                      style={{ color: "#A78BFA" }}
                    >
                      <ArrowLeft size={13} strokeWidth={2} />
                      Retour à l&apos;exercice
                    </button>

                    <div>
                      <h2 className="text-3xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>{cur.name}</h2>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {cur.muscles.map(m => (
                          <span key={m} className="px-2.5 py-1 rounded-xl text-[10px] font-semibold"
                            style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }}>{m}</span>
                        ))}
                      </div>
                    </div>

                    {/* Démonstration — vidéo YouTube de l'exercice */}
                    <ExerciseVideo exerciseName={cur.name} />

                    {/* Benefit */}
                    <div className="rounded-2xl p-4"
                      style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.7) 0%, rgba(255,251,240,0.7) 100%)", border: "1px solid rgba(167,139,250,0.2)" }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#A78BFA" }}>
                        Bénéfice pour le corps
                      </p>
                      <p className="text-sm font-light leading-relaxed" style={{ color: "#4A5568" }}>
                        {cur.benefit}
                      </p>
                    </div>

                    {/* Technique */}
                    <div className="rounded-2xl p-4"
                      style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(167,139,250,0.1)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>A</div>
                        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
                          Technique
                        </p>
                      </div>
                      <p className="text-sm font-light leading-relaxed" style={{ color: "#4A5568" }}>{cur.tip}</p>
                    </div>

                    {/* Sets info */}
                    <div className="rounded-2xl p-4"
                      style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(167,139,250,0.1)" }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#A0AEC0" }}>
                        Détail de la séance
                      </p>
                      <div className="flex gap-6">
                        {[
                          { label: "Séries", value: String(cur.sets) },
                          { label: "Reps",   value: cur.reps },
                          { label: "Repos",  value: cur.rest > 0 ? `${cur.rest}s` : "—" },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-lg font-light" style={{ color: "#2D3748" }}>{value}</p>
                            <p className="text-[9px] font-semibold mt-0.5 tracking-wider uppercase" style={{ color: "#A0AEC0" }}>{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Normal exercise view ── */
                  <motion.div key={`ex-${exerciseIdx}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-4 py-4"
                  >
                    {/* Name + help */}
                    <div>
                      <div className="flex items-start gap-2">
                        <h2 className="text-4xl font-extralight leading-tight tracking-tight flex-1" style={{ color: "#2D3748" }}>
                          {cur.name}
                        </h2>
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setShowInfo(true)}
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer mt-1"
                          style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}
                          aria-label="En savoir plus sur cet exercice"
                        >
                          <HelpCircle size={13} strokeWidth={1.8} style={{ color: "#A78BFA" }} />
                        </motion.button>
                      </div>
                      {/* Set progress dots */}
                      <div className="flex items-center gap-2.5 mt-3">
                        <div className="flex gap-1.5">
                          {Array.from({ length: cur.sets }).map((_, i) => (
                            <motion.div key={i} layout
                              className="rounded-full"
                              style={{
                                width:  i === setIdx ? 20 : 8,
                                height: 8,
                                background: doneMap[exerciseIdx]?.[i]
                                  ? `linear-gradient(90deg, ${accent}, #D4C0FF)`
                                  : i === setIdx
                                  ? accent
                                  : "rgba(167,139,250,0.2)",
                              }}
                              transition={{ duration: 0.25 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium" style={{ color: "#A0AEC0" }}>
                          Série {setIdx + 1}/{cur.sets} · {cur.reps}
                        </span>
                      </div>
                    </div>

                    {/* Auto / HIIT timer */}
                    {isTimered && (
                      <div className="flex flex-col items-center gap-3">
                        {isHiit && (
                          <motion.div key={hiitSub}
                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="px-5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                            style={{
                              background: hiitSub === "work" ? "rgba(239,68,68,0.08)" : "rgba(43,212,160,0.08)",
                              color:      hiitSub === "work" ? "#EF4444"              : "#2BD4A0",
                              border: `1px solid ${hiitSub === "work" ? "rgba(239,68,68,0.2)" : "rgba(43,212,160,0.2)"}`,
                            }}
                          >
                            {hiitSub === "work" ? "⚡ Effort !" : "✓ Repos"}
                          </motion.div>
                        )}
                        <motion.button
                          onClick={togglePause}
                          whileTap={{ scale: 0.94 }}
                          className="relative w-32 h-32 cursor-pointer"
                          aria-label={paused ? "Reprendre" : "Pause"}
                        >
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r={CR} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="5" />
                            <motion.circle cx="50" cy="50" r={CR} fill="none"
                              stroke={isHiit ? (hiitSub === "work" ? "#EF4444" : "#2BD4A0") : accent}
                              strokeWidth="5" strokeLinecap="round"
                              strokeDasharray={CC}
                              animate={{ strokeDashoffset: paused ? undefined : autoOffset }}
                              style={{ strokeDashoffset: autoOffset }}
                              transition={{ duration: 0.6 }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {paused ? (
                              <Play size={28} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                            ) : (
                              <span className="text-4xl font-extralight tabular-nums" style={{ color: "#2D3748" }}>
                                {autoCountdown}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      </div>
                    )}

                    {/* Pause banner */}
                    <AnimatePresence>
                      {paused && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="flex items-center justify-center gap-2 rounded-2xl py-3"
                          style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}
                        >
                          <Pause size={12} strokeWidth={2} style={{ color: "#A78BFA" }} />
                          <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>En pause</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Démonstration — vidéo YouTube de l'exercice */}
                    <ExerciseVideo exerciseName={cur.name} />

                    {/* Muscles */}
                    <div className="flex flex-wrap gap-1.5">
                      {cur.muscles.map(m => (
                        <span key={m} className="px-2.5 py-1 rounded-xl text-[10px] font-semibold"
                          style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.15)" }}>{m}</span>
                      ))}
                    </div>

                    {/* Aura tip */}
                    <div className="rounded-2xl p-4"
                      style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.7) 0%, rgba(255,251,240,0.7) 100%)", border: "1px solid rgba(167,139,250,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>A</div>
                        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
                          Conseil Vaiiya
                        </p>
                      </div>
                      <p className="text-sm font-light leading-relaxed" style={{ color: "#4A5568" }}>{cur.tip}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* ── RESTING ── */}
            {phase === "resting" && (
              <motion.div key="rest"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-8"
              >
                {/* Label pill */}
                <div className="px-4 py-1.5 rounded-full"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A78BFA" }}>
                    {paused ? "En pause" : restMode === "exercise" ? "Transition" : "Récupération"}
                  </p>
                </div>

                {/* Circular countdown */}
                <motion.button
                  onClick={togglePause}
                  whileTap={{ scale: 0.94 }}
                  className="relative w-36 h-36 cursor-pointer"
                  aria-label={paused ? "Reprendre" : "Pause"}
                >
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={CR} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="6" />
                    <motion.circle cx="50" cy="50" r={CR} fill="none"
                      stroke="#A78BFA" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={CC}
                      animate={{ strokeDashoffset: restOffset }}
                      transition={{ duration: 0.6 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {paused
                      ? <Play size={30} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                      : <>
                          <span className="text-5xl font-extralight tabular-nums" style={{ color: "#2D3748" }}>
                            {restCountdown}
                          </span>
                          <span className="text-[10px] font-medium mt-0.5" style={{ color: "#A0AEC0" }}>sec</span>
                        </>
                    }
                  </div>
                </motion.button>

                {/* Next exercise preview */}
                {(() => {
                  const isLastSet  = setIdx === (cur?.sets ?? 1) - 1;
                  const nextLabel  = isLastSet && exercises[exerciseIdx + 1]
                    ? exercises[exerciseIdx + 1].name
                    : !isLastSet ? cur?.name : null;
                  const nextSub    = isLastSet ? "Prochain exercice" : `Série ${setIdx + 2}/${cur?.sets}`;
                  return nextLabel ? (
                    <div className="w-full rounded-2xl p-3.5 flex items-center gap-3"
                      style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#A78BFA" }} />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#A0AEC0" }}>{nextSub}</p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: "#2D3748" }}>{nextLabel}</p>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Skip buttons */}
                <div className="flex flex-col items-center gap-2">
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => setRestCountdown(0)}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ background: "rgba(0,0,0,0.04)", color: "#718096", border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <SkipForward size={12} strokeWidth={2} />
                    Passer le repos
                  </motion.button>
                  {exerciseIdx < exercises.length - 1 && (
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={skipExercise}
                      className="flex items-center gap-1 text-[11px] font-medium cursor-pointer px-3 py-1"
                      style={{ color: "#A0AEC0" }}
                    >
                      <SkipForward size={10} strokeWidth={2} />
                      Passer l&apos;exercice
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {phase === "done" && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 py-8 text-center"
              >
                {/* Trophy */}
                <motion.div
                  initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, delay: 0.1 }}
                  className="w-24 h-24 rounded-3xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)",
                    boxShadow: "0 16px 48px rgba(212,168,67,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
                  }}
                >
                  <Trophy size={40} strokeWidth={1.2} style={{ color: "#fff" }} />
                </motion.div>

                <div>
                  <h2 className="text-3xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>
                    Séance terminée !
                  </h2>
                  <p className="text-sm mt-2 font-light" style={{ color: "#A0AEC0" }}>
                    Excellent travail — tu es plus fort qu&apos;hier 💪
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {[
                    { label: "Durée",     value: fmt(elapsed) },
                    { label: "Exercices", value: String(exercises.length) },
                    { label: "Séries",    value: String(totalSets) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-2xl p-4"
                      style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.8) 0%, rgba(255,251,240,0.8) 100%)", border: "1px solid rgba(167,139,250,0.12)" }}>
                      <p className="text-xl font-light" style={{ color: "#2D3748" }}>{value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: "#A0AEC0" }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Session saved */}
                <AnimatePresence>
                  {sessionSaved && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{ background: "rgba(43,212,160,0.08)", border: "1px solid rgba(43,212,160,0.2)" }}
                    >
                      <BookmarkCheck size={12} strokeWidth={2} style={{ color: "#2BD4A0" }} />
                      <span className="text-[11px] font-medium" style={{ color: "#2BD4A0" }}>
                        Séance enregistrée dans ton profil
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="px-5 pb-6 pt-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(167,139,250,0.08)" }}>
          <AnimatePresence mode="wait">

            {phase === "intro" && (
              <motion.button key="start"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={startWorkout}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 20px rgba(167,139,250,0.25)",
                  color: "#2D3748",
                }}
              >
                <Zap size={16} strokeWidth={2} />
                Commencer la séance
              </motion.button>
            )}

            {phase === "exercising" && !showInfo && !isTimered && (
              <motion.div key="set-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={completeSet}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${accent}dd 0%, ${accent}aa 100%)`,
                    boxShadow: `0 6px 20px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    color: "#fff",
                  }}
                >
                  <CheckCircle size={16} strokeWidth={2} />
                  Série terminée ✓
                </motion.button>
                {exerciseIdx < exercises.length - 1 && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={skipExercise}
                    className="flex items-center gap-1 text-[11px] font-medium cursor-pointer px-3 py-1.5"
                    style={{ color: "#A0AEC0" }}
                  >
                    <SkipForward size={10} strokeWidth={2} />
                    Passer l&apos;exercice
                  </motion.button>
                )}
              </motion.div>
            )}

            {phase === "exercising" && !showInfo && isTimered && (
              <motion.div key="skip-timed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2">
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => setAutoCountdown(0)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.04)", color: "#718096", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <SkipForward size={13} strokeWidth={2} />
                  {isHiit && hiitSub === "work" ? "Passer l'effort" : "Passer"}
                </motion.button>
                {exerciseIdx < exercises.length - 1 && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={skipExercise}
                    className="flex items-center gap-1 text-[11px] font-medium cursor-pointer px-3 py-1.5"
                    style={{ color: "#A0AEC0" }}
                  >
                    <SkipForward size={10} strokeWidth={2} />
                    Passer l&apos;exercice
                  </motion.button>
                )}
              </motion.div>
            )}

            {phase === "done" && (
              <motion.div key="done-actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2.5">
                {user && shareStatus !== "done" && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={shareAsPost}
                    disabled={shareStatus === "saving"}
                    className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${accent}dd 0%, ${accent}aa 100%)`,
                      color: "#fff",
                      boxShadow: `0 6px 20px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.3)`,
                      opacity: shareStatus === "saving" ? 0.7 : 1,
                    }}
                  >
                    {shareStatus === "saving"
                      ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block" }}>⏳</motion.span> Publication…</>
                      : <><Share2 size={15} strokeWidth={2} /> Partager la séance</>
                    }
                  </motion.button>
                )}
                {shareStatus === "done" && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                    style={{ background: "rgba(43,212,160,0.08)", color: "#2BD4A0", border: "1px solid rgba(43,212,160,0.2)" }}
                  >
                    ✓ Séance publiée — visible par tes amis
                  </motion.div>
                )}
                {shareStatus === "error" && (
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: "#EF4444" }}>Erreur de publication.</p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShareStatus("idle")}
                      className="mt-2 px-4 py-1.5 rounded-lg text-xs cursor-pointer"
                      style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}
                    >
                      Réessayer
                    </motion.button>
                  </div>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.04)", color: "#2D3748", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  Retour à la progression
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
