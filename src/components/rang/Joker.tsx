"use client";

import { useId } from "react";

/**
 * LE JOKER DE SÉRIE : un bouclier qui porte la flamme (Louis, 2026-10-24,
 * maquette « Le passage de rang »). Il garde la série un jour où l'on n'a
 * même pas ouvert Vaiiya ; il se dessine partout pareil, sur la tuile de la
 * série, dans le calendrier, sur la scène et dans la galerie des rangs.
 *
 * `eteint` : un joker déjà posé ce mois-ci. Il reste à sa place, gris, pour
 * qu'on voie combien il en reste sans compter.
 *
 * ⚠️ Les identifiants du dégradé viennent de `useId` : deux boucliers rendus
 * dans deux arbres séparés partageraient les leurs (même piège que la flamme).
 */
export function IconeJoker({
  taille,
  eteint = false,
  className,
}: {
  /** La hauteur : un nombre de px ou une longueur CSS. */
  taille: number | string;
  eteint?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const h = typeof taille === "number" ? `${taille}px` : taille;
  return (
    <svg
      viewBox="0 0 28 32"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ height: h, width: `calc(${h} * 0.875)`, flex: "none", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`joker-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={eteint ? "#ECE8F2" : "#FFE9B4"} />
          <stop offset="1" stopColor={eteint ? "#C9C3D4" : "#F2A93B"} />
        </linearGradient>
      </defs>
      <path
        d="M14 1.6 25.4 5.8v8.4c0 7.7-4.8 13.2-11.4 16.4C7.4 27.4 2.6 21.9 2.6 14.2V5.8z"
        fill={`url(#joker-${id})`}
        stroke={eteint ? "#9A93AE" : "#8A5206"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 8.6c2.9 2.8 5 5.4 5 8.4a5.1 5.1 0 0 1-10.2 0c0-1.9.9-3.3 2.1-4.6.3 1.6 1.1 2.5 2.1 2.7-.3-2.5.1-4.5 1-6.5z"
        fill={eteint ? "#A9A2BA" : "#C2410C"}
      />
    </svg>
  );
}

/** Une rangée de jokers qui se chevauchent un peu : `pleins` d'abord, puis les éteints. */
export function RangeeJokers({
  pleins,
  eteints = 0,
  taille,
}: {
  pleins: number;
  eteints?: number;
  taille: number | string;
}) {
  const h = typeof taille === "number" ? `${taille}px` : taille;
  const total = Math.max(0, pleins) + Math.max(0, eteints);
  if (total === 0) return null;
  return (
    <span className="inline-flex items-center" aria-hidden="true" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ display: "inline-flex", marginLeft: i ? `calc(${h} * -0.22)` : 0 }}>
          <IconeJoker taille={h} eteint={i >= pleins} />
        </span>
      ))}
    </span>
  );
}
