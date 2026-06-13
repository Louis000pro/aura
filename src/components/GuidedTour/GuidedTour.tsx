"use client";

/**
 * GuidedTour — Orchestrateur de la visite guidée.
 *
 * Principe de "scènes" :
 *  - slide      → plein écran narratif (intro / outro), crossfade entre elles
 *  - spotlight  → UNE seule couche persistante (key="spotlight") qui reste
 *                 montée tant que les étapes s'enchaînent sur la même page.
 *                 Le trou de lumière MORPHE d'un élément au suivant.
 *  - navigation → quand step.route diffère de l'URL courante, on pousse la
 *                 route et on affiche un voile sombre avec ✦ pulsante le temps
 *                 que la page se monte.
 *
 * Navigation clavier : → étape suivante · ← précédente · Échap quitter.
 *
 * Pourquoi le Suspense : useSearchParams() impose un boundary en Next 14+,
 * sinon le build statique échoue.
 */

import { Suspense, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { TOUR_STEPS } from "@/components/GuidedTour/steps";
import TourSlide from "@/components/GuidedTour/TourSlide";
import TourSpotlight from "@/components/GuidedTour/TourSpotlight";
import TourProgress from "@/components/GuidedTour/TourProgress";

/** URL courante (path + query) pour comparaison avec step.route */
function buildCurrentUrl(pathname: string, search: URLSearchParams): string {
  const s = search.toString();
  return s ? `${pathname}?${s}` : pathname;
}

function GuidedTourInner() {
  const { isOpen, stepIndex, totalSteps, next, prev, close } = useGuidedTour();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const step = isOpen ? TOUR_STEPS[stepIndex] : null;
  const targetRoute = step?.route;
  const currentUrl = buildCurrentUrl(pathname, searchParams);
  const needsNavigation = !!(targetRoute && currentUrl !== targetRoute);

  /* ── Navigation automatique vers la route de l'étape ── */
  useEffect(() => {
    if (!isOpen || !step || !targetRoute) return;
    if (currentUrl !== targetRoute) {
      router.push(targetRoute);
    }
  }, [isOpen, stepIndex, step, targetRoute, currentUrl, router]);

  /* ── Navigation clavier ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, next, prev, close]);

  if (!isOpen || !step) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {needsNavigation ? (
          /* ── Transition de page : voile + ✦ pulsante ── */
          <motion.div
            key="navigating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: "rgba(10,5,25,0.85)", backdropFilter: "blur(10px)" }}
          >
            <motion.span
              aria-hidden
              style={{
                fontSize: 34,
                color: "#F5E6A3",
                textShadow: "0 0 24px rgba(245,230,163,0.6), 0 0 48px rgba(167,139,250,0.4)",
              }}
              animate={{ opacity: [0.45, 1, 0.45], scale: [0.94, 1.08, 0.94] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
            >
              ✦
            </motion.span>
          </motion.div>
        ) : step.type === "slide" ? (
          <TourSlide
            key={step.id}
            title={step.title}
            subtitle={step.subtitle}
            cta={step.cta}
            decoration={step.decoration}
            onNext={next}
          />
        ) : (
          /* key STABLE → la couche persiste entre étapes spotlight = morphing */
          <TourSpotlight
            key="spotlight"
            anchorId={step.anchorId}
            title={step.title}
            description={step.description}
            shape={step.shape}
            padding={step.padding}
            tooltipPosition={step.tooltipPosition}
            softOverlay={step.softOverlay}
            stepNumber={stepIndex + 1}
            totalSteps={totalSteps}
            canPrev={stepIndex > 0}
            onPrev={prev}
            onNext={next}
          />
        )}
      </AnimatePresence>

      {/* Bouton Passer — monté une seule fois, pas de re-animation entre étapes */}
      <TourProgress onSkip={() => close(true)} />
    </>
  );
}

export default function GuidedTour() {
  return (
    <Suspense fallback={null}>
      <GuidedTourInner />
    </Suspense>
  );
}
