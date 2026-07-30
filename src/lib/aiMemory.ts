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

/** Protocole d'écriture mémoire, injecté dans le system prompt. */
export const MEMORY_PROTOCOL_PROMPT = `MÉMOIRE LONG TERME (faits durables sur l'utilisateur) :
Tu peux mémoriser des faits DURABLES et IMPORTANTS sur l'utilisateur, utiles pour TOUTES tes prochaines conversations : blessures et contre-indications, régime / restrictions ou allergies alimentaires, planning d'entraînement habituel, objectifs de fond, fortes préférences (matériel, lieu, style de coaching).
- Quand l'utilisateur te demande explicitement de retenir ("retiens que…", "souviens-toi…", "n'oublie pas que…", "note que…") OU quand il révèle spontanément un fait durable et important, ajoute à la TOUTE FIN de ta réponse, sur sa propre ligne (sans markdown, sans guillemets) :
[MEMOIRE]categorie|fait court, à la 3e personne[/MEMOIRE]
  • categorie ∈ sante | nutrition | planning | objectif | preference
  • exemple : [MEMOIRE]sante|Douleur à l'épaule droite, éviter le développé militaire[/MEMOIRE]
  • exemple : [MEMOIRE]nutrition|Végétarien, ne mange pas de poisson[/MEMOIRE]
- Quand l'utilisateur te demande d'oublier ("oublie que…", "supprime ce que tu sais sur…", "ce n'est plus vrai"), ajoute à la fin, sur sa propre ligne :
[OUBLI]mots-clés du fait concerné[/OUBLI]
RÈGLES STRICTES :
- Ne mémorise JAMAIS les banalités ni le temporaire (humeur du jour, "j'ai mangé une pomme", une question ponctuelle), ni une info déjà présente dans son profil ou ses stats.
- Un seul [MEMOIRE] par réponse (le fait le plus important).
- Ces tags sont INVISIBLES pour l'utilisateur : n'y fais JAMAIS référence. N'annonce pas non plus que tu "retiens", "notes" ou "mémorises" quoi que ce soit — réponds simplement, naturellement et chaleureusement, comme si tu t'en souvenais déjà.`;
