/* Flash · La caféine avant l’effort
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["La caféine fait partie des rares substances dont l’effet sur la performance est bien démontré. Tu en prends peut-être déjà chaque matin, dans ton café ou ton thé. Reste à savoir combien, quand, et dans quels cas t’en passer."],
  sections: [
    {
      titre: "Ce qu’elle fait",
      paragraphes: [
        "La caféine aide dans beaucoup de sports, en endurance comme pour les efforts intenses, chez les sportifs entraînés comme chez les débutants. Elle aide aussi la vigilance et la concentration. Son effet varie beaucoup d’une personne à l’autre : certaines y réagissent fortement, d’autres presque pas.",
      ],
    },
    {
      titre: "La dose",
      paragraphes: [
        "Les recommandations sportives parlent de 3 à 6 mg par kilo de poids, environ une heure avant l’effort. Des doses plus faibles, autour de 2 à 3 mg par kilo, marchent aussi. Les effets indésirables apparaissent autour de 9 mg par kilo.",
        "L’Autorité européenne de sécurité des aliments, l’EFSA, fixe un repère de sécurité utile : une dose unique jusqu’à 200 mg ne pose pas de souci pour un adulte en bonne santé, y compris moins de deux heures avant un exercice intense. Sur la journée, elle place la limite à 400 mg. Pour une personne de 70 kg, 200 mg font environ 3 mg par kilo : la dose basse des recommandations sportives, dans la zone de sécurité de l’EFSA.",
      ],
    },
    {
      titre: "Combien dans ta tasse",
      paragraphes: [
        "D’après les valeurs indicatives de l’EFSA, un expresso apporte environ 80 mg, une tasse de café filtre de 200 ml 90 mg, une tasse de thé noir 50 mg, une canette de cola 40 mg, une canette de boisson énergisante de 250 ml 80 mg, et 50 g de chocolat noir 25 mg. Ces valeurs varient selon la préparation.",
      ],
    },
    {
      titre: "Les précautions",
      paragraphes: [
        "La caféine peut provoquer de l’agitation, des tremblements et des troubles du rythme du cœur, surtout à forte dose et chez une personne qui n’en prend pas d’habitude. Pendant un effort à la chaleur, elle pourrait augmenter le risque de coup de chaleur. Dès 210 mg par jour, certaines personnes deviennent anxieuses. Pour ces raisons, l’Anses déconseille les compléments alimentaires à base de caféine avant et pendant le sport, et chez les personnes sensibles.",
        "Le sommeil compte aussi : selon l’EFSA, 100 mg peuvent déjà gêner la durée et la qualité du sommeil, surtout près du coucher. Si tu t’entraînes le soir, la caféine d’avant séance risque de raccourcir ta nuit.",
        "Pendant la grossesse et l’allaitement, l’EFSA place la limite à 200 mg par jour, et pour les adolescents à 3 mg par kilo et par jour.",
      ],
    },
  ],
  retenir: "La caféine améliore souvent la performance, à partir d’environ 2 à 3 mg par kilo, une heure avant. Reste sous 200 mg en une prise et 400 mg par jour, pense à ton sommeil pour une séance du soir, et laisse de côté les compléments de caféine, que l’Anses déconseille autour du sport.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "ISSN · Caféine et performance, 2021", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/" },
        { label: "Comité international olympique · Compléments alimentaires et sport de haut niveau, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867441/" },
        { label: "EFSA · Caféine", url: "https://www.efsa.europa.eu/en/topics/topic/caffeine" },
        { label: "Anses · Compléments alimentaires pour sportifs, 2016", url: "https://www.anses.fr/fr/actualite/complements-alimentaires-destines-aux-sportifs-risques-sante-benefices-incertains" },
        { label: "Anses · Avis sur les compléments pour sportifs, 2016", url: "https://www.anses.fr/fr/system/files/NUT2014SA0008Ra.pdf" },
      ],
    },
  ],
};

export default texte;
