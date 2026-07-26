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
import { isoWeekKey, parisDateStr, parisHour } from "@/lib/dates";

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

// ── Récompenses de rang ──
// Principe validé avec Louis : que du STATUT / COSMÉTIQUE, jamais du fonctionnel.
// On ne verrouille aucune fonction d'entraînement derrière un rang (tout le monde
// doit pouvoir s'entraîner). Grimper = débloquer de la fierté visible. Le Premium
// reste indépendant (×1,5 EXP) → ces récompenses sont gratuites et méritées.
// Chaque récompense se lit depuis `rang.id` déjà calculé : aucune migration SQL.
export type Recompense = {
  /** Emoji d'illustration de la récompense. */
  emoji: string;
  /** Titre court de ce qu'on débloque. */
  titre: string;
  /** Une ligne d'explication. */
  desc: string;
};

export const RECOMPENSE_RANG: Record<string, Recompense> = {
  bronze: {
    emoji: "🎁",
    titre: "Coup de pouce de bienvenue",
    desc: "+10 EXP offerts pour lancer ton aventure.",
  },
  argent: {
    emoji: "🏷️",
    titre: "Badge de rang",
    desc: "Ta gemme s'affiche à côté de ton pseudo, partout.",
  },
  or: {
    emoji: "🎨",
    titre: "Thème d'accent « Or »",
    desc: "Un habillage doré à activer dans les réglages.",
  },
  platine: {
    emoji: "💫",
    titre: "Anneau animé",
    desc: "Un halo qui tourne autour de ton avatar.",
  },
  diamant: {
    emoji: "📛",
    titre: "Titre + thème exclusif",
    desc: "Un titre sous ton pseudo et un 2ᵉ habillage.",
  },
  eternel: {
    emoji: "✨",
    titre: "Pseudo brillant + flair de champion",
    desc: "Ton pseudo scintille et brille en tête du classement.",
  },
};

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
  /** Progression réelle des missions sur la période parisienne courante. */
  missions: EtatMissionsAura;
};

export type ProgressionMission = {
  progress: number;
  target: number;
  complete: boolean;
  earned: boolean;
};

export type EtatMissionsAura = {
  today: {
    connexion: ProgressionMission;
    seance: ProgressionMission;
    repas: ProgressionMission;
  };
  premiumMissions: {
    double: ProgressionMission;
    matin: ProgressionMission;
    intense: ProgressionMission;
    nutrition: ProgressionMission;
    parfaite: ProgressionMission;
  };
};

const missionVide = (target: number): ProgressionMission => ({
  progress: 0,
  target,
  complete: false,
  earned: false,
});

export function missionsAuraVides(): EtatMissionsAura {
  return {
    today: {
      connexion: missionVide(1),
      seance: missionVide(1),
      repas: missionVide(1),
    },
    premiumMissions: {
      double: missionVide(2),
      matin: missionVide(1),
      intense: missionVide(5),
      nutrition: missionVide(3),
      parfaite: missionVide(7),
    },
  };
}

/** Décompose une EXP en rang courant + progression vers le suivant. */
export function etatDepuisExp(
  exp: number,
  detail: EtatAura["detail"] = { seances: 0, repas: 0, jours: 0, streak: 0 },
  missions: EtatMissionsAura = missionsAuraVides(),
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
  return { exp, rang, seuilBas, seuilHaut, restant, detail, missions };
}

/**
 * Calcule l'aura d'un utilisateur à partir de ses données réelles.
 * Non bloquant : en cas d'erreur réseau, renvoie l'état à 0.
 */
export async function calculerAura(supabase: SB, userId: string): Promise<EtatAura> {
  try {
    // Source de vérité après la migration 20260726_missions_aura.sql.
    // Le repli juste dessous garde l'app fonctionnelle tant que Louis ne l'a
    // pas encore collée dans Supabase.
    const { data: missionState, error: missionError } = await supabase
      .rpc("etat_missions_aura", { p_user: userId });
    if (!missionError && missionState && typeof missionState === "object") {
      const raw = missionState as {
        exp?: number;
        detail?: EtatAura["detail"];
        today?: EtatMissionsAura["today"];
        premiumMissions?: EtatMissionsAura["premiumMissions"];
      };
      const missions = missionsAuraVides();
      if (raw.today) missions.today = raw.today;
      if (raw.premiumMissions) missions.premiumMissions = raw.premiumMissions;
      return etatDepuisExp(
        Number(raw.exp ?? EXP_BIENVENUE),
        raw.detail ?? { seances: 0, repas: 0, jours: 0, streak: 0 },
        missions,
      );
    }

    const today = parisDateStr();
    const currentWeek = isoWeekKey(today);
    const [seancesRes, repasRes, joursRes, todayRes, profilRes] = await Promise.all([
      // On ne compte que les actions à partir de AURA_EPOCH (reset global).
      supabase.from("workout_sessions").select("id, started_at, duration_minutes").eq("user_id", userId).gte("started_at", AURA_EPOCH),
      // Repas : dates >= époque ET <= aujourd'hui (les faux repas datés dans le
      // futur ne rapportent aucune EXP).
      supabase.from("nutrition_logs").select("id, date, meal_type").eq("user_id", userId).gte("date", AURA_EPOCH).lte("date", today),
      supabase.from("daily_stats").select("id, date").eq("user_id", userId).gte("date", AURA_EPOCH).lte("date", today),
      supabase.from("daily_stats").select("streak").eq("user_id", userId).eq("date", today).maybeSingle(),
      // Statut Premium : les abonnés (et admins) gagnent l'EXP d'action ×1,5.
      supabase.from("profiles").select("is_premium, is_admin").eq("id", userId).maybeSingle(),
    ]);

    const now = Date.now();
    const sessions = ((seancesRes.data ?? []) as { started_at: string; duration_minutes: number | null }[])
      .filter((session) => {
        const startedAt = new Date(session.started_at);
        return startedAt.getTime() <= now && parisDateStr(startedAt) <= today;
      });
    const meals = (repasRes.data ?? []) as { date: string; meal_type: string }[];
    const days = (joursRes.data ?? []) as { date: string }[];
    const seanceDays = new Set(sessions.filter((s) => (s.duration_minutes ?? 0) >= 1).map((s) => parisDateStr(new Date(s.started_at))));
    const mealDays = new Set(meals.map((meal) => meal.date));
    const activeDays = new Set(days.map((day) => day.date));
    const seances = seanceDays.size;
    const repas = mealDays.size;
    const jours = activeDays.size;
    const streak = (todayRes.data?.streak as number | undefined) ?? 0;
    const premium = !!(profilRes.data?.is_premium || profilRes.data?.is_admin);
    const validToday = sessions.filter((session) =>
      (session.duration_minutes ?? 0) >= 5 &&
      parisDateStr(new Date(session.started_at)) === today
    );
    const validWeek = sessions.filter((session) =>
      (session.duration_minutes ?? 0) >= 5 &&
      isoWeekKey(parisDateStr(new Date(session.started_at))) === currentWeek
    );
    const coreMeals = new Set(
      meals
        .filter((meal) => meal.date === today)
        .map((meal) => {
          const type = meal.meal_type.toLowerCase();
          if (["petit-dejeuner", "petit-déjeuner", "breakfast"].includes(type)) return "matin";
          if (["dejeuner", "déjeuner", "lunch"].includes(type)) return "midi";
          if (["diner", "dîner", "dinner"].includes(type)) return "soir";
          return null;
        })
        .filter(Boolean),
    );
    const daysThisWeek = new Set([...activeDays].filter((date) => isoWeekKey(date) === currentWeek));
    const missions = missionsAuraVides();
    missions.today.connexion = progression(activeDays.has(today) ? 1 : 0, 1, activeDays.has(today));
    missions.today.seance = progression(seanceDays.has(today) ? 1 : 0, 1, seanceDays.has(today));
    missions.today.repas = progression(mealDays.has(today) ? 1 : 0, 1, mealDays.has(today));
    missions.premiumMissions.double = progression(validToday.length, 2, premium && validToday.length >= 2);
    missions.premiumMissions.matin = progression(
      validToday.some((session) => parisHour(new Date(session.started_at)) < 9) ? 1 : 0,
      1,
      premium && validToday.some((session) => parisHour(new Date(session.started_at)) < 9),
    );
    missions.premiumMissions.intense = progression(validWeek.length, 5, premium && validWeek.length >= 5);
    missions.premiumMissions.nutrition = progression(coreMeals.size, 3, premium && coreMeals.size >= 3);
    missions.premiumMissions.parfaite = progression(daysThisWeek.size, 7, premium && daysThisWeek.size >= 7);

    // Le bonus de bienvenue est un socle fixe ; le multiplicateur Premium ne
    // s'applique qu'à l'EXP GAGNÉE par les actions (séances / repas / connexions).
    const expActions =
      seances * (EXP_SEANCE + EXP_SEANCE_STREAK) + // séance +30, +5 de série à chaque séance
      repas * EXP_REPAS +
      jours * EXP_CONNEXION;
    const premiumExp = premium
      ? completedPeriodCount(sessions, "double", today) * 60 +
        completedPeriodCount(sessions, "matin", today) * 40 +
        completedWeekCount(sessions) * 50 +
        completedNutritionDays(meals) * 15 +
        completedPerfectWeeks(activeDays) * 35
      : 0;
    const exp = EXP_BIENVENUE + Math.round(expActions * (premium ? EXP_MULTI_PREMIUM : 1)) + premiumExp;

    return etatDepuisExp(exp, { seances, repas, jours, streak }, missions);
  } catch {
    return etatDepuisExp(0);
  }
}

function progression(progress: number, target: number, earned: boolean): ProgressionMission {
  const capped = Math.min(progress, target);
  return { progress: capped, target, complete: capped >= target, earned };
}

function completedPeriodCount(
  sessions: { started_at: string; duration_minutes: number | null }[],
  kind: "double" | "matin",
  maxDate: string,
): number {
  const grouped = new Map<string, { count: number; early: boolean }>();
  for (const session of sessions) {
    if ((session.duration_minutes ?? 0) < 5) continue;
    const date = new Date(session.started_at);
    const key = parisDateStr(date);
    if (key > maxDate) continue;
    const current = grouped.get(key) ?? { count: 0, early: false };
    current.count += 1;
    current.early ||= parisHour(date) < 9;
    grouped.set(key, current);
  }
  return [...grouped.values()].filter((group) => kind === "double" ? group.count >= 2 : group.early).length;
}

function completedWeekCount(
  sessions: { started_at: string; duration_minutes: number | null }[],
): number {
  const weeks = new Map<string, number>();
  for (const session of sessions) {
    if ((session.duration_minutes ?? 0) < 5) continue;
    const key = isoWeekKey(parisDateStr(new Date(session.started_at)));
    weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }
  return [...weeks.values()].filter((count) => count >= 5).length;
}

function completedNutritionDays(meals: { date: string; meal_type: string }[]): number {
  const days = new Map<string, Set<string>>();
  for (const meal of meals) {
    const type = meal.meal_type.toLowerCase();
    let core: string | null = null;
    if (["petit-dejeuner", "petit-déjeuner", "breakfast"].includes(type)) core = "matin";
    if (["dejeuner", "déjeuner", "lunch"].includes(type)) core = "midi";
    if (["diner", "dîner", "dinner"].includes(type)) core = "soir";
    if (!core) continue;
    const day = days.get(meal.date) ?? new Set<string>();
    day.add(core);
    days.set(meal.date, day);
  }
  return [...days.values()].filter((day) => day.size >= 3).length;
}

function completedPerfectWeeks(days: Set<string>): number {
  const weeks = new Map<string, number>();
  for (const day of days) {
    const key = isoWeekKey(day);
    weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }
  return [...weeks.values()].filter((count) => count >= 7).length;
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
