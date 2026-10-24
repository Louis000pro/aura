"use client";

import { useEffect, type RefObject } from "react";

/**
 * L'inclinaison d'une carte de rang : le doigt (ou la souris) la penche, et
 * quand personne ne la touche, elle dérive lentement d'elle-même. Le reflet
 * et l'holographique suivent (`CarteRang.module.css` lit les six variables).
 *
 * Sur Android, le téléphone qu'on bouge la penche aussi. Sur iPhone, Safari
 * demanderait une permission pour lire l'orientation : on ne la demande pas
 * pour un reflet, le doigt et la dérive suffisent.
 *
 * Écrit en variables CSS dans une boucle d'images, jamais en état React :
 * soixante rendus par seconde pour un reflet, ce serait absurde. Mouvement
 * réduit : la carte se tient droite, son reflet au repos.
 */
export function useInclinaison(zone: RefObject<HTMLElement | null>, carte: RefObject<HTMLElement | null>, actif = true) {
  useEffect(() => {
    const z = zone.current;
    if (!actif || !z) return;
    const reduit = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const borne = (v: number) => Math.max(0, Math.min(1, v));
    const poser = (x: number, y: number) => {
      const c = carte.current;
      if (!c) return;
      c.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      c.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      c.style.setProperty("--px", x.toFixed(3));
      c.style.setProperty("--py", y.toFixed(3));
      c.style.setProperty("--rx", `${((0.5 - y) * 18).toFixed(2)}deg`);
      c.style.setProperty("--ry", `${((x - 0.5) * 22).toFixed(2)}deg`);
    };
    if (reduit) {
      poser(0.5, 0.32);
      return;
    }

    let main = false;
    let incline: { x: number; y: number } | null = null;
    const t0 = Math.random() * 10;
    let raf = 0;

    const suivre = (e: PointerEvent) => {
      const b = z.getBoundingClientRect();
      main = true;
      poser(borne((e.clientX - b.left) / b.width), borne((e.clientY - b.top) / b.height));
    };
    const lacher = (e: PointerEvent) => { if (e.type !== "pointerup" || e.pointerType !== "mouse") main = false; };
    const quitter = () => { main = false; };
    const orientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      // Tenu droit devant soi : beta autour de 45°, gamma autour de 0.
      incline = { x: borne(0.5 + e.gamma / 50), y: borne(0.42 + (e.beta - 45) / 70) };
    };

    z.addEventListener("pointermove", suivre);
    z.addEventListener("pointerdown", suivre);
    z.addEventListener("pointerup", lacher);
    z.addEventListener("pointercancel", quitter);
    z.addEventListener("pointerleave", quitter);
    window.addEventListener("deviceorientation", orientation);

    const boucle = (t: number) => {
      raf = requestAnimationFrame(boucle);
      if (main) return;
      if (incline) { poser(incline.x, incline.y); return; }
      const s = t / 1000;
      poser(0.5 + Math.sin(s * 0.62 + t0) * 0.3, 0.42 + Math.sin(s * 0.84 + t0 * 1.3) * 0.22);
    };
    raf = requestAnimationFrame(boucle);

    return () => {
      cancelAnimationFrame(raf);
      z.removeEventListener("pointermove", suivre);
      z.removeEventListener("pointerdown", suivre);
      z.removeEventListener("pointerup", lacher);
      z.removeEventListener("pointercancel", quitter);
      z.removeEventListener("pointerleave", quitter);
      window.removeEventListener("deviceorientation", orientation);
    };
  }, [zone, carte, actif]);
}
