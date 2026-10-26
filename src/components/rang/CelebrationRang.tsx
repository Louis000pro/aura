"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import { createClient } from "@/lib/supabase";
import { cartesDuCompte } from "@/lib/cartesRang";
import { cleMontee, contexteMontee } from "@/lib/motRang";
import VisuelCadeau from "@/components/rang/VisuelCadeau";
import FeuilleCarte from "@/components/rang/FeuilleCarte";
import { moteurParticules, type MoteurParticules } from "@/components/rang/particulesRang";
import { EVENEMENT_RANG_MONTE, type DetailRangMonte } from "@/lib/celebrationRang";
import { proposerAvis } from "@/lib/invitationAvis";
import { RANGS, RECOMPENSES_RANG, indexRang, rangPrecedent, type Rang } from "@/lib/aura";
import { jokersActifs } from "@/lib/jokers";
import { jouerPassage } from "@/lib/musiqueRang";
import { lockBodyModal } from "@/lib/bodyModal";
import { milliers } from "@/lib/repas";
import styles from "./CelebrationRang.module.css";

/**
 * LE PASSAGE DE RANG, EN PLEIN ÉCRAN, DANS LA NUIT (Louis, 2026-10-24 :
 * « GO, code la refonte du passage de rang comme sur la maquette version 2,
 * avec la scène dans la nuit »).
 *
 * Monté une fois dans le layout : le rang peut monter n'importe où (fin de
 * séance, repas noté, simple présence). `noterRang` (lib/celebrationRang.ts)
 * a déjà tout tranché avant d'émettre l'évènement : aucun réseau ici, sauf
 * la carte, qui se lit quand on l'ouvre.
 *
 * Cinq temps : le noir, la charge, l'éveil, l'éclat, puis le nom, le Guide
 * et les cadeaux (la carte, le cadre, les jokers ou le titre). La musique du
 * rang part à l'éclat, le téléphone vibre sur Android.
 *
 * ⚠️ LA SCÈNE NE SE PASSE PAS (Louis, 2026-10-24 : « tout le monde doit
 * l'avoir et la voir, et franchement c'est pas une cinématique ») : aucun
 * toucher, aucune touche ne la coupe. Les deux boutons n'existent qu'à la
 * fin, et Échap ne ferme qu'à ce moment-là.
 * ⚠️ PAS DE VAIIYA+ OFFERT au passage (Louis, même jour).
 * ⚠️ MOUVEMENT RÉDUIT : la gemme change en fondu, sans flash, sans secousse
 * ni clignotement, et sans particules.
 */
export default function CelebrationRang() {
  const { user } = useAuth();
  const [scene, setScene] = useState<{ rang: Rang; cle: number } | null>(null);
  const [monte, setMonte] = useState(false);

  useEffect(() => setMonte(true), []);

  useEffect(() => {
    const onMonte = (e: Event) => {
      const id = (e as CustomEvent<DetailRangMonte>).detail?.rangId;
      const rang = RANGS.find((r) => r.id === id);
      // Le Bronze ne se gagne jamais (on l'a dès l'inscription) : pas de scène.
      if (rang && cleMontee(rang.id)) setScene({ rang, cle: Date.now() });
    };
    window.addEventListener(EVENEMENT_RANG_MONTE, onMonte);
    return () => window.removeEventListener(EVENEMENT_RANG_MONTE, onMonte);
  }, []);

  // En refermant la scène, la personne vient de vivre sa montée de rang :
  // c'est le pic où l'on peut proposer un avis (une seule fois par personne).
  const rang = scene?.rang ?? null;
  const fermer = useCallback(() => {
    setScene(null);
    if (user?.id && rang) proposerAvis(user.id, { pourquoi: "rang", surtitre: "Nouveau rang", mot: rang.nom });
  }, [user?.id, rang]);

  if (!monte || !scene) return null;
  return createPortal(<Scene key={scene.cle} rang={scene.rang} onFermer={fermer} />, document.body);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * La lumière de chaque rang sur la nuit : la lueur, les rayons, le métal du
 * nom, les éclats de la gemme qui se brise et les étincelles du nouveau rang.
 * ────────────────────────────────────────────────────────────────────────── */

const LUMIERE: Record<string, { glow: string; ray: string; nom: string; eclats: string[]; part: string[] }> = {
  bronze: { glow: "232 160 90", ray: "245 200 138", nom: "linear-gradient(180deg,#FFE3C2 0%,#F0B47A 46%,#A6602A 54%,#F5CB98 100%)", eclats: ["#F5C88A", "#C98549", "#8E4F22", "#6B3A15"], part: ["#FFFFFF", "#FFE3C2", "#F0B47A"] },
  argent: { glow: "215 225 238", ray: "235 242 250", nom: "linear-gradient(180deg,#FFFFFF 0%,#E3EAF3 46%,#98A4B6 54%,#F4F7FB 100%)", eclats: ["#FFFFFF", "#C9D2DE", "#9AA6B8", "#6A7280"], part: ["#FFFFFF", "#E8EEF6", "#C9D2DE"] },
  or: { glow: "255 196 60", ray: "255 214 110", nom: "linear-gradient(180deg,#FFF6CF 0%,#FFD34E 46%,#D98A0B 54%,#FFE7A0 100%)", eclats: ["#FFF0B8", "#F5B820", "#C98208", "#8A5A06"], part: ["#FFFFFF", "#FFF0B8", "#FFD34E"] },
  platine: { glow: "214 204 255", ray: "232 226 255", nom: "linear-gradient(180deg,#FFFFFF 0%,#ECE7FF 46%,#A79FD6 54%,#F7F4FF 100%)", eclats: ["#FFFFFF", "#E4DEFA", "#B3A9E6", "#8E86C2"], part: ["#FFFFFF", "#ECE7FF", "#D6CCFF"] },
  diamant: { glow: "150 205 255", ray: "190 225 255", nom: "linear-gradient(180deg,#FFFFFF 0%,#D6EEFF 44%,#7FB6F0 54%,#EAF6FF 100%)", eclats: ["#FFFFFF", "#D6EEFF", "#A8D8FF", "#5A8FD0"], part: ["#FFFFFF", "#D6EEFF", "#9FD3FF", "#FFB3E6", "#FFE9A3", "#A3FFE0"] },
  eternel: { glow: "176 128 255", ray: "255 220 140", nom: "linear-gradient(180deg,#FFF3C6 0%,#FFD36B 40%,#C9A8FF 60%,#FFF0D2 100%)", eclats: ["#FFE9A8", "#C9A8FF", "#A97CFF", "#E8A015"], part: ["#FFFFFF", "#FFE9A8", "#FFD36B", "#C9A8FF", "#A97CFF"] },
};

/** Plus le rang est haut, plus la scène est riche. */
const INTENSITE: Record<string, { conv: number; eclats: number; etinc: number; rayA: number; ondes: number }> = {
  argent: { conv: 1, eclats: 42, etinc: 3, rayA: 0.15, ondes: 1 },
  or: { conv: 1.15, eclats: 56, etinc: 5, rayA: 0.2, ondes: 2 },
  platine: { conv: 1.3, eclats: 64, etinc: 6, rayA: 0.22, ondes: 2 },
  diamant: { conv: 1.45, eclats: 74, etinc: 8, rayA: 0.24, ondes: 2 },
  eternel: { conv: 1.8, eclats: 96, etinc: 11, rayA: 0.28, ondes: 2 },
};

type Temps = {
  reduit: boolean;
  charge: number;
  eveil: number;
  bascules: number[];
  eclat: number;
  label: number;
  nom: number;
  guide: number;
  cadeaux: number[];
  actions: number;
};

/** Les temps de la scène, en millisecondes. Cinq secondes, six pour l'Éternel. */
function chrono(id: string, reduit: boolean): Temps {
  if (reduit) return { reduit: true, charge: 0, eveil: 0, bascules: [], eclat: 700, label: 1050, nom: 1250, guide: 1700, cadeaux: [2100, 2260, 2420], actions: 2750 };
  const e = id === "eternel";
  const charge = 480;
  const eveil = e ? 2700 : 2050;
  const bascules = e ? [170, 140, 115, 95, 80, 68, 58, 50, 44, 40] : [150, 120, 96, 78, 64, 54];
  const eclat = eveil + bascules.reduce((a, b) => a + b, 0) + 40;
  return { reduit: false, charge, eveil, bascules, eclat, label: eclat + 300, nom: eclat + 430, guide: eclat + 1080, cadeaux: [eclat + 1600, eclat + 1810, eclat + 2020], actions: eclat + 2330 };
}

const CIRC = 289.03;
const MOTIF_CHARGE = [6, 110, 6, 95, 6, 80, 6, 68, 6, 56, 6, 46, 6, 38, 6, 32, 6, 26, 6, 22, 6, 18];
const SECOUSSE: Keyframe[] = [
  { transform: "translate(0,0)" }, { transform: "translate(-7px,5px)" }, { transform: "translate(6px,-5px)" },
  { transform: "translate(-4px,3px)" }, { transform: "translate(3px,-2px)" }, { transform: "translate(-1px,1px)" }, { transform: "translate(0,0)" },
];
const SECOUSSE_PETITE: Keyframe[] = [{ transform: "translate(0,0)" }, { transform: "translate(0,4px)" }, { transform: "translate(0,-2px)" }, { transform: "translate(0,0)" }];
const MONTE: Keyframe[] = [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }];
const FONDU: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

function vibrer(motif: number | number[]) {
  try { if (navigator.vibrate) navigator.vibrate(motif); } catch { /* refusé */ }
}

function Scene({ rang, onFermer }: { rang: Rang; onFermer: () => void }) {
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const [reduit] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [T] = useState(() => chrono(rang.id, reduit));
  // Les jokers ne s'annoncent que si la base sait les poser.
  const [cadeaux] = useState(() => (RECOMPENSES_RANG[rang.id]?.cadeaux ?? []).filter((c) => c.genre !== "joker" || jokersActifs()));
  const [fini, setFini] = useState(false);
  const [carte, setCarte] = useState(false);
  const [annonce, setAnnonce] = useState("");

  const avant = rangPrecedent(rang.id);
  const lumiere = LUMIERE[rang.id] ?? LUMIERE.argent;
  const lumiereAvant = LUMIERE[avant.id] ?? LUMIERE.bronze;
  const pseudo = user?.pseudo ?? user?.name ?? "";
  const userId = user?.id;

  /* La phrase du Guide : celle du rang sans chiffre d'abord, puis celle de
     TON chemin dès que la carte du rang répond (lib/motRang.ts). Une fois
     la bulle à l'écran, elle ne change plus : une phrase qui se réécrit
     sous les yeux se lit comme une erreur. */
  const cleMot = cleMontee(rang.id);
  const [mot, setMot] = useState(() => (cleMot ? voix(guide, cleMot) : ""));
  const bulleVue = useRef(false);
  useEffect(() => {
    if (!cleMot || !userId) return;
    let vivant = true;
    void cartesDuCompte(createClient(), userId).then((cartes) => {
      if (vivant && !bulleVue.current) setMot(voix(guide, cleMot, contexteMontee(cartes, rang.id)));
    });
    return () => { vivant = false; };
  }, [cleMot, userId, guide, rang.id]);

  const racine = useRef<HTMLDivElement>(null);
  const secousse = useRef<HTMLDivElement>(null);
  const coeur = useRef<HTMLDivElement>(null);
  const gemme = useRef<HTMLDivElement>(null);
  const gAvant = useRef<HTMLImageElement>(null);
  const gApres = useRef<HTMLImageElement>(null);
  const silAvant = useRef<HTMLDivElement>(null);
  const silApres = useRef<HTMLDivElement>(null);
  const silChauffe = useRef<HTMLDivElement>(null);
  const anneau = useRef<SVGCircleElement>(null);
  const o1 = useRef<HTMLDivElement>(null);
  const o2 = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const compteur = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLParagraphElement>(null);
  const nomBoite = useRef<HTMLDivElement>(null);
  const nom = useRef<HTMLHeadingElement>(null);
  const bulle = useRef<HTMLDivElement>(null);
  const tuiles = useRef<(HTMLDivElement | null)[]>([]);
  const actions = useRef<HTMLDivElement>(null);
  const voirCarte = useRef<HTMLButtonElement>(null);

  useEffect(() => lockBodyModal(), []);

  /* Le nom remplit la largeur sans jamais déborder : mesuré à 100 px, puis
     réglé. Relu au redimensionnement et à l'arrivée de la police. */
  const ajusterNom = useCallback(() => {
    const n = nom.current, s = racine.current;
    if (!n || !s) return;
    const W = s.clientWidth, H = s.clientHeight;
    if (!W) return;
    n.style.fontSize = "100px";
    const w = n.scrollWidth || n.getBoundingClientRect().width || 1;
    const fs = Math.min((100 * Math.min(W, 540) * 0.82) / w, H * 0.098, 118);
    n.style.fontSize = `${fs.toFixed(1)}px`;
  }, []);

  useEffect(() => {
    ajusterNom();
    const s = racine.current;
    const ro = s && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => ajusterNom()) : null;
    if (s) ro?.observe(s);
    void document.fonts?.ready.then(() => ajusterNom()).catch(() => {});
    return () => ro?.disconnect();
  }, [ajusterNom]);

  /* ── La lecture : tout part d'ici, une fois ── */
  useEffect(() => {
    const s = racine.current;
    if (!s) return;
    const minuteurs: number[] = [];
    let raf = 0;
    let moteur: MoteurParticules | null = null;
    const plus = (ms: number, fn: () => void) => { minuteurs.push(window.setTimeout(fn, ms)); };
    const phase = (p: string) => { s.dataset.phase = p; };
    const montrer = (el: Element | null | undefined, kf: Keyframe[] | null, opt?: KeyframeAnimationOptions) => {
      if (!el) return;
      el.classList.add(styles.vu);
      if (kf) (el as HTMLElement).animate(kf, { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards", ...opt });
    };
    const ecrire = (v: number) => {
      const c = compteur.current;
      if (!c) return;
      c.textContent = v < 1000 ? String(v) : milliers(v);
      // Au-delà de 999, l'espace insécable ferait deux valeurs en chasse fixe.
      c.className = v < 1000 ? "vy-nombre" : "";
    };
    const centre = () => {
      const g = gemme.current?.getBoundingClientRect(), b = canvas.current?.getBoundingClientRect();
      if (!g || !b) return { x: 0, y: 0, h: 0 };
      return { x: g.left - b.left + g.width / 2, y: g.top - b.top + g.height / 2, h: g.height };
    };

    const I = INTENSITE[rang.id] ?? INTENSITE.argent;
    const de = Math.max(avant.min, rang.min - 28);
    const p0 = Math.max(0, Math.min(0.97, (de - avant.min) / Math.max(1, rang.min - avant.min)));
    if (anneau.current) anneau.current.style.strokeDashoffset = (CIRC * (1 - p0)).toFixed(2);
    ecrire(de);
    if (gAvant.current) gAvant.current.style.opacity = "1";
    phase("noir");

    if (!reduit && canvas.current) moteur = moteurParticules(canvas.current, centre, lumiere.part, rang.id === "eternel");
    const son = jouerPassage(rang.id, { ...T, cadeaux: T.cadeaux.slice(0, cadeaux.length) });

    const finir = () => {
      phase("fin");
      montrer(actions.current, T.reduit ? FONDU : MONTE, T.reduit ? { duration: 300 } : undefined);
      setFini(true);
    };

    if (T.reduit) {
      phase("charge");
      if (anneau.current) anneau.current.style.strokeDashoffset = "0";
      ecrire(rang.min);
      plus(T.eclat, () => {
        phase("eclat");
        gAvant.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
        if (gApres.current) {
          gApres.current.style.opacity = "1";
          gApres.current.animate(FONDU, { duration: 500, fill: "backwards" });
        }
        setAnnonce(`Nouveau rang : ${rang.nom}`);
      });
      plus(T.label, () => montrer(label.current, FONDU, { duration: 300 }));
      plus(T.nom, () => { ajusterNom(); montrer(nomBoite.current, FONDU, { duration: 400 }); });
      plus(T.guide, () => { bulleVue.current = true; montrer(bulle.current, FONDU, { duration: 300 }); });
      T.cadeaux.forEach((ms, i) => plus(ms, () => montrer(tuiles.current[i], FONDU, { duration: 300 })));
      plus(T.actions, finir);
    } else {
      gemme.current?.animate([{ opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1 }], { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });

      // La charge : l'anneau se remplit, l'EXP défile, la lumière converge.
      plus(T.charge, () => {
        phase("charge");
        vibrer(MOTIF_CHARGE);
        const debut = performance.now(), duree = T.eveil - T.charge;
        moteur?.taux("conv", 26 * I.conv);
        const pas = (now: number) => {
          const p = Math.min(1, (now - debut) / duree);
          if (anneau.current) anneau.current.style.strokeDashoffset = (CIRC * (1 - (p0 + (1 - p0) * easeInOut(p)))).toFixed(2);
          ecrire(Math.round(de + (rang.min - de) * Math.pow(p, 1.25)));
          const ch = Math.pow(p, 1.7);
          if (gAvant.current) gAvant.current.style.filter = `brightness(${(1 + ch * 1.15).toFixed(3)}) saturate(${(1 - ch * 0.45).toFixed(3)})`;
          if (silChauffe.current) silChauffe.current.style.opacity = (Math.pow(p, 2.4) * 0.92).toFixed(3);
          const j = ch * 2.4;
          if (gemme.current) gemme.current.style.transform = `translate(${((Math.random() - 0.5) * j).toFixed(2)}px,${((Math.random() - 0.5) * j).toFixed(2)}px)`;
          moteur?.taux("conv", (26 + 210 * p * p) * I.conv);
          if (p < 1) raf = requestAnimationFrame(pas);
        };
        raf = requestAnimationFrame(pas);
      });

      // L'éveil : la gemme blanchit et hésite entre l'ancienne forme et la nouvelle.
      let t = T.eveil;
      T.bascules.forEach((d, i) => {
        const a = t;
        plus(a, () => {
          if (i === 0) {
            cancelAnimationFrame(raf);
            phase("eveil");
            if (gAvant.current) gAvant.current.style.opacity = "0";
            if (silChauffe.current) silChauffe.current.style.opacity = "0";
            if (gemme.current) gemme.current.style.transform = "";
            if (anneau.current) anneau.current.style.strokeDashoffset = "0";
            ecrire(rang.min);
            moteur?.taux("conv", 140 * I.conv);
          }
          const nouvelle = i % 2 === 1;
          if (silAvant.current) silAvant.current.style.opacity = nouvelle ? "0" : "1";
          if (silApres.current) silApres.current.style.opacity = nouvelle ? "1" : "0";
          gemme.current?.animate([{ scale: 1.07 }, { scale: 1 }], { duration: 110, easing: "ease-out" });
          if (!nouvelle) vibrer(8);
        });
        t += d;
      });

      // L'éclat.
      plus(T.eclat, () => {
        const H = s.clientHeight;
        phase("eclat");
        moteur?.taux("conv", 0);
        if (silAvant.current) silAvant.current.style.opacity = "0";
        if (silApres.current) silApres.current.style.opacity = "0";
        if (gApres.current) {
          gApres.current.style.opacity = "1";
          gApres.current.animate(
            [{ scale: 1.55, filter: "brightness(3.2)" }, { scale: 0.92, filter: "brightness(1.35)", offset: 0.45 }, { scale: 1, filter: "brightness(1)" }],
            { duration: 800, easing: "cubic-bezier(.16,.84,.24,1)" },
          );
        }
        coeur.current?.animate(
          [{ transform: `translateY(${(0.09 * H).toFixed(1)}px) scale(1.12)` }, { transform: `translateY(${(-0.012 * H).toFixed(1)}px) scale(1.01)`, offset: 0.5 }, { transform: "none" }],
          { duration: 820, easing: "cubic-bezier(.2,.9,.25,1)" },
        );
        flash.current?.animate([{ opacity: 0 }, { opacity: 0.92, offset: 0.1 }, { opacity: 0 }], { duration: 560, easing: "ease-out" });
        o1.current?.animate([{ transform: "scale(1.1)", opacity: 1 }, { transform: "scale(3.8)", opacity: 0 }], { duration: 950, easing: "cubic-bezier(.1,.7,.2,1)" });
        if (I.ondes > 1) o2.current?.animate([{ transform: "scale(.5)", opacity: 1 }, { transform: "scale(3.4)", opacity: 0 }], { duration: 1200, delay: 120, easing: "cubic-bezier(.1,.7,.2,1)", fill: "backwards" });
        secousse.current?.animate(SECOUSSE, { duration: 460, easing: "ease-out" });
        moteur?.eclats(lumiereAvant.eclats, I.eclats);
        moteur?.taux("etinc", I.etinc);
        vibrer(60);
        setAnnonce(`Nouveau rang : ${rang.nom}`);
      });

      plus(T.label, () => montrer(label.current, MONTE));
      // Le nom tombe.
      plus(T.nom, () => {
        ajusterNom();
        nomBoite.current?.classList.add(styles.vu);
        nom.current?.animate(
          [
            { transform: "scale(1.9)", filter: "blur(14px)", opacity: 0, letterSpacing: ".28em" },
            { transform: "scale(.965)", filter: "blur(0px)", opacity: 1, letterSpacing: "-.01em", offset: 0.72 },
            { transform: "scale(1)", filter: "blur(0px)", opacity: 1, letterSpacing: "-.01em" },
          ],
          { duration: 460, easing: "cubic-bezier(.2,.9,.2,1)" },
        );
        secousse.current?.animate(SECOUSSE_PETITE, { duration: 260, delay: 300, easing: "ease-out" });
        vibrer(18);
        plus(480, () => nom.current?.classList.add(styles.brille));
      });
      plus(T.guide, () => { bulleVue.current = true; montrer(bulle.current, MONTE); });
      // Les cadeaux s'ouvrent l'un après l'autre ; la carte se retourne.
      T.cadeaux.forEach((ms, i) => plus(ms, () => {
        const el = tuiles.current[i];
        if (!el) return;
        el.classList.add(styles.vu);
        el.animate(
          [{ opacity: 0, transform: "translateY(16px) scale(.72)" }, { opacity: 1, transform: "translateY(-3px) scale(1.05)", offset: 0.6 }, { opacity: 1, transform: "none" }],
          { duration: 480, easing: "cubic-bezier(.2,.9,.3,1.15)" },
        );
        el.querySelector<HTMLElement>("[data-carte]")?.animate(
          [{ transform: "rotateY(-110deg)" }, { transform: "rotateY(12deg)", offset: 0.7 }, { transform: "none" }],
          { duration: 650, easing: "cubic-bezier(.2,.8,.3,1)" },
        );
        vibrer(14);
      }));
      plus(T.actions, finir);
    }

    return () => {
      minuteurs.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      moteur?.arreter();
      son?.couper();
    };
    // La scène se joue une fois par montage : la clé change à chaque passage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le focus suit la scène : d'abord la scène, puis l'action à la fin.
  useEffect(() => { racine.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (fini) voirCarte.current?.focus({ preventScroll: true }); }, [fini]);

  // Échap ne ferme qu'une fois la scène finie, et pas pendant la carte.
  useEffect(() => {
    if (!fini || carte) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fini, carte, onFermer]);

  const style = {
    "--glow": lumiere.glow,
    "--glow-avant": lumiereAvant.glow,
    "--ray": lumiere.ray,
    "--ray-a": String((INTENSITE[rang.id] ?? INTENSITE.argent).rayA),
    "--nom-grad": lumiere.nom,
  } as CSSProperties;
  const src = (r: Rang) => ({ "--src": `url("${r.image ?? ""}")` }) as CSSProperties;

  return (
    <div
      ref={racine}
      className={styles.scene}
      data-rang={rang.id}
      data-phase="noir"
      role="dialog"
      aria-modal="true"
      aria-label={`Nouveau rang : ${rang.nom}`}
      tabIndex={-1}
      style={style}
    >
      <div className={styles.fond} />
      <div className={`${styles.teinte} ${styles.avant}`} />
      <div className={`${styles.teinte} ${styles.apres}`} />
      <div className={styles.cosmos} />
      <div className={styles.secousse} ref={secousse}>
        <div className={styles.coeur} ref={coeur} aria-hidden="true">
          <div className={styles.rayons} />
          <div className={`${styles.rayons} ${styles.rayons2}`} />
          <div className={styles.halo} />
          <div className={styles.onde} ref={o1} />
          <div className={styles.onde} ref={o2} />
          <svg className={styles.anneau} viewBox="0 0 100 100">
            <circle className={styles.anneauFond} cx="50" cy="50" r="46" />
            <circle className={styles.anneauPlein} ref={anneau} cx="50" cy="50" r="46" />
          </svg>
          <div className={styles.gemme} ref={gemme}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.g} ref={gAvant} src={avant.image} alt="" draggable={false} />
            <div className={`${styles.g} ${styles.sil}`} ref={silChauffe} style={src(avant)} />
            <div className={`${styles.g} ${styles.sil}`} ref={silAvant} style={src(avant)} />
            <div className={`${styles.g} ${styles.sil}`} ref={silApres} style={src(rang)} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.g} ref={gApres} src={rang.image} alt="" draggable={false} />
          </div>
        </div>
        <canvas className={styles.particules} ref={canvas} aria-hidden="true" />
        <div className={styles.textes}>
          <p className={styles.compteur} aria-hidden="true">
            <span ref={compteur} className="vy-nombre" />&nbsp;EXP
          </p>
          <p className={styles.label} ref={label}>
            Nouveau rang · {indexRang(rang.id) + 1} sur {RANGS.length}
          </p>
          <div className={styles.nomBoite} ref={nomBoite}>
            <h2 className={styles.nom} ref={nom}>{rang.nom}</h2>
          </div>
          <div className={styles.guide} ref={bulle}>
            <VisageGuide guide={guide} etat="encourage" size={38} />
            <p>{mot}</p>
          </div>
          {cadeaux.length > 0 && (
            <div className={styles.cadeaux}>
              {cadeaux.map((c, i) => (
                <div key={c.genre} className={styles.cadeau} ref={(el) => { tuiles.current[i] = el; }}>
                  <div className={styles.visuel} data-carte={c.genre === "carte" ? "" : undefined}>
                    <VisuelCadeau
                      genre={c.genre}
                      rang={rang}
                      carte={{ pseudo }}
                      avatarUrl={user?.avatar}
                      n={c.n}
                      nuit
                      taille="9.6cqh"
                    />
                  </div>
                  <p className={styles.cadeauTitre}>{c.titre}</p>
                </div>
              ))}
            </div>
          )}
          <div className={styles.actions} ref={actions} aria-hidden={!fini}>
            <button type="button" className={styles.continuer} onClick={onFermer} disabled={!fini}>
              Continuer
            </button>
            <button type="button" className={styles.voirCarte} ref={voirCarte} onClick={() => setCarte(true)} disabled={!fini || !user?.id}>
              Voir ma carte
            </button>
          </div>
        </div>
      </div>
      <div className={styles.flash} ref={flash} />
      <p className="sr-only" aria-live="polite">{annonce}</p>

      {carte && user?.id && (
        <FeuilleCarte rang={rang} userId={user.id} pseudo={pseudo} neuve onFermer={() => setCarte(false)} />
      )}
    </div>
  );
}
