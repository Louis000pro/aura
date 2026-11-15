"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import type { GuideId } from "@/lib/guides";
import styles from "./SachetBooster.module.css";

const dossier = "/boosters/sachet-360/";
const fichierCoach: Record<GuideId, string> = { nora: "nora", sasha: "sacha" };
const textures = {
  dos: ["dos-720", 720, 1235],
  gauche: ["cote-gauche-alpha", 39, 397],
  droite: ["cote-droit-alpha", 43, 398],
  dessus: ["dessus-alpha", 196, 32],
  dessous: ["dessous-alpha", 194, 31],
} as const;

const autresFaces = Object.entries(textures) as [keyof typeof textures, typeof textures[keyof typeof textures]][];

export function MiniSachetBooster({ guide }: { guide: GuideId | null }) {
  const miniature = dossier + "mini-" + (guide ? fichierCoach[guide] : "neutre") + ".webp";
  const pleineTaille = dossier + (guide ? "face-" + fichierCoach[guide] : "dos-720") + ".webp";
  const [miniatureIndisponible, setMiniatureIndisponible] = useState<string | null>(null);
  const [photoIndisponible, setPhotoIndisponible] = useState<string | null>(null);
  const source = miniatureIndisponible === miniature ? pleineTaille : miniature;

  return <div className={styles.mini} aria-hidden="true">
    {photoIndisponible !== source && <Image key={source} className={styles.image} src={source}
      width={186} height={306} alt="" unoptimized draggable={false} loading="eager"
      onError={() => {
        if (source === miniature) setMiniatureIndisponible(miniature);
        else setPhotoIndisponible(source);
      }} />}
  </div>;
}

type Point = [x: number, y: number];
type Orientation = { lacet: number; tangage: number };
type SuiteRotation = { animation: Animation; depart: Orientation; cible: Orientation };
type GesteRotation = { id: number; largeur: number; x: number; y: number; mesures: { x: number; temps: number }[] };
type Dechirure = { trace: Point[]; sens: 1 | -1; cadre: DOMRect; id: number };
const neutre: Orientation = { lacet: 0, tangage: 0 };
const raccourcis: Record<string, Point> = {
  ArrowLeft: [-36, 0], ArrowRight: [36, 0], ArrowUp: [0, -4], ArrowDown: [0, 4],
};

const borner = (valeur: number, min: number, max: number) => Math.max(min, Math.min(max, valeur));
const tourProche = (angle: number) => Math.round(angle / 360) * 360;
const estDeFace = ({ lacet, tangage }: Orientation) => Math.abs(lacet - tourProche(lacet)) < 12 && Math.abs(tangage) < 4;
const transformation = ({ lacet, tangage }: Orientation) =>
  "translateZ(calc(var(--epaisseur) * -.5)) rotateY(" + lacet + "deg) rotateX(" + tangage + "deg)";

function memoriserGeste(geste: GesteRotation, event: Pick<PointerEvent, "clientX" | "timeStamp">) {
  const debut = event.timeStamp - 85;
  geste.mesures = geste.mesures.filter(mesure => mesure.temps >= debut);
  const derniere = geste.mesures.at(-1);
  if (!derniere || derniere.x !== event.clientX || event.timeStamp - derniere.temps >= 24) {
    geste.mesures.push({ x: event.clientX, temps: event.timeStamp });
  }
}

function vitesseRelachement(geste: GesteRotation, temps: number) {
  const derniere = geste.mesures.at(-1);
  if (!derniere || temps - derniere.temps >= 65) return 0;
  const premiere = geste.mesures.find(mesure => derniere.temps - mesure.temps >= 12);
  if (!premiere) return 0;
  const maintien = borner((65 - (temps - derniere.temps)) / 49, 0, 1);
  return borner((derniere.x - premiere.x) * 240 / geste.largeur / (derniere.temps - premiere.temps), -1.4, 1.4) * maintien;
}

const pointsSvg = (points: Point[]) => points.map(([x, y]) => x.toFixed(2) + "," + y.toFixed(2)).join(" ");

function bordDechire(trace: Point[]) {
  const dents = [.17, -.28, .04, .25, -.16];
  const ligne: Point[] = [trace[0]];
  for (let i = 1; i < trace.length; i++) {
    const [x0, y0] = trace[i - 1];
    const [x1, y1] = trace[i];
    const pas = Math.ceil((x1 - x0) / 2.1);
    for (let j = 1; j < pas; j++) {
      const t = j / pas;
      ligne.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + dents[ligne.length % dents.length]]);
    }
    ligne.push(trace[i]);
  }
  return ligne;
}

function position({ clientX, clientY }: PointerEvent, { left, top, width, height }: DOMRect): Point {
  return [
    borner((clientX - left) / width * 100, 0, 100),
    borner((clientY - top) / height * 100, 4, 12),
  ];
}

export default function SachetBooster({ guide, ouvrir, chargement, sortie, reveler }: {
  guide: GuideId;
  ouvrir: () => void;
  chargement: boolean;
  sortie: boolean;
  reveler: () => void;
}) {
  const idSvg = useId();
  const portrait = dossier + "face-" + fichierCoach[guide] + ".webp";
  const [deFace, setDeFace] = useState(true);
  const scene = useRef<HTMLDivElement>(null);
  const modele = useRef<HTMLDivElement>(null);
  const bande = useRef<SVGGElement>(null);
  const contourBas = useRef<SVGPolygonElement>(null);
  const contourHaut = useRef<SVGPolygonElement>(null);
  const ouverture = useRef<SVGPolygonElement>(null);
  const bord = useRef<SVGPolylineElement>(null);
  const angles = useRef<Orientation>(neutre);
  const orientationAffichee = useRef<Orientation>(neutre);
  const suite = useRef<SuiteRotation | null>(null);
  const imageRotation = useRef<number | null>(null);
  const imageDechirure = useRef<number | null>(null);
  const rotation = useRef<GesteRotation | null>(null);
  const dechirure = useRef<Dechirure | null>(null);
  const enCours = useRef(false);
  const [detache, setDetache] = useState(false);

  useEffect(() => () => {
    if (imageRotation.current !== null) cancelAnimationFrame(imageRotation.current);
    if (imageDechirure.current !== null) cancelAnimationFrame(imageDechirure.current);
    suite.current?.animation.cancel();
  }, []);

  function peindreOrientation(orientation = angles.current) {
    if (!modele.current) return;
    orientationAffichee.current = orientation;
    modele.current.style.transform = transformation(orientation);
  }

  function arreterRotation() {
    if (imageRotation.current !== null) cancelAnimationFrame(imageRotation.current);
    imageRotation.current = null;
    const mouvement = suite.current;
    if (!mouvement) return;
    const { animation, depart, cible } = mouvement;
    const progression = animation.effect?.getComputedTiming().progress ?? 0;
    angles.current = {
      lacet: depart.lacet + (cible.lacet - depart.lacet) * progression,
      tangage: depart.tangage + (cible.tangage - depart.tangage) * progression,
    };
    peindreOrientation();
    suite.current = null;
    animation.cancel();
  }

  function tournerVers(lacet: number, tangage: number, duree = 260, easing = "cubic-bezier(.2,.6,.44,1)") {
    arreterRotation();
    const cible = { lacet, tangage: borner(tangage, -8, 8) };
    const depart = orientationAffichee.current;
    const element = modele.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || (Math.abs(cible.lacet - depart.lacet) < .1 && Math.abs(cible.tangage - depart.tangage) < .1)) {
      angles.current = cible;
      peindreOrientation();
      setDeFace(estDeFace(cible));
      return;
    }

    const animation = element.animate(
      [{ transform: transformation(depart) }, { transform: transformation(cible) }],
      { duration: duree, easing, fill: "forwards" },
    );
    suite.current = { animation, depart, cible };
    angles.current = cible;
    animation.onfinish = () => {
      if (suite.current?.animation !== animation) return;
      suite.current = null;
      angles.current = { lacet: cible.lacet % 360, tangage: cible.tangage };
      peindreOrientation();
      animation.cancel();
      setDeFace(estDeFace(angles.current));
    };
  }

  function deplacerRotation(geste: GesteRotation, event: PointerEvent<HTMLButtonElement>) {
    const { clientX, clientY } = event;
    if (clientX === geste.x && clientY === geste.y) return;
    const dx = (clientX - geste.x) * 240 / geste.largeur;
    const dy = (clientY - geste.y) * .18;
    geste.x = clientX;
    geste.y = clientY;
    angles.current = {
      lacet: angles.current.lacet + dx,
      tangage: borner(angles.current.tangage - dy, -8, 8),
    };
  }

  function peindreDechirure(trace: Point[], sens: 1 | -1, terminee: boolean) {
    const ligne = bordDechire(sens === 1 ? trace : [...trace].reverse());
    const [gauche] = ligne[0];
    const [droite] = ligne[ligne.length - 1];
    const taille = droite - gauche;
    const charniere = trace[trace.length - 1];
    const inverse = [...ligne].reverse();
    const interieur = inverse.map(([x, y]): Point => [
      x, y - Math.sin(Math.PI * (x - gauche) / Math.max(taille, 1)) * (1 + taille * .021),
    ]);

    contourHaut.current?.setAttribute("points", pointsSvg([[gauche, 0], [droite, 0], ...inverse]));
    contourBas.current?.setAttribute("points", pointsSvg([
      ...(sens === -1 ? [[0, 0], [gauche, 0]] as Point[] : []),
      ...ligne,
      ...(sens === 1 ? [[droite, 0], [100, 0]] as Point[] : []),
      [100, 100], [0, 100],
    ]));
    ouverture.current?.setAttribute("points", pointsSvg([...ligne, ...interieur]));
    bord.current?.setAttribute("points", pointsSvg(ligne));
    if (bande.current) {
      bande.current.style.transformOrigin = charniere[0] + "% " + charniere[1] + "%";
      bande.current.style.setProperty("--sens", String(sens));
      bande.current.style.setProperty("--pli", (sens * taille * .072) + "deg");
      bande.current.style.setProperty("--levee", (-taille * .018) + "%");
    }
    if (scene.current) scene.current.dataset.trace = terminee ? "terminee" : "en-cours";
  }

  function ouvrirSachet(trace: Point[], sens: 1 | -1) {
    if (enCours.current || chargement) return;
    enCours.current = true;
    if (imageDechirure.current !== null) cancelAnimationFrame(imageDechirure.current);
    imageDechirure.current = null;
    peindreDechirure([...trace, [sens === 1 ? 100 : 0, trace[trace.length - 1][1]]], sens, true);
    setDetache(true);
    ouvrir();
  }

  function avancerDechirure(event: PointerEvent<HTMLButtonElement>) {
    const geste = dechirure.current;
    if (!geste || geste.id !== event.pointerId || enCours.current) return;
    const [x, y] = position(event, geste.cadre);
    const precedent = geste.trace[geste.trace.length - 1][0];
    if ((x - precedent) * geste.sens < 1.8) return;
    geste.trace.push([x, y]);
    if (geste.sens === 1 ? x >= 94 : x <= 6) {
      ouvrirSachet(geste.trace, geste.sens);
    } else if (imageDechirure.current === null) {
      imageDechirure.current = requestAnimationFrame(() => {
        imageDechirure.current = null;
        peindreDechirure(geste.trace, geste.sens, false);
      });
    }
  }

  return <>
    <div className={styles.scene} ref={scene} data-sachet="" data-coach={guide}
      data-face={deFace ? "" : undefined} data-sortie={sortie ? "" : undefined}>
      <div className={styles.camera} aria-hidden="true">
        <div ref={modele} className={styles.modele}>
            <div className={styles.face3d + " " + styles.face}>
              <Image className={styles.image} src={portrait} width={720} height={1183} alt="" loading="eager" unoptimized draggable={false} />
            </div>
            {autresFaces.map(([cote, [fichier, largeur, hauteur]]) => (
              <div className={styles.face3d + " " + styles[cote]} key={cote}>
                <Image className={styles.image} src={dossier + fichier + ".webp"} width={largeur} height={hauteur} alt=""
                  loading="eager" unoptimized draggable={false} />
              </div>
            ))}
        </div>
      </div>
      <svg className={styles.dechirure} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <image id={idSvg + "-portrait"} href={portrait} width="100" height="100" preserveAspectRatio="none" />
          <clipPath id={idSvg + "-bas"}><polygon ref={contourBas} /></clipPath>
          <clipPath id={idSvg + "-haut"}><polygon ref={contourHaut} /></clipPath>
          <linearGradient id={idSvg + "-cavite"} x2="0%" y2="100%">
            <stop stopColor="#8e7599" /><stop offset=".58" stopColor="#3d2b54" /><stop offset="1" stopColor="#110d25" />
          </linearGradient>
          <linearGradient id={idSvg + "-bord"}>
            <stop stopColor="#dcecff" /><stop offset=".6" stopColor="#fff" /><stop offset="1" stopColor="#ffc8ed" />
          </linearGradient>
        </defs>
        <g className={styles.corps} onAnimationEnd={() => { if (sortie) reveler(); }}>
          <polygon ref={ouverture} data-ouverture-sachet="" fill={"url(#" + idSvg + "-cavite)"} />
          <use href={"#" + idSvg + "-portrait"} clipPath={"url(#" + idSvg + "-bas)"} />
          <polyline ref={bord} fill="none" stroke={"url(#" + idSvg + "-bord)"} strokeWidth=".52" strokeLinejoin="round" />
        </g>
        <g ref={bande} className={styles.bande} data-bande-detachee={detache ? "" : undefined}>
          <use href={"#" + idSvg + "-portrait"} clipPath={"url(#" + idSvg + "-haut)"} />
        </g>
      </svg>
      <button type="button" className={styles.rotation} disabled={chargement || detache}
        aria-label="Tourner le booster"
        onKeyDown={event => {
          const pas = raccourcis[event.key];
          if (!pas && event.key !== "Home") return;
          event.preventDefault();
          const { lacet, tangage } = angles.current;
          if (pas) tournerVers(lacet + pas[0], tangage + pas[1]);
          else tournerVers(tourProche(lacet), 0);
        }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          arreterRotation();
          angles.current = orientationAffichee.current;
          rotation.current = {
            id: event.pointerId, x: event.clientX, y: event.clientY,
            largeur: event.currentTarget.offsetWidth, mesures: [{ x: event.clientX, temps: event.timeStamp }],
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const geste = rotation.current;
          if (!geste || geste.id !== event.pointerId) return;
          const mesures = event.nativeEvent.getCoalescedEvents?.() ?? [];
          for (const mesure of mesures) memoriserGeste(geste, mesure);
          memoriserGeste(geste, event);
          deplacerRotation(geste, event);
          if (imageRotation.current === null) imageRotation.current = requestAnimationFrame(() => {
            imageRotation.current = null;
            peindreOrientation();
          });
        }}
        onPointerUp={event => {
          const geste = rotation.current;
          if (!geste || geste.id !== event.pointerId) return;
          rotation.current = null;
          deplacerRotation(geste, event);
          const { lacet, tangage } = angles.current;
          const vitesse = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : vitesseRelachement(geste, event.timeStamp);
          // La pente initiale de cubic-bezier(.2,.6,.44,1) est 3 : le
          // déplacement conserve la vitesse du doigt au départ de l'inertie.
          const duree = 145 + Math.abs(vitesse) * 55;
          const inertie = Math.abs(vitesse) < .075 ? 0 : vitesse * duree / 3;
          const cible = lacet + inertie;
          const face = tourProche(cible);
          if (Math.abs(cible - face) < 9 && Math.abs(tangage) < 4 && inertie * (face - lacet) >= 0) tournerVers(face, 0, inertie ? duree : 140);
          else if (inertie) tournerVers(cible, tangage, duree);
          else tournerVers(lacet, tangage, 70);
        }}
        onLostPointerCapture={event => {
          if (rotation.current?.id !== event.pointerId) return;
          rotation.current = null;
          tournerVers(angles.current.lacet, angles.current.tangage, 70);
        }}
        onClick={event => {
          if (event.detail === 0) tournerVers(angles.current.lacet + 36, angles.current.tangage);
        }}
      />
      {deFace && <button type="button" className={styles.soudure} aria-label="Ouvrir le booster par la soudure"
        disabled={chargement || detache}
        onClick={event => {
          if (event.detail !== 0 || suite.current || !estDeFace(angles.current)) return;
          arreterRotation();
          ouvrirSachet([[0, 8], [28, 8.9], [53, 7.7], [76, 8.5]], 1);
        }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || enCours.current || suite.current || !estDeFace(angles.current)) return;
          arreterRotation();
          angles.current = neutre;
          peindreOrientation();
          const cadre = scene.current!.getBoundingClientRect();
          const [x, y] = position(event, cadre);
          const sens = x <= 50 ? 1 : -1;
          dechirure.current = { trace: [[sens === 1 ? 0 : 100, y]], sens, cadre, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={avancerDechirure}
        onPointerUp={avancerDechirure}
        onLostPointerCapture={() => {
          dechirure.current = null;
          if (imageDechirure.current !== null) cancelAnimationFrame(imageDechirure.current);
          imageDechirure.current = null;
          if (!enCours.current && scene.current) delete scene.current.dataset.trace;
        }} />}
    </div>
    <div className={styles.aide}>
      {!chargement && !deFace && <button type="button" className={styles.revenir}
        onClick={() => tournerVers(tourProche(angles.current.lacet), 0)}>Revenir de face</button>}
      <p>{chargement ? "Ouverture…" : deFace ? "Glisse pour tourner à 360°. Déchire le haut pour ouvrir." : "Reviens de face pour déchirer le haut."}</p>
    </div>
  </>;
}
