"use client";

import { useEffect } from "react";

/** L'invitation d'installation du navigateur. Elle n'arrive qu'une fois, tôt,
 *  et les premiers pas la rejouent bien plus tard : on la garde de côté. */
export type InviteInstallation = { prompt: () => Promise<void> };

declare global {
  interface Window { __vaiiyaInstallation?: InviteInstallation | null }
}

export default function PWARegister() {
  useEffect(() => {
    const garder = (e: Event) => {
      /* Ailleurs, le navigateur garde sa propre invitation. */
      if (window.location.pathname === "/premiers-pas") e.preventDefault();
      window.__vaiiyaInstallation = e as unknown as InviteInstallation;
    };
    window.addEventListener("beforeinstallprompt", garder);
    return () => window.removeEventListener("beforeinstallprompt", garder);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Recharge automatiquement quand une NOUVELLE version du SW prend le relais
    // (pas au tout premier install où il n'y avait pas encore de contrôleur)
    let refreshing = false;
    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Vérifie une mise à jour à chaque ouverture
        reg.update().catch(() => {});
      })
      .catch(() => {/* ignore */});

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
