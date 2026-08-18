#!/usr/bin/env node
/* ============================================================================
   Les portraits de Nora et Sasha : normalisation et conversion.

   Entree  : guides-src/portraits/{nora,sasha}-{master,chat}.png
             (les PNG originaux, jamais modifies, jamais commites)
   Sortie  : public/guides/{nora,sasha}-{master,chat}-v1.webp

   Usage :
     npm run portraits            ecrit les WebP
     npm run portraits -- --check mesure et compare, sans rien ecrire

   ── POURQUOI UNE NORMALISATION ────────────────────────────────────────────
   Les deux illustrations sont dessinees separement, donc elles n'arrivent pas
   cadrees pareil. Mesure sur les fichiers livres : le haut du crane de Nora
   est a 5,6 % de la hauteur, celui de Sasha a 1,2 %. Or le questionnaire
   recadre le HAUT du fichier pour en tirer un buste : avec 1,2 % de marge, les
   cheveux de Sasha etaient coupes par la fenetre.

   Deux corrections possibles, et une seule est saine. Donner a chaque Guide
   son propre reglage CSS ferait entrer les defauts d'un fichier dans la
   feuille de style, et la prochaine version d'une illustration casserait le
   cadrage en silence. On fait donc l'inverse, comme `normalize-guides.mjs` le
   fait deja pour les sprites d'exercice : le fichier se conforme a un
   contrat, et le CSS n'a qu'une seule regle.

   ⚠️ NORMALISER N'EST PAS RETOUCHER. Le dessin n'est jamais redessine, ni
   deforme, ni recolore, et son echelle n'est pas touchee sur les masters :
   on ne fait que le DEPLACER sur sa toile, en pixels entiers. Les originaux
   restent intacts dans guides-src/.

   ── LES DEUX CONTRATS ─────────────────────────────────────────────────────
   master · le haut du crane se pose sur la meme ligne pour les deux Guides
            (LIGNE_TETE), par translation verticale seule. L'echelle du dessin
            n'est pas touchee : c'est ce qui garde a chacun sa stature.
   chat   · la silhouette occupe la meme part de la largeur (LARGEUR_CHAT),
            par zoom centre. Ici il FAUT une echelle : les deux cadrages
            carres n'ont pas ete cadres de la meme facon, et dans une pastille
            ronde la tete de Nora arrivait un quart plus petite que celle de
            Sasha.

   ── POURQUOI ON NE REDIMENSIONNE PAS LES MASTERS ──────────────────────────
   Le contrat visuel annoncait 1080 x 1440. Les fichiers arrivent en
   1086 x 1448, soit exactement le meme ratio 3:4 et au-dessus du besoin reel
   (1058 px de large au maximum, sur la scene de choix a DPR 3). Les
   ramener a 1080 ne gagnerait rien et couterait un reechantillonnage. C'est
   donc le contrat qui s'aligne sur les fichiers, pas l'inverse.
   ============================================================================ */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.join("guides-src", "portraits");
const OUT = path.join("public", "guides");
const CHECK = process.argv.includes("--check");

/** Au-dessus, c'est du personnage. En dessous, du bord de pinceau. */
const SEUIL_ALPHA = 8;

/** Le haut du crane, en part de la hauteur du fichier. Valeur de Nora, qui
 *  laisse deja la bonne respiration au-dessus de la fenetre du questionnaire
 *  (celle-ci commence a 2 % de la hauteur). */
const LIGNE_TETE = 0.056;

/** La part de la largeur occupee par la silhouette dans le cadrage carre.
 *  99 % et pas 100 : il reste un cheveu de marge pour que le lissage des
 *  bords ne bute pas sur le bord du fichier. */
const LARGEUR_CHAT = 0.99;

/** Le carre de conversation est affiche au plus a 80 px CSS, soit 240 px sur
 *  un ecran a DPR 3. 512 laisse plus du double, et pese trois fois moins que
 *  les 1254 px d'origine. */
const COTE_CHAT = 512;

async function boiteAlpha(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let left = w, top = h, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * c + 3] <= SEUIL_ALPHA) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? null : { left, top, right, bottom, w, h };
}

/** Deplace le contenu verticalement, sans le redimensionner. Ce qui sort par
 *  le bas est perdu : sur ces cadrages mi-corps le bas est deja coupe par le
 *  cadre, on ne perd donc qu'une lisiere de cuisse, jamais une main ni une
 *  hanche. Le script le verifie et refuse le contraire. */
async function translater(buf, dy, boite) {
  if (dy === 0) return buf;
  if (dy > 0 && boite.bottom - (boite.h - 1 - dy) > 0.06 * boite.h) {
    throw new Error(`translation de ${dy} px : elle couperait plus de 6 % du bas du personnage`);
  }
  const garde = dy > 0
    ? await sharp(buf).extract({ left: 0, top: 0, width: boite.w, height: boite.h - dy }).png().toBuffer()
    : await sharp(buf).extract({ left: 0, top: -dy, width: boite.w, height: boite.h + dy }).png().toBuffer();
  return sharp({ create: { width: boite.w, height: boite.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: garde, left: 0, top: Math.max(0, dy) }])
    .png()
    .toBuffer();
}

async function master(nom) {
  const src = path.join(SRC, `${nom}-master.png`);
  const buf = await readFile(src);
  const boite = await boiteAlpha(buf);
  const vise = Math.round(LIGNE_TETE * boite.h);
  const dy = vise - boite.top;
  const sortie = await translater(buf, dy, boite);
  return { src, buf: sortie, boite, dy, vise, w: boite.w, h: boite.h };
}

async function chat(nom) {
  const src = path.join(SRC, `${nom}-chat.png`);
  const buf = await readFile(src);
  const boite = await boiteAlpha(buf);
  const large = boite.right - boite.left + 1;
  const zoom = (LARGEUR_CHAT * boite.w) / large;
  // Zoom centre sur la silhouette en x, et ancre en haut : la tete doit rester
  // entiere, c'est le bas (le torse) qui peut sortir du cadre.
  const cote = Math.min(boite.w, Math.round(boite.w / zoom));
  const cx = (boite.left + boite.right) / 2;
  const left = Math.max(0, Math.min(boite.w - cote, Math.round(cx - cote / 2)));
  const top = Math.max(0, Math.min(boite.h - cote, Math.round(boite.top - 0.02 * cote)));
  const sortie = await sharp(buf)
    .extract({ left, top, width: cote, height: cote })
    .resize({ width: COTE_CHAT, height: COTE_CHAT, kernel: "lanczos3" })
    .png()
    .toBuffer();
  return { src, buf: sortie, boite, zoom, cote, left, top };
}

/** ── LE REGLAGE, ET POURQUOI CELUI-LA ──────────────────────────────────────
 *  `alphaQuality: 100` n'est pas un confort : mesure sur les deux fichiers,
 *  le canal alpha ressort alors identique au bit pres (ecart maximum 0). Rien
 *  ne peut donc apparaitre autour de la silhouette, ce qui etait le premier
 *  risque.
 *
 *  Reste la couleur. Le sans-perte pese 453 et 518 Ko, contre 143 Ko en q95 :
 *  quatre fois moins pour le premier ecran de Vaiiya, sur telephone. La
 *  question est donc de savoir si l'ecart se voit. Mesure : 6 % des pixels
 *  s'ecartent de plus de 2/255, avec des pointes a 45. Regarde : la frontiere
 *  cheveux/peau, agrandie quatre fois au plus proche voisin, est
 *  indiscernable. Les chiffres disaient peut-etre, l'oeil dit non.
 *
 *  q95 plutot que q92, qui suffisait deja : 15 Ko de plus sur un fichier
 *  qu'on ne veut pas avoir a regenerer.
 *
 *  ⚠️ `smartSubsample: false` : le sous-echantillonnage de chrominance ferait
 *  baver les aplats violets sur la peau, exactement la ou ces illustrations
 *  sont le plus fragiles. */
const WEBP = { quality: 95, alphaQuality: 100, effort: 6, smartSubsample: false };

async function ecrire(buf, dest) {
  const sortie = await sharp(buf).webp(WEBP).toBuffer();
  if (!CHECK) await writeFile(dest, sortie);
  return { buf: sortie, reglage: "quality 95, alphaQuality 100, effort 6, smartSubsample false" };
}

const ko = (n) => (n / 1024).toFixed(0) + " Ko";

await mkdir(OUT, { recursive: true });

for (const nom of ["nora", "sasha"]) {
  const m = await master(nom);
  const destM = path.join(OUT, `${nom}-master-v1.webp`);
  const rM = await ecrire(m.buf, destM);
  const poidsSrcM = (await stat(m.src)).size;
  console.log(`${nom} master  ${m.w} x ${m.h}  ratio ${(m.w / m.h).toFixed(4)}`);
  console.log(`  crane   y ${m.boite.top} (${(100 * m.boite.top / m.h).toFixed(1)} %) -> y ${m.vise} (${(100 * LIGNE_TETE).toFixed(1)} %)   translation ${m.dy >= 0 ? "+" : ""}${m.dy} px`);
  console.log(`  poids   PNG ${ko(poidsSrcM)} -> WebP ${ko(rM.buf.length)}   [${rM.reglage}]`);

  const c = await chat(nom);
  const destC = path.join(OUT, `${nom}-chat-v1.webp`);
  const rC = await ecrire(c.buf, destC);
  const poidsSrcC = (await stat(c.src)).size;
  console.log(`${nom} chat    ${c.boite.w} x ${c.boite.h} -> ${COTE_CHAT} x ${COTE_CHAT}   zoom ${c.zoom.toFixed(3)}`);
  console.log(`  poids   PNG ${ko(poidsSrcC)} -> WebP ${ko(rC.buf.length)}   [${rC.reglage}]`);
  console.log("");
}

if (CHECK) console.log("--check : rien n'a ete ecrit.");
