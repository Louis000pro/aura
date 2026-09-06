/* ════════════════════════════════════════════════════════════════════
   V7A · L'AUTORITÉ UNIQUE DE FIN DE SÉANCE

   ⚠️ CE FICHIER EXISTE PARCE QUE LE HÉROS QUITTE `/progression`. Tant que
   le seul écran capable de lancer une séance du planning était celui qui
   la fermait, la logique pouvait vivre dans cet écran. À partir du moment
   où l'accueil lance lui aussi, deux copies de « que faire quand la
   séance est finie » divergeraient au premier changement : l'une
   marquerait l'intention, l'autre oublierait de refermer l'étape, et
   l'écart ne se verrait qu'en base, jamais à l'écran.

   La règle est donc : ON NE FERME UNE SÉANCE QU'ICI, et le tunnel global
   (`WorkoutLaunchContext`) est le seul appelant. Un écran qui lance
   déclare CE QU'IL LANCE (`CibleSeance`) ; il ne décide plus de ce qui
   s'écrit à l'arrivée.

   ⚠️ TROIS CIBLES, ET LEUR DIFFÉRENCE EST LE MODÈLE LUI-MÊME.
   · `intention` : la séance venait d'une ligne datée qui existe déjà en
     base. On la MARQUE faite, par son `id` et jamais par sa date (V6b :
     par la date, on créditerait aussi le supplément du même jour).
   · `etape` : la séance venait du CYCLE, sans aucune ligne écrite
     d'avance. C'est la fin de séance qui écrit le fait, et c'est elle
     qui referme l'étape, donc qui fait avancer le curseur.
   · rien du tout : une séance du catalogue, une impro, une séance perso.
     Elle a bien eu lieu (`workout_sessions` l'enregistre tout seul), mais
     elle ne referme AUCUNE étape : une séance hors programme ne fait pas
     avancer le cycle.
   ════════════════════════════════════════════════════════════════════ */

import { marquerIntention, type Ctx } from "@/lib/planning";
import { consommerEtape } from "@/lib/programme";
import { todayYmd } from "@/lib/planning";
import type { Exercise } from "@/components/WorkoutGuideModal";

/** L'évènement que tous les écrans du planning écoutent déjà. Il est
 *  émis ICI et nulle part ailleurs après une fin de séance : c'est ce
 *  qui garantit que l'accueil et Entraînement se remettent d'accord,
 *  quel que soit celui des deux qui a lancé. */
export const EVT_JOURNEE = "programme-updated";

export type CibleSeance =
  | { genre: "intention"; intentionId: string }
  | {
      genre: "etape";
      programmeId: string;
      etapeId: string;
      type: string;
      title: string;
      difficulty: string;
      location: Ctx | null;
      exerciseList: Exercise[];
    };

/**
 * Referme ce que la séance vient de refermer, et rien de plus.
 *
 * Ne jette jamais : une écriture ratée ne doit pas casser l'écran de fin
 * de séance, qui est un moment de récompense. Elle se voit dans les
 * journaux, et le prochain chargement lira la vérité de la base.
 */
export async function terminerSeance(userId: string, cible: CibleSeance): Promise<void> {
  try {
    if (cible.genre === "intention") {
      await marquerIntention(userId, cible.intentionId, "done");
    } else {
      await consommerEtape(userId, cible.programmeId, cible.etapeId, {
        date: todayYmd(),
        type: cible.type,
        title: cible.title,
        difficulty: cible.difficulty,
        location: cible.location,
        exerciseList: cible.exerciseList,
      });
    }
  } catch (e) {
    console.error("[finSeance] fermeture impossible :", e);
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
}
