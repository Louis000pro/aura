// @ts-check
/**
 * Contrôle des espaces mangés entre un élément inline et le texte qui suit.
 *
 * POURQUOI ce script existe : le compilateur JSX supprime l'espace de tête d'un
 * nœud de texte quand ce nœud court sur PLUSIEURS LIGNES et contient au moins
 * une entité HTML (`&apos;`, `&nbsp;`, `&amp;`…). En français, presque tous nos
 * paragraphes ont une apostrophe et passent à la ligne, donc la condition est
 * remplie en permanence. Résultat : `<strong>Vaiiya</strong> calcule` est
 * correct dans le code source, et sort `Vaiiya calcule` collé à l'écran.
 *
 * Relire le code ne sert donc à rien : la faute n'y est pas. Il faut regarder
 * le HTML RÉELLEMENT GÉNÉRÉ, ce que fait ce script. 24 jonctions cassées ont
 * été trouvées ainsi le 2026-08-09, dont deux seulement étaient visibles à
 * l'œil nu.
 *
 * Le correctif, à chaque fois, est un `{" "}` explicite : une expression JSX
 * n'est pas du texte, le compilateur n'y touche pas.
 *
 * Usage : `npm run check:seo-spacing` (après un `npm run build`).
 *         `-- --all` pour balayer toutes les pages rendues, pas seulement
 *         celles du sitemap.
 * Sortie : 0 si tout va bien, 1 si une jonction est collée, 2 si le build manque.
 *
 * Volontairement PAS branché sur `npm run build` : c'est un contrôle qu'on lance
 * après un changement SEO, pas une barrière qui bloquerait tous les déploiements.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = process.cwd();
const RENDU = join(RACINE, ".next", "server", "app");
const SITEMAP = join(RACINE, "src", "app", "sitemap.ts");
const TOUT = process.argv.includes("--all");

/**
 * Caractères qui exigent une espace AVANT eux en français, donc dont la
 * présence juste après une balise fermante trahit une espace disparue.
 * À l'inverse `,` `.` `)` `]` `…` `'` n'en prennent jamais : les inclure ferait
 * hurler le script sur du texte parfaitement correct.
 */
const COLLE = /<\/(strong|a|em|b|i|code|span)>(?=[\p{L}\p{N}(\[«»:;!?·€])/gu;

/**
 * Deux cas où la balise touche du texte sans que rien ne soit cassé :
 *
 *  1. l'élément est VIDE (`<span class="filet"></span>`). Nos titres de section
 *     encadrent leur libellé de deux filets décoratifs de 24 px : ils ne collent
 *     aucun texte à aucun autre, ils occupent une largeur bien réelle.
 *  2. l'espace existe déjà, mais DANS l'élément (`<span>Le geste : </span>Mains`).
 *     Elle s'affiche, elle est juste écrite de l'autre côté de la frontière.
 */
function fauxPositif(html, debutBalise, nom) {
  const avant = html.slice(0, debutBalise);
  if (new RegExp(`<${nom}\\b[^>]*>$`).test(avant)) return true;
  return /[\s ]$/.test(avant);
}

/** Le sitemap est la source unique des pages publiques : on la lit, on ne la recopie pas. */
function pagesDuSitemap() {
  const src = readFileSync(SITEMAP, "utf8")
    .replace(/\/\/[^\n]*/g, "") // les commentaires peuvent contenir des guillemets
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const bloc = src.match(/const PAGES[^=]*=\s*\[([\s\S]*?)\]/);
  if (!bloc) {
    console.error("Impossible de lire PAGES dans src/app/sitemap.ts.");
    process.exit(2);
  }
  return [...bloc[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** `/` -> index.html, `/premium` -> premium.html */
function fichierRendu(chemin) {
  return join(RENDU, chemin === "/" ? "index.html" : `${chemin.replace(/^\//, "")}.html`);
}

function toutesLesPagesRendues() {
  const vus = [];
  (function marcher(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) marcher(p);
      else if (e.name.endsWith(".html")) vus.push(p);
    }
  })(RENDU);
  return vus.sort();
}

const ENTITES = { "&#x27;": "'", "&#39;": "'", "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&nbsp;": " " };

/** Un extrait lisible, balises remplacées par | et jonction marquée par >><< */
function extrait(html, i) {
  const brut = html.slice(Math.max(0, i - 55), i) + ">><<" + html.slice(i, i + 45);
  return brut
    .replace(/<[^>]*>/g, "|")
    .replace(/&#?\w+;/g, (e) => ENTITES[e] ?? e)
    .replace(/\s+/g, " ")
    .trim();
}

if (!existsSync(RENDU)) {
  console.error("Aucun rendu trouvé dans .next/server/app.");
  console.error("Lance d'abord : npm run build");
  process.exit(2);
}

const cibles = TOUT
  ? toutesLesPagesRendues().map((f) => [relative(RENDU, f).replace(/\\/g, "/"), f])
  : pagesDuSitemap().map((c) => [c, fichierRendu(c)]);

let problemes = 0;
let ignorees = 0;
let lues = 0;

for (const [nom, fichier] of cibles) {
  if (!existsSync(fichier)) {
    // Page rendue à la demande plutôt que pré-générée : rien à inspecter ici.
    console.log(`  ignoree  ${nom} (pas de rendu statique)`);
    ignorees++;
    continue;
  }
  lues++;
  // Les scripts (dont le JSON-LD) ne sont pas du texte affiché : hors sujet.
  const html = readFileSync(fichier, "utf8")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const trouves = [...html.matchAll(COLLE)].filter((m) => !fauxPositif(html, m.index, m[1]));
  if (trouves.length === 0) {
    console.log(`  ok       ${nom}`);
    continue;
  }
  problemes += trouves.length;
  console.log(`  COLLE    ${nom} : ${trouves.length}`);
  for (const m of trouves) console.log(`             ${extrait(html, m.index + m[0].length)}`);
}

console.log("");
if (problemes === 0) {
  console.log(`Espacement : aucun probleme (${lues} page(s) inspectee(s)${ignorees ? `, ${ignorees} ignoree(s)` : ""}).`);
  process.exit(0);
}
console.log(`Espacement : ${problemes} jonction(s) collee(s) sur ${lues} page(s).`);
console.log('Correctif : remplacer l\'espace apres la balise fermante par {" "} dans le JSX.');
process.exit(1);
