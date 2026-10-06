/* ════════════════════════════════════════════════════════════════════
   R9b · LES GESTES DE « MA SEMAINE » (maquette 08, écrans 07 et 08)

   Trois gestes, partout les mêmes :
   · CHANGER DE JOUR : réserve une occurrence prévue (ou déplace sa
     réservation) à une date. C'est le seul geste qui écrit une
     intention du programme, et il passe par le même chemin que le héros
     (`ecrireOccurrence`, une occurrence = une ligne) ;
   · PAS D'ENTRAÎNEMENT CE JOUR-LÀ : une exception datée. La séance
     prévue glisse au prochain jour d'entraînement, rien n'est effacé ;
   · ÉCHANGER : poser une autre séance sur ce jour (catalogue). Le jour
     devient occupé, donc la séance du programme glisse aussi. Le geste
     vit dans l'écran, il réutilise « Ajouter à ma semaine ».

   ⚠️ UNE PRÉVISION NE S'ÉCRIT JAMAIS TOUTE SEULE (décision 19). Seul
   « Changer de jour » écrit une occurrence, et seulement après avoir
   relu la résolution : la séance visée doit être ENCORE celle que la
   projection place (ou déjà réservée). Sinon, refus et relecture.
   ════════════════════════════════════════════════════════════════════ */

import { levelToDifficulty } from "@/lib/assistantActions";
import { deplacerReservation } from "@/lib/journee";
import {
  appliquerRegleDuJour, contexteDe, reservationDeLOccurrence, retirerIntention, saveDay,
  type GenInput,
} from "@/lib/planning";
import { appliquerCibles } from "@/lib/progression";
import { ciblesOuvertes } from "@/lib/progressionBase";
import { ecrireOccurrence, modeleDeLEtape } from "@/lib/prescription";
import { lireProgrammeActif } from "@/lib/programme";
import { resolutionDuProgramme } from "@/lib/projectionBase";
import { poserException } from "@/lib/joursEntrainement";
import { occurrenceEncorePrevue } from "@/lib/semaine";

export type ResultatGeste = { ok: true } | { ok: false; raison: "changee" | "illisible" | "echec" };

/**
 * Réserve l'occurrence `(etapeId, rang)` le jour `date`. Si elle a déjà
 * une réservation, c'est un déplacement : seule la date change (tour 22).
 */
export async function changerDeJour(input: {
  userId: string;
  programmeId: string;
  etapeId: string;
  rang: number;
  date: string;
  aujourdhui: string;
  gen: GenInput;
}): Promise<ResultatGeste> {
  const { userId, etapeId, rang, date, gen } = input;
  try {
    const actif = await lireProgrammeActif(userId);
    if (!actif || actif.programme.id !== input.programmeId) return { ok: false, raison: "changee" };
    const existante = await reservationDeLOccurrence(userId, actif.programme.id, rang);
    if (existante) {
      if (existante.etapeId !== etapeId) return { ok: false, raison: "changee" };
      await saveDay(userId, deplacerReservation(existante, date), "utilisateur");
      return { ok: true };
    }
    /* ⚠️ RELIRE AVANT D'ÉCRIRE : la séance visée doit être encore celle
       que la projection place. Une panne n'est pas un accord. */
    const proj = await resolutionDuProgramme(userId, actif, input.aujourdhui, 28);
    if (!proj) return { ok: false, raison: "illisible" };
    if (!occurrenceEncorePrevue(proj.resolution, etapeId, rang)) return { ok: false, raison: "changee" };
    const etape = actif.cycle.find((e) => e.id === etapeId);
    if (!etape) return { ok: false, raison: "changee" };
    const ctx = contexteDe(gen);
    const modele = await modeleDeLEtape({ id: etape.id, nom: etape.nom }, ctx);
    if (!modele) return { ok: false, raison: "illisible" };
    const cibles = (await ciblesOuvertes(userId, actif.programme.id, etape.id)) ?? [];
    const r = await ecrireOccurrence({
      programme_id: actif.programme.id,
      etape_consommee_id: etape.id,
      programme_seance_id: etape.id,
      rang,
      statut: "prevue",
      date,
      type: "Force",
      title: etape.nom,
      difficulty: levelToDifficulty(gen.level ?? null),
      location: gen.ctx ?? null,
      origine: "utilisateur",
      adaptation_id: null,
      consommee_le: null,
      lancement_id: null,
    }, modele.modeleId, appliquerCibles(modele.lignes, cibles, rang));
    if (r.resultat === "ok") { await appliquerRegleDuJour(userId, date, r.id); return { ok: true }; }
    if (r.resultat === "deja") {
      const relue = await reservationDeLOccurrence(userId, actif.programme.id, rang);
      if (!relue) return { ok: false, raison: "changee" };
      await saveDay(userId, deplacerReservation(relue, date), "utilisateur");
      return { ok: true };
    }
    return { ok: false, raison: "echec" };
  } catch (e) {
    console.error("[semaine] changer de jour :", e);
    return { ok: false, raison: "echec" };
  }
}

/**
 * « Pas d'entraînement ce jour-là ». Une réservation posée ce jour-là est
 * retirée (pas marquée) : son occurrence redevient en attente et glisse.
 */
export async function retirerLeJour(userId: string, date: string, reservationId: string | null): Promise<ResultatGeste> {
  try {
    await poserException(userId, date, "pas_de_seance");
    if (reservationId) await retirerIntention(userId, reservationId);
    return { ok: true };
  } catch (e) {
    console.error("[semaine] retirer le jour :", e);
    return { ok: false, raison: "echec" };
  }
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
