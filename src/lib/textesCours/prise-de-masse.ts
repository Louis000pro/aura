/* Cours · Prise de masse : combien manger, et quoi
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Prendre du muscle demande trois choses : un entraînement de musculation qui progresse, assez de protéines, et un peu plus d’énergie que ce que tu dépenses. La troisième fait le plus débat. C’est souvent là qu’une prise de masse se transforme en prise de gras."],
  sections: [
    {
      titre: "Le muscle se construit lentement",
      paragraphes: [
        "Le muscle ne pousse pas en quelques semaines. En 2019, une revue a rassemblé les recommandations pour les pratiquants de musculation pendant leurs phases de prise de masse. Pour une personne débutante ou intermédiaire, elle conseille de viser une prise de poids de 0,25 à 0,5 % de son poids par semaine, soit 175 à 350 g pour une personne de 70 kg. Les personnes entraînées depuis des années progressent plus lentement, et visent plus bas.",
        "Ce rythme paraît modeste. Il laisse au muscle le temps de se construire, sans que le gras prenne toute la place.",
      ],
    },
    {
      titre: "Combien manger en plus",
      paragraphes: [
        "La même revue propose de manger environ 10 à 20 % de plus que tes besoins. Pour une personne dont le poids est stable avec 2 500 kcal par jour, ça fait 250 à 500 kcal de plus : une grosse collation, ou des repas un peu plus copieux.",
        "Un surplus beaucoup plus grand ne construit pas davantage de muscle, parce que le muscle se construit à son rythme : l’énergie en trop part surtout en gras. Manger de tout en grande quantité pour « prendre de la masse » ajoute donc surtout du gras.",
        "Plutôt que de compter chaque calorie, suis ta balance. La moyenne de tes pesées sur une semaine doit monter doucement (le cours « Pourquoi la balance bouge chaque jour » explique comment la lire). Si elle stagne trois semaines de suite, ajoute un peu. Si elle monte nettement plus vite que prévu et que ton tour de taille suit, réduis un peu.",
      ],
    },
    {
      titre: "Les protéines",
      paragraphes: [
        "Les analyses d’essais montrent qu’en moyenne, le gain de muscle plafonne autour de 1,6 g de protéines par kilo de poids et par jour. Certaines personnes profitent d’un peu plus, et la revue de 2019 donne une fourchette de 1,6 à 2,2 g par kilo.",
        "Répartis-les sur trois à six repas, avec environ 0,4 g de protéines par kilo à chaque fois, dont un repas ou une collation dans les deux heures qui entourent ta séance. Viande, poisson, œufs, produits laitiers, tofu, légumes secs : toutes les sources comptent.",
      ],
    },
    {
      titre: "Les glucides et les graisses",
      paragraphes: [
        "Les glucides alimentent tes séances et t’aident à t’entraîner fort. La revue en conseille au moins 3 à 5 g par kilo et par jour. Les graisses complètent, à raison de 0,5 à 1,5 g par kilo, en privilégiant les huiles, les fruits à coque et le poisson gras.",
      ],
    },
    {
      titre: "Quand manger plus devient difficile",
      paragraphes: [
        "Pour beaucoup de personnes, la vraie difficulté est l’appétit : manger davantage cale vite. Quelques astuces aident.",
        "Ajoute un repas ou une collation plutôt que d’agrandir les trois repas habituels. Bois une partie de tes calories : un verre de lait, un smoothie, ou un shaker maison à la banane, aux flocons d’avoine et au beurre de cacahuète passent plus facilement qu’une assiette de plus. Choisis des aliments denses en énergie : fruits à coque, beurre de cacahuète, fruits secs, un filet d’huile d’olive sur les plats, du fromage sur le pain complet. Mange à heures fixes, sans attendre d’avoir faim.",
        "Garde quand même tes légumes. Mets-les plutôt en accompagnement que comme plat principal, pour qu’ils ne prennent pas toute la place dans ton estomac.",
      ],
    },
    {
      titre: "Ce qui ne sert à rien",
      paragraphes: [
        "Les gainers vendus en pot ne font rien de plus qu’un repas ou qu’un shaker maison : ce sont surtout des glucides et des protéines en poudre, souvent plus chers.",
        "Parmi les compléments, la créatine est celle qui a les preuves les plus solides pour la force et la masse musculaire, et un cours Vaiiya+ lui est consacré. Pour les autres, les bénéfices restent modestes ou incertains.",
      ],
    },
    {
      titre: "Le reste compte autant",
      paragraphes: [
        "Aucune quantité de nourriture ne remplace l’entraînement. Ce sont des séances régulières, avec des charges ou des répétitions qui augmentent petit à petit, qui donnent au muscle une raison de grossir. Le sommeil compte aussi : c’est pendant la récupération que le muscle se construit.",
        "Mesure tes progrès autrement qu’avec la balance : les charges que tu soulèves, ton tour de bras, l’ajustement de tes vêtements. Sur plusieurs mois, c’est la combinaison de ces signes qui dit si ta prise de masse se passe bien.",
      ],
    },
  ],
  exemple: ["Tu pèses 65 kg et ton poids est stable autour de 2 400 kcal par jour. Vise environ 2 650 à 2 900 kcal, soit 10 à 20 % de plus, et 105 à 145 g de protéines par jour, soit 1,6 à 2,2 g par kilo. En quatre repas, ça fait environ 26 à 36 g de protéines à chaque fois. Côté balance, la moyenne de tes pesées devrait monter de 160 à 325 g par semaine."],
  retenir: "Pour prendre du muscle : un entraînement qui progresse, 1,6 à 2,2 g de protéines par kilo et par jour, et 10 à 20 % de calories en plus. Vise une prise de poids lente, autour de 0,25 à 0,5 % de ton poids par semaine, et ajuste selon la moyenne de tes pesées.",
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
        { label: "Iraki et al. · Sports, 2019", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6680710/" },
        { label: "Morton et al. · British Journal of Sports Medicine, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/" },
      ],
    },
  ],
};

export default texte;
