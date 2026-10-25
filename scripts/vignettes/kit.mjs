/* Kit de dessin des icônes Vaiiya.
   Style calé sur Fluent Emoji « Color » (Microsoft, licence MIT) : viewBox 32,
   pas de contour, volumes en dégradés doux, lumière en haut à gauche, un
   reflet chaud ou froid sur le bord selon la matière. */

const f = (n) => +n.toFixed(2);

/* ── Matières : hi (lumière), mid, lo (ombre), rim (reflet de bord) ── */
export const M = {
  acier: { hi: "#FBFAFF", mid: "#C9C3D6", lo: "#8C8399", rim: "#6E6680", rimOp: 0.55 },
  acierSombre: { hi: "#D8D2E3", mid: "#9C93AD", lo: "#665D78", rim: "#4B4360", rimOp: 0.6 },
  fonte: { hi: "#7A7290", mid: "#3D3850", lo: "#1F1B2B", rim: "#120F1C", rimOp: 0.7 },
  bois: { hi: "#F6C98E", mid: "#D99350", lo: "#A8642B", rim: "#8C4C1E", rimOp: 0.55 },
  boisFonce: { hi: "#C48A5C", mid: "#8C5230", lo: "#5A2E16", rim: "#3E1C0B", rimOp: 0.6 },
  ceramique: { hi: "#FFFFFF", mid: "#F2EEF7", lo: "#D2CADE", rim: "#B3A9C4", rimOp: 0.55 },
  creme: { hi: "#FFFFFF", mid: "#FFF6E5", lo: "#EEDCBC", rim: "#D7BC93", rimOp: 0.5 },
  blancFroid: { hi: "#FFFFFF", mid: "#F5F3EC", lo: "#DCD6C6", rim: "#BDB6A2", rimOp: 0.5 },
  vert: { hi: "#A6E37E", mid: "#4DB33B", lo: "#2C8530", rim: "#1D6526", rimOp: 0.55 },
  vertVif: { hi: "#C4F07A", mid: "#6BC93A", lo: "#3C9A2B", rim: "#2A7A24", rimOp: 0.5 },
  vertFonce: { hi: "#79C46B", mid: "#2F8A3E", lo: "#1A5C2B", rim: "#0F4321", rimOp: 0.6 },
  vertClair: { hi: "#F5FFD0", mid: "#D6EE8E", lo: "#A9CD5B", rim: "#8BB443", rimOp: 0.45 },
  vertGris: { hi: "#D7E6CB", mid: "#9DB78F", lo: "#6E8B62", rim: "#56704C", rimOp: 0.5 },
  olive: { hi: "#D5E58C", mid: "#8FAF3A", lo: "#5E7D1E", rim: "#465F12", rimOp: 0.55 },
  oliveFonce: { hi: "#AFC27A", mid: "#6F8C3A", lo: "#46601F", rim: "#344A14", rimOp: 0.55 },
  jaune: { hi: "#FFF7A8", mid: "#FFD43B", lo: "#E8A41C", rim: "#D5821B", rimOp: 0.5 },
  moutarde: { hi: "#FFF08A", mid: "#F2C318", lo: "#C99106", rim: "#A87406", rimOp: 0.5 },
  dore: { hi: "#FFF3A6", mid: "#F2C33A", lo: "#C98A14", rim: "#A86A0C", rimOp: 0.5 },
  huile: { hi: "#FAF7A0", mid: "#DCCB34", lo: "#9E9014", rim: "#7C700A", rimOp: 0.5 },
  ambre: { hi: "#FFD38A", mid: "#E0862A", lo: "#A8500F", rim: "#843A08", rimOp: 0.55 },
  orange: { hi: "#FFC56E", mid: "#FB8D26", lo: "#D75A12", rim: "#B8410C", rimOp: 0.5 },
  rouge: { hi: "#FF9C8A", mid: "#EE4433", lo: "#B9222C", rim: "#951632", rimOp: 0.5 },
  rose: { hi: "#FFE0DC", mid: "#F7A6A6", lo: "#DC707E", rim: "#C2566A", rimOp: 0.5 },
  saumon: { hi: "#FFD0AC", mid: "#FF9467", lo: "#E1613F", rim: "#C24A33", rimOp: 0.5 },
  beige: { hi: "#FFF3DA", mid: "#EDCF9E", lo: "#C99D62", rim: "#AB7F45", rimOp: 0.5 },
  kraft: { hi: "#F7DDB0", mid: "#DDAE6E", lo: "#AE7A3D", rim: "#8E5F2A", rimOp: 0.5 },
  brun: { hi: "#E2A774", mid: "#A9632F", lo: "#6E3A17", rim: "#53280C", rimOp: 0.55 },
  cannelle: { hi: "#EDAF7A", mid: "#BC6D38", lo: "#83431B", rim: "#64300F", rimOp: 0.55 },
  chocolat: { hi: "#9A6750", mid: "#5F3627", lo: "#3A1E14", rim: "#28120B", rimOp: 0.6 },
  violet: { hi: "#E2A6F0", mid: "#A452C6", lo: "#6B2C8F", rim: "#521F70", rimOp: 0.55 },
  magenta: { hi: "#F582B4", mid: "#BF2563", lo: "#7E1241", rim: "#5E0B31", rimOp: 0.55 },
  noir: { hi: "#6F6670", mid: "#2F292F", lo: "#141014", rim: "#080608", rimOp: 0.6 },
  eau: { hi: "#FFFFFF", mid: "#D9F1FF", lo: "#A7D2F2", rim: "#7DB6E6", rimOp: 0.5 },
  verre: { hi: "#FFFFFF", mid: "#E2F6FF", lo: "#BBDDF5", rim: "#93C3E8", rimOp: 0.45 },
  soja: { hi: "#9A5636", mid: "#4E2615", lo: "#2A120A", rim: "#1A0A05", rimOp: 0.6 },
  vin: { hi: "#D35A6C", mid: "#86203A", lo: "#4E0C1F", rim: "#360616", rimOp: 0.6 },
  peau: { hi: "#FFE3C7", mid: "#F2BE92", lo: "#D18B5C", rim: "#B66E45", rimOp: 0.5 },
  lilas: { hi: "#F1E6FF", mid: "#C7B2EE", lo: "#977BCB", rim: "#7A5DB0", rimOp: 0.5 },
  bleu: { hi: "#B9E3FF", mid: "#4FA6EF", lo: "#2A6CC4", rim: "#1D53A0", rimOp: 0.55 },
};

/* Matière décalée vers une autre teinte : utile pour décliner sans tout réécrire. */
export function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/* ── Géométrie ── */
export function rot([x, y], deg, [cx, cy] = [0, 0]) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}

/* Courbe lisse passant par des points (Catmull-Rom → Bézier). */
export function lisse(pts, ferme = true, k = 1 / 6) {
  const n = pts.length;
  const P = (i) => (ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const fin = ferme ? n : n - 1;
  for (let i = 0; i < fin; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (ferme ? "Z" : "");
}

/* Polygone aux angles arrondis (rayon r). */
export function arrondi(pts, r = 1) {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const p1 = [b[0] + (v1[0] / l1) * rr, b[1] + (v1[1] / l1) * rr];
    const p2 = [b[0] + (v2[0] / l2) * rr, b[1] + (v2[1] / l2) * rr];
    d += `${i ? "L" : "M"}${f(p1[0])} ${f(p1[1])}Q${f(b[0])} ${f(b[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

/* Ellipse (éventuellement tournée) en chemin. */
export function ell(cx, cy, rx, ry, deg = 0) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(rot([cx + rx * Math.cos(a), cy + ry * Math.sin(a)], deg, [cx, cy]));
  }
  return lisse(pts, true, 0.168);
}

/* Capsule entre deux points (bâton, tige, manche). */
export function capsule(x1, y1, x2, y2, r1, r2 = r1) {
  const a = Math.atan2(y2 - y1, x2 - x1), n = [-Math.sin(a), Math.cos(a)];
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = Math.PI / 2 + (i / 8) * Math.PI;
    pts.push([x1 + r1 * Math.cos(a + t), y1 + r1 * Math.sin(a + t)]);
  }
  for (let i = 0; i <= 8; i++) {
    const t = -Math.PI / 2 + (i / 8) * Math.PI;
    pts.push([x2 + r2 * Math.cos(a + t), y2 + r2 * Math.sin(a + t)]);
  }
  void n;
  return lisse(pts, true, 0.12);
}

/* Feuille : base en (x, y), pointe dans la direction `deg` (0 = vers le haut).
   largeur max à la fraction `ventre` de la longueur ; `dents` crée une bordure dentée. */
export function feuille({ x = 0, y = 0, L = 10, W = 4, deg = 0, ventre = 0.4, rond = 0.9, dents = 0, prof = 0.18, pointe = 0.06, n = 44, plie = 0 }) {
  const a = Math.log(0.5) / Math.log(ventre);
  const cote = (s) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let h = (W / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, a)), rond);
      if (t > 1 - pointe) h *= (1 - t) / pointe;
      if (dents && t > 0.08 && t < 0.97) {
        const u = (t * dents) % 1;
        h *= 1 - prof * (u < 0.75 ? u / 0.75 : (1 - u) / 0.25);
      }
      const courbe = plie * Math.sin(Math.PI * t) * L * 0.12;
      pts.push([s * h + courbe, -t * L]);
    }
    return pts;
  };
  const d = cote(1), g = cote(-1).reverse();
  const pts = [...d, ...g.slice(1, -1)].map((p) => rot([p[0] + x, p[1] + y], deg, [x, y]));
  return lisse(pts, true, 0.16);
}

/* Nervure centrale d'une feuille (même paramètres de position). */
export function nervure({ x = 0, y = 0, L = 10, deg = 0, plie = 0, de = 0.05, a = 0.8 }) {
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = de + ((a - de) * i) / 6;
    pts.push(rot([x + plie * Math.sin(Math.PI * t) * L * 0.12, y - t * L], deg, [x, y]));
  }
  return lisse(pts, false);
}

/* Boîte isométrique : coin bas-avant en (x, y). Rend les trois faces. */
export function boite(x, y, l, p, h, r = 0.7) {
  const R = [0.866 * l, -0.5 * l], G = [-0.866 * p, -0.5 * p];
  const B0 = [x, y], B1 = [x + R[0], y + R[1]], B2 = [x + G[0], y + G[1]];
  const T0 = [x, y - h], T1 = [B1[0], B1[1] - h], T2 = [B2[0], B2[1] - h], T3 = [x + R[0] + G[0], y + R[1] + G[1] - h];
  return {
    dessus: arrondi([T0, T1, T3, T2], r),
    droite: arrondi([B0, B1, T1, T0], r),
    gauche: arrondi([B0, T0, T2, B2], r),
    sommets: { B0, B1, B2, T0, T1, T2, T3 },
  };
}

/* ── Contexte d'un dessin ── */
export class Dessin {
  constructor(nom) {
    this.p = nom.replace(/[^a-z0-9]/gi, "").slice(0, 10);
    this.k = 0;
    this.defs = [];
    this.out = [];
  }
  id() { return `${this.p}${++this.k}`; }
  stops(st) {
    return st.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ""}/>`).join("");
  }
  rad(st, { cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy, user = false, tf } = {}) {
    const id = this.id();
    this.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}"${user ? ' gradientUnits="userSpaceOnUse"' : ""}${tf ? ` gradientTransform="${tf}"` : ""}>${this.stops(st)}</radialGradient>`);
    return `url(#${id})`;
  }
  lin(st, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, user = false } = {}) {
    const id = this.id();
    this.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${user ? ' gradientUnits="userSpaceOnUse"' : ""}>${this.stops(st)}</linearGradient>`);
    return `url(#${id})`;
  }
  flou(sd) {
    const id = this.id();
    this.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${sd}"/></filter>`);
    return `url(#${id})`;
  }
  clip(d) {
    const id = this.id();
    this.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    return `url(#${id})`;
  }
  path(d, fill, extra = "") { this.out.push(`<path d="${d}" fill="${fill}"${extra}/>`); return this; }
  /* Volume : dégradé principal (lumière en lx, ly) + reflet de bord. */
  vol(d, m, { lx = 0.3, ly = 0.22, r = 1, rim = true, rimOp = m.rimOp ?? 0.55, rimR = 0.68, rimCx = 0.5, rimCy = 0.42, extra = "" } = {}) {
    this.path(d, this.rad([[0, m.hi], [0.5, m.mid], [1, m.lo]], { cx: lx, cy: ly, r }), extra);
    if (rim) this.path(d, this.rad([[0.68, m.rim, 0], [1, m.rim, rimOp]], { cx: rimCx, cy: rimCy, r: rimR }), extra);
    return this;
  }
  /* Aplat (avec opacité éventuelle). */
  aplat(d, c, op = 1, extra = "") { return this.path(d, c, `${op < 1 ? ` fill-opacity="${op}"` : ""}${extra}`); }
  /* Reflet blanc flou, limité à une forme. */
  reflet(forme, d, op = 0.75, sd = 0.45, c = "#fff") {
    const cl = this.clip(forme), fl = this.flou(sd);
    this.out.push(`<g clip-path="${cl}"><path d="${d}" fill="${c}" fill-opacity="${op}" filter="${fl}"/></g>`);
    return this;
  }
  /* Ombre ou lumière floue libre (non limitée). */
  halo(d, c, op = 0.5, sd = 0.6) {
    const fl = this.flou(sd);
    this.out.push(`<path d="${d}" fill="${c}" fill-opacity="${op}" filter="${fl}"/>`);
    return this;
  }
  trait(d, c, w = 0.6, op = 1, extra = "") {
    this.out.push(`<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"${op < 1 ? ` stroke-opacity="${op}"` : ""}${extra}/>`);
    return this;
  }
  /* Trait flou (reflet linéaire). */
  filet(d, c = "#fff", w = 0.6, op = 0.8, sd = 0.3) {
    const fl = this.flou(sd);
    return this.trait(d, c, w, op, ` filter="${fl}"`);
  }
  groupe(attrs, fn) { this.out.push(`<g ${attrs}>`); fn(this); this.out.push("</g>"); return this; }
  /* Insère un dessin SVG complet (ex. un emoji Fluent) en renommant ses identifiants. */
  inclure(svgTexte, tf = "") {
    const pre = this.id() + "_";
    const s = svgTexte
      .replace(/id="([^"]+)"/g, (_, x) => `id="${pre}${x}"`)
      .replace(/url\(#([^)]+)\)/g, (_, x) => `url(#${pre}${x})`)
      .replace(/href="#([^"]+)"/g, (_, x) => `href="#${pre}${x}"`);
    const inner = s.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const defs = (inner.match(/<defs>([\s\S]*?)<\/defs>/) || [, ""])[1];
    this.defs.push(defs);
    this.out.push(`<g transform="${tf}">${inner.replace(/<defs>[\s\S]*?<\/defs>/, "")}</g>`);
    return this;
  }
  brut(s) { this.out.push(s); return this; }
  svg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none"><defs>${this.defs.join("")}</defs>${this.out.join("")}</svg>`;
  }
}

/* Hasard reproductible (textures, grains) : même graine, même dessin. */
export function hasard(graine = 1) {
  let s = graine >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function dessiner(nom, fn) {
  const d = new Dessin(nom);
  fn(d);
  return d.svg();
}
