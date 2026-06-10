"use client";

import { useEffect } from "react";

export default function PWARegister() {
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
