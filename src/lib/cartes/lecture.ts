/* ─────────────────────────────────────────────────────────────────────
   CE QUE LES CARTES LISENT EN BASE, EN PLUS DU RANG ET DES BADGES.

   Les programmes terminés (jour, test de départ, test final) et les relais
   gagnés (jour, avec qui). La carte existe sans ces détails : gagnée, elle
   vient des badges, publics. Une lecture ratée la laisse simplement sans
   date et sans le nom de l'équipier.

   `parcours` est lisible par son propriétaire, et la RLS de
   `challenge_run_members` ne rend que mes propres relais.

   La vitrine, elle, se lit par `vitrine_profil` (20261106_vitrine_choisie.sql) :
   la colonne est privée, et la fonction est la seule à dire la plus haute
   flamme d'un compte. Tant que ce SQL n'est pas passé, la lecture rend `null`
   et Vaiiya compose la vitrine toute seule.
   ───────────────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase";
import type { DetailProgramme, DetailRelais } from "./catalogue";

export type DetailsCartes = { programmes: DetailProgramme[]; relais: DetailRelais[] };

const jourParis = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
};

async function programmesTermines(userId: string): Promise<DetailProgramme[]> {
  const { data, error } = await createClient()
    .from("parcours")
    .select("programme, fini_le, test_depart, test_fin")
    .eq("user_id", userId)
    .eq("statut", "termine")
    .order("fini_le", { ascending: false });
  if (error || !data) return [];
  const nombre = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const vus = new Set<string>();
  const sortie: DetailProgramme[] = [];
  for (const l of data) {
    const id = l.programme as string;
    // Refaire un programme garde la première carte, comme le badge.
    if (vus.has(id)) continue;
    vus.add(id);
    sortie.push({ id, finiLe: jourParis(l.fini_le as string | null), depart: nombre(l.test_depart), fin: nombre(l.test_fin) });
  }
  return sortie;
}

/** « LOUIS & MARC », puis « LOUIS & 3 AUTRES » : ça tient sur une carte. */
export function duoDe(moi: string, autres: readonly string[]): string {
  const m = moi.trim().toUpperCase();
  if (autres.length === 0) return m;
  if (autres.length === 1) return `${m} & ${autres[0].toUpperCase()}`;
  return `${m} & ${autres.length} AUTRES`;
}

async function relaisGagnes(userId: string, pseudo: string): Promise<DetailRelais[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("challenge_run_members")
    .select("challenge_runs!inner(id, serie, statut, ends_on, fini_le, target_days)")
    .eq("user_id", userId)
    .eq("challenge_runs.statut", "reussi");
  if (error || !data) return [];
  type Gagne = { id: string; serie: string | null; ends_on: string | null; fini_le: string | null; target_days: number | null };
  const runs = data
    .map((l) => {
      const lie = (l as unknown as { challenge_runs?: Gagne | Gagne[] }).challenge_runs;
      return Array.isArray(lie) ? lie[0] : lie;
    })
    .filter((r): r is Gagne => !!r)
    .sort((a, b) => (a.fini_le ?? a.ends_on ?? "").localeCompare(b.fini_le ?? b.ends_on ?? ""));
  if (!runs.length) return [];

  const { data: lignes } = await supabase.from("challenge_run_members").select("run_id, user_id").in("run_id", runs.map((r) => r.id));
  const parRun = new Map<string, string[]>();
  for (const l of lignes ?? []) {
    const id = l.run_id as string;
    parRun.set(id, [...(parRun.get(id) ?? []), l.user_id as string]);
  }
  const autres = [...new Set((lignes ?? []).map((l) => l.user_id as string))].filter((x) => x !== userId);
  const { data: profils } = autres.length
    ? await supabase.from("profiles").select("id, pseudo").in("id", autres)
    : { data: [] as { id: string; pseudo: string | null }[] };
  const nom = new Map((profils ?? []).map((p) => [p.id as string, (p.pseudo as string | null) ?? ""]));

  // Une affiche gagnée deux fois garde la première carte.
  const vus = new Set<string>();
  const sortie: DetailRelais[] = [];
  for (const r of runs) {
    const serie = r.serie ?? "sillage";
    if (vus.has(serie)) continue;
    vus.add(serie);
    const equipe = (parRun.get(r.id) ?? []).filter((x) => x !== userId).map((x) => nom.get(x) ?? "").filter(Boolean);
    sortie.push({
      serie,
      jour: jourParis(r.fini_le) ?? r.ends_on,
      duo: duoDe(pseudo, equipe),
      objectif: r.target_days,
      aDeux: (parRun.get(r.id)?.length ?? 2) <= 2,
    });
  }
  return sortie;
}

/** Ce que la base dit d'une vitrine : le choix (`null` : Vaiiya compose) et
 *  le palier de la plus haute flamme tenue. */
export type VitrineProfil = { choix: string[] | null; flamme: number };

export async function lireVitrine(userId: string): Promise<VitrineProfil | null> {
  const { data, error } = await createClient().rpc("vitrine_profil", { p_user: userId });
  if (error) return null;
  const ligne = (data as { v_cartes: string[] | null; v_flamme: number | null }[] | null)?.[0];
  return ligne ? { choix: ligne.v_cartes, flamme: Number(ligne.v_flamme) || 0 } : null;
}

/** Une liste vide rend la vitrine à Vaiiya : « pas de choix » s'écrit NULL. */
export async function enregistrerVitrine(userId: string, choix: readonly string[]): Promise<boolean> {
  const { error } = await createClient()
    .from("profiles")
    .update({ vitrine_cartes: choix.length ? choix : null })
    .eq("id", userId);
  return !error;
}

export async function chargerDetailsCartes(userId: string, pseudo: string): Promise<DetailsCartes> {
  const [programmes, relais] = await Promise.all([
    programmesTermines(userId).catch(() => []),
    relaisGagnes(userId, pseudo).catch(() => []),
  ]);
  return { programmes, relais };
}
