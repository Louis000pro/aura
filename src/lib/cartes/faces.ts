/* ─────────────────────────────────────────────────────────────────────
   LES FACES DES CARTES. Tout ce qui est gravé ou imprimé est dessiné ici,
   au canvas, en blanc sur noir, puis rangé dans les quatre canaux de tFx
   (R métal, G relief, B vernis, A encre). Une carte ne contient aucun
   chiffre de jeu : ni attaque, ni vie.

   ⚠️ Le canvas 2D n'a pas `font-variation-settings` : la largeur passe par
   le raccourci `font` (`900 expanded 170px Archivo`), après
   `document.fonts.load`.
   ⚠️ `ctx.filter` n'existe sur Safari que depuis la version 18 : `tracerFlou`
   prend le relais en réduisant puis en agrandissant l'image.
   ⚠️ Sur un appareil `perf-lite`, les textures passent à 75 % : les
   dessins restent écrits en coordonnées de 1024 × 1434.
   ───────────────────────────────────────────────────────────────────── */

import {
  DOSSIER, HAUTEUR_FACE as H, LARGEUR_FACE as W, LOGO_IRIS, LUEUR_FLAMME, MATIERES_FLAMME, MATIERES_RANG, MATIERES_RELAIS,
  MATIERE_DOS, MATIERE_MOUVEMENT, MATIERE_PROGRAMME,
  type FaceVoulue, type FicheDos, type PochetteVoulue,
} from "./matieres";
import type { Face } from "./moteur";

const NBSP = String.fromCharCode(160);

type Ctx = CanvasRenderingContext2D;
type Calque = { c: HTMLCanvasElement; x: Ctx };

function echelle(): number {
  return typeof document !== "undefined" && document.documentElement.classList.contains("perf-lite") ? 0.75 : 1;
}

function calque(): Calque {
  const k = echelle();
  const c = document.createElement("canvas");
  c.width = Math.round(W * k);
  c.height = Math.round(H * k);
  const x = c.getContext("2d", { willReadFrequently: true }) as Ctx;
  x.scale(k, k);
  x.fillStyle = "#000";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#fff";
  x.strokeStyle = "#fff";
  x.lineCap = "round";
  x.lineJoin = "round";
  return { c, x };
}

let cheminEtincelle: Path2D | null = null;
function etincelle(x: Ctx, cx: number, cy: number, r: number, plein = true) {
  cheminEtincelle ??= new Path2D("M12 1.5c.7 6.6 3.4 9.8 10.5 10.5-7.1.7-9.8 3.9-10.5 10.5C11.3 15.9 8.6 12.7 1.5 12 8.6 11.3 11.3 8.1 12 1.5z");
  x.save();
  x.translate(cx, cy);
  x.scale(r / 10.5, r / 10.5);
  x.translate(-12, -12);
  if (plein) x.fill(cheminEtincelle);
  else { x.lineWidth = 1.6; x.stroke(cheminEtincelle); }
  x.restore();
}

function rectRond(x: Ctx, a: number, b: number, w: number, h: number, r: number) {
  x.beginPath();
  x.moveTo(a + r, b);
  x.arcTo(a + w, b, a + w, b + h, r);
  x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r);
  x.arcTo(a, b, a + w, b, r);
  x.closePath();
}

/* Un cadre intérieur aux coins rentrants, façon gravure. */
function cadreCoins(x: Ctx, m: number, r: number) {
  const a = m, b = m, c = W - m, d = H - m;
  x.beginPath();
  x.moveTo(a + r, b);
  x.lineTo(c - r, b);
  x.arc(c, b, r, Math.PI, Math.PI / 2, true);
  x.lineTo(c, d - r);
  x.arc(c, d, r, -Math.PI / 2, Math.PI, true);
  x.lineTo(a + r, d);
  x.arc(a, d, r, 0, -Math.PI / 2, true);
  x.lineTo(a, b + r);
  x.arc(a, b, r, Math.PI / 2, 0, true);
  x.closePath();
}

function texte(x: Ctx, t: string, cx: number, y: number, o: { font: string; align?: CanvasTextAlign; ls?: number; max?: number }) {
  x.font = o.font;
  x.textAlign = o.align ?? "left";
  x.textBaseline = "alphabetic";
  if ("letterSpacing" in x) x.letterSpacing = `${o.ls ?? 0}px`;
  if (o.max) x.fillText(t, cx, y, o.max);
  else x.fillText(t, cx, y);
  if ("letterSpacing" in x) x.letterSpacing = "0px";
}

/* ── Les polices ──────────────────────────────────────────────────────
   next/font donne aux familles un nom haché : on lit celui que la page
   utilise vraiment, jamais « Archivo » en toutes lettres. */
let familles: { texte: string; chiffre: string } | null = null;
function lirePolices() {
  if (familles) return familles;
  const texteF = getComputedStyle(document.body).fontFamily || "sans-serif";
  const el = document.createElement("span");
  el.className = "vy-nombre";
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const chiffre = getComputedStyle(el).fontFamily || "monospace";
  el.remove();
  familles = { texte: texteF, chiffre };
  return familles;
}
const fT = (poids: number, taille: number, large = false) => `${poids} ${large ? "expanded " : ""}${taille}px ${lirePolices().texte}`;
const fC = (poids: number, taille: number) => `${poids} ${taille}px ${lirePolices().chiffre}`;

let pretes: Promise<unknown> | null = null;
export function polices(): Promise<unknown> {
  pretes ??= Promise.all([
    document.fonts.load(fT(900, 100, true), "BRONZÉ"),
    document.fonts.load(fT(800, 44, true), "LOUIS"),
    document.fonts.load(fT(800, 34), "Vaiiya"),
    document.fonts.load(fC(600, 30), "N° 071"),
    document.fonts.load(fC(500, 28), "2026"),
  ]).catch(() => null);
  return pretes;
}

/* Le titre, à la largeur voulue, sur une ou deux lignes. */
function titreAjuste(x: Ctx, t: string, yBas: number, largeur: number, max: number) {
  const lignes = t.split("\n");
  let s = max;
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  for (; s > 44; s -= 2) {
    x.font = fT(900, s, true);
    if (lignes.every((l) => x.measureText(l).width <= largeur)) break;
  }
  const pas = s * 1.04;
  lignes.forEach((l, i) => x.fillText(l, W / 2, yBas - (lignes.length - 1 - i) * pas));
  return s;
}

const CX = W / 2, CY = 640;
function anneau(x: Ctx, ray: number, ep: number, cy = CY) {
  x.lineWidth = ep;
  x.beginPath();
  x.arc(CX, cy, ray, 0, 7);
  x.stroke();
}
function graduer(x: Ctx, ray: number, n: number, long: number, ep: number, tous = 1, long2 = long * 1.8, cy = CY) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const l = i % tous === 0 ? long2 : long;
    x.lineWidth = i % tous === 0 ? ep * 1.5 : ep;
    x.beginPath();
    x.moveTo(CX + Math.cos(a) * ray, cy + Math.sin(a) * ray);
    x.lineTo(CX + Math.cos(a) * (ray + l), cy + Math.sin(a) * (ray + l));
    x.stroke();
  }
}

/* Les gravures célestes, une par rang : rien que des traits fins. */
function gravures(x: Ctx, id: string) {
  x.save();
  if (id === "bronze") {
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI + (i / 26) * Math.PI;
      const l = i % 2 ? 60 : 118;
      x.lineWidth = i % 2 ? 2 : 3;
      const cy2 = 1000;
      x.beginPath();
      x.moveTo(CX + Math.cos(a) * 452, cy2 + Math.sin(a) * 452);
      x.lineTo(CX + Math.cos(a) * (452 + l), cy2 + Math.sin(a) * (452 + l));
      x.stroke();
    }
  }
  if (id === "argent") { anneau(x, 428, 2.5); graduer(x, 434, 72, 12, 2, 6, 24); }
  if (id === "or") {
    anneau(x, 420, 3);
    anneau(x, 432, 1.6);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const l = i % 4 === 0 ? 130 : i % 2 === 0 ? 72 : 40;
      x.lineWidth = i % 4 === 0 ? 4 : 2;
      x.beginPath();
      x.moveTo(CX + Math.cos(a) * 442, CY + Math.sin(a) * 442);
      x.lineTo(CX + Math.cos(a) * (442 + l), CY + Math.sin(a) * (442 + l));
      x.stroke();
    }
  }
  if (id === "platine") {
    anneau(x, 420, 2);
    anneau(x, 440, 1.5);
    anneau(x, 462, 1.2);
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * 6.283;
      x.beginPath();
      x.arc(CX + Math.cos(a) * 451, CY + Math.sin(a) * 451, i % 15 === 0 ? 5 : 2, 0, 7);
      x.fill();
    }
  }
  if (id === "diamant") {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 - Math.PI / 2;
      const l = i % 2 ? 470 : 560;
      x.lineWidth = i % 2 ? 2 : 3;
      x.beginPath();
      x.moveTo(CX + Math.cos(a) * 420, CY + Math.sin(a) * 420);
      x.lineTo(CX + Math.cos(a) * l, CY + Math.sin(a) * l);
      x.stroke();
    }
    anneau(x, 420, 2.5);
  }
  if (id === "eternel") {
    anneau(x, 424, 3);
    x.lineWidth = 1.6;
    for (const [rx, ry, rot] of [[560, 180, -0.5], [600, 150, 0.55]]) {
      x.beginPath();
      x.ellipse(CX, CY, rx, ry, rot, 0, 7);
      x.stroke();
    }
    for (const [a, b, s] of [[150, 240, 22], [880, 230, 28], [120, 900, 18], [910, 860, 20], [240, 150, 12], [800, 330, 12]]) etincelle(x, a, b, s);
  }
  if (id === "soleil") { anneau(x, 410, 2.4); graduer(x, 420, 60, 18, 2, 5, 44); }
  if (id === "cercle") { anneau(x, 400, 2); anneau(x, 416, 1.2); }
  x.restore();
}

function coins(x: Ctx, n: number) {
  if (n < 2) return;
  const m = 66;
  for (let i = 0; i < 4; i++) {
    const cx = i % 2 ? W - m : m, cy = i < 2 ? m : H - m;
    if (n >= 5) etincelle(x, cx, cy, 16);
    else { x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill(); }
  }
}

function cadre(m: Ctx, n: number) {
  m.lineWidth = 20;
  rectRond(m, 10, 10, W - 20, H - 20, 42);
  m.stroke();
  m.lineWidth = 2.6;
  cadreCoins(m, 40, 26);
  m.stroke();
  coins(m, n);
}

/* Un calque flouté posé sur un autre. Sans `ctx.filter`, on réduit l'image
   puis on l'agrandit : un peu plus sec, jamais absent. */
function tracerFlou(hx: Ctx, src: HTMLCanvasElement, rayon: number, alpha: number) {
  hx.globalAlpha = alpha;
  const aFiltre: boolean = "filter" in hx;
  if (aFiltre) {
    hx.filter = `blur(${rayon}px)`;
    hx.drawImage(src, 0, 0);
    hx.filter = "none";
  } else {
    const d = Math.max(2, rayon * 1.3);
    const p = document.createElement("canvas");
    p.width = Math.ceil(src.width / d);
    p.height = Math.ceil(src.height / d);
    p.getContext("2d")?.drawImage(src, 0, 0, p.width, p.height);
    hx.imageSmoothingEnabled = true;
    hx.drawImage(p, 0, 0, src.width, src.height);
  }
  hx.globalAlpha = 1;
}

/* R métal, G relief, B vernis, A encre. */
function assembler(metal: Calque, vernis: Calque, encre: Calque, reliefExtra?: HTMLCanvasElement) {
  const w = metal.c.width, h = metal.c.height;
  const k = w / W;
  const relief = document.createElement("canvas");
  relief.width = w;
  relief.height = h;
  const hx = relief.getContext("2d", { willReadFrequently: true }) as Ctx;
  hx.fillStyle = "#000";
  hx.fillRect(0, 0, w, h);
  if (reliefExtra) hx.drawImage(reliefExtra, 0, 0, w, h);
  hx.globalCompositeOperation = reliefExtra ? "lighter" : "source-over";
  tracerFlou(hx, metal.c, 3.4 * k, 0.7);
  hx.globalCompositeOperation = "lighter";
  tracerFlou(hx, metal.c, 1.1 * k, 0.4);
  hx.globalCompositeOperation = "source-over";
  const a = metal.x.getImageData(0, 0, w, h).data;
  const b = hx.getImageData(0, 0, w, h).data;
  const c = vernis.x.getImageData(0, 0, w, h).data;
  const d = encre.x.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = a[i];
    data[i + 1] = b[i];
    data[i + 2] = c[i];
    data[i + 3] = d[i];
  }
  return { data, w, h };
}

type Pied = {
  titre: string;
  pips?: number;
  pipsPleins?: number;
  gauche?: string | null;
  droite?: string | null;
  yTitre?: number;
  largeur?: number;
  max?: number;
};

/* Le bas commun : le titre, le filet, les étincelles, le nom, la date. */
function pied(m: Ctx, e: Ctx, o: Pied) {
  const yNom = o.yTitre ?? 1228;
  titreAjuste(m, o.titre, yNom, o.largeur ?? 830, o.max ?? 176);
  const yF = 1276;
  m.lineWidth = 2;
  const n = o.pips ?? 0;
  if (n) {
    const dem = (n * 44) / 2 + 18;
    m.beginPath();
    m.moveTo(84, yF);
    m.lineTo(CX - dem, yF);
    m.moveTo(CX + dem, yF);
    m.lineTo(W - 84, yF);
    m.stroke();
    for (let i = 0; i < n; i++) etincelle(m, CX + (i - (n - 1) / 2) * 44, yF, 15, i < (o.pipsPleins ?? 0));
  } else {
    m.beginPath();
    m.moveTo(84, yF);
    m.lineTo(W - 84, yF);
    m.stroke();
  }
  // Un pseudo long se resserre : il ne vient jamais écrire sur la date.
  if (o.gauche) texte(m, o.gauche, 84, 1342, { font: fT(800, 44, true), ls: 5, max: o.droite ? 560 : 856 });
  if (o.droite) texte(e, o.droite, W - 84, 1340, { font: fC(500, 28), align: "right" });
}

function tete(e: Ctx, droite?: string | null) {
  etincelle(e, 98, 108, 16);
  texte(e, "Vaiiya", 122, 120, { font: fT(800, 34), ls: 0.4 });
  if (droite) texte(e, droite, W - 84, 120, { font: fC(600, 30), align: "right" });
}

const images = new Map<string, Promise<HTMLImageElement>>();
export function image(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => { images.delete(src); rej(new Error(`image ${src}`)); };
      i.src = src;
    });
    images.set(src, p);
  }
  return p;
}

/* Une aile du logo (public/marque/aile.svg), écrite ici pour ne dépendre
   d'aucune lecture : (0,1000) est la pointe basse, (779,0) le bout haut. */
let cheminAile: Path2D | null = null;
function aile(): Path2D {
  cheminAile ??= new Path2D("M0.0 1000.0L3.0 982.1L7.7 964.3L14.0 946.4L21.4 928.6L29.8 910.7L39.0 892.9L48.7 875.0L58.8 857.1L69.3 839.3L80.0 821.4L90.9 803.6L102.0 785.7L113.2 767.9L124.5 750.0L135.9 732.1L147.5 714.3L159.2 696.4L171.2 678.6L183.4 660.7L195.9 642.9L208.8 625.0L222.1 607.1L235.8 589.3L249.9 571.4L264.6 553.6L279.8 535.7L295.6 517.9L312.0 500.0L329.0 482.1L346.6 464.3L364.9 446.4L383.6 428.6L403.0 410.7L422.9 392.9L443.2 375.0L463.9 357.1L485.0 339.3L506.3 321.4L527.8 303.6L549.3 285.7L570.7 267.9L591.9 250.0L612.8 232.1L633.3 214.3L653.0 196.4L672.0 178.6L690.0 160.7L706.9 142.9L722.4 125.0L736.5 107.1L748.8 89.3L759.3 71.4L767.8 53.6L774.0 35.7L777.8 17.9L779.1 0.0L769.1 0.0L756.3 17.9L741.2 35.7L724.0 53.6L704.9 71.4L684.3 89.3L662.5 107.1L639.5 125.0L615.8 142.9L591.4 160.7L566.7 178.6L541.6 196.4L516.5 214.3L491.4 232.1L466.5 250.0L442.0 267.9L417.9 285.7L394.2 303.6L371.2 321.4L348.9 339.3L327.3 357.1L306.4 375.0L286.4 392.9L267.2 410.7L248.9 428.6L231.5 446.4L214.9 464.3L199.2 482.1L184.3 500.0L170.2 517.9L157.0 535.7L144.5 553.6L132.7 571.4L121.6 589.3L111.2 607.1L101.4 625.0L92.2 642.9L83.5 660.7L75.3 678.6L67.6 696.4L60.2 714.3L53.3 732.1L46.7 750.0L40.4 767.9L34.4 785.7L28.8 803.6L23.6 821.4L18.6 839.3L14.1 857.1L9.9 875.0L6.3 892.9L3.2 910.7L0.8 928.6L0.0 946.4L0.0 964.3L0.0 982.1L0.0 1000.0Z");
  return cheminAile;
}
function dessinerAile(x: Ctx, px: number, py: number, h: number, angle = 0, miroir = false) {
  const k = h / 1000;
  x.save();
  x.translate(px, py);
  x.rotate(angle);
  if (miroir) x.scale(-1, 1);
  x.scale(k, k);
  x.translate(0, -1000);
  x.fill(aile());
  x.restore();
}
function logoV(x: Ctx, px: number, py: number, h: number) {
  dessinerAile(x, px, py, h, 0, false);
  dessinerAile(x, px, py, h, 0, true);
  x.beginPath();
  x.arc(px, py + h * 0.065, h * 0.036, 0, 7);
  x.fill();
}

/* ── Le rang ── */
export async function rang(id: string, d: { pseudo?: string; numero?: number | null; date?: string | null }): Promise<Face> {
  const r = MATIERES_RANG.find((x) => x.id === id) ?? MATIERES_RANG[0];
  const [art, emblem] = await Promise.all([image(r.art), image(r.em), polices()]);
  const metal = calque(), vernis = calque(), encre = calque();
  cadre(metal.x, r.n);
  gravures(metal.x, r.id);
  pied(metal.x, encre.x, { titre: r.nom.toUpperCase(), pips: 6, pipsPleins: r.n, gauche: (d.pseudo ?? "").toUpperCase(), droite: d.date });
  tete(encre.x, d.numero != null ? `N°${NBSP}${String(d.numero).padStart(3, "0")}` : null);
  const eh = 0.615, ew = eh * 1.4 * (680 / 1040);
  return { art, emblem, fx: assembler(metal, vernis, encre), m: r.m, lueur: r.lueur, encre: r.encre, f: r.f, ir: r.ir, emG: r.emG, emB: [0.5 - ew / 2, 0.438 - eh / 2, ew, eh] };
}

/* ── Le dos, le même pour toutes les cartes ── */
export async function dos(fiche: FicheDos | null): Promise<Face> {
  const [art] = await Promise.all([image(`${DOSSIER}art-dos.webp`), polices()]);
  const metal = calque(), vernis = calque(), encre = calque();
  const m = metal.x, v = vernis.x;
  m.lineWidth = 20;
  rectRond(m, 10, 10, W - 20, H - 20, 42);
  m.stroke();
  m.lineWidth = 2.6;
  cadreCoins(m, 40, 26);
  m.stroke();
  m.lineWidth = 1.6;
  cadreCoins(m, 54, 26);
  m.stroke();
  coins(m, 5);
  const cy = fiche ? 470 : CY + 66;
  const k = fiche ? 0.8 : 1;
  // L'éventail du logo, en vernis : on ne le voit que dans la lumière.
  v.fillStyle = "rgba(255,255,255,.3)";
  for (let i = -6; i <= 6; i++) {
    const a = i * 0.2;
    dessinerAile(v, CX, cy + 150 * k, 540 * k, a, false);
    dessinerAile(v, CX, cy + 150 * k, 540 * k, -a, true);
  }
  anneau(m, 318 * k, 2.4, cy);
  anneau(m, 330 * k, 1.2, cy);
  graduer(m, 338 * k, 96, 14 * k, 1.8, 8, 40 * k, cy);
  anneau(m, 400 * k, 1.4, cy);
  logoV(m, CX, cy + 122 * k, 340 * k);
  for (let i = 0; i < 4; i++) etincelle(m, CX + Math.cos(i * 1.5708 + 0.785) * 400 * k, cy + Math.sin(i * 1.5708 + 0.785) * 400 * k, 18 * k);
  if (fiche) {
    titreAjuste(m, fiche.pseudo.toUpperCase(), 1010, 700, 84);
    texte(encre.x, fiche.ligne, CX, 1064, { font: fT(600, 34), align: "center", max: 860 });
    const faits = fiche.faits;
    faits.forEach(([val, lib], i) => {
      const x = CX + (i - (faits.length - 1) / 2) * 280;
      texte(m, String(val), x, 1190, { font: fC(600, 66), align: "center", max: 260 });
      texte(encre.x, lib, x, 1240, { font: fT(600, 30), align: "center", max: 260 });
    });
    texte(encre.x, fiche.pied, CX, 1336, { font: fC(500, 26), align: "center" });
  } else {
    texte(m, "VAIIYA", CX + 8, 1250, { font: fT(800, 54, true), align: "center", ls: 16 });
  }
  return { art, emblem: null, fx: assembler(metal, vernis, encre), m: MATIERE_DOS.m, lueur: MATIERE_DOS.lueur, encre: MATIERE_DOS.encre, f: MATIERE_DOS.f, par: 0.7 };
}

/* ── La pochette scellée : un film sombre et froissé, le logo en métal ── */
export async function pochette(o: PochetteVoulue): Promise<Face> {
  const [art, froisse] = await Promise.all([image(o.art), image(`${DOSSIER}froisse.webp`), polices()]);
  const metal = calque(), vernis = calque(), encre = calque();
  const m = metal.x;
  logoV(m, CX, 760, 400);
  texte(m, "VAIIYA", CX + 8, 985, { font: fT(800, 54, true), align: "center", ls: 16 });
  m.lineWidth = 3;
  m.beginPath();
  m.moveTo(0, 150);
  m.lineTo(W, 150);
  m.moveTo(0, H - 150);
  m.lineTo(W, H - 150);
  m.stroke();
  for (let i = 0; i < o.etoiles; i++) etincelle(m, CX + (i - (o.etoiles - 1) / 2) * 46, 1062, 15);
  const rel = document.createElement("canvas");
  rel.width = W;
  rel.height = H;
  const rx = rel.getContext("2d") as Ctx;
  if ("filter" in rx) rx.filter = "blur(1.6px) contrast(.8)";
  rx.drawImage(froisse, 0, 0, W, H);
  if ("filter" in rx) rx.filter = "none";
  for (const [y0, y1] of [[0, 96], [H - 96, H]]) {
    for (let y = y0; y < y1; y += 12) {
      rx.fillStyle = (y / 12) % 2 ? "#fff" : "#000";
      rx.fillRect(0, y, W, 6);
    }
  }
  return { art, emblem: null, fx: assembler(metal, vernis, encre, rel), m: o.m, lueur: o.lueur, encre: o.encre, f: [o.iris, 0, 0, 0], ir: o.ir, par: 0, froisse: 1, coin: 0 };
}

/* ── Une flamme ── */
export async function flamme(v: Extract<FaceVoulue, { genre: "flamme" }>): Promise<Face> {
  const r = MATIERES_FLAMME[v.flamme];
  const [art, emblem] = await Promise.all([image(`${DOSSIER}art-flamme.webp`), image(`${DOSSIER}em-flamme-${v.flamme}.webp`), polices()]);
  const metal = calque(), vernis = calque(), encre = calque();
  cadre(metal.x, r.n);
  gravures(metal.x, "soleil");
  pied(metal.x, encre.x, { titre: v.nom.toUpperCase(), pips: 5, pipsPleins: r.n, gauche: (v.pseudo ?? "").toUpperCase(), droite: v.date });
  tete(encre.x, `${v.jours}${NBSP}${v.jours > 1 ? "jours" : "jour"}`);
  const ew = 0.62, eh = (ew * (816 / 680)) / 1.4;
  return { art, emblem, fx: assembler(metal, vernis, encre), m: r.m, lueur: LUEUR_FLAMME, encre: "#FFEFD8", f: [0, 0.22, 0.3, 0], emB: [0.5 - ew / 2, 0.43 - eh / 2, ew, eh], emL: 0.35 };
}

/* ── Un programme terminé, avec le Guide choisi ── */
export async function programme(v: Extract<FaceVoulue, { genre: "programme" }>): Promise<Face> {
  const [art, emblem] = await Promise.all([image(`${DOSSIER}art-programme.webp`), v.pose ? image(v.pose) : Promise.resolve(null), polices()]);
  const metal = calque(), vernis = calque(), encre = calque();
  cadre(metal.x, 3);
  gravures(metal.x, "cercle");
  // Sans Guide à montrer (la carte d'un autre membre), le logo tient sa place.
  if (!v.pose) logoV(metal.x, CX, 640, 420);
  pied(metal.x, encre.x, { titre: v.titre, gauche: (v.pseudo ?? "").toUpperCase(), droite: v.date, max: 112, largeur: 840, yTitre: 1246 });
  tete(encre.x, v.duree);
  const ew = 0.86, eh = emblem ? (ew * (emblem.naturalHeight / emblem.naturalWidth)) / 1.4 : 1;
  const P = MATIERE_PROGRAMME;
  return { art, emblem, fx: assembler(metal, vernis, encre), m: P.m, lueur: P.lueur, encre: P.encre, f: P.f, ir: LOGO_IRIS, emB: [0.5 - ew / 2, 0.06, ew, eh], emF: 0.66, emL: 0, scrim: 0.82 };
}

/* ── Un relais gagné à deux ── */
export async function relais(v: Extract<FaceVoulue, { genre: "relais" }>): Promise<Face> {
  const o = MATIERES_RELAIS[v.serie] ?? MATIERES_RELAIS.sillage;
  const [art] = await Promise.all([image(`${DOSSIER}art-relais-${v.serie}.webp`), polices()]);
  const metal = calque(), vernis = calque(), encre = calque();
  cadre(metal.x, 4);
  pied(metal.x, encre.x, { titre: v.nom.toUpperCase(), gauche: v.duo, droite: v.date, yTitre: 1226 });
  tete(encre.x, v.rang);
  return { art, emblem: null, fx: assembler(metal, vernis, encre), m: o.m, lueur: "#FFD98A", encre: "#FFF7E6", f: [0.5, 0.16, 0, 0], ir: o.ir, lum: 0.85, par: 1.4, scrim: 0.5 };
}

/* ── Un mouvement : mat, numéroté, la carte joue son geste ── */
export async function mouvement(v: Extract<FaceVoulue, { genre: "mouvement" }>): Promise<Face> {
  const [art, emblem] = await Promise.all([image(`${DOSSIER}art-mouvement.webp`), image(v.sprite), polices()]);
  const metal = calque(), vernis = calque(), encre = calque();
  metal.x.lineWidth = 14;
  rectRond(metal.x, 7, 7, W - 14, H - 14, 44);
  metal.x.stroke();
  pied(metal.x, encre.x, { titre: v.titre, max: 112, largeur: 830 });
  texte(encre.x, v.muscles, 84, 1336, { font: fT(600, 32), max: v.date ? 620 : 856 });
  if (v.date) texte(encre.x, v.date, W - 84, 1336, { font: fC(500, 28), align: "right" });
  tete(encre.x, v.numero);
  const ew = 1.02, eh = ew / 1.4;
  const M = MATIERE_MOUVEMENT;
  return { art, emblem, fx: assembler(metal, vernis, encre), m: M.m, lueur: M.lueur, encre: M.encre, f: M.f, emB: [0.5 - ew / 2, 0.1, ew, eh], emL: 0, par: 0.6 };
}

export function fabriquer(v: FaceVoulue): Promise<Face> {
  switch (v.genre) {
    case "rang": return rang(v.rang, v);
    case "flamme": return flamme(v);
    case "programme": return programme(v);
    case "relais": return relais(v);
    case "mouvement": return mouvement(v);
  }
}
