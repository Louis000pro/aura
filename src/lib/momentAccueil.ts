/* ════════════════════════════════════════════════════════════════════
   momentAccueil — QUAND le Guide prend la parole en arrivant sur
   l'accueil, et quand il se tait.

   Le Guide n'apparaît pas parce qu'on a ouvert l'app. Il apparaît parce
   qu'il s'est passé quelque chose qu'il vaut la peine de nommer : une
   absence, un début, un rang à portée d'une séance, une série qui
   atteint un cap. Le reste du temps l'accueil est exactement celui
   d'avant, sans personnage et sans ligne en plus.

   ── ON NE CRÉE PAS UNE DEUXIÈME LOGIQUE D'ENGAGEMENT ────────────────
   Vaiiya sait déjà lire un compte : `palierDe` (rappelsProfil.ts) classe
   quelqu'un en endormi / décrochage / découverte / installation /
   régulier, et c'est cette lecture qui pilote les notifications. On la
   RÉUTILISE telle quelle, avec ses seuils, plutôt que d'inventer ici un
   deuxième jeu de règles qui dirait autre chose du même compte. Le seul
   nombre recopié depuis l'autre module est `EXP_UNE_SEANCE`, et il est
   importé, pas réécrit.

   ⚠️ UNE DIFFÉRENCE DE SENS À CONNAÎTRE, ELLE EST LE PIÈGE DU FICHIER.
   Dans le cron, `joursDepuisVenue` se lit le soir, sur quelqu'un qui
   n'est PAS venu : 0 veut dire « il est venu aujourd'hui ». Ici la
   personne est devant nous, et `marquerPresence` (layout) a déjà écrit
   la ligne du jour avant que cet écran ne se monte : la même lecture
   rendrait 0 pour tout le monde, tout le temps, et aucune absence ne
   serait jamais vue. On passe donc l'écart depuis la venue PRÉCÉDENTE,
   c'est-à-dire la valeur qu'aurait eue le cron la veille au soir.

   ⚠️ CONSÉQUENCE DIRECTE : « jamais venu avant » et « parti depuis un
   mois » deviennent le même signal (aucune venue antérieure), et
   `palierDe` les range tous les deux en `endormi`. Un compte tout neuf
   se verrait donc accueillir en revenant, ce qui n'a aucun sens. D'où
   `premiereJournee` : sans venue antérieure ET sans séance, il n'y a
   pas d'absence à constater, seulement un début.

   La décision (`momentAccueil`) est PURE et la lecture Supabase
   (`lireSignauxAccueil`) est à part : la règle se relit et se vérifie
   sans base de données, comme dans `rappelsProfil.ts`.
   ════════════════════════════════════════════════════════════════════ */

import type { createClient } from "@/lib/supabase";
import { RANGS, type EtatAura } from "@/lib/aura";
import { EXP_UNE_SEANCE, palierDe, type SignauxCompte } from "@/lib/rappelsProfil";
import type { CleVoix, ContexteVoix, EtatGuide } from "@/lib/guides";
import { parisDateStr, shiftDateStr } from "@/lib/dates";

type SB = ReturnType<typeof createClient>;

/* ── Ce que l'accueil sait du compte ──────────────────────────────── */

export type SignauxAccueil = SignauxCompte & {
  /** Aucune venue antérieure ET aucune séance : le compte commence. */
  premiereJournee: boolean;
};

/* ── Le moment retenu ─────────────────────────────────────────────── */

export type MomentAccueil = {
  /** Ce qui a été reconnu. */
  cle: "absence.longue" | "absence.courte" | "debut" | "palier" | "serie" | "jour";
  /** La réplique à rendre (`voix(guide, phrase, ctx)`). */
  phrase: CleVoix;
  /** Le visage. Jamais `think` ni `explain` : ces deux-là appartiennent à
   *  la conversation, où ils décrivent un travail en cours ou une réponse
   *  en train d'être donnée. Sur l'accueil le Guide accueille (`welcome`),
   *  laisse la main (`listen`) ou salue une avancée (`encourage`). */
  etat: Extract<EtatGuide, "welcome" | "listen" | "encourage">;
  ctx: ContexteVoix;
  /** Le rang annoncé, pour ne l'annoncer qu'une fois (voir `DejaVu`). */
  rangVise?: string;
};

/* Les trois formulations du premier passage de la journée. Elles tournent
   par le numéro du jour : une seule reviendrait tous les matins, et une
   phrase qu'on reconnaît avant de l'avoir lue ne se lit plus. Avec trois
   variantes et un passage par jour, deux jours de suite ne peuvent pas
   tomber sur la même. */
const JOUR: CleVoix[] = ["retour.jour.a", "retour.jour.b", "retour.jour.c"];

/* Les caps de série qui méritent un mot. Une série qui parle TOUS LES
   JOURS dès trois jours devient un compteur qui commente, et un compteur
   qui commente finit par ressembler à une surveillance. On ne dit donc
   rien entre deux caps. */
const CAPS_SERIE = [3, 7, 14, 21, 30, 50, 75, 100];

/** Ce qui manque avant le rang suivant, et son nom. Même lecture que
 *  `prochainRang` du cron, sur l'EXP déjà calculée par l'accueil. */
function prochainRang(exp: number): { manque: number; nom: string; id: string } | null {
  const suivant = RANGS.find((r) => r.min > exp);
  if (!suivant) return null;
  return { manque: Math.ceil(suivant.min - exp), nom: suivant.nom, id: suivant.id };
}

function numeroDeJour(jour: string): number {
  return Math.floor(new Date(jour + "T12:00:00Z").getTime() / 86_400_000);
}

function joursEntre(a: string, b: string): number {
  const ms = new Date(a + "T12:00:00Z").getTime() - new Date(b + "T12:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
}

/* ── Ce qu'on a déjà dit ──────────────────────────────────────────── */

export type DejaVu = {
  /** Le dernier jour parisien où le Guide a parlé sur l'accueil. */
  jour?: string;
  /** Le dernier rang annoncé comme « à une séance ». */
  rang?: string;
};

/**
 * LA DÉCISION. Rendre `null` est un cas normal et fréquent : la plupart
 * des arrivées ne méritent aucun mot.
 *
 * L'ordre n'est pas décoratif. Une absence passe avant tout le reste,
 * exactement comme dans `rappelPour` : quand quelqu'un revient après une
 * semaine, lui parler d'abord de son rang serait répondre à côté. Le
 * début de parcours passe ensuite, parce qu'un compte qui n'a pas encore
 * essayé n'a ni rang à portée ni série à saluer.
 */
export function momentAccueil(
  s: SignauxAccueil,
  aura: EtatAura,
  aujourdHui: string,
  dejaVu: DejaVu,
): MomentAccueil | null {
  /* Une seule prise de parole par jour parisien, quelle qu'elle soit.
     C'est ce qui empêche l'accueil de devenir une fenêtre qui s'ouvre à
     chaque navigation : revenir sur l'accueil dix fois dans la journée ne
     le fait pas reparler une deuxième fois. */
  if (dejaVu.jour === aujourdHui) return null;

  const palier = s.premiereJournee ? "decouverte" : palierDe(s);

  if (palier === "endormi") {
    return { cle: "absence.longue", phrase: "retour.absence.longue", etat: "welcome", ctx: {} };
  }
  if (palier === "decrochage") {
    return { cle: "absence.courte", phrase: "retour.absence.courte", etat: "welcome", ctx: {} };
  }
  if (palier === "decouverte") {
    /* Il n'attend pas une réponse, il attend un premier geste. `listen`
       est le visage de celui qui laisse la main, et c'est exactement la
       posture voulue ici : proposer sans pousser. */
    return { cle: "debut", phrase: "retour.debut", etat: "listen", ctx: {} };
  }

  /* Un rang à une séance près. Annoncé UNE FOIS PAR RANG et pas une fois
     par jour : sinon quelqu'un qui stagne à vingt EXP du palier relit le
     même chiffre tous les matins, ce qui n'encourage pas, ça lui rappelle
     chaque jour qu'il n'y est pas allé. */
  const suivant = prochainRang(aura.exp);
  if (suivant && suivant.manque <= EXP_UNE_SEANCE && dejaVu.rang !== suivant.id) {
    return {
      cle: "palier",
      phrase: "retour.palier",
      etat: "encourage",
      ctx: { manque: suivant.manque, rang: suivant.nom },
      rangVise: suivant.id,
    };
  }

  const serie = aura.detail.streak;
  if (CAPS_SERIE.includes(serie)) {
    return { cle: "serie", phrase: "retour.serie", etat: "encourage", ctx: { serie } };
  }

  return {
    cle: "jour",
    phrase: JOUR[numeroDeJour(aujourdHui) % JOUR.length],
    etat: "welcome",
    ctx: {},
  };
}

/* ── La lecture ───────────────────────────────────────────────────── */

/** Fenêtre chargée : elle couvre le seuil d'absence longue (14 jours) avec
 *  de la marge, et la fenêtre de 28 jours des signaux. */
const JOURS_FENETRE = 35;

/**
 * Les signaux du compte, lus depuis Supabase.
 *
 * ⚠️ Deux requêtes, volontairement légères (une colonne chacune, fenêtre
 * bornée). L'egress Supabase a déjà explosé une fois, et cet écran est le
 * plus ouvert de l'app. L'appelant ne doit d'ailleurs PAS appeler cette
 * fonction quand le Guide a déjà parlé aujourd'hui : le repère de
 * fréquence se lit dans le stockage local, avant toute requête.
 *
 * `seancesTotal` vient de l'aura (`detail.seances`, le nombre de JOURS
 * avec une séance depuis l'époque du rang) plutôt que d'un troisième
 * comptage : c'est déjà chargé, et pour le seuil « moins de deux séances »
 * compter les jours plutôt que les séances est même plus juste (trois
 * essais le même après-midi ne font pas un pratiquant installé).
 */
export async function lireSignauxAccueil(
  supabase: SB,
  userId: string,
  aura: EtatAura,
  aujourdHui: string = parisDateStr(),
): Promise<SignauxAccueil | null> {
  const debutFenetre = shiftDateStr(aujourdHui, -JOURS_FENETRE);
  const debut28 = shiftDateStr(aujourdHui, -27);

  const [venuesRes, seancesRes] = await Promise.all([
    supabase.from("daily_stats").select("date")
      .eq("user_id", userId).gte("date", debutFenetre).lte("date", aujourdHui),
    supabase.from("workout_sessions").select("started_at")
      .eq("user_id", userId).gte("started_at", debut28 + "T00:00:00"),
  ]);

  /* Une lecture ratée ne doit jamais faire parler le Guide de travers :
     sans signaux il se tait, et l'accueil reste exactement celui d'avant. */
  if (venuesRes.error || seancesRes.error) return null;

  const venues = (venuesRes.data ?? []).map((r) => r.date as string);
  const anterieures = venues.filter((d) => d < aujourdHui).sort();
  const derniere = anterieures[anterieures.length - 1];

  const seancesTotal = aura.detail.seances;

  /* Aucune venue antérieure dans la fenêtre : soit le compte commence,
     soit il revient de très loin. La séance suffit à trancher sans une
     requête de plus, parce qu'un compte qui a déjà terminé une séance a
     forcément eu une journée avant celle-ci. */
  const premiereJournee = !derniere && seancesTotal === 0;

  return {
    seancesTotal,
    seances28: (seancesRes.data ?? []).length,
    presences28: venues.filter((d) => d >= debut28).length,
    /* Pas de venue antérieure connue = au moins toute la fenêtre, ce qui
       dépasse le seuil de silence : `palierDe` rendra `endormi`, et c'est
       la bonne réponse pour quelqu'un qu'on n'a pas vu depuis 35 jours. */
    joursDepuisVenue: derniere ? joursEntre(aujourdHui, derniere) : JOURS_FENETRE,
    premiereJournee,
  };
}

/* ── Le repère de fréquence ───────────────────────────────────────── */

/* Côté navigateur, comme le popup de nouveautés : c'est un confort
   d'affichage, pas une donnée du compte. Une clé par compte, donc deux
   personnes sur le même appareil ne se volent pas leur accueil. */
const cle = (userId: string) => `vaiiya_accueil_guide_${userId}`;

export function lireDejaVu(userId: string): DejaVu {
  try {
    const brut = localStorage.getItem(cle(userId));
    if (!brut) return {};
    const v = JSON.parse(brut) as DejaVu;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** Écrit le repère APRÈS que le Guide a réellement parlé. Le rang annoncé
 *  n'est écrasé que par une annonce de rang : un simple bonjour du matin
 *  ne doit pas faire oublier quel palier a déjà été salué. */
export function noterDejaVu(userId: string, jour: string, moment: MomentAccueil) {
  try {
    const actuel = lireDejaVu(userId);
    localStorage.setItem(
      cle(userId),
      JSON.stringify({ jour, rang: moment.rangVise ?? actuel.rang }),
    );
  } catch {
    /* Stockage refusé (navigation privée) : le Guide reparlera demain, et
       au pire une fois de trop aujourd'hui. Rien à réparer. */
  }
}
