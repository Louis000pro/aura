/* Flash · Manger au restaurant sans tout calculer
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Un déjeuner avec des collègues, un dîner entre amis : manger dehors fait partie de la vie, et c’est un plaisir. Les plats y sont souvent plus copieux qu’à la maison, ce qui compte surtout si tu y manges plusieurs fois par semaine."],
  sections: [
    {
      titre: "Des portions généreuses",
      paragraphes: [
        "En 2016, des chercheurs américains ont mesuré en laboratoire les calories des plats les plus commandés dans des restaurants de trois villes. Un repas apportait en moyenne 1 200 kcal, et 92 % des repas dépassaient ce dont on a besoin pour un seul repas. Ces chiffres viennent des États-Unis, mais l’idée vaut partout : un plat de restaurant est fait pour régaler.",
      ],
    },
    {
      titre: "Quelques réflexes",
      paragraphes: [
        "Ajoute des légumes quand c’est possible, en entrée ou en accompagnement. Mange tranquillement : manger avec attention aide à s’arrêter quand on n’a plus faim, et rien n’oblige à finir l’assiette. Entre la corbeille de pain, l’apéritif et le dessert, garde ceux qui te font le plus envie. Pour boire, demande une carafe d’eau, et rappelle-toi que l’alcool apporte vite beaucoup de calories.",
      ],
    },
    {
      titre: "Pas besoin de compenser",
      paragraphes: [
        "Un repas copieux ne fait pas grossir en une soirée : ce qui compte, c’est ce que tu manges sur des semaines. Le lendemain, reprends tes repas habituels, sans en sauter.",
      ],
    },
    {
      titre: "Si tu y manges tous les jours",
      paragraphes: [
        "Quand le restaurant ou la cantine font partie de ton quotidien, les mêmes réflexes valent chaque jour : des légumes à chaque repas, une source de protéines, un féculent, et de l’eau. La méthode du flash « Faire une assiette sans rien peser » marche aussi au self.",
      ],
    },
  ],
  retenir: "Au restaurant, profite. Ajoute des légumes quand tu peux, mange tranquillement, arrête-toi quand tu n’as plus faim, et choisis entre le pain, l’apéritif et le dessert ce qui te fait vraiment envie. Le lendemain, reprends tes repas habituels.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Urban et al. · Journal of the Academy of Nutrition and Dietetics, 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5746190/" },
        { label: "Robinson et al. · American Journal of Clinical Nutrition, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3607652/" },
      ],
    },
  ],
};

export default texte;
