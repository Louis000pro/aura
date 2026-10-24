"use client";

/* ════════════════════════════════════════════════════════════════════
   L'affiche de saison, entre « Une idée » et « Trouver une recette »
   (lib/momentsSaison ; maquette « La saison, en décor », niveau 2, en
   clair et en sombre, Louis, 2026-10-24).

   Sur le téléphone, elle prend toute la largeur : sa lumière naît et
   s'éteint dans le fond de la page. Quatre ou cinq produits de la saison
   se posent derrière le mot, sur une même ligne (`NATURE_MORTE`), et le
   motif du moment bouge derrière le texte et derrière les photos, jamais
   par-dessus. Sur ordinateur, c'est un bloc arrondi.

   ⚠️ LE MOT SE MESURE, comme `useMotAjuste` : « Barbecue » ou « Agrumes »
   ne tiennent pas à 76 px sur un téléphone, donc la taille descend
   jusqu'à ce que la ligne la plus large tienne.

   ⚠️ LE DÉCOR S'ARRÊTE quand le téléphone demande moins de mouvement et
   sur un appareil modeste (`perf-lite`) : ce qui tombe ou s'envole reste
   posé à une place qui évite le texte, ce qui tourne ou saute s'arrête,
   ce qui scintille reste allumé. Le cahier de la rentrée ne bouge
   jamais.

   ⚠️ LES COULEURS VIVENT DANS LE MODULE CSS, une classe par moment, en
   clair et en sombre. Le violet reste l'action (« Voir les recettes ») et
   aucun décor n'utilise l'or saturé : il dit Vaiiya+.
   ════════════════════════════════════════════════════════════════════ */

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import { dureeRecette } from "@/lib/collectionsRecettes";
import { imageProduit, type MomentActif, type MotifSaison } from "@/lib/momentsSaison";
import MarqueFavori from "@/components/nutrition/MarqueFavori";
import s from "@/components/nutrition/AfficheSaison.module.css";

const TAILLE_MOT = 76;

/* La ligne la plus large du mot, posée à 100 px et mesurée : la taille la
   fait tenir dans la largeur, sans jamais dépasser `plafond`. Relu quand
   l'affiche change de largeur et quand la police arrive. */
function useTitreAjuste(lignes: string[], plafond: number) {
  const boite = useRef<HTMLDivElement>(null);
  const mesure = useRef<HTMLSpanElement>(null);
  const [taille, setTaille] = useState(0);
  const cle = lignes.join("|");
  useLayoutEffect(() => {
    const b = boite.current, m = mesure.current;
    if (!b || !m) return;
    const ajuster = () => {
      const large = Math.max(0, ...Array.from(m.children, (c) => c.getBoundingClientRect().width));
      if (!large) return;
      setTaille(Math.min(plafond, Math.floor((100 * b.clientWidth) / large * 0.98)));
    };
    ajuster();
    const ro = new ResizeObserver(ajuster);
    ro.observe(b);
    document.fonts?.ready.then(ajuster).catch(() => {});
    return () => ro.disconnect();
  }, [cle, plafond]);
  return { boite, mesure, taille };
}

/* ── Les motifs ─────────────────────────────────────────────────────── */

const CHENE = "M12 1Q17.5 4.5 14.2 8Q20 10.5 15 13.6Q21 17 15.2 19.6Q18.6 23.4 13.6 25.4L12.6 26.6L12.6 33L11.4 33L11.4 26.6L10.4 25.4Q5.4 23.4 8.8 19.6Q3 17 9 13.6Q4 10.5 9.8 8Q6.5 4.5 12 1Z";
const HETRE = "M4 20C4 10 10 4 20 4C20 14 14 20 4 20Z";

/* `x` en pourcentage de la largeur ; `y` et `r`, la place d'une feuille
   posée quand le décor ne bouge pas : à gauche entre le surtitre et le mot,
   au bas de l'affiche, ou cachée derrière une photo, jamais sur un texte. */
const FEUILLES = [
  { x: 5, taille: 17, chute: 16, delai: -3, balance: 3.4, bdelai: -1.2, y: 140, r: -24, chene: true, teinte: 1 },
  { x: 29, taille: 15, chute: 18, delai: -11, balance: 2.9, bdelai: -0.4, y: 650, r: 40, chene: false, teinte: 2 },
  { x: 48, taille: 21, chute: 14, delai: -6, balance: 3.8, bdelai: -2, y: 620, r: 18, chene: true, teinte: 3 },
  { x: 69, taille: 18, chute: 17, delai: -14, balance: 3.1, bdelai: -1.6, y: 630, r: -30, chene: false, teinte: 4 },
  { x: 82, taille: 16, chute: 15, delai: -8, balance: 3.6, bdelai: -0.8, y: 430, r: 30, chene: true, teinte: 5 },
  { x: 92, taille: 14, chute: 13, delai: -1, balance: 2.7, bdelai: -2.2, y: 120, r: 12, chene: false, teinte: 6 },
];

function Feuilles() {
  return (
    <div className={s.chutes} aria-hidden>
      {FEUILLES.map((f, i) => (
        <span key={i} className={s.chute}
          style={{ left: `${f.x}%`, animationDuration: `${f.chute}s`, animationDelay: `${f.delai}s`, "--y": `${f.y}px` } as CSSProperties}>
          <svg viewBox={f.chene ? "0 0 24 34" : "0 0 24 24"} className={`${s.feuille} ${s[`teinte${f.teinte}`]}`}
            style={{ width: f.taille, animationDuration: `${f.balance}s`, animationDelay: `${f.bdelai}s`, "--r": `${f.r}deg` } as CSSProperties}>
            <path d={f.chene ? CHENE : HETRE} />
            <path d={f.chene ? "M12 4V26" : "M4 20L16 8"} className={s.nervure} />
          </svg>
        </span>
      ))}
    </div>
  );
}

const FLOCONS = [
  { x: 6, taille: 12, chute: 20, delai: -4, tourne: 5.2, tdelai: -1.4, y: 140, r: 20 },
  { x: 23, taille: 9, chute: 24, delai: -15, tourne: 4.6, tdelai: -0.6, y: 520, r: -30 },
  { x: 38, taille: 15, chute: 18, delai: -9, tourne: 5.8, tdelai: -2.2, y: 100, r: 10 },
  { x: 55, taille: 11, chute: 22, delai: -2, tourne: 4.9, tdelai: -3.1, y: 720, r: 45 },
  { x: 67, taille: 16, chute: 19, delai: -12, tourne: 6.2, tdelai: -0.9, y: 700, r: -15 },
  { x: 82, taille: 10, chute: 25, delai: -18, tourne: 4.4, tdelai: -2.6, y: 420, r: 35 },
  { x: 93, taille: 13, chute: 21, delai: -7, tourne: 5.5, tdelai: -1.8, y: 80, r: -40 },
];
const BRAS = "M12 12V2.6M9.7 4.9 12 7.2l2.3-2.3";
const ANGLES = [0, 60, 120, 180, 240, 300];

function Neige() {
  return (
    <div className={s.chutes} aria-hidden>
      {FLOCONS.map((f, i) => (
        <span key={i} className={`${s.chute} ${s.lente}`}
          style={{ left: `${f.x}%`, animationDuration: `${f.chute}s`, animationDelay: `${f.delai}s`, "--y": `${f.y}px` } as CSSProperties}>
          <svg viewBox="0 0 24 24" className={s.flocon}
            style={{ width: f.taille, animationDuration: `${f.tourne}s`, animationDelay: `${f.tdelai}s`, "--r": `${f.r}deg` } as CSSProperties}>
            <g className={s.floconOmbre}>{ANGLES.map((a) => <path key={a} d={BRAS} transform={a ? `rotate(${a} 12 12)` : undefined} />)}</g>
            <g className={s.floconTrait}>{ANGLES.map((a) => <path key={a} d={BRAS} transform={a ? `rotate(${a} 12 12)` : undefined} />)}</g>
          </svg>
        </span>
      ))}
    </div>
  );
}

/* La guirlande suit la courbe M-10 6 Q195 64 400 6 d'une affiche de 390 px :
   x = -10 + 410 t et y = 6 + 116 t (1 - t). Les ampoules se placent en
   pourcentage, donc elles suivent le fil quand l'affiche s'élargit. */
const AMPOULES = Array.from({ length: 11 }, (_, k) => {
  const t = 0.05 + k * 0.09;
  return {
    x: ((-10 + 410 * t) / 390) * 100,
    y: 6 + 116 * t * (1 - t),
    teinte: k % 5,
    delai: (k * 0.7) % 2.6,
    duree: 2.2 + (k % 3) * 0.5,
  };
});

function Guirlande() {
  return (
    <div className={s.guirlande} aria-hidden>
      <svg viewBox="0 0 390 64" preserveAspectRatio="none" className={s.fil}>
        <path d="M-10 6 Q195 64 400 6" vectorEffect="non-scaling-stroke" />
      </svg>
      {AMPOULES.map((a, k) => (
        <span key={k} className={`${s.ampoule} ${s[`lampe${a.teinte}`]}`}
          style={{ left: `${a.x.toFixed(2)}%`, top: a.y + 3.5, animationDelay: `-${a.delai.toFixed(1)}s`, animationDuration: `${a.duree.toFixed(1)}s` }} />
      ))}
    </div>
  );
}

function Vapeur() {
  return (
    <svg viewBox="0 0 110 92" className={s.vapeur} aria-hidden>
      <path d="M22 90 C12 77 32 66 22 53 C12 40 30 31 22 18" />
      <path className={s.v2} d="M55 90 C45 77 65 66 55 53 C45 40 63 31 55 18" />
      <path className={s.v3} d="M88 90 C78 77 98 66 88 53 C78 40 96 31 88 18" />
    </svg>
  );
}

function Soleil() {
  return (
    <div className={s.soleil} aria-hidden>
      <div className={s.rayons} />
      <div className={s.disque} />
    </div>
  );
}

/* La pluie de novembre : des gouttes en biais qui traversent l'affiche.
   `x` en pourcentage (une goutte qui part au-delà du bord droit y entre en
   tombant) ; `y`, sa place quand le décor ne bouge pas : au-dessus des
   produits, à gauche entre le surtitre et le mot, ou derrière une photo. */
const GOUTTES = [
  { x: 8.7, duree: 2.9, delai: -0.3, y: 150 },
  { x: 20, duree: 3.3, delai: -2.1, y: 420 },
  { x: 31.3, duree: 2.6, delai: -1.2, y: 380 },
  { x: 42.6, duree: 3.1, delai: -2.7, y: 76 },
  { x: 53.3, duree: 2.8, delai: -0.9, y: 440 },
  { x: 64.6, duree: 3.4, delai: -1.8, y: 60 },
  { x: 75.4, duree: 2.7, delai: -2.4, y: 400 },
  { x: 86.2, duree: 3.2, delai: -0.6, y: 76 },
  { x: 96.9, duree: 2.9, delai: -1.5, y: 380 },
  { x: 107.7, duree: 3.0, delai: -2.9, y: 470 },
  { x: 118.5, duree: 2.7, delai: -0.2, y: 560 },
  { x: 129.7, duree: 3.3, delai: -1.1, y: 120 },
];

function Pluie() {
  return (
    <div className={s.pluie} aria-hidden>
      {GOUTTES.map((g, i) => (
        <span key={i} className={s.goutte}
          style={{ left: `${g.x}%`, animationDuration: `${g.duree}s`, animationDelay: `${g.delai}s`, "--y": `${g.y}px` } as CSSProperties} />
      ))}
    </div>
  );
}

/* Le givre des premiers froids : une brume blanche sur les deux bords et
   des cristaux qui s'y posent. Chaque cristal se place par son centre,
   depuis le bord dont il est proche (`gauche` ou `droite`) : sur
   ordinateur, l'affiche s'élargit et le givre reste au bord. Le haut se
   compte depuis le haut et le bas depuis le bas, parce que le rail des
   recettes a toujours la même hauteur ; en bas, les cristaux restent dans
   la marge, à côté des photos et du lien. */
type PlaceGivre = { gauche?: number; droite?: number; haut?: number; bas?: number; taille: number };

function placeGivre(p: PlaceGivre): CSSProperties {
  const r = p.taille / 2;
  return {
    width: p.taille, height: p.taille,
    ...(p.droite !== undefined ? { right: p.droite - r } : { left: (p.gauche ?? 0) - r }),
    ...(p.bas !== undefined ? { bottom: p.bas - r } : { top: (p.haut ?? 0) - r }),
  };
}

const CRISTAUX: (PlaceGivre & { angle: number })[] = [
  { gauche: 12, haut: 72, taille: 26, angle: 0 },
  { gauche: 30, haut: 112, taille: 16, angle: 13 },
  { gauche: 9, haut: 146, taille: 30, angle: 26 },
  { gauche: 4, haut: 214, taille: 14, angle: 39 },
  { gauche: 0, haut: 262, taille: 22, angle: 52 },
  { gauche: 7, bas: 180, taille: 14, angle: 5 },
  { gauche: 6, bas: 52, taille: 18, angle: 18 },
  { droite: 12, haut: 206, taille: 24, angle: 31 },
  { droite: 26, haut: 248, taille: 14, angle: 44 },
  { droite: 7, haut: 296, taille: 28, angle: 57 },
  { droite: 20, bas: 56, taille: 20, angle: 10 },
  { droite: 6, bas: 30, taille: 16, angle: 23 },
];
const ECLATS: (PlaceGivre & { duree: number; delai: number })[] = [
  { gauche: 36, haut: 88, taille: 10, duree: 2.8, delai: -0.4 },
  { gauche: 10, haut: 196, taille: 8, duree: 3.4, delai: -1.6 },
  { droite: 18, haut: 232, taille: 9, duree: 3.0, delai: -2.2 },
  { droite: 10, haut: 300, taille: 7, duree: 3.6, delai: -0.8 },
  { gauche: 8, bas: 150, taille: 8, duree: 3.2, delai: -2.6 },
  { droite: 24, bas: 44, taille: 8, duree: 2.6, delai: -1.2 },
];
const BRAS_CRISTAL = "M24 24V5M24 15 18.5 10.5M24 15 29.5 10.5M24 9.5 20.5 6.5M24 9.5 27.5 6.5M24 20 21 17.6M24 20 27 17.6";

function Givre() {
  const branches = ANGLES.map((a) => <path key={a} d={BRAS_CRISTAL} transform={a ? `rotate(${a} 24 24)` : undefined} />);
  return (
    <div className={s.givre} aria-hidden>
      {CRISTAUX.map((c, i) => (
        <svg key={i} viewBox="0 0 48 48" className={s.cristal} style={{ ...placeGivre(c), transform: `rotate(${c.angle}deg)` }}>
          <g className={s.cristalOmbre}>{branches}</g>
          <g className={s.cristalTrait}>{branches}</g>
        </svg>
      ))}
      {ECLATS.map((e, i) => (
        <svg key={i} viewBox="0 0 24 24" className={s.eclat}
          style={{ ...placeGivre(e), animationDuration: `${e.duree}s`, animationDelay: `${e.delai}s` }}>
          <path d="M12 3 13.2 10.8 21 12 13.2 13.2 12 21 10.8 13.2 3 12 10.8 10.8Z" />
        </svg>
      ))}
    </div>
  );
}

/* Une tranche d'orange qui tourne lentement en haut à droite, derrière
   les produits : dix quartiers séparés par la peau blanche. */
function surCercle(r: number, degres: number) {
  const a = ((degres - 90) * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
}
const QUARTIERS = Array.from({ length: 10 }, (_, k) => {
  const a1 = k * 36 + 2.5, a2 = (k + 1) * 36 - 2.5;
  return `M${surCercle(12, a1)}L${surCercle(84, a1)}A84 84 0 0 1 ${surCercle(84, a2)}L${surCercle(12, a2)}A12 12 0 0 0 ${surCercle(12, a1)}Z`;
});

function Tranche() {
  return (
    <div className={s.trancheCadre} aria-hidden>
      <svg viewBox="-100 -100 200 200" className={s.tranche}>
        <circle r={97} className={s.zeste} />
        <circle r={90} className={s.albedo} />
        <g className={s.pulpe}>{QUARTIERS.map((d, k) => <path key={k} d={d} />)}</g>
        <circle r={7} className={s.albedo} />
      </svg>
    </div>
  );
}

/* Une crêpe qui saute, à gauche entre le surtitre et le mot : elle monte,
   fait un tour complet et retombe à plat, et son ombre rétrécit pendant le
   saut. */
const TACHES = [[28, 30, 5, 3.4], [49, 25, 4, 2.8], [55, 46, 6, 4], [33, 53, 5, 3.5], [44, 38, 3, 2.1], [22, 44, 3.4, 2.4], [59, 33, 2.6, 1.9], [41, 62, 3.6, 2.4]];

function Crepe() {
  return (
    <>
      <div className={s.crepeOmbre} aria-hidden />
      <div className={s.crepeScene} aria-hidden>
        <svg viewBox="0 0 80 80" className={s.crepe}>
          <circle cx={40} cy={40} r={36} className={s.pate} />
          <g className={s.tache}>{TACHES.map(([cx, cy, rx, ry], i) => <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />)}</g>
        </svg>
      </div>
    </>
  );
}

/* Les pétales de Pâques tombent comme les feuilles de l'automne, et se
   posent aux mêmes places quand le décor ne bouge pas. */
const PETALE = "M12 21.5C6.4 17.2 4.8 10.6 8.5 4.1C9.5 5.6 10.7 6.4 12 6.4C13.3 6.4 14.5 5.6 15.5 4.1C19.2 10.6 17.6 17.2 12 21.5Z";
const PETALES = [
  { x: 5, taille: 15, chute: 15, delai: -3, balance: 3.2, bdelai: -1.2, y: 140, r: -24 },
  { x: 29, taille: 13, chute: 17, delai: -11, balance: 2.8, bdelai: -0.4, y: 650, r: 40 },
  { x: 48, taille: 17, chute: 13, delai: -6, balance: 3.6, bdelai: -2, y: 620, r: 18 },
  { x: 69, taille: 14, chute: 16, delai: -14, balance: 3, bdelai: -1.6, y: 630, r: -30 },
  { x: 82, taille: 16, chute: 14, delai: -8, balance: 3.4, bdelai: -0.8, y: 430, r: 30 },
  { x: 92, taille: 12, chute: 12, delai: -1, balance: 2.6, bdelai: -2.2, y: 120, r: 12 },
];

function Petales() {
  return (
    <div className={s.chutes} aria-hidden>
      {PETALES.map((p, i) => (
        <span key={i} className={s.chute}
          style={{ left: `${p.x}%`, animationDuration: `${p.chute}s`, animationDelay: `${p.delai}s`, "--y": `${p.y}px` } as CSSProperties}>
          <svg viewBox="0 0 24 24" className={`${s.petale} ${s[`teinte${i + 1}`]}`}
            style={{ width: p.taille, animationDuration: `${p.balance}s`, animationDelay: `${p.bdelai}s`, "--r": `${p.r}deg` } as CSSProperties}>
            <path d={PETALE} />
            <path d="M12 19.6V9" className={s.nervure} />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* Des aigrettes de pissenlit qui s'envolent du bas de l'affiche. Quand le
   décor ne bouge pas, elles restent en bas (`y` se compte depuis leur
   départ, sous l'affiche) : à droite du lien, ou derrière une photo. */
const FILS_AIGRETTE = [-78, -58, -38, -19, 0, 19, 38, 58, 78].map((degres) => {
  const a = (degres * Math.PI) / 180;
  return `M12 14L${(12 + 9 * Math.sin(a)).toFixed(2)} ${(14 - 9 * Math.cos(a)).toFixed(2)}`;
}).join("");
const TIGE_AIGRETTE = `M12 31V14${FILS_AIGRETTE}`;
const AIGRETTES = [
  { x: 8, taille: 20, duree: 19, delai: -4, flotte: 3.6, fdelai: -1.2, dx: 30, y: -260, r: -10 },
  { x: 24, taille: 16, duree: 23, delai: -13, flotte: 3.1, fdelai: -0.5, dx: -24, y: -200, r: 12 },
  { x: 41, taille: 22, duree: 17, delai: -8, flotte: 4.0, fdelai: -2, dx: 36, y: -40, r: -6 },
  { x: 58, taille: 18, duree: 21, delai: -2, flotte: 3.4, fdelai: -1.4, dx: -30, y: -64, r: 16 },
  { x: 72, taille: 24, duree: 18, delai: -16, flotte: 3.8, fdelai: -0.8, dx: 26, y: -96, r: -14 },
  { x: 86, taille: 17, duree: 24, delai: -10, flotte: 3.2, fdelai: -2.4, dx: -20, y: -230, r: 8 },
  { x: 95, taille: 19, duree: 20, delai: -6, flotte: 3.6, fdelai: -1.8, dx: -34, y: -52, r: -4 },
];

function Aigrettes() {
  const dessin = (classe: string) => (
    <g className={classe}>
      <path d={TIGE_AIGRETTE} />
      <ellipse cx={12} cy={31.6} rx={1.4} ry={2.6} />
    </g>
  );
  return (
    <div className={s.envols} aria-hidden>
      {AIGRETTES.map((a, i) => (
        <span key={i} className={s.envol}
          style={{ left: `${a.x}%`, animationDuration: `${a.duree}s`, animationDelay: `${a.delai}s`, "--dx": `${a.dx}px`, "--y": `${a.y}px` } as CSSProperties}>
          <svg viewBox="0 0 24 34" className={s.aigrette}
            style={{ width: a.taille, animationDuration: `${a.flotte}s`, animationDelay: `${a.fdelai}s`, "--r": `${a.r}deg` } as CSSProperties}>
            {dessin(s.aigretteOmbre)}
            {dessin(s.aigretteTrait)}
          </svg>
        </span>
      ))}
    </div>
  );
}

/* Des braises qui montent du bas en vacillant. Quand le décor ne bouge
   pas, elles restent au ras du bas de l'affiche, ou derrière une photo. */
const BRAISES = [
  { x: 6, taille: 4, duree: 7.4, delai: -1.2, dx: 30, y: -20, vacille: 0.9, vdelai: -0.3 },
  { x: 15, taille: 3, duree: 9.2, delai: -5.6, dx: -26, y: -200, vacille: 1.1, vdelai: -0.7 },
  { x: 27, taille: 5, duree: 8.1, delai: -3.3, dx: 42, y: -24, vacille: 0.8, vdelai: -0.2 },
  { x: 36, taille: 3, duree: 6.8, delai: -6.1, dx: -36, y: -300, vacille: 1.0, vdelai: -0.5 },
  { x: 48, taille: 4, duree: 9.6, delai: -2.4, dx: 22, y: -18, vacille: 0.7, vdelai: -0.4 },
  { x: 57, taille: 3, duree: 7.7, delai: -7.2, dx: -44, y: -260, vacille: 1.2, vdelai: -0.9 },
  { x: 66, taille: 5, duree: 8.6, delai: -4.5, dx: 34, y: -26, vacille: 0.9, vdelai: -0.1 },
  { x: 76, taille: 3, duree: 7.1, delai: -0.8, dx: -24, y: -220, vacille: 1.0, vdelai: -0.6 },
  { x: 85, taille: 4, duree: 9.0, delai: -6.6, dx: 48, y: -20, vacille: 0.8, vdelai: -0.8 },
  { x: 94, taille: 3, duree: 8.3, delai: -3.9, dx: -30, y: -240, vacille: 1.1, vdelai: -0.3 },
];

function Braises() {
  return (
    <div className={s.braises} aria-hidden>
      {BRAISES.map((b, i) => (
        <span key={i} className={s.braise}
          style={{ left: `${b.x}%`, animationDuration: `${b.duree}s`, animationDelay: `${b.delai}s`, "--dx": `${b.dx}px`, "--y": `${b.y}px` } as CSSProperties}>
          <i className={`${s.braisePoint} ${s[`teinte${(i % 3) + 1}`]}`}
            style={{ width: b.taille, height: b.taille, animationDuration: `${b.vacille}s`, animationDelay: `${b.vdelai}s` }} />
        </span>
      ))}
    </div>
  );
}

/* Les lignes d'un cahier de la rentrée, avec sa marge rouge : le seul
   motif qui ne bouge pas. Il vit sous tout le reste, avec la lumière. */
function Cahier() {
  return <div className={s.cahier} aria-hidden />;
}

/* Le décor de chaque motif : dans toute l'affiche, ou en haut, à côté du
   surtitre et derrière les produits. */
const DECOR_AFFICHE: Partial<Record<MotifSaison, ReactNode>> = {
  cahier: <Cahier />, feuilles: <Feuilles />, petales: <Petales />, neige: <Neige />, pluie: <Pluie />,
  givre: <Givre />, aigrettes: <Aigrettes />, braises: <Braises />, guirlande: <Guirlande />,
};
const DECOR_TETE: Partial<Record<MotifSaison, ReactNode>> = {
  soleil: <Soleil />, tranche: <Tranche />, crepe: <Crepe />,
};

/* ── L'affiche ──────────────────────────────────────────────────────── */

export default function AfficheSaison({ actif, estFavori, onOuvrir, onVoirTout }: {
  actif: MomentActif;
  /** Un petit cœur sur la photo d'une recette favorite. */
  estFavori: (id: string) => boolean;
  onOuvrir: (r: Recipe, liste: Recipe[]) => void;
  onVoirTout: () => void;
}) {
  const { moment, recettes, surtitre, phrase } = actif;
  const lignes = moment.titre.split(" ");
  const { boite, mesure, taille } = useTitreAjuste(lignes, TAILLE_MOT);
  const idTitre = useId();

  return (
    <section aria-labelledby={idTitre}
      className={`${s.affiche} ${s[moment.id]} ${moment.motif === "guirlande" ? s.avecGuirlande : ""}`}>
      {DECOR_AFFICHE[moment.motif]}

      <div className={s.tete}>
        {DECOR_TETE[moment.motif]}
        <span className={s.surtitre}>{surtitre}</span>
        {moment.vapeur && <Vapeur />}
        <div className={s.nature} aria-hidden>
          {moment.produits.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.nom} src={imageProduit(p.nom)} alt="" decoding="async" className={s.produit}
              style={{ left: p.x, top: p.y, width: p.taille, height: p.taille }} />
          ))}
        </div>
      </div>

      {/* La largeur utile, mesurée : le mot vit dedans et n'en sort pas. */}
      <div ref={boite} className={s.titreBoite}>
        <span ref={mesure} aria-hidden className={`${s.mot} ${s.mesure}`}>
          {lignes.map((l, i) => <span key={i}>{l}</span>)}
        </span>
        <h2 id={idTitre} className={`${s.mot} ${s.titre}`} style={taille ? { fontSize: taille } : { opacity: 0 }}>
          {lignes.map((l, i) => <span key={i} className={s.ligne}>{i > 0 ? " " : ""}{l}</span>)}
        </h2>
      </div>
      <p className={s.phrase}>{phrase}</p>

      <div className={s.rail}>
        {recettes.map((r) => (
          <button key={r.id} type="button" onClick={() => onOuvrir(r, recettes)} className={s.recette}>
            <span className={s.photoBoite}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image} alt="" loading="lazy" decoding="async" className={s.photo} />
              {estFavori(r.id) && <MarqueFavori taille={28} ecart={8} />}
            </span>
            <span className={s.nom}>{r.nom}</span>
            <span className={s.duree}>{dureeRecette(r)}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onVoirTout} className={s.lien}>
        Voir les {recettes.length}&nbsp;recettes
        <ChevronRight size={15} strokeWidth={2.3} aria-hidden />
      </button>
    </section>
  );
}
