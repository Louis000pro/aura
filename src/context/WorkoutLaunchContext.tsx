"use client";

/* ════════════════════════════════════════════════════════════════════
   WorkoutLaunchContext — lanceur de séance GLOBAL.

   Jusqu'ici, seule la page /progression savait ouvrir le tunnel
   (WorkoutGuideModal en état local). L'assistant, lui, ne pouvait pas
   proposer « fais-la maintenant » : il n'avait aucun moyen de lancer une
   séance depuis n'importe où.

   Ce provider, monté au niveau du layout, tient le tunnel une fois pour
   toutes et expose launchWorkout(). Le tunnel s'auto-enregistre déjà
   (workout_sessions + maillon de relais).

   ⚠️ V7A : IL TRANSMET AUSSI CE QUE LA SÉANCE REFERME. Depuis R1, c'est
   la finalisation du journal (`journalSeance.ts`) qui appelle
   `terminerSeance`, une fois la séance enregistrée. La logique vivait dans `/progression`, le seul
   écran qui savait lancer une séance du planning ; l'accueil sait le
   faire maintenant, donc la garder là-bas aurait donné deux autorités
   pour une même écriture. L'appelant déclare CE QU'IL LANCE (`cible`),
   `terminerSeance` décide de ce qui s'écrit.
   ════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence } from "framer-motion";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";
import type { CibleSeance } from "@/lib/finSeance";

export type WorkoutLaunchInput = {
  sessionId: string;
  title: string;
  accent?: string;
  duration: number;
  difficulty: string;
  category?: string;
  heroImage?: string;
  exerciseList?: Exercise[];
  /** Proposé en fin de séance (« Tu la gardes ? ») quand la séance lancée
   *  n'existe nulle part : sans ça, le travail disparaît à l'instant précis
   *  où l'on vient de prouver qu'il marchait. */
  onGarder?: () => void;
  /** Ce que cette séance referme quand elle est terminée : une intention
   *  datée, une étape du cycle, ou rien du tout (catalogue, impro, séance
   *  perso). Absent = la séance a eu lieu et ne referme rien, ce qui est
   *  la règle « une séance hors programme ne fait pas avancer le cycle ». */
  cible?: CibleSeance;
  /** Présent quand cette séance EST le maillon d'un relais : c'est la seule
   *  façon de franchir un maillon (la séance est donnée par le relais). */
  relaisRunId?: string;
};

type Value = { launchWorkout: (w: WorkoutLaunchInput) => void };

const Ctx = createContext<Value | null>(null);

export function useWorkoutLaunch(): Value {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWorkoutLaunch doit être utilisé dans <WorkoutLaunchProvider>");
  return c;
}

export function WorkoutLaunchProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<WorkoutLaunchInput | null>(null);
  const launchWorkout = useCallback((w: WorkoutLaunchInput) => setActive(w), []);

  return (
    <Ctx.Provider value={{ launchWorkout }}>
      {children}
      <AnimatePresence>
        {active && (
          <WorkoutGuideModal
            sessionId={active.sessionId}
            title={active.title}
            accent={active.accent ?? "var(--accent)"}
            duration={active.duration}
            difficulty={active.difficulty}
            category={active.category}
            heroImage={active.heroImage}
            exerciseList={active.exerciseList}
            onGarder={active.onGarder}
            relaisRunId={active.relaisRunId}
            /* R1 · la cible part AVEC la séance : le tunnel l'enregistre au
               journal, puis la referme par `terminerSeance`, et la garde en
               attente si l'enregistrement échoue. Un lancement ne referme
               qu'une fois parce que la base refuse d'enregistrer deux fois
               le même (identifiant de lancement), pas par un verrou en
               mémoire qui ne survit pas à un rechargement. */
            cible={active.cible ?? null}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
