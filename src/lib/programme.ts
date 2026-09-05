/* ════════════════════════════════════════════════════════════════════
   V4.5 · LE PREMIER PROGRAMME, ET LA PROCHAINE ÉTAPE

   V4 a posé les tables et les invariants ; personne ne crée de
   programme. V5 va arrêter d'écrire le planning à la lecture. Entre les
   deux il manquait une marche, et c'est ce fichier : quand quelqu'un
   entre dans le nouveau moteur sans programme actif, Vaiiya lui en crée
   un À PARTIR DE CE QU'IL A DÉJÀ RÉPONDU.

   ⚠️ CE N'EST PAS UNE MIGRATION DE DONNÉES, ET C'EST LA DÉCISION DE
   LOUIS (2026-09-05). On ne reconstruit pas l'ancien planning, on ne
   devine pas où chacun en était dans son ancien cycle, on ne touche
   à aucune ligne de `planning_days`. La bêta a très peu de comptes
   actifs : un moteur propre vaut mieux qu'une reprise sophistiquée
   d'états imparfaits. Le nouveau programme part donc de sa première
   étape (`position_initiale = 1`), et le nouveau moteur devient la
   source de vérité à partir de son activation.

   ⚠️ AUCUNE SÉANCE FUTURE N'EST ÉCRITE. Le programme est persisté dans
   sa STRUCTURE : l'intention de fond d'un côté, le cycle de l'autre. La
   seule écriture de `planning_days` de ce fichier est `consommerEtape`,
   et elle arrive APRÈS la séance : c'est un fait qu'on enregistre, pas
   une intention qu'on matérialise d'avance.

   ⚠️ LE CYCLE NE PORTE QUE LES SÉANCES, PAS LES JOURS DE REPOS.
   `REST_PATTERN` (dans `planning.ts`) dit sur quels jours de la SEMAINE
   se posent les séances : c'est une règle de PLACEMENT, calendaire, et
   le cycle est justement ce qui ne connaît aucune date. Mettre les repos
   dans le cycle y réenfermerait la semaine de sept jours qu'on est en
   train d'en sortir. Le repos redevient ce que le modèle en dit : une
   intention explicite et datée, ou rien.

   ⚠️ BRANCHÉ PAR V5 (2026-09-05). `/entrainement` appelle
   `getOrCreateProgramme` à l'ouverture : c'est la seule écriture que la
   lecture d'un écran autorise encore, elle n'arrive qu'une fois par
   personne, et elle n'écrit ni séance ni date.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { cycleDeReference, schemaIntentions } from "@/lib/planning";
import { libelleObjectif } from "@/lib/profilOnboarding";

/** La première étape du cycle. Les positions sont numérotées à partir de
 *  1, pour que `position_initiale = 1` veuille dire ce qu'il a l'air de
 *  vouloir dire : le cycle commence à sa première étape. */
export const POSITION_INITIALE = 1;

export type Nature = "seance" | "repos";
export type Origine = "systeme" | "utilisateur" | "guide";

export interface EtapeCycle {
  id: string;
  position: number;
  nom: string;
  nature: Nature;
  dureeMin: number | null;
  origine: Origine;
}

export interface Programme {
  id: string;
  nom: string;
  intention: string | null;
  statut: "actif" | "archive";
  origine: Origine;
  positionInitiale: number;
}

export interface ProgrammeEtCycle {
  programme: Programme;
  cycle: EtapeCycle[];
}

/* ═══════════════ Les décisions, en fonctions pures ═══════════════
   Tout ce qui DÉCIDE vit ici, sans base de données : c'est ce qui rend
   ces règles vérifiables hors ligne, sur une app pourtant auth-gated.
   La partie qui écrit, plus bas, ne fait que les appliquer.          */

/** Une étape telle qu'on la crée : elle n'a pas encore d'identifiant. */
export interface EtapeNeuve {
  position: number;
  nom: string;
  nature: Nature;
  dureeMin: number | null;
  origine: Origine;
}

/**
 * Le cycle qu'on écrirait pour cette cible, ou `null` s'il ne faut RIEN
 * écrire du tout.
 *
 * ⚠️ `0` et `null` rendent tous les deux `null`, pour deux raisons
 * différentes qu'il ne faut pas confondre en lisant le code appelant :
 * `0`, c'est quelqu'un qui a répondu « aucune séance par semaine », et
 * on respecte sa réponse ; `null`, c'est quelqu'un qui n'a pas répondu,
 * et on n'invente pas un programme à sa place. Dans les deux cas il n'y
 * a ni programme, ni cycle, ni « prochaine séance » fictive.
 *
 * ⚠️ `duree_min` reste NULL : dans la chaîne de surcharge
 * (intention → adaptation → programme → contexte), NULL veut dire
 * HÉRITE. Recopier ici la durée cible du contexte la figerait dans le
 * programme, donc la changer plus tard ne changerait plus rien.
 */
export function etapesDuCycle(seancesCible: number | null | undefined): EtapeNeuve[] | null {
  if (seancesCible === null || seancesCible === undefined) return null;
  if (!Number.isFinite(seancesCible) || seancesCible <= 0) return null;

  return cycleDeReference(seancesCible).map((nom, i) => ({
    position: POSITION_INITIALE + i,
    nom,
    nature: "seance" as Nature,
    dureeMin: null,
    origine: "systeme" as Origine,
  }));
}

/** Le nom du programme, à partir de ce que la personne a déjà dit. On ne
 *  met jamais le nombre de séances dedans : il vit dans le contexte, et
 *  un nom qui porte un chiffre devient faux le jour où le chiffre bouge. */
export function nomDeProgramme(objectifs: string[] | null | undefined): string {
  const premier = (objectifs ?? []).find((g) => typeof g === "string" && g.trim());
  return premier ? libelleObjectif(premier) : "Mon programme";
}

/**
 * L'étape SUIVANTE, dérivée et jamais stockée.
 *
 * `positionConsommee` est la position de la dernière étape refermée (la
 * dernière intention résolue qui portait un `etape_consommee_id`,
 * ordonnée par `consommee_le`). `null` = aucune étape refermée, donc on
 * est au départ du cycle.
 *
 * ⚠️ Le cycle TOURNE : après la dernière étape, on revient à la
 * première. C'est ce qui permet à trois lignes de tenir des mois sans
 * qu'on écrive une seule séance d'avance.
 */
export function etapeSuivante<T extends { position: number }>(
  cycle: T[],
  positionConsommee: number | null,
  positionInitiale: number = POSITION_INITIALE,
): T | null {
  if (cycle.length === 0) return null;
  const ordonne = [...cycle].sort((a, b) => a.position - b.position);

  if (positionConsommee === null) {
    // Le départ : l'étape à la position de report, sinon la première du
    // cycle. `position_initiale` est ce qui empêche un simple ajustement
    // de programme de renvoyer tout le monde à l'étape 1.
    return ordonne.find((e) => e.position === positionInitiale) ?? ordonne[0];
  }

  const i = ordonne.findIndex((e) => e.position === positionConsommee);
  // Étape inconnue (elle appartenait à une version archivée) : on repart
  // du point de report plutôt que de rendre « rien à faire ».
  if (i === -1) return ordonne.find((e) => e.position === positionInitiale) ?? ordonne[0];
  return ordonne[(i + 1) % ordonne.length];
}

/* ═══════════════ La partie qui lit et qui écrit ═══════════════ */

interface LigneProgramme {
  id: string;
  nom: string;
  intention: string | null;
  statut: string;
  origine: string;
  position_initiale: number;
}
interface LigneEtape {
  id: string;
  position: number;
  nom: string;
  nature: string;
  duree_min: number | null;
  origine: string;
}

function versProgramme(r: LigneProgramme): Programme {
  return {
    id: r.id,
    nom: r.nom,
    intention: r.intention,
    statut: r.statut === "archive" ? "archive" : "actif",
    origine: (r.origine as Origine) ?? "systeme",
    positionInitiale: r.position_initiale ?? POSITION_INITIALE,
  };
}
function versEtape(r: LigneEtape): EtapeCycle {
  return {
    id: r.id,
    position: r.position,
    nom: r.nom,
    nature: r.nature === "repos" ? "repos" : "seance",
    dureeMin: r.duree_min,
    origine: (r.origine as Origine) ?? "systeme",
  };
}

const COLS_PROGRAMME = "id, nom, intention, statut, origine, position_initiale";
const COLS_ETAPE = "id, position, nom, nature, duree_min, origine";

/** Le programme actif et son cycle, s'ils existent déjà. */
export async function lireProgrammeActif(userId: string): Promise<ProgrammeEtCycle | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("programmes")
    .select(COLS_PROGRAMME)
    .eq("user_id", userId)
    .eq("statut", "actif")
    .maybeSingle();
  if (!data) return null;

  const programme = versProgramme(data as LigneProgramme);
  const { data: etapes } = await supabase
    .from("programme_seances")
    .select(COLS_ETAPE)
    .eq("programme_id", programme.id)
    .order("position", { ascending: true });

  return { programme, cycle: ((etapes ?? []) as LigneEtape[]).map(versEtape) };
}

/**
 * Le programme actif, créé s'il n'existe pas encore.
 *
 * Rend `null` quand il n'y a rien à créer : cible à zéro (réponse
 * assumée) ou aucune réponse du tout. Un `null` n'est pas une panne,
 * c'est « cette personne n'a pas de programme, et c'est normal ».
 */
export async function getOrCreateProgramme(userId: string): Promise<ProgrammeEtCycle | null> {
  if (!userId) return null;

  const existant = await lireProgrammeActif(userId);
  if (existant) return existant;

  const supabase = createClient();

  // ⚠️ La cible se lit dans `contexte_entrainement` et NULLE PART
  // AILLEURS : c'est sa source unique depuis V3, et `profiles` n'en est
  // plus qu'une copie tenue par le dual-write. Mesuré au moment d'écrire
  // ceci : les 40 comptes qui ont répondu ont leur contexte, les autres
  // n'ont rien répondu du tout.
  const { data: ctx } = await supabase
    .from("contexte_entrainement")
    .select("seances_cible")
    .eq("user_id", userId)
    .maybeSingle();

  const etapes = etapesDuCycle((ctx as { seances_cible: number | null } | null)?.seances_cible);
  if (!etapes) return null;

  // L'objectif ne sert qu'à NOMMER le programme. Sa lecture ne doit donc
  // jamais empêcher de le créer : on prend ce qu'on trouve, et sinon un
  // nom neutre.
  let objectifs: string[] | null = null;
  try {
    const { data: profil } = await supabase
      .from("profiles")
      .select("onboarding_goals")
      .eq("id", userId)
      .maybeSingle();
    const brut = (profil as { onboarding_goals: unknown } | null)?.onboarding_goals;
    if (Array.isArray(brut)) objectifs = brut.filter((g): g is string => typeof g === "string");
  } catch { /* le nom aura sa valeur neutre */ }

  const { data: cree, error } = await supabase
    .from("programmes")
    .insert({
      user_id: userId,
      nom: nomDeProgramme(objectifs),
      intention: null,
      statut: "actif",
      // `systeme` : Vaiiya l'a composé à partir de réponses existantes,
      // personne ne l'a délibérément écrit. Le jour où la personne le
      // modifie, l'origine passe à `utilisateur` et la régénération
      // cesse d'y toucher.
      origine: "systeme",
      position_initiale: POSITION_INITIALE,
    })
    .select(COLS_PROGRAMME)
    .single();

  if (error || !cree) {
    // ⚠️ Deux appels simultanés (l'app monte plusieurs écrans à la fois)
    // : le second se fait refuser par `uniq_programme_actif`. Ce n'est
    // pas une erreur, c'est l'invariant qui fait son travail. On relit
    // celui que l'autre vient de créer.
    const rattrape = await lireProgrammeActif(userId);
    if (rattrape) return rattrape;
    console.warn("[programme] création impossible :", error?.message);
    return null;
  }

  const programme = versProgramme(cree as LigneProgramme);

  const { data: etapesCreees, error: errEtapes } = await supabase
    .from("programme_seances")
    .insert(etapes.map((e) => ({
      programme_id: programme.id,
      position: e.position,
      nom: e.nom,
      nature: e.nature,
      duree_min: e.dureeMin,
      origine: e.origine,
    })))
    .select(COLS_ETAPE)
    .order("position", { ascending: true });

  if (errEtapes || !etapesCreees?.length) {
    // Un programme sans cycle serait pire que pas de programme : il
    // occuperait la place unique de l'actif sans jamais pouvoir donner
    // une étape. On défait. (C'est ce `DELETE` qui a révélé le défaut
    // corrigé par V4b : sans lui, il échouerait.)
    await supabase.from("programmes").delete().eq("id", programme.id);
    console.warn("[programme] cycle impossible, programme annulé :", errEtapes?.message);
    return null;
  }

  return { programme, cycle: (etapesCreees as LigneEtape[]).map(versEtape) };
}

/**
 * Referme une étape : la séance vient d'être faite, on écrit LE FAIT.
 *
 * ⚠️ C'EST LA SEULE ÉCRITURE DE `planning_days` DE TOUT CE FICHIER, ET
 * ELLE ARRIVE APRÈS COUP. Rien n'est écrit quand on lit, rien n'est écrit
 * quand on lance : la ligne naît au moment où la séance est terminée,
 * datée du jour où elle a eu lieu. C'est exactement la différence entre
 * une intention qu'on matérialise d'avance et un fait qu'on enregistre.
 *
 * ⚠️ LES DEUX RENVOIS SONT ÉCRITS, ET ILS NE DISENT PAS LA MÊME CHOSE.
 * `programme_seance_id` dit D'OÙ VIENT LE CONTENU, `etape_consommee_id`
 * dit QUELLE ÉTAPE EST REFERMÉE. Ici les deux valent la même étape parce
 * que la personne a fait ce que le programme proposait ; le jour où elle
 * fait autre chose « à la place », ils divergeront, et c'est pour ça
 * qu'il y a deux colonnes et pas un booléen.
 */
export async function consommerEtape(
  userId: string,
  programmeId: string,
  etapeId: string,
  jour: { date: string; type: string; title: string; difficulty: string; location: string | null; exerciseList: unknown[] },
): Promise<void> {
  const supabase = createClient();
  const sc = await schemaIntentions();
  const maintenant = new Date().toISOString();
  /* ⚠️ UN `insert`, ET PLUS UN `upsert` SUR LA DATE (V6b). L'ancienne
     écriture écrasait ce qui se trouvait déjà sur la journée : faire
     l'étape du cycle un jour où une séance était prévue effaçait cette
     intention, et faire une séance un jour de repos effaçait le repos.
     Le fait s'ENREGISTRE, il ne remplace rien : c'est la règle « faire une
     séance non prévue un jour de repos ne touche à rien ». */
  await supabase.from(sc.table).insert({
    user_id: userId,
    date: jour.date,
    type: jour.type,
    title: jour.title,
    difficulty: jour.difficulty,
    location: jour.location,
    exercise_list: jour.exerciseList,
    session_id: null,
    [sc.colStatut]: sc.versBase.done,
    nature: "seance",
    // La personne a délibérément fait cette séance : c'est elle l'auteur,
    // pas le système qui l'avait proposée.
    origine: "utilisateur",
    programme_id: programmeId,
    programme_seance_id: etapeId,
    etape_consommee_id: etapeId,
    consommee_le: maintenant,
    updated_at: maintenant,
  });
}

/**
 * La prochaine étape du cycle pour quelqu'un, dérivée de son journal
 * d'intentions. Rend `null` s'il n'a pas de programme.
 *
 * ⚠️ On ordonne par `consommee_le` et JAMAIS par `date` : une intention
 * non datée n'a pas de date, et c'est justement la forme normale de la
 * prochaine étape. C'est la leçon déjà payée deux fois (l'EXP, la
 * série) : un curseur stocké se désynchronise, une dérivation ne le
 * peut pas.
 */
export async function prochaineEtape(userId: string): Promise<EtapeCycle | null> {
  const actif = await lireProgrammeActif(userId);
  if (!actif) return null;
  return etapeSuivanteDe(userId, actif);
}

/** La prochaine étape d'un programme DÉJÀ chargé : une requête, pas trois.
 *  C'est cette forme qu'utilisent les écrans, qui viennent d'appeler
 *  `getOrCreateProgramme` et n'ont aucune raison de le relire. */
export async function etapeSuivanteDe(userId: string, actif: ProgrammeEtCycle): Promise<EtapeCycle | null> {
  if (actif.cycle.length === 0) return null;
  return etapeSuivante(actif.cycle, await positionConsommee(userId, actif), actif.programme.positionInitiale);
}

/** La position de la dernière étape refermée, ou `null`. */
async function positionConsommee(userId: string, actif: ProgrammeEtCycle): Promise<number | null> {
  const supabase = createClient();
  try {
    const sc = await schemaIntentions();
    const { data } = await supabase
      .from(sc.table)
      .select("etape_consommee_id, consommee_le")
      .eq("user_id", userId)
      .eq("programme_id", actif.programme.id)
      .not("etape_consommee_id", "is", null)
      .in(sc.colStatut, [sc.versBase.done, sc.versBase.skipped])
      .order("consommee_le", { ascending: false })
      .limit(1);

    const derniere = (data ?? [])[0] as { etape_consommee_id: string } | undefined;
    if (!derniere) return null;
    return actif.cycle.find((e) => e.id === derniere.etape_consommee_id)?.position ?? null;
  } catch {
    // On préfère repartir du début du cycle que de prétendre qu'il n'y a
    // rien à faire.
    return null;
  }
}
