"use client";

/**
 * GuidedTourContext — État global de la visite guidée.
 *
 * Une visite = un parcours linéaire de N étapes (slides + spotlights).
 * Le context gère :
 *  - open/closed
 *  - step courant (index 0..N-1)
 *  - next / prev / skip / start / close
 *  - persistance DB (profiles.tour_completed) + fallback localStorage
 *
 * La visite se lance dans deux cas :
 *  1. Après l'onboarding pour un nouvel utilisateur (auto, via OnboardingWrapper)
 *  2. Sur clic du bouton "Refaire la visite" dans /parametres (manuel)
 */

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { TOUR_STEPS } from "@/components/GuidedTour/steps";

type GuidedTourCtx = {
  isOpen: boolean;
  stepIndex: number;
  totalSteps: number;
  start: (opts?: { showPlansAfter?: boolean }) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  close: (markCompleted?: boolean) => void;
};

const GuidedTourContext = createContext<GuidedTourCtx | null>(null);

const LS_KEY = "vaiiya_tour_completed";

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // Si true, on redirige vers les 3 offres à la fin de la visite (cas nouvelle inscription)
  const showPlansAfterRef = useRef(false);

  const totalSteps = TOUR_STEPS.length;

  /* ── Démarrer la visite ── */
  const start = useCallback((opts?: { showPlansAfter?: boolean }) => {
    showPlansAfterRef.current = !!opts?.showPlansAfter;
    setStepIndex(0);
    setIsOpen(true);
    // Toujours partir de la home pour que les ancres existent
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      router.push("/");
    }
  }, [router]);

  /* ── Fin de visite → montrer les 3 offres si on vient de l'inscription ── */
  const goToPlansIfNeeded = useCallback(() => {
    if (showPlansAfterRef.current) {
      showPlansAfterRef.current = false;
      router.push("/premium?welcome=1");
    }
  }, [router]);

  /* ── Marquer comme terminé en DB + localStorage ── */
  const markCompleted = useCallback(async () => {
    try { localStorage.setItem(LS_KEY, "true"); } catch { /* ignore */ }
    if (!user?.id) return;
    const supabase = createClient();
    // Best-effort : si la colonne n'existe pas encore (migration pas appliquée), on ignore l'erreur silencieusement
    await supabase.from("profiles").update({ tour_completed: true }).eq("id", user.id).then(
      () => {},
      () => {}
    );
  }, [user?.id]);

  /* ── Fermer ── */
  const close = useCallback((shouldMark = true) => {
    setIsOpen(false);
    if (shouldMark) { void markCompleted(); goToPlansIfNeeded(); }
  }, [markCompleted, goToPlansIfNeeded]);

  /* ── Suivant ── */
  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= totalSteps - 1) {
        // Dernière étape → fermer + marquer + (éventuellement) montrer les offres
        setIsOpen(false);
        void markCompleted();
        goToPlansIfNeeded();
        return i;
      }
      return i + 1;
    });
  }, [totalSteps, markCompleted, goToPlansIfNeeded]);

  /* ── Précédent ── */
  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  /* ── Aller à un index précis ── */
  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= totalSteps) return;
    setStepIndex(index);
  }, [totalSteps]);

  // NOTE : pas de verrou body.overflow ici — la visite doit pouvoir auto-scroller
  // vers les éléments présentés (catalogue, bibliothèque…). L'overlay SVG bloque
  // déjà les clics sur la page, et le spotlight suit le scroll en temps réel.

  return (
    <GuidedTourContext.Provider value={{ isOpen, stepIndex, totalSteps, start, next, prev, goTo, close }}>
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error("useGuidedTour must be used inside GuidedTourProvider");
  return ctx;
}

/**
 * Helper : a-t-on déjà vu la visite ?
 * Source de vérité : DB (profiles.tour_completed). Fallback localStorage.
 */
export async function hasTourBeenCompleted(userId: string): Promise<boolean> {
  // Fallback localStorage (immédiat, pas de réseau)
  try {
    if (localStorage.getItem(LS_KEY) === "true") return true;
  } catch { /* ignore */ }

  if (!userId) return false;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("tour_completed")
      .eq("id", userId)
      .maybeSingle();
    return data?.tour_completed === true;
  } catch {
    return false;
  }
}
