/* Flash · Le sucre rend-il accro ?
   Lot 2, vérifié le 26 octobre 2026 : les affirmations chiffrées et leurs
   sources sont dans docs/cours-nutrition/carnet-lot-2.md. Écrit sur la carte
   blanche de Louis (« va un peu plus vite »), lu par lui dans l’app. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["« Le sucre, c’est comme une drogue » : la formule revient souvent, appuyée par des images de cerveaux qui s’allument. La question mérite une réponse précise, parce qu’elle change la façon de s’y prendre."],
  sections: [
    {
      titre: "Ce que montrent les rats",
      paragraphes: [
        "En 2008, une équipe américaine a résumé des années d’expériences : des rats privés de nourriture douze heures par jour, puis nourris avec de l’eau sucrée et leurs croquettes les douze heures suivantes, se mettaient à avaler de grandes quantités de sucre d’un coup. Leur cerveau montrait des changements proches de ceux observés avec certaines drogues.",
      ],
    },
    {
      titre: "Ce qu’en disent les chercheurs",
      paragraphes: [
        "En 2016, des chercheurs de l’université de Cambridge ont repris ces travaux. Selon eux, ces comportements n’apparaissent que lorsque le sucre est donné par intermittence, et ils viennent sans doute du goût sucré et des aliments très appétissants plutôt que d’un effet du sucre lui-même sur le cerveau. Chez l’humain, ils n’ont pas trouvé de preuves d’une véritable addiction au sucre, et déconseillent de l’inscrire dans les recommandations de santé.",
      ],
    },
    {
      titre: "Le plaisir, et la privation",
      paragraphes: [
        "Le sucre active le circuit du plaisir de ton cerveau, comme le font un bon repas, la musique ou un fou rire : c’est son rôle. Et l’intermittence observée chez les rats ressemble à un schéma très humain, se priver puis se jeter dessus. Les régimes stricts augmentent en général les envies (voir « Faim ou envie : comment faire la différence »).",
      ],
    },
    {
      titre: "Ce qui aide",
      paragraphes: [
        "Si le sucré prend beaucoup de place, plusieurs pistes aident sans rien t’interdire. Des repas réguliers et rassasiants, avec des protéines et des fibres, évitent les grosses faims de fin de journée. Les desserts que tu aimes ont leur place, à table, savourés tranquillement.",
        "Pour le sucre ajouté, l’Organisation mondiale de la santé conseille de limiter les sucres libres à moins de 10 % de l’énergie de la journée, et si possible 5 %, et de réduire petit à petit le goût sucré de l’alimentation dans son ensemble : moins de sucre dans le café, des yaourts nature avec un fruit.",
        "Si tu as souvent l’impression de perdre le contrôle face à la nourriture, parles-en à un médecin : ce problème se soigne (voir « Quand manger devient une source d’angoisse »).",
      ],
    },
  ],
  retenir: "Chez l’humain, les preuves d’une véritable addiction au sucre manquent. L’envie de sucré vient surtout du plaisir et grandit avec la privation. Des repas réguliers, des desserts savourés à table et moins de sucre ajouté aident davantage qu’une interdiction.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "OMS · Recommandation sur l’apport en sucres, 2015", url: "https://www.who.int/news/item/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Westwater, Fletcher et Ziauddeen · European Journal of Nutrition, 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5174153/" },
        { label: "Avena, Rada et Hoebel · Neuroscience & Biobehavioral Reviews, 2008", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2235907/" },
      ],
    },
  ],
};

export default texte;
