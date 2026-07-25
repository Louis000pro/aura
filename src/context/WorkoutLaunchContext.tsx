"use client";

/* ════════════════════════════════════════════════════════════════════
   WorkoutLaunchContext — lanceur de séance GLOBAL.

   Jusqu'ici, seule la page /progression savait ouvrir le tunnel
   (WorkoutGuideModal en état local). L'assistant, lui, ne pouvait pas
   proposer « fais-la maintenant » : il n'avait aucun moyen de lancer une
   séance depuis n'importe où.

   Ce provider, monté au niveau du layout, tient le tunnel une fois pour
   toutes et expose launchWorkout(). Le tunnel s'auto-enregistre déjà
   (workout_sessions + maillon de relais) → rien d'autre à brancher ici.
   ════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence } from "framer-motion";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";

export type WorkoutLaunchInput = {
  sessionId: string;
  title: string;
  accent?: string;
  duration: number;
  difficulty: string;
  category?: string;
  heroImage?: string;
  exerciseList?: Exercise[];
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
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
