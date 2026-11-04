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
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DOSSIER = "src/components/Landing";
const page = readFileSync(join(DOSSIER, "LandingVitrine.tsx"), "utf8");
const css = readFileSync(join(DOSSIER, "LandingVitrine.module.css"), "utf8");
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
verifie(/\[data-repos\] \*/.test(css), "le repos hors de l'écran a disparu du module CSS");
verifie((css.match(/prefers-reduced-motion/g) ?? []).length > 0, "le mouvement réduit a disparu du module CSS");
for (const zone of ["heros", "fin", "conv", "constellation", "assiette", "rangs"]) {
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
verifie(/\.offre \{[^}]*#FFF2F5 100%/.test(css), "le bas de l'offre doit rester la couleur du soir");

/* Le Guide parle par `lib/guides.ts`. */
const conversation = vivant.find((v) => v.f === "conversation.ts")?.t ?? "";
verifie(!/dire\("/.test(conversation) && !/ouvre\("/.test(conversation), "une phrase du Guide s'écrit dans `lib/guides.ts`, jamais ici");

if (fautes.length) {
  console.error(`✗ ${fautes.length} faute(s) sur ${controles} contrôles :`);
  for (const f of fautes) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ la vitrine vivante tient : ${controles} contrôles.`);
