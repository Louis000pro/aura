/* Flash · Le sans gluten quand on n’est pas cœliaque
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Les rayons sans gluten se sont multipliés, et beaucoup de personnes en mangent sans avoir de maladie. Pour une petite partie de la population, c’est un traitement indispensable. Pour les autres, l’intérêt est beaucoup moins clair."],
  sections: [
    {
      titre: "Le gluten et la maladie cœliaque",
      paragraphes: [
        "Le gluten est une protéine du blé, du seigle et de l’orge. Chez les personnes atteintes de maladie cœliaque, il déclenche une réaction du système immunitaire qui abîme la paroi de l’intestin et empêche de bien absorber les nutriments. Elle peut donner des diarrhées, des douleurs de ventre, des ballonnements, de la fatigue ou un manque de fer. Au Royaume-Uni, elle touche au moins une personne sur cent, et beaucoup de cas passent inaperçus.",
      ],
    },
    {
      titre: "Le test avant l’arrêt",
      paragraphes: [
        "Si tu penses avoir une maladie cœliaque, parles-en à un médecin avant de supprimer le gluten. Le diagnostic passe par une prise de sang, parfois confirmée par un examen de l’intestin, et ces tests ne fonctionnent que si tu manges du gluten au moment où ils sont faits. Arrêter avant peut fausser le résultat.",
      ],
    },
    {
      titre: "La sensibilité au gluten, un sujet discuté",
      paragraphes: [
        "Certaines personnes sans maladie cœliaque se sentent mieux sans gluten. Une partie de l’explication se trouve ailleurs : le blé contient aussi des fructanes, des sucres que l’intestin fermente, ce qui donne des gaz.",
        "En 2018, un essai norvégien a donné tour à tour, sans qu’elles sachent ce qu’elles recevaient, du gluten, des fructanes ou un placebo à 59 personnes qui se disaient sensibles au gluten. Les fructanes provoquaient davantage de symptômes, surtout des ballonnements. Le gluten n’en provoquait pas plus que le placebo.",
        "Si ton ventre est souvent gonflé ou douloureux, un médecin ou un diététicien peut t’aider à trouver ce qui le gêne.",
      ],
    },
    {
      titre: "Sans maladie, peu d’intérêt",
      paragraphes: [
        "Sans maladie cœliaque, rien ne montre qu’arrêter le gluten aide à perdre du poids ou protège la santé. Les produits sans gluten coûtent plus cher, et certains contiennent moins de fibres. Quand on perd du poids en arrêtant le gluten, c’est souvent parce qu’on mange moins de viennoiseries, de pizzas et de gâteaux.",
        "Si tu veux varier tes céréales, le riz, le maïs, le sarrasin, le quinoa, le millet et les pommes de terre n’en contiennent pas, comme la galette de sarrasin bretonne. L’avoine n’en contient pas non plus, mais elle est souvent mélangée à du blé pendant sa fabrication.",
      ],
    },
  ],
  retenir: "Le sans gluten est indispensable en cas de maladie cœliaque, à confirmer par un test pendant que tu manges encore du gluten. Sans maladie, il n’a pas d’intérêt prouvé, et un ventre sensible réagit parfois à d’autres composants du blé.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "NHS · Coeliac disease", url: "https://www.nhs.uk/conditions/coeliac-disease/" },
        { label: "NHS · Coeliac disease, diagnosis", url: "https://www.nhs.uk/conditions/coeliac-disease/diagnosis/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Skodje et al. · Gastroenterology, 2018", url: "https://pubmed.ncbi.nlm.nih.gov/29102613/" },
      ],
    },
  ],
};

export default texte;
