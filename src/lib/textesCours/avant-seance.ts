/* Flash · Que manger avant une séance
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Faut-il manger avant de s’entraîner, et quoi ? La réponse dépend surtout de deux choses : la durée de ta séance, et l’heure de ton dernier repas."],
  sections: [
    {
      titre: "Pour une séance d’une heure",
      paragraphes: [
        "Si tu as mangé normalement dans la journée, une collation juste avant change peu de choses pour une séance d’une heure. En 2018, une analyse de 46 études a comparé des efforts faits après avoir mangé et des efforts faits à jeun : manger avant améliorait les efforts d’endurance prolongés, et ne changeait rien aux efforts plus courts.",
        "En musculation, une revue de 49 études arrive à une conclusion proche : chez une personne qui a mangé normalement, ajouter des glucides n’améliore pas une séance d’une dizaine de séries par groupe musculaire. Les chercheurs jugent peu probable qu’une séance de musculation classique vide ton glycogène, la réserve de sucre de tes muscles.",
      ],
    },
    {
      titre: "Pour un effort long",
      paragraphes: [
        "Pour un effort qui dure, une sortie à vélo ou une longue course, les glucides des heures d’avant aident. Les recommandations communes de trois organisations nord-américaines de nutrition du sport conseillent 1 à 4 g de glucides par kilo de poids, pris 1 à 4 heures avant. Le matin, ils remplissent aussi la réserve de glycogène de ton foie, entamée pendant la nuit.",
        "Pendant l’effort, au-delà d’une heure et demie environ, des glucides aident encore : 30 à 60 g par heure, en boisson, en fruits ou en barres, et jusqu’à 90 g par heure pour les efforts de plus de deux heures et demie.",
      ],
    },
    {
      titre: "Plus c’est proche, plus c’est léger",
      paragraphes: [
        "Plus ton repas est proche de la séance, plus il vaut mieux choisir des aliments faciles à digérer. Les recommandations conseillent des aliments pauvres en graisses et en fibres, avec peu ou modérément de protéines, comme une banane ou une galette de riz : ils quittent plus vite l’estomac et causent moins de troubles digestifs. Un plat de lentilles en sauce une heure avant de courir, ton ventre risque de s’en souvenir.",
        "Ce qui passe bien varie d’une personne à l’autre, et les recommandations conseillent de choisir d’après ton expérience.",
      ],
    },
    {
      titre: "Et l’eau ?",
      paragraphes: [
        "Inutile de boire beaucoup juste avant. Selon les spécialistes de l’hydratation du sport, il suffit d’arriver en ayant bu normalement dans la journée.",
      ],
    },
  ],
  doute: ["S’entraîner à jeun, le matin, attire beaucoup d’attention. L’analyse de 2018 montre qu’à jeun, ton corps libère plus de graisses dans le sang après l’effort. Reste à savoir si ça change quelque chose sur des mois d’entraînement, pour la forme ou pour la silhouette : les études ne permettent pas encore de le dire. Si tu te sens bien à jeun pour une séance courte, rien ne t’oblige à manger avant."],
  retenir: "Pour une séance d’une heure, après une journée où tu as mangé normalement, rien de spécial n’est nécessaire. Pour un effort plus long, mange des glucides dans les heures d’avant, en choisissant des aliments légers si le repas est proche.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
        { label: "ISSN · Nutrition du sport et de l’exercice, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6090881/" },
        { label: "NATA · Hydratation des personnes actives, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/" },
        { label: "Comité international olympique · Glucides pour l’entraînement et la compétition, 2011", url: "https://pubmed.ncbi.nlm.nih.gov/21660838/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Aird, Davies et Carson · Scandinavian Journal of Medicine & Science in Sports, 2018", url: "https://pubmed.ncbi.nlm.nih.gov/29315892/" },
        { label: "Henselmans et al. · Nutrients, 2022", url: "https://pubmed.ncbi.nlm.nih.gov/35215506/" },
        { label: "Escobar et al. · British Journal of Nutrition, 2016", url: "https://pubmed.ncbi.nlm.nih.gov/27993175/" },
      ],
    },
  ],
};

export default texte;
