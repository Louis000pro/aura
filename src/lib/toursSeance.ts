/* ════════════════════════════════════════════════════════════════════
   Les tours d'une séance : circuits, supersets, échelles, EMOM (lot 2 de
   la banque de séances, 2026-10-27).

   Le lecteur jouait toutes les séries d'un exercice avant le suivant. Les
   exercices CONSÉCUTIFS qui portent le même `bloc` se jouent désormais en
   tours : une série de chacun, dans l'ordre, puis on recommence. Les
   données ne changent pas de forme : la série s d'un exercice d'un bloc
   EST son tour s, donc le journal, la reprise et les marques gardent
   leurs clés [exercice][série].

   Ce fichier est PUR (ni horloge, ni base, ni écran) : il dit dans quel
   ordre on joue, où on va après une série, combien on attend, et comment
   ça se lit. Le lecteur ne fait qu'appliquer.

   ⚠️ UN EXERCICE JOUÉ SEUL GARDE EXACTEMENT LES RÈGLES D'AVANT :
   « Passer l'exercice » le quitte, une série passée reste ouverte quand
   on y revient d'avant, la série suivante vient après la précédente. Les
   bancs comparent les deux sur des séances sans bloc.

   ⚠️ LES REPOS D'UN BLOC GARDENT LEUR SENS. `rest` est l'attente après
   l'exercice : vers l'exercice suivant du tour, et pour le dernier
   exercice du bloc, entre deux tours. `restAfter` est la transition quand
   on QUITTE le bloc. L'estimation de la durée (dureeLibre) les compte
   donc déjà juste, sans rien savoir des tours.

   ⚠️ EMOM : une série dispose de `emom` secondes, et ce qui en reste est
   le repos. Une série qui dépasse sa minute enchaîne tout de suite.
   ════════════════════════════════════════════════════════════════════ */

/** Le nom d'un bloc à l'écran. */
export type FormatBloc = "circuit" | "superset" | "echelle" | "pyramide" | "descente" | "intervalles" | "tabata";

/** Ce que l'ordre de jeu lit d'un exercice. */
export type ExoTour = {
  name?: string;
  sets: number;
  reps?: string;
  rest?: number;
  restAfter?: number;
  auto?: number;
  hiit?: boolean;
  bloc?: string;
  format?: FormatBloc;
  repsParSerie?: string[];
  emom?: number;
};

/** Une série à jouer : l'exercice e, sa série (son tour) s. */
export type Pas = { e: number; s: number };

/** Ce que l'ordre lit des marques du lecteur : posée ou non, et terminée ou non. */
export type MarquesTours = Record<number, Record<number, { statut: string } | undefined> | undefined>;

/** Un bloc : les exercices [debut, fin), joués en `tours` tours. */
export type Bloc = { debut: number; fin: number; tours: number };

const series = (ex: ExoTour | undefined) => Math.max(1, ex?.sets ?? 1);

/**
 * Le bloc de l'exercice e : les exercices consécutifs qui portent le même
 * `bloc`. Un bloc d'un seul exercice n'en est pas un : il se joue seul.
 */
export function blocDe(exos: readonly ExoTour[], e: number): Bloc | null {
  const id = exos[e]?.bloc;
  if (!id) return null;
  let debut = e;
  while (debut > 0 && exos[debut - 1]?.bloc === id) debut--;
  let fin = e + 1;
  while (fin < exos.length && exos[fin]?.bloc === id) fin++;
  if (fin - debut < 2) return null;
  let tours = 1;
  for (let x = debut; x < fin; x++) tours = Math.max(tours, series(exos[x]));
  return { debut, fin, tours };
}

/** Les blocs d'une séance, dans l'ordre. */
export function blocsDe(exos: readonly ExoTour[]): Bloc[] {
  const out: Bloc[] = [];
  for (let e = 0; e < exos.length; e++) {
    const b = blocDe(exos, e);
    if (b && b.debut === e) { out.push(b); e = b.fin - 1; }
  }
  return out;
}

/**
 * Les séries d'un bloc dans l'ordre du jeu : tour après tour, chaque
 * exercice qui a encore une série à ce tour (un exercice raccourci quitte
 * simplement les derniers tours).
 */
export function pasDuBloc(exos: readonly ExoTour[], b: Bloc): Pas[] {
  const pas: Pas[] = [];
  for (let s = 0; s < b.tours; s++) {
    for (let e = b.debut; e < b.fin; e++) if (s < series(exos[e])) pas.push({ e, s });
  }
  return pas;
}

/** L'ordre complet d'une séance : un exercice seul garde ses séries d'affilée. */
export function ordreDeJeu(exos: readonly ExoTour[]): Pas[] {
  const pas: Pas[] = [];
  for (let e = 0; e < exos.length; e++) {
    const b = blocDe(exos, e);
    if (b) { pas.push(...pasDuBloc(exos, b)); e = b.fin - 1; continue; }
    for (let s = 0; s < series(exos[e]); s++) pas.push({ e, s });
  }
  return pas;
}

const marqueDe = (m: MarquesTours, p: Pas) => m[p.e]?.[p.s];

/**
 * Le premier pas encore sans marque d'un bloc, après `apres` (exclu) ou
 * depuis le début. Dans un bloc, une série PASSÉE est faite : un exercice
 * qu'on a passé ne revient pas au tour suivant.
 */
function prochainDansBloc(exos: readonly ExoTour[], m: MarquesTours, b: Bloc, apres: Pas | null): Pas | null {
  const pas = pasDuBloc(exos, b);
  const i = apres ? pas.findIndex((p) => p.e === apres.e && p.s === apres.s) : -1;
  for (let k = i + 1; k < pas.length; k++) if (!marqueDe(m, pas[k])) return pas[k];
  return null;
}

/** La première série non terminée d'un exercice seul (une série passée reste ouverte), ou -1. */
function premiereOuverte(exos: readonly ExoTour[], m: MarquesTours, e: number): number {
  for (let s = 0; s < series(exos[e]); s++) if (m[e]?.[s]?.statut !== "terminee") return s;
  return -1;
}

/** Le premier pas à faire APRÈS l'exercice e : la règle d'avant, et l'entrée d'un bloc à son premier pas sans marque. */
function entrerApres(exos: readonly ExoTour[], m: MarquesTours, e: number): Pas | null {
  for (let x = e + 1; x < exos.length; x++) {
    const b = blocDe(exos, x);
    if (b) {
      const p = prochainDansBloc(exos, m, b, null);
      if (p) return p;
      x = b.fin - 1;
      continue;
    }
    const s = premiereOuverte(exos, m, x);
    if (s >= 0) return { e: x, s };
  }
  return null;
}

/**
 * Le pas suivant. `"serie"` : la série (e, s) vient de se terminer ;
 * `"exercice"` : on quitte l'exercice e (« Passer l'exercice », ou la fin
 * de sa dernière série). `null` : la séance est finie.
 */
export function pasSuivant(
  exos: readonly ExoTour[], m: MarquesTours, e: number, s: number, mode: "serie" | "exercice",
): Pas | null {
  const b = blocDe(exos, e);
  if (b) return prochainDansBloc(exos, m, b, { e, s }) ?? entrerApres(exos, m, b.fin - 1);
  if (mode === "serie" && s + 1 < series(exos[e])) return { e, s: s + 1 };
  return entrerApres(exos, m, e);
}

/** Ce qu'on retrouve en revenant AVANT l'exercice e (il est seul ou commence un bloc). */
function revenirAvant(exos: readonly ExoTour[], m: MarquesTours, e: number): Pas | null {
  const x = e - 1;
  if (x < 0) return null;
  const b = blocDe(exos, x);
  if (b) {
    const pas = pasDuBloc(exos, b);
    return pas[pas.length - 1] ?? null;
  }
  const s = premiereOuverte(exos, m, x);
  return { e: x, s: s >= 0 ? s : 0 };
}

/**
 * « Exercice précédent ». Un exercice seul : celui d'avant, à sa première
 * série non terminée (ou à sa première s'il est fini, pour le refaire).
 * Dans un bloc : la série d'avant dans l'ordre du jeu.
 */
export function pasPrecedent(exos: readonly ExoTour[], m: MarquesTours, e: number, s: number): Pas | null {
  const b = blocDe(exos, e);
  if (b) {
    const pas = pasDuBloc(exos, b);
    const i = pas.findIndex((p) => p.e === e && p.s === s);
    if (i > 0) return pas[i - 1];
    return revenirAvant(exos, m, b.debut);
  }
  return revenirAvant(exos, m, e);
}

/** Reste-t-il une série APRÈS (e, s) dans l'ordre du jeu ? (« Passer l'exercice ») */
export function resteApres(exos: readonly ExoTour[], e: number, s: number): boolean {
  const b = blocDe(exos, e);
  if (!b) return e < exos.length - 1;
  const pas = pasDuBloc(exos, b);
  const i = pas.findIndex((p) => p.e === e && p.s === s);
  return i < pas.length - 1 || b.fin < exos.length;
}

/**
 * L'attente après la série (e, s), quand la suivante est `prochain`.
 * EMOM : ce qui reste de la minute. Dans un bloc : le `rest` de
 * l'exercice tant qu'on reste dans le bloc, la transition quand on le
 * quitte. Seul : le repos de série, puis la transition (règle d'avant).
 */
export function attenteApresSerie(
  exos: readonly ExoTour[], e: number, s: number, prochain: Pas | null, ecouleS: number,
): number {
  const ex = exos[e];
  if (!ex || !prochain) return 0;
  const transition = (ex.restAfter ?? 0) > 0 ? (ex.restAfter as number) : Math.max(0, ex.rest ?? 0);
  if ((ex.emom ?? 0) > 0) {
    const b = blocDe(exos, e);
    const resteDansLeFormat = b ? prochain.e >= b.debut && prochain.e < b.fin : prochain.e === e;
    return resteDansLeFormat ? Math.max(0, (ex.emom as number) - Math.max(0, ecouleS)) : transition;
  }
  const b = blocDe(exos, e);
  if (b) return prochain.e >= b.debut && prochain.e < b.fin ? Math.max(0, ex.rest ?? 0) : transition;
  return s + 1 >= series(ex) ? transition : Math.max(0, ex.rest ?? 0);
}

/* ── Ce qui se lit ──────────────────────────────────────────────────── */

/** Les répétitions de la série s : la pyramide si elle est écrite, sinon `reps`. */
export function repsDeLaSerie(ex: ExoTour, s: number): string {
  const r = ex.repsParSerie?.[s];
  return typeof r === "string" && r.trim() ? r : String(ex.reps ?? "");
}

/** « 15 reps » → « 15 », « 30 sec » → « 30 s » : la forme courte d'une liste. */
export function repsCourtes(reps: string): string {
  return reps.replace(/\s*\breps?\b/i, "").replace(/\s*\bsec\b/i, " s").trim();
}

/**
 * Ce qu'une liste affiche d'un exercice. Seul : « 3 × 12 », ou la
 * pyramide « 10-15-20-15-10 », et une série unique sa seule dose
 * (« 5 min »). Dans un bloc, les tours sont dits par
 * l'en-tête du bloc : « 15 », « 30 s », ou « 30-20-10 ». Au-delà de sept
 * marches, une ligne ne les tient plus : « 1 à 15 », « 2 à 10 puis 2 ».
 */
export function doseDe(ex: ExoTour, dansUnBloc = false): string {
  const liste = ex.repsParSerie?.filter((r) => typeof r === "string" && r.trim()) ?? [];
  if (liste.length > 0) {
    const nombres = liste.map((r) => repsCourtes(r));
    const queDesNombres = nombres.every((n) => /^\d+$/.test(n));
    if (!queDesNombres) return nombres.join(" · ");
    return nombres.length > 7 ? marchesCourtes(nombres.map(Number)) : nombres.join("-");
  }
  const reps = repsCourtes(String(ex.reps ?? ""));
  return dansUnBloc || series(ex) === 1 ? reps : `${series(ex)} × ${reps}`;
}

/** Une longue suite de marches en une ligne : « 1 à 15 », « 2 à 10 puis 2 ». */
function marchesCourtes(n: number[]): string {
  const premier = n[0], dernier = n[n.length - 1];
  const sommet = Math.max(...n);
  const monte = n.every((x, i) => i === 0 || x > n[i - 1]);
  if (monte) return `${premier} à ${dernier}`;
  const i = n.indexOf(sommet);
  const aller = n.slice(0, i + 1).every((x, k) => k === 0 || x > n[k - 1]);
  const retour = n.slice(i).every((x, k) => k === 0 || x < n[i + k - 1]);
  if (aller && retour) return `${premier} à ${sommet} puis ${dernier}`;
  return n.join("-");
}

const NOMS: Record<FormatBloc, string> = {
  circuit: "Circuit", superset: "Superset", echelle: "Échelle", pyramide: "Pyramide", descente: "Descente",
  intervalles: "Intervalles", tabata: "Tabata",
};

/** Le nom d'un bloc : écrit sur son premier exercice, sinon « Superset » à deux et « Circuit » au-delà. EMOM d'abord. */
export function nomDuBloc(exos: readonly ExoTour[], b: Bloc): string {
  if ((exos[b.debut]?.emom ?? 0) > 0) return "EMOM";
  const f = exos[b.debut]?.format;
  if (f && NOMS[f]) return NOMS[f];
  return b.fin - b.debut === 2 ? "Superset" : "Circuit";
}

/** L'en-tête d'un bloc dans « Au programme » : « Circuit · 4 tours », « EMOM · 12 minutes ». */
export function enTeteDuBloc(exos: readonly ExoTour[], b: Bloc): string {
  const nom = nomDuBloc(exos, b);
  if (nom === "EMOM") {
    const minutes = pasDuBloc(exos, b).length;
    return `EMOM · ${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${nom} · ${b.tours} tour${b.tours > 1 ? "s" : ""}`;
}

/**
 * Où on en est, en mots, pendant l'effort. `titre` en haut à gauche,
 * `position` à droite au-dessus des pastilles des séries.
 */
export function reperesDuPas(exos: readonly ExoTour[], e: number, s: number): { titre: string; position: string } {
  const ex = exos[e];
  const b = blocDe(exos, e);
  if (b) {
    const nom = nomDuBloc(exos, b);
    const position = `Tour ${s + 1} sur ${b.tours}`;
    if (nom === "EMOM") {
      const pas = pasDuBloc(exos, b);
      const k = pas.findIndex((p) => p.e === e && p.s === s) + 1;
      return { titre: `EMOM · minute ${k} sur ${pas.length}`, position };
    }
    return { titre: `${nom} · exercice ${e - b.debut + 1} sur ${b.fin - b.debut}`, position };
  }
  const position = `Série ${s + 1} sur ${series(ex)}`;
  if ((ex?.emom ?? 0) > 0) return { titre: `EMOM · minute ${s + 1} sur ${series(ex)}`, position };
  return { titre: `Exercice ${e + 1} sur ${exos.length}`, position };
}
