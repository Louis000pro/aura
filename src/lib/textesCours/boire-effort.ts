/* Flash · Combien boire quand tu fais du sport
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Faut-il boire avant d’avoir soif ? Pour la plupart des séances, les spécialistes de l’hydratation du sport donnent une réponse simple : boire quand tu as soif suffit, pendant et après l’effort."],
  sections: [
    {
      titre: "Ce que tu perds en transpirant",
      paragraphes: [
        "La sueur varie énormément d’une personne à l’autre : de 0,3 à 2,4 litres par heure selon les recommandations du sport, jusqu’à 4 litres chez certaines personnes, selon l’effort, la chaleur et le corps de chacun. Avec elle partent de l’eau et du sel, environ 1 g de sodium par litre en moyenne.",
        "Quand tu perds plus de 2 % de ton poids en eau, ta performance baisse, surtout au chaud. Pour 70 kg, ça fait 1,4 kg. Au frais, la performance peut tenir un peu au-delà.",
      ],
    },
    {
      titre: "Moins d’une heure : de l’eau",
      paragraphes: [
        "Pour une séance de moins d’une heure, de l’eau suffit. Au-delà, ou par forte chaleur, une boisson avec un peu de sucre et de sel peut aider. Le sel devient vraiment utile si tu transpires beaucoup, plus de 1,2 litre par heure, si ta sueur est très salée, ou si l’effort dure plus de deux heures.",
      ],
    },
    {
      titre: "Trop boire existe aussi",
      paragraphes: [
        "Boire beaucoup plus que ce que tu perds peut faire chuter la quantité de sel dans ton sang. Les médecins appellent ça une hyponatrémie. Elle touche surtout les longues épreuves, au-delà de quatre heures, et plus souvent les femmes. Dans les marathons étudiés, 10 à 20 % des coureurs testés en avaient une, et les formes graves restent rares. Un signe simple : si tu pèses plus lourd après l’effort qu’avant, tu as bu plus que tu n’as perdu.",
      ],
    },
    {
      titre: "La balance comme repère",
      paragraphes: [
        "Pour connaître tes pertes, les recommandations proposent un geste simple : te peser avant et après une séance, sans vêtements, en t’essuyant bien avant la seconde pesée. Le poids perdu pendant l’effort est surtout de l’eau : un kilo de moins correspond à peu près à un litre de sueur. Après la séance, elles conseillent de boire 1,25 à 1,5 litre par kilo perdu, parce qu’une partie de ce que tu bois repart dans les urines.",
      ],
    },
    {
      titre: "La couleur de tes urines",
      paragraphes: [
        "La couleur de tes urines donne un autre repère, à comparer d’un jour à l’autre, de préférence le matin. Les spécialistes conseillent de la regarder dans un récipient transparent, car l’eau de la cuvette change la teinte.",
      ],
    },
  ],
  retenir: "Pour une séance ordinaire, bois selon ta soif, et de l’eau suffit sous une heure. Pour un effort long ou par forte chaleur, pèse-toi avant et après pour connaître tes pertes, et ne bois pas plus que ce que tu perds.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "NATA · Hydratation des personnes actives, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/" },
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
        { label: "ACSM · Exercice et hydratation, 2007", url: "https://pubmed.ncbi.nlm.nih.gov/17277604/" },
      ],
    },
  ],
};

export default texte;
