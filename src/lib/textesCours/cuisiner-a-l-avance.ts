/* Flash · Cuisiner une fois pour plusieurs jours
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Cuisiner chaque soir demande du temps et de l’énergie, deux choses qui manquent souvent en semaine. Cuisiner en une fois pour plusieurs repas, ce que les anglophones appellent le meal prep, règle une bonne partie du problème, à condition de respecter quelques règles de conservation."],
  sections: [
    {
      titre: "Les règles pour que ça se garde",
      paragraphes: [
        "L’agence britannique de sécurité des aliments, la Food Standards Agency, donne des règles simples. Laisse refroidir tes plats, puis mets-les au réfrigérateur dans l’heure ou les deux heures qui suivent la cuisson. Pour refroidir plus vite, répartis la préparation dans de petites boîtes. Ton réfrigérateur doit être réglé entre 0 et 5 °C.",
        "Mange tes restes dans les 48 heures, et congèle ce que tu ne mangeras pas d’ici là. Au congélateur, autour de -18 °C, les bactéries ne se développent plus. La viande y garde le mieux sa qualité deux à trois mois, les fruits, les légumes, le pain et les gâteaux trois à quatre mois. Note la date sur chaque boîte.",
        "Décongèle au réfrigérateur, jamais à température ambiante, et réchauffe jusqu’à ce que le plat soit très chaud au cœur : le gouvernement du Québec donne 74 °C. Un plat décongelé puis cuit peut retourner au congélateur, mais il ne se réchauffe ensuite qu’une seule fois.",
      ],
    },
    {
      titre: "Une organisation qui marche",
      paragraphes: [
        "Choisis un moment calme dans la semaine, le dimanche par exemple, et un second le mercredi : avec 48 heures au réfrigérateur et le congélateur pour le reste, deux sessions couvrent la semaine.",
        "Prépare des bases qui se combinent plutôt que cinq boîtes identiques : une ou deux sources de protéines (poulet rôti, lentilles, œufs durs, tofu), un ou deux féculents (riz, pâtes complètes, pommes de terre), des légumes rôtis ou crus, et une ou deux sauces. Le lundi, ça donne un bol de riz, de poulet et de légumes rôtis. Le mardi, une salade de pâtes avec les mêmes légumes et une vinaigrette. Le mercredi, des lentilles à la sauce tomate sorties du congélateur.",
      ],
    },
    {
      titre: "Les plats qui se gardent bien",
      paragraphes: [
        "Les plats mijotés, les currys, les soupes, les chilis et les sauces tomate se congèlent très bien, et sont souvent meilleurs le lendemain. Les crudités et les salades se gardent mieux sans leur sauce, ajoutée au dernier moment. Les fritures et les plats croustillants perdent leur texture.",
      ],
    },
  ],
  retenir: "Mets tes plats au réfrigérateur dans les deux heures, mange les restes dans les 48 heures et congèle le reste en notant la date. Prépare des bases qui se combinent, et réchauffe jusqu’à ce que le plat soit très chaud au cœur.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Food Standards Agency · How to chill, freeze and defrost food safely", url: "https://www.gov.uk/government/publications/how-to-chill-freeze-and-defrost-food-safely/how-to-chill-freeze-and-defrost-food-safely" },
        { label: "Gouvernement du Québec · Refroidir, réchauffer et décongeler les aliments", url: "https://www.quebec.ca/sante/alimentation/salubrite-aliments-prevention-risques/salubrite-aliments-domicile/preparation-aliments-cuisson-securitaires/refroidir-rechauffer-decongeler-aliments" },
      ],
    },
  ],
};

export default texte;
