/* Flash · Les œufs et le cholestérol
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Pendant des années, on a conseillé de limiter les œufs à cause de leur cholestérol. Les recommandations ont changé depuis, et les grandes études expliquent pourquoi."],
  sections: [
    {
      titre: "Le cholestérol de l’assiette et celui du sang",
      paragraphes: [
        "Un gros jaune d’œuf contient environ 200 mg de cholestérol, ce qui en fait l’une des sources les plus riches. Pourtant, le cholestérol que tu manges et celui de ton sang sont peu liés. Pour la plupart des gens, le type de graisses de l’alimentation pèse davantage sur le LDL, le « mauvais » cholestérol, que le cholestérol des aliments. Les recommandations américaines ont d’ailleurs supprimé en 2015 leur plafond de 300 mg de cholestérol par jour.",
      ],
    },
    {
      titre: "Ce que montrent les grandes études",
      paragraphes: [
        "En 2020, des chercheurs ont suivi plus de 215 000 Américains pendant jusqu’à 32 ans, puis ont rassemblé les résultats d’études menées sur plus de 1,7 million de personnes dans le monde. Manger jusqu’à un œuf par jour n’était pas lié à plus de maladies du cœur ni d’AVC.",
      ],
    },
    {
      titre: "Ce qui accompagne l’œuf",
      paragraphes: [
        "L’œuf apporte aussi des protéines de bonne qualité, de la vitamine B12 et de la vitamine D. Ce qui pèse le plus, c’est souvent ce qui l’accompagne : le bacon, la charcuterie, le beurre en quantité. Des œufs avec des légumes ou du pain complet font un tout autre repas.",
        "Si tu as un cholestérol élevé, un diabète ou une maladie du cœur, demande l’avis de ton médecin.",
      ],
    },
  ],
  retenir: "Pour la plupart des gens, manger jusqu’à un œuf par jour n’augmente pas le risque cardiaque. Le type de graisses de ton assiette pèse plus sur ton cholestérol que celui des œufs : surveille surtout ce qui les accompagne.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Harvard T.H. Chan School of Public Health · Eggs", url: "https://nutritionsource.hsph.harvard.edu/eggs/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Drouin-Chartier et al. · BMJ, 2020", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7190072/" },
      ],
    },
  ],
};

export default texte;
