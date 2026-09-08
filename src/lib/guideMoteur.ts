/* ════════════════════════════════════════════════════════════════════
   V9A · CE QUE LE GUIDE VOIT DU MOTEUR.

   Point de départ, mesuré et pas supposé : le Guide ne savait RIEN du
   programme. Pas « mal », rien du tout. `buildSystemPrompt` porte depuis
   toujours un paramètre `programme`, et ses deux appelants d'origine (le
   chat de l'accueil et `/coach`) ont été supprimés en V0 : plus personne
   ne le renseignait, donc le bloc était vide à chaque tour. « Qu'est-ce
   que j'ai de prévu ? » tombait sur `rien_a_faire` et le coach répondait
   à partir de rien.

   ⚠️ IL N'Y A AUCUN OUTIL DE LECTURE, ET C'EST LA DÉCISION DE LA VAGUE.
   La fiabilité de l'aiguilleur s'effondre avec la longueur de son prompt
   (241 caractères → l'outil est appelé 6 fois sur 6 ; 5 371 → 1 fois sur
   6). Les faits utiles au Guide sont petits et bornés : ils tiennent en
   quelques centaines de caractères. Faire faire un aller-retour au
   modèle pour aller chercher ce qu'on sait déjà nécessaire serait plus
   lent, moins fiable, et ajouterait un troisième décideur. On DONNE donc
   l'état au coach, on ne lui demande pas d'aller le chercher, et
   l'aiguilleur reste AVEUGLE : son prompt ne bouge pas d'un caractère.

   ⚠️ CE MODULE NE DÉCIDE RIEN, IL COMPOSE. Chaque fait vient de
   l'autorité qui le détient déjà : `lireProgrammeActif` pour le
   programme, `positionConsommee` + `etapeSuivante` pour le curseur,
   `adaptationDuJour` + `etapeMasquee` pour la couche, `fetchRange` +
   `principale` / `supplements` pour la journée, `reservationDeLEtape`
   pour le jour déjà donné à une étape. Aucune règle du moteur n'est
   réécrite ici, et aucune identité ne se devine par un titre.

   ⚠️ IL N'ÉCRIT RIEN. Pas un `insert`, pas un `update`, pas un `delete`.
   Le banc le vérifie en lisant le source : « le Guide regarde » est une
   propriété du chemin, pas une bonne volonté.

   ⚠️ ET IL DOIT ÊTRE FRAIS. `ensureContext()` (l'assistant) lit une fois
   par session et ne relit jamais : c'est acceptable pour un profil, c'est
   faux pour un moteur, dont l'état change à chaque séance terminée. Le
   cache d'ici est donc court ET invalidé par `EVT_JOURNEE`, l'évènement
   que tous les écrans du planning émettent déjà après une écriture.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { EVT_JOURNEE } from "@/lib/finSeance";
import { libelleReservation } from "@/lib/journee";
import {
  datesEntre, ajouterJours, adaptationDuJour, etapeMasquee, idsMasques, libelleJour,
  type Adaptation,
} from "@/lib/adaptation";
import {
  lireProgrammeActif, etapeSuivante, positionConsommee,
  type EtapeCycle,
} from "@/lib/programme";
import {
  fetchRange, reservationDeLEtape, todayYmd, dayTitle, principale,
  type PlanningDay,
} from "@/lib/planning";

/** Combien de jours de part et d'autre d'aujourd'hui la fenêtre couvre.
 *  Sept devant (« qu'est-ce que j'ai de prévu ? ») et sept derrière
 *  (« qu'est-ce que j'ai fait ? ») : c'est UNE requête dans les deux cas,
 *  `fetchRange` prenant une liste de dates. */
const JOURS_AVANT = 7;
const JOURS_APRES = 7;

/** Ce que le résumé accepte de nommer. Au-delà il dit « et d'autres » :
 *  un bloc de prompt qui grossit avec le planning de quelqu'un cesse
 *  d'être borné, et c'est exactement ce que cette vague s'interdit. */
const MAX_A_VENIR = 6;
const MAX_RECENT = 3;
const MAX_TITRE = 40;
const MAX_MOTIF = 60;

/** Une intention, réduite à ce que le Guide a besoin d'en dire. */
export type SeanceMoteur = {
  date: string;
  titre: string;
  faite: boolean;
  /** L'étape que cette intention REFERME. `null` pour un supplément. */
  etapeId: string | null;
  /** D'où vient son contenu. Ce n'est PAS ce qu'elle referme (V4). */
  provenanceId: string | null;
  /** Elle vient EN PLUS de la principale de sa journée (V6b). */
  supplement: boolean;
};

/**
 * L'état du moteur pour quelqu'un, à un instant.
 *
 * ⚠️ LES IDENTITÉS SONT DES IDENTIFIANTS RÉELS, jamais des titres. Le
 * résumé n'affiche que des noms, mais c'est le seul endroit où ils
 * servent : rien ici ne se décide en comparant deux chaînes.
 */
export type EtatMoteur = {
  /** Le jour de référence (YYYY-MM-DD). */
  aujourdhui: string;
  programme: { id: string; nom: string } | null;
  /** Le cycle du programme actif, dans l'ordre. 3 à 6 étapes. */
  cycle: { id: string; nom: string; position: number }[];
  /** La prochaine étape SANS tenir compte de l'adaptation. C'est elle qui
   *  explique « pourquoi tu me proposes Pull ? » quand elle diffère. */
  etapeBrute: { id: string; nom: string } | null;
  /** La prochaine étape réellement proposable aujourd'hui. */
  etape: { id: string; nom: string } | null;
  /** Le jour déjà donné à `etape`, ou `null` (« quand tu veux »). */
  reserveLe: string | null;
  /** L'adaptation qui s'applique aujourd'hui. */
  adaptation: Adaptation | null;
  /** Les NOMS des étapes que l'adaptation met de côté. */
  masquees: string[];
  /** Ce qui est daté et encore à faire, d'aujourd'hui à J+7. */
  aVenir: SeanceMoteur[];
  /** Ce qui a été fait, de J-7 à aujourd'hui, du plus récent au plus ancien. */
  recent: SeanceMoteur[];
  /** Le contexte d'entraînement, réduit à ce qui n'est écrit nulle part
   *  ailleurs dans le prompt. Le LIEU n'y est pas : il a déjà sa section. */
  contexte: { seancesCible: number | null; dureeCibleMin: number | null } | null;
};

/* ═══════════════════ La lecture ═══════════════════ */

function versSeance(d: PlanningDay, supplement: boolean): SeanceMoteur {
  return {
    date: d.date,
    titre: dayTitle(d).slice(0, MAX_TITRE),
    faite: d.status === "done",
    etapeId: d.etapeId ?? null,
    provenanceId: d.provenanceId ?? null,
    supplement,
  };
}

async function lireContexte(userId: string) {
  try {
    const { data } = await createClient()
      .from("contexte_entrainement")
      .select("seances_cible, duree_cible_min")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    const r = data as { seances_cible: number | null; duree_cible_min: number | null };
    return { seancesCible: r.seances_cible, dureeCibleMin: r.duree_cible_min };
  } catch {
    // Un contexte illisible ne doit jamais empêcher le Guide de voir le
    // reste : il perd une phrase, pas le programme.
    return null;
  }
}

/**
 * L'état du moteur, composé des autorités existantes.
 *
 * ⚠️ LE CURSEUR SE LIT UNE FOIS ET SE DÉRIVE DEUX FOIS. `etapeSuivanteDe`
 * ferait sa propre lecture à chaque appel, donc demander l'étape brute
 * PUIS l'étape compatible coûterait deux requêtes pour la même donnée.
 * On lit la position refermée (l'autorité, `positionConsommee`) et on
 * applique `etapeSuivante` (la règle, pure) avec puis sans le filtre.
 */
async function lireEtatMoteur(userId: string): Promise<EtatMoteur | null> {
  const aujourdhui = todayYmd();
  const fenetre = datesEntre(ajouterJours(aujourdhui, -JOURS_AVANT), ajouterJours(aujourdhui, JOURS_APRES));

  /* Ces deux-là ne dépendent de rien : elles partent tout de suite, en
     parallèle de la chaîne du programme. */
  const planningPromis = fetchRange(userId, fenetre).catch(() => ({} as Record<string, PlanningDay[]>));
  const contextePromis = lireContexte(userId);

  let programme: EtatMoteur["programme"] = null;
  let cycle: EtatMoteur["cycle"] = [];
  let etapeBrute: EtatMoteur["etapeBrute"] = null;
  let etape: EtatMoteur["etape"] = null;
  let reserveLe: string | null = null;
  let adaptation: Adaptation | null = null;
  let masquees: string[] = [];

  try {
    const actif = await lireProgrammeActif(userId);
    if (actif) {
      programme = { id: actif.programme.id, nom: actif.programme.nom };
      cycle = actif.cycle.map((e) => ({ id: e.id, nom: e.nom, position: e.position }));

      /* ⚠️ L'ADAPTATION SE LIT AVANT L'ÉTAPE, PARCE QU'ELLE DÉCIDE DE
         L'ÉTAPE. Elle est rattachée au programme ACTIF : une nouvelle
         version cesse d'être adaptée d'elle-même, sans écriture. */
      adaptation = await adaptationDuJour(userId, actif.programme.id, aujourdhui);
      masquees = idsMasques(actif.cycle, adaptation)
        .map((id) => actif.cycle.find((e) => e.id === id)?.nom)
        .filter((n): n is string => !!n);

      const position = await positionConsommee(userId, actif);
      const depart = actif.programme.positionInitiale;
      const brute = etapeSuivante(actif.cycle, position, depart);
      const compatible = etapeSuivante<EtapeCycle>(
        actif.cycle, position, depart, (e) => etapeMasquee(e.id, adaptation),
      );
      if (brute) etapeBrute = { id: brute.id, nom: brute.nom };
      if (compatible) etape = { id: compatible.id, nom: compatible.nom };

      /* ⚠️ LA RÉSERVATION SE CHERCHE EN BASE, JAMAIS DANS LA FENÊTRE
         CHARGÉE. Une étape datée au-delà de sept jours est hors de tout
         ce qu'on vient de lire : la chercher là rendrait le défaut
         intermittent, c'est-à-dire pire qu'un défaut franc. */
      if (compatible) {
        const r = await reservationDeLEtape(userId, compatible.id);
        reserveLe = r?.date ?? null;
      }
    }
  } catch (e) {
    // Le Guide dira ce qu'il sait du planning, et rien du programme.
    console.warn("[guideMoteur] programme illisible :", (e as Error)?.message);
  }

  const parJour = await planningPromis;
  const aVenir: SeanceMoteur[] = [];
  const recent: SeanceMoteur[] = [];
  for (const date of fenetre) {
    const lignes = parJour[date] ?? [];
    const tete = principale(lignes);
    for (const d of lignes) {
      /* ⚠️ LA HIÉRARCHIE DE LA JOURNÉE NE SE STOCKE PAS, ELLE SE DÉDUIT
         (V6b) : l'étape du cycle d'abord, les suppléments ensuite. On
         reprend `principale`, on ne réordonne pas nous-mêmes. Un repos
         POSÉ reste une information (V5) ; c'est l'absence de ligne qui
         n'en est pas une. */
      const s = versSeance(d, !!tete && d.id !== tete.id);
      if (d.status === "done") recent.push(s);
      else if (date >= aujourdhui) aVenir.push(s);
    }
  }
  recent.reverse();

  const contexte = await contextePromis;

  if (!programme && aVenir.length === 0 && recent.length === 0 && !contexte) return null;

  return {
    aujourdhui, programme, cycle, etapeBrute, etape, reserveLe,
    adaptation, masquees, aVenir, recent, contexte,
  };
}

/* ═══════════════════ Le cache, court et invalidé ═══════════════════ */

/** Assez court pour qu'un aller-retour dans l'app ne serve pas un état
 *  périmé, assez long pour qu'une rafale de messages ne relise pas sept
 *  fois la même chose. La vraie fraîcheur vient d'`EVT_JOURNEE`. */
export const TTL_MOTEUR_MS = 30_000;

let cache: { userId: string; a: number; etat: EtatMoteur | null } | null = null;
let branche = false;

/** Vide le cache. Appelée par `EVT_JOURNEE`, donc par toute écriture qui
 *  passe par l'autorité de fin de séance ou par les écrans du planning. */
export function invaliderMoteur(): void {
  cache = null;
}

function brancherEcoute(): void {
  if (branche || typeof window === "undefined") return;
  branche = true;
  window.addEventListener(EVT_JOURNEE, invaliderMoteur);
}

/**
 * L'état du moteur, mis en cache brièvement.
 *
 * `lire` n'existe que pour le banc : il permet de vérifier la fraîcheur
 * hors ligne, sur une app pourtant auth-gated, sans recopier la logique
 * de cache dans le test.
 */
export async function etatMoteur(
  userId: string,
  lire: (id: string) => Promise<EtatMoteur | null> = lireEtatMoteur,
): Promise<EtatMoteur | null> {
  if (!userId) return null;
  brancherEcoute();
  if (cache && cache.userId === userId && Date.now() - cache.a < TTL_MOTEUR_MS) return cache.etat;
  const etat = await lire(userId);
  cache = { userId, a: Date.now(), etat };
  return etat;
}

/* ═══════════════════ Le résumé, pur et borné ═══════════════════ */

function pluriel(n: number, mot: string): string {
  return n + " " + mot + (n > 1 ? "s" : "");
}

/**
 * L'état du moteur, en quelques lignes destinées au coach.
 *
 * ⚠️ IL DIT DES FAITS, IL NE DONNE AUCUNE CONSIGNE. La règle « n'invente
 * jamais au-delà de ce bloc » vit dans `buildSystemPrompt`, écrite une
 * fois : la recopier ici la ferait voyager à chaque tour pour rien.
 *
 * ⚠️ IL EST BORNÉ PAR CONSTRUCTION. Le cycle fait au plus six étapes, la
 * liste à venir est coupée, l'historique aussi, et chaque titre est
 * tronqué. Un bloc de prompt qui grossit avec les données de quelqu'un
 * n'est plus un résumé, c'est le gros contexte qu'on refuse.
 *
 * Rend `null` quand il n'y a strictement rien à dire : le bloc disparaît
 * alors du prompt, au lieu d'y écrire une absence.
 */
export function resumeMoteur(etat: EtatMoteur | null): string | null {
  if (!etat) return null;
  const lignes: string[] = [];

  if (etat.programme) {
    const noms = etat.cycle.map((e) => e.nom).join(", ");
    const cible = etat.contexte?.seancesCible;
    const duree = etat.contexte?.dureeCibleMin;
    lignes.push(
      "Programme actif : " + etat.programme.nom + "."
      + (noms ? " Cycle qui tourne : " + noms + "." : "")
      + (cible ? " Vise " + pluriel(cible, "séance") + " par semaine." : "")
      + (duree ? " Séances d’environ " + duree + " min." : ""),
    );
  } else {
    lignes.push("Programme actif : aucun.");
  }

  if (etat.etape) {
    const quand = etat.reserveLe
      ? "prévue " + libelleReservation(etat.reserveLe, etat.aujourdhui)
      : "pas encore datée (quand il veut)";
    let ligne = "Prochaine étape : " + etat.etape.nom + ", " + quand + ".";
    /* Le cas qui répond à « pourquoi tu me proposes celle-là ? » : le
       curseur pointe ailleurs, et c'est l'adaptation qui décale. */
    if (etat.etapeBrute && etat.etapeBrute.id !== etat.etape.id) {
      ligne += " (" + etat.etapeBrute.nom + " vient avant dans le cycle, mais elle est mise de côté.)";
    }
    lignes.push(ligne);
  } else if (etat.programme && etat.masquees.length > 0) {
    lignes.push("Prochaine étape : aucune, l’adaptation en cours met tout le cycle de côté.");
  } else if (etat.programme) {
    lignes.push("Prochaine étape : aucune.");
  }

  if (etat.adaptation) {
    const quoi = etat.masquees.length ? etat.masquees.join(", ") + " mise(s) de côté" : "aucune étape écartée";
    const motif = etat.adaptation.motif ? " Motif noté : " + etat.adaptation.motif.slice(0, MAX_MOTIF) + "." : "";
    lignes.push(
      "Adaptation en cours jusqu’au " + libelleJour(etat.adaptation.fin) + " : " + quoi + "." + motif,
    );
  }

  const restant = etat.aVenir.length - MAX_A_VENIR;
  lignes.push(
    etat.aVenir.length
      ? "Prévu (7 jours) : "
        + etat.aVenir.slice(0, MAX_A_VENIR)
          .map((s) => libelleReservation(s.date, etat.aujourdhui) + " " + s.titre + (s.supplement ? " (en plus)" : ""))
          .join(" · ")
        + (restant > 0 ? " · et " + restant + " autre(s)" : "") + "."
      : "Prévu (7 jours) : rien de daté.",
  );

  if (etat.recent.length) {
    lignes.push(
      "Fait récemment : "
      + etat.recent.slice(0, MAX_RECENT)
        .map((s) => libelleReservation(s.date, etat.aujourdhui) + " " + s.titre)
        .join(" · ") + ".",
    );
  }

  return lignes.join("\n");
}
