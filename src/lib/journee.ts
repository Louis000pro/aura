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
