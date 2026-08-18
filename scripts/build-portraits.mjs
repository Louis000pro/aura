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

/** ── LE BUSTE DU QUESTIONNAIRE ────────────────────────────────────────────
 *  La part de la HAUTEUR du buste occupee par la tete, du haut du crane a la
 *  base du cou. 52 %, mesure sur l'ancien cadrage CSS qui donnait 53 % : la
 *  stature ne change pas, seul le cadrage devient sur. */
const PART_TETE_H = 0.52;

/** La part de la LARGEUR du buste occupee par la tete. C'est cette contrainte
 *  qui a motive le fichier : les cheveux de Nora sont larges et son crane est
 *  peint 81 px a droite du centre de sa toile. Le CSS recadrait au centre du
 *  FICHIER, donc il lui coupait la meche droite. Ici la fenetre se centre sur
 *  la TETE mesuree, et 76 % laisse a la coiffure la plus large 12 % d'air de
 *  chaque cote. */
const PART_TETE_L = 0.76;

/** L'air au-dessus du crane, en part de la hauteur du buste. */
const AIR_TETE = 0.12;

/** Le buste est affiche au plus a 164 x 205 px CSS, soit 492 x 615 sur un
 *  ecran a DPR 3. Le ratio 4:5 est celui des trois tailles d'affichage. */
const LARGEUR_BUSTE = 512;
const HAUTEUR_BUSTE = 640;

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

/** Mesure la tete : du haut du crane a la base du cou.
 *
 *  Le cou n'est pas devine, il se lit dans le profil de largeur du dessin.
 *  En descendant depuis le crane, la largeur monte jusqu'aux cheveux les plus
 *  larges, redescend jusqu'au cou, puis remonte franchement aux epaules. La
 *  base du cou est ce creux. On exige une remontee SOUTENUE avant de le
 *  declarer, sinon un pixel de lissage suffirait a le placer trop haut. */
async function tete(buf, boite) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const bords = [];
  for (let y = 0; y < h; y++) {
    let min = -1, max = -1;
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * c + 3] <= SEUIL_ALPHA) continue;
      if (min < 0) min = x;
      max = x;
    }
    bords.push([min, max]);
  }
  const large = (y) => (bords[y][0] < 0 ? 0 : bords[y][1] - bords[y][0] + 1);

  // Le profil est lisse sur 5 lignes : une meche ou un lissage de bord ne
  // doit pas compter pour un sommet.
  const lisse = (y) => {
    let somme = 0, n = 0;
    for (let k = -2; k <= 2; k++) if (y + k >= 0 && y + k < h) { somme += large(y + k); n++; }
    return somme / n;
  };
  // La zone de recherche s'arrete au tiers de la toile : plus bas, c'est le
  // torse, et son creux de taille se ferait passer pour un cou.
  const fin = Math.round(0.40 * h);
  const TENUE = 12, JEU = 2;
  /** Le premier endroit ou la largeur cesse de varier dans le sens donne, et
   *  ne repart pas dans ce sens sur TENUE lignes. */
  const tournant = (depart, sens) => {
    for (let y = depart; y < fin; y++) {
      let tient = true;
      for (let k = 1; k <= TENUE && y + k < fin; k++) {
        if (sens * (lisse(y + k) - lisse(y)) > JEU) { tient = false; break; }
      }
      if (tient) return y;
    }
    return -1;
  };
  // Le sommet, c'est la coiffure la plus large.
  const sommet = tournant(boite.top, 1);
  if (sommet < 0) throw new Error("sommet du crane introuvable : la largeur ne cesse jamais de croitre");
  // Les epaules, c'est l'endroit ou le corps redevient aussi large que la
  // coiffure. Entre les deux, la ligne la plus etroite EST le cou : pas de
  // seuil a regler, pas de tolerance a deviner.
  // On ne cherche les epaules qu'une fois la coiffure nettement retrecie :
  // juste sous le sommet la largeur oscille encore, et le premier pixel
  // remonte se ferait passer pour une epaule.
  let retreci = fin;
  for (let y = sommet; y < fin; y++) if (lisse(y) <= 0.85 * lisse(sommet)) { retreci = y; break; }
  let epaules = fin;
  for (let y = retreci; y < fin; y++) if (lisse(y) >= lisse(sommet)) { epaules = y; break; }
  let cou = sommet;
  for (let y = sommet; y < epaules; y++) if (lisse(y) < lisse(cou)) cou = y;
  if (cou === sommet) throw new Error("base du cou introuvable : la largeur ne redescend jamais sous la coiffure");

  let gauche = w, droite = -1;
  for (let y = boite.top; y <= cou; y++) {
    if (bords[y][0] < 0) continue;
    if (bords[y][0] < gauche) gauche = bords[y][0];
    if (bords[y][1] > droite) droite = bords[y][1];
  }
  return { crane: boite.top, cou, gauche, droite, hauteur: cou - boite.top + 1, largeur: droite - gauche + 1 };
}

/** ── LE BUSTE ─────────────────────────────────────────────────────────────
 *  Le questionnaire montrait ce buste en recadrant le master DANS LE CSS :
 *  image dessinee a 235 % de sa fenetre et remontee de 2 %. Le cadrage etait
 *  donc centre sur le fichier, alors que les deux tetes n'y sont pas peintes
 *  au meme endroit, et il ne connaissait ni la taille ni la position d'une
 *  tete. Nora y perdait sa meche droite.
 *
 *  Le buste devient donc un fichier a lui, comme le carre de conversation :
 *  la fenetre se pose sur la tete MESUREE, avec de l'air garanti au-dessus,
 *  et le CSS n'a plus qu'a remplir sa boite. Une nouvelle illustration
 *  repasse par ici et se retrouve cadree pareil, sans qu'on ait a toucher a
 *  une feuille de style. */
async function buste(nom, buf, boite) {
  const t = await tete(buf, boite);

  // Deux contraintes, on garde la plus large : la tete doit tenir une part
  // donnee de la hauteur ET de la largeur. Sur Nora c'est la largeur qui
  // commande (ses cheveux), sur Sasha la hauteur.
  const parHauteur = t.hauteur / PART_TETE_H;
  const parLargeur = (t.largeur / PART_TETE_L) * (HAUTEUR_BUSTE / LARGEUR_BUSTE);
  const hauteur = Math.round(Math.max(parHauteur, parLargeur));
  const largeur = Math.round((hauteur * LARGEUR_BUSTE) / HAUTEUR_BUSTE);

  const cx = (t.gauche + t.droite) / 2;
  const left = Math.round(cx - largeur / 2);
  const top = Math.round(t.crane - AIR_TETE * hauteur);

  // On refuse plutot que de rogner en silence : une illustration qui ne
  // rentre pas doit se voir a la generation, pas sur le telephone de
  // quelqu'un.
  if (left < 0 || top < 0 || left + largeur > boite.w || top + hauteur > boite.h) {
    throw new Error(`buste hors toile (${left},${top} ${largeur}x${hauteur} sur ${boite.w}x${boite.h}) : le personnage est trop pres d'un bord`);
  }

  const sortie = await sharp(buf)
    .extract({ left, top, width: largeur, height: hauteur })
    .resize({ width: LARGEUR_BUSTE, height: HAUTEUR_BUSTE, kernel: "lanczos3" })
    .png()
    .toBuffer();
  return { buf: sortie, t, left, top, largeur, hauteur };
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

  // Le buste se taille dans le master DEJA normalise : c'est le fichier que
  // le site montre, donc les deux cadrages ne peuvent pas diverger.
  const boiteM = await boiteAlpha(m.buf);
  const b = await buste(nom, m.buf, boiteM);
  const destB = path.join(OUT, `${nom}-buste-v1.webp`);
  const rB = await ecrire(b.buf, destB);
  console.log(`${nom} buste   fenetre ${b.largeur} x ${b.hauteur} en (${b.left}, ${b.top}) -> ${LARGEUR_BUSTE} x ${HAUTEUR_BUSTE}`);
  console.log(`  tete    y ${b.t.crane}..${b.t.cou} (${b.t.hauteur} px), x ${b.t.gauche}..${b.t.droite} (${b.t.largeur} px)`);
  console.log(`  cadrage tete ${(100 * b.t.hauteur / b.hauteur).toFixed(1)} % de la hauteur, ${(100 * b.t.largeur / b.largeur).toFixed(1)} % de la largeur, air ${(100 * (b.t.crane - b.top) / b.hauteur).toFixed(1)} % au-dessus`);
  console.log(`  poids   WebP ${ko(rB.buf.length)}`);

  const c = await chat(nom);
  const destC = path.join(OUT, `${nom}-chat-v1.webp`);
  const rC = await ecrire(c.buf, destC);
  const poidsSrcC = (await stat(c.src)).size;
  console.log(`${nom} chat    ${c.boite.w} x ${c.boite.h} -> ${COTE_CHAT} x ${COTE_CHAT}   zoom ${c.zoom.toFixed(3)}`);
  console.log(`  poids   PNG ${ko(poidsSrcC)} -> WebP ${ko(rC.buf.length)}   [${rC.reglage}]`);
  console.log("");
}

if (CHECK) console.log("--check : rien n'a ete ecrit.");
