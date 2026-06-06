import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * POST /api/me/ensure-profile
 * Body: { user_id, pseudo, full_name, avatar_url }
 *
 * Crée le profil de l'utilisateur s'il n'existe pas (filet de sécurité
 * quand le trigger handle_new_user n'a pas tourné).
 */
export async function POST(req: NextRequest) {
  try {
    const { user_id, pseudo, full_name, avatar_url, email } = await req.json();
    if (!user_id) return Response.json({ error: "user_id requis" }, { status: 400 });

    const supabase = createAdminClient();

    // 1) Profil déjà présent ?
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, pseudo")
      .eq("id", user_id)
      .maybeSingle();
    if (existing) {
      return Response.json({ ok: true, created: false, profile: existing });
    }

    // 2) Sinon, on récupère les metadata du user
    let metaPseudo = pseudo;
    let metaName   = full_name;
    let metaAvatar = avatar_url;
    let metaEmail  = email;
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      const u = userData?.user;
      if (u) {
        metaEmail  = metaEmail  || u.email;
        metaPseudo = metaPseudo || (u.user_metadata?.pseudo as string | undefined) || (u.email?.split("@")[0] ?? null);
        metaName   = metaName   || (u.user_metadata?.full_name as string | undefined) || (u.user_metadata?.name as string | undefined) || metaPseudo;
        metaAvatar = metaAvatar || (u.user_metadata?.avatar_url as string | undefined);
      }
    } catch { /* ignore */ }

    if (!metaPseudo) metaPseudo = `user_${user_id.slice(0, 6)}`;

    // 3) Insert profil (avec gestion conflit de pseudo)
    let insertPseudo = metaPseudo;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: created, error } = await supabase
        .from("profiles")
        .insert({
          id: user_id,
          pseudo: insertPseudo,
          full_name: metaName ?? insertPseudo,
          avatar_url: metaAvatar ?? null,
          email: metaEmail ?? null,
        })
        .select("id, pseudo")
        .maybeSingle();
      if (!error) {
        return Response.json({ ok: true, created: true, profile: created });
      }
      // Conflit de pseudo → suffixer
      if (error.code === "23505" && error.message?.includes("pseudo")) {
        insertPseudo = `${metaPseudo}_${Math.floor(Math.random() * 999)}`;
        continue;
      }
      // Autre erreur
      return Response.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
    }
    return Response.json({ ok: false, error: "Trop de conflits de pseudo" }, { status: 500 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
