/* Flash · Les calories qu’on boit
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Une canette de soda le midi, un jus d’orange au petit-déjeuner, un verre de vin le soir : ces calories-là passent presque inaperçues. Elles comptent pourtant, et elles calent peu."],
  sections: [
    {
      titre: "Ce que contiennent quelques boissons",
      paragraphes: [
        "Une canette de soda classique de 33 cl apporte environ 35 g de sucre, soit à peu près 140 kcal. Un verre de jus d’orange apporte lui aussi du sucre, celui du fruit, sans les fibres qui ralentissent sa digestion. L’alcool apporte 7 kcal par gramme, presque autant que le gras : un verre standard, qui contient 10 g d’alcool pur, en apporte environ 70 avant même de compter le sucre de la boisson.",
      ],
    },
    {
      titre: "Pourquoi elles calent peu",
      paragraphes: [
        "Ce qui se boit passe vite et rassasie peu : dans une étude de 2009, une pomme entière calait davantage que la même pomme en jus. Les calories des boissons s’ajoutent donc souvent à celles des repas, au lieu de les remplacer.",
        "L’Organisation mondiale de la santé conseille de limiter les sucres libres, ceux qu’on ajoute et ceux des jus, des sirops et du miel, à moins de 10 % de l’énergie de la journée, et si possible à 5 %. Pour un adulte de référence, 5 % représentent 25 g : une seule canette de soda dépasse déjà ce repère.",
      ],
    },
    {
      titre: "Ce que conseille Santé publique France",
      paragraphes: [
        "L’eau est la seule boisson recommandée. Le thé, le café et les infusions sans sucre comptent aussi. Les jus de fruits, les sodas, même light, et les boissons énergisantes se limitent à un verre par jour au plus.",
        "Pour garder le plaisir, l’eau gazeuse avec une rondelle de citron, un thé glacé maison peu sucré ou de l’eau aux fruits frais apportent beaucoup moins de sucre.",
      ],
    },
  ],
  retenir: "Les boissons sucrées et l’alcool apportent des calories qui calent peu. Garde l’eau comme boisson principale, avec le thé, le café et les infusions sans sucre, et limite jus et sodas à un verre par jour.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
        { label: "OMS · Recommandation sur l’apport en sucres, 2015", url: "https://www.who.int/news/item/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children" },
        { label: "Union européenne · Règlement n° 1169/2011 sur l’information du consommateur", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32011R1169" },
      ],
    },
  ],
};

export default texte;
