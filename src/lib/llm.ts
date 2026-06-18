import OpenAI from "openai";

/* ════════════════════════════════════════════════════════════════════
   llm — client LLM unique de l'app (Google Gemini 2.0 Flash).

   On parle à Gemini via son endpoint *compatible OpenAI* : on garde donc
   exactement la même API que l'ancien client Groq (chat.completions.create,
   streaming, response_format json_object). Un seul fichier = une seule
   source pour la clé, l'URL de base et le nom du modèle.

   Clé : GEMINI_API_KEY (Google AI Studio — https://aistudio.google.com/apikey)
   À configurer dans Vercel (Preview + Production) ET en local (.env.local).

   NB : la transcription vocale (Whisper) et le scan nutrition restent sur
   Groq pour l'instant — ce client ne couvre que le chat/assistant.
   ════════════════════════════════════════════════════════════════════ */

export const hasLLMKey = () => !!process.env.GEMINI_API_KEY;

export const llm = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY ?? "placeholder",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Modèle unique : rapide, bon marché, multilingue (FR), JSON natif.
export const CHAT_MODEL = "gemini-2.0-flash";
