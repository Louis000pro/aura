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

    /* ⚠️ « EN ARRIÈRE-PLAN » NE SUFFIT PAS : PASSER À UNE AUTRE APPLI PENDANT UNE
       SÉANCE, C'EST EXACTEMENT LE CAS QU'ON VEUT PROTÉGER. Changer de morceau
       de musique au milieu d'un tunnel met l'onglet en arrière-plan, donc un
       rechargement à ce moment-là perdrait la séance aussi sûrement qu'avant.
       `body.modal-open` est le signal que l'app possède déjà pour « une
       surface plein écran est ouverte » (`lib/bodyModal.ts`, compteur de
       références) : le tunnel le pose, le questionnaire d'entrée aussi, la
       création de séance, le lecteur d'un mini-cours et les feuilles du
       planning également. Tant qu'il est là, on ne recharge pas et on continue
       d'attendre ; le prochain passage en arrière-plan, une fois la surface
       refermée, fera le travail. */
    const rienEnCours = () => !document.body.classList.contains("modal-open");
    const surVisibilite = () => {
      if (document.visibilityState === "hidden" && rienEnCours()) window.location.reload();
    };
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      if (document.visibilityState === "hidden" && rienEnCours()) { window.location.reload(); return; }
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
