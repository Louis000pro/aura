/* Flash · Bio ou non bio
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Le bio coûte souvent plus cher, et on ne sait pas toujours ce qu’on paie. Son label encadre une façon de produire. Ce qu’il change dans ton assiette, les études commencent à le mesurer."],
  sections: [
    {
      titre: "Ce que veut dire bio",
      paragraphes: [
        "En agriculture biologique, les pesticides et les engrais de synthèse et les OGM sont interdits, beaucoup d’additifs aussi, et les animaux ont accès à l’extérieur. Certains pesticides d’origine naturelle restent autorisés.",
      ],
    },
    {
      titre: "Les résidus de pesticides",
      paragraphes: [
        "C’est la différence la plus nette. En 2012, une revue de l’université Stanford trouvait un risque de résidus de pesticides détectables plus faible de 30 points dans les produits bio. En 2014, une analyse de 343 publications trouvait des résidus quatre fois plus fréquents dans les cultures conventionnelles. L’écart sur les dépassements des limites légales, lui, était faible.",
      ],
    },
    {
      titre: "Les nutriments",
      paragraphes: [
        "Sur les vitamines et les minéraux, la revue de Stanford ne trouvait pas de preuve solide que le bio soit plus nourrissant. L’analyse de 2014 trouvait en revanche plus d’antioxydants, comme les polyphénols, dans les cultures bio, et moins de cadmium, un métal toxique. Ce que ces différences changent pour la santé reste à établir.",
      ],
    },
    {
      titre: "Et la santé ?",
      paragraphes: [
        "En France, l’étude NutriNet-Santé a suivi près de 69 000 adultes entre 2009 et 2016. Ceux qui mangeaient le plus souvent bio avaient 25 % de cancers en moins que ceux qui en mangeaient le moins, soit un écart de 0,6 point sur le risque. C’est une étude d’observation : les grands consommateurs de bio ont souvent d’autres habitudes favorables, que les chercheurs ont essayé de prendre en compte sans pouvoir tout exclure, et ils demandent que ce résultat soit confirmé.",
      ],
    },
    {
      titre: "Comment choisir",
      paragraphes: [
        "Santé publique France conseille de choisir des fruits, des légumes, des légumes secs et des féculents bio quand tu le peux. Si ton budget est serré, la priorité reste d’en manger davantage, bio ou non : augmenter même un peu sa consommation de fruits et légumes est bon pour la santé. Bien les laver retire aussi une partie des résidus présents en surface.",
      ],
    },
  ],
  retenir: "Le bio contient moins de résidus de pesticides et un peu plus de certains antioxydants ; sur les vitamines et les minéraux, l’écart est faible. Choisis-le quand tu peux, en priorité pour les fruits, les légumes, les légumes secs et les féculents, sans jamais en manger moins pour autant.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Smith-Spangler et al. · Annals of Internal Medicine, 2012", url: "https://pubmed.ncbi.nlm.nih.gov/22944875/" },
        { label: "Barański et al. · British Journal of Nutrition, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4141693/" },
        { label: "Baudry et al. (NutriNet-Santé) · JAMA Internal Medicine, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6583612/" },
      ],
    },
  ],
};

export default texte;
