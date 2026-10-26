/* Cours · Que manger après une séance
   Lot 0, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-0.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Tu sors de ta séance, et la même question revient : faut-il manger tout de suite, et quoi ? Rien ne presse à la minute près. Après une séance de musculation, tes muscles restent plus réceptifs aux protéines pendant au moins 24 heures, même si cet effet diminue avec le temps. Ton repas suivant fait très bien l’affaire, s’il arrive dans les trois ou quatre heures et s’il contient ce qu’il faut."],
  sections: [
    {
      titre: "Les protéines d’abord",
      paragraphes: [
        "Une séance de musculation pousse tes muscles à fabriquer de nouvelles protéines. Pour ça, ils ont besoin d’acides aminés, les petites briques qui composent les protéines, et ils les trouvent dans ce que tu manges.",
        "Les spécialistes de la nutrition du sport conseillent environ 0,25 à 0,3 g de protéines par kilo de poids dans le repas ou la collation qui suit la séance. Pour une personne de 70 kg, ça donne 18 à 21 g. La Société internationale de nutrition du sport (ISSN) parle plutôt de 20 à 40 g selon la personne. Ensuite, les recommandations conseillent d’en reprendre toutes les trois à cinq heures, sur trois ou quatre repas dans la journée.",
        "Un acide aminé compte particulièrement : la leucine. Elle joue un rôle de déclencheur dans la fabrication du muscle, et l’ISSN conseille d’en avoir 0,7 à 3 g par prise. Les protéines végétales en contiennent généralement moins que les protéines animales.",
        "Un shaker de protéines est une façon pratique d’atteindre ta portion quand ton prochain repas est loin. Il n’a rien d’obligatoire.",
      ],
    },
    {
      titre: "Les glucides, selon ta prochaine séance",
      paragraphes: [
        "Pendant l’effort, tes muscles puisent dans le glycogène, leur réserve de sucre. Après la séance, ton corps la reconstitue à un rythme d’environ 5 % par heure. Si tu t’entraînes une fois par jour, des repas normaux, avec des féculents, du pain ou des fruits, suffisent à la remplir avant la séance suivante.",
        "Les choses changent si tu enchaînes une deuxième séance intense moins de huit heures après la première. Les recommandations conseillent alors environ 1 à 1,2 g de glucides par kilo et par heure, dès la fin de la première séance et pendant les quatre premières heures.",
      ],
    },
    {
      titre: "Boire, surtout quand tu as beaucoup transpiré",
      paragraphes: ["Après une séance ordinaire, boire selon ta soif suffit dans la plupart des cas. Quand une séance t’a fait beaucoup transpirer, une astuce aide à savoir combien boire : te peser avant et après. Les recommandations conseillent de boire 1,25 à 1,5 l par kilo perdu, parce qu’une partie de l’eau bue repart dans les urines. Le sel de ton repas aide ton corps à garder cette eau."],
    },
    {
      titre: "Sans viande, ça marche aussi",
      paragraphes: ["À quantité égale, les protéines végétales font un peu moins pour le muscle : elles se digèrent moins complètement et contiennent moins de leucine. Les chercheurs proposent deux pistes, encore à l’étude : en manger un peu plus, ou mélanger les sources, par exemple des lentilles avec du riz. En 2021, un essai a comparé de jeunes hommes végans et omnivores qui mangeaient tous 1,6 g de protéines par kilo et par jour : après douze semaines de musculation, les deux groupes avaient gagné autant de muscle et de force."],
    },
  ],
  exemple: ["Tu pèses 65 kg et tu t’entraînes à 18 h. Ta portion de protéines après la séance tourne autour de 16 à 20 g. Si tu dînes vers 20 h, ton dîner fait le travail : 100 g de blanc de poulet cuit en apportent déjà environ 31 g, avec du riz et des légumes à côté. Si tu ne dînes qu’à 22 h, prends en rentrant 200 g de fromage blanc, qui apportent environ 15 g de protéines, avec une banane."],
  doute: [
    "Combien de protéines un seul repas peut-il utiliser ? En 2016, les recommandations estimaient qu’au-delà de 40 g, l’effet n’augmentait plus. En 2023, une étude a donné 25 g ou 100 g de protéines après une séance : avec 100 g, la réponse du muscle était plus forte et durait encore douze heures plus tard. On ne sait pas encore ce que ça change sur des mois d’entraînement.",
    "L’importance du moment exact reste aussi discutée. Une analyse de 2013 ne trouvait plus d’effet du moment une fois la quantité totale de protéines prise en compte, mais seulement trois des études qu’elle rassemblait comparaient des quantités égales.",
  ],
  retenir: "Ton prochain repas suffit s’il arrive dans les trois ou quatre heures après la séance : mets-y environ 0,3 g de protéines par kilo de ton poids, des glucides et de l’eau. Les glucides deviennent urgents seulement si une autre séance intense arrive dans les huit heures.",
  essai: "Calcule une fois ta portion : ton poids multiplié par 0,3. Puis regarde ce que tu manges d’habitude après tes séances, et ajoute une source de protéines s’il en manque : des œufs, du fromage blanc, du poisson, du tofu ou des lentilles.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
        { label: "ISSN · Protéines et exercice, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" },
        { label: "NATA · Hydratation des personnes actives, 2017", url: "https://doi.org/10.4085/1062-6050-52.9.02" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Aragon et Schoenfeld · JISSN, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3577439/" },
        { label: "Schoenfeld, Aragon et Krieger · JISSN, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3879660/" },
        { label: "Trommelen et al. · Cell Reports Medicine, 2023", url: "https://doi.org/10.1016/j.xcrm.2023.101324" },
        { label: "van Vliet, Burd et van Loon · Journal of Nutrition, 2015", url: "https://doi.org/10.3945/jn.114.204305" },
        { label: "Hevia-Larraín et al. · Sports Medicine, 2021", url: "https://doi.org/10.1007/s40279-021-01434-9" },
      ],
    },
    {
      groupe: "Tables de composition",
      liens: [
        { label: "USDA · FoodData Central (blanc de poulet rôti)", url: "https://fdc.nal.usda.gov/food-details/171477/nutrients" },
        { label: "Anses · Table Ciqual 2013 (fromage blanc)", url: "https://informationsnutritionnelles.fr/fromage-blanc-nature-ou-aux-fruits" },
      ],
    },
  ],
};

export default texte;
