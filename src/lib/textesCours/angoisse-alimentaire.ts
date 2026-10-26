/* Flash · Quand manger devient une source d’angoisse
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Faire attention à ce qu’on mange peut être utile. Chez certaines personnes, l’attention devient pourtant une inquiétude qui ne lâche plus : chaque repas se calcule, et manger devient une source de tension plutôt que de plaisir."],
  sections: [
    {
      titre: "Les signes qui doivent alerter",
      paragraphes: [
        "Quelques signaux méritent qu’on s’y arrête, surtout quand ils durent. La nourriture, ton poids ou ton corps occupent une grande partie de tes pensées. Tu suis des règles de plus en plus strictes, et les enfreindre te met très mal à l’aise. Tu évites les repas avec les autres. Tu sautes des repas, tu fais beaucoup de sport ou tu prends des laxatifs pour compenser ce que tu as mangé. Tu manges parfois de très grandes quantités en ayant l’impression de ne pas pouvoir t’arrêter. Tu te pèses plusieurs fois par jour, et le chiffre décide de ton humeur.",
      ],
    },
    {
      titre: "Les troubles du comportement alimentaire",
      paragraphes: [
        "Ces signes peuvent annoncer un trouble du comportement alimentaire, comme l’anorexie, la boulimie ou l’hyperphagie boulimique, qui fait manger de grandes quantités sans pouvoir s’arrêter. Ce sont des maladies, et elles se soignent. Selon le NHS, elles peuvent toucher n’importe qui, surtout les adolescents et les jeunes adultes, et la plupart des personnes en guérissent avec un traitement.",
        "D’autres situations font souffrir sans porter de nom officiel, comme l’obsession de manger parfaitement sain : bannir des familles entières d’aliments, passer des heures à vérifier les étiquettes, vivre un repas imprévu comme une catastrophe. Elles méritent aussi qu’on en parle.",
      ],
    },
    {
      titre: "Dans une application comme Vaiiya",
      paragraphes: [
        "Noter ses repas ou se peser aide beaucoup de personnes, et en inquiète d’autres. Si noter ce que tu manges ou monter sur la balance te stresse, tu as le droit d’arrêter pendant un temps.",
      ],
    },
    {
      titre: "Où trouver de l’aide",
      paragraphes: [
        "Parles-en à ton médecin traitant, qui peut t’orienter vers une équipe spécialisée. La ligne Anorexie Boulimie Info Écoute répond au 0810 037 037, quatre jours par semaine de 16 h à 18 h, pour 0,06 € la minute en plus du prix d’un appel local.",
        "Si c’est pour quelqu’un de ton entourage, dis-lui que tu t’inquiètes, sans juger, encourage cette personne à voir un médecin, et propose de l’accompagner.",
      ],
    },
  ],
  retenir: "Si la nourriture, ton poids ou ton corps prennent beaucoup de place dans tes pensées, si tu compenses ce que tu manges ou si tu perds le contrôle face à la nourriture, parles-en à ton médecin. Ces troubles se soignent, et la plupart des personnes en guérissent.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "NHS · Eating disorders", url: "https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/behaviours/eating-disorders/overview/" },
      ],
    },
    {
      groupe: "Pour trouver de l’aide",
      liens: [
        { label: "FFAB · Anorexie Boulimie Info Écoute", url: "https://www.ffab.fr/trouver-de-l-aide/permanence-telephonique" },
      ],
    },
  ],
};

export default texte;
