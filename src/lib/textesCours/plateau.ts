/* Flash · Le plateau : quand le poids ne bouge plus
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Tu perdais régulièrement, et depuis trois semaines la balance ne bouge plus. Ce palier arrive à presque tout le monde. Dans une grande analyse de 80 essais, la perte de poids ralentissait en moyenne vers le sixième mois, quel que soit le régime suivi."],
  sections: [
    {
      titre: "D’abord, vérifie",
      paragraphes: [
        "Avant de parler de plateau, regarde la moyenne de tes pesées sur trois ou quatre semaines. L’eau peut masquer une perte de gras pendant plusieurs jours, surtout autour des règles ou après un repas salé (voir « Pourquoi la balance bouge chaque jour »).",
        "Ton tour de taille, mesuré au même endroit une fois par mois, aide aussi. Si tu viens de commencer la musculation, il peut baisser pendant que la balance reste stable.",
      ],
    },
    {
      titre: "Pourquoi la perte ralentit",
      paragraphes: [
        "Un corps plus léger dépense moins d’énergie, ne serait-ce que pour se porter : avec le même menu, ton déficit se réduit à mesure que tu maigris. En 2011, un modèle publié dans The Lancet a montré que la perte ralentit ainsi naturellement, jusqu’à un nouvel équilibre.",
        "Ton corps peut aussi économiser un peu d’énergie quand tu manges moins, c’est l’adaptation métabolique, mais son ampleur varie selon les études (voir « Un métabolisme lent, ça existe ? »).",
        "Enfin, avec les mois, les portions grandissent un peu et les grignotages reviennent, sans qu’on s’en rende compte. Ça arrive à tout le monde : l’attention des premières semaines est difficile à garder longtemps.",
      ],
    },
    {
      titre: "Ce que tu peux ajuster",
      paragraphes: [
        "Si le plateau dure plus d’un mois et que tu veux continuer à perdre, trois leviers existent. Réduire un peu tes apports, par exemple une portion de féculents ou une collation en moins. Bouger un peu plus au quotidien, en marchant davantage. Ou faire une pause, en mangeant à ton équilibre pendant quelques semaines avant de reprendre.",
        "Cette dernière piste a été testée. Dans l’essai MATADOR, publié en 2018, 51 hommes en obésité ont suivi soit un régime continu de seize semaines, soit le même régime coupé en blocs de deux semaines, séparés par deux semaines à l’équilibre. Parmi ceux qui sont allés au bout, ceux qui faisaient des pauses ont perdu davantage de poids et de gras : 14 kg en moyenne, contre 9 kg. C’est un seul essai, mené chez des hommes, mais il suggère qu’une pause n’efface pas les progrès.",
      ],
    },
    {
      titre: "Ou rester à ce poids",
      paragraphes: [
        "Un plateau peut aussi être un bon endroit où rester. La Haute Autorité de santé rappelle qu’une perte de 5 à 10 % du poids de départ réduit déjà le risque de diabète de type 2. Garder ce poids quelques mois est un vrai résultat, et le cours « Garder son poids après l’avoir perdu » explique comment.",
      ],
    },
  ],
  retenir: "Un plateau vers le sixième mois est normal. Vérifie d’abord la moyenne de tes pesées et ton tour de taille sur trois à quatre semaines. Ensuite, réduis un peu tes apports, bouge davantage, ou fais une pause à l’équilibre : un essai montre qu’elle n’efface pas les progrès.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Franz et al. · Journal of the American Dietetic Association, 2007", url: "https://doi.org/10.1016/j.jada.2007.07.017" },
        { label: "Hall et al. · The Lancet, 2011", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/" },
        { label: "Byrne et al. (MATADOR) · International Journal of Obesity, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5803575/" },
      ],
    },
  ],
};

export default texte;
