"use client";

import { useRef, type PointerEvent } from "react";

export const transitionFeuille = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

type Geste = {
  id: number;
  panneau: HTMLElement;
  x: number;
  y: number;
  debut: number;
  axe: "horizontal" | "vertical" | null;
};

/** Le panneau portant data-feuille garde sa propre animation d'entrée/sortie.
 *  Le geste ne déplace que la feuille, sans refaire le rendu de son contenu. */
export default function PoigneeFeuille({
  onFermer,
  className = "",
  libelle = "Fermer",
}: {
  onFermer: () => void;
  className?: string;
  libelle?: string;
}) {
  const geste = useRef<Geste | null>(null);
  const ignorerClic = useRef(false);
  const retour = useRef<Animation | null>(null);

  function commencer(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const panneau = event.currentTarget.closest<HTMLElement>("[data-feuille]");
    if (!panneau) return;
    retour.current?.cancel();
    ignorerClic.current = false;
    geste.current = {
      id: event.pointerId,
      panneau,
      x: event.clientX,
      y: event.clientY,
      debut: event.timeStamp,
      axe: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function deplacer(event: PointerEvent<HTMLButtonElement>) {
    const actif = geste.current;
    if (!actif || actif.id !== event.pointerId) return;
    const dx = event.clientX - actif.x;
    const dy = event.clientY - actif.y;
    if (!actif.axe && Math.max(Math.abs(dx), Math.abs(dy)) >= 6) {
      actif.axe = Math.abs(dy) > Math.abs(dx) ? "vertical" : "horizontal";
      ignorerClic.current = true;
    }
    if (actif.axe === "vertical") {
      actif.panneau.style.translate = `0 ${Math.max(0, dy)}px`;
    }
  }

  function terminer(event: PointerEvent<HTMLButtonElement>, annule = false) {
    const actif = geste.current;
    if (!actif || actif.id !== event.pointerId) return;
    if (!annule) deplacer(event);
    geste.current = null;
    if (annule) ignorerClic.current = true;

    const distance = event.clientY - actif.y;
    const duree = Math.max(1, event.timeStamp - actif.debut);
    const fermer = !annule && actif.axe === "vertical" && (distance >= 64 || (distance >= 28 && distance / duree >= 0.35));

    const position = actif.panneau.style.translate;
    actif.panneau.style.removeProperty("translate");
    if (position && position !== "0 0px" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      retour.current = actif.panneau.animate(
        [{ translate: position }, { translate: "0 0" }],
        { duration: fermer ? transitionFeuille.duration * 1000 : 160, easing: "cubic-bezier(.22,1,.36,1)" },
      );
    }
    if (fermer) onFermer();
  }

  return (
    <button
      type="button"
      aria-label={libelle}
      className={`grid h-11 w-full shrink-0 touch-none select-none place-items-center rounded-t-[inherit] border-0 bg-transparent cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-[-4px] ${className}`}
      onPointerDown={commencer}
      onPointerMove={deplacer}
      onPointerUp={terminer}
      onPointerCancel={(event) => terminer(event, true)}
      onLostPointerCapture={(event) => terminer(event, true)}
      onClick={(event) => {
        event.stopPropagation();
        if (!ignorerClic.current || event.detail === 0) onFermer();
      }}
    >
      <span aria-hidden className="pointer-events-none h-1 w-10 rounded-full bg-current opacity-40" style={{ color: "var(--text-3)" }} />
    </button>
  );
}
