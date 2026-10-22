/* ════════════════════════════════════════════════════════════════════
   Les favoris de la nutrition : ce qu'est un favori, et les règles qui ne
   dépendent ni de la base ni de l'écran (Louis, 2026-10-23, maquette
   « Les favoris » : « garde-les dans mon compte »).

   Deux sortes, une table (`favoris_nutrition`, propriétaire seulement) :
     · une RECETTE de la banque, retrouvée par son identifiant. Une
       recette qui a quitté la banque ne s'affiche plus : on ne montre pas
       une fiche qu'on ne sait plus ouvrir ;
     · un PLAT qu'on remet souvent, retrouvé par son nom comparable
       (`nomComparable`), avec ses macros de la dernière fois.

   ⚠️ LES PLATS « ÉPINGLÉS » D'AVANT SONT DES FAVORIS. L'appui long dans
   « Ajouter un repas » les rangeait sur l'appareil
   (`vaiiya_pinned_meals_<id>`). Ils entrent dans le compte à la première
   ouverture (`epinglesAReprendre`), puis la clé est oubliée.
   ════════════════════════════════════════════════════════════════════ */

import { RECIPES, type Recipe } from "@/lib/recipeBank";
import { nomComparable, type RecentMeal } from "@/lib/repas";

export type SorteFavori = "recette" | "plat";

/** Un favori, tel que l'écran le garde. */
export type Favori = {
  sorte: SorteFavori;
  cle: string;
  nom: string;
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fats: number | null;
  /** ISO. Le plus récent passe devant. */
  ajouteLe: string;
};

/** Le même plafond que la base (`favoris_nutrition_plafond`). */
export const PLAFOND_FAVORIS = 500;

/** La longueur que la base accepte pour une clé et pour un nom. */
const LONGUEUR = 160;

const texte = (v: unknown): string => (typeof v === "string" ? v.trim().slice(0, LONGUEUR) : "");
const macro = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
};

/** La clé d'un plat : son nom comparable, à la longueur que la base accepte. */
export const clePlat = (nom: string) => nomComparable(nom).slice(0, LONGUEUR);

export function favoriDeRecette(r: Recipe, ajouteLe: string): Favori {
  return { sorte: "recette", cle: r.id, nom: texte(r.nom) || r.id, calories: null, proteins: null, carbs: null, fats: null, ajouteLe };
}

export function favoriDePlat(r: RecentMeal, ajouteLe: string): Favori {
  return {
    sorte: "plat", cle: clePlat(r.name), nom: texte(r.name),
    calories: macro(r.calories) ?? 0, proteins: macro(r.proteins) ?? 0,
    carbs: macro(r.carbs) ?? 0, fats: macro(r.fats) ?? 0,
    ajouteLe,
  };
}

/** Un favori lu (en base ou dans la copie de l'appareil), ou `null` s'il ne ressemble à rien. */
export function favoriLu(v: unknown): Favori | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const sorte = o.sorte === "recette" || o.sorte === "plat" ? o.sorte : null;
  const cle = texte(o.cle);
  const nom = texte(o.nom);
  if (!sorte || !cle || !nom) return null;
  const quand = typeof o.created_at === "string" ? o.created_at : typeof o.ajouteLe === "string" ? o.ajouteLe : "";
  return {
    sorte, cle, nom,
    calories: macro(o.calories), proteins: macro(o.proteins), carbs: macro(o.carbs), fats: macro(o.fats),
    ajouteLe: quand,
  };
}

/** La ligne à écrire en base. */
export function ligneFavori(uid: string, f: Favori) {
  return {
    user_id: uid, sorte: f.sorte, cle: f.cle, nom: f.nom,
    calories: f.calories, proteins: f.proteins, carbs: f.carbs, fats: f.fats,
  };
}

/** Le plus récent d'abord, puis par nom : le même ordre partout. */
export function trierFavoris(favoris: Favori[]): Favori[] {
  return [...favoris].sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe) || a.nom.localeCompare(b.nom, "fr"));
}

const PAR_ID = new Map(RECIPES.map((r) => [r.id, r]));

/** Les recettes favorites, dans l'ordre des favoris. */
export function recettesFavorites(favoris: Favori[]): Recipe[] {
  return favoris
    .filter((f) => f.sorte === "recette")
    .map((f) => PAR_ID.get(f.cle))
    .filter((r): r is Recipe => !!r);
}

/** Les plats favoris, prêts à être remis en un geste. */
export function platsFavoris(favoris: Favori[]): RecentMeal[] {
  return favoris
    .filter((f) => f.sorte === "plat")
    .map((f) => ({ name: f.nom, calories: f.calories ?? 0, proteins: f.proteins ?? 0, carbs: f.carbs ?? 0, fats: f.fats ?? 0 }));
}

/** Les plats proposés : les favoris d'abord, puis les derniers repas qui
 *  n'en sont pas. Trois rangées de trois au moins, tous les favoris au plus. */
export function platsProposes(favoris: RecentMeal[], recents: RecentMeal[], min = 9): RecentMeal[] {
  const cles = new Set(favoris.map((p) => clePlat(p.name)));
  return [...favoris, ...recents.filter((r) => !cles.has(clePlat(r.name)))].slice(0, Math.max(min, favoris.length));
}

/** « 6 recettes · 3 plats », sans ce qui vaut zéro. Le nombre ne se
 *  sépare jamais de son mot (espace insécable). */
export function compteFavoris(recettes: number, plats: number): string {
  const parts: string[] = [];
  if (recettes > 0) parts.push(`${recettes} recette${recettes > 1 ? "s" : ""}`);
  if (plats > 0) parts.push(`${plats} plat${plats > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

/** Les plats épinglés sur l'appareil, lus sans faire confiance au contenu. */
export function epinglesAReprendre(brut: string | null): RecentMeal[] {
  if (!brut) return [];
  let v: unknown;
  try { v = JSON.parse(brut); } catch { return []; }
  if (!Array.isArray(v)) return [];
  const vus = new Set<string>();
  const plats: RecentMeal[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const name = texte(o.name);
    const cle = clePlat(name);
    if (!name || vus.has(cle)) continue;
    vus.add(cle);
    plats.push({
      name,
      calories: macro(o.calories) ?? 0, proteins: macro(o.proteins) ?? 0,
      carbs: macro(o.carbs) ?? 0, fats: macro(o.fats) ?? 0,
    });
  }
  return plats.slice(0, PLAFOND_FAVORIS);
}
