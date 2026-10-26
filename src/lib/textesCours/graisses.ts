/* Flash · Les graisses : lesquelles privilégier
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Le gras a longtemps eu mauvaise presse, puis il est revenu à la mode. Entre les deux, les études ont surtout appris une chose : la quantité compte, et le type de graisse compte encore plus pour ton cœur."],
  sections: [
    {
      titre: "Trois familles",
      paragraphes: [
        "Les graisses de ton assiette sont faites d’acides gras, rangés en trois familles selon leur structure. Les saturés dominent dans le beurre, la crème, les fromages, la viande grasse, la charcuterie, l’huile de coco et l’huile de palme. Les mono-insaturés dominent dans l’huile d’olive, l’huile de colza, l’avocat et beaucoup de fruits à coque. Les polyinsaturés regroupent les oméga 6 et les oméga 3 : on les trouve dans les huiles de colza, de noix et de tournesol, dans les noix, les graines de lin et les poissons gras.",
      ],
    },
    {
      titre: "Les oméga 3",
      paragraphes: [
        "Ton corps ne sait pas fabriquer les oméga 3 et les oméga 6 : ils doivent venir de ton assiette. Les oméga 6 sont partout, les oméga 3 sont plus rares. Le premier d’entre eux vient des végétaux : l’huile de colza, l’huile de noix, les noix, les graines de lin. Ton corps en tire un peu d’EPA et de DHA, deux oméga 3 importants, mais pas assez de DHA pour couvrir ses besoins, selon l’Anses : le DHA vient surtout des poissons gras.",
        "C’est pour eux que Santé publique France conseille les huiles de colza et de noix, une petite poignée de fruits à coque par jour, et du poisson deux fois par semaine, dont un poisson gras comme la sardine, le maquereau, le hareng ou le saumon. Frais, surgelé ou en conserve, il compte pareil.",
      ],
    },
    {
      titre: "Les saturés, en petites quantités",
      paragraphes: [
        "En excès, certaines graisses saturées favorisent les dépôts de cholestérol dans les artères. L’Anses conseille que l’ensemble des saturés ne dépasse pas 12 % de l’énergie de ta journée.",
        "En 2020, une revue Cochrane a rassemblé 15 essais qui ont suivi plus de 56 000 personnes pendant au moins deux ans. Quand les participants mangeaient moins de graisses saturées, leur risque d’accident cardiovasculaire, comme un infarctus ou un AVC, baissait de 17 %. Les remplacer par des graisses polyinsaturées ou par des glucides marchait, et plus la baisse était grande, plus l’effet l’était. Sur la mortalité, en revanche, l’effet était faible ou nul.",
        "Ça ne veut pas dire supprimer le beurre ou le fromage. Santé publique France propose de garder le beurre pour la tartine du matin, ou cru en noisette sur des légumes, et de cuisiner plutôt avec des huiles.",
      ],
    },
    {
      titre: "En pratique",
      paragraphes: [
        "Pour cuisiner et assaisonner, alterne l’huile d’olive et l’huile de colza. Garde l’huile de noix pour les salades et les plats froids. Ajoute une petite poignée de noix, d’amandes ou de noisettes non salées dans ta journée, et pense au poisson gras en boîte : une conserve de sardines ou de maquereaux fait très bien l’affaire.",
      ],
    },
  ],
  retenir: "Mets en avant les huiles de colza, de noix et d’olive, les fruits à coque et le poisson gras deux fois par semaine. Le beurre, la crème, le fromage et la charcuterie restent au menu, en petites quantités.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Anses · Les lipides", url: "https://www.anses.fr/fr/content/les-lipides" },
        { label: "Santé publique France · Recommandations pour les adultes, 2019", url: "https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Hooper et al. · Cochrane, 2020", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8092457/" },
      ],
    },
  ],
};

export default texte;
