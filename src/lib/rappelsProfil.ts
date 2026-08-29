/* ════════════════════════════════════════════════════════════════════
   rappelsProfil.ts : À QUI ON PARLE, À QUELLE CADENCE, ET AVEC QUELS MOTS

   Le rappel du soir était le même pour tout le monde, tous les jours :
   « Prêt à bouger ? Ta séance du jour est dans Vaiiya. » Quelqu'un qui a
   ouvert l'app une fois recevait exactement autant de messages que
   quelqu'un qui s'entraîne quatre fois par semaine, et le message ne
   savait rien de lui. Les deux s'en lassent, mais pas au même rythme :
   le premier désinstalle.

   Deux idées, et rien d'autre :

   1. LA CADENCE SUIT L'ENGAGEMENT. Moins on est installé, moins on écrit.
      Un compte qui n'a pas encore vraiment commencé reçoit au plus UN
      message par semaine ; un habitué peut en recevoir cinq, parce qu'ils
      lui apprennent quelque chose. C'est l'inverse du réflexe (« relancer
      fort ceux qui décrochent ») et c'est volontaire : insister sur
      quelqu'un qui n'est pas convaincu ne le convainc pas, ça le fait
      partir pour de bon.

   2. LE MESSAGE PARLE DE SA JOURNÉE À LUI. On sait ce qu'il a prévu
      aujourd'hui, on connaît le nom de sa séance, sa série, son rang.
      « Jambes & Fessiers, c'est aujourd'hui » n'est pas la même phrase
      que « Ta séance du jour est dans Vaiiya », et un jour de repos au
      planning ne mérite aucun message du tout.

   3. LES MOTS NE SONT PAS ICI. Ce module décide QUI reçoit un rappel, à
      quelle cadence et sur quel sujet ; les phrases vivent dans
      `guides.ts`, comme toute parole de Nora ou de Sasha. C'était le
      dernier endroit du produit où les deux Guides disaient exactement
      la même chose (corrigé le 2026-08-29). La séparation n'est pas
      qu'une question de rangement : une règle recopiée en deux voix
      diverge, et on se retrouverait avec un Guide qui écrit le soir ce
      que l'autre ne dirait pas.

   Ce module est PUR : il ne lit rien, n'écrit rien, ne connaît ni Supabase
   ni web-push. Le cron lui apporte les faits et applique sa décision, ce
   qui rend chaque règle relisible et vérifiable sans base de données.
   ════════════════════════════════════════════════════════════════════ */

import { EXP_SEANCE, RANGS } from "@/lib/aura";
import { voixRappel, type CleRappel, type GuideRef, type PhrasePush } from "@/lib/guides";

/* ── Les paliers ──────────────────────────────────────────────────── */

export type Palier =
  | "endormi"       // parti depuis longtemps : on se tait
  | "decrochage"    // absent depuis quelques jours après une vraie pratique
  | "decouverte"    // n'a pas encore vraiment commencé
  | "installation"  // s'entraîne, sans régularité installée
  | "regulier";     // vient et s'entraîne souvent

export type SignauxCompte = {
  /** Séances terminées depuis toujours. */
  seancesTotal: number;
  /** Séances terminées sur les 28 derniers jours. */
  seances28: number;
  /** Jours de venue sur les 28 derniers jours. */
  presences28: number;
  /** Jours depuis la dernière venue (0 = aujourd'hui), null si jamais venu. */
  joursDepuisVenue: number | null;
};

/** Au-delà, silence complet. Le rappel repart seul à la première venue. */
export const JOURS_AVANT_SILENCE = 14;

export function palierDe(s: SignauxCompte): Palier {
  const absence = s.joursDepuisVenue;

  // Jamais venu, ou parti depuis deux semaines : on n'écrit plus.
  if (absence === null || absence >= JOURS_AVANT_SILENCE) return "endormi";

  // Absent depuis quelques jours ALORS QU'il avait une pratique. Ce n'est
  // pas la même personne qu'un curieux inscrit hier, et ça ne mérite pas
  // le même traitement : un seul message, chaleureux, puis on le laisse.
  if (absence >= 5 && s.seances28 >= 2) return "decrochage";

  // Moins de deux séances au total : le produit n'a pas encore été
  // essayé pour de vrai. C'est le cas que Louis décrit, celui où
  // bombarder fait fuir.
  if (s.seancesTotal < 2) return "decouverte";

  if (s.seances28 >= 6 && s.presences28 >= 10) return "regulier";

  return "installation";
}

/* ── La cadence ───────────────────────────────────────────────────── */

export type Cadence = {
  /** Rappels du soir autorisés sur 7 jours glissants. */
  parSemaine: number;
  /** Jours de repos minimum entre deux rappels. */
  ecartJours: number;
};

/** Fenêtre du journal à charger : elle doit couvrir l'écart des endormis. */
export const JOURS_JOURNAL = 35;

export const CADENCE: Record<Palier, Cadence> = {
  // Une seule fois par mois, et rien d'autre. Ce n'est pas une relance :
  // c'est une veilleuse qui dit que la porte n'est pas fermée. Voir VEILLEUSE.
  endormi:      { parSemaine: 1, ecartJours: 29 },
  // Le décrochage est traité à part dans `rappelPour` : un seul message,
  // et c'est celui de la reprise, jamais un rappel ordinaire.
  decrochage:   { parSemaine: 1, ecartJours: 0 },
  decouverte:   { parSemaine: 1, ecartJours: 6 },
  installation: { parSemaine: 2, ecartJours: 2 },
  regulier:     { parSemaine: 5, ecartJours: 0 },
};

/* ── Les messages ─────────────────────────────────────────────────── */

export type Rappel = {
  cle: string;
  /** Index de la formulation retenue, mémorisé pour ne jamais la répéter. */
  variante: number;
  title: string;
  body: string;
  url: string;
};

export type Envoi = { jour: string; cle: string; variante: number };

export type ContexteRappel = {
  aujourdHui: string;
  palier: Palier;
  pseudo: string | null;

  /** Le Guide de cette personne, ou `null` quand on ne le connaît pas
   *  (choix pas encore fait, colonne absente, lecture ratée). `null` rend
   *  la formulation commune : un rappel part toujours, il ne dépend
   *  jamais de la disponibilité du Guide. */
  guide: GuideRef;

  /** Jours depuis la dernière venue, null si jamais venu. */
  joursDepuisVenue: number | null;

  /** Le jour au planning : son titre, et s'il s'agit d'un repos. */
  seancePrevue: string | null;
  jourDeRepos: boolean;

  seanceFaite: boolean;
  repasNotes: boolean;
  noteHabituellement: boolean;
  serie: number;

  /** EXP totale, ou null si on n'a pas pu la lire. */
  exp: number | null;

  /** Séances terminées depuis toujours (la veilleuse s'en sert). */
  seancesTotal: number;

  /** Rappels du soir déjà envoyés, 14 derniers jours, plus récent d'abord. */
  envois: Envoi[];
};

/* Le nom court d'un cas, tel qu'il est écrit dans le journal des envois
   (`notification_rappels.cle`). Il est DÉDUIT des clés de `guides.ts` :
   un modèle sans phrase, ou une phrase sans modèle, ne compile pas.

   ⚠️ Le journal garde le nom court d'origine (« planning ») et non la clé
   complète (« rappel.planning ») : les lignes déjà écrites gardent leur
   sens, donc la rotation des formulations et le « une seule reprise »
   continuent de fonctionner sur l'historique. */
type Court<T> = T extends `rappel.${infer S}` ? S : never;
type CleModele = Court<CleRappel>;

type Modele = {
  cle: CleModele;
  /** Le message s'applique-t-il à cette personne, aujourd'hui ? */
  quand: (c: ContexteRappel) => boolean;
  /** Ce dont ses phrases ont besoin. Les MOTS, eux, vivent dans
   *  `guides.ts` : c'est la seule façon que Nora et Sasha aient chacune
   *  leur formulation sans que la règle soit écrite deux fois. */
  contexte?: (c: ContexteRappel) => Parameters<typeof voixRappel>[2];
  url: string;
  /** Repli : on ne le choisit que si aucun message précis ne s'applique. */
  dernierRecours?: boolean;
};

/** Ce qu'il manque avant le rang suivant, et son nom. */
function prochainRang(exp: number | null): { manque: number; nom: string } | null {
  if (exp === null) return null;
  const suivant = RANGS.find((r) => r.min > exp);
  if (!suivant) return null;
  return { manque: Math.ceil(suivant.min - exp), nom: suivant.nom };
}

/**
 * Une séance terminée rapporte EXP_SEANCE. En dessous de ce seuil, la phrase
 * « une séance et tu y es » est littéralement vraie, donc on ne la dit jamais
 * à quelqu'un pour qui elle serait fausse.
 *
 * ⚠️ Exporté depuis le 2026-08-19 : `momentAccueil.ts` pose exactement la
 * même question (« le rang suivant est-il à une séance ? ») sur l'accueil.
 * Deux copies de ce nombre, c'est le push et l'écran qui se contredisent
 * le jour où le barème d'une séance bouge, d'où l'import plutôt qu'un 30
 * réécrit ici (le bonus de série a disparu le 2026-08-21, ce nombre valait
 * 35 jusque-là).
 */
export const EXP_UNE_SEANCE = EXP_SEANCE;

/**
 * Du plus spécifique au plus général. Le premier modèle qui s'applique et
 * qui n'a pas servi récemment gagne : c'est ce qui fait qu'on nomme sa
 * séance quand on la connaît, et qu'on ne retombe sur une phrase passe
 * partout que si on n'a vraiment rien de mieux à dire.
 */
const MODELES: Modele[] = [
  { cle: "premier_pas", url: "/progression",
    quand: (c) => c.palier === "decouverte",
    contexte: (c) => ({ pseudo: c.pseudo ?? undefined }) },

  { cle: "rang_proche", url: "/progression",
    quand: (c) => {
      const p = prochainRang(c.exp);
      return p !== null && p.manque <= EXP_UNE_SEANCE;
    },
    contexte: (c) => {
      const p = prochainRang(c.exp);
      return { manque: p?.manque ?? 0, rang: p?.nom ?? "" };
    } },

  // La séance porte son nom. C'est la différence entre un rappel qui
  // vient de l'app et un rappel qui vient de TA semaine.
  { cle: "planning", url: "/progression",
    quand: (c) => Boolean(c.seancePrevue),
    contexte: (c) => ({ titre: c.seancePrevue ?? "" }) },

  { cle: "serie", url: "/progression",
    quand: (c) => c.serie >= 3,
    contexte: (c) => ({ serie: c.serie }) },

  { cle: "generique", url: "/progression", dernierRecours: true,
    quand: () => true },
];

/**
 * Le message du décrochage, à part parce qu'il ne se mélange à rien : il
 * n'entre pas dans la rotation ordinaire, et c'est le SEUL que recevra
 * quelqu'un d'absent tant qu'il n'est pas revenu.
 *
 * Aucun reproche, aucune allusion à l'absence, aucun décompte de jours
 * manqués. Zéro culpabilisation, c'est un pilier du produit, et c'est
 * précisément ici qu'il est le plus facile à trahir.
 */
const REPRISE: Modele = {
  cle: "reprise",
  url: "/progression",
  quand: (c) => c.palier === "decrochage",
  contexte: (c) => ({ pseudo: c.pseudo ?? undefined }),
};

/**
 * La veilleuse : une fois par mois, pour quelqu'un qui n'est plus là.
 *
 * Le reste du temps on se tait complètement, et c'est ce qui rend ce message
 * tenable. Il n'invite pas à « revenir » (ce qui sous-entend un départ à
 * justifier), il dit simplement que rien ne s'est perdu et que rien n'est à
 * rattraper. Aucune promesse de nouveauté non plus : on ne peut pas savoir
 * ici si quelque chose a changé depuis son dernier passage, et une phrase
 * qu'on ne peut pas garantir n'a rien à faire dans un push.
 */
const VEILLEUSE: Modele = {
  cle: "veilleuse",
  url: "/progression",
  quand: (c) => c.palier === "endormi",
  contexte: (c) => ({ seances: c.seancesTotal }),
};

/** Le rappel nutrition, à part : il ne concerne que qui note ses repas. */
const REPAS: Modele = {
  cle: "repas",
  url: "/nutrition",
  quand: (c) => c.seanceFaite && !c.repasNotes && c.noteHabituellement,
};

/* ── La décision ──────────────────────────────────────────────────── */

function joursEntre(a: string, b: string): number {
  const ms = new Date(a + "T12:00:00Z").getTime() - new Date(b + "T12:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
}

/** La cadence autorise-t-elle un rappel aujourd'hui ? */
export function cadenceAutorise(c: ContexteRappel): boolean {
  const cadence = CADENCE[c.palier];
  if (cadence.parSemaine === 0) return false;

  const surSeptJours = c.envois.filter((e) => joursEntre(c.aujourdHui, e.jour) < 7).length;
  if (surSeptJours >= cadence.parSemaine) return false;

  if (cadence.ecartJours > 0) {
    const dernier = c.envois[0];
    if (dernier && joursEntre(c.aujourdHui, dernier.jour) <= cadence.ecartJours) return false;
  }

  return true;
}

/**
 * Le rappel du soir de cette personne, ou `null` quand il n'y a rien à
 * dire. Renvoyer `null` est le cas NORMAL et fréquent : la plupart des
 * soirs, la bonne notification est celle qu'on n'envoie pas.
 */
export function rappelPour(c: ContexteRappel): Rappel | null {
  if (!cadenceAutorise(c)) return null;

  /* Les deux paliers d'absence passent AVANT le jour de repos : leur message
     ne parle pas de la séance du jour, donc un vieux « Repos » resté au
     planning n'a aucune raison de les bloquer. */

  // Un endormi ne reçoit QUE la veilleuse, et la cadence l'a déjà espacée
  // d'un mois. Aucun rappel de séance ne lui parvient : il n'a plus de
  // planning en cours, et lui en inventer un serait parler dans le vide.
  if (c.palier === "endormi") return habiller(VEILLEUSE, c);

  // Quelqu'un qui décroche ne reçoit PAS un rappel de plus : il reçoit un
  // message, un seul, qui ne lui reproche rien. Tant qu'il n'est pas revenu,
  // c'est tout ce qu'on lui écrira.
  if (c.palier === "decrochage") {
    if (c.envois.some((e) => e.cle === "reprise")) return null;
    return habiller(REPRISE, c);
  }

  // Un jour de repos au planning est un choix de la personne, pas un oubli.
  // Lui écrire « ta séance t'attend » ce jour-là, c'est prouver qu'on ne
  // regarde pas son programme.
  if (c.jourDeRepos) return null;

  if (c.seanceFaite) {
    return REPAS.quand(c) ? habiller(REPAS, c) : null;
  }

  const applicables = MODELES.filter((m) => m.quand(c));
  const precis = applicables.filter((m) => !m.dernierRecours);

  if (!precis.length) {
    const repli = applicables[0];
    return repli ? habiller(repli, c) : null;
  }

  /* On préfère un message dont la clé n'a pas servi ces trois derniers
     jours. Mais on ne descend JAMAIS jusqu'au repli pour éviter une
     répétition : quand on connaît le nom de sa séance du jour, « Dos &
     Biceps » reste meilleur qu'un « Ta séance t'attend » passe-partout,
     même deux fois dans la semaine. La variante, elle, change de toute
     façon. */
  const recentes = new Set(
    c.envois.filter((e) => joursEntre(c.aujourdHui, e.jour) <= 3).map((e) => e.cle),
  );
  const choisi = precis.find((m) => !recentes.has(m.cle)) ?? precis[0];

  return habiller(choisi, c);
}

/**
 * Choisit la formulation.
 *
 * Deux pièges déjà rencontrés, d'où cette forme. Compter les envois de la
 * clé ne marche pas : le journal ne remonte qu'à quatorze jours, donc pour
 * un rythme hebdomadaire le compteur retombe et la même phrase revient.
 * Dériver l'index de la seule date ne marche pas non plus : quand l'écart
 * entre deux envois divise le nombre de variantes (trois jours, trois
 * formulations), on retombe systématiquement sur la même.
 *
 * On part donc de la date, PUIS on vérifie contre ce qui est réellement
 * parti la dernière fois. La garantie devient vraie quelle que soit la
 * cadence : jamais deux fois d'affilée la même phrase pour une même clé.
 */
function habiller(modele: Modele, c: ContexteRappel): Rappel {
  const variantes: PhrasePush[] = voixRappel(
    c.guide,
    `rappel.${modele.cle}` as CleRappel,
    modele.contexte?.(c) ?? {},
  );
  const n = variantes.length;
  const jours = Math.floor(new Date(c.aujourdHui + "T12:00:00Z").getTime() / 86_400_000);

  let index = ((jours % n) + n) % n;
  // `envois` arrive du plus récent au plus ancien : le premier de cette clé
  // est donc bien le dernier message envoyé sous ce modèle.
  const dernier = c.envois.find((e) => e.cle === modele.cle);
  if (n > 1 && dernier && dernier.variante === index) index = (index + 1) % n;

  const v = variantes[index];
  return { cle: modele.cle, variante: index, title: v.title, body: v.body, url: modele.url };
}
