/* ════════════════════════════════════════════════════════════════════
   R3 · LES TRANSITIONS DU TUNNEL QU'UNE SAISIE PEUT INTERROMPRE
   (tour 27 de Codex)

   Pure : aucune horloge, aucun DOM. Les effets de `WorkoutGuideModal`
   demandent ici, à chaque passage, ce qu'ils ont le droit de faire ; le
   banc rejoue ces passages pour vérifier les parcours entiers, sans
   navigateur.

   ⚠️ UNE SAISIE OUVERTE ARRÊTE LE TEMPS QUI DÉCIDE À SA PLACE.
   - Pendant le repos, une correction ouverte fait attendre la reprise :
     le compteur reste à zéro, la vibration ne joue qu'une fois, et la
     reprise n'a lieu qu'une fois la correction fermée, une seule fois.
   - Pendant un effort chronométré, le choix d'un remplaçant suspend le
     3-2-1 ET le chrono : aucune série ne se valide derrière le panneau.

   ⚠️ UN CHOIX OUVERT SUR UNE SÉRIE NE S'APPLIQUE QU'À ELLE. Le panneau
   « Changer » retient l'emplacement et la série de son ouverture ; si le
   tunnel a bougé depuis, son choix est refusé au lieu de tomber sur
   l'exercice suivant.
   ════════════════════════════════════════════════════════════════════ */

/* ── Le repos ──────────────────────────────────────────────────────── */

export type EtatRepos = {
  restant: number;
  enPause: boolean;
  correctionOuverte: boolean;
  /** La vibration de fin de repos a déjà joué pour ce repos. */
  vibree: boolean;
};

export type PasRepos =
  | { action: "attendre" }
  | { action: "decompter" }
  /** À zéro. `vibrer` ne vaut vrai qu'au premier passage ; `reprendre`
   *  ne vaut vrai que si aucune correction n'est ouverte. */
  | { action: "zero"; vibrer: boolean; reprendre: boolean };

export function pasDuRepos(e: EtatRepos): PasRepos {
  if (e.enPause) return { action: "attendre" };
  if (e.restant > 0) return { action: "decompter" };
  return { action: "zero", vibrer: !e.vibree, reprendre: !e.correctionOuverte };
}

/* ── L'effort chronométré ──────────────────────────────────────────── */

export type EtatEffort = {
  enPause: boolean;
  /** Le panneau « Changer » est ouvert sur la série en cours. */
  choixOuvert: boolean;
  /** Le 3-2-1 restant. */
  prep: number;
  chronometre: boolean;
  restant: number;
};

export type PasEffort = "attendre" | "decompter_prep" | "decompter" | "terminer";

export function pasDeLEffort(e: EtatEffort): PasEffort {
  if (e.enPause || e.choixOuvert) return "attendre";
  if (e.prep > 0) return "decompter_prep";
  if (!e.chronometre) return "attendre";
  return e.restant > 0 ? "decompter" : "terminer";
}

/* ── Le panneau « Changer » ────────────────────────────────────────── */

export type PositionTunnel = { emplacement: number; serie: number };

/** Le choix ouvert sur `ouvert` vaut-il encore pour la position courante ? */
export function choixApplicable(
  ouvert: PositionTunnel,
  courant: PositionTunnel & { enEffort: boolean },
): boolean {
  return courant.enEffort && ouvert.emplacement === courant.emplacement && ouvert.serie === courant.serie;
}

/* ── Les répétitions déclarées avant « Fait » ──────────────────────── */

/** Une saisie de répétitions vaut pour UNE série : celle où elle a été faite. */
export type SaisieReps = PositionTunnel & { reps: number };

/** Ce que la série courante déclarera : la saisie si elle porte sur elle,
 *  sinon la cible prescrite. La prescription, elle, ne change jamais. */
export function repsADeclarer(cible: number | null, saisie: SaisieReps | null, courant: PositionTunnel): number | null {
  if (saisie && saisie.emplacement === courant.emplacement && saisie.serie === courant.serie) return saisie.reps;
  return cible;
}
