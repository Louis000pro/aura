/* ═══════════════════════════════════════════════════════════════════════
   check:cours, le banc de la banque de cours nutrition (2026-10-25).

     npm run check:cours

   ⚠️ IL EXERCE LE VRAI CODE (lib/coursNutrition et chaque texte, chargés
   comme l'app les charge), puis il lit la source des écrans pour les
   propriétés du chemin. Ce qu'il protège tient en cinq phrases :
     · l'index et les textes se répondent, et chaque cours a son carnet de
       recherche, où chacune de ses sources est listée ;
     · la durée suit la longueur du texte, et le format suit la durée ;
     · la photo vient de la banque de recettes, et l'envie proposée existe ;
     · la typographie se pose au rendu, et le texte ne suppose jamais un
       genre, ne fait aucun reproche et ne promet rien ;
     · le texte ne se charge qu'à l'ouverture, et le lecteur montre la
       photo du plat, jamais une salle de sport.
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { RECIPES } from "@/lib/recipeBank";
import { ENVIES, imageRecette } from "@/lib/collectionsRecettes";
import {
  COURS, DUREES, NOM_FORMAT, ORDRE_FORMATS, TEXTES, THEMES_COURS,
  chargerTexte, dateLisible, formatDeLaDuree, formatsQuiFiltrent, libelleEnvie, minutesDeLecture,
  paragraphesLus, resumeFormats, themesAvecCours, typoCours,
  type Cours, type TexteCours,
} from "@/lib/coursNutrition";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log(`${bon ? "✓" : "✗"} ${nom}${detail ? ` · ${detail}` : ""}`);
}

const NBSP = " ";
const lire = (p: string) => readFileSync(p, "utf8");
const apostrophes = (s: string) => s.replace(/['’]/g, "’");

/* ── 1. L'index et les textes se répondent ─────────────────────────── */
const ids = COURS.map((c) => c.id);
verdict("chaque cours a un identifiant unique", new Set(ids).size === ids.length);
verdict("les identifiants s'écrivent en minuscules et tirets", ids.every((id) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)),
  ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)).join(", "));
const cles = Object.keys(TEXTES);
verdict("la table des textes et l'index se répondent",
  cles.length === ids.length && cles.every((k) => ids.includes(k)),
  `index : ${ids.join(", ")} · textes : ${cles.join(", ")}`);
const fichiers = readdirSync("src/lib/textesCours").filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""));
verdict("chaque fichier de lib/textesCours est dans l'index, et l'inverse",
  fichiers.length === ids.length && fichiers.every((f) => ids.includes(f)), fichiers.join(", "));

const textes = new Map<string, TexteCours>();
for (const c of COURS) {
  try { textes.set(c.id, await chargerTexte(c.id)); }
  catch (e) { verdict(`le texte de « ${c.id} » se charge`, false, String(e)); }
}
verdict("chaque texte se charge par `chargerTexte`", textes.size === COURS.length);

/* ── 2. Chaque cours est complet ───────────────────────────────────── */
for (const c of COURS) {
  const t = textes.get(c.id);
  if (!t) continue;
  const titres = t.sections.map((s) => s.titre);
  verdict(`« ${c.id} » : une intro, des parties et un « À retenir »`,
    t.intro.length > 0 && t.sections.length > 0 && t.sections.every((s) => s.paragraphes.length > 0)
    && t.retenir.trim().length > 0);
  verdict(`« ${c.id} » : un encadré facultatif présent n'est jamais vide`,
    (t.exemple === undefined || t.exemple.length > 0) && (t.doute === undefined || t.doute.length > 0)
    && (t.essai === undefined || t.essai.trim().length > 0));
  verdict(`« ${c.id} » : deux parties ne portent pas le même titre`, new Set(titres).size === titres.length);
  const paras = paragraphesLus(t);
  const malFinis = paras.filter((p) => !/[.?!…»)]$/.test(p.trim()));
  verdict(`« ${c.id} » : chaque paragraphe finit par une ponctuation`, malFinis.length === 0, malFinis[0]?.slice(-40) ?? "");
}

/* Les encadrés de fin restent l'exception (Louis, 2026-10-25 : « il ne faut
   pas blablater pour blablater ») : « À retenir » partout, l'exemple, le doute
   et « Essaie ça » seulement là où ils servent. */
const avecEncadre = COURS.filter((c) => {
  const t = textes.get(c.id);
  return !!t && (!!t.exemple || !!t.doute || !!t.essai);
});
verdict("les encadrés facultatifs restent l'exception (au plus un cours sur deux en porte un)",
  avecEncadre.length * 2 <= COURS.length, `${avecEncadre.length} sur ${COURS.length}`);

/* ── 3. La durée suit le texte, et le format suit la durée ─────────── */
for (const c of COURS) {
  const t = textes.get(c.id);
  if (!t) continue;
  const m = minutesDeLecture(t);
  verdict(`« ${c.id} » : l'index dit ${c.minutes} min, le texte se lit en ${m} min`, m === c.minutes);
  verdict(`« ${c.id} » : ${c.minutes} min, c'est le format « ${c.format} »`, formatDeLaDuree(c.minutes) === c.format,
    `attendu : ${formatDeLaDuree(c.minutes) ?? "aucun (entre deux formats)"}`);
}
verdict("six minutes ne font ni un cours ni un dossier", formatDeLaDuree(6) === null);
verdict("les durées des formats ne se chevauchent pas",
  ORDRE_FORMATS.every((f, i) => i === 0 || DUREES[ORDRE_FORMATS[i - 1]].max < DUREES[f].min));

/* ── 4. La photo, l'envie, le thème, la date, le carnet ────────────── */
const aujourdhui = new Date().toISOString().slice(0, 10);
for (const c of COURS) {
  const recette = RECIPES.find((r) => r.id === c.photo);
  verdict(`« ${c.id} » : la photo est une recette de la banque`, !!recette, c.photo);
  verdict(`« ${c.id} » : le fichier de la photo existe`, existsSync(`public${imageRecette(c.photo)}`), imageRecette(c.photo));
  verdict(`« ${c.id} » : son thème existe`, THEMES_COURS.some((t) => t.id === c.theme), c.theme);
  if (c.envie) verdict(`« ${c.id} » : l'envie « ${c.envie} » existe`, ENVIES.some((e) => e.id === c.envie));
  verdict(`« ${c.id} » : la date de vérification est un jour passé`,
    /^\d{4}-\d{2}-\d{2}$/.test(c.verifieLe) && !Number.isNaN(Date.parse(c.verifieLe)) && c.verifieLe <= aujourdhui, c.verifieLe);
  const carnet = `docs/cours-nutrition/carnet-lot-${c.lot}.md`;
  const texteCarnet = existsSync(carnet) ? apostrophes(lire(carnet)) : "";
  verdict(`« ${c.id} » : son carnet de recherche existe et le nomme`,
    texteCarnet.includes(apostrophes(c.titre)), carnet);
  const t = textes.get(c.id);
  if (!t || !texteCarnet) continue;
  const liens = t.sources.flatMap((g) => g.liens);
  verdict(`« ${c.id} » : au moins deux sources`, liens.length >= 2, `${liens.length}`);
  verdict(`« ${c.id} » : chaque groupe de sources a un lien`, t.sources.every((g) => g.liens.length > 0));
  verdict(`« ${c.id} » : chaque source est en https`, liens.every((l) => l.url.startsWith("https://")));
  verdict(`« ${c.id} » : aucune source deux fois`, new Set(liens.map((l) => l.url)).size === liens.length);
  const absentes = liens.filter((l) => !texteCarnet.includes(l.url));
  verdict(`« ${c.id} » : chaque source affichée est listée dans son carnet (donc lue)`, absentes.length === 0,
    absentes.map((l) => l.url).join(" "));
}
const photos = COURS.map((c) => c.photo);
verdict("une photo n'illustre qu'un seul cours", new Set(photos).size === photos.length);

/* ── 5. La typographie se pose au rendu ────────────────────────────── */
const cas: [string, string][] = [
  ["Un jus d’orange compte-t-il comme un fruit ?", `Un jus d’orange compte-t-il comme un fruit${NBSP}?`],
  ["un kilo de graisse correspond à 7 700 kcal", `un kilo de graisse correspond à 7${NBSP}700${NBSP}kcal`],
  ["environ 15 % de calories", `environ 15${NBSP}% de calories`],
  ["un « sucre libre », comme", `un «${NBSP}sucre libre${NBSP}», comme`],
  ["Si tu ne dînes qu’à 22 h, prends", `Si tu ne dînes qu’à 22${NBSP}h, prends`],
  ["1,25 à 1,5 l par kilo perdu", `1,25 à 1,5${NBSP}l par kilo perdu`],
  ["En 2018, l'essai DIETFITS", "En 2018, l’essai DIETFITS"],
  ["Pour une personne de 70 kg, ça donne 18 à 21 g.", `Pour une personne de 70${NBSP}kg, ça donne 18 à 21${NBSP}g.`],
  ["2 000 UI par jour", `2${NBSP}000${NBSP}UI par jour`],
  ["15 microgrammes par jour", `15${NBSP}microgrammes par jour`],
  ["pour 0,06 € la minute", `pour 0,06${NBSP}€ la minute`],
  ["répond au 0810 037 037, quatre jours", `répond au 0810${NBSP}037${NBSP}037, quatre jours`],
];
for (const [brut, attendu] of cas) {
  verdict(`typoCours : « ${brut} »`, typoCours(brut) === attendu, JSON.stringify(typoCours(brut)));
}

const tout: { ou: string; s: string }[] = [];
for (const c of COURS) {
  tout.push({ ou: `${c.id} (titre)`, s: c.titre }, { ou: `${c.id} (sous-titre)`, s: c.sousTitre });
  const t = textes.get(c.id);
  if (!t) continue;
  t.sections.forEach((s) => tout.push({ ou: `${c.id} (partie)`, s: s.titre }));
  paragraphesLus(t).forEach((p) => tout.push({ ou: c.id, s: p }));
  t.sources.forEach((g) => { tout.push({ ou: `${c.id} (sources)`, s: g.groupe }); g.liens.forEach((l) => tout.push({ ou: `${c.id} (sources)`, s: l.label })); });
}
const fautes = (re: RegExp) => tout.filter((x) => re.test(x.s));
const premiere = (l: { ou: string; s: string }[]) => (l[0] ? `${l[0].ou} : ${l[0].s.slice(0, 70)}` : "");
for (const [nom, re] of [
  ["aucun tiret cadratin ni demi-cadratin", /[—–]/],
  ["aucune double espace", / {2}/],
  ["aucune espace avant une virgule ou un point", / [,.]/],
  ["aucun guillemet droit", /"/],
  ["des points de suspension d'un seul signe", /\.\.\./],
  ["le texte s'écrit avec des espaces ordinaires (la typographie se pose au rendu)", /[  ]/],
] as [string, RegExp][]) {
  const l = fautes(re);
  verdict(nom, l.length === 0, premiere(l));
}
const rendus = tout.map((x) => ({ ou: x.ou, s: typoCours(x.s) }));
const malPoses = rendus.filter((x) => / [:;?!%»]|« /.test(x.s));
verdict("au rendu, une espace insécable devant « : ; ? ! % » et dans les guillemets", malPoses.length === 0, premiere(malPoses));
const unites = rendus.filter((x) => /\d (g|kg|mg|kcal|kJ|ml|cl|l|h|min)(?![\p{L}’'])/u.test(x.s));
verdict("au rendu, un nombre ne se sépare jamais de son unité", unites.length === 0, premiere(unites));
verdict("la typographie ne se pose qu'une fois (deux passages rendent la même chose)",
  tout.every((x) => typoCours(typoCours(x.s)) === typoCours(x.s)));

/* ── 6. Aucun genre supposé, aucun reproche, aucune promesse ───────── */
const GENRE = /\(e\)|\(se\)|·e\b|\btu (?:es|étais|seras|serais|te sens|te sentiras|restes|deviens|te retrouves)(?: \S+)? (?:contente?|prête?|fière?|fier|motivée?|fatiguée?|heureux|heureuse|seule?|sûre?|perdue?|déçue?|obligée?|rassasiée?|affamée?|calée?|épuisée?|stressée?|crevée?|motivé)\b/iu;
let l = fautes(GENRE);
verdict("aucun accord de genre pour la personne qui lit", l.length === 0, premiere(l));
const REPROCHE = /\bcraqu|kilos en trop|\btrich|\bculpabil|\b(?:faire|fait|fais|faites) (?:un|des) écarts?\b|\bmauvais aliments?\b|\baliments? interdits?\b|\bil faut absolument\b/iu;
l = fautes(REPROCHE);
verdict("aucun reproche (craquer, kilos en trop, tricher, faire un écart…)", l.length === 0, premiere(l));
const PROMESSE = /\bmiracle|brûle[- ]graisses?|\bdétox|ventre plat|sans effort|garanti|\bfenêtre anabolique de|métabolisme se bloque/iu;
l = fautes(PROMESSE);
verdict("aucune promesse ni idée reçue présentée comme vraie", l.length === 0, premiere(l));

/* ── 7. Les règles du sommaire ─────────────────────────────────────── */
const fauxCours = (format: Cours["format"], theme: Cours["theme"] = "bases"): Cours => ({
  id: `faux-${Math.random()}`, titre: "x", sousTitre: "x", format, minutes: DUREES[format].min, acces: "gratuit",
  theme, photo: "x", lot: 0, verifieLe: "2026-10-25",
});
verdict("un flash, un cours, un dossier : aucune puce ne change la liste", formatsQuiFiltrent([fauxCours("flash"), fauxCours("cours"), fauxCours("dossier")]).length === 0);
verdict("deux flashs sur trois : la puce Flash apparaît", formatsQuiFiltrent([fauxCours("flash"), fauxCours("flash"), fauxCours("cours")]).join() === "flash");
verdict("rien que des flashs : aucune puce (elle montrerait tout)", formatsQuiFiltrent([fauxCours("flash"), fauxCours("flash")]).length === 0);
verdict("le résumé du sommaire compte chaque format", resumeFormats([fauxCours("flash"), fauxCours("cours"), fauxCours("dossier"), fauxCours("flash")])
  === `4${NBSP}cours · 2${NBSP}flashs, 1${NBSP}cours, 1${NBSP}dossier`, resumeFormats([fauxCours("flash"), fauxCours("cours"), fauxCours("dossier"), fauxCours("flash")]));
const themes = themesAvecCours([fauxCours("flash", "rapport"), fauxCours("cours", "entrainement")]);
verdict("un thème sans cours ne s'affiche pas, et l'ordre est celui du sommaire", themes.map((t) => t.id).join() === "entrainement,rapport");
verdict("la date de vérification se lit en français", dateLisible("2026-10-25") === `25${NBSP}octobre 2026` && dateLisible("2026-11-01") === `1er${NBSP}novembre 2026`);
verdict("le bouton du bas nomme l'envie", libelleEnvie("Après le sport") === `Voir les recettes «${NBSP}Après le sport${NBSP}»`);
verdict("chaque format a son nom au singulier et au pluriel", ORDRE_FORMATS.every((f) => NOM_FORMAT[f].un && NOM_FORMAT[f].plusieurs));

/* ── 8. Le chemin, dans la source ──────────────────────────────────── */
const sourcesSrc: string[] = [];
(function marcher(d: string) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) marcher(p);
    else if (/\.(tsx?|mjs)$/.test(e.name)) sourcesSrc.push(p);
  }
})("src");
const importeTextes = sourcesSrc.filter((p) => !p.endsWith("lib/coursNutrition.ts") && !p.includes("lib/textesCours/")
  && /textesCours\//.test(lire(p)));
verdict("seul lib/coursNutrition charge les textes (rien ne les embarque dans l'écran)", importeTextes.length === 0, importeTextes.join(", "));
const lecteur = lire("src/components/nutrition/LecteurCours.tsx");
verdict("le lecteur charge son texte à l'ouverture", lecteur.includes("chargerTexte(cours.id)"));
verdict("le lecteur montre la photo du plat, jamais une salle de sport",
  lecteur.includes("imageRecette(cours.photo)") && !lecteur.includes("/entrainement/"));
verdict("le lecteur signe le cours du visage du Guide", lecteur.includes("<VisageGuide"));
verdict("le lecteur ne dessine l'exemple et le doute que s'ils existent",
  lecteur.includes("texte.exemple && texte.exemple.length > 0") && lecteur.includes("texte.doute && texte.doute.length > 0"));
verdict("le lecteur note le cours lu à son « À retenir »", lecteur.includes("ref={retenir}") && lecteur.includes("marquerLu("));
const rangee = lire("src/components/nutrition/ComprendreNutrition.tsx");
verdict("la rangée garde son ancre (le détail de la journée y renvoie)", rangee.includes('id="nutrition-comprendre"'));
verdict("la rangée ne lit plus les conseils d'entraînement", !rangee.includes("adviceArticles"));
const ecran = lire("src/components/NutritionTab.tsx");
verdict("le retour du téléphone ferme le lecteur", /useRetourTelephone\(coursOuvert !== null/.test(ecran));
verdict("le retour du téléphone ferme « Tous les cours »", /useRetourTelephone\(vue\.nom === "cours"/.test(ecran));
verdict("une envie ouverte depuis un cours attend que le lecteur ait rendu sa place", /envieDepuisCours[\s\S]{0,900}popstate/.test(ecran));

console.log(echecs === 0 ? "\n✓ check:cours : tout passe." : `\n✗ check:cours : ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
