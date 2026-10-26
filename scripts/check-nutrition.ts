/* ═══════════════════════════════════════════════════════════════════════
   check:nutrition, le banc de l'écran Nutrition (direction 2 de la
   maquette « La nutrition accueillante », 2026-10-22).

     npm run check:nutrition

   ⚠️ IL EXERCE LE VRAI CODE (lib/collectionsRecettes, lib/photoRepas,
   lib/repas), puis il lit la source de l'écran pour les propriétés du
   chemin. Ce qu'il protège tient en quatre phrases :
     · une envie dit ce qu'elle contient, et ne contient que ça ;
     · un extra se note autant qu'on veut, et n'a jamais de case vide ;
     · une idée pour ce repas se prépare pour ce repas (jamais une entrée
       seule, jamais une nuit au frais le matin même) ;
     · la photo d'un repas noté dit vraiment ce plat, ou il n'y en a pas.
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import sharp from "sharp";
import { RECIPES, type DietKey } from "@/lib/recipeBank";
import {
  ENVIES, FAMILLES, MATINS_SALES, MAX_PUCES, MINUTES_IDEE, MINUTES_RAPIDE, NATURE, NB_ENVIES_DU_JOUR,
  ORDRE_PUCES, PROTEINES_APRES_SPORT, REPOS, ROULEMENT, SEUIL_ENVIE,
  besoinsDuJour, convient, demandeAuGuide, dureeRecette, envie, enviesDeFamille, enviesDuJour, ideesDuMoment, numeroDuJour,
  minutesTotales, momentDeRecette, natureDe, photoEnvie, poolDuMoment, pucesDe, recettesDe, regimeConnu,
  type IdEnvie,
} from "@/lib/collectionsRecettes";
import { photoDuRepas, estRecetteVaiiya } from "@/lib/photoRepas";
import { CHOIX_MOMENT, EXTRA, MEAL_META, MOMENT_COURT, REPAS_PRINCIPAUX, classerRecents, heureLisible, milliers, momentDuRepas, MOMENTS } from "@/lib/repas";
import { voix } from "@/lib/guides";
import {
  PLAFOND_FAVORIS, clePlat, compteFavoris, epinglesAReprendre, favoriDePlat, favoriDeRecette, favoriLu,
  platsFavoris, platsProposes, recettesFavorites, trierFavoris, type Favori,
} from "@/lib/favorisNutrition";
import {
  MOMENTS_SAISON, NATURE_MORTE, SEUIL_MOMENT, VISIBLE, dimancheDePaques, imageProduit, jourEnLettres, momentActif, momentDuJour,
  recettesDuMoment,
} from "@/lib/momentsSaison";
import { MAX_APPROCHANTES, chercherRecettes, ditsDesIntentions, lireSaisie, normaliser } from "@/lib/rechercheRecettes";

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

/* ── 2 · Les envies disent vrai ── */
{
  const ids = ENVIES.map((e) => e.id);
  verdict("38 envies, chacune une seule fois", ids.length === 38 && new Set(ids).size === ids.length, `${ids.length} envies`);
  const sansFamille = ENVIES.filter((e) => !FAMILLES.some((f) => f.id === e.famille)).map((e) => e.id);
  const famillesVides = FAMILLES.filter((f) => !ENVIES.some((e) => e.famille === f.id)).map((f) => f.id);
  verdict("chaque envie vit dans une famille, et chaque famille a ses envies", sansFamille.length === 0 && famillesVides.length === 0,
    [...sansFamille, ...famillesVides].join(", ") || `${FAMILLES.length} familles`);
  const maigres = ENVIES.filter((e) => recettesDe(e.id).length < 6).map((e) => `${e.id} ${recettesDe(e.id).length}`);
  verdict("chaque envie garde au moins six recettes", maigres.length === 0, maigres.join(", ") || "");
  const tuiles = ENVIES.filter((e) => { const r = RECIPES.find((x) => x.id === e.tuile); return !r || !e.garde(r); }).map((e) => e.id);
  verdict("la photo d'une envie est une recette de l'envie", tuiles.length === 0, tuiles.join(", ") || "");
  const seules = RECIPES.filter((r) => ENVIES.filter((e) => e.garde(r)).length < 2).map((r) => r.id);
  verdict("chaque recette se trouve par au moins deux envies", seules.length === 0, seules.join(", ") || `${RECIPES.length} recettes`);

  const vite = recettesDe("vite");
  const tropLongues = vite.filter((r) => minutesTotales(r) > MINUTES_RAPIDE || !!REPOS[r.id]?.texte);
  verdict(`« Faire vite » : tout est prêt en ${MINUTES_RAPIDE} minutes, repos compris`, tropLongues.length === 0,
    tropLongues.map((r) => `${r.id} ${minutesTotales(r)} min`).join(", ") || `${vite.length} recettes`);
  verdict("« Faire vite » ne garde ni gambas (10 min de marinade) ni overnight oats (une nuit)",
    !vite.some((r) => r.id === "gambas-grillees-ail-persil" || r.id === "overnight-oats-chocolat-noisette"), "le repos entre dans le compte");
  verdict("« Faire vite » se lit de la plus courte à la plus longue",
    vite.every((r, i) => i === 0 || minutesTotales(vite[i - 1]) <= minutesTotales(r)), dureeRecette(vite[0]));
  const legumes = recettesDe("legumes");
  verdict("« Légumes » : ni viande ni poisson", legumes.every((r) => convient(r, ["vegetarien"])), `${legumes.length} recettes`);
  const sport = recettesDe("sport");
  verdict(`« Après le sport » : au moins ${PROTEINES_APRES_SPORT} g de protéines par portion`,
    sport.every((r) => r.proteins >= PROTEINES_APRES_SPORT), `la moins riche : ${Math.min(...sport.map((r) => r.proteins))} g`);
  const shakers = sport.filter((r) => natureDe(r) === "boisson");
  verdict("« Après le sport » garde les shakers et commence par eux",
    shakers.length >= 7 && sport.slice(0, shakers.length).every((r) => natureDe(r) === "boisson"),
    `${shakers.length} boissons sur ${sport.length} recettes`);
  verdict("« Un dessert » : que des desserts", recettesDe("dessert").every((r) => natureDe(r) === "dessert"), `${recettesDe("dessert").length} desserts`);
  verdict("« Boire » : que des boissons", recettesDe("boire").every((r) => natureDe(r) === "boisson"), `${recettesDe("boire").length} boissons`);
  const riz = recettesDe("riz");
  verdict("« Riz » : jamais le quinoa, le couscous ni les nouilles de riz",
    !riz.some((r) => ["bowl-de-poulet-quinoa-et-avocat", "pho-au-boeuf", "bowl-de-tofu-croustillant-nouilles-de-riz-et-edamame"].includes(r.id) || r.id.startsWith("tajine")),
    `${riz.length} plats`);
  const pasDesPlats = (["repas", "pates", "riz"] as IdEnvie[]).flatMap((id) => recettesDe(id).filter((r) => natureDe(r) !== "plat").map((r) => `${id}:${r.id}`));
  verdict("« Un vrai repas », « Pâtes » et « Riz » : que des plats", pasDesPlats.length === 0, pasDesPlats.join(", ") || "le tzatziki n'est pas un repas");

  /* Les pièges des mots, rejoués sur les recettes de la banque qui les portent. */
  const dans = (id: IdEnvie, recette: string) => recettesDe(id).some((r) => r.id === recette);
  verdict("« semoule » ne fait pas des moules : le tajine et le poulet aux olives ne sont pas du poisson",
    !dans("poisson", "tajine-d-agneau-aux-abricots-citron-confit-et-couscous") && !dans("poisson", "poulet-au-citron-et-aux-olives")
      && dans("poisson", "moules-marinieres-et-frites-au-four"), "les vraies moules restent du poisson");
  verdict("« oignon nouveau » ne fait pas du veau", !dans("viande", "taboule-libanais") && !dans("viande", "poke-bowl-saumon-avocat"), "le taboulé reste végétarien");
  verdict("« bœuf » ne fait pas des œufs", !["boeuf-bourguignon", "pho-au-boeuf", "wok-de-boeuf-aux-legumes-croquants"].some((id) => dans("oeufs", id)), "");
  verdict("un bouillon ne fait pas de la viande", !dans("viande", "veloute-de-potimarron-et-chataignes") && !dans("poulet", "veloute-de-carottes"), "");

  /* Sucré, salé : un petit-déjeuner ou un encas salé s'écrit à la main dans
     MATINS_SALES. Un matin qui n'y est pas doit être sucré par ses ingrédients. */
  const SUCRE = /sucre|miel|sirop|chocolat|cacao|banane|pomme|poire|fruit|fraise|framboise|myrtille|mangue|kiwi|clementine|confiture|cannelle|vanille|datte|erable|raisin|compote|coco|caramel|pepites/;
  const SALE = /jambon|saumon|thon|poulet|feta|avocat|epinard|tomate|lardon|bacon|champignon|poivron|oignon|parmesan|emmental|gruyere|ciboulette/;
  const nom = (v: string) => v.toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const douteux = RECIPES.filter((r) => (natureDe(r) === "petit-dej" || natureDe(r) === "encas") && !MATINS_SALES.has(r.id))
    .filter((r) => { const i = r.ingredients.map((x) => nom(x.nom)).join(" "); return !SUCRE.test(i) || SALE.test(i); }).map((r) => r.id);
  verdict("un matin ou un encas salé est écrit dans MATINS_SALES", douteux.length === 0, douteux.join(", ") || "les autres sont sucrés");
  const salesInconnus = [...MATINS_SALES].filter((id) => { const r = RECIPES.find((x) => x.id === id); return !r || !["petit-dej", "encas"].includes(natureDe(r)); });
  verdict("MATINS_SALES ne liste que des matins et des encas de la banque", salesInconnus.length === 0, salesInconnus.join(", ") || `${MATINS_SALES.size} recettes`);
  const sucre = recettesDe("sucre");
  verdict("« Sucré » : aucun plat, aucune entrée, aucun matin salé",
    sucre.every((r) => natureDe(r) !== "plat" && natureDe(r) !== "entree" && !MATINS_SALES.has(r.id)), `${sucre.length} recettes`);

  /* Les puces : elles s'additionnent, et chacune change vraiment la liste. */
  const cas = recettesDe("sucre", [], ["chocolat", "vite"]);
  verdict("Sucré, puis chocolat et faire vite : la liste de la maquette", cas.length === 6, cas.map((r) => r.id).join(", "));
  const p = pucesDe("sucre", [], ["chocolat", "vite"]);
  verdict("les puces choisies passent en tête", p[0]?.id === "chocolat" && p[0].choisie && p[1]?.id === "vite" && p[1].choisie && !p[2]?.choisie,
    p.map((x) => (x.choisie ? `[${x.label}]` : x.label)).join(" · "));
  const inutiles: string[] = [];
  for (const e of ENVIES) {
    const liste = recettesDe(e.id);
    for (const x of pucesDe(e.id)) {
      const n = liste.filter(envie(x.id).garde).length;
      if (x.id === e.id || x.choisie || n < 2 || n >= liste.length) inutiles.push(`${e.id}+${x.id}`);
    }
    if (pucesDe(e.id).length > MAX_PUCES) inutiles.push(`${e.id} : trop de puces`);
  }
  verdict(`une puce change vraiment la liste, et il y en a ${MAX_PUCES} au plus`, inutiles.length === 0, inutiles.slice(0, 6).join(", ") || `${ENVIES.length} envies`);
  const intersection = recettesDe("sport", [], ["sucre"]).map((r) => r.id).join();
  const attendue = recettesDe("sport").filter((r) => recettesDe("sucre").includes(r)).map((r) => r.id).join();
  verdict("deux envies ensemble gardent ce qui est dans les deux", intersection === attendue && intersection.length > 0, `${recettesDe("sport", [], ["sucre"]).length} recettes`);
  const ordre = new Set(ORDRE_PUCES);
  verdict("chaque envie peut devenir une puce", ENVIES.every((e) => ordre.has(e.id)) && ordre.size === ENVIES.length,
    ENVIES.filter((e) => !ordre.has(e.id)).map((e) => e.id).join(", ") || `${ORDRE_PUCES.length} puces`);

  /* Les mots : ceux de l'écran et ceux qu'on demande au Guide. */
  verdict("la demande au Guide reprend les envies choisies",
    demandeAuGuide("sucre", ["chocolat", "vite"]) === `Tu as une autre idée de recette sucrée, au chocolat et prête en ${MINUTES_RAPIDE} minutes ou moins ?`,
    JSON.stringify(demandeAuGuide("sucre", ["chocolat", "vite"])));
  const demandes = ENVIES.map((e) => demandeAuGuide(e.id));
  verdict("une demande au Guide est une question", demandes.every((d) => d.endsWith(" ?")), `${demandes.length} demandes`);
  const textes = [...ENVIES.flatMap((e) => [e.label, e.sousTitre, demandeAuGuide(e.id)]), ...FAMILLES.map((f) => f.nom)];
  const fautes = textes.filter((t) => /'|—| [?!:;]|^\s|\s$/.test(t));
  verdict("les textes des envies suivent la typographie française", fautes.length === 0, fautes.join(" | ") || `${textes.length} textes`);
  verdict("un sous-titre dit ce qui fait entrer une recette, en une phrase", ENVIES.every((e) => e.sousTitre.endsWith(".")), "");

  /* L'écran : neuf envies qui changent chaque jour (Louis, 2026-10-25), rejouées sur deux ans pour chaque régime. */
  const JOURS = Array.from({ length: 730 }, (_, i) => new Date(Date.UTC(2026, 9, 1) + i * 86_400_000).toISOString().slice(0, 10));
  verdict("neuf envies sur l'écran, chaque jour", JOURS.every((j) => enviesDuJour(j).length === NB_ENVIES_DU_JOUR), enviesDuJour("2026-10-25").join(", "));
  verdict("le même jour donne les mêmes envies", enviesDuJour("2026-10-25").join() === enviesDuJour("2026-10-25").join() && enviesDuJour("2026-10-25").join() !== enviesDuJour("2026-10-26").join(), "le jour du téléphone, jamais le hasard");
  verdict("le roulement contient chaque envie une fois", ROULEMENT.length === ENVIES.length && new Set(ROULEMENT).size === ENVIES.length, `${ROULEMENT.length} envies`);
  const REGIMES_TEST: DietKey[][] = [[], ["vegetarien"], ["vegan"], ["sans-gluten"], ["sans-lactose"]];
  const repetes: string[] = [], tropMaigres: string[] = [], peuMelees: string[] = [];
  for (const regime of REGIMES_TEST) {
    const nom = regime.join("+") || "sans régime";
    let hier: IdEnvie[] = [];
    for (const j of JOURS) {
      const jour = enviesDuJour(j, regime);
      if (jour.length !== NB_ENVIES_DU_JOUR) tropMaigres.push(`${nom} ${j} : ${jour.length} envies`);
      if (jour.some((x) => hier.includes(x))) repetes.push(`${nom} ${j}`);
      if (jour.some((x) => recettesDe(x, regime).length < SEUIL_ENVIE)) tropMaigres.push(`${nom} ${j}`);
      if (new Set(jour.map((x) => envie(x).famille)).size < 5) peuMelees.push(`${nom} ${j}`);
      hier = jour;
    }
  }
  verdict("deux jours de suite ne partagent aucune envie, pour chaque régime", repetes.length === 0, repetes.slice(0, 3).join(", ") || "deux ans, cinq régimes");
  verdict("une envie trop maigre pour le régime sort du tour, et il en reste neuf", tropMaigres.length === 0, tropMaigres.slice(0, 3).join(", ") || "");
  verdict("chaque jour mêle au moins cinq familles", peuMelees.length === 0, peuMelees.slice(0, 3).join(", ") || "");
  const derniere = new Map<IdEnvie, number>();
  let ecart = 0;
  JOURS.forEach((j, i) => { for (const x of enviesDuJour(j)) { if (derniere.has(x)) ecart = Math.max(ecart, i - derniere.get(x)!); derniere.set(x, i); } });
  verdict("chaque envie revient au moins tous les cinq jours", ecart <= 5 && derniere.size === ENVIES.length, `${ecart} jours au plus, ${derniere.size} envies`);
  verdict("le numéro du jour suit le calendrier, changements d'année et 29 février compris",
    numeroDuJour("2027-01-01") === numeroDuJour("2026-12-31") + 1 && numeroDuJour("2028-03-01") === numeroDuJour("2028-02-29") + 1
      && numeroDuJour("2028-02-29") === numeroDuJour("2028-02-28") + 1, String(numeroDuJour("2026-10-25")));
  const photos = ENVIES.map((e) => e.tuile);
  verdict("une photo n'est la tuile que d'une seule envie", new Set(photos).size === photos.length, photos.filter((p, i) => photos.indexOf(p) !== i).join(", ") || `${photos.length} photos`);
  verdict("« Poisson » ne montre plus le poisson entier à la plancha", envie("poisson").tuile !== "poisson-entier-a-la-plancha", envie("poisson").tuile);
  const photoVegan = photoEnvie("legumes", ["vegan"]);
  verdict("la photo d'une envie convient au régime", RECIPES.some((r) => r.image === photoVegan && convient(r, ["vegan"])), photoVegan);
  verdict("« Toutes les envies » ne montre pas une envie à moins de deux recettes",
    FAMILLES.every((f) => enviesDeFamille(f.id, ["vegan"]).every(({ n }) => n >= SEUIL_ENVIE)), "");
}

/* ── 3 · Le régime : végétalien vaut végétarien, une clé inconnue ne vide rien ── */
{
  verdict("un régime inconnu ne filtre rien", regimeConnu(["halal", 3, null]).length === 0, "pickRecipes vidait toute la banque");
  verdict("les accents et la casse ne comptent pas", regimeConnu(["Végétarien"]).join() === "vegetarien", regimeConnu(["Végétarien"]).join());
  const sorbet = RECIPES.find((r) => r.id === "sorbet-framboise-minute")!;
  verdict("une recette végétalienne convient à un végétarien", convient(sorbet, ["vegetarien"]), sorbet.diet.join(", "));
  verdict("un végétarien garde neuf envies sur l'écran", enviesDuJour("2026-10-25", ["vegetarien"]).length === NB_ENVIES_DU_JOUR, enviesDuJour("2026-10-25", ["vegetarien"]).join(", "));
  const viande = recettesDe("sport", ["vegetarien"], ["sucre"]).filter((r) => !convient(r, ["vegetarien"]));
  verdict("une envie filtrée ne rend rien d'incompatible", viande.length === 0, viande.map((r) => r.id).join(", ") || "rien");
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
    "10 h petit-déjeuner, 11 h déjeuner, 15 h extra, 18 h dîner");
  verdict("le créneau « gouter » s'affiche « Extra »", MEAL_META[EXTRA].label === "Extra" && MOMENT_COURT[EXTRA] === "Extra", "la valeur reste « gouter » en base");
  verdict("trois repas ont une case « rien d'ajouté », l'extra jamais", REPAS_PRINCIPAUX.length === 3 && !REPAS_PRINCIPAUX.includes(EXTRA), REPAS_PRINCIPAUX.join(", "));
  verdict("l'extra se choisit en dernier, après le dîner", CHOIX_MOMENT[CHOIX_MOMENT.length - 1] === EXTRA && CHOIX_MOMENT.length === 4, CHOIX_MOMENT.map((m) => MOMENT_COURT[m]).join(" · "));
  const shaker = RECIPES.find((x) => x.id === "shaker-chocolat-noisette")!;
  const cookie = RECIPES.find((x) => x.id === "cookies-proteines-aux-pepites-de-chocolat")!;
  const plat = RECIPES.find((x) => x.id === "bowl-de-poulet-quinoa-et-avocat")!;
  verdict("une boisson ou un encas de la banque part en extra, à toute heure",
    momentDeRecette(shaker, 12) === EXTRA && momentDeRecette(cookie, 8) === EXTRA && momentDeRecette(plat, 12) === "dejeuner" && momentDeRecette(plat, 20) === "diner",
    "un plat suit l'heure");
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
  verdict("les recettes par thème générées par l'IA sont parties", !ecran.includes("RecipesByTheme") && !existsSync(new URL("../src/components/RecipesByTheme.tsx", import.meta.url)), "remplacées par les envies en photo");
  verdict("la rangée des sept jours a quitté l'écran", !ecran.includes("getMondayWeek") && !ecran.includes("weekDays"), "les jours se parcourent dans le détail");
  verdict("« J'ai déjà mangé · Je saute ce repas » sont partis", !hero.includes("Je saute ce repas") && !hero.includes("déjà mangé"), "l'ajout vit sous la question");
  verdict("la question est datée par le moment du téléphone", hero.includes("`nutrition.question.${moment}`") && ecran.includes("useMomentRepas"), "jamais l'heure du serveur");
  verdict("un total de calories à quatre chiffres ne prend pas le chiffre mono", journee.includes("v < 1000") && journee.includes("milliers("), "l'espace des milliers prendrait une case entière");
  const demandeurs = [
    "src/components/nutrition/FeuilleAjoutRepas.tsx", "src/components/nutrition/GrillePlats.tsx",
    "src/components/nutrition/VueFavoris.tsx", "src/hooks/useFavorisNutrition.ts",
  ].map((f) => net(lire(f))).join("\n");
  verdict("« Ma journée » : un extra n'a jamais de case « rien d'ajouté »",
    journee.includes("REPAS_PRINCIPAUX.filter((t) => !repas.some") && !journee.includes("MOMENTS.filter") && journee.includes("Ajouter un extra"),
    "la liste des extras finit sur « Ajouter un extra »");
  verdict("les extras comptent dans les chiffres du jour", journee.includes("(repas ?? []).reduce((t, m) => t + (m[cle] || 0), 0)") && journee.includes("d’extras"),
    "le total prend toute la journée, et dit la part des extras");
  verdict("une recette ajoutée depuis sa fiche suit sa nature", ecran.includes("momentDeRecette(recetteOuverte"), "un shaker part en extra");
  const ajout = net(lire("src/components/nutrition/FeuilleAjoutRepas.tsx"));
  verdict("« Ajouter un extra » montre les derniers extras", ajout.includes("CHOIX_MOMENT.map") && ajout.includes("extra ? extras : plats") && ajout.includes('"Ajouter un extra"'),
    "et « Mes plats » pour un repas");
  verdict("les derniers extras se lisent dans le journal", ecran.includes('meal_type === EXTRA') && ecran.includes('"food_name, calories, proteins, carbs, fats, meal_type"'), "");
  const ailleurs = ["src/components/AssistantSheet.tsx", "src/app/admin/page.tsx", "src/app/api/chat/route.ts"].filter((f) => /"Goûter"|"Collation"/.test(net(lire(f))));
  verdict("le créneau se dit « Extra » partout, jamais « Goûter » ni « Collation »", ailleurs.length === 0, ailleurs.join(", ") || "l'✦, l'administration, le coach");
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
    ["2026-12-31", "fetes"], ["2027-01-01", "agrumes"], ["2027-01-25", "crepes"], ["2027-02-28", "matins-hiver"],
    ["2028-02-29", "matins-hiver"], ["2026-03-22", null], ["2026-03-23", "paques"], ["2026-04-05", "paques"],
    ["2026-04-06", null], ["2026-05-15", null], ["2026-08-31", "glaces"], ["2026-09-01", "rentree"],
  ];
  const fauxJours = cas.filter(([j, attendu]) => (momentDuJour(j, [])?.moment.id ?? null) !== attendu);
  verdict("le bon moment à la bonne date, et rien entre deux", fauxJours.length === 0,
    fauxJours.map(([j, a]) => `${j} : ${momentDuJour(j, [])?.moment.id ?? "rien"} au lieu de ${a ?? "rien"}`).join(", ") || `${cas.length} dates`);
  verdict("les trous que le lot 3 comble s'affichent : les crêpes, le mijoté en végétarien",
    momentDuJour("2027-01-25", [])?.moment.id === "crepes" && momentDuJour("2026-12-05", ["vegetarien"])?.moment.id === "mijote",
    `crêpes ${momentDuJour("2027-01-25", [])?.recettes.length ?? 0}, mijoté végétarien ${momentDuJour("2026-12-05", ["vegetarien"])?.recettes.length ?? 0}`);
  const agrumesVegan = momentActif(MOMENTS_SAISON.find((m) => m.id === "agrumes")!, "2027-01-10", ["vegan"]);
  verdict(`un moment qui garde moins de ${SEUIL_MOMENT} recettes pour le régime ne s'affiche pas`,
    recettesDuMoment(MOMENTS_SAISON.find((m) => m.id === "agrumes")!, ["vegan"]).length === SEUIL_MOMENT - 1
      && agrumesVegan === null && momentDuJour("2027-01-10", [])?.moment.id === "agrumes",
    "les agrumes en végan n'en gardent que trois");
  const vege = momentDuJour("2026-10-24", ["vegetarien"]);
  const soupes0 = MOMENTS_SAISON.find((m) => m.id === "soupes")!.recettes.map((id) => RECIPES.find((r) => r.id === id)!);
  verdict("le rail ne garde que ce qui convient au régime",
    !!vege && vege.recettes.length === soupes0.filter((r) => convient(r, ["vegetarien"])).length
      && vege.recettes.length < soupes0.length && vege.recettes.every((r) => convient(r, ["vegetarien"])),
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
  verdict("l'affiche vit entre « Une idée » et « Envie de quoi ? »", iIdee >= 0 && iIdee < iSaison && iSaison < iTrouver, "");
  const trouver = net(lire("src/components/nutrition/TrouverRecette.tsx"));
  verdict("« Envie de quoi ? » pose des envies en photo et ouvre « Toutes les envies »",
    trouver.includes("<TuileEnvie") && trouver.includes("onToutes") && trouver.includes("Envie de quoi&nbsp;?"), "la loupe garde la recherche");
  verdict("une envie s'ouvre par-dessus la vue d'où elle vient",
    ecran.includes('useRetourTelephone(envieVue !== null, "nutritionEnvie", fermerEnvie)') && ecran.includes('useRetourTelephone(vue.nom === "envies", "nutritionEnvies", fermerVue)'),
    "le retour du téléphone ne ferme qu'elle");
  verdict("la demande au Guide reprend les envies choisies", ecran.includes("demandeAuGuide(envieVue.id, envieVue.filtres)"), "");
  verdict("les envies du jour se lisent sur le jour du téléphone", ecran.includes("? enviesDuJour(aujourdhui, regime)") && trouver.includes("NB_ENVIES_DU_JOUR"),
    "des tuiles vides tant que le jour n'est pas connu");
  const vues = ["src/components/nutrition/TrouverRecette.tsx", "src/components/nutrition/ToutesLesEnvies.tsx", "src/components/nutrition/TuileEnvie.tsx"].map((f) => net(lire(f))).join("\n");
  verdict("les envies n'écrivent rien", !/supabase|createClient|nutrition_logs|\.(insert|upsert|delete)\(/.test(vues), "elles montrent, l'écran ouvre");
  verdict("le moment se lit sur le jour du téléphone",
    ecran.includes("momentDuJour(aujourdhui, regime)") && ecran.includes("if (!aujourdhui) return null"), "jamais l'horloge du serveur");
  verdict("l'aperçu d'un autre moment est réservé à l'administration", ecran.includes("apercuSaison && estAdmin"), "?saison=<id>");
  const affiche = net(lire("src/components/nutrition/AfficheSaison.tsx"));
  verdict("le mot géant se mesure, il ne se devine pas", affiche.includes("ResizeObserver") && affiche.includes("document.fonts?.ready"), "plafond 76 px");
  verdict("l'affiche n'écrit rien", !/supabase|createClient|nutrition_logs|\.(insert|upsert|delete)\(/.test(affiche), "elle montre, l'écran ouvre");
  const vue = net(lire("src/components/nutrition/CollectionRecettes.tsx"));
  verdict("« Midi et soir » ne garde que des plats", vue.includes('natureDe(r) === "plat"') && !vue.includes('!== "petit-dej"'), "un chocolat chaud n'est pas un dîner");

  /* Le décor. Chaque moment a son motif, chaque motif se dessine dans
     l'affiche, et toute animation du module s'arrête dans les deux cas
     (mouvement réduit, appareil modeste) : la liste se lit dans le CSS,
     elle ne s'écrit pas ici. */
  const motifs = MOMENTS_SAISON.map((m) => m.motif);
  const doubles = motifs.filter((m, i) => motifs.indexOf(m) !== i);
  verdict("chaque moment a son motif, et aucun motif ne sert deux fois", doubles.length === 0, doubles.join(", ") || `${motifs.length} motifs`);
  const nonDessines = motifs.filter((m) => !new RegExp(`\\b${m}: <[A-Z]`).test(affiche));
  verdict("chaque motif se dessine dans l'affiche", nonDessines.length === 0, nonDessines.join(", ") || "DECOR_AFFICHE et DECOR_TETE");

  const cssNet = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const keyframes = [...cssNet.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
  const keyframesDoubles = keyframes.filter((k, i) => keyframes.indexOf(k) !== i);
  verdict("chaque animation du module porte un nom qui n'est qu'à elle", keyframesDoubles.length === 0,
    keyframesDoubles.join(", ") || `${keyframes.length} animations`);
  const reduit = cssNet.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const horsBlocs = cssNet.replace(/@keyframes [\w-]+ \{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/, "");
  const regles = (texte: string) => [...texte.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selecteurs: m[1].split(",").map((x) => x.trim()).filter(Boolean), corps: m[2] }));
  const animes = new Set(regles(horsBlocs)
    .filter((r) => /(^|;|\s)animation(-name)?:(?!\s*none)/.test(r.corps))
    .flatMap((r) => r.selecteurs)
    .filter((x) => !x.startsWith(":global(html.perf-lite)") && !x.startsWith("@")));
  const arretes = (liste: { selecteurs: string[]; corps: string }[]) =>
    new Set(liste.filter((r) => /animation:\s*none/.test(r.corps)).flatMap((r) => r.selecteurs));
  const arretReduit = arretes(regles(reduit));
  const arretModeste = arretes(regles(horsBlocs));
  const oubliesReduit = [...animes].filter((x) => !arretReduit.has(x));
  const oubliesModeste = [...animes].filter((x) => !arretModeste.has(`:global(html.perf-lite) ${x}`));
  verdict("toute animation du décor s'arrête quand le téléphone demande moins de mouvement", animes.size > 10 && oubliesReduit.length === 0,
    oubliesReduit.join(", ") || `${animes.size} éléments animés`);
  verdict("toute animation du décor s'arrête sur un appareil modeste", animes.size > 10 && oubliesModeste.length === 0,
    oubliesModeste.join(", ") || `${animes.size} éléments animés`);

  /* Les couleurs : en sombre, un moment redéfinit tout ce qu'il pose en
     clair, et chaque motif trouve les siennes chez son moment. */
  const bloc = (selecteur: string) => {
    const debut = css.indexOf(`\n${selecteur} {`);
    return debut < 0 ? "" : css.slice(debut, css.indexOf("\n}", debut));
  };
  const variables = (texte: string) => new Set([...texte.matchAll(/(--[\w-]+):/g)].map((m) => m[1]));
  const nuitIncomplete = MOMENTS_SAISON.flatMap((m) => {
    const nuit = variables(bloc(`:global([data-theme="dark"]) .${m.id}`));
    return [...variables(bloc(`.${m.id}`))].filter((v) => !nuit.has(v)).map((v) => `${m.id}:${v}`);
  });
  verdict("en sombre, chaque moment redéfinit toutes ses couleurs du clair", nuitIncomplete.length === 0,
    nuitIncomplete.join(", ") || `${MOMENTS_SAISON.length} moments`);
  const TEINTES = (n: number) => Array.from({ length: n }, (_, i) => `--teinte-${i + 1}`);
  const COULEURS_MOTIF: Record<string, string[]> = {
    tranche: ["--zeste", "--albedo", "--pulpe"],
    crepe: ["--pate", "--pate-bord", "--pate-tache", "--pate-ombre"],
    neige: ["--flocon-ombre"],
    petales: [...TEINTES(6), "--nervure"],
    aigrettes: ["--aigrette-trait", "--aigrette-ombre", "--aigrette-graine"],
    braises: [...TEINTES(3), "--braise-halo"],
    soleil: ["--rayon", "--disque"],
    cahier: ["--cahier-marge", "--cahier-carreau", "--cahier-forte", "--cahier-ligne"],
    feuilles: TEINTES(6),
    pluie: ["--goutte"],
    givre: ["--givre-brume", "--givre-trait", "--givre-ombre"],
    guirlande: ["--fil", "--douille"],
  };
  const sansCouleur = MOMENTS_SAISON.flatMap((m) => {
    const attendues = COULEURS_MOTIF[m.motif];
    if (!attendues) return [`${m.id}:${m.motif} sans table`];
    const jour = variables(bloc(`.${m.id}`)), nuit = variables(bloc(`:global([data-theme="dark"]) .${m.id}`));
    return attendues.filter((v) => !jour.has(v) || !nuit.has(v)).map((v) => `${m.id}:${v}`);
  });
  verdict("chaque motif trouve ses couleurs chez son moment, en clair et en sombre", sansCouleur.length === 0,
    sansCouleur.join(", ") || "les douze");
  const sansVapeur = MOMENTS_SAISON.filter((m) => m.vapeur
    && !(variables(bloc(`.${m.id}`)).has("--vapeur") && variables(bloc(`:global([data-theme="dark"]) .${m.id}`)).has("--vapeur"))).map((m) => m.id);
  verdict("la vapeur a sa couleur, en clair et en sombre", sansVapeur.length === 0, sansVapeur.join(", ") || "");
  const lues = new Set([...cssNet.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  const inutiles = Object.values(COULEURS_MOTIF).flat().filter((v) => !lues.has(v));
  verdict("chaque couleur attendue d'un motif est lue par le module", inutiles.length === 0, inutiles.join(", ") || "");
}

/* ── 12 · La loupe (lib/rechercheRecettes) : l'écriture, l'intention, et un régime qui ne se relâche jamais ── */
{
  const ids = (q: string, regime: DietKey[] = []) => chercherRecettes(q, regime).recettes.map((r) => r.id);
  const memes = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const lu = (q: string) => lireSaisie(q).termes.map((t) =>
    t.sorte === "intention" ? `${t.sans ? "-" : ""}${t.intention.id}` : t.sorte === "mot" ? `${t.sans ? "-" : ""}«${t.cle}»`
      : t.sorte === "expression" ? `«${t.suite.join(" ")}»` : "chiffre").join(" ");

  /* L'écriture : la ligature, la casse, les accents, les pluriels. */
  verdict("« Œ » se défait en « oe », les accents et les majuscules tombent", normaliser("Bœuf BOURGUIGNON, Œufs brouillés") === "boeuf bourguignon oeufs brouilles",
    normaliser("Bœuf BOURGUIGNON, Œufs brouillés"));
  // Témoin : l'ancienne loupe (accents retirés, morceaux de texte comparés) ne connaissait pas « œ ».
  const ancienne = (q: string) => {
    const sans = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return RECIPES.filter((r) => sans(q).split(/\s+/).every((m) => sans(`${r.nom} ${r.description} ${r.tags.join(" ")}`).includes(m)));
  };
  verdict("témoin : l'ancienne loupe ne trouvait rien pour « oeuf » ni pour « boeuf »", ancienne("oeuf").length === 0 && ancienne("boeuf").length === 0,
    `${ancienne("oeuf").length} et ${ancienne("boeuf").length}`);
  const boeuf = ids("bœuf");
  verdict("« boeuf », « Bœuf », « BOEUF » et « bœuf » donnent la même liste", boeuf.length > 0 && ["boeuf", "Bœuf", "BOEUF"].every((q) => memes(ids(q), boeuf)),
    `${boeuf.length} recettes, d'abord ${boeuf[0]}`);
  verdict("« oeuf » trouve les œufs cocotte, et pas le bœuf bourguignon (« œuf » est dans « bœuf »)",
    ids("oeuf").includes("oeufs-cocotte-epinards-jambon") && !ids("oeuf").includes("boeuf-bourguignon") && memes(ids("oeuf"), ids("Œufs")), `${ids("oeuf").length} recettes`);
  verdict("« bœuf bourguignon » ouvre sur le bœuf bourguignon, sans le bourguignon de champignons",
    ids("bœuf bourguignon")[0] === "boeuf-bourguignon" && !ids("BOEUF BOURGUIGNON").includes("bourguignon-de-champignons"), ids("bœuf bourguignon").join(", "));
  verdict("le pluriel et les accents ne comptent pas : « crepe » = « Crêpes », « gateaux » = « gâteau »",
    ids("crepe").length >= 6 && memes(ids("crepe"), ids("Crêpes")) && memes(ids("gateaux"), ids("gâteau")), `${ids("crepe").length} crêpes`);

  /* Les fautes de frappe et l'oreille. */
  const fautes: Record<string, string> = {
    bourgignon: "boeuf-bourguignon", spagetti: "spaghetti-aux-boulettes-de-dinde", kinoa: "bowl-de-poulet-quinoa-et-avocat",
    humus: "houmous-de-betterave", tartiflète: "tartiflette-allegee", lazagne: "lasagnes-epinards-ricotta",
    tagine: "tajine-d-agneau-aux-abricots-citron-confit-et-couscous", carote: "veloute-de-carottes", brocolli: "meal-prep-poulet-riz-et-brocoli",
    bolognese: "pates-bolognaise-maison",
  };
  const ratees = Object.entries(fautes).filter(([q, id]) => !ids(q).includes(id)).map(([q]) => q);
  verdict("une faute de frappe, ou un mot écrit comme il se prononce, trouve la recette", ratees.length === 0, ratees.join(", ") || Object.keys(fautes).join(", "));
  verdict("une correction garde sa première lettre : « quiche » ne devient pas « riche », ni « raclette » « galette »",
    lu("quiche") === "oeufs" && lu("raclette") === "fromage", `${lu("quiche")} · ${lu("raclette")}`);

  /* Les régimes, et leurs façons de les dire. */
  const sansGluten = RECIPES.filter((r) => r.diet.includes("sans-gluten"));
  const gf = chercherRecettes("sans gluten");
  verdict("« sans gluten » : toutes les recettes sans gluten, et rien d'autre", gf.recettes.length === sansGluten.length
    && gf.recettes.every((r) => r.diet.includes("sans-gluten")), `${gf.recettes.length} sur ${sansGluten.length}`);
  verdict("« sans gluten » ouvre sur des plats", gf.recettes.slice(0, 5).every((r) => natureDe(r) === "plat"), gf.recettes.slice(0, 5).map((r) => r.id).join(", "));
  const glutens = ["sans glu", "sans glutten", "pas de gluten", "SANS GLUTEN", "céliaque"].filter((q) => !memes(ids(q), gf.recettes.map((r) => r.id)));
  verdict("« sans glu » (en cours), « sans glutten », « pas de gluten » : la même liste", glutens.length === 0, glutens.join(", ") || "cinq façons");
  const vege = RECIPES.filter((r) => r.diet.includes("vegetarien") || r.diet.includes("vegan")).map((r) => r.id).sort().join();
  const veges = ["végétarien", "vege", "végé", "veggie", "végétariennes", "vegeterien", "sans viande", "pas de viande"]
    .filter((q) => ids(q).sort().join() !== vege);
  verdict("« végé », « vegeterien », « sans viande »… : les recettes végétariennes ou véganes, toutes", veges.length === 0, veges.join(", ") || "huit façons");
  const vegans = ["vegan", "végétalien", "100% végétal"].filter((q) => !ids(q).length || chercherRecettes(q).recettes.some((r) => !r.diet.includes("vegan")));
  verdict("« vegan », « végétalien », « 100 % végétal » : que des recettes véganes", vegans.length === 0, vegans.join(", ") || "trois façons");

  /* ⚠️ Un régime ne se relâche jamais, même quand rien ne réunit tout. */
  const regimes: [string, (r: (typeof RECIPES)[number]) => boolean][] = [
    ["sans gluten", (r) => r.diet.includes("sans-gluten")], ["sans lactose", (r) => r.diet.includes("sans-lactose")],
    ["vegan", (r) => r.diet.includes("vegan")], ["végétarien", (r) => r.diet.includes("vegetarien") || r.diet.includes("vegan")],
  ];
  const plats = ["poulet", "pâtes", "lasagnes", "burger", "chocolat", "boeuf bourguignon", "crêpes", "rapide", "dessert", "saumon", "kangourou"];
  const relaches = regimes.flatMap(([regime, tient]) => plats.flatMap((p) =>
    [`${p} ${regime}`, `${regime} ${p}`].filter((q) => chercherRecettes(q).recettes.some((r) => !tient(r)))));
  verdict("un régime tient avec chaque plat, dans les deux sens, même en résultats approchants", relaches.length === 0,
    relaches.join(", ") || `${regimes.length * plats.length * 2} saisies`);
  const lasagnes = chercherRecettes("lasagnes sans gluten");
  verdict("« lasagnes sans gluten » : les plus proches, sans gluten, et la ligne le dit", lasagnes.approchant && lasagnes.recettes.length > 0
    && lasagnes.recettes.length <= MAX_APPROCHANTES && (lasagnes.aide ?? "").endsWith("sans gluten."), lasagnes.aide ?? "aucune ligne");

  /* Les envies et les mots qui ne disent rien. */
  const sansNom = ENVIES.filter((e) => { const l = lireSaisie(e.label.replace(/\u00ad/g, "")).termes;
    return l.length !== 1 || l[0].sorte !== "intention" || l[0].intention.id !== e.id; }).map((e) => e.id);
  verdict("chaque envie se tape par son nom", sansNom.length === 0, sansNom.join(", ") || `${ENVIES.length} envies`);
  const doubles = ditsDesIntentions().filter((d) => d.intentions.length > 1);
  verdict("une façon de dire ne désigne qu'une seule intention", doubles.length === 0, doubles.map((d) => `${d.cle} : ${d.intentions.join("/")}`).join(", ") || "");
  verdict("« je veux un truc avec du poulet » se lit « poulet »", memes(ids("je veux un truc avec du poulet"), ids("poulet")), lu("je veux un truc avec du poulet"));
  const rapide = chercherRecettes("poulet rapide").recettes;
  verdict("« poulet rapide » : du poulet prêt en 25 minutes au plus", rapide.length > 0 && rapide.every((r) => envie("poulet").garde(r) && minutesTotales(r) <= MINUTES_RAPIDE),
    rapide.map((r) => r.id).join(", "));
  verdict("« poulet sans gluten » ne se lit pas à travers l'ingrédient « poulet sans peau »", lu("poulet sans gluten") === "poulet sans-gluten", lu("poulet sans gluten"));
  verdict("« fish and chips » trouve le fish & chips sans se plaindre de « and »",
    ids("fish and chips")[0] === "fish-chips-maison" && !chercherRecettes("fish and chips").ignores.length, lu("fish and chips"));

  /* « sans … », « pas … » */
  const champignons = chercherRecettes("sans champignons").recettes;
  verdict("« sans champignons » : aucune recette n'a de champignon", champignons.length > 100
    && champignons.every((r) => !r.ingredients.some((i) => /champignon/i.test(i.nom))), `${champignons.length} recettes`);
  const alcool = ids("sans alcool");
  verdict("« sans alcool » garde le vin chaud sans alcool et la niçoise (vinaigre de vin), retire le coq au vin",
    alcool.includes("vin-chaud-sans-alcool") && alcool.includes("salade-nicoise") && !alcool.includes("coq-au-vin"), `${alcool.length} recettes`);
  verdict("« sans porc » retire aussi le jambon, les lardons et le bacon",
    chercherRecettes("sans porc").recettes.every((r) => !r.ingredients.some((i) => /porc|jambon|lardon|bacon|guanciale|saucisse/i.test(i.nom))), "");
  verdict("« pas épicé » retire les plats épicés", chercherRecettes("pas épicé").recettes.every((r) => !envie("epice").garde(r)), lu("pas épicé"));

  /* Un mot peut en contenir un autre. */
  verdict("« pomme » ne ramène pas la pomme de terre ; « pomme de terre » si",
    !ids("pomme").includes("soupe-poireaux-pommes-de-terre") && ids("pomme de terre").includes("soupe-poireaux-pommes-de-terre"), `${ids("pomme").length} pommes`);
  verdict("« noix » ne ramène ni les haricots noirs, ni la noix de coco, ni les Saint-Jacques",
    ids("noix").includes("banana-bread-aux-noix") && !ids("noix").includes("bowl-mexicain-poulet-mais-haricots-noirs")
    && !ids("noix").includes("noix-de-saint-jacques-puree-de-celeri"), ids("noix").join(", "));
  verdict("« fromage blanc » trouve le shaker au fromage blanc, et pas les endives au jambon",
    ids("fromage blanc").includes("shaker-vanille-amande-au-fromage-blanc") && !ids("fromage blanc").includes("endives-au-jambon-gratinees"), ids("fromage blanc").join(", "));

  /* Les chiffres. */
  verdict("« moins de 400 kcal » : toutes à 400 kcal ou moins", chercherRecettes("moins de 400 kcal").recettes.every((r) => r.calories <= 400), "");
  verdict("« 30g de protéines » : toutes à 30 g ou plus", chercherRecettes("30g de protéines").recettes.every((r) => r.proteins >= 30), "");
  verdict("« en 15 minutes » : toutes prêtes en 15 minutes", chercherRecettes("en 15 minutes").recettes.every((r) => minutesTotales(r) <= 15), "");
  verdict("« pour 4 personnes » ne vide rien", memes(ids("poulet pour 4 personnes"), ids("poulet")), lu("poulet pour 4 personnes"));
  const vingt = chercherRecettes("poulet 20 min").recettes;
  verdict("« poulet 20 min » : le poulet passe avant une omelette rapide", vingt.length > 0 && envie("poulet").garde(vingt[0]), vingt.slice(0, 3).map((r) => r.id).join(", "));

  /* Ce que la banque n'a pas, ce qui ne dit rien, et la ligne d'aide. */
  const pizza = chercherRecettes("pizza");
  verdict("« pizza » le dit, et montre des recettes italiennes", pizza.aide === "Pas encore de pizza. Voici des recettes italiennes."
    && pizza.recettes.length > 0 && pizza.recettes.every((r) => envie("italie").garde(r)), pizza.aide ?? "");
  const kangourou = chercherRecettes("poulet kangourou");
  verdict("un mot qui ne mène à rien le dit, et ne vide pas le reste", kangourou.aide === "Rien pour «\u00a0kangourou\u00a0»."
    && memes(kangourou.recettes.map((r) => r.id), ids("poulet")), kangourou.aide ?? "");
  verdict("rien à chercher, rien à montrer ; un mot inconnu seul, « aucune recette »",
    chercherRecettes("je veux").vide && !chercherRecettes("kangourou").recettes.length && !chercherRecettes("kangourou").vide, "");
  verdict("« sans gluten » dit ce qu'elle a compris", gf.aide === `Sans gluten · ${gf.recettes.length} recettes`, gf.aide ?? "");
  verdict("une recherche lue telle quelle n'a pas de ligne d'aide", chercherRecettes("poulet").aide === null && chercherRecettes("crêpes").aide === null, "");
  verdict("une faute corrigée se montre", (chercherRecettes("bourgignon").aide ?? "").startsWith("Bourguignon"), chercherRecettes("bourgignon").aide ?? "");

  /* Le régime de la personne passe devant, sans rien cacher. */
  const pates = chercherRecettes("pâtes", ["vegetarien"]).recettes;
  const bascule = pates.findIndex((r) => !convient(r, ["vegetarien"]));
  verdict("le régime de la personne passe devant, et rien n'est caché", bascule > 0 && pates.slice(bascule).every((r) => !convient(r, ["vegetarien"]))
    && pates.length === ids("pâtes").length, `${bascule} végétariennes d'abord sur ${pates.length}`);

  /* Le chemin. */
  const loupe = net(lire("src/components/RecipeSearch.tsx"));
  verdict("la loupe passe par lib/rechercheRecettes et ne filtre rien elle-même",
    loupe.includes("chercherRecettes(") && !loupe.includes("RECIPES") && !loupe.includes(".includes(m)"), "");
  verdict("la loupe n'ajoute aucun réglage : ni case, ni liste, ni puce", !/type="checkbox"|<select|aria-pressed|role="switch"/.test(loupe), "");
  verdict("le régime arrive jusqu'à la loupe", net(lire("src/components/nutrition/TrouverRecette.tsx")).includes("regime={regime}")
    && net(lire("src/components/NutritionTab.tsx")).includes("regime={regime}"), "");
}

console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
