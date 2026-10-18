/* ─────────────────────────────────────────────────────────────
   Le fil des potes (maquette « Progresser avec ses potes »,
   validée par Louis le 2026-10-18).

   Ce que montrent tes AMIS (amitié réciproque), et rien d'autre :
   leurs affiches de séance qu'ils ont choisi de montrer, et qui
   s'est entraîné aujourd'hui. Jamais un inconnu, jamais un
   classement, aucun commentaire public : on réagit d'un geste, et
   on se parle en message privé.

   ⚠️ Tant que `20261018_fil_des_potes.sql` n'est pas collée, la
   table des réactions et la présence n'existent pas : on rend vide
   au lieu de casser l'écran.
   ───────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase";
import type { PerformanceData } from "@/components/PerformanceCard";
import type { Personne } from "@/lib/messagerie";

export type SorteReaction = "feu" | "costaud" | "pareil";
export const SORTES: { id: SorteReaction; libelle: string }[] = [
  { id: "feu", libelle: "Feu" },
  { id: "costaud", libelle: "Costaud" },
  { id: "pareil", libelle: "Je fais pareil" },
];

export type AfficheDuFil = {
  id: string;
  auteur: Personne;
  creeLe: string;
  data: PerformanceData;
  /** Par sorte : qui a réagi. */
  reactions: Record<SorteReaction, string[]>;
};

export type PresenceAmi = Personne & { seanceAujourdhui: boolean };

const FENETRE_JOURS = 14;

/** Mes amis : ceux que je suis ET qui me suivent. */
export async function mesAmis(moi: string): Promise<Personne[]> {
  const supabase = createClient();
  const [suivis, suiveurs] = await Promise.all([
    supabase.from("followers").select("following_id").eq("follower_id", moi),
    supabase.from("followers").select("follower_id").eq("following_id", moi),
  ]);
  if (suivis.error || suiveurs.error) throw new Error((suivis.error ?? suiveurs.error)!.message);
  const meSuivent = new Set((suiveurs.data ?? []).map((r) => r.follower_id as string));
  const ids = (suivis.data ?? []).map((r) => r.following_id as string).filter((id) => id !== moi && meSuivent.has(id));
  if (!ids.length) return [];
  const { data, error } = await supabase.from("profiles").select("id, pseudo, avatar_url").in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((p) => ({ id: p.id as string, pseudo: (p.pseudo as string) ?? "…", avatar: (p.avatar_url as string | null) ?? null }))
    .sort((a, b) => a.pseudo.localeCompare(b.pseudo, "fr"));
}

function reactionsVides(): Record<SorteReaction, string[]> {
  return { feu: [], costaud: [], pareil: [] };
}

/** Les affiches que mes amis montrent, des quatorze derniers jours. */
export async function chargerFilPotes(amis: Personne[]): Promise<AfficheDuFil[]> {
  if (!amis.length) return [];
  const supabase = createClient();
  const depuis = new Date(Date.now() - FENETRE_JOURS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, performance_data, created_at")
    .eq("type", "workout").eq("audience", "friends")
    .in("user_id", amis.map((a) => a.id))
    .gte("created_at", depuis)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  const parId = new Map(amis.map((a) => [a.id, a]));
  const affiches: AfficheDuFil[] = (data ?? [])
    .filter((p) => p.performance_data && parId.has(p.user_id as string))
    .map((p) => ({
      id: p.id as string,
      auteur: parId.get(p.user_id as string)!,
      creeLe: p.created_at as string,
      data: p.performance_data as PerformanceData,
      reactions: reactionsVides(),
    }));
  if (!affiches.length) return affiches;

  const { data: rs, error: errR } = await supabase
    .from("reactions_affiche").select("post_id, user_id, sorte")
    .in("post_id", affiches.map((a) => a.id));
  // Sans la migration, la table n'existe pas : le fil s'affiche sans réactions.
  if (!errR) {
    const parPost = new Map(affiches.map((a) => [a.id, a]));
    for (const r of rs ?? []) {
      const a = parPost.get(r.post_id as string);
      const s = r.sorte as SorteReaction;
      if (a && a.reactions[s]) a.reactions[s].push(r.user_id as string);
    }
  }
  return affiches;
}

/** Ajoute ou retire ma réaction. Rend vrai si l'écriture a abouti. */
export async function basculerReaction(postId: string, moi: string, sorte: SorteReaction, mettre: boolean): Promise<boolean> {
  const supabase = createClient();
  const { error } = mettre
    ? await supabase.from("reactions_affiche").insert({ post_id: postId, user_id: moi, sorte })
    : await supabase.from("reactions_affiche").delete().eq("post_id", postId).eq("user_id", moi).eq("sorte", sorte);
  return !error || error.code === "23505";
}

/** Moi et mes amis, et qui s'est entraîné aujourd'hui. Vide sans la migration. */
export async function presenceAmis(): Promise<Map<string, boolean>> {
  const { data, error } = await createClient().rpc("presence_amis");
  const m = new Map<string, boolean>();
  if (error || !Array.isArray(data)) return m;
  for (const r of data as { user_id: string; seance_aujourdhui: boolean }[]) m.set(r.user_id, !!r.seance_aujourdhui);
  return m;
}

/* ── Mon affiche dans le fil ─────────────────────────────────── */

/** L'affiche de cette séance est-elle montrée à mes amis ? `null` = pas d'affiche. */
export async function afficheDansFil(moi: string, seanceId: string): Promise<boolean | null> {
  const { data, error } = await createClient()
    .from("posts").select("audience")
    .eq("user_id", moi).eq("type", "workout").eq("performance_data->>seance_id", seanceId)
    .maybeSingle();
  if (error || !data) return null;
  return data.audience === "friends";
}

/** Montre (ou retire) l'affiche de cette séance du fil de mes amis. */
export async function montrerDansFil(moi: string, seanceId: string, oui: boolean): Promise<boolean> {
  const { data, error } = await createClient()
    .from("posts").update({ audience: oui ? "friends" : "private" })
    .eq("user_id", moi).eq("type", "workout").eq("performance_data->>seance_id", seanceId)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

/* ── Répondre en privé ───────────────────────────────────────── */

const CLE_BROUILLON = (conv: string) => `vaiiya:brouillon:${conv}`;

/** Pose un début de message pour la conversation qu'on va ouvrir. */
export function poserBrouillon(convId: string, texte: string) {
  try { sessionStorage.setItem(CLE_BROUILLON(convId), texte); } catch { /* stockage bloqué */ }
}

/** Lit le brouillon posé pour cette conversation (sans l'effacer : le
 *  mode strict de React appelle l'initialiseur deux fois). */
export function lireBrouillon(convId: string): string {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem(CLE_BROUILLON(convId)) ?? ""; } catch { return ""; }
}

/** Efface le brouillon une fois repris dans la saisie. */
export function effacerBrouillon(convId: string) {
  try { sessionStorage.removeItem(CLE_BROUILLON(convId)); } catch { /* stockage bloqué */ }
}

/** « il y a 2 h », « hier », « lundi » : quand l'affiche est arrivée. */
export function quandAffiche(iso: string): string {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "à l’instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 12) return `il y a ${h} h`;
  const jour = (x: Date) => x.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const hier = new Date(Date.now() - 86_400_000);
  if (jour(d) === jour(new Date())) return "aujourd’hui";
  if (jour(d) === jour(hier)) return "hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });
}
