/* Flash · Un métabolisme lent, ça existe ?
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["« J’ai un métabolisme lent » : la phrase revient souvent quand le poids résiste. Les chercheurs savent aujourd’hui mesurer précisément ce que dépense un corps, et leurs résultats répondent en partie à la question."],
  sections: [
    {
      titre: "Ce qui fixe ta dépense",
      paragraphes: [
        "Ton métabolisme, c’est l’énergie que ton corps dépense. Il dépend d’abord de ta taille et de ta masse maigre, c’est-à-dire de tout ce qui n’est pas de la graisse, muscles et organes compris. Un corps plus grand et plus musclé dépense davantage, même au repos.",
      ],
    },
    {
      titre: "L’âge compte moins qu’on le croit",
      paragraphes: [
        "En 2021, une étude publiée dans Science a rassemblé des mesures de dépense faites sur des milliers de personnes, de 8 jours à 95 ans, avec une méthode de référence, l’eau doublement marquée. Une fois la taille du corps prise en compte, la dépense restait stable de 20 à 60 ans, grossesse comprise, et ne baissait qu’ensuite.",
      ],
    },
    {
      titre: "L’activité de tous les jours",
      paragraphes: [
        "Ce qui varie beaucoup d’une personne à l’autre, c’est l’activité en dehors du sport : marcher, rester debout, gesticuler, bouger en travaillant. En 1999, des chercheurs ont fait manger 1 000 kcal de plus par jour à seize volontaires pendant huit semaines. Certains ont stocké dix fois plus de gras que d’autres, et la différence venait surtout de ce mouvement spontané, qui augmentait chez certains et pas chez d’autres.",
      ],
    },
    {
      titre: "Pourquoi on se trompe sur ce qu’on mange",
      paragraphes: [
        "Il existe une autre explication, très humaine : estimer ce qu’on mange est difficile. En 1992, une étude a suivi dix personnes en obésité qui ne maigrissaient pas en déclarant manger moins de 1 200 kcal par jour. Mesurée précisément, leur dépense était normale pour leur corps. Elles sous-estimaient en revanche ce qu’elles mangeaient de 47 % en moyenne, et surestimaient leur activité de 51 %.",
        "Ces écarts n’ont rien d’un mensonge. Les portions se jugent mal à l’œil, et les grignotages, les boissons et l’huile de cuisson s’oublient facilement.",
      ],
    },
    {
      titre: "Les vraies causes médicales",
      paragraphes: [
        "Certaines maladies ralentissent bel et bien le métabolisme, comme une thyroïde qui fonctionne trop peu, l’hypothyroïdie. Une fatigue inhabituelle, une sensation de froid permanente et un poids qui monte sans raison méritent d’en parler à un médecin : une prise de sang suffit à la repérer.",
      ],
    },
    {
      titre: "Après un régime",
      paragraphes: [
        "Quand tu perds du poids, ta dépense baisse, d’abord parce que ton corps est plus léger. Certaines études voient une baisse un peu plus grande que prévu, l’adaptation métabolique. Quand elle existe, elle reste en général modeste, et on ne sait pas encore bien la mesurer.",
      ],
    },
  ],
  retenir: "Ta dépense dépend surtout de ton gabarit, de ta masse maigre et de ton activité de tous les jours, et elle reste stable de 20 à 60 ans. Un métabolisme vraiment ralenti existe en cas de maladie, comme l’hypothyroïdie, et se vérifie par une prise de sang.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Pontzer et al. · Science, 2021", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8370708/" },
        { label: "Levine, Eberhardt et Jensen · Science, 1999", url: "https://pubmed.ncbi.nlm.nih.gov/9880251/" },
        { label: "Lichtman et al. · New England Journal of Medicine, 1992", url: "https://pubmed.ncbi.nlm.nih.gov/1454084/" },
      ],
    },
  ],
};

export default texte;
