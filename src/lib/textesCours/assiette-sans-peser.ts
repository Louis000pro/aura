/* Flash · Faire une assiette sans rien peser
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Peser chaque aliment, peu de gens le font longtemps, et rien ne t’y oblige. Des nutritionnistes de Harvard proposent une méthode plus simple, fondée sur des proportions : la part de l’assiette que prend chaque famille d’aliments."],
  sections: [
    {
      titre: "La règle des quarts",
      paragraphes: [
        "L’école de santé publique de Harvard découpe l’assiette ainsi : la moitié en légumes et en fruits, un quart en céréales, de préférence complètes, et un quart en protéines, comme du poisson, de la volaille, des légumes secs ou des noix. Ajoute des huiles végétales avec modération, et de l’eau pour boire. Ces proportions ne disent rien des calories : elles valent pour une assiette, un bol, une soupe ou un plat unique.",
        "Santé publique France va dans le même sens, avec ses propres repères : au moins cinq portions de fruits et légumes par jour, un féculent à chaque repas, dont au moins un complet dans la journée.",
      ],
    },
    {
      titre: "Ce qui compte comme légume",
      paragraphes: [
        "La pomme de terre compte comme un féculent, donc elle rejoint le quart des céréales. Une portion de légumes ou de fruits pèse environ 80 g, de 80 à 100 g pour Santé publique France. Sans balance, ça donne trois cuillères à soupe bombées de légumes cuits, sept tomates cerises, ou une pomme. Pour le NHS, le service de santé britannique, les légumes secs comme les lentilles ne comptent qu’une fois par jour dans ces portions, quelle que soit la quantité.",
      ],
    },
    {
      titre: "Le quart des protéines",
      paragraphes: [
        "Pour remplir ce quart au fil de la semaine, Santé publique France conseille du poisson deux fois par semaine, dont un poisson gras, des légumes secs au moins deux fois par semaine, et au plus 500 g de viande hors volaille et 150 g de charcuterie par semaine. Ajoute deux produits laitiers par jour, par exemple un yaourt de 125 g et 30 g de fromage.",
      ],
    },
    {
      titre: "Les jours d’entraînement",
      paragraphes: [
        "Des diététiciens du sport américains ont adapté l’assiette à la charge d’entraînement : la part des féculents grandit les jours chargés, pour fournir plus de glucides et d’énergie. Ça rejoint les recommandations sportives, qui augmentent les glucides avec le temps d’entraînement.",
      ],
    },
    {
      titre: "La taille de l’assiette compte aussi",
      paragraphes: [
        "Une analyse de 72 études, publiée par la collaboration Cochrane, montre que de plus grandes portions, de plus grands paquets et une vaisselle plus grande font manger davantage, chez les adultes comme chez les enfants. Manger sans écran aide aussi : quand l’attention part ailleurs, on mange un peu plus au repas, et davantage ensuite.",
      ],
    },
  ],
  retenir: "La moitié de l’assiette en légumes, un quart en féculents, de préférence complets, un quart en protéines, et un peu d’huile de colza, de noix ou d’olive. Les jours d’entraînement chargés, la part des féculents peut grandir.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Harvard T.H. Chan School of Public Health · Healthy Eating Plate", url: "https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/" },
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
        { label: "NHS · 5 A Day portion sizes", url: "https://www.nhs.uk/live-well/eat-well/5-a-day/portion-sizes/" },
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Reguant-Closa et al. · International Journal of Sport Nutrition and Exercise Metabolism, 2019", url: "https://pubmed.ncbi.nlm.nih.gov/31141408/" },
        { label: "Reguant-Closa et al. · Nutrients, 2020", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7468909/" },
        { label: "Hollands et al. · Cochrane, 2015", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4579823/" },
        { label: "Robinson et al. · American Journal of Clinical Nutrition, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3607652/" },
      ],
    },
  ],
};

export default texte;
