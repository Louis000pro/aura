import type { SupabaseClient } from "@supabase/supabase-js";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";

const taillePage = 100;
const triMouvement = new Intl.Collator("fr");

export async function lireCollectionBoosters(client: SupabaseClient, userId: string, signal?: AbortSignal) {
  const collection = new Map<string, Carte>();
  for (const table of ["boosters_exercices", "boosters_illimites"]) {
    for (let debut = 0; ; debut += taillePage) {
      const lecture = client.from(table).select("cartes").eq("user_id", userId);
      const page = (table === "boosters_exercices"
        ? lecture.order("jour", { ascending: false })
        : lecture.order("ouvert_le", { ascending: false }).order("requete_id"))
        .range(debut, debut + taillePage - 1);
      const { data, error } = await (signal ? page.abortSignal(signal) : page);

      if (table === "boosters_illimites" && (error?.code === "PGRST205" || error?.code === "42P01")) break;
      if (error) throw error;

      for (const { cartes } of data) {
        if (!Array.isArray(cartes)) continue;
        for (const carte of cartes) {
          if (!carte || !Object.hasOwn(mouvements, carte.exercice) || !Object.hasOwn(raretes, carte.rarete)) continue;
          const { exercice, rarete } = carte as Carte;
          collection.set(exercice + ":" + rarete, { exercice, rarete });
        }
      }
      if (data.length < taillePage) break;
    }
  }

  return [...collection.values()].sort((a, b) =>
    triMouvement.compare(mouvements[a.exercice][0], mouvements[b.exercice][0]));
}
