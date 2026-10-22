"use client";

/* ════════════════════════════════════════════════════════════════════
   Les favoris de la nutrition, lus et écrits dans le compte
   (`favoris_nutrition`, propriétaire seulement ; les règles vivent dans
   lib/favorisNutrition).

   Une seule lecture par compte et par ouverture de l'app : l'état vit au
   niveau du module, et tous les écrans le lisent par
   `useSyncExternalStore` (la fiche recette, le fil, « Mes classiques »,
   « Ajouter un repas », « Mes favoris »). Un cœur touché change tout de
   suite partout, puis la base confirme ; si elle refuse, le cœur revient
   et l'écran le dit.

   ⚠️ « PAS ENCORE LU » N'EST PAS « AUCUN FAVORI ». Tant que la base n'a
   pas répondu (et sans copie sur l'appareil), `connu` vaut faux : les
   cœurs et la bande « Mes favoris » ne s'affichent pas. Un cœur vide sur
   un plat qui est peut-être un favori serait faux.

   La copie sur l'appareil (`vaiiya_favoris_<id>`) n'est qu'un cache :
   elle montre les cœurs avant la réponse et hors ligne, et elle est
   réécrite à chaque changement. La base reste la seule autorité.

   ⚠️ LES ÉCRITURES D'UN MÊME FAVORI SE SUIVENT, ET CHACUNE ÉCRIT L'ÉTAT
   VOULU. Deux touchers rapides (mettre, retirer) partent l'un après
   l'autre : la base finit d'accord avec l'écran. Et une lecture qui
   revient pendant qu'une écriture est en route garde le geste en cours.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase";
import type { Recipe } from "@/lib/recipeBank";
import type { RecentMeal } from "@/lib/repas";
import {
  PLAFOND_FAVORIS, clePlat, epinglesAReprendre, favoriDePlat, favoriDeRecette, favoriLu, ligneFavori,
  platsFavoris, recettesFavorites, trierFavoris, type Favori,
} from "@/lib/favorisNutrition";

/** Ce que la base a répondu à une écriture. */
export type ResultatFavori = "ok" | "plein" | "echec";

type Etat = { connu: boolean; favoris: Favori[] };
type Voulu = { favori: Favori | null };

const TABLE = "favoris_nutrition";
const COLONNES = "sorte, cle, nom, calories, proteins, carbs, fats, created_at";
const VIDE: Etat = { connu: false, favoris: [] };

const etats = new Map<string, Etat>();
const ecouteurs = new Set<() => void>();
const lectures = new Map<string, Promise<void>>();
/** Les gestes en route, par compte puis par favori (`sorte:cle`). */
const voulus = new Map<string, Map<string, Voulu>>();
/** La dernière écriture de chaque favori : la suivante l'attend. */
const files = new Map<string, Promise<unknown>>();

const cleCache = (uid: string) => `vaiiya_favoris_${uid}`;
const cleEpingles = (uid: string) => `vaiiya_pinned_meals_${uid}`;
const cleIndice = (uid: string) => `vaiiya_pin_hint_seen_${uid}`;
const cleFavori = (f: Pick<Favori, "sorte" | "cle">) => `${f.sorte}:${f.cle}`;

function abonner(prevenir: () => void) {
  ecouteurs.add(prevenir);
  return () => { ecouteurs.delete(prevenir); };
}

function poser(uid: string, favoris: Favori[]) {
  const tries = trierFavoris(favoris);
  etats.set(uid, { connu: true, favoris: tries });
  try { localStorage.setItem(cleCache(uid), JSON.stringify(tries)); } catch { /* navigation privée, quota */ }
  ecouteurs.forEach((f) => f());
}

/** Les gestes en route passent par-dessus ce que la base vient de dire. */
function avecGestes(uid: string, favoris: Favori[]): Favori[] {
  const gestes = voulus.get(uid);
  if (!gestes?.size) return favoris;
  const liste = favoris.filter((f) => !gestes.has(cleFavori(f)));
  for (const g of gestes.values()) if (g.favori) liste.push(g.favori);
  return liste;
}

function lireCache(uid: string): Favori[] | null {
  try {
    const brut = localStorage.getItem(cleCache(uid));
    if (!brut) return null;
    const v: unknown = JSON.parse(brut);
    return Array.isArray(v) ? v.map(favoriLu).filter((f): f is Favori => !!f) : null;
  } catch { return null; }
}

async function lire(uid: string): Promise<void> {
  const supabase = createClient();

  // 1. Les plats épinglés sur cet appareil entrent dans le compte, une fois.
  let epingles: RecentMeal[] = [];
  try { epingles = epinglesAReprendre(localStorage.getItem(cleEpingles(uid))); } catch { /* stockage bloqué */ }
  if (epingles.length) {
    const quand = new Date().toISOString();
    const { error } = await supabase.from(TABLE)
      .upsert(epingles.map((r) => ligneFavori(uid, favoriDePlat(r, quand))), { onConflict: "user_id,sorte,cle", ignoreDuplicates: true });
    if (error) console.warn("[favoris] reprise des épingles :", error.message);
    else {
      try { localStorage.removeItem(cleEpingles(uid)); localStorage.removeItem(cleIndice(uid)); } catch { /* rien à faire */ }
    }
  }

  // 2. La liste du compte. Une lecture ratée garde ce qu'on a et se refera.
  const { data, error } = await supabase.from(TABLE).select(COLONNES)
    .eq("user_id", uid).order("created_at", { ascending: false }).limit(PLAFOND_FAVORIS);
  if (error || !data) {
    console.warn("[favoris] lecture :", error?.message ?? "rien");
    lectures.delete(uid);
    return;
  }
  poser(uid, avecGestes(uid, data.map(favoriLu).filter((f): f is Favori => !!f)));
}

function charger(uid: string) {
  if (lectures.has(uid)) return;
  if (!etats.has(uid)) {
    const copie = lireCache(uid);
    if (copie) poser(uid, copie);
  }
  lectures.set(uid, lire(uid));
}

async function ecrire(uid: string, f: Favori, veut: boolean): Promise<ResultatFavori> {
  const supabase = createClient();
  const { error } = veut
    ? await supabase.from(TABLE).upsert(ligneFavori(uid, f), { onConflict: "user_id,sorte,cle", ignoreDuplicates: true })
    : await supabase.from(TABLE).delete().eq("user_id", uid).eq("sorte", f.sorte).eq("cle", f.cle);
  if (!error) return "ok";
  console.warn("[favoris] écriture :", error.message);
  return error.message.includes("favoris_pleins") ? "plein" : "echec";
}

/** Met ou retire un favori. L'écran change tout de suite ; `ecrit` dit ce
 *  que la base a répondu (en cas de refus, le favori est revenu). */
function basculer(uid: string, cible: Favori): { devient: boolean; ecrit: Promise<ResultatFavori> } {
  const cle = cleFavori(cible);
  const avant = etats.get(uid)?.favoris ?? [];
  const precedent = avant.find((f) => cleFavori(f) === cle) ?? null;
  const veut = !precedent;
  const sans = avant.filter((f) => cleFavori(f) !== cle);
  poser(uid, veut ? [cible, ...sans] : sans);

  let gestes = voulus.get(uid);
  if (!gestes) { gestes = new Map(); voulus.set(uid, gestes); }
  const geste: Voulu = { favori: veut ? cible : null };
  gestes.set(cle, geste);

  const file = `${uid}|${cle}`;
  const ecrit = (files.get(file) ?? Promise.resolve()).then(() => ecrire(uid, cible, veut));
  files.set(file, ecrit.catch(() => undefined));

  return {
    devient: veut,
    ecrit: ecrit.catch((): ResultatFavori => "echec").then((res) => {
      const encore = voulus.get(uid);
      // Un geste plus récent sur ce favori décide à sa place.
      if (encore?.get(cle) !== geste) return res;
      encore.delete(cle);
      if (res !== "ok") {
        const maintenant = (etats.get(uid)?.favoris ?? []).filter((f) => cleFavori(f) !== cle);
        poser(uid, precedent ? [precedent, ...maintenant] : maintenant);
      }
      return res;
    }),
  };
}

export function useFavorisNutrition(uid: string | null | undefined) {
  const etat = useSyncExternalStore(abonner, () => (uid ? etats.get(uid) ?? VIDE : VIDE), () => VIDE);
  useEffect(() => { if (uid) charger(uid); }, [uid]);

  const recettes = useMemo(() => recettesFavorites(etat.favoris), [etat.favoris]);
  const plats = useMemo(() => platsFavoris(etat.favoris), [etat.favoris]);
  const cles = useMemo(() => new Set(etat.favoris.map(cleFavori)), [etat.favoris]);

  const estRecette = useCallback((id: string) => cles.has(`recette:${id}`), [cles]);
  const estPlat = useCallback((nom: string) => cles.has(`plat:${clePlat(nom)}`), [cles]);

  const basculerRecette = useCallback((r: Recipe) => {
    if (!uid) return { devient: false, ecrit: Promise.resolve<ResultatFavori>("echec") };
    return basculer(uid, favoriDeRecette(r, new Date().toISOString()));
  }, [uid]);
  const basculerPlat = useCallback((r: RecentMeal) => {
    if (!uid) return { devient: false, ecrit: Promise.resolve<ResultatFavori>("echec") };
    return basculer(uid, favoriDePlat(r, new Date().toISOString()));
  }, [uid]);

  return { connu: etat.connu, recettes, plats, estRecette, estPlat, basculerRecette, basculerPlat };
}
