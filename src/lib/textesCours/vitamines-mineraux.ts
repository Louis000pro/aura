/* Flash · Vitamines et minéraux : ce qu’une assiette variée couvre
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Treize vitamines, une quinzaine de minéraux : la liste donne le vertige, et les rayons de compléments en profitent. Le NHS, le service de santé britannique, résume la situation en une phrase : la plupart des gens trouvent tout ce dont ils ont besoin dans une alimentation variée et équilibrée."],
  sections: [
    {
      titre: "Ce que fait la variété",
      paragraphes: [
        "Chaque famille d’aliments apporte sa part. Les fruits et légumes apportent de la vitamine C, des folates et du potassium. Les céréales complètes et les légumes secs, des vitamines B, du magnésium et du fer. Les produits laitiers, du calcium. La viande, le poisson et les œufs, du fer, du zinc et de la vitamine B12. Les poissons gras, de la vitamine D. Les fruits à coque, de la vitamine E et du magnésium.",
        "Manger un peu de tout, avec des couleurs différentes dans l’assiette, couvre ainsi la plupart des besoins sans rien compter.",
      ],
    },
    {
      titre: "Les cas où un complément se discute",
      paragraphes: [
        "La vitamine D en hiver d’abord : en France, d’octobre à mars, ta peau en fabrique très peu, et un flash lui est consacré.",
        "La vitamine B12 ensuite, si tu ne manges aucun produit d’origine animale : elle ne se trouve presque que dans ces aliments, et le NHS conseille aux personnes véganes des aliments enrichis ou un complément.",
        "L’acide folique, ou vitamine B9, si tu prévois une grossesse : le NHS le conseille, avec la vitamine D, dès que tu essaies d’avoir un enfant. Parles-en à ton médecin ou à ta sage-femme.",
        "L’iode : il vient surtout du sel iodé, des produits laitiers et du poisson, et Santé publique France conseille de choisir du sel iodé.",
        "Le fer enfin, seulement si une prise de sang montre un manque.",
      ],
    },
    {
      titre: "Les comprimés ne remplacent pas l’assiette",
      paragraphes: [
        "Chez les adultes en bonne santé, les multivitamines n’ont pas montré qu’elles protégeaient du cancer ou des maladies du cœur. En 2022, le groupe d’experts qui conseille le gouvernement américain sur la prévention a jugé les preuves insuffisantes pour les multivitamines, et déconseillé le bêta-carotène et la vitamine E pour cet usage : pour le bêta-carotène, les risques l’emportent même sur les bénéfices.",
        "Plus n’est pas mieux : à forte dose, certaines vitamines, comme la A ou la D, deviennent toxiques.",
      ],
    },
  ],
  retenir: "Une alimentation variée couvre les besoins de la plupart des gens. Les vraies exceptions sont la vitamine D en hiver, la B12 sans produits animaux, l’acide folique quand une grossesse se prépare, et le fer quand une prise de sang montre un manque.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "NHS · Vitamins and minerals", url: "https://www.nhs.uk/conditions/vitamins-and-minerals/" },
        { label: "NHS · The vegan diet", url: "https://www.nhs.uk/live-well/eat-well/how-to-eat-a-balanced-diet/the-vegan-diet/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "US Preventive Services Task Force · Vitamines et prévention, JAMA, 2022", url: "https://jamanetwork.com/journals/jama/fullarticle/2793446" },
      ],
    },
  ],
};

export default texte;
