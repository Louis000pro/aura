/* ════════════════════════════════════════════════════════════════════
   LES FICHES PUBLIQUES D'EXERCICES · contenu éditorial de /exercices

   ── POURQUOI CE FICHIER EXISTE À CÔTÉ DE exerciseLibrary.ts ──────────
   `exerciseLibrary.ts` est lu par treize modules, dont la génération de
   séance par l'IA (`api/workout/generate`), qui lui demande une liste
   FERMÉE de noms à recopier mot pour mot. Toucher ce fichier, c'est
   toucher au cœur de l'app. Le contenu marketing d'une page publique n'a
   rien à y faire : il change souvent, il ne sert qu'au web, et une faute
   de frappe dedans ne doit jamais pouvoir casser une séance.

   D'où la séparation :

     exerciseLibrary.ts   la VÉRITÉ DU MOUVEMENT
                          nom canonique, muscles, matériel, séries, reps,
                          repos, consigne (`tip`), bénéfice, animation.
                          Ce fichier n'est PAS modifié par le chantier SEO.

     exercicesPublics.ts  la PAGE
                          slug figé, title, description, définition,
                          étapes, erreurs, variantes, placement.

   ── LA CLÉ DE JOINTURE ──────────────────────────────────────────────
   `exercice` porte le nom canonique exact de l'entrée de la bibliothèque.
   Ce n'est pas un choix par défaut : ce nom EST déjà la clé de jointure de
   toute l'application. `resolveGuide()` s'en sert pour trouver l'animation,
   `trouverExercice()` pour retrouver l'entrée, et l'IA le recopie tel quel
   pour composer une séance. Il est donc de fait immuable, et c'est
   documenté comme tel dans AGENTS.md (« on ajoute, on ne renomme rien »).

   Réponse à la question posée : NON, il n'y a pas de raison technique de
   mettre le slug dans `exerciseLibrary.ts`. Le seul argument aurait été
   d'éviter une résolution de nom au rendu, mais elle coûte une lecture de
   Map, une fois, côté serveur, au build. En échange, la bibliothèque
   applicative reste vierge de toute notion d'URL. Si un jour l'app doit
   afficher « voir la fiche publique » depuis un écran connecté, elle
   importera `slugDeLExercice()` d'ici, et le sens de la dépendance restera
   le bon : le public connaît l'app, l'app n'a pas à connaître le public.

   ── LA JOINTURE EST VÉRIFIÉE, PAS SUPPOSÉE ──────────────────────────
   Une clé qui ne résout pas produirait une page à moitié vide, en
   silence. `verifierFiches()` (appelée par le hub et par chaque fiche au
   rendu serveur) refuse une fiche dont le nom n'existe pas dans la
   bibliothèque. C'est la même leçon que les règles d'animation : un
   échec muet est pire qu'une erreur.

   ── LES SLUGS SONT FIGÉS, POUR TOUJOURS ─────────────────────────────
   Ils sont écrits à la main, jamais calculés depuis le nom. Un slug
   calculé change le jour où quelqu'un corrige une faute dans le nom, et
   une URL indexée qui change est une URL perdue. Ils sont aussi vérifiés
   contre `SLUGS_RESERVES` : les catégories vivront un jour sur le même
   segment (`/exercices/pectoraux`), aucun exercice ne peut leur voler
   leur mot.

   ── AJOUTER UNE FICHE ───────────────────────────────────────────────
   ⚠️ LIRE D'ABORD `docs/lot-seo-3-fiches-exercices.md`. C'est le contrat
   éditorial du lot, et il n'est pas décoratif : il dit notamment qu'il
   n'y a AUCUN quota de mots, que le développé couché est un modèle
   visuel et pas un modèle éditorial à recopier, et qu'une variante ne se
   classe jamais en « plus facile » ou « plus difficile ». Il contient
   aussi le brief de chacune des sept fiches restantes.

   1. une entrée ici, avec un slug qu'on n'aura plus jamais le droit de
      changer, et `contenu` rédigé à la main ;
   2. c'est tout. Sans `contenu`, la fiche est connue mais pas publiée :
      elle n'a pas de route, pas d'entrée de sitemap, et le hub l'annonce
      comme à venir. C'est ce qui permet de lancer un pilote sans mentir.
   ════════════════════════════════════════════════════════════════════ */

import { trouverExercice, type LibExercise } from "./exerciseLibrary";
import { resolveGuide } from "./exerciseGuides";

/* ─────────────────────────── Catégories ───────────────────────────
   Elles ne sont PAS publiées au pilote : avec huit fiches, une page
   « épaules » afficherait un seul exercice, ce qui ne rend service à
   personne et donne au moteur une page maigre à indexer. Elles sont
   déclarées ici pour deux raisons concrètes : réserver leurs mots dans
   l'espace des slugs dès maintenant, et donner à chaque fiche son fil
   d'Ariane, qui lui, existe déjà.                                    */

export type CategoriePublique =
  | "pectoraux" | "dos" | "epaules" | "bras" | "jambes" | "abdos" | "cardio" | "mobilite";

export const CATEGORIES: { id: CategoriePublique; label: string }[] = [
  { id: "pectoraux", label: "Pectoraux" },
  { id: "dos",       label: "Dos" },
  { id: "epaules",   label: "Épaules" },
  { id: "bras",      label: "Bras" },
  { id: "jambes",    label: "Jambes" },
  { id: "abdos",     label: "Abdos" },
  { id: "cardio",    label: "Cardio" },
  { id: "mobilite",  label: "Mobilité" },
];

/** Les mots que la catégorie s'est réservés sur le segment `/exercices/…`.
    Un slug d'exercice ne peut jamais en prendre un : le jour où on publie
    `/exercices/pectoraux`, il n'y aura rien à arbitrer. */
export const SLUGS_RESERVES: string[] = CATEGORIES.map((c) => c.id);

export function libelleCategorie(id: CategoriePublique): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/* ──────────────────────────── Le contenu ─────────────────────────── */

/** À qui le mouvement s'adresse. Volontairement grossier : trois marches
    suffisent, et une échelle plus fine serait une promesse qu'on ne sait
    pas tenir. */
export type NiveauPublic = "debutant" | "intermediaire" | "confirme";

const LIBELLE_NIVEAU: Record<NiveauPublic, string> = {
  debutant: "débutant",
  intermediaire: "intermédiaire",
  confirme: "confirmé",
};

export function libelleNiveau(de: NiveauPublic, a: NiveauPublic): string {
  const mot = de === a ? LIBELLE_NIVEAU[de] : `${LIBELLE_NIVEAU[de]} à ${LIBELLE_NIVEAU[a]}`;
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

/** Une étape d'exécution. `titre` nomme le temps du mouvement, il ne
    numérote pas : le numéro est posé par l'affichage. */
export type Etape = { titre: string; texte: string };

/** Une erreur fréquente. `pourquoi` dit ce qu'elle coûte, sinon la
    consigne devient un ordre sans raison, et personne ne la retient. */
export type Erreur = { titre: string; pourquoi: string };

/** Une variante. `exercice` pointe vers un nom canonique de la
    bibliothèque, donc la carte peut afficher sa vraie animation. Si cet
    exercice a lui aussi une fiche publiée, l'affichage en fait un lien ;
    sinon la carte reste informative. Jamais de lien mort.

    ⚠️ `angle` dit EN QUOI la variante diffère, jamais si elle est plus
    facile ou plus difficile. Les deux premières fiches montraient les
    pompes comme « plus facile » et les haltères comme « plus difficile » :
    c'est faux pour beaucoup de gens. Des pompes tenues proprement sont
    exigeantes, et des haltères légers sont plus abordables qu'une barre
    chargée. On décrit donc la vraie différence (poids du corps, matériel,
    stabilité, amplitude) et on laisse le lecteur juger de ce qui est dur
    pour lui. */
export type Variante = {
  angle: string;
  exercice: string;
  texte: string;
};

/** Le corps rédigé de la fiche. Son absence signifie « pas encore écrite »,
    et c'est le seul interrupteur de publication : il n'y a pas de booléen
    à oublier de basculer. */
export type ContenuFiche = {
  /** La phrase d'ouverture. RÈGLE : elle doit contenir une information
      qu'on ne pourrait pas écrire pour un autre exercice. Si elle marche
      aussi bien pour le squat, elle est à réécrire. */
  definition: string;
  /** « mouvement » = un geste qui va et vient, on décrit ses temps.
      « tenue » = une position à tenir (gainage, étirements), où parler de
      descente et de poussée produirait du vide. Quinze exercices de la
      bibliothèque n'ont qu'une seule pose : ce sont eux. */
  gabarit: "mouvement" | "tenue";
  etapes: Etape[];
  erreurs: Erreur[];
  variantes: Variante[];
  /** Le titre de la section des variantes, quand « Variantes et
      progressions » serait inexact.

      Les burpees n'ont pas de variante dans la bibliothèque : les squats
      sautés et les mountain climbers sont des mouvements voisins qu'on
      choisit à leur place, pas des versions du burpee. Le soulevé de
      terre mélange les deux cas, avec un vrai dérivé (le roumain) et un
      mouvement proche qui partage sa charnière de hanches (le swing).
      Laisser « progressions » sur ces deux fiches ferait passer une
      alternative pour une marche à monter. */
  titreVariantes?: string;
  /** Où le placer dans une séance. Court, concret, propre au mouvement. */
  placement: string;
  /** Les pastilles du héros, quand celles de la bibliothèque ne peuvent
      pas être servies telles quelles.

      `lib.muscles` est une liste d'étiquettes d'écran : elle range côte à
      côte des muscles (« Biceps »), des régions (« Dos ») et des
      catégories d'effort (« Cardio », « Corps entier »). C'est cohérent
      pour un filtre dans l'application, où elles servent à trier. Sur une
      page publique lue par quelqu'un qui cherche ce qu'un exercice
      travaille, « Cardio » posé au milieu de noms de muscles n'est pas
      une réponse. Cette liste, quand elle est là, remplace la sienne. */
  muscles?: string[];
  /** Le matériel en clair, quand le libellé de famille de la bibliothèque
      est trop vague pour une page publique : « Haltères & barre » est un
      filtre d'écran correct, mais un visiteur veut savoir qu'il lui faut
      un banc. Absent, on retombe sur le libellé de famille. */
  materiel?: string;
  /** Le même matériel en un ou deux mots, pour le surtitre du héros.

      Il en faut un séparé, et pas seulement une troncature : le surtitre
      annonçait « PECTORAUX · HALTÈRES & BARRE » sur une fiche qui décrit
      le développé couché À LA BARRE. Le libellé de famille de la
      bibliothèque range les deux ensemble, ce qui est juste pour un
      filtre d'écran et ambigu en tête de page. Absent, on retombe sur le
      libellé de famille. */
  materielCourt?: string;
  /** Facultatif : la précaution qui mérite d'être dite. Rien de médical,
      rien d'alarmiste, et surtout pas sur toutes les fiches, sinon elle
      devient un bandeau qu'on ne lit plus. */
  precaution?: string;
  /** La phrase du héros, quand celle de la bibliothèque ne peut pas être
      servie au public.

      Par défaut c'est `lib.benefit` qui parle, et c'est très bien : elle
      est déjà écrite par exercice. Mais elle a été écrite pour un écran
      d'application, où l'emphase est sans conséquence. Le soulevé de
      terre y est « le mouvement le plus complet de toute la salle » : un
      superlatif, exactement ce que le contrat éditorial interdit sur une
      page publique. Plutôt que de corriger `exerciseLibrary.ts`, que
      treize modules lisent, la fiche peut dire la sienne. */
  promesse?: string;
  /** Le nom tel qu'il doit apparaître dans « Comment faire … ».

      L'affichage déduit l'article du nom, et sa règle est bonne dans la
      plupart des cas. Elle se trompe sur tout nom qui finit par
      « haltères » : elle y lit un pluriel et écrit « comment faire LES
      développé militaire haltères ». Le nom est aussi parfois plus long
      que ce qu'on dit à l'oral (« soulevé de terre classique »). Cette
      valeur, quand elle est là, remplace la déduction. */
  nomDansLeTitre?: string;
};

export type FichePublique = {
  /** Figé pour toujours. Ne jamais recalculer depuis le nom. */
  slug: string;
  /** Nom canonique EXACT d'une entrée de `EXERCISE_LIBRARY`. */
  exercice: string;
  categorie: CategoriePublique;
  /** ⚠️ AUCUNE FICHE NE DOIT LE REMPLIR AUJOURD'HUI. Règle durable, posée
      par Louis le 2026-08-09 et écrite dans le contrat éditorial
      (`docs/lot-seo-3-fiches-exercices.md`, section 3) :

        On n'attribue pas de niveau public à un exercice tant que Vaiiya ne
        possède pas une taxonomie de difficulté ou de niveau explicitement
        définie et validée comme donnée produit. On n'invente jamais cette
        valeur fiche par fiche pour remplir le héros.

      Ce champ a été créé pour ce chantier alors qu'aucune donnée de
      difficulté n'existe dans `exerciseLibrary.ts` (le type `Raw` n'en a
      pas de champ). Résultat : cinq fiches sur huit ont affiché « Débutant
      à confirmé », c'est-à-dire tout le monde, et les trois autres un
      jugement écrit pour la page seule. Sur les burpees, un mouvement au
      poids du corps que beaucoup de débutants pratiquent, « Intermédiaire
      à confirmé » fermait une porte qu'aucune donnée ne nous autorisait à
      fermer.

      Il reste déclaré, facultatif et inutilisé, pour le jour où la
      taxonomie existera. Le héros s'en passe par construction :
      `lignesDuHero` saute la ligne absente, et on ne met RIEN à sa
      place. */
  niveau?: { de: NiveauPublic; a: NiveauPublic };
  /** Le title de la balise, sans le suffixe « · Vaiiya » que le gabarit
      racine ajoute (9 caractères). Écrit à la main : un gabarit produirait
      huit titres jumeaux, ce qui est exactement le défaut qu'on évite. */
  title: string;
  description: string;
  contenu?: ContenuFiche;
};

/* ═══════════════════════ LES HUIT FICHES PILOTES ═══════════════════════
   Sélection arrêtée avec Louis à partir de données Bing France mesurées
   sur trois mois. Ces chiffres sont des impressions Bing, ils ne disent
   rien des volumes Google et ne doivent pas être présentés comme tels.
   Les slugs ci-dessous sont définitifs à partir de leur mise en ligne. */

export const FICHES: FichePublique[] = [
  {
    slug: "developpe-couche",
    exercice: "Développé couché",
    categorie: "pectoraux",
    title: "Développé couché : technique, muscles et erreurs",
    description:
      "Comment faire le développé couché à la barre : placement, exécution, muscles travaillés et les erreurs qui limitent la progression. Animation du mouvement.",
    contenu: {
      definition:
        "Allongé sur un banc, on descend une barre jusqu’au bas de la poitrine puis on la repousse à bout de bras. Le banc porte le buste, donc il n’y a pas d’équilibre à gérer : c’est l’une des raisons pour lesquelles on y manipule en général des charges plus élevées que sur les autres mouvements de poussée du haut du corps.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allonge-toi les yeux à l’aplomb de la barre. Cinq appuis, et ils comptent : la tête, le haut du dos et les fessiers sur le banc, les deux pieds à plat au sol. Serre les omoplates l’une vers l’autre et garde-les serrées jusqu’à la fin de la série : c’est ce placement qui donne à l’épaule un appui stable. Prends la barre un peu plus large que les épaules, poignets dans l’axe des avant-bras.",
        },
        {
          titre: "Descendre",
          texte:
            "Sors la barre du rack et amène-la à l’aplomb des épaules, bras tendus. Descends lentement en gardant les coudes à environ 45 degrés du buste, vers le bas des pectoraux, dans l’amplitude où l’épaule reste confortable. Inspire pendant la descente. La barre se pose, elle ne s’écrase pas.",
        },
        {
          titre: "Pousser",
          texte:
            "Repousse la barre vers le haut, légèrement en direction des épaules, en poussant aussi le sol avec les pieds. Souffle au moment où ça devient dur. Tends les bras sans claquer les coudes en fin de mouvement.",
        },
      ],
      erreurs: [
        {
          titre: "Faire rebondir la barre sur la poitrine",
          pourquoi:
            "L’élan prend une partie du travail à la place des pectoraux, et le contact devient brutal. Descends jusqu’au contact, marque un temps très court, puis repousse.",
        },
        {
          titre: "Ouvrir les coudes à 90 degrés",
          pourquoi:
            "Coudes complètement écartés, l’avant de l’épaule est davantage sollicité et fatigue souvent avant les pectoraux. Autour de 45 degrés du buste, la poussée se répartit mieux.",
        },
        {
          titre: "Décoller les fessiers du banc",
          pourquoi:
            "Cambrer permet souvent de pousser un peu plus lourd, mais une partie du travail quitte les pectoraux et le bas du dos se retrouve sollicité au passage. Si les fessiers se lèvent série après série, c’est en général le signe qu’il faut alléger.",
        },
      ],
      variantes: [
        {
          angle: "Au poids du corps",
          exercice: "Pompes",
          texte:
            "Le même schéma de poussée, sans matériel, avec une partie de ton poids de corps comme charge. Les appuis au sol demandent plus de gainage, et poser les genoux ou surélever les mains permet d’ajuster.",
        },
        {
          angle: "Avec deux haltères",
          exercice: "Développé couché haltères",
          texte:
            "Chaque bras porte sa charge et se stabilise seul, ce qui demande plus de contrôle. Les haltères laissent aussi les mains descendre un peu plus bas que la barre, qui s’arrête au contact de la poitrine, et ils se posent sur les côtés en fin de série.",
        },
      ],
      placement:
        "C’est un mouvement chargé et technique, dont l’exécution se dégrade vite une fois fatigué : on le place donc souvent tôt dans une séance de haut du corps, tant qu’on est frais. Ce qui vient après dépend de la séance et de l’objectif, mais le travail plus léger ou plus ciblé se garde en général pour la suite, une fois le gros du travail fait.",
      materiel: "Barre, banc et supports",
      materielCourt: "Barre",
      precaution:
        "Travaille avec un pareur, ou avec des barres de sécurité réglées à hauteur de poitrine. Une barre qu’on n’arrive plus à repousser reste au-dessus de soi, alors que des haltères se posent sur les côtés.",
    },
  },
  {
    slug: "squat",
    exercice: "Squat",
    categorie: "jambes",
    title: "Squat : technique, muscles et erreurs fréquentes",
    description:
      "Le squat au poids du corps : placement des pieds, profondeur, remontée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "S’accroupir puis se relever, les deux pieds au sol. C’est un geste qu’on retrouve dans la vie courante, quand on se lève d’une chaise ou qu’on ramasse quelque chose au sol. Les cuisses et les fessiers fournissent l’effort, pendant que le tronc et le dos tiennent la position du buste, dont l’inclinaison varie selon la morphologie et la version du squat.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Placer les pieds",
          texte:
            "Debout, pieds à peu près à largeur d’épaules, pointes légèrement ouvertes vers l’extérieur. L’écartement exact n’est pas le même pour tout le monde : la mobilité des hanches et des chevilles change ce qui est confortable. Cherche la position où tu peux descendre en gardant les talons au sol, et garde-la.",
        },
        {
          titre: "Descendre",
          texte:
            "Pousse les hanches vers l’arrière et plie les genoux en même temps, comme pour t’asseoir sur une chaise basse. Les genoux suivent la direction des pointes de pieds. Garde la poitrine ouverte et le regard devant. Inspire pendant la descente.",
        },
        {
          titre: "Trouver sa profondeur",
          texte:
            "Descends jusqu’où tu gardes le contrôle : talons au sol, bas du dos qui ne s’arrondit pas, remontée possible sans à-coup. Ce point est plus bas chez certains que chez d’autres, et il bouge avec le temps. Une descente moins profonde mais tenue vaut mieux qu’une descente basse dans laquelle tu t’effondres.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans tout le pied et remonte, hanches et poitrine ensemble. Souffle au moment où ça devient dur. En haut, tends les jambes sans verrouiller sèchement les genoux, et enchaîne.",
        },
      ],
      erreurs: [
        {
          titre: "Chercher la profondeur avant le contrôle",
          pourquoi:
            "Passé un certain point, propre à chacun, le bassin bascule et le bas du dos s’arrondit en fin de descente. La profondeur utile est celle où la position tient encore. Descends un peu moins bas, et laisse l’amplitude venir avec les semaines.",
        },
        {
          titre: "Laisser les genoux rentrer franchement vers l’intérieur",
          pourquoi:
            "Quand les genoux se rapprochent nettement l’un de l’autre pendant la remontée, c’est en général que l’effort dépasse ce que les hanches contrôlent à ce moment-là. Pense à écarter légèrement les genoux vers l’extérieur en poussant, et allège si ça revient à chaque répétition.",
        },
        {
          titre: "Laisser le buste s’effondrer",
          pourquoi:
            "Une certaine inclinaison du buste est normale, et elle n’est pas la même selon la morphologie et selon la version du squat. Ce qui pose problème, c’est la perte de position : le buste qui plonge d’un coup pendant la descente, ou qui se casse vers l’avant au moment de repousser. Cherche une inclinaison qui reste la même du début à la fin de la répétition, et allège ou réduis l’amplitude dès qu’elle se dégrade en cours de série.",
        },
      ],
      variantes: [
        {
          angle: "Avec une charge tenue devant",
          exercice: "Goblet squat",
          texte:
            "Un haltère ou une kettlebell tenue contre la poitrine. Le poids placé devant a tendance à redresser le buste, ce qui aide beaucoup de gens à descendre plus droit. C’est aussi la façon d’ajouter de la charge qui demande le moins de matériel : ni barre, ni rack.",
        },
        {
          angle: "Sur une seule jambe",
          exercice: "Squat bulgare",
          texte:
            "Le pied arrière posé sur un banc, l’essentiel du poids passe sur la jambe avant. L’équilibre fait alors partie du travail, et chaque jambe est chargée séparément, ce qui rend visible une différence entre les deux côtés.",
        },
      ],
      placement:
        "Le squat demande peu d’installation et sollicite beaucoup de muscles à la fois : au poids du corps, il tient aussi bien en échauffement qu’au milieu d’un circuit, où l’intérêt devient le volume et le rythme. Chargé, il se place plutôt en début de séance de jambes, tant que la coordination est fraîche, parce que c’est elle qui part en premier.",
      /* Ni `materiel` ni `materielCourt` : la famille de la bibliothèque
         dit déjà « Sans matériel », ce qui est exact et se lit bien. On
         ne redit pas ce que la donnée sait. */
    },
  },
  {
    slug: "souleve-de-terre",
    exercice: "Soulevé de terre classique",
    categorie: "dos",
    title: "Soulevé de terre : installation, tension, exécution",
    description:
      "Le soulevé de terre à la barre : la position de départ, la tension à créer avant de décoller, la coordination de la montée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      promesse:
        "Un mouvement qui met une grande partie du corps en jeu d’un coup : dos, fessiers, arrière des cuisses et tronc, sur chaque répétition.",
      definition:
        "Dans la version classique montrée ici, la barre part du sol : on la ramasse, on se relève avec, puis on la repose. La première chose à réussir est donc la position de départ, qu’on ne peut plus rattraper une fois la barre en l’air, et c’est ce qui rend l’installation aussi importante que l’effort lui-même.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Installer la barre et les appuis",
          texte:
            "Barre au-dessus du milieu du pied, presque au contact des tibias. Pieds à largeur de bassin. Penche-toi en poussant les hanches vers l’arrière, plie les genoux et attrape la barre juste à l’extérieur des jambes, bras tendus.",
        },
        {
          titre: "Créer la tension avant de décoller",
          texte:
            "Avant que la barre ne quitte le sol, installe le buste et les hanches dans une position stable, serre le tronc, puis tire sur la barre juste assez pour en enlever le jeu. La hauteur exacte des hanches au départ n’est pas la même pour tout le monde : cherche celle que tu peux tenir pendant toute la montée. On ne décolle jamais d’un corps relâché.",
        },
        {
          titre: "Se relever",
          texte:
            "Pousse le sol avec les jambes et redresse le buste en même temps : les hanches et les épaules montent ensemble, pas l’une après l’autre. La barre reste proche des jambes pendant la montée, tibias puis cuisses. Souffle en fin de montée.",
        },
        {
          titre: "Verrouiller, puis reposer",
          texte:
            "Debout, les hanches finissent tendues sous les épaules. Il n’y a rien à ajouter à ce moment-là. Pour reposer, refais le chemin en sens inverse : pousse les hanches vers l’arrière, laisse la barre glisser le long des cuisses, et plie les genoux une fois qu’elle les a dépassés.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser la barre s’éloigner des jambes",
          pourquoi:
            "Plus la barre s’écarte du corps, plus le buste doit tenir un levier long, à charge identique. Le mouvement devient nettement plus difficile sans que rien n’ait changé sur les disques. Garde-la proche des tibias, puis des cuisses.",
        },
        {
          titre: "Décoller d’un corps relâché",
          pourquoi:
            "Partir sans tension fait presque toujours monter les hanches en premier, et le buste se retrouve seul à finir le travail dans une position qu’il n’a pas choisie. Prends le temps de te tendre avant chaque répétition, y compris au milieu d’une série.",
        },
        {
          titre: "Basculer en arrière en fin de mouvement",
          pourquoi:
            "Le verrouillage se fait en tendant les hanches, pas en penchant le buste vers l’arrière. Une fois debout, bassin sous les épaules, le mouvement est terminé : continuer n’ajoute rien.",
        },
        {
          titre: "Enchaîner les répétitions en rebond",
          pourquoi:
            "Laisser tomber la barre et repartir sur le rebond fait perdre l’installation, et chaque répétition démarre alors d’une position un peu moins bonne que la précédente. Repose, replace-toi, repars.",
        },
      ],
      variantes: [
        {
          angle: "Sans revenir au sol",
          exercice: "Soulevé de terre roumain",
          texte:
            "La barre part du haut et descend le long des jambes jusqu’à mi-tibia, sans se reposer entre les répétitions. Les genoux restent peu fléchis : le mouvement se concentre sur la bascule des hanches et l’étirement de l’arrière des cuisses.",
        },
        {
          angle: "En balancier, avec une kettlebell",
          exercice: "Kettlebell swing",
          texte:
            "La même bascule de hanches, mais rapide et sans temps d’arrêt : la charge passe entre les jambes puis remonte par l’impulsion des hanches. C’est un travail de rythme et de vitesse, pas de charge maximale.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le soulevé de terre est souvent placé tôt dans la séance, quand il en est le mouvement prioritaire : il demande une position précise que la fatigue dégrade vite, et il sollicite à son tour une bonne partie de ce qui sert ensuite, du dos aux avant-bras. Son emplacement dépend malgré tout de la séance et de ce qu’on veut y faire passer.",
      materiel: "Une barre et des disques",
      materielCourt: "Barre",
      nomDansLeTitre: "le soulevé de terre",
      precaution:
        "La charge se monte par paliers, et le repère utile est observable : si la charge ou la fatigue t’oblige à abandonner la position que tu cherchais, c’est le signal pour arrêter la série ou réduire la difficulté, plutôt que pour tenter une répétition de plus.",
    },
  },
  {
    slug: "rowing-barre",
    exercice: "Rowing barre",
    categorie: "dos",
    title: "Rowing barre : technique, posture et erreurs fréquentes",
    description:
      "Le rowing barre buste penché : inclinaison, trajectoire de la barre, contrôle de la descente et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Buste penché vers l’avant, on tire une barre vers le bas du torse puis on la laisse redescendre bras tendus. La difficulté est double : le dos tire, pendant que tout le reste du corps tient une position penchée qui demande déjà un effort. C’est ce qui sépare ce mouvement des autres tirages de la bibliothèque, où l’on est assis sur un siège ou en appui d’un genou sur un banc.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Pieds à largeur de bassin, barre au-dessus du milieu du pied. Plie légèrement les genoux, pousse les hanches vers l’arrière et penche le buste vers l’avant en gardant le dos plat. Prends la barre un peu plus large que les épaules. Autour de quarante-cinq degrés est un bon repère de départ : plus tu te rapproches de l’horizontale, plus la position elle-même devient coûteuse à tenir.",
        },
        {
          titre: "Tirer",
          texte:
            "Amène la barre vers le haut du ventre ou le bas du torse en menant avec les coudes, qui partent vers l’arrière plutôt que vers l’extérieur. Les omoplates se rapprochent en fin de tirage. Souffle sur cette partie.",
        },
        {
          titre: "Contrôler la descente",
          texte:
            "Laisse la barre redescendre jusqu’à bras tendus, sans la lâcher. Le buste, lui, reste exactement à la même hauteur qu’au départ : c’est le repère qui dit si la série est encore propre.",
        },
      ],
      erreurs: [
        {
          titre: "Se redresser à chaque répétition",
          pourquoi:
            "Un buste qui remonte pendant le tirage aide la barre à monter, mais l’amplitude réellement parcourue par le dos diminue d’autant. C’est une erreur difficile à sentir soi-même : une vidéo de profil la rend évidente en dix secondes.",
        },
        {
          titre: "Tirer avec un coup de reins",
          pourquoi:
            "Une impulsion des hanches à chaque répétition permet de mettre plus lourd, et le travail se déplace vers cette impulsion. Garde le bassin immobile et ralentis volontairement la descente : c’est le meilleur moyen de voir la charge réellement gérable.",
        },
        {
          titre: "Laisser le haut du dos s’enrouler sous la charge",
          pourquoi:
            "Quand la barre devient trop lourde pour la position penchée, le dos s’arrondit progressivement, série après série, souvent sans qu’on le décide. C’est le signal pour alléger plutôt que pour finir la série.",
        },
      ],
      variantes: [
        {
          angle: "À un bras, buste soutenu",
          exercice: "Rowing haltère",
          texte:
            "Un genou et une main en appui sur un banc : il n’y a plus de position penchée à tenir, ce qui déplace tout l’effort vers le tirage. Chaque côté travaille seul, et une différence entre les deux devient visible.",
        },
        {
          angle: "Au poids du corps",
          exercice: "Rowing inversé",
          texte:
            "Suspendu sous une barre basse, corps gainé, on tire la poitrine vers la barre. La charge est une fraction du poids du corps et se règle en changeant l’inclinaison du corps plutôt qu’en ajoutant des disques.",
        },
      ],
      placement:
        "Comme le buste reste penché pendant toute la série, le rowing barre demande aussi un effort de maintien du tronc : on le place donc plutôt tôt dans une séance de dos, avant les tirages où l’on est assis ou soutenu et où la fatigue du tronc compte moins. Placé après un soulevé de terre, il part avec une chaîne postérieure déjà bien sollicitée, ce qui limite en général ce qu’on peut y mettre.",
      materiel: "Une barre et des disques",
      materielCourt: "Barre",
    },
  },
  {
    slug: "developpe-militaire-halteres",
    exercice: "Développé militaire haltères",
    categorie: "epaules",
    title: "Développé militaire haltères : technique et trajectoire",
    description:
      "Le développé militaire aux haltères : position de départ, trajectoire de la charge, tenue du tronc et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "On pousse deux haltères depuis les épaules jusqu’au-dessus de la tête, bras tendus. À la différence des poussées faites allongé sur un banc, rien ne soutient le buste : le tronc participe aussi à stabiliser la position pendant que les épaules et les triceps poussent les haltères.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Prendre la position",
          texte:
            "Debout, pieds sous les hanches et bien ancrés, ou assis sur un banc à dossier haut. Monte les haltères à hauteur d’épaules, coudes sous les poignets. Paumes vers l’avant ou légèrement tournées vers l’intérieur : les deux prises se pratiquent, garde celle où ton épaule est à l’aise. Serre le ventre et les fessiers avant de pousser.",
        },
        {
          titre: "Pousser",
          texte:
            "Monte les haltères vers le haut en gardant les poignets dans l’axe des avant-bras. La trajectoire passe près de la tête plutôt que loin devant. Souffle pendant la poussée. En haut, les bras sont tendus sans claquer les coudes, et les haltères se retrouvent à l’aplomb des épaules.",
        },
        {
          titre: "Redescendre en contrôlant",
          texte:
            "Ramène les haltères à hauteur d’épaules sans les laisser tomber. Inspire pendant la descente. Descends jusqu’où l’épaule reste confortable : le point bas n’est pas le même pour tout le monde, et le chercher à tout prix ne rend pas le mouvement meilleur.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer le bas du dos pour finir la poussée",
          pourquoi:
            "Quand les épaules n’ont plus de marge, le réflexe est de basculer le buste en arrière : le mouvement ressemble alors à un développé incliné fait debout, et le bas du dos travaille pour compenser. Serre le ventre avant chaque répétition, et allège si la cambrure revient à chaque série.",
        },
        {
          titre: "Pousser loin devant soi",
          pourquoi:
            "Des haltères qui montent en avant du visage obligent à terminer bras tendus vers l’avant, ce qui rend la fin de la poussée plus difficile qu’elle ne devrait l’être. Fais passer la charge près de la tête et termine à l’aplomb des épaules.",
        },
        {
          titre: "Donner une impulsion avec les jambes",
          pourquoi:
            "Un petit fléchissement suivi d’une poussée des jambes fait passer le point dur. C’est un mouvement à part entière quand on le fait exprès, mais ici il remplace le travail des épaules sans qu’on s’en aperçoive. Si l’élan devient nécessaire pour finir, la série est finie.",
        },
      ],
      variantes: [
        {
          angle: "Avec une rotation des mains",
          exercice: "Développé Arnold",
          texte:
            "On part paumes tournées vers soi et les mains pivotent pendant la montée. L’épaule passe par une amplitude plus large, et la charge utilisée est en général plus légère que sur un développé classique.",
        },
        {
          angle: "Sur machine",
          exercice: "Développé épaules machine",
          texte:
            "La trajectoire est imposée et le dossier soutient le buste. Il ne reste qu’à pousser : plus besoin de stabiliser deux charges indépendantes ni de tenir le tronc, ce qui change beaucoup ce que l’exercice demande.",
        },
      ],
      placement:
        "Comme la charge se déplace au-dessus de la tête sans appui du buste, le mouvement demande de la coordination et un tronc stable. Il est donc souvent placé avant les mouvements d’isolation des épaules. Après un développé couché, l’avant d’épaule et les triceps sont déjà sollicités : c’est un choix possible dans une séance de poussée, mais les performances peuvent y être un peu plus basses.",
      materiel: "Deux haltères",
      materielCourt: "Haltères",
      nomDansLeTitre: "le développé militaire aux haltères",
    },
  },
  {
    slug: "curl-biceps-halteres",
    exercice: "Curl haltères",
    categorie: "bras",
    title: "Curl biceps haltères : technique et erreurs fréquentes",
    description:
      "Le curl aux haltères : position des coudes, amplitude, contrôle de la descente et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le mouvement principal du curl se fait au coude : le biceps fléchit l’avant-bras pendant que l’épaule et le reste du corps servent surtout à stabiliser la position. C’est ce qui le rend simple à comprendre et facile à dénaturer, puisque tout ce qui bouge en plus du coude retire du travail au biceps.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds sous les hanches, un haltère dans chaque main le long du corps, paumes vers l’avant. Coudes près du buste, épaules basses et ventre légèrement serré.",
        },
        {
          titre: "Monter",
          texte:
            "Plie les coudes et amène les haltères vers les épaules. Souffle en montant. Monte tant que les coudes restent stables : inutile de chercher à rapprocher les haltères au maximum des épaules si cela oblige à avancer les coudes.",
        },
        {
          titre: "Redescendre lentement",
          texte:
            "Redescends jusqu’à bras presque tendus, plus lentement que tu n’es monté. C’est la moitié du mouvement que l’on abandonne le plus souvent, et celle qui distingue une série faite d’une série expédiée.",
        },
      ],
      erreurs: [
        {
          titre: "Balancer le buste pour lancer la charge",
          pourquoi:
            "Le corps recule puis avance pour donner l’impulsion, et le biceps se contente d’accompagner. Si le balancier devient nécessaire pour finir la série, la série est finie.",
        },
        {
          titre: "Avancer les coudes en fin de montée",
          pourquoi:
            "Quand les coudes partent vers l’avant, l’épaule prend le relais et le haut du mouvement devient facile. Garde les coudes à côté du buste du début à la fin, même si la charge doit baisser.",
        },
        {
          titre: "Laisser tomber les haltères à la descente",
          pourquoi:
            "Si tu laisses simplement la gravité ramener la charge, tu perds une partie du contrôle de la répétition. Accompagne le retour jusqu’à avoir les bras presque tendus.",
        },
      ],
      variantes: [
        {
          angle: "Paumes face à face",
          exercice: "Curl marteau",
          texte:
            "Les mains restent tournées vers l’intérieur pendant tout le mouvement. Cette prise sollicite davantage l’avant-bras, et beaucoup de gens la trouvent plus confortable pour le poignet.",
        },
        {
          angle: "Les deux bras sur une même barre",
          exercice: "Curl barre EZ",
          texte:
            "Les deux bras travaillent ensemble, ce qui permet en général plus de charge totale. La barre coudée laisse les poignets légèrement tournés, une position souvent plus agréable qu’une barre droite.",
        },
      ],
      placement:
        "Le curl est un mouvement d’isolation : il ne prépare rien et fatigue les biceps, dont on se sert sur tous les tirages. Dans une séance qui contient de gros tirages, il est donc souvent placé après eux. En fin de séance, ou dans une séance de bras, la question ne se pose pas.",
      materiel: "Deux haltères",
      materielCourt: "Haltères",
      nomDansLeTitre: "le curl aux haltères",
    },
  },
  {
    slug: "gainage",
    exercice: "Gainage",
    categorie: "abdos",
    title: "Gainage : la position, la durée, les erreurs",
    description:
      "Le gainage sur les coudes : l’alignement, la tension à créer, la respiration et le temps de maintien. Le placement illustré.",
    contenu: {
      definition:
        "Le gainage ne va nulle part, et c’est tout son principe. En appui sur les avant-bras et la pointe des pieds, le travail consiste à empêcher le corps de bouger : le bassin ne descend pas, ne monte pas, ne tourne pas. Les abdominaux et les muscles profonds du tronc y résistent au mouvement au lieu d’en produire un, ce qui explique qu’on le compte en secondes et non en répétitions.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Coudes au sol, juste sous les épaules, avant-bras parallèles. Pieds à largeur de bassin, en appui sur la pointe. La tête reste dans le prolongement du dos : regarde le sol un peu en avant de tes mains plutôt que tes pieds.",
        },
        {
          titre: "Créer la tension",
          texte:
            "Rentre très légèrement le bassin pour que le bas du dos ne se creuse pas, et pousse le sol avec les avant-bras comme pour éloigner tes épaules de tes coudes. Crée une tension volontaire dans le tronc et les fessiers, et continue à respirer normalement pendant que tu la tiens.",
        },
        {
          titre: "Tenir et respirer",
          texte:
            "Respire normalement, sans bloquer. La bonne durée est celle où l’alignement tient : dès que le bassin descend ou remonte, la série est finie, même si le chronomètre dit autre chose. Plusieurs séries courtes et propres valent mieux qu’une longue qui s’affaisse au milieu.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bassin descendre vers le sol",
          pourquoi:
            "Quand le bassin s’affaisse, le tronc ne tient plus la ligne et la position se creuse au niveau du bas du dos. C’est le signal que la série est terminée, pas qu’il faut serrer les dents dix secondes de plus.",
        },
        {
          titre: "Monter le bassin en pointe",
          pourquoi:
            "La position devient nettement plus confortable, parce qu’une partie du poids repose sur les bras et les jambes au lieu du tronc. On tient plus longtemps en travaillant moins. Vise la ligne des talons à la tête, quitte à afficher un temps plus court.",
        },
        {
          titre: "Bloquer volontairement sa respiration",
          pourquoi:
            "Tu n’as pas besoin de retenir ton souffle pour tenir la position. Garde une respiration régulière pendant toute la série.",
        },
      ],
      variantes: [
        {
          angle: "Sur le côté",
          exercice: "Planche latérale",
          texte:
            "En appui sur un seul avant-bras, corps de profil. Ce sont les muscles du côté du tronc qui empêchent le bassin de tomber vers le sol, un travail que le gainage face au sol ne demande pas. Une position par côté.",
        },
        {
          angle: "Avec des appuis qui changent",
          exercice: "Gainage dynamique",
          texte:
            "Même position de départ, mais on passe des avant-bras aux mains tendues, puis retour. Il faut tenir l’alignement pendant que les appuis bougent, ce qui ajoute les épaules et les bras au travail du tronc.",
        },
      ],
      muscles: ["Abdominaux", "Muscles profonds du tronc"],
      placement:
        "Le gainage n’a pas de place obligée. En début de séance, il réveille le tronc avant des mouvements où il devra tenir seul. En fin de séance, il se fait sans matériel et sans installation, ce qui en fait un dernier exercice commode. Le seul moment discutable, c’est juste avant un mouvement chargé où le tronc doit rester solide : un tronc déjà fatigué change la façon dont on tient la position.",
    },
  },
  {
    slug: "burpees",
    exercice: "Burpees",
    categorie: "cardio",
    title: "Burpees : la séquence, le rythme, les erreurs",
    description:
      "Comment faire un burpee : la séquence décomposée, le rythme qu’on peut tenir, les adaptations possibles et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Un burpee enchaîne quatre choses sans s’arrêter : on descend au sol, on envoie les pieds en arrière pour se retrouver en planche, on les ramène sous soi, on se relève. Le corps entier change de position à chaque répétition, et c’est ce qui fait monter le rythme cardiaque aussi vite avec si peu de matériel.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Descendre au sol",
          texte:
            "De debout, accroupis-toi et pose les mains au sol devant tes pieds, à peu près à largeur d’épaules. Les mains touchent le sol avant que les pieds ne bougent : c’est ce qui empêche de partir en avant.",
        },
        {
          titre: "Passer en planche",
          texte:
            "Envoie les deux pieds vers l’arrière d’un seul coup. Pendant la fraction de seconde où tu es en position de planche, le corps forme une ligne : ventre et fessiers serrés, bassin ni creusé ni en l’air.",
        },
        {
          titre: "Revenir sous soi",
          texte:
            "Ramène les deux pieds vers les mains, pieds à plat si ta mobilité le permet. C’est le temps où l’enchaînement se casse le plus souvent, parce que c’est celui qui coûte le plus quand la fatigue monte. Garde-le fluide, quitte à ralentir l’ensemble.",
        },
        {
          titre: "Se relever et enchaîner",
          texte:
            "Redresse-toi et repars. Avec ou sans saut en fin de mouvement, selon ce que tu cherches : le saut ajoute de l’intensité, la version sans saut permet de tenir des séries plus longues. Reçois-toi sur l’avant du pied puis le talon, genoux souples.",
        },
      ],
      erreurs: [
        {
          titre: "Partir trop vite sur les premières répétitions",
          pourquoi:
            "Un burpee coûte cher, et un départ lancé oblige presque toujours à ralentir ou à s’arrêter au milieu de la série. Choisis d’emblée un rythme que tu peux tenir jusqu’à la dernière répétition, sans dégrader les transitions.",
        },
        {
          titre: "Laisser le bassin s’affaisser en position de planche",
          pourquoi:
            "Quand les pieds partent en arrière et que le ventre lâche, le bas du dos encaisse l’arrivée. Serre le ventre et les fessiers avant d’envoyer les jambes, même si le passage ne dure qu’un instant.",
        },
        {
          titre: "Sacrifier le placement pour gagner du temps",
          pourquoi:
            "Mains mal posées, pieds à moitié ramenés, dos rond au moment de se relever : la vitesse gagnée se paie sur la qualité de chaque répétition, et le mouvement devient désagréable bien avant d’être efficace. Compte tes répétitions, pas tes secondes.",
        },
      ],
      variantes: [
        {
          angle: "Sans passage au sol",
          exercice: "Squats sautés",
          texte:
            "L’enchaînement se réduit au bas du corps : on garde l’impulsion et le rythme, on retire la planche et le retour au sol. Utile quand les poignets ou les épaules ne suivent pas, ou pour garder le cardio haut sans changer de position à chaque répétition.",
        },
        {
          angle: "En restant au sol",
          exercice: "Mountain climbers",
          texte:
            "On tient la position de planche et ce sont les genoux qui viennent vers la poitrine, en alternance. Le rythme cardiaque monte de la même façon, les épaules travaillent en continu, et il n’y a plus ni saut ni réception.",
        },
      ],
      /* Ni les squats sautés ni les mountain climbers ne sont des versions
         du burpee : ce sont des mouvements qu'on choisit à sa place. La
         bibliothèque ne contient aucune vraie variante de burpee, donc on
         nomme la section pour ce qu'elle est plutôt que de faire passer
         une alternative pour une progression. */
      titreVariantes: "Alternatives proches",
      muscles: ["Jambes", "Épaules", "Abdominaux"],
      placement:
        "Les burpees servent rarement de plat principal. Ils viennent en général dans un circuit, entre deux exercices de renforcement, ou en fin de séance sur un format court et minuté. Comme ils fatiguent le corps entier d’un coup, les placer avant un mouvement technique ou chargé peut réduire la qualité de ce qui suit.",
    },
  },
  {
    slug: "pompes",
    exercice: "Pompes",
    categorie: "pectoraux",
    title: "Pompes : position, amplitude et erreurs fréquentes",
    description:
      "Comment faire des pompes : position des mains, corps gainé, amplitude, trajet des coudes, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Une pompe ressemble à un développé couché retourné : les mains restent au sol et c’est le corps entier qui monte et descend, poussé par les pectoraux, les triceps et l’avant des épaules. Le tronc travaille pendant toute la série, parce qu’il doit garder le corps droit comme une planche pendant que les bras poussent.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Mains au sol un peu plus larges que les épaules, doigts vers l’avant. Pieds joints ou légèrement écartés. Serre le ventre et les fessiers : des talons à la tête, le corps forme une ligne.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes et laisse la poitrine descendre vers le sol, les coudes orientés en diagonale vers l’arrière plutôt qu’à l’horizontale. Descends jusqu’à frôler le sol avec la poitrine, ou aussi bas que tu peux en gardant la ligne du corps.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse le sol pour revenir bras tendus. Le corps remonte d’un seul bloc : les épaules et le bassin arrivent en haut en même temps.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bassin s’affaisser",
          pourquoi:
            "Le milieu du corps descend vers le sol et le bas du dos se creuse : le corps ne monte plus d’un seul bloc. Serre les fessiers et le ventre, et si la ligne lâche, pose les genoux plutôt que de continuer.",
        },
        {
          titre: "Écarter les coudes à l’horizontale",
          pourquoi:
            "Quand les coudes partent sur les côtés, perpendiculaires au corps, l’avant des épaules encaisse une grande part de l’effort. Vu de dessus, le corps doit dessiner une flèche plutôt qu’un T.",
        },
        {
          titre: "Raccourcir l’amplitude",
          pourquoi:
            "Des pompes qui s’arrêtent à mi-chemin se comptent vite, mais elles laissent de côté le bas du mouvement, là où les pectoraux travaillent le plus étirés. Mieux vaut moins de répétitions jusqu’en bas, quitte à surélever les mains pour y arriver.",
        },
      ],
      variantes: [
        {
          angle: "Mains surélevées",
          exercice: "Pompes inclinées",
          texte:
            "Les mains sur un banc ou une marche, le corps incliné. Une partie du poids passe sur les pieds : les bras poussent moins lourd, avec exactement le même geste. Plus les mains sont hautes, plus la part des pieds grandit.",
        },
        {
          angle: "Mains rapprochées",
          exercice: "Pompes diamant",
          texte:
            "Les mains se touchent sous la poitrine, les pouces et les index dessinent un losange. Les coudes restent près du corps, et les triceps prennent une plus grande part du travail.",
        },
        {
          angle: "Avec une impulsion",
          exercice: "Pompes explosives",
          texte:
            "On pousse assez fort pour que les mains quittent le sol un instant. Le mouvement devient un travail de puissance, et la réception demande des poignets et des épaules habitués.",
        },
      ],
      placement:
        "À la maison, les pompes sont souvent le mouvement de poussée principal de la séance : elles se placent alors tôt, quand les bras sont frais. Dans une séance de salle qui commence par le développé couché, elles servent plutôt de finition. Elles se glissent aussi dans un circuit, entre un exercice de jambes et un exercice de tirage.",
      materiel: "Aucun, le sol suffit",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des pompes",
    },
  },
  {
    slug: "tractions",
    exercice: "Tractions",
    categorie: "dos",
    title: "Tractions : la prise, le tirage, les erreurs",
    description:
      "Comment faire une traction : la prise, le départ bras tendus, le trajet des coudes, la descente contrôlée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Une traction hisse tout le corps jusqu’à une barre fixe, sans appui sous les pieds : le grand dorsal tire les coudes vers les côtes, les biceps et les avant-bras aident à plier les bras. On soulève son propre poids en entier, ce qui rend le mouvement exigeant même sans aucune charge.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’accrocher",
          texte:
            "Mains sur la barre paumes vers l’avant, un peu plus larges que les épaules. Pars suspendu bras tendus, puis, sans plier les bras, tire légèrement les épaules vers le bas pour ne pas rester affaissé dans les articulations.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire les coudes vers les côtes, comme pour les ranger dans tes poches, et monte jusqu’à ce que le menton passe au-dessus de la barre. Les jambes peuvent être tendues ou croisées, mais elles restent calmes : elles ne lancent rien.",
        },
        {
          titre: "Redescendre sous contrôle",
          texte:
            "Redescends jusqu’aux bras tendus, plus lentement que tu n’es monté. Une traction se compte du bas jusqu’en haut : repartir à mi-chemin, c’est s’arrêter avant la partie la plus dure.",
        },
      ],
      erreurs: [
        {
          titre: "Lancer les jambes pour monter",
          pourquoi:
            "Le balancement donne un élan qui fait passer la barre sans que le dos ait fait le travail. Si tu ne montes plus qu’en te balançant, la série est terminée, ou c’est le moment de prendre une assistance.",
        },
        {
          titre: "Partir les bras à moitié pliés",
          pourquoi:
            "Commencer et finir chaque répétition à mi-hauteur retire la partie basse du mouvement, celle où le dos travaille le plus. Repars bras tendus, épaules engagées, à chaque répétition.",
        },
        {
          titre: "Tendre le cou vers la barre",
          pourquoi:
            "Le menton passe la barre en avançant la tête, et le corps, lui, n’est pas monté plus haut. Regarde devant toi et laisse la poitrine venir vers la barre.",
        },
      ],
      variantes: [
        {
          angle: "À la machine",
          exercice: "Tirage poitrine",
          texte:
            "Assis, cuisses calées, on tire une barre vers le haut de la poitrine. Le geste ressemble à la traction, mais la charge se règle : on peut travailler le mouvement avec moins que son propre poids.",
        },
        {
          angle: "Pieds au sol, tirage horizontal",
          exercice: "Rowing inversé",
          texte:
            "Allongé sous une barre basse, talons au sol, on tire la poitrine vers la barre. Le corps reste incliné, une partie du poids repose sur les pieds, et le tirage se fait vers l’avant plutôt que vers le haut.",
        },
      ],
      titreVariantes: "Alternatives proches",
      placement:
        "La traction demande de la fraîcheur : tôt dans une séance de dos, avant les rowings et les exercices plus légers, elle se fait mieux qu’en fin de séance. Comme elle fatigue aussi les biceps et les avant-bras, elle passe avant les curls plutôt qu’après.",
      materiel: "Une barre de traction fixe",
      materielCourt: "Barre fixe",
      promesse: "Un tirage vertical au poids du corps : le dos et les biceps te hissent jusqu’à la barre.",
      nomDansLeTitre: "une traction",
    },
  },
  {
    slug: "fentes",
    exercice: "Fentes",
    categorie: "jambes",
    title: "Fentes : le pas, la descente et les erreurs",
    description:
      "Comment faire des fentes : la longueur du pas, la descente à la verticale, le genou avant, la poussée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Dans une fente, une jambe avance d’un grand pas et le corps descend entre les deux pieds : la jambe de devant porte l’essentiel du poids, celle de derrière sert d’appui et d’équilibre. On travaille une jambe à la fois, et c’est souvent là qu’on découvre qu’un côté est plus fort ou plus stable que l’autre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Faire le pas",
          texte:
            "Debout, pieds sous les hanches, avance un pied d’un grand pas. Assez long pour pouvoir descendre avec le pied avant bien à plat, sans te retrouver en grand écart. Garde un écart de la largeur des hanches entre les deux pieds, comme sur deux rails.",
        },
        {
          titre: "Descendre à la verticale",
          texte:
            "Descends en pliant les deux genoux, le buste droit, comme si tu t’asseyais entre tes pieds. Le genou arrière vient frôler le sol sans s’y poser lourdement, et le genou avant suit la direction des orteils.",
        },
        {
          titre: "Pousser pour revenir",
          texte:
            "Pousse dans le talon et le milieu du pied avant pour remonter et ramener la jambe. Change de jambe à chaque répétition, ou fais toute la série d’un côté puis de l’autre.",
        },
      ],
      erreurs: [
        {
          titre: "Un pas trop court",
          pourquoi:
            "Le talon avant se décolle et la jambe de devant travaille en déséquilibre, sur la pointe du pied. Allonge le pas jusqu’à pouvoir descendre avec le pied à plat.",
        },
        {
          titre: "Les deux pieds sur une même ligne",
          pourquoi:
            "Avec les pieds alignés comme sur une corde, l’équilibre devient la principale difficulté et le bassin vacille. Garde la largeur des hanches entre les pieds, du début à la fin de la série.",
        },
        {
          titre: "Plonger le buste pour se relever",
          pourquoi:
            "Le buste part en avant pour aider à remonter, et la jambe de devant pousse moins. Garde la poitrine haute et pousse dans le pied avant.",
        },
      ],
      variantes: [
        {
          angle: "Avec un saut",
          exercice: "Fentes sautées",
          texte:
            "On change de jambe en l’air, d’un saut, et on se réceptionne directement en fente. Le mouvement devient dynamique et fait monter le rythme cardiaque, et la réception demande du contrôle.",
        },
        {
          angle: "Pied arrière surélevé",
          exercice: "Squat bulgare",
          texte:
            "Le pied de derrière repose sur un banc et ne bouge plus. La jambe avant porte une part encore plus grande du poids, et on reste sur la même jambe pendant toute la série.",
        },
        {
          angle: "En montant sur un banc",
          exercice: "Step up banc",
          texte:
            "Au lieu d’avancer, on monte sur un banc d’une jambe, puis on redescend. Le travail reste une jambe à la fois, avec une montée qui ressemble davantage à un escalier.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "En salle, les fentes viennent souvent après le mouvement principal de jambes, un squat ou une presse, pour travailler chaque côté séparément. À la maison, sans charge, elles peuvent être le cœur de la séance. Comme elles demandent de l’équilibre, mieux vaut ne pas les garder pour le moment où les jambes ne tiennent plus.",
      materiel: "Aucun, des haltères si tu veux charger",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des fentes",
    },
  },
  {
    slug: "dips",
    exercice: "Dips barres parallèles",
    categorie: "bras",
    title: "Dips aux barres parallèles : technique et erreurs",
    description:
      "Comment faire des dips aux barres parallèles : position de départ, profondeur, épaules, inclinaison du buste et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Aux dips, le corps est en appui entre deux barres, bras tendus, et descend en pliant les coudes avant de remonter : les triceps, le bas des pectoraux et l’avant des épaules poussent ensemble tout le poids du corps. L’inclinaison du buste change la répartition : plus droit, les triceps travaillent davantage ; légèrement penché vers l’avant, les pectoraux prennent une plus grande part.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se mettre en appui",
          texte:
            "Mains sur les barres, bras tendus, épaules basses et loin des oreilles. Les jambes pendent ou se croisent derrière toi, et le corps reste calme avant de descendre.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes et laisse le corps descendre, coudes dirigés vers l’arrière. Descends jusqu’à ce que les bras forment à peu près un angle droit, ou moins bas si la position n’est plus confortable pour tes épaules.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse les barres vers le bas pour remonter jusqu’aux bras tendus, sans donner de coup sec dans les coudes en haut du mouvement.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les épaules remonter vers les oreilles",
          pourquoi:
            "Les épaules s’enfoncent et la position devient instable au point le plus bas. Garde-les basses et pousse les barres comme pour t’en éloigner, du début à la fin.",
        },
        {
          titre: "Descendre plus bas que l’épaule ne l’accepte",
          pourquoi:
            "Forcer la profondeur ne rend pas la répétition meilleure si l’avant de l’épaule tire. L’angle droit des coudes est un repère raisonnable : adapte-le à ce que tu contrôles.",
        },
        {
          titre: "Battre des jambes pour remonter",
          pourquoi:
            "Les jambes qui battent donnent un élan qui fait le travail à la place des bras. Si la remontée n’est plus possible sans élan, la série est finie.",
        },
      ],
      variantes: [
        {
          angle: "Sur une chaise",
          exercice: "Dips sur chaise",
          texte:
            "Les mains sur le bord d’une chaise ou d’un banc derrière soi, pieds au sol. Une partie du poids reste sur les jambes, et le mouvement se fait sans matériel spécial.",
        },
        {
          angle: "À la machine",
          exercice: "Dips machine",
          texte:
            "Assis, on pousse deux poignées vers le bas avec une charge réglable. Le geste reste le même, sans avoir à porter tout son poids ni à tenir l’équilibre.",
        },
      ],
      muscles: ["Triceps", "Pectoraux", "Épaules"],
      placement:
        "Dans une séance de poussée, les dips trouvent leur place après le développé couché ou les pompes, avant les exercices d’isolation des triceps. Placés en premier, ils fatigueraient les triceps dont le développé couché a besoin.",
      materiel: "Des barres parallèles ou une station de dips",
      materielCourt: "Barres parallèles",
      promesse: "Le corps descend entre deux barres et remonte à la force des bras : triceps, pectoraux et épaules poussent ensemble.",
      nomDansLeTitre: "des dips",
    },
  },
  {
    slug: "pont-fessier",
    exercice: "Pont fessier",
    categorie: "jambes",
    title: "Pont fessier : position, montée et erreurs",
    description:
      "Comment faire un pont fessier : placement des pieds, montée du bassin, contraction en haut, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au pont fessier, on est allongé sur le dos, pieds au sol, et on soulève le bassin jusqu’à former une ligne des genoux aux épaules : ce sont les fessiers qui font monter les hanches, aidés par l’arrière des cuisses. Le haut du dos reste posé pendant toute la série, et le mouvement se fait n’importe où, sans charge.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, genoux pliés, pieds à plat à largeur de hanches, assez près des fesses pour que tes doigts effleurent tes talons. Les bras reposent le long du corps, paumes au sol.",
        },
        {
          titre: "Monter le bassin",
          texte:
            "Pousse dans les talons et monte le bassin jusqu’à ce que les genoux, les hanches et les épaules forment une ligne. En haut, serre les fessiers une seconde : ce sont eux qui tiennent la position, pas le bas du dos.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends en déroulant le bassin jusqu’à frôler le sol, sans t’y reposer complètement entre deux répétitions, puis repars.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer en haut du mouvement",
          pourquoi:
            "Monter au-delà de la ligne genoux-épaules en creusant le bas du dos donne l’impression d’aller plus loin, mais ce sont les lombaires qui finissent le trajet. Arrête la montée quand le corps est aligné, et serre les fessiers.",
        },
        {
          titre: "Pousser sur la pointe des pieds",
          pourquoi:
            "Quand les talons se décollent, l’avant des cuisses prend le relais. Garde le poids sur les talons, au besoin en relevant légèrement les orteils.",
        },
        {
          titre: "Poser les pieds trop loin du bassin",
          pourquoi:
            "Plus les pieds s’éloignent, plus l’arrière des cuisses prend part au mouvement, au point parfois de déclencher une crampe. Rapproche-les jusqu’à sentir le travail dans les fessiers.",
        },
      ],
      variantes: [
        {
          angle: "Dos sur un appui, charge réglable",
          exercice: "Hip thrust machine",
          texte:
            "Le haut du dos repose sur un appui et la charge se règle sur la machine. L’extension de hanches est la même, avec un peu plus d’amplitude et un poids que le corps seul ne donne pas.",
        },
        {
          angle: "À quatre pattes, une jambe à la fois",
          exercice: "Donkey kick",
          texte:
            "À quatre pattes, on pousse un talon vers le plafond, genou plié. Le fessier travaille d’un côté à la fois, sans appui sur le dos.",
        },
        {
          angle: "Debout, à la poulie",
          exercice: "Kickback fessier poulie",
          texte:
            "Debout face à la machine, la jambe part vers l’arrière contre la résistance d’un câble. La tension reste présente pendant tout le trajet, une jambe à la fois.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Fessiers", "Ischio-jambiers"],
      placement:
        "Le pont fessier se glisse facilement dans un échauffement, pour réveiller les fessiers avant des squats ou des fentes. Il peut aussi finir une séance de bas du corps, en séries longues, une fois les mouvements lourds terminés.",
      materiel: "Aucun, un tapis si tu en as un",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "un pont fessier",
    },
  },
  {
    slug: "crunch",
    exercice: "Crunch",
    categorie: "abdos",
    title: "Crunch : le geste, la nuque et les erreurs",
    description:
      "Comment faire un crunch : la position, l’enroulement du dos, la respiration, les erreurs qui tirent sur la nuque et les variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le crunch est un mouvement court : allongé sur le dos, on enroule seulement le haut du tronc, jusqu’à décoller les omoplates du sol, pendant que le bas du dos reste posé. Ce petit trajet suffit à faire travailler le grand droit de l’abdomen, le muscle qui rapproche les côtes du bassin.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Allongé sur le dos, genoux pliés, pieds à plat. Les mains se posent sur la poitrine, ou derrière les oreilles sans croiser les doigts derrière la tête.",
        },
        {
          titre: "Enrouler",
          texte:
            "Souffle et enroule le haut du dos, comme pour rapprocher les côtes du bassin, jusqu’à ce que les omoplates quittent le sol. Garde l’espace d’un poing entre le menton et la poitrine.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends sans te laisser tomber, les abdominaux toujours serrés, jusqu’à ce que les épaules effleurent le sol, puis repars.",
        },
      ],
      erreurs: [
        {
          titre: "Tirer sur la nuque",
          pourquoi:
            "Les mains derrière la tête finissent souvent par tirer la tête vers l’avant, et c’est le cou qui travaille. Pose les doigts derrière les oreilles sans les croiser, ou garde les mains sur la poitrine.",
        },
        {
          titre: "Monter jusqu’à s’asseoir",
          pourquoi:
            "Se redresser jusqu’en haut transforme le crunch en sit-up : les muscles de la hanche prennent le relais sur la fin du trajet. Le crunch s’arrête quand les omoplates ont décollé.",
        },
        {
          titre: "Enchaîner avec de l’élan",
          pourquoi:
            "Rebondir sur le sol et lancer le buste fait monter le compteur, mais c’est l’élan qui fait une partie du trajet. Marque un temps en haut, et redescends plus lentement que tu n’es monté.",
        },
      ],
      variantes: [
        {
          angle: "Le bassin vient vers les côtes",
          exercice: "Reverse crunch",
          texte:
            "Le haut du dos reste au sol et c’est le bassin qui s’enroule vers la poitrine, jambes pliées. La nuque n’intervient pas du tout.",
        },
        {
          angle: "Avec une rotation",
          exercice: "Bicycle crunch",
          texte:
            "Un coude va vers le genou opposé pendant que l’autre jambe s’allonge, en alternance. La rotation fait travailler les obliques en plus du grand droit.",
        },
        {
          angle: "Jusqu’à la position assise",
          exercice: "Sit-ups",
          texte:
            "Le buste se déroule jusqu’à s’asseoir, puis redescend vertèbre par vertèbre. L’amplitude est plus grande, et les muscles de la hanche participent à la fin du trajet.",
        },
      ],
      placement:
        "Le crunch trouve sa place en fin de séance, une fois terminés les mouvements qui demandent un tronc solide, comme le squat ou le soulevé de terre : les fatiguer avant ne servirait pas ces mouvements-là. Il se combine bien avec un exercice de gainage, qui travaille le tronc sans le plier.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "un crunch",
    },
  },
  {
    slug: "elevations-laterales",
    exercice: "Élévations latérales",
    categorie: "epaules",
    title: "Élévations latérales : technique, hauteur et erreurs",
    description:
      "Comment faire des élévations latérales : position, hauteur des bras, rythme, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Aux élévations latérales, les bras s’écartent sur les côtés jusqu’à l’horizontale, un haltère dans chaque main : c’est le faisceau du milieu de l’épaule, le deltoïde latéral, qui fait le travail. Le bras levé de côté forme un long levier, donc des charges légères suffisent : quelques kilos deviennent vite exigeants.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds à largeur de hanches, un haltère dans chaque main le long des cuisses. Les coudes sont très légèrement pliés et le restent jusqu’à la fin de la série.",
        },
        {
          titre: "Monter",
          texte:
            "Écarte les bras sur les côtés jusqu’à ce que les mains arrivent à hauteur des épaules, pas plus haut. Imagine que tu pousses les haltères vers les murs plutôt que vers le plafond.",
        },
        {
          titre: "Redescendre lentement",
          texte:
            "Redescends plus lentement que tu n’es monté, sans laisser les haltères retomber contre les cuisses, puis repars.",
        },
      ],
      erreurs: [
        {
          titre: "Hausser les épaules",
          pourquoi:
            "Quand les épaules montent vers les oreilles, ce sont les trapèzes qui soulèvent les haltères. Garde les épaules basses et arrête la montée à l’horizontale.",
        },
        {
          titre: "Prendre de l’élan",
          pourquoi:
            "Un coup de reins ou de genoux pour lancer les haltères permet de passer une charge trop lourde pour l’épaule. Si tu ne peux plus monter sans balancer le buste, prends des haltères plus légers.",
        },
        {
          titre: "Plier les coudes en cours de série",
          pourquoi:
            "Des coudes qui se plient de plus en plus raccourcissent le levier, et le mouvement s’allège sans qu’on s’en rende compte. Fixe l’angle des coudes au départ et garde-le.",
        },
      ],
      variantes: [
        {
          angle: "Bras devant soi",
          exercice: "Élévations frontales",
          texte:
            "Les haltères montent devant soi jusqu’à hauteur des yeux. Le travail passe sur l’avant de l’épaule, déjà sollicité par les mouvements de poussée.",
        },
        {
          angle: "Buste penché",
          exercice: "Oiseau haltères",
          texte:
            "Penché en avant, dos plat, on ouvre les bras sur les côtés. C’est l’arrière de l’épaule qui travaille, avec le haut du dos.",
        },
      ],
      titreVariantes: "Pour l’avant et l’arrière de l’épaule",
      placement:
        "Les élévations latérales se placent après les mouvements de poussée au-dessus de la tête, comme le développé militaire, quand l’épaule est chaude. Elles fatiguent peu le reste du corps, ce qui permet de les ajouter facilement à une séance de haut du corps, en séries longues.",
      materiel: "Une paire d’haltères légers",
      materielCourt: "Haltères",
      promesse: "Les bras s’écartent jusqu’à l’horizontale, un haltère dans chaque main : le milieu de l’épaule fait le travail.",
      nomDansLeTitre: "des élévations latérales",
    },
  },
  {
    slug: "rowing-haltere",
    exercice: "Rowing haltère",
    categorie: "dos",
    title: "Rowing haltère : appui, tirage et erreurs",
    description:
      "Comment faire un rowing haltère à un bras : appui sur le banc, dos plat, trajet du coude, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le rowing haltère se fait un bras à la fois, un genou et une main en appui sur un banc : le dos reste plat et l’haltère monte vers la hanche, tiré par le grand dorsal et le milieu du dos. L’appui soulage le bas du dos, qui n’a pas à tenir seul le buste penché, et travailler un côté après l’autre montre si l’un tire moins bien que l’autre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Pose le genou et la main du même côté sur un banc, l’autre pied au sol un peu en retrait. Le dos est plat, à peu près parallèle au sol, et l’haltère pend sous l’épaule, bras tendu.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire le coude vers la hanche, près du corps, jusqu’à ce que l’haltère arrive au niveau des côtes. Les épaules restent alignées : c’est le bras qui monte, le buste ne tourne pas.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends jusqu’au bras tendu en laissant l’épaule s’allonger légèrement vers le sol, puis enchaîne. Fais toutes les répétitions d’un côté avant de changer.",
        },
      ],
      erreurs: [
        {
          titre: "Tourner le buste pour monter l’haltère",
          pourquoi:
            "Quand l’épaule s’ouvre vers le plafond, la rotation du tronc fait une partie du trajet. Si tu ne peux plus monter sans pivoter, la charge est trop lourde pour la série.",
        },
        {
          titre: "Tirer vers l’épaule",
          pourquoi:
            "Un haltère qui monte droit vers l’épaule, coude écarté, déplace le travail vers l’arrière de l’épaule et les trapèzes. Vise la hanche : le coude passe près des côtes.",
        },
        {
          titre: "Arrondir le dos",
          pourquoi:
            "Un dos qui s’arrondit au départ de chaque répétition perd la position que l’appui sur le banc devait rendre facile à tenir. Garde la poitrine ouverte et le dos plat du début à la fin.",
        },
      ],
      variantes: [
        {
          angle: "À deux mains, à la barre",
          exercice: "Rowing barre",
          texte:
            "Les deux bras tirent ensemble, buste penché sans appui : le bas du dos tient la position pendant toute la série, et la charge peut être plus lourde.",
        },
        {
          angle: "Deux haltères, buste penché",
          exercice: "Rowing buste penché haltères",
          texte:
            "Les deux haltères montent en même temps, sans appui sur un banc. Le tirage est le même, mais le dos doit tenir seul l’inclinaison.",
        },
        {
          angle: "Assis, à la poulie",
          exercice: "Rowing assis poulie",
          texte:
            "Assis, pieds calés, on tire une poignée vers le ventre. Le buste reste droit et la charge se règle sur la machine.",
        },
      ],
      placement:
        "Dans une séance de dos, le rowing haltère vient souvent après un tirage vertical, comme les tractions ou le tirage poitrine. Comme il se fait un côté après l’autre, il prend environ deux fois plus de temps qu’un rowing à deux mains : à prévoir quand la séance est courte.",
      materiel: "Un haltère et un banc plat",
      materielCourt: "Haltère et banc",
      nomDansLeTitre: "un rowing haltère",
    },
  },
  {
    slug: "tirage-poitrine",
    exercice: "Tirage poitrine",
    categorie: "dos",
    title: "Tirage poitrine : prise, trajet et erreurs",
    description:
      "Comment faire le tirage poitrine à la poulie haute : réglage, prise, trajet de la barre, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au tirage poitrine, on est assis sous une poulie haute, cuisses bloquées sous des boudins, et on tire une barre vers le haut de la poitrine : c’est le geste des tractions, mais la charge se choisit sur la machine au lieu d’être celle du corps entier. Le grand dorsal fait l’essentiel du travail, avec l’aide des biceps et du milieu du dos.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler et s’installer",
          texte:
            "Règle les boudins pour que les cuisses soient bloquées, pieds à plat. Prends la barre un peu plus large que les épaules, paumes vers l’avant, et assieds-toi bras tendus, le buste très légèrement incliné en arrière.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire les coudes vers le bas et vers les côtes, jusqu’à ce que la barre arrive en haut de la poitrine. La poitrine monte à la rencontre de la barre, les épaules restent basses.",
        },
        {
          titre: "Remonter sous contrôle",
          texte:
            "Laisse remonter la barre jusqu’aux bras tendus, plus lentement que tu ne l’as tirée, sans que les plaques ne viennent claquer sur la pile.",
        },
      ],
      erreurs: [
        {
          titre: "Se pencher en arrière pour tirer",
          pourquoi:
            "Le buste qui bascule loin en arrière transforme le tirage en rowing et se sert du poids du corps pour faire descendre la barre. Une légère inclinaison suffit, et elle reste la même pendant toute la série.",
        },
        {
          titre: "Tirer derrière la nuque",
          pourquoi:
            "Amener la barre derrière la tête oblige à pencher la tête en avant et à ouvrir l’épaule loin en arrière. Tire devant toi, vers le haut de la poitrine.",
        },
        {
          titre: "Tirer avec les mains",
          pourquoi:
            "Quand les mains tirent et que les coudes restent en arrière, les biceps finissent le mouvement à la place du dos. Pense à descendre les coudes : les mains ne font que tenir la barre.",
        },
      ],
      variantes: [
        {
          angle: "Suspendu, au poids du corps",
          exercice: "Tractions",
          texte:
            "Le corps monte vers la barre au lieu de faire descendre la barre vers soi. Le geste est le même, avec tout son poids à soulever et aucun réglage possible.",
        },
        {
          angle: "Tirage horizontal, à la poulie",
          exercice: "Rowing assis poulie",
          texte:
            "Assis face à la machine, on tire une poignée vers le ventre. Le tirage se fait vers l’arrière plutôt que vers le bas, et le milieu du dos prend une plus grande part.",
        },
        {
          angle: "Bras tendus, allongé sur un banc",
          exercice: "Pullover haltère",
          texte:
            "Allongé, on fait passer un haltère derrière la tête puis on le ramène au-dessus de la poitrine, bras presque tendus. Le grand dorsal travaille sans que les coudes se plient.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "En salle, le tirage poitrine ouvre souvent une séance de dos, parce que sa charge se règle au kilo près. Il remplace les tractions tant qu’elles ne passent pas encore, ou les complète quand elles sont faites, en séries plus longues.",
      materiel: "Une machine de tirage à poulie haute",
      materielCourt: "Poulie haute",
      promesse: "Assis sous une poulie haute, on tire une barre vers le haut de la poitrine : le grand dorsal travaille, avec une charge qui se règle.",
      nomDansLeTitre: "le tirage poitrine",
    },
  },
  {
    slug: "mountain-climbers",
    exercice: "Mountain climbers",
    categorie: "cardio",
    title: "Mountain climbers : position, rythme et erreurs",
    description:
      "Comment faire des mountain climbers : position de planche, mouvement des genoux, rythme, erreurs fréquentes et alternatives. Le mouvement en animation.",
    contenu: {
      definition:
        "Les mountain climbers se font en position de planche, mains au sol : les genoux viennent vers la poitrine l’un après l’autre, comme si on courait sur place à l’horizontale. Les épaules et le ventre tiennent la position pendant que les jambes vont vite, et le rythme cardiaque monte sans qu’on se relève une seule fois.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se mettre en planche",
          texte:
            "Mains au sol sous les épaules, bras tendus, corps en ligne des talons à la tête. Serre le ventre avant même de bouger les jambes.",
        },
        {
          titre: "Ramener les genoux",
          texte:
            "Amène un genou vers la poitrine, repose le pied, puis l’autre, en alternance. Les pieds touchent le sol légèrement, sans taper.",
        },
        {
          titre: "Trouver le rythme",
          texte:
            "Accélère seulement tant que les hanches restent à la hauteur des épaules. Sur une série chronométrée, un rythme régulier du début à la fin vaut mieux qu’un départ rapide qui s’effondre.",
        },
      ],
      erreurs: [
        {
          titre: "Monter les fesses",
          pourquoi:
            "Quand les hanches remontent vers le plafond, le corps forme un V et les genoux passent plus facilement, mais le ventre ne gaine plus. Garde les hanches à hauteur des épaules, quitte à ralentir.",
        },
        {
          titre: "Laisser les épaules reculer derrière les mains",
          pourquoi:
            "Si les épaules passent en arrière des poignets, la position s’affaisse et les bras soutiennent moins bien le corps. Garde les épaules au-dessus des mains pendant toute la série.",
        },
        {
          titre: "Sacrifier l’amplitude à la vitesse",
          pourquoi:
            "Des genoux qui ne viennent qu’à mi-chemin font de petits pas sur place. Ramène vraiment le genou sous la poitrine, et accélère seulement si l’amplitude tient.",
        },
      ],
      variantes: [
        {
          angle: "Sans mouvement des jambes",
          exercice: "Gainage dynamique",
          texte:
            "On passe de la planche sur les coudes à la planche sur les mains, et retour. Le tronc travaille de la même façon, et ce sont les bras qui bougent à la place des jambes.",
        },
        {
          angle: "En avançant à quatre pattes",
          exercice: "Bear crawl",
          texte:
            "Genoux à quelques centimètres du sol, on avance en déplaçant un bras et la jambe opposée. Le gainage est le même, avec un déplacement et un rythme plus lent.",
        },
        {
          angle: "Avec un retour debout",
          exercice: "Burpees",
          texte:
            "On passe par la planche, puis on se relève à chaque répétition. Le corps entier change de position, et le rythme cardiaque monte davantage.",
        },
      ],
      titreVariantes: "Alternatives proches",
      muscles: ["Abdominaux", "Épaules", "Jambes"],
      placement:
        "Les mountain climbers trouvent leur place dans un circuit, entre deux exercices de renforcement, ou dans un échauffement pour faire monter le rythme cardiaque. Comme ils sollicitent les poignets et les épaules, mieux vaut ne pas les placer juste avant des pompes ou un développé.",
      materiel: "Aucun, le sol suffit",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des mountain climbers",
    },
  },
  {
    slug: "presse-a-cuisses",
    exercice: "Presse à cuisses",
    categorie: "jambes",
    title: "Presse à cuisses : réglage, amplitude et erreurs",
    description:
      "Comment utiliser la presse à cuisses : placement des pieds, amplitude, position du dos, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "À la presse à cuisses, on est assis dans un siège incliné et on pousse une plateforme chargée avec les pieds : cuisses et fessiers font le travail d’un squat, sans charge sur le dos ni équilibre à tenir. La place des pieds sur la plateforme change la répartition : plus bas, les quadriceps travaillent davantage ; plus haut, les fessiers et l’arrière des cuisses prennent une plus grande part.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assieds-toi le dos et le bassin bien calés contre le dossier. Pose les pieds à plat au milieu de la plateforme, à largeur de hanches, puis déverrouille les sécurités.",
        },
        {
          titre: "Descendre",
          texte:
            "Laisse la plateforme descendre en pliant les genoux, jusqu’à environ l’angle droit, ou un peu plus bas tant que le bassin reste collé au dossier. Les genoux suivent la direction des pieds.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse dans tout le pied pour remonter, sans verrouiller les genoux en haut : ils restent très légèrement pliés entre deux répétitions.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bassin décoller",
          pourquoi:
            "En descendant trop bas, le bassin s’enroule et le bas du dos quitte le dossier. Arrête la descente juste avant : c’est elle qui fixe ton amplitude, plus que l’angle des genoux.",
        },
        {
          titre: "Verrouiller les genoux en haut",
          pourquoi:
            "Tendre complètement les jambes à chaque répétition fait reposer la charge sur les articulations plutôt que sur les muscles. Garde une légère flexion en haut du mouvement.",
        },
        {
          titre: "Charger plus que tu ne contrôles",
          pourquoi:
            "La machine permet de pousser lourd sur une toute petite amplitude, ce qui fait grimper les chiffres sans faire travailler les jambes sur tout le trajet. Choisis la charge qui te laisse descendre jusqu’au bout.",
        },
      ],
      variantes: [
        {
          angle: "Debout, sans machine",
          exercice: "Squat",
          texte:
            "Le même travail des cuisses et des fessiers, debout : le tronc et l’équilibre entrent en jeu, et le mouvement se fait partout.",
        },
        {
          angle: "Debout, un haltère contre la poitrine",
          exercice: "Goblet squat",
          texte:
            "On descend en squat en tenant un haltère contre la poitrine. La charge reste modeste, et le buste a tendance à rester droit de lui-même.",
        },
        {
          angle: "Le genou seul, à la machine",
          exercice: "Leg extension",
          texte:
            "Assis, on tend la jambe contre un boudin. Seul le genou bouge, donc le travail se concentre sur l’avant des cuisses.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "La presse à cuisses vient souvent après un squat dans une séance de jambes, pour continuer à travailler les cuisses quand le dos et l’équilibre commencent à fatiguer. Elle peut aussi être le mouvement principal pour quelqu’un qui ne squatte pas encore avec une barre.",
      materiel: "Une machine de presse à cuisses",
      materielCourt: "Machine",
      promesse: "Assis, dos calé, on pousse une plateforme chargée avec les jambes : cuisses et fessiers travaillent sans équilibre à tenir.",
      nomDansLeTitre: "la presse à cuisses",
    },
  },
  {
    slug: "squat-bulgare",
    exercice: "Squat bulgare",
    categorie: "jambes",
    title: "Squat bulgare : distance, descente et erreurs",
    description:
      "Comment faire un squat bulgare : la distance au banc, la descente à la verticale, l’équilibre, les erreurs fréquentes et les variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au squat bulgare, le pied arrière repose sur un banc et ne bouge plus : toute la série se fait sur la jambe avant, qui descend et remonte en portant l’essentiel du poids du corps. C’est une fente qu’on ne quitte pas, où la jambe de devant fait seule le travail que deux jambes se partagent dans un squat.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Trouver la distance",
          texte:
            "Dos au banc, pose le dessus du pied arrière dessus. Avance le pied avant d’un grand pas : en bas du mouvement, le talon avant doit rester au sol. Fais un essai sans charge pour régler la distance.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends à la verticale en pliant la jambe avant, le buste droit ou légèrement penché vers l’avant, jusqu’à ce que le genou arrière approche du sol.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans le talon et le milieu du pied avant pour remonter, sans t’aider de la jambe arrière. Termine toutes les répétitions d’un côté avant de changer.",
        },
      ],
      erreurs: [
        {
          titre: "Un pied avant trop près du banc",
          pourquoi:
            "Le talon avant se décolle en bas et le poids part sur les orteils. Avance le pied jusqu’à pouvoir descendre talon au sol.",
        },
        {
          titre: "Pousser avec la jambe arrière",
          pourquoi:
            "La jambe posée sur le banc ne sert qu’à l’équilibre. Si elle pousse, c’est elle qui aide le corps à remonter, et la jambe avant travaille moins.",
        },
        {
          titre: "Aligner les pieds comme sur une corde",
          pourquoi:
            "Un pied avant placé juste devant le pied arrière rend la position instable et le bassin vacille. Décale-le de la largeur des hanches, comme pour une fente.",
        },
      ],
      variantes: [
        {
          angle: "Le pied arrière au sol",
          exercice: "Fentes",
          texte:
            "Les deux pieds restent au sol et on peut changer de jambe à chaque répétition. La jambe arrière participe un peu plus, et l’équilibre se trouve plus facilement.",
        },
        {
          angle: "En montant sur le banc",
          exercice: "Step up banc",
          texte:
            "Au lieu de descendre, on monte sur le banc d’une jambe, puis on redescend. Le travail reste une jambe à la fois, avec une montée qui ressemble à un escalier.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "À la maison, sans barre, le squat bulgare suffit souvent à rendre une séance de jambes exigeante avec une simple chaise : il en devient alors le mouvement principal. En salle, il vient après le squat ou la presse, des haltères en main si le poids du corps ne suffit plus.",
      materiel: "Un banc ou une chaise stable, des haltères si tu veux charger",
      materielCourt: "Banc",
      promesse: "Le pied arrière posé sur un banc, on descend sur la jambe avant : cuisse et fessier travaillent une jambe à la fois.",
      nomDansLeTitre: "un squat bulgare",
    },
  },
  {
    slug: "souleve-de-terre-roumain",
    exercice: "Soulevé de terre roumain",
    categorie: "jambes",
    title: "Soulevé de terre roumain : technique et erreurs",
    description:
      "Comment faire un soulevé de terre roumain : charnière de hanches, dos plat, barre près des cuisses, amplitude et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le soulevé de terre roumain part debout, la charge en main, une barre ou deux haltères, et descend en poussant les hanches vers l’arrière, jambes presque tendues : l’arrière des cuisses et les fessiers travaillent, étirés en bas puis contractés pour revenir. Contrairement au soulevé de terre classique, la charge ne repose jamais au sol entre deux répétitions.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds à largeur de hanches, la barre ou les haltères tenus juste devant les cuisses, bras tendus. Les genoux sont très légèrement fléchis, et ils le restent pendant toute la série.",
        },
        {
          titre: "Descendre en reculant les hanches",
          texte:
            "Pousse les hanches vers l’arrière, comme pour fermer une porte avec les fesses, et laisse le buste s’incliner. La charge glisse le long des cuisses puis des tibias, le dos reste plat. Descends jusqu’à sentir l’étirement à l’arrière des cuisses, souvent vers le milieu des tibias.",
        },
        {
          titre: "Remonter",
          texte:
            "Ramène les hanches vers l’avant en serrant les fessiers, jusqu’à te retrouver debout. La charge reste près des jambes à la montée comme à la descente.",
        },
      ],
      erreurs: [
        {
          titre: "Plier les genoux comme pour un squat",
          pourquoi:
            "Si les genoux avancent et que les hanches descendent, le mouvement devient un soulevé de terre classique raccourci, et l’arrière des cuisses n’est plus étiré. Le geste se fait par les hanches, les genoux bougent à peine.",
        },
        {
          titre: "Arrondir le dos pour descendre plus bas",
          pourquoi:
            "La bonne amplitude s’arrête là où le dos reste plat. Gagner quelques centimètres en enroulant le dos déplace l’effort vers le bas du dos au lieu de l’arrière des cuisses.",
        },
        {
          titre: "Laisser la charge s’éloigner des jambes",
          pourquoi:
            "Une charge qui part vers l’avant allonge le levier et tire sur le bas du dos. Garde-la près des cuisses, presque à les frôler.",
        },
      ],
      variantes: [
        {
          angle: "Depuis le sol, à chaque répétition",
          exercice: "Soulevé de terre classique",
          texte:
            "La barre repart du sol à chaque répétition, et les genoux plient davantage : les jambes poussent aussi, et la charge peut être plus lourde.",
        },
        {
          angle: "Une poussée de hanches explosive",
          exercice: "Kettlebell swing",
          texte:
            "La même charnière de hanches, mais rapide : les hanches projettent la kettlebell vers l’avant, et le rythme cardiaque monte avec.",
        },
        {
          angle: "L’arrière des cuisses seul, à la machine",
          exercice: "Leg curl allongé",
          texte:
            "Allongé, on plie les genoux contre un boudin. Seul le genou bouge : l’arrière des cuisses travaille sans charnière de hanches ni charge sur le dos.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Dans une séance de jambes, le soulevé de terre roumain vient souvent après un squat ou une presse, pour l’arrière des cuisses que ces mouvements travaillent moins. Il peut aussi ouvrir une séance de bas du corps centrée sur les fessiers et l’arrière des cuisses.",
      materiel: "Une barre chargée, ou deux haltères",
      materielCourt: "Barre ou haltères",
      nomDansLeTitre: "un soulevé de terre roumain",
    },
  },
  {
    slug: "developpe-incline-halteres",
    exercice: "Développé incliné haltères",
    categorie: "pectoraux",
    title: "Développé incliné haltères : réglage et technique",
    description:
      "Comment faire le développé incliné aux haltères : inclinaison du banc, placement, trajectoire, amplitude et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le développé incliné se fait allongé sur un banc relevé, un haltère dans chaque main : on pousse vers le haut, et le haut des pectoraux prend une plus grande part qu’à plat. Avec des haltères, chaque bras pousse seul, et les mains peuvent descendre un peu plus bas qu’avec une barre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler le banc et s’installer",
          texte:
            "Incline le dossier autour de 30 degrés. Assieds-toi les haltères posés sur les cuisses, puis allonge-toi en les ramenant à hauteur de poitrine. Pieds à plat, omoplates serrées contre le dossier.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends les haltères de chaque côté du haut de la poitrine, poignets au-dessus des coudes, jusqu’à sentir un léger étirement à l’avant des épaules et des pectoraux.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse les haltères vers le haut en les rapprochant légèrement, sans les cogner l’un contre l’autre. Les poignets restent droits du début à la fin.",
        },
      ],
      erreurs: [
        {
          titre: "Un banc trop relevé",
          pourquoi:
            "Au-delà de 45 degrés, le mouvement se rapproche d’un développé militaire : les épaules prennent le relais sur les pectoraux. Autour de 30 degrés, la poitrine reste le moteur.",
        },
        {
          titre: "Décoller les fesses du banc",
          pourquoi:
            "Cambrer jusqu’à soulever le bassin aplatit l’inclinaison et permet de passer une charge trop lourde. Les fesses restent sur le banc, les pieds au sol.",
        },
        {
          titre: "Écarter les coudes à l’horizontale",
          pourquoi:
            "Des coudes alignés avec les épaules placent l’avant de l’épaule en première ligne. Garde-les un peu plus bas, entre le corps et l’horizontale.",
        },
      ],
      variantes: [
        {
          angle: "À plat, à la barre",
          exercice: "Développé couché",
          texte:
            "Le banc à plat et une barre : les deux bras poussent ensemble, le milieu des pectoraux travaille davantage, et la charge se règle par disques.",
        },
        {
          angle: "À plat, aux haltères",
          exercice: "Développé couché haltères",
          texte:
            "Le même geste sur un banc plat : l’inclinaison disparaît, et chaque bras pousse toujours seul.",
        },
        {
          angle: "Bras ouverts, à la poulie",
          exercice: "Écarté à la poulie",
          texte:
            "Les bras restent presque tendus et se referment devant la poitrine contre la résistance d’un câble : les pectoraux travaillent sans l’aide des triceps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le développé incliné se place en début ou en milieu de séance de poussée, juste après le développé couché, ou à sa place une séance sur deux. Les mouvements plus légers comme les écartés viennent après.",
      materiel: "Un banc inclinable et deux haltères",
      materielCourt: "Haltères et banc",
      nomDansLeTitre: "le développé incliné aux haltères",
    },
  },
  {
    slug: "extension-triceps-poulie",
    exercice: "Extension triceps poulie",
    categorie: "bras",
    title: "Extension triceps à la poulie : technique et erreurs",
    description:
      "Comment faire l’extension des triceps à la poulie : la position des coudes, l’extension complète, le rythme et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "À l’extension des triceps à la poulie, on se tient debout face à une poulie haute et on pousse une corde ou une barre vers le bas en tendant les bras, coudes immobiles contre le corps : le triceps fait tout le travail. Le câble garde de la résistance jusqu’aux bras tendus, là où un haltère n’en offre presque plus.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Face à la poulie, pieds à largeur de hanches, la corde ou la barre en main. Coudes collés au corps, avant-bras à peu près à l’horizontale, buste très légèrement penché vers l’avant.",
        },
        {
          titre: "Tendre les bras",
          texte:
            "Pousse vers le bas jusqu’à ce que les bras soient complètement tendus. Avec une corde, écarte un peu les mains en bas du mouvement.",
        },
        {
          titre: "Remonter sous contrôle",
          texte:
            "Laisse remonter les mains jusqu’à ce que les avant-bras reviennent à l’horizontale, lentement, sans que les coudes ne quittent les côtes.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les coudes bouger",
          pourquoi:
            "Des coudes qui avancent et reculent transforment le mouvement en tirage, et les épaules viennent aider. Imagine-les vissés contre tes côtes : seuls les avant-bras bougent.",
        },
        {
          titre: "Se pencher sur la poulie",
          pourquoi:
            "Le poids du corps qui appuie sur la corde fait descendre une charge trop lourde pour les triceps seuls. Garde le buste presque droit, et allège si tu dois te jeter dessus.",
        },
        {
          titre: "S’arrêter avant l’extension complète",
          pourquoi:
            "Les derniers centimètres, bras tendus, sont ceux où le triceps est le plus contracté. Va jusqu’en bas à chaque répétition.",
        },
      ],
      variantes: [
        {
          angle: "Aux haltères, bras au-dessus de la tête",
          exercice: "Extension triceps haltère",
          texte:
            "Le bras monte au-dessus de la tête et l’avant-bras descend derrière : la longue portion du triceps travaille en position étirée.",
        },
        {
          angle: "Au poids du corps",
          exercice: "Dips barres parallèles",
          texte:
            "Le corps entier descend entre deux barres : les triceps poussent avec les pectoraux et les épaules, et la charge est celle du corps.",
        },
        {
          angle: "Mains serrées, au sol",
          exercice: "Pompes diamant",
          texte:
            "Des pompes mains jointes sous la poitrine : les coudes restent près du corps et les triceps prennent une grande part du travail, sans aucun matériel.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "L’extension à la poulie se place en fin de séance de poussée ou de bras, après les mouvements qui sollicitent déjà les triceps, comme le développé couché ou les dips. Facile à doser, elle se prête bien aux séries longues.",
      materiel: "Une poulie haute, avec une corde ou une barre",
      materielCourt: "Poulie",
      nomDansLeTitre: "l’extension des triceps à la poulie",
    },
  },
  {
    slug: "planche-laterale",
    exercice: "Planche latérale",
    categorie: "abdos",
    title: "Planche latérale : la position et les erreurs",
    description:
      "Comment faire la planche latérale : l’appui sur le coude, l’alignement, les hanches hautes, la respiration et les erreurs fréquentes. Le placement illustré.",
    contenu: {
      definition:
        "La planche latérale se tient sur un seul appui, l’avant-bras ou la main, et sur le côté d’un pied, le corps de profil : ce sont les muscles du côté du tronc, les obliques, qui empêchent les hanches de tomber. On la tient d’un côté puis de l’autre, et l’écart entre les deux côtés se sent souvent dès la première fois.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Allongé sur le côté, en appui sur l’avant-bras, coude juste sous l’épaule. La version sur la main, bras tendu comme sur l’animation, se place de la même façon, la main sous l’épaule. Jambes tendues, pieds posés l’un sur l’autre, ou décalés pour plus de stabilité.",
        },
        {
          titre: "Monter les hanches",
          texte:
            "Pousse le sol avec ton appui et soulève les hanches jusqu’à former une ligne de la tête aux pieds. La main libre se pose sur la hanche, ou le bras se tend vers le plafond.",
        },
        {
          titre: "Tenir et respirer",
          texte:
            "Respire normalement, sans bloquer. La série dure tant que les hanches restent hautes : quand elles s’affaissent, change de côté, même si le chronomètre n’a pas fini.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les hanches s’affaisser",
          pourquoi:
            "Quand le bassin descend vers le sol, ce sont l’épaule et les articulations qui portent le corps, et les obliques travaillent moins. Remonte les hanches, ou raccourcis la tenue.",
        },
        {
          titre: "Placer l’appui loin de l’épaule",
          pourquoi:
            "Un coude, ou une main, décalé devant ou derrière l’épaule met l’appui en porte-à-faux. Il se place à l’aplomb de l’épaule.",
        },
        {
          titre: "Pivoter vers le sol ou vers le plafond",
          pourquoi:
            "Un corps qui tourne trouve une position plus facile à tenir, et le côté du tronc se relâche. Les hanches et les épaules restent de profil, empilées l’une sur l’autre.",
        },
      ],
      variantes: [
        {
          angle: "Face au sol, sur les deux coudes",
          exercice: "Gainage",
          texte:
            "La planche classique, sur les deux avant-bras : le travail se répartit sur tout l’avant du tronc au lieu d’un seul côté.",
        },
        {
          angle: "Avec du mouvement",
          exercice: "Gainage dynamique",
          texte:
            "On passe de la planche sur les coudes à la planche sur les mains, et retour : le tronc tient la position pendant que les bras bougent.",
        },
        {
          angle: "En rotation, assis",
          exercice: "Russian twist",
          texte:
            "Assis, buste incliné, on tourne les épaules d’un côté puis de l’autre : les obliques travaillent en mouvement plutôt qu’en tenue.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Obliques", "Abdominaux", "Épaules"],
      placement:
        "La planche latérale se glisse en fin de séance avec le gainage, ou dans un échauffement pour réveiller le tronc avant des mouvements debout. Comme elle se fait d’un côté puis de l’autre, une série compte les deux côtés.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "la planche latérale",
    },
  },
  {
    slug: "russian-twist",
    exercice: "Russian twist",
    categorie: "abdos",
    title: "Russian twist : la rotation et les erreurs",
    description:
      "Comment faire le russian twist : la position assise, la rotation des épaules, le rythme, les erreurs fréquentes et les variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au russian twist, on est assis, le buste incliné vers l’arrière, et on tourne les épaules d’un côté puis de l’autre : les obliques, sur les côtés du ventre, font la rotation pendant que le reste du tronc tient l’inclinaison. Il se fait les mains jointes, ou avec un poids tenu contre la poitrine pour le rendre plus exigeant.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assis au sol, genoux pliés, talons posés ou légèrement décollés. Incline le buste vers l’arrière, dos droit, jusqu’à sentir le ventre travailler pour tenir la position.",
        },
        {
          titre: "Tourner",
          texte:
            "Tourne les épaules et le buste d’un côté, les mains jointes devant toi, jusqu’à ce qu’elles passent à côté de la hanche. Le regard suit les mains.",
        },
        {
          titre: "Changer de côté",
          texte:
            "Repasse par le centre et tourne de l’autre côté. Chaque côté touché compte pour une répétition.",
        },
      ],
      erreurs: [
        {
          titre: "Ne bouger que les bras",
          pourquoi:
            "Des mains qui balaient de gauche à droite pendant que les épaules restent face à l’avant ne font presque pas tourner le tronc. Ce sont les épaules qui tournent, les bras suivent.",
        },
        {
          titre: "Arrondir le dos",
          pourquoi:
            "Un dos qui s’enroule fait perdre l’inclinaison et tire sur le bas du dos. Garde la poitrine ouverte, quitte à moins t’incliner.",
        },
        {
          titre: "Aller trop vite",
          pourquoi:
            "Un rythme rapide transforme la rotation en balancement, et l’élan fait le travail. Tourne de façon contrôlée, avec un léger temps de chaque côté.",
        },
      ],
      variantes: [
        {
          angle: "Allongé, en pédalant",
          exercice: "Bicycle crunch",
          texte:
            "Allongé sur le dos, on amène un coude vers le genou opposé pendant que l’autre jambe s’allonge : la rotation s’ajoute à l’enroulement du buste.",
        },
        {
          angle: "En tenue, sur un côté",
          exercice: "Planche latérale",
          texte:
            "Les obliques travaillent sans bouger : on tient le corps de profil sur un appui, hanches hautes.",
        },
        {
          angle: "Sans rotation",
          exercice: "Crunch",
          texte:
            "Allongé, on enroule seulement le haut du dos : le grand droit de l’abdomen travaille, sans tourner.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Obliques", "Abdominaux"],
      placement:
        "Le russian twist se place en fin de séance, avec les autres exercices d’abdos, souvent après un exercice de gainage. Il se glisse aussi dans un circuit au poids du corps, entre deux mouvements de jambes.",
      materiel: "Aucun, un poids léger si tu veux charger",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "le russian twist",
    },
  },
  {
    slug: "curl-marteau",
    exercice: "Curl marteau",
    categorie: "bras",
    title: "Curl marteau : technique et erreurs",
    description:
      "Comment faire le curl marteau : la prise neutre, les coudes fixes, la montée, la descente contrôlée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le curl marteau se fait les paumes tournées l’une vers l’autre, comme on tiendrait un marteau : en pliant les coudes, le biceps travaille avec le brachial et les muscles de l’avant-bras. Cette prise neutre est souvent plus confortable pour les poignets que la prise paumes vers le haut.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, un haltère dans chaque main le long du corps, paumes tournées vers les cuisses. Coudes près des côtes, épaules basses.",
        },
        {
          titre: "Monter",
          texte:
            "Plie les coudes pour monter les haltères vers les épaules, en gardant les paumes face à face du début à la fin. Les coudes restent à la même place.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’aux bras tendus, sans laisser les haltères tomber. Les deux bras peuvent travailler ensemble ou en alternance.",
        },
      ],
      erreurs: [
        {
          titre: "Balancer le buste",
          pourquoi:
            "Un coup de reins lance les haltères et fait passer une charge trop lourde pour les bras. Le buste reste immobile : si tu dois te balancer, prends plus léger.",
        },
        {
          titre: "Avancer les coudes",
          pourquoi:
            "Des coudes qui partent vers l’avant à la montée font travailler l’avant de l’épaule. Ils restent collés aux côtes.",
        },
        {
          titre: "Lâcher la descente",
          pourquoi:
            "La descente compte autant que la montée. Laisser tomber les haltères fait perdre une bonne partie du travail.",
        },
      ],
      variantes: [
        {
          angle: "Paumes vers le haut",
          exercice: "Curl haltères",
          texte:
            "La prise classique, paumes tournées vers le haut : le biceps travaille davantage, l’avant-bras un peu moins.",
        },
        {
          angle: "À la barre coudée",
          exercice: "Curl barre EZ",
          texte:
            "Les deux mains sur une barre coudée : la charge peut être plus lourde qu’aux haltères, et les poignets restent dans l’axe.",
        },
      ],
      placement:
        "Le curl marteau se place en fin de séance de bras ou de tirage, après les mouvements de dos qui sollicitent déjà les biceps. Il se combine bien avec un curl classique, pour varier la prise.",
      materiel: "Une paire d’haltères",
      materielCourt: "Haltères",
      promesse: "Les paumes face à face, on plie les coudes : le biceps et l’avant-bras travaillent ensemble.",
      nomDansLeTitre: "le curl marteau",
    },
  },
  {
    slug: "goblet-squat",
    exercice: "Goblet squat",
    categorie: "jambes",
    title: "Goblet squat : technique et erreurs",
    description:
      "Comment faire le goblet squat : la prise de l’haltère, la descente entre les pieds, le buste droit et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au goblet squat, on tient un haltère ou une kettlebell contre la poitrine, comme une coupe, et on descend en squat : le poids placé devant aide à garder le buste droit et à descendre entre les pieds. C’est souvent la première façon de charger un squat, avant de passer à la barre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds un peu plus larges que les hanches, pointes légèrement ouvertes. Tiens l’haltère contre la poitrine, les mains sous sa tête, coudes vers le bas.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends en pliant les genoux et les hanches, comme pour t’asseoir entre tes talons. Le buste reste droit, et les coudes passent à l’intérieur des genoux en bas.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans tout le pied pour remonter, genoux dans l’axe des pieds, jusqu’à te retrouver debout.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser l’haltère s’éloigner",
          pourquoi:
            "Un haltère qui part vers l’avant tire le buste avec lui. Garde-le collé à la poitrine pendant toute la série.",
        },
        {
          titre: "Laisser les genoux rentrer",
          pourquoi:
            "Des genoux qui se rapprochent en remontant perdent l’alignement avec les pieds. Pousse-les légèrement vers l’extérieur, dans la direction des orteils.",
        },
        {
          titre: "Décoller les talons",
          pourquoi:
            "Les talons qui se lèvent en bas font basculer le poids sur l’avant du pied. Garde tout le pied au sol, quitte à descendre un peu moins bas.",
        },
      ],
      variantes: [
        {
          angle: "Au poids du corps",
          exercice: "Squat",
          texte:
            "Le même geste sans charge : les bras tendus devant aident à l’équilibre, et le mouvement se fait partout.",
        },
        {
          angle: "La barre sur le dos",
          exercice: "Squat barre",
          texte:
            "La charge passe sur le haut du dos : elle peut être bien plus lourde, et le mouvement demande plus de technique.",
        },
        {
          angle: "Sur une jambe",
          exercice: "Squat bulgare",
          texte:
            "Le pied arrière posé sur un banc : la jambe avant porte l’essentiel du poids, une jambe à la fois.",
        },
      ],
      placement:
        "À la maison, le goblet squat peut être le mouvement principal d’une séance de jambes avec un seul haltère. En salle, il sert d’échauffement avant le squat à la barre, ou de deuxième mouvement après lui.",
      materiel: "Un haltère ou une kettlebell",
      materielCourt: "Haltère",
      promesse: "Un haltère tenu contre la poitrine, on descend en squat : le poids devant aide à garder le buste droit.",
      nomDansLeTitre: "un goblet squat",
    },
  },
  {
    slug: "face-pull",
    exercice: "Face pull poulie",
    categorie: "epaules",
    title: "Face pull à la poulie : technique et erreurs",
    description:
      "Comment faire le face pull : la hauteur de la poulie, la prise de la corde, le tirage vers le visage et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au face pull, on tire une corde fixée à une poulie haute vers le visage, en écartant les mains : l’arrière des épaules et le haut du dos travaillent, des muscles que les mouvements de poussée sollicitent peu. Le tirage finit coudes hauts, mains à hauteur des tempes.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler la poulie",
          texte:
            "Place la poulie à hauteur du visage, avec une corde. Saisis les deux bouts et recule d’un pas, pour que les bras soient tendus devant toi.",
        },
        {
          titre: "Tirer vers le visage",
          texte:
            "Tire la corde vers ton visage en écartant les mains, coudes hauts, jusqu’à ce que les mains arrivent à côté des tempes. Serre les omoplates en fin de mouvement.",
        },
        {
          titre: "Revenir",
          texte:
            "Laisse revenir la corde jusqu’aux bras tendus, lentement, sans laisser la charge t’entraîner vers l’avant.",
        },
      ],
      erreurs: [
        {
          titre: "Tirer coudes bas",
          pourquoi:
            "Des coudes qui descendent transforment le face pull en rowing, et le milieu du dos prend le relais sur l’arrière des épaules. Garde les coudes à hauteur des épaules.",
        },
        {
          titre: "Se pencher en arrière",
          pourquoi:
            "Basculer le buste pour tirer fait travailler le dos et le poids du corps à la place des épaules. Reste droit, et allège la charge si besoin.",
        },
        {
          titre: "Charger trop lourd",
          pourquoi:
            "Trop lourd, le mouvement se raccourcit et les épaules remontent vers les oreilles. Une charge modérée et un tirage contrôlé suffisent.",
        },
      ],
      variantes: [
        {
          angle: "Aux haltères, buste penché",
          exercice: "Oiseau haltères",
          texte:
            "Penché en avant, on ouvre les bras sur les côtés : l’arrière des épaules travaille, sans poulie.",
        },
        {
          angle: "Bras sur les côtés",
          exercice: "Élévations latérales",
          texte:
            "Debout, on monte les bras sur les côtés jusqu’à l’horizontale : c’est le milieu de l’épaule qui travaille.",
        },
        {
          angle: "Assis, vers le ventre",
          exercice: "Rowing assis poulie",
          texte:
            "On tire une poignée vers le ventre, coudes bas : le milieu du dos prend la plus grande part.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le face pull se place en fin de séance de poussée ou d’épaules, pour équilibrer les mouvements où l’on pousse devant soi. Avec une charge légère, il sert aussi d’échauffement des épaules avant un développé.",
      materiel: "Une poulie haute avec une corde",
      materielCourt: "Poulie",
      nomDansLeTitre: "le face pull",
    },
  },
  {
    slug: "chaise-au-mur",
    exercice: "Chaise au mur",
    categorie: "jambes",
    title: "Chaise au mur : la position et les erreurs",
    description:
      "Comment faire la chaise au mur : le dos plaqué, l’angle des genoux, la position des pieds, la respiration et les erreurs fréquentes. La position illustrée.",
    contenu: {
      definition:
        "La chaise au mur se tient sans bouger : le dos plaqué contre un mur, on descend jusqu’à avoir les cuisses parallèles au sol, comme assis sur une chaise invisible, et on reste dans cette position. Les cuisses travaillent pendant toute la tenue, sans aucun saut ni impact, et sans autre matériel qu’un mur.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Dos contre le mur, pieds écartés de la largeur des hanches et avancés d’environ un pas. Laisse-toi glisser le long du mur en pliant les genoux.",
        },
        {
          titre: "Trouver l’angle",
          texte:
            "Arrête-toi quand les cuisses sont parallèles au sol, les genoux au-dessus des chevilles. Si c’est trop dur au début, reste un peu plus haut : l’angle se gagne avec les semaines.",
        },
        {
          titre: "Tenir et respirer",
          texte:
            "Le dos et la tête restent collés au mur, les bras le long du corps. Respire calmement, sans bloquer, jusqu’à la fin de la tenue, puis remonte en poussant dans les talons.",
        },
      ],
      erreurs: [
        {
          titre: "Placer les pieds trop près du mur",
          pourquoi:
            "Des pieds trop proches font passer les genoux devant les orteils et chargent l’avant du genou. Avance-les jusqu’à ce que les genoux se trouvent au-dessus des chevilles.",
        },
        {
          titre: "Pousser avec les mains",
          pourquoi:
            "Des mains posées sur les cuisses soulagent les jambes et raccourcissent le travail. Laisse les bras le long du corps, ou croisés sur la poitrine.",
        },
        {
          titre: "Bloquer la respiration",
          pourquoi:
            "Retenir son souffle fait monter la tension et écourte la tenue. Une respiration lente et régulière aide à tenir plus longtemps.",
        },
      ],
      variantes: [
        {
          angle: "En mouvement, debout",
          exercice: "Squat",
          texte:
            "Le même angle, mais on descend et on remonte sans mur : les cuisses et les fessiers travaillent en mouvement.",
        },
        {
          angle: "Assis, à la machine",
          exercice: "Leg extension",
          texte:
            "Assis, on tend les jambes contre un rouleau chargé : l’avant des cuisses travaille seul, sans le reste du corps.",
        },
        {
          angle: "Une jambe à la fois",
          exercice: "Fentes",
          texte:
            "Un grand pas, puis on descend le genou arrière vers le sol : chaque jambe travaille à son tour, avec plus d’équilibre à trouver.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "La chaise au mur se place en fin de séance de jambes, quand les cuisses sont déjà chaudes, ou dans un circuit au poids du corps entre deux mouvements. Elle se fait aussi à la maison, partout où il y a un mur libre.",
      materiel: "Un mur",
      materielCourt: "Sans matériel",
      promesse: "Le dos contre le mur, les cuisses à l’horizontale, on tient : les cuisses travaillent sans aucun impact.",
      nomDansLeTitre: "la chaise au mur",
    },
  },
  {
    slug: "releves-de-jambes",
    exercice: "Relevés de jambes",
    categorie: "abdos",
    title: "Relevés de jambes : technique et erreurs",
    description:
      "Comment faire les relevés de jambes au sol : la position, la montée des jambes, la descente contrôlée, le dos plaqué et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux relevés de jambes, on est allongé sur le dos et on monte les jambes tendues jusqu’à la verticale, puis on les redescend lentement : les abdominaux travaillent pour garder le bas du dos au sol pendant que les jambes bougent. Plus les jambes descendent près du sol, plus le travail est intense.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, jambes tendues et serrées, bras le long du corps, paumes au sol. Plaque le bas du dos contre le sol avant de commencer.",
        },
        {
          titre: "Monter les jambes",
          texte:
            "Monte les jambes tendues jusqu’à ce qu’elles soient à la verticale, au-dessus des hanches, sans élan.",
        },
        {
          titre: "Redescendre lentement",
          texte:
            "Redescends en contrôlant, jusqu’à frôler le sol, ou moins bas si le bas du dos décolle. C’est le dos plaqué qui fixe l’amplitude, pas le sol.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bas du dos se creuser",
          pourquoi:
            "Quand les jambes descendent trop bas pour le ventre, le bas du dos décolle et se cambre. Arrête la descente plus haut, ou plie légèrement les genoux.",
        },
        {
          titre: "Prendre de l’élan",
          pourquoi:
            "Des jambes lancées vers le haut puis lâchées font travailler l’élan à la place du ventre. Monte et descends au même rythme, sans à-coup.",
        },
        {
          titre: "Pousser sur les mains",
          pourquoi:
            "Appuyer fort sur les paumes soulage les abdominaux. Les mains restent posées pour l’équilibre, sans pousser le sol.",
        },
      ],
      variantes: [
        {
          angle: "Genoux pliés, bassin qui s’enroule",
          exercice: "Reverse crunch",
          texte:
            "On ramène les genoux vers la poitrine en décollant légèrement le bassin : le mouvement est plus court, le bas du dos moins sollicité.",
        },
        {
          angle: "En tenue",
          exercice: "Hollow hold",
          texte:
            "Jambes et épaules décollées du sol, on tient la position sans bouger, le bas du dos plaqué.",
        },
        {
          angle: "Jambes et buste ensemble",
          exercice: "V-ups",
          texte:
            "On monte les jambes et le buste en même temps pour toucher les pieds : tout l’avant du tronc travaille d’un coup.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les relevés de jambes se placent en fin de séance, avec les autres exercices d’abdos, ou dans un circuit au poids du corps. Un tapis rend la position plus confortable pour le dos.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Allongé, on monte les jambes tendues puis on les redescend lentement : le ventre travaille pour garder le dos au sol.",
      nomDansLeTitre: "des relevés de jambes",
    },
  },
  {
    slug: "jumping-jacks",
    exercice: "Jumping jacks",
    categorie: "cardio",
    title: "Jumping jacks : le mouvement et les erreurs",
    description:
      "Comment faire les jumping jacks : le saut pieds écartés, les bras au-dessus de la tête, la réception souple, le rythme et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Le jumping jack est un saut sur place : on écarte les pieds en levant les bras au-dessus de la tête, puis on revient pieds joints, bras le long du corps, et on enchaîne. Il fait monter le cœur et réveille tout le corps en quelques secondes, c’est pour ça qu’on le trouve si souvent au début d’un échauffement.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds joints, bras le long du corps, genoux légèrement fléchis.",
        },
        {
          titre: "Sauter en écartant",
          texte:
            "Saute en écartant les pieds un peu plus large que les épaules, pendant que les bras montent sur les côtés jusqu’au-dessus de la tête.",
        },
        {
          titre: "Revenir",
          texte:
            "Saute de nouveau pour revenir pieds joints, bras le long du corps, et enchaîne. Le rythme reste régulier, du début à la fin de la série.",
        },
      ],
      erreurs: [
        {
          titre: "Atterrir jambes tendues",
          pourquoi:
            "Retomber genoux bloqués, sur les talons, fait encaisser le choc par les articulations. Reçois-toi sur l’avant du pied, genoux souples.",
        },
        {
          titre: "Lever les bras à moitié",
          pourquoi:
            "Des bras qui s’arrêtent à hauteur d’épaules réduisent le mouvement et le travail du cœur. Ils montent jusqu’au-dessus de la tête à chaque saut.",
        },
        {
          titre: "Partir trop vite",
          pourquoi:
            "Un départ très rapide essouffle en quelques secondes et casse le rythme de la série. Commence à une allure que tu peux tenir, puis accélère si tu veux.",
        },
      ],
      variantes: [
        {
          angle: "Sur place, genoux hauts",
          exercice: "Montées de genoux",
          texte:
            "On court sur place en montant les genoux à hauteur des hanches : le travail se concentre sur les jambes et le souffle.",
        },
        {
          angle: "Avec une corde",
          exercice: "Corde à sauter",
          texte:
            "De petits sauts réguliers, les poignets font tourner la corde : il faut un peu de coordination, et le rythme s’installe vite.",
        },
        {
          angle: "Avec un passage au sol",
          exercice: "Burpees",
          texte:
            "On ajoute une descente en planche entre deux sauts : tout le corps travaille, et le souffle monte plus vite.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les jumping jacks ouvrent souvent un échauffement, une ou deux minutes avant les premiers mouvements. Ils trouvent aussi leur place dans un circuit cardio, en alternance avec des mouvements au sol. Sur un sol dur ou en appartement, des baskets qui amortissent rendent les sauts plus confortables.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des jumping jacks",
    },
  },
  {
    slug: "dips-sur-chaise",
    exercice: "Dips sur chaise",
    categorie: "bras",
    title: "Dips sur chaise : technique et erreurs",
    description:
      "Comment faire des dips sur une chaise : la position des mains, la descente coudes vers l’arrière, la remontée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Les dips sur chaise se font dos à une chaise, les mains posées sur le bord de l’assise : en pliant les coudes, on fait descendre le corps, puis on remonte en tendant les bras. Ce sont surtout les triceps, à l’arrière du bras, qui font le travail, avec un simple meuble stable à la maison.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Dos à une chaise stable, calée contre un mur si possible, mains posées sur le bord de l’assise, doigts vers l’avant. Avance les pieds : jambes pliées pour commencer, tendues comme sur l’animation quand le mouvement devient facile.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes vers l’arrière pour faire descendre le corps, le dos proche de la chaise, jusqu’à ce que les bras forment un angle droit.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans les paumes pour tendre les bras et remonter, épaules basses, loin des oreilles.",
        },
      ],
      erreurs: [
        {
          titre: "Ouvrir les coudes sur les côtés",
          pourquoi:
            "Des coudes qui s’écartent font passer le travail des triceps vers les épaules. Ils pointent vers l’arrière pendant toute la descente.",
        },
        {
          titre: "Descendre trop bas",
          pourquoi:
            "Au-delà de l’angle droit, l’avant de l’épaule se retrouve très étiré. Arrête-toi quand les bras forment un angle droit.",
        },
        {
          titre: "S’éloigner de la chaise",
          pourquoi:
            "Un bassin qui part vers l’avant fait basculer le poids sur les épaules. Garde le dos près du bord de l’assise, presque à le frôler.",
        },
      ],
      variantes: [
        {
          angle: "Aux barres parallèles",
          exercice: "Dips barres parallèles",
          texte:
            "Le corps entier est suspendu entre deux barres : tout le poids passe dans les bras, et les pectoraux participent davantage.",
        },
        {
          angle: "Au sol, mains serrées",
          exercice: "Pompes diamant",
          texte:
            "Une pompe les mains rapprochées sous la poitrine : les triceps travaillent beaucoup, et le sol suffit.",
        },
        {
          angle: "Avec un haltère",
          exercice: "Extension triceps haltère",
          texte:
            "L’haltère descend derrière la tête puis remonte bras tendus : les triceps travaillent seuls, sans le poids du corps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les dips sur chaise se placent en fin de séance de haut du corps, après les pompes, ou dans un circuit au poids du corps à la maison. Ils se combinent bien avec des pompes, pour enchaîner poussée et triceps.",
      materiel: "Une chaise stable ou un banc",
      materielCourt: "Une chaise",
      promesse: "Les mains sur le bord d’une chaise, on plie les coudes vers l’arrière : les triceps travaillent avec un simple meuble.",
      nomDansLeTitre: "des dips sur chaise",
    },
  },
  {
    slug: "kettlebell-swing",
    exercice: "Kettlebell swing",
    categorie: "jambes",
    title: "Kettlebell swing : technique et erreurs",
    description:
      "Comment faire le kettlebell swing : la charnière de hanche, l’impulsion des fessiers, les bras qui guident, le dos droit et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au kettlebell swing, on balance une kettlebell entre les jambes puis devant soi, jusqu’à hauteur de poitrine, en poussant les hanches vers l’avant : ce sont les fessiers et l’arrière des cuisses qui la font monter, les bras ne font que la tenir. Le mouvement s’enchaîne sans pause, et le souffle monte vite.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Pieds un peu plus larges que les hanches, la kettlebell posée au sol devant toi. Penche le buste en poussant les fesses vers l’arrière, dos droit, et saisis la poignée à deux mains.",
        },
        {
          titre: "Lancer avec les hanches",
          texte:
            "Fais passer la kettlebell entre tes jambes, puis tends vivement les hanches vers l’avant : elle monte devant toi jusqu’à hauteur de poitrine, bras tendus et relâchés.",
        },
        {
          titre: "Laisser redescendre",
          texte:
            "Laisse-la retomber entre tes jambes en repoussant les fesses vers l’arrière, dos droit, et enchaîne le lancer suivant sans t’arrêter.",
        },
      ],
      erreurs: [
        {
          titre: "Soulever avec les bras",
          pourquoi:
            "Des bras qui tirent la kettlebell vers le haut transforment le mouvement en élévation d’épaules. Ce sont les hanches qui la lancent : les bras restent tendus et relâchés.",
        },
        {
          titre: "Faire un squat",
          pourquoi:
            "Plier beaucoup les genoux fait travailler les cuisses à la place des fessiers. Les genoux restent souples, et ce sont les fesses qui partent vers l’arrière.",
        },
        {
          titre: "Arrondir le dos en bas",
          pourquoi:
            "Un dos qui s’enroule quand la kettlebell passe entre les jambes met la charge sur le bas du dos. Garde la poitrine ouverte et le regard un peu devant toi.",
        },
      ],
      variantes: [
        {
          angle: "La même charnière, lentement",
          exercice: "Soulevé de terre roumain",
          texte:
            "On descend la charge le long des jambes en poussant les fesses vers l’arrière, puis on remonte, sans élan : la charnière de hanche s’apprend en douceur.",
        },
        {
          angle: "En pliant les genoux",
          exercice: "Goblet squat",
          texte:
            "La même kettlebell tenue contre la poitrine, on descend en squat : les cuisses travaillent davantage que l’arrière des jambes.",
        },
        {
          angle: "Les hanches qui poussent, sans élan",
          exercice: "Hip thrust machine",
          texte:
            "Le dos posé sur un appui, on monte le bassin contre une charge guidée : les fessiers travaillent, sans le balancier.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le kettlebell swing se place en début de séance, quand on est frais pour apprendre le geste, ou dans un circuit cardio, en séries courtes. Il demande de la place devant soi.",
      materiel: "Une kettlebell",
      materielCourt: "Kettlebell",
      precaution:
        "Apprends le mouvement avec une kettlebell légère : tant que les bras tirent pour la faire monter, elle est trop lourde. Garde aussi de la place devant toi, la kettlebell passe à hauteur de poitrine.",
      promesse: "Les hanches lancent la kettlebell, les bras la guident : les fessiers, l’arrière des cuisses et le souffle travaillent ensemble.",
      nomDansLeTitre: "le kettlebell swing",
    },
  },
  {
    slug: "superman",
    exercice: "Superman",
    categorie: "dos",
    title: "Superman : l’exercice du bas du dos et ses erreurs",
    description:
      "Comment faire le superman : allongé sur le ventre, décoller bras et jambes, le regard vers le sol, la respiration et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au superman, on est allongé sur le ventre, bras tendus devant soi, et on décolle en même temps les bras, la poitrine et les jambes de quelques centimètres, avant de reposer : les muscles du bas du dos et les fessiers travaillent. Le mouvement est petit, et c’est voulu : il ne s’agit pas de se cambrer au maximum.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le ventre, bras tendus devant toi, jambes tendues, le front ou le nez tourné vers le sol.",
        },
        {
          titre: "Décoller",
          texte:
            "Soulève en même temps les bras, la poitrine et les jambes de quelques centimètres, en serrant les fessiers. Le regard reste vers le sol, la nuque dans le prolongement du dos.",
        },
        {
          titre: "Reposer",
          texte:
            "Marque une courte pause en haut, puis repose bras et jambes doucement, sans les laisser tomber, avant la répétition suivante.",
        },
      ],
      erreurs: [
        {
          titre: "Monter trop haut",
          pourquoi:
            "Chercher la plus grande hauteur possible creuse fortement le bas du dos. Quelques centimètres suffisent : c’est la tenue en haut qui fait le travail.",
        },
        {
          titre: "Relever la tête",
          pourquoi:
            "Regarder devant soi plie la nuque vers l’arrière. Le regard reste vers le sol, la tête dans l’alignement du dos.",
        },
        {
          titre: "Aller trop vite",
          pourquoi:
            "Des répétitions enchaînées par à-coups laissent l’élan faire le mouvement. Monte, tiens une seconde, et repose lentement.",
        },
      ],
      variantes: [
        {
          angle: "À quatre pattes, en croisé",
          exercice: "Bird dog",
          texte:
            "À quatre pattes, on tend un bras et la jambe opposée : le dos travaille aussi, avec de l’équilibre en plus.",
        },
        {
          angle: "Sur un banc",
          exercice: "Extensions lombaires banc",
          texte:
            "Les hanches calées sur un banc à lombaires, on descend le buste puis on le remonte dans l’alignement des jambes : l’amplitude est plus grande.",
        },
        {
          angle: "Sur le dos, bassin qui monte",
          exercice: "Pont fessier",
          texte:
            "Allongé sur le dos, on monte le bassin en poussant dans les talons : les fessiers prennent la plus grande part du travail.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le superman se place en fin de séance, avec les exercices d’abdos, pour faire travailler aussi l’arrière du tronc. Il se glisse bien dans une séance à la maison, sur un tapis.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Allongé sur le ventre, on décolle bras et jambes de quelques centimètres : le bas du dos et les fessiers travaillent.",
      nomDansLeTitre: "le superman",
    },
  },
  {
    slug: "pompes-diamant",
    exercice: "Pompes diamant",
    categorie: "bras",
    title: "Pompes diamant : technique et erreurs",
    description:
      "Comment faire les pompes diamant : les mains jointes sous la poitrine, les coudes le long du corps, la descente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "La pompe diamant se fait les mains rapprochées sous la poitrine, pouces et index qui se touchent en formant un losange : avec cette prise serrée, les triceps, à l’arrière du bras, prennent une plus grande part du travail qu’à la pompe classique. Elle demande aussi plus de force.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "En planche sur les mains, corps aligné des épaules aux talons. Rapproche les mains sous la poitrine, pouces et index qui se touchent.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes en les gardant le long du corps, vers l’arrière, et descends la poitrine vers tes mains, le corps toujours aligné.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans les mains pour tendre les bras et remonter, sans laisser le bassin descendre ou monter.",
        },
      ],
      erreurs: [
        {
          titre: "Ouvrir les coudes",
          pourquoi:
            "Des coudes qui partent sur les côtés font travailler davantage les épaules et les pectoraux. Ils restent serrés, le long du corps.",
        },
        {
          titre: "Laisser le bassin s’affaisser",
          pourquoi:
            "Un ventre qui descend vers le sol cambre le bas du dos. Le corps reste droit comme une planche, du début à la fin.",
        },
        {
          titre: "Raccourcir le mouvement",
          pourquoi:
            "Ne descendre que de quelques centimètres réduit beaucoup le travail. Si la pompe complète est trop dure, pose les genoux au sol plutôt que de raccourcir.",
        },
      ],
      variantes: [
        {
          angle: "Les mains plus écartées",
          exercice: "Pompes",
          texte:
            "La pompe classique, mains un peu plus larges que les épaules : les pectoraux travaillent davantage.",
        },
        {
          angle: "Les mains sur un support",
          exercice: "Pompes inclinées",
          texte:
            "Les mains posées sur un banc ou une table : une plus petite part du poids du corps passe dans les bras.",
        },
        {
          angle: "Dos à une chaise",
          exercice: "Dips sur chaise",
          texte:
            "Les mains sur le bord d’une chaise derrière soi, on plie les coudes vers l’arrière : les triceps travaillent aussi.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les pompes diamant se placent après les pompes classiques dans une séance de haut du corps, ou en fin de séance pour les triceps. Elles se font partout, sans matériel.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      promesse: "Une pompe les mains jointes sous la poitrine : les triceps prennent une plus grande part du travail.",
      nomDansLeTitre: "des pompes diamant",
    },
  },
  {
    slug: "mollets-debout",
    exercice: "Mollets",
    categorie: "jambes",
    title: "Mollets debout : la montée sur pointe et les erreurs",
    description:
      "Comment faire les mollets debout : la montée sur la pointe des pieds, la descente lente, l’amplitude complète et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Pour travailler les mollets debout, on monte sur la pointe des pieds le plus haut possible, puis on redescend lentement : les muscles de l’arrière de la jambe, sous le genou, font tout le travail. Le mouvement se fait au sol, sur une marche pour plus d’amplitude, ou avec une charge dans les mains.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds écartés de la largeur des hanches, jambes tendues sans bloquer les genoux. Une main contre un mur aide à garder l’équilibre.",
        },
        {
          titre: "Monter",
          texte:
            "Monte sur la pointe des pieds le plus haut possible, en poussant dans le gros orteil, et marque une seconde en haut.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’à poser les talons, ou plus bas que la marche si tu travailles sur une marche, puis remonte.",
        },
      ],
      erreurs: [
        {
          titre: "Rebondir",
          pourquoi:
            "Des répétitions rapides, qui rebondissent sur les talons, laissent l’élastique des tendons faire le travail. Monte, tiens une seconde, redescends lentement.",
        },
        {
          titre: "Monter à moitié",
          pourquoi:
            "S’arrêter à mi-hauteur réduit le travail des mollets. Va chercher la pointe la plus haute à chaque répétition.",
        },
        {
          titre: "Basculer vers l’extérieur du pied",
          pourquoi:
            "Un poids qui part sur le bord extérieur du pied fragilise la cheville. Pousse dans le gros orteil, les chevilles bien droites.",
        },
      ],
      variantes: [
        {
          angle: "Assis, à la machine",
          exercice: "Mollets assis",
          texte:
            "Genoux pliés, une charge posée sur les cuisses : le travail passe davantage sur le muscle profond du mollet.",
        },
        {
          angle: "En sautant",
          exercice: "Corde à sauter",
          texte:
            "De petits sauts sur l’avant du pied : les mollets travaillent à chaque rebond, avec le souffle en plus.",
        },
        {
          angle: "Pour étirer ensuite",
          exercice: "Étirement mollet au mur",
          texte:
            "Les mains contre un mur, une jambe tendue derrière, talon au sol : le mollet s’étire après la série.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les mollets se travaillent en fin de séance de jambes, ou à la maison, entre deux autres mouvements : il suffit d’un sol plat, ou d’une marche.",
      materiel: "Aucun, une marche pour plus d’amplitude",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "les mollets debout",
    },
  },
  {
    slug: "squat-barre",
    exercice: "Squat barre",
    categorie: "jambes",
    title: "Squat à la barre : technique et erreurs",
    description:
      "Comment faire le squat à la barre : le placement de la barre, la descente entre les pieds, la poitrine haute, la remontée et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au squat à la barre, la barre repose sur le haut du dos, et on descend en pliant les genoux et les hanches, comme pour s’asseoir entre ses talons, avant de remonter : les cuisses et les fessiers font le travail, et le tronc tient le buste droit sous la charge. C’est l’exercice de force des jambes que l’on retrouve dans presque tous les programmes.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Placer la barre",
          texte:
            "Passe sous la barre posée sur les supports, à hauteur d’épaules, et cale-la sur le haut du dos, sur les trapèzes, pas sur la nuque. Mains un peu plus larges que les épaules, recule de deux pas.",
        },
        {
          titre: "Descendre",
          texte:
            "Pieds un peu plus larges que les hanches, pointes légèrement ouvertes. Descends en poussant les hanches vers l’arrière et en pliant les genoux, poitrine haute, jusqu’à ce que les cuisses soient au moins parallèles au sol si ta mobilité le permet.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans tout le pied pour remonter, genoux dans l’axe des orteils, en gardant le dos droit jusqu’en haut.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les genoux rentrer",
          pourquoi:
            "Des genoux qui se rapprochent en remontant perdent l’alignement avec les pieds et chargent mal l’articulation. Pousse-les dans la direction des orteils.",
        },
        {
          titre: "Arrondir le bas du dos",
          pourquoi:
            "Un bas du dos qui s’enroule en bas du mouvement met la charge sur la colonne. Descends seulement jusqu’où le dos reste droit, et travaille la profondeur avec une charge plus légère.",
        },
        {
          titre: "Décoller les talons",
          pourquoi:
            "Des talons qui se lèvent font basculer le poids sur l’avant du pied et sur les genoux. Garde tout le pied au sol, du début à la fin.",
        },
      ],
      variantes: [
        {
          angle: "La charge devant",
          exercice: "Goblet squat",
          texte:
            "Un haltère tenu contre la poitrine : le buste reste droit plus facilement, et le geste s’apprend avec une charge modérée.",
        },
        {
          angle: "Le dos appuyé, à la machine",
          exercice: "Presse à cuisses",
          texte:
            "On pousse une plateforme avec les pieds, le dos calé contre un dossier : les cuisses travaillent sans que le tronc porte la charge.",
        },
        {
          angle: "Une jambe à la fois",
          exercice: "Squat bulgare",
          texte:
            "Le pied arrière posé sur un banc : la jambe avant porte l’essentiel du poids, avec de l’équilibre à trouver.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Quadriceps", "Fessiers", "Abdominaux"],
      placement:
        "Le squat à la barre se place en début de séance de jambes, quand on est frais, souvent en séries courtes et lourdes. Les mouvements plus guidés, comme la presse ou les fentes, viennent après.",
      materiel: "Une barre, des disques et une cage à squat",
      materielCourt: "Barre",
      precaution:
        "Travaille dans une cage à squat, avec les barres de sécurité réglées juste sous le point le plus bas de ta descente : une répétition ratée se pose dessus au lieu de rester sur ton dos.",
      promesse: "La barre sur le haut du dos, on descend entre les pieds : les cuisses et les fessiers travaillent avec une charge qui peut monter.",
      nomDansLeTitre: "un squat à la barre",
    },
  },
  {
    slug: "corde-a-sauter",
    exercice: "Corde à sauter",
    categorie: "cardio",
    title: "Corde à sauter : la technique et les erreurs",
    description:
      "Comment sauter à la corde : la longueur de la corde, les poignets qui la font tourner, les petits sauts sur l’avant du pied et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "À la corde à sauter, on fait tourner la corde avec les poignets et on la laisse passer sous les pieds par de petits sauts réguliers : le cœur monte vite, et les mollets travaillent à chaque rebond. Il ne faut qu’une corde et un peu de place, dedans comme dehors.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler la corde",
          texte:
            "Debout, un pied sur le milieu de la corde : les poignées doivent arriver à peu près sous les aisselles. Tiens-les les mains basses, à hauteur de hanches, coudes près du corps.",
        },
        {
          titre: "Faire tourner avec les poignets",
          texte:
            "Lance la corde par-dessus la tête d’un mouvement des poignets, pas des bras entiers, qui restent presque immobiles.",
        },
        {
          titre: "Sauter juste assez",
          texte:
            "Saute de quelques centimètres, sur l’avant du pied, genoux souples, au moment où la corde arrive aux pieds. Garde un rythme régulier.",
        },
      ],
      erreurs: [
        {
          titre: "Sauter trop haut",
          pourquoi:
            "De grands sauts fatiguent vite et cassent le rythme. Quelques centimètres suffisent pour laisser passer la corde.",
        },
        {
          titre: "Faire tourner avec les bras",
          pourquoi:
            "De grands cercles des bras ralentissent la corde et fatiguent les épaules. Ce sont les poignets qui la font tourner, coudes près du corps.",
        },
        {
          titre: "Retomber sur les talons",
          pourquoi:
            "Atterrir sur les talons, jambes tendues, fait encaisser le choc aux articulations. Reste sur l’avant du pied, genoux souples.",
        },
      ],
      variantes: [
        {
          angle: "Sans corde, bras et jambes qui s’écartent",
          exercice: "Jumping jacks",
          texte:
            "Un saut sur place qui écarte les pieds et monte les bras au-dessus de la tête : aucune coordination avec une corde à trouver.",
        },
        {
          angle: "Sur place, genoux hauts",
          exercice: "Montées de genoux",
          texte:
            "On court sur place en montant les genoux à hauteur des hanches : le souffle monte aussi, sans corde.",
        },
        {
          angle: "Les mollets, sans saut",
          exercice: "Mollets",
          texte:
            "Debout, on monte sur la pointe des pieds puis on redescend lentement : les mollets travaillent sans aucun impact.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "La corde à sauter se place en échauffement, quelques minutes avant la séance, ou dans un circuit cardio, en alternance avec des mouvements au sol. Les débutants avancent souvent par séries courtes, le temps que le rythme s’installe.",
      materiel: "Une corde à sauter",
      materielCourt: "Corde",
      nomDansLeTitre: "la corde à sauter",
    },
  },
  {
    slug: "dead-bug",
    exercice: "Dead bug",
    categorie: "abdos",
    title: "Dead bug : l’exercice de gainage et ses erreurs",
    description:
      "Comment faire le dead bug : sur le dos, bras et jambe opposés qui s’éloignent, le bas du dos au sol, la respiration et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au dead bug, on est allongé sur le dos, bras tendus vers le plafond et genoux pliés au-dessus des hanches, et on éloigne lentement un bras et la jambe opposée, avant de revenir et de changer de côté : les abdominaux travaillent pour garder le bas du dos au sol pendant que les membres bougent. C’est un exercice de gainage en mouvement.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, bras tendus vers le plafond, genoux pliés à angle droit au-dessus des hanches. Plaque le bas du dos contre le sol.",
        },
        {
          titre: "Éloigner bras et jambe opposés",
          texte:
            "Descends lentement un bras vers l’arrière de la tête et tends la jambe opposée vers l’avant, jusqu’à frôler le sol, sans que le bas du dos décolle.",
        },
        {
          titre: "Revenir et changer",
          texte:
            "Ramène le bras et la jambe à la position de départ, puis fais la même chose de l’autre côté. Chaque côté compte pour une répétition.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le dos se creuser",
          pourquoi:
            "Quand le bras et la jambe descendent trop bas, le bas du dos décolle et le ventre lâche. Arrête la descente plus haut, là où le dos reste plaqué.",
        },
        {
          titre: "Aller trop vite",
          pourquoi:
            "Des bras et des jambes qui retombent rapidement laissent l’élan faire le travail. Le mouvement est lent, contrôlé de bout en bout.",
        },
        {
          titre: "Bloquer la respiration",
          pourquoi:
            "Retenir son souffle rigidifie tout le corps au lieu d’apprendre au ventre à travailler. Expire en éloignant bras et jambe, inspire en revenant.",
        },
      ],
      variantes: [
        {
          angle: "À quatre pattes, en croisé",
          exercice: "Bird dog",
          texte:
            "Le même croisé de bras et de jambe, mais à quatre pattes : le dos travaille pour rester stable, avec de l’équilibre en plus.",
        },
        {
          angle: "En tenue",
          exercice: "Hollow hold",
          texte:
            "Jambes et épaules décollées du sol, on tient la position sans bouger, le bas du dos plaqué.",
        },
        {
          angle: "Les deux jambes ensemble",
          exercice: "Relevés de jambes",
          texte:
            "On monte et on redescend les deux jambes tendues : elles font un plus grand levier, et le ventre travaille davantage pour garder le dos au sol.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Abdominaux", "Muscles profonds du tronc"],
      placement:
        "Le dead bug se place en échauffement, pour réveiller le tronc avant une séance, ou en fin de séance avec les exercices d’abdos. Il se fait sur un tapis, à la maison comme en salle.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Sur le dos, on éloigne un bras et la jambe opposée : le ventre travaille pour garder le bas du dos au sol.",
      nomDansLeTitre: "le dead bug",
    },
  },
  {
    slug: "bird-dog",
    exercice: "Bird dog",
    categorie: "abdos",
    title: "Bird dog : la position et les erreurs",
    description:
      "Comment faire le bird dog : à quatre pattes, bras et jambe opposés tendus, le bassin stable, le dos droit et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au bird dog, on est à quatre pattes et on tend en même temps un bras devant soi et la jambe opposée derrière, avant de revenir et de changer de côté : le tronc travaille pour que le bassin et le dos ne bougent pas pendant que les membres s’allongent. Le mouvement est lent, et le défi est surtout de rester stable.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "À quatre pattes, mains sous les épaules, genoux sous les hanches, dos droit, regard vers le sol.",
        },
        {
          titre: "Tendre bras et jambe opposés",
          texte:
            "Tends lentement un bras vers l’avant et la jambe opposée vers l’arrière, jusqu’à ce qu’ils soient dans le prolongement du dos. Le bassin reste parallèle au sol.",
        },
        {
          titre: "Revenir et changer",
          texte:
            "Marque une courte pause, ramène le bras et le genou sous toi sans les poser, puis tends de nouveau, ou change de côté.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bassin tourner",
          pourquoi:
            "Une hanche qui s’ouvre vers le plafond quand la jambe monte fait perdre le travail du tronc. Les deux hanches restent à la même hauteur, parallèles au sol.",
        },
        {
          titre: "Monter la jambe trop haut",
          pourquoi:
            "Une jambe levée au-dessus du dos creuse les lombaires. Elle s’arrête dans le prolongement du corps.",
        },
        {
          titre: "Se précipiter",
          pourquoi:
            "Un mouvement rapide se fait sur l’élan et le déséquilibre. Tends lentement, tiens une seconde, reviens lentement.",
        },
      ],
      variantes: [
        {
          angle: "Sur le dos",
          exercice: "Dead bug",
          texte:
            "Le même croisé de bras et de jambe, allongé sur le dos : le ventre travaille pour garder le bas du dos au sol.",
        },
        {
          angle: "Sur le ventre",
          exercice: "Superman",
          texte:
            "Allongé sur le ventre, on décolle bras et jambes en même temps : le bas du dos et les fessiers travaillent davantage.",
        },
        {
          angle: "En tenue, face au sol",
          exercice: "Gainage",
          texte:
            "On tient la planche sur les avant-bras, sans bouger : tout l’avant du tronc travaille.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Lombaires", "Fessiers", "Muscles profonds du tronc"],
      placement:
        "Le bird dog se place en échauffement, avant une séance de jambes ou de dos, ou en fin de séance avec le gainage. Il se fait partout, sur un tapis.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "le bird dog",
    },
  },
  {
    slug: "hip-thrust-machine",
    exercice: "Hip thrust machine",
    categorie: "jambes",
    title: "Hip thrust à la machine : technique et erreurs",
    description:
      "Comment faire le hip thrust à la machine : le réglage, la poussée des hanches, l’alignement en haut, le menton rentré et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au hip thrust à la machine, on est assis, le haut du dos calé contre un dossier et un coussin posé sur les hanches, et on pousse le bassin vers le haut jusqu’à aligner les cuisses et le buste : les fessiers font l’essentiel du travail. La machine guide la trajectoire, et la charge se règle en quelques secondes.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assis sur la machine, le haut du dos contre le dossier, le coussin posé sur le haut des cuisses, au pli des hanches. Pieds à plat, écartés de la largeur des hanches, genoux pliés.",
        },
        {
          titre: "Pousser les hanches",
          texte:
            "Pousse dans les talons pour monter le bassin jusqu’à ce que les cuisses et le buste forment une ligne. Serre les fessiers une seconde en haut, menton rentré.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement, sans laisser la charge retomber, puis remonte pour la répétition suivante.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer en haut",
          pourquoi:
            "Monter le bassin au-delà de l’alignement creuse le bas du dos, et les fessiers travaillent moins. Arrête-toi quand cuisses et buste sont alignés.",
        },
        {
          titre: "Pousser sur la pointe des pieds",
          pourquoi:
            "Un poids qui part vers les orteils fait travailler l’avant des cuisses. Pousse dans les talons, les orteils peuvent presque se décoller.",
        },
        {
          titre: "Relever la tête",
          pourquoi:
            "Regarder vers le plafond pousse le dos à se cambrer. Garde le menton rentré, le regard vers l’avant, au-dessus des genoux.",
        },
      ],
      variantes: [
        {
          angle: "Au sol, sans machine",
          exercice: "Pont fessier",
          texte:
            "Allongé sur le dos, on monte le bassin en poussant dans les talons : le même travail des fessiers, avec le poids du corps.",
        },
        {
          angle: "La jambe vers l’arrière, à la poulie",
          exercice: "Kickback fessier poulie",
          texte:
            "Une jambe à la fois, on pousse la cheville vers l’arrière contre la poulie : le fessier travaille d’un côté puis de l’autre.",
        },
        {
          angle: "Avec de l’élan",
          exercice: "Kettlebell swing",
          texte:
            "Les hanches lancent une kettlebell devant soi : les fessiers travaillent aussi, de façon explosive, avec le souffle en plus.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le hip thrust à la machine se place dans une séance de jambes ou de fessiers, après un mouvement comme le squat ou le soulevé de terre roumain, ou comme mouvement principal d’une séance centrée sur les fessiers.",
      materiel: "Une machine à hip thrust",
      materielCourt: "Machine",
      promesse: "Le dos calé contre le dossier, on pousse le bassin vers le haut contre une charge guidée : les fessiers font le travail.",
      nomDansLeTitre: "le hip thrust à la machine",
    },
  },
  {
    slug: "pec-deck",
    exercice: "Pec deck",
    categorie: "pectoraux",
    title: "Pec deck : technique et erreurs",
    description:
      "Comment faire le pec deck : le réglage du siège, les poignées à hauteur d’épaules, le rapprochement lent devant la poitrine et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au pec deck, aussi appelé butterfly, on est assis dos au dossier et on rapproche devant la poitrine deux poignées placées sur les côtés, en décrivant un arc de cercle : les pectoraux travaillent sur une trajectoire guidée par la machine. Les bras restent presque tendus, le mouvement vient des épaules.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler la machine",
          texte:
            "Règle le siège pour que les poignées soient à hauteur d’épaules. Assis, le dos contre le dossier, saisis les poignées, coudes légèrement fléchis.",
        },
        {
          titre: "Rapprocher",
          texte:
            "Rapproche les poignées devant ta poitrine en un arc de cercle, lentement, jusqu’à ce qu’elles se rejoignent presque. Serre une seconde.",
        },
        {
          titre: "Revenir",
          texte:
            "Laisse les bras s’ouvrir lentement jusqu’à sentir l’étirement de la poitrine, sans laisser la charge tirer les bras vers l’arrière.",
        },
      ],
      erreurs: [
        {
          titre: "Décoller le dos du dossier",
          pourquoi:
            "Avancer le buste pour rapprocher les poignées fait travailler l’élan et les épaules. Le dos reste collé au dossier.",
        },
        {
          titre: "Claquer les bras devant",
          pourquoi:
            "Des poignées qui se cognent en fin de mouvement relâchent la tension des pectoraux. Rapproche lentement, sans choc.",
        },
        {
          titre: "Ouvrir trop loin derrière",
          pourquoi:
            "Laisser les bras partir loin derrière les épaules étire fortement l’avant de l’épaule. Arrête l’ouverture quand les mains arrivent à hauteur du buste.",
        },
      ],
      variantes: [
        {
          angle: "À la poulie, debout",
          exercice: "Écarté à la poulie",
          texte:
            "Debout entre deux poulies, on rapproche les mains devant soi : la même ouverture des bras, avec plus de liberté dans la trajectoire.",
        },
        {
          angle: "Allongé, aux haltères",
          exercice: "Développé couché haltères",
          texte:
            "Allongé sur un banc, on pousse deux haltères vers le haut : les pectoraux travaillent avec les triceps et l’avant des épaules.",
        },
        {
          angle: "Au sol, sans machine",
          exercice: "Pompes",
          texte:
            "En planche, on descend la poitrine vers le sol puis on remonte : les pectoraux travaillent avec le poids du corps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le pec deck se place en fin de séance de pectoraux, après les mouvements de poussée comme le développé couché ou les pompes, avec une charge qui permet des répétitions lentes.",
      materiel: "Une machine pec deck",
      materielCourt: "Machine",
      promesse: "Assis, on rapproche les poignées devant la poitrine sur une trajectoire guidée : les pectoraux travaillent.",
      nomDansLeTitre: "le pec deck",
    },
  },
  {
    slug: "bicycle-crunch",
    exercice: "Bicycle crunch",
    categorie: "abdos",
    title: "Bicycle crunch : technique et erreurs",
    description:
      "Comment faire le bicycle crunch : le coude vers le genou opposé, le pédalage des jambes, le rythme lent et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au bicycle crunch, on est allongé sur le dos, mains derrière la tête, et on amène un coude vers le genou opposé pendant que l’autre jambe s’allonge, puis on change de côté, comme en pédalant : les abdominaux enroulent le buste et les obliques le font tourner, dans le même mouvement.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, mains derrière la tête sans serrer la nuque, jambes levées, genoux pliés. Décolle légèrement les épaules du sol.",
        },
        {
          titre: "Croiser",
          texte:
            "Amène le coude droit vers le genou gauche en tournant le buste, pendant que la jambe droite s’allonge devant toi, sans toucher le sol.",
        },
        {
          titre: "Changer de côté",
          texte:
            "Passe de l’autre côté, coude gauche vers genou droit, et enchaîne lentement. Chaque côté compte pour une répétition.",
        },
      ],
      erreurs: [
        {
          titre: "Tirer sur la tête",
          pourquoi:
            "Des mains qui tirent la nuque vers l’avant la fatiguent sans faire travailler le ventre. Elles soutiennent seulement la tête, les doigts à peine posés.",
        },
        {
          titre: "Pédaler trop vite",
          pourquoi:
            "Un rythme rapide transforme la rotation en balancement des jambes. Va lentement, en marquant chaque côté.",
        },
        {
          titre: "Ne bouger que les coudes",
          pourquoi:
            "Rapprocher le coude du genou sans tourner le buste réduit le travail des obliques. C’est l’épaule qui tourne vers le genou opposé.",
        },
      ],
      variantes: [
        {
          angle: "Sans rotation",
          exercice: "Crunch",
          texte:
            "Allongé, on enroule seulement le haut du dos : le grand droit de l’abdomen travaille, sans tourner.",
        },
        {
          angle: "En rotation, assis",
          exercice: "Russian twist",
          texte:
            "Assis, buste incliné, on tourne les épaules d’un côté puis de l’autre : les obliques travaillent sans le pédalage.",
        },
        {
          angle: "Les jambes seulement",
          exercice: "Relevés de jambes",
          texte:
            "On monte et on redescend les deux jambes tendues, le buste au sol : le ventre travaille pour garder le dos plaqué.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le bicycle crunch se place en fin de séance, avec les autres exercices d’abdos, ou dans un circuit au poids du corps. Un tapis rend la position plus confortable.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "le bicycle crunch",
    },
  },
  {
    slug: "rameur",
    exercice: "Rameur",
    categorie: "cardio",
    title: "Rameur : la technique du mouvement et les erreurs",
    description:
      "Comment ramer sur un rameur : l’ordre jambes, buste, bras, le retour dans l’ordre inverse, le rythme et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Sur un rameur, on pousse avec les jambes, puis on bascule légèrement le buste en arrière, puis on tire la poignée vers le bas des côtes, avant de revenir dans l’ordre inverse : les jambes, le dos et les bras travaillent tour à tour, sans aucun impact. C’est une machine de cardio qui fait travailler presque tout le corps.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "La position de départ",
          texte:
            "Pieds sanglés, genoux pliés contre la poitrine, bras tendus devant toi sur la poignée, buste légèrement penché vers l’avant, dos droit.",
        },
        {
          titre: "Jambes, buste, bras",
          texte:
            "Pousse d’abord avec les jambes. Quand elles sont presque tendues, bascule légèrement le buste vers l’arrière, puis tire la poignée vers le bas de tes côtes, coudes près du corps.",
        },
        {
          titre: "Le retour, dans l’ordre inverse",
          texte:
            "Tends d’abord les bras, penche le buste vers l’avant, puis plie les genoux pour revenir à la position de départ. Le retour prend environ deux fois plus de temps que la poussée.",
        },
      ],
      erreurs: [
        {
          titre: "Tirer avec les bras d’abord",
          pourquoi:
            "Commencer par les bras fait faire le travail aux muscles les plus petits. La force vient des jambes : les bras finissent le mouvement.",
        },
        {
          titre: "Arrondir le dos",
          pourquoi:
            "Un dos qui s’enroule en début de mouvement fatigue le bas du dos. Garde le buste droit, penché depuis les hanches.",
        },
        {
          titre: "Revenir trop vite",
          pourquoi:
            "Un retour précipité casse le rythme et essouffle sans faire avancer. Le retour est calme, la poussée est franche.",
        },
      ],
      variantes: [
        {
          angle: "En pédalant",
          exercice: "Vélo",
          texte:
            "Assis, on pédale à une résistance réglable : le cardio se fait surtout avec les jambes, sans le haut du corps.",
        },
        {
          angle: "En courant",
          exercice: "Tapis de course",
          texte:
            "On marche ou on court à une allure réglée par la machine : les jambes et le souffle travaillent, avec des impacts au sol.",
        },
        {
          angle: "Le tirage, assis à la poulie",
          exercice: "Rowing assis poulie",
          texte:
            "Assis, on tire une poignée vers le ventre contre une charge : le dos travaille en force plutôt qu’en cardio.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le rameur sert d’échauffement, cinq minutes avant une séance, ou de séance cardio à part entière, en continu ou en intervalles. Il se combine bien avec une séance de musculation du haut du corps.",
      materiel: "Un rameur",
      materielCourt: "Rameur",
      nomDansLeTitre: "du rameur",
    },
  },
  {
    slug: "developpe-couche-halteres",
    exercice: "Développé couché haltères",
    categorie: "pectoraux",
    title: "Développé couché aux haltères : technique et erreurs",
    description:
      "Comment faire le développé couché aux haltères : l’installation sur le banc, la descente contrôlée, la poussée, les coudes et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au développé couché aux haltères, on est allongé sur un banc plat et on pousse deux haltères depuis la poitrine jusqu’au-dessus des épaules : les pectoraux, les triceps et l’avant des épaules travaillent. Chaque bras porte son haltère, et la descente peut aller un peu plus bas qu’avec une barre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assis au bout du banc, les haltères posés sur les cuisses, allonge-toi en les gardant contre la poitrine. Pieds à plat au sol, omoplates serrées contre le banc.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse les haltères vers le haut jusqu’aux bras presque tendus, au-dessus des épaules, en les rapprochant légèrement l’un de l’autre.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’à sentir l’étirement de la poitrine, les coudes à environ 45 degrés du buste, puis pousse de nouveau.",
        },
      ],
      erreurs: [
        {
          titre: "Ouvrir les coudes à l’horizontale",
          pourquoi:
            "Des coudes écartés à 90 degrés du buste mettent l’avant de l’épaule en position fragile. Garde-les un peu plus près du corps, vers 45 degrés.",
        },
        {
          titre: "Descendre trop bas",
          pourquoi:
            "Laisser les coudes plonger loin sous le banc étire fortement l’épaule. Arrête la descente quand la poitrine est bien étirée.",
        },
        {
          titre: "Décoller les fesses du banc",
          pourquoi:
            "Un bassin qui se soulève pour pousser plus lourd cambre le bas du dos. Les fesses restent sur le banc, et la charge baisse si besoin.",
        },
      ],
      variantes: [
        {
          angle: "À la barre",
          exercice: "Développé couché",
          texte:
            "Les deux mains sur la même barre : la charge peut être plus lourde, avec un geste plus guidé.",
        },
        {
          angle: "Le banc incliné",
          exercice: "Développé incliné haltères",
          texte:
            "Le dossier relevé, on pousse vers le haut et légèrement en arrière : le haut de la poitrine travaille davantage.",
        },
        {
          angle: "Au sol, sans matériel",
          exercice: "Pompes",
          texte:
            "On pousse le sol au lieu des haltères : les mêmes muscles, avec le poids du corps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le développé couché aux haltères se place en début de séance de pectoraux ou de haut du corps, comme mouvement principal, ou juste après le développé couché à la barre.",
      materiel: "Une paire d’haltères et un banc plat",
      materielCourt: "Haltères et banc",
      precaution:
        "Pour t’installer, assieds-toi au bout du banc, les haltères sur les cuisses, et allonge-toi en les gardant contre la poitrine. À la fin, ramène-les sur la poitrine avant de te redresser.",
      promesse: "Allongé sur un banc, on pousse deux haltères vers le haut : chaque bras travaille seul, avec un peu plus d’amplitude qu’à la barre.",
      nomDansLeTitre: "le développé couché aux haltères",
    },
  },
  {
    slug: "pompes-inclinees",
    exercice: "Pompes inclinées",
    categorie: "pectoraux",
    title: "Pompes inclinées : technique et erreurs",
    description:
      "Comment faire les pompes inclinées : les mains sur un banc ou une table, le corps aligné, la descente, la remontée et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux pompes inclinées, les mains sont posées sur un support plus haut que les pieds, un banc ou une table, et on fait une pompe : les pectoraux, les triceps et les épaules travaillent avec une plus petite part du poids du corps. Plus le support est haut, plus la pompe est accessible.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Les mains sur le bord d’un banc ou d’une table stable, un peu plus écartées que les épaules. Recule les pieds jusqu’à former une ligne droite des épaules aux talons.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes pour amener la poitrine vers le bord du support, les coudes à environ 45 degrés du buste, le corps toujours aligné.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans les mains pour tendre les bras, sans laisser le bassin descendre ni monter.",
        },
      ],
      erreurs: [
        {
          titre: "Plier le bassin",
          pourquoi:
            "Des fesses qui montent raccourcissent le mouvement et soulagent les bras. Serre les fessiers et le ventre pour rester droit.",
        },
        {
          titre: "Choisir un support instable",
          pourquoi:
            "Une chaise qui glisse ou une table légère peut partir sous les mains. Prends un appui calé, contre un mur si possible.",
        },
        {
          titre: "Ne descendre qu’à moitié",
          pourquoi:
            "S’arrêter loin du support réduit le travail de la poitrine. Descends jusqu’à frôler le bord avec la poitrine.",
        },
      ],
      variantes: [
        {
          angle: "Les mains au sol",
          exercice: "Pompes",
          texte:
            "La pompe classique : tout le haut du corps porte une plus grande part du poids.",
        },
        {
          angle: "Les mains serrées",
          exercice: "Pompes diamant",
          texte:
            "Les mains jointes sous la poitrine : les triceps prennent une plus grande part du travail.",
        },
        {
          angle: "Allongé, avec des haltères",
          exercice: "Développé couché haltères",
          texte:
            "Sur un banc, on pousse deux haltères vers le haut : les mêmes muscles, avec une charge qu’on choisit.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les pompes inclinées se placent au début d’une séance de haut du corps à la maison, ou après des pompes au sol pour terminer les séries quand la fatigue arrive.",
      materiel: "Un banc, une table ou un plan de travail stable",
      materielCourt: "Un support",
      promesse: "Les mains sur un banc ou une table, on fait une pompe : la poitrine et les bras travaillent avec une plus petite part du poids du corps.",
      nomDansLeTitre: "des pompes inclinées",
    },
  },
  {
    slug: "rowing-assis-poulie",
    exercice: "Rowing assis poulie",
    categorie: "dos",
    title: "Rowing assis à la poulie : technique et erreurs",
    description:
      "Comment faire le rowing assis à la poulie : la position, le buste droit, le tirage vers le ventre, les omoplates et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au rowing assis à la poulie, on est assis face à une poulie basse, les pieds calés, et on tire une poignée vers le ventre en rapprochant les omoplates : le milieu du dos travaille, avec l’arrière des épaules et les biceps. Le buste reste droit, c’est la charge qui vient vers soi.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assis sur le banc, les pieds calés sur les appuis, genoux légèrement fléchis. Saisis la poignée bras tendus, buste droit.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire la poignée vers le bas de tes côtes, coudes près du corps, en rapprochant les omoplates. Le buste reste droit.",
        },
        {
          titre: "Revenir",
          texte:
            "Laisse les bras se tendre lentement, en laissant les épaules avancer un peu, sans arrondir le dos.",
        },
      ],
      erreurs: [
        {
          titre: "Se balancer d’avant en arrière",
          pourquoi:
            "Un buste qui bascule loin vers l’arrière pour tirer fait travailler l’élan et le bas du dos. Le buste bouge à peine : ce sont les bras et les omoplates qui travaillent.",
        },
        {
          titre: "Hausser les épaules",
          pourquoi:
            "Des épaules qui montent vers les oreilles font travailler le haut des trapèzes. Garde-les basses, loin des oreilles.",
        },
        {
          titre: "Tirer trop haut",
          pourquoi:
            "Une poignée tirée vers la poitrine ouvre les coudes et change le travail. Elle vient vers le bas des côtes, coudes près du corps.",
        },
      ],
      variantes: [
        {
          angle: "Un bras à la fois, aux haltères",
          exercice: "Rowing haltère",
          texte:
            "Une main et un genou sur un banc, on tire un haltère vers la hanche : chaque côté travaille seul.",
        },
        {
          angle: "Debout, à la barre",
          exercice: "Rowing barre",
          texte:
            "Buste penché, on tire une barre vers le ventre : le bas du dos travaille aussi pour tenir la position.",
        },
        {
          angle: "Vers le bas, à la poulie haute",
          exercice: "Tirage poitrine",
          texte:
            "Assis, on tire une barre de la poulie haute vers le haut de la poitrine : le travail passe sur les grands dorsaux.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le rowing assis à la poulie se place dans une séance de dos, après les tractions ou le tirage poitrine, ou dans une séance de haut du corps pour équilibrer les mouvements de poussée.",
      materiel: "Une poulie basse avec une poignée",
      materielCourt: "Poulie",
      promesse: "Assis, on tire une poignée vers le ventre en rapprochant les omoplates : le milieu du dos travaille.",
      nomDansLeTitre: "le rowing assis à la poulie",
    },
  },
  {
    slug: "leg-extension",
    exercice: "Leg extension",
    categorie: "jambes",
    title: "Leg extension : technique et erreurs",
    description:
      "Comment faire le leg extension à la machine : le réglage du siège et du rouleau, l’extension des jambes, la descente lente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au leg extension, on est assis sur une machine, un rouleau calé devant le bas des tibias, et on tend les jambes en poussant le rouleau vers le haut : l’avant des cuisses, les quadriceps, travaille seul. La machine guide le mouvement, et la charge se règle en quelques secondes.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler la machine",
          texte:
            "Règle le dossier pour que tes genoux soient au bord du siège, alignés avec l’axe de la machine, et le rouleau posé juste au-dessus des chevilles.",
        },
        {
          titre: "Tendre les jambes",
          texte:
            "Tends les jambes jusqu’à les avoir presque droites, en tenant les poignées sur les côtés, et marque une seconde en haut.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement, sans laisser la charge retomber, jusqu’aux genoux pliés à angle droit.",
        },
      ],
      erreurs: [
        {
          titre: "Donner un coup de jambes",
          pourquoi:
            "Un mouvement lancé laisse l’élan monter la charge et sollicite le genou par à-coups. Tends les jambes de façon régulière, sans rebond.",
        },
        {
          titre: "Mal régler le siège",
          pourquoi:
            "Des genoux décalés par rapport à l’axe de la machine font travailler l’articulation de travers. Aligne-les avant la première série.",
        },
        {
          titre: "Laisser retomber la charge",
          pourquoi:
            "Une descente lâchée fait perdre la moitié du travail. Elle dure au moins aussi longtemps que la montée.",
        },
      ],
      variantes: [
        {
          angle: "Toute la jambe, à la machine",
          exercice: "Presse à cuisses",
          texte:
            "On pousse une plateforme avec les pieds : les cuisses et les fessiers travaillent ensemble.",
        },
        {
          angle: "En tenue, contre un mur",
          exercice: "Chaise au mur",
          texte:
            "Le dos contre un mur, les cuisses à l’horizontale, on tient sans bouger : l’avant des cuisses travaille sans machine.",
        },
        {
          angle: "L’arrière des cuisses",
          exercice: "Leg curl assis",
          texte:
            "Assis sur une machine voisine, on ramène les talons sous le siège : ce sont les ischio-jambiers qui travaillent.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le leg extension se place en fin de séance de jambes, après les squats ou la presse, avec une charge qui permet des répétitions lentes et contrôlées.",
      materiel: "Une machine à leg extension",
      materielCourt: "Machine",
      nomDansLeTitre: "le leg extension",
    },
  },
  {
    slug: "developpe-arnold",
    exercice: "Développé Arnold",
    categorie: "epaules",
    title: "Développé Arnold : technique et erreurs",
    description:
      "Comment faire le développé Arnold : le départ paumes vers soi, la rotation pendant la montée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le développé Arnold part des haltères tenus devant les épaules, paumes tournées vers soi, et on les pousse au-dessus de la tête en tournant les paumes vers l’avant pendant la montée : l’avant et le côté de l’épaule travaillent, avec les triceps. La rotation se refait en sens inverse à la descente.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout ou assis sur un banc à dossier, les haltères devant les épaules, paumes tournées vers toi, coudes devant le buste.",
        },
        {
          titre: "Pousser en tournant",
          texte:
            "Écarte les coudes sur les côtés en tournant les paumes vers l’avant, puis pousse les haltères au-dessus de la tête jusqu’aux bras presque tendus.",
        },
        {
          titre: "Revenir",
          texte:
            "Redescends lentement en refaisant la rotation à l’envers, jusqu’à retrouver les haltères devant les épaules, paumes vers toi.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer le dos",
          pourquoi:
            "Un bas du dos qui se creuse pour pousser plus haut fait passer la charge sur la colonne. Serre le ventre et les fessiers, ou fais le mouvement assis contre un dossier.",
        },
        {
          titre: "Tourner d’un coup",
          pourquoi:
            "Une rotation brusque en haut ou en bas sollicite l’épaule par à-coups. La rotation se fait pendant toute la montée, au même rythme que la poussée.",
        },
        {
          titre: "Hausser les épaules",
          pourquoi:
            "Des épaules qui remontent vers les oreilles font travailler le haut des trapèzes. Garde la nuque longue, les épaules basses au départ.",
        },
      ],
      variantes: [
        {
          angle: "Sans rotation",
          exercice: "Développé militaire haltères",
          texte:
            "On pousse les haltères au-dessus de la tête, paumes vers l’avant du début à la fin : le geste est plus simple et la charge peut être un peu plus lourde.",
        },
        {
          angle: "Les bras sur les côtés",
          exercice: "Élévations latérales",
          texte:
            "Bras presque tendus, on monte les haltères sur les côtés jusqu’à l’horizontale : le côté de l’épaule travaille seul.",
        },
        {
          angle: "Les bras devant soi",
          exercice: "Élévations frontales",
          texte:
            "On monte les haltères devant soi jusqu’à hauteur des épaules : l’avant de l’épaule travaille seul.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le développé Arnold se place en début de séance d’épaules, comme mouvement principal, ou à la place du développé militaire dans une séance de haut du corps.",
      materiel: "Une paire d’haltères, un banc à dossier si tu le fais assis",
      materielCourt: "Haltères",
      promesse: "On pousse deux haltères au-dessus de la tête en tournant les paumes : l’avant et le côté de l’épaule travaillent.",
      nomDansLeTitre: "le développé Arnold",
    },
  },
  {
    slug: "oiseau-halteres",
    exercice: "Oiseau haltères",
    categorie: "epaules",
    title: "Oiseau aux haltères : technique et erreurs",
    description:
      "Comment faire l’oiseau aux haltères : le buste penché, l’ouverture des bras sur les côtés, les épaules basses, la descente lente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "À l’oiseau, on se penche en avant, dos droit, et on ouvre les bras sur les côtés avec un haltère dans chaque main, comme des ailes : l’arrière des épaules et le haut du dos travaillent, des muscles que les mouvements de poussée sollicitent peu. Les charges sont légères.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, genoux fléchis, penche le buste vers l’avant en poussant les fesses vers l’arrière, dos droit. Les haltères pendent sous les épaules, paumes face à face.",
        },
        {
          titre: "Ouvrir les bras",
          texte:
            "Ouvre les bras sur les côtés, coudes légèrement fléchis, jusqu’à hauteur des épaules, en rapprochant un peu les omoplates.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’aux bras sous les épaules, sans laisser les haltères tomber, le buste toujours penché.",
        },
      ],
      erreurs: [
        {
          titre: "Se redresser en montant",
          pourquoi:
            "Un buste qui se relève à chaque répétition donne de l’élan et fait travailler le bas du dos. Le buste reste penché du début à la fin de la série.",
        },
        {
          titre: "Plier les coudes de plus en plus",
          pourquoi:
            "Des coudes qui se plient transforment le mouvement en rowing, et le milieu du dos prend le relais. Les coudes gardent le même léger angle.",
        },
        {
          titre: "Charger trop lourd",
          pourquoi:
            "Trop lourd, les épaules remontent vers les oreilles et l’amplitude se raccourcit. Des haltères légers et un mouvement contrôlé suffisent.",
        },
      ],
      variantes: [
        {
          angle: "À la poulie, vers le visage",
          exercice: "Face pull poulie",
          texte:
            "Debout face à une poulie haute, on tire une corde vers le visage, coudes hauts : l’arrière des épaules travaille aussi.",
        },
        {
          angle: "Debout, bras sur les côtés",
          exercice: "Élévations latérales",
          texte:
            "Buste droit, on monte les bras sur les côtés : c’est le milieu de l’épaule qui travaille.",
        },
        {
          angle: "Un bras, vers la hanche",
          exercice: "Rowing haltère",
          texte:
            "Une main et un genou sur un banc, on tire un haltère vers la hanche : le dos travaille davantage.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "L’oiseau se place en fin de séance d’épaules ou de dos, en séries de douze à quinze répétitions avec des haltères légers.",
      materiel: "Une paire d’haltères légers",
      materielCourt: "Haltères",
      promesse: "Buste penché, on ouvre les bras sur les côtés : l’arrière des épaules et le haut du dos travaillent.",
      nomDansLeTitre: "l’oiseau aux haltères",
    },
  },
  {
    slug: "elevations-frontales",
    exercice: "Élévations frontales",
    categorie: "epaules",
    title: "Élévations frontales : technique et erreurs",
    description:
      "Comment faire les élévations frontales aux haltères : la montée des bras devant soi, la hauteur des épaules, la descente lente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux élévations frontales, on est debout et on monte les haltères devant soi, bras presque tendus, jusqu’à hauteur des épaules : l’avant de l’épaule travaille seul. C’est un mouvement d’isolation, qui se fait avec des charges légères.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds écartés de la largeur des hanches, un haltère dans chaque main devant les cuisses, coudes très légèrement fléchis.",
        },
        {
          titre: "Monter",
          texte:
            "Monte les haltères devant toi jusqu’à hauteur des épaules, bras presque tendus, sans bouger le buste.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’aux cuisses. Les deux bras peuvent monter ensemble, comme sur l’animation, ou l’un après l’autre.",
        },
      ],
      erreurs: [
        {
          titre: "Balancer le buste",
          pourquoi:
            "Un coup de reins lance les haltères et fait travailler le bas du dos. Le buste reste immobile : si tu dois te balancer, prends plus léger.",
        },
        {
          titre: "Monter trop haut",
          pourquoi:
            "Au-dessus de la tête, ce sont surtout les trapèzes qui prennent le relais. La hauteur des épaules suffit.",
        },
        {
          titre: "Lâcher la descente",
          pourquoi:
            "Des haltères qui retombent font perdre la moitié du travail. La descente prend au moins le temps de la montée.",
        },
      ],
      variantes: [
        {
          angle: "Les bras sur les côtés",
          exercice: "Élévations latérales",
          texte:
            "On monte les bras sur les côtés jusqu’à l’horizontale : le milieu de l’épaule travaille à la place de l’avant.",
        },
        {
          angle: "Au-dessus de la tête",
          exercice: "Développé militaire haltères",
          texte:
            "On pousse les haltères au-dessus de la tête : toute l’épaule travaille, avec les triceps, et la charge peut être plus lourde.",
        },
        {
          angle: "En tournant les paumes",
          exercice: "Développé Arnold",
          texte:
            "On pousse les haltères au-dessus de la tête en tournant les paumes : l’avant et le côté de l’épaule travaillent ensemble.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les élévations frontales se placent en fin de séance d’épaules. L’avant de l’épaule travaille déjà dans les développés et les pompes : quelques séries légères suffisent.",
      materiel: "Une paire d’haltères légers",
      materielCourt: "Haltères",
      nomDansLeTitre: "des élévations frontales",
    },
  },
  {
    slug: "leg-curl-assis",
    exercice: "Leg curl assis",
    categorie: "jambes",
    title: "Leg curl assis : technique et erreurs",
    description:
      "Comment faire le leg curl assis à la machine : le réglage du siège et du rouleau, la flexion des genoux, le retour lent et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au leg curl assis, on est assis sur une machine, les jambes tendues posées sur un rouleau, et on ramène les talons sous le siège en pliant les genoux : l’arrière des cuisses, les ischio-jambiers, travaille seul. La machine guide le mouvement.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler la machine",
          texte:
            "Règle le dossier pour que tes genoux soient alignés avec l’axe de la machine, le rouleau posé sous les mollets, juste au-dessus des talons. Baisse le coussin sur le haut des cuisses.",
        },
        {
          titre: "Plier les genoux",
          texte:
            "Ramène les talons sous le siège en pliant les genoux, le plus loin possible, en tenant les poignées sur les côtés.",
        },
        {
          titre: "Revenir",
          texte:
            "Laisse les jambes se tendre lentement, sans que la charge les tire d’un coup, jusqu’aux genoux presque droits.",
        },
      ],
      erreurs: [
        {
          titre: "Mal régler la machine",
          pourquoi:
            "Des genoux décalés par rapport à l’axe font travailler l’articulation de travers. Aligne-les avant la première série.",
        },
        {
          titre: "Soulever les hanches",
          pourquoi:
            "Des cuisses qui décollent du siège laissent le bassin aider le mouvement. Le coussin les maintient : serre-le assez.",
        },
        {
          titre: "Laisser remonter la charge",
          pourquoi:
            "Un retour lâché fait perdre la moitié du travail. Les jambes se tendent lentement, au même rythme que la flexion.",
        },
      ],
      variantes: [
        {
          angle: "L’avant des cuisses",
          exercice: "Leg extension",
          texte:
            "Sur la machine voisine, on tend les jambes contre un rouleau : ce sont les quadriceps qui travaillent.",
        },
        {
          angle: "Debout, avec une charge",
          exercice: "Soulevé de terre roumain",
          texte:
            "On descend la charge le long des jambes en poussant les fesses vers l’arrière : l’arrière des cuisses travaille en s’étirant, avec les fessiers.",
        },
        {
          angle: "Au sol, sans machine",
          exercice: "Pont fessier",
          texte:
            "Allongé sur le dos, on monte le bassin en poussant dans les talons : les fessiers et l’arrière des cuisses travaillent.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le leg curl assis se place dans une séance de jambes, souvent après le leg extension ou la presse, avec une charge qui permet des répétitions lentes et contrôlées.",
      materiel: "Une machine à leg curl assis",
      materielCourt: "Machine",
      promesse: "Assis, on ramène les talons sous le siège contre un rouleau : l’arrière des cuisses travaille seul.",
      nomDansLeTitre: "le leg curl assis",
    },
  },
  {
    slug: "pike-push-ups",
    exercice: "Pike push-ups",
    categorie: "epaules",
    title: "Pike push-ups : technique et erreurs",
    description:
      "Comment faire les pike push-ups : la position en V inversé, la tête qui descend entre les mains, les coudes, la remontée et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Le pike push-up est une pompe faite les hanches hautes, le corps en V inversé : en pliant les coudes, on descend la tête vers le sol entre les mains, puis on remonte. Ce sont surtout les épaules et les triceps qui travaillent, comme dans un développé au-dessus de la tête, avec le poids du corps.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Pars en planche, puis remonte les hanches jusqu’à former un V inversé. Mains un peu plus écartées que les épaules, jambes tendues ou légèrement pliées.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes pour amener le haut de la tête vers le sol, un peu devant les mains, les coudes vers l’arrière en diagonale.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans les mains pour tendre les bras, en gardant les hanches hautes du début à la fin.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les hanches descendre",
          pourquoi:
            "Des hanches qui baissent transforment le mouvement en pompe classique, et la poitrine prend le relais. Garde le V inversé.",
        },
        {
          titre: "Ouvrir les coudes sur les côtés",
          pourquoi:
            "Des coudes écartés à l’horizontale mettent l’épaule en position fragile. Ils partent vers l’arrière, en diagonale.",
        },
        {
          titre: "Descendre la tête à l’aplomb des mains",
          pourquoi:
            "Une tête qui descend à l’aplomb des mains fait basculer le poids vers l’avant. Elle arrive un peu devant elles, pour former un triangle avec les mains.",
        },
      ],
      variantes: [
        {
          angle: "Avec des haltères",
          exercice: "Développé militaire haltères",
          texte:
            "Debout ou assis, on pousse deux haltères au-dessus de la tête : la même poussée verticale, avec une charge qu’on choisit.",
        },
        {
          angle: "Le corps à l’horizontale",
          exercice: "Pompes",
          texte:
            "La pompe classique, corps droit : la poitrine travaille davantage que les épaules.",
        },
        {
          angle: "En tournant les paumes",
          exercice: "Développé Arnold",
          texte:
            "Aux haltères, on pousse au-dessus de la tête en tournant les paumes : l’avant et le côté de l’épaule travaillent.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les pike push-ups se placent dans une séance de haut du corps à la maison, après les pompes, ou au début d’une séance d’épaules sans matériel.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      promesse: "Les hanches hautes, on descend la tête vers le sol entre les mains : les épaules et les triceps travaillent, sans matériel.",
      nomDansLeTitre: "des pike push-ups",
    },
  },
  {
    slug: "montees-de-genoux",
    exercice: "Montées de genoux",
    categorie: "cardio",
    title: "Montées de genoux : le mouvement et les erreurs",
    description:
      "Comment faire les montées de genoux : la course sur place, les genoux vers la hauteur des hanches, les appuis légers, le rythme et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux montées de genoux, on court sur place en montant les genoux devant soi, les bras qui accompagnent comme dans une course : le cœur monte vite, et l’avant des cuisses travaille. Les appuis restent légers, sur l’avant du pied.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds écartés de la largeur des hanches, buste droit, bras pliés le long du corps.",
        },
        {
          titre: "Monter les genoux",
          texte:
            "Monte un genou devant toi, vers la hauteur des hanches, puis l’autre, en enchaînant comme une course sur place. Les bras accompagnent, en opposition.",
        },
        {
          titre: "Garder le rythme",
          texte:
            "Reste sur l’avant du pied, appuis légers, et garde le même rythme jusqu’à la fin de la série.",
        },
      ],
      erreurs: [
        {
          titre: "Se pencher en arrière",
          pourquoi:
            "Un buste qui part vers l’arrière pour monter les genoux plus haut fatigue le bas du dos. Le buste reste droit, quitte à monter les genoux un peu moins.",
        },
        {
          titre: "Retomber sur les talons",
          pourquoi:
            "Des talons qui frappent le sol font encaisser chaque appui aux articulations. Reste sur l’avant du pied.",
        },
        {
          titre: "Laisser les genoux descendre",
          pourquoi:
            "Avec la fatigue, les genoux montent de moins en moins et le mouvement perd son intérêt. Ralentis plutôt que de baisser la hauteur.",
        },
      ],
      variantes: [
        {
          angle: "Bras et jambes qui s’écartent",
          exercice: "Jumping jacks",
          texte:
            "Un saut sur place qui écarte les pieds et monte les bras au-dessus de la tête.",
        },
        {
          angle: "Avec une corde",
          exercice: "Corde à sauter",
          texte:
            "De petits sauts réguliers, les poignets font tourner la corde : il faut un peu de coordination.",
        },
        {
          angle: "En planche",
          exercice: "Mountain climbers",
          texte:
            "Les mains au sol, on ramène les genoux vers la poitrine l’un après l’autre : le tronc travaille en plus.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les montées de genoux ouvrent souvent un échauffement, ou se placent dans un circuit cardio, en intervalles de trente secondes. Sans saut, en marchant vite, elles se font aussi en appartement.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des montées de genoux",
    },
  },
  {
    slug: "squats-sautes",
    exercice: "Squats sautés",
    categorie: "jambes",
    title: "Squats sautés : technique et erreurs",
    description:
      "Comment faire les squats sautés : la descente en squat, la poussée pour décoller, la réception genoux souples et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le squat sauté est un squat qui se termine par un saut : on descend, on pousse fort dans le sol pour décoller, puis on se reçoit en souplesse pour enchaîner le suivant. Les cuisses et les fessiers travaillent de façon explosive, et le souffle monte vite.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Descendre",
          texte:
            "Pieds un peu plus écartés que les hanches, descends en squat, cuisses vers l’horizontale, bras tendus devant toi pour l’équilibre.",
        },
        {
          titre: "Sauter",
          texte:
            "Pousse fort dans tout le pied pour décoller, en tendant les jambes et en ramenant les bras le long du corps.",
        },
        {
          titre: "Se recevoir",
          texte:
            "Reçois-toi sur l’avant du pied, genoux souples, puis tout le pied, et redescends directement dans le squat suivant.",
        },
      ],
      erreurs: [
        {
          titre: "Se recevoir jambes tendues",
          pourquoi:
            "Retomber genoux bloqués fait encaisser le choc aux articulations. Les genoux plient dès que les pieds touchent le sol.",
        },
        {
          titre: "Laisser les genoux rentrer",
          pourquoi:
            "Des genoux qui se rapprochent à la réception perdent l’alignement avec les pieds. Ils restent dans l’axe des orteils.",
        },
        {
          titre: "Enchaîner trop vite",
          pourquoi:
            "Accélérer au détriment de la réception fait perdre le contrôle. Une réception propre compte plus que le nombre de sauts.",
        },
      ],
      variantes: [
        {
          angle: "Sans saut",
          exercice: "Squat",
          texte:
            "Le même mouvement, sans décoller : aucun impact, et le geste se travaille plus lentement.",
        },
        {
          angle: "Une jambe devant",
          exercice: "Fentes sautées",
          texte:
            "On saute en fente et on change de jambe en l’air : chaque jambe travaille à son tour, avec plus d’équilibre à trouver.",
        },
        {
          angle: "Sur une caisse",
          exercice: "Box jump",
          texte:
            "On saute à pieds joints sur une caisse stable, puis on redescend en marchant : la réception se fait en hauteur.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les squats sautés se placent dans un circuit cardio ou une séance de jambes au poids du corps, en séries courtes. Sur un sol dur ou en appartement, le squat sans saut prend le relais.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des squats sautés",
    },
  },
  {
    slug: "gainage-dynamique",
    exercice: "Gainage dynamique",
    categorie: "abdos",
    title: "Gainage dynamique : le mouvement et les erreurs",
    description:
      "Comment faire le gainage dynamique : passer des avant-bras aux mains et revenir, les hanches stables, les appuis sous les épaules et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au gainage dynamique, on part en planche sur les avant-bras, puis on monte sur une main, puis sur l’autre, jusqu’à la planche bras tendus, avant de redescendre sur les coudes : le tronc tient la position pendant que les bras bougent, et les épaules travaillent aussi.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "En planche sur les avant-bras, coudes sous les épaules, corps aligné des épaules aux talons, pieds un peu écartés pour la stabilité.",
        },
        {
          titre: "Monter sur les mains",
          texte:
            "Pose une main au sol sous l’épaule, puis l’autre, et pousse jusqu’à la planche bras tendus, sans balancer les hanches.",
        },
        {
          titre: "Redescendre",
          texte:
            "Repose un avant-bras, puis l’autre. À la répétition suivante, commence par l’autre bras.",
        },
      ],
      erreurs: [
        {
          titre: "Balancer les hanches",
          pourquoi:
            "Des hanches qui tournent à chaque changement d’appui font perdre le travail du tronc. Écarte un peu plus les pieds et va plus lentement.",
        },
        {
          titre: "Laisser les fesses monter",
          pourquoi:
            "Un bassin qui monte rend la position plus facile et soulage le ventre. Le corps reste droit comme une planche.",
        },
        {
          titre: "Poser les mains loin des épaules",
          pourquoi:
            "Des mains placées devant les épaules mettent l’appui en porte-à-faux. Elles se posent à l’aplomb des épaules.",
        },
      ],
      variantes: [
        {
          angle: "Sans bouger",
          exercice: "Gainage",
          texte:
            "La planche sur les avant-bras, tenue sans mouvement : tout le travail est pour le tronc.",
        },
        {
          angle: "Sur un côté",
          exercice: "Planche latérale",
          texte:
            "Le corps de profil, sur un seul appui : les obliques travaillent davantage.",
        },
        {
          angle: "Les genoux qui bougent",
          exercice: "Mountain climbers",
          texte:
            "En planche sur les mains, on ramène les genoux vers la poitrine : le souffle monte en plus.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Abdominaux", "Muscles profonds du tronc", "Épaules"],
      placement:
        "Le gainage dynamique se place en fin de séance, avec les exercices d’abdos, ou dans un circuit au poids du corps, en séries de trente secondes.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "le gainage dynamique",
    },
  },
  {
    slug: "sit-ups",
    exercice: "Sit-ups",
    categorie: "abdos",
    title: "Sit-ups : technique et erreurs",
    description:
      "Comment faire les sit-ups : la position, l’enroulement du buste jusqu’à s’asseoir, la descente vertèbre par vertèbre et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au sit-up, on est allongé sur le dos, genoux pliés, et on enroule le buste jusqu’à s’asseoir, avant de redescendre en déroulant le dos : les abdominaux travaillent sur toute l’amplitude. Le mouvement va plus loin que le crunch, qui ne décolle que le haut du dos.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, genoux pliés, pieds à plat au sol. Les mains se posent derrière la tête sans la tirer, ou se croisent sur la poitrine.",
        },
        {
          titre: "Monter",
          texte:
            "Enroule le buste en décollant d’abord la tête, puis les épaules, puis le dos, jusqu’à être assis.",
        },
        {
          titre: "Redescendre",
          texte:
            "Déroule le dos vertèbre par vertèbre jusqu’au sol, sans te laisser tomber, puis enchaîne.",
        },
      ],
      erreurs: [
        {
          titre: "Tirer sur la nuque",
          pourquoi:
            "Des mains qui tirent la tête vers l’avant fatiguent la nuque sans aider le ventre. Elles soutiennent seulement la tête, ou restent croisées sur la poitrine.",
        },
        {
          titre: "Se lancer avec les bras",
          pourquoi:
            "Un élan des bras pour monter fait faire le travail à l’inertie. La montée vient de l’enroulement du buste.",
        },
        {
          titre: "Se laisser retomber",
          pourquoi:
            "Une descente lâchée fait perdre la moitié du travail et cogne le dos contre le sol. Elle se fait lentement, en déroulant.",
        },
      ],
      variantes: [
        {
          angle: "Seulement le haut du dos",
          exercice: "Crunch",
          texte:
            "On n’enroule que le haut du dos, sans s’asseoir : le mouvement est plus court, le grand droit de l’abdomen travaille.",
        },
        {
          angle: "Les jambes qui montent",
          exercice: "Relevés de jambes",
          texte:
            "Le buste reste au sol, ce sont les jambes tendues qui montent puis redescendent.",
        },
        {
          angle: "Jambes et buste ensemble",
          exercice: "V-ups",
          texte:
            "On monte les jambes et le buste en même temps pour toucher les pieds : tout l’avant du tronc travaille d’un coup.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les sit-ups se placent en fin de séance, avec les autres exercices d’abdos, ou dans un circuit au poids du corps. Un tapis rend la position plus confortable pour le dos.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des sit-ups",
    },
  },
  {
    slug: "hollow-hold",
    exercice: "Hollow hold",
    categorie: "abdos",
    title: "Hollow hold : la position et les erreurs",
    description:
      "Comment faire le hollow hold : allongé, épaules et jambes décollées, le bas du dos plaqué au sol, la respiration et les erreurs fréquentes. La position illustrée.",
    contenu: {
      definition:
        "Le hollow hold se tient allongé sur le dos, bras tendus au-dessus de la tête et jambes tendues : on décolle les épaules et les jambes de quelques centimètres en gardant le bas du dos plaqué au sol, et on tient. Tout l’avant du tronc travaille, sans bouger, pendant toute la tenue.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, bras tendus au-dessus de la tête, jambes tendues et serrées.",
        },
        {
          titre: "Décoller",
          texte:
            "Plaque le bas du dos contre le sol, puis décolle les épaules et les jambes de quelques centimètres. Les bras restent près des oreilles.",
        },
        {
          titre: "Tenir et respirer",
          texte:
            "Respire normalement pendant toute la tenue. Si le bas du dos décolle, monte les jambes un peu plus haut ou plie les genoux.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bas du dos se creuser",
          pourquoi:
            "Un bas du dos qui décolle du sol fait passer l’effort sur la colonne. Plus les jambes sont hautes, plus il est facile de le garder plaqué.",
        },
        {
          titre: "Relever la tête vers les pieds",
          pourquoi:
            "Une tête qui monte fatigue la nuque sans aider le ventre. Le regard reste vers le plafond, le menton à peine rentré.",
        },
        {
          titre: "Bloquer la respiration",
          pourquoi:
            "Retenir son souffle écourte la tenue. Une respiration lente aide à tenir plus longtemps.",
        },
      ],
      variantes: [
        {
          angle: "Face au sol",
          exercice: "Gainage",
          texte:
            "La planche sur les avant-bras : le tronc travaille aussi sans bouger, face au sol.",
        },
        {
          angle: "En bougeant bras et jambes",
          exercice: "Dead bug",
          texte:
            "Sur le dos, on éloigne un bras et la jambe opposée, puis on change : le ventre garde le bas du dos au sol pendant que les membres bougent.",
        },
        {
          angle: "Les jambes qui montent",
          exercice: "Relevés de jambes",
          texte:
            "On monte et on redescend les deux jambes tendues, le buste au sol.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Abdominaux", "Muscles profonds du tronc"],
      placement:
        "Le hollow hold se place en fin de séance, avec le gainage, ou en échauffement pour réveiller le tronc. Une série dure tant que le bas du dos reste plaqué.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Allongé, épaules et jambes décollées du sol, on tient : tout l’avant du tronc travaille, le bas du dos plaqué.",
      nomDansLeTitre: "le hollow hold",
    },
  },
  {
    slug: "step-up",
    exercice: "Step up banc",
    categorie: "jambes",
    title: "Step up sur un banc : technique et erreurs",
    description:
      "Comment faire le step up sur un banc : le pied posé en entier, la poussée dans le talon, la montée sans élan, la descente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au step up, on monte sur un banc ou une marche stable en poussant sur la jambe posée dessus, puis on redescend : chaque jambe travaille à son tour, les cuisses et les fessiers en tête. Le geste ressemble à la montée d’un escalier, avec une marche plus haute.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Face à un banc stable, à une hauteur où le genou arrive à peu près à angle droit quand le pied est posé dessus. Pose un pied en entier sur le banc.",
        },
        {
          titre: "Monter",
          texte:
            "Pousse dans le talon du pied posé sur le banc pour monter, sans t’aider de la jambe restée au sol, jusqu’à être debout sur le banc.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement le pied arrière au sol, puis remonte avec la même jambe, ou alterne les jambes.",
        },
      ],
      erreurs: [
        {
          titre: "Pousser avec la jambe du bas",
          pourquoi:
            "Un rebond sur la jambe restée au sol donne de l’élan et soulage la jambe qui travaille. La jambe du bas ne fait que suivre.",
        },
        {
          titre: "Poser seulement l’avant du pied",
          pourquoi:
            "Un talon dans le vide charge l’avant du genou et déséquilibre. Tout le pied se pose sur le banc.",
        },
        {
          titre: "Laisser le genou rentrer",
          pourquoi:
            "Un genou qui part vers l’intérieur pendant la montée perd l’alignement avec le pied. Il reste dans l’axe des orteils.",
        },
      ],
      variantes: [
        {
          angle: "Un grand pas au sol",
          exercice: "Fentes",
          texte:
            "On avance d’un grand pas et on descend le genou arrière vers le sol : chaque jambe travaille à son tour, sans banc.",
        },
        {
          angle: "Le pied arrière sur le banc",
          exercice: "Squat bulgare",
          texte:
            "Le pied arrière posé sur le banc, on descend sur la jambe avant : le travail se concentre sur une seule jambe.",
        },
        {
          angle: "En sautant",
          exercice: "Box jump",
          texte:
            "On saute à pieds joints sur une caisse stable, puis on redescend en marchant : les deux jambes travaillent de façon explosive.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le step up se place dans une séance de jambes, après le squat ou les fentes, ou dans un circuit au poids du corps. Des haltères dans les mains le rendent plus exigeant.",
      materiel: "Un banc ou une marche stable",
      materielCourt: "Banc",
      nomDansLeTitre: "un step up",
    },
  },
  {
    slug: "rowing-inverse",
    exercice: "Rowing inversé",
    categorie: "dos",
    title: "Rowing inversé : technique et erreurs",
    description:
      "Comment faire le rowing inversé : sous une barre basse, le corps gainé, la poitrine tirée vers la barre, la descente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au rowing inversé, on se suspend sous une barre basse, les talons au sol et le corps tendu, et on tire la poitrine vers la barre avant de redescendre : le dos et les biceps travaillent, avec le poids du corps. Plus le corps est proche de l’horizontale, plus le mouvement est exigeant.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Sous une barre bien fixée à hauteur de hanches, une barre de rack ou une barre guidée, saisis-la mains un peu plus écartées que les épaules. Avance les pieds jusqu’à avoir le corps tendu, talons au sol.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire la poitrine vers la barre en rapprochant les omoplates, coudes vers l’arrière, le corps gainé des épaules aux talons.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’aux bras tendus, sans laisser le bassin tomber.",
        },
      ],
      erreurs: [
        {
          titre: "Casser les hanches",
          pourquoi:
            "Un bassin qui descend raccourcit le mouvement et fait perdre le gainage. Le corps reste droit comme une planche.",
        },
        {
          titre: "Tendre le menton vers la barre",
          pourquoi:
            "Allonger le cou pour toucher la barre donne l’impression de monter plus haut, sans faire travailler le dos. C’est la poitrine qui vient à la barre.",
        },
        {
          titre: "Ne descendre qu’à moitié",
          pourquoi:
            "S’arrêter les coudes pliés réduit le travail. Redescends jusqu’aux bras tendus à chaque répétition.",
        },
      ],
      variantes: [
        {
          angle: "Suspendu, à la verticale",
          exercice: "Tractions",
          texte:
            "Pendu à une barre haute, on monte le menton au-dessus de la barre : tout le poids du corps passe dans les bras.",
        },
        {
          angle: "Un bras à la fois, aux haltères",
          exercice: "Rowing haltère",
          texte:
            "Une main et un genou sur un banc, on tire un haltère vers la hanche : chaque côté travaille seul, avec une charge qu’on choisit.",
        },
        {
          angle: "Assis, à la poulie",
          exercice: "Rowing assis poulie",
          texte:
            "Assis face à une poulie basse, on tire une poignée vers le ventre : le même tirage, avec une charge réglable.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le rowing inversé se place dans une séance de dos ou de haut du corps, souvent avant ou à la place des tractions quand elles sont encore difficiles.",
      materiel: "Une barre fixée à hauteur de hanches",
      materielCourt: "Barre basse",
      promesse: "Suspendu sous une barre basse, on tire la poitrine vers elle : le dos travaille avec le poids du corps.",
      nomDansLeTitre: "un rowing inversé",
    },
  },
  {
    slug: "box-jump",
    exercice: "Box jump",
    categorie: "jambes",
    title: "Box jump : technique et erreurs",
    description:
      "Comment faire le box jump : la hauteur de la caisse, l’élan des bras, la réception en squat sur la caisse, la descente en marchant et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au box jump, on saute à pieds joints sur une caisse stable, on se reçoit en squat sur le dessus, puis on se redresse et on redescend en marchant : les cuisses et les fessiers travaillent de façon explosive. Se recevoir en hauteur limite le choc de la réception.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Face à une caisse stable, à environ un pas, pieds écartés de la largeur des hanches. Choisis une hauteur où tu te reçois en douceur.",
        },
        {
          titre: "Sauter",
          texte:
            "Fléchis les jambes en lançant les bras vers l’arrière, puis saute en ramenant les bras devant toi, genoux qui montent vers la poitrine.",
        },
        {
          titre: "Se recevoir et redescendre",
          texte:
            "Pose les deux pieds en entier sur la caisse, genoux souples, redresse-toi, puis redescends en marchant, un pied après l’autre.",
        },
      ],
      erreurs: [
        {
          titre: "Choisir une caisse trop haute",
          pourquoi:
            "Une caisse trop haute oblige à se recevoir en squat très profond, ou fait rater la marche. La bonne hauteur est celle où la réception reste souple.",
        },
        {
          titre: "Redescendre en sautant",
          pourquoi:
            "Sauter en arrière depuis la caisse ajoute un choc à chaque répétition. On redescend en marchant.",
        },
        {
          titre: "Se recevoir au bord de la caisse",
          pourquoi:
            "Des pieds posés à moitié dans le vide peuvent glisser. Tout le pied se pose sur la caisse, loin du bord.",
        },
      ],
      variantes: [
        {
          angle: "Sur place, sans caisse",
          exercice: "Squats sautés",
          texte:
            "On saute à partir d’un squat et on se reçoit au sol : la même poussée, avec une réception plus forte.",
        },
        {
          angle: "Sans saut, une jambe à la fois",
          exercice: "Step up banc",
          texte:
            "On monte sur un banc en poussant sur une seule jambe : aucun impact, et chaque jambe travaille à son tour.",
        },
        {
          angle: "En fente",
          exercice: "Fentes sautées",
          texte:
            "On saute en fente et on change de jambe en l’air : chaque jambe travaille à son tour, avec de la coordination.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le box jump se place en début de séance, quand les jambes sont fraîches, en séries courtes avec du repos, ou dans un circuit de jambes.",
      materiel: "Une caisse de saut ou un support très stable",
      materielCourt: "Caisse",
      nomDansLeTitre: "un box jump",
    },
  },
  {
    slug: "fentes-sautees",
    exercice: "Fentes sautées",
    categorie: "jambes",
    title: "Fentes sautées : technique et erreurs",
    description:
      "Comment faire les fentes sautées : la position de fente, le changement de jambe en l’air, la réception amortie, le buste droit et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux fentes sautées, on part en fente, on saute et on change de jambe en l’air, pour se recevoir en fente sur l’autre jambe : les cuisses et les fessiers travaillent de façon explosive, avec de la coordination, et le souffle monte vite.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "En fente, la jambe avant pliée à angle droit, le genou arrière près du sol, le buste droit.",
        },
        {
          titre: "Sauter et changer",
          texte:
            "Pousse sur les deux jambes pour décoller, et inverse les jambes en l’air.",
        },
        {
          titre: "Se recevoir",
          texte:
            "Reçois-toi en fente sur l’autre jambe, genoux souples, en amortissant jusqu’à la position de départ, puis enchaîne.",
        },
      ],
      erreurs: [
        {
          titre: "Se recevoir jambes tendues",
          pourquoi:
            "Retomber genoux bloqués fait encaisser le choc aux articulations. Les genoux plient dès que les pieds touchent le sol.",
        },
        {
          titre: "Laisser le genou avant rentrer",
          pourquoi:
            "Un genou qui part vers l’intérieur à la réception perd l’alignement avec le pied. Il reste dans l’axe des orteils.",
        },
        {
          titre: "Pencher le buste en avant",
          pourquoi:
            "Un buste qui tombe vers l’avant déséquilibre la réception. Il reste droit, le regard devant toi.",
        },
      ],
      variantes: [
        {
          angle: "Sans saut",
          exercice: "Fentes",
          texte:
            "La fente au sol, sans décoller : aucun impact, et le geste se travaille plus lentement.",
        },
        {
          angle: "Pieds joints",
          exercice: "Squats sautés",
          texte:
            "On saute à partir d’un squat : les deux jambes poussent ensemble.",
        },
        {
          angle: "Le pied arrière sur un banc",
          exercice: "Squat bulgare",
          texte:
            "On descend sur la jambe avant, le pied arrière posé sur un banc : une jambe à la fois, sans saut.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les fentes sautées se placent dans un circuit cardio ou une séance de jambes au poids du corps, en séries courtes. Sur un sol dur ou en appartement, les fentes sans saut prennent le relais.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des fentes sautées",
    },
  },
  {
    slug: "tirage-menton-halteres",
    exercice: "Tirage menton haltères",
    categorie: "epaules",
    title: "Tirage menton aux haltères : technique et erreurs",
    description:
      "Comment faire le tirage menton aux haltères : les coudes qui montent en premier, la hauteur des épaules, la descente lente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au tirage menton aux haltères, on est debout et on tire deux haltères le long du buste, coudes qui montent en premier, jusqu’à ce que les coudes arrivent à hauteur des épaules : le côté des épaules et les trapèzes travaillent ensemble.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds écartés de la largeur des hanches, les haltères devant les cuisses, paumes tournées vers toi.",
        },
        {
          titre: "Tirer",
          texte:
            "Monte les haltères le long du buste en levant d’abord les coudes, jusqu’à ce qu’ils arrivent à hauteur des épaules, les haltères près du corps.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’aux bras tendus, sans laisser les haltères tomber.",
        },
      ],
      erreurs: [
        {
          titre: "Monter les coudes trop haut",
          pourquoi:
            "Au-delà de la hauteur des épaules, le mouvement serre l’avant de l’épaule. Les coudes s’arrêtent à cette hauteur.",
        },
        {
          titre: "Balancer le buste",
          pourquoi:
            "Un coup de reins lance les haltères et fait travailler le bas du dos. Le buste reste immobile : si tu dois te balancer, prends plus léger.",
        },
        {
          titre: "Monter les mains avant les coudes",
          pourquoi:
            "Des poignets qui mènent le mouvement font travailler les avant-bras. Ce sont les coudes qui montent en premier.",
        },
      ],
      variantes: [
        {
          angle: "Les bras sur les côtés",
          exercice: "Élévations latérales",
          texte:
            "Bras presque tendus, on monte les haltères sur les côtés jusqu’à l’horizontale : le côté de l’épaule travaille sans les trapèzes.",
        },
        {
          angle: "À la poulie, vers le visage",
          exercice: "Face pull poulie",
          texte:
            "On tire une corde vers le visage, coudes hauts : l’arrière des épaules et le haut du dos travaillent.",
        },
        {
          angle: "Au-dessus de la tête",
          exercice: "Développé militaire haltères",
          texte:
            "On pousse les haltères au-dessus de la tête : toute l’épaule travaille, avec les triceps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le tirage menton aux haltères se place en fin de séance d’épaules, après les développés, avec des charges modérées.",
      materiel: "Une paire d’haltères",
      materielCourt: "Haltères",
      precaution:
        "Si l’avant de l’épaule pince en haut du mouvement, arrête-toi plus bas, ou remplace l’exercice par des élévations latérales.",
      nomDansLeTitre: "un tirage menton aux haltères",
    },
  },
  {
    slug: "pullover-haltere",
    exercice: "Pullover haltère",
    categorie: "dos",
    title: "Pullover à l’haltère : technique et erreurs",
    description:
      "Comment faire le pullover à l’haltère : la prise à deux mains, la descente derrière la tête en arc de cercle, les coudes et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au pullover, on est allongé sur un banc, un haltère tenu à deux mains au-dessus de la poitrine, et on le descend derrière la tête, bras presque tendus, avant de le ramener : les grands dorsaux et les pectoraux travaillent ensemble, sur une grande amplitude.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur un banc plat, pieds au sol. Tiens l’haltère à deux mains, les paumes sous le disque du haut, bras tendus au-dessus de la poitrine.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends l’haltère derrière la tête en arc de cercle, coudes légèrement fléchis, aussi loin que l’épaule reste confortable.",
        },
        {
          titre: "Ramener",
          texte:
            "Ramène l’haltère au-dessus de la poitrine par le même arc, en gardant le même angle aux coudes.",
        },
      ],
      erreurs: [
        {
          titre: "Plier les coudes de plus en plus",
          pourquoi:
            "Des coudes qui se plient transforment le mouvement en extension des triceps. Ils gardent le même léger angle du début à la fin.",
        },
        {
          titre: "Descendre trop loin",
          pourquoi:
            "Chercher la plus grande amplitude étire fortement l’épaule. Arrête-toi là où elle reste confortable.",
        },
        {
          titre: "Cambrer le dos",
          pourquoi:
            "Un bas du dos qui décolle du banc à la descente fait passer l’effort sur la colonne. Garde le ventre serré et le dos posé.",
        },
      ],
      variantes: [
        {
          angle: "À la poulie haute",
          exercice: "Tirage poitrine",
          texte:
            "Assis, on tire une barre vers le haut de la poitrine : les grands dorsaux travaillent, avec une charge réglable.",
        },
        {
          angle: "En poussant les haltères",
          exercice: "Développé couché haltères",
          texte:
            "Sur le même banc, on pousse deux haltères vers le haut : les pectoraux travaillent avec les triceps.",
        },
        {
          angle: "Un bras, vers la hanche",
          exercice: "Rowing haltère",
          texte:
            "Une main et un genou sur un banc, on tire un haltère vers la hanche : le milieu du dos travaille davantage.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le pullover se place en fin de séance de dos ou de pectoraux, avec une charge modérée et des répétitions lentes.",
      materiel: "Un haltère et un banc plat",
      materielCourt: "Haltère et banc",
      precaution:
        "Commence avec un haltère léger et tiens-le fermement à deux mains : il passe au-dessus du visage pendant tout le mouvement.",
      promesse: "Allongé, on descend un haltère derrière la tête puis on le ramène au-dessus de la poitrine : le dos et les pectoraux travaillent ensemble.",
      nomDansLeTitre: "un pullover à l’haltère",
    },
  },
  {
    slug: "v-ups",
    exercice: "V-ups",
    categorie: "abdos",
    title: "V-ups : technique et erreurs",
    description:
      "Comment faire les V-ups : allongé, monter bras et jambes en même temps pour former un V, la descente contrôlée et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux V-ups, on part allongé sur le dos, bras tendus au-dessus de la tête, et on monte en même temps les jambes tendues et le buste pour aller toucher les pieds, le corps formant un V, avant de redescendre : tout l’avant du tronc travaille d’un coup. C’est un mouvement exigeant.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, bras tendus au-dessus de la tête, jambes tendues et serrées.",
        },
        {
          titre: "Monter en V",
          texte:
            "Monte en même temps les jambes et le buste, bras tendus vers les pieds, jusqu’à t’équilibrer sur les fesses. Plie les genoux si les jambes tendues sont trop difficiles.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement bras et jambes jusqu’à frôler le sol, puis enchaîne.",
        },
      ],
      erreurs: [
        {
          titre: "Se lancer avec les bras",
          pourquoi:
            "Un grand élan des bras fait monter le buste sans que le ventre travaille vraiment. Bras et jambes montent ensemble, de façon contrôlée.",
        },
        {
          titre: "Laisser le dos se creuser à la descente",
          pourquoi:
            "Des jambes qui retombent tendues creusent le bas du dos. Contrôle la descente, et plie les genoux si le dos décolle.",
        },
        {
          titre: "Arrondir les épaules vers l’avant",
          pourquoi:
            "Des épaules qui s’enroulent raccourcissent le mouvement sans travailler plus. Garde la poitrine ouverte en montant.",
        },
      ],
      variantes: [
        {
          angle: "Le buste seul",
          exercice: "Sit-ups",
          texte:
            "Genoux pliés, pieds au sol, on enroule le buste jusqu’à s’asseoir.",
        },
        {
          angle: "Les jambes seules",
          exercice: "Relevés de jambes",
          texte:
            "Le buste reste au sol, ce sont les jambes tendues qui montent puis redescendent.",
        },
        {
          angle: "En tenue",
          exercice: "Hollow hold",
          texte:
            "Épaules et jambes décollées du sol, on tient la position sans bouger.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Abdominaux", "Muscles profonds du tronc"],
      placement:
        "Les V-ups se placent en fin de séance, avec les autres exercices d’abdos, en séries courtes. Un tapis rend la position plus confortable.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des V-ups",
    },
  },
  {
    slug: "reverse-crunch",
    exercice: "Reverse crunch",
    categorie: "abdos",
    title: "Reverse crunch : technique et erreurs",
    description:
      "Comment faire le reverse crunch : allongé, genoux pliés, l’enroulement du bassin vers la poitrine, la descente lente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au reverse crunch, on est allongé sur le dos, genoux pliés au-dessus des hanches, et on enroule le bassin vers la poitrine en décollant légèrement les fesses du sol, avant de revenir : les abdominaux travaillent, et la tête reste posée, sans tirer sur la nuque.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, bras le long du corps, paumes au sol. Monte les jambes, genoux pliés à angle droit au-dessus des hanches.",
        },
        {
          titre: "Enrouler le bassin",
          texte:
            "Ramène les genoux vers la poitrine en enroulant le bassin, jusqu’à décoller légèrement les fesses du sol.",
        },
        {
          titre: "Revenir",
          texte:
            "Redescends lentement le bassin jusqu’au sol, les genoux revenant au-dessus des hanches, puis enchaîne.",
        },
      ],
      erreurs: [
        {
          titre: "Lancer les jambes",
          pourquoi:
            "Un élan des jambes soulève le bassin sans que le ventre travaille. Enroule lentement, comme si tu voulais amener le pubis vers le nombril.",
        },
        {
          titre: "Pousser sur les mains",
          pourquoi:
            "Des paumes qui poussent fort le sol aident le mouvement. Elles restent posées pour l’équilibre.",
        },
        {
          titre: "Laisser retomber le bassin",
          pourquoi:
            "Une descente lâchée fait perdre une bonne partie du travail. Le bassin redescend aussi lentement qu’il est monté.",
        },
      ],
      variantes: [
        {
          angle: "Le haut du dos qui s’enroule",
          exercice: "Crunch",
          texte:
            "On enroule le haut du dos vers les genoux, le bassin au sol : le mouvement inverse.",
        },
        {
          angle: "Les jambes tendues",
          exercice: "Relevés de jambes",
          texte:
            "On monte et on redescend les deux jambes tendues : le levier est plus grand.",
        },
        {
          angle: "En pédalant",
          exercice: "Bicycle crunch",
          texte:
            "On amène un coude vers le genou opposé pendant que l’autre jambe s’allonge : la rotation s’ajoute.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le reverse crunch se place en fin de séance, avec les autres exercices d’abdos. Il convient bien à qui sent sa nuque pendant les crunchs.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Allongé, on enroule le bassin vers la poitrine : le ventre travaille sans tirer sur la nuque.",
      nomDansLeTitre: "un reverse crunch",
    },
  },
  {
    slug: "donkey-kick",
    exercice: "Donkey kick",
    categorie: "jambes",
    title: "Donkey kick : technique et erreurs",
    description:
      "Comment faire le donkey kick : à quatre pattes, le talon qui monte vers le plafond, le dos qui reste droit, le rythme et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au donkey kick, on est à quatre pattes et on monte un talon vers le plafond, genou plié à angle droit, avant de le redescendre : le fessier de la jambe qui monte travaille, une jambe après l’autre. Le dos reste droit pendant tout le mouvement.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "À quatre pattes, mains sous les épaules, genoux sous les hanches, dos droit, regard vers le sol.",
        },
        {
          titre: "Monter le talon",
          texte:
            "Garde le genou plié à angle droit et monte le talon vers le plafond, jusqu’à ce que la cuisse arrive dans le prolongement du dos. Serre le fessier en haut.",
        },
        {
          titre: "Redescendre",
          texte:
            "Ramène le genou sous la hanche sans le poser, puis remonte. Fais toutes les répétitions d’une jambe, puis change.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer le bas du dos",
          pourquoi:
            "Monter la jambe trop haut fait creuser le bas du dos, et le fessier travaille moins. La cuisse s’arrête dans le prolongement du dos.",
        },
        {
          titre: "Laisser le bassin tourner",
          pourquoi:
            "Une hanche qui s’ouvre vers le côté donne de l’amplitude sans travail. Les deux hanches restent à la même hauteur.",
        },
        {
          titre: "Lancer la jambe",
          pourquoi:
            "Un coup de pied rapide laisse l’élan faire le mouvement. Monte et redescends de façon contrôlée.",
        },
      ],
      variantes: [
        {
          angle: "Debout, à la poulie",
          exercice: "Kickback fessier poulie",
          texte:
            "Debout face à une poulie basse, on pousse la jambe vers l’arrière contre une charge : le même travail, avec une charge réglable.",
        },
        {
          angle: "Sur le dos",
          exercice: "Pont fessier",
          texte:
            "Allongé sur le dos, on monte le bassin en poussant dans les talons : les deux fessiers travaillent ensemble.",
        },
        {
          angle: "Bras et jambe opposés",
          exercice: "Bird dog",
          texte:
            "À quatre pattes, on tend un bras et la jambe opposée : le tronc travaille pour rester stable.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le donkey kick se place en fin de séance de jambes ou de fessiers, ou en échauffement avant le squat et le soulevé de terre.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "À quatre pattes, on monte un talon vers le plafond : le fessier travaille, une jambe après l’autre.",
      nomDansLeTitre: "un donkey kick",
    },
  },
  {
    slug: "extensions-lombaires",
    exercice: "Extensions lombaires banc",
    categorie: "dos",
    title: "Extensions lombaires au banc : technique et erreurs",
    description:
      "Comment faire les extensions lombaires au banc : le réglage, la descente du buste, la remontée jusqu’à l’alignement et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux extensions lombaires, on se place sur un banc à lombaires incliné, les hanches calées sur le coussin et les chevilles sous les rouleaux, et on descend le buste vers le sol avant de remonter jusqu’à l’alignement des jambes : le bas du dos, les fessiers et l’arrière des cuisses travaillent.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler le banc",
          texte:
            "Règle le coussin pour que le haut des cuisses soit calé dessus et que les hanches restent libres de plier. Les chevilles se placent sous les rouleaux, mains croisées sur la poitrine.",
        },
        {
          titre: "Descendre",
          texte:
            "Penche le buste vers le sol en pliant les hanches, dos droit, aussi loin que le dos reste droit.",
        },
        {
          titre: "Remonter",
          texte:
            "Remonte en serrant les fessiers jusqu’à ce que le corps forme une ligne droite, sans partir en arrière.",
        },
      ],
      erreurs: [
        {
          titre: "Remonter trop haut",
          pourquoi:
            "Dépasser l’alignement pour se cambrer charge fortement le bas du dos. Arrête-toi quand le corps est droit.",
        },
        {
          titre: "Arrondir le dos en bas",
          pourquoi:
            "Un dos qui s’enroule au bas du mouvement fait travailler la colonne au lieu des hanches. Descends seulement tant que le dos reste droit.",
        },
        {
          titre: "Aller trop vite",
          pourquoi:
            "Un mouvement par à-coups laisse l’élan faire le travail. Descends et remonte de façon contrôlée.",
        },
      ],
      variantes: [
        {
          angle: "Au sol, sans banc",
          exercice: "Superman",
          texte:
            "Allongé sur le ventre, on décolle bras et jambes de quelques centimètres : le bas du dos travaille avec une plus petite amplitude.",
        },
        {
          angle: "Debout, avec une charge",
          exercice: "Soulevé de terre roumain",
          texte:
            "On descend la charge le long des jambes en poussant les fesses vers l’arrière : la même charnière de hanche, debout.",
        },
        {
          angle: "À quatre pattes",
          exercice: "Bird dog",
          texte:
            "On tend un bras et la jambe opposée : le dos travaille pour rester stable, sans charge.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Lombaires", "Fessiers", "Ischio-jambiers"],
      placement:
        "Les extensions lombaires se placent en fin de séance de dos ou de jambes, en séries de douze à quinze répétitions, au poids du corps pour commencer.",
      materiel: "Un banc à lombaires",
      materielCourt: "Banc à lombaires",
      nomDansLeTitre: "des extensions lombaires",
    },
  },
  {
    slug: "thruster-halteres",
    exercice: "Thruster haltères",
    categorie: "cardio",
    title: "Thruster aux haltères : technique et erreurs",
    description:
      "Comment faire le thruster aux haltères : le squat haltères aux épaules, la remontée qui enchaîne sur la poussée au-dessus de la tête et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Le thruster enchaîne un squat et une poussée au-dessus de la tête en un seul mouvement : les haltères aux épaules, on descend en squat, puis on remonte en poussant les haltères vers le haut grâce à l’élan des jambes. Tout le corps travaille, et le souffle monte vite.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds un peu plus écartés que les hanches, un haltère dans chaque main à hauteur d’épaules, coudes devant.",
        },
        {
          titre: "Descendre en squat",
          texte:
            "Descends en squat, cuisses vers l’horizontale, buste droit, les haltères restant aux épaules.",
        },
        {
          titre: "Remonter et pousser",
          texte:
            "Remonte avec force et, dans le même élan, pousse les haltères au-dessus de la tête jusqu’aux bras tendus. Redescends les haltères aux épaules en repartant dans le squat suivant.",
        },
      ],
      erreurs: [
        {
          titre: "Couper le mouvement en deux",
          pourquoi:
            "Un squat, un arrêt, puis une poussée font travailler les bras seuls sur la montée des haltères. L’élan des jambes doit passer dans la poussée.",
        },
        {
          titre: "Laisser les coudes tomber",
          pourquoi:
            "Des coudes qui pointent vers le sol en bas du squat font basculer le buste vers l’avant. Garde-les devant, sous les haltères.",
        },
        {
          titre: "Cambrer en haut",
          pourquoi:
            "Un bas du dos qui se creuse quand les bras sont tendus fait passer la charge sur la colonne. Serre le ventre et les fessiers en haut.",
        },
      ],
      variantes: [
        {
          angle: "Le squat seul",
          exercice: "Goblet squat",
          texte:
            "Un haltère tenu contre la poitrine, on descend en squat, sans poussée.",
        },
        {
          angle: "La poussée seule",
          exercice: "Développé militaire haltères",
          texte:
            "On pousse les haltères au-dessus de la tête, sans l’élan des jambes.",
        },
        {
          angle: "Sans matériel",
          exercice: "Burpees",
          texte:
            "Une descente au sol et un saut : tout le corps travaille aussi, au poids du corps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Jambes", "Épaules", "Fessiers"],
      placement:
        "Le thruster se place dans un circuit ou une séance de cardio aux haltères, en séries de dix à quinze, avec des charges modérées.",
      materiel: "Une paire d’haltères",
      materielCourt: "Haltères",
      precaution:
        "Commence léger : la fatigue arrive vite, et c’est la forme du squat qui se perd en premier. La série s’arrête quand le buste commence à basculer vers l’avant.",
      nomDansLeTitre: "un thruster aux haltères",
    },
  },
  {
    slug: "skaters",
    exercice: "Skaters",
    categorie: "cardio",
    title: "Skaters : le mouvement et les erreurs",
    description:
      "Comment faire les skaters : les sauts d’un pied sur l’autre en largeur, la réception amortie sur la jambe d’appui, le rythme et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux skaters, on saute d’un pied sur l’autre en largeur, comme un patineur, en se recevant à chaque fois sur une seule jambe : les fessiers et les cuisses travaillent, l’équilibre aussi, et le souffle monte.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout sur une jambe, l’autre croisée derrière, le buste légèrement penché vers l’avant, genou d’appui fléchi.",
        },
        {
          titre: "Sauter de côté",
          texte:
            "Pousse sur la jambe d’appui pour sauter latéralement vers l’autre côté, les bras qui balancent pour accompagner.",
        },
        {
          titre: "Se recevoir",
          texte:
            "Reçois-toi sur l’autre jambe, genou souple, l’autre jambe croisant derrière, puis repars de l’autre côté.",
        },
      ],
      erreurs: [
        {
          titre: "Se recevoir jambe tendue",
          pourquoi:
            "Une réception genou bloqué fait encaisser le choc à l’articulation. Le genou plie dès que le pied touche le sol.",
        },
        {
          titre: "Laisser le genou rentrer",
          pourquoi:
            "Un genou qui part vers l’intérieur à la réception perd l’alignement avec le pied. Il reste au-dessus du pied.",
        },
        {
          titre: "Sauter trop loin trop tôt",
          pourquoi:
            "Des sauts très larges au début rendent la réception instable. Commence par de petits sauts et allonge-les quand la réception est sûre.",
        },
      ],
      variantes: [
        {
          angle: "Sur place, sans saut latéral",
          exercice: "Jumping jacks",
          texte:
            "Un saut sur place qui écarte les pieds et monte les bras : les deux jambes travaillent ensemble.",
        },
        {
          angle: "En fente",
          exercice: "Fentes sautées",
          texte:
            "On saute en fente et on change de jambe en l’air : chaque jambe travaille à son tour, d’avant en arrière.",
        },
        {
          angle: "Genoux hauts",
          exercice: "Montées de genoux",
          texte:
            "On court sur place en montant les genoux : le souffle monte, avec des appuis légers.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les skaters se placent dans un circuit cardio ou un échauffement, en intervalles de trente à quarante secondes.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des skaters",
    },
  },
  {
    slug: "bear-crawl",
    exercice: "Bear crawl",
    categorie: "cardio",
    title: "Bear crawl : le mouvement et les erreurs",
    description:
      "Comment faire le bear crawl : à quatre pattes genoux décollés, avancer bras et jambe opposés, le dos plat et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au bear crawl, on se déplace à quatre pattes, les genoux décollés de quelques centimètres du sol, en avançant en même temps une main et le pied opposé : le tronc tient le dos plat, les épaules et les jambes travaillent, et le souffle monte.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "À quatre pattes, mains sous les épaules, genoux sous les hanches. Décolle les genoux de quelques centimètres, dos plat.",
        },
        {
          titre: "Avancer",
          texte:
            "Avance en même temps la main droite et le pied gauche d’un petit pas, puis la main gauche et le pied droit.",
        },
        {
          titre: "Garder la position",
          texte:
            "Les genoux restent près du sol et le dos reste plat pendant tout le déplacement, vers l’avant puis vers l’arrière.",
        },
      ],
      erreurs: [
        {
          titre: "Monter les fesses",
          pourquoi:
            "Un bassin qui monte rend la position plus facile et soulage le tronc. Les genoux restent à quelques centimètres du sol.",
        },
        {
          titre: "Faire de grands pas",
          pourquoi:
            "Des pas trop grands font balancer les hanches. Des petits pas gardent le dos plat.",
        },
        {
          titre: "Avancer main et pied du même côté",
          pourquoi:
            "Bouger le bras et la jambe du même côté déséquilibre le corps. Ce sont la main et le pied opposés qui avancent ensemble.",
        },
      ],
      variantes: [
        {
          angle: "Sur place, en planche",
          exercice: "Mountain climbers",
          texte:
            "Les mains au sol, on ramène les genoux vers la poitrine l’un après l’autre, sans avancer.",
        },
        {
          angle: "En tenue",
          exercice: "Gainage",
          texte:
            "La planche sur les avant-bras, tenue sans bouger : tout le travail est pour le tronc.",
        },
        {
          angle: "Bras et jambe opposés, sur place",
          exercice: "Bird dog",
          texte:
            "À quatre pattes, on tend un bras et la jambe opposée : le même croisé, lentement.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Muscles profonds du tronc", "Épaules", "Jambes"],
      placement:
        "Le bear crawl se place en échauffement ou dans un circuit cardio, en intervalles de vingt à trente secondes. Il demande quelques mètres de place.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "le bear crawl",
    },
  },
  {
    slug: "kickback-fessier-poulie",
    exercice: "Kickback fessier poulie",
    categorie: "jambes",
    title: "Kickback fessier à la poulie : technique et erreurs",
    description:
      "Comment faire le kickback fessier à la poulie : la sangle à la cheville, la jambe qui part vers l’arrière, le buste stable et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au kickback à la poulie, on est debout face à une poulie basse, une sangle attachée à la cheville, et on pousse la jambe vers l’arrière contre la charge avant de la ramener : le fessier de la jambe qui travaille fait l’essentiel de l’effort, avec une tension qui ne s’arrête pas.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Attache la sangle à la cheville, la poulie au plus bas. Face à la machine, tiens-toi au montant, le buste légèrement penché vers l’avant.",
        },
        {
          titre: "Pousser vers l’arrière",
          texte:
            "Pousse la jambe vers l’arrière, genou presque tendu, jusqu’à sentir le fessier se contracter, sans cambrer le dos.",
        },
        {
          titre: "Revenir",
          texte:
            "Ramène la jambe lentement sous la hanche, sans laisser la charge la tirer. Fais toutes les répétitions d’une jambe, puis change.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer le bas du dos",
          pourquoi:
            "Monter la jambe trop haut fait creuser le bas du dos, et le fessier travaille moins. La jambe s’arrête quand le dos commence à bouger.",
        },
        {
          titre: "Balancer la jambe",
          pourquoi:
            "Un coup de pied rapide laisse l’élan faire le travail. Pousse et ramène de façon contrôlée.",
        },
        {
          titre: "Tourner le bassin",
          pourquoi:
            "Une hanche qui s’ouvre vers le côté donne de l’amplitude sans travail. Les deux hanches restent face à la machine.",
        },
      ],
      variantes: [
        {
          angle: "À quatre pattes, sans machine",
          exercice: "Donkey kick",
          texte:
            "À quatre pattes, on monte un talon vers le plafond : le même travail du fessier, au poids du corps.",
        },
        {
          angle: "Le bassin qui pousse, à la machine",
          exercice: "Hip thrust machine",
          texte:
            "Le dos calé, on pousse le bassin vers le haut : les deux fessiers travaillent ensemble, avec une charge plus lourde.",
        },
        {
          angle: "Au sol, sur le dos",
          exercice: "Pont fessier",
          texte:
            "Allongé, on monte le bassin en poussant dans les talons, sans matériel.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le kickback à la poulie se place en fin de séance de jambes ou de fessiers, après le hip thrust ou le squat, avec une charge qui permet des répétitions lentes.",
      materiel: "Une poulie basse et une sangle de cheville",
      materielCourt: "Poulie",
      nomDansLeTitre: "un kickback fessier à la poulie",
    },
  },
  {
    slug: "mollets-assis",
    exercice: "Mollets assis",
    categorie: "jambes",
    title: "Mollets assis à la machine : technique et erreurs",
    description:
      "Comment faire les mollets assis à la machine : les coussins posés sur les genoux, la montée sur la pointe des pieds, l’amplitude complète et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux mollets assis, on est assis sur une machine, les coussins posés sur le haut des genoux et l’avant des pieds sur une marche, et on monte sur la pointe des pieds avant de redescendre talons bas : le mollet travaille genou plié, une position où son muscle profond, le soléaire, prend une plus grande part de l’effort.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assis sur la machine, pose l’avant des pieds sur la marche. Règle les coussins pour qu’ils appuient sur le haut des genoux, et tiens les poignées.",
        },
        {
          titre: "Monter",
          texte:
            "Monte sur la pointe des pieds le plus haut possible, en poussant les coussins vers le haut, et marque un temps en haut.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’à sentir l’étirement du mollet, talons bas, puis remonte sans rebondir.",
        },
      ],
      erreurs: [
        {
          titre: "Rebondir en bas",
          pourquoi:
            "Un rebond au fond du mouvement remplace le travail du muscle par de l’élan. Marque un court temps talons bas avant de remonter.",
        },
        {
          titre: "Faire des demi-mouvements",
          pourquoi:
            "Monter et descendre de quelques centimètres seulement fait perdre une bonne partie du travail. Va bien bas et bien haut à chaque répétition.",
        },
        {
          titre: "Laisser le pied rouler vers l’extérieur",
          pourquoi:
            "Un appui qui part sur le bord extérieur du pied fait travailler la cheville de travers. Pousse dans la base du gros orteil, le pied bien droit.",
        },
      ],
      variantes: [
        {
          angle: "Debout, jambes tendues",
          exercice: "Mollets",
          texte:
            "On monte sur la pointe des pieds debout : les jumeaux, la partie visible du mollet, travaillent davantage.",
        },
        {
          angle: "En sautant",
          exercice: "Corde à sauter",
          texte:
            "On saute à petits bonds sur l’avant des pieds : les mollets amortissent et relancent à chaque saut.",
        },
        {
          angle: "L’arrière des cuisses",
          exercice: "Leg curl assis",
          texte:
            "Sur une machine voisine, on ramène les talons sous le siège : ce sont les ischio-jambiers qui travaillent.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les mollets assis se placent en fin de séance de jambes, en séries de quinze à vingt répétitions, souvent en complément des mollets debout.",
      materiel: "Une machine à mollets assis",
      materielCourt: "Machine",
      promesse: "Assis, les genoux calés sous les coussins, on monte sur la pointe des pieds : le mollet travaille genou plié.",
      nomDansLeTitre: "les mollets assis",
    },
  },
  {
    slug: "leg-curl-allonge",
    exercice: "Leg curl allongé",
    categorie: "jambes",
    title: "Leg curl allongé : technique et erreurs",
    description:
      "Comment faire le leg curl allongé à la machine : la position sur le ventre, le rouleau à l’arrière des chevilles, les hanches qui restent posées et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au leg curl allongé, on est allongé sur le ventre sur une machine, le rouleau posé à l’arrière des chevilles, et on ramène les talons vers les fesses en pliant les genoux : l’arrière des cuisses, les ischio-jambiers, travaille. Les hanches restent collées au banc pendant tout le mouvement.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le ventre, les genoux juste au-delà du bord du banc, alignés avec l’axe de la machine. Le rouleau se pose à l’arrière des chevilles, et les mains tiennent les poignées à l’avant.",
        },
        {
          titre: "Plier les genoux",
          texte:
            "Ramène les talons vers les fesses en pliant les genoux, le plus loin possible, sans décoller les hanches du banc.",
        },
        {
          titre: "Revenir",
          texte:
            "Laisse les jambes se tendre lentement jusqu’aux genoux presque droits, sans que la charge les tire d’un coup.",
        },
      ],
      erreurs: [
        {
          titre: "Décoller les hanches",
          pourquoi:
            "Des hanches qui montent laissent le bas du dos aider le mouvement. Elles restent collées au banc : si elles décollent, la charge est trop lourde.",
        },
        {
          titre: "Mal placer les genoux",
          pourquoi:
            "Des genoux posés sur le banc, ou décalés par rapport à l’axe, font travailler l’articulation de travers. Ils dépassent juste du bord, alignés avec l’axe.",
        },
        {
          titre: "Laisser retomber la charge",
          pourquoi:
            "Un retour lâché fait perdre la moitié du travail. Les jambes se tendent lentement, au même rythme que la flexion.",
        },
      ],
      variantes: [
        {
          angle: "Assis",
          exercice: "Leg curl assis",
          texte:
            "Assis, on ramène les talons sous le siège : le même muscle travaille, la cuisse calée par un coussin.",
        },
        {
          angle: "Debout, avec une charge",
          exercice: "Soulevé de terre roumain",
          texte:
            "On descend la charge le long des jambes en poussant les fesses vers l’arrière : l’arrière des cuisses travaille en s’étirant, avec les fessiers.",
        },
        {
          angle: "Au sol, sans machine",
          exercice: "Pont fessier",
          texte:
            "Allongé sur le dos, on monte le bassin en poussant dans les talons : les fessiers et l’arrière des cuisses travaillent.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le leg curl allongé se place dans une séance de jambes, souvent après la presse ou le squat, avec une charge qui permet des répétitions lentes et contrôlées.",
      materiel: "Une machine à leg curl allongé",
      materielCourt: "Machine",
      promesse: "Allongé sur le ventre, on ramène les talons vers les fesses contre un rouleau : l’arrière des cuisses travaille.",
      nomDansLeTitre: "le leg curl allongé",
    },
  },
  {
    slug: "developpe-epaules-machine",
    exercice: "Développé épaules machine",
    categorie: "epaules",
    title: "Développé épaules à la machine : technique et erreurs",
    description:
      "Comment faire le développé épaules à la machine : le réglage du siège, les poignées à hauteur d’épaules, la poussée au-dessus de la tête et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au développé épaules à la machine, on est assis, le dos contre le dossier, et on pousse deux poignées depuis la hauteur des épaules jusqu’au-dessus de la tête : les épaules et les triceps travaillent. La machine guide la trajectoire, et le dossier soutient le dos.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler le siège",
          texte:
            "Règle la hauteur du siège pour que les poignées arrivent à hauteur des épaules. Assieds-toi le dos contre le dossier, les pieds à plat au sol.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse les poignées vers le haut jusqu’aux bras presque tendus, sans verrouiller les coudes.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’à ce que les poignées reviennent à hauteur des épaules, puis repousse.",
        },
      ],
      erreurs: [
        {
          titre: "Décoller le dos du dossier",
          pourquoi:
            "Un dos qui se cambre et quitte le dossier fait passer l’effort dans le bas du dos. Il reste plaqué, le ventre serré.",
        },
        {
          titre: "Verrouiller les coudes en haut",
          pourquoi:
            "Des coudes bloqués en haut font reposer la charge sur l’articulation, et les épaules se relâchent. Arrête-toi juste avant.",
        },
        {
          titre: "Mal régler le siège",
          pourquoi:
            "Des poignées trop hautes au départ raccourcissent le mouvement, trop basses elles font descendre l’épaule trop loin. Elles partent à hauteur d’épaules.",
        },
      ],
      variantes: [
        {
          angle: "Aux haltères",
          exercice: "Développé militaire haltères",
          texte:
            "On pousse deux haltères au-dessus de la tête : sans guide, chaque bras doit aussi se stabiliser.",
        },
        {
          angle: "En tournant les paumes",
          exercice: "Développé Arnold",
          texte:
            "Les haltères partent paumes vers soi et les paumes tournent vers l’avant pendant la poussée.",
        },
        {
          angle: "Sans matériel",
          exercice: "Pike push-ups",
          texte:
            "Les fesses hautes, on descend la tête vers le sol puis on repousse : une poussée vers le haut, au poids du corps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le développé épaules à la machine se place en début de séance d’épaules, ou après les développés de pectoraux, en séries de huit à douze répétitions.",
      materiel: "Une machine de développé épaules",
      materielCourt: "Machine",
      promesse: "Assis, le dos calé, on pousse deux poignées au-dessus de la tête : les épaules travaillent sur une trajectoire guidée.",
      nomDansLeTitre: "le développé épaules à la machine",
    },
  },
  {
    slug: "dips-machine",
    exercice: "Dips machine",
    categorie: "bras",
    title: "Dips assistés à la machine : technique et erreurs",
    description:
      "Comment faire les dips à la machine assistée : le réglage de l’assistance, les genoux sur le plateau, la descente coudes vers l’arrière et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Sur la machine de dips assistés, on se met à genoux sur un plateau relié à une charge, les mains sur deux barres parallèles, et on descend en pliant les coudes avant de remonter bras tendus : les triceps et le bas des pectoraux travaillent. La charge choisie porte une partie du poids du corps : plus elle est lourde, plus l’exercice est facile.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler l’assistance",
          texte:
            "Choisis la charge d’assistance : plus elle est lourde, plus la machine t’aide. Prends les poignées, puis pose les genoux sur le plateau, bras tendus, le buste droit.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes vers l’arrière, près du corps, jusqu’à ce qu’ils forment un angle droit.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse sur les poignées jusqu’aux bras tendus, puis redescends lentement.",
        },
      ],
      erreurs: [
        {
          titre: "Ouvrir les coudes sur les côtés",
          pourquoi:
            "Des coudes qui s’écartent font passer l’effort sur l’avant des épaules. Ils restent le long du corps, vers l’arrière.",
        },
        {
          titre: "Descendre trop bas",
          pourquoi:
            "Au-delà de l’angle droit, l’avant de l’épaule s’étire fortement. Arrête-toi quand les coudes forment un angle droit.",
        },
        {
          titre: "Hausser les épaules",
          pourquoi:
            "Des épaules qui remontent vers les oreilles en bas du mouvement pincent le haut des épaules. Garde-les basses, loin des oreilles.",
        },
      ],
      variantes: [
        {
          angle: "Sans assistance",
          exercice: "Dips barres parallèles",
          texte:
            "Le corps entier entre les barres, sans plateau : tout le poids du corps est à pousser.",
        },
        {
          angle: "À la maison",
          exercice: "Dips sur chaise",
          texte:
            "Les mains sur une chaise derrière soi, les pieds au sol : les jambes portent une partie du poids.",
        },
        {
          angle: "Les triceps seuls",
          exercice: "Extension triceps poulie",
          texte:
            "Debout face à une poulie haute, on pousse une corde ou une barre vers le bas : seuls les triceps travaillent.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les dips assistés se placent après les développés, dans une séance de pectoraux ou de bras. Pour progresser, on baisse l’assistance petit à petit, jusqu’aux dips aux barres sans machine.",
      materiel: "Une machine de dips assistés",
      materielCourt: "Machine",
      promesse: "À genoux sur le plateau, on descend et on remonte entre deux barres : la machine porte une partie du poids du corps.",
      nomDansLeTitre: "des dips assistés à la machine",
    },
  },
  {
    slug: "overhead-squat",
    exercice: "Overhead squat",
    categorie: "jambes",
    title: "Overhead squat : technique et erreurs",
    description:
      "Comment faire l’overhead squat : la prise large, la barre tenue bras tendus au-dessus de la tête, la descente en squat buste droit et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "À l’overhead squat, on tient une barre bras tendus au-dessus de la tête, les mains écartées bien plus large que les épaules, et on descend en squat avant de remonter : les cuisses et les fessiers poussent, pendant que les épaules et le tronc gardent la barre stable. Il demande de la mobilité aux épaules, aux hanches et aux chevilles.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds un peu plus écartés que les hanches. Tiens la barre bras tendus au-dessus de la tête, les mains écartées bien plus large que les épaules.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends en squat en gardant la barre à la verticale des pieds, le buste droit, jusqu’à ce que les cuisses arrivent vers l’horizontale.",
        },
        {
          titre: "Remonter",
          texte:
            "Remonte en poussant dans les pieds, bras toujours tendus, la barre immobile au-dessus de la tête.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser la barre partir vers l’avant",
          pourquoi:
            "Une barre qui passe devant les pieds déséquilibre tout le corps et charge les épaules. Elle reste à la verticale du milieu des pieds.",
        },
        {
          titre: "Plier les coudes",
          pourquoi:
            "Des coudes qui fléchissent font descendre la barre et la rendent instable. Les bras restent tendus, et les épaules poussent la barre vers le haut.",
        },
        {
          titre: "Pencher le buste en avant",
          pourquoi:
            "Un buste qui tombe vers l’avant fait partir la barre avec lui. Garde la poitrine haute, et descends moins bas si le buste bascule.",
        },
      ],
      variantes: [
        {
          angle: "La barre sur le haut du dos",
          exercice: "Squat barre",
          texte:
            "On peut charger plus lourd, et les épaules n’ont pas à tenir la barre au-dessus de la tête.",
        },
        {
          angle: "Un haltère contre la poitrine",
          exercice: "Goblet squat",
          texte:
            "Avec une charge tenue devant soi, le buste reste droit plus facilement.",
        },
        {
          angle: "Le squat puis la poussée",
          exercice: "Thruster haltères",
          texte:
            "Les haltères partent des épaules et montent au-dessus de la tête à chaque remontée.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Quadriceps", "Fessiers", "Épaules", "Muscles profonds du tronc"],
      placement:
        "L’overhead squat se place en début de séance, quand le corps est frais, en séries courtes de cinq à huit répétitions, avec une barre légère.",
      materiel: "Une barre et des disques",
      materielCourt: "Barre",
      precaution:
        "Commence avec la barre à vide, ou même un manche à balai : c’est la mobilité qui limite ce mouvement avant la force. Si la barre part vers l’avant, la charge ou la profondeur est trop grande.",
      promesse: "Barre tenue bras tendus au-dessus de la tête, on descend en squat : les jambes poussent pendant que les épaules et le tronc gardent la barre stable.",
      nomDansLeTitre: "l’overhead squat",
    },
  },
  {
    slug: "pompes-explosives",
    exercice: "Pompes explosives",
    categorie: "pectoraux",
    title: "Pompes explosives : technique et erreurs",
    description:
      "Comment faire les pompes explosives : la descente contrôlée, la poussée qui décolle les mains du sol, la réception bras souples et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux pompes explosives, on descend comme pour une pompe classique, puis on pousse assez fort pour que les mains décollent du sol, avant de se recevoir bras souples : les pectoraux et les triceps travaillent vite et fort. Elles demandent de bien maîtriser la pompe classique.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "En planche, bras tendus, mains un peu plus écartées que les épaules, le corps droit des épaules aux talons.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends de façon contrôlée jusqu’à ce que la poitrine frôle le sol, coudes vers l’arrière.",
        },
        {
          titre: "Pousser et se recevoir",
          texte:
            "Pousse fort pour décoller les mains du sol, puis reçois-toi bras légèrement fléchis et enchaîne sur la descente suivante.",
        },
      ],
      erreurs: [
        {
          titre: "Se recevoir bras tendus",
          pourquoi:
            "Des bras bloqués à la réception font encaisser le choc aux coudes et aux poignets. Ils plient dès que les mains touchent le sol.",
        },
        {
          titre: "Laisser le bassin tomber",
          pourquoi:
            "Un bassin qui s’affaisse pendant la poussée creuse le bas du dos. Le corps reste droit, le ventre serré, comme en planche.",
        },
        {
          titre: "Enchaîner trop de répétitions",
          pourquoi:
            "Avec la fatigue, les mains ne décollent plus et le mouvement redevient une pompe lente. Fais des séries courtes, avec du repos.",
        },
      ],
      variantes: [
        {
          angle: "Sans décoller",
          exercice: "Pompes",
          texte:
            "La pompe classique : la même position, à un rythme contrôlé.",
        },
        {
          angle: "Tout le corps",
          exercice: "Burpees",
          texte:
            "Une descente au sol puis un saut vers le haut : le souffle monte vite.",
        },
        {
          angle: "Pour les jambes",
          exercice: "Squats sautés",
          texte:
            "La même poussée rapide, à partir d’un squat : on décolle du sol à chaque répétition.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les pompes explosives se placent en début de séance, après l’échauffement, en séries courtes de cinq à huit répétitions avec du repos, quand les bras sont frais.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des pompes explosives",
    },
  },
  {
    slug: "sprint-sur-place",
    exercice: "Sprint sur place",
    categorie: "cardio",
    title: "Sprint sur place : le mouvement et les erreurs",
    description:
      "Comment faire le sprint sur place : la course sur place le plus vite possible, les bras qui accompagnent, les intervalles de vingt secondes et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au sprint sur place, on court sur place le plus vite possible pendant une vingtaine de secondes, sur l’avant des pieds, les bras pliés qui accompagnent, puis on récupère : le souffle monte très vite. On répète ce format court plusieurs fois.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds écartés de la largeur des hanches, bras pliés à angle droit, le buste droit.",
        },
        {
          titre: "Sprinter",
          texte:
            "Cours sur place le plus vite possible pendant vingt secondes, sur l’avant des pieds, en montant les genoux devant toi et en balançant les bras.",
        },
        {
          titre: "Récupérer",
          texte:
            "Arrête-toi et récupère, en marchant si besoin, avant le sprint suivant.",
        },
      ],
      erreurs: [
        {
          titre: "Garder un rythme de footing",
          pourquoi:
            "Un rythme qu’on pourrait tenir longtemps change l’exercice en échauffement. Les vingt secondes se font le plus vite possible.",
        },
        {
          titre: "Écourter la récupération",
          pourquoi:
            "Repartir essoufflé fait baisser la vitesse du sprint suivant. La récupération dure le temps qu’il faut pour sprinter aussi vite.",
        },
        {
          titre: "Courir sur les talons",
          pourquoi:
            "Des appuis sur les talons ralentissent la course et secouent le corps à chaque pas. Reste sur l’avant des pieds.",
        },
      ],
      variantes: [
        {
          angle: "Un rythme plus long",
          exercice: "Montées de genoux",
          texte:
            "On court sur place en montant les genoux devant soi, à un rythme qu’on tient plus longtemps.",
        },
        {
          angle: "Les mains au sol",
          exercice: "Mountain climbers",
          texte:
            "En planche, on ramène les genoux vers la poitrine l’un après l’autre, le plus vite possible.",
        },
        {
          angle: "En sautant",
          exercice: "Corde à sauter",
          texte:
            "On saute à petits bonds sur l’avant des pieds, sur des séries plus longues.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le sprint sur place se place dans un circuit cardio ou en fin de séance, en trois à six sprints de vingt secondes, avec assez de récupération pour sprinter aussi vite à chaque fois.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      promesse: "On court sur place le plus vite possible pendant vingt secondes, puis on récupère : le souffle monte très vite.",
      nomDansLeTitre: "le sprint sur place",
    },
  },
  {
    slug: "tapis-de-course",
    exercice: "Tapis de course",
    categorie: "cardio",
    title: "Tapis de course : allure, réglages et erreurs",
    description:
      "Comment courir sur un tapis de course : la vitesse qui monte petit à petit, l’allure où l’on peut encore parler, les bras libres et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Sur un tapis de course, on marche ou on court sur une bande qui défile, à une vitesse et une pente qu’on règle soi-même : le cœur et les jambes travaillent, pendant une durée choisie à l’avance. L’allure de base est celle où l’on peut encore parler par phrases courtes.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Démarrer",
          texte:
            "Pose les pieds sur les côtés du tapis, attache la clé de sécurité à ton vêtement s’il y en a une, puis démarre à une vitesse de marche.",
        },
        {
          titre: "Monter l’allure",
          texte:
            "Augmente la vitesse petit à petit pendant les premières minutes, jusqu’à une allure où tu peux encore parler par phrases courtes.",
        },
        {
          titre: "Tenir puis ralentir",
          texte:
            "Garde cette allure le temps prévu, au milieu de la bande, puis ralentis jusqu’à la marche avant d’arrêter le tapis.",
        },
      ],
      erreurs: [
        {
          titre: "Se tenir aux barres",
          pourquoi:
            "Courir les mains sur les barres change la posture et allège le travail des jambes. Les bras balancent librement, comme dehors.",
        },
        {
          titre: "Courir collé à l’avant",
          pourquoi:
            "Rester tout contre le tableau de bord raccourcit la foulée. Reste au milieu de la bande.",
        },
        {
          titre: "Partir trop vite",
          pourquoi:
            "Une vitesse élevée dès la première minute essouffle avant la fin. On démarre en marchant et on monte l’allure petit à petit.",
        },
      ],
      variantes: [
        {
          angle: "Assis, sans choc au sol",
          exercice: "Vélo",
          texte:
            "On pédale assis, contre une résistance réglable : les jambes travaillent sans impact.",
        },
        {
          angle: "Les bras en plus",
          exercice: "Rameur",
          texte:
            "Assis, on pousse avec les jambes et on tire une poignée : tout le corps travaille.",
        },
        {
          angle: "Court et rapide, sans machine",
          exercice: "Sprint sur place",
          texte:
            "On court sur place le plus vite possible pendant vingt secondes, puis on récupère.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le tapis de course se place en début de séance pour s’échauffer, quelques minutes en marchant, ou seul, pour une séance d’endurance de vingt à quarante minutes.",
      materiel: "Un tapis de course",
      materielCourt: "Tapis",
      promesse: "On court ou on marche sur une bande qui défile, à la vitesse choisie : le souffle travaille dans la durée.",
      nomDansLeTitre: "du tapis de course",
    },
  },
  {
    slug: "velo-appartement",
    exercice: "Vélo",
    categorie: "cardio",
    title: "Vélo d’appartement : réglages, allure et erreurs",
    description:
      "Comment faire du vélo d’appartement : la hauteur de la selle, la résistance, une cadence régulière et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Sur un vélo d’appartement, on pédale assis contre une résistance qu’on règle soi-même, à une cadence régulière : le cœur et les cuisses travaillent, sans aucun choc au sol. L’effort se dose avec la résistance et la durée.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler la selle",
          texte:
            "Règle la hauteur de la selle pour que la jambe reste légèrement fléchie quand la pédale est tout en bas. Les mains se posent sur le guidon, le dos droit.",
        },
        {
          titre: "Choisir la résistance",
          texte:
            "Commence avec une résistance faible pendant quelques minutes, puis augmente-la jusqu’à un rythme soutenu que tu tiens sans forcer.",
        },
        {
          titre: "Garder la cadence",
          texte:
            "Pédale à une cadence régulière le temps prévu, puis baisse la résistance pour finir en douceur.",
        },
      ],
      erreurs: [
        {
          titre: "Une selle trop basse",
          pourquoi:
            "Des genoux qui remontent haut à chaque tour chargent l’avant du genou. La jambe reste presque tendue en bas du coup de pédale.",
        },
        {
          titre: "Une résistance trop forte",
          pourquoi:
            "Pédaler lentement, en force, fait travailler surtout les cuisses et peu le souffle. Choisis une résistance qui laisse tourner les jambes régulièrement.",
        },
        {
          titre: "Balancer les hanches",
          pourquoi:
            "Des hanches qui roulent sur la selle à chaque tour signalent une selle trop haute. Baisse-la d’un cran : le bassin reste stable.",
        },
      ],
      variantes: [
        {
          angle: "Debout, en courant",
          exercice: "Tapis de course",
          texte:
            "On marche ou on court sur un tapis : les jambes portent le poids du corps à chaque pas.",
        },
        {
          angle: "Les bras en plus",
          exercice: "Rameur",
          texte:
            "Assis, on pousse avec les jambes et on tire une poignée : tout le corps travaille.",
        },
        {
          angle: "Sans machine",
          exercice: "Corde à sauter",
          texte:
            "On saute à petits bonds sur l’avant des pieds : le souffle monte vite.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le vélo d’appartement se place en échauffement, quelques minutes à faible résistance, ou seul, pour une séance d’endurance de vingt à quarante-cinq minutes.",
      materiel: "Un vélo d’appartement",
      materielCourt: "Vélo",
      promesse: "Assis, on pédale contre une résistance réglable : le cœur travaille, sans aucun choc au sol.",
      nomDansLeTitre: "du vélo d’appartement",
    },
  },
  {
    slug: "posture-du-pigeon",
    exercice: "Pigeon",
    categorie: "mobilite",
    title: "Posture du pigeon : la position et les erreurs",
    description:
      "Comment faire la posture du pigeon : la jambe avant pliée devant soi, la jambe arrière allongée, le buste droit, la respiration et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "À la posture du pigeon, on est au sol, une jambe pliée devant soi, le tibia en travers, et l’autre jambe allongée derrière, le buste droit et les mains posées de chaque côté : le fessier de la jambe avant et l’avant de la hanche de la jambe arrière s’étirent.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "À quatre pattes, avance un genou vers la main du même côté et pose le tibia en travers devant toi, le pied vers la hanche opposée.",
        },
        {
          titre: "Allonger la jambe arrière",
          texte:
            "Fais glisser l’autre jambe vers l’arrière, bien droite, et pose les mains au sol de chaque côté du bassin.",
        },
        {
          titre: "Tenir",
          texte:
            "Redresse le buste, garde les hanches de face et respire lentement le temps de la tenue, puis change de côté.",
        },
      ],
      erreurs: [
        {
          titre: "Forcer sur le genou avant",
          pourquoi:
            "Un genou qui tire ou fait mal signale une position trop poussée. Rapproche le pied de l’aine pour réduire l’angle du tibia.",
        },
        {
          titre: "Laisser le bassin basculer",
          pourquoi:
            "Un bassin qui tombe vers la jambe avant enlève l’étirement de la hanche arrière. Garde les deux hanches de face, quitte à glisser un coussin sous la fesse.",
        },
        {
          titre: "Bloquer la respiration",
          pourquoi:
            "Retenir son souffle crispe tout le corps. Respire lentement et laisse le corps se poser un peu plus à chaque expiration.",
        },
      ],
      variantes: [
        {
          angle: "Assis, les deux hanches à la fois",
          exercice: "Papillon hanches",
          texte:
            "Assis, plantes de pieds jointes, on laisse les genoux descendre vers le sol sans les pousser.",
        },
        {
          angle: "Debout, l’avant de la cuisse",
          exercice: "Étirement quadriceps",
          texte:
            "Debout sur une jambe, on ramène l’autre talon vers la fesse.",
        },
        {
          angle: "L’arrière des jambes",
          exercice: "Étirement chaîne postérieure",
          texte:
            "Assis, jambes tendues, on penche le buste vers les pieds.",
        },
      ],
      titreVariantes: "Variantes et étirements proches",
      placement:
        "La posture du pigeon se place en fin de séance, après les jambes ou la course, ou dans une routine de mobilité, en tenue de quarante-cinq secondes à une minute par côté.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Une jambe pliée devant, l’autre allongée derrière : le fessier et l’avant de la hanche s’étirent.",
      nomDansLeTitre: "la posture du pigeon",
    },
  },
  {
    slug: "cat-cow",
    exercice: "Cat-cow",
    categorie: "mobilite",
    title: "Cat-cow, ou chat-vache : le mouvement et les erreurs",
    description:
      "Comment faire le cat-cow, ou chat-vache : à quatre pattes, le dos qui se creuse puis s’arrondit au rythme de la respiration, et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au cat-cow, qu’on appelle aussi chat-vache, on est à quatre pattes et on alterne lentement deux positions : le dos creusé, le regard vers l’avant, puis le dos arrondi, la tête vers le sol. La colonne bouge sur toute sa longueur, au rythme de la respiration.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "À quatre pattes, mains sous les épaules, genoux sous les hanches, le dos à plat.",
        },
        {
          titre: "Creuser le dos",
          texte:
            "En inspirant, laisse le ventre descendre vers le sol et lève le regard vers l’avant.",
        },
        {
          titre: "Arrondir le dos",
          texte:
            "En expirant, pousse le dos vers le plafond en rentrant le menton, puis repars dans l’autre sens.",
        },
      ],
      erreurs: [
        {
          titre: "Aller trop vite",
          pourquoi:
            "Un enchaînement rapide transforme le mouvement en balancement. Chaque position suit une respiration complète.",
        },
        {
          titre: "Ne bouger que la tête",
          pourquoi:
            "Lever et baisser la tête sans bouger le dos laisse la colonne immobile. Le mouvement part du bassin et remonte jusqu’à la nuque.",
        },
        {
          titre: "Plier les coudes",
          pourquoi:
            "Des bras qui fléchissent font descendre les épaules. Les bras restent tendus, les mains bien à plat.",
        },
      ],
      variantes: [
        {
          angle: "À quatre pattes, en stabilité",
          exercice: "Bird dog",
          texte:
            "On tend un bras et la jambe opposée : le dos travaille pour rester immobile.",
        },
        {
          angle: "Assis, l’arrière des jambes",
          exercice: "Étirement chaîne postérieure",
          texte:
            "Jambes tendues, on penche le buste vers les pieds et on tient la position.",
        },
        {
          angle: "Les hanches",
          exercice: "Pigeon",
          texte:
            "Une jambe pliée devant, l’autre allongée derrière : le fessier et l’avant de la hanche s’étirent.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Dos", "Épaules"],
      placement:
        "Le cat-cow se place en échauffement, avant une séance de dos ou de jambes, ou au réveil, sur dix à quinze respirations.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "À quatre pattes, on creuse puis on arrondit le dos en respirant : la colonne bouge sur toute sa longueur.",
      nomDansLeTitre: "le cat-cow",
    },
  },
  {
    slug: "etirement-quadriceps",
    exercice: "Étirement quadriceps",
    categorie: "mobilite",
    title: "Étirement des quadriceps : la position et les erreurs",
    description:
      "Comment étirer les quadriceps debout : le talon ramené vers la fesse, les genoux côte à côte, le bassin rentré, l’équilibre et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Pour étirer les quadriceps, on se tient debout sur une jambe et on ramène l’autre talon vers la fesse en tenant la cheville : l’avant de la cuisse s’étire.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, prends appui sur un mur ou une chaise si besoin. Plie une jambe et attrape la cheville avec la main du même côté.",
        },
        {
          titre: "Ramener le talon",
          texte:
            "Ramène le talon vers la fesse, le genou plié pointé vers le sol, à côté de l’autre genou.",
        },
        {
          titre: "Tenir",
          texte:
            "Rentre légèrement le bassin pour sentir l’étirement à l’avant de la cuisse, tiens en respirant, puis change de jambe.",
        },
      ],
      erreurs: [
        {
          titre: "Écarter le genou",
          pourquoi:
            "Un genou qui part vers l’avant ou sur le côté réduit l’étirement. Il reste à côté de l’autre genou, pointé vers le sol.",
        },
        {
          titre: "Cambrer le dos",
          pourquoi:
            "Un bas du dos qui se creuse enlève l’étirement de l’avant de la cuisse. Rentre légèrement le bassin.",
        },
        {
          titre: "Tirer trop fort sur la cheville",
          pourquoi:
            "Forcer le talon contre la fesse charge le genou. On cherche une sensation d’étirement, jamais la douleur.",
        },
      ],
      variantes: [
        {
          angle: "Au sol, la hanche",
          exercice: "Pigeon",
          texte:
            "Une jambe pliée devant, l’autre allongée derrière : l’avant de la hanche s’étire aussi.",
        },
        {
          angle: "L’arrière des jambes",
          exercice: "Étirement chaîne postérieure",
          texte:
            "Assis, jambes tendues, on penche le buste vers les pieds.",
        },
        {
          angle: "L’intérieur des cuisses",
          exercice: "Papillon hanches",
          texte:
            "Assis, plantes de pieds jointes, on laisse les genoux descendre vers le sol.",
        },
      ],
      titreVariantes: "Variantes et étirements proches",
      placement:
        "L’étirement des quadriceps se place en fin de séance de jambes ou après une course, en tenue de trente secondes par jambe.",
      materiel: "Aucun, un mur ou une chaise pour l’équilibre si besoin",
      materielCourt: "Sans matériel",
      promesse: "Debout, le talon ramené vers la fesse : l’avant de la cuisse s’étire.",
      nomDansLeTitre: "un étirement des quadriceps",
    },
  },
  {
    slug: "etirement-chaine-posterieure",
    exercice: "Étirement chaîne postérieure",
    categorie: "mobilite",
    title: "Étirement de la chaîne postérieure : la position et les erreurs",
    description:
      "Comment étirer la chaîne postérieure, assis jambes tendues : le buste qui se penche vers les pieds, les ischio-jambiers qui s’étirent et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Pour étirer la chaîne postérieure, on s’assoit au sol, jambes tendues devant soi, et on penche le buste vers les pieds en allongeant les bras : l’arrière des jambes, les ischio-jambiers, et le bas du dos s’étirent.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "S’asseoir",
          texte:
            "Assis au sol, jambes tendues et serrées devant toi, sans bloquer les genoux, les pointes de pieds vers le plafond.",
        },
        {
          titre: "Se pencher",
          texte:
            "Penche le buste vers l’avant en partant des hanches, les bras allongés vers les pieds.",
        },
        {
          titre: "Tenir",
          texte:
            "Arrête-toi là où tu sens l’étirement, sans forcer, et respire lentement le temps de la tenue.",
        },
      ],
      erreurs: [
        {
          titre: "Enrouler le dos pour toucher les pieds",
          pourquoi:
            "Chercher à toucher les orteils à tout prix fait enrouler le dos au lieu d’étirer l’arrière des jambes. Penche-toi depuis les hanches, le dos allongé.",
        },
        {
          titre: "Bloquer les genoux",
          pourquoi:
            "Des genoux verrouillés tirent sur l’arrière de l’articulation. Garde les jambes tendues, les genoux souples.",
        },
        {
          titre: "Donner des à-coups",
          pourquoi:
            "Rebondir vers l’avant pour aller plus loin crispe les muscles. On descend doucement et on tient la position.",
        },
      ],
      variantes: [
        {
          angle: "Debout, l’avant de la cuisse",
          exercice: "Étirement quadriceps",
          texte:
            "Debout sur une jambe, on ramène l’autre talon vers la fesse.",
        },
        {
          angle: "L’intérieur des cuisses",
          exercice: "Papillon hanches",
          texte:
            "Assis, plantes de pieds jointes, on laisse les genoux descendre vers le sol.",
        },
        {
          angle: "En mouvement, le dos",
          exercice: "Cat-cow",
          texte:
            "À quatre pattes, on creuse puis on arrondit le dos en respirant.",
        },
      ],
      titreVariantes: "Variantes et étirements proches",
      placement:
        "L’étirement de la chaîne postérieure se place en fin de séance, après les jambes ou la course, en tenue de trente à quarante secondes.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Assis, jambes tendues, on penche le buste vers les pieds : l’arrière des jambes et le bas du dos s’étirent.",
      nomDansLeTitre: "un étirement de la chaîne postérieure",
    },
  },
];

/* ──────────────────────────── Accès ──────────────────────────────── */

/** Une fiche prête pour l'affichage : le contenu rédigé, garanti présent,
    et l'entrée de bibliothèque déjà résolue. Les pages ne manipulent que
    ça, elles ne refont jamais la jointure elles-mêmes. */
export type FicheResolue = FichePublique & {
  contenu: ContenuFiche;
  lib: LibExercise;
};

const PAR_SLUG = new Map(FICHES.map((f) => [f.slug, f]));

/** Les fiches réellement publiables, dans l'ordre du fichier. */
export function fichesPubliees(): FicheResolue[] {
  return FICHES.map(resoudre).filter((f): f is FicheResolue => f !== null);
}

/* `fichesAVenir()` a existé et a été SUPPRIMÉE : le hub s'en servait pour
   afficher les fiches non rédigées en « fiche en préparation ». Décision de
   Louis, et elle vaut pour toute la suite : le public ne voit jamais un
   chantier. Une fiche sans contenu reste dans la donnée, elle tient son slug
   et son title, mais rien ne l'expose. Ne pas la ressusciter pour « montrer
   ce qui arrive » : le jour où le pilote est complet, la question ne se pose
   plus, et d'ici là une case grise dit surtout que le produit n'est pas
   fini. */

export function ficheParSlug(slug: string): FicheResolue | null {
  const f = PAR_SLUG.get(slug);
  return f ? resoudre(f) : null;
}

/** Le slug public d'un exercice, s'il en a une fiche PUBLIÉE. Sert à
    transformer une variante en lien sans jamais produire de lien mort. */
export function slugDeLExercice(nom: string): string | null {
  const f = FICHES.find((x) => x.exercice === nom);
  return f && f.contenu ? f.slug : null;
}

function resoudre(f: FichePublique): FicheResolue | null {
  if (!f.contenu) return null;
  const lib = trouverExercice(f.exercice);
  if (!lib) return null;
  return { ...f, contenu: f.contenu, lib };
}

/* ──────────────────── Le filet : on vérifie, on ne suppose pas ───────
   Trois erreurs sont possibles en écrivant une fiche, et les trois sont
   silencieuses à l'exécution : un nom d'exercice mal orthographié, deux
   slugs identiques, un slug qui vole son mot à une catégorie. Elles
   produiraient une page à moitié vide ou une route qui en masque une
   autre. On les fait donc parler, au rendu serveur, à la construction. */

export function verifierFiches(): string[] {
  const soucis: string[] = [];
  const vus = new Set<string>();

  for (const f of FICHES) {
    if (vus.has(f.slug)) soucis.push(`slug en double : « ${f.slug} »`);
    vus.add(f.slug);

    if (SLUGS_RESERVES.includes(f.slug)) {
      soucis.push(`le slug « ${f.slug} » est réservé à une catégorie`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) {
      soucis.push(`slug mal formé : « ${f.slug} »`);
    }

    const lib = trouverExercice(f.exercice);
    if (!lib) {
      soucis.push(`« ${f.exercice} » n’existe pas dans la bibliothèque (fiche ${f.slug})`);
      continue;
    }
    if (!resolveGuide(lib.name)) {
      soucis.push(`« ${f.exercice} » n’a pas d’animation (fiche ${f.slug})`);
    }
    for (const v of f.contenu?.variantes ?? []) {
      if (!trouverExercice(v.exercice)) {
        soucis.push(`variante inconnue « ${v.exercice} » dans la fiche ${f.slug}`);
      }
    }
  }
  return soucis;
}

/** Les autres exercices de la même catégorie publique, pour la rangée de
    fin de fiche. La catégorie, pas la zone de la bibliothèque : le titre de
    la rangée dit « Les autres exercices jambes », et le pont fessier, rangé
    « fessiers » dans la bibliothèque, n’y aurait trouvé aucun voisin.

    On ne pioche QUE dans les fiches publiées. La première version allait
    chercher dans toute la bibliothèque, en se disant qu'un mouvement animé
    reste intéressant même sans fiche : c'était une erreur de jugement. Une
    rangée où trois vignettes sur quatre ne mènent nulle part se lit comme
    un catalogue en travaux, pas comme une profondeur de contenu.

    Conséquence assumée : tant qu'une zone n'a qu'une fiche, la rangée est
    vide et la page masque toute la section. Mieux vaut une fiche qui
    s'arrête net qu'une fiche qui promet une suite inexistante. */
export function voisinsPublies(fiche: FicheResolue, max = 4): FicheResolue[] {
  return fichesPubliees()
    .filter((f) => f.slug !== fiche.slug && f.categorie === fiche.categorie)
    .slice(0, max);
}
