/* ═══════════════════════════════════════
   check:premiers-pas · LE PREMIER CHEMIN, VÉRIFIÉ HORS LIGNE

     npm run check:premiers-pas
     npm run premiers-pas:donnees   (réécrit `lib/premiersPas/donnees.ts`)

   Le parcours ne charge ni le catalogue ni la banque de recettes : c'est le
   premier écran que voit quelqu'un, et il a besoin de compter, pas de lire.
   Il garde donc une petite table, et ce banc la recalcule depuis les vraies
   sources : une séance ajoutée au catalogue sans passer par ici le fait
   échouer, parce que le Guide annonce ces nombres.

   Il tient aussi ce que le typage ne voit pas : chaque image existe, pour
   Nora comme pour Sasha ; la typographie et le ton des phrases `pas.*` ; le
   passage des réponses vers le profil ; le CSS rangé sous `.pp-tel`.
   ═══════════════════════════════════════ */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { workoutSessions } from "@/lib/catalogueSeances";
import { EXP_BIENVENUE, EXP_CONNEXION, EXP_CONNEXION_SUITE, EXP_JOURNEE, EXP_REPAS, EXP_SEANCE, RANGS } from "@/lib/aura";
import { EXERCISE_LIBRARY } from "@/lib/exerciseLibrary";
import { voix, type CleVoix } from "@/lib/guides";
import { PROGRAMMES } from "@/lib/parcours";
import { etapesDansLOrdre, etapesDuCycle } from "@/lib/programme";
import { cycleDeReference } from "@/lib/planning";
import { DONNEES } from "@/lib/premiersPas/donnees";
import { etatVide, regimeDes, regimesDe, versLieu, versProfil } from "@/lib/premiersPas/reponses";
import { convient, regimeConnu } from "@/lib/collectionsRecettes";
import { GOALS } from "@/lib/profilVocabulaire";
import { RECIPES, type DietKey } from "@/lib/recipeBank";
import { exercicesDe, faisableAvec, materielDe } from "@/lib/trouverSeance";

let ok = 0, ko = 0;
const t = (nom: string, cond: boolean, info = "") => {
  if (cond) ok++;
  else ko++;
  console.log("[" + (cond ? "OK   " : "ECHEC") + "] " + nom + (info ? " · " + info : ""));
};

/* ── La table ── */
const NIVEAUX: Record<string, number> = { "Débutant": 0, "Intermédiaire": 1, "Avancé": 2 };
/** Ce que chaque réponse à « Qu'est-ce qui t'amène ? » ouvre au catalogue. */
const BUTS: Record<string, string[]> = {
  masse: ["masse"], force: ["force", "renfo"], poids: ["perte"], endurance: ["cardiohiit"],
  souplesse: ["mobilite"], sante: ["routines", "recup", "debuter"], reprendre: ["debuter"],
};
const cleBut = Object.keys(BUTS);

function calculer() {
  const lieux = {
    salle: materielDe({ location: "salle", equip: null }),
    poids: materielDe({ location: "maison", equip: "poids" }),
    halteres: materielDe({ location: "maison", equip: "halteres" }),
  };
  const seances = workoutSessions
    .filter((s) => (s as { kind?: string }).kind !== "advice" && (s as { type?: string }).type !== "lecture" && exercicesDe(s as never).length > 0)
    .map((s) => {
      const fait = (m: keyof typeof lieux) => faisableAvec(s as never, lieux[m]);
      const l = (fait("salle") ? 1 : 0) | (fait("poids") ? 2 : 0) | (fait("halteres") ? 4 : 0);
      const collections = (s as { collections?: string[] }).collections ?? [];
      let buts = 0;
      cleBut.forEach((k, i) => { if (BUTS[k].some((x) => collections.includes(x))) buts |= 1 << i; });
      return [s.duration, l, NIVEAUX[s.difficulty] ?? 1, s.access === "premium" ? 1 : 0, buts];
    });

  /* Le nombre annoncé par le Guide suit le filtre que les écrans appliquent
     ensuite : une seule règle, celle de `convient`. */
  const FILTRES: [DietKey, number][] = [["sans-viande", 1], ["sans-porc", 2], ["sans-poisson", 4], ["sans-oeufs", 8], ["sans-lactose", 16], ["sans-gluten", 32]];
  const masques = RECIPES.map((r) => FILTRES.reduce((m, [cle, bit]) => (convient(r, [cle]) ? m : m | bit), 0));

  const cycles: Record<number, string[]> = {};
  for (let n = 1; n <= 7; n++) cycles[n] = cycleDeReference(n);

  return {
    mouvements: EXERCISE_LIBRARY.length,
    programmes: PROGRAMMES.length,
    cleBut,
    seances,
    recettes: masques,
    cycles,
  };
}

const vraies = calculer();

if (process.argv.includes("--ecrire")) {
  const corps = [
    "/* Généré par `npm run premiers-pas:donnees`, tenu par `check:premiers-pas`.",
    "   Ne pas l'écrire à la main : ce sont les vrais comptes du catalogue et de",
    "   la banque de recettes, gardés ici pour que le premier écran ne charge ni",
    "   l'un ni l'autre.",
    "",
    "   Une séance : durée, lieux (1 salle, 2 sans matériel, 4 haltères), niveau",
    "   (0 à 2), Vaiiya+ (0 ou 1), buts (un bit par entrée de `cleBut`).",
    "   Une recette : ce qu'elle contient (1 viande, 2 porc, 4 poisson, 8 œufs,",
    "   16 lait, 32 gluten). */",
    "",
    "export type LigneSeance = [duree: number, lieux: number, niveau: number, vaiiyaPlus: number, buts: number];",
    "",
    "export const DONNEES: {",
    "  mouvements: number;",
    "  programmes: number;",
    "  cleBut: string[];",
    "  seances: LigneSeance[];",
    "  recettes: number[];",
    "  cycles: Record<number, string[]>;",
    "} = " + JSON.stringify(vraies) + ";",
    "",
  ].join("\n");
  writeFileSync("src/lib/premiersPas/donnees.ts", corps);
  console.log(`donnees.ts écrit : ${vraies.seances.length} séances, ${vraies.recettes.length} recettes`);
  process.exit(0);
}

t("le compte des mouvements suit la bibliothèque", DONNEES.mouvements === vraies.mouvements, `${DONNEES.mouvements}/${vraies.mouvements}`);
t("le compte des programmes suit le catalogue", DONNEES.programmes === vraies.programmes, `${DONNEES.programmes}/${vraies.programmes}`);
t("les séances suivent le catalogue", JSON.stringify(DONNEES.seances) === JSON.stringify(vraies.seances), `${DONNEES.seances.length}/${vraies.seances.length} (npm run premiers-pas:donnees)`);
t("les recettes suivent la banque", JSON.stringify(DONNEES.recettes) === JSON.stringify(vraies.recettes), `${DONNEES.recettes.length}/${vraies.recettes.length} (npm run premiers-pas:donnees)`);
t("les cycles suivent le planning", JSON.stringify(DONNEES.cycles) === JSON.stringify(vraies.cycles));
t("chaque but du parcours a sa clé", cleBut.join() === DONNEES.cleBut.join());

/* ── Les images ── */
const moteur = readFileSync("src/components/premiersPas/moteur.ts", "utf8");
const present = new Set(readdirSync("public/premiers-pas"));
const POSES = ["salut", "designe", "approuve", "surprise", "montre", "haltere", "assiette", "carnet", "fier", "telephone"];
for (const g of ["nora", "sasha"]) {
  for (const p of POSES) t(`la pose ${p} de ${g} existe`, present.has(`${g}-${p}.webp`));
  t(`le portrait de ${g} existe`, present.has(`${g}-master.webp`));
}
for (const m of moteur.matchAll(/\$\{A\}([a-z0-9-]+\.webp)/g)) t(`l'image ${m[1]} existe`, present.has(m[1]));
for (const cle of new Set(Object.values(DONNEES.cycles).flat())) t(`l'étape « ${cle} » a sa photo`, moteur.includes(`"${cle}"`) || /Cardio|Full|Haut|Bas|Push|Pull/.test(cle));

/* ── Les phrases ── */
const CTX = { prenom: "Louis", nomGuide: "Nora", nombre: 12, liste: "lundi et jeudi", titre: "Push", jour: "jeudi", avant: "lundi", minutes: 30 };
const texteDe = (cle: string) => voix(null, cle as CleVoix, CTX);
const cles = [...new Set([...readFileSync("src/lib/guides.ts", "utf8").matchAll(/^\s*"(pas\.[a-z.0-9]+)":/gm)].map((m) => m[1]))];
t("les phrases du parcours existent", cles.length >= 70, String(cles.length));
for (const cle of cles) {
  const x = texteDe(cle);
  t(`« ${cle} » : pas de tiret cadratin`, !x.includes(String.fromCharCode(0x2014)));
  t(`« ${cle} » : apostrophes courbes`, !x.includes("'"));
  t(`« ${cle} » : espace insécable avant la ponctuation haute`, !/ [?!:;]/.test(x), x);
  t(`« ${cle} » : aucun accord de genre`, !/\b(prêt|prête|motivé|motivée|inscrit|inscrite|content|contente)\b/i.test(x), x);
  t(`« ${cle} » : aucune promesse sur le secret`, !/reste entre nous|personne d.autre/i.test(x), x);
  t(`« ${cle} » : aucun reproche`, !/en retard|tu as raté|il faut que tu|tu dois/i.test(x), x);
}
t("le Guide ne dit rien en dur dans le moteur", !/dire\("/.test(moteur) && !/parler\("/.test(moteur));
t("aucun accord au mot Premium", !/Premium/.test(cles.map(texteDe).join(" ")));

/* ── Les réponses ── */
const e = etatVide();
e.prenom = "Louis"; e.buts = ["force", "reprendre"]; e.niveau = "reprise"; e.lieu = "maison"; e.equip = "halteres";
e.jours = [0, 3]; e.age = 28; e.genre = "homme"; e.taille = 180; e.poids = 75; e.sans = ["porc"];
const p = versProfil(e);
t("« Je reprends » devient débutant", p.level === "debutant");
t("les jours donnent le rythme", p.sessionsPerWeek === "2");
t("« Reprendre le sport » est un objectif connu", GOALS.some((g) => g.id === "reprendre"));
t("les objectifs passent tels quels", p.goals.join() === "force,reprendre");
t("le lieu passe", versLieu(e)?.location === "maison" && versLieu(e)?.equip === "halteres");
t("un compte en salle n'a pas de matériel à déclarer", (() => { const c = etatVide(); c.lieu = "salle"; return versLieu(c)?.location === "salle"; })());
t("sans rien exclure, omnivore", regimeDes([]) === "omnivore");
t("sans viande ni poisson, végétarien", regimeDes(["viande", "porc", "poisson"]) === "vegetarien");
t("sans rien d'animal, végan", regimeDes(["viande", "porc", "poisson", "oeufs", "lait"]) === "vegan");
t("sans gluten seul", regimeDes(["gluten"]) === "sansgluten");
t("chaque tuile devient un filtre connu", regimeConnu(regimesDe(["viande", "porc", "poisson", "oeufs", "lait", "gluten"])).length === 6);
t("sans porc, aucune recette n'en contient", RECIPES.filter((r) => convient(r, regimesDe(["porc"]))).every((r) => !r.ingredients.some((i) => /jambon|lardon|bacon|chorizo/i.test(i.nom))));
t("sans viande, le compte annoncé est le compte filtré", RECIPES.filter((r) => convient(r, regimesDe(["viande"]))).length === DONNEES.recettes.filter((m) => !(m & 1)).length);

/* ── Le barème qu'écrit la scène de bienvenue ── */
t("le socle de bienvenue vaut 50", EXP_BIENVENUE === 50);
t("la connexion vaut 10, puis 20 le lendemain", EXP_CONNEXION === 10 && EXP_CONNEXION_SUITE === 20);
t("une séance vaut 30, un repas 5, une journée complète 10", EXP_SEANCE === 30 && EXP_REPAS === 5 && EXP_JOURNEE === 10);
t("Argent se gagne à 100", RANGS[1].min === 100);
t("une journée de première fois mène à Argent", EXP_BIENVENUE + EXP_CONNEXION + EXP_SEANCE + EXP_REPAS + EXP_JOURNEE >= RANGS[1].min);
t("une séance seule n'y mène pas", EXP_BIENVENUE + EXP_CONNEXION + EXP_SEANCE < RANGS[1].min);

/* ── Le CSS ── */
const css = readFileSync("src/components/premiersPas/premiersPas.css", "utf8");
const regles = css.replace(/\/\*[\s\S]*?\*\//g, "");
t("aucune règle hors de .pp-tel ou .pp-fond",
  regles.split("}").every((r) => {
    const s = r.split("{")[0].trim();
    return !s || s.startsWith("@") || /^(from|to|\d)/.test(s) || s.split(",").every((x) => /\.pp-(tel|fond)/.test(x) || /^[\d.%\s]+$/.test(x) || /^(from|to)$/.test(x.trim()));
  }));
t("chaque animation est préfixée", [...regles.matchAll(/@keyframes\s+([\w-]+)/g)].every((m) => m[1].startsWith("pp-")));
t("chaque propriété enregistrée est préfixée", [...regles.matchAll(/@property\s+(--[\w-]+)/g)].every((m) => m[1].startsWith("--pp-")));
t("aucun :has()", !regles.includes(":has("));
const nomsAnim = new Set([...regles.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
const appels = [...regles.matchAll(/animation(?:-name)?:\s*([^;}]+)/g)].flatMap((m) => m[1].split(",").map((a) => a.trim().split(/\s+/).find((x) => x.startsWith("pp-")) ?? "")).filter(Boolean);
t("chaque animation appelée existe", appels.every((a) => nomsAnim.has(a)), appels.filter((a) => !nomsAnim.has(a)).join());

t("le dossier d'images existe", existsSync("public/premiers-pas"));
{
  const moteur = readFileSync("src/components/premiersPas/moteur.ts", "utf8");
  const manquants = [...moteur.matchAll(/\$\{A\}\$\{S\.guide \|\| "nora"\}-([a-z-]+)\.webp/g)].map((m) => m[1]).filter((n) => !present.has(`nora-${n}.webp`) || !present.has(`sasha-${n}.webp`));
  t("chaque image du Guide existe pour les deux Guides", manquants.length === 0, manquants.join(", "));
  t("deux séances peuvent échanger leur jour", /\[s\[ici\], s\[cible\]\] = \[s\[cible\], s\[ici\]\]/.test(moteur));
  t("l'ordre de la semaine devient celui du cycle", /getOrCreateProgramme\(id, undefined, e\.semaine/.test(readFileSync("src/components/premiersPas/PremiersPas.tsx", "utf8")));
  const quatre = etapesDuCycle(4)!;
  const inverse = [...quatre].reverse().map((e) => e.nom);
  t("le cycle suit l'ordre choisi", etapesDansLOrdre(quatre, inverse).map((e) => e.nom).join() === inverse.join() && etapesDansLOrdre(quatre, inverse)[0].position === quatre[0].position);
  t("un ordre étranger ne change rien", etapesDansLOrdre(quatre, ["Inconnue"]) === quatre);
}

/* ── La bascule : une seule porte d'entrée ── */
const lire = (f: string) => readFileSync(f, "utf8");
t("la garde mène aux premiers pas", /ROUTE_BIENVENUE = "\/premiers-pas"/.test(lire("src/components/GardeGuide.tsx")));
t("la vitrine mène aux premiers pas", /href = "\/premiers-pas"/.test(lire("src/components/Landing/LandingVitrine.tsx")));
t("un compte sans action retrouve la visite, jamais les questions", lire("src/components/accueil/usePremierAccueil.ts").includes('"/premiers-pas?visite=1"'));
t("/bienvenue ne reste que pour corriger ses réponses", /edit/.test(lire("src/app/bienvenue/page.tsx")) && lire("src/app/bienvenue/page.tsx").includes('"/premiers-pas'));
t("créer le compte ne remonte pas la page", lire("src/context/WorkoutLaunchContext.tsx").includes('surParcours ? "premiers-pas"'));
t("le moteur ne repart pas quand le Guide se relit", lire("src/components/premiersPas/PremiersPas.tsx").includes("moteur.current) return;"));
t("l'ancienne visite n'existe plus", !existsSync("src/components/GuidedTour") && !existsSync("src/context/GuidedTourContext.tsx"));
t("la première journée lit les gains, elle n'en écrit aucun", !/\+\d+/.test(lire("src/components/accueil/PremierAccueil.tsx").replace(/\/\*[\s\S]*?\*\//g, "")));
console.log(`\n${ok} contrôles passés, ${ko} en échec.`);
if (ko) process.exit(1);
