import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { supprimerCompte } from "@/lib/suppressionCompte";

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

    const res = await supprimerCompte(admin, user_id);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.raison }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
