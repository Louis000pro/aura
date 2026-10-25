/* Flash · Créatine : ce que disent les études
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["La créatine est une molécule que ton corps fabrique lui-même, dans tes reins et ton foie, à partir de trois acides aminés. Tu en trouves aussi dans la viande. C’est l’un des rares compléments dont l’effet sur la performance est démontré."],
  sections: [
    {
      titre: "Ce qu’elle fait",
      paragraphes: [
        "Dans tes muscles, la créatine sert de réserve d’énergie express, sous forme de phosphocréatine, pour les efforts très courts et très intenses : un sprint, une série lourde, un saut. Prendre de la créatine remplit davantage cette réserve et l’aide à se reconstituer plus vite entre deux efforts. Dans les études, les personnes qui en prennent enchaînent un peu mieux les efforts intenses, et leurs séances de musculation ou de fractionné donnent un peu plus de résultats.",
        "L’Union européenne le reconnaît officiellement : un produit peut annoncer que la créatine « améliore les capacités physiques en cas de séries successives d’exercices très intenses de courte durée », à condition d’en apporter 3 g par jour, et seulement pour les adultes.",
      ],
    },
    {
      titre: "La dose",
      paragraphes: [
        "Les spécialistes conseillent 3 à 5 g par jour, sous forme de créatine monohydrate, la plus étudiée. La phase de charge, 20 g par jour pendant cinq à sept jours, remplit tes muscles plus vite, mais elle n’a rien d’obligatoire : 3 g par jour pendant environ quatre semaines arrivent au même niveau. Mélange ta dose au moment de la prendre, parce que la créatine se dégrade dans un liquide qui attend.",
        "Pour comparer : 170 g de bœuf apportent environ 0,7 g de créatine. Atteindre 3 g par jour avec la seule viande demanderait plus de 700 g de bœuf.",
      ],
    },
    {
      titre: "Les idées reçues",
      paragraphes: [
        "La prise de poids. Au début, la balance peut monter d’un à deux kilos, surtout après une phase de charge. C’est de l’eau, stockée dans tes muscles, et les études ne trouvent pas de prise de graisse. Dans un sport à catégories de poids ou en endurance, ce kilo peut compter.",
        "Les reins. Chez les personnes en bonne santé, les études ne trouvent pas d’effet néfaste sur les reins aux doses conseillées, avec un recul allant jusqu’à cinq ans à 30 g par jour. Si tu as une maladie des reins, du cœur ou du foie, l’Anses déconseille les compléments pour sportifs.",
        "La déshydratation et les crampes. Les études ne confirment pas que la créatine les provoque.",
        "Les cheveux. L’idée vient d’une seule étude, qui a mesuré une hormone liée à la chute des cheveux sans observer de chute. Elle n’a jamais été reproduite.",
      ],
    },
    {
      titre: "Pour qui",
      paragraphes: [
        "La créatine s’adresse aux adultes qui font des efforts intenses et répétés. L’Anses déconseille les compléments pour sportifs aux enfants et aux adolescents, pendant la grossesse et l’allaitement. Pour les adolescents, la question reste discutée : une revue de 2021 juge la créatine sûre à cet âge. Si tu fais de la compétition, choisis un produit contrôlé, avec la norme NF EN 17444 ou un label comme Informed Sport.",
      ],
    },
  ],
  retenir: "La créatine monohydrate aide les efforts courts, intenses et répétés, avec des gains modestes. 3 à 5 g par jour suffisent, sans phase de charge obligatoire. Elle s’adresse aux adultes en bonne santé.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Comité international olympique · Compléments alimentaires et sport de haut niveau, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867441/" },
        { label: "ISSN · Créatine, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/" },
        { label: "Union européenne · Règlement n° 432/2012 sur les allégations de santé", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32012R0432" },
        { label: "Anses · Compléments alimentaires pour sportifs, 2016", url: "https://www.anses.fr/fr/actualite/complements-alimentaires-destines-aux-sportifs-risques-sante-benefices-incertains" },
        { label: "AFLD · Compléments alimentaires", url: "https://www.afld.fr/complements-alimentaires/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Antonio et al. · Journal of the International Society of Sports Nutrition, 2021", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7871530/" },
      ],
    },
  ],
};

export default texte;
