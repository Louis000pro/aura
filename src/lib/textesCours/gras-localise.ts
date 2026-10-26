/* Flash · Peut-on perdre du gras à un endroit précis ?
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Faire des abdominaux pour perdre du ventre, des squats pour affiner les cuisses : l’idée paraît logique. Les chercheurs appellent ça la perte de gras localisée, et ils l’ont testée."],
  sections: [
    {
      titre: "Ce que montrent les essais",
      paragraphes: [
        "En 2011, 24 adultes ont été tirés au sort. La moitié a fait sept exercices d’abdominaux, deux séries de dix répétitions, cinq jours par semaine pendant six semaines. Leurs abdominaux étaient devenus plus endurants, mais la graisse de leur ventre n’avait pas diminué par rapport à l’autre groupe.",
        "En 2013, onze volontaires ont entraîné une seule jambe pendant douze semaines, avec près de mille répétitions à chaque séance. Ils ont perdu du gras, surtout dans les bras et le tronc, et pas davantage dans la jambe entraînée.",
      ],
    },
    {
      titre: "Pourquoi",
      paragraphes: [
        "Un muscle qui travaille puise son énergie dans le sang, qui transporte des graisses venues de tout le corps : la graisse qui le recouvre ne lui est pas réservée. L’ordre dans lequel ton corps perd son gras dépend surtout de ta génétique, de ton sexe et de ton âge, et il varie d’une personne à l’autre.",
      ],
    },
    {
      titre: "Ce qui marche",
      paragraphes: [
        "Pour perdre du gras à un endroit, il faut en perdre partout : un léger déficit de calories, tenu dans la durée (voir le dossier « Perdre du poids : comment ça marche »). Les exercices ciblés gardent tout leur intérêt : des abdominaux plus forts aident ta posture et tes autres mouvements, et des muscles plus développés changent la forme d’une zone à mesure que le gras diminue.",
      ],
    },
  ],
  retenir: "On ne choisit pas où l’on perd du gras : il part de tout le corps quand tu manges un peu moins que ce que tu dépenses. Les exercices ciblés renforcent les muscles de la zone, et ça se voit davantage à mesure que le gras diminue.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Vispute et al. · Journal of Strength and Conditioning Research, 2011", url: "https://pubmed.ncbi.nlm.nih.gov/21804427/" },
        { label: "Ramírez-Campillo et al. · Journal of Strength and Conditioning Research, 2013", url: "https://pubmed.ncbi.nlm.nih.gov/23222084/" },
      ],
    },
  ],
};

export default texte;
