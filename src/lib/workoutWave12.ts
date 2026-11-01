import type { Exercise } from "@/components/WorkoutGuideModal";
import { CLASSIQUES, exercicesDuClassique } from "@/lib/classiques";

/* ════════════════════════════════════════════════════════════════════
   Vague 12 du catalogue : les classiques (maquette « Le chrono et le
   score », GO de Louis le 2026-11-01). La même séance, d'un mois sur
   l'autre, pour battre ton score.

   ⚠️ Les exercices se DÉRIVENT des classiques (lib/classiques.ts), qui
   sont la seule écriture : un classique décrit une fois ne peut pas
   dire une chose à son chrono et une autre au catalogue. Le chrono des
   classiques ne lit pas ces listes, il suit ses morceaux ; elles servent
   à « Refaire », au Guide et au planning.
   ════════════════════════════════════════════════════════════════════ */
export const WAVE_12_EXERCISES: Record<string, Exercise[]> = Object.fromEntries(
  CLASSIQUES.map((c) => [c.id, exercicesDuClassique(c)]),
);
