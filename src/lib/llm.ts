import OpenAI from "openai";

/* ════════════════════════════════════════════════════════════════════
   llm — client LLM unique de l'app (Mistral 🇫🇷🇪🇺).

   On parle à Mistral via son endpoint *compatible OpenAI* : on garde donc
   exactement la même API que l'ancien client (chat.completions.create,
   streaming, response_format json_object). Un seul fichier = une seule
   source pour la clé, l'URL de base et le nom du modèle.

   Pourquoi Mistral : boîte française / serveurs UE (RGPD parfait pour des
   données de santé), free tier dispo en France (≈500k tokens/min, 1 Md/mois)
   contrairement à Gemini dont le free tier est bloqué dans l'EEA.

   Clé : MISTRAL_API_KEY (https://console.mistral.ai/api-keys).
   À configurer dans Vercel (Preview + Production) ET en local (.env.local).

   NB : la transcription vocale (Whisper) et le scan nutrition restent sur
   Groq pour l'instant — ce client ne couvre que le chat/assistant.
   ════════════════════════════════════════════════════════════════════ */

export const hasLLMKey = () => !!process.env.MISTRAL_API_KEY;

export const llm = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY ?? "placeholder",
  baseURL: "https://api.mistral.ai/v1",
  // Free tier Mistral = 1 req/s : plusieurs appels groupés (chat + analyse +
  // génération) peuvent se prendre un 429. On laisse le SDK réessayer (il
  // respecte le retry-after) pour absorber ces pics sans échec visible.
  maxRetries: 4,
});

// Modèle : bon rapport qualité/prix, excellent en français, JSON natif.
export const CHAT_MODEL = "mistral-small-latest";
