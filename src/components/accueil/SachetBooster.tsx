"use client";

import Image from "next/image";
import { animate, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import styles from "./SachetBooster.module.css";

const textures = {
  face: ["face-hd",1024,1682,"polygon(.5% 1%,99.5% 0,99.5% 7%,97% 25%,97% 76%,100% 94%,100% 99%,1% 99%,1% 94%,3% 76%,3% 25%,0 7%)"],
  dos: ["dos-hd",1024,1756,"polygon(0 1%,100% 0,100% 8%,96% 27%,96% 76%,100% 94%,100% 99%,0 99%,0 94%,4% 76%,4% 27%,0 8%)"],
  gauche: ["cote-gauche",39,397,"polygon(41% 0,49% 11%,85% 19%,99% 30%,100% 76%,79% 91%,58% 100%,34% 97%,9% 83%,0 73%,1% 29%,17% 16%)"],
  droite: ["cote-droit",43,398,"polygon(47% 0,55% 10%,84% 19%,96% 30%,99% 76%,84% 89%,62% 98%,40% 100%,16% 90%,2% 77%,0 30%,20% 16%)"],
  dessus: ["dessus",196,32,"polygon(0 70%,9% 39%,25% 15%,45% 3%,62% 3%,84% 18%,97% 51%,100% 71%,86% 87%,62% 97%,39% 98%,12% 87%)"],
  dessous: ["dessous",194,31,"polygon(0 72%,9% 42%,25% 14%,45% 4%,65% 4%,84% 21%,97% 54%,100% 73%,84% 87%,60% 97%,37% 98%,12% 87%)"],
} as const;

type Texture = keyof typeof textures;
const faces = Object.keys(textures) as Texture[];
const angleHorizontalMax = 180;
const angleVerticalMax = 8;
const bornerAngle = (angle: number, max: number) => Math.max(-max, Math.min(max, angle));

function ImageSachet({ cote, miniature = false }: { cote: Texture; miniature?: boolean }) {
  const [fichier, largeur, hauteur, clipPath] = textures[cote];
  return <Image className={styles.image} src={`/boosters/sachet-360/${miniature ? "face" : fichier}.webp`}
    alt="" width={miniature ? 235 : largeur} height={miniature ? 386 : hauteur} unoptimized draggable={false}
    loading="eager" style={{ clipPath }} />;
}

export function MiniSachetBooster() {
  return <div className={styles.mini} aria-hidden="true"><ImageSachet cote="face" miniature /></div>;
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
  const [deFace, setDeFace] = useState(true);
  const [coupe, setCoupe] = useState<Coupe>();
  const lacet = useMotionValue(0);
  const tangage = useMotionValue(0);
  const faceCourante = useRef(true);
  const orientation = useMotionTemplate`translateZ(calc(var(--epaisseur) * -.5)) rotateY(${lacet}deg) rotateX(${tangage}deg)`;
  const reduire = useReducedMotion();
  const rotation = useRef<{ x: number; y: number; dernierGeste: number } | null>(null);
  const dechirure = useRef<{ trace: Point[]; versDroite: boolean } | null>(null);
  const scene = useRef<HTMLDivElement>(null);
  const enCours = useRef(false);

  const estDeFace = () => Math.abs(lacet.get()) < 12 && Math.abs(tangage.get()) < 4;
  const suivreOrientation = () => {
    const face = estDeFace();
    if (face === faceCourante.current) return;
    faceCourante.current = face;
    setDeFace(face);
  };
  useMotionValueEvent(lacet, "change", suivreOrientation);
  useMotionValueEvent(tangage, "change", suivreOrientation);

  function tournerVers(horizontal: number, vertical: number) {
    lacet.stop();
    tangage.stop();
    const cibleHorizontale = bornerAngle(horizontal, angleHorizontalMax);
    const cibleVerticale = bornerAngle(vertical, angleVerticalMax);
    if (reduire) {
      lacet.set(cibleHorizontale);
      tangage.set(cibleVerticale);
      return;
    }
    const transition = { type: "tween", duration: .34, ease: "easeOut" } as const;
    animate(lacet, cibleHorizontale, transition);
    animate(tangage, cibleVerticale, transition);
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
    <div className={styles.scene} ref={scene} data-sachet="" data-face={deFace ? "" : undefined} data-sortie={sortie ? "" : undefined}>
      {sortie && <div className={styles.cartes}>{enfants}</div>}
      {!coupe ? <div className={styles.camera} aria-hidden="true">
        <motion.div className={styles.modele} style={{ transform: orientation }}>
          {faces.map(cote => <div className={`${styles.face3d} ${styles[cote]}`} key={cote}>
            <ImageSachet cote={cote} />
          </div>)}
        </motion.div>
      </div> : <>
        <motion.div className={styles.corps} style={{ clipPath: coupe?.bas }}
          animate={sortie ? { y: "32%", rotate: -10, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={{ delay: sortie ? .34 : 0, duration: .62, ease: "easeInOut" }}>
          <ImageSachet cote="face" />
          {coupe && <div className={styles.fil} style={{ clipPath: coupe.fil }} />}
        </motion.div>
        {coupe && <motion.div className={styles.bande} style={{ clipPath: coupe.haut }}
          animate={sortie ? { y: -95, x: 85, rotate: 18, opacity: 0 }
            : { y: -coupe.avancee * 8, x: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: sortie ? .54 : 0, ease: "easeOut" }}><ImageSachet cote="face" /></motion.div>}
      </>}
      <button type="button" className={styles.rotation} disabled={chargement}
        aria-label="Tourner le booster"
        onKeyDown={event => {
          const deplacements: Record<string, [number, number]> = {
            ArrowLeft: [-36, 0], ArrowRight: [36, 0], ArrowUp: [0, -4], ArrowDown: [0, 4],
          };
          const pas = deplacements[event.key];
          if (!pas && event.key !== "Home") return;
          event.preventDefault();
          if (pas) tournerVers(lacet.get() + pas[0], tangage.get() + pas[1]);
          else tournerVers(0, 0);
        }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          lacet.stop();
          tangage.stop();
          rotation.current = { x: event.clientX, y: event.clientY, dernierGeste: 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const geste = rotation.current;
          if (!geste || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const dx = event.clientX - geste.x;
          const dy = event.clientY - geste.y;
          geste.x = event.clientX;
          geste.y = event.clientY;
          geste.dernierGeste = performance.now();
          lacet.set(bornerAngle(lacet.get() + dx * 240 / event.currentTarget.offsetWidth, angleHorizontalMax));
          tangage.set(bornerAngle(tangage.get() - dy * .18, angleVerticalMax));
        }}
        onPointerUp={event => {
          if (!event.isPrimary || !rotation.current) return;
          const geste = rotation.current;
          rotation.current = null;
          const angle = lacet.get();
          const rapide = geste.dernierGeste > 0 && performance.now() - geste.dernierGeste < 100 && !reduire;
          const inertie = rapide ? Math.max(-95, Math.min(95, lacet.getVelocity() * .13)) : 0;
          const cible = bornerAngle(angle + inertie, angleHorizontalMax);
          if (Math.abs(cible) < 12 && Math.abs(tangage.get()) < 4) tournerVers(0, 0);
          else if (inertie) tournerVers(cible, tangage.get());
        }}
        onPointerCancel={() => { rotation.current = null; }}
        onClick={event => { if (event.detail === 0) tournerVers(lacet.get() + 36, tangage.get()); }}
      />
      {deFace && <button type="button" className={styles.soudure} aria-label="Ouvrir le booster par la soudure"
        disabled={chargement}
        onClick={event => { if (event.detail === 0) ouvrirSachet([[0, 8], [28, 8.9], [53, 7.7], [76, 8.5]], true); }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || enCours.current || !estDeFace()) return;
          lacet.stop();
          tangage.stop();
          lacet.set(0);
          tangage.set(0);
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
    {!chargement && !deFace && <button type="button" className={styles.revenir}
      onClick={() => tournerVers(0, 0)}>Revenir de face</button>}
    <p>{chargement ? "Ouverture…" : deFace ? "Glisse pour retourner le sachet. Déchire le haut pour ouvrir." : "Reviens de face pour déchirer le haut."}</p>
  </>;
}
