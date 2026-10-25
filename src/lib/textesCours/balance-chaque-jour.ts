/* Flash · Pourquoi la balance bouge chaque jour
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Vendredi, ta balance affiche 71,8 kg. Lundi, 72,5 kg. Pas d’inquiétude : le poids bouge tous les jours, et pour des raisons qui ont rarement à voir avec ta graisse."],
  sections: [
    {
      titre: "Ce que la balance additionne",
      paragraphes: [
        "Ta balance pèse tout à la fois : ta graisse, tes muscles, tes os, l’eau de ton corps, et ce que tu es en train de digérer. D’un jour à l’autre, c’est surtout l’eau qui varie. Chaque gramme de glycogène, la réserve de sucre de tes muscles et de ton foie, est stocké avec au moins 3 g d’eau. Un repas riche en glucides ou en sel fait donc monter la balance le lendemain, sans que ta graisse ait bougé.",
      ],
    },
    {
      titre: "Le week-end se voit le lundi",
      paragraphes: [
        "En 2014, des chercheurs ont suivi 80 adultes qui se pesaient chaque jour, soit 4 657 pesées. Leur poids montait à partir du samedi, restait au plus haut le dimanche et le lundi, puis redescendait au fil de la semaine. Les auteurs concluent que cet écart entre le week-end et la semaine est normal, et ne signale pas une prise de poids.",
        "Une étude menée dans trois pays, sur jusqu’à 1 421 personnes, a mesuré l’ampleur de ce va-et-vient : environ 0,35 % du poids, soit 250 g pour 70 kg. Les fêtes de fin d’année comptent davantage : 1,35 % en moyenne, que les participants ne reperdaient pas entièrement dans les mois suivants.",
      ],
    },
    {
      titre: "Le cycle menstruel",
      paragraphes: [
        "Si tu as des règles, ton poids suit aussi ton cycle. Dans une étude sur 42 femmes, le poids montait d’environ un demi-kilo pendant les jours de règles, surtout à cause de l’eau retenue hors des cellules, sans autre changement du corps. Une étude sur des femmes sportives trouve elle aussi un petit écart lié à l’hydratation, sans changement de la masse grasse. Et dans une étude sur 765 cycles, la sensation de gonflement était la plus forte le premier jour des règles.",
      ],
    },
    {
      titre: "Se peser souvent : bonne ou mauvaise idée ?",
      paragraphes: [
        "La réponse dépend de toi. Chez les personnes qui cherchent à perdre du poids, une revue de 17 études associe la pesée régulière à une perte plus importante, sans effet psychologique négatif retrouvé. Dans un essai de six mois, des adultes qui se pesaient chaque jour, avec un graphique et des conseils par courriel, ont perdu 6,55 % de leur poids, contre 0,35 % dans le groupe témoin, et vivaient bien cette habitude.",
        "Chez d’autres, la balance pèse sur le moral. Une revue de 2015 trouve que beaucoup d’études relient la pesée à une humeur plus basse, à une estime de soi ou une image du corps moins bonnes, ou à des comportements alimentaires moins sereins, surtout chez les femmes et les plus jeunes.",
        "Si la balance gâche tes journées ou prend beaucoup de place dans tes pensées, tu peux espacer les pesées ou t’en passer : tes vêtements, ton énergie et tes séances donnent aussi des nouvelles.",
      ],
    },
  ],
  exemple: ["Reprends ces deux pesées. La semaine dernière, tes sept pesées du matin donnaient une moyenne de 72,2 kg. Cette semaine, malgré ce lundi à 72,5 kg, la moyenne finit à 71,9 kg. La tendance baisse de 300 g, et c’est elle qui renseigne."],
  retenir: "Un chiffre isolé dit peu de choses. Si tu te pèses, fais-le dans les mêmes conditions, par exemple le matin au réveil, et compare des moyennes d’une semaine à l’autre.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Orsama et al. · Obesity Facts, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5644907/" },
        { label: "Turicchi et al. · PLoS One, 2020", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7192384/" },
        { label: "Kanellakis et al. · American Journal of Human Biology, 2023", url: "https://pubmed.ncbi.nlm.nih.gov/37395124/" },
        { label: "Wagner et al. · International Journal of Sport Nutrition and Exercise Metabolism, 2026", url: "https://pubmed.ncbi.nlm.nih.gov/42722363/" },
        { label: "White et al. · Obstetrics and Gynecology International, 2011", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3154522/" },
        { label: "Zheng et al. · Obesity, 2015", url: "https://pubmed.ncbi.nlm.nih.gov/25521523/" },
        { label: "Steinberg et al. · Obesity, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3788086/" },
        { label: "Pacanowski, Linde et Neumark-Sztainer · Current Obesity Reports, 2015", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4729441/" },
        { label: "Fernández-Elías et al. · European Journal of Applied Physiology, 2015", url: "https://doi.org/10.1007/s00421-015-3175-z" },
        { label: "Kreitzman, Coxon et Szaz · American Journal of Clinical Nutrition, 1992", url: "https://pubmed.ncbi.nlm.nih.gov/1615908/" },
      ],
    },
  ],
};

export default texte;
