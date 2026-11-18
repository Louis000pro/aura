import { NextRequest, NextResponse } from "next/server";
import { compteAppelant, refusAuth } from "@/lib/apiAuth";
import { createAdminClient } from "@/lib/supabase-admin";
import { COOKIE_PARRAINAGE, lireInvitation } from "@/lib/parrainageServeur";
const prive = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  const compte = await compteAppelant(req);
  if (!compte) return refusAuth();
  try {
    const { data, error } = await createAdminClient().rpc("etat_parrainage", { p_user: compte.id });
    if (error || !data) throw new Error();
    return NextResponse.json(data, prive);
  } catch { return NextResponse.json({ error: "parrainage_indisponible" }, { ...prive, status: 503 }); }
}

export async function POST(req: NextRequest) {
  const compte = await compteAppelant(req);
  if (!compte) return refusAuth();
  const invitation = lireInvitation(req.cookies.get(COOKIE_PARRAINAGE)?.value);
  if (!invitation) return NextResponse.json({ valide: false, raison: "sans_invitation" }, prive);
  try {
    const { data, error } = await createAdminClient().rpc("valider_parrainage", {
      p_user: compte.id, p_code: invitation.code, p_arrivee: invitation.arrivee,
    });
    if (error || !data) throw new Error();
    const reponse = NextResponse.json(data, prive);
    if (data.valide || ["compte_non_eligible", "lien_expire"].includes(data.raison)) {
      reponse.cookies.set(COOKIE_PARRAINAGE, "", { path: "/", maxAge: 0 });
    }
    return reponse;
  } catch { return NextResponse.json({ error: "parrainage_indisponible" }, { ...prive, status: 503 }); }
}
