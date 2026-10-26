/* Flash · Les crampes et le magnésium
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Une crampe arrive sans prévenir : le muscle se contracte tout seul et fait mal, de quelques secondes à une dizaine de minutes. Elle touche souvent le mollet, pendant l’effort ou la nuit."],
  sections: [
    {
      titre: "D’où elles viennent",
      paragraphes: [
        "Le NHS, le service de santé britannique, cite plusieurs causes possibles : l’âge, un effort qui sollicite beaucoup le muscle, surtout par temps chaud ou humide, la fin d’une grossesse, certains médicaments contre le cholestérol ou la tension, le manque d’eau. Souvent, aucune cause n’est trouvée.",
      ],
    },
    {
      titre: "Le magnésium aide peu",
      paragraphes: [
        "Le magnésium est vendu contre les crampes, mais les essais ne confirment pas cet usage. En 2020, une revue Cochrane a rassemblé 11 essais. Chez les personnes plus âgées qui ont des crampes la nuit, le magnésium ne faisait presque pas mieux qu’un placebo. Pendant la grossesse, les résultats se contredisent. Pour les crampes du sport, aucun essai n’a été mené. Et le magnésium donne assez souvent la diarrhée.",
      ],
    },
    {
      titre: "Ce qui aide",
      paragraphes: [
        "Pendant une crampe, étire et masse le muscle, ou mets-toi debout en appuyant sur la jambe. Pour les crampes de mollet qui reviennent, le NHS propose un étirement simple : face à un mur, les pieds à plat, penche-toi en avant en appuyant les mains contre le mur jusqu’à sentir le mollet s’étirer, tiens deux ou trois secondes, et répète pendant cinq minutes, trois fois par jour, la dernière juste avant le coucher.",
      ],
    },
    {
      titre: "Quand consulter",
      paragraphes: [
        "Vois un médecin si les crampes gênent ton sommeil, si elles durent plus de dix minutes, ou si tu as aussi des engourdissements ou un gonflement des jambes.",
      ],
    },
  ],
  retenir: "Le magnésium aide peu contre les crampes. Pendant une crampe, étire et masse le muscle, et pour les crampes de mollet qui reviennent, étire-le chaque jour. Des crampes qui durent ou qui gênent ton sommeil méritent un avis médical.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "NHS · Leg cramps", url: "https://www.nhs.uk/conditions/leg-cramps/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Garrison et al. · Cochrane, 2020", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8094171/" },
      ],
    },
  ],
};

export default texte;
