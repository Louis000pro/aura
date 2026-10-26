/* Flash · Manger les jours de repos
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Pas de séance aujourd’hui : faut-il manger moins ? Un peu, parfois. Même sans séance, ton corps travaille : il répare et renforce ce que l’entraînement de la veille a sollicité."],
  sections: [
    {
      titre: "Tes muscles continuent de se construire",
      paragraphes: [
        "Après une séance de musculation, tes muscles fabriquent davantage de protéines pendant au moins 24 heures. Le lendemain d’une séance compte donc aussi : garde la même quantité de protéines que les jours d’entraînement, répartie sur trois ou quatre repas.",
      ],
    },
    {
      titre: "Les glucides suivent l’activité",
      paragraphes: [
        "Les recommandations de nutrition du sport ajustent les glucides à l’entraînement de chaque jour. Un jour sans séance, tu en as besoin d’un peu moins : une portion de féculents un peu plus petite, ou un goûter plus léger, suffit à suivre ton activité. Si une longue séance arrive le lendemain, garde des féculents au dîner pour remplir tes réserves.",
      ],
    },
    {
      titre: "Écoute ta faim",
      paragraphes: [
        "Le lendemain d’une grosse séance, la faim est parfois plus forte. Manger à ta faim un jour de repos aide ton corps à récupérer, et prépare la séance suivante.",
      ],
    },
  ],
  retenir: "Un jour de repos, garde tes protéines réparties sur la journée et ajuste un peu les glucides à ton activité. Si une longue séance arrive le lendemain, prévois des féculents au dîner.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "ISSN · Protéines et exercice, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" },
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
      ],
    },
  ],
};

export default texte;
