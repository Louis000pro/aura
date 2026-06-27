"use client";

/* ════════════════════════════════════════════════════════════════════
   useNutritionGoals — LECTEUR CENTRAL de l'objectif nutritionnel.

   Source de vérité = la base (profiles.onboarding_*), la MÊME que lit l'IA.
   Avant, l'écran Nutrition lisait une copie « téléphone » (localStorage)
   qui n'était PAS mise à jour quand on modifiait son profil dans Paramètres
   → l'écran et l'IA pouvaient afficher des objectifs différents.

   Ici on lit la base (canonique) et on garde un petit cache local UNIQUEMENT
   pour l'affichage instantané au montage (corrigé dès que la base répond).
   Tout le monde (écran Nutrition, plats suggérés, IA) partage donc le même
   objectif. Voir aussi calculateGoals dans src/lib/nutritionGoals.ts.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { calculateGoals, type OnboardingProfile } from "@/lib/nutritionGoals";

const CACHE_PREFIX = "vaiiya_profile_cache_";

const PROFILE_COLS =
  "onboarding_age, onboarding_height, onboarding_weight, onboarding_gender, onboarding_goals, onboarding_level, onboarding_sessions_week";

/** Convertit une ligne `profiles` (colonnes onboarding_*) vers le format attendu par calculateGoals. */
function rowToProfile(d: Record<string, unknown> | null): OnboardingProfile {
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

/** Le profil corporel central (base d'abord, cache local pour l'affichage instantané). */
export function useNutritionProfile(): OnboardingProfile {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OnboardingProfile>(null);

  useEffect(() => {
    if (!user?.id) return;

    // 1) Cache local → paint instantané avec la dernière valeur connue.
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + user.id);
      if (raw) setProfile(JSON.parse(raw));
    } catch { /* ignore */ }

    // 2) Base = source de vérité → corrige + rafraîchit le cache.
    let cancelled = false;
    createClient()
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const p = rowToProfile(data as Record<string, unknown>);
        setProfile(p);
        try { localStorage.setItem(CACHE_PREFIX + user.id, JSON.stringify(p)); } catch { /* ignore */ }
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  return profile;
}

/** Objectif du jour calculé depuis le profil central : { calories, proteins, carbs, fats, burned }. */
export function useNutritionGoals() {
  const profile = useNutritionProfile();
  const goals = useMemo(() => calculateGoals(profile), [profile]);
  return { profile, goals };
}
