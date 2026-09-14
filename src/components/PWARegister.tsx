"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    /* Recharge quand une NOUVELLE version du SW prend le relais (pas au tout
       premier install, où il n'y avait pas encore de contrôleur).

       ⚠️ MAIS JAMAIS PAR-DESSUS QUELQUE CHOSE EN COURS, ET ÇA COÛTAIT UNE
       SÉANCE ENTIÈRE. Le tunnel ne garde son temps écoulé, sa position et ses
       séries que dans l'état React : la séance ne s'écrit en base qu'à la
       toute fin. Un `window.location.reload()` au milieu l'effaçait donc
       intégralement, sans un mot, et le travail était perdu. Même chose pour
       le questionnaire d'entrée, une carte du Guide en attente de validation
       ou un message à demi écrit.
       Et ça n'arrivait pas qu'au chargement : `controllerchange` se déclenche
       dans TOUS les onglets. Ouvrir Vaiiya ailleurs pendant qu'on s'entraîne
       suffisait donc à faire recharger la séance en cours.
       On attend que l'onglet passe en arrière-plan, le seul moment où il n'y a
       rien à perdre. Le nouveau service worker, lui, est déjà aux commandes :
       ce qui attend, c'est seulement le rafraîchissement de la page. */
    let refreshing = false;
    const hadController = !!navigator.serviceWorker.controller;

    const surVisibilite = () => {
      if (document.visibilityState === "hidden") window.location.reload();
    };
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      if (document.visibilityState === "hidden") { window.location.reload(); return; }
      document.addEventListener("visibilitychange", surVisibilite);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Vérifie une mise à jour à chaque ouverture
        reg.update().catch(() => {});
      })
      .catch(() => {/* ignore */});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, []);

  return null;
}
