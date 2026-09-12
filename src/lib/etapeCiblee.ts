/* ════════════════════════════════════════════════════════════════════
   V9C · L'AUTORITÉ UNIQUE D'UNE ÉTAPE CIBLÉE.

   Toute écriture qui porte `etape_consommee_id` passe par ici d'abord.
   Il n'y en a que trois dans le produit : la fin de séance (`finSeance`,
   V7A), la substitution et le saut (V9C). Elles n'ont rien en commun
   sauf la question qu'elles doivent poser AVANT d'écrire, et c'est
   précisément cette question qui a coûté le double-fermage de V7A : une
   seconde ligne refermant la même étape, que la base ne pouvait pas
   refuser puisqu'elle naît déjà résolue.

   Six vérifications, et aucune n'est décorative :

     1. l'étape se résout par IDENTITÉ, jamais par titre ;
     2. c'est bien la prochaine étape AUTORISÉE (la compatible, pas la
        brute : si une adaptation en masque une, la suivante est celle
        que le programme propose) ;
     3. elle n'est pas masquée par une adaptation ;
     4. elle n'est pas déjà refermée ;
     5. on cherche la réservation qui existe peut-être déjà ;
     6. on la RÉUTILISE, on n'en crée jamais une seconde.

   ⚠️ LA DÉCISION EST PURE, LA LECTURE EST À CÔTÉ. `verdictEtape` ne lit
   rien et n'écrit rien : c'est ce qui rend les règles vérifiables hors
   ligne sur une app pourtant auth-gated, exactement comme le reste du
   chantier.

   ⚠️ ET ON NE PASSE PAS PAR `etatMoteur`, MALGRÉ LA TENTATION. Il sait
   déjà tout ça, mais il est mis en cache 30 secondes : décider une
   ÉCRITURE sur un état vieux d'une demi-minute, ce serait rouvrir la
   porte au double-fermage par un autre chemin. On relit, à l'affichage
   de la carte comme au clic.
   ════════════════════════════════════════════════════════════════════ */

import {
  adaptationDuJour, etapeMasquee, libelleJour,
  type Adaptation,
} from "@/lib/adaptation";
import {
  etapeSuivante, lireProgrammeActif, positionConsommee,
  type EtapeCycle,
} from "@/lib/programme";
import { reservationDeLEtape, todayYmd, type PlanningDay } from "@/lib/planning";
import { etapeParNom, type EtapeNommee } from "@/lib/gestePlanning";

/* ═══════════════════ La décision, pure ═══════════════════ */

/** Pourquoi une étape ne peut pas être visée par un geste de cycle. */
export type RefusEtape =
  /** Aucun programme actif, ou un cycle vide : il n'y a pas d'étape. */
  | "aucun_programme"
  /**
   * La lecture a échoué.
   *
   * ⚠️ UNE ABSENCE DE RÉPONSE N'EST PAS UNE RÉPONSE D'ABSENCE, et c'est
   * la même confusion que V9A ter a fermée côté nutrition. Replier une
   * lecture ratée sur « tu n'as pas de programme » ferait dire au Guide
   * une chose fausse au moment exact où il ne sait rien.
   */
  | "illisible"
  /** Le nom donné ne désigne aucune étape du cycle persisté. */
  | "introuvable"
  /** Elle vient d'être refermée : la refermer encore la compterait deux fois. */
  | "deja_resolue"
  /** Une adaptation la met de côté : ce n'est pas à un geste de la trancher. */
  | "masquee"
  /** Ce n'est pas la prochaine étape proposable. */
  | "pas_la_prochaine"
  /**
   * Il y a un programme, mais l'adaptation ne laisse passer AUCUNE étape.
   *
   * ⚠️ CE N'EST PAS « introuvable », ET LA NUANCE COMPTE. Quand la
   * demande ne nomme rien, l'ancienne version tombait sur « introuvable »
   * avec un titre vide, donc sur une phrase qui accusait la personne
   * d'avoir cité une étape qui n'existe pas alors qu'elle n'en avait cité
   * aucune. C'est la couche qui bloque, et c'est elle qu'il faut nommer.
   */
  | "aucune_compatible";

export type VerdictEtape = { ok: true } | { ok: false; refus: RefusEtape };

/**
 * Cette étape peut-elle être substituée ou sautée ?
 *
 * ⚠️ L'ORDRE DES QUESTIONS EST LA RÈGLE, comme partout dans ce chantier.
 * « Déjà refermée » passe avant « masquée » et avant « pas la prochaine »
 * parce que c'est le message le plus utile quand les trois sont vrais :
 * c'est le garde-fou du DOUBLE SAUT, et il doit se reconnaître à son
 * message plutôt que de se cacher derrière un « ce n'est pas la
 * prochaine » qui laisserait croire à une erreur de désignation.
 *
 * ⚠️ ET LA CIBLE AUTORISÉE EST LA PROCHAINE ÉTAPE COMPATIBLE, PAS LA
 * BRUTE. Sauter une étape plus loin ferait avancer le curseur de
 * plusieurs crans d'un coup, sur des étapes que personne n'a écartées :
 * c'est la décision 2 de V9, verrouillée avant le code.
 */
export function verdictEtape(input: {
  /** L'étape visée, résolue par identité. */
  etape: { id: string; position: number } | null;
  /** La prochaine étape proposable aujourd'hui (adaptation appliquée). */
  compatible: { id: string } | null;
  /** L'adaptation du jour met-elle CETTE étape de côté ? */
  masquee: boolean;
  /** La position de la dernière étape refermée, ou `null`. */
  positionConsommee: number | null;
}): VerdictEtape {
  if (!input.etape) return { ok: false, refus: "introuvable" };
  if (input.positionConsommee !== null && input.positionConsommee === input.etape.position) {
    return { ok: false, refus: "deja_resolue" };
  }
  if (input.masquee) return { ok: false, refus: "masquee" };
  if (!input.compatible || input.compatible.id !== input.etape.id) {
    return { ok: false, refus: "pas_la_prochaine" };
  }
  return { ok: true };
}

/* ══════ V9C quater · UNE RÉFÉRENCE N'EST PAS UN NOM ══════

   Cas réel, Louis, 2026-09-12 : « Saute ma prochaine étape » a répondu
   « « ? » n'est pas dans ton cycle ».

   ⚠️ LA CAUSE TIENT EN UNE PHRASE : `viserEtape` n'avait QU'UN SEUL
   SIGNAL, la présence ou l'absence d'un nom. Un nom absent visait la
   prochaine étape compatible ; un nom présent DEVAIT se résoudre dans le
   cycle. Une référence déictique (« ma prochaine étape ») et un
   remplissage (« ? ») arrivent pourtant dans ce champ-là exactement
   comme un vrai nom : ils devenaient donc des noms inconnus, et le Guide
   répondait à côté d'une demande parfaitement claire.

   ⚠️ ET ON NE RÉPARE PAS ÇA EN ESPÉRANT QUE LE MODÈLE OMETTE LE CHAMP.
   « À omettre sinon » était déjà la consigne : un modèle remplit ce
   qu'on lui donne. Le signal devient donc STRUCTURÉ (`designation`), au
   même titre que `portee` et `remplacement` : l'aiguilleur rapporte
   COMMENT la personne désigne, il ne lit toujours rien du moteur, et son
   prompt ne bouge pas d'un caractère.

   ⚠️ LE FILET NE DEVINE PAS UNE INTENTION DANS UNE PHRASE. C'est la
   différence avec `sniffLieu`, supprimé en V9C : celui-là fouillait le
   message libre de quelqu'un. Ici on regarde la VALEUR d'un paramètre
   dont le contrat est « un nom d'étape », et on demande seulement
   si c'en est un. C'est la même famille que `refModele` (seul un
   identifiant `custom-…` désigne un modèle) ou `estMobilier` (une
   origine qu'on ne comprend pas rend `false`) : un contrôle de forme sur
   un paramètre pauvre, jamais une lecture de prose.
   ══════════════════════════════════════════════════════════════════ */

/**
 * Les mots qui DÉSIGNENT sans NOMMER.
 *
 * ⚠️ AUCUN NOM D'ÉTAPE N'EST FAIT QUE DE CES MOTS-LÀ, et c'est ce qui
 * rend la liste sûre. Le cycle vient de `buildSplit`, donc d'un vivier
 * fermé : Full Body, Haut du corps, Bas du corps, Push, Pull,
 * Cardio / HIIT. Chacun porte au moins un mot de contenu (`corps`,
 * `body`, `push`, `pull`, `cardio`, `hiit`) qui n'est pas ici.
 *
 * ⚠️ ET LE FILTRE NE PASSE QU'APRÈS `etapeParNom`, jamais avant : si un
 * jour un nom d'étape tombait là-dedans, il serait reconnu comme nom
 * AVANT qu'on se demande s'il désigne. L'ordre est le garde-fou.
 */
const MOTS_QUI_DESIGNENT = new Set([
  // déterminants, pronoms, liaisons
  "ma", "mon", "mes", "le", "la", "les", "l", "un", "une", "de", "du", "des",
  "d", "a", "au", "aux", "en", "ce", "cet", "cette", "ces", "ci", "celle",
  "celui", "ceux", "celles", "ca", "cela", "qui", "que", "vient", "est",
  // le geste lui-même, quand l'aiguilleur recopie la demande
  "je", "veux", "voudrais", "peux", "tu", "saute", "sauter", "passe",
  "passer", "skip", "stp", "please",
  // les remplissages : ils ne nomment rien non plus
  "n", "na", "nc", "null", "none", "aucun", "aucune", "rien", "inconnu", "non",
  // ce qui est désigné
  "prochain", "prochaine", "prochains", "prochaines", "suivant", "suivante",
  "suite", "apres", "actuel", "actuelle", "meme", "prevu", "prevue",
  "etape", "etapes", "seance", "seances", "entrainement", "entrainements",
  "programme", "cycle", "jour", "aujourd", "hui", "maintenant", "truc",
]);

/**
 * Le mot-à-mot d’une valeur, sans accent, sans ponctuation, sans vide.
 *
 * ⚠️ C’EST LE DÉCOUPEUR DES PARAMÈTRES PAUVRES DE L’AIGUILLEUR, ET IL
 * N’EN EXISTE QU’UN. Il sert ici à savoir si une valeur NOMME quelque
 * chose ou si elle POINTE, et il sert à V9D ter à savoir si un motif dit
 * quelque chose ou s’il est un remplissage. Deux découpages du même
 * genre de valeur finiraient par ne pas être d’accord sur « ? ».
 */
export function motsDe(v: string): string[] {
  return (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Cette valeur POINTE-t-elle vers la prochaine étape au lieu d'en nommer une ?
 *
 * La question posée est littérale : une fois retirés les mots qui ne
 * nomment rien, reste-t-il quelque chose qui pourrait être un nom ? S'il
 * ne reste rien, la valeur ne nomme rien : elle désigne. Un remplissage
 * (« ? », « - », « n/a ») ne laisse aucun mot du tout, donc il
 * tombe dans le même cas, et c'est voulu : il ne nomme rien non plus.
 */
export function estReferenceProchaine(valeur: string | null | undefined): boolean {
  const restants = motsDe(valeur ?? "").filter((m) => !MOTS_QUI_DESIGNENT.has(m));
  return restants.length === 0;
}

/** Ce que la demande désigne vraiment, une fois traduite. */
export type CibleDemandee =
  /** La prochaine étape compatible, quelle qu'elle soit. */
  | { mode: "prochaine" }
  /** Une étape citée, résolue par IDENTITÉ dans le cycle persisté. */
  | { mode: "nommee"; id: string }
  /** Un nom qui ne désigne rien : on le dit, on ne devine pas. */
  | { mode: "introuvable"; nom: string };

/**
 * Traduit les deux paramètres pauvres en une cible, sans rien lire.
 *
 * ⚠️ L'ORDRE DES QUESTIONS EST LA RÈGLE, comme partout dans ce chantier.
 *
 *   1. `designation = prochaine` → AUCUNE résolution par nom. C'est la
 *      règle posée par Louis, et elle est délibérément plus forte que le
 *      nom : sans elle, un `etape` mal rempli (« ma prochaine étape »)
 *      reprendrait la main sur une demande pourtant explicite, et le
 *      défaut reviendrait par la porte qu'on est en train de fermer.
 *      Rien ne s'écrit avant confirmation et la carte NOMME l'étape
 *      qu'elle vise : une contradiction entre les deux paramètres se voit
 *      donc à l'écran au lieu de se décider en silence.
 *   2. Pas de nom du tout → la prochaine (comportement d'avant, inchangé).
 *   3. Le nom se résout dans le cycle → c'est un NOM, on le vise.
 *   4. Il ne se résout pas mais il ne nomme rien → la prochaine.
 *   5. Sinon → introuvable, et on le dit.
 */
export function cibleDemandee(
  input: { designation?: string | null; nom?: string | null },
  cycle: EtapeNommee[],
): CibleDemandee {
  if (input.designation === "prochaine") return { mode: "prochaine" };

  const nom = (input.nom ?? "").trim();
  if (!nom) return { mode: "prochaine" };

  const parNom = etapeParNom(cycle, nom);
  if (parNom) return { mode: "nommee", id: parNom.id };

  if (estReferenceProchaine(nom)) return { mode: "prochaine" };
  return { mode: "introuvable", nom };
}

/* ═══════════════════ La lecture, une fois, juste avant d'écrire ═══════════════════ */

/** Tout ce qu'un geste de cycle a besoin de savoir, et rien de plus. */
export type EtapeVisee = {
  programmeId: string;
  /** L'étape que le geste va refermer. */
  etape: EtapeCycle;
  /** Ce que devient la prochaine étape UNE FOIS celle-ci refermée. */
  apres: EtapeCycle | null;
  /**
   * La ligne qui réserve déjà cette étape, s'il y en a une.
   *
   * ⚠️ ON LA RÉUTILISE, ON N'EN CRÉE JAMAIS UNE SECONDE. Pour une
   * substitution, `uniq_intention_par_etape` refuserait la deuxième et le
   * geste échouerait ; pour un saut, la base l'accepterait sans broncher
   * (l'unicité ne couvre que les intentions PRÉVUES) et le journal
   * porterait deux fermetures de la même étape.
   */
  reservation: PlanningDay | null;
  adaptation: Adaptation | null;
};

export type ResultatVisee =
  | { ok: true; visee: EtapeVisee }
  | {
      ok: false;
      refus: RefusEtape;
      /** Le nom de l'étape visée, quand on a su la nommer. */
      nom?: string;
      /** La prochaine étape proposable, pour dire laquelle c'est. */
      proposable?: string;
      /** Le jour où l'adaptation se termine (`refus = "masquee"`). */
      jusquau?: string;
    };

/**
 * Résout l'étape que le geste vise, et dit si elle peut l'être.
 *
 * `nom` vient de l'aiguilleur, donc il peut être absent : sans nom, on
 * vise la prochaine étape proposable, ce qui est le cas le plus fréquent
 * (« je veux faire autre chose aujourd'hui »).
 *
 * ⚠️ LE NOM NE SERT QU'À DÉSIGNER, JAMAIS À DÉCIDER. `etapeParNom` est
 * borné au cycle persisté, comme `idsMasques` en V8 : un titre qui ne
 * correspond à aucune étape ne devient jamais une identité de programme,
 * et une séance du catalogue intitulée « Push » n'est pas l'étape Push.
 */
export async function viserEtape(
  userId: string,
  nom?: string | null,
  /**
   * V9C quater · COMMENT la personne désigne l'étape.
   *
   * ⚠️ `"prochaine"` COURT-CIRCUITE LE NOM, ET C'EST VOULU. Un `nom` mal
   * rempli par l'aiguilleur ne doit jamais reprendre la main sur une
   * demande explicite : c'est exactement ce qui transformait
   * « saute ma prochaine étape » en « « ? » n'est pas dans ton cycle ».
   */
  designation?: string | null,
): Promise<ResultatVisee> {
  let actif: Awaited<ReturnType<typeof lireProgrammeActif>>;
  try {
    actif = await lireProgrammeActif(userId);
  } catch (e) {
    /* ⚠️ ON NE REPLIE PAS UNE LECTURE RATÉE SUR UNE ABSENCE. Le Guide
       dirait « tu n'as pas de programme » à quelqu'un qui en a un, et
       proposerait de créer une séance à la place d'un geste de cycle. */
    console.warn("[etapeCiblee] programme illisible :", (e as Error)?.message);
    return { ok: false, refus: "illisible" };
  }
  if (!actif || actif.cycle.length === 0) return { ok: false, refus: "aucun_programme" };

  const adaptation = await adaptationDuJour(userId, actif.programme.id, todayYmd());
  const position = await positionConsommee(userId, actif);
  const depart = actif.programme.positionInitiale;
  const compatible = etapeSuivante<EtapeCycle>(
    actif.cycle, position, depart, (e) => etapeMasquee(e.id, adaptation),
  );

  const cycleNomme: EtapeNommee[] = actif.cycle.map((e) => ({ id: e.id, nom: e.nom }));
  const demande = cibleDemandee({ designation, nom }, cycleNomme);

  /* ⚠️ L'ADAPTATION QUI MASQUE TOUT SE DIT, ELLE NE SE DÉGUISE PAS EN NOM
     INCONNU. Sans ce garde, une demande qui ne cite rien retombait sur
     « introuvable » avec un titre vide : le Guide reprochait alors une
     étape inexistante à quelqu'un qui n'en avait nommé aucune. */
  if (demande.mode === "prochaine" && !compatible) {
    return {
      ok: false,
      refus: "aucune_compatible",
      jusquau: adaptation ? libelleJour(adaptation.fin) : undefined,
    };
  }

  const viseeId = demande.mode === "nommee"
    ? demande.id
    : demande.mode === "prochaine"
      ? compatible?.id ?? null
      : null;
  const etape = viseeId ? actif.cycle.find((e) => e.id === viseeId) ?? null : null;

  const verdict = verdictEtape({
    etape: etape ? { id: etape.id, position: etape.position } : null,
    compatible: compatible ? { id: compatible.id } : null,
    masquee: etapeMasquee(etape?.id ?? null, adaptation),
    positionConsommee: position,
  });

  if (!verdict.ok) {
    return {
      ok: false,
      refus: verdict.refus,
      nom: etape?.nom ?? (demande.mode === "introuvable" ? demande.nom : undefined),
      proposable: compatible?.nom,
      jusquau: adaptation ? libelleJour(adaptation.fin) : undefined,
    };
  }

  const visee = etape as EtapeCycle;

  /* ⚠️ LA RÉSERVATION SE CHERCHE EN BASE, JAMAIS DANS LA SEMAINE
     CHARGÉE. Une étape datée au-delà de la fenêtre affichée est hors de
     tout ce que l'écran a lu : la chercher là rendrait le geste
     intermittent selon le jour où l'on parle, c'est-à-dire pire qu'un
     geste qui échoue franchement. C'est la leçon de V7A.

     ⚠️ ET SON ÉCHEC EST UN REFUS, PAS UN `null`. Croire qu'il n'y a pas
     de réservation alors qu'on n'a pas su lire, c'est exactement ce qui
     fait naître une SECONDE ligne sur la même étape : le double-fermage
     de V7A, par un autre chemin. */
  let reservation: PlanningDay | null;
  try {
    reservation = await reservationDeLEtape(userId, visee.id);
  } catch (e) {
    console.warn("[etapeCiblee] réservation illisible :", (e as Error)?.message);
    return { ok: false, refus: "illisible", nom: visee.nom };
  }

  /* Ce que devient la prochaine étape une fois celle-ci refermée : on
     dérive depuis SA position, avec le même filtre d'adaptation. La
     carte peut donc NOMMER la suite avant le clic. */
  const apres = etapeSuivante<EtapeCycle>(
    actif.cycle, visee.position, depart, (e) => etapeMasquee(e.id, adaptation),
  );

  return {
    ok: true,
    visee: { programmeId: actif.programme.id, etape: visee, apres, reservation, adaptation },
  };
}
