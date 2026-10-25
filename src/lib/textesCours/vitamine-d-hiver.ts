/* Flash · La vitamine D en hiver
   Lot 1, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-1.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["La vitamine D aide ton corps à absorber le calcium et le phosphore, pour tes os, tes dents et tes muscles. Elle a deux sources : ce que tu manges, et ta peau, qui la fabrique quand le soleil la touche."],
  sections: [
    {
      titre: "L’hiver du soleil",
      paragraphes: [
        "Plus on s’éloigne de l’équateur, plus l’hiver prive la peau de ce soleil. En 1988, des chercheurs ont mesuré qu’à Boston, à la latitude de Perpignan, la peau ne fabriquait plus de vitamine D de novembre à février. À Edmonton, au Canada, plus au nord que Lille, la pause allait d’octobre à mars. La France se situe entre les deux. Au Royaume-Uni, le NHS estime que le soleil ne suffit pas d’octobre à début mars.",
      ],
    },
    {
      titre: "Ce que tu manges",
      paragraphes: [
        "L’Anses fixe la référence à 15 microgrammes par jour pour un adulte, en ne comptant que l’alimentation. Les adultes en France en mangent en moyenne 3,1 microgrammes. Les meilleures sources sont les poissons gras, comme le hareng, la sardine, le saumon ou le maquereau, puis le jaune d’œuf, certains champignons et les produits enrichis. L’Anses conseille deux portions de poisson par semaine, dont une de poisson gras.",
      ],
    },
    {
      titre: "Et les compléments ?",
      paragraphes: [
        "Le NHS conseille à tout le monde d’envisager 10 microgrammes par jour en automne et en hiver, soit 400 UI. En France, l’Anses rappelle qu’on peut avoir assez de vitamine D grâce au soleil et à l’alimentation, et cite des personnes plus à risque d’en manquer : les personnes âgées, les femmes enceintes ou ménopausées, les peaux mates ou foncées, ou une alimentation sans produits animaux. Pour les bébés, elle conseille un médicament prescrit, après des cas de surdosage avec des compléments.",
        "Chez une personne en bonne santé, l’intérêt d’un complément reste à prouver : dans le grand essai américain VITAL, 2 000 UI par jour pendant cinq ans n’ont réduit ni les cancers, ni les accidents cardiovasculaires, ni les fractures.",
        "L’excès existe : au-delà de 100 microgrammes par jour chez l’adulte, la limite de sécurité européenne est dépassée, avec un risque de trop de calcium dans le sang. Parles-en à ton médecin ou à ton pharmacien avant d’en prendre.",
      ],
    },
  ],
  retenir: "En hiver, ta vitamine D vient surtout de ton assiette : du poisson gras une fois par semaine, des œufs. Si tu envisages un complément, demande conseil, et ne dépasse jamais 100 microgrammes par jour.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "Anses · Vitamine D, assurer un apport suffisant", url: "https://www.anses.fr/fr/article/vitamine-pourquoi-comment-assurer-apport-suffisant" },
        { label: "NHS · Vitamin D", url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/" },
        { label: "EFSA · Limite supérieure de vitamine D, 2023", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10407748/" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Webb, Kline et Holick · Journal of Clinical Endocrinology & Metabolism, 1988", url: "https://pubmed.ncbi.nlm.nih.gov/2839537/" },
        { label: "Manson et al. (VITAL) · New England Journal of Medicine, 2019", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6425757/" },
        { label: "LeBoff et al. (VITAL) · New England Journal of Medicine, 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9716639/" },
      ],
    },
  ],
};

export default texte;
