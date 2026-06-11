/**
 * POST /api/posts/delete
 * Supprime un post. L'appelant doit être l'auteur du post (ou un admin).
 * Auth : header "Authorization: Bearer <access_token>".
 * Body : { post_id }
 *
 * Passe par la clé service pour garantir la suppression (les contraintes FK
 * sont en ON DELETE CASCADE), indépendamment des policies RLS.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const admin = createAdminClient();

  // 1) Authentifier l'appelant
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "non_authentifié" }, { status: 401 });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userErr || !caller) return NextResponse.json({ error: "token_invalide" }, { status: 401 });

  // 2) Lire le post
  let body: { post_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const postId = body.post_id;
  if (!postId) return NextResponse.json({ error: "post_id_manquant" }, { status: 400 });

  const { data: post, error: postErr } = await admin
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .maybeSingle();
  if (postErr) return NextResponse.json({ error: postErr.message }, { status: 500 });
  if (!post) return NextResponse.json({ ok: true, alreadyGone: true });

  // 3) Vérifier les droits : auteur ou admin
  let allowed = post.user_id === caller.id;
  if (!allowed) {
    const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", caller.id).maybeSingle();
    allowed = !!prof?.is_admin;
  }
  if (!allowed) return NextResponse.json({ error: "accès_refusé" }, { status: 403 });

  // 4) Supprimer (FK en cascade)
  const { error: delErr } = await admin.from("posts").delete().eq("id", postId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: true });
}
