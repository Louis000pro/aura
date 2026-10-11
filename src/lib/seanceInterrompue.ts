import type { Exercise } from "@/components/WorkoutGuideModal";
import type { CibleSeance } from "@/lib/finSeance";
import type { ProposedSeance } from "@/lib/assistantActions";

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
};

export type AvancementSeance = {
  phase: "exercising" | "resting";
  exerciseIdx: number;
  setIdx: number;
  doneMap: Record<number, Record<number, boolean>>;
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
    && (c.adaptationId == null || identifiant(c.adaptationId));
}

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
    || (s.category !== undefined && !texte(s.category))
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
      if (!/^\d+$/.test(serie) || !entier(Number(serie), 0, s.exerciseList[Number(exercise)].sets - 1) || fait !== true) return null;
    }
  }
  const courant = s.exerciseList[a.exerciseIdx];
  const minuterie = courant.hiit ? (a.hiitSub === "work" ? 20 : 10) : courant.auto ?? 0;
  const faits = a.doneMap as AvancementSeance["doneMap"];
  if (a.autoCountdown > minuterie || (a.phase === "resting" && faits[a.exerciseIdx]?.[a.setIdx] !== true)
    || (a.phase === "exercising" && faits[a.exerciseIdx]?.[a.setIdx] === true)) return null;
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
    return b;
  };
  if (connu?.brut === brut) {
    return disponible(connu.valeur);
  }
  const valeur = decoderReprise(brut, userId);
  cache.set(userId, { brut, valeur });
  return disponible(valeur);
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
  };
  window.addEventListener(EVT_REPRISE, locale);
  window.addEventListener("storage", externe);
  const t = window.setInterval(notifier, 60_000);
  return () => { window.removeEventListener(EVT_REPRISE, locale); window.removeEventListener("storage", externe); window.clearInterval(t); };
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
  const courant = lireReprise(userId);
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

/** Série à reprendre pendant un repos : celle d'après, pas celle déjà cochée. */
export function positionDeReprise(b: SeanceInterrompue): { exerciseIdx: number; setIdx: number } {
  const a = b.avancement;
  if (a.phase !== "resting") return a;
  if (a.restMode === "exercise") return { exerciseIdx: Math.min(a.exerciseIdx + 1, b.seance.exerciseList.length - 1), setIdx: 0 };
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
