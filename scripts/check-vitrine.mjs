/* ════════════════════════════════════════════════════════════════════
   check-vitrine · CE QUE LE SCRIPT DE LA VITRINE ATTEND DE LA PAGE EXISTE.

   Posé le 2026-11-04, avec « La vitrine vivante ». `vivant/` se charge à part
   et travaille sur la page par des attributs et des classes : un nom qui
   diverge ne casse ni le typecheck ni le build, il laisse juste une section
   figée, ou une classe `undefined` sur un élément.

   ⚠️ LES KEYFRAMES SONT LOCALES À UN MODULE CSS. C'était le « grand carré
   blanc » du 2026-10-13 : `animation: pop` sans `@keyframes pop` dans le
   module, donc des messages restés à l'opacité 0, sans la moindre erreur.
   ════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DOSSIER = "src/components/Landing";
const lireTexte = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const page = lireTexte(join(DOSSIER, "LandingVitrine.tsx"));
const css = lireTexte(join(DOSSIER, "LandingVitrine.module.css"));
const vivant = readdirSync(join(DOSSIER, "vivant"))
  .map((f) => ({ f, t: readFileSync(join(DOSSIER, "vivant", f), "utf8") }));
const script = vivant.map((v) => v.t).join("\n");

const fautes = [];
let controles = 0;
const verifie = (ok, message) => {
  controles++;
  if (!ok) fautes.push(message);
};

/* Toutes les classes écrites par le script existent dans le module. */
const classes = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1]));
for (const nom of new Set([...script.matchAll(/\bs\.([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1]))) {
  verifie(classes.has(nom), `\`s.${nom}\` est lue par le script et n'existe pas dans le module CSS`);
}
for (const nom of new Set([...page.matchAll(/\bs\.([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1]))) {
  verifie(classes.has(nom), `\`s.${nom}\` est lue par la page et n'existe pas dans le module CSS`);
}

/* Tous les attributs cherchés par le script sont posés par la page. */
const crochets = new Set([...script.matchAll(/\[data-([a-z-]+)/g)].map((m) => m[1]));
for (const nom of crochets) {
  verifie(page.includes(`data-${nom}`), `\`[data-${nom}]\` est cherché par le script et la page ne le pose pas`);
}

/* Une animation nommée a ses keyframes dans le même module. */
const images = new Set([...css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)].map((m) => m[1]));
for (const m of css.matchAll(/animation(?:-name)?:\s*([a-zA-Z][a-zA-Z0-9_-]*)/g)) {
  if (m[1] === "none") continue;
  verifie(images.has(m[1]), `\`animation: ${m[1]}\` n'a pas ses @keyframes dans le module`);
}

/* Ce qui tient la page. */
/* Le repos est une liste : l'étoile recalculait tout le sous-arbre à chaque section. */
const repos = (css.match(/\.page \[data-repos\][^{]*\{[^}]*animation-play-state: paused !important/) ?? [""])[0];
verifie(repos.length > 0, "le repos hors de l'écran a disparu du module CSS");
verifie(!/\[data-repos\] \*/.test(css.replace(/\/\*[^]*?\*\//g, "")), "jamais [data-repos] * : il recalcule tout le sous-arbre à chaque section qui entre ou sort");
{
  const sansNotes = css.replace(/\/\*[^]*?\*\//g, "");
  const regle = /([^{}]+)\{([^{}]*)\}/g;
  for (let m; (m = regle.exec(sansNotes));) {
    if (!/infinite/.test(m[2])) continue;
    const classe = /\.([a-zA-Z-]+)/.exec(m[1])?.[1];
    if (!classe) continue;
    // Un élément `data-vivant` s'arrête par `[data-repos]::before` et `::after`.
    const vivant = new RegExp(`s\\.${classe}\\b[^>]*data-vivant`).test(page);
    verifie(vivant || repos.includes(`.${classe}`), `la boucle de .${classe} ne s'arrête pas hors de l'écran`);
  }
}
verifie((css.match(/prefers-reduced-motion/g) ?? []).length > 0, "le mouvement réduit a disparu du module CSS");
for (const zone of ["heros", "fin", "conv", "plateau", "assiette", "relais", "relie", "rangs"]) {
  verifie(new RegExp(`data-${zone}\\b[^>]*data-vivant`).test(page), `\`data-${zone}\` ne porte plus \`data-vivant\` : elle tournerait hors de l'écran`);
}
verifie(/import\("\.\/vivant\/vitrineVivante"\)/.test(page), "`vivant/` doit se charger à part, à la demande");
verifie(!/from "\.\/vivant\//.test(page), "un import statique de `vivant/` le ferait porter à chaque membre connecté");
verifie(/fin\.abort\(\)/.test(script) && /loseContext/.test(script), "tout doit s'arrêter quand la vitrine quitte l'écran");
verifie(!/uNuit|data-heros="/.test(script + page), "la variante tout en jour a quitté la maquette, elle ne revient pas ici");

/* Le dégradé : droit, et de la couleur exacte de la page. */
verifie(/linear-gradient\(to bottom, var\(--ciel\)\)/.test(css), "le passage de l'aube doit rester un dégradé droit");
verifie(/linear-gradient\(to top, var\(--ciel-soir\)\)/.test(css), "le passage du soir doit rester un dégradé droit");
verifie(/--ciel:[^;]*#fff 100%;/.test(css), "l'aube doit finir sur le blanc exact de la page");
verifie(/--ciel-soir:[^;]*#FFF2F5 100%;/.test(css), "le soir doit partir de la couleur exacte du bas de la page");
verifie(/\.jour \{[^}]*#FFF2F5 100%/.test(css), "le bas du jour doit rester la couleur du haut du crépuscule");
verifie(/\.crepuscule \{[^}]*#FFF2F5 24px/.test(css), "le haut du crépuscule doit partir de la couleur exacte du jour");

/* ⚠️ CE QUI FAIT UNE PAGE GÉNÉRÉE NE REVIENT PAS (Louis, 2026-11-04 : « sortir du
   vibe coding »). Pas de surtitre, pas de pastille, pas d'icône dans un carré. */
verifie(!/\bs\.surtitre\b|<Surtitre/.test(page) && !/\.surtitre\b/.test(css), "le surtitre au-dessus de chaque titre a quitté la page");
verifie(!/\bs\.pastilles?\b/.test(page) && !/\.pastilles?\b/.test(css), "les pastilles colorées ont quitté la page");
const icones = /import \{([^}]*)\} from "lucide-react"/.exec(page)?.[1].split(",").map((n) => n.trim()).filter(Boolean) ?? [];
verifie(icones.every((n) => ["ArrowRight", "ArrowUp"].includes(n)), `une icône ne décore pas une section : ${icones.join(", ")}`);
verifie(!/data-reveal/.test(page), "le même fondu vers le haut partout a quitté la page");

/* Les consignes des mouvements sont celles de la bibliothèque, mot pour mot. */
const bibliotheque = readFileSync("src/lib/exerciseLibrary.ts", "utf8");
const consignes = [...page.matchAll(/consigne: "([^"]+)"/g)].map((m) => m[1]);
verifie(consignes.length >= 4, "la scène des mouvements a perdu ses consignes");
for (const c of consignes) verifie(bibliotheque.includes(c), `une consigne de la vitrine n'est plus celle de la bibliothèque : ${c}`);

/* Le total d'une assiette est la somme de ses lignes. */
const plats = [...page.matchAll(/\{ photo: "[^"]+", nom: "([^"]+)", kcal: (\d+),[^\n]*lignes: \[\n([\s\S]*?)\n  \] \}/g)];
verifie(plats.length === 3, "les trois assiettes de la vitrine sont introuvables");
for (const [, nom, kcal, lignes] of plats) {
  const somme = [...lignes.matchAll(/kcal: (\d+)/g)].reduce((t, m) => t + Number(m[1]), 0);
  verifie(somme === Number(kcal), `${nom} : le total annonce ${kcal} kcal et les lignes en font ${somme}`);
}

/* Le Guide en grand existe pour les deux, dans ses quatre poses. */
for (const g of ["nora", "sasha"]) {
  for (const e of ["listen", "think", "explain", "encourage"]) {
    verifie(existsSync(`public/guides/${g}-${e}-scene-v1.webp`), `la pose ${g}-${e} manque`);
  }
}

/* Une pose de plus que ce que les keyframes savent jouer laisserait un trou. */
/* Aucune traînée : une pose passe de 1 à 0 d'un seul trait, jamais par un entre-deux. */
for (const n of [2, 3, 4, 5]) verifie(!/opacity: \.\d/.test((css.match(new RegExp(`@keyframes strobo${n} [^\\n]*`)) ?? [""])[0]), `la pose ${n} laisse une traînée : l'ancien mouvement doit partir tout de suite`);
{
  const lire = (f) => readFileSync(f, "utf8");
  verifie(/FONDU_POSE_MS = \d{2}\b/.test(lire("src/lib/exerciseGuides.ts")), "le passage d'une pose à l'autre reste sous 100 ms");
  for (const f of ["src/components/ExerciseGuide.tsx", "src/components/seance/ExerciseThumb.tsx"]) verifie(/FONDU_POSE_MS/.test(lire(f)), `${f} n'a plus sa durée propre de fondu`);
}
for (const n of [2, 3, 4, 5]) verifie(new RegExp(`@keyframes strobo${n} `).test(css), `les poses à ${n} images n'ont plus leurs keyframes`);

/* Le relais montre les trois changements de l'affiche, sans étape dans le vide. */
verifie(/className=\{s\.barres\}[^>]*><i \/><i \/><i \/><\/div>/.test(page), "le relais doit montrer trois temps, comme l'affiche");

/* « Tout se parle » : un logo sobre, sans canevas. La lumière part du bout de l'aile,
   arrive au cœur, et repart par deux ailes symétriques vers le Guide et le rang. */
verifie(existsSync("public/marque/aile.svg"), "l'aile du logo manque");
for (const nom of ["seance", "repas", "guide", "rang"]) verifie(new RegExp(`Aile nom="${nom}"`).test(page), `l'aile ${nom} manque`);
verifie(/data-coeur/.test(page) && /@keyframes lumiere /.test(css) && /@keyframes trajet /.test(css), "la lumière doit traverser les ailes jusqu'au cœur");
verifie(!/data-relie[^]*?<canvas[^]*?data-relie-scene/.test(page), "le logo détaillé ne revient pas dans « Tout se parle » : il vole la vedette à la fin");
verifie(!/uOndeG|uEclat/.test(script), "le fond du logo n'a plus à porter la lumière de « Tout se parle »");

/* ⚠️ LA NUIT N'EXISTE QU'AUX DEUX BOUTS (Louis, 2026-11-04 : « ça change de couleur
   en plein milieu », « c'est mieux que les tarifs soient sur fond clair »). */
verifie(/<div className=\{s\.nuit\}>\s*<Fin \/>\s*<\/div>/.test(page), "la nuit ne porte que la fin : le reste de la page est le jour");
const ordre = ["<Mouvements", "<Guide />", "<Nutrition />", "<Relais />", "<ToutRelie />", "<Rangs />", "<Offre", "<Avis", "s.crepuscule", "<Fin />"].map((m) => page.lastIndexOf(m));
verifie(ordre.every((v, i) => v >= 0 && (i === 0 || v > ordre[i - 1])), "l'ordre de la journée a changé : le crépuscule tombe juste avant la fin");

/* Les rangs suivent le doigt : Bronze en haut de l'échelle, Éternel en bas. */
verifie(!/column-reverse/.test(css), "l'échelle des rangs descend dans le sens du geste, Bronze en haut");
verifie(/data-ciel/.test(page) && /\[data-ciel\]/.test(script), "chaque rang apporte son ciel");

/* L'offre : deux cartes de même structure, et Vaiiya+ n'a aucun bouton. */
const noire = page.slice(page.indexOf("s.carteNoire"), page.indexOf("function Etoiles") >= 0 ? page.indexOf("function Etoiles") : undefined);
verifie(/<Bouton label="Créer mon compte"/.test(page), "la carte du gratuit porte l'action");
verifie(!/<Bouton|<Link/.test(noire), "Vaiiya+ n'a pas de bouton : la vente n'est pas ouverte");
verifie(!/\.mur\b/.test(css), "le mur de mots a quitté la page");

/* La fluidité : une seule lecture du défilement, et aucune mesure pendant qu'il tourne. */
verifie(/creerDefile\(racine, veilleur, signal\)/.test(script), "tout ce qui suit le doigt passe par un seul écouteur de défilement");
verifie(/brancher\(actifs\.size > 0\)/.test(script), "l'écouteur de défilement n'existe que pendant qu'une scène liée au doigt est à l'écran");
verifie(/content-visibility: auto/.test(css) && /contain-intrinsic-block-size: auto/.test(css), "ce qui est loin du doigt ne se calcule pas");
verifie(!/clip-path/.test(css.replace(/\/\*[^]*?\*\//g, "")), "pas de clip-path sur un canevas qui change à chaque image : une passe de plus sur tout l'écran");
verifie(!/\.ticket[^{]*\{[^}]*filter:/.test(css), "pas de filtre sur le ticket : il se recalcule à chaque ligne qui sort");
verifie(/y = window\.scrollY;\s*if \(attente\) return;/.test(script), "scrollY se lit dans l'évènement, jamais dans la boucle d'image");
const globaux = readFileSync("src/app/globals.css", "utf8").replace(/\/\*[^]*?\*\//g, "");
verifie(!/:has\(/.test(globaux), "aucun :has() dans globals.css : il reparcourt toute la page à chaque recalcul de style");
verifie(/<style>\{DESSOUS\}<\/style>/.test(page), "le dessous de la vitrine vit dans la page");
verifie(!/const b = zone\.getBoundingClientRect\(\);\s*if \(b\.bottom/.test(script), "une scène ne mesure plus la page à chaque image");
verifie(/n - Math\.min\(n, 900\)/.test(script), "le V du héros n'attend pas le script : il rattrape le temps de chargement");

/* Le Guide parle par `lib/guides.ts`. */
const conversation = vivant.find((v) => v.f === "conversation.ts")?.t ?? "";
verifie(!/dire\("/.test(conversation) && !/ouvre\("/.test(conversation), "une phrase du Guide s'écrit dans `lib/guides.ts`, jamais ici");

if (fautes.length) {
  console.error(`✗ ${fautes.length} faute(s) sur ${controles} contrôles :`);
  for (const f of fautes) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ la vitrine vivante tient : ${controles} contrôles.`);
