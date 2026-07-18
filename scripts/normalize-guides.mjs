#!/usr/bin/env node
/* ============================================================================
   Normalisation des personnages-guides deja batis.

   Ce post-traitement ne lit JAMAIS guides-src/ : il relit les PNG commites de
   public/entrainement/guides/, puis les reecrit sur un canevas carre commun.

   Pour chaque cle + genre :
   - la boite alpha est reunie sur toutes les frames (le mouvement est preserve) ;
   - la meme transformation est appliquee a toutes les frames ;
   - le grand axe du geste occupe 920 px sur un canevas 1024 x 1024 ;
   - le bas de la boite commune repose sur la ligne de sol y=972.

   Le grand axe sert de proxy a la stature : un personnage couche occupe donc
   la meme longueur visuelle qu'un personnage debout, sans etre etire.

   Usage :
     npm run guides:normalize          reecrit tous les PNG
     npm run guides:normalize -- --check
                                      verifie le contrat sans rien modifier

   Le script est idempotent et peut etre relance apres `npm run guides`.
   ============================================================================ */

import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join("public", "entrainement", "guides");
const CANVAS = 1024;
const TARGET_SPAN = 920;
const BASELINE = 972;
const ALPHA_THRESHOLD = 24;
const CHECK = process.argv.includes("--check");
const FILE_RE = /^(.*)-([fh])-(\d+)\.png$/i;

function alphaBox(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  return right < 0 ? null : { left, top, right, bottom };
}

function unionBox(boxes) {
  return boxes.reduce((all, box) => ({
    left: Math.min(all.left, box.left),
    top: Math.min(all.top, box.top),
    right: Math.max(all.right, box.right),
    bottom: Math.max(all.bottom, box.bottom),
  }));
}

async function readFrame(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const box = alphaBox(data, info.width, info.height);
  if (!box) throw new Error(`${file} est entierement transparent`);
  return { file, data, info, box };
}

const names = (await readdir(OUT)).filter(name => name.toLowerCase().endsWith(".png"));
const groups = new Map();

for (const name of names) {
  const match = FILE_RE.exec(name);
  if (!match) throw new Error(`Nom de frame inattendu : ${name}`);
  const id = `${match[1]}-${match[2].toLowerCase()}`;
  const list = groups.get(id) ?? [];
  list.push({ name, frame: Number(match[3]) });
  groups.set(id, list);
}

let written = 0;
let skipped = 0;
const errors = [];

for (const [id, entries] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  entries.sort((a, b) => a.frame - b.frame);
  const frames = await Promise.all(entries.map(({ name }) => readFrame(path.join(OUT, name))));
  const { width, height } = frames[0].info;

  if (frames.some(frame => frame.info.width !== width || frame.info.height !== height)) {
    errors.push(`${id} : les frames n'ont pas le meme canevas source`);
    continue;
  }

  const box = unionBox(frames.map(frame => frame.box));
  const sourceWidth = box.right - box.left + 1;
  const sourceHeight = box.bottom - box.top + 1;
  const alreadyNormalized = width === CANVAS && height === CANVAS &&
    Math.max(sourceWidth, sourceHeight) === TARGET_SPAN && box.bottom === BASELINE;

  if (CHECK) {
    if (!alreadyNormalized) errors.push(`${id} : ${width}x${height}, span ${Math.max(sourceWidth, sourceHeight)}, sol ${box.bottom}`);
    continue;
  }

  if (alreadyNormalized) {
    skipped += frames.length;
    continue;
  }

  const scale = TARGET_SPAN / Math.max(sourceWidth, sourceHeight);
  const targetWidth = Math.round(sourceWidth * scale);
  const targetHeight = Math.round(sourceHeight * scale);
  const left = Math.round((CANVAS - targetWidth) / 2);
  const top = BASELINE - targetHeight + 1;

  for (const frame of frames) {
    const sprite = await sharp(frame.data, {
      raw: { width, height, channels: 4 },
    })
      .extract({ left: box.left, top: box.top, width: sourceWidth, height: sourceHeight })
      .resize(targetWidth, targetHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    const normalized = await sharp({
      create: {
        width: CANVAS,
        height: CANVAS,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: sprite, left, top }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(frame.file, normalized);
    written++;
  }
}

if (errors.length) {
  console.error(`\nEchec de la normalisation (${errors.length}) :\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

console.log(CHECK
  ? `OK : ${names.length} PNG, ${groups.size} guides respectent le canevas ${CANVAS}x${CANVAS}.`
  : `OK : ${written} PNG normalises, ${skipped} deja conformes (${groups.size} guides, canevas ${CANVAS}x${CANVAS}, span ${TARGET_SPAN}, sol ${BASELINE}).`
);
