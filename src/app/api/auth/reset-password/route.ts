import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { cleanEnv } from "@/lib/serverEnv";
import { autoriserEnvoiEmail } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email || !email.includes("@")) {
      return Response.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!autoriserEnvoiEmail("reset", email)) {
      return Response.json({ error: "Trop de demandes. Réessaie dans une heure." }, { status: 429 });
    }

    const resendKey = cleanEnv(process.env.RESEND_API_KEY);
    if (!resendKey) {
      console.error("reset-password: RESEND_API_KEY manquant");
      return Response.json({ error: "Service email non configuré." }, { status: 503 });
    }

    // 1) Génère le lien de réinitialisation côté serveur (clé service)
    const admin = createAdminClient();
    const redirectTo = "https://vaiiya.fr/auth/reset-password";
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Si l'utilisateur n'existe pas → on renvoie OK quand même (ne pas révéler les comptes)
    if (error || !data?.properties?.action_link) {
      console.warn("reset-password generateLink:", error?.message);
      return Response.json({ ok: true });
    }

    const link = data.properties.action_link;
    const fromAddress = cleanEnv(process.env.RESEND_FROM) || "Vaiiya <onboarding@resend.dev>";

    const html =
      "<!DOCTYPE html><html><body style='margin:0;padding:40px 20px;font-family:sans-serif;background:#faf8ff'>" +
      "<div style='max-width:420px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 4px 32px rgba(167,139,250,0.12)'>" +
      "<div style='text-align:center;margin-bottom:28px'>" +
      "<div style='display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);line-height:56px;font-size:26px;color:#2D3748;font-weight:600'>V</div>" +
      "<h1 style='margin:12px 0 2px;font-size:18px;font-weight:300;letter-spacing:0.2em;color:#2D3748'>VAIIYA</h1></div>" +
      "<h2 style='text-align:center;font-size:17px;font-weight:400;color:#2D3748;margin:0 0 8px'>Réinitialise ton mot de passe</h2>" +
      "<p style='text-align:center;font-size:13px;color:#718096;margin:0 0 28px'>Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>" +
      "<div style='text-align:center;margin-bottom:24px'>" +
      "<a href='" + link + "' style='display:inline-block;background:linear-gradient(135deg,#A78BFA,#D4A843);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 32px;border-radius:16px'>Réinitialiser mon mot de passe</a></div>" +
      "<p style='text-align:center;font-size:11px;color:#A0AEC0'>Ce lien expire bientôt. Si tu n'as pas fait cette demande, ignore cet email.</p>" +
      "</div></body></html>";

    const text =
      "Vaiiya · Réinitialisation du mot de passe\n\n" +
      "Ouvre ce lien pour choisir un nouveau mot de passe :\n" + link + "\n\n" +
      "Si tu n'as pas fait cette demande, ignore cet email.";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress, to: [email], subject: "Réinitialise ton mot de passe Vaiiya", html, text }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("reset-password Resend error:", res.status, errBody);
      return Response.json({ error: "Erreur d'envoi de l'email. Réessaie." }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("reset-password error:", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
