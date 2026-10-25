// Troisième série : légumes, fruits et fruits secs qui n'ont pas d'emoji.
import { M, dessiner, feuille, nervure, ell, capsule, arrondi, lisse, hasard, mix } from "../kit.mjs";
import { bolDome, sphere, assombrir } from "../modeles.mjs";

const S = {};

/* ── Feuilles ── */
S["epinards"] = dessiner("epinards", (d) => {
  const m = { hi: "#7DCB6A", mid: "#2E8B3D", lo: "#16582A", rim: "#0E4421", rimOp: 0.55 };
  const fs = [
    { b: [12.6, 23.4], L: 13, W: 9, deg: -56 }, { b: [19.4, 23.4], L: 13, W: 9, deg: 56 },
    { b: [14, 21.6], L: 15, W: 10, deg: -20 }, { b: [18, 21.6], L: 15, W: 10, deg: 22 },
  ];
  for (const f of fs) d.trait(`M16 30.8Q${(16 + f.b[0]) / 2} ${f.b[1] + 4} ${f.b[0]} ${f.b[1]}`, "#7FBF5E", 1.2);
  fs.forEach((f, i) => {
    const o = { x: f.b[0], y: f.b[1], L: f.L, W: f.W, deg: f.deg, ventre: 0.42, rond: 0.85, pointe: 0.16, plie: i % 2 ? -0.2 : 0.2 };
    d.vol(feuille(o), i < 2 ? assombrir(m, 0.15) : m, { lx: 0.4, ly: 0.2 });
    d.trait(nervure({ ...o, a: 0.85 }), "#CDEFC0", 0.5, 0.75);
    const a = (o.deg * Math.PI) / 180;
    for (const u of [0.3, 0.5, 0.68]) for (const s of [-1, 1]) {
      const px = o.x + Math.sin(a) * o.L * u, py = o.y - Math.cos(a) * o.L * u, b = a + s * 0.95;
      d.trait(`M${px} ${py}l${Math.sin(b) * o.W * 0.3} ${-Math.cos(b) * o.W * 0.3}`, "#B9E5AA", 0.32, 0.55);
    }
  });
});

S["jeunes-pousses"] = dessiner("pousses", (d) => {
  const roquette = { hi: "#8ED46E", mid: "#3C9640", lo: "#1F6129", rim: "#164C20", rimOp: 0.5 };
  const mache = { hi: "#C6F58C", mid: "#63BE3E", lo: "#2F842C", rim: "#22691F", rimOp: 0.5 };
  const rouge = { hi: "#E58AB0", mid: "#9C2F5E", lo: "#5E1336", rim: "#480C28", rimOp: 0.5 };
  const fs = [
    [{ x: 9.6, y: 25, L: 13, W: 6, deg: -64, dents: 3, prof: 0.42 }, roquette],
    [{ x: 22.4, y: 25.2, L: 13, W: 6, deg: 62, dents: 3, prof: 0.42 }, roquette],
    [{ x: 13.4, y: 23.4, L: 12.6, W: 7.6, deg: -28, dents: 4, prof: 0.2 }, rouge],
    [{ x: 18.6, y: 23.4, L: 12, W: 6.4, deg: 26, dents: 3, prof: 0.4 }, roquette],
    [{ x: 16, y: 24, L: 12.4, W: 8.6, deg: 2 }, mache],
    [{ x: 10.6, y: 27.6, L: 9.4, W: 7.4, deg: -94 }, mache],
    [{ x: 21.4, y: 27.6, L: 9.4, W: 7.4, deg: 96 }, mache],
    [{ x: 13.2, y: 28.6, L: 9, W: 7, deg: -38 }, mache],
    [{ x: 18.8, y: 28.6, L: 9, W: 7, deg: 40 }, rouge],
  ];
  for (const [o, m] of fs) {
    const f = { ventre: 0.55, rond: 0.8, pointe: 0.14, ...o };
    d.vol(feuille(f), m, { lx: 0.4, ly: 0.25 });
    d.trait(nervure({ ...f, a: 0.75 }), m === rouge ? "#F6C6DA" : "#E2FAD0", 0.4, 0.7);
  }
});

/* ── Choux : une pomme serrée, deux feuilles qui l'enveloppent, deux qui s'ouvrent dessous ── */
function chou(d, m, veine, exterieur) {
  for (const o of [{ x: 13.6, y: 23.4, L: 13.6, W: 12, deg: -118 }, { x: 18.4, y: 23.4, L: 13.6, W: 12, deg: 118 }]) {
    d.vol(feuille({ ...o, ventre: 0.5, rond: 0.65, pointe: 0.18 }), exterieur, { lx: 0.4, ly: 0.3 });
    d.trait(nervure({ ...o, a: 0.8 }), veine, 0.55, 0.75);
  }
  const tete = ell(16, 14.4, 10.4, 10.2);
  d.vol(tete, m, { lx: 0.35, ly: 0.22 });
  const cl = d.clip(tete);
  d.brut(`<g clip-path="${cl}">`);
  d.trait("M16 4.6C14.6 8 14.6 12 16 15", veine, 0.6, 0.6);
  const gauche = "M16 25C9.6 25 5.2 20.6 5.2 14.6C5.2 9.6 8.4 5.6 13.2 4.6C10.8 8.4 10.4 12.6 11.6 16.4C12.6 19.8 14.4 22.6 16 25Z";
  const droite = "M16 25C22.4 25 26.8 20.6 26.8 14.6C26.8 9.6 23.6 5.6 18.8 4.6C21.2 8.4 21.6 12.6 20.4 16.4C19.4 19.8 17.6 22.6 16 25Z";
  for (const p of [gauche, droite]) d.vol(p, assombrir(m, 0.08), { lx: 0.5, ly: 0.2, rimOp: 0.35 });
  for (const p of ["M15.4 24C11.4 21 8.4 16.6 8.6 11.4", "M15.2 24.2C12.8 22 11.2 19.4 10.8 16.6", "M16.6 24C20.6 21 23.6 16.6 23.4 11.4", "M16.8 24.2C19.2 22 20.8 19.4 21.2 16.6"]) d.trait(p, veine, 0.55, 0.7);
  d.brut("</g>");
  const devant = "M5 19.2C8 22.6 11.8 24 16 24C20.2 24 24 22.6 27 19.2C26.4 24.4 21.8 28.6 16 28.6C10.2 28.6 5.6 24.4 5 19.2Z";
  d.vol(devant, exterieur, { lx: 0.45, ly: 0.15 });
  for (const a of [-0.75, -0.3, 0.3, 0.75]) d.trait(`M16 28.2Q${16 + a * 5} 25.8 ${16 + a * 13.6} ${20.4 + Math.abs(a) * 1.4}`, veine, 0.5, 0.7);
  d.trait("M16 28.4V24.4", veine, 0.6, 0.75);
  d.reflet(tete, ell(10.8, 8.6, 3, 1.9, -30), 0.6, 0.55);
}
S["chou"] = dessiner("chou", (d) => chou(d, { hi: "#F6FDDC", mid: "#C8E59A", lo: "#86B65A", rim: "#6A9A42", rimOp: 0.45 }, "#F8FFE6", { hi: "#9FD27A", mid: "#4E9B3E", lo: "#2B6A2C", rim: "#1D5222", rimOp: 0.5 }));
S["chou-rouge"] = dessiner("chourouge", (d) => chou(d, { hi: "#F2C8F2", mid: "#9C48B4", lo: "#5A1F74", rim: "#45145C", rimOp: 0.5 }, "#F7DDF6", { hi: "#C680D4", mid: "#7A2E94", lo: "#4A1460", rim: "#390C4C", rimOp: 0.5 }));

S["pak-choi"] = dessiner("pakchoi", (d) => {
  const feuilleM = { hi: "#7BC86A", mid: "#2E8C3C", lo: "#185C2A", rim: "#104822", rimOp: 0.55 };
  const tige = { hi: "#FFFFFF", mid: "#EEF7DA", lo: "#BBD79A", rim: "#9BBF78", rimOp: 0.45 };
  const tiges = [{ deg: -24, x: 14.6 }, { deg: 24, x: 17.4 }, { deg: 0, x: 16 }];
  for (const t of tiges) {
    const o = { x: t.x, y: 30.6, L: 17, W: 6.6, deg: t.deg, ventre: 0.7, rond: 0.7, pointe: 0.05 };
    d.vol(feuille(o), tige, { lx: 0.35, ly: 0.3 });
    const a = (t.deg * Math.PI) / 180;
    const bx = t.x + Math.sin(a) * 13, by = 30.6 - Math.cos(a) * 13;
    const f = { x: bx, y: by + 2, L: 12.4, W: 10.4, deg: t.deg, ventre: 0.5, rond: 0.7, pointe: 0.12 };
    d.vol(feuille(f), t.deg === 0 ? feuilleM : assombrir(feuilleM, 0.12), { lx: 0.4, ly: 0.25 });
    d.trait(`M${t.x} 29.6L${bx + Math.sin(a) * 9} ${by - Math.cos(a) * 9}`, "#E9F7D6", 0.55, 0.8);
  }
});

S["haricots-verts"] = dessiner("haricotsverts", (d) => {
  const m = { hi: "#B7EC85", mid: "#4FAE3A", lo: "#2A7428", rim: "#1D5A1F", rimOp: 0.5 };
  const gousses = [[4.6, 23.6, 27.2, 8.8], [5.4, 26.6, 28, 12.4], [3.6, 20.4, 25.4, 5.6], [6.4, 29, 28.4, 16.2], [4.2, 17.8, 22.6, 3.2]];
  gousses.forEach(([x1, y1, x2, y2], i) => {
    const c = capsule(x1, y1, x2, y2, 1.25, 0.8);
    d.vol(c, i % 2 ? m : assombrir(m, 0.12), { lx: 0.3, ly: 0.2 });
    d.trait(`M${x1 + 1.6} ${y1 - 1}L${x2 - 1.6} ${y2 + 0.6}`, "#DDF8C4", 0.35, 0.7);
    d.trait(`M${x2 - 0.4} ${y2 + 0.2}l1.4 -1.2`, "#3E8A2E", 0.55);
  });
});

/* ── Racines ── */
S["betterave"] = dessiner("betterave", (d) => {
  const feuilleM = { hi: "#9DD87C", mid: "#3E9A40", lo: "#22682B", rim: "#184F21", rimOp: 0.5 };
  for (const o of [{ x: 13.4, y: 13, L: 12, W: 7, deg: -38 }, { x: 18.6, y: 13, L: 12, W: 7, deg: 36 }, { x: 16, y: 12.6, L: 12.6, W: 7.2, deg: 0 }]) {
    const a = (o.deg * Math.PI) / 180;
    d.trait(`M16 15.4L${o.x} ${o.y}`, "#B4245F", 1.2);
    const f = { ...o, x: o.x + Math.sin(a) * 1, y: o.y - Math.cos(a) * 1, ventre: 0.45, rond: 0.8 };
    d.vol(feuille(f), feuilleM, { lx: 0.4, ly: 0.25 });
    d.trait(nervure({ ...f, a: 0.85 }), "#E0457E", 0.55, 0.9);
  }
  const bulbe = "M16 14.6C21.6 14.6 25 18 25 22.2C25 25.8 22 28.4 18.4 29.2C17.4 29.4 16.6 30 16 31.4C15.4 30 14.6 29.4 13.6 29.2C10 28.4 7 25.8 7 22.2C7 18 10.4 14.6 16 14.6Z";
  d.vol(bulbe, { hi: "#F27BAE", mid: "#B11D58", lo: "#6A0D33", rim: "#510826", rimOp: 0.55 }, { lx: 0.32, ly: 0.25 });
  d.trait("M10.4 21.4C12 24.6 14.4 26.2 17 26.6", "#E2588F", 0.45, 0.6);
  d.aplat(ell(11.6, 18.6, 1.8, 1.1, -30), "#FFFFFF", 0.45);
});

S["butternut"] = dessiner("butternut", (d) => {
  const peau = { hi: "#FFEFC6", mid: "#F1BE74", lo: "#C98636", rim: "#A86A22", rimOp: 0.5 };
  d.groupe('transform="rotate(-30 13 16)"', () => {
    d.vol(arrondi([[12, 1.2], [14, 1.2], [14, 4.4], [12, 4.4]], 0.6), { hi: "#C9B27C", mid: "#8C7342", lo: "#5C4922", rim: "#433416", rimOp: 0.4 });
    const corps = "M10.8 4.6C11 3.5 15 3.5 15.2 4.6C15.8 9.4 16.4 13 17.8 15.8C19.8 18.2 20.6 20.8 20.6 23.4C20.6 27.6 17.2 30.6 13 30.6C8.8 30.6 5.4 27.6 5.4 23.4C5.4 20.8 6.2 18.2 8.2 15.8C9.6 13 10.2 9.4 10.8 4.6Z";
    d.vol(corps, peau, { lx: 0.3, ly: 0.25 });
    d.trait("M12 6.6C11.8 10.6 10.8 14 9.2 16.6", "#FFFFFF", 0.7, 0.55);
  });
  // la moitié coupée : chair orange et creux des graines
  d.vol(ell(23.4, 23.4, 6.4, 7.6, 12), peau);
  const chair = ell(23.4, 23.4, 5.5, 6.7, 12);
  d.vol(chair, { hi: "#FFD27A", mid: "#F8A13A", lo: "#D9741A", rim: "#BA5C10", rimOp: 0.4 }, { lx: 0.4, ly: 0.3 });
  d.vol(ell(23.9, 25.4, 2.6, 3.4, 12), { hi: "#FFE8B0", mid: "#F5C46C", lo: "#D9973E" }, { rim: false });
  for (const [x, y] of [[23.2, 24], [24.6, 24.6], [23.4, 26.4], [24.8, 26.8]]) d.aplat(ell(x, y, 0.75, 0.42, 30), "#FFF6DC", 1);
});

S["celeri-rave"] = dessiner("celerirave", (d) => {
  for (const [x, deg] of [[13.2, -16], [16, 0], [18.8, 18]]) d.vol(capsule(x, 9, x + Math.sin((deg * Math.PI) / 180) * 7, 9 - Math.cos((deg * Math.PI) / 180) * 7, 1.15, 0.9), { hi: "#B8E08E", mid: "#5FA545", lo: "#336E2A", rim: "#25561F", rimOp: 0.45 });
  const r = hasard(13);
  const pts = [];
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, k = 10.4 + (r() - 0.5) * 1.3; pts.push([16 + Math.cos(a) * k, 19.6 + Math.sin(a) * k * 0.92]); }
  const racine = lisse(pts);
  d.vol(racine, { hi: "#F6EBD2", mid: "#D6BE90", lo: "#9C8253", rim: "#7C653C", rimOp: 0.5 }, { lx: 0.33, ly: 0.25 });
  for (let i = 0; i < 14; i++) d.aplat(ell(9 + r() * 14, 13 + r() * 13, 0.9, 0.5, r() * 180), r() > 0.5 ? "#B59B6A" : "#FFF7E6", 0.5);
  for (const [x, l] of [[12.6, 3], [15.4, 3.6], [18.6, 2.8], [21, 2]]) d.trait(`M${x} 28.8q${(x - 16) * 0.2} ${l * 0.6} ${(x - 16) * 0.3} ${l}`, "#9C8253", 0.5, 0.9);
});

S["navet"] = dessiner("navet", (d) => {
  const feuilleM = { hi: "#9DD87C", mid: "#3E9A40", lo: "#22682B", rim: "#184F21", rimOp: 0.5 };
  for (const o of [{ x: 14.4, y: 10.4, L: 10, W: 6.6, deg: -30 }, { x: 17.6, y: 10.4, L: 10, W: 6.6, deg: 32 }, { x: 16, y: 10, L: 10.6, W: 6.8, deg: 0 }]) {
    d.trait(`M16 12.6L${o.x} ${o.y}`, "#5E9C4A", 1);
    d.vol(feuille({ ...o, ventre: 0.45, rond: 0.8, dents: 4, prof: 0.18 }), feuilleM, { lx: 0.4, ly: 0.25 });
    d.trait(nervure(o), "#DDF6CC", 0.45, 0.7);
  }
  const bulbe = "M16 12.4C22 12.4 25.4 16.4 25.4 21C25.4 25.2 21.6 28.4 17.8 29C17 29.2 16.5 30 16 31.6C15.5 30 15 29.2 14.2 29C10.4 28.4 6.6 25.2 6.6 21C6.6 16.4 10 12.4 16 12.4Z";
  d.path(bulbe, d.lin([[0, "#A9469E"], [0.38, "#D99AD2"], [0.56, "#FFFFFF"], [1, "#EEE8DE"]]));
  d.path(bulbe, d.rad([[0.62, "#9C8AA8", 0], [1, "#7C6A88", 0.5]], { cx: 0.5, cy: 0.45, r: 0.66 }));
  d.aplat(ell(11.4, 16.8, 2, 1.2, -30), "#FFFFFF", 0.55);
});

S["fenouil"] = dessiner("fenouil", (d) => {
  const vert = { hi: "#C5EBA2", mid: "#79BA55", lo: "#46833A", rim: "#356B2B", rimOp: 0.45 };
  for (const [x2, y2] of [[9.4, 7.4], [16, 5.2], [22.6, 7.4]]) {
    d.vol(capsule(16 + (x2 - 16) * 0.25, 19, x2, y2, 1.5, 1), vert, { lx: 0.3, ly: 0.3 });
    for (let k = 0; k < 7; k++) { const a = -1.2 + (k / 6) * 2.4; d.trait(`M${x2} ${y2}l${Math.sin(a) * 3.4} ${-Math.cos(a) * 3.4}`, "#6DBF4A", 0.42); }
  }
  const bulbe = "M16 15.6C21.6 15.6 26.4 19.6 26.4 23.6C26.4 27.4 22 29.8 16 29.8C10 29.8 5.6 27.4 5.6 23.6C5.6 19.6 10.4 15.6 16 15.6Z";
  d.vol(bulbe, { hi: "#FFFFFF", mid: "#EEF4D8", lo: "#C3D59A", rim: "#A2B97A", rimOp: 0.45 }, { lx: 0.35, ly: 0.25 });
  for (const p of ["M9 26.6C8.4 22.6 11.4 18.6 16 17.4", "M23 26.6C23.6 22.6 20.6 18.6 16 17.4", "M12.6 28.4C12.2 24.6 13.6 21 16 19.4C18.4 21 19.8 24.6 19.4 28.4"]) d.trait(p, "#D2DFB2", 0.55, 0.9);
  d.trait("M7.6 23.8C7.8 21.4 9.6 19.4 11.8 18.2", "#FFFFFF", 0.7, 0.8);
});

S["oignon-nouveau"] = dessiner("oignonnouv", (d) => {
  const vert = { hi: "#A9E08A", mid: "#45A34A", lo: "#25703A", rim: "#1A5A2E", rimOp: 0.5 };
  for (const [bx, by, k] of [[9.4, 24.6, 0], [14.6, 27.4, 1]]) {
    for (const [dx, dy] of [[17, -19.4], [15.4, -15.4]]) {
      const c = capsule(bx + 1.6, by - 2.4, bx + dx, by + dy, 1.35, 0.9);
      d.path(c, d.lin([[0, "#F2F9E4"], [0.22, "#9DD07A"], [1, "#2E8040"]], { x1: 0, y1: 1, x2: 1, y2: 0 }));
    }
    d.vol(ell(bx, by, 3.4, 3.6, -35), { hi: "#FFFFFF", mid: "#F3F2E6", lo: "#CFCBB4", rim: "#B3AE94", rimOp: 0.45 }, { lx: 0.35, ly: 0.3 });
    for (const t of [-0.6, 0, 0.6]) d.trait(`M${bx - 2.2} ${by + 2.4}l${-1.4 + t} ${1.6 + Math.abs(t)}`, "#CFC4A0", 0.45, 0.9);
    void k;
  }
});

S["pousses-soja"] = dessiner("poussessoja", (d) => {
  const r = hasard(29);
  for (let i = 0; i < 11; i++) {
    const x1 = 6 + r() * 16, y1 = 25 + r() * 5, x2 = 5 + r() * 22, y2 = 5 + r() * 11, cx = (x1 + x2) / 2 + (r() - 0.5) * 9;
    const p = `M${x1} ${y1}Q${cx} ${(y1 + y2) / 2} ${x2} ${y2}`;
    d.trait(p, "#CFC4A0", 2.3);
    d.trait(p, "#FFFDF2", 1.55);
    d.trait(p, "#FFFFFF", 0.5, 0.9);
    d.trait(`M${x1} ${y1}l${(r() - 0.5) * 2} 2.6`, "#B39C6C", 0.5);
    d.vol(ell(x2, y2, 1.55, 1.05, -40 + r() * 80), { hi: "#FBFBB8", mid: "#E4E26A", lo: "#B3B23A", rim: "#93922A", rimOp: 0.4 });
  }
});

S["citronnelle"] = dessiner("citronnelle", (d) => {
  for (const [x1, y1, x2, y2] of [[5, 27.8, 22.6, 4.4], [8.4, 29.6, 26.6, 7.6], [4.4, 24, 18.6, 2.8]]) {
    const c = capsule(x1, y1, x2, y2, 1.9, 1.3);
    d.path(c, d.lin([[0, "#FBF6DA"], [0.45, "#E2EDB0"], [0.75, "#A9CE6E"], [1, "#6EA842"]], { x1: 0, y1: 1, x2: 1, y2: 0 }));
    d.trait(`M${x1 + 1} ${y1 - 1.4}L${x2 - 1} ${y2 + 1.2}`, "#FFFFFF", 0.45, 0.6);
    d.vol(ell(x1, y1, 1.9, 1.9), { hi: "#F6EED0", mid: "#E2D6A8", lo: "#B9AA78" }, { rim: false });
    d.aplat(ell(x1, y1, 1.1, 1.1), "#EDE4BE", 1);
  }
});

S["capres"] = dessiner("capres", (d) => {
  bolDome(d, {
    contenu: { hi: "#AFC27A", mid: "#6E8240", lo: "#435222", rim: "#323D18", rimOp: 0.4 }, haut: 18.6, dome: 7, graine: 41,
    grain: { n: 34, dessin: (d, x, y, r) => { d.vol(ell(x, y, 1.15, 1.05), { hi: "#C7D98E", mid: "#7A9040", lo: "#4A5A22" }, { rim: false }); d.aplat(ell(x - 0.35, y - 0.35, 0.35, 0.25), "#FFFFFF", 0.6); } },
  });
});

/* ── Fruits ── */
S["grenade"] = dessiner("grenade", (d) => {
  const peau = { hi: "#FF9C9C", mid: "#DE3450", lo: "#97152F", rim: "#7A0F25", rimOp: 0.5 };
  d.vol("M10.6 6.6L11.4 3.4L12.8 5.6L14.2 3.2L15.2 5.8L16.6 3.8L16.8 7.4Z", { hi: "#E5707E", mid: "#A82440", lo: "#6E1229" }, { rim: false });
  sphere(d, 13.4, 14.4, 9, peau);
  const moitie = ell(21.4, 22.6, 8.6, 7.8);
  d.vol(moitie, peau);
  d.vol(ell(21.4, 22.6, 7.4, 6.6), { hi: "#FFF4EA", mid: "#F6E2CE", lo: "#DCC1A2", rim: "#C9A88A", rimOp: 0.4 }, { rim: false });
  const r = hasard(8);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.88;
    const x = 21.4 + Math.cos(a) * 6.6 * k, y = 22.6 + Math.sin(a) * 5.8 * k;
    d.aplat(ell(x, y, 0.85, 0.7, r() * 180), r() > 0.3 ? "#D0173F" : "#A80E30", 1);
    d.aplat(ell(x - 0.25, y - 0.25, 0.28, 0.2), "#FFFFFF", 0.7);
  }
});

S["framboise"] = dessiner("framboise", (d) => {
  const m = { hi: "#FFB3C6", mid: "#E33A64", lo: "#9F1239", rim: "#7E0C2C", rimOp: 0.4 };
  d.vol(ell(16, 19.6, 10.6, 10.4), { hi: "#C42A52", mid: "#9C1238", lo: "#6A0A24" }, { rim: false });
  const grains = [];
  for (let rang = 0; rang < 7; rang++) {
    const y = 10.6 + rang * 3, demi = Math.sqrt(Math.max(0, 1 - Math.pow((y - 19.4) / 11, 2))) * 9.6;
    const n = Math.max(1, Math.round((demi * 2) / 3));
    for (let i = 0; i <= n; i++) grains.push([16 - demi + (i * 2 * demi) / n + (rang % 2) * 0.8, y]);
  }
  for (const [x, y] of grains) sphere(d, x, y, 2.05, m, { brillance: 0.6 });
  for (const deg of [-70, -30, 12, 52]) d.vol(feuille({ x: 16, y: 9.6, L: 5.8, W: 3, deg, ventre: 0.45 }), { hi: "#B6E68C", mid: "#4FA43C", lo: "#2A6E26" }, { rim: false });
  d.vol(capsule(16, 8.8, 17.6, 3.6, 0.75), { hi: "#B6E68C", mid: "#4FA43C", lo: "#2A6E26" }, { rim: false });
});

S["fruit-passion"] = dessiner("passion", (d) => {
  const peau = { hi: "#D89AD8", mid: "#7E2D7C", lo: "#461344", rim: "#350C34", rimOp: 0.5 };
  const entier = sphere(d, 11.6, 12.6, 8.6, peau);
  const r = hasard(5);
  for (let i = 0; i < 14; i++) d.aplat(ell(5 + r() * 13, 6 + r() * 13, 0.35, 0.25), "#E6B4E4", 0.5);
  void entier;
  d.vol(ell(20.6, 21.8, 8.8, 7.8), peau);
  d.vol(ell(20.6, 21.8, 7.8, 6.8), { hi: "#FFFDF0", mid: "#F2EED8", lo: "#D7CFAE" }, { rim: false });
  const pulpe = ell(20.6, 21.8, 6.4, 5.5);
  d.vol(pulpe, { hi: "#FFE98A", mid: "#F6B92A", lo: "#CC8510", rim: "#A86A08", rimOp: 0.45 }, { lx: 0.4, ly: 0.35 });
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.8; d.aplat(ell(20.6 + Math.cos(a) * 5.6 * k, 21.8 + Math.sin(a) * 4.7 * k, 0.6, 0.45, r() * 180), "#2A1A0E", 0.9); }
  d.reflet(pulpe, ell(18.4, 19.6, 2.2, 1.2, -20), 0.6, 0.5);
});

S["pamplemousse"] = dessiner("pamplemousse", (d) => {
  const peau = { hi: "#FFE7AE", mid: "#FBB066", lo: "#DD7440", rim: "#C25A35", rimOp: 0.45 };
  sphere(d, 12, 12.6, 9.2, peau);
  d.vol(ell(20.6, 22, 9.2, 8), peau);
  d.vol(ell(20.6, 22, 8.2, 7), { hi: "#FFFFFF", mid: "#FFF4E6", lo: "#EBD3BA" }, { rim: false });
  const chair = ell(20.6, 22, 7.1, 6);
  d.vol(chair, { hi: "#FFC2B4", mid: "#F2706A", lo: "#C6404D", rim: "#A52E3E", rimOp: 0.4 }, { lx: 0.4, ly: 0.35 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; d.trait(`M20.6 22L${20.6 + Math.cos(a) * 7.1} ${22 + Math.sin(a) * 6}`, "#FFE4DE", 0.5, 0.95); }
  d.aplat(ell(20.6, 22, 1.1, 0.9), "#FFF0EA", 1);
  d.reflet(chair, ell(18, 19.4, 2.4, 1.2, -20), 0.5, 0.5);
});

S["datte"] = dessiner("datte", (d) => {
  const m = { hi: "#D48A58", mid: "#7E3A1C", lo: "#47190A", rim: "#330F05", rimOp: 0.5 };
  for (const [cx, cy, deg] of [[11.6, 18.6, -38], [20.4, 15.4, -22], [16.6, 24.4, -8]]) {
    const f = ell(cx, cy, 8.4, 4, deg);
    d.vol(f, m, { lx: 0.3, ly: 0.3 });
    const a = (deg * Math.PI) / 180;
    for (const t of [-0.5, 0, 0.5]) d.trait(`M${cx - Math.cos(a) * 6 + Math.sin(a) * t * 3} ${cy - Math.sin(a) * 6 - Math.cos(a) * t * 3}Q${cx} ${cy + t * 1.5} ${cx + Math.cos(a) * 6 + Math.sin(a) * t * 3} ${cy + Math.sin(a) * 6 - Math.cos(a) * t * 3}`, "#B06A40", 0.35, 0.6);
    d.reflet(f, ell(cx - Math.cos(a) * 2, cy - 1.8, 3.4, 0.9, deg), 0.6, 0.4);
  }
});

S["abricots-secs"] = dessiner("abricotssecs", (d) => {
  const m = { hi: "#FFD08A", mid: "#F2902E", lo: "#B85A12", rim: "#96460C", rimOp: 0.45 };
  const r = hasard(17);
  for (const [cx, cy, rx, ry, deg] of [[11.4, 13.6, 7.6, 6.4, -20], [21.2, 15.6, 7, 6, 15], [15.6, 23.4, 8.2, 6.6, 5]]) {
    const pts = [];
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, k = 1 + (r() - 0.5) * 0.12; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    const f = lisse(pts);
    d.groupe(`transform="rotate(${deg} ${cx} ${cy})"`, () => {
      d.vol(f, m, { lx: 0.35, ly: 0.3 });
      for (const t of [-0.45, 0.05, 0.5]) d.trait(`M${cx - rx * 0.6} ${cy + t * ry}Q${cx} ${cy + t * ry - 1.4} ${cx + rx * 0.6} ${cy + t * ry + 0.4}`, "#D9701E", 0.45, 0.65);
      d.aplat(ell(cx - rx * 0.35, cy - ry * 0.4, rx * 0.25, ry * 0.15), "#FFFFFF", 0.45);
    });
  }
});

/* ── Fruits secs ── */
const peauAmande = { hi: "#ECB582", mid: "#B46F3A", lo: "#7A421E", rim: "#5C2F12", rimOp: 0.5 };
function amande(d, cx, cy, deg, k = 1) {
  const o = { x: cx, y: cy + 6.2 * k, L: 12.4 * k, W: 7.6 * k, deg, ventre: 0.38, rond: 0.85, pointe: 0.3 };
  d.vol(feuille(o), peauAmande, { lx: 0.35, ly: 0.3 });
  const a = (deg * Math.PI) / 180;
  for (const t of [-0.25, 0, 0.25]) {
    const p0 = [o.x + Math.cos(a) * t * 5 * k + Math.sin(a) * 2 * k, o.y + Math.sin(a) * t * 5 * k - Math.cos(a) * 2 * k];
    d.trait(`M${p0[0]} ${p0[1]}q${Math.sin(a) * 4 * k + t} ${-Math.cos(a) * 4 * k} ${Math.sin(a) * 8 * k} ${-Math.cos(a) * 8 * k}`, "#E1A170", 0.32, 0.6);
  }
}
S["amande"] = dessiner("amande", (d) => {
  amande(d, 10.6, 12.6, -28);
  amande(d, 21.4, 12, 24);
  amande(d, 16, 19.4, 4, 1.05);
});

const coque = { hi: "#E3A874", mid: "#A2602E", lo: "#5E3214", rim: "#45230C", rimOp: 0.5 };
function noisette(d, cx, cy, r) {
  const f = `M${cx} ${cy - r * 1.18}C${cx + r * 0.7} ${cy - r * 1.05} ${cx + r} ${cy - r * 0.35} ${cx + r} ${cy + r * 0.2}C${cx + r} ${cy + r * 0.85} ${cx + r * 0.55} ${cy + r} ${cx} ${cy + r}C${cx - r * 0.55} ${cy + r} ${cx - r} ${cy + r * 0.85} ${cx - r} ${cy + r * 0.2}C${cx - r} ${cy - r * 0.35} ${cx - r * 0.7} ${cy - r * 1.05} ${cx} ${cy - r * 1.18}Z`;
  d.vol(f, coque, { lx: 0.32, ly: 0.25 });
  d.vol(`M${cx - r * 0.92} ${cy + r * 0.42}C${cx - r * 0.6} ${cy + r * 0.2} ${cx + r * 0.6} ${cy + r * 0.2} ${cx + r * 0.92} ${cy + r * 0.42}C${cx + r * 0.78} ${cy + r * 0.92} ${cx + r * 0.4} ${cy + r} ${cx} ${cy + r}C${cx - r * 0.4} ${cy + r} ${cx - r * 0.78} ${cy + r * 0.92} ${cx - r * 0.92} ${cy + r * 0.42}Z`, { hi: "#FFF1D8", mid: "#E2C79A", lo: "#B49464" }, { rim: false });
  d.aplat(ell(cx - r * 0.35, cy - r * 0.45, r * 0.22, r * 0.32, 20), "#FFFFFF", 0.55);
}
S["noisette"] = dessiner("noisette", (d) => {
  noisette(d, 10.6, 12.8, 6.2);
  noisette(d, 21.6, 14, 6);
  noisette(d, 16, 22.6, 6.6);
});

S["noix"] = dessiner("noix", (d) => {
  const brou = { hi: "#F3D6A6", mid: "#C79A62", lo: "#875E30", rim: "#6B4822", rimOp: 0.5 };
  const n = sphere(d, 12.6, 13.4, 9.4, brou, { brillance: 0.35 });
  d.trait("M12.6 4.2C10.6 8 10.6 18.8 12.6 22.6", "#9C7340", 0.7, 0.9);
  const r = hasard(4);
  for (let i = 0; i < 12; i++) { const x = 5 + r() * 15, y = 6 + r() * 14; d.trait(`M${x} ${y}q${1.4} ${-0.8} ${2.4} ${0.4}`, "#A47A46", 0.45, 0.7); }
  void n;
  const cerneau = { hi: "#F2C88C", mid: "#C2843E", lo: "#7E4E1C", rim: "#5E3812", rimOp: 0.45 };
  const c = "M14 24.6C14 20.6 17 18.6 20.4 19.4C21.6 18 24.6 18 25.8 19.8C28.4 20 29.6 22.4 28.8 24.8C29.8 26.6 28.6 29.4 26 29.4C24.6 30.6 21.6 30.6 20.4 29.4C17.4 30.2 14 28.6 14 24.6Z";
  d.vol(c, cerneau, { lx: 0.35, ly: 0.3 });
  for (const p of ["M16.4 25C18 23.4 20 23.6 21.4 24.8", "M21.6 21.6C22.4 23.6 22.6 26 21.6 28", "M23.4 24.6C25 23.2 26.8 23.4 27.8 25"]) d.trait(p, "#8A5A24", 0.5, 0.9);
});

export default S;
