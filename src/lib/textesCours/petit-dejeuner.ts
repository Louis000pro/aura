/* Flash · Faut-il prendre un petit-déjeuner ?
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["On a longtemps répété que le petit-déjeuner est le repas le plus important de la journée. Les essais menés ces dernières années donnent une réponse plus nuancée."],
  sections: [
    {
      titre: "Ce que montrent les essais",
      paragraphes: [
        "En 2014, 309 adultes qui voulaient perdre du poids ont été répartis en trois groupes pendant seize semaines : un groupe à qui on conseillait le petit-déjeuner, un groupe à qui on conseillait de le sauter, et un groupe sans consigne. À la fin, les trois avaient perdu autant de poids.",
        "La même année, une équipe britannique a suivi 33 adultes minces pendant six semaines. Ceux qui prenaient un petit-déjeuner mangeaient 539 kcal de plus par jour, mais bougeaient davantage le matin, et dépensaient ainsi 442 kcal de plus. Leur poids n’a pas changé, leur métabolisme non plus. Leur glycémie, le taux de sucre dans le sang, restait plus stable l’après-midi et le soir.",
        "En 2019, une analyse de 13 essais a trouvé que les personnes qui prenaient un petit-déjeuner mangeaient en tout environ 260 kcal de plus par jour, avec des essais courts et souvent de faible qualité.",
      ],
    },
    {
      titre: "Alors, comment choisir",
      paragraphes: [
        "Si tu as faim le matin, ou si tu t’entraînes tôt pour un effort long, un petit-déjeuner t’aide : ses glucides remplissent la réserve de sucre de ton foie, entamée pendant la nuit. Si tu n’as pas faim avant 10 h, rien ne t’oblige à te forcer.",
      ],
    },
  ],
  retenir: "Prendre ou sauter le petit-déjeuner ne change pas ton poids dans les essais. Ton appétit et l’heure de tes séances peuvent décider.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Dhurandhar et al. · American Journal of Clinical Nutrition, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4095657/" },
        { label: "Betts et al. · American Journal of Clinical Nutrition, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4095658/" },
        { label: "Sievert et al. · BMJ, 2019", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6352874/" },
      ],
    },
  ],
};

export default texte;
