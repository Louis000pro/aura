// Cinquième série : crèmerie, œuf, viandes et poissons.
import { M, dessiner, feuille, nervure, ell, capsule, arrondi, boite, lisse, hasard, mix } from "../kit.mjs";
import { sphere, assombrir } from "../modeles.mjs";
import { lireFluent, recolorer, hslVersHex as H } from "../fluent.mjs";

const C = {};
const blanc = { hi: "#FFFFFF", mid: "#F6F4F0", lo: "#D9D3C8", rim: "#BCB5A6", rimOp: 0.45 };

/* ── Crèmerie ── */
C["creme-liquide"] = dessiner("cremeliquide", (d) => {
  d.vol("M21.6 13C25.6 13 27.6 15.4 27.6 18.6C27.6 22 25.2 24.4 21.2 24.6L21.4 22.2C23.8 22 25.2 20.6 25.2 18.6C25.2 16.6 23.8 15.2 21.6 15.2Z", M.ceramique);
  const pot = "M6.6 9.6H22.6L21.6 26.6C21.4 28.6 19.8 30 17.8 30H11.4C9.4 30 7.8 28.6 7.6 26.6Z";
  d.vol(pot, M.ceramique, { lx: 0.3, ly: 0.2 });
  d.vol(ell(14.6, 9.6, 8, 2.1), { hi: "#FFFFFF", mid: "#FFF9EC", lo: "#EEDDBE" }, { rim: false });
  d.vol("M6.8 9.4L3.2 7.4C2.8 7.2 3 6.6 3.6 6.8L8 8.2Z", M.ceramique, { rim: false });
  d.vol(arrondi([[7.2, 17], [22, 17], [21.6, 22.4], [7.6, 22.4]], 0.4), { hi: "#E9F5FF", mid: "#A9D3F2", lo: "#6FA6D6", rim: "#5A90C2", rimOp: 0.3 }, { ly: 0.1 });
  d.filet("M9.4 12L10 27", "#FFFFFF", 0.9, 0.8, 0.35);
  const goutte = "M4 10.8C4 10.8 2.2 13.2 2.2 14.4C2.2 15.4 3 16.2 4 16.2C5 16.2 5.8 15.4 5.8 14.4C5.8 13.2 4 10.8 4 10.8Z";
  d.vol(goutte, { hi: "#FFFFFF", mid: "#FFF8EA", lo: "#E6D6B6" }, { rim: false });
});

C["chantilly"] = dessiner("chantilly", (d) => {
  d.vol("M5.4 19.6H26.6L23 25.4C22.2 26.6 20.8 27.2 19.4 27.2H12.6C11.2 27.2 9.8 26.6 9 25.4Z", M.verre, { rimOp: 0.4 });
  d.vol(capsule(16, 27, 16, 29.4, 1.1), M.verre, { rim: false });
  d.vol(ell(16, 29.8, 6, 1.3), M.verre);
  const creme = { hi: "#FFFFFF", mid: "#FDF8F0", lo: "#E4D8C6", rim: "#CBBDA8", rimOp: 0.45 };
  d.vol(ell(16, 19.6, 10.8, 2.8), creme, { rim: false });
  for (const [y, h, l] of [[17.4, 6.4, 9.8], [12.6, 6, 7.4], [8.4, 5.4, 5], [5, 4.4, 2.8]]) {
    const p = `M${16 - l - 1.4} ${y + h * 0.3}C${16 - l} ${y - h * 0.5} ${16 + l} ${y - h * 0.5} ${16 + l + 1.4} ${y + h * 0.3}C${16 + l * 0.6} ${y + h * 0.75} ${16 - l * 0.6} ${y + h * 0.75} ${16 - l - 1.4} ${y + h * 0.3}Z`;
    d.vol(p, creme, { lx: 0.35, ly: 0.2 });
    d.trait(`M${16 - l * 0.7} ${y + h * 0.18}C${16 - l * 0.25} ${y - h * 0.18} ${16 + l * 0.25} ${y - h * 0.18} ${16 + l * 0.7} ${y + h * 0.18}`, "#E6D8C2", 0.5, 0.85);
  }
  d.trait("M18.6 2.6C19.6 1.4 21 0.8 22.4 1", "#5E8C2E", 0.6);
  sphere(d, 17.8, 3.2, 2.3, { hi: "#FF9C9C", mid: "#D8243C", lo: "#8E0E22", rim: "#6A0818", rimOp: 0.4 }, { brillance: 0.75 });
});

C["fromage-frais"] = dessiner("fromagefrais", (d) => {
  d.vol("M3 16.4C3 23.4 8.8 28 16 28C23.2 28 29 23.4 29 16.4Z", M.ceramique, { ly: 0.1 });
  d.vol(ell(16, 16.4, 13, 5.4), { hi: "#E9E1F2", mid: "#D6CBE4", lo: "#B9AACD" }, { rim: false });
  const mont = "M4.6 16.6C5.4 12.6 9.6 9.2 13.6 9.6C14.6 7.2 18.4 6.6 19.8 9C23.6 9.4 27.4 12.6 27.4 16.6C24.6 19.6 7.4 19.6 4.6 16.6Z";
  d.vol(mont, { hi: "#FFFFFF", mid: "#FCFAF4", lo: "#E2DACB", rim: "#C9BEAA", rimOp: 0.45 }, { lx: 0.4, ly: 0.25 });
  for (const p of ["M8.4 14.6C11 12.6 14.4 12.4 17 13.6", "M15.6 11.6C17.8 10.6 20.4 11 22.6 12.6", "M11 17C14.6 15.8 19.6 15.8 23 17"]) d.trait(p, "#E6DDCB", 0.5, 0.85);
  d.vol(capsule(21.8, 12.4, 30.2, 5.2, 1, 0.85), M.acier);
  d.trait("M3.6 16.9C6.4 19.8 25.6 19.8 28.4 16.9", "#FFFFFF", 0.55, 0.85);
});

C["parmesan"] = dessiner("parmesan", (d) => {
  // la géométrie de l'emoji « Cheese wedge », sans les trous de l'emmental, avec une croûte
  const face = "M4 13.3C4 12.7 4.45 12.14 5.07 12L27.35 7.1C28.2 6.9 29 7.55 29 8.42V24.2C29 24.8 28.55 25.3 27.93 25.4L5.65 29.9C4.8 30.1 4 29.46 4 28.6Z";
  d.vol(face, { hi: "#FFF4C8", mid: "#F2D27C", lo: "#C99C42", rim: "#AC8232", rimOp: 0.4 }, { lx: 0.25, ly: 0.2 });
  d.vol("M25.2 7.6L27.35 7.1C28.2 6.9 29 7.55 29 8.42V24.2C29 24.8 28.55 25.3 27.93 25.4L25.2 26Z", { hi: "#E9B868", mid: "#C68834", lo: "#8E5A18", rim: "#6E420E", rimOp: 0.45 }, { lx: 0.2, ly: 0.2 });
  const dessus = "M4.72 12.12L15.74 2.56C16.45 1.95 17.45 1.82 18.29 2.24L28.07 7.13Z";
  d.vol(dessus, { hi: "#FFFCE6", mid: "#F8E4A2", lo: "#DCBA6A", rim: "#C29E52", rimOp: 0.35 }, { lx: 0.4, ly: 0.4 });
  d.vol("M16.2 2.2C16.8 1.9 17.6 1.9 18.29 2.24L28.07 7.13L25.6 7.66L16.6 3.2Z", { hi: "#E9B868", mid: "#C68834", lo: "#8E5A18" }, { rim: false });
  const r = hasard(15);
  for (const zone of [face, dessus]) {
    const cl = d.clip(zone);
    d.brut(`<g clip-path="${cl}">`);
    for (let i = 0; i < 40; i++) d.aplat(ell(4 + r() * 22, 3 + r() * 26, 0.38, 0.28, r() * 180), r() > 0.45 ? "#FFFDF2" : "#D4AE5C", 0.75);
    d.brut("</g>");
  }
});

C["fromage-rape"] = dessiner("fromagerape", (d) => {
  d.inclure(lireFluent("cheese_wedge"), "translate(12.4 1.6) scale(0.56)");
  const r = hasard(21);
  const tas = "M2.4 29.4C3 23.4 7 19.4 12.4 19.4C17.8 19.4 21.8 23.4 22.4 29.4Z";
  d.vol(tas, { hi: "#FFF6B0", mid: "#F5D257", lo: "#CC9A1E", rim: "#A87A14", rimOp: 0.4 }, { lx: 0.4, ly: 0.2 });
  const cl = d.clip(tas);
  d.brut(`<g clip-path="${cl}">`);
  for (let i = 0; i < 34; i++) { const x = 2 + r() * 20, y = 19 + r() * 11, a = r() * Math.PI; d.trait(`M${x} ${y}q${Math.cos(a) * 1.8} ${Math.sin(a) * 1.8 - 1} ${Math.cos(a) * 3.4} ${Math.sin(a) * 3.4}`, r() > 0.5 ? "#FFF3B0" : "#D9A52A", 0.6, 0.95); }
  d.brut("</g>");
  for (let i = 0; i < 6; i++) { const x = 21 + r() * 8, y = 26 + r() * 4; d.trait(`M${x} ${y}q1 -0.8 2.2 -0.2`, "#E6B53A", 0.7); }
});

C["feta"] = dessiner("feta", (d) => {
  const b = boite(13.6, 27.2, 13.4, 9.4, 9.2, 1);
  d.vol(b.gauche, { hi: "#F6F7F4", mid: "#E7E8E2", lo: "#C9CCC2" }, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.droite, { hi: "#E9EAE4", mid: "#D6D8CF", lo: "#B4B8AA" }, { rim: false, lx: 0.2, ly: 0.2 });
  d.vol(b.dessus, { hi: "#FFFFFF", mid: "#FBFBF8", lo: "#E6E7E0" }, { rim: false, lx: 0.35, ly: 0.35 });
  const r = hasard(10);
  for (let i = 0; i < 22; i++) { const { B0, T0, T2 } = b.sommets; const u = r(), v = r(); d.aplat(ell(B0[0] + (T2[0] - T0[0]) * u + 0.2, B0[1] - (B0[1] - T0[1]) * v + (T2[1] - T0[1]) * u, 0.35, 0.25), "#C2C6B8", 0.6); }
  for (const [x, y, s] of [[24.6, 27.8, 2.6], [28.2, 24.6, 2], [20.4, 30, 1.8]]) {
    const pts = [];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r(); pts.push([x + Math.cos(a) * s * (0.75 + r() * 0.4), y + Math.sin(a) * s * (0.65 + r() * 0.3)]); }
    d.vol(arrondi(pts, 0.6), { hi: "#FFFFFF", mid: "#F2F3EE", lo: "#CDD0C4" }, { rim: false });
  }
});

C["mozzarella"] = dessiner("mozzarella", (d) => {
  const m = { hi: "#FFFFFF", mid: "#F8F7F2", lo: "#D9D6CB", rim: "#BBB7A9", rimOp: 0.45 };
  sphere(d, 13.6, 17.4, 10.6, m, { brillance: 0.75 });
  sphere(d, 25.2, 24.4, 5.2, m, { brillance: 0.75 });
  for (const o of [{ x: 17.6, y: 9.6, L: 9, W: 5.6, deg: 30, plie: -0.4 }, { x: 17.6, y: 9.6, L: 8, W: 5, deg: 85, plie: 0.4 }]) {
    d.vol(feuille({ ...o, ventre: 0.42, rond: 0.85 }), { hi: "#B8F08A", mid: "#45B640", lo: "#22812F", rim: "#176624", rimOp: 0.5 }, { lx: 0.4, ly: 0.25 });
    d.trait(nervure({ ...o, a: 0.8 }), "#E6FFD0", 0.45, 0.65);
  }
});

C["lait-vegetal"] = dessiner("laitvegetal", (d) => {
  d.vol("M20.6 9.6L26.4 6.8V26.6L20.6 30Z", { hi: "#E6F1DA", mid: "#CBDDB8", lo: "#9EB78A" }, { rim: false });
  d.vol("M7 9.6H20.6V30H7Z", { hi: "#FFFFFF", mid: "#F7F9F2", lo: "#DCE2D2", rim: "#C2CBB4", rimOp: 0.4 }, { lx: 0.3, ly: 0.2 });
  d.vol("M7 9.6L11 3.4H24.4L20.6 9.6Z", { hi: "#FFFFFF", mid: "#EEF3E6", lo: "#CFD8C2" }, { rim: false });
  d.vol("M20.6 9.6L24.4 3.4L26.4 6.8Z", { hi: "#DCE8CE", mid: "#BFD1AA", lo: "#94AD7E" }, { rim: false });
  d.vol(arrondi([[10.6, 1.6], [24.6, 1.6], [24.6, 3.6], [10.6, 3.6]], 0.5), { hi: "#FFFFFF", mid: "#EEF3E6", lo: "#CFD8C2" }, { rim: false });
  d.vol("M7 18.6H20.6V26H7Z", { hi: "#B6E39A", mid: "#6DB24E", lo: "#3E7E2C", rim: "#2E6620", rimOp: 0.3 }, { ly: 0.1 });
  d.vol("M20.6 18.6L26.4 15.6V23L20.6 26Z", { hi: "#8FC872", mid: "#4E933A", lo: "#2E6620" }, { rim: false });
  for (const [x, y] of [[11.4, 22.4], [14.6, 21.4], [17.2, 22.6]]) d.vol(ell(x, y, 1.5, 1.2, -20), { hi: "#FFF7D6", mid: "#F2DE9A", lo: "#C9AE5E" }, { rim: false });
  d.filet("M8.8 11.6V17.4", "#FFFFFF", 0.8, 0.9, 0.3);
});

C["oeuf-casse"] = dessiner("oeufcasse", (d) => {
  const coquille = { hi: "#FFF6EC", mid: "#F2DCC2", lo: "#C9A07A", rim: "#A87E58", rimOp: 0.45 };
  const dents = [...Array(9)].map((_, i) => `L${5.4 + ((i + 1) * 21.2) / 9} ${i % 2 ? 15.2 : 13}`).join("");
  d.vol(`M5.4 14.6${dents}L26.6 15.2C26.6 24 22 29.8 16 29.8C10 29.8 5.4 24 5.4 15.2Z`, coquille, { lx: 0.35, ly: 0.25 });
  d.vol(ell(16, 15.6, 9.4, 3), { hi: "#FFFFFF", mid: "#FBF8F2", lo: "#E2DACB" }, { rim: false });
  sphere(d, 16, 13.8, 5.4, { hi: "#FFE9A0", mid: "#FFB21E", lo: "#E07A08", rim: "#C25E06", rimOp: 0.4 }, { brillance: 0.75 });
});

/* ── Viandes ── */
C["jambon"] = dessiner("jambon", (d) => {
  const rose = { hi: "#FFE3E3", mid: "#F7A9AE", lo: "#D9707E", rim: "#C2566A", rimOp: 0.45 };
  for (const [dx, dy, deg] of [[3.4, -3, -14], [0, 0, 0], [-2.8, 3.8, 12]]) {
    d.groupe(`transform="translate(${dx} ${dy}) rotate(${deg} 16 17)"`, () => {
      const tranche = "M4.6 12.6C7.6 10.6 12 12.4 16 11.4C20 10.4 24.4 9.2 27.4 11.4C28.6 15.4 27.6 20.4 27.4 23.4C24.4 25.6 20 24 16 25C12 26 7.6 27.2 4.6 25.2C3.4 21.2 4.4 16.4 4.6 12.6Z";
      d.vol(tranche, rose, { lx: 0.35, ly: 0.3 });
      d.trait("M5.2 13C8 11.4 12 13 16 12C20 11 24.2 9.8 26.8 11.8", "#FFFDF8", 1.4, 0.95);
      d.trait("M8 19C12 18 18 20 24 17.6", "#E9939C", 0.5, 0.6);
    });
  }
});

C["steak-hache"] = dessiner("steakhache", (d) => {
  const chair = { hi: "#F59A92", mid: "#D8545A", lo: "#9C2C3A", rim: "#7E1E2E", rimOp: 0.5 };
  d.vol("M3.4 16V19.6C3.4 24.4 9 27.8 16 27.8C23 27.8 28.6 24.4 28.6 19.6V16Z", assombrir(chair, 0.2), { rim: false });
  const dessus = ell(16, 16, 12.6, 7.6);
  d.vol(dessus, chair, { lx: 0.35, ly: 0.3 });
  const r = hasard(26);
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.95; const x = 16 + Math.cos(a) * 12 * k, y = 16 + Math.sin(a) * 7.2 * k; d.trait(`M${x} ${y}q0.5 ${-0.4 + r() * 0.8} 1.1 0`, r() > 0.45 ? "#FFC7C2" : "#8E2232", 0.5, 0.85); }
  for (let i = 0; i < 30; i++) { const x = 3.6 + r() * 24.8, y = 18 + r() * 8; d.aplat(ell(x, y, 0.35, 0.25), r() > 0.5 ? "#E06A70" : "#7A1A28", 0.7); }
});

C["magret"] = dessiner("magret", (d) => {
  const viande = { hi: "#E5838A", mid: "#B23A48", lo: "#741A2A", rim: "#5A1020", rimOp: 0.5 };
  const gras = { hi: "#FFFDF4", mid: "#F6E2BC", lo: "#D9B886", rim: "#BF9A62", rimOp: 0.45 };
  // le magret entier, côté gras quadrillé
  d.vol("M2.6 11.4C2.6 16.4 7 19.6 12.6 19.6C18.2 19.6 22.4 16.6 22.4 11.6Z", viande, { lx: 0.3, ly: 0.2 });
  const peau = "M2.6 11.4C2.8 7.6 7.4 4.6 12.8 4.8C18.2 5 22.4 7.8 22.4 11.6C20.4 13.6 5.2 13.8 2.6 11.4Z";
  d.vol(peau, { ...gras, hi: "#FFFBEA", mid: "#F9E3B2", lo: "#E0B56E" }, { lx: 0.35, ly: 0.25 });
  const cl = d.clip(peau);
  d.brut(`<g clip-path="${cl}">`);
  for (let k = -2; k <= 4; k++) d.trait(`M${3 + k * 4.2} 3L${10 + k * 4.2} 15`, "#D6A866", 0.4, 0.85);
  d.brut("</g>");
  d.reflet(peau, ell(8.4, 7.4, 3.4, 1, -12), 0.6, 0.4);
  // trois tranches rosées, bord de gras dessus
  for (const [deg, dx] of [[-8, 0], [6, 3.4], [20, 6.6]]) {
    d.groupe(`transform="translate(${dx} 0) rotate(${deg} 15 24)"`, () => {
      const t = "M4.6 21.6C4.6 20.4 5.6 19.6 6.8 19.6H22.4C23.6 19.6 24.6 20.4 24.6 21.6V26.4C24.6 28 23.4 29.2 21.8 29.2H7.4C5.8 29.2 4.6 28 4.6 26.4Z";
      d.path(t, d.lin([[0, "#9E2A3A"], [0.3, "#E7838A"], [0.55, "#F6A3A6"], [0.8, "#D46470"], [1, "#8A2232"]]));
      d.vol("M4.6 21.6C4.6 20.4 5.6 19.6 6.8 19.6H22.4C23.6 19.6 24.6 20.4 24.6 21.6V22.4H4.6Z", gras, { rim: false });
    });
  }
});

C["porc"] = recolorer(lireFluent("cut_of_meat"), (hex, [h, s, l]) => (s < 0.12 ? null : H(h > 200 ? h : 352 + (h > 180 ? 0 : h * 0.15), s * 0.72, Math.min(0.94, l * 1.1 + 0.04))));

/* ── Poissons et coquillages ── */
C["saumon"] = dessiner("saumon", (d) => {
  const chair = { hi: "#FFD6B6", mid: "#FF8E60", lo: "#D9583C", rim: "#B8402A", rimOp: 0.45 };
  d.groupe('transform="rotate(-22 16 17)"', () => {
    d.vol("M2.6 17.6C2.6 21.2 5 23.4 8.4 23.4L24.6 22.6C27.4 22.4 29.6 20.8 29.6 18.6V16.2H2.6Z", { hi: "#E2E6EE", mid: "#A2AABA", lo: "#5E6678", rim: "#454C5E", rimOp: 0.5 }, { lx: 0.3, ly: 0.2 });
    d.vol("M2.6 15.6C2.6 19.2 5 21.4 8.4 21.4L24.6 20.6C27.4 20.4 29.6 18.8 29.6 16.6V15.2H2.6Z", { hi: "#FF9E78", mid: "#E2633E", lo: "#B0442A" }, { rim: false });
    const dessus = "M2.6 14.6C2.6 11 5.2 9 8.6 9H23.4C26.6 9 29.6 11.2 29.6 14.4C29.6 16.8 27.4 18.4 24.6 18.6L8.4 19.4C5 19.6 2.6 17.6 2.6 14.6Z";
    d.vol(dessus, chair, { lx: 0.35, ly: 0.3 });
    const cl = d.clip(dessus);
    d.brut(`<g clip-path="${cl}">`);
    for (let k = 0; k < 8; k++) { const x = 5 + k * 3.2; d.trait(`M${x} 8.6C${x + 2.4} 11.4 ${x + 2.4} 16.2 ${x} 19.6`, "#FFEADC", 0.65, 0.95); }
    d.brut("</g>");
    d.reflet(dessus, ell(10, 11.2, 5, 1.2), 0.5, 0.5);
  });
});

C["saumon-fume"] = dessiner("saumonfume", (d) => {
  const m = { hi: "#FFCDB2", mid: "#FF8A62", lo: "#D2563C", rim: "#B4442E", rimOp: 0.45 };
  // des tranches fines et drapées, marbrées de blanc, avec un brin d'aneth
  for (const [dx, dy, deg] of [[3.6, -4.4, -16], [0, 0, -2], [-2.6, 4.6, 12]]) {
    d.groupe(`transform="translate(${dx} ${dy}) rotate(${deg} 16 17)"`, () => {
      const tranche = "M3.6 13.6C6.6 11 11.4 13.4 16 12C20.6 10.6 25 9.4 28.4 12C29.2 15.6 28.4 19.6 28.2 22.4C25 24.8 20.4 22.8 16 24C11.6 25.2 7 26.6 3.8 24.4C2.8 20.6 3.4 16.8 3.6 13.6Z";
      d.vol(tranche, m, { lx: 0.35, ly: 0.3 });
      const cl = d.clip(tranche);
      d.brut(`<g clip-path="${cl}">`);
      for (let k = 0; k < 7; k++) { const x = 4 + k * 3.8; d.trait(`M${x} 10C${x + 2.6} 14 ${x - 1} 19 ${x + 2} 27`, "#FFE8DC", 0.55, 0.9); }
      d.brut("</g>");
    });
  }
  for (const [a, l] of [[-0.5, 4], [0, 4.8], [0.5, 4]]) d.trait(`M25.6 29.6l${Math.sin(a) * l} ${-Math.cos(a) * l}`, "#5DAE40", 0.5);
  for (let k = 0; k < 9; k++) d.trait(`M${23.6 + (k % 3) * 2} ${25.6 + Math.floor(k / 3) * 1.2}l${(k % 2 ? 1 : -1) * 1.3} -1.1`, "#7CCB52", 0.4);
});

C["poisson-blanc"] = dessiner("poissonblanc", (d) => {
  d.vol(ell(22.6, 23.6, 6.4, 5.6), { hi: "#FFF7B0", mid: "#F5D63A", lo: "#C9A214", rim: "#A88410", rimOp: 0.45 });
  d.vol(ell(22.6, 23.6, 5.2, 4.5), { hi: "#FFFFF0", mid: "#FFF4B6", lo: "#EBD66A" }, { rim: false });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; d.trait(`M22.6 23.6L${22.6 + Math.cos(a) * 4.4} ${23.6 + Math.sin(a) * 3.8}`, "#FFFFFF", 0.4, 0.95); }
  d.vol("M2.6 18.2C2.6 21.4 6.4 23.8 12.4 24C18.8 24.2 25.4 21.6 28.6 17.6C29.4 16.6 29.4 15.6 28.8 15L2.8 16.6Z", { hi: "#EDE7DA", mid: "#D2C9B6", lo: "#A79D86" }, { rim: false });
  const filet = "M2.6 16.2C2.6 11.8 8 8.6 14.6 8.6C20.6 8.6 25.8 10.2 28.6 13.2C29.6 14.4 29.4 15.6 28.4 16.4C25 19 19.6 21.4 13.6 21.8C7.4 22.2 2.6 20 2.6 16.2Z";
  d.vol(filet, { hi: "#FFFFFF", mid: "#FAF7F0", lo: "#DCD3C2", rim: "#C2B8A4", rimOp: 0.45 }, { lx: 0.35, ly: 0.25 });
  for (let k = 0; k < 6; k++) { const x = 6 + k * 3.6; d.trait(`M${x} 10.4C${x + 2.6} 13 ${x + 2.6} 16.6 ${x} 19.8`, "#E2D8C4", 0.6, 0.95); }
  d.reflet(filet, ell(9.6, 11.4, 5, 1.3, -6), 0.6, 0.5);
  for (const [a, l] of [[-0.6, 3.6], [0, 4.4], [0.6, 3.6]]) d.trait(`M24.6 7.6l${Math.sin(a) * l} ${-Math.cos(a) * l}`, "#5DAE40", 0.5);
  for (let k = 0; k < 9; k++) d.trait(`M${22.6 + (k % 3) * 2} ${3.6 + Math.floor(k / 3) * 1.2}l${(k % 2 ? 1 : -1) * 1.3} -1.1`, "#7CCB52", 0.4);
});

C["moules"] = dessiner("moules", (d) => {
  const coquille = { hi: "#8A8FB8", mid: "#2E3050", lo: "#12131F", rim: "#0A0A14", rimOp: 0.6 };
  const moule = (cx, cy, deg, s, ouverte) => d.groupe(`transform="rotate(${deg} ${cx} ${cy})"`, () => {
    const f = `M${cx} ${cy - 9 * s}C${cx + 4.2 * s} ${cy - 8 * s} ${cx + 5 * s} ${cy + 2 * s} ${cx + 3.4 * s} ${cy + 7 * s}C${cx + 2.4 * s} ${cy + 9.2 * s} ${cx - 2.4 * s} ${cy + 9.2 * s} ${cx - 3.4 * s} ${cy + 7 * s}C${cx - 5 * s} ${cy + 2 * s} ${cx - 4.2 * s} ${cy - 8 * s} ${cx} ${cy - 9 * s}Z`;
    d.vol(f, coquille, { lx: 0.3, ly: 0.25 });
    if (ouverte) {
      d.vol(ell(cx, cy + 0.6 * s, 2.8 * s, 6.6 * s), { hi: "#FFD08A", mid: "#F09A3A", lo: "#C2661A", rim: "#9C4C10", rimOp: 0.4 }, { lx: 0.4, ly: 0.3 });
      d.trait(`M${cx} ${cy - 5 * s}C${cx - 1 * s} ${cy - 1 * s} ${cx - 1 * s} ${cy + 3 * s} ${cx} ${cy + 6 * s}`, "#FFE6B6", 0.5, 0.8);
    }
    for (const t of [0.35, 0.6]) d.trait(`M${cx - 3.6 * s} ${cy + (t * 10 - 2) * s}Q${cx} ${cy + (t * 10 - 3.4) * s} ${cx + 3.6 * s} ${cy + (t * 10 - 2) * s}`, "#7A7EA6", 0.4, 0.6);
    d.filet(`M${cx - 1.6 * s} ${cy - 6.6 * s}C${cx - 3 * s} ${cy - 3 * s} ${cx - 3 * s} ${cy + 1 * s} ${cx - 2.4 * s} ${cy + 3 * s}`, "#D2D6F2", 0.8 * s, 0.7, 0.3);
  });
  moule(10.4, 15.4, -28, 1, false);
  moule(22, 14.4, 30, 0.95, false);
  moule(16, 21.6, 0, 1.05, true);
});

C["saint-jacques"] = dessiner("saintjacques", (d) => {
  const coquille = { hi: "#FFE4C8", mid: "#F5B07E", lo: "#D27A48", rim: "#B45E32", rimOp: 0.45 };
  d.vol("M11.4 25.6H20.6L22.4 29.4C22.6 30 22.2 30.4 21.6 30.4H10.4C9.8 30.4 9.4 30 9.6 29.4Z", coquille, { lx: 0.3, ly: 0.2 });
  const eventail = "M16 27C9.4 27 3.4 21.8 3.4 14.4C3.4 8 8.8 3 16 3C23.2 3 28.6 8 28.6 14.4C28.6 21.8 22.6 27 16 27Z";
  d.vol(eventail, coquille, { lx: 0.35, ly: 0.25 });
  for (let k = -5; k <= 5; k++) { const a = k * 0.21; d.trait(`M16 26.4L${16 + Math.sin(a) * 13.4} ${15.4 - Math.cos(a) * 12.4}`, k % 2 ? "#E8935E" : "#FFE6CE", 0.7, 0.9); }
  sphere(d, 13.6, 16.2, 5.2, { hi: "#FFFFFF", mid: "#FBF6EE", lo: "#DCD0BC", rim: "#C2B49C", rimOp: 0.4 }, { aplati: 0.82, brillance: 0.7 });
  d.vol("M18.4 17.4C20.4 15.4 23.6 15.6 24.6 18C25.4 20 23.8 22.6 21.4 22.4C19.8 22.2 18.4 20.6 18.4 17.4Z", { hi: "#FFC99E", mid: "#F5894A", lo: "#C85A22", rim: "#A84612", rimOp: 0.4 }, { lx: 0.35, ly: 0.3 });
});

export default C;
