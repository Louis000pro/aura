import { compteAppelant, refusAuth } from "@/lib/apiAuth";
import { createAdminClient } from "@/lib/supabase-admin";
import { ajouterCartes, classerCollections } from "@/lib/classementCollection";

const prive = { headers: { "Cache-Control": "private, no-store" } };
const taille = 500;

/** Pagination explicite : ni les membres ni les ouvertures ne sont tronqués à 1 000 lignes. */
async function pages<T>(lire: (debut: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const tout: T[] = [];
  for (let debut = 0; ; debut += taille) {
    const { data, error } = await lire(debut);
    if (error) throw error;
    tout.push(...data ?? []);
    if (!data || data.length < taille) return tout;
  }
}

export async function GET(req: Request) {
  const compte = await compteAppelant(req);
  if (!compte) return refusAuth();
  const portee = new URL(req.url).searchParams.get("portee") ?? "tous";
  if (portee !== "tous" && portee !== "amis") return Response.json({ error: "portee_invalide" }, { ...prive, status: 400 });
  try {
    const db = createAdminClient();
    const profils = await pages(debut => db.from("profiles").select("id,pseudo,avatar_url")
      .or("is_banned.is.null,is_banned.eq.false").order("id").range(debut, debut + taille - 1).abortSignal(req.signal));
    const collections = new Map<string, Set<string>>(profils.map(p => [p.id, new Set<string>()]));
    for (const table of ["boosters_exercices", "boosters_illimites"] as const) {
      for (let debut = 0; ; debut += taille) {
        let lecture = db.from(table).select("user_id,cartes").order("user_id");
        lecture = table === "boosters_illimites"
          ? lecture.eq("cadence_3h", true).order("requete_id") : lecture.order("jour");
        const { data, error } = await lecture.range(debut, debut + taille - 1).abortSignal(req.signal);
        if (error) throw error;
        for (const ligne of data ?? []) {
          const collection = collections.get(ligne.user_id);
          if (collection) ajouterCartes(collection, ligne.cartes);
        }
        if (!data || data.length < taille) break;
      }
    }
    let membres = profils;
    if (portee === "amis") {
      const [suivis, abonnes] = await Promise.all([
        pages(debut => db.from("followers").select("following_id").eq("follower_id", compte.id)
          .order("following_id").range(debut, debut + taille - 1).abortSignal(req.signal)),
        pages(debut => db.from("followers").select("follower_id").eq("following_id", compte.id)
          .order("follower_id").range(debut, debut + taille - 1).abortSignal(req.signal)),
      ]);
      const retour = new Set(abonnes.map(p => p.follower_id));
      const amis = new Set(suivis.filter(p => retour.has(p.following_id)).map(p => p.following_id));
      membres = profils.filter(p => p.id === compte.id || amis.has(p.id));
    }
    return Response.json({ liste: classerCollections(membres, collections, compte.id) }, prive);
  } catch {
    return Response.json({ error: "classement_indisponible" }, { ...prive, status: 503 });
  }
}
