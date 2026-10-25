/* Flash · Un jus d’orange compte-t-il comme un fruit ?
   Lot 0, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-0.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["En France, la réponse officielle est non. Santé publique France range le jus de fruits avec les boissons sucrées et ne le compte pas dans les cinq fruits et légumes par jour. Au Royaume-Uni, le service de santé publique, le NHS, compte un verre de 150 ml comme une portion, une seule fois par jour, même si tu en bois plus. Sur la quantité, les deux pays s’accordent : pas plus d’un verre par jour."],
  sections: [
    {
      titre: "Ce que le jus perd en route",
      paragraphes: [
        "Un verre de 20 cl de jus d’orange contient environ 18 g de sucre. À poids égal, c’est à peu près autant que l’orange entière, avec beaucoup moins de fibres : 0,2 à 0,5 g pour 100 ml de jus, contre 1,8 à 2,4 g pour 100 g d’orange, selon les tables de composition française et américaine.",
        "Pour l’Organisation mondiale de la santé (OMS), le sucre d’un jus est un « sucre libre », comme le sucre de table. Celui d’une orange croquée n’en fait pas partie. L’OMS conseille d’en consommer si possible moins de 25 g par jour.",
      ],
    },
    {
      titre: "Pourquoi l’orange cale davantage",
      paragraphes: ["En 2009, des chercheurs ont donné à 58 adultes, avant le déjeuner, une pomme, de la compote ou du jus de pomme, aux calories identiques. Après la pomme entière, ils ont mangé environ 15 % de calories en moins sur tout le repas, pomme comprise, que sans rien manger avant, et ils se sentaient plus rassasiés qu’après la compote ou le jus. Ajouter des fibres au jus n’a rien changé : la forme solide compte aussi. Une étude plus ancienne avait trouvé le même classement, avec un jus bu onze fois plus vite que les pommes mangées."],
    },
    {
      titre: "Jus, nectar ou smoothie",
      paragraphes: ["Depuis 2013, aucun sucre ne peut être ajouté à un produit vendu sous le nom de « jus » dans l’Union européenne. Un « nectar », lui, peut contenir du sucre ajouté. Le smoothie garde la pulpe mixée, mais le NHS le range dans la même limite que le jus : 150 ml par jour pour les deux réunis."],
    },
  ],
  exemple: ["Chaque matin, tu bois un grand verre de 25 cl de jus d’orange. Tu peux passer à un verre de 15 cl, bu pendant le petit-déjeuner, ce qui ménage aussi tes dents. Ou tu le remplaces par une orange en quartiers : tu gardes le goût, avec les fibres."],
  doute: ["Les grandes études qui relient le jus au diabète de type 2 ou à la prise de poids sont surtout des études d’observation : elles montrent un lien, sans prouver que le jus en est la cause. Chez l’enfant, le lien avec le poids est faible. Chez l’adulte, les essais où un groupe boit du jus et l’autre non n’ont pas trouvé d’effet sur le poids."],
  retenir: "En France, un jus ne compte pas comme une portion de fruits. Si tu en bois, garde-le à un verre par jour, pendant un repas, et croque l’orange quand tu peux.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/determinants-de-sante/nutrition-et-activite-physique/documents/rapport-synthese/recommandations-relatives-a-l-alimentation-a-l-activite-physique-et-a-la-sedentarite-pour-les-adultes" },
        { label: "Santé publique France · Alimentation des enfants de 4 à 11 ans, 2024", url: "https://www.santepubliquefrance.fr/presse/alimentation-des-enfants-de-4-a-11-ans-une-campagne-dinformation-pour-guider-les-parents" },
        { label: "Assemblée nationale · Réponse du ministère de la Santé sur les jus de fruits, 2022", url: "https://www.assemblee-nationale.fr/dyn/16/questions/QANR5L16QE1287" },
        { label: "NHS · 5 A Day: what counts?", url: "https://www.nhs.uk/live-well/eat-well/5-a-day/5-a-day-what-counts/" },
        { label: "OMS · Recommandation sur l’apport en sucres, 2015", url: "https://www.who.int/news/item/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children" },
        { label: "Parlement européen · Directive 2012/12/UE sur les jus de fruits", url: "https://oeil.europarl.europa.eu/oeil/fr/document-summary?id=1204333" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Flood-Obbagy et Rolls · Appetite, 2009", url: "https://pubmed.ncbi.nlm.nih.gov/19110020/" },
        { label: "Haber et al. · The Lancet, 1977", url: "https://pubmed.ncbi.nlm.nih.gov/71495/" },
        { label: "Muraki et al. · BMJ, 2013", url: "https://www.bmj.com/content/347/bmj.f5001" },
        { label: "Nguyen et al. · JAMA Pediatrics, 2024", url: "https://doi.org/10.1001/jamapediatrics.2023.6124" },
      ],
    },
    {
      groupe: "Tables de composition",
      liens: [
        { label: "Anses · Table Ciqual 2013 (jus d’orange)", url: "https://informationsnutritionnelles.fr/orange-pur-jus" },
        { label: "Anses · Table Ciqual 2013 (orange)", url: "https://informationsnutritionnelles.fr/orange" },
        { label: "USDA · FoodData Central (orange)", url: "https://fdc.nal.usda.gov/food-details/169097/nutrients" },
        { label: "USDA · FoodData Central (jus d’orange)", url: "https://fdc.nal.usda.gov/food-details/169098/nutrients" },
      ],
    },
  ],
};

export default texte;
