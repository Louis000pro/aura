/* Flash · S’entraîner à jeun
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Courir avant le petit-déjeuner, faire sa séance de musculation le ventre vide : certaines personnes adorent, d’autres se sentent sans énergie. On parle d’entraînement à jeun quand ton dernier repas remonte à huit à douze heures, le plus souvent le matin au réveil."],
  sections: [
    {
      titre: "Pour perdre du gras",
      paragraphes: [
        "À jeun, ton corps puise davantage dans ses graisses pendant la séance. L’idée semble logique : en brûler plus pendant l’effort ferait perdre plus de gras. Ce n’est pas ce que montrent les essais.",
        "En 2014, une étude a suivi 20 jeunes femmes qui mangeaient moins de calories et faisaient les mêmes séances de cardio, les unes à jeun, les autres après une collation. Au bout de quatre semaines, les deux groupes avaient perdu autant de poids et de gras. La quantité de gras que tu perds dépend surtout de ce que tu manges et dépenses sur des semaines.",
      ],
    },
    {
      titre: "Pour la performance",
      paragraphes: [
        "Pour un effort d’endurance de plus d’une heure, manger avant aide. En 2018, une analyse de 46 études a comparé des efforts faits après un repas et à jeun : le repas améliorait les efforts d’endurance prolongés, et changeait peu les efforts plus courts.",
        "Pour une séance de musculation ou un footing d’une demi-heure, c’est surtout une question de confort. Certaines personnes digèrent mal avant de bouger, d’autres manquent d’énergie le ventre vide.",
      ],
    },
    {
      titre: "Pour le muscle",
      paragraphes: [
        "Si tu fais ta musculation à jeun, ton dernier apport de protéines remonte à la veille. Les recommandations de nutrition du sport conseillent alors d’en prendre assez vite après la séance, par exemple avec des œufs, du fromage blanc ou du skyr au petit-déjeuner.",
      ],
    },
    {
      titre: "Les précautions",
      paragraphes: [
        "Si tu as un diabète traité par insuline ou par certains comprimés, l’effort à jeun peut faire chuter ta glycémie : parles-en à ton médecin avant. Des vertiges, une vue qui se trouble ou des mains qui tremblent sont des signaux pour t’arrêter et manger quelque chose de sucré. Et si sauter le petit-déjeuner devient une façon de compenser ce que tu as mangé la veille, ça vaut la peine d’en parler.",
      ],
    },
  ],
  doute: ["Certains sportifs d’endurance de haut niveau font volontairement quelques séances avec peu de glucides, pour pousser leurs muscles à mieux utiliser les graisses. Dans une étude de 2017 sur des marcheurs de haut niveau, alterner ainsi des séances avec et sans glucides n’a pas fait mieux, en course, qu’une alimentation riche en glucides à chaque séance. On ne sait pas encore si ces séances apportent quelque chose aux sportifs de loisir."],
  retenir: "S’entraîner à jeun ne fait pas perdre plus de gras sur la durée. Pour un effort de plus d’une heure, mange avant. Pour une séance courte, fais selon ton confort, et prends des protéines rapidement après une séance de musculation à jeun.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "ISSN · Le moment des apports, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Schoenfeld et al. · Journal of the International Society of Sports Nutrition, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4242477/" },
        { label: "Aird, Davies et Carson · Scandinavian Journal of Medicine & Science in Sports, 2018", url: "https://pubmed.ncbi.nlm.nih.gov/29315892/" },
        { label: "Burke et al. · Journal of Physiology, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5407976/" },
      ],
    },
  ],
};

export default texte;
