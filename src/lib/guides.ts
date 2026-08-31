/* ════════════════════════════════════════════════════════════════════
   guides — tout ce que l'assistant DIT, écrit à un seul endroit.

   Jusqu'ici la voix de l'✦ vivait éparpillée : une phrase de repli dans
   `assistantTools`, six impasses dans `AssistantContext`, trois questions
   recopiées à quatre endroits, l'accueil de la feuille dans
   `AssistantSheet`, l'encouragement du repos dans `WorkoutGuideModal`.
   Tant qu'il n'y avait qu'une voix, ça tenait. À deux, chaque phrase
   oubliée serait une phrase qui trahit le Guide choisi.

   Ce module est donc la source unique. Il est PUR : aucune dépendance à
   React, à Supabase ni à quoi que ce soit de serveur. On lui passe le
   Guide, il rend une chaîne.

   ── ÉTAT ACTUEL ──
   Le parcours d'entrée (`bienvenue.*`), TOUTE la conversation
   (`action.*`, `question.*`, `impasse.*`, `accueil.*`, `memoire.*`,
   `attente.*`), la séance (`seance.*`), l'arrivée sur l'accueil
   (`retour.*`), les rappels du soir (`RAPPELS`), la visite guidée
   (`visite.*`), les écrans vides (`vide.*`), l'entrée de la nutrition
   (`nutrition.*`), la lecture de la semaine (`semaine.*`), la montée de
   rang (`rang.*`) et l'écran de sa mémoire (`memoire.*`) sont
   différenciés. Restent
   volontairement communes : les `panne.*`, parce qu'une personnalité posée
   sur un mécanisme cassé serait déplacée.

   ⚠️ LA VARIANTE NE CHANGE QUE LA FORMULATION. Nora et Sasha disent la
   même chose, demandent la même chose et proposent la même chose : ce
   qui bouge, c'est l'ordre des informations, la longueur et le rythme.
   Une variante qui ajoute, retire ou nuance une information que l'autre
   ne donnerait pas est un bug, pas une personnalité. Le test est simple :
   si les deux phrases n'amènent pas exactement à la même action, l'une
   des deux est fausse.

   ── Comment on écrit une variante ──
   Une réplique est un objet `{ commun, nora?, sasha? }`. Ajouter une
   variante = ajouter le champ, rien d'autre : aucun appelant ne bouge,
   aucune clé ne change. Une réplique sans variante reste commune pour
   toujours, et c'est un cas normal (une phrase neutre n'a pas à être
   dédoublée pour le principe).

   ── Ce qui n'est PAS ici, et pourquoi ──
   · Les libellés d'interface (boutons, en-têtes de cartes, titres) : ce
     sont des mots de l'app, pas d'une personne.
   · Les mots de l'utilisateur (suggestions de départ, réponses à
     toucher) : un Guide ne parle pas à notre place.
   · Les messages d'échec technique : ils décrivent un mécanisme cassé,
     et une personnalité par-dessus une panne serait déplacée.
   · Le prompt du modèle : il vit dans `/api/chat` et n'a pas bougé.
   ════════════════════════════════════════════════════════════════════ */

/** Les deux Guides. Le champ en base s'appellera `guide_id`. */
export type GuideId = "nora" | "sasha";

/** Le Guide dont on parle, ou `null` quand on ne le connaît pas encore :
 *  compte qui n'a pas fait son choix, hydratation en cours, lecture
 *  impossible. `null` n'est pas un défaut caché, c'est une absence, et
 *  elle rend le texte commun. */
export type GuideRef = GuideId | null;

/** Les valeurs qu'une réplique peut avoir besoin d'insérer. Toutes
 *  optionnelles : une réplique qui n'en lit aucune s'écrit en clair. */
export type ContexteVoix = {
  /** Le pseudo, déjà nettoyé par l'appelant. */
  pseudo?: string;
  /** Un jour lisible (« lundi 4 »), déjà formaté par l'appelant. */
  jour?: string;
  /** Le titre d'une séance, tel qu'il est écrit. */
  titre?: string;
  /** EXP qui manquent avant le rang suivant (`retour.palier`). */
  manque?: number;
  /** Le nom du rang visé (`retour.palier`). */
  rang?: string;
  /** Le nombre de jours de la série en cours (`retour.serie`). */
  serie?: number;
  /** Un nombre de séances. `rappel.veilleuse` : depuis toujours.
   *  `semaine.*` : posées sur la semaine qu'on regarde. */
  seances?: number;
  /** L'EXP du palier qu'on vient d'atteindre (`rang.montee`). */
  exp?: number;
  /** Maillons qui manquent à un relais (`rappel.relais_decisif`). */
  maillons?: number;
};

/** « Une séance posée », « Trois séances posées ». Le nombre s'écrit en
 *  lettres, parce qu'une semaine n'en porte jamais plus de sept et qu'un
 *  chiffre isolé au milieu d'une phrase se lit comme une statistique, pas
 *  comme quelqu'un qui parle. L'accord du singulier se fait ici, une
 *  fois, plutôt que dans chacune des six variantes. */
function seancesPosees(n = 0): string {
  const mots = ["Aucune", "Une", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept"];
  const mot = mots[n] ?? String(n);
  return n === 1 ? "Une séance posée" : `${mot} séances posées`;
}

type Rendu = string | ((c: ContexteVoix) => string);

/** Une phrase. `commun` est ce que tout le monde entend aujourd'hui ;
 *  `nora` et `sasha` la remplaceront, phrase par phrase, plus tard. */
type Replique = { commun: Rendu; nora?: Rendu; sasha?: Rendu };

/* ── Les répliques ──────────────────────────────────────────────────
   Nommage des clés : `<domaine>.<cas>`. Les domaines actuels :
     action.*   ce que dit le Guide quand une carte s'ouvre
     question.* les précisions qu'il demande (le CODE décide, pas le modèle)
     impasse.*  ce qu'il répond quand il ne peut pas agir
     accueil.*  la feuille de chat vide
     retour.*   ce qu'il dit en arrivant sur l'accueil de l'app
     memoire.*  ce qu'il dit de sa propre mémoire, et sur son écran
     attente.*  ce qu'il dit pendant qu'il travaille
     panne.*    quand la réponse ne vient pas
     seance.*   pendant l'entraînement
     visite.*   les chapitres de la visite guidée
     vide.*     ce qu'il dit quand un écran n'a rien à montrer
     nutrition.* la question d'entrée du pilier nutrition
     semaine.*  ce qu'il lit dans la semaine qu'on regarde
     rang.*     ce qu'il dit au moment où un rang se gagne
   ------------------------------------------------------------------ */
const REPLIQUES = {
  /* ── Les cartes ──
     Filet quand le texte du coach revient vide (flux coupé, refus,
     réponse muette). Chaque intent DOIT avoir sa phrase : une phrase
     vide laisserait une bulle sans contenu, exactement le symptôme
     qu'on chasse depuis toujours. La phrase est déduite de l'action,
     donc elle ne peut pas la contredire. */
  "action.create_seance": {
    commun: "Voici une proposition de séance, regarde juste en dessous 👇",
    nora:   "Je t’ai préparé une séance à partir de ce que tu m’as dit. Elle est juste en dessous 👇",
    sasha:  "Une séance pour toi, juste en dessous 👇",
  },
  "action.plan_set": {
    commun: "Ça marche, je te prépare ça. Valide juste en dessous 👇",
    nora:   "Je te prépare ça pour ce jour-là. Valide juste en dessous 👇",
    sasha:  "C’est prêt, valide juste en dessous 👇",
  },
  "action.plan_move": {
    commun: "Pas de souci, je te propose un nouveau jour. Valide en dessous 👇",
    nora:   "Je te propose un autre jour pour cette séance. Valide en dessous 👇",
    sasha:  "Nouveau jour proposé, valide en dessous 👇",
  },
  "action.plan_location": {
    commun: "C’est noté pour le lieu. Valide la séance juste en dessous 👇",
    nora:   "J’ai noté le lieu, la séance s’adapte. Valide-la juste en dessous 👇",
    sasha:  "Lieu noté, la séance s’adapte. Valide en dessous 👇",
  },
  "action.plan_library": {
    commun: "Je te la programme, valide juste en dessous 👇",
    nora:   "Je la reprends dans ta bibliothèque et je la pose sur ce jour. Valide en dessous 👇",
    sasha:  "Je la pose sur ce jour, valide en dessous 👇",
  },
  "action.plan_regen": {
    commun: "Ça marche, je te prépare une nouvelle semaine. Valide en dessous ✦",
    nora:   "Je reprends ta semaine à partir de ton rythme. Valide en dessous ✦",
    sasha:  "Nouvelle semaine prête, valide en dessous ✦",
  },
  "action.log_meal": {
    commun: "C’est noté, je te prépare l’ajout. Valide juste en dessous 👇",
    nora:   "Je te prépare l’ajout à ton journal. Valide juste en dessous 👇",
    sasha:  "Je te prépare l’ajout, valide juste en dessous 👇",
  },
  "action.create_recipe": {
    commun: "Je t’écris ça, regarde juste en dessous 👇",
    nora:   "Je t’écris la recette, elle est juste en dessous 👇",
    sasha:  "Recette écrite, juste en dessous 👇",
  },
  "action.open_page": {
    commun: "Je t’emmène ✦",
    nora:   "Je t’y emmène, c’est par là 🙂",
    sasha:  "On y va 👉",
  },
  "action.save_lieu": {
    commun: "C’est noté, je m’en souviens ✦",
    nora:   "C’est noté, je m’en souviens pour la suite 🙂",
    sasha:  "Noté, je m’en souviens 👍",
  },
  /* Repli du repli : quand le modèle pose une question sans la formuler. */
  "action.ask_choice": {
    commun: "J’ai besoin d’une précision ✦",
    nora:   "Il me manque une précision avant de continuer.",
    sasha:  "Une précision et j’y vais.",
  },
  "action.set_theme.sombre": {
    commun: "C’est passé en sombre ✦",
    nora:   "C’est fait, l’app passe en sombre 🙂",
    sasha:  "En sombre, c’est fait 👍",
  },
  "action.set_theme.clair": {
    commun: "Retour en clair ✦",
    nora:   "C’est fait, retour en clair 🙂",
    sasha:  "Retour en clair 👍",
  },
  "action.set_theme.auto": {
    commun: "Thème réglé sur automatique, il suivra ton téléphone ✦",
    nora:   "C’est réglé sur automatique : le thème suivra ton téléphone 🙂",
    sasha:  "Sur automatique, il suivra ton téléphone 👍",
  },
  "action.defaut": {
    commun: "C’est noté ✦",
    nora:   "C’est noté 🙂",
    sasha:  "Noté 👍",
  },

  /* ── Les questions posées par le CODE ──
     Ce n'est pas au modèle de savoir ce qui nous manque : il écrivait la
     question en texte au lieu d'appeler l'outil, donc sans réponses à
     toucher. Ici c'est déterministe, et la bulle du Guide EST la
     question. Les réponses proposées, elles, restent hors de sa voix
     (voir CHOIX_LIEU / CHOIX_EQUIP plus bas). */
  "question.lieu": {
    commun: "Avant de te préparer ça, tu t’entraînes où ?",
    nora:   "Avant de te préparer ça, j’ai besoin de savoir où tu t’entraînes.",
    sasha:  "Tu t’entraînes où ? J’adapte tout de suite.",
  },
  "question.lieu_semaine": {
    commun: "Tu t’entraînes où cette semaine ?",
    nora:   "Pour construire ta semaine, dis-moi où tu t’entraînes.",
    sasha:  "Tu t’entraînes où cette semaine ?",
  },
  "question.equip": {
    commun: "Tu as des haltères à la maison ?",
    nora:   "Une dernière chose : tu as des haltères à la maison ?",
    sasha:  "Des haltères à la maison ?",
  },

  /* ── Les impasses ──
     ⚠️ Règle verrouillée : aucune sortie muette. Un `return` nu, c'était
     une demande sans réponse et sans explication, impossible à
     diagnostiquer (« j'ai parlé, il ne s'est rien passé »). */
  "impasse.move_introuvable": {
    commun: "Je ne trouve pas de séance à déplacer cette semaine 🤔 Dis-moi le jour de départ, par ex. « déplace la séance de jeudi à vendredi ».",
    nora:   "Je ne trouve pas de séance à déplacer cette semaine 🤔 Dis-moi son jour de départ et je m’en occupe, par ex. « déplace la séance de jeudi à vendredi ».",
    sasha:  "Aucune séance à déplacer cette semaine 🤔 Donne-moi le jour de départ, par ex. « déplace la séance de jeudi à vendredi ».",
  },
  "impasse.move_sans_jour": {
    commun: "Vers quel jour veux-tu déplacer la séance ? (par ex. « demain », « dans 2 jours » ou « vendredi ») 📅",
    nora:   "Vers quel jour veux-tu la déplacer ? Un « demain », un « vendredi » ou un « dans 2 jours » me suffit 📅",
    sasha:  "Vers quel jour ? « demain », « vendredi », « dans 2 jours » 📅",
  },
  "impasse.move_deja_prevu": {
    commun: (c: ContexteVoix) => `La séance est déjà prévue le ${c.jour ?? ""} 🙂`,
    nora:   (c: ContexteVoix) => `La séance est déjà prévue le ${c.jour ?? ""}, il n’y a rien à changer 🙂`,
    sasha:  (c: ContexteVoix) => `Elle est déjà prévue le ${c.jour ?? ""} 🙂`,
  },
  "impasse.regen_semaine_finie": {
    commun: "Il ne reste plus de jour modifiable cette semaine 🙂 Décale plutôt une séance précise, ou redemande-moi lundi pour la semaine d’après.",
    nora:   "Il ne reste plus de jour modifiable cette semaine 🙂 On peut décaler une séance précise, ou reprendre la semaine entière lundi.",
    sasha:  "Plus de jour modifiable cette semaine 🙂 Décale une séance précise, ou redemande-moi lundi.",
  },
  "impasse.library_sans_jour": {
    commun: "Quel jour veux-tu programmer cette séance ? (par ex. « mardi » ou « demain ») 📅",
    nora:   "Quel jour veux-tu lui donner ? Un « mardi » ou un « demain » suffit 📅",
    sasha:  "Quel jour ? « mardi », « demain » 📅",
  },
  "impasse.library_sans_nom": {
    commun: "Quelle séance de ta bibliothèque veux-tu programmer ? Donne-moi son nom 🙂",
    nora:   "Laquelle de tes séances veux-tu programmer ? Donne-moi son nom et je la retrouve 🙂",
    sasha:  "Laquelle ? Donne-moi son nom 🙂",
  },
  "impasse.library_introuvable": {
    commun: (c: ContexteVoix) => `Je ne trouve pas de séance « ${c.titre ?? ""} » dans ta bibliothèque 🤔 Vérifie le nom, ou demande-moi de la créer.`,
    nora:   (c: ContexteVoix) => `Je ne trouve pas de séance « ${c.titre ?? ""} » dans ta bibliothèque 🤔 Vérifie le nom, ou demande-moi de la créer.`,
    sasha:  (c: ContexteVoix) => `Pas de « ${c.titre ?? ""} » dans ta bibliothèque 🤔 Vérifie le nom, ou dis-moi de la créer.`,
  },

  /* ── La feuille vide ──
     Première phrase de la conversation : c'est là que la différence
     Nora / Sasha s'entendra le plus tôt. */
  "accueil.salut": {
    commun: (c: ContexteVoix) => `Salut${c.pseudo ? `, ${c.pseudo}` : ""} ✦`,
    nora:   (c: ContexteVoix) => `Bonjour${c.pseudo ? ` ${c.pseudo}` : ""} 🙂`,
    sasha:  (c: ContexteVoix) => `Salut${c.pseudo ? ` ${c.pseudo}` : ""} 👋`,
  },
  "accueil.invite": {
    commun: "Demande-moi n’importe quoi, ou dis-moi où tu veux aller dans l’app.",
    nora:   "Pose-moi ta question, ou dis-moi simplement où tu veux aller dans l’app.",
    sasha:  "Demande-moi ce que tu veux, ou dis-moi où aller dans l’app.",
  },

  /* ════════════════════════════════════════════════════════════════
     L'ARRIVÉE SUR L'ACCUEIL

     ⚠️ CE N'EST PAS UN MESSAGE DE BIENVENUE, C'EST UNE RÉACTION À UN
     MOMENT. Le Guide ne dit rien parce qu'on a ouvert l'app, il dit
     quelque chose parce qu'il s'est passé quelque chose : une absence,
     un début, un rang à portée, une série qui tient. La décision de
     PARLER n'est pas ici, elle est dans `momentAccueil.ts`, et elle
     s'appuie sur `palierDe` (rappelsProfil), c'est-à-dire exactement la
     même lecture d'engagement que les notifications.

     ⚠️ ZÉRO CULPABILISATION, ET C'EST ICI QUE C'EST LE PLUS FACILE À
     TRAHIR. Aucune de ces phrases ne compte les jours manqués, ne parle
     de « rattraper », de « reprendre le rythme perdu » ni de ce qui
     « aurait pu ». On dit ce qui n'a pas bougé, jamais ce qui s'est
     arrêté. Même règle que `REPRISE` et `VEILLEUSE` dans
     `rappelsProfil.ts`, et pour la même raison : c'est précisément le
     moment où une phrase de reproche fait partir quelqu'un.

     ⚠️ AUCUN ACCORD DE GENRE. Ni « content », ni « prêt », ni « allé
     au bout » : ces phrases s'adressent à tout le monde. C'est aussi ce
     qui a fait retirer le « Content de te revoir. » d'origine de
     l'accueil, qui accordait au masculin quoi qu'il arrive. */

  /* Absence longue (le palier `endormi`, 14 jours et plus). Le ton est
     celui de la veilleuse : rien ne s'est perdu, rien n'est à rattraper,
     et surtout aucune promesse de nouveauté qu'on ne peut pas tenir. */
  "retour.absence.longue": {
    commun: "Te revoilà. Rien ne s’est perdu, et il n’y a rien à rattraper.",
    nora:   "Te revoilà. Rien ne s’est perdu de ton côté et il n’y a rien à rattraper. On repart d’où tu veux, même tout doucement.",
    sasha:  "Te revoilà. Rien à rattraper, rien à reprendre de zéro. On repart quand tu veux.",
  },

  /* Absence courte après une vraie pratique (le palier `decrochage`).
     Le fait qu'il y ait DÉJÀ eu des séances change la phrase : on peut
     s'appuyer dessus au lieu de tout réexpliquer. */
  "retour.absence.courte": {
    commun: "Te revoilà. Ta place n’a pas bougé.",
    nora:   "Te revoilà. Ta place n’a pas bougé, tes séances non plus. Dix minutes suffisent pour reprendre le fil.",
    sasha:  "Te revoilà. Ta place n’a pas bougé. Dix minutes suffisent pour reprendre ton rythme.",
  },

  /* Le palier `decouverte` : moins de deux séances au total. Le produit
     n'a pas encore été essayé pour de vrai, donc on nomme la porte
     d'entrée la plus basse qui existe, et rien d'autre. */
  "retour.debut": {
    commun: "On commence quand tu veux. La séance la plus courte fait quinze minutes, sans matériel.",
    nora:   "On commence quand tu le sens. La plus courte fait quinze minutes, sans matériel, et je t’explique au fur et à mesure.",
    sasha:  "On commence quand tu veux. Quinze minutes, sans matériel, et c’est parti.",
  },

  /* Un rang à portée d'une seule séance. Le chiffre vient du calcul de
     l'aura, jamais d'une estimation : la phrase « une séance et tu y
     es » doit être littéralement vraie (voir `EXP_UNE_SEANCE`). */
  "retour.palier": {
    commun: (c: ContexteVoix) => `Plus que ${c.manque ?? 0} EXP avant ${c.rang ?? ""}.`,
    nora:   (c: ContexteVoix) => `Plus que ${c.manque ?? 0} EXP avant ${c.rang ?? ""}. Une séance suffit à passer le cap.`,
    sasha:  (c: ContexteVoix) => `${c.rang ?? ""} est à ${c.manque ?? 0} EXP. Une séance et c’est fait.`,
  },

  /* Une série qui atteint un cap. Elle constate, elle ne met jamais en
     garde : « attention à ne pas la perdre » serait une menace, et une
     menace est une culpabilisation déguisée. */
  "retour.serie": {
    commun: (c: ContexteVoix) => `Jour ${c.serie ?? 0}. Ta série tient.`,
    nora:   (c: ContexteVoix) => `Jour ${c.serie ?? 0}. Ta série tient, et c’est le genre de chose qui se construit sans qu’on la voie.`,
    sasha:  (c: ContexteVoix) => `Jour ${c.serie ?? 0}. La série tient, on continue.`,
  },

  /* Le premier passage de la journée, quand rien de plus précis ne
     s'applique. Trois formulations tournées par le numéro du jour : une
     seule reviendrait tous les matins, et une phrase qu'on reconnaît
     avant de l'avoir lue ne se lit plus. */
  "retour.jour.a": {
    commun: "Te revoilà.",
    nora:   "Te revoilà. Je suis là si tu veux y voir clair sur ta journée.",
    sasha:  "Te revoilà. Dis-moi ce qu’on fait aujourd’hui.",
  },
  "retour.jour.b": {
    commun: "Je suis là quand tu veux.",
    nora:   "Je suis là quand tu veux, même juste pour une question.",
    sasha:  "Je suis là. Une question, une séance, ce que tu veux.",
  },
  "retour.jour.c": {
    commun: "On fait quoi aujourd’hui ?",
    nora:   "On regarde ta journée ensemble ?",
    sasha:  "On fait quoi aujourd’hui ?",
  },

  /* ── Sa mémoire ──
     Il parle de lui, donc c'est bien lui qui parle. */
  "memoire.oubliee": {
    commun: "C’est noté, j’oublie ça.",
    nora:   "C’est noté, je l’oublie.",
    sasha:  "C’est oublié.",
  },
  "memoire.retenue": {
    commun: "Je m’en souviendrai 🧠",
    nora:   "Je le garde en tête pour la suite 🧠",
    sasha:  "Je m’en souviens 🧠",
  },
  /* L'écran de sa mémoire. Le titre « Ce que je retiens de toi » reste un
     en-tête d'écran, donc il vit dans le composant : c'est le même
     arbitrage que « On mange où ? ». Ici il n'y a que ses deux vraies
     phrases, la promesse et l'invitation. */
  "memoire.ecran": {
    commun: "J’oublie tout de suite ce que tu retires. Rien de tout ça ne sort d’ici.",
    nora:   "J’oublie tout de suite ce que tu retires, et rien de tout ça ne sort d’ici.",
    sasha:  "Tu retires, j’oublie. Et rien ne sort d’ici.",
  },
  "memoire.vide": {
    commun: "Je n’ai encore rien retenu. Parle-moi normalement et dis-moi ce qui compte : une blessure, ce que tu ne manges pas, tes horaires. Je m’en servirai à chaque fois qu’on se parle.",
    nora:   "Je n’ai encore rien retenu de toi. Parle-moi normalement et dis-moi ce qui compte : une blessure, ce que tu ne manges pas, tes horaires. Je m’en servirai à chaque fois qu’on se parle.",
    sasha:  "Rien de retenu pour l’instant. Dis-moi ce qui compte : une blessure, ce que tu ne manges pas, tes horaires. Je m’en sers dès la prochaine fois.",
  },

  /* ── Ce qu'il dit pendant qu'il travaille ──
     La bulle d'attente disait « Je te prépare une séance… » codé en dur
     dans `AssistantSheet`, pour les TROIS actions qui font patienter :
     une séance, une recette, une estimation de repas. Elle annonçait donc
     une séance à quelqu'un qui venait de raconter son déjeuner. C'est
     l'attente qui nomme maintenant ce qu'elle attend, et le Guide qui le
     dit, comme tout le reste de sa parole. */
  "attente.seance": {
    commun: "Je te prépare une séance…",
    nora:   "Je te prépare une séance…",
    sasha:  "Séance en préparation…",
  },
  "attente.recette": {
    commun: "Je t’écris la recette…",
    nora:   "Je t’écris la recette…",
    sasha:  "Recette en cours…",
  },
  "attente.repas": {
    commun: "J’estime ce repas…",
    nora:   "J’estime ce que ça représente…",
    sasha:  "J’estime ce repas…",
  },

  /* ── Quand ça ne répond pas ──
     Ni texte ni action : ça ne doit JAMAIS passer inaperçu. Une version
     précédente supprimait la bulle vide, et l'échec devenait invisible.

     ⚠️ CES DEUX PHRASES RESTENT COMMUNES, exprès. Elles ne décrivent pas
     un choix du Guide mais un mécanisme cassé : une tournure enjouée
     par-dessus une panne se lirait comme de l'indifférence, et une
     tournure posée n'aiderait pas davantage. Le seul service à rendre
     ici, c'est de dire ce qui s'est passé et quoi faire ensuite. */
  "panne.sans_reponse": { commun: "Je n’ai pas réussi à répondre à ce message 😕 Réessaie, ou reformule-le autrement." },
  "panne.erreur":       { commun: "Désolé, une erreur est survenue. Réessaie ✨" },

  /* ── Le parcours d'entrée (/bienvenue) ──
     SIX prises de parole : une par section du questionnaire, plus la
     conclusion.

     ⚠️ Une par SECTION, jamais une par réponse. C'est la frontière, et
     elle est nette : le Guide ouvre l'étape, puis il se tait pendant
     qu'on répond. Un mot après chaque clic ferait de lui un
     commentateur, et le questionnaire durerait deux fois plus
     longtemps. Une version précédente n'en gardait que deux (ouverture
     et conclusion) : testée en vrai, elle rendait le Guide passif, on
     remplissait un formulaire avec son portrait dans un coin.

     ⚠️ Nora et Sasha posent EXACTEMENT les mêmes questions et demandent
     exactement les mêmes données. Seule la manière d'ouvrir l'étape
     change. Aucune de ces phrases ne doit ajouter, retirer ou nuancer
     une information que l'autre ne donnerait pas.

     `commun` n'est pas décoratif ici : il sert si l'on arrive sur ces
     écrans sans Guide résolu, ce qui ne devrait pas arriver mais ne doit
     pas laisser une page muette. */
  "bienvenue.section.corps": {
    commun: "Quelques repères sur toi, pour ajuster la suite.",
    nora:   "Je commence par quelques repères sur toi. Ils m’aideront à mieux ajuster la suite.",
    sasha:  "On commence par quelques repères sur toi, et on pourra déjà mieux ajuster la suite.",
  },
  "bienvenue.section.objectifs": {
    commun: "Ce que tu veux faire évoluer donnera la direction.",
    nora:   "Maintenant, dis-moi ce que tu veux faire évoluer. On pourra construire la suite autour de ça.",
    sasha:  "Maintenant, on fixe ce que tu veux faire évoluer. Ça nous donne une direction claire.",
  },
  "bienvenue.section.niveau": {
    commun: "Ton niveau et ton rythme, pour partir sur quelque chose qui te correspond.",
    nora:   "Je veux aussi situer ton niveau et le rythme qui te correspond vraiment.",
    sasha:  "On règle ton niveau et ton rythme pour partir sur quelque chose qui te correspond.",
  },
  "bienvenue.section.entrainement": {
    commun: "Où et avec quoi tu t’entraînes le plus souvent.",
    nora:   "Il me reste à comprendre où et avec quoi tu t’entraînes le plus souvent.",
    sasha:  "Dis-moi où et avec quoi tu t’entraînes le plus souvent, et on adapte autour.",
  },
  "bienvenue.section.nutrition": {
    commun: "Si tu utilises la nutrition, ces repères permettent de l’adapter.",
    nora:   "Si tu utilises aussi la partie nutrition, ces quelques repères permettront de mieux l’adapter.",
    sasha:  "Si tu veux utiliser la nutrition aussi, on règle rapidement tes repères ici.",
  },
  "bienvenue.fin": {
    commun: "C’est enregistré. Vaiiya est adapté à ce que tu as indiqué.",
    nora:   "C’est enregistré. J’ai de quoi adapter Vaiiya à ce que tu m’as indiqué.",
    sasha:  "C’est bon, on est prêts. On peut commencer.",
  },
  /* Compte déjà configuré : il n'a répondu qu'au choix du Guide, donc on
     ne peut pas lui dire qu'on vient d'enregistrer ses réponses. */
  "bienvenue.fin_retour": {
    commun: "C’est enregistré. Tu peux reprendre où tu en étais.",
    nora:   "C’est enregistré. Je reprends là où tu en étais.",
    sasha:  "C’est noté. On y va.",
  },
  /* Le rappel quand le questionnaire a été laissé en chemin. Il dit ce
     qui manque au Guide POUR TRAVAILLER, jamais ce que la personne a
     omis de faire : c'est une demande, pas un reproche, et elle
     n'annonce aucune durée (« deux minutes » se transforme en promesse
     dès que quelqu'un met trois minutes). */
  "bienvenue.rappel": {
    commun: "Il manque quelques réponses pour adapter Vaiiya à toi.",
    nora:   "Il me manque quelques réponses pour bien adapter Vaiiya à toi.",
    sasha:  "Il me manque deux ou trois réponses, et j’adapte tout autour de toi.",
  },

  /* ── Pendant la séance ──
     Ce sont les phrases que l'on voit le plus souvent de toute l'app : le
     repos revient quinze à vingt-cinq fois par séance. Une phrase unique
     répétée vingt fois cesse d'être lue au bout de trois, d'où quatre
     moments de repos plutôt qu'un.

     ⚠️ LE MOMENT SE DÉDUIT DU COMPTEUR, JAMAIS DU TEXTE. `WorkoutGuideModal`
     sait exactement où il en est (quel exercice, quelle série, combien il en
     reste) : c'est ce compteur qui choisit la clé. Rien ici ne se devine.

     ⚠️ Zéro culpabilisation, et aucun accord de genre : ces phrases
     s'adressent à tout le monde. Pas de « tu es prêt », pas de « tu es
     allé au bout ». */
  "seance.repos.debut": {
    commun: "Première pause. Respire, la suite arrive.",
    nora:   "Première pause. Respire lentement, elle compte autant que la série.",
    sasha:  "Première pause. Souffle un coup, on repart juste après.",
  },
  "seance.repos.serie": {
    commun: "Souffle, la prochaine série est la bonne.",
    nora:   "Relâche les épaules et respire. La prochaine série part sur de bonnes bases.",
    sasha:  "Souffle. Prochaine série, même intention.",
  },
  "seance.repos.exo": {
    commun: "On change d’exercice juste après, prends ce temps.",
    nora:   "On change d’exercice après cette pause. Prends vraiment ce temps-là.",
    sasha:  "Nouvel exercice après la pause. Récupère, on enchaîne.",
  },
  "seance.repos.fin": {
    commun: "Dernier exercice, garde le même rythme.",
    nora:   "C’est le dernier exercice. Garde la même qualité de mouvement jusqu’au bout.",
    sasha:  "Dernier exercice. Même rythme, on finit propre.",
  },
  /* Le tunnel est en pause : le Guide attend, et c'est le seul moment de la
     séance où il n'a rien à demander ni à expliquer. */
  "seance.pause": {
    commun: "En pause. Reprends quand tu veux.",
    nora:   "En pause. Reprends quand tu le sens, rien ne presse.",
    sasha:  "En pause. Tu reprends quand tu veux.",
  },
  /* La fin de séance. Le Guide félicite, il ne résume pas : les chiffres
     sont juste en dessous et ils ne lui appartiennent pas. */
  "seance.fin": {
    commun: "Séance bouclée. Rien lâché.",
    nora:   "Tu l’as menée jusqu’au bout, et ça se lit dans ces chiffres. Belle séance.",
    sasha:  "Séance bouclée, rien lâché. Ça, c’est fait.",
  },

  /* ── La visite guidée ──
     Le mot « guidée » était dans le nom depuis toujours, et pourtant les
     neuf chapitres parlaient d'une voix qui n'appartenait à personne :
     on venait de choisir Nora, elle posait cinq écrans de questions, puis
     un narrateur anonyme prenait la parole pour présenter le produit.

     ⚠️ LE FOND NE CHANGE PAS D'UN CHAPITRE À L'AUTRE, SEULE LA BOUCHE
     CHANGE. `commun` est le texte exact d'avant ce chantier : sans Guide
     résolu (choix pas fait, SQL pas collé, hors ligne), la visite est
     rigoureusement celle que Louis a validée.

     ⚠️ LA CLÉ EST DÉRIVÉE DE L'ID DU CHAPITRE (`visite.<id>`, cf.
     `chapitres.tsx`). Un chapitre sans phrase ne compile pas, et une
     phrase sans chapitre se voit tout de suite : c'est ce qui empêche la
     visite de repartir avec un texte en dur dans l'écran. */
  "visite.ouverture": {
    commun: "Une minute pour voir ce que Vaiiya sait faire. Tu peux passer, la visite t’attendra dans tes paramètres.",
    nora:   "Je te fais le tour en une minute, le temps de voir ce que Vaiiya sait faire. Si tu préfères plus tard, la visite t’attendra dans tes paramètres.",
    sasha:  "Une minute, je te montre ce que Vaiiya sait faire. Tu peux passer, ça reste dans tes paramètres.",
  },
  "visite.seance": {
    commun: "Le mouvement s’anime à l’écran, le compte à rebours part, le repos s’enchaîne. Tu n’as qu’à suivre. Cent-deux mouvements sont dessinés, pas un seul n’est une photo prise au hasard.",
    nora:   "Regarde bien : le mouvement s’anime, le compte à rebours part, le repos s’enchaîne tout seul. Tu n’as qu’à suivre, je m’occupe du reste. Cent-deux mouvements sont dessinés un par un.",
    sasha:  "Le mouvement s’anime, le compte à rebours part, le repos s’enchaîne. Tu suis, je gère le reste. Cent-deux mouvements dessinés un par un.",
  },
  "visite.catalogue": {
    commun: "Sans matériel, à la salle, mobilité, cardio, récupération. Vingt-six mini-cours pour comprendre ce que tu fais. Et si rien ne te va, tu pioches parmi les mouvements animés pour composer la tienne.",
    nora:   "Sans matériel, à la salle, mobilité, cardio, récupération, plus vingt-six mini-cours pour comprendre ce que tu fais. Et si rien ne te va, dis-le-moi : on compose la tienne à partir des mouvements animés.",
    sasha:  "Sans matériel, salle, mobilité, cardio, récupération. Vingt-six mini-cours en plus. Rien ne te va ? Dis-le-moi, on compose la tienne.",
  },
  "visite.assistant": {
    commun: "Demande-lui de poser une séance jeudi, de noter ton repas, de refaire ta semaine : elle le prépare dans la foulée. Rien ne s’enregistre tant que tu n’as pas touché la carte.",
    nora:   "C’est là qu’on se parle. Demande-moi de poser une séance jeudi, de noter ton repas, de refaire ta semaine : je le prépare dans la foulée. Rien ne s’enregistre tant que tu n’as pas touché la carte.",
    sasha:  "C’est là qu’on se parle. Une séance jeudi, un repas à noter, la semaine à refaire : je prépare, tu valides. Rien ne s’enregistre sans ton clic.",
  },
  "visite.nutrition": {
    commun: "Pas de tableau à remplir : on te demande simplement où tu manges. À la maison, au resto, ou un sandwich acheté en chemin. Une photo de ton assiette suffit à estimer le reste.",
    nora:   "Pas de tableau à remplir : je te demande simplement où tu manges. À la maison, au resto, ou un sandwich acheté en chemin. Une photo de ton assiette me suffit pour estimer le reste.",
    sasha:  "Pas de tableau à remplir. Je demande juste où tu manges : maison, resto, ou sandwich en chemin. Une photo de l’assiette, j’estime le reste.",
  },
  "visite.rang": {
    commun: "Une présence, une séance, un repas : tout se transforme en EXP et fait monter ta gemme. On mesure ta constance, jamais ton corps, et il n’y a aucun classement.",
    nora:   "Une présence, une séance, un repas : tout se transforme en EXP et fait monter ta gemme. Je compte ta constance, jamais ton corps, et il n’y a aucun classement.",
    sasha:  "Présence, séance, repas : tout devient de l’EXP et fait monter ta gemme. Je compte ta constance, jamais ton corps. Aucun classement.",
  },
  "visite.relais": {
    commun: "Invite quelqu’un, un maillon chacun son tour. À chaque séance l’image se dévoile un peu plus, jusqu’à être entière. Aucun score, et on ne nomme jamais celui qui a lâché.",
    nora:   "Invite quelqu’un, et vous prenez un maillon chacun votre tour. À chaque séance l’image se dévoile un peu plus, jusqu’à être entière. Aucun score, et on ne nomme jamais celui qui a lâché.",
    sasha:  "Invite quelqu’un, un maillon chacun son tour. Chaque séance dévoile un bout de l’image. Aucun score, et personne n’est montré du doigt.",
  },
  "visite.repere": {
    commun: "Ton accueil, tes entraînements, ta nutrition, tes discussions. Et l’étincelle au centre, disponible depuis n’importe quel écran.",
    nora:   "Ton accueil, tes entraînements, ta nutrition, tes discussions. Et l’étincelle au centre : c’est par là que tu me trouves, depuis n’importe quel écran.",
    sasha:  "Accueil, entraînements, nutrition, discussions. L’étincelle au centre : c’est par là que tu me trouves, depuis n’importe quel écran.",
  },
  "visite.final": {
    commun: "Commence par ce que tu veux. Si tu ne sais pas, touche l’étincelle et dis-lui simplement ce que tu as envie de faire aujourd’hui.",
    nora:   "Commence par ce que tu veux. Et si tu ne sais pas, touche l’étincelle et dis-moi simplement ce que tu as envie de faire aujourd’hui.",
    sasha:  "Commence par ce que tu veux. Si tu ne sais pas, touche l’étincelle et dis-moi ce que tu as envie de faire.",
  },

  /* ── Les états vides ──
     Un écran vide tombe précisément sur quelqu'un qui ne sait pas quoi
     faire, et il lui répondait par un texte gris dans un cadre en
     pointillés. C'est le seul endroit de l'app où la troisième condition
     du Guide (« rien ne le dit mieux ») est remplie par construction :
     il n'y a rien d'autre à lire.

     ⚠️ UNE PORTE, JAMAIS DEUX. La phrase propose une seule suite, et le
     bouton de l'écran ouvre exactement celle-là. Deux propositions, c'est
     de nouveau un choix à faire pour quelqu'un qui n'en avait déjà pas.

     ⚠️ AUCUN REPROCHE, AUCUN DÉCOMPTE. On ne dit pas ce qui n'a pas été
     fait, on dit ce qu'il y a à faire. « et c'est normal » fait beaucoup
     de travail dans ces phrases : il désamorce l'idée qu'un écran vide
     serait un manquement. */
  "vide.seances": {
    commun: "Rien ici pour l’instant, et c’est normal. Une séance courte suffit à ouvrir la liste.",
    nora:   "Rien ici pour l’instant, et c’est normal. Prends une séance courte, je te la déroule pas à pas.",
    sasha:  "Rien ici pour l’instant. Prends une séance courte, je te la déroule.",
  },
  "vide.amis": {
    commun: "Personne ici pour l’instant. Le relais se joue à deux : on invite quelqu’un, et chacun avance à son tour.",
    nora:   "Personne ici pour l’instant. Si tu veux quelqu’un à côté de toi, le relais se joue à deux : tu invites, et vous avancez chacun votre tour.",
    sasha:  "Personne ici pour l’instant. Le relais se joue à deux : tu invites, vous avancez chacun votre tour.",
  },
  /* Les affiches de perf. Elles se gagnent en TERMINANT une séance, pas en
     publiant quoi que ce soit : la porte est donc la séance, et il n'y en a
     qu'une. */
  "vide.affiches": {
    commun: "Une affiche se garde à la fin d’une séance. Termine-s’en une, et la première arrive ici.",
    nora:   "Une affiche se garde à la fin d’une séance. Va au bout d’une seule, même courte, et la première t’attend ici.",
    sasha:  "Une affiche se garde à la fin d’une séance. Va au bout d’une, la première arrive ici.",
  },

  /* ── La question d'entrée de la nutrition ──
     « On mange où ? » est la question la plus humaine du produit, et
     personne ne la posait. La phrase juste en dessous était déjà à la
     première personne (« Dis-moi où ») : c'était donc déjà de la parole,
     mais de la parole sans bouche. Elle passe ici, et le visage `listen`
     prend la place de la puce violette qui la précédait.

     ⚠️ LE TITRE « On mange où ? » NE BOUGE PAS et n'entre pas dans cette
     couche. C'est l'en-tête de l'écran, il est identique pour les deux
     Guides, et le déplacer ici laisserait croire qu'il peut varier. */
  "nutrition.question": {
    commun: "Dis-moi où, je m’occupe du reste.",
    nora:   "Dis-moi juste où tu manges, je m’occupe du reste.",
    sasha:  "Dis-moi où tu manges. Je m’occupe du reste.",
  },

  /* ── La lecture de la semaine ──
     « Ma semaine » affichait un verdict tout seul, « Équilibrée ✦ » ou
     « Ciblée » : une appréciation sur le travail de quelqu'un, signée
     d'une marque, et qui ne disait pas POURQUOI. Le Guide la dit en une
     phrase, et sa phrase explique le verdict au lieu de l'assener.

     ⚠️ LE CALCUL NE CHANGE PAS, ET LES PASTILLES NON PLUS. Le Guide lit
     ce que l'écran a déjà compté (les familles regroupées en zones), il
     ne juge rien de son côté. Une deuxième règle d'équilibre ailleurs
     serait une deuxième vérité sur la même semaine.

     ⚠️ « Ciblée » N'EST JAMAIS UN REPROCHE, et la phrase le dit en toutes
     lettres : quelqu'un qui prépare un objectif précis a une semaine
     ciblée, et c'est exactement ce qu'il veut. */
  "semaine.equilibree": {
    // « Équilibrée » demande trois zones distinctes, donc au moins trois
    // séances : le pluriel est vrai par construction.
    commun: (c) => `${seancesPosees(c.seances)}, et elles ne tapent pas au même endroit.`,
    nora:   (c) => `${seancesPosees(c.seances)}, et elles ne tapent pas au même endroit. C’est ce qui rend une semaine tenable.`,
    sasha:  (c) => `${seancesPosees(c.seances)}, et jamais deux fois la même zone. Ta semaine tient debout.`,
  },
  "semaine.ciblee": {
    commun: (c) => (c.seances === 1
      ? "Une seule séance posée, et elle donne déjà une direction. C’est un choix, pas un défaut."
      : `${seancesPosees(c.seances)}, et elles couvrent peu de zones différentes. C’est un choix, pas un défaut.`),
    nora:   (c) => (c.seances === 1
      ? "Une seule séance posée, et elle donne déjà une direction. Ciblée, ce n’est pas un défaut."
      : `${seancesPosees(c.seances)}, et elles couvrent peu de zones différentes. Si c’est voulu, garde-la comme ça.`),
    sasha:  (c) => (c.seances === 1
      ? "Une séance posée. Une direction claire, et ça suffit."
      : `${seancesPosees(c.seances)}, peu de zones différentes. Ciblée, c’est un choix.`),
  },
  "semaine.vide": {
    commun: "Rien de posé cette semaine, et c’est normal. Dis-le-moi, je te la remplis d’un coup.",
    nora:   "Rien de posé cette semaine, et c’est normal. Dis-le-moi et je te la remplis d’un coup.",
    sasha:  "Rien de posé cette semaine. Dis-le-moi, je te la remplis.",
  },

  /* ── Le seuil du relais ──
     Les règles du relais n'étaient écrites nulle part où l'on puisse
     revenir : la visite guidée les résume une fois, au tout premier
     jour, avant même d'avoir un ami. Ensuite « quatre jours sur sept »,
     « jamais deux jours de suite » et « dix minutes » n'apparaissaient
     qu'en creux, dans une phrase d'état, et seulement quand c'était
     ton tour.

     ⚠️ ICI ET NULLE PART AILLEURS. « Avec qui ? » est le seul endroit
     où quelqu'un est sur le point de s'engager et n'a encore rien
     lancé : c'est le moment où la question se pose. Un écran d'aide de
     plus serait un écran que personne n'ouvre.

     ⚠️ CETTE PHRASE REMPLACE « Le relais se joue à deux, une semaine. »
     Cette ligne disait déjà une règle, sans bouche et sans les deux
     autres. On remplace, on n'empile pas.

     Trois phrases, et les trois règles qui décident si un jour compte.
     Pas de quatrième : le reste s'apprend en jouant. */
  "relais.avecqui": {
    commun: "Le relais se joue à deux, sur une semaine. Il faut quatre jours validés sur sept, jamais deux de suite par la même personne, et une séance d’au moins dix minutes. À chaque maillon, l’affiche se dévoile un peu.",
    nora:   "Le relais se joue à deux, sur une semaine. Il vous faut quatre jours validés sur sept, jamais deux d’affilée par la même personne, et une séance d’au moins dix minutes pour que le jour compte. À chaque maillon franchi, l’affiche se dévoile un peu plus.",
    sasha:  "Le relais se joue à deux, sur une semaine. Quatre jours validés sur sept, jamais deux de suite par la même personne, dix minutes minimum pour qu’un jour compte. Chaque maillon dévoile un peu l’affiche.",
  },

  /* ── La montée de rang ──
     Il tend la récompense, il ne commente pas la scène : la gemme dit
     déjà le rang, la carte du dessous dit déjà ce qui est débloqué. Ce
     qui manquait, c'est quelqu'un pour te la donner.
     ⚠️ Le palier à zéro (Bronze, ou une célébration rejouée par un
     admin) a sa propre phrase : « 0 EXP » sous une gemme se lirait comme
     une erreur de calcul. */
  "rang.montee": {
    commun: (c) => (c.exp
      ? `Te voilà ${c.rang}. ${c.exp} EXP, posés une action après l’autre.`
      : `Te voilà ${c.rang}. C’est le début, et il compte déjà.`),
    nora:   (c) => (c.exp
      ? `Te voilà ${c.rang}. ${c.exp} EXP, posés une action après l’autre. Tu as tenu, et ça se voit.`
      : `Te voilà ${c.rang}. C’est le début, et il compte déjà.`),
    sasha:  (c) => (c.exp
      ? `${c.rang}. ${c.exp} EXP, une action après l’autre. Tu l’as pris.`
      : `${c.rang}. C’est le début, et il compte.`),
  },
} satisfies Record<string, Replique>;

/** Toutes les clés existantes. Une faute de frappe ne compile pas. */
export type CleVoix = keyof typeof REPLIQUES;

/** La phrase du Guide pour cette clé. Tant qu'une réplique n'a pas de
 *  variante, le Guide passé ne change rien : c'est l'état de la phase 0. */
export function voix(guide: GuideRef, cle: CleVoix, ctx: ContexteVoix = {}): string {
  const r: Replique = REPLIQUES[cle];
  const rendu = (guide === "nora" ? r.nora : guide === "sasha" ? r.sasha : undefined) ?? r.commun;
  return typeof rendu === "function" ? rendu(ctx) : rendu;
}

/* Intent d'un outil → clé de réplique. Ajouter une capacité à l'✦, c'est
   donc aussi ajouter sa phrase ici (sinon elle tombe sur `action.defaut`,
   qui est correct mais muet sur ce qui vient de se passer). */
const CLE_PAR_INTENT: Record<string, CleVoix> = {
  create_seance: "action.create_seance",
  plan_set:      "action.plan_set",
  plan_move:     "action.plan_move",
  plan_location: "action.plan_location",
  plan_library:  "action.plan_library",
  plan_regen:    "action.plan_regen",
  log_meal:      "action.log_meal",
  create_recipe: "action.create_recipe",
  open_page:     "action.open_page",
  save_lieu:     "action.save_lieu",
};

/** Ce que dit le Guide quand une carte s'ouvre sans qu'il ait écrit un mot.
 *
 *  Depuis que la décision d'action est sortie du prompt du coach (voir
 *  `assistantRouter`), celui-ci parle normalement sur les tours d'action :
 *  cette fonction n'est plus le chemin ordinaire, mais le filet. Elle sert
 *  quand le texte revient vide (flux coupé, refus, réponse muette). */
export function voixAction(
  guide: GuideRef,
  action: { intent: string; theme?: string; question?: string },
): string {
  /* La question EST la bulle : c'est le seul cas dont le texte vient du
     modèle, puisque c'est lui qui formule ce qu'il ne sait pas. */
  if (action.intent === "ask_choice") {
    return (action.question ?? "").trim() || voix(guide, "action.ask_choice");
  }
  if (action.intent === "set_theme") {
    const t = (action.theme ?? "").toLowerCase();
    return voix(guide, t.startsWith("somb") ? "action.set_theme.sombre"
      : t.startsWith("clair") ? "action.set_theme.clair"
      : "action.set_theme.auto");
  }
  return voix(guide, CLE_PAR_INTENT[action.intent] ?? "action.defaut");
}

/* ── LES RAPPELS DU SOIR ────────────────────────────────────────────
   Une notification est le Guide qui parle, donc ses mots vivent ici,
   comme tous les autres. Ils en étaient absents jusqu'au 2026-08-29 :
   `rappelsProfil.ts` portait ses phrases lui-même, et c'était le dernier
   endroit du produit où Nora et Sasha disaient exactement la même chose.

   Un push n'a pas la forme d'une réplique ordinaire : il lui faut un
   titre ET un corps, et plusieurs formulations par cas, tournées pour ne
   pas se répéter. D'où une table à part, avec sa propre fonction de
   lecture. La règle, elle, ne change pas : `rappelsProfil.ts` décide QUI
   reçoit quoi et à quelle cadence, ce fichier décide des MOTS. Aucun des
   deux ne fait le travail de l'autre.

   ⚠️ LES TROIS LISTES D'UNE MÊME CLÉ ONT LE MÊME NOMBRE DE FORMULATIONS,
   DANS LE MÊME ORDRE, ET CHAQUE RANG DIT LA MÊME CHOSE. Deux raisons.
   La première est la règle générale : Nora et Sasha ne se distinguent que
   par la formulation. La seconde est mécanique : le journal des envois
   garde un INDEX de variante (`notification_rappels.variante`), qui sert
   à ne jamais renvoyer la formulation précédente. Un index qui ne
   désigne pas le même message d'un Guide à l'autre ferait tourner cette
   garantie à vide le jour où quelqu'un change de Guide.

   ⚠️ CE QUI RESTE HORS DE CETTE TABLE : les notifications qui ne viennent
   pas du Guide. Le message d'un ami et le maillon franchi par un
   équipier (`/api/notifications/message`, `/api/notifications/relais`)
   racontent ce que QUELQU'UN D'AUTRE a fait. Les faire parler avec la
   voix de Nora ou de Sasha, ce serait lui faire endosser les mots d'un
   tiers.

   ⚠️ L'ICÔNE DU PUSH RESTE CELLE DE VAIIYA, jamais le portrait du Guide.
   Dans le volet de notifications d'un téléphone, l'icône sert à
   reconnaître l'APPLICATION parmi vingt autres : y mettre un visage
   rendrait Vaiiya méconnaissable là où elle doit l'être le plus. C'est la
   règle générale, ✦ tient le chrome, le Guide tient l'accompagnement.

   ⚠️ AUCUN ACCORD DE GENRE, comme partout ailleurs dans ce fichier. Un
   push arrive sur un écran verrouillé, sans contexte et sans recours :
   c'est le pire endroit pour se tromper de personne. « Tu es reparti » a
   tenu une heure dans la veilleuse de Sasha, « c'est reparti » dit la
   même chose et s'adresse à tout le monde. */

/** Un rappel du soir : ce que la notification affiche. */
export type PhrasePush = { title: string; body: string };

type RenduPush = PhrasePush | ((c: ContexteVoix) => PhrasePush);

/** Les formulations d'un même cas, dans l'ordre. Voir l'avertissement
 *  ci-dessus : les trois listes se répondent rang par rang. */
type RepliquePush = { commun: RenduPush[]; nora?: RenduPush[]; sasha?: RenduPush[] };

const RAPPELS = {
  /* Personne n'a encore vraiment essayé le produit. On montre ce qu'il y
     a à voir, on ne réclame rien. */
  "rappel.premier_pas": {
    commun: [
      (c) => ({
        title: c.pseudo ? `Ta première séance, ${c.pseudo}` : "Ta première séance",
        body: "Quinze minutes, sans matériel. Tout est déjà prêt.",
      }),
      { title: "102 mouvements animés t’attendent",
        body: "Un coup d’oeil suffit pour voir à quoi ressemble une séance." },
      { title: "On commence par quoi ?",
        body: "Choisis une séance, je m’occupe du reste." },
    ],
    nora: [
      (c) => ({
        title: c.pseudo ? `Ta première séance, ${c.pseudo}` : "Ta première séance",
        body: "Quinze minutes, sans matériel. Je t’explique chaque geste.",
      }),
      { title: "102 mouvements animés t’attendent",
        body: "Tu peux voir comment ils se font avant de te lancer." },
      { title: "On commence par quoi ?",
        body: "Choisis une séance, je m’occupe du déroulé." },
    ],
    sasha: [
      (c) => ({
        title: c.pseudo ? `On commence, ${c.pseudo} ?` : "On commence ?",
        body: "Quinze minutes, sans matériel. Tout est prêt.",
      }),
      { title: "102 mouvements animés t’attendent",
        body: "Ouvre, regarde, choisis." },
      { title: "On commence par quoi ?",
        body: "Tu choisis, je gère le reste." },
    ],
  },

  /* Le rang suivant est à une séance. Le chiffre est vrai, il vient de
     `prochainRang` : on ne le dit jamais à quelqu'un pour qui il serait
     hors de portée aujourd'hui. */
  "rappel.rang_proche": {
    commun: [
      (c) => ({ title: `Plus que ${c.manque} EXP avant ${c.rang}`, body: "Une séance et tu y es." }),
      (c) => ({ title: `${c.rang} est à ${c.manque} EXP`, body: "Ça se joue aujourd’hui si tu veux." }),
    ],
    nora: [
      (c) => ({ title: `Plus que ${c.manque} EXP avant ${c.rang}`,
                body: "Une séance suffit pour passer le cap." }),
      (c) => ({ title: `${c.rang} est à ${c.manque} EXP`,
                body: "Le moment est bon, si tu as un créneau." }),
    ],
    sasha: [
      (c) => ({ title: `${c.manque} EXP et tu passes ${c.rang}`, body: "Une séance, et c’est fait." }),
      (c) => ({ title: `${c.rang} est à ${c.manque} EXP`, body: "Aujourd’hui, si tu veux." }),
    ],
  },

  /* On connaît le nom de sa séance du jour. C'est la différence entre un
     rappel qui vient de l'app et un rappel qui vient de SA semaine. */
  "rappel.planning": {
    commun: [
      (c) => ({ title: `${c.titre}, c’est aujourd’hui`, body: "Elle t’attend, prête à lancer." }),
      (c) => ({ title: `Au programme : ${c.titre}`, body: "Quand tu veux, tout est en place." }),
      (c) => ({ title: `${c.titre}`, body: "C’est ce que tu avais prévu pour aujourd’hui." }),
      (c) => ({ title: `Il te reste ${c.titre}`, body: "Le temps d’une séance et ta journée est complète." }),
    ],
    nora: [
      (c) => ({ title: `${c.titre}, c’est aujourd’hui`, body: "Tout est en place, tu n’as qu’à lancer." }),
      (c) => ({ title: `Au programme : ${c.titre}`, body: "Quand tu veux, je la déroule avec toi." }),
      (c) => ({ title: `${c.titre}`, body: "C’est ce que tu avais prévu pour aujourd’hui." }),
      (c) => ({ title: `Il te reste ${c.titre}`, body: "Une séance, et ta journée est complète." }),
    ],
    sasha: [
      (c) => ({ title: `${c.titre}, c’est aujourd’hui`, body: "Prête à lancer." }),
      (c) => ({ title: `Au programme : ${c.titre}`, body: "Dis quand, on y va." }),
      (c) => ({ title: `${c.titre}`, body: "Tu l’avais prévue aujourd’hui." }),
      (c) => ({ title: `Il te reste ${c.titre}`, body: "Une séance, et ta journée est complète." }),
    ],
  },

  /* ⚠️ La série se tient avec une ACTION UTILE, séance ou repas, depuis
     la refonte de l'économie du 2026-08-21. Le texte disait « une séance
     aujourd'hui » : ce n'était pas faux, mais c'était plus étroit que la
     règle, et un rappel qui décrit mal la règle apprend la mauvaise. */
  "rappel.serie": {
    commun: [
      (c) => ({ title: `Jour ${c.serie}`,
                body: "Ta série tient. Une séance ou un repas noté, et elle continue." }),
      (c) => ({ title: `${c.serie} jours d’affilée`, body: "Tu sais déjà quoi faire." }),
    ],
    nora: [
      (c) => ({ title: `Jour ${c.serie}`,
                body: "Ta série tient. Une séance ou un repas noté suffit pour la garder." }),
      (c) => ({ title: `${c.serie} jours d’affilée`, body: "Tu connais le geste, il n’y a qu’à le refaire." }),
    ],
    sasha: [
      (c) => ({ title: `Jour ${c.serie}`,
                body: "Elle tient. Une séance ou un repas noté, et ça continue." }),
      (c) => ({ title: `${c.serie} jours d’affilée`, body: "Tu sais quoi faire." }),
    ],
  },

  /* Le repli : on n'a rien de précis à dire. Il reste court, parce qu'une
     phrase passe-partout qui s'étale se remarque deux fois plus. */
  "rappel.generique": {
    commun: [
      { title: "Ta séance t’attend", body: "Elle est prête dans Vaiiya." },
      { title: "Un créneau aujourd’hui ?", body: "Quinze minutes suffisent pour que ça compte." },
    ],
    nora: [
      { title: "Ta séance t’attend", body: "Elle est prête, il n’y a plus qu’à ouvrir." },
      { title: "Un créneau aujourd’hui ?", body: "Quinze minutes suffisent pour que ça compte." },
    ],
    sasha: [
      { title: "Ta séance t’attend", body: "Elle est prête." },
      { title: "Un créneau aujourd’hui ?", body: "Quinze minutes, ça compte déjà." },
    ],
  },

  /* La reprise. Aucun reproche, aucune allusion à l'absence, aucun
     décompte de jours manqués : c'est ici que la zéro culpabilisation est
     la plus facile à trahir, et les trois voix la tiennent pareil. */
  "rappel.reprise": {
    commun: [
      (c) => ({
        title: c.pseudo ? `Ta place est gardée, ${c.pseudo}` : "Ta place est gardée",
        body: "Dix minutes suffisent pour reprendre. Rien n’a bougé.",
      }),
      { title: "On reprend quand tu veux", body: "Ta séance la plus courte fait quinze minutes." },
    ],
    nora: [
      (c) => ({
        title: c.pseudo ? `Ta place est gardée, ${c.pseudo}` : "Ta place est gardée",
        body: "Rien n’a bougé. Dix minutes suffisent pour reprendre.",
      }),
      { title: "On reprend quand tu veux", body: "La plus courte fait quinze minutes." },
    ],
    sasha: [
      (c) => ({
        title: c.pseudo ? `Ta place est gardée, ${c.pseudo}` : "Ta place est gardée",
        body: "Rien n’a bougé. Dix minutes et tu es dedans.",
      }),
      { title: "On reprend quand tu veux", body: "La plus courte fait quinze minutes." },
    ],
  },

  /* La veilleuse : une fois par mois, pour quelqu'un qui n'est plus là.
     Elle n'invite pas à « revenir » (ce qui sous-entendrait un départ à
     justifier) et ne promet aucune nouveauté (on ne peut pas savoir ici
     si quelque chose a changé depuis son dernier passage). */
  "rappel.veilleuse": {
    commun: [
      (c) => ((c.seances ?? 0) >= 3
        ? { title: `Tes ${c.seances} séances sont toujours là`,
            body: "Reprendre est plus simple que commencer. Quand tu veux." }
        : { title: "Ta place ne bouge pas",
            body: "Quinze minutes suffisent pour t’y remettre. Quand tu veux." }),
      { title: "Vaiiya t’attend sans compter",
        body: "Aucun rattrapage, aucune série à récupérer. On reprend quand ça te dit." },
      { title: "Rien ne presse", body: "La séance la plus courte fait quinze minutes, sans matériel." },
    ],
    nora: [
      (c) => ((c.seances ?? 0) >= 3
        ? { title: `Tes ${c.seances} séances sont toujours là`,
            body: "Rien ne s’est perdu. Reprendre est plus simple que commencer." }
        : { title: "Ta place ne bouge pas",
            body: "Quinze minutes suffisent pour t’y remettre, quand tu veux." }),
      { title: "Vaiiya t’attend sans compter",
        body: "Aucun rattrapage, aucune série à récupérer. On reprend quand ça te dit." },
      { title: "Rien ne presse", body: "La plus courte fait quinze minutes, et elle se fait sans matériel." },
    ],
    sasha: [
      (c) => ((c.seances ?? 0) >= 3
        ? { title: `Tes ${c.seances} séances sont toujours là`,
            body: "Reprendre est plus simple que commencer. Quand tu veux." }
        : { title: "Ta place ne bouge pas", body: "Quinze minutes, et c’est reparti. Quand tu veux." }),
      { title: "Vaiiya t’attend sans compter",
        body: "Rien à rattraper, aucune série à récupérer. Quand ça te dit." },
      { title: "Rien ne presse", body: "La plus courte fait quinze minutes, sans matériel." },
    ],
  },

  /* Le seul rappel qui ne parle pas d'entraînement. Il ne part qu'à
     quelqu'un qui note ses repas d'habitude : sinon c'est une leçon de
     tenue de journal, pas un rappel. */
  /* Le jour décisif d'un relais : il reste exactement autant de jours que
     de maillons manquants. Rater celui-là, c'est l'affiche qui ne pourra
     plus être terminée. Rare par construction, donc il a le droit d'être
     direct, mais il ne réclame RIEN à l'équipier et ne dit jamais qui a
     laissé passer un jour : la règle du relais tient à ça. */
  "rappel.relais_decisif": {
    commun: [
      (c) => ({
        title: "L’affiche se joue aujourd’hui",
        body: (c.maillons ?? 1) > 1
          ? `Il reste ${c.maillons} maillons et autant de jours. Dix minutes suffisent.`
          : "Sans un maillon aujourd’hui, elle restera incomplète. Dix minutes suffisent.",
      }),
      { title: "Il reste ce soir",
        body: "Une séance de dix minutes, et l’affiche continue de se dévoiler." },
    ],
    nora: [
      (c) => ({
        title: "L’affiche se joue aujourd’hui",
        body: (c.maillons ?? 1) > 1
          ? `Il reste ${c.maillons} maillons et exactement autant de jours. Dix minutes suffisent.`
          : "Sans un maillon aujourd’hui, elle restera incomplète. Dix minutes suffisent, vraiment.",
      }),
      { title: "Il reste ce soir",
        body: "Une séance de dix minutes, et l’affiche continue de se dévoiler." },
    ],
    sasha: [
      (c) => ({
        title: "L’affiche se joue aujourd’hui",
        body: (c.maillons ?? 1) > 1
          ? `${c.maillons} maillons, autant de jours. Dix minutes suffisent.`
          : "Un maillon aujourd’hui, sinon elle reste incomplète. Dix minutes suffisent.",
      }),
      { title: "Il reste ce soir", body: "Dix minutes, et l’affiche avance." },
    ],
  },

  "rappel.repas": {
    commun: [
      { title: "Et tes repas ?", body: "Séance faite, il ne manque que ce que tu as mangé." },
      { title: "Il manque ta journée d’assiettes", body: "Deux minutes et ton suivi est complet." },
    ],
    nora: [
      { title: "Et tes repas ?", body: "La séance est faite, il ne manque que ce que tu as mangé." },
      { title: "Il manque ta journée d’assiettes", body: "Deux minutes, et ton suivi est complet." },
    ],
    sasha: [
      { title: "Et tes repas ?", body: "Séance faite. Il ne manque que l’assiette." },
      { title: "Il manque ta journée d’assiettes", body: "Deux minutes et c’est complet." },
    ],
  },
} satisfies Record<string, RepliquePush>;

/** Les cas de rappel existants. `rappelsProfil.ts` s'y réfère par ce
 *  type, donc un modèle sans phrase ne compile pas. */
export type CleRappel = keyof typeof RAPPELS;

/**
 * Les formulations de ce rappel, pour ce Guide, déjà rendues.
 *
 * On renvoie la LISTE et pas une phrase : c'est `rappelsProfil.ts` qui
 * choisit l'index, parce que lui seul sait ce qui est réellement parti
 * les jours précédents. Le contrat tient tout seul même si une liste
 * venait à ne pas avoir la même longueur que les autres : l'index se
 * calcule sur la liste rendue ici, jamais sur une autre.
 */
export function voixRappel(guide: GuideRef, cle: CleRappel, ctx: ContexteVoix = {}): PhrasePush[] {
  const r: RepliquePush = RAPPELS[cle];
  const liste = (guide === "nora" ? r.nora : guide === "sasha" ? r.sasha : undefined) ?? r.commun;
  return liste.map((v) => (typeof v === "function" ? v(ctx) : v));
}

/* ── Comment le Guide se PRÉSENTE ──────────────────────────────────────
   Ce ne sont pas des répliques : un prénom et un rôle ne se prononcent
   pas, ils s'affichent (en-tête de la conversation, ligne des
   paramètres). Ils vivent quand même ici, parce qu'ils sont l'identité du
   Guide et que les éparpiller, c'est exactement ce que ce fichier
   corrige.

   ⚠️ « Guide » est le SEUL mot pour désigner Nora et Sasha. Ni « coach »,
   ni « assistant », ni « robot » : trois noms pour une seule personne, et
   personne ne sait plus à qui il parle. ✦ reste la marque de Vaiiya
   (l'orbe, le produit), jamais le visage d'une personne. */
export const PRENOM_GUIDE: Record<GuideId, string> = {
  nora: "Nora",
  sasha: "Sasha",
};

/* ── Ce qui distingue les deux, en deux lignes ──────────────────────
   Ces mots décrivent le Guide ; ils ne sont pas prononcés par lui. Ils
   servent partout où l'on doit CHOISIR ou VÉRIFIER son Guide : l'écran
   d'entrée `/bienvenue` et la ligne des paramètres. Ils vivent ici parce
   que les recopier dans le second écran, c'est signer la divergence : on
   corrigerait un adjectif d'un côté et pas de l'autre.

   ⚠️ `trait` et `pour` décrivent une MANIÈRE, jamais une qualité. Aucun
   des deux n'est le meilleur, le plus sérieux ou le plus efficace : ils
   n'ont pas les mêmes gestes, c'est tout. Une formulation qui laisserait
   entendre qu'un choix est plus ambitieux que l'autre est fausse, parce
   que les capacités et les conseils de fond sont identiques. */
export const PORTRAIT_GUIDE: Record<GuideId, { trait: string; pour: string }> = {
  nora: {
    trait: "Calme et méthodique",
    pour: "Tu préfères comprendre avant d’agir.",
  },
  sasha: {
    trait: "Direct et dynamique",
    pour: "Tu préfères avancer puis ajuster en chemin.",
  },
};

/* ── LES CINQ VISAGES ──────────────────────────────────────────────────
   Un Guide a cinq portraits, un par moment de la conversation. Ce ne
   sont pas des humeurs : ce sont des ÉTATS DE LA CONVERSATION, chacun
   déduit d'un signal structuré, jamais des mots du message.

     welcome    la feuille est vide, personne n'a encore parlé
     listen     c'est ton tour : il a posé une question, une carte attend
                ton clic, ou tu es en train d'écrire
     think      il prépare sa réponse (flux en cours, ou action en cours)
     explain    il répond, ou il annonce la carte qui s'ouvre en dessous
     encourage  une action vient d'aboutir (carte validée, thème appliqué,
                page ouverte), et la fin d'une séance

   ⚠️ `listen` a failli rester lettre morte. Sa première version ne se
   déclenchait que sur une question posée par le code, or le code n'en
   pose qu'une : celle du lieu d'entraînement, une fois dans la vie d'un
   compte. Un état qui n'apparaît jamais est un état qui n'existe pas.
   Les deux signaux ajoutés sont de la même nature que le premier, aussi
   exacts et aussi peu devinés : une carte en attente de validation est
   une carte en attente de TOI, et un brouillon non vide dit que tu écris.

   ⚠️ AUCUN DE CES ÉTATS NE SE DEVINE DANS LE TEXTE. On aurait pu chercher
   un point d'interrogation pour `listen` ou un « bravo » pour
   `encourage` : ce serait faux le jour où le modèle formule autrement,
   et faux dans l'autre sens dès qu'une phrase contient une question
   rhétorique. Les signaux existent déjà, ils sont exacts et ils sont à
   nous : une question posée par le CODE porte son objet `question`, une
   réponse en cours porte `streaming`, une carte validée passe par
   `confirmSeance` et compagnie. On lit ces signaux, rien d'autre.

   Le visage vit dans `AssistantContext` (`etatGuide`), parce que c'est
   lui qui tient tous ces signaux. L'écran ne fait que l'afficher.

   ⚠️ Le tunnel de séance (`WorkoutGuideModal`) utilise les mêmes cinq
   états, mais il ne passe PAS par `etatGuide` : il ne tient pas une
   conversation, il tient un compteur. Ses signaux sont ailleurs (en
   pause, en repos, dernier exercice, séance terminée) et ils sont tout
   aussi structurés. Voir `cleRepos` là-bas. */
export type EtatGuide = "welcome" | "listen" | "think" | "explain" | "encourage";

/** Ce que le Guide FAIT en disant une bulle donnée, écrit au moment où
 *  la bulle est créée (là où on le sait de source sûre) et gardé avec
 *  elle. C'est un sous-ensemble des états : `welcome` n'est pas une
 *  bulle, et `think` n'en est pas encore une.
 *
 *  ⚠️ `encourage` n'est aujourd'hui le ton d'AUCUNE bulle, et c'est
 *  normal : chez nous une validation ne répond pas par un message, elle
 *  répond par une pastille discrète. L'encouragement est donc un état
 *  vivant (le visage réagit quelques secondes) et pas une phrase. Le
 *  jour où une bulle célèbre quelque chose, elle portera ce ton. */
export type TonGuide = Extract<EtatGuide, "listen" | "explain" | "encourage">;

/* ── LES MOMENTS ───────────────────────────────────────────────────────
   ⚠️ UN MOMENT N'EST PAS UN ÉTAT, ET C'EST TOUTE LA DIFFÉRENCE.

   Les cinq états s'appellent `welcome`, `listen`, `think`, `explain`,
   `encourage` : ce sont cinq mots de CONVERSATION. Ils ont été dessinés
   pour le chat, puis étendus tels quels à vingt-et-un endroits dont la
   plupart ne sont pas des conversations. Conséquence mesurée le
   2026-08-30 : `encourage` sert à la fois pour « tu passes Diamant » et
   pour « ton thème est appliqué », `explain` pour « voilà comment faire
   une fente » et pour « voilà pourquoi ta semaine est équilibrée ». Le
   mot est juste ; la POSE ne peut pas l'être pour les deux.

   Un moment appartient à l'ENDROIT, pas au dialogue. Il désigne une
   planche dessinée pour ce passage précis, et rien d'autre.

   ⚠️ UN MOMENT NE PEUT PAS CASSER UN ÉCRAN, et c'est la propriété qui
   rend tout le reste possible. Sa planche n'existe peut-être pas encore :
   le composant essaie le fichier du moment, et retombe sur celui de
   l'état. Déposer une planche dans `guides-src/portraits/` puis lancer
   `npm run portraits` suffit donc à l'allumer, sans toucher une ligne de
   code, et une planche absente rend exactement l'écran d'aujourd'hui.

   La disponibilité réelle se lit dans `portraitsGuides.ts`, ÉCRIT PAR LE
   SCRIPT : le code ne devine jamais qu'un fichier existe.

   ⚠️ LE REPLI SE DÉCLARE AU POINT D'APPEL, il n'y a pas de table. C'est
   là qu'on sait ce que le Guide est en train de faire, donc là qu'on sait
   sur quel état retomber. Une table centrale dirait la même chose plus
   loin de l'endroit qui la connaît, et il faudrait la tenir à jour à
   chaque écran ajouté. */
export type MomentGuide =
  | "bienvenue.corps"
  | "bienvenue.objectifs"
  | "bienvenue.niveau"
  | "bienvenue.entrainement"
  | "bienvenue.nutrition";

/** Le nom de fichier d'un moment. Le point du code devient un tiret sur le
 *  disque : `bienvenue.corps` → `nora-bienvenue-corps-buste-v1.webp`. */
export function clePortrait(guide: GuideId, moment: MomentGuide, cadrage: string): string {
  return `${guide}-${moment.replace(".", "-")}-${cadrage}`;
}

/** Le nom affiché en tête de la conversation. Sans Guide résolu, c'est le
 *  produit qui parle, et il le dit avec sa marque. */
export function nomGuide(guide: GuideRef): string {
  return guide ? PRENOM_GUIDE[guide] : "Vaiiya ✦";
}

/** La ligne sous le nom. Elle dit ce qu'est cette personne pour toi, pas
 *  ce qu'elle sait faire. */
export function roleGuide(guide: GuideRef): string {
  return guide ? "Ton Guide Vaiiya" : "Ton assistant, partout dans l’app";
}

/* ── La variation de ton envoyée au modèle ─────────────────────────────
   ⚠️ COURTE, ET ELLE DOIT LE RESTER. Le prompt du coach dépasse déjà
   5 000 caractères, et c'est mesuré : la fiabilité d'un modèle s'écroule
   avec la longueur des consignes (voir l'en-tête d'`assistantRouter`).
   Une personnalité qui coûterait mille caractères de règles nouvelles se
   paierait en qualité de réponse, ce qui est exactement l'inverse du but.

   ⚠️ ELLE NE TOUCHE QU'À LA FORME. Aucune ligne ici ne change une règle,
   une donnée, une limite ou une recommandation de fond : ces règles
   vivent dans le prompt commun, au-dessus, et sont les mêmes pour les
   deux. Le jour où une variation commence à dire QUOI répondre et plus
   seulement COMMENT, c'est qu'on a deux coachs au lieu d'un.

   ⚠️ L'AIGUILLEUR N'EN REÇOIT RIEN (`assistantRouter`) : il ne parle
   jamais, il ne fait que décider, donc un ton n'a rien à y faire, et son
   prompt est court par nécessité. */
/* ⚠️ On ne lui fait PAS nier ce qu'il est. Une première version disait
   « ne dis jamais que tu es une IA » : c'est une consigne de mensonge, et
   elle contredisait la première ligne du prompt commun. Ce qu'on veut est
   plus étroit et plus honnête : qu'il ne se PRÉSENTE pas comme un robot,
   et qu'il ne commente pas sa propre façon de parler (« en tant que Guide
   direct, je vais… »), parce que c'est ce qui casse une conversation. */
const TON_COMMUN = `Tu ne te présentes jamais comme un robot ou un assistant, et tu ne commentes jamais ta propre façon de parler. Bannis « champion », « machine », « warrior », « je suis fier de toi » et tout ce qui ressemble à un coach de réseau social. Tu ne culpabilises jamais : tu réagis à ce que la personne fait, tu ne lui reproches pas ce qu’elle n’a pas fait.`;

const TON_PAR_GUIDE: Record<GuideId, string> = {
  nora: `Tu poses le contexte en quelques mots, tu donnes la raison courte de ce que tu proposes, puis tu proposes. Tu es calme, méthodique et structurée, un peu plus explicative que la moyenne, sans jamais rallonger pour rallonger.`,
  sasha: `Tu donnes la proposition d’abord, l’action ensuite, la précision à la fin. Tu es direct, dynamique et spontané : phrases courtes, rythmées, aucune tournure inutile.`,
};

/** La PREMIÈRE ligne du prompt : qui parle.
 *
 *  ⚠️ Elle remplace l'identité générique au lieu de s'ajouter à elle. Une
 *  version précédente laissait « Tu es Vaiiya, un coach de santé IA » en
 *  tête et collait « tu t'appelles Nora » à la fin : le modèle recevait
 *  deux identités et un mot de plus pour le même rôle (Vaiiya, coach, IA,
 *  Guide). Ici il n'y en a qu'une. */
export function ouvertureGuide(guide: GuideRef): string {
  if (!guide) {
    return "Tu es Vaiiya, un coach de santé IA premium, bienveillant, motivant et expert en nutrition, fitness et bien-être.";
  }
  /* ⚠️ Écrite sans accord de genre, exprès. Nora est féminine et Sasha
     masculin : « bienveillant, motivant et expert » est faux pour l'une,
     et dupliquer la phrase au féminin ferait deux prompts à tenir à jour
     au lieu d'un. Une tournure verbale règle les deux cas d'un coup. */
  return `Tu es ${PRENOM_GUIDE[guide]}, le Guide personnel de cette personne dans Vaiiya, son app de sport et de nutrition. Tu accompagnes avec bienveillance, tu sais motiver, et tu maîtrises la nutrition, l’entraînement et le bien-être.`;
}

/** La MANIÈRE de parler, collée à la fin du prompt commun. Vide sans Guide
 *  résolu : le prompt commun se suffit alors à lui-même. */
export function tonDuGuide(guide: GuideRef): string {
  if (!guide) return "";
  return `

TA MANIÈRE DE PARLER : ${TON_PAR_GUIDE[guide]} ${TON_COMMUN}
⚠️ Elle ne change RIEN au fond : mêmes règles, mêmes données, mêmes recommandations, mêmes limites que ce qui est écrit plus haut. Seule la formulation t’appartient.`;
}

/* ── Les réponses à toucher ────────────────────────────────────────────
   Elles vivent ici parce qu'une question et ses réponses se lisent
   ensemble et doivent bouger ensemble (elles étaient recopiées à quatre
   endroits). Mais ce ne sont PAS des phrases de Guide : ce sont les mots
   de l'utilisateur, et `repondreQuestion` les relit pour en déduire le
   lieu et le matériel. Elles ne prendront jamais de variante Nora/Sasha.
   ⚠️ Les changer, c'est changer ce que le code reconnaît (/salle/i,
   /halt/i) : vérifier les deux côtés. */
export const CHOIX_LIEU: string[] = ["En salle", "À la maison"];
export const CHOIX_EQUIP: string[] = ["Oui, des haltères", "Au poids du corps"];
