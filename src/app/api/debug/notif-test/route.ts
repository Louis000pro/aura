import { createAdminClient } from "@/lib/supabase-admin";

/**
 * GET /api/debug/notif-test
 * Teste l'insertion d'une notification de chaque type et retourne les erreurs.
 * À SUPPRIMER après debug.
 */
export async function GET() {
  const supabase = createAdminClient();

  // Récupère un user réel pour respecter la FK
  const { data: profiles } = await supabase.from("profiles").select("id").limit(2);
  if (!profiles || profiles.length === 0) {
    return Response.json({ error: "no profiles" });
  }
  const uid = profiles[0].id;
  const fromId = profiles[1]?.id ?? profiles[0].id;

  // Récupère un post réel
  const { data: posts } = await supabase.from("posts").select("id").limit(1);
  const postId = posts?.[0]?.id ?? null;

  const results: Record<string, unknown> = {};

  for (const type of ["like", "comment", "repost", "follow", "mention", "story_reply"]) {
    const { error } = await supabase.from("notifications").insert({
      user_id: uid,
      from_user_id: fromId,
      from_pseudo: "debug",
      from_avatar_url: null,
      type,
      post_id: type === "follow" ? null : postId,
    }).select("id").maybeSingle();
    results[type] = error ? { code: error.code, message: error.message } : "OK";
    // Cleanup : on supprime la notif de test si elle a été créée
    if (!error) {
      await supabase.from("notifications").delete().eq("user_id", uid).eq("from_pseudo", "debug");
    }
  }

  // Schéma de la table : colonnes existantes (via une ligne)
  const { data: sample } = await supabase.from("notifications").select("*").limit(1).maybeSingle();

  return Response.json({
    test_user_id: uid,
    test_post_id: postId,
    insert_results: results,
    sample_row_columns: sample ? Object.keys(sample) : [],
    sample_row: sample,
  });
}
