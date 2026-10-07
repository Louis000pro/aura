import { randomInt } from "crypto";
import { NextRequest } from "next/server";
import { cleanEnv } from "@/lib/serverEnv";
import { autoriserEnvoiEmail } from "@/lib/rateLimit";
import { creerJeton } from "@/lib/jetonCode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ error: "Email invalide" }, { status: 400 });
    }

    if (!(await autoriserEnvoiEmail("otp", email))) {
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

    const otp = randomInt(100000, 1000000).toString();
    // Le jeton rendu au navigateur ne contient qu'une empreinte du code,
    // jamais le code lui-même (cf. lib/jetonCode.ts).
    const token = creerJeton(email, otp, 10 * 60 * 1000);

    const fromAddress = cleanEnv(process.env.RESEND_FROM) || "Vaiiya <onboarding@resend.dev>";
    const subject = "Ton code Vaiiya · " + otp;

    /* Le gabarit est pensé pour le PETIT écran d'abord : les styles en ligne
       sont ceux du téléphone (ce que lit un client mail qui ignore <style>),
       et la media query les agrandit au-delà de 520 px (ordinateur,
       tablette). `white-space:nowrap` empêche le code de se couper en deux
       lignes, ce qui le rendait illisible sur un petit téléphone. */
    const html =
      "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>" +
      "<style>@media (min-width:520px){" +
      ".vy-page{padding:40px 20px!important}" +
      ".vy-carte{padding:40px!important}" +
      ".vy-code{font-size:46px!important;letter-spacing:12px!important}" +
      "}</style></head>" +
      "<body class='vy-page' style='margin:0;padding:20px 10px;font-family:sans-serif;background:#faf8ff'>" +
      "<div class='vy-carte' style='max-width:420px;margin:0 auto;background:#fff;border-radius:24px;padding:28px 18px;box-shadow:0 4px 32px rgba(167,139,250,0.12)'>" +
      "<div style='text-align:center;margin-bottom:28px'>" +
      "<img src='https://vaiiya.fr/logo-vaiiya.png' alt='Vaiiya' width='56' height='56' style='display:inline-block;width:56px;height:56px' />" +
      "<h1 style='margin:10px 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#2D3748'>VAIIYA</h1>" +
      "<p style='margin:0;font-size:11px;color:#A0AEC0'>Coach IA · Musculation · Nutrition</p></div>" +
      "<h2 style='text-align:center;font-size:17px;font-weight:400;color:#2D3748;margin:0 0 8px'>Code de confirmation</h2>" +
      "<p style='text-align:center;font-size:13px;color:#718096;margin:0 0 24px'>Entre ce code dans l’application pour activer ton compte.</p>" +
      "<div style='background:rgba(212,192,255,0.15);border:1.5px solid rgba(167,139,250,0.2);border-radius:16px;padding:22px 8px;text-align:center;margin-bottom:24px'>" +
      "<span class='vy-code' style='font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;letter-spacing:5px;white-space:nowrap;color:#8B5CF6'>" + otp + "</span></div>" +
      "<p style='text-align:center;font-size:12px;color:#A0AEC0'>Ce code expire dans <strong>10 minutes</strong>.</p>" +
      "<p style='text-align:center;font-size:11px;color:#A0AEC0;margin-top:24px'>Si tu n’as pas demandé ce code, ignore cet email.</p>" +
      "</div></body></html>";

    const text =
      "Vaiiya · Code de confirmation\n\n" +
      "Ton code : " + otp + "\n\n" +
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
