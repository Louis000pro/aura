/* Flash · Faim ou envie : comment faire la différence
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Il est 16 h et tu as envie de chocolat. Faim ou envie ? Les chercheurs distinguent les deux, même si elles se mélangent souvent dans la vie de tous les jours. Savoir laquelle parle t’aide à choisir ce que tu manges."],
  sections: [
    {
      titre: "La faim, un signal de ton corps",
      paragraphes: [
        "La faim répond à un besoin d’énergie, et ton corps l’annonce avec des hormones. La plus connue, la ghréline, est produite surtout par ton estomac. Dans une étude de 2001, son taux doublait presque juste avant chaque repas pris à heure fixe, puis retombait dans l’heure qui suivait : ton corps se prépare au repas qu’il attend.",
      ],
    },
    {
      titre: "L’envie, une affaire de plaisir",
      paragraphes: [
        "L’envie, elle, vise le plaisir. Les chercheurs parlent de faim hédonique : une part de ce que nous mangeons répond au goût et au plaisir, en plus du besoin d’énergie.",
        "Une envie est souvent intense et vise un aliment précis : ce chocolat-là. Elle est très fréquente, et naît de pensées, d’habitudes apprises, d’une odeur, d’une publicité ou d’un coup de moins bien. Une revue de 2007 note que l’idée d’une envie qui signalerait un manque précis de nutriment n’est pas confirmée par les études.",
      ],
    },
    {
      titre: "Interdire un aliment le rend plus désirable",
      paragraphes: [
        "La même revue relève un effet que beaucoup reconnaîtront : se priver d’un aliment précis s’accompagne souvent d’une envie plus forte de cet aliment, et les régimes stricts augmentent en général les envies.",
      ],
    },
    {
      titre: "Ce qui pousse à manger plus",
      paragraphes: [
        "Deux choses font manger plus sans qu’on s’en rende compte. La distraction d’abord : une analyse de 24 études montre que manger devant un écran ou en faisant autre chose augmente un peu ce qu’on mange au repas, et davantage ce qu’on mange ensuite. À l’inverse, se souvenir de son repas fait manger moins plus tard. La taille des portions ensuite : de plus grandes assiettes et de plus grands paquets font manger davantage.",
      ],
    },
    {
      titre: "Deux questions pour y voir clair",
      paragraphes: [
        "Quand l’envie arrive, deux questions aident. Depuis quand as-tu mangé ? Et un autre aliment te tenterait-il, une tartine, un fruit, un yaourt ? Si plusieurs aliments te tentent et que ton dernier repas est loin, c’est sans doute la faim, et un vrai goûter y répond. Si c’est ce chocolat et rien d’autre, c’est plutôt une envie.",
        "Une envie n’a rien de honteux. Santé publique France conseille de prendre plaisir à manger et de prendre le temps de déguster. Prends le chocolat, mets-le dans une assiette, éteins l’écran, et savoure-le à table.",
      ],
    },
    {
      titre: "Quand en parler",
      paragraphes: [
        "Si la nourriture prend beaucoup de place dans tes pensées, si tu manges parfois de grandes quantités sans pouvoir t’arrêter, ou si tu compenses ce que tu as mangé en sautant des repas, tu peux en parler à un médecin. La ligne d’écoute Anorexie Boulimie Info Écoute répond aussi au 0810 037 037, quatre jours par semaine de 16 h à 18 h, pour 0,06 € la minute en plus du prix d’un appel local.",
      ],
    },
  ],
  retenir: "La faim et l’envie sont normales toutes les deux. Repérer laquelle parle t’aide à choisir : un repas ou un goûter pour la faim, un plaisir savouré sans écran pour l’envie.",
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
        { label: "Hill · Proceedings of the Nutrition Society, 2007", url: "https://pubmed.ncbi.nlm.nih.gov/17466108/" },
        { label: "Lowe et Butryn · Physiology & Behavior, 2007", url: "https://pubmed.ncbi.nlm.nih.gov/17531274/" },
        { label: "Cummings et al. · Diabetes, 2001", url: "https://pubmed.ncbi.nlm.nih.gov/11473029/" },
        { label: "Robinson et al. · American Journal of Clinical Nutrition, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3607652/" },
        { label: "Hollands et al. · Cochrane, 2015", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4579823/" },
      ],
    },
    {
      groupe: "Pour trouver de l’aide",
      liens: [
        { label: "FFAB · Anorexie Boulimie Info Écoute", url: "https://www.ffab.fr/trouver-de-l-aide/permanence-telephonique" },
      ],
    },
  ],
};

export default texte;
