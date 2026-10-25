// Ustensiles, troisième série : service, petits outils, papier, verrerie.
import { M, dessiner, feuille, ell, capsule, arrondi, lisse, hasard, mix } from "../kit.mjs";
import { sphere, assombrir } from "../modeles.mjs";

const U = {};
const inox = M.acier;
const manche = { hi: "#6E6A82", mid: "#3A364B", lo: "#1E1B2A", rim: "#120F1C", rimOp: 0.6 };
const inoxH = (d) => d.lin([[0, "#8F87A0"], [0.2, "#FBFAFF"], [0.45, "#D2CCDD"], [0.8, "#A39AB4"], [1, "#776E8A"]], { x1: 0, y1: 0, x2: 1, y2: 0 });
const interieur = { hi: "#7F778F", mid: "#5A5269", lo: "#3E384B", rim: "#2C2737", rimOp: 0.4 };
const verre = { hi: "#FFFFFF", mid: "#E9F7FF", lo: "#BFDDF2", rim: "#9CC5E6", rimOp: 0.5 };

U["brochettes"] = dessiner("brochettes", (d) => {
  const morceaux = [
    { hi: "#FFB0A0", mid: "#E8483A", lo: "#A82A22" },
    { hi: "#FFFFFF", mid: "#F2EEE6", lo: "#CFC6B4" },
    { hi: "#F6D2A2", mid: "#D9A066", lo: "#A86A30" },
    { hi: "#B6E68C", mid: "#4FA43C", lo: "#2A6E26" },
  ];
  for (const [k, [x1, y1, x2, y2]] of [[0, [3, 26.6, 26.6, 4.2]], [1, [8.4, 30.4, 30, 9.6]]]) {
    d.vol(capsule(x1, y1, x2, y2, 0.6), M.bois, { rim: false });
    for (let i = 0; i < 4; i++) {
      const t = 0.22 + i * 0.19, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      d.vol(arrondi([[x - 2.6, y - 2.4], [x + 2.6, y - 2.4], [x + 2.6, y + 2.4], [x - 2.6, y + 2.4]], 1.2), morceaux[(i + k) % 4], { lx: 0.3, ly: 0.25 });
    }
  }
});

U["batonnets"] = dessiner("batonnets", (d) => {
  for (const deg of [-24, 0, 24]) {
    d.groupe(`transform="rotate(${deg} 16 28)"`, () => {
      d.vol(capsule(16, 4, 16, 28, 2.4), M.bois, { lx: 0.3, ly: 0.3 });
      d.trait("M15 7V25", "#F8D7A6", 0.45, 0.7);
    });
  }
});

U["cuillere-glace"] = dessiner("cuillereglace", (d) => {
  d.vol(capsule(17.4, 17.6, 29.4, 29.4, 1.6, 1.9), manche);
  d.filet("M19 19.8L27.4 28", "#FFFFFF", 0.6, 0.4, 0.2);
  d.vol(ell(12.6, 12.6, 8.6, 8.2, 0), { hi: "#FFE0EA", mid: "#F59AB8", lo: "#C85A84", rim: "#A84268", rimOp: 0.45 }, { lx: 0.35, ly: 0.3 });
  d.path("M4.6 15.4C5.4 20.4 9.6 23.4 14 23C18.4 22.6 21.6 18.8 21.2 14.6C18.6 18 9.4 18.6 4.6 15.4Z", inoxH(d));
  d.aplat(ell(9, 8.8, 2, 1.3, -30), "#FFFFFF", 0.6);
});

U["boite"] = dessiner("boite", (d) => {
  d.vol("M3.4 14.6L16.4 9.4L28.6 14.4L15.6 19.8Z", { hi: "#D6F0FF", mid: "#9CCDF0", lo: "#5E9CCB", rim: "#4882B4", rimOp: 0.4 }, { lx: 0.35, ly: 0.3 });
  d.path("M3.4 14.6L15.6 19.8L15.8 28.6L4.4 23.4Z", d.lin([[0, "#F2FAFF", 0.92], [1, "#C2DDF0", 0.92]]));
  d.path("M15.6 19.8L28.6 14.4L27.6 23.2L15.8 28.6Z", d.lin([[0, "#DCEEFA", 0.92], [1, "#A9CBE6", 0.92]]));
  d.vol("M5.8 22.4L15.6 26.6L26 22.2L15.6 18.8Z", { hi: "#FFE4A6", mid: "#F5B85A", lo: "#C9822A" }, { rim: false });
  for (const [x, y] of [[9.2, 17.6], [22, 17.2]]) d.vol(arrondi([[x - 1.4, y], [x + 1.4, y], [x + 1.4, y + 3.4], [x - 1.4, y + 3.4]], 0.6), { hi: "#B6E0FF", mid: "#4FA6EF", lo: "#2A6CC4" });
  d.trait("M3.4 14.6L15.6 19.8L28.6 14.4", "#FFFFFF", 0.55, 0.9);
});

U["pince"] = dessiner("pince", (d) => {
  d.path("M14.6 3.2C15.4 2.4 16.6 2.4 17.4 3.2L18.4 4.2L11.2 26.2C10.8 27.2 9.6 27.6 8.8 27L8.2 26.6Z", inoxH(d));
  d.path("M17.4 3.2L18.4 4.2L26.6 25.8C27 26.8 26.4 27.8 25.4 27.8H24.6Z", inoxH(d));
  d.vol(capsule(9.4, 24.6, 7.4, 30.4, 1.3, 1.5), manche);
  d.vol(capsule(25.4, 24.4, 27.2, 30.2, 1.3, 1.5), manche);
  d.vol(ell(16, 4.2, 2.6, 2.2), inox);
});

U["ecumoire"] = dessiner("ecumoire", (d) => {
  d.trait("M16.6 18.4C19.6 13.6 22.8 8.4 25.6 4.6C26.6 3.2 28 2.6 28.8 3.6", "#9A91AE", 2.1);
  d.trait("M16.6 18.4C19.6 13.6 22.8 8.4 25.6 4.6C26.6 3.2 28 2.6 28.8 3.6", "#F4F1FA", 0.6, 0.85);
  const disque = ell(11.2, 22.4, 9, 6.6, -10);
  d.path(disque, inoxH(d));
  d.path(disque, d.rad([[0.6, "#4B4360", 0], [1, "#4B4360", 0.35]], { cx: 0.5, cy: 0.45, r: 0.66 }));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const x = 5.4 + c * 2.8 + (r % 2) * 1.4, y = 18 + r * 2.8 - c * 0.5;
    if (Math.hypot((x - 11.2) / 8, (y - 22.4) / 5.8) < 0.86) d.aplat(ell(x, y, 0.6, 0.5), "#3E384B", 0.85);
  }
});

U["torchon"] = dessiner("torchon", (d) => {
  const plis = [[4.6, 13.4, 27.4, 17.2], [5.4, 18.6, 26.6, 22.8], [4.2, 23.4, 27.8, 28.4]];
  plis.forEach(([x1, y1, x2, y2], i) => {
    const t = `M${x1} ${y1 + 1}C${x1} ${y1 - 1.8} ${x1 + 2} ${y1 - 2.4} ${x1 + 4} ${y1 - 2.2}L${x2 - 1} ${y2 - 4.6}C${x2 + 0.6} ${y2 - 4.4} ${x2 + 1} ${y2 - 2} ${x2} ${y2}L${x1 + 2} ${y1 + 6}C${x1 + 0.6} ${y1 + 5.6} ${x1} ${y1 + 3.6} ${x1} ${y1 + 1}Z`;
    d.vol(t, { hi: "#FFFFFF", mid: "#F6F3EE", lo: "#D9D1C4", rim: "#BDB3A2", rimOp: 0.4 }, { lx: 0.3, ly: 0.25 });
    const cl = d.clip(t);
    d.brut(`<g clip-path="${cl}">`);
    for (const k of [0.25, 0.4, 0.75]) { const x = x1 + (x2 - x1) * k; d.trait(`M${x} ${y1 - 4}L${x + 2} ${y2 + 4}`, k === 0.4 ? "#4FA6EF" : "#E8483A", k === 0.4 ? 0.8 : 1.3, 0.9); }
    d.brut("</g>");
    void i;
  });
});

U["carafe"] = dessiner("carafe", (d) => {
  const corps = "M13.2 2.6H18.8V9.4C18.8 10.6 25.6 13.6 25.6 21.2C25.6 26.6 21.4 30 16 30C10.6 30 6.4 26.6 6.4 21.2C6.4 13.6 13.2 10.6 13.2 9.4Z";
  d.vol(corps, verre, { lx: 0.3, ly: 0.2 });
  const eau = "M7.2 18.4C11 17.4 21 17.4 24.8 18.4C25.2 19.2 25.4 20.2 25.4 21.2C25.4 26.4 21.2 29.6 16 29.6C10.8 29.6 6.6 26.4 6.6 21.2C6.6 20.2 6.8 19.2 7.2 18.4Z";
  d.vol(eau, { hi: "#E6F6FF", mid: "#A8DBFA", lo: "#6CB4E8", rim: "#4D99D6", rimOp: 0.4 }, { lx: 0.35, ly: 0.2 });
  d.trait("M7.6 18.6C11.4 17.8 20.6 17.8 24.4 18.6", "#FFFFFF", 0.55, 0.85);
  for (const [x, y, a] of [[12.4, 21.6, -14], [19.2, 23.6, 18]]) d.groupe(`transform="rotate(${a} ${x} ${y})"`, () => d.vol(arrondi([[x - 2.2, y - 2.2], [x + 2.2, y - 2.2], [x + 2.2, y + 2.2], [x - 2.2, y + 2.2]], 1), { hi: "#FFFFFF", mid: "#E6F6FF", lo: "#A9D6F5", rim: "#86BFE8", rimOp: 0.4 }, { lx: 0.3, ly: 0.3 }));
  d.vol(ell(17, 18.8, 3.6, 1.3, -8), { hi: "#FFF7B0", mid: "#F5D63A", lo: "#C9A214" }, { rim: false });
  d.vol(ell(17, 18.6, 2.8, 0.9, -8), { hi: "#FFFFF0", mid: "#FFF2A6", lo: "#EBD66A" }, { rim: false });
  d.filet("M9.4 15.4C8.4 18 8.4 22.6 9.8 25.4", "#FFFFFF", 1.1, 0.95, 0.35);
  d.vol(ell(16, 2.8, 3.4, 1), { hi: "#F6FCFF", mid: "#DDF0FC", lo: "#B6D6EE" }, { rim: false });
});

U["cercle"] = dessiner("cercle", (d) => {
  d.path("M3.4 13.4V20.4C3.4 23.4 9 25.8 16 25.8C23 25.8 28.6 23.4 28.6 20.4V13.4Z", inoxH(d));
  d.vol(ell(16, 13.4, 12.6, 4.4), interieur, { rim: false, lx: 0.6, ly: 0.8 });
  d.path("M4.4 13.6C4.4 11.4 9.6 10 16 10C22.4 10 27.6 11.4 27.6 13.6C27.6 15.8 22.4 17.4 16 17.4C9.6 17.4 4.4 15.8 4.4 13.6Z", d.lin([[0, "#A39AB4"], [1, "#6E6680"]]));
  d.trait("M3.6 13.6C3.6 16.2 9.4 18.2 16 18.2C22.6 18.2 28.4 16.2 28.4 13.6", "#FFFFFF", 0.55, 0.85);
});

U["ramequin"] = dessiner("ramequin", (d) => {
  const corps = "M3.6 13.6V21.4C3.6 24.8 9.2 27.4 16 27.4C22.8 27.4 28.4 24.8 28.4 21.4V13.6Z";
  d.vol(corps, M.ceramique, { lx: 0.3, ly: 0.2 });
  const cl = d.clip(corps);
  d.brut(`<g clip-path="${cl}">`);
  for (let i = 0; i <= 18; i++) { const x = 3.6 + (i * 24.8) / 18; d.trait(`M${x} 14V28`, "#D8D0E4", 0.55, 0.8); }
  d.brut("</g>");
  d.vol(ell(16, 13.6, 12.8, 4.6), M.ceramique, { lx: 0.4, ly: 0.3 });
  d.vol(ell(16, 14, 11.2, 3.6), { hi: "#FFE9B0", mid: "#F2BE62", lo: "#C98A30", rim: "#A86A1C", rimOp: 0.4 }, { lx: 0.4, ly: 0.35 });
  d.aplat(ell(12.4, 13, 3, 1, -6), "#FFFFFF", 0.6);
});

U["verrine"] = dessiner("verrine", (d) => {
  const v = "M8.4 3.6H23.6L22.6 27.4C22.6 28.8 21.4 30 20 30H12C10.6 30 9.4 28.8 9.4 27.4Z";
  d.vol(v, verre, { lx: 0.3, ly: 0.2 });
  const couche = (y1, y2, m) => d.vol(`M${8.4 + (y1 - 3.6) * 0.04} ${y1}H${23.6 - (y1 - 3.6) * 0.04}L${23.6 - (y2 - 3.6) * 0.04} ${y2}H${8.4 + (y2 - 3.6) * 0.04}Z`, m, { rim: false, lx: 0.3, ly: 0.3 });
  couche(22, 29.6, { hi: "#E9B87A", mid: "#C98A44", lo: "#8E5620" });
  couche(14.6, 22, { hi: "#FFFFFF", mid: "#FBF5EA", lo: "#E2D6C2" });
  couche(10.4, 14.6, { hi: "#FF9CB0", mid: "#E2385E", lo: "#A81E40" });
  for (const [x, y] of [[13.4, 9.4], [18.6, 9]]) sphere(d, x, y, 2, { hi: "#FFB3C6", mid: "#E33A64", lo: "#9F1239" });
  d.filet("M10.4 5.6L11.4 27", "#FFFFFF", 1, 0.9, 0.35);
});

U["coupe"] = dessiner("coupe", (d) => {
  d.vol(capsule(16, 21, 16, 28, 1.1), verre, { rim: false });
  d.vol(ell(16, 29, 6.4, 1.4), verre);
  const coupe = "M3.4 10.6H28.6C28.6 17.6 22.8 22.4 16 22.4C9.2 22.4 3.4 17.6 3.4 10.6Z";
  d.vol(coupe, verre, { lx: 0.3, ly: 0.2 });
  d.vol(ell(16, 10.6, 12.6, 3.2), { hi: "#F6FCFF", mid: "#E2F4FF", lo: "#BFDDF2" }, { rim: false });
  d.filet("M6 12.6C6.6 16.6 9.4 19.6 12.6 20.8", "#FFFFFF", 1, 0.9, 0.35);
});

U["papier-cuisson"] = dessiner("papiercuisson", (d) => {
  d.vol("M10.6 16.4L29.6 8.6L30.4 21.2L11.4 29.6Z", { hi: "#FFFFFF", mid: "#F8F4EC", lo: "#DCD2C0", rim: "#C2B6A0", rimOp: 0.4 }, { lx: 0.35, ly: 0.3 });
  d.trait("M12.6 18.6L28.6 12", "#E9DFCE", 0.4, 0.8);
  d.trait("M13 23.4L29 16.6", "#E9DFCE", 0.4, 0.8);
  d.groupe('transform="rotate(-22 10 16)"', () => {
    const rouleau = "M2.4 10.6H17.6V21.4H2.4Z";
    d.path(rouleau, d.lin([[0, "#E6DCC8"], [0.3, "#FFFFFF"], [0.7, "#EFE6D6"], [1, "#C9BCA2"]]));
    d.vol(ell(2.4, 16, 2, 5.4), { hi: "#FFFFFF", mid: "#F2ECE0", lo: "#CFC2AA" }, { rim: false });
    d.vol(ell(2.4, 16, 1, 2.6), { hi: "#C9A46E", mid: "#A87C42", lo: "#7A5424" }, { rim: false });
  });
});

U["plaque"] = dessiner("plaque", (d) => {
  const fond = { hi: "#7A7490", mid: "#46415A", lo: "#25212F", rim: "#16131D", rimOp: 0.5 };
  d.vol(arrondi([[2, 17.4], [17.6, 9.6], [30, 15.6], [14.4, 23.6]], 1.6), assombrir(fond, 0.3), { rim: false });
  d.vol(arrondi([[2, 15.4], [17.6, 7.6], [30, 13.6], [14.4, 21.6]], 1.6), fond, { lx: 0.35, ly: 0.3 });
  d.vol(arrondi([[4.6, 15.4], [17.6, 9], [27.4, 13.8], [14.4, 20.2]], 1.2), { hi: "#5E5872", mid: "#36314A", lo: "#1E1B28" }, { rim: false, lx: 0.6, ly: 0.7 });
  d.trait("M2.6 15.6L17.6 8L29.4 13.8", "#A6A0B8", 0.5, 0.9);
});

U["presse-agrumes"] = dessiner("presseagrumes", (d) => {
  d.vol("M2.6 20.6C2.6 25.4 8.6 28.6 16 28.6C23.4 28.6 29.4 25.4 29.4 20.6Z", M.ceramique, { ly: 0.1 });
  d.vol(ell(16, 20.6, 13.4, 4.6), M.ceramique, { lx: 0.4, ly: 0.3 });
  d.vol(ell(16, 21, 11.4, 3.4), { hi: "#FFF6B0", mid: "#F5D84A", lo: "#C9A61A" }, { rim: false, lx: 0.5, ly: 0.6 });
  d.vol("M30 20.4L32 21.6L30.4 22.6Z", M.ceramique, { rim: false });
  const cone = "M8.6 20.6C8.6 13.6 12 6.6 16 6.6C20 6.6 23.4 13.6 23.4 20.6C21.4 22 10.6 22 8.6 20.6Z";
  d.vol(cone, M.ceramique, { lx: 0.35, ly: 0.25 });
  for (const t of [-0.75, -0.4, 0, 0.4, 0.75]) d.trait(`M16 7.2Q${16 + t * 5} ${12} ${16 + t * 7.2} ${20.8}`, "#D8D0E4", 0.55, 0.9);
});

U["presse-puree"] = dessiner("pressepuree", (d) => {
  d.groupe('transform="rotate(-20 16 16)"', () => {
    d.vol(capsule(10, 4, 22, 4, 1.8), manche);
    d.path("M15.2 5.4H16.8V21H15.2Z", inoxH(d));
    d.vol(ell(16, 24.6, 9.4, 3.2), inox, { lx: 0.4, ly: 0.3 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) d.aplat(ell(9.2 + c * 2.7 + r * 1.3, 23.6 + r * 1.9, 0.55, 0.38), "#3E384B", 0.9);
    d.path("M6.6 24.6V26C6.6 27.8 10.8 29 16 29C21.2 29 25.4 27.8 25.4 26V24.6C25.4 26.4 21.2 27.8 16 27.8C10.8 27.8 6.6 26.4 6.6 24.6Z", inoxH(d));
  });
});

U["cafetiere"] = dessiner("cafetiere", (d) => {
  d.vol(capsule(16, 2.6, 16, 6.4, 0.6), inox, { rim: false });
  d.vol(ell(16, 2.4, 2, 1.2), manche);
  d.vol("M22 10.6H24.8C27.2 10.6 28.4 12.6 28.4 15V21.2C28.4 23.6 27 25.4 24.6 25.4H22V23H24.4C25.4 23 26 22.4 26 21.4V14.8C26 13.6 25.4 13 24.4 13H22Z", manche);
  const verreCorps = "M6.4 8.6H22.6V26.8C22.6 28.4 21.4 29.6 19.8 29.6H9.2C7.6 29.6 6.4 28.4 6.4 26.8Z";
  d.vol(verreCorps, verre, { lx: 0.3, ly: 0.2 });
  d.vol("M6.8 13.6C10 12.8 19 12.8 22.2 13.6V26.8C22.2 28.2 21.2 29.2 19.8 29.2H9.2C7.8 29.2 6.8 28.2 6.8 26.8Z", { hi: "#9C6650", mid: "#5A2E1E", lo: "#2E140A", rim: "#1E0C06", rimOp: 0.5 }, { lx: 0.3, ly: 0.2 });
  d.vol(arrondi([[6, 6.8], [23, 6.8], [23, 9.2], [6, 9.2]], 1), inox);
  d.path("M6.4 27.2H22.6V29.4C22.6 30.2 22 30.8 21.2 30.8H7.8C7 30.8 6.4 30.2 6.4 29.4Z", inoxH(d));
  d.filet("M8.6 10.6V26", "#FFFFFF", 1, 0.85, 0.35);
});

export default U;
