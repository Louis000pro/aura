"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA FLAMME DE LA SÉRIE, DESSINÉE PAR VAIIYA (Louis, 2026-10-17).

   Elle remplace trois flammes qui ne se ressemblaient pas : l'emoji 🔥 de
   l'accueil (dessiné par Apple, Google ou Microsoft selon l'appareil,
   donc impossible à faire évoluer), et deux dessins plats différents dans
   la feuille de la série et sur le profil. Une série, une flamme.

   ⚠️ CHAQUE PALIER A SON CONTOUR, D'UN SEUL TRAIT. Une langue posée
   derrière le corps se faisait couper par le bord du corps (défaut vu par
   Louis sur la maquette) : on ne superpose jamais deux silhouettes. Le
   nombre de langues raconte la série (une, deux, trois, quatre, puis trois
   langues droites et une auréole), la couleur chauffe avec elle.

   Le palier se décide dans `lib/flammesSerie.ts`, jamais ici : ce
   composant ne fait que dessiner celui qu'on lui donne.
   ───────────────────────────────────────────────────────────────────── */

import { useId } from "react";
import type { CSSProperties } from "react";
import { palierFlamme, type IdFlamme } from "@/lib/flammesSerie";

const CONTOURS: Record<IdFlamme, string> = {
  lueur: "M52 24C56 41 73 55 73 82C73 100 62 113 50 113C38 113 27 100 27 84C27 63 42 47 52 24Z",
  flamme: "M52 8C55 26 82 40 82 78C82 100 67 116 50 116C33 116 18 101 18 80C18 64 25 53 33 45C33 54 37 60 42 63C39 45 43 26 52 8Z",
  feu: "M48 4C52 18 59 32 62 49C66 41 73 33 80 25C85 41 88 56 86 76C84 100 68 116 50 116C32 116 16 100 16 80C16 62 21 46 28 34C30 44 33 51 38 56C36 38 40 18 48 4Z",
  brasier: "M50 0C54 14 58 29 60 43C64 33 70 25 76 17C80 29 83 39 84 49C87 45 91 41 95 37C97 53 95 67 90 81C85 103 69 116 50 116C30 116 12 102 12 82C12 64 17 44 24 27C27 37 31 45 36 51C34 33 40 15 50 0Z",
  sacre: "M50 0C54 16 60 30 62 44C66 36 72 28 79 21C84 37 88 54 86 74C84 100 68 116 50 116C32 116 16 100 14 74C12 54 16 37 21 21C28 28 34 36 38 44C40 30 46 16 50 0Z",
};

const MILIEU = {
  petit: "M51 54C55 66 66 74 66 90C66 102 59 110 50 110C41 110 34 102 34 92C34 77 46 68 51 54Z",
  normal: "M51 34C56 48 74 58 74 82C74 101 63 112 50 112C37 112 26 101 26 86C26 75 32 67 39 62C39 70 42 75 46 77C43 63 45 49 51 34Z",
  large: "M50 24C55 41 77 53 77 82C77 102 64 113 50 113C36 113 23 102 23 86C23 73 30 64 38 58C38 67 41 72 45 74C42 58 44 40 50 24Z",
};

const COEUR = {
  petit: "M50 80C53 87 58 91 58 98C58 104 54 108 50 108C46 108 42 104 42 99C42 91 48 87 50 80Z",
  normal: "M50 62C54 72 64 79 64 92C64 103 58 110 50 110C42 110 36 103 36 94C36 87 40 82 44 79C44 85 46 88 48 89C47 81 47 72 50 62Z",
};

type Dessin = {
  milieu: keyof typeof MILIEU;
  coeur: keyof typeof COEUR;
  /** [lumière au pied, bord] de chaque couche. */
  corps: [string, string];
  flammeMilieu: [string, string];
  flammeCoeur: [string, string];
  /** La lueur autour de la flamme : la couleur et son intensité. */
  lueur: [string, number] | null;
  braises: [number, number, number][];
  braise: string;
  aureole: boolean;
  /** Le cœur du Feu sacré bleuit à sa base : c'est le plus chaud. */
  baseBleue: boolean;
};

const DESSINS: Record<IdFlamme, Dessin> = {
  lueur: {
    milieu: "petit", coeur: "petit",
    corps: ["#FF6A1A", "#C92A0A"], flammeMilieu: ["#FF9E3A", "#FF6A1A"], flammeCoeur: ["#FFD27A", "#FF9E3A"],
    lueur: null, braises: [], braise: "#FF9E3A", aureole: false, baseBleue: false,
  },
  flamme: {
    milieu: "normal", coeur: "normal",
    corps: ["#FF8A1F", "#E2420C"], flammeMilieu: ["#FFC24A", "#FF8E20"], flammeCoeur: ["#FFEFB8", "#FFC24A"],
    lueur: ["#FF7814", 0.32], braises: [], braise: "#FFC24A", aureole: false, baseBleue: false,
  },
  feu: {
    milieu: "normal", coeur: "normal",
    corps: ["#FFA024", "#EC560C"], flammeMilieu: ["#FFD860", "#FFA628"], flammeCoeur: ["#FFFBE6", "#FFE080"],
    lueur: ["#FF8214", 0.42], braises: [[24, 18, 2.4], [90, 10, 2.6]], braise: "#FFD860", aureole: false, baseBleue: false,
  },
  brasier: {
    milieu: "large", coeur: "normal",
    corps: ["#FFC23A", "#F07A0E"], flammeMilieu: ["#FFEC94", "#FFC23A"], flammeCoeur: ["#FFFFFF", "#FFF4C0"],
    lueur: ["#FFB41E", 0.55], braises: [[16, 12, 2.6], [64, 2, 2], [88, 4, 2.8], [100, 26, 2]], braise: "#FFC83D", aureole: false, baseBleue: false,
  },
  sacre: {
    milieu: "large", coeur: "normal",
    corps: ["#FFE070", "#F0A010"], flammeMilieu: ["#FFFBE8", "#FFE070"], flammeCoeur: ["#FFFFFF", "#FFFFFF"],
    lueur: ["#FFD450", 0.66], braises: [[22, 6, 2.2], [80, 4, 2.4], [96, 30, 1.8]], braise: "#FFC83D", aureole: true, baseBleue: true,
  },
};

export default function FlammeSerie({
  jours,
  palier,
  taille,
  eteinte = false,
  style,
}: {
  /** La série en cours : le palier s'en déduit. */
  jours?: number;
  /** Ou un palier précis (la rangée des cinq flammes de la feuille). */
  palier?: IdFlamme;
  /** La largeur en px ; la hauteur vaut 1,2 fois. */
  taille: number;
  /** Une flamme pas encore atteinte : grisée. */
  eteinte?: boolean;
  style?: CSSProperties;
}) {
  // Les identifiants des dégradés doivent être uniques dans la page : la
  // feuille en affiche six à la fois.
  const k = `fs${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const id = palier ?? palierFlamme(jours ?? 1).id;
  const d = DESSINS[id];
  const contour = CONTOURS[id];

  return (
    <svg
      width={taille}
      height={Math.round(taille * 1.2)}
      viewBox="0 0 100 120"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flex: "none", overflow: "visible", filter: eteinte ? "grayscale(0.85) opacity(0.5)" : undefined, ...style }}
    >
      <defs>
        <radialGradient id={`${k}c`} cx="50" cy="102" r="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={d.corps[0]} />
          <stop offset="1" stopColor={d.corps[1]} />
        </radialGradient>
        <radialGradient id={`${k}m`} cx="50" cy="106" r="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={d.flammeMilieu[0]} />
          <stop offset="1" stopColor={d.flammeMilieu[1]} />
        </radialGradient>
        {d.baseBleue ? (
          <linearGradient id={`${k}h`} x1="0" y1="110" x2="0" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#B9DCFF" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
        ) : (
          <radialGradient id={`${k}h`} cx="50" cy="106" r="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={d.flammeCoeur[0]} />
            <stop offset="1" stopColor={d.flammeCoeur[1]} />
          </radialGradient>
        )}
        {/* Le volume : une ombre sur le flanc droit, un reflet sur le gauche. */}
        <linearGradient id={`${k}o`} x1="18" y1="0" x2="92" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.45" stopColor="#7A1800" stopOpacity="0" />
          <stop offset="1" stopColor="#7A1800" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={`${k}r`} cx="33" cy="74" r="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {d.lueur && (
          <radialGradient id={`${k}l`} cx="50" cy="78" r="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={d.lueur[0]} stopOpacity={d.lueur[1]} />
            <stop offset="1" stopColor={d.lueur[0]} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {d.lueur && <circle cx="50" cy="78" r="64" fill={`url(#${k}l)`} />}
      {d.aureole && <circle cx="50" cy="68" r="51" fill="none" stroke="#F0A818" strokeOpacity="0.6" strokeWidth="1.5" />}
      <path d={contour} fill={`url(#${k}c)`} />
      <path d={contour} fill={`url(#${k}o)`} />
      <path d={MILIEU[d.milieu]} fill={`url(#${k}m)`} />
      <path d={COEUR[d.coeur]} fill={`url(#${k}h)`} />
      <path d={contour} fill={`url(#${k}r)`} />
      {d.braises.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={d.braise} />
      ))}
    </svg>
  );
}
