import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase-admin";

function cleanEnv(val: string | undefined): string {
  return (val ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { follower_id, followed_id } = await req.json();
    if (!follower_id || !followed_id) {
      return Response.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Récupérer en parallèle : profil du follower + email du suivi
    const [followerRes, followedUserRes] = await Promise.all([
      supabase.from("profiles").select("pseudo, full_name, avatar_url").eq("id", follower_id).maybeSingle(),
      supabase.auth.admin.getUserById(followed_id),
    ]);

    const follower = followerRes.data;
    const followedEmail = followedUserRes.data?.user?.email;

    if (!followedEmail) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Récupérer le pseudo du suivi pour la personnalisation
    const { data: followedProfile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", followed_id)
      .maybeSingle();

    const followerName = follower?.full_name || `@${follower?.pseudo}` || "Quelqu'un";
    const followerHandle = follower?.pseudo ? `@${follower.pseudo}` : "";
    const followedPseudo = followedProfile?.pseudo ?? "toi";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: cleanEnv(process.env.GMAIL_USER),
        pass: cleanEnv(process.env.GMAIL_PASS).replace(/\s/g, ""),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aura.app";

    await transporter.sendMail({
      from: `"Aura" <${cleanEnv(process.env.GMAIL_USER)}>`,
      to: followedEmail,
      subject: `${followerName} te suit maintenant sur Aura`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#faf8ff">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:24px;padding:40px;box-shadow:0 4px 32px rgba(167,139,250,0.12)">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);line-height:56px;font-size:22px;color:#2D3748;text-align:center;font-weight:600">A</div>
      <h1 style="margin:12px 0 2px;font-size:18px;font-weight:300;letter-spacing:0.2em;color:#2D3748">Aura</h1>
      <p style="margin:0;font-size:11px;color:#A0AEC0;letter-spacing:0.05em">COACH IA · MUSCULATION · NUTRITION</p>
    </div>

    <!-- Avatar + message -->
    <div style="background:linear-gradient(135deg,rgba(212,192,255,0.15),rgba(245,230,163,0.15));border:1px solid rgba(212,192,255,0.3);border-radius:20px;padding:28px 24px;text-align:center;margin-bottom:28px">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#2D3748;line-height:64px">
        ${follower?.pseudo?.[0]?.toUpperCase() ?? "?"}
      </div>
      <p style="margin:0 0 6px;font-size:17px;font-weight:600;color:#2D3748">${followerName}</p>
      ${followerHandle ? `<p style="margin:0 0 16px;font-size:13px;color:#A78BFA">${followerHandle}</p>` : ""}
      <p style="margin:0;font-size:15px;font-weight:300;color:#4A5568;line-height:1.6">
        te suit maintenant sur Aura !
      </p>
    </div>

    <p style="text-align:center;font-size:14px;color:#718096;margin:0 0 28px;line-height:1.6">
      Va voir son profil, suis-le en retour et partage tes performances avec ta communauté.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px">
      <a href="${appUrl}/profil/${follower?.pseudo ?? ""}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);color:#2D3748;text-decoration:none;border-radius:16px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(167,139,250,0.25)">
        Voir le profil
      </a>
    </div>

    <hr style="border:none;border-top:1px solid rgba(212,192,255,0.3);margin:0 0 20px" />

    <p style="text-align:center;font-size:11px;color:#A0AEC0;margin:0">
      Tu reçois cet email car tu as un compte Aura (@${followedPseudo}).<br/>
      <a href="${appUrl}/profil" style="color:#A78BFA;text-decoration:none">Gérer mes notifications</a>
    </p>

  </div>
</body>
</html>`,
    });

    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("notify-follow error:", msg);
    // On retourne 200 même en cas d'erreur pour ne pas bloquer l'UI
    return Response.json({ ok: false, error: msg });
  }
}
