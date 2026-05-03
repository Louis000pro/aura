import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.Groq_api_key_vocal;
  if (!apiKey) {
    return NextResponse.json({ error: "Groq_api_key_vocal not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: "No audio received" }, { status: 400 });
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
    return NextResponse.json({ text: data.text ?? "" });
  } catch (err) {
    console.error("Transcribe route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
