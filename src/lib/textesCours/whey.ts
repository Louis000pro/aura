/* Flash · La whey
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["La whey trône dans toutes les salles de sport. Ce mot anglais désigne le lactosérum, le liquide qui reste quand on fabrique du fromage. On en tire une poudre très riche en protéines."],
  sections: [
    {
      titre: "Ce qu’elle apporte",
      paragraphes: [
        "La whey est une protéine complète : elle contient tous les acides aminés indispensables, et beaucoup de leucine, celui qui déclenche la fabrication du muscle. Elle se digère vite, ce qui la rend pratique après une séance. La Société internationale de nutrition du sport la cite parmi les protéines de choix pour accompagner la musculation.",
      ],
    },
    {
      titre: "Quand elle sert",
      paragraphes: [
        "Elle n’a rien d’obligatoire : ce qui compte, c’est la quantité de protéines de ta journée, autour de 1,6 g par kilo si tu fais de la musculation (voir « Les protéines : combien par jour, et comment les répartir »). Une dose de 30 g de poudre apporte en général 20 à 25 g de protéines, à peu près autant que 75 g de blanc de poulet cuit ou 300 g de fromage blanc.",
        "Elle rend surtout service quand tes repas n’apportent pas assez de protéines, quand ton prochain repas est loin, ou quand tu manges peu de viande et de poisson.",
      ],
    },
    {
      titre: "Les différentes formes",
      paragraphes: [
        "Le concentré contient encore un peu de lactose et de graisses. L’isolat est plus purifié, avec très peu de lactose : il convient mieux si le lait te donne mal au ventre. Si tu ne manges aucun produit animal, les protéines de pois, de soja ou de riz font le même travail, à dose un peu plus élevée.",
      ],
    },
    {
      titre: "Comment la choisir",
      paragraphes: [
        "Comme tout complément, une poudre de protéines peut contenir des substances non déclarées. Si tu fais de la compétition, l’AFLD conseille un produit conforme à la norme NF EN 17444 ou portant un label de contrôle antidopage (voir « Les compléments pour le sport : ce qui a des preuves »). Regarde aussi la liste des ingrédients : une bonne poudre contient surtout des protéines, avec parfois un arôme et un édulcorant.",
        "Chez une personne en bonne santé, les apports élevés en protéines étudiés chez les sportifs n’ont pas montré d’effet nocif sur les reins. En cas de maladie des reins, demande l’avis de ton médecin.",
      ],
    },
  ],
  retenir: "La whey est une protéine du lait complète et pratique, utile quand tes repas n’apportent pas assez de protéines. Elle ne fait rien de plus que la même quantité de protéines venue des aliments. Si tu fais de la compétition, choisis-la avec un label de contrôle.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "ISSN · Protéines et exercice, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" },
        { label: "AFLD · Compléments alimentaires", url: "https://www.afld.fr/complements-alimentaires/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Morton et al. · British Journal of Sports Medicine, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/" },
      ],
    },
  ],
};

export default texte;
