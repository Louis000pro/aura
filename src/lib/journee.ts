/* ════════════════════════════════════════════════════════════════════
   V7A · L'ÉTAT DE LA JOURNÉE, EN UNE FONCTION PURE.

   Cette décision se prenait dans `/progression`, au milieu d'un écran de
   4 000 lignes, donc elle n'était pas vérifiable : l'app est auth-gated,
   et personne ne peut ouvrir cet écran sans compte. Elle vit maintenant
   ici, à côté du modèle qu'elle interprète, et le banc `check:programme`
   l'exerce sur ses sept états.

   ⚠️ « REPOS » ET « LIBRE » NE SONT PAS LA MÊME CHOSE, et c'est tout le
   sens de V5 : un repos est une intention qu'on a POSÉE, « libre » c'est
   l'absence de ligne. Avant, les deux s'affichaient « Repos. », donc
   l'app affirmait un repos que personne n'avait choisi.

   ⚠️ L'ORDRE DES QUESTIONS EST LA RÈGLE PRODUIT, PAS UN DÉTAIL. Ce qui
   est FAIT passe avant ce qui est prévu (sinon une séance terminée se
   reproposerait toute la journée) ; une intention datée passe avant
   l'étape du cycle (le planning dit QUAND, quand il dit quelque chose) ;
   et l'étape passe avant « libre » (le programme dit QUOI même sans
   aucune date).
   ════════════════════════════════════════════════════════════════════ */

import { estRepos, hasSeance, type Ctx, type PlanningDay } from "@/lib/planning";
import type { WorkoutDifficulty } from "@/lib/assistantActions";
import type { Exercise } from "@/components/WorkoutGuideModal";

export type EtatJournee =
  /** On ne sait pas encore : on n'affirme jamais « rien de prévu » avant d'avoir lu. */
  | "loading"
  /** Le questionnaire n'a pas été rempli : il n'y a rien à lire. */
  | "setup"
  /** Une séance datée aujourd'hui, encore à faire. */
  | "seance"
  /** Pas de date, mais le programme propose la suite du cycle. */
  | "etape"
  /** Un repos EXPLICITEMENT posé. */
  | "repos"
  /** Rien de prévu, et ce n'est pas un repos. */
  | "libre"
  /** La séance principale du jour est terminée. */
  | "done";

export function etatJournee(input: {
  /** La lecture est-elle revenue ? */
  pret: boolean;
  /** Le questionnaire n'a jamais été rempli. */
  besoinSetup: boolean;
  /** L'intention PRINCIPALE d'aujourd'hui, ou `null` s'il n'y a aucune ligne. */
  jour: PlanningDay | null;
  /** La prochaine étape du cycle, ou `null` s'il n'y a pas de programme. */
  etape: unknown | null;
}): EtatJournee {
  if (!input.pret) return "loading";
  if (input.besoinSetup) return "setup";
  if (input.jour?.status === "done") return "done";
  if (hasSeance(input.jour)) return "seance";
  if (estRepos(input.jour)) return "repos";
  if (input.etape) return "etape";
  return "libre";
}

/* ════════════════════════════════════════════════════════════════════
   V7A · L'ÉTAPE SUIVANTE SAIT SI ELLE A DÉJÀ UN JOUR.

   ⚠️ CE BLOC RÉPARE LE DÉFAUT DU 2026-09-06, ET IL EST DANS LA SOURCE
   DE JOURNÉE PARCE QUE C'EST LÀ QU'EST LA CAUSE. Push était réservée
   pour le mardi ; l'accueil, qui ne regarde que les intentions
   D'AUJOURD'HUI, ne voyait rien, et `etapeSuivante` ne dérive son
   curseur que des étapes REFERMÉES, donc une réservation en attente ne
   lui dit rien non plus. Le héros la proposait comme une étape libre,
   le lanceur déclarait `cible: etape`, et la fin de séance INSÉRAIT une
   seconde ligne portant la même étape. `uniq_intention_par_etape` ne
   pouvait pas l'attraper : il ne couvre que les intentions PRÉVUES, et
   la ligne insérée naît « faite ».
   ════════════════════════════════════════════════════════════════════ */

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/**
 * Le jour d'une réservation, dit comme on le dirait à voix haute.
 *
 * ⚠️ « QUAND TU VEUX » RESTE LA VÉRITÉ D'UNE ÉTAPE SANS DATE, et cette
 * fonction ne s'appelle jamais dans ce cas : le programme dit QUOI, le
 * planning dit QUAND *quand il dit quelque chose*. Ce qu'on répare ici
 * est l'inverse, une étape qui a bel et bien un jour et à qui l'écran
 * répondait quand même « quand tu veux ».
 */
export function libelleReservation(date: string, today: string): string {
  if (date === today) return "aujourd’hui";
  /* ⚠️ ON FORMATE EN LOCAL, JAMAIS PAR `toISOString()`. Minuit local
     rendu en UTC recule d'un jour dès qu'on est à l'est de Greenwich :
     « demain » deviendrait « aujourd'hui » pour tout le monde en France. */
  const j = new Date(today + "T00:00:00");
  j.setDate(j.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  if (date === `${j.getFullYear()}-${p(j.getMonth() + 1)}-${p(j.getDate())}`) return "demain";
  const jour = new Date(date + "T00:00:00");
  const i = jour.getDay() === 0 ? 6 : jour.getDay() - 1;
  return `${JOURS[i]} ${jour.getDate()}`;
}

/** Ce que le héros lance, et par quel chemin la fin de séance refermera. */
export type LancementJournee =
  /** Une ligne existe en base : on la MARQUE, par son identité. */
  | { genre: "intention"; intention: PlanningDay }
  /** Rien n'est écrit : la fin de séance écrira le fait et refermera l'étape. */
  | { genre: "etape" }
  /** Rien à lancer (pas d'étape, ou instance vide). */
  | null;

/**
 * QUOI LANCER DEPUIS LE HÉROS, ET SURTOUT SUR QUOI LE REFERMER.
 *
 * ⚠️ L'ORDRE EST LA RÈGLE, PAS UN DÉTAIL D'IMPLÉMENTATION.
 * · La séance DATÉE AUJOURD'HUI d'abord : elle existe, on la marque.
 * · Puis la RÉSERVATION de l'étape, où qu'elle soit posée dans le
 *   calendrier. Décider de faire mardi dès dimanche est parfaitement
 *   légitime, mais c'est TOUJOURS cette ligne-là qu'on termine : en
 *   créer une seconde ferait deux intentions pour une seule étape.
 * · L'étape LIBRE en dernier, et elle seule autorise l'insertion.
 *
 * Fonction pure : c'est ce qui permet au banc de rejouer les trois cas
 * hors ligne, sur une app pourtant auth-gated.
 */
export function lancementDuJour(input: {
  /** L'intention principale d'aujourd'hui. */
  jour: PlanningDay | null;
  /** La réservation en attente de l'étape suivante, où qu'elle soit datée. */
  reservation: PlanningDay | null;
  /** La prochaine étape du cycle. */
  etape: unknown | null;
  /** L'instance est-elle matérialisable (sinon il n'y a rien à lancer) ? */
  instancePrete: boolean;
}): LancementJournee {
  if (hasSeance(input.jour)) return { genre: "intention", intention: input.jour! };
  if (input.reservation?.id) return { genre: "intention", intention: input.reservation };
  if (input.etape && input.instancePrete) return { genre: "etape" };
  return null;
}

/**
 * REFAIRE LA SÉANCE QU'ON VIENT DE FAIRE, ET RIEN D'AUTRE.
 *
 * ⚠️ CE N'EST PAS UN CAS PARTICULIER DE `lancementDuJour`, ET LES
 * SÉPARER EST TOUTE LA CORRECTION. Cette fonction-là répond à « qu'est-ce
 * qui vient MAINTENANT » ; celle-ci répond à « refais ce qui vient
 * d'avoir lieu ». Les faire passer par la même résolution, c'était
 * écrire « Refaire la séance » sur un bouton qui fait autre chose, et le
 * mode d'échec dépendait des données : une séance faite qui porte encore
 * ses exercices était bien relancée, mais AVEC SA CIBLE, donc la
 * terminer refermait une seconde fois une étape déjà refermée (`date` et
 * `consommee_le` du fait d'origine réécrits) ; une séance faite sans
 * contenu, elle, tombait jusqu'à l'étape suivante et lançait Pull sous
 * un bouton qui promettait Push. Deux défauts, une seule cause : la
 * question posée n'était pas celle du bouton.
 *
 * ⚠️ ET LA RÉPÉTITION EST UN SUPPLÉMENT. Elle a bien eu lieu, et
 * `workout_sessions` l'enregistre tout seul ; mais elle ne referme
 * AUCUNE étape, c'est la règle déjà verrouillée du modèle : une séance
 * hors programme ne fait pas avancer le cycle. Le curseur ne bouge donc
 * pas, aucun second `etape_consommee_id` n'est écrit, et la prochaine
 * étape reste celle qui suit le fait d'origine.
 *
 * `null` quand il n'y a rien à refaire : la journée n'est pas terminée,
 * ou la ligne ne porte aucun contenu relançable.
 */
export function repetitionDuJour(jour: PlanningDay | null): PlanningDay | null {
  if (jour?.status !== "done") return null;
  return hasSeance(jour) ? jour : null;
}

/* ════════════════════════════════════════════════════════════════════
   V7A · DATER LA PROCHAINE ÉTAPE DU PROGRAMME.

   ⚠️ C'EST LE SEUL GESTE QUI CRÉE UNE INTENTION PORTANT UNE ÉTAPE, ET
   C'EST VOULU. Le programme dit QUOI, le planning dit QUAND : quand la
   personne donne un jour à sa prochaine étape, l'intention qui naît doit
   porter le lien vers cette étape, sinon la faire ne referme rien et le
   héros la repropose le lendemain, indéfiniment. C'est le seul chemin où
   la consommation est EXPLICITE ; partout ailleurs (catalogue, séance
   perso, supplément, impro) l'intention naît sans lien, et ne consomme
   donc rien.

   ⚠️ ON NE DEVINE JAMAIS. Une séance du catalogue intitulée « Push »
   posée le même jour reste un supplément : la ressemblance des titres
   ne fait pas avancer un cycle.

   Fonction pure : elle ne lit rien, n'écrit rien, et c'est ce qui la
   rend vérifiable sur une app pourtant auth-gated.
   ════════════════════════════════════════════════════════════════════ */
export function intentionDeLEtape(input: {
  date: string;
  programmeId: string;
  etape: { id: string; nom: string };
  difficulty: WorkoutDifficulty;
  location: Ctx | null;
  /** L'instance matérialisée à l'instant où l'on date : une intention
   *  datée doit pouvoir se lancer, comme toutes les autres. */
  exerciseList: Exercise[];
}): PlanningDay {
  return {
    id: null,
    date: input.date,
    type: "Force",
    title: input.etape.nom,
    difficulty: input.difficulty,
    location: input.location,
    exerciseList: input.exerciseList,
    // Aucun modèle de bibliothèque derrière une étape de cycle.
    sessionId: null,
    status: "planned",
    programmeId: input.programmeId,
    etapeId: input.etape.id,
  };
}
