/* Flash · Le sommeil et l’appétit
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Après une nuit courte, la journée se passe souvent à grignoter. Ce n’est pas qu’une impression : le sommeil règle une partie de ton appétit, et les chercheurs l’ont mesuré."],
  sections: [
    {
      titre: "Les hormones de la faim",
      paragraphes: [
        "En 2004, une équipe de l’université de Chicago a limité le sommeil de douze jeunes hommes à quatre heures par nuit, pendant deux nuits. Leur leptine, l’hormone qui signale que les réserves sont pleines, baissait de 18 %. Leur ghréline, celle qui donne faim, montait de 28 %. Ils avaient plus faim, et surtout envie d’aliments riches en calories et en glucides.",
      ],
    },
    {
      titre: "Ce qu’on mange en plus",
      paragraphes: [
        "En 2017, une analyse de onze études a montré que les personnes privées d’une partie de leur sommeil mangeaient en moyenne 385 kcal de plus le lendemain, sans dépenser davantage.",
      ],
    },
    {
      titre: "Dormir plus fait manger moins",
      paragraphes: [
        "La bonne nouvelle vient d’un essai de 2022. Quatre-vingts jeunes adultes en surpoids, qui dormaient moins de six heures et demie par nuit, ont reçu des conseils pour allonger leur sommeil. Ils ont dormi environ 1,2 heure de plus par nuit, chez eux, sans aucune consigne sur leur alimentation ou leur sport, et ont spontanément mangé moins, environ 270 kcal de moins par jour.",
      ],
    },
    {
      titre: "Mieux dormir",
      paragraphes: [
        "La plupart des adultes ont besoin d’au moins sept heures de sommeil. Quelques gestes aident : des horaires réguliers, même le week-end, la lumière du jour le matin, les écrans éteints un moment avant le coucher.",
        "La caféine compte : dans une étude de 2013, une forte dose prise six heures avant le coucher réduisait encore le sommeil de plus d’une heure. L’alcool fait s’endormir plus vite, mais dégrade la seconde partie de la nuit. Et un dîner très copieux juste avant de te coucher peut gêner ton sommeil.",
      ],
    },
  ],
  retenir: "Moins dormir fait monter l’hormone de la faim et pousse à manger plus, surtout du sucré et du gras. Dormir plus fait manger moins : vise au moins sept heures, avec des horaires réguliers, et arrête la caféine six heures avant de te coucher.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Spiegel et al. · Annals of Internal Medicine, 2004", url: "https://pubmed.ncbi.nlm.nih.gov/15583226/" },
        { label: "Al Khatib et al. · European Journal of Clinical Nutrition, 2017", url: "https://doi.org/10.1038/ejcn.2016.201" },
        { label: "Tasali et al. · JAMA Internal Medicine, 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8822469/" },
      ],
    },
  ],
};

export default texte;
