/* Flash · La fenêtre anabolique existe-t-elle ?
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Dans les salles de sport, une règle circule depuis des années : après la séance, il faudrait prendre ses protéines dans la demi-heure, sinon le muscle « se ferme ». On appelle ça la fenêtre anabolique, du mot anabolisme, la construction des tissus."],
  sections: [
    {
      titre: "Une fenêtre de plusieurs heures",
      paragraphes: [
        "En 2013, deux chercheurs, Alan Aragon et Brad Schoenfeld, ont repris les études sur le sujet. Leur conclusion : la fenêtre existe, mais elle dure bien plus qu’une demi-heure, et elle dépend de ce que tu as mangé avant la séance. Après une séance de musculation, tes muscles restent plus réceptifs aux protéines pendant au moins 24 heures.",
        "La même année, une analyse de 23 études sur la masse musculaire a montré que l’effet du moment disparaissait presque une fois la quantité totale de protéines de la journée prise en compte.",
      ],
    },
    {
      titre: "Quand le délai compte un peu plus",
      paragraphes: [
        "Si tu t’entraînes le matin à jeun, ton dernier repas remonte à la veille : manger assez vite après la séance a alors plus de sens. Même chose si tu enchaînes deux séances intenses le même jour, pour remplir à nouveau tes réserves de glucides entre les deux.",
      ],
    },
    {
      titre: "Ce qui compte vraiment",
      paragraphes: [
        "Sur des semaines, ce qui fait la différence, c’est la quantité de protéines de ta journée, répartie sur trois ou quatre repas. Le cours « Que manger après une séance » donne les quantités.",
      ],
    },
  ],
  retenir: "La fenêtre anabolique dure plusieurs heures. Ton repas suivant suffit s’il arrive dans les trois ou quatre heures. Le délai compte surtout après une séance à jeun ou avant une deuxième séance le même jour.",
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
        { label: "Aragon et Schoenfeld · Journal of the International Society of Sports Nutrition, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3577439/" },
        { label: "Schoenfeld, Aragon et Krieger · Journal of the International Society of Sports Nutrition, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3879660/" },
      ],
    },
  ],
};

export default texte;
