/* Flash · L’index glycémique, utile ou pas ?
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["L’index glycémique, ou IG, revient dans beaucoup de régimes : il faudrait choisir les aliments à « IG bas ». L’idée est simple, ses limites aussi, et les essais donnent une réponse nuancée."],
  sections: [
    {
      titre: "Ce qu’il mesure",
      paragraphes: [
        "Quand tu manges des glucides, ton sucre sanguin, la glycémie, monte puis redescend. L’index glycémique classe les aliments de 0 à 100 selon la vitesse à laquelle ils font monter ta glycémie, par rapport au glucose pur. Un aliment à IG élevé la fait monter vite et haut, comme le pain blanc ou la purée. Un aliment à IG bas la fait monter lentement, comme les lentilles ou les pois chiches.",
      ],
    },
    {
      titre: "Un chiffre qui bouge",
      paragraphes: [
        "L’IG d’un aliment n’est pas fixe. Il change avec la cuisson, la maturité d’un fruit et la façon dont l’aliment a été transformé, mixé ou moulu. Il change surtout avec le reste du repas : les protéines, le gras et les fibres ralentissent la digestion des glucides.",
        "Il ne dit rien non plus de la quantité, qui pèse souvent davantage sur ta glycémie. Une pastèque a un IG élevé, mais une tranche contient peu de glucides. Les chercheurs parlent alors de charge glycémique, qui tient compte de la portion.",
        "Et un IG bas ne fait pas un aliment sain. L’association britannique Diabetes UK le rappelle : le chocolat a un IG bas à cause de son gras, et les chips ont un IG plus bas que des pommes de terre cuites sans matière grasse.",
      ],
    },
    {
      titre: "Ce que disent les essais",
      paragraphes: [
        "En 2014, l’essai OmniCarb a nourri 163 adultes en surpoids avec des menus complets, tous inspirés du régime DASH, réputé bon pour le cœur. Pendant cinq semaines, choisir des glucides à IG bas n’a amélioré ni la sensibilité à l’insuline, ni le cholestérol, ni la tension. Dans les menus riches en glucides, l’IG bas a même un peu baissé la sensibilité à l’insuline et monté le LDL.",
        "En cas de diabète, le tableau change. En 2021, une analyse de 29 essais, menée pour les recommandations européennes sur le diabète, a montré qu’une alimentation à IG bas faisait baisser un peu l’hémoglobine glyquée, le marqueur de l’équilibre du diabète sur trois mois, de 0,31 point en moyenne, avec de petits gains sur le cholestérol LDL et le poids.",
      ],
    },
    {
      titre: "En pratique",
      paragraphes: [
        "En cas de diabète, l’IG est un outil parmi d’autres, à voir avec ton médecin ou ton diététicien, avec la taille des portions et la répartition des glucides dans la journée. Pour tout le monde, les aliments à IG bas sont souvent ceux qu’on conseille de toute façon : légumes secs, céréales complètes, fruits entiers. Et pendant un effort long, c’est l’inverse qu’on cherche : des glucides qui passent vite.",
      ],
    },
  ],
  retenir: "L’index glycémique mesure la vitesse à laquelle un aliment fait monter ta glycémie, mais il varie avec la cuisson, la portion et le reste du repas. Il aide un peu en cas de diabète. Pour les autres, des repas variés, avec des légumes secs, des céréales complètes et des fruits entiers, font l’essentiel.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Diabetes UK · Glycaemic index and diabetes", url: "https://www.diabetes.org.uk/guide-to-diabetes/enjoy-food/carbohydrates-and-diabetes/glycaemic-index-and-diabetes" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Sacks et al. (OmniCarb) · JAMA, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4370345/" },
        { label: "Chiavaroli et al. · BMJ, 2021", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8336013/" },
      ],
    },
  ],
};

export default texte;
