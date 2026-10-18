"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA SCÈNE DU TUNNEL (maquette « Le tunnel », piste A, avec le fond tout
   clair de la piste B : GO de Louis le 2026-10-18, « juste pour le fond je
   veux le tout clair »).

   Le personnage-guide joue le geste en grand, sur le fond clair du tunnel.
   Il passait de 158 px de haut dans une boîte de 176 px, sur un fond noir
   qui mangeait le legging bleu nuit et les cheveux : il prend désormais
   toute la hauteur de la scène. Toucher la scène ouvre la fiche du
   mouvement, qui remplace la démo YouTube.

   ⚠️ LA SCÈNE NE CHANGE PAS DE PLACE d'un état à l'autre : l'effort, le
   3-2-1, le repos et la pause montrent leur contenu dans le même cadre.
   ⚠️ LE 3-2-1 ET LA PAUSE FIGENT LA PREMIÈRE POSE : la position de départ.
   ⚠️ Les 102 animations partagent le même canevas (1024 px, sol à 972) :
   le personnage garde sa stature d'un mouvement à l'autre, et l'ombre se
   pose sur la ligne de sol. Le parent donne une `key` par mouvement, donc
   l'animation repart de la première pose à chaque changement.
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { Maximize2, Pause } from "lucide-react";
import { frameSrc, pickGenre, resolveGuide } from "@/lib/exerciseGuides";
import styles from "./SceneTunnel.module.css";

export default function SceneTunnel({ nom, fige = false, enPause = false, barre = null, encreBarre = "feu", coin, onOuvrir }: {
  nom: string;
  /** La première pose, immobile : la position de départ. */
  fige?: boolean;
  /** La pause : la scène se fige et s'assombrit. */
  enPause?: boolean;
  /** Ce qui reste du chrono, de 0 à 1, au pied du personnage. `null` : pas de chrono. */
  barre?: number | null;
  encreBarre?: "feu" | "teal";
  /** La pastille du coin haut gauche (« En position », « Ensuite », « Changer »). */
  coin?: React.ReactNode;
  /** Ouvre la fiche du mouvement. Absent : la scène ne s'ouvre pas. */
  onOuvrir?: () => void;
}) {
  const guide = resolveGuide(nom);
  const anime = !!guide && guide.frames > 1 && !fige && !enPause;
  const [tic, setTic] = useState(0);
  useEffect(() => {
    if (!anime) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setTic((n) => n + 1), 900);
    return () => clearInterval(t);
  }, [anime]);
  const pose = guide && anime ? tic % guide.frames : 0;
  const genre = guide ? pickGenre(guide) : null;

  return (
    <div className={styles.scene}>
      <div className={styles.perso} aria-hidden="true">
        <span className={styles.ombre} />
        {guide && genre ? Array.from({ length: guide.frames }).map((_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={frameSrc(guide, genre, i)}
            alt=""
            decoding="async"
            className={styles.pose}
            style={{ opacity: i === pose ? 1 : 0 }}
          />
        )) : <span className={styles.halo} />}
      </div>

      {onOuvrir && (
        <button type="button" className={styles.ouvrir} onClick={onOuvrir} aria-label={`Voir la fiche : ${nom}`} />
      )}

      {/* La rangée du haut : l'état à gauche, l'invitation à droite. ⚠️ Pas
          dans un coin du bas : un mouvement au sol (pompes, gainage) touche
          les deux bords du canevas, et l'icône lui mangeait les pieds. */}
      {(coin || onOuvrir) && (
        <div className={styles.haut}>
          {coin && <div className={styles.coin}>{coin}</div>}
          {onOuvrir && (
            <span className={styles.agrandir} aria-hidden="true">
              <Maximize2 size={13} strokeWidth={2.4} />Voir en grand
            </span>
          )}
        </div>
      )}

      {barre !== null && (
        <div className={styles.piste} aria-hidden="true">
          <div className={styles.barre} data-encre={encreBarre} style={{ transform: `scaleX(${Math.max(0, Math.min(1, barre))})` }} />
        </div>
      )}

      {enPause && (
        <div className={styles.voile} aria-hidden="true">
          <span className={styles.rondPause}><Pause size={28} strokeWidth={2} /></span>
        </div>
      )}
    </div>
  );
}

/** Une pastille de verre posée sur la scène. */
export function PastilleScene({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label?: string }) {
  return onClick ? (
    <button type="button" className={styles.pastille} onClick={onClick} aria-label={label}>{children}</button>
  ) : (
    <span className={styles.pastille}>{children}</span>
  );
}
