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
export const EXP_BIENVENUE = 10; // coup de pouce d'inscription : +10 offerts à tout compte
export const EXP_MULTI_PREMIUM = 1.5; // les abonnés Premium gagnent l'EXP d'action ×1,5

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

// Ladder VALIDÉ par Louis le 2026-07-24 : 6 rangs « métaux » Bronze → Éternel.
// Ajouter/changer un rang = une entrée ici (image détourée dans public/rangs/
// + un `min`). Le composant lit ce tableau, tout suit automatiquement.
// Cadence de référence = un utilisateur engagé gagne ≈50 EXP/jour (connexion +5,
// 1 séance +35, 2 repas +10). Les seuils = 50 × le nombre de jours voulu :
//   Bronze  fini jour 1 (Argent = 50)  ·  Or  ~1 sem  ·  Platine  ~2 sem
//   Diamant ~1 mois ·  Éternel ~2,5 mois (sommet très dur, atteignable même
//   gratuitement avant la fin d'une saison de 3 mois).
// Les métaux qui ne tiennent pas ce rythme max mettent plus longtemps → c'est
// voulu, l'Éternel doit rester rare. Toutes les images sont détourées, fond
// transparent, nom versionné (casse le cache navigateur/SW).
export const RANGS: Rang[] = [
  {
    id: "bronze",
    nom: "Bronze",
    min: 0,
    image: "/rangs/bronze-v2.png",
    neon: ["#E8A05A", "#B0672A"],
    pierre: ["#F5C88A", "#B87333", "#5c3410"],
  },
  {
    id: "argent",
    nom: "Argent",
    min: 50, // fin du Bronze dès le 1er jour : 1 séance +35, connexion +5, repas +5, +10 de bienvenue
    image: "/rangs/argent-v2.png",
    neon: ["#DDE6F0", "#9AA6B8"],
    pierre: ["#F2F6FC", "#B8C2D0", "#6a7280"],
  },
  {
    id: "or",
    nom: "Or",
    min: 350, // ~1 semaine
    image: "/rangs/or-v2.png",
    neon: ["#FFDE7A", "#E8A015"],
    pierre: ["#FFE9A8", "#E8930C", "#7a4d08"],
  },
  {
    id: "platine",
    nom: "Platine",
    min: 700, // ~2 semaines
    image: "/rangs/platine-v2.png",
    neon: ["#CFF3EE", "#86CDC4"],
    pierre: ["#EAF8F5", "#A8D4CE", "#5c7472"],
  },
  {
    id: "diamant",
    nom: "Diamant",
    min: 1500, // ~1 mois
    image: "/rangs/diamant-v2.png",
    neon: ["#A8E0FF", "#5AA8E8"],
    pierre: ["#DBF0FF", "#8CC8F0", "#3a6a90"],
  },
  {
    id: "eternel",
    nom: "Éternel",
    min: 3750, // ~2,5 mois — le sommet, très dur, avant la fin de saison (3 mois)
    image: "/rangs/eternel-v2.png", // gemme d'or, monture violette gothique
    neon: ["#C9A8FF", "#8B5CF6"],
    pierre: ["#FFE9A8", "#E8A015", "#5a3a1a"],
  },
];

// Cap du DERNIER rang (Éternel) : c'est le sommet, il n'y a pas de « suivant ».
// Égal à son `min` → la jauge affiche l'Éternel comme accompli.
export const PALIER_PROVISOIRE = 3750;

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
    const [seancesRes, repasRes, joursRes, todayRes, profilRes] = await Promise.all([
      // On ne compte que les actions à partir de AURA_EPOCH (reset global).
      supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", AURA_EPOCH),
      // Repas : dates >= époque ET <= aujourd'hui (les faux repas datés dans le
      // futur ne rapportent aucune EXP).
      supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("date", AURA_EPOCH).lte("date", today),
      supabase.from("daily_stats").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("date", AURA_EPOCH).lte("date", today),
      supabase.from("daily_stats").select("streak").eq("user_id", userId).eq("date", today).maybeSingle(),
      // Statut Premium : les abonnés (et admins) gagnent l'EXP d'action ×1,5.
      supabase.from("profiles").select("is_premium, is_admin").eq("id", userId).maybeSingle(),
    ]);

    const seances = seancesRes.count ?? 0;
    const repas = repasRes.count ?? 0;
    const jours = joursRes.count ?? 0;
    const streak = (todayRes.data?.streak as number | undefined) ?? 0;
    const premium = !!(profilRes.data?.is_premium || profilRes.data?.is_admin);

    // Le bonus de bienvenue est un socle fixe ; le multiplicateur Premium ne
    // s'applique qu'à l'EXP GAGNÉE par les actions (séances / repas / connexions).
    const expActions =
      seances * (EXP_SEANCE + EXP_SEANCE_STREAK) + // séance +30, +5 de série à chaque séance
      repas * EXP_REPAS +
      jours * EXP_CONNEXION;
    const exp = EXP_BIENVENUE + Math.round(expActions * (premium ? EXP_MULTI_PREMIUM : 1));

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
