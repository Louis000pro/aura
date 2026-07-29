"use client";

/**
 * GuidedTourContext — État global de la visite guidée.
 *
 * Une visite = un parcours linéaire de N chapitres (cf. chapitres.tsx).
 * Le context gère :
 *  - open/closed
 *  - chapitre courant (index 0..N-1)
 *  - next / prev / skip / start / close
 *  - persistance DB (profiles.tour_completed) + fallback localStorage
 *
 * La visite se lance dans deux cas :
 *  1. Après l'onboarding pour un nouvel utilisateur (auto, via OnboardingWrapper)
 *  2. Sur clic du bouton "Refaire la visite" dans /parametres (manuel)
 *
 * Elle ne navigue plus dans l'application (elle se joue en vase clos) :
 * on peut donc la lancer depuis n'importe quel écran sans le quitter.
 */

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { CHAPITRES } from "@/components/GuidedTour/chapitres";

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

  const totalSteps = CHAPITRES.length;

  /* ── Démarrer la visite ──
     La visite se joue par-dessus l'écran courant : aucune redirection,
     donc on ne perd jamais l'utilisateur là où il était. ── */
  const start = useCallback((opts?: { showPlansAfter?: boolean }) => {
    showPlansAfterRef.current = !!opts?.showPlansAfter;
    setStepIndex(0);
    setIsOpen(true);
  }, []);

  /* ── Fin de visite → montrer les offres si on vient de l'inscription.
        UNIQUEMENT quand la visite a été menée jusqu'au bout : quelqu'un qui
        vient de toucher « Passer » a dit non, lui coller le tarif dans la
        foulée est la pire réponse possible. ── */
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

  /* ── Fermer (« Passer » ou Échap) ──
        On retient qu'elle a été vue (on ne repropose pas ce qui a été
        refusé), mais on ne redirige nulle part : l'utilisateur reste là
        où il était. Seul `next` sur le dernier chapitre mène aux offres. ── */
  const close = useCallback((shouldMark = true) => {
    setIsOpen(false);
    if (shouldMark) void markCompleted();
    showPlansAfterRef.current = false;
  }, [markCompleted]);

  /* ── Suivant ── */
  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= totalSteps - 1) {
        // Visite menée à son terme → fermer, marquer, et montrer les offres
        // si c'est une inscription (on a montré la valeur avant le prix).
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

  // Le verrou de défilement vit dans GuidedTour.tsx (la coque) : c'est elle
  // qui sait quand l'écran plein est réellement monté.

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
