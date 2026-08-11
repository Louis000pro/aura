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
  type: "texte" | "systeme" | "image";
  mediaPath: string | null;
  mediaUrl: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
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
  epinglee: boolean;
  sourde: boolean;
  archivee: boolean;
};

const TAILLE_PAGE_MESSAGES = 50;
const DUREE_CACHE_FIL = 30_000;

type FilCharge = {
  conversation: Conversation | null;
  messages: Message[];
  encoreAvant: boolean;
};

type EntreeCacheFil = {
  data?: FilCharge;
  promise?: Promise<FilCharge>;
  expireA: number;
};

const cacheFils = new Map<string, EntreeCacheFil>();

type ApercuConversation = {
  conversation_id: string;
  last_read_at: string;
  pinned_at?: string | null;
  muted?: boolean;
  archived_at?: string | null;
  non_lus: number;
  dernier_id: string | null;
  dernier_user_id: string | null;
  dernier_contenu: string | null;
  dernier_type: "texte" | "systeme" | "image" | null;
  dernier_media_path?: string | null;
  dernier_media_width?: number | null;
  dernier_media_height?: number | null;
  dernier_created_at: string | null;
};

const COLONNES_MESSAGE =
  "id, user_id, contenu, type, created_at, repond_a, media_path, media_width, media_height";
const COLONNES_MESSAGE_ANCIENNES = "id, user_id, contenu, type, created_at, repond_a";

type MessageBrut = {
  id: string;
  user_id: string | null;
  contenu: string;
  type: "texte" | "systeme" | "image";
  created_at: string;
  repond_a: string | null;
  media_path?: string | null;
  media_width?: number | null;
  media_height?: number | null;
};

function migrationMediasManquante(message: string) {
  return /media_path|media_width|media_height|schema cache|does not exist|column/i.test(message);
}

async function signerPhotos(
  messages: ReadonlyArray<{ media_path?: string | null }>,
): Promise<Map<string, string>> {
  const chemins = [...new Set(messages.map((m) => m.media_path).filter(Boolean) as string[])];
  if (!chemins.length) return new Map();
  const supabase = createClient();
  const signes = await Promise.all(chemins.map(async (chemin) => {
    const { data, error } = await supabase.storage
      .from("conversation-media")
      // Une URL privée déjà signée n'est plus soumise à la RLS. Une heure
      // limite donc fortement la fenêtre résiduelle si quelqu'un quitte le fil.
      .createSignedUrl(chemin, 60 * 60);
    return [chemin, error ? null : data?.signedUrl ?? null] as const;
  }));
  return new Map(signes.filter((entree): entree is readonly [string, string] => Boolean(entree[1])));
}

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

  let { data: apercusRpc, error: apercusError } = await supabase.rpc("apercus_conversations_v2");
  if (apercusError && /apercus_conversations_v2|schema cache|does not exist|404/i.test(apercusError.message)) {
    const ancien = await supabase.rpc("apercus_conversations");
    apercusRpc = ancien.data;
    apercusError = ancien.error;
  }
  let apercus = apercusRpc as ApercuConversation[] | null;

  // Le frontend reste utilisable entre le déploiement Vercel et le collage
  // manuel de la migration. Ce repli est exact mais fait deux petites requêtes
  // par fil ; la RPC reprend automatiquement la main dès qu'elle existe.
  if (apercusError) {
    if (!/apercus_conversations|schema cache|does not exist|404/i.test(apercusError.message)) {
      throw new Error(apercusError.message);
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);
    if (membershipsError) throw new Error(membershipsError.message);

    apercus = await Promise.all((memberships ?? []).map(async (membership) => {
      const [dernierRes, nonLusRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id, user_id, contenu, type, created_at")
          .eq("conversation_id", membership.conversation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", membership.conversation_id)
          .gt("created_at", membership.last_read_at)
          .or(`user_id.is.null,user_id.neq.${userId}`),
      ]);

      const erreur = dernierRes.error ?? nonLusRes.error;
      if (erreur) throw new Error(erreur.message);
      return {
        conversation_id: membership.conversation_id,
        last_read_at: membership.last_read_at,
        non_lus: nonLusRes.count ?? 0,
        dernier_id: dernierRes.data?.id ?? null,
        dernier_user_id: dernierRes.data?.user_id ?? null,
        dernier_contenu: dernierRes.data?.contenu ?? null,
        dernier_type: dernierRes.data?.type ?? null,
        dernier_media_path: null,
        dernier_media_width: null,
        dernier_media_height: null,
        dernier_created_at: dernierRes.data?.created_at ?? null,
      };
    }));
  }

  if (!apercus?.length) return [];
  const ids = apercus.map((a) => a.conversation_id as string);

  const [convsRes, membresRes, defisRes] = await Promise.all([
    supabase.from("conversations").select("id, type, nom, image_url, last_message_at")
      .in("id", ids).order("last_message_at", { ascending: false }),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    // Une conversation peut porter PLUSIEURS runs dans le temps (un gagné,
    // un arrêté, un en cours). Le plus récent d'abord : c'est lui que le
    // `find` plus bas retiendra.
    supabase.from("challenge_runs").select("id, conversation_id, statut, serie, target_days")
      .in("conversation_id", ids).in("statut", ["inscription", "en_cours", "reussi"])
      .order("created_at", { ascending: false }),
  ]);

  const premiereErreur = convsRes.error ?? membresRes.error ?? defisRes.error;
  if (premiereErreur) throw new Error(premiereErreur.message);

  const profilIds = [...new Set((membresRes.data ?? []).map((m) => m.user_id as string))];
  const { data: profils, error: profilsError } = await supabase
    .from("profiles").select("id, pseudo, avatar_url")
    .in("id", profilIds.length ? profilIds : ["00000000-0000-0000-0000-000000000000"]);
  if (profilsError) throw new Error(profilsError.message);

  const runIds = (defisRes.data ?? []).map((d) => d.id as string);
  const actionsRes = runIds.length
    ? await supabase.from("challenge_actions").select("run_id").in("run_id", runIds)
    : { data: [] as { run_id: string }[], error: null };
  if (actionsRes.error) throw new Error(actionsRes.error.message);
  const actions = actionsRes.data;

  const personne = (id: string): Personne => {
    const p = profils?.find((x) => x.id === id);
    return { id, pseudo: p?.pseudo ?? "…", avatar: p?.avatar_url ?? null };
  };

  return (convsRes.data ?? []).map((c) => {
    const convId = c.id as string;
    const apercu = apercus.find((a) => a.conversation_id === convId);
    const run = (defisRes.data ?? []).find((d) => d.conversation_id === convId);

    return {
      id: convId,
      type: c.type as "duo" | "groupe",
      nom: (c.nom as string | null) ?? null,
      image: (c.image_url as string | null) ?? null,
      membres: (membresRes.data ?? [])
        .filter((m) => m.conversation_id === convId)
        .map((m) => personne(m.user_id as string)),
      dernier: apercu?.dernier_id
        ? {
            id: apercu.dernier_id as string,
            userId: (apercu.dernier_user_id as string | null) ?? null,
            contenu: apercu.dernier_contenu as string,
            type: apercu.dernier_type as "texte" | "systeme" | "image",
            mediaPath: apercu.dernier_media_path ?? null,
            mediaUrl: null,
            mediaWidth: apercu.dernier_media_width ?? null,
            mediaHeight: apercu.dernier_media_height ?? null,
            createdAt: apercu.dernier_created_at as string,
            repondA: null,
            reactions: [],
          }
        : null,
      nonLus: Number(apercu?.non_lus ?? 0),
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
      epinglee: Boolean(apercu?.pinned_at),
      sourde: Boolean(apercu?.muted),
      archivee: Boolean(apercu?.archived_at),
    };
  }).sort((a, b) => {
    if (a.epinglee !== b.epinglee) return a.epinglee ? -1 : 1;
    return new Date(b.majLe).getTime() - new Date(a.majLe).getTime();
  });
}

/* ── Une conversation ────────────────────────────────────────── */
async function chargerFilDepuisServeur(convId: string): Promise<FilCharge> {
  const supabase = createClient();

  const [convRes, membresRes, msgsRes, defiRes] = await Promise.all([
    supabase.from("conversations").select("id, type, nom, image_url, last_message_at")
      .eq("id", convId).maybeSingle(),
    supabase.from("conversation_members").select("user_id, last_read_at").eq("conversation_id", convId),
    (async () => {
      const moderne = await supabase.from("messages").select(COLONNES_MESSAGE)
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(TAILLE_PAGE_MESSAGES + 1);
      if (!moderne.error || !migrationMediasManquante(moderne.error.message)) return moderne;
      return supabase.from("messages").select(COLONNES_MESSAGE_ANCIENNES)
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(TAILLE_PAGE_MESSAGES + 1);
    })(),
    // Surtout PAS `.maybeSingle()` : dès qu'un deuxième relais est lancé
    // dans le même fil (après un gagné ou un arrêté), il y a plusieurs
    // lignes et maybeSingle échoue — le défi disparaîtrait du fil.
    supabase.from("challenge_runs").select("id, statut, serie, target_days")
      .eq("conversation_id", convId).in("statut", ["inscription", "en_cours", "reussi"])
      .order("created_at", { ascending: false }).limit(1),
  ]);

  const premiereErreur = convRes.error ?? membresRes.error ?? msgsRes.error ?? defiRes.error;
  if (premiereErreur) throw new Error(premiereErreur.message);
  if (!convRes.data) return { conversation: null, messages: [], encoreAvant: false };

  const messagesDesc = (msgsRes.data ?? []) as MessageBrut[];
  const encoreAvant = messagesDesc.length > TAILLE_PAGE_MESSAGES;
  const messagesBruts = messagesDesc.slice(0, TAILLE_PAGE_MESSAGES).reverse();
  const urlsPhotos = await signerPhotos(messagesBruts);

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
  const msgIds = messagesBruts.map((m) => m.id as string);
  const { data: reacs, error: reacsError } = msgIds.length
    ? await supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", msgIds)
    : { data: [] as { message_id: string; user_id: string; emoji: string }[], error: null };
  if (reacsError) throw new Error(reacsError.message);

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
      epinglee: false,
      sourde: false,
      archivee: false,
    },
    messages: messagesBruts.map((m) => ({
      id: m.id as string,
      userId: (m.user_id as string | null) ?? null,
      contenu: m.contenu as string,
      type: m.type as "texte" | "systeme" | "image",
      mediaPath: (m.media_path as string | null | undefined) ?? null,
      mediaUrl: m.media_path ? urlsPhotos.get(m.media_path as string) ?? null : null,
      mediaWidth: (m.media_width as number | null | undefined) ?? null,
      mediaHeight: (m.media_height as number | null | undefined) ?? null,
      createdAt: m.created_at as string,
      repondA: (m.repond_a as string | null) ?? null,
      reactions: reactionsDe(m.id as string),
    })),
    encoreAvant,
  };
}

/** Données déjà prêtes, utilisées pour peindre immédiatement un fil revisité. */
export function lireFilEnCache(convId: string): FilCharge | null {
  const entree = cacheFils.get(convId);
  if (!entree?.data || entree.expireA <= Date.now()) return null;
  return entree.data;
}

/** Précharge aussi les données Supabase : le prefetch Next seul ne peut pas
 * anticiper un fetch lancé dans un Client Component après son montage. */
export function prechargerFil(convId: string): Promise<FilCharge> {
  const entree = cacheFils.get(convId);
  if (entree?.data && entree.expireA > Date.now()) return Promise.resolve(entree.data);
  if (entree?.promise) return entree.promise;

  const promise = chargerFilDepuisServeur(convId)
    .then((data) => {
      cacheFils.set(convId, { data, expireA: Date.now() + DUREE_CACHE_FIL });
      return data;
    })
    .catch((error) => {
      cacheFils.delete(convId);
      throw error;
    });
  cacheFils.set(convId, { promise, expireA: Date.now() + DUREE_CACHE_FIL });
  return promise;
}

export async function chargerFil(convId: string, forcer = false): Promise<FilCharge> {
  if (!forcer) return prechargerFil(convId);
  cacheFils.delete(convId);
  return prechargerFil(convId);
}

/** Charge la page immédiatement antérieure sans relire tout le fil. */
export async function chargerMessagesAvant(
  convId: string,
  avant: string,
): Promise<{ messages: Message[]; encoreAvant: boolean }> {
  const supabase = createClient();
  let resultat = await supabase
    .from("messages")
    .select(COLONNES_MESSAGE)
    .eq("conversation_id", convId)
    .lt("created_at", avant)
    .order("created_at", { ascending: false })
    .limit(TAILLE_PAGE_MESSAGES + 1);

  if (resultat.error && migrationMediasManquante(resultat.error.message)) {
    const ancien = await supabase
      .from("messages")
      .select(COLONNES_MESSAGE_ANCIENNES)
      .eq("conversation_id", convId)
      .lt("created_at", avant)
      .order("created_at", { ascending: false })
      .limit(TAILLE_PAGE_MESSAGES + 1);
    resultat = ancien as typeof resultat;
  }
  const { data, error } = resultat;
  if (error) throw new Error(error.message);
  const desc = (data ?? []) as MessageBrut[];
  const encoreAvant = desc.length > TAILLE_PAGE_MESSAGES;
  const bruts = desc.slice(0, TAILLE_PAGE_MESSAGES).reverse();
  const ids = bruts.map((m) => m.id as string);
  const urlsPhotos = await signerPhotos(bruts);
  const { data: reacs, error: reacsError } = ids.length
    ? await supabase
        .from("message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", ids)
    : { data: [] as { message_id: string; user_id: string; emoji: string }[], error: null };

  if (reacsError) throw new Error(reacsError.message);

  return {
    messages: bruts.map((m) => {
      const parEmoji = new Map<string, string[]>();
      for (const r of reacs ?? []) {
        if (r.message_id !== m.id) continue;
        const emoji = r.emoji as string;
        parEmoji.set(emoji, [...(parEmoji.get(emoji) ?? []), r.user_id as string]);
      }
      return {
        id: m.id as string,
        userId: (m.user_id as string | null) ?? null,
        contenu: m.contenu as string,
        type: m.type as "texte" | "systeme" | "image",
        mediaPath: (m.media_path as string | null | undefined) ?? null,
        mediaUrl: m.media_path ? urlsPhotos.get(m.media_path as string) ?? null : null,
        mediaWidth: (m.media_width as number | null | undefined) ?? null,
        mediaHeight: (m.media_height as number | null | undefined) ?? null,
        createdAt: m.created_at as string,
        repondA: (m.repond_a as string | null) ?? null,
        reactions: [...parEmoji].map(([emoji, userIds]) => ({ emoji, userIds })),
      };
    }),
    encoreAvant,
  };
}

export async function chargerReactions(messageId: string): Promise<Reaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("message_reactions")
    .select("user_id, emoji")
    .eq("message_id", messageId);
  if (error) throw new Error(error.message);

  const parEmoji = new Map<string, string[]>();
  for (const reaction of data ?? []) {
    const emoji = reaction.emoji as string;
    parEmoji.set(emoji, [...(parEmoji.get(emoji) ?? []), reaction.user_id as string]);
  }
  return [...parEmoji].map(([emoji, userIds]) => ({ emoji, userIds }));
}

/** Charge un seul message après un événement Realtime, sans écraser les
 * pages d'historique que l'utilisateur a déjà remontées. */
export async function chargerMessage(convId: string, messageId: string): Promise<Message | null> {
  const supabase = createClient();
  let resultat = await supabase
    .from("messages")
    .select(COLONNES_MESSAGE)
    .eq("conversation_id", convId)
    .eq("id", messageId)
    .maybeSingle();

  if (resultat.error && migrationMediasManquante(resultat.error.message)) {
    const ancien = await supabase
      .from("messages")
      .select(COLONNES_MESSAGE_ANCIENNES)
      .eq("conversation_id", convId)
      .eq("id", messageId)
      .maybeSingle();
    resultat = ancien as typeof resultat;
  }
  if (resultat.error) throw new Error(resultat.error.message);
  if (!resultat.data) return null;

  const brut = resultat.data as MessageBrut;
  const [urls, reactions] = await Promise.all([
    signerPhotos([brut]),
    chargerReactions(messageId),
  ]);
  return {
    id: brut.id,
    userId: brut.user_id,
    contenu: brut.contenu,
    type: brut.type,
    mediaPath: brut.media_path ?? null,
    mediaUrl: brut.media_path ? urls.get(brut.media_path) ?? null : null,
    mediaWidth: brut.media_width ?? null,
    mediaHeight: brut.media_height ?? null,
    createdAt: brut.created_at,
    repondA: brut.repond_a,
    reactions,
  };
}

function notifierMessage(messageId: string, accessToken?: string) {
  if (!accessToken) return;
  void fetch("/api/notifications/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message_id: messageId }),
  }).catch(() => {});
}

export async function envoyerMessage(
  convId: string,
  userId: string,
  contenu: string,
  repondA?: string | null,
  accessToken?: string,
) {
  const texte = contenu.trim();
  if (!texte) return { ok: false };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: convId, user_id: userId, contenu: texte, type: "texte",
      repond_a: repondA ?? null,
    })
    .select("id")
    .single();

  if (!error && data?.id) notifierMessage(data.id as string, accessToken);

  return { ok: !error, raison: error?.message, messageId: data?.id as string | undefined };
}

async function decoderPhoto(fichier: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  fermer: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        fermer: () => bitmap.close(),
      };
    } catch {
      // Safari sait parfois afficher un format natif que createImageBitmap
      // refuse : on retente alors via un élément image.
    }
  }

  const url = URL.createObjectURL(fichier);
  const image = document.createElement("img");
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("format_invalide"));
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      fermer: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function compresserPhoto(fichier: File) {
  if (!fichier.type.startsWith("image/")) throw new Error("format_invalide");
  if (fichier.size > 15 * 1024 * 1024) throw new Error("photo_trop_lourde");

  const image = await decoderPhoto(fichier);
  if (!image.width || !image.height) {
    image.fermer();
    throw new Error("format_invalide");
  }
  const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const contexte = canvas.getContext("2d");
  if (!contexte) {
    image.fermer();
    throw new Error("compression_impossible");
  }
  try {
    contexte.drawImage(image.source, 0, 0, width, height);
  } finally {
    image.fermer();
  }

  const encoder = (type: "image/webp" | "image/jpeg", qualite: number) => new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("compression_impossible")),
      type,
      qualite,
    );
  });

  let contentType: "image/webp" | "image/jpeg" = "image/webp";
  let blob = await encoder(contentType, 0.8);
  if (blob.type !== contentType) {
    contentType = "image/jpeg";
    blob = await encoder(contentType, 0.82);
  }
  if (blob.size > 5 * 1024 * 1024) blob = await encoder(contentType, 0.62);
  if (blob.size > 5 * 1024 * 1024) throw new Error("photo_trop_lourde");
  return {
    blob,
    width,
    height,
    contentType,
    extension: contentType === "image/webp" ? "webp" : "jpg",
  };
}

export async function envoyerPhoto(
  convId: string,
  userId: string,
  fichier: File,
  repondA?: string | null,
  accessToken?: string,
) {
  try {
    const supabase = createClient();
    const { blob, width, height, contentType, extension } = await compresserPhoto(fichier);
    const identifiant = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    const chemin = `${convId}/${userId}/${Date.now()}-${identifiant}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("conversation-media")
      .upload(chemin, blob, {
        upsert: false,
        contentType,
        cacheControl: "31536000",
      });
    if (uploadError) return { ok: false, raison: uploadError.message };

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        user_id: userId,
        contenu: "Photo",
        type: "image",
        repond_a: repondA ?? null,
        media_path: chemin,
        media_width: width,
        media_height: height,
      })
      .select("id")
      .single();

    if (error) {
      await supabase.storage.from("conversation-media").remove([chemin]);
      return { ok: false, raison: error.message };
    }
    notifierMessage(data.id as string, accessToken);
    return { ok: true, messageId: data.id as string };
  } catch (error) {
    return { ok: false, raison: error instanceof Error ? error.message : "envoi_impossible" };
  }
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
  const { data: message } = await supabase
    .from("messages")
    .select("media_path")
    .eq("id", messageId)
    .maybeSingle();
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (!error && message?.media_path) {
    await supabase.storage.from("conversation-media").remove([message.media_path as string]);
  }
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

export async function reglerConversation(
  convId: string,
  userId: string,
  reglage: "epinglee" | "sourde" | "archivee",
  active: boolean,
) {
  const supabase = createClient();
  const patch =
    reglage === "epinglee" ? { pinned_at: active ? new Date().toISOString() : null }
    : reglage === "sourde" ? { muted: active }
    : { archived_at: active ? new Date().toISOString() : null };
  const { error } = await supabase
    .from("conversation_members")
    .update(patch)
    .eq("conversation_id", convId)
    .eq("user_id", userId);
  return { ok: !error, raison: error?.message };
}

export async function ajouterMembres(convId: string, userIds: string[]) {
  if (!userIds.length) return { ok: true };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ajouter_membres_conversation", {
    p_conv: convId,
    p_membres: userIds,
  });
  if (error) {
    if (/ajouter_membres_conversation|schema cache|does not exist|404/i.test(error.message)) {
      const ancien = await supabase
        .from("conversation_members")
        .insert(userIds.map((id) => ({ conversation_id: convId, user_id: id })));
      return { ok: !ancien.error, raison: ancien.error?.message };
    }
    return { ok: false, raison: error.message };
  }
  return data as { ok: boolean; ajoutes?: number; raison?: string };
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
export type RelationAmi = "aucune" | "envoyee" | "recue" | "ami";
export type ResultatRechercheAmi = Personne & { relation: RelationAmi };

/* La recherche exacte (`rechercherAmiParPseudo`) et son `relationAvec` à deux
   requêtes par personne ont été retirées le 2026-08-11 : plus aucune interface
   ne les appelait depuis le passage à la recherche partielle ci-dessous, qui
   résout les relations EN MASSE en une seule requête. */

/** Recherche PARTIELLE (choix de Louis, 2026-07-25) : les suggestions ne
 * s'affichent qu'après 2 caractères saisis. On retrouve les pseudos qui
 * commencent par la saisie en premier, puis ceux qui la contiennent, sans
 * jamais exposer un annuaire au repos. Les relations sont résolues EN MASSE. */
export async function rechercherAmisParPseudo(
  moi: string,
  saisie: string,
  limite = 8,
): Promise<ResultatRechercheAmi[]> {
  const pseudo = saisie.trim().replace(/^@/, "");
  if (pseudo.length < 2) return [];
  const supabase = createClient();
  const motif = `%${pseudo.replace(/[\\%_]/g, "\\$&")}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url")
    .neq("id", moi)
    .ilike("pseudo", motif)
    .limit(Math.max(limite * 2, 12));
  if (error) throw new Error(error.message);
  const normalise = pseudo.toLocaleLowerCase("fr");
  const profils = ((data ?? []) as { id: string; pseudo: string; avatar_url: string | null }[])
    .sort((a, b) => {
      const aCommence = a.pseudo.toLocaleLowerCase("fr").startsWith(normalise);
      const bCommence = b.pseudo.toLocaleLowerCase("fr").startsWith(normalise);
      if (aCommence !== bCommence) return aCommence ? -1 : 1;
      return a.pseudo.localeCompare(b.pseudo, "fr", { sensitivity: "base" });
    })
    .slice(0, limite);
  if (!profils.length) return [];

  const ids = profils.map((p) => p.id);
  const [sortantes, entrantes] = await Promise.all([
    supabase.from("followers").select("following_id").eq("follower_id", moi).in("following_id", ids),
    supabase.from("followers").select("follower_id").eq("following_id", moi).in("follower_id", ids),
  ]);
  const erreur = sortantes.error ?? entrantes.error;
  if (erreur) throw new Error(erreur.message);
  const suit = new Set((sortantes.data ?? []).map((r) => r.following_id as string));
  const suiviPar = new Set((entrantes.data ?? []).map((r) => r.follower_id as string));

  return profils.map((p) => {
    const relation: RelationAmi =
      suit.has(p.id) && suiviPar.has(p.id) ? "ami"
      : suit.has(p.id) ? "envoyee"
      : suiviPar.has(p.id) ? "recue"
      : "aucune";
    return { id: p.id, pseudo: p.pseudo, avatar: p.avatar_url ?? null, relation };
  });
}

export async function chargerDemandesAmi(moi: string): Promise<Personne[]> {
  const supabase = createClient();
  const [entrantes, sortantes] = await Promise.all([
    supabase.from("followers").select("follower_id").eq("following_id", moi),
    supabase.from("followers").select("following_id").eq("follower_id", moi),
  ]);
  const erreur = entrantes.error ?? sortantes.error;
  if (erreur) throw new Error(erreur.message);

  const dejaReciproques = new Set((sortantes.data ?? []).map((r) => r.following_id as string));
  const ids = (entrantes.data ?? [])
    .map((r) => r.follower_id as string)
    .filter((id) => id !== moi && !dejaReciproques.has(id));
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    pseudo: (p.pseudo as string) ?? "…",
    avatar: (p.avatar_url as string | null) ?? null,
  }));
}

export async function demanderAmi(cible: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("demander_ami", { p_cible: cible });
  if (!error) {
    return data as { ok: boolean; statut?: RelationAmi; conversation_id?: string; raison?: string };
  }
  if (!/demander_ami|schema cache|does not exist|404/i.test(error.message)) {
    return { ok: false, raison: error.message } as const;
  }

  // Repli avant collage de la migration : l'envoi simple est déjà protégé
  // par la RLS existante. L'acceptation/refus attendra la RPC sécurisée.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, raison: "non_connecte" } as const;
  const { error: insertion } = await supabase
    .from("followers")
    .upsert({ follower_id: auth.user.id, following_id: cible }, {
      onConflict: "follower_id,following_id",
      ignoreDuplicates: true,
    });
  return insertion
    ? { ok: false, raison: insertion.message }
    : { ok: true, statut: "envoyee" as const };
}

export async function accepterDemandeAmi(demandeur: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accepter_demande_ami", { p_demandeur: demandeur });
  if (!error) return data as { ok: boolean; conversation_id?: string; raison?: string };
  if (!/accepter_demande_ami|schema cache|does not exist|404/i.test(error.message)) {
    return { ok: false, raison: error.message } as const;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, raison: "non_connecte" } as const;
  const { error: insertion } = await supabase
    .from("followers")
    .upsert({ follower_id: auth.user.id, following_id: demandeur }, {
      onConflict: "follower_id,following_id",
      ignoreDuplicates: true,
    });
  if (insertion) return { ok: false, raison: insertion.message } as const;
  return creerConversation([demandeur]);
}

export async function ignorerDemandeAmi(demandeur: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ignorer_demande_ami", { p_demandeur: demandeur });
  if (error) return { ok: false, raison: error.message } as const;
  return data as { ok: boolean; raison?: string };
}

export async function mesRelations(userId: string): Promise<Personne[]> {
  const supabase = createClient();
  const [suivis, suiveurs] = await Promise.all([
    supabase.from("followers").select("following_id").eq("follower_id", userId),
    supabase.from("followers").select("follower_id").eq("following_id", userId),
  ]);
  const relationsError = suivis.error ?? suiveurs.error;
  if (relationsError) throw new Error(relationsError.message);

  const ids = [...new Set([
    ...(suivis.data ?? []).map((r) => r.following_id as string),
    ...(suiveurs.data ?? []).map((r) => r.follower_id as string),
  ])].filter((id) => id !== userId);

  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("profiles").select("id, pseudo, avatar_url").in("id", ids);
  if (error) throw new Error(error.message);

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
