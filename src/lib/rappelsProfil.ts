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

   Ce module est PUR : il ne lit rien, n'écrit rien, ne connaît ni Supabase
   ni web-push. Le cron lui apporte les faits et applique sa décision, ce
   qui rend chaque règle relisible et vérifiable sans base de données.
   ════════════════════════════════════════════════════════════════════ */

import { RANGS } from "@/lib/aura";

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

export const CADENCE: Record<Palier, Cadence> = {
  endormi:      { parSemaine: 0, ecartJours: 0 },
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

  /** Rappels du soir déjà envoyés, 14 derniers jours, plus récent d'abord. */
  envois: Envoi[];
};

type Modele = {
  cle: string;
  /** Le message s'applique-t-il à cette personne, aujourd'hui ? */
  quand: (c: ContexteRappel) => boolean;
  /** Plusieurs formulations, tournées pour ne pas se répéter. */
  variantes: (c: ContexteRappel) => { title: string; body: string }[];
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
 * Une séance terminée rapporte 35 EXP (30 + le bonus de série). En dessous
 * de ce seuil, la phrase « une séance et tu y es » est littéralement vraie,
 * donc on ne la dit jamais à quelqu'un pour qui elle serait fausse.
 */
const EXP_UNE_SEANCE = 35;

/**
 * Du plus spécifique au plus général. Le premier modèle qui s'applique et
 * qui n'a pas servi récemment gagne : c'est ce qui fait qu'on nomme sa
 * séance quand on la connaît, et qu'on ne retombe sur une phrase passe
 * partout que si on n'a vraiment rien de mieux à dire.
 */
const MODELES: Modele[] = [
  {
    cle: "premier_pas",
    quand: (c) => c.palier === "decouverte",
    url: "/progression",
    variantes: (c) => [
      {
        title: c.pseudo ? `Ta première séance, ${c.pseudo}` : "Ta première séance",
        body: "Quinze minutes, sans matériel. Tout est déjà prêt.",
      },
      {
        title: "102 mouvements animés t'attendent",
        body: "Un coup d'oeil suffit pour voir à quoi ressemble une séance.",
      },
      {
        title: "On commence par quoi ?",
        body: "Choisis une séance, Vaiiya s'occupe du reste.",
      },
    ],
  },
  {
    cle: "rang_proche",
    quand: (c) => {
      const p = prochainRang(c.exp);
      return p !== null && p.manque <= EXP_UNE_SEANCE;
    },
    url: "/progression",
    variantes: (c) => {
      const p = prochainRang(c.exp);
      const manque = p?.manque ?? 0;
      const nom = p?.nom ?? "";
      return [
        { title: `Plus que ${manque} EXP avant ${nom}`, body: "Une séance et tu y es." },
        { title: `${nom} est à ${manque} EXP`, body: "Ça se joue aujourd'hui si tu veux." },
      ];
    },
  },
  {
    cle: "planning",
    quand: (c) => Boolean(c.seancePrevue),
    url: "/progression",
    // La séance porte son nom. C'est la différence entre un rappel qui
    // vient de l'app et un rappel qui vient de TA semaine.
    variantes: (c) => {
      const titre = c.seancePrevue ?? "";
      return [
        { title: `${titre}, c'est aujourd'hui`, body: "Elle t'attend, prête à lancer." },
        { title: `Au programme : ${titre}`, body: "Quand tu veux, tout est en place." },
        { title: titre, body: "C'est ce que tu avais prévu pour aujourd'hui." },
        { title: `Il te reste ${titre}`, body: "Le temps d'une séance et ta journée est complète." },
      ];
    },
  },
  {
    cle: "serie",
    quand: (c) => c.serie >= 3,
    url: "/progression",
    variantes: (c) => [
      { title: `Jour ${c.serie}`, body: "Ta série tient. Une séance aujourd'hui et elle continue." },
      { title: `${c.serie} jours d'affilée`, body: "Tu sais déjà quoi faire." },
    ],
  },
  {
    cle: "generique",
    quand: () => true,
    dernierRecours: true,
    url: "/progression",
    variantes: () => [
      { title: "Ta séance t'attend", body: "Elle est prête dans Vaiiya." },
      { title: "Un créneau aujourd'hui ?", body: "Quinze minutes suffisent pour que ça compte." },
    ],
  },
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
  quand: (c) => c.palier === "decrochage",
  url: "/progression",
  variantes: (c) => [
    {
      title: c.pseudo ? `Ta place est gardée, ${c.pseudo}` : "Ta place est gardée",
      body: "Dix minutes suffisent pour reprendre. Rien n'a bougé.",
    },
    {
      title: "On reprend quand tu veux",
      body: "Ta séance la plus courte fait quinze minutes.",
    },
  ],
};

/** Le rappel nutrition, à part : il ne concerne que qui note ses repas. */
const REPAS: Modele = {
  cle: "repas",
  quand: (c) => c.seanceFaite && !c.repasNotes && c.noteHabituellement,
  url: "/nutrition",
  variantes: () => [
    { title: "Et tes repas ?", body: "Séance faite, il ne manque que ce que tu as mangé." },
    { title: "Il manque ta journée d'assiettes", body: "Deux minutes et ton suivi est complet." },
  ],
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
  // Un jour de repos au planning est un choix de la personne, pas un oubli.
  // Lui écrire « ta séance t'attend » ce jour-là, c'est prouver qu'on ne
  // regarde pas son programme.
  if (c.jourDeRepos) return null;

  if (!cadenceAutorise(c)) return null;

  // Quelqu'un qui décroche ne reçoit PAS un rappel de plus : il reçoit un
  // message, un seul, qui ne lui reproche rien. Tant qu'il n'est pas revenu,
  // c'est tout ce qu'on lui écrira.
  if (c.palier === "decrochage") {
    if (c.envois.some((e) => e.cle === "reprise")) return null;
    return habiller(REPRISE, c);
  }

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
  const variantes = modele.variantes(c);
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
