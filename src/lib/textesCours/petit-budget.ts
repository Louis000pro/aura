/* Flash · Bien manger avec un petit budget
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["On entend souvent que bien manger coûte cher. Certains produits le sont, mais beaucoup des aliments les plus conseillés comptent aussi parmi les moins chers."],
  sections: [
    {
      titre: "Les aliments qui nourrissent pour peu",
      paragraphes: [
        "Les légumes secs, comme les lentilles, les pois chiches et les haricots, apportent des protéines et des fibres pour peu d’argent. Santé publique France en conseille au moins deux fois par semaine, et ils peuvent remplacer la viande dans un plat, comme un curry de lentilles avec du riz ou un couscous aux pois chiches. Les œufs, les sardines et les maquereaux en boîte, les flocons d’avoine, le riz, les pâtes et la farine complètent la liste.",
      ],
    },
    {
      titre: "Les surgelés, les conserves et la saison",
      paragraphes: [
        "Les légumes surgelés et en conserve nature se gardent longtemps, limitent le gaspillage, et gardent l’essentiel de leurs nutriments. En saison, les fruits et légumes frais sont souvent moins chers, et Santé publique France les conseille aussi pour leur goût.",
      ],
    },
    {
      titre: "Faire maison, sans y passer des heures",
      paragraphes: [
        "Les plats préparés et les produits en portions individuelles coûtent plus cher au kilo que leurs ingrédients. Cuisiner une grosse quantité une ou deux fois par semaine, utiliser les restes, et faire sa liste de courses à partir des repas de la semaine réduisent les dépenses et le gaspillage. Compare aussi les prix au kilo, indiqués sur l’étiquette du rayon : les grands formats et les marques de distributeur sont souvent moins chers pour un produit équivalent.",
      ],
    },
    {
      titre: "Ce qui peut attendre",
      paragraphes: [
        "Le bio et les compléments pèsent lourd dans un budget. Santé publique France conseille le bio « si vous pouvez », et rappelle qu’augmenter même un peu sa consommation de fruits et légumes est bon pour la santé.",
      ],
    },
  ],
  retenir: "Pour bien manger à petit prix, mise sur les légumes secs, les œufs, le poisson en conserve, les féculents, et les fruits et légumes de saison, surgelés ou en conserve nature. Cuisine en plus grande quantité, et compare les prix au kilo.",
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
        { label: "Bouzari, Holstege et Barrett · Journal of Agricultural and Food Chemistry, 2015", url: "https://pubmed.ncbi.nlm.nih.gov/25526594/" },
      ],
    },
  ],
};

export default texte;
