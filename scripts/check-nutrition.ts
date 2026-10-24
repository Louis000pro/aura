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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import sharp from "sharp";
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
import {
  MOMENTS_SAISON, NATURE_MORTE, SEUIL_MOMENT, VISIBLE, dimancheDePaques, imageProduit, jourEnLettres, momentDuJour,
} from "@/lib/momentsSaison";

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

/* ── 11 · Les moments de l'année (lib/momentsSaison, l'affiche de saison) ── */
{
  const ids = new Set(RECIPES.map((r) => r.id));
  const inconnues = MOMENTS_SAISON.flatMap((m) => m.recettes.filter((id) => !ids.has(id)).map((id) => `${m.id}:${id}`));
  verdict("chaque recette d'un moment est dans la banque", inconnues.length === 0,
    inconnues.join(", ") || `${MOMENTS_SAISON.reduce((t, m) => t + m.recettes.length, 0)} recettes`);
  const doublons = MOMENTS_SAISON.filter((m) => new Set(m.recettes).size !== m.recettes.length).map((m) => m.id);
  verdict("aucune recette en double dans un moment", doublons.length === 0, doublons.join(", ") || `${MOMENTS_SAISON.length} moments`);

  const nombre = MOMENTS_SAISON.filter((m) => m.produits.length < 4 || m.produits.length > 5).map((m) => m.id);
  verdict("chaque moment pose quatre ou cinq produits", nombre.length === 0, nombre.join(", ") || "");
  const manquantes = MOMENTS_SAISON.flatMap((m) => m.produits.filter((p) => !fichierPublic(imageProduit(p.nom))).map((p) => `${m.id}:${p.nom}`));
  verdict("chaque produit a sa vignette dans public/saison", manquantes.length === 0, manquantes.join(", ") || "");
  const servies = new Set(MOMENTS_SAISON.flatMap((m) => m.produits.map((p) => `${p.nom}.webp`)));
  const dossier = new URL("../public/saison/", import.meta.url);
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".webp"));
  const orphelines = fichiers.filter((f) => !servies.has(f));
  verdict("aucune vignette de public/saison ne traîne sans moment", orphelines.length === 0, orphelines.join(", ") || `${servies.size} vignettes`);

  /* La nature morte se compose par ce qu'on voit de chaque produit : la
     partie visible de chaque vignette se remesure sur son fichier (alpha
     au-dessus de 25), puis chaque produit posé se mesure dans sa boîte. */
  const ecarts: string[] = [];
  for (const f of fichiers) {
    const nom = f.replace(/\.webp$/, "");
    const { data, info } = await sharp(readFileSync(new URL(f, dossier))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 25) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    const mesure = [x0 / info.width, y0 / info.height, (x1 + 1) / info.width, (y1 + 1) / info.height];
    const ecrite = VISIBLE[nom];
    if (!ecrite || ecrite.some((v, i) => Math.abs(v - mesure[i]) > 0.003)) ecarts.push(nom);
  }
  const sansFichier = Object.keys(VISIBLE).filter((nom) => !fichiers.includes(`${nom}.webp`));
  verdict("la partie visible de chaque vignette est celle de son fichier", ecarts.length === 0 && sansFichier.length === 0,
    [...ecarts, ...sansFichier.map((n) => `${n} sans fichier`)].join(", ") || `${fichiers.length} vignettes remesurées`);

  const { largeur, sol, marge } = NATURE_MORTE;
  const pres = 0.5; // au demi-pixel près : un écart plus petit ne se voit pas
  const auBord: string[] = [], horsLigne: string[] = [];
  for (const m of MOMENTS_SAISON) for (const p of m.produits) {
    const [gx, hy, dx, by] = VISIBLE[p.nom] ?? [0, 0, 1, 1];
    const gauche = p.x + p.taille * gx, droite = p.x + p.taille * dx, haut = p.y + p.taille * hy, bas = p.y + p.taille * by;
    if (gauche < marge - pres || droite > largeur - marge + pres || haut < -pres) auBord.push(`${m.id}:${p.nom}`);
    if (bas < sol - pres || bas > sol + 6 + pres) horsLigne.push(`${m.id}:${p.nom}`);
  }
  verdict(`aucun produit ne s'approche à moins de ${marge} px des bords de la nature morte`, auBord.length === 0,
    auBord.join(", ") || "rien n'est coupé au bord de l'écran");
  verdict("tous les produits se posent sur la ligne commune", horsLigne.length === 0,
    horsLigne.join(", ") || `à ${sol} px, jusqu'à 6 px plus bas au premier plan`);

  const PAQUES: Record<number, string> = {
    2008: "2008-03-23", 2024: "2024-03-31", 2025: "2025-04-20", 2026: "2026-04-05", 2027: "2027-03-28",
    2028: "2028-04-16", 2029: "2029-04-01", 2030: "2030-04-21", 2038: "2038-04-25",
  };
  const faussesPaques = Object.entries(PAQUES).filter(([a, d]) => dimancheDePaques(Number(a)) !== d);
  verdict("Pâques tombe le bon dimanche, même au plus tôt et au plus tard", faussesPaques.length === 0,
    faussesPaques.map(([a]) => `${a} : ${dimancheDePaques(Number(a))}`).join(", ") || `${Object.keys(PAQUES).length} années`);

  const chevauchements: string[] = [], desordre: string[] = [];
  for (let a = 2024; a <= 2045; a++) {
    const periodes = MOMENTS_SAISON.map((m) => ({ id: m.id, p: m.periode(a) }));
    for (const { id, p } of periodes) {
      if (!(p[0] <= p[1] && p[0].startsWith(`${a}-`) && p[1].startsWith(`${a}-`))) desordre.push(`${a}:${id}`);
    }
    for (let i = 0; i < periodes.length; i++) {
      for (let j = i + 1; j < periodes.length; j++) {
        const [d1, f1] = periodes[i].p, [d2, f2] = periodes[j].p;
        if (d1 <= f2 && d2 <= f1) chevauchements.push(`${a} : ${periodes[i].id} et ${periodes[j].id}`);
      }
    }
  }
  verdict("deux moments ne se chevauchent jamais, de 2024 à 2045", chevauchements.length === 0, chevauchements.slice(0, 4).join(", ") || "22 années");
  verdict("chaque moment commence avant de finir, dans la même année", desordre.length === 0, desordre.slice(0, 4).join(", ") || "");

  const cas: [string, string | null][] = [
    ["2026-10-24", "soupes"], ["2026-10-19", null], ["2026-11-09", "soupes"], ["2026-11-10", "gratins"],
    ["2026-12-31", "fetes"], ["2027-01-01", "agrumes"], ["2027-01-25", null], ["2027-02-28", "matins-hiver"],
    ["2028-02-29", "matins-hiver"], ["2026-03-22", null], ["2026-03-23", "paques"], ["2026-04-05", "paques"],
    ["2026-04-06", null], ["2026-05-15", null], ["2026-08-31", "glaces"], ["2026-09-01", "rentree"],
  ];
  const fauxJours = cas.filter(([j, attendu]) => (momentDuJour(j, [])?.moment.id ?? null) !== attendu);
  verdict("le bon moment à la bonne date, et rien entre deux", fauxJours.length === 0,
    fauxJours.map(([j, a]) => `${j} : ${momentDuJour(j, [])?.moment.id ?? "rien"} au lieu de ${a ?? "rien"}`).join(", ") || `${cas.length} dates`);
  verdict("les crêpes (trois recettes) ne s'affichent pas", momentDuJour("2027-01-25", []) === null, "il en manque une");
  verdict(`un moment qui garde moins de ${SEUIL_MOMENT} recettes pour le régime ne s'affiche pas`,
    momentDuJour("2026-12-05", ["vegetarien"]) === null && momentDuJour("2026-12-05", [])?.moment.id === "mijote",
    "le mijoté en végétarien n'en garde qu'une");
  const vege = momentDuJour("2026-10-24", ["vegetarien"]);
  verdict("le rail ne garde que ce qui convient au régime",
    !!vege && vege.recettes.length === SEUIL_MOMENT && vege.recettes.every((r) => convient(r, ["vegetarien"])),
    vege?.recettes.map((r) => r.id).join(", ") ?? "rien");

  const soupes = momentDuJour("2026-10-24", []);
  verdict("la phrase dit jusqu'à quand, avec l'espace insécable",
    soupes?.phrase === "Des soupes et des veloutés, jusqu’au 9 novembre.", JSON.stringify(soupes?.phrase));
  verdict("le 29 février s'écrit les années bissextiles", momentDuJour("2028-02-10", [])?.phrase.endsWith("29 février.") === true,
    momentDuJour("2028-02-10", [])?.phrase ?? "");
  verdict("le premier du mois s'écrit « 1er »", jourEnLettres("2029-04-01") === "1er avril", jourEnLettres("2029-04-01"));
  const textes = MOMENTS_SAISON.flatMap((m) => [m.titre, m.surtitre, m.phrase, m.demande]);
  const fautes = textes.filter((t) => /'|—| [?!:;]|^\s|\s$/.test(t));
  verdict("les textes des moments suivent la typographie française", fautes.length === 0, fautes.join(" | ") || `${textes.length} textes`);
  verdict("une demande au Guide est une question", MOMENTS_SAISON.every((m) => m.demande.endsWith(" ?")), "");

  const css = lire("src/components/nutrition/AfficheSaison.module.css");
  const sansJour = MOMENTS_SAISON.filter((m) => !new RegExp(`^\\.${m.id} \\{`, "m").test(css)).map((m) => m.id);
  const sansNuit = MOMENTS_SAISON.filter((m) => !css.includes(`:global([data-theme="dark"]) .${m.id} {`)).map((m) => m.id);
  verdict("chaque moment a sa lumière en clair", sansJour.length === 0, sansJour.join(", ") || `${MOMENTS_SAISON.length} classes`);
  verdict("chaque moment a sa lumière en sombre", sansNuit.length === 0, sansNuit.join(", ") || `${MOMENTS_SAISON.length} classes`);
  verdict("le décor s'arrête quand le téléphone demande moins de mouvement, et sur un appareil modeste",
    css.includes("@media (prefers-reduced-motion: reduce)") && css.includes(":global(html.perf-lite) .chute"), "rien ne tombe, rien ne tourne");
  verdict("la lumière s'efface par un masque, lueurs comprises", /\.affiche::before \{[\s\S]*?mask-image: linear-gradient/.test(css),
    "aucune ligne nette au bord de l'affiche");
  const boiteNature = css.match(/^\.nature \{([^}]*)\}/m)?.[1] ?? "";
  verdict("la boîte de la nature morte est la même dans la lib et dans le CSS",
    boiteNature.includes(`width: ${NATURE_MORTE.largeur}px`) && boiteNature.includes(`height: ${NATURE_MORTE.hauteur}px`),
    `${NATURE_MORTE.largeur} × ${NATURE_MORTE.hauteur}`);
  const zNature = Number(boiteNature.match(/z-index: (\d+)/)?.[1]);
  const zMot = Number(css.match(/^\.titreBoite \{[^}]*z-index: (\d+)/m)?.[1]);
  verdict("les produits passent derrière le mot", zNature < zMot, `${zNature} contre ${zMot}`);
  verdict("le mot garde son contour, de la couleur de sa bande",
    /^\.titre \{[^}]*-webkit-text-stroke: \d+px var\(--bande\);[^}]*paint-order: stroke fill;/m.test(css),
    "ses accents restent lisibles devant un produit");

  const ecran = net(lire("src/components/NutritionTab.tsx"));
  const iIdee = ecran.indexOf("<IdeesDuMoment"), iSaison = ecran.indexOf("<AfficheSaison"), iTrouver = ecran.indexOf("<TrouverRecette");
  verdict("l'affiche vit entre « Une idée » et « Trouver une recette »", iIdee >= 0 && iIdee < iSaison && iSaison < iTrouver, "");
  verdict("le moment se lit sur le jour du téléphone",
    ecran.includes("momentDuJour(aujourdhui, regime)") && ecran.includes("if (!aujourdhui) return null"), "jamais l'horloge du serveur");
  verdict("l'aperçu d'un autre moment est réservé à l'administration", ecran.includes("apercuSaison && estAdmin"), "?saison=<id>");
  const affiche = net(lire("src/components/nutrition/AfficheSaison.tsx"));
  verdict("le mot géant se mesure, il ne se devine pas", affiche.includes("ResizeObserver") && affiche.includes("document.fonts?.ready"), "plafond 76 px");
  verdict("l'affiche n'écrit rien", !/supabase|createClient|nutrition_logs|\.(insert|upsert|delete)\(/.test(affiche), "elle montre, l'écran ouvre");
  const vue = net(lire("src/components/nutrition/CollectionRecettes.tsx"));
  verdict("« Midi et soir » ne garde que des plats", vue.includes('natureDe(r) === "plat"') && !vue.includes('!== "petit-dej"'), "un chocolat chaud n'est pas un dîner");
}

console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
