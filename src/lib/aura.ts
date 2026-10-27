// ─────────────────────────────────────────────────────────────────────────────
// L'aura : EXP, missions et rangs de Vaiiya
//
// Le système tient en trois phrases, et il doit s'expliquer en vingt secondes :
//
//   LA SÉRIE   « je reviens régulièrement »  → une journée validée par jour
//   L'EXP      « je fais des missions »      → des nombres ronds, fixes, écrits
//   LE RANG    « voilà où j'en suis »        → permanent, l'EXP ne descend pas
//
// ⚠️ TROIS RÈGLES VERROUILLÉES (refonte du 2026-08-21) :
//
//  1. AUCUN MULTIPLICATEUR, NULLE PART. Une mission rapporte le nombre écrit
//     sur elle, pour tout le monde. Le ×1,5 Premium a été supprimé : l'avantage
//     Premium est « plus de missions », jamais « les mêmes qui rapportent
//     plus ». On doit pouvoir prévoir son gain AVANT d'agir.
//
//  2. SE CONNECTER NE VALIDE PAS LA JOURNÉE. La connexion rapporte +10 EXP (+20 d’affilée),
//     mais seule une ACTION UTILE (une séance, un repas) valide la journée et
//     tient la série. Récupération et mobilité sont des séances du catalogue :
//     elles comptent déjà, sans catégorie nouvelle.
//
//  3. UNE SEULE LOGIQUE DE CALCUL, ET ELLE EST EN BASE. `etat_missions_aura`
//     (migration 20260821_economie_exp_v2.sql) est la seule autorité. Il n'y a
//     PLUS de repli client : l'ancien inventait une EXP différente de celle du
//     serveur, et personne ne pouvait dire laquelle était la vraie. Si la RPC
//     ne répond pas, l'app affiche un tiret plutôt qu'un chiffre faux.
// ─────────────────────────────────────────────────────────────────────────────

import type { createClient } from "@/lib/supabase";
import { lireJokers, noterJokersBase, type EtatJokers } from "@/lib/jokers";

type SB = ReturnType<typeof createClient>;

// ── Le barème. Des valeurs rondes, fixes, et rien d'autre. ──
/** Connexion : 10 le premier jour d'une suite, 20 chaque jour d'affilée
 *  ensuite (Louis, 2026-10-17). La base décide, `expMission` l'affiche. */
export const EXP_CONNEXION = 10;
export const EXP_CONNEXION_SUITE = 20;
export const EXP_SEANCE = 30;
export const EXP_REPAS = 5;
export const EXP_JOURNEE = 10;
/** Retourner la carte du mouvement du jour, une fois par jour (Louis,
 *  2026-10-17). Crédité par `decouvrir_mouvement_aura`.
 *
 *  ⚠️ CE N'EST PLUS UNE QUÊTE (Louis, le soir même) : elle n'apparaît ni
 *  dans le rail, ni dans « Voir tout », ni dans le compte du jour. Le gain
 *  reste, et il s'affiche là où il se gagne, sur la carte, AVANT de la
 *  retourner : ce n'est donc pas un bonus caché. */
export const EXP_MOUVEMENT = 5;

export const EXP_DOUBLE = 20;
export const EXP_MATIN = 20;
export const EXP_NUTRITION = 15;
export const EXP_OBJECTIF = 15;

export const EXP_SEMAINE_ACTIVE = 30;
export const EXP_SEMAINE_REGULIERE = 50;
export const EXP_SEMAINE_PARFAITE = 100;

/** Coup de pouce d'inscription : 50 offerts à tout compte (Louis, 2026-10-25).
 *  Le premier jour, une séance et un repas suffisent alors pour l'Argent :
 *  50 + connexion 10 + séance 30 + repas 5 + journée complète 10 = 105.
 *  Même constante en base (le `50 +` de etat_missions_aura et de ses
 *  voisines, 20261025_exp_bienvenue_relais.sql). */
export const EXP_BIENVENUE = 50;

/** Un relais gagné rapporte cette EXP à chaque membre, une fois par relais. */
export const EXP_RELAIS = 100;

/** Ce que les missions d'un compte gratuit rapportent au plus en une
 *  journée : 20 + 30 + 5 + 10. La carte du mouvement du jour (+5) vient en
 *  plus : elle n'est pas une mission, la feuille des missions ne la compte pas. */
export const PLAFOND_JOUR_GRATUIT = 65;
/** Ce que les missions d'un compte Premium rapportent au plus en une
 *  journée : 65 + 20 + 20 + 15 + 15. La carte du jour vient en plus. */
export const PLAFOND_JOUR_PREMIUM = 135;

// ── Reset global de l'aura ──
// Pour mémoire : les crédits historiques repris par la migration de juillet
// 2026 partent du 2026-07-22 (AURA_EPOCH, dans la migration). Le registre ne
// se réécrit jamais.

/** Un rang = un palier de l'aura. `min` = EXP minimale pour l'atteindre. */
export type Rang = {
  id: string;
  nom: string;
  min: number;
  /** Chemin du vrai logo PNG (détouré). Si absent/introuvable → repli SVG. */
  image?: string;
  /** Le néon de la gemme (dégradé) — repli SVG du composant GemmeRang. */
  neon: [string, string];
  /** La pierre (dégradé clair → foncé) — repli SVG. */
  pierre: [string, string, string];
};

// Ladder VALIDÉ par Louis : 6 rangs « métaux » Bronze → Éternel.
// ⭐ CE TABLEAU EST LA SOURCE UNIQUE DES SEUILS ET DES VISUELS. Personne
// d'autre n'a le droit d'écrire un seuil ni un chemin `/rangs/…` : la landing,
// la visite guidée et le popup de nouveautés le dérivaient à la main, ils
// avaient donc trois vérités à tenir d'accord.
//
// Seuils recalibrés le 2026-08-21 sur la nouvelle économie. Cadence de
// référence = un compte gratuit régulier gagne 50 EXP/jour au maximum, plus
// les défis de la semaine :
//   Argent  ~2 jours  ·  Or  ~1 semaine  ·  Platine  ~2 semaines
//   Diamant ~1 mois   ·  Éternel  ~2 mois (le sommet, il doit rester rare)
//
// ⚠️ Les six visuels définitifs (2026-08-20) sont arrivés SANS transparence et
// à des échelles différentes : `scripts/build-rangs.mjs` les détoure et les
// ramène tous au même canevas 320×512. Ne jamais poser ici le chemin d'une
// planche brute, elle afficherait un carré crème en mode sombre.
export const RANGS: Rang[] = [
  {
    id: "bronze",
    nom: "Bronze",
    min: 0,
    image: "/rangs/rank-01-bronze.png",
    neon: ["#E8A05A", "#B0672A"],
    pierre: ["#F5C88A", "#B87333", "#5c3410"],
  },
  {
    id: "argent",
    nom: "Argent",
    min: 100,
    image: "/rangs/rank-02-argent.png",
    neon: ["#DDE6F0", "#9AA6B8"],
    pierre: ["#F2F6FC", "#B8C2D0", "#6a7280"],
  },
  {
    id: "or",
    nom: "Or",
    min: 350,
    image: "/rangs/rank-03-or.png",
    neon: ["#FFDE7A", "#E8A015"],
    pierre: ["#FFE9A8", "#E8930C", "#7a4d08"],
  },
  {
    id: "platine",
    nom: "Platine",
    min: 800,
    image: "/rangs/rank-04-platine.png",
    neon: ["#CFF3EE", "#86CDC4"],
    pierre: ["#EAF8F5", "#A8D4CE", "#5c7472"],
  },
  {
    id: "diamant",
    nom: "Diamant",
    min: 1600,
    image: "/rangs/rank-05-diamant.png",
    neon: ["#A8E0FF", "#5AA8E8"],
    pierre: ["#DBF0FF", "#8CC8F0", "#3a6a90"],
  },
  {
    id: "eternel",
    nom: "Éternel",
    min: 3000,
    image: "/rangs/rank-06-eternel.png", // gemme d'or, monture violette gothique
    neon: ["#C9A8FF", "#8B5CF6"],
    pierre: ["#FFE9A8", "#E8A015", "#5a3a1a"],
  },
];

// Cap du DERNIER rang (Éternel) : c'est le sommet, il n'y a pas de « suivant ».
// Égal à son `min` → la jauge affiche l'Éternel comme accompli.
export const PALIER_PROVISOIRE = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// LE CATALOGUE DES MISSIONS
//
// ⭐ SOURCE UNIQUE. Le nom, la condition, l'EXP, la période et l'appartenance
// Premium d'une mission s'écrivent ICI, une fois. Les écrans les lisent, ils ne
// les recopient jamais : c'est ce qui garantit que le nombre annoncé sur
// l'accueil est exactement celui que la base va créditer.
//
// Ajouter une mission = 1) une entrée ici, 2) sa règle dans
// `evaluer_missions_aura` ou dans le trigger concerné, 3) son pictogramme.
// Les trois, ou aucun : une mission affichée qui ne crédite rien est un
// mensonge, une mission qui crédite sans s'afficher est un bonus caché.
// ─────────────────────────────────────────────────────────────────────────────

export type MissionId =
  | "connexion"
  | "seance"
  | "repas"
  | "journee"
  | "double"
  | "matin"
  | "nutrition"
  | "objectif"
  | "semaineActive"
  | "semaineReguliere"
  | "semaineParfaite";

export type Mission = {
  id: MissionId;
  titre: string;
  /** Ce qu'il faut faire, écrit pour être compris AVANT d'agir. */
  condition: string;
  /** Ce que ça rapporte. Un nombre fixe, jamais un calcul. */
  exp: number;
  periode: "jour" | "semaine";
  /** Réservée aux abonnés. Un compte gratuit la voit et voit sa progression.
   *
   *  ⚠️ FAIRE BASCULER UNE MISSION SE FAIT À DEUX ENDROITS, jamais un seul :
   *  ici (ce qui l'affiche en doré, avec sa puce « Premium » et son cachet
   *  verrouillé) ET dans le dernier argument de `crediter_mission_aura` côté
   *  SQL (ce qui décide qui l'encaisse vraiment). Ne changer que celui-ci
   *  ferait promettre à l'écran ce que la base continue de donner à tout le
   *  monde, ou l'inverse. */
  premium: boolean;
  /** L'unité de ce qu'il reste à faire, au singulier puis au pluriel.
   *
   *  Absente quand la mission se fait en une fois : sous un titre qui dit
   *  déjà « Terminer une séance », écrire « encore 1 séance » n'apprend
   *  rien, et c'est précisément le défaut de l'ancien « À FAIRE » qu'on
   *  répare. Un champ absent veut donc dire « ne rien écrire », pas
   *  « unité oubliée ». */
  unite?: [string, string];
  /** Le pictogramme. `public/missions/<famille>/<nom>-v1.webp`. */
  image: string;
  /** Où aller pour la faire, ou `null` s'il n'y a rien à ouvrir. */
  route: string | null;
};

export const MISSIONS: Mission[] = [
  {
    id: "connexion",
    titre: "Connexion du jour",
    // Depuis le 2026-10-14 (Louis), venir tient la série (`serie_aura`).
    // Les missions de la semaine, elles, comptent toujours séance ou repas.
    condition: "Ouvrir Vaiiya. Double dès le 2ᵉ jour d’affilée.",
    exp: EXP_CONNEXION,
    periode: "jour",
    premium: false,
    image: "/missions/daily/connexion-v1.webp",
    route: null,
  },
  {
    id: "seance",
    titre: "Terminer une séance",
    condition: "Une séance menée jusqu’au bout.",
    exp: EXP_SEANCE,
    periode: "jour",
    premium: false,
    image: "/missions/daily/seance-v1.webp",
    route: "/progression",
  },
  {
    id: "repas",
    titre: "Noter un repas",
    condition: "Un repas enregistré dans ton journal.",
    exp: EXP_REPAS,
    periode: "jour",
    premium: false,
    image: "/missions/daily/repas-v1.webp",
    /* `?ajouter=repas` ouvre directement le formulaire de saisie manuelle
       sur /nutrition (choix de Louis, 2026-09-22), au lieu de simplement
       déposer sur le suivi. NutritionTab lit ce paramètre au montage. */
    route: "/nutrition?ajouter=repas",
  },
  {
    id: "journee",
    titre: "Journée complète",
    condition: "Connexion, séance et repas dans la même journée.",
    unite: ["étape", "étapes"] as [string, string],
    exp: EXP_JOURNEE,
    periode: "jour",
    premium: false,
    image: "/missions/daily/journee-complete-v1.webp",
    route: null,
  },
  {
    id: "double",
    titre: "Double séance",
    condition: "Deux séances de 5 min minimum aujourd’hui.",
    unite: ["séance", "séances"] as [string, string],
    exp: EXP_DOUBLE,
    periode: "jour",
    premium: true,
    image: "/missions/premium/double-seance-v1.webp",
    route: "/progression",
  },
  {
    id: "matin",
    titre: "Lève-tôt",
    condition: "Une séance de 5 min minimum avant 9 h.",
    exp: EXP_MATIN,
    periode: "jour",
    premium: true,
    image: "/missions/premium/leve-tot-v1.webp",
    route: "/progression",
  },
  {
    id: "nutrition",
    titre: "Nutrition complète",
    condition: "Petit-déjeuner, déjeuner et dîner notés.",
    unite: ["repas", "repas"] as [string, string],
    exp: EXP_NUTRITION,
    periode: "jour",
    premium: true,
    image: "/missions/premium/nutrition-complete-v1.webp",
    route: "/nutrition",
  },
  {
    id: "objectif",
    titre: "Objectif accompli",
    // ⚠️ DEUX ACTIONS UTILES, séance ET repas. La connexion n'y entre pas,
    // exactement comme elle n'entre pas dans la série : il n'existe qu'une
    // seule définition de « faire quelque chose » dans tout le produit, et
    // c'est ce qui rend le système explicable en une phrase.
    condition: "Une séance et un repas dans la même journée.",
    unite: ["étape", "étapes"] as [string, string],
    exp: EXP_OBJECTIF,
    periode: "jour",
    premium: true,
    image: "/missions/premium/objectif-accompli-v1.webp",
    route: null,
  },
  {
    id: "semaineActive",
    titre: "Semaine active",
    condition: "3 jours validés cette semaine.",
    unite: ["jour", "jours"] as [string, string],
    exp: EXP_SEMAINE_ACTIVE,
    periode: "semaine",
    premium: false,
    image: "/missions/semaine/active-v1.webp",
    route: null,
  },
  {
    id: "semaineReguliere",
    titre: "Semaine régulière",
    condition: "5 jours validés cette semaine.",
    unite: ["jour", "jours"] as [string, string],
    exp: EXP_SEMAINE_REGULIERE,
    periode: "semaine",
    premium: true,
    image: "/missions/semaine/reguliere-v1.webp",
    route: null,
  },
  {
    id: "semaineParfaite",
    titre: "Semaine parfaite",
    condition: "7 jours validés cette semaine.",
    unite: ["jour", "jours"] as [string, string],
    exp: EXP_SEMAINE_PARFAITE,
    periode: "semaine",
    premium: false,
    image: "/missions/semaine/parfaite-v1.webp",
    route: null,
  },
];

export const MISSIONS_JOUR = MISSIONS.filter((m) => m.periode === "jour" && !m.premium);
export const MISSIONS_PREMIUM = MISSIONS.filter((m) => m.periode === "jour" && m.premium);
export const MISSIONS_SEMAINE = MISSIONS.filter((m) => m.periode === "semaine");
export const MISSIONS_PREMIUM_SEMAINE = MISSIONS_SEMAINE.filter((m) => m.premium);

// ── Récompenses de rang (refonte du 2026-10-24, maquette « Le passage de
// rang », version 2, validée par Louis) ──
//
// Trois choses à chaque passage, et rien d'invisible :
//   · LA CARTE, gravée à ton nom avec la date du rang (CarteRang) ;
//   · LE CADRE de ta photo, propre à chaque rang dès l'Argent (AvatarRang),
//     sur l'accueil, le profil et dans les conversations ;
//   · LES JOKERS de série, rechargés le 1er du mois : 1 à Argent, 2 à Or,
//     3 dès Platine. Le Diamant et l'Éternel ajoutent ce qu'ils donnaient
//     déjà : le titre et le pseudo lumineux.
//
// ⚠️ Que du STATUT et de la série, jamais du fonctionnel : aucun rang ne
// ferme une séance ni une fonction d'entraînement. Le rang reste personnel,
// sans classement, et ne parle que de régularité, jamais du corps.
//
// ⚠️ RÈGLE (2026-07-29, toujours vraie) : on n'annonce QUE ce qui existe et
// se VOIT. Chaque cadeau ci-dessous est rendu pour de vrai par
// `VisuelCadeau.tsx`, dans la scène comme dans la galerie. Les jokers ne
// s'annoncent que si la base sait les poser (`jokersActifs`, lib/jokers.ts) :
// tant que le SQL n'est pas collé, ils n'apparaissent nulle part.
//
// ⚠️ Remplacés et retirés le 2026-10-24 : la gemme à côté du pseudo
// (Argent), le liseré doré (Or) et l'anneau animé (Platine). Le cadre du
// rang dit tout ça à lui seul, sur la photo.

/** Le titre débloqué au Diamant, affiché sous le pseudo. */
export const TITRE_DIAMANT = "Inarrêtable";

/** Les jokers de série que chaque rang recharge le 1er du mois.
 *  ⚠️ La base porte la même règle (`jokers_par_mois_aura`) :
 *  `check:passage-sql` vérifie que les deux disent la même chose, et
 *  `check:rangs` que les cadeaux de la scène la suivent. */
export const JOKERS_PAR_MOIS: Record<string, number> = {
  bronze: 0,
  argent: 1,
  or: 2,
  platine: 3,
  diamant: 3,
  eternel: 3,
};

export function jokersParMois(rangId: string): number {
  return JOKERS_PAR_MOIS[rangId] ?? 0;
}

export type GenreCadeau = "carte" | "cadre" | "joker" | "titre" | "brillant";

export type Cadeau = {
  genre: GenreCadeau;
  /** Ce que la scène écrit sous le cadeau. */
  titre: string;
  /** Les jokers : combien par mois. */
  n?: number;
};

export type RecompensesRang = {
  /** Les cadeaux de la scène, dans l'ordre où ils s'ouvrent. Le Bronze n'a
   *  pas de passage : sa carte se reçoit à l'inscription. */
  cadeaux: Cadeau[];
  /** Ce que la galerie écrit, ligne par ligne : la carte, le cadre, le reste. */
  galerie: {
    carte: string;
    cadre: string | null;
    /** Ce qui suit le titre ou le pseudo lumineux, montrés en vrai juste
     *  avant (« sous ton nom »). Les jokers s'ajoutent à part. */
    plus: string | null;
  };
};

export const RECOMPENSES_RANG: Record<string, RecompensesRang> = {
  bronze: {
    cadeaux: [],
    galerie: { carte: "Ta première carte, dès l’inscription", cadre: null, plus: null },
  },
  argent: {
    cadeaux: [
      { genre: "carte", titre: "Ta carte Argent" },
      { genre: "cadre", titre: "Ton cadre Argent" },
      { genre: "joker", titre: "1 joker par mois", n: 1 },
    ],
    galerie: { carte: "Carte Argent, un reflet la traverse", cadre: "Cadre argent", plus: null },
  },
  or: {
    cadeaux: [
      { genre: "carte", titre: "Ta carte Or" },
      { genre: "cadre", titre: "Ton cadre Or" },
      { genre: "joker", titre: "2 jokers par mois", n: 2 },
    ],
    galerie: { carte: "Carte Or, gravée de cercles", cadre: "Cadre or, avec sa lueur", plus: null },
  },
  platine: {
    cadeaux: [
      { genre: "carte", titre: "Ta carte Platine" },
      { genre: "cadre", titre: "Ton cadre Platine" },
      { genre: "joker", titre: "3 jokers par mois", n: 3 },
    ],
    galerie: { carte: "Carte Platine, nacrée", cadre: "Cadre platine, une lumière tourne autour", plus: null },
  },
  diamant: {
    cadeaux: [
      { genre: "carte", titre: "Ta carte Diamant" },
      { genre: "cadre", titre: "Ton cadre Diamant" },
      { genre: "titre", titre: `Le titre ${TITRE_DIAMANT}` },
    ],
    galerie: { carte: "Carte Diamant, holographique", cadre: "Cadre diamant, taillé en facettes", plus: "sous ton nom, sur ton profil" },
  },
  eternel: {
    cadeaux: [
      { genre: "carte", titre: "Ta carte Éternel" },
      { genre: "cadre", titre: "Ton cadre Éternel" },
      { genre: "brillant", titre: "Ton pseudo en lumière" },
    ],
    galerie: { carte: "Carte Éternel, vivante", cadre: "Cadre éternel, or et violet, avec son halo", plus: "en lumière, visible par les autres" },
  },
};

/** Ce que le rang `rangId` a débloqué sur l'identité, en CUMULÉ. */
export type Cosmetiques = {
  /** Le cadre de la photo : celui du rang atteint, dès l'Argent. `null` au Bronze. */
  cadre: string | null;
  /** Titre sous le pseudo (Diamant et plus), ou null. */
  titre: string | null;
  /** Pseudo en dégradé lumineux (Éternel). */
  brillant: boolean;
};

/** Position d'un rang dans l'échelle (-1 si inconnu). */
export function indexRang(rangId: string): number {
  return RANGS.findIndex((rang) => rang.id === rangId);
}

export function cosmetiquesDuRang(rangId: string): Cosmetiques {
  const i = indexRang(rangId);
  return {
    cadre: i >= indexRang("argent") ? rangId : null,
    titre: i >= indexRang("diamant") ? TITRE_DIAMANT : null,
    brillant: i >= indexRang("eternel"),
  };
}

/** Le rang juste avant (le Bronze pour lui-même) : la scène part de lui. */
export function rangPrecedent(rangId: string): Rang {
  return RANGS[Math.max(0, indexRang(rangId) - 1)];
}

// ─────────────────────────────────────────────────────────────────────────────
// L'ÉTAT
// ─────────────────────────────────────────────────────────────────────────────

export type ProgressionMission = {
  progress: number;
  target: number;
  /** La condition est remplie. */
  complete: boolean;
  /** La récompense est au registre. Diffère de `complete` quand un compte
   *  gratuit remplit une mission Premium : il voit sa progression, il ne
   *  touche rien. */
  earned: boolean;
};

export type EtatMissionsAura = Record<MissionId, ProgressionMission>;

/** Ce qu'il reste à faire, dans l'unité de la mission : « encore 2 jours ».
 *
 *  Rend `null` quand il n'y a rien d'utile à dire, c'est-à-dire quand la
 *  mission se fait en une fois (pas d'`unite`) ou qu'elle est déjà remplie.
 *  C'est le remplaçant de l'ancien « À FAIRE », qui occupait la même place
 *  en n'apprenant rien : toute mission non validée est à faire.
 *
 *  ⚠️ Le calcul vit ici, avec le catalogue, et pas dans l'écran : le jour
 *  où une cible change en base, c'est `etat.target` qui bouge et la phrase
 *  suit toute seule. */
export function resteMission(mission: Mission, etat: ProgressionMission): string | null {
  if (!mission.unite) return null;
  const reste = etat.target - etat.progress;
  if (reste <= 0) return null;
  const [un, plusieurs] = mission.unite;
  return `encore ${reste} ${reste > 1 ? plusieurs : un}`;
}


export type EtatAura = {
  exp: number;
  rang: Rang;
  /** EXP au début du rang courant. */
  seuilBas: number;
  /** EXP pour atteindre le rang suivant (ou PALIER_PROVISOIRE si dernier). */
  seuilHaut: number;
  /** EXP restante avant le rang suivant. */
  restant: number;
  /** Jours validés consécutifs. Se casse, ne se rachète pas. */
  serie: number;
  /** La journée d'aujourd'hui est-elle déjà validée par une action utile ? */
  jourValide: boolean;
  /** Détail (pour l'affichage / debug). */
  detail: {
    seances: number;
    repas: number;
    jours: number;
    /** Jours validés de la semaine ISO en cours (0 à 7). */
    joursActifsSemaine: number;
    /** Alias de `serie`, conservé : plusieurs écrans lisent `detail.streak`. */
    streak: number;
  };
  /** Progression réelle de chaque mission sur sa période parisienne. */
  missions: EtatMissionsAura;
  /** La carte du mouvement du jour a-t-elle déjà rapporté ses 5 EXP
   *  aujourd'hui ? `null` : la base ne connaît pas encore ce gain (le SQL
   *  du mouvement du jour n'est pas collé), et la carte n'en promet aucun. */
  mouvementDuJour: boolean | null;
  /** Les jokers de série du mois. `null` : la base ne sait pas encore en
   *  poser (le SQL du 2026-10-24 n'est pas collé), et l'app n'en parle pas. */
  jokers: EtatJokers | null;
};

const CIBLES: Record<MissionId, number> = {
  connexion: 1,
  seance: 1,
  repas: 1,
  journee: 3,
  double: 2,
  matin: 1,
  nutrition: 3,
  objectif: 2,
  semaineActive: 3,
  semaineReguliere: 5,
  semaineParfaite: 7,
};

export function missionsAuraVides(): EtatMissionsAura {
  const vide = {} as EtatMissionsAura;
  for (const mission of MISSIONS) {
    vide[mission.id] = { progress: 0, target: CIBLES[mission.id], complete: false, earned: false };
  }
  return vide;
}

const DETAIL_VIDE: EtatAura["detail"] = {
  seances: 0,
  repas: 0,
  jours: 0,
  joursActifsSemaine: 0,
  streak: 0,
};

/** La place du rang atteint dans `RANGS` : le dernier dont `min` <= exp. */
function indexDuRang(exp: number): number {
  let idx = 0;
  for (let i = 0; i < RANGS.length; i++) {
    if (exp >= RANGS[i].min) idx = i;
  }
  return idx;
}

/** Où l'on en est DANS son rang. Voir `progressionRang`. */
export type ProgressionRang = {
  rang: Rang;
  /** `null` au dernier rang : il n'y a plus de chemin. */
  suivant: Rang | null;
  /** De 0 à 1, pour dessiner (anneau, barre). */
  part: number;
  /** Arrondi vers le BAS, pour écrire : 99,6 % ne doit pas se lire « 100 % ». */
  pourcent: number;
  /** EXP qui manquent avant le suivant (0 au dernier rang). */
  restant: number;
};

/**
 * La progression vers le rang suivant, comptée DANS le rang en cours : 0 au
 * seuil du rang qu'on a, 1 au seuil du suivant.
 *
 * ⭐ LA SEULE MESURE DE PROGRESSION DU PRODUIT. La galerie des rangs, la carte
 * du profil (la sienne et celle d'un ami) et la tuile de l'accueil la lisent
 * toutes : trois d'entre elles recopiaient la formule à la main, la quatrième
 * en avait une autre.
 *
 * ⚠️ JAMAIS `exp / seuil du suivant` (Louis, 2026-10-17). C'était le calcul de
 * la galerie : un Or à 690 EXP y lisait 86 % vers Platine, l'écran de Platine
 * affichait AUSSI 86 % (les deux visent 800, donc le même chiffre par
 * construction), et l'Éternel affichait 23 % à quelqu'un qui n'a pas encore
 * Platine. Compté depuis 0, on croit même avoir fait 44 % du chemin le jour
 * où l'on devient Or. Dans le rang, ce même compte est à 75 %, et c'est le
 * chiffre que montrait déjà la barre du profil.
 */
export function progressionRang(exp: number): ProgressionRang {
  const idx = indexDuRang(exp);
  const rang = RANGS[idx];
  const suivant = RANGS[idx + 1] ?? null;
  if (!suivant) return { rang, suivant: null, part: 1, pourcent: 100, restant: 0 };
  const part = Math.max(0, Math.min(1, (exp - rang.min) / Math.max(1, suivant.min - rang.min)));
  return { rang, suivant, part, pourcent: Math.floor(part * 100), restant: Math.max(0, suivant.min - exp) };
}

/** Décompose une EXP en rang courant + progression vers le suivant. */
export function etatDepuisExp(
  exp: number,
  detail: EtatAura["detail"] = DETAIL_VIDE,
  missions: EtatMissionsAura = missionsAuraVides(),
  serie = detail.streak,
  jourValide = false,
  mouvementDuJour: boolean | null = null,
  jokers: EtatJokers | null = null,
): EtatAura {
  const idx = indexDuRang(exp);
  const rang = RANGS[idx];
  const seuilBas = rang.min;
  const rangSuivant = RANGS[idx + 1];
  const seuilHaut = rangSuivant ? rangSuivant.min : Math.max(PALIER_PROVISOIRE, seuilBas + 1);
  const restant = Math.max(0, seuilHaut - exp);
  return { exp, rang, seuilBas, seuilHaut, restant, serie, jourValide, detail, missions, mouvementDuJour, jokers };
}

/**
 * L'aura d'un utilisateur, lue en base.
 *
 * ⚠️ UNE SEULE AUTORITÉ, ET ELLE EST SERVEUR. Rendre `null` est un cas normal :
 * la RPC n'est pas là (migration pas encore collée), le réseau a échoué, ou la
 * session a expiré. L'appelant affiche alors un tiret et ne montre AUCUN chiffre.
 *
 * L'ancien repli client recomptait les séances et les repas avec son propre
 * barème, un multiplicateur Premium appliqué à un autre moment, et pouvait
 * donc annoncer une EXP que la base ne connaissait pas. Un chiffre faux qui a
 * l'air vrai coûte plus cher qu'un tiret.
 */
export async function calculerAura(supabase: SB, userId: string): Promise<EtatAura | null> {
  try {
    const { data, error } = await supabase.rpc("etat_missions_aura", { p_user: userId });
    if (error || !data || typeof data !== "object") return null;

    const brut = data as {
      version?: number;
      exp?: number;
      serie?: number;
      jourValide?: boolean;
      detail?: Partial<EtatAura["detail"]>;
      /* `mouvement` n'est pas une mission du catalogue : la base le rend
         avec elles (`etat_missions_aura`), l'app le lit à part. */
      missions?: Partial<EtatMissionsAura> & { mouvement?: { complete?: boolean } };
      /* Les jokers de série (migration du 2026-10-24). Absents tant que le
         SQL n'est pas collé : l'app n'en parle alors nulle part. */
      jokers?: unknown;
    };

    /* La version 1 de la RPC (avant le 2026-08-21) rendait `today` et
       `premiumMissions`, avec l'ancien barème et l'ancien multiplicateur. La
       lire comme la nouvelle afficherait des missions vides et une EXP
       calculée autrement. On préfère le tiret : c'est visible, et ça dit à
       Louis qu'il reste un SQL à coller. */
    if (brut.version !== 2 || !brut.missions) return null;

    const missions = missionsAuraVides();
    for (const mission of MISSIONS) {
      const etat = brut.missions[mission.id];
      if (etat) missions[mission.id] = etat;
    }

    const serie = Number(brut.serie ?? 0);
    const detail: EtatAura["detail"] = {
      seances: Number(brut.detail?.seances ?? 0),
      repas: Number(brut.detail?.repas ?? 0),
      jours: Number(brut.detail?.jours ?? 0),
      joursActifsSemaine: Number(brut.detail?.joursActifsSemaine ?? 0),
      streak: serie,
    };

    const jokers = lireJokers(brut.jokers);
    noterJokersBase(jokers !== null);

    return etatDepuisExp(
      Number(brut.exp ?? EXP_BIENVENUE),
      detail,
      missions,
      serie,
      !!brut.jourValide,
      brut.missions.mouvement ? !!brut.missions.mouvement.complete : null,
      jokers,
    );
  } catch {
    return null;
  }
}

/** Ce que rapporte une mission AUJOURD'HUI. Seule la connexion varie : elle
 *  double quand on est venu la veille (série d'au moins deux jours). Le
 *  serveur reste l'autorité, ceci ne fait que l'afficher. */
export function expMission(mission: Mission, aura: { serie: number } | null): number {
  if (mission.id === "connexion") {
    return aura && aura.serie >= 2 ? EXP_CONNEXION_SUITE : EXP_CONNEXION;
  }
  return mission.exp;
}
