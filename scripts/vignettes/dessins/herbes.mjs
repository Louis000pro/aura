// Les herbes : chacune a sa silhouette, pour qu'on la reconnaisse sans lire son nom.
import { M, dessiner, feuille, nervure, ell, capsule, arrondi, lisse, hasard, mix } from "../kit.mjs";
import { bolDome, assombrir } from "../modeles.mjs";

const H = {};
const tige = (d, pts, c, w) => d.trait(lisse(pts, false), c, w);

/* Lien de cuisine autour d'un bouquet. */
function lien(d, x, y, l, deg) {
  d.groupe(`transform="rotate(${deg} ${x} ${y})"`, () => {
    d.vol(arrondi([[x - l / 2, y - 1.05], [x + l / 2, y - 1.05], [x + l / 2, y + 1.05], [x - l / 2, y + 1.05]], 0.9), { hi: "#FFF3DC", mid: "#E9C99A", lo: "#BE965E", rim: "#9D7643", rimOp: 0.45 });
    d.trait(`M${x - l / 2 + 0.6} ${y - 0.3}H${x + l / 2 - 0.6}`, "#FFF8EA", 0.35, 0.8);
  });
}

/* Persil plat : couronne de feuilles trilobées dentées. */
function trilobe(d, x, y, dir, s, m) {
  for (const [k, da, L, W] of [[0, -44, 6.6, 5.4], [1, 44, 6.6, 5.4], [2, 0, 7.8, 6]]) {
    const o = { x, y, L: L * s, W: W * s, deg: dir + da, ventre: 0.6, rond: 0.7, dents: 3, prof: 0.36, pointe: 0.12 };
    d.vol(feuille(o), k < 2 ? assombrir(m, 0.12) : m, { lx: 0.38, ly: 0.18 });
    d.trait(nervure({ ...o, a: 0.72 }), "#E3FAC7", 0.38, 0.6);
  }
}
H["persil"] = dessiner("persil", (d) => {
  const c = "#4E9C3A";
  for (const [x, y] of [[9.4, 14.6], [12.6, 10], [16.2, 8.2], [20, 10.2], [22.8, 14.8], [13, 16.4], [19.2, 16.6]]) tige(d, [[16, 30.6], [16, 25], [x, y]], c, 1.05);
  trilobe(d, 12.6, 10.2, -24, 0.86, assombrir(M.vert, 0.3));
  trilobe(d, 20, 10.4, 24, 0.86, assombrir(M.vert, 0.3));
  trilobe(d, 9.4, 14.8, -58, 0.86, assombrir(M.vert, 0.15));
  trilobe(d, 22.8, 15, 58, 0.86, assombrir(M.vert, 0.15));
  trilobe(d, 16.2, 8.4, 0, 0.92, M.vert);
  trilobe(d, 13, 16.6, -18, 0.82, M.vert);
  trilobe(d, 19.2, 16.8, 18, 0.82, M.vert);
  lien(d, 16, 25.6, 4.6, 0);
});

/* Coriandre : feuilles rondes en éventail, tiges fines, vert plus tendre. */
function eventail(d, x, y, dir, s, m) {
  for (const [da, L, W] of [[-46, 5.4, 5.6], [46, 5.4, 5.6], [0, 6.6, 6.6]]) {
    const o = { x, y, L: L * s, W: W * s, deg: dir + da, ventre: 0.66, rond: 0.55, dents: 3, prof: 0.24, pointe: 0.2 };
    d.vol(feuille(o), m, { lx: 0.4, ly: 0.2 });
    d.trait(nervure({ ...o, a: 0.6 }), "#F0FFD6", 0.32, 0.55);
  }
}
H["coriandre"] = dessiner("coriandre", (d) => {
  const c = "#7DBE4E";
  for (const [x, y] of [[8.6, 12.4], [14.4, 7.4], [21.4, 8.6], [24.6, 15], [11.6, 18.6], [18.6, 15.8]]) tige(d, [[15, 30.6], [15.4, 24], [x, y]], c, 0.8);
  eventail(d, 14.4, 7.6, -8, 0.95, assombrir(M.vertVif, 0.3));
  eventail(d, 21.4, 8.8, 26, 0.9, assombrir(M.vertVif, 0.25));
  eventail(d, 8.6, 12.6, -40, 0.9, assombrir(M.vertVif, 0.15));
  eventail(d, 24.6, 15.2, 52, 0.85, assombrir(M.vertVif, 0.1));
  eventail(d, 18.6, 16, 14, 0.9, M.vertVif);
  eventail(d, 11.6, 18.8, -26, 0.9, M.vertVif);
});

/* Basilic : grandes feuilles lisses et bombées. */
H["basilic"] = dessiner("basilic", (d) => {
  const m = { hi: "#B8F08A", mid: "#45B640", lo: "#22812F", rim: "#176624", rimOp: 0.5 };
  tige(d, [[16, 30.8], [16, 24.4]], "#3E9A3A", 1.4);
  const fs = [
    { x: 15.6, y: 22.6, L: 12, W: 8.4, deg: -64, plie: 0.5 },
    { x: 16.4, y: 22.6, L: 12, W: 8.4, deg: 64, plie: -0.5 },
    { x: 15.4, y: 20.4, L: 12.6, W: 8.8, deg: -28, plie: 0.45 },
    { x: 16.6, y: 20.4, L: 12.6, W: 8.8, deg: 28, plie: -0.45 },
    { x: 16, y: 19.8, L: 13, W: 8.6, deg: 0, plie: 0.2 },
  ];
  fs.forEach((o, i) => {
    const f = { ...o, ventre: 0.42, rond: 0.85, pointe: 0.14 };
    d.vol(feuille(f), i < 2 ? assombrir(m, 0.25) : i < 4 ? assombrir(m, 0.1) : m, { lx: 0.4, ly: 0.25 });
    d.trait(nervure({ ...f, a: 0.82 }), "#E6FFD0", 0.45, 0.65);
    d.reflet(feuille(f), ell(o.x + Math.sin((o.deg * Math.PI) / 180) * o.L * 0.45 - 1, o.y - Math.cos((o.deg * Math.PI) / 180) * o.L * 0.45, 1.4, 2.4, o.deg), 0.35, 0.6);
  });
});

/* Menthe : tige droite, paires de feuilles dentées et nervurées. */
H["menthe"] = dessiner("menthe", (d) => {
  const m = { hi: "#C6F59A", mid: "#5DC24C", lo: "#2C8C3A", rim: "#1F6E2E", rimOp: 0.5 };
  tige(d, [[16, 31], [16, 20], [16, 6]], "#6A9A3E", 1.2);
  const paires = [
    { y: 25.4, L: 10.6, W: 7, ang: 62, t: 0.25 },
    { y: 17.8, L: 9.6, W: 6.4, ang: 48, t: 0.12 },
    { y: 10.6, L: 8, W: 5.4, ang: 30, t: 0 },
  ];
  for (const p of paires) for (const s of [-1, 1]) {
    const o = { x: 16, y: p.y, L: p.L, W: p.W, deg: s * p.ang, ventre: 0.4, rond: 0.85, dents: 7, prof: 0.1, pointe: 0.12, plie: -s * 0.3 };
    d.vol(feuille(o), assombrir(m, p.t), { lx: 0.4, ly: 0.2 });
    d.trait(nervure({ ...o, a: 0.8 }), "#EBFFD8", 0.42, 0.7);
    for (const u of [0.3, 0.5, 0.68]) {
      const a = (s * p.ang * Math.PI) / 180, b = a + s * 0.9;
      const px = 16 + Math.sin(a) * p.L * u, py = p.y - Math.cos(a) * p.L * u;
      d.trait(`M${px} ${py}L${px + Math.sin(b) * p.W * 0.32} ${py - Math.cos(b) * p.W * 0.32}`, "#DFFAC4", 0.3, 0.55);
      d.trait(`M${px} ${py}L${px + Math.sin(a - s * 0.9) * p.W * 0.32} ${py - Math.cos(a - s * 0.9) * p.W * 0.32}`, "#DFFAC4", 0.3, 0.55);
    }
  }
  const o = { x: 16, y: 7, L: 5.2, W: 3.6, deg: 0, ventre: 0.45, dents: 5, prof: 0.1 };
  d.vol(feuille(o), m, { lx: 0.4, ly: 0.2 });
});

/* Thym : petit bouquet de brins ligneux couverts de petites feuilles. */
H["thym"] = dessiner("thym", (d) => {
  const r = hasard(21);
  const brins = [
    [[12.8, 27.6], [11.6, 18], [8.4, 4.6]],
    [[14.2, 27.6], [15.4, 17], [16.6, 3.2]],
    [[15.4, 27.4], [19.6, 18.4], [25.8, 6.6]],
    [[13.6, 27.6], [10.8, 21], [4.6, 13.4]],
    [[15, 27.6], [20.4, 22], [27.4, 16.4]],
  ];
  const feuilles = [];
  for (const b of brins) {
    for (let i = 0; i < 26; i++) {
      const t = 0.18 + (i / 26) * 0.8;
      const seg = t < 0.5 ? [b[0], b[1], t / 0.5] : [b[1], b[2], (t - 0.5) / 0.5];
      const [a, c, u] = seg;
      const x = a[0] + (c[0] - a[0]) * u, y = a[1] + (c[1] - a[1]) * u;
      const ang = (Math.atan2(c[1] - a[1], c[0] - a[0]) * 180) / Math.PI + 90;
      const s = i % 2 ? 1 : -1;
      feuilles.push({ x, y, L: 2.7 - t * 0.9 + r() * 0.4, W: 1.55 - t * 0.35, deg: ang + s * (50 + r() * 15), t: r() });
    }
  }
  for (const b of brins) tige(d, b, "#8D7348", 0.85);
  const m = { hi: "#D4E8B8", mid: "#7FA35E", lo: "#4E7038", rim: "#3B5629", rimOp: 0.45 };
  for (const o of feuilles) d.vol(feuille({ ...o, ventre: 0.5, rond: 0.9 }), o.t > 0.6 ? assombrir(m, 0.2) : m, { rimOp: 0.35 });
  lien(d, 14.2, 26.2, 5, -4);
  for (const b of brins) d.trait(`M${b[0][0]} ${b[0][1]}L${b[0][0] + (b[0][0] - 14.2) * 0.5} ${b[0][1] + 3}`, "#8D7348", 0.85);
});

/* Romarin : deux tiges aux aiguilles serrées. */
H["romarin"] = dessiner("romarin", (d) => {
  const m = { hi: "#9FCB9A", mid: "#4D8A5C", lo: "#2B5B3B", rim: "#1E4530", rimOp: 0.5 };
  for (const [b, k] of [[[[9, 30], [13, 19], [20.6, 3.4]], 0], [[[13, 30.6], [19, 21], [28.6, 10.8]], 1]]) {
    tige(d, b, "#7A6448", 1);
    for (let i = 0; i < 30; i++) {
      const t = 0.08 + (i / 30) * 0.9;
      const [a, c, u] = t < 0.5 ? [b[0], b[1], t / 0.5] : [b[1], b[2], (t - 0.5) / 0.5];
      const x = a[0] + (c[0] - a[0]) * u, y = a[1] + (c[1] - a[1]) * u;
      const ang = (Math.atan2(c[1] - a[1], c[0] - a[0]) * 180) / Math.PI + 90;
      const s = i % 2 ? 1 : -1;
      const o = { x, y, L: 4.2 - t * 1.6, W: 1, deg: ang + s * 38, ventre: 0.45, rond: 0.7, pointe: 0.2 };
      d.vol(feuille(o), (i + k) % 3 ? m : assombrir(m, 0.2), { rimOp: 0.35 });
      d.trait(nervure({ ...o, a: 0.75 }), "#C9E6C2", 0.22, 0.6);
    }
  }
});

/* Aneth : plumets très fins. */
H["aneth"] = dessiner("aneth", (d) => {
  const r = hasard(5);
  const tiges = [[[16, 31], [15.4, 20], [9.6, 7]], [[16, 31], [16.6, 19], [22.6, 6.4]], [[16, 31], [16, 22], [16.2, 4.6]]];
  for (const t of tiges) tige(d, t, "#5E9C3E", 1.1);
  for (const [k, t] of tiges.entries()) {
    for (let i = 0; i < 12; i++) {
      const u = 0.3 + (i / 12) * 0.7;
      const [a, c, v] = u < 0.5 ? [t[0], t[1], u / 0.5] : [t[1], t[2], (u - 0.5) / 0.5];
      const x = a[0] + (c[0] - a[0]) * v, y = a[1] + (c[1] - a[1]) * v;
      const ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
      for (const s of [-1, 1]) {
        const b = ang + s * (0.9 + r() * 0.3), l = 4.6 - u * 2.2;
        const x2 = x + Math.cos(b) * l, y2 = y + Math.sin(b) * l;
        d.trait(`M${x} ${y}Q${(x + x2) / 2 + Math.cos(b + s) * 0.6} ${(y + y2) / 2 + Math.sin(b + s) * 0.6} ${x2} ${y2}`, k === 2 ? "#7CCB52" : "#5DAE40", 0.55);
        for (const w of [0.4, 0.7]) {
          const px = x + Math.cos(b) * l * w, py = y + Math.sin(b) * l * w;
          for (const q of [-1, 1]) d.trait(`M${px} ${py}l${Math.cos(b + q * 0.8) * 1.5} ${Math.sin(b + q * 0.8) * 1.5}`, "#8EDB66", 0.42);
        }
      }
    }
  }
});

/* Ciboulette : botte de tubes, une fleur mauve. */
H["ciboulette"] = dessiner("ciboulette", (d) => {
  const brins = [];
  for (let i = 0; i < 9; i++) brins.push({ x1: 7.2 + i * 0.75, y1: 29.4 - i * 0.2, x2: 15 + i * 2.1, y2: 3.6 + i * 0.4 + (i % 2) * 1.6 });
  brins.forEach((b, i) => {
    const p = `M${b.x1} ${b.y1}Q${(b.x1 + b.x2) / 2 - 1.2} ${(b.y1 + b.y2) / 2 + 0.6} ${b.x2} ${b.y2}`;
    d.trait(p, i % 2 ? "#2F8A3A" : "#3E9E43", 1.45);
    d.trait(p, "#9EE07E", 0.42, 0.7);
  });
  const fl = { hi: "#F6D9FF", mid: "#C68AE6", lo: "#8A4DB6", rim: "#6E3699", rimOp: 0.45 };
  d.vol(ell(24.4, 6, 3.2, 3.2), fl, { lx: 0.35, ly: 0.3 });
  const r = hasard(3);
  for (let i = 0; i < 14; i++) d.aplat(ell(22.2 + r() * 4.4, 3.8 + r() * 4.4, 0.42, 0.42), r() > 0.5 ? "#F3DFFF" : "#9A5CC6", 0.8);
  lien(d, 10.4, 24.8, 5.4, -58);
});

/* Sauge : feuilles ovales veloutées gris-vert. */
H["sauge"] = dessiner("sauge", (d) => {
  const m = { hi: "#E2ECD8", mid: "#A3BA94", lo: "#6D8762", rim: "#56704C", rimOp: 0.45 };
  tige(d, [[16, 31], [16, 23]], "#8BA07A", 1.3);
  const fs = [
    { x: 15.6, y: 24.6, L: 11.4, W: 6.4, deg: -58 },
    { x: 16.4, y: 24.6, L: 11.4, W: 6.4, deg: 58 },
    { x: 15.6, y: 23.4, L: 13.6, W: 7.2, deg: -18 },
    { x: 16.4, y: 23.4, L: 13.6, W: 7.2, deg: 20 },
  ];
  fs.forEach((o, i) => {
    const f = { ...o, ventre: 0.45, rond: 0.8, dents: 9, prof: 0.05 };
    d.vol(feuille(f), i < 2 ? assombrir(m, 0.15) : m, { lx: 0.4, ly: 0.25 });
    d.trait(nervure({ ...f, a: 0.85 }), "#F4F9EE", 0.4, 0.7);
    const a = (o.deg * Math.PI) / 180;
    for (const u of [0.28, 0.46, 0.64]) for (const s of [-1, 1]) {
      const px = o.x + Math.sin(a) * o.L * u, py = o.y - Math.cos(a) * o.L * u, b = a + s * 1.1;
      d.trait(`M${px} ${py}l${Math.sin(b) * o.W * 0.34} ${-Math.cos(b) * o.W * 0.34}`, "#EEF5E6", 0.28, 0.55);
    }
  });
});

/* Laurier : feuilles allongées vernissées sur une branchette. */
H["laurier"] = dessiner("laurier", (d) => {
  const m = { hi: "#D7E59A", mid: "#7F9C3D", lo: "#4C6721", rim: "#3A5216", rimOp: 0.5 };
  tige(d, [[6, 29.4], [13.4, 21.4], [21, 12.6]], "#8A6B3E", 1.3);
  const fs = [
    { x: 9.2, y: 26, L: 13.6, W: 5.2, deg: -8, plie: 0.3 },
    { x: 12.4, y: 22.6, L: 14.4, W: 5.4, deg: 64, plie: -0.3 },
    { x: 15.6, y: 19, L: 13, W: 5, deg: 18, plie: 0.25 },
  ];
  fs.forEach((o, i) => {
    const f = { ...o, ventre: 0.45, rond: 0.8, pointe: 0.16 };
    d.vol(feuille(f), i === 1 ? m : { ...m, hi: mix(m.hi, m.mid, 0.2) }, { lx: 0.35, ly: 0.2 });
    d.trait(nervure({ ...f, a: 0.86 }), "#F1F7CF", 0.45, 0.75);
    d.reflet(feuille(f), nervure({ ...f, de: 0.2, a: 0.6, x: o.x - 0.8 }), 0.4, 0.5);
  });
});

/* Herbes séchées (origan, herbes de Provence) : un petit bol de paillettes. */
H["herbes-sechees"] = dessiner("herbessechees", (d) => {
  const m = { hi: "#C4CF8A", mid: "#7F8E3E", lo: "#4E5A20", rim: "#3B4416", rimOp: 0.45 };
  bolDome(d, {
    contenu: m, haut: 18.6, dome: 7.6, graine: 31,
    grain: { n: 70, dessin: (d, x, y, r) => d.aplat(ell(x, y, 0.55 + r() * 0.45, 0.28 + r() * 0.2, r() * 180), r() > 0.55 ? "#C7D58E" : "#3F4C18", 0.75) },
  });
});

export default H;
