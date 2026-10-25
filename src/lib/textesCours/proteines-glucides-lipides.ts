/* Cours · Protéines, glucides, lipides : à quoi sert chacun
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Sur chaque étiquette, trois lignes reviennent : protéines, glucides, lipides. On les appelle les macronutriments, parce qu’on en mange des dizaines de grammes par jour, alors que les vitamines se comptent en milligrammes. Chacun a un métier différent, et les recommandations françaises donnent une place aux trois."],
  sections: [
    {
      titre: "Les protéines construisent",
      paragraphes: [
        "Les protéines servent à fabriquer et à renouveler ton corps : tes muscles, ta peau, tes cheveux, tes ongles, tes os. Elles fabriquent aussi des enzymes, des hormones, des anticorps, et l’hémoglobine qui transporte l’oxygène dans ton sang.",
        "Elles sont faites de petites briques, les acides aminés. Il en existe 20, et 9 d’entre eux doivent venir de ton assiette, parce que ton corps ne sait pas les fabriquer : on les dit indispensables. Tu les trouves dans la viande, le poisson, les œufs et les produits laitiers, mais aussi dans les légumes secs, les céréales, les graines et les noix. Les protéines végétales sont un peu moins complètes, et l’Anses, l’agence française de sécurité sanitaire de l’alimentation, estime qu’en France une alimentation variée suffit, sans associer céréales et légumes secs à chaque repas.",
        "Pour un adulte en bonne santé, la référence est de 0,83 g de protéines par kilo et par jour, soit environ 58 g pour 70 kg.",
      ],
    },
    {
      titre: "Les glucides alimentent",
      paragraphes: [
        "Les glucides regroupent les sucres et l’amidon. L’amidon, celui du pain, des pâtes, du riz, des pommes de terre et des légumes secs, est un glucide dit complexe : ton intestin le découpe, et il passe dans ton sang surtout sous forme de glucose. Le glucose est un carburant majeur de ton cerveau et de tes muscles, qui en gardent une petite réserve, le glycogène.",
        "L’Anses conseille d’en tirer 40 à 55 % de l’énergie de ta journée, en privilégiant les glucides complexes. Pour les sucres, elle fixe un plafond de 100 g par jour, sans compter ceux du lait. L’Organisation mondiale de la santé vise les sucres « libres », ceux qu’on ajoute et ceux du miel, des sirops et des jus : moins de 10 % de l’énergie, et si possible moins de 5 %.",
      ],
    },
    {
      titre: "Les lipides stockent et protègent",
      paragraphes: [
        "Les lipides, ce sont les graisses. Ils stockent l’énergie dans ton tissu adipeux et forment l’enveloppe de chacune de tes cellules. Le cholestérol, un lipide, sert à fabriquer certaines hormones. Deux familles d’acides gras, les oméga 3 et les oméga 6, sont indispensables : là encore, ton corps ne sait pas les fabriquer.",
        "L’Anses place les lipides à 35 à 40 % de l’énergie de la journée, et environ quatre adultes sur dix en France dépassent ce repère. Santé publique France conseille les huiles de colza, de noix et d’olive, et du poisson deux fois par semaine, dont un poisson gras comme la sardine, le maquereau ou le saumon.",
      ],
    },
    {
      titre: "Ce que pèse chacun en calories",
      paragraphes: [
        "Les étiquettes européennes calculent l’énergie avec les mêmes coefficients : 4 kcal par gramme de protéines, 4 par gramme de glucides, 9 par gramme de lipides. L’alcool en apporte 7, les fibres 2. Voilà pourquoi 10 g d’huile apportent environ 90 kcal, et 10 g de sucre environ 40.",
        "Les pourcentages imprimés sur les emballages se calculent pour un adulte de référence : 2 000 kcal par jour, 50 g de protéines, 260 g de glucides dont 90 g de sucres, 70 g de graisses dont 20 g de saturées, et 6 g de sel. Ce sont des repères communs pour comparer deux produits. Tes propres besoins dépendent de ton âge, de ton gabarit et de ton activité.",
      ],
    },
  ],
  retenir: "Les protéines construisent, les glucides alimentent, les lipides stockent l’énergie et protègent tes cellules. Une assiette avec une source de protéines, un féculent, des légumes et un peu d’huile réunit les trois.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Anses · Les protéines", url: "https://www.anses.fr/fr/content/les-prot%C3%A9ines" },
        { label: "Anses · Les sucres dans l’alimentation", url: "https://www.anses.fr/fr/article/sucres-lalimentation" },
        { label: "Anses · Les lipides", url: "https://www.anses.fr/fr/content/les-lipides" },
        { label: "Anses · Actualisation des repères du PNNS, 2016", url: "https://www.anses.fr/sites/default/files/NUT2012SA0103Ra-1.pdf" },
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
        { label: "OMS · Recommandation sur l’apport en sucres, 2015", url: "https://www.who.int/news/item/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children" },
        { label: "Union européenne · Règlement n° 1169/2011 sur l’information du consommateur", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32011R1169" },
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
        { label: "Harvard T.H. Chan School of Public Health · Healthy Eating Plate", url: "https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "van Vliet, Burd et van Loon · Journal of Nutrition, 2015", url: "https://doi.org/10.3945/jn.114.204305" },
        { label: "Hudson et al. · Advances in Nutrition, 2020", url: "https://doi.org/10.1093/advances/nmz106" },
      ],
    },
  ],
};

export default texte;
