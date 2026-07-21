/* ─────────────────────────────────────────────────────────────
   Défi duo « relais » — règles et accès aux données.

   Toute la logique vit ici, sans interface : les écrans ne sont
   que des habillages (on doit pouvoir redessiner sans toucher
   à la machine). Les règles qui comptent vraiment (jour déjà
   franchi, deux jours de suite, durée minimale) sont appliquées
   côté serveur par valider_action_defi() — ce fichier ne fait
   que les refléter pour l'affichage.
   ───────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase";

/* ── Les séries d'affiches ────────────────────────────────────
   Une série = 4 états de la MÊME affiche, du vide au complet.
   Ajouter une série = déposer 4 images dans public/defis/<slug>/
   et l'inscrire ici. Rien d'autre à toucher. */
export type SerieSlug = "sillage";

export type Serie = {
  slug: SerieSlug;
  nom: string;
  /** Ce que l'affiche montre une fois complète — sert à donner envie avant. */
  promesse: string;
};

export const SERIES: Record<SerieSlug, Serie> = {
  sillage: {
    slug: "sillage",
    nom: "Sillage",
    promesse: "Une route de lumière dans la nuit",
  },
};

export const NB_ETATS = 4;

/** Posé à la fin d'une séance qui a franchi un maillon, lu une seule
 *  fois par l'écran du défi : c'est ce qui déclenche la bascule
 *  d'affiche sous les yeux plutôt qu'un changement déjà fait. */
export const CLE_DEVOILE = "vaiiya:defi-devoile";

export function imageEtat(serie: string, etat: number): string {
  const s = etat.toString().padStart(2, "0");
  return `/defis/${serie}/${s}.png`;
}

/**
 * Quel état de l'affiche montrer pour un nombre de jours franchis.
 *
 * L'affiche a toujours 4 états, quel que soit l'objectif du défi :
 * on projette la progression dessus. Zéro jour = état 1 (le vide),
 * objectif atteint = état 4 (l'affiche complète).
 *
 * Avec l'objectif actuel de 4 jours, ça donne 1 → 2 → 3 → 3 → 4 :
 * le 3ᵉ jour ne change pas l'image. C'est assumé — ce jour-là, c'est
 * la ligne d'état et la chaîne des jours qui portent la progression.
 */
export function etatPoster(joursFaits: number, objectif: number): number {
  if (joursFaits <= 0) return 1;
  if (joursFaits >= objectif) return NB_ETATS;
  return Math.min(NB_ETATS - 1, 1 + Math.round(((NB_ETATS - 1) * joursFaits) / objectif));
}

/* ── Types ───────────────────────────────────────────────────── */
export type StatutRun = "inscription" | "en_cours" | "reussi" | "termine";

export type Membre = {
  userId: string;
  pseudo: string;
  avatar: string | null;
};

export type Action = {
  jour: string;      // YYYY-MM-DD
  userId: string;
};

export type Defi = {
  runId: string;
  statut: StatutRun;
  serie: string;
  objectif: number;
  fenetre: number;
  debut: string | null;
  fin: string | null;
  maxMembres: number;
  membres: Membre[];
  actions: Action[];
  /** Le code d'invitation, seulement si c'est moi qui ai lancé le défi. */
  code: string | null;
};

/* ── Dates ───────────────────────────────────────────────────── */
/** Date du jour au format YYYY-MM-DD, en heure locale (pas UTC). */
export function aujourdhui(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function decaler(jour: string, jours: number): string {
  const [y, m, d] = jour.split("-").map(Number);
  const date = new Date(y, m - 1, d + jours);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Les jours de la fenêtre, du premier au dernier. */
export function joursDeLaFenetre(defi: Defi): string[] {
  if (!defi.debut) return [];
  return Array.from({ length: defi.fenetre }, (_, i) => decaler(defi.debut!, i));
}

/* ── Lecture de l'état du défi ───────────────────────────────── */
export type TourDeJeu =
  | { quoi: "pas_lance" }
  | { quoi: "deja_franchi"; parMoi: boolean }
  | { quoi: "pas_mon_tour"; equipier: Membre | null }
  | { quoi: "a_moi" }
  | { quoi: "fini" };

/**
 * À qui de jouer aujourd'hui.
 * Reflète la règle serveur « jamais deux jours de suite par la même
 * personne » : si j'ai franchi hier, ce n'est pas à moi.
 */
export function tourDeJeu(defi: Defi, moi: string): TourDeJeu {
  if (defi.statut === "reussi" || defi.statut === "termine") return { quoi: "fini" };
  if (defi.statut !== "en_cours") return { quoi: "pas_lance" };

  const jour = aujourdhui();
  const dujour = defi.actions.find((a) => a.jour === jour);
  if (dujour) return { quoi: "deja_franchi", parMoi: dujour.userId === moi };

  const hier = defi.actions.find((a) => a.jour === decaler(jour, -1));
  if (hier && hier.userId === moi) {
    return { quoi: "pas_mon_tour", equipier: defi.membres.find((m) => m.userId !== moi) ?? null };
  }
  return { quoi: "a_moi" };
}

/** Jours restants dans la fenêtre, aujourd'hui compris. */
export function joursRestants(defi: Defi): number {
  if (!defi.fin) return defi.fenetre;
  const jour = aujourdhui();
  let n = 0;
  for (let i = 0; i < defi.fenetre + 1; i++) {
    const j = decaler(jour, i);
    if (j > defi.fin) break;
    n++;
  }
  return n;
}

/** Le défi est-il encore mathématiquement gagnable ? */
export function encoreJouable(defi: Defi): boolean {
  const manquants = defi.objectif - defi.actions.length;
  return manquants <= joursRestants(defi);
}

/* ── Accès aux données ───────────────────────────────────────── */

type RunRow = {
  id: string;
  statut: StatutRun;
  serie: string | null;
  target_days: number;
  window_days: number;
  max_membres: number | null;
  starts_on: string | null;
  ends_on: string | null;
};

/**
 * Le défi vivant de l'utilisateur (inscription ou en cours), sinon
 * le dernier réussi tant qu'il est dans sa fenêtre — c'est lui qui
 * porte l'affiche complète, on ne l'escamote pas aussitôt gagné.
 */
export async function chargerDefi(userId: string): Promise<Defi | null> {
  const supabase = createClient();

  const { data: mesRuns } = await supabase
    .from("challenge_run_members")
    .select("run_id")
    .eq("user_id", userId);

  if (!mesRuns?.length) return null;
  const ids = mesRuns.map((r) => r.run_id as string);

  const { data: runs } = await supabase
    .from("challenge_runs")
    .select("id, statut, serie, target_days, window_days, max_membres, starts_on, ends_on")
    .in("id", ids)
    .in("statut", ["inscription", "en_cours", "reussi"])
    .order("created_at", { ascending: false })
    .limit(1);

  const run = (runs?.[0] as RunRow | undefined) ?? null;
  if (!run) return null;

  const [membresRes, actionsRes, inviteRes] = await Promise.all([
    supabase.from("challenge_run_members").select("user_id").eq("run_id", run.id),
    supabase.from("challenge_actions").select("jour, user_id").eq("run_id", run.id).order("jour"),
    supabase.from("invites").select("code").eq("run_id", run.id).maybeSingle(),
  ]);

  const membreIds = (membresRes.data ?? []).map((m) => m.user_id as string);
  const { data: profils } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url")
    .in("id", membreIds.length ? membreIds : ["00000000-0000-0000-0000-000000000000"]);

  const membres: Membre[] = membreIds.map((id) => {
    const p = profils?.find((x) => x.id === id);
    return { userId: id, pseudo: p?.pseudo ?? "…", avatar: p?.avatar_url ?? null };
  });

  return {
    runId: run.id,
    statut: run.statut,
    serie: run.serie ?? "sillage",
    objectif: run.target_days,
    fenetre: run.window_days,
    debut: run.starts_on,
    fin: run.ends_on,
    maxMembres: run.max_membres ?? 2,
    membres,
    actions: (actionsRes.data ?? []).map((a) => ({
      jour: a.jour as string,
      userId: a.user_id as string,
    })),
    code: (inviteRes.data?.code as string | undefined) ?? null,
  };
}

type Reponse = { ok: boolean; raison?: string; [k: string]: unknown };

export async function creerDefi(): Promise<Reponse> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("creer_defi_duo");
  if (error) return { ok: false, raison: error.message };
  return data as Reponse;
}

/** Ouvrir un relais dans une conversation qui existe déjà.
 *  Les deux sont là : pas d'invitation, le défi démarre aussitôt.
 *  Le serveur refuse si le fil n'est pas un duo (`pas_un_duo`). */
export async function lancerRelaisDansConversation(convId: string): Promise<Reponse> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lancer_relais", { p_conv: convId });
  if (error) return { ok: false, raison: error.message };
  return data as Reponse;
}

export async function rejoindreDefi(code: string): Promise<Reponse> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rejoindre_defi", { p_code: code });
  if (error) return { ok: false, raison: error.message };
  return data as Reponse;
}

export type Apercu = {
  valide: boolean;
  inviterNom: string;
  inviterAvatar: string | null;
  complet: boolean;
};

/** Lisible sans être connecté : c'est la page d'atterrissage publique. */
export async function apercuInvitation(code: string): Promise<Apercu | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("apercu_invitation", { p_code: code });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    valide: Boolean(row.valide),
    inviterNom: row.inviter_nom ?? "Quelqu'un",
    inviterAvatar: row.inviter_avatar ?? null,
    complet: Boolean(row.complet),
  };
}

/**
 * Enregistre le maillon du jour après une séance terminée.
 * Appelée depuis WorkoutGuideModal. Silencieuse : si l'utilisateur
 * n'a pas de défi, ou si le jour est déjà franchi, il ne se passe
 * rien et surtout on ne lui reproche rien.
 */
export async function validerMaillon(
  userId: string,
  sessionId: string,
): Promise<Reponse | null> {
  const defi = await chargerDefi(userId);
  if (!defi || defi.statut !== "en_cours") return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("valider_action_defi", {
    p_run_id: defi.runId,
    p_session_id: sessionId,
  });
  if (error) return { ok: false, raison: error.message };

  const reponse = data as Reponse;

  // On prévient l'équipier — sans jamais bloquer la fin de séance.
  if (reponse?.ok) {
    void fetch("/api/notifications/relais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: defi.runId, actor_id: userId }),
    }).catch(() => {});
  }

  return reponse;
}

/* ── Aperçu ──────────────────────────────────────────────────
   Fabrique un défi factice pour REGARDER un écran sans avoir à
   jouer la semaine. Rien n'est écrit en base, aucun badge n'est
   accordé : c'est du décor, uniquement déclenché par l'URL
   (/defi?apercu=1..4 ou ?apercu=gagne). Sans le paramètre, ce
   code ne s'exécute jamais. */
export function defiFactice(quoi: string, moi: string, monPseudo: string): Defi | null {
  const gagne = quoi === "gagne";
  const jours = gagne ? 4 : Number(quoi);
  if (!gagne && (!Number.isFinite(jours) || jours < 0 || jours > 4)) return null;

  const debut = decaler(aujourdhui(), -3);
  const equipier = "00000000-0000-0000-0000-0000000000e1";

  // Des maillons alternés, comme la règle l'impose vraiment.
  const actions: Action[] = Array.from({ length: jours }, (_, i) => ({
    jour: decaler(debut, i),
    userId: i % 2 === 0 ? moi : equipier,
  }));

  return {
    runId: "apercu",
    statut: gagne ? "reussi" : "en_cours",
    serie: "sillage",
    objectif: 4,
    fenetre: 7,
    debut,
    fin: decaler(debut, 6),
    maxMembres: 2,
    membres: [
      { userId: moi, pseudo: monPseudo, avatar: null },
      { userId: equipier, pseudo: "Marc", avatar: null },
    ],
    actions,
    code: "APERCU00",
  };
}

/** Le lien à envoyer à son équipier. */
export function lienInvitation(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://vaiiya.com";
  return `${base}/rejoindre/${code}`;
}
