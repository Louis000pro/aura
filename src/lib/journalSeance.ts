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

   ⚠️ CE QUE LE JOURNAL N'AFFIRME PAS. Avant R3, le bouton du tunnel dit
   « Série terminée », pas « j'ai fait 10 répétitions à 60 kg ». On garde
   donc la prescription à côté de la série, et les valeurs DÉCLARÉES
   restent vides : on ne remplit pas l'historique de répétitions supposées
   exactes. De même, un minuteur arrivé au bout, un minuteur validé avant
   la fin et un bouton ne sont pas le même évènement.

   La décision (qu'est-ce qui s'écrit) est pure et vérifiée par
   `check:programme` ; la lecture et l'écriture sont à côté.
   ════════════════════════════════════════════════════════════════════ */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise } from "@/components/WorkoutGuideModal";
import { cleExercice } from "@/lib/exerciceCle";
import { terminerSeance, type CibleSeance } from "@/lib/finSeance";

/** Comment une série a été déclarée terminée. */
export type Validation = "bouton" | "minuteur_fini" | "minuteur_abrege";

/** Ce que le tunnel sait d'une série, au moment où elle se termine. */
export type Marque =
  | { statut: "terminee"; validation: Validation; dureeS: number | null }
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
};

export type JournalSeance = {
  version: 1;
  lancement_id: string;
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
 * Une ligne par série PRÉVUE, quoi qu'il lui soit arrivé.
 *
 * ⚠️ Une série sans marque est « non atteinte », pas « passée » : passer
 * est un geste explicite (« Passer l'exercice »), ne pas y arriver ne
 * l'est pas. Les confondre ferait dire à quelqu'un qu'il a sauté ce
 * qu'il n'a simplement pas eu le temps de faire.
 */
export function lignesDuJournal(exercices: Exercise[], marques: MarquesSeance): LigneSerie[] {
  const lignes: LigneSerie[] = [];
  exercices.forEach((ex, emplacement) => {
    const duree = !!(ex.auto || ex.hiit);
    for (let s = 0; s < Math.max(1, ex.sets); s++) {
      const m = marques[emplacement]?.[s];
      const terminee = m?.statut === "terminee" ? m : null;
      lignes.push({
        emplacement,
        exercice_cle: cleExercice(ex.name),
        exercice_nom: ex.name,
        serie: s + 1,
        statut: m ? m.statut : "non_atteinte",
        mesure: duree ? "duree" : "reps",
        reps_prescrites: duree ? null : repsPrescrites(ex.reps),
        duree_prescrite_s: duree ? (ex.auto ?? DUREE_EFFORT_HIIT) : null,
        reps_declarees: null,
        duree_s: terminee?.dureeS ?? null,
        validation: terminee?.validation ?? null,
      });
    }
  });
  return lignes;
}

/** Le journal d'une séance qui vient de se terminer, horodaté maintenant. */
export function journalDe(e: {
  lancementId: string; titre: string; categorie: string;
  /** L'instant réel du départ ; à défaut, on le déduit de la durée. */
  debutMs: number | null; dureeS: number;
  exercices: Exercise[]; marques: MarquesSeance;
}): JournalSeance {
  const finMs = Date.now();
  return {
    version: 1,
    lancement_id: e.lancementId,
    titre: e.titre,
    categorie: e.categorie,
    debut: new Date(e.debutMs ?? finMs - e.dureeS * 1000).toISOString(),
    fin: new Date(finMs).toISOString(),
    duree_s: e.dureeS,
    calories: Math.round((e.dureeS / 60) * 6.5),
    exercices: e.exercices,
    series: lignesDuJournal(e.exercices, e.marques),
  };
}

/** Un identifiant de lancement, tiré une fois au départ du tunnel. */
export function nouveauLancement(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/* ── L'écriture ─────────────────────────────────────────────────────── */

export type ResultatJournal =
  | { ok: true; id: string; deja: boolean }
  | { ok: false };

/**
 * Enregistre la séance et ses séries, ou rend la séance déjà enregistrée
 * pour ce lancement. Ne jette jamais.
 *
 * ⚠️ REPLI TANT QUE LA MIGRATION N'EST PAS APPLIQUÉE. Sans la fonction
 * `enregistrer_seance`, on écrit la séance comme avant (sans ses séries
 * ni son identifiant de lancement) : l'app ne doit pas cesser
 * d'enregistrer des séances le temps qu'un SQL soit collé.
 */
export async function enregistrerJournal(
  supabase: SupabaseClient, userId: string, j: JournalSeance,
): Promise<ResultatJournal> {
  const { data, error } = await supabase.rpc("enregistrer_seance", { p: j });
  if (!error && data && typeof data === "object" && "id" in data) {
    const r = data as { id: string; deja?: boolean };
    return { ok: true, id: String(r.id), deja: !!r.deja };
  }
  if (error && error.code !== "PGRST202") {
    console.error("[journal] enregistrement impossible :", error.message);
    return { ok: false };
  }
  const { data: ligne, error: e2 } = await supabase.from("workout_sessions").insert({
    user_id: userId,
    title: j.titre,
    category: j.categorie,
    duration_minutes: Math.round(j.duree_s / 60) || 1,
    calories_burned: j.calories,
    elapsed_seconds: j.duree_s,
    exercises: j.exercices,
    started_at: j.debut,
  }).select("id").single();
  if (e2 || !ligne) {
    console.error("[journal] enregistrement impossible (repli) :", e2?.message);
    return { ok: false };
  }
  return { ok: true, id: String(ligne.id), deja: false };
}

/* ── L'attente ──────────────────────────────────────────────────────── */

type EnAttente = { journal: JournalSeance; cible: CibleSeance | null };

const cleAttente = (userId: string) => `vaiiya_journal_attente_${userId}`;

function lireAttente(userId: string): EnAttente[] {
  try {
    const brut = localStorage.getItem(cleAttente(userId));
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch { return []; }
}

function ecrireAttente(userId: string, liste: EnAttente[]): void {
  try {
    if (liste.length) localStorage.setItem(cleAttente(userId), JSON.stringify(liste));
    else localStorage.removeItem(cleAttente(userId));
  } catch { /* stockage indisponible : on ne peut rien garder de plus */ }
}

function mettreEnAttente(userId: string, e: EnAttente): void {
  const liste = lireAttente(userId).filter((x) => x.journal.lancement_id !== e.journal.lancement_id);
  ecrireAttente(userId, [...liste, e]);
}

function retirerAttente(userId: string, lancementId: string): void {
  ecrireAttente(userId, lireAttente(userId).filter((x) => x.journal.lancement_id !== lancementId));
}

/**
 * LA finalisation d'une séance : le journal, puis la cible du planning.
 *
 * La cible n'est refermée que si CET appel a écrit la séance (`deja`
 * faux). Si elle était déjà écrite, c'est l'appel qui l'a écrite qui
 * s'en est chargé.
 */
export async function finaliserSeance(
  supabase: SupabaseClient, userId: string, journal: JournalSeance, cible: CibleSeance | null,
): Promise<ResultatJournal> {
  mettreEnAttente(userId, { journal, cible });
  const r = await enregistrerJournal(supabase, userId, journal);
  if (!r.ok) return r;
  /* ⚠️ « DÉJÀ ENREGISTRÉE » NE DIT PAS « DÉJÀ REFERMÉE ». L'app a pu se
     fermer entre les deux. Refermer une INTENTION se rejoue sans dommage
     (une mise à jour par son id), on le refait donc ; refermer une ÉTAPE
     est une insertion, on ne la rejoue jamais. */
  if (cible && (!r.deja || cible.genre === "intention")) await terminerSeance(userId, cible);
  retirerAttente(userId, journal.lancement_id);
  return r;
}

let rejeuEnCours: Promise<void> | null = null;

/** Rejoue les séances restées en attente sur cet appareil. Silencieux. */
export function rejouerJournalEnAttente(supabase: SupabaseClient, userId: string): Promise<void> {
  if (rejeuEnCours) return rejeuEnCours;
  rejeuEnCours = (async () => {
    for (const e of lireAttente(userId)) {
      await finaliserSeance(supabase, userId, e.journal, e.cible);
    }
  })().finally(() => { rejeuEnCours = null; });
  return rejeuEnCours;
}
