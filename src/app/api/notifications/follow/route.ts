import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/sendPushToUser";
import { ensureProfileForUser } from "@/lib/ensureProfile";

function cleanEnv(val: string | undefined): string {
  return (val ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { follower_id, followed_id } = await req.json();
    if (!follower_id || !followed_id) {
      return Response.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // ── Vérification d'authentification ──────────────────────────────────────
    // L'appelant doit être connecté et ne peut envoyer une notif qu'en son nom.
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return Response.json({ error: "Session invalide" }, { status: 401 });
    }
    if (caller.id !== follower_id) {
      return Response.json({ error: "Non autorisé" }, { status: 403 });
    }
    // ─────────────────────────────────────────────────────────────────────────

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

    // ── Assurer les profils des 2 users avant la notif (FK constraint) ──────
    await Promise.all([ensureProfileForUser(follower_id), ensureProfileForUser(followed_id)]);

    // ── Insertion notification in-app (admin client = bypass RLS) ────────────
    if (follower_id !== followed_id) {
      const { error: insErr } = await supabase.from("notifications").insert({
        user_id: followed_id,
        from_user_id: follower_id,
        from_pseudo: follower?.pseudo ?? null,
        from_avatar_url: follower?.avatar_url ?? null,
        type: "follow",
      });
      if (insErr) console.error("[notify-follow] insert failed:", insErr);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aura.app";

    // ── Envoi email (non-bloquant : si GMAIL non configuré, on skip) ─────────
    const gmailUser = cleanEnv(process.env.GMAIL_USER);
    const gmailPass = cleanEnv(process.env.GMAIL_PASS).replace(/\s/g, "");
    if (!gmailUser || !gmailPass) {
      // ── Push notification puis on sort proprement ──
      void sendPushToUser({
        user_id: followed_id,
        title: "Vaiiya · Nouvel abonné",
        body:  `${followerName} te suit maintenant !`,
        url:   `/profil/${encodeURIComponent(follower?.pseudo ?? "")}`,
      });
      return Response.json({ ok: true, notif: true, email: false });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"Vaiiya" <${cleanEnv(process.env.GMAIL_USER)}>`,
      to: followedEmail,
      subject: `${followerName} te suit maintenant sur Vaiiya`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#faf8ff">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:24px;padding:40px;box-shadow:0 4px 32px rgba(167,139,250,0.12)">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);line-height:56px;font-size:22px;color:#2D3748;text-align:center;font-weight:600">A</div>
      <h1 style="margin:12px 0 2px;font-size:18px;font-weight:300;letter-spacing:0.2em;color:#2D3748">Vaiiya</h1>
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
        te suit maintenant sur Vaiiya !
      </p>
    </div>

    <p style="text-align:center;font-size:14px;color:#718096;margin:0 0 28px;line-height:1.6">
      Va voir son profil, suis-le en retour et partage tes performances avec ta communauté.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px">
      <a href="${appUrl}/profil/${encodeURIComponent(follower?.pseudo ?? "")}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);color:#2D3748;text-decoration:none;border-radius:16px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(167,139,250,0.25)">
        Voir le profil
      </a>
    </div>

    <hr style="border:none;border-top:1px solid rgba(212,192,255,0.3);margin:0 0 20px" />

    <p style="text-align:center;font-size:11px;color:#A0AEC0;margin:0">
      Tu reçois cet email car tu as un compte Vaiiya (@${followedPseudo}).<br/>
      <a href="${appUrl}/profil" style="color:#A78BFA;text-decoration:none">Gérer mes notifications</a>
    </p>

  </div>
</body>
</html>`,
    });

    // Push déjà envoyé plus haut si GMAIL non configuré, sinon on l'envoie ici
    void sendPushToUser({
      user_id: followed_id,
      title: "Vaiiya · Nouvel abonné",
      body:  `${followerName} te suit maintenant !`,
      url:   `/profil/${encodeURIComponent(follower?.pseudo ?? "")}`,
    });

    return Response.json({ ok: true, notif: true, email: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("notify-follow error:", msg);
    // On retourne 200 même en cas d'erreur pour ne pas bloquer l'UI
    return Response.json({ ok: false, error: msg });
  }
}
