"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import { createClient } from "@/lib/supabase";

export default function OnboardingWrapper() {
  const { user, isNewUser, isLoading } = useAuth();

  const [showModal, setShowModal]       = useState(false);
  const [showBubble, setShowBubble]     = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [checked, setChecked]           = useState(false);

  /* ── Vérifier onboarding_completed en DB ── */
  const checkCompleted = async () => {
    if (!user?.id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const completed = data?.onboarding_completed === true;
    setChecked(true);

    if (!completed) {
      if (isNewUser) {
        setTimeout(() => setShowModal(true), 800);
      } else {
        if (!bubbleDismissed) setShowBubble(true);
      }
    } else {
      setShowBubble(false);
    }
  };

  useEffect(() => {
    if (!user?.id || isLoading) return;
    void checkCompleted();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading, isNewUser]);

  // Ré-écouter si les objectifs sont réinitialisés depuis parametres
  useEffect(() => {
    const handler = () => { setBubbleDismissed(false); void checkCompleted(); };
    window.addEventListener("aura:objectives-reset", handler);
    return () => window.removeEventListener("aura:objectives-reset", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleComplete = async (data: OnboardingData) => {
    if (!user) return;

    const isCompleted = !!(data.age && data.height && data.weight && data.gender && data.goals.length > 0 && data.level && data.sessionsPerWeek && data.mealsPerDay && data.diet);

    const supabase = createClient();
    await supabase.from("profiles").upsert({
      id:                       user.id,
      onboarding_age:           data.age           ? parseInt(data.age)            : null,
      onboarding_height:        data.height        ? parseInt(data.height)         : null,
      onboarding_weight:        data.weight        ? parseFloat(data.weight)       : null,
      onboarding_gender:        data.gender        || null,
      onboarding_goals:         data.goals.length  ? data.goals                   : null,
      onboarding_level:         data.level         || null,
      onboarding_sessions_week: data.sessionsPerWeek ? parseInt(data.sessionsPerWeek) : null,
      onboarding_meals_day:     data.mealsPerDay   ? parseInt(data.mealsPerDay)   : null,
      onboarding_diet:          data.diet          || null,
      onboarding_completed:     isCompleted,
    }, { onConflict: "id" });

    setShowModal(false);
    if (!isCompleted) {
      // Champs incomplets → bulle visible
      setBubbleDismissed(false);
      setShowBubble(true);
    } else {
      setShowBubble(false);
    }
  };

  const handleSkip = () => {
    setShowModal(false);
    // Si l'utilisateur passe, on montre quand même la bulle
    if (!bubbleDismissed) setShowBubble(true);
  };

  if (!user || !checked) return null;

  return (
    <>
      {/* ── Modal onboarding (inscription uniquement) ── */}
      <AnimatePresence>
        {showModal && (
          <OnboardingModal
            pseudo={user.pseudo}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )}
      </AnimatePresence>

      {/* ── Bulle robot (objectifs non remplis) ── */}
      <AnimatePresence>
        {showBubble && !showModal && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.88 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-24 right-4 z-50 max-w-[220px]"
          >
            <div
              className="relative rounded-2xl px-4 py-3 shadow-xl"
              style={{
                background: "rgba(255,255,255,0.97)",
                border: "1.5px solid rgba(212,192,255,0.7)",
                boxShadow: "0 8px 32px rgba(167,139,250,0.22), 0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {/* Fermer */}
              <button
                onClick={() => { setShowBubble(false); setBubbleDismissed(true); }}
                className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center rounded-full cursor-pointer"
                style={{ background: "rgba(160,174,192,0.15)", color: "#A0AEC0" }}
              >
                <X size={9} strokeWidth={2.5} />
              </button>

              {/* Contenu */}
              <div className="flex items-start gap-2 pr-3">
                <span className="text-xl leading-none mt-0.5 select-none">🤖</span>
                <p className="text-[12px] leading-snug" style={{ color: "#4A5568" }}>
                  N&apos;oublie pas de remplir tes{" "}
                  <button
                    onClick={() => { setShowBubble(false); setShowModal(true); }}
                    className="font-bold cursor-pointer underline underline-offset-2"
                    style={{ color: "#3B82F6" }}
                  >
                    objectifs
                  </button>
                  {" "}🎯
                </p>
              </div>

              {/* Flèche de bulle */}
              <div
                className="absolute -bottom-2 right-6"
                style={{
                  width: 0, height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderTop: "8px solid rgba(255,255,255,0.97)",
                  filter: "drop-shadow(0 2px 2px rgba(167,139,250,0.15))",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
