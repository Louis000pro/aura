/* Flash · Les édulcorants
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Aspartame, sucralose, stévia : les édulcorants donnent un goût sucré sans les calories du sucre. On les trouve dans les sodas « zéro », les yaourts allégés, les chewing-gums. Deux questions reviennent : sont-ils sûrs, et aident-ils à maigrir ?"],
  sections: [
    {
      titre: "Ce que sont les édulcorants",
      paragraphes: [
        "Les édulcorants intenses sucrent des centaines de fois plus que le sucre, ce qui permet d’en mettre très peu. Les plus courants sont l’acésulfame K, l’aspartame, la saccharine, le sucralose et la stévia. Les polyols, comme le sorbitol ou le xylitol des chewing-gums, forment une autre famille : ils apportent quelques calories, et en grande quantité ils peuvent avoir un effet laxatif, que l’étiquette doit signaler.",
      ],
    },
    {
      titre: "Sont-ils sûrs ?",
      paragraphes: [
        "Chaque édulcorant autorisé a une dose journalière admissible : la quantité qu’on peut consommer chaque jour, toute sa vie, sans risque attendu. Pour l’aspartame, elle est de 40 mg par kilo de poids.",
        "En 2023, le Centre international de recherche sur le cancer a classé l’aspartame « peut-être cancérogène », sur la base de preuves limitées. Le même jour, le comité d’experts de l’OMS et de la FAO chargé des additifs a maintenu la dose de 40 mg par kilo. Les deux avis ne se contredisent pas : le premier dit qu’un danger ne peut pas être exclu, le second fixe la dose en dessous de laquelle aucun risque n’est attendu. Pour une personne de 70 kg, il faudrait boire plus de 9 à 14 canettes de soda light par jour pour la dépasser.",
      ],
    },
    {
      titre: "Aident-ils à maigrir ?",
      paragraphes: [
        "En 2023 aussi, l’OMS a recommandé de ne pas utiliser les édulcorants pour contrôler son poids. Les études qu’elle a rassemblées ne montrent pas de bénéfice durable sur la masse grasse, chez l’adulte comme chez l’enfant. Elles suggèrent aussi des effets indésirables possibles à long terme, comme plus de diabète de type 2 et de maladies cardiovasculaires. Ces liens viennent d’études d’observation, où d’autres différences entre les personnes peuvent jouer : l’OMS a donc qualifié sa recommandation de conditionnelle. Elle ne s’applique pas aux personnes déjà diabétiques.",
      ],
    },
    {
      titre: "En pratique",
      paragraphes: [
        "Passer d’un soda sucré à sa version zéro retire beaucoup de sucre d’un coup. Santé publique France range pourtant les sodas light avec les autres boissons sucrées : un verre par jour au plus, l’eau restant la seule boisson recommandée. Et l’OMS propose de réduire peu à peu le goût sucré de ton alimentation, avec de l’eau, des boissons non sucrées et des fruits.",
      ],
    },
  ],
  retenir: "Aux doses habituelles, les édulcorants autorisés sont jugés sûrs, aspartame compris. Ils n’aident pas à perdre du poids sur le long terme, selon l’OMS. Une boisson zéro peut remplacer un soda sucré, mais l’eau reste la boisson de tous les jours.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "OMS · Recommandation sur les édulcorants, 2023", url: "https://www.who.int/news/item/15-05-2023-who-advises-not-to-use-non-sugar-sweeteners-for-weight-control-in-newly-released-guideline" },
        { label: "OMS, CIRC et JECFA · Les évaluations de l’aspartame, 2023", url: "https://www.who.int/news/item/14-07-2023-aspartame-hazard-and-risk-assessment-results-released" },
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
      ],
    },
  ],
};

export default texte;
