// Quatrième série : l'épicerie (épices entières, graines, céréales, pâtes, sauces, biscuits, pâtisserie).
import { M, dessiner, feuille, nervure, ell, capsule, arrondi, boite, lisse, hasard, mix } from "../kit.mjs";
import { bolDome, bouteille, sphere, assombrir } from "../modeles.mjs";
import { lireFluent } from "../fluent.mjs";

const E = {};
const blond = { hi: "#FFF3C2", mid: "#F2CB6A", lo: "#C9922E", rim: "#A87420", rimOp: 0.45 };

/* ── Épices entières ── */
E["muscade"] = dessiner("muscade", (d) => {
  const brun = { hi: "#DFAE80", mid: "#9E6438", lo: "#5C3216", rim: "#42230C", rimOp: 0.5 };
  const noix = ell(12, 13.2, 8.2, 9.6, -24);
  d.vol(noix, brun, { lx: 0.3, ly: 0.25 });
  const r = hasard(6);
  const cl = d.clip(noix);
  d.brut(`<g clip-path="${cl}">`);
  for (let i = 0; i < 16; i++) { const x = 4 + r() * 16, y = 4 + r() * 18; d.trait(`M${x} ${y}q${1.6 + r()} ${-1.2 + r() * 2.4} ${3 + r()} ${r() * 1.2}`, "#C99266", 0.5, 0.7); }
  d.brut("</g>");
  d.reflet(noix, ell(9, 8, 2, 1.2, -40), 0.55, 0.45);
  d.vol(ell(21.4, 22.6, 7.6, 6.6, 8), brun, { lx: 0.3, ly: 0.2 });
  const coupe = ell(21.4, 22.2, 6.7, 5.7, 8);
  d.vol(coupe, { hi: "#FFF0D6", mid: "#E8C48E", lo: "#BC8A50", rim: "#9C6C38", rimOp: 0.4 }, { lx: 0.4, ly: 0.35 });
  const cl2 = d.clip(coupe);
  d.brut(`<g clip-path="${cl2}">`);
  for (let i = 0; i < 9; i++) { const y = 17 + i * 1.3; d.trait(`M14 ${y}C${17 + r() * 2} ${y - 1.6} ${20 + r() * 2} ${y + 1.6} ${29} ${y - 0.6}`, "#8A5428", 0.5, 0.8); }
  d.brut("</g>");
});

E["girofle"] = dessiner("girofle", (d) => {
  const m = { hi: "#B57656", mid: "#6A3622", lo: "#391A0E", rim: "#29110A", rimOp: 0.5 };
  for (const [x1, y1, x2, y2] of [[8.4, 27.6, 13.4, 9.4], [16.6, 29.2, 17.4, 11.6], [22.6, 27.2, 23.6, 9.8], [4.6, 22.4, 24.6, 20.2]].slice(0, 3).concat([[9.4, 29, 27.6, 17.4]])) {
    d.vol(capsule(x1, y1, x2, y2, 0.7, 1.15), m, { lx: 0.3, ly: 0.3 });
    const a = Math.atan2(y2 - y1, x2 - x1);
    const hx = x2 + Math.cos(a) * 1.8, hy = y2 + Math.sin(a) * 1.8;
    for (const k of [-1, -0.33, 0.33, 1]) {
      const b = a + k * 0.9;
      d.vol(ell(x2 + Math.cos(b) * 1.5, y2 + Math.sin(b) * 1.5, 1.3, 0.75, (b * 180) / Math.PI), m, { rim: false });
    }
    d.vol(ell(hx, hy, 1.5, 1.5), { hi: "#C98A66", mid: "#7A4028", lo: "#462012" }, { rim: false });
    d.aplat(ell(hx - 0.4, hy - 0.45, 0.45, 0.35), "#FFFFFF", 0.5);
  }
});

E["anis-etoile"] = dessiner("anisetoile", (d) => {
  const m = { hi: "#E39A68", mid: "#A2502A", lo: "#5E2810", rim: "#461C08", rimOp: 0.5 };
  const etoile = (cx, cy, s, rot) => {
    for (let i = 0; i < 8; i++) {
      const o = { x: cx, y: cy, L: 12.6 * s, W: 5.4 * s, deg: rot + i * 45, ventre: 0.55, rond: 0.8, pointe: 0.25 };
      d.vol(feuille(o), i % 2 ? m : assombrir(m, 0.15), { lx: 0.35, ly: 0.3 });
      const a = (o.deg * Math.PI) / 180;
      const sx = cx + Math.sin(a) * o.L * 0.55, sy = cy - Math.cos(a) * o.L * 0.55;
      d.vol(ell(sx, sy, 1.5 * s, 1 * s, o.deg + 90), { hi: "#E8B07A", mid: "#A86A36", lo: "#6A3C18" }, { rim: false });
      d.aplat(ell(sx - 0.3, sy - 0.3, 0.5 * s, 0.3 * s, o.deg), "#FFFFFF", 0.6);
    }
    d.vol(ell(cx, cy, 1.6 * s, 1.6 * s), { hi: "#B8714A", mid: "#6E341A", lo: "#3E1A0A" }, { rim: false });
  };
  etoile(24.4, 7.8, 0.48, 20);
  etoile(14.4, 17.4, 1, 0);
});

E["cardamome"] = dessiner("cardamome", (d) => {
  const m = { hi: "#E6F0B8", mid: "#A9C46C", lo: "#6C873A", rim: "#536C28", rimOp: 0.5 };
  for (const [cx, cy, deg] of [[11, 12.6, -30], [21.6, 14.4, 25], [15, 22.6, 10]]) {
    const o = { x: cx, y: cy + 7, L: 14, W: 8, deg, ventre: 0.5, rond: 0.8, pointe: 0.3 };
    d.vol(feuille(o), m, { lx: 0.35, ly: 0.25 });
    for (const t of [-0.28, 0, 0.28]) d.trait(nervure({ ...o, x: o.x + Math.cos((deg * Math.PI) / 180) * t * 6, y: o.y + Math.sin((deg * Math.PI) / 180) * t * 6, de: 0.12, a: 0.85 }), "#F2F8D6", 0.45, 0.8);
  }
  const ouverte = ell(15, 22.6, 2.2, 4.4, 10);
  d.vol(ouverte, { hi: "#5A4A40", mid: "#2E2420", lo: "#140E0C" }, { rim: false });
  for (const [x, y] of [[14.6, 20.6], [15.6, 22.4], [14.8, 24.2]]) d.aplat(ell(x, y, 0.6, 0.45), "#8A7462", 0.9);
});

E["epices"] = dessiner("epices", (d) => {
  const planche = arrondi([[2.6, 21], [29.4, 21], [29.4, 28.6], [2.6, 28.6]], 2.4);
  d.vol(arrondi([[2.6, 22.6], [29.4, 22.6], [29.4, 30.2], [2.6, 30.2]], 2.4), { hi: M.bois.lo, mid: M.bois.lo, lo: mix(M.bois.lo, "#000000", 0.2) }, { rim: false });
  d.vol(planche, M.bois, { lx: 0.3, ly: 0.2 });
  const r = hasard(19);
  const tas = (cx, base, l, h, m) => {
    const p = `M${cx - l} ${base}C${cx - l * 0.6} ${base - h * 0.4} ${cx - l * 0.4} ${base - h} ${cx} ${base - h}C${cx + l * 0.4} ${base - h} ${cx + l * 0.6} ${base - h * 0.4} ${cx + l} ${base}Z`;
    d.vol(p, m, { lx: 0.35, ly: 0.15 });
    for (let i = 0; i < 26; i++) { const x = cx - l * 0.8 + r() * l * 1.6, y = base - r() * h * 0.85; d.aplat(ell(x, y, 0.3, 0.22), r() > 0.5 ? m.hi : m.lo, 0.5); }
  };
  tas(8.4, 24.6, 6.4, 9.6, { hi: "#FFA27A", mid: "#E2452C", lo: "#A8281C", rim: "#86181A", rimOp: 0.4 });
  tas(23.6, 24.6, 6.4, 9.2, { hi: "#E7B272", mid: "#AF7233", lo: "#734317", rim: "#58300C", rimOp: 0.4 });
  tas(16, 25.4, 7, 13.6, { hi: "#FFF08A", mid: "#F7B90C", lo: "#CF7E05", rim: "#B26004", rimOp: 0.4 });
});

/* ── Graines et céréales ── */
E["sesame"] = dessiner("sesame", (d) => {
  d.vol(capsule(19.6, 14.2, 29.6, 3.6, 1.3, 1.1), M.bois, { lx: 0.3, ly: 0.3 });
  const bol = ell(13, 20, 9.4, 7, -36);
  d.vol(bol, M.bois, { lx: 0.35, ly: 0.3 });
  const tas = ell(12.8, 19.4, 8, 5.6, -36);
  d.vol(tas, { hi: "#FFFBEA", mid: "#F2DFB2", lo: "#CDB07A", rim: "#B09460", rimOp: 0.4 }, { lx: 0.35, ly: 0.25 });
  const r = hasard(14);
  const cl = d.clip(tas);
  d.brut(`<g clip-path="${cl}">`);
  for (let i = 0; i < 60; i++) { const x = 5 + r() * 16, y = 13 + r() * 13; d.aplat(feuille({ x, y, L: 1.6, W: 0.9, deg: r() * 360, ventre: 0.35, pointe: 0.4 }), r() > 0.35 ? "#FFF6DE" : "#D9BF8C", 1); }
  d.brut("</g>");
  for (const [x, y, a] of [[22.6, 27.4, 20], [25.8, 25.4, -40], [20, 29.6, 70], [26.6, 29.2, 10]]) d.vol(feuille({ x, y, L: 1.9, W: 1.1, deg: a, ventre: 0.35, pointe: 0.4 }), { hi: "#FFFDF2", mid: "#F2DFB2", lo: "#CDB07A" }, { rim: false });
});

E["pois-chiches"] = dessiner("poischiches", (d) => {
  const m = { hi: "#FFEBBE", mid: "#E8BE7A", lo: "#B6823E", rim: "#97692C", rimOp: 0.45 };
  const pois = [[9.6, 14.2], [16.2, 12.8], [22.6, 14.4], [6.6, 20.4], [12.8, 19.6], [19.2, 19.4], [25.4, 20.6], [9.6, 26], [16, 25.6], [22.4, 26]];
  for (const [x, y] of pois) {
    sphere(d, x, y, 3.9, m, { brillance: 0.45 });
    d.trait(`M${x - 0.6} ${y - 3.6}C${x - 1.6} ${y - 1} ${x - 1.2} ${y + 1.6} ${x + 0.4} ${y + 3}`, "#C9944C", 0.45, 0.6);
    d.vol(ell(x + 2.8, y - 2.4, 1.1, 0.8, 40), m, { rim: false });
  }
});

const grainsBol = (n, tons, rx, ry) => ({ n, dessin: (d, x, y, r) => d.aplat(ell(x, y, rx, ry, r() * 180), tons[Math.floor(r() * tons.length)], 1) });
E["quinoa"] = dessiner("quinoa", (d) => bolDome(d, {
  contenu: { hi: "#FFF8E2", mid: "#EED9A6", lo: "#C4A66C", rim: "#A68954", rimOp: 0.4 }, haut: 18.6, dome: 7.6, graine: 51,
  grain: { n: 120, dessin: (d, x, y, r) => { const c = r(); d.aplat(ell(x, y, 0.55, 0.5), c > 0.86 ? "#8E2A2A" : c > 0.76 ? "#2E2622" : "#FFF6DC", 1); d.aplat(ell(x + 0.15, y + 0.15, 0.25, 0.22), "#C9A46A", 0.6); } },
}));
E["semoule"] = dessiner("semoule", (d) => bolDome(d, {
  contenu: { hi: "#FFF4B8", mid: "#F2CF62", lo: "#C99A2C", rim: "#A87A1C", rimOp: 0.4 }, haut: 18.6, dome: 7.8, graine: 52,
  grain: grainsBol(130, ["#FFF6C8", "#E8B840", "#D9A030", "#FFFFFF"], 0.32, 0.28),
}));

E["flocons-avoine"] = dessiner("flocons", (d) => bolDome(d, {
  bol: M.bois, contenu: { hi: "#FFF6E2", mid: "#EBD2A2", lo: "#BE9C64", rim: "#A2804C", rimOp: 0.4 }, haut: 19, dome: 8.4, graine: 53,
  grain: { n: 46, dessin: (d, x, y, r) => { const a = r() * 180; d.vol(ell(x, y, 1.7, 1.15, a), { hi: "#FFFDF4", mid: "#F2DDB4", lo: "#C9A76E", rim: "#AE8C58", rimOp: 0.5 }, { rim: true }); } },
}));

E["cereales"] = dessiner("cereales", (d) => bolDome(d, {
  contenu: { hi: "#FFE08A", mid: "#F2AE3A", lo: "#C9781A", rim: "#A85E10", rimOp: 0.4 }, haut: 19, dome: 8.6, graine: 54,
  grain: { n: 30, dessin: (d, x, y, r) => { const pts = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r(); const k = 1.6 + r() * 0.8; pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k * 0.7]); } d.vol(lisse(pts), { hi: "#FFE9A6", mid: "#F5B444", lo: "#C97A1C", rim: "#A85E10", rimOp: 0.5 }); } },
}));

E["granola"] = dessiner("granola", (d) => bolDome(d, {
  bol: M.bois, contenu: { hi: "#E9B87A", mid: "#B97A3A", lo: "#7A4A1C", rim: "#5E3812", rimOp: 0.4 }, haut: 19, dome: 8.6, graine: 55,
  grain: { n: 44, dessin: (d, x, y, r) => { const c = r(); if (c > 0.82) d.vol(ell(x, y, 0.9, 0.7, r() * 180), { hi: "#8A3A5A", mid: "#4E1430", lo: "#2A0A18" }, { rim: false }); else if (c > 0.68) d.vol(ell(x, y, 1.3, 0.75, r() * 180), { hi: "#F6E2C2", mid: "#D9B080", lo: "#A87A46" }, { rim: false }); else d.vol(ell(x, y, 1.25 + r() * 0.5, 1 + r() * 0.4, r() * 180), { hi: "#F4CB86", mid: "#C98A40", lo: "#8A5420" }, { rim: false }); } },
}));

/* ── Pâtes ── */
function penne(d, cx, cy, deg, l = 11, r = 2.2) {
  d.groupe(`transform="rotate(${deg} ${cx} ${cy})"`, () => {
    const corps = `M${cx - l / 2 + 1.4} ${cy - r}L${cx + l / 2 + 1.4} ${cy - r}L${cx + l / 2 - 1.4} ${cy + r}L${cx - l / 2 - 1.4} ${cy + r}Z`;
    d.path(corps, d.lin([[0, "#E9B13E"], [0.3, "#FFE7A0"], [0.7, "#F2C55A"], [1, "#C98A22"]]));
    for (let k = 1; k < 5; k++) { const x = cx - l / 2 + (k * l) / 5; d.trait(`M${x + 1.2} ${cy - r + 0.3}L${x - 1.2} ${cy + r - 0.3}`, "#D9982E", 0.4, 0.8); }
    d.vol(ell(cx + l / 2, cy, 1.3, r, 0), { hi: "#F6CF6A", mid: "#E0A032", lo: "#B87818" }, { rim: false });
    d.aplat(ell(cx + l / 2, cy, 0.6, r * 0.55), "#8A5410", 0.9);
  });
}
E["pates"] = dessiner("pates", (d) => {
  for (const [x, y, a] of [[11, 10.6, -35], [21.6, 12, 30], [15.4, 17, 10], [8.6, 21.8, 52], [21, 23.4, -20], [14.4, 26.4, 12]]) penne(d, x, y, a);
});

E["tagliatelles"] = dessiner("tagliatelles", (d) => {
  const nid = (cx, cy, rx, ry) => {
    d.vol(ell(cx, cy, rx, ry), blond, { lx: 0.35, ly: 0.3 });
    for (let k = 0; k < 5; k++) {
      const f = 0.95 - k * 0.17;
      d.trait(lisse([...Array(16)].map((_, i) => { const a = (i / 16) * Math.PI * 2; return [cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f + Math.sin(a * 3 + k) * 0.4]; })), "#D9A238", 0.55, 0.85);
      d.trait(lisse([...Array(16)].map((_, i) => { const a = (i / 16) * Math.PI * 2; return [cx + Math.cos(a) * rx * (f - 0.06), cy + Math.sin(a) * ry * (f - 0.06)]; })), "#FFF2C0", 0.4, 0.7);
    }
    d.vol(ell(cx, cy - 0.3, rx * 0.2, ry * 0.2), { hi: "#C98A26", mid: "#A86A16", lo: "#7A4A0A" }, { rim: false });
  };
  nid(11.6, 13.4, 8.6, 6.8);
  nid(20.8, 22.2, 8.8, 7);
});

E["lasagnes"] = dessiner("lasagnes", (d) => {
  for (const [dy, t] of [[8.4, 0.12], [0, 0]]) {
    const y0 = 14 + dy;
    const ondule = (y, sens) => [...Array(9)].map((_, i) => [4 + i * 3, y + Math.sin(i * 1.6) * 0.9 * sens]);
    const haut = ondule(y0 - 6, 1), bas = ondule(y0 + 3, -1).reverse();
    d.groupe(`transform="rotate(-12 16 ${y0})"`, () => {
      const f = lisse([...haut, ...bas], true, 0.12);
      d.vol(f, { ...blond, hi: mix(blond.hi, blond.lo, t), mid: mix(blond.mid, blond.lo, t) }, { lx: 0.35, ly: 0.3 });
      d.trait(lisse(haut, false), "#FFF6D0", 0.6, 0.9);
      d.trait(lisse(ondule(y0 + 3.6, -1), false), "#B87C22", 0.9, 0.9);
    });
  }
});

E["gnocchis"] = dessiner("gnocchis", (d) => {
  const m = { hi: "#FFF8DC", mid: "#F2DC9E", lo: "#C9A864", rim: "#AE8C4C", rimOp: 0.45 };
  for (const [x, y, a] of [[10.4, 11.6, -20], [20.4, 10.8, 18], [6.6, 19.6, 30], [15.6, 18.4, -8], [24.8, 19.2, 26], [11.2, 26.6, 12], [21, 26.8, -16]]) {
    const g = ell(x, y, 4.6, 3.5, a);
    d.vol(g, m, { lx: 0.35, ly: 0.3 });
    const cl = d.clip(g);
    d.brut(`<g clip-path="${cl}">`);
    for (let k = -2; k <= 2; k++) d.trait(`M${x + k * 1.6 - 2} ${y - 4}L${x + k * 1.6 + 2} ${y + 4}`, "#D9BC80", 0.45, 0.8);
    d.brut("</g>");
  }
});

E["nouilles-riz"] = dessiner("nouillesriz", (d) => {
  const nid = ell(16, 18, 13, 9.4, -8);
  d.vol(nid, { hi: "#FFFFFF", mid: "#F2F0EA", lo: "#C9C6BC", rim: "#ABA79A", rimOp: 0.45 }, { lx: 0.35, ly: 0.3 });
  const cl = d.clip(nid);
  d.brut(`<g clip-path="${cl}">`);
  const r = hasard(31);
  for (let i = 0; i < 26; i++) {
    const y = 9 + r() * 18, x = 3 + r() * 6;
    const p = `M${x} ${y}C${x + 6} ${y - 3 + r() * 6} ${x + 12} ${y - 3 + r() * 6} ${x + 22} ${y - 2 + r() * 4}`;
    d.trait(p, r() > 0.5 ? "#D6D2C6" : "#FFFFFF", 0.5, 0.9);
  }
  d.brut("</g>");
  d.reflet(nid, ell(10, 12, 4, 1.8, -12), 0.6, 0.6);
});

/* ── Pâtisserie et levure ── */
E["levure"] = dessiner("levure", (d) => {
  const sachet = "M8.4 9.4L23.6 9.4V27.4C23.6 28.8 22.6 29.8 21.2 29.8H10.8C9.4 29.8 8.4 28.8 8.4 27.4Z";
  d.vol(sachet, { hi: "#FFFFFF", mid: "#F4EFFA", lo: "#D2C6E0", rim: "#B3A5C6", rimOp: 0.45 }, { lx: 0.3, ly: 0.2 });
  d.vol(arrondi([[8.4, 16.6], [23.6, 16.6], [23.6, 22], [8.4, 22]], 0.4), { hi: "#F7C9E8", mid: "#E58CC4", lo: "#B85A98", rim: "#9A4680", rimOp: 0.35 }, { ly: 0.1 });
  d.aplat("M13.2 20.9H18.8L18.2 21.5H13.8Z", "#FFFFFF", 0.95);
  d.aplat("M13.4 20.6C13.4 18.6 14.6 17.4 16 17.4C17.4 17.4 18.6 18.6 18.6 20.6Z", "#FFFFFF", 0.95);
  const dents = [...Array(9)].map((_, i) => `L${8.4 + ((i + 1) * 15.2) / 9} ${i % 2 ? 9.4 : 8.2}`).join("");
  d.vol(`M8.4 9.4${dents}L23.6 11.2H8.4Z`, { hi: "#FFFFFF", mid: "#ECE6F4", lo: "#C9BCDB" }, { rim: false });
  for (const [x, y, r] of [[22.6, 5.4, 1.4], [25.6, 3.4, 1], [26.4, 7, 0.8], [20.2, 3, 0.7]]) { d.aplat(ell(x, y, r, r), "#FFFFFF", 0.95); d.trait(ell(x, y, r, r), "#D9CCEB", 0.3); }
});

E["gelatine"] = dessiner("gelatine", (d) => {
  for (const [deg, dx] of [[-16, -2.4], [-4, 0], [9, 2.4]]) {
    d.groupe(`transform="rotate(${deg} 16 18) translate(${dx} 0)"`, () => {
      const f = arrondi([[7, 7], [25, 7], [25, 29], [7, 29]], 1.6);
      d.path(f, d.lin([[0, "#FFF4D8", 0.85], [1, "#F2D69A", 0.85]]));
      d.path(f, d.rad([[0.6, "#E2B866", 0], [1, "#C9952E", 0.5]], { cx: 0.5, cy: 0.45, r: 0.7 }));
      for (let k = 0; k < 7; k++) { d.trait(`M7.6 ${8.4 + k * 3.4}L24.4 ${11.8 + k * 3.4 - 6}`, "#E2B866", 0.35, 0.7); d.trait(`M7.6 ${11.8 + k * 3.4 - 6}L24.4 ${8.4 + k * 3.4}`, "#E2B866", 0.35, 0.7); }
      d.trait("M8.6 8.6H23.4", "#FFFFFF", 0.6, 0.8);
    });
  }
});

E["bouillon"] = dessiner("bouillon", (d) => {
  const papier = "M3.4 21.4L14.6 15.2L28.6 20.4L17.4 27.8Z";
  d.path("M3.4 21.4L14.6 15.2L28.6 20.4L17.4 27.8Z", d.lin([[0, "#FFF2A6"], [0.4, "#E2B23A"], [0.7, "#FFE07A"], [1, "#B8861A"]], { x1: 0, y1: 0, x2: 1, y2: 1 }));
  for (const p of ["M6.6 21.6L15.6 16.8", "M12 24.6L21 18.6", "M9.4 20.2L23.4 24.4"]) d.trait(p, "#FFF6CC", 0.5, 0.8);
  void papier;
  const b = boite(15.6, 25, 8.4, 8.4, 8, 1.1);
  d.vol(b.gauche, { hi: "#D79A44", mid: "#B8782A", lo: "#8A5418" }, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.droite, { hi: "#C4862E", mid: "#A2661C", lo: "#76450E" }, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.dessus, { hi: "#F6C978", mid: "#E2A548", lo: "#B87A28" }, { rim: false, lx: 0.35, ly: 0.35 });
  const r = hasard(7);
  for (let i = 0; i < 24; i++) d.aplat(ell(9 + r() * 13, 10 + r() * 14, 0.35, 0.25), r() > 0.5 ? "#FFE3A6" : "#8A5418", 0.6);
});

/* ── Sauces en bouteille ── */
function etiquette(d, cx, y1, y2, l) {
  d.vol(arrondi([[cx - l, y1], [cx + l, y1], [cx + l, y2], [cx - l, y2]], 0.6), { hi: "#FFFDF6", mid: "#F6EBD4", lo: "#DCC7A0", rim: "#BFA67A", rimOp: 0.35 });
}
E["sauce-soja"] = dessiner("saucesoja", (d) => {
  bouteille(d, { cx: 12.6, liquide: M.soja, haut: 13.4, bouchon: "noir" });
  d.vol("M17.2 26.2C17.2 28.6 20.6 30.4 24.4 30.4C28.2 30.4 31.4 28.6 31.4 26.2Z", M.ceramique, { ly: 0.1 });
  d.vol(ell(24.3, 26.2, 7.1, 2.3), { hi: "#8A4A2C", mid: "#4A2414", lo: "#24100A" }, { rim: false });
  d.aplat(ell(22, 25.6, 1.8, 0.5), "#FFFFFF", 0.5);
});
E["sauce-poisson"] = dessiner("saucepoisson", (d) => {
  bouteille(d, { cx: 16, liquide: { hi: "#FFC27A", mid: "#C9661C", lo: "#86380A", rim: "#6A2A06", rimOp: 0.55 }, haut: 13.6 });
  etiquette(d, 16, 18.4, 25, 5.2);
  d.inclure(lireFluent("fish"), "translate(12.2 17.8) scale(0.24)");
});
E["sirop-erable"] = dessiner("siroperable", (d) => {
  bouteille(d, { cx: 16, liquide: { hi: "#FFC870", mid: "#D7741C", lo: "#93400A", rim: "#723006", rimOp: 0.55 }, haut: 13.6 });
  etiquette(d, 16, 18.2, 25.2, 5.2);
  d.inclure(lireFluent("maple_leaf"), "translate(12.4 18) scale(0.225)");
});
E["sirop"] = dessiner("sirop", (d) => {
  bouteille(d, { cx: 16, liquide: { hi: "#FFF0A6", mid: "#F2B43A", lo: "#BC7812", rim: "#9A5C08", rimOp: 0.5 }, haut: 13.6, bouchon: "noir" });
  etiquette(d, 16, 18.2, 25.2, 5.2);
  for (const deg of [-50, -25, 0, 25, 50]) d.vol(feuille({ x: 16, y: 24.4, L: 5.4, W: 1.5, deg, ventre: 0.3, pointe: 0.4 }), { hi: "#B8D9B0", mid: "#5E9A6E", lo: "#346A44" }, { rim: false });
});

/* ── Sucré ── */
E["pepites-chocolat"] = dessiner("pepites", (d) => {
  const m = { hi: "#9C6650", mid: "#5A2E1E", lo: "#2E140A", rim: "#1E0C06", rimOp: 0.5 };
  for (const [x, y, s] of [[10, 12.4, 1], [19.4, 11.2, 0.95], [14.8, 17.6, 1.05], [24.4, 17.8, 0.9], [7.4, 20.6, 0.95], [19.8, 23.8, 1.05], [11, 26.6, 1], [26, 26.4, 0.9]]) {
    const p = `M${x} ${y - 5 * s}C${x + 1.2 * s} ${y - 2.4 * s} ${x + 4.4 * s} ${y - 0.6 * s} ${x + 4.4 * s} ${y + 2 * s}C${x + 4.4 * s} ${y + 3.6 * s} ${x + 2.4 * s} ${y + 4.2 * s} ${x} ${y + 4.2 * s}C${x - 2.4 * s} ${y + 4.2 * s} ${x - 4.4 * s} ${y + 3.6 * s} ${x - 4.4 * s} ${y + 2 * s}C${x - 4.4 * s} ${y - 0.6 * s} ${x - 1.2 * s} ${y - 2.4 * s} ${x} ${y - 5 * s}Z`;
    d.vol(p, m, { lx: 0.3, ly: 0.3 });
    d.trait(`M${x - 1.6 * s} ${y - 0.6 * s}C${x - 2.4 * s} ${y + 0.6 * s} ${x - 2.4 * s} ${y + 2 * s} ${x - 1.4 * s} ${y + 2.8 * s}`, "#C99A84", 0.55, 0.7);
  }
});

E["houmous"] = dessiner("houmous", (d) => {
  const cer = M.ceramique;
  d.vol("M2.4 17.6C2.4 24.4 8.4 28.6 16 28.6C23.6 28.6 29.6 24.4 29.6 17.6Z", cer, { ly: 0.1 });
  d.vol(ell(16, 17.6, 13.6, 6.4), cer, { lx: 0.4, ly: 0.3 });
  const pate = ell(16, 17.4, 11.6, 5);
  d.vol(pate, { hi: "#FFF4DA", mid: "#EED2A0", lo: "#C9A468", rim: "#AC8650", rimOp: 0.4 }, { lx: 0.4, ly: 0.35 });
  d.trait(lisse([...Array(14)].map((_, i) => { const a = (i / 14) * Math.PI * 2; return [16 + Math.cos(a) * 7.4, 17.4 + Math.sin(a) * 3]; })), "#D9B47A", 0.6, 0.9);
  d.trait(lisse([...Array(14)].map((_, i) => { const a = (i / 14) * Math.PI * 2; return [16 + Math.cos(a) * 3.8, 17.4 + Math.sin(a) * 1.5]; })), "#D9B47A", 0.6, 0.9);
  d.aplat(ell(16, 17.4, 3.2, 1.3), "#F2C83A", 0.75);
  const r = hasard(3);
  for (let i = 0; i < 16; i++) d.aplat(ell(9 + r() * 14, 15 + r() * 5, 0.3, 0.25), "#C8401E", 0.85);
  for (const [x, y] of [[12.4, 15.6], [19.4, 16.2], [17.4, 19.6]]) sphere(d, x, y, 1.3, { hi: "#FFEBBE", mid: "#E8BE7A", lo: "#B6823E" }, { brillance: 0.5 });
});

function saucier(nom, liquide) {
  return dessiner(nom, (d) => {
    d.vol("M13.6 26.4C13.6 28.6 18.6 30.4 24.4 30.4C30 30.4 31.6 28.6 31.6 26.4C29 25.4 16.4 25.2 13.6 26.4Z", liquide, { lx: 0.4, ly: 0.2 });
    d.vol("M13.4 13.8C17 14.6 18.6 17.4 19.4 21.6C20 24.6 21.6 26 22.6 26.6C20.4 27.2 18.6 26.2 17.8 24.6C16.6 22.2 15.6 19 13.4 17.6Z", liquide, { lx: 0.3, ly: 0.3 });
    d.groupe('transform="rotate(-32 11 12)"', () => {
      const pot = "M3.6 6.6H18.4L17.2 18.6C17 20.4 15.6 21.6 13.8 21.6H8.2C6.4 21.6 5 20.4 4.8 18.6Z";
      d.vol(pot, M.ceramique, { lx: 0.3, ly: 0.2 });
      d.vol("M18.2 9C21.4 9 22.6 11 22.6 13C22.6 15.4 20.6 17 17.6 17.2L17.8 15.4C19.8 15.2 20.8 14.4 20.8 13C20.8 11.6 19.8 10.8 18 10.8Z", M.ceramique);
      d.vol(ell(11, 6.6, 7.4, 1.6), liquide, { rim: false });
      d.vol("M3 6.2L1.2 4.8C1 4.6 1.2 4.2 1.6 4.4L4.4 5.4Z", M.ceramique, { rim: false });
      d.filet("M6 9.2L6.8 18.4", "#FFFFFF", 0.8, 0.8, 0.3);
    });
  });
}
E["sauce-chocolat"] = saucier("saucechoco", { hi: "#A0644C", mid: "#5E301E", lo: "#33160A", rim: "#220E06", rimOp: 0.5 });
E["caramel"] = saucier("caramel", { hi: "#FFD58A", mid: "#E08A2A", lo: "#A85212", rim: "#86400A", rimOp: 0.5 });

/* ── Biscuits ── */
E["gaufrette"] = dessiner("gaufrette", (d) => {
  for (const [y, k] of [[27.6, 1], [21.4, 0]]) {
    const b = boite(14.6, y, 15.6, 8.6, 3.4, 0.6);
    d.vol(b.gauche, { hi: "#F2C26A", mid: "#D9963A", lo: "#A8681C" }, { rim: false });
    d.vol(b.droite, { hi: "#E2AA4E", mid: "#C47E28", lo: "#8E5212" }, { rim: false });
    d.trait(`M${b.sommets.B0[0]} ${b.sommets.B0[1] - 1.7}L${b.sommets.B1[0]} ${b.sommets.B1[1] - 1.7}`, "#FFF4D6", 0.7, 0.95);
    d.trait(`M${b.sommets.B0[0]} ${b.sommets.B0[1] - 1.7}L${b.sommets.B2[0]} ${b.sommets.B2[1] - 1.7}`, "#FFF4D6", 0.7, 0.95);
    d.vol(b.dessus, { hi: "#FFE3A0", mid: "#F2BC5A", lo: "#C98A2E" }, { rim: false, lx: 0.4, ly: 0.4 });
    const { T0, T1, T2 } = b.sommets;
    for (let i = 1; i < 8; i++) { const t = i / 8; d.trait(`M${T0[0] + (T1[0] - T0[0]) * t} ${T0[1] + (T1[1] - T0[1]) * t}l${T2[0] - T0[0]} ${T2[1] - T0[1]}`, "#C98A2E", 0.4, 0.8); }
    for (let i = 1; i < 5; i++) { const t = i / 5; d.trait(`M${T0[0] + (T2[0] - T0[0]) * t} ${T0[1] + (T2[1] - T0[1]) * t}l${T1[0] - T0[0]} ${T1[1] - T0[1]}`, "#C98A2E", 0.4, 0.8); }
    void k;
  }
});

E["boudoir"] = dessiner("boudoir", (d) => {
  const m = { hi: "#FFE6A8", mid: "#EDB45E", lo: "#B8772A", rim: "#965C1C", rimOp: 0.45 };
  const r = hasard(9);
  for (const [x1, y1, x2, y2] of [[4.6, 13.4, 26.4, 7.6], [5.6, 20.4, 27.4, 14.6], [4.6, 27.4, 26.4, 21.6]]) {
    const c = capsule(x1, y1, x2, y2, 3.1);
    d.vol(c, m, { lx: 0.3, ly: 0.25 });
    for (let i = 0; i < 16; i++) { const t = 0.05 + r() * 0.9; d.aplat(ell(x1 + (x2 - x1) * t + (r() - 0.5) * 3, y1 + (y2 - y1) * t + (r() - 0.6) * 3, 0.42, 0.32), "#FFFFFF", 0.95); }
  }
});

E["biscuit"] = dessiner("biscuit", (d) => {
  const m = { hi: "#FFE3A6", mid: "#EBB45E", lo: "#B97C2E", rim: "#9A6220", rimOp: 0.45 };
  for (const [dx, dy, t] of [[2.4, 3.4, 0.15], [0, 0, 0]]) {
    d.groupe(`transform="translate(${dx} ${dy}) rotate(-8 16 16)"`, () => {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const u = i / 40; const p = u < 0.25 ? [5 + u * 4 * 22, 7] : u < 0.5 ? [27, 7 + (u - 0.25) * 4 * 17] : u < 0.75 ? [27 - (u - 0.5) * 4 * 22, 24] : [5, 24 - (u - 0.75) * 4 * 17]; const ond = Math.sin(i * Math.PI) * 0.6; pts.push([p[0] + (u >= 0.25 && u < 0.5 ? ond : u >= 0.75 ? -ond : 0), p[1] + (u < 0.25 ? -ond : u >= 0.5 && u < 0.75 ? ond : 0)]); }
      const f = arrondi([[5, 7], [27, 7], [27, 24], [5, 24]], 2.4);
      d.vol(f, { ...m, hi: mix(m.hi, m.lo, t), mid: mix(m.mid, m.lo, t) }, { lx: 0.3, ly: 0.25 });
      d.trait(arrondi([[7.2, 9.2], [24.8, 9.2], [24.8, 21.8], [7.2, 21.8]], 1.6), "#D9963E", 0.5, 0.7);
      for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 5; c++) d.aplat(ell(10 + c * 3, 12.4 + r2 * 3.2, 0.45, 0.45), "#B07020", 0.85);
      void pts;
    });
  }
});

E["galette-riz"] = dessiner("galetteriz", (d) => {
  for (const [cy, t] of [[20.4, 0.18], [15.4, 0]]) {
    d.vol(`M3 ${cy}V${cy + 3.2}C3 ${cy + 7} 9 ${cy + 9.4} 16 ${cy + 9.4}C23 ${cy + 9.4} 29 ${cy + 7} 29 ${cy + 3.2}V${cy}Z`, { hi: "#F6E2BA", mid: "#E2C48A", lo: "#B8945A" }, { rim: false });
    const dessus = ell(16, cy, 13, 6.2);
    d.vol(dessus, { hi: mix("#FFFDF2", "#E8D2A6", t), mid: mix("#F6E8C8", "#D9BC86", t), lo: "#CDAE76", rim: "#B49460", rimOp: 0.4 }, { lx: 0.4, ly: 0.35 });
    const r = hasard(cy * 3);
    const cl = d.clip(dessus);
    d.brut(`<g clip-path="${cl}">`);
    for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()); const x = 16 + Math.cos(a) * 12 * k, y = cy + Math.sin(a) * 5.6 * k; d.aplat(ell(x, y, 1, 0.6, r() * 180), "#FFFFFF", 0.7); d.aplat(ell(x + 0.4, y + 0.35, 0.8, 0.4, r() * 180), "#D7B97E", 0.5); }
    d.brut("</g>");
  }
});

E["chips-mais"] = dessiner("chipsmais", (d) => {
  const m = { hi: "#FFE98A", mid: "#F2BC3A", lo: "#C9861A", rim: "#A86A10", rimOp: 0.45 };
  const r = hasard(12);
  for (const [cx, cy, deg, s] of [[11.4, 12, -20, 1], [21, 12.6, 25, 0.95], [16, 20.4, 0, 1.1], [8.6, 23, -50, 0.9], [23.8, 23.4, 45, 0.9]]) {
    d.groupe(`transform="rotate(${deg} ${cx} ${cy})"`, () => {
      const p = arrondi([[cx, cy - 7.4 * s], [cx + 6.6 * s, cy + 4.4 * s], [cx - 6.6 * s, cy + 4.4 * s]], 1.6);
      d.vol(p, m, { lx: 0.35, ly: 0.3 });
      for (let i = 0; i < 6; i++) d.aplat(ell(cx + (r() - 0.5) * 6 * s, cy + (r() - 0.2) * 5 * s, 0.35, 0.28), "#B8701A", 0.7);
    });
  }
});

E["pain-burger"] = dessiner("painburger", (d) => {
  const dore = { hi: "#FFD08A", mid: "#E58E3A", lo: "#A9561A", rim: "#8A4210", rimOp: 0.5 };
  d.vol("M3.4 22.4C3.4 20.8 4.8 19.8 6.6 19.8H25.4C27.2 19.8 28.6 20.8 28.6 22.4V24.4C28.6 27 25.6 28.8 22.6 28.8H9.4C6.4 28.8 3.4 27 3.4 24.4Z", dore, { lx: 0.3, ly: 0.2 });
  d.vol("M4.4 20.2H27.6V22H4.4Z", { hi: "#FFF6DE", mid: "#F6E2B4", lo: "#D9BC80" }, { rim: false });
  const dome = "M3 17.4C3 10 8.8 5.2 16 5.2C23.2 5.2 29 10 29 17.4C29 18.8 28 19.6 26.6 19.6H5.4C4 19.6 3 18.8 3 17.4Z";
  d.vol(dome, dore, { lx: 0.35, ly: 0.25 });
  d.reflet(dome, ell(11, 9.4, 4, 2, -20), 0.5, 0.6);
  const r = hasard(2);
  for (let i = 0; i < 14; i++) { const a = -2.6 + r() * 2.2, k = 0.4 + r() * 0.5; d.vol(feuille({ x: 16 + Math.cos(a) * 11 * k, y: 15 + Math.sin(a) * 9 * k, L: 1.4, W: 0.8, deg: r() * 360, ventre: 0.4, pointe: 0.4 }), { hi: "#FFFFFF", mid: "#FFF6DC", lo: "#E2D2A6" }, { rim: false }); }
});

E["pate-tarte"] = dessiner("patetarte", (d) => {
  d.vol("M2.6 13.2L22.6 9.4L29.4 22.2L9.4 26.8Z", { hi: "#FFFFFF", mid: "#F6F2EA", lo: "#DCD4C4", rim: "#C2B8A4", rimOp: 0.4 }, { lx: 0.3, ly: 0.2 });
  const pate = ell(15.6, 18, 10.6, 6.6, -10);
  d.vol(pate, { hi: "#FFF8DE", mid: "#F6E2A6", lo: "#D2B26A", rim: "#B8964E", rimOp: 0.45 }, { lx: 0.4, ly: 0.35 });
  d.trait(lisse([...Array(16)].map((_, i) => { const a = (i / 16) * Math.PI * 2; return [15.6 + Math.cos(a) * 9.6, 18 + Math.sin(a) * 5.8]; }).map(([x, y]) => [x + (y - 18) * 0.17, y])), "#FFFDF0", 0.5, 0.7);
  d.vol(capsule(6.6, 12.4, 25.6, 5.4, 2.1), M.bois, { lx: 0.3, ly: 0.2 });
  d.vol(capsule(3, 13.8, 6.4, 12.5, 0.9), M.boisFonce);
  d.vol(capsule(25.8, 5.4, 29.4, 4, 0.9), M.boisFonce);
  d.filet("M8 10.8L24.4 4.8", "#FFFFFF", 0.7, 0.6, 0.3);
});

export default E;
