/* ─────────────────────────────────────────────────────────────
   Les événements du fil des potes (Louis, 2026-10-18, maquette
   « Le fil des événements »).

   Le fil raconte ce qui arrive à mes amis : une séance faite, un
   nouveau rang, une nouvelle flamme, un badge gagné. Seulement de
   bonnes nouvelles, jamais un classement, jamais une absence.

   La séance s'écrit en base (trigger sur `workout_sessions`) ; le
   rang, la flamme et le badge s'écrivent ici, au moment où l'app
   les fête déjà (`noterRang`, `noterBadges`, la montée de la série).
   Chaque événement porte une clé unique : le rejouer ne crée rien.

   ⚠️ Tant que `20261018_fil_evenements.sql` n'est pas collée, la
   table n'existe pas : on lit vide et on n'écrit rien, sans casser
   l'écran.
   ───────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase";
import { RANGS } from "@/lib/aura";
import { badgeParSlug } from "@/lib/badges";
import { PALIERS_FLAMME, type IdFlamme } from "@/lib/flammesSerie";
import type { Personne } from "@/lib/messagerie";

export type SorteEvenement = "seance" | "rang" | "flamme" | "badge";

export type EvenementFil = {
  id: string;
  auteur: Personne;
  sorte: SorteEvenement;
  data: Record<string, unknown>;
  creeLe: string;
  /** Qui a dit bravo. */
  bravos: string[];
};

const FENETRE_JOURS = 14;

/** Les événements de moi et de mes amis, des quatorze derniers jours. */
export async function chargerEvenements(moi: Personne, amis: Personne[]): Promise<EvenementFil[]> {
  const supabase = createClient();
  const gens = [moi, ...amis];
  const parId = new Map(gens.map((p) => [p.id, p]));
  const depuis = new Date(Date.now() - FENETRE_JOURS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("evenements_fil")
    .select("id, user_id, sorte, data, cree_le")
    .in("user_id", gens.map((p) => p.id))
    .gte("cree_le", depuis)
    .order("cree_le", { ascending: false })
    .limit(40);
  // Sans la migration, la table n'existe pas : pas d'événements.
  if (error) return [];
  const evts: EvenementFil[] = (data ?? [])
    .filter((e) => parId.has(e.user_id as string))
    .map((e) => ({
      id: e.id as string,
      auteur: parId.get(e.user_id as string)!,
      sorte: e.sorte as SorteEvenement,
      data: (e.data as Record<string, unknown>) ?? {},
      creeLe: e.cree_le as string,
      bravos: [],
    }))
    .filter((e) => phraseEvenement(e, false) !== null);
  if (!evts.length) return evts;

  const { data: bs, error: errB } = await supabase
    .from("bravos_evenement").select("evenement_id, user_id")
    .in("evenement_id", evts.map((e) => e.id));
  if (!errB) {
    const parEvt = new Map(evts.map((e) => [e.id, e]));
    for (const b of bs ?? []) parEvt.get(b.evenement_id as string)?.bravos.push(b.user_id as string);
  }
  return evts;
}

/** Prévient la personne félicitée (Louis, 2026-10-21). Le serveur relit le
 *  bravo, retrouve à qui il revient et n'envoie qu'une fois par ami et par
 *  chose félicitée. Sans attente et sans erreur visible : la notification ne
 *  doit jamais faire échouer le bravo. */
export function notifierBravo(cible: "affiche" | "evenement", id: string): void {
  if (typeof window === "undefined") return;
  void createClient().auth.getSession().then(({ data }) => {
    const jeton = data.session?.access_token;
    if (!jeton) return;
    return fetch("/api/notifications/bravo", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ cible, id }),
    });
  }).catch(() => {});
}

/** Dit (ou retire) bravo. Rend vrai si l'écriture a abouti. */
export async function basculerBravo(evenementId: string, moi: string, mettre: boolean): Promise<boolean> {
  const supabase = createClient();
  const { error } = mettre
    ? await supabase.from("bravos_evenement").insert({ evenement_id: evenementId, user_id: moi })
    : await supabase.from("bravos_evenement").delete().eq("evenement_id", evenementId).eq("user_id", moi);
  const ok = !error || error.code === "23505";
  if (ok && mettre && !error) notifierBravo("evenement", evenementId);
  return ok;
}

/** Publie un de mes événements. Sans effet si la table n'existe pas ou si
 *  la clé existe déjà : un événement ne s'écrit qu'une fois. */
export function publierEvenement(userId: string, sorte: Exclude<SorteEvenement, "seance">, cle: string, data: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  void createClient()
    .from("evenements_fil")
    .insert({ user_id: userId, sorte, cle, data })
    .then(() => {}, () => {});
}

/** La flamme qui vient de naître, si elle se raconte (la Lueur ne se
 *  raconte pas : c'est le premier jour, il n'y a encore rien à fêter). */
export function publierFlamme(userId: string, palier: IdFlamme, jours: number, jour: string): void {
  if (palier === "lueur") return;
  publierEvenement(userId, "flamme", `flamme:${palier}:${jour}`, { palier, jours });
}

/* ── Les phrases ─────────────────────────────────────────────── */

/** Ce que raconte un événement, en morceaux : le texte normal et ce qui est
 *  en gras. Aucun accord de genre (on ne déduit le genre de personne).
 *  `null` = un événement qu'on ne sait pas raconter, donc qu'on ne montre pas. */
export type Morceau = { t: string; gras?: boolean };

export function phraseEvenement(e: Pick<EvenementFil, "sorte" | "data" | "auteur">, cEstMoi: boolean): Morceau[] | null {
  const nom = { t: e.auteur.pseudo, gras: true };
  switch (e.sorte) {
    case "seance": {
      const titre = typeof e.data.titre === "string" ? e.data.titre : "Séance";
      return cEstMoi
        ? [{ t: "Tu as fait ta séance " }, { t: titre, gras: true }]
        : [nom, { t: " a fait sa séance " }, { t: titre, gras: true }];
    }
    case "rang": {
      const rang = RANGS.find((r) => r.id === e.data.rang);
      if (!rang) return null;
      return cEstMoi
        ? [{ t: "Tu atteins le rang " }, { t: rang.nom, gras: true }]
        : [nom, { t: " atteint le rang " }, { t: rang.nom, gras: true }];
    }
    case "flamme": {
      const palier = PALIERS_FLAMME.find((p) => p.id === e.data.palier);
      const jours = Number(e.data.jours);
      if (!palier || !Number.isFinite(jours)) return null;
      return cEstMoi
        ? [{ t: "Ta série tient depuis " }, { t: `${jours} jours`, gras: true }, { t: ` · ${palier.nom}` }]
        : [nom, { t: " tient sa série depuis " }, { t: `${jours} jours`, gras: true }, { t: ` · ${palier.nom}` }];
    }
    case "badge": {
      const badge = typeof e.data.slug === "string" ? badgeParSlug(e.data.slug) : null;
      if (!badge) return null;
      return cEstMoi
        ? [{ t: "Tu as gagné le badge " }, { t: badge.nom, gras: true }]
        : [nom, { t: " a gagné le badge " }, { t: badge.nom, gras: true }];
    }
  }
  return null;
}

/* ── Montrer mes séances à mes potes ─────────────────────────── */

/** Vrai par défaut : la séance faite apparaît dans le fil de mes amis. */
export async function lireMontrerSeances(): Promise<boolean> {
  const { data } = await createClient().auth.getUser();
  return data.user?.user_metadata?.fil_seances !== "non";
}

export async function reglerMontrerSeances(oui: boolean): Promise<boolean> {
  const { error } = await createClient().auth.updateUser({ data: { fil_seances: oui ? "oui" : "non" } });
  return !error;
}
