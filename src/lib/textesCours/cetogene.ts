/* Flash · Le régime cétogène
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Le régime cétogène, ou « keto », réduit les glucides à presque rien, souvent moins de 20 à 50 g par jour, et remplace cette énergie par du gras. Né pour soigner certaines épilepsies de l’enfant, il est devenu un régime minceur très populaire."],
  sections: [
    {
      titre: "Ce qui se passe dans ton corps",
      paragraphes: [
        "Privé de glucides, ton corps vide ses réserves de glycogène, puis fabrique des cétones à partir des graisses : ton cerveau et tes muscles s’en servent comme carburant. Les premiers jours, la balance baisse vite, surtout parce que l’eau stockée avec le glycogène s’en va.",
      ],
    },
    {
      titre: "Sur le poids",
      paragraphes: [
        "À calories égales, le cétogène ne fait pas perdre plus de gras. En 2016, des chercheurs des National Institutes of Health ont accueilli 17 hommes en surpoids dans un service où tout ce qu’ils mangeaient était contrôlé : quatre semaines d’alimentation riche en glucides, puis quatre semaines de cétogène, avec les mêmes calories. Le cétogène n’a pas accéléré la perte de gras.",
        "Sur des mois, les régimes pauvres en glucides donnent des résultats proches des autres. Dans l’essai DIETFITS, un an de régime pauvre en glucides a fait perdre 6 kg en moyenne, contre 5,3 kg pour un régime pauvre en graisses. Certaines personnes disent avoir moins faim en cétogène, ce qui peut les aider à manger moins.",
      ],
    },
    {
      titre: "Sur l’effort",
      paragraphes: [
        "Pour les sports intenses, il pose problème. En 2017, une étude sur des marcheurs de haut niveau a comparé trois semaines d’entraînement avec beaucoup de glucides, avec des glucides en alternance, ou en cétogène. Les deux premiers groupes ont amélioré leur temps sur 10 km de 5 à 7 %. Le groupe cétogène n’a pas progressé, en partie parce que son effort lui coûtait plus d’oxygène à la même vitesse.",
      ],
    },
    {
      titre: "Avant d’essayer",
      paragraphes: [
        "Le cétogène est difficile à tenir : il exclut le pain, les pâtes, le riz, les légumes secs et la plupart des fruits, et complique les repas avec les autres. Il apporte souvent peu de fibres, et chez certaines personnes il fait nettement monter le LDL, le « mauvais » cholestérol.",
        "En cas de diabète traité, de maladie des reins ou du foie, pendant une grossesse, ou si tu as connu des troubles alimentaires, ne le commence pas sans l’avis d’un médecin.",
      ],
    },
  ],
  retenir: "À calories égales, le cétogène ne fait pas perdre plus de gras, et sur un an il donne à peu près les mêmes résultats que les autres régimes. Il gêne les efforts intenses, apporte peu de fibres, et demande un avis médical en cas de maladie ou de grossesse.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Hall et al. · American Journal of Clinical Nutrition, 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4962163/" },
        { label: "Gardner et al. (DIETFITS) · JAMA, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5839290/" },
        { label: "Burke et al. · Journal of Physiology, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5407976/" },
      ],
    },
  ],
};

export default texte;
