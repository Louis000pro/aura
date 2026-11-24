/* ════════════════════════════════════════════════════════════════════
   ENTRAÎNEMENT · LOT 3 · L'ORDRE DES SÉANCES, CHANGÉ À LA MAIN

   Réordonner, ajouter ou retirer une séance du cycle crée une NOUVELLE
   VERSION du programme (`activer_programme`, la même porte que « Mon
   programme »). On ne bouge jamais les positions d'un cycle en route :
   l'étape d'un rang se déduit de sa position, donc déplacer une étape
   changerait le sens des occurrences déjà faites ou réservées.

   La nouvelle version commence par la première séance de la liste, qui
   est celle que la vue montrait en tête. Chaque séance gardée emporte ses
   exercices ; une réservation garde son jour et sa séance.

   PUR jusqu'à `enregistrerOrdre`.
   ════════════════════════════════════════════════════════════════════ */

import { BANQUE, type ContexteComposition, type LignePrescription, type Lieu } from "@/lib/banqueEtapes";
import type { ReservationAncienne } from "@/lib/composeurProgramme";
import { contexteDe, type GenInput } from "@/lib/planning";
import { activerProgramme, reservationsAChoisir, type DemandeActivation, type ResultatActivation } from "@/lib/monProgramme";
import { modeleDeLEtape } from "@/lib/prescription";
import { modifierSituation, lireSituations } from "@/lib/situationsBase";
import type { ReglagesSituation, Situation } from "@/lib/situations";
import { createClient } from "@/lib/supabase";
import { lignesDeLOccurrence, type Variete } from "@/lib/variete";
import { lireVariete } from "@/lib/varieteBase";

export const CYCLE_MAX = 6;

/** Une séance de la liste. `id` nul : elle vient d'être ajoutée. */
export type SeanceOrdonnee = { id: string | null; nom: string };

/** Les séances qu'on peut ajouter à ce lieu, sans celles déjà présentes. */
export function seancesAjoutables(lieu: Lieu, presentes: readonly string[]): string[] {
  return Object.keys(BANQUE[lieu]).filter((n) => !presentes.includes(n));
}

export function deplacerDansListe<T>(liste: readonly T[], i: number, de: -1 | 1): T[] {
  const j = i + de;
  if (j < 0 || j >= liste.length) return [...liste];
  const c = [...liste];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

/** Les réservations dont la séance sort du cycle : elles seront retirées. */
export function reservationsPerdues(reservations: readonly ReservationAncienne[], liste: readonly SeanceOrdonnee[]): ReservationAncienne[] {
  const gardees = new Set(liste.map((s) => s.id).filter(Boolean));
  return reservations.filter((r) => !r.date || !r.etapeId || !gardees.has(r.etapeId));
}

/**
 * La demande d'activation. Une réservation datée dont la séance reste
 * devient l'occurrence de cette séance au premier tour (rang = position) ;
 * les autres se retirent.
 */
export function preparerOrdre(input: {
  activationId: string;
  programme: { id: string; nom: string; intention: string | null };
  liste: readonly { id: string | null; nom: string; lignes: LignePrescription[] }[];
  reservations: readonly ReservationAncienne[];
  ctx: ContexteComposition;
  lieu: string;
  variete: Variete;
}): DemandeActivation | null {
  const { liste, reservations, ctx, variete } = input;
  if (liste.length < 1 || liste.length > CYCLE_MAX || liste.some((s) => s.lignes.length === 0)) return null;
  const numerotees = (l: readonly LignePrescription[]) => l.map((x, i) => ({ ...x, emplacement: i }));
  const choix: DemandeActivation["choix"] = {};
  const prises = new Set<number>();
  for (const r of reservations) {
    const approuve = { date: r.date, rang: r.rang ?? null, etape: r.etapeId ?? null };
    const i = r.date && r.etapeId ? liste.findIndex((s) => s.id === r.etapeId) : -1;
    /* Une étape n'a qu'une occurrence en attente : une seconde se retire. */
    if (i < 0 || prises.has(i)) { choix[r.id] = { choix: "retirer", approuve }; continue; }
    prises.add(i);
    const rang = i + 1;
    choix[r.id] = {
      choix: "remplacer", position: rang, rang, titre: liste[i].nom, type: "Force", approuve,
      lignes: lignesDeLOccurrence(numerotees(liste[i].lignes), rang, variete, ctx, liste.length).lignes,
    };
  }
  return {
    activation_id: input.activationId,
    ancien_id: input.programme.id,
    nom: input.programme.nom,
    intention: input.programme.intention ?? "",
    contexte: { lieu: ctx.lieu, orientation: ctx.orientation, niveau: ctx.niveau, version: ctx.version, location: input.lieu },
    etapes: liste.map((s, i) => ({ position: i + 1, nom: s.nom, lignes: numerotees(s.lignes) })),
    choix,
  };
}

/** Les pauses et les choix d'une gêne désignent des étapes : ils suivent
 *  les nouvelles. Une étape partie emporte les siens. */
export function reporterGene(r: Extract<ReglagesSituation, { genre: "gene" }>, ids: ReadonlyMap<string, string>): Extract<ReglagesSituation, { genre: "gene" }> {
  const pauses: Record<string, boolean> = {};
  for (const [id, p] of Object.entries(r.pauses ?? {})) { const n = ids.get(id); if (n) pauses[n] = p; }
  const choix: NonNullable<typeof r.choix> = {};
  for (const [cle, e] of Object.entries(r.choix ?? {})) {
    const i = cle.indexOf("/");
    const n = ids.get(cle.slice(0, i));
    if (n) choix[`${n}${cle.slice(i)}`] = e;
  }
  return { ...r, pauses, choix };
}

export type ResultatOrdre = ResultatActivation | { ok: false; raison: "illisible" };

/** Enregistre la liste : une nouvelle version, puis ce qui désignait les
 *  anciennes étapes (les modèles des autres lieux, les gênes). */
export async function enregistrerOrdre(input: {
  userId: string;
  aujourdhui: string;
  activationId: string;
  programme: { id: string; nom: string; intention: string | null };
  liste: readonly SeanceOrdonnee[];
  reservations: readonly ReservationAncienne[];
  gen: GenInput;
}): Promise<ResultatOrdre> {
  const { userId, programme, liste, gen } = input;
  const ctx = contexteDe(gen);
  let situations: Situation[] | null = null;
  /* Les autres lieux : seulement les modèles ÉCRITS, donc peut-être retouchés. */
  const ailleurs: { i: number; lieu: Lieu; lignes: LignePrescription[] }[] = [];
  let demande: DemandeActivation | null;
  try {
    const [variete, modeles, sit] = await Promise.all([
      lireVariete(userId),
      Promise.all(liste.map((s) => modeleDeLEtape({ id: s.id ?? crypto.randomUUID(), nom: s.nom }, ctx))),
      lireSituations(userId, input.aujourdhui),
    ]);
    if (!variete || !sit || modeles.some((m) => !m)) return { ok: false, raison: "illisible" };
    situations = sit;
    for (const lieu of ["salle", "halteres", "poids"] as const) {
      if (lieu === ctx.lieu) continue;
      const ms = await Promise.all(liste.map((s) => (s.id ? modeleDeLEtape({ id: s.id, nom: s.nom }, { ...ctx, lieu }) : null)));
      ms.forEach((m, i) => { if (m?.modeleId) ailleurs.push({ i, lieu, lignes: m.lignes }); });
    }
    demande = preparerOrdre({
      activationId: input.activationId, programme,
      liste: liste.map((s, i) => ({ ...s, lignes: modeles[i]!.lignes })),
      reservations: input.reservations, ctx, lieu: gen.ctx, variete,
    });
  } catch (e) {
    console.error("[ordre] lecture :", e);
    return { ok: false, raison: "illisible" };
  }
  if (!demande) return { ok: false, raison: "illisible" };
  const r = await activerProgramme(demande);
  if (!r.ok) return r;

  /* Ce qui suit est du report : l'activation est faite, un raté ne la défait pas. */
  try {
    const supabase = createClient();
    const { data } = await supabase.from("programme_seances").select("id, position").eq("programme_id", r.programmeId);
    const parPosition = new Map(((data ?? []) as { id: string; position: number }[]).map((x) => [x.position, x.id]));
    const ids = new Map<string, string>();
    liste.forEach((s, i) => { const n = parPosition.get(i + 1); if (s.id && n) ids.set(s.id, n); });
    for (const a of ailleurs) {
      const etape = parPosition.get(a.i + 1);
      if (!etape) continue;
      await supabase.rpc("ecrire_modele", {
        p: { programme_seance_id: etape, lieu: a.lieu, orientation: ctx.orientation, niveau: ctx.niveau, version: ctx.version, lignes: a.lignes },
      });
    }
    for (const s of situations) {
      if (s.reglages.genre !== "gene" || s.fin < input.aujourdhui) continue;
      await modifierSituation(userId, s.id, { debut: s.debut, fin: s.fin, motif: s.motif, reglages: reporterGene(s.reglages, ids) });
    }
  } catch (e) {
    console.warn("[ordre] report incomplet :", e);
  }
  return r;
}

export { reservationsAChoisir };
