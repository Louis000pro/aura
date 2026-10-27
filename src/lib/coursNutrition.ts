/* ════════════════════════════════════════════════════════════════════
   La banque de cours nutrition (Louis, 2026-10-25 : « une grosse banque
   de cours simples à lire et qui t’apprennent des choses »), dessinée en
   version B de la maquette « Distinguer un cours d’une recette » : un
   cours se présente comme une fiche, le texte d’abord et la photo sur le
   côté, et « Tous les cours » est un sommaire.

   Ce module porte l’INDEX : ce qu’il faut pour montrer un cours dans la
   rangée et dans le sommaire (titre, format, durée, photo, thème). Le
   texte d’un cours vit dans son propre module (lib/textesCours/<id>.ts)
   et ne se charge qu’à son ouverture (`chargerTexte`) : soixante cours
   dans le code de l’écran Nutrition, ce serait des centaines de
   kilo-octets lus par tout le monde pour un cours ouvert de temps en temps.

   ⚠️ LA RÈGLE DE RECHERCHE (AGENTS.md) : chaque source affichée a été lue,
   et le carnet de son lot (docs/cours-nutrition/carnet-lot-N.md) la liste
   avec les affirmations qu’elle porte. Un cours qui n’a pas son carnet
   n’entre pas dans l’index. Les lots 0 et 1 croisent deux sources par
   affirmation ; depuis le lot 2 (Louis, 2026-10-26 : « fais un peu moins de
   recherche, cite un peu moins les sources »), un cours affiche deux à
   quatre sources, et seuls les chiffres et les conclusions précises passent
   par une source lue.

   ⚠️ LE TEXTE S’ÉCRIT AVEC DES ESPACES ORDINAIRES : la typographie
   (espace insécable avant « : ; ? ! % », dans les guillemets, entre un
   nombre et son unité, dans les milliers) se pose au rendu (`typoCours`).

   ⚠️ LA DURÉE SE CALCULE, ELLE NE S’ÉCRIT PAS À LA MAIN : 220 mots par
   minute sur tout ce qui se lit (l’intro, les parties et les encadrés,
   sans les titres ni les sources). L’index la recopie pour que la rangée
   l’affiche sans charger le texte, et `npm run check:cours` refuse un
   index qui ne dit plus la même chose que son texte. Le format suit la
   durée : un flash se lit en deux minutes au plus, un cours en trois à
   cinq, un dossier en sept et plus.

   ⚠️ LES ENCADRÉS DE FIN RESTENT L’EXCEPTION (Louis, 2026-10-25 : « il ne
   faut pas blablater pour blablater »). « À retenir » termine chaque cours.
   L’exemple concret, « Ce qu’on ne sait pas encore » et « Essaie ça »
   n’existent que s’ils apportent quelque chose qu’on ne peut pas dire
   ailleurs : jamais des cases à remplir.
   ════════════════════════════════════════════════════════════════════ */

import type { IdEnvie } from "@/lib/collectionsRecettes";

export type FormatCours = "flash" | "cours" | "dossier";

export type IdThemeCours =
  | "entrainement" | "poids" | "bases" | "quotidien" | "regimes" | "complements" | "rapport";

/** Les sept thèmes du sommaire, dans l’ordre où il les montre. Un thème
 *  sans cours écrit ne s’affiche pas : on ne montre jamais un chantier. */
export const THEMES_COURS: { id: IdThemeCours; nom: string }[] = [
  { id: "entrainement", nom: "Autour de l’entraînement" },
  { id: "poids", nom: "Perdre du poids" },
  { id: "bases", nom: "Les bases" },
  { id: "quotidien", nom: "Au quotidien" },
  { id: "regimes", nom: "Régimes et idées reçues" },
  { id: "complements", nom: "Les compléments" },
  { id: "rapport", nom: "Ton rapport à la nourriture" },
];

export const NOM_FORMAT: Record<FormatCours, { titre: string; un: string; plusieurs: string }> = {
  flash: { titre: "Flash", un: "flash", plusieurs: "flashs" },
  cours: { titre: "Cours", un: "cours", plusieurs: "cours" },
  dossier: { titre: "Dossier", un: "dossier", plusieurs: "dossiers" },
};

export const ORDRE_FORMATS: FormatCours[] = ["flash", "cours", "dossier"];

/** Les durées qu’un format a le droit de prendre, en minutes de lecture. */
export const DUREES: Record<FormatCours, { min: number; max: number }> = {
  flash: { min: 1, max: 2 },
  cours: { min: 3, max: 5 },
  dossier: { min: 7, max: 30 },
};

export const MOTS_PAR_MINUTE = 220;
/** Un thème du sommaire montre ses trois premiers cours, puis « Voir les N cours ». */
export const VISIBLES_PAR_THEME = 3;
/** La rangée de l’écran Nutrition montre au plus huit cours, le reste vit dans le sommaire. */
export const DANS_LA_RANGEE = 8;

export type Cours = {
  /** Figé pour toujours : la coche « lu » s’y accroche. */
  id: string;
  titre: string;
  sousTitre: string;
  format: FormatCours;
  /** Recopiée depuis le texte (`minutesDeLecture`), vérifiée par le banc. */
  minutes: number;
  acces: "gratuit" | "vaiiya+";
  theme: IdThemeCours;
  /** Une recette de la banque (lib/recipeBank) : sa photo illustre le cours. */
  photo: string;
  /** L’envie de recettes que le cours propose d’ouvrir à la fin. */
  envie?: IdEnvie;
  /** Le lot de recherche, donc le carnet où vivent ses sources. */
  lot: number;
  /** Le jour où les sources ont été relues, au format YYYY-MM-DD. */
  verifieLe: string;
};

export type SectionCours = { titre: string; paragraphes: string[] };
export type GroupeSources = { groupe: string; liens: { label: string; url: string }[] };

export type TexteCours = {
  intro: string[];
  sections: SectionCours[];
  /** Seulement quand la personne doit appliquer un calcul ou une méthode à son cas. */
  exemple?: string[];
  /** « Ce qu’on ne sait pas encore » : seulement quand une question ouverte
   *  change ce que la personne ferait. Sinon la nuance tient dans le corps. */
  doute?: string[];
  /** Le seul encadré de chaque cours. */
  retenir: string;
  /** Seulement pour un changement concret dans les habitudes, jamais un devoir. */
  essai?: string;
  sources: GroupeSources[];
};

/* ── L’index, dans l’ordre de la rangée ─────────────────────────────── */
export const COURS: Cours[] = [
  {
    id: "jus-orange",
    titre: "Un jus d’orange compte-t-il comme un fruit ?",
    sousTitre: "La France et le Royaume-Uni ne répondent pas pareil. Sur la quantité, ils sont d’accord.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "quotidien",
    photo: "salade-d-agrumes-et-grenade", lot: 0, verifieLe: "2026-10-25",
  },
  {
    id: "apres-seance",
    titre: "Que manger après une séance",
    sousTitre: "Ton prochain repas fait l’essentiel du travail, à condition d’y mettre des protéines.",
    format: "cours", minutes: 3, acces: "gratuit", theme: "entrainement",
    photo: "meal-prep-poulet-riz-et-brocoli", envie: "sport", lot: 0, verifieLe: "2026-10-25",
  },
  {
    id: "perdre-du-poids",
    titre: "Perdre du poids : comment ça marche",
    sousTitre: "Ce que mesure la balance, pourquoi la perte ralentit, et ce que les études disent des régimes.",
    format: "dossier", minutes: 7, acces: "gratuit", theme: "poids",
    photo: "buddha-bowl-pois-chiches-rotis-houmous", envie: "leger", lot: 0, verifieLe: "2026-10-25",
  },
  {
    id: "faim-envie",
    titre: "Faim ou envie : comment faire la différence",
    sousTitre: "L’une répond à un besoin d’énergie, l’autre au plaisir. Les deux sont normales, et elles se mélangent souvent.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "rapport",
    photo: "truffes-au-chocolat-noir", envie: "regaler", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "balance-chaque-jour",
    titre: "Pourquoi la balance bouge chaque jour",
    sousTitre: "Ton poids monte et descend chaque semaine, et chaque mois si tu as des règles. Voici comment le lire sur plusieurs jours.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "poids",
    photo: "minestrone-d-hiver", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "petit-dejeuner",
    titre: "Faut-il prendre un petit-déjeuner ?",
    sousTitre: "Dans les essais, le prendre ou le sauter ne change pas le poids. Ton appétit et tes horaires peuvent décider.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "quotidien",
    photo: "bircher-muesli-pomme-noisette", envie: "petitdej", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "manger-tard",
    titre: "Manger tard fait-il grossir ?",
    sousTitre: "À calories égales, l’heure change peu le poids. Elle pourrait jouer sur ta faim.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "regimes",
    photo: "poulet-au-citron-et-aux-olives", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "proteines-glucides-lipides",
    titre: "Protéines, glucides, lipides : à quoi sert chacun",
    sousTitre: "Ce que chacun fait dans ton corps, ce qu’il apporte en calories, et comment réunir les trois dans une assiette.",
    format: "cours", minutes: 3, acces: "gratuit", theme: "bases",
    photo: "saumon-roti-et-patate-douce", envie: "repas", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "fibres",
    titre: "Les fibres : à quoi elles servent et où les trouver",
    sousTitre: "Ce qu’elles font, combien en manger, et une journée qui atteint les 30 g conseillés.",
    format: "cours", minutes: 3, acces: "gratuit", theme: "bases",
    photo: "chili-sin-carne", envie: "legumes", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "avant-seance",
    titre: "Que manger avant une séance",
    sousTitre: "Pour une séance d’une heure, ton dernier repas suffit souvent. Pour un effort plus long, voici quoi manger et quand.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "galettes-de-riz-au-beurre-de-cacahuete-et-banane", envie: "grignoter", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "proteines-par-jour",
    titre: "Les protéines : combien par jour, et comment les répartir",
    sousTitre: "Les repères selon ton entraînement, et une journée qui les atteint avec des aliments ordinaires.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "bowl-de-tofu-croustillant-nouilles-de-riz-et-edamame", envie: "oeufs", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "glucides-entrainement",
    titre: "Combien de glucides quand tu t’entraînes",
    sousTitre: "Ton temps d’entraînement décide de la quantité. Pour quelques séances par semaine, une alimentation normale suffit.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "pates-completes-au-thon-tomates-cerises-et-capres", envie: "pates", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "boire-effort",
    titre: "Combien boire quand tu fais du sport",
    sousTitre: "Ta soif est un bon guide pour la plupart des séances. Pour les longues, une balance suffit à connaître tes pertes.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "citronnade-maison-a-la-menthe", envie: "boire", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "assiette-sans-peser",
    titre: "Faire une assiette sans rien peser",
    sousTitre: "Des proportions qui s’appliquent à une assiette, un bol ou une boîte à emporter, sans balance de cuisine.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "quotidien",
    photo: "cabillaud-en-papillote-courgettes-et-quinoa", envie: "repas", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "vitamine-d-hiver",
    titre: "La vitamine D en hiver",
    sousTitre: "En hiver, en France, ta peau n’en fabrique presque plus. Voici ce que disent les agences de santé.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "complements",
    photo: "oeufs-brouilles-au-saumon-fume-et-a-l-avocat", envie: "poisson", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "complements-sport",
    titre: "Les compléments pour le sport : ce qui a des preuves",
    sousTitre: "Quelques produits ont des preuves solides. Pour les autres, les bénéfices restent incertains, et certains contiennent ce qu’ils ne déclarent pas.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "complements",
    photo: "shaker-chocolat-noisette", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "whey",
    titre: "La whey",
    sousTitre: "Une protéine du lait, pratique et efficace pour le muscle, sans rien de magique. Quand elle sert, combien en prendre, et comment la choisir.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "complements",
    photo: "shaker-fruits-rouges-et-skyr", envie: "boire", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "creatine",
    titre: "Créatine : ce que disent les études",
    sousTitre: "Ce qu’elle fait, la dose utile, et ce que disent les études sur l’eau, les reins et les cheveux.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "complements",
    photo: "wok-de-boeuf-aux-legumes-croquants", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "cafeine-effort",
    titre: "La caféine avant l’effort",
    sousTitre: "Elle améliore la performance de beaucoup de sportifs. La dose, le moment, et les précautions pour le cœur et le sommeil.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "complements",
    photo: "cafe-frappe-proteine", lot: 1, verifieLe: "2026-10-25",
  },
  {
    id: "calorie",
    titre: "Une calorie, c’est quoi ?",
    sousTitre: "Une unité d’énergie, comme le mètre mesure une longueur. Ce qu’elle dit de ton assiette, et ce qu’elle laisse de côté.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "bases",
    photo: "bowl-energie-banane", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "graisses",
    titre: "Les graisses : lesquelles privilégier",
    sousTitre: "Toutes les graisses ne se valent pas pour ton cœur. Lesquelles mettre en avant, et lesquelles garder en petites quantités.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "bases",
    photo: "poke-bowl-saumon-avocat", envie: "poisson", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "fer",
    titre: "Le fer : qui en manque, et pourquoi",
    sousTitre: "Il transporte l’oxygène dans ton sang. Qui risque d’en manquer, comment le repérer, et où le trouver.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "bases",
    photo: "chili-con-carne", envie: "viande", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "vitamines-mineraux",
    titre: "Vitamines et minéraux : ce qu’une assiette variée couvre",
    sousTitre: "Une alimentation variée en apporte assez pour la plupart des gens. Voici les quelques cas où un complément se discute.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "bases",
    photo: "salade-de-quinoa-pois-chiches-et-legumes-croquants", envie: "salade", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "sel",
    titre: "Le sel : combien, et où il se cache",
    sousTitre: "L’OMS conseille moins de 5 g par jour. La plus grosse part n’arrive pas par ta salière.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "bases",
    photo: "quesadillas-jambon-fromage", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "index-glycemique",
    titre: "L’index glycémique, utile ou pas ?",
    sousTitre: "Il dit à quelle vitesse un aliment fait monter ton sucre sanguin. En cas de diabète il aide un peu, et pour les autres, choisir aliment par aliment change peu.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "bases",
    photo: "porridge-poire-cannelle", envie: "petitdej", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "ultra-transformes",
    titre: "Les aliments ultra-transformés : ce que disent les études",
    sousTitre: "Comment on les reconnaît, ce que montrent les grandes études, ce qui reste discuté, et comment en manger moins sans y passer tes soirées.",
    format: "cours", minutes: 4, acces: "vaiiya+", theme: "bases",
    photo: "nuggets-de-poulet-au-four", envie: "vite", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "fenetre-anabolique",
    titre: "La fenêtre anabolique existe-t-elle ?",
    sousTitre: "On t’a peut-être dit d’avaler tes protéines dans les 30 minutes. Les études décrivent une fenêtre de plusieurs heures.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "entrainement",
    photo: "shaker-vanille-amande-au-fromage-blanc", envie: "sport", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "entrainement-a-jeun",
    titre: "S’entraîner à jeun",
    sousTitre: "Sur la durée, ça ne fait pas perdre plus de gras. Pour un effort long, mieux vaut manger avant ; pour une séance courte, c’est une affaire de confort.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "entrainement",
    photo: "overnight-oats-chocolat-noisette", envie: "petitdej", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "jours-de-repos",
    titre: "Manger les jours de repos",
    sousTitre: "Ton corps répare et renforce pendant que tu te reposes. Garde tes protéines, et ajuste un peu les glucides à ton activité.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "entrainement",
    photo: "salade-tiede-de-lentilles-betterave-et-chevre", envie: "repas", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "crampes-magnesium",
    titre: "Les crampes et le magnésium",
    sousTitre: "Le magnésium est le premier réflexe de beaucoup de sportifs. Les essais montrent qu’il aide peu, et l’étirement reste le geste le plus utile.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "entrainement",
    photo: "energy-balls-chocolat-amande", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "effort-long",
    titre: "Manger pendant un effort long",
    sousTitre: "Au-delà d’une heure d’effort, des glucides pris en route aident à tenir. Combien par heure, sous quelle forme, et comment habituer ton ventre.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "entrainement",
    photo: "boules-d-energie-canadiennes", envie: "grignoter", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "prise-de-masse",
    titre: "Prise de masse : combien manger, et quoi",
    sousTitre: "Un léger surplus de calories, assez de protéines, un entraînement qui progresse et de la patience : comment construire du muscle sans prendre trop de gras.",
    format: "cours", minutes: 4, acces: "vaiiya+", theme: "entrainement",
    photo: "gainer-maison-banane-avoine-et-cacahuete", envie: "sport", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "rassasier",
    titre: "Ce qui rassasie le plus longtemps",
    sousTitre: "Des protéines, du volume, des aliments qu’on mâche et peu transformés : ce qui te cale vraiment, à calories égales.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "poids",
    photo: "salade-de-pommes-de-terre-a-la-moutarde", envie: "soupe", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "calories-boissons",
    titre: "Les calories qu’on boit",
    sousTitre: "Sodas, jus, alcool, cafés sucrés : ce qu’on boit apporte des calories qui calent peu. Santé publique France ne recommande qu’une boisson, l’eau.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "poids",
    photo: "the-glace-peche-maison", envie: "boire", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "gras-localise",
    titre: "Peut-on perdre du gras à un endroit précis ?",
    sousTitre: "Les abdominaux ne font pas fondre le gras du ventre. Le gras part de tout le corps, dans un ordre que ton corps décide.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "poids",
    photo: "brochettes-de-poulet-citron-paprika", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "plateau",
    titre: "Le plateau : quand le poids ne bouge plus",
    sousTitre: "Après quelques mois, la perte ralentit puis s’arrête souvent. Pourquoi, comment vérifier qu’il s’agit d’un plateau, et quoi ajuster.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "poids",
    photo: "veloute-de-carottes", envie: "leger", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "metabolisme-lent",
    titre: "Un métabolisme lent, ça existe ?",
    sousTitre: "Ta dépense dépend surtout de ton gabarit et de ton activité. Ce que les mesures montrent, et pourquoi on se trompe si souvent sur ce qu’on mange.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "poids",
    photo: "golden-latte-au-curcuma", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "garder-son-poids",
    titre: "Garder son poids après l’avoir perdu",
    sousTitre: "Le poids perdu revient souvent, mais pas toujours. Ce que font les personnes qui le gardent, d’après le plus grand registre sur le sujet.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "poids",
    photo: "bowl-mexicain-poulet-mais-haricots-noirs", envie: "repas", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "etiquette",
    titre: "Lire une étiquette en trente secondes",
    sousTitre: "La liste des ingrédients, le tableau pour 100 g, et quelques mentions encadrées par la loi : de quoi comparer deux produits au rayon.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "quotidien",
    photo: "granola-maison-pomme-cannelle", envie: "petitdej", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "nutri-score",
    titre: "Le Nutri-Score : comment il se calcule",
    sousTitre: "Une lettre de A à E calculée pour 100 g, à partir de ce qu’il faut favoriser et de ce qu’il faut limiter. Ce qu’elle dit, et ce qu’elle laisse de côté.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "quotidien",
    photo: "muffins-myrtilles-flocons-d-avoine", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "surgeles-conserves",
    titre: "Surgelés et conserves face au frais",
    sousTitre: "Les légumes surgelés gardent l’essentiel de leurs vitamines, et les conserves comptent dans tes cinq fruits et légumes. Ce qu’il faut regarder sur l’étiquette.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "quotidien",
    photo: "haricots-blancs-mijotes-a-la-tomate-et-au-romarin", envie: "legumes", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "petit-budget",
    titre: "Bien manger avec un petit budget",
    sousTitre: "Les légumes secs, les œufs, les surgelés et les conserves nature font partie des aliments les plus nourrissants pour leur prix. Des repères pour remplir le panier.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "quotidien",
    photo: "harira-aux-lentilles-et-pois-chiches", envie: "soupe", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "restaurant",
    titre: "Manger au restaurant sans tout calculer",
    sousTitre: "Les portions y sont souvent généreuses. Quelques réflexes simples pour en profiter, et aucune raison de compenser le lendemain.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "quotidien",
    photo: "pho-au-boeuf", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "cuisiner-a-l-avance",
    titre: "Cuisiner une fois pour plusieurs jours",
    sousTitre: "Une ou deux sessions de cuisine par semaine, des règles de conservation simples, et des bases qui se combinent pour varier les repas.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "quotidien",
    photo: "curry-de-pois-chiches-et-patate-douce", envie: "avance", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "horaires-decales",
    titre: "Manger en horaires décalés",
    sousTitre: "Travail de nuit, horaires tournants : ton horloge interne gère moins bien les repas de nuit. Comment placer tes repas autour de tes services.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "quotidien",
    photo: "frittata-aux-legumes", envie: "vite", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "vegetarien",
    titre: "Manger végétarien sans carence",
    sousTitre: "Bien construite, une alimentation végétarienne ou végane convient à tous les âges. Les nutriments à surveiller, un par un, et où les trouver.",
    format: "cours", minutes: 4, acces: "vaiiya+", theme: "quotidien",
    photo: "curry-de-lentilles-corail-et-epinards", envie: "legumes", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "cures-detox",
    titre: "Les cures « détox »",
    sousTitre: "Ton foie, tes reins, ton intestin et ta peau éliminent déjà les déchets. Ce que font vraiment les jus, les tisanes et les jeûnes de quelques jours.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "regimes",
    photo: "smoothie-vert-proteine", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "oeufs-cholesterol",
    titre: "Les œufs et le cholestérol",
    sousTitre: "Un jaune d’œuf contient beaucoup de cholestérol, et pourtant un œuf par jour n’augmente pas le risque cardiaque dans les grandes études. Voici pourquoi.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "regimes",
    photo: "omelette-aux-champignons-et-ciboulette", envie: "oeufs", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "sans-gluten",
    titre: "Le sans gluten quand on n’est pas cœliaque",
    sousTitre: "Indispensable en cas de maladie cœliaque, le sans gluten n’a pas d’intérêt prouvé pour les autres. Et les ballonnements viennent parfois d’autre chose que le gluten.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "regimes",
    photo: "galettes-de-sarrasin-completes", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "sucre-addiction",
    titre: "Le sucre rend-il accro ?",
    sousTitre: "Chez le rat, dans certaines conditions. Chez l’humain, les preuves manquent, et l’envie de sucré s’explique autrement.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "regimes",
    photo: "brownie-fondant-au-chocolat", envie: "dessert", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "edulcorants",
    titre: "Les édulcorants",
    sousTitre: "Sûrs aux doses habituelles selon les agences, ils n’aident pas à perdre du poids sur le long terme d’après l’OMS. Le point sur l’aspartame.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "regimes",
    photo: "sorbet-framboise-minute", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "bio",
    titre: "Bio ou non bio",
    sousTitre: "Moins de résidus de pesticides, un peu plus de certains antioxydants, et peu de différences sur les vitamines. Ce que disent les études, et comment choisir avec ton budget.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "regimes",
    photo: "taboule-libanais", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "cetogene",
    titre: "Le régime cétogène",
    sousTitre: "Presque plus de glucides, beaucoup de gras : ton corps fabrique des cétones. Ce qu’il fait sur le poids, sur l’effort, et pourquoi il est difficile à tenir.",
    format: "flash", minutes: 2, acces: "vaiiya+", theme: "regimes",
    photo: "verrines-avocat-crevettes", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "jeune-intermittent",
    titre: "Le jeûne intermittent",
    sousTitre: "Seize heures sans manger, deux jours à 500 kcal, un jour sur deux : ce que disent les essais sur le poids, la santé et le muscle, et à qui il ne convient pas.",
    format: "cours", minutes: 3, acces: "vaiiya+", theme: "regimes",
    photo: "shakshuka-express", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "bruleurs-de-graisse",
    titre: "Les brûleurs de graisse",
    sousTitre: "Caféine, thé vert, carnitine, garcinia : ce que contiennent ces produits, ce qu’ils font vraiment, et pourquoi l’extrait de thé vert concentré demande de la prudence.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "complements",
    photo: "chai-latte-maison", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "bcaa",
    titre: "Les BCAA",
    sousTitre: "Trois acides aminés vendus pour construire du muscle. Seuls, ils en font moins qu’une portion de protéines complète.",
    format: "flash", minutes: 1, acces: "vaiiya+", theme: "complements",
    photo: "barres-proteinees-maison-chocolat-cacahuete", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "stress",
    titre: "Manger sous le stress",
    sousTitre: "Le stress coupe l’appétit de certaines personnes et l’ouvre chez d’autres, souvent vers le gras et le sucré. Pourquoi, et quoi faire quand ça arrive.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "rapport",
    photo: "poires-pochees-aux-epices", envie: "reconfort", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "fringales-du-soir",
    titre: "Les fringales du soir",
    sousTitre: "Elles viennent souvent d’une journée trop légère, de la fatigue ou d’une habitude. Les repères pour les calmer sans te battre contre toi.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "rapport",
    photo: "bowl-de-skyr-kiwi-et-clementine", envie: "grignoter", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "repas-copieux",
    titre: "Après un repas trop copieux",
    sousTitre: "Un repas de fête ne change pas ton corps en une soirée. Ce que montre la balance le lendemain, et ce qui aide à digérer.",
    format: "flash", minutes: 1, acces: "gratuit", theme: "rapport",
    photo: "tartiflette-allegee", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "alcool-recuperation",
    titre: "L’alcool et la récupération",
    sousTitre: "La bière après le match fait partie du rituel. Ce que l’alcool fait à tes muscles, à ton sommeil et à ta santé, et les repères officiels.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "rapport",
    photo: "vin-chaud-sans-alcool", envie: "boire", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "angoisse-alimentaire",
    titre: "Quand manger devient une source d’angoisse",
    sousTitre: "Des règles qui s’empilent, la peur de certains aliments, des repas qui deviennent une épreuve : les signes qui doivent alerter, et où trouver de l’aide.",
    format: "flash", minutes: 2, acces: "gratuit", theme: "rapport",
    photo: "gateau-moelleux-a-l-orange-et-aux-amandes", lot: 2, verifieLe: "2026-10-26",
  },
  {
    id: "sommeil-appetit",
    titre: "Le sommeil et l’appétit",
    sousTitre: "Moins dormir ouvre l’appétit, surtout pour le sucré et le gras. Ce que montrent les essais, avec une bonne nouvelle : dormir plus fait manger moins.",
    format: "flash", minutes: 1, acces: "vaiiya+", theme: "rapport",
    photo: "veloute-de-champignons", lot: 2, verifieLe: "2026-10-26",
  },
];

/* ── Les textes, chacun dans son morceau de code ──────────────────────
   Une table écrite en toutes lettres, et pas un import calculé : chaque
   texte devient son propre fichier au build, et le banc vérifie que la
   table et l’index se répondent. */
export const TEXTES: Record<string, () => Promise<{ default: TexteCours }>> = {
  "jus-orange": () => import("@/lib/textesCours/jus-orange"),
  "apres-seance": () => import("@/lib/textesCours/apres-seance"),
  "perdre-du-poids": () => import("@/lib/textesCours/perdre-du-poids"),
  "faim-envie": () => import("@/lib/textesCours/faim-envie"),
  "balance-chaque-jour": () => import("@/lib/textesCours/balance-chaque-jour"),
  "petit-dejeuner": () => import("@/lib/textesCours/petit-dejeuner"),
  "manger-tard": () => import("@/lib/textesCours/manger-tard"),
  "proteines-glucides-lipides": () => import("@/lib/textesCours/proteines-glucides-lipides"),
  "fibres": () => import("@/lib/textesCours/fibres"),
  "avant-seance": () => import("@/lib/textesCours/avant-seance"),
  "proteines-par-jour": () => import("@/lib/textesCours/proteines-par-jour"),
  "glucides-entrainement": () => import("@/lib/textesCours/glucides-entrainement"),
  "boire-effort": () => import("@/lib/textesCours/boire-effort"),
  "assiette-sans-peser": () => import("@/lib/textesCours/assiette-sans-peser"),
  "vitamine-d-hiver": () => import("@/lib/textesCours/vitamine-d-hiver"),
  "complements-sport": () => import("@/lib/textesCours/complements-sport"),
  "creatine": () => import("@/lib/textesCours/creatine"),
  "cafeine-effort": () => import("@/lib/textesCours/cafeine-effort"),
"calorie": () => import("@/lib/textesCours/calorie"),
  "graisses": () => import("@/lib/textesCours/graisses"),
  "fer": () => import("@/lib/textesCours/fer"),
  "vitamines-mineraux": () => import("@/lib/textesCours/vitamines-mineraux"),
  "sel": () => import("@/lib/textesCours/sel"),
  "index-glycemique": () => import("@/lib/textesCours/index-glycemique"),
  "ultra-transformes": () => import("@/lib/textesCours/ultra-transformes"),
  "fenetre-anabolique": () => import("@/lib/textesCours/fenetre-anabolique"),
  "entrainement-a-jeun": () => import("@/lib/textesCours/entrainement-a-jeun"),
  "jours-de-repos": () => import("@/lib/textesCours/jours-de-repos"),
  "crampes-magnesium": () => import("@/lib/textesCours/crampes-magnesium"),
  "effort-long": () => import("@/lib/textesCours/effort-long"),
  "prise-de-masse": () => import("@/lib/textesCours/prise-de-masse"),
  "rassasier": () => import("@/lib/textesCours/rassasier"),
  "calories-boissons": () => import("@/lib/textesCours/calories-boissons"),
  "gras-localise": () => import("@/lib/textesCours/gras-localise"),
  "plateau": () => import("@/lib/textesCours/plateau"),
  "metabolisme-lent": () => import("@/lib/textesCours/metabolisme-lent"),
  "garder-son-poids": () => import("@/lib/textesCours/garder-son-poids"),
  "etiquette": () => import("@/lib/textesCours/etiquette"),
  "nutri-score": () => import("@/lib/textesCours/nutri-score"),
  "surgeles-conserves": () => import("@/lib/textesCours/surgeles-conserves"),
  "petit-budget": () => import("@/lib/textesCours/petit-budget"),
  "restaurant": () => import("@/lib/textesCours/restaurant"),
  "cuisiner-a-l-avance": () => import("@/lib/textesCours/cuisiner-a-l-avance"),
  "horaires-decales": () => import("@/lib/textesCours/horaires-decales"),
  "vegetarien": () => import("@/lib/textesCours/vegetarien"),
  "cures-detox": () => import("@/lib/textesCours/cures-detox"),
  "oeufs-cholesterol": () => import("@/lib/textesCours/oeufs-cholesterol"),
  "sans-gluten": () => import("@/lib/textesCours/sans-gluten"),
  "sucre-addiction": () => import("@/lib/textesCours/sucre-addiction"),
  "edulcorants": () => import("@/lib/textesCours/edulcorants"),
  "bio": () => import("@/lib/textesCours/bio"),
  "cetogene": () => import("@/lib/textesCours/cetogene"),
  "jeune-intermittent": () => import("@/lib/textesCours/jeune-intermittent"),
  "whey": () => import("@/lib/textesCours/whey"),
  "bruleurs-de-graisse": () => import("@/lib/textesCours/bruleurs-de-graisse"),
  "bcaa": () => import("@/lib/textesCours/bcaa"),
  "stress": () => import("@/lib/textesCours/stress"),
  "fringales-du-soir": () => import("@/lib/textesCours/fringales-du-soir"),
  "repas-copieux": () => import("@/lib/textesCours/repas-copieux"),
  "alcool-recuperation": () => import("@/lib/textesCours/alcool-recuperation"),
  "angoisse-alimentaire": () => import("@/lib/textesCours/angoisse-alimentaire"),
  "sommeil-appetit": () => import("@/lib/textesCours/sommeil-appetit"),
};

const charges = new Map<string, Promise<TexteCours>>();

/** Le texte d’un cours, chargé une seule fois. Un échec n’est pas gardé :
 *  la prochaine ouverture réessaie. */
export function chargerTexte(id: string): Promise<TexteCours> {
  const deja = charges.get(id);
  if (deja) return deja;
  const charger = TEXTES[id];
  if (!charger) return Promise.reject(new Error(`cours inconnu : ${id}`));
  const p = charger().then((m) => m.default);
  charges.set(id, p);
  p.catch(() => charges.delete(id));
  return p;
}

/* ── Les règles ───────────────────────────────────────────────────── */

const mots = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;

/** Tout ce qui se lit, dans l’ordre du lecteur, sans les titres ni les sources. */
export function paragraphesLus(t: TexteCours): string[] {
  return [
    ...t.intro,
    ...t.sections.flatMap((s) => s.paragraphes),
    ...(t.exemple ?? []),
    ...(t.doute ?? []),
    t.retenir,
    ...(t.essai ? [t.essai] : []),
  ];
}

export function minutesDeLecture(t: TexteCours): number {
  const n = paragraphesLus(t).reduce((total, p) => total + mots(p), 0);
  return Math.max(1, Math.round(n / MOTS_PAR_MINUTE));
}

/** Le format qu’une durée impose, ou `null` entre deux formats (6 minutes :
 *  trop long pour un cours, trop court pour un dossier). */
export function formatDeLaDuree(minutes: number): FormatCours | null {
  return ORDRE_FORMATS.find((f) => minutes >= DUREES[f].min && minutes <= DUREES[f].max) ?? null;
}

const NBSP = " ";
const UNITES = "g|kg|mg|microgrammes|µg|UI|kcal|kJ|ml|cl|l|h|min|minutes|heure|heures|jours|semaines|mois|ans|fois|€|°C";

/** La typographie française, posée au rendu. */
export function typoCours(s: string): string {
  return s
    .replace(/'/g, "’")
    .replace(/« /g, `«${NBSP}`)
    .replace(/ »/g, `${NBSP}»`)
    .replace(/ ([:;?!%])/g, `${NBSP}$1`)
    // Lu sans consommer les chiffres, pour qu’un numéro en trois groupes
    // (« 0810 037 037 ») se pose en un seul passage.
    .replace(/(?<=\d) (?=\d{3}(?!\d))/g, NBSP)
    .replace(new RegExp(`(\\d) (${UNITES})(?![\\p{L}’'])`, "gu"), `$1${NBSP}$2`);
}

/** « Flash · 2 min ». */
export function libelleFormat(c: Pick<Cours, "format" | "minutes">): string {
  return `${NOM_FORMAT[c.format].titre} · ${c.minutes}${NBSP}min`;
}

/** « Voir les recettes « Après le sport » » : l’action du bas d’un cours. */
export function libelleEnvie(label: string): string {
  return `Voir les recettes «${NBSP}${label}${NBSP}»`;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
  "septembre", "octobre", "novembre", "décembre"];

/** « 25 octobre 2026 », sans passer par le fuseau du téléphone. */
export function dateLisible(iso: string): string {
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j}${NBSP}${MOIS[m - 1]} ${a}`;
}

/** Les cours d’un thème, dans l’ordre de l’index. */
export function coursDuTheme(liste: Cours[], theme: IdThemeCours): Cours[] {
  return liste.filter((c) => c.theme === theme);
}

/** Les thèmes qui ont au moins un cours, dans l’ordre du sommaire. */
export function themesAvecCours(liste: Cours[]): { id: IdThemeCours; nom: string; cours: Cours[] }[] {
  return THEMES_COURS
    .map((t) => ({ ...t, cours: coursDuTheme(liste, t.id) }))
    .filter((t) => t.cours.length > 0);
}

/** Les formats qui méritent une puce : ceux qui changent vraiment la liste
 *  (deux cours au moins, jamais tous). Même règle que les puces d’une envie. */
export function formatsQuiFiltrent(liste: Cours[]): FormatCours[] {
  return ORDRE_FORMATS.filter((f) => {
    const n = liste.filter((c) => c.format === f).length;
    return n >= 2 && n < liste.length;
  });
}

/** « 3 cours · 1 flash, 1 cours, 1 dossier ». */
export function resumeFormats(liste: Cours[]): string {
  const parFormat = ORDRE_FORMATS
    .map((f) => ({ f, n: liste.filter((c) => c.format === f).length }))
    .filter((x) => x.n > 0)
    .map(({ f, n }) => `${n}${NBSP}${n > 1 ? NOM_FORMAT[f].plusieurs : NOM_FORMAT[f].un}`);
  const total = `${liste.length}${NBSP}cours`;
  return parFormat.length > 1 ? `${total} · ${parFormat.join(", ")}` : total;
}
