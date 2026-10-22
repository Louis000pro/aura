/* ═══════════════════════════════════════════════════════════════════════
   check:nutrition, le banc de l'écran Nutrition (direction 2 de la
   maquette « La nutrition accueillante », 2026-10-22).

     npm run check:nutrition

   ⚠️ IL EXERCE LE VRAI CODE (lib/collectionsRecettes, lib/photoRepas,
   lib/repas), puis il lit la source de l'écran pour les propriétés du
   chemin. Ce qu'il protège tient en trois phrases :
     · une collection dit ce qu'elle contient, et ne contient que ça ;
     · une idée pour ce repas se prépare pour ce repas (jamais une entrée
       seule, jamais une nuit au frais le matin même) ;
     · la photo d'un repas noté dit vraiment ce plat, ou il n'y en a pas.
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync } from "node:fs";
import { RECIPES } from "@/lib/recipeBank";
import {
  COLLECTIONS, MINUTES_IDEE, MINUTES_RAPIDE, NATURE, PROTEINES_APRES_SPORT, REPOS,
  besoinsDuJour, convient, dureeRecette, ideesDuMoment, minutesTotales, natureDe, poolDuMoment,
  recettesDe, regimeConnu,
} from "@/lib/collectionsRecettes";
import { photoDuRepas, estRecetteVaiiya } from "@/lib/photoRepas";
import { classerRecents, heureLisible, milliers, momentDuRepas, MOMENTS } from "@/lib/repas";
import { voix } from "@/lib/guides";
import {
  PLAFOND_FAVORIS, clePlat, compteFavoris, epinglesAReprendre, favoriDePlat, favoriDeRecette, favoriLu,
  platsFavoris, platsProposes, recettesFavorites, trierFavoris, type Favori,
} from "@/lib/favorisNutrition";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}

const lire = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const net = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const fichierPublic = (chemin: string) => existsSync(new URL("../public" + chemin, import.meta.url));

/* ── 1 · Chaque recette a sa nature, et rien n'est écrit pour une recette qui n'existe pas ── */
{
  const sans = RECIPES.filter((r) => !NATURE[r.id]).map((r) => r.id);
  verdict("chaque recette de la banque a une nature écrite à la main", sans.length === 0, sans.join(", ") || `${RECIPES.length} recettes`);
  const ids = new Set(RECIPES.map((r) => r.id));
  const fantomes = [...Object.keys(NATURE), ...Object.keys(REPOS)].filter((id) => !ids.has(id));
  verdict("aucune nature ni aucun repos pour une recette absente", fantomes.length === 0, fantomes.join(", ") || "rien en trop");
  const images = RECIPES.filter((r) => !fichierPublic(r.image)).map((r) => r.id);
  verdict("chaque recette a sa photo sur le disque", images.length === 0, images.join(", ") || "toutes là");
}

/* ── 2 · Les six collections disent vrai ── */
{
  for (const c of COLLECTIONS) {
    const liste = recettesDe(c.id);
    verdict(`« ${c.titre} » n'est pas vide`, liste.length >= 6, `${liste.length} recettes`);
    const tuile = RECIPES.find((r) => r.id === c.tuile);
    const heros = RECIPES.find((r) => r.id === c.heros);
    verdict(`« ${c.titre} » : ses deux photos sont des recettes de la collection`,
      !!tuile && !!heros && c.garde(tuile) && c.garde(heros), `${c.tuile} · ${c.heros}`);
  }
  const rapide = recettesDe("rapide");
  const tropLongues = rapide.filter((r) => minutesTotales(r) > MINUTES_RAPIDE || !!REPOS[r.id]?.texte);
  verdict(`« Rapide » : tout est prêt en ${MINUTES_RAPIDE} minutes, repos compris`, tropLongues.length === 0,
    tropLongues.map((r) => `${r.id} ${minutesTotales(r)} min`).join(", ") || `${rapide.length} recettes`);
  verdict("« Rapide » ne garde ni gambas (10 min de marinade) ni overnight oats (une nuit)",
    !rapide.some((r) => r.id === "gambas-grillees-ail-persil" || r.id === "overnight-oats-chocolat-noisette"),
    "le repos entre dans le compte");
  verdict("« Rapide » se lit de la plus courte à la plus longue",
    rapide.every((r, i) => i === 0 || minutesTotales(rapide[i - 1]) <= minutesTotales(r)), dureeRecette(rapide[0]));
  const veg = recettesDe("vegetarien");
  verdict("« Végétarien » : ni viande ni poisson", veg.every((r) => r.diet.includes("vegetarien") || r.diet.includes("vegan")), `${veg.length} recettes`);
  const sport = recettesDe("apres-sport");
  verdict(`« Après le sport » : au moins ${PROTEINES_APRES_SPORT} g de protéines par portion`,
    sport.every((r) => r.proteins >= PROTEINES_APRES_SPORT), `la moins riche : ${Math.min(...sport.map((r) => r.proteins))} g`);
  const desserts = recettesDe("desserts");
  verdict("« Desserts » : que des desserts", desserts.every((r) => natureDe(r) === "dessert"), `${desserts.length} desserts`);
  const pates = recettesDe("pates-riz");
  verdict("« Pâtes et riz » : jamais le quinoa ni le couscous seuls",
    !pates.some((r) => r.id === "bowl-de-poulet-quinoa-et-avocat" || r.id.startsWith("tajine")), `${pates.length} plats`);
  const entrees = COLLECTIONS.flatMap((c) => recettesDe(c.id)).filter((r) => natureDe(r) === "entree");
  verdict("aucune entrée seule dans une collection", entrees.length === 0, entrees.map((r) => r.id).join(", ") || "aucune");
}

/* ── 3 · Le régime : végétalien vaut végétarien, une clé inconnue ne vide rien ── */
{
  verdict("un régime inconnu ne filtre rien", regimeConnu(["halal", 3, null]).length === 0, "pickRecipes vidait toute la banque");
  verdict("les accents et la casse ne comptent pas", regimeConnu(["Végétarien"]).join() === "vegetarien", regimeConnu(["Végétarien"]).join());
  const sorbet = RECIPES.find((r) => r.id === "sorbet-framboise-minute")!;
  verdict("une recette végétalienne convient à un végétarien", convient(sorbet, ["vegetarien"]), sorbet.diet.join(", "));
  const vegCollections = COLLECTIONS.filter((c) => recettesDe(c.id, ["vegetarien"]).length > 0).length;
  verdict("un végétarien garde au moins quatre collections", vegCollections >= 4, `${vegCollections} collections`);
  const viande = recettesDe("apres-sport", ["vegetarien"]).filter((r) => !convient(r, ["vegetarien"]));
  verdict("une collection filtrée ne rend rien d'incompatible", viande.length === 0, viande.map((r) => r.id).join(", ") || "rien");
}

/* ── 4 · Les idées du moment ── */
{
  for (const m of MOMENTS) {
    const pool = poolDuMoment(m);
    verdict(`idées « ${m} » : jamais une entrée seule`, pool.every((r) => natureDe(r) !== "entree"), `${pool.length} recettes`);
    verdict(`idées « ${m} » : prêtes en ${MINUTES_IDEE[m]} minutes`, pool.every((r) => minutesTotales(r) <= MINUTES_IDEE[m]),
      `la plus longue : ${Math.max(...pool.map(minutesTotales))} min`);
    verdict(`idées « ${m} » : au moins trois`, pool.length >= 3, `${pool.length}`);
  }
  verdict("le matin : que des petits-déjeuners", poolDuMoment("petit-dejeuner").every((r) => natureDe(r) === "petit-dej"), "");
  verdict("le matin : rien qui demande une nuit au frais",
    !poolDuMoment("petit-dejeuner").some((r) => ["overnight-oats-chocolat-noisette", "bircher-muesli-pomme-noisette", "chia-pudding-coco-mangue"].includes(r.id)),
    "overnight oats, bircher et chia pudding restent dans les collections");
  verdict("à midi, plus de tajine de 95 minutes", !poolDuMoment("dejeuner").some((r) => r.id.startsWith("tajine")), "il reste dans les collections");

  const besoins = besoinsDuJour({
    moment: "dejeuner", objectif: { calories: 2300, proteins: 110 },
    mange: { calories: 463, proteins: 24 }, dejaManges: ["Overnight oats chocolat-noisette"], aimes: [],
  });
  const a = ideesDuMoment({ moment: "dejeuner", regime: [], besoins, graine: "2026-10-22:dejeuner" }).map((r) => r.id);
  const b = ideesDuMoment({ moment: "dejeuner", regime: [], besoins, graine: "2026-10-22:dejeuner" }).map((r) => r.id);
  verdict("le même jour donne le même ordre (rien ne bouge d'un rendu à l'autre)", a.join() === b.join(), a.slice(0, 3).join(", "));
  verdict("les besoins se calculent sans jamais passer sous zéro",
    besoinsDuJour({ moment: "diner", objectif: { calories: 2000, proteins: 100 }, mange: { calories: 2600, proteins: 140 }, dejaManges: [], aimes: [] }).remaining === 0,
    "une journée déjà pleine laisse 0, pas un nombre négatif");
}

/* ── 5 · La photo d'un repas noté ── */
{
  const exact = RECIPES[0];
  verdict("le nom d'une recette rend sa photo", photoDuRepas(exact.nom) === exact.image && estRecetteVaiiya(exact.nom), exact.nom);
  verdict("la casse et les accents ne comptent pas", photoDuRepas("PATES BOLOGNAISE MAISON") === "/recipes/pates-bolognaise-maison.jpg", "");
  verdict("« Pizza 4 fromages » rend une pizza", photoDuRepas("Pizza 4 fromages") === "/nutrition/ambiances/pizza.jpg", "");
  verdict("un plat inconnu ne rend AUCUNE photo", photoDuRepas("Soupe miso") === null && photoDuRepas("Yaourt grec") === null, "une tuile neutre, jamais une assiette inventée");
  verdict("une salle de restaurant n'est jamais la photo d'un repas",
    ["Plat asiatique", "Steak au bistrot", "Dessert", "Repas healthy", "Tacos"].every((n) => !(photoDuRepas(n) ?? "").includes("/ambiances/") || (photoDuRepas(n) ?? "").endsWith("pizza.jpg")),
    "seule la pizza montre son plat");
  const src = lire("src/lib/photoRepas.ts");
  const chemins = [...src.matchAll(/"(\/(?:recipes|nutrition)\/[^"]+)"/g)].map((m) => m[1]);
  const absents = chemins.filter((c) => !fichierPublic(c));
  verdict("chaque photo de famille existe sur le disque", absents.length === 0, absents.join(", ") || `${chemins.length} photos`);
}

/* ── 6 · Les petits outils du journal ── */
{
  verdict("le moment suit l'heure de l'analyse photo",
    momentDuRepas(10) === "petit-dejeuner" && momentDuRepas(11) === "dejeuner" && momentDuRepas(15) === "gouter" && momentDuRepas(18) === "diner" && momentDuRepas(3) === "diner",
    "10 h petit-déjeuner, 11 h déjeuner, 15 h goûter, 18 h dîner");
  verdict("« 08:12 » s'écrit « 8 h 12 » avec des espaces insécables", heureLisible("08:12") === "8 h 12", JSON.stringify(heureLisible("08:12")));
  verdict("les milliers prennent l'espace insécable ordinaire, pas l'espace fine", milliers(2300) === "2 300" && milliers(950) === "950", JSON.stringify(milliers(2300)));
  const r = classerRecents([
    { food_name: "Pâtes", calories: 600, proteins: 20, carbs: 80, fats: 10 },
    { food_name: "Yaourt", calories: 100, proteins: 5, carbs: 10, fats: 3 },
    { food_name: "pâtes ", calories: 550, proteins: 18, carbs: 75, fats: 9 },
  ]);
  verdict("les derniers repas se classent par fréquence, macros de la dernière fois", r[0].name === "Pâtes" && r[0].count === 2 && r[0].calories === 600, r.map((x) => `${x.name}×${x.count}`).join(", "));
}

/* ── 7 · La question du Guide ── */
{
  const cles = ["nutrition.question", "nutrition.question.petit-dejeuner", "nutrition.question.dejeuner", "nutrition.question.gouter", "nutrition.question.diner"] as const;
  const phrases = cles.map((c) => voix(null, c));
  verdict("une question par moment, et une sans moment pour le premier rendu", phrases.every((p) => p.endsWith(" ?")), phrases.join(" | "));
  verdict("aucune espace ordinaire avant le point d'interrogation", phrases.every((p) => !p.includes(" ?")), "U+00A0 partout");
}

/* ── 8 · Les propriétés du chemin ── */
{
  const ecran = net(lire("src/components/NutritionTab.tsx"));
  const hero = net(lire("src/components/MealSituationHero.tsx"));
  const journee = net(lire("src/components/nutrition/JourneeNutrition.tsx"));
  verdict("les recettes par thème générées par l'IA sont parties", !ecran.includes("RecipesByTheme") && !existsSync(new URL("../src/components/RecipesByTheme.tsx", import.meta.url)), "remplacées par les collections en photo");
  verdict("la rangée des sept jours a quitté l'écran", !ecran.includes("getMondayWeek") && !ecran.includes("weekDays"), "les jours se parcourent dans le détail");
  verdict("« J'ai déjà mangé · Je saute ce repas » sont partis", !hero.includes("Je saute ce repas") && !hero.includes("déjà mangé"), "l'ajout vit sous la question");
  verdict("la question est datée par le moment du téléphone", hero.includes("`nutrition.question.${moment}`") && ecran.includes("useMomentRepas"), "jamais l'heure du serveur");
  verdict("un total de calories à quatre chiffres ne prend pas le chiffre mono", journee.includes("v < 1000") && journee.includes("milliers("), "l'espace des milliers prendrait une case entière");
  const demandeurs = [
    "src/components/nutrition/FeuilleAjoutRepas.tsx", "src/components/nutrition/GrillePlats.tsx",
    "src/components/nutrition/VueFavoris.tsx", "src/hooks/useFavorisNutrition.ts",
  ].map((f) => net(lire(f))).join("\n");
  verdict("une écriture du journal ne vit qu'ici", !/nutrition_logs"\)[\s\S]{0,60}?\.(insert|delete)\(/.test(demandeurs + journee),
    "la feuille, les grilles et le détail demandent, l'écran écrit et signale");
}

/* ── 9 · Les favoris : ce qu'ils sont ── */
{
  const brut = JSON.stringify([
    { name: "Yaourt grec au miel", calories: 180.4, proteins: 10, carbs: 20, fats: 6 },
    { name: "  yaourt GREC au miel ", calories: 1 },
    { name: "" }, { calories: 3 }, null, "texte",
    { name: "Pâtes bolo", calories: -5, proteins: "12", carbs: null },
  ]);
  const reprises = epinglesAReprendre(brut);
  verdict("les plats épinglés deviennent des favoris, sans doublon ni ligne vide",
    reprises.length === 2 && reprises[0].name === "Yaourt grec au miel" && reprises[0].calories === 180, reprises.map((r) => r.name).join(", "));
  verdict("une macro impossible devient zéro, jamais négative",
    reprises[1]?.calories === 0 && reprises[1]?.proteins === 12 && reprises[1]?.carbs === 0, JSON.stringify(reprises[1]));
  verdict("des épingles illisibles ne cassent rien",
    epinglesAReprendre("{pas du json").length === 0 && epinglesAReprendre(null).length === 0 && epinglesAReprendre('{"name":"x"}').length === 0, "");

  const plat = favoriDePlat({ name: "  Sandwich Jambon-Beurre ", calories: 420.6, proteins: 18, carbs: 45, fats: 17 }, "2026-10-23T10:00:00Z");
  verdict("un plat se retrouve par son nom comparable", plat.cle === "sandwich jambon-beurre" && plat.nom === "Sandwich Jambon-Beurre" && plat.calories === 421, `${plat.cle} · ${plat.calories}`);

  const [r1, r2] = RECIPES;
  const disparue: Favori = { sorte: "recette", cle: "recette-disparue", nom: "Disparue", calories: null, proteins: null, carbs: null, fats: null, ajouteLe: "2026-10-23T08:00:00Z" };
  const favs = trierFavoris([favoriDeRecette(r1, "2026-10-20T08:00:00Z"), favoriDeRecette(r2, "2026-10-22T08:00:00Z"), disparue, plat]);
  const recettes = recettesFavorites(favs);
  verdict("une recette favorite qui a quitté la banque ne s'affiche plus", recettes.length === 2, recettes.map((r) => r.id).join(", "));
  verdict("la plus récente passe devant", recettes[0]?.id === r2.id, recettes[0]?.id ?? "rien");
  verdict("un plat favori se remet avec ses macros", platsFavoris(favs)[0]?.calories === 421, "");

  const recentsTest = [
    { name: "Sandwich jambon-beurre", calories: 400, proteins: 1, carbs: 1, fats: 1 },
    ...Array.from({ length: 12 }, (_, i) => ({ name: `Plat ${i}`, calories: 100, proteins: 1, carbs: 1, fats: 1 })),
  ];
  const proposes = platsProposes(platsFavoris(favs), recentsTest);
  verdict("« Mes plats » : les favoris d'abord, un plat n'y est qu'une fois",
    proposes[0]?.name === "Sandwich Jambon-Beurre" && proposes.filter((x) => clePlat(x.name) === "sandwich jambon-beurre").length === 1,
    proposes.slice(0, 3).map((x) => x.name).join(", "));
  verdict("« Mes plats » : trois rangées de trois", proposes.length === 9, `${proposes.length}`);
  const beaucoup = Array.from({ length: 14 }, (_, i) => ({ name: `Favori ${i}`, calories: 1, proteins: 1, carbs: 1, fats: 1 }));
  verdict("« Mes plats » : tous les favoris restent, même au-delà de neuf", platsProposes(beaucoup, recentsTest).length === 14, "");

  verdict("« 6 recettes · 3 plats », le nombre collé à son mot", compteFavoris(6, 3) === "6 recettes · 3 plats", JSON.stringify(compteFavoris(6, 3)));
  verdict("le singulier, et rien pour ce qui vaut zéro",
    compteFavoris(1, 0) === "1 recette" && compteFavoris(0, 1) === "1 plat" && compteFavoris(0, 0) === "", "");

  verdict("une ligne qui ne ressemble à rien est ignorée",
    favoriLu({ sorte: "autre", cle: "x", nom: "x" }) === null && favoriLu({ sorte: "plat", cle: "", nom: "x" }) === null && favoriLu(null) === null, "");
  verdict("une ligne de la base garde sa date", favoriLu({ sorte: "plat", cle: "x", nom: "X", created_at: "2026-10-23T09:00:00Z" })?.ajouteLe === "2026-10-23T09:00:00Z", "");

  const sql = lire("supabase/migrations/20261023_favoris_nutrition.sql");
  verdict("le plafond de l'écran est celui de la base", sql.includes(`>= ${PLAFOND_FAVORIS}`), `${PLAFOND_FAVORIS}`);
  verdict("la table est en RLS, propriétaire seulement, fermée à anon, et part avec le compte",
    sql.includes("enable row level security") && (sql.match(/user_id = auth\.uid\(\)/g) ?? []).length === 3
      && sql.includes("revoke all on table public.favoris_nutrition from anon") && sql.includes("on delete cascade"),
    "lire, ajouter, retirer : les siens");
}

/* ── 10 · Les favoris dans le chemin ── */
{
  const fiche = net(lire("src/components/RecipeSheet.tsx"));
  verdict("le bouton « Sauver » qui ne gardait rien est parti", !fiche.includes("Bookmark") && !fiche.includes("Sauver") && fiche.includes("aria-pressed={favori}"), "le cœur le remplace");
  const feuille = net(lire("src/components/nutrition/FeuilleAjoutRepas.tsx"));
  verdict("l'appui long a quitté « Ajouter un repas »", !feuille.includes("onPointerDown") && !feuille.includes("Appui long") && !feuille.includes("480"), "le cœur se voit");
  verdict("les épingles de l'appareil sont parties",
    !existsSync(new URL("../src/hooks/useEpinglesRepas.ts", import.meta.url)) && !net(lire("src/components/NutritionTab.tsx")).includes("useEpinglesRepas"),
    "elles entrent dans le compte");
  const crochet = net(lire("src/hooks/useFavorisNutrition.ts"));
  verdict("les favoris n'écrivent que dans leur table", !crochet.includes("nutrition_logs") && crochet.includes('"favoris_nutrition"'), "jamais dans le journal");
  verdict("pas de cœur tant que les favoris ne sont pas connus",
    net(lire("src/components/nutrition/GrillePlats.tsx")).includes("favori !== null") && net(lire("src/components/NutritionTab.tsx")).includes("favoris.connu ? favoris.estPlat : null"),
    "un cœur vide serait faux");
  verdict("« Sandwich, snack » ne montre pas de recettes", net(lire("src/components/MealSituationHero.tsx")).includes('sit === "maison" ? recettesFavorites : []'), "une recette se cuisine");
}

console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
