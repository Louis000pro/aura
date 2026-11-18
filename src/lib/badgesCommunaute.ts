"use client";

/* ─────────────────────────────────────────────────────────────
   Les pastilles de la Communauté (Louis, 2026-11-18 : « un petit 1,
   un petit 2, et au-delà de 9, 9+ », pour les messages et pour le fil).

   Un seul compte pour toute l'app : la barre du bas et les onglets de
   la Communauté lisent le même magasin, donc ils ne se contredisent
   jamais et ne font pas deux fois les mêmes requêtes.

   • Messages : les non-lus, sans les discussions archivées ni celles en
     sourdine (la même règle que l'onglet Messages).
   • Le fil : ce que tes amis ont posté depuis la dernière fois que tu as
     ouvert le fil (affiches et moments). Le repère vit sur l'appareil ;
     la première fois, il se pose sans rien compter, pour ne pas accueillir
     quelqu'un avec un « 9+ » sur des semaines d'activité.

   ⚠️ Une lecture ratée ne change rien : on ne remet jamais une pastille à
   zéro sur un doute.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase";

export type BadgesCommunaute = { messages: number; fil: number };

let etat: BadgesCommunaute = { messages: 0, fil: 0 };
let pour: string | null = null;
const abonnes = new Set<() => void>();
let enCours: Promise<void> | null = null;

function poser(suite: Partial<BadgesCommunaute>) {
  const prochain = { ...etat, ...suite };
  if (prochain.messages === etat.messages && prochain.fil === etat.fil) return;
  etat = prochain;
  abonnes.forEach((f) => f());
}

/** « 1 » à « 9 », puis « 9+ ». `null` quand il n'y a rien à montrer. */
export function libellePastille(n: number): string | null {
  if (!n || n < 1) return null;
  return n > 9 ? "9+" : String(n);
}

const cleVu = (userId: string) => `vaiiya:fil-vu:${userId}`;

function lireVu(userId: string): string | null {
  try { return localStorage.getItem(cleVu(userId)); } catch { return null; }
}

/** Le fil vient d'être regardé : son compte repart de zéro. */
export function marquerFilVu(userId: string) {
  try { localStorage.setItem(cleVu(userId), new Date().toISOString()); } catch { /* stockage bloqué */ }
  if (pour === userId) poser({ fil: 0 });
}

/** L'onglet Messages connaît déjà le compte exact : il le donne directement. */
export function poserNonLus(userId: string, n: number) {
  if (pour === userId) poser({ messages: n });
}

async function compterMessages(): Promise<number | null> {
  const supabase = createClient();
  let { data, error } = await supabase.rpc("apercus_conversations_v2");
  if (error) {
    const ancien = await supabase.rpc("apercus_conversations");
    data = ancien.data; error = ancien.error;
  }
  if (error || !Array.isArray(data)) return null;
  return (data as { non_lus?: number | string; muted?: boolean; archived_at?: string | null }[])
    .reduce((n, a) => n + (a.muted || a.archived_at ? 0 : Number(a.non_lus ?? 0)), 0);
}

async function compterFil(userId: string): Promise<number | null> {
  const vu = lireVu(userId);
  if (!vu) { marquerFilVu(userId); return 0; }
  const supabase = createClient();
  // Amis = relation dans les deux sens, comme le fil lui-même.
  const [a, b] = await Promise.all([
    supabase.from("followers").select("following_id").eq("follower_id", userId),
    supabase.from("followers").select("follower_id").eq("following_id", userId),
  ]);
  if (a.error || b.error) return null;
  const suivis = new Set((a.data ?? []).map((r) => r.following_id as string));
  const amis = (b.data ?? []).map((r) => r.follower_id as string).filter((id) => suivis.has(id));
  if (!amis.length) return 0;

  const [posts, evts] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true })
      .eq("type", "workout").eq("audience", "friends")
      .in("user_id", amis).gt("created_at", vu),
    supabase.from("evenements_fil").select("id", { count: "exact", head: true })
      .in("user_id", amis).gt("cree_le", vu),
  ]);
  if (posts.error) return null;
  // Sans la migration des événements, la table n'existe pas : on compte les affiches seules.
  return (posts.count ?? 0) + (evts.error ? 0 : evts.count ?? 0);
}

/** Relit les deux comptes (une seule lecture à la fois). */
export function rafraichirBadges(userId: string): Promise<void> {
  if (pour !== userId) { pour = userId; etat = { messages: 0, fil: 0 }; abonnes.forEach((f) => f()); }
  if (enCours) return enCours;
  enCours = (async () => {
    try {
      const [m, f] = await Promise.all([compterMessages(), compterFil(userId)]);
      if (pour !== userId) return;
      poser({ ...(m === null ? {} : { messages: m }), ...(f === null ? {} : { fil: f }) });
    } catch { /* on garde ce qu'on avait */ }
    finally { enCours = null; }
  })();
  return enCours;
}

const RELECTURE_MS = 60_000;

/** Les deux pastilles, tenues à jour pour le compte connecté. */
export function useBadgesCommunaute(userId: string | null | undefined, chemin?: string): BadgesCommunaute {
  const valeur = useSyncExternalStore(
    (f) => { abonnes.add(f); return () => { abonnes.delete(f); }; },
    () => etat,
    () => etat,
  );

  useEffect(() => {
    if (!userId) return;
    void rafraichirBadges(userId);
  }, [userId, chemin]);

  useEffect(() => {
    if (!userId) return;
    const relire = () => { if (document.visibilityState === "visible") void rafraichirBadges(userId); };
    const minuterie = window.setInterval(relire, RELECTURE_MS);
    document.addEventListener("visibilitychange", relire);
    return () => { window.clearInterval(minuterie); document.removeEventListener("visibilitychange", relire); };
  }, [userId]);

  return userId && pour === userId ? valeur : { messages: 0, fil: 0 };
}
