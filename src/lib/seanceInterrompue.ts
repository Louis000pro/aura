import type { Exercise } from "@/components/WorkoutGuideModal";
import type { CibleSeance } from "@/lib/finSeance";
import type { ProposedSeance } from "@/lib/assistantActions";
import type { Marque } from "@/lib/journalSeance";
import type { Remplacements } from "@/lib/remplacement";
import type { SaisieReps } from "@/lib/transitionsTunnel";
import type { Marge } from "@/lib/progression";

/** Le brouillon du lecteur, pas une séance faite ni une copie du journal. */
export type SeanceAReprendre = {
  sessionId: string;
  title: string;
  duration: number;
  difficulty: string;
  category?: string;
  heroImage?: string;
  exerciseList: Exercise[];
  cible?: CibleSeance;
  aGarder?: ProposedSeance;
  relaisRunId?: string;
};

export type AvancementSeance = {
  phase: "exercising" | "resting";
  exerciseIdx: number;
  setIdx: number;
  doneMap: Record<number, Record<number, boolean | Marque>>;
  remplacements?: Remplacements;
  chargeCourante?: Record<number, number | null>;
  repsSaisie?: SaisieReps | null;
  correction?: { emplacement: number; serie: number; reps: number; charge: number | null } | null;
  margesFin?: Record<number, Marge>;
  questionsPosees?: number[];
  validationEnCours?: { validation: "bouton" | "minuteur_fini" | "minuteur_abrege"; dureeS: number | null } | null;
  elapsed: number;
  restCountdown: number;
  restTotal: number;
  restMode: "set" | "exercise";
  autoCountdown: number;
  prep: number;
  hiitSub: "work" | "rest";
};

export type SeanceInterrompue = {
  version: 1;
  userId: string;
  executionId: string;
  demarreeLe: number;
  actualiseeLe: number;
  seance: SeanceAReprendre;
  avancement: AvancementSeance;
};

export const EVT_REPRISE = "vaiiya:seance-interrompue";
export const DUREE_REPRISE = 7 * 24 * 60 * 60_000;
const MAX_CARACTERES = 250_000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CLE = "vaiiya:seance-interrompue:v1:";
const memoire = new Map<string, string>();
const cache = new Map<string, { brut: string; valeur: SeanceInterrompue | null }>();
const fermees = new Map<string, string>();

const objet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const texte = (v: unknown, max = 300): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const entier = (v: unknown, min = 0, max = 86_400): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const identifiant = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

function exercicesValides(v: unknown): v is Exercise[] {
  return Array.isArray(v) && v.length > 0 && v.length <= 60 && v.every((e) =>
    objet(e) && texte(e.name) && entier(e.sets, 1, 100) && texte(e.reps)
    && entier(e.rest) && (e.restAfter === undefined || entier(e.restAfter))
    && (e.auto === undefined || entier(e.auto, 1))
    && (e.hiit === undefined || typeof e.hiit === "boolean")
    && typeof e.tip === "string" && e.tip.length <= 8_000
    && typeof e.benefit === "string" && e.benefit.length <= 8_000
    && Array.isArray(e.muscles) && e.muscles.length <= 30 && e.muscles.every((m) => texte(m, 150)));
}

function cibleValide(c: unknown): c is CibleSeance | undefined {
  if (c === undefined) return true;
  if (!objet(c)) return false;
  if (c.genre === "intention") return identifiant(c.intentionId);
  return c.genre === "etape" && identifiant(c.programmeId) && identifiant(c.etapeId)
    && texte(c.type) && texte(c.title) && texte(c.difficulty)
    && [null, "salle", "halteres", "poids"].includes(c.location as null)
    && exercicesValides(c.exerciseList)
    && (c.adaptationId == null || identifiant(c.adaptationId))
    && (c.rang == null || entier(c.rang, 1, 2_147_483_647))
    && (c.modeleId == null || identifiant(c.modeleId))
    && (c.prescription == null || (Array.isArray(c.prescription) && c.prescription.length <= 60 && c.prescription.every(l =>
      objet(l) && entier(l.emplacement, 0, 1000) && texte(l.exercice_cle) && texte(l.exercice_nom) && texte(l.fonction)
      && ["repere", "complementaire"].includes(String(l.statut)) && entier(l.series, 1, 100)
      && ["reps", "duree"].includes(String(l.mesure)) && entier(l.repos_s) && entier(l.transition_s))));
}

const chargeValide = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 9999.99);
function effectifValide(v: unknown): boolean {
  return objet(v) && texte(v.cle) && texte(v.nom) && [null, "totale", "par_haltere", "assistance", "poids_du_corps"].includes(v.chargeType as null);
}
function marqueValide(v: unknown): boolean {
  if (v === true) return true; // Brouillon antérieur aux séries déclarées.
  if (!objet(v)) return false;
  if (v.statut === "passee") return true;
  return v.statut === "terminee" && ["bouton", "minuteur_fini", "minuteur_abrege"].includes(String(v.validation))
    && (v.dureeS === null || entier(v.dureeS))
    && (v.reps == null || entier(v.reps, 0, 9999)) && (v.charge === undefined || chargeValide(v.charge))
    && (v.exercice === undefined || effectifValide(v.exercice))
    && (v.marge == null || ["aucune", "1_2", "3_plus", "inconnue"].includes(String(v.marge)));
}
const terminee = (v: boolean | Marque | undefined) => v === true || (typeof v === "object" && v.statut === "terminee");

/** Une lecture locale ne fait confiance ni au JSON, ni à sa version, ni au compte. */
export function decoderReprise(brut: string, userId: string, maintenant = Date.now()): SeanceInterrompue | null {
  if (brut.length > MAX_CARACTERES) return null;
  let b: unknown;
  try { b = JSON.parse(brut); } catch { return null; }
  if (!objet(b) || b.version !== 1 || b.userId !== userId || !identifiant(b.executionId)
    || typeof b.demarreeLe !== "number" || !Number.isFinite(b.demarreeLe) || b.demarreeLe <= 0
    || typeof b.actualiseeLe !== "number" || !Number.isFinite(b.actualiseeLe)
    || b.demarreeLe > b.actualiseeLe
    || b.actualiseeLe > maintenant + 60_000 || maintenant - b.actualiseeLe >= DUREE_REPRISE) return null;
  const s = b.seance;
  const a = b.avancement;
  if (!objet(s) || !texte(s.sessionId) || !texte(s.title) || !entier(s.duration, 0, 1440)
    || !texte(s.difficulty) || !exercicesValides(s.exerciseList) || !cibleValide(s.cible)
    || (s.category !== undefined && !texte(s.category)) || (s.relaisRunId !== undefined && !identifiant(s.relaisRunId))
    || (s.heroImage !== undefined && (typeof s.heroImage !== "string" || !s.heroImage.startsWith("/entrainement/") || s.heroImage.includes("..")))) return null;
  if (s.aGarder !== undefined) {
    const g = s.aGarder;
    if (!objet(g) || !texte(g.id) || !g.id.startsWith("custom-") || !texte(g.title)
      || !texte(g.subtitle) || !["force", "cardio", "mobilite", "fullbody"].includes(String(g.category))
      || !["Débutant", "Intermédiaire", "Avancé"].includes(String(g.difficulty))
      || !entier(g.duration, 0, 1440) || !entier(g.exercisesCount, 1, 60)
      || !Array.isArray(g.muscles) || !g.muscles.every((m) => texte(m, 150))
      || typeof g.accent !== "string" || !/^#[a-f0-9]{6}$/i.test(g.accent) || !texte(g.icon)
      || !Array.isArray(g.exerciseList) || g.exerciseList.length !== s.exerciseList.length) return null;
  }
  if (!objet(a) || !["exercising", "resting"].includes(String(a.phase))
    || !entier(a.exerciseIdx, 0, s.exerciseList.length - 1)
    || !entier(a.setIdx, 0, s.exerciseList[a.exerciseIdx].sets - 1)
    || !entier(a.elapsed) || !entier(a.restCountdown) || !entier(a.restTotal)
    || a.restCountdown > a.restTotal || !["set", "exercise"].includes(String(a.restMode))
    || !entier(a.autoCountdown) || !entier(a.prep, 0, 3) || !["work", "rest"].includes(String(a.hiitSub))
    || !objet(a.doneMap)) return null;
  for (const [exercise, series] of Object.entries(a.doneMap)) {
    if (!/^\d+$/.test(exercise) || !entier(Number(exercise), 0, s.exerciseList.length - 1) || !objet(series)) return null;
    for (const [serie, fait] of Object.entries(series)) {
      if (!/^\d+$/.test(serie) || !entier(Number(serie), 0, s.exerciseList[Number(exercise)].sets - 1) || !marqueValide(fait)) return null;
    }
  }
  const courant = s.exerciseList[a.exerciseIdx];
  const minuterie = courant.hiit ? (a.hiitSub === "work" ? 20 : 10) : courant.auto ?? 0;
  const faits = a.doneMap as AvancementSeance["doneMap"];
  const liste = s.exerciseList;
  if (a.autoCountdown > minuterie || (a.phase === "resting" && !terminee(faits[a.exerciseIdx]?.[a.setIdx]))) return null;
  if (a.remplacements !== undefined) {
    if (!objet(a.remplacements) || Object.entries(a.remplacements).some(([k, v]) => !entier(Number(k), 0, liste.length - 1) || !effectifValide(v))) return null;
  }
  if (a.chargeCourante !== undefined && (!objet(a.chargeCourante) || Object.entries(a.chargeCourante).some(([k, v]) => !entier(Number(k), 0, liste.length - 1) || !chargeValide(v)))) return null;
  for (const saisie of [a.repsSaisie, a.correction]) {
    if (saisie != null && (!objet(saisie) || !entier(saisie.emplacement, 0, s.exerciseList.length - 1)
      || !entier(saisie.serie, 0, liste[saisie.emplacement].sets - 1) || !entier(saisie.reps, 0, 9999)
      || ("charge" in saisie && !chargeValide(saisie.charge)))) return null;
  }
  if (a.margesFin !== undefined && (!objet(a.margesFin) || Object.entries(a.margesFin).some(([k, v]) => !entier(Number(k), 0, liste.length - 1) || !["aucune", "1_2", "3_plus", "inconnue"].includes(String(v))))) return null;
  if (a.questionsPosees !== undefined && (!Array.isArray(a.questionsPosees) || a.questionsPosees.some(v => !entier(v, 0, liste.length - 1)))) return null;
  if (a.validationEnCours != null && (!objet(a.validationEnCours) || !["bouton", "minuteur_fini", "minuteur_abrege"].includes(String(a.validationEnCours.validation))
    || (a.validationEnCours.dureeS !== null && !entier(a.validationEnCours.dureeS)))) return null;
  return b as SeanceInterrompue;
}

function brutDuCompte(userId: string): string | null {
  if (typeof window === "undefined") return null;
  if (memoire.has(userId)) return memoire.get(userId)!;
  try { return window.localStorage.getItem(CLE + userId); }
  catch { return memoire.get(userId) ?? null; }
}

export function lireReprise(userId: string | null): SeanceInterrompue | null {
  if (!userId) return null;
  const brut = brutDuCompte(userId);
  if (!brut) return null;
  const connu = cache.get(userId);
  const disponible = (b: SeanceInterrompue | null) => {
    if (!b || Date.now() - b.actualiseeLe >= DUREE_REPRISE || fermees.get(userId) === b.executionId) return null;
    try { if (window.localStorage.getItem(CLE + "fermee:" + userId) === b.executionId) return null; } catch { /* Repli mémoire. */ }
    // R1 : une finalisation déjà préparée gagne sur un ancien brouillon.
    if (finalisationGardee(userId, b.executionId)) return null;
    return b;
  };
  if (connu?.brut === brut) {
    return disponible(connu.valeur);
  }
  const valeur = decoderReprise(brut, userId);
  cache.set(userId, { brut, valeur });
  return disponible(valeur);
}

export function finalisationGardee(userId: string, executionId: string): boolean {
  try {
    const attentes: unknown = JSON.parse(window.localStorage.getItem(`vaiiya_journal_attente_${userId}`) ?? "[]");
    return Array.isArray(attentes) && attentes.some(e => objet(e) && objet(e.journal) && e.journal.lancement_id === executionId);
  } catch { return false; }
}

export function supprimerRepriseDuCompte(userId: string): void {
  memoire.delete(userId); cache.delete(userId); fermees.delete(userId);
  try { window.localStorage.removeItem(CLE + userId); window.localStorage.removeItem(CLE + "fermee:" + userId); } catch { /* Stockage indisponible. */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_REPRISE));
}

export function observerReprise(userId: string | null, notifier: () => void): () => void {
  if (typeof window === "undefined" || !userId) return () => {};
  const locale = () => notifier();
  const externe = (e: StorageEvent) => {
    if (e.key === CLE + userId || e.key === null) { memoire.delete(userId); notifier(); }
    else if (e.key === CLE + "fermee:" + userId || e.key === `vaiiya_journal_attente_${userId}`) notifier();
  };
  const retour = () => notifier();
  window.addEventListener(EVT_REPRISE, locale);
  window.addEventListener("storage", externe);
  window.addEventListener("pageshow", retour);
  window.addEventListener("focus", retour);
  const t = window.setInterval(notifier, 60_000);
  return () => { window.removeEventListener(EVT_REPRISE, locale); window.removeEventListener("storage", externe); window.removeEventListener("pageshow", retour); window.removeEventListener("focus", retour); window.clearInterval(t); };
}

/** Le lancement propriétaire peut remplacer SON état, jamais celui d'un autre. */
export function sauverReprise(b: SeanceInterrompue): boolean {
  if (typeof window === "undefined") return false;
  if (fermees.get(b.userId) === b.executionId) return false;
  try { if (window.localStorage.getItem(CLE + "fermee:" + b.userId) === b.executionId) return false; } catch { /* Repli mémoire. */ }
  const ancien = lireReprise(b.userId);
  if (ancien && ancien.executionId !== b.executionId) return false;
  const brut = JSON.stringify(b);
  if (!decoderReprise(brut, b.userId, b.actualiseeLe)) return false;
  let persiste = true;
  try { window.localStorage.setItem(CLE + b.userId, brut); memoire.delete(b.userId); }
  catch { memoire.set(b.userId, brut); persiste = false; }
  window.dispatchEvent(new Event(EVT_REPRISE));
  return persiste;
}

/** Une fermeture tardive ne doit pas effacer la séance suivante. */
export function effacerReprise(userId: string, executionId: string): void {
  // Lire le brut : le journal R1 peut déjà masquer ce brouillon.
  const brut = brutDuCompte(userId);
  const courant = brut ? decoderReprise(brut, userId) : null;
  if (!courant || courant.executionId !== executionId) return;
  fermees.set(userId, executionId);
  try {
    // Un effet retardé ne peut pas faire réapparaître une séance fermée.
    window.localStorage.setItem(CLE + "fermee:" + userId, executionId);
    window.localStorage.removeItem(CLE + userId);
  } catch { /* Stockage bloqué : le repli mémoire reste nettoyé. */ }
  memoire.delete(userId);
  cache.delete(userId);
  window.dispatchEvent(new Event(EVT_REPRISE));
}

/** Le temps absent n'est jamais ajouté. Le décompte ne consomme pas l'effort restant. */
export function avancementDeReprise(b: SeanceInterrompue): AvancementSeance {
  const a = b.avancement;
  const e = b.seance.exerciseList[a.exerciseIdx];
  const effort = a.phase === "exercising" && (e.auto || (e.hiit && a.hiitSub === "work"));
  return { ...a, prep: effort && a.autoCountdown > 0 ? 3 : 0 };
}

export function marquesDeReprise(a?: AvancementSeance): Record<number, Record<number, Marque>> {
  return Object.fromEntries(Object.entries(a?.doneMap ?? {}).map(([e, series]) => [e,
    Object.fromEntries(Object.entries(series).filter(([, marque]) => marque !== false).map(([s, marque]) => [s, typeof marque === "boolean" ? { statut: "terminee", validation: "bouton", dureeS: null } : marque])),
  ]));
}

/** Série à reprendre pendant un repos : celle d'après, pas celle déjà cochée. */
export function positionDeReprise(b: SeanceInterrompue): { exerciseIdx: number; setIdx: number } {
  const a = b.avancement;
  if (a.phase !== "resting") return a;
  if (a.restMode === "exercise") {
    // Le tunnel saute les exercices déjà terminés, y compris après un retour en arrière.
    for (let e = a.exerciseIdx + 1; e < b.seance.exerciseList.length; e++) {
      for (let s = 0; s < b.seance.exerciseList[e].sets; s++) {
        if (!terminee(a.doneMap[e]?.[s])) return { exerciseIdx: e, setIdx: s };
      }
    }
    return { exerciseIdx: a.exerciseIdx, setIdx: a.setIdx };
  }
  return { exerciseIdx: a.exerciseIdx, setIdx: Math.min(a.setIdx + 1, b.seance.exerciseList[a.exerciseIdx].sets - 1) };
}

/** Verrou entre onglets sur les navigateurs compatibles ; une API absente ne bloque pas l'entraînement. */
export async function prendreVerrouSeance(userId: string): Promise<(() => void) | null> {
  if (typeof navigator === "undefined" || !navigator.locks) return () => {};
  return new Promise((resolve) => {
    void navigator.locks.request(CLE + userId, { ifAvailable: true }, (lock) => {
      if (!lock) { resolve(null); return; }
      return new Promise<void>((liberer) => resolve(liberer));
    }).catch(() => resolve(() => {}));
  });
}
