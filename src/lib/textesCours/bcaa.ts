/* Flash · Les BCAA
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Les BCAA, pour « branched-chain amino acids », sont trois acides aminés à chaîne ramifiée : la leucine, l’isoleucine et la valine. Les fabricants les vendent en poudre ou en gélules, à boire pendant ou après la séance."],
  sections: [
    {
      titre: "Le raisonnement",
      paragraphes: [
        "La leucine déclenche la fabrication de protéines dans tes muscles, d’où l’idée d’en prendre en complément. Mais pour construire une protéine, le muscle a besoin des neuf acides aminés indispensables. Avec trois d’entre eux seulement, la construction s’arrête vite, faute des six autres.",
      ],
    },
    {
      titre: "Ce que mesurent les études",
      paragraphes: [
        "En 2017, une étude a donné 5,6 g de BCAA à des hommes juste après une séance de musculation. La fabrication de protéines dans leurs muscles augmentait de 22 % par rapport à un placebo : un effet réel, mais plus faible que ce qu’on obtient avec des protéines complètes.",
        "La même année, le chercheur Robert Wolfe a repris l’ensemble des études. Sa conclusion : l’idée que les BCAA seuls suffisent à construire du muscle chez l’humain n’est pas justifiée.",
      ],
    },
    {
      titre: "En pratique",
      paragraphes: [
        "Si tu manges assez de protéines dans ta journée, les BCAA n’ajoutent rien. Une portion de whey, un fromage blanc, ou un repas avec de la viande, du poisson, des œufs ou du tofu apportent les BCAA et tous les autres acides aminés, souvent pour moins cher.",
      ],
    },
  ],
  retenir: "Les BCAA ne contiennent que trois des neuf acides aminés indispensables. Seuls, ils stimulent peu la construction du muscle. Si tu manges assez de protéines, ils n’ajoutent rien.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "ISSN · Protéines et exercice, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Wolfe · Journal of the International Society of Sports Nutrition, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5568273/" },
        { label: "Jackman et al. · Frontiers in Physiology, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5461297/" },
      ],
    },
  ],
};

export default texte;
