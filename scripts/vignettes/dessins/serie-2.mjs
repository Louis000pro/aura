// Deuxième série : légumes dessinés, fromages, tofu, graines, protéine, légumineuses, bocaux.
import { M, dessiner, feuille, nervure, ell, capsule, arrondi, boite, lisse, hasard, mix } from "../kit.mjs";
import { bolDome, bocal } from "../modeles.mjs";
import { lireFluent } from "../fluent.mjs";

const B = {};

/* ── Chou-fleur : un dôme de bouquets crème dans ses feuilles ── */
B["chou-fleur"] = dessiner("choufleur", (d) => {
  const m = { hi: "#B7E68E", mid: "#4FA548", lo: "#25733B", rim: "#195C2D", rimOp: 0.5 };
  for (const o of [{ x: 5.4, y: 28.6, L: 16, W: 10, deg: -62 }, { x: 26.6, y: 28.6, L: 16, W: 10, deg: 62 }]) {
    d.vol(feuille({ ...o, ventre: 0.5, rond: 0.7 }), { ...m, hi: mix(m.hi, m.lo, 0.25) }, { lx: 0.4, ly: 0.3 });
    d.trait(nervure(o), "#D9F6C2", 0.5, 0.55);
  }
  const creme = { hi: "#FFFFFF", mid: "#FBF2D6", lo: "#E2CB93", rim: "#C9AE6E", rimOp: 0.45 };
  const bosses = [
    [16, 8.4, 4.4], [10.4, 10.6, 4.2], [21.6, 10.6, 4.2],
    [6.6, 15.4, 3.8], [12.8, 14.2, 4.4], [19.2, 14.2, 4.4], [25.4, 15.4, 3.8],
    [9.6, 19, 4], [16, 18.6, 4.4], [22.4, 19, 4],
  ];
  for (const [x, y, r] of bosses) {
    d.vol(ell(x, y, r, r * 0.92), creme, { lx: 0.35, ly: 0.3 });
    d.aplat(ell(x - r * 0.3, y - r * 0.32, r * 0.32, r * 0.24, -20), "#FFFFFF", 0.7);
  }
  for (const o of [{ x: 8.4, y: 30.4, L: 14, W: 9, deg: -28 }, { x: 23.6, y: 30.4, L: 14, W: 9, deg: 28 }, { x: 16, y: 31, L: 10, W: 8.4, deg: 0 }]) {
    d.vol(feuille({ ...o, ventre: 0.55, rond: 0.7 }), m, { lx: 0.4, ly: 0.2 });
    d.trait(nervure({ ...o, a: 0.7 }), "#E3FBCF", 0.5, 0.6);
  }
});

/* ── Courgette, avec une rondelle ── */
B["courgette"] = dessiner("courgette", (d) => {
  d.groupe('transform="rotate(-36 16 15)"', () => {
    const corps = capsule(4.2, 15, 25.4, 15, 4.7, 4);
    d.path(corps, d.lin([[0, "#4CA552"], [0.26, "#7FD27A"], [0.55, "#2F8340"], [1, "#174C27"]]));
    const cl = d.clip(corps);
    d.brut(`<g clip-path="${cl}">`);
    for (const y of [12.4, 15.2, 17.8]) d.trait(`M5 ${y}C10 ${y - 0.3} 18 ${y - 0.2} 26 ${y}`, "#A7E39A", 0.45, 0.35);
    const r = hasard(4);
    for (let i = 0; i < 22; i++) d.aplat(ell(5 + r() * 20, 11.5 + r() * 7, 0.35, 0.22), "#C9F2B8", 0.45);
    d.brut("</g>");
    d.vol(`M25.2 11.4C27.2 11.6 28.6 13.2 28.6 15C28.6 16.8 27.2 18.4 25.2 18.6C26 17.6 26.2 16.4 26.2 15C26.2 13.6 26 12.4 25.2 11.4Z`, { hi: "#E8F2C4", mid: "#A9C77E", lo: "#6E8F48", rim: "#56743A", rimOp: 0.4 });
    d.vol(capsule(27.8, 15, 30.6, 15, 1, 0.8), { hi: "#D9E2A8", mid: "#9DB06A", lo: "#6A7E42", rim: "#566A34", rimOp: 0.4 });
  });
  const tranche = ell(22.6, 25.4, 5.6, 3.9);
  d.path(`M17 25.4V26.6C17 28.8 19.5 30.4 22.6 30.4C25.7 30.4 28.2 28.8 28.2 26.6V25.4Z`, d.lin([[0, "#2F8340"], [1, "#174C27"]]));
  d.vol(tranche, { hi: "#2E8A3E", mid: "#2E8A3E", lo: "#1C5C2A" }, { rim: false });
  const chair = ell(22.6, 25.4, 4.9, 3.3);
  d.vol(chair, { hi: "#FFFFF0", mid: "#F4F3C9", lo: "#D6DC98", rim: "#B7C47A", rimOp: 0.4 }, { lx: 0.35, ly: 0.3 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; d.aplat(ell(22.6 + Math.cos(a) * 2.2, 25.4 + Math.sin(a) * 1.4, 0.42, 0.28, (a * 180) / Math.PI), "#D3D691", 0.9); }
});

/* ── Reblochon : une meule et sa part ── */
B["reblochon"] = dessiner("reblochon", (d) => {
  const croute = { hi: "#FFF3DA", mid: "#F5C789", lo: "#D69853", rim: "#B87638", rimOp: 0.45 };
  const flanc = { hi: "#F6C88C", mid: "#DA9B57", lo: "#A96C32", rim: "#8C5524", rimOp: 0.45 };
  const pate = { hi: "#FFFCEE", mid: "#FCEFC4", lo: "#EBCF88", rim: "#D8B567", rimOp: 0.35 };
  d.vol("M2.4 11.4V16.8C2.4 19.67 7.33 22 13.4 22C19.47 22 24.4 19.67 24.4 16.8V11.4C24.4 14.27 19.47 16.6 13.4 16.6C7.33 16.6 2.4 14.27 2.4 11.4Z", flanc, { ly: 0.1 });
  const dessus = ell(13.4, 11.4, 11, 5.2);
  d.vol(dessus, croute, { lx: 0.35, ly: 0.3 });
  d.trait("M5.4 11.2C6 8.8 9.6 7.2 13.4 7.2C17.4 7.2 20.8 8.8 21.4 11.2", "#FFF6E4", 0.5, 0.6);
  const r = hasard(9);
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.85; d.aplat(ell(13.4 + Math.cos(a) * 11 * k, 11.4 + Math.sin(a) * 5.2 * k, 0.4, 0.26), "#FFFFFF", 0.6); }
  // la part
  d.vol("M16.6 21.4L24.4 26.4V30.4L16.6 25.4Z", pate, { lx: 0.2, ly: 0.2 });
  d.vol("M24.4 26.4C28.3 24.6 30.1 21.8 29.6 18.8V22.8C30.1 25.8 28.3 28.6 24.4 30.4Z", flanc, { lx: 0.2 });
  d.vol("M16.6 21.4L29.6 18.8C30.1 21.8 28.3 24.6 24.4 26.4Z", croute, { lx: 0.4, ly: 0.3 });
  d.trait("M16.9 21.9L24.2 26.6", "#E2AE6C", 0.55, 0.9);
  d.trait("M16.9 24.9L24.2 29.9", "#D59A55", 0.55, 0.9);
  d.aplat(ell(19.6, 24.4, 0.9, 0.5, 34), "#FFFFFF", 0.7);
});

/* ── Chèvre : bûche et rondelle ── */
B["chevre"] = dessiner("chevre", (d) => {
  const pate = { hi: "#FFFFFF", mid: "#FBFAF3", lo: "#E7E3D2", rim: "#CFC9B2", rimOp: 0.4 };
  d.groupe('transform="rotate(-14 15 15)"', () => {
    const buche = "M21 9.6H3.2C1.75 9.6 0.6 12 0.6 15C0.6 18 1.75 20.4 3.2 20.4H21Z";
    d.path(buche, d.lin([[0, "#E4E1D6"], [0.3, "#FFFFFF"], [0.7, "#E8E5DA"], [1, "#B9B4A4"]]));
    const r = hasard(12);
    for (let i = 0; i < 30; i++) d.aplat(ell(2 + r() * 18, 10.4 + r() * 9.2, 0.32, 0.22), r() > 0.5 ? "#C9C5B6" : "#FFFFFF", 0.7);
    d.vol(ell(21, 15, 2.9, 5.4), pate, { lx: 0.3, ly: 0.3 });
    d.trait(lisse([...Array(16)].map((_, i) => [21 + Math.cos((i / 16) * Math.PI * 2) * 2.55, 15 + Math.sin((i / 16) * Math.PI * 2) * 4.95])), "#E6DFC6", 0.5, 0.9);
  });
  d.path("M18.4 25V26.6C18.4 28.5 20.9 30 24 30C27.1 30 29.6 28.5 29.6 26.6V25Z", d.lin([[0, "#FFFFFF"], [1, "#C9C4B2"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  d.vol(ell(24, 25, 5.6, 3.4), pate, { lx: 0.35, ly: 0.3 });
  d.trait(lisse([...Array(16)].map((_, i) => [24 + Math.cos((i / 16) * Math.PI * 2) * 5.1, 25 + Math.sin((i / 16) * Math.PI * 2) * 2.95])), "#E2DCC4", 0.55, 0.9);
});

/* ── Endive ── */
B["endive"] = dessiner("endive", (d) => {
  d.groupe('transform="rotate(34 16 17)"', () => {
    const remplir = (o) => {
      const f = feuille({ ...o, ventre: 0.42, rond: 0.72, pointe: 0.26 });
      d.path(f, d.lin([[0, "#D9E86A"], [0.24, "#EEF3B0"], [0.55, "#FFFFF0"], [1, "#FFFFFF"]]));
      d.path(f, d.rad([[0.66, "#B9C58A", 0], [1, "#A7B576", 0.55]], { cx: 0.5, cy: 0.45, r: 0.66 }));
      d.trait(nervure({ ...o, de: 0.04, a: 0.7 }), "#FFFFFF", 0.45, 0.9);
    };
    remplir({ x: 15.1, y: 30.6, L: 27.4, W: 11.6, deg: -6 });
    remplir({ x: 16.9, y: 30.6, L: 26.4, W: 11, deg: 7 });
    remplir({ x: 15.4, y: 30.8, L: 23.6, W: 9, deg: -4 });
    remplir({ x: 16.6, y: 30.8, L: 22.6, W: 8.6, deg: 5 });
    remplir({ x: 16, y: 31, L: 19.6, W: 6.2, deg: 0 });
  });
});

/* ── Tofu ── */
const facesTofu = {
  t: { hi: "#FFFFFF", mid: "#FFFDF4", lo: "#F1EAD3" },
  g: { hi: "#F8F3E4", mid: "#EBE3CA", lo: "#D7CCAA" },
  d: { hi: "#EEE7D2", mid: "#DED3B6", lo: "#C4B691" },
};
function bloc(d, x, y, l, p, h, graine) {
  const b = boite(x, y, l, p, h, 1);
  d.vol(b.gauche, facesTofu.g, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.droite, facesTofu.d, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.dessus, facesTofu.t, { rim: false, lx: 0.35, ly: 0.35 });
  const r = hasard(graine);
  const { B0, B1, B2, T0, T1, T2, T3 } = b.sommets;
  for (const q of [[B0, T0, T2, B2], [B0, B1, T1, T0], [T0, T1, T3, T2]]) for (let i = 0; i < 10; i++) {
    const u = 0.12 + r() * 0.76, v = 0.12 + r() * 0.76;
    d.aplat(ell(q[0][0] + (q[1][0] - q[0][0]) * u + (q[3][0] - q[0][0]) * v, q[0][1] + (q[1][1] - q[0][1]) * u + (q[3][1] - q[0][1]) * v, 0.24, 0.18), "#CDBF98", 0.55);
  }
}
B["tofu"] = dessiner("tofu", (d) => {
  bloc(d, 12.6, 25.6, 12.6, 9, 8.2, 2);
  bloc(d, 22.6, 30.4, 5.8, 5.8, 5.6, 6);
});

/* ── Graines de chia ── */
B["graines-chia"] = dessiner("grainechia", (d) => {
  const tons = ["#2D2B30", "#4F4C55", "#8C8994", "#D7D4DC", "#F4F2F6", "#6E6A75"];
  bolDome(d, {
    contenu: { hi: "#CFCCD5", mid: "#8F8B98", lo: "#5B5765", rim: "#433F4C", rimOp: 0.4 }, haut: 18.6, dome: 7.8, graine: 17,
    grain: { n: 170, dessin: (d, x, y, r) => d.aplat(ell(x, y, 0.36, 0.26, r() * 180), tons[Math.floor(r() * tons.length)], 0.95) },
  });
});

/* ── Protéine en poudre : pot et mesurette ── */
function proteine(nom, bande, poudre) {
  return dessiner(nom, (d) => {
    d.path("M3.6 7.6V27C3.6 28.6 7.4 30 12 30C16.6 30 20.4 28.6 20.4 27V7.6Z", d.lin([[0, "#4A4656"], [0.26, "#757083"], [0.62, "#36323F"], [1, "#1D1B25"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
    d.path("M3.6 14.6C3.6 16 7.4 17.2 12 17.2C16.6 17.2 20.4 16 20.4 14.6V21.8C20.4 23.2 16.6 24.4 12 24.4C7.4 24.4 3.6 23.2 3.6 21.8Z", d.lin([[0, bande.lo], [0.28, bande.hi], [0.62, bande.mid], [1, bande.lo]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
    d.trait("M5.2 19.2C7.2 20.4 16.8 20.4 18.8 19.2", "#FFFFFF", 0.5, 0.6);
    d.path("M3.1 4.4V7.6C3.1 9.1 7.1 10.3 12 10.3C16.9 10.3 20.9 9.1 20.9 7.6V4.4Z", d.lin([[0, "#5C586A"], [0.28, "#8C879C"], [0.65, "#45414F"], [1, "#2A2733"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
    for (let i = 0; i < 9; i++) { const x = 4.6 + i * 1.85; d.trait(`M${x} 5.4V8.6`, "#2A2733", 0.35, 0.6); }
    d.vol(ell(12, 4.4, 8.9, 2.3), { hi: "#A9A4B8", mid: "#6E697D", lo: "#4A4656", rim: "#34313E", rimOp: 0.4 }, { lx: 0.35, ly: 0.3 });
    d.filet("M5 11.6V26", "#FFFFFF", 0.8, 0.35, 0.4);
    // mesurette
    d.vol(capsule(27.4, 22.6, 31, 18.4, 0.95, 0.8), M.ceramique);
    d.vol("M18 23.2C18 26.8 20.4 29.2 23.4 29.2C26.4 29.2 28.8 26.8 28.8 23.2C27.2 24.4 19.6 24.4 18 23.2Z", M.ceramique, { ly: 0.15 });
    d.vol("M18.6 23.2C19.4 20.4 21.3 18.9 23.4 18.9C25.5 18.9 27.4 20.4 28.2 23.2C26.4 24.4 20.4 24.4 18.6 23.2Z", poudre, { lx: 0.35, ly: 0.2 });
    d.trait("M18.3 23.5C20.2 24.7 26.6 24.7 28.5 23.5", "#FFFFFF", 0.5, 0.8);
  });
}
B["proteine-vanille"] = proteine("protvanille", { hi: "#FFF7E2", mid: "#F2DEB0", lo: "#C9A866" }, { hi: "#FFFFFF", mid: "#FBF1DC", lo: "#E2CCA0", rim: "#C9AE7A", rimOp: 0.4 });
B["proteine-chocolat"] = proteine("protchoco", { hi: "#C99272", mid: "#8A5436", lo: "#5A321C" }, { hi: "#B98468", mid: "#76452F", lo: "#4A281A", rim: "#33180E", rimOp: 0.4 });

/* ── Légumineuses ── */
function legumineuse(nom, tons, contenu, graine) {
  return dessiner(nom, (d) => bolDome(d, {
    contenu, haut: 18.6, dome: 8, graine,
    grain: { n: 64, dessin: (d, x, y, r) => { const c = tons[Math.floor(r() * tons.length)]; const a = r() * 180; d.aplat(ell(x, y, 0.95, 0.68, a), c, 1); d.aplat(ell(x - 0.25, y - 0.2, 0.38, 0.22, a), "#FFFFFF", 0.45); } },
  }));
}
B["lentilles-vertes"] = legumineuse("lentvertes", ["#8F8A46", "#6E6A2F", "#A6A25F", "#7B7A3C"], { hi: "#A9A660", mid: "#7A773A", lo: "#535123", rim: "#3F3D18", rimOp: 0.4 }, 8);
B["lentilles-corail"] = legumineuse("lentcorail", ["#FF9C6C", "#EC7444", "#FFB68E", "#F48555"], { hi: "#FFB48E", mid: "#EE7A4C", lo: "#BF5530", rim: "#9C4024", rimOp: 0.4 }, 9);
B["pois-casses"] = legumineuse("poiscasses", ["#B8D85E", "#93BC3A", "#CDE68A", "#A4C94A"], { hi: "#CFE78F", mid: "#9CC244", lo: "#6D9124", rim: "#567419", rimOp: 0.4 }, 10);

/* ── Bocaux ── */
const emb = (fichier, s = 0.19) => (d, cx, cy) => d.inclure(lireFluent(fichier), `translate(${cx - 16 * s} ${cy - 16 * s}) scale(${s})`);
const grains = (c1, c2) => (d, cx, cy) => { for (const [dx, dy] of [[-1.8, -0.6], [0, 0.6], [1.8, -0.5], [-0.8, 1.6], [1, -1.6]]) { d.aplat(ell(cx + dx, cy + dy, 0.8, 0.8), c1); d.aplat(ell(cx + dx - 0.25, cy + dy - 0.25, 0.3, 0.3), c2, 0.9); } };
B["moutarde"] = dessiner("moutarde", (d) => bocal(d, { contenu: { hi: "#FFF27A", mid: "#EFC51C", lo: "#C7920A", rim: "#A87406", rimOp: 0.45 }, embleme: grains("#D9A21E", "#FFF1A6") }));
B["beurre-cacahuete"] = dessiner("pbutter", (d) => bocal(d, { contenu: { hi: "#F6CB8A", mid: "#D9974B", lo: "#A8682A", rim: "#87501C", rimOp: 0.45 }, embleme: emb("peanuts") }));
B["puree-noisette"] = dessiner("noisettebocal", (d) => bocal(d, { contenu: { hi: "#D6A27C", mid: "#9C6440", lo: "#6A3E22", rim: "#4E2A14", rimOp: 0.45 }, embleme: emb("chestnut", 0.17) }));
B["tahini"] = dessiner("tahini", (d) => bocal(d, { contenu: { hi: "#F8EBCF", mid: "#E2C99A", lo: "#BC9C66", rim: "#9C7D4A", rimOp: 0.45 }, embleme: grains("#EBD7AE", "#FFFFFF") }));
B["pesto"] = dessiner("pesto", (d) => bocal(d, { contenu: { hi: "#BFE27A", mid: "#6FA236", lo: "#3E6A1A", rim: "#2C5212", rimOp: 0.45 }, embleme: emb("herb", 0.2) }));
B["mayonnaise"] = dessiner("mayo", (d) => bocal(d, { contenu: { hi: "#FFFDF0", mid: "#FBF0C2", lo: "#E6D18A", rim: "#CDB46C", rimOp: 0.4 }, embleme: emb("egg", 0.17) }));
B["compote"] = dessiner("compote", (d) => bocal(d, { contenu: { hi: "#FFF0B8", mid: "#EDC970", lo: "#C39A3E", rim: "#A37D2C", rimOp: 0.45 }, embleme: emb("red_apple", 0.18) }));
B["pate-curry"] = dessiner("patecurry", (d) => bocal(d, { contenu: { hi: "#FF9C74", mid: "#E2502E", lo: "#A82E1A", rim: "#862312", rimOp: 0.45 }, embleme: emb("hot_pepper", 0.19) }));
B["confiture"] = dessiner("confiture", (d) => bocal(d, { contenu: { hi: "#FF8FA0", mid: "#D52C4A", lo: "#8E1530", rim: "#6E0E24", rimOp: 0.45 }, embleme: emb("strawberry", 0.18) }));

/* ── Lardons ── */
const viande = { t: { hi: "#FFC9C2", mid: "#F69A94", lo: "#DA716F" }, g: { hi: "#F48C88", mid: "#DE6567", lo: "#B54751" }, d: { hi: "#E2716F", mid: "#C5535B", lo: "#9C3A46" } };
const gras = { g: ["#FFF6F1", "#F2D8D0"], d: ["#F5E4DD", "#D9BDB3"] };
function lardon(d, x, y, s, graine) {
  const b = boite(x, y, s, s * 0.95, s * 0.88, 0.6);
  d.vol(b.gauche, viande.g, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.droite, viande.d, { rim: false, lx: 0.2, ly: 0.2 });
  const { B0, B1, B2, T0, T1, T2 } = b.sommets;
  const at = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
  for (const [face, P, Q, R, S] of [["g", B0, T0, B2, T2], ["d", B0, T0, B1, T1]]) {
    const a = 0.36, z = 0.6;
    const pts = [at(P, Q, a), at(P, Q, z), at(R, S, z), at(R, S, a)];
    d.path(arrondi(pts, 0.3), d.lin([[0, gras[face][0]], [1, gras[face][1]]]));
  }
  d.vol(b.dessus, viande.t, { rim: false, lx: 0.35, ly: 0.35 });
  void graine;
}
B["lardons"] = dessiner("lardons", (d) => {
  for (const [x, y] of [[11.4, 18.8], [19.8, 18.4], [7.2, 24.6], [15.6, 24], [24, 24.4], [11.4, 29.8], [19.8, 29.6]]) lardon(d, x, y, 5.2, x);
});

export default B;
