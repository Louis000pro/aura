import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * GET /api/me/interactions?user_id=XXX
 * Retourne TOUS les post_ids likés/repostés/sauvegardés par un utilisateur.
 * Utilise le service role (bypass RLS) → garanti de retourner les vraies données.
 */
export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id) return Response.json({ error: "user_id requis" }, { status: 400 });

    const supabase = createAdminClient();

    const [likesRes, repostsRes, savesRes, followsRes] = await Promise.all([
      supabase.from("post_likes").select("post_id").eq("user_id", user_id),
      supabase.from("post_reposts").select("post_id").eq("user_id", user_id),
      supabase.from("post_saves").select("post_id").eq("user_id", user_id),
      supabase.from("followers").select("following_id").eq("follower_id", user_id),
    ]);

    // Notifications du user (admin = bypass RLS pour debug)
    const notifsRes = await supabase
      .from("notifications")
      .select("id, type, from_pseudo, post_id, read, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    return Response.json({
      likes:    (likesRes.data    ?? []).map((r) => r.post_id),
      reposts:  (repostsRes.data  ?? []).map((r) => r.post_id),
      saves:    (savesRes.data    ?? []).map((r) => r.post_id),
      follows:  (followsRes.data  ?? []).map((r) => r.following_id),
      notifs_count: notifsRes.data?.length ?? 0,
      notifs:       notifsRes.data ?? [],
      notifs_error: notifsRes.error?.message ?? null,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
