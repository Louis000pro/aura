import OpenAI from "openai";

/* ════════════════════════════════════════════════════════════════════
   llm — le client LLM unique de l'app, et le SEUL fichier qui sait quel
   fournisseur répond.

   Historiquement ce fichier ne parlait qu'à Mistral. Le 2026-09-05 son
   palier gratuit a été désactivé (429 en série, confirmé sur leur page
   de statut) et le développement s'est arrêté sur un fournisseur unique.
   D'où cette couche : le fournisseur se choisit par variable
   d'environnement, et TOUT le reste de l'app l'ignore.

     AI_PROVIDER=groq      (défaut : le principal de la bêta)
     AI_PROVIDER=mistral   (retour en arrière, sans toucher une ligne)

   Les deux parlent le dialecte OpenAI sur `chat/completions`, donc on
   garde le SDK OpenAI et la même API qu'avant (streaming, tools,
   response_format json_object).

   ⚠️ CE QUI N'EST PAS INTERCHANGEABLE, ET QUI VIT DONC ICI : les modèles
   `gpt-oss` de Groq RAISONNENT avant de répondre, et leurs tokens de
   raisonnement se comptent dans le budget de complétion. Un budget calé
   sur Mistral (200 tokens pour l'aiguilleur, 280 pour la mémoire) serait
   mangé en entier par le raisonnement : l'appel rendrait un contenu vide,
   donc aucune carte et aucun souvenir, SANS erreur. C'est `optionsIA` qui
   répare ça, pas les appelants — sinon la connaissance du fournisseur se
   disperserait dans les sept endroits qui appellent le modèle.

   Clés : GROQ_API_KEY (https://console.groq.com/keys) et MISTRAL_API_KEY
   (https://console.mistral.ai/api-keys). À configurer dans Vercel
   (Preview + Production) ET en local (.env.local).

   NB : la transcription vocale (Whisper) et le scan nutrition passent
   directement par `groq-sdk` et ne dépendent pas de ce fichier.
   ════════════════════════════════════════════════════════════════════ */

export type Fournisseur = "groq" | "mistral";

/**
 * Les deux rôles de l'app, et c'est volontairement tout.
 * `coach` PARLE (conversation, séances, recettes, menus) ; `outil` DÉCIDE
 * (aiguilleur, extraction de mémoire) et ne s'adresse jamais à personne.
 * La séparation existe déjà dans le produit depuis `assistantRouter` : on
 * lui donne juste le droit de choisir un modèle plus petit.
 */
export type RoleIA = "coach" | "outil";

const CLES: Record<Fournisseur, string | undefined> = {
  groq: process.env.GROQ_API_KEY,
  mistral: process.env.MISTRAL_API_KEY,
};

const CONFIGS: Record<
  Fournisseur,
  { baseURL: string; modeles: Record<RoleIA, string>; raisonne: boolean }
> = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    modeles: { coach: "openai/gpt-oss-120b", outil: "openai/gpt-oss-20b" },
    raisonne: true,
  },
  mistral: {
    baseURL: "https://api.mistral.ai/v1",
    // Un seul modèle chez Mistral : le rôle ne change rien, et c'est très
    // bien ainsi. Le comportement d'avant cette vague est byte-identique.
    modeles: { coach: "mistral-small-latest", outil: "mistral-small-latest" },
    raisonne: false,
  },
};

/**
 * ⚠️ Le repli n'est PAS de la magie, c'est un garde-fou de déploiement :
 * si la clé du fournisseur demandé manque mais que l'autre est là, on
 * bascule EN LE DISANT dans les logs. Une variable oubliée sur Vercel ne
 * doit pas éteindre le coach, mais elle ne doit pas non plus passer
 * inaperçue.
 */
function choisirFournisseur(): Fournisseur {
  const voulu: Fournisseur =
    (process.env.AI_PROVIDER ?? "groq").trim().toLowerCase() === "mistral" ? "mistral" : "groq";
  if (CLES[voulu]) return voulu;

  const autre: Fournisseur = voulu === "groq" ? "mistral" : "groq";
  if (CLES[autre]) {
    console.warn(`[llm] clé ${voulu} absente, repli sur ${autre}. Vérifie AI_PROVIDER et les clés.`);
    return autre;
  }
  return voulu; // aucune clé : `hasLLMKey()` rendra false et l'app le dira.
}

export const FOURNISSEUR = choisirFournisseur();

const CFG = CONFIGS[FOURNISSEUR];

/** Le nom lisible du fournisseur, pour les messages d'erreur honnêtes. */
export const NOM_FOURNISSEUR = FOURNISSEUR === "groq" ? "Groq" : "Mistral";

/** La variable à renseigner, pour que le message d'erreur soit actionnable. */
export const CLE_ATTENDUE = FOURNISSEUR === "groq" ? "GROQ_API_KEY" : "MISTRAL_API_KEY";

export const hasLLMKey = () => !!CLES[FOURNISSEUR];

export const llm = new OpenAI({
  apiKey: CLES[FOURNISSEUR] ?? "placeholder",
  baseURL: CFG.baseURL,
  // Les deux paliers gratuits limitent le débit : plusieurs appels groupés
  // (aiguilleur + chat + mémoire) peuvent se prendre un 429. On laisse le
  // SDK réessayer, il respecte le retry-after.
  maxRetries: 4,
});

/**
 * De quoi le raisonnement a besoin AVANT d'écrire la première lettre de la
 * réponse. Choisi large exprès : ce n'est pas un coût (seuls les tokens
 * réellement produits sont facturés), c'est un plafond. Trop bas, l'appel
 * rend du vide ; trop haut, il ne se passe rien.
 */
const RESERVE_RAISONNEMENT = 1024;

/**
 * Le modèle et le budget de tokens du rôle demandé, prêts à être étalés
 * dans `llm.chat.completions.create({ ...optionsIA(...), messages })`.
 *
 * `maxTokens` garde son sens d'avant : c'est ce que la RÉPONSE a le droit
 * d'occuper. Chez un fournisseur qui raisonne, la réserve s'ajoute par
 * dessus, donc le texte visible se comporte exactement comme avant.
 */
export function optionsIA(
  role: RoleIA,
  maxTokens: number
): {
  model: string;
  max_tokens?: number;
  max_completion_tokens?: number;
  reasoning_effort?: "low";
} {
  const model = CFG.modeles[role];
  if (!CFG.raisonne) return { model, max_tokens: maxTokens };
  return {
    model,
    max_completion_tokens: maxTokens + RESERVE_RAISONNEMENT,
    // Nos deux usages sont du routage et de la conversation, pas des maths :
    // le raisonnement long coûterait de la latence sans rien améliorer.
    reasoning_effort: "low",
  };
}

/**
 * @deprecated Passe par `optionsIA(role, maxTokens)` : elle porte aussi le
 * budget de tokens, qui n'est pas le même selon que le modèle raisonne.
 * Gardé pour ne casser aucun appelant existant.
 */
export const CHAT_MODEL = CFG.modeles.coach;
