/* ════════════════════════════════════════════════════════════════════
   Conseils & progresser — bibliothèque éditoriale Vaiiya.

   Voix validée avec Louis le 2026-07-26 :
   - pilier : coach franc et complice ;
   - garde-fou : expertise simple et précise ;
   - structure : mini-cours concrets lisibles en 3 à 5 minutes ;
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
  readingMinutes: 3 | 4 | 5;
  access: "free" | "premium";
  image: string;
  imagePosition?: string;
  intro: string;
  sections: AdviceSection[];
  example: string;
  takeaway: string;
  tryThis: string;
  sources: AdviceSource[];
};

const SOURCES = {
  acsm2026: {
    label: "ACSM, recommandations 2026 sur la musculation",
    url: "https://acsm.org/resistance-training-guidelines-update-2026/",
  },
  whoActivity: {
    label: "OMS, recommandations sur l’activité physique",
    url: "https://www.who.int/publications/i/item/9789240014886",
  },
  sleep: {
    label: "AASM & Sleep Research Society, durée de sommeil chez l’adulte",
    url: "https://aasm.org/resources/pdf/pressroom/adult-sleep-duration-consensus.pdf",
  },
  protein: {
    label: "ISSN, protéines et exercice",
    url: "https://pubmed.ncbi.nlm.nih.gov/28642676/",
  },
  nutrition: {
    label: "Academy of Nutrition, Dietitians of Canada & ACSM, nutrition et performance",
    url: "https://pubmed.ncbi.nlm.nih.gov/26891166/",
  },
  creatine: {
    label: "ISSN, efficacité et sécurité de la créatine",
    url: "https://pubmed.ncbi.nlm.nih.gov/28615996/",
  },
  failure: {
    label: "Grgic et al., entraînement à l’échec ou non",
    url: "https://pubmed.ncbi.nlm.nih.gov/33497853/",
  },
  proximity: {
    label: "Refalo et al., proximité de l’échec et hypertrophie",
    url: "https://pubmed.ncbi.nlm.nih.gov/36334240/",
  },
  rest: {
    label: "Singer et al., durée du repos entre les séries",
    url: "https://pubmed.ncbi.nlm.nih.gov/39205815/",
  },
  soreness: {
    label: "Damas et al., dommages musculaires et hypertrophie",
    url: "https://pubmed.ncbi.nlm.nih.gov/29282529/",
  },
  warmup: {
    label: "Kłobuchowski et al., échauffement, performance et prévention",
    url: "https://pubmed.ncbi.nlm.nih.gov/42188564/",
  },
  hydration: {
    label: "NATA, hydratation des personnes actives",
    url: "https://pubmed.ncbi.nlm.nih.gov/28985128/",
  },
  adherence: {
    label: "Teixeira et al., motivation autonome et régularité",
    url: "https://pubmed.ncbi.nlm.nih.gov/30459690/",
  },
  intentions: {
    label: "Silva et al., intentions concrètes et activité physique",
    url: "https://pubmed.ncbi.nlm.nih.gov/30427874/",
  },
  bodyImage: {
    label: "Guest et al., interventions et image corporelle positive",
    url: "https://pubmed.ncbi.nlm.nih.gov/31077956/",
  },
  cycle: {
    label: "McNulty et al., cycle menstruel et performance",
    url: "https://pubmed.ncbi.nlm.nih.gov/32661839/",
  },
  frequency: {
    label: "Schoenfeld et al., fréquence et hypertrophie à volume égal",
    url: "https://pubmed.ncbi.nlm.nih.gov/30558493/",
  },
  split: {
    label: "Ramos-Campo et al., full body ou split",
    url: "https://pubmed.ncbi.nlm.nih.gov/38595233/",
  },
  periodization: {
    label: "Moesgaard et al., périodisation, force et hypertrophie",
    url: "https://pubmed.ncbi.nlm.nih.gov/35044672/",
  },
  diets: {
    label: "ISSN, alimentation et composition corporelle",
    url: "https://pubmed.ncbi.nlm.nih.gov/28630601/",
  },
} satisfies Record<string, AdviceSource>;

type AdviceDraft = Omit<AdviceArticle, "example" | "readingMinutes"> & {
  readingMinutes: 2 | 3 | 4;
};

const ADVICE_DRAFTS: AdviceDraft[] = [
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
          "Si tu ajoutes du poids, des séries et de la fréquence d’un seul coup, tu ne sauras pas ce qui fonctionne, ni ce qui t’épuise. Fais évoluer une variable, puis observe pendant quelques séances.",
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
          "Il est de devenir un peu plus à l’aise et compétent. Prends des charges que tu contrôles, note deux repères et laisse l’assurance arriver après les répétitions, pas avant.",
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
    takeaway: "Si tu en prends, monohydrate, dose simple, régularité, le reste est souvent surtout un emballage.",
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

type AdviceRewrite = Pick<
  AdviceArticle,
  "title" | "subtitle" | "readingMinutes" | "intro" | "sections" | "example" | "takeaway" | "tryThis"
>;

type ClearSection = [title: string, ...paragraphs: string[]];

function clear(
  title: string,
  subtitle: string,
  readingMinutes: 3 | 4 | 5,
  intro: string,
  sections: ClearSection[],
  example: string,
  takeaway: string,
  tryThis: string,
): AdviceRewrite {
  return {
    title,
    subtitle,
    readingMinutes,
    intro,
    sections: sections.map(([sectionTitle, ...paragraphs]) => ({ title: sectionTitle, paragraphs })),
    example,
    takeaway,
    tryThis,
  };
}

/* Réécriture du 2026-07-26 : le fond scientifique reste celui des fiches
   sources, mais chaque idée est désormais expliquée avec des mots directs,
   une conduite à tenir et une situation concrète. Aucun message important
   ne dépend d'une métaphore ou d'un slogan. */
const CONCRETE_CONTENT: Record<string, AdviceRewrite> = {
  "conseil-pas-se-detruire": clear(
    "Non, tu n’as pas besoin de te détruire",
    "Tu peux progresser sans finir chaque série à l’échec ni être épuisé pendant plusieurs jours.",
    4,
    "Une séance efficace doit être assez difficile pour faire travailler les muscles, mais elle n’a pas besoin de te mettre au sol. La transpiration, les nausées ou l’épuisement indiquent surtout que la séance était fatigante. Ils ne prouvent pas qu’elle était mieux construite.",
    [
      ["Ce que tu dois ressentir pendant une bonne série",
        "Sur une série de musculation, les dernières répétitions doivent devenir plus lentes et demander de la concentration. En revanche, tu dois encore contrôler le mouvement : même amplitude, même posture et aucune douleur inhabituelle.",
        "Pour la majorité des séries, arrête-toi quand tu estimes pouvoir encore faire une à trois répétitions propres. Cette marge est assez petite pour stimuler le muscle et assez grande pour limiter la fatigue inutile."],
      ["Pourquoi ne pas aller au maximum à chaque fois",
        "Une série à l’échec peut être utile ponctuellement, surtout sur une machine ou un exercice simple. Répétée sur tous les exercices, elle fatigue davantage, dégrade souvent les séries suivantes et peut rendre la prochaine séance plus difficile.",
        "Le but n’est donc pas de sortir frais comme si tu n’avais rien fait. Le but est de terminer le travail prévu avec une technique correcte, puis de pouvoir recommencer quelques jours plus tard."],
      ["Comment régler l’effort",
        "Si tu termines une série en pouvant faire cinq répétitions ou plus, augmente légèrement la charge ou les répétitions la prochaine fois. Si tu rates le nombre prévu ou que ta technique change fortement, baisse un peu la charge. Entre les deux, garde le réglage."],
    ],
    "Tu prévois 3 séries de 10 squats avec un haltère. À la 10e répétition, tes jambes travaillent fort mais tu pourrais encore en faire 2 proprement : la charge est bien choisie. Si tu pouvais en faire 20, elle est trop légère. Si tu bloques à 7, elle est trop lourde pour l’objectif prévu.",
    "Pour la plupart de tes séries, arrête-toi avec 1 à 3 répétitions propres encore possibles. Garde l’échec musculaire pour quelques séries sur des exercices sûrs.",
    "À ta prochaine séance, note après ton exercice principal combien de répétitions propres il te restait. Ajuste seulement si tu es au-dessus de 3 ou déjà à l’échec.",
  ),
  "conseil-seance-courte": clear(
    "Oui, une séance de 12 minutes compte",
    "Quand tu manques de temps, un entraînement court vaut mieux que supprimer systématiquement la séance.",
    3,
    "Douze minutes ne remplacent pas toujours une séance complète, mais elles peuvent entretenir une habitude et apporter un vrai travail musculaire ou cardiovasculaire. Le résultat dépend surtout de ce que tu mets dans ces douze minutes.",
    [
      ["Ce qu’une séance courte peut réellement faire",
        "Avec deux ou trois exercices bien choisis et peu de temps perdu, tu peux réaliser plusieurs séries exigeantes. Ce volume est inférieur à celui d’une longue séance, mais il n’est pas nul. Répété dans la semaine, il s’additionne.",
        "Une séance courte est particulièrement utile les jours où l’autre option serait de ne rien faire alors que tu avais envie de bouger. Elle ne doit pas devenir une punition ou une façon de compenser."],
      ["Comment construire les 12 minutes",
        "Choisis un mouvement pour les jambes, un mouvement de poussée ou de tirage et, si le temps le permet, un exercice de gainage. Utilise des exercices que tu connais déjà. Lance un chronomètre, garde des pauses suffisantes pour rester propre et évite de changer de matériel.",
        "Tu peux aussi ne faire que deux exercices importants avec davantage de repos. Court ne veut pas dire précipité."],
    ],
    "Tu avais prévu 45 minutes, mais tu rentres tard. Fais 3 séries de squats, 3 séries de pompes inclinées et 2 séries de gainage, avec environ 45 secondes de repos. Tu n’as pas fait la séance complète ; tu as tout de même entraîné les jambes, le haut du corps et le tronc.",
    "Une séance courte est utile si elle contient quelques séries sérieuses. Elle n’a pas besoin d’être présentée comme une séance complète pour avoir de la valeur.",
    "Prépare dès maintenant une séance de secours avec 3 exercices que tu maîtrises. Tu n’auras plus à l’inventer le jour où ton agenda déborde.",
  ),
  "conseil-progresser-simple": clear(
    "Progresser sans refaire tout ton programme",
    "Avant de changer d’exercices, essaie d’améliorer un petit élément mesurable.",
    4,
    "Progresser ne signifie pas forcément ajouter du poids chaque semaine. Tu peux aussi faire une répétition de plus, mieux contrôler la descente, augmenter l’amplitude ou réaliser la même séance avec une technique plus stable.",
    [
      ["Choisis un seul repère par exercice",
        "Note la charge, les répétitions et le nombre de séries. La fois suivante, améliore un seul de ces éléments. Si tu as fait 3 séries de 8, tu peux viser 9 répétitions sur la première série sans toucher au reste.",
        "Changer plusieurs variables en même temps empêche de savoir ce qui a fonctionné et augmente vite la fatigue."],
      ["Utilise une fourchette de répétitions",
        "Une méthode simple consiste à travailler entre 8 et 12 répétitions. Tu gardes la même charge jusqu’à pouvoir faire 12 répétitions sur toutes les séries avec une bonne technique. Ensuite, tu augmentes légèrement la charge et tu repars vers 8 ou 9.",
        "Une mauvaise séance isolée n’efface pas la tendance. Regarde plutôt les trois ou quatre dernières séances."],
    ],
    "Au développé avec haltères, tu fais 10, 9 puis 8 répétitions avec 12 kg. La séance suivante, vise 10, 9 puis 9. Quand tu atteindras 12, 12, 12 proprement, passe par exemple à 14 kg et accepte de redescendre autour de 8 répétitions.",
    "Garde le même programme assez longtemps pour comparer tes résultats. Fais progresser une variable à la fois : répétitions, charge, série ou qualité technique.",
    "Choisis aujourd’hui un exercice et écris son résultat exact. À la prochaine séance, vise une seule répétition propre supplémentaire au total.",
  ),
  "conseil-bonne-charge": clear(
    "Choisir la bonne charge sans se compliquer",
    "La bonne charge te fait travailler fort tout en te laissant terminer les répétitions prévues proprement.",
    4,
    "Tu n’as pas besoin de connaître ton maximum pour choisir une charge. Observe surtout les dernières répétitions et estime combien tu aurais pu en faire de plus avec la même technique.",
    [
      ["Fais une première série d’essai",
        "Choisis une charge prudente. Si la série prévue est de 10 répétitions et que tu pourrais en faire au moins 5 de plus, augmente légèrement. Si tu ne peux pas atteindre 10 sans raccourcir le mouvement ou te tordre, diminue.",
        "Pour la plupart des exercices, une marge de 1 à 3 répétitions est un bon repère. Un débutant peut garder davantage de marge le temps d’apprendre."],
      ["Accepte que la charge varie",
        "La charge adaptée peut changer avec le sommeil, le stress, la chaleur ou une pause récente. Baisser de 5 à 10 % un jour difficile ne signifie pas que tu as perdu ton niveau.",
        "La priorité reste de produire l’effort prévu dans de bonnes conditions. Le nombre inscrit sur l’haltère n’est qu’un moyen."],
    ],
    "Tu dois faire 10 répétitions de rowing. Avec 16 kg, tu en fais 10 et tu pourrais en faire encore 6 : essaie 18 kg. Avec 20 kg, tu tires avec l’épaule et bloques à 8 : reviens à 18 kg. Si 18 kg te laisse environ 2 répétitions propres, garde cette charge.",
    "Une charge est adaptée si tu termines le nombre prévu avec une technique stable et environ 1 à 3 répétitions encore possibles.",
    "Sur ton premier exercice, fais une série prudente puis réponds honnêtement : 0, 1, 2, 3 ou plus de répétitions restantes ? Ajuste la série suivante.",
  ),
  "conseil-courbatures": clear(
    "Courbatures : ce qu’elles signifient vraiment",
    "Avoir mal le lendemain ne permet pas de savoir si une séance était efficace.",
    4,
    "Les courbatures apparaissent souvent après un exercice nouveau, une reprise ou beaucoup de travail en position étirée. Elles indiquent que le corps a subi un effort inhabituel. Elles ne mesurent ni la quantité de muscle gagnée ni la qualité du programme.",
    [
      ["Pourquoi elles diminuent avec l’habitude",
        "Quand tu répètes régulièrement un mouvement, le corps s’y adapte et les courbatures diminuent, même si l’exercice continue de stimuler les muscles. Ne plus avoir mal après les squats ne signifie donc pas qu’ils ne servent plus.",
        "À l’inverse, changer d’exercice chaque semaine peut créer beaucoup de courbatures sans permettre une progression mesurable."],
      ["Quels indicateurs regarder à la place",
        "Observe si tu fais davantage de répétitions, si tu contrôles mieux le mouvement, si la même charge paraît plus facile ou si tu récupères mieux entre les séries. Ces repères décrivent plus directement ton évolution.",
        "Des courbatures légères autorisent souvent une activité douce. Si la douleur est forte, limite le mouvement ou empêche les gestes quotidiens, laisse plus de récupération."],
    ],
    "Après tes premières fentes, tu as mal pendant trois jours. Trois semaines plus tard, tu n’as presque plus de courbatures mais tu réalises 3 séries de 12 au lieu de 3 séries de 8. Le second résultat montre une progression, même si la sensation du lendemain est plus faible.",
    "Les courbatures signalent surtout un effort inhabituel. Juge tes séances avec tes répétitions, tes charges, ta technique et ta récupération.",
    "Pendant deux semaines, note un repère de performance après chaque séance et ne donne aucune note à tes courbatures.",
  ),
  "conseil-echauffement": clear(
    "Échauffement : quoi faire en 5 à 10 minutes",
    "Prépare les mouvements de la séance sans dépenser l’énergie nécessaire pour les réaliser.",
    4,
    "Un échauffement sert à augmenter progressivement l’effort et à répéter les gestes qui arrivent. Il n’a pas besoin d’être identique pour toutes les séances ni de contenir vingt exercices de mobilité.",
    [
      ["Commence par bouger quelques minutes",
        "Marche rapide, vélo tranquille ou mouvements dynamiques pendant trois à cinq minutes suffisent souvent pour augmenter la température et te faire passer du repos à l’activité. Tu dois te sentir plus disponible, pas déjà fatigué."],
      ["Fais des séries d’approche",
        "Avant un exercice lourd, réalise le même mouvement avec une charge légère, puis une charge intermédiaire. Plus la charge de travail est élevée, plus ces étapes sont utiles. Elles permettent aussi de vérifier les sensations du jour.",
        "Ajoute un exercice de mobilité seulement si une zone précise limite le mouvement. Une routine générale très longue n’est pas obligatoire."],
    ],
    "Tu prévois des squats à 60 kg. Fais 4 minutes de vélo, 10 squats au poids du corps, 8 répétitions barre vide, puis 5 répétitions à 40 kg. Si tout est fluide, commence tes séries à 60 kg. Inutile d’ajouter quinze minutes d’étirements sans besoin précis.",
    "Fais 3 à 5 minutes d’activité facile, puis 2 ou 3 séries progressives du premier exercice. Arrête l’échauffement quand tu es prêt, pas quand tu es fatigué.",
    "À ta prochaine séance, teste un échauffement chronométré de 8 minutes maximum et note si ta première série de travail est aussi bonne.",
  ),
  "conseil-repos-series": clear(
    "Combien de temps se reposer entre les séries",
    "Le repos doit être assez long pour que la série suivante reste proche de la première.",
    3,
    "Se reposer n’enlève rien à l’intensité d’une séance. La pause permet aux muscles, à la respiration et à la concentration de récupérer suffisamment pour produire un nouvel effort de qualité.",
    [
      ["Utilise des repères simples",
        "Pour un exercice lourd ou qui mobilise beaucoup de muscles, commence autour de deux à trois minutes. Pour un exercice d’isolation ou une série moins exigeante, une à deux minutes peuvent suffire.",
        "Le chronomètre est un point de départ. Si tu respires encore très fort, si ta technique risque de se dégrader ou si tes répétitions chutent brutalement, prends un peu plus de temps."],
      ["Ne raccourcis pas les pauses uniquement pour souffrir davantage",
        "Des pauses courtes peuvent être choisies pour un circuit ou un travail cardiovasculaire. En musculation, elles réduisent souvent le nombre de répétitions possibles. Il faut que ce soit un choix du programme, pas une obligation."],
    ],
    "Tu fais 10 répétitions de développé, puis seulement 6 à la deuxième série après 45 secondes de pause. Avec 2 minutes, tu en réalises 9. Si ton objectif est le travail musculaire, les 2 minutes te permettent de mieux maintenir la qualité.",
    "Commence avec 2 à 3 minutes sur les gros exercices et 1 à 2 minutes sur les exercices simples. Allonge si la série suivante se dégrade fortement.",
    "Ajoute 30 secondes de repos à ton exercice principal et compare le nombre de répétitions sur la dernière série.",
  ),
  "conseil-sommeil": clear(
    "Sommeil : son effet réel sur tes séances",
    "Des nuits trop courtes peuvent réduire l’énergie, la récupération et la qualité de l’entraînement.",
    4,
    "Le sommeil influence la vigilance, l’humeur, la coordination et la perception de l’effort. Tu peux avoir un excellent programme et tout de même trouver chaque charge plus lourde après plusieurs mauvaises nuits.",
    [
      ["Commence par la durée et la régularité",
        "Pour la plupart des adultes, viser régulièrement au moins sept heures est une base raisonnable. Les besoins varient, mais aucune astuce de récupération ne remplace durablement un temps de sommeil insuffisant.",
        "Une heure de lever assez stable aide souvent davantage qu’une routine parfaite impossible à tenir."],
      ["Adapte la séance après une mauvaise nuit",
        "Une seule nuit courte ne demande pas automatiquement d’annuler. Commence plus progressivement et juge tes sensations. Tu peux garder les mêmes exercices avec moins de charge, une série en moins ou davantage de marge.",
        "Si la somnolence rend un exercice dangereux, choisis une variante stable, une marche ou du repos."],
    ],
    "Tu as dormi cinq heures et les squats habituels semblent très lourds dès l’échauffement. Au lieu de forcer le programme exact, baisse la charge de 10 %, garde trois répétitions de marge et retire la dernière série. Tu as entraîné le mouvement sans transformer une mauvaise nuit en mauvaise décision.",
    "Protège d’abord un temps de sommeil suffisant. Après une nuit courte, adapte la charge ou le volume selon tes sensations au lieu de vouloir prouver ton niveau.",
    "Choisis une heure de lever réaliste à garder cinq jours cette semaine et prépare une version allégée de ta prochaine séance.",
  ),
  "conseil-proteines": clear(
    "Protéines : combien et comment les répartir",
    "Quelques sources régulières dans la journée suffisent souvent sans compter chaque gramme.",
    4,
    "Les protéines fournissent les éléments utilisés pour entretenir et construire les tissus musculaires. Les personnes qui s’entraînent en ont généralement besoin d’un peu plus, mais le calcul exact n’est pas obligatoire pour bien commencer.",
    [
      ["Un repère chiffré, si tu en veux un",
        "Une fourchette souvent utilisée pour une personne active est d’environ 1,4 à 2 grammes de protéines par kilo de poids corporel et par jour. Ce repère n’est pas un examen à réussir au gramme près et doit être adapté en cas de problème médical.",
        "Tu peux répartir les apports sur trois ou quatre repas plutôt que tout concentrer le soir."],
      ["Une méthode sans calcul",
        "À chaque repas principal, ajoute une vraie source : œufs, poisson, viande, tofu, tempeh, légumineuses, skyr ou autre produit laitier selon tes choix. Une portion de la taille de ta paume est un repère visuel simple.",
        "La poudre est seulement un aliment pratique. Elle n’est utile que si elle facilite tes apports."],
    ],
    "Une personne de 70 kg peut viser environ 100 à 140 g par jour si elle souhaite utiliser le repère chiffré. Sans compter précisément, elle peut prévoir des œufs au petit-déjeuner, du poulet ou du tofu au déjeuner, un skyr en collation et des lentilles avec le dîner.",
    "Mets une source de protéines dans 3 ou 4 prises alimentaires de la journée. Le total régulier compte davantage qu’un repas ou un shaker parfait.",
    "Regarde tes trois prochains repas et ajoute une source identifiable de protéines à celui qui n’en contient presque pas.",
  ),
  "conseil-glucides": clear(
    "Glucides : à quoi servent-ils pour l’entraînement",
    "Pain, riz, pâtes, pommes de terre, céréales et fruits peuvent soutenir les efforts intenses.",
    4,
    "Les glucides sont stockés notamment sous forme de glycogène dans les muscles et le foie. Ce carburant est particulièrement utile pour les séries répétées, les circuits et les sports intenses. Les supprimer n’est pas nécessaire pour progresser ou perdre du gras.",
    [
      ["Adapte la quantité à ton activité",
        "Un jour avec une séance longue ou intense peut justifier davantage de féculents ou de fruits qu’un jour très calme. Il n’existe pas une quantité unique valable pour tout le monde.",
        "La quantité totale d’aliments et l’équilibre de la semaine comptent davantage que le fait de manger des glucides après une heure précise."],
      ["Avant une séance, choisis ce que tu digères",
        "Une à trois heures avant, un repas ou une collation contenant des glucides et peu d’aliments très gras peut faciliter la digestion. Si tu t’entraînes très tôt et te sens bien à jeun, tu n’es pas obligé de manger.",
        "Teste avec des aliments familiers plutôt que d’inventer une règle le jour d’une séance importante."],
    ],
    "Tu déjeunes à midi et t’entraînes à 18 h. Vers 16 h 30, une banane avec un yaourt ou une tartine peut apporter de l’énergie sans repas lourd. Si tu as déjà bien mangé et n’as pas faim, cette collation n’est pas obligatoire.",
    "Les glucides sont un carburant utile, surtout pour les efforts intenses. Ajuste leur quantité à ton activité, ta faim et ta digestion au lieu de les interdire.",
    "Avant une séance exigeante, teste une collation familière contenant des glucides et compare ton énergie avec une séance similaire.",
  ),
  "conseil-hydratation": clear(
    "Hydratation : combien boire autour d’une séance",
    "Bois régulièrement, puis augmente selon la chaleur, la durée et ta transpiration.",
    4,
    "Les besoins en eau varient fortement. Une petite personne qui marche dans une salle fraîche ne perd pas autant qu’une personne très transpirante qui court une heure en été. Un objectif universel au litre près serait donc trompeur.",
    [
      ["Utilise des signaux pratiques",
        "Arriver sans forte soif et avec des urines plutôt claires indique souvent une hydratation correcte. Pendant une séance de moins d’une heure dans des conditions normales, boire selon la soif convient à beaucoup de personnes.",
        "Pour un effort long, chaud ou très transpirant, garde une gourde accessible et bois par petites prises."],
      ["Quand penser aux électrolytes",
        "De l’eau suffit généralement pour une séance courte. Du sodium peut devenir utile si l’effort dure longtemps, s’il fait chaud ou si tu transpires beaucoup. Les boissons très concentrées ne sont pas automatiquement meilleures.",
        "Boire excessivement et très vite peut aussi être dangereux. L’objectif est de remplacer raisonnablement les pertes, pas de forcer plusieurs litres."],
    ],
    "Après une heure de course par temps chaud, ton poids passe de 70,0 à 69,3 kg : tu as perdu environ 0,7 kg malgré ce que tu as bu. Cette mesure ponctuelle indique que tu transpires beaucoup dans ces conditions et qu’il faut prévoir davantage d’eau la prochaine fois, pas boire cette quantité à chaque séance.",
    "Bois selon ta soif pour les séances ordinaires. Prévois davantage d’eau et éventuellement du sodium pour les efforts longs, chauds ou très transpirants.",
    "Pour ta prochaine séance chaude, note simplement ce que tu bois et si tu termines avec une forte soif. Ajuste progressivement, sans te forcer.",
  ),
  "conseil-seance-sautee": clear(
    "Que faire après avoir raté une séance",
    "Ne double pas automatiquement le travail : replace la séance ou reprends le programme normalement.",
    3,
    "Rater une séance ne supprime pas les semaines déjà réalisées. Le problème apparaît surtout quand la culpabilité conduit à abandonner plusieurs jours ou à ajouter une séance punitive trop lourde.",
    [
      ["Choisis entre déplacer et continuer",
        "Si un créneau proche est libre et que cela ne crée pas deux séances difficiles d’affilée, déplace la séance. Sinon, saute-la et continue au prochain jour prévu. Les deux choix sont valables.",
        "Évite de réunir deux séances complètes en une seule. Tu risques surtout d’allonger la fatigue sans récupérer tout le bénéfice manqué."],
      ["Rends le retour précis",
        "Décide du prochain moment, du lieu et de la version minimale. Une décision comme « mardi à 18 h, 30 minutes à la maison » est plus utile que « je me reprends bientôt ».",
        "Si les séances sautées se répètent, ajuste le programme à ton agenda au lieu de te reprocher ton agenda."],
    ],
    "Tu rates la séance jambes du mardi. Jeudi est libre et vendredi devait être une séance haut du corps : tu peux placer les jambes jeudi. Si jeudi est impossible, garde la séance du vendredi et reprends simplement le planning. Aucun doublage n’est nécessaire.",
    "Après une séance ratée, déplace-la seulement si elle s’intègre sans surcharge. Sinon, reprends à la prochaine séance prévue.",
    "Écris maintenant ta prochaine occasion concrète : jour, heure, lieu et durée minimale.",
  ),
  "conseil-debuter-salle": clear(
    "Débuter à la salle sans se sentir perdu",
    "Un plan court et préparé suffit pour les premières visites.",
    4,
    "La plupart des débutants pensent que tout le monde les regarde. En réalité, les autres pratiquants sont généralement occupés par leur propre séance. Tu n’as pas besoin de connaître toutes les machines pour avoir ta place.",
    [
      ["Réduis le nombre de décisions",
        "Prépare quatre exercices, dans l’ordre, avec une alternative pour chacun. Commence par des machines simples si elles te rassurent. Note le réglage du siège et la charge utilisée pour ne pas repartir de zéro.",
        "Visite la salle à une heure calme si possible et repère les vestiaires, l’eau et la zone où se trouvent tes exercices."],
      ["Demande une information précise",
        "Tu peux demander à un membre du personnel comment régler une machine ou où trouver un matériel. Une question courte n’oblige pas à raconter tout ton programme.",
        "Le but des premières semaines est d’apprendre les lieux et quelques mouvements, pas d’avoir l’air expérimenté."],
    ],
    "Pour ta première séance, prévois presse à cuisses, tirage vertical, développé guidé et gainage. Fais 2 séries légères de chaque. Si la presse est prise, remplace-la par un squat vers un banc. Tu sais quoi faire sans parcourir toute la salle au hasard.",
    "Prépare 4 exercices connus et leurs alternatives. Répète cette séance quelques fois avant d’ajouter de la complexité.",
    "Écris ta première séance sur une note avec l’ordre, les séries et une alternative par exercice.",
  ),
  "conseil-comparaison": clear(
    "Se comparer aux autres peut fausser tes progrès",
    "Compare surtout tes propres résultats dans des conditions similaires.",
    4,
    "Une photo, une charge ou une performance ne montre pas l’ancienneté, la génétique, le temps disponible, les blessures ni les priorités d’une personne. Utiliser ce résultat comme norme peut te faire croire à tort que tu progresses mal.",
    [
      ["Compare ce qui est réellement comparable",
        "Deux personnes de poids, de taille et d’expérience différents n’auront pas les mêmes charges. Même ton propre résultat varie selon le sommeil, le matériel et la technique utilisée.",
        "Pour suivre ta progression, compare le même exercice, avec une amplitude similaire, sur plusieurs semaines."],
      ["Choisis des repères utiles",
        "Tu peux suivre une charge, un nombre de répétitions, une durée de marche, une meilleure aisance ou une habitude tenue. Choisis des repères liés à ce que tu veux vraiment améliorer.",
        "Si un compte ou une conversation te pousse systématiquement à dévaloriser ton corps, t’en éloigner est une décision pratique, pas un manque de motivation."],
    ],
    "Une personne réalise un squat à 100 kg sur une vidéo. Tu ignores son poids, ses dix années de pratique et la profondeur du mouvement. Ton vrai repère est que ton squat est passé de 40 kg pour 8 répétitions à 45 kg pour 9 répétitions avec la même amplitude.",
    "Évalue tes progrès avec tes propres mesures prises dans des conditions similaires. Le résultat isolé d’une autre personne n’est pas une norme.",
    "Note une amélioration précise des huit dernières semaines : charge, répétitions, technique, énergie ou régularité.",
  ),
  "conseil-douleur-gene": clear(
    "Douleur, gêne et effort : comment les distinguer",
    "Une brûlure musculaire attendue n’est pas la même chose qu’une douleur vive ou inhabituelle.",
    5,
    "L’entraînement crée des sensations normales : muscles qui chauffent, respiration accélérée et fatigue progressive. Mais tu n’as pas à continuer automatiquement face à n’importe quelle douleur. Savoir s’arrêter fait partie d’une pratique responsable.",
    [
      ["Les sensations souvent attendues",
        "Une brûlure diffuse dans le muscle travaillé, un tremblement léger en fin de série ou un essoufflement qui diminue au repos sont fréquents. Ils doivent rester cohérents avec l’exercice et disparaître progressivement."],
      ["Les signaux qui demandent d’arrêter",
        "Arrête la série en cas de douleur vive, électrique, soudaine, située dans une articulation, accompagnée d’un craquement, d’une perte de force inhabituelle, d’un vertige, d’une douleur thoracique ou d’un essoufflement anormal.",
        "Ne teste pas plusieurs fois une douleur aiguë pour vérifier si elle est toujours là. Choisis un mouvement indolore ou termine la séance."],
      ["Quand demander un avis",
        "Une douleur qui persiste, s’aggrave, revient à chaque séance, réveille la nuit ou limite les gestes quotidiens mérite l’avis d’un professionnel de santé. Une application ne peut pas poser de diagnostic."],
    ],
    "Pendant des fentes, tes quadriceps brûlent progressivement des deux côtés : c’est cohérent avec l’effort. À la répétition suivante, une douleur vive apparaît dans un genou et modifie ta démarche : arrête les fentes. Essaie seulement une variante indolore et consulte si le problème persiste.",
    "Continue face à un effort musculaire contrôlé. Arrête face à une douleur vive, soudaine ou inhabituelle, puis demande un avis si elle persiste ou inquiète.",
    "Si une sensation te gêne, arrête la série et décris quatre points : endroit, type de douleur, moment d’apparition et évolution au repos.",
  ),
  "conseil-technique-parfaite": clear(
    "Technique : il n’existe pas une seule forme parfaite",
    "Une bonne technique respecte des principes de contrôle tout en s’adaptant à ton corps.",
    4,
    "Deux personnes peuvent exécuter correctement le même exercice avec des positions légèrement différentes. La longueur des membres, la mobilité, le matériel et l’objectif changent le mouvement visible.",
    [
      ["Les principes qui comptent",
        "Cherche une position stable, une amplitude que tu contrôles, une trajectoire reproductible et l’absence de douleur inquiétante. La charge doit rester adaptée à cette technique.",
        "Une consigne générale comme « les pieds exactement droits » n’est pas forcément adaptée à chaque personne. De petites variations peuvent être normales."],
      ["Modifie un détail à la fois",
        "Filme une série légère de côté ou demande un retour qualifié. Choisis ensuite un seul point : profondeur, stabilité, vitesse ou respiration. Répète avant de corriger autre chose.",
        "Si une variante reste inconfortable malgré une charge raisonnable, change la position ou l’exercice. Tu n’as pas à forcer ton corps dans une forme unique."],
    ],
    "Deux personnes squattent : l’une garde le buste assez vertical, l’autre se penche davantage parce que ses fémurs sont plus longs. Les deux peuvent avoir les pieds stables, les genoux contrôlés et une amplitude adaptée. Copier exactement l’angle de l’autre n’est pas l’objectif.",
    "Une technique sûre est stable, contrôlée, reproductible et sans douleur inhabituelle. Elle peut être légèrement différente d’une personne à l’autre.",
    "Filme une série légère d’un seul exercice et choisis un détail concret à améliorer, pas toute ta technique en même temps.",
  ),
  "conseil-echec-musculaire": clear(
    "Échec musculaire : quand l’utiliser",
    "Aller jusqu’à ne plus pouvoir faire une répétition peut servir, mais ce n’est pas nécessaire sur toutes les séries.",
    4,
    "L’échec musculaire arrive quand tu ne peux plus terminer une répétition correcte malgré un effort maximal. S’en approcher suffit généralement à rendre une série stimulante. Aller systématiquement jusqu’au blocage ajoute souvent plus de fatigue.",
    [
      ["Où l’échec est le moins risqué",
        "Il est plus simple à utiliser sur une machine, une élévation latérale ou un curl, où rater une répétition ne te coince pas sous une charge. Sur un squat libre, un développé couché sans sécurité ou un soulevé de terre, le coût technique et le risque sont plus élevés."],
      ["Comment l’intégrer",
        "Garde une à trois répétitions de marge sur la plupart des séries. Si tu veux tester l’échec, fais-le sur la dernière série d’un exercice simple que tu maîtrises, sans douleur et avec une installation sûre.",
        "L’échec est moins utile pour un débutant qui apprend encore à estimer son effort."],
    ],
    "Tu fais 3 séries de curl à la machine. Les deux premières s’arrêtent avec environ 2 répétitions possibles. Sur la dernière, tu continues jusqu’à ne plus pouvoir monter la charge sans tricher. Ce test ponctuel t’aide à vérifier ton estimation sans épuiser toute la séance.",
    "Garde 1 à 3 répétitions de marge sur la majorité des séries. Utilise éventuellement l’échec sur la dernière série d’un exercice simple et sûr.",
    "Sur une machine maîtrisée, compare une fois ton estimation avec le nombre réel de répétitions restantes. N’en fais pas un test à chaque séance.",
  ),
  "conseil-semaine-coherente": clear(
    "Construire une semaine d’entraînement réaliste",
    "Pars du nombre de créneaux que tu peux tenir, puis répartis les exercices.",
    5,
    "Un programme de cinq jours n’est pas meilleur s’il entre rarement dans ton agenda. Commence par les semaines normales, pas par la semaine idéale où aucun imprévu n’arrive.",
    [
      ["Choisis tes créneaux fiables",
        "Regarde les quatre dernières semaines et identifie deux ou trois moments réellement disponibles. Laisse de l’espace entre les séances difficiles si possible. Deux séances régulières permettent déjà d’entraîner tout le corps."],
      ["Répartis les mouvements importants",
        "Sur la semaine, prévois au moins des mouvements pour les jambes, une poussée, un tirage et le tronc. Avec deux jours, un format full body est pratique. Avec quatre jours, tu peux répartir haut et bas du corps.",
        "Commence avec un volume que tu récupères. Tu ajouteras des séries seulement si la progression et l’envie restent bonnes."],
      ["Prépare une version de secours",
        "Pour chaque créneau, définis une version courte avec deux exercices prioritaires. Si une journée déborde, tu sais immédiatement quoi garder."],
    ],
    "Tu peux t’entraîner mardi et samedi avec certitude, parfois jeudi. Programme deux full body complets mardi et samedi. Le jeudi devient une séance facultative plus courte, pas une obligation dont dépend tout le programme.",
    "Construis d’abord le programme autour de 2 ou 3 créneaux fiables. Couvre les grands mouvements et ajoute seulement ce que ton agenda permet vraiment.",
    "Observe tes quatre dernières semaines et entoure les deux créneaux qui ont été disponibles le plus souvent.",
  ),
  "conseil-plateau": clear(
    "Plateau : quoi vérifier avant de changer de programme",
    "Confirme d’abord que tu stagnes, puis modifie une seule cause probable.",
    5,
    "Une ou deux séances difficiles ne constituent pas un plateau. Les performances bougent avec le sommeil, le stress et l’alimentation. On parle plutôt de stagnation quand plusieurs séances comparables n’apportent plus d’amélioration.",
    [
      ["Vérifie tes données",
        "Compare au moins trois ou quatre séances : mêmes exercices, amplitude, charge et temps de repos. Regarde aussi si la technique s’est améliorée. Sans notes, une impression de stagnation peut être trompeuse."],
      ["Cherche la cause la plus probable",
        "Si tu termines toujours avec beaucoup de marge, l’effort est peut-être trop faible. Si les performances baissent et que tu es épuisé, le volume peut être trop élevé. Vérifie aussi le sommeil, les calories, les protéines et la régularité."],
      ["Teste un seul changement",
        "Ajoute une répétition cible, une série hebdomadaire, un peu de charge ou davantage de récupération. Garde le changement deux à trois semaines avant de conclure."],
    ],
    "Ton développé reste à 3 × 8 depuis quatre séances, mais tu finis avec 4 répétitions de marge. Au lieu de changer tout le programme, augmente légèrement la charge ou vise 3 × 9. Si tu étais déjà à l’échec avec des performances en baisse, une semaine plus légère serait plus logique.",
    "Confirme le plateau sur plusieurs séances comparables. Modifie ensuite une seule variable pendant 2 à 3 semaines.",
    "Écris une cause probable de ton plateau et le plus petit ajustement permettant de la tester.",
  ),
  "conseil-deload": clear(
    "Deload : quand et comment alléger une semaine",
    "Réduis temporairement le travail si la fatigue s’accumule et que les performances baissent.",
    4,
    "Un deload est une courte période où tu gardes les mouvements mais réduis la difficulté. Il peut être utile après plusieurs semaines exigeantes, surtout si plusieurs signes de fatigue apparaissent ensemble.",
    [
      ["Les signes à regarder",
        "Une performance en baisse pendant plusieurs séances, des courbatures persistantes, un sommeil dégradé, une motivation inhabituellement basse et des articulations irritées peuvent indiquer qu’un allègement est utile.",
        "Un seul mauvais jour n’impose pas un deload. Regarde la tendance sur une à deux semaines."],
      ["Comment alléger concrètement",
        "Pendant cinq à sept jours, fais environ moitié moins de séries et garde trois à cinq répétitions de marge. Tu peux aussi baisser les charges de 10 à 20 %. L’objectif est de sortir des séances en te sentant mieux qu’en entrant.",
        "Reprends ensuite progressivement le programme normal."],
    ],
    "Tu fais habituellement 4 séries par exercice avec 1 répétition de marge. Pendant le deload, passe à 2 séries avec une charge réduite de 15 % et arrête-toi avec 4 répétitions possibles. Tu continues à pratiquer sans entretenir la même fatigue.",
    "Si plusieurs signes de fatigue durent, allège 5 à 7 jours avec environ moitié moins de séries et davantage de marge.",
    "Compare tes performances, ton sommeil et tes douleurs des deux dernières semaines. Si plusieurs se dégradent, planifie une semaine allégée.",
  ),
  "conseil-volume-frequence": clear(
    "Volume et fréquence : combien de séries par semaine",
    "Compte d’abord les séries difficiles par muscle, puis répartis-les selon tes jours disponibles.",
    5,
    "Le volume correspond ici au nombre de séries suffisamment exigeantes réalisées pour un groupe musculaire. La fréquence indique combien de séances répartissent ce travail dans la semaine.",
    [
      ["Commence avec une dose modérée",
        "Il n’existe pas un nombre parfait pour tous. Un débutant peut progresser avec environ 6 à 10 séries hebdomadaires par grand groupe musculaire. Une personne avancée peut avoir besoin de davantage, mais uniquement si elle récupère.",
        "Les séries d’exercices composés comptent pour plusieurs muscles : un développé travaille notamment les pectoraux et les triceps."],
      ["Répartis quand la qualité baisse",
        "Faire 12 séries de jambes le même jour peut rendre les dernières très faibles. Les répartir sur deux séances de 6 séries permet souvent de mieux les exécuter.",
        "La fréquence n’est pas magique : deux séances ne sont meilleures que si elles aident à réaliser et récupérer le volume."],
    ],
    "Tu fais le lundi 4 séries de squat et 3 de fentes, puis le jeudi 3 séries de presse. Cela représente environ 10 séries exigeantes pour les cuisses réparties sur deux jours. Avant d’ajouter du travail, vérifie que tes répétitions progressent et que tu récupères.",
    "Commence autour de 6 à 10 séries difficiles par grand muscle et par semaine, puis ajuste selon la progression et la récupération.",
    "Compte cette semaine les séries difficiles d’un seul groupe musculaire. N’ajoute rien avant de connaître ce total.",
  ),
  "conseil-fullbody-split": clear(
    "Full body ou split : comment choisir",
    "Les deux formats fonctionnent si le volume, l’effort et la régularité sont comparables.",
    4,
    "Un programme full body entraîne plusieurs grandes zones à chaque séance. Un split répartit davantage les muscles selon les jours. Le nom du format ne détermine pas à lui seul les résultats.",
    [
      ["Choisis selon le nombre de jours",
        "Avec deux ou trois jours par semaine, le full body facilite généralement un travail régulier de tout le corps. Avec quatre jours, un format haut/bas peut être confortable. Avec davantage de jours, plusieurs répartitions sont possibles.",
        "Si tu rates souvent une journée, un split très fragmenté peut laisser un muscle sans travail pendant longtemps."],
      ["Vérifie la qualité des séances",
        "Le full body peut devenir long si tu ajoutes trop d’exercices. Le split peut créer beaucoup de fatigue locale en une seule séance. Choisis le format qui te permet de garder des séries propres et une durée réaliste.",
        "Le plaisir compte aussi : un format que tu apprécies sera plus souvent exécuté."],
    ],
    "Tu peux t’entraîner lundi, mercredi et samedi : trois full body donnent trois occasions de travailler chaque mouvement. Si tu préfères quatre jours courts, un haut du corps lundi/jeudi et un bas du corps mardi/samedi répartit le travail sans séances interminables.",
    "Avec 2 ou 3 jours, commence par du full body. Avec 4 jours, full body ou haut/bas fonctionnent. Choisis ensuite selon la durée et tes préférences.",
    "Choisis ton format d’après le nombre de jours que tu peux tenir pendant huit semaines normales.",
  ),
  "conseil-perdre-gras": clear(
    "Perdre du gras sans régime extrême",
    "Un déficit calorique modéré, des protéines et de la musculation protègent mieux ta forme.",
    5,
    "La perte de gras demande généralement de consommer un peu moins d’énergie que ce que le corps dépense sur la durée. Réduire brutalement les aliments peut faire baisser le poids vite, mais augmente souvent la faim, la fatigue et le risque d’abandon.",
    [
      ["Crée un déficit supportable",
        "Commence par une ou deux modifications : réduire les boissons caloriques, ajuster une portion très dense ou ajouter des légumes et des aliments rassasiants. Une perte moyenne lente est souvent plus facile à maintenir.",
        "Le poids varie chaque jour avec l’eau, le sel et la digestion. Observe une moyenne sur plusieurs semaines."],
      ["Protège le muscle et l’énergie",
        "Garde une alimentation suffisamment protéinée et continue la musculation. Évite de multiplier en même temps un gros déficit, beaucoup de cardio et un volume élevé de musculation.",
        "Si l’humeur, le sommeil, les performances ou le cycle menstruel se dégradent fortement, le plan est peut-être trop agressif. Un professionnel peut aider."],
    ],
    "Au lieu de supprimer pain, dessert et dîner, tu gardes tes repas, remplaces le soda quotidien par une boisson sans calories et réduis légèrement une portion de grignotage. Après trois semaines, regarde la moyenne du poids et ton énergie avant de modifier autre chose.",
    "Vise des changements alimentaires modérés que tu peux garder. Suis la tendance sur plusieurs semaines et protège protéines, sommeil et musculation.",
    "Choisis un seul changement alimentaire réaliste pour les deux prochaines semaines et laisse le reste stable.",
  ),
  "conseil-creatine": clear(
    "Créatine : effets, dose et précautions",
    "La créatine monohydrate est la forme la mieux étudiée ; 3 à 5 g par jour suffisent généralement.",
    4,
    "La créatine aide les muscles à régénérer rapidement de l’énergie lors d’efforts courts et intenses. Elle peut améliorer légèrement la force, le nombre de répétitions et, avec l’entraînement, la prise de masse musculaire.",
    [
      ["Comment la prendre simplement",
        "Choisis de la créatine monohydrate. Une dose quotidienne de 3 à 5 g fonctionne pour la plupart des adultes. L’heure importe peu ; la régularité compte davantage. Une phase de charge peut saturer plus vite les muscles mais n’est pas obligatoire.",
        "Tu peux la mélanger à de l’eau ou à un repas. Les versions plus coûteuses ne montrent pas clairement un meilleur effet."],
      ["Ce qu’il faut savoir",
        "Une hausse de poids de un à deux kilos peut apparaître au début à cause de l’eau stockée dans les muscles. Ce n’est pas une prise de gras. De légers troubles digestifs peuvent survenir avec une grosse dose prise d’un coup.",
        "En cas de maladie rénale, grossesse, traitement ou doute médical, demande un avis professionnel avant d’en prendre."],
    ],
    "Tu achètes un sachet indiquant uniquement « créatine monohydrate ». Tu prends 3 g chaque jour avec le déjeuner. Après deux semaines, la balance monte de 0,8 kg sans changement visible de gras : cette variation peut venir de l’eau musculaire et n’impose pas d’arrêter.",
    "Si tu choisis la créatine, prends 3 à 5 g de monohydrate chaque jour. La phase de charge et les formes coûteuses ne sont pas nécessaires.",
    "Avant d’acheter, vérifie la mention « créatine monohydrate », le prix par dose et l’absence de mélange inutile.",
  ),
  "conseil-cycle-menstruel": clear(
    "Cycle menstruel : faut-il adapter ses séances ?",
    "Adapte surtout selon tes symptômes personnels, pas selon une règle automatique liée au jour du cycle.",
    5,
    "Les recherches trouvent en moyenne des effets faibles et très variables du cycle sur la performance. Certaines personnes ne remarquent presque rien ; d’autres ont des douleurs, une fatigue ou des saignements qui modifient réellement une séance.",
    [
      ["Évite les calendriers rigides",
        "Une application ne peut pas conclure que tu dois faire du lourd à une phase et arrêter à une autre. Les cycles varient entre personnes et d’un mois à l’autre. Les contraceptifs changent aussi le contexte.",
        "Si tu te sens bien, tu peux suivre la séance prévue. Il n’existe pas d’interdiction générale."],
      ["Utilise tes propres observations",
        "Pendant deux ou trois cycles, note les symptômes, l’énergie et la performance. Si une tendance claire apparaît, prépare une version adaptée : moins de séries, charge plus légère, pauses plus longues ou activité douce.",
        "Des douleurs très fortes, un malaise ou des saignements anormalement abondants méritent un avis médical."],
    ],
    "Tu constates pendant trois cycles que le premier jour des règles s’accompagne de crampes fortes et d’une baisse d’énergie. Tu gardes le même créneau mais remplaces les squats lourds par des exercices stables et retires une série. Les autres jours, tu suis le programme normal.",
    "Ne change pas automatiquement l’entraînement selon une phase théorique. Observe tes symptômes et adapte seulement quand ils affectent réellement la séance.",
    "Pendant un mois, note après chaque séance l’énergie, les symptômes et la qualité du travail de 1 à 5.",
  ),
  "conseil-stress": clear(
    "Comment adapter une séance quand tu es très stressé",
    "Garde les mouvements prévus, mais réduis le volume ou la charge si l’échauffement confirme une baisse de forme.",
    4,
    "Le stress professionnel, familial ou émotionnel peut augmenter la fatigue, perturber le sommeil et rendre l’effort plus difficile. Une performance plus faible ce jour-là ne signifie pas que tu as perdu tes progrès.",
    [
      ["Décide après l’échauffement",
        "Commence avec des charges légères. Si les sensations deviennent normales, suis le programme. Si chaque charge reste anormalement lourde, choisis une version réduite au lieu de forcer le plan exact."],
      ["Prépare trois versions",
        "Version normale : toute la séance. Version allégée : mêmes exercices avec 10 % de charge ou un tiers de séries en moins. Version courte : deux exercices prioritaires, puis fin.",
        "Si tu es malade, étourdi, en dette de sommeil importante ou émotionnellement dépassé, le repos peut être le meilleur choix. Bouger ne doit pas devenir une obligation supplémentaire."],
    ],
    "Tu devais faire quatre exercices de 4 séries après une journée très stressante. L’échauffement paraît lourd. Tu gardes les deux exercices principaux, fais 3 séries au lieu de 4 avec davantage de marge, puis rentres. Tu as maintenu la pratique sans exiger une performance normale dans une journée anormale.",
    "Utilise l’échauffement pour choisir entre séance normale, allégée ou courte. Une adaptation ponctuelle ne supprime pas tes progrès.",
    "Écris avant ta prochaine séance les versions normale, allégée et courte. Le jour difficile, tu choisiras sans négocier.",
  ),
};

export const ADVICE_ARTICLES: AdviceArticle[] = ADVICE_DRAFTS.map((article) => ({
  ...article,
  ...CONCRETE_CONTENT[article.id],
}));

export const ADVICE_BY_ID = new Map(ADVICE_ARTICLES.map((article) => [article.id, article]));

export function getAdviceArticle(id: string): AdviceArticle | null {
  return ADVICE_BY_ID.get(id) ?? null;
}
