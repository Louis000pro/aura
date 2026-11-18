import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { COOKIE_PARRAINAGE, DUREE_PARRAINAGE, lireInvitation, signerInvitation } from "@/lib/parrainageServeur";
import { DEBUT_PARRAINAGE } from "@/lib/parrainage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const reponse = NextResponse.redirect(new URL("/premiers-pas", req.url));
  const destination = req.headers.get("sec-fetch-dest");
  if (destination && destination !== "document") return reponse;
  if (!/^[a-f0-9]{32}$/.test(code) || Date.now() < Date.parse(DEBUT_PARRAINAGE)) return reponse;
  try {
    const { data, error } = await createAdminClient().from("codes_parrainage").select("code").eq("code", code).maybeSingle();
    if (!error && data && !lireInvitation(req.cookies.get(COOKIE_PARRAINAGE)?.value)) {
      reponse.cookies.set(COOKIE_PARRAINAGE, signerInvitation(code), { httpOnly: true, secure: process.env.NODE_ENV === "production",
        sameSite: "lax", path: "/", maxAge: DUREE_PARRAINAGE });
    }
  } catch { /* Une invitation indisponible ne bloque pas une inscription. */ }
  return reponse;
}
