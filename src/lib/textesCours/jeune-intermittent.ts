/* Cours · Le jeûne intermittent
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Le jeûne intermittent est l’une des méthodes les plus suivies de ces dernières années. Le principe : alterner des périodes où l’on mange et des périodes où l’on ne mange pas, ou très peu. On lui prête des effets qui iraient au-delà de la perte de poids. Les essais commencent à répondre."],
  sections: [
    {
      titre: "Les trois grandes formes",
      paragraphes: [
        "Le jeûne de seize heures, ou 16:8, est le plus connu : tous tes repas tiennent dans une plage de huit heures, par exemple de midi à 20 h. Les chercheurs parlent d’alimentation à horaires restreints.",
        "Le 5:2 consiste à manger environ 500 à 600 kcal deux jours par semaine, et normalement les cinq autres jours.",
        "Le jeûne un jour sur deux fait alterner un jour normal et un jour très réduit.",
      ],
    },
    {
      titre: "Sur le poids : comme un régime classique",
      paragraphes: [
        "En 2020, l’essai TREAT a suivi 116 adultes en surpoids pendant douze semaines. Les uns mangeaient seulement entre midi et 20 h, les autres prenaient trois repas par jour. Le premier groupe a perdu 0,94 kg, le second 0,68 kg : un écart trop faible pour départager les deux. Sans autre changement, le jeûne de seize heures ne faisait pas mieux que trois repas.",
        "En 2022, un essai chinois publié dans le New England Journal of Medicine a suivi 139 adultes en obésité pendant un an. Tous mangeaient moins de calories ; la moitié devait en plus manger entre 8 h et 16 h seulement. Le groupe à horaires restreints a perdu 8 kg en moyenne, l’autre 6,3 kg, une différence qui pouvait être due au hasard. Le tour de taille, la masse grasse et les marqueurs de santé évoluaient de la même façon dans les deux groupes.",
        "Le jeûne un jour sur deux a été comparé à un régime classique en 2017, pendant un an, chez 100 adultes en obésité. La perte de poids était semblable, mais les abandons étaient plus nombreux dans le groupe du jeûne, 38 % contre 29 %. Les participants mangeaient plus que prévu les jours de jeûne, et moins les autres jours. Au bout d’un an, leur LDL avait un peu augmenté.",
        "En résumé, le jeûne intermittent fait perdre du poids quand il fait manger moins, et à peu près autant qu’un régime classique. Certaines personnes trouvent plus simple de ne pas manger pendant une plage horaire que de réduire chaque repas, et c’est une raison valable de le choisir.",
      ],
    },
    {
      titre: "Sur la santé",
      paragraphes: [
        "Les effets annoncés au-delà du poids viennent surtout de petits essais. En 2018, un essai sur des hommes prédiabétiques a testé une forme très précoce : tous les repas entre le matin et 15 h. Même sans perdre de poids, leur sensibilité à l’insuline et leur tension s’amélioraient. Dans les grands essais, comme celui de 2022, les marqueurs de santé évoluaient comme avec un régime classique.",
        "Les études sur l’heure des repas vont dans le même sens : à calories égales, l’heure change peu le poids (voir « Manger tard fait-il grossir ? »).",
      ],
    },
    {
      titre: "Sur le muscle et le sport",
      paragraphes: [
        "Moins de repas veut dire moins d’occasions de prendre des protéines. Si tu jeûnes et fais de la musculation, place ta séance dans ta plage de repas ou juste avant, et répartis tes protéines sur deux ou trois repas qui en contiennent bien.",
        "Pour un effort d’endurance de plus d’une heure, s’entraîner à la fin d’un jeûne peut faire baisser ta performance (voir « S’entraîner à jeun »).",
      ],
    },
    {
      titre: "À qui il ne convient pas",
      paragraphes: [
        "Le jeûne intermittent est déconseillé pendant une grossesse ou l’allaitement, chez les enfants et les adolescents, en cas de diabète traité par insuline ou par certains comprimés, à cause du risque d’hypoglycémie, et en cas de troubles du comportement alimentaire, actuels ou passés : sauter des repas peut les réveiller. En cas de maladie ou de traitement, demande l’avis de ton médecin.",
      ],
    },
    {
      titre: "Si tu veux essayer",
      paragraphes: [
        "Commence doucement : douze heures sans manger la nuit, puis quatorze, puis seize si ça te convient. Pendant le jeûne, l’eau, le thé et le café sans sucre sont permis. Pendant la plage de repas, garde des repas complets, avec des légumes, des protéines et des féculents.",
        "Si tu deviens irritable, que tu dors moins bien ou que tu penses à la nourriture toute la journée, cette méthode ne te convient peut-être pas, et d’autres façons de manger feront aussi bien.",
      ],
    },
  ],
  retenir: "Le jeûne intermittent fait perdre du poids à peu près comme un régime classique, quand il fait manger moins. Ses autres bienfaits viennent surtout de petits essais. Il ne convient pas pendant une grossesse, aux adolescents, en cas de diabète traité ou de troubles alimentaires. Si tu l’essaies, garde des repas complets.",
  sources: [
    {
      groupe: "Études",
      liens: [
        { label: "Lowe et al. (TREAT) · JAMA Internal Medicine, 2020", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7522780/" },
        { label: "Liu et al. · New England Journal of Medicine, 2022", url: "https://pubmed.ncbi.nlm.nih.gov/35443107/" },
        { label: "Trepanowski et al. · JAMA Internal Medicine, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5680777/" },
        { label: "Sutton et al. · Cell Metabolism, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5990470/" },
      ],
    },
  ],
};

export default texte;
