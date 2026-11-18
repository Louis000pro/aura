"use client";

// Une carte en grand : on la fait tourner au doigt ou à la souris, dans tous les sens, et son dos se voit
// quand on la retourne. Lâchée, elle garde son élan puis ralentit. Seul `transform` bouge, sur la carte
// et sur le reflet, rien d'autre (une opacité ou un mode de fusion dans un objet 3D saccade sur iPhone).

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./VisionneuseCarte.module.css";

type Props = { src: string; alt: string; rarete: string; nom: string; libelleRarete: string; onFermer: () => void; bas?: ReactNode };

const INCLINAISON_MAX = 75;

export default function VisionneuseCarte({ src, alt, rarete, nom, libelleRarete, onFermer, bas }: Props) {
  const carte = useRef<HTMLDivElement>(null);
  const reflets = useRef<HTMLSpanElement[]>([]);
  const angles = useRef({ x: -8, y: -22 });
  const vitesse = useRef({ x: 0, y: 0 });
  const geste = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
  const boucle = useRef<number | null>(null);
  const fermer = useRef(onFermer);
  useEffect(() => { fermer.current = onFermer; }, [onFermer]);

  function dessiner() {
    const { x, y } = angles.current;
    if (carte.current) carte.current.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    // Le reflet glisse avec l'angle : il traverse la face (et le dos) comme une lumière fixe dans la pièce.
    const decalage = ((((y % 360) + 540) % 360) - 180) / 180;
    for (const reflet of reflets.current) {
      reflet.style.transform = `translate3d(${decalage * 60}%, ${x * .5}%, 0)`;
    }
  }

  function arreter() {
    if (boucle.current !== null) cancelAnimationFrame(boucle.current);
    boucle.current = null;
  }

  function elan() {
    arreter();
    const pas = () => {
      const v = vitesse.current;
      v.x *= .94;
      v.y *= .94;
      angles.current.y += v.y;
      angles.current.x = Math.max(-INCLINAISON_MAX, Math.min(INCLINAISON_MAX, angles.current.x + v.x));
      dessiner();
      if (Math.abs(v.x) + Math.abs(v.y) > .05) boucle.current = requestAnimationFrame(pas);
      else boucle.current = null;
    };
    boucle.current = requestAnimationFrame(pas);
  }

  useEffect(() => {
    dessiner();
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const clavier = (event: KeyboardEvent) => {
      if (event.key === "Escape") fermer.current();
      const pas = { ArrowLeft: [0, -20], ArrowRight: [0, 20], ArrowUp: [12, 0], ArrowDown: [-12, 0] }[event.key];
      if (pas) {
        event.preventDefault();
        vitesse.current = { x: pas[0] / 8, y: pas[1] / 8 };
        elan();
      }
    };
    window.addEventListener("keydown", clavier);
    return () => {
      window.removeEventListener("keydown", clavier);
      document.body.style.overflow = precedent;
      arreter();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function appuyer(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    arreter();
    event.currentTarget.setPointerCapture(event.pointerId);
    geste.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now() };
    vitesse.current = { x: 0, y: 0 };
  }

  function glisser(event: PointerEvent<HTMLDivElement>) {
    const enCours = geste.current;
    if (!enCours || enCours.id !== event.pointerId) return;
    const dx = event.clientX - enCours.x;
    const dy = event.clientY - enCours.y;
    const maintenant = performance.now();
    const dt = Math.max(1, maintenant - enCours.t);
    const vy = dx * .45;
    const vx = -dy * .35;
    angles.current.y += vy;
    angles.current.x = Math.max(-INCLINAISON_MAX, Math.min(INCLINAISON_MAX, angles.current.x + vx));
    // Vitesse ramenée à une image (16 ms), lissée pour que l'élan suive le geste et pas son dernier soubresaut.
    vitesse.current = {
      x: vitesse.current.x * .4 + (vx * 16 / dt) * .6,
      y: vitesse.current.y * .4 + (vy * 16 / dt) * .6,
    };
    geste.current = { id: enCours.id, x: event.clientX, y: event.clientY, t: maintenant };
    dessiner();
  }

  function lacher(event: PointerEvent<HTMLDivElement>) {
    const enCours = geste.current;
    if (!enCours || enCours.id !== event.pointerId) return;
    geste.current = null;
    // Un doigt resté immobile avant de lâcher ne relance pas la carte.
    if (performance.now() - enCours.t > 90) vitesse.current = { x: 0, y: 0 };
    elan();
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.voile} role="dialog" aria-modal="true" aria-label={`${nom}, ${libelleRarete}`}
      onClick={event => { if (event.target === event.currentTarget) onFermer(); }}>
      <button type="button" className={styles.fermer} aria-label="Fermer" onClick={onFermer}>×</button>
      <div className={styles.scene} data-rarete={rarete}
        onPointerDown={appuyer} onPointerMove={glisser} onPointerUp={lacher} onPointerCancel={lacher}>
        <div ref={carte} className={styles.carte}>
          <div className={styles.face}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} draggable={false} />
            <span aria-hidden="true" className={styles.reflet} ref={el => { if (el) reflets.current[0] = el; }} />
          </div>
          <div className={styles.dos} aria-hidden="true">
            <span className={styles.reflet} ref={el => { if (el) reflets.current[1] = el; }} />
          </div>
        </div>
      </div>
      <p className={styles.legende}><strong>{nom}</strong> · {libelleRarete}<br />
        <small>Fais-la tourner du doigt pour la voir sous tous les angles.</small></p>
      {bas}
    </div>,
    document.body,
  );
}
