/* ═══════════════════════════════════════════════════════════════════════
   check:classiques, le banc des classiques (maquette « Le chrono et le
   score », GO de Louis le 2026-11-01).

     npm run check:classiques

   Les onze classiques et leurs règles (lib/classiques.ts) : ce qu'on y
   compte, le score de chaque essai, ton meilleur, l'écart (jamais un
   recul), l'escalier de tes meilleurs, ce que l'écran dit pendant
   l'effort, les noms en clair, les explications. Puis la migration du
   score, jouée pour de vrai dans une base en mémoire (PGlite), deux fois.

   Il ne remplace pas l'essai sur la vraie base (droits Supabase) : il
   empêche de casser ce qu'il exerce. Les témoins vérifient qu'il sait
   échouer.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  CLASSIQUES, avanceSurMeilleur, bilanDe, bonMoment, chrono, classiqueDe, classiqueParTitre, ecartProgres,
  exercicesDuClassique, feuillePremiereFois, journalDuClassique, meilleurQue, meta, minuteEnCours, minuteRatee,
  morceauNumero, morceauxAuChrono, mouvements, pourBattre, regleComplete, repsApres, repsAuTotal, repsDuTour,
  scoreCourt, scoreLong, scoreMinute, scoreReps, scoreTemps, scoreTenue, scoreTours, surtitre, typo, unite,
  type Classique, type ScoreDate,
} from "@/lib/classiques";
import { lignesDuJournal } from "@/lib/journalSeance";
import { resolveGuide } from "@/lib/exerciseGuides";
import { trouverExercice } from "@/lib/exerciseLibrary";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " · " + detail : ""));
}
const NB = String.fromCharCode(160);
const c = (id: string) => classiqueDe(id) as Classique;

/* ── Les onze, et qui est ouvert ─────────────────────────────────────── */
{
  verdict("onze classiques", CLASSIQUES.length === 11, String(CLASSIQUES.length));
  const ids = CLASSIQUES.map((x) => x.id);
  verdict("un identifiant chacun", new Set(ids).size === ids.length, ids.join(", "));
  const futurs = CLASSIQUES.filter((x) => !x.ouvert).map((x) => x.titre).sort();
  verdict("les quatre futurs Vaiiya+ sont ceux que Louis a choisis (2026-11-01)",
    JSON.stringify(futurs) === JSON.stringify(["500 répétitions", "La Centaine", "Le kilomètre de rameur", "Le max en 20 minutes aux haltères"]),
    futurs.join(", "));
  verdict("deux tiers ouverts pour toujours", CLASSIQUES.filter((x) => x.ouvert).length === 7);
  verdict("les ouverts passent avant les futurs Vaiiya+",
    CLASSIQUES.findIndex((x) => !x.ouvert) === CLASSIQUES.filter((x) => x.ouvert).length);
  const sortes = new Set(CLASSIQUES.map((x) => x.sorte));
  verdict("cinq façons de compter", sortes.size === 5, [...sortes].join(", "));
  verdict("un titre retrouve son classique, accents et apostrophes compris",
    CLASSIQUES.every((x) => classiqueParTitre(x.titre) === x) && classiqueParTitre("l'escalier")?.id === "escalier"
      && classiqueParTitre("le decompte")?.id === "decompte" && classiqueParTitre("Express 12") === null);
}

/* ── Chaque classique est bien écrit ─────────────────────────────────── */
for (const x of CLASSIQUES) {
  const noms = [
    ...morceauxAuChrono(x).map((m) => m.m.exercice), ...(x.tour ?? []).map((m) => m.exercice), ...(x.mouvement ? [x.mouvement] : []),
  ];
  const absents = noms.filter((n) => !trouverExercice(n) || !resolveGuide(n));
  verdict(`${x.titre} · chaque mouvement a sa fiche et son personnage animé`, noms.length > 0 && absents.length === 0, absents.join(", ") || "tous");

  const forme = x.sorte === "temps" ? !!x.etapes?.length && !x.tour && !!x.derniere
    : x.sorte === "tours" ? !!x.tour?.length && !!x.plafond && !x.etapes
    : !!x.mouvement && !x.etapes && !x.tour;
  verdict(`${x.titre} · sa forme suit sa façon de compter`, forme, x.sorte);

  const plafondTitre = x.format === "max" || x.format === "compte";
  verdict(`${x.titre} · un max ou un compte affiche la durée que son titre annonce`,
    !plafondTitre || x.plafond === x.minutes * 60, `${x.minutes} min, plafond ${x.plafond}`);

  verdict(`${x.titre} · trois lignes pour « Comment ça marche »`, x.comment.length === 3);
  verdict(`${x.titre} · huit sections pour la règle complète`, regleComplete(x).length === 8);

  const statiques = exercicesDuClassique(x);
  verdict(`${x.titre} · ses exercices du catalogue existent`, statiques.length > 0 && statiques.every((e) => !!trouverExercice(e.name)),
    statiques.map((e) => e.name).join(", "));
}

/* ── Les noms en clair, et ce qui ne s'écrit pas ────────────────────── */
{
  type Texte = { ou: string; texte: string; explication?: boolean };
  const textes: Texte[] = [];
  for (const x of CLASSIQUES) {
    textes.push({ ou: `${x.id} titre`, texte: x.titre }, { ou: `${x.id} promesse`, texte: x.promesse },
      { ou: `${x.id} surtitre`, texte: surtitre(x) }, { ou: `${x.id} méta`, texte: meta(x) },
      { ou: `${x.id} déroulé`, texte: x.deroule }, { ou: `${x.id} avant`, texte: x.avant }, { ou: `${x.id} but`, texte: x.but });
    x.comment.forEach((l, i) => textes.push({ ou: `${x.id} comment ${i + 1}`, texte: [l.texte, l.gras ?? "", l.note ?? ""].join(" ") }));
    regleComplete(x).forEach((s) => textes.push({ ou: `${x.id} règle « ${s.titre} »`, texte: `${s.titre} ${s.texte}`, explication: true }));
    const f = feuillePremiereFois(x);
    textes.push({ ou: `${x.id} feuille`, texte: [f.question, f.repere ?? "", ...f.points.flatMap((p) => [p.titre, p.texte])].join(" "), explication: true });
    mouvements(x).forEach((m) => textes.push({ ou: `${x.id} mouvement`, texte: `${m.nom} ${m.detail}` }));
  }
  const fautes = (test: (t: Texte) => boolean) => textes.filter(test).map((t) => t.ou);
  const TIRET = String.fromCharCode(0x2014);
  verdict("aucun tiret cadratin", fautes((t) => t.texte.includes(TIRET)).length === 0, fautes((t) => t.texte.includes(TIRET)).join(", "));
  verdict("« AMRAP » n'est jamais un nom à l'écran", fautes((t) => !t.explication && /amrap/i.test(t.texte)).length === 0,
    fautes((t) => !t.explication && /amrap/i.test(t.texte)).join(", "));
  const maxs = CLASSIQUES.filter((x) => x.format === "max");
  verdict("l'explication d'un max dit que c'est un AMRAP (Louis, 2026-11-01)",
    maxs.every((x) => /C'est ce qu'on appelle un AMRAP, pour « as many rounds as possible »/.test(feuillePremiereFois(x).points[0].texte)
      && /AMRAP/.test(regleComplete(x)[0].texte)), maxs.map((x) => x.id).join(", "));
  verdict("pas de « palier », pas de « passage » (on dit « étape », « fait 3 fois »)",
    fautes((t) => /palier|passage/i.test(t.texte)).length === 0, fautes((t) => /palier|passage/i.test(t.texte)).join(", "));
  const promesses = /ventre plat|brûle|brule|graisse|maigri|perdre du poids|minceur|sèche|toxine/i;
  verdict("aucune promesse sur le corps", fautes((t) => promesses.test(t.texte)).length === 0, fautes((t) => promesses.test(t.texte)).join(", "));
  const genre = /\b(prêt|prête|fatigué|fatiguée|motivé|motivée|fier|fière|content|contente|arrivé|arrivée)\b|\(e\)/i;
  verdict("aucun accord de genre pour qui lit", fautes((t) => genre.test(t.texte)).length === 0, fautes((t) => genre.test(t.texte)).join(", "));
  const typoOk = (s: string) => !/ [:;?!]/.test(s) && !/« /.test(s) && !/ »/.test(s) && !s.includes("'");
  verdict("la typographie se pose au rendu (espaces insécables, apostrophes)",
    textes.every((t) => typoOk(typo(t.texte))), fautes((t) => !typoOk(typo(t.texte))).join(", "));
  verdict("le témoin : un texte sans typo() est refusé", !typoOk("Ton temps, c'est ton score : 12:30 ?"));
}

/* ── Les unités et les doses ─────────────────────────────────────────── */
{
  verdict("une unité au singulier et au pluriel", unite("Burpees", 1) === "burpee" && unite("Burpees", 7) === "burpees"
    && unite("Pont fessier", 2) === "ponts fessiers" && unite("Crunch", 15) === "crunchs");
  const inconnues = CLASSIQUES.flatMap((x) => [
    ...morceauxAuChrono(x).map((m) => m.m.exercice), ...(x.tour ?? []).map((m) => m.exercice), ...(x.mouvement ? [x.mouvement] : []),
  ]).filter((n) => unite(n, 1) === unite(n, 2));
  verdict("chaque mouvement a son unité écrite", inconnues.length === 0, [...new Set(inconnues)].join(", "));
  const d = c("decompte");
  verdict("Le Décompte : 110 répétitions, 20 morceaux, 55 burpees et 55 squats",
    repsAuTotal(d) === 110 && morceauxAuChrono(d).length === 20
      && JSON.stringify(mouvements(d).map((m) => m.detail)) === JSON.stringify(["55 en tout", "55 en tout"]));
  const e = c("escalier");
  verdict("L'Escalier : 1 pompe et 10 squats d'abord, 10 pompes et 1 squat à la fin",
    morceauNumero(e, 0)?.nombre === 1 && morceauNumero(e, 1)?.nombre === 10 && morceauNumero(e, 18)?.nombre === 10 && morceauNumero(e, 19)?.nombre === 1);
  const m = c("max-12");
  verdict("Le max en 12 minutes : 30 répétitions par tour, le tour se répète",
    repsDuTour(m) === 30 && morceauNumero(m, 3)?.exercice === "Pompes" && morceauNumero(m, 5)?.exercice === "Crunch");
  verdict("500 répétitions en font bien 500", repsAuTotal(c("cinq-cents")) === 500);
  verdict("La Centaine : 250 répétitions", repsAuTotal(c("la-centaine")) === 250);
}

/* ── Les scores d'un essai ───────────────────────────────────────────── */
{
  const d = c("decompte");
  const passages = Array.from({ length: 20 }, (_, k) => 30 + k * 34.6);
  const s = scoreTemps(d, passages);
  verdict("au chrono, le temps est le dernier « Fait »", !!s && s.valeur === Math.round(passages[19]) && s.passages.length === 20, String(s?.valeur));
  verdict("au chrono, pas de score si tout n'est pas fait", scoreTemps(d, passages.slice(0, 19)) === null);

  const m = c("max-12");
  /* L'exemple de la maquette : 6 tours, les 5 pompes du tour 7, puis 6 squats. */
  const p20 = Array.from({ length: 19 }, (_, k) => 20 + k * 35);
  const t = scoreTours(m, p20, 6);
  verdict("le max : 6 tours + 11, 191 répétitions (l'exemple de la maquette)",
    t.tours === 6 && t.reste === 11 && t.valeur === 191, `${t.tours} + ${t.reste} = ${t.valeur}`);
  const plein = scoreTours(m, Array.from({ length: 20 }, (_, k) => k * 30), 15);
  verdict("le max : un morceau dit fini à la sonnerie boucle le tour", plein.tours === 7 && plein.reste === 0 && plein.valeur === 210,
    `${plein.tours} + ${plein.reste}`);
  verdict("le max : on ne déclare pas plus que le morceau", scoreTours(m, p20, 99).reste === 15, String(scoreTours(m, p20, 99).reste));

  const b = c("cinq-minutes-burpees");
  verdict("le compte : le nombre, corrigé à la sonnerie", scoreReps(b, [1, 2, 3], 64)?.valeur === 64 && scoreReps(b, [], 0) === null);
  verdict("la tenue : à la seconde, et rien sous une seconde", scoreTenue(c("record-chaise"), 125.8)?.valeur === 125 && scoreTenue(c("record-chaise"), 0.5) === null);
  verdict("la minute : la dernière minute finie", scoreMinute(c("une-de-plus"), [10, 70, 135])?.valeur === 3 && scoreMinute(c("une-de-plus"), []) === null);
  verdict("la minute en cours et la minute ratée", minuteEnCours(0) === 1 && minuteEnCours(61) === 2
    && !minuteRatee(119, 1) && minuteRatee(121, 1) && !minuteRatee(121, 2));
}

/* ── Meilleur, écart, escalier ───────────────────────────────────────── */
{
  verdict("au chrono, le plus court gagne", meilleurQue({ sorte: "temps", valeur: 702 }, { valeur: 750 }) && !meilleurQue({ sorte: "temps", valeur: 750 }, { valeur: 702 }));
  verdict("ailleurs, le plus grand gagne", meilleurQue({ sorte: "tours", valeur: 191 }, { valeur: 188 }) && !meilleurQue({ sorte: "tenue", valeur: 60 }, { valeur: 60 }));
  const d = c("decompte");
  const e = ecartProgres(d, { valeur: 750 }, { sorte: "temps", valeur: 702 });
  verdict("l'écart au chrono : « 48 s gagnées »", e?.valeur === `48${NB}s` && e.unite === "gagnées", JSON.stringify(e));
  verdict("un temps moins bon n'a pas d'écart (jamais un recul)", ecartProgres(d, { valeur: 702 }, { sorte: "temps", valeur: 750 }) === null);
  const em = ecartProgres(c("max-12"), { valeur: 188 }, { sorte: "tours", valeur: 191 });
  verdict("l'écart d'un max : « +3 répétitions »", em?.valeur === "+3" && em.unite === "répétitions", JSON.stringify(em));
  const toutes = CLASSIQUES.flatMap((x) => [10, 100, 1000].map((v) => ecartProgres(x, { valeur: v }, { sorte: x.sorte, valeur: v * 1.5 })))
    .concat(CLASSIQUES.flatMap((x) => [10, 100].map((v) => ecartProgres(x, { valeur: v }, { sorte: x.sorte, valeur: v * 0.5 }))));
  verdict("aucun écart ne porte de signe moins", toutes.every((x) => !x || (!x.valeur.includes("-") && !x.valeur.includes("−"))));

  const h: ScoreDate[] = [
    { v: 1, classique: "decompte", sorte: "temps", valeur: 785, passages: [], quand: "2026-09-02T18:00:00Z" },
    { v: 1, classique: "decompte", sorte: "temps", valeur: 810, passages: [], quand: "2026-09-15T18:00:00Z" },
    { v: 1, classique: "decompte", sorte: "temps", valeur: 750, passages: [], quand: "2026-09-30T18:00:00Z" },
    { v: 1, classique: "decompte", sorte: "temps", valeur: 702, passages: [], quand: "2026-10-28T18:00:00Z" },
  ];
  const bl = bilanDe([...h].reverse());
  verdict("l'escalier : seulement les essais qui ont battu tous ceux d'avant",
    JSON.stringify(bl.escalier.map((x) => x.valeur)) === "[785,750,702]" && bl.meilleur?.valeur === 702 && bl.premier?.valeur === 785
      && bl.essais.length === 4, bl.escalier.map((x) => x.valeur).join(" > "));
  verdict("scoreCourt : « 6 + 11 », « 11:42 », « 2:05 », « 64 »",
    scoreCourt({ sorte: "tours", valeur: 191, tours: 6, reste: 11 }) === `6${NB}+${NB}11`
      && scoreCourt({ sorte: "temps", valeur: 702 }) === "11:42" && scoreCourt({ sorte: "tenue", valeur: 125 }) === "2:05"
      && scoreCourt({ sorte: "reps", valeur: 64 }) === "64");
  verdict("scoreLong : « 6 tours + 11 », « 64 burpees », « minute 12 »",
    scoreLong(c("max-12"), { sorte: "tours", valeur: 191, tours: 6, reste: 11 }) === `6${NB}tours${NB}+${NB}11`
      && scoreLong(c("cinq-minutes-burpees"), { sorte: "reps", valeur: 64 }) === `64${NB}burpees`
      && scoreLong(c("une-de-plus"), { sorte: "minute", valeur: 12 }) === `minute${NB}12`);
  verdict("le chrono : « 05:40 », et les heures au-delà", chrono(340) === "05:40" && chrono(3725) === "1:02:05" && chrono(-3) === "00:00");
  const bm = bonMoment(new Date(2026, 9, 28));
  verdict("le bon moment : de trois à cinq semaines après (18 novembre au 2 décembre)",
    bm.du.getDate() === 18 && bm.du.getMonth() === 10 && bm.au.getDate() === 2 && bm.au.getMonth() === 11);
}

/* ── Pendant l'effort : ton meilleur, seulement devant ──────────────── */
{
  const d = c("decompte");
  /* Ton meilleur : un « Fait » toutes les 40 s. Toi : toutes les 35 s. */
  const meilleur = { passages: Array.from({ length: 20 }, (_, k) => 40 * (k + 1)) };
  const t = 35 * 7;
  const avance = avanceSurMeilleur(d, 7, meilleur, t);
  verdict("devant ton meilleur, l'écran compte les répétitions d'avance", avance === repsApres(d, 7) - repsApres(d, 6) && avance > 0, String(avance));
  verdict("derrière, il ne dit rien (0)", avanceSurMeilleur(d, 5, meilleur, 400) === 0);
  verdict("sans meilleur, il ne dit rien", avanceSurMeilleur(d, 7, null, t) === 0);
  const m = c("max-12");
  verdict("la dernière minute : « 4 squats de plus, et tu bats ton meilleur »", pourBattre(m, 185, { valeur: 188 }) === 4);
  verdict("la dernière minute, quand c'est déjà fait : 0", pourBattre(m, 192, { valeur: 188 }) === 0 && pourBattre(m, 100, null) === null);
}

/* ── Ce qui part au journal ─────────────────────────────────────────── */
{
  const d = c("decompte");
  const j = journalDuClassique(d, { passages: Array.from({ length: 20 }, (_, k) => k + 1) });
  const lignes = lignesDuJournal(j.exercices, j.marques);
  verdict("Le Décompte fini : deux exercices, vingt séries faites",
    j.exercices.length === 2 && lignes.length === 20 && lignes.every((l) => l.statut === "terminee"), `${lignes.length} lignes`);
  const jd = journalDuClassique(d, { passages: [1, 2, 3, 4, 5] });
  const moitie = lignesDuJournal(jd.exercices, jd.marques);
  verdict("arrêté avant la fin : ce qui est fait, et le reste « non atteint »",
    moitie.filter((l) => l.statut === "terminee").length === 5 && moitie.filter((l) => l.statut === "non_atteinte").length === 15);
  const m = c("max-12");
  const jm = journalDuClassique(m, { passages: Array.from({ length: 19 }, (_, k) => k), partiel: 6 });
  const lm = lignesDuJournal(jm.exercices, jm.marques);
  verdict("le max : sept tours joués, 19 séries faites, le morceau entamé reste au score",
    jm.exercices.every((e) => e.sets === 7) && lm.filter((l) => l.statut === "terminee").length === 19
      && lm.find((l) => l.emplacement === 1 && l.serie === 7)?.statut === "non_atteinte", `${lm.filter((l) => l.statut === "terminee").length}`);
  verdict("aucune répétition déclarée : les records ne lisent pas un classique", lm.every((l) => l.reps_declarees === null));
  const jt = journalDuClassique(c("record-chaise"), { passages: [], tenue: 125 });
  verdict("la tenue : une série, sa durée", lignesDuJournal(jt.exercices, jt.marques)[0]?.duree_s === 125);
  const jmin = journalDuClassique(c("une-de-plus"), { passages: [10, 70, 135] });
  const lmin = lignesDuJournal(jmin.exercices, jmin.marques);
  verdict("la minute : une série par minute finie, et la minute ratée", lmin.length === 4 && lmin.filter((l) => l.statut === "terminee").length === 3
    && lmin[3].statut === "non_atteinte", `${lmin.length} lignes`);
}

/* ── Les témoins : le banc sait échouer ─────────────────────────────── */
{
  const triche: Classique = { ...c("decompte"), sorte: "tours" };
  verdict("témoin : un Décompte compté en tours n'a plus sa forme", !(triche.sorte === "temps" && !!triche.etapes?.length) && !triche.tour);
  verdict("témoin : un recul ne devient pas un écart", ecartProgres(c("max-12"), { valeur: 200 }, { sorte: "tours", valeur: 190 }) === null);
}

/* ── La migration du score, jouée pour de vrai ──────────────────────── */
{
  const db = new PGlite();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (s: string, p?: unknown[]) => db.query<any>(s, p);
  await db.exec(`
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.workout_sessions (id uuid primary key default gen_random_uuid(), user_id uuid, title text, category text,
  duration_minutes int, calories_burned int, elapsed_seconds int, exercises jsonb, started_at timestamptz, termine_le timestamptz,
  lancement_id uuid, journal_version smallint);
create unique index uniq_workout_lancement on public.workout_sessions (user_id, lancement_id) where lancement_id is not null;
create table public.series_realisees (id bigserial primary key, workout_session_id uuid, user_id uuid, emplacement smallint,
  exercice_cle text, exercice_nom text, exercice_prevu_cle text, serie smallint, statut text, mesure text,
  reps_prescrites smallint, duree_prescrite_s int, reps_declarees smallint, duree_s int, validation text,
  statut_prescrit text, fonction_prescrite text, reps_min_prescrites smallint, reps_max_prescrites smallint,
  charge numeric, charge_unite text, charge_type text, marge text);
`);
  const mig = readFileSync(new URL("../supabase/migrations/20261101_score_classiques.sql", import.meta.url), "utf8");
  await db.exec(mig);
  await db.exec(mig);
  verdict("SQL · la migration est rejouable", true);

  const U = "11111111-1111-1111-1111-111111111111";
  await db.exec(`select set_config('test.uid', '${U}', false)`);
  const lancer = async (score: unknown, lancement = crypto.randomUUID()) => {
    const p = { lancement_id: lancement, proprietaire: U, titre: "Le Décompte", categorie: "cardio", duree_s: 702,
      debut: "2026-10-28T18:00:00Z", fin: "2026-10-28T18:12:00Z", calories: 76, exercices: [], series: [], ...(score === undefined ? {} : { score }) };
    const r = (await q(`select public.enregistrer_seance($1::jsonb) as r`, [JSON.stringify(p)])).rows[0].r;
    const ligne = (await q(`select score from public.workout_sessions where id = $1`, [r.id])).rows[0];
    return { r, score: ligne?.score ?? null };
  };
  const bon = { v: 1, classique: "decompte", sorte: "temps", valeur: 702, passages: [30, 61.5] };
  const a = await lancer(bon);
  verdict("SQL · un score bien formé est gardé avec la séance", a.score?.valeur === 702 && a.score?.classique === "decompte", JSON.stringify(a.score));
  const sans = await lancer(undefined);
  verdict("SQL · une séance sans score n'en a pas", sans.score === null && sans.r.deja === false);
  for (const [nom, mauvais] of [
    ["une façon de compter inconnue", { ...bon, sorte: "vitesse" }],
    ["une valeur qui n'est pas un nombre", { ...bon, valeur: "702" }],
    ["une valeur négative", { ...bon, valeur: -3 }],
    ["un classique sans nom", { ...bon, classique: "" }],
    ["des passages qui ne sont pas une liste", { ...bon, passages: "30,61" }],
    ["trop de passages", { ...bon, passages: Array.from({ length: 1001 }, (_, k) => k) }],
    ["un score qui n'est pas un objet", [702]],
  ] as const) {
    const r = await lancer(mauvais);
    verdict(`SQL · ${nom} : la séance est gardée, sans score`, r.score === null && !!r.r.id, JSON.stringify(r.score));
  }
  const l = crypto.randomUUID();
  await lancer(bon, l);
  const rejeu = await lancer({ ...bon, valeur: 600 }, l);
  verdict("SQL · le même lancement rejoué ne réécrit rien", rejeu.r.deja === true && rejeu.score?.valeur === 702);
  let refuse = false;
  try { await q(`insert into public.workout_sessions (user_id, score) values ($1, '{"classique":"x","sorte":"temps","valeur":"oups"}'::jsonb)`, [U]); }
  catch { refuse = true; }
  verdict("SQL · la base refuse un score mal formé écrit en direct", refuse);
  const idx = (await q(`select count(*)::int as n from pg_indexes where indexname = 'idx_workout_score_classique'`)).rows[0].n;
  verdict("SQL · l'index des scores existe", idx === 1);
}

console.log(echecs === 0 ? "\ncheck:classiques · tout passe" : `\ncheck:classiques · ${echecs} échec(s)`);
process.exit(echecs === 0 ? 0 : 1);
