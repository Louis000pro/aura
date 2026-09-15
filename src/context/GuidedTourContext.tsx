"use client";

/**
 * GuidedTourContext — État global de la visite guidée.
 *
 * Une visite = un parcours linéaire de N chapitres (cf. chapitres.tsx).
 * Le context gère :
 *  - open/closed
 *  - chapitre courant (index 0..N-1)
 *  - next / prev / skip / start / close
 *  - la trace de l'achèvement sur le compte (profiles.tour_completed)
 *
 * ⚠️ ELLE NE SE LANCE JAMAIS TOUTE SEULE, ET CE COMMENTAIRE DISAIT LE CONTRAIRE.
 * Il annonçait un démarrage automatique « via OnboardingWrapper », un composant
 * supprimé le 2026-08-22 quand /bienvenue est devenu le seul questionnaire. Les
 * deux portes réelles sont toutes les deux des GESTES :
 *  1. « Découvrir Vaiiya », au bout du questionnaire (ParcoursBienvenue) ;
 *  2. « Refaire la visite », dans /parametres.
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

/* ⚠️ IL N'Y A PLUS DE REPÈRE LOCAL, ET C'EST VOULU.
   Il y avait ici `vaiiya_tour_completed`, écrit à la fin de la visite et lu par
   `hasTourBeenCompleted` — une fonction exportée que PERSONNE n'appelait
   (vérifié sur tout `src/`). Elle portait deux défauts, et le second est celui
   qui l'a fait partir : elle lisait ce repère AVANT la base, et ce repère
   n'était pas rattaché à un compte. Une personne qui avait fait la visite sur
   un appareil la déclarait donc faite pour TOUT compte créé ensuite sur le
   même appareil. C'est le même piège que les fonctions mortes retirées à la
   clôture du 2026-09-12 : un nom qu'on choisirait spontanément le jour où l'on
   voudra relancer la visite automatiquement.
   La visite ne se lance de toute façon jamais toute seule : elle se demande,
   à la sortie du questionnaire ou depuis les Paramètres. `profiles.tour_completed`
   continue d'être écrit — c'est un fait sur le compte, pas un cache d'appareil,
   et il vaut pour tous les appareils. Le jour où une relance automatique le
   lira, elle le lira LÀ. */

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

  /* ── Marquer comme terminé, sur le COMPTE ── */
  const markCompleted = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient();
    // Best-effort : si la colonne n'existe pas encore (migration pas appliquée), on ignore l'erreur silencieusement
    await supabase.from("profiles").update({ tour_completed: true }).eq("id", user.id).then(
      () => {},
      () => {}
    );
  }, [user?.id]);

  /* ── Fermer (« Passer » ou Échap) ──
        On retient qu'elle a été vue, et on ne redirige nulle part :
        l'utilisateur reste là où il était. Seul `next` sur le dernier
        chapitre mène aux offres — quelqu'un qui vient de toucher « Passer »
        a dit non, lui coller le tarif dans la foulée serait la pire
        réponse possible. ── */
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

