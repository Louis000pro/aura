/* Flash · Les compléments pour le sport : ce qui a des preuves
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Brûleurs de graisse, boosters, pré-workouts, acides aminés : les rayons des compléments pour sportifs débordent de promesses. En 2018, le Comité international olympique a réuni des experts pour faire le tri dans les preuves. Leur bilan tient en peu de lignes."],
  sections: [
    {
      titre: "Ce qui a des preuves",
      paragraphes: [
        "Pour la performance, le Comité retient une petite liste : la caféine, la créatine sous forme de monohydrate, le nitrate, le bicarbonate de sodium, et peut-être la bêta-alanine. Même pour ceux-là, les experts parlent de gains modestes, et seulement pour certains types d’efforts. La caféine et la créatine ont chacune leur prise de position de la Société internationale de nutrition du sport, et chacune son cours dans Vaiiya+.",
        "Les poudres de protéines aident à atteindre tes besoins, avec un effet réel quand elles accompagnent la musculation. Les mêmes protéines se trouvent dans les aliments.",
      ],
    },
    {
      titre: "Les brûleurs de graisse",
      paragraphes: [
        "Pour les produits qui promettent de faire fondre la graisse, le Comité juge les preuves très loin d’être concluantes, et le plus souvent absentes. En France, l’Anses a recensé 49 signalements d’effets indésirables liés à des compléments pour le muscle ou la perte de gras, surtout cardiovasculaires, comme un cœur qui s’emballe, des troubles du rythme ou des accidents vasculaires cérébraux, et psychiques, comme de l’anxiété. Elle juge leurs bénéfices « très fortement hypothétiques ».",
      ],
    },
    {
      titre: "Le risque caché",
      paragraphes: [
        "Certains compléments contiennent des substances qui ne figurent pas sur l’étiquette. En 2004, un laboratoire a analysé 634 compléments achetés dans 13 pays : 14,8 % contenaient des stéroïdes anabolisants non déclarés. Une revue de 2026, qui rassemble 44 études, estime que 9 à 15 % des produits testés contiennent des substances interdites ou des médicaments non autorisés, surtout parmi les pré-workouts, les produits minceur et les produits pour le muscle.",
        "Si tu fais de la compétition, l’Agence française de lutte contre le dopage (AFLD) rappelle que tu es responsable de toute substance retrouvée dans ton corps, avec jusqu’à quatre ans de suspension, et qu’aucun complément n’est certifié par elle ou par l’Agence mondiale antidopage. Un produit « naturel » ou « à base de plantes » peut aussi rendre un contrôle positif.",
      ],
    },
    {
      titre: "Si tu en prends",
      paragraphes: [
        "L’AFLD et l’Anses conseillent plusieurs réflexes. Choisis un produit qui porte la mention de la norme NF EN 17444, ou un label de contrôle comme Sport Protect, Informed Sport, NSF ou la liste de Cologne : ces contrôles réduisent le risque sans le supprimer. Achète-le en pharmacie, en magasin ou sur le site du fabricant, plutôt que sur une place de marché. Évite d’en associer plusieurs, garde une photo de la boîte et du numéro de lot, et parles-en à ton médecin ou à ton pharmacien. Si un effet inhabituel apparaît, signale-le-lui.",
        "Devant un pré-workout, retourne la boîte : son effet vient surtout de sa caféine, et l’Anses déconseille les compléments à base de caféine avant et pendant le sport.",
      ],
    },
  ],
  retenir: "Seuls quelques compléments ont des preuves solides, avec des gains modestes, pour des efforts précis. Si tu en achètes un, cherche la norme NF EN 17444 ou un label de contrôle, choisis un circuit sûr, et n’en mélange pas plusieurs.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Comité international olympique · Compléments alimentaires et sport de haut niveau, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867441/" },
        { label: "Anses · Compléments alimentaires pour sportifs, 2016", url: "https://www.anses.fr/fr/actualite/complements-alimentaires-destines-aux-sportifs-risques-sante-benefices-incertains" },
        { label: "Anses · Avis sur les compléments pour sportifs, 2016", url: "https://www.anses.fr/fr/system/files/NUT2014SA0008Ra.pdf" },
        { label: "AFLD · Compléments alimentaires", url: "https://www.afld.fr/complements-alimentaires/" },
        { label: "ISSN · Créatine, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/" },
        { label: "ISSN · Caféine et performance, 2021", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Geyer et al. · International Journal of Sports Medicine, 2004", url: "https://pubmed.ncbi.nlm.nih.gov/14986195/" },
        { label: "Al-Saad et al. · Frontiers in Sports and Active Living, 2026", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13021601/" },
        { label: "Morton et al. · British Journal of Sports Medicine, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/" },
      ],
    },
  ],
};

export default texte;
