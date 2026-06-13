"use client";

/**
 * GuidedTour — Orchestrateur de la visite guidée chapitrée.
 *
 * Scènes :
 *  · slide      → plein écran narratif (intro / outro)
 *  · ANNONCE    → quand une étape porte `chapter`, un écran d'annonce
 *                 (« ✦ Progression — Là où tout se mesure ») s'affiche ~2 s,
 *                 FUSIONNÉ à la transition de page : le temps de navigation
 *                 devient narration, zéro clic en plus. L'utilisateur sait
 *                 qu'il change d'univers.
 *  · spotlight  → couche persistante (key stable) : le trou de lumière
 *                 MORPHE d'un élément au suivant sur une même page.
 *  · navigation → transitions intra-chapitre (changement de sous-onglet) :
 *                 simple voile + ✦ pulsante, bref.
 *
 * Clavier : → suivant · ← précédent · Échap quitter.
 * Suspense : useSearchParams() impose un boundary en Next 14+.
 */

import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { TOUR_STEPS, type TourChapter } from "@/components/GuidedTour/steps";
import TourSlide from "@/components/GuidedTour/TourSlide";
import TourSpotlight from "@/components/GuidedTour/TourSpotlight";
import TourProgress from "@/components/GuidedTour/TourProgress";

/** Durée de l'annonce de chapitre (entrée + lecture + sortie gérée par exit) */
const CHAPTER_ANNOUNCE_MS = 2100;

/** URL courante (path + query) pour comparaison avec step.route */
function buildCurrentUrl(pathname: string, search: URLSearchParams): string {
  const s = search.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/* ── Écran d'annonce de chapitre ── */
function ChapterAnnounce({ chapter }: { chapter: TourChapter }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8"
      style={{
        background:
          "radial-gradient(120% 85% at 50% 45%, rgba(38,25,75,0.95) 0%, rgba(12,7,28,0.99) 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {/* ✦ d'ouverture */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontSize: 26,
          color: "#F5E6A3",
          textShadow: "0 0 22px rgba(245,230,163,0.55), 0 0 44px rgba(167,139,250,0.35)",
          marginBottom: 18,
        }}
      >
        ✦
      </motion.span>

      {/* Nom du chapitre */}
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
        className="text-center"
        style={{
          fontSize: "clamp(26px, 4.5vw, 36px)",
          fontWeight: 300,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          color: "#FFFFFF",
          textShadow: "0 2px 18px rgba(167,139,250,0.35)",
          margin: 0,
        }}
      >
        {chapter.name}
      </motion.h2>

      {/* Ligne gradient */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.24, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 64,
          height: 2,
          borderRadius: 2,
          margin: "16px 0",
          background: "linear-gradient(90deg, #A78BFA 0%, #F5E6A3 100%)",
          boxShadow: "0 0 12px rgba(167,139,250,0.5)",
        }}
      />

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.5, ease: "easeOut" }}
        className="text-center"
        style={{
          fontSize: 14.5,
          fontWeight: 300,
          color: "rgba(255,255,255,0.7)",
          letterSpacing: "0.01em",
          margin: 0,
        }}
      >
        {chapter.tagline}
      </motion.p>
    </motion.div>
  );
}

function GuidedTourInner() {
  const { isOpen, stepIndex, next, prev, close } = useGuidedTour();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [announcing, setAnnouncing] = useState(false);

  const step = isOpen ? TOUR_STEPS[stepIndex] : null;
  const chapter = step && step.type === "spotlight" ? step.chapter : undefined;
  const targetRoute = step?.route;
  const currentUrl = buildCurrentUrl(pathname, searchParams);
  const needsNavigation = !!(targetRoute && currentUrl !== targetRoute);

  /* ── Annonce de chapitre : timer au changement d'étape ── */
  useEffect(() => {
    if (!isOpen) return;
    const s = TOUR_STEPS[stepIndex];
    const ch = s && s.type === "spotlight" ? s.chapter : undefined;
    if (ch) {
      setAnnouncing(true);
      const t = setTimeout(() => setAnnouncing(false), CHAPTER_ANNOUNCE_MS);
      return () => clearTimeout(t);
    }
    setAnnouncing(false);
  }, [stepIndex, isOpen]);

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

  // L'annonce couvre la transition : tant que le timer court OU que la
  // navigation n'est pas terminée, l'écran de chapitre reste affiché.
  const showChapterAnnounce = !!chapter && (announcing || needsNavigation);

  return (
    <>
      <AnimatePresence mode="wait">
        {showChapterAnnounce ? (
          <ChapterAnnounce key={`chapter-${step.id}`} chapter={chapter!} />
        ) : needsNavigation ? (
          /* Transition intra-chapitre (sous-onglet) : voile + ✦ brève */
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
            breadcrumb={step.breadcrumb}
            shape={step.shape}
            padding={step.padding}
            tooltipPosition={step.tooltipPosition}
            softOverlay={step.softOverlay}
            secondaryAnchors={step.secondaryAnchors}
            canPrev={stepIndex > 0}
            onPrev={prev}
            onNext={next}
          />
        )}
      </AnimatePresence>

      {/* Bouton Passer — monté une seule fois */}
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
