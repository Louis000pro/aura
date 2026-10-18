#!/usr/bin/env node
/* ============================================================================
   Recalage des personnages-guides (Louis, 2026-10-17, page « Le mouvement
   du jour » du canevas « Les rangs et le profil »).

   LE DÉFAUT. `build-guides.mjs` pose chaque pose sur le canevas en la
   recentrant sur SA PROPRE boîte. Dès qu'un bras s'allonge d'un côté, la
   boîte s'élargit, et tout le personnage glisse de l'autre côté au fondu :
   les pieds bougent alors qu'ils devraient rester plantés. Mesuré le
   2026-10-17 : 48 des 87 mouvements à plusieurs poses bougeaient de façon
   visible, et le Bicycle crunch avait une pose dessinée 412 px au-dessus
   du sol.

   LE CORRECTIF NE REDESSINE RIEN. Chaque pose est recalée sur ce qui ne
   bouge pas, par rapport à la première pose du mouvement :
   - d'abord verticalement : hors des vrais sauts et des suspensions
     (`SAUTS`), chaque pose repose sur le même sol ;
   - puis horizontalement, sur les silhouettes déjà posées au sol : on
     cherche le décalage qui les superpose le mieux. L'appui au sol compte
     quatre fois plus que le reste du corps, et le bas du corps plus que le
     haut. À score égal (1 %), le plus petit décalage gagne : on ne déplace
     jamais une pose sans raison.
   ⚠️ L'ORDRE COMPTE. Comparer deux silhouettes dont l'une flotte revient à
   comparer des lignes qui ne se correspondent pas : le Bicycle crunch se
   recalait au sol puis glissait de 128 px à la mesure suivante.

   Puis le mouvement est renormalisé EXACTEMENT comme `normalize-guides.mjs`
   (canevas 1024, grand axe 920, sol 972), avec la même transformation pour
   toutes ses poses : le recalage survit donc à une normalisation.

   ⚠️ ON REMESURE APRÈS AVOIR RECALÉ. La renormalisation change l'échelle,
   donc la grille d'analyse ne tombe plus au même endroit, et la seconde
   mesure peut encore trouver quelques pixels. On corrige jusqu'à ce que la
   mesure soit sous la tolérance, en repartant TOUJOURS de l'image
   d'origine avec les décalages cumulés : une seule interpolation, jamais
   une copie de copie.

   Usage :
     npm run guides:recaler       recale ce qui doit l'être, en place
     npm run check:animations     vérifie le contrat sans rien écrire
     node scripts/recaler-guides.mjs --check --dir=<dossier>
                                  le même contrôle sur un autre dossier
                                  (c'est ainsi qu'on vérifie un témoin)

   Idempotent : un mouvement dont tous les décalages restent sous la
   tolérance n'est pas réécrit. Il tourne APRÈS `normalize-guides.mjs`,
   parce qu'il analyse le canevas commun de 1024.
   ============================================================================ */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Sous Windows, sharp garde ouvert le fichier qu'il a lu : on ne pourrait
// plus l'écraser. On lit donc chaque pose en mémoire, sans cache.
sharp.cache(false);

const argDir = process.argv.find((a) => a.startsWith("--dir="));
const DIR = argDir ? argDir.slice("--dir=".length) : path.join("public", "entrainement", "guides");
const CHECK = process.argv.includes("--check");
const FILE_RE = /^(.*)-([fh])-(\d+)\.webp$/i;

// Le contrat de `normalize-guides.mjs`, recopié tel quel : le recalage rend
// des images déjà normalisées.
const CANVAS = 1024;
const TARGET_SPAN = 920;
const BASELINE = 972;
const ALPHA_THRESHOLD = 24;
const WEBP = { quality: 82, alphaQuality: 90, effort: 6 };

// L'analyse se fait sur une grille de 256 : une case vaut 4 px.
const R = 256;
const K = CANVAS / R;
const SEUIL = 40;
const PORTEE = 60; // en cases : jusqu'à 240 px de décalage
// Sous 8 px (deux cases), un écart ne se voit pas au fondu.
const TOLERANCE = 8;
const TOURS = 6;
const MARGE = 640;
// Un morceau détaché plus petit que 150 px ne se voit pas ; au-delà de 5 %
// du corps, c'est un objet du mouvement (la caisse du box jump), pas un éclat.
const ECLAT_MIN = 150;
const ECLAT_PART = 0.05;

/* Les mouvements qui quittent VRAIMENT le sol, ou s'y suspendent : leur
   hauteur reste celle qui est dessinée. Les recaler au sol ferait d'un saut
   une flexion. La clé est celle des fichiers, sans le genre. */
const SAUTS = new Set([
  "boxjump", "burpees", "corde", "dipsbarresparalleles",
  "fentessautees", "jumpingjacks", "pompesexplosives", "skaters",
  "squatsaute", "tractions",
]);

function alphaBox(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
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
  return boxes.reduce((all, b) => ({
    left: Math.min(all.left, b.left),
    top: Math.min(all.top, b.top),
    right: Math.max(all.right, b.right),
    bottom: Math.max(all.bottom, b.bottom),
  }));
}

/** La silhouette sur la grille d'analyse, et sa ligne la plus basse. */
function masque(data) {
  const m = new Uint8Array(R * R);
  let bas = -1;
  for (let y = 0; y < R; y++) {
    for (let x = 0; x < R; x++) {
      let allume = false;
      for (let dy = 0; dy < K && !allume; dy++) {
        for (let dx = 0; dx < K; dx++) {
          if (data[((y * K + dy) * CANVAS + x * K + dx) * 4 + 3] > SEUIL) { allume = true; break; }
        }
      }
      if (allume) { m[y * R + x] = 1; bas = Math.max(bas, y); }
    }
  }
  return { m, bas };
}

/** La même silhouette, descendue de `n` cases. */
function descendre(m, n) {
  if (n === 0) return m;
  const out = new Uint8Array(R * R);
  for (let y = 0; y < R; y++) {
    const src = y - n;
    if (src >= 0 && src < R) out.set(m.subarray(src * R, (src + 1) * R), y * R);
  }
  return out;
}

/** Ce que deux silhouettes ont en commun quand on décale la seconde de `dx`. */
function chevauche(a, b, dx, y0, y1, poids) {
  let s = 0;
  for (let y = Math.max(0, y0); y <= y1; y++) {
    const p = poids(y);
    for (let x = 0; x < R; x++) {
      const xb = x - dx;
      if (xb >= 0 && xb < R && a[y * R + x] && b[y * R + xb]) s += p;
    }
  }
  return s;
}

/** Le décalage horizontal, en cases, qui pose `f` sur `ref`. */
function decalage(ref, f, sol) {
  const scores = [];
  for (let dx = -PORTEE; dx <= PORTEE; dx++) {
    const appui = chevauche(ref, f, dx, sol - 6, sol, () => 1);
    const corps = chevauche(ref, f, dx, 0, R - 1, (y) => 1 + 2 * (y / R));
    scores.push([dx, 4 * appui + corps]);
  }
  const max = Math.max(...scores.map((s) => s[1]));
  if (max <= 0) return 0;
  return scores
    .filter((s) => s[1] >= max * 0.99)
    .sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]) || a[0] - b[0])[0][0];
}

/** Les morceaux d'un seul tenant (8 voisins), au-dessus du seuil d'alpha. */
function composantes(data) {
  const n = CANVAS * CANVAS;
  const vu = new Uint8Array(n);
  const comps = [];
  for (let i = 0; i < n; i++) {
    if (vu[i] || data[i * 4 + 3] <= SEUIL) continue;
    const pixels = [];
    const pile = [i];
    vu[i] = 1;
    while (pile.length) {
      const j = pile.pop();
      pixels.push(j);
      const x = j % CANVAS, y = (j / CANVAS) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= CANVAS || yy >= CANVAS) continue;
          const k = yy * CANVAS + xx;
          if (vu[k] || data[k * 4 + 3] <= SEUIL) continue;
          vu[k] = 1;
          pile.push(k);
        }
      }
    }
    comps.push(pixels);
  }
  return comps;
}

/** Les éclats : ce que le découpage d'une planche a laissé d'une pose
 *  voisine (une chaussure à côté d'un burpee, un bout de chaise à côté des
 *  dips). Détachés du corps, assez grands pour se voir, trop petits pour
 *  être un objet du mouvement. */
function eclats(data) {
  const comps = composantes(data);
  if (comps.length < 2) return [];
  const corps = Math.max(...comps.map((c) => c.length));
  return comps.filter((c) => c.length >= ECLAT_MIN && c.length < corps * ECLAT_PART);
}

/** Efface les éclats, avec leur bord adouci : on suit l'alpha jusqu'à zéro.
 *  Si ce bord touche une autre forme pleine, on n'efface que l'éclat. */
function nettoyer(data) {
  const aRetirer = eclats(data);
  for (const c of aRetirer) {
    const vu = new Uint8Array(CANVAS * CANVAS);
    for (const j of c) vu[j] = 1;
    const pile = c.slice();
    const region = [];
    let pont = false;
    while (pile.length) {
      const j = pile.pop();
      region.push(j);
      const x = j % CANVAS, y = (j / CANVAS) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= CANVAS || yy >= CANVAS) continue;
          const k = yy * CANVAS + xx;
          if (vu[k] || data[k * 4 + 3] === 0) continue;
          vu[k] = 1;
          if (data[k * 4 + 3] > SEUIL) { pont = true; continue; }
          pile.push(k);
        }
      }
    }
    for (const j of pont ? c : region) data.fill(0, j * 4, j * 4 + 4);
  }
  return aRetirer.length;
}

async function decoder(buffer, nom, { nettoyage = false } = {}) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== CANVAS || info.height !== CANVAS) {
    throw new Error(`${nom} : ${info.width}x${info.height}, lance d'abord guides:normalize (canevas ${CANVAS} attendu)`);
  }
  const retires = nettoyage ? nettoyer(data) : 0;
  const box = alphaBox(data, CANVAS, CANVAS);
  if (!box) throw new Error(`${nom} est entièrement transparent`);
  return { data, box, retires, ...masque(data) };
}

/** Les décalages, en px, qui recalent chaque pose sur la première :
 *  le sol d'abord, puis l'axe horizontal sur les silhouettes posées. */
function mesurer(id, poses) {
  const saut = SAUTS.has(id.replace(/-[fh]$/i, ""));
  const sol = Math.max(...poses.map((p) => p.bas));
  const cases = poses.map((p) => (saut ? 0 : sol - p.bas));
  const posees = poses.map((p, i) => descendre(p.m, cases[i]));
  const dxs = poses.map((_, i) => (i === 0 ? 0 : decalage(posees[0], posees[i], sol) * K));
  const dys = cases.map((n) => n * K);
  return { dxs, dys };
}

const ecartMax = ({ dxs, dys }) => Math.max(...dxs.map(Math.abs), ...dys.map(Math.abs));

/** Rend les poses d'origine, décalées de `dxs`/`dys` (px d'origine), puis
 *  renormalisées ensemble. Rend aussi l'échelle appliquée. */
async function rendre(originaux, dxs, dys) {
  const boites = originaux.map((p, i) => ({
    left: p.box.left + dxs[i], right: p.box.right + dxs[i],
    top: p.box.top + dys[i], bottom: p.box.bottom + dys[i],
  }));
  const u = unionBox(boites);
  const sw = u.right - u.left + 1;
  const sh = u.bottom - u.top + 1;
  const echelle = TARGET_SPAN / Math.max(sw, sh);
  const tw = Math.round(sw * echelle);
  const th = Math.round(sh * echelle);
  const left = Math.round((CANVAS - tw) / 2);
  const top = BASELINE - th + 1;
  const cote = CANVAS + 2 * MARGE;

  const buffers = [];
  for (const [i, p] of originaux.entries()) {
    if (Math.abs(dxs[i]) > MARGE || Math.abs(dys[i]) > MARGE) throw new Error("décalage hors marge");
    // Deux passes : agrandir le canevas, puis découper la fenêtre commune.
    // Dans une seule chaîne, sharp choisit lui-même l'ordre d'extend et
    // d'extract, et ce n'est pas celui qu'on écrit.
    const etendu = await sharp(p.data, { raw: { width: CANVAS, height: CANVAS, channels: 4 } })
      .extend({ top: MARGE, bottom: MARGE, left: MARGE, right: MARGE, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer();
    const sprite = await sharp(etendu, { raw: { width: cote, height: cote, channels: 4 } })
      .extract({ left: u.left - dxs[i] + MARGE, top: u.top - dys[i] + MARGE, width: sw, height: sh })
      .resize(tw, th, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
    buffers.push(await sharp({
      create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: sprite, left, top }])
      .webp(WEBP)
      .toBuffer());
  }
  return { buffers, echelle };
}

const noms = (await readdir(DIR)).filter((n) => /\.webp$/i.test(n));
const groupes = new Map();
for (const nom of noms) {
  const m = FILE_RE.exec(nom);
  if (!m) throw new Error(`Nom de pose inattendu : ${nom}`);
  const id = `${m[1]}-${m[2].toLowerCase()}`;
  const liste = groupes.get(id) ?? [];
  liste.push({ nom, rang: Number(m[3]) });
  groupes.set(id, liste);
}

let animes = 0;
const fautifs = [];
const avecEclats = [];
const recales = [];
const nettoyes = [];
const rebelles = [];

for (const [id, entrees] of [...groupes].sort(([a], [b]) => a.localeCompare(b))) {
  entrees.sort((a, b) => a.rang - b.rang);
  const fichiers = entrees.map((e) => path.join(DIR, e.nom));
  const originaux = [];
  for (const f of fichiers) originaux.push(await decoder(await readFile(f), f, { nettoyage: true }));
  const retires = originaux.reduce((s, p) => s + p.retires, 0);
  if (retires) (CHECK ? avecEclats : nettoyes).push({ id, n: retires });

  const zeros = originaux.map(() => 0);
  const premiere = originaux.length < 2 ? { dxs: zeros, dys: zeros } : mesurer(id, originaux);
  if (originaux.length >= 2) animes++;
  const decale = ecartMax(premiere) > TOLERANCE;
  if (CHECK) { if (decale) fautifs.push({ id, ...premiere }); continue; }
  if (!decale && !retires) continue;

  // Les décalages cumulés, en px de l'image d'origine. Un mouvement qu'on ne
  // fait que nettoyer est rendu sans décalage : sa boîte a changé, il se
  // renormalise.
  const cumulX = decale ? premiere.dxs.slice() : zeros.slice();
  const cumulY = decale ? premiere.dys.slice() : zeros.slice();
  let rendu = await rendre(originaux, cumulX, cumulY);
  let tours = 1;
  for (; originaux.length >= 2 && tours < TOURS; tours++) {
    const poses = [];
    for (const b of rendu.buffers) poses.push(await decoder(b, id));
    const reste = mesurer(id, poses);
    if (ecartMax(reste) <= TOLERANCE) break;
    // Un écart mesuré sur l'image rendue se ramène à l'image d'origine.
    for (let i = 0; i < cumulX.length; i++) {
      cumulX[i] += Math.round(reste.dxs[i] / rendu.echelle);
      cumulY[i] += Math.round(reste.dys[i] / rendu.echelle);
    }
    rendu = await rendre(originaux, cumulX, cumulY);
  }
  if (tours === TOURS) { rebelles.push(id); continue; }
  // On n'écrit qu'une fois le mouvement entier stable : un mouvement à
  // moitié recalé serait pire que pas recalé du tout.
  for (const [i, f] of fichiers.entries()) await writeFile(f, rendu.buffers[i]);
  if (decale) recales.push({ id, dxs: premiere.dxs, dys: premiere.dys, tours });
}

if (CHECK) {
  if (fautifs.length || avecEclats.length) {
    if (fautifs.length) {
      console.error(`\nÉchec du recalage (${fautifs.length} mouvement(s) sur ${animes}) : une pose glisse ou flotte de plus de ${TOLERANCE} px.`);
      for (const r of fautifs) console.error(`- ${r.id} : dx ${r.dxs.join(" ")} · dy ${r.dys.join(" ")}`);
    }
    if (avecEclats.length) {
      console.error(`\nÉclats détachés (${avecEclats.length} mouvement(s)) : un morceau d'une pose voisine traîne sur l'image.`);
      for (const r of avecEclats) console.error(`- ${r.id} : ${r.n} éclat(s)`);
    }
    console.error("\nLance npm run guides:recaler.\n");
    process.exit(1);
  }
  console.log(`OK : ${animes} mouvements à plusieurs poses, tous recalés (tolérance ${TOLERANCE} px), et aucun éclat sur les ${groupes.size} guides.`);
} else {
  console.log(`OK : ${recales.length} mouvement(s) recalé(s) sur ${animes} à plusieurs poses, ${nettoyes.length} nettoyé(s) de leurs éclats.`);
  for (const r of recales) console.log(`  ${r.id} : dx ${r.dxs.join(" ")} · dy ${r.dys.join(" ")}${r.tours > 1 ? ` (${r.tours} mesures)` : ""}`);
  for (const r of nettoyes) console.log(`  ${r.id} : ${r.n} éclat(s) retiré(s)`);
  if (rebelles.length) {
    console.error(`\n${rebelles.length} mouvement(s) ne se stabilisent pas en ${TOURS} mesures, laissés tels quels : ${rebelles.join(", ")}`);
    process.exit(1);
  }
}
