/* ════════════════════════════════════════════════════════════════════
   ENTRAÎNEMENT · LOT 3 · LA VUE « PROGRAMME », EN FONCTIONS PURES

   Le programme s'écrit comme une phrase dont chaque mot souligné est un
   réglage, puis la pile des séances dans l'ordre où elles reviennent,
   les règles, et les versions. Ici : ce que la vue AFFICHE, sans base de
   données (les mots de la phrase, l'ordre de la pile, le texte d'un
   changement, la liste des versions). Tenu par `check:programme`.
   ════════════════════════════════════════════════════════════════════ */

import { BANQUE, LIBELLE_ZONE, libelleDuree, type ContexteComposition, type EntreeBanque, type LignePrescription, type Zone } from "@/lib/banqueEtapes";
import type { Ctx } from "@/lib/planning";

/* ── Les mots de la phrase ───────────────────────────────────────────── */

const JOURS_LONGS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** « lundi, mardi, jeudi et samedi » (1 = lundi). */
export function motJours(jours: readonly number[]): string {
  const noms = [...jours].sort((a, b) => a - b).map((j) => JOURS_LONGS[j - 1]).filter(Boolean);
  if (noms.length <= 1) return noms[0] ?? "";
  return noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1];
}

/** « 4 fois », « une fois ». */
export function motFois(n: number): string {
  return n === 1 ? "une fois" : `${n} fois`;
}

/** Les durées qu'on peut viser, et « pas de limite ». */
export const DUREES_VISEES: readonly (number | null)[] = [20, 30, 45, 60, 75, 90, null];

export function motDuree(min: number | null): string {
  return min === null ? "sans limite de temps" : `environ ${min} min`;
}

/** Les trois lieux, comme la phrase les dit, et ce qu'ils écrivent. */
export const LIEUX: readonly { ctx: Ctx; mot: string; patch: { location: "salle" | "maison"; equip: "halteres" | "poids" } }[] = [
  { ctx: "salle", mot: "à la salle", patch: { location: "salle", equip: "halteres" } },
  { ctx: "halteres", mot: "chez moi, avec des haltères", patch: { location: "maison", equip: "halteres" } },
  { ctx: "poids", mot: "chez moi, sans matériel", patch: { location: "maison", equip: "poids" } },
];

export function motLieu(ctx: Ctx): string {
  return LIEUX.find((l) => l.ctx === ctx)?.mot ?? "à la salle";
}

/** « prendre du muscle » : l'objectif dit comme une envie. */
const BUTS: Readonly<Record<string, string>> = {
  "Prise de masse": "prendre du muscle",
  "Perte de poids": "perdre du poids",
  "Santé générale": "être en forme",
  "Force": "gagner en force",
  "Endurance": "gagner en endurance",
  "Souplesse": "gagner en souplesse",
};

export function motBut(goals: readonly string[]): string {
  const premier = goals[0];
  if (!premier) return "être en forme";
  return BUTS[premier] ?? premier.toLocaleLowerCase("fr-FR");
}

/** « sur tout le corps », « surtout le dos et les bras ». */
export function motZone(priorites: readonly Zone[] | null): string {
  if (!priorites || priorites.length === 0) return "sur tout le corps";
  const art = (z: Zone) => (z === "dos" ? "le dos" : `les ${LIBELLE_ZONE[z].toLocaleLowerCase("fr-FR")}`);
  return "surtout " + priorites.map(art).join(" et ");
}

/* ── La pile des séances ─────────────────────────────────────────────── */

/** Le cycle dans l'ordre où il revient, à partir de la prochaine. */
export function pileDuCycle<E extends { id: string; position: number }>(cycle: readonly E[], prochaineId: string | null): E[] {
  const tri = [...cycle].sort((a, b) => a.position - b.position);
  const i = prochaineId ? tri.findIndex((e) => e.id === prochaineId) : -1;
  return i <= 0 ? tri : [...tri.slice(i), ...tri.slice(0, i)];
}

/** « La prochaine », « Ensuite », « Puis ». */
export function etiquettePile(i: number): string {
  return i === 0 ? "La prochaine" : i === 1 ? "Ensuite" : "Puis";
}

/* ── L'éditeur d'une séance ─────────────────────────────────────────── */

/** « 4 × 6 à 8 », « 3 × 45s ». */
export function doseLigne(l: LignePrescription): string {
  if (l.mesure === "duree") return `${l.series} × ${libelleDuree(l.duree_s ?? 0)}`;
  const reps = l.reps_min === l.reps_max ? `${l.reps_min}` : `${l.reps_min} à ${l.reps_max}`;
  return `${l.series} × ${reps}`;
}

/** Tout ce qu'on peut ajouter à ce lieu, sans doublon ni ce qui est déjà là. */
export function ajoutsPossibles(lieu: ContexteComposition["lieu"], presents: readonly string[]): EntreeBanque[] {
  const vus = new Set<string>();
  const sortie: EntreeBanque[] = [];
  for (const liste of Object.values(BANQUE[lieu])) {
    for (const e of liste) {
      if (vus.has(e.nom) || presents.includes(e.nom)) continue;
      vus.add(e.nom);
      sortie.push({ ...e, statut: "complementaire" });
    }
  }
  return sortie;
}

/* ── Ce qui a changé dans une séance ─────────────────────────────────── */

type LigneDiff = Pick<LignePrescription, "exercice_cle" | "exercice_nom" | "series" | "statut">;

const minuscule = (s: string) => s.charAt(0).toLocaleLowerCase("fr-FR") + s.slice(1);

/** Ce qui change, en une phrase courte (« Pull : curl marteau ajouté »).
 *  `null` quand rien ne change. */
export function texteChangementSeance(nom: string, avant: readonly LigneDiff[], apres: readonly LigneDiff[]): string | null {
  const morceaux: string[] = [];
  const clesAvant = new Set(avant.map((l) => l.exercice_cle));
  const clesApres = new Set(apres.map((l) => l.exercice_cle));
  const ajoutes = apres.filter((l) => !clesAvant.has(l.exercice_cle));
  const retires = avant.filter((l) => !clesApres.has(l.exercice_cle));
  /* Un ajout et un retrait au même emplacement se lisent comme un remplacement. */
  if (ajoutes.length === 1 && retires.length === 1) {
    morceaux.push(`${minuscule(retires[0].exercice_nom)} remplacé par ${minuscule(ajoutes[0].exercice_nom)}`);
  } else {
    for (const l of ajoutes) morceaux.push(`${minuscule(l.exercice_nom)} ajouté`);
    for (const l of retires) morceaux.push(`${minuscule(l.exercice_nom)} retiré`);
  }
  for (const l of apres) {
    const a = avant.find((x) => x.exercice_cle === l.exercice_cle);
    if (!a) continue;
    if (l.series !== a.series) {
      morceaux.push(`${minuscule(l.exercice_nom)} en ${l.series} série${l.series > 1 ? "s" : ""}`);
    }
    if (l.statut !== a.statut) morceaux.push(`${minuscule(l.exercice_nom)} ${l.statut === "repere" ? "devient un mouvement principal" : "n’est plus un mouvement principal"}`);
  }
  const ordreAvant = avant.filter((l) => clesApres.has(l.exercice_cle)).map((l) => l.exercice_cle).join("|");
  const ordreApres = apres.filter((l) => clesAvant.has(l.exercice_cle)).map((l) => l.exercice_cle).join("|");
  if (morceaux.length === 0 && ordreAvant !== ordreApres) morceaux.push("ordre des exercices changé");
  if (morceaux.length === 0) return null;
  const texte = morceaux.length > 2 ? `${morceaux.length} changements` : morceaux.join(", ");
  return `${nom} : ${texte}`.slice(0, 200);
}

/* ── Les versions ────────────────────────────────────────────────────── */

export type GenreVersion = "nom" | "jours" | "duree" | "lieu" | "regle" | "seance" | "retour";

export type VersionJournal = {
  id: string;
  programmeId: string | null;
  genre: GenreVersion;
  texte: string;
  auteur: "toi" | "guide";
  avant: unknown;
  apres: unknown;
  creeLe: string;
  annuleeLe: string | null;
};

export type VersionProgramme = {
  id: string;
  nom: string;
  origine: "systeme" | "utilisateur" | "guide";
  creeLe: string;
};

export type LigneVersion = {
  cle: string;
  date: string;
  texte: string;
  auteur: string;
  /** Présent sur la seule version qu'on peut défaire (la dernière). */
  annulable: VersionJournal | null;
  annulee: boolean;
};

const AUTEUR: Record<string, string> = { toi: "toi", utilisateur: "toi", systeme: "Vaiiya" };

/**
 * Le journal et les versions du programme, du plus récent au plus ancien.
 * Seule la dernière ligne peut se défaire, et seulement si c'est un
 * changement du programme actif qu'on sait remettre (pas un retour, pas
 * un programme entier).
 */
export function lignesVersions(
  journal: readonly VersionJournal[],
  programmes: readonly VersionProgramme[],
  actifId: string | null,
  guide: string | null,
): LigneVersion[] {
  const auteurDe = (a: string) => (a === "guide" ? `avec ${guide ?? "ton Guide"}` : AUTEUR[a] ?? "toi");
  const tries = [...programmes].sort((a, b) => a.creeLe.localeCompare(b.creeLe));
  const lignes: (LigneVersion & { tri: string })[] = [
    ...journal.map((v) => ({
      cle: v.id, tri: v.creeLe, date: v.creeLe, texte: v.texte, auteur: auteurDe(v.auteur),
      annulable: null as VersionJournal | null, annulee: !!v.annuleeLe,
    })),
    ...tries.map((p, i) => ({
      cle: `p-${p.id}`, tri: p.creeLe, date: p.creeLe,
      texte: i === 0 ? "Programme créé" : `Nouveau programme : ${p.nom}`,
      auteur: auteurDe(p.origine), annulable: null, annulee: false,
    })),
  ].sort((a, b) => b.tri.localeCompare(a.tri));
  const premier = lignes[0];
  const v = premier ? journal.find((x) => x.id === premier.cle) : undefined;
  if (v && !v.annuleeLe && v.genre !== "retour" && (v.programmeId === null || v.programmeId === actifId)) {
    premier.annulable = v;
  }
  return lignes.map((l) => ({ cle: l.cle, date: l.date, texte: l.texte, auteur: l.auteur, annulable: l.annulable, annulee: l.annulee }));
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 12 oct. » (l'année quand ce n'est pas celle d'aujourd'hui). */
export function dateVersion(iso: string, aujourdhui: string): string {
  const d = new Date(iso);
  const jour = `${d.getDate()} ${MOIS[d.getMonth()]}`;
  return String(d.getFullYear()) === aujourdhui.slice(0, 4) ? jour : `${jour} ${d.getFullYear()}`;
}

/** « 13e semaine », à partir du premier jour du programme. */
export function semaineDuProgramme(depuis: string, aujourdhui: string): number {
  const a = new Date(depuis.slice(0, 10) + "T00:00:00Z").getTime();
  const b = new Date(aujourdhui + "T00:00:00Z").getTime();
  return Math.max(1, Math.floor((b - a) / (7 * 86400000)) + 1);
}
