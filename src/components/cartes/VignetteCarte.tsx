"use client";

import type { CarteDef } from "@/lib/cartes/catalogue";
import s from "./Cartes.module.css";

/**
 * UNE CARTE EN PETIT : l'image cuite par le vrai moteur (`npm run cartes`).
 * Elle n'écrit ni pseudo ni date : à cette taille, ces textes feraient 4 px
 * de haut. Un mouvement n'a pas d'image cuite (il y en aurait 102) : son
 * personnage se pose sur le fond mat de la famille.
 *
 * `scellee` : la carte est gagnée, sa pochette attend d'être déchirée.
 */
export default function VignetteCarte({ carte, scellee = false }: { carte: CarteDef; scellee?: boolean }) {
  const src = scellee && carte.vignettePochette ? carte.vignettePochette : carte.vignette;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={s.vignette} src={src} alt="" width={540} height={756} loading="lazy" decoding="async" draggable={false} />;
  }
  const sprite = carte.face.genre === "mouvement" ? carte.face.sprite : null;
  return (
    <span className={s.vMouvement}>
      {/* Un mouvement pas encore découvert ne montre pas son personnage. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {carte.gagnee && sprite && <img src={sprite} alt="" loading="lazy" decoding="async" draggable={false} />}
    </span>
  );
}
