"use client";

/**
 * GuidedTour — Composant racine de la visite guidée.
 *
 * Responsabilités :
 *  1. Lit l'état depuis le context (open, stepIndex)
 *  2. NAVIGUE vers step.route avant d'afficher le spotlight. La route peut inclure
 *     un query param (ex: "/progression?tab=mes-seances") qui pré-sélectionne le
 *     sous-onglet. La page Progression suit ce param via useSearchParams.
 *  3. Route entre TourSlide et TourSpotlight selon le type d'étape
 *  4. Affiche le bouton skip par-dessus
 *
 * À monter une seule fois dans le layout root.
 */

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { TOUR_STEPS } from "@/components/GuidedTour/steps";
import TourSlide from "@/components/GuidedTour/TourSlide";
import TourSpotlight from "@/components/GuidedTour/TourSpotlight";
import TourProgress from "@/components/GuidedTour/TourProgress";

/** Construit l'URL courante (path + query) pour comparaison avec step.route */
function buildCurrentUrl(pathname: string, search: URLSearchParams): string {
  const s = search.toString();
  return s ? `${pathname}?${s}` : pathname;
}

export default function GuidedTour() {
  const { isOpen, stepIndex, next, close } = useGuidedTour();
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

  if (!isOpen || !step) return null;

  /* ── Pendant la navigation : overlay sombre + spinner ── */
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
          <TourProgress onSkip={() => close(true)} />
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

        <TourProgress onSkip={() => close(true)} />
      </div>
    </AnimatePresence>
  );
}
