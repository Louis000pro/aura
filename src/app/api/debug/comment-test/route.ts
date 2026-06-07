import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
  const { data: posts } = await supabase.from("posts").select("id").limit(1);
  const uid = profiles?.[0]?.id;
  const postId = posts?.[0]?.id;

  const results: Record<string, unknown> = {};

  // Test avec colonne "text"
  const t1 = await supabase.from("post_comments").insert({ post_id: postId, user_id: uid, text: "debug_test" }).select("id").maybeSingle();
  results["insert_with_text_column"] = t1.error ? { code: t1.error.code, message: t1.error.message } : "OK";
  if (!t1.error && t1.data) await supabase.from("post_comments").delete().eq("id", t1.data.id);

  // Test avec colonne "content"
  const t2 = await supabase.from("post_comments").insert({ post_id: postId, user_id: uid, content: "debug_test" }).select("id").maybeSingle();
  results["insert_with_content_column"] = t2.error ? { code: t2.error.code, message: t2.error.message } : "OK";
  if (!t2.error && t2.data) await supabase.from("post_comments").delete().eq("id", t2.data.id);

  const { data: sample } = await supabase.from("post_comments").select("*").limit(1).maybeSingle();

  return Response.json({
    insert_results: results,
    sample_columns: sample ? Object.keys(sample) : [],
    sample_row: sample,
  });
}
