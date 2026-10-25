// Ustensiles, deuxième série : outils à main, cuisson, électroménager.
import { M, dessiner, ell, capsule, arrondi, lisse, hasard, mix } from "../kit.mjs";
import { assombrir } from "../modeles.mjs";

const U = {};
const inox = M.acier;
const manche = { hi: "#6E6A82", mid: "#3A364B", lo: "#1E1B2A", rim: "#120F1C", rimOp: 0.6 };
const blancPlastique = { hi: "#FFFFFF", mid: "#F1EEF6", lo: "#CFC8DC", rim: "#B3AAC4", rimOp: 0.5 };
const inoxH = (d) => d.lin([[0, "#8F87A0"], [0.2, "#FBFAFF"], [0.45, "#D2CCDD"], [0.8, "#A39AB4"], [1, "#776E8A"]], { x1: 0, y1: 0, x2: 1, y2: 0 });
const interieur = { hi: "#7F778F", mid: "#5A5269", lo: "#3E384B", rim: "#2C2737", rimOp: 0.4 };

U["cuillere-bois"] = dessiner("cuillerebois", (d) => {
  d.groupe('transform="rotate(40 16 16)"', () => {
    d.vol(capsule(16, 13.6, 16, 31, 1.15, 1.45), M.bois, { lx: 0.3, ly: 0.3 });
    const bol = ell(16, 7.4, 5, 6.8);
    d.vol(bol, M.bois, { lx: 0.35, ly: 0.3 });
    d.vol(ell(16.2, 7.2, 3.6, 5.2), { hi: mix(M.bois.lo, "#000000", 0.05), mid: M.bois.mid, lo: M.bois.hi }, { rim: false, lx: 0.7, ly: 0.75 });
    d.trait("M15 16V29", "#F8D7A6", 0.45, 0.6);
  });
});

U["econome"] = dessiner("econome", (d) => {
  d.groupe('transform="rotate(38 16 16)"', () => {
    d.vol(capsule(16, 17.6, 16, 30.6, 2, 2.3), manche);
    d.filet("M15 19.6V28.6", "#FFFFFF", 0.6, 0.45, 0.2);
    d.path("M12.4 17.6V6.6C12.4 3.6 14 2 16 2C18 2 19.6 3.6 19.6 6.6V17.6H17.8V6.6C17.8 4.8 17 3.8 16 3.8C15 3.8 14.2 4.8 14.2 6.6V17.6Z", inoxH(d));
    d.vol(arrondi([[14.6, 5.4], [17.4, 5.4], [17.4, 15.6], [14.6, 15.6]], 0.8), inox);
    d.trait("M15.4 7V14.2", "#6E6680", 0.45, 0.9);
    for (let y = 7.4; y < 14.4; y += 1.2) d.trait(`M16.2 ${y}H17`, "#4B4360", 0.35);
  });
});

U["cocotte"] = dessiner("cocotte", (d) => {
  const fonte = { hi: "#6A6478", mid: "#2C2836", lo: "#14121A", rim: "#0A090E", rimOp: 0.6 };
  for (const x of [2.4, 29.6]) d.vol(arrondi([[x - 2.2, 15.6], [x + 2.2, 15.6], [x + 2.2, 18.6], [x - 2.2, 18.6]], 1.2), fonte);
  const corps = "M3.6 15.4V23.4C3.6 26.8 6.4 29.4 10 29.4H22C25.6 29.4 28.4 26.8 28.4 23.4V15.4Z";
  d.vol(corps, fonte, { lx: 0.25, ly: 0.2 });
  d.filet("M6.4 17.4V26", "#FFFFFF", 0.9, 0.35, 0.4);
  d.vol("M2.8 15.6C2.8 12.8 8.4 10.2 16 10.2C23.6 10.2 29.2 12.8 29.2 15.6C29.2 17 23.6 17.8 16 17.8C8.4 17.8 2.8 17 2.8 15.6Z", { hi: "#7E788E", mid: "#3A3546", lo: "#1A1722", rim: "#0E0C14", rimOp: 0.5 }, { lx: 0.35, ly: 0.3 });
  d.filet("M7 13.2C10 11.8 13.4 11.4 16.4 11.4", "#FFFFFF", 0.7, 0.45, 0.3);
  d.vol(ell(16, 9.6, 3.6, 1.4), inox, { rim: false });
  d.vol("M13.4 9.6C13.4 7.2 14.6 6 16 6C17.4 6 18.6 7.2 18.6 9.6Z", inox, { lx: 0.3, ly: 0.3 });
});

U["mixeur-plongeant"] = dessiner("mixeurplong", (d) => {
  d.groupe('transform="rotate(-18 16 16)"', () => {
    d.path("M14.8 14H17.2V24.6H14.8Z", inoxH(d));
    d.vol("M11 24.4H21L22.4 29.4C22.6 30.2 22 30.8 21.2 30.8H10.8C10 30.8 9.4 30.2 9.6 29.4Z", inox, { lx: 0.3, ly: 0.2 });
    d.vol(ell(16, 30.6, 5.6, 0.9), interieur, { rim: false });
    d.vol("M11.4 3.6C11.4 2.2 12.6 1.2 14 1.2H18C19.4 1.2 20.6 2.2 20.6 3.6V12.6C20.6 14 19.4 15 18 15H14C12.6 15 11.4 14 11.4 12.6Z", blancPlastique, { lx: 0.3, ly: 0.2 });
    d.vol(capsule(16, 4.6, 16, 8.4, 1.15), { hi: "#8E899E", mid: "#4A4658", lo: "#26232F" }, { rim: false });
    d.filet("M12.8 3.6V12.4", "#FFFFFF", 0.7, 0.8, 0.25);
  });
});

function frigo(d, { porte, embleme }) {
  const caisse = arrondi([[6.4, 2], [25.6, 2], [25.6, 30.4], [6.4, 30.4]], 2.4);
  d.vol(caisse, porte, { lx: 0.3, ly: 0.15 });
  d.trait("M6.8 12.2H25.2", mix(porte.lo, "#000000", 0.2), 0.7, 0.9);
  for (const [y1, y2] of [[4.8, 9.8], [14.6, 23]]) d.vol(capsule(22.6, y1, 22.6, y2, 0.7), inox);
  d.filet("M8.6 4V28.4", "#FFFFFF", 0.9, 0.7, 0.35);
  d.vol(arrondi([[7.4, 30], [10, 30], [10, 31.4], [7.4, 31.4]], 0.4), manche, { rim: false });
  d.vol(arrondi([[22, 30], [24.6, 30], [24.6, 31.4], [22, 31.4]], 0.4), manche, { rim: false });
  if (embleme) embleme(d);
}
U["refrigerateur"] = dessiner("frigo", (d) => frigo(d, { porte: { hi: "#FFFFFF", mid: "#EEEBF4", lo: "#C9C2D6", rim: "#ABA2BC", rimOp: 0.45 } }));
U["congelateur"] = dessiner("congelo", (d) => frigo(d, {
  porte: { hi: "#FFFFFF", mid: "#E6F2FB", lo: "#B8D2E8", rim: "#94B6D2", rimOp: 0.45 },
  embleme: (d) => {
    const c = [15.4, 20.4];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = c[0] + Math.cos(a) * 4.4, y = c[1] + Math.sin(a) * 4.4;
      d.trait(`M${c[0]} ${c[1]}L${x} ${y}`, "#4FA6EF", 0.9);
      for (const s of [-1, 1]) d.trait(`M${c[0] + Math.cos(a) * 2.8} ${c[1] + Math.sin(a) * 2.8}l${Math.cos(a + s * 0.8) * 1.4} ${Math.sin(a + s * 0.8) * 1.4}`, "#4FA6EF", 0.7);
    }
  },
}));

U["verre"] = dessiner("verre", (d) => {
  const verre = "M7.4 3.4H24.6L22.6 27.6C22.4 29 21.2 30 19.8 30H12.2C10.8 30 9.6 29 9.4 27.6Z";
  d.vol(verre, { hi: "#FFFFFF", mid: "#E9F7FF", lo: "#BFDDF2", rim: "#9CC5E6", rimOp: 0.5 }, { lx: 0.3, ly: 0.2 });
  d.vol(ell(16, 3.6, 8.6, 1.6), { hi: "#F6FCFF", mid: "#DDF0FC", lo: "#B6D6EE" }, { rim: false });
  d.vol("M10 26.4H22L21.8 27.8C21.6 29 20.8 29.6 19.8 29.6H12.2C11.2 29.6 10.4 29 10.2 27.8Z", { hi: "#D6EEFF", mid: "#B6DAF4", lo: "#8EBEE4" }, { rim: false });
  d.filet("M10 6L11.6 25", "#FFFFFF", 1.1, 0.95, 0.35);
  d.filet("M21.4 7.4L20.6 18", "#FFFFFF", 0.6, 0.6, 0.3);
});

U["pinceau"] = dessiner("pinceau", (d) => {
  d.groupe('transform="rotate(40 16 16)"', () => {
    d.vol(capsule(16, 15.4, 16, 31, 1.5, 1.8), M.bois);
    d.path("M13.2 11H18.8V15.6H13.2Z", inoxH(d));
    d.trait("M13.4 13.2H18.6", "#6E6680", 0.4);
    const poils = "M13.2 11.2L12.2 3.4C12.2 2 13.4 1 16 1C18.6 1 19.8 2 19.8 3.4L18.8 11.2Z";
    d.vol(poils, { hi: "#FFF6E0", mid: "#EED7A6", lo: "#C4A266", rim: "#A68548", rimOp: 0.45 }, { lx: 0.3, ly: 0.3 });
    for (const x of [14, 15.4, 16.8, 18]) d.trait(`M${x} 10.8L${x + (x - 16) * 0.12} 2.4`, "#D6BA84", 0.35, 0.8);
  });
});

U["grill"] = dessiner("grill", (d) => {
  const fonte = { hi: "#5E5870", mid: "#2C2836", lo: "#14121A", rim: "#0A090E", rimOp: 0.55 };
  d.vol(capsule(22.4, 20.4, 30.6, 26.6, 1.3, 1.2), manche);
  const bord = arrondi([[2.6, 9.4], [22.6, 5.4], [26.6, 19.6], [6.6, 24.6]], 2.2);
  d.vol(bord, fonte, { lx: 0.3, ly: 0.2 });
  const fond = arrondi([[4.6, 10.6], [21.4, 7.2], [24.6, 18.8], [7.8, 22.8]], 1.6);
  d.vol(fond, { hi: "#4A4558", mid: "#24212D", lo: "#100E16" }, { rim: false });
  const cl = d.clip(fond);
  d.brut(`<g clip-path="${cl}">`);
  for (let k = 0; k < 7; k++) { d.trait(`M${3 + k * 3.2} ${11.4 - k * 0.7}L${7 + k * 3.2} ${25 - k * 0.7}`, "#5A5468", 1.1, 0.95); d.trait(`M${3.6 + k * 3.2} ${11.4 - k * 0.7}L${7.6 + k * 3.2} ${25 - k * 0.7}`, "#8A849C", 0.35, 0.8); }
  d.brut("</g>");
});

U["wok"] = dessiner("wok", (d) => {
  d.vol(capsule(25, 14.6, 31, 9, 1.35, 1.2), M.bois);
  d.vol(arrondi([[0.8, 13.6], [4.6, 13.6], [4.6, 15.8], [0.8, 15.8]], 1), manche);
  d.vol(ell(15.4, 14.6, 11.6, 3.6), { hi: "#5E5870", mid: "#2E2A38", lo: "#16131E" }, { lx: 0.6, ly: 0.8, rim: false });
  const bol = "M3.8 14.6C3.8 22.4 9 27.6 15.4 27.6C21.8 27.6 27 22.4 27 14.6C24.4 17.2 6.4 17.2 3.8 14.6Z";
  d.vol(bol, { hi: "#6A6478", mid: "#2C2836", lo: "#14121A", rim: "#0A090E", rimOp: 0.6 }, { lx: 0.3, ly: 0.15 });
  d.trait("M4.2 15C6.8 17.6 24 17.6 26.6 15", "#8A849C", 0.5, 0.8);
  d.filet("M6.8 18.6C8 22.4 10.6 24.8 13.4 25.6", "#FFFFFF", 0.9, 0.35, 0.4);
});

/* ── Moules à gâteau ── */
const moulePaire = { hi: "#E7E2EE", mid: "#B4ACC4", lo: "#7E7592", rim: "#5E5672", rimOp: 0.5 };
U["moule-muffins"] = dessiner("moulemuffins", (d) => {
  const plaque = arrondi([[2.4, 14.4], [18.6, 7.4], [29.6, 15.2], [13.4, 22.8]], 2.2);
  d.vol(arrondi([[2.4, 16.4], [18.6, 9.4], [29.6, 17.2], [13.4, 24.8]], 2.2), assombrir(moulePaire, 0.25), { rim: false });
  d.vol(plaque, moulePaire, { lx: 0.35, ly: 0.3 });
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const x = 8.4 + j * 5.4 + i * 4.2, y = 13.6 - j * 2.4 + i * 3.6;
    d.vol(ell(x, y, 2.5, 1.6, -24), interieur, { rim: false, lx: 0.65, ly: 0.75 });
    d.vol(ell(x + 0.2, y + 0.3, 1.5, 0.9, -24), { hi: "#F6A6C0", mid: "#E26A94", lo: "#B23E6A" }, { rim: false });
  }
});

U["moule-rond"] = dessiner("moulerond", (d) => {
  d.path("M3.4 13.2V21.6C3.4 24.4 9 26.6 16 26.6C23 26.6 28.6 24.4 28.6 21.6V13.2Z", inoxH(d));
  d.vol(ell(16, 13.2, 12.6, 4.4), interieur, { rim: false, lx: 0.6, ly: 0.8 });
  d.vol(ell(16, 14.4, 11.2, 3.4), { hi: "#C9C2D6", mid: "#9C93AD", lo: "#6E6680" }, { rim: false });
  d.trait("M3.6 13.4C3.6 15.8 9.2 17.8 16 17.8C22.8 17.8 28.4 15.8 28.4 13.4", "#FFFFFF", 0.5, 0.75);
  d.vol(arrondi([[26.4, 16.6], [30.2, 16.6], [30.2, 21.4], [26.4, 21.4]], 0.8), inox);
});

U["moule-cake"] = dessiner("moulecake", (d) => {
  d.vol("M3.2 13.2L22.4 8.4L28.8 12.6L9.6 18Z", interieur, { rim: false, lx: 0.6, ly: 0.8 });
  d.path("M3.2 13.2L9.6 18L11.8 27.4L5.8 23.6Z", d.lin([[0, "#C9C2D6"], [1, "#8C8399"]]));
  d.path("M9.6 18L28.8 12.6L26.6 21.6L11.8 27.4Z", inoxH(d));
  d.trait("M3.2 13.2L9.6 18L28.8 12.6", "#FFFFFF", 0.55, 0.85);
  d.vol(arrondi([[1.2, 12.6], [3.8, 11.8], [4.4, 13.4], [1.8, 14.2]], 0.5), inox);
});

U["moule-carre"] = dessiner("moulecarre", (d) => {
  d.vol("M2.8 14.4L16.4 8.4L29.2 14.4L15.6 20.6Z", interieur, { rim: false, lx: 0.6, ly: 0.8 });
  d.path("M2.8 14.4L15.6 20.6L15.8 27.6L4 22.2Z", d.lin([[0, "#D2CCDD"], [1, "#8C8399"]]));
  d.path("M15.6 20.6L29.2 14.4L28 21.6L15.8 27.6Z", d.lin([[0, "#A39AB4"], [1, "#6E6680"]]));
  d.trait("M2.8 14.4L15.6 20.6L29.2 14.4", "#FFFFFF", 0.55, 0.85);
});

U["moule-tarte"] = dessiner("mouletarte", (d) => {
  const pts = [];
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, k = 1 + (i % 2 ? 0.035 : -0.035); pts.push([16 + Math.cos(a) * 13.4 * k, 16.4 + Math.sin(a) * 6.2 * k]); }
  d.path(`M2.6 16.4V20.2C2.6 23.4 8.6 25.8 16 25.8C23.4 25.8 29.4 23.4 29.4 20.2V16.4Z`, d.lin([[0, "#C9A456"], [0.25, "#FFF0B8"], [0.55, "#E2BE68"], [1, "#9C7628"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  for (let i = 0; i < 22; i++) { const x = 3 + i * 1.24; d.trait(`M${x} ${17.6 + Math.sin((i / 21) * Math.PI) * 4}V${20.6 + Math.sin((i / 21) * Math.PI) * 4.6}`, "#A8822E", 0.35, 0.6); }
  d.vol(lisse(pts), { hi: "#FFF4C8", mid: "#E6C26C", lo: "#B08A34", rim: "#8E6C1C", rimOp: 0.45 }, { lx: 0.35, ly: 0.3 });
  d.vol(ell(16, 16.8, 11.4, 4.8), { hi: "#D9B868", mid: "#B8923E", lo: "#8A6A22" }, { rim: false, lx: 0.6, ly: 0.75 });
});

U["moule-madeleines"] = dessiner("moulemadeleines", (d) => {
  const plaque = arrondi([[2, 13.8], [19.6, 6.6], [30, 14.4], [12.4, 22.4]], 2.2);
  d.vol(arrondi([[2, 15.8], [19.6, 8.6], [30, 16.4], [12.4, 24.4]], 2.2), assombrir(moulePaire, 0.25), { rim: false });
  d.vol(plaque, moulePaire, { lx: 0.35, ly: 0.3 });
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const x = 7.8 + j * 5.6 + i * 4.4, y = 13.2 - j * 2.4 + i * 3.6;
    d.groupe(`transform="rotate(-24 ${x} ${y})"`, () => {
      d.vol(`M${x - 2.4} ${y - 0.8}C${x - 2.4} ${y - 2.2} ${x - 1.2} ${y - 2.6} ${x} ${y - 2.6}C${x + 1.2} ${y - 2.6} ${x + 2.4} ${y - 2.2} ${x + 2.4} ${y - 0.8}C${x + 2} ${y + 1.4} ${x + 0.8} ${y + 2} ${x} ${y + 2}C${x - 0.8} ${y + 2} ${x - 2} ${y + 1.4} ${x - 2.4} ${y - 0.8}Z`, interieur, { rim: false, lx: 0.65, ly: 0.75 });
      for (const t of [-1.2, 0, 1.2]) d.trait(`M${x} ${y + 1.6}L${x + t} ${y - 2.2}`, "#8C8399", 0.35, 0.8);
    });
  }
});

U["moule-esquimaux"] = dessiner("moulesquimaux", (d) => {
  const couleurs = [{ hi: "#FFC2D4", mid: "#F2709A", lo: "#B83A64" }, { hi: "#C6EBFF", mid: "#5AB4EE", lo: "#2A78B8" }, { hi: "#FFF0A6", mid: "#F5C842", lo: "#C9921A" }];
  couleurs.forEach((c, i) => {
    const x = 9 + i * 7, y = 16 - i * 1.4;
    d.groupe(`transform="rotate(${-12 + i * 12} ${x} ${y + 8})"`, () => {
      d.vol(capsule(x, y + 7, x, y + 14, 0.9), M.bois, { rim: false });
      d.vol(arrondi([[x - 3.6, y - 8], [x + 3.6, y - 8], [x + 3.6, y + 6], [x - 3.6, y + 6]], 3.4), { ...c, rim: mix(c.lo, "#000000", 0.2), rimOp: 0.4 }, { lx: 0.3, ly: 0.2 });
      d.filet(`M${x - 2.2} ${y - 5}V${y + 3}`, "#FFFFFF", 0.9, 0.7, 0.3);
    });
  });
});

/* ── Électroménager ── */
U["batteur"] = dessiner("batteur", (d) => {
  for (const x of [12.4, 17.6]) {
    d.path(`M${x - 0.5} 20.4H${x + 0.5}V24H${x - 0.5}Z`, inoxH(d));
    d.trait(`M${x} 24C${x - 2.6} 25 ${x - 2.4} 30.6 ${x} 30.6C${x + 2.4} 30.6 ${x + 2.6} 25 ${x} 24Z`, "#B6AEC8", 0.8);
    d.trait(`M${x} 24V30.4`, "#9C93AD", 0.7);
  }
  const corps = "M5 12.4C5 9.6 7.2 8.4 10 8.4H21.4C24.8 8.4 27.4 10.6 27.4 14C27.4 17.2 25.2 19.4 22 20.4C19.6 21.2 13.6 21.4 9.6 21C6.8 20.6 5 18.6 5 16Z";
  d.vol(corps, blancPlastique, { lx: 0.3, ly: 0.25 });
  d.vol("M8.4 8.6C8.4 5.4 10.6 3.6 13.4 3.6H21C24.2 3.6 26.4 5.6 26.4 8.2V10.2H23.8V8.6C23.8 7.2 22.8 6.4 21.4 6.4H13.6C12 6.4 11 7.4 11 8.8V8.6Z", { hi: "#8E899E", mid: "#4A4658", lo: "#26232F", rim: "#16141D", rimOp: 0.4 });
  d.vol(ell(21.6, 14.2, 1.4, 1.4), { hi: "#8E899E", mid: "#4A4658", lo: "#26232F" }, { rim: false });
  d.filet("M7.4 11.8C7.6 14.6 8.2 16.6 9.4 18", "#FFFFFF", 0.8, 0.8, 0.3);
});

U["grille-pain"] = dessiner("grillepain", (d) => {
  for (const [x, t] of [[10.6, 0], [17.6, 0.1]]) {
    d.vol(arrondi([[x, 3.4], [x + 6.2, 3.4], [x + 6.6, 14], [x - 0.4, 14]], 1.6), { hi: "#FFE6B0", mid: "#E8B060", lo: "#B87A2E", rim: "#965C1C", rimOp: 0.45 }, { lx: 0.35, ly: 0.3 });
    d.vol(arrondi([[x + 0.9, 4.6], [x + 5.3, 4.6], [x + 5.6, 13], [x + 0.6, 13]], 1.2), { hi: "#FFF6DC", mid: "#F6E2B4", lo: "#D9B47A" }, { rim: false });
    void t;
  }
  const corps = "M3.4 13.4C3.4 11.6 4.8 10.6 6.6 10.6H25.4C27.2 10.6 28.6 11.6 28.6 13.4V25.6C28.6 27.6 27 29 25 29H7C5 29 3.4 27.6 3.4 25.6Z";
  d.path(corps, inoxH(d));
  d.path(corps, d.lin([[0.55, "#4B4360", 0], [1, "#4B4360", 0.3]]));
  d.vol(arrondi([[9.6, 11.4], [17.6, 11.4], [17.6, 13.2], [9.6, 13.2]], 0.8), interieur, { rim: false });
  d.vol(arrondi([[16.8, 11.4], [24.6, 11.4], [24.6, 13.2], [16.8, 13.2]], 0.8), interieur, { rim: false });
  d.vol(arrondi([[26.8, 17], [30.2, 17], [30.2, 19.4], [26.8, 19.4]], 0.8), manche);
  d.filet("M5.8 14V26.6", "#FFFFFF", 1, 0.85, 0.35);
});

U["micro-ondes"] = dessiner("microondes", (d) => {
  const caisse = arrondi([[2, 7], [30, 7], [30, 26.6], [2, 26.6]], 2.4);
  d.vol(caisse, { hi: "#FFFFFF", mid: "#ECE8F2", lo: "#C4BCD2", rim: "#A69CB8", rimOp: 0.45 }, { lx: 0.3, ly: 0.2 });
  const vitre = arrondi([[4.2, 9.4], [21.4, 9.4], [21.4, 24.2], [4.2, 24.2]], 1.4);
  d.vol(vitre, { hi: "#5A5470", mid: "#2C2838", lo: "#16131E" }, { rim: false });
  d.halo(ell(12.8, 18.6, 5.4, 2.2), "#FFB54A", 0.55, 1.2);
  d.reflet(vitre, "M5.4 10.6L10 10.6L6.4 22.6H5.4Z", 0.3, 0.4);
  d.vol(arrondi([[23.4, 9.8], [28.2, 9.8], [28.2, 12.6], [23.4, 12.6]], 0.6), { hi: "#B6F5D2", mid: "#5FD69A", lo: "#2E9C66" }, { rim: false });
  for (const y of [16, 20.4]) d.vol(ell(25.8, y, 1.7, 1.7), inox);
  d.vol(arrondi([[3.2, 26.4], [6.4, 26.4], [6.4, 28.2], [3.2, 28.2]], 0.5), manche, { rim: false });
  d.vol(arrondi([[25.6, 26.4], [28.8, 26.4], [28.8, 28.2], [25.6, 28.2]], 0.5), manche, { rim: false });
});

U["balance"] = dessiner("balance", (d) => {
  d.vol("M2.6 17.6L16.8 10.8L29.4 16.4L15.2 23.6Z", { hi: "#FFFFFF", mid: "#F2EFF7", lo: "#D2CADE", rim: "#B6ACC6", rimOp: 0.4 }, { lx: 0.35, ly: 0.3 });
  d.path("M2.6 17.6L15.2 23.6V26.4L2.6 20.4Z", d.lin([[0, "#E2DCEA"], [1, "#B4AAC6"]]));
  d.path("M15.2 23.6L29.4 16.4V19.2L15.2 26.4Z", d.lin([[0, "#C9C0D6"], [1, "#9A90AE"]]));
  d.vol("M5.6 18.4L9.6 16.4L14 18.6L10 20.6Z", { hi: "#B6F5D2", mid: "#5FD69A", lo: "#2E9C66" }, { rim: false });
  d.vol(ell(19.6, 16.6, 1.1, 0.6), manche, { rim: false });
  d.vol(ell(22.4, 15.2, 1.1, 0.6), manche, { rim: false });
  d.vol("M10.6 11.4C10.6 8.4 13.2 6 17.6 6C22 6 24.6 8.4 24.6 11.4C24.6 13.4 21.6 15 17.6 15C13.6 15 10.6 13.4 10.6 11.4Z", M.ceramique, { lx: 0.35, ly: 0.25 });
  d.vol(ell(17.6, 8.6, 6.2, 2.2), { hi: "#E9E1F2", mid: "#D6CBE4", lo: "#B9AACD" }, { rim: false });
});

export default U;
