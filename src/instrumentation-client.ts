import posthog from "posthog-js";

/* ════════════════════════════════════════════════════════════════════
   PostHog — analytics produit (région EU).

   La clé ci-dessous est PUBLIQUE : posthog-js l'embarque dans le bundle
   navigateur par conception. Aucune donnée secrète ici (ne JAMAIS mettre
   une « Personal API key » dans ce fichier).

   Ce fichier s'exécute côté client AVANT l'hydratation React (convention
   Next 16 `instrumentation-client`). On n'active PostHog QU'EN build de
   production (preview Vercel + prod) → les sessions de `next dev` ne
   polluent pas le projet.

   RGPD : le session replay masque toutes les saisies par défaut, plus tout
   élément marqué `data-ph-mask`. ⚠️ Avant la PROD : prévoir le consentement
   (bandeau) + la mention dans la politique de confidentialité.
   ════════════════════════════════════════════════════════════════════ */

const POSTHOG_KEY = "phc_DmposFPQ55uUx6MbTsSNQfZWytNcZnqHLcUsbmWw9PXf";
const POSTHOG_HOST = "https://eu.i.posthog.com";

const ENABLED = process.env.NODE_ENV === "production" && typeof window !== "undefined";

if (ENABLED) {
  // try/catch : un échec d'analytics ne doit JAMAIS casser l'app (ce code
  // tourne avant l'hydratation React). Cf. doc Next `instrumentation-client`.
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,            // géré à la main (App Router → onRouterTransitionStart)
      capture_pageleave: true,
      person_profiles: "identified_only", // profil créé seulement pour les comptes identifiés (privacy + coût)
      session_recording: {
        maskAllInputs: true,                // masque TOUTE saisie : mot de passe, email, poids, mensurations…
        maskTextSelector: "[data-ph-mask]", // + tout élément qu'on marquera explicitement comme sensible
      },
    });
    posthog.capture("$pageview"); // premier affichage (chargement « dur »)
  } catch {
    /* analytics indispo → on ignore en silence */
  }
}

/* Navigations SPA (Next 16) → un pageview par changement de route. */
export function onRouterTransitionStart(url: string) {
  if (!ENABLED) return;
  try {
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  } catch {
    /* idem : jamais bloquant */
  }
}
