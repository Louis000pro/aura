#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   Usine à personnages-guides : planche brute (ChatGPT) → frames PNG prêtes.

   TOI :  1. génère la planche dans ChatGPT — 2-3 poses du MÊME personnage
             côte à côte (départ → milieu → fin), fond uni (vert de préf.)
             ou transparent, les poses qui ne se touchent pas.
          2. dépose-la dans  guides-src/  sous le nom de la clé : squat.png
          3. npm run guides

   LUI :  détoure le fond, découpe les poses, les met TOUTES sur le même
          canevas (même échelle, même sol) et écrit
          public/entrainement/guides/<clé>-1.png, -2.png, …
          puis te dicte la règle à coller dans src/lib/exerciseGuides.ts.

   Le canevas commun est la clé : c'est lui qui empêche le perso de sauter
   d'une frame à l'autre pendant le fondu.

   Options :
     --loop        after 1→N, réémet N-1…2 pour que le geste revienne
                   (à utiliser quand la planche ne montre que l'aller)
     --only=squat  ne traite que cette planche
     --tol=60      tolérance du détourage (monte si le fond bave, descends
                   si le perso se fait manger)
   ════════════════════════════════════════════════════════════════════ */

import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "guides-src";
const OUT = path.join("public", "entrainement", "guides");
const RULES = path.join("src", "lib", "exerciseGuides.ts");

const args = process.argv.slice(2);
const flag = (n, d) => {
  const a = args.find(x => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const LOOP = args.includes("--loop");
const ONLY = flag("only", null);
const TOL = Number(flag("tol", 60));

/* Marge autour du perso, en pixels du canevas final. */
const PAD = 24;
/* Un trou d'au moins 2 % de la largeur sépare deux poses. */
const GAP_RATIO = 0.02;
/* En dessous, un pixel est considéré comme du vide. */
const INK = 24;

/* ── Le fond : soit l'alpha existe déjà, soit on le déduit des bords ── */

async function toMask(file) {
  const img = sharp(file);
  const meta = await img.metadata();
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  /* Assez de transparence pour dire que la planche est déjà détourée ? */
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < INK) clear++;
  if (meta.hasAlpha && clear > w * h * 0.15) {
    return { data, w, h, mode: "alpha déjà là" };
  }

  /* Sinon : le fond, c'est la couleur médiane du liseré de bord. */
  const edge = [];
  const at = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  for (let x = 0; x < w; x += 4) {
    edge.push(at(x, 0), at(x, h - 1));
  }
  for (let y = 0; y < h; y += 4) {
    edge.push(at(0, y), at(w - 1, y));
  }
  const med = k => {
    const v = edge.map(p => p[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const bg = [med(0), med(1), med(2)];
  const greenish = bg[1] > bg[0] + 24 && bg[1] > bg[2] + 24;

  /* Bord progressif : net au cœur du fond, doux sur le contour du perso. */
  const t0 = TOL, t1 = TOL * 2;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    let a = dist <= t0 ? 0 : dist >= t1 ? 255 : Math.round(((dist - t0) / (t1 - t0)) * 255);
    if (a === 0) { data[i] = data[i + 1] = data[i + 2] = 0; }
    else if (greenish && data[i + 1] > Math.max(data[i], data[i + 2])) {
      /* Anti-bavure : le vert qui a déteint sur les contours du perso. */
      data[i + 1] = Math.round((data[i] + data[i + 2]) / 2);
    }
    data[i + 3] = Math.min(data[i + 3], a);
  }
  return {
    data, w, h,
    mode: `fond détouré rgb(${bg.join(",")})${greenish ? " — vert, anti-bavure actif" : ""}`,
  };
}

/* ── Où est l'encre : colonnes occupées → poses ; lignes → sol commun ── */

function carve({ data, w, h }) {
  const cols = new Array(w).fill(false);
  let top = h, bot = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > INK) {
        cols[x] = true;
        if (y < top) top = y;
        if (y > bot) bot = y;
      }
    }
  }
  if (bot < 0) return null;

  /* Les poses = les paquets de colonnes séparés par un vrai trou. */
  const minGap = Math.max(4, Math.floor(w * GAP_RATIO));
  const runs = [];
  let start = -1, gap = 0;
  for (let x = 0; x < w; x++) {
    if (cols[x]) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0 && ++gap >= minGap) {
      runs.push([start, x - gap]);
      start = -1;
    }
  }
  if (start >= 0) runs.push([start, w - 1]);

  /* On garde le HAUT et le BAS communs à toute la planche : c'est ce qui
     préserve la hauteur relative de chaque pose (un saut reste en l'air,
     un squat reste en bas) au lieu de recoller tout le monde au sol. */
  return { runs, top, bot };
}

async function build(file, key) {
  const mask = await toMask(file);
  const cut = carve(mask);
  if (!cut) return console.log(`  ✗ ${key} — planche vide, rien à découper`);

  const { runs, top, bot } = cut;
  const band = bot - top + 1;
  const widest = Math.max(...runs.map(([a, b]) => b - a + 1));
  const cw = widest + PAD * 2;
  const ch = band + PAD * 2;

  const raw = { raw: { width: mask.w, height: mask.h, channels: 4 } };
  const frames = [];
  for (const [a, b] of runs) {
    const pw = b - a + 1;
    frames.push(
      await sharp(mask.data, raw)
        .extract({ left: a, top, width: pw, height: band })
        .extend({
          top: PAD, bottom: PAD,
          left: PAD + ((widest - pw) >> 1),
          right: cw - pw - PAD - ((widest - pw) >> 1),
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9 })
        .toBuffer()
    );
  }

  /* --loop : la planche ne montre que l'aller, on rejoue le retour. */
  const out = [...frames];
  if (LOOP && frames.length > 2) {
    for (let i = frames.length - 2; i >= 1; i--) out.push(frames[i]);
  }

  await mkdir(OUT, { recursive: true });
  for (let i = 0; i < out.length; i++) {
    await writeFile(path.join(OUT, `${key}-${i + 1}.png`), out[i]);
  }
  console.log(
    `  ✓ ${key} — ${out.length} frame${out.length > 1 ? "s" : ""} en ${cw}×${ch}  (${mask.mode})`
  );
  return { key, frames: out.length };
}

/* ── ── */

const files = (await readdir(SRC).catch(() => {
  console.log(`Rien à faire : le dossier ${SRC}/ n'existe pas encore.
Crée-le, dépose tes planches dedans (squat.png, pompes.png, …), relance.`);
  process.exit(0);
})).filter(f => /\.(png|jpe?g|webp)$/i.test(f));

if (!files.length) {
  console.log(`Le dossier ${SRC}/ est vide — dépose tes planches dedans.`);
  process.exit(0);
}

console.log(`\nPlanches → frames${LOOP ? "  (--loop : le geste revient)" : ""}\n`);
const done = [];
for (const f of files) {
  const key = path.parse(f).name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ONLY && key !== ONLY) continue;
  const r = await build(path.join(SRC, f), key);
  if (r) done.push(r);
}

/* Quelles clés n'ont pas encore de règle ? */
const rules = await import("node:fs").then(fs =>
  fs.promises.readFile(RULES, "utf8").catch(() => "")
);
const orphans = done.filter(d => !new RegExp(`key:\\s*"${d.key}"`).test(rules));
if (orphans.length) {
  console.log(`\nÀ coller dans ${RULES} (GUIDE_RULES) — l'ordre compte, du
plus précis au plus générique :\n`);
  for (const o of orphans) {
    console.log(`  { re: /${o.key}/i, guide: { key: "${o.key}", frames: ${o.frames} } },`);
  }
  console.log(`\n(la regex ci-dessus est un point de départ : élargis-la aux
variantes — /pompe|push.?up/i plutôt que /pompes/i)`);
} else if (done.length) {
  console.log(`\nToutes les clés ont déjà leur règle — rien à ajouter.`);
}
console.log();
