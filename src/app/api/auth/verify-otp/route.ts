import { createHmac } from "crypto";
import { NextRequest } from "next/server";

function cleanEnv(val: string | undefined): string {
  return (val ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

function getSecret(): Buffer {
  return Buffer.from(cleanEnv(process.env.AUTH_SECRET) || "aura-otp-fallback-2024", "utf8");
}

export async function POST(req: NextRequest) {
  try {
    const { token, otp } = await req.json();
    if (!token || !otp) return Response.json({ error: "Donnees manquantes" }, { status: 400 });

    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return Response.json({ error: "Token invalide" }, { status: 400 });

    const dataB64 = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);

    const data = Buffer.from(dataB64, "base64").toString();
    const expectedSig = createHmac("sha256", getSecret()).update(data).digest("hex");

    if (sig !== expectedSig) return Response.json({ error: "Token invalide" }, { status: 400 });

    const payload = JSON.parse(data) as { email: string; otp: string; expires: number };

    if (Date.now() > payload.expires) return Response.json({ error: "Code expire. Renvoie un nouveau code." }, { status: 400 });
    if (payload.otp !== otp.trim()) return Response.json({ error: "Code incorrect." }, { status: 400 });

    return Response.json({ success: true, email: payload.email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("verify-otp error:", msg);
    return Response.json({ error: "Erreur: " + msg }, { status: 500 });
  }
}