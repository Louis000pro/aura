"use client";

/* ════════════════════════════════════════════════════════════════════
   /progression — l'onglet ENTRAÎNEMENT (direction finale validée).

   Philosophie : l'app RÉPOND quand elle sait, elle ne QUESTIONNE que
   quand elle ne sait pas.
   ① Héros « Aujourd'hui »   — la séance du jour, un seul geste.
   ② « Pas ce qui était prévu ? » — J'improvise (IA) / Je choisis
      (catalogue Vaiiya + bibliothèque perso FUSIONNÉS, badge Perso).
   ③ « Ma semaine »          — 7 pastilles + « Organiser » (planning
      complet — WeeklyProgramme — dans une sheet).
   Tout le reste vit derrière un tap. L'historique a quitté la page.
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Clock, ChevronRight, ChevronLeft, Dumbbell, Play, Flame, Wind, Sparkles, Layers,
  Check, X, Plus, Trash2, Pencil, Globe, Lock, Users,
  Moon, Zap, Home, Sun, CalendarDays, MoreHorizontal, GripVertical,
} from "lucide-react";
import WeeklyProgramme from "@/components/WeeklyProgramme";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";
import { useAuth } from "@/context/AuthContext";
import { useAssistant } from "@/context/AssistantContext";
import { createClient } from "@/lib/supabase";
import { lockBodyModal } from "@/lib/bodyModal";
import { levelToDifficulty } from "@/lib/assistantActions";
import {
  ensureWeek, setDayStatus, saveDay, hasSeance, readLieu, readVariant, ctxFromLieu,
  weekDates, weekDatesForOffset, todayYmd, todayWeekIndex, weekOffsetOf, dayTitle, normalizeExercises,
  type PlanningDay, type GenInput, type Ctx,
} from "@/lib/planning";

/* ─── Workout sessions data (catalogue Vaiiya) ─────────────── */
type WorkoutCategory = "force" | "cardio" | "mobilite" | "fullbody";

type WorkoutSession = {
  id: string;
  category: WorkoutCategory;
  title: string;
  subtitle: string;
  duration: number;
  difficulty: "Débutant" | "Intermédiaire" | "Avancé";
  exercises: number;
  muscles: string[];
  accent: string;
  icon: typeof Dumbbell | string;   // composant (catalogue) ou nom stocké en base (perso)
  exerciseList?: Exercise[];
  visibility?: "private" | "friends" | "public";
};

const workoutSessions: WorkoutSession[] = [
  {
    id: "demo-avatars", category: "fullbody",
    title: "Démo Avatars 3D ✦", subtitle: "17 animations 3D — match exact",
    duration: 30, difficulty: "Débutant", exercises: 17,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Sparkles,
  },
  {
    id: "force-haut", category: "force",
    title: "Force Haut du Corps", subtitle: "Pectoraux · Dos · Épaules",
    duration: 45, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Pectoraux", "Dos", "Épaules"],
    accent: "#8B5CF6", icon: Dumbbell,
  },
  {
    id: "fullbody-deb", category: "fullbody",
    title: "Full Body Débutant", subtitle: "Corps complet · Sans matériel",
    duration: 35, difficulty: "Débutant", exercises: 7,
    muscles: ["Corps entier"],
    accent: "#8B5CF6", icon: Layers,
  },
  {
    id: "hiit", category: "cardio",
    title: "HIIT Brûle-Graisses", subtitle: "Cardio intensif · 20 / 10 sec",
    duration: 25, difficulty: "Avancé", exercises: 8,
    muscles: ["Cardio", "Corps entier"],
    accent: "#8B5CF6", icon: Flame,
  },
  {
    id: "jambes", category: "force",
    title: "Jambes & Fessiers", subtitle: "Squats · Fentes · Hip Thrust",
    duration: 50, difficulty: "Intermédiaire", exercises: 5,
    muscles: ["Quadriceps", "Fessiers"],
    accent: "#8B5CF6", icon: Dumbbell,
  },
  {
    id: "mobilite", category: "mobilite",
    title: "Mobilité Matinale", subtitle: "Yoga flow · Étirements actifs",
    duration: 20, difficulty: "Débutant", exercises: 10,
    muscles: ["Mobilité", "Souplesse"],
    accent: "#8B5CF6", icon: Wind,
  },
  {
    id: "dos-biceps", category: "force",
    title: "Dos & Biceps", subtitle: "Tractions · Rowing · Curls",
    duration: 40, difficulty: "Intermédiaire", exercises: 6,
    muscles: ["Dos", "Biceps"],
    accent: "#8B5CF6", icon: Dumbbell,
  },
  {
    id: "core", category: "fullbody",
    title: "Core & Gainage", subtitle: "Planche · Crunchs · Relevés",
    duration: 30, difficulty: "Intermédiaire", exercises: 8,
    muscles: ["Abdominaux", "Lombaires"],
    accent: "#8B5CF6", icon: Sparkles,
  },
  {
    id: "cardio-endurance", category: "cardio",
    title: "Endurance Cardio", subtitle: "Fractionné modéré · Zone 2",
    duration: 40, difficulty: "Débutant", exercises: 4,
    muscles: ["Cardio"],
    accent: "#8B5CF6", icon: Wind,
  },
];

const CATEGORY_LABEL: Record<WorkoutCategory, string> = {
  force: "Force", fullbody: "Full Body", cardio: "Cardio", mobilite: "Mobilité",
};

/* ─── Icon resolver (Supabase stores icon name as string) ── */
const ICON_MAP: Record<string, typeof Dumbbell> = {
  Dumbbell, Flame, Wind, Layers, Sparkles,
};
function resolveIcon(icon: unknown): typeof Dumbbell {
  if (typeof icon === "string") return ICON_MAP[icon] ?? Dumbbell;
  if (typeof icon === "function") return icon as typeof Dumbbell;
  return Dumbbell;
}

/* ─── Visibilité des séances perso ─────────────────────────── */
const VIS_CONFIG = {
  private: { label: "Privée", icon: Lock,  color: "var(--text-3)" },
  friends: { label: "Amis",   icon: Users, color: "#8B5CF6" },
  public:  { label: "Public", icon: Globe, color: "#2BD4A0" },
} as const;
type Visibility = keyof typeof VIS_CONFIG;
const VIS_ORDER: Visibility[] = ["private", "friends", "public"];

/* ─── Libellés FR des objectifs onboarding (même map que WeeklyProgramme) ── */
const goalLabels: Record<string, string> = {
  masse: "prise de masse",
  prise_de_masse: "prise de masse",
  poids: "perte de poids",
  perte_de_poids: "perte de poids",
  force: "force",
  endurance: "endurance",
  sante: "santé générale",
  sante_generale: "santé générale",
  souplesse: "souplesse",
};

/* ════════════════════════════════════════════════════════════════════
   Banque photo (public/entrainement) — dans le CATALOGUE, les photos
   sont NATURELLES : aucun filtre, aucune teinte. La cohérence vient du
   cadrage portrait, du scrim bas et de la typo blanche — pas d'une
   couleur plaquée. Les familles restent en coulisse : elles servent
   uniquement à choisir LA BONNE PHOTO d'une séance (resolveArt). Le
   blend couleur ne s'applique plus qu'aux widgets d'ambiance
   (repos / done / setup / improvise).
   ════════════════════════════════════════════════════════════════════ */
type Family = "push" | "pull" | "legs" | "core" | "full" | "cardio";

const FAMILY: Record<Family, { label: string; base: string; glow: string; variants: string[] }> = {
  push:   { label: "Poussée",   base: "#E8481F", glow: "#FF7A4D", variants: ["push-couche", "push-militaire", "push-dips", "push-pompes", "push-halteres", "push-ecarte"] },
  pull:   { label: "Tirage",    base: "#1E5FD0", glow: "#4C93FF", variants: ["pull-traction", "pull-rowing", "pull-curl", "pull-poulie", "pull-horizontal", "pull-marteau"] },
  legs:   { label: "Jambes",    base: "#0E9E56", glow: "#2FD98A", variants: ["legs-squat", "legs-fentes", "legs-souleve", "legs-goblet", "legs-presse", "legs-hipthrust"] },
  core:   { label: "Gainage",   base: "#0F8E86", glow: "#2BD4A0", variants: ["core-planche", "core-abdos", "core-lateral", "core-releve", "core-roue", "core-twist"] },
  full:   { label: "Full body", base: "#8B3FD6", glow: "#C46BFF", variants: ["full-burpee", "full-epaule", "full-kettlebell", "full-slam", "full-sandbag", "full-thruster"] },
  cardio: { label: "Cardio",    base: "#D81E63", glow: "#FF5A8D", variants: ["cardio-ropes", "cardio-sprint", "cardio-rameur", "cardio-saut", "cardio-bike", "cardio-stepper"] },
};

/** Le « cerveau » : muscle / mouvement nommé → image précise. Sinon repli famille. */
const IMG_RULES: { re: RegExp; img: string; fam: Family }[] = [
  { re: /pector|\bpec|couch|bench/,                                          img: "push-couche",   fam: "push" },
  { re: /dips?/,                                                             img: "push-dips",     fam: "push" },
  { re: /épaule|epaule|deltoï|deltoi|militaire|overhead|shoulder/,           img: "push-militaire",fam: "push" },
  { re: /\bpush\b|poussé|pousse/,                                            img: "push-couche",   fam: "push" },
  { re: /traction|pull[- ]?up|tirage vertical|dorsaux|grand dorsal|\blats?\b/, img: "pull-traction", fam: "pull" },
  { re: /rowing|\brow\b|tirage horizontal|rhombo|trapèze|trapeze/,           img: "pull-rowing",   fam: "pull" },
  { re: /biceps|\bcurl/,                                                     img: "pull-curl",     fam: "pull" },
  { re: /\bpull\b|\bdos\b/,                                                  img: "pull-traction", fam: "pull" },
  { re: /squat|quadri|\bquad/,                                              img: "legs-squat",    fam: "legs" },
  { re: /fente|lunge/,                                                       img: "legs-fentes",   fam: "legs" },
  { re: /soulevé|souleve|deadlift|\bterre\b|ischio|fessier|hip thrust|hanche/, img: "legs-souleve",  fam: "legs" },
  { re: /bas du corps|\bjambe|\bleg\b|mollet/,                               img: "legs-squat",    fam: "legs" },
  { re: /planche|\bplank|gainage/,                                           img: "core-planche",  fam: "core" },
  { re: /abdo|crunch|sit[- ]?up|oblique|lombaire|\bcore\b|sangle/,           img: "core-abdos",    fam: "core" },
  { re: /burpee/,                                                            img: "full-burpee",   fam: "full" },
  { re: /kettlebell|\bswing|snatch|arraché|arrache/,                         img: "full-kettlebell",fam: "full" },
  { re: /haut du corps|corps entier|full[- ]?body|complet|thruster|clean|épaulé/, img: "full-epaule", fam: "full" },
  { re: /corde|\brope|battle/,                                              img: "cardio-ropes",  fam: "cardio" },
  { re: /rameur|rower|\berg\b|aviron/,                                       img: "cardio-rameur", fam: "cardio" },
  { re: /sprint|course|\brun\b|vélo|velo|\bbike|assault|cardio|endurance|hiit/, img: "cardio-sprint", fam: "cardio" },
];

const CAT_FAMILY: Record<WorkoutCategory, Family> = {
  force: "push", fullbody: "full", cardio: "cardio", mobilite: "core",
};

function artHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

type Art = { img: string; base: string; glow: string; label: string; fam: Family };

/** Résout l'ambiance d'une séance depuis son titre / ses muscles / sa catégorie.
    Le TITRE prime : « Dos de Fer » reste Tirage même si les muscles listent
    les épaules — c'est le nom que l'utilisateur a choisi. */
function resolveArt(input: { title?: string; category?: WorkoutCategory; muscles?: string[] }): Art {
  const hays = [(input.title ?? "").toLowerCase(), (input.muscles ?? []).join(" ").toLowerCase()];
  for (const hay of hays) {
    if (!hay) continue;
    for (const r of IMG_RULES) {
      if (r.re.test(hay)) {
        const f = FAMILY[r.fam];
        return { img: r.img, base: f.base, glow: f.glow, label: f.label, fam: r.fam };
      }
    }
  }
  const fam: Family = input.category ? CAT_FAMILY[input.category] : "full";
  const f = FAMILY[fam];
  const img = f.variants[artHash(input.title || fam) % f.variants.length];
  return { img, base: f.base, glow: f.glow, label: f.label, fam };
}

/** Ambiances des états fixes (widgets) — couleur appliquée in-app, comme la banque. */
const WIDGET: Record<"repos" | "done" | "setup" | "improvise", {
  img: string; pos: string;
}> = {
  repos:     { img: "repos",     pos: "68% center" },
  done:      { img: "done",      pos: "center 40%" },
  setup:     { img: "setup",     pos: "center 45%" },
  improvise: { img: "improvise", pos: "center 40%" },
};

/** Photo naturelle — la banque parle d'elle-même. Juste l'image, cadrée,
    sur fond sombre le temps du chargement. Le scrim vit chez l'appelant. */
function Photo({ img, pos = "center 25%", className, style, children }: {
  img: string; pos?: string;
  className?: string; style?: React.CSSProperties; children?: React.ReactNode;
}) {
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", background: "#101018", ...style }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(/entrainement/${img}.webp)`, backgroundSize: "cover", backgroundPosition: pos }} />
      {children}
    </div>
  );
}

/** Lieu lisible d'une séance du planning. */
function lieuLabel(loc: Ctx | null): string {
  if (loc === "salle") return "À la salle";
  if (loc === "halteres") return "Maison · haltères";
  if (loc === "poids") return "Maison · poids du corps";
  return "";
}

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_FULL = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/* ════════════════════════════════════════════════════════════════════
   Sheet — enveloppe commune des bottom sheets (Organiser / Choisir /
   Improviser). Masque la nav du bas tant qu'elle est ouverte.
   ════════════════════════════════════════════════════════════════════ */
function Sheet({ onClose, children, maxHeight = "88vh", height }: {
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  height?: string;              // imposée → sheet « plein écran » (catalogue)
}) {
  useEffect(() => lockBodyModal(), []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(12,8,22,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 64, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.14)",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.35)",
          maxHeight,
          height,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ① Héros « Aujourd'hui » — un seul emplacement, quatre vérités.
   ════════════════════════════════════════════════════════════════════ */
type HeroState = "loading" | "setup" | "seance" | "repos" | "done";

function TodayHero({
  state, day, nextLabel, doneStats, onStart, onImprovise, onOrganise, onShift, onReplace,
}: {
  state: HeroState;
  day: PlanningDay | null;
  nextLabel: string | null;                       // « Jambes · demain » (état repos)
  doneStats: { minutes: number; kcal: number } | null;
  onStart: () => void;
  onImprovise: () => void;
  onOrganise: () => void;
  onShift: () => void;
  onReplace: () => void;
}) {
  /* Skeleton — même silhouette que la carte, aucune culpabilité d'attente */
  if (state === "loading") {
    return (
      <div className="rounded-3xl overflow-hidden relative" style={{ height: 340, background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
        <motion.div
          className="absolute inset-0"
          style={{ background: "linear-gradient(100deg, transparent 30%, rgba(var(--accent-rgb),0.08) 50%, transparent 70%)" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  const viz =
    state === "setup" ? WIDGET.setup
    : state === "done" ? WIDGET.done
    : state === "repos" ? WIDGET.repos
    : { img: resolveArt({ title: day ? `${day.title} ${day.type}` : "" }).img, pos: "center 24%" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-3xl overflow-hidden relative"
      style={{ minHeight: state === "seance" ? 360 : 300, boxShadow: "0 14px 40px rgba(var(--accent-rgb),0.22)" }}
    >
      <Photo img={viz.img} pos={viz.pos} style={{ position: "absolute", inset: 0 }} />

      {/* Chips du haut */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
        <span className="px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-[0.09em] uppercase"
          style={{ background: "rgba(10,8,18,0.42)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(6px)" }}>
          {state === "setup" ? "Première fois ici" : "Aujourd'hui"}
        </span>
        {state === "seance" && (
          <span className="px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-[0.09em] uppercase"
            style={{ background: "rgba(139,92,246,0.32)", color: "#E9DFFF", border: "1px solid rgba(196,168,255,0.45)", backdropFilter: "blur(6px)" }}>
            ✦ Planifié
          </span>
        )}
        {state === "done" && (
          <span className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4FE8B8,#1FBF8C)", boxShadow: "0 8px 22px rgba(43,212,160,0.45)" }}>
            <Check size={18} strokeWidth={3.2} style={{ color: "#06281E" }} />
          </span>
        )}
        {state === "repos" && <Moon size={22} strokeWidth={1.6} style={{ color: "#9FD8C6", opacity: 0.85 }} />}
        {state === "setup" && <Sparkles size={22} strokeWidth={1.6} style={{ color: "#E4D6FF" }} />}
      </div>

      {/* Légende sur l'image (style validé nutrition) */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16"
        style={{ background: "linear-gradient(to top, rgba(8,6,14,0.92) 30%, rgba(8,6,14,0.5) 70%, transparent)" }}>

        {state === "seance" && day && (
          <>
            <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase mb-1" style={{ color: "#C9B8FF" }}>
              {day.type}{lieuLabel(day.location) ? ` · ${lieuLabel(day.location)}` : ""}
            </p>
            <h2 className="text-[27px] leading-tight font-extralight text-white">{dayTitle(day)}</h2>
            <div className="flex items-center gap-2 mt-2 mb-3.5 text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.82)" }}>
              <Clock size={12} strokeWidth={2} />
              <span>{day.type === "HIIT" ? 30 : 45} min</span>
              <span className="w-[3px] h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
              <span>{day.exerciseList.length} exercices</span>
              <span className="w-[3px] h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
              <Zap size={12} strokeWidth={2} style={{ color: "#EF9F27" }} fill="#EF9F27" />
              <span>{day.difficulty}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 26px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.25)" }}
            >
              <Play size={14} strokeWidth={2.5} fill="#fff" /> C&apos;est parti
            </motion.button>
            <div className="flex justify-center gap-5 mt-2.5">
              <button onClick={onShift} className="text-[11.5px] font-semibold cursor-pointer bg-transparent border-none"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                Décaler
              </button>
              <button onClick={onReplace} className="text-[11.5px] font-semibold cursor-pointer bg-transparent border-none flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                <span style={{ color: "#C9B8FF" }}>✦</span> Remplacer
              </button>
            </div>
          </>
        )}

        {state === "repos" && (
          <>
            <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase mb-1" style={{ color: "#9FD8C6" }}>
              Aujourd&apos;hui
            </p>
            <h2 className="text-[27px] leading-tight font-extralight text-white">Repos.</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Ton corps construit pendant que tu récupères.
              {nextLabel && <> Prochaine : <b className="font-bold text-white">{nextLabel}</b>.</>}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onImprovise}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[13.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(4px)" }}
            >
              ✦ J&apos;ai quand même envie de bouger
            </motion.button>
          </>
        )}

        {state === "done" && day && (
          <>
            <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase mb-1" style={{ color: "#7FE8C8" }}>
              Aujourd&apos;hui · fait
            </p>
            <h2 className="text-[27px] leading-tight font-extralight text-white">C&apos;est fait.</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5" style={{ color: "rgba(255,255,255,0.72)" }}>
              {dayTitle(day)}
              {doneStats && doneStats.minutes > 0 && <> · {doneStats.minutes} min</>}
              {doneStats && doneStats.kcal > 0 && <> · <b className="font-bold" style={{ color: "#EF9F27" }}>{doneStats.kcal} kcal</b></>}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[13.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(4px)" }}
            >
              <Play size={12} strokeWidth={2.5} fill="#fff" /> Refaire la séance
            </motion.button>
          </>
        )}

        {state === "setup" && (
          <>
            <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase mb-1" style={{ color: "#C9B8FF" }}>
              On fait connaissance
            </p>
            {/* La question n'apparaît QUE quand l'app ne sait pas — même logique que Nutrition */}
            <h2 className="text-[26px] leading-tight font-extralight text-white">On s&apos;entraîne comment&nbsp;?</h2>
            <p className="text-[12.5px] font-light mt-1.5 mb-3.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Quelques questions, et l&apos;IA construit ta semaine idéale.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onOrganise}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 26px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.25)" }}
            >
              ✦ Créer mon planning
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ② Cartes de bifurcation — J'improvise / Je choisis
   ════════════════════════════════════════════════════════════════════ */
/** « Je choisis » : éventail de 3 cartes-séances déployées sur un fond en
    profondeur → « plusieurs séances, choisis la tienne ». Cartes distinctes
    (liseré clair + ombre = carte, pas écran), rotation en éventail, dégagées
    du texte. Ancrage horizontal au centre (dx en px) → forme identique quelle
    que soit la largeur de la carte. */
/** Écartement horizontal responsive : serré sur mobile (plancher 30px), il
    s'élargit avec la largeur de la carte (13cqw) jusqu'à 72px → l'éventail
    occupe plus de place là où il y a de la largeur (nécessite container-type
    sur le parent). */
const CHOISIS_DX = "clamp(30px, 13cqw, 72px)";
/** L'éventail grandit avec la HAUTEUR de la carte (cqh) : plus haute sur desktop
    (148 → 188) → cartes de l'éventail plus grandes. La formule `top` verrouille
    le bas de la carte pivotée à une ligne constante (100cqh − 64px), donc l'écart
    au texte reste ~constant à toute hauteur (`sway` compense le débord de la
    rotation). Nécessite `container-type: size` sur le parent. */
type FanCard = { img: string; pos: string; wv: string; hv: string; dir: -1 | 0 | 1; rot: number; z: number; sway: number };
const CHOISIS_FAN: FanCard[] = [
  { img: "legs-squat",    pos: "center 32%", wv: "clamp(66px,44cqh,100px)", hv: "clamp(70px,47cqh,104px)", dir: -1, rot: -11, z: 1, sway: 0.095 },
  { img: "pull-traction", pos: "center 26%", wv: "clamp(66px,44cqh,100px)", hv: "clamp(70px,47cqh,104px)", dir:  1, rot:  11, z: 2, sway: 0.095 },
  { img: "push-couche",   pos: "center 30%", wv: "clamp(75px,51cqh,112px)", hv: "clamp(80px,54cqh,120px)", dir:  0, rot:   0, z: 3, sway: 0    },
];

function ForkCard({ kind, count, onClick }: {
  kind: "improvise" | "choisis";
  count?: number;
  onClick: () => void;
}) {
  const isIA = kind === "improvise";
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="rounded-[20px] overflow-hidden relative cursor-pointer text-left border-none p-0 h-[148px] md:h-[188px]"
      style={{ boxShadow: "0 8px 26px rgba(var(--accent-rgb),0.14)" }}
    >
      {isIA ? (
        <>
          <Photo img={WIDGET.improvise.img} pos={WIDGET.improvise.pos}
            style={{ position: "absolute", inset: 0 }} />
          <Sparkles size={24} strokeWidth={1.5} className="absolute top-3 right-3" style={{ color: "#E4D6FF", opacity: 0.9 }} />
          <Sparkles size={11} strokeWidth={1.5} className="absolute top-10 right-11" style={{ color: "#C9B8FF", opacity: 0.5 }} />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ isolation: "isolate", containerType: "size" }}>
          {/* fond en profondeur — la bibliothèque derrière l'éventail */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/entrainement/pull-rowing.webp)", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(4px) brightness(0.42)", transform: "scale(1.12)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,6,14,0.5), rgba(8,6,14,0.72))" }} />
          {/* halo — centré sur la carte du milieu, suit sa hauteur */}
          <div style={{ position: "absolute", left: "50%", top: "calc(100cqh - 64px - (clamp(80px,54cqh,120px) / 2))", width: 96, height: 96, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(155,130,255,0.35), transparent 68%)", filter: "blur(6px)" }} />
          {/* l'éventail de séances — grandit avec la hauteur de la carte */}
          {CHOISIS_FAN.map((c) => (
            <div key={c.img} style={{
              position: "absolute", left: "50%",
              top: c.sway
                ? `calc(100cqh - 64px - ${c.hv} - (${c.wv} * ${c.sway}))`
                : `calc(100cqh - 64px - ${c.hv})`,
              width: c.wv, height: c.hv, zIndex: c.z,
              transform: `translateX(calc(-50% + (${c.dir} * ${CHOISIS_DX}))) rotate(${c.rot}deg)`,
              transformOrigin: "center",
              borderRadius: 9,
              backgroundImage: `url(/entrainement/${c.img}.webp)`, backgroundSize: "cover", backgroundPosition: c.pos,
              boxShadow: "0 7px 15px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1.5px rgba(255,255,255,0.55)",
            }} />
          ))}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-8"
        style={{ background: "linear-gradient(to top, rgba(8,6,14,0.9) 25%, transparent)" }}>
        <p className="text-[8.5px] font-extrabold tracking-[0.18em] uppercase mb-0.5" style={{ color: "#C9B8FF" }}>
          {isIA ? "L'IA s'adapte" : "Mes séances"}
        </p>
        <p className="text-[16.5px] font-semibold text-white leading-tight">{isIA ? "J'improvise" : "Je choisis"}</p>
        <p className="text-[10.5px] font-normal mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.68)" }}>
          {isIA ? "Ton temps, ton matériel — elle crée" : `${count ?? 0} séances, choisis la tienne`}
        </p>
      </div>
    </motion.button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ③ Ma semaine — 7 pastilles + « Organiser ». Une phrase qui raconte,
   pas un tableau.
   ════════════════════════════════════════════════════════════════════ */
function WeekStrip({ week, todayIdx, onOrganise }: {
  week: PlanningDay[] | null;
  todayIdx: number;
  onOrganise: () => void;
}) {
  const doneCount = week?.filter((d) => d.status === "done").length ?? 0;
  const todayDay = week?.[todayIdx] ?? null;

  let story: React.ReactNode = null;
  if (week) {
    if (todayDay?.status === "done") {
      story = <><b style={{ color: "#2BD4A0", fontWeight: 800 }}>{doneCount} séance{doneCount > 1 ? "s" : ""} faite{doneCount > 1 ? "s" : ""}</b> — dont celle d&apos;aujourd&apos;hui. 💪</>;
    } else if (hasSeance(todayDay)) {
      story = doneCount > 0
        ? <><b style={{ color: "#2BD4A0", fontWeight: 800 }}>{doneCount} séance{doneCount > 1 ? "s" : ""} faite{doneCount > 1 ? "s" : ""}</b> — la {doneCount + 1}<sup>e</sup> t&apos;attend aujourd&apos;hui.</>
        : <>Ta semaine commence — <b style={{ color: "var(--text-1)", fontWeight: 700 }}>première séance aujourd&apos;hui</b>.</>;
    } else {
      story = doneCount > 0
        ? <><b style={{ color: "#2BD4A0", fontWeight: 800 }}>{doneCount} séance{doneCount > 1 ? "s" : ""} faite{doneCount > 1 ? "s" : ""}</b> — repos aujourd&apos;hui.</>
        : <>Repos aujourd&apos;hui — ta semaine se construit.</>;
    }
  }

  return (
    <div className="rounded-[20px] px-4 pt-3.5 pb-3.5"
      style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.14)", boxShadow: "0 6px 22px rgba(var(--accent-rgb),0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onOrganise} className="flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer">
          <span className="text-[13.5px] font-bold" style={{ color: "var(--text-1)" }}>Ma semaine</span>
          <ChevronRight size={13} strokeWidth={2.6} style={{ color: "var(--text-3)" }} />
        </button>
        <button onClick={onOrganise}
          className="flex items-center gap-1 text-[11.5px] font-bold cursor-pointer bg-transparent border-none p-0"
          style={{ color: "var(--accent)" }}>
          <CalendarDays size={12} strokeWidth={2.2} />
          Organiser
        </button>
      </div>

      <div className="flex gap-1.5">
        {DAY_LETTERS.map((letter, i) => {
          const d = week?.[i] ?? null;
          const isToday = i === todayIdx;
          const isDone = d?.status === "done";
          const isSeance = hasSeance(d);
          const isPast = i < todayIdx;
          const art = isSeance ? resolveArt({ title: `${d!.title} ${d!.type}` }) : null;

          return (
            <button key={i} onClick={onOrganise}
              aria-label={`${DAY_FULL[i]} — ${isSeance ? dayTitle(d!) : "repos"}`}
              className="relative flex-1 rounded-[12px] overflow-hidden cursor-pointer border-none p-0 block"
              style={{
                height: 60, background: "#0f0d17",
                outline: isToday ? "2px solid #8B5CF6" : undefined,
                outlineOffset: isToday ? 2 : undefined,
                boxShadow: isToday ? "0 5px 16px rgba(139,92,246,0.4)" : undefined,
                opacity: isPast && !isDone && isSeance ? 0.5 : 1,
              }}>
              {isSeance && art ? (
                <>
                  <Photo img={art.img} pos="center 22%" style={{ position: "absolute", inset: 0 }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,4,9,0.8) 0%, rgba(5,4,9,0.12) 52%, transparent)" }} />
                  {isDone && (
                    <span className="absolute top-1 right-1 rounded-full flex items-center justify-center"
                      style={{ width: 14, height: 14, background: "#1FBF8C", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                      <Check size={9} strokeWidth={3.4} style={{ color: "#06281E" }} />
                    </span>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(var(--accent-rgb),0.22)", borderRadius: 12 }}>
                  <Moon size={13} strokeWidth={1.8} style={{ color: "var(--text-3)", opacity: 0.7 }} />
                </div>
              )}
              <span className="absolute inset-x-0 bottom-[3px] text-center text-[8.5px] font-extrabold tracking-wide"
                style={{
                  color: isSeance ? "rgba(255,255,255,0.92)" : "var(--text-3)",
                  textShadow: isSeance ? "0 1px 4px rgba(0,0,0,0.7)" : "none",
                }}>
                {letter}
              </span>
            </button>
          );
        })}
      </div>

      {story && (
        <p className="text-[11px] font-medium mt-3" style={{ color: "var(--text-3)" }}>{story}</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ④ Ton élan — la preuve qu'on avance. Série de semaines actives +
   totaux de la semaine + 7 derniers jours. Teal = progrès. Aucune
   culpabilité : un jour vide est un trait discret, jamais un reproche.
   ════════════════════════════════════════════════════════════════════ */
type ElanData = {
  bars: { label: string; min: number; done: boolean; today: boolean }[];
  sessions: number; minutes: number; kcal: number; streak: number; hasHistory: boolean;
  prevMinutes: number;   // total de la semaine dernière (pour la comparaison)
  record: number;        // plus longue séance sur la fenêtre (8 sem.)
};

const fmtDur = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;

function ElanStrip({ data, onOpen }: { data: ElanData | null; onOpen: () => void }) {
  if (!data) return null; // le temps du chargement : rien, pas de flash
  const { bars, sessions, minutes, kcal, streak, hasHistory } = data;
  const maxMin = Math.max(1, ...bars.map((b) => b.min));
  const barH = (min: number) => (min <= 0 ? 4 : Math.round(6 + (min / maxMin) * 30));

  return (
    <motion.button
      whileTap={{ scale: 0.98 }} onClick={onOpen}
      className="w-full text-left cursor-pointer block rounded-[20px] px-4 pt-3.5 pb-3.5"
      style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(43,212,160,0.20)", boxShadow: "0 6px 22px rgba(43,212,160,0.08)" }}>
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-[13.5px] font-bold flex items-center gap-0.5" style={{ color: "var(--text-1)" }}>
          Ton élan
          <ChevronRight size={13} strokeWidth={2.6} style={{ color: "var(--text-3)" }} />
        </p>
        {streak > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-extrabold"
            style={{ background: "rgba(239,159,39,0.14)", color: "#EF9F27" }}>
            <Flame size={12} strokeWidth={2.4} fill="#EF9F27" />
            {streak} sem.
          </span>
        )}
      </div>

      {hasHistory ? (
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-[7px]">
            {bars.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="w-[9px] rounded-full" style={{
                  height: barH(b.min),
                  background: b.today ? "#2BD4A0" : b.done ? "rgba(43,212,160,0.55)" : "rgba(255,255,255,0.10)",
                }} />
                <span className="text-[8.5px] font-bold" style={{ color: b.today ? "#2BD4A0" : "var(--text-3)" }}>{b.label}</span>
              </div>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[9.5px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: "var(--text-3)" }}>Cette semaine</p>
            <p className="leading-none">
              <span className="text-[22px] font-extrabold" style={{ color: "#2BD4A0" }}>{sessions}</span>
              <span className="text-[12px] font-semibold ml-1" style={{ color: "var(--text-2)" }}>séance{sessions > 1 ? "s" : ""}</span>
            </p>
            <p className="text-[11px] font-semibold mt-1.5 flex items-center justify-end gap-1.5" style={{ color: "var(--text-3)" }}>
              <Clock size={11} strokeWidth={2.4} />{fmtDur(minutes)}
              <span className="w-[3px] h-[3px] rounded-full" style={{ background: "var(--text-3)" }} />
              <Zap size={11} strokeWidth={2.4} style={{ color: "#EF9F27" }} fill="#EF9F27" />
              <span style={{ color: "#EF9F27" }}>{kcal.toLocaleString("fr-FR")} kcal</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 pb-0.5">
          <div className="flex items-end gap-[7px]">
            {bars.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="w-[9px] rounded-full" style={{ height: 8 + (i % 3) * 6, background: "rgba(255,255,255,0.08)" }} />
                <span className="text-[8.5px] font-bold" style={{ color: "var(--text-3)" }}>{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] font-medium leading-snug" style={{ color: "var(--text-3)" }}>
            Ton élan démarre à la première séance. 💪
          </p>
        </div>
      )}
    </motion.button>
  );
}

/** Sheet « Ton élan » — le détail au tap : graphique agrandi à gauche,
    chiffres à droite, comparaison vs semaine dernière. Unité discrète
    (« en minutes ») pour ne pas lasser les habitués. Zéro culpabilité :
    une semaine plus légère devient un objectif, pas un reproche. */
function ElanSheet({ data, onClose }: { data: ElanData; onClose: () => void }) {
  const { bars, sessions, minutes, kcal, streak, prevMinutes, record } = data;
  const maxMin = Math.max(1, ...bars.map((b) => b.min));
  const barH = (min: number) => (min <= 0 ? 6 : Math.round(10 + (min / maxMin) * 100));
  const avg = sessions > 0 ? Math.round(minutes / sessions) : 0;
  const delta = minutes - prevMinutes;

  return (
    <Sheet onClose={onClose} maxHeight="72vh">
      <div className="px-5 pt-2 pb-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-bold" style={{ color: "var(--text-1)" }}>Ton élan</p>
          {streak > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-extrabold"
              style={{ background: "rgba(239,159,39,0.14)", color: "#EF9F27" }}>
              <Flame size={13} strokeWidth={2.4} fill="#EF9F27" />
              {streak} sem.
            </span>
          )}
        </div>
        <p className="text-[11px] font-medium mt-0.5 mb-5" style={{ color: "var(--text-3)" }}>
          7 derniers jours · en minutes
        </p>

        <div className="flex items-end gap-5">
          {/* Graphique agrandi */}
          <div className="flex-1 flex items-end justify-between" style={{ height: 150 }}>
            {bars.map((b, i) => (
              <div key={i} className="flex flex-col items-center justify-end gap-1.5 h-full">
                {b.min > 0 && b.min === maxMin && (
                  <span className="text-[9.5px] font-extrabold" style={{ color: "#2BD4A0" }}>{b.min} min</span>
                )}
                <span className="w-[12px] rounded-full" style={{
                  height: barH(b.min),
                  background: b.today && b.min > 0 ? "#2BD4A0"
                    : b.done ? "rgba(43,212,160,0.5)" : "rgba(255,255,255,0.09)",
                  boxShadow: b.today && b.min > 0 ? "0 0 14px rgba(43,212,160,0.4)" : undefined,
                }} />
                <span className="text-[9px] font-bold" style={{ color: b.today ? "#2BD4A0" : "var(--text-3)" }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* Détails */}
          <div style={{ width: 128 }}>
            {([
              ["Séances", sessions > 0 ? String(sessions) : "—", "#2BD4A0"],
              ["Temps", minutes > 0 ? fmtDur(minutes) : "—", "var(--text-1)"],
              ["Calories", kcal > 0 ? kcal.toLocaleString("fr-FR") : "—", "#EF9F27"],
              ["Moyenne", avg > 0 ? `${avg} min` : "—", "var(--text-1)"],
              ["Record", record > 0 ? `${record} min` : "—", "var(--text-1)"],
            ] as const).map(([k, v, c], i, arr) => (
              <div key={k} className="flex items-baseline justify-between py-[7px]"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span className="text-[10.5px] font-semibold" style={{ color: "var(--text-3)" }}>{k}</span>
                <span className="text-[13px] font-extrabold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparaison vs semaine dernière — jamais un reproche */}
        {prevMinutes > 0 && delta > 0 && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-[13px] text-[11.5px] font-bold"
            style={{ background: "rgba(43,212,160,0.09)", border: "1px solid rgba(43,212,160,0.22)", color: "#2BD4A0" }}>
            ▲ +{delta} min vs la semaine dernière — ça monte.
          </div>
        )}
        {prevMinutes > 0 && delta <= 0 && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-[13px] text-[11.5px] font-semibold"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-2)" }}>
            Encore {Math.abs(delta) + 1} min pour égaler la semaine dernière.
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « Je choisis » — catalogue Vaiiya + bibliothèque perso FUSIONNÉS.
   Un seul jeu de filtres, badge « Perso » doré, actions perso sous la tuile.
   ════════════════════════════════════════════════════════════════════ */
type MergedSession = WorkoutSession & { perso: boolean };

/* Difficulté → nombre de pastilles allumées. L'orange (énergie, système D)
   dit l'intensité ; on garde le teal pour le corps, la lavande pour l'identité. */
const DIFF_LEVEL: Record<WorkoutSession["difficulty"], number> = {
  "Débutant": 1, "Intermédiaire": 2, "Avancé": 3,
};

/* Dé-doublonnage des photos DANS une rangée. resolveArt est déterministe :
   deux séances qui matchent la même règle (ou tombent sur le même hash)
   reçoivent la MÊME photo. Ici on parcourt la rangée dans l'ordre et, dès
   qu'une image est déjà prise, on tourne vers une autre variante libre de la
   même famille — la 1re carte garde sa photo « juste », les suivantes varient.
   Une rangée ne répète donc plus une photo tant qu'il reste des variantes. */
function dedupeRowArt(list: MergedSession[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const s of list) {
    const art = resolveArt({ title: s.title, category: s.category, muscles: s.muscles });
    let img = art.img;
    if (used.has(img)) {
      const variants = FAMILY[art.fam].variants;
      const start = variants.indexOf(img);
      for (let k = 1; k <= variants.length; k++) {
        const cand = variants[(start + k) % variants.length];
        if (!used.has(cand)) { img = cand; break; }
      }
    }
    used.add(img);
    out.set(s.id, img);
  }
  return out;
}

function SessionTile({ session, onStart, onManage, imgOverride }: {
  session: MergedSession;
  onStart: (s: MergedSession) => void;
  onManage: (s: MergedSession) => void;
  imgOverride?: string;
}) {
  const tileArt = resolveArt({ title: session.title, category: session.category, muscles: session.muscles });
  const img = imgOverride ?? tileArt.img;
  const level = DIFF_LEVEL[session.difficulty];
  // Le différenciateur : les muscles. À défaut (séance sans muscles listés),
  // la famille de mouvement (« Poussée », « Tirage »…) fait un repli parlant.
  const muscles = session.muscles.filter(Boolean).slice(0, 3).join(" · ") || tileArt.label;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
      {/* La tuile = un seul geste : lancer. Photo NATURELLE plein cadre.
          Quatre repères à leur place : difficulté (pastilles orange, coin
          haut-gauche) · durée (badge, coin haut-droite) · nom · muscles
          (lavande maison). Les coins portent la méta, le bas l'identité. */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onStart(session)}
        className="w-full rounded-[18px] overflow-hidden relative cursor-pointer border-none p-0 block"
        style={{ aspectRatio: "3 / 4", boxShadow: "0 10px 26px rgba(0,0,0,0.2)" }}
        aria-label={`Lancer : ${session.title}`}
      >
        <Photo img={img} pos="center 20%" style={{ position: "absolute", inset: 0 }} />

        {/* Difficulté — pastilles (orange = énergie/intensité, système D) */}
        <span className="absolute top-2 left-2 flex items-center gap-[3px] px-[7px] py-[4px] rounded-full"
          style={{ background: "rgba(8,6,14,0.3)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.22)" }}
          aria-label={`Difficulté : ${session.difficulty}`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1 h-1 rounded-full"
              style={{ background: i < level ? "#EF9F27" : "rgba(255,255,255,0.3)" }} />
          ))}
        </span>

        {/* Durée — badge discret */}
        <span className="absolute top-2 right-2 px-2 py-[3px] rounded-full text-[8px] font-extrabold tracking-[0.05em] text-white"
          style={{ background: "rgba(8,6,14,0.3)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.34)" }}>
          {session.duration} MIN
        </span>

        {/* Scrim bas : nom (blanc) + muscles (lavande = notre identité) */}
        <div className="absolute inset-x-0 bottom-0 pl-2.5 pb-3 pt-12 flex flex-col items-start text-left"
          style={{
            paddingRight: session.perso ? 34 : 10,
            background: "linear-gradient(to top, rgba(6,5,10,0.9) 32%, rgba(6,5,10,0.4) 66%, transparent)",
          }}>
          <p className="text-[12.5px] font-black uppercase text-white leading-[1.12] tracking-tight"
            style={{
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}>
            {session.title}
          </p>
          <p className="text-[10.5px] font-semibold mt-1 leading-snug"
            style={{
              color: "#C9B8FF",
              display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
              textShadow: "0 1px 6px rgba(0,0,0,0.45)",
            }}>
            {muscles}
          </p>
        </div>
      </motion.button>

      {/* Gérer (perso) — un ⋯ discret en bas-droite, hors du chemin du nom */}
      {session.perso && (
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => onManage(session)}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
          style={{ background: "rgba(8,6,14,0.5)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.13)" }}
          aria-label={`Gérer : ${session.title}`}>
          <MoreHorizontal size={14} strokeWidth={2.2} style={{ color: "rgba(255,255,255,0.88)" }} />
        </motion.button>
      )}
    </motion.div>
  );
}

/* Menu « Gérer » d'une séance perso — remplace la barre de réglages sous
   les tuiles : la grille reste pure, les réglages ont leur propre écran. */
function ManageSheet({ session, onClose, onEdit, onDelete, onVisibilityChange }: {
  session: MergedSession;
  onClose: () => void;
  onEdit: (s: WorkoutSession) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, vis: Visibility) => void;
}) {
  const art = resolveArt({ title: session.title, category: session.category, muscles: session.muscles });
  const [vis, setVis] = useState<Visibility>((session.visibility ?? "private") as Visibility);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(12,8,22,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.14)",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.4)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        </div>

        {/* La séance dont on parle — sa vignette, son nom */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-4">
          <Photo img={art.img} pos="center 20%"
            className="rounded-xl flex-shrink-0" style={{ width: 46, height: 61 }} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight truncate" style={{ color: "var(--text-1)" }}>{session.title}</p>
            <p className="text-[10.5px] font-medium mt-1" style={{ color: "var(--text-3)" }}>
              Séance perso · {session.duration} min
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div aria-hidden className="h-px mx-5" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />

        {/* Modifier */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onEdit(session)}
          className="w-full flex items-center gap-3 px-5 py-3.5 cursor-pointer text-left border-none bg-transparent">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
            <Pencil size={14} strokeWidth={1.9} style={{ color: "var(--accent)" }} />
          </span>
          <span className="flex-1 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Modifier la séance</span>
          <ChevronRight size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        </motion.button>

        <div aria-hidden className="h-px mx-5" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />

        {/* Visibilité — les 3 choix visibles d'un coup, plus de cycle mystère */}
        <div className="px-5 pt-3.5 pb-1">
          <p className="text-[9.5px] font-extrabold tracking-[0.14em] uppercase mb-2" style={{ color: "var(--text-3)" }}>
            Qui peut la voir ?
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {VIS_ORDER.map((k) => {
              const cfg = VIS_CONFIG[k];
              const CfgIcon = cfg.icon;
              const active = vis === k;
              return (
                <motion.button key={k} whileTap={{ scale: 0.95 }}
                  onClick={() => { setVis(k); onVisibilityChange(session.id, k); }}
                  className="h-[52px] rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
                  style={active
                    ? { background: "rgba(var(--accent-rgb),0.1)", border: "1.5px solid rgba(var(--accent-rgb),0.55)" }
                    : { background: "rgba(var(--tint-violet-rgb),0.4)", border: "1.5px solid transparent" }}
                  aria-pressed={active}>
                  <CfgIcon size={14} strokeWidth={2} style={{ color: active ? "var(--accent)" : "var(--text-3)" }} />
                  <span className="text-[9.5px] font-bold" style={{ color: active ? "var(--accent)" : "var(--text-3)" }}>{cfg.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Supprimer — à l'écart, en rouge, aucune ambiguïté */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onDelete(session.id)}
          className="w-full flex items-center gap-3 px-5 py-3.5 mt-2 mb-1 cursor-pointer text-left border-none bg-transparent">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(252,129,129,0.1)" }}>
            <Trash2 size={14} strokeWidth={1.9} style={{ color: "#FC8181" }} />
          </span>
          <span className="text-[13px] font-semibold" style={{ color: "#FC8181" }}>Supprimer la séance</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* Largeur d'une carte du carrousel — 2,2 cartes visibles sur téléphone (peek). */
const ROW_CARD_W = 150;

/* Une rangée = un slide horizontal. Sur téléphone : swipe natif. Sur PC :
   deux flèches discrètes dans l'en-tête (pas de barre de scroll moche). */
function SessionRow({ label, count, children }: {
  label: string; count: number; children: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * (ROW_CARD_W + 12) * 2, behavior: "smooth" });

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <span className="text-[10px] font-extrabold tracking-[0.16em] uppercase" style={{ color: "var(--text-2)" }}>{label}</span>
        <span className="text-[9.5px] font-bold" style={{ color: "var(--text-3)" }}>{count}</span>
        <span aria-hidden className="flex-1 h-px" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />
        {/* Flèches — desktop uniquement, discrètes */}
        <div className="hidden md:flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.86 }} onClick={() => nudge(-1)}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.6)" }} aria-label="Précédent">
            <ChevronLeft size={13} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.86 }} onClick={() => nudge(1)}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.6)" }} aria-label="Suivant">
            <ChevronRight size={13} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
          </motion.button>
        </div>
      </div>
      {/* -mx-5 px-5 : les cartes filent jusqu'au bord tout en restant alignées */}
      <div ref={scroller} className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5"
        style={{ scrollbarWidth: "none", scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   L'ENTONNOIR — grandes collections d'intention (réf. validée : ShapeYou).
   Volontairement chevauchantes : une séance vit dans PLUSIEURS collections
   (multi-appartenance par prédicat). Une collection vide reste une porte
   ouverte : on la montre « Bientôt », on ne la cache pas — la banque se
   remplira. Les photos sont naturelles, les titres blancs font le reste.
   ════════════════════════════════════════════════════════════════════ */
type CatDef = {
  id: string;
  name: string;
  tag: string;                                   // la promesse, en une ligne
  img: string;
  pos?: string;
  match: (s: MergedSession, hay: string) => boolean;
};

const hayOf = (s: MergedSession) =>
  `${s.title} ${s.subtitle ?? ""} ${(s.muscles ?? []).join(" ")}`.toLowerCase();

const CATALOG: CatDef[] = [
  { id: "tiennes", name: "Les tiennes", tag: "Tes créations — elles vivent aussi dans les autres collections.",
    img: "cat-tiennes", match: (s) => s.perso },
  { id: "express", name: "Séances express", tag: "20 minutes ou moins — zéro excuse.",
    img: "cat-express", match: (s) => s.duration <= 20 },
  { id: "masse", name: "Prise de masse", tag: "Construire du muscle, brique par brique.",
    img: "cat-masse", match: (s, hay) => /masse|hypertroph|volume/.test(hay) || (s.category === "force" && s.duration >= 40) },
  { id: "perte", name: "Perte de poids", tag: "Brûler, sans se cramer.",
    img: "cat-perte", match: (s, hay) => /perte|brûle|brule|minceur|sèche|seche|calorie/.test(hay) || s.category === "cardio" },
  { id: "renfo", name: "Renfo musculaire", tag: "Plus fort, partout, pour de vrai.",
    img: "cat-renfo", match: (s, hay) => s.category === "force" || /renfo|force|muscu/.test(hay) },
  { id: "cardiohiit", name: "Cardio & HIIT", tag: "Le souffle court, le cœur solide.",
    img: "cat-cardiohiit", match: (s, hay) => s.category === "cardio" || /cardio|hiit|fractionn|endurance|sprint|course|vélo|velo/.test(hay) },
  { id: "abdos", name: "Abdos & gainage", tag: "Le centre qui tient tout le reste.",
    img: "cat-abdos", match: (_s, hay) => /abdo|gainage|core|planche|oblique|sangle|ventre/.test(hay) },
  { id: "jambes", name: "Jambes & fessiers", tag: "La base — on ne triche pas avec les jambes.",
    img: "cat-jambes", match: (_s, hay) => /jambe|fessier|squat|cuisse|mollet|ischio|glute|\bleg|bas du corps|fente/.test(hay) },
  { id: "haut", name: "Haut du corps", tag: "Dos, pecs, épaules, bras — l'armure.",
    img: "cat-haut", match: (_s, hay) => /pec|\bdos\b|épaule|epaule|bras|biceps|triceps|haut du corps|push|pull|tirage|traction|rowing|upper|poussé/.test(hay) },
  { id: "fullbody", name: "Full body", tag: "Tout le corps, une seule séance.",
    img: "cat-fullbody", match: (s, hay) => s.category === "fullbody" || /full|complet|corps entier|total/.test(hay) },
  { id: "salle", name: "À la salle", tag: "Machines, barres, charges — ton terrain.",
    img: "cat-salle", match: (_s, hay) => /salle|machine|barre|rack|poulie|banc/.test(hay) },
  { id: "sansmateriel", name: "Sans matériel", tag: "Ton corps suffit — partout, tout le temps.",
    img: "cat-sansmateriel", match: (_s, hay) => /sans mat|poids du corps|maison|nomade/.test(hay) },
  { id: "debuter", name: "Débuter & reprendre", tag: "Le premier pas compte double.",
    img: "cat-debuter", match: (s, hay) => s.difficulty === "Débutant" || /débutant|debutant|starter|reprise|découverte|decouverte|doux/.test(hay) },
  { id: "mobilite", name: "Mobilité & posture", tag: "Bouger mieux avant de bouger plus.",
    img: "cat-mobilite", match: (s, hay) => s.category === "mobilite" || /mobilit|étirement|etirement|souplesse|posture|stretch/.test(hay) },
  { id: "recup", name: "Récupération", tag: "Le muscle se construit au repos.",
    img: "cat-recup", match: (_s, hay) => /récup|recup|détente|detente|relax|respiration|repos/.test(hay) },
  { id: "defis", name: "Défis", tag: "Un max, un chrono, un record à battre.",
    img: "cat-defis", match: (_s, hay) => /défi|defi|challenge|\bmax\b|record/.test(hay) },
  { id: "conseils", name: "Conseils & progresser", tag: "Comprendre, c'est déjà progresser.",
    img: "cat-conseils", match: () => false },
];

/** Tuile de collection — photo naturelle, titre blanc centré, compte.
    Une collection vide dit « Bientôt » : la porte reste ouverte. */
function CatTile({ cat, count, onOpen }: { cat: CatDef; count: number; onOpen: () => void }) {
  const sub = count > 0
    ? `${count} séance${count > 1 ? "s" : ""}`
    : cat.id === "tiennes" ? "À toi de jouer" : "Bientôt";
  return (
    <motion.button
      whileTap={{ scale: 0.97 }} onClick={onOpen}
      className="relative w-full rounded-[18px] overflow-hidden cursor-pointer border-none p-0 block"
      style={{ aspectRatio: "3 / 4", boxShadow: "0 10px 26px rgba(0,0,0,0.22)" }}
      aria-label={`${cat.name} — ${sub}`}
    >
      <Photo img={cat.img} pos={cat.pos} style={{ position: "absolute", inset: 0 }} />
      <div className="absolute inset-x-0 bottom-0 px-2.5 pb-3.5 pt-14 flex flex-col items-center text-center"
        style={{ background: "linear-gradient(to top, rgba(6,5,10,0.88) 20%, rgba(6,5,10,0.35) 62%, transparent)" }}>
        <p className="text-[14.5px] font-black uppercase text-white leading-[1.08] tracking-tight"
          style={{ textWrap: "balance", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
          {cat.name}
        </p>
        <p className="text-[9px] font-bold mt-1" style={{ color: "rgba(255,255,255,0.62)" }}>{sub}</p>
      </div>
    </motion.button>
  );
}

function ChooseSheet({ sessions, loading, onClose, onStart, onCreate, onEdit, onDelete, onVisibilityChange }: {
  sessions: MergedSession[];
  loading: boolean;
  onClose: () => void;
  onStart: (s: MergedSession) => void;
  onCreate: () => void;
  onEdit: (s: WorkoutSession) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, vis: Visibility) => void;
}) {
  const [catId, setCatId] = useState<string | null>(null);
  const [manage, setManage] = useState<MergedSession | null>(null);

  const cat = catId ? CATALOG.find((c) => c.id === catId) ?? null : null;

  /* Multi-appartenance : chaque collection filtre la banque par prédicat. */
  const matched = cat ? sessions.filter((s) => cat.match(s, hayOf(s))) : [];
  const vaiiya = matched.filter((s) => !s.perso);
  const perso = matched.filter((s) => s.perso);

  /* Photo par séance, dé-doublonnée PAR RANGÉE (Vaiiya et « les tiennes »
     indépendamment) : deux cartes d'une même rangée ne tombent plus sur la
     même image. Fusionné en une map id → image (les id sont uniques). */
  const artById = new Map<string, string>();
  dedupeRowArt(vaiiya).forEach((img, id) => artById.set(id, img));
  dedupeRowArt(perso).forEach((img, id) => artById.set(id, img));

  const rowTile = (s: MergedSession) => (
    <div key={s.id} className="flex-shrink-0" style={{ width: ROW_CARD_W, scrollSnapAlign: "start" }}>
      <SessionTile session={s} onStart={onStart} onManage={setManage} imgOverride={artById.get(s.id)} />
    </div>
  );

  const createCard = (
    <motion.button
      whileTap={{ scale: 0.96 }} onClick={onCreate}
      className="w-full rounded-[18px] flex flex-col items-center justify-center gap-2 cursor-pointer px-3"
      style={{ aspectRatio: "3 / 4", background: "rgba(var(--tint-violet-rgb),0.25)", border: "2px dashed rgba(var(--accent-rgb),0.32)" }}
    >
      <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
        <Plus size={17} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
      </span>
      <span className="text-[11.5px] font-bold text-center" style={{ color: "var(--text-2)" }}>Créer la mienne</span>
      <span className="text-[9px] font-medium text-center leading-snug" style={{ color: "var(--text-3)" }}>
        Elle rejoint tes collections
      </span>
    </motion.button>
  );

  return (
    <>
    <Sheet onClose={onClose} height="94dvh" maxHeight="94dvh">
      {/* Header — niveau 1 : l'invitation. Niveau 2 : retour + nom + promesse. */}
      <div className="px-5 pt-2 pb-3 flex-shrink-0 flex items-center gap-3">
        {cat ? (
          <>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCatId(null)}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Retour aux collections">
              <ChevronLeft size={15} strokeWidth={2.2} style={{ color: "var(--text-2)" }} />
            </motion.button>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold leading-tight truncate" style={{ color: "var(--text-1)" }}>{cat.name}</h2>
              <p className="text-[10.5px] font-light mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{cat.tag}</p>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <h2 className="text-[23px] font-light leading-tight" style={{ color: "var(--text-1)" }}>
              Entraînements
            </h2>
            <p className="text-[11.5px] font-light mt-1" style={{ color: "var(--text-3)" }}>
              Un but, une envie — <span className="font-semibold" style={{ color: "var(--text-2)" }}>{sessions.length} séances t&apos;attendent</span>
            </p>
          </div>
        )}
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
          <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        </motion.button>
      </div>

      {/* Le corps — remonté par clé : l'entrée glisse dans le sens du voyage */}
      <motion.div
        key={cat ? cat.id : "collections"}
        initial={{ opacity: 0, x: cat ? 26 : -26 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="overflow-y-auto px-5 flex-1"
        style={{ scrollbarWidth: "none", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        {!cat ? (
          /* ── Niveau 1 : la grille des collections ── */
          loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[18px] animate-pulse"
                  style={{ aspectRatio: "3 / 4", background: "rgba(var(--tint-violet-rgb),0.5)" }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CATALOG.map((c) => (
                <CatTile key={c.id} cat={c}
                  count={sessions.reduce((n, s) => n + (c.match(s, hayOf(s)) ? 1 : 0), 0)}
                  onOpen={() => setCatId(c.id)} />
              ))}
            </div>
          )
        ) : cat.id === "tiennes" ? (
          /* ── Niveau 2, « Les tiennes » : ta bibliothèque + créer ── */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {perso.map((s) => (
              <SessionTile key={s.id} session={s} onStart={onStart} onManage={setManage} imgOverride={artById.get(s.id)} />
            ))}
            {createCard}
          </div>
        ) : matched.length === 0 ? (
          /* ── Niveau 2, collection vide : la porte reste ouverte ── */
          <div className="flex flex-col items-center text-center pt-12 px-6">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "rgba(var(--accent-rgb),0.1)" }}>
              <Sparkles size={18} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
            </span>
            <p className="text-[14.5px] font-semibold" style={{ color: "var(--text-1)" }}>Cette collection arrive</p>
            <p className="text-[11.5px] font-light mt-1.5 leading-relaxed max-w-[260px]" style={{ color: "var(--text-3)" }}>
              On la remplit séance après séance. En attendant, crée la tienne — si elle colle, elle apparaîtra ici.
            </p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onCreate}
              className="mt-5 px-5 h-10 rounded-full text-[12px] font-bold text-white cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 6px 18px rgba(139,92,246,0.35)" }}>
              Créer la mienne
            </motion.button>
          </div>
        ) : (
          /* ── Niveau 2 : rangées slidables Vaiiya / Les tiennes ── */
          <>
            {vaiiya.length > 0 && (
              <SessionRow label="Vaiiya" count={vaiiya.length}>
                {vaiiya.map(rowTile)}
              </SessionRow>
            )}
            {perso.length > 0 && (
              <SessionRow label="Les tiennes" count={perso.length}>
                {perso.map(rowTile)}
              </SessionRow>
            )}
          </>
        )}
      </motion.div>
    </Sheet>

    {/* Menu « Gérer » d'une séance perso */}
    <AnimatePresence>
      {manage && (
        <ManageSheet
          session={manage}
          onClose={() => setManage(null)}
          onEdit={(s) => { setManage(null); onEdit(s); }}
          onDelete={(id) => { setManage(null); onDelete(id); }}
          onVisibilityChange={onVisibilityChange}
        />
      )}
    </AnimatePresence>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « J'improvise » — 2 réponses (temps + lieu), l'IA crée.
   ════════════════════════════════════════════════════════════════════ */
const IMPRO_TIMES = [15, 30, 45, 60] as const;
type ImproPlace = "salle" | "maison" | "dehors";

function ImproviseSheet({ defaultPlace, defaultHalteres, difficulty, onClose, onLaunch }: {
  defaultPlace: ImproPlace;
  defaultHalteres: boolean;
  difficulty: string;
  onClose: () => void;
  onLaunch: (t: { id: string; title: string; duration: number; difficulty: string; category: string; exerciseList: Exercise[] }) => void;
}) {
  const [time, setTime] = useState<number>(30);
  const [place, setPlace] = useState<ImproPlace>(defaultPlace);
  const [halteres, setHalteres] = useState(defaultHalteres);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    // Même vocabulaire de lieu que le reste de l'app → la route applique
    // ses contraintes strictes de matériel.
    const lieuTxt =
      place === "salle" ? "en salle de sport"
      : place === "dehors" ? "en extérieur (parc), sans matériel, au poids du corps"
      : halteres ? "à la maison avec haltères"
      : "à la maison au poids du corps, sans matériel";
    try {
      const res = await fetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `Séance improvisée de ${time} min ${lieuTxt}. Équilibrée et efficace, pour une envie spontanée de bouger.`,
          category: "fullbody",
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Erreur serveur");
      const exerciseList = normalizeExercises(data.exercises);
      if (exerciseList.length === 0) throw new Error("Séance vide");
      onLaunch({
        id: `improv-${Date.now()}`,
        title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Séance improvisée",
        duration: time,
        difficulty,
        category: "Full Body",
        exerciseList,
      });
    } catch {
      setError("L'IA n'a pas répondu — réessaie.");
      setLoading(false);
    }
  };

  const placeMeta: { key: ImproPlace; label: string; icon: typeof Dumbbell }[] = [
    { key: "salle",  label: "Salle",  icon: Dumbbell },
    { key: "maison", label: "Maison", icon: Home },
    { key: "dehors", label: "Dehors", icon: Sun },
  ];

  return (
    <Sheet onClose={onClose} maxHeight="80vh">
      <div className="px-5 pt-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-light flex items-center gap-2" style={{ color: "var(--text-1)" }}>
            <span style={{ color: "var(--accent)" }}>✦</span> J&apos;improvise
          </h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>
        <p className="text-[11.5px] font-light mt-0.5" style={{ color: "var(--text-3)" }}>
          Dis-moi ta réalité, je m&apos;occupe du reste.
        </p>
      </div>

      <div className="px-5 overflow-y-auto" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
        {/* Temps */}
        <p className="text-[9.5px] font-extrabold tracking-[0.2em] uppercase mt-4 mb-2" style={{ color: "var(--text-3)" }}>
          Tu as combien de temps ?
        </p>
        <div className="flex gap-2">
          {IMPRO_TIMES.map((t) => (
            <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => setTime(t)}
              className="flex-1 py-2.5 rounded-[13px] cursor-pointer text-center"
              style={time === t
                ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 6px 16px rgba(139,92,246,0.35)", border: "1px solid transparent" }
                : { background: "rgba(var(--tint-violet-rgb),0.45)", border: "1px solid rgba(var(--accent-rgb),0.14)" }}>
              <span className="text-[13px] font-extrabold block leading-none" style={{ color: time === t ? "#fff" : "var(--text-3)" }}>
                {t === 60 ? "60+" : t}
              </span>
              <span className="text-[8.5px] font-semibold" style={{ color: time === t ? "rgba(255,255,255,0.75)" : "var(--text-3)", opacity: 0.85 }}>min</span>
            </motion.button>
          ))}
        </div>

        {/* Lieu */}
        <p className="text-[9.5px] font-extrabold tracking-[0.2em] uppercase mt-4 mb-2" style={{ color: "var(--text-3)" }}>
          Tu es où ?
        </p>
        <div className="flex gap-2">
          {placeMeta.map(({ key, label, icon: PIcon }) => (
            <motion.button key={key} whileTap={{ scale: 0.94 }} onClick={() => setPlace(key)}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[15px] cursor-pointer"
              style={place === key
                ? { background: "rgba(var(--accent-rgb),0.13)", border: "1.5px solid var(--accent)", boxShadow: "0 0 0 3px rgba(var(--accent-rgb),0.14)" }
                : { background: "rgba(var(--tint-violet-rgb),0.45)", border: "1.5px solid rgba(var(--accent-rgb),0.14)" }}>
              <PIcon size={17} strokeWidth={1.8} style={{ color: place === key ? "var(--accent)" : "var(--text-3)" }} />
              <span className="text-[11px] font-bold" style={{ color: place === key ? "var(--text-1)" : "var(--text-3)" }}>{label}</span>
            </motion.button>
          ))}
        </div>

        {/* Matériel — seulement pertinent à la maison */}
        <AnimatePresence initial={false}>
          {place === "maison" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
              <button onClick={() => setHalteres((v) => !v)}
                className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-full cursor-pointer"
                style={halteres
                  ? { background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.4)" }
                  : { background: "rgba(43,212,160,0.1)", border: "1px solid rgba(43,212,160,0.4)" }}>
                <span className="text-[11px] font-bold" style={{ color: halteres ? "#8B5CF6" : "#12A87E" }}>
                  {halteres ? "J'ai des haltères" : "Sans matériel — poids du corps"}
                </span>
                <span className="relative block w-[26px] h-[15px] rounded-full" style={{ background: halteres ? "#8B5CF6" : "#2BD4A0" }}>
                  <span className="absolute top-[2px] w-[11px] h-[11px] rounded-full bg-white transition-all duration-150"
                    style={{ left: halteres ? 13 : 2 }} />
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-[11px] font-medium mt-3" style={{ color: "#FC8181" }}>{error}</p>
        )}

        {/* CTA */}
        <motion.button
          whileTap={{ scale: loading ? 1 : 0.97 }}
          onClick={generate}
          disabled={loading}
          className="w-full mt-4 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[14.5px] font-extrabold text-white"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 26px rgba(139,92,246,0.4)", opacity: loading ? 0.85 : 1 }}
        >
          {loading ? (
            <>
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} className="flex">
                <Sparkles size={15} strokeWidth={2} />
              </motion.span>
              L&apos;IA compose ta séance…
            </>
          ) : (
            <>✦ Prépare ma séance</>
          )}
        </motion.button>
      </div>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « Ma semaine » — l'agenda vivant (phase 2). La semaine entière,
   jour par jour, en photos : verdict d'équilibre + charge prévue en tête,
   navigation entre semaines, actions par jour déléguées à l'IA (décaler /
   remplacer / repos) — cohérent avec le héros. Le drag direct viendra en
   phase 3.
   ════════════════════════════════════════════════════════════════════ */
const DAY_ABBR = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const MAX_WEEK_AHEAD = 6;
/** Regroupe les 6 familles en 4 grands rôles lisibles pour le verdict. */
const BALANCE_BUCKET: Record<Family, string> = {
  push: "haut", pull: "haut", legs: "jambes", core: "gainage", cardio: "cardio", full: "full body",
};
const fmtDay = (ymd: string) =>
  new Date(ymd + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function SemaineSheet({ week, todayIdx, fetchWeekAt, onClose, onStartDay, onAsk, onAddSession, onMove }: {
  week: PlanningDay[] | null;
  todayIdx: number;
  fetchWeekAt: (offset: number) => Promise<PlanningDay[] | null>;
  onClose: () => void;
  onStartDay: (day: PlanningDay) => void;
  onAsk: (prompt: string) => void;
  onAddSession: () => void;
  onMove: (a: PlanningDay, b: PlanningDay, msg: string) => Promise<void>;
}) {
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState<PlanningDay[] | null>(week);
  const [loading, setLoading] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  /* ── Drag & drop : déplacer une séance d'un jour à l'autre ── */
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const canDrop = (from: number, to: number) => {
    const t = days?.[to];
    return to !== from && !!t && t.status !== "done" && t.date >= todayYmd();
  };
  const hoverFromY = (y: number): number | null => {
    for (let i = 0; i < 7; i++) {
      const r = rowRefs.current[i]?.getBoundingClientRect();
      if (r && y >= r.top && y <= r.bottom) return i;
    }
    return null;
  };
  const handleDragStart = (i: number) => { setOpenIdx(null); setDragIdx(i); };
  const handleDragMove = (i: number, y: number) => {
    const h = hoverFromY(y);
    setHoverIdx(h !== null && canDrop(i, h) ? h : null);
  };
  const handleDragEnd = (i: number) => {
    const to = hoverIdx;
    setDragIdx(null); setHoverIdx(null);
    if (to === null || !canDrop(i, to) || !days) return;
    const a = days[i], b = days[to];
    // Échange des contenus (les dates restent aux jours) ; tout redevient « prévu ».
    const swap = (x: PlanningDay, y2: PlanningDay): PlanningDay => ({
      ...x, type: y2.type, title: y2.title, difficulty: y2.difficulty,
      location: y2.location, exerciseList: y2.exerciseList, sessionId: y2.sessionId,
      status: "planned",
    });
    const newA = swap(a, b), newB = swap(b, a);
    setDays(days.map((d, k) => (k === i ? newA : k === to ? newB : d)));
    const msg = hasSeance(newA) ? "Séances échangées ✓" : `${dayTitle(newB)} → ${DAY_FULL[to]} ✓`;
    void onMove(newA, newB, msg);
  };

  /* offset 0 = la semaine du héros (déjà chargée) ; sinon on va la chercher. */
  useEffect(() => {
    let alive = true;
    if (offset === 0) { setDays(week); return; }
    setLoading(true);
    fetchWeekAt(offset).then((d) => { if (alive) { setDays(d); setLoading(false); } });
    return () => { alive = false; };
  }, [offset, week, fetchWeekAt]);

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(MAX_WEEK_AHEAD, offset + delta));
    if (next === offset) return;
    setOpenIdx(null);
    setOffset(next);
  };

  const wd = weekDatesForOffset(offset);
  const rangeLabel = `${fmtDay(wd[0])} – ${fmtDay(wd[6])}`;
  const weekTag = offset === 0 ? "Cette semaine" : offset === 1 ? "Semaine prochaine" : `Dans ${offset} sem.`;

  /* ── Verdict d'équilibre + charge (lus depuis les familles en coulisse) ── */
  const seances = (days ?? []).filter(hasSeance);
  const totalMin = seances.reduce((s, d) => s + (d.type === "HIIT" ? 30 : 45), 0);
  const buckets = new Map<string, number>();
  for (const d of seances) {
    const b = BALANCE_BUCKET[resolveArt({ title: `${d.title} ${d.type}` }).fam];
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const verdict = seances.length === 0 ? null : buckets.size >= 3 ? "Équilibrée ✦" : "Ciblée";

  return (
    <Sheet onClose={onClose} height="90vh">
      {/* En-tête + navigation semaine */}
      <div className="px-5 pt-1 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[17px] font-bold" style={{ color: "var(--text-1)" }}>Ma semaine</p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-3)" }}>{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => go(-1)} disabled={offset <= 0} aria-label="Semaine précédente"
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.1)", opacity: offset <= 0 ? 0.3 : 1, cursor: offset <= 0 ? "default" : "pointer" }}>
            <ChevronLeft size={15} strokeWidth={2.4} style={{ color: "var(--accent)" }} />
          </button>
          <span className="text-[10.5px] font-bold w-[92px] text-center" style={{ color: "var(--text-2)" }}>{weekTag}</span>
          <button onClick={() => go(1)} disabled={offset >= MAX_WEEK_AHEAD} aria-label="Semaine suivante"
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.1)", opacity: offset >= MAX_WEEK_AHEAD ? 0.3 : 1, cursor: offset >= MAX_WEEK_AHEAD ? "default" : "pointer" }}>
            <ChevronRight size={15} strokeWidth={2.4} style={{ color: "var(--accent)" }} />
          </button>
        </div>
      </div>

      {/* Verdict d'équilibre + charge */}
      {verdict && (
        <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap flex-shrink-0">
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(43,212,160,0.12)", color: "#2BD4A0" }}>{verdict}</span>
          {[...buckets.entries()].sort((a, b) => b[1] - a[1]).map(([b, n]) => (
            <span key={b} className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.055)", color: "var(--text-2)" }}>{n}× {b}</span>
          ))}
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: "rgba(239,159,39,0.12)", color: "#EF9F27" }}>{fmtDur(totalMin)} prévues</span>
        </div>
      )}

      {/* Liste des 7 jours */}
      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none" }}>
        {days?.some((d) => hasSeance(d) && d.status !== "done") && (
          <p className="text-[9.5px] font-semibold pb-1" style={{ color: "var(--text-3)", opacity: 0.8 }}>
            Maintiens <GripVertical size={9} strokeWidth={2.4} style={{ display: "inline", verticalAlign: "-1px" }} /> pour déplacer une séance.
          </p>
        )}
        {DAY_ABBR.map((abbr, i) => (
          <DayRow
            key={`${offset}-${i}`}
            day={days?.[i] ?? null}
            idx={i}
            abbr={abbr}
            isToday={offset === 0 && i === todayIdx}
            open={openIdx === i}
            dropHover={hoverIdx === i && dragIdx !== null}
            dimmed={dragIdx !== null && dragIdx !== i && hoverIdx !== i}
            registerRef={(el) => { rowRefs.current[i] = el; }}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            onStartDay={onStartDay}
            onAsk={onAsk}
            onDragStart={() => handleDragStart(i)}
            onDragMove={(y) => handleDragMove(i, y)}
            onDragEnd={() => handleDragEnd(i)}
          />
        ))}
        {loading && <p className="text-[11px] font-medium text-center py-4" style={{ color: "var(--text-3)" }}>Chargement…</p>}
        <div style={{ height: 8 }} />
      </div>

      {/* Footer — IA + ajout */}
      <div className="px-5 pt-3 flex gap-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(var(--tint-violet-rgb),0.8)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onAsk("Refais toute ma semaine d'entraînement")}
          className="flex-1 py-3 rounded-2xl text-[13px] font-extrabold text-white cursor-pointer flex items-center justify-center gap-1.5"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 8px 22px rgba(139,92,246,0.4)" }}>
          <Sparkles size={13} strokeWidth={2} /> Refais ma semaine
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onAddSession}
          className="px-4 rounded-2xl text-[12.5px] font-bold cursor-pointer flex items-center gap-1"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--text-2)" }}>
          <Plus size={14} strokeWidth={2.4} /> Séance
        </motion.button>
      </div>
    </Sheet>
  );
}

/** Y du pointeur, quel que soit le type d'événement (souris / touch). */
const clientYOf = (e: unknown, fallback: number): number => {
  const ev = e as { clientY?: number; touches?: Array<{ clientY: number }> };
  return ev.clientY ?? ev.touches?.[0]?.clientY ?? fallback;
};

/** Un jour de l'agenda — carte draggable (poignée dédiée, pour laisser le
    scroll tranquille) + actions dépliées au tap. */
function DayRow({ day, idx, abbr, isToday, open, dropHover, dimmed, registerRef, onToggle, onStartDay, onAsk, onDragStart, onDragMove, onDragEnd }: {
  day: PlanningDay | null;
  idx: number;
  abbr: string;
  isToday: boolean;
  open: boolean;
  dropHover: boolean;
  dimmed: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onToggle: () => void;
  onStartDay: (d: PlanningDay) => void;
  onAsk: (p: string) => void;
  onDragStart: () => void;
  onDragMove: (clientY: number) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const d = day;
  const isDone = d?.status === "done";
  const isSeance = hasSeance(d);
  const draggable = isSeance && !isDone;
  const art = isSeance ? resolveArt({ title: `${d!.title} ${d!.type}` }) : null;
  const num = d ? new Date(d.date + "T00:00:00").getDate() : "";

  return (
    <div ref={registerRef} className="py-1" style={{ opacity: dimmed ? 0.45 : 1, transition: "opacity 0.15s" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 flex-shrink-0 text-center">
          <span className="block text-[9px] font-extrabold tracking-wide" style={{ color: isToday ? "#A78BFA" : "var(--text-3)" }}>{abbr}</span>
          <span className="block text-[15px] font-light" style={{ color: isToday ? "#A78BFA" : "var(--text-2)" }}>{num}</span>
        </div>
        <motion.div
          drag={draggable ? "y" : false}
          dragControls={controls}
          dragListener={false}
          dragSnapToOrigin
          dragMomentum={false}
          dragElastic={0.1}
          onDragStart={onDragStart}
          onDrag={(e, info) => onDragMove(clientYOf(e, info.point.y))}
          onDragEnd={onDragEnd}
          whileDrag={{ scale: 1.04, rotate: -1.5, zIndex: 40, boxShadow: "0 14px 34px rgba(0,0,0,0.55)" }}
          className="flex-1 flex items-center gap-2 rounded-2xl px-2.5 py-2 min-w-0 relative"
          style={{
            background: dropHover ? "rgba(139,92,246,0.13)"
              : isToday ? "rgba(139,92,246,0.1)"
              : isSeance ? "rgba(255,255,255,0.04)" : "transparent",
            border: dropHover ? "1.5px dashed rgba(139,92,246,0.75)"
              : isToday ? "1px solid rgba(139,92,246,0.55)"
              : isSeance ? "1px solid rgba(255,255,255,0.06)" : "1px dashed rgba(var(--accent-rgb),0.18)",
            opacity: isDone ? 0.72 : 1,
          }}
        >
          <button onClick={onToggle}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left bg-transparent border-none p-0 cursor-pointer">
            {isSeance && art ? (
              <Photo img={art.img} pos="center 22%" className="rounded-xl flex-shrink-0" style={{ width: 38, height: 38 }} />
            ) : (
              <span className="rounded-xl flex-shrink-0 flex items-center justify-center" style={{ width: 38, height: 38, background: "rgba(255,255,255,0.03)" }}>
                <Moon size={14} strokeWidth={1.8} style={{ color: "var(--text-3)", opacity: 0.7 }} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold truncate" style={{ color: "var(--text-1)" }}>{isSeance ? dayTitle(d!) : "Repos"}</p>
              <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: dropHover ? "#C9B8FF" : "var(--text-3)" }}>
                {dropHover ? "Dépose la séance ici ✦"
                  : isSeance ? `${d!.type === "HIIT" ? 30 : 45} min${lieuLabel(d!.location) ? ` · ${lieuLabel(d!.location)}` : ""}`
                  : "Ton corps construit"}
              </p>
            </div>
            {isDone ? (
              <span className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: 18, height: 18, background: "rgba(43,212,160,0.16)", border: "1px solid rgba(43,212,160,0.5)" }}>
                <Check size={10} strokeWidth={3.2} style={{ color: "#2BD4A0" }} />
              </span>
            ) : isToday ? (
              <span className="flex-shrink-0 text-[9px] font-extrabold tracking-wide" style={{ color: "#C9B8FF" }}>AUJOURD&apos;HUI</span>
            ) : (
              <ChevronRight size={14} strokeWidth={2.4} className="flex-shrink-0"
                style={{ color: "var(--text-3)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.18s" }} />
            )}
          </button>
          {draggable && (
            <div
              onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
              className="flex-shrink-0 flex items-center justify-center cursor-grab"
              style={{ touchAction: "none", width: 24, height: 34 }}
              aria-label="Déplacer la séance"
            >
              <GripVertical size={15} strokeWidth={2.2} style={{ color: "var(--text-3)", opacity: 0.8 }} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Actions du jour — dépliées au tap */}
      <AnimatePresence initial={false}>
        {open && d && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex gap-1.5 flex-wrap pl-[42px] pt-2 pb-1">
              {isSeance && (
                <ActChip onClick={() => onStartDay(d)} primary>
                  <Play size={11} strokeWidth={2.5} fill="#fff" style={{ color: "#fff" }} /> Commencer
                </ActChip>
              )}
              {isSeance && <ActChip onClick={() => onAsk(`Remplace ma séance de ${DAY_FULL[idx]} par autre chose`)}><span style={{ color: "#C9B8FF" }}>✦</span> Remplacer</ActChip>}
              {isSeance && <ActChip onClick={() => onAsk(`Décale ma séance de ${DAY_FULL[idx]} à un autre jour`)}>Décaler</ActChip>}
              {isSeance
                ? <ActChip onClick={() => onAsk(`Mets repos le ${DAY_FULL[idx]}`)}>☾ Repos</ActChip>
                : <ActChip onClick={() => onAsk(`Ajoute une séance le ${DAY_FULL[idx]}`)}><span style={{ color: "#C9B8FF" }}>✦</span> Ajouter une séance</ActChip>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Petit bouton d'action d'un jour de l'agenda. */
function ActChip({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer border-none"
      style={primary
        ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 12px rgba(139,92,246,0.35)" }
        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-2)" }}>
      {children}
    </motion.button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « Organiser » — le planning complet (WeeklyProgramme) : semaines,
   jours, tutos, régénération, lieu. Réservé au chemin setup (le héros
   « Créer mon planning » quand l'app ne sait pas encore).
   ════════════════════════════════════════════════════════════════════ */
function OrganiserSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose} maxHeight="92vh">
      <div className="px-5 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: "var(--text-3)" }}>
            Piloté par l&apos;IA ✦
          </p>
          <h2 className="text-[19px] font-light mt-0.5" style={{ color: "var(--text-1)" }}>Organiser ma semaine</h2>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
          <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        </motion.button>
      </div>
      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <WeeklyProgramme />
        <p className="text-[11px] font-light mt-4 leading-snug" style={{ color: "var(--text-3)" }}>
          Demande à l&apos;orbe ✦ de remplacer, décaler ou changer le lieu d&apos;un jour.
        </p>
      </div>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Création / édition de séance perso (modale existante, conservée telle
   quelle — l'IA peut aussi la remplir).
   ════════════════════════════════════════════════════════════════════ */

// Système D — les séances sont toutes le même type d'objet → toutes VIOLET (action).
// La couleur ne code que les métriques (série/calories/poids) et l'état « fait » (teal).
const ACCENT_BY_CATEGORY: Record<WorkoutCategory, string> = {
  force: "#8B5CF6", cardio: "#8B5CF6", mobilite: "#8B5CF6", fullbody: "#8B5CF6",
};
const ICON_BY_CATEGORY: Record<WorkoutCategory, typeof Dumbbell> = {
  force: Dumbbell, cardio: Flame, mobilite: Wind, fullbody: Layers,
};

const ALL_MUSCLES = [
  "Pectoraux", "Dos", "Épaules", "Biceps", "Triceps",
  "Abdominaux", "Obliques", "Core", "Lombaires",
  "Quadriceps", "Fessiers", "Mollets", "Hanches", "Cardio",
];

type ExerciseForm = {
  name: string;
  sets: number;
  reps: number;
  rest: number;
  restAfter: number;
  tip?: string;
  benefit?: string;
  exMuscles?: string[];
};
const DEFAULT_EX: ExerciseForm = { name: "", sets: 3, reps: 10, rest: 60, restAfter: 90 };

/** Durée calculée = temps actif + repos inter-séries + transitions, arrondie à 5 min */
function calcDuration(forms: ExerciseForm[]): number {
  const SEC_PER_REP = 3;
  let total = 0;
  forms.forEach((ex, i) => {
    total += ex.sets * ex.reps * SEC_PER_REP;      // temps actif
    total += (ex.sets - 1) * ex.rest;              // repos inter-séries
    if (i < forms.length - 1) total += ex.restAfter; // transition entre exercices
  });
  return Math.max(5, Math.round((total / 60) / 5) * 5);
}

function CreateSessionModal({ onClose, onCreate, editSession }: {
  onClose: () => void;
  onCreate: (s: WorkoutSession) => void;
  editSession?: WorkoutSession | null;
}) {
  const isEdit = !!editSession;

  const [title, setTitle]       = useState(editSession?.title ?? "");
  const [category, setCategory] = useState<WorkoutCategory>(editSession?.category ?? "force");
  const [difficulty, setDifficulty] = useState<WorkoutSession["difficulty"]>(editSession?.difficulty ?? "Intermédiaire");
  // Custom muscles = muscles from editSession that are not in the predefined list
  const [customMuscles, setCustomMuscles] = useState<string[]>(
    editSession?.muscles?.filter(m => !ALL_MUSCLES.includes(m)) ?? []
  );
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(editSession?.muscles ?? []);
  const [newMuscleInput, setNewMuscleInput] = useState("");
  const [exForms, setExForms] = useState<ExerciseForm[]>(
    editSession?.exerciseList?.map(e => ({ name: e.name, sets: e.sets, reps: parseInt(String(e.reps)) || 10, rest: e.rest, restAfter: e.restAfter ?? 90 }))
    ?? [{ ...DEFAULT_EX }]
  );

  // IA
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Durée calculée automatiquement depuis les exercices
  const duration = calcDuration(exForms);

  // Tant que la modale est ouverte, on masque la barre de navigation du bas :
  // sur mobile elle se superposait au pied de la modale (compositing du translateZ
  // de la nav), rendant le bouton « Créer la séance » inaccessible.
  useEffect(() => lockBodyModal(), []);

  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription, category, difficulty, muscles: selectedMuscles }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.title) setTitle(data.title);
      if (Array.isArray(data.exercises) && data.exercises.length > 0) {
        setExForms(data.exercises.map((e: { name: string; sets?: number; reps?: number; rest?: number; restAfter?: number; tip?: string; benefit?: string; muscles?: string[] }) => ({
          name: e.name ?? "",
          sets: Number(e.sets) || 3,
          reps: Number(e.reps) || 10,
          rest: Number(e.rest) || 60,
          restAfter: Number(e.restAfter) || 90,
          tip: e.tip,
          benefit: e.benefit,
          exMuscles: Array.isArray(e.muscles) ? e.muscles : undefined,
        })));
      }
      if (Array.isArray(data.muscles) && data.muscles.length > 0) {
        setSelectedMuscles(data.muscles);
      }
    } catch {
      setAiError("Génération impossible, réessaie.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleMuscle = (m: string) =>
    setSelectedMuscles(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);

  const addCustomMuscle = () => {
    const trimmed = newMuscleInput.trim();
    if (!trimmed) return;
    const allKnown = [...ALL_MUSCLES, ...customMuscles];
    if (allKnown.some(m => m.toLowerCase() === trimmed.toLowerCase())) return;
    setCustomMuscles(p => [...p, trimmed]);
    setSelectedMuscles(p => [...p, trimmed]);
    setNewMuscleInput("");
  };

  const removeCustomMuscle = (m: string) => {
    setCustomMuscles(p => p.filter(x => x !== m));
    setSelectedMuscles(p => p.filter(x => x !== m));
  };

  const addEx = () => setExForms(p => [...p, { ...DEFAULT_EX }]);
  const removeEx = (i: number) => setExForms(p => p.filter((_, idx) => idx !== i));
  const updateEx = <K extends keyof ExerciseForm>(i: number, key: K, val: ExerciseForm[K]) =>
    setExForms(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  const handleCreate = () => {
    if (!title.trim()) return;
    const validExs = exForms.filter(e => e.name.trim());
    const exerciseList: Exercise[] = validExs.map(e => ({
      name: e.name.trim(),
      sets: e.sets,
      reps: String(e.reps),
      rest: e.rest,
      restAfter: e.restAfter,
      tip: e.tip ?? "Concentre-toi sur la forme et la respiration.",
      benefit: e.benefit ?? "Renforce et améliore les performances.",
      muscles: e.exMuscles ?? (selectedMuscles.length > 0 ? selectedMuscles : ["Corps entier"]),
    }));
    onCreate({
      id: editSession?.id ?? `custom-${Date.now()}`,
      title: title.trim(),
      subtitle: `${category.charAt(0).toUpperCase() + category.slice(1)} · Ma séance`,
      category,
      duration,
      difficulty,
      exercises: validExs.length || 1,
      muscles: selectedMuscles.length > 0 ? selectedMuscles : ["Corps entier"],
      accent: ACCENT_BY_CATEGORY[category],
      icon: ICON_BY_CATEGORY[category],
      exerciseList: exerciseList.length > 0 ? exerciseList : [{
        name: "Exercice libre",
        sets: 3, reps: "10", rest: 60,
        tip: "Concentre-toi sur la forme.",
        benefit: "Renforce et améliore les performances.",
        muscles: selectedMuscles.length > 0 ? selectedMuscles : ["Corps entier"],
      }],
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-0"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgba(var(--surface-rgb),0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(var(--surface-rgb),0.9)",
          boxShadow: "0 20px 60px rgba(var(--accent-rgb),0.18), inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
          maxHeight: "92vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(var(--tint-violet-rgb),0.8)" }}>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
              {isEdit ? "Modifier la séance" : "Nouvelle séance"}
            </p>
            <h2 className="text-lg font-light mt-0.5" style={{ color: "var(--text-1)" }}>
              {isEdit ? "Éditer ma séance" : "Créer ma séance"}
            </h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6" style={{ scrollbarWidth: "none" }}>

          {/* ── 0. Assistant IA ── */}
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "linear-gradient(135deg, rgba(var(--violet-mid-rgb),0.18) 0%, rgba(var(--cream-mid-rgb),0.12) 100%)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Assistant IA ✦</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(var(--accent-rgb),0.15)", color: "var(--accent)" }}>Optionnel</span>
            </div>
            <textarea
              value={aiDescription}
              onChange={e => setAiDescription(e.target.value)}
              placeholder="Décris ta séance idéale… ex : séance push pour prise de masse, 45 min, avec développé couché et épaules"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
              style={{ background: "rgba(var(--surface-rgb),0.75)", border: "1px solid rgba(var(--violet-mid-rgb),0.45)", color: "var(--text-1)", lineHeight: 1.5 }}
            />
            {aiError && (
              <p className="text-[11px]" style={{ color: "#FC8181" }}>{aiError}</p>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleAiGenerate}
              disabled={!aiDescription.trim() || aiLoading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              style={aiDescription.trim() && !aiLoading
                ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
                : { background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-3)" }
              }
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Génération en cours…
                </>
              ) : (
                <>✦ Générer la séance avec l&apos;IA</>
              )}
            </motion.button>
          </div>

          {/* ── 1. Infos générales ── */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Informations</p>

            {/* Nom */}
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nom de la séance (ex : Push Day, Cardio matin…)"
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "rgba(var(--tint-violet-rgb),0.45)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
              autoFocus={!isEdit}
            />

            {/* Catégorie */}
            <div className="grid grid-cols-4 gap-2">
              {(["force", "cardio", "mobilite", "fullbody"] as WorkoutCategory[]).map(cat => (
                <motion.button key={cat} whileTap={{ scale: 0.93 }} onClick={() => setCategory(cat)}
                  className="py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  style={category === cat
                    ? { background: `${ACCENT_BY_CATEGORY[cat]}22`, color: ACCENT_BY_CATEGORY[cat], border: `1px solid ${ACCENT_BY_CATEGORY[cat]}55` }
                    : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" }
                  }>
                  {cat === "mobilite" ? "Mobilité" : cat === "fullbody" ? "Full" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </motion.button>
              ))}
            </div>

            {/* Durée calculée + Difficulté */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase block mb-2" style={{ color: "var(--text-3)" }}>Durée calculée</label>
                <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl"
                  style={{ background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.3)" }}>
                  <Clock size={13} strokeWidth={1.8} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{duration} min</span>
                </div>
                <p className="text-[9px] mt-1 text-center" style={{ color: "var(--text-3)" }}>Mise à jour auto</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase block mb-2" style={{ color: "var(--text-3)" }}>Niveau</label>
                <div className="flex flex-col gap-1">
                  {(["Débutant", "Intermédiaire", "Avancé"] as const).map(d => (
                    <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setDifficulty(d)}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer text-left"
                      style={difficulty === d
                        ? { background: "rgba(139,92,246,0.14)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.35)" }
                        : { background: "rgba(var(--surface-rgb),0.6)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" }
                      }>
                      {d}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Groupes musculaires ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>
                Muscles ciblés
              </p>
              {selectedMuscles.length > 0 && (
                <button onClick={() => setSelectedMuscles([])} className="text-[10px] cursor-pointer" style={{ color: "var(--text-3)" }}>
                  Tout décocher
                </button>
              )}
            </div>

            {/* Predefined muscles */}
            <div className="flex flex-wrap gap-2">
              {ALL_MUSCLES.map(m => {
                const selected = selectedMuscles.includes(m);
                return (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => toggleMuscle(m)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                    style={selected
                      ? { background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category], border: `1px solid ${ACCENT_BY_CATEGORY[category]}55` }
                      : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.8)" }
                    }
                  >
                    {selected ? "✓ " : ""}{m}
                  </motion.button>
                );
              })}

              {/* Custom muscles — with × to remove */}
              {customMuscles.map(m => {
                const selected = selectedMuscles.includes(m);
                return (
                  <div key={m} className="flex items-center gap-0.5">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => toggleMuscle(m)}
                      className="pl-3 pr-1.5 py-1.5 rounded-l-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                      style={selected
                        ? { background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category], border: `1px solid ${ACCENT_BY_CATEGORY[category]}55`, borderRight: "none" }
                        : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.8)", borderRight: "none" }
                      }
                    >
                      {selected ? "✓ " : ""}{m}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => removeCustomMuscle(m)}
                      className="pr-2 py-1.5 rounded-r-full text-[10px] flex items-center cursor-pointer transition-all duration-150"
                      style={selected
                        ? { background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category], border: `1px solid ${ACCENT_BY_CATEGORY[category]}55`, borderLeft: "none" }
                        : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.8)", borderLeft: "none" }
                      }
                    >
                      <X size={9} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                );
              })}
            </div>

            {/* Add custom muscle */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newMuscleInput}
                onChange={e => setNewMuscleInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomMuscle(); } }}
                placeholder="Ajouter un muscle personnalisé…"
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)", color: "var(--text-1)" }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={addCustomMuscle}
                disabled={!newMuscleInput.trim()}
                className="px-3 py-2 rounded-xl flex items-center justify-center cursor-pointer"
                style={newMuscleInput.trim()
                  ? { background: "rgba(var(--accent-rgb),0.15)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.35)" }
                  : { background: "rgba(var(--tint-violet-rgb),0.4)", color: "#C4B5FD", border: "1px solid rgba(var(--violet-mid-rgb),0.2)" }
                }
              >
                <Plus size={13} strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* ── 3. Exercices ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>
                Exercices ({exForms.length})
              </p>
              <motion.button whileTap={{ scale: 0.9 }} onClick={addEx}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl cursor-pointer text-[10px] font-semibold"
                style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
                <Plus size={10} strokeWidth={2.5} /> Ajouter
              </motion.button>
            </div>

            <div className="flex flex-col gap-3">
              {exForms.flatMap((ex, i) => {
                const card = (
                  <motion.div
                    key={`ex-${i}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.3)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}
                  >
                    {/* Name row */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold w-6 text-center flex-shrink-0 rounded-lg py-0.5"
                        style={{ background: `${ACCENT_BY_CATEGORY[category]}22`, color: ACCENT_BY_CATEGORY[category] }}>
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={ex.name}
                        onChange={e => updateEx(i, "name", e.target.value)}
                        placeholder={`Exercice ${i + 1} (ex : Squat, Pompes…)`}
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)", color: "var(--text-1)" }}
                      />
                      {exForms.length > 1 && (
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeEx(i)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                          style={{ background: "rgba(252,129,129,0.12)" }}>
                          <Trash2 size={11} strokeWidth={1.8} style={{ color: "#FC8181" }} />
                        </motion.button>
                      )}
                    </div>

                    {/* Controls — 3 cols */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Séries */}
                      <div>
                        <p className="text-[9px] font-semibold tracking-widest uppercase mb-1.5 text-center" style={{ color: "var(--text-3)" }}>Séries</p>
                        <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-xl"
                          style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "sets", Math.max(1, ex.sets - 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "var(--accent)" }}>−</motion.button>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{ex.sets}</span>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "sets", Math.min(10, ex.sets + 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "var(--accent)" }}>+</motion.button>
                        </div>
                      </div>

                      {/* Reps */}
                      <div>
                        <p className="text-[9px] font-semibold tracking-widest uppercase mb-1.5 text-center" style={{ color: "var(--text-3)" }}>Répétitions</p>
                        <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-xl"
                          style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "reps", Math.max(1, ex.reps - 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "var(--accent)" }}>−</motion.button>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{ex.reps}</span>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "reps", Math.min(100, ex.reps + 1))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "var(--accent)" }}>+</motion.button>
                        </div>
                      </div>

                      {/* Repos entre séries */}
                      <div>
                        <p className="text-[9px] font-semibold tracking-widest uppercase mb-1.5 text-center" style={{ color: "var(--text-3)" }}>Repos (s)</p>
                        <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-xl"
                          style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "rest", Math.max(0, ex.rest - 15))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "var(--accent)" }}>−</motion.button>
                          <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>{ex.rest}s</span>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateEx(i, "rest", Math.min(300, ex.rest + 15))}
                            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                            style={{ color: "var(--accent)" }}>+</motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );

                /* Séparateur de récupération — uniquement entre deux exercices */
                const separator = (i < exForms.length - 1) ? (
                  <div key={`sep-${i}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(var(--accent-rgb),0.07)", border: "1px dashed rgba(var(--accent-rgb),0.28)" }}
                  >
                    <Clock size={11} strokeWidth={1.8} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span className="text-[10px] font-medium flex-1" style={{ color: "var(--accent)" }}>
                      Récupération entre exercices
                    </span>
                    <div className="flex items-center gap-1.5">
                      <motion.button whileTap={{ scale: 0.85 }}
                        onClick={() => updateEx(i, "restAfter", Math.max(0, ex.restAfter - 15))}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                        style={{ color: "var(--accent)" }}>−</motion.button>
                      <span className="text-xs font-semibold w-8 text-center tabular-nums" style={{ color: "var(--text-1)" }}>
                        {ex.restAfter}s
                      </span>
                      <motion.button whileTap={{ scale: 0.85 }}
                        onClick={() => updateEx(i, "restAfter", Math.min(300, ex.restAfter + 15))}
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                        style={{ color: "var(--accent)" }}>+</motion.button>
                    </div>
                  </div>
                ) : null;

                return separator ? [card, separator] : [card];
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 pt-4" style={{ borderTop: "1px solid rgba(var(--tint-violet-rgb),0.8)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={!title.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
            style={{
              background: title.trim()
                ? "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)"
                : "rgba(var(--tint-violet-rgb),0.5)",
              color: title.trim() ? "var(--text-1)" : "var(--text-3)",
              boxShadow: title.trim() ? "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" : "none",
            }}
          >
            {isEdit ? "Enregistrer les modifications" : "Créer la séance"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Page — Entraînement. La page vit au PRÉSENT : plus de sous-onglets,
   plus d'historique ici.
   ════════════════════════════════════════════════════════════════════ */

/** Séance prête à être lancée dans le lecteur guidé, quelle que soit sa source. */
type LaunchTarget = {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
  category?: string;
  exerciseList?: Exercise[];
  planningDate?: string;   // présent = séance du planning → marquer « done » à la fin
};

export default function ProgressionPage() {
  const { user } = useAuth();
  const { open: openAssistant } = useAssistant();

  /* ── Planning de la semaine (source de vérité du héros + du bandeau) ── */
  const [week, setWeek] = useState<PlanningDay[] | null>(null);
  const [heroReady, setHeroReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [profileLevel, setProfileLevel] = useState<string | null>(null);

  /* ── UI ── */
  const [sheet, setSheet] = useState<null | "choisir" | "improviser" | "organiser" | "elan" | "semaine">(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<LaunchTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  /* ── Bibliothèque perso ── */
  const [customSessions, setCustomSessions] = useState<WorkoutSession[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  /* ── Stats du jour (état « fait » du héros) ── */
  const [doneStats, setDoneStats] = useState<{ minutes: number; kcal: number } | null>(null);
  const [elan, setElan] = useState<ElanData | null>(null);

  const today = todayYmd();
  const todayIdx = todayWeekIndex();

  /* ── Charge la semaine — même recette que WeeklyProgramme (idempotent) ── */
  const loadWeek = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
      .eq("id", user.id)
      .maybeSingle();

    const hasOnboarding = !!(prof && (prof.onboarding_level || prof.onboarding_sessions_week
      || (Array.isArray(prof.onboarding_goals) && prof.onboarding_goals.length > 0)));
    const { location, equip } = readLieu(user.id);
    const lieuReady = location === "salle" || (location === "maison" && !!equip);
    setProfileLevel(prof?.onboarding_level ?? null);

    if (!hasOnboarding || !lieuReady) {
      // L'app ne sait pas encore → héros en mode question (« On s'entraîne comment ? »)
      setNeedsSetup(true);
      setWeek(null);
      setHeroReady(true);
      return;
    }

    const gen: GenInput = {
      ctx: ctxFromLieu(location, equip),
      sessions: prof!.onboarding_sessions_week ?? 3,
      goals: ((prof!.onboarding_goals as string[] | null) ?? []).map((g) => goalLabels[g] ?? g),
      level: prof!.onboarding_level,
      variant: readVariant(user.id),
      seed: user.id,
    };
    try {
      const days = await ensureWeek(user.id, gen, weekDates());
      setWeek(days);
      setNeedsSetup(false);
    } catch (e) {
      console.error("Planning load error", e);
    }
    setHeroReady(true);
  }, [user]);

  useEffect(() => { void loadWeek(); }, [loadWeek]);

  /* ── Charge une autre semaine (navigation de l'agenda) sans toucher au héros ── */
  const fetchWeekAt = useCallback(async (offset: number): Promise<PlanningDay[] | null> => {
    if (!user) return null;
    const supabase = createClient();
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
      .eq("id", user.id)
      .maybeSingle();
    const hasOnboarding = !!(prof && (prof.onboarding_level || prof.onboarding_sessions_week
      || (Array.isArray(prof.onboarding_goals) && prof.onboarding_goals.length > 0)));
    const { location, equip } = readLieu(user.id);
    const lieuReady = location === "salle" || (location === "maison" && !!equip);
    if (!hasOnboarding || !lieuReady) return null;
    const gen: GenInput = {
      ctx: ctxFromLieu(location, equip),
      sessions: prof!.onboarding_sessions_week ?? 3,
      goals: ((prof!.onboarding_goals as string[] | null) ?? []).map((g) => goalLabels[g] ?? g),
      level: prof!.onboarding_level,
      variant: readVariant(user.id),
      seed: user.id,
    };
    try { return await ensureWeek(user.id, gen, weekDatesForOffset(offset)); }
    catch (e) { console.error("Week fetch error", e); return null; }
  }, [user]);

  /* Recharge si le planning ou le lieu changent ailleurs (orbe, Organiser…) */
  useEffect(() => {
    const handler = () => { void loadWeek(); };
    window.addEventListener("programme-updated", handler);
    window.addEventListener("lieu-updated", handler);
    return () => {
      window.removeEventListener("programme-updated", handler);
      window.removeEventListener("lieu-updated", handler);
    };
  }, [loadWeek]);

  /* ── État du héros ── */
  const todayDay = week?.[todayIdx] ?? null;
  const heroState: HeroState = !heroReady ? "loading"
    : needsSetup ? "setup"
    : todayDay?.status === "done" ? "done"
    : hasSeance(todayDay) ? "seance"
    : "repos";

  /* Prochaine séance de la semaine (état repos) — « Jambes · demain » */
  const nextLabel = useMemo(() => {
    if (!week) return null;
    for (let i = todayIdx + 1; i < 7; i++) {
      if (hasSeance(week[i]) && week[i].status !== "done") {
        const when = i === todayIdx + 1 ? "demain" : DAY_FULL[i];
        return `${dayTitle(week[i])} · ${when}`;
      }
    }
    return null;
  }, [week, todayIdx]);

  /* Durée / kcal de la séance faite aujourd'hui (une seule petite requête) */
  useEffect(() => {
    if (heroState !== "done" || !user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const startOfDay = new Date(today + "T00:00:00").toISOString();
      const { data } = await supabase
        .from("workout_sessions")
        .select("duration_minutes, elapsed_seconds, calories_burned")
        .eq("user_id", user.id)
        .gte("started_at", startOfDay)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) {
        setDoneStats({
          minutes: data.elapsed_seconds ? Math.max(1, Math.round(data.elapsed_seconds / 60)) : (data.duration_minutes ?? 0),
          kcal: data.calories_burned ?? 0,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [heroState, user, today]);

  /* ── Ton élan : agrégat des séances faites sur 8 semaines glissantes ── */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const since = new Date(today + "T00:00:00");
      since.setDate(since.getDate() - 55);
      const { data } = await supabase
        .from("workout_sessions")
        .select("started_at, elapsed_seconds, duration_minutes, calories_burned")
        .eq("user_id", user.id)
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: true });
      if (cancelled) return;

      const ymdLocal = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const dayMin = new Map<string, number>();
      const dayCount = new Map<string, number>();
      const activeWeeks = new Set<number>();
      let sessions = 0, minutes = 0, kcal = 0, prevMinutes = 0, record = 0;

      for (const r of data ?? []) {
        const started = r.started_at as string | null;
        if (!started) continue;
        const key = ymdLocal(new Date(started));
        const min = r.elapsed_seconds
          ? Math.max(1, Math.round((r.elapsed_seconds as number) / 60))
          : ((r.duration_minutes as number) ?? 0);
        dayMin.set(key, (dayMin.get(key) ?? 0) + min);
        dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
        if (min > record) record = min;
        const off = weekOffsetOf(key);
        activeWeeks.add(off);
        if (off === 0) { sessions += 1; minutes += min; kcal += (r.calories_burned as number) ?? 0; }
        if (off === -1) prevMinutes += min;
      }

      // Série : semaines consécutives actives (la semaine en cours pas encore lancée ne casse rien)
      let streak = 0;
      let o = activeWeeks.has(0) ? 0 : -1;
      while (activeWeeks.has(o)) { streak += 1; o -= 1; }

      const DL = ["L", "M", "M", "J", "V", "S", "D"];
      const bars: ElanData["bars"] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today + "T00:00:00");
        d.setDate(d.getDate() - i);
        const key = ymdLocal(d);
        const wd = d.getDay(); const idx = wd === 0 ? 6 : wd - 1;
        bars.push({ label: DL[idx], min: dayMin.get(key) ?? 0, done: (dayCount.get(key) ?? 0) > 0, today: key === today });
      }

      setElan({ bars, sessions, minutes, kcal, streak, hasHistory: (data?.length ?? 0) > 0, prevMinutes, record });
    })();
    return () => { cancelled = true; };
  }, [user, today]);

  /* ── Bibliothèque perso (Supabase) ── */
  const fetchCustomSessions = useCallback(async () => {
    if (!user) return;
    setLoadingCustom(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("custom_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setLoadingCustom(false);
    if (error) { console.error("custom_sessions fetch:", error); return; }
    if (!data) return;
    setCustomSessions(data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      subtitle: r.subtitle as string,
      category: r.category as WorkoutCategory,
      duration: r.duration as number,
      difficulty: r.difficulty as WorkoutSession["difficulty"],
      exercises: r.exercises as number,
      muscles: (r.muscles as string[]) ?? [],
      // Système D : toutes les séances = violet (action).
      accent: "#8B5CF6",
      icon: r.icon as string,
      exerciseList: (r.exercise_list as Exercise[]) ?? [],
      visibility: (r.visibility as Visibility) ?? "private",
    })));
  }, [user]);

  useEffect(() => { void fetchCustomSessions(); }, [fetchCustomSessions]);

  /* Catalogue + perso fusionnés — les tiennes d'abord, c'est TA bibliothèque */
  const allSessions = useMemo<MergedSession[]>(() => [
    ...customSessions.map((s) => ({ ...s, perso: true })),
    ...workoutSessions.map((s) => ({ ...s, perso: false })),
  ], [customSessions]);

  /* ── Lancements ── */
  const startDay = (d: PlanningDay) => {
    if (!hasSeance(d)) return;
    setActiveWorkout({
      id: `planning-${d.date}`,
      title: dayTitle(d),
      duration: d.type === "HIIT" ? 30 : 45,
      difficulty: d.difficulty,
      category: d.type,
      exerciseList: d.exerciseList,
      planningDate: d.date,
    });
  };
  const startToday = () => { if (todayDay) startDay(todayDay); };

  /* Drag & drop de l'agenda : persiste les deux jours échangés, puis
     resynchronise le héros (l'agenda a déjà fait sa mise à jour optimiste). */
  const moveDays = async (a: PlanningDay, b: PlanningDay, msg: string) => {
    if (!user) return;
    await Promise.all([saveDay(user.id, a), saveDay(user.id, b)]);
    showToast(msg);
    void loadWeek();
  };

  const startSession = (s: MergedSession) => {
    setSheet(null);
    setActiveWorkout({
      id: s.id,
      title: s.title,
      duration: s.duration,
      difficulty: s.difficulty,
      category: s.category,
      exerciseList: s.exerciseList,
    });
    showToast(`${s.title} démarrée ✓`);
  };

  const handleWorkoutComplete = (target: LaunchTarget) => {
    if (target.planningDate && user) {
      void setDayStatus(user.id, target.planningDate, "done");
      setWeek((prev) => prev?.map((d) => d.date === target.planningDate ? { ...d, status: "done" as const } : d) ?? prev);
    }
  };

  /* ── Actions bibliothèque perso ── */
  const handleVisibilityChange = useCallback(async (sessionId: string, vis: Visibility) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("custom_sessions").update({ visibility: vis }).eq("id", sessionId);
    }
    setCustomSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, visibility: vis } : s));
    const labels = { private: "Séance privée ✓", friends: "Visible par tes amis ✓", public: "Séance publiée 🌐" };
    showToast(labels[vis]);
  }, [user]);

  const handleDelete = async (id: string) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("custom_sessions").delete().eq("id", id);
    }
    setCustomSessions((p) => p.filter((cs) => cs.id !== id));
    showToast("Séance supprimée");
  };

  const handleCreateOrEdit = async (s: WorkoutSession) => {
    const supabase = createClient();
    const existingSession = customSessions.find((cs) => cs.id === s.id);
    const row = {
      id: s.id,
      user_id: user?.id,
      title: s.title,
      subtitle: s.subtitle,
      category: s.category,
      duration: s.duration,
      difficulty: s.difficulty,
      exercises: s.exercises,
      muscles: s.muscles,
      accent: s.accent,
      icon: s.icon,
      exercise_list: s.exerciseList ?? [],
      visibility: existingSession?.visibility ?? "private",
      updated_at: new Date().toISOString(),
    };
    if (editSession) {
      if (user) {
        const { error } = await supabase.from("custom_sessions").update(row).eq("id", s.id);
        if (error) { console.error(error); showToast("Erreur lors de la modification"); return; }
      }
      setCustomSessions((p) => p.map((cs) => cs.id === s.id ? s : cs));
      showToast(`"${s.title}" modifiée ✓`);
    } else {
      if (user) {
        const { error } = await supabase.from("custom_sessions").insert(row);
        if (error) { console.error(error); showToast("Erreur lors de la création"); return; }
      }
      setCustomSessions((p) => [s, ...p]);
      showToast(`"${s.title}" créée ✓`);
    }
    setEditSession(null);
  };

  /* ── Bifurcation : le libellé vit avec la réalité du jour ── */
  const askLabel =
    heroState === "done" ? "Encore de l'énergie ?"
    : heroState === "repos" ? "Envie de bouger quand même ?"
    : heroState === "setup" ? "Ou directement :"
    : "Pas ce qui était prévu ?";

  /* Défauts « J'improvise » depuis le lieu connu */
  const lieu = user ? readLieu(user.id) : { location: null, equip: null };
  const improDefaultPlace: ImproPlace = lieu.location === "salle" ? "salle" : "maison";
  const improDefaultHalteres = lieu.equip === "halteres";

  /* En-tête : la date du jour — cette page vit au présent */
  const dateLabel = useMemo(() => {
    const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col px-5 pt-10 pb-36 md:pl-28 md:pr-8 md:pt-12 md:pb-16 relative overflow-x-hidden">
      <div className="w-full max-w-xl flex flex-col">

        {/* ── En-tête : date + titre ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "var(--text-3)" }}>
            {dateLabel}
          </p>
          <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "var(--text-1)" }}>Entraînement</h1>
        </motion.div>

        {/* ── ① Héros « Aujourd'hui » ── */}
        <section data-tour-anchor="prog-hero">
          <TodayHero
            state={heroState}
            day={todayDay}
            nextLabel={nextLabel}
            doneStats={doneStats}
            onStart={startToday}
            onImprovise={() => setSheet("improviser")}
            onOrganise={() => setSheet("organiser")}
            onShift={() => openAssistant("Décale ma séance d'aujourd'hui à un autre jour")}
            onReplace={() => openAssistant("Remplace ma séance d'aujourd'hui par autre chose")}
          />
        </section>

        {/* ── ② Bifurcation ── */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
          className="text-[16px] font-light mt-6 mb-3" style={{ color: "var(--text-1)" }}
        >
          {askLabel}
        </motion.p>
        <motion.div
          data-tour-anchor="prog-forks"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <ForkCard kind="improvise" onClick={() => setSheet("improviser")} />
          <ForkCard kind="choisis" count={allSessions.length} onClick={() => setSheet("choisir")} />
        </motion.div>

        {/* ── ③ Ma semaine ── */}
        <motion.div
          data-tour-anchor="prog-semaine"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-4"
        >
          <WeekStrip week={week} todayIdx={todayIdx} onOrganise={() => setSheet("semaine")} />
        </motion.div>

        {/* ── ④ Ton élan ── */}
        <motion.div
          data-tour-anchor="prog-elan"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-3"
        >
          <ElanStrip data={elan} onOpen={() => setSheet("elan")} />
        </motion.div>
      </div>

      {/* ══ Sheets ══ */}
      <AnimatePresence>
        {sheet === "semaine" && (
          <SemaineSheet
            week={week}
            todayIdx={todayIdx}
            fetchWeekAt={fetchWeekAt}
            onClose={() => { setSheet(null); void loadWeek(); }}
            onStartDay={(d) => { setSheet(null); startDay(d); }}
            onAsk={(p) => { setSheet(null); openAssistant(p); }}
            onAddSession={() => setSheet("choisir")}
            onMove={moveDays}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "organiser" && (
          <OrganiserSheet onClose={() => { setSheet(null); void loadWeek(); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "elan" && elan && (
          <ElanSheet data={elan} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "choisir" && (
          <ChooseSheet
            sessions={allSessions}
            loading={loadingCustom}
            onClose={() => setSheet(null)}
            onStart={startSession}
            onCreate={() => { setEditSession(null); setShowCreateModal(true); }}
            onEdit={(s) => { setEditSession(s); setShowCreateModal(true); }}
            onDelete={handleDelete}
            onVisibilityChange={handleVisibilityChange}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "improviser" && (
          <ImproviseSheet
            defaultPlace={improDefaultPlace}
            defaultHalteres={improDefaultHalteres}
            difficulty={levelToDifficulty(profileLevel)}
            onClose={() => setSheet(null)}
            onLaunch={(t) => { setSheet(null); setActiveWorkout(t); showToast(`${t.title} prête ✦`); }}
          />
        )}
      </AnimatePresence>

      {/* ══ Lecteur guidé ══ */}
      <AnimatePresence>
        {activeWorkout && (
          <WorkoutGuideModal
            sessionId={activeWorkout.id}
            title={activeWorkout.title}
            accent="var(--accent)"
            duration={activeWorkout.duration}
            difficulty={activeWorkout.difficulty}
            category={activeWorkout.category}
            exerciseList={activeWorkout.exerciseList}
            onClose={() => setActiveWorkout(null)}
            onComplete={() => handleWorkoutComplete(activeWorkout)}
          />
        )}
      </AnimatePresence>

      {/* ══ Création / édition de séance perso ══ */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSessionModal
            key={editSession?.id ?? "new"}
            onClose={() => { setShowCreateModal(false); setEditSession(null); }}
            editSession={editSession}
            onCreate={handleCreateOrEdit}
          />
        )}
      </AnimatePresence>

      {/* ══ Toast ══ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(var(--surface-rgb),0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2)", whiteSpace: "nowrap" }}>
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
