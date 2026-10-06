/* ════════════════════════════════════════════════════════════════════
   R1 · LE JOURNAL DIT LA VÉRITÉ

   Avant cette vague, la fin de séance écrivait la liste PRÉVUE dans
   `workout_sessions.exercises`, n'enregistrait jamais ce qui avait été
   fait (`doneMap` vivait et mourait dans le tunnel), avalait l'erreur
   d'insertion, et refermait le planning AVANT de savoir si le journal
   était écrit. Une séance pouvait donc être « faite » au planning et
   absente du journal, sans que personne le voie.

   Ce module tient trois règles, dans cet ordre :
   1. LE JOURNAL D'ABORD. On enregistre la séance et ses séries, en une
      seule transaction en base (`enregistrer_seance`). Ce n'est qu'après
      sa réussite qu'on referme la cible du planning, puis qu'on distribue
      les récompenses.
   2. UNE FOIS PAR LANCEMENT. Chaque lancement porte un identifiant tiré
      au départ du tunnel ; la base refuse de l'enregistrer deux fois.
      Un appel rejoué (réseau, rechargement, double rendu) rend la séance
      déjà écrite, et ne referme rien une seconde fois.
   3. RIEN NE SE PERD. Un enregistrement raté reste en attente sur
      l'appareil, avec sa cible, et se rejoue au prochain passage dans
      l'app. L'écran de fin le dit, et propose de réessayer.

   ⚠️ R1 bis (relecture de Codex, tour 9) · CE QUI RESTE EN ATTENTE N'EST
   PLUS « LE JOURNAL », C'EST TOUT LE TRAVAIL DE LA SÉANCE. Une entrée
   porte son PROPRIÉTAIRE, le journal construit une seule fois, la cible
   du planning, le relais, et l'état de chaque étape : journal, fermeture,
   maillon, affiche. Elle ne quitte l'appareil que quand TOUT est fait.
   « Journal enregistré » et « séance finalisée » sont deux choses :
   `deja` (la base avait déjà la séance) ne prouve ni que le planning est
   refermé, ni que le maillon est franchi. Chaque étape est rejouable sans
   doublon, en base : un lancement par séance, une intention par
   lancement, un maillon par séance, une affiche par séance.

   ⚠️ CE QUE LE JOURNAL N'AFFIRME PAS. Avant R3, le bouton du tunnel dit
   « Série terminée », pas « j'ai fait 10 répétitions à 60 kg ». On garde
   donc la prescription à côté de la série, et les valeurs DÉCLARÉES
   restent vides : on ne remplit pas l'historique de répétitions supposées
   exactes. De même, un minuteur arrivé au bout, un minuteur validé avant
   la fin et un bouton ne sont pas le même évènement.

   La décision (qu'est-ce qui s'écrit) est pure et vérifiée par
   `check:programme` ; la lecture et l'écriture sont à côté.
   ════════════════════════════════════════════════════════════════════ */

import type { Marge } from "@/lib/progression";
import type { ExercicePrescrit } from "@/lib/banqueEtapes";
import { chargeReglable, type ExerciceEffectif } from "@/lib/saisieSerie";
import type { Remplacements } from "@/lib/remplacement";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise } from "@/components/WorkoutGuideModal";
import { cleExercice } from "@/lib/exerciceCle";
import {
  faitDeLaSeance, fermetureTerminee, terminerSeance,
  type CibleSeance, type FaitSeance, type ResultatFermeture,
} from "@/lib/finSeance";
import { validerMaillon, type MaillonFranchi, type ResultatMaillon } from "@/lib/defi";

/** Comment une série a été déclarée terminée. */
export type Validation = "bouton" | "minuteur_fini" | "minuteur_abrege";

/** Ce que le tunnel sait d'une série, au moment où elle se termine. */
export type Marque =
  | {
      statut: "terminee"; validation: Validation; dureeS: number | null;
      /* R3 · ce qu'une série PRESCRITE en répétitions a déclaré : le
         bouton dit « Fait · 10 × 60 kg », et c'est exactement ce qui
         s'écrit. Absent d'une série sans prescription (rien de déclaré)
         et d'un journal préparé avant R3. Une charge inconnue est `null`,
         jamais zéro. */
      reps?: number | null;
      charge?: number | null;
      /* R3 · l'exercice RÉELLEMENT fait sur cette série. Il diffère de la
         prescription après un remplacement, et il se garde série par série
         (tour 26 de Codex) : A, puis B, puis C restent trois faits. */
      exercice?: ExerciceEffectif;
      /* R4 · la marge déclarée après la DERNIÈRE série d'un repère
         (décision 57). Absente = jamais posée ou ignorée. */
      marge?: Marge | null;
    }
  | { statut: "passee" };

/** Par emplacement d'exercice (son rang dans la séance), puis par série (base 0). */
export type MarquesSeance = Record<number, Record<number, Marque>>;

export type StatutSerie = "terminee" | "passee" | "non_atteinte";

export type LigneSerie = {
  emplacement: number;
  exercice_cle: string | null;
  exercice_nom: string;
  serie: number;
  statut: StatutSerie;
  mesure: "reps" | "duree";
  reps_prescrites: number | null;
  duree_prescrite_s: number | null;
  reps_declarees: number | null;
  duree_s: number | null;
  validation: Validation | null;
  /* R2 · la copie de la prescription de départ (nulle sans prescription). */
  statut_prescrit?: "repere" | "complementaire" | null;
  fonction_prescrite?: string | null;
  reps_min_prescrites?: number | null;
  reps_max_prescrites?: number | null;
  /* R3 · la charge déclarée, son unité et son type, et l'exercice prévu
     quand un autre a été fait à sa place. Absents d'un journal d'avant R3 :
     la base les laisse nuls. */
  charge?: number | null;
  charge_unite?: "kg" | null;
  charge_type?: string | null;
  exercice_prevu_cle?: string | null;
  /* R4 · la marge, sur la dernière série d'un repère seulement. */
  marge?: Marge | null;
};

export type JournalSeance = {
  version: 1;
  lancement_id: string;
  /** Le compte qui a fait la séance. La base refuse de l'écrire ailleurs. */
  proprietaire: string;
  titre: string;
  categorie: string;
  debut: string;
  fin: string;
  duree_s: number;
  calories: number;
  /** La prescription telle qu'elle était au lancement. */
  exercices: Exercise[];
  series: LigneSerie[];
};

/** Durée d'un effort HIIT, recopiée du tunnel pour que la prescription la porte. */
export const DUREE_EFFORT_HIIT = 20;

/** « 12 reps », « 10 par jambe », « 8-12 » → le premier nombre, sinon `null`. */
export function repsPrescrites(reps: string): number | null {
  const m = reps.match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** Les séries réellement terminées, et pas celles qui étaient prévues. */
export function seriesConfirmees(marques: MarquesSeance): number {
  let n = 0;
  for (const parSerie of Object.values(marques)) {
    for (const m of Object.values(parSerie)) if (m.statut === "terminee") n++;
  }
  return n;
}

/** Les exercices où au moins une série a été terminée. */
export function exercicesFaits(marques: MarquesSeance): number {
  return Object.values(marques)
    .filter((parSerie) => Object.values(parSerie).some((m) => m.statut === "terminee"))
    .length;
}

/**
 * L'emplacement PERSISTÉ d'un exercice du tunnel (revue finale, P1).
 * Une version courte (R8) ou plus légère (R7) retire des lignes : le
 * tableau du tunnel est alors compact (0, 1, 2) alors que la prescription
 * garde ses emplacements (0, 3, 4). L'index sert à naviguer ; l'identité
 * écrite au journal, corrigée en marge et acceptée en cible est celle-ci.
 * Sans prescription (catalogue, séance perso), la liste est entière et
 * l'index EST l'emplacement.
 */
export function emplacementDe(ex: Exercise | undefined, index: number): number {
  const e = (ex as ExercicePrescrit | undefined)?.prescription?.emplacement;
  return typeof e === "number" && Number.isInteger(e) && e >= 0 ? e : index;
}

/**
 * Une ligne par série PRÉVUE, quoi qu'il lui soit arrivé.
 *
 * ⚠️ Une série sans marque est « non atteinte », pas « passée » : passer
 * est un geste explicite (« Passer l'exercice »), ne pas y arriver ne
 * l'est pas. Les confondre ferait dire à quelqu'un qu'il a sauté ce
 * qu'il n'a simplement pas eu le temps de faire.
 */
export function lignesDuJournal(exercices: Exercise[], marques: MarquesSeance, remplacements: Remplacements = {}): LigneSerie[] {
  const lignes: LigneSerie[] = [];
  exercices.forEach((ex, emplacement) => {
    const duree = !!(ex.auto || ex.hiit);
    /* R2 · une séance prescrite donne sa clé et sa fourchette ; sinon on
       garde la résolution par le nom (R1), sans rien inventer. */
    const pr = (ex as ExercicePrescrit).prescription ?? null;
    /* R3 · l'exercice des séries qui restent : le remplacement courant, ou
       la prescription. Une série TERMINÉE garde le sien, posé au moment
       où elle a été validée. */
    const courant: ExerciceEffectif | null = pr
      ? (remplacements[emplacement] ?? { cle: pr.cle, nom: ex.name, chargeType: pr.charge_type })
      : null;
    for (let s = 0; s < Math.max(1, ex.sets); s++) {
      const m = marques[emplacement]?.[s];
      const terminee = m?.statut === "terminee" ? m : null;
      const effectif = pr ? (terminee?.exercice ?? courant) : null;
      /* La déclaration n'existe que pour une série prescrite en
         répétitions ; ailleurs, rien n'est affirmé (R1). */
      const reps = pr && !duree && terminee && typeof terminee.reps === "number" ? terminee.reps : null;
      const charge = pr && !duree && terminee && typeof terminee.charge === "number"
        && terminee.charge > 0 && chargeReglable(effectif?.chargeType) ? terminee.charge : null;
      lignes.push({
        emplacement: emplacementDe(ex, emplacement),
        exercice_cle: effectif?.cle ?? pr?.cle ?? cleExercice(ex.name),
        exercice_nom: effectif?.nom ?? ex.name,
        serie: s + 1,
        statut: m ? m.statut : "non_atteinte",
        mesure: duree ? "duree" : "reps",
        reps_prescrites: duree ? null : repsPrescrites(ex.reps),
        duree_prescrite_s: duree ? (ex.auto ?? DUREE_EFFORT_HIIT) : null,
        reps_declarees: reps,
        duree_s: terminee?.dureeS ?? null,
        validation: terminee?.validation ?? null,
        statut_prescrit: pr?.statut ?? null,
        fonction_prescrite: pr?.fonction ?? null,
        reps_min_prescrites: duree ? null : pr?.reps_min ?? null,
        reps_max_prescrites: duree ? null : pr?.reps_max ?? null,
        charge,
        charge_unite: charge === null ? null : "kg",
        charge_type: pr ? (effectif?.chargeType ?? null) : null,
        exercice_prevu_cle: pr && effectif && effectif.cle !== pr.cle ? pr.cle : null,
        marge: pr?.statut === "repere" && !duree && terminee && s === Math.max(1, ex.sets) - 1 ? (terminee.marge ?? null) : null,
      });
    }
  });
  return lignes;
}

/**
 * Le journal d'une séance qui vient de se terminer.
 *
 * ⚠️ À CONSTRUIRE UNE SEULE FOIS, puis à réutiliser (« Réessayer », rejeu).
 * Le reconstruire déplacerait son heure de fin à chaque essai, pour un
 * même lancement.
 */
export function journalDe(e: {
  lancementId: string; proprietaire: string; titre: string; categorie: string;
  /** L'instant réel du départ ; à défaut, on le déduit de la durée. */
  debutMs: number | null; dureeS: number;
  exercices: Exercise[]; marques: MarquesSeance;
  /** R3 · les remplacements COURANTS, pour les séries qui restaient. */
  remplacements?: Remplacements;
  /** L'instant de fin ; par défaut, maintenant. */
  finMs?: number;
}): JournalSeance {
  const finMs = e.finMs ?? Date.now();
  return {
    version: 1,
    lancement_id: e.lancementId,
    proprietaire: e.proprietaire,
    titre: e.titre,
    categorie: e.categorie,
    debut: new Date(e.debutMs ?? finMs - e.dureeS * 1000).toISOString(),
    fin: new Date(finMs).toISOString(),
    duree_s: e.dureeS,
    calories: Math.round((e.dureeS / 60) * 6.5),
    exercices: e.exercices,
    series: lignesDuJournal(e.exercices, e.marques, e.remplacements ?? {}),
  };
}

/** Un identifiant de lancement, tiré une fois au départ du tunnel. */
export function nouveauLancement(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/** Ce que l'affiche de perf porte, tiré du journal et de lui seul : elle
 *  se reconstruit à l'identique après une récupération. */
export function afficheDe(j: JournalSeance, seanceId: string) {
  const elapsedMin = Math.round(j.duree_s / 60) || 1;
  const terminees = j.series.filter((l) => l.statut === "terminee");
  const exercices = new Set(terminees.map((l) => l.emplacement)).size;
  return {
    type: "workout",
    /* L'identité de la séance : une affiche par séance, en base. */
    seance_id: seanceId,
    title: j.titre,
    date: new Date(j.debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }),
    metrics: [
      { label: "Durée",     value: String(elapsedMin),                    unit: "min" },
      { label: "Exercices", value: String(exercices),                     unit: ""    },
      { label: "Séries",    value: String(terminees.length),              unit: ""    },
      { label: "Calories",  value: String(Math.round(elapsedMin * 6.5)),  unit: "kcal" },
    ],
    exercise_list: j.exercices,
    category: j.categorie,
  };
}

/* ── Le travail en attente ──────────────────────────────────────────── */

type Etape = "a_faire" | "faite";

/** Tout ce qu'une séance terminée doit encore faire, gardé sur l'appareil. */
export type EnAttente = {
  v: 2;
  /** Le compte de la séance. On ne rejoue jamais sous un autre. */
  proprietaire: string;
  journal: JournalSeance;
  cible: CibleSeance | null;
  /** Le relais dont cette séance est le maillon, s'il y en a un. */
  relaisRunId: string | null;
  /** L'identifiant de la séance, une fois le journal écrit. */
  seanceId: string | null;
  fermeture: Etape;
  maillon: Etape;
  affiche: Etape;
};

export function nouvelleAttente(e: {
  journal: JournalSeance; cible: CibleSeance | null; relaisRunId?: string | null;
}): EnAttente {
  return {
    v: 2,
    proprietaire: e.journal.proprietaire,
    journal: e.journal,
    cible: e.cible,
    relaisRunId: e.relaisRunId ?? null,
    seanceId: null,
    fermeture: e.cible ? "a_faire" : "faite",
    maillon: e.relaisRunId ? "a_faire" : "faite",
    affiche: "a_faire",
  };
}

const toutFait = (e: EnAttente) =>
  !!e.seanceId && e.fermeture === "faite" && e.maillon === "faite" && e.affiche === "faite";

/* ── Les dépendances (injectables : le banc les remplace) ────────────── */

export type ResultatEcriture =
  | { etat: "ok"; id: string; deja: boolean }
  /** La fonction `enregistrer_seance` n'existe pas encore en base. */
  | { etat: "migration_absente" }
  /** La base a refusé : le journal appartient à un autre compte. */
  | { etat: "compte_different" }
  | { etat: "echec" };

/** Le stockage de l'appareil. Peut jeter (quota, navigation privée). */
export type Stockage = {
  lire(cle: string): string | null;
  ecrire(cle: string, valeur: string): void;
  retirer(cle: string): void;
};

export type Dependances = {
  /** Le compte de la session, lu à l'instant. */
  compteConnecte(): Promise<string | null>;
  enregistrer(j: JournalSeance): Promise<ResultatEcriture>;
  fermer(userId: string, cible: CibleSeance, fait: FaitSeance): Promise<ResultatFermeture>;
  validerMaillon(userId: string, runId: string, seanceId: string): Promise<ResultatMaillon>;
  garderAffiche(userId: string, seanceId: string, j: JournalSeance): Promise<"ok" | "echec">;
  stockage: Stockage;
};

const cleAttente = (userId: string) => `vaiiya_journal_attente_${userId}`;

export function lireAttente(stockage: Stockage, userId: string): EnAttente[] {
  try {
    const brut = stockage.lire(cleAttente(userId));
    const liste = brut ? JSON.parse(brut) : [];
    /* Une entrée d'avant R1 bis (sans `v: 2`) n'a jamais pu être écrite en
       base sans la migration : on la reprend avec toutes ses étapes à faire. */
    return (Array.isArray(liste) ? liste : []).map((x: Partial<EnAttente> & { journal: JournalSeance; cible?: CibleSeance | null }) =>
      x.v === 2 ? (x as EnAttente) : nouvelleAttente({
        journal: { ...x.journal, proprietaire: x.journal.proprietaire ?? userId },
        cible: x.cible ?? null,
      }));
  } catch { return []; }
}

/** Rend `true` si l'appareil a VRAIMENT gardé la liste. */
function ecrireAttente(stockage: Stockage, userId: string, liste: EnAttente[]): boolean {
  try {
    if (liste.length) stockage.ecrire(cleAttente(userId), JSON.stringify(liste));
    else stockage.retirer(cleAttente(userId));
    return true;
  } catch { return false; }
}

function garder(stockage: Stockage, e: EnAttente): boolean {
  const autres = lireAttente(stockage, e.proprietaire).filter((x) => x.journal.lancement_id !== e.journal.lancement_id);
  return ecrireAttente(stockage, e.proprietaire, [...autres, e]);
}

function retirer(stockage: Stockage, e: EnAttente): boolean {
  return ecrireAttente(stockage, e.proprietaire,
    lireAttente(stockage, e.proprietaire).filter((x) => x.journal.lancement_id !== e.journal.lancement_id));
}

/* ── La finalisation ─────────────────────────────────────────────────── */

export type Finalisation = {
  /** Le journal est-il en base ? */
  journal: "enregistre" | "en_attente";
  /** Pourquoi il ne l'est pas. */
  raison: "echec" | "migration_absente" | "compte_different" | null;
  seanceId: string | null;
  /** Journal, fermeture, maillon ET affiche : tout est fait. */
  finalisee: boolean;
  /** Le maillon franchi PAR CET APPEL, pour la bande de fin de séance. */
  maillon: MaillonFranchi | null;
  afficheGardee: boolean;
  /** Ce qui reste à faire est-il vraiment gardé sur l'appareil ? Faux
   *  quand le stockage a refusé : l'écran ne doit pas promettre le contraire. */
  gardeeSurAppareil: boolean;
  /** Les suites encore à faire, journal enregistré ou non. */
  reste: Suite[];
};

export type Suite = "fermeture" | "maillon" | "affiche";

const suitesRestantes = (e: EnAttente): Suite[] =>
  (["fermeture", "maillon", "affiche"] as const).filter((k) => e[k] === "a_faire");

const enCours = new Map<string, Promise<Finalisation>>();

/**
 * LA finalisation d'une séance, dans l'ordre : le journal, puis la cible
 * du planning, puis le maillon du relais et l'affiche. Rejouable : chaque
 * étape faite est notée sur l'appareil, et chacune est idempotente en base.
 *
 * ⚠️ LES SUITES NE DÉPENDENT QUE DU JOURNAL. Le maillon a une fenêtre de
 * trois heures : on ne le fait pas attendre parce que le planning n'a pas
 * pu se refermer. Rien ne part avant que la séance soit en base.
 *
 * ⚠️ LE COMPTE SE VÉRIFIE AVANT ET APRÈS CHAQUE ÉTAPE. Avant, pour ne rien
 * envoyer sous une autre session ; après, parce qu'un changement de
 * session pendant la requête rendrait sa réponse illisible (une intention
 * de A paraît « introuvable » sous la session de B). La base, elle,
 * refuse d'écrire le journal de A chez B.
 */
export function finaliserSeance(deps: Dependances, entree: EnAttente): Promise<Finalisation> {
  const cle = `${entree.proprietaire}:${entree.journal.lancement_id}`;
  const deja = enCours.get(cle);
  if (deja) return deja;
  const p = finaliser(deps, entree).finally(() => enCours.delete(cle));
  enCours.set(cle, p);
  return p;
}

async function finaliser(deps: Dependances, initiale: EnAttente): Promise<Finalisation> {
  /* L'appareil peut en savoir plus que l'appelant (une étape déjà faite
     lors d'un essai précédent) : on part de ce qui est gardé. */
  const gardee = lireAttente(deps.stockage, initiale.proprietaire)
    .find((x) => x.journal.lancement_id === initiale.journal.lancement_id);
  const e: EnAttente = gardee ?? initiale;
  let surAppareil = garder(deps.stockage, e);
  let maillon: MaillonFranchi | null = null;

  const bonCompte = async () => (await deps.compteConnecte()) === e.proprietaire;
  const bilan = (raison: Finalisation["raison"]): Finalisation => {
    const finalisee = toutFait(e);
    if (finalisee) retirer(deps.stockage, e);
    else surAppareil = garder(deps.stockage, e) && surAppareil;
    return {
      journal: e.seanceId ? "enregistre" : "en_attente",
      raison, seanceId: e.seanceId, finalisee, maillon,
      afficheGardee: e.affiche === "faite",
      gardeeSurAppareil: finalisee || surAppareil,
      reste: suitesRestantes(e),
    };
  };

  /* 1 · le journal */
  if (!e.seanceId) {
    if (!(await bonCompte())) return bilan("compte_different");
    const r = await deps.enregistrer(e.journal);
    if (r.etat !== "ok") return bilan(r.etat);
    e.seanceId = r.id;
    garder(deps.stockage, e);
  }
  const seanceId = e.seanceId;
  if (!seanceId) return bilan("echec");
  let raison: Finalisation["raison"] = null;

  /** Une étape : le compte avant, l'appel, le compte après. */
  const etape = async <T>(appel: () => Promise<T>): Promise<T | null> => {
    if (!(await bonCompte())) { raison = "compte_different"; return null; }
    const r = await appel();
    if (!(await bonCompte())) { raison = "compte_different"; return null; }
    return r;
  };

  /* 2 · la cible du planning */
  if (e.fermeture === "a_faire" && e.cible && !raison) {
    const cible = e.cible;
    const f = await etape(() => deps.fermer(e.proprietaire, cible, faitDeLaSeance(e.journal)));
    if (f && fermetureTerminee(f)) { e.fermeture = "faite"; garder(deps.stockage, e); }
  }

  /* 3 · le maillon du relais */
  if (e.maillon === "a_faire" && e.relaisRunId && !raison) {
    const run = e.relaisRunId;
    const m = await etape(() => deps.validerMaillon(e.proprietaire, run, seanceId));
    if (m && m.etat !== "echec") {
      /* Un refus est une réponse : le maillon ne se franchira pas, il n'y
         a rien à reprendre. */
      e.maillon = "faite";
      if (m.etat === "franchi") maillon = m.maillon;
      garder(deps.stockage, e);
    }
  }

  /* 4 · l'affiche */
  if (e.affiche === "a_faire" && !raison) {
    const a = await etape(() => deps.garderAffiche(e.proprietaire, seanceId, e.journal));
    if (a === "ok") { e.affiche = "faite"; garder(deps.stockage, e); }
  }

  return bilan(raison);
}

/* ── Ce que l'écran de fin dit du résultat ────────────────────────────── */

/** Les mots des suites, dans l'ordre où elles se font. */
const NOM_SUITE: Record<Suite, string> = {
  fermeture: "ton planning",
  maillon: "le maillon du relais",
  affiche: "ton affiche",
};

function enumerer(mots: string[]): string {
  return mots.length < 2 ? mots.join("") : `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
}

/**
 * Ce que l'écran de fin de séance montre, décidé une seule fois ici.
 *
 * ⚠️ UNE SÉANCE ENREGISTRÉE RESTE UNE RÉUSSITE, MÊME QUAND UNE SUITE TRAÎNE.
 * On ne la présente jamais comme un échec ; on dit ce qui reste, avec
 * « Réessayer ». Et on ne promet « ça se reprendra tout seul » que si
 * l'appareil a vraiment gardé le travail.
 */
export type EtatFin =
  | { genre: "ok" }
  | { genre: "journal"; texte: string }
  | { genre: "suites"; texte: string };

export function etatFinDeSeance(r: Finalisation): EtatFin {
  if (r.journal !== "enregistre") {
    return {
      genre: "journal",
      texte: r.raison === "compte_different"
        ? r.gardeeSurAppareil
          ? "Pas enregistrée : le compte connecté n'est plus celui qui a commencé cette séance. Elle attend son retour sur ce téléphone."
          : "Pas enregistrée : le compte connecté n'est plus celui qui a commencé cette séance, et ce téléphone n'a pas pu la garder. Laisse cet écran ouvert, reviens sur ce compte et réessaie."
        : r.gardeeSurAppareil
          ? "Pas encore enregistrée. Elle reste gardée sur ce téléphone."
          : "Pas encore enregistrée, et ce téléphone n'a pas pu la garder. Laisse cet écran ouvert et réessaie.",
    };
  }
  if (r.finalisee || !r.reste.length) return { genre: "ok" };
  const quoi = enumerer(r.reste.map((k) => NOM_SUITE[k]));
  return {
    genre: "suites",
    texte: r.raison === "compte_different"
      ? r.gardeeSurAppareil
        ? `Séance enregistrée. La mise à jour de ${quoi} attend le retour du compte qui l'a faite.`
        : `Séance enregistrée. La mise à jour de ${quoi} attend le compte qui l'a faite, et ce téléphone n'a pas pu la garder : laisse cet écran ouvert, reviens sur ce compte et réessaie.`
      : r.gardeeSurAppareil
        ? `Séance enregistrée. Il reste à mettre à jour ${quoi} ; ça se reprendra tout seul.`
        : `Séance enregistrée. Il reste à mettre à jour ${quoi}, et ce téléphone n'a pas pu le garder : réessaie avant de quitter.`,
  };
}

/**
 * Le compte d'une séance, c'est celui qui l'a COMMENCÉE.
 *
 * ⚠️ JAMAIS CELUI DE LA FIN. Si la session passe de A à B pendant la
 * séance, la lire au moment d'enregistrer attribuerait à B le travail de
 * A, et la base l'accepterait puisque B est bien connecté. On ne prend le
 * compte de la fin que si personne n'était connecté au départ.
 */
export function proprietaireDeLaSeance(auDepart: string | null, aLaFin: string | null): string | null {
  return auDepart ?? aLaFin;
}

const rejeux = new Map<string, Promise<void>>();

/**
 * Rejoue le travail resté en attente pour CE compte. Silencieux.
 *
 * ⚠️ UNE COORDINATION PAR COMPTE, plus une promesse globale : le rejeu de A
 * ne doit pas empêcher celui de B de démarrer. Et il s'arrête dès que le
 * compte change.
 */
export function rejouerJournalEnAttente(deps: Dependances, userId: string): Promise<void> {
  const deja = rejeux.get(userId);
  if (deja) return deja;
  const p = (async () => {
    for (const e of lireAttente(deps.stockage, userId)) {
      if ((await deps.compteConnecte()) !== userId) return;
      const r = await finaliserSeance(deps, { ...e, proprietaire: userId });
      if (r.raison === "compte_different") return;
    }
  })().finally(() => rejeux.delete(userId));
  rejeux.set(userId, p);
  return p;
}

/* ── Les dépendances réelles ─────────────────────────────────────────── */

const stockageNavigateur: Stockage = {
  lire: (c) => localStorage.getItem(c),
  ecrire: (c, v) => localStorage.setItem(c, v),
  retirer: (c) => localStorage.removeItem(c),
};

export function dependancesReelles(supabase: SupabaseClient): Dependances {
  return {
    async compteConnecte() {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session?.user.id ?? null;
      } catch { return null; }
    },
    enregistrer: (j) => enregistrerJournal(supabase, j),
    fermer: terminerSeance,
    validerMaillon,
    async garderAffiche(userId, seanceId, j) {
      /* Audience privée : elle rejoint « Tes affiches de perf », où on la
         revoit, l'envoie ou la supprime. Une par séance, en base. */
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        type: "workout",
        caption: "",
        audience: "private",
        performance_data: afficheDe(j, seanceId),
      });
      if (!error || error.code === "23505") return "ok";
      console.error("[journal] affiche impossible :", error.message);
      return "echec";
    },
    stockage: stockageNavigateur,
  };
}

/**
 * Enregistre la séance et ses séries, ou rend la séance déjà enregistrée
 * pour ce lancement. Ne jette jamais.
 *
 * ⚠️ R1 bis · PLUS AUCUN REPLI VERS L'ANCIENNE ÉCRITURE. Elle écrivait la
 * séance sans ses séries ni son lancement : un doublon à chaque rejeu, et
 * des séries perdues pour de bon, puisque l'attente se vidait. Sans la
 * fonction en base, la séance reste ENTIÈRE sur l'appareil, et partira
 * dès que la migration sera là.
 */
export async function enregistrerJournal(supabase: SupabaseClient, j: JournalSeance): Promise<ResultatEcriture> {
  try {
    const { data, error } = await supabase.rpc("enregistrer_seance", { p: j });
    if (!error && data && typeof data === "object" && "id" in data) {
      const r = data as { id: string; deja?: boolean };
      return { etat: "ok", id: String(r.id), deja: !!r.deja };
    }
    if (error?.code === "PGRST202") return { etat: "migration_absente" };
    if (error && /proprietaire_different/.test(error.message)) return { etat: "compte_different" };
    console.error("[journal] enregistrement impossible :", error?.message);
    return { etat: "echec" };
  } catch {
    return { etat: "echec" };
  }
}
