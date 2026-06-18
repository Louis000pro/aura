/* Diagnostic temporaire : appel BRUT à l'endpoint natif Gemini.
   Ouvre /api/assistant/ping dans le navigateur → renvoie le status HTTP et
   le CORPS DE RÉPONSE EXACT de Google (qui contient le vrai motif du 429).
   À SUPPRIMER une fois le souci de clé/quota réglé. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ ok: false, reason: "GEMINI_API_KEY absente de l'environnement" });
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      },
    );
    const body = await res.text(); // brut : on veut le message exact, même en erreur
    return new Response(
      JSON.stringify({ httpStatus: res.status, ok: res.ok, body }, null, 2),
      { headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  } catch (err) {
    return Response.json({ ok: false, fetchError: (err as { message?: string })?.message ?? String(err) });
  }
}
