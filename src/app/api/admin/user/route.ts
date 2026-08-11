import { NextRequest, NextResponse } from "next/server";
import { exigerAdmin } from "@/lib/adminGuard";

/**
 * POST /api/admin/user
 * Actions d'administration sur un utilisateur, réservées aux admins.
 * Auth : header "Authorization: Bearer <access_token>" du compte admin.
 * Body : { action, target_id, ... }
 *   - set_pseudo   { pseudo }
 *   - set_avatar   { image_base64 }  (JPEG dataless base64)
 *   - set_certified{ value: boolean }
 *   - set_banned   { value: boolean }
 *   - set_admin    { value: boolean }
 *   - delete
 */
export async function POST(req: NextRequest) {
  // Authentification + droit admin : une seule porte, partagée avec
  // /api/admin/stats (voir lib/adminGuard.ts).
  const porte = await exigerAdmin(req);
  if (!porte.ok) return porte.reponse;
  const { admin } = porte;

  // ── Exécuter l'action ──
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const action   = body.action as string;
  const targetId = body.target_id as string;
  if (!action || !targetId) return NextResponse.json({ error: "params_manquants" }, { status: 400 });

  try {
    switch (action) {
      case "set_pseudo": {
        const pseudo = String(body.pseudo ?? "").trim();
        if (!pseudo) return NextResponse.json({ error: "pseudo_vide" }, { status: 400 });
        const { error } = await admin.from("profiles").update({ pseudo }).eq("id", targetId);
        if (error) {
          if (error.code === "23505") return NextResponse.json({ error: "pseudo_pris" }, { status: 409 });
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, pseudo });
      }

      case "set_avatar": {
        const b64 = String(body.image_base64 ?? "");
        if (!b64) return NextResponse.json({ error: "image_manquante" }, { status: 400 });
        const buffer = Buffer.from(b64, "base64");
        const path = `${targetId}/avatar.jpg`;
        const { error: upErr } = await admin.storage
          .from("avatars")
          .upload(path, buffer, { upsert: true, contentType: "image/jpeg" });
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
        const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path);
        const url = `${urlData.publicUrl}?t=${Date.now()}`;
        const { error } = await admin.from("profiles").update({ avatar_url: url }).eq("id", targetId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, avatar_url: url });
      }

      case "set_certified": {
        const value = Boolean(body.value);
        const { error } = await admin.from("profiles").update({ is_certified: value }).eq("id", targetId);
        if (error) return NextResponse.json({ error: error.message, hint: "colonne is_certified ?" }, { status: 500 });
        return NextResponse.json({ ok: true, is_certified: value });
      }

      case "set_banned": {
        const value = Boolean(body.value);
        const { error } = await admin.from("profiles").update({ is_banned: value }).eq("id", targetId);
        if (error) return NextResponse.json({ error: error.message, hint: "colonne is_banned ?" }, { status: 500 });
        // Bannir = retirer aussi tout son contenu (posts + stories = ses vidéos)
        if (value) {
          await Promise.all([
            admin.from("posts").delete().eq("user_id", targetId),
            admin.from("stories").delete().eq("user_id", targetId),
          ]);
        }
        return NextResponse.json({ ok: true, is_banned: value });
      }

      case "set_admin": {
        const value = Boolean(body.value);
        const { error } = await admin.from("profiles").update({ is_admin: value }).eq("id", targetId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, is_admin: value });
      }

      case "delete": {
        await Promise.all([
          admin.from("followers").delete().or(`follower_id.eq.${targetId},following_id.eq.${targetId}`),
          admin.from("notifications").delete().or(`user_id.eq.${targetId},from_user_id.eq.${targetId}`),
        ]);
        const { error } = await admin.from("profiles").delete().eq("id", targetId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        // Supprime aussi le compte auth
        try { await admin.auth.admin.deleteUser(targetId); } catch { /* ignore */ }
        return NextResponse.json({ ok: true, deleted: true });
      }

      default:
        return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
