/* Cours · Les aliments ultra-transformés : ce que disent les études
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Les aliments ultra-transformés font la une des journaux depuis quelques années. Le mot vient d’une classification inventée par des chercheurs brésiliens à la fin des années 2000, la classification Nova. Santé publique France conseille de les limiter, et des centaines d’études les relient à des problèmes de santé. Pourtant, les chercheurs débattent encore de ce qu’ils mesurent exactement. Voici ce qu’on sait, et ce qu’on ignore."],
  sections: [
    {
      titre: "Quatre groupes",
      paragraphes: [
        "La classification Nova range les aliments en quatre groupes, selon la transformation qu’ils ont subie.",
        "Le premier groupe réunit les aliments bruts ou peu transformés : fruits, légumes, légumes secs, viande, poisson, œufs, lait, riz, pâtes, flocons d’avoine. Les sécher, les congeler, les moudre ou les pasteuriser ne les fait pas changer de groupe. Un sachet de haricots verts surgelés nature y reste.",
        "Le deuxième groupe réunit les ingrédients qui servent à cuisiner : l’huile, le beurre, le sucre, le sel, le vinaigre.",
        "Le troisième groupe rassemble les aliments transformés, faits avec les deux premiers groupes : des légumes en conserve au sel, du fromage, du poisson à l’huile, du pain fait de farine, d’eau, de sel et de levure.",
        "Le quatrième groupe, celui des ultra-transformés, rassemble des produits fabriqués par l’industrie à partir de substances extraites des aliments, comme les sirops de glucose, les huiles raffinées, les amidons modifiés ou les protéines isolées, auxquelles s’ajoutent des additifs qu’on ne trouve pas dans une cuisine : arômes, colorants, émulsifiants, édulcorants, exhausteurs de goût. On y trouve les sodas, beaucoup de biscuits et de céréales du petit-déjeuner, les barres chocolatées, les plats préparés, les nuggets reconstitués, le pain de mie industriel, les desserts lactés aromatisés.",
        "Un indice simple aide à les repérer : une liste d’ingrédients longue, avec des noms que tu n’as jamais vus dans un placard.",
      ],
    },
    {
      titre: "Ce que montrent les grandes études",
      paragraphes: [
        "En 2024, une revue publiée dans le BMJ a rassemblé 45 analyses, qui regroupaient près de dix millions de personnes. Manger davantage d’ultra-transformés était associé à 32 problèmes de santé sur les 45 étudiés. Les liens jugés les plus solides concernaient la mortalité par maladie cardiovasculaire, le diabète de type 2, l’anxiété et les troubles psychiques courants. D’autres liens étaient jugés très probables, avec la mortalité toutes causes, la dépression, l’obésité et les troubles du sommeil.",
        "Un essai a testé directement l’effet de ces produits. En 2019, aux États-Unis, vingt adultes ont vécu un mois dans un centre de recherche. Pendant deux semaines, ils ont mangé à volonté des repas ultra-transformés, et pendant deux autres semaines des repas peu transformés, avec autant de sucre, de gras, de fibres et de sel proposés. Avec les ultra-transformés, ils mangeaient environ 500 kcal de plus par jour, et ils ont pris 0,9 kg en deux semaines.",
      ],
    },
    {
      titre: "Ce qui reste discuté",
      paragraphes: [
        "Presque toutes ces études sont des études d’observation : elles suivent des personnes qui mangent plus ou moins d’ultra-transformés, sans leur demander de changer. Or ces personnes diffèrent aussi par leurs revenus, leur temps, leur sommeil ou leur activité. Les chercheurs tiennent compte de ces différences, sans pouvoir les effacer toutes. La revue de 2024 jugeait d’ailleurs la qualité des preuves faible ou très faible pour la plupart de ses résultats.",
        "La classification elle-même fait débat. Elle met dans le même groupe des produits très différents, un soda et un pain complet industriel, une barre chocolatée et un yaourt aromatisé. Ses critères laissent aussi une part d’interprétation. Et l’essai de 2019 ne réunissait que vingt personnes pendant un mois.",
        "Enfin, on ne sait pas encore ce qui, dans ces produits, pose problème. Plusieurs pistes sont étudiées : ils apportent beaucoup de calories par bouchée, se mangent vite parce qu’ils demandent peu de mastication, associent gras, sucre et sel d’une façon qui donne envie d’y revenir, et certains additifs, comme des émulsifiants, modifient l’intestin chez l’animal. Ces explications ne s’excluent pas.",
      ],
    },
    {
      titre: "Ce que conseillent les autorités françaises",
      paragraphes: [
        "Santé publique France recommande de limiter les boissons sucrées et les aliments gras, sucrés, salés et ultra-transformés. Elle note que les additifs figurent dans la liste des ingrédients, souvent avec la lettre E, et qu’on ne connaît pas encore précisément leur impact sur la santé. Par précaution, elle conseille de privilégier les produits sans additifs ou avec la liste la plus courte, et le fait maison avec des produits frais, ou des surgelés et des conserves nature, comme des légumes ou des filets de poisson.",
        "Pour choisir entre plusieurs produits du même rayon, elle propose aussi le Nutri-Score, en limitant les produits notés D et E.",
      ],
    },
    {
      titre: "En manger moins, sans y passer tes soirées",
      paragraphes: [
        "Les produits peu transformés ne sont pas forcément longs à cuisiner. Des légumes surgelés nature, des pois chiches en boîte, des œufs, du riz et une boîte de sardines donnent un repas en un quart d’heure.",
        "Commence par ce qui revient le plus souvent dans ta semaine. Un yaourt nature avec un fruit à la place d’un dessert lacté aromatisé. Une vinaigrette maison à la place d’une sauce en bouteille. Du pain de boulangerie à la place du pain de mie industriel. De l’eau à la place du soda.",
        "Les plats préparés dépannent les soirs pressés. Ceux dont la liste d’ingrédients est courte, et que tu complètes avec des légumes, font un repas correct. Cuisiner en plus grande quantité une ou deux fois par semaine réduit aussi le besoin d’y recourir.",
        "Personne ne mange zéro produit ultra-transformé, et ce n’est pas le but. Les études comparent des personnes qui en mangent beaucoup et des personnes qui en mangent moins : déplacer petit à petit la part de ton alimentation vers des produits simples suit déjà ce que les recommandations demandent.",
      ],
    },
  ],
  retenir: "Les ultra-transformés sont des produits industriels faits d’ingrédients extraits et d’additifs. Les études les relient à plusieurs problèmes de santé, surtout cardiovasculaires et métaboliques, même si elles ne prouvent pas toutes un effet direct. Privilégie les produits à la liste d’ingrédients courte, les surgelés et les conserves nature, et le fait maison simple.",
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
        { label: "Lane et al. · BMJ, 2024", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10899807/" },
        { label: "Hall et al. · Cell Metabolism, 2019", url: "https://doi.org/10.1016/j.cmet.2019.05.008" },
      ],
    },
  ],
};

export default texte;
