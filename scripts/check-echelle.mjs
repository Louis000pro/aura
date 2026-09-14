/* ════════════════════════════════════════════════════════════════════
   check-echelle · L'ÉCHELLE TYPOGRAPHIQUE TIENT, ET ELLE SE VÉRIFIE.

   Posée sur tout le produit le 2026-09-14. Avant : 858 tailles écrites à
   la main sur 25 valeurs distinctes, dont NEUF entre 11 et 17 px. Ce banc
   existe pour une seule raison : une échelle ne se maintient pas toute
   seule, et la 859ᵉ valeur s'écrit sans qu'on la voie.

   ⚠️ IL LIT LES TROIS ÉCRITURES D'UNE TAILLE, ET C'EST LE POINT.
   Le contrôle du plancher d'accessibilité ne regardait que `text-[Npx]` et
   `font-size:` ; il ne voyait pas les styles en ligne JSX, qui s'écrivent
   `fontSize: 9.5`. Cinq textes vivaient donc sous le plancher de 11 px, en
   silence, alors que la note de chantier disait « plus aucune exception ».
   Un contrôle qui ne connaît pas toutes les façons d'écrire ce qu'il
   surveille ne surveille rien.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = "src";
/* LES SIX MARCHES. Au-delà de 34, le héros est libre : un chrono plein
   écran et un titre d'affiche n'ont pas à tenir dans une grille de six. */
const MARCHES = new Set([11, 13, 16, 20, 26]);
const PLANCHER = 11;   /* 11 pt chez Apple. Rien ne descend en dessous. */
const HEROS = 34;      /* au-dessus, on ne contraint plus. */

/* ⚠️ LES ROUTES D'API SONT HORS ÉCHELLE, ET CE N'EST PAS UNE FACILITÉ.
   Ce qu'elles écrivent en px, ce sont des GABARITS D'E-MAIL : du HTML
   envoyé chez Gmail, Outlook et Apple Mail, qui ne connaissent ni nos
   classes ni nos jetons. L'échelle de l'app n'a aucune prise là-bas, et
   l'y appliquer rendrait les e-mails moins lisibles, pas plus cohérents. */
const HORS = (p) => p.replace(/\\/g, "/").includes("/api/");

const fichiers = [];
(function marcher(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) marcher(p);
    else if (/\.(tsx|ts|css)$/.test(p) && !HORS(p)) fichiers.push(p);
  }
})(RACINE);

const fautes = [];
const ajoute = (f, i, quoi) => fautes.push(`${relative(".", f)}:${i + 1} · ${quoi}`);

let mesures = 0;
for (const f of fichiers) {
  const lignes = readFileSync(f, "utf8").split("\n");
  const estGlobals = f.endsWith("globals.css");
  /* ⚠️ UN COMMENTAIRE N'EST PAS DU CODE, ET CE BANC S'EST FAIT PRENDRE
     DESSUS : `globals.css` explique justement pourquoi `.vy-titre` doit
     gagner contre un `text-lg` oublié, et cette phrase remontait comme une
     faute. On suit donc les blocs sur PLUSIEURS lignes, parce que c'est
     exactement là que vivent les explications du produit. */
  let dansBloc = false;
  lignes.forEach((ligne, i) => {
    let l = ligne, reste = "";
    if (dansBloc) {
      const fin = l.indexOf("*/");
      if (fin === -1) return;
      l = l.slice(fin + 2); dansBloc = false;
    }
    for (;;) {
      const d = l.indexOf("/*");
      if (d === -1) break;
      const fin = l.indexOf("*/", d + 2);
      if (fin === -1) { reste = l.slice(0, d); dansBloc = true; l = reste; break; }
      l = l.slice(0, d) + l.slice(fin + 2);
    }
    l = l.replace(/\/\/.*$/, "");
    /* ── 1 · les trois écritures d'une taille ─────────────────────── */
    const vus = [
      ...[...l.matchAll(/text-\[([0-9.]+)px\]/g)].map((m) => +m[1]),
      ...[...l.matchAll(/font-size: *([0-9.]+)px/g)].map((m) => +m[1]),
      ...[...l.matchAll(/fontSize: *([0-9.]+)\b/g)].map((m) => +m[1]),
    ];
    for (const v of vus) {
      mesures++;
      if (v < PLANCHER) ajoute(f, i, `${v}px passe sous le plancher de ${PLANCHER}px`);
      else if (v < HEROS && !MARCHES.has(v)) ajoute(f, i, `${v}px n'est pas une marche (11 / 13 / 16 / 20 / 26, puis libre à partir de ${HEROS})`);
    }

    /* ── 2 · un display fluide a le droit d'être fluide, mais sa borne
       BASSE est une marche : c'est elle qui s'applique sur téléphone,
       donc sur l'écran le plus fréquent. Mesuré sur la landing : le héros
       rendait 33,6 px et les titres de section 30,4, trois pixels d'écart
       là où l'échelle veut du contraste. ─────────────────────────────── */
    /* ⚠️ Un clamp de police s'écrit de DEUX façons, et le témoin l'a
       montré : `fontSize: "clamp(…)"` et `text-[clamp(…)]`. N'en lire
       qu'une, c'est ne rien lire du côté de Tailwind, là où vit le héros
       de la landing. */
    for (const m of l.matchAll(/(?:font-size|fontSize): *"?clamp\( *([0-9.]+)(px|rem)|text-\[clamp\(([0-9.]+)(px|rem)/g)) {
      const val = m[1] ?? m[3], unite = m[2] ?? m[4];
      /* ⚠️ ON N'ARRONDIT PAS, ET LE TÉMOIN L'A MONTRÉ : `2.1rem` vaut 33,6 px
         et s'arrondissait à 34, donc il passait pour le héros. Un demi-pixel
         est exactement ce que cette échelle existe pour supprimer. */
      const bas = unite === "rem" ? parseFloat(val) * 16 : +val;
      if (bas < HEROS && !MARCHES.has(bas)) ajoute(f, i, `un clamp de police démarre à ${bas}px, qui n'est pas une marche`);
    }

    /* ── 3 · les classes nommées de Tailwind rouvrent 12 / 14 / 18 / 24 ── */
    const nommee = l.match(/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\b/);
    if (nommee) ajoute(f, i, `\`${nommee[0]}\` réintroduit une valeur hors échelle : écris la marche`);

    /* ── 4 · une seconde définition du chiffre ─────────────────────── */
    if (!estGlobals && l.includes("var(--chiffre)"))
      ajoute(f, i, "le chiffre se pose avec `.vy-nombre`, jamais en recopiant `var(--chiffre)`");
  });
}

/* ── 5 · les classes SONT l'échelle, et réciproquement ──────────────
   Si `.vy-label` valait 12 pendant qu'un écran écrit 11 pour la même
   chose, il y aurait deux valeurs pour un seul rôle, donc pas d'échelle. */
const css = readFileSync("src/app/globals.css", "utf8");
for (const [classe, attendu] of [["vy-label", 11], ["vy-corps", 16], ["vy-sous", 20]]) {
  const bloc = css.match(new RegExp(`\.${classe} \{[^}]*\}`));
  const rem = bloc && bloc[0].match(/font-size: *([0-9.]+)rem/);
  const px = rem ? Math.round(parseFloat(rem[1]) * 16) : null;
  if (px !== attendu) fautes.push(`globals.css · .${classe} vaut ${px}px, la marche de son rôle est ${attendu}px`);
}

if (fautes.length) {
  console.error(`\n✗ ${fautes.length} écart(s) à l'échelle :\n`);
  for (const f of fautes) console.error("  " + f);
  console.error("\nLes six marches : 11 mention · 13 secondaire · 16 texte lu · 20 titre de bloc · 26 valeur forte · 34+ le héros.\n");
  process.exit(1);
}
console.log(`✓ l'échelle tient : ${mesures} tailles, toutes sur une marche (${fichiers.length} fichiers).`);
