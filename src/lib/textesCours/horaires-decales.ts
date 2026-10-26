/* Flash · Manger en horaires décalés
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Dans les hôpitaux, les transports, la sécurité ou l’industrie, beaucoup de personnes travaillent de nuit ou en horaires tournants. Manger devient alors un casse-tête : à quelle heure déjeuner quand on se lève à 15 h ?"],
  sections: [
    {
      titre: "Ton horloge interne",
      paragraphes: [
        "Ton corps suit une horloge interne d’environ 24 heures, réglée surtout par la lumière, qui prépare ta digestion pour la journée. Les études qui suivent des travailleurs pendant des années trouvent un peu plus de diabète de type 2 chez ceux qui travaillent en horaires décalés : en 2015, une analyse de douze études, qui réunissaient plus de 220 000 personnes, estimait ce risque 9 % plus élevé.",
      ],
    },
    {
      titre: "Ce que montre un essai",
      paragraphes: [
        "En 2021, des chercheurs américains ont simulé deux semaines de travail de nuit chez de jeunes adultes en bonne santé. Chez ceux qui mangeaient la nuit, le corps gérait moins bien le sucre. Ceux qui gardaient leurs repas en journée évitaient cette dégradation, alors qu’ils restaient éveillés la nuit eux aussi.",
      ],
    },
    {
      titre: "Pour une nuit de travail",
      paragraphes: [
        "Prends un vrai repas avant ton service, en fin d’après-midi ou en début de soirée. Pendant la nuit, préfère une collation légère à un gros repas, surtout entre minuit et 6 h : un yaourt, un fruit, une soupe, une tartine. Après le service, un petit-déjeuner léger t’évite d’aller te coucher avec la faim, sans t’alourdir avant de dormir.",
        "La caféine aide à rester vigilant en début de service. Évite-la dans les six heures qui précèdent ton sommeil : dans une étude de 2013, une forte dose de caféine prise six heures avant le coucher réduisait encore le sommeil de plus d’une heure.",
        "Prépare tes repas à l’avance quand tu peux : la nuit, les distributeurs proposent surtout des produits sucrés et salés. Et bois régulièrement.",
      ],
    },
    {
      titre: "Les jours de repos",
      paragraphes: [
        "Les jours sans travail, reprends un rythme de jour quand c’est possible, avec des repas à heures régulières. La lumière du matin aide ton horloge à se recaler.",
      ],
    },
  ],
  retenir: "En horaires de nuit, prends un vrai repas avant ton service, des collations légères pendant la nuit, surtout entre minuit et 6 h, et un petit-déjeuner léger avant de dormir. Arrête la caféine dans les six heures qui précèdent ton sommeil.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Gan et al. · Occupational and Environmental Medicine, 2015", url: "https://pubmed.ncbi.nlm.nih.gov/25030030/" },
        { label: "Chellappa et al. · Science Advances, 2021", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8641939/" },
        { label: "Drake et al. · Journal of Clinical Sleep Medicine, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/" },
      ],
    },
  ],
};

export default texte;
