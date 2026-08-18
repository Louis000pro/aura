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

   ⚠️ ÉTAT ACTUEL (phase 0) : aucune réplique n'a encore de variante.
   `nora`, `sasha` et « pas de Guide » rendent donc EXACTEMENT le même
   texte, au caractère près, que ce que l'app affichait avant ce
   refactor. C'est volontaire : cette phase ne doit rien changer à
   l'écran. Les personnalités s'écriront plus tard, avec Louis.

   ── Comment on différenciera, le moment venu ──
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
};

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
     memoire.*  ce qu'il dit de sa propre mémoire
     panne.*    quand la réponse ne vient pas
     seance.*   pendant l'entraînement
   ------------------------------------------------------------------ */
const REPLIQUES = {
  /* ── Les cartes ──
     Filet quand le texte du coach revient vide (flux coupé, refus,
     réponse muette). Chaque intent DOIT avoir sa phrase : une phrase
     vide laisserait une bulle sans contenu, exactement le symptôme
     qu'on chasse depuis toujours. La phrase est déduite de l'action,
     donc elle ne peut pas la contredire. */
  "action.create_seance": { commun: "Voici une proposition de séance, regarde juste en dessous 👇" },
  "action.plan_set":      { commun: "Ça marche, je te prépare ça. Valide juste en dessous 👇" },
  "action.plan_move":     { commun: "Pas de souci, je te propose un nouveau jour. Valide en dessous 👇" },
  "action.plan_location": { commun: "C'est noté pour le lieu. Valide la séance juste en dessous 👇" },
  "action.plan_library":  { commun: "Je te la programme, valide juste en dessous 👇" },
  "action.plan_regen":    { commun: "Ça marche, je te prépare une nouvelle semaine. Valide en dessous ✦" },
  "action.log_meal":      { commun: "C'est noté, je te prépare l'ajout. Valide juste en dessous 👇" },
  "action.create_recipe": { commun: "Je t'écris ça, regarde juste en dessous 👇" },
  "action.open_page":     { commun: "Je t'emmène ✦" },
  "action.save_lieu":     { commun: "C'est noté, je m'en souviens ✦" },
  /* Repli du repli : quand le modèle pose une question sans la formuler. */
  "action.ask_choice":    { commun: "J'ai besoin d'une précision ✦" },
  "action.set_theme.sombre": { commun: "C'est passé en sombre ✦" },
  "action.set_theme.clair":  { commun: "Retour en clair ✦" },
  "action.set_theme.auto":   { commun: "Thème réglé sur automatique, il suivra ton téléphone ✦" },
  "action.defaut":        { commun: "C'est noté ✦" },

  /* ── Les questions posées par le CODE ──
     Ce n'est pas au modèle de savoir ce qui nous manque : il écrivait la
     question en texte au lieu d'appeler l'outil, donc sans réponses à
     toucher. Ici c'est déterministe, et la bulle du Guide EST la
     question. Les réponses proposées, elles, restent hors de sa voix
     (voir CHOIX_LIEU / CHOIX_EQUIP plus bas). */
  "question.lieu":         { commun: "Avant de te préparer ça, tu t'entraînes où ?" },
  "question.lieu_semaine": { commun: "Tu t'entraînes où cette semaine ?" },
  "question.equip":        { commun: "Tu as des haltères à la maison ?" },

  /* ── Les impasses ──
     ⚠️ Règle verrouillée : aucune sortie muette. Un `return` nu, c'était
     une demande sans réponse et sans explication, impossible à
     diagnostiquer (« j'ai parlé, il ne s'est rien passé »). */
  "impasse.move_introuvable":  { commun: "Je ne trouve pas de séance à déplacer cette semaine 🤔 Dis-moi le jour de départ, par ex. « déplace la séance de jeudi à vendredi »." },
  "impasse.move_sans_jour":    { commun: "Vers quel jour veux-tu déplacer la séance ? (par ex. « demain », « dans 2 jours » ou « vendredi ») 📅" },
  "impasse.move_deja_prevu":   { commun: (c: ContexteVoix) => `La séance est déjà prévue le ${c.jour ?? ""} 🙂` },
  "impasse.regen_semaine_finie": { commun: "Il ne reste plus de jour modifiable cette semaine 🙂 Décale plutôt une séance précise, ou redemande-moi lundi pour la semaine d'après." },
  "impasse.library_sans_jour": { commun: "Quel jour veux-tu programmer cette séance ? (par ex. « mardi » ou « demain ») 📅" },
  "impasse.library_sans_nom":  { commun: "Quelle séance de ta bibliothèque veux-tu programmer ? Donne-moi son nom 🙂" },
  "impasse.library_introuvable": { commun: (c: ContexteVoix) => `Je ne trouve pas de séance « ${c.titre ?? ""} » dans ta bibliothèque 🤔 Vérifie le nom, ou demande-moi de la créer.` },

  /* ── La feuille vide ──
     Première phrase de la conversation : c'est là que la différence
     Nora / Sasha s'entendra le plus tôt. */
  "accueil.salut":  { commun: (c: ContexteVoix) => `Salut${c.pseudo ? `, ${c.pseudo}` : ""} ✦` },
  "accueil.invite": { commun: "Demande-moi n'importe quoi, ou dis-moi où tu veux aller dans l'app." },

  /* ── Sa mémoire ──
     Il parle de lui, donc c'est bien lui qui parle. */
  "memoire.oubliee": { commun: "C'est noté, j'oublie ça." },
  "memoire.retenue": { commun: "Je m'en souviendrai 🧠" },

  /* ── Quand ça ne répond pas ──
     Ni texte ni action : ça ne doit JAMAIS passer inaperçu. Une version
     précédente supprimait la bulle vide, et l'échec devenait invisible. */
  "panne.sans_reponse": { commun: "Je n'ai pas réussi à répondre à ce message 😕 Réessaie, ou reformule-le autrement." },
  "panne.erreur":       { commun: "Désolé, une erreur est survenue. Réessaie ✨" },

  /* ── Pendant la séance ──
     Une seule phrase, mais celle que l'on voit le plus souvent de toute
     l'app : elle revient à chaque repos, quinze à vingt-cinq fois par
     séance. C'est le premier endroit sportif où les deux voix se
     sépareront. */
  "seance.repos": { commun: "Souffle — la prochaine série est la bonne." },
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
