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
      Or la gemme s'affiche a cote d'un pseudo, dans une ligne de conversation,
      sur un profil : en mode sombre, ce fond devient un carre creme derriere
      chaque badge, sur les douze surfaces d'un coup. On detoure donc le
      FICHIER, jamais l'affichage : un blend-mode ou un mask CSS ne saurait pas
      ou s'arreter et casserait ailleurs.

   2. PAS LA MEME ECHELLE. La gemme occupe 74 % de la hauteur pour le Bronze et
      96 % pour l'Eternel. Affichees a une hauteur commune, les six sauteraient
      de taille le long de l'echelle. On ramene donc les six a la MEME hauteur
      de dessin.

   3. 44 % DE LARGEUR UTILE. Le reste est du vide. A 18 px dans une ligne de
      conversation, il restait environ 8 px de gemme reelle : illisible.

   C'est la demarche de `normalize-guides.mjs` et de `build-portraits.mjs` : le
   fichier se conforme a un contrat, le CSS n'a qu'une seule regle, et le
   dessin lui-meme n'est JAMAIS retouche.

   ==========================================================================
   -- LE DETOURAGE : CE QUI A ETE COMPRIS LE 2026-08-20 ---------------------
   ==========================================================================

   /!\ LE FAIT CENTRAL, MESURE, QUI COMMANDE TOUT LE RESTE :
   DES MORCEAUX DU DESSIN ONT EXACTEMENT LA COULEUR DU FOND.

   Releve sur une ligne de l'Eternel (fond a 250,244,241) :
       un reflet d'aile ...... 255,252,251   -> PLUS CLAIR que le fond
       un filigrane dore ..... 252,245,224   -> a 17 du fond

   Consequence : AUCUNE regle « ce pixel ressemble au creme donc il degage »
   ne peut fonctionner, a aucun seuil. Trop stricte, il reste des taches ; trop
   large, elle perce le dessin. Deux versions successives s'y sont cassees et
   toutes deux ont ete signalees par Louis :

     - v1, seuil large + rampe de frange etalee : les filigranes de l'Eternel
       et les pointes de cristal du Bronze et de l'Or partaient en lambeaux.
     - v2, resserrement + detection de « poches plates » a l'interieur : les
       facettes pales du sommet du cristal, plates et claires, ont ete prises
       pour du fond et SUPPRIMEES. Invisible sur fond blanc, trou beant sur
       fond noir. C'est le « ca mange de la matiere » du 2026-08-20.

   Les heuristiques de forme (planeite, teinte, taille de composante) sont
   donc ABANDONNEES. Ne pas les reintroduire : elles jugent le dessin, et le
   dessin a le droit d'etre plat, clair et creme.

   -- LA REGLE QUI MARCHE : GEOMETRIQUE, PAS CHROMATIQUE ---------------------
   Un pixel est du fond s'il est RELIE AU BORD DE L'IMAGE par un chemin de
   fond. Point. La couleur ne sert qu'a decider si on peut TRAVERSER un pixel,
   jamais a decider si un pixel isole est du dessin.

   Un reflet creme au milieu d'une aile n'est relie a rien : il est garde,
   quelle que soit sa couleur. Une facette pale au sommet du cristal est
   enfermee par le trait du contour : gardee. Les fentes entre les ailes, elles,
   sont ouvertes vers le haut : atteintes, donc retirees, ce qui est voulu.

   -- CE QUI RENDAIT LES FENTES INATTEIGNABLES : L'OMBRE PORTEE --------------
   Le creme y est ombre. Un test « ecart au creme » l'arrete net au seuil de la
   fente, d'ou les taches claires. La correction n'est pas d'elargir le seuil
   (c'est ce qui perce le Platine) mais de reconnaitre ce qu'est une ombre :
   du fond MULTIPLIE par un facteur. Sa CHROMATICITE ne bouge pas.

   On teste donc : existe-t-il k tel que pixel ~ k x fond ? Si oui, c'est du
   fond, eclaire ou ombre. Sinon c'est du dessin, clair ou sombre.
   C'est ce que font `traversable` et TOL_CHROMA ci-dessous.

   -- POURQUOI LE SEUIL EST A 4 ET PAS PLUS ---------------------------------
   Mesure sur les planches, residu chromatique moyen par anneau depuis le
   contour :

       Bronze   anneau 1 : 8,4    anneau 2 : 22,0   anneau 3+ : 31 a 47
       Platine  anneau 1 : 5,8    anneau 2 :  9,5   anneau 3+ : 10 a 11

   Le corps du Platine vit a 11 de residu. Toute tolerance a 6 ou plus le
   classe comme fond et le devore : verifie a l'oeil, ses ailes deviennent
   noires. 4 est donc un plafond impose par la planche la plus pale, pas un
   reglage de confort. Si une future planche est encore plus proche du fond,
   c'est la PLANCHE qu'il faut refaire, avec un fond franchement colore.

   -- ET LE HALO ? IL FAIT UN PIXEL -----------------------------------------
   Le meme releve dit que la transition tient dans l'anneau 1 : au deuxieme
   anneau on est deja dans la matiere. Il n'y a donc aucune « frange » de
   plusieurs pixels a raboter, et c'est precisement ce rabotage qui abimait le
   dessin en v1. L'anneau 1, lui, est un vrai melange fond + dessin : il recoit
   un alpha PROPORTIONNEL, calcule contre la couleur du dessin voisin, pas
   contre une rampe arbitraire. Un pixel a mi-chemin recoit 50 %, et un pixel
   pose sur un trait pale n'est pas plus entame qu'un autre.

   -- COMMENT CONTROLER UNE FUTURE PLANCHE ----------------------------------
   /!\ Le mauvais controle, celui qui a laisse passer les deux bugs : compter
   les « pixels franchement colores entames ». Il repond toujours zero, parce
   que ni le blanc du Platine ni une dorure pale ne sont franchement colores.

   Le bon controle, c'est de RENDRE LES SIX SUR FOND NOIR et de les regarder.
   Sur fond blanc les deux bugs etaient invisibles : un trou dans une facette
   pale ne se voit que quand il y a du noir derriere. Le journal donne bien une
   mesure du creme restant, mais il ne peut pas servir d'alarme : les gemmes
   pales SONT cremes sur des dizaines de milliers de pixels, un seuil accuserait
   donc le Platine et le Diamant a chaque construction. C'est un reperage entre
   deux versions d'une meme planche, pas un feu rouge.

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

/** Ecart chromatique maximal a « fond x k » pour traverser un pixel.
 *
 *  /!\ 4, ET NE PAS L'AUGMENTER. Le corps du Platine vit a 11 de residu : a 6
 *  ses ailes deviennent noires, a 12 l'Argent y passe aussi. Cf. l'en-tete. */
const TOL_CHROMA = 4;
/** Bornes du facteur d'eclairement admis pour du fond. Sous K_MIN c'est trop
 *  sombre pour etre l'ombre portee, donc c'est du dessin ; au dessus de K_MAX
 *  c'est plus clair que le fond lui-meme, donc du bruit de compression. */
const K_MIN = 0.5;
const K_MAX = 1.06;

/** En deca, le dessin voisin est trop proche du fond pour servir de reference
 *  au calcul d'alpha de l'anneau 1 : on garde le pixel opaque plutot que de
 *  diviser par presque rien. Prudence volontaire, elle ne peut que CONSERVER. */
const REF_MIN = 20;

/** Largeur de passage minimale du remplissage, en rayon (le passage fait donc
 *  2 x PASSAGE + 1 pixels).
 *
 *  A quoi ca sert : meme a TOL_CHROMA = 4, le contour du Platine a un endroit
 *  ou il palit assez pour laisser un filet de pixels traversables. Le
 *  remplissage s'y faufile et vide toute l'aile droite derriere. Sur fond
 *  blanc ca ne se voit pas du tout ; sur fond noir l'aile a disparu.
 *
 *  Baisser encore TOL_CHROMA ne reglerait rien, parce que le filet est un
 *  vrai degrade continu du fond vers le dessin : il existe a n'importe quel
 *  seuil. La bonne grandeur n'est pas la couleur, c'est la LARGEUR. Un fond
 *  reel est large (les fentes entre les ailes font des dizaines de pixels sur
 *  une planche de 1254) ; une fuite est un filet.
 *
 *  On erode donc la zone traversable, on remplit, puis on redilate en restant
 *  dans la zone traversable : tout ce qui est plus etroit que le passage est
 *  coupe, et rien d'autre ne change.
 *
 *  -- CE QUE CA COUTE, ET POURQUOI ON L'ACCEPTE ---------------------------
 *  Le couloir entre le cristal et l'aile, chez le Bronze et chez l'Or, est
 *  pince a un ou deux pixels a mi-hauteur. Il est donc coupe lui aussi, et il
 *  reste une bande creme dans cet espace negatif : environ 25 x 107 px sur le
 *  canevas de 320 x 512, invisible a 18, 34 et 52 px, discernable a 116.
 *
 *  /!\ NE PAS CHERCHER A RECUPERER CETTE BANDE PAR UNE REGLE : c'est verifie,
 *  aucune ne separe les deux cas. Trois pistes ont ete mesurees puis jetees :
 *    - passer a 0 (aucune contrainte de largeur) : nettoie la bande, mais vide
 *      deux facettes de l'aile droite du Platine ;
 *    - hysteresis chromatique : le couloir du Bronze est a 2,4 de residu, les
 *      facettes du Platine a 3,0. Les distributions se recouvrent ;
 *    - franchir un pincement seulement vers du fond « franchement clair »
 *      (ecart <= 15) : le couloir du Bronze est a 9,1 d'ecart, les facettes du
 *      Platine a 5,1 a 8,0. Le Platine ET l'Eternel y ont perdu de la matiere.
 *
 *  La raison est dans les planches, pas dans le code : ces gemmes contiennent
 *  des zones que RIEN, localement ou regionalement, ne distingue du fond. Le
 *  vrai correctif est en amont, dans le fichier source : soit un PNG deja
 *  transparent, soit un fond franchement colore (un vert ou un bleu sature)
 *  au lieu d'un creme qui est aussi une couleur du dessin.
 *
 *  Le sens de l'echec est donc choisi : il reste du fond, on ne mange jamais
 *  de dessin. Un reste se voit tout de suite et ne detruit rien ; un trou dans
 *  une facette pale est invisible sur fond blanc et a echappe deux fois. */
const PASSAGE = 1;


const check = process.argv.includes("--check");

/** Ecart maximal par canal entre un pixel et une couleur. */
function ecart(r, g, b, c) {
  return Math.max(Math.abs(r - c[0]), Math.abs(g - c[1]), Math.abs(b - c[2]));
}

/** Min ou max d'un masque binaire sur un carre de rayon r, en deux passes
 *  separables (lignes puis colonnes). `mode` vaut 0 pour l'erosion, 1 pour la
 *  dilatation. Les bords sont traites comme du fond : l'erosion ne doit pas
 *  effacer la marge par laquelle le remplissage demarre. */
function morpho(src, W, H, r, mode) {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  const passe = (entree, sortie, horizontal) => {
    const NA = horizontal ? W : H;
    const NB = horizontal ? H : W;
    for (let b = 0; b < NB; b++) {
      for (let a = 0; a < NA; a++) {
        let v = mode === 0 ? 1 : 0;
        for (let d = -r; d <= r; d++) {
          const na = a + d;
          const p = na < 0 || na >= NA ? 1 : entree[horizontal ? b * W + na : na * W + b];
          if (mode === 0) { if (!p) { v = 0; break; } }
          else if (p) { v = 1; break; }
        }
        sortie[horizontal ? b * W + a : a * W + b] = v;
      }
    }
  };
  passe(src, tmp, true);
  passe(tmp, out, false);
  return out;
}

/** Detoure une planche. Rend le RGBA modifie, la boite du dessin et un journal. */
async function detourer(fichier) {
  const { data: rgb, info } = await sharp(fichier)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
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
  const lumFond = 0.299 * fond[0] + 0.587 * fond[1] + 0.114 * fond[2];

  // -- Etape 1 : quels pixels sont TRAVERSABLES.
  // Un pixel est du fond s'il est le fond multiplie par un facteur : meme
  // chromaticite, luminance libre dans [K_MIN, K_MAX]. C'est ce qui laisse
  // passer l'ombre portee, qui bloquait l'entree des fentes entre les ailes.
  const traversable = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const k = (0.299 * r + 0.587 * g + 0.114 * b) / lumFond;
    if (k < K_MIN || k > K_MAX) continue;
    if (ecart(r, g, b, [k * fond[0], k * fond[1], k * fond[2]]) <= TOL_CHROMA) traversable[i] = 1;
  }

  // -- Etape 2 : le remplissage depuis les bords. SEULE source de verite.
  // Ce qui n'est pas atteint est garde, quelle que soit sa couleur : c'est ce
  // qui protege les reflets cremes et les facettes pales du cristal.
  // On remplit sur la version ERODEE du traversable (les filets plus etroits
  // que le passage sont coupes), puis on redilate en restant dans le
  // traversable : le fond retrouve exactement son bord, sans la fuite.
  const large = morpho(traversable, W, H, PASSAGE, 0);
  const noyau = new Uint8Array(N);
  const pile = [];
  const pousser = (x, y) => {
    const i = y * W + x;
    if (!noyau[i] && large[i]) { noyau[i] = 1; pile.push(i); }
  };
  for (let x = 0; x < W; x++) { pousser(x, 0); pousser(x, H - 1); }
  for (let y = 0; y < H; y++) { pousser(0, y); pousser(W - 1, y); }
  while (pile.length) {
    const i = pile.pop();
    const x = i % W, y = (i / W) | 0;
    if (x > 0) pousser(x - 1, y);
    if (x < W - 1) pousser(x + 1, y);
    if (y > 0) pousser(x, y - 1);
    if (y < H - 1) pousser(x, y + 1);
  }
  const etale = morpho(noyau, W, H, PASSAGE, 1);
  const dehors = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (etale[i] && traversable[i]) dehors[i] = 1;

  // -- Etape 3 : l'anneau 1 recoit un alpha proportionnel.
  // p = a x dessin + (1 - a) x fond, donc a vaut la distance de p au fond
  // rapportee a celle du dessin voisin. Reference = le pixel garde le plus
  // eloigne du fond dans le voisinage 5x5, hors anneau 1 lui-meme.
  const alpha = new Uint8Array(N);
  for (let i = 0; i < N; i++) alpha[i] = dehors[i] ? 0 : 255;

  const anneau = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (dehors[i]) continue;
      if (
        (x > 0 && dehors[i - 1]) || (x < W - 1 && dehors[i + 1]) ||
        (y > 0 && dehors[i - W]) || (y < H - 1 && dehors[i + W])
      ) anneau.push(i);
    }
  }
  const estAnneau = new Uint8Array(N);
  for (const i of anneau) estAnneau[i] = 1;

  let adoucis = 0;
  for (const i of anneau) {
    const x = i % W, y = (i / W) | 0;
    let ref = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= H) continue;
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= W) continue;
        const j = ny * W + nx;
        if (dehors[j] || estAnneau[j]) continue;
        const d = ecart(rgb[j * 3], rgb[j * 3 + 1], rgb[j * 3 + 2], fond);
        if (d > ref) ref = d;
      }
    }
    if (ref < REF_MIN) continue; // dessin trop pale ici : on garde opaque.
    const d = ecart(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], fond);
    const a = Math.round((255 * Math.min(d, ref)) / ref);
    if (a < 255) { alpha[i] = a; adoucis++; }
  }

  // -- Sortie RGBA + boite du dessin.
  const out = Buffer.alloc(N * 4);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0; i < N; i++) {
    out[i * 4] = rgb[i * 3];
    out[i * 4 + 1] = rgb[i * 3 + 1];
    out[i * 4 + 2] = rgb[i * 3 + 2];
    out[i * 4 + 3] = alpha[i];
    if (alpha[i] > 8) {
      const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  // -- Controle : reste-t-il une TACHE de fond dans un espace negatif ?
  //
  // On cherche la plus grande zone connexe de pixels GARDES qui ont la couleur
  // du fond ET qui TOUCHENT le fond retire. Les deux conditions comptent : les
  // gemmes pales (Platine, Diamant) sont cremes sur des dizaines de milliers de
  // pixels, donc la couleur seule accuserait tout le monde et le garde-fou ne
  // dirait plus rien. Un reste de fente, lui, est par construction accroche au
  // fond qui l'entoure ; un reflet au milieu d'une aile ne l'est pas.
  //
  // On ne retire rien ici : on SIGNALE. Retirer sur ce critere reviendrait a
  // la regle des poches, celle qui a supprime le sommet du cristal.
  const creme = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (alpha[i] < 250) continue;
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const k = (0.299 * r + 0.587 * g + 0.114 * b) / lumFond;
    if (k < 0.82 || k > K_MAX) continue;
    if (ecart(r, g, b, [k * fond[0], k * fond[1], k * fond[2]]) <= 6) creme[i] = 1;
  }
  let plusGrandeCreme = 0;
  const vue = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (!creme[s] || vue[s]) continue;
    let taille = 0;
    let touche = false;
    const f = [s];
    vue[s] = 1;
    while (f.length) {
      const i = f.pop();
      taille++;
      const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0) continue;
        if (dehors[j]) touche = true;
        if (creme[j] && !vue[j]) { vue[j] = 1; f.push(j); }
      }
    }
    if (touche && taille > plusGrandeCreme) plusGrandeCreme = taille;
  }

  let retires = 0;
  for (let i = 0; i < N; i++) if (dehors[i]) retires++;

  return {
    data: out,
    W,
    H,
    boite: { x0, y0, largeur: x1 - x0 + 1, hauteur: y1 - y0 + 1 },
    journal: { fond, retires, adoucis, plusGrandeCreme },
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
    const { data, W, H, boite, journal } = await detourer(path.join(SRC, nom));

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
      .resize(largeurFinale, HAUTEUR_DESSIN, { fit: "fill" })
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
      "    fond " + journal.fond.join(",") +
        "   retire " + journal.retires + " px" +
        "   anneau adouci " + journal.adoucis + " px" +
        "   creme au contact du fond, plus grande zone " + journal.plusGrandeCreme + " px"
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
