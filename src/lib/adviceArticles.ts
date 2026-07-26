/* ════════════════════════════════════════════════════════════════════
   Conseils & progresser — bibliothèque éditoriale Vaiiya.

   Voix validée avec Louis le 2026-07-26 :
   - pilier : coach franc et complice ;
   - garde-fou : expertise simple et précise ;
   - structure : mini-cours lisibles en 2 à 4 minutes ;
   - chaleur : jamais de culpabilisation.

   Les sources sont montrées en fin de lecture. Elles servent de repères,
   pas d'arguments d'autorité plaqués au milieu de la conversation.
   ════════════════════════════════════════════════════════════════════ */

export type AdviceTheme =
  | "Entraînement"
  | "Progression"
  | "Récupération"
  | "Nutrition"
  | "Mental & confiance";

export const ADVICE_THEMES: AdviceTheme[] = [
  "Entraînement",
  "Progression",
  "Récupération",
  "Nutrition",
  "Mental & confiance",
];

export type AdviceSource = {
  label: string;
  url: string;
};

export type AdviceSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type AdviceArticle = {
  id: string;
  title: string;
  subtitle: string;
  theme: AdviceTheme;
  readingMinutes: 2 | 3 | 4;
  access: "free" | "premium";
  image: string;
  imagePosition?: string;
  intro: string;
  sections: AdviceSection[];
  takeaway: string;
  tryThis: string;
  sources: AdviceSource[];
};

const SOURCES = {
  acsm2026: {
    label: "ACSM — recommandations 2026 sur la musculation",
    url: "https://acsm.org/resistance-training-guidelines-update-2026/",
  },
  whoActivity: {
    label: "OMS — recommandations sur l’activité physique",
    url: "https://www.who.int/publications/i/item/9789240014886",
  },
  sleep: {
    label: "AASM & Sleep Research Society — durée de sommeil chez l’adulte",
    url: "https://aasm.org/resources/pdf/pressroom/adult-sleep-duration-consensus.pdf",
  },
  protein: {
    label: "ISSN — protéines et exercice",
    url: "https://pubmed.ncbi.nlm.nih.gov/28642676/",
  },
  nutrition: {
    label: "Academy of Nutrition, Dietitians of Canada & ACSM — nutrition et performance",
    url: "https://pubmed.ncbi.nlm.nih.gov/26891166/",
  },
  creatine: {
    label: "ISSN — efficacité et sécurité de la créatine",
    url: "https://pubmed.ncbi.nlm.nih.gov/28615996/",
  },
  failure: {
    label: "Grgic et al. — entraînement à l’échec ou non",
    url: "https://pubmed.ncbi.nlm.nih.gov/33497853/",
  },
  proximity: {
    label: "Refalo et al. — proximité de l’échec et hypertrophie",
    url: "https://pubmed.ncbi.nlm.nih.gov/36334240/",
  },
  rest: {
    label: "Singer et al. — durée du repos entre les séries",
    url: "https://pubmed.ncbi.nlm.nih.gov/39205815/",
  },
  soreness: {
    label: "Damas et al. — dommages musculaires et hypertrophie",
    url: "https://pubmed.ncbi.nlm.nih.gov/29282529/",
  },
  warmup: {
    label: "Kłobuchowski et al. — échauffement, performance et prévention",
    url: "https://pubmed.ncbi.nlm.nih.gov/42188564/",
  },
  hydration: {
    label: "NATA — hydratation des personnes actives",
    url: "https://pubmed.ncbi.nlm.nih.gov/28985128/",
  },
  adherence: {
    label: "Teixeira et al. — motivation autonome et régularité",
    url: "https://pubmed.ncbi.nlm.nih.gov/30459690/",
  },
  intentions: {
    label: "Silva et al. — intentions concrètes et activité physique",
    url: "https://pubmed.ncbi.nlm.nih.gov/30427874/",
  },
  bodyImage: {
    label: "Guest et al. — interventions et image corporelle positive",
    url: "https://pubmed.ncbi.nlm.nih.gov/31077956/",
  },
  cycle: {
    label: "McNulty et al. — cycle menstruel et performance",
    url: "https://pubmed.ncbi.nlm.nih.gov/32661839/",
  },
  frequency: {
    label: "Schoenfeld et al. — fréquence et hypertrophie à volume égal",
    url: "https://pubmed.ncbi.nlm.nih.gov/30558493/",
  },
  split: {
    label: "Ramos-Campo et al. — full body ou split",
    url: "https://pubmed.ncbi.nlm.nih.gov/38595233/",
  },
  periodization: {
    label: "Moesgaard et al. — périodisation, force et hypertrophie",
    url: "https://pubmed.ncbi.nlm.nih.gov/35044672/",
  },
  diets: {
    label: "ISSN — alimentation et composition corporelle",
    url: "https://pubmed.ncbi.nlm.nih.gov/28630601/",
  },
} satisfies Record<string, AdviceSource>;

export const ADVICE_ARTICLES: AdviceArticle[] = [
  {
    id: "conseil-pas-se-detruire",
    title: "Non, tu n’as pas besoin de te détruire",
    subtitle: "Une bonne séance ne se mesure pas à l’état dans lequel elle te laisse.",
    theme: "Entraînement",
    readingMinutes: 3,
    access: "free",
    image: "full-slam",
    intro: "On va casser une idée tenace : finir au sol n’est pas une preuve de qualité. C’est parfois juste la preuve que la séance était très fatigante.",
    sections: [
      {
        title: "La fatigue n’est pas le résultat",
        paragraphs: [
          "Transpirer, trembler ou avoir le souffle court décrit ce que tu ressens maintenant. Le progrès, lui, se construit après : ton corps s’adapte à un effort qu’il pourra rencontrer de nouveau.",
          "Une séance spectaculaire mais impossible à répéter peut être moins utile qu’une séance simple, bien dosée et présente chaque semaine.",
        ],
      },
      {
        title: "Cherche la séance reproductible",
        paragraphs: [
          "La plupart du temps, termine tes séries avec encore un peu de marge et une technique propre. Tu dois sentir que tu as travaillé, pas que tu viens de négocier avec ta survie.",
          "Les méthodes extrêmes peuvent avoir une place ponctuelle. Elles ne sont pas le ticket d’entrée obligatoire vers les résultats.",
        ],
      },
      {
        title: "Le test du lendemain",
        paragraphs: [
          "Demande-toi simplement : « Est-ce que cette séance me donne une chance raisonnable de revenir ? » Si oui, tu es probablement plus proche du bon dosage que tu ne le crois.",
        ],
      },
    ],
    takeaway: "Une bonne séance stimule aujourd’hui sans voler toutes les suivantes.",
    tryThis: "À ta prochaine séance, arrête une série importante quand tu estimes pouvoir encore faire 2 répétitions propres.",
    sources: [SOURCES.acsm2026, SOURCES.failure],
  },
  {
    id: "conseil-seance-courte",
    title: "Oui, une séance de 12 minutes compte",
    subtitle: "Le format réduit n’est pas une version honteuse de l’entraînement.",
    theme: "Mental & confiance",
    readingMinutes: 2,
    access: "free",
    image: "improvise",
    imagePosition: "center 42%",
    intro: "Tu as douze minutes, pas une heure. Mauvaise nouvelle pour ton programme parfait. Excellente nouvelle pour ta vraie vie : tu peux quand même faire quelque chose d’utile.",
    sections: [
      {
        title: "Petit ne veut pas dire inutile",
        paragraphs: [
          "Passer de rien à un peu d’activité apporte déjà une grande partie du bénéfice. Deux ou trois mouvements bien choisis peuvent entretenir ta force, ton souffle et surtout ton lien avec l’habitude.",
        ],
      },
      {
        title: "Coupe le décor, garde l’essentiel",
        paragraphs: [
          "Choisis un mouvement de jambes, un mouvement du haut du corps et un mouvement de gainage. Fais-les proprement, avec peu d’attente inutile. C’est une séance courte, pas une séance bâclée.",
        ],
      },
      {
        title: "Aucun remboursement à prévoir",
        paragraphs: [
          "Tu n’as pas à « rattraper » le temps manquant le lendemain. La séance a existé, point. Reprends simplement ton rythme habituel quand ton agenda te le permet.",
        ],
      },
    ],
    takeaway: "La durée idéale est celle que tu peux réellement utiliser aujourd’hui.",
    tryThis: "Prépare ton trio de secours : jambes, poussée ou tirage, gainage. Il sera prêt les jours chargés.",
    sources: [SOURCES.acsm2026, SOURCES.whoActivity],
  },
  {
    id: "conseil-progresser-simple",
    title: "Progresser sans refaire tout ton programme",
    subtitle: "Parfois, une répétition de plus suffit largement.",
    theme: "Progression",
    readingMinutes: 3,
    access: "free",
    image: "legs-goblet",
    intro: "Quand les résultats ralentissent, la tentation est grande de changer les exercices, les jours, les méthodes et probablement la couleur de la gourde. Respire : progresser demande souvent beaucoup moins de cinéma.",
    sections: [
      {
        title: "Rends un détail un peu plus exigeant",
        paragraphs: [
          "La surcharge progressive signifie simplement que ton corps rencontre, avec le temps, une demande légèrement supérieure. Cela peut être plus de charge, mais aussi une répétition, une série, une meilleure amplitude ou une exécution plus stable.",
        ],
      },
      {
        title: "Ne monte pas tout en même temps",
        paragraphs: [
          "Si tu ajoutes du poids, des séries et de la fréquence d’un seul coup, tu ne sauras pas ce qui fonctionne — ni ce qui t’épuise. Fais évoluer une variable, puis observe pendant quelques séances.",
        ],
      },
      {
        title: "La progression n’est pas toujours linéaire",
        paragraphs: [
          "Certaines semaines montent, d’autres consolident. Répéter la même performance avec une meilleure technique ou moins d’effort perçu est déjà une adaptation.",
        ],
      },
    ],
    takeaway: "Le progrès aime les petits signaux répétés, pas les révolutions hebdomadaires.",
    tryThis: "Choisis un seul exercice et vise une répétition propre de plus au total cette semaine.",
    sources: [SOURCES.acsm2026],
  },
  {
    id: "conseil-bonne-charge",
    title: "Choisir la bonne charge, sans ego ni calcul",
    subtitle: "Assez lourde pour travailler, assez légère pour rester maître du mouvement.",
    theme: "Entraînement",
    readingMinutes: 3,
    access: "free",
    image: "push-halteres",
    intro: "La bonne charge n’est pas celle qui impressionne la personne à côté. D’ailleurs, elle ne te regarde probablement pas. La bonne charge est celle qui correspond à l’objectif de ta série.",
    sections: [
      {
        title: "Observe les dernières répétitions",
        paragraphs: [
          "Elles doivent devenir plus lentes et demander de la concentration, sans transformer complètement le mouvement. Si tu pouvais en faire dix de plus, c’est probablement trop léger pour une série de travail. Si la première est déjà une bataille, c’est trop ambitieux aujourd’hui.",
        ],
      },
      {
        title: "Garde une marge honnête",
        paragraphs: [
          "Pour la majorité des séries, vise environ 1 à 3 répétitions possibles en réserve. Au début, ton estimation sera imparfaite. C’est normal : elle devient meilleure avec l’expérience.",
        ],
      },
      {
        title: "La charge varie avec la journée",
        paragraphs: [
          "Sommeil, stress, alimentation et matériel peuvent changer tes sensations. Ajuster de 2 ou 5 kilos n’efface pas ton niveau ; cela montre que tu sais entraîner la personne présente aujourd’hui.",
        ],
      },
    ],
    takeaway: "La charge sert le mouvement. Le mouvement ne sert pas la charge.",
    tryThis: "Après chaque série, note mentalement combien de répétitions propres il te restait : 0, 1, 2, 3 ou davantage.",
    sources: [SOURCES.acsm2026, SOURCES.proximity],
  },
  {
    id: "conseil-courbatures",
    title: "Les courbatures ne donnent pas une note",
    subtitle: "Avoir mal n’est ni obligatoire, ni une médaille.",
    theme: "Récupération",
    readingMinutes: 3,
    access: "free",
    image: "repos",
    imagePosition: "68% center",
    intro: "Tu peux avoir très peu de courbatures après une excellente séance. Et tu peux avoir du mal à descendre les escaliers après une séance simplement nouvelle ou mal dosée.",
    sections: [
      {
        title: "La nouveauté fait beaucoup de bruit",
        paragraphs: [
          "Les courbatures apparaissent souvent après un effort inhabituel, notamment quand le muscle freine une charge. Avec l’habitude, elles diminuent alors que tu peux continuer à gagner en force et en muscle.",
        ],
      },
      {
        title: "Les dommages ne sont pas le moteur principal",
        paragraphs: [
          "Créer davantage de dégâts musculaires ne garantit pas davantage de croissance. Une partie de l’énergie de récupération sert alors simplement à réparer ce qui a été fortement perturbé.",
        ],
      },
      {
        title: "Mesure ce qui raconte vraiment l’histoire",
        paragraphs: [
          "Regarde plutôt ta régularité, tes charges, tes répétitions, ton contrôle et ton aisance. Ces repères évoluent plus lentement, mais ils sont beaucoup plus bavards.",
        ],
      },
    ],
    takeaway: "Les courbatures sont une sensation, pas un bulletin de résultats.",
    tryThis: "Pendant deux semaines, juge tes séances sur un repère de performance plutôt que sur ce que tu ressens le lendemain.",
    sources: [SOURCES.soreness],
  },
  {
    id: "conseil-echauffement",
    title: "Un bon échauffement ne dure pas une éternité",
    subtitle: "Prépare exactement ce que tu vas faire, puis entraîne-toi.",
    theme: "Entraînement",
    readingMinutes: 3,
    access: "free",
    image: "full-epaule",
    intro: "Si ton échauffement ressemble déjà à une séance complète, on a peut-être un peu perdu le fil. Son travail est de te préparer, pas de te fatiguer avant le premier exercice.",
    sections: [
      {
        title: "Fais monter la machine",
        paragraphs: [
          "Commence par quelques minutes de mouvement facile pour augmenter progressivement la température et le souffle. Tu dois te sentir plus disponible, pas déjà entamé.",
        ],
      },
      {
        title: "Répète le geste à vide ou léger",
        paragraphs: [
          "Avant un squat chargé, fais des squats légers. Avant un développé, monte la charge par étapes. Les séries d’approche préparent les articulations, la coordination et ton jugement du jour.",
        ],
      },
      {
        title: "La mobilité doit avoir une raison",
        paragraphs: [
          "Ajoute un exercice de mobilité si une zone précise limite le mouvement prévu. Une collection de dix étirements choisis au hasard n’est pas automatiquement plus sérieuse.",
        ],
      },
    ],
    takeaway: "Un échauffement est spécifique, progressif et assez court pour te laisser de l’énergie.",
    tryThis: "Teste la formule 3 + 2 : trois minutes faciles, puis deux séries d’approche du premier mouvement.",
    sources: [SOURCES.warmup],
  },
  {
    id: "conseil-repos-series",
    title: "Entre les séries, repose-toi pour de vrai",
    subtitle: "Le repos n’est pas du temps perdu entre deux moments sérieux.",
    theme: "Entraînement",
    readingMinutes: 2,
    access: "free",
    image: "push-couche",
    intro: "Raccourcir toutes les pauses donne une séance intense. Ça ne donne pas forcément une meilleure séance, surtout si chaque série suivante perd des répétitions et de la qualité.",
    sections: [
      {
        title: "Le repos protège ton prochain effort",
        paragraphs: [
          "Sur un mouvement lourd ou très exigeant, deux à trois minutes peuvent être parfaitement raisonnables. Sur un exercice plus léger et ciblé, une pause plus courte peut suffire.",
        ],
      },
      {
        title: "Utilise un critère simple",
        paragraphs: [
          "Repars quand ton souffle est revenu, que tu peux te concentrer et que tu crois pouvoir produire une série proche de la précédente. Le chrono aide ; il ne connaît pas mieux ton corps que toi.",
        ],
      },
      {
        title: "Intense n’est pas synonyme d’efficace",
        paragraphs: [
          "Si tu veux travailler le cardio, assume un circuit avec des pauses courtes. Si tu veux produire de la force, laisse-toi récupérer. Mélanger les objectifs par impatience brouille le résultat.",
        ],
      },
    ],
    takeaway: "La pause fait partie de la série suivante.",
    tryThis: "Ajoute 30 secondes de repos à ton exercice principal et compare la qualité de tes dernières séries.",
    sources: [SOURCES.rest],
  },
  {
    id: "conseil-sommeil",
    title: "Dormir : l’entraînement qu’on ne voit pas",
    subtitle: "Tu peux optimiser tes séries. Si tes nuits sont cassées, commence aussi par là.",
    theme: "Récupération",
    readingMinutes: 3,
    access: "free",
    image: "done",
    imagePosition: "center 40%",
    intro: "Le sommeil n’a ni chronomètre spectaculaire ni selfie de fin. Pourtant, il influence ton énergie, ton attention, ta perception de l’effort et ta capacité à récupérer.",
    sections: [
      {
        title: "La base est moins glamour que les astuces",
        paragraphs: [
          "Pour un adulte en bonne santé, viser régulièrement au moins sept heures est un repère solide. Certaines personnes ont besoin de davantage, notamment après une dette de sommeil.",
        ],
      },
      {
        title: "Protège surtout la régularité",
        paragraphs: [
          "Une heure de coucher relativement stable, une pièce sombre et une fin de journée plus calme ont souvent plus d’effet qu’un nouveau gadget. Ne cherche pas la nuit parfaite ; cherche un rythme soutenable.",
        ],
      },
      {
        title: "Après une mauvaise nuit, adapte",
        paragraphs: [
          "Tu peux maintenir la séance en réduisant légèrement la charge, le volume ou l’intensité. Une nuit courte n’interdit pas de bouger ; elle change simplement le contrat du jour.",
        ],
      },
    ],
    takeaway: "Le sommeil n’est pas la récompense après le travail : il fait partie du travail.",
    tryThis: "Choisis cette semaine une seule heure de lever stable, y compris après une soirée un peu plus tardive.",
    sources: [SOURCES.sleep],
  },
  {
    id: "conseil-proteines",
    title: "Les protéines, sans vivre avec une calculette",
    subtitle: "Assez pour soutenir tes muscles, sans transformer chaque repas en examen.",
    theme: "Nutrition",
    readingMinutes: 3,
    access: "free",
    image: "pull-marteau",
    intro: "Oui, les protéines comptent. Non, tu n’as pas besoin de promener une balance de cuisine au restaurant pour être quelqu’un de sérieux.",
    sections: [
      {
        title: "Commence par les repas",
        paragraphs: [
          "Place une source de protéines identifiable dans tes principaux repas : œufs, poisson, viande, produits laitiers, tofu, tempeh, légumineuses ou une combinaison végétale qui te convient.",
        ],
      },
      {
        title: "Un repère, pas une loi gravée",
        paragraphs: [
          "Chez les personnes actives, les recommandations sportives se situent souvent autour de 1,4 à 2,0 g par kilo de poids corporel et par jour. Ce chiffre est une fourchette générale, pas une obligation de viser le maximum.",
          "Répartir l’apport sur la journée est pratique. L’ensemble quotidien compte davantage qu’une fenêtre magique de trente minutes.",
        ],
      },
      {
        title: "La poudre est un outil",
        paragraphs: [
          "Un shaker peut dépanner quand manger est compliqué. Il n’a aucun pouvoir spécial si ton alimentation couvre déjà tes besoins.",
        ],
      },
    ],
    takeaway: "Cherche une présence régulière de protéines, pas une perfection au gramme près.",
    tryThis: "Regarde tes trois prochains repas et ajoute simplement une source de protéines là où elle manque.",
    sources: [SOURCES.protein, SOURCES.nutrition],
  },
  {
    id: "conseil-glucides",
    title: "Les glucides ne sont pas l’ennemi de ta séance",
    subtitle: "Ton corps sait très bien quoi faire du riz, du pain et des fruits.",
    theme: "Nutrition",
    readingMinutes: 3,
    access: "free",
    image: "cardio-bike",
    intro: "Les glucides ont passé quelques années au tribunal d’internet. Pendant ce temps, tes muscles continuaient tranquillement à utiliser leurs réserves de glycogène pour produire des efforts soutenus.",
    sections: [
      {
        title: "Ils alimentent particulièrement l’intensité",
        paragraphs: [
          "Musculation volumineuse, HIIT, course rapide : ces efforts utilisent beaucoup les glucides disponibles. En manquer n’est pas toujours dangereux, mais peut rendre la séance inutilement plate.",
        ],
      },
      {
        title: "Adapte la quantité à la journée",
        paragraphs: [
          "Une grosse journée d’entraînement peut accueillir davantage de féculents, fruits ou céréales qu’un jour très calme. Il n’est pas nécessaire de copier l’alimentation d’un athlète d’endurance si tu fais une séance de trente minutes.",
        ],
      },
      {
        title: "Avant la séance, reste simple",
        paragraphs: [
          "Si tu as faim, un repas digeste quelques heures avant ou une petite collation peut aider. Teste ce que ton ventre tolère : la meilleure théorie perd toujours contre une séance passée à digérer.",
        ],
      },
    ],
    takeaway: "Les glucides sont un carburant à ajuster, pas un ennemi à bannir.",
    tryThis: "Avant une séance exigeante, teste une collation familière avec des glucides et compare ton énergie.",
    sources: [SOURCES.nutrition],
  },
  {
    id: "conseil-hydratation",
    title: "Boire assez, sans faire de ta gourde un devoir",
    subtitle: "L’objectif n’est ni de finir desséché, ni de battre un record d’eau.",
    theme: "Nutrition",
    readingMinutes: 2,
    access: "free",
    image: "cardio-rameur",
    intro: "Les besoins en eau changent énormément selon la chaleur, ta transpiration, la durée de l’effort et ce que tu as déjà bu. Un chiffre universel au litre près serait surtout universellement faux.",
    sections: [
      {
        title: "Arrive normalement hydraté",
        paragraphs: [
          "Bois régulièrement dans la journée et garde de l’eau accessible pendant la séance. Pour la majorité des entraînements ordinaires, l’eau fait très bien le travail.",
        ],
      },
      {
        title: "Les électrolytes ont un contexte",
        paragraphs: [
          "Ils deviennent plus intéressants lors d’efforts longs, très chauds ou particulièrement transpirants. Ce n’est pas parce qu’une boisson est fluorescente qu’elle est nécessaire.",
        ],
      },
      {
        title: "Trop boire existe aussi",
        paragraphs: [
          "Forcer de grandes quantités sans tenir compte de la soif ni des pertes n’améliore pas automatiquement la performance. Le but est de remplacer raisonnablement ce que tu perds, pas de te remplir.",
        ],
      },
    ],
    takeaway: "Hydrate-toi selon l’effort et le climat, pas selon un défi trouvé en ligne.",
    tryThis: "Pour une séance chaude ou longue, pèse-toi avant et après une fois : l’écart t’aidera à comprendre ta transpiration personnelle.",
    sources: [SOURCES.hydration],
  },
  {
    id: "conseil-seance-sautee",
    title: "Une séance sautée ne casse rien",
    subtitle: "Ton programme n’est pas une rangée de dominos.",
    theme: "Mental & confiance",
    readingMinutes: 2,
    access: "free",
    image: "cat-conseils",
    imagePosition: "center 44%",
    intro: "Tu as raté mardi. Rien ne s’est effondré. Ton corps ne supprime pas trois mois de travail parce qu’une réunion a débordé ou que tu avais besoin de souffler.",
    sections: [
      {
        title: "Ne transforme pas un événement en identité",
        paragraphs: [
          "« Je n’ai pas fait cette séance » est un fait. « Je ne suis pas régulier » est une histoire beaucoup plus lourde, et souvent fausse. Garde les faits petits.",
        ],
      },
      {
        title: "Évite la séance-punition",
        paragraphs: [
          "Doubler brutalement le volume le lendemain pour rembourser une dette imaginaire ajoute surtout de la fatigue. Reprends le programme normalement ou décale une priorité importante.",
        ],
      },
      {
        title: "Prépare le retour le plus facile",
        paragraphs: [
          "Décide quand et où tu reprendras. Les plans concrets du type « jeudi après le travail, vingt minutes à la maison » sont plus utiles que « il faut vraiment que je m’y remette ».",
        ],
      },
    ],
    takeaway: "La régularité se mesure sur la durée, pas sur un mardi isolé.",
    tryThis: "Écris une phrase précise : « Ma prochaine occasion de bouger sera… » puis laisse la séance manquée derrière toi.",
    sources: [SOURCES.intentions, SOURCES.adherence],
  },
  {
    id: "conseil-debuter-salle",
    title: "Tu as le droit de débuter à la salle",
    subtitle: "Personne ne reçoit son assurance avec la carte d’abonnement.",
    theme: "Mental & confiance",
    readingMinutes: 3,
    access: "free",
    image: "cat-salle",
    intro: "La salle donne parfois l’impression que tout le monde connaît les machines, les codes et la bonne manière de poser sa serviette. C’est une illusion assez convaincante : chaque personne sûre d’elle a déjà cherché un réglage pendant cinq minutes.",
    sections: [
      {
        title: "Rétrécis le terrain",
        paragraphs: [
          "Tu n’as pas besoin de maîtriser tout le bâtiment. Choisis quatre ou cinq exercices, repère leur emplacement et répète le même parcours pendant quelques semaines. La familiarité construit la confiance.",
        ],
      },
      {
        title: "Demander n’est pas avouer une faiblesse",
        paragraphs: [
          "Un membre du personnel peut t’aider à régler une machine. Une personne peut aussi finir sa série avant que tu demandes si elle utilise un banc. Ce sont des interactions normales, pas des examens.",
        ],
      },
      {
        title: "Ton objectif n’est pas d’avoir l’air avancé",
        paragraphs: [
          "Il est de devenir un peu plus à l’aise et compétent. Prends des charges que tu contrôles, note deux repères et laisse l’assurance arriver après les répétitions — pas avant.",
        ],
      },
    ],
    takeaway: "La confiance n’est pas un prérequis : c’est un effet secondaire de l’expérience.",
    tryThis: "Prépare avant d’entrer une séance de quatre mouvements et autorise-toi à ne rien improviser.",
    sources: [SOURCES.adherence],
  },
  {
    id: "conseil-comparaison",
    title: "Ne compare pas ton chapitre 2 au chapitre 20",
    subtitle: "Le corps d’un autre ne connaît ni ton histoire, ni tes contraintes.",
    theme: "Mental & confiance",
    readingMinutes: 3,
    access: "free",
    image: "core-lateral",
    intro: "Se comparer est humain. Le problème commence quand tu utilises les meilleurs moments visibles des autres pour juger tes journées ordinaires.",
    sections: [
      {
        title: "La comparaison oublie tout le contexte",
        paragraphs: [
          "Ancienneté, génétique, sommeil, métier, blessures, disponibilité, montage vidéo : tu ne vois presque rien de ce qui produit l’image finale. Pourtant, ton cerveau la traite comme une référence équitable.",
        ],
      },
      {
        title: "Reviens à la fonction",
        paragraphs: [
          "Au lieu de demander seulement « À quoi je ressemble ? », observe ce que ton corps te permet davantage : porter, monter, courir, jouer, te relever, avoir moins peur d’une charge. La fonction élargit le regard.",
        ],
      },
      {
        title: "Choisis une comparaison utile",
        paragraphs: [
          "Compare une période assez longue de ta propre pratique : ton contrôle depuis six semaines, ta régularité depuis trois mois, ton aisance sur un mouvement. Pas ton reflet de 22 h après une journée compliquée.",
        ],
      },
    ],
    takeaway: "Ton progrès mérite un contexte aussi complet que celui que tu accordes aux autres.",
    tryThis: "Note une chose que ton corps fait aujourd’hui avec plus d’aisance qu’il y a deux mois.",
    sources: [SOURCES.bodyImage],
  },
  {
    id: "conseil-douleur-gene",
    title: "Douleur, gêne, effort : apprends à les distinguer",
    subtitle: "Être courageux ne consiste pas à ignorer tous les signaux.",
    theme: "Récupération",
    readingMinutes: 3,
    access: "free",
    image: "core-planche",
    intro: "Un muscle qui brûle sur les dernières répétitions, un étirement léger et une douleur vive ne racontent pas la même chose. Les mettre dans le même sac pousse soit à tout éviter, soit à tout traverser. Aucun des deux n’aide beaucoup.",
    sections: [
      {
        title: "L’effort attendu",
        paragraphs: [
          "Une fatigue musculaire diffuse, un souffle accéléré ou une sensation de travail qui redescend après la série sont souvent cohérents avec l’exercice. Ils restent contrôlables et ne modifient pas brutalement ton geste.",
        ],
      },
      {
        title: "Le signal qui mérite un arrêt",
        paragraphs: [
          "Une douleur soudaine, aiguë, électrique, qui augmente à chaque répétition ou s’accompagne d’une perte de force inhabituelle mérite de stopper le mouvement. Réduire la charge ne suffit pas toujours : change d’exercice ou arrête la séance.",
        ],
      },
      {
        title: "Quand demander un avis",
        paragraphs: [
          "Une douleur persistante, un gonflement important, une incapacité à prendre appui ou des symptômes qui s’aggravent doivent être évalués par un professionnel de santé. Une douleur thoracique, un malaise, un essoufflement inhabituel ou un symptôme neurologique appellent une aide urgente.",
          "Ce mini-cours aide à observer ; il ne pose aucun diagnostic.",
        ],
      },
    ],
    takeaway: "Écouter un signal n’est pas abandonner : c’est garder une marge de décision.",
    tryThis: "Si une sensation t’inquiète, arrête la série, respire une minute et décris-la précisément avant de décider de la suite.",
    sources: [SOURCES.acsm2026],
  },
  {
    id: "conseil-technique-parfaite",
    title: "La technique parfaite n’existe pas",
    subtitle: "Mais une technique adaptée, stable et progressive, oui.",
    theme: "Entraînement",
    readingMinutes: 3,
    access: "free",
    image: "legs-squat",
    intro: "Deux personnes peuvent réaliser un bon squat avec des pieds, une profondeur et une inclinaison du buste différents. Elles n’ont pas les mêmes proportions, la même mobilité ni le même objectif.",
    sections: [
      {
        title: "Cherche des principes, pas une photocopie",
        paragraphs: [
          "Un mouvement solide respecte une amplitude que tu contrôles, une trajectoire cohérente et une charge adaptée. Il n’a pas besoin de ressembler au millimètre à celui d’un coach filmé sous un angle parfait.",
        ],
      },
      {
        title: "La technique change avec la tâche",
        paragraphs: [
          "Un squat lourd, un squat rapide et un squat de mobilité n’ont pas exactement le même but. La forme doit servir la tâche tout en restant tolérable pour toi.",
        ],
      },
      {
        title: "Filme pour apprendre, pas pour te juger",
        paragraphs: [
          "Une courte vidéo de côté peut révéler une amplitude, un rythme ou une perte de stabilité. Corrige un point à la fois. Six consignes simultanées transforment vite un mouvement naturel en mot de passe Wi-Fi.",
        ],
      },
    ],
    takeaway: "La bonne technique est celle que tu peux contrôler, charger progressivement et répéter sans signal inquiétant.",
    tryThis: "Sur un seul exercice, filme une série légère et choisis un unique détail à améliorer.",
    sources: [SOURCES.acsm2026],
  },
  {
    id: "conseil-echec-musculaire",
    title: "Échec musculaire : utile, pas obligatoire",
    subtitle: "Aller au bout d’une série est un outil, pas une preuve de volonté.",
    theme: "Progression",
    readingMinutes: 3,
    access: "premium",
    image: "push-dips",
    intro: "L’échec musculaire, c’est le moment où tu ne peux plus terminer une répétition avec la forme prévue. Il peut être utile. Il n’a simplement pas besoin d’être invité à toutes les séries.",
    sections: [
      {
        title: "Ce que dit vraiment la recherche",
        paragraphs: [
          "Les synthèses disponibles ne montrent pas que l’échec soit indispensable pour gagner en force ou en muscle. Des séries arrêtées juste avant peuvent produire des résultats comparables, avec souvent moins de fatigue.",
        ],
      },
      {
        title: "Où il coûte le plus cher",
        paragraphs: [
          "Sur un squat, un développé ou un soulevé lourd, rater une répétition fatigue beaucoup et peut compliquer la sécurité. Sur une machine stable ou une élévation latérale, le coût est généralement plus facile à gérer.",
        ],
      },
      {
        title: "Une utilisation intelligente",
        paragraphs: [
          "Garde la plupart des séries à environ 1 à 3 répétitions de l’échec. Si tu veux calibrer tes sensations, pousse occasionnellement la dernière série d’un exercice sûr plus près de la limite.",
        ],
      },
    ],
    takeaway: "Approche l’échec assez pour stimuler, pas assez souvent pour qu’il dirige tout le programme.",
    tryThis: "Sur une machine que tu maîtrises, estime d’abord ta marge, puis vérifie-la une seule fois sur la dernière série.",
    sources: [SOURCES.failure, SOURCES.proximity, SOURCES.acsm2026],
  },
  {
    id: "conseil-semaine-coherente",
    title: "Construis une semaine qui tient dans ta vraie vie",
    subtitle: "Le meilleur programme sur papier perd contre un agenda impossible.",
    theme: "Progression",
    readingMinutes: 3,
    access: "premium",
    image: "cat-tiennes",
    intro: "Avant de répartir les groupes musculaires comme un ingénieur de la NASA, regarde ta semaine. Combien de créneaux peux-tu réellement protéger, même quand le travail déborde un peu ?",
    sections: [
      {
        title: "Pars de tes jours fiables",
        paragraphs: [
          "Deux séances certaines valent mieux que quatre séances imaginaires. Place d’abord les créneaux les plus stables, puis construis le programme autour d’eux.",
        ],
      },
      {
        title: "Couvre les grands mouvements",
        paragraphs: [
          "Sur la semaine, cherche une poussée, un tirage, un mouvement de genoux, un mouvement de hanches et du travail de tronc. Tu peux les répartir en full body ou en séances séparées.",
        ],
      },
      {
        title: "Prévois une version B",
        paragraphs: [
          "Pour chaque séance longue, garde une version courte avec les deux ou trois priorités. Ce n’est pas un programme moins ambitieux ; c’est un programme qui sait survivre à un jeudi réel.",
        ],
      },
    ],
    takeaway: "Programme d’abord la régularité, puis optimise les détails.",
    tryThis: "Entoure deux créneaux vraiment fiables et attribue à chacun trois mouvements prioritaires.",
    sources: [SOURCES.acsm2026, SOURCES.adherence],
  },
  {
    id: "conseil-plateau",
    title: "Tu stagnes ? Ne change pas tout",
    subtitle: "Un plateau se diagnostique avant de se combattre.",
    theme: "Progression",
    readingMinutes: 3,
    access: "premium",
    image: "pull-rowing",
    intro: "Trois séances sans ajouter de poids ne sont pas forcément un plateau. Plus tu progresses, moins les records arrivent chaque mardi à 18 h 30.",
    sections: [
      {
        title: "Vérifie que tu stagnes vraiment",
        paragraphs: [
          "Compare quatre à six semaines : charge, répétitions, technique, amplitude et effort perçu. Si tu fais la même performance avec plus de contrôle, quelque chose avance déjà.",
        ],
      },
      {
        title: "Cherche le goulot d’étranglement",
        paragraphs: [
          "Le problème peut venir d’un volume trop faible, d’une fatigue trop haute, d’un exercice mal adapté, d’un sommeil perturbé ou d’une alimentation insuffisante. Ajouter de l’intensité au hasard ne résout pas tous ces scénarios.",
        ],
      },
      {
        title: "Change une seule chose",
        paragraphs: [
          "Ajoute une série hebdomadaire, modifie la plage de répétitions, prends plus de repos ou remplace un exercice qui ne progresse plus. Garde le reste stable assez longtemps pour lire la réponse.",
        ],
      },
    ],
    takeaway: "Un plateau est une information à interpréter, pas une urgence à secouer.",
    tryThis: "Écris ton hypothèse principale, puis teste un seul ajustement pendant trois semaines.",
    sources: [SOURCES.acsm2026, SOURCES.periodization],
  },
  {
    id: "conseil-deload",
    title: "Le deload : lever le pied pour mieux repartir",
    subtitle: "Réduire temporairement n’efface pas le travail déjà fait.",
    theme: "Récupération",
    readingMinutes: 3,
    access: "premium",
    image: "repos",
    imagePosition: "68% center",
    intro: "Quand tout paraît lourd, que l’envie baisse et que plusieurs performances reculent ensemble, la réponse n’est pas toujours « force un peu plus ». Parfois, ton programme demande simplement de respirer.",
    sections: [
      {
        title: "Ce qu’est un deload",
        paragraphs: [
          "C’est une courte période où tu réduis volontairement la difficulté : moins de séries, des charges plus légères, davantage de marge ou quelques jours de repos complet.",
        ],
      },
      {
        title: "Pas besoin d’un calendrier militaire",
        paragraphs: [
          "Certaines personnes aiment programmer une semaine allégée. D’autres l’utilisent seulement quand plusieurs signes convergent. Le deload automatique toutes les quatre semaines n’est pas une loi universelle.",
        ],
      },
      {
        title: "Garde le geste, retire la dette",
        paragraphs: [
          "Une option simple consiste à conserver les mêmes exercices, réduire environ un tiers à la moitié des séries et rester loin de l’échec. Tu maintiens les repères sans nourrir la fatigue.",
        ],
      },
    ],
    takeaway: "Lever le pied est parfois une décision de progression, pas un recul.",
    tryThis: "Si plusieurs marqueurs baissent depuis deux semaines, teste cinq à sept jours avec moitié moins de séries.",
    sources: [SOURCES.periodization, SOURCES.acsm2026],
  },
  {
    id: "conseil-volume-frequence",
    title: "Volume et fréquence : le calcul qui compte",
    subtitle: "Combien tu fais sur la semaine importe souvent plus que le nom du programme.",
    theme: "Progression",
    readingMinutes: 3,
    access: "premium",
    image: "full-thruster",
    intro: "On adore débattre de trois séances contre cinq. La question plus utile est souvent : combien de séries de qualité chaque groupe musculaire reçoit-il au total, et peux-tu les récupérer ?",
    sections: [
      {
        title: "Le volume est une dose",
        paragraphs: [
          "Davantage de séries peut soutenir davantage de croissance, jusqu’au point où la qualité et la récupération commencent à chuter. Les recommandations récentes situent autour de dix séries hebdomadaires par groupe un repère pertinent pour rechercher l’hypertrophie, pas une frontière magique.",
        ],
      },
      {
        title: "La fréquence distribue cette dose",
        paragraphs: [
          "À volume égal, entraîner un muscle un, deux ou trois jours peut produire des résultats proches. Répartir sur deux jours rend souvent les séries plus fraîches et les séances moins interminables.",
        ],
      },
      {
        title: "Commence plus bas que ton enthousiasme",
        paragraphs: [
          "Pars d’un volume que tu récupères et augmente seulement si les performances, l’envie et les articulations restent stables. Le volume que tu peux répéter bat celui que tu peux survivre une semaine.",
        ],
      },
    ],
    takeaway: "La fréquence organise le travail ; elle ne remplace ni le volume, ni l’effort, ni la récupération.",
    tryThis: "Compte les séries exigeantes d’un seul groupe musculaire cette semaine avant d’en ajouter.",
    sources: [SOURCES.acsm2026, SOURCES.frequency],
  },
  {
    id: "conseil-fullbody-split",
    title: "Full body ou split ? Le faux grand débat",
    subtitle: "Les deux fonctionnent. Ton agenda va probablement trancher mieux qu’internet.",
    theme: "Entraînement",
    readingMinutes: 3,
    access: "premium",
    image: "full-sandbag",
    intro: "Le full body travaille plusieurs grandes zones à chaque séance. Le split les répartit sur des jours différents. Aucun des deux n’a gagné le championnat universel des programmes.",
    sections: [
      {
        title: "À volume égal, les résultats se ressemblent",
        paragraphs: [
          "Les comparaisons disponibles ne montrent pas d’avantage clair du split ou du full body pour la force et la croissance musculaire lorsque la quantité totale de travail est comparable.",
        ],
      },
      {
        title: "Choisis selon ta semaine",
        paragraphs: [
          "Avec deux ou trois séances, le full body permet de revoir souvent chaque mouvement. Avec quatre séances ou davantage, un split peut raccourcir les séances et concentrer l’attention.",
        ],
      },
      {
        title: "Choisis aussi selon ton plaisir",
        paragraphs: [
          "Certaines personnes aiment sortir en ayant travaillé tout le corps. D’autres préfèrent approfondir une zone. Le format auquel tu reviens sans négociation permanente possède déjà un avantage énorme.",
        ],
      },
    ],
    takeaway: "Le bon découpage est celui qui distribue un travail de qualité dans une semaine réaliste.",
    tryThis: "Choisis le format selon le nombre de jours que tu peux tenir pendant huit semaines, pas selon ta meilleure semaine de l’année.",
    sources: [SOURCES.split, SOURCES.acsm2026],
  },
  {
    id: "conseil-perdre-gras",
    title: "Perdre du gras sans déclarer la guerre à ton corps",
    subtitle: "Un déficit raisonnable vaut mieux qu’une vie entière en mode punition.",
    theme: "Nutrition",
    readingMinutes: 3,
    access: "premium",
    image: "cardio-stepper",
    intro: "Pour perdre du gras, l’apport énergétique doit finir par être inférieur à la dépense sur la durée. Cette phrase est simple. La vivre sans abîmer ton énergie, ton rapport à la nourriture et tes entraînements demande plus de nuance.",
    sections: [
      {
        title: "Crée un écart que tu peux habiter",
        paragraphs: [
          "Un déficit très agressif donne parfois des résultats rapides sur la balance, mais augmente aussi faim, fatigue et risque d’abandon. Commence par des changements mesurés : portions, boissons, grignotages automatiques ou densité des repas.",
        ],
      },
      {
        title: "Protège ce que tu veux garder",
        paragraphs: [
          "La musculation, un apport suffisant en protéines et une perte progressive aident à conserver davantage de masse maigre. Continue aussi de manger des glucides autour des séances si cela soutient ta performance.",
        ],
      },
      {
        title: "Ne laisse pas la balance devenir ton humeur",
        paragraphs: [
          "L’eau, le sel, le transit et le cycle menstruel peuvent déplacer le poids à court terme. Observe une tendance sur plusieurs semaines et garde d’autres repères : tour de taille, vêtements, énergie, force.",
          "Si la restriction devient anxieuse, compulsive ou envahit tes journées, parle-en à un professionnel de santé qualifié.",
        ],
      },
    ],
    takeaway: "La meilleure perte de gras est assez lente pour préserver ta vie autour.",
    tryThis: "Choisis un seul changement alimentaire soutenable pour les deux prochaines semaines, sans toucher au reste.",
    sources: [SOURCES.diets, SOURCES.nutrition],
  },
  {
    id: "conseil-creatine",
    title: "Créatine : le solide et le marketing",
    subtitle: "Un supplément utile, beaucoup moins mystérieux que son rayon.",
    theme: "Nutrition",
    readingMinutes: 3,
    access: "premium",
    image: "pull-poulie",
    intro: "La créatine monohydrate fait partie des compléments les mieux étudiés pour les efforts brefs et répétés. Ce qui n’empêche pas les marques de lui ajouter des noms de vaisseaux spatiaux et un pot noir mat.",
    sections: [
      {
        title: "Ce qu’elle peut faire",
        paragraphs: [
          "Elle augmente les réserves musculaires de créatine, ce qui peut soutenir la performance sur des efforts intenses répétés et, avec l’entraînement, aider les gains de force ou de masse maigre.",
        ],
      },
      {
        title: "La version simple suffit",
        paragraphs: [
          "La créatine monohydrate est la forme de référence. Une prise quotidienne de 3 à 5 g est une pratique courante. Une phase de charge peut saturer plus vite les réserves, mais elle n’est pas nécessaire pour obtenir l’effet à terme.",
        ],
      },
      {
        title: "Ce qu’il faut savoir avant",
        paragraphs: [
          "Une hausse initiale du poids liée à l’eau dans le muscle peut arriver ; ce n’est pas une prise de gras. Chez les personnes en bonne santé, les données disponibles sont rassurantes aux doses étudiées. En cas de maladie rénale, de grossesse, de traitement ou de doute médical, demande un avis professionnel avant toute supplémentation.",
        ],
      },
    ],
    takeaway: "Si tu en prends, monohydrate, dose simple, régularité — le reste est souvent surtout un emballage.",
    tryThis: "Avant d’acheter, vérifie que l’étiquette dit uniquement « créatine monohydrate » et compare le prix par dose.",
    sources: [SOURCES.creatine],
  },
  {
    id: "conseil-cycle-menstruel",
    title: "Cycle menstruel : observe-toi avant d’obéir à un calendrier",
    subtitle: "Les moyennes de groupe ne connaissent pas tes symptômes.",
    theme: "Récupération",
    readingMinutes: 3,
    access: "premium",
    image: "legs-fentes",
    intro: "Tu trouveras des programmes qui interdisent les charges lourdes certains jours et promettent une force surhumaine à d’autres. La recherche actuelle est beaucoup moins théâtrale.",
    sections: [
      {
        title: "L’effet moyen semble faible",
        paragraphs: [
          "Les synthèses observent au mieux de petites variations moyennes de performance selon les phases, avec des études très hétérogènes et souvent de qualité limitée. Cela ne justifie pas un calendrier rigide pour tout le monde.",
        ],
      },
      {
        title: "Les symptômes individuels, eux, sont réels",
        paragraphs: [
          "Douleurs, sommeil, énergie, migraines ou humeur peuvent modifier une séance. Une autre personne peut ne presque rien ressentir. Ajuste selon tes observations, pas selon une règle qui suppose que toutes les personnes ont le même cycle.",
        ],
      },
      {
        title: "Construis ton propre repère",
        paragraphs: [
          "Pendant deux ou trois cycles, note brièvement énergie, symptômes et performance. Si un schéma clair revient, prévois une option plus légère ou place tes séances importantes autrement. Si les symptômes sont sévères ou inhabituels, consulte.",
        ],
      },
    ],
    takeaway: "Le cycle peut informer ton entraînement ; il n’a pas besoin de le commander.",
    tryThis: "Note pendant un mois trois données simples : énergie, symptômes et qualité de séance, sur une échelle de 1 à 5.",
    sources: [SOURCES.cycle],
  },
  {
    id: "conseil-stress",
    title: "Quand le stress change la séance",
    subtitle: "Ton programme voit des cases. Ton corps, lui, additionne tout.",
    theme: "Récupération",
    readingMinutes: 3,
    access: "premium",
    image: "core-twist",
    intro: "Une échéance au travail ne ressemble pas à une série de squats. Pourtant, manque de sommeil, charge mentale et entraînement puisent tous dans ta capacité à récupérer.",
    sections: [
      {
        title: "Ne confonds pas baisse du jour et perte de niveau",
        paragraphs: [
          "Sous stress, une charge habituelle peut sembler anormalement lourde. Cela ne signifie pas que tu as régressé. Ton niveau n’est pas effacé ; son expression est simplement moins disponible.",
        ],
      },
      {
        title: "Utilise trois versions de la séance",
        paragraphs: [
          "Version verte : séance prévue. Version orange : mêmes mouvements, moins de séries ou plus de marge. Version courte : deux priorités puis retour à la maison. Décider avant évite de négocier au milieu de la fatigue.",
        ],
      },
      {
        title: "Bouger peut aider sans devoir performer",
        paragraphs: [
          "Une marche, une séance légère ou quelques mouvements peuvent soutenir le bien-être. Mais l’entraînement n’a pas à devenir une nouvelle obligation écrasante. Parfois, dormir ou demander de l’aide est la décision la plus solide.",
        ],
      },
    ],
    takeaway: "Ajuster la séance au stress protège la continuité ; ce n’est pas céder.",
    tryThis: "Avant de commencer, choisis honnêtement ta couleur du jour : verte, orange ou courte.",
    sources: [SOURCES.sleep, SOURCES.whoActivity],
  },
];

export const ADVICE_BY_ID = new Map(ADVICE_ARTICLES.map((article) => [article.id, article]));

export function getAdviceArticle(id: string): AdviceArticle | null {
  return ADVICE_BY_ID.get(id) ?? null;
}
