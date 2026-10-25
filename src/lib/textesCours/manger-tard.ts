/* Flash · Manger tard fait-il grossir ?
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["« Après 20 h, tout se transforme en graisse. » La phrase circule depuis des années. Deux essais récents, très contrôlés, aident à démêler le vrai du faux."],
  sections: [
    {
      titre: "À calories égales",
      paragraphes: [
        "En 2022, des chercheurs ont fait suivre à 30 personnes deux régimes de quatre semaines, aux mêmes calories. Dans le premier, le petit-déjeuner était le plus gros repas de la journée. Dans le second, c’était le dîner. Résultat : même perte de poids, même dépense d’énergie. Seule différence notable, les participants avaient moins faim dans la journée avec le gros petit-déjeuner.",
      ],
    },
    {
      titre: "Ce que l’heure change peut-être",
      paragraphes: [
        "La même année, une autre équipe a fait vivre 16 personnes en laboratoire, avec exactement les mêmes repas, servis soit aux heures habituelles, soit environ quatre heures plus tard. En mangeant tard, elles avaient plus faim, leur leptine, une hormone qui freine l’appétit, baissait de 16 % dans la journée, et elles dépensaient 59 kcal de moins par jour. Leur tissu adipeux s’orientait vers le stockage. Ces mesures portent sur quelques jours et décrivent des mécanismes : personne n’a mesuré de prise de poids dans cet essai.",
      ],
    },
  ],
  retenir: "À calories égales, l’heure du dîner change peu le poids dans les essais. Manger tard pourrait augmenter ta faim, et on ne sait pas encore si ça compte sur des mois.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Ruddick-Collins et al. · Cell Metabolism, 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9605877/" },
        { label: "Vujović et al. · Cell Metabolism, 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10184753/" },
      ],
    },
  ],
};

export default texte;
