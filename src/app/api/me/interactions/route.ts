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

    return Response.json({
      likes:    (likesRes.data    ?? []).map((r) => r.post_id),
      reposts:  (repostsRes.data  ?? []).map((r) => r.post_id),
      saves:    (savesRes.data    ?? []).map((r) => r.post_id),
      follows:  (followsRes.data  ?? []).map((r) => r.following_id),
      errors: {
        likes:   likesRes.error?.message ?? null,
        reposts: repostsRes.error?.message ?? null,
        saves:   savesRes.error?.message ?? null,
        follows: followsRes.error?.message ?? null,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
