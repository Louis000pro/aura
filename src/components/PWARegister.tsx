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

    /* UNE MISE EN LIGNE SE RATTRAPE SANS QU'ON LA VOIE (2026-11-18).
       Depuis la v16, l'accueil et les onglets s'ouvrent depuis la copie
       gardée sur l'appareil, et le service worker va chercher la page
       fraîche en même temps. S'il découvre une nouvelle version, il le dit
       ici. Si la personne n'a encore rien touché, on recharge tout de suite
       (le cache vient d'être vidé, donc la page vient du réseau, sur la
       nouvelle version) : c'est l'affaire d'une demi-seconde après
       l'ouverture. Sinon on ne la dérange pas : son prochain changement de
       page se fera en entier, sur la nouvelle version (script du <head>). */
    let aTouche = false;
    const touche = () => { aTouche = true; };
    window.addEventListener("pointerdown", touche, { once: true, capture: true });
    window.addEventListener("keydown", touche, { once: true, capture: true });
    const ouvertLe = Date.now();
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type !== "vaiiya-nouvelle-version") return;
      try { (window as unknown as { __vyNouvelleVersion?: string }).__vyNouvelleVersion = ev.data.version; } catch { /* ignore */ }
      if (aTouche || refreshing || Date.now() - ouvertLe > 8000 || document.visibilityState !== "visible") return;
      // Jamais deux fois de suite : une copie qui resterait d'une autre
      // version ne doit pas faire boucler les rechargements.
      try {
        const avant = Number(sessionStorage.getItem("vaiiya_maj_recharge") || 0);
        if (Date.now() - avant < 30000) return;
        sessionStorage.setItem("vaiiya_maj_recharge", String(Date.now()));
      } catch { return; }
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    /* Le message a pu partir avant que cet écran ne l'écoute : on regarde
       aussi la copie gardée. Si elle est déjà d'une autre version que la
       page affichée, c'est la même situation. */
    const maVersion = process.env.NEXT_PUBLIC_DEPLOIEMENT;
    if (maVersion && "caches" in window) {
      caches.open("vaiiya-html")
        .then((c) => c.match(window.location.pathname))
        .then((r) => {
          const gardee = r?.headers.get("x-vaiiya-deploiement");
          if (gardee && gardee !== maVersion) onMessage(new MessageEvent("message", { data: { type: "vaiiya-nouvelle-version", version: gardee } }));
        })
        .catch(() => {});
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Vérifie une mise à jour à chaque ouverture
        reg.update().catch(() => {});
      })
      .catch(() => {/* ignore */});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("pointerdown", touche, { capture: true });
      window.removeEventListener("keydown", touche, { capture: true });
    };
  }, []);

  return null;
}
