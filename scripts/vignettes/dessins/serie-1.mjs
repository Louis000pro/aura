// Première série : bouteilles, moulin, herbes, pots, sucre, cannelle, vanille, épices, farine, poireau.
import { M, dessiner, feuille, nervure, ell, capsule, arrondi, boite, lisse, hasard, mix } from "../kit.mjs";
import { bouteille, bolDome, poudre, brin, grappePersil, pot, cube } from "../modeles.mjs";

const A = {};

A["huile-olive"] = dessiner("huileolive", (d) => {
  bouteille(d, { cx: 12.6, liquide: M.huile, haut: 13.2 });
  d.trait("M28.6 30.4C25.8 27.6 23.6 25 20.4 21.2", "#6F8C3A", 0.8);
  for (const o of [{ x: 22.2, y: 23.4, L: 7.4, W: 2.4, deg: -64 }, { x: 25.4, y: 27.2, L: 6.6, W: 2.2, deg: 12 }, { x: 23.6, y: 25.2, L: 6.4, W: 2.2, deg: -150 }]) {
    d.vol(feuille({ ...o, ventre: 0.45, rond: 0.8 }), M.oliveFonce, { rimOp: 0.4 });
    d.trait(nervure(o), "#D7E5A6", 0.3, 0.6);
  }
  d.vol(ell(21.6, 27.1, 2.25, 2.85, 25), M.olive);
  d.reflet(ell(21.6, 27.1, 2.25, 2.85, 25), ell(20.8, 26, 0.7, 1, 25), 0.85, 0.25);
  d.vol(ell(25.9, 23.4, 2.05, 2.6, -18), M.olive);
  d.reflet(ell(25.9, 23.4, 2.05, 2.6, -18), ell(25.2, 22.4, 0.65, 0.9, -18), 0.85, 0.25);
});

A["huile"] = dessiner("huile", (d) => {
  bouteille(d, { cx: 14, liquide: { hi: "#FFF6B0", mid: "#F7CE3A", lo: "#C99312", rim: "#A87508", rimOp: 0.5 }, haut: 13.2 });
  const goutte = "M24.6 20.4C24.6 20.4 21.6 24.2 21.6 26.2C21.6 27.9 22.95 29.2 24.6 29.2C26.25 29.2 27.6 27.9 27.6 26.2C27.6 24.2 24.6 20.4 24.6 20.4Z";
  d.vol(goutte, M.dore, { lx: 0.35, ly: 0.35 });
  d.reflet(goutte, ell(23.4, 26.2, 0.55, 1.1, 15), 0.9, 0.25);
});

A["vinaigre"] = dessiner("vinaigre", (d) => {
  bouteille(d, { cx: 16, liquide: M.vin, haut: 14.2, bouchon: "noir" });
  d.vol(arrondi([[10.9, 18.6], [21.1, 18.6], [21.1, 24.4], [10.9, 24.4]], 0.6), { hi: "#FFFDF6", mid: "#F6EBD4", lo: "#DCC7A0", rim: "#BFA67A", rimOp: 0.35 });
  d.vol(ell(16, 21.5, 1.9, 1.9), M.vin, { rim: false });
});

A["poivre"] = dessiner("poivre", (d) => {
  const cx = 13;
  d.vol("M8.6 27H17.4V28.4C17.4 29.3 16.7 30 15.8 30H10.2C9.3 30 8.6 29.3 8.6 28.4Z", M.boisFonce);
  d.vol(`M9.8 11.8H16.2C16.2 14.3 15.3 15.8 15.3 18.3C15.3 21.8 17.2 23.6 17.2 27.2H8.8C8.8 23.6 10.7 21.8 10.7 18.3C10.7 15.8 9.8 14.3 9.8 11.8Z`, M.boisFonce, { lx: 0.25, ly: 0.25 });
  d.reflet(`M9.8 11.8H16.2C16.2 14.3 15.3 15.8 15.3 18.3C15.3 21.8 17.2 23.6 17.2 27.2H8.8C8.8 23.6 10.7 21.8 10.7 18.3C10.7 15.8 9.8 14.3 9.8 11.8Z`, "M10.7 13.3C11.3 15 11.5 17 11.4 19.2C11.3 21.4 10.5 23.4 10.2 26", 0, 0.1);
  d.filet("M11 13.2C11.6 15 11.8 17 11.7 19.2C11.6 21.4 10.8 23.4 10.5 25.8", "#fff", 0.75, 0.55, 0.3);
  d.vol(arrondi([[9.2, 10.6], [16.8, 10.6], [16.8, 12.2], [9.2, 12.2]], 0.5), M.acier);
  d.vol(`M9.4 10.9C9.4 7.3 11 5.3 ${cx} 5.3C15 5.3 16.6 7.3 16.6 10.9Z`, M.boisFonce, { lx: 0.3, ly: 0.2 });
  d.filet("M10.8 9.6C11 8 11.8 6.8 12.8 6.4", "#fff", 0.7, 0.6, 0.25);
  d.vol(ell(cx, 4.2, 1.5, 1.4), M.acier);
  for (const [x, y] of [[21.4, 27.6], [24.8, 28.3], [23, 24.9], [26.6, 25.4]]) {
    d.vol(ell(x, y, 1.6, 1.55), M.noir, { lx: 0.3, ly: 0.25 });
    d.aplat(ell(x - 0.55, y - 0.55, 0.45, 0.35), "#fff", 0.6);
  }
});

A["yaourt"] = dessiner("yaourt", (d) => {
  d.vol(capsule(18.6, 10.4, 26.2, 2.6, 0.95, 0.85), M.acier);
  pot(d, { top: 11.6, bande: { hi: "#D9F0FF", mid: "#8CC8F5", lo: "#4E97DB", rim: "#3B7FC4", rimOp: 0.4 }, bandeY: [18, 23] });
  d.vol(ell(16, 11.6, 9, 2.45), { ...M.ceramique, hi: "#F2EEF7", mid: "#E2DBEC", lo: "#C8BFD6" }, { rim: false });
  d.vol("M8.2 11.5C9.2 9.2 12 8.4 16 8.4C20 8.4 22.8 9.2 23.8 11.5C21 13 11 13 8.2 11.5Z", M.creme, { lx: 0.4, ly: 0.1 });
  d.trait("M11.2 10.4C13.2 9.4 17 9.3 19.6 10.2C18 10.9 14.5 11 13.2 10.6", "#E7D7BC", 0.45, 0.8);
  d.vol(capsule(17.4, 9.9, 19.4, 7.6, 1.15, 0.9), M.acier, { rim: false });
});

A["creme"] = dessiner("creme", (d) => {
  pot(d, { top: 14.4, bot: 29.6, wTop: 11, wBot: 9.6, bande: { hi: "#FFF8DA", mid: "#FCE7A8", lo: "#EBC56A", rim: "#D7A84B", rimOp: 0.35 }, bandeY: [20, 24.5] });
  d.vol(ell(16, 14.4, 11, 2.7), { ...M.ceramique, hi: "#F2EEF7", mid: "#E2DBEC", lo: "#C8BFD6" }, { rim: false });
  const dome = "M6.4 14.4C6.6 11.6 9.6 10.4 12.6 10.6C13.4 8.2 16.2 6.8 18.4 8.6C19.2 7.4 20.8 7.2 21.4 8.2C20.4 8.6 20.2 9.4 20.6 10.4C23.4 10.8 25.6 12.2 25.6 14.4C22.4 16.2 9.6 16.2 6.4 14.4Z";
  d.vol(dome, M.creme, { lx: 0.38, ly: 0.15 });
  d.filet("M13.2 10.8C14 9.2 16 8.4 17.6 9.4", "#fff", 0.6, 0.9, 0.2);
  d.trait("M9.4 13.2C12 12 15.6 11.8 18.6 12.4", "#E9D5B2", 0.45, 0.7);
});

const sucreBlanc = {
  t: { hi: "#FFFFFF", mid: "#FBF9FF", lo: "#ECE6F5" },
  g: { hi: "#F4F0FA", mid: "#E4DDF0", lo: "#CFC5E0" },
  d: { hi: "#E9E3F3", mid: "#D3C9E4", lo: "#B6A9CC" },
  grain: "#B9AECF",
};
A["sucre"] = dessiner("sucre", (d) => {
  cube(d, 19.6, 26.2, 6.8, sucreBlanc, 3);
  cube(d, 12.6, 29.8, 6.8, sucreBlanc, 5);
  cube(d, 12.6, 22.8, 6.8, sucreBlanc, 8);
  d.aplat("M22.5 5.5L23.1 7.4L25 8L23.1 8.6L22.5 10.5L21.9 8.6L20 8L21.9 7.4Z", "#fff", 1);
  d.halo(ell(22.5, 8, 1.6, 1.6), "#fff", 0.6, 0.5);
});
const sucreRoux = {
  t: { hi: "#F9D7A2", mid: "#E7B36C", lo: "#CC8E45" },
  g: { hi: "#E3A35C", mid: "#C98340", lo: "#A8642A" },
  d: { hi: "#C98744", mid: "#AA6A2E", lo: "#86491A" },
  grain: "#7A4012",
};
A["sucre-roux"] = dessiner("sucreroux", (d) => {
  cube(d, 19.6, 26.2, 6.8, sucreRoux, 3);
  cube(d, 12.6, 29.8, 6.8, sucreRoux, 5);
  cube(d, 12.6, 22.8, 6.8, sucreRoux, 8);
});

/* ── Cannelle ── */
A["cannelle"] = dessiner("cannelle", (d) => {
  d.groupe('transform="rotate(-32 16 16)"', () => {
    for (const y of [12.6, 19.8, 16.2]) {
      const c = capsule(4.4, y, 27.6, y, 2.05);
      d.path(c, d.lin([[0, M.cannelle.mid], [0.28, M.cannelle.hi], [0.62, M.cannelle.mid], [1, M.cannelle.lo]]));
      d.trait(`M7 ${y - 1.25}H26`, "#F6C192", 0.3, 0.5);
      d.vol(ell(4.6, y, 1.15, 2.05), { hi: "#B8703C", mid: "#8F4F24", lo: "#6A3414", rim: "#53280C", rimOp: 0.5 });
      d.trait(`M4.7 ${y - 1.15}C3.6 ${y - 1.1} 3.7 ${y + 1.2} 4.8 ${y + 1.1}C5.6 ${y + 1} 5.6 ${y - 0.3} 4.8 ${y - 0.35}`, "#E9A673", 0.38, 0.9);
    }
    d.vol(arrondi([[18.4, 9.6], [20.4, 9.6], [20.4, 22.8], [18.4, 22.8]], 0.8), { hi: "#FFF4DE", mid: "#EED5A8", lo: "#C9A56E", rim: "#A8854F", rimOp: 0.4 });
  });
});

/* ── Vanille ── */
A["vanille"] = dessiner("vanille", (d) => {
  const gousse = { hi: "#97644A", mid: "#563020", lo: "#2E160C", rim: "#1D0C05", rimOp: 0.5 };
  for (const o of [{ x: 6.4, y: 30.2, L: 28, W: 3.6, deg: 40 }, { x: 11.4, y: 30.8, L: 25.5, W: 3.3, deg: 25 }]) {
    d.vol(feuille({ ...o, ventre: 0.5, rond: 0.45, pointe: 0.12 }), gousse, { lx: 0.3, ly: 0.3 });
    d.trait(nervure({ ...o, de: 0.08, a: 0.9 }), "#B07F60", 0.4, 0.75);
  }
  const fl = { hi: "#FFFFFF", mid: "#FFF4C2", lo: "#ECD079", rim: "#D7B34E", rimOp: 0.45 };
  for (let i = 0; i < 5; i++) d.vol(feuille({ x: 9.6, y: 10, L: 7.2, W: 4.6, deg: i * 72 + 10, ventre: 0.6, rond: 0.8 }), fl, { lx: 0.4, ly: 0.3 });
  d.vol(ell(9.6, 10, 2.2, 2.1), { hi: "#F8FFB0", mid: "#D7E85A", lo: "#9DB82E", rim: "#7E9A1C", rimOp: 0.4 });
});

/* ── Épices en bol ── */
const epice = (nom, m, graine) => dessiner(nom, (d) => bolDome(d, { contenu: m, grain: poudre(m), graine, haut: 18.6, dome: 8 }));
A["epice-rouge"] = epice("epicerouge", { hi: "#FFA27A", mid: "#E2452C", lo: "#A8281C", rim: "#86181A", rimOp: 0.45 }, 11);
A["epice-jaune"] = epice("epicejaune", { hi: "#FFF08A", mid: "#F7B90C", lo: "#CF7E05", rim: "#B26004", rimOp: 0.45 }, 12);
A["epice-brune"] = epice("epicebrune", { hi: "#E7B272", mid: "#AF7233", lo: "#734317", rim: "#58300C", rimOp: 0.45 }, 13);
A["cacao"] = epice("cacao", { hi: "#A26E55", mid: "#62382A", lo: "#3A1E14", rim: "#28120B", rimOp: 0.5 }, 14);
A["fecule"] = epice("fecule", { hi: "#FFFFFF", mid: "#F8F6F2", lo: "#DCD6CB", rim: "#C3BBAE", rimOp: 0.45 }, 15);

/* ── Farine ── */
A["farine"] = dessiner("farine", (d) => {
  const sac = "M7.4 11.6L6.2 27.6C6.1 29 7.1 30 8.5 30H23.5C24.9 30 25.9 29 25.8 27.6L24.6 11.6Z";
  d.vol("M8 11.2C9.2 6.6 12.4 4.4 16 4.4C19.6 4.4 22.8 6.6 24 11.2Z", M.creme, { lx: 0.4, ly: 0.2 });
  d.filet("M11 8.6C12 6.6 14 5.6 16 5.6", "#fff", 0.8, 0.9, 0.3);
  d.vol(sac, M.beige, { lx: 0.3, ly: 0.18 });
  d.reflet(sac, capsule(9.2, 15, 8.4, 27, 0.9), 0.65, 0.45);
  const revers = "M6.6 9.8C8.6 10.9 10.6 9.2 12.6 10.2C14.6 11.2 16.8 9.4 18.8 10.3C20.8 11.2 23 9.8 25.4 10.6L24.8 14.2C22.8 13.4 20.8 14.8 18.8 14C16.8 13.2 14.6 15 12.6 14.1C10.6 13.2 8.8 14.6 7 13.8Z";
  d.vol(revers, { ...M.beige, hi: "#F1D9AE", mid: "#D9B47A", lo: "#B48A4E" }, { ly: 0.1 });
  d.trait("M7.6 11C9.4 11.8 10.8 10.4 12.6 11.3C14.6 12.2 16.8 10.5 18.8 11.4C20.8 12.2 22.8 11 24.6 11.6", "#FFF1D6", 0.4, 0.8);
  // épi de blé
  d.trait("M16 27.2V16", "#B7801E", 0.55);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const o = { x: 16, y: 25.6 - i * 2.4, L: 3.2, W: 1.6, deg: s * 32, ventre: 0.5, rond: 0.8 };
    d.vol(feuille(o), M.dore, { rimOp: 0.4 });
  }
  d.vol(feuille({ x: 16, y: 16.8, L: 3.2, W: 1.6, deg: 0, ventre: 0.5 }), M.dore, { rimOp: 0.4 });
  d.halo(ell(26.4, 29.4, 3, 0.9), "#fff", 0.95, 0.5);
});

/* ── Poireau ── */
A["poireau"] = dessiner("poireau", (d) => {
  d.groupe('transform="rotate(38 16 16)"', () => {
    for (const o of [{ x: 15.2, y: 14.6, L: 14.6, W: 5.2, deg: -17 }, { x: 16.8, y: 14.6, L: 14.2, W: 5.2, deg: 19 }]) {
      d.vol(feuille({ ...o, ventre: 0.3, rond: 0.6, pointe: 0.25 }), { hi: "#7FC4A0", mid: "#35866A", lo: "#1F5A46", rim: "#154638", rimOp: 0.5 });
    }
    d.vol(feuille({ x: 16, y: 14.8, L: 16, W: 5.6, deg: 2, ventre: 0.3, rond: 0.6, pointe: 0.22 }), { hi: "#9AD8B4", mid: "#46A07A", lo: "#2A6E54", rim: "#1D5341", rimOp: 0.45 });
    const fut = "M12.9 11.6H19.1V27.3C19.1 28.9 17.7 29.9 16 29.9C14.3 29.9 12.9 28.9 12.9 27.3Z";
    d.path(fut, d.lin([[0, "#9BCF7E"], [0.32, "#E4F3C4"], [0.55, "#FAFDF0"], [1, "#FFFFFF"]]));
    d.path(fut, d.lin([[0, "#FFFFFF", 0.7], [0.35, "#FFFFFF", 0], [0.75, "#C9D9B4", 0], [1, "#9DB38A", 0.75]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
    d.trait("M14.3 13.5V27.4", "#fff", 0.55, 0.7);
    for (const x of [14.2, 15.4, 16.6, 17.8]) d.trait(`M${x} 29.7L${x + (x - 16) * 0.5} 31.2`, "#D8C9A4", 0.45, 0.9);
  });
});

export default A;
