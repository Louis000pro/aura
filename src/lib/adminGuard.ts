/**
 * adminGuard.ts — la porte unique des routes d'administration.
 *
 * Même raisonnement que `garderIA` pour les routes IA : la vérification
 * « qui appelle, et a-t-il le droit ? » ne doit exister qu'à un seul endroit.
 * Elle était recopiée à l'identique dans `/api/admin/user` ; une deuxième
 * copie dans `/api/admin/stats` aurait suffi à les faire diverger un jour.
 *
 * Le droit se lit TOUJOURS en base (`profiles.is_admin`), jamais dans ce que
 * le client raconte de lui-même. Un jeton valide ne prouve que l'identité.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "./supabase-admin";

type Verdict =
  | { ok: true; admin: ReturnType<typeof createAdminClient>; userId: string }
  | { ok: false; reponse: NextResponse };

export async function exigerAdmin(req: Request): Promise<Verdict> {
  const admin = createAdminClient();

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, reponse: NextResponse.json({ error: "non_authentifié" }, { status: 401 }) };
  }

  const { data, error } = await admin.auth.getUser(token);
  const appelant = data?.user;
  if (error || !appelant) {
    return { ok: false, reponse: NextResponse.json({ error: "token_invalide" }, { status: 401 }) };
  }

  const { data: profil } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", appelant.id)
    .maybeSingle();

  if (!profil?.is_admin) {
    return { ok: false, reponse: NextResponse.json({ error: "accès_refusé" }, { status: 403 }) };
  }

  return { ok: true, admin, userId: appelant.id };
}
