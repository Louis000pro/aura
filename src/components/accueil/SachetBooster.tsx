"use client";

import Image from "next/image";
import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./SachetBooster.module.css";

const textures = {
  face: ["face-hd",1024,1682],
  dos: ["dos-hd",1024,1756],
  gauche: ["cote-gauche",39,397],
  droite: ["cote-droit",43,398],
  dessus: ["dessus",196,32],
  dessous: ["dessous",194,31],
} as const;

type Texture = keyof typeof textures;
const faces = Object.keys(textures) as Texture[];
const angleVerticalMax = 8;
const bornerTangage = (angle: number) => Math.max(-angleVerticalMax, Math.min(angleVerticalMax, angle));
const tourProche = (angle: number) => Math.round(angle / 360) * 360;

function ImageSachet({ cote, miniature = false }: { cote: Texture; miniature?: boolean }) {
  const [fichier, largeur, hauteur] = textures[cote];
  return <Image className={styles.image} src={`/boosters/sachet-360/${miniature ? "face" : fichier + "-alpha"}.webp`}
    alt="" width={miniature ? 235 : largeur} height={miniature ? 386 : hauteur} unoptimized draggable={false}
    loading="eager" />;
}

export function MiniSachetBooster() {
  return <div className={styles.mini} aria-hidden="true"><ImageSachet cote="face" miniature /></div>;
}

type Point = [x: number, y: number];
type Coupe = {
  haut: string; bas: string; fil: string; ouverture: string;
  avancee: number; charniere: Point; sens: number;
};
const polygone = (points: Point[]) => `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(",")})`;

function fibrePlastique(points: Point[]): Point[] {
  const ligne: Point[] = [points[0]];
  const dents = [.18, -.28, .05, .26, -.19, .12];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const pas = Math.ceil(Math.abs(x1 - x0) / 1.35);
    for (let j = 1; j < pas; j++) {
      const x = x0 + (x1 - x0) * j / pas;
      const y = y0 + (y1 - y0) * j / pas + dents[Math.floor(x * .8) % dents.length];
      ligne.push([x, Math.max(4, Math.min(12, y))]);
    }
    ligne.push(points[i]);
  }
  return ligne;
}

function suivreDechirure(points: Point[], versDroite: boolean): Coupe {
  const charniere = points[points.length - 1];
  const [x] = charniere;
  const gauche = versDroite ? 0 : x;
  const droite = versDroite ? x : 100;
  const ligne = fibrePlastique(versDroite ? points : [...points].reverse());
  const inverse = [...ligne].reverse();
  const avancee = (droite - gauche) / 100;
  const ouverture = inverse.map(([a, b]): Point => [
    a, b - Math.sin(Math.PI * (a - gauche) / Math.max(1, droite - gauche)) * (1 + avancee * 2.6),
  ]);
  return {
    haut: polygone([[gauche, 0], [droite, 0], ...inverse]),
    bas: polygone([
      ...(!versDroite ? [[0, 0], [x, 0]] as Point[] : []),
      ...ligne,
      ...(versDroite ? [[x, 0], [100, 0]] as Point[] : []),
      [100, 100], [0, 100],
    ]),
    fil: polygone([...ligne, ...inverse.map(([a, b]): Point => [a, b + .75])]),
    ouverture: polygone([...ligne, ...ouverture]),
    avancee, charniere, sens: versDroite ? 1 : -1,
  };
}

export default function SachetBooster({ ouvrir, chargement, sortie, reveler }: {
  ouvrir: () => void;
  chargement: boolean;
  sortie: boolean;
  reveler: () => void;
}) {
  const [deFace, setDeFace] = useState(true);
  const [coupe, setCoupe] = useState<Coupe>();
  const [detache, setDetache] = useState(false);
  const modele = useRef<HTMLDivElement>(null);
  const angles = useRef({ lacet: 0, tangage: 0 });
  const imageEnAttente = useRef<number | null>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const reduire = useReducedMotion();
  const rotation = useRef<{ id: number; x: number; y: number; largeur: number; temps: number; vitesse: number } | null>(null);
  const dechirure = useRef<{ trace: Point[]; versDroite: boolean; cadre: DOMRect } | null>(null);
  const imageDechirure = useRef<number | null>(null);
  const scene = useRef<HTMLDivElement>(null);
  const enCours = useRef(false);

  useEffect(() => () => {
    if (imageEnAttente.current !== null) cancelAnimationFrame(imageEnAttente.current);
    animation.current?.stop();
    if (imageDechirure.current !== null) cancelAnimationFrame(imageDechirure.current);
  }, []);

  const estDeFace = () => {
    const { lacet, tangage } = angles.current;
    return Math.abs(lacet - tourProche(lacet)) < 12 && Math.abs(tangage) < 4;
  };

  function peindreOrientation() {
    if (!modele.current) return;
    const { lacet, tangage } = angles.current;
    modele.current.style.transform =
      "translateZ(calc(var(--epaisseur) * -.5)) rotateY(" + lacet + "deg) rotateX(" + tangage + "deg)";
  }

  function terminerImage() {
    if (imageEnAttente.current !== null) cancelAnimationFrame(imageEnAttente.current);
    imageEnAttente.current = null;
    peindreOrientation();
  }

  function tournerVers(horizontal: number, vertical: number) {
    animation.current?.stop();
    const depart = angles.current;
    const cible = bornerTangage(vertical);
    if (reduire) {
      angles.current = { lacet: horizontal, tangage: cible };
      peindreOrientation();
      setDeFace(estDeFace());
      return;
    }
    animation.current = animate(0, 1, {
      duration: .32,
      ease: "easeOut",
      onUpdate: progression => {
        angles.current = {
          lacet: depart.lacet + (horizontal - depart.lacet) * progression,
          tangage: depart.tangage + (cible - depart.tangage) * progression,
        };
        peindreOrientation();
      },
      onComplete: () => setDeFace(estDeFace()),
    });
  }

  function ouvrirSachet(trace: Point[], versDroite: boolean) {
    if (enCours.current || chargement) return;
    enCours.current = true;
    setDetache(true);
    if (imageDechirure.current !== null) cancelAnimationFrame(imageDechirure.current);
    imageDechirure.current = null;
    setCoupe(suivreDechirure([...trace, [versDroite ? 100 : 0, trace[trace.length - 1][1]]], versDroite));
    ouvrir();
  }

  function position(event: PointerEvent, { left, top, width, height }: DOMRect): Point {
    return [
      Math.max(0, Math.min(100, (event.clientX - left) / width * 100)),
      Math.max(4, Math.min(12, (event.clientY - top) / height * 100)),
    ];
  }

  return <>
    <div className={styles.scene} ref={scene} data-sachet="" data-face={deFace ? "" : undefined} data-sortie={sortie ? "" : undefined}>
      {!coupe ? <div className={styles.camera} aria-hidden="true">
        <div ref={modele} className={styles.modele}>
          {faces.map(cote => <div className={`${styles.face3d} ${styles[cote]}`} key={cote}>
            <ImageSachet cote={cote} />
          </div>)}
        </div>
      </div> : <>
        <motion.div className={styles.corps}
          animate={sortie ? { y: ["0%", "-1.8%", "97%"], rotate: [0, coupe.sens * 2, coupe.sens * -14], opacity: [1, 1, 0] }
            : { y: "0%", rotate: 0, opacity: 1 }}
          transition={{ duration: .47, times: [0, .19, 1], ease: ["easeOut", "easeIn"] }}
          onAnimationComplete={() => { if (sortie) reveler(); }}>
          <div className={styles.ouverture} data-ouverture-sachet="" style={{ clipPath: coupe.ouverture }} />
          <div className={styles.foil} style={{ clipPath: coupe.bas }}>
            <ImageSachet cote="face" />
            <div className={styles.fil} style={{ clipPath: coupe.fil }} />
          </div>
        </motion.div>
        <motion.div className={styles.bande} data-bande-detachee={detache ? "" : undefined}
          style={{ clipPath: coupe.haut, transformOrigin: coupe.charniere[0] + "% " + coupe.charniere[1] + "%" }}
          animate={detache ? {
            y: ["-1%", "-9%", "-19%"], x: ["0%", coupe.sens * 8 + "%", coupe.sens * 31 + "%"],
            rotate: [coupe.sens * coupe.avancee * 8, coupe.sens * 17, coupe.sens * 41],
            rotateX: [-12, -38, -73], opacity: [1, 1, 0],
          } : { y: -coupe.avancee * 2, rotate: coupe.sens * coupe.avancee * 8, rotateX: -coupe.avancee * 18 }}
          transition={detache ? { duration: .46, times: [0, .43, 1], ease: "easeOut" } : { duration: 0 }}>
          <ImageSachet cote="face" />
          <div className={styles.pli} style={{ opacity: Math.min(.7, coupe.avancee) }} />
        </motion.div>
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
          const { lacet, tangage } = angles.current;
          if (pas) tournerVers(lacet + pas[0], tangage + pas[1]);
          else tournerVers(tourProche(lacet), 0);
        }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          animation.current?.stop();
          rotation.current = {
            id: event.pointerId, x: event.clientX, y: event.clientY,
            largeur: event.currentTarget.offsetWidth, temps: event.timeStamp, vitesse: 0,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const geste = rotation.current;
          if (!geste || geste.id !== event.pointerId) return;
          const dx = (event.clientX - geste.x) * 240 / geste.largeur;
          const dy = (event.clientY - geste.y) * .18;
          const duree = Math.max(1, event.timeStamp - geste.temps);
          geste.x = event.clientX;
          geste.y = event.clientY;
          geste.temps = event.timeStamp;
          geste.vitesse = duree > 90 ? 0 : geste.vitesse * .35 + (dx / duree) * .65;
          angles.current.lacet += dx;
          angles.current.tangage = bornerTangage(angles.current.tangage - dy);
          if (imageEnAttente.current === null) imageEnAttente.current = requestAnimationFrame(() => {
            imageEnAttente.current = null;
            peindreOrientation();
          });
        }}
        onPointerUp={event => {
          const geste = rotation.current;
          if (!geste || geste.id !== event.pointerId) return;
          rotation.current = null;
          terminerImage();
          const { lacet, tangage } = angles.current;
          const inertie = !reduire && event.timeStamp - geste.temps < 80
            ? Math.max(-65, Math.min(65, geste.vitesse * 72)) : 0;
          const cible = lacet + inertie;
          const face = tourProche(cible);
          setDeFace(estDeFace());
          if (Math.abs(cible - face) < 12 && Math.abs(tangage) < 4) tournerVers(face, 0);
          else if (inertie) tournerVers(cible, tangage);
        }}
        onLostPointerCapture={event => {
          if (rotation.current?.id !== event.pointerId) return;
          rotation.current = null;
          terminerImage();
          setDeFace(estDeFace());
        }}
        onClick={event => {
          if (event.detail === 0) tournerVers(angles.current.lacet + 36, angles.current.tangage);
        }}
      />
      {deFace && <button type="button" className={styles.soudure} aria-label="Ouvrir le booster par la soudure"
        disabled={chargement}
        onClick={event => { if (event.detail === 0) ouvrirSachet([[0, 8], [28, 8.9], [53, 7.7], [76, 8.5]], true); }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || enCours.current || !estDeFace()) return;
          animation.current?.stop();
          angles.current = { lacet: tourProche(angles.current.lacet), tangage: 0 };
          terminerImage();
          const cadre = scene.current!.getBoundingClientRect();
          const [x, y] = position(event, cadre);
          const versDroite = x <= 50;
          dechirure.current = { trace: [[versDroite ? 0 : 100, y]], versDroite, cadre };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const geste = dechirure.current;
          if (!geste || enCours.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const [x, y] = position(event, geste.cadre);
          const precedent = geste.trace[geste.trace.length - 1][0];
          if ((geste.versDroite ? x - precedent : precedent - x) < .7) return;
          geste.trace.push([x, y]);
          if (geste.versDroite ? x >= 94 : x <= 6) {
            ouvrirSachet(geste.trace, geste.versDroite);
          } else if (imageDechirure.current === null) {
            imageDechirure.current = requestAnimationFrame(() => {
              imageDechirure.current = null;
              setCoupe(suivreDechirure(geste.trace, geste.versDroite));
            });
          }
        }}
        onLostPointerCapture={() => {
          dechirure.current = null;
          if (imageDechirure.current !== null) cancelAnimationFrame(imageDechirure.current);
          imageDechirure.current = null;
          if (!enCours.current) setCoupe(undefined);
        }} />}
    </div>
    {!chargement && !deFace && <button type="button" className={styles.revenir}
      onClick={() => tournerVers(tourProche(angles.current.lacet), 0)}>Revenir de face</button>}
    <p>{chargement ? "Ouverture…" : deFace ? "Glisse pour tourner à 360°. Déchire le haut pour ouvrir." : "Reviens de face pour déchirer le haut."}</p>
  </>;
}
