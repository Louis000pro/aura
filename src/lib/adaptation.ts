/* ════════════════════════════════════════════════════════════════════
   V8 · L'ADAPTATION TEMPORAIRE : UNE COUCHE DATÉE, LUE, JAMAIS ÉCRITE
   DANS LE PROGRAMME.

   Le programme de référence dit QUOI faire ensuite. Une adaptation dit
   ce qui, pendant une période nommée, ne peut pas être fait. Elle vit
   ENTRE le cycle et la matérialisation : on la lit à chaque fois qu'on
   demande la prochaine étape, et elle disparaît en cessant d'être lue.
   Sa fin ne demande donc AUCUNE écriture de « retour au programme » :
   le programme n'a jamais bougé.

   ⚠️ « ÉVITER » N'EST PAS « SAUTER », ET C'EST LA SÉMANTIQUE VERROUILLÉE
   DE CETTE VAGUE (Louis, 2026-09-07). Une étape évitée est MASQUÉE :
   · aucune intention `passee` n'est créée ;
   · aucune consommation fictive, aucun `consommee_le` ;
   · le curseur du cycle ne bouge pas d'un cran ;
   · l'historique ne dit jamais qu'une séance a été faite ou écartée
     alors qu'elle ne l'a pas été.
   `etapeSuivante()` traverse simplement le cycle jusqu'à la prochaine
   étape non masquée, et l'étape masquée revient d'elle-même au tour
   suivant, une fois l'adaptation finie. Le jour où un vrai SAUT existera
   (`effet_cycle = saut`), ce sera une action explicite, qui consommera
   réellement une étape ; ne jamais appeler ce fichier « skip ».

   ⚠️ CE MODULE EST PUR JUSQU'AU SÉPARATEUR. Toutes les DÉCISIONS (quel
   axe est valide, quelle adaptation s'applique aujourd'hui, quelle étape
   est masquée, quelles réservations posent problème) sont des fonctions
   sans base de données : c'est ce qui les rend vérifiables hors ligne sur
   une app pourtant auth-gated. La lecture et l'écriture Supabase vivent
   plus bas, comme dans `programme.ts`.

   ⚠️ IL N'ÉCRIT JAMAIS DANS `programmes` NI DANS `programme_seances`.
   Le banc le vérifie en lisant le source : « le programme de référence
   reste intact » doit être une propriété du chemin, pas une bonne
   volonté.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { adaptationsDisponibles, type PlanningDay } from "@/lib/planning";
import type { Origine } from "@/lib/programme";

/* ═══════════════════ Le vocabulaire, fermé et versionné ═══════════════════

   ⚠️ UNE CLÉ INCONNUE EST REFUSÉE, JAMAIS IGNORÉE. Un JSONB libre
   laisserait écrire une adaptation confirmée, affichée dans l'écran, et
   sans le moindre effet sur ce qui est proposé : c'est le pire mode
   d'échec imaginable pour cette vague. On n'ouvre donc QUE ce qu'un
   moteur applique réellement. V8 = un seul axe.

   Les trois autres axes de l'audit restent fermés, et pour des raisons
   mesurées : `duree_max_min` demande de câbler la durée sur trois
   étages, `eviter_pattern` demande de raccorder la banque `EX` à
   `EXERCISE_LIBRARY` (21 entrées orphelines sur 67), et `seances_max`
   n'a aujourd'hui rien sur quoi mordre, le nouveau moteur ne lisant
   aucune fréquence.                                                     */

export const AXES_VERSION = 1;
export const AXES_CONNUS = ["eviter_etapes"] as const;
export type CleAxe = (typeof AXES_CONNUS)[number];

/** Les axes d'une adaptation. V8 n'en porte qu'un.
 *
 *  ⚠️ `eviter_etapes` PORTE DES IDENTIFIANTS D'ÉTAPES, PAS DES NOMS.
 *  Un nom (« Push ») est une chaîne d'affichage : deux programmes
 *  peuvent la partager, un renommage la casse, et rien n'empêche d'y
 *  écrire n'importe quoi. L'identifiant, lui, se vérifie contre le cycle
 *  déclaré, et la base le vérifie une seconde fois. */
export interface Axes {
  eviter_etapes: string[];
}

export type StatutAdaptation = "active" | "terminee" | "annulee";

export interface Adaptation {
  id: string;
  userId: string;
  /** ⚠️ Le programme AUQUEL elle s'applique. Une adaptation ne se
   *  transporte jamais d'une version de programme à la suivante : ses
   *  étapes n'y existent pas, et elle deviendrait une couche sans effet
   *  qui continue de s'afficher. */
  programmeId: string;
  debut: string;                 // YYYY-MM-DD, inclus
  fin: string;                   // YYYY-MM-DD, inclus
  statut: StatutAdaptation;
  /** Purement descriptif. JAMAIS lu comme de la logique métier. */
  motif: string | null;
  axes: Axes;
  axesVersion: number;
  origine: Origine;
  fermeeLe: string | null;
}

/* ═══════════════════ Les décisions, en fonctions pures ═══════════════════ */

export type ResultatAxes =
  | { ok: true; axes: Axes }
  | { ok: false; raison: string };

export type Verdict = { ok: true } | { ok: false; raison: string };

/**
 * Valide des axes contre le cycle qu'ils prétendent adapter.
 *
 * ⚠️ ELLE REFUSE, ELLE NE CORRIGE PAS. Retirer en silence une clé
 * inconnue ou une étape étrangère, c'est écrire une adaptation qui ne
 * fait pas ce que la personne a demandé, et le lui confirmer quand même.
 */
export function validerAxes(brut: unknown, cycle: { id: string }[]): ResultatAxes {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) {
    return { ok: false, raison: "Les axes d’une adaptation forment un objet." };
  }
  const objet = brut as Record<string, unknown>;

  const inconnues = Object.keys(objet).filter((k) => !(AXES_CONNUS as readonly string[]).includes(k));
  if (inconnues.length > 0) {
    return { ok: false, raison: "Axe inconnu : " + inconnues.join(", ") + "." };
  }

  const brutEtapes = objet.eviter_etapes;
  if (!Array.isArray(brutEtapes)) {
    return { ok: false, raison: "Il faut dire quelles étapes éviter." };
  }
  if (brutEtapes.length === 0) {
    return { ok: false, raison: "Une adaptation qui n’évite rien n’adapte rien." };
  }
  if (!brutEtapes.every((e): e is string => typeof e === "string" && e.length > 0)) {
    return { ok: false, raison: "Une étape se désigne par son identifiant." };
  }
  if (new Set(brutEtapes).size !== brutEtapes.length) {
    return { ok: false, raison: "La même étape est nommée deux fois." };
  }

  const connues = new Set(cycle.map((e) => e.id));
  const etrangeres = brutEtapes.filter((id) => !connues.has(id));
  if (etrangeres.length > 0) {
    return { ok: false, raison: "Cette étape n’appartient pas à ton programme." };
  }

  return { ok: true, axes: { eviter_etapes: [...brutEtapes] } };
}

/* ── Les dates ──────────────────────────────────────────────────────
   Toute l'arithmétique se fait en UTC à partir de la CHAÎNE : une date
   de calendrier n'a pas d'heure, et la repasser par le fuseau du
   navigateur la ferait reculer d'un jour à l'ouest de Greenwich. C'est
   le même piège que la rotation Premium de V7B.                       */

export function ajouterJours(jour: string, n: number): string {
  const d = new Date(jour + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** La réévaluation par défaut. « Jusqu'à nouvel ordre » n'existe pas :
 *  une adaptation sans fin est une modification permanente qui ne dit
 *  pas son nom, et une modification permanente est une NOUVELLE VERSION
 *  du programme, pas une couche qui traîne. */
export const REEVALUATION_SEMAINES = 4;

export function finParDefaut(debut: string): string {
  return ajouterJours(debut, REEVALUATION_SEMAINES * 7);
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 17 sept. » — écrit à la main, donc identique partout et vérifiable
 *  hors ligne, là où `toLocaleDateString` dépend de l'ICU du runtime. */
export function libelleJour(jour: string): string {
  const [, m, d] = jour.split("-");
  return String(Number(d)) + " " + (MOIS[Number(m) - 1] ?? "");
}

/**
 * La période est-elle déclarable ?
 *
 * ⚠️ « JUSQU'À NOUVEL ORDRE » N'EXISTE PAS, ET C'EST UN INVARIANT DU
 * PRODUIT, PAS UNE CONTRAINTE TECHNIQUE. Une adaptation sans fin est une
 * modification permanente qui ne dit pas son nom : elle continuerait
 * d'écarter des séances des mois après que la gêne a disparu, sans que
 * rien ne vienne jamais reposer la question. La base l'impose aussi
 * (`fin date not null`), mais l'écran doit le dire AVANT le clic.
 */
export function validerPeriode(debut: string, fin: string): Verdict {
  if (!debut || !fin) return { ok: false, raison: "Une adaptation a un début et une fin." };
  if (fin < debut) return { ok: false, raison: "La fin ne peut pas précéder le début." };
  return { ok: true };
}

/**
 * L'adaptation qui S'APPLIQUE ce jour-là, ou `null`.
 *
 * ⚠️ LA FIN FAIT FOI, PAS LE STATUT. Une adaptation dont la `fin` est
 * passée cesse de s'appliquer à la seconde où le jour change, même si
 * personne n'a encore écrit son `statut`. C'est le remède au défaut de
 * `challenge_runs`, restée `en_cours` à vie parce que rien ne la
 * fermait : l'affichage recalcule l'expiration au lieu d'attendre une
 * écriture. La fermeture (opportuniste et par le cron) ne fait que
 * ranger la base ; elle ne décide de rien.
 */
export function adaptationActive(liste: Adaptation[], jour: string): Adaptation | null {
  return liste.find((a) => a.statut === "active" && a.debut <= jour && jour <= a.fin) ?? null;
}

/** Une adaptation encore déclarée active alors que sa fenêtre est
 *  passée : c'est elle que la fermeture opportuniste et le cron rangent. */
export function estExpiree(a: Adaptation, jour: string): boolean {
  return a.statut === "active" && a.fin < jour;
}

/** Cette étape est-elle masquée par l'adaptation en cours ? */
export function etapeMasquee(etapeId: string | null | undefined, a: Adaptation | null): boolean {
  if (!a || !etapeId) return false;
  return a.axes.eviter_etapes.includes(etapeId);
}

/** Les étapes du cycle que l'adaptation laisse proposables. Le cycle
 *  lui-même n'est pas touché : on le LIT à travers un filtre. */
export function etapesCompatibles<T extends { id: string }>(cycle: T[], a: Adaptation | null): T[] {
  return cycle.filter((e) => !etapeMasquee(e.id, a));
}

/** Les IDENTIFIANTS des étapes masquées, bornés au cycle donné.
 *
 *  ⚠️ ON NE REND PAS `a.axes.eviter_etapes` TEL QUEL : une adaptation
 *  peut citer une étape d'une version archivée du programme, et la
 *  laisser passer ferait masquer un identifiant qui n'existe plus dans
 *  le cycle qu'on est en train de composer. */
export function idsMasques<T extends { id: string }>(cycle: T[], a: Adaptation | null): string[] {
  return cycle.filter((e) => etapeMasquee(e.id, a)).map((e) => e.id);
}

/** Deux périodes partagent-elles au moins une journée ? Les bornes sont
 *  INCLUSES des deux côtés : finir le 17 et commencer le 18, ce n'est
 *  pas se chevaucher ; partager le 17, si. Même lecture que l'`EXCLUDE`
 *  de la base, pour que l'écran dise ce que la base fera. */
export function chevauchent(
  a: { debut: string; fin: string },
  b: { debut: string; fin: string },
): boolean {
  return a.debut <= b.fin && b.debut <= a.fin;
}

/**
 * LES RÉSERVATIONS QUI EMPÊCHENT D'ACTIVER CETTE ADAPTATION.
 *
 * ⚠️ V8 NE TOUCHE À AUCUNE RÉSERVATION, ET C'EST UNE DÉCISION, PAS UN
 * MANQUE. Supprimer, déplacer ou substituer automatiquement une séance
 * que quelqu'un a posée serait exactement la réécriture silencieuse que
 * le modèle s'interdit. On MONTRE donc les réservations qui portent une
 * étape que l'adaptation masquerait, et on n'active pas tant qu'elles
 * sont là : c'est à la personne de décider ce qu'elle en fait.
 *
 * ⚠️ ON REGARDE LA PROVENANCE, PAS SEULEMENT LA RÉSERVATION, ET C'EST LA
 * CORRECTION DU 2026-09-08. Une séance posée par « Refais ma semaine »
 * ne RÉSERVE aucune étape (elle n'en referme aucune), mais son contenu
 * vient bel et bien d'une étape du cycle : c'est très exactement la
 * séance que l'adaptation existe pour éviter. Ne lire que
 * `etape_consommee_id` laissait donc activer une adaptation par-dessus la
 * séance de ce jour, sans un mot.
 *
 * ⚠️ ET SÛREMENT PAS LE TITRE. « Push » est une chaîne d'affichage : deux
 * programmes la partagent, un renommage la casse, et une séance du
 * catalogue qui s'appelle « Push » n'a rien à voir avec le cycle. C'est
 * l'identifiant d'étape qui décide, jamais le mot.
 *
 * Ne gênent pas, et il faut savoir pourquoi :
 * · une intention HORS de la fenêtre (l'adaptation ne la concerne pas) ;
 * · une intention issue d'une étape AUTORISÉE (rien à lui reprocher) ;
 * · une intention déjà résolue (on ne réécrit jamais un fait) ;
 * · un supplément, une séance du catalogue, une impro : elles ne portent
 *   ni étape ni provenance, donc l'adaptation ne les vise pas.
 */
export function reservationsEnConflit(
  intentions: PlanningDay[],
  fenetre: { debut: string; fin: string; axes: Axes },
): PlanningDay[] {
  const masquees = new Set(fenetre.axes.eviter_etapes);
  return intentions.filter((i) => {
    const source = i.etapeId ?? i.provenanceId ?? null;
    return (
      i.status === "planned" &&
      !!i.date &&
      i.date >= fenetre.debut &&
      i.date <= fenetre.fin &&
      !!source &&
      masquees.has(source)
    );
  });
}

/* ═══════════════════ La partie qui lit et qui écrit ═══════════════════ */

const COLS =
  "id, user_id, programme_id, debut, fin, statut, motif, axes, axes_version, origine, fermee_le";

interface LigneAdaptation {
  id: string;
  user_id: string;
  programme_id: string;
  debut: string;
  fin: string;
  statut: string;
  motif: string | null;
  axes: unknown;
  axes_version: number;
  origine: string;
  fermee_le: string | null;
}

function versAdaptation(r: LigneAdaptation): Adaptation {
  const brut = (r.axes ?? {}) as Record<string, unknown>;
  const etapes = Array.isArray(brut.eviter_etapes)
    ? brut.eviter_etapes.filter((e): e is string => typeof e === "string")
    : [];
  return {
    id: r.id,
    userId: r.user_id,
    programmeId: r.programme_id,
    debut: r.debut,
    fin: r.fin,
    statut: r.statut === "terminee" ? "terminee" : r.statut === "annulee" ? "annulee" : "active",
    motif: r.motif,
    axes: { eviter_etapes: etapes },
    axesVersion: r.axes_version ?? AXES_VERSION,
    origine: (r.origine as Origine) ?? "utilisateur",
    fermeeLe: r.fermee_le,
  };
}

/**
 * Les adaptations encore déclarées actives pour un programme.
 *
 * ⚠️ ELLE NE JETTE JAMAIS, ET C'EST CE QUI REND LA VAGUE DÉPLOYABLE
 * AVANT SA MIGRATION. Tant que la table n'existe pas, la lecture rend
 * une liste vide, donc « aucune adaptation », donc l'app se comporte
 * exactement comme avant V8.
 */
export async function lireAdaptations(userId: string, programmeId: string): Promise<Adaptation[]> {
  if (!userId || !programmeId) return [];
  if (!(await adaptationsDisponibles())) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("adaptations_entrainement")
      .select(COLS)
      .eq("user_id", userId)
      .eq("programme_id", programmeId)
      .eq("statut", "active")
      .order("debut", { ascending: false });
    if (error) return [];
    return ((data ?? []) as unknown as LigneAdaptation[]).map(versAdaptation);
  } catch {
    return [];
  }
}

/**
 * L'adaptation qui s'applique aujourd'hui, et le rangement de celles qui
 * ont expiré.
 *
 * ⚠️ LA FERMETURE EST OPPORTUNISTE ET SANS CONSÉQUENCE. L'affichage a
 * déjà sa réponse avant elle (`adaptationActive` recalcule l'expiration),
 * donc on ne l'attend pas et son échec ne change rien à l'écran. Sans
 * elle, une adaptation périmée resterait `active` en base à vie et
 * bloquerait la suivante par l'`EXCLUDE`, exactement comme
 * `challenge_runs` bloquait le relais suivant.
 */
export async function adaptationDuJour(
  userId: string,
  programmeId: string,
  jour: string,
): Promise<Adaptation | null> {
  const liste = await lireAdaptations(userId, programmeId);
  const perimees = liste.filter((a) => estExpiree(a, jour));
  if (perimees.length > 0) void fermerAdaptations(perimees.map((a) => a.id));
  return adaptationActive(liste, jour);
}

export type CreationAdaptation = {
  userId: string;
  programmeId: string;
  cycle: { id: string }[];
  debut: string;
  fin: string;
  axes: unknown;
  motif?: string | null;
  origine?: Origine;
};

export type ResultatCreation =
  | { ok: true; adaptation: Adaptation }
  | { ok: false; raison: string };

/**
 * Déclare une adaptation.
 *
 * ⚠️ ELLE NE TOUCHE À RIEN D'AUTRE. Aucune intention n'est supprimée,
 * déplacée, substituée ni consommée ; aucune ligne de `programmes` ou de
 * `programme_seances` n'est modifiée. La seule écriture de cette vague,
 * c'est cette ligne-là.
 */
export async function creerAdaptation(input: CreationAdaptation): Promise<ResultatCreation> {
  const periode = validerPeriode(input.debut, input.fin);
  if (!periode.ok) return { ok: false, raison: periode.raison };
  const axes = validerAxes(input.axes, input.cycle);
  if (!axes.ok) return { ok: false, raison: axes.raison };
  if (!(await adaptationsDisponibles())) {
    return { ok: false, raison: "Les adaptations ne sont pas encore ouvertes sur ce compte." };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("adaptations_entrainement")
      .insert({
        user_id: input.userId,
        programme_id: input.programmeId,
        debut: input.debut,
        fin: input.fin,
        statut: "active",
        motif: input.motif?.trim() || null,
        axes: axes.axes,
        axes_version: AXES_VERSION,
        origine: input.origine ?? "utilisateur",
      })
      .select(COLS)
      .single();

    if (error || !data) {
      /* ⚠️ L'`EXCLUDE` N'EST PAS UNE PANNE, C'EST L'INVARIANT QUI
         TRAVAILLE. Une demande qui chevauche l'adaptation en cours doit
         proposer de LA MODIFIER, jamais d'en créer une seconde. */
      const message = error?.message ?? "";
      if (message.includes("adaptations_sans_chevauchement")) {
        /* ⚠️ ON NE PROMET QUE CE QUE L'ÉCRAN SAIT FAIRE. « Modifie-la »
           serait la bonne phrase le jour où l'écran sait modifier une
           adaptation en cours ; aujourd'hui il sait l'arrêter, et c'est
           donc ça qu'on propose. */
        return { ok: false, raison: "Une adaptation couvre déjà ces jours. Arrête-la d’abord, ou choisis d’autres dates." };
      }
      console.warn("[adaptation] création impossible :", message);
      return { ok: false, raison: "L’adaptation n’a pas pu être enregistrée." };
    }
    return { ok: true, adaptation: versAdaptation(data as unknown as LigneAdaptation) };
  } catch (e) {
    console.warn("[adaptation] création impossible :", e);
    return { ok: false, raison: "L’adaptation n’a pas pu être enregistrée." };
  }
}

/**
 * Arrête des adaptations. Aucune écriture de « retour au programme » :
 * le programme de référence n'a jamais bougé, il reprend en cessant
 * d'être filtré.
 */
export async function fermerAdaptations(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("adaptations_entrainement")
      .update({ statut: "terminee", fermee_le: new Date().toISOString() })
      .in("id", ids)
      .eq("statut", "active");
    return !error;
  } catch {
    return false;
  }
}
