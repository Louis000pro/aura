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
    const { commenter_id, post_owner_id, post_id, comment_preview } = await req.json();
    if (!commenter_id || !post_owner_id) {
      return Response.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const [commenterRes, ownerUserRes] = await Promise.all([
      supabase.from("profiles").select("pseudo, full_name, avatar_url").eq("id", commenter_id).maybeSingle(),
      supabase.auth.admin.getUserById(post_owner_id),
    ]);

    const commenter = commenterRes.data;
    const ownerEmail = ownerUserRes.data?.user?.email;

    if (!ownerEmail) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", post_owner_id)
      .maybeSingle();

    const commenterName = commenter?.full_name || `@${commenter?.pseudo}` || "Quelqu'un";
    const commenterHandle = commenter?.pseudo ? `@${commenter.pseudo}` : "";
    const ownerPseudo = ownerProfile?.pseudo ?? "toi";

    // ── Assurer les profils des 2 users avant la notif (FK constraint) ──────
    await Promise.all([ensureProfileForUser(commenter_id), ensureProfileForUser(post_owner_id)]);

    // ── Insertion notification in-app (admin client = bypass RLS) ────────────
    if (commenter_id !== post_owner_id) {
      const { error: insErr } = await supabase.from("notifications").insert({
        user_id: post_owner_id,
        from_user_id: commenter_id,
        from_pseudo: commenter?.pseudo ?? null,
        from_avatar_url: commenter?.avatar_url ?? null,
        type: "comment",
      });
      if (insErr) console.error("[notify-comment] insert failed:", insErr);
    }

    // Truncate comment preview to 80 chars
    const preview = comment_preview
      ? comment_preview.length > 80
        ? comment_preview.slice(0, 80) + "…"
        : comment_preview
      : null;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aura.app";
    const postUrl = post_id ? `${appUrl}/communaute` : appUrl;

    // ── Push notification (fire-and-forget) ──────────────────────────────────
    void sendPushToUser({
      user_id: post_owner_id,
      title: "Vaiiya · Nouveau commentaire",
      body:  preview ? `${commenterName} : ${preview}` : `${commenterName} a commenté ton post`,
      url:   post_id ? `/communaute` : "/",
    });

    // ── Envoi email (non-bloquant : si GMAIL non configuré, on sort) ─────────
    const gmailUser = cleanEnv(process.env.GMAIL_USER);
    const gmailPass = cleanEnv(process.env.GMAIL_PASS).replace(/\s/g, "");
    if (!gmailUser || !gmailPass) {
      return Response.json({ ok: true, notif: true, email: false });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"Vaiiya" <${cleanEnv(process.env.GMAIL_USER)}>`,
      to: ownerEmail,
      subject: `${commenterName} a commenté ton post sur Vaiiya`,
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
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);margin:0 auto 16px;line-height:64px;font-size:24px;font-weight:700;color:#2D3748;text-align:center">
        ${commenter?.pseudo?.[0]?.toUpperCase() ?? "?"}
      </div>
      <p style="margin:0 0 6px;font-size:17px;font-weight:600;color:#2D3748">${commenterName}</p>
      ${commenterHandle ? `<p style="margin:0 0 16px;font-size:13px;color:#A78BFA">${commenterHandle}</p>` : ""}
      <p style="margin:0;font-size:15px;font-weight:300;color:#4A5568;line-height:1.6">
        a commenté ton post !
      </p>
      ${preview ? `
      <div style="margin-top:16px;padding:12px 16px;background:rgba(255,255,255,0.7);border-radius:12px;border-left:3px solid #A78BFA;text-align:left">
        <p style="margin:0;font-size:14px;color:#4A5568;font-style:italic;line-height:1.5">"${preview}"</p>
      </div>` : ""}
    </div>

    <p style="text-align:center;font-size:14px;color:#718096;margin:0 0 28px;line-height:1.6">
      Rejoins la conversation et réponds à ce commentaire !
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px">
      <a href="${postUrl}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#D4C0FF,#F5E6A3);color:#2D3748;text-decoration:none;border-radius:16px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(167,139,250,0.25)">
        Voir le commentaire
      </a>
    </div>

    <hr style="border:none;border-top:1px solid rgba(212,192,255,0.3);margin:0 0 20px" />

    <p style="text-align:center;font-size:11px;color:#A0AEC0;margin:0">
      Tu reçois cet email car tu as un compte Vaiiya (@${ownerPseudo}).<br/>
      <a href="${appUrl}/profil" style="color:#A78BFA;text-decoration:none">Gérer mes notifications</a>
    </p>

  </div>
</body>
</html>`,
    });

    return Response.json({ ok: true, notif: true, email: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("notify-comment error:", msg);
    return Response.json({ ok: false, error: msg });
  }
}
