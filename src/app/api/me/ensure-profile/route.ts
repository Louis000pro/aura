import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { compteAppelant, refusAuth } from "@/lib/apiAuth";

/**
 * POST /api/me/ensure-profile
 * En-tête : Authorization: Bearer <access_token>
 * Body: { pseudo, full_name, avatar_url, email } (facultatifs, complétés depuis auth.users)
 *
 * Crée le profil de l'utilisateur s'il n'existe pas (filet de sécurité
 * quand le trigger handle_new_user n'a pas tourné), ET répare un profil
 * existant dont le pseudo est manquant (cas des comptes Google sans pseudo).
 *
 * Le compte vient du jeton : la route écrit avec le service role, donc un
 * `user_id` accepté depuis le corps de la requête aurait laissé n'importe qui
 * poser le pseudo d'un compte Google encore vierge.
 */

/* Génère un pseudo propre à partir d'un texte libre */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);
}

export async function POST(req: NextRequest) {
  try {
    const appelant = await compteAppelant(req);
    if (!appelant) return refusAuth();
    const user_id = appelant.id;

    const { pseudo, full_name, avatar_url, email } = await req.json();

    const supabase = createAdminClient();

    // ── Métadonnées (body + auth.users) ──
    let metaPseudo = pseudo as string | null | undefined;
    let metaName   = full_name as string | null | undefined;
    let metaAvatar = avatar_url as string | null | undefined;
    let metaEmail  = email as string | null | undefined;
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      const u = userData?.user;
      if (u) {
        metaEmail  = metaEmail  || u.email;
        metaPseudo = metaPseudo || (u.user_metadata?.pseudo as string | undefined);
        metaName   = metaName   || (u.user_metadata?.full_name as string | undefined) || (u.user_metadata?.name as string | undefined);
        metaAvatar = metaAvatar || (u.user_metadata?.avatar_url as string | undefined) || (u.user_metadata?.picture as string | undefined);
      }
    } catch { /* ignore */ }

    // Candidat de pseudo : pseudo explicite → slug du nom → préfixe email → user_xxxxxx
    const candidate =
      (metaPseudo && metaPseudo.trim()) ||
      (metaName && slugify(metaName)) ||
      (metaEmail && slugify(metaEmail.split("@")[0])) ||
      `user_${user_id.slice(0, 6)}`;
    const basePseudo = candidate || `user_${user_id.slice(0, 6)}`;

    // ── Profil déjà présent ? ──
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, pseudo")
      .eq("id", user_id)
      .maybeSingle();

    if (existing) {
      // Pseudo déjà valide → rien à faire
      if (existing.pseudo && String(existing.pseudo).trim()) {
        return Response.json({ ok: true, created: false, profile: existing });
      }
      // Profil existe mais SANS pseudo → on le répare (avec gestion conflit)
      let tryPseudo = basePseudo;
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: updated, error } = await supabase
          .from("profiles")
          .update({ pseudo: tryPseudo })
          .eq("id", user_id)
          .select("id, pseudo")
          .maybeSingle();
        if (!error) {
          return Response.json({ ok: true, created: false, healed: true, profile: updated });
        }
        if (error.code === "23505") {
          tryPseudo = `${basePseudo}_${Math.floor(Math.random() * 9999)}`;
          continue;
        }
        return Response.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
      }
      return Response.json({ ok: false, error: "Trop de conflits de pseudo" }, { status: 500 });
    }

    // ── Sinon, insertion du profil (avec gestion conflit de pseudo) ──
    let insertPseudo = basePseudo;
    for (let attempt = 0; attempt < 6; attempt++) {
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
      if (error.code === "23505" && error.message?.includes("pseudo")) {
        insertPseudo = `${basePseudo}_${Math.floor(Math.random() * 9999)}`;
        continue;
      }
      return Response.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
    }
    return Response.json({ ok: false, error: "Trop de conflits de pseudo" }, { status: 500 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
