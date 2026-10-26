/* Flash · Ce qui rassasie le plus longtemps
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Deux repas de 500 kcal peuvent te laisser dans des états très différents : l’un te cale jusqu’au soir, l’autre te laisse le ventre creux deux heures plus tard. Les chercheurs distinguent le rassasiement, qui te fait arrêter de manger pendant le repas, et la satiété, qui retarde la faim suivante. Plusieurs choses jouent sur les deux."],
  sections: [
    {
      titre: "Le classement des aliments",
      paragraphes: [
        "En 1995, une équipe australienne a servi à des volontaires 38 aliments courants, chacun en portion de 240 kcal, puis a suivi leur faim pendant deux heures. Les pommes de terre bouillies arrivaient en tête, sept fois plus rassasiantes que le croissant, dernier du classement. La plupart des aliments rassasiaient au moins autant que le pain blanc, et ceux qui calaient le mieux faisaient manger moins au repas suivant.",
      ],
    },
    {
      titre: "Les protéines",
      paragraphes: [
        "À calories égales, les protéines rassasient davantage que les glucides et les graisses. L’effet existe, mais il reste modeste : un repas plus riche en protéines cale un peu mieux, sans forcément faire manger moins au repas suivant. Une source de protéines à chaque repas reste une bonne base.",
      ],
    },
    {
      titre: "Le volume dans l’assiette",
      paragraphes: [
        "Les légumes, les fruits, les soupes et les légumes secs apportent beaucoup de volume pour peu de calories, grâce à leur eau et à leurs fibres. La chercheuse américaine Barbara Rolls a montré dans de nombreuses études que baisser la densité énergétique d’un repas, c’est-à-dire le nombre de calories par bouchée, fait manger moins de calories sans avoir plus faim. Une soupe en entrée ou une assiette à moitié remplie de légumes suivent ce principe.",
      ],
    },
    {
      titre: "Ce qu’on mâche",
      paragraphes: [
        "Ce qui se boit rassasie moins que ce qui se mâche. Dans une étude de 2009, manger une pomme entière avant un repas faisait manger moins au repas que la même pomme en compote ou en jus.",
      ],
    },
    {
      titre: "Les aliments peu transformés",
      paragraphes: [
        "Dans un essai de 2019, vingt adultes ont mangé à volonté pendant deux semaines des repas ultra-transformés, puis pendant deux semaines des repas peu transformés. Avec les ultra-transformés, ils mangeaient environ 500 kcal de plus par jour.",
      ],
    },
  ],
  retenir: "Pour être calé plus longtemps à calories égales, mets dans ton assiette une source de protéines, beaucoup de légumes ou une soupe, des féculents peu transformés comme les pommes de terre ou les légumes secs, et préfère les fruits entiers aux jus.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Holt et al. · European Journal of Clinical Nutrition, 1995", url: "https://pubmed.ncbi.nlm.nih.gov/7498104/" },
        { label: "Rolls · Physiology & Behavior, 2009", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4182946/" },
        { label: "Flood-Obbagy et Rolls · Appetite, 2009", url: "https://pubmed.ncbi.nlm.nih.gov/19110020/" },
      ],
    },
  ],
};

export default texte;
