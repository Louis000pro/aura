/* ─────────────────────────────────────────────────────────────────────
   LA CARTE VIVANTE. Un seul contexte WebGL à l'écran : tout le reste de
   la collection est fait d'images cuites par le même moteur.

   Elle se penche au doigt, à la souris et, sur Android, quand on bouge le
   téléphone (sur iPhone, Safari demanderait une permission : on ne la
   demande pas pour un reflet). Au repos elle dérive doucement. En
   mouvement réduit elle se tient de biais, et le doigt la penche encore.

   Écrit en style dans une boucle d'images, jamais en état React.

   ⚠️ La définition baisse toute seule si l'appareil peine.
   ⚠️ `detruire()` rend le contexte tout de suite : un navigateur n'en
   garde qu'une poignée.
   ───────────────────────────────────────────────────────────────────── */

import { MoteurCarte, type FacePreparee } from "./moteur";
import { dos, fabriquer, image, pochette } from "./faces";
import type { Face } from "./moteur";
import type { CarteDef } from "./catalogue";
import type { PochetteVoulue } from "./matieres";

const MAX_FACES = 7;
const TILT_REPOS = { x: -0.2, y: -0.15 };

export type PreparationCarte = { avant: FacePreparee; arriere: FacePreparee; neutre: FacePreparee };

export class CarteLive {
  private readonly el: HTMLElement;
  private readonly pivot: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly k: MoteurCarte;
  private readonly reduit: boolean;
  private readonly cache = new Map<string, Promise<FacePreparee>>();
  private readonly ro: ResizeObserver;
  private raf = 0;
  private cx = 0;
  private cy = 0;
  private tx = 0;
  private ty = 0;
  private rot = 0;
  private rotC = 0;
  private main = false;
  private survol = false;
  private incline: { x: number; y: number } | null = null;
  private t0 = Math.random() * 10;
  private dpr: number;
  private lentes = 0;
  private dernier = 0;
  private id: string | null = null;
  private faceA: FacePreparee | null = null;
  private faceB: FacePreparee | null = null;
  private dosVisible = false;
  private anim: { tex: WebGLTexture[]; i: number; t: number } | null = null;
  private debut: { x: number; y: number; t: number } | null = null;
  private fini = false;
  onTap: (() => void) | null = null;

  constructor(el: HTMLElement, pivot: HTMLElement, canvas: HTMLCanvasElement) {
    this.el = el;
    this.pivot = pivot;
    this.canvas = canvas;
    this.k = new MoteurCarte(canvas);
    this.reduit = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const lite = document.documentElement.classList.contains("perf-lite");
    this.dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2.5);
    el.addEventListener("pointerdown", this.surAppui);
    el.addEventListener("pointermove", this.surMouvement);
    el.addEventListener("pointerup", this.surLacher);
    el.addEventListener("pointercancel", this.surQuitter);
    el.addEventListener("pointerleave", this.surQuitter);
    window.addEventListener("deviceorientation", this.surOrientation);
    canvas.addEventListener("webglcontextlost", this.surPerte);
    this.ro = new ResizeObserver(() => this.taille());
    this.ro.observe(el);
    this.taille();
    this.raf = requestAnimationFrame(this.boucle);
  }

  /* ── Les gestes ── */

  private suivre(e: PointerEvent) {
    const b = this.el.getBoundingClientRect();
    this.cx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width) * 2 - 1));
    this.cy = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height) * 2 - 1));
  }

  private surAppui = (e: PointerEvent) => {
    this.main = true;
    this.debut = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.suivre(e);
  };

  private surMouvement = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || this.main) {
      this.survol = true;
      this.suivre(e);
    }
  };

  private surLacher = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") { this.main = false; this.survol = false; }
    const d = this.debut;
    this.debut = null;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && performance.now() - d.t < 350) this.onTap?.();
  };

  private surQuitter = () => {
    this.main = false;
    this.survol = false;
  };

  private surOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    // Tenu droit devant soi : beta autour de 45°, gamma autour de 0.
    this.incline = {
      x: Math.max(-1, Math.min(1, e.gamma / 25)),
      y: Math.max(-1, Math.min(1, (e.beta - 45) / 35 - 0.16)),
    };
  };

  private surPerte = () => {
    // La carte retombe sur son image cuite, posée dessous.
    this.canvas.style.opacity = "0";
    this.fini = true;
  };

  /* ── La taille ── */

  private taille() {
    const r = this.el.getBoundingClientRect();
    if (r.width < 10) return;
    const w = Math.round(r.width * this.dpr), h = Math.round(w * 1.4);
    if (this.canvas.width !== w) {
      this.canvas.width = w;
      this.canvas.height = h;
      // Changer la taille vide le tampon : on redessine sans attendre l'image suivante.
      if (this.k.active) this.k.dessiner(this.tx, this.ty, performance.now() / 1000);
    }
  }

  /* ── Les faces ── */

  private prep(cle: string, fab: () => Promise<Face>): Promise<FacePreparee> {
    const dejaLa = this.cache.get(cle);
    if (dejaLa) {
      this.cache.delete(cle);
      this.cache.set(cle, dejaLa);
      return dejaLa;
    }
    const p = fab().then((f) => this.k.preparer(f));
    this.cache.set(cle, p);
    p.catch(() => this.cache.delete(cle));
    if (this.cache.size > MAX_FACES) {
      const vieux = this.cache.keys().next().value as string;
      const v = this.cache.get(vieux);
      this.cache.delete(vieux);
      void v?.then((x) => { if (this.k.active !== x && x !== this.faceA && x !== this.faceB) this.k.liberer(x); }).catch(() => {});
    }
    return p;
  }

  private faceAvant(c: CarteDef) { return this.prep(`av:${c.id}:${JSON.stringify(c.face)}`, () => fabriquer(c.face)); }
  private faceArriere(c: CarteDef) { return this.prep(`ar:${c.id}:${JSON.stringify(c.fiche)}`, () => dos(c.fiche)); }

  /** Montre une carte. Rend `false` si elle n'a pas pu se dessiner. */
  async montrer(c: CarteDef): Promise<boolean> {
    this.id = c.id;
    let a: FacePreparee, b: FacePreparee;
    try {
      [a, b] = await Promise.all([this.faceAvant(c), this.faceArriere(c)]);
    } catch (e) {
      console.warn("[cartes] face impossible à dessiner :", e);
      return false;
    }
    if (this.id !== c.id || this.fini) return false;
    this.faceA = a;
    this.faceB = b;
    this.rot = this.rotC = 0;
    this.dosVisible = false;
    this.k.activer(a);
    this.taille();
    this.finAnim();
    if (c.poses && !this.reduit) {
      const poses = await Promise.all(c.poses.map(async (s) => this.k.texture(await image(s), true))).catch(() => null);
      if (poses) {
        if (this.id === c.id && !this.fini) this.anim = { tex: poses, i: 0, t: 0 };
        else poses.forEach((x) => this.k.gl.deleteTexture(x));
      }
    }
    return true;
  }

  private finAnim() {
    if (this.anim) this.anim.tex.forEach((x) => this.k.gl.deleteTexture(x));
    this.anim = null;
  }

  /** La pochette scellée. */
  async pochette(v: PochetteVoulue): Promise<boolean> {
    this.id = "pochette";
    let p: FacePreparee;
    try {
      p = await this.prep(`po:${v.art}`, () => pochette(v));
    } catch (e) {
      console.warn("[cartes] pochette impossible à dessiner :", e);
      return false;
    }
    if (this.fini) return false;
    this.faceA = this.faceB = null;
    this.dosVisible = false;
    this.finAnim();
    this.k.activer(p);
    this.rot = this.rotC = 0;
    this.taille();
    return true;
  }

  /** Tout ce que la révélation va montrer, prêt avant de toucher : l'ouverture n'attend pas. */
  async preparer(c: CarteDef): Promise<PreparationCarte> {
    const [avant, arriere, neutre] = await Promise.all([
      this.faceAvant(c), this.faceArriere(c), this.prep("dos", () => dos(null)),
    ]);
    return { avant, arriere, neutre };
  }

  /** La carte telle qu'elle est à cet instant, sur un canvas 2D. */
  photographier(): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    // Sans `preserveDrawingBuffer`, on dessine et on lit dans la même tâche.
    this.k.dessiner(this.tx, this.ty, performance.now() / 1000);
    c.getContext("2d")?.drawImage(this.canvas, 0, 0);
    return c;
  }

  /** Après la déchirure : la carte, dos tourné, encore neutre. */
  sortirDeLaPochette(c: CarteDef, p: PreparationCarte) {
    this.id = c.id;
    this.faceA = p.avant;
    this.faceB = p.neutre;
    this.rot = this.rotC = 180;
    this.dosVisible = true;
    this.k.activer(p.neutre);
    this.taille();
  }

  /** Le retournement : la fiche prend la place du dos neutre, pour la suite. */
  reveler(p: PreparationCarte) {
    this.faceB = p.arriere;
    this.retourner();
    this.eclair();
  }

  retourner() {
    this.rotC += 180;
    if (this.reduit) this.rot = this.rotC;
  }

  private eclair() {
    if (this.reduit) return;
    const t0 = performance.now();
    const pas = (t: number) => {
      if (this.fini) return;
      const a = (t - t0) / 900;
      this.k.flash = a >= 1 ? 0 : Math.max(0, a);
      if (a < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  /* ── La boucle ── */

  private boucle = (t: number) => {
    this.raf = requestAnimationFrame(this.boucle);
    if (this.fini || !this.k.active || !this.el.isConnected || document.hidden) return;
    const s = t / 1000;
    // La cadence : on baisse la définition si l'appareil peine.
    if (this.dernier) {
      const dt = t - this.dernier;
      this.lentes = dt > 34 ? this.lentes + 1 : Math.max(0, this.lentes - 1);
      if (this.lentes > 40 && this.dpr > 1) {
        this.dpr = Math.max(1, this.dpr - 0.5);
        this.lentes = 0;
        this.taille();
      }
    }
    this.dernier = t;
    if (!this.main && !this.survol) {
      if (this.incline) { this.cx = this.incline.x; this.cy = this.incline.y; }
      else if (this.reduit) { this.cx = TILT_REPOS.x; this.cy = TILT_REPOS.y; }
      else {
        this.cx = Math.sin(s * 0.62 + this.t0) * 0.42;
        this.cy = Math.sin(s * 0.84 + this.t0 * 1.3) * 0.3;
      }
    }
    this.tx += (this.cx - this.tx) * 0.12;
    this.ty += (this.cy - this.ty) * 0.12;
    this.rot += (this.rotC - this.rot) * 0.11;
    if (Math.abs(this.rotC - this.rot) < 0.05) this.rot = this.rotC;
    const r = ((this.rot % 360) + 360) % 360;
    const dosVu = r > 90 && r < 270;
    if (this.faceA && this.faceB && dosVu !== this.dosVisible) {
      this.dosVisible = dosVu;
      this.k.activer(dosVu ? this.faceB : this.faceA);
    }
    if (this.anim && !dosVu && t - this.anim.t > 820) {
      const A = this.anim;
      A.t = t;
      A.i = (A.i + 1) % A.tex.length;
      this.k.poserEmbleme(A.tex[A.i]);
    }
    const aff = dosVu ? r - 180 : r > 180 ? r - 360 : r;
    this.pivot.style.transform = `rotateY(${(aff + this.tx * 13).toFixed(2)}deg) rotateX(${(-this.ty * 11).toFixed(2)}deg)`;
    const sw = Math.sin((aff * Math.PI) / 180);
    this.k.dessiner(this.tx + sw * 1.4, this.ty, s);
  };

  detruire() {
    this.fini = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    const el = this.el;
    el.removeEventListener("pointerdown", this.surAppui);
    el.removeEventListener("pointermove", this.surMouvement);
    el.removeEventListener("pointerup", this.surLacher);
    el.removeEventListener("pointercancel", this.surQuitter);
    el.removeEventListener("pointerleave", this.surQuitter);
    window.removeEventListener("deviceorientation", this.surOrientation);
    this.canvas.removeEventListener("webglcontextlost", this.surPerte);
    this.onTap = null;
    this.k.detruire();
  }
}
