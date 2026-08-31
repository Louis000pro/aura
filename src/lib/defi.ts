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
import { fetchAuth } from "@/lib/fetchAuth";

/* ── Les séries d'affiches ────────────────────────────────────
   Une série = 4 états de la MÊME affiche, du vide au complet.
   Ajouter une série = déposer 4 WebP (01..04) dans
   public/defis/<slug>/ et l'inscrire ici. Rien d'autre à toucher.
   Les affiches sont en WebP : en PNG, douze états pesaient 21 Mo
   dans le repo contre 776 Ko une fois converties. */
export type SerieSlug = "sillage" | "aurore" | "brume";

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
  aurore: {
    slug: "aurore",
    nom: "Aurore",
    promesse: "Le ciel qui prend feu au-dessus du lac gelé",
  },
  brume: {
    slug: "brume",
    nom: "Brume",
    promesse: "Le phare, une fois la brume tombée",
  },
};

export const NB_ETATS = 4;

/** Posé à la fin d'une séance qui a franchi un maillon, lu une seule
 *  fois par l'écran du défi : c'est ce qui déclenche la bascule
 *  d'affiche sous les yeux plutôt qu'un changement déjà fait. */
export const CLE_DEVOILE = "vaiiya:defi-devoile";

export function imageEtat(serie: string, etat: number): string {
  const s = etat.toString().padStart(2, "0");
  return `/defis/${serie}/${s}.webp`;
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
  /** Le fil où le relais se joue. Nul tant que personne n'a rejoint. */
  conversationId: string | null;
  /** Quand le relais s'est fini (gagné, expiré ou arrêté). */
  finiLe: string | null;
};

/** Un relais fini ne s'efface pas tout de suite : deux jours pour le
 *  regarder, puis la conversation redevient une conversation. L'affiche,
 *  elle, est déjà dans la galerie du profil, elle n'est pas perdue. */
export const FENETRE_SOUVENIR_MS = 48 * 60 * 60 * 1000;

/** Le relais est-il encore d'actualité pour l'affichage ? */
export function defiVisible(defi: Defi): boolean {
  if (defi.statut === "inscription" || defi.statut === "en_cours") return true;
  if (!defi.finiLe) return true;
  return Date.now() - new Date(defi.finiLe).getTime() < FENETRE_SOUVENIR_MS;
}

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

/**
 * La semaine est-elle passée ?
 *
 * On le calcule au lieu de l'attendre de la base : `fermer_relais_expires()`
 * ferme les runs le soir et à chaque lancement, mais entre minuit et ce
 * moment-là l'écran afficherait « dernier jour » sur une fenêtre close.
 * L'affichage ne doit dépendre d'aucune écriture.
 */
export function fenetreFinie(defi: Defi): boolean {
  if (defi.statut === "termine") return true;
  if (defi.statut !== "en_cours" || !defi.fin) return false;
  return aujourdhui() > defi.fin;
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
  conversation_id: string | null;
  fini_le: string | null;
};


/**
 * Le défi vivant de l'utilisateur (inscription ou en cours), sinon le
 * dernier fini tant qu'il est dans sa fenêtre de souvenir : c'est lui
 * qui porte l'affiche complète ou l'écran de fin de semaine, et on ne
 * l'escamote pas à la seconde où il se termine.
 *
 * `termine` est dans le filtre depuis le 2026-08-30 : c'est ce statut
 * qui porte « la semaine est finie », et sans lui l'écran ne pouvait
 * dire que « dernier jour », indéfiniment.
 */
export async function chargerDefi(userId: string): Promise<Defi | null> {
  const supabase = createClient();

  const { data: mesRuns } = await supabase
    .from("challenge_run_members")
    .select("run_id")
    .eq("user_id", userId);

  if (!mesRuns?.length) return null;
  const ids = mesRuns.map((r) => r.run_id as string);

  // `fini_le` n'arrive qu'avec 20260830_relais.sql, qui se colle à la
  // main : tant qu'elle n'est pas passée, demander la colonne ferait
  // échouer la requête ENTIÈRE et le relais disparaîtrait de l'app. On
  // retente donc sans elle, et le souvenir se contente de durer.
  const avec = await supabase
    .from("challenge_runs")
    .select("id, statut, serie, target_days, window_days, max_membres, starts_on, ends_on, conversation_id, fini_le")
    .in("id", ids)
    .in("statut", ["inscription", "en_cours", "reussi", "termine"])
    .order("created_at", { ascending: false })
    .limit(1);

  let lignes: unknown[] = avec.data ?? [];

  if (avec.error) {
    const sans = await supabase
      .from("challenge_runs")
      .select("id, statut, serie, target_days, window_days, max_membres, starts_on, ends_on, conversation_id")
      .in("id", ids)
      .in("statut", ["inscription", "en_cours", "reussi"])
      .order("created_at", { ascending: false })
      .limit(1);
    lignes = sans.data ?? [];
  }

  const run = (lignes[0] as RunRow | undefined) ?? null;
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

  const defi: Defi = {
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
    conversationId: run.conversation_id ?? null,
    finiLe: run.fini_le ?? null,
  };

  return defiVisible(defi) ? defi : null;
}

/* ── Le relais, vu de l'accueil ───────────────────────────────
   Volontairement PAS `chargerDefi` : l'accueil est l'écran le plus
   ouvert de l'app, et `chargerDefi` coûte six requêtes. Ici, quelqu'un
   qui n'a jamais joué en paie UNE, et elle ne rend rien.

   On ne montre QUE le relais vivant : une bande sur l'accueil se
   justifie parce qu'il y a quelque chose à faire aujourd'hui. Un
   relais fini n'a rien à y faire, il vit dans la conversation. */
export type RelaisAccueil = {
  runId: string;
  serie: string;
  objectif: number;
  faits: number;
  conversationId: string | null;
  equipier: Membre | null;
  /** À qui de jouer aujourd'hui, avec la vraie règle du relais. */
  tour: TourDeJeu;
};

export async function chargerRelaisAccueil(userId: string): Promise<RelaisAccueil | null> {
  const supabase = createClient();

  // ⚠️ Pas d'alias sur la relation intégrée : le filtre `.eq()` doit porter
  // le MÊME nom que l'embed, et le nom de table est la seule forme dont on
  // soit certain côté PostgREST. Un alias mal accordé rend un 400, donc un
  // relais qui disparaît de l'accueil sans que rien ne le dise.
  const { data, error } = await supabase
    .from("challenge_run_members")
    .select("challenge_runs!inner(id, statut, serie, target_days, window_days, starts_on, ends_on, conversation_id)")
    .eq("user_id", userId)
    .eq("challenge_runs.statut", "en_cours")
    .limit(1);

  if (error) return null;
  // Selon la cardinalité déduite, PostgREST rend un objet ou un tableau.
  const lie = (data?.[0] as unknown as { challenge_runs?: RunRow | RunRow[] } | undefined)?.challenge_runs;
  const run = Array.isArray(lie) ? lie[0] : lie;
  if (!run) return null;

  const [actionsRes, membresRes] = await Promise.all([
    supabase.from("challenge_actions").select("jour, user_id").eq("run_id", run.id),
    supabase.from("challenge_run_members").select("user_id").eq("run_id", run.id),
  ]);

  const actions: Action[] = (actionsRes.data ?? []).map((a) => ({
    jour: a.jour as string,
    userId: a.user_id as string,
  }));

  const autre = (membresRes.data ?? [])
    .map((m) => m.user_id as string)
    .find((id) => id !== userId) ?? null;

  let equipier: Membre | null = null;
  if (autre) {
    const { data: p } = await supabase
      .from("profiles").select("id, pseudo, avatar_url").eq("id", autre).maybeSingle();
    equipier = { userId: autre, pseudo: (p?.pseudo as string) ?? "…", avatar: (p?.avatar_url as string) ?? null };
  }

  const partiel: Defi = {
    runId: run.id,
    statut: "en_cours",
    serie: run.serie ?? "sillage",
    objectif: run.target_days,
    fenetre: run.window_days,
    debut: run.starts_on,
    fin: run.ends_on,
    maxMembres: 2,
    membres: equipier ? [{ userId, pseudo: "", avatar: null }, equipier] : [],
    actions,
    code: null,
    conversationId: run.conversation_id ?? null,
    finiLe: null,
  };

  // La semaine passée ne s'annonce pas sur l'accueil : il n'y a plus rien
  // à y faire, et `fermer_relais_expires()` va la clore de toute façon.
  if (fenetreFinie(partiel)) return null;

  return {
    runId: run.id,
    serie: partiel.serie,
    objectif: partiel.objectif,
    faits: actions.length,
    conversationId: partiel.conversationId,
    equipier,
    tour: tourDeJeu(partiel, userId),
  };
}

/* ── Ce que vous avez fait ensemble ───────────────────────────
   Le relais est la seule chose de l'app qui se fasse à deux, et le
   profil d'un ami n'en disait pas un mot : on y voyait SES affiches,
   son rang, ses séances, jamais les vôtres.

   ⚠️ AUCUNE MIGRATION, ET C'EST LA RLS QUI FAIT LE TRAVAIL. La policy
   de `challenge_run_members` est `est_membre_run(run_id, auth.uid())` :
   demander les lignes de quelqu'un d'autre ne rend donc QUE les runs
   où je suis aussi. Le filtre « ensemble » n'est pas écrit dans la
   requête, il est écrit dans la base, et il ne peut pas fuir.

   ⚠️ ON TRIE SUR `ends_on`, PAS SUR `fini_le`. La colonne `fini_le`
   date du 2026-08-30 ; `ends_on` existe depuis juillet et vaut sur
   tous les runs. Une lecture d'affichage n'a pas à dépendre d'une
   migration collée à la main.

   ⚠️ Pas d'alias sur la relation intégrée : le filtre `.eq()` doit
   porter le MÊME nom que l'embed (même piège que `chargerRelaisAccueil`). */
export type RelaisPartage = {
  /** La dernière affiche dévoilée ensemble. */
  serie: SerieSlug;
  /** Combien vous en avez dévoilées ensemble. Au moins 1. */
  nombre: number;
};

export async function relaisPartage(moi: string, autre: string): Promise<RelaisPartage | null> {
  // Sur son propre profil la question n'a pas de sens, et la requête
  // rendrait tous mes relais gagnés comme s'ils étaient « ensemble ».
  if (!moi || !autre || moi === autre) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("challenge_run_members")
    .select("challenge_runs!inner(id, serie, statut, ends_on)")
    .eq("user_id", autre)
    .eq("challenge_runs.statut", "reussi");

  if (error) return null;

  type Gagne = { id: string; serie: string | null; ends_on: string };
  const runs = (data ?? [])
    .map((ligne) => {
      const lie = (ligne as unknown as { challenge_runs?: Gagne | Gagne[] }).challenge_runs;
      return Array.isArray(lie) ? lie[0] : lie;
    })
    .filter((r): r is Gagne => !!r)
    .sort((a, b) => b.ends_on.localeCompare(a.ends_on));

  if (!runs.length) return null;

  const serie = (runs[0].serie ?? "sillage") as SerieSlug;
  return { serie: serie in SERIES ? serie : "sillage", nombre: runs.length };
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
  const reponse = data as Reponse;
  if (reponse?.ok) prevenirLancement(String(reponse.run_id ?? ""));
  return reponse;
}

/**
 * Lancer un relais AVEC quelqu'un : c'est la porte normale.
 *
 * On ouvre (ou on retrouve) le fil duo, puis on y lance le relais.
 * L'ordre compte : le fil existe avant le relais, donc il n'y a plus
 * de conversation à un seul membre, celle qui s'appelait « Moi ».
 */
export async function lancerRelaisAvec(amiId: string): Promise<Reponse> {
  // Import dynamique exprès : `messagerie.ts` est un gros module, et
  // `defi.ts` est tiré par le tunnel de séance et l'accueil, qui n'ont
  // rien à faire de la messagerie.
  const { creerConversation } = await import("@/lib/messagerie");
  const conv = await creerConversation([amiId]);
  if (!conv.ok || !conv.conversation_id) {
    return { ok: false, raison: conv.raison ?? "conversation_impossible" };
  }
  const r = await lancerRelaisDansConversation(conv.conversation_id);
  return r.ok ? { ...r, conversation_id: conv.conversation_id } : r;
}

/** Prévenir l'équipier qu'un relais vient d'être lancé avec lui.
 *  Sans ça, on peut engager quelqu'un sur sept jours sans qu'il
 *  l'apprenne autrement qu'en ouvrant l'app. Jamais bloquant. */
export function prevenirLancement(runId: string): void {
  if (!runId) return;
  void fetchAuth("/api/notifications/relais", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, evenement: "lance" }),
  }).catch(() => {});
}

/** Arrêter un relais en cours. N'importe lequel des deux peut le faire,
 *  à tout moment : le cas réel c'est l'équipier qui ne répond plus, et
 *  rester bloqué une semaine pour rien serait la vraie punition.
 *  L'affiche reste dans le fil — l'effacer punirait les deux. */
export async function annulerRelais(runId: string): Promise<Reponse> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("annuler_relais", { p_run: runId });
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
    inviterNom: row.inviter_nom ?? "Quelqu’un",
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
export type MaillonFranchi = {
  serie: string;
  objectif: number;
  /** Nombre de jours franchis, celui-ci compris. */
  faits: number;
  reussi: boolean;
  /** Le fil à ouvrir : c'est là que vit l'équipier. */
  conversationId: string | null;
  equipier: Membre | null;
};

export async function validerMaillon(
  userId: string,
  sessionId: string,
): Promise<MaillonFranchi | null> {
  const defi = await chargerDefi(userId);
  if (!defi || defi.statut !== "en_cours" || fenetreFinie(defi)) return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("valider_action_defi", {
    p_run_id: defi.runId,
    p_session_id: sessionId,
  });
  if (error) return null;

  const reponse = data as Reponse;
  if (!reponse?.ok) return null;

  // On prévient l'équipier, sans jamais bloquer la fin de séance.
  void fetchAuth("/api/notifications/relais", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: defi.runId }),
  }).catch(() => {});

  return {
    // `serie` n'est rendue qu'après 20260830_relais.sql : avant, le
    // défi chargé juste au-dessus la porte déjà, donc rien ne casse.
    serie: (reponse.serie as string | undefined) ?? defi.serie,
    objectif: Number(reponse.objectif ?? defi.objectif),
    faits: Number(reponse.jours_faits ?? 0),
    reussi: Boolean(reponse.reussi),
    conversationId: defi.conversationId,
    equipier: defi.membres.find((m) => m.userId !== userId) ?? null,
  };
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
    conversationId: null,
    finiLe: gagne ? new Date().toISOString() : null,
  };
}

/** Le lien à envoyer à son équipier. */
export function lienInvitation(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://vaiiya.com";
  return `${base}/rejoindre/${code}`;
}
