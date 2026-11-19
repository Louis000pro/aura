import { compteAppelant, refusAuth } from "@/lib/apiAuth";
import { lireChoixVitrine, lireCollectionBoosters } from "@/lib/collectionBoosters";
import { createAdminClient } from "@/lib/supabase-admin";

const prive = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  if (!await compteAppelant(req)) return refusAuth();

  const membre = new URL(req.url).searchParams.get("membre");
  if (!membre || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(membre)) {
    return Response.json({ error: "profil_invalide" }, { ...prive, status: 400 });
  }

  try {
    const db = createAdminClient();
    const { data: profil, error } = await db.from("profiles").select("guide_id")
      .eq("id", membre).abortSignal(req.signal).maybeSingle();
    if (error) throw error;
    if (!profil) return Response.json({ error: "profil_introuvable" }, { ...prive, status: 404 });

    const guide = profil.guide_id === "nora" || profil.guide_id === "sasha" ? profil.guide_id : null;
    // La collection ne contient que les cartes distinctes. Les dates et les
    // identifiants des ouvertures restent dans les tables privées.
    const cartes = await lireCollectionBoosters(db, membre, req.signal);
    // La vitrine qu'il a choisie (trois clés de carte, rien d'autre de ses métadonnées ne sort).
    const { data: compte } = await db.auth.admin.getUserById(membre);
    const vitrine = lireChoixVitrine(compte?.user?.user_metadata?.vitrine_boosters);
    return Response.json({ cartes, guide, vitrine }, prive);
  } catch {
    return Response.json({ error: "collection_indisponible" }, { ...prive, status: 503 });
  }
}
