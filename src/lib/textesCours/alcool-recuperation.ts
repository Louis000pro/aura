/* Flash · L’alcool et la récupération
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["La troisième mi-temps, la bière après le foot, le verre de vin pour fêter une course : l’alcool accompagne souvent le sport. Il pèse pourtant sur la récupération, et davantage à mesure que les verres s’enchaînent."],
  sections: [
    {
      titre: "Sur tes muscles",
      paragraphes: [
        "En 2014, des chercheurs australiens ont fait boire à huit sportifs l’équivalent d’une douzaine de verres après une séance de musculation et de vélo. Même quand ils prenaient 25 g de protéines en même temps, leurs muscles fabriquaient moins de protéines dans les heures qui suivaient : environ 24 % de moins avec les protéines, et 37 % de moins sans. C’est une grosse quantité d’alcool, mais elle correspond à certaines soirées d’équipe.",
      ],
    },
    {
      titre: "Sur ton sommeil et ton hydratation",
      paragraphes: [
        "L’alcool aide à s’endormir, puis dégrade la seconde partie de la nuit, plus légère et plus agitée. Or c’est en dormant que ton corps récupère. Il fait aussi uriner davantage, surtout à forte dose, ce qui complique la réhydratation après un effort où tu as beaucoup transpiré. Et il apporte 7 kcal par gramme, sans rien qui serve à réparer tes muscles.",
      ],
    },
    {
      titre: "Les repères officiels",
      paragraphes: [
        "En France, les repères de consommation conseillent, si tu bois de l’alcool, de ne pas dépasser 10 verres standard par semaine, ni 2 par jour, et de garder des jours sans alcool. Un verre standard, tel qu’on le sert dans un bar, contient environ 10 g d’alcool pur, que ce soit une bière, un verre de vin ou un whisky. Pour chaque occasion, Santé publique France conseille de boire lentement, en mangeant, et en alternant avec de l’eau.",
        "L’OMS rappelle aussi qu’aucune quantité d’alcool n’est sans risque pour la santé : l’alcool favorise au moins sept cancers, et environ la moitié des cancers liés à l’alcool en Europe touchent des personnes qui boivent peu ou modérément.",
      ],
    },
    {
      titre: "Après une séance",
      paragraphes: [
        "Si un verre fait partie de la fête, mange d’abord et bois de l’eau : un repas avec des protéines et des glucides, puis le verre. Les bières et les vins sans alcool permettent aussi de garder le rituel.",
      ],
    },
  ],
  retenir: "L’alcool freine la réparation de tes muscles, dégrade ton sommeil et complique ta réhydratation. Après une séance, mange et bois de l’eau d’abord. Et si tu bois, reste sous 10 verres standard par semaine et 2 par jour, avec des jours sans alcool.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Assurance maladie · Alcool, définition et repères de consommation", url: "https://www.ameli.fr/assure/sante/themes/alcool-sante/definition-reperes-consommation" },
        { label: "OMS Europe · Aucun niveau d’alcool sans risque pour la santé, 2023", url: "https://www.who.int/europe/news/item/04-01-2023-no-level-of-alcohol-consumption-is-safe-for-our-health" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Parr et al. · PLoS One, 2014", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3922864/" },
      ],
    },
  ],
};

export default texte;
