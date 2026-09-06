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

import { marquerIntention, reservationDeLEtape, type Ctx } from "@/lib/planning";
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
 * ⚠️ UN LANCEMENT NE REFERME QU'UNE FOIS, ET ÇA NE SE DÉLÈGUE PAS À REACT.
 *
 * Pour une intention, l'écriture est un `update` par `id` : la rejouer ne
 * change rien. Pour une ÉTAPE, c'est un `insert` : un second appel
 * écrirait une seconde ligne « faite » sur la journée. Le cycle, lui, ne
 * bougerait pas deux fois (les deux lignes refermeraient la MÊME étape,
 * et le curseur prend la dernière), mais le journal porterait une séance
 * fantôme, et « le composant ne devrait pas rappeler son callback » n'est
 * pas une garantie, c'est une espérance.
 *
 * Le verrou porte sur l'OBJET du lancement, pas sur la cible : refaire
 * la même étape demain est un nouveau lancement, donc une nouvelle
 * fermeture. `WeakSet` pour ne rien retenir de ce qui est déjà oublié.
 */
export function verrouDeFermeture(): (lancement: object) => boolean {
  const fermees = new WeakSet<object>();
  return (lancement) => {
    if (fermees.has(lancement)) return false;
    fermees.add(lancement);
    return true;
  };
}

/**
 * Referme ce que la séance vient de refermer, et rien de plus.
 *
 * Ne jette jamais : une écriture ratée ne doit pas casser l'écran de fin
 * de séance, qui est un moment de récompense. Elle se voit dans les
 * journaux, et le prochain chargement lira la vérité de la base.
 */
export async function terminerSeance(userId: string, cible: CibleSeance): Promise<void> {
  const aujourdhui = todayYmd();
  try {
    if (cible.genre === "intention") {
      /* ⚠️ LE FAIT SE DATE DU JOUR OÙ IL A EU LIEU. Une séance réservée
         pour mardi et faite dimanche resterait écrite au mardi : le
         planning afficherait une séance « faite » un jour à venir.
         `consommee_le` porte l'heure exacte et ordonne le curseur, mais
         c'est `date` que la semaine donne à lire. */
      await marquerIntention(userId, cible.intentionId, "done", aujourdhui);
    } else {
      /* ⚠️ GARDE-FOU D'INTÉGRITÉ, ET IL A UNE HISTOIRE (2026-09-06).
         Le chemin normal ne passe plus ici quand l'étape a déjà un jour :
         `lancementDuJour` vise alors la réservation, donc la branche du
         dessus. Mais un appelant futur, ou un écran resté sur un état
         périmé, peut encore déclarer `cible: etape` sur une étape
         pourtant réservée. Insérer alors écrirait une SECONDE ligne
         portant la même étape, et la base ne peut pas le refuser :
         `uniq_intention_par_etape` ne couvre que les intentions PRÉVUES,
         or la ligne insérée naît « faite ». On termine donc la
         réservation existante au lieu d'en créer une jumelle. */
      const dejaPosee = await reservationDeLEtape(userId, cible.etapeId);
      if (dejaPosee?.id) {
        await marquerIntention(userId, dejaPosee.id, "done", aujourdhui);
      } else {
        await consommerEtape(userId, cible.programmeId, cible.etapeId, {
          date: aujourdhui,
          type: cible.type,
          title: cible.title,
          difficulty: cible.difficulty,
          location: cible.location,
          exerciseList: cible.exerciseList,
        });
      }
    }
  } catch (e) {
    console.error("[finSeance] fermeture impossible :", e);
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
}
