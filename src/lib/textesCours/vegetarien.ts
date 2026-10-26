/* Cours · Manger végétarien sans carence
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Moins de viande, plus du tout, ou plus aucun produit animal : de plus en plus de personnes changent leur assiette, pour la planète, pour les animaux ou pour leur santé. L’Academy of Nutrition and Dietetics, la grande association américaine de diététiciens, estime qu’une alimentation végétarienne ou végane bien planifiée est saine, couvre les besoins et convient à tous les âges, grossesse et sport compris. Le mot important est « planifiée »."],
  sections: [
    {
      titre: "Végétarien, végan : de quoi on parle",
      paragraphes: [
        "Une alimentation végétarienne exclut la viande et le poisson, et garde les œufs et les produits laitiers. Une alimentation végane, ou végétalienne, exclut tous les produits d’origine animale. Plus l’assiette se restreint, plus elle demande d’attention : la plupart des points qui suivent concernent surtout les personnes véganes.",
      ],
    },
    {
      titre: "Les protéines",
      paragraphes: [
        "Les légumes secs, le tofu, le tempeh, les œufs, les produits laitiers, les céréales, les noix et les graines apportent des protéines. Les protéines végétales sont un peu moins complètes, mais l’Anses estime qu’en France une alimentation variée suffit, sans associer céréales et légumes secs à chaque repas. Santé publique France propose d’ailleurs de remplacer la viande par des légumes secs avec un produit céréalier, comme un couscous aux pois chiches ou un curry de lentilles avec du riz.",
        "Pour le sport aussi : dans un essai de 2021, des jeunes hommes végans et omnivores qui mangeaient autant de protéines ont gagné autant de muscle et de force en douze semaines de musculation.",
      ],
    },
    {
      titre: "La vitamine B12",
      paragraphes: [
        "La vitamine B12 sert à fabriquer les globules rouges et à faire fonctionner les nerfs. Elle ne se trouve naturellement que dans les aliments d’origine animale. Les personnes végétariennes en trouvent dans les œufs et les produits laitiers. Les personnes véganes ont besoin d’aliments enrichis ou d’un complément, comme le rappellent l’Academy et le NHS : c’est le complément indispensable d’une alimentation végane. Un manque met longtemps à se voir, parce que le foie en garde des réserves, et il peut abîmer les nerfs.",
      ],
    },
    {
      titre: "Le fer",
      paragraphes: [
        "Sans viande ni poisson, tout ton fer est non héminique, la forme que ton corps absorbe le moins bien. Les légumes secs, le tofu, les céréales complètes, les graines et les légumes verts en apportent. La vitamine C d’un fruit ou de crudités au même repas aide à l’absorber, et le thé ou le café passent mieux à distance des repas (voir « Le fer : qui en manque, et pourquoi »).",
      ],
    },
    {
      titre: "Le calcium",
      paragraphes: [
        "Sans produits laitiers, le calcium vient des boissons végétales enrichies, de soja, d’avoine ou de pois, du tofu préparé au calcium, des graines de sésame et du tahin, des légumes secs, de certaines eaux minérales riches en calcium, et de légumes verts comme le brocoli et le chou. Les épinards en contiennent beaucoup, mais ton corps en absorbe peu.",
      ],
    },
    {
      titre: "Les oméga 3",
      paragraphes: [
        "Les oméga 3 végétaux viennent de l’huile de colza, de l’huile de noix, des noix et des graines de lin : le NHS conseille d’en manger chaque jour. Le DHA, l’oméga 3 des poissons gras, est presque absent d’une assiette végane, et ton corps en fabrique peu à partir des oméga 3 végétaux. Des compléments d’huile d’algue existent : leur intérêt chez l’adulte en bonne santé reste discuté, et ton médecin peut t’aider à trancher.",
      ],
    },
    {
      titre: "L’iode, le zinc et la vitamine D",
      paragraphes: [
        "L’iode vient surtout du sel iodé, des produits laitiers et du poisson. Sans les deux derniers, cuisine avec du sel iodé. Les algues en contiennent des quantités très variables : mieux vaut ne pas compter sur elles. Le zinc se trouve dans les légumes secs, les céréales complètes, les graines et les noix. Et la vitamine D concerne tout le monde en hiver, avec ou sans viande.",
      ],
    },
    {
      titre: "Les moments qui demandent un suivi",
      paragraphes: [
        "Pendant une grossesse ou l’allaitement, et chez les enfants et les adolescents, les besoins augmentent. Une alimentation végane reste possible à ces âges, mais elle se construit avec un médecin ou un diététicien. Une prise de sang de temps en temps, avec la vitamine B12 et le fer, permet aussi de vérifier que tout va bien.",
      ],
    },
  ],
  exemple: ["Une journée végane qui coche les cases. Le matin, un porridge d’avoine à la boisson de soja enrichie en calcium, avec des noix et un kiwi. À midi, un curry de lentilles corail et d’épinards avec du riz, et une orange. Au goûter, une tartine de pain complet au beurre de cacahuète. Le soir, un sauté de tofu et de brocoli à l’huile de colza avec des nouilles, puis un yaourt de soja enrichi. Le sel de cuisine est iodé, et le complément de vitamine B12 se prend selon la dose conseillée."],
  retenir: "Une alimentation végétarienne ou végane bien construite couvre les besoins. Sans aucun produit animal, la vitamine B12 en complément est indispensable. Surveille aussi le fer, le calcium, les oméga 3 et l’iode, avec des légumes secs, des boissons végétales enrichies, de l’huile de colza, des noix et du sel iodé.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Academy of Nutrition and Dietetics · Les alimentations végétariennes, 2016", url: "https://pubmed.ncbi.nlm.nih.gov/27886704/" },
        { label: "NHS · The vegan diet", url: "https://www.nhs.uk/live-well/eat-well/how-to-eat-a-balanced-diet/the-vegan-diet/" },
        { label: "Anses · Les protéines", url: "https://www.anses.fr/fr/content/les-prot%C3%A9ines" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Hevia-Larraín et al. · Sports Medicine, 2021", url: "https://doi.org/10.1007/s40279-021-01434-9" },
      ],
    },
  ],
};

export default texte;
