// ─────────────────────────────────────────────────────────────────────────────
// L'aura — système de rang personnel de Vaiiya
//
// L'EXP (« l'aura ») monte avec les actions. Barème validé avec Louis :
//   • Séance terminée      → +30
//   • Bonus série de séance → +5 après CHAQUE séance
//   • Connexion du jour    → +5
//   • Repas identifié      → +5   (dates FUTURES exclues : anti-triche)
//
// Pour démarrer sans migration SQL bloquante, l'EXP est DÉRIVÉE des vraies données
// (compte des séances / repas / jours actifs). On pourra persister une colonne
// `aura_points` plus tard pour la perf, sans changer l'interface publique d'ici.
// ─────────────────────────────────────────────────────────────────────────────

import type { createClient } from "@/lib/supabase";

type SB = ReturnType<typeof createClient>;

export const EXP_SEANCE = 30;
export const EXP_SEANCE_STREAK = 5; // bonus « série de séances » : +5 après chaque séance
export const EXP_CONNEXION = 5;
export const EXP_REPAS = 5;

// ── Reset global de l'aura ──
// L'EXP est dérivée des données : pour repartir tout le monde de 0, on ne compte
// QUE les actions (séances / repas / jours) à partir de cette date. Reculer cette
// date « rend » l'historique ; l'avancer = nouveau reset pour tout le monde.
export const AURA_EPOCH = "2026-07-22";

/** Un rang = un palier de l'aura. `min` = EXP minimale pour l'atteindre. */
export type Rang = {
  id: string;
  nom: string;
  min: number;
  /** Chemin du vrai logo PNG (détouré). Si absent/introuvable → repli SVG. */
  image?: string;
  /** Le néon de la gemme (dégradé) — repli SVG du composant GemmeRang. */
  neon: [string, string];
  /** La pierre (dégradé clair → foncé) — repli SVG. */
  pierre: [string, string, string];
};

// Rang 1 seul pour l'instant. Ajouter un rang = une entrée ici (logos + paliers
// fournis par Louis/Kisotil au fur et à mesure). Le thème de nommage est
// « la lumière qui monte » : Aurore → … → rang ultime.
export const RANGS: Rang[] = [
  {
    id: "aurore",
    nom: "Aurore",
    min: 0,
    image: "/rangs/aurore.png",
    neon: ["#E45FE4", "#B02FC0"],
    pierre: ["#FFD98A", "#E8930C", "#7a3d0a"],
  },
];

// Tant qu'il n'y a qu'un rang, on vise un palier « prochain rang » symbolique
// (le rang 2 arrivera avec son logo). Dès qu'un RANGS[1] existe, on utilise son `min`.
export const PALIER_PROVISOIRE = 200;

export type EtatAura = {
  exp: number;
  rang: Rang;
  /** EXP au début du rang courant. */
  seuilBas: number;
  /** EXP pour atteindre le rang suivant (ou PALIER_PROVISOIRE si dernier connu). */
  seuilHaut: number;
  /** EXP restante avant le rang suivant. */
  restant: number;
  /** Détail (pour l'affichage / debug). */
  detail: { seances: number; repas: number; jours: number; streak: number };
};

/** Décompose une EXP en rang courant + progression vers le suivant. */
export function etatDepuisExp(
  exp: number,
  detail: EtatAura["detail"] = { seances: 0, repas: 0, jours: 0, streak: 0 },
): EtatAura {
  // Rang courant = le dernier rang dont `min` <= exp.
  let idx = 0;
  for (let i = 0; i < RANGS.length; i++) {
    if (exp >= RANGS[i].min) idx = i;
  }
  const rang = RANGS[idx];
  const seuilBas = rang.min;
  const rangSuivant = RANGS[idx + 1];
  const seuilHaut = rangSuivant ? rangSuivant.min : Math.max(PALIER_PROVISOIRE, seuilBas + 1);
  const restant = Math.max(0, seuilHaut - exp);
  return { exp, rang, seuilBas, seuilHaut, restant, detail };
}

/**
 * Calcule l'aura d'un utilisateur à partir de ses données réelles.
 * Non bloquant : en cas d'erreur réseau, renvoie l'état à 0.
 */
export async function calculerAura(supabase: SB, userId: string): Promise<EtatAura> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [seancesRes, repasRes, joursRes, todayRes] = await Promise.all([
      // On ne compte que les actions à partir de AURA_EPOCH (reset global).
      supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", AURA_EPOCH),
      // Repas : dates >= époque ET <= aujourd'hui (les faux repas datés dans le
      // futur ne rapportent aucune EXP).
      supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("date", AURA_EPOCH).lte("date", today),
      supabase.from("daily_stats").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("date", AURA_EPOCH).lte("date", today),
      supabase.from("daily_stats").select("streak").eq("user_id", userId).eq("date", today).maybeSingle(),
    ]);

    const seances = seancesRes.count ?? 0;
    const repas = repasRes.count ?? 0;
    const jours = joursRes.count ?? 0;
    const streak = (todayRes.data?.streak as number | undefined) ?? 0;

    const exp =
      seances * (EXP_SEANCE + EXP_SEANCE_STREAK) + // séance +30, +5 de série à chaque séance
      repas * EXP_REPAS +
      jours * EXP_CONNEXION;

    return etatDepuisExp(exp, { seances, repas, jours, streak });
  } catch {
    return etatDepuisExp(0);
  }
}

/**
 * La série racontée comme une histoire (jamais un compteur froid).
 * Chaque jour = un chapitre. Le jour 0 = le tout début.
 */
export function histoireSerie(streak: number): { titre: string; sous: string } {
  if (streak <= 0) {
    return {
      titre: "Le début d'une grande histoire ✨",
      sous: "Ouvre le premier chapitre aujourd'hui",
    };
  }
  if (streak === 1) {
    return { titre: "Chapitre 1 — c'est parti 🔥", sous: "Reviens demain pour la suite" };
  }
  if (streak === 2) {
    return { titre: "Jour 2, te revoilà 👊", sous: "L'histoire continue — reviens demain pour le chapitre 3" };
  }
  if (streak < 7) {
    return { titre: `Jour ${streak}, ça devient une habitude`, sous: "Ne casse pas la série" };
  }
  if (streak === 7) {
    return { titre: "Une semaine. Chapitre 1 bouclé 🔥", sous: "Tu tiens le rythme" };
  }
  if (streak < 30) {
    return { titre: `${streak} jours d'affilée`, sous: "Ton histoire s'écrit, jour après jour" };
  }
  if (streak === 30) {
    return { titre: "Un mois. T'es plus le même 💪", sous: "Respect total" };
  }
  return { titre: `${streak} jours — une légende`, sous: "Continue d'écrire l'histoire" };
}
