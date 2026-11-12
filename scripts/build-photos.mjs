#!/usr/bin/env node
/* ============================================================================
   Les photos de séance par Guide : une planche devient quatre fichiers.

   Entrée  : photos-src/<base>.webp|png|jpg|jpeg
             Une planche à deux panneaux séparés par un filet blanc :
             Sasha en haut, Nora en bas. Le fichier porte le nom de la base,
             version comprise (`legs-squat-v4.webp`). Jamais commitée.
   Sortie  : public/entrainement/<base>-sasha.webp et <base>-nora.webp
             (2048 px de large, pour le héros de l'accueil)
             public/entrainement/m/<base>-sasha.webp et <base>-nora.webp
             (720 px de large, pour les cartes : le srcSet de `Photo`)

   Usage :
     npm run photos                    toutes les planches de photos-src/
     npm run photos -- legs-squat-v4   seulement celles-là

   Reste à faire à la main, dans src/lib/photosGuide.ts : la ligne de la
   photo neutre dans PHOTOS_PAR_GUIDE, et la place du personnage dans PLACES
   s'il n'est pas au milieu de l'image.

   /!\ ON COUPE AU FILET, ET ON NE RETOUCHE RIEN. Ni fondu ni cadre (Louis,
   2026-10-20 : un fondu noir refusé, puis un blanc discret refusé aussi),
   et le panneau reste entier : c'est le cadrage de la carte qui suit le
   personnage (PLACES), pas un rognage du fichier, qui couperait les pieds
   d'une pose allongée sur un grand écran.

   /!\ LES RANGÉES QUI TOUCHENT LE FILET PARTENT AVEC LUI (MARGE). Elles
   sont à moitié blanches, et la planche garde un liseré plus clair puis
   plus sombre juste avant : à trois rangées, il restait une ligne claire
   en bas du soulevé de terre.
   ========================================================================== */
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const SRC = "photos-src";
const DEST = path.join("public", "entrainement");
const LARGE = 2048;   // le héros de l'accueil
const CARTE = 720;    // les cartes
const MARGE = 5;      // rangées retirées de chaque côté du filet

/** Les rangées du filet blanc, cherchées dans le tiers du milieu. */
function filet(data, W, H, C) {
  const blanche = (y) => {
    let n = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= 225) n++;
    }
    return n >= W * 0.9;
  };
  let debut = -1, fin = -1;
  for (let y = Math.floor(H / 3); y < Math.ceil((2 * H) / 3); y++) {
    if (!blanche(y)) continue;
    if (debut < 0) debut = y;
    fin = y;
  }
  return debut < 0 ? null : { debut, fin };
}

async function ecrire(planche, zone, base, guide) {
  const decoupe = () => sharp(planche).extract(zone);
  /* Agrandie en lanczos3 avec un léger renforcement : à 1024 px, la
     première planche paraissait floue dans le héros (Louis, 2026-10-20). */
  const a = await decoupe()
    .resize({ width: LARGE, kernel: "lanczos3" })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(DEST, `${base}-${guide}.webp`));
  const b = await decoupe()
    .resize({ width: CARTE, kernel: "lanczos3", withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(path.join(DEST, "m", `${base}-${guide}.webp`));
  return `${guide} ${a.width} × ${a.height} (${Math.round(a.size / 1024)} Ko), carte ${Math.round(b.size / 1024)} Ko`;
}

if (!existsSync(SRC)) {
  console.error(`✗ ${SRC}/ n'existe pas : y déposer les planches, une par base (ex. ${SRC}/legs-squat-v4.webp).`);
  process.exit(1);
}
mkdirSync(path.join(DEST, "m"), { recursive: true });

const demandees = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const planches = readdirSync(SRC)
  .filter((f) => /\.(webp|png|jpe?g)$/i.test(f))
  .filter((f) => !demandees.length || demandees.includes(f.replace(/\.[^.]+$/, "")))
  .sort();
if (!planches.length) {
  console.error(`✗ Aucune planche à traiter dans ${SRC}/.`);
  process.exit(1);
}

let echecs = 0;
for (const f of planches) {
  const base = f.replace(/\.[^.]+$/, "");
  const planche = path.join(SRC, f);
  if (!/^[a-z0-9-]+-v\d+$/.test(base)) {
    console.error(`✗ ${f} : le nom doit être une base avec sa version (ex. legs-squat-v4).`);
    echecs++;
    continue;
  }
  const { data, info } = await sharp(planche).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const trait = filet(data, W, H, C);
  if (!trait) {
    console.error(`✗ ${f} : pas de filet blanc entre les deux panneaux.`);
    echecs++;
    continue;
  }
  const bas = trait.fin + 1 + MARGE;
  const sasha = await ecrire(planche, { left: 0, top: 0, width: W, height: trait.debut - MARGE }, base, "sasha");
  const nora = await ecrire(planche, { left: 0, top: bas, width: W, height: H - bas }, base, "nora");
  console.log(`✓ ${base} (filet ${trait.debut} à ${trait.fin}) : ${sasha} ; ${nora}`);
}
if (echecs) process.exit(1);
