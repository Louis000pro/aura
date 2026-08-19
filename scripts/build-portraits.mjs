#!/usr/bin/env node
/* ============================================================================
   Les portraits de Nora et Sasha : normalisation, cadrages, conversion.

   Entree  : guides-src/portraits/<guide>-<planche>.png
             (les PNG originaux, jamais modifies, jamais commites)
   Sortie  : public/guides/*.webp

   Usage :
     npm run portraits            ecrit les WebP
     npm run portraits -- --check mesure et compare, sans rien ecrire

   -- LES CINQ ETATS --------------------------------------------------------
   Un Guide a cinq visages, un par moment de la conversation :

     welcome    l'ecran vide, avant le premier message   (planche `master`)
     listen     il vient de poser une question           (planche `listen`)
     think      il prepare sa reponse                    (planche `think`)
     explain    il repond, il montre une carte           (planche `explain`)
     encourage  une action vient d'aboutir               (planche `encourage`)

   `welcome` reutilise le master : c'est deja la pose d'accueil, celle de
   l'ecran de choix. Les quatre autres sont des planches a part.

   -- POURQUOI UNE NORMALISATION --------------------------------------------
   Les illustrations sont dessinees separement, donc elles n'arrivent ni
   cadrees ni meme mises a l'echelle pareil. Mesure sur les dix planches :
   le haut du crane va de 0,8 % a 5,6 % de la hauteur, et la tete de Nora est
   peinte 27 % plus grande dans ses quatre nouvelles poses que dans son
   master. Un cadrage en pourcentages fixes donnerait donc cinq zooms
   differents pour un meme personnage, et l'avatar sauterait a chaque
   changement d'etat, en plein milieu d'une conversation.

   Deux corrections possibles, une seule est saine. Donner a chaque planche
   son propre reglage CSS ferait entrer les defauts d'un fichier dans la
   feuille de style, et la prochaine illustration casserait le cadrage en
   silence. On fait donc l'inverse, comme `normalize-guides.mjs` le fait deja
   pour les sprites d'exercice : le fichier se conforme a un contrat, et le
   CSS n'a qu'une seule regle.

   /!\ TOUS LES CADRAGES SE POSENT SUR LA TETE MESUREE, jamais sur la
   silhouette. C'est la difference qui compte ici : les nouvelles poses
   bougent les bras (une main au menton, un bras leve), donc la silhouette
   change de largeur d'un etat a l'autre alors que la tete, elle, ne bouge
   pas. Un cadrage cale sur la silhouette zoomerait autrement a chaque etat.

   /!\ NORMALISER N'EST PAS RETOUCHER. Le dessin n'est jamais redessine, ni
   deforme, ni recolore, et son echelle n'est pas touchee sur les masters :
   on ne fait que le DEPLACER sur sa toile, en pixels entiers. Les originaux
   restent intacts dans guides-src/.

   -- LES CONTRATS ----------------------------------------------------------
   master     . le haut du crane se pose sur la meme ligne pour les deux
                Guides (LIGNE_TETE), par translation verticale seule.
                L'echelle du dessin n'est pas touchee : c'est ce qui garde a
                chacun sa stature. Sert la scene de l'ecran de choix.
   buste      . 4:5, la tete occupe une part fixe de la hauteur et jamais
                plus d'une part fixe de la largeur. Sert le questionnaire
                de /bienvenue ET l'ecran vide du chat.
   reflexion  . 4:5 plus large : la tete n'occupe que 44 % de la hauteur, donc
                on voit les EPAULES ET LES BRAS. C'est le seul cadrage ou la
                pose se lit, et c'est fait pour : il ne sert qu'a l'attente,
                le seul moment ou un personnage un peu plus grand apporte
                quelque chose.
   avatar     . carre, serre sur la tete. Il vit dans une pastille de 28 a
                36 px : a cette taille un buste entier n'est qu'une tache, il
                faut un visage.
   ============================================================================ */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.join("guides-src", "portraits");
const OUT = path.join("public", "guides");
const CHECK = process.argv.includes("--check");

const GUIDES = ["nora", "sasha"];

/** L'etat, et la planche d'ou il sort. `welcome` reutilise le master. */
const PLANCHE = {
  welcome: "master",
  listen: "listen",
  think: "think",
  explain: "explain",
  encourage: "encourage",
};

/** Au-dessus, c'est du personnage. En dessous, du bord de pinceau. */
const SEUIL_ALPHA = 8;

/** Le haut du crane, en part de la hauteur du fichier. Valeur de Nora sur son
 *  master, qui laisse deja la bonne respiration au-dessus de la fenetre du
 *  questionnaire (celle-ci commence a 2 % de la hauteur).
 *  /!\ C'est aussi la reserve dans laquelle les cadrages viennent chercher
 *  leur air au-dessus du crane : la baisser ferait echouer `reflexion`. */
const LIGNE_TETE = 0.056;

/** -- LES CADRAGES ---------------------------------------------------------
 *  `hauteurTete` : la part de la HAUTEUR de la fenetre occupee par la tete,
 *  du haut du crane a la base du cou. C'est le reglage de zoom.
 *  `largeurTete` : la part de la LARGEUR que la tete ne depasse jamais. C'est
 *  cette contrainte qui a motive le pipeline : les cheveux de Nora sont
 *  larges et son crane est peint 81 px a droite du centre de sa toile, donc
 *  un cadrage centre sur le FICHIER lui coupait la meche droite.
 *  `air` : ce qu'on laisse au-dessus du crane, en part de la hauteur.
 *  /!\ `air x hauteur` doit rester sous LIGNE_TETE x hauteur du fichier,
 *  sinon la fenetre sort par le haut et le script refuse. */
const CADRAGES = {
  buste:     { l: 512, h: 640, hauteurTete: 0.52, largeurTete: 0.76, air: 0.12 },
  reflexion: { l: 320, h: 400, hauteurTete: 0.44, largeurTete: 0.62, air: 0.07 },
  avatar:    { l: 256, h: 256, hauteurTete: 0.55, largeurTete: 0.80, air: 0.10 },
};

/** Qui recoit quoi. Un cadrage coute un fichier a telecharger : on ne genere
 *  que ce que l'ecran affiche vraiment.
 *    avatar     . les cinq etats, ils se relaient dans la meme pastille
 *    buste      . welcome seul, c'est le grand personnage de l'ecran vide
 *    reflexion  . think seul, c'est l'attente */
const ETATS_PAR_CADRAGE = {
  avatar: ["welcome", "listen", "think", "explain", "encourage"],
  buste: ["welcome"],
  reflexion: ["think"],
};

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

/** Pose le haut du crane sur LIGNE_TETE. Rend la planche normalisee. */
async function normaliser(fichier) {
  const buf0 = await readFile(fichier);
  const b0 = await boiteAlpha(buf0);
  if (!b0) throw new Error(`${fichier} : planche entierement transparente`);
  const vise = Math.round(LIGNE_TETE * b0.h);
  const dy = vise - b0.top;
  const buf = await translater(buf0, dy, b0);
  const boite = await boiteAlpha(buf);
  return { buf, boite, dy, craneAvant: b0.top, poidsSrc: (await stat(fichier)).size };
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

/** -- LA FENETRE -----------------------------------------------------------
 *  Une seule fonction pour les trois cadrages : ils ne different que par
 *  leurs reglages. La fenetre se pose sur la tete MESUREE, avec de l'air
 *  garanti au-dessus, et le CSS n'a plus qu'a remplir sa boite.
 *
 *  Deux contraintes, on garde la plus large : la tete doit tenir une part
 *  donnee de la hauteur ET de la largeur. Sur Nora c'est souvent la largeur
 *  qui commande (ses cheveux), sur Sasha la hauteur. */
async function fenetre(buf, boite, t, cadrage) {
  const parHauteur = t.hauteur / cadrage.hauteurTete;
  const parLargeur = (t.largeur / cadrage.largeurTete) * (cadrage.h / cadrage.l);
  const hauteur = Math.round(Math.max(parHauteur, parLargeur));
  const largeur = Math.round((hauteur * cadrage.l) / cadrage.h);

  const cx = (t.gauche + t.droite) / 2;
  const left = Math.round(cx - largeur / 2);
  const top = Math.round(t.crane - cadrage.air * hauteur);

  // On refuse plutot que de rogner en silence : une illustration qui ne
  // rentre pas doit se voir a la generation, pas sur le telephone de
  // quelqu'un.
  if (left < 0 || top < 0 || left + largeur > boite.w || top + hauteur > boite.h) {
    throw new Error(`fenetre hors toile (${left},${top} ${largeur}x${hauteur} sur ${boite.w}x${boite.h}) : le personnage est trop pres d'un bord`);
  }

  const sortie = await sharp(buf)
    .extract({ left, top, width: largeur, height: hauteur })
    .resize({ width: cadrage.l, height: cadrage.h, kernel: "lanczos3" })
    .png()
    .toBuffer();
  return { buf: sortie, left, top, largeur, hauteur };
}

/** -- LE REGLAGE, ET POURQUOI CELUI-LA -------------------------------------
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
 *  /!\ `smartSubsample: false` : le sous-echantillonnage de chrominance
 *  ferait baver les aplats violets sur la peau, exactement la ou ces
 *  illustrations sont le plus fragiles. */
const WEBP = { quality: 95, alphaQuality: 100, effort: 6, smartSubsample: false };

async function ecrire(buf, dest) {
  const sortie = await sharp(buf).webp(WEBP).toBuffer();
  if (!CHECK) await writeFile(dest, sortie);
  return sortie.length;
}

const ko = (n) => (n / 1024).toFixed(0) + " Ko";

await mkdir(OUT, { recursive: true });
let total = 0;

for (const guide of GUIDES) {
  console.log(`-- ${guide} ${"-".repeat(56 - guide.length)}`);
  for (const [etat, planche] of Object.entries(PLANCHE)) {
    const n = await normaliser(path.join(SRC, `${guide}-${planche}.png`));
    const t = await tete(n.buf, n.boite);
    console.log(`${etat.padEnd(10)} planche ${planche.padEnd(10)} crane ${n.craneAvant} (${(100 * n.craneAvant / n.boite.h).toFixed(1)} %), translation ${n.dy >= 0 ? "+" : ""}${n.dy} px`);
    console.log(`           tete ${t.hauteur} x ${t.largeur} px, cou y ${t.cou}`);

    // Le master n'est pas un cadrage : c'est la planche normalisee elle-meme,
    // que la scene de l'ecran de choix montre en entier.
    if (etat === "welcome") {
      const p = await ecrire(n.buf, path.join(OUT, `${guide}-master-v1.webp`));
      total += p;
      console.log(`           master     ${n.boite.w} x ${n.boite.h}   PNG ${ko(n.poidsSrc)} -> WebP ${ko(p)}`);
    }

    for (const [nom, cadrage] of Object.entries(CADRAGES)) {
      if (!ETATS_PAR_CADRAGE[nom].includes(etat)) continue;
      const f = await fenetre(n.buf, n.boite, t, cadrage);
      // `buste` garde son nom historique sans etat : /bienvenue le montre
      // depuis le premier jour, et il n'existe que pour `welcome`.
      const dest = nom === "buste"
        ? path.join(OUT, `${guide}-buste-v1.webp`)
        : path.join(OUT, `${guide}-${etat}-${nom}-v1.webp`);
      const p = await ecrire(f.buf, dest);
      total += p;
      console.log(`           ${nom.padEnd(10)} fenetre ${f.largeur} x ${f.hauteur} en (${f.left}, ${f.top}) -> ${cadrage.l} x ${cadrage.h}`);
      console.log(`                      tete ${(100 * t.hauteur / f.hauteur).toFixed(0)} % de la hauteur, ${(100 * t.largeur / f.largeur).toFixed(0)} % de la largeur, air ${(100 * (t.crane - f.top) / f.hauteur).toFixed(0)} %   ${ko(p)}`);
    }
  }
  console.log("");
}

console.log(`total ecrit : ${ko(total)}`);
if (CHECK) console.log("--check : rien n'a ete ecrit.");
