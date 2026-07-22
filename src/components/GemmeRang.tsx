"use client";

import type { Rang } from "@/lib/aura";

/**
 * La gemme d'un rang (l'aura). Rendu SVG → net en clair/sombre, aucune image à
 * charger. Le halo néon reprend la couleur du rang. À remplacer par le vrai PNG
 * détouré du logo quand Louis le fournit (garder la même signature de props).
 */
export default function GemmeRang({
  rang,
  size = 150,
}: {
  rang: Rang;
  size?: number;
}) {
  const h = Math.round(size * (200 / 150));
  const uid = `gem-${rang.id}`;
  const [n0, n1] = rang.neon;
  const [p0, p1, p2] = rang.pierre;

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 150 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Rang ${rang.nom}`}
      style={{
        filter: `drop-shadow(0 0 18px ${hexA(n0, 0.55)}) drop-shadow(0 8px 22px ${hexA(p1, 0.25)})`,
      }}
    >
      <defs>
        <linearGradient id={`${uid}-pierre`} x1="40" y1="20" x2="110" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p0} />
          <stop offset=".45" stopColor={p1} />
          <stop offset="1" stopColor={p2} />
        </linearGradient>
        <linearGradient id={`${uid}-neon`} x1="0" y1="0" x2="150" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={n0} />
          <stop offset="1" stopColor={n1} />
        </linearGradient>
      </defs>

      {/* halo néon extérieur */}
      <polygon
        points="75,8 132,52 132,148 75,192 18,148 18,52"
        fill="none"
        stroke={`url(#${uid}-neon)`}
        strokeWidth="6"
        strokeLinejoin="round"
        opacity=".95"
      />
      {/* corps de la gemme */}
      <polygon points="75,20 122,58 122,142 75,180 28,142 28,58" fill={`url(#${uid}-pierre)`} />
      {/* facettes */}
      <g stroke="#5c2c06" strokeWidth="1" opacity=".45">
        <polygon points="75,20 122,58 75,86 28,58" fill="#FFC24D" opacity=".55" />
        <polygon points="28,58 75,86 75,180 28,142" fill="#9a5410" opacity=".5" />
        <polygon points="122,58 122,142 75,180 75,86" fill="#c46f0c" opacity=".5" />
        <line x1="75" y1="86" x2="75" y2="180" />
        <line x1="52" y1="70" x2="90" y2="120" />
        <line x1="98" y1="70" x2="66" y2="130" />
      </g>
      {/* reflet néon intérieur */}
      <polygon
        points="75,28 114,62 114,138 75,172 36,138 36,62"
        fill="none"
        stroke="#FFE9B0"
        strokeWidth="1.2"
        opacity=".5"
      />
    </svg>
  );
}

/** #rrggbb + alpha → rgba() (les filtres SVG n'acceptent pas #rrggbbaa partout). */
function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
