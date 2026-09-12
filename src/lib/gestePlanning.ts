/* ════════════════════════════════════════════════════════════════════
   V9B · UN GESTE DE PLANNING SE DÉCLARE, PUIS S'APPLIQUE.

   Avant cette vague, `confirmPlan` (dans `AssistantContext`) était le
   second moteur de planning de l'app : il décidait quoi libérer, dans
   quel ordre, avec quelle portée, et il écrivait lui-même. C'est ce qui a
   laissé passer les deux défauts que V9B répare — une réservation
   d'étape effacée sans le dire, et « refais ma semaine » qui supprimait
   tout ce qui était prévu. Une règle d'écriture cachée dans un contexte
   React est une règle que personne ne relit.

   Ici, deux moitiés bien séparées :

   • LA DÉCISION est PURE. Quelle intention un geste vise, ce qu'il change
     pour le programme, ce qu'il préserve : ce sont des fonctions sans
     requête ni horloge, donc entièrement vérifiables hors ligne, sur une
     app pourtant auth-gated. C'est ce qui permet à la carte de NOMMER la
     conséquence avant le clic, et au banc de le prouver.

   • L'APPLICATION ne fait que ROUTER vers les autorités existantes
     (`saveDay`, `ajouterIntention`, `retirerIntention`, `libererMobilier`).
     Elle n'écrit rien elle-même et ne porte aucune règle : ajouter un
     geste en V9C ne doit pas rouvrir un moteur de planning ici.

   ⚠️ AUCUNE ÉCRITURE SANS CLIC, ET LA RÈGLE NE BOUGE PAS. Un geste se
   compose au moment où le Guide comprend la demande, s'affiche dans une
   carte, et ne part en base qu'au bouton violet.
   ════════════════════════════════════════════════════════════════════ */

import {
  ajouterIntention, etapeLiee, hasSeance, libererMobilier, reserveUneEtape,
  retirerIntention, saveDay,
  type Origine, type PlanningDay,
} from "@/lib/planning";
import { sauterEtape } from "@/lib/programme";

/* ═══════════════════ Ce qu'un geste déclare ═══════════════════ */

/**
 * UN geste de planning, tel que la carte l'annonce et tel qu'il s'écrit.
 *
 * ⚠️ L'IDENTITÉ VISÉE EST DANS LE GESTE, ELLE N'EST PLUS DEVINÉE À
 * L'ÉCRITURE. `poser` sait choisir sa cible quand on ne lui en donne pas,
 * mais alors la carte et la base répondent chacune de leur côté à la
 * question « qui est remplacé ? », et rien ne garantit qu'elles disent la
 * même chose. Le Guide résout donc la cible pour composer sa phrase, et
 * c'est CETTE ligne-là qu'il écrit.
 */
export type GestePlanning =
  /** Réécrire une intention remplaçable de la journée (ou en créer une). */
  | { type: "remplacer"; jour: PlanningDay }
  /** Poser une séance EN PLUS de ce qui est déjà là (supplément). */
  | { type: "ajouter"; jour: PlanningDay }
  /**
   * V9C · SUBSTITUER : faire autre chose À LA PLACE d'une étape du cycle.
   *
   * ⚠️ `jour` PORTE DÉJÀ SON `etapeId`, ET C'EST TOUTE LA DIFFÉRENCE
   * AVEC « remplacer ». Remplacer réécrit une ligne qui ne vient d'aucune
   * étape ; substituer écrit une ligne qui en REFERME une, avec un
   * contenu qui vient d'ailleurs. Son `id` dit si l'on reprend la
   * réservation existante ou si l'on crée : on n'en crée jamais une
   * seconde, `uniq_intention_par_etape` la refuserait.
   */
  | { type: "substituer"; jour: PlanningDay }
  /**
   * V9C · SAUTER : cette étape ne se fera pas, et le cycle avance.
   *
   * ⚠️ AUCUN CONTENU, DONC AUCUN `PlanningDay`. Un saut n'est pas une
   * séance : il n'a ni exercices, ni durée, ni lieu. Le déclarer comme
   * une intention ordinaire ferait croire à un écran qu'il y a quelque
   * chose à lancer.
   */
  | {
      type: "sauter";
      programmeId: string;
      etape: { id: string; nom: string };
      /** La réservation à REPRENDRE, ou `null` si l'étape n'a pas de jour. */
      reservationId: string | null;
      adaptationId: string | null;
    }
  /** Changer la date d'une intention existante : même ligne, même identité. */
  | { type: "deplacer"; jour: PlanningDay }
  /** Refaire la semaine : on libère le mobilier, puis on pose. */
  | { type: "semaine"; poser: PlanningDay[]; liberer: string[] }
  /** Retirer une intention du planning, sans rien marquer. */
  | { type: "retirer"; intentionId: string };

/* ═══════════════════ Résoudre CE QUE la demande désigne ═══════════════════ */

/** Une étape du cycle, réduite à ce qu'il faut pour la reconnaître. */
export type EtapeNommee = { id: string; nom: string };

/** Ce que la demande précise : un jour, un nom, ou les deux. */
export type FiltreCible = { date?: string | null; nom?: string | null };

const sansAccent = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * L'étape du cycle que ce nom désigne, s'il en désigne une.
 *
 * ⚠️ C'EST LA SEULE TRADUCTION NOM → IDENTITÉ DE TOUTE LA VAGUE, ET ELLE
 * EST BORNÉE AU CYCLE PERSISTÉ, comme `idsMasques` en V8. Un nom qui ne
 * correspond à aucune étape ne devient jamais une identité de programme :
 * il ne sert alors qu'à désigner une ligne, et rien de métier n'en dépend.
 */
export function etapeParNom(cycle: EtapeNommee[] | null | undefined, nom: string | null | undefined): EtapeNommee | null {
  return candidatsEtape(cycle, nom)[0] ?? null;
}

/**
 * TOUTES les étapes que ce nom pourrait désigner, la plus sûre en tête.
 *
 * ⚠️ `etapeParNom` EN DÉRIVE, ET C’EST VOULU : DEUX QUESTIONS, UNE SEULE
 * RÈGLE. Les gestes qui visent une ligne du planning veulent savoir
 * LAQUELLE, et le premier candidat suffit puisque le titre n’y est qu’un
 * repli ; une adaptation, elle, a besoin de savoir COMBIEN, parce qu’elle
 * coche des cases dans un formulaire et qu’un mot ambigu y cocherait la
 * mauvaise sans rien dire. Écrire la seconde règle à côté de la première,
 * c’était garantir que les deux divergent au premier ajustement.
 *
 * L’ordre ne bouge pas : l’égalité exacte d’abord, l’inclusion ensuite.
 * `candidatsEtape(...)[0]` rend donc EXACTEMENT ce que `etapeParNom`
 * rendait, et le banc le balaie sur tout le vivier de `buildSplit`.
 *
 * ⚠️ L’INCLUSION EXIGE TOUJOURS `n.length > 2` : sans ça, une étape dont
 * le nom fait deux lettres attraperait tout mot qui les contient.
 */
export function candidatsEtape(
  cycle: EtapeNommee[] | null | undefined,
  nom: string | null | undefined,
): EtapeNommee[] {
  const cible = sansAccent(nom ?? "");
  if (!cible || !cycle || cycle.length === 0) return [];
  const exacts = cycle.filter((e) => sansAccent(e.nom) === cible);
  if (exacts.length > 0) return exacts;
  return cycle.filter((e) => {
    const n = sansAccent(e.nom);
    return n.length > 2 && (n.includes(cible) || cible.includes(n));
  });
}

/**
 * Les intentions que la demande désigne, dans l'ordre des jours.
 *
 * ⚠️ L'IDENTITÉ PASSE AVANT LE TITRE, ET C'EST TOUT L'ARBITRAGE. « Mets
 * Bas du corps à vendredi » nomme une étape du cycle : on cherche donc
 * les intentions qui la RÉSERVENT ou qui en PROVIENNENT, jamais celles qui
 * s'appellent pareil. Une séance du catalogue intitulée « Push » n'est pas
 * l'étape Push, c'est la règle verrouillée depuis V4.
 *
 * ⚠️ LE TITRE RESTE UN REPLI, PARCE QU'IL FAUT BIEN DÉSIGNER LES AUTRES.
 * Une séance perso, une séance du catalogue, une impro : elles ne portent
 * aucune identité de programme, donc leur nom est la seule chose qui les
 * désigne. Le repli sert aussi quand le nom EST une étape mais qu'aucune
 * ligne ne la porte : sans lui, une séance visible à l'écran deviendrait
 * introuvable pour le Guide.
 *
 * ⚠️ RIEN DE MÉTIER NE DÉPEND DE CE REPLI. Une fois la ligne désignée,
 * c'est son `id` et ses propres colonnes qui voyagent : un déplacement
 * garde la réservation, la provenance et l'adaptation de la ligne, quel
 * que soit le chemin par lequel on l'a trouvée.
 *
 * On ne désigne QUE des séances encore prévues : un fait ne se déplace ni
 * ne se retire, et un jour de repos n'est pas une séance.
 */
export function resoudreCibles(
  intentions: PlanningDay[] | null | undefined,
  filtre: FiltreCible,
  cycle?: EtapeNommee[] | null,
): PlanningDay[] {
  let base = (intentions ?? []).filter((i) => !!i.id && i.status === "planned" && hasSeance(i));
  if (filtre.date) base = base.filter((i) => i.date === filtre.date);

  const nom = (filtre.nom ?? "").trim();
  if (nom) {
    const etape = etapeParNom(cycle, nom);
    const parIdentite = etape
      ? base.filter((i) => i.etapeId === etape.id || i.provenanceId === etape.id)
      : [];
    const cible = sansAccent(nom);
    const parTitre = base.filter((i) => sansAccent(i.title).includes(cible));
    base = parIdentite.length > 0 ? parIdentite : parTitre;
  }
  return [...base].sort((a, b) => a.date.localeCompare(b.date));
}

/* ═══════════════════ Ce que le geste change, en toutes lettres ═══════════════════ */

/**
 * ⚠️ LES CONSÉQUENCES VIENNENT DU CODE, JAMAIS DU MODÈLE. Le coach n'a
 * plus d'outils depuis juillet et ne voit pas ce qu'on écrit : le laisser
 * décrire l'effet d'un geste, ce serait lui faire promettre ce qu'il ne
 * peut pas savoir. Ces phrases se déduisent de la ligne visée, et la
 * carte les affiche telles quelles, avant le clic.
 */

/** Ce qu'un déplacement change pour le programme. */
export function consequenceDeplacement(d: PlanningDay | null | undefined): string {
  return reserveUneEtape(d)
    ? "Elle reste la séance de programme qu’elle était : elle change juste de jour."
    : "Ta progression de programme ne change pas.";
}

/** Ce qu'un retrait change pour le programme. */
export function consequenceRetrait(d: PlanningDay | null | undefined): string {
  return reserveUneEtape(d)
    ? "Elle n’est ni faite ni sautée : l’étape reste dans ton programme et pourra être reproposée."
    : "Elle n’est ni faite ni sautée. Ton cycle ne change pas.";
}

/**
 * Comment nommer une ligne de programme qu'on laisse en place.
 *
 * ⚠️ LE MOT DIT LAQUELLE DES DEUX PROMESSES ELLE PORTE, et il n'y en a
 * que deux : une réservation referme une étape du cycle, une séance
 * régénérée dit seulement d'où venait son contenu. Les appeler pareil
 * ferait promettre à la seconde ce que seule la première tient.
 */
const etatGardee = (d: PlanningDay): string => (reserveUneEtape(d) ? "réservée" : "prévue");

/**
 * Ce qu'une pose sur un jour change, selon ce qu'elle trouve.
 *
 * ⚠️ LE TROISIÈME CAS EST LA RAISON D'ÊTRE DE CETTE FONCTION. Quand la
 * journée ne porte qu'une séance de programme, le geste ne la réécrit
 * pas : il s'ajoute à côté, et la carte le dit AVANT le clic. C'est le
 * contraire de ce que faisait `plan_set`, qui l'écrasait sans un mot.
 *
 * ⚠️ `gardee` EST LA LIGNE DE PROGRAMME QUI RESTE, RÉSERVATION OU NON.
 * Le paramètre s'appelait `reservation` et ne recevait que les lignes
 * portant `etape_consommee_id` : une séance régénérée n'était donc
 * nommée nulle part, et la carte annonçait « ta progression de programme
 * ne change pas » à l'instant précis où elle allait effacer le lien de
 * cette séance vers son étape.
 */
export function consequencePose(
  cible: PlanningDay | null | undefined,
  gardee: PlanningDay | null | undefined,
): string {
  const nom = gardee ? (gardee.title || "ta séance de programme").trim() : "";
  if (cible) {
    return gardee
      ? `« ${nom} » reste ${etatGardee(gardee)} ce jour-là.`
      : "Ta progression de programme ne change pas.";
  }
  if (gardee) return `« ${nom} » reste ${etatGardee(gardee)} ce jour-là : celle-ci s’ajoute à côté.`;
  return "Rien d’autre n’est prévu ce jour-là.";
}

/* ═══════════════════ V9C · les trois gestes de cycle ═══════════════════

   ⚠️ CES TROIS PHRASES SONT LA MOITIÉ DE LA VAGUE. Substituer, sauter et
   ajouter ne se distinguent par aucun signe visible sur la carte : même
   coquille, même bouton violet. Ce qui les sépare, c'est ce qu'ils font
   au cycle, et personne ne peut le deviner après coup. Elles se
   déduisent donc de l'étape visée et de ce qui la suit, et elles
   s'affichent AU-DESSUS du bouton. */

/** Ce qu'une substitution change : l'étape est refermée, mais plus tard. */
export function consequenceSubstitution(etape: string, apres: string | null): string {
  const suite = apres
    ? `ta prochaine étape deviendra « ${apres} »`
    : "ton cycle avancera";
  return `« ${etape} » ne sera pas faite : ${suite}, une fois cette séance terminée.`;
}

/**
 * Ce qu'un saut change : tout de suite, et sans séance.
 *
 * ⚠️ ELLE DIT CE QUE ÇA N'EST PAS, ET C'EST LE PLUS IMPORTANT. Un saut
 * ressemble à « c'est fait » dans le planning (l'étape est refermée, le
 * curseur avance) sans en être un : aucune séance, aucune EXP, aucune
 * mission, aucune journée validée. Sans cette phrase, la seule façon de
 * l'apprendre serait de constater après coup que rien n'a été crédité.
 *
 * ⚠️ ET ELLE LE DIT EN NOMMANT CE QUI N'EST PAS CRÉDITÉ, plus en
 * décrivant un statut. « Ne sera comptée ni comme faite, ni comme une
 * séance » était juste, mais il fallait déjà connaître le modèle pour
 * comprendre ce que ça coûte : personne ne sait ce qu'est « compter
 * comme une séance ». La séance enregistrée et l'EXP, elles, se voient.
 */
export function consequenceSaut(etape: string, apres: string | null): string {
  const suite = apres
    ? `Ta prochaine étape devient « ${apres} » tout de suite.`
    : "Ton cycle avance tout de suite.";
  return `« ${etape} » sera passée, sans séance enregistrée ni EXP. ${suite}`;
}

/** Ce qu'un supplément change : rien, et c'est exactement sa raison d'être. */
export function consequenceSupplement(etape: string | null): string {
  return etape
    ? `« ${etape} » reste ta prochaine étape : celle-ci s’ajoute à côté.`
    : "Ta progression de programme ne change pas.";
}

/* ═══════════════ V9C ter · CE QUE « REMPLACE » VEUT DIRE ═══════════════

   ⚠️ LE GARDE-FOU DE V9B PROTÉGEAIT AUSSI CE QU'ON LUI DEMANDAIT
   EXPLICITEMENT, ET C'ÉTAIT LE DÉFAUT. Une ligne qui porte une identité
   de programme ne se fait pas écraser par un geste qu'on n'a PAS demandé :
   la règle est juste, et elle ne bouge pas. Mais `plan_set` ne portait
   aucune trace de ce que la personne avait DIT, donc « mets du pecs
   jeudi » et « remplace ma séance d'aujourd'hui par Express 12 »
   arrivaient sous exactement la même forme. On s'écartait dans les deux
   cas, et le second se transformait en supplément alors qu'il demandait
   un remplacement en toutes lettres.

   ⚠️ LE SIGNAL QUI MANQUAIT EST LINGUISTIQUE, PAS MOTEUR : c'est le verbe
   employé, et c'est exactement le genre de paramètre pauvre que la
   décision 7 de V9 autorise, au même titre que `quoi` (V9B) et `portee`
   (V9C). L'aiguilleur reste aveugle : il rapporte le mot, le CODE résout
   l'identité.

   ⚠️ ET ON NE BASCULE JAMAIS SUR UN TITRE. La ligne du jour doit porter
   l'identité de la PROCHAINE ÉTAPE COMPATIBLE, comparée par `etapeLiee`.
   Une séance du catalogue intitulée « Push » n'est pas l'étape Push, et
   une étape qui n'est pas la prochaine ferait avancer le cycle de
   plusieurs crans (décision 2 de V9). Dans ces cas-là on ne devine pas :
   on explique. */

/** Ce qu'un « poser une séance sur un jour » doit réellement devenir. */
export type VoiePose =
  /** Une ligne ordinaire se laisse réécrire : comportement historique. */
  | "remplacer"
  /** Rien à réécrire (ou remplacement non demandé) : on pose à côté. */
  | "ajouter"
  /** Remplacement explicite de la prochaine étape : c'est une SUBSTITUTION. */
  | "substituer"
  /** Explicite, mais la ligne ne porte pas la prochaine étape compatible. */
  | "conflit_etape"
  /** Explicite, mais l'étape est déjà réservée par une AUTRE ligne. */
  | "conflit_reservation";

/**
 * L'ordre des questions est la règle, comme partout dans ce chantier :
 * une cible ordinaire l'emporte toujours (on ne touche au programme que
 * s'il n'y a rien d'autre à réécrire) · pas de ligne de programme, rien à
 * arbitrer · pas de remplacement demandé, on garde le garde-fou V9B · et
 * seulement alors on compare les identités.
 */
export function voieDeLaPose(input: {
  /** La demande dit-elle EN TOUTES LETTRES qu'elle remplace ? */
  explicite: boolean;
  /** Ce qu'un remplacement ordinaire a le droit de réécrire ce jour-là. */
  cible: Pick<PlanningDay, "id"> | null;
  /** La ligne de programme posée ce jour-là, s'il y en a une. */
  programme: Pick<PlanningDay, "id" | "etapeId" | "provenanceId"> | null;
  /** L'identité de la prochaine étape compatible, ou `null` si inconnue. */
  compatibleId: string | null;
  /** La ligne qui RÉSERVE déjà cette étape, s'il y en a une. */
  reservationId: string | null;
}): VoiePose {
  if (input.cible) return "remplacer";
  if (!input.programme) return "ajouter";
  if (!input.explicite) return "ajouter";
  const lien = etapeLiee(input.programme);
  if (!lien || !input.compatibleId || lien !== input.compatibleId) return "conflit_etape";
  /* ⚠️ UNE SUBSTITUTION REPREND LA RÉSERVATION DE L'ÉTAPE, ET IL N'Y EN A
     QU'UNE. Si la ligne du jour n'est pas celle-là, l'écrire refermerait
     l'étape deux fois : `uniq_intention_par_etape` refuserait la seconde
     ligne prévue, et le geste échouerait au clic après avoir promis le
     contraire sur la carte. */
  if (input.reservationId && input.programme.id && input.reservationId !== input.programme.id) {
    return "conflit_reservation";
  }
  return "substituer";
}

/** Ce qu'une semaine régénérée préserve. `gardes` = les jours intouchés. */
export function consequenceSemaine(gardes: string[]): string {
  const base = "Seules les séances posées automatiquement sont remplacées.";
  if (gardes.length === 0) return base;
  const liste = gardes.length === 1 ? gardes[0] : gardes.slice(0, -1).join(", ") + " et " + gardes[gardes.length - 1];
  return `${base} ${liste} ne bouge${gardes.length > 1 ? "nt" : ""} pas.`;
}

/* ═══════════════════ Appliquer : router, et rien de plus ═══════════════════ */

/**
 * Écrit le geste, en passant par les autorités qui savent déjà le faire.
 * Rend la date sur laquelle l'écran doit se recaler, ou `null`.
 *
 * ⚠️ CETTE FONCTION NE DOIT JAMAIS PORTER DE RÈGLE. Pas de choix de
 * cible, pas de tri de dates, pas de « et si ». Tout ce qui décide vit
 * au-dessus (les fonctions pures de ce fichier) ou en dessous (`poser`,
 * qui tient la règle repos/séance et le lien programme). Le jour où elle
 * commence à arbitrer, `confirmPlan` a simplement changé d'adresse.
 */
export async function appliquerGeste(
  userId: string,
  geste: GestePlanning,
  origine: Origine = "guide",
): Promise<string | null> {
  switch (geste.type) {
    case "remplacer":
    case "deplacer":
      await saveDay(userId, geste.jour, origine);
      return geste.jour.date;
    case "ajouter":
      await ajouterIntention(userId, geste.jour, origine);
      return geste.jour.date;
    case "substituer":
      /* ⚠️ ON REPREND LA RÉSERVATION QUAND ELLE EXISTE, ON N'EN CRÉE
         JAMAIS UNE SECONDE. `uniq_intention_par_etape` refuserait la
         deuxième intention PRÉVUE portant la même étape, et le geste
         échouerait au clic après avoir promis le contraire sur la carte.
         L'identité vient de `viserEtape`, la seule autorité qui la
         cherche (en base, jamais dans la semaine chargée). */
      if (geste.jour.id) await saveDay(userId, geste.jour, origine);
      else await ajouterIntention(userId, geste.jour, origine);
      return geste.jour.date;
    case "sauter":
      await sauterEtape(userId, geste.programmeId, geste.etape, geste.reservationId, geste.adaptationId);
      /* Aucune date à montrer : le saut se date du jour où on le décide,
         et l'écran se recale dessus comme sur n'importe quel fait. */
      return null;
    case "semaine": {
      /* ⚠️ ON LIBÈRE AVANT D'ÉCRIRE, ET JAMAIS UN JOUR QU'ON ÉCRIT : ce
         jour-là garde sa ligne, qui est REMPLACÉE au lieu d'être
         supprimée puis recréée. Une ligne qui change d'identité à chaque
         régénération, c'est un déplacement qu'on ne peut plus suivre. */
      const aLiberer = geste.liberer.filter((d) => !geste.poser.some((p) => p.date === d));
      await libererMobilier(userId, aLiberer);
      for (const jour of geste.poser) await saveDay(userId, jour, origine);
      return geste.poser[0]?.date ?? null;
    }
    case "retirer":
      await retirerIntention(userId, geste.intentionId);
      return null;
  }
}
