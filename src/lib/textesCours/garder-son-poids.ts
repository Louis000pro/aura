/* Flash · Garder son poids après l’avoir perdu
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Perdre du poids et le garder sont deux étapes différentes. La seconde a mauvaise réputation, et pourtant les études montrent qu’environ une personne en surpoids sur cinq garde une perte d’au moins 10 % de son poids pendant au moins un an."],
  sections: [
    {
      titre: "Ce que font les personnes qui le gardent",
      paragraphes: [
        "Aux États-Unis, le National Weight Control Registry suit depuis les années 1990 des personnes qui ont perdu au moins 13,6 kg et les ont gardés au moins un an. Ses membres ont perdu en moyenne 33 kg, gardés plus de cinq ans. La plupart décrivent les mêmes habitudes : environ une heure d’activité physique par jour, un petit-déjeuner régulier, une pesée fréquente, et une alimentation assez semblable la semaine et le week-end.",
        "Ce registre a une limite : il réunit des volontaires qui ont réussi, et on ne sait pas si ces habitudes sont la cause de leur réussite ou si elles l’accompagnent. Le petit-déjeuner, par exemple, ne change pas le poids dans les essais (voir « Faut-il prendre un petit-déjeuner ? ») : chez ces personnes, il traduit sans doute surtout un rythme de repas régulier.",
      ],
    },
    {
      titre: "Le sport compte davantage",
      paragraphes: [
        "Pour perdre du poids, le sport seul fait peu. Pour le garder, il compte davantage : selon l’American College of Sports Medicine, au-delà de 250 minutes d’activité modérée par semaine, l’activité aide à ne pas reprendre le poids perdu.",
      ],
    },
    {
      titre: "Ça devient plus facile avec le temps",
      paragraphes: [
        "Le registre apporte une bonne nouvelle : après deux à cinq ans de poids stable, les chances de le garder encore augmentent nettement.",
      ],
    },
    {
      titre: "Si quelques kilos reviennent",
      paragraphes: [
        "Reprendre un peu est fréquent. Dans une grande analyse de 80 essais, les participants avaient repris une partie du poids perdu après quatre ans, mais gardaient en moyenne 3 à 6 kg de moins qu’au départ. Le plus utile est de réagir tôt : quand la moyenne de tes pesées remonte de quelques kilos, reprends les habitudes qui t’avaient aidé, sans repartir dans un régime strict.",
      ],
    },
  ],
  retenir: "Garder un poids perdu est possible. Les personnes qui y arrivent bougent beaucoup, gardent des repas réguliers, se pèsent souvent et mangent à peu près pareil toute la semaine. Après deux à cinq ans, ça devient plus facile.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "ACSM · Activité physique et poids, 2009", url: "https://pubmed.ncbi.nlm.nih.gov/19127177/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Wing et Phelan · American Journal of Clinical Nutrition, 2005", url: "https://pubmed.ncbi.nlm.nih.gov/16002825/" },
        { label: "Franz et al. · Journal of the American Dietetic Association, 2007", url: "https://doi.org/10.1016/j.jada.2007.07.017" },
      ],
    },
  ],
};

export default texte;
