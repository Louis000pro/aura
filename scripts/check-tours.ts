/* ═══════════════════════════════════════════════════════════════════════
   check:tours, le banc des tours d'une séance (lot 2 de la banque).

     npm run check:tours

   Le lecteur jouait toutes les séries d'un exercice avant le suivant. Des
   exercices consécutifs qui portent le même `bloc` se jouent maintenant en
   tours (lib/toursSeance.ts). Ce banc vérifie :
   · qu'une séance SANS bloc se joue exactement comme avant : les règles
     d'avant sont réécrites ici en témoin, et comparées sur tout le
     catalogue avec des séries faites et passées tirées au hasard ;
   · l'ordre d'un bloc, la série suivante et la précédente, les attentes
     (dans le tour, entre deux tours, en sortant du bloc, l'EMOM) ;
   · ce qui se lit (les doses, les en-têtes, « Tour 2 sur 4 ») ;
   · que l'estimation de la durée compte exactement les attentes jouées ;
   · que tout le catalogue écrit ses blocs juste ;
   · que le lecteur, la reprise, le journal et la copie d'une séance
     passent par ces règles.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  attenteApresSerie, blocDe, blocsDe, doseDe, enTeteDuBloc, nomDuBloc, ordreDeJeu,
  pasPrecedent, pasSuivant, repsCourtes, repsDeLaSerie, reperesDuPas, resteApres,
  type ExoTour, type MarquesTours, type Pas,
} from "@/lib/toursSeance";
import { ECHAUFFEMENT_S, HIIT_RECUP_S, estimerSecondes, itemDExercice, type ItemDuree } from "@/lib/dureeLibre";
import { exerciseData } from "@/lib/exercicesCatalogue";
import { workoutSessions } from "@/lib/catalogueSeances";
import { copierExercices } from "@/lib/contenuNomme";
import { positionDeReprise, type SeanceInterrompue } from "@/lib/seanceInterrompue";

const RACINE = process.cwd();
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");
let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " · " + detail : ""));
}
const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const montre = (p: Pas | null) => (p ? `${p.e}.${p.s}` : "fin");
const liste = (xs: string[], vide = "aucune") => (xs.length ? xs.join(", ") : vide);
const NB = String.fromCharCode(0xa0);

/* ── Le témoin : les règles du lecteur d'avant le lot 2 ───────────────── */

const seriesDe = (ex: ExoTour | undefined) => Math.max(1, ex?.sets ?? 1);
function premiereOuverteAvant(exos: readonly ExoTour[], m: MarquesTours, e: number): number {
  for (let s = 0; s < seriesDe(exos[e]); s++) if (m[e]?.[s]?.statut !== "terminee") return s;
  return -1;
}
function suivantAvant(exos: readonly ExoTour[], m: MarquesTours, e: number, s: number, mode: "serie" | "exercice"): Pas | null {
  if (mode === "serie" && s + 1 < seriesDe(exos[e])) return { e, s: s + 1 };
  for (let x = e + 1; x < exos.length; x++) {
    const o = premiereOuverteAvant(exos, m, x);
    if (o >= 0) return { e: x, s: o };
  }
  return null;
}
function precedentAvant(exos: readonly ExoTour[], m: MarquesTours, e: number): Pas | null {
  if (e <= 0) return null;
  const o = premiereOuverteAvant(exos, m, e - 1);
  return { e: e - 1, s: o >= 0 ? o : 0 };
}
function attenteAvant(ex: ExoTour, s: number, prochain: Pas | null): number {
  if (!prochain) return 0;
  const transition = (ex.restAfter ?? 0) > 0 ? (ex.restAfter as number) : Math.max(0, ex.rest ?? 0);
  return s + 1 >= seriesDe(ex) ? transition : Math.max(0, ex.rest ?? 0);
}

/* Un tirage reproductible : le même à chaque lancement. */
let graine = 20261028;
const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
function marquesAuHasard(exos: readonly ExoTour[]): MarquesTours {
  const m: MarquesTours = {};
  exos.forEach((ex, e) => {
    const parSerie: Record<number, { statut: string }> = {};
    for (let s = 0; s < seriesDe(ex); s++) {
      const r = hasard();
      if (r < 0.35) parSerie[s] = { statut: "terminee" };
      else if (r < 0.5) parSerie[s] = { statut: "passee" };
    }
    m[e] = parSerie;
  });
  return m;
}

/* ── Une séance sans bloc se joue comme avant ─────────────────────────── */
{
  const sansBloc = Object.entries(exerciseData).filter(([, exos]) => exos.length > 0 && blocsDe(exos).length === 0);
  const ecarts: string[] = [];
  let essais = 0;
  for (const [id, exos] of sansBloc) {
    for (let k = 0; k < 12; k++) {
      const m = marquesAuHasard(exos);
      const e = Math.floor(hasard() * exos.length);
      const s = Math.floor(hasard() * seriesDe(exos[e]));
      essais++;
      for (const mode of ["serie", "exercice"] as const) {
        const a = pasSuivant(exos, m, e, s, mode), b = suivantAvant(exos, m, e, s, mode);
        if (!egal(a, b)) ecarts.push(`${id} ${mode} ${e}.${s} : ${montre(a)} au lieu de ${montre(b)}`);
      }
      const p = pasPrecedent(exos, m, e, s), q = precedentAvant(exos, m, e);
      if (!egal(p, q)) ecarts.push(`${id} précédent ${e}.${s} : ${montre(p)} au lieu de ${montre(q)}`);
      const prochain = suivantAvant(exos, m, e, s, "serie");
      const w = attenteApresSerie(exos, e, s, prochain, 0), x = attenteAvant(exos[e], s, prochain);
      if ((exos[e].emom ?? 0) === 0 && w !== x) ecarts.push(`${id} attente ${e}.${s} : ${w} au lieu de ${x}`);
      if (resteApres(exos, e, s) !== (e < exos.length - 1)) ecarts.push(`${id} reste après ${e}.${s}`);
    }
  }
  verdict(`une séance sans bloc se joue exactement comme avant (${sansBloc.length} séances, ${essais} positions)`,
    ecarts.length === 0, liste(ecarts.slice(0, 6)));

  const ordres = sansBloc.filter(([, exos]) => {
    const attendu: Pas[] = [];
    exos.forEach((ex, e) => { for (let s = 0; s < seriesDe(ex); s++) attendu.push({ e, s }); });
    return !egal(ordreDeJeu(exos), attendu);
  }).map(([id]) => id);
  verdict("sans bloc, l’ordre de jeu est série après série, exercice après exercice", ordres.length === 0, liste(ordres));
}

/* ── Un circuit, puis un exercice seul ────────────────────────────────── */
const A: ExoTour = { name: "A", sets: 2, reps: "10 reps", rest: 10, bloc: "c" };
const B: ExoTour = { name: "B", sets: 2, reps: "10 reps", rest: 10, bloc: "c" };
const C: ExoTour = { name: "C", sets: 2, reps: "30 sec", rest: 60, restAfter: 90, auto: 30, bloc: "c" };
const D: ExoTour = { name: "D", sets: 2, reps: "8 reps", rest: 45 };
const circuit = [A, B, C, D];
const vide: MarquesTours = {};
{
  verdict("un bloc réunit les exercices consécutifs du même bloc", egal(blocDe(circuit, 1), { debut: 0, fin: 3, tours: 2 }),
    JSON.stringify(blocDe(circuit, 1)));
  verdict("un exercice seul n’est dans aucun bloc", blocDe(circuit, 3) === null);
  verdict("un « bloc » d’un seul exercice se joue seul", blocDe([{ sets: 3, bloc: "x" }, D], 0) === null);
  verdict("l’ordre : un tour entier, puis le suivant, puis l’exercice seul",
    ordreDeJeu(circuit).map(montre).join(" ") === "0.0 1.0 2.0 0.1 1.1 2.1 3.0 3.1", ordreDeJeu(circuit).map(montre).join(" "));
  verdict("après A au tour 1 : B au tour 1", montre(pasSuivant(circuit, vide, 0, 0, "serie")) === "1.0");
  verdict("après le dernier exercice du tour 1 : A au tour 2", montre(pasSuivant(circuit, vide, 2, 0, "serie")) === "0.1");
  verdict("après le dernier tour : l’exercice seul", montre(pasSuivant(circuit, vide, 2, 1, "serie")) === "3.0");
  verdict("un exercice seul garde sa série suivante", montre(pasSuivant(circuit, vide, 3, 0, "serie")) === "3.1");
  verdict("après la dernière série : la séance est finie", pasSuivant(circuit, vide, 3, 1, "serie") === null);
  const passee: MarquesTours = { 0: { 1: { statut: "passee" } } };
  verdict("dans un bloc, un exercice passé ne revient pas au tour suivant",
    montre(pasSuivant(circuit, passee, 2, 0, "serie")) === "1.1", montre(pasSuivant(circuit, passee, 2, 0, "serie")));
  const toutFait: MarquesTours = { 0: { 0: { statut: "terminee" }, 1: { statut: "terminee" } }, 1: { 0: { statut: "terminee" }, 1: { statut: "terminee" } }, 2: { 0: { statut: "terminee" }, 1: { statut: "terminee" } } };
  verdict("passer un exercice d’avant le bloc entre au premier pas encore à faire du bloc",
    montre(pasSuivant([D, ...circuit.slice(0, 3)], { 1: { 0: { statut: "terminee" } } }, 0, 1, "exercice")) === "2.0");
  verdict("un bloc déjà fait se traverse", montre(pasSuivant([D, A, B, C, D], { 1: toutFait[0], 2: toutFait[1], 3: toutFait[2] }, 0, 1, "serie")) === "4.0");

  verdict("précédent dans un bloc : la série d’avant dans l’ordre du jeu", montre(pasPrecedent(circuit, vide, 0, 1)) === "2.0");
  verdict("précédent au premier pas du bloc : rien avant", pasPrecedent(circuit, vide, 0, 0) === null);
  verdict("précédent après un bloc : son dernier pas", montre(pasPrecedent(circuit, vide, 3, 0)) === "2.1");
  verdict("« passer » reste possible tant qu’un pas suit", resteApres(circuit, 2, 1) && resteApres(circuit, 0, 0) && !resteApres(circuit, 3, 1));

  verdict("dans le tour : le repos de l’exercice", attenteApresSerie(circuit, 0, 0, { e: 1, s: 0 }, 0) === 10);
  verdict("entre deux tours : le repos du dernier exercice", attenteApresSerie(circuit, 2, 0, { e: 0, s: 1 }, 0) === 60);
  verdict("en quittant le bloc : la transition", attenteApresSerie(circuit, 2, 1, { e: 3, s: 0 }, 0) === 90);
  verdict("rien après la dernière série", attenteApresSerie(circuit, 3, 1, null, 0) === 0);

  const inegal: ExoTour[] = [{ name: "A", sets: 3, rest: 10, bloc: "i" }, { name: "B", sets: 2, rest: 10, bloc: "i" }];
  verdict("un exercice raccourci quitte les derniers tours", ordreDeJeu(inegal).map(montre).join(" ") === "0.0 1.0 0.1 1.1 0.2");
}

/* ── L'EMOM ───────────────────────────────────────────────────────────── */
{
  const X: ExoTour = { name: "X", sets: 2, reps: "15 reps", rest: 0, emom: 60, bloc: "e" };
  const Y: ExoTour = { name: "Y", sets: 2, reps: "30 sec", rest: 0, auto: 30, emom: 60, bloc: "e" };
  const emom = [X, Y];
  verdict("EMOM : le reste de la minute est le repos", attenteApresSerie(emom, 0, 0, { e: 1, s: 0 }, 25) === 35);
  verdict("EMOM : une série qui dépasse sa minute enchaîne tout de suite", attenteApresSerie(emom, 0, 0, { e: 1, s: 0 }, 70) === 0);
  verdict("EMOM : rien après la dernière minute", attenteApresSerie(emom, 1, 1, null, 20) === 0);
  const Z: ExoTour = { name: "Z", sets: 3, reps: "10 reps", rest: 0, emom: 60, restAfter: 30 };
  const W: ExoTour = { name: "W", sets: 1, reps: "10 reps", rest: 0 };
  verdict("EMOM seul : la série suivante attend la minute", attenteApresSerie([Z, W], 0, 0, { e: 0, s: 1 }, 20) === 40);
  verdict("EMOM seul : en sortant, la transition", attenteApresSerie([Z, W], 0, 2, { e: 1, s: 0 }, 20) === 30);
  verdict("EMOM : le nom du bloc", nomDuBloc(emom, blocDe(emom, 0)!) === "EMOM");
  verdict("EMOM : l’en-tête compte les minutes", enTeteDuBloc(emom, blocDe(emom, 0)!) === "EMOM · 4 minutes", enTeteDuBloc(emom, blocDe(emom, 0)!));
  verdict("EMOM : « minute 4 sur 4 » au dernier pas", reperesDuPas(emom, 1, 1).titre === "EMOM · minute 4 sur 4", reperesDuPas(emom, 1, 1).titre);
  verdict("EMOM seul : « minute 2 sur 3 »", reperesDuPas([Z, W], 0, 1).titre === "EMOM · minute 2 sur 3", reperesDuPas([Z, W], 0, 1).titre);
}

/* ── Ce qui se lit ────────────────────────────────────────────────────── */
{
  const bloc = blocDe(circuit, 0)!;
  verdict("un circuit s’annonce avec ses tours", enTeteDuBloc(circuit, bloc) === "Circuit · 2 tours", enTeteDuBloc(circuit, bloc));
  verdict("deux exercices sans format : un superset", nomDuBloc([A, B], blocDe([A, B], 0)!) === "Superset");
  const formats: [string, string][] = [["echelle", "Échelle"], ["pyramide", "Pyramide"], ["descente", "Descente"], ["intervalles", "Intervalles"], ["tabata", "Tabata"], ["circuit", "Circuit"]];
  const noms = formats.filter(([f, nom]) => {
    const exos = [{ ...A, format: f as ExoTour["format"] }, B];
    return nomDuBloc(exos, blocDe(exos, 0)!) !== nom;
  }).map(([f]) => f);
  verdict("le format écrit sur le premier exercice nomme le bloc", noms.length === 0, liste(noms));
  verdict("pendant un tour : « Circuit · exercice 2 sur 3 » et « Tour 2 sur 2 »",
    egal(reperesDuPas(circuit, 1, 1), { titre: "Circuit · exercice 2 sur 3", position: "Tour 2 sur 2" }), JSON.stringify(reperesDuPas(circuit, 1, 1)));
  verdict("un exercice seul : « Exercice 4 sur 4 » et « Série 1 sur 2 »",
    egal(reperesDuPas(circuit, 3, 0), { titre: "Exercice 4 sur 4", position: "Série 1 sur 2" }), JSON.stringify(reperesDuPas(circuit, 3, 0)));

  verdict("la dose d’un exercice seul : « 2 × 8 », insécables", doseDe(D) === `2${NB}×${NB}8`, JSON.stringify(doseDe(D)));
  verdict("dans un bloc, la dose ne redit pas les tours", doseDe(A, true) === "10" && doseDe(C, true) === "30 s", `${doseDe(A, true)} · ${doseDe(C, true)}`);
  verdict("une série unique se lit sans « 1 × »", doseDe({ sets: 1, reps: "5 min faciles" }) === "5 min faciles", doseDe({ sets: 1, reps: "5 min faciles" }));
  verdict("une forme courte garde ce qui n’est pas un nombre", repsCourtes("8 par côté") === "8 par côté");
  const marches = (n: number[]) => n.map((x) => `${x} reps`);
  verdict("une pyramide courte se lit en entier",
    doseDe({ sets: 7, repsParSerie: marches([10, 15, 20, 25, 20, 15, 10]) }) === "10-15-20-25-20-15-10");
  verdict("un escalier long se lit « 1 à 15 »", doseDe({ sets: 15, repsParSerie: marches([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) }) === "1 à 15");
  verdict("une pyramide longue se lit « 1 à 8 puis 1 »",
    doseDe({ sets: 15, repsParSerie: marches([1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]) }) === "1 à 8 puis 1");
  verdict("une suite sans règle garde ses nombres", doseDe({ sets: 8, repsParSerie: marches([5, 9, 5, 9, 5, 9, 5, 9]) }) === "5-9-5-9-5-9-5-9");
  verdict("des séries qui ne sont pas des nombres se lisent une par une",
    doseDe({ sets: 2, repsParSerie: ["30 sec", "45 sec"] }) === "30 s · 45 s", doseDe({ sets: 2, repsParSerie: ["30 sec", "45 sec"] }));
  verdict("la série d’une pyramide dit ses répétitions, et retombe sur `reps` sans elles",
    repsDeLaSerie({ sets: 3, reps: "x", repsParSerie: ["1 rep", "2 reps"] }, 1) === "2 reps"
    && repsDeLaSerie({ sets: 3, reps: "x", repsParSerie: ["1 rep", "2 reps"] }, 2) === "x");
}

/* ── L'estimation compte ce que le lecteur fait attendre ──────────────── */
const ITEM_VIDE: ItemDuree = { nom: "", statut: "complementaire", series: 1, effortS: 0, cotes: 1, reposS: 0, transitionS: 0 };
const serieDe = (it: ItemDuree) => estimerSecondes([{ ...it, series: 1, transitionS: 0 }]) - estimerSecondes([ITEM_VIDE]);
function jouee(exos: readonly ExoTour[]): number {
  const items = exos.map((e) => itemDExercice({ name: e.name ?? "", sets: e.sets, reps: e.reps, rest: e.rest, restAfter: e.restAfter, auto: e.auto, hiit: e.hiit, repsParSerie: e.repsParSerie, emom: e.emom }));
  const pas = ordreDeJeu(exos);
  /* Une routine douce ne compte pas d'échauffement (lot 3). */
  let total = exos.some((e) => (e as { sansEchauffement?: boolean }).sansEchauffement) ? 0 : ECHAUFFEMENT_S;
  pas.forEach((p, i) => {
    /* Un exercice HIIT joue sa récupération DANS l'effort (20 s, puis 10 s). */
    const effort = serieDe(items[p.e]) + (exos[p.e].hiit ? HIIT_RECUP_S : 0);
    total += effort;
    total += attenteApresSerie(exos, p.e, p.s, pas[i + 1] ?? null, effort);
  });
  return total;
}
{
  verdict("le témoin de l’estimation : l’échauffement seul vaut ECHAUFFEMENT_S", estimerSecondes([ITEM_VIDE]) === ECHAUFFEMENT_S);
  const ecarts = Object.entries(exerciseData).filter(([, exos]) => exos.length > 0).map(([id, exos]) => {
    /* L'estimation ne compte pas la récupération après la dernière série
       d'un exercice HIIT (10 s par exercice) : un écart d'avant le lot 2,
       ajouté ici pour vérifier tout le reste, attentes des blocs comprises. */
    const estime = estimerSecondes(exos.map(itemDExercice)) + HIIT_RECUP_S * exos.filter((e) => e.hiit).length;
    const joue = jouee(exos);
    return Math.abs(estime - joue) > 0.5 ? `${id} : ${Math.round(estime)} s estimées, ${Math.round(joue)} s jouées` : null;
  }).filter((x): x is string => !!x);
  verdict("sur tout le catalogue, l’estimation est la séance jouée (blocs, EMOM et pyramides compris)", ecarts.length === 0, liste(ecarts.slice(0, 6)));
  const dix = estimerSecondes([itemDExercice({ name: "Z", sets: 10, reps: "10 reps", rest: 30, emom: 60 })]);
  verdict("EMOM : dix minutes comptent dix minutes, le repos écrit est ignoré", dix - ECHAUFFEMENT_S === 600, String(dix - ECHAUFFEMENT_S));
  const pyr = estimerSecondes([itemDExercice({ name: "P", sets: 2, reps: "x", rest: 0, repsParSerie: ["2 reps", "4 reps"] })]);
  const droit = estimerSecondes([itemDExercice({ name: "P", sets: 2, reps: "3 reps", rest: 0 })]);
  verdict("une pyramide compte chacune de ses séries", pyr === droit, `${pyr} et ${droit}`);
}

/* ── Le catalogue écrit ses blocs juste ───────────────────────────────── */
{
  const FORMATS = new Set(["circuit", "superset", "echelle", "pyramide", "descente", "intervalles", "tabata"]);
  const coupes: string[] = [], seuls: string[] = [], inegaux: string[] = [], pyramides: string[] = [];
  const formatsFaux: string[] = [], emomFaux: string[] = [], cotes: string[] = [];
  for (const [id, exos] of Object.entries(exerciseData)) {
    const vus = new Map<string, number[]>();
    exos.forEach((ex, e) => { if (ex.bloc) vus.set(ex.bloc, [...(vus.get(ex.bloc) ?? []), e]); });
    for (const [bloc, idx] of vus) {
      if (idx.some((v, k) => k > 0 && v !== idx[k - 1] + 1)) coupes.push(`${id} (${bloc})`);
      if (idx.length < 2) seuls.push(`${id} (${bloc})`);
    }
    for (const b of blocsDe(exos)) {
      const series = exos.slice(b.debut, b.fin).map((ex) => ex.sets);
      if (new Set(series).size > 1) inegaux.push(`${id} (${series.join("/")})`);
      const emoms = exos.slice(b.debut, b.fin).map((ex) => (ex.emom ?? 0) > 0);
      if (emoms.some((x) => x !== emoms[0])) emomFaux.push(`${id} : EMOM mêlé`);
      for (let e = b.debut + 1; e < b.fin; e++) if (exos[e].format) formatsFaux.push(`${id} #${e + 1} : format hors de la tête du bloc`);
      for (let e = b.debut; e < b.fin; e++) {
        if (exos[e].auto && /par\s+c[ôo]t[ée]/i.test(exos[e].reps)) cotes.push(`${id} · ${exos[e].name}`);
      }
    }
    exos.forEach((ex, e) => {
      if (ex.repsParSerie && ex.repsParSerie.length !== ex.sets) pyramides.push(`${id} #${e + 1} (${ex.repsParSerie.length} pour ${ex.sets})`);
      if (ex.format && !FORMATS.has(ex.format)) formatsFaux.push(`${id} #${e + 1} : ${ex.format}`);
      if (ex.format && !blocDe(exos, e)) formatsFaux.push(`${id} #${e + 1} : format sur un exercice seul`);
      if ((ex.emom ?? 0) > 0 && (ex.rest !== 0 || (ex.emom as number) < 30 || (ex.emom as number) > 600)) emomFaux.push(`${id} #${e + 1}`);
    });
  }
  verdict("un bloc tient sur des exercices qui se suivent", coupes.length === 0, liste(coupes));
  verdict("aucun bloc d’un seul exercice", seuls.length === 0, liste(seuls));
  verdict("dans un bloc, chaque exercice a autant de tours", inegaux.length === 0, liste(inegaux));
  verdict("une pyramide écrit une ligne par série", pyramides.length === 0, liste(pyramides));
  verdict("un format connu, posé sur la tête d’un bloc", formatsFaux.length === 0, liste(formatsFaux));
  verdict("un EMOM : sa minute entre 30 et 600 s, aucun repos écrit, tout son bloc en EMOM", emomFaux.length === 0, liste(emomFaux));
  verdict("dans un tour, une tenue par côté s’écrit en deux lignes (le chrono ne compte qu’un côté)", cotes.length === 0, liste(cotes));

  const tours = workoutSessions.filter((s) => (exerciseData[s.id] ?? []).some((ex) => ex.bloc)).length;
  verdict("le catalogue joue des séances en tours", tours >= 20, `${tours} séances`);
}

/* ── Le lecteur, la reprise, le journal et la copie passent par ces règles ── */
{
  const modal = lire("src/components/WorkoutGuideModal.tsx");
  const corps = (nom: string, long = 900) => { const i = modal.indexOf(nom); return i < 0 ? "" : modal.slice(i, i + long); };
  verdict("« Passer l’exercice » demande le pas suivant aux tours", /pasSuivant\(exercises, [\s\S]{0,120}?"exercice"\)/.test(corps("const skipExercise = useCallback")));
  verdict("« Exercice précédent » demande le pas d’avant aux tours", corps("const revenirExercice = useCallback").includes("pasPrecedent("));
  verdict("après une série d’un bloc, le lecteur suit l’ordre du jeu", /if \(blocDe\(exercises, exerciseIdx\)\) \{\s*const p = pasSuivant\(exercises, doneMap as MarquesTours, exerciseIdx, setIdx, "serie"\)/.test(corps("const advance = useCallback")));
  verdict("le repos d’un bloc ou d’un EMOM vient des tours, minute comprise",
    /attenteApresSerie\(exercises, exerciseIdx, setIdx, prochain, elapsedRef\.current - debutPasRef\.current\)/.test(modal));
  verdict("la minute d’un EMOM part au début de chaque série", (modal.match(/debutPasRef\.current = elapsedRef\.current/g) ?? []).length >= 2);
  verdict("une nouvelle séance repart à zéro", /elapsedRef\.current = 0; debutPasRef\.current = 0;/.test(modal));
  verdict("l’effort affiche les répétitions de la série (pyramides)", /const repsTexte = cur \? repsDeLaSerie\(cur, setIdx\)/.test(modal));
  verdict("« Au programme » annonce les blocs et leurs doses", modal.includes("enTeteDuBloc(exercises, bloc)") && modal.includes("doseDe(ex, !!bloc || emomSeul)"));
  verdict("les flèches de navigation suivent l’ordre du jeu",
    modal.includes("precedent={pasPrecedent(exercises, doneMap as MarquesTours, exerciseIdx, setIdx) ? revenirExercice : null}")
    && modal.includes("suivant={resteApres(exercises, exerciseIdx, setIdx) ? passerExercice : null}"));
  verdict("la règle d’ordre ne vit plus dans le lecteur", !/function premiereOuverte|const premiereOuverte/.test(modal));
  verdict("la fin d’un tour a sa phrase du Guide", /prochain\.s > setIdx\) return "seance\.repos\.tour"/.test(modal)
    && lire("src/lib/guides.ts").includes(`"seance.repos.tour": {`));

  const reprise = lire("src/lib/seanceInterrompue.ts");
  verdict("une reprise garde le bloc, le format, la pyramide et l’EMOM",
    ["e.bloc === undefined", "e.format === undefined", "e.repsParSerie === undefined", "e.emom === undefined"].every((x) => reprise.includes(x)));
  const brouillon = (exerciseIdx: number, setIdx: number) => ({
    seance: { exerciseList: circuit },
    avancement: { phase: "resting", exerciseIdx, setIdx, restMode: "set", doneMap: { [exerciseIdx]: { [setIdx]: { statut: "terminee", validation: "bouton", dureeS: null } } } },
  }) as unknown as SeanceInterrompue;
  verdict("reprendre pendant un repos de bloc rouvre le pas suivant du tour", egal(positionDeReprise(brouillon(0, 0)), { exerciseIdx: 1, setIdx: 0 }), JSON.stringify(positionDeReprise(brouillon(0, 0))));
  verdict("reprendre entre deux tours rouvre le tour suivant", egal(positionDeReprise(brouillon(2, 0)), { exerciseIdx: 0, setIdx: 1 }), JSON.stringify(positionDeReprise(brouillon(2, 0))));

  verdict("le journal écrit les répétitions prévues de CHAQUE série", lire("src/lib/journalSeance.ts").includes("repsPrescrites(repsDeLaSerie(ex, s))"));
  const copie = copierExercices([{ name: "Squat", sets: 3, reps: "x", rest: 0, emom: 60, bloc: "b", format: "echelle", repsParSerie: ["1 rep", "2 reps", 3], tip: "", benefit: "", muscles: [] }])[0];
  verdict("une séance posée par le Guide garde ses tours", copie?.bloc === "b" && copie?.format === "echelle" && copie?.emom === 60 && egal(copie?.repsParSerie, ["1 rep", "2 reps"]), JSON.stringify(copie));
  const listes = ["src/app/progression/page.tsx", "src/components/WeeklyProgramme.tsx"].filter((f) => !lire(f).includes("doseDe("));
  verdict("les listes d’exercices disent la dose par la même règle", listes.length === 0, liste(listes));
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
