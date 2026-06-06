import { createHmac } from "crypto";
import { NextRequest } from "next/server";

function cleanEnv(val: string | undefined): string {
  return (val ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

function getSecret(): Buffer {
  const secret = cleanEnv(process.env.AUTH_SECRET);
  if (!secret) throw new Error("AUTH_SECRET manquant — configuration serveur requise");
  return Buffer.from(secret, "utf8");
}

// ─── Anti-replay : signatures consommées (en mémoire) ─────────────────
// Une signature ne peut être utilisée qu'une seule fois.
// Auto-nettoyage des entrées expirées toutes les 60s pour éviter la fuite.
const usedSignatures = new Map<string, number>(); // sig → expires
let lastCleanup = 0;
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [sig, exp] of usedSignatures) {
    if (exp < now) usedSignatures.delete(sig);
  }
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

    if (Date.now() > payload.expires) return Response.json({ error: "Code expiré. Renvoie un nouveau code." }, { status: 400 });
    if (payload.otp !== otp.trim()) return Response.json({ error: "Code incorrect." }, { status: 400 });

    // ─── Anti-replay : signature déjà utilisée ?
    cleanup();
    if (usedSignatures.has(sig)) {
      return Response.json({ error: "Ce code a déjà été utilisé. Renvoie un nouveau code." }, { status: 400 });
    }
    // Marquer la signature comme consommée jusqu'à son expiration
    usedSignatures.set(sig, payload.expires);

    return Response.json({ success: true, email: payload.email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("verify-otp error:", msg);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}