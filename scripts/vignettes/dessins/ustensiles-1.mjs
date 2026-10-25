// Ustensiles : inox, fonte, bois, céramique, dans la même lumière que les emojis Fluent.
import { M, dessiner, feuille, ell, capsule, arrondi, lisse, hasard, mix } from "../kit.mjs";

const U = {};
const inox = M.acier;
const manche = { hi: "#6E6A82", mid: "#3A364B", lo: "#1E1B2A", rim: "#120F1C", rimOp: 0.6 };

/* Planche à découper */
U["planche"] = dessiner("planche", (d) => {
  d.groupe('transform="rotate(-10 16 16)"', () => {
    const p = "M6 9H22.4C23.5 9 24.2 9.8 24.5 10.8L25.3 13.4H28.2C29.6 13.4 30.6 14.4 30.6 15.8V18.4C30.6 19.8 29.6 20.8 28.2 20.8H25.3L24.5 23.6C24.2 24.6 23.5 25.4 22.4 25.4H6C4.6 25.4 3.6 24.4 3.6 23V11.4C3.6 10 4.6 9 6 9Z";
    d.path(`M3.6 12V24.6C3.6 26 4.6 27 6 27H22.4C23.5 27 24.2 26.2 24.5 25.2L25.3 22.4H28.2C29.6 22.4 30.6 21.4 30.6 20V15.8Z`, mix(M.bois.lo, "#000000", 0.15));
    d.path(`${p}M28.1 17.1m-1.25 0a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0 -2.5 0Z`, d.rad([[0, M.bois.hi], [0.55, M.bois.mid], [1, M.bois.lo]], { cx: 0.3, cy: 0.25, r: 1 }), ' fill-rule="evenodd"');
    for (const [y, o] of [[12.4, 0.5], [15.6, 0.35], [19.4, 0.45], [22.4, 0.3]]) d.trait(`M6 ${y}C10 ${y - 0.8} 15 ${y + 0.7} 22 ${y - 0.2}`, "#F8D7A6", 0.4, o);
    d.filet("M6.2 10.4H21.6", "#FFFFFF", 0.6, 0.6, 0.3);
  });
});

/* Casserole : corps en inox, long manche */
U["casserole"] = dessiner("casserole", (d) => {
  d.vol(capsule(21.6, 15.4, 30.6, 10.6, 1.25, 1.15), manche);
  d.filet("M23 14.2L29.4 10.8", "#FFFFFF", 0.4, 0.4, 0.2);
  const corps = "M2.6 13.4V24.4C2.6 26.8 4.5 28.7 6.9 28.7H18.3C20.7 28.7 22.6 26.8 22.6 24.4V13.4Z";
  d.path(corps, d.lin([[0, "#8F87A0"], [0.18, "#FBFAFF"], [0.4, "#C9C3D6"], [0.8, "#9C93AD"], [1, "#706882"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  d.path(corps, d.lin([[0.6, "#4B4360", 0], [1, "#4B4360", 0.35]]));
  d.vol(ell(12.6, 13.4, 10.2, 3.1), inox, { lx: 0.4, ly: 0.2 });
  d.vol(ell(12.6, 13.6, 9.1, 2.45), { hi: "#7F778F", mid: "#5A5269", lo: "#3E384B", rim: "#2C2737", rimOp: 0.4 }, { lx: 0.6, ly: 0.8 });
  d.filet("M5.4 16.2V25.6", "#FFFFFF", 0.9, 0.85, 0.35);
});

/* Plat à gratin, avec un gratin doré */
U["plat-gratin"] = dessiner("platgratin", (d) => {
  const cer = { hi: "#FFFFFF", mid: "#F3EFF7", lo: "#D5CCE0", rim: "#B4AAC6", rimOp: 0.5 };
  d.vol("M2.4 15.6V19C2.4 23.6 8.6 27.4 16 27.4C23.4 27.4 29.6 23.6 29.6 19V15.6Z", cer, { ly: 0.1 });
  d.vol(ell(1.8, 15.8, 2, 1.4), cer);
  d.vol(ell(30.2, 15.8, 2, 1.4), cer);
  d.vol(ell(16, 15.6, 13.6, 7.2), cer, { lx: 0.4, ly: 0.3 });
  const gratin = ell(16, 15.8, 11.4, 5.6);
  d.vol(gratin, { hi: "#FFE79A", mid: "#F2B649", lo: "#C47A22", rim: "#9C5A14", rimOp: 0.5 }, { lx: 0.4, ly: 0.35 });
  const r = hasard(5);
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.8; d.aplat(ell(16 + Math.cos(a) * 11 * k, 15.8 + Math.sin(a) * 5.4 * k, 0.9 + r() * 0.8, 0.5 + r() * 0.4, r() * 180), r() > 0.45 ? "#B5631C" : "#FFF3C2", 0.55); }
  d.trait("M4.2 17.6C6.6 21.6 25.4 21.6 27.8 17.6", "#FFFFFF", 0.5, 0.7);
});

/* Plat vide (service, plat peu profond) */
U["plat"] = dessiner("plat", (d) => {
  const cer = { hi: "#FFFFFF", mid: "#F3EFF7", lo: "#D5CCE0", rim: "#B4AAC6", rimOp: 0.5 };
  d.vol("M2.4 15.6V18.4C2.4 23 8.6 26.8 16 26.8C23.4 26.8 29.6 23 29.6 18.4V15.6Z", cer, { ly: 0.1 });
  d.vol(ell(16, 15.6, 13.6, 7.2), cer, { lx: 0.4, ly: 0.3 });
  d.vol(ell(16, 16, 11, 5.4), { hi: "#F6F2FA", mid: "#E7E0EF", lo: "#CFC6DB", rim: "#B8AECA", rimOp: 0.4 }, { lx: 0.6, ly: 0.75 });
  d.filet("M7 12.2C9 10.8 12 10 15 9.8", "#FFFFFF", 0.8, 0.9, 0.3);
});

/* Four */
U["four"] = dessiner("four", (d) => {
  const carc = arrondi([[3.4, 3.4], [28.6, 3.4], [28.6, 29.2], [3.4, 29.2]], 2.6);
  d.vol(carc, { hi: "#FFFFFF", mid: "#E6E1EE", lo: "#B9B0C8", rim: "#9A90AE", rimOp: 0.45 });
  d.vol(arrondi([[4.6, 4.6], [27.4, 4.6], [27.4, 9.4], [4.6, 9.4]], 1.4), { hi: "#6E6880", mid: "#3D394B", lo: "#25222F", rim: "#16141D", rimOp: 0.4 }, { rim: false });
  for (const x of [8.4, 12.6]) { d.vol(ell(x, 7, 1.5, 1.5), inox); d.trait(`M${x} 5.9V7`, "#4B4360", 0.4); }
  d.aplat(arrondi([[17, 6.2], [25.4, 6.2], [25.4, 7.8], [17, 7.8]], 0.6), "#8CF0B6", 0.85);
  const porte = arrondi([[6, 12], [26, 12], [26, 26.6], [6, 26.6]], 1.8);
  d.vol(porte, { hi: "#5E5872", mid: "#2E2A3A", lo: "#191620", rim: "#0E0C14", rimOp: 0.5 }, { rim: false });
  d.halo(ell(16, 21.6, 7.4, 3.2), "#FF9A3C", 0.75, 1.4);
  d.halo(ell(16, 22, 4.2, 1.6), "#FFD36A", 0.8, 0.8);
  d.vol(capsule(8.4, 13.6, 23.6, 13.6, 0.85), inox);
  d.reflet(porte, "M7.4 16L12.4 25.6H10L7 18.4Z", 0.25, 0.4);
});

/* Saladier (céramique blanche, intérieur lilas) */
U["saladier"] = dessiner("saladier", (d) => {
  d.vol(ell(16, 12.6, 14.4, 4.6), { hi: "#E9E1F5", mid: "#D2C6E4", lo: "#B0A2C9", rim: "#9888B6", rimOp: 0.4 }, { lx: 0.55, ly: 0.75, rim: false });
  const corps = "M1.6 12.6C1.6 21.4 8 28.4 16 28.4C24 28.4 30.4 21.4 30.4 12.6C28 15.6 22 17.2 16 17.2C10 17.2 4 15.6 1.6 12.6Z";
  d.vol(corps, M.ceramique, { ly: 0.1 });
  d.trait("M2.2 13.1C4.8 15.8 10.4 17.3 16 17.3C21.6 17.3 27.2 15.8 29.8 13.1", "#FFFFFF", 0.6, 0.9);
  d.filet("M4.4 17.4C5.6 21.4 8.6 24.6 12 25.8", "#FFFFFF", 1, 0.8, 0.4);
  d.vol(ell(16, 29, 6.4, 1.2), { hi: "#E9E4F0", mid: "#D4CCE0", lo: "#B7ADC8" }, { rim: false });
});

/* Fouet */
U["fouet"] = dessiner("fouet", (d) => {
  d.groupe('transform="rotate(38 16 16)"', () => {
    const fils = [[1.4, "#9A91AE"], [3.4, "#B6AEC8"], [5.4, "#C9C2D8"], [6.8, "#B0A8C2"]];
    for (const [w, c] of fils) {
      const p = `M16 20.6C${16 - w * 0.5} 17.4 ${16 - w} 11 ${16 - w * 0.86} 6.4C${16 - w * 0.6} 3.4 ${16 + w * 0.6} 3.4 ${16 + w * 0.86} 6.4C${16 + w} 11 ${16 + w * 0.5} 17.4 16 20.6`;
      d.trait(p, c, 0.8);
      d.trait(p, "#FFFFFF", 0.28, 0.6);
    }
    d.vol(capsule(16, 21.2, 16, 30.6, 1.75, 1.95), manche);
    d.vol(capsule(16, 19.4, 16, 21.8, 1.25, 1.55), inox);
    d.filet("M15.2 23V29", "#FFFFFF", 0.5, 0.5, 0.2);
  });
});

/* Spatule (à crêpes, ajourée) */
U["spatule"] = dessiner("spatule", (d) => {
  d.groupe('transform="rotate(32 16 16)"', () => {
    d.vol(capsule(16, 18, 16, 30.6, 1.35, 1.6), M.bois);
    d.vol(capsule(16, 15.6, 16, 19.4, 0.9), inox);
    const tete = "M10.6 2.4H21.4C22.4 2.4 23 3 23 4V13.6C23 14.6 22.6 15.2 21.6 15.4L17.2 16.4H14.8L10.4 15.4C9.4 15.2 9 14.6 9 13.6V4C9 3 9.6 2.4 10.6 2.4Z";
    d.path(`${tete}${[11.6, 15.1, 18.6].map((x) => `M${x} 4.6H${x + 1.8}V12.4H${x}Z`).join("")}`, d.lin([[0, "#9087A3"], [0.2, "#F7F5FB"], [0.5, "#CFC8DB"], [1, "#8C8399"]], { x1: 0, y1: 0, x2: 1, y2: 0 }), ' fill-rule="evenodd"');
  });
});

/* Louche */
U["louche"] = dessiner("louche", (d) => {
  d.trait("M15.4 22C18.8 15 22.6 8.6 25.4 4.6C26.4 3.2 27.8 2.6 28.6 3.6", "#9A91AE", 2.1);
  d.trait("M15.4 22C18.8 15 22.6 8.6 25.4 4.6C26.4 3.2 27.8 2.6 28.6 3.6", "#F4F1FA", 0.6, 0.85);
  d.vol(ell(10.6, 21.2, 8.6, 2.6), { hi: "#7F778F", mid: "#5A5269", lo: "#3E384B", rim: "#2C2737", rimOp: 0.4 }, { lx: 0.6, ly: 0.8, rim: false });
  const bol = "M2 21.2C2 26.2 5.8 30 10.6 30C15.4 30 19.2 26.2 19.2 21.2C17.6 22.8 14 23.6 10.6 23.6C7.2 23.6 3.6 22.8 2 21.2Z";
  d.path(bol, d.lin([[0, "#8F87A0"], [0.22, "#FBFAFF"], [0.5, "#C9C3D6"], [1, "#706882"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  d.trait("M2.4 21.6C4 23 7.2 23.8 10.6 23.8C14 23.8 17.2 23 18.8 21.6", "#FFFFFF", 0.5, 0.8);
});

/* Passoire */
U["passoire"] = dessiner("passoire", (d) => {
  d.vol(ell(16, 12, 13.4, 4), { hi: "#7F778F", mid: "#5A5269", lo: "#3E384B", rim: "#2C2737", rimOp: 0.4 }, { lx: 0.6, ly: 0.8, rim: false });
  for (const x of [2.4, 29.6]) d.vol(arrondi([[x - 1.8, 10.8], [x + 1.8, 10.8], [x + 1.8, 13], [x - 1.8, 13]], 0.9), inox);
  const corps = "M2.6 12C2.6 20 8.6 26.2 16 26.2C23.4 26.2 29.4 20 29.4 12C27 14.8 21.6 16 16 16C10.4 16 5 14.8 2.6 12Z";
  d.path(corps, d.lin([[0, "#8F87A0"], [0.2, "#FBFAFF"], [0.45, "#D5CFE0"], [0.8, "#A59CB6"], [1, "#776E8A"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  for (const [y, n, l] of [[18, 7, 10.6], [21.4, 5, 7.8], [24, 3, 4.6]]) for (let i = 0; i < n; i++) d.aplat(ell(16 - l + (i * 2 * l) / (n - 1), y, 0.62, 0.48), "#3E384B", 0.85);
  d.trait("M3 12.5C5.4 15 10.6 16.2 16 16.2C21.4 16.2 26.6 15 29 12.5", "#FFFFFF", 0.55, 0.85);
  d.vol("M10.6 25.4H21.4L22.4 28.4C22.6 29.2 22 29.8 21.2 29.8H10.8C10 29.8 9.4 29.2 9.6 28.4Z", inox);
});

/* Râpe */
U["rape"] = dessiner("rape", (d) => {
  d.vol(capsule(12.6, 4.4, 19.4, 4.4, 1.5), manche);
  d.path("M20.6 7.4L25.8 9.2L27.4 28.4L22.2 30Z", d.lin([[0, "#A99FBB"], [1, "#6E6680"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  const face = "M9.6 7.4H20.6L22.2 30H8Z";
  d.path(face, d.lin([[0, "#9C93AD"], [0.25, "#FBFAFF"], [0.55, "#D2CCDD"], [1, "#9C93AD"]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
    const y = 10.4 + r * 2.7, x = 10.4 + c * 2.6 + (r % 2) * 1.2 - r * 0.2;
    d.trait(`M${x} ${y + 0.5}Q${x + 0.7} ${y - 0.6} ${x + 1.4} ${y + 0.5}`, "#4B4360", 0.5, 0.85);
  }
  d.filet("M10.6 8.8L9.4 28", "#FFFFFF", 0.7, 0.6, 0.3);
});

/* Blender */
U["blender"] = dessiner("blender", (d) => {
  d.vol(arrondi([[8.4, 23.2], [23.6, 23.2], [24.8, 30], [7.2, 30]], 1.4), { hi: "#7A7490", mid: "#3D394D", lo: "#211E2B", rim: "#15121D", rimOp: 0.5 });
  d.aplat(ell(16, 26.8, 1.4, 1.4), "#8CF0B6", 0.9);
  d.vol("M23 9.4H25.6C27.4 9.4 28.6 10.8 28.6 12.6V16.4C28.6 18.2 27.4 19.6 25.6 19.6H22.6V17.6H25.4C26 17.6 26.4 17.2 26.4 16.6V12.4C26.4 11.8 26 11.4 25.4 11.4H23Z", { hi: "#C9F0FF", mid: "#9DD3F0", lo: "#6FA7CF", rim: "#4F87B4", rimOp: 0.4 });
  const pot = "M7.4 5.4H24.6L22.2 23.4H9.8Z";
  d.vol(pot, M.verre, { rimOp: 0.45 });
  const smoothie = "M8.5 12.4C12 11.6 20 11.6 23.5 12.4L22.2 23.4H9.8Z";
  d.vol(smoothie, { hi: "#FFC1D9", mid: "#E86AA2", lo: "#A8306A", rim: "#851F52", rimOp: 0.45 });
  d.trait("M8.8 12.5C12 11.8 20 11.8 23.2 12.5", "#FFE3F0", 0.5, 0.8);
  d.filet("M9.4 7L11.2 22", "#FFFFFF", 0.9, 0.8, 0.35);
  d.vol(arrondi([[6.6, 3.2], [25.4, 3.2], [25.4, 6], [6.6, 6]], 1.1), { hi: "#7A7490", mid: "#3D394D", lo: "#211E2B" }, { rim: false });
});

export default U;
