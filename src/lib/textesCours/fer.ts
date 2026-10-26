/* Flash · Le fer : qui en manque, et pourquoi
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Une fatigue qui ne passe pas, un souffle court dans les escaliers : on pense vite à un manque de fer. Selon l’Organisation mondiale de la santé, 30 % des femmes de 15 à 49 ans ont une anémie dans le monde, et le manque de fer en est la cause nutritionnelle la plus fréquente."],
  sections: [
    {
      titre: "À quoi il sert",
      paragraphes: [
        "Le fer sert surtout à fabriquer l’hémoglobine, la protéine de tes globules rouges qui transporte l’oxygène vers tes muscles et tes organes. Quand il manque, ton sang transporte moins bien l’oxygène : c’est l’anémie par manque de fer. Elle peut donner de la fatigue, un essoufflement, des maux de tête, des vertiges, un cœur qui bat fort et une peau plus pâle que d’habitude.",
      ],
    },
    {
      titre: "Qui en manque le plus souvent",
      paragraphes: [
        "D’après l’Anses, les besoins sont plus élevés pendant la croissance et la grossesse, et chez les femmes qui ont des règles abondantes. Une mauvaise absorption, par exemple à cause d’une inflammation, ou des saignements dans l’intestin peuvent aussi en être la cause.",
        "Le service de santé britannique, le NHS, conseille 8,7 mg de fer par jour aux hommes adultes, et 14,8 mg aux femmes de 19 à 49 ans : presque le double, à cause des règles.",
      ],
    },
    {
      titre: "Deux formes de fer",
      paragraphes: [
        "Le fer existe sous deux formes. Le fer héminique se trouve seulement dans les aliments d’origine animale : la viande, le foie, le poisson et les fruits de mer. Ton corps l’absorbe mieux. Le fer non héminique se trouve presque partout, aussi dans les légumes secs, les céréales, les noix, le jaune d’œuf et les légumes à feuilles vertes, mais ton intestin en retient une plus petite part.",
        "La vitamine C aide à absorber ce second fer, et les tanins du thé le freinent. Un fruit ou des crudités au repas aident donc, et le thé ou le café passent mieux à distance des repas qu’avec.",
      ],
    },
    {
      titre: "Avant de prendre du fer",
      paragraphes: [
        "Si la fatigue dure, parles-en à un médecin. Une prise de sang dira s’il manque du fer, et surtout pourquoi : la cause compte autant que le manque.",
        "Prendre du fer sans savoir n’est pas une bonne idée. Au-delà de 20 mg par jour, les compléments peuvent donner constipation, nausées ou maux de ventre, et de très fortes doses peuvent être mortelles pour un enfant : garde les comprimés hors de sa portée. Une maladie génétique, l’hémochromatose, fait au contraire absorber trop de fer, qui s’accumule dans le corps.",
      ],
    },
  ],
  retenir: "Le fer transporte l’oxygène. Il manque surtout pendant la croissance, la grossesse et en cas de règles abondantes. Le fer des aliments d’origine animale s’absorbe mieux, la vitamine C aide l’autre et le thé le freine. Une fatigue qui dure se vérifie par une prise de sang avant de prendre du fer.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Anses · Tout savoir sur le fer", url: "https://www.anses.fr/fr/content/le-fer" },
        { label: "NHS · Iron", url: "https://www.nhs.uk/conditions/vitamins-and-minerals/iron/" },
        { label: "OMS · L’anémie", url: "https://www.who.int/news-room/fact-sheets/detail/anaemia" },
      ],
    },
  ],
};

export default texte;
