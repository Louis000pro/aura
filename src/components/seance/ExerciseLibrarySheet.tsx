"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Search, Check, Plus, Sparkles } from "lucide-react";
import ExerciseThumb from "./ExerciseThumb";
import ExerciseDetailSheet from "./ExerciseDetailSheet";
import {
  chercherExercices, libelleReps, estAnime, EXERCISE_LIBRARY, ZONES, EQUIPS,
  type LibExercise, type Zone, type Equip,
} from "@/lib/exerciseLibrary";

/* ════════════════════════════════════════════════════════════════════
   LA BIBLIOTHÈQUE · l'écran où l'on regarde et où l'on choisit.

   Ce qui compte ici : on ne tape plus un nom au hasard, on PIQUE dans une
   liste où chaque exo a déjà son personnage animé, ses muscles et ses
   consignes. Ce qui arrive dans la séance perso est donc exactement de la
   même qualité que le catalogue Vaiiya.

   Deux entrées, un seul écran :
   • « selection » depuis la création, on complète une séance en cours ;
   • « exploration » depuis Entraînement, où la bibliothèque est une
     vitrine (les 102 personnages sont ce qu'on a de plus beau et ils ne
     se voyaient jusqu'ici qu'une fois DANS une séance).

   Dans les deux cas, toucher une carte ouvre sa fiche et la pastille
   ajoute directement : on peut lire avant de choisir, ou aller vite.

   Le champ libre reste possible (dernière carte quand rien ne matche) :
   un exo maison n'aura simplement pas d'animation, et l'écran le dit
   plutôt que de le promettre.
   ════════════════════════════════════════════════════════════════════ */

export default function ExerciseLibrarySheet({
  dejaChoisis,
  mode = "selection",
  ficheInitiale = null,
  onClose,
  onAjouter,
  onAjouterLibre,
}: {
  dejaChoisis: string[];
  mode?: "selection" | "exploration";
  /** Ouvre l'écran directement sur ce mouvement (touché depuis la vitrine). */
  ficheInitiale?: LibExercise | null;
  onClose: () => void;
  onAjouter: (exos: LibExercise[]) => void;
  onAjouterLibre: (nom: string) => void;
}) {
  const [texte, setTexte] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [equip, setEquip] = useState<Equip | null>(null);
  const [choix, setChoix] = useState<string[]>([]);
  const [fiche, setFiche] = useState<LibExercise | null>(ficheInitiale);
  const exploration = mode === "exploration";

  const presents = useMemo(() => new Set(dejaChoisis.map(n => n.toLowerCase())), [dejaChoisis]);
  const resultats = useMemo(() => chercherExercices({ texte, zone, equip }), [texte, zone, equip]);

  const basculer = (e: LibExercise) =>
    setChoix(p => p.includes(e.name) ? p.filter(n => n !== e.name) : [...p, e.name]);

  /* La sélection survit aux changements de filtre : on relit la liste
     complète, pas les résultats affichés à l'instant du clic. */
  const valider = () => {
    const choisis = choix
      .map(n => EXERCISE_LIBRARY.find(e => e.name === n))
      .filter((e): e is LibExercise => !!e);
    if (choisis.length) onAjouter(choisis);
    onClose();
  };

  const filtreActif = { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", border: "1px solid transparent" };
  const filtreRepos = { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[104] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
        className="w-full md:max-w-3xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgba(var(--surface-rgb),0.98)",
          border: "1px solid rgba(var(--tint-violet-rgb),0.9)",
          boxShadow: "0 24px 70px rgba(var(--accent-rgb),0.22)",
          height: "min(94dvh, 900px)",
          maxHeight: "94vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── En-tête ── */}
        <div className="px-5 pt-5 pb-3 flex flex-col gap-3" style={{ borderBottom: "1px solid rgba(var(--tint-violet-rgb),0.8)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>
                {exploration ? `${EXERCISE_LIBRARY.length} exercices animés` : "Bibliothèque"}
              </p>
              <h2 className="text-lg font-light mt-0.5" style={{ color: "var(--text-1)" }}>
                {exploration ? "Les mouvements" : "Choisis tes exercices"}
              </h2>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
              <X size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
            </motion.button>
          </div>

          {/* Recherche */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl"
            style={{ background: "rgba(var(--tint-violet-rgb),0.45)", border: "1px solid rgba(var(--violet-mid-rgb),0.45)" }}>
            <Search size={14} strokeWidth={2} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <input
              value={texte}
              onChange={e => setTexte(e.target.value)}
              placeholder="Chercher un exercice ou un muscle…"
              className="flex-1 bg-transparent text-sm outline-none min-w-0"
              style={{ color: "var(--text-1)" }}
            />
            {texte && (
              <button onClick={() => setTexte("")} className="cursor-pointer flex-shrink-0">
                <X size={13} strokeWidth={2} style={{ color: "var(--text-3)" }} />
              </button>
            )}
          </div>

          {/* Zones */}
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => setZone(null)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer flex-shrink-0"
              style={zone === null ? filtreActif : filtreRepos}>
              Tout
            </motion.button>
            {ZONES.map(z => (
              <motion.button key={z.id} whileTap={{ scale: 0.94 }}
                onClick={() => setZone(p => p === z.id ? null : z.id)}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer flex-shrink-0"
                style={zone === z.id ? filtreActif : filtreRepos}>
                {z.label}
              </motion.button>
            ))}
          </div>

          {/* Matériel */}
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {EQUIPS.map(eq => (
              <motion.button key={eq.id} whileTap={{ scale: 0.94 }}
                onClick={() => setEquip(p => p === eq.id ? null : eq.id)}
                className="px-3 py-1 rounded-full text-[10px] font-semibold cursor-pointer flex-shrink-0"
                style={equip === eq.id
                  ? { background: "rgba(var(--accent-rgb),0.14)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.4)" }
                  : { background: "transparent", color: "var(--text-3)", border: "1px solid rgba(var(--tint-violet-rgb),0.9)" }
                }>
                {eq.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Grille ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
          {resultats.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-3 py-12">
              <p className="text-sm" style={{ color: "var(--text-2)" }}>
                Aucun exercice ne correspond.
              </p>
              {texte.trim() && (
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => { onAjouterLibre(texte.trim()); onClose(); }}
                  className="px-4 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer"
                  style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.35)" }}>
                  Ajouter « {texte.trim()} » quand même
                </motion.button>
              )}
              <p className="text-[11px] max-w-xs" style={{ color: "var(--text-3)" }}>
                Un exercice maison marche très bien, il n’aura simplement pas de personnage animé.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {resultats.map((e, i) => {
                const pris = presents.has(e.name.toLowerCase());
                const actif = choix.includes(e.name);
                /* La carte n'est PAS un seul bouton : son corps ouvre la
                   fiche (on lit avant de choisir), la pastille ajoute tout
                   de suite (on va vite quand on sait déjà). Deux boutons
                   frères, jamais imbriqués. */
                return (
                  <div key={e.name} className="relative">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setFiche(e)}
                      className="w-full h-full rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center cursor-pointer"
                      style={{
                        background: actif
                          ? "linear-gradient(160deg, rgba(139,92,246,0.16), rgba(193,59,193,0.10))"
                          : "rgba(var(--tint-violet-rgb),0.32)",
                        border: actif
                          ? "1px solid rgba(var(--accent-rgb),0.55)"
                          : "1px solid rgba(var(--violet-mid-rgb),0.32)",
                        opacity: pris ? 0.55 : 1,
                      }}
                      aria-label={`${e.name}, voir la fiche`}
                    >
                      <ExerciseThumb name={e.name} size={78} delay={i * 90} />
                      <p className="text-[12px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
                        {e.name}
                      </p>
                      <p className="text-[9.5px] leading-tight" style={{ color: "var(--text-3)" }}>
                        {e.muscles.slice(0, 2).join(" · ")}
                      </p>
                      <p className="text-[9.5px] font-semibold" style={{ color: "var(--accent)" }}>
                        {e.sets} × {libelleReps(e.mode, e.reps, e.seconds, e.unite)}
                      </p>
                    </motion.button>

                    {/* Pastille d'état, cliquable sauf quand l'exo est déjà pris */}
                    {pris ? (
                      <span className="absolute top-2 right-2 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(43,212,160,0.16)", color: "#2BD4A0" }}>
                        Ajouté
                      </span>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => basculer(e)}
                        className="absolute top-0.5 right-0.5 w-8 h-8 flex items-center justify-center cursor-pointer"
                        aria-label={actif ? `Retirer ${e.name}` : `Ajouter ${e.name}`}
                        aria-pressed={actif}
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={actif
                            ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }
                            : { border: "1px solid rgba(var(--violet-mid-rgb),0.55)", background: "rgba(var(--surface-rgb),0.75)" }
                          }>
                          {actif
                            ? <Check size={11} strokeWidth={3} color="#fff" />
                            : <Plus size={10} strokeWidth={2.5} style={{ color: "var(--text-3)" }} />}
                        </span>
                      </motion.button>
                    )}

                    {/* Marque « animé » : jamais promise sans sprite. */}
                    {estAnime(e.name) && (
                      <span className="absolute top-2 left-2 flex items-center gap-0.5 text-[8.5px] font-bold pointer-events-none"
                        style={{ color: "var(--gold)" }}>
                        <Sparkles size={9} strokeWidth={2.4} /> animé
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Exercice maison, même quand la recherche donne des résultats */}
          {resultats.length > 0 && texte.trim() && (
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => { onAjouterLibre(texte.trim()); onClose(); }}
              className="w-full mt-3 py-3 rounded-2xl text-[12px] font-semibold cursor-pointer"
              style={{ background: "transparent", color: "var(--text-3)", border: "1px dashed rgba(var(--violet-mid-rgb),0.5)" }}>
              Ajouter « {texte.trim()} » comme exercice perso
            </motion.button>
          )}
        </div>

        {/* ── Pied ── */}
        <div className="px-5 pt-3" style={{ borderTop: "1px solid rgba(var(--tint-violet-rgb),0.8)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={valider}
            disabled={choix.length === 0}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer"
            style={choix.length > 0
              ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 8px 24px rgba(139,92,246,0.28)" }
              : { background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-3)" }
            }
          >
            {choix.length === 0
              ? exploration ? "Choisis des mouvements pour en faire une séance" : "Sélectionne des exercices"
              : exploration ? `En faire une séance (${choix.length})`
              : `Ajouter ${choix.length} exercice${choix.length > 1 ? "s" : ""}`}
          </motion.button>
        </div>
      </motion.div>

      {/* ── La fiche, par-dessus la grille ──
         Posée en dehors de la feuille : celle-ci s'anime en `transform`,
         ce qui ferait d'elle le référentiel d'un enfant `fixed`. Le voile,
         lui, ne bouge pas et couvre déjà tout l'écran. */}
      <AnimatePresence>
        {fiche && (
          <ExerciseDetailSheet
            exo={fiche}
            choisi={choix.includes(fiche.name)}
            dejaDansLaSeance={presents.has(fiche.name.toLowerCase())}
            onBasculer={() => basculer(fiche)}
            onClose={() => setFiche(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
