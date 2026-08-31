import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { cleanEnv, getAuthSecret } from "@/lib/serverEnv";
import { autoriserEnvoiEmail } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ error: "Email invalide" }, { status: 400 });
    }

    if (!autoriserEnvoiEmail("otp", email)) {
      return Response.json(
        { error: "Trop de demandes. Réessaie dans une heure." },
        { status: 429 }
      );
    }

    const resendKey = cleanEnv(process.env.RESEND_API_KEY);
    if (!resendKey) {
      console.error("send-otp: RESEND_API_KEY manquant");
      return Response.json(
        { error: "Le service d’envoi d’email n’est pas configuré." },
        { status: 503 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    const data = JSON.stringify({ email, otp, expires });
    const sig = createHmac("sha256", getAuthSecret()).update(data).digest("hex");
    const token = Buffer.from(data).toString("base64") + "." + sig;

    const fromAddress = cleanEnv(process.env.RESEND_FROM) || "Vaiiya <onboarding@resend.dev>";
    const subject = "Ton code Vaiiya · " + otp;

    const html =
      "<!DOCTYPE html><html><body style='margin:0;padding:40px 20px;font-family:sans-serif;background:#faf8ff'>" +
      "<div style='max-width:420px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 4px 32px rgba(167,139,250,0.12)'>" +
      "<div style='text-align:center;margin-bottom:32px'>" +
      "<div style='display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);line-height:56px;font-size:26px;color:#2D3748;text-align:center;font-weight:600'>V</div>" +
      "<h1 style='margin:12px 0 2px;font-size:18px;font-weight:300;letter-spacing:0.2em;color:#2D3748'>VAIIYA</h1>" +
      "<p style='margin:0;font-size:11px;color:#A0AEC0'>Coach IA · Musculation · Nutrition</p></div>" +
      "<h2 style='text-align:center;font-size:17px;font-weight:400;color:#2D3748;margin:0 0 8px'>Code de confirmation</h2>" +
      "<p style='text-align:center;font-size:13px;color:#718096;margin:0 0 28px'>Entre ce code dans l’application pour activer ton compte.</p>" +
      "<div style='background:rgba(212,192,255,0.15);border:1.5px solid rgba(167,139,250,0.2);border-radius:16px;padding:28px 20px;text-align:center;margin-bottom:24px'>" +
      "<span style='font-family:monospace;font-size:42px;font-weight:700;letter-spacing:14px;color:#A78BFA'>" + otp + "</span></div>" +
      "<p style='text-align:center;font-size:12px;color:#A0AEC0'>Ce code expire dans <strong>10 minutes</strong>.</p>" +
      "<p style='text-align:center;font-size:11px;color:#A0AEC0;margin-top:24px'>Si tu n’as pas demandé ce code, ignore cet email.</p>" +
      "</div></body></html>";

    const text =
      "Vaiiya · Code de confirmation\n\n" +
      "Ton code : " + otp + "\n\n" +
      "Ce code expire dans 10 minutes.\n" +
      "Si tu n’as pas demandé ce code, ignore cet email.";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + resendKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("Resend send error:", res.status, errBody);
      if (res.status === 422 || res.status === 403) {
        return Response.json(
          { error: "Email non livrable. Vérifie l’adresse." },
          { status: 422 }
        );
      }
      return Response.json(
        { error: "Erreur d’envoi de l’email. Réessaie dans un instant." },
        { status: 502 }
      );
    }

    return Response.json({ token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-otp error:", msg);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
