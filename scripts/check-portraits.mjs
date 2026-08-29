#!/usr/bin/env node
/* ============================================================================
   Verifie les portraits de moment. `npm run check:portraits`

   Deux pannes seulement, mais ce sont les deux qui ne se voient pas au
   typecheck ni au build, et qui abiment le produit en silence.

   1. L'ASYMETRIE. Une pose que Nora a et que Sasha n'a pas fait deux
      produits differents selon le Guide choisi. C'est une regle verrouillee :
      les deux ont exactement les memes capacites, seule la formulation
      change. Une planche dessinee pour l'un doit l'etre pour l'autre.

   2. LE MANIFESTE PERIME. `src/lib/portraitsGuides.ts` est ecrit par
      `build-portraits.mjs` et dit a l'app quels fichiers existent. S'il
      annonce un fichier absent, l'app pose un `<img>` sur un 404 et laisse
      un trou. S'il oublie un fichier present, la pose est dessinee,
      generee, commitee, et ne s'affiche jamais. Les deux sens comptent.

   La verification part du DISQUE, pas d'une liste tenue a la main : elle ne
   peut donc pas se desynchroniser de ce qu'on a reellement dessine.
   ============================================================================ */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SRC = path.join("guides-src", "portraits");
const OUT = path.join("public", "guides");
const MANIFESTE = path.join("src", "lib", "portraitsGuides.ts");

const GUIDES = ["nora", "sasha"];
/* /!\ DEUX LISTES, ET CE N'EST PAS UN DOUBLON : un etat et sa planche ne
   portent pas toujours le meme nom. `welcome` est dessine sur la planche
   `master`, donc le mot `master` n'existe que du cote des sources et le mot
   `welcome` que du cote des fichiers generes. Confondre les deux fait passer
   `nora-welcome-avatar-v1.webp` pour une pose de moment, et le script reclame
   alors une entree de manifeste pour un fichier d'etat. */

/** Cote SOURCES : les suffixes de planche. Recopies de
 *  `build-portraits.mjs` volontairement, ce script doit pouvoir tourner
 *  meme quand la generation est cassee, c'est justement son role. */
const PLANCHES_ETAT = new Set(["master", "listen", "think", "explain", "encourage", "chat"]);

/** Cote FICHIERS GENERES : les noms d'etat. */
const ETATS = new Set(["welcome", "listen", "think", "explain", "encourage"]);

let probleme = false;
const dire = (m) => { console.log(m); probleme = true; };

/* -- 1 · Les planches sources -------------------------------------------- */
let sources = [];
try {
  sources = await readdir(SRC);
} catch {
  // Le dossier est gitignore : sur une machine qui n'a pas les originaux,
  // il n'y a rien a verifier de ce cote, et ce n'est pas une erreur.
  console.log(`${SRC} absent : verification des planches sources ignoree.`);
}

const momentsSource = new Map(); // moment -> Set(guides)
for (const f of sources) {
  if (!f.endsWith(".png")) continue;
  const guide = GUIDES.find((g) => f.startsWith(`${g}-`));
  if (!guide) continue;
  const suffixe = f.slice(guide.length + 1, -4);
  if (PLANCHES_ETAT.has(suffixe)) continue;
  if (!momentsSource.has(suffixe)) momentsSource.set(suffixe, new Set());
  momentsSource.get(suffixe).add(guide);
}

for (const [moment, guides] of [...momentsSource].sort()) {
  const absents = GUIDES.filter((g) => !guides.has(g));
  if (absents.length) {
    dire(`ASYMETRIE  ${moment} : planche manquante pour ${absents.join(", ")}`);
    for (const g of absents) dire(`           attendu ${path.join(SRC, `${g}-${moment}.png`)}`);
  }
}

/* -- 2 · Les fichiers generes -------------------------------------------- */
const produits = (await readdir(OUT))
  .filter((f) => f.endsWith("-v1.webp"))
  .map((f) => f.slice(0, -8));

/** Un fichier de moment porte au moins quatre segments :
 *  `<guide>-<moment...>-<cadrage>`. Les etats en ont deux ou trois. */
const CADRAGES = new Set(["buste", "avatar"]);
const surDisque = new Set();
for (const cle of produits) {
  const guide = GUIDES.find((g) => cle.startsWith(`${g}-`));
  if (!guide) continue;
  const reste = cle.slice(guide.length + 1);
  const bout = reste.lastIndexOf("-");
  if (bout < 0) continue;
  const cadrage = reste.slice(bout + 1);
  const moment = reste.slice(0, bout);
  if (!CADRAGES.has(cadrage)) continue;
  if (ETATS.has(moment)) continue;
  surDisque.add(cle);
}

/* -- 3 · Le manifeste ---------------------------------------------------- */
const texte = await readFile(MANIFESTE, "utf8");
const bloc = texte.match(/new Set<string>\(\[([\s\S]*?)\]\)/);
if (!bloc) {
  dire(`MANIFESTE  ${MANIFESTE} : bloc DISPONIBLES introuvable, le fichier a ete edite a la main ?`);
} else {
  const annonces = new Set([...bloc[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));

  for (const cle of [...annonces].sort()) {
    if (!surDisque.has(cle)) {
      dire(`FANTOME    ${cle} : annonce par le manifeste, absent de ${OUT}`);
    }
  }
  for (const cle of [...surDisque].sort()) {
    if (!annonces.has(cle)) {
      dire(`INVISIBLE  ${cle} : present sur le disque, absent du manifeste (la pose ne s'affichera jamais)`);
    }
  }
  console.log(`manifeste : ${annonces.size} planche(s) annoncee(s), ${surDisque.size} sur le disque.`);
}

if (probleme) {
  console.log("");
  console.log("Relancer `npm run portraits` regle le manifeste. L'asymetrie, elle, se regle au dessin.");
  process.exit(1);
}
console.log("portraits : rien a signaler.");
