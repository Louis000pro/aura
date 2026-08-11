/* ════════════════════════════════════════════════════════════════════
   aiMemory — mémoire long terme de l'assistant Vaiiya.

   Faits DURABLES sur l'utilisateur (blessures, régime, planning,
   objectifs, préférences) captés en conversation, stockés dans Supabase
   (table ai_memories) et ré-injectés dans le system prompt à chaque
   échange.

   Module PUR (aucune dépendance React/DOM) : importé côté serveur
   (/api/chat) ET côté client (AssistantContext, page Paramètres).
   ════════════════════════════════════════════════════════════════════ */

export const MEMORY_CATEGORIES = [
  "sante", "nutrition", "planning", "objectif", "preference", "autre",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CATEGORY_LABEL: Record<MemoryCategory, string> = {
  sante: "Santé",
  nutrition: "Nutrition",
  planning: "Planning",
  objectif: "Objectif",
  preference: "Préférence",
  autre: "Autre",
};

export const MEMORY_CATEGORY_EMOJI: Record<MemoryCategory, string> = {
  sante: "🩹",
  nutrition: "🥗",
  planning: "📅",
  objectif: "🎯",
  preference: "💜",
  autre: "✦",
};

export interface AiMemory {
  id: string;
  content: string;
  category: MemoryCategory;
  source: "auto" | "user";
  created_at?: string;
}

/** Réduit une chaîne pour comparaison robuste (minuscules, sans accents ni ponctuation). */
export function normalizeForDedupe(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Catégorie sûre : tout ce qui sort de la liste retombe sur "autre". */
export function normalizeCategory(c?: string): MemoryCategory {
  const k = (c ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  return (MEMORY_CATEGORIES as readonly string[]).includes(k) ? (k as MemoryCategory) : "autre";
}

/** Retire les tags mémoire d'un texte avant affichage. */
export function stripMemoryTags(raw: string): string {
  return raw
    .replace(/\[MEMOIRE\][\s\S]*?\[\/MEMOIRE\]/gi, "")
    .replace(/\[OUBLI\][\s\S]*?\[\/OUBLI\]/gi, "");
}

/* Il n'y a plus de LECTURE de tags mémoire : le coach n'écrit plus aucune
   balise (voir « LE COACH N'ÉCRIT PLUS DE BALISES » dans AGENTS.md), et
   l'extraction passe par /api/assistant/analyze qui rend du JSON. Seul
   `stripMemoryTags` reste, en filet, pour les vieux messages déjà en session. */

/** Bloc injecté dans le system prompt : ce que l'IA sait déjà sur l'utilisateur. */
export function buildMemoryPrompt(memories: AiMemory[] | null | undefined): string {
  if (!memories || memories.length === 0) return "";
  const lines = memories
    .slice(0, 40)
    // Deux-points plutôt que des crochets : le coach n'a plus AUCUNE grammaire
    // à balises, et tout ce qui y ressemble dans son prompt lui donne l'idée
    // d'en inventer une (vécu le 2026-07-30 avec un « [CARTE]…[/CARTE] »).
    .map((mm) => `- ${MEMORY_CATEGORY_LABEL[normalizeCategory(mm.category)]} : ${mm.content}`)
    .join("\n");
  return `\n\nCE QUE TU SAIS DÉJÀ SUR CET UTILISATEUR (mémoire long terme — à respecter ABSOLUMENT dans tes conseils) :
${lines}
(Ne re-mémorise pas ces faits. Si l'un d'eux change, mémorise la mise à jour ; l'utilisateur peut les consulter et les supprimer dans Paramètres.)`;
}
