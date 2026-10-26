/* Flash · Les cures « détox »
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Après les fêtes ou avant l’été, les cures « détox » promettent de nettoyer le corps : trois jours de jus de légumes, des tisanes, un jeûne, des compléments. L’idée a l’air logique. Les preuves, elles, manquent."],
  sections: [
    {
      titre: "Ton corps a déjà son équipe",
      paragraphes: [
        "Ton foie transforme l’alcool, les médicaments et beaucoup d’autres substances pour qu’elles puissent sortir de ton corps. Tes reins filtrent ton sang et éliminent les déchets dans les urines. Ton intestin, tes poumons et ta peau participent aussi. L’association britannique des diététiciens le dit sans détour : sauf maladie grave, ton corps sait se débarrasser de ses déchets, et aucune pilule, aucune boisson, aucun patch ne le fait mieux.",
      ],
    },
    {
      titre: "Ce que disent les études",
      paragraphes: [
        "En 2015, une revue a cherché les preuves derrière ces régimes. Elle a trouvé très peu d’études cliniques, et aucun essai contrôlé qui ait testé une cure commerciale chez l’humain.",
      ],
    },
    {
      titre: "Pourquoi on se sent plus léger",
      paragraphes: [
        "Les quelques kilos perdus pendant une cure viennent surtout de l’eau et des réserves de glucides, qui reviennent dès que tu remanges normalement (voir « Pourquoi la balance bouge chaque jour »). Se sentir mieux vient souvent de ce qu’on arrête en même temps : l’alcool, les repas très riches, les nuits trop courtes.",
      ],
    },
    {
      titre: "Les risques",
      paragraphes: [
        "Certaines tisanes « détox » agissent comme des laxatifs, ce qui n’est pas sans risque. Les cures de jus apportent peu de protéines. Et boire des quantités d’eau énormes peut être aussi dangereux que de ne pas boire assez.",
      ],
    },
  ],
  retenir: "Ton foie, tes reins et ton intestin éliminent déjà les déchets, et aucune cure n’a montré qu’elle les aidait. Pour te sentir mieux après une période chargée, reprends des repas variés, de l’eau, du sommeil et un peu d’activité.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "British Dietetic Association · Detox diets", url: "https://www.bda.uk.com/resource/detox-diets.html" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Klein et Kiat · Journal of Human Nutrition and Dietetics, 2015", url: "https://pubmed.ncbi.nlm.nih.gov/25522674/" },
      ],
    },
  ],
};

export default texte;
