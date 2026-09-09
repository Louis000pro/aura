/* ════════════════════════════════════════════════════════════════════
   V9A · CE QUE LE GUIDE VOIT DU JOURNAL DU JOUR.

   Défaut réel, trouvé par Louis le 2026-09-09 en testant V9A : l'écran
   Nutrition affichait 286 kcal pour aujourd'hui, et le Guide répondait
   « aucun repas n'est encore enregistré pour aujourd'hui ». La ligne
   existait bel et bien en base, à la bonne date. Ce n'était donc pas une
   histoire de source : c'était la FRAÎCHEUR.

   ⚠️ C'EST EXACTEMENT LE DÉFAUT D'`ensureContext()` QUE V9A A REFUSÉ
   POUR LE MOTEUR, RESTÉ EN PLACE POUR LA NUTRITION. L'assistant charge
   son contexte UNE FOIS par session (`dataLoadedRef`) et ne relit
   jamais. Acceptable pour un âge ou une taille. Faux pour un journal
   alimentaire, qui change plusieurs fois par jour, et faux de la pire
   façon : le prompt dit alors « Calories : 0 kcal » et n'écrit aucune
   ligne « Repas du jour », donc le coach répond « aucun repas » en
   suivant correctement une consigne nourrie d'un état périmé. Le Guide
   n'invente pas, on lui a menti.

   ⚠️ CE MODULE NE DÉCIDE RIEN ET N'ÉCRIT RIEN. Une lecture, une seule,
   sur le jour courant. Le prompt du coach rend déjà ces faits (bloc
   « Statistiques du jour » et ligne « Repas du jour ») : on ne crée
   aucun second bloc, sinon il y aurait deux autorités sur le même
   chiffre. On remplace la part périmée, on n'empile pas.

   ⚠️ ET LE JOUR SE CALCULE COMME L'ÉCRIT L'ÉCRAN NUTRITION, c'est-à-dire
   en heure LOCALE (`localDateStr`, la convention documentée des colonnes
   `date` de `nutrition_logs`). L'assistant, lui, comparait cette colonne
   à `new Date().toISOString().slice(0, 10)`, donc au jour UTC : entre
   minuit et 2 h du matin en France, le Guide interrogeait la veille et
   ne voyait aucun des repas que l'écran affichait. Second défaut, plus
   étroit, de la même famille.

   ⚠️ IL N'Y AVAIT AUCUN ÉVÈNEMENT DE REPAS, contrairement au planning
   (`EVT_JOURNEE`). `EVT_NUTRITION` est donc créé ici, et `signalerRepas`
   est appelée par les huit écritures du journal (six sur l'écran
   Nutrition, deux depuis les cartes du Guide). Le banc vérifie qu'aucune
   écriture ne l'oublie : une seule oubliée, et le défaut revient sur ce
   chemin-là uniquement, c'est-à-dire de façon intermittente.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { localDateStr } from "@/lib/dates";

/** Émis après toute écriture du journal alimentaire (ajout, suppression).
 *  Même rôle qu'`EVT_JOURNEE` côté planning : il ne transporte rien, il
 *  dit seulement « ce que tu as lu n'est plus vrai ». */
export const EVT_NUTRITION = "nutrition-updated";

/** À appeler juste après une écriture réussie dans `nutrition_logs`. */
export function signalerRepas(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_NUTRITION));
}

/** Combien de repas au maximum partent dans le contexte du coach. C'est
 *  la borne qu'avait déjà `ensureContext` (`slice(0, 12)`) : un bloc de
 *  prompt qui grossirait avec la journée de quelqu'un ne serait plus un
 *  résumé. */
export const MAX_REPAS = 12;

export type RepasJour = {
  mealType: string | null;
  name: string;
  calories: number | null;
  proteins: number | null;
  time: string | null;
  description: string | null;
};

export type EtatNutrition = {
  /** Le jour LOCAL, celui que l'écran Nutrition écrit dans la colonne. */
  jour: string;
  repas: RepasJour[];
  calories: number;
  proteines: number;
};

/** La forme des repas telle que le contexte du coach la transporte déjà.
 *  On ne la change pas : le prompt sait la lire, et changer sa forme
 *  ferait une seconde écriture de la même chose. */
export type RepasDetail = {
  date: string;
  mealType?: string;
  name: string;
  calories?: number;
  proteins?: number;
  time?: string;
  description?: string | null;
};

/* ═══════════════════ La lecture, une et fraîche ═══════════════════ */

type LigneRepas = {
  meal_type: string | null;
  food_name: string | null;
  calories: number | null;
  proteins: number | null;
  time: string | null;
  description: string | null;
};

/** Le journal du jour, en UNE requête. Rend un état vide (et non `null`)
 *  quand la journée n'a rien : « je sais qu'il n'y a rien » et « je ne
 *  sais pas » ne se disent pas pareil, et seul `null` autorise le
 *  contexte de session à reprendre la main. */
export async function lireEtatNutrition(userId: string): Promise<EtatNutrition | null> {
  if (!userId) return null;
  const supabase = createClient();
  const jour = localDateStr();

  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("meal_type, food_name, calories, proteins, time, description")
    .eq("user_id", userId)
    .eq("date", jour)
    .order("time", { ascending: true });

  if (error) return null;

  const lignes = (data ?? []) as LigneRepas[];
  const repas: RepasJour[] = lignes.map((l) => ({
    mealType: l.meal_type,
    name: l.food_name ?? "Repas",
    calories: l.calories,
    proteins: l.proteins,
    time: l.time,
    description: l.description,
  }));

  return {
    jour,
    repas,
    calories: Math.round(lignes.reduce((s, l) => s + (l.calories ?? 0), 0)),
    proteines: Math.round(lignes.reduce((s, l) => s + (l.proteins ?? 0), 0)),
  };
}

/* ═══════════════════ Le cache, court et invalidé ═══════════════════ */

/** Assez court pour qu'un aller-retour dans l'app ne serve pas un état
 *  périmé, assez long pour qu'une rafale de messages ne relise pas dix
 *  fois la même chose. La vraie fraîcheur vient d'`EVT_NUTRITION`. */
export const TTL_NUTRITION_MS = 30_000;

let cache: { userId: string; a: number; etat: EtatNutrition | null } | null = null;
let branche = false;

/** Vide le cache. Appelée par `EVT_NUTRITION`, donc par toute écriture
 *  du journal alimentaire. */
export function invaliderNutrition(): void {
  cache = null;
}

function brancherEcoute(): void {
  if (branche || typeof window === "undefined") return;
  branche = true;
  window.addEventListener(EVT_NUTRITION, invaliderNutrition);
}

/**
 * Le journal du jour, mis en cache brièvement.
 *
 * `lire` n'existe que pour le banc : il permet de vérifier la fraîcheur
 * hors ligne, sur une app pourtant auth-gated, sans recopier la logique
 * de cache dans le test.
 */
export async function etatNutrition(
  userId: string,
  lire: (id: string) => Promise<EtatNutrition | null> = lireEtatNutrition,
): Promise<EtatNutrition | null> {
  if (!userId) return null;
  brancherEcoute();
  if (cache && cache.userId === userId && Date.now() - cache.a < TTL_NUTRITION_MS) return cache.etat;
  const etat = await lire(userId);
  cache = { userId, a: Date.now(), etat };
  return etat;
}

/* ═══════════════════ La fusion, pure ═══════════════════ */

/**
 * Remplace la part « aujourd'hui » du contexte de session par la lecture
 * fraîche, en gardant les jours précédents.
 *
 * ⚠️ Les repas d'aujourd'hui sont RETIRÉS puis réécrits, jamais fusionnés
 * ligne à ligne : un repas supprimé sur l'écran doit disparaître du
 * contexte, et il ne porte aucun identifiant ici pour qu'on puisse le
 * reconnaître. On remplace la journée entière, ou on ne touche à rien.
 *
 * ⚠️ Un état `null` (lecture ratée) laisse le contexte de session
 * intact : on ne remplace jamais une donnée par une absence de donnée.
 */
export function repasFrais(
  ancien: RepasDetail[] | undefined,
  etat: EtatNutrition | null,
): RepasDetail[] {
  if (!etat) return ancien ?? [];
  const autresJours = (ancien ?? []).filter((m) => m.date !== etat.jour);
  const aujourdhui: RepasDetail[] = etat.repas.map((r) => ({
    date: etat.jour,
    ...(r.mealType ? { mealType: r.mealType } : {}),
    name: r.name,
    ...(r.calories != null ? { calories: r.calories } : {}),
    ...(r.proteins != null ? { proteins: r.proteins } : {}),
    ...(r.time ? { time: r.time } : {}),
    description: r.description,
  }));
  // Aujourd'hui d'abord, comme le faisait le tri par date décroissante.
  return [...aujourdhui, ...autresJours].slice(0, MAX_REPAS);
}
