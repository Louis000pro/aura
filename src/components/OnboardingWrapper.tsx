"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import { createClient } from "@/lib/supabase";

export default function OnboardingWrapper() {
  const { user, isNewUser, isLoading } = useAuth();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show the modal when a brand-new user is detected
  useEffect(() => {
    if (!isLoading && isNewUser && user && !dismissed) {
      // Small delay so the page has time to render first
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, [isNewUser, user, isLoading, dismissed]);

  const handleComplete = async (data: OnboardingData) => {
    setShow(false);
    setDismissed(true);
    if (!user) return;

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        onboarding_age:            data.age ? parseInt(data.age) : null,
        onboarding_height:         data.height ? parseInt(data.height) : null,
        onboarding_weight:         data.weight ? parseFloat(data.weight) : null,
        onboarding_gender:         data.gender || null,
        onboarding_goals:          data.goals.length > 0 ? data.goals : null,
        onboarding_level:          data.level || null,
        onboarding_sessions_week:  data.sessionsPerWeek ? parseInt(data.sessionsPerWeek) : null,
        onboarding_meals_day:      data.mealsPerDay ? parseInt(data.mealsPerDay) : null,
        onboarding_diet:           data.diet || null,
        onboarding_completed:      true,
      })
      .eq("id", user.id);
  };

  const handleSkip = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {show && (
        <OnboardingModal
          pseudo={user.pseudo}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </AnimatePresence>
  );
}
