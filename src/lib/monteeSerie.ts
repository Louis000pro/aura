/* ─────────────────────────────────────────────────────────────────────
   LA FLAMME MONTE (Louis, 2026-10-17, page « Revenir chaque jour » du
   canevas « Les rangs et le profil »).

   À l'ouverture où la série a grandi, la tuile de l'accueil rejoue la
   montée : la flamme prend son souffle, le chiffre passe de 11 à 12, un
   trait s'allume, et l'EXP gagnée depuis la dernière visite part vers le
   rang. Le jour d'un palier, la flamme change de forme.

   ⚠️ ON COMPARE À CE QUE CET APPAREIL A DÉJÀ MONTRÉ, JAMAIS À « HIER ».
   La série ne grandit qu'une fois par jour : comparer au dernier chiffre
   vu suffit à jouer la montée une seule fois, à la première ouverture qui
   la voit, même si la connexion du jour est créditée une seconde après
   le premier affichage.
   ⚠️ SANS REPÈRE, ON NOTE EN SILENCE (même règle que la célébration de
   rang) : sinon tout le monde verrait une montée à sa première ouverture
   après la mise en ligne, pour une série gagnée depuis longtemps.
   ⚠️ UNE SÉRIE QUI REDESCEND NE JOUE RIEN : une coupure n'est pas un
   événement, encore moins un reproche.
   ───────────────────────────────────────────────────────────────────── */

import { palierFlamme, type IdFlamme } from "@/lib/flammesSerie";

export type VuSerie = { serie: number; exp: number };

export type Montee = {
  deSerie: number;
  aSerie: number;
  /** L'EXP montrée la dernière fois, jamais au-dessus de l'actuelle. */
  deExp: number;
  aExp: number;
  palierAvant: IdFlamme;
  palierApres: IdFlamme;
};

/** Pure : la montée à jouer, ou `null`. */
export function decideMontee(vu: VuSerie | null, actuel: VuSerie): Montee | null {
  if (!vu) return null;
  if (!(actuel.serie > vu.serie)) return null;
  return {
    deSerie: vu.serie,
    aSerie: actuel.serie,
    deExp: Math.min(vu.exp, actuel.exp),
    aExp: actuel.exp,
    palierAvant: palierFlamme(vu.serie).id,
    palierApres: palierFlamme(actuel.serie).id,
  };
}

const cle = (userId: string) => `vaiiya_serie_vue_${userId}`;

export function lireVuSerie(userId: string): VuSerie | null {
  try {
    const brut = localStorage.getItem(cle(userId));
    if (!brut) return null;
    const v = JSON.parse(brut) as VuSerie;
    return v && Number.isFinite(v.serie) && Number.isFinite(v.exp) ? v : null;
  } catch {
    return null;
  }
}

export function noterVuSerie(userId: string, vu: VuSerie): void {
  try {
    localStorage.setItem(cle(userId), JSON.stringify(vu));
  } catch {
    /* Stockage refusé (navigation privée) : la montée ne jouera pas, et
       c'est tout. Rien ne dépend d'elle. */
  }
}
