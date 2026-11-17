"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import type { GuideId } from "@/lib/guides";
import styles from "./SachetBooster.module.css";

const dossier = "/boosters/sachet-360/";
// Un sachet par Guide : Nora tend une carte sur le sien, Sasha sur le sien (planche du 2026-11-17,
// agrandie par quatre avec Real-ESRGAN). Le reflet holographique est cuit dans 5 images par face,
// une par inclinaison (de -1 à 1) : en mouvement, le téléphone ne fait que les fondre l'une dans
// l'autre. Des couches CSS masquées et fusionnées, recalculées à chaque image dans un objet 3D,
// saccadaient sur iPhone et faisaient recharger la page (2026-11-17).
const faces: Record<GuideId, [fichier: string, largeur: number, hauteur: number]> = {
  nora: ["face-nora-v4", 831, 1369],
  sasha: ["face-sasha-v4", 817, 1321],
};
const dos = ["dos-v4", 683, 1233] as const;
const textures = {
  gauche: ["cote-gauche-v3", 110, 1000],
  droite: ["cote-droit-v3", 92, 1000],
  dessus: ["dessus-v3", 540, 85],
  dessous: ["dessous-v3", 540, 82],
} as const;
const ANGLES = [0, 1, 2, 3, 4];
const DE_FACE = 2;
const angle = (fichier: string, k: number) => dossier + fichier + "-" + k + ".webp";

function Angles({ fichier, largeur, hauteur }: { fichier: string; largeur: number; hauteur: number }) {
  return <>{ANGLES.map(k => <Image key={k} className={styles.angle} data-angle={k} src={angle(fichier, k)}
    width={largeur} height={hauteur} alt="" loading="eager" unoptimized draggable={false} />)}</>;
}

// Sur iPhone, l'inclinaison du téléphone ne se lit qu'après un accord, demandé pendant un geste.
let mouvementDemande = false;
export function demanderMouvementAppareil() {
  if (mouvementDemande || typeof window === "undefined") return;
  mouvementDemande = true;
  const orientation = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
  if (typeof orientation?.requestPermission === "function") orientation.requestPermission().catch(() => {});
}

const autresFaces = Object.entries(textures) as [keyof typeof textures, typeof textures[keyof typeof textures]][];

export function MiniSachetBooster({ guide }: { guide: GuideId | null }) {
  const miniature = dossier + "mini-" + (guide ?? "neutre") + "-v3.webp";
  const pleineTaille = angle(guide ? faces[guide][0] : dos[0], DE_FACE);
  const [miniatureIndisponible, setMiniatureIndisponible] = useState<string | null>(null);
  const [photoIndisponible, setPhotoIndisponible] = useState<string | null>(null);
  const source = miniatureIndisponible === miniature ? pleineTaille : miniature;

  return <div className={styles.mini} aria-hidden="true">
    {photoIndisponible !== source && <Image key={source} className={styles.image} src={source}
      width={186} height={300} alt="" unoptimized draggable={false} loading="eager"
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
    // Sous la soudure (4 %), au-dessus du logo « Vaiiya » (10 %).
    borner((clientY - top) / height * 100, 4, 9),
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
  const [fichierFace, largeurFace, hauteurFace] = faces[guide];
  const portrait = angle(fichierFace, DE_FACE);
  const [deFace, setDeFace] = useState(true);
  const scene = useRef<HTMLDivElement>(null);
  const modele = useRef<HTMLDivElement>(null);
  const bande = useRef<SVGGElement>(null);
  const contourBas = useRef<SVGPolygonElement>(null);
  const contourHaut = useRef<SVGPolygonElement>(null);
  const ouverture = useRef<SVGPolygonElement>(null);
  const bord = useRef<SVGPolylineElement>(null);
  const lumiere = useRef<HTMLDivElement>(null);
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

  // Le reflet suit trois choses : la rotation du sachet (doigt, élan, retour de face), l'inclinaison
  // du téléphone, et la souris sur ordinateur. Une seule boucle, qui n'écrit que ce qui a changé.
  const survol = useRef({ x: 0, y: 0 });
  useEffect(() => {
    let image = 0;
    let precedent = -1;
    let calques: HTMLElement[][] = [];
    const cible = { x: 0, y: 0 };
    const incline = { x: 0, y: 0 };
    const doux = { x: 0, y: 0 };
    const surOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null) return;
      // Tenu devant soi : beta autour de 45°, gamma autour de 0.
      cible.x = borner(event.gamma / 22, -1, 1);
      cible.y = borner((event.beta - 45) / 30, -1, 1);
    };
    window.addEventListener("deviceorientation", surOrientation);
    // Les angles sont décodés d'avance : sinon le premier fondu vers une image attendrait son décodage.
    scene.current?.querySelectorAll("img").forEach(img => { img.decode?.().catch(() => {}); });
    const boucle = () => {
      image = requestAnimationFrame(boucle);
      const element = scene.current;
      if (!element) return;
      incline.x += (cible.x - incline.x) * .14;
      incline.y += (cible.y - incline.y) * .14;
      doux.x += (survol.current.x - doux.x) * .18;
      doux.y += (survol.current.y - doux.y) * .18;
      let orientation = orientationAffichee.current;
      const mouvement = suite.current;
      if (mouvement) {
        const progression = mouvement.animation.effect?.getComputedTiming().progress ?? 0;
        orientation = {
          lacet: mouvement.depart.lacet + (mouvement.cible.lacet - mouvement.depart.lacet) * progression,
          tangage: mouvement.depart.tangage + (mouvement.cible.tangage - mouvement.depart.tangage) * progression,
        };
      }
      const lacet = orientation.lacet * Math.PI / 180;
      const hx = borner(Math.sin(lacet) * 1.15 + incline.x * .8 + doux.x * .6, -1.15, 1.15);
      const hy = borner(orientation.tangage / 8 * .7 + incline.y * .7 + doux.y * .45, -1.15, 1.15);
      // Une seule valeur de 0 à 4 : l'image du dessous à pleine opacité, la suivante par-dessus en fondu.
      const position = Math.round((borner(hx * .85 + hy * .35, -1, 1) + 1) * 2 * 200) / 200;
      if (position === precedent) return;
      precedent = position;
      if (!calques.length) {
        calques = [...element.querySelectorAll<HTMLElement>("[data-calques]")].map(groupe =>
          [...groupe.querySelectorAll<HTMLElement>("[data-angle]")]);
      }
      const bas = Math.min(3, Math.floor(position));
      const fondu = position - bas;
      for (const groupe of calques) {
        groupe.forEach((img, k) => {
          img.style.opacity = k === bas ? "1" : k === bas + 1 ? fondu.toFixed(3) : "0";
        });
      }
    };
    image = requestAnimationFrame(boucle);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("deviceorientation", surOrientation);
    };
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
    // De la lumière sort de l'ouverture, d'autant plus que la déchirure avance.
    if (lumiere.current && !terminee) {
      const part = taille / 100;
      lumiere.current.style.transformOrigin = (sens === 1 ? "12%" : "88%") + " 50%";
      lumiere.current.style.transform = "scale(" + (.1 + part * .9).toFixed(3) + "," + (.6 + part * .5).toFixed(3) + ")";
      lumiere.current.style.opacity = Math.min(1, part * 1.7).toFixed(3);
    }
    if (scene.current) scene.current.dataset.trace = terminee ? "terminee" : "en-cours";
  }

  // Lâchée après la moitié, la déchirure se termine toute seule ; avant, le film se referme.
  function finirDechirure(geste: Dechirure) {
    const [x0, y] = geste.trace[geste.trace.length - 1];
    const x1 = geste.sens === 1 ? 95 : 5;
    const debut = performance.now();
    const pas = (temps: number) => {
      if (enCours.current) return;
      const k = Math.min(1, (temps - debut) / 200);
      const x = x0 + (x1 - x0) * k;
      if ((x - geste.trace[geste.trace.length - 1][0]) * geste.sens >= 1.8) geste.trace.push([x, y]);
      if (k >= 1) { ouvrirSachet(geste.trace, geste.sens); return; }
      peindreDechirure(geste.trace, geste.sens, false);
      requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
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
      data-face={deFace ? "" : undefined} data-sortie={sortie ? "" : undefined}
      onPointerMove={event => {
        if (event.pointerType !== "mouse") return;
        const cadre = event.currentTarget.getBoundingClientRect();
        survol.current = {
          x: borner((event.clientX - cadre.left) / cadre.width * 2 - 1, -1, 1),
          y: borner((event.clientY - cadre.top) / cadre.height * 2 - 1, -1, 1),
        };
      }}
      onPointerLeave={() => { survol.current = { x: 0, y: 0 }; }}>
      <div className={styles.camera} aria-hidden="true">
        <div ref={modele} className={styles.modele}>
            <div className={styles.face3d + " " + styles.face}>
              <span data-calques=""><Angles fichier={fichierFace} largeur={largeurFace} hauteur={hauteurFace} /></span>
            </div>
            <div className={styles.face3d + " " + styles.dos}>
              <span data-calques=""><Angles fichier={dos[0]} largeur={dos[1]} hauteur={dos[2]} /></span>
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
      <div ref={lumiere} className={styles.lumiere} aria-hidden="true" />
      {deFace && !chargement && !detache && <div className={styles.repere} aria-hidden="true"><i /></div>}
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
        onPointerUp={event => {
          avancerDechirure(event);
          const geste = dechirure.current;
          if (!geste || geste.id !== event.pointerId || enCours.current) return;
          const fait = geste.sens === 1 ? geste.trace[geste.trace.length - 1][0] : 100 - geste.trace[geste.trace.length - 1][0];
          if (fait > 55) { dechirure.current = null; finirDechirure(geste); }
        }}
        onLostPointerCapture={() => {
          if (!dechirure.current) return;
          dechirure.current = null;
          if (imageDechirure.current !== null) cancelAnimationFrame(imageDechirure.current);
          imageDechirure.current = null;
          if (lumiere.current) lumiere.current.style.opacity = "0";
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
