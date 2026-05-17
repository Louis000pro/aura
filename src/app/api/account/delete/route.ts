import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json() as { user_id: string };
    if (!user_id) return NextResponse.json({ ok: false, error: "Missing user_id" }, { status: 400 });

    // ── Vérification d'authentification ──────────────────────────────────────
    // L'appelant doit fournir son JWT et ne peut supprimer QUE son propre compte.
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token);
    if (authError || !caller) {
      return NextResponse.json({ ok: false, error: "Session invalide" }, { status: 401 });
    }
    if (caller.id !== user_id) {
      return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 403 });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
