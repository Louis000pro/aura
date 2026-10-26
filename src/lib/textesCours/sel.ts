/* Flash · Le sel : combien, et où il se cache
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Le sel donne du goût, et ton corps a besoin d’un peu de sodium, l’un de ses deux composants. Le problème vient de la quantité : la plupart des adultes en mangent bien plus que nécessaire, souvent sans le savoir."],
  sections: [
    {
      titre: "Combien",
      paragraphes: [
        "L’Organisation mondiale de la santé conseille aux adultes moins de 5 g de sel par jour, à peu près une cuillère à café. En 2021, un adulte en mangeait en moyenne 11 g dans le monde. Trop de sel fait surtout monter la tension artérielle, qui fatigue le cœur et les vaisseaux.",
      ],
    },
    {
      titre: "Où il se cache",
      paragraphes: [
        "La plus grosse part du sel arrive déjà dans les aliments. Santé publique France cite en premier la charcuterie, les plats préparés du commerce, les soupes déshydratées, le fromage et le pain. Le pain n’est pas très salé, mais on en mange souvent, et ça finit par compter.",
      ],
    },
    {
      titre: "Sur l’étiquette",
      paragraphes: [
        "Les étiquettes européennes indiquent le sel pour 100 g. Si tu trouves le sodium à la place, multiplie par 2,5 : 1 g de sodium correspond à 2,5 g de sel.",
      ],
    },
    {
      titre: "Réduire sans perdre le goût",
      paragraphes: [
        "Les conseils de Santé publique France tiennent en quelques gestes : saler moins en cuisinant, goûter avant de saler à table, ne pas resaler les conserves, et donner du goût avec des épices, des herbes, de l’ail ou des condiments. Quand tu en mets, choisis du sel iodé : il apporte l’iode dont ta thyroïde a besoin.",
      ],
    },
  ],
  retenir: "Vise moins de 5 g de sel par jour. La plus grosse part vient de la charcuterie, des plats préparés, des soupes en sachet, du fromage et du pain. Goûte avant de saler, et choisis du sel iodé.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "OMS · Réduire la consommation de sel", url: "https://www.who.int/news-room/fact-sheets/detail/salt-reduction" },
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
        { label: "Union européenne · Règlement n° 1169/2011 sur l’information du consommateur", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32011R1169" },
      ],
    },
  ],
};

export default texte;
