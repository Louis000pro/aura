"use client";

/**
 * GuidedTour — Composant racine de la visite guidée.
 *
 * Lit l'état depuis le context, route entre TourSlide (intro/outro) et
 * TourSpotlight (étapes ancrées dans le DOM), et affiche la barre de
 * progression + bouton skip par-dessus.
 *
 * À monter une seule fois dans le layout root (sous le GuidedTourProvider).
 */

import { AnimatePresence } from "framer-motion";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { TOUR_STEPS } from "@/components/GuidedTour/steps";
import TourSlide from "@/components/GuidedTour/TourSlide";
import TourSpotlight from "@/components/GuidedTour/TourSpotlight";
import TourProgress from "@/components/GuidedTour/TourProgress";

export default function GuidedTour() {
  const { isOpen, stepIndex, totalSteps, next, close, goTo } = useGuidedTour();

  if (!isOpen) return null;
  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;

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
