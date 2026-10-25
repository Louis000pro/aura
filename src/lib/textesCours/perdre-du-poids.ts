/* Dossier · Perdre du poids : comment ça marche
   Lot 0, vérifié le 25 octobre 2026 : chaque affirmation et ses sources
   sont dans docs/cours-nutrition/carnet-lot-0.md. Texte relu par Louis. */
import type { TexteCours } from "@/lib/coursNutrition";

const texte: TexteCours = {
  intro: ["Sur le papier, perdre du poids tient en une phrase : pendant un certain temps, ton corps doit dépenser un peu plus d’énergie que ce que tu manges. Dans la vie de tous les jours, trois choses compliquent l’affaire. La balance bouge chaque jour pour des raisons qui n’ont rien à voir avec le gras. La perte ralentit au fil des semaines. Et les régimes les plus connus donnent, en moyenne, des résultats presque identiques."],
  sections: [
    {
      titre: "Ce que mesure la balance",
      paragraphes: [
        "La balance additionne tout : ton gras, tes muscles, tes os, l’eau de ton corps et ce qui est en train d’être digéré. D’un jour à l’autre, c’est surtout l’eau qui la fait bouger.",
        "Une partie de cette eau accompagne le glycogène, la réserve de sucre de tes muscles et de ton foie : chaque gramme de glycogène est stocké avec au moins 3 g d’eau. Quand tu manges moins de glucides, tu puises dans cette réserve, et l’eau part avec elle. C’est pour ça que les premiers jours d’un régime pauvre en glucides font souvent baisser la balance très vite. Cette baisse est surtout de l’eau, et elle revient quand tu remanges des glucides.",
        "Le sel joue aussi : il aide le corps à retenir l’eau. Un repas très salé peut faire monter la balance le lendemain sans que ton gras ait bougé.",
        "Si tu te pèses, fais-le dans les mêmes conditions, par exemple le matin au réveil, et regarde la tendance sur plusieurs semaines.",
      ],
    },
    {
      titre: "Le principe, et le calcul qui se trompe",
      paragraphes: [
        "Ton corps tire son énergie de ce que tu manges et de ses réserves. Quand tu manges un peu moins que ce que tu dépenses, il comble la différence en puisant dans ses réserves, dont la graisse. Cet écart s’appelle un déficit calorique.",
        "Tu as peut-être lu qu’un kilo de graisse correspond à 7 700 kcal, et qu’il suffit d’en retirer autant pour perdre un kilo. Ce calcul surestime la perte, et l’erreur grandit avec le temps : il oublie que ton corps change pendant que tu maigris. Un corps plus léger dépense moins d’énergie, ne serait-ce que parce qu’il a moins de poids à porter à chaque pas.",
        "En 2011, une équipe de chercheurs a construit un modèle qui tient compte de ces changements. Son repère : une baisse durable de 100 kcal par jour finit par faire perdre environ 4 kg. La moitié part la première année, et presque tout le reste dans les deux années suivantes. Le calcul des 7 700 kcal, lui, annoncerait près de 5 kg par an, chaque année, sans jamais s’arrêter.",
      ],
    },
    {
      titre: "Vite au début, puis moins vite",
      paragraphes: [
        "Le service de santé britannique, le NHS, conseille de viser une perte régulière de 0,5 à 1 kg par semaine. Ce rythme ne dure pas indéfiniment. Une grande analyse de 80 essais a suivi des personnes qui mangeaient moins de calories, parfois avec un médicament : elles perdaient en moyenne 5 à 8,5 kg pendant les six premiers mois, puis leur poids se stabilisait. Quatre ans plus tard, elles gardaient en moyenne 3 à 6 kg de moins qu’au départ, et aucun groupe n’était revenu à son poids initial.",
        "Ce palier a deux causes connues. La première est physique : un corps plus léger dépense moins. La seconde tient à la durée : suivre un régime pendant des mois demande des efforts, et beaucoup de personnes le suivent de moins près avec le temps.",
        "Les objectifs des médecins sont d’ailleurs modestes. Pour une personne en obésité, la Haute Autorité de santé conseille de viser une perte de 5 à 15 % du poids de départ, et une perte de 5 à 10 % réduit déjà le risque de diabète de type 2. Pour une personne en surpoids, l’objectif premier est de ne pas prendre de poids.",
      ],
    },
    {
      titre: "Ce que montrent les études qui comparent les régimes",
      paragraphes: [
        "En 2018, l’essai DIETFITS a suivi 609 adultes pendant un an. La moitié mangeait pauvre en graisses, l’autre moitié pauvre en glucides, avec des aliments de qualité dans les deux cas. Le premier groupe a perdu en moyenne 5,3 kg, le second 6 kg : un écart trop faible pour départager les deux régimes. Les chercheurs avaient aussi testé deux pistes pour prédire quel régime réussirait à qui, un profil génétique et la production d’insuline. Ni l’une ni l’autre ne prédisait le résultat.",
        "En 2020, une analyse a rassemblé 121 essais sur quatorze régimes connus, comme Atkins, le régime méditerranéen ou le régime DASH. À six mois, la plupart faisaient perdre un peu de poids. À douze mois, l’effet avait diminué pour tous.",
        "Un essai de 2005 a comparé quatre régimes célèbres, dont Atkins et Weight Watchers. Au bout d’un an, environ la moitié des participants avaient abandonné dans deux des groupes. Et la perte de poids suivait le niveau d’adhésion des participants, quel que soit le régime suivi.",
        "En pratique, ces résultats invitent à choisir une façon de manger que tu peux garder plusieurs mois, avec des plats que tu aimes.",
      ],
    },
    {
      titre: "Garder ton muscle",
      paragraphes: [
        "Quand tu perds du poids, tu perds de la graisse, mais aussi un peu de masse maigre, c’est-à-dire de tout ce qui n’est pas de la graisse, muscle compris. Deux choses limitent cette perte.",
        "Les protéines d’abord. Une analyse de 2020 a montré qu’en période de restriction, manger plus de protéines que l’apport minimal recommandé (0,8 g par kilo et par jour) limite la perte de masse maigre. Pour les personnes qui s’entraînent, les recommandations sportives montent jusqu’à 2 g par kilo et par jour pendant une perte de poids.",
        "La musculation ensuite. Chez des personnes âgées en obésité, ajouter de la musculation à un régime a évité 93 % de la perte de masse maigre causée par le régime seul. Chez des adultes en surpoids de tous âges, les programmes qui associent musculation et réduction des calories maintiennent la masse maigre.",
      ],
    },
    {
      titre: "Manger un peu moins sans avoir faim",
      paragraphes: [
        "Les aliments riches en eau et en fibres, comme les légumes, les fruits ou les soupes, prennent de la place dans l’assiette pour peu de calories. La chercheuse Barbara Rolls l’a étudié pendant des années : quand on baisse la densité énergétique d’un repas, c’est-à-dire le nombre de calories par bouchée, les gens mangent spontanément moins de calories.",
        "Les repas riches en protéines rassasient un peu plus. L’effet reste modeste : on se sent plus calé, sans forcément manger moins au repas suivant.",
        "Les produits ultra-transformés poussent à manger plus. Dans un essai de 2019, vingt adultes ont mangé à volonté, pendant deux semaines, des repas ultra-transformés, et pendant deux autres semaines des repas peu transformés. Avec les ultra-transformés, ils mangeaient environ 500 kcal de plus par jour, et ils ont pris 0,9 kg sur ces deux semaines.",
        "Le sommeil compte aussi. Quand des volontaires dorment moins que d’habitude, ils mangent en moyenne 385 kcal de plus par jour, sans dépenser davantage.",
      ],
    },
    {
      titre: "Le rôle du sport",
      paragraphes: ["Faire du sport sans changer son alimentation fait perdre peu de poids : dans la grande analyse de 80 essais, les groupes qui faisaient seulement de l’exercice perdaient très peu. Son rôle est ailleurs. Selon l’American College of Sports Medicine, 150 à 250 minutes d’activité modérée par semaine aident à ne pas prendre de poids, et au-delà de 250 minutes, l’activité aide à garder le poids perdu. La même organisation précise que la musculation ne fait pas perdre plus de poids, mais qu’elle peut augmenter la masse maigre."],
    },
    {
      titre: "Quand en parler à un professionnel",
      paragraphes: ["Parles-en à un médecin ou à un diététicien si tu as une maladie ou un traitement, pendant une grossesse, si tu as moins de 18 ans, ou si tu veux perdre beaucoup de poids. Les régimes à très basses calories, sous 800 kcal par jour, ne conviennent pas à tout le monde : le NHS conseille de les suivre avec un diététicien. Et si la nourriture, la balance ou ton corps prennent beaucoup de place dans tes pensées, ou si tu sautes des repas pour compenser ce que tu as mangé, c’est un bon moment pour en parler."],
    },
  ],
  exemple: ["Lundi matin, ta balance affiche 72,4 kg. Mardi matin, après une raclette entre amis, elle affiche 73,1 kg. Tu n’as pas pris 700 g de graisse en une soirée : il faudrait pour ça manger plusieurs milliers de calories de plus que ce que tu dépenses. La raclette a apporté du sel, des glucides et un repas encore en digestion, donc de l’eau et du poids qui repartent dans les jours suivants. Regarde plutôt la moyenne de la semaine."],
  doute: [
    "Pourquoi deux personnes qui suivent le même régime obtiennent-elles des résultats si différents ? Dans l’essai DIETFITS, les résultats individuels s’étalaient sur une quarantaine de kilos dans chaque groupe, d’une perte d’environ 30 kg à une prise d’environ 10 kg. Ni les gènes testés ni la production d’insuline n’expliquaient ces écarts. La question reste ouverte.",
    "On ne sait pas non plus mesurer avec précision l’adaptation du métabolisme. Certaines études voient la dépense d’énergie baisser plus que prévu après une perte de poids, d’autres non. Quand elle existe, elle représenterait en moyenne autour de 120 kcal par jour, avec de grandes différences d’une personne à l’autre, et son importance pour le résultat final reste discutée.",
  ],
  retenir: "Pour perdre du poids, il faut dépenser un peu plus que ce que tu manges, pendant des mois. Choisis une façon de manger que tu peux garder, mets des protéines dans tes repas, fais de la musculation, et juge tes progrès sur plusieurs semaines.",
  essai: "Choisis un seul changement que tu peux tenir trois semaines : une boisson sucrée en moins par jour, une portion de légumes en plus au dîner, ou une source de protéines au petit-déjeuner. Garde le reste identique, puis regarde ton énergie et la moyenne de ton poids sur ces trois semaines.",
  sources: [
    {
      groupe: "Recommandations officielles",
      liens: [
        { label: "HAS · Surpoids et obésité de l’adulte, 2011", url: "https://www.has-sante.fr/jcms/c_964938/fr/surpoids-et-obesite-de-l-adulte-prise-en-charge-medicale-de-premier-recours" },
        { label: "NHS · Obesity treatment", url: "https://www.nhs.uk/conditions/obesity/treatment/" },
        { label: "ACSM · Activité physique et perte de poids, 2009", url: "https://pubmed.ncbi.nlm.nih.gov/19127177/" },
        { label: "Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM · Nutrition et performance sportive, 2016", url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf" },
      ],
    },
    {
      groupe: "Études",
      liens: [
        { label: "Hall et al. · The Lancet, 2011", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/" },
        { label: "Thomas et al. · International Journal of Obesity, 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4024447/" },
        { label: "Kreitzman, Coxon et Szaz · American Journal of Clinical Nutrition, 1992", url: "https://pubmed.ncbi.nlm.nih.gov/1615908/" },
        { label: "Fernández-Elías et al. · European Journal of Applied Physiology, 2015", url: "https://doi.org/10.1007/s00421-015-3175-z" },
        { label: "Franz et al. · Journal of the American Dietetic Association, 2007", url: "https://doi.org/10.1016/j.jada.2007.07.017" },
        { label: "Gardner et al. (DIETFITS) · JAMA, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5839290/" },
        { label: "Ge et al. · BMJ, 2020", url: "https://www.bmj.com/content/369/bmj.m696" },
        { label: "Dansinger et al. · JAMA, 2005", url: "https://pubmed.ncbi.nlm.nih.gov/15632335/" },
        { label: "Leidy et al. · American Journal of Clinical Nutrition, 2015", url: "https://pubmed.ncbi.nlm.nih.gov/25926512/" },
        { label: "Hudson et al. · Advances in Nutrition, 2020", url: "https://doi.org/10.1093/advances/nmz106" },
        { label: "Sardeli et al. · Nutrients, 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5946208/" },
        { label: "Lopez et al. · Obesity Reviews, 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9285060/" },
        { label: "Rolls · Physiology and Behavior, 2009", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4182946/" },
        { label: "Rolls · Nutrition Bulletin, 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5687574/" },
        { label: "Hall et al. · Cell Metabolism, 2019", url: "https://doi.org/10.1016/j.cmet.2019.05.008" },
        { label: "Al Khatib et al. · European Journal of Clinical Nutrition, 2017", url: "https://doi.org/10.1038/ejcn.2016.201" },
        { label: "Müller et Bosy-Westphal · Obesity, 2013", url: "https://pubmed.ncbi.nlm.nih.gov/23404923/" },
      ],
    },
  ],
};

export default texte;
