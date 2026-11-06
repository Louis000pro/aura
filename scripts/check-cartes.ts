/* ═══════════════════════════════════════════════════════════════════════
   check:cartes, le banc des cartes Vaiiya.

     npm run check:cartes

   ⚠️ IL EXERCE LE VRAI CATALOGUE (`lib/cartes/catalogue.ts`, pur), puis il
   regarde le disque et il lit la source des écrans.

   CE QU'IL PROTÈGE (Louis, 2026-11-06, maquette « Les cartes Vaiiya ») :
   · aucun chiffre de jeu : ni attaque, ni vie ;
   · une carte gagnée ne se perd jamais, et rien n'est deviné (ni une date,
     ni un Guide) ;
   · une image manquante ne casse ni le typecheck ni le build : elle laisse
     un trou en production, donc chaque fichier se vérifie ici ;
   · une seule carte vivante à l'écran, et le moteur hors du démarrage ;
   · la pochette pour les rangs, les relais et les programmes, jamais pour
     une flamme ni un mouvement.
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { RANGS } from "@/lib/aura";
import { SERIES } from "@/lib/defi";
import { PALIERS_FLAMME } from "@/lib/flammesSerie";
import { EXERCISE_LIBRARY } from "@/lib/exerciseLibrary";
import { PROGRAMMES } from "@/lib/parcours";
import { resolveGuide } from "@/lib/exerciseGuides";
import {
  GRAVURES_PROGRAMME, NOMBRE_MOUVEMENTS, PLACES_VITRINE, basculerChoix, carteRang, choixPossibles, compterGagnees, construireCollection,
  dateGravee, derniereCarte, rangsGagnes, totalCollection, toutes, vitrineDe, type CarteDef, type SourcesCollection,
} from "@/lib/cartes/catalogue";
import { cartesMouvements, titreMouvement } from "@/lib/cartes/mouvements";
import { MATIERES_FLAMME, MATIERES_RANG, MATIERES_RELAIS } from "@/lib/cartes/matieres";
import { duoDe } from "@/lib/cartes/lecture";

let echecs = 0;
let total = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  total++;
  if (!bon) echecs++;
  if (!bon || process.argv.includes("--tout")) console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " · " + detail : ""));
}

const lire = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");
const pub = (url: string) => existsSync(path.join(process.cwd(), "public", url));

const base: SourcesCollection = { pseudo: "Louis", numero: 72, rangId: "or", serie: 12, slugs: new Set(), guide: "nora" };

/* ── Le catalogue suit les autorités ───────────────────────────────────── */

verdict("les rangs des cartes sont ceux de l'app", MATIERES_RANG.map((m) => m.id).join() === RANGS.map((r) => r.id).join());
verdict("chaque rang porte le nom de l'app", MATIERES_RANG.every((m, i) => m.nom === RANGS[i].nom));
verdict("les flammes des cartes sont celles de la série", PALIERS_FLAMME.every((p) => !!MATIERES_FLAMME[p.id]));
verdict("chaque relais a sa matière", Object.keys(SERIES).every((s) => !!MATIERES_RELAIS[s]));
for (const p of PROGRAMMES) verdict(`le programme ${p.id} a sa gravure`, !!GRAVURES_PROGRAMME[p.id]);
verdict("le nombre de mouvements suit la bibliothèque", NOMBRE_MOUVEMENTS === EXERCISE_LIBRARY.length, `${NOMBRE_MOUVEMENTS} / ${EXERCISE_LIBRARY.length}`);

const c = construireCollection(base);
verdict("124 cartes au total", totalCollection(c) === 124, String(totalCollection(c)));
verdict("identifiants uniques", new Set(toutes(c).map((x) => x.id)).size === toutes(c).length);

/* ── Aucune carte ne porte un chiffre de jeu ───────────────────────────── */

const mouvements = cartesMouvements(["Pompes"]);
const interdit = /attaque|défense|\bvie\b|\bPV\b|\bHP\b|dégâts|puissance/i;
for (const x of [...toutes(c), ...mouvements.slice(0, 5)]) {
  const textes = [x.titre, x.sous, x.fiche.ligne, x.fiche.pied, ...x.fiche.faits.map(([, l]) => l)].join(" ");
  verdict(`${x.id} sans chiffre de jeu`, !interdit.test(textes), textes);
}
verdict("le dessin d'une face n'écrit aucun chiffre de jeu", !/attaque|\bPV\b|\bHP\b/i.test(lire("src/lib/cartes/faces.ts").replace(/\/\*[\s\S]*?\*\//g, "")));

/* ── Les rangs ─────────────────────────────────────────────────────────── */

verdict("Or : les trois premiers rangs sont gagnés", c.rangs.filter((x) => x.gagnee).map((x) => x.nom).join() === "Bronze,Argent,Or");
{
  const sans = construireCollection({ ...base, rangId: null });
  verdict("rang inconnu : aucune carte de rang n'est affirmée", sans.rangs.every((x) => !x.gagnee));
}
{
  const r = carteRang("or", { pseudo: "Louis", numero: 72, atteintLe: "2026-09-28", seances: 21, jours: 145 });
  verdict("la carte grave la date en capitales", r.face.genre === "rang" && r.face.date === "28 SEPT. 2026", String(r.face.genre === "rang" && r.face.date));
  verdict("le dos dit les séances, les jours et le numéro", r.fiche.faits.length === 3 && r.fiche.faits[2][0] === "072");
  verdict("la phrase du dos dit le jour du rang", r.fiche.ligne === "Rang Or, atteint le 28 septembre 2026", r.fiche.ligne);
  const nue = carteRang("or", { pseudo: "Louis" });
  verdict("sans lecture de la base, aucune date ni chiffre inventé", nue.face.genre === "rang" && nue.face.date === null && nue.fiche.faits.length === 0 && nue.fiche.ligne === "Rang Or");
  const un = carteRang("or", { pseudo: "Louis", seances: 1, jours: 1 });
  verdict("une séance, un jour : au singulier", un.fiche.faits[0][1] === "séance" && un.fiche.faits[1][1] === "jour");
  const b = carteRang("bronze", { pseudo: "Louis", numero: 7, inscritLe: "2026-05-06" });
  verdict("le Bronze se date à l'inscription", b.fiche.ligne === "Membre depuis le 6 mai 2026", b.fiche.ligne);
}
verdict("une date illisible ne s'écrit pas", dateGravee("hier") === null && dateGravee(null) === null);
verdict("le rail d'une carte : du premier rang à l'actuel", rangsGagnes("or", null, "Louis").map((x) => x.nom).join() === "Bronze,Argent,Or");

/* ── Une flamme gagnée ne se perd jamais ───────────────────────────────── */

const flammes = (o: Partial<SourcesCollection>) => construireCollection({ ...base, ...o }).flammes.filter((x) => x.gagnee).map((x) => x.nom).join();
verdict("12 jours : Lueur, Flamme, Feu", flammes({ serie: 12 }) === "Lueur,Flamme,Feu", flammes({ serie: 12 }));
verdict("une série cassée garde la flamme du record", flammes({ serie: 1, record: 31 }) === "Lueur,Flamme,Feu,Brasier", flammes({ serie: 1, record: 31 }));
verdict("une série cassée garde la flamme vue sur l'appareil", flammes({ serie: 1, record: 2, flammeMax: 8 }) === "Lueur,Flamme,Feu");
verdict("chez un ami, les badges disent la plus longue série", flammes({ serie: 2, slugs: new Set(["regularite-100"]) }).endsWith("Feu sacré"));
verdict("zéro jour : aucune flamme", flammes({ serie: 0 }) === "");
verdict("une flamme sans date connue n'en écrit pas", c.flammes.every((x) => x.face.genre === "flamme" && x.face.date === null));

/* ── Les programmes et le Guide ────────────────────────────────────────── */

{
  const p = construireCollection({ ...base, slugs: new Set(["programme-cent-pompes"]) }).programmes;
  const cent = p.find((x) => x.id === "prog-cent-pompes");
  verdict("un programme se gagne par son badge", !!cent?.gagnee && p.filter((x) => x.gagnee).length === 1);
  verdict("la carte montre le Guide choisi", cent?.face.genre === "programme" && cent.face.pose === "/cartes/pose-nora-approuve.webp" && !!cent.vignette?.endsWith("-nora.webp"));
  const sans = construireCollection({ ...base, guide: null }).programmes[0];
  verdict("sans Guide, personne : on ne choisit pas à sa place", sans.face.genre === "programme" && sans.face.pose === null && !!sans.vignette?.endsWith("-sans.webp"));
  const d = construireCollection({ ...base, programmes: [{ id: "premiere-traction", finiLe: "2026-10-03", depart: 0, fin: 2 }] }).programmes[0];
  verdict("le dos d'un programme dit le départ et l'arrivée", d.fiche.faits[0][1] === "au départ" && d.fiche.faits[1][1] === "à l’arrivée" && d.gagnee);
}

/* ── Les relais ────────────────────────────────────────────────────────── */

{
  const r = construireCollection({ ...base, slugs: new Set(["serie-aurore"]) }).relais;
  verdict("un relais se gagne par son badge", r.filter((x) => x.gagnee).map((x) => x.nom).join() === "Aurore");
  verdict("sans le détail, la carte porte le seul pseudo", r[1].face.genre === "relais" && r[1].face.duo === "LOUIS");
  verdict("deux prénoms sur une carte", duoDe("Louis", ["Marc"]) === "LOUIS & MARC", duoDe("Louis", ["Marc"]));
  verdict("en groupe, ça tient encore sur une carte", duoDe("Louis", ["Marc", "Sarah", "Teo"]) === "LOUIS & 3 AUTRES");
}

/* ── La vitrine ────────────────────────────────────────────────────────── */

{
  const riche = construireCollection({
    ...base,
    slugs: new Set(["serie-sillage", "programme-fessiers"]),
    relais: [{ serie: "sillage", jour: "2026-09-14", duo: "LOUIS & MARC", objectif: 4, aDeux: true }],
    programmes: [{ id: "fessiers", finiLe: "2026-10-01", depart: 1, fin: 2 }],
  });
  const v = vitrineDe(riche, { combler: true });
  verdict("la vitrine : le rang, le relais, le programme", v.map((x) => x.nom).join() === "Or,Sillage,Fessiers", v.map((x) => x.nom).join());
  const neuf = construireCollection({ ...base, rangId: "bronze", serie: 1, cartes: null });
  const n = vitrineDe(neuf, { combler: true });
  verdict("un compte neuf : Bronze, Lueur, et le rang suivant éteint", n.map((x) => `${x.nom}:${x.gagnee}`).join() === "Bronze:true,Lueur:true,Argent:false", n.map((x) => `${x.nom}:${x.gagnee}`).join());
  const ami = vitrineDe(neuf, { combler: false });
  verdict("chez un ami, jamais une carte qu'il n'a pas", ami.every((x) => x.gagnee) && ami.length === 2);
  verdict("une carte n'est jamais posée deux fois", new Set(v.map((x) => x.id)).size === v.length);
  verdict("la dernière carte est la plus récente datée", derniereCarte(riche)?.nom === "Fessiers", derniereCarte(riche)?.nom);
  verdict("le compte des cartes gagnées", compterGagnees(riche) === 3 + 3 + 1 + 1, String(compterGagnees(riche)));
}

/* ── La vitrine choisie ────────────────────────────────────────────────── */

{
  const ids = (l: readonly CarteDef[]) => l.map((x) => x.id).join();
  const riche = construireCollection({
    ...base,
    slugs: new Set(["serie-sillage", "programme-fessiers"]),
    relais: [{ serie: "sillage", jour: "2026-09-14", duo: "LOUIS & MARC", objectif: 4, aDeux: true }],
    programmes: [{ id: "fessiers", finiLe: "2026-10-01", depart: 1, fin: 2 }],
  });
  const auto = vitrineDe(riche, { combler: true });
  verdict("sans choix, Vaiiya compose comme avant", ids(vitrineDe(riche, { combler: true, choix: null })) === ids(auto), ids(auto));
  verdict(
    "les cartes choisies, dans leur ordre",
    ids(vitrineDe(riche, { combler: true, choix: ["prog-fessiers", "flamme-feu", "rang-argent"] })) === "prog-fessiers,flamme-feu,rang-argent",
  );
  verdict(
    "une place libre, Vaiiya la remplit",
    ids(vitrineDe(riche, { combler: true, choix: ["rang-bronze"] })) === "rang-bronze,rang-or,relais-sillage",
    ids(vitrineDe(riche, { combler: true, choix: ["rang-bronze"] })),
  );
  verdict(
    "une carte choisie n'est pas posée deux fois",
    ids(vitrineDe(riche, { combler: true, choix: ["rang-or", "rang-or", "flamme-feu"] })) === "rang-or,flamme-feu,relais-sillage",
    ids(vitrineDe(riche, { combler: true, choix: ["rang-or", "rang-or", "flamme-feu"] })),
  );
  const force = vitrineDe(riche, { combler: false, choix: ["rang-eternel", "flamme-sacre", "relais-brume", "prog-cent-pompes"] });
  verdict("une carte pas gagnée n'entre pas, même écrite à la main", force.every((x) => x.gagnee), ids(force));
  verdict("sans rien de valable, on retombe sur Vaiiya", ids(force) === ids(vitrineDe(riche, { combler: false })), ids(force));
  verdict("un identifiant inconnu ne casse rien", ids(vitrineDe(riche, { combler: true, choix: ["n-importe-quoi"] })) === ids(auto));
  verdict(
    "jamais plus de trois cartes",
    vitrineDe(riche, { combler: true, choix: ["rang-or", "rang-argent", "rang-bronze", "flamme-feu"] }).length === PLACES_VITRINE,
  );

  // Un autre membre ne connaît que ce que la base dit de ce compte.
  const vuDehors = (flamme: number) => construireCollection({ pseudo: "Marc", rangId: "argent", serie: 0, flammeMax: flamme, slugs: new Set(), guide: null, public: true });
  verdict("chez un ami, une flamme se prouve par le palier de la base", vitrineDe(vuDehors(3), { combler: false, choix: ["flamme-flamme"] })[0]?.id === "flamme-flamme");
  verdict("sans cette preuve, sa flamme ne s'affiche pas", !vitrineDe(vuDehors(0), { combler: false, choix: ["flamme-flamme"] }).some((x) => x.id === "flamme-flamme"));

  const familles = choixPossibles(riche);
  verdict("on choisit parmi les quatre familles gagnées", familles.map((f) => f.titre).join() === "Les rangs,Les flammes,Les programmes,Les relais", familles.map((f) => f.titre).join());
  verdict("uniquement ce qui est gagné", familles.every((f) => f.cartes.every((x) => x.gagnee)));
  verdict("la plus haute carte d'abord", familles[0].cartes[0].id === "rang-or" && familles[1].cartes[0].id === "flamme-feu", familles[1].cartes[0].id);
  verdict("une famille sans carte ne s'affiche pas", choixPossibles(construireCollection({ ...base, rangId: "bronze", serie: 1, cartes: null })).map((f) => f.titre).join() === "Les rangs,Les flammes");
  verdict("pas de mouvements : leur carnet vit sur l'appareil", familles.flatMap((f) => f.cartes).every((x) => x.famille !== "mouvements"));
  verdict("le compte du profil est celui du choix", compterGagnees(riche) === familles.flatMap((f) => f.cartes).length);

  verdict("toucher une carte l'ajoute à la suite", basculerChoix(["a"], "b").join() === "a,b");
  verdict("la toucher encore la retire", basculerChoix(["a", "b"], "a").join() === "b");
  verdict("places pleines, elle prend la dernière", basculerChoix(["a", "b", "c"], "d").join() === "a,b,d", basculerChoix(["a", "b", "c"], "d").join());
}

/* ── Les mouvements ────────────────────────────────────────────────────── */

verdict("102 cartes de mouvement", mouvements.length === 102);
verdict("le carnet allume ce qu'il a découvert", mouvements.filter((m) => m.gagnee).map((m) => m.nom).join() === "Pompes");
verdict("les identifiants suivent l'ordre de la bibliothèque", mouvements[11].id === "mv-12" && mouvements[11].nom === EXERCISE_LIBRARY[11].name);
for (const m of EXERCISE_LIBRARY) {
  verdict(`${m.name} a son personnage`, !!resolveGuide(m.name));
  const t = titreMouvement(m.name);
  verdict(`${m.name} : deux lignes au plus, jamais dans un mot`, t.split("\n").length <= 2 && t.replace("\n", " ") === m.name.toUpperCase(), t);
}

/* ── La pochette : les rangs, les relais, les programmes ───────────────── */

verdict("une flamme n'a pas de pochette", c.flammes.every((x) => x.pochette === null));
verdict("un mouvement n'a pas de pochette", mouvements.every((x) => x.pochette === null));
verdict("un rang, un relais, un programme en ont une", [...c.rangs, ...c.relais, ...c.programmes].every((x) => !!x.pochette && !!x.vignettePochette));

/* ── Le disque : une image manquante laisserait un trou en production ──── */

for (const guide of ["nora", "sasha", null] as const) {
  const col = construireCollection({ ...base, guide });
  for (const x of toutes(col)) {
    if (x.vignette) verdict(`vignette ${x.vignette}`, pub(x.vignette));
    if (x.vignettePochette) verdict(`vignette ${x.vignettePochette}`, pub(x.vignettePochette));
    if (x.face.genre === "programme" && x.face.pose) verdict(`pose ${x.face.pose}`, pub(x.face.pose));
    if (x.face.genre === "relais") verdict(`paysage du relais ${x.face.serie}`, pub(`/cartes/art-relais-${x.face.serie}.webp`));
    if (x.pochette) verdict(`paysage de pochette ${x.pochette.art}`, pub(x.pochette.art));
  }
}
for (const m of MATIERES_RANG) verdict(`images du rang ${m.id}`, pub(m.art) && pub(m.em));
for (const p of PALIERS_FLAMME) verdict(`emblème ${p.id}`, pub(`/cartes/em-flamme-${p.id}.webp`));
for (const f of ["art-dos", "art-flamme", "art-programme", "art-mouvement", "froisse", "panorama", "v/dos"]) verdict(`/cartes/${f}.webp`, pub(`/cartes/${f}.webp`));
for (const m of mouvements) verdict(`${m.nom} : sa pose est sur le disque`, m.face.genre === "mouvement" && pub(m.face.sprite));

/* ── Le chemin ─────────────────────────────────────────────────────────── */

function fichiers(d: string, sortie: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    if (statSync(p).isDirectory()) fichiers(p, sortie);
    else if (/\.tsx?$/.test(p)) sortie.push(p.replace(/\\/g, "/"));
  }
  return sortie;
}
const sources = fichiers("src").map((f) => ({ f, s: readFileSync(f, "utf8") }));

const vivants = sources.filter(({ f, s }) => /from "[^"]*\/CarteVivante"/.test(s) && !f.endsWith("CarteVivante.tsx")).map(({ f }) => path.basename(f)).sort();
verdict("une seule carte vivante à l'écran : la feuille et le gain, jamais une grille", vivants.join() === "FeuilleCarte.tsx,GainCarte.tsx", vivants.join());
const statiques = sources.filter(({ f, s }) => /^import [^;]*from "@\/lib\/cartes\/(moteur|faces|live)"/m.test(s) && !f.includes("/lib/cartes/") && !/^import type/m.test(s.match(/^import [^;]*from "@\/lib\/cartes\/(moteur|faces|live)"/m)?.[0] ?? "")).map(({ f }) => f);
verdict("le moteur ne se charge qu'à l'ouverture d'une carte", statiques.length === 0, statiques.join());
verdict("le moteur ne garde pas son tampon", !/preserveDrawingBuffer: *true/.test(lire("src/lib/cartes/moteur.ts")));
verdict("le plancher qui évite les points noirs est là", /max\(fwidth\(sd\)\*1\.2,\.0004\)/.test(lire("src/lib/cartes/moteur.ts")));
verdict("aucun identifiant accentué dans le shader", !/(float|vec[234]|int) [a-z]*[éèêàç]/i.test(lire("src/lib/cartes/moteur.ts").replace(/\/\/.*$/gm, "")));
verdict("l'ancienne carte est partie", !existsSync("src/components/rang/CarteRang.tsx") && !existsSync("src/hooks/useInclinaison.ts"));
verdict("une carte éteinte n'a pas de cadenas", !/Lock/.test(lire("src/components/cartes/CollectionCartes.tsx") + lire("src/components/cartes/VitrineCartes.tsx")));
verdict("la vitrine d'un ami ne propose pas de partager sa carte", /partage=\{false\}/.test(lire("src/components/cartes/VitrinePublique.tsx")));
verdict("le catalogue reste pur", !/createClient|localStorage|document\.|window\.|Date\.now|new Date\(\)/.test(lire("src/lib/cartes/catalogue.ts")));
verdict("la vitrine n'embarque pas la bibliothèque d'exercices", !/exerciseLibrary|cartes\/mouvements/.test(lire("src/lib/cartes/catalogue.ts") + lire("src/components/cartes/EtageCartes.tsx") + lire("src/components/cartes/VitrineCartes.tsx") + lire("src/hooks/useCollectionCompte.ts")));
verdict("un gain passe par la pochette : le rang, le relais, le programme", ["src/components/rang/SceneRang.tsx", "src/app/defi/page.tsx", "src/components/parcours/FinParcours.tsx"].every((f) => /deposerPochette\(/.test(lire(f)) && /<GainCarte/.test(lire(f))));
verdict("un geste n'est jamais la seule façon d'ouvrir une pochette", /<button[^>]*onClick=\{\(\) => void ouvrir\(\)\}/.test(lire("src/components/cartes/GainCarte.tsx")));
verdict("le moteur se libère en partant", /loseContext/.test(lire("src/lib/cartes/moteur.ts")) && /l\?\.detruire\(\)/.test(lire("src/components/cartes/CarteVivante.tsx")));
verdict("la pochette carrée ne reste pas derrière la carte arrondie", /fond=\{etat === "poche" \?/.test(lire("src/components/cartes/GainCarte.tsx")));
{
  // `mouvementDuJour.ts` lit ce dossier, et une route serveur le lit : un hook y casserait le build.
  const avecHook = sources.filter(({ f, s }) => f.includes("/lib/cartes/") && /(?:from|import) "(?:react"|@\/hooks\/)/.test(s)).map(({ f }) => f);
  verdict("aucun hook dans les règles des cartes", avecHook.length === 0, avecHook.join());
}

{
  const etage = lire("src/components/cartes/EtageCartes.tsx");
  const publique = lire("src/components/cartes/VitrinePublique.tsx");
  const choix = lire("src/components/cartes/ChoixVitrine.tsx");
  const lecture = lire("src/lib/cartes/lecture.ts");
  verdict("« Changer » n'existe que si la base a répondu et qu'il y a à choisir", /vitrineLue && compterGagnees\(collection\) > PLACES_VITRINE/.test(etage));
  verdict("le profil ne paie pas l'écran de choix", /dynamic\(\(\) => import\("\.\/ChoixVitrine"\)/.test(etage) && !/^import ChoixVitrine/m.test(etage));
  verdict("sa vitrine suit son choix", /combler: true, choix/.test(etage));
  verdict("celle d'un ami aussi", /combler: false, choix: vue\.vitrine\?\.choix/.test(publique));
  verdict("elle attend le rang et les badges", /if \(!pret/.test(publique) && /pret=\{!!aura && badgesLus\}/.test(lire("src/app/profil/[username]/page.tsx")));
  verdict("sa flamme est celle que dit la base", /flammeMax: vue\.vitrine\?\.flamme/.test(publique));
  verdict("rien ne s'écrit avant « Enregistrer »", !/createClient|enregistrerVitrine/.test(choix) && (choix.match(/onEnregistrer\(/g) ?? []).length === 1);
  verdict("un refus se dit", /role="alert"/.test(choix));
  verdict("la vitrine reste une colonne à part : l'accueil du compte ne la lit pas", !/vitrine_cartes/.test(lire("src/context/AuthContext.tsx")));
  const lecteurs = sources.filter(({ s }) => /\bvitrine_cartes\b/.test(s)).map(({ f }) => path.basename(f));
  verdict("une seule porte vers la colonne", lecteurs.join() === "lecture.ts", lecteurs.join());
  verdict("elle se lit par la fonction, jamais dans la table", /rpc\("vitrine_profil"/.test(lecture) && !/select\([^)]*vitrine_cartes/.test(lecture));
}

console.log(echecs ? `\n✗ ${echecs} échec(s) sur ${total} contrôles` : `✓ ${total} contrôles, tout passe`);
process.exit(echecs ? 1 : 0);
