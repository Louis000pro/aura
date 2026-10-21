/**
 * POST /api/transcribe — dictée vocale (Groq Whisper).
 *
 * ⚠️ Cette route était ouverte à tout internet, sans connexion ni limite de
 * taille : n'importe qui pouvait y déverser des heures d'audio sur notre clé.
 * Connexion obligatoire + plafond d'usage + plafond de poids depuis le
 * 2026-07-29.
 */
import { NextRequest, NextResponse } from "next/server";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";

/* Sur un silence, Whisper n'écrit pas rien : il invente les phrases qu'il a
   le plus vues en fin de vidéo (« Sous-titrage Société Radio-Canada »,
   « Merci d'avoir regardé »). Une transcription qui n'est QUE ça est
   rendue vide, donc rien ne part au Guide. */
const HALLUCINATIONS = [
  /sous[- ]?titr/,
  /soci[eé]t[eé] radio[- ]?canada/,
  /amara\.org/,
  /merci d'avoir regard/,
  /merci de (votre attention|m'avoir|nous avoir)/,
  /abonnez[- ]vous/,
  /n'oubliez pas de (vous abonner|liker)/,
  /^\W*(\.\.\.|…)?\W*$/,
];

function nettoyer(texte: string): string {
  const t = texte.trim();
  const bas = t.toLowerCase().replace(/[’]/g, "'");
  return HALLUCINATIONS.some((r) => r.test(bas)) ? "" : t;
}

export async function POST(req: NextRequest) {
  const garde = await garderIA(req, "vocal");
  if (!garde.ok) return garde.reponse;

  const apiKey = process.env.COACH_AURA_KEY ?? process.env.Groq_api_key_vocal;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: "No audio received" }, { status: 400 });
    }
    if (audio.size > PLAFONDS.audioOctets) {
      return refusTaille("Cet enregistrement");
    }

    // Forward to Groq Whisper (OpenAI-compatible endpoint)
    const groqForm = new FormData();
    groqForm.append("file", audio, audio.name ?? "recording.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("language", "fr");
    groqForm.append("response_format", "json");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("Groq error:", err);
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }

    const data = await groqRes.json();
    return NextResponse.json({ text: nettoyer(String(data.text ?? "")) });
  } catch (err) {
    console.error("Transcribe route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
