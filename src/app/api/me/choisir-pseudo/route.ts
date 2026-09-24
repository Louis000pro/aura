import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { compteAppelant, refusAuth } from "@/lib/apiAuth";

/**
 * POST /api/me/choisir-pseudo  { pseudo }
 * En-tête : Authorization: Bearer <access_token>
 *
 * Pose le pseudo CHOISI par la personne (écran d'après première connexion
 * Google) et marque `pseudo_choisi = true`. Le compte vient du jeton, jamais
 * du corps : on n'écrit que sur son propre profil.
 */

// URL de profil = /profil/<pseudo>, donc on limite aux caractères sûrs.
const FORME = /^[A-Za-z0-9._-]{2,24}$/;

export async function POST(req: NextRequest) {
  try {
    const appelant = await compteAppelant(req);
    if (!appelant) return refusAuth();

    const body = await req.json().catch(() => ({}));
    const pseudo = typeof body?.pseudo === "string" ? body.pseudo.trim() : "";

    if (!FORME.test(pseudo)) {
      return Response.json(
        { error: "2 à 24 caractères : lettres, chiffres, point, tiret ou underscore." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Disponibilité insensible à la casse (le login résout le pseudo en
    // `ilike`, donc deux pseudos qui ne diffèrent que par la casse seraient
    // ambigus). On exclut son propre compte : reprendre son pseudo actuel est
    // permis.
    const { data: pris } = await admin
      .from("profiles")
      .select("id")
      .ilike("pseudo", pseudo)
      .neq("id", appelant.id)
      .limit(1)
      .maybeSingle();
    if (pris) {
      return Response.json({ error: "Ce pseudo est déjà pris." }, { status: 409 });
    }

    // On tente d'écrire pseudo + drapeau. Si la colonne `pseudo_choisi`
    // n'existe pas encore (migration non collée), on retente sans elle : le
    // pseudo se pose quand même.
    let { data, error } = await admin
      .from("profiles")
      .update({ pseudo, pseudo_choisi: true })
      .eq("id", appelant.id)
      .select("id, pseudo")
      .maybeSingle();

    if (error?.code === "42703") {
      ({ data, error } = await admin
        .from("profiles")
        .update({ pseudo })
        .eq("id", appelant.id)
        .select("id, pseudo")
        .maybeSingle());
    }

    if (error) {
      // Course rare : le pseudo a été pris entre la vérif et l'écriture.
      if (error.code === "23505") {
        return Response.json({ error: "Ce pseudo est déjà pris." }, { status: 409 });
      }
      return Response.json({ error: "Enregistrement impossible. Réessaie." }, { status: 500 });
    }

    return Response.json({ ok: true, profile: data }, { status: 200 });
  } catch (e) {
    console.error("choisir-pseudo error:", e instanceof Error ? e.message : String(e));
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
