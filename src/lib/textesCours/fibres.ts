/* Cours · Les fibres : à quoi elles servent et où les trouver
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Les fibres sont la partie des végétaux que ton intestin grêle ne digère pas. Elles poursuivent leur chemin jusqu’au côlon, la dernière partie de ton intestin. On en parle moins que des protéines, et pourtant les agences de santé conseillent d’en manger 30 g par jour, un repère que beaucoup d’adultes n’atteignent pas."],
  sections: [
    {
      titre: "Ce qu’elles font pour toi",
      paragraphes: [
        "Les fibres aident ta digestion. Le NHS, le service de santé britannique, les cite contre la constipation, et les relie à moins de maladies du cœur, d’accidents vasculaires cérébraux, de diabète de type 2 et de cancer colorectal.",
        "En 2019, une grande analyse publiée dans The Lancet a rassemblé 185 études qui ont suivi des personnes pendant des années, et 58 essais. Les personnes qui mangeaient le plus de fibres avaient 15 à 30 % de risque en moins de mourir pendant le suivi ou de développer ces maladies, comparées à celles qui en mangeaient le moins. Ces chiffres viennent d’études d’observation : elles montrent un lien, sans prouver à elles seules que les fibres en sont la cause. Le bénéfice le plus net apparaissait vers 25 à 29 g par jour. Dans les essais, manger plus de fibres faisait baisser le poids, la tension et le cholestérol.",
      ],
    },
    {
      titre: "Combien en manger",
      paragraphes: [
        "L’Anses et le NHS donnent le même repère : 30 g de fibres par jour pour un adulte. Au Royaume-Uni, les adultes en mangent environ 20 g en moyenne. En France, l’Anses a constaté que même des menus construits pour être équilibrés atteignaient difficilement 30 g chez les femmes.",
      ],
    },
    {
      titre: "Où les trouver",
      paragraphes: [
        "Les fibres se trouvent dans les céréales complètes, les légumes secs, les légumes, les fruits, les graines et les fruits à coque. Santé publique France conseille au moins un féculent complet par jour, et des légumes secs au moins deux fois par semaine.",
        "Quelques repères pour 100 g : le pain complet en apporte 5,6 g, les haricots blancs cuits 6,3 g, les lentilles et les pois chiches cuits de 4 à 8 g selon la table, française ou américaine. Le riz blanc cuit n’en apporte que 0,3 g.",
        "Le NHS donne l’exemple d’une journée à 30 g : deux tartines de pain complet au beurre de cacahuète et une orange le matin, des spaghetti complets à la sauce aux lentilles et à la tomate à midi, et le soir du poulet avec une pomme de terre cuite au four dans sa peau, des carottes et des haricots verts.",
      ],
    },
    {
      titre: "Sur l’étiquette",
      paragraphes: [
        "Deux mentions sont encadrées par la loi européenne. « Source de fibres » veut dire au moins 3 g pour 100 g. « Riche en fibres » veut dire au moins 6 g pour 100 g.",
      ],
    },
    {
      titre: "Monte petit à petit",
      paragraphes: [
        "Si tu manges peu de fibres aujourd’hui, augmente-les petit à petit : un changement brusque peut donner des ballonnements et des gaz. Bois aussi suffisamment, comme le conseille l’association britannique des diététiciens. Et si ton intestin est sensible, par exemple avec un syndrome de l’intestin irritable, certaines fibres peuvent te gêner : un médecin ou un diététicien t’aidera à choisir.",
      ],
    },
  ],
  retenir: "Vise 30 g de fibres par jour : des légumes et des fruits chaque jour, au moins un féculent complet, des légumes secs plusieurs fois par semaine. Augmente petit à petit, et bois en même temps.",
  essai: "Cette semaine, remplace un seul féculent par sa version complète : ton pain, tes pâtes ou ton riz. Et glisse des légumes secs dans un plat que tu fais déjà, des pois chiches dans une salade ou des lentilles dans une soupe.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Anses · Actualisation des repères du PNNS, 2016", url: "https://www.anses.fr/sites/default/files/NUT2012SA0103Ra-1.pdf" },
        { label: "NHS · How to get more fibre into your diet", url: "https://www.nhs.uk/live-well/eat-well/digestive-health/how-to-get-more-fibre-into-your-diet/" },
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
        { label: "British Dietetic Association · Fibre", url: "https://www.bda.uk.com/resource/fibre.html" },
        { label: "Union européenne · Règlement n° 1924/2006 sur les allégations nutritionnelles", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R1924" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Reynolds et al. · The Lancet, 2019", url: "https://pubmed.ncbi.nlm.nih.gov/30638909/" },
      ],
    },
    {
      groupe: "Tables de composition",
      liens: [
        { label: "Anses · Table Ciqual 2013 (pain complet)", url: "https://informationsnutritionnelles.fr/pain-complet-ou-integral" },
        { label: "Anses · Table Ciqual 2013 (haricots blancs cuits)", url: "https://informationsnutritionnelles.fr/haricot-blanc-cuit" },
        { label: "Anses · Table Ciqual 2013 (lentilles cuites)", url: "https://informationsnutritionnelles.fr/lentille" },
        { label: "Anses · Table Ciqual 2013 (pois chiches cuits)", url: "https://informationsnutritionnelles.fr/pois-chiche" },
        { label: "USDA · FoodData Central (lentilles cuites)", url: "https://fdc.nal.usda.gov/food-details/172421/nutrients" },
        { label: "USDA · FoodData Central (pois chiches cuits)", url: "https://fdc.nal.usda.gov/food-details/173757/nutrients" },
        { label: "USDA · FoodData Central (riz blanc cuit)", url: "https://fdc.nal.usda.gov/food-details/168880/nutrients" },
      ],
    },
  ],
};

export default texte;
