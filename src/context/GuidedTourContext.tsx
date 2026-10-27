"use client";

/**
 * GuidedTourContext — État global de la visite guidée.
 *
 * Une visite = un parcours linéaire de N chapitres (cf. chapitres.tsx).
 * ⚠️ Le contexte n'importe PAS la liste des chapitres : elle tire les
 * scènes de la visite, et ce fichier est chargé par toutes les pages au
 * démarrage. C'est la visite qui déclare son nombre de chapitres en
 * montant (`declarerChapitres`).
 * Le context gère :
 *  - open/closed
 *  - chapitre courant (index 0..N-1)
 *  - next / prev / skip / start / close
 *  - persistance DB (profiles.tour_completed)
 *
 * La visite se lance dans deux cas :
 *  1. Après l'onboarding pour un nouvel utilisateur (auto, via OnboardingWrapper)
 *  2. Sur clic du bouton "Refaire la visite" dans /parametres (manuel)
 *
 * Elle ne navigue plus dans l'application (elle se joue en vase clos) :
 * on peut donc la lancer depuis n'importe quel écran sans le quitter.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type GuidedTourCtx = {
  isOpen: boolean;
  stepIndex: number;
  start: (opts?: { showPlansAfter?: boolean }) => void;
  next: () => void;
  prev: () => void;
  close: (markCompleted?: boolean) => void;
  /** La visite dit combien elle a de chapitres, une fois montée. */
  declarerChapitres: (n: number) => void;
};

const GuidedTourContext = createContext<GuidedTourCtx | null>(null);

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // Si true, on redirige vers les 3 offres à la fin de la visite (cas nouvelle inscription)
  const showPlansAfterRef = useRef(false);

  const totalRef = useRef(0);
  const declarerChapitres = useCallback((n: number) => { totalRef.current = n; }, []);

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

  /* ── Marquer comme terminé en DB ──
     L'identifiant passe par une variable : lire `user.id` dans le rappel
     ferait dépendre le React Compiler de `user` entier, et il renoncerait à
     optimiser ce fournisseur. */
  const uid = user?.id;
  const markCompleted = useCallback(async () => {
    if (!uid) return;
    const supabase = createClient();
    // Best-effort : si la colonne n'existe pas encore (migration pas appliquée), on ignore l'erreur silencieusement
    await supabase.from("profiles").update({ tour_completed: true }).eq("id", uid).then(
      () => {},
      () => {}
    );
  }, [uid]);

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
      if (i >= totalRef.current - 1) {
        // Visite menée à son terme → fermer, marquer, et montrer les offres
        // si c'est une inscription (on a montré la valeur avant le prix).
        setIsOpen(false);
        void markCompleted();
        goToPlansIfNeeded();
        return i;
      }
      return i + 1;
    });
  }, [markCompleted, goToPlansIfNeeded]);

  /* ── Précédent ── */
  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Le verrou de défilement vit dans GuidedTour.tsx (la coque) : c'est elle
  // qui sait quand l'écran plein est réellement monté.

  const valeur = useMemo(
    () => ({ isOpen, stepIndex, start, next, prev, close, declarerChapitres }),
    [isOpen, stepIndex, start, next, prev, close, declarerChapitres],
  );

  return (
    <GuidedTourContext.Provider value={valeur}>
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error("useGuidedTour must be used inside GuidedTourProvider");
  return ctx;
}

