/* Flash · Les fringales du soir
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["21 h, tu as dîné, et pourtant le placard t’appelle. Les fringales du soir sont très courantes. Elles ont souvent une cause dans la journée qui précède."],
  sections: [
    {
      titre: "Une journée trop légère",
      paragraphes: [
        "Un petit-déjeuner sauté, un déjeuner avalé en dix minutes, rien jusqu’au dîner : le soir, ton corps réclame ce qu’il n’a pas eu. Dans un essai de 2022, des volontaires ont mangé les mêmes calories, soit avec un gros petit-déjeuner, soit avec un gros dîner. Avec le gros petit-déjeuner, ils avaient moins faim le reste de la journée. Leur poids, lui, a évolué pareil.",
      ],
    },
    {
      titre: "La fatigue et l’habitude",
      paragraphes: [
        "Quand tu dors moins, tu manges en moyenne davantage le lendemain, souvent du sucré et du gras (voir « Le sommeil et l’appétit »). L’habitude joue aussi : un écran, un canapé et un paquet ouvert finissent par aller ensemble, et le soir venu, le paquet appelle même sans faim.",
      ],
    },
    {
      titre: "Ce qui aide",
      paragraphes: [
        "Un vrai goûter, avec des protéines et des fibres, comme un yaourt et un fruit ou une tartine de pain complet avec du fromage, raccourcit l’attente jusqu’au dîner. Un dîner complet, avec une source de protéines, des légumes et un féculent, cale mieux qu’une salade seule.",
        "Si tu aimes finir sur une note sucrée, prévois-la : un dessert pris à table et savouré fait partie du repas. Et range les tentations hors de vue, dans un placard plutôt que sur le plan de travail.",
      ],
    },
    {
      titre: "Avant de grignoter",
      paragraphes: [
        "Pose-toi les deux questions du flash « Faim ou envie : comment faire la différence » : depuis quand as-tu mangé, et un autre aliment te tenterait-il ? Si c’est la faim, mange quelque chose de simple. Si c’est l’envie, choisis ce qui te fait plaisir et savoure-le, assis, sans écran.",
        "Si tu manges souvent de grandes quantités le soir sans pouvoir t’arrêter, ou si tu te réveilles la nuit pour manger, parles-en à un médecin : ces situations se soignent.",
      ],
    },
  ],
  retenir: "Les fringales du soir viennent souvent d’une journée trop légère, de la fatigue ou d’une habitude. Mange assez le matin et le midi, prends un vrai goûter, fais un dîner complet, et si l’envie de sucré est là, prévois un dessert à savourer à table.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Ruddick-Collins et al. · Cell Metabolism, 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9605877/" },
        { label: "Al Khatib et al. · European Journal of Clinical Nutrition, 2017", url: "https://doi.org/10.1038/ejcn.2016.201" },
      ],
    },
  ],
};

export default texte;
