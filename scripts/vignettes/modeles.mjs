// Gabarits partagés par les dessins (bouteille, bol, pot, cube, feuilles).
// Première série : bouteilles, moulin, herbes, pots, sucre, cannelle, vanille, épices, farine, poireau.
import { M, dessiner, feuille, nervure, ell, capsule, arrondi, boite, lisse, hasard, mix } from "./kit.mjs";

/* ── Bouteille ── */
export function bouteille(d, { cx = 13.5, liquide = M.huile, haut = 13.4, mince = false, bouchon = "liege" }) {
  const bw = mince ? 4.5 : 5.9, nw = mince ? 1.25 : 1.5;
  const epaule = mince ? 11.2 : 9.2, corpsHaut = mince ? 16 : 14.6;
  const bas = (x0) => `V27.4C${cx + bw} 28.8 ${cx + bw - 1.1} 29.8 ${cx + bw - 2.4} 29.8H${x0}C${cx - bw + 1.1} 29.8 ${cx - bw} 28.8 ${cx - bw} 27.4`;
  const corps = `M${cx - nw} 4.4H${cx + nw}V${epaule}C${cx + nw} ${epaule + 1.2} ${cx + bw} ${corpsHaut - 3} ${cx + bw} ${corpsHaut}${bas(cx - bw + 2.4)}V${corpsHaut}C${cx - bw} ${corpsHaut - 3} ${cx - nw} ${epaule + 1.2} ${cx - nw} ${epaule}Z`;
  d.vol(corps, M.verre, { rimOp: 0.5 });
  const liq = `M${cx - bw} ${haut + 0.9}C${cx - bw + 2} ${haut} ${cx + bw - 2} ${haut} ${cx + bw} ${haut + 0.9}${bas(cx - bw + 2.4)}Z`;
  d.vol(liq, liquide, { lx: 0.32, ly: 0.2, rimOp: 0.6 });
  d.trait(`M${cx - bw + 0.4} ${haut + 0.85}C${cx - bw + 2} ${haut + 0.1} ${cx + bw - 2} ${haut + 0.1} ${cx + bw - 0.4} ${haut + 0.85}`, "#fff", 0.55, 0.55);
  d.reflet(corps, capsule(cx - bw + 1.4, corpsHaut + 0.6, cx - bw + 1.4, 27.2, 0.6), 0.85, 0.35);
  d.reflet(corps, capsule(cx - nw + 0.55, 5.4, cx - nw + 0.55, epaule - 0.2, 0.35), 0.8, 0.25);
  if (bouchon === "liege") d.vol(arrondi([[cx - nw - 0.3, 1.6], [cx + nw + 0.3, 1.6], [cx + nw + 0.3, 5.4], [cx - nw - 0.3, 5.4]], 0.7), M.bois);
  else d.vol(arrondi([[cx - nw - 0.5, 2], [cx + nw + 0.5, 2], [cx + nw + 0.5, 5.6], [cx - nw - 0.5, 5.6]], 0.9), M.noir);
  return { corps, bw };
}

/* ── Bol vu de face, avec un dôme de contenu ── */
export function bolDome(d, { cx = 16, haut = 19, l = 11, h = 10.5, dome = 7.5, contenu, bol = M.ceramique, grain = null, graine = 3 }) {
  d.vol(ell(cx, haut, l - 0.4, 2.9), { ...bol, hi: bol.lo, mid: mix(bol.lo, "#000000", 0.12), lo: mix(bol.lo, "#000000", 0.25) }, { rim: false });
  const mont = `M${cx - l + 1.2} ${haut + 0.4}C${cx - l + 2.4} ${haut - dome * 0.55} ${cx - l * 0.45} ${haut - dome} ${cx} ${haut - dome}C${cx + l * 0.45} ${haut - dome} ${cx + l - 2.4} ${haut - dome * 0.55} ${cx + l - 1.2} ${haut + 0.4}C${cx + l * 0.5} ${haut + 2.6} ${cx - l * 0.5} ${haut + 2.6} ${cx - l + 1.2} ${haut + 0.4}Z`;
  d.vol(mont, contenu, { lx: 0.35, ly: 0.12, r: 1.05 });
  if (grain) {
    const r = hasard(graine);
    for (let i = 0; i < grain.n; i++) {
      const t = r(), u = r();
      const x = cx - l * 0.8 + t * l * 1.6;
      const yTop = haut - dome * Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / (l * 0.86), 2)));
      const y = yTop + 0.6 + u * (haut + 1.2 - yTop);
      grain.dessin(d, x, y, r);
    }
  }
  const corps = `M${cx - l} ${haut}C${cx - l} ${haut + h * 0.62} ${cx - l * 0.55} ${haut + h} ${cx} ${haut + h}C${cx + l * 0.55} ${haut + h} ${cx + l} ${haut + h * 0.62} ${cx + l} ${haut}C${cx + l * 0.7} ${haut + 2.9} ${cx - l * 0.7} ${haut + 2.9} ${cx - l} ${haut}Z`;
  d.vol(corps, bol, { ly: 0.15 });
  d.trait(`M${cx - l + 0.5} ${haut + 0.45}C${cx - l * 0.6} ${haut + 2.75} ${cx + l * 0.6} ${haut + 2.75} ${cx + l - 0.5} ${haut + 0.45}`, "#fff", 0.6, 0.85);
  d.reflet(corps, `M${cx - l + 1.8} ${haut + 3}C${cx - l + 2} ${haut + 6} ${cx - l * 0.5} ${haut + 8} ${cx - l * 0.3} ${haut + 8.3}`, 0.0, 0.1);
  d.filet(`M${cx - l + 2} ${haut + 3.6}C${cx - l + 2.6} ${haut + 6.2} ${cx - l * 0.62} ${haut + 7.8} ${cx - l * 0.38} ${haut + 8.2}`, "#fff", 0.9, 0.7, 0.35);
}

/* Pincée de poudre : grains clairs et sombres. */
export const poudre = (m) => ({ n: 46, dessin: (d, x, y, r) => d.aplat(ell(x, y, 0.22 + r() * 0.2, 0.18 + r() * 0.12), r() > 0.5 ? m.hi : m.lo, 0.55) });

/* ── Feuilles d'herbes ── */
export function brin(d, pts, c = "#5DA83C", w = 0.9) { d.trait(lisse(pts, false), c, w); }

export function grappePersil(d, x, y, dir, s = 1, m = M.vert) {
  for (const [k, da, L, W] of [[0, -42, 6.2, 4.8], [1, 42, 6.2, 4.8], [2, 0, 7.4, 5.4]]) {
    const o = { x, y, L: L * s, W: W * s, deg: dir + da, ventre: 0.58, rond: 0.75, dents: 3, prof: 0.42, pointe: 0.1 };
    d.vol(feuille(o), k < 2 ? { ...m, hi: m.mid, mid: m.lo } : m, { lx: 0.35, ly: 0.2 });
    d.trait(nervure({ ...o, a: 0.75 }), "#D9F7B8", 0.35, 0.55);
  }
}

/* ── Pots laitiers ── */
export function pot(d, { cx = 16, top = 12, bot = 29.8, wTop = 9, wBot = 7, bande, bandeY = [17, 22] }) {
  const corps = `M${cx - wTop} ${top}H${cx + wTop}L${cx + wBot + 0.3} ${bot - 1.8}C${cx + wBot + 0.2} ${bot - 0.6} ${cx + wBot - 0.6} ${bot} ${cx + wBot - 1.6} ${bot}H${cx - wBot + 1.6}C${cx - wBot + 0.6} ${bot} ${cx - wBot - 0.2} ${bot - 0.6} ${cx - wBot - 0.3} ${bot - 1.8}Z`;
  d.vol(corps, M.ceramique, { lx: 0.28, ly: 0.2 });
  if (bande) {
    const [y1, y2] = bandeY;
    const k = (y) => wTop - ((wTop - wBot) * (y - top)) / (bot - top);
    const b = `M${cx - k(y1)} ${y1}H${cx + k(y1)}L${cx + k(y2)} ${y2}H${cx - k(y2)}Z`;
    d.vol(b, bande, { rim: true, rimOp: 0.35, ly: 0.1 });
  }
  d.reflet(corps, capsule(cx - wTop + 2, top + 2.5, cx - wBot + 1.4, bot - 2.5, 0.65), 0.9, 0.4);
  return corps;
}

/* ── Sucre ── */
export function cube(d, x, y, s, faces, grain = 9) {
  const b = boite(x, y, s, s, s, 0.75);
  d.vol(b.gauche, faces.g, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.droite, faces.d, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.dessus, faces.t, { rim: false, lx: 0.35, ly: 0.35 });
  const r = hasard(grain);
  for (const face of ["gauche", "droite", "dessus"]) {
    const { B0, B1, B2, T0, T1, T2, T3 } = b.sommets;
    const q = face === "gauche" ? [B0, T0, T2, B2] : face === "droite" ? [B0, B1, T1, T0] : [T0, T1, T3, T2];
    for (let i = 0; i < 9; i++) {
      const u = 0.15 + r() * 0.7, v = 0.15 + r() * 0.7;
      const px = q[0][0] + (q[1][0] - q[0][0]) * u + (q[3][0] - q[0][0]) * v;
      const py = q[0][1] + (q[1][1] - q[0][1]) * u + (q[3][1] - q[0][1]) * v;
      d.aplat(ell(px, py, 0.28, 0.2), r() > 0.5 ? "#fff" : faces.grain, 0.7);
    }
  }
  return b;
}

/* ── Bocal (géométrie de l'emoji Fluent « Jar ») rempli d'un contenu, étiquette et emblème ── */
export function bocal(d, { contenu, haut = 9.6, embleme, etiquette = { hi: "#FFFFFF", mid: "#FBF6EA", lo: "#E6DCC6", rim: "#CBBE9F", rimOp: 0.4 } }) {
  const corps = "M7.78 6.07C6.16 6.07 4.84 7.29 4.84 8.8V27.27C4.84 28.78 6.16 30 7.78 30H24.22C25.84 30 27.16 28.78 27.16 27.27V8.8C27.16 7.29 25.84 6.07 24.22 6.07Z";
  d.vol(corps, M.verre, { rimOp: 0.45 });
  const c = `M5.6 ${haut + 0.7}C9 ${haut - 0.3} 23 ${haut - 0.3} 26.4 ${haut + 0.7}V27.1C26.4 28.4 25.35 29.3 24.05 29.3H7.95C6.65 29.3 5.6 28.4 5.6 27.1Z`;
  d.vol(c, contenu, { lx: 0.3, ly: 0.18 });
  d.trait(`M6 ${haut + 0.75}C9.4 ${haut - 0.1} 22.6 ${haut - 0.1} 26 ${haut + 0.75}`, "#FFFFFF", 0.5, 0.5);
  d.path("M22.98 9C22.98 8.43 23.44 7.97 24.01 7.97C24.58 7.97 25.04 8.43 25.04 9V27.68C25.04 28.25 24.58 28.71 24.01 28.71C23.44 28.71 22.98 28.25 22.98 27.68Z", d.lin([[0.55, "#FFFFFF", 0.85], [1, "#FFFFFF", 0]]));
  d.filet("M6.4 9.6V26.8", "#FFFFFF", 0.7, 0.45, 0.35);
  d.vol("M22.03 5.07L15.98 3.93L9.94 5.07V6.07L15.98 7.46L22.03 6.07Z", M.acierSombre, { rim: false });
  d.vol("M7.95 3.54C7.95 2.69 8.63 2 9.48 2H22.47C23.32 2 24.01 2.69 24.01 3.54C24.01 4.38 23.32 5.07 22.47 5.07H9.48C8.63 5.07 7.95 4.38 7.95 3.54Z", M.acier);
  d.vol("M9.76 13.41C9.19 13.41 8.73 13.86 8.73 14.42V19.51C8.73 20.07 9.19 20.52 9.76 20.52H22.2C22.78 20.52 23.24 20.07 23.24 19.51V14.42C23.24 13.86 22.78 13.41 22.2 13.41Z", etiquette, { ly: 0.15 });
  if (embleme) embleme(d, 15.98, 16.96);
}

/* La même matière, un ton plus sombre (feuilles du fond, faces à l'ombre). */
export const assombrir = (m, t = 0.22) => ({ ...m, hi: mix(m.hi, m.lo, t), mid: mix(m.mid, m.lo, t), lo: mix(m.lo, "#000000", t * 0.5) });

/* Une sphère avec son point de lumière. */
export function sphere(d, cx, cy, r, m, o = {}) {
  const f = ell(cx, cy, r, r * (o.aplati ?? 1), o.deg ?? 0);
  d.vol(f, m, { lx: 0.32, ly: 0.28 });
  d.aplat(ell(cx - r * 0.35, cy - r * 0.38, r * 0.26, r * 0.18, -30), "#FFFFFF", o.brillance ?? 0.55);
  return f;
}
