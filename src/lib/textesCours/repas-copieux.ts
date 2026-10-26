/* Flash · Après un repas trop copieux
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Une raclette, un repas de famille qui n’en finit pas, un buffet à volonté : tu sors de table le ventre très plein. La suite est plus simple qu’on ne le croit."],
  sections: [
    {
      titre: "Ce qui se passe",
      paragraphes: [
        "Ton estomac s’étire et la digestion prend plusieurs heures : la sensation de lourdeur est normale. Le lendemain, la balance peut afficher un kilo de plus. C’est surtout de l’eau, retenue par le sel et par les glucides mis en réserve, et ce qui est encore en train d’être digéré. Pour fabriquer un kilo de graisse, il faudrait manger plusieurs milliers de calories de plus que ce que tu dépenses.",
      ],
    },
    {
      titre: "Ce qui aide",
      paragraphes: [
        "Une petite marche après le repas aide la digestion et limite la hausse du sucre dans ton sang : en 2022, une analyse d’études a montré que de courtes marches légères réduisaient cette hausse après un repas, mieux que de simplement se lever. Si tu as des remontées acides, attends avant de t’allonger : le NHS conseille de ne pas manger dans les trois ou quatre heures qui précèdent le coucher, et de surélever la tête du lit plutôt que d’empiler les oreillers.",
      ],
    },
    {
      titre: "Pas besoin de compenser",
      paragraphes: [
        "Le lendemain, reprends tes repas habituels : petit-déjeuner, déjeuner, dîner. Sauter des repas pour compenser donne souvent très faim plus tard, et entretient un cycle de privation et de gros repas. Ce qui compte pour ton corps, c’est ce que tu manges sur des semaines, et un repas de fête en fait partie.",
        "Si ces repas te laissent souvent mal, ou si tu t’en veux longtemps après, le cours « Quand manger devient une source d’angoisse » peut t’aider.",
      ],
    },
  ],
  retenir: "Un repas copieux ne fait pas prendre de gras en une soirée : le kilo du lendemain est surtout de l’eau. Une petite marche après le repas aide, et le lendemain, reprends tes repas habituels sans en sauter.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "NHS · Heartburn and acid reflux", url: "https://www.nhs.uk/conditions/heartburn-and-acid-reflux/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Buffey et al. · Sports Medicine, 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9325803/" },
        { label: "Kreitzman, Coxon et Szaz · American Journal of Clinical Nutrition, 1992", url: "https://pubmed.ncbi.nlm.nih.gov/1615908/" },
      ],
    },
  ],
};

export default texte;
