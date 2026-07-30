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
import { goalsFromProfile, rowToProfile, type OnboardingProfile } from "@/lib/nutritionGoals";

const CACHE_PREFIX = "vaiiya_profile_cache_";

const PROFILE_COLS =
  "onboarding_age, onboarding_height, onboarding_weight, onboarding_gender, onboarding_goals, onboarding_level, onboarding_sessions_week";

/** Le profil corporel central (base d'abord, cache local pour l'affichage instantané). */
function useNutritionProfile(): OnboardingProfile {
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

/** Dernière pesée (weight_logs) = poids ACTUEL, source unique du poids.
    Se rafraîchit sur l'événement « vaiiya:weighin » (émis à chaque pesée) →
    l'objectif se recalcule en direct sans recharger la page. */
function useLatestWeight(): number | null {
  const { user } = useAuth();
  const [weight, setWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = () => {
      createClient()
        .from("weight_logs")
        .select("weight_kg")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled && data) setWeight((data as { weight_kg: number }).weight_kg);
        });
    };
    load();
    window.addEventListener("vaiiya:weighin", load);
    return () => { cancelled = true; window.removeEventListener("vaiiya:weighin", load); };
  }, [user?.id]);

  return weight;
}

/** Objectif du jour : profil central + DERNIÈRE pesée → { calories, proteins, carbs, fats, burned }.
    Se peser met donc à jour l'objectif automatiquement (le poids du jour prime). */
export function useNutritionGoals() {
  const profile = useNutritionProfile();
  const latestWeight = useLatestWeight();
  const goals = useMemo(() => goalsFromProfile(profile, latestWeight), [profile, latestWeight]);
  return { goals };
}
