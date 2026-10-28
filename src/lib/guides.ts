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
   *  `semaine.*` : posées sur la semaine qu'on regarde.
   *  `rang.montee.*` : faites jusqu'au rang qu'on vient de gagner. */
  seances?: number;
  /** `rang.montee.*` : les séances faites depuis le rang d'avant (depuis
   *  l'inscription pour l'Argent), lues sur les cartes des deux rangs. */
  seancesDepuis?: number;
  /** `rang.montee.*` : le jour du parcours où le rang est tombé (1 = le
   *  jour de l'inscription). */
  jours?: number;
  /** `rang.montee.*` : le jour de l'inscription, déjà écrit (« 6 mai »). */
  debut?: string;
  /** Maillons qui manquent à un relais (`rappel.relais_decisif`). */
  maillons?: number;
  /** V9C · le nom d'une ÉTAPE du cycle (`impasse.etape_*`). Distinct de
   *  `titre`, qui nomme une séance : dans une même phrase on cite
   *  parfois les deux (« Pull n'est pas la prochaine, c'est Bas du
   *  corps »). */
  etape?: string;
  /** V9D · PLUSIEURS étapes, DÉJÀ jointes par l’appelant (« Push et
   *  Pull »). Distinct de `etape`, qui en nomme une seule : la même
   *  phrase peut citer les deux, et c’est l’appelant qui sait accorder,
   *  comme pour `jour`. */
  etapes?: string;
  /** V9D · une durée déjà écrite (« 10 jours », « 2 semaines »). */
  duree?: string;
  /** R3 · un nombre de répétitions (`seance.charge.choisir`). */
  reps?: number;
  /** L'ouverture · le soir (18 h à 5 h) : « Bonsoir » plutôt que « Salut ». */
  soir?: boolean;
  /** L'ouverture · le mouvement où une séance s'est arrêtée (à partir de 1),
   *  et le nombre de mouvements de cette séance. */
  position?: number;
  total?: number;
  /** L'ouverture · une durée estimée, en minutes. */
  minutes?: number;
  /** L'ouverture · la flamme qui arrive AUJOURD'HUI, avec son article
   *  (« le Feu »). Absente les autres jours. */
  flamme?: string;
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
     ouverture.* ce qu'il dit de ta journée en ouvrant la conversation
     retour.*   ce qu'il dit en arrivant sur l'accueil de l'app
     memoire.*  ce qu'il dit de sa propre mémoire, et sur son écran
     attente.*  ce qu'il dit pendant qu'il travaille
     proposition.* ce qu'il répond autour d'une séance qu'il propose
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
  "action.plan_retirer": {
    commun: "Ça marche, je te prépare le retrait. Valide juste en dessous 👇",
    nora:   "Je te prépare le retrait de cette séance. Valide juste en dessous 👇",
    sasha:  "Retrait prêt, valide juste en dessous 👇",
  },
  "action.plan_ajouter": {
    commun: "Ça marche, je te prépare ça en plus. Valide juste en dessous 👇",
    nora:   "Je te prépare cette séance en plus, sans toucher au reste. Valide juste en dessous 👇",
    sasha:  "Une séance en plus, valide juste en dessous 👇",
  },
  "action.etape_substituer": {
    commun: "Ça marche, je te propose ça à la place. Valide juste en dessous 👇",
    nora:   "Je te propose ça à la place, et je te dis ce que ça change pour ton cycle. Valide juste en dessous 👇",
    sasha:  "Voilà ce que je te propose à la place, valide juste en dessous 👇",
  },
  "action.etape_sauter": {
    commun: "Regarde ce que ça change avant de valider, juste en dessous 👇",
    nora:   "Je te prépare ça. Regarde ce que ça change pour ton cycle avant de valider, juste en dessous 👇",
    sasha:  "Regarde ce que ça change avant de valider, juste en dessous 👇",
  },
  /* V9D · IL OUVRE UN ÉCRAN, IL NE PROPOSE PAS UNE CARTE, donc il ne dit
     jamais « valide juste en dessous ». Ce qu’il y a à vérifier est dans
     la feuille qui arrive, et rien ne partira en base avant son bouton. */
  "action.adaptation_ouvrir": {
    commun: "Je t’ouvre ton adaptation ✦",
    nora:   "Je t’ouvre l’écran d’adaptation, tu vérifies et tu valides 🙂",
    sasha:  "Je t’ouvre l’adaptation 👉",
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
    nora:   "C’est réglé sur automatique : le thème suivra ton téléphone 🙂",
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
    commun: "Avant de te préparer ça, tu t’entraînes où ?",
    nora:   "Avant de te préparer ça, j’ai besoin de savoir où tu t’entraînes.",
    sasha:  "Tu t’entraînes où ? J’adapte tout de suite.",
  },
  "question.lieu_semaine": {
    commun: "Tu t’entraînes où cette semaine ?",
    nora:   "Pour construire ta semaine, dis-moi où tu t’entraînes.",
    sasha:  "Tu t’entraînes où cette semaine ?",
  },
  "question.equip": {
    commun: "Tu as des haltères à la maison ?",
    nora:   "Une dernière chose : tu as des haltères à la maison ?",
    sasha:  "Des haltères à la maison ?",
  },

  /* ── Les impasses ──
     ⚠️ Règle verrouillée : aucune sortie muette. Un `return` nu, c'était
     une demande sans réponse et sans explication, impossible à
     diagnostiquer (« j'ai parlé, il ne s'est rien passé »). */
  "impasse.move_introuvable": {
    commun: "Je ne trouve pas de séance à déplacer cette semaine 🤔 Dis-moi le jour de départ, par ex. « déplace la séance de jeudi à vendredi ».",
    nora:   "Je ne trouve pas de séance à déplacer cette semaine 🤔 Dis-moi son jour de départ et je m’en occupe, par ex. « déplace la séance de jeudi à vendredi ».",
    sasha:  "Aucune séance à déplacer cette semaine 🤔 Donne-moi le jour de départ, par ex. « déplace la séance de jeudi à vendredi ».",
  },
  "impasse.move_sans_jour": {
    commun: "Vers quel jour veux-tu déplacer la séance ? (par ex. « demain », « dans 2 jours » ou « vendredi ») 📅",
    nora:   "Vers quel jour veux-tu la déplacer ? Un « demain », un « vendredi » ou un « dans 2 jours » me suffit 📅",
    sasha:  "Vers quel jour ? « demain », « vendredi », « dans 2 jours » 📅",
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
  /* V9C ter · la semaine PROCHAINE n'a pas de jour à préparer. Message
     distinct du précédent, et ce n'est pas un détail : celui-ci ne peut
     pas dire « redemande-moi lundi », puisque c'est précisément lundi
     qu'on est en train de préparer. */
  "impasse.regen_calendrier_illisible": {
    commun: "Je n’arrive pas à relire tes jours d’entraînement pour l’instant, donc je ne touche pas à ta semaine. Redemande-moi dans un instant.",
  },
  "impasse.regen_jours_choisis": {
    commun: "Tu as choisi tes jours, ta semaine se remplit déjà toute seule dans l’ordre de ton programme 🙂 Tu peux changer une séance de jour depuis « Ma semaine », ou modifier tes jours.",
  },
  "impasse.regen_semaine_prochaine_pleine": {
    commun: "Ta semaine prochaine est déjà posée entièrement à la main, je n’ai aucun jour à préparer 🙂 Retire une séance si tu veux que je la recompose.",
    nora:   "Ta semaine prochaine est déjà posée entièrement à la main : je n’ai aucun jour à préparer 🙂 Retire une séance et je recompose autour.",
    sasha:  "Semaine prochaine déjà posée à la main, rien à préparer 🙂 Retire une séance si tu veux que je m’en occupe.",
  },

  /* ── V9B · la séance qu'on cherche ──
     Un nom ne suffit pas toujours à désigner une ligne : deux séances
     peuvent s'appeler pareil, ou aucune ne porter ce nom. Les deux cas se
     disent, jamais un silence. */
  "impasse.cible_introuvable": {
    commun: (c: ContexteVoix) => `Je ne trouve pas de séance « ${c.titre ?? ""} » dans ton planning 🤔 Dis-moi le jour, par ex. « celle de jeudi ».`,
    nora:   (c: ContexteVoix) => `Je ne trouve pas de séance « ${c.titre ?? ""} » dans ton planning des prochains jours 🤔 Dis-moi son jour et je la retrouve, par ex. « celle de jeudi ».`,
    sasha:  (c: ContexteVoix) => `Pas de « ${c.titre ?? ""} » dans ton planning 🤔 Donne-moi le jour, par ex. « celle de jeudi ».`,
  },
  "impasse.retrait_introuvable": {
    commun: "Je ne vois aucune séance à retirer ces jours-ci 🙂 Dis-moi le jour ou le nom de celle que tu veux enlever.",
    nora:   "Je ne vois aucune séance à retirer ces jours-ci 🙂 Dis-moi le jour ou le nom de celle que tu veux enlever, et je m'en occupe.",
    sasha:  "Rien à retirer ces jours-ci 🙂 Donne-moi le jour ou le nom.",
  },
  "question.quelle_seance": {
    commun: "Tu en as plusieurs qui correspondent. Laquelle ?",
    nora:   "Tu en as plusieurs qui correspondent. Laquelle veux-tu ?",
    sasha:  "Plusieurs correspondent. Laquelle ?",
  },
  /* V9C bis · deux séances portent ce nom : on demande, on ne choisit
     jamais la plus récente en silence à la place de quelqu'un. */
  "question.quel_contenu": {
    commun: "Deux séances portent ce nom. Laquelle tu veux ?",
    nora:   "Deux séances portent ce nom. Dis-moi laquelle tu veux et je la mets.",
    sasha:  "Deux séances portent ce nom. Laquelle ?",
  },

  /* ── V9C · les refus d'un geste de cycle ──
     ⚠️ CHACUN DIT POURQUOI, ET DEUX D'ENTRE EUX PROPOSENT UNE SUITE. Un
     geste refusé sans raison, c'est une demande sans réponse : le
     symptôme que V9B a passé une vague à fermer. Le refus « masquée »
     renvoie vers l'écran d'adaptation, parce que c'est là que ça se
     règle, jamais dans la conversation. */
  "impasse.etape_sans_programme": {
    commun: "Tu n’as pas encore de programme, donc pas d’étape à remplacer 🙂 Dis-moi plutôt quelle séance tu veux faire, et je te la prépare.",
    nora:   "Tu n’as pas encore de programme, donc il n’y a pas d’étape à remplacer 🙂 Dis-moi la séance que tu veux faire et je m’en occupe.",
    sasha:  "Pas encore de programme, donc pas d’étape à remplacer 🙂 Dis-moi la séance que tu veux et je te la prépare.",
  },
  "impasse.etape_illisible": {
    commun: "Je n’arrive pas à lire ton programme à l’instant 🤔 Réessaie dans un moment, je ne veux pas toucher à ton cycle sans être sûr.",
    nora:   "Je n’arrive pas à lire ton programme à l’instant 🤔 Réessaie dans un moment : je préfère ne rien toucher à ton cycle tant que je ne suis pas sûre.",
    sasha:  "Je n’arrive pas à lire ton programme là 🤔 Réessaie dans un moment : je ne touche pas à ton cycle à l’aveugle.",
  },
  "impasse.etape_introuvable": {
    commun: (c: ContexteVoix) => `« ${c.titre ?? ""} » n’est pas une étape de ton programme 🤔 Dis-moi juste « autre chose que ma prochaine séance » et je m’en occupe.`,
    nora:   (c: ContexteVoix) => `« ${c.titre ?? ""} » ne fait pas partie de ton cycle 🤔 Dis-moi « autre chose que ma prochaine séance » et je te propose ça.`,
    sasha:  (c: ContexteVoix) => `« ${c.titre ?? ""} » n’est pas dans ton cycle 🤔 Dis « autre chose que ma prochaine séance ».`,
  },
  "impasse.etape_deja_resolue": {
    commun: (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà réglée : ton cycle est passé à la suite 🙂`,
    nora:   (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà derrière toi, ton cycle est passé à la suite 🙂`,
    sasha:  (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà réglée, le cycle a avancé 🙂`,
  },
  "impasse.etape_masquee": {
    commun: (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà mise de côté par ton adaptation${c.jour ? `, jusqu’au ${c.jour}` : ""}. Il n’y a rien à remplacer : tu peux gérer ton adaptation dans Entraînement.`,
    nora:   (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà mise de côté par ton adaptation${c.jour ? `, jusqu’au ${c.jour}` : ""} : il n’y a rien à remplacer. Si tu veux la reprendre, ça se règle dans ton adaptation, côté Entraînement.`,
    sasha:  (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà écartée par ton adaptation${c.jour ? ` jusqu’au ${c.jour}` : ""}. Rien à remplacer. Ça se gère dans Entraînement.`,
  },
  /* V9C quater · l'adaptation ne laisse passer aucune étape.
     ⚠️ ELLE NOMME LA COUCHE, JAMAIS UNE ÉTAPE. Avant, ce cas tombait sur
     « introuvable » avec un titre vide, donc sur un reproche adressé à
     quelqu'un qui n'avait rien cité. Et elle propose la SORTIE : c'est
     l'adaptation qui bloque, elle se gère dans son écran. */
  "impasse.etape_aucune_compatible": {
    commun: (c: ContexteVoix) => `Ton adaptation met de côté toutes les étapes de ton cycle${c.jour ? `, jusqu’au ${c.jour}` : ""} : il n’y en a donc aucune à passer. Tu peux gérer ton adaptation dans Entraînement.`,
    nora:   (c: ContexteVoix) => `Pour l’instant ton adaptation écarte toutes les étapes de ton cycle${c.jour ? `, jusqu’au ${c.jour}` : ""} : il n’y a donc rien à passer. Si tu veux en reprendre une, ça se règle dans ton adaptation, côté Entraînement.`,
    sasha:  (c: ContexteVoix) => `Ton adaptation écarte tout ton cycle${c.jour ? ` jusqu’au ${c.jour}` : ""}. Rien à passer. Ça se gère dans Entraînement.`,
  },
  "impasse.etape_pas_la_prochaine": {
    commun: (c: ContexteVoix) => `Je ne peux toucher qu’à ta prochaine étape${c.etape ? `, « ${c.etape} »` : ""} 🙂 Sauter plus loin ferait avancer ton cycle de plusieurs crans d’un coup.`,
    nora:   (c: ContexteVoix) => `Je ne peux agir que sur ta prochaine étape${c.etape ? `, « ${c.etape} »` : ""} 🙂 Aller plus loin ferait avancer ton cycle de plusieurs crans d’un coup, sur des séances que tu n’as pas écartées.`,
    sasha:  (c: ContexteVoix) => `Seulement ta prochaine étape${c.etape ? `, « ${c.etape} »` : ""} 🙂 Plus loin, ton cycle avancerait de plusieurs crans d’un coup.`,
  },
  "impasse.substitution_sans_contenu": {
    commun: (c: ContexteVoix) => `Tu veux faire quoi à la place de « ${c.titre ?? ""} » ? Nomme-moi une de tes séances ou une du catalogue, par ex. « HIIT 20/10 » 🙂`,
    nora:   (c: ContexteVoix) => `Tu veux faire quoi à la place de « ${c.titre ?? ""} » ? Nomme-moi une de tes séances ou une du catalogue, par ex. « HIIT 20/10 », et je te la prépare 🙂`,
    sasha:  (c: ContexteVoix) => `Quoi à la place de « ${c.titre ?? ""} » ? Une de tes séances, ou une du catalogue (« HIIT 20/10 ») 🙂`,
  },
  "impasse.ajout_sans_jour": {
    commun: "Quel jour veux-tu cette séance en plus ? Un supplément se pose toujours sur un jour précis 📅",
    nora:   "Quel jour veux-tu cette séance en plus ? Un supplément se pose toujours sur un jour précis, sinon il reste en suspens 📅",
    sasha:  "Quel jour, ce supplément ? « demain », « samedi » 📅",
  },
  /* ── V9C ter · quand un remplacement EXPLICITE ne peut pas devenir une
     substitution ──

     ⚠️ ON EXPLIQUE, ON NE DEVINE PAS, ET LES DEUX PHRASES NOMMENT UNE
     SORTIE EXÉCUTABLE. Écraser la ligne serait une substitution non
     déclarée (interdite depuis V4) ; l'ajouter à côté en silence serait
     exactement le défaut qu'on répare. Reste à dire pourquoi, et quoi
     faire à la place. */
  "impasse.remplacement_pas_la_prochaine": {
    commun: (c: ContexteVoix) => `« ${c.titre ?? ""} » vient de ton programme, mais ta prochaine étape est « ${c.etape ?? ""} ». Je ne fais pas avancer ton cycle sans être sûr 🤔 Dis-moi « retire ma séance du ${c.jour ?? "jour"} » d’abord, ou « ajoute-la en plus » si tu veux garder les deux.`,
    nora:   (c: ContexteVoix) => `« ${c.titre ?? ""} » vient bien de ton programme, mais ce n’est pas ta prochaine étape : c’est « ${c.etape ?? ""} ». Je préfère ne pas faire avancer ton cycle à ta place 🤔 Dis-moi « retire ma séance du ${c.jour ?? "jour"} » d’abord, ou « ajoute-la en plus » et je garde les deux.`,
    sasha:  (c: ContexteVoix) => `« ${c.titre ?? ""} » vient de ton programme, mais ta prochaine étape est « ${c.etape ?? ""} » 🤔 Je ne touche pas au cycle à l’aveugle. « retire ma séance du ${c.jour ?? "jour"} » d’abord, ou « ajoute-la en plus ».`,
  },
  "impasse.remplacement_reserve_ailleurs": {
    commun: (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà réservée un autre jour${c.jour ? `, le ${c.jour}` : ""}, donc je ne peux pas la remplacer ici sans la dédoubler 🤔 Déplace-la d’abord sur ce jour-là, et je m’occupe du reste.`,
    nora:   (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà réservée un autre jour${c.jour ? `, le ${c.jour}` : ""} : la remplacer ici la mettrait à deux endroits 🤔 Déplace-la d’abord sur ce jour-là, et je m’occupe du reste.`,
    sasha:  (c: ContexteVoix) => `« ${c.titre ?? ""} » est déjà réservée ailleurs${c.jour ? `, le ${c.jour}` : ""} 🤔 Déplace-la d’abord sur ce jour-là.`,
  },

  /* ── V9D · CE QUE LE GUIDE DIT QUAND IL OUVRE (OU N’OUVRE PAS)
     L’ADAPTATION ──

     ⚠️ IL NE PARLE QUE QUAND LA FEUILLE NE DIRA PAS CE QU’IL SAIT. Une
     demande claire (« évite Push pendant 10 jours ») n’a besoin
     d’AUCUNE phrase du code : l’écran arrive avec Push cochée et les
     deux dates posées, donc il montre déjà ce qui a été compris, mieux
     qu’une phrase ne le dirait. On n’écrit ici que ce que l’écran est
     incapable de dire : un nom qu’on n’a pas retrouvé, une adaptation
     qui tourne déjà, une demande d’arrêt sans rien à arrêter. */
  "impasse.adaptation_sans_programme": {
    commun: "Tu n’as pas encore de programme, donc il n’y a rien à adapter 🙂 Commence par en avoir un, et je m’occupe du reste.",
    nora:   "Tu n’as pas encore de programme, donc il n’y a rien à mettre de côté pour l’instant 🙂 Dès que tu en as un, on peut l’adapter quand tu veux.",
    sasha:  "Pas encore de programme, donc rien à adapter 🙂",
  },
  "impasse.adaptation_aucune": {
    commun: "Tu n’as aucune adaptation en cours : ton programme tourne déjà normalement 🙂",
    nora:   "Il n’y a rien à arrêter : tu n’as aucune adaptation en cours, ton programme tourne déjà normalement 🙂",
    sasha:  "Rien à arrêter : aucune adaptation en cours 🙂",
  },
  /* ⚠️ ON N’EN CRÉE JAMAIS UNE SECONDE, ET CE N’EST PAS UNE PRUDENCE :
     l’`EXCLUDE` de la base refuse deux adaptations qui partagent un
     seul jour. Ouvrir un formulaire de création ici, ce serait proposer
     un geste voué au refus. On ouvre donc celle qui existe. */
  "impasse.adaptation_deja_active": {
    commun: (c: ContexteVoix) => `Tu as déjà une adaptation en cours${c.jour ? `, jusqu’au ${c.jour}` : ""} : on n’en tient qu’une à la fois. Je t’ouvre celle-là, tu peux l’arrêter pour en déclarer une autre.`,
    nora:   (c: ContexteVoix) => `Tu as déjà une adaptation en cours${c.jour ? `, jusqu’au ${c.jour}` : ""}, et on n’en garde qu’une à la fois 🙂 Je t’ouvre celle-là : tu peux l’arrêter, et on en déclare une nouvelle juste après.`,
    sasha:  (c: ContexteVoix) => `Une adaptation tourne déjà${c.jour ? ` jusqu’au ${c.jour}` : ""}, et on n’en garde qu’une 🙂 Je t’ouvre celle-là.`,
  },
  /* ⚠️ ON NOMME CE QU’ON N’A PAS RETROUVÉ, ON N’INVENTE RIEN. Cocher
     une étape au hasard parce que le mot ressemblait, ce serait écarter
     une séance que personne n’a demandé d’écarter. La feuille arrive
     avec la liste complète : le mot juste est à un geste. */
  "impasse.adaptation_etapes_incertaines": {
    commun: (c: ContexteVoix) => `Je n’ai pas su retrouver ${c.etapes ?? ""} dans ton programme 🤔 Coche toi-même ce que tu veux éviter, tout est dans la liste.`,
    nora:   (c: ContexteVoix) => `Je n’ai pas su retrouver ${c.etapes ?? ""} dans ton programme 🤔 Regarde la liste qui s’ouvre, et coche ce que tu veux mettre de côté.`,
    sasha:  (c: ContexteVoix) => `Pas retrouvé ${c.etapes ?? ""} dans ton programme 🤔 Coche-le dans la liste.`,
  },
  /* ⚠️ CELLE-CI DIT CE QUE LA FEUILLE VA MONTRER, ET ELLE NE SORT QUE
     QUAND IL Y A QUELQUE CHOSE DE PRÉCIS À DIRE : au moins une étape
     reconnue, ou une durée entendue. C’est le seul moment où l’on peut
     vérifier que le Guide a compris sans avoir à lire un formulaire.
     Sur une demande sans rien de chiffrable (« adapte mon programme »),
     elle se tait : l’écran arrive, et il dit tout. */
  "adaptation.ouvre": {
    commun: (c: ContexteVoix) => `Je t’ouvre ton adaptation${c.etapes ? ` avec ${c.etapes}` : ""}${c.duree ? `, pour ${c.duree}` : ""}. Tu vérifies avant d’activer 🙂`,
    nora:   (c: ContexteVoix) => `Je t’ouvre ton adaptation${c.etapes ? ` avec ${c.etapes} de côté` : ""}${c.duree ? `, pour ${c.duree}` : ""}. Regarde si ça te va, et c’est toi qui actives 🙂`,
    sasha:  (c: ContexteVoix) => `Adaptation ouverte${c.etapes ? ` avec ${c.etapes}` : ""}${c.duree ? `, pour ${c.duree}` : ""}. Tu vérifies, tu actives 👉`,
  },
  "question.adaptation_etape": {
    commun: (c: ContexteVoix) => `Tu veux éviter laquelle${c.titre ? ` avec « ${c.titre} »` : ""} ?`,
    nora:   (c: ContexteVoix) => `Laquelle veux-tu mettre de côté${c.titre ? `, avec « ${c.titre} »` : ""} ?`,
    sasha:  (c: ContexteVoix) => `Laquelle${c.titre ? `, avec « ${c.titre} »` : ""} ?`,
  },

  "question.portee": {
    commun: "C’est à la place de ta prochaine étape, ou en plus ?",
    nora:   "Tu veux la faire à la place de ta prochaine étape, ou en plus de ce qui est prévu ?",
    sasha:  "À la place de ta prochaine étape, ou en plus ?",
  },

  "impasse.library_sans_jour": {
    commun: "Quel jour veux-tu programmer cette séance ? (par ex. « mardi » ou « demain ») 📅",
    nora:   "Quel jour veux-tu lui donner ? Un « mardi » ou un « demain » suffit 📅",
    sasha:  "Quel jour ? « mardi », « demain » 📅",
  },
  "impasse.library_sans_nom": {
    commun: "Quelle séance de ta bibliothèque veux-tu programmer ? Donne-moi son nom 🙂",
    nora:   "Laquelle de tes séances veux-tu programmer ? Donne-moi son nom et je la retrouve 🙂",
    sasha:  "Laquelle ? Donne-moi son nom 🙂",
  },
  "impasse.library_introuvable": {
    commun: (c: ContexteVoix) => `Je ne trouve pas de séance « ${c.titre ?? ""} » dans ta bibliothèque 🤔 Vérifie le nom, ou demande-moi de la créer.`,
    nora:   (c: ContexteVoix) => `Je ne trouve pas de séance « ${c.titre ?? ""} » dans ta bibliothèque 🤔 Vérifie le nom, ou demande-moi de la créer.`,
    sasha:  (c: ContexteVoix) => `Pas de « ${c.titre ?? ""} » dans ta bibliothèque 🤔 Vérifie le nom, ou dis-moi de la créer.`,
  },

  /* ── La feuille vide ──
     Ses deux premières bulles. ⚠️ Plus d'étincelle collée au salut : ✦ est
     la marque de Vaiiya, et dans la bouche du Guide elle disait « IA » avant
     de dire son prénom (diagnostic du 2026-10-19). Et plus de « Je
     t'écoute » : c'est désormais ce que dit l'en-tête, sous son nom, et
     c'était la phrase d'accueil de tous les assistants. */
  "accueil.salut": {
    commun: (c: ContexteVoix) => `${c.soir ? "Bonsoir" : "Salut"}${c.pseudo ? `, ${c.pseudo}` : ""}.`,
    nora:   (c: ContexteVoix) => `${c.soir ? "Bonsoir" : "Salut"}${c.pseudo ? `, ${c.pseudo}` : ""}.`,
    sasha:  (c: ContexteVoix) => `${c.soir ? "Bonsoir" : "Salut"}${c.pseudo ? `, ${c.pseudo}` : ""}.`,
  },
  "accueil.invite": {
    commun: "Dis-moi où tu en es aujourd’hui.",
    nora:   "Dis-moi où tu en es aujourd’hui.",
    sasha:  "Dis-moi où tu en es aujourd’hui.",
  },

  /* ════════════════════════════════════════════════════════════════
     L'OUVERTURE DE LA CONVERSATION (Louis, 2026-10-20, version 3 de la
     maquette « La conversation du Guide »).

     Le Guide parle en premier, et de TA journée : une séance en pause,
     la séance du jour, la prochaine étape, ce qui est fait, le repos, la
     flamme. Tout vient de ce que l'app a déjà lu, et les phrases sont
     écrites ici : l'ouverture ne coûte AUCUN appel d'IA, le coach ne prend
     la main qu'à ta réponse.

     ⚠️ LE CHOIX DE CE QU'IL DIT N'EST PAS ICI. Il est dans
     `ouvertureGuide.ts`, pur, et `check:ouverture` le vérifie.
     ⚠️ JAMAIS UN REPROCHE : une séance en pause n'est pas « abandonnée »,
     un jour libre n'est pas un jour manqué. AUCUN ACCORD DE GENRE.
     ⚠️ UN NOM DE SÉANCE SE MET ENTRE GUILLEMETS : « Haut du corps » au
     milieu d'une phrase se lit mal sans eux.
     ════════════════════════════════════════════════════════════════ */
  /** Après le salut, dans la même bulle, à partir de trois jours. Le jour
   *  où une flamme arrive, c'est elle qu'on dit (la même règle que la
   *  tuile de l'accueil : `etatFlamme(...).nouvelle`). */
  "ouverture.flamme": {
    commun: (c: ContexteVoix) => c.flamme
      ? `${affileeDit(c.serie)} : ta flamme devient ${c.flamme}.`
      : `${affileeDit(c.serie)}, ${["chapeau", "ta flamme tient", "ça se voit"][(c.serie ?? 0) % 3]}.`,
  },
  "ouverture.reprise": {
    commun: (c: ContexteVoix) => `Ta séance « ${c.titre ?? ""} » est en pause${c.position && c.total && c.total > 1 ? `, au mouvement ${c.position} sur ${c.total}` : ""}. On la termine ?`,
  },
  "ouverture.seance": {
    commun: (c: ContexteVoix) => `Aujourd’hui, c’est « ${c.titre ?? ""} »${c.minutes ? `, environ ${c.minutes} min` : ""}. On y va ?`,
  },
  "ouverture.etape": {
    commun: (c: ContexteVoix) => `Ta prochaine séance, c’est « ${c.titre ?? ""} »${c.jour ? `, prévue ${c.jour}` : ", quand tu veux"}.`,
  },
  "ouverture.faite": {
    commun: (c: ContexteVoix) => c.titre
      ? `Ta séance « ${c.titre} » est faite pour aujourd’hui. Bien joué.`
      : "Ta séance du jour est faite. Bien joué.",
  },
  "ouverture.repos": {
    commun: "Aujourd’hui, c’est repos. Ton corps construit pendant que tu récupères.",
  },
  "ouverture.libre": {
    commun: "Rien de prévu aujourd’hui. On bouge quand tu veux.",
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
    commun: "On fait quoi aujourd’hui ?",
    nora:   "On regarde ta journée ensemble ?",
    sasha:  "On fait quoi aujourd’hui ?",
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
    commun: "Je n’ai encore rien retenu. Parle-moi normalement et dis-moi ce qui compte : une blessure, ce que tu ne manges pas, tes horaires. Je m’en servirai à chaque fois qu’on se parle.",
    nora:   "Je n’ai encore rien retenu de toi. Parle-moi normalement et dis-moi ce qui compte : une blessure, ce que tu ne manges pas, tes horaires. Je m’en servirai à chaque fois qu’on se parle.",
    sasha:  "Rien de retenu pour l’instant. Dis-moi ce qui compte : une blessure, ce que tu ne manges pas, tes horaires. Je m’en sers dès la prochaine fois.",
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

  /* ── Autour d'une séance qu'il propose ──
     La séance se pose sous sa bulle, avec un seul bouton, « On y va ».
     Ce qu'on peut lui répondre (« Plutôt demain », « Un autre jour »,
     « Autre chose ») s'écrit dans `propositionSeance.ts` : ce sont les
     mots de la personne. Ici, ce qu'il répond à son tour. */
  "proposition.quel_jour": {
    commun: "Quel jour te va ?",
  },
  "proposition.programmee": {
    commun: (c: ContexteVoix) => `C’est calé : « ${c.titre ?? ""} » ${c.jour ?? ""}.`,
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
  /* Le premier accueil (Louis, 2026-10-12) : la page d'accueil dit bonjour
     à un nouvel inscrit, puis il choisit. Rien n'est imposé, et la phrase le
     dit. Aucun accord de genre. */
  "accueil.premier": {
    commun: "Ça me fait plaisir que tu sois là. J’ai préparé une première séance à ta mesure, mais rien ne presse : tu peux aussi faire le tour d’abord.",
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
  "seance.repos.tour": {
    commun: "Un tour de fait. Le suivant repart au début, prends ce temps.",
    nora:   "Un tour de fait. Respire, le suivant repart du premier exercice.",
    sasha:  "Tour bouclé. Récupère, on repart du début.",
  },
  "seance.repos.fin": {
    commun: "Dernier exercice, garde le même rythme.",
    nora:   "C’est le dernier exercice. Garde la même qualité de mouvement jusqu’au bout.",
    sasha:  "Dernier exercice. Même rythme, on finit propre.",
  },
  /* R3 · la charge n'est pas connue (décision 50) : aucun chiffre n'est
     inventé, le Guide dit seulement comment la choisir. Elle prend la place
     du conseil du geste, sans nouvelle carte. */
  "seance.charge.choisir": {
    commun: (c) => `Choisis une charge que tu pourrais soulever environ ${c.reps ?? 12} fois.`,
  },
  /* R4 · la question après la dernière série d'un repère (décision 57).
     Elle prend la place de la phrase du repos, sans surface de plus. */
  "seance.marge.question": {
    commun: "Sur ta dernière série, tu aurais pu faire encore combien de répétitions avec le même mouvement ?",
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
  /* Le titre de la fin de séance, au-dessus des chiffres. Deux jours :
     celui où un progrès vérifiable existe (le fait marquant), et tous les
     autres, qui méritent aussi d'être fiers. Jamais de chiffre ici : ils
     sont juste en dessous, et ils viennent du journal. */
  "seance.fin.titre.fait": {
    commun: "Ça se lit dans tes chiffres.",
  },
  "seance.fin.titre.calme": {
    commun: "Une séance de plus pour toi.",
  },
  "seance.fin.fait": {
    commun: "Celle-là, tu peux la garder longtemps.",
  },
  "seance.fin.calme": {
    commun: "Pas de nouveau record aujourd’hui, et c’est comme ça qu’on avance.",
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
    nora:   "Regarde bien : le mouvement s’anime, le compte à rebours part, le repos s’enchaîne tout seul. Tu n’as qu’à suivre, je m’occupe du reste. Cent-deux mouvements sont dessinés un par un.",
    sasha:  "Le mouvement s’anime, le compte à rebours part, le repos s’enchaîne. Tu suis, je gère le reste. Cent-deux mouvements dessinés un par un.",
  },
  "visite.catalogue": {
    commun: "Sans matériel, à la salle, mobilité, cardio, récupération. Vingt et un mini-cours pour comprendre ce que tu fais. Et si rien ne te va, tu pioches parmi les mouvements animés pour composer la tienne.",
    nora:   "Sans matériel, à la salle, mobilité, cardio, récupération, plus vingt et un mini-cours pour comprendre ce que tu fais. Et si rien ne te va, dis-le-moi : on compose la tienne à partir des mouvements animés.",
    sasha:  "Sans matériel, salle, mobilité, cardio, récupération. Vingt et un mini-cours en plus. Rien ne te va ? Dis-le-moi, on compose la tienne.",
  },
  "visite.assistant": {
    commun: "Demande-lui de poser une séance jeudi, de noter ton repas, de refaire ta semaine : elle le prépare dans la foulée. Rien ne s’enregistre tant que tu n’as pas touché la carte.",
    nora:   "C’est là qu’on se parle. Demande-moi de poser une séance jeudi, de noter ton repas, de refaire ta semaine : je le prépare dans la foulée. Rien ne s’enregistre tant que tu n’as pas touché la carte.",
    sasha:  "C’est là qu’on se parle. Une séance jeudi, un repas à noter, la semaine à refaire : je prépare, tu valides. Rien ne s’enregistre sans ton clic.",
  },
  "visite.nutrition": {
    commun: "Pas de tableau à remplir : on te demande simplement où tu manges. À la maison, au resto, ou un sandwich acheté en chemin. Une photo de ton assiette suffit à estimer le reste.",
    nora:   "Pas de tableau à remplir : je te demande simplement où tu manges. À la maison, au resto, ou un sandwich acheté en chemin. Une photo de ton assiette me suffit pour estimer le reste.",
    sasha:  "Pas de tableau à remplir. Je demande juste où tu manges : maison, resto, ou sandwich en chemin. Une photo de l’assiette, j’estime le reste.",
  },
  "visite.rang": {
    commun: "Une présence, une séance, un repas : tout se transforme en EXP et fait monter ta gemme. On mesure ta constance, jamais ton corps, et il n’y a aucun classement.",
    nora:   "Une présence, une séance, un repas : tout se transforme en EXP et fait monter ta gemme. Je compte ta constance, jamais ton corps, et il n’y a aucun classement.",
    sasha:  "Présence, séance, repas : tout devient de l’EXP et fait monter ta gemme. Je compte ta constance, jamais ton corps. Aucun classement.",
  },
  "visite.relais": {
    commun: "Invite quelqu’un, un maillon chacun son tour. À chaque séance l’image se dévoile un peu plus, jusqu’à être entière. Aucun score, et on ne nomme jamais celui qui a lâché.",
    nora:   "Invite quelqu’un, et vous prenez un maillon chacun votre tour. À chaque séance l’image se dévoile un peu plus, jusqu’à être entière. Aucun score, et on ne nomme jamais celui qui a lâché.",
    sasha:  "Invite quelqu’un, un maillon chacun son tour. Chaque séance dévoile un bout de l’image. Aucun score, et personne n’est montré du doigt.",
  },
  "visite.repere": {
    commun: "Ton accueil, tes entraînements, ta nutrition, tes discussions. Et le bouton au centre de la barre, disponible depuis n’importe quel écran.",
    nora:   "Ton accueil, tes entraînements, ta nutrition, tes discussions. Et le bouton au centre de la barre : c’est par là que tu me trouves, depuis n’importe quel écran.",
    sasha:  "Accueil, entraînements, nutrition, discussions. Le bouton au centre de la barre : c’est par là que tu me trouves, depuis n’importe quel écran.",
  },
  "visite.final": {
    commun: "Commence par ce que tu veux. Si tu ne sais pas, touche le bouton au centre de la barre et dis-lui simplement ce que tu as envie de faire aujourd’hui.",
    nora:   "Commence par ce que tu veux. Et si tu ne sais pas, touche le bouton au centre de la barre et dis-moi simplement ce que tu as envie de faire aujourd’hui.",
    sasha:  "Commence par ce que tu veux. Si tu ne sais pas, touche le bouton au centre de la barre et dis-moi ce que tu as envie de faire.",
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
    commun: "Personne ici pour l’instant. Le relais se joue à deux : on invite quelqu’un, et chacun avance à son tour.",
    nora:   "Personne ici pour l’instant. Si tu veux quelqu’un à côté de toi, le relais se joue à deux : tu invites, et vous avancez chacun votre tour.",
    sasha:  "Personne ici pour l’instant. Le relais se joue à deux : tu invites, vous avancez chacun votre tour.",
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

     ⚠️ REFAIT LE 2026-10-22 (direction 2 de la maquette « La nutrition
     accueillante ») : le titre « On mange où ? » et la phrase en dessous
     ont fusionné en UNE question, posée par le Guide et datée par le repas
     qui vient. `nutrition.question` seule ne sert qu'au tout premier
     rendu, avant que le téléphone ait donné l'heure (lib/useHorloge). */
  "nutrition.question": {
    commun: "Tu manges où ?",
  },
  "nutrition.question.petit-dejeuner": {
    commun: "Tu prends ton petit-déj où ?",
  },
  "nutrition.question.dejeuner": {
    commun: "Tu manges où ce midi ?",
  },
  "nutrition.question.gouter": {
    commun: "Tu prends ton goûter où ?",
  },
  "nutrition.question.diner": {
    commun: "Et ce soir, tu manges où ?",
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
    commun: "Le relais se joue de deux à cinq, sur une semaine. Chacun fait ses quatre maillons, deux par jour au plus, et on passe au suivant quand tout le monde a fait le sien. À chaque maillon, l’affiche se dévoile un peu.",
    nora:   "Le relais se joue de deux à cinq, sur une semaine. Chacun fait ses quatre maillons, deux par jour au plus, et on passe au suivant quand tout le monde a fait le sien. À chaque maillon, l’affiche se dévoile un peu.",
    sasha:  "Le relais se joue de deux à cinq, sur une semaine. Chacun fait ses quatre maillons, deux par jour au plus, et on passe au suivant quand tout le monde a fait le sien. À chaque maillon, l’affiche se dévoile un peu.",
  },

  /* ── La montée de rang (Louis, 2026-10-26 : « quand tu passes d'un
     rang, le guide te dit toujours la même chose […] aucune
     personnalisation, aucune originalité ») ──
     Avant, une phrase pour les cinq rangs, où seuls le nom et le seuil
     changeaient (« Te voilà Or. 350 EXP, posés une action après
     l’autre. »). Désormais une phrase PAR RANG, et chacune parle de TON
     chemin, lu sur la carte du rang (`contexteMontee`, lib/motRang.ts) :
     les séances faites, celles depuis le rang d'avant, le jour où tu as
     commencé. Elle ne redit ni le rang (la gemme et le nom le disent en
     grand) ni les cadeaux (les tuiles du dessous les montrent).
     ⚠️ UN CHIFFRE NE SE DIT QUE SI LA CARTE LE PORTE. Sans elle (la base
     n'a pas répondu, ou un admin rejoue un rang pas encore atteint), le
     rang garde sa phrase, sans chiffre.
     ⚠️ JAMAIS UN PETIT CHIFFRE QUI RAPETISSE : « une séance depuis
     l’Argent » ne se dit pas, on prend un autre angle.
     ⚠️ DEUX LIGNES AU PLUS dans la bulle à 360 px : `check:rangs` borne
     la plus longue de chaque rang.
     Le Bronze n'a pas de phrase : on l'a dès l'inscription, il ne se
     gagne jamais (`cleMontee` le refuse). */
  "rang.montee.argent": {
    commun: (c) => (c.jours === 1
      ? "Ton premier rang arrive dès ton premier jour."
      : c.seances
        ? `Ton premier rang arrive après ${seancesDites(c.seances)}.`
        : "Te voilà Argent, ton premier rang."),
  },
  "rang.montee.or": {
    commun: (c) => ((c.seancesDepuis ?? 0) >= 2
      ? `Tu as fait ${seancesDites(c.seancesDepuis)} depuis l’Argent, et te voilà Or.`
      : (c.seances ?? 0) >= 2
        ? `Te voilà Or, avec ${seancesDites(c.seances)} depuis ton arrivée.`
        : "Te voilà Or, ton deuxième rang."),
  },
  "rang.montee.platine": {
    commun: (c) => (c.debut && (c.seances ?? 0) >= 2
      ? `Tu as commencé le ${c.debut}. Depuis, tu as fait ${seancesDites(c.seances)}.`
      : c.debut
        ? `Tu as commencé le ${c.debut}, et te voilà Platine.`
        : "Te voilà Platine. Il reste deux rangs au-dessus du tien."),
  },
  "rang.montee.diamant": {
    commun: (c) => ((c.seances ?? 0) >= 3
      ? `Après ${seancesDites(c.seances)}, il ne reste que l’Éternel au-dessus de toi.`
      : "Il ne reste que l’Éternel au-dessus de toi."),
  },
  "rang.montee.eternel": {
    commun: (c) => ((c.seances ?? 0) >= 3
      ? `C’est le dernier rang de Vaiiya. Tu l’as atteint en ${seancesDites(c.seances)}.`
      : "C’est le dernier rang de Vaiiya, et tu l’as atteint."),
  },

  /* ── L'avis ────────────────────────────────────────────────────────
     Demandé une seule fois, après un pic. On ne demande jamais un « bon »
     avis, et la suite (Trustpilot) est proposée quelle que soit la note. */
  "avis.question.seances": { commun: "Trois séances déjà. Vaiiya te plaît\u00a0?" },
  "avis.question.rang":    { commun: (c) => `Te voilà ${c.rang}. Vaiiya te plaît\u00a0?` },
  "avis.question.relais":  { commun: "Relais gagné. Vaiiya te plaît\u00a0?" },
  "avis.ecrire": { commun: "Merci\u00a0! Tu veux dire en une phrase ce qui t’aide, ou ce qui manque\u00a0?" },
  "avis.merci":  { commun: "On lit chaque avis. Si tu veux aller plus loin, tu peux aussi le dire sur Trustpilot\u00a0: c’est là que les gens nous découvrent." },
} satisfies Record<string, Replique>;

/** Toutes les clés existantes. Une faute de frappe ne compile pas. */
export type CleVoix = keyof typeof REPLIQUES;

/** La phrase du Guide pour cette clé. Tant qu'une réplique n'a pas de
 *  variante, le Guide passé ne change rien : c'est l'état de la phase 0. */
/* ⚠️ NORA ET SASHA PARLENT PAREIL (Louis, 2026-09-25) : toujours positifs,
   toujours encourageants, le même ton. Leurs variantes reproduisaient un
   biais de genre (elle explique et rassure, lui va droit au but), donc on
   rend la version COMMUNE pour les deux. Les variantes `nora` / `sasha`
   restent écrites dans les tables mais ne sont plus lues : les supprimer
   est un ménage à faire, pas une urgence. Ne pas les rebrancher. */
export function voix(_guide: GuideRef, cle: CleVoix, ctx: ContexteVoix = {}): string {
  const r: Replique = REPLIQUES[cle];
  const rendu = r.commun;
  return typeof rendu === "function" ? rendu(ctx) : rendu;
}

/* ════════════════════════════════════════════════════════════════════
   LE MOT DU JOUR · LA BANQUE (Louis, GO du 2026-10-18 sur la page « Le
   mot du jour » du canevas « Les rangs et le profil »).

   Chaque jour, le Guide laisse un mot de trois pièces : une ACCROCHE (ce
   qui compte aujourd'hui), les FAITS du jour (sa flamme, son programme),
   puis un CONSEIL. Ce bloc n'écrit que les mots. Ce qui choisit vit dans
   `lib/motDuJour.ts`, pur, et `check:matin` le vérifie.

   ⚠️ TOUT RESTE VRAI LE JOUR OÙ C'EST DIT. Les faits viennent de la base,
   jamais d'une estimation. Les conseils ne promettent rien sur le corps
   et ne sont pas des avis médicaux.
   ⚠️ JAMAIS UN REPROCHE : ni séance manquée, ni série coupée, ni « il
   faudrait ». Une flamme qui repart d'une Lueur se dit comme un départ.
   ⚠️ AUCUN ACCORD DE GENRE (ni « prêt », ni « content », ni « fier »),
   et Nora et Sasha disent la même chose (`voix` ne lit plus les
   variantes depuis le 2026-09-25).
   ⚠️ UN NOMBRE SE MARQUE ⟦12⟧ : l'écran le pose dans le visage du
   chiffre (`.vy-nombre`), `texteBrut` le rend en clair (lecteur d'écran,
   question reprise par le Guide). Un nombre écrit en lettres reste du
   texte, comme on le dit.
   ⚠️ LA TYPOGRAPHIE SE POSE AU RENDU (`typoMatin`) : espace insécable
   avant « : ; ? ! % », apostrophe courbe. La banque s'écrit donc avec des
   espaces ordinaires, et l'écran reçoit toujours le bon caractère.
   ════════════════════════════════════════════════════════════════════ */

/** Ce qu'une pièce du mot peut insérer. Tout vient de l'appelant. */
export type ContexteMatin = {
  /** Les jours de la série en cours. */
  serie?: number;
  /** La flamme du jour, avec sa préposition (« au Feu ») ou son article (« le Feu »). */
  au?: string;
  le?: string;
  /** La flamme suivante, avec son article (« le Brasier ») ou seule (« Brasier »). */
  suivanteLe?: string;
  suivanteNom?: string;
  /** Les jours avant la flamme suivante. */
  restant?: number;
  /** Une séance : son titre, et sa durée en minutes quand on la connaît. */
  titre?: string;
  minutes?: number;
  /** L'étape du programme, et le jour qui lui est déjà donné (« mardi 8 »). */
  etape?: string;
  jour?: string;
  /** Un rang à portée : l'EXP qui reste et son nom. */
  manque?: number;
  rang?: string;
  /** Les repas notés hier. */
  repas?: number;
  /** Le maillon du relais qui attend. */
  maillon?: number;
  /** Le mois qui commence (« novembre »). */
  mois?: string;
  /** Les jokers qui restent ce mois-ci, le matin où un joker a gardé hier. */
  jokers?: number;
};

type TexteMatin = string | ((c: ContexteMatin) => string);
export type PieceMatin = { id: string; texte: TexteMatin };
export type ConseilMatin = {
  id: string;
  texte: string;
  /** Le chiffre posé en grand à côté du texte (« 7 h »). */
  nombre?: string;
  /** Le nom EXACT d'un mouvement de la bibliothèque : sa vignette animée
   *  accompagne le conseil, et sa fiche s'ouvre d'un geste. */
  mouvement?: string;
  /** Respirer : inspire, garde, expire, attends, en secondes. */
  rythme?: readonly [number, number, number, number];
};

const nb = (v: number | string | undefined) => `⟦${v ?? ""}⟧`;
const NOMBRE = /⟦([^⟧]*)⟧/g;

/** Le texte découpé en morceaux : ce qui est un nombre, et le reste. */
export function morceauxMatin(s: string): { texte: string; nombre: boolean }[] {
  const out: { texte: string; nombre: boolean }[] = [];
  let i = 0;
  for (const m of s.matchAll(NOMBRE)) {
    const debut = m.index ?? 0;
    if (debut > i) out.push({ texte: s.slice(i, debut), nombre: false });
    out.push({ texte: m[1], nombre: true });
    i = debut + m[0].length;
  }
  if (i < s.length) out.push({ texte: s.slice(i), nombre: false });
  return out;
}

/** Le texte sans ses marques de nombre. */
export function texteBrut(s: string): string {
  return s.replace(NOMBRE, "$1");
}

/** Espace insécable et apostrophe courbe, posées au rendu. */
export function typoMatin(s: string): string {
  return s
    .replace(/'/g, "’")
    .replace(/ ([:;?!%])/g, " $1")
    .replace(/ °/g, " °")
    .replace(/« /g, "« ")
    .replace(/ »/g, " »");
}

const LETTRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
  "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf", "vingt"];
/* Les paliers ronds s'écrivent aussi en lettres : « Trente jours d’affilée ». */
const RONDS: Record<number, string> = { 30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante", 100: "cent" };
/** En lettres jusqu'à vingt et aux paliers ronds, comme on le dit, puis en chiffres. */
const enLettres = (n = 0) => LETTRES[n] ?? RONDS[n] ?? nb(n);
const maj = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
/** « ⟦18⟧ jours » : un compte qu'on lit comme une donnée. */
const nJours = (n = 0) => `${nb(n)} ${n > 1 ? "jours" : "jour"}`;
/** « douze jours », « ⟦42⟧ jours ». */
const depuis = (n = 0) => `${enLettres(n)} ${n > 1 ? "jours" : "jour"}`;
/** « Douze jours d’affilée ». */
const affilee = (n = 0) => maj(`${depuis(n)} d’affilée`);
/** La même chose pour une bulle de conversation (`ouverture.flamme`) :
 *  sans la marque ⟦ ⟧ du mot du jour, qu'une bulle n'affiche pas. */
const affileeDit = (n = 0) => maj(`${LETTRES[n] ?? RONDS[n] ?? String(n)} ${n > 1 ? "jours" : "jour"} d’affilée`);
/** « une séance », « vingt séances », « 120 séances » (`rang.montee.*`) :
 *  en lettres jusqu'à vingt et aux paliers ronds, comme on le dit, puis en
 *  chiffres, collés à leur mot par une espace insécable. */
const seancesDites = (n = 0) => {
  if (n === 1) return "une séance";
  const mot = LETTRES[n] ?? RONDS[n];
  return mot ? `${mot} séances` : `${n} séances`;
};
const deMois = (m = "") => (/^[aeiouéèêh]/i.test(m) ? `d’${m}` : `de ${m}`);
/** « Il t’en reste un ce mois-ci. » : un compte de jokers se dit en lettres. */
const resteJokers = (n = 0) =>
  n > 0 ? `Il t’en reste ${enLettres(n)} ce mois-ci.` : "Tes prochains jokers arrivent le 1er.";

const pieces = (prefixe: string, textes: TexteMatin[]): PieceMatin[] =>
  textes.map((texte, i) => ({ id: `${prefixe}.${i + 1}`, texte }));
const conseils = (prefixe: string, liste: Omit<ConseilMatin, "id">[]): ConseilMatin[] =>
  liste.map((c, i) => ({ id: `${prefixe}.${i + 1}`, ...c }));

/** La phrase d'une pièce, typographie comprise. */
export function direMatin(p: PieceMatin, c: ContexteMatin = {}): string {
  return typoMatin(typeof p.texte === "function" ? p.texte(c) : p.texte);
}

export const MATIN = {
  /* ── LES ACCROCHES ──────────────────────────────────────────────── */

  /** Le jour de la semaine, lundi d'abord. */
  jour: [
    pieces("jour.lundi", [
      "Lundi, nouvelle semaine : page blanche.",
      "Lundi. Une semaine neuve, à écrire comme tu veux.",
      "Début de semaine : on pose le rythme, sans se presser.",
      "Lundi, le jour où tout recommence, dans le bon sens.",
      "Nouvelle semaine : une séance aujourd’hui, et elle part du bon pied.",
      "Lundi : sept jours devant toi, et rien à rattraper.",
    ]),
    pieces("jour.mardi", [
      "Mardi : la semaine a pris son élan.",
      "Mardi, le bon jour pour garder le rythme, ou en trouver un.",
      "Mardi. Rien d’extraordinaire, et c’est souvent là que les habitudes se construisent.",
      "Mardi : un jour ordinaire, parfait pour avancer.",
      "Deuxième jour de la semaine : on continue tranquillement.",
      "Mardi. Pas besoin d’un grand plan, un petit pas suffit.",
    ]),
    pieces("jour.mercredi", [
      "Mercredi, le milieu de la semaine.",
      "Mercredi : la moitié de la semaine est déjà derrière toi.",
      "Milieu de semaine : un bon moment pour faire le point.",
      "Mercredi. Une séance aujourd’hui coupe la semaine en deux belles moitiés.",
      "Mercredi : on souffle un peu, et on repart.",
      "Mercredi, le sommet de la semaine : la suite descend toute seule.",
    ]),
    pieces("jour.jeudi", [
      "Jeudi : le week-end se rapproche.",
      "Jeudi. Encore un peu d’élan, et la semaine est belle.",
      "Jeudi, souvent le jour le plus chargé. Dix minutes de mouvement aident à souffler.",
      "Jeudi : la semaine tient bon.",
      "Jeudi. Une séance aujourd’hui, et le week-end arrive léger.",
      "Jeudi : plus que deux jours avant le week-end.",
    ]),
    pieces("jour.vendredi", [
      "Vendredi : une séance aujourd’hui, et le week-end commence léger.",
      "Vendredi. La semaine se termine, profite de cette énergie.",
      "C’est vendredi : un dernier effort avant de souffler.",
      "Vendredi, le jour où tout paraît plus léger.",
      "Vendredi : la semaine se boucle, à ton rythme.",
      "Vendredi. Ce que tu fais aujourd’hui, le week-end te le rendra.",
    ]),
    pieces("jour.samedi", [
      "Samedi : du temps pour toi.",
      "Samedi. Une séance sans regarder l’heure, ça te dit ?",
      "C’est le week-end : bouger, c’est aussi marcher, nager ou danser.",
      "Samedi : le bon jour pour essayer une séance que tu n’as jamais faite.",
      "Samedi. Repos ou séance, les deux comptent.",
      "Week-end : le rythme ralentit, et c’est très bien comme ça.",
    ]),
    pieces("jour.dimanche", [
      "Dimanche : le bon moment pour regarder ta semaine.",
      "Dimanche. Une journée calme pour souffler.",
      "Dimanche : on prépare la semaine qui vient, tranquillement.",
      "Dimanche. Une marche, une séance douce, ou rien du tout : à toi de voir.",
      "Fin de semaine : le bon jour pour une séance de mobilité.",
      "Dimanche. Demain commence une semaine neuve.",
    ]),
  ],

  /** Le moment de la journée, à l'heure où le mot est ouvert. */
  moment: {
    aube: pieces("moment.aube", [
      "Le jour se lève à peine, et tu es déjà là.",
      "Bonjour. Le matin, tout est encore possible.",
      "Un matin tout neuf. Un verre d’eau, et c’est parti.",
      "Début de journée : le moment parfait pour une séance courte.",
      "Le matin, le corps se réveille doucement : prends le temps de t’étirer.",
      "Bonjour. Une journée entière devant toi.",
    ]),
    midi: pieces("moment.midi", [
      "Midi : une pause qui peut aussi devenir une séance.",
      "Pause de midi. Dix minutes de marche, et l’après-midi passe mieux.",
      "Il est midi : le bon moment pour noter ton repas.",
      "Milieu de journée : on souffle un instant.",
      "Midi. La journée est à moitié faite.",
      "L’heure du déjeuner : prends le temps de manger tranquillement.",
    ]),
    apresmidi: pieces("moment.apresmidi", [
      "L’après-midi avance, la journée aussi.",
      "Un petit coup de mou cet après-midi ? Deux minutes debout aident à repartir.",
      "L’après-midi : encore de quoi glisser une séance avant ce soir.",
      "Il reste une belle partie de la journée.",
      "Après-midi. Un verre d’eau, et la suite de la journée.",
      "L’après-midi, le corps est souvent au mieux de sa forme pour l’effort.",
    ]),
    soir: pieces("moment.soir", [
      "La journée touche à sa fin.",
      "Bonsoir. Le moment de ralentir.",
      "Ce soir, une séance courte ou un peu de mobilité, à toi de voir.",
      "La soirée commence : prends un moment pour toi.",
      "Fin de journée : ce qui a été fait aujourd’hui compte.",
      "Le soir, quelques étirements préparent une bonne nuit.",
    ]),
    nuit: pieces("moment.nuit", [
      "Il est tard : ce soir, le plus utile est sans doute de bien dormir.",
      "Tard dans la soirée. Une bonne nuit fait partie du programme.",
      "Il est tard. Demain sera une belle journée pour bouger.",
      "À cette heure-ci, le meilleur entraînement, c’est le sommeil.",
      "La nuit est là : laisse ton corps récupérer.",
      "Encore debout ? Le repos aussi fait progresser.",
    ]),
  },

  /** Une séance terminée hier, dont on connaît le titre. */
  hierSeance: pieces("hier.seance", [
    (c) => `Hier, tu as terminé ${c.titre}. Aujourd’hui, ton corps se reconstruit.`,
    (c) => `Hier, ${c.titre}${c.minutes ? ` en ${nb(c.minutes)} minutes` : ""}. Bien joué.`,
    (c) => `Ta séance d’hier, ${c.titre}, est dans la boîte.`,
    (c) => `Hier, tu as fait ${c.titre}. Et te revoilà aujourd’hui.`,
    (c) => `${c.titre}, c’était hier. Aujourd’hui, à toi de choisir la suite.`,
    (c) => `Belle séance hier : ${c.titre}.`,
    (c) => `Hier, tu as bougé : ${c.titre}. Aujourd’hui peut être plus calme.`,
    (c) => `${c.titre} hier, et te voilà aujourd’hui : c’est comme ça que ça avance.`,
    (c) => `Hier, tu as terminé ${c.titre}. Un peu plus d’eau aujourd’hui aide ton corps à récupérer.`,
    (c) => `Une séance hier : ${c.titre}. Tout ce que tu fais s’additionne.`,
    (c) => `Hier, ${c.titre}. Aujourd’hui, on garde l’élan, à ton rythme.`,
    (c) => `Hier, ${c.titre}. Le fil continue aujourd’hui.`,
  ]),
  /** Une séance hier dont le titre n'est pas lisible. */
  hierSeanceAnonyme: pieces("hier.anonyme", [
    "Hier, tu as terminé une séance. Aujourd’hui, ton corps se reconstruit.",
    "Une séance hier : tout ce que tu fais s’additionne.",
  ]),
  /** Pas de séance hier, mais des repas notés. */
  hierRepas: pieces("hier.repas", [
    (c) => `Hier, tu as noté ${nb(c.repas)} repas : ton carnet se remplit.`,
    "Hier, ton carnet de repas a avancé. C’est la base pour y voir clair.",
    (c) => `Hier, ${nb(c.repas)} repas ${(c.repas ?? 0) > 1 ? "notés" : "noté"}. Petit geste, grande clarté.`,
    "Hier, tu as pris le temps de noter ce que tu as mangé. Ça aide à voir ce qui te convient.",
  ]),

  /* Hier, un joker a gardé la série (2026-10-24, maquette « Le passage de
     rang »). On dit ce qu'il a gardé, jamais ce qui n'a pas été fait. */
  joker: pieces("joker", [
    (c) => `Hier, ton joker a gardé ta série. ${resteJokers(c.jokers)}`,
    (c) => `Un joker s’est posé hier, et ta série continue. ${resteJokers(c.jokers)}`,
    (c) => `Ta série a tenu hier grâce à un joker. ${resteJokers(c.jokers)}`,
  ]),

  /** Un rang à portée d'une séance (`momentAccueil`, cas « palier »). */
  palier: pieces("palier", [
    (c) => `Plus que ${nb(c.manque)} EXP avant ${c.rang} : une séance suffit.`,
    (c) => `${c.rang} est à ${nb(c.manque)} EXP. Une séance, et tu y es.`,
    (c) => `Encore ${nb(c.manque)} EXP, et ton rang passe à ${c.rang}.`,
    (c) => `${c.rang} n’est plus très loin : ${nb(c.manque)} EXP.`,
    (c) => `Une séance aujourd’hui, et ${c.rang} est à toi.`,
    (c) => `${nb(c.manque)} EXP te séparent de ${c.rang}.`,
  ]),

  /* Le retour après une absence. On dit ce qui n'a pas bougé, jamais ce
     qui s'est arrêté (même règle que `retour.*`). */
  retourCourt: pieces("retour.court", [
    "Ça fait plaisir de te revoir.",
    "Te revoilà. Ta place n’a pas bougé.",
    "Te revoilà, et c’est tout ce qui compte.",
    "Bon retour. On reprend là où tu veux.",
  ]),
  retourLong: pieces("retour.long", [
    "Ça fait plaisir de te revoir. Tout est encore là.",
    "Te revoilà. Il n’y a rien à rattraper.",
    "Bon retour. On repart tout doucement, à ton rythme.",
    "Te revoilà. Tes séances et ta place t’attendaient.",
  ]),
  /** Les premiers jours, avant deux séances. */
  debut: pieces("debut", [
    "On commence quand tu veux.",
    "Bienvenue dans tes premiers jours sur Vaiiya.",
    "Les débuts, c’est le meilleur moment : tout est à découvrir.",
    "Premiers pas ensemble : on y va doucement.",
    "Tu découvres Vaiiya, et je suis là pour t’accompagner.",
  ]),

  /* Le relais. ⚠️ On ne nomme jamais celui qui attend ou qui retarde :
     on dit où en est l'affiche. */
  relais: {
    a_moi: pieces("relais.a_moi", [
      "Ton relais t’attend : une séance aujourd’hui, et l’affiche se dévoile un peu plus.",
      (c) => `Ton maillon ${nb(c.maillon)} attend ta séance du jour.`,
      "Dix minutes de séance suffisent pour franchir ton maillon du jour.",
      "Aujourd’hui, ta séance fait aussi avancer le relais.",
      "L’affiche du relais attend la suite : à toi de jouer.",
    ]),
    bloque: pieces("relais.bloque", [
      "Ton maillon est franchi : le relais avance au rythme de chacun.",
      "De ton côté, le relais est à jour.",
      "Ta part du relais est faite : l’affiche attend la suite.",
      "Ton dernier maillon est posé. La suite du relais arrive.",
    ]),
    plafond_jour: pieces("relais.plafond", [
      "Deux maillons aujourd’hui : c’est le maximum du jour, la suite demain.",
      "Ton relais a bien avancé aujourd’hui. La suite se joue demain.",
    ]),
    fini_pour_moi: pieces("relais.fini_moi", [
      "Tous tes maillons sont franchis : l’affiche se termine avec les derniers.",
      "Ta part du relais est complète.",
      "Tu as franchi tous tes maillons. L’affiche est presque complète.",
    ]),
    fini: pieces("relais.fini", [
      "Relais bouclé : l’affiche est entièrement dévoilée.",
      "L’affiche du relais est complète. Bravo à vous.",
      "Votre affiche est complète : elle rejoint ta collection.",
    ]),
  } as Partial<Record<string, PieceMatin[]>>,

  /** L'âge du compte, au jour près. */
  anniv: {
    7: { id: "anniv.7", texte: "Une semaine que tu es sur Vaiiya." },
    30: { id: "anniv.30", texte: "Il y a un mois, tu ouvrais Vaiiya pour la première fois." },
    100: { id: "anniv.100", texte: "Cent jours depuis ton arrivée sur Vaiiya." },
    182: { id: "anniv.182", texte: "Six mois que tu es sur Vaiiya." },
    365: { id: "anniv.365", texte: "Il y a un an, tu ouvrais Vaiiya pour la première fois." },
  } as Partial<Record<number, PieceMatin>>,

  /** Le premier jour du mois. */
  mois: pieces("mois", [
    (c) => `Premier jour ${deMois(c.mois)} : un mois tout neuf.`,
    (c) => `${maj(c.mois)} commence : une page blanche, et tout l’espace pour y écrire.`,
    "Nouveau mois, même envie : on avance à ton rythme.",
    (c) => `Le premier ${c.mois}, c’est le bon jour pour se fixer une petite envie.`,
    "Un nouveau mois commence : on avance pas à pas.",
    (c) => `Bienvenue en ${c.mois}. Un mois neuf, à écrire comme tu veux.`,
  ]),

  /** Les trois premiers jours d'une saison, et la rentrée. */
  saison: {
    printemps: pieces("saison.printemps", [
      "Le printemps commence : les jours rallongent, et l’envie de bouger avec.",
      "Premiers jours du printemps. Une séance dehors, ça te dit ?",
      "Le printemps est là : la lumière revient, une marche au soleil compte aussi.",
    ]),
    ete: pieces("saison.ete", [
      "L’été commence : les journées sont au plus long.",
      "Premiers jours de l’été : bouge plutôt le matin ou le soir, quand il fait plus frais.",
      "L’été est là : une gourde à portée de main, et c’est parti.",
    ]),
    automne: pieces("saison.automne", [
      "L’automne commence : les jours raccourcissent, une séance à midi profite de la lumière.",
      "Premiers jours d’automne : le bon moment pour installer une routine qui tiendra tout l’hiver.",
      "L’automne est là. Une marche dans les feuilles compte aussi.",
    ]),
    hiver: pieces("saison.hiver", [
      "L’hiver commence : à partir de maintenant, les jours rallongent.",
      "Premiers jours d’hiver : une séance chez toi n’attend pas la météo.",
      "L’hiver est là : un bon échauffement compte encore plus quand il fait froid.",
    ]),
    rentree: pieces("saison.rentree", [
      "C’est la rentrée : le bon moment pour poser une nouvelle routine.",
      "Septembre, nouveau départ. On reprend un rythme, à ton allure.",
      "Rentrée : une séance par semaine, c’est déjà un vrai début.",
    ]),
  } as Record<"printemps" | "ete" | "automne" | "hiver" | "rentree", PieceMatin[]>,

  /** Les jours validés de la semaine viennent d'atteindre 3, 5 ou 7. */
  semaine: {
    3: pieces("semaine.3", [
      "Trois jours validés cette semaine : la Semaine active est à toi.",
      "Trois jours validés, et la semaine n’est pas finie.",
      "Déjà trois jours validés cette semaine. Belle régularité.",
      "Trois jours sur la semaine : la Semaine active est faite.",
    ]),
    5: pieces("semaine.5", [
      "Cinq jours validés cette semaine. C’est une vraie routine.",
      "Cinq jours sur sept, déjà : la semaine est belle.",
      "Cinq jours validés : ta semaine tient bon.",
      "Déjà cinq jours validés cette semaine.",
    ]),
    7: pieces("semaine.7", [
      "Sept jours validés : ta semaine est parfaite.",
      "Une semaine complète, sept jours sur sept.",
      "Sept sur sept cette semaine. Rien à ajouter.",
      "La Semaine parfaite est à toi : sept jours validés.",
    ]),
  } as Partial<Record<number, PieceMatin[]>>,

  /* ── LES FAITS : LA FLAMME ──────────────────────────────────────── */
  flamme: {
    /** Le premier jour d'une série, sans absence derrière. */
    debut: pieces("flamme.debut", [
      (c) => `Premier jour de ta série : ta flamme s’allume. Plus que ${nJours(c.restant)} avant ${c.suivanteLe}.`,
      (c) => `Ta flamme s’allume aujourd’hui : une Lueur. ${maj(c.suivanteLe)} arrive dans ${nJours(c.restant)}.`,
      (c) => `Une Lueur pour commencer. Encore ${nJours(c.restant)}, et elle devient ${c.suivanteLe}.`,
      (c) => `Ta série commence aujourd’hui. Dans ${nJours(c.restant)}, ta flamme grandit.`,
      (c) => `Jour un de ta série : ta Lueur est allumée. ${maj(c.suivanteLe)} arrive dans ${nJours(c.restant)}.`,
    ]),
    /** Le premier jour d'une série, au retour d'une absence. */
    repart: pieces("flamme.repart", [
      "Ta flamme repart d’une Lueur, et c’est exactement comme ça qu’elle grandit.",
      (c) => `Une nouvelle Lueur s’allume aujourd’hui. Dans ${nJours(c.restant)}, c’est déjà ${c.suivanteLe}.`,
      (c) => `Ta série repart aujourd’hui. ${maj(c.suivanteLe)} est à ${nJours(c.restant)}.`,
      "Une Lueur, pour recommencer en douceur.",
      (c) => `Ta flamme se rallume. Encore ${nJours(c.restant)}, et elle grandit.`,
    ]),
    /** Une série qui tient, entre deux flammes. */
    courante: pieces("flamme.courante", [
      (c) => `${affilee(c.serie)}, ta flamme est ${c.au}. Plus que ${nJours(c.restant)} avant ${c.suivanteLe}.`,
      (c) => `Ta flamme tient depuis ${depuis(c.serie)} : encore ${nJours(c.restant)} avant ${c.suivanteLe}.`,
      (c) => `${affilee(c.serie)}. Ta flamme est ${c.au}, et ${c.suivanteLe} arrive dans ${nJours(c.restant)}.`,
      (c) => `Ta série compte ${depuis(c.serie)}. Prochaine flamme : ${c.suivanteNom}, dans ${nJours(c.restant)}.`,
      (c) => `${affilee(c.serie)} : ta flamme est ${c.au}, et elle grandit encore. ${maj(c.suivanteLe)} dans ${nJours(c.restant)}.`,
      (c) => `${affilee(c.serie)}. Dans ${nJours(c.restant)}, ta flamme devient ${c.suivanteLe}.`,
      (c) => `${affilee(c.serie)}, et ta flamme est ${c.au}. ${maj(c.suivanteLe)} t’attend dans ${nJours(c.restant)}.`,
      (c) => `Ta flamme brûle depuis ${depuis(c.serie)}. Encore ${nJours(c.restant)}, et c’est ${c.suivanteLe}.`,
    ]),
    /** Le jour où une flamme arrive : c'est l'accroche du mot. */
    nouvelle: pieces("flamme.nouvelle", [
      (c) => `${affilee(c.serie)} : ta flamme devient ${c.le}.`,
      (c) => `Nouvelle flamme aujourd’hui : ${c.le}, après ${depuis(c.serie)} d’affilée.`,
      (c) => `${affilee(c.serie)}, et ta flamme passe ${c.au}.`,
    ]),
    /** Sous une nouvelle flamme : la suivante. */
    suite: pieces("flamme.suite", [
      (c) => `Plus que ${nJours(c.restant)} avant ${c.suivanteLe}.`,
      (c) => `${maj(c.suivanteLe)} t’attend dans ${nJours(c.restant)}.`,
      (c) => `Prochaine flamme : ${c.suivanteNom}, dans ${nJours(c.restant)}.`,
    ]),
    /** Sous le Feu sacré tout neuf : il n'y a pas de suivante. */
    sacre: pieces("flamme.sacre", [
      "C’est la plus belle flamme de Vaiiya.",
      "Il n’y a pas de flamme plus haute.",
    ]),
    /** Au-delà de cent jours. */
    sommet: pieces("flamme.sommet", [
      (c) => `${affilee(c.serie)} : ta flamme est au Feu sacré, à son plus beau.`,
      (c) => `Ta flamme est au Feu sacré depuis ${nJours((c.serie ?? 100) - 99)}.`,
      (c) => `${affilee(c.serie)}. Le Feu sacré, la plus belle flamme de Vaiiya, est la tienne.`,
      (c) => `Feu sacré, ${depuis(c.serie)} d’affilée. Rien ne brille plus fort.`,
      (c) => `${affilee(c.serie)}, toujours au Feu sacré.`,
    ]),
  },

  /* ── LES FAITS : LE PROGRAMME ───────────────────────────────────── */
  plan: {
    seance: pieces("plan.seance", [
      (c) => `Aujourd’hui, ${c.titre} t’attend.`,
      (c) => `Au programme aujourd’hui : ${c.titre}.`,
      (c) => `Ta séance du jour : ${c.titre}, quand tu veux.`,
      (c) => `Aujourd’hui, c’est ${c.titre}.`,
      (c) => `${c.titre} est au programme du jour.`,
    ]),
    /** Même chose, quand le conseil du jour est le geste d'un de ses mouvements. */
    seanceGeste: pieces("plan.seance.geste", [
      (c) => `Aujourd’hui, ${c.titre} t’attend : voilà le geste d’un de ses mouvements.`,
      (c) => `Au programme : ${c.titre}. Un de ses mouvements a son geste juste en dessous.`,
      (c) => `${c.titre} est au programme du jour, et voilà un geste à garder en tête.`,
      (c) => `Ta séance du jour : ${c.titre}. Juste en dessous, un geste qui en fait partie.`,
    ]),
    etape: pieces("plan.etape", [
      (c) => `Ton programme te propose ${c.etape}, quand tu veux.`,
      (c) => `Prochaine étape de ton programme : ${c.etape}.`,
      (c) => `${c.etape} est la suite de ton programme : tu choisis le moment.`,
      (c) => `Ton programme continue avec ${c.etape}, quand ça t’arrange.`,
      (c) => `La suite, c’est ${c.etape}. Aujourd’hui ou un autre jour, à toi de voir.`,
    ]),
    etapeGeste: pieces("plan.etape.geste", [
      (c) => `Ton programme te propose ${c.etape}, quand tu veux : voilà un geste qui en fait partie.`,
      (c) => `Prochaine étape : ${c.etape}. Juste en dessous, un de ses mouvements.`,
      (c) => `La suite de ton programme, c’est ${c.etape}. Voilà le geste d’un de ses mouvements.`,
    ]),
    /** L'étape a déjà un jour, plus tard. */
    etapeJour: pieces("plan.etape.jour", [
      (c) => `Ta prochaine séance, ${c.etape}, est prévue ${c.jour}.`,
      (c) => `${c.etape} t’attend ${c.jour}.`,
      (c) => `Prochaine étape : ${c.etape}, ${c.jour}.`,
    ]),
    fait: pieces("plan.fait", [
      "Ta séance du jour est déjà faite. Profite du reste de la journée.",
      (c) => `Ta séance est faite${c.titre ? ` : ${c.titre}` : ""}${c.minutes ? `, ${nb(c.minutes)} minutes` : ""}.`,
      "Séance faite aujourd’hui. Le reste de la journée est à toi.",
      "C’est fait pour aujourd’hui : bois un peu d’eau, et savoure.",
    ]),
    repos: pieces("plan.repos", [
      "Aujourd’hui, c’est repos. Passer ici suffit à tenir ta flamme.",
      "Jour de repos : c’est là que le corps se reconstruit.",
      "Repos aujourd’hui, comme prévu. Ta flamme tient avec ta visite.",
      "Aujourd’hui, on récupère : le repos fait partie du programme.",
    ]),
    libre: pieces("plan.libre", [
      "Rien de prévu aujourd’hui. Si l’envie te prend, je te prépare quelque chose.",
      "Aucune séance prévue aujourd’hui : la journée est libre.",
      "Journée libre. Une envie de bouger ? Dis-le-moi, je te prépare une séance.",
      "Rien au planning aujourd’hui. Une marche compte aussi.",
    ]),
    /** Au retour d'une absence : la séance courte du conseil, juste en dessous. */
    retour: pieces("plan.retour", [
      "Rien à rattraper : une séance courte aujourd’hui, et c’est reparti.",
      "Pas besoin de tout reprendre d’un coup : une séance courte suffit.",
      "On repart en douceur : juste en dessous, une séance courte.",
    ]),
    /** Les premiers jours : la première séance, juste en dessous. */
    commencer: pieces("plan.commencer", [
      "Pour commencer, une séance courte t’attend juste en dessous.",
      "Juste en dessous, une première séance courte.",
      "Le plus simple pour commencer est juste en dessous.",
    ]),
  },
};

/* ── LES CONSEILS ────────────────────────────────────────────────────
   ⚠️ Des faits établis, formulés prudemment (« souvent », « en général »),
   et rien qui ressemble à un diagnostic ou à une promesse sur le corps.
   Un `mouvement` est le nom EXACT d'une entrée de la bibliothèque :
   `check:matin` vérifie qu'il existe et qu'il est animé. */
export const CONSEILS_MATIN = {
  /** « Le savais-tu ? ». */
  savais: conseils("savais", [
    { nombre: "150", texte: "L’OMS conseille aux adultes 150 à 300 minutes d’activité modérée par semaine, à répartir comme on veut." },
    { nombre: "2", texte: "Renforcer ses muscles au moins deux jours par semaine fait aussi partie des recommandations de l’OMS." },
    { nombre: "48 h", texte: "Après une séance intense, un muscle a souvent besoin de 48 à 72 heures pour récupérer." },
    { nombre: "600", texte: "Le corps humain compte plus de 600 muscles." },
    { nombre: "206", texte: "Le squelette d’un adulte compte 206 os." },
    { nombre: "60 %", texte: "L’eau représente environ 60 % du poids d’un adulte." },
    { nombre: "40 %", texte: "Les muscles représentent jusqu’à 40 % du poids du corps." },
    { nombre: "66", texte: "Il faut en moyenne 66 jours pour qu’une habitude devienne automatique, avec de grands écarts d’une personne à l’autre." },
    { texte: "Pour l’OMS, chaque minute d’activité compte : il n’y a plus de durée minimale pour qu’un effort soit utile." },
    { nombre: "2 %", texte: "Perdre 2 % de son poids en eau suffit à faire baisser les performances." },
    { nombre: "3", texte: "Le squat fait travailler trois grands groupes à la fois : quadriceps, fessiers et ischio-jambiers." },
    { texte: "Le grand fessier est le plus gros muscle du corps." },
    { texte: "Le tendon d’Achille est le tendon le plus solide du corps." },
    { nombre: "20 %", texte: "Au repos, le cerveau consomme environ 20 % de l’énergie du corps." },
    { nombre: "60", texte: "Au repos, le cœur d’un adulte bat en général entre 60 et 100 fois par minute." },
    { texte: "Après une pause, les muscles retrouvent plus vite un niveau déjà atteint : on parle de mémoire musculaire." },
    { texte: "Un muscle se renforce surtout pendant la récupération, pas pendant la séance elle-même." },
    { texte: "Le cœur est un muscle : comme les autres, il se renforce avec l’entraînement." },
    { nombre: "5 min", texte: "Cinq à dix minutes d’échauffement préparent les muscles et les articulations à l’effort." },
    { nombre: "30 s", texte: "Un étirement se tient en général 20 à 30 secondes, sans à-coups." },
    { texte: "L’échauffement augmente la température des muscles, ce qui les rend plus souples." },
    { texte: "Les os aussi s’adaptent à l’effort : porter, sauter et pousser les rendent plus solides." },
    { texte: "Le diaphragme est le principal muscle de la respiration." },
    { texte: "Rire fait travailler les abdominaux." },
    { nombre: "10 min", texte: "Dix minutes de marche, c’est environ mille pas." },
    { texte: "Expirer pendant l’effort et inspirer au retour aide à garder un rythme régulier." },
    { texte: "L’OMS conseille aussi de limiter le temps passé en position assise, et de le couper par des moments actifs." },
    { texte: "Après une séance, le corps continue de dépenser un peu plus d’énergie que d’habitude pendant quelques heures." },
    { texte: "La souplesse se travaille à tout âge, en s’étirant un peu, souvent." },
    { texte: "Varier les mouvements fait travailler les muscles sous des angles différents." },
  ]),
  /** Le soir : le sommeil, sous la même forme que « Le savais-tu ? ». */
  sommeil: conseils("sommeil", [
    { nombre: "7 h", texte: "On recommande aux adultes au moins sept heures de sommeil par nuit." },
    { nombre: "90 min", texte: "Un cycle de sommeil dure environ 90 minutes." },
    { texte: "Une grande part de l’hormone de croissance est libérée pendant le sommeil profond." },
    { texte: "Le sommeil aide aussi la mémoire : un geste appris dans la journée se consolide la nuit." },
    { nombre: "5 h", texte: "La caféine met environ cinq heures à perdre la moitié de son effet." },
    { nombre: "18 °C", texte: "Une chambre fraîche, autour de 18 °C, est souvent conseillée pour bien dormir." },
    { texte: "Se coucher et se lever à heures régulières aide le corps à trouver son rythme." },
    { texte: "La lumière des écrans le soir peut retarder l’endormissement." },
    { nombre: "20 min", texte: "Une sieste de 10 à 20 minutes repose sans gêner le sommeil de la nuit." },
    { texte: "Après une séance du soir, une douche tiède et un peu de calme aident à redescendre avant de dormir." },
    { texte: "C’est pendant le sommeil que le corps répare ce que la séance a sollicité." },
  ]),
  /** Une minute de respiration, avec son rythme. */
  respire: conseils("respire", [
    { rythme: [5, 0, 5, 0], mouvement: "Cohérence cardiaque", texte: "Inspire cinq secondes, expire cinq secondes. Six respirations par minute : une minute suffit pour se poser." },
    { rythme: [4, 0, 6, 0], texte: "Inspire quatre secondes, expire six secondes : une expiration plus longue aide à se poser." },
    { rythme: [4, 4, 4, 4], texte: "Inspire quatre secondes, garde l’air quatre secondes, expire quatre secondes, attends quatre secondes. Quatre tours." },
    { rythme: [5, 0, 5, 0], texte: "Inspire par le nez en gonflant le ventre, puis expire lentement par la bouche. Six fois." },
    { rythme: [4, 0, 6, 0], texte: "Une main sur le ventre, une sur la poitrine : laisse surtout bouger celle du bas." },
    { rythme: [5, 0, 5, 0], texte: "Épaules relâchées, mâchoire desserrée : trois grandes respirations, et c’est tout." },
    { rythme: [5, 0, 5, 0], texte: "Ferme les yeux et compte dix respirations lentes, en suivant le cercle." },
    { rythme: [4, 0, 4, 0], texte: "Inspire en levant les bras, expire en les laissant redescendre. Cinq fois, lentement." },
  ]),
  /** Récupérer : un geste doux, parfois avec son mouvement. */
  recup: conseils("recup", [
    { mouvement: "Cercles de hanches", texte: "Jour calme : cinq minutes de mobilité des hanches suffisent." },
    { texte: "Une marche tranquille de vingt minutes aide le corps à récupérer sans le fatiguer." },
    { texte: "Des courbatures après un nouvel effort, c’est normal : elles s’atténuent en général en quelques jours." },
    { texte: "Après une séance, boire de l’eau aide le corps à récupérer." },
    { mouvement: "Posture de l'enfant", texte: "La posture de l’enfant détend le bas du dos en une minute." },
    { mouvement: "Cat-cow", texte: "Le chat-vache réveille la colonne en douceur : dix allers-retours, lentement." },
    { texte: "Un jour sans séance n’est pas un jour vide : c’est là que le progrès s’installe." },
    { texte: "Rouler doucement les épaules en arrière dix fois relâche le haut du dos après une journée sur écran." },
    { texte: "Repos ne veut pas dire immobile : bouger doucement aide les muscles à récupérer." },
    { texte: "Si un muscle tire encore, une séance d’une autre zone lui laisse le temps de récupérer." },
    { mouvement: "Étirement mollet au mur", texte: "Contre un mur, trente secondes par mollet : idéal après une journée debout." },
    { mouvement: "Étirement pectoraux au mur", texte: "Ouvre la poitrine contre un mur : un bon geste après une journée penchée sur un écran." },
    { mouvement: "Torsion allongée", texte: "Une torsion allongée relâche le dos avant de dormir." },
    { mouvement: "Pigeon", texte: "Le pigeon ouvre les hanches en douceur : une minute de chaque côté." },
    { mouvement: "Thread the needle", texte: "Pour le haut du dos, le thread the needle fait tourner la colonne sans forcer." },
    { texte: "Alterner les zones d’une séance à l’autre laisse chaque muscle se reconstruire." },
    { mouvement: "World's greatest stretch", texte: "Un seul mouvement pour presque tout le corps : le world’s greatest stretch." },
  ]),
  /** Dans l'assiette. ⚠️ Jamais un régime ni une prescription. */
  nutrition: conseils("nutrition", [
    { texte: "Un peu de protéines à chaque repas aide les muscles à se réparer." },
    { texte: "Un verre d’eau au réveil, c’est une bonne façon de commencer la journée." },
    { texte: "Des légumes de plusieurs couleurs dans l’assiette, c’est plus de variété sans rien compter." },
    { texte: "Un repas qui tient au corps associe souvent des protéines, des féculents et des légumes." },
    { texte: "Manger lentement laisse le temps de sentir qu’on n’a plus faim." },
    { texte: "Un yaourt et quelques fruits secs font une collation simple avant une séance." },
    { texte: "Après l’effort, un repas avec des protéines et des glucides aide à récupérer." },
    { texte: "Pour une séance de moins d’une heure, l’eau suffit." },
    { texte: "Les lentilles et les pois chiches apportent à la fois des protéines et des fibres." },
    { texte: "Préparer un repas d’avance, c’est une décision de moins quand la journée est chargée." },
    { texte: "Les œufs sont l’une des sources de protéines les plus simples à cuisiner." },
    { texte: "Le petit-déjeuner n’est pas obligatoire : ce qui compte, c’est ce qui te convient." },
    { texte: "Les féculents complets tiennent plus longtemps au corps que leur version raffinée." },
    { texte: "Une gourde à portée de main, et on boit sans y penser." },
    { texte: "Aucun aliment n’est interdit : c’est l’ensemble de la semaine qui compte." },
    { texte: "Le fromage blanc et le skyr sont riches en protéines et faciles à emporter." },
    { texte: "Les épices et les herbes donnent du goût sans rien changer au reste de l’assiette." },
    { texte: "Un fruit avant une séance du matin donne un peu d’énergie sans peser." },
    { texte: "Cuisiner en double, c’est un repas d’avance pour demain." },
    { texte: "Une photo suffit pour noter un repas, et ça prend dix secondes." },
  ]),
  /** Un mini-défi du quotidien. ⚠️ Il ne rapporte rien : pas d'EXP. */
  defi: conseils("defi", [
    { texte: "Prends l’escalier au moins une fois aujourd’hui." },
    { texte: "Marche pendant un appel au lieu de rester sur ta chaise." },
    { texte: "Dix squats pendant que l’eau chauffe." },
    { texte: "Une minute de gainage avant le dîner." },
    { texte: "Marche dix minutes après le déjeuner." },
    { texte: "Bois un grand verre d’eau avant chaque repas." },
    { texte: "Range ton téléphone dix minutes avant de dormir." },
    { texte: "Fais un tour à pied, même court." },
    { texte: "Vingt montées sur la pointe des pieds en te brossant les dents." },
    { texte: "Descends un arrêt plus tôt, ou gare-toi un peu plus loin." },
    { texte: "Trois fois dans la journée, redresse-toi et respire profondément." },
    { texte: "Tiens trente secondes en chaise contre un mur." },
    { texte: "Mets une chanson et bouge jusqu’à la fin." },
    { texte: "Étire ton dos dix secondes chaque fois que tu te lèves." },
    { texte: "Dix pompes avant midi, sur les genoux si tu veux." },
    { texte: "Un repas sans écran aujourd’hui." },
    { texte: "Cinq minutes de mobilité au réveil : épaules, hanches, chevilles." },
    { texte: "Note ton prochain repas avec une photo." },
    { texte: "Avant de t’asseoir pour le dîner, dix fentes." },
    { texte: "Lève-toi et étire-toi une minute à chaque heure de travail." },
  ]),
  /** Une question. La réponse ouvre la conversation avec le Guide. */
  question: conseils("question", [
    { texte: "Qu’est-ce qui t’a fait du bien cette semaine ?" },
    { texte: "Quel mouvement aimerais-tu réussir dans un mois ?" },
    { texte: "À quel moment de la journée préfères-tu t’entraîner ?" },
    { texte: "Qu’est-ce qui te donne envie de bouger, en ce moment ?" },
    { texte: "Si tu avais vingt minutes aujourd’hui, tu en ferais quoi ?" },
    { texte: "Quelle séance t’a le plus plu jusqu’ici ?" },
    { texte: "Qu’est-ce qui rendrait ta semaine plus simple ?" },
    { texte: "Tu préfères les séances courtes et intenses, ou longues et calmes ?" },
    { texte: "Il y a un exercice que tu évites ? Dis-moi lequel, on trouvera une autre façon de faire." },
    { texte: "Qu’est-ce que tu aimerais faire plus facilement dans trois mois ?" },
    { texte: "Comment tu te sens après une séance, en général ?" },
    { texte: "Qu’est-ce que tu manges quand tu as besoin d’énergie ?" },
    { texte: "Si tu devais garder une seule habitude de Vaiiya, ce serait laquelle ?" },
  ]),
  /** Les questions des premières semaines. */
  questionDebut: conseils("question.debut", [
    { texte: "Qu’est-ce qui t’a donné envie de commencer ?" },
    { texte: "Qu’est-ce que tu aimerais réussir, d’ici un mois ?" },
    { texte: "Il y a une activité que tu aimes déjà ? On peut partir de là." },
  ]),
  /** La question d'un jour qui compte : une flamme, un anniversaire. */
  evenement: {
    feu: { id: "question.feu", texte: "Sept jours d’affilée. Qu’est-ce qui t’aide à revenir chaque jour ?" },
    brasier: { id: "question.brasier", texte: "Trente jours, ce n’est pas un hasard. Qu’est-ce qui t’a aidé à tenir ?" },
    sacre: { id: "question.sacre", texte: "Cent jours. Si tu devais donner un conseil à quelqu’un qui commence, ce serait lequel ?" },
    anniv30: { id: "question.anniv30", texte: "Un mois avec Vaiiya : qu’est-ce qui t’a le plus aidé ?" },
    anniv365: { id: "question.anniv365", texte: "Une année ensemble. Qu’est-ce que tu retiens de ces douze mois ?" },
  } as Record<"feu" | "brasier" | "sacre" | "anniv30" | "anniv365", ConseilMatin>,
  /** Sous la séance courte d'un retour. */
  reprendre: conseils("reprendre", [
    { texte: "Une séance courte suffit pour reprendre le fil." },
    { texte: "Une séance courte, et tout se remet en route." },
    { texte: "Le plus dur, c’est la première minute. Le reste suit." },
    { texte: "Douze minutes sans matériel : de quoi reprendre en douceur." },
    { texte: "Pas besoin d’en faire beaucoup : l’important, c’est de recommencer." },
    { texte: "Tu choisis le rythme, je m’occupe du reste." },
  ]),
  /** Sous la première séance des premiers jours. */
  commencer: conseils("commencer", [
    { texte: "Une première séance courte, pour voir comment ça se passe." },
    { texte: "Je te guide mouvement par mouvement, du début à la fin." },
    { texte: "Le plus simple pour découvrir : une séance courte, à ton rythme." },
  ]),
};

/** Le texte d'un conseil, typographie comprise. */
export function direConseil(c: ConseilMatin): string {
  return typoMatin(c.texte);
}

/** « ⟦5⟧ jours validés · ⟦3⟧ séances · ⟦9⟧ repas notés ». Un compte à
 *  zéro ne s'écrit pas : « 0 séance » se lirait comme un reproche. */
export function compteSemaine({ jours, seances, repas }: { jours: number; seances: number; repas: number }): string {
  const parts: string[] = [];
  if (jours > 0) parts.push(`${nb(jours)} ${jours > 1 ? "jours validés" : "jour validé"}`);
  if (seances > 0) parts.push(`${nb(seances)} ${seances > 1 ? "séances" : "séance"}`);
  if (repas > 0) parts.push(`${nb(repas)} repas ${repas > 1 ? "notés" : "noté"}`);
  return parts.join(" · ");
}

/** Sous la semaine du dimanche : la mission de la semaine gagnée, ou à
 *  portée d'une action aujourd'hui. Le titre et l'EXP viennent du
 *  catalogue (`MISSIONS`), jamais d'ici. */
export const SEMAINE_MATIN = {
  faite: (titre: string, exp: number) => typoMatin(`La ${titre} est faite : +${exp} EXP.`),
  enVue: (titre: string) => typoMatin(`Une séance ou un repas noté aujourd’hui, et la ${titre} est à toi.`),
};

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
  /* ⚠️ `plan_retirer` MANQUAIT DEPUIS V9B, et il tombait donc sur
     `action.defaut` (« C'est noté ✦ ») : un filet correct, mais muet sur
     ce qui allait s'afficher. Repéré en ajoutant les trois gestes de
     V9C. */
  plan_retirer:  "action.plan_retirer",
  plan_ajouter:  "action.plan_ajouter",
  etape_substituer: "action.etape_substituer",
  etape_sauter:  "action.etape_sauter",
  adaptation_ouvrir: "action.adaptation_ouvrir",
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
      { title: "On commence par quoi ?",
        body: "Choisis une séance, je m’occupe du reste." },
    ],
    nora: [
      (c) => ({
        title: c.pseudo ? `Ta première séance, ${c.pseudo}` : "Ta première séance",
        body: "Quinze minutes, sans matériel. Je t’explique chaque geste.",
      }),
      { title: "102 mouvements animés t’attendent",
        body: "Tu peux voir comment ils se font avant de te lancer." },
      { title: "On commence par quoi ?",
        body: "Choisis une séance, je m’occupe du déroulé." },
    ],
    sasha: [
      (c) => ({
        title: c.pseudo ? `On commence, ${c.pseudo} ?` : "On commence ?",
        body: "Quinze minutes, sans matériel. Tout est prêt.",
      }),
      { title: "102 mouvements animés t’attendent",
        body: "Ouvre, regarde, choisis." },
      { title: "On commence par quoi ?",
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
      { title: "Un créneau aujourd’hui ?", body: "Quinze minutes suffisent pour que ça compte." },
    ],
    nora: [
      { title: "Ta séance t’attend", body: "Elle est prête, il n’y a plus qu’à ouvrir." },
      { title: "Un créneau aujourd’hui ?", body: "Quinze minutes suffisent pour que ça compte." },
    ],
    sasha: [
      { title: "Ta séance t’attend", body: "Elle est prête." },
      { title: "Un créneau aujourd’hui ?", body: "Quinze minutes, ça compte déjà." },
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
          ? `Il te reste ${c.maillons} maillons, et la semaine touche à sa fin. Un maillon aujourd’hui garde l’affiche à portée.`
          : "Sans ton dernier maillon aujourd’hui, elle restera incomplète. Une séance courte suffit.",
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
      { title: "Et tes repas ?", body: "Séance faite, il ne manque que ce que tu as mangé." },
      { title: "Il manque ta journée d’assiettes", body: "Deux minutes et ton suivi est complet." },
    ],
    nora: [
      { title: "Et tes repas ?", body: "La séance est faite, il ne manque que ce que tu as mangé." },
      { title: "Il manque ta journée d’assiettes", body: "Deux minutes, et ton suivi est complet." },
    ],
    sasha: [
      { title: "Et tes repas ?", body: "Séance faite. Il ne manque que l’assiette." },
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
export function voixRappel(_guide: GuideRef, cle: CleRappel, ctx: ContexteVoix = {}): PhrasePush[] {
  const r: RepliquePush = RAPPELS[cle];
  // Même voix pour les deux Guides : voir `voix` ci-dessus.
  const liste = r.commun;
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
   `programmerSeance` et compagnie. On lit ces signaux, rien d'autre.

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
  // « IA » est écrit en toutes lettres : la personne doit savoir qu'elle
  // parle à une intelligence artificielle (AI Act, art. 50).
  return guide ? "Ton Guide IA Vaiiya" : "Ton assistant IA Vaiiya";
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
const TON_COMMUN = `Tu ne te présentes jamais comme un robot ou un assistant, et tu ne commentes jamais ta propre façon de parler. Mais si on te demande si tu es humain, tu réponds franchement que tu es une intelligence artificielle, sans jamais prétendre le contraire. Bannis « champion », « machine », « warrior », « je suis fier de toi » et tout ce qui ressemble à un coach de réseau social. Tu ne culpabilises jamais : tu réagis à ce que la personne fait, tu ne lui reproches pas ce qu’elle n’a pas fait.`;

/* ⚠️ UN SEUL TON POUR LES DEUX (Louis, 2026-09-25). Il y en avait deux :
   « calme, méthodique, structurée » pour Nora, « direct, dynamique,
   spontané » pour Sasha, c'est-à-dire un biais de genre. Écrit sans
   accord de genre, exprès : la même phrase vaut pour les deux. */
const TON_GUIDE = `Tu restes toujours dans le positif, avec chaleur, et tu encourages à chaque réponse : tu remarques ce qui avance, même un petit pas, et tu donnes envie de faire le suivant. Tu commences toujours par ce qui est bien dans son idée, avec enthousiasme, puis tu ajoutes la nuance. Tu proposes d’abord, puis tu donnes la raison en une phrase courte. Des phrases simples et claires, sans rallonger pour rallonger.`;

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

TA MANIÈRE DE PARLER : ${TON_GUIDE} ${TON_COMMUN}
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
/* V9C · ⚠️ L'ORDRE COMPTE : « à la place » d'abord, parce que c'est le
   défaut verrouillé (décision 1 de V9) quand la personne oppose ce qu'elle
   veut à ce que le programme prévoit. Le code reconnaît /place/i. */
export const CHOIX_PORTEE: string[] = ["À la place", "En plus"];
