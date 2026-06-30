/* ════════════════════════════════════════════════════════════════════
   Objectifs nutritionnels — calcul partagé (TDEE Harris-Benedict + macros).
   Utilisé par le Suivi nutrition ET les plats suggérés pour que l'objectif
   calorique affiché soit identique partout.
   ════════════════════════════════════════════════════════════════════ */

export type OnboardingProfile = {
  age?: string;
  weight?: string;
  height?: string;
  gender?: string;
  goals?: string[];
  level?: string;
  sessionsPerWeek?: string;
} | null;

export function calculateGoals(profile: OnboardingProfile) {
  const weight = parseFloat(profile?.weight ?? "0") || 75;
  const height = parseFloat(profile?.height ?? "0") || 175;
  const age    = parseFloat(profile?.age    ?? "0") || 25;
  const isFemale = (profile?.gender ?? "homme") === "femme";
  const goals  = profile?.goals ?? [];
  const level  = profile?.level ?? "Intermédiaire";

  // Harris-Benedict BMR
  const bmr = isFemale
    ? 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    : 88.362  + (13.397 * weight) + (4.799 * height) - (5.677 * age);

  // Activity multiplier basé sur le niveau + séances/semaine
  const sessionsPerWeek = parseInt(profile?.sessionsPerWeek ?? "3") || 3;
  let actMult = 1.375;
  if (level === "Débutant" || sessionsPerWeek <= 2) actMult = 1.2;
  else if (level === "Avancé" || sessionsPerWeek >= 5) actMult = 1.725;
  else if (sessionsPerWeek >= 4) actMult = 1.55;

  let tdee = Math.round(bmr * actMult);

  // Ajustement selon objectif
  const wantMasse = goals.includes("prise_de_masse");
  const wantPoids = goals.includes("perte_de_poids");
  if (wantMasse && !wantPoids) tdee += 300;
  else if (wantPoids && !wantMasse) tdee = Math.max(1200, tdee - 500);

  // Macros : protéines 1.8g/kg pour fitness, 1.2g sinon
  const wantsMuscle = wantMasse || goals.includes("force") || goals.includes("endurance");
  const proteinPerKg = wantsMuscle ? 1.8 : 1.2;
  const proteins = Math.round(weight * proteinPerKg);
  const fats     = Math.round((tdee * 0.28) / 9);
  const carbs    = Math.round((tdee - proteins * 4 - fats * 9) / 4);
  // estimated burn (rough: 5-8 kcal/min de séance, ~3 séances/sem ramenées au jour)
  const burned   = Math.round((sessionsPerWeek * 350) / 7);

  return { calories: tdee, proteins, carbs: Math.max(50, carbs), fats, burned };
}

/** Mappe une ligne `profiles` (colonnes onboarding_*) vers le format de calculateGoals. */
export function rowToProfile(d: Record<string, unknown> | null): OnboardingProfile {
  if (!d) return null;
  const s = (v: unknown) => (v != null && v !== "" ? String(v) : undefined);
  return {
    age: s(d.onboarding_age),
    weight: s(d.onboarding_weight),
    height: s(d.onboarding_height),
    gender: (d.onboarding_gender as string) ?? undefined,
    goals: (d.onboarding_goals as string[]) ?? [],
    level: (d.onboarding_level as string) ?? undefined,
    sessionsPerWeek: s(d.onboarding_sessions_week),
  };
}

/** Objectif depuis un profil + la DERNIÈRE pesée (qui prime sur le poids du profil).
    Source unique de la règle « se peser ajuste l'objectif » — partagée écran ⇄ IA. */
export function goalsFromProfile(profile: OnboardingProfile, latestWeightKg?: number | null) {
  const merged: OnboardingProfile =
    latestWeightKg != null ? { ...(profile ?? {}), weight: String(latestWeightKg) } : profile;
  return calculateGoals(merged);
}

/** Idem, mais depuis une ligne `profiles` brute (chemin IA, hors React). */
export function goalsFromRow(row: Record<string, unknown> | null, latestWeightKg?: number | null) {
  return goalsFromProfile(rowToProfile(row), latestWeightKg);
}
