/* Flash · Le Nutri-Score : comment il se calcule
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Le Nutri-Score est apparu en France en 2017. Santé publique France l’a conçu pour aider à comparer les produits d’un coup d’œil. Les fabricants l’affichent s’ils le veulent : il n’est pas obligatoire."],
  sections: [
    {
      titre: "Comment il se calcule",
      paragraphes: [
        "Le score se calcule pour 100 g ou 100 ml de produit. Il compte des points pour ce qu’il faut limiter : l’énergie, les graisses saturées, les sucres, le sel, et les édulcorants pour les boissons. Il en retire pour ce qu’il faut favoriser : les fibres, les protéines, les fruits, les légumes et les légumes secs. Le total donne une lettre, de A, en vert foncé, à E, en orange foncé.",
      ],
    },
    {
      titre: "Un calcul revu",
      paragraphes: [
        "En 2023, le comité scientifique européen du Nutri-Score a fait évoluer le calcul pour mieux suivre les recommandations alimentaires et l’offre des magasins. Le nouveau calcul se met en place en France depuis mars 2025, progressivement : certains produits changent de lettre.",
      ],
    },
    {
      titre: "Comment t’en servir",
      paragraphes: [
        "Le Nutri-Score sert surtout à comparer des produits semblables : deux céréales du petit-déjeuner, deux pizzas, deux yaourts. Santé publique France conseille de s’en aider pour limiter les produits notés D et E.",
        "Il a ses limites. Il ne regarde ni les additifs, ni le degré de transformation du produit. Et il juge un produit seul : une lettre E se mange en petite quantité dans une alimentation variée, et une lettre A ne fait pas un repas à elle seule.",
      ],
    },
  ],
  retenir: "Le Nutri-Score résume pour 100 g ce qu’un produit contient à favoriser et à limiter. Sers-t’en pour comparer des produits du même rayon, et complète avec la liste des ingrédients pour les additifs.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Santé publique France · Nutri-Score", url: "https://www.santepubliquefrance.fr/determinants-de-sante/nutrition-et-activite-physique/articles/nutri-score" },
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
      ],
    },
  ],
};

export default texte;
