"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import OnboardingModal, { type OnboardingData } from "@/components/OnboardingModal";
import WelcomeCelebration from "@/components/WelcomeCelebration";
import { createClient } from "@/lib/supabase";
import { useGuidedTour, hasTourBeenCompleted } from "@/context/GuidedTourContext";

export default function OnboardingWrapper() {
  const { user, isNewUser, isLoading } = useAuth();
  const { start: startTour, isOpen: tourOpen } = useGuidedTour();

  const [showModal, setShowModal]             = useState(false);
  const [showBubble, setShowBubble]           = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [checked, setChecked]                 = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

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
    setWasAlreadyCompleted(completed);
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

    // Sauvegarde le contexte côté client (le coach IA s'en sert)
    try { localStorage.setItem(`vaiiya_ob_${user.id}`, JSON.stringify(data)); } catch { /* ignore */ }

    const isCompleted = !!(data.age && data.weight && data.gender && data.goals.length > 0 && data.level && data.sessionsPerWeek && data.mealsPerDay && data.diet);

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

    // Opt-in WhatsApp (facultatif) → table SÉPARÉE et privée (RLS owner-only),
    // jamais dans `profiles` qui est lisible par d'autres. On n'enregistre le
    // numéro QUE si le consentement est donné ET un numéro fourni, avec un
    // horodatage qui fait preuve d'opt-in (exigé RGPD + WhatsApp).
    const wOptin = !!(data.whatsapp && data.phone.trim());
    if (data.whatsapp || data.phone.trim()) {
      // Best-effort : si la migration n'est pas encore collée, l'erreur est
      // renvoyée (pas jetée) et n'interrompt pas la fin de l'onboarding.
      await supabase.from("user_contacts").upsert({
        user_id: user.id,
        phone: wOptin ? data.phone.trim() : null,
        whatsapp_optin: wOptin,
        whatsapp_optin_at: wOptin ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    setShowModal(false);
    if (!isCompleted) {
      // Champs incomplets → bulle visible
      setBubbleDismissed(false);
      setShowBubble(true);
    } else {
      setShowBubble(false);
      // Déclencher l'animation de célébration
      setShowCelebration(true);
    }
  };

  const handleSkip = () => {
    setShowModal(false);
    setShowCelebration(true);
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

      {/* ── Animation plein écran après sauvegarde ── */}
      <AnimatePresence>
        {showCelebration && (
          <WelcomeCelebration
            isFirstTime={!wasAlreadyCompleted}
            onDone={async () => {
              setShowCelebration(false);
              // Nouveau compte → on lance la visite guidée, qui se terminera sur les 3 offres
              // (on montre d'abord la valeur, puis le prix = meilleure conversion).
              if (!wasAlreadyCompleted && user?.id) {
                const alreadyDone = await hasTourBeenCompleted(user.id);
                if (!alreadyDone) {
                  // Court silence après la célébration, pour ne pas empiler
                  // deux plein-écrans d'un coup.
                  setTimeout(() => startTour({ showPlansAfter: true }), 500);
                  return;
                }
              }
              if (!bubbleDismissed) setShowBubble(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Bulle robot (objectifs non remplis) ── */}
      <AnimatePresence>
        {showBubble && !showModal && !tourOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.88 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-32 right-3 md:bottom-6 md:right-4 z-50 max-w-[220px]"
          >
            <div
              className="relative rounded-2xl px-4 py-3 shadow-xl"
              style={{
                background: "rgba(var(--surface-rgb),0.97)",
                border: "1.5px solid rgba(var(--violet-mid-rgb),0.7)",
                boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.22), 0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {/* Fermer */}
              <button
                onClick={() => { setShowBubble(false); setBubbleDismissed(true); }}
                className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center rounded-full cursor-pointer"
                style={{ background: "rgba(var(--text-3-rgb),0.15)", color: "var(--text-3)" }}
              >
                <X size={9} strokeWidth={2.5} />
              </button>

              {/* Contenu */}
              <div className="flex items-start gap-2 pr-3">
                <span className="text-xl leading-none mt-0.5 select-none">🤖</span>
                <p className="text-[12px] leading-snug" style={{ color: "var(--text-body)" }}>
                  N&apos;oublie pas de remplir tes{" "}
                  <button
                    onClick={() => { setShowBubble(false); setShowModal(true); }}
                    className="font-bold cursor-pointer underline underline-offset-2"
                    style={{ color: "#8B5CF6" }}
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
                  borderTop: "8px solid rgba(var(--surface-rgb),0.97)",
                  filter: "drop-shadow(0 2px 2px rgba(var(--accent-rgb),0.15))",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
