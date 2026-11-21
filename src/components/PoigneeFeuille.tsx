"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { animate, motion, useIsPresent, useMotionValue, useReducedMotion, type HTMLMotionProps } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

type Geste = {
  id: number;
  type: "touch" | "souris";
  x: number;
  y: number;
  dernierY: number;
  dernierTemps: number;
  vitesse: number;
  depart: number | null;
};

function contenuDejaDefile(cible: Element, panneau: HTMLElement) {
  for (let element: Element | null = cible; element; element = element.parentElement) {
    if (element.scrollTop > 1 && /^(auto|scroll)$/.test(getComputedStyle(element).overflowY)) return true;
    if (element === panneau) break;
  }
  return false;
}

export function PanneauFeuille({ onFermer, children, style, ...props }: HTMLMotionProps<"div"> & {
  onFermer: () => void;
}) {
  const panneau = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const reduit = useReducedMotion();
  const presente = useIsPresent();
  const vitesseSortie = useRef(0);
  const peutGlisser = useEffectEvent(() => presente);
  const fermerParGeste = useEffectEvent(() => {
    if (presente) onFermer();
  });

  useEffect(() => {
    const element = panneau.current;
    if (!element) return;
    let geste: Geste | null = null;
    let ignorerClic = false;

    function commencer(id: number, type: Geste["type"], x: number, origineY: number, temps: number) {
      geste = { id, type, x, y: origineY, dernierY: origineY, dernierTemps: temps, vitesse: 0, depart: null };
      vitesseSortie.current = 0;
      ignorerClic = false;
    }

    function terminer(annule: boolean, positionY = 0, temps = 0) {
      const actif = geste;
      geste = null;
      if (!actif || actif.depart === null || !peutGlisser()) return;

      const distance = positionY - actif.y;
      const vitesse = temps - actif.dernierTemps < 90 ? actif.vitesse : 0;
      if (!annule && (distance >= 64 || (distance >= 24 && vitesse >= 0.45))) {
        vitesseSortie.current = vitesse;
        fermerParGeste();
      } else if (reduit) {
        y.set(0);
      } else {
        animate(y, 0, { duration: 0.17, ease: EASE });
      }
    }

    function bouger(x: number, positionY: number, temps: number, event: Event) {
      if (!geste || !peutGlisser()) return;
      if (!event.cancelable || event.defaultPrevented) {
        terminer(true);
        return;
      }
      const dx = Math.abs(x - geste.x);
      const dy = positionY - geste.y;
      if (geste.depart === null) {
        if (Math.max(dx, Math.abs(dy)) < 8) return;
        if (dy <= dx * 1.15) {
          ignorerClic = geste.type === "souris";
          geste = null;
          return;
        }
        y.stop();
        geste.depart = y.get();
        ignorerClic = true;
      }

      event.preventDefault();
      if (temps > geste.dernierTemps) {
        geste.vitesse = (positionY - geste.dernierY) / (temps - geste.dernierTemps);
      }
      geste.dernierY = positionY;
      geste.dernierTemps = temps;
      y.set(Math.max(0, geste.depart + dy));
    }

    // Le navigateur garde les gestes vers le haut et les gestes horizontaux.
    // On ne reprend la main que sur un mouvement vers le bas parti en haut du contenu.
    function debutTactile(event: TouchEvent) {
      if (event.touches.length !== 1) {
        terminer(true);
        return;
      }
      ignorerClic = false;
      const cible = event.target;
      const doigt = event.touches[0];
      if (!peutGlisser() || !element || !(cible instanceof Element) || cible.closest("[data-feuille]") !== element) return;
      if (cible.closest("input, textarea, select, [contenteditable], [role=slider], [data-feuille-sans-geste]")) return;
      if (!cible.closest("[data-poignee-feuille]") && contenuDejaDefile(cible, element)) return;
      commencer(doigt.identifier, "touch", doigt.clientX, doigt.clientY, event.timeStamp);
    }

    function mouvementTactile(event: TouchEvent) {
      if (geste?.type !== "touch") return;
      if (event.touches.length !== 1) {
        terminer(true);
        return;
      }
      const doigt = event.touches[0];
      if (doigt?.identifier === geste.id) bouger(doigt.clientX, doigt.clientY, event.timeStamp, event);
    }

    function finTactile(event: TouchEvent) {
      if (geste?.type !== "touch") return;
      const doigt = Array.from(event.changedTouches).find(({ identifier }) => identifier === geste?.id);
      if (doigt) terminer(event.type === "touchcancel", doigt.clientY, event.timeStamp);
    }

    function debutSouris(event: PointerEvent) {
      if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
      ignorerClic = false;
      const cible = event.target;
      const poignee = cible instanceof Element && cible.closest("[data-poignee-feuille]");
      if (!peutGlisser() || !poignee || poignee.closest("[data-feuille]") !== element) return;
      poignee.setPointerCapture(event.pointerId);
      commencer(event.pointerId, "souris", event.clientX, event.clientY, event.timeStamp);
    }

    function mouvementSouris(event: PointerEvent) {
      if (geste?.type === "souris" && geste.id === event.pointerId) {
        bouger(event.clientX, event.clientY, event.timeStamp, event);
      }
    }

    function finSouris(event: PointerEvent) {
      if (geste?.type === "souris" && geste.id === event.pointerId) {
        terminer(event.type !== "pointerup", event.clientY, event.timeStamp);
      }
    }

    function filtrerClic(event: MouseEvent) {
      if (!ignorerClic || event.detail === 0) return;
      ignorerClic = false;
      event.preventDefault();
      event.stopPropagation();
    }

    const ecouteurs = new AbortController();
    const { signal } = ecouteurs;
    element.addEventListener("touchstart", debutTactile, { signal, passive: true });
    element.addEventListener("touchmove", mouvementTactile, { signal, passive: false });
    element.addEventListener("touchend", finTactile, { signal, passive: true });
    element.addEventListener("touchcancel", finTactile, { signal, passive: true });
    element.addEventListener("pointerdown", debutSouris, { signal });
    element.addEventListener("pointermove", mouvementSouris, { signal });
    element.addEventListener("pointerup", finSouris, { signal });
    element.addEventListener("pointercancel", finSouris, { signal });
    element.addEventListener("lostpointercapture", finSouris, { signal });
    element.addEventListener("click", filtrerClic, { signal, capture: true });
    return () => ecouteurs.abort();
  }, [reduit, y]);

  return (
    <motion.div
      {...props}
      data-feuille
      ref={panneau}
      style={{ ...style, y }}
      initial="entree"
      animate="enPlace"
      exit="sortie"
      variants={{
        entree: { y: reduit ? 0 : 48 },
        enPlace: { y: 0, transition: { duration: reduit ? 0 : 0.18, ease: EASE } },
        sortie: () => {
          const rect = panneau.current?.getBoundingClientRect();
          const horsEcran = rect ? window.innerHeight - rect.top + y.get() + 8 : y.get();
          return {
            y: reduit ? y.get() : Math.max(y.get(), horsEcran),
            transition: { duration: reduit ? 0 : vitesseSortie.current >= 0.65 ? 0.16 : 0.2, ease: EASE },
          };
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export default function PoigneeFeuille({ onFermer, className = "", libelle = "Fermer" }: {
  onFermer: () => void;
  className?: string;
  libelle?: string;
}) {
  return (
    <button
      type="button"
      aria-label={libelle}
      data-poignee-feuille
      className={`grid h-11 w-full shrink-0 select-none place-items-center rounded-t-[inherit] border-0 bg-transparent cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-[-4px] ${className}`}
      onClick={(event) => {
        event.stopPropagation();
        onFermer();
      }}
    >
      <span aria-hidden className="pointer-events-none h-1 w-10 rounded-full bg-current opacity-40" style={{ color: "var(--text-3)" }} />
    </button>
  );
}
