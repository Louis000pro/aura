#!/usr/bin/env node
/*
  Les pictogrammes de missions : planche PNG livrée par Louis, vers le WebP
  de production.

  Usage : npm run missions [-- --src=<dossier>]
  Par défaut le dossier source est `missions-src/` à la racine du repo ; les
  fichiers y sont nommés `mission-<clé>.png`, la clé étant celle de la table
  DESTINATIONS ci-dessous.

  ── CE QUE LE SCRIPT RÉSOUT, ET POURQUOI IL EXISTE ──────────────────────

  Les planches arrivent en 1254x1254 (parfois en paysage), avec la tuile
  arrondie posée au milieu d'une marge blanche. Or les pictogrammes de
  production font 160x160 et la tuile va BORD À BORD : redimensionner la
  planche telle quelle donnerait une vignette de 42 px dont un bon tiers
  serait du vide, donc un dessin deux fois trop petit à côté des autres.

  ⚠️ ON NE PEUT PAS UTILISER `sharp().trim()`. Deux des cinq planches
  portent un liseré sombre de 1 à 2 px tout autour de la toile : `trim`
  part du bord, voit une couleur non uniforme, et ne rogne rien. On
  détecte donc la tuile par DENSITÉ : une colonne appartient à la tuile si
  une bonne part de ses pixels n'est pas quasi blanche. Un liseré de 2 px
  pèse 0,2 % d'une colonne, il ne franchit jamais le seuil.

  Le seuil de « quasi blanc » est serré (6/255) exprès : les fonds de
  tuile les plus pâles ne sont qu'à 18 de distance du blanc, et une
  tolérance confortable les avalerait avec la marge.

  Les coins arrondis sont ensuite REDÉCOUPÉS en transparence, comme les
  pictogrammes Premium existants (rayon mesuré : 22 à 25 px pour 160).
  Sans ça, la tuile afficherait ses angles pleins par-dessus le fond de
  l'application en mode sombre.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Clé du fichier source → chemin de production. La clé est aussi ce que
 *  `MISSIONS` (src/lib/aura.ts) pointe : les deux doivent rester d'accord. */
const DESTINATIONS = {
  "journee-complete": "public/missions/daily/journee-complete-v1.webp",
  "objectif-accompli": "public/missions/premium/objectif-accompli-v1.webp",
  "semaine-active": "public/missions/semaine/active-v1.webp",
  "semaine-reguliere": "public/missions/semaine/reguliere-v1.webp",
  "semaine-parfaite": "public/missions/semaine/parfaite-v1.webp",
};

const COTE = 160;          // la taille de production, celle des six existants
const RAYON = 24;          // le rayon des coins, mesuré sur la famille Premium
const BLANC = 6;           // au-delà de cet écart au blanc, le pixel compte
const DENSITE = 0.3;       // part d'une ligne/colonne à couvrir pour être « tuile »

const arg = process.argv.slice(2).find((a) => a.startsWith("--src="));
const dossierSource = arg ? arg.slice(6) : path.join(racine, "missions-src");

/** La boîte de la tuile arrondie dans la planche, marge blanche exclue. */
async function cadreDeLaTuile(fichier) {
  const { data, info } = await sharp(fichier).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const colore = (x, y) => {
    const i = (y * W + x) * C;
    return Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) > BLANC;
  };

  const colonnes = new Array(W).fill(0);
  const lignes = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!colore(x, y)) continue;
      colonnes[x]++;
      lignes[y]++;
    }
  }

  /* ⚠️ L'ÉROSION N'EST PAS UN RAFFINEMENT, ELLE EST LA CORRECTION.
     Le liseré sombre de certaines planches est un CADRE PLEIN : la colonne
     x=0 est donc dense à 100 %, et une simple lecture de densité la prend
     pour de la tuile, ce qui rend la toile entière. On n'accepte une
     colonne que si ses voisines à ±EPAISSEUR le sont aussi ; un trait de
     deux pixels ne survit pas, un bord de tuile large de centaines de
     pixels ne s'en aperçoit même pas. */
  const EPAISSEUR = 4;
  const eroder = (compte, total) => {
    const brut = compte.map((n) => n >= total * DENSITE);
    return brut.map((v, i) => {
      if (!v) return false;
      for (let d = -EPAISSEUR; d <= EPAISSEUR; d++) {
        const j = i + d;
        if (j >= 0 && j < brut.length && !brut[j]) return false;
      }
      return true;
    });
  };

  const borne = (compte, total) => {
    const plein = eroder(compte, total);
    const debut = plein.indexOf(true);
    const fin = plein.lastIndexOf(true);
    return [debut, fin];
  };

  const [gauche, droite] = borne(colonnes, H);
  const [haut, bas] = borne(lignes, W);
  if (gauche < 0 || haut < 0 || droite <= gauche || bas <= haut) {
    throw new Error("tuile introuvable : la planche est-elle bien une icône sur fond blanc ?");
  }

  /* La tuile est carrée par construction, mais l'érosion et l'antialiasing
     des coins peuvent laisser quelques pixels d'écart. On prend le plus
     grand côté et on recentre : sinon `fit: "fill"` étirerait le dessin de
     un ou deux pour cent, ce qui se voit sur un cercle. */
  const cote = Math.min(Math.max(droite - gauche + 1, bas - haut + 1), W, H);
  const centreX = (gauche + droite) / 2;
  const centreY = (haut + bas) / 2;
  const left = Math.round(Math.min(Math.max(centreX - cote / 2, 0), W - cote));
  const top = Math.round(Math.min(Math.max(centreY - cote / 2, 0), H - cote));
  return { left, top, width: cote, height: cote };
}

/** Le masque des coins arrondis, en niveaux de gris, appliqué en alpha. */
function masqueArrondi() {
  const svg = `<svg width="${COTE}" height="${COTE}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${COTE}" height="${COTE}" rx="${RAYON}" ry="${RAYON}" fill="#fff"/>
  </svg>`;
  return sharp(Buffer.from(svg)).extractChannel("red").toBuffer();
}

if (!fs.existsSync(dossierSource)) {
  console.error(`✖ Dossier source introuvable : ${dossierSource}`);
  console.error("  Déposer les planches `mission-<clé>.png` dedans, ou passer --src=<dossier>.");
  process.exit(1);
}

const masque = await masqueArrondi();
let faits = 0;

for (const [cle, destination] of Object.entries(DESTINATIONS)) {
  const source = path.join(dossierSource, `mission-${cle}.png`);
  if (!fs.existsSync(source)) {
    console.log(`  passé   mission-${cle}.png (absent du dossier source)`);
    continue;
  }

  const cadre = await cadreDeLaTuile(source);
  const sortie = path.join(racine, destination);
  fs.mkdirSync(path.dirname(sortie), { recursive: true });

  await sharp(source)
    .extract(cadre)
    // `fill` et non `cover` : la tuile est carrée à quelques pixels près, et
    // un `cover` rognerait justement l'air prévu autour du dessin.
    .resize(COTE, COTE, { fit: "fill" })
    .ensureAlpha()
    .composite([{ input: masque, blend: "dest-in", raw: undefined }])
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(sortie);

  const taille = (fs.statSync(sortie).size / 1024).toFixed(1);
  console.log(`  ok      ${destination}  (tuile ${cadre.width}x${cadre.height} → ${COTE}x${COTE}, ${taille} Ko)`);
  faits++;
}

console.log(`\n${faits} pictogramme(s) écrit(s).`);
