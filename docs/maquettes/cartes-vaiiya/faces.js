"use strict";
/* ─────────────────────────────────────────────────────────────────────
   LES FACES DES CARTES. Tout ce qui est gravé ou imprimé est dessiné ici,
   au canvas, en blanc sur noir, puis rangé dans les quatre canaux de tFx.
   Une carte ne contient aucun chiffre de jeu : ni attaque, ni vie.
   ───────────────────────────────────────────────────────────────────── */
(function () {
  const W = 1024, H = 1434;
  const FIN = " ";

  const RANGS = [
    { id: "bronze", nom: "Bronze", n: 1, m: ["#2B1208", "#94552A", "#E8A96C", "#FFF1DC"], lueur: "#FF9A50", encre: "#FBE8D3", f: [0, 0, .55, 0], art: "a/art-0.webp", em: "a/em-bronze.webp", fini: "Cuivre brossé" },
    { id: "argent", nom: "Argent", n: 2, m: ["#1C222C", "#7C8A9C", "#DCE4EE", "#FFFFFF"], lueur: "#C8D8F0", encre: "#F2F5F9", f: [0, .25, .8, 0], emG: 1.5, art: "a/art-1.webp", em: "a/em-argent.webp", fini: "Acier miroir" },
    { id: "or", nom: "Or", n: 3, m: ["#3A2404", "#B57A10", "#FFCF4E", "#FFF8D6"], lueur: "#FFC34A", encre: "#FFF3D6", f: [0, .35, 1, 0], art: "a/art-2.webp", em: "a/em-or.webp", fini: "Or frappé" },
    { id: "platine", nom: "Platine", n: 4, m: ["#1F2F33", "#7FA6A8", "#E2F3F0", "#FFFFFF"], lueur: "#BDF3E8", encre: "#EFFBF8", f: [.5, .3, .7, 0], emG: 2.6, ir: ["#FFFFFF", "#BFEFE6", "#E9D6FF"], art: "a/art-3.webp", em: "a/em-platine.webp", fini: "Nacre" },
    { id: "diamant", nom: "Diamant", n: 5, m: ["#0E2A5C", "#5FA3E8", "#DCF1FF", "#FFFFFF"], lueur: "#8CCBFF", encre: "#EEF7FF", f: [.85, .55, .5, 0], emG: 2.4, ir: ["#FFFFFF", "#7CC4FF", "#FFB6E4"], art: "a/art-4.webp", em: "a/em-diamant.webp", fini: "Prisme" },
    { id: "eternel", nom: "Éternel", n: 6, m: ["#2A1160", "#A67A2E", "#FFD878", "#FFF6E0"], lueur: "#C9A8FF", encre: "#FFF6E2", f: [.7, .7, .35, 1], emG: 1.5, ir: ["#FFE08A", "#C9A8FF", "#FFF4DC"], art: "a/art-5.webp", em: "a/em-eternel.webp", fini: "Vivante" },
  ];

  const LOGO = ["#BA80FA", "#F99FB0", "#FEC175"];

  function calque() {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#fff"; x.strokeStyle = "#fff"; x.lineCap = "round"; x.lineJoin = "round";
    return { c, x };
  }

  const ETINCELLE = new Path2D("M12 1.5c.7 6.6 3.4 9.8 10.5 10.5-7.1.7-9.8 3.9-10.5 10.5C11.3 15.9 8.6 12.7 1.5 12 8.6 11.3 11.3 8.1 12 1.5z");
  function etincelle(x, cx, cy, r, plein = true) {
    x.save(); x.translate(cx, cy); x.scale(r / 10.5, r / 10.5); x.translate(-12, -12);
    if (plein) x.fill(ETINCELLE); else { x.lineWidth = 1.6; x.stroke(ETINCELLE); }
    x.restore();
  }

  function rectRond(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }

  /* Un cadre intérieur aux coins rentrants, façon gravure. */
  function cadreCoins(x, m, r) {
    const a = m, b = m, c = W - m, d = H - m;
    x.beginPath();
    x.moveTo(a + r, b); x.lineTo(c - r, b);
    x.arc(c, b, r, Math.PI, Math.PI / 2, true);
    x.lineTo(c, d - r);
    x.arc(c, d, r, -Math.PI / 2, Math.PI, true);
    x.lineTo(a + r, d);
    x.arc(a, d, r, 0, -Math.PI / 2, true);
    x.lineTo(a, b + r);
    x.arc(a, b, r, Math.PI / 2, 0, true);
    x.closePath();
  }

  function texte(x, t, cx, y, { font, align = "left", ls = 0 }) {
    x.font = font; x.textAlign = align; x.textBaseline = "alphabetic";
    if ("letterSpacing" in x) x.letterSpacing = ls + "px";
    x.fillText(t, cx, y);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
  }

  /* Le titre, à la largeur voulue, sur une ou deux lignes. */
  function titreAjuste(x, t, yBas, largeur, max) {
    const lignes = t.split("\n");
    let s = max;
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    for (; s > 44; s -= 2) {
      x.font = `900 expanded ${s}px Archivo`;
      if (lignes.every((l) => x.measureText(l).width <= largeur)) break;
    }
    const pas = s * 1.04;
    lignes.forEach((l, i) => x.fillText(l, W / 2, yBas - (lignes.length - 1 - i) * pas));
    return s;
  }

  const CX = W / 2, CY = 640;
  function anneau(x, ray, ep, cy = CY) { x.lineWidth = ep; x.beginPath(); x.arc(CX, cy, ray, 0, 7); x.stroke(); }
  function graduer(x, ray, n, long, ep, tous = 1, long2 = long * 1.8, cy = CY) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 - Math.PI / 2;
      const l = i % tous === 0 ? long2 : long;
      x.lineWidth = i % tous === 0 ? ep * 1.5 : ep;
      x.beginPath(); x.moveTo(CX + Math.cos(a) * ray, cy + Math.sin(a) * ray); x.lineTo(CX + Math.cos(a) * (ray + l), cy + Math.sin(a) * (ray + l)); x.stroke();
    }
  }

  /* Les gravures célestes, une par rang : rien que des traits fins. */
  function gravures(x, id) {
    x.save();
    if (id === "bronze") {
      for (let i = 0; i <= 26; i++) {
        const a = Math.PI + (i / 26) * Math.PI;
        const l = i % 2 ? 60 : 118;
        x.lineWidth = i % 2 ? 2 : 3;
        const cy2 = 1000;
        x.beginPath(); x.moveTo(CX + Math.cos(a) * 452, cy2 + Math.sin(a) * 452); x.lineTo(CX + Math.cos(a) * (452 + l), cy2 + Math.sin(a) * (452 + l)); x.stroke();
      }
    }
    if (id === "argent") { anneau(x, 428, 2.5); graduer(x, 434, 72, 12, 2, 6, 24); }
    if (id === "or") {
      anneau(x, 420, 3); anneau(x, 432, 1.6);
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        const l = i % 4 === 0 ? 130 : i % 2 === 0 ? 72 : 40;
        x.lineWidth = i % 4 === 0 ? 4 : 2;
        x.beginPath(); x.moveTo(CX + Math.cos(a) * 442, CY + Math.sin(a) * 442); x.lineTo(CX + Math.cos(a) * (442 + l), CY + Math.sin(a) * (442 + l)); x.stroke();
      }
    }
    if (id === "platine") {
      anneau(x, 420, 2); anneau(x, 440, 1.5); anneau(x, 462, 1.2);
      for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283; x.beginPath(); x.arc(CX + Math.cos(a) * 451, CY + Math.sin(a) * 451, i % 15 === 0 ? 5 : 2, 0, 7); x.fill(); }
    }
    if (id === "diamant") {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.283 - Math.PI / 2;
        const l = i % 2 ? 470 : 560;
        x.lineWidth = i % 2 ? 2 : 3;
        x.beginPath(); x.moveTo(CX + Math.cos(a) * 420, CY + Math.sin(a) * 420); x.lineTo(CX + Math.cos(a) * l, CY + Math.sin(a) * l); x.stroke();
      }
      anneau(x, 420, 2.5);
    }
    if (id === "eternel") {
      anneau(x, 424, 3);
      x.lineWidth = 1.6;
      for (const [rx, ry, rot] of [[560, 180, -.5], [600, 150, .55]]) { x.beginPath(); x.ellipse(CX, CY, rx, ry, rot, 0, 7); x.stroke(); }
      for (const [a, b, s] of [[150, 240, 22], [880, 230, 28], [120, 900, 18], [910, 860, 20], [240, 150, 12], [800, 330, 12]]) etincelle(x, a, b, s);
    }
    if (id === "soleil") { anneau(x, 410, 2.4); graduer(x, 420, 60, 18, 2, 5, 44); }
    if (id === "cercle") { anneau(x, 400, 2); anneau(x, 416, 1.2); }
    x.restore();
  }

  function coins(x, n) {
    if (n < 2) return;
    const m = 66;
    for (let i = 0; i < 4; i++) {
      const cx = i % 2 ? W - m : m, cy = i < 2 ? m : H - m;
      if (n >= 5) etincelle(x, cx, cy, 16); else { x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill(); }
    }
  }

  function cadre(m, n) {
    m.lineWidth = 20; rectRond(m, 10, 10, W - 20, H - 20, 42); m.stroke();
    m.lineWidth = 2.6; cadreCoins(m, 40, 26); m.stroke();
    coins(m, n);
  }

  /* R métal, G relief, B vernis, A encre. */
  function assembler(metal, vernis, encre, reliefExtra) {
    const h = document.createElement("canvas"); h.width = W; h.height = H;
    const hx = h.getContext("2d", { willReadFrequently: true });
    hx.fillStyle = "#000"; hx.fillRect(0, 0, W, H);
    if (reliefExtra) hx.drawImage(reliefExtra, 0, 0, W, H);
    hx.globalCompositeOperation = reliefExtra ? "lighter" : "source-over";
    hx.filter = "blur(3.4px)"; hx.globalAlpha = .7; hx.drawImage(metal.c, 0, 0);
    hx.filter = "blur(1.1px)"; hx.globalAlpha = .4; hx.globalCompositeOperation = "lighter"; hx.drawImage(metal.c, 0, 0);
    hx.filter = "none"; hx.globalAlpha = 1; hx.globalCompositeOperation = "source-over";
    const a = metal.x.getImageData(0, 0, W, H).data, b = hx.getImageData(0, 0, W, H).data, c = vernis.x.getImageData(0, 0, W, H).data, d = encre.x.getImageData(0, 0, W, H).data;
    const out = new Uint8Array(W * H * 4);
    for (let i = 0; i < out.length; i += 4) { out[i] = a[i]; out[i + 1] = b[i]; out[i + 2] = c[i]; out[i + 3] = d[i]; }
    return { data: out, w: W, h: H };
  }

  /* Le bas commun : le titre, le filet, les étincelles, le nom, la date. */
  function pied(m, e, o) {
    const yNom = o.yTitre ?? 1228;
    titreAjuste(m, o.titre, yNom, o.largeur ?? 830, o.max ?? 176);
    const yF = 1276;
    m.lineWidth = 2;
    const n = o.pips ?? 0;
    if (n) {
      const dem = (n * 44) / 2 + 18;
      m.beginPath(); m.moveTo(84, yF); m.lineTo(CX - dem, yF); m.moveTo(CX + dem, yF); m.lineTo(W - 84, yF); m.stroke();
      for (let i = 0; i < n; i++) etincelle(m, CX + (i - (n - 1) / 2) * 44, yF, 15, i < o.pipsPleins);
    } else {
      m.beginPath(); m.moveTo(84, yF); m.lineTo(W - 84, yF); m.stroke();
    }
    if (o.gauche) texte(m, o.gauche, 84, 1342, { font: "800 expanded 44px Archivo", ls: 5 });
    if (o.droite) texte(e, o.droite, W - 84, 1340, { font: "500 28px 'Martian Mono'", align: "right" });
  }

  function tete(e, droite) {
    etincelle(e, 98, 108, 16);
    texte(e, "Vaiiya", 122, 120, { font: "800 34px Archivo", ls: .4 });
    if (droite) texte(e, droite, W - 84, 120, { font: "600 30px 'Martian Mono'", align: "right" });
  }

  const images = new Map();
  function image(src) {
    if (!images.has(src)) images.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("image " + src)); i.src = src; }));
    return images.get(src);
  }

  let pretes = null;
  function polices() {
    if (!pretes) pretes = Promise.all([
      document.fonts.load("900 expanded 100px Archivo", "BRONZÉ"),
      document.fonts.load("800 expanded 44px Archivo", "LOUIS"),
      document.fonts.load("800 34px Archivo", "Vaiiya"),
      document.fonts.load("600 30px 'Martian Mono'", "N° 071"),
      document.fonts.load("500 28px 'Martian Mono'", "2026"),
    ]);
    return pretes;
  }

  /* L'aile du logo (public/marque/aile.svg), écrite ici pour ne dépendre d'aucune lecture. */
  const aile = new Path2D("M0.0 1000.0L3.0 982.1L7.7 964.3L14.0 946.4L21.4 928.6L29.8 910.7L39.0 892.9L48.7 875.0L58.8 857.1L69.3 839.3L80.0 821.4L90.9 803.6L102.0 785.7L113.2 767.9L124.5 750.0L135.9 732.1L147.5 714.3L159.2 696.4L171.2 678.6L183.4 660.7L195.9 642.9L208.8 625.0L222.1 607.1L235.8 589.3L249.9 571.4L264.6 553.6L279.8 535.7L295.6 517.9L312.0 500.0L329.0 482.1L346.6 464.3L364.9 446.4L383.6 428.6L403.0 410.7L422.9 392.9L443.2 375.0L463.9 357.1L485.0 339.3L506.3 321.4L527.8 303.6L549.3 285.7L570.7 267.9L591.9 250.0L612.8 232.1L633.3 214.3L653.0 196.4L672.0 178.6L690.0 160.7L706.9 142.9L722.4 125.0L736.5 107.1L748.8 89.3L759.3 71.4L767.8 53.6L774.0 35.7L777.8 17.9L779.1 0.0L769.1 0.0L756.3 17.9L741.2 35.7L724.0 53.6L704.9 71.4L684.3 89.3L662.5 107.1L639.5 125.0L615.8 142.9L591.4 160.7L566.7 178.6L541.6 196.4L516.5 214.3L491.4 232.1L466.5 250.0L442.0 267.9L417.9 285.7L394.2 303.6L371.2 321.4L348.9 339.3L327.3 357.1L306.4 375.0L286.4 392.9L267.2 410.7L248.9 428.6L231.5 446.4L214.9 464.3L199.2 482.1L184.3 500.0L170.2 517.9L157.0 535.7L144.5 553.6L132.7 571.4L121.6 589.3L111.2 607.1L101.4 625.0L92.2 642.9L83.5 660.7L75.3 678.6L67.6 696.4L60.2 714.3L53.3 732.1L46.7 750.0L40.4 767.9L34.4 785.7L28.8 803.6L23.6 821.4L18.6 839.3L14.1 857.1L9.9 875.0L6.3 892.9L3.2 910.7L0.8 928.6L0.0 946.4L0.0 964.3L0.0 982.1L0.0 1000.0Z");
  const chemins = async () => aile;
  /* Une aile du logo : (0,1000) est la pointe basse, (779,0) le bout haut. */
  function dessinerAile(x, px, py, h, angle = 0, miroir = false) {
    const k = h / 1000;
    x.save(); x.translate(px, py); x.rotate(angle); if (miroir) x.scale(-1, 1); x.scale(k, k); x.translate(0, -1000);
    x.fill(aile); x.restore();
  }
  function logoV(x, px, py, h) {
    dessinerAile(x, px, py, h, 0, false);
    dessinerAile(x, px, py, h, 0, true);
    x.beginPath(); x.arc(px, py + h * .065, h * .036, 0, 7); x.fill();
  }

  /* ── Le rang ── */
  async function rang(id, d) {
    const r = RANGS.find((x) => x.id === id);
    const [art, emblem] = await Promise.all([image(r.art), image(r.em), polices()]);
    const metal = calque(), vernis = calque(), encre = calque();
    cadre(metal.x, r.n);
    gravures(metal.x, r.id);
    pied(metal.x, encre.x, { titre: r.nom.toUpperCase(), pips: 6, pipsPleins: r.n, gauche: (d.pseudo || "").toUpperCase(), droite: d.date });
    tete(encre.x, d.numero != null ? "N°" + FIN + String(d.numero).padStart(3, "0") : null);
    const eh = .615, ew = eh * 1.4 * (680 / 1040);
    return { art, emblem, fx: assembler(metal, vernis, encre), m: r.m, lueur: r.lueur, encre: r.encre, f: r.f, ir: r.ir, emG: r.emG, emB: [.5 - ew / 2, .438 - eh / 2, ew, eh] };
  }

  /* ── Le dos, le même pour toutes les cartes ── */
  async function dos(fiche) {
    const [art] = await Promise.all([image("a/art-dos.webp"), polices(), chemins()]);
    const metal = calque(), vernis = calque(), encre = calque();
    const m = metal.x, v = vernis.x;
    m.lineWidth = 20; rectRond(m, 10, 10, W - 20, H - 20, 42); m.stroke();
    m.lineWidth = 2.6; cadreCoins(m, 40, 26); m.stroke();
    m.lineWidth = 1.6; cadreCoins(m, 54, 26); m.stroke();
    coins(m, 5);
    const cy = fiche ? 470 : CY + 66;
    const k = fiche ? .8 : 1;
    // L'éventail du logo, en vernis : on ne le voit que dans la lumière.
    v.fillStyle = "rgba(255,255,255,.3)";
    for (let i = -6; i <= 6; i++) {
      const a = i * .2;
      dessinerAile(v, CX, cy + 150 * k, 540 * k, a, false);
      dessinerAile(v, CX, cy + 150 * k, 540 * k, -a, true);
    }
    anneau(m, 318 * k, 2.4, cy); anneau(m, 330 * k, 1.2, cy);
    graduer(m, 338 * k, 96, 14 * k, 1.8, 8, 40 * k, cy);
    anneau(m, 400 * k, 1.4, cy);
    logoV(m, CX, cy + 122 * k, 340 * k);
    for (let i = 0; i < 4; i++) etincelle(m, CX + Math.cos(i * 1.5708 + .785) * 400 * k, cy + Math.sin(i * 1.5708 + .785) * 400 * k, 18 * k);
    if (fiche) {
      titreAjuste(m, (fiche.pseudo || "").toUpperCase(), 1010, 700, 84);
      texte(encre.x, fiche.ligne, CX, 1064, { font: "600 34px Archivo", align: "center" });
      const faits = fiche.faits || [];
      faits.forEach(([val, lib], i) => {
        const x = CX + (i - (faits.length - 1) / 2) * 280;
        texte(m, String(val), x, 1190, { font: "600 66px 'Martian Mono'", align: "center" });
        texte(encre.x, lib, x, 1240, { font: "600 30px Archivo", align: "center" });
      });
      texte(encre.x, fiche.pied, CX, 1336, { font: "500 26px 'Martian Mono'", align: "center" });
    } else {
      texte(m, "VAIIYA", CX + 8, 1250, { font: "800 expanded 54px Archivo", align: "center", ls: 16 });
    }
    return { art, emblem: null, fx: assembler(metal, vernis, encre), m: ["#2B1A52", "#A77C33", "#FFD98A", "#FFF8E6"], lueur: "#C9A8FF", encre: "#F4ECFF", f: [0, .22, .3, 0], par: .7 };
  }

  /* ── La pochette scellée : un film sombre et froissé, le logo en métal ── */
  async function pochette(id) {
    const r = RANGS.find((x) => x.id === id);
    const [art, froisse] = await Promise.all([image(r.art), image("a/froisse.webp"), polices(), chemins()]);
    const metal = calque(), vernis = calque(), encre = calque();
    const m = metal.x;
    logoV(m, CX, 760, 400);
    texte(m, "VAIIYA", CX + 8, 985, { font: "800 expanded 54px Archivo", align: "center", ls: 16 });
    m.lineWidth = 3; m.beginPath(); m.moveTo(0, 150); m.lineTo(W, 150); m.moveTo(0, H - 150); m.lineTo(W, H - 150); m.stroke();
    for (let i = 0; i < r.n; i++) etincelle(m, CX + (i - (r.n - 1) / 2) * 46, 1062, 15);
    const rel = document.createElement("canvas"); rel.width = W; rel.height = H;
    const rx = rel.getContext("2d");
    rx.filter = "blur(1.6px) contrast(.8)"; rx.drawImage(froisse, 0, 0, W, H); rx.filter = "none";
    for (const [y0, y1] of [[0, 96], [H - 96, H]]) {
      for (let y = y0; y < y1; y += 12) { rx.fillStyle = (y / 12) % 2 ? "#fff" : "#000"; rx.fillRect(0, y, W, 6); }
    }
    return { art, emblem: null, fx: assembler(metal, vernis, encre, rel), m: r.m, lueur: r.lueur, encre: r.encre, f: [r.f[0], 0, 0, 0], ir: r.ir, par: 0, froisse: 1, coin: 0 };
  }

  /* ── Une flamme ── */
  const FLAMMES = {
    lueur: { nom: "Lueur", n: 1, jours: 1, m: ["#3A1206", "#B4481A", "#FF9E5A", "#FFE9D0"] },
    flamme: { nom: "Flamme", n: 2, jours: 3, m: ["#3A1806", "#C8641A", "#FFB85A", "#FFF0D0"] },
    feu: { nom: "Feu", n: 3, jours: 7, m: ["#3F2206", "#D08A1E", "#FFD45A", "#FFF7D8"] },
    brasier: { nom: "Brasier", n: 4, jours: 30, m: ["#44300A", "#D9A32A", "#FFE680", "#FFFBE6"] },
    sacre: { nom: "Feu sacré", n: 5, jours: 100, m: ["#3A3020", "#CDB880", "#FFF3C4", "#FFFFFF"] },
  };
  async function flamme(id, d) {
    const r = FLAMMES[id];
    const [art, emblem] = await Promise.all([image("a/art-flamme.webp"), image(`a/em-flamme-${id}.webp`), polices()]);
    const metal = calque(), vernis = calque(), encre = calque();
    cadre(metal.x, r.n);
    gravures(metal.x, "soleil");
    pied(metal.x, encre.x, { titre: r.nom.toUpperCase(), pips: 5, pipsPleins: r.n, gauche: (d.pseudo || "").toUpperCase(), droite: d.date });
    tete(encre.x, `${r.jours}${FIN}${r.jours > 1 ? "jours" : "jour"}`);
    const ew = .62, eh = ew * (816 / 680) / 1.4;
    return { art, emblem, fx: assembler(metal, vernis, encre), m: r.m, lueur: "#FF8A30", encre: "#FFEFD8", f: [0, .22, .3, 0], emB: [.5 - ew / 2, .43 - eh / 2, ew, eh], emL: .35 };
  }

  /* ── Un programme terminé ── */
  async function programme(o, d) {
    const [art, emblem] = await Promise.all([image("a/art-programme.webp"), image(o.pose), polices()]);
    const metal = calque(), vernis = calque(), encre = calque();
    cadre(metal.x, 3);
    gravures(metal.x, "cercle");
    pied(metal.x, encre.x, { titre: o.titre, gauche: (d.pseudo || "").toUpperCase(), droite: d.date, max: 112, largeur: 840, yTitre: 1246 });
    tete(encre.x, o.duree);
    const ew = .86, eh = ew * (emblem.naturalHeight / emblem.naturalWidth) / 1.4;
    return { art, emblem, fx: assembler(metal, vernis, encre), m: ["#2A1160", "#8B5CF6", "#E9C8FF", "#FFF4E6"], lueur: "#BA80FA", encre: "#F6EEFF", f: [.95, .14, .2, 0], ir: LOGO, emB: [.5 - ew / 2, .06, ew, eh], emF: .66, emL: 0, scrim: .82 };
  }

  /* ── Un relais gagné à deux ── */
  async function relais(o, d) {
    const [art] = await Promise.all([image(o.art), polices()]);
    const metal = calque(), vernis = calque(), encre = calque();
    cadre(metal.x, 4);
    pied(metal.x, encre.x, { titre: o.nom.toUpperCase(), gauche: d.duo, droite: d.date, yTitre: 1226 });
    tete(encre.x, o.rang);
    return { art, emblem: null, fx: assembler(metal, vernis, encre), m: o.m, lueur: "#FFD98A", encre: "#FFF7E6", f: [.5, .16, 0, 0], ir: o.ir, lum: .85, par: 1.4, scrim: .5 };
  }

  /* ── Un mouvement ── */
  async function mouvement(o, d) {
    const [art, emblem] = await Promise.all([image("a/art-mouvement.webp"), image(o.sprite), polices()]);
    const metal = calque(), vernis = calque(), encre = calque();
    metal.x.lineWidth = 14; rectRond(metal.x, 7, 7, W - 14, H - 14, 44); metal.x.stroke();
    pied(metal.x, encre.x, { titre: o.titre, max: 112, largeur: 830, gauche: null, droite: null });
    texte(encre.x, o.muscles, 84, 1336, { font: "600 32px Archivo" });
    if (d.date) texte(encre.x, d.date, W - 84, 1336, { font: "500 28px 'Martian Mono'", align: "right" });
    tete(encre.x, o.numero);
    const ew = 1.02, eh = ew / 1.4;
    return { art, emblem, fx: assembler(metal, vernis, encre), m: ["#22203A", "#6E6A92", "#C9C6E6", "#FFFFFF"], lueur: "#8B5CF6", encre: "#EDEAFB", f: [0, 0, 0, 0], emB: [.5 - ew / 2, .1, ew, eh], emL: 0, par: .6 };
  }

  window.Faces = { RANGS, FLAMMES, LOGO, W, H, image, polices, rang, dos, pochette, flamme, programme, relais, mouvement };
})();
