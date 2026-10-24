// ─────────────────────────────────────────────────────────────────────────────
// Les cartes de rang (Louis, 2026-10-24, maquette « Le passage de rang »).
//
// Une carte par rang atteint, gravée au pseudo avec la date du rang. Ce
// qu'elle écrit se lit en base, par `cartes_rang()` (migration
// 20261024_passage_de_rang.sql) : la date où l'EXP a passé le seuil, les
// séances faites jusque-là et les jours depuis l'inscription. Le calcul vit
// en base, comme toute l'aura : l'app ne refait jamais un cumul d'EXP.
//
// ⚠️ SANS LE SQL, LA CARTE RESTE VRAIE, ELLE EN DIT MOINS : le pseudo, le
// rang et le numéro de membre (lus dans `profiles`), sans date ni chiffres.
// Jamais une date devinée.
// ─────────────────────────────────────────────────────────────────────────────

import type { createClient } from "@/lib/supabase";
import { RANGS } from "@/lib/aura";
import { EVENEMENT_RANG_MONTE } from "@/lib/celebrationRang";

type SB = ReturnType<typeof createClient>;

export type DonneesCarte = {
  pseudo: string;
  numero?: number | null;
  /** `YYYY-MM-DD`, au jour parisien. */
  inscritLe?: string | null;
  atteintLe?: string | null;
  seances?: number | null;
  jours?: number | null;
};

export type CartesRang = {
  numero: number | null;
  inscritLe: string | null;
  /** Rang → ce que sa carte écrit. Seuls les rangs atteints y sont. */
  parRang: Record<string, { atteintLe: string | null; seances: number | null; jours: number | null }>;
  /** La base a répondu : les dates et les chiffres sont fiables. */
  complet: boolean;
};

/** La teinte d'une carte en miniature (une pastille de 14 px), par rang. */
export const TEINTE_CARTE: Record<string, string> = {
  bronze: "linear-gradient(160deg,#C98549,#5A2E10)",
  argent: "linear-gradient(160deg,#C9D2DE,#4A525E)",
  or: "linear-gradient(160deg,#FFD34E,#5A3F0A)",
  platine: "linear-gradient(160deg,#E4DEFA,#4B4868)",
  diamant: "linear-gradient(160deg,#A8D8FF,#0F2244)",
  eternel: "linear-gradient(160deg,#FFD36B,#2D1270)",
};

/** « 24 août 2026 », depuis `YYYY-MM-DD`. `null` si rien à écrire. */
export function dateLongue(jour?: string | null): string | null {
  if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** « 24 août », plus court, pour une légende sous une carte. */
export function dateCourteCarte(jour?: string | null): string | null {
  if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

const jourParis = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
};

/** Les cartes du compte connecté. `null` si rien n'a pu être lu du tout. */
export async function chargerCartes(supabase: SB, userId: string): Promise<CartesRang | null> {
  try {
    const { data, error } = await supabase.rpc("cartes_rang");
    if (!error && data && typeof data === "object") {
      const brut = data as {
        numero?: number | null;
        inscritLe?: string | null;
        cartes?: { rang?: string; atteintLe?: string | null; seances?: number | null; jours?: number | null }[];
      };
      const parRang: CartesRang["parRang"] = {};
      for (const c of brut.cartes ?? []) {
        if (!c.rang || !RANGS.some((r) => r.id === c.rang)) continue;
        parRang[c.rang] = {
          atteintLe: c.atteintLe ?? null,
          seances: c.seances ?? null,
          jours: c.jours ?? null,
        };
      }
      return { numero: brut.numero ?? null, inscritLe: brut.inscritLe ?? null, parRang, complet: true };
    }
  } catch { /* on tente le repli */ }

  // Le repli : ce que `profiles` montre déjà à tout le monde.
  try {
    const { data } = await supabase
      .from("profiles")
      .select("member_number, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    return {
      numero: (data.member_number as number | null) ?? null,
      inscritLe: jourParis(data.created_at as string | null),
      parRang: {},
      complet: false,
    };
  } catch {
    return null;
  }
}

/* Une lecture par compte et par ouverture de l'app : la scène, la
   visionneuse et le profil partagent la même. Une montée de rang l'oublie,
   puisqu'elle apporte une carte neuve. */
let cache: { userId: string; promesse: Promise<CartesRang | null> } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener(EVENEMENT_RANG_MONTE, () => { cache = null; });
}

export function cartesDuCompte(supabase: SB, userId: string): Promise<CartesRang | null> {
  if (cache?.userId === userId) return cache.promesse;
  const promesse = chargerCartes(supabase, userId).then((c) => {
    // Une lecture ratée ne se garde pas : la prochaine ouverture réessaie.
    if (c === null && cache?.promesse === promesse) cache = null;
    return c;
  });
  cache = { userId, promesse };
  return promesse;
}

/** Ce qu'écrit la carte d'un rang, pour un pseudo. */
export function donneesCarte(cartes: CartesRang | null, rangId: string, pseudo: string): DonneesCarte {
  const c = cartes?.parRang[rangId];
  return {
    pseudo,
    numero: cartes?.numero ?? null,
    inscritLe: cartes?.inscritLe ?? null,
    atteintLe: c?.atteintLe ?? null,
    seances: c?.seances ?? null,
    jours: c?.jours ?? null,
  };
}

/** Les rangs dont on a la carte, du plus haut au premier : tous ceux
 *  jusqu'au rang actuel (la base, quand elle répond, ne dit pas autre chose). */
export function rangsDesCartes(rangActuelId: string): string[] {
  const i = RANGS.findIndex((r) => r.id === rangActuelId);
  return RANGS.slice(0, Math.max(0, i) + 1).map((r) => r.id).reverse();
}
