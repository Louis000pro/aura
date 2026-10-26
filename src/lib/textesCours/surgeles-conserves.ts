/* Flash · Surgelés et conserves face au frais
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["On imagine souvent que le frais vaut mieux que tout. Santé publique France conseille pourtant de manger au moins cinq fruits et légumes par jour, qu’ils soient frais, surgelés ou en conserve. Voici pourquoi."],
  sections: [
    {
      titre: "Le surgelé",
      paragraphes: [
        "Les légumes à surgeler sont préparés peu après la récolte, souvent blanchis quelques minutes dans l’eau bouillante, puis congelés. Un légume frais, lui, perd une partie de sa vitamine C pendant le transport et les jours passés au réfrigérateur.",
        "En 2015, des chercheurs californiens ont comparé huit fruits et légumes conservés quelques jours au réfrigérateur et leurs versions surgelées. Les surgelés avaient en général autant de vitamines, parfois plus. Seul le bêta-carotène baissait nettement dans quelques-uns, comme les petits pois, les carottes et les épinards.",
      ],
    },
    {
      titre: "La conserve",
      paragraphes: [
        "La mise en conserve chauffe les aliments, ce qui fait perdre une partie des vitamines sensibles à la chaleur, comme la vitamine C. Les fibres, les minéraux et les caroténoïdes résistent bien. Les légumes secs en boîte gardent leurs fibres et leurs protéines, et t’évitent des heures de cuisson.",
      ],
    },
    {
      titre: "Ce qu’il faut regarder",
      paragraphes: [
        "Choisis les versions nature : légumes surgelés sans sauce, poisson nature, fruits au naturel plutôt qu’au sirop. Pour les conserves de légumes, regarde le sel sur l’étiquette, ou prends-les sans sel ajouté. Rincer les légumes secs en boîte en retire une partie, et Santé publique France conseille de ne pas resaler les conserves.",
      ],
    },
  ],
  retenir: "Surgelés et conserves comptent dans tes cinq fruits et légumes par jour, et le surgelé garde l’essentiel de ses vitamines. Choisis les versions nature, sans sauce ni sirop, et regarde le sel des conserves.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Bouzari, Holstege et Barrett · Journal of Agricultural and Food Chemistry, 2015", url: "https://pubmed.ncbi.nlm.nih.gov/25526594/" },
        { label: "Rickman, Bruhn et Barrett · Journal of the Science of Food and Agriculture, 2007", url: "https://doi.org/10.1002/jsfa.2824" },
      ],
    },
  ],
};

export default texte;
