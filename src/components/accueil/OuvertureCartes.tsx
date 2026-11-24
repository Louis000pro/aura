"use client";

// L'ouverture d'un booster, après la déchirure (maquette validée par Louis le 2026-11-17) :
// les trois cartes montent hors du sachet, de dos ; la première se retourne toute seule, un toucher
// range la carte vue en bas et retourne la suivante. Avant la troisième (la meilleure), une lueur à la
// couleur de sa rareté monte autour d'elle, le temps d'attente grandit avec la rareté et le fond
// s'assombrit pour une épique et au-delà. Une lueur, et rien d'autre : ni rayons, ni éclats (Louis :
// « une vraie lueur, pas des traits qui partent dans tous les sens »). Puis le récapitulatif en
// éventail, la meilleure au centre, l'EXP de chaque carte qui rejoint le total, et « Nouvelle ».
// Tout bouge en transform et en opacité, par Web Animations : rien ne se repeint pendant l'ouverture.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EXP_CARTE as EXP, type Carte } from "@/lib/cartesBooster";
import styles from "./OuvertureCartes.module.css";

type Rarete = Carte["rarete"];
type Pose = { x: number; y: number; s: number; r: number };
type Etat = "sortie" | "flip" | "carte" | "range" | "recapAnim" | "recap" | "zoom";

// lueur : durée de la grosse lueur de la dernière carte, taille : son ampleur, tremble : force du tremblement.
const RAR: Record<Rarete, { nuit: number; attente: number; tours: number; flip: number; vibre: number[]; lueur: number; taille: number; tremble: number }> = {
  commune: { nuit: 0, attente: 260, tours: 0, flip: 560, vibre: [10], lueur: 900, taille: .9, tremble: .1 },
  rare: { nuit: .45, attente: 760, tours: 0, flip: 700, vibre: [16, 40, 16], lueur: 1100, taille: 1, tremble: .1 },
  epique: { nuit: .72, attente: 900, tours: 0, flip: 700, vibre: [18, 40, 18], lueur: 1800, taille: 1.15, tremble: .2 },
  legendaire: { nuit: .82, attente: 1500, tours: 1, flip: 980, vibre: [24, 40, 24, 40, 60], lueur: 3000, taille: 1.35, tremble: .3 },
  chromatique: { nuit: .88, attente: 1900, tours: 1, flip: 1040, vibre: [30, 40, 30, 40, 30, 40, 90], lueur: 3700, taille: 1.6, tremble: .5 },
};

// Une courbe de ressort calculée une fois, jouée par le navigateur (linear()), sinon une approximation.
function ressort(k: number, c: number) {
  let x = 0, v = 0, t = 0;
  const dt = 1 / 240, points: number[] = [];
  while (t < 2.5) {
    v += (-k * (x - 1) - c * v) * dt; x += v * dt; t += dt; points.push(x);
    if (t > .12 && Math.abs(x - 1) < .001 && Math.abs(v) < .02) break;
  }
  const n = 40, s = [0];
  for (let i = 1; i <= n; i++) s.push(+points[Math.round(i * (points.length - 1) / n)].toFixed(4));
  s[n] = 1;
  const lineaire = typeof CSS !== "undefined" && CSS.supports("transition-timing-function", "linear(0, 1)");
  return lineaire ? { e: "linear(" + s.join(",") + ")", d: Math.round(t * 1000) } : { e: "cubic-bezier(.3,1.35,.5,1)", d: Math.round(t * 760) };
}

// Le titre dit toujours la meilleure carte, dans la couleur de sa rareté ; « Booster ouvert » vient dessous.
const TITRE: Partial<Record<Rarete, string>> = { rare: "Une rare !", epique: "Une épique !", legendaire: "Une légendaire !", chromatique: "Une chromatique !" };
const RANG_RARETE: Rarete[] = ["commune", "rare", "epique", "legendaire", "chromatique"];

export default function OuvertureCartes({ cartes, images, libelles, exp, exemplaires, mode, sachet, infos, actions, onFermer, onRecap }: {
  cartes: Carte[];
  images: string[];
  libelles: string[];
  exp: number;
  /** Exemplaires de chaque carte après ce booster : 1 = « Nouvelle », plus = « ×N ». null si inconnu. */
  exemplaires: number[] | null;
  mode: "ouverture" | "recap";
  sachet: DOMRect | null;
  /** Ce que la page de fin dit avant l'EXP (rareté, collection). */
  infos?: ReactNode;
  actions: ReactNode;
  onFermer: () => void;
  /** Le récapitulatif est à l'écran : le booster est fini. */
  onRecap?: () => void;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const nuit = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const gloire = useRef<HTMLDivElement>(null);
  const respire = useRef<Animation | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const socle = useRef<HTMLDivElement>(null);
  const recap = useRef<HTMLDivElement>(null);
  const pastille = useRef<HTMLDivElement>(null);
  const titreEl = useRef<HTMLHeadingElement>(null);
  const elCartes = useRef<(HTMLDivElement | null)[]>([]);
  const etiquettes = useRef<(HTMLSpanElement | null)[]>([]);
  const jetons = useRef<(HTMLSpanElement | null)[]>([]);
  const commandes = useRef<{ toucher: (i: number) => void } | null>(null);
  const meilleure = cartes.reduce((m, c) => RANG_RARETE.indexOf(c.rarete) > RANG_RARETE.indexOf(m) ? c.rarete : m, cartes[0].rarete);
  const titreFin = TITRE[meilleure] ?? "Booster ouvert";
  const [titre, setTitre] = useState(mode === "recap" ? titreFin : "");
  const [aide, setAide] = useState("");
  const [total, setTotal] = useState(mode === "recap" ? exp : 0);
  const [etatAffiche, setEtatAffiche] = useState<Etat>(mode === "recap" ? "recap" : "sortie");
  const [sombre, setSombre] = useState(false);
  const geste = useRef<{ i: number; x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    const racine = scene.current;
    if (!racine) return;
    const els = elCartes.current.map(e => e!);
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doux = ressort(150, 19), vif = ressort(280, 26), rebond = ressort(200, 14);
    let vivant = true;
    let etat: Etat = mode === "recap" ? "recap" : "sortie";
    const poses: Pose[] = [];
    const anims: (Animation | null)[] = [null, null, null];
    const places = [0, 2, 1];
    let zoom: number | null = null;

    // La géométrie se calcule sur la taille de la scène (tout l'écran du dialogue).
    const { width: W, height: H, left: L, top: T } = racine.getBoundingClientRect();
    const CW = Math.min(W * .74, H * .55 * 820 / 1290, 360), CH = CW * 1290 / 820;
    racine.style.setProperty("--cw", CW + "px");
    // Le socle lumineux se pose sous l'éventail de la page de fin, pas au milieu de ce qui suit.
    racine.style.setProperty("--socle", (H * .37 + CH * .23) + "px");
    const pack = sachet && sachet.width > 0
      ? { x: sachet.left - L + sachet.width / 2, top: sachet.top - T, h: sachet.height, w: sachet.width }
      : { x: W / 2, top: H * .46 - CW * .6, h: CW * 1.2, w: CW * .86 };
    const sDedans = pack.w * .84 / CW;
    const P = {
      centre: (): Pose => ({ x: W / 2, y: H * .46, s: 1, r: 0 }),
      pile: (k: number): Pose => ({ x: W / 2, y: H * .46 - k * H * .021, s: 1 - k * .05, r: 0 }),
      rail: (i: number): Pose => ({ x: W / 2 + (i - 1) * Math.min(W * .19, 80), y: H * .9, s: .2, r: 0 }),
      dedans: (): Pose => ({ x: pack.x, y: pack.top + pack.h * .1 + CH * sDedans / 2, s: sDedans, r: 0 }),
      sorti: (i: number): Pose => ({
        x: pack.x + (i - 1) * W * .075,
        y: pack.top + pack.h * .1 + CH * sDedans / 2 - CH * sDedans * .43 + Math.abs(i - 1) * H * .012,
        s: sDedans, r: (i - 1) * 7,
      }),
      // La page de fin : l'éventail monte pour laisser la place à ce qui suit.
      eventail: (p: number): Pose => [
        { x: W * .2, y: H * .385, s: .37, r: -7 }, { x: W * .5, y: H * .37, s: .46, r: 0 }, { x: W * .8, y: H * .385, s: .37, r: 7 },
      ][p],
      zoom: (): Pose => ({ x: W / 2, y: H * .52, s: 1, r: 0 }),
    };
    const tf = (p: Pose) => "translate3d(" + (p.x - CW / 2).toFixed(2) + "px," + (p.y - CH / 2).toFixed(2) + "px,0) rotate(" + p.r + "deg) scale(" + p.s + ")";
    const attendre = (ms: number) => new Promise<void>(r => window.setTimeout(r, reduit ? Math.min(ms, 80) : ms));
    const vibrer = (motif: number[]) => { try { navigator.vibrate?.(motif); } catch { /* sans vibreur */ } };
    const definir = (e: Etat) => { etat = e; setEtatAffiche(e); };

    // Une animation remplace la précédente sur le même élément (une animation finie en fill:both
    // l'emporterait sinon sur le style posé ensuite), et son état final reste posé en style.
    const annuler = (e: Element) => e.getAnimations().forEach(a => { if (!(a instanceof CSSAnimation) && !(a instanceof CSSTransition)) a.cancel(); });
    function fixe(e: HTMLElement, images_: Keyframe[], o: KeyframeAnimationOptions) {
      annuler(e);
      const a = e.animate(images_, { fill: "both", ...o, duration: reduit ? Math.min(Number(o.duration) || 0, 120) : o.duration, delay: reduit ? 0 : o.delay });
      const fin = images_[images_.length - 1];
      a.finished.then(() => {
        for (const k in fin) if (k !== "offset" && k !== "easing") e.style.setProperty(k, String(fin[k]));
        a.cancel();
      }).catch(() => {});
      return a;
    }
    const joue = (e: HTMLElement, images_: Keyframe[], o: KeyframeAnimationOptions) => {
      annuler(e);
      return e.animate(images_, { fill: "both", ...o, duration: reduit ? Math.min(Number(o.duration) || 0, 120) : o.duration, delay: reduit ? 0 : o.delay });
    };
    function poser(i: number, p: Pose) {
      poses[i] = p; anims[i]?.cancel(); anims[i] = null;
      els[i].style.transform = tf(p);
    }
    function aller(i: number, p: Pose, o: { r?: { e: string; d: number }; d?: number; e?: string; delay?: number } = {}) {
      const e = els[i];
      const de = anims[i]?.playState === "running" ? getComputedStyle(e).transform : tf(poses[i]);
      anims[i]?.cancel();
      poses[i] = p;
      const vers = tf(p), r = o.r ?? doux;
      e.style.transform = vers;
      const a = anims[i] = e.animate([{ transform: de }, { transform: vers }],
        { duration: reduit ? 100 : (o.d ?? r.d), easing: o.e ?? r.e, delay: reduit ? 0 : (o.delay ?? 0), fill: "backwards" });
      a.finished.then(() => { if (anims[i] === a) anims[i] = null; }).catch(() => {});
    }
    const morceau = (i: number, classe: string) => els[i].querySelector<HTMLElement>("." + classe)!;

    async function sortie() {
      els.forEach((e, i) => { poser(i, P.dedans()); e.style.zIndex = String(3 - i); e.dataset.on = ""; });
      vibrer([14, 40, 22]);
      await attendre(110); if (!vivant) return;
      [2, 1, 0].forEach((i, k) => aller(i, P.sorti(i), { d: 540, e: "cubic-bezier(.16,.9,.3,1)", delay: k * 50 }));
      await attendre(580); if (!vivant) return;
      aller(0, P.centre());
      aller(1, P.pile(1), { delay: 40 });
      aller(2, P.pile(2), { delay: 80 });
      rail.current!.dataset.on = "";
      await attendre(430); if (!vivant) return;
      void reveler(0);
    }

    async function suspense(i: number) {
      const o = RAR[cartes[i].rarete], d = reduit ? 100 : o.attente;
      definir("flip"); setAide("");
      if (o.nuit) {
        fixe(nuit.current!, [{ opacity: getComputedStyle(nuit.current!).opacity }, { opacity: o.nuit }], { duration: d, easing: "ease-in" });
        window.setTimeout(() => { if (vivant) setSombre(true); }, d * .5);
      }
      {
        // Une chromatique se trahit par son dos, qui passe à l'or pendant l'attente (jamais avant :
        // les trois cartes sortent du sachet avec le même dos).
        if (cartes[i].rarete === "chromatique") els[i].dataset.dore = "";
        // La lueur monte autour de la carte encore de dos, et elle respire avant le retournement.
        joue(morceau(i, styles.aura), [
          { opacity: 0, transform: "scale(.86)" }, { opacity: .55, transform: "scale(.98)", offset: .45 },
          { opacity: .38, transform: "scale(.95)", offset: .6 }, { opacity: 1, transform: "scale(1.04)" },
        ], { duration: d, easing: "ease-in" });
        if (!reduit) joue(morceau(i, styles.tilt), [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k =>
          ({ transform: "rotate(" + ((k % 2 ? 1 : -1) * k * o.tremble) + "deg) scale(" + (1 + k * .004) + ")" })),
        { duration: d, easing: "ease-in", fill: "none" });
        const pas = Math.max(90, d / 7);
        for (let t = pas; t < d; t += pas) window.setTimeout(() => { if (vivant) vibrer([5]); }, t);
      }
      await attendre(d);
    }

    async function reveler(i: number) {
      const carte = cartes[i], o = RAR[carte.rarete], grande = i === 2;
      definir("flip"); setAide("");
      const img = els[i].querySelector("img");
      try { await img?.decode(); } catch { /* l'image s'affichera dès qu'elle arrive */ }
      if (!vivant) return;
      if (grande) { await suspense(i); if (!vivant) return; }
      else await attendre(i === 0 ? 120 : 40);
      if (!vivant) return;
      const d = grande ? o.flip : 540, de = 180 + (grande ? o.tours * 360 : 0);
      fixe(morceau(i, styles.int), [{ transform: "rotateY(" + de + "deg)" }, { transform: "rotateY(-7deg)", offset: .74 }, { transform: "rotateY(0deg)" }],
        { duration: d, easing: "cubic-bezier(.3,.6,.25,1)" });
      joue(morceau(i, styles.tilt), [{ transform: "translate3d(0,0,0) scale(1)" }, { transform: "translate3d(0," + (-H * .02) + "px,0) scale(" + (grande ? 1.08 : 1.04) + ")", offset: .5 }, { transform: "translate3d(0,0,0) scale(1)" }],
        { duration: d, easing: "ease-in-out", fill: "none" });
      const aura = morceau(i, styles.aura);
      joue(aura, [{ opacity: getComputedStyle(aura).opacity }, { opacity: grande ? .75 : 0 }], { duration: d, easing: "ease-out" });
      await attendre(d * (grande && o.tours ? .62 : .42)); if (!vivant) return;
      // La carte vue : un reflet la traverse, et une lumière douce s'épanouit derrière elle.
      vibrer(grande ? o.vibre : [8]);
      if (grande) joue(morceau(i, styles.balai), [{ opacity: 0, transform: "translate3d(-45%,0,0)" }, { opacity: .85, offset: .25 }, { opacity: .7, offset: .7 }, { opacity: 0, transform: "translate3d(45%,0,0)" }],
        { duration: 950, easing: "ease-out", delay: 120 });
      racine!.dataset.rarete = carte.rarete;
      if (grande) {
        joue(halo.current!, [{ opacity: 0, transform: "scale(.6)" }, { opacity: grande ? .9 : .5, transform: "scale(1)", offset: .35 }, { opacity: grande ? .55 : 0, transform: "scale(1.08)" }],
          { duration: 1300, easing: "ease-out" });
      }
      // La meilleure carte : une grosse lueur de la couleur de sa rareté s'épanouit derrière elle,
      // puis respire. Seuls transform et opacity bougent, aucun filtre.
      if (grande && !reduit) {
        gloire.current!.dataset.on = carte.rarete;
        const t = o.taille;
        joue(gloire.current!, [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(" + (t * 1.15) + ")", offset: .35 },
          { opacity: .95, transform: "scale(" + (t * .97) + ")", offset: .7 }, { opacity: .85, transform: "scale(" + t + ")" }],
          { duration: o.lueur, easing: "cubic-bezier(.2,.8,.3,1)" });
        respire.current = gloire.current!.animate([{ opacity: .85, transform: "scale(" + t + ")" }, { opacity: 1, transform: "scale(" + (t * 1.07) + ")" }, { opacity: .85, transform: "scale(" + t + ")" }],
          { duration: 2600, delay: o.lueur, iterations: Infinity, easing: "ease-in-out" });
        // Légendaire et chromatique : la carte tremble pendant que la lueur s'épanouit.
        if (o.tours) {
          const n = Math.round(o.lueur * .55 / 45), a = H * .004 * o.tremble * 2;
          joue(morceau(i, styles.tilt), Array.from({ length: n + 1 }, (_, k) => {
            const f = k === n ? 0 : (1 - k / n) * (k % 2 ? 1 : -1);
            return { transform: "translate3d(" + (f * a) + "px," + (-Math.abs(f) * a * .5) + "px,0) rotate(" + (f * o.tremble * 2) + "deg)" };
          }), { duration: o.lueur * .55, easing: "linear", fill: "none", delay: 80 });
        }
      }
      await attendre(grande ? Math.max(d * .5, o.lueur * .7) : d * .5); if (!vivant) return;
      els[i].dataset.actif = "";
      definir("carte");
      setAide(grande ? libelles[i] + " · Touche la carte pour voir tes trois cartes" : "Touche la carte pour passer à la suivante");
    }

    async function suivante(i: number) {
      definir("range"); setAide("");
      delete els[i].dataset.actif;
      vibrer([6]);
      els[i].style.zIndex = "1";
      aller(i, P.rail(i), { r: vif });
      els[i + 1].style.zIndex = "6";
      aller(i + 1, P.centre(), { delay: 60 });
      if (els[i + 2]) aller(i + 2, P.pile(1), { delay: 90 });
      await attendre(300); if (!vivant) return;
      void reveler(i + 1);
    }

    function calmer(d = 900) {
      fixe(nuit.current!, [{ opacity: getComputedStyle(nuit.current!).opacity }, { opacity: 0 }], { duration: d, easing: "ease-out" });
      fixe(halo.current!, [{ opacity: getComputedStyle(halo.current!).opacity }, { opacity: 0 }], { duration: d * .6, easing: "ease-out" });
      respire.current?.cancel(); respire.current = null;
      fixe(gloire.current!, [{ opacity: getComputedStyle(gloire.current!).opacity }, { opacity: 0 }], { duration: d * .6, easing: "ease-out" });
      window.setTimeout(() => { if (vivant) setSombre(false); }, d * .35);
    }

    function poserRecap(anime: boolean) {
      els.forEach((e, i) => {
        e.dataset.on = "";
        e.style.zIndex = places[i] === 1 ? "5" : "4";
        morceau(i, styles.int).style.transform = "rotateY(0deg)";
        if (anime) aller(i, P.eventail(places[i]), { delay: [70, 140, 0][i] });
        else poser(i, P.eventail(places[i]));
      });
    }

    async function recapitule() {
      definir("recapAnim"); setAide(""); vibrer([10]); calmer();
      els.forEach((e, i) => { delete e.dataset.actif; const a = morceau(i, styles.aura); joue(a, [{ opacity: getComputedStyle(a).opacity }, { opacity: 0 }], { duration: 300 }); });
      delete rail.current!.dataset.on;
      poserRecap(true);
      setTitre(titreFin);
      fixe(socle.current!, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 600, easing: "ease-out", delay: 250 });
      await attendre(560); if (!vivant) return;
      fixe(recap.current!, [{ opacity: 0, transform: "translate3d(0,12px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
      // L'EXP de chaque carte rejoint le total, seulement si le total crédité est bien la somme.
      const somme = cartes.reduce((n, c) => n + EXP[c.rarete], 0);
      if (exp > 0 && somme === exp && pastille.current) {
        let cumul = 0;
        const ordre = [0, 2, 1];
        for (let k = 0; k < 3; k++) {
          const i = ordre[k], p = poses[i], valeur = EXP[cartes[i].rarete], jeton = jetons.current[k]!;
          const a = pastille.current.getBoundingClientRect(), b = racine!.getBoundingClientRect();
          const x0 = p.x, y0 = p.y - CH * p.s / 2 - H * .028, x1 = a.left - b.left + a.width / 2, y1 = a.top - b.top + a.height / 2;
          jeton.textContent = "+" + valeur;
          const pos = (x: number, y: number, s: number) => "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) translate(-50%,-50%) scale(" + s + ")";
          joue(jeton, [{ transform: pos(x0, y0 + H * .03, .6), opacity: 0 }, { transform: pos(x0, y0, 1), opacity: 1, offset: .28 },
            { transform: pos(x0, y0, 1), opacity: 1, offset: .46 }, { transform: pos(x1, y1, .55), opacity: 0 }],
          { duration: 720, easing: "cubic-bezier(.4,0,.2,1)" });
          await attendre(660); if (!vivant) return;
          cumul += valeur; setTotal(cumul); vibrer([6]);
          joue(pastille.current, [{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out", fill: "none" });
        }
      } else setTotal(exp);
      poserNouvelles(true);
      els.forEach(e => { e.dataset.actif = ""; });
      definir("recap");
      onRecap?.();
    }

    function poserNouvelles(anime: boolean) {
      if (!exemplaires) return;
      // Les trois étiquettes sur une même ligne, sous la carte du centre (la plus basse de l'éventail).
      const ligne = Math.max(...poses.map(p => p.y + CH * p.s / 2)) + H * .026;
      cartes.forEach((_, i) => {
        const e = etiquettes.current[i];
        if (!exemplaires[i] || !e) return;
        const p = poses[i];
        e.style.transform = "translate3d(" + p.x.toFixed(1) + "px," + ligne.toFixed(1) + "px,0) translate(-50%,-50%)";
        if (anime) fixe(e, [{ opacity: 0, scale: ".6" }, { opacity: 1, scale: "1" }], { duration: rebond.d, easing: rebond.e, delay: i * 90 });
        else e.style.opacity = "1";
      });
    }

    function zoomer(i: number) {
      if (etat === "recap") {
        definir("zoom"); zoom = i;
        els[i].style.zIndex = "9"; els[i].dataset.zoom = "";
        aller(i, P.zoom());
      } else if (etat === "zoom" && zoom === i) {
        delete els[i].dataset.zoom;
        aller(i, P.eventail(places[i]));
        zoom = null;
        window.setTimeout(() => { if (vivant) els[i].style.zIndex = places[i] === 1 ? "5" : "4"; }, 220);
        definir("recap");
      }
    }

    commandes.current = {
      toucher: (i: number) => {
        if (etat === "carte") {
          const vue = cartes.findIndex((_, k) => els[k].hasAttribute("data-actif"));
          if (vue !== i) return;
          if (i < 2) void suivante(i); else void recapitule();
        } else if (etat === "recap" || etat === "zoom") zoomer(i);
      },
    };

    if (mode === "recap") {
      poserRecap(false);
      recap.current!.style.opacity = "1";
      socle.current!.style.opacity = "1";
      poserNouvelles(false);
      els.forEach(e => { e.dataset.actif = ""; });
    } else void sortie();

    return () => { vivant = false; commandes.current = null; };
    // La scène se monte une fois par tirage : la suite ne dépend que de ce qu'elle a reçu au départ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scene} className={styles.scene} data-etat={etatAffiche} data-sombre={sombre ? "" : undefined}>
      <div ref={nuit} className={styles.nuit} />
      <div ref={halo} className={styles.halo} />
      <div ref={gloire} className={styles.gloire} />
      <div ref={socle} className={styles.socle} />
      <div ref={rail} className={styles.rail} aria-hidden="true"><i /><i /><i /></div>
      {cartes.map((carte, i) => (
        <div key={i} ref={e => { elCartes.current[i] = e; }} className={styles.carte} data-rarete={carte.rarete}
          role="button" tabIndex={0} aria-label={libelles[i]}
          onKeyDown={event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            commandes.current?.toucher(i);
          }}
          onPointerDown={event => {
            if (!event.isPrimary) return;
            geste.current = { i, x: event.clientX, y: event.clientY, id: event.pointerId };
          }}
          onPointerMove={event => {
            const g = geste.current;
            if (!g || g.id !== event.pointerId || !event.currentTarget.hasAttribute("data-actif")) return;
            // La carte s'incline sous le doigt.
            const b = event.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (event.clientX - b.left) / b.width));
            const y = Math.max(0, Math.min(1, (event.clientY - b.top) / b.height));
            const tilt = event.currentTarget.querySelector<HTMLElement>("." + styles.tilt);
            if (tilt && !tilt.getAnimations().length) tilt.style.transform = "rotateX(" + ((.5 - y) * 16) + "deg) rotateY(" + ((x - .5) * 20) + "deg)";
          }}
          onPointerUp={event => {
            const g = geste.current;
            geste.current = null;
            const tilt = event.currentTarget.querySelector<HTMLElement>("." + styles.tilt);
            tilt?.style.removeProperty("transform");
            if (g && g.id === event.pointerId && Math.hypot(event.clientX - g.x, event.clientY - g.y) < 10) commandes.current?.toucher(i);
          }}
          onPointerCancel={event => {
            geste.current = null;
            event.currentTarget.querySelector<HTMLElement>("." + styles.tilt)?.style.removeProperty("transform");
          }}>
          <div className={styles.aura} />
          <div className={styles.tilt}>
            <div className={styles.int}>
              <div className={styles.dos}><b /><i /></div>
              <div className={styles.face}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[i]} alt="" draggable={false} />
                <div className={styles.balai} />
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className={styles.ui}>
        <h2 ref={titreEl} className={styles.titre} data-fin={titre ? meilleure : undefined} aria-live="polite">{titre}</h2>
        {titreFin !== "Booster ouvert" && <p className={styles.sousTitre}>Booster ouvert</p>}
        <button type="button" className={styles.fermer} aria-label="Fermer" onClick={onFermer}>×</button>
        <p className={styles.aide}>{aide}</p>
        <div ref={recap} className={styles.recap}>
          {infos}
          {exp > 0 && <div ref={pastille} className={styles.exp}><b>+{total}</b><span>EXP</span></div>}
          {actions}
        </div>
        {cartes.map((_, i) => <span key={i} ref={e => { etiquettes.current[i] = e; }} className={styles.etiquette}
          data-neuve={exemplaires?.[i] === 1 ? "" : undefined}>{exemplaires?.[i] === 1 ? "Nouvelle" : exemplaires?.[i] ? "×" + exemplaires[i] : ""}</span>)}
        {cartes.map((_, i) => <span key={i} ref={e => { jetons.current[i] = e; }} className={styles.jeton} />)}
      </div>
    </div>
  );
}
