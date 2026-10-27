/* ─────────────────────────────────────────────────────────────
   Ce qu'on a changé sur l'affiche d'une séance : son mot et son fond.

   ⚠️ Le journal des séances est IMMUABLE (R1, et `workout_sessions`
   n'a d'ailleurs aucune policy UPDATE) : modifier une affiche ne
   réécrit jamais la séance. C'est une décoration posée par-dessus, et
   elle vit sur l'appareil, par compte. Le jour où il faut qu'elle
   suive d'un téléphone à l'autre, c'est une petite table à créer,
   rien dans le journal.
   ───────────────────────────────────────────────────────────── */

/** Ce que porte une affiche de séance (`posts.performance_data`). */
export type PerformanceData = {
  type:     "workout" | "meal" | "day";
  title:    string;
  date:     string;
  metrics:  { label: string; value: string; unit?: string }[];
  highlight?: string;
};

export type ReglageAffiche = { mot?: string | null; teinte?: number };

const cle = (userId: string) => `vaiiya_affiches_${userId}`;

export function lireReglagesAffiches(userId: string): Record<string, ReglageAffiche> {
  try {
    const brut = localStorage.getItem(cle(userId));
    return brut ? (JSON.parse(brut) as Record<string, ReglageAffiche>) : {};
  } catch {
    return {};
  }
}

export function ecrireReglagesAffiches(userId: string, tous: Record<string, ReglageAffiche>) {
  try { localStorage.setItem(cle(userId), JSON.stringify(tous)); } catch { /* stockage bloqué : le réglage reste en mémoire */ }
}
