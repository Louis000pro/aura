/* Flash · Les protéines : combien par jour, et comment les répartir
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Les protéines ont la réputation d’être le nutriment du sport. Ton corps en a besoin tous les jours, que tu t’entraînes ou non, et un peu plus quand tu fais de la musculation. Les quantités utiles s’atteignent en général avec des repas ordinaires."],
  sections: [
    {
      titre: "Le repère de base",
      paragraphes: [
        "Pour un adulte en bonne santé, l’Anses retient 0,83 g de protéines par kilo de poids et par jour. Pour 60 kg, ça fait environ 50 g.",
      ],
    },
    {
      titre: "Si tu t’entraînes",
      paragraphes: [
        "Pour 30 à 40 minutes de sport trois fois par semaine, la Société internationale de nutrition du sport (ISSN) estime qu’une alimentation normale suffit, avec 0,8 à 1,2 g par kilo. Si tu fais de la musculation régulièrement, les repères montent : 1,2 à 2 g par kilo et par jour dans les recommandations communes de trois organisations nord-américaines, 1,4 à 2 g pour l’ISSN.",
        "En 2018, une grande analyse de 49 essais a cherché à partir de quand manger plus de protéines ne faisait plus gagner de muscle. Réponse : autour de 1,6 g par kilo et par jour, en moyenne. Les auteurs ajoutent deux nuances. Certaines personnes pourraient profiter de quantités plus élevées, jusqu’à environ 2,2 g. Et l’effet des protéines reste petit comparé à celui de l’entraînement lui-même.",
        "Si tu as une maladie ou un traitement, demande conseil à ton médecin avant de monter beaucoup tes protéines.",
      ],
    },
    {
      titre: "Répartir dans la journée",
      paragraphes: [
        "Les recommandations conseillent de répartir les protéines sur trois ou quatre prises : environ 0,3 g par kilo toutes les trois à cinq heures, ou 20 à 40 g par prise selon l’ISSN. Sur une journée, la répartition compte : dans une étude, quatre prises de 20 g espacées de trois heures stimulaient davantage la fabrication de protéines musculaires que deux prises de 40 g ou huit petites prises de 10 g. Dans une autre, des repas égaux en protéines augmentaient cette fabrication de 25 % sur 24 heures, comparés à une journée où presque tout arrivait au dîner.",
      ],
    },
    {
      titre: "Où les trouver",
      paragraphes: [
        "D’après la table française Ciqual, 100 g de blanc de poulet cuit apportent environ 26 g de protéines, 100 g de thon au naturel 24,5 g, 100 g d’œufs durs 13,5 g, de tofu 11,5 g, de pain complet 9 g, de lentilles cuites 8 g, de fromage blanc 7,5 g, et 100 ml de lait demi-écrémé 3,3 g.",
        "Un shaker de protéines en poudre aide quand un repas en manque, et les mêmes protéines se trouvent dans les aliments.",
      ],
    },
  ],
  exemple: ["Tu pèses 65 kg et tu fais de la musculation trois fois par semaine. Avec le repère de 1,4 g par kilo, ton objectif tourne autour de 90 g par jour. Une journée possible : 200 g de fromage blanc et 60 g de pain complet le matin (20 g), 150 g de blanc de poulet cuit à midi (39 g), un bol de 250 ml de lait au goûter (8 g), et le soir 150 g de lentilles avec 100 g de tofu (24 g). Total : environ 90 g, avec des aliments du quotidien."],
  retenir: "Sans entraînement particulier, 0,83 g de protéines par kilo et par jour suffit. Avec de la musculation régulière, vise 1,2 à 2 g par kilo, répartis sur trois ou quatre repas, en les prenant surtout dans les aliments.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Anses · Les protéines", url: "https://www.anses.fr/fr/content/les-prot%C3%A9ines" },
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
        { label: "ISSN · Protéines et exercice, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" },
        { label: "ISSN · Nutrition du sport et de l’exercice, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6090881/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Morton et al. · British Journal of Sports Medicine, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/" },
        { label: "Areta et al. · Journal of Physiology, 2013", url: "https://pubmed.ncbi.nlm.nih.gov/23459753/" },
        { label: "Mamerow et al. · Journal of Nutrition, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4018950/" },
      ],
    },
    {
      groupe: "Tables de composition",
      liens: [
        { label: "Anses · Table Ciqual 2013 (blanc de poulet cuit)", url: "https://informationsnutritionnelles.fr/poulet-blanc-sans-peau" },
        { label: "USDA · FoodData Central (blanc de poulet rôti)", url: "https://fdc.nal.usda.gov/food-details/171477/nutrients" },
        { label: "Anses · Table Ciqual 2013 (thon au naturel)", url: "https://informationsnutritionnelles.fr/thon-au-naturel" },
        { label: "Anses · Table Ciqual 2013 (œuf dur)", url: "https://informationsnutritionnelles.fr/oeuf-dur" },
        { label: "Anses · Table Ciqual 2013 (tofu)", url: "https://informationsnutritionnelles.fr/tofu" },
        { label: "Anses · Table Ciqual 2013 (pain complet)", url: "https://informationsnutritionnelles.fr/pain-complet-ou-integral" },
        { label: "Anses · Table Ciqual 2013 (lentilles cuites)", url: "https://informationsnutritionnelles.fr/lentille" },
        { label: "Anses · Table Ciqual 2013 (fromage blanc)", url: "https://informationsnutritionnelles.fr/fromage-blanc-nature-ou-aux-fruits" },
        { label: "Anses · Table Ciqual 2013 (lait demi-écrémé)", url: "https://informationsnutritionnelles.fr/lait-demi-ecreme-uht" },
      ],
    },
  ],
};

export default texte;
