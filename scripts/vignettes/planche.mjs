// Rend des dessins en PNG et une planche de revue (grand format + pastilles 44 px clair/sombre).
// node scripts/vignettes/planche.mjs <dossier de sortie> scripts/vignettes/dessins/serie-5.mjs [autre module…] [--seul=a,b]
// Le dossier reçoit chaque dessin en SVG et en PNG, plus _planche.png.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const args = process.argv.slice(2);
const sortie = args[0];
const seul = (args.find((a) => a.startsWith("--seul=")) || "").slice(7).split(",").filter(Boolean);
const mods = args.slice(1).filter((a) => !a.startsWith("--"));
mkdirSync(sortie, { recursive: true });

const icones = {};
for (const m of mods) Object.assign(icones, (await import(pathToFileURL(path.resolve(m)).href)).default);
const noms = Object.keys(icones).filter((n) => !seul.length || seul.includes(n));

const png = (svg, px) => sharp(Buffer.from(svg), { density: (72 * px) / 32 }).resize(px, px).png().toBuffer();

const C = 6, W = 168, H = 212;
const comps = [];
for (let i = 0; i < noms.length; i++) {
  const n = noms[i], svg = icones[n];
  writeFileSync(path.join(sortie, n + ".svg"), svg);
  writeFileSync(path.join(sortie, n + ".png"), await png(svg, 160));
  const x = (i % C) * W, y = Math.floor(i / C) * H;
  comps.push({ input: await png(svg, 128), left: x + 20, top: y + 6 });
  // pastilles comme dans la fiche recette : 44 px, icône 34 px
  for (const [k, fond] of [[0, "#ECE4F7"], [1, "#2A2236"]]) {
    const chip = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><circle cx="22" cy="22" r="21.5" fill="${fond}"/></svg>`);
    comps.push({ input: chip, left: x + 30 + k * 62, top: y + 140 });
    comps.push({ input: await png(svg, 34), left: x + 35 + k * 62, top: y + 145 });
  }
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="20"><text x="${W / 2}" y="14" font-family="Arial" font-size="13" text-anchor="middle" fill="#222">${n}</text></svg>`), left: x, top: y + 188 });
}
const rows = Math.ceil(noms.length / C);
await sharp({ create: { width: C * W, height: rows * H, channels: 4, background: "#FAF8FC" } }).composite(comps).png().toFile(path.join(sortie, "_planche.png"));
console.log(noms.length, "icônes →", path.join(sortie, "_planche.png"));
