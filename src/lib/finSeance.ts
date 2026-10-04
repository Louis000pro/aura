/* ════════════════════════════════════════════════════════════════════
   V7A · L'AUTORITÉ UNIQUE DE FIN DE SÉANCE

   ⚠️ CE FICHIER EXISTE PARCE QUE LE HÉROS QUITTE `/progression`. Tant que
   le seul écran capable de lancer une séance du planning était celui qui
   la fermait, la logique pouvait vivre dans cet écran. À partir du moment
   où l'accueil lance lui aussi, deux copies de « que faire quand la
   séance est finie » divergeraient au premier changement : l'une
   marquerait l'intention, l'autre oublierait de refermer l'étape, et
   l'écart ne se verrait qu'en base, jamais à l'écran.

   La règle est donc : ON NE FERME UNE SÉANCE QU'ICI, et le seul appelant
   est la finalisation du journal (`journalSeance.ts`), APRÈS
   l'enregistrement de la séance (R1).

   ⚠️ R1 bis · LA FERMETURE REND UN RÉSULTAT VÉRIFIÉ, ET ELLE SE REJOUE.
   Elle avalait ses erreurs et ne regardait pas si une ligne avait bougé :
   le journal pouvait être écrit, le planning rester ouvert, et l'attente
   disparaître quand même. Désormais :
   · elle dit ce qui s'est passé (`fermee`, `deja`, `introuvable`,
     `echec`), et seul `echec` laisse le travail en attente ;
   · elle porte l'identifiant du LANCEMENT sur l'intention qu'elle
     referme, et la base refuse deux intentions pour un même lancement
     (`uniq_intention_lancement`) : rejouer la fermeture d'une ÉTAPE (une
     insertion) ne crée plus de jumelle ;
   · elle se date avec les horodatages du JOURNAL, jamais avec l'horloge
     du moment : une séance faite samedi et récupérée dimanche reste
     faite samedi, et le curseur garde son ordre ;
   · une intention déjà résolue est rendue telle quelle, sans réécriture. Un écran qui lance
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

import { schemaIntentions, type Ctx } from "@/lib/planning";
import { consommerEtape } from "@/lib/programme";
import { createClient } from "@/lib/supabase";
import { parisDateStr } from "@/lib/dates";
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
      /* R6 · l'occurrence figée au lancement. ABSENTE d'une finalisation
         préparée avant R6 et restée en attente sur un téléphone : elle reste
         récupérable, la réservation se cherche alors par étape et la base
         donne le rang (`attribuer_rang`). */
      rang?: number | null;
      type: string;
      title: string;
      difficulty: string;
      location: Ctx | null;
      exerciseList: Exercise[];
      /* V8 · l'adaptation sous laquelle l'étape a été matérialisée. Une
         TRACE sur le fait, jamais une décision : le curseur, lui, avance
         exactement comme sans adaptation. */
      adaptationId?: string | null;
    };

/** Ce que la fermeture écrit, tiré du JOURNAL et jamais de l'horloge. */
export type FaitSeance = {
  lancementId: string;
  /** L'heure exacte de fin : elle ordonne le curseur (`consommee_le`). */
  consommeeLe: string;
  /** Le jour parisien de la fin : ce que la semaine donne à lire. */
  date: string;
};

/** Le fait d'une séance, à partir de son journal. Pur. */
export function faitDeLaSeance(j: { lancement_id: string; fin: string }): FaitSeance {
  return { lancementId: j.lancement_id, consommeeLe: j.fin, date: parisDateStr(new Date(j.fin)) };
}

/**
 * · `fermee` : cet appel vient de refermer la cible.
 * · `deja` : elle l'était déjà (par ce lancement, ou résolue autrement) ;
 *   rien n'est réécrit.
 * · `introuvable` : l'intention n'existe plus (retirée entre-temps) ; il
 *   n'y a plus rien à refermer, et ce n'est pas une erreur à rejouer.
 * · `echec` : on ne sait pas ; le travail reste en attente.
 */
export type ResultatFermeture = "fermee" | "deja" | "introuvable" | "echec";

export const fermetureTerminee = (r: ResultatFermeture) => r !== "echec";

/** Ce dont la fermeture a besoin en base. Injectable : le banc la joue
 *  sur une base en mémoire, avec ses pannes. */
export type StoreFermeture = {
  /** L'intention déjà refermée par ce lancement, s'il y en a une. */
  parLancement(userId: string, lancementId: string): Promise<{ ok: true; id: string | null } | { ok: false }>;
  /** `null` : introuvable ; sinon, est-elle déjà résolue ? */
  intention(userId: string, id: string): Promise<{ ok: true; resolue: boolean | null } | { ok: false }>;
  /** La réservation en cours de cette occurrence (ou, sans rang, de cette étape). */
  reservation(userId: string, cible: Extract<CibleSeance, { genre: "etape" }>): Promise<{ ok: true; id: string | null } | { ok: false }>;
  /** Marque faite, SEULEMENT si elle est encore prévue ; rend le nombre de lignes touchées. */
  marquer(userId: string, id: string, fait: FaitSeance): Promise<{ ok: true; touchees: number } | { ok: false }>;
  /** Écrit le fait d'une étape sans réservation. `doublon` : ce lancement l'a déjà écrit. */
  inserer(userId: string, cible: Extract<CibleSeance, { genre: "etape" }>, fait: FaitSeance): Promise<"ok" | "doublon" | "echec">;
};

/** Marque une intention prévue, et vérifie que c'est bien fait. */
async function marquerVerifie(store: StoreFermeture, userId: string, id: string, fait: FaitSeance): Promise<ResultatFermeture> {
  const m = await store.marquer(userId, id, fait);
  if (!m.ok) return "echec";
  if (m.touchees > 0) return "fermee";
  /* Aucune ligne touchée : quelqu'un l'a résolue entre-temps (nous-mêmes,
     dans un autre onglet ?), ou elle a disparu. On relit au lieu de
     supposer. */
  const relue = await store.intention(userId, id);
  if (!relue.ok) return "echec";
  if (relue.resolue === null) return "introuvable";
  return relue.resolue ? "deja" : "echec";
}

/**
 * Referme ce que la séance vient de refermer, et rien de plus. Rejouable :
 * un second appel pour le même lancement rend `deja` sans rien écrire.
 * Ne jette jamais.
 */
export async function fermerCible(
  store: StoreFermeture, userId: string, cible: CibleSeance, fait: FaitSeance,
): Promise<ResultatFermeture> {
  try {
    const dejaFaite = await store.parLancement(userId, fait.lancementId);
    if (!dejaFaite.ok) return "echec";
    if (dejaFaite.id) return "deja";

    if (cible.genre === "intention") {
      const ligne = await store.intention(userId, cible.intentionId);
      if (!ligne.ok) return "echec";
      if (ligne.resolue === null) return "introuvable";
      /* Déjà résolue autrement : c'est un fait, on ne le réécrit pas. */
      if (ligne.resolue) return "deja";
      return await marquerVerifie(store, userId, cible.intentionId, fait);
    }

    /* ⚠️ GARDE-FOU D'INTÉGRITÉ, ET IL A UNE HISTOIRE (2026-09-06). Un
       appelant peut encore déclarer `cible: etape` sur une étape pourtant
       réservée. Insérer écrirait alors une SECONDE ligne portant la même
       étape, que `uniq_intention_par_etape` ne voit pas (elle ne couvre
       que les intentions PRÉVUES). On termine donc la réservation. */
    const res = await store.reservation(userId, cible);
    if (!res.ok) return "echec";
    if (res.id) return await marquerVerifie(store, userId, res.id, fait);
    const ins = await store.inserer(userId, cible, fait);
    return ins === "ok" ? "fermee" : ins === "doublon" ? "deja" : "echec";
  } catch (e) {
    console.error("[finSeance] fermeture impossible :", e);
    return "echec";
  }
}

/** La base réelle. */
export function storeFermeture(): StoreFermeture {
  const supabase = createClient();
  return {
    async parLancement(userId, lancementId) {
      const sc = await schemaIntentions();
      const { data, error } = await supabase.from(sc.table).select("id")
        .eq("user_id", userId).eq("lancement_id", lancementId).limit(1);
      if (error) return { ok: false };
      return { ok: true, id: data?.[0]?.id ? String(data[0].id) : null };
    },
    async intention(userId, id) {
      const sc = await schemaIntentions();
      const { data, error } = await supabase.from(sc.table).select(sc.colStatut)
        .eq("user_id", userId).eq("id", id).maybeSingle();
      if (error) return { ok: false };
      if (!data) return { ok: true, resolue: null };
      const statut = (data as unknown as Record<string, unknown>)[sc.colStatut];
      return { ok: true, resolue: statut !== sc.versBase.planned };
    },
    async reservation(userId, cible) {
      const sc = await schemaIntentions();
      let q = supabase.from(sc.table).select("id")
        .eq("user_id", userId).eq("etape_consommee_id", cible.etapeId)
        .eq(sc.colStatut, sc.versBase.planned);
      /* R6 · l'occurrence quand on la connaît ; sinon (finalisation d'avant
         R6), la réservation de l'étape, unique tant que
         `uniq_intention_par_etape` tient. */
      if (cible.rang) q = q.eq("programme_id", cible.programmeId).eq("rang", cible.rang);
      const { data, error } = await q.limit(1);
      if (error) return { ok: false };
      return { ok: true, id: data?.[0]?.id ? String(data[0].id) : null };
    },
    async marquer(userId, id, fait) {
      const sc = await schemaIntentions();
      /* ⚠️ `date` = le jour du fait (une séance réservée pour mardi et
         faite dimanche ne reste pas écrite au mardi), `consommee_le` =
         l'heure exacte de fin, qui ordonne le curseur. Le filtre sur le
         statut fait que seule une intention ENCORE prévue est touchée. */
      const { data, error } = await supabase.from(sc.table)
        .update({
          [sc.colStatut]: sc.versBase.done,
          date: fait.date,
          consommee_le: fait.consommeeLe,
          lancement_id: fait.lancementId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id).eq("user_id", userId).eq(sc.colStatut, sc.versBase.planned)
        .select("id");
      if (error) return { ok: false };
      return { ok: true, touchees: data?.length ?? 0 };
    },
    async inserer(userId, cible, fait) {
      return consommerEtape(userId, cible.programmeId, cible.etapeId, {
        type: cible.type,
        title: cible.title,
        difficulty: cible.difficulty,
        location: cible.location,
        exerciseList: cible.exerciseList,
      }, fait, cible.rang ?? null, cible.adaptationId ?? null);
    },
  };
}

/** La fermeture réelle, et le signal aux écrans quand quelque chose a bougé. */
export async function terminerSeance(userId: string, cible: CibleSeance, fait: FaitSeance): Promise<ResultatFermeture> {
  const r = await fermerCible(storeFermeture(), userId, cible, fait);
  if (r === "fermee" && typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
  return r;
}
