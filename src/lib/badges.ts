/* ─────────────────────────────────────────────────────────────
   Les badges de profil.

   Un badge ne donne aucun avantage : il décore un profil, rien
   d'autre. C'est la seule forme de récompense autorisée — l'aura
   achète de la fierté, jamais du pouvoir.

   ⚠️ UN BADGE SE DÉRIVE, IL NE SE RECOMPTE PAS. Jusqu'au
   2026-08-30 il n'en existait que quatre, tous écrits par
   `valider_action_defi` : aucun ne pouvait se gagner SEUL, donc
   l'étagère de quelqu'un qui s'entraîne sans relais restait vide.
   Il y en a eu vingt-deux avant, supprimés le 11 août parce
   qu'ils se recomptaient dans le navigateur à chaque ouverture,
   en sept requêtes, sans rien garder.
   La RPC `badges_aura` (20260830_badges_aura.sql) les tire des
   mêmes sources que `serie_aura`. Un compteur se désynchronise,
   une dérivation ne le peut pas — et l'historique du registre
   étant immuable, les badges sont rétroactifs sans backfill.

   Ce fichier porte le CATALOGUE : nom, condition, visage, ordre.
   Le serveur ne rend que des slugs, donc renommer un badge ou
   lui donner une planche ne demande aucune migration.
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
  /** À défaut de planche, le badge porte son nombre. Voir `EtagereBadges`. */
  nombre?: number;
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

/* ── Les badges dérivés ───────────────────────────────────────
   Trois familles, sur les trois seules choses que Vaiiya sait
   mesurer honnêtement : la régularité, le nombre de séances, le
   carnet de repas.

   ⚠️ RIEN SUR LE CORPS, et c'est la limite dure du rang depuis
   juillet : un badge « moins 5 kg » ferait exactement ce que le
   produit refuse. Rien de comparatif non plus, et aucun avantage.

   ⚠️ LES NOMS SONT PLATS EXPRÈS. L'ancien catalogue disait
   « Centurion », « Force Brute », « Cardio King » : c'est une
   voix de jeu vidéo, ce n'est pas la nôtre.

   ⚠️ LE PRÉFIXE N'EST PAS `serie-`, ET C'EST OBLIGATOIRE. Ce
   préfixe-là appartient aux affiches du relais, et
   `badgesEnEtagere` les écarte ; un badge `serie-7` serait donc
   gagné, rendu par le serveur, et invisible pour toujours. */

export type ProgresBadges = { serie: number; seances: number; repas: number };

type Famille = keyof ProgresBadges;

type BadgeDerive = Badge & { famille: Famille; seuil: number };

function derive(famille: Famille, seuil: number, prefixe: string, nom: string, condition: string): BadgeDerive {
  return { slug: `${prefixe}-${seuil}`, nom, condition, image: null, degrade: VIOLET, nombre: seuil, famille, seuil };
}

/** Le catalogue dérivé, dans l'ordre où il se lit sur une étagère. */
export const BADGES_DERIVES: BadgeDerive[] = [
  derive("serie",    7,   "regularite", "Sept jours",        "Sept journées actives d'affilée"),
  derive("serie",   30,   "regularite", "Trente jours",      "Trente journées actives d'affilée"),
  derive("serie",  100,   "regularite", "Cent jours",        "Cent journées actives d'affilée"),
  derive("seances",  10,  "seances",    "Dix séances",       "Terminer dix séances"),
  derive("seances",  50,  "seances",    "Cinquante séances", "Terminer cinquante séances"),
  derive("seances", 100,  "seances",    "Cent séances",      "Terminer cent séances"),
  derive("repas",    30,  "repas",      "Trente repas",      "Noter trente repas"),
  derive("repas",   100,  "repas",      "Cent repas",        "Noter cent repas"),
];

/** L'ordre d'affichage complet : le mérite seul d'abord, le lien ensuite. */
const CATALOGUE: Badge[] = [
  ...BADGES_DERIVES,
  BADGE_PREMIER_RELAIS,
];

/** Retrouve la définition d'un badge débloqué, pour l'afficher sur un profil. */
export function badgeParSlug(slug: string): Badge | null {
  if (slug === BADGE_PREMIER_RELAIS.slug) return BADGE_PREMIER_RELAIS;
  if (slug.startsWith("serie-")) return badgeSerie(slug.slice("serie-".length));
  return BADGES_DERIVES.find((b) => b.slug === slug) ?? null;
}

/**
 * Les badges débloqués à poser sur l'étagère d'un profil.
 *
 * ⚠️ Un badge d'AFFICHE (`serie-<slug>`) en est exclu, et ce n'est pas un
 * oubli : son visage est l'affiche, et l'affiche est déjà rendue en grand
 * dans la grille juste au-dessus. La remontrer en pastille de 56 px dirait
 * deux fois la même chose sur le même écran.
 *
 * L'étagère ne montre QUE ce qui est gagné : jamais de case vide, jamais de
 * cadenas. Les affiches en portent déjà trois, et deux murs sur un écran,
 * c'est un mur de trop.
 *
 * L'ordre vient du CATALOGUE, pas de la base : le serveur rend un tableau
 * dont l'ordre n'a aucune raison d'être stable, et une étagère qui se
 * réarrange d'une visite à l'autre ne se reconnaît pas.
 *
 * Un slug inconnu (badge retiré du catalogue, ligne d'une ancienne version)
 * est ignoré au lieu de faire un trou.
 */
export function badgesEnEtagere(slugs: Iterable<string>): Badge[] {
  const gagnes = new Set(slugs);
  return CATALOGUE.filter((b) => gagnes.has(b.slug));
}

/**
 * Le badge suivant, et ce qu'il reste à faire pour l'avoir.
 *
 * Une seule ligne, jamais un mur : l'étagère n'affiche pas les cases
 * verrouillées (voir ci-dessus), donc ce qui reste à prendre se dit en une
 * phrase, et seulement pour le prochain. C'est `resteMission()` appliqué aux
 * badges, le motif validé le 22 août sur les missions.
 *
 * Rend `null` quand tout est gagné : il n'y a alors rien à dire, et surtout
 * rien à réclamer.
 */
export function prochainBadge(progres: ProgresBadges): { badge: Badge; reste: number } | null {
  let meilleur: { badge: Badge; reste: number } | null = null;
  for (const b of BADGES_DERIVES) {
    const reste = b.seuil - progres[b.famille];
    if (reste <= 0) continue;
    if (!meilleur || reste < meilleur.reste) meilleur = { badge: b, reste };
  }
  return meilleur;
}
