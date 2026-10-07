/* ════════════════════════════════════════════════════════════════════
   R4 · LES CORRECTIONS DE MARGE, ÉCRITES DANS L'ORDRE (tour 30)

   Une réponse donnée sur l'écran de fin s'écrit après l'enregistrement de
   la séance (`corriger_marge`). Trois règles :
   - par emplacement, une seule écriture à la fois, dans l'ordre : deux
     requêtes ne peuvent pas se terminer à l'envers ;
   - on retient la dernière réponse CONFIRMÉE par la base, pas la dernière
     envoyée : « 1 ou 2 → Aucune → 1 ou 2 » renvoie bien la dernière ;
   - un échec se rejoue (quelques essais espacés), puis reste en attente
     jusqu'à la prochaine demande.

   Pure à part l'envoi et l'attente, qu'on lui passe : le banc les
   remplace.
   ════════════════════════════════════════════════════════════════════ */

import type { Marge } from "@/lib/progression";

export type FileMarges = {
  /** Veut que la base porte cette marge. Résout `true` une fois confirmée. */
  demander: (emplacement: number, marge: Marge) => Promise<boolean>;
  /** La dernière marge confirmée par la base. */
  confirmee: (emplacement: number) => Marge | null;
};

export function fileDeMarges(
  envoyer: (emplacement: number, marge: Marge) => Promise<boolean>,
  attendre: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  essais = 3,
): FileMarges {
  const voulues = new Map<number, Marge>();
  const confirmees = new Map<number, Marge>();
  const chaines = new Map<number, Promise<boolean>>();

  /* Écrit jusqu'à ce que la base porte la dernière réponse voulue. */
  async function vider(e: number): Promise<boolean> {
    let echecs = 0;
    while (voulues.get(e) !== confirmees.get(e)) {
      const m = voulues.get(e) as Marge;
      if (await envoyer(e, m)) { confirmees.set(e, m); echecs = 0; continue; }
      if (++echecs >= essais) return false;
      await attendre(1000 * 2 ** echecs);
    }
    return true;
  }

  return {
    demander(e, m) {
      voulues.set(e, m);
      const suite = (chaines.get(e) ?? Promise.resolve(true)).then(() => vider(e), () => vider(e));
      chaines.set(e, suite);
      return suite;
    },
    confirmee: (e) => confirmees.get(e) ?? null,
  };
}
