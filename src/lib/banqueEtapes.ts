/* ════════════════════════════════════════════════════════════════════
   R2 · CE QU'UNE ÉTAPE DEMANDE, EXERCICE PAR EXERCICE

   Avant R2, une étape du cycle (« Push ») ne portait qu'un nom, et son
   contenu se recalculait à chaque lecture : un tirage dans une banque de
   noms, avec une graine dont faisait partie un compteur du localStorage.
   Deux appareils pouvaient donc proposer deux séances différentes pour la
   même occurrence (décision 44), et 21 noms de la banque n'avaient aucune
   identité stable : leur journal s'écrivait avec une clé nulle, donc
   aucune progression ne pourrait jamais être calculée dessus.

   Ce fichier est la banque, et la composition pure qui en sort un MODÈLE.

   ⚠️ TROIS PROPRIÉTÉS, ET AUCUNE NE SE DEVINE (tour 20 de Codex).
   · La FONCTION du mouvement (tirage horizontal, poussée verticale…) :
     c'est elle qui permettra plus tard de proposer un remplacement
     équivalent. Propriété de l'exercice, déclarée dans `PROPRIETES`.
   · Le TYPE DE CHARGE (totale, par haltère, poids du corps) : propriété
     de l'exercice, déclarée au même endroit. Jamais un cran (R4).
   · Le STATUT dans la séance (repère ou complémentaire) : propriété de
     l'exercice DANS CETTE ÉTAPE, déclarée sur l'entrée de la banque.
     L'ordre de la liste est un ordre de présentation, pas une définition.

   ⚠️ UN EXERCICE N'ENTRE DANS LA BANQUE D'UN LIEU QUE S'IL Y EST
   PRATICABLE. La règle n'est pas recopiée ici : c'est
   `exercicesDisponibles(lieu)`, la même autorité que la génération de
   séance par l'IA. Le banc vérifie chaque entrée contre elle. C'est ce
   qui empêche une substitution d'ajouter un matériel absent (« Tractions
   (ou rowing serviette) » ne devient pas « Tractions » à la maison).

   ⚠️ LA COMPOSITION EST PURE ET DÉTERMINISTE : ni graine, ni `variant`,
   ni localStorage, ni horloge. Les mêmes réglages donnent le même modèle
   sur tous les appareils. Changer la banque ou les règles, c'est changer
   `COMPOSITION_VERSION` : un modèle déjà écrit ne bouge pas.
   ════════════════════════════════════════════════════════════════════ */

import { exercicesDisponibles, trouverExercice } from "@/lib/exerciseLibrary";
import { cleExercice } from "@/lib/exerciceCle";
import type { Exercise } from "@/components/WorkoutGuideModal";

/** Le lieu, identique à `Ctx` de `planning.ts` (pas d'import : cycle). */
export type Lieu = "salle" | "halteres" | "poids";

/** La version des règles de composition. Un modèle porte la sienne. */
export const COMPOSITION_VERSION = 1;

/** Combien d'exercices une étape propose. */
export const EXERCICES_PAR_ETAPE = 5;

export const FONCTIONS = [
  "squat", "unilateral_jambe", "charniere_hanche", "extension_hanche",
  "flexion_genou", "extension_genou", "mollets", "abduction_hanche",
  "isometrie_jambes", "pliometrie",
  "poussee_horizontale", "poussee_verticale", "ecarte_pectoraux",
  "tirage_horizontal", "tirage_vertical", "arriere_epaule", "epaule_isolation",
  "biceps", "triceps",
  "gainage", "flexion_tronc", "extension_tronc",
  "cardio",
] as const;
export type Fonction = (typeof FONCTIONS)[number];

export const TYPES_CHARGE = ["totale", "par_haltere", "assistance", "poids_du_corps"] as const;
export type TypeCharge = (typeof TYPES_CHARGE)[number];

export type StatutExercice = "repere" | "complementaire";
export type Orientation = "force" | "masse" | "general";
export type Mesure = "reps" | "duree";

/* ── Les propriétés de chaque exercice de la banque ─────────────────── */

type Prop = { fonction: Fonction; charge: TypeCharge | null };
const p = (fonction: Fonction, charge: TypeCharge | null): Prop => ({ fonction, charge });

export const PROPRIETES: Readonly<Record<string, Prop>> = {
  // Jambes
  "Presse à cuisses": p("squat", "totale"),
  "Goblet squat": p("squat", "par_haltere"),
  "Squat": p("squat", "poids_du_corps"),
  "Fentes": p("unilateral_jambe", "poids_du_corps"),
  "Squat bulgare": p("unilateral_jambe", "poids_du_corps"),
  "Soulevé de terre roumain": p("charniere_hanche", "totale"),
  "Hip thrust machine": p("extension_hanche", "totale"),
  "Pont fessier": p("extension_hanche", "poids_du_corps"),
  "Leg curl assis": p("flexion_genou", "totale"),
  "Leg curl allongé": p("flexion_genou", "totale"),
  "Leg extension": p("extension_genou", "totale"),
  "Mollets": p("mollets", "poids_du_corps"),
  "Abducteurs machine": p("abduction_hanche", "totale"),
  "Chaise au mur": p("isometrie_jambes", "poids_du_corps"),
  "Squats sautés": p("pliometrie", "poids_du_corps"),
  "Fentes sautées": p("pliometrie", "poids_du_corps"),
  // Poussée
  "Développé couché": p("poussee_horizontale", "totale"),
  "Développé couché haltères": p("poussee_horizontale", "par_haltere"),
  "Développé incliné haltères": p("poussee_horizontale", "par_haltere"),
  "Pompes": p("poussee_horizontale", "poids_du_corps"),
  "Pompes inclinées": p("poussee_horizontale", "poids_du_corps"),
  "Pompes diamant": p("poussee_horizontale", "poids_du_corps"),
  "Développé épaules machine": p("poussee_verticale", "totale"),
  "Développé militaire haltères": p("poussee_verticale", "par_haltere"),
  "Pike push-ups": p("poussee_verticale", "poids_du_corps"),
  "Pec deck": p("ecarte_pectoraux", "totale"),
  // Tirage
  "Tirage poitrine": p("tirage_vertical", "totale"),
  "Rowing assis poulie": p("tirage_horizontal", "totale"),
  "Rowing haltère": p("tirage_horizontal", "par_haltere"),
  "Rowing buste penché haltères": p("tirage_horizontal", "par_haltere"),
  "Face pull poulie": p("arriere_epaule", "totale"),
  "Oiseau haltères": p("arriere_epaule", "par_haltere"),
  // Épaules et bras
  "Élévations latérales": p("epaule_isolation", "par_haltere"),
  "Tirage menton haltères": p("epaule_isolation", "par_haltere"),
  "Curl haltères": p("biceps", "par_haltere"),
  "Curl marteau": p("biceps", "par_haltere"),
  "Curl barre EZ": p("biceps", "totale"),
  "Extension triceps poulie": p("triceps", "totale"),
  "Extension triceps haltère": p("triceps", "par_haltere"),
  "Dips machine": p("triceps", "totale"),
  "Dips sur chaise": p("triceps", "poids_du_corps"),
  // Tronc
  "Gainage": p("gainage", "poids_du_corps"),
  "Planche latérale": p("gainage", "poids_du_corps"),
  "Bird dog": p("gainage", "poids_du_corps"),
  "Crunch": p("flexion_tronc", "poids_du_corps"),
  "Superman": p("extension_tronc", "poids_du_corps"),
  // Cardio : la charge n'a pas de sens
  "Tapis de course": p("cardio", null),
  "Vélo": p("cardio", null),
  "Rameur": p("cardio", null),
  "Corde à sauter": p("cardio", null),
  "Burpees": p("cardio", "poids_du_corps"),
  "Mountain climbers": p("cardio", null),
  "Jumping jacks": p("cardio", null),
  "Montées de genoux": p("cardio", null),
  "Skaters": p("cardio", null),
};

/* ── La banque : lieu → étape → entrées, dans l'ordre de présentation ── */

/** Une entrée de la banque. `series`, `reps` et `dureeS` ne servent qu'aux
 *  séances de cardio, où la prescription est écrite telle quelle. */
export type EntreeBanque = {
  nom: string;
  statut: StatutExercice;
  series?: number;
  reps?: number;
  dureeS?: number;
};

const R = (nom: string): EntreeBanque => ({ nom, statut: "repere" });
const C = (nom: string, x: Omit<EntreeBanque, "nom" | "statut"> = {}): EntreeBanque => ({ nom, statut: "complementaire", ...x });

/* ⚠️ LES REMPLACEMENTS DE R2, NOM PAR NOM, ET POURQUOI (tour 20).
   Même mouvement, autre nom → le nom canonique : Squats → Squat, Chaise
   contre le mur → Chaise au mur, Tapis course → Tapis de course,
   Extensions triceps poulie/haltère → Extension triceps poulie/haltère,
   Tirage vertical → Tirage poitrine, Rowing buste penché → Rowing buste
   penché haltères, Mollets debout → Mollets, Développé épaules haltères →
   Développé militaire haltères, Crunch machine → Crunch (la même fonction,
   sans matériel). Quand le nom canonique était DÉJÀ dans la liste
   (Tirage horizontal, Pompes serrées, Fentes marchées), le doublon part.
   Un autre matériel, ou rien de praticable à cet endroit :
   · Squat haltères → Goblet squat (une haltère, même fonction) ;
   · Fentes haltères, Mollets haltères → Fentes, Mollets (sans charge) ;
   · Hip thrust haltère, Soulevé de terre roumain haltères → Pont fessier.
     Il n'y a AUCUNE charnière de hanche aux haltères dans la bibliothèque
     (le soulevé de terre roumain y demande une barre) : c'est un manque de
     contenu, signalé, pas une équivalence ;
   · Corde à sauter à la maison → Skaters (une corde est un matériel) ;
   · Tractions (ou rowing serviette), Rowing inversé sous table, Gainage
     dorsal : à la maison sans rien, la bibliothèque n'a AUCUN tirage
     praticable (tractions et rowing inversé demandent un agrès). Le Pull
     au poids du corps devient donc une séance de chaîne arrière (Superman,
     Bird dog, Pont fessier, gainage). Manque de contenu, signalé. */
export const BANQUE: Readonly<Record<Lieu, Readonly<Record<string, readonly EntreeBanque[]>>>> = {
  salle: {
    "Full Body": [R("Presse à cuisses"), R("Développé couché"), C("Rowing assis poulie"), C("Développé épaules machine"), C("Leg curl assis"), C("Tirage poitrine"), C("Élévations latérales"), C("Crunch")],
    "Haut du corps": [R("Développé couché"), R("Tirage poitrine"), C("Développé épaules machine"), C("Rowing assis poulie"), C("Élévations latérales"), C("Pec deck"), C("Curl haltères"), C("Extension triceps poulie")],
    "Bas du corps": [R("Presse à cuisses"), R("Soulevé de terre roumain"), C("Leg curl allongé"), C("Leg extension"), C("Hip thrust machine"), C("Fentes"), C("Mollets"), C("Abducteurs machine")],
    "Push": [R("Développé couché"), R("Développé épaules machine"), C("Développé incliné haltères"), C("Pec deck"), C("Élévations latérales"), C("Extension triceps poulie"), C("Dips machine")],
    "Pull": [R("Tirage poitrine"), R("Rowing assis poulie"), C("Rowing haltère"), C("Face pull poulie"), C("Curl barre EZ"), C("Curl haltères")],
    "Cardio / HIIT": [C("Tapis de course", { series: 1, dureeS: 1200 }), C("Vélo", { series: 1, dureeS: 900 }), C("Rameur", { series: 1, dureeS: 600 }), C("Burpees", { series: 4, reps: 15 }), C("Mountain climbers", { series: 4, dureeS: 30 }), C("Corde à sauter", { series: 5, dureeS: 120 })],
  },
  halteres: {
    "Full Body": [R("Goblet squat"), R("Développé couché haltères"), C("Rowing haltère"), C("Développé militaire haltères"), C("Fentes"), C("Curl haltères"), C("Pompes"), C("Gainage", { series: 3, dureeS: 45 })],
    "Haut du corps": [R("Développé couché haltères"), R("Rowing haltère"), C("Développé militaire haltères"), C("Élévations latérales"), C("Curl haltères"), C("Extension triceps haltère"), C("Pompes"), C("Oiseau haltères")],
    "Bas du corps": [R("Goblet squat"), R("Squat bulgare"), C("Fentes"), C("Pont fessier"), C("Mollets")],
    "Push": [R("Développé couché haltères"), R("Développé militaire haltères"), C("Développé incliné haltères"), C("Élévations latérales"), C("Extension triceps haltère"), C("Pompes")],
    "Pull": [R("Rowing haltère"), R("Rowing buste penché haltères"), C("Oiseau haltères"), C("Curl haltères"), C("Curl marteau"), C("Tirage menton haltères")],
    "Cardio / HIIT": [C("Burpees", { series: 4, reps: 15 }), C("Skaters", { series: 5, dureeS: 40 }), C("Mountain climbers", { series: 4, dureeS: 30 }), C("Jumping jacks", { series: 4, dureeS: 40 }), C("Squats sautés", { series: 4, reps: 20 })],
  },
  poids: {
    "Full Body": [R("Squat"), R("Pompes"), C("Fentes"), C("Gainage", { series: 3, dureeS: 45 }), C("Dips sur chaise"), C("Superman"), C("Mountain climbers", { series: 3, dureeS: 30 }), C("Chaise au mur", { series: 3, dureeS: 45 })],
    "Haut du corps": [R("Pompes"), R("Pike push-ups"), C("Dips sur chaise"), C("Pompes inclinées"), C("Superman"), C("Pompes diamant"), C("Gainage", { series: 3, dureeS: 45 })],
    "Bas du corps": [R("Squat"), R("Squat bulgare"), C("Fentes"), C("Pont fessier"), C("Mollets"), C("Chaise au mur", { series: 3, dureeS: 45 }), C("Squats sautés"), C("Fentes sautées")],
    "Push": [R("Pompes"), R("Pike push-ups"), C("Dips sur chaise"), C("Pompes diamant"), C("Pompes inclinées"), C("Gainage", { series: 3, dureeS: 45 })],
    "Pull": [R("Superman"), C("Pont fessier"), C("Bird dog"), C("Gainage", { series: 3, dureeS: 40 }), C("Planche latérale", { series: 3, dureeS: 30 })],
    "Cardio / HIIT": [C("Burpees", { series: 4, reps: 15 }), C("Skaters", { series: 5, dureeS: 40 }), C("Mountain climbers", { series: 4, dureeS: 30 }), C("Jumping jacks", { series: 4, dureeS: 40 }), C("Squats sautés", { series: 4, reps: 20 }), C("Montées de genoux", { series: 4, dureeS: 40 })],
  },
};

/** L'étape de repli quand un nom n'a pas de liste (comme avant R2). */
export const ETAPE_DE_REPLI = "Full Body";

/* ── Le modèle composé et la prescription ───────────────────────────── */

/** Les réglages dont dépend un modèle, conservés AVEC lui (tour 20). */
export type ContexteComposition = {
  lieu: Lieu;
  orientation: Orientation;
  niveau: string | null;
  version: number;
};

/** Une ligne de prescription : celle d'un modèle, ou celle, figée, d'une occurrence. */
export type LignePrescription = {
  /** Le rang dans la séance, base 0 : c'est lui qui relie le journal (R1). */
  emplacement: number;
  exercice_cle: string;
  exercice_nom: string;
  fonction: Fonction;
  statut: StatutExercice;
  series: number;
  mesure: Mesure;
  reps_min: number | null;
  reps_max: number | null;
  /** La cible unique de compatibilité, DÉRIVÉE et comprise dans la fourchette. */
  reps_cible: number | null;
  duree_s: number | null;
  repos_s: number;
  transition_s: number;
  charge_type: TypeCharge | null;
  /** « par jambe », « par côté »… vide sinon. */
  unite: string;
  /* R4 · la cible ACCEPTÉE recopiée au figement : sa charge (nulle au
     poids du corps ou en répétitions seules) et la ligne d'où elle vient.
     Absentes d'une prescription sans cible. */
  charge_cible?: number | null;
  charge_origine?: "aucune" | "acceptee";
  cible_id?: string | null;
};

/** L'orientation se lit dans les objectifs, avec les mêmes mots qu'avant R2. */
export function orientationDe(objectifs: string[]): Orientation {
  const g = objectifs.join(" ").toLowerCase();
  if (g.includes("force")) return "force";
  if (g.includes("masse")) return "masse";
  return "general";
}

/** Fourchettes de départ (décision 47), par orientation et statut. */
export function fourchette(o: Orientation, statut: StatutExercice): { series: number; min: number; max: number } {
  if (o === "force") return statut === "repere" ? { series: 5, min: 4, max: 6 } : { series: 3, min: 8, max: 12 };
  if (o === "masse") return statut === "repere" ? { series: 4, min: 6, max: 12 } : { series: 3, min: 10, max: 20 };
  return { series: 3, min: 8, max: 15 };
}

/** La cible unique de compatibilité : le milieu de la fourchette, arrondi. */
export function cibleCompat(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

/* ── R9c · LES ZONES : une séance composée autour de ce qu'on veut travailler ──

   ⚠️ UNE SÉANCE DE ZONES SE LIT DANS SON NOM, ET RIEN QUE DANS SON NOM.
   « Dos & fessiers » = trois exercices du dos, puis deux des fessiers ;
   « Fessiers & dos », l'inverse. C'est ce qui garde la composition pure :
   un modèle absent se recompose à l'identique depuis le nom de l'étape,
   sur tous les appareils (même règle que les étapes historiques).
   Les exercices viennent de la banque DU LIEU, classés par fonction : une
   zone n'invente aucun exercice, donc rien d'impraticable n'y entre.
   Les noms historiques (Push, Haut du corps…) ne changent pas d'un
   exercice : leurs modèles écrits restent valides, d'où la même
   `COMPOSITION_VERSION`. */

export const ZONES = ["dos", "fessiers", "jambes", "pectoraux", "epaules", "bras", "abdos"] as const;
export type Zone = (typeof ZONES)[number];

export const LIBELLE_ZONE: Readonly<Record<Zone, string>> = {
  dos: "Dos", fessiers: "Fessiers", jambes: "Jambes", pectoraux: "Pectoraux",
  epaules: "Épaules", bras: "Bras", abdos: "Abdos",
};

/** Les fonctions de chaque zone, dans l'ordre où on les sert. */
export const FONCTIONS_DE_ZONE: Readonly<Record<Zone, readonly Fonction[]>> = {
  dos: ["tirage_vertical", "tirage_horizontal", "arriere_epaule", "extension_tronc"],
  fessiers: ["extension_hanche", "charniere_hanche", "unilateral_jambe", "abduction_hanche"],
  jambes: ["squat", "unilateral_jambe", "flexion_genou", "extension_genou", "mollets", "isometrie_jambes"],
  pectoraux: ["poussee_horizontale", "ecarte_pectoraux"],
  epaules: ["poussee_verticale", "epaule_isolation", "arriere_epaule"],
  bras: ["biceps", "triceps"],
  abdos: ["gainage", "flexion_tronc", "extension_tronc"],
};

/** Combien d'exercices la zone principale prend dans une séance de deux zones. */
export const EXERCICES_ZONE_PRINCIPALE = 3;

const sansAccents = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Le nom d'une séance de deux zones : « Dos & fessiers ». */
export function nomDeZones(principale: Zone, seconde: Zone): string {
  return `${LIBELLE_ZONE[principale]} & ${LIBELLE_ZONE[seconde].toLowerCase()}`;
}

/** Les deux zones d'un nom de séance, ou `null` si ce n'en est pas un. */
export function zonesDuNom(nom: string): [Zone, Zone] | null {
  const parties = nom.split(" & ");
  if (parties.length !== 2) return null;
  const z = parties.map((x) => ZONES.find((zone) => sansAccents(LIBELLE_ZONE[zone]) === sansAccents(x)));
  if (!z[0] || !z[1] || z[0] === z[1]) return null;
  return [z[0], z[1]];
}

/** Les exercices d'une zone praticables à un lieu, alternés par fonction. */
export function entreesDeZone(zone: Zone, lieu: Lieu): EntreeBanque[] {
  const vus = new Set<string>();
  const parFonction = FONCTIONS_DE_ZONE[zone].map((f) => {
    const liste: EntreeBanque[] = [];
    for (const etape of Object.values(BANQUE[lieu])) for (const e of etape) {
      if (PROPRIETES[e.nom]?.fonction !== f || vus.has(e.nom) || PROPRIETES[e.nom]?.fonction === "cardio") continue;
      vus.add(e.nom);
      liste.push(e);
    }
    return liste;
  });
  const sortie: EntreeBanque[] = [];
  for (let i = 0; parFonction.some((l) => i < l.length); i++) {
    for (const l of parFonction) if (l[i]) sortie.push(l[i]);
  }
  return sortie;
}

/** La liste d'une séance de deux zones : 3 + 2, sans doublon, complétée
 *  par le Full Body du lieu si la banque manque d'exercices (manque de
 *  contenu signalé, jamais un exercice inventé). Le premier exercice de
 *  chaque zone est le repère de la séance. */
export function entreesDeZones(principale: Zone, seconde: Zone, lieu: Lieu): EntreeBanque[] {
  const pris = new Set<string>();
  const sortie: EntreeBanque[] = [];
  const prendre = (liste: readonly EntreeBanque[], n: number, repere: boolean) => {
    let premier = true;
    for (const e of liste) {
      if (sortie.length >= EXERCICES_PAR_ETAPE || n <= 0) return;
      if (pris.has(e.nom)) continue;
      pris.add(e.nom);
      sortie.push({ ...e, statut: repere && premier && e.dureeS === undefined ? "repere" : "complementaire" });
      premier = false;
      n--;
    }
  };
  prendre(entreesDeZone(principale, lieu), EXERCICES_ZONE_PRINCIPALE, true);
  prendre(entreesDeZone(seconde, lieu), EXERCICES_PAR_ETAPE - sortie.length, true);
  prendre(entreesDeZone(principale, lieu), EXERCICES_PAR_ETAPE - sortie.length, false);
  prendre(BANQUE[lieu][ETAPE_DE_REPLI], EXERCICES_PAR_ETAPE - sortie.length, false);
  return sortie;
}

/** La liste d'une étape à un lieu : la banque, puis les zones (R9c),
 *  puis le repli historique. */
export function entreesDe(nomEtape: string, lieu: Lieu): readonly EntreeBanque[] {
  const historique = BANQUE[lieu][nomEtape];
  if (historique) return historique;
  const zones = zonesDuNom(nomEtape);
  if (zones) return entreesDeZones(zones[0], zones[1], lieu);
  return BANQUE[lieu][ETAPE_DE_REPLI];
}

/** Prescrit UNE entrée de la banque. Pure. Lève si la banque est
 *  incohérente (le banc l'empêche avant). */
export function prescrire(e: EntreeBanque, emplacement: number, ctx: ContexteComposition): LignePrescription {
  const lib = trouverExercice(e.nom);
  const prop = PROPRIETES[e.nom];
  const cle = cleExercice(e.nom);
  if (!lib || !prop || !cle) throw new Error(`[banqueEtapes] exercice incomplet : ${e.nom}`);
  const duree = e.dureeS !== undefined || lib.mode === "temps";
  const transition = duree ? 60 : 90;
  if (duree) {
    return {
      emplacement, exercice_cle: cle, exercice_nom: lib.name, fonction: prop.fonction, statut: e.statut,
      series: e.series ?? lib.sets, mesure: "duree",
      reps_min: null, reps_max: null, reps_cible: null,
      duree_s: e.dureeS ?? lib.seconds, repos_s: lib.rest, transition_s: transition,
      charge_type: prop.charge, unite: "",
    };
  }
  const f = e.reps !== undefined
    ? { series: e.series ?? lib.sets, min: e.reps, max: e.reps }
    : fourchette(ctx.orientation, e.statut);
  const repos = ctx.orientation === "force" && e.statut === "repere" ? Math.max(lib.rest, 150) : lib.rest;
  return {
    emplacement, exercice_cle: cle, exercice_nom: lib.name, fonction: prop.fonction, statut: e.statut,
    series: f.series, mesure: "reps",
    reps_min: f.min, reps_max: f.max, reps_cible: cibleCompat(f.min, f.max),
    duree_s: null, repos_s: repos, transition_s: transition,
    charge_type: prop.charge, unite: lib.unite ?? "",
  };
}

/**
 * Le MODÈLE d'une étape : les premières entrées de sa liste, prescrites,
 * dans l'ordre de la banque. Pure et déterministe.
 */
export function composerEtape(nomEtape: string, ctx: ContexteComposition): LignePrescription[] {
  return entreesDe(nomEtape, ctx.lieu).slice(0, EXERCICES_PAR_ETAPE).map((e, i) => prescrire(e, i, ctx));
}

/* ── La projection de compatibilité ─────────────────────────────────── */

/** Ce que la projection ajoute à un exercice : la prescription d'origine,
 *  que le journal recopie. Le tunnel l'ignore. */
export type ExercicePrescrit = Exercise & {
  prescription?: {
    cle: string;
    fonction: Fonction;
    statut: StatutExercice;
    reps_min: number | null;
    reps_max: number | null;
    charge_type: TypeCharge | null;
    /* R4 · présents seulement quand une cible acceptée a été recopiée. */
    charge_cible?: number | null;
    cible_id?: string;
  };
};

/** « 45s », « 2 min », « 20 min » : l'écriture que le tunnel sait lire. */
export function libelleDuree(s: number): string {
  return s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s}s`;
}

/**
 * `exercise_list`, PROJETÉE depuis la prescription, jamais écrite à part.
 * ⚠️ La même projection existe en SQL (`projeter_prescription`, migration
 * R2), qui l'écrit avec les lignes dans la même transaction. Le banc
 * vérifie que les deux portent les mêmes champs.
 */
export function projeterPrescription(lignes: LignePrescription[]): ExercicePrescrit[] {
  return [...lignes].sort((a, b) => a.emplacement - b.emplacement).map((l) => {
    const duree = l.mesure === "duree";
    const reps = duree
      ? libelleDuree(l.duree_s ?? 0)
      : `${l.reps_cible ?? l.reps_min ?? ""}${l.unite ? ` ${l.unite}` : ""}`;
    return {
      name: l.exercice_nom,
      sets: l.series,
      reps,
      rest: l.repos_s,
      restAfter: l.transition_s,
      ...(duree ? { auto: l.duree_s ?? undefined } : {}),
      tip: "",
      benefit: "",
      muscles: [],
      prescription: {
        cle: l.exercice_cle,
        fonction: l.fonction,
        statut: l.statut,
        reps_min: l.reps_min,
        reps_max: l.reps_max,
        charge_type: l.charge_type,
        /* R4 · seulement s'il y a une cible : une prescription sans cible
           garde exactement la projection d'avant. */
        ...(l.cible_id ? { charge_cible: l.charge_cible ?? null, cible_id: l.cible_id } : {}),
      },
    };
  });
}

/** Les exercices de la banque qui ne sont pas praticables à ce lieu. Vide = cohérent. */
export function horsDuLieu(lieu: Lieu): string[] {
  const ok = new Set(exercicesDisponibles(lieu).map((e) => e.name));
  const fautes = new Set<string>();
  for (const liste of Object.values(BANQUE[lieu])) for (const e of liste) if (!ok.has(e.nom)) fautes.add(e.nom);
  return [...fautes];
}
