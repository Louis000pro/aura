import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAuth } from "./fetchAuth";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";

const taillePage = 100;
const triMouvement = new Intl.Collator("fr");

/** Une carte de la collection, avec le nombre d'exemplaires tirés (les doublons). */
export type CarteDetenue = Carte & { n: number };

export const TOTAL_CARTES = Object.keys(mouvements).length * Object.keys(raretes).length;
export const ORDRE_RARETES: Carte["rarete"][] = ["commune", "rare", "epique", "legendaire", "chromatique"];
export const POINTS_RARETE: Record<Carte["rarete"], number> = { commune: 1, rare: 2, epique: 5, legendaire: 10, chromatique: 25 };
export const cleCarte = (carte: Carte) => carte.exercice + ":" + carte.rarete;

/** La vitrine choisie : trois clés de carte au plus, gardées dans les métadonnées du compte
 *  (`vitrine_boosters`). Une clé mal formée est ignorée ; celui qui regarde ne garde ensuite que
 *  les cartes vraiment détenues (`composerVitrine`). */
export const MAX_VITRINE = 3;
export function lireChoixVitrine(brut: unknown): string[] | null {
  if (!Array.isArray(brut)) return null;
  const cles = brut.filter((c): c is string => typeof c === "string" && /^[a-z]+:(commune|rare|epique|legendaire|chromatique)$/.test(c));
  return [...new Set(cles)].slice(0, MAX_VITRINE);
}

export async function lireCollectionBoosters(client: SupabaseClient, userId: string, signal?: AbortSignal): Promise<CarteDetenue[]> {
  const collection = new Map<string, CarteDetenue>();
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
          const cle = exercice + ":" + rarete;
          const deja = collection.get(cle);
          if (deja) deja.n++;
          else collection.set(cle, { exercice, rarete, n: 1 });
        }
      }
      if (data.length < taillePage) break;
    }
  }

  return [...collection.values()].sort((a, b) =>
    triMouvement.compare(mouvements[a.exercice][0], mouvements[b.exercice][0]));
}

export type Collectionneur = {
  user_id: string; pseudo: string | null; avatar_url: string | null; points: number; cartes: number;
  commune: number; rare: number; epique: number; legendaire: number; chromatique: number; rang: number; moi: boolean;
};

/** Le serveur ne rend que les scores et les identités publiques, entre amis seulement
 * (Louis, 2026-11-27 : jamais le classement de tout Vaiiya). */
export async function lireClassement(_client: SupabaseClient, signal?: AbortSignal) {
  try {
    const reponse = await fetchAuth("/api/boosters/classement", { signal, cache: "no-store" });
    if (!reponse.ok) return null;
    const data = await reponse.json();
    return Array.isArray(data.liste) ? data.liste as Collectionneur[] : null;
  } catch {
    return null;
  }
}

export type Detenteurs = {
  total: number; membres: number; moi: number;
  amis: { user_id: string; pseudo: string | null; avatar_url: string | null; n: number }[];
  premier_le: string | null; premier_pseudo: string | null;
};

export async function lireDetenteurs(client: SupabaseClient, carte: Carte, signal?: AbortSignal) {
  const appel = client.rpc("detenteurs_carte", { p_exercice: carte.exercice, p_rarete: carte.rarete });
  const { data, error } = await (signal ? appel.abortSignal(signal) : appel);
  if (error || !data || typeof data !== "object") return null;
  return data as Detenteurs;
}

/** Les points d'une collection : chaque carte différente compte une fois. */
export const pointsCollection = (cartes: Carte[]) => cartes.reduce((n, c) => n + POINTS_RARETE[c.rarete], 0);
