/* ════════════════════════════════════════════════════════════════════
   R9b · LES GESTES DE « MA SEMAINE » (maquette 08, écrans 07 et 08)

   Trois gestes, partout les mêmes :
   · CHANGER DE JOUR : réserve une occurrence prévue (ou déplace sa
     réservation) à une date. C'est le seul geste qui écrit une
     intention du programme, et il passe par le même chemin que le héros
     (`ecrireOccurrence`, une occurrence = une ligne) ;
   · PAS D'ENTRAÎNEMENT CE JOUR-LÀ : une exception datée. La séance
     prévue glisse au prochain jour d'entraînement, rien n'est effacé ;
   · METTRE UNE AUTRE SÉANCE CE JOUR-LÀ : poser une séance du catalogue
     sur ce jour. Le jour devient occupé, donc la séance du programme
     glisse au jour suivant ; elle n'est PAS comptée comme faite. Ce n'est
     pas une substitution V9C (tour 42), et l'écran le dit avant le choix.
     Rien n'est retiré avant que la nouvelle séance soit enregistrée.

   ⚠️ UNE PRÉVISION NE S'ÉCRIT JAMAIS TOUTE SEULE (décision 19). Seul
   « Changer de jour » écrit une occurrence, et seulement après avoir
   relu la résolution : la séance visée doit être ENCORE celle que la
   projection place (ou déjà réservée). Sinon, refus et relecture.
   ════════════════════════════════════════════════════════════════════ */

import { levelToDifficulty } from "@/lib/assistantActions";
import { adaptationActive, etapeMasquee, lireAdaptations } from "@/lib/adaptation";
import {
  appliquerRegleDuJour, contexteDe, deplacerDateReservation, reservationDeLOccurrence,
  retirerReservationDuJour, type GenInput,
} from "@/lib/planning";
import { appliquerCibles } from "@/lib/progression";
import { ciblesOuvertes } from "@/lib/progressionBase";
import { ecrireOccurrence, modeleDeLEtape, modeleDeLOccurrence } from "@/lib/prescription";
import { lireVariete } from "@/lib/varieteBase";
import { lireProgrammeActif } from "@/lib/programme";
import { jourParis, resolutionDuProgramme } from "@/lib/projectionBase";
import { poserException } from "@/lib/joursEntrainement";
import { rangEnAttente } from "@/lib/occurrences";
import { cibleEncoreAffichee, type SeanceJournal } from "@/lib/semaine";
import { decaler } from "@/lib/projection";
import { createClient } from "@/lib/supabase";

export type ResultatGeste = { ok: true } | { ok: false; raison: "changee" | "illisible" | "echec" | "masquee" | "partiel" };

/**
 * Ce que l'écran montrait quand on a touché le geste : la cible PRÉCISE.
 * Tour 42 · on la vérifie entière avant d'écrire, pas seulement son rang
 * quelque part dans les 28 jours.
 */
export type CibleAffichee = {
  programmeId: string;
  etapeId: string;
  rang: number;
  /** Le jour où l'écran la montrait. */
  date: string;
  /** L'intention qui la réserve, si elle était réservée. */
  reservationId: string | null;
};

/**
 * Réserve l'occurrence affichée le jour `vers`, ou déplace sa réservation.
 *
 * - Réservée : la DATE SEULE change, et seulement si elle est encore
 *   prévue au jour affiché. Une correction concurrente de son contenu tient.
 * - Prévue : on relit la résolution et les occurrences, et l'on exige
 *   qu'elle soit toujours placée AU MÊME JOUR, et qu'elle soit
 *   l'occurrence en attente de son étape (réserver B₅ ferait disparaître
 *   B₂, tour 42).
 * - Dans les deux cas, une adaptation qui masque l'étape au jour d'arrivée
 *   refuse le geste.
 */
export async function changerDeJour(input: {
  userId: string;
  cible: CibleAffichee;
  vers: string;
  aujourdhui: string;
  gen: GenInput;
}): Promise<ResultatGeste> {
  const { userId, cible, vers, gen } = input;
  try {
    const actif = await lireProgrammeActif(userId);
    if (!actif || actif.programme.id !== cible.programmeId) return { ok: false, raison: "changee" };
    const etape = actif.cycle.find((e) => e.id === cible.etapeId);
    if (!etape) return { ok: false, raison: "changee" };
    const adaptations = await lireAdaptations(userId, actif.programme.id, "stricte");
    const aLArrivee = adaptationActive(adaptations, vers);
    if (etapeMasquee(etape.id, aLArrivee)) return { ok: false, raison: "masquee" };

    if (cible.reservationId) {
      const bouge = await deplacerDateReservation(userId, cible.reservationId, cible.date, vers,
        { programmeId: cible.programmeId, etapeId: cible.etapeId, rang: cible.rang });
      if (!bouge) return { ok: false, raison: "changee" };
      return { ok: true };
    }

    /* ⚠️ RELIRE AVANT D'ÉCRIRE. Une panne n'est pas un accord. */
    const proj = await resolutionDuProgramme(userId, actif, input.aujourdhui, 28);
    if (!proj?.etat) return { ok: false, raison: "illisible" };
    if (!cibleEncoreAffichee(proj.resolution, cible)) return { ok: false, raison: "changee" };
    if (rangEnAttente(actif.cycle, proj.etat, etape.id) !== cible.rang) return { ok: false, raison: "changee" };
    if (await reservationDeLOccurrence(userId, actif.programme.id, cible.rang)) return { ok: false, raison: "changee" };

    const lu = await modeleDeLEtape({ id: etape.id, nom: etape.nom }, contexteDe(gen));
    if (!lu) return { ok: false, raison: "illisible" };
    /* R7 · la MÊME occurrence que celle affichée : ses complémentaires
       viennent de son rang et du réglage, relus. */
    const variete = await lireVariete(userId);
    if (!variete) return { ok: false, raison: "illisible" };
    const modele = modeleDeLOccurrence(lu, { id: etape.id, rang: cible.rang }, contexteDe(gen), variete, actif.cycle.length);
    const cibles = (await ciblesOuvertes(userId, actif.programme.id, etape.id)) ?? [];
    const r = await ecrireOccurrence({
      programme_id: actif.programme.id,
      etape_consommee_id: etape.id,
      programme_seance_id: etape.id,
      rang: cible.rang,
      statut: "prevue",
      date: vers,
      type: "Force",
      title: etape.nom,
      difficulty: levelToDifficulty(gen.level ?? null),
      location: gen.ctx ?? null,
      origine: "utilisateur",
      adaptation_id: aLArrivee?.id ?? null,
      consommee_le: null,
      lancement_id: null,
    }, modele.modeleId, appliquerCibles(modele.lignes, cibles, cible.rang));
    /* `deja` : quelqu'un l'a réservée entre-temps. On ne la déplace pas
       à l'aveugle : l'écran se relit et la montre où elle est. */
    if (r.resultat === "deja") return { ok: false, raison: "changee" };
    if (r.resultat !== "ok") return { ok: false, raison: "echec" };
    await appliquerRegleDuJour(userId, vers, r.id);
    return { ok: true };
  } catch (e) {
    console.error("[semaine] changer de jour :", e);
    return { ok: false, raison: "echec" };
  }
}

/**
 * « Pas d'entraînement ce jour-là ». Une réservation posée ce jour-là est
 * retirée (pas marquée) : son occurrence redevient en attente et glisse.
 *
 * ⚠️ Tour 42 · JAMAIS À MOITIÉ. L'exception se pose d'abord ; si la
 * réservation n'est plus là (déplacée depuis) ou si son retrait échoue,
 * l'exception est retirée et rien n'a changé.
 */
export async function retirerLeJour(
  userId: string, date: string, reservationId: string | null,
  /** L'exception que le jour portait avant (un jour en plus) : c'est elle
   *  qu'on remet si le geste ne peut pas aller au bout. */
  avant: "seance_en_plus" | null = null,
): Promise<ResultatGeste> {
  /* Revue finale (P2) · d'abord la fonction de la base : le retrait et
     l'exception dans UNE transaction, jamais l'un sans l'autre. */
  try {
    const rpc = await createClient().rpc("retirer_le_jour", { p: { date, reservation_id: reservationId } });
    if (!rpc.error) {
      const r = (rpc.data as { resultat?: string } | null)?.resultat;
      return r === "ok" ? { ok: true } : { ok: false, raison: "changee" };
    }
    const code = (rpc.error as { code?: string }).code;
    if (code !== "PGRST202" && code !== "42883") {
      console.error("[semaine] retirer le jour :", rpc.error.message);
      /* Une erreur rendue par la base annule sa transaction : rien n'a changé. */
      return { ok: false, raison: "echec" };
    }
  } catch (e) {
    /* La requête a pu passer : on ne l'affirme pas, on relit. */
    console.error("[semaine] retirer le jour :", e);
    return { ok: false, raison: "partiel" };
  }
  /* Migration pas encore passée : en deux temps, en disant la vérité si
     la compensation elle-même échoue. */
  try {
    await poserException(userId, date, "pas_de_seance");
  } catch (e) {
    console.error("[semaine] retirer le jour :", e);
    return { ok: false, raison: "echec" };
  }
  if (!reservationId) return { ok: true };
  let raison: "changee" | "echec" | null = null;
  try {
    if (!(await retirerReservationDuJour(userId, reservationId, date))) raison = "changee";
  } catch (e) {
    console.error("[semaine] retirer la réservation :", e);
    raison = "echec";
  }
  if (!raison) return { ok: true };
  try { await poserException(userId, date, avant); }
  catch (e) {
    console.error("[semaine] annuler l'exception :", e);
    /* L'exception est restée posée : on ne prétend pas que rien n'a changé. */
    return { ok: false, raison: "partiel" };
  }
  return { ok: false, raison };
}

/** Remet le jour à sa règle (efface l'exception), ou ajoute un jour en plus. */
export async function regleDuJour(userId: string, date: string, genre: "seance_en_plus" | null): Promise<ResultatGeste> {
  try {
    await poserException(userId, date, genre);
    return { ok: true };
  } catch (e) {
    console.error("[semaine] règle du jour :", e);
    return { ok: false, raison: "echec" };
  }
}

/**
 * R9b · tour 42 · Le journal des séances faites sur une plage de dates,
 * datées au jour de Paris (décision 10). Strict : une erreur lève, et
 * l'écran dit qu'il n'a pas pu lire au lieu de montrer une semaine vide.
 */
export async function lireJournal(userId: string, dates: string[]): Promise<SeanceJournal[]> {
  if (dates.length === 0) return [];
  const triees = [...dates].sort();
  const { data, error } = await createClient()
    .from("workout_sessions")
    .select("id, title, started_at, duration_minutes, seance_prevue_id, lancement_id")
    .eq("user_id", userId)
    .gte("started_at", `${decaler(triees[0], -1)}T00:00:00Z`)
    .lt("started_at", `${decaler(triees[triees.length - 1], 2)}T00:00:00Z`);
  if (error) throw new Error(error.message);
  const voulues = new Set(dates);
  return (data ?? [])
    .map((r) => ({
      id: String(r.id),
      date: jourParis(String(r.started_at)),
      titre: String(r.title ?? "Séance"),
      dureeMin: typeof r.duration_minutes === "number" ? r.duration_minutes : null,
      intentionId: (r.seance_prevue_id as string | null) ?? null,
      lancementId: (r.lancement_id as string | null) ?? null,
    }))
    .filter((s) => voulues.has(s.date));
}
