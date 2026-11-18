/* ════════════════════════════════════════════════════════════════════
   LA MÉMOIRE DE SESSION : CE QU'UN ÉCRAN A DÉJÀ MONTRÉ, IL LE REMONTRE.

   Louis, 2026-10-27 : « quand on change de page, ça manque de fluidité ».
   Mesuré dans le code : chaque onglet repartait de zéro en y revenant.
   L'accueil relisait sa journée (cinq allers-retours à la base, l'un après
   l'autre) et montrait son squelette jusqu'à une seconde et demie ;
   Nutrition reposait « Aujourd'hui » vide le temps d'une requête ; la liste
   des discussions aussi. Rien n'avait changé entre-temps, il fallait
   seulement le relire.

   Ce module garde, EN MÉMOIRE et pour la session seulement, la dernière
   chose qu'un écran a publiée. En y revenant, l'écran part de là au lieu
   d'un écran vide, et ses lectures habituelles partent quand même : ce qui
   a changé arrive par-dessus, exactement comme avant.

   ⚠️ CE N'EST PAS UNE SOURCE DE VÉRITÉ, ET ÇA N'EN DEVIENDRA PAS UNE.
   · ⭐ 2026-11-18 (Louis : « ouvrir l'app doit être quasiment instantané ») :
     les écrans du démarrage (`PERSISTES` : l'accueil, la journée, Nutrition,
     la liste des discussions) sont AUSSI gardés sur l'appareil, sous
     `vaiiya_mem:<clé>`. Rouvrir l'app remontre donc tout de suite ce qu'elle
     montrait, et les lectures partent derrière, exactement comme un retour
     d'onglet. Le reste ne vit qu'en mémoire.
     ⚠️ SI TU CHANGES LA FORME DE CE QU'UN DE CES ÉCRANS GARDE
     (`AccueilMemorise`, `JourneeMemorisee`, le journal de Nutrition, la liste
     des discussions), MONTE `VERSION_MEMOIRE`. Une copie d'une autre version
     est ignorée ; une copie qui ferait quand même planter un écran est
     effacée par l'écran de secours (`secoursErreur.ts`), qui la recopie sous
     le même préfixe. Une copie de plus de 36 h est ignorée, et la
     déconnexion efface tout (`effacerMemoire`).
   · Une clé porte toujours le compte (et le jour quand l'écran en dépend) :
     un autre compte, ou le lendemain, ne voit jamais la mémoire d'un autre.
   · Un écran qui écrit garde sa règle d'avant (relire avant d'agir) : la
     mémoire ne sert qu'à l'affichage.
   · Une écriture faite AILLEURS (fin de séance, le Guide, un repas noté
     depuis la conversation) efface la mémoire concernée par son évènement
     (`oublierMemoire`) : on ne remontre pas un écran qu'on sait périmé, on
     revient alors au chargement d'avant.
   ════════════════════════════════════════════════════════════════════ */

/** Monter quand la forme gardée par un écran de `PERSISTES` change. */
const VERSION_MEMOIRE = 1;
const PREFIXE_STOCKAGE = "vaiiya_mem:";
const AGE_MAX = 36 * 3600 * 1000;
/** Les écrans gardés aussi sur l'appareil : ceux qu'on voit en ouvrant l'app. */
const PERSISTES = ["accueil:", "journee:", "nutrition:", "communaute:convs:"];

const memoire = new Map<string, unknown>();

const estPersiste = (cle: string) => PERSISTES.some((p) => cle.startsWith(p));

/* JSON ne sait ni les ensembles, ni les tables, ni les dates : on les marque. */
function remplacer(this: unknown, _k: string, v: unknown): unknown {
  if (v instanceof Set) return { __vy: "set", v: [...v] };
  if (v instanceof Map) return { __vy: "map", v: [...v] };
  // `toJSON` a déjà transformé une date en texte : on regarde l'original.
  const brut = (this as Record<string, unknown> | null)?.[_k];
  if (brut instanceof Date) return { __vy: "date", v: brut.getTime() };
  return v;
}
function relire(_k: string, v: unknown): unknown {
  if (v && typeof v === "object" && "__vy" in (v as Record<string, unknown>)) {
    const m = v as { __vy: string; v: unknown };
    if (m.__vy === "set") return new Set(m.v as unknown[]);
    if (m.__vy === "map") return new Map(m.v as [unknown, unknown][]);
    if (m.__vy === "date") return new Date(m.v as number);
  }
  return v;
}

function lireStockage(cle: string): unknown {
  try {
    const brut = localStorage.getItem(PREFIXE_STOCKAGE + cle);
    if (!brut) return undefined;
    const e = JSON.parse(brut, relire) as { v: number; t: number; d: unknown };
    if (e?.v !== VERSION_MEMOIRE || typeof e.t !== "number" || Date.now() - e.t > AGE_MAX) {
      localStorage.removeItem(PREFIXE_STOCKAGE + cle);
      return undefined;
    }
    return e.d;
  } catch {
    return undefined;
  }
}

const enAttente = new Map<string, unknown>();
let ecritureProgrammee = false;
function ecrireStockage(cle: string, valeur: unknown): void {
  if (typeof window === "undefined") return;
  enAttente.set(cle, valeur);
  if (ecritureProgrammee) return;
  ecritureProgrammee = true;
  /* L'écriture attend un moment calme : sérialiser une semaine entière ne
     doit pas coûter une image pendant une animation. */
  const ecrire = () => {
    ecritureProgrammee = false;
    for (const [c, v] of enAttente) {
      try {
        localStorage.setItem(PREFIXE_STOCKAGE + c, JSON.stringify({ v: VERSION_MEMOIRE, t: Date.now(), d: v }, remplacer));
        /* Une seule copie par écran et par compte : la veille part quand le
           jour change (les clés finissent par le jour). */
        const racine = c.replace(/:\d{4}-\d{2}-\d{2}$/, ":");
        if (racine !== c) {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k !== PREFIXE_STOCKAGE + c && k.startsWith(PREFIXE_STOCKAGE + racine)) localStorage.removeItem(k);
          }
        }
      } catch { /* plein ou bloqué : la mémoire reste en mémoire */ }
    }
    enAttente.clear();
  };
  const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(ecrire, { timeout: 1500 });
  else setTimeout(ecrire, 300);
}

/** Ce que l'écran a publié en dernier sous cette clé, ou `undefined`. */
export function lireMemoire<T>(cle: string | null | undefined): T | undefined {
  if (!cle) return undefined;
  if (memoire.has(cle)) return memoire.get(cle) as T;
  if (typeof window === "undefined" || !estPersiste(cle)) return undefined;
  const garde = lireStockage(cle);
  if (garde !== undefined) memoire.set(cle, garde);
  return garde as T | undefined;
}

/** Garde ce que l'écran vient de publier. */
export function ecrireMemoire<T>(cle: string | null | undefined, valeur: T): void {
  if (!cle) return;
  memoire.set(cle, valeur);
  if (estPersiste(cle)) ecrireStockage(cle, valeur);
}

/** Oublie tout ce qui commence par ce préfixe (un écran entier). */
export function oublierMemoire(prefixe: string): void {
  for (const cle of [...memoire.keys()]) {
    if (cle.startsWith(prefixe)) memoire.delete(cle);
  }
  for (const cle of [...enAttente.keys()]) {
    if (cle.startsWith(prefixe)) enAttente.delete(cle);
  }
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIXE_STOCKAGE + prefixe)) localStorage.removeItem(k);
    }
  } catch { /* stockage bloqué */ }
}

/** Oublie tout, en mémoire et sur l'appareil (déconnexion). */
export function effacerMemoire(): void {
  memoire.clear();
  oublierMemoire("");
}

/** Branche l'oubli d'un écran sur les évènements qui le rendent périmé.
 *  Appelée au niveau du module de l'écran : une seule fois par session, et
 *  avant même que l'écran soit monté (c'est justement le cas utile). */
export function oublierSur(prefixe: string, evenements: string[]): void {
  if (typeof window === "undefined") return;
  for (const nom of evenements) window.addEventListener(nom, () => oublierMemoire(prefixe));
}
