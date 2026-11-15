"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import styles from "./SachetBooster.module.css";

const vues = [
  { fichier: "face", nom: "Face", largeur: 353, hauteur: 587, contour: "0 0,100% 0,100% 6%,97% 21%,96% 70%,98% 88%,100% 94%,100% 100%,0 100%,0 94%,3% 88%,4% 70%,3% 21%,0 6%" },
  { fichier: "trois-quarts", nom: "Trois quarts", largeur: 238, hauteur: 603, contour: ".6% 0,98% 11%,99% 16%,96% 24%,96% 71%,99% 90%,99.5% 96%,2.3% 100%,2% 94%,3% 87%,1% 20%,0 7%" },
  { fichier: "profil", nom: "Côté", largeur: 47, hauteur: 603, contour: "40% 0,49% 8%,74% 14%,86% 24%,96% 57%,100% 78%,90% 90%,74% 97%,57% 100%,28% 97%,12% 87%,5% 73%,0 38%,8% 20%,27% 12%" },
  { fichier: "trois-quarts-arriere", nom: "Trois quarts arrière", largeur: 173, hauteur: 591, contour: "2% 0,98% 11%,98% 15%,95% 26%,95% 72%,99% 90%,99.5% 94%,2% 100%,1.5% 94%,1% 75%,0 22%,2% 8%" },
  { fichier: "dos", nom: "Dos", largeur: 316, hauteur: 565, contour: ".5% 1%,99.5% 0,99.5% 6%,96% 20%,95% 69%,98% 87%,100% 94%,100% 100%,0 100%,0 94%,3% 86%,5% 69%,4% 22%,0 7%" },
];

function VueSachet({ index }: { index: number }) {
  const vue = vues[index];
  return <Image className={styles.image} src={`/boosters/sachet/${vue.fichier}.webp`}
    alt="" width={vue.largeur} height={vue.hauteur} unoptimized draggable={false}
    loading="eager" style={{ clipPath: `polygon(${vue.contour})` }} />;
}

export function MiniSachetBooster() {
  return <div className={styles.mini} aria-hidden="true"><VueSachet index={0} /></div>;
}

type Point = [x: number, y: number];
type Coupe = { haut: string; bas: string; fil: string; avancee: number };
const polygone = (points: Point[]) => `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(",")})`;

function suivreDechirure(points: Point[], versDroite: boolean): Coupe {
  const [x] = points[points.length - 1];
  const gauche = versDroite ? 0 : x;
  const droite = versDroite ? x : 100;
  const ligne = versDroite ? points : [...points].reverse();
  const inverse = [...ligne].reverse();
  return {
    haut: polygone([[gauche, 0], [droite, 0], ...inverse]),
    bas: polygone([
      ...(!versDroite ? [[0, 0], [x, 0]] as Point[] : []),
      ...ligne,
      ...(versDroite ? [[x, 0], [100, 0]] as Point[] : []),
      [100, 100], [0, 100],
    ]),
    fil: polygone([...ligne, ...inverse.map(([a, b]): Point => [a, b + .72])]),
    avancee: (droite - gauche) / 100,
  };
}

export default function SachetBooster({ ouvrir, chargement, sortie, enfants }: {
  ouvrir: () => void;
  chargement: boolean;
  sortie: boolean;
  enfants?: ReactNode;
}) {
  const [vue, setVue] = useState(0);
  const [coupe, setCoupe] = useState<Coupe>();
  const angle = useRef(0);
  const rotation = useRef<{ x: number; angle: number; pas: number; glisse: boolean } | null>(null);
  const dechirure = useRef<{ trace: Point[]; versDroite: boolean } | null>(null);
  const scene = useRef<HTMLDivElement>(null);
  const enCours = useRef(false);

  function montrer(prochaine: number) {
    const phase = ((prochaine % 8) + 8) % 8;
    const positionVue = phase <= 4 ? phase : 8 - phase;
    const index = Math.round(positionVue);
    scene.current?.style.setProperty("--pivot", `${(positionVue - index) * 25}deg`);
    setVue(index);
  }

  function aller(prochaine: number) {
    angle.current = prochaine;
    montrer(prochaine);
  }

  function ouvrirSachet(trace: Point[], versDroite: boolean) {
    if (enCours.current || chargement) return;
    enCours.current = true;
    setCoupe(suivreDechirure([...trace, [versDroite ? 100 : 0, trace[trace.length - 1][1]]], versDroite));
    ouvrir();
  }

  function position(event: PointerEvent): Point {
    const { left, top, width, height } = scene.current!.getBoundingClientRect();
    return [
      Math.max(0, Math.min(100, (event.clientX - left) / width * 100)),
      Math.max(4, Math.min(12, (event.clientY - top) / height * 100)),
    ];
  }

  return <>
    <div className={styles.scene} ref={scene} data-vue={vue} data-sortie={sortie ? "" : undefined}>
      {sortie && <div className={styles.cartes}>{enfants}</div>}
      {vue === 0 && <>
        <motion.div className={styles.corps} style={{ clipPath: coupe?.bas }}
          animate={sortie ? { y: "32%", rotate: -10, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={{ delay: sortie ? .34 : 0, duration: .62, ease: "easeInOut" }}>
          <VueSachet index={0} />
          {coupe && <div className={styles.fil} style={{ clipPath: coupe.fil }} />}
        </motion.div>
        {coupe && <motion.div className={styles.bande} style={{ clipPath: coupe.haut }}
          animate={sortie ? { y: -95, x: 85, rotate: 18, opacity: 0 }
            : { y: -coupe.avancee * 8, x: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: sortie ? .54 : 0, ease: "easeOut" }}><VueSachet index={0} /></motion.div>}
      </>}
      {vues.slice(1).map((item, index) =>
        <div className={styles.vue} key={item.fichier} data-visible={vue === index + 1 ? "" : undefined}>
          <VueSachet index={index + 1} />
        </div>
      )}
      <button type="button" className={styles.rotation} disabled={chargement}
        aria-label={`Tourner le booster · ${vues[vue].nom}`}
        onKeyDown={event => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          aller(Math.max(0, Math.min(4, vue + (event.key === "ArrowRight" ? 1 : -1))));
        }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          rotation.current = { x: event.clientX, angle: angle.current, pas: event.currentTarget.offsetWidth / 4.7, glisse: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const geste = rotation.current;
          if (!geste || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const distance = geste.x - event.clientX;
          if (Math.abs(distance) > 6) geste.glisse = true;
          if (geste.glisse) aller(geste.angle + distance / geste.pas);
        }}
        onPointerUp={event => {
          if (event.isPrimary && rotation.current?.glisse) aller(Math.round(angle.current));
        }}
        onPointerCancel={() => { rotation.current = null; }}
        onClick={() => {
          if (!rotation.current?.glisse) aller(Math.round(angle.current) + 1);
          rotation.current = null;
        }}
      />
      {vue === 0 && <button type="button" className={styles.soudure} aria-label="Ouvrir le booster par la soudure"
        disabled={chargement}
        onClick={event => { if (event.detail === 0) ouvrirSachet([[0, 8], [28, 8.9], [53, 7.7], [76, 8.5]], true); }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || enCours.current) return;
          const [x, y] = position(event);
          const versDroite = x <= 50;
          dechirure.current = { trace: [[versDroite ? 0 : 100, y]], versDroite };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const geste = dechirure.current;
          if (!geste || enCours.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const [x, y] = position(event);
          const precedent = geste.trace[geste.trace.length - 1][0];
          if ((geste.versDroite ? x - precedent : precedent - x) < .7) return;
          geste.trace.push([x, y]);
          if (geste.versDroite ? x >= 94 : x <= 6) {
            ouvrirSachet(geste.trace, geste.versDroite);
          } else {
            setCoupe(suivreDechirure(geste.trace, geste.versDroite));
          }
        }}
        onLostPointerCapture={() => {
          dechirure.current = null;
          if (!enCours.current) setCoupe(undefined);
        }} />}
    </div>
    {!chargement && <div className={styles.commandes}>
      <button type="button" disabled={vue === 0} onClick={() => aller(vue - 1)} aria-label="Vue précédente">‹</button>
      <span aria-live="polite">{vues[vue].nom}</span>
      <button type="button" disabled={vue === 4} onClick={() => aller(vue + 1)} aria-label="Vue suivante">›</button>
    </div>}
    <p>{chargement ? "Ouverture…" : vue === 0 ? "Glisse pour tourner. Déchire le haut pour ouvrir." : "Glisse ou reviens de face pour déchirer le haut."}</p>
  </>;
}
