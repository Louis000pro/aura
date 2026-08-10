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

/**
 * Extrait les ordres de mémoire émis par le modèle :
 *  [MEMOIRE]categorie|fait[/MEMOIRE]  → à enregistrer
 *  [OUBLI]mots-clés[/OUBLI]           → à supprimer
 */
export function parseMemoryTags(raw: string): {
  saves: { category: MemoryCategory; content: string }[];
  forgets: string[];
} {
  const saves: { category: MemoryCategory; content: string }[] = [];
  const forgets: string[] = [];

  const memRe = /\[MEMOIRE\]\s*([\s\S]*?)\s*\[\/MEMOIRE\]/gi;
  let m: RegExpExecArray | null;
  while ((m = memRe.exec(raw)) !== null) {
    const inner = m[1].trim();
    if (!inner) continue;
    const pipe = inner.indexOf("|");
    let category: MemoryCategory = "autre";
    let content = inner;
    if (pipe >= 0) {
      category = normalizeCategory(inner.slice(0, pipe));
      content = inner.slice(pipe + 1);
    }
    content = content.replace(/^["'«»\s]+|["'«»\s]+$/g, "").trim();
    if (content) saves.push({ category, content });
  }

  const forgetRe = /\[OUBLI\]\s*([\s\S]*?)\s*\[\/OUBLI\]/gi;
  while ((m = forgetRe.exec(raw)) !== null) {
    const inner = m[1].trim();
    if (inner) forgets.push(inner);
  }

  return { saves, forgets };
}

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

/* Il y avait ici un MEMORY_PROTOCOL_PROMPT qui enseignait au coach à écrire
   [MEMOIRE]…[/MEMOIRE] à la fin de ses réponses. Il n'était plus importé nulle
   part : la mémoire s'extrait désormais dans un appel séparé et silencieux
   (ANALYZE_SYSTEM, qui répond en JSON). On le supprime au lieu de le laisser
   dormir, parce qu'un prompt mort qui enseigne une grammaire à crochets est
   précisément ce qui a produit le « [CARTE]…[/CARTE] » du 2026-07-30 : le
   modèle recopie le motif qu'on lui montre. Voir buildMemoryPrompt ci-dessus,
   qui a été réécrit en « - Catégorie : fait » pour la même raison. */
