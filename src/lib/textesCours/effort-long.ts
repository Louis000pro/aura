/* Flash · Manger pendant un effort long
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Une sortie vélo de trois heures, un semi-marathon, une randonnée à la journée : au-delà d’une heure, tes réserves de glucides commencent à compter. Manger en route aide à garder ton allure jusqu’au bout."],
  sections: [
    {
      titre: "Pourquoi manger en route",
      paragraphes: [
        "Pendant l’effort, tes muscles puisent dans le glycogène, leur réserve de sucre. Après une heure et demie à deux heures d’effort soutenu, cette réserve s’épuise et l’allure baisse : c’est le coup de barre que redoutent les coureurs. Les glucides pris pendant l’effort apportent un carburant de plus et retardent ce moment.",
      ],
    },
    {
      titre: "Combien par heure",
      paragraphes: [
        "Le consensus du Comité international olympique donne des repères selon la durée. Pour un effort de moins de 45 minutes, rien n’est nécessaire. Entre 45 minutes et une heure et quart, de petites quantités suffisent, parfois un simple rinçage de bouche avec une boisson sucrée. Entre une heure et deux heures et demie, il conseille 30 à 60 g de glucides par heure. Au-delà, jusqu’à 90 g par heure.",
        "Pour ces grandes quantités, le mélange de glucose et de fructose compte. Ton intestin absorbe le glucose par une seule porte d’entrée, qui sature vers 60 g par heure. Le fructose passe par une autre porte, ce qui permet d’en absorber davantage. Beaucoup de boissons et de gels de l’effort associent les deux.",
      ],
    },
    {
      titre: "Sous quelle forme",
      paragraphes: [
        "Boisson de l’effort, gel, barre, pâte de fruits, banane, fruits secs : tout marche, du moment que tu le digères. Une banane moyenne apporte environ 25 g de glucides, et un gel souvent 20 à 30 g : l’étiquette te le dit. Sur un effort long et chaud, ajoute un peu de sel, par une boisson de l’effort ou un aliment salé, pour compenser ce que tu perds en transpirant.",
      ],
    },
    {
      titre: "Habitue ton ventre",
      paragraphes: [
        "Manger en courant donne parfois des maux de ventre au début, et ça s’améliore avec la répétition. Teste tes produits et tes quantités pendant tes sorties longues, et jamais pour la première fois le jour d’une course. Bois selon ta soif, sans te forcer : trop boire est aussi un risque (voir « Combien boire quand tu fais du sport »).",
      ],
    },
  ],
  exemple: ["Pour une sortie vélo de trois heures à allure modérée, vise environ 60 g de glucides par heure à partir de la première demi-heure. Ça peut donner, chaque heure, un bidon de boisson de l’effort, qui apporte souvent 30 à 40 g, et une banane ou une barre. Note ce que tu as pris et comment ton ventre l’a supporté, puis ajuste à la sortie suivante."],
  retenir: "Pour un effort de plus d’une heure, prends 30 à 60 g de glucides par heure, et jusqu’à 90 g au-delà de deux heures et demie, en mélangeant glucose et fructose. Teste tout à l’entraînement avant de l’utiliser en course.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Comité international olympique · Glucides pour l’entraînement et la compétition, 2011", url: "https://pubmed.ncbi.nlm.nih.gov/21660838/" },
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
      ],
    },
  ],
};

export default texte;
