/* Flash · Lire une étiquette en trente secondes
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Devant le rayon des céréales, deux boîtes se ressemblent. L’étiquette dit laquelle choisir, à condition de savoir où regarder. Deux endroits suffisent, plus quelques mots à connaître."],
  sections: [
    {
      titre: "D’abord, la liste des ingrédients",
      paragraphes: [
        "La loi européenne impose de lister les ingrédients du plus présent au moins présent, au poids. Si le sucre arrive en deuxième position dans des céréales, c’est qu’il en contient beaucoup. Une liste courte, faite d’ingrédients que tu as dans ta cuisine, signale en général un produit peu transformé. Les allergènes y sont mis en évidence, souvent en gras.",
      ],
    },
    {
      titre: "Ensuite, le tableau pour 100 g",
      paragraphes: [
        "Le tableau nutritionnel donne l’énergie, les graisses dont les saturées, les glucides dont les sucres, les protéines et le sel. Compare toujours les valeurs pour 100 g : chaque marque choisit sa portion, qui ne correspond pas forcément à ce que tu verses dans ton bol.",
      ],
    },
    {
      titre: "Les mentions encadrées par la loi",
      paragraphes: [
        "Certaines mentions ont une définition précise. « Riche en fibres » veut dire au moins 6 g de fibres pour 100 g. « Riche en protéines » veut dire qu’au moins 20 % des calories du produit viennent des protéines. « Allégé » veut dire au moins 30 % de moins que des produits comparables, sur les calories ou sur un nutriment : un produit allégé en sucres peut rester aussi calorique si le sucre a été remplacé par autre chose. « Sans sucres ajoutés » veut dire qu’on n’en a pas ajouté : le produit peut contenir les sucres naturels des fruits ou du lait, et l’étiquette doit alors le signaler.",
        "Les images et les mots de l’emballage disent ce que la marque veut mettre en avant. La liste et le tableau disent ce qu’il y a dedans.",
      ],
    },
  ],
  retenir: "Regarde d’abord la liste des ingrédients, rangés du plus présent au moins présent, puis compare les produits avec le tableau pour 100 g. Les mentions « riche en » et « allégé » ont une définition légale ; l’image de la boîte n’en a pas.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Union européenne · Règlement n° 1169/2011 sur l’information du consommateur", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32011R1169" },
        { label: "Union européenne · Règlement n° 1924/2006 sur les allégations nutritionnelles", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R1924" },
      ],
    },
  ],
};

export default texte;
