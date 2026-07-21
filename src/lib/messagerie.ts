/* ─────────────────────────────────────────────────────────────
   Messagerie — conversations à deux ou en groupe.

   Règle de l'onglet : on n'y montre JAMAIS l'activité des autres,
   seulement ses propres conversations. Une liste vide dit « tu
   n'as pas encore de discussion », ce qui n'accuse personne — un
   fil vide, lui, dirait que l'app est morte.
   ───────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase";

export type Personne = {
  id: string;
  pseudo: string;
  avatar: string | null;
  /** Jusqu'où cette personne a lu — sert au « Vu », rempli seulement
   *  quand on ouvre une conversation. */
  luA?: string | null;
};

/** Une réaction, regroupée par emoji : « 🔥 2 ». */
export type Reaction = {
  emoji: string;
  userIds: string[];
};

export type Message = {
  id: string;
  userId: string | null;   // null = message système
  contenu: string;
  type: "texte" | "systeme";
  createdAt: string;
  repondA: string | null;
  reactions: Reaction[];
};

/** Le défi porté par une conversation, réduit à ce qu'il faut pour l'afficher. */
export type DefiDuFil = {
  runId: string;
  statut: string;
  serie: string;
  objectif: number;
  faits: number;
};

export type Conversation = {
  id: string;
  type: "duo" | "groupe";
  nom: string | null;
  image: string | null;
  membres: Personne[];
  dernier: Message | null;
  nonLus: number;
  defi: DefiDuFil | null;
  majLe: string;
};

/** Le titre d'une conversation : son nom si c'est un groupe, sinon l'autre. */
export function titreConversation(c: Conversation, moi: string): string {
  if (c.nom) return c.nom;
  const autres = c.membres.filter((m) => m.id !== moi);
  if (autres.length === 0) return "Moi";
  if (autres.length === 1) return autres[0].pseudo;
  return autres.map((m) => m.pseudo).join(", ");
}

export function autresMembres(c: Conversation, moi: string): Personne[] {
  return c.membres.filter((m) => m.id !== moi);
}

/* ── Liste des conversations ─────────────────────────────────── */
export async function chargerConversations(userId: string): Promise<Conversation[]> {
  const supabase = createClient();

  const { data: miennes } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (!miennes?.length) return [];
  const ids = miennes.map((m) => m.conversation_id as string);
  const luA = new Map(miennes.map((m) => [m.conversation_id as string, m.last_read_at as string]));

  const [convsRes, membresRes, msgsRes, defisRes] = await Promise.all([
    supabase.from("conversations").select("id, type, nom, image_url, last_message_at")
      .in("id", ids).order("last_message_at", { ascending: false }),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    // Un seul appel plutôt qu'un par fil : on garde le dernier message
    // de chacun et on compte les non-lus dedans.
    supabase.from("messages").select("id, conversation_id, user_id, contenu, type, created_at")
      .in("conversation_id", ids).order("created_at", { ascending: false }).limit(300),
    // Une conversation peut porter PLUSIEURS runs dans le temps (un gagné,
    // un arrêté, un en cours). Le plus récent d'abord : c'est lui que le
    // `find` plus bas retiendra.
    supabase.from("challenge_runs").select("id, conversation_id, statut, serie, target_days")
      .in("conversation_id", ids).in("statut", ["inscription", "en_cours", "reussi"])
      .order("created_at", { ascending: false }),
  ]);

  const profilIds = [...new Set((membresRes.data ?? []).map((m) => m.user_id as string))];
  const { data: profils } = await supabase
    .from("profiles").select("id, pseudo, avatar_url")
    .in("id", profilIds.length ? profilIds : ["00000000-0000-0000-0000-000000000000"]);

  const runIds = (defisRes.data ?? []).map((d) => d.id as string);
  const { data: actions } = runIds.length
    ? await supabase.from("challenge_actions").select("run_id").in("run_id", runIds)
    : { data: [] as { run_id: string }[] };

  const personne = (id: string): Personne => {
    const p = profils?.find((x) => x.id === id);
    return { id, pseudo: p?.pseudo ?? "…", avatar: p?.avatar_url ?? null };
  };

  return (convsRes.data ?? []).map((c) => {
    const convId = c.id as string;
    const msgs = (msgsRes.data ?? []).filter((m) => m.conversation_id === convId);
    const lu = luA.get(convId) ?? "1970-01-01";
    const run = (defisRes.data ?? []).find((d) => d.conversation_id === convId);

    return {
      id: convId,
      type: c.type as "duo" | "groupe",
      nom: (c.nom as string | null) ?? null,
      image: (c.image_url as string | null) ?? null,
      membres: (membresRes.data ?? [])
        .filter((m) => m.conversation_id === convId)
        .map((m) => personne(m.user_id as string)),
      dernier: msgs[0]
        ? {
            id: msgs[0].id as string,
            userId: (msgs[0].user_id as string | null) ?? null,
            contenu: msgs[0].contenu as string,
            type: msgs[0].type as "texte" | "systeme",
            createdAt: msgs[0].created_at as string,
            repondA: null,
            reactions: [],
          }
        : null,
      nonLus: msgs.filter((m) => m.created_at > lu && m.user_id !== userId).length,
      defi: run
        ? {
            runId: run.id as string,
            statut: run.statut as string,
            serie: (run.serie as string) ?? "sillage",
            objectif: run.target_days as number,
            faits: (actions ?? []).filter((a) => a.run_id === run.id).length,
          }
        : null,
      majLe: c.last_message_at as string,
    };
  });
}

/* ── Une conversation ────────────────────────────────────────── */
export async function chargerFil(convId: string): Promise<{
  conversation: Conversation | null;
  messages: Message[];
}> {
  const supabase = createClient();

  const [convRes, membresRes, msgsRes, defiRes] = await Promise.all([
    supabase.from("conversations").select("id, type, nom, image_url, last_message_at")
      .eq("id", convId).maybeSingle(),
    supabase.from("conversation_members").select("user_id, last_read_at").eq("conversation_id", convId),
    supabase.from("messages").select("id, user_id, contenu, type, created_at, repond_a")
      .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(200),
    // Surtout PAS `.maybeSingle()` : dès qu'un deuxième relais est lancé
    // dans le même fil (après un gagné ou un arrêté), il y a plusieurs
    // lignes et maybeSingle échoue — le défi disparaîtrait du fil.
    supabase.from("challenge_runs").select("id, statut, serie, target_days")
      .eq("conversation_id", convId).in("statut", ["inscription", "en_cours", "reussi"])
      .order("created_at", { ascending: false }).limit(1),
  ]);

  if (!convRes.data) return { conversation: null, messages: [] };

  const ids = (membresRes.data ?? []).map((m) => m.user_id as string);
  const { data: profils } = await supabase
    .from("profiles").select("id, pseudo, avatar_url")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  let defi: DefiDuFil | null = null;
  const run = defiRes.data?.[0];
  if (run) {
    const { data: actions } = await supabase
      .from("challenge_actions").select("run_id").eq("run_id", run.id);
    defi = {
      runId: run.id as string,
      statut: run.statut as string,
      serie: (run.serie as string) ?? "sillage",
      objectif: run.target_days as number,
      faits: (actions ?? []).length,
    };
  }

  /* Les réactions des messages chargés, regroupées par emoji. */
  const msgIds = (msgsRes.data ?? []).map((m) => m.id as string);
  const { data: reacs } = msgIds.length
    ? await supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", msgIds)
    : { data: [] as { message_id: string; user_id: string; emoji: string }[] };

  const reactionsDe = (id: string): Reaction[] => {
    const parEmoji = new Map<string, string[]>();
    for (const r of reacs ?? []) {
      if (r.message_id !== id) continue;
      const emoji = r.emoji as string;
      parEmoji.set(emoji, [...(parEmoji.get(emoji) ?? []), r.user_id as string]);
    }
    return [...parEmoji].map(([emoji, userIds]) => ({ emoji, userIds }));
  };

  return {
    conversation: {
      id: convId,
      type: convRes.data.type as "duo" | "groupe",
      nom: (convRes.data.nom as string | null) ?? null,
      image: (convRes.data.image_url as string | null) ?? null,
      membres: ids.map((id) => {
        const p = profils?.find((x) => x.id === id);
        const m = (membresRes.data ?? []).find((x) => x.user_id === id);
        return {
          id,
          pseudo: p?.pseudo ?? "…",
          avatar: p?.avatar_url ?? null,
          luA: (m?.last_read_at as string | null) ?? null,
        };
      }),
      dernier: null,
      nonLus: 0,
      defi,
      majLe: convRes.data.last_message_at as string,
    },
    messages: (msgsRes.data ?? []).map((m) => ({
      id: m.id as string,
      userId: (m.user_id as string | null) ?? null,
      contenu: m.contenu as string,
      type: m.type as "texte" | "systeme",
      createdAt: m.created_at as string,
      repondA: (m.repond_a as string | null) ?? null,
      reactions: reactionsDe(m.id as string),
    })),
  };
}

export async function envoyerMessage(
  convId: string, userId: string, contenu: string, repondA?: string | null,
) {
  const texte = contenu.trim();
  if (!texte) return { ok: false };
  const supabase = createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: convId, user_id: userId, contenu: texte, type: "texte",
    repond_a: repondA ?? null,
  });
  return { ok: !error, raison: error?.message };
}

/* ── Réagir, répondre, supprimer ──────────────────────────────
   Une seule réaction par personne et par message (c'est la clé
   primaire côté base) : réagir à nouveau remplace, réagir avec
   le même emoji retire. */
export async function reagir(messageId: string, userId: string, emoji: string, actuelle?: string | null) {
  const supabase = createClient();
  if (actuelle === emoji) {
    const { error } = await supabase.from("message_reactions")
      .delete().eq("message_id", messageId).eq("user_id", userId);
    return { ok: !error };
  }
  const { error } = await supabase.from("message_reactions")
    .upsert({ message_id: messageId, user_id: userId, emoji }, { onConflict: "message_id,user_id" });
  return { ok: !error, raison: error?.message };
}

export async function supprimerMessage(messageId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  return { ok: !error, raison: error?.message };
}

/* ── Réglages de la conversation ─────────────────────────────
   Pas de rôle admin : n'importe quel membre renomme et rhabille.
   Ce sont des groupes de gens qui se connaissent. */
export async function majConversation(
  convId: string, champs: { nom?: string | null; image?: string | null },
) {
  const supabase = createClient();
  const patch: Record<string, string | null> = {};
  if (champs.nom !== undefined)   patch.nom = champs.nom?.trim() || null;
  if (champs.image !== undefined) patch.image_url = champs.image;
  if (!Object.keys(patch).length) return { ok: true };

  const { error } = await supabase.from("conversations").update(patch).eq("id", convId);
  return { ok: !error, raison: error?.message };
}

export async function ajouterMembres(convId: string, userIds: string[]) {
  if (!userIds.length) return { ok: true };
  const supabase = createClient();
  const { error } = await supabase.from("conversation_members")
    .insert(userIds.map((id) => ({ conversation_id: convId, user_id: id })));
  return { ok: !error, raison: error?.message };
}

export async function quitterConversation(convId: string, userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("conversation_members")
    .delete().eq("conversation_id", convId).eq("user_id", userId);
  return { ok: !error, raison: error?.message };
}

export async function marquerLu(convId: string, userId: string) {
  const supabase = createClient();
  await supabase.from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", convId).eq("user_id", userId);
}

export async function creerConversation(membres: string[], nom?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("creer_conversation", {
    p_membres: membres, p_nom: nom ?? null,
  });
  if (error) return { ok: false, raison: error.message } as const;
  return data as { ok: boolean; conversation_id?: string; raison?: string };
}

/* ── Qui peut-on inviter dans une conversation ────────────────
   Les gens que je suis et ceux qui me suivent. Pas d'annuaire
   global : on ne parle qu'à des gens qu'on connaît déjà. */
export async function mesRelations(userId: string): Promise<Personne[]> {
  const supabase = createClient();
  const [suivis, suiveurs] = await Promise.all([
    supabase.from("followers").select("following_id").eq("follower_id", userId),
    supabase.from("followers").select("follower_id").eq("following_id", userId),
  ]);

  const ids = [...new Set([
    ...(suivis.data ?? []).map((r) => r.following_id as string),
    ...(suiveurs.data ?? []).map((r) => r.follower_id as string),
  ])].filter((id) => id !== userId);

  if (!ids.length) return [];

  const { data } = await supabase
    .from("profiles").select("id, pseudo, avatar_url").in("id", ids);

  return (data ?? []).map((p) => ({
    id: p.id as string,
    pseudo: (p.pseudo as string) ?? "…",
    avatar: (p.avatar_url as string | null) ?? null,
  }));
}

/* ── Badges débloqués ────────────────────────────────────────── */
export async function chargerBadges(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profile_badges").select("badge_slug").eq("user_id", userId);
  return (data ?? []).map((b) => b.badge_slug as string);
}

/* ── Affichage ───────────────────────────────────────────────── */
export function heureCourte(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const memeJour = d.toDateString() === now.toDateString();
  if (memeJour) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const hier = new Date(now);
  hier.setDate(now.getDate() - 1);
  if (d.toDateString() === hier.toDateString()) return "hier";

  const jours = (now.getTime() - d.getTime()) / 86_400_000;
  if (jours < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/** L'heure sous une bulle : « 21:14 ». */
export function heureExacte(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function memeJour(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** Le séparateur de date : « Aujourd'hui », « Hier », « mardi 15 juillet ». */
export function libelleJour(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";

  const hier = new Date(now);
  hier.setDate(now.getDate() - 1);
  if (d.toDateString() === hier.toDateString()) return "Hier";

  const memeAnnee = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
    ...(memeAnnee ? {} : { year: "numeric" }),
  });
}
