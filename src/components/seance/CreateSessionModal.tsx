"use client";

import { useState, useEffect, useMemo } from "react";
import { aiFetch } from "@/lib/aiFetch";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import {
  X, Plus, Trash2, Clock, Check, ChevronLeft, Sparkles,
  Dumbbell, Flame, Wind, Layers, GripVertical, Library, Timer, Repeat,
} from "lucide-react";
import type { Exercise } from "@/components/WorkoutGuideModal";
import ExerciseThumb from "./ExerciseThumb";
import ExerciseLibrarySheet from "./ExerciseLibrarySheet";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  ALL_MUSCLES, libelleReps, trouverExercice, estAnime,
  type LibExercise, type RepMode,
} from "@/lib/exerciseLibrary";

/* ════════════════════════════════════════════════════════════════════
   CRÉER MA SÉANCE · le parcours en trois temps.

   L'ancienne modale demandait tout à la fois dans un seul long scroll :
   l'IA, le nom, la catégorie, la difficulté, quatorze pastilles de muscles
   à cocher, puis les exercices tapés à la main. Deux conséquences : on ne
   savait pas où regarder, et un nom d'exo approximatif privait la séance
   de son personnage animé dans le tunnel.

   Ici : ① l'idée (nom, type, niveau, ou l'✦ qui remplit tout)
         ② les exercices, choisis dans la bibliothèque animée
         ③ le détail (durée calculée, muscles déduits tout seuls).

   Les muscles ne se cochent plus à la main : ils viennent des exercices
   choisis. On peut toujours en ajouter ou en retirer à l'étape 3.
   ════════════════════════════════════════════════════════════════════ */

export type WorkoutCategory = "force" | "cardio" | "mobilite" | "fullbody";
export type Difficulty = "Débutant" | "Intermédiaire" | "Avancé";

/** Ce que la modale rend à la page : la page reste seule maîtresse de
    l'identifiant, de l'accent, de l'icône et de l'enregistrement. */
export type SessionDraft = {
  title: string;
  category: WorkoutCategory;
  difficulty: Difficulty;
  duration: number;
  muscles: string[];
  exerciseList: Exercise[];
};

type ExerciseForm = {
  id: string;
  name: string;
  sets: number;
  mode: RepMode;
  reps: number;
  seconds: number;
  unite: string;
  rest: number;
  restAfter: number;
  tip?: string;
  benefit?: string;
  exMuscles?: string[];
};

const ICONE_CATEGORIE: Record<WorkoutCategory, typeof Dumbbell> = {
  force: Dumbbell, cardio: Flame, mobilite: Wind, fullbody: Layers,
};
const LIBELLE_CATEGORIE: Record<WorkoutCategory, string> = {
  force: "Force", cardio: "Cardio", mobilite: "Mobilité", fullbody: "Full body",
};

const ETAPES = ["L’idée", "Les exercices", "Le détail"];

let compteurId = 0;
const nouvelId = () => `ex-${Date.now()}-${compteurId++}`;

/* ── Conversions ─────────────────────────────────────────────────────
   Un exo de la bibliothèque, un exo saisi à la main et un exo relu
   depuis la base doivent tous devenir le même formulaire. */

function depuisBibliotheque(e: LibExercise): ExerciseForm {
  return {
    id: nouvelId(), name: e.name, sets: e.sets, mode: e.mode, reps: e.reps,
    seconds: e.seconds, unite: e.unite, rest: e.rest, restAfter: 90,
    tip: e.tip, benefit: e.benefit, exMuscles: e.muscles,
  };
}

function depuisNomLibre(nom: string): ExerciseForm {
  const connu = trouverExercice(nom);
  if (connu) return depuisBibliotheque(connu);
  return {
    id: nouvelId(), name: nom, sets: 3, mode: "reps", reps: 12, seconds: 40,
    unite: "reps", rest: 60, restAfter: 90,
  };
}

/** Relit « 45s », « 2 min », « 10 par jambe », « 15 reps », « 12 ». */
function depuisExercice(e: Exercise): ExerciseForm {
  const brut = String(e.reps ?? "").trim();
  const minutes = brut.match(/(\d+)\s*min/i);
  const secondes = brut.match(/(\d+)\s*(?:s\b|sec)/i);
  const nombre = brut.match(/(\d+)/);
  const tenu = !!(minutes || secondes || e.auto);
  const dureeSec = e.auto ?? (minutes ? Number(minutes[1]) * 60 : secondes ? Number(secondes[1]) : 40);
  const unite = brut.replace(/^\s*\d+\s*/, "").trim() || "reps";
  return {
    id: nouvelId(),
    name: e.name,
    sets: e.sets ?? 3,
    mode: tenu ? "temps" : "reps",
    reps: nombre ? Number(nombre[1]) : 12,
    seconds: dureeSec,
    unite: tenu ? "reps" : unite,
    rest: e.rest ?? 60,
    restAfter: e.restAfter ?? 90,
    tip: e.tip || undefined,
    benefit: e.benefit || undefined,
    exMuscles: e.muscles,
  };
}

/** Durée = temps actif + repos entre séries + transitions, arrondie à 5 min. */
function calculerDuree(forms: ExerciseForm[]): number {
  const SEC_PAR_REP = 3;
  let total = 0;
  forms.forEach((ex, i) => {
    total += ex.mode === "temps" ? ex.sets * ex.seconds : ex.sets * ex.reps * SEC_PAR_REP;
    total += (ex.sets - 1) * ex.rest;
    if (i < forms.length - 1) total += ex.restAfter;
  });
  return Math.max(5, Math.round(total / 60 / 5) * 5);
}

/* ════════════════════════════════════════════════════════════════════ */

export default function CreateSessionModal({
  onClose,
  onSubmit,
  initial,
  isEdit = false,
}: {
  onClose: () => void;
  onSubmit: (draft: SessionDraft) => void;
  initial?: SessionDraft | null;
  isEdit?: boolean;
}) {
  const [etape, setEtape] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<WorkoutCategory>(initial?.category ?? "force");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "Intermédiaire");
  const [exForms, setExForms] = useState<ExerciseForm[]>(
    initial?.exerciseList?.length ? initial.exerciseList.map(depuisExercice) : [],
  );
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [bibliotheque, setBibliotheque] = useState(false);

  /* Muscles : déduits des exercices, corrigeables à la main. */
  const deduits = useMemo(() => {
    const vus: string[] = [];
    exForms.forEach(e => (e.exMuscles ?? []).forEach(m => { if (!vus.includes(m)) vus.push(m); }));
    return vus;
  }, [exForms]);
  const [ajoutes, setAjoutes] = useState<string[]>(() => {
    if (!initial?.muscles?.length) return [];
    const auto = new Set(initial.exerciseList?.flatMap(e => e.muscles ?? []) ?? []);
    return initial.muscles.filter(m => !auto.has(m));
  });
  const [retires, setRetires] = useState<string[]>([]);
  const muscles = useMemo(
    () => [...deduits, ...ajoutes].filter((m, i, t) => t.indexOf(m) === i && !retires.includes(m)),
    [deduits, ajoutes, retires],
  );
  const [muscleLibre, setMuscleLibre] = useState("");
  const [plusMuscles, setPlusMuscles] = useState(false);

  /* Assistant */
  const [iaOuvert, setIaOuvert] = useState(false);
  const [iaTexte, setIaTexte] = useState("");
  const [iaCharge, setIaCharge] = useState(false);
  const [iaErreur, setIaErreur] = useState("");

  const duration = calculerDuree(exForms);
  const exosValides = exForms.filter(e => e.name.trim());
  /* Les étapes sont librement navigables : la dernière ne valide donc que
     si le tout est complet, sinon le bouton final ne ferait rien. */
  const complet = !!title.trim() && exosValides.length > 0;
  const peutContinuer = etape === 0 ? !!title.trim() : etape === 1 ? exosValides.length > 0 : complet;

  useEffect(() => lockBodyModal(), []);

  /* ── Assistant : il remplit le formulaire, il ne crée rien tout seul ── */
  const genererParIA = async () => {
    if (!iaTexte.trim()) return;
    setIaCharge(true);
    setIaErreur("");
    try {
      const res = await aiFetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: iaTexte, category, difficulty, muscles }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.title) setTitle(data.title);
      if (Array.isArray(data.exercises) && data.exercises.length > 0) {
        setExForms(data.exercises.map((e: {
          name: string; sets?: number; reps?: number; rest?: number;
          restAfter?: number; tip?: string; benefit?: string; muscles?: string[];
        }) => {
          /* Si l'IA nomme un exo de la bibliothèque, on prend SES données :
             c'est ce qui garantit le personnage animé et les vraies consignes. */
          const base = depuisNomLibre(e.name ?? "");
          return {
            ...base,
            sets: Number(e.sets) || base.sets,
            reps: Number(e.reps) || base.reps,
            rest: Number(e.rest) || base.rest,
            restAfter: Number(e.restAfter) || base.restAfter,
            tip: e.tip ?? base.tip,
            benefit: e.benefit ?? base.benefit,
            exMuscles: Array.isArray(e.muscles) && e.muscles.length ? e.muscles : base.exMuscles,
          };
        }));
        setEtape(1);
      }
      setIaOuvert(false);
    } catch {
      setIaErreur("Génération impossible, réessaie.");
    } finally {
      setIaCharge(false);
    }
  };

  /* ── Exercices ── */
  const modifier = (id: string, patch: Partial<ExerciseForm>) =>
    setExForms(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
  const supprimer = (id: string) => setExForms(p => p.filter(e => e.id !== id));
  const ajouterDepuisBibliotheque = (exos: LibExercise[]) =>
    setExForms(p => [...p, ...exos.map(depuisBibliotheque)]);

  /* ── Muscles ── */
  const retirerMuscle = (m: string) => {
    setAjoutes(p => p.filter(x => x !== m));
    setRetires(p => p.includes(m) ? p : [...p, m]);
  };
  const ajouterMuscle = (m: string) => {
    const propre = m.trim();
    if (!propre) return;
    setRetires(p => p.filter(x => x !== propre));
    setAjoutes(p => p.includes(propre) || deduits.includes(propre) ? p : [...p, propre]);
    setMuscleLibre("");
  };

  const valider = () => {
    if (!title.trim() || exosValides.length === 0) return;
    const exerciseList: Exercise[] = exosValides.map(e => ({
      name: e.name.trim(),
      sets: e.sets,
      reps: libelleReps(e.mode, e.reps, e.seconds, e.unite),
      rest: e.rest,
      restAfter: e.restAfter,
      ...(e.mode === "temps" ? { auto: e.seconds } : {}),
      tip: e.tip ?? "Concentre-toi sur la forme et la respiration.",
      benefit: e.benefit ?? "Renforce et améliore les performances.",
      muscles: e.exMuscles?.length ? e.exMuscles : (muscles.length ? muscles : ["Corps entier"]),
    }));
    onSubmit({
      title: title.trim(),
      category,
      difficulty,
      duration,
      muscles: muscles.length ? muscles : ["Corps entier"],
      exerciseList,
    });
    onClose();
  };

  const animes = exosValides.filter(e => estAnime(e.name)).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:px-4"
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="w-full md:max-w-xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: "rgba(var(--surface-rgb),0.98)",
            border: "1px solid rgba(var(--tint-violet-rgb),0.9)",
            boxShadow: "0 24px 70px rgba(var(--accent-rgb),0.2)",
            height: "min(94dvh, 860px)",
            maxHeight: "94vh",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ══ En-tête ══ */}
          <div className="px-5 pt-5 pb-3.5 flex flex-col gap-3.5"
            style={{ borderBottom: "1px solid rgba(var(--tint-violet-rgb),0.8)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semiboldst" style={{ color: "var(--accent)" }}>
                  {isEdit ? "Modifier" : "Nouvelle séance"}
                </p>
                <h2 className="text-[19px] font-light mt-0.5 leading-tight" style={{ color: "var(--text-1)" }}>
                  {title.trim() || (isEdit ? "Ma séance" : "Créer ma séance")}
                </h2>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
                <X size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
              </motion.button>
            </div>

            {/* Fil des étapes : cliquable, on ne s'enferme pas dans un tunnel */}
            <div className="flex gap-1.5">
              {ETAPES.map((label, i) => {
                const atteignable = i === 0 || (i >= 1 && !!title.trim());
                const actif = i === etape;
                return (
                  <button
                    key={label}
                    onClick={() => { if (atteignable) setEtape(i); }}
                    className="flex-1 flex flex-col gap-1.5 cursor-pointer text-left"
                    style={{ opacity: atteignable ? 1 : 0.4 }}
                  >
                    <span className="h-1 rounded-full block" style={{
                      background: i <= etape
                        ? "linear-gradient(90deg,#8B5CF6,#C13BC1)"
                        : "rgba(var(--tint-violet-rgb),0.9)",
                    }} />
                    <span className="text-[10px] font-semibold"
                      style={{ color: actif ? "var(--accent)" : "var(--text-3)" }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══ Corps ══ */}
          <div className="flex-1 overflow-y-auto px-5 py-5" style={{ scrollbarWidth: "none" }}>
            <AnimatePresence mode="wait">

              {/* ─────────── ÉTAPE 1 · L'idée ─────────── */}
              {etape === 0 && (
                <motion.div key="e1"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>
                      Le nom
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Push du lundi, Cardio matin…"
                      className="w-full px-4 py-3.5 rounded-2xl text-base outline-none"
                      style={{
                        background: "rgba(var(--tint-violet-rgb),0.45)",
                        border: "1px solid rgba(var(--violet-mid-rgb),0.5)",
                        color: "var(--text-1)",
                      }}
                      autoFocus={!isEdit}
                    />
                  </div>

                  {/* L'✦ : replié par défaut, il ne mange plus la moitié de l'écran */}
                  <div className="rounded-2xl overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(var(--violet-mid-rgb),0.16) 0%, rgba(var(--cream-mid-rgb),0.10) 100%)",
                      border: "1px solid rgba(var(--accent-rgb),0.25)",
                    }}>
                    <button onClick={() => setIaOuvert(o => !o)}
                      className="w-full px-4 py-3 flex items-center gap-2.5 cursor-pointer text-left">
                      <Sparkles size={15} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <span className="text-[12.5px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>
                        Laisse l’✦ la construire
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                        {iaOuvert ? "Fermer" : "Optionnel"}
                      </span>
                    </button>
                    <AnimatePresence>
                      {iaOuvert && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 flex flex-col gap-2.5">
                            <textarea
                              value={iaTexte}
                              onChange={e => setIaTexte(e.target.value)}
                              placeholder="Décris ta séance : push prise de masse, 45 min, développé couché et épaules…"
                              rows={3}
                              className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none resize-none"
                              style={{
                                background: "rgba(var(--surface-rgb),0.8)",
                                border: "1px solid rgba(var(--violet-mid-rgb),0.4)",
                                color: "var(--text-1)", lineHeight: 1.5,
                              }}
                            />
                            {iaErreur && <p className="text-[11px]" style={{ color: "#FC8181" }}>{iaErreur}</p>}
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={genererParIA}
                              disabled={!iaTexte.trim() || iaCharge}
                              className="w-full py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2"
                              style={iaTexte.trim() && !iaCharge
                                ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }
                                : { background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-3)" }
                              }
                            >
                              {iaCharge ? (
                                <>
                                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                  </svg>
                                  Elle arrive…
                                </>
                              ) : "Construire la séance"}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>
                      Le type
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(ICONE_CATEGORIE) as WorkoutCategory[]).map(cat => {
                        const Icone = ICONE_CATEGORIE[cat];
                        const actif = category === cat;
                        return (
                          <motion.button key={cat} whileTap={{ scale: 0.94 }} onClick={() => setCategory(cat)}
                            className="py-3 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer"
                            style={actif
                              ? { background: "linear-gradient(160deg, rgba(139,92,246,0.18), rgba(193,59,193,0.10))", border: "1px solid rgba(var(--accent-rgb),0.5)" }
                              : { background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" }
                            }>
                            <Icone size={17} strokeWidth={1.8} style={{ color: actif ? "var(--accent)" : "var(--text-3)" }} />
                            <span className="text-[10px] font-semibold"
                              style={{ color: actif ? "var(--accent)" : "var(--text-3)" }}>
                              {LIBELLE_CATEGORIE[cat]}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Niveau */}
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>
                      Le niveau
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Débutant", "Intermédiaire", "Avancé"] as Difficulty[]).map(d => (
                        <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setDifficulty(d)}
                          className="py-2.5 rounded-xl text-[11.5px] font-semibold cursor-pointer"
                          style={difficulty === d
                            ? { background: "rgba(var(--accent-rgb),0.14)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.4)" }
                            : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" }
                          }>
                          {d}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────── ÉTAPE 2 · Les exercices ─────────── */}
              {etape === 1 && (
                <motion.div key="e2"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  {exForms.length === 0 ? (
                    <div className="rounded-3xl px-5 py-8 flex flex-col items-center text-center gap-4"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.3)", border: "1px dashed rgba(var(--violet-mid-rgb),0.5)" }}>
                      <div className="flex items-end justify-center -space-x-2">
                        {["Squat", "Pompes", "Gainage"].map((n, i) => (
                          <ExerciseThumb key={n} name={n} size={64} delay={i * 300} />
                        ))}
                      </div>
                      <div>
                        <p className="text-[15px] font-medium" style={{ color: "var(--text-1)" }}>
                          102 exercices animés t’attendent
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
                          Choisis-les dans la bibliothèque : ton personnage-guide te montre le geste pendant la séance.
                        </p>
                      </div>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => setBibliotheque(true)}
                        className="px-5 py-3 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center gap-2"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 8px 24px rgba(139,92,246,0.28)" }}>
                        <Library size={15} strokeWidth={2} /> Ouvrir la bibliothèque
                      </motion.button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semiboldst" style={{ color: "var(--accent)" }}>
                          {exForms.length} exercice{exForms.length > 1 ? "s" : ""}
                        </p>
                        {animes > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--gold)" }}>
                            <Sparkles size={10} strokeWidth={2.4} /> {animes} animé{animes > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <Reorder.Group axis="y" values={exForms} onReorder={setExForms} className="flex flex-col gap-2.5">
                        {exForms.map((ex, i) => (
                          <LigneExercice
                            key={ex.id}
                            ex={ex}
                            index={i}
                            dernier={i === exForms.length - 1}
                            ouvert={ouvert === ex.id}
                            onOuvrir={() => setOuvert(o => o === ex.id ? null : ex.id)}
                            onChange={patch => modifier(ex.id, patch)}
                            onSupprimer={() => supprimer(ex.id)}
                          />
                        ))}
                      </Reorder.Group>

                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => setBibliotheque(true)}
                        className="w-full py-3 rounded-2xl text-[12.5px] font-semibold cursor-pointer flex items-center justify-center gap-2"
                        style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.3)" }}>
                        <Plus size={14} strokeWidth={2.5} /> Ajouter des exercices
                      </motion.button>
                    </>
                  )}
                </motion.div>
              )}

              {/* ─────────── ÉTAPE 3 · Le détail ─────────── */}
              {etape === 2 && (
                <motion.div key="e3"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-6"
                >
                  {/* Récap */}
                  <div className="rounded-3xl p-5 flex flex-col gap-4"
                    style={{
                      background: "linear-gradient(150deg, rgba(139,92,246,0.14), rgba(193,59,193,0.08))",
                      border: "1px solid rgba(var(--accent-rgb),0.28)",
                    }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>
                          Durée estimée
                        </p>
                        <p className="text-[30px] font-light leading-none mt-1" style={{ color: "var(--text-1)" }}>
                          {duration} <span className="text-base">min</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>
                          Contenu
                        </p>
                        <p className="text-[13px] font-semibold mt-1.5" style={{ color: "var(--text-1)" }}>
                          {exosValides.length} exercice{exosValides.length > 1 ? "s" : ""}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                          {exosValides.reduce((n, e) => n + e.sets, 0)} séries au total
                        </p>
                      </div>
                    </div>

                    {exosValides.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto pt-1" style={{ scrollbarWidth: "none" }}>
                        {exosValides.map((e, i) => (
                          <ExerciseThumb key={e.id} name={e.name} size={52} delay={i * 140} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Muscles déduits */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] font-semiboldst" style={{ color: "var(--accent)" }}>
                        Muscles ciblés
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                        Déduits de tes exercices. Touche pour en retirer un.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {muscles.length === 0 && (
                        <span className="text-[12px]" style={{ color: "var(--text-3)" }}>Corps entier</span>
                      )}
                      {muscles.map(m => (
                        <motion.button key={m} whileTap={{ scale: 0.92 }} onClick={() => retirerMuscle(m)}
                          className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer flex items-center gap-1.5"
                          style={{ background: "rgba(var(--accent-rgb),0.13)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.32)" }}>
                          {m} <X size={9} strokeWidth={3} />
                        </motion.button>
                      ))}
                    </div>

                    {/* Compléter : replié, pour ne pas rendre l'écran de fin bavard */}
                    <button onClick={() => setPlusMuscles(o => !o)}
                      className="self-start text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                      style={{ color: "var(--text-3)" }}>
                      <Plus size={11} strokeWidth={2.5} /> {plusMuscles ? "Fermer" : "En ajouter un"}
                    </button>

                    <AnimatePresence>
                      {plusMuscles && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1.5 pb-3">
                            {ALL_MUSCLES.filter(m => !muscles.includes(m)).map(m => (
                              <motion.button key={m} whileTap={{ scale: 0.92 }} onClick={() => ajouterMuscle(m)}
                                className="px-2.5 py-1 rounded-full text-[10.5px] cursor-pointer"
                                style={{ background: "transparent", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" }}>
                                {m}
                              </motion.button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={muscleLibre}
                              onChange={e => setMuscleLibre(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); ajouterMuscle(muscleLibre); } }}
                              placeholder="Autre muscle…"
                              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                              style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)", color: "var(--text-1)" }}
                            />
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => ajouterMuscle(muscleLibre)}
                              disabled={!muscleLibre.trim()}
                              className="px-3.5 py-2 rounded-xl flex items-center justify-center cursor-pointer"
                              style={muscleLibre.trim()
                                ? { background: "rgba(var(--accent-rgb),0.15)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.35)" }
                                : { background: "rgba(var(--tint-violet-rgb),0.4)", color: "var(--text-3)", border: "1px solid rgba(var(--violet-mid-rgb),0.2)" }
                              }>
                              <Plus size={13} strokeWidth={2.5} />
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ══ Pied ══ */}
          <div className="px-5 pt-3.5 flex items-center gap-3"
            style={{ borderTop: "1px solid rgba(var(--tint-violet-rgb),0.8)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
            {etape > 0 && (
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => setEtape(e => e - 1)}
                className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }}>
                <ChevronLeft size={17} strokeWidth={2} style={{ color: "var(--text-2)" }} />
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { if (etape < 2) setEtape(e => e + 1); else valider(); }}
              disabled={!peutContinuer}
              className="flex-1 py-3.5 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              style={peutContinuer
                ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 8px 24px rgba(139,92,246,0.26)" }
                : { background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-3)" }
              }
            >
              {etape < 2
                ? "Continuer"
                : complet
                  ? <><Check size={15} strokeWidth={2.5} /> {isEdit ? "Enregistrer" : "Créer la séance"}</>
                  : "Il manque un exercice"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* ══ La bibliothèque, par-dessus ══ */}
      <AnimatePresence>
        {bibliotheque && (
          <ExerciseLibrarySheet
            dejaChoisis={exForms.map(e => e.name)}
            onClose={() => setBibliotheque(false)}
            onAjouter={ajouterDepuisBibliotheque}
            onAjouterLibre={nom => setExForms(p => [...p, depuisNomLibre(nom)])}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Une ligne d'exercice : repliée elle se lit d'un coup d'œil, dépliée
   elle se règle. La poignée seule déclenche le glissé, sinon on ne peut
   plus faire défiler la liste au doigt.
   ════════════════════════════════════════════════════════════════════ */
function LigneExercice({
  ex, index, dernier, ouvert, onOuvrir, onChange, onSupprimer,
}: {
  ex: ExerciseForm;
  index: number;
  dernier: boolean;
  ouvert: boolean;
  onOuvrir: () => void;
  onChange: (patch: Partial<ExerciseForm>) => void;
  onSupprimer: () => void;
}) {
  const controls = useDragControls();
  const anime = estAnime(ex.name);

  return (
    <Reorder.Item
      value={ex}
      dragListener={false}
      dragControls={controls}
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(var(--tint-violet-rgb),0.32)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}
    >
      {/* Ligne repliée */}
      <div className="flex items-center gap-2.5 p-2.5">
        <div
          onPointerDown={e => controls.start(e)}
          className="py-2 pl-0.5 pr-1 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        >
          <GripVertical size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
        </div>

        <button onClick={onOuvrir} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-left">
          {anime
            ? <ExerciseThumb name={ex.name} size={46} delay={index * 160} />
            : <div className="flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ width: 46, height: 46, background: "rgba(var(--accent-rgb),0.1)" }}>
                <Dumbbell size={16} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {ex.name || `Exercice ${index + 1}`}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {ex.sets} × {libelleReps(ex.mode, ex.reps, ex.seconds, ex.unite)} · {ex.rest}s de repos
            </p>
          </div>
        </button>

        <button onClick={onOuvrir}
          className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer flex-shrink-0"
          style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)" }}>
          {ouvert ? "OK" : "Régler"}
        </button>
      </div>

      {/* Réglages */}
      <AnimatePresence>
        {ouvert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex flex-col gap-3">
              {/* Nom, modifiable pour les exos maison */}
              <input
                type="text"
                value={ex.name}
                onChange={e => onChange({ name: e.target.value })}
                placeholder={`Exercice ${index + 1}`}
                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{ background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)", color: "var(--text-1)" }}
              />

              {/* Reps ou temps */}
              <div className="grid grid-cols-2 gap-2">
                {([["reps", "Répétitions", Repeat], ["temps", "Durée tenue", Timer]] as const).map(([mode, label, Icone]) => (
                  <motion.button key={mode} whileTap={{ scale: 0.95 }} onClick={() => onChange({ mode })}
                    className="py-2 rounded-xl text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                    style={ex.mode === mode
                      ? { background: "rgba(var(--accent-rgb),0.14)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.4)" }
                      : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" }
                    }>
                    <Icone size={12} strokeWidth={2} /> {label}
                  </motion.button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Compteur label="Séries" valeur={`${ex.sets}`}
                  onMoins={() => onChange({ sets: Math.max(1, ex.sets - 1) })}
                  onPlus={() => onChange({ sets: Math.min(10, ex.sets + 1) })} />
                {ex.mode === "reps" ? (
                  <Compteur label="Reps" valeur={`${ex.reps}`}
                    onMoins={() => onChange({ reps: Math.max(1, ex.reps - 1) })}
                    onPlus={() => onChange({ reps: Math.min(100, ex.reps + 1) })} />
                ) : (
                  <Compteur label="Durée" valeur={libelleReps("temps", 0, ex.seconds, "")}
                    onMoins={() => onChange({ seconds: Math.max(5, ex.seconds - (ex.seconds > 60 ? 15 : 5)) })}
                    onPlus={() => onChange({ seconds: Math.min(900, ex.seconds + (ex.seconds >= 60 ? 15 : 5)) })} />
                )}
                <Compteur label="Repos" valeur={`${ex.rest}s`}
                  onMoins={() => onChange({ rest: Math.max(0, ex.rest - 15) })}
                  onPlus={() => onChange({ rest: Math.min(300, ex.rest + 15) })} />
              </div>

              {!dernier && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(var(--accent-rgb),0.07)", border: "1px dashed rgba(var(--accent-rgb),0.28)" }}>
                  <Clock size={11} strokeWidth={1.8} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span className="text-[10px] font-medium flex-1" style={{ color: "var(--accent)" }}>
                    Récup avant l’exercice suivant
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onChange({ restAfter: Math.max(0, ex.restAfter - 15) })}
                      className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                      style={{ color: "var(--accent)" }}>−</button>
                    <span className="text-xs font-semibold w-8 text-center tabular-nums" style={{ color: "var(--text-1)" }}>
                      {ex.restAfter}s
                    </span>
                    <button onClick={() => onChange({ restAfter: Math.min(300, ex.restAfter + 15) })}
                      className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                      style={{ color: "var(--accent)" }}>+</button>
                  </div>
                </div>
              )}

              <button onClick={onSupprimer}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold cursor-pointer"
                style={{ background: "rgba(252,129,129,0.1)", color: "#FC8181" }}>
                <Trash2 size={11} strokeWidth={2} /> Retirer de la séance
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function Compteur({ label, valeur, onMoins, onPlus }: {
  label: string; valeur: string; onMoins: () => void; onPlus: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semiboldst mb-1.5 text-center" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <div className="flex items-center justify-between gap-1 px-2 py-2 rounded-xl"
        style={{ background: "rgba(var(--surface-rgb),0.75)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
        <button onClick={onMoins} className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-sm font-bold"
          style={{ color: "var(--accent)" }}>−</button>
        <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{valeur}</span>
        <button onClick={onPlus} className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-sm font-bold"
          style={{ color: "var(--accent)" }}>+</button>
      </div>
    </div>
  );
}
