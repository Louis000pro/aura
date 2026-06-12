"use client";

/**
 * GuidedTour — Composant racine de la visite guidée.
 *
 * Responsabilités :
 *  1. Lit l'état depuis le context (open, stepIndex)
 *  2. NAVIGUE vers step.route avant d'afficher le spotlight (ainsi, quand on présente
 *     /progression, on est BIEN sur /progression et l'utilisateur voit la page derrière).
 *  3. Route entre TourSlide et TourSpotlight selon le type d'étape
 *  4. Affiche la barre de progression + bouton skip par-dessus
 *
 * À monter une seule fois dans le layout root.
 */

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { TOUR_STEPS } from "@/components/GuidedTour/steps";
import TourSlide from "@/components/GuidedTour/TourSlide";
import TourSpotlight from "@/components/GuidedTour/TourSpotlight";
import TourProgress from "@/components/GuidedTour/TourProgress";

export default function GuidedTour() {
  const { isOpen, stepIndex, totalSteps, next, close, goTo } = useGuidedTour();
  const router = useRouter();
  const pathname = usePathname();

  const step = isOpen ? TOUR_STEPS[stepIndex] : null;
  const targetRoute = step?.route;
  const needsNavigation = !!(targetRoute && pathname !== targetRoute);

  /* ── Navigation automatique vers la route de l'étape ── */
  useEffect(() => {
    if (!isOpen || !step || !targetRoute) return;
    if (pathname !== targetRoute) {
      router.push(targetRoute);
    }
  }, [isOpen, stepIndex, step, targetRoute, pathname, router]);

  if (!isOpen || !step) return null;

  /* ── Pendant la navigation : overlay sombre simple ── */
  if (needsNavigation) {
    return (
      <AnimatePresence>
        <motion.div
          key="navigating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(15,10,35,0.85)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            className="w-10 h-10 rounded-full border-2"
            style={{ borderColor: "rgba(212,192,255,0.3)", borderTopColor: "#A78BFA" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
          <TourProgress
            current={stepIndex}
            total={totalSteps}
            onSkip={() => close(true)}
            onDotClick={goTo}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <div key={step.id}>
        {step.type === "slide" ? (
          <TourSlide
            title={step.title}
            subtitle={step.subtitle}
            cta={step.cta}
            decoration={step.decoration}
            onNext={next}
          />
        ) : (
          <TourSpotlight
            anchorId={step.anchorId}
            title={step.title}
            description={step.description}
            shape={step.shape}
            padding={step.padding}
            tooltipPosition={step.tooltipPosition}
            softOverlay={step.softOverlay}
            onNext={next}
          />
        )}

        <TourProgress
          current={stepIndex}
          total={totalSteps}
          onSkip={() => close(true)}
          onDotClick={goTo}
        />
      </div>
    </AnimatePresence>
  );
}
