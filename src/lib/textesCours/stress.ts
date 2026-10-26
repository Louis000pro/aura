/* Flash · Manger sous le stress
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Une semaine chargée, un conflit, une mauvaise nouvelle : certaines personnes n’arrivent plus à avaler quoi que ce soit, d’autres se surprennent à finir le paquet de biscuits. Les deux réactions sont fréquentes, et elles n’ont rien d’anormal."],
  sections: [
    {
      titre: "Deux réactions opposées",
      paragraphes: [
        "Une revue de 2007 décrit ces deux façons de réagir : le stress fait manger moins certaines personnes, et plus d’autres. Un stress qui dure fait plus souvent manger davantage, et pourrait favoriser une prise de poids avec le temps.",
      ],
    },
    {
      titre: "Ce qui se passe dans ton corps",
      paragraphes: [
        "Le stress libère une hormone, le cortisol. Quand il dure, le cortisol semble rendre plus attirants les aliments très appétissants, ceux qui associent le gras et le sucre. Manger ces aliments apaise un peu le stress, ce qui explique qu’on y revienne. Les régimes stricts ajoutent une couche : se priver est un stress en soi, et les deux se renforcent.",
      ],
    },
    {
      titre: "Quand ça arrive",
      paragraphes: [
        "Manger pour se réconforter arrive à tout le monde, et un carré de chocolat savouré peut faire du bien. Quelques gestes aident à garder la main.",
        "Garde des repas réguliers : sauter le déjeuner sous la pression prépare les grosses faims du soir. Quand l’envie arrive, prends une minute pour te demander ce qui se passe : faim, fatigue, tension ? Si c’est la tension, une marche de dix minutes, un message à quelqu’un, quelques respirations lentes ou une douche peuvent aussi la faire redescendre. Si tu manges, fais-le assis, dans une assiette, et savoure. Et dors : la fatigue rend le stress et les envies plus forts.",
      ],
    },
    {
      titre: "Quand en parler",
      paragraphes: [
        "Si le stress dure, qu’il t’empêche de dormir ou de manger, ou si tu as l’impression de perdre le contrôle face à la nourriture, parles-en à ton médecin. Des professionnels savent aider sur ces deux sujets.",
      ],
    },
  ],
  retenir: "Le stress fait manger moins certaines personnes et plus d’autres, souvent du gras et du sucré quand il dure. Des repas réguliers, une pause pour comprendre ce qui se passe, et d’autres façons de faire redescendre la tension aident à garder la main.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Torres et Nowson · Nutrition, 2007", url: "https://pubmed.ncbi.nlm.nih.gov/17869482/" },
        { label: "Adam et Epel · Physiology & Behavior, 2007", url: "https://pubmed.ncbi.nlm.nih.gov/17543357/" },
      ],
    },
  ],
};

export default texte;
