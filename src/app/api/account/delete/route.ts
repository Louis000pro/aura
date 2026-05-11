import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json() as { user_id: string };
    if (!user_id) return NextResponse.json({ ok: false, error: "Missing user_id" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
