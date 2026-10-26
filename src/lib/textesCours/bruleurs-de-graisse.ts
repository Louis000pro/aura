/* Flash · Les brûleurs de graisse
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Les produits vendus pour « brûler les graisses » misent sur un argument simple : faire fondre le gras sans rien changer d’autre. Ils mélangent souvent plusieurs ingrédients, chacun avec sa promesse."],
  sections: [
    {
      titre: "Ce qu’il y a dedans",
      paragraphes: [
        "En 2011, une revue a passé en revue les ingrédients les plus fréquents : la caféine, le thé vert, la carnitine, l’acide linoléique conjugué, le garcinia, le chrome, et bien d’autres. Seuls la caféine et le thé vert avaient des données montrant qu’ils augmentent un peu l’utilisation des graisses. Pour la plupart des autres, les preuves manquaient. Les auteurs notaient que la liste des ingrédients grandit bien plus vite que les preuves.",
        "Utiliser un peu plus de graisses pendant quelques heures ne veut pas dire perdre du poids : ce qui compte reste ce que tu manges et ce que tu dépenses sur des semaines.",
      ],
    },
    {
      titre: "Le thé vert concentré",
      paragraphes: [
        "Boire du thé vert ne pose pas de problème. Les extraits concentrés en gélules, si. En 2018, l’Autorité européenne de sécurité des aliments a conclu qu’à partir de 800 mg par jour d’EGCG, la principale substance du thé vert, pris en complément, les enzymes du foie augmentent, signe que le foie souffre. Des atteintes plus rares ont été décrites à des doses plus faibles, chez des personnes particulièrement sensibles.",
      ],
    },
    {
      titre: "Les autres risques",
      paragraphes: [
        "En France, l’Anses a recueilli des signalements d’effets indésirables liés aux produits pour la perte de gras, surtout pour le cœur, comme des palpitations ou des troubles du rythme, et des troubles psychiques, comme l’anxiété. Certains produits contiennent même des médicaments interdits qui ne figurent pas sur l’étiquette (voir « Les compléments pour le sport : ce qui a des preuves »).",
      ],
    },
  ],
  retenir: "Les brûleurs de graisse font peu ou rien pour le poids. Seuls la caféine et le thé vert montrent un petit effet sur l’utilisation des graisses, et les extraits de thé vert concentrés peuvent abîmer le foie à forte dose. Ce qui fait perdre du gras reste ton alimentation et ton activité sur des semaines.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "EFSA · Sécurité des catéchines du thé vert, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7009618/" },
        { label: "Anses · Compléments alimentaires pour sportifs, 2016", url: "https://www.anses.fr/fr/actualite/complements-alimentaires-destines-aux-sportifs-risques-sante-benefices-incertains" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Jeukendrup et Randell · Obesity Reviews, 2011", url: "https://pubmed.ncbi.nlm.nih.gov/21951331/" },
      ],
    },
  ],
};

export default texte;
