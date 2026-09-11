/* ════════════════════════════════════════════════════════════════════
   assistantTools — les capacités de l'✦, déclarées UNE fois.

   Avant, deux modèles travaillaient en parallèle sur le même message :
   /api/chat écrivait la réponse, /api/assistant/analyze décidait l'action,
   et aucun des deux ne voyait ce que l'autre avait produit. D'où le grand
   classique : « je te prépare ça, valide en dessous 👇 » sans aucune carte
   en dessous (ou l'inverse). Les deux prompts devaient être tenus d'accord
   à la main, et l'analyseur décidait avec MOINS d'informations que celui
   qui parlait (4 messages tronqués, ni profil ni stats).

   Depuis, un seul décideur : `assistantRouter` appelle ces outils dans un
   appel court qui ne fait QUE ça, et le coach n'en a plus aucun (il se
   contentait de les ignorer dès que son prompt dépassait quelques milliers
   de caractères — la mesure est dans `assistantRouter.ts`). Aucun des deux
   ne peut contredire l'autre : l'un décide, l'autre parle.

   Ce fichier est la source unique : l'aiguilleur en fait des `tools` pour le
   modèle, le client route l'action reçue. Ajouter une capacité = 1) une
   entrée ici, 2) une branche dans `runAction` (AssistantContext), 3) une
   carte de confirmation si ça écrit quelque chose.

   ⚠️ Un outil ne fait JAMAIS d'écriture à lui seul. Il prépare une carte que
   l'utilisateur valide d'un clic (règle verrouillée du produit).
   ════════════════════════════════════════════════════════════════════ */

/** Une action décidée par le modèle. Union à plat de tous les paramètres
 *  possibles : le routeur lit ceux qui concernent son intent. */
export type AssistantAction = {
  intent: string;
  // création / planification de séance
  description?: string;
  muscles?: unknown;
  category?: string;
  difficulty?: string;
  when?: string;
  to?: string | null;
  /* V9B · la séance nommée dans la demande (« déplace Bas du corps »).
     ⚠️ C'est un mot, pas une identité : le CODE le résout ensuite vers une
     ligne du planning, en passant d'abord par les étapes du cycle. */
  quoi?: string;
  /* V9C · le nom de l'ÉTAPE du cycle qu'un geste vise (« autre chose que
     Pull », « saute Pull »). Comme `quoi`, c'est un mot : `viserEtape` le
     traduit en identité, borné au cycle persisté, ou refuse. */
  etape?: string;
  /* V9C · « à la place » ou « en plus » ? Verrouillé par la décision 1 de
     V9 : le défaut est la SUBSTITUTION, et un doute se pose en question
     avant toute proposition. `pas_dit` est donc une valeur utile, pas une
     absence de réponse. */
  portee?: string;
  /* V9C ter · le VERBE employé pour poser une séance sur un jour.
     ⚠️ C'est du linguistique, pas du moteur : l'aiguilleur rapporte ce
     qui a été dit (« remplace », « à la place de »), et c'est le CODE
     qui décide ensuite si ça vise la prochaine étape du cycle. Sans lui,
     « mets du pecs jeudi » et « remplace ma séance d’aujourd’hui »
     arrivaient sous exactement la même forme. */
  remplacement?: string;
  /* V9C ter · quelle SEMAINE une régénération vise. Même nature : un
     paramètre pauvre, deux valeurs, aucune connaissance du planning. */
  periode?: string;
  location?: string;
  title?: string;
  adjust?: string;
  // apparence
  theme?: string;
  // nutrition
  dish?: string;
  theme_recette?: string;
  ingredients?: unknown;
  mealType?: string;
  food?: string;
  // navigation / lieu d'entraînement
  cible?: string;
  lieu?: string;
  materiel?: string;
  // question à choix cliquables
  question?: string;
  choix?: unknown;
};

/** Une question posée à l'utilisateur avec ses réponses à toucher.
 *  `relance` = ce qu'on renvoie au coach une fois la réponse connue (la
 *  demande d'origine), pour qu'il enchaîne au lieu de repartir de zéro. */
export type QuestionCliquable = {
  choix: string[];
  /** Réponse déjà donnée : la question devient inerte, on ne répond qu'une fois. */
  repondu?: string;
  /** `lieu`, `equip`, `cible`, `portee` et `contenu` sont posées par le
   *  CODE (déterministe) ; `libre` vient du coach. */
  genre: "lieu" | "equip" | "libre" | "cible" | "portee" | "contenu";
  relance?: string;
  /**
   * V9B, genre « cible » : quelle INTENTION chaque reponse designe.
   *
   * ATTENTION : ON REPOND PAR UN IDENTIFIANT, JAMAIS EN RENVOYANT LA
   * PHRASE AU MODELE. « Laquelle ? » n'a de sens que si la reponse designe
   * une ligne precise : refaire un tour d'aiguillage sur « jeudi 10 »
   * rouvrirait exactement l'ambiguite qu'on vient de lever.
   */
  cibles?: { choix: string; id: string }[];
  /** Ce qu'on fera de la cible une fois choisie, et vers ou pour un deplacement. */
  suite?: { geste: "deplacer" | "retirer"; to?: string | null };
  /**
   * V9C, genre « portee » : « à la place » ou « en plus » ?
   *
   * ⚠️ ON NE REPASSE PAS PAR LE MODELE, POUR LA MEME RAISON QUE « cible ».
   * Renvoyer « A la place » a l'aiguilleur lui ferait re-decider une action
   * a partir de trois mots sans contexte. La demande d'origine est donc
   * portee ici, telle qu'elle a ete comprise, et la reponse ne fait que
   * choisir laquelle des deux branches ouvrir.
   */
  substitution?: { etape?: string | null; quoi?: string | null; when?: string | null };
  /**
   * V9C bis, genre « contenu » : deux séances portent le nom qu'on a dit.
   *
   * ⚠️ ON RÉPOND PAR UNE RÉFÉRENCE (`lib:<id>` ou `cat:<slug>`), JAMAIS
   * PAR UN TITRE : c'est justement le titre qui est ambigu. Et la source
   * est RELUE au clic, donc la question survit à un rechargement au lieu
   * de devenir inerte sans le dire.
   */
  contenus?: { choix: string; ref: string }[];
  /**
   * La demande d'origine, à rejouer une fois la séance choisie.
   *
   * ⚠️ ELLE NE REPASSE PAS PAR L'AIGUILLEUR, même raison que « cible » et
   * « portee » : lui renvoyer le libellé choisi lui ferait re-décider une
   * action à partir de trois mots sans contexte.
   */
  demande?: AssistantAction;
};

/** Nettoie les choix rendus par le modèle : 2 à 4 réponses courtes, non vides.
 *  Au-delà de 4, ce n'est plus un choix, c'est un formulaire. */
export function normaliserChoix(brut: unknown): string[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const out: string[] = [];
  for (const c of brut) {
    if (typeof c !== "string") continue;
    const v = c.trim().slice(0, 32);
    if (!v || vus.has(v.toLowerCase())) continue;
    vus.add(v.toLowerCase());
    out.push(v);
    if (out.length === 4) break;
  }
  return out.length >= 2 ? out : [];
}

/** Événements du flux /api/chat (NDJSON, une ligne = un objet).
 *  `t` = morceau de texte, `a` = action décidée, `e` = erreur lisible. */
export type ChatEvent =
  | { t: string }
  | { a: AssistantAction }
  | { e: string };

/* Valeurs de jour comprises par `resolveWhen` (lib/planning). */
const JOUR_DESC =
  'Un de : "aujourd_hui", "demain", "apres_demain", "dans_N_jours" (ex "dans_2_jours"), "semaine_prochaine", ou un jour en minuscule sans accent ("lundi"…"dimanche").';

type Tool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

const muscles = { type: "array", items: { type: "string" }, description: "Muscles visés, en français." };
const category = { type: "string", enum: ["force", "cardio", "mobilite", "fullbody"] };
const difficulty = { type: "string", enum: ["Débutant", "Intermédiaire", "Avancé"] };

/** Les outils, dans l'ordre où ils comptent. Les descriptions sont reprises
 *  du détecteur d'intentions historique : elles ont été affinées sur des cas
 *  réels (les confusions create_seance / plan_set / plan_library surtout). */
export const ASSISTANT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "create_seance",
      description:
        "Créer une séance RÉUTILISABLE dans la bibliothèque de l’utilisateur, SANS référence à un jour du planning (« crée-moi une séance pecs », « fais-moi une séance jambes de 30 min »). Si tu viens de demander une précision (lieu, matériel, durée) et qu’il répond, c’est ici : reprends les muscles et l’objectif du contexte.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Reformulation courte de la séance voulue." },
          muscles, category, difficulty,
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_set",
      description:
        "DÉFINIR ou REMPLACER la séance d’un JOUR précis du planning (« remplace aujourd’hui par du dos », « mets du pecs jeudi », « dans 2 jours je veux jambes »). À ne pas confondre avec create_seance, qui ne vise aucun jour.",
      parameters: {
        type: "object",
        properties: {
          when: { type: "string", description: JOUR_DESC },
          description: { type: "string", description: "Courte description de la séance voulue." },
          remplacement: {
            type: "string",
            enum: ["explicite", "pas_dit"],
            description: "explicite s’il dit en toutes lettres qu’il REMPLACE ce qui est prévu ce jour-là, ou que c’est À LA PLACE (« remplace ma séance d’aujourd’hui par… », « à la place de ce qui est prévu jeudi »). pas_dit s’il pose simplement une séance sur un jour (« mets du pecs jeudi »). Ne devine pas : pas_dit est une réponse valable.",
          },
          muscles, category,
        },
        required: ["when"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_move",
      description:
        "DÉPLACER une séance d’un jour vers un autre (« repousse ma séance à demain », « décale jeudi à vendredi », « mets Bas du corps à vendredi »). Un EMPÊCHEMENT sans destination (« je ne peux pas jeudi », « je suis pris vendredi ») s’exprime ici aussi, avec `to` absent : l’app choisira un jour libre. À ne pas confondre avec plan_retirer, qui la fait DISPARAÎTRE au lieu de la déplacer.",
      parameters: {
        type: "object",
        properties: {
          when: { type: "string", description: "Jour de départ, s’il est dit. À omettre sinon. " + JOUR_DESC },
          to: { type: "string", description: "Jour d’arrivée. À omettre si l’utilisateur ne le donne pas. " + JOUR_DESC },
          quoi: { type: "string", description: "Nom de la séance s’il la nomme (« Bas du corps », « Push »). À omettre sinon." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_retirer",
      description:
        "RETIRER une séance du planning sans la reposer ailleurs (« retire ma séance de vendredi », « enlève Bas du corps de mon planning », « supprime la séance de jeudi », « je ne veux plus rien mardi »). Signal clé : il veut qu’elle DISPARAISSE, pas qu’elle change de jour.",
      parameters: {
        type: "object",
        properties: {
          when: { type: "string", description: "Jour de la séance, s’il est dit. À omettre sinon. " + JOUR_DESC },
          quoi: { type: "string", description: "Nom de la séance s’il la nomme. À omettre sinon." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_ajouter",
      description:
        "AJOUTER une séance EN PLUS de ce qui est déjà prévu, sans rien remplacer (« ajoute-moi une petite séance cardio samedi », « je veux faire des abdos en plus demain », « rajoute du gainage jeudi »). Signal clé : « en plus », « rajoute », « aussi ». À ne pas confondre avec plan_set, qui DÉFINIT la séance du jour, ni avec etape_substituer, qui remplace une étape du programme.",
      parameters: {
        type: "object",
        properties: {
          when: { type: "string", description: "Le jour, OBLIGATOIRE : un supplément est toujours daté. " + JOUR_DESC },
          description: { type: "string", description: "Courte description de la séance voulue." },
          muscles, category,
        },
        required: ["when"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "etape_substituer",
      description:
        "Faire AUTRE CHOSE que l’étape que son programme propose (« je veux faire autre chose que Pull », « pas Pull aujourd’hui, plutôt du dos », « remplace ma prochaine séance de programme par du cardio »). Signal clé : il OPPOSE ce qu’il veut à ce que le programme prévoit. À ne pas confondre avec plan_set, qui vise un JOUR du planning sans parler du programme.",
      parameters: {
        type: "object",
        properties: {
          etape: { type: "string", description: "Le nom de l’étape du programme qu’il ne veut pas faire (« Pull », « Bas du corps »). À omettre s’il ne la nomme pas." },
          quoi: { type: "string", description: "Ce qu’il veut faire à la place, tel qu’il le dit (« du dos », « du cardio », « ma séance Pompes »). À omettre s’il ne le dit pas." },
          portee: {
            type: "string",
            enum: ["a_la_place", "en_plus", "pas_dit"],
            description: "a_la_place s’il dit explicitement que c’est À LA PLACE de l’étape ; en_plus s’il dit que c’est EN PLUS ; pas_dit s’il ne le précise pas. Ne devine pas : pas_dit est une réponse valable.",
          },
          when: { type: "string", description: "Le jour, s’il le dit. À omettre sinon. " + JOUR_DESC },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "etape_sauter",
      description:
        "PASSER une étape de son programme sans la faire (« saute Pull », « passe ma prochaine séance de programme », « je ne ferai pas Pull, passe à la suite »). Signal clé : il veut AVANCER dans son cycle sans s’entraîner. À ne pas confondre avec plan_retirer, qui enlève une séance du planning sans toucher au programme, ni avec etape_substituer, qui fait autre chose à la place.",
      parameters: {
        type: "object",
        properties: {
          etape: { type: "string", description: "Le nom de l’étape à passer, s’il la nomme. À omettre sinon." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_location",
      description:
        "Changer le LIEU d’entraînement d’un jour du planning (« vendredi je suis à la maison », « demain je m’entraîne en salle »).",
      parameters: {
        type: "object",
        properties: {
          when: { type: "string", description: JOUR_DESC },
          location: { type: "string", enum: ["salle", "maison"] },
        },
        required: ["when", "location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_library",
      description:
        "PLACER sur un jour une séance qui EXISTE DÉJÀ dans sa bibliothèque (« mets ma séance Pompes perso mardi »). Signal clé : il désigne une séance QU’IL A DÉJÀ (« ma séance X ») plus un jour. À ne pas confondre avec plan_set, qui GÉNÈRE une nouvelle séance.",
      parameters: {
        type: "object",
        properties: {
          when: { type: "string", description: JOUR_DESC },
          title: { type: "string", description: "Nom de la séance tel que mentionné, sans « ma séance »." },
        },
        required: ["when", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_regen",
      description:
        "REFAIRE LA SEMAINE ENTIÈRE du planning, celle en cours ou la suivante (« refais ma semaine », « régénère mon programme », « fais ma prochaine semaine », « prépare-moi la semaine prochaine »). À ne pas confondre avec plan_set, qui ne touche qu’un jour.",
      parameters: {
        type: "object",
        properties: {
          periode: {
            type: "string",
            enum: ["cette_semaine", "semaine_prochaine"],
            description: "semaine_prochaine s’il parle de LA SEMAINE SUIVANTE (« ma prochaine semaine », « la semaine prochaine », « celle d’après »). cette_semaine sinon, et par défaut.",
          },
          adjust: {
            type: "string",
            enum: ["none", "leger", "intense", "cardio", "force"],
            description: "Direction demandée : leger (moins de séances), intense, cardio, force, ou none.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_meal",
      description:
        "ENREGISTRER un repas DÉJÀ mangé ou bu (« j’ai mangé un burger ce midi », « au petit-déj deux œufs »). Le signal clé est le PASSÉ. À ne pas confondre avec create_recipe (une idée à cuisiner) ni avec une simple question nutritionnelle (« combien de calories dans une banane ? »), qui n’appelle aucun outil.",
      parameters: {
        type: "object",
        properties: {
          food: { type: "string", description: "Les aliments tels qu’il les décrit, quantités comprises (« deux œufs », « un bol de riz »)." },
          mealType: {
            type: "string",
            enum: ["petit-dejeuner", "dejeuner", "gouter", "diner"],
            description: "Le moment, s’il est dit ou évident. À omettre sinon.",
          },
        },
        required: ["food"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_recipe",
      description:
        "Écrire une RECETTE de cuisine (« donne-moi une recette de poulet », « qu’est-ce que je peux cuisiner avec du riz et des œufs ? », « une idée de dîner riche en protéines »).",
      parameters: {
        type: "object",
        properties: {
          dish: { type: "string", description: "Le plat, s’il est nommé." },
          theme_recette: { type: "string", description: "Le style, s’il est donné (italien, healthy, rapide…)." },
          ingredients: { type: "array", items: { type: "string" }, description: "UNIQUEMENT les aliments qu’il dit AVOIR sous la main." },
          mealType: { type: "string", enum: ["petit-dejeuner", "dejeuner", "gouter", "diner", "collation"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_theme",
      description:
        "Changer l’APPARENCE de l’app, et seulement ça (« passe en mode sombre », « c’est trop lumineux à l’écran »). Le message doit porter explicitement sur le thème, l’affichage ou la luminosité de l’app. N’appelle JAMAIS cet outil à partir d’une fatigue (« je suis crevé »), de l’heure ou de la lumière de la pièce, ni d’un objet sombre ou clair qui n’est pas l’interface. Dans le moindre doute, n’appelle rien.",
      parameters: {
        type: "object",
        properties: { theme: { type: "string", enum: ["sombre", "clair", "auto"] } },
        required: ["theme"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_lieu",
      description:
        "Mémoriser le lieu d’entraînement quand l’utilisateur vient de l’indiquer (« à la maison », « en salle », « chez moi », « j’ai des haltères »). Appelle-le en même temps que ta réponse : il évite de reposer la question au tour suivant.",
      parameters: {
        type: "object",
        properties: {
          lieu: { type: "string", enum: ["salle", "maison"] },
          materiel: { type: "string", enum: ["halteres", "poids"], description: "Pour la maison seulement." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_choice",
      description:
        "Poser UNE question à l’utilisateur quand il te manque vraiment une information pour agir, en lui proposant 2 à 4 réponses qu’il pourra toucher du doigt. Conditions strictes : la réponse doit être un CHOIX FERMÉ (un lieu, un jour, une durée, un niveau, oui/non), jamais une question ouverte comme « comment tu te sens ? ». Ne pose JAMAIS une question dont la réponse est déjà dans le profil, les stats ou la conversation. Une seule question à la fois : si tu as besoin de deux informations, demande la première et attends. Si tu n’as pas besoin d’information pour répondre, n’appelle pas cet outil.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "La question, courte et directe, en une phrase." },
          choix: {
            type: "array",
            items: { type: "string" },
            description: "2 à 4 réponses possibles, très courtes (1 à 4 mots), distinctes et complètes.",
          },
        },
        required: ["question", "choix"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_page",
      description:
        "Emmener l’utilisateur sur une page de l’app quand il veut clairement y ALLER (« montre mes repas », « ouvre mon programme », « je veux m’abonner »). Pas pour une simple question sur le contenu de la page.",
      parameters: {
        type: "object",
        properties: {
          cible: {
            type: "string",
            enum: ["repas", "seances", "premium", "progression", "nutrition", "parametres"],
          },
        },
        required: ["cible"],
      },
    },
  },
];

/* La parole de l'assistant a quitté ce fichier : elle vit dans
   `src/lib/guides.ts` (`voixAction`). Ici on ne déclare plus que des
   capacités, pas des phrases. Ajouter une capacité = 1) une entrée dans
   ASSISTANT_TOOLS, 2) sa phrase dans `guides.ts`, 3) une branche dans
   `runAction`, 4) une carte de confirmation si ça écrit. */
