"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CarteDef } from "@/lib/cartes/catalogue";
import type { CarteLive } from "@/lib/cartes/live";
import VignetteCarte from "./VignetteCarte";
import s from "./Cartes.module.css";

/**
 * UNE CARTE VIVANTE (maquette « Les cartes Vaiiya », GO du 2026-11-06).
 *
 * Le rendu est fait par `CarteLive`, chargé au moment où la carte s'ouvre :
 * le moteur n'a rien à faire dans le code du démarrage. En attendant, et
 * pour de bon s'il ne peut pas tourner (pas de WebGL2, contexte perdu),
 * l'image cuite reste en place avec le pseudo, le numéro et la date posés
 * par-dessus.
 *
 * ⚠️ UNE SEULE À L'ÉCRAN : chaque montage ouvre un contexte WebGL, et un
 * navigateur n'en garde qu'une poignée. Les grilles passent par
 * `VignetteCarte`.
 *
 * `onTap` : `undefined` retourne la carte, `null` ne fait rien (la pochette
 * pose le sien elle-même).
 */
export default function CarteVivante({
  carte,
  surPret,
  onTap,
  toujoursVisible = false,
  fond,
}: {
  carte?: CarteDef | null;
  /** Le moteur est là, ou `null` s'il ne peut pas tourner. */
  surPret?: (live: CarteLive | null) => void;
  onTap?: (() => void) | null;
  /** La pochette dessine sans passer par `carte`. */
  toujoursVisible?: boolean;
  /** Ce qui se voit tant que rien n'est dessiné, sans `carte`. */
  fond?: ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const pivot = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<CarteLive | null>(null);
  const [moteur, setMoteur] = useState(false);
  const [vue, setVue] = useState(false);
  const pret = useRef(surPret);
  useEffect(() => { pret.current = surPret; });

  useEffect(() => {
    let vivant = true;
    let l: CarteLive | null = null;
    void import("@/lib/cartes/live")
      .then(({ CarteLive: Live }) => {
        if (!vivant || !el.current || !pivot.current || !canvas.current) return;
        l = new Live(el.current, pivot.current, canvas.current);
        live.current = l;
        setMoteur(true);
        pret.current?.(l);
      })
      .catch((e) => {
        console.warn("[cartes] pas de moteur, l'image cuite reste en place :", e);
        if (vivant) pret.current?.(null);
      });
    return () => {
      vivant = false;
      l?.detruire();
      live.current = null;
    };
  }, []);

  useEffect(() => {
    const l = live.current;
    if (!moteur || !l) return;
    l.onTap = onTap === null ? null : onTap ?? (() => l.retourner());
  }, [moteur, onTap]);

  useEffect(() => {
    const l = live.current;
    if (!moteur || !l || !carte) return;
    let actuel = true;
    void l.montrer(carte).then((ok) => { if (actuel) setVue(ok); });
    return () => { actuel = false; };
  }, [moteur, carte]);

  const f = carte?.face;
  const pseudo = f && f.genre !== "relais" && f.genre !== "mouvement" ? f.pseudo : f?.genre === "relais" ? f.duo : null;
  const numero = f?.genre === "rang" && f.numero != null ? `N° ${String(f.numero).padStart(3, "0")}` : null;

  return (
    <div
      ref={el}
      className={s.live}
      style={{ "--lueur": carte?.lueur ?? "#8B5CF6" } as CSSProperties}
      {...(carte ? { role: "img", "aria-label": carte.dit } : { "aria-hidden": true })}
    >
      <div ref={pivot} className={s.pivot}>
        {carte ? (
          <div className={s.secours}>
            <VignetteCarte carte={carte} />
            {pseudo && <span className={s.sPseudo}>{pseudo.toUpperCase()}</span>}
            {f?.date && <span className={`${s.sDate} vy-nombre`}>{f.date}</span>}
            {numero && <span className={`${s.sNumero} vy-nombre`}>{numero}</span>}
          </div>
        ) : fond ? (
          <div className={s.secours}>{fond}</div>
        ) : null}
        <canvas ref={canvas} className={s.canvas} data-vue={vue || (toujoursVisible && moteur) ? "" : undefined} aria-hidden="true" />
      </div>
      <div className={s.ombre} />
    </div>
  );
}
