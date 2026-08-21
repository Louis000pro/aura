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
//  2. SE CONNECTER NE VALIDE PAS LA JOURNÉE. La connexion rapporte +5 EXP,
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

type SB = ReturnType<typeof createClient>;

// ── Le barème. Des valeurs rondes, fixes, et rien d'autre. ──
export const EXP_CONNEXION = 5;
export const EXP_SEANCE = 30;
export const EXP_REPAS = 5;
export const EXP_JOURNEE = 10;

export const EXP_DOUBLE = 20;
export const EXP_MATIN = 20;
export const EXP_NUTRITION = 15;
export const EXP_OBJECTIF = 15;

export const EXP_SEMAINE_ACTIVE = 30;
export const EXP_SEMAINE_REGULIERE = 50;
export const EXP_SEMAINE_PARFAITE = 100;

/** Coup de pouce d'inscription : +10 offerts à tout compte. */
export const EXP_BIENVENUE = 10;

/** Ce qu'un compte gratuit peut gagner en une journée : 5 + 30 + 5 + 10. */
export const PLAFOND_JOUR_GRATUIT = 50;
/** Ce qu'un compte Premium peut gagner en une journée : 50 + 20 + 20 + 15 + 15. */
export const PLAFOND_JOUR_PREMIUM = 120;

// ── Reset global de l'aura ──
// Conservé pour mémoire : les crédits historiques repris par la migration de
// juillet 2026 partent de cette date. Le registre ne se réécrit jamais.
export const AURA_EPOCH = "2026-07-22";

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
  /** Le pictogramme. `public/missions/<famille>/<nom>-v1.webp`. */
  image: string;
  /** Où aller pour la faire, ou `null` s'il n'y a rien à ouvrir. */
  route: string | null;
};

export const MISSIONS: Mission[] = [
  {
    id: "connexion",
    titre: "Connexion du jour",
    // ⚠️ Cette phrase porte la règle la plus importante du système : venir ne
    // suffit pas. Ne pas l'adoucir, c'est elle qui rend la série lisible.
    condition: "Ouvrir Vaiiya. Ne valide pas ta journée.",
    exp: EXP_CONNEXION,
    periode: "jour",
    premium: false,
    image: "/missions/daily/connexion-v1.webp",
    route: null,
  },
  {
    id: "seance",
    titre: "Terminer une séance",
    condition: "Une séance menée jusqu'au bout.",
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
    route: "/nutrition",
  },
  {
    id: "journee",
    titre: "Journée complète",
    condition: "Connexion, séance et repas dans la même journée.",
    exp: EXP_JOURNEE,
    periode: "jour",
    premium: false,
    image: "/missions/daily/journee-complete-v1.webp",
    route: null,
  },
  {
    id: "double",
    titre: "Double séance",
    condition: "Deux séances de 5 min minimum aujourd'hui.",
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

/** Les missions qui VALIDENT la journée. La connexion n'en fait pas partie. */
export const ACTIONS_UTILES: MissionId[] = ["seance", "repas"];

// ── Récompenses de rang ──
// Principe validé avec Louis : que du STATUT / COSMÉTIQUE, jamais du fonctionnel.
// On ne verrouille aucune fonction d'entraînement derrière un rang (tout le monde
// doit pouvoir s'entraîner). Grimper = débloquer de la fierté visible.
// Chaque récompense se lit depuis `rang.id` déjà calculé : aucune migration SQL.
//
// ⚠️ RÈGLE (2026-07-29, remontée de Louis) : on n'annonce QUE ce qui existe et se
// VOIT. Chaque entrée ci-dessous est réellement rendue par `IdentiteRang.tsx` et
// se montre en aperçu dans la galerie des rangs. Ajouter une récompense = 1) une
// entrée ici avec son `apercu`, 2) son rendu dans `IdentiteRang.tsx`. Pas d'entrée
// « vitrine » sans rendu : c'est exactement ce qui rendait l'écran incompréhensible.
//
// Deux anciennes promesses ont été retirées : les « thèmes d'accent » (Or/Diamant)
// contredisaient le système de couleur VERROUILLÉ (violet = action partout), et le
// « flair en tête du classement » de l'Éternel décrivait un classement qui n'existe
// pas et n'existera pas (limite dure du rang : jamais de comparaison sociale).
export type ApercuCosmetique = "exp" | "badge" | "cadre" | "anneau" | "titre" | "brillant";

export type Recompense = {
  /** Emoji d'illustration de la récompense. */
  emoji: string;
  /** Titre court de ce qu'on débloque. */
  titre: string;
  /** Une ligne d'explication. */
  desc: string;
  /** Quel cosmétique la galerie doit montrer en aperçu réel. */
  apercu: ApercuCosmetique;
};

/** Le titre débloqué au Diamant, affiché sous le pseudo. */
export const TITRE_DIAMANT = "Inarrêtable";

export const RECOMPENSE_RANG: Record<string, Recompense> = {
  bronze: {
    emoji: "🎁",
    titre: "Coup de pouce de bienvenue",
    desc: `+${EXP_BIENVENUE} EXP offerts pour lancer ton aventure.`,
    apercu: "exp",
  },
  argent: {
    emoji: "🏷️",
    titre: "Badge de rang",
    desc: "Ta gemme s'affiche à côté de ton pseudo, sur ton profil et celui que voient les autres.",
    apercu: "badge",
  },
  or: {
    emoji: "🖼️",
    titre: "Cadre doré",
    desc: "Un liseré doré encadre ta photo de profil.",
    apercu: "cadre",
  },
  platine: {
    emoji: "💫",
    titre: "Anneau animé",
    desc: "Un halo tourne lentement autour de ta photo.",
    apercu: "anneau",
  },
  diamant: {
    emoji: "📛",
    titre: `Titre « ${TITRE_DIAMANT} »`,
    desc: "Un titre s'affiche sous ton pseudo, sur ton profil.",
    apercu: "titre",
  },
  eternel: {
    emoji: "✨",
    titre: "Pseudo brillant",
    desc: "Ton pseudo passe en dégradé lumineux, visible par les autres.",
    apercu: "brillant",
  },
};

/** Ce que le rang `rangId` a débloqué, en CUMULÉ (un Platine garde son cadre d'Or). */
export type Cosmetiques = {
  /** Gemme du rang à côté du pseudo (Argent et plus). */
  badge: boolean;
  /** Liseré doré autour de la photo (Or et plus). */
  cadre: boolean;
  /** Halo qui tourne autour de la photo (Platine et plus). */
  anneau: boolean;
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
    badge: i >= indexRang("argent"),
    cadre: i >= indexRang("or"),
    anneau: i >= indexRang("platine"),
    titre: i >= indexRang("diamant") ? TITRE_DIAMANT : null,
    brillant: i >= indexRang("eternel"),
  };
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

/** Décompose une EXP en rang courant + progression vers le suivant. */
export function etatDepuisExp(
  exp: number,
  detail: EtatAura["detail"] = DETAIL_VIDE,
  missions: EtatMissionsAura = missionsAuraVides(),
  serie = detail.streak,
  jourValide = false,
): EtatAura {
  // Rang courant = le dernier rang dont `min` <= exp.
  let idx = 0;
  for (let i = 0; i < RANGS.length; i++) {
    if (exp >= RANGS[i].min) idx = i;
  }
  const rang = RANGS[idx];
  const seuilBas = rang.min;
  const rangSuivant = RANGS[idx + 1];
  const seuilHaut = rangSuivant ? rangSuivant.min : Math.max(PALIER_PROVISOIRE, seuilBas + 1);
  const restant = Math.max(0, seuilHaut - exp);
  return { exp, rang, seuilBas, seuilHaut, restant, serie, jourValide, detail, missions };
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
      missions?: Partial<EtatMissionsAura>;
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

    return etatDepuisExp(
      Number(brut.exp ?? EXP_BIENVENUE),
      detail,
      missions,
      serie,
      !!brut.jourValide,
    );
  } catch {
    return null;
  }
}
