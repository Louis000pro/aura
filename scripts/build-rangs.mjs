#!/usr/bin/env node
/* ============================================================================
   Les gemmes des six rangs : detourage, mise a l'echelle commune, ecriture.

   Entree  : rangs-src/rank-0N-<id>.png   (les originaux, jamais modifies,
                                           jamais commites, cf. .gitignore)
   Sortie  : public/rangs/rank-0N-<id>.png

   Usage :
     npm run rangs             ecrit les PNG
     npm run rangs -- --check  mesure et compare, sans rien ecrire

   -- POURQUOI UN SCRIPT PLUTOT QU'UN COPIER-COLLER -------------------------
   Les six planches livrees le 2026-08-20 arrivent en 1254 x 1254, et elles
   posent trois problemes qu'aucune feuille de style ne peut rattraper :

   1. AUCUNE TRANSPARENCE. Les six sont opaques, fond creme cuit dans l'image.
      En mode sombre, ce fond deviendrait un carre creme derriere chaque badge,
      sur les douze surfaces d'un coup. On detoure donc le FICHIER, jamais
      l'affichage.

   2. PAS LA MEME ECHELLE. La gemme occupe 74 % de la hauteur pour le Bronze et
      96 % pour l'Eternel. On ramene les six a la MEME hauteur de dessin.

   3. 44 % DE LARGEUR UTILE. Le reste est du vide. A 18 px dans une ligne de
      conversation, il restait environ 8 px de gemme reelle.

   ==========================================================================
   -- LE DETOURAGE, VERSION 3 (2026-10-24) ----------------------------------
   ==========================================================================

   /!\ LA VERSION 2 LAISSAIT TROIS DEFAUTS, VUS PAR LOUIS SUR FOND SOMBRE :

     - un HALO BLANC DENTELE autour du Diamant et de l'Eternel. Leurs planches
       portent une lueur blanche autour de l'embleme, PLUS CLAIRE que le fond
       creme. La v2 n'acceptait comme fond que du creme eventuellement
       assombri (facteur <= 1,06) : la lueur etait donc classee « dessin » et
       gardee, opaque, sur une vingtaine de pixels ;
     - un LISERE CREME le long des bords du Bronze, de l'Argent et de l'Or, et
       des taches sous les mains. C'est l'ombre portee : pres du bord elle est
       raide et teintee de chaud (residu chromatique jusqu'a 31), donc ni
       « creme », ni « creme assombri » ;
     - du CREME DANS LES CREUX entre le cristal et les ailes du Bronze et de
       l'Or : le couloir est pince a un ou deux pixels, la v2 le fermait.

   -- LA REGLE QUI MARCHE : LE FOND EST LISSE, LE DESSIN A UN BORD ------------
   La couleur ne separe pas le fond du dessin (des morceaux du dessin ont
   exactement la couleur du fond, cf. plus bas). Le RELIEF, si : le fond, la
   lueur et l'ombre portee sont des degrades doux, alors que l'embleme est
   cerne d'un trait net. Mesure au filtre de Sobel, sur la planche adoucie
   (flou de rayon 1), en niveaux par pixel :

       fond creme ................... 0 a 2
       lueur du Diamant, de l'Eternel  1 a 6
       ombre portee, gemmes pales .... 3 a 6
       ombre portee, gemmes metal .... 6 a 14   (raide pres du bord)
       trait du contour, gemmes pales  14 a 37  (le plus pale : la main droite
                                                 du Diamant, 14,5)
       trait du contour, gemmes metal  55 a 84

   Un pixel est donc du FOND s'il est relie au bord de l'image par un chemin
   de pixels lisses (gradient sous le seuil). Le remplissage traverse le
   creme, la lueur et l'ombre, et s'arrete sur le trait. Tout ce qu'il
   n'atteint pas est garde, quelle que soit sa couleur : les facettes pales
   et cremes A L'INTERIEUR du trait restent intactes, c'est ce qui protege le
   Platine et le Diamant.

   -- POURQUOI UN SEUIL PAR PLANCHE ------------------------------------------
   Les deux familles ne se chevauchent pas, mais elles ne se rangent pas sous
   un seul seuil : l'ombre raide des gemmes metal (jusqu'a 14) depasse le
   trait le plus pale des gemmes pales (14,5).
     - 18 pour le Bronze, l'Argent et l'Or : l'ombre passe, le trait (55 et
       plus) arrete tout.
     - 8 pour le Platine, le Diamant et l'Eternel : la lueur et l'ombre
       passent, le trait arrete. Verifie : a 11, le cadre du cristal de
       l'Eternel est deja entame.
   Une planche inconnue prend 8 : au pire il reste un peu d'ombre, jamais un
   trou dans le dessin.

   -- LES GARDE-FOUS --------------------------------------------------------
   - PASSAGE : on remplit sur la zone lisse ERODEE de 2 px, puis on redilate
     dans la zone lisse. Un filet de moins de 5 px de large (une fuite par un
     trait qui palit) est coupe ; un vrai fond, large, passe.
   - Rien de tres colore ne se traverse (ecart au fond >= 165), meme lisse.
   - Les ILOTS : apres le remplissage, toute piece detachee de moins de 0,5 %
     de l'embleme est retiree (des miettes d'ombre sous les mains).
   - Le BORD est adouci (un flou 3 x 3 seuille a la moitie, deux fois), puis
     DEMELE : ses deux derniers pixels melangent le trait et le creme, et sur
     fond noir ils dessinaient un fil clair. Chacun recoit un alpha partiel
     et la couleur du dessin seul, calcules contre le fond retire tout pres
     et l'interieur proche (p = a x dessin + (1 - a) x fond). Quand les deux
     se ressemblent trop, le pixel reste opaque.
   - Les COULEURS sont etalees sous les pixels transparents voisins du bord :
     la reduction a 320 x 512 ne peut pas y aller chercher du creme.
   - L'anticrenelage vient de la reduction elle-meme : la planche fait
     1254 px, le dessin final 492, chaque pixel final couvre environ six
     pixels sources.

   -- CE QUE LA V2 AVAIT APPRIS, ET QUI RESTE VRAI ---------------------------
   Des morceaux du dessin ont exactement la couleur du fond (un reflet d'aile
   de l'Eternel est meme plus clair que lui). Aucune regle « ce pixel
   ressemble au creme donc il degage » ne peut fonctionner, et les heuristiques
   de forme (facettes plates, petites poches) ont mange le sommet du cristal
   du Platine en 2026-08. Ne pas les reintroduire.

   -- COMMENT CONTROLER -----------------------------------------------------
   RENDRE LES SIX SUR FOND NOIR et les regarder de pres, bords et creux
   compris. Sur fond blanc, un halo blanc ou un trou dans une facette pale ne
   se voient pas : c'est exactement ce qui est passe deux fois. Le journal
   donne le nombre de pixels retires et d'ilots supprimes, pour comparer deux
   versions d'une meme planche.

   Pour une future planche : demander un PNG deja transparent, ou un fond
   franchement colore (vert ou bleu sature). C'est la planche qui rend le
   detourage difficile, pas le script.

   -- LE CANEVAS ------------------------------------------------------------
   Les six sortent en 320 x 512, dessin de 492 px de haut, centre. Les trois
   tailles d'affichage se posent sur le meme cadre, et `GemmeRang` n'a qu'un
   seul ratio a connaitre (RATIO_GEMME). Le script REFUSE si un dessin depasse
   le canevas, plutot que de le rogner en silence.
   ========================================================================== */

import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = "rangs-src";
const OUT = path.join("public", "rangs");

/** Le canevas commun. Le changer ici oblige a changer RATIO_GEMME dans
 *  src/components/GemmeRang.tsx (largeur / hauteur). */
const CANEVAS = { largeur: 320, hauteur: 512 };
/** Hauteur du dessin dans le canevas. Le reste est de l'air, en haut et en bas. */
const HAUTEUR_DESSIN = 492;

/** Gradient (niveaux par pixel) sous lequel un pixel est « lisse », donc
 *  traversable par le fond. Un par planche : voir l'en-tete pour les mesures.
 *  /!\ Ne pas monter celui des gemmes pales : a 11, l'Eternel perd le cadre
 *  de son cristal. */
const SEUIL_BORD = {
  "rank-01-bronze.png": 18,
  "rank-02-argent.png": 18,
  "rank-03-or.png": 18,
  "rank-04-platine.png": 8,
  "rank-05-diamant.png": 8,
  "rank-06-eternel.png": 8,
};
const SEUIL_PAR_DEFAUT = 8;
/** Ecart au fond au-dela duquel rien ne se traverse, meme lisse. L'ombre la
 *  plus foncee, juste sous la pointe du cristal du Bronze, est a 148 : a 130,
 *  elle restait en poche creme entre les deux mains. Le corps d'une gemme
 *  metal (180 et plus) reste infranchissable. */
const ECART_MAX = 165;
/** Rayon de l'erosion du remplissage : un passage de moins de 2 x 2 + 1 px
 *  de large est coupe. */
const PASSAGE = 2;
/** Une piece detachee plus petite que cette part de l'embleme est retiree. */
const ILOT_MAX = 0.005;
/** Rayon d'etalement des couleurs sous le bord transparent. */
const ETALEMENT = 4;
/** Ecart minimal entre le dessin et le fond voisins pour demeler un pixel du
 *  bord. En dessous, les deux se ressemblent trop : le pixel reste opaque. */
const ECART_DEMELAGE = 40;

const check = process.argv.includes("--check");

/** Erosion (dil = false) ou dilatation (dil = true) d'un masque binaire sur un
 *  carre de rayon r, en deux passes separables. Hors image : fond pour la
 *  dilatation, plein pour l'erosion (le remplissage demarre au bord). */
function morpho(src, W, H, r, dil) {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  const passe = (entree, sortie, horizontal) => {
    const NA = horizontal ? W : H;
    const NB = horizontal ? H : W;
    for (let b = 0; b < NB; b++) {
      for (let a = 0; a < NA; a++) {
        let v = dil ? 0 : 1;
        for (let d = -r; d <= r; d++) {
          const na = a + d;
          const p = na < 0 || na >= NA ? (dil ? 0 : 1) : entree[horizontal ? b * W + na : na * W + b];
          if (dil) { if (p) { v = 1; break; } } else if (!p) { v = 0; break; }
        }
        sortie[horizontal ? b * W + a : a * W + b] = v;
      }
    }
  };
  passe(src, tmp, true);
  passe(tmp, out, false);
  return out;
}

/** Remplissage en 4-connexite depuis `graines`, dans les pixels ou `ok` vaut 1. */
function remplir(graines, ok, W, H) {
  const vu = new Uint8Array(W * H);
  const pile = [];
  for (const s of graines) if (ok[s] && !vu[s]) { vu[s] = 1; pile.push(s); }
  while (pile.length) {
    const i = pile.pop();
    const x = i % W;
    if (x > 0 && ok[i - 1] && !vu[i - 1]) { vu[i - 1] = 1; pile.push(i - 1); }
    if (x < W - 1 && ok[i + 1] && !vu[i + 1]) { vu[i + 1] = 1; pile.push(i + 1); }
    if (i >= W && ok[i - W] && !vu[i - W]) { vu[i - W] = 1; pile.push(i - W); }
    if (i < W * (H - 1) && ok[i + W] && !vu[i + W]) { vu[i + W] = 1; pile.push(i + W); }
  }
  return vu;
}

/** Flou 3 x 3 d'un masque binaire puis seuil a la moitie : arrondit les
 *  marches d'un pixel sans deplacer le bord. */
function adoucir(masque, W, H) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= W) continue;
          s += masque[ny * W + nx]; n++;
        }
      }
      out[y * W + x] = s * 2 >= n ? 1 : 0;
    }
  }
  return out;
}

/** Detoure une planche. Rend le RGBA, la boite du dessin et un journal. */
async function detourer(fichier, seuil) {
  const { data: rgb, info } = await sharp(fichier).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: lisse } = await sharp(fichier).removeAlpha().blur(1).raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const N = W * H;

  // -- La couleur du fond : mediane des pixels de bord (robuste au grain).
  const ech = [[], [], []];
  const note = (x, y) => {
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) ech[c].push(rgb[i + c]);
  };
  for (let x = 0; x < W; x += 3) { note(x, 0); note(x, 1); note(x, H - 2); note(x, H - 1); }
  for (let y = 0; y < H; y += 3) { note(0, y); note(1, y); note(W - 2, y); note(W - 1, y); }
  const fond = ech.map((a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; });

  // -- Etape 1 : les pixels LISSES, donc traversables par le fond.
  // Gradient de Sobel par canal sur la planche adoucie, le plus fort des trois.
  const traversable = new Uint8Array(N);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const ecart = Math.max(
        Math.abs(rgb[i * 3] - fond[0]), Math.abs(rgb[i * 3 + 1] - fond[1]), Math.abs(rgb[i * 3 + 2] - fond[2])
      );
      if (ecart >= ECART_MAX) continue;
      let g = 0;
      for (let c = 0; c < 3; c++) {
        const v = (dx, dy) => lisse[((y + dy) * W + (x + dx)) * 3 + c];
        const gx = (v(1, -1) + 2 * v(1, 0) + v(1, 1)) - (v(-1, -1) + 2 * v(-1, 0) + v(-1, 1));
        const gy = (v(-1, 1) + 2 * v(0, 1) + v(1, 1)) - (v(-1, -1) + 2 * v(0, -1) + v(1, -1));
        const m = Math.sqrt(gx * gx + gy * gy) / 4;
        if (m > g) g = m;
      }
      if (g < seuil) traversable[i] = 1;
    }
  }
  // La premiere et la derniere ligne/colonne n'ont pas de voisins pour le
  // gradient : elles sont du fond par construction (la planche a de la marge).
  for (let x = 0; x < W; x++) { traversable[x] = 1; traversable[(H - 1) * W + x] = 1; }
  for (let y = 0; y < H; y++) { traversable[y * W] = 1; traversable[y * W + W - 1] = 1; }

  // -- Etape 2 : le remplissage depuis les bords, sur la zone lisse erodee,
  // puis redilate dans la zone lisse. SEULE source de verite pour le fond.
  const large = morpho(traversable, W, H, PASSAGE, false);
  const bord = [];
  for (let x = 0; x < W; x++) bord.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) bord.push(y * W, y * W + W - 1);
  const noyau = remplir(bord, large, W, H);
  const etale = morpho(noyau, W, H, PASSAGE, true);
  let masque = new Uint8Array(N);
  let retires = 0;
  for (let i = 0; i < N; i++) {
    if (etale[i] && traversable[i]) retires++;
    else masque[i] = 1;
  }

  // -- Etape 3 : les ilots. On etiquette les pieces du masque et on retire
  // celles qui pesent moins de ILOT_MAX de la plus grosse (l'embleme).
  const etiquette = new Int32Array(N).fill(-1);
  const tailles = [];
  for (let s = 0; s < N; s++) {
    if (!masque[s] || etiquette[s] >= 0) continue;
    const id = tailles.length;
    let n = 0;
    const pile = [s];
    etiquette[s] = id;
    while (pile.length) {
      const i = pile.pop();
      n++;
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < W * (H - 1) ? i + W : -1]) {
        if (j >= 0 && masque[j] && etiquette[j] < 0) { etiquette[j] = id; pile.push(j); }
      }
    }
    tailles.push(n);
  }
  const plusGrosse = Math.max(...tailles);
  let ilots = 0;
  for (let i = 0; i < N; i++) {
    if (masque[i] && tailles[etiquette[i]] < plusGrosse * ILOT_MAX) masque[i] = 0;
  }
  for (const t of tailles) if (t < plusGrosse * ILOT_MAX) ilots++;

  // -- Etape 4 : le bord. Adouci deux fois, puis DEMELE.
  // Les deux derniers pixels du contour melangent le dessin et ce qu'il y a
  // juste derriere (creme, ombre, lueur). Gardes tels quels, ils dessinent un
  // fil clair sur fond noir. Chacun recoit donc un alpha partiel et la
  // couleur du dessin seul : p = a x dessin + (1 - a) x fond, avec « fond »
  // = la moyenne du fond retire tout pres, et « dessin » = la moyenne de
  // l'interieur proche. Si les deux se ressemblent trop (le bord blanc d'une
  // gemme pale contre une lueur blanche), on ne peut rien decider : le pixel
  // reste opaque, c'est le sens d'echec choisi depuis la v1.
  masque = adoucir(adoucir(masque, W, H), W, H);
  const interieur = morpho(masque, W, H, 3, false);
  const coeur2 = morpho(masque, W, H, 2, false);
  const alpha = new Float32Array(N);
  const couleur = Float32Array.from(rgb);
  let demeles = 0;
  for (let i = 0; i < N; i++) alpha[i] = masque[i];
  for (let y = 4; y < H - 4; y++) {
    for (let x = 4; x < W - 4; x++) {
      const i = y * W + x;
      if (!masque[i] || coeur2[i]) continue;
      let fr = 0, fg = 0, fb = 0, fn = 0, dr = 0, dg = 0, db = 0, dn = 0;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const j = i + dy * W + dx;
          if (interieur[j]) { dr += rgb[j * 3]; dg += rgb[j * 3 + 1]; db += rgb[j * 3 + 2]; dn++; }
          else if (!masque[j] && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) { fr += rgb[j * 3]; fg += rgb[j * 3 + 1]; fb += rgb[j * 3 + 2]; fn++; }
        }
      }
      if (!fn || !dn) continue;
      fr /= fn; fg /= fn; fb /= fn; dr /= dn; dg /= dn; db /= dn;
      const vr = dr - fr, vg = dg - fg, vb = db - fb;
      const l2 = vr * vr + vg * vg + vb * vb;
      if (l2 < ECART_DEMELAGE * ECART_DEMELAGE) continue;
      const a = Math.max(0, Math.min(1, ((rgb[i * 3] - fr) * vr + (rgb[i * 3 + 1] - fg) * vg + (rgb[i * 3 + 2] - fb) * vb) / l2));
      if (a >= 0.98) continue;
      alpha[i] = a;
      demeles++;
      if (a > 0.05) {
        couleur[i * 3] = Math.max(0, Math.min(255, (rgb[i * 3] - (1 - a) * fr) / a));
        couleur[i * 3 + 1] = Math.max(0, Math.min(255, (rgb[i * 3 + 1] - (1 - a) * fg) / a));
        couleur[i * 3 + 2] = Math.max(0, Math.min(255, (rgb[i * 3 + 2] - (1 - a) * fb) / a));
      }
    }
  }

  // -- Etape 5 : les couleurs etalees sous le bord transparent.
  let connu = new Uint8Array(N);
  for (let i = 0; i < N; i++) connu[i] = alpha[i] > 0.05 ? 1 : 0;
  for (let tour = 0; tour < ETALEMENT; tour++) {
    const suivant = Uint8Array.from(connu);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (connu[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const j = i + dy * W + dx;
            if (!connu[j]) continue;
            r += couleur[j * 3]; g += couleur[j * 3 + 1]; b += couleur[j * 3 + 2]; n++;
          }
        }
        if (n) {
          couleur[i * 3] = r / n; couleur[i * 3 + 1] = g / n; couleur[i * 3 + 2] = b / n;
          suivant[i] = 1;
        }
      }
    }
    connu = suivant;
  }

  // -- Sortie RGBA + boite du dessin.
  const out = Buffer.alloc(N * 4);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0; i < N; i++) {
    out[i * 4] = Math.round(couleur[i * 3]);
    out[i * 4 + 1] = Math.round(couleur[i * 3 + 1]);
    out[i * 4 + 2] = Math.round(couleur[i * 3 + 2]);
    out[i * 4 + 3] = Math.round(alpha[i] * 255);
    if (masque[i]) {
      const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  return {
    data: out,
    W,
    H,
    boite: { x0, y0, largeur: x1 - x0 + 1, hauteur: y1 - y0 + 1 },
    journal: { fond, seuil, retires, ilots, demeles },
  };
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("Dossier " + SRC + "/ introuvable. Y deposer les planches rank-0N-<id>.png.");
    process.exit(1);
  }
  const planches = readdirSync(SRC)
    .filter((f) => /^rank-\d\d-[a-z]+\.png$/.test(f))
    .sort();
  if (planches.length === 0) {
    console.error("Aucune planche rank-0N-<id>.png dans " + SRC + "/.");
    process.exit(1);
  }
  if (!check) mkdirSync(OUT, { recursive: true });

  let refus = 0;
  for (const nom of planches) {
    const seuil = SEUIL_BORD[nom] ?? SEUIL_PAR_DEFAUT;
    const { data, W, H, boite, journal } = await detourer(path.join(SRC, nom), seuil);

    const echelle = HAUTEUR_DESSIN / boite.hauteur;
    const largeurFinale = Math.round(boite.largeur * echelle);
    if (largeurFinale > CANEVAS.largeur) {
      console.error(
        "REFUS " + nom + " : a " + HAUTEUR_DESSIN + " px de haut le dessin ferait " + largeurFinale +
          " px de large, le canevas en fait " + CANEVAS.largeur + ". Elargir CANEVAS plutot que rogner."
      );
      refus++;
      continue;
    }

    const dessin = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: boite.x0, top: boite.y0, width: boite.largeur, height: boite.hauteur })
      .resize(largeurFinale, HAUTEUR_DESSIN, { fit: "fill", kernel: "lanczos3" })
      .png()
      .toBuffer();

    const sortie = await sharp({
      create: {
        width: CANEVAS.largeur,
        height: CANEVAS.hauteur,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: dessin,
          left: Math.round((CANEVAS.largeur - largeurFinale) / 2),
          top: Math.round((CANEVAS.hauteur - HAUTEUR_DESSIN) / 2),
        },
      ])
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    const ko = (sortie.length / 1024).toFixed(0);
    console.log(
      nom.padEnd(22) + " source " + W + "x" + H + " -> dessin " + boite.largeur + "x" + boite.hauteur +
        " -> " + CANEVAS.largeur + "x" + CANEVAS.hauteur + " (dessin " + largeurFinale + " px de large, " + ko + " ko)"
    );
    console.log(
      "    fond " + journal.fond.join(",") + "   seuil " + journal.seuil +
        "   retire " + journal.retires + " px   ilots retires " + journal.ilots +
        "   bord demele " + journal.demeles + " px"
    );
    if (!check) await writeFile(path.join(OUT, nom), sortie);
  }

  if (refus) process.exit(1);
  console.log(check ? "\n--check : rien ecrit." : "\n" + planches.length + " gemmes ecrites dans " + OUT + "/.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
