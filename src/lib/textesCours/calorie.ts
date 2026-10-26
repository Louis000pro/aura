/* Flash · Une calorie, c’est quoi ?
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Sur les étiquettes, sur ta montre, dans les applis : les calories sont partout. Le mot inquiète parfois, alors qu’il désigne une chose simple, une quantité d’énergie."],
  sections: [
    {
      titre: "Une unité d’énergie",
      paragraphes: [
        "Une calorie mesure de l’énergie, comme le mètre mesure une longueur. Celle des étiquettes est en réalité une kilocalorie, notée kcal : l’énergie qu’il faut pour réchauffer d’un degré un litre d’eau. Dans la vie courante, tout le monde dit « calorie ». Les étiquettes européennes donnent aussi la valeur en kilojoules, notés kJ : 1 kcal vaut environ 4,2 kJ.",
      ],
    },
    {
      titre: "D’où viennent les calories d’un aliment",
      paragraphes: [
        "Les calories d’un aliment viennent de ses protéines, de ses glucides, de ses lipides, et de son alcool s’il en contient. Les étiquettes européennes les calculent avec les mêmes coefficients : 4 kcal par gramme de protéines ou de glucides, 9 par gramme de lipides, 7 par gramme d’alcool, 2 par gramme de fibres. L’eau, les vitamines et les minéraux n’en apportent aucune.",
      ],
    },
    {
      titre: "Où partent tes calories",
      paragraphes: [
        "Ton corps dépense de l’énergie toute la journée, même au repos : pour respirer, faire battre ton cœur, garder ta température, renouveler tes cellules. Cette dépense au repos représente la plus grosse part de ta journée. S’y ajoutent l’énergie de la digestion, et celle de tout ce que tu fais en bougeant, du sport comme de la marche jusqu’au bus.",
      ],
    },
    {
      titre: "Ce que le chiffre laisse de côté",
      paragraphes: [
        "Le chiffre de l’étiquette sert à comparer deux produits. Il ne dit rien de la faim qui suit : 250 kcal de soda passent en une minute et laissent l’estomac vide, alors que 250 kcal de lentilles et de légumes prennent de la place et occupent pour plusieurs heures. Il ne dit rien non plus des fibres, des vitamines ou des protéines qui viennent avec.",
        "Les 2 000 kcal imprimées sur les emballages servent de référence commune. Tes propres besoins dépendent de ton âge, de ta taille, de ton corps et de ton activité.",
      ],
    },
  ],
  retenir: "Une calorie mesure de l’énergie. Les protéines et les glucides en apportent 4 par gramme, les lipides 9, l’alcool 7. Le chiffre aide à comparer deux produits, mais il ne dit rien de la satiété ni de ce que l’aliment t’apporte d’autre.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Union européenne · Règlement n° 1169/2011 sur l’information du consommateur", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32011R1169" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Hall et al. · The Lancet, 2011", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/" },
        { label: "Rolls · Physiology & Behavior, 2009", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4182946/" },
      ],
    },
  ],
};

export default texte;
