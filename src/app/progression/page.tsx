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
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronRight, ChevronLeft, Dumbbell, Play, Flame, Wind, Sparkles, Layers,
  Check, X, Plus, Trash2, Pencil, Globe, Lock, Users,
  Moon, Zap, Home, Sun, CalendarDays, MoreHorizontal,
} from "lucide-react";
import WeeklyProgramme from "@/components/WeeklyProgramme";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";
import { useAuth } from "@/context/AuthContext";
import { useAssistant } from "@/context/AssistantContext";
import { createClient } from "@/lib/supabase";
import { levelToDifficulty } from "@/lib/assistantActions";
import {
  ensureWeek, setDayStatus, hasSeance, readLieu, readVariant, ctxFromLieu,
  weekDates, todayYmd, todayWeekIndex, weekOffsetOf, dayTitle, normalizeExercises,
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
  push:   { label: "Poussée",   base: "#E8481F", glow: "#FF7A4D", variants: ["push-couche", "push-militaire", "push-dips"] },
  pull:   { label: "Tirage",    base: "#1E5FD0", glow: "#4C93FF", variants: ["pull-traction", "pull-rowing", "pull-curl"] },
  legs:   { label: "Jambes",    base: "#0E9E56", glow: "#2FD98A", variants: ["legs-squat", "legs-fentes", "legs-souleve"] },
  core:   { label: "Gainage",   base: "#0F8E86", glow: "#2BD4A0", variants: ["core-planche", "core-abdos"] },
  full:   { label: "Full body", base: "#8B3FD6", glow: "#C46BFF", variants: ["full-burpee", "full-epaule", "full-kettlebell"] },
  cardio: { label: "Cardio",    base: "#D81E63", glow: "#FF5A8D", variants: ["cardio-ropes", "cardio-sprint", "cardio-rameur"] },
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
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

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
/** Le deck « Je choisis » : 3 vraies vignettes de la banque — photos
    naturelles, empilées en éventail → « tes séances, choisis-en une ».
    Pas une photo unique qui mentirait sur le contenu. */
const CHOISIS_DECK: { img: string; rot: number; x: number; y: number; s: number; z: number }[] = [
  { img: "pull-traction", rot: -13, x: -30, y: 5,  s: 0.92, z: 1 },
  { img: "legs-squat",    rot:  13, x:  30, y: 5,  s: 0.92, z: 1 },
  { img: "push-couche",   rot:   0, x:   0, y: -4, s: 1,    z: 2 },
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
      className="rounded-[20px] overflow-hidden relative cursor-pointer text-left border-none p-0"
      style={{ height: 148, boxShadow: "0 8px 26px rgba(var(--accent-rgb),0.14)" }}
    >
      {isIA ? (
        <>
          <Photo img={WIDGET.improvise.img} pos={WIDGET.improvise.pos}
            style={{ position: "absolute", inset: 0 }} />
          <Sparkles size={24} strokeWidth={1.5} className="absolute top-3 right-3" style={{ color: "#E4D6FF", opacity: 0.9 }} />
          <Sparkles size={11} strokeWidth={1.5} className="absolute top-10 right-11" style={{ color: "#C9B8FF", opacity: 0.5 }} />
        </>
      ) : (
        <>
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(158deg,#1b1430,#0c0a15)" }} />
          <div aria-hidden className="absolute inset-x-0 top-2.5 flex items-center justify-center" style={{ height: 92 }}>
            {CHOISIS_DECK.map((d) => (
              <Photo key={d.img} img={d.img} pos="center 26%"
                className="absolute rounded-[9px]"
                style={{
                  width: 56, height: 80, zIndex: d.z,
                  transform: `translate(${d.x}px, ${d.y}px) rotate(${d.rot}deg) scale(${d.s})`,
                  border: "1.5px solid rgba(255,255,255,0.16)",
                  boxShadow: "0 7px 16px rgba(0,0,0,0.45)",
                }} />
            ))}
          </div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-8"
        style={{ background: "linear-gradient(to top, rgba(8,6,14,0.9) 25%, transparent)" }}>
        <p className="text-[8.5px] font-extrabold tracking-[0.18em] uppercase mb-0.5" style={{ color: "#C9B8FF" }}>
          {isIA ? "L'IA s'adapte" : "Mes séances"}
        </p>
        <p className="text-[16.5px] font-semibold text-white leading-tight">{isIA ? "J'improvise" : "Je choisis"}</p>
        <p className="text-[10.5px] font-normal mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.68)" }}>
          {isIA ? "Ton temps, ton matériel — elle crée" : `${count ?? 0} séances, prêtes à lancer`}
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
    <div className="rounded-[20px] px-4 pt-3.5 pb-3"
      style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.14)", boxShadow: "0 6px 22px rgba(var(--accent-rgb),0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13.5px] font-bold" style={{ color: "var(--text-1)" }}>Ma semaine</p>
        <button onClick={onOrganise}
          className="flex items-center gap-1 text-[11.5px] font-bold cursor-pointer bg-transparent border-none p-0"
          style={{ color: "var(--accent)" }}>
          <CalendarDays size={12} strokeWidth={2.2} />
          Organiser
          <ChevronRight size={11} strokeWidth={2.6} />
        </button>
      </div>

      <div className="flex justify-between">
        {DAY_LETTERS.map((letter, i) => {
          const d = week?.[i] ?? null;
          const isToday = i === todayIdx;
          const isDone = d?.status === "done";
          const isRest = !!d && d.type.toLowerCase() === "repos";
          const isPast = i < todayIdx;

          let inner: React.ReactNode;
          let dotStyle: React.CSSProperties;
          if (isToday) {
            inner = letter;
            dotStyle = {
              background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff",
              boxShadow: "0 0 0 2.5px rgb(var(--surface-rgb)), 0 0 0 4.5px rgba(139,92,246,0.5), 0 6px 14px rgba(139,92,246,0.35)",
            };
            if (isDone) {
              inner = <Check size={13} strokeWidth={3} />;
              dotStyle = {
                background: "linear-gradient(135deg,#4FE8B8,#1FBF8C)", color: "#06281E",
                boxShadow: "0 0 0 2.5px rgb(var(--surface-rgb)), 0 0 0 4.5px rgba(43,212,160,0.5), 0 6px 14px rgba(43,212,160,0.35)",
              };
            }
          } else if (isDone) {
            inner = <Check size={13} strokeWidth={3} />;
            dotStyle = { background: "rgba(43,212,160,0.16)", color: "#2BD4A0", border: "1.5px solid rgba(43,212,160,0.45)" };
          } else if (isRest) {
            inner = "–";
            dotStyle = { background: "transparent", color: "var(--text-3)", border: "1.5px dashed rgba(var(--accent-rgb),0.22)" };
          } else {
            // séance planifiée (passée non faite = discret, aucune culpabilité)
            inner = letter;
            dotStyle = isPast
              ? { background: "rgba(var(--tint-violet-rgb),0.35)", color: "var(--text-3)", border: "1.5px solid transparent", opacity: 0.55 }
              : { background: "rgba(var(--tint-violet-rgb),0.55)", color: "var(--text-2)", border: "1.5px solid rgba(var(--accent-rgb),0.22)" };
          }

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="w-[33px] h-[33px] rounded-full flex items-center justify-center text-[11px] font-extrabold" style={dotStyle}>
                {inner}
              </span>
              <span className="text-[9px] font-bold tracking-wide" style={{ color: "var(--text-3)" }}>{letter}</span>
            </div>
          );
        })}
      </div>

      {story && (
        <p className="text-[11px] font-medium mt-2.5" style={{ color: "var(--text-3)" }}>{story}</p>
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
};

const fmtDur = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;

function ElanStrip({ data }: { data: ElanData | null }) {
  if (!data) return null; // le temps du chargement : rien, pas de flash
  const { bars, sessions, minutes, kcal, streak, hasHistory } = data;
  const maxMin = Math.max(1, ...bars.map((b) => b.min));
  const barH = (min: number) => (min <= 0 ? 4 : Math.round(6 + (min / maxMin) * 30));

  return (
    <div className="rounded-[20px] px-4 pt-3.5 pb-3.5"
      style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(43,212,160,0.20)", boxShadow: "0 6px 22px rgba(43,212,160,0.08)" }}>
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-[13.5px] font-bold" style={{ color: "var(--text-1)" }}>Ton élan</p>
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
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sheet « Je choisis » — catalogue Vaiiya + bibliothèque perso FUSIONNÉS.
   Un seul jeu de filtres, badge « Perso » doré, actions perso sous la tuile.
   ════════════════════════════════════════════════════════════════════ */
type MergedSession = WorkoutSession & { perso: boolean };

function SessionTile({ session, onStart, onManage }: {
  session: MergedSession;
  onStart: (s: MergedSession) => void;
  onManage: (s: MergedSession) => void;
}) {
  const tileArt = resolveArt({ title: session.title, category: session.category, muscles: session.muscles });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
      {/* La tuile = un seul geste : lancer. Photo NATURELLE plein cadre,
          scrim bas, typo blanche centrée, pastille durée — rien d'autre. */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onStart(session)}
        className="w-full rounded-[18px] overflow-hidden relative cursor-pointer border-none p-0 block"
        style={{ aspectRatio: "3 / 4", boxShadow: "0 10px 26px rgba(0,0,0,0.2)" }}
        aria-label={`Lancer : ${session.title}`}
      >
        <Photo img={tileArt.img} pos="center 20%" style={{ position: "absolute", inset: 0 }} />

        {/* Scrim bas : éyebrow · titre · durée — pile centrée, lisible partout */}
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-3 pt-12 flex flex-col items-center text-center"
          style={{ background: "linear-gradient(to top, rgba(6,5,10,0.88) 22%, rgba(6,5,10,0.38) 64%, transparent)" }}>
          <p className="text-[7.5px] font-extrabold tracking-[0.22em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            {session.perso ? "Perso" : "Séance"}
          </p>
          <p className="text-[12.5px] font-black uppercase text-white leading-[1.12] tracking-tight"
            style={{
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}>
            {session.title}
          </p>
          <span className="mt-1.5 px-2.5 py-[3px] rounded-full text-[8px] font-extrabold tracking-[0.08em] text-white"
            style={{ border: "1px solid rgba(255,255,255,0.65)" }}>
            {session.duration} MIN
          </span>
        </div>
      </motion.button>

      {/* Gérer (perso) — un ⋯ discret sur la carte, le menu fait le reste */}
      {session.perso && (
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => onManage(session)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
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

  const rowTile = (s: MergedSession) => (
    <div key={s.id} className="flex-shrink-0" style={{ width: ROW_CARD_W, scrollSnapAlign: "start" }}>
      <SessionTile session={s} onStart={onStart} onManage={setManage} />
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
              <SessionTile key={s.id} session={s} onStart={onStart} onManage={setManage} />
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
   Sheet « Organiser » — le planning complet (WeeklyProgramme) : semaines,
   jours, tutos, régénération, lieu. La page reste au présent, la
   préparation vit ici.
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
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

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
  const [sheet, setSheet] = useState<null | "choisir" | "improviser" | "organiser">(null);
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
      let sessions = 0, minutes = 0, kcal = 0;

      for (const r of data ?? []) {
        const started = r.started_at as string | null;
        if (!started) continue;
        const key = ymdLocal(new Date(started));
        const min = r.elapsed_seconds
          ? Math.max(1, Math.round((r.elapsed_seconds as number) / 60))
          : ((r.duration_minutes as number) ?? 0);
        dayMin.set(key, (dayMin.get(key) ?? 0) + min);
        dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
        const off = weekOffsetOf(key);
        activeWeeks.add(off);
        if (off === 0) { sessions += 1; minutes += min; kcal += (r.calories_burned as number) ?? 0; }
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

      setElan({ bars, sessions, minutes, kcal, streak, hasHistory: (data?.length ?? 0) > 0 });
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
  const startToday = () => {
    if (!todayDay || !hasSeance(todayDay)) return;
    setActiveWorkout({
      id: `planning-${todayDay.date}`,
      title: dayTitle(todayDay),
      duration: todayDay.type === "HIIT" ? 30 : 45,
      difficulty: todayDay.difficulty,
      category: todayDay.type,
      exerciseList: todayDay.exerciseList,
      planningDate: todayDay.date,
    });
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
          <WeekStrip week={week} todayIdx={todayIdx} onOrganise={() => setSheet("organiser")} />
        </motion.div>

        {/* ── ④ Ton élan ── */}
        <motion.div
          data-tour-anchor="prog-elan"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-3"
        >
          <ElanStrip data={elan} />
        </motion.div>
      </div>

      {/* ══ Sheets ══ */}
      <AnimatePresence>
        {sheet === "organiser" && (
          <OrganiserSheet onClose={() => { setSheet(null); void loadWeek(); }} />
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
