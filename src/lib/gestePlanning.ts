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
  ajouterIntention, hasSeance, libererMobilier, reserveUneEtape,
  retirerIntention, saveDay,
  type Origine, type PlanningDay,
} from "@/lib/planning";

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
  const cible = sansAccent(nom ?? "");
  if (!cible || !cycle || cycle.length === 0) return null;
  return cycle.find((e) => sansAccent(e.nom) === cible)
    ?? cycle.find((e) => {
      const n = sansAccent(e.nom);
      return n.length > 2 && (n.includes(cible) || cible.includes(n));
    })
    ?? null;
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
 * Ce qu'une pose sur un jour change, selon ce qu'elle trouve.
 *
 * ⚠️ LE TROISIÈME CAS EST LA RAISON D'ÊTRE DE CETTE FONCTION. Quand la
 * journée ne porte qu'une réservation d'étape, le geste ne la réécrit
 * pas : il s'ajoute à côté, et la carte le dit. C'est le contraire de ce
 * que faisait `plan_set`, qui l'écrasait sans un mot.
 */
export function consequencePose(
  cible: PlanningDay | null | undefined,
  reservation: PlanningDay | null | undefined,
): string {
  if (cible) {
    return reservation
      ? `« ${(reservation.title || "ta séance de programme").trim()} » reste réservée ce jour-là.`
      : "Ta progression de programme ne change pas.";
  }
  if (reservation) {
    const nom = (reservation.title || "ta séance de programme").trim();
    return `« ${nom} » reste réservée ce jour-là : celle-ci s’ajoute à côté.`;
  }
  return "Rien d’autre n’est prévu ce jour-là.";
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
