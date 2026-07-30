/* ─────────────────────────────────────────────────────────────
   Les badges de profil.

   Un badge ne donne aucun avantage : il décore un profil, rien
   d'autre. C'est la seule forme de récompense autorisée — l'aura
   achète de la fierté, jamais du pouvoir.

   La base ne stocke que ce qui est débloqué (profile_badges) ;
   la définition vit ici pour pouvoir changer un nom ou une image
   sans migration.
   ───────────────────────────────────────────────────────────── */

import { imageEtat, SERIES } from "@/lib/defi";

export type Badge = {
  slug: string;
  nom: string;
  /** Ce qu'il faut faire pour l'avoir — écrit au futur, il s'affiche verrouillé. */
  condition: string;
  /** Le visage du badge : un cadrage de l'affiche complète, ou un dégradé. */
  image: string | null;
  degrade: string;
};

const VIOLET = "linear-gradient(135deg, #8B5CF6, #C13BC1)";

export const BADGE_PREMIER_RELAIS: Badge = {
  slug: "premier-relais",
  nom: "Premier relais",
  condition: "Terminer un relais, quel qu'il soit",
  image: null,
  degrade: VIOLET,
};

/** Le badge d'une série : son visage est l'affiche complète. */
export function badgeSerie(serie: string): Badge {
  const s = SERIES[serie as keyof typeof SERIES];
  return {
    slug: `serie-${serie}`,
    nom: s?.nom ?? serie,
    condition: "Dévoiler l'affiche en entier",
    image: imageEtat(serie, 4),
    degrade: VIOLET,
  };
}

/** Les badges qu'un défi met en jeu, dans l'ordre d'affichage. */
export function badgesDuDefi(serie: string): Badge[] {
  return [badgeSerie(serie), BADGE_PREMIER_RELAIS];
}

/** Retrouve la définition d'un badge débloqué, pour l'afficher sur un profil. */
export function badgeParSlug(slug: string): Badge | null {
  if (slug === BADGE_PREMIER_RELAIS.slug) return BADGE_PREMIER_RELAIS;
  if (slug.startsWith("serie-")) return badgeSerie(slug.slice("serie-".length));
  return null;
}
