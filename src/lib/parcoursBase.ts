/* ════════════════════════════════════════════════════════════════════
   LES PROGRAMMES EN BASE (20261101_programmes_parcours.sql)

   La lecture d'un programme (sa ligne et ses séances faites) et les
   quatre gestes qui l'écrivent : commencer, changer ses jours, noter un
   test, arrêter. Chaque geste réussi émet `EVT_JOURNEE`, l'évènement que
   tous les écrans du planning écoutent déjà.

   ⚠️ « JE NE SAIS PAS » N'EST PAS « AUCUN PROGRAMME ». Une lecture ratée
   (ou la migration pas encore collée) rend `undefined` : l'accueil garde
   alors son comportement d'avant, et la rangée « Suivre un programme » ne
   s'affiche pas. `null` veut dire que la base a répondu : aucun programme
   en cours.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { schemaIntentions } from "@/lib/planning";
import { EVT_JOURNEE } from "@/lib/finSeance";
import { nbCreneaux, programmeParId, type DefParcours, type FaitsParcours } from "@/lib/parcours";

/** Le jour de Paris d'un instant, en `YYYY-MM-DD`. */
function jourParis(instant: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

export type ParcoursLu = {
  id: string;
  def: DefParcours;
  statut: "en_cours" | "termine" | "arrete";
  jours: number[];
  debut: string;
  rangDebut: number;
  creneaux: number;
  testDepart: number | null;
  testFin: number | null;
  testDepartLe: string | null;
  testFinLe: string | null;
  /** Les séances faites : leur intention, leur créneau, leur jour. */
  faits: { id: string; rang: number; date: string }[];
};

export type LectureParcours = {
  /** Le programme en cours, ou `null`. */
  enCours: ParcoursLu | null;
  /** Le jour où le dernier programme s'est terminé ou arrêté, s'il y en a
   *  un : le cycle qui reprend ne dit pas « t'attendait » d'un jour passé
   *  pendant le programme. */
  dernierFiniLe: string | null;
};

type Ligne = {
  id: string; programme: string; statut: ParcoursLu["statut"]; jours: number[]; debut: string;
  rang_debut: number; creneaux: number; test_depart: number | string | null; test_fin: number | string | null;
  test_depart_le: string | null; test_fin_le: string | null; fini_le: string | null;
};

const nombre = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));

/** Le programme en cours et ses séances faites. `undefined` si on ne sait pas. */
export async function lireParcours(userId: string): Promise<LectureParcours | undefined> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("parcours")
      .select("id, programme, statut, jours, debut, rang_debut, creneaux, test_depart, test_fin, test_depart_le, test_fin_le, fini_le")
      .eq("user_id", userId)
      .order("cree_le", { ascending: false })
      .limit(4);
    if (error) return undefined;
    const lignes = (data ?? []) as Ligne[];
    const fini = lignes.find((l) => l.statut !== "en_cours" && l.fini_le);
    const dernierFiniLe = fini?.fini_le ? jourParis(fini.fini_le) : null;
    const l = lignes.find((x) => x.statut === "en_cours");
    if (!l) return { enCours: null, dernierFiniLe };
    const def = programmeParId(l.programme);
    /* Un programme que cette version de l'app ne connaît plus : on ne
       l'affiche pas plutôt que d'inventer ses séances. */
    if (!def) return { enCours: null, dernierFiniLe };
    const sc = await schemaIntentions();
    const faits = await supabase.from(sc.table)
      .select("id, date, parcours_rang")
      .eq("user_id", userId)
      .eq("parcours_id", l.id)
      .eq(sc.colStatut, sc.versBase.done);
    if (faits.error) return undefined;
    return {
      dernierFiniLe,
      enCours: {
        id: l.id,
        def,
        statut: l.statut,
        jours: Array.isArray(l.jours) ? l.jours.map(Number) : [],
        debut: l.debut,
        rangDebut: l.rang_debut,
        creneaux: l.creneaux,
        testDepart: nombre(l.test_depart),
        testFin: nombre(l.test_fin),
        testDepartLe: l.test_depart_le,
        testFinLe: l.test_fin_le,
        faits: ((faits.data ?? []) as { id: string; date: string | null; parcours_rang: number | null }[])
          .filter((f) => !!f.date && !!f.parcours_rang)
          .map((f) => ({ id: String(f.id), rang: Number(f.parcours_rang), date: f.date as string })),
      },
    };
  } catch {
    return undefined;
  }
}

/** Ce que le calendrier (`calendrierParcours`) a besoin de savoir. */
export function faitsDuParcours(p: ParcoursLu): FaitsParcours {
  return {
    jours: p.jours,
    debut: p.debut,
    rangDebut: p.rangDebut,
    seances: p.faits.map((f) => ({ rang: f.rang, date: f.date })),
    testDepartLe: p.testDepartLe ? jourParis(p.testDepartLe) : null,
    testFinLe: p.testFinLe ? jourParis(p.testFinLe) : null,
  };
}

const signaler = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE)); };

/** Ce qu'une écriture a donné. `code` porte le refus de la base. */
export type ResultatEcriture<T = true> = { ok: true; valeur: T } | { ok: false; code: string };

function codeDe(message: string | undefined): string {
  const m = /(deja_en_cours|uniq_parcours_en_cours|parcours_clos|parcours_inconnu|seances_manquantes|test_depart_manquant|jours_invalides|debut_invalide|valeur_invalide)/.exec(message ?? "");
  if (!m) return "echec";
  return m[1] === "uniq_parcours_en_cours" ? "deja_en_cours" : m[1];
}

/** Commencer un programme. Le premier créneau tombe sur le premier jour
 *  choisi à partir de `debut`. */
export async function commencerParcours(def: DefParcours, jours: number[], debut: string): Promise<ResultatEcriture<string>> {
  const { data, error } = await createClient().rpc("commencer_parcours", {
    p_programme: def.id, p_jours: [...jours].sort((a, b) => a - b), p_debut: debut, p_creneaux: nbCreneaux(def),
  });
  if (error || !data) return { ok: false, code: codeDe(error?.message) };
  signaler();
  return { ok: true, valeur: String(data) };
}

export async function changerJoursParcours(id: string, jours: number[], debut: string, rangDebut: number): Promise<ResultatEcriture> {
  const { error } = await createClient().rpc("changer_jours_parcours", {
    p_parcours: id, p_jours: [...jours].sort((a, b) => a - b), p_debut: debut, p_rang_debut: rangDebut,
  });
  if (error) return { ok: false, code: codeDe(error.message) };
  signaler();
  return { ok: true, valeur: true };
}

export async function arreterParcours(id: string): Promise<ResultatEcriture> {
  const { error } = await createClient().rpc("arreter_parcours", { p_parcours: id });
  if (error) return { ok: false, code: codeDe(error.message) };
  signaler();
  return { ok: true, valeur: true };
}

/** Noter le test du départ ou le test final. Le final termine le
 *  programme et pose son badge (`termine`). */
export async function noterTestParcours(id: string, moment: "depart" | "fin", valeur: number): Promise<ResultatEcriture<"note" | "deja" | "termine">> {
  const { data, error } = await createClient().rpc("noter_test_parcours", { p_parcours: id, p_moment: moment, p_valeur: valeur });
  if (error) return { ok: false, code: codeDe(error.message) };
  signaler();
  const r = String(data);
  return { ok: true, valeur: r === "termine" ? "termine" : r === "deja" ? "deja" : "note" };
}
