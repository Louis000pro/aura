"use client";

/* Ce qui n'est pas affiché au lancement ne se télécharge pas au lancement.

   Louis, 2026-10-20 : depuis l'icône de l'iPhone, l'app mettait plusieurs
   secondes à répondre. Le layout chargeait d'un bloc environ 2 Mo de
   JavaScript, dont la feuille de l'assistant, la visite guidée et le récap
   de mise à jour : trois écrans fermés à l'ouverture de l'app, mais que
   l'iPhone devait télécharger, analyser et exécuter avant que le premier
   bouton réponde. Ils arrivent maintenant en morceaux séparés, préchargés
   dès que le téléphone a fini de démarrer, donc ils sont prêts bien avant
   qu'on les ouvre.

   ⚠️ CelebrationRang et InvitationAvis restent chargés tout de suite : ils
   écoutent des évènements qui peuvent partir dès l'arrivée sur l'accueil
   (la montée de rang se constate au premier calcul de l'EXP). Chargés plus
   tard, ils rateraient leur moment. */

import dynamic from "next/dynamic";
import { useEffect } from "react";

const charger = {
  assistant: () => import("@/components/AssistantSheet"),
  visite: () => import("@/components/GuidedTour/GuidedTour"),
  nouveautes: () => import("@/components/maj/PopupNouveautes"),
  consentement: () => import("@/components/DemandeConsentement"),
};

export const AssistantSheetDiffere = dynamic(charger.assistant, { ssr: false });
export const GuidedTourDiffere = dynamic(charger.visite, { ssr: false });
export const PopupNouveautesDiffere = dynamic(charger.nouveautes, { ssr: false });
export const DemandeConsentementDiffere = dynamic(charger.consentement, { ssr: false });

/** Précharge tout ce qui est différé une fois l'app affichée et au repos, pour
 *  qu'aucun écran ne fasse attendre la première fois qu'on l'ouvre. */
export function PrechargeDifferes() {
  useEffect(() => {
    const lancer = () => {
      for (const f of Object.values(charger)) void f().catch(() => {});
      // Le lecteur de séance est le plus lourd de l'app : on le chauffe aussi.
      void import("@/components/WorkoutGuideModal").catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(lancer, { timeout: 2500 });
      return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(lancer, 1200);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
