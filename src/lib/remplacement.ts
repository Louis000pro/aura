/* ════════════════════════════════════════════════════════════════════
   R3 · CHANGER UN EXERCICE EN COURS DE SÉANCE (maquette 07, écran 06 ;
   décisions 49 et 56 ; tour 26 de Codex)

   Pure : aucune requête, aucun DOM. Le tunnel affiche, ce module décide.

   ⚠️ UN ÉQUIVALENT A LA MÊME FONCTION, SE FAIT AU MÊME LIEU ET SE MESURE
   DE LA MÊME FAÇON. Un exercice chronométré ne récupère jamais une
   prescription en répétitions, et l'inverse. Il a une clé stable et une
   animation (il vient de la bibliothèque des 102). Sans équivalent, on le
   dit : on ne cherche pas ailleurs en contournant ces règles.

   ⚠️ L'IDENTITÉ SE GARDE SÉRIE PAR SÉRIE. Chaque série validée porte
   l'exercice réellement fait (`ExerciceEffectif`), donc A en série 1,
   B en série 2 puis C en série 3 restent trois faits distincts. Le
   remplacement COURANT ne vaut que pour les séries qui restent. Revenir
   à A ne lui rend aucune charge : chaque changement repart d'une charge
   inconnue.

   « Pour cette séance seulement » est le seul choix en R3 : la
   préférence durable (« À chaque fois ») arrive avec R7.
   ════════════════════════════════════════════════════════════════════ */

import { PROPRIETES, type ExercicePrescrit, type Fonction } from "@/lib/banqueEtapes";
import { cleExercice } from "@/lib/exerciceCle";
import { exercicesDisponibles, trouverExercice } from "@/lib/exerciseLibrary";
import type { ExerciceEffectif } from "@/lib/saisieSerie";
import type { Ctx } from "@/lib/planning";

export type MesureEx = "reps" | "duree";

/** Un équivalent proposé. */
export type Equivalent = ExerciceEffectif & { muscles: string[]; tip: string };

const LIEUX_DU_PLUS_SOBRE: Ctx[] = ["poids", "halteres", "salle"];

function praticableA(nom: string, lieu: Ctx): boolean {
  return exercicesDisponibles(lieu).some((e) => e.name === nom);
}

/**
 * Le lieu où chercher des équivalents. Celui de la séance quand on le
 * connaît ; sinon le lieu le PLUS SOBRE où l'exercice prévu se fait : si
 * on peut faire l'original là, on peut faire l'équivalent. Prudent, mais
 * jamais faux.
 */
export function lieuPourEquivalents(lieuSeance: Ctx | null | undefined, nomPrevu: string): Ctx {
  if (lieuSeance) return lieuSeance;
  return LIEUX_DU_PLUS_SOBRE.find((l) => praticableA(nomPrevu, l)) ?? "salle";
}

/** La mesure d'un exercice de la bibliothèque. */
export function mesureDe(nom: string): MesureEx | null {
  const lib = trouverExercice(nom);
  if (!lib) return null;
  return lib.mode === "temps" ? "duree" : "reps";
}

/**
 * Les équivalents d'un emplacement : même fonction, même lieu, même
 * mesure, une clé, une entrée dans la bibliothèque. Sans l'exercice
 * actuellement fait (le remplacer par lui-même n'a pas de sens).
 */
export function equivalents(e: {
  fonction: Fonction;
  mesure: MesureEx;
  lieu: Ctx;
  cleActuelle: string;
}): Equivalent[] {
  const ok = new Set(exercicesDisponibles(e.lieu).map((x) => x.name));
  const sortie: Equivalent[] = [];
  for (const [nom, prop] of Object.entries(PROPRIETES)) {
    if (prop.fonction !== e.fonction || !ok.has(nom)) continue;
    const lib = trouverExercice(nom);
    const cle = cleExercice(nom);
    if (!lib || !cle || cle === e.cleActuelle) continue;
    if ((lib.mode === "temps" ? "duree" : "reps") !== e.mesure) continue;
    sortie.push({ cle, nom: lib.name, chargeType: prop.charge, muscles: lib.muscles, tip: lib.tip });
  }
  return sortie;
}

/** L'exercice prévu par la prescription, comme exercice effectif. */
export function exercicePrevu(ex: ExercicePrescrit): ExerciceEffectif | null {
  const p = ex.prescription;
  if (!p) return null;
  return { cle: p.cle, nom: ex.name, chargeType: p.charge_type };
}

/** Le remplacement courant d'un emplacement, s'il y en a un. */
export type Remplacements = Record<number, ExerciceEffectif>;

/** L'exercice que les séries RESTANTES d'un emplacement vont faire. */
export function exerciceCourant(ex: ExercicePrescrit, emplacement: number, r: Remplacements): ExerciceEffectif | null {
  return r[emplacement] ?? exercicePrevu(ex);
}

/**
 * L'exercice à AFFICHER pour un emplacement : la prescription d'origine
 * (séries, répétitions, repos, durée) avec le nom, le conseil et les
 * muscles du remplaçant. La prescription ne change jamais.
 */
export function exerciceAffiche<E extends ExercicePrescrit>(ex: E, emplacement: number, r: Remplacements): E {
  const rem = r[emplacement];
  if (!rem) return ex;
  const lib = trouverExercice(rem.nom);
  return { ...ex, name: rem.nom, tip: lib?.tip ?? "", muscles: lib?.muscles ?? [] };
}

/**
 * Remplacer l'exercice courant d'un emplacement. Revenir à l'exercice
 * prévu efface le remplacement (les séries restantes refont l'original),
 * sans rien lui rendre : sa charge repart inconnue.
 */
export function remplacer(ex: ExercicePrescrit, emplacement: number, r: Remplacements, par: ExerciceEffectif): Remplacements {
  const suite = { ...r };
  const prevu = exercicePrevu(ex);
  if (prevu && prevu.cle === par.cle) delete suite[emplacement];
  else suite[emplacement] = { cle: par.cle, nom: par.nom, chargeType: par.chargeType };
  return suite;
}

/** « Changer » n'existe que sur un exercice prescrit, tant qu'une série
 *  reste à faire. Après la dernière validation, une correction porte sur
 *  la série réalisée : on ne remplace jamais rétroactivement. */
export function peutChanger(ex: ExercicePrescrit | undefined | null, serieCourante: number): boolean {
  return !!ex?.prescription && serieCourante < ex.sets;
}
