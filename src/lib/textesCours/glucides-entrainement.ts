/* Flash · Combien de glucides quand tu t’entraînes
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Les glucides ont mauvaise presse, et pourtant ils sont un carburant majeur de ton cerveau et de tes muscles. Les recommandations du sport ne fixent pas une quantité pour tout le monde : elles l’ajustent au temps que tu passes à t’entraîner."],
  sections: [
    {
      titre: "À quoi ils servent",
      paragraphes: [
        "Ton corps garde une partie des glucides en réserve, sous forme de glycogène, dans tes muscles et dans ton foie. Cette réserve est limitée. Plus tu t’entraînes longtemps et fort, plus tu y puises, et plus tes repas doivent la remplir.",
      ],
    },
    {
      titre: "Combien, selon ta charge",
      paragraphes: [
        "Les recommandations communes de trois organisations nord-américaines de nutrition du sport donnent des repères en grammes de glucides par kilo de poids et par jour. Pour une activité légère ou de technique, 3 à 5 g. Pour environ une heure d’entraînement modéré par jour, 5 à 7 g. Pour une à trois heures d’endurance par jour, 6 à 10 g. Au-delà de quatre ou cinq heures par jour, 8 à 12 g.",
        "L’ISSN range un programme de forme classique, 30 à 40 minutes trois fois par semaine, dans la première catégorie, 3 à 5 g par kilo, et considère qu’une alimentation normale suffit. Tant que le total de la journée est couvert, la répartition entre les repas se décide surtout selon ton confort.",
      ],
    },
    {
      titre: "En musculation",
      paragraphes: [
        "En musculation, les chercheurs jugent peu probable qu’une séance classique vide tes réserves. Une revue de 49 études n’a pas trouvé d’amélioration de la performance quand on donne des glucides à une personne qui a déjà mangé, pour des séances allant jusqu’à une dizaine de séries par groupe musculaire. Sur le long terme, 15 études sur 17 ne trouvaient aucune influence des glucides sur les progrès.",
      ],
    },
    {
      titre: "Les meilleures sources",
      paragraphes: [
        "L’ISSN conseille de prendre la plupart de tes glucides dans les céréales complètes, les légumes et les fruits, et de garder les sucres rapides et les produits pour sportifs pour les moments où il faut refaire le plein vite. L’Anses, elle, plafonne les sucres à 100 g par jour.",
        "Quelques repères : 100 g de riz blanc cuit apportent environ 29 g de glucides, et 100 g de pain complet environ 51 g.",
      ],
    },
    {
      titre: "Pendant une longue séance",
      paragraphes: [
        "Au-delà d’une heure et demie d’effort, des glucides pris pendant l’effort aident : 30 à 60 g par heure, et jusqu’à 90 g pour les efforts de plus de deux heures et demie. Pour un effort intense d’environ une heure, les études ont trouvé un effet curieux : se rincer la bouche avec une boisson sucrée, sans l’avaler, peut aider.",
      ],
    },
  ],
  retenir: "Ajuste tes glucides à ton temps d’entraînement : 3 à 5 g par kilo pour quelques séances par semaine, davantage pour de longues heures d’endurance. Prends-les surtout dans les céréales complètes, les légumes et les fruits.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
        { label: "ISSN · Nutrition du sport et de l’exercice, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6090881/" },
        { label: "Comité international olympique · Glucides pour l’entraînement et la compétition, 2011", url: "https://pubmed.ncbi.nlm.nih.gov/21660838/" },
        { label: "Anses · Les sucres dans l’alimentation", url: "https://www.anses.fr/fr/article/sucres-lalimentation" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Henselmans et al. · Nutrients, 2022", url: "https://pubmed.ncbi.nlm.nih.gov/35215506/" },
        { label: "Escobar et al. · British Journal of Nutrition, 2016", url: "https://pubmed.ncbi.nlm.nih.gov/27993175/" },
      ],
    },
    {
      groupe: "Tables de composition",
      liens: [
        { label: "USDA · FoodData Central (riz blanc cuit)", url: "https://fdc.nal.usda.gov/food-details/168880/nutrients" },
        { label: "Anses · Table Ciqual 2013 (pain complet)", url: "https://informationsnutritionnelles.fr/pain-complet-ou-integral" },
      ],
    },
  ],
};

export default texte;
