/**
 * npm run check:vision — la partie de l'analyse photo qui se vérifie SANS
 * appeler de modèle : ce que le code fait de sa réponse, et le chemin de la
 * photo depuis le téléphone. La qualité de reconnaissance, elle, se juge sur
 * de vraies photos (voir AGENTS.md).
 */
import { readFileSync } from "node:fs";
import { calculerRepas, lireReponse, momentDuRepas } from "@/lib/visionRepas";
import { REFERENCES, referenceDe } from "@/lib/tableAliments";

let echecs = 0;
const ok = (cond: boolean, nom: string) => {
  console.log(`${cond ? "[OK   ]" : "[ÉCHEC]"} ${nom}`);
  if (!cond) echecs++;
};

// 1. Un élément simple : 180 g de riz à 130 kcal/100 g = 234 kcal.
const riz = calculerRepas({ plat: "riz", elements: [
  { nom: "riz", grammes: 180, kcal_100g: 130, proteines_100g: 2.7, glucides_100g: 28, lipides_100g: 0.3 },
] });
ok(riz?.calories === 234, "180 g de riz à 130 kcal/100 g donnent 234 kcal");

// 2. Le total est la somme exacte des éléments.
const assiette = calculerRepas({ plat: "poulet riz", elements: [
  { nom: "riz", grammes: 180, kcal_100g: 130, proteines_100g: 2.7, glucides_100g: 28, lipides_100g: 0.3 },
  { nom: "seitan grillé", grammes: 120, kcal_100g: 165, proteines_100g: 31, glucides_100g: 0, lipides_100g: 3.6 },
  { nom: "huile de cuisson", grammes: 10, kcal_100g: 900, proteines_100g: 0, glucides_100g: 0, lipides_100g: 100 },
] });
ok(!!assiette && assiette.calories === assiette.items.reduce((s, i) => s + i.calories, 0), "le total des calories est la somme des éléments");
ok(!!assiette && assiette.items.length === 3, "la matière grasse de cuisson compte comme un élément");
ok(!!assiette && Math.abs(assiette.proteins - (180 * 2.7 + 120 * 31) / 100) < 1, "les protéines suivent les poids");

// 3. Des calories qui contredisent les macros sont recalées sur les macros.
const faux = calculerRepas({ plat: "x", elements: [
  { nom: "tempeh", grammes: 100, kcal_100g: 40, proteines_100g: 26, glucides_100g: 0, lipides_100g: 15 },
] });
ok(faux?.calories === Math.round(26 * 4 + 15 * 9), "des calories incohérentes sont recalculées depuis les macros");

// 4. Bornes physiques.
const enorme = calculerRepas({ plat: "x", elements: [
  { nom: "plat mystère", grammes: 9000, kcal_100g: 5000, proteines_100g: 90, glucides_100g: 90, lipides_100g: 90 },
] });
ok(!!enorme && enorme.items[0].grammes === 1500, "un poids absurde est borné à 1,5 kg");
ok(!!enorme && enorme.items[0].calories <= 1500 * 9, "des valeurs pour 100 g impossibles sont ramenées au possible");

// 5. Pas de repas, pas de chiffres.
ok(calculerRepas({ aucun_repas: true, elements: [] }) === null, "« aucun repas » ne rend rien");
ok(calculerRepas({ plat: "x", elements: [] }) === null, "une liste vide ne rend rien");
ok(calculerRepas({ plat: "x", elements: [{ nom: "", grammes: 100 }, { nom: "y", grammes: 0 }] }) === null, "des éléments sans nom ou sans poids sont ignorés");

// 6. Lecture robuste et nombres écrits en texte.
ok(lireReponse('Voici :\n{"plat":"a","elements":[]}\nMerci')?.plat === "a", "le JSON se lit même entouré de texte");
ok(lireReponse("pas de json") === null, "une réponse sans JSON rend null");
const virgule = calculerRepas({ plat: "x", elements: [{ nom: "galette maison", grammes: "50", kcal_100g: "265,5", proteines_100g: "9", glucides_100g: "49", lipides_100g: "3,2" }] });
ok(virgule?.calories === Math.round(265.5 * 0.5), "les nombres en texte, virgule comprise, sont lus");

// 6 bis. La table de référence donne les valeurs, le modèle seulement le poids.
const rizFaux = calculerRepas({ plat: "x", elements: [
  { nom: "riz basmati cuit", grammes: 200, kcal_100g: 360, proteines_100g: 7, glucides_100g: 80, lipides_100g: 0.6 },
] });
ok(rizFaux?.calories === 260 && rizFaux.items[0].reference === true, "du riz annoncé à 360 kcal/100 g (valeur crue) est lu à 130 dans la table");
const oeufs = calculerRepas({ plat: "x", elements: [{ nom: "œufs brouillés", pieces: 3, grammes: 60 }] });
ok(oeufs?.items[0].grammes === 165, "3 œufs comptés pèsent 3 × 55 g, même si le poids estimé dit 60 g");
const oeufsProches = calculerRepas({ plat: "x", elements: [{ nom: "oeufs", pieces: 2, grammes: 120 }] });
ok(oeufsProches?.items[0].grammes === 120, "un poids proche du compte (à 40 % près) est gardé : il dit la taille des œufs");
const huile = calculerRepas({ plat: "x", elements: [{ nom: "huile d'olive", grammes: 300 }] });
ok(huile?.items[0].grammes === 40, "300 g d'huile, une erreur d'échelle, sont ramenés à 40 g");
ok(referenceDe("bœuf haché")?.nom !== "œuf", "« bœuf » n'est pas lu comme un œuf");
ok(referenceDe("pommes de terre vapeur")?.nom === "pomme de terre", "« pommes de terre » n'est pas une pomme");
ok(referenceDe("patate douce rôtie")?.nom === "patate douce", "la patate douce passe avant la pomme de terre");
ok(referenceDe("fromage blanc 3 %")?.nom === "fromage blanc", "le fromage blanc n'est pas un fromage affiné");
ok(referenceDe("beurre de cacahuète")?.nom === "beurre de cacahuète", "le beurre de cacahuète n'est ni du beurre ni des cacahuètes");
ok(referenceDe("pain de mie")?.nom === "pain de mie" && referenceDe("pain d'épices") === null, "pain de mie lu à part, pain d'épices hors table");
ok(referenceDe("frites")?.nom === "frites" && referenceDe("nuggets de poulet")?.nom === "poulet pané", "frites et nuggets ont leurs lignes");
ok(referenceDe("poulet frit") === null && referenceDe("mousse au chocolat") === null && referenceDe("lait de coco") === null,
  "une préparation sans ligne à elle garde les valeurs du modèle");
ok(referenceDe("poulet curry") === null && referenceDe("sauce tomate")?.nom === "sauce tomate", "un plat en sauce n'est pas l'ingrédient nu");
ok(referenceDe("tacos français") === null, "un plat composé de fast-food garde les valeurs du modèle");
ok(REFERENCES.every((r) => Math.abs(r.kcal - (r.p * 4 + r.c * 4 + r.f * 9)) / r.kcal < 0.25 || r.c + r.p + r.f === 0),
  "chaque ligne de la table : ses calories retombent sur ses macros à 25 % près");

// 7. Le moment vient de l'heure.
ok(momentDuRepas(8) === "petit-dejeuner" && momentDuRepas(12) === "dejeuner"
  && momentDuRepas(16) === "gouter" && momentDuRepas(20) === "diner" && momentDuRepas(2) === "diner",
  "le moment du repas se déduit de l'heure");

// 8. Contrôles de SOURCE : le chemin de la photo.
/* Les deux envois vivent dans leurs modales depuis le 2026-10-22 : elles sont
   sorties de NutritionTab.tsx, le contrôle les lit là où elles sont. */
const nutri = ["src/components/nutrition/PhotoAnalysisModal.tsx", "src/components/nutrition/MenuScanModal.tsx"]
  .map((f) => readFileSync(f, "utf8")).join("\n");
ok((nutri.match(/preparerPhotoIA\(file/g) ?? []).length === 2, "les deux envois (assiette et carte) préparent la photo avant l'envoi");
ok(!/image: base64, mimeType: file\.type/.test(nutri), "aucun envoi ne part avec la photo brute");
const route = readFileSync("src/app/api/nutrition/analyze/route.ts", "utf8");
ok(/calculerRepas/.test(route) && /momentDuRepas/.test(route), "la route calcule les totaux et le moment elle-même");
ok(/appelerVision/.test(route) && /appelerVision/.test(readFileSync("src/app/api/nutrition/carte/route.ts", "utf8")),
  "l'assiette et la carte passent par le même appel avec repli");

const estimation = readFileSync("src/app/api/nutrition/estimate/route.ts", "utf8");
ok(/calculerRepas/.test(estimation), "l'estimation par texte calcule ses totaux comme la photo");

console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
