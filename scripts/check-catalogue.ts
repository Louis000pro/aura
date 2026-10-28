/* ═══════════════════════════════════════════════════════════════════════
   check:catalogue, le banc du catalogue des séances.

     npm run check:catalogue

   Une séance du catalogue s'écrit à TROIS endroits qui ne se voient pas
   entre eux : sa fiche (`workoutSessions`, lib/catalogueSeances.ts), ses
   exercices (`exerciseData`, lib/exercicesCatalogue.ts) et son titre
   (`SESSION_SLUGS`, même fichier, par lequel « Refaire » et le Guide la
   retrouvent). Le typage ne vérifie aucun lien entre les trois, et une
   séance cassée ne casse pas le build : elle s'ouvre sur un lecteur vide,
   ou elle disparaît de l'historique.

   Il vérifie tout le catalogue sur ce qui le tient ensemble, puis les
   séances par zone (vague 7, lot 1 de la banque, 2026-10-27), les
   formats (vague 8, lot 2, 2026-10-28), les routines (vague 9, lot 3,
   2026-10-28) et les haltères à la maison (vague 10, lot 6) sur leurs
   règles d'écriture :
   chaque mouvement animé ET avec sa fiche, la durée affichée égale à
   l'estimation de l'app, la typographie, aucune promesse sur le ventre,
   une base incluse dans chaque zone, une tuile par format, et les
   routines douces sans échauffement compté. L'ordre des
   tours lui-même est vérifié par `npm run check:tours`.
   ═══════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { workoutSessions, type CatalogCollection, type WorkoutSession } from "@/lib/catalogueSeances";
import { exerciseData, resolveSessionId, SESSION_SLUGS } from "@/lib/exercicesCatalogue";
import { WAVE_1_EXERCISES } from "@/lib/workoutWave1";
import { WAVE_2_EXERCISES } from "@/lib/workoutWave2";
import { WAVE_3_EXERCISES } from "@/lib/workoutWave3";
import { WAVE_4_EXERCISES } from "@/lib/workoutWave4";
import { WAVE_5_EXERCISES } from "@/lib/workoutWave5";
import { WAVE_6_EXERCISES } from "@/lib/workoutWave6";
import { WAVE_7_EXERCISES } from "@/lib/workoutWave7";
import { WAVE_8_EXERCISES } from "@/lib/workoutWave8";
import { WAVE_9_EXERCISES } from "@/lib/workoutWave9";
import { WAVE_10_EXERCISES } from "@/lib/workoutWave10";
import { GUIDE_SECTIONS, sectionSessionId } from "@/lib/guideSections";
import { resolveGuide } from "@/lib/exerciseGuides";
import { exercicesDisponibles, trouverExercice } from "@/lib/exerciseLibrary";
import { ECHAUFFEMENT_S, estimerMinutes, estimerSecondes, itemDExercice } from "@/lib/dureeLibre";
import { FAMILY, PHOTO_PAR_TITRE, resolveArt } from "@/lib/workoutArt";

const RACINE = process.cwd();
let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}
const liste = (xs: string[], vide = "aucune") => (xs.length ? xs.join(", ") : vide);

const seances = workoutSessions.filter((s) => s.contentType !== "article");
const parId = new Map(workoutSessions.map((s) => [s.id, s]));

/* ── Tout le catalogue ────────────────────────────────────────────────── */

{
  const vus = new Set<string>();
  const doublons = workoutSessions.map((s) => s.id).filter((id) => (vus.has(id) ? true : (vus.add(id), false)));
  verdict("chaque séance a un identifiant à elle", doublons.length === 0, liste(doublons));

  const sansExos = seances.filter((s) => !(exerciseData[s.id]?.length)).map((s) => s.id);
  verdict("chaque séance a ses exercices dans exerciseData", sansExos.length === 0, liste(sansExos));

  const titresPerdus = seances.filter((s) => resolveSessionId(s.title) !== s.id).map((s) => `${s.title} → ${resolveSessionId(s.title)}`);
  verdict("chaque titre retrouve sa séance (« Refaire », le Guide)", titresPerdus.length === 0, liste(titresPerdus));

  /* L'aperçu peut écrire « World’s » avec l'apostrophe courbe quand la
     séance garde le nom de la bibliothèque, « World's » : même mouvement. */
  const apostrophe = (n: string) => n.replace(/’/g, "'");
  const premium = seances.filter((s) => s.access === "premium");
  const apercus = premium.filter((s) => {
    const p = s.previewExercises ?? [];
    const noms = new Set((exerciseData[s.id] ?? []).map((e) => apostrophe(e.name)));
    return p.length === 0 || p.length > 3 || new Set(p).size !== p.length
      || p.some((n) => !noms.has(apostrophe(n)) || !resolveGuide(n));
  }).map((s) => s.id);
  verdict(
    "l’aperçu d’une séance Vaiiya+ montre au plus trois mouvements distincts, animés, pris dans la séance",
    apercus.length === 0, liste(apercus),
  );
}

/* ── Les séances par zone (vague 7) ───────────────────────────────────── */

const ZONES: CatalogCollection[] = ["abdos", "fessiers", "jambes", "pecs", "dos", "epaules", "bras"];
const ids7 = Object.keys(WAVE_7_EXERCISES);
const vague7 = ids7.map((id) => parId.get(id)).filter((s): s is WorkoutSession => !!s);

{
  verdict("chaque séance de la vague 7 a sa fiche au catalogue", vague7.length === ids7.length,
    liste(ids7.filter((id) => !parId.has(id))));

  const autres = new Set([
    ...Object.keys(WAVE_1_EXERCISES), ...Object.keys(WAVE_2_EXERCISES), ...Object.keys(WAVE_3_EXERCISES),
    ...Object.keys(WAVE_4_EXERCISES), ...Object.keys(WAVE_5_EXERCISES), ...Object.keys(WAVE_6_EXERCISES),
    ...GUIDE_SECTIONS.map(sectionSessionId),
  ]);
  const ecrasees = ids7.filter((id) => autres.has(id));
  verdict("aucune séance de la vague 7 n’écrase les exercices d’une autre", ecrasees.length === 0, liste(ecrasees));

  const pasLesSiens = ids7.filter((id) => exerciseData[id] !== WAVE_7_EXERCISES[id]);
  verdict("exerciseData lit bien les exercices de la vague 7", pasLesSiens.length === 0, liste(pasLesSiens));
}

/* ── Les formats (vague 8) ────────────────────────────────────────────── */

const FORMATS: CatalogCollection[] = ["force", "longues", "circuits", "emom", "intervalles", "isometrie"];
const ids8 = Object.keys(WAVE_8_EXERCISES);
const vague8 = ids8.map((id) => parId.get(id)).filter((s): s is WorkoutSession => !!s);

{
  verdict("chaque séance de la vague 8 a sa fiche au catalogue", vague8.length === ids8.length,
    liste(ids8.filter((id) => !parId.has(id))));

  const autres = new Set([
    ...Object.keys(WAVE_1_EXERCISES), ...Object.keys(WAVE_2_EXERCISES), ...Object.keys(WAVE_3_EXERCISES),
    ...Object.keys(WAVE_4_EXERCISES), ...Object.keys(WAVE_5_EXERCISES), ...Object.keys(WAVE_6_EXERCISES),
    ...Object.keys(WAVE_7_EXERCISES), ...GUIDE_SECTIONS.map(sectionSessionId),
  ]);
  const ecrasees = ids8.filter((id) => autres.has(id));
  verdict("aucune séance de la vague 8 n’écrase les exercices d’une autre", ecrasees.length === 0, liste(ecrasees));

  const pasLesSiens = ids8.filter((id) => exerciseData[id] !== WAVE_8_EXERCISES[id]);
  verdict("exerciseData lit bien les exercices de la vague 8", pasLesSiens.length === 0, liste(pasLesSiens));
}

/* ── Les routines et les petites séances à part (vague 9) ────────────── */

const LOT3: CatalogCollection[] = ["routines", "joursans", "tete", "voyage"];
const ids9 = Object.keys(WAVE_9_EXERCISES);
const vague9 = ids9.map((id) => parId.get(id)).filter((s): s is WorkoutSession => !!s);

{
  verdict("chaque séance de la vague 9 a sa fiche au catalogue", vague9.length === ids9.length,
    liste(ids9.filter((id) => !parId.has(id))));

  const autres = new Set([
    ...Object.keys(WAVE_1_EXERCISES), ...Object.keys(WAVE_2_EXERCISES), ...Object.keys(WAVE_3_EXERCISES),
    ...Object.keys(WAVE_4_EXERCISES), ...Object.keys(WAVE_5_EXERCISES), ...Object.keys(WAVE_6_EXERCISES),
    ...Object.keys(WAVE_7_EXERCISES), ...Object.keys(WAVE_8_EXERCISES), ...GUIDE_SECTIONS.map(sectionSessionId),
  ]);
  const ecrasees = ids9.filter((id) => autres.has(id));
  verdict("aucune séance de la vague 9 n’écrase les exercices d’une autre", ecrasees.length === 0, liste(ecrasees));

  const pasLesSiens = ids9.filter((id) => exerciseData[id] !== WAVE_9_EXERCISES[id]);
  verdict("exerciseData lit bien les exercices de la vague 9", pasLesSiens.length === 0, liste(pasLesSiens));
}

/* Les séances qui se passent d'échauffement sont DÉCIDÉES : une routine
   douce, ou une séance qui commence par le sien. Le drapeau est sur
   chacun de leurs exercices (une copie, une version courte ou une reprise
   peut garder n'importe lequel d'entre eux), et nulle part ailleurs : une
   séance chargée ou intense garde ses cinq minutes. */
{
  const SANS_ECHAUFFEMENT = [
    "apres-trajet", "reveil", "matin-tonique", "trois-minutes-coeur", "pause-bureau",
    "avant-dormir", "pas-la-forme", "respirer", "grand-dimanche", "mauvaise-journee",
  ];
  const marquees = Object.entries(exerciseData).filter(([, exos]) => exos.some((e) => e.sansEchauffement)).map(([id]) => id);
  verdict("les séances sans échauffement sont celles qu’on a décidées",
    marquees.length === SANS_ECHAUFFEMENT.length && SANS_ECHAUFFEMENT.every((id) => marquees.includes(id)), liste(marquees));
  const amoitie = marquees.filter((id) => !exerciseData[id].every((e) => e.sansEchauffement === true));
  verdict("une séance sans échauffement le dit sur chacun de ses exercices", amoitie.length === 0, liste(amoitie));

  const exo = { name: "Squat", sets: 2, reps: "10 reps", rest: 30 };
  const avec = estimerSecondes([itemDExercice(exo)]);
  const sans = estimerSecondes([itemDExercice({ ...exo, sansEchauffement: true })]);
  verdict("le témoin : une séance sans échauffement compte cinq minutes de moins", avec - sans === ECHAUFFEMENT_S,
    `${avec} s puis ${sans} s`);
}

/* ── Les haltères à la maison (vague 10) ─────────────────────────────── */

const ids10 = Object.keys(WAVE_10_EXERCISES);
const vague10 = ids10.map((id) => parId.get(id)).filter((s): s is WorkoutSession => !!s);

{
  verdict("chaque séance de la vague 10 a sa fiche au catalogue", vague10.length === ids10.length,
    liste(ids10.filter((id) => !parId.has(id))));

  const autres = new Set([
    ...Object.keys(WAVE_1_EXERCISES), ...Object.keys(WAVE_2_EXERCISES), ...Object.keys(WAVE_3_EXERCISES),
    ...Object.keys(WAVE_4_EXERCISES), ...Object.keys(WAVE_5_EXERCISES), ...Object.keys(WAVE_6_EXERCISES),
    ...Object.keys(WAVE_7_EXERCISES), ...Object.keys(WAVE_8_EXERCISES), ...Object.keys(WAVE_9_EXERCISES),
    ...GUIDE_SECTIONS.map(sectionSessionId),
  ]);
  const ecrasees = ids10.filter((id) => autres.has(id));
  verdict("aucune séance de la vague 10 n’écrase les exercices d’une autre", ecrasees.length === 0, liste(ecrasees));

  const pasLesSiens = ids10.filter((id) => exerciseData[id] !== WAVE_10_EXERCISES[id]);
  verdict("exerciseData lit bien les exercices de la vague 10", pasLesSiens.length === 0, liste(pasLesSiens));

  /* « Haltères à la maison » ne demande qu'une paire d'haltères et une
     chaise : les gestes que le Guide propose à quelqu'un qui n'a que ça
     (exercicesDisponibles), plus le soulevé de terre roumain, rangé avec
     la barre par la bibliothèque, quand sa consigne dit qu'il se fait
     aux haltères. Les sept séances d'avant qui ont rejoint la collection
     passent par la même règle. */
  const maison = new Set(exercicesDisponibles("halteres").map((e) => e.name));
  const horsMaison = seances.filter((s) => s.collections?.includes("halteres")).flatMap((s) => (exerciseData[s.id] ?? [])
    .filter((e) => !maison.has(e.name) && !(e.name === "Soulevé de terre roumain" && /haltère/.test(e.tip)))
    .map((e) => `${s.id} · ${e.name}`));
  verdict("« Haltères à la maison » ne demande que des haltères et une chaise", horsMaison.length === 0, liste(horsMaison));
}

/* Les deux séances d'avant que la proposition passait en circuit de trois
   tours : leur fiche suit leur nouveau contenu. */
for (const id of ["core", "fullbody-machines"]) {
  const s = parId.get(id);
  const exos = exerciseData[id] ?? [];
  const estime = estimerMinutes(exos.map(itemDExercice));
  verdict(`${s?.title ?? id} · en circuit, sa durée et son nombre de lignes suivent son contenu`,
    !!s && s.duration === estime && s.exercises === exos.length && !!s.collections?.includes("circuits"),
    s ? `${s.duration} min pour ${estime} estimées, ${s.exercises} pour ${exos.length} lignes` : "absente");
}

/** Les minutes qu'un titre annonce (« Réveil en 5 minutes », « Trois
 *  minutes pour le cœur »), sinon null. */
const NOMBRES: Record<string, number> = {
  une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  douze: 12, quinze: 15, vingt: 20, trente: 30, quarante: 40, soixante: 60,
};
function minutesDuTitre(titre: string): number | null {
  const m = titre.toLowerCase().match(/(\d+|\p{L}+)\s+minutes?(?!\p{L})/u);
  if (!m) return null;
  return /^\d+$/.test(m[1]) ? Number(m[1]) : (NOMBRES[m[1]] ?? Number.NaN);
}

for (const s of [...vague7, ...vague8, ...vague9, ...vague10]) {
  const exos = exerciseData[s.id];

  const sansFiche = exos.filter((e) => !resolveGuide(e.name) || !trouverExercice(e.name)).map((e) => e.name);
  verdict(`${s.title} · chaque mouvement est animé et a sa fiche`, sansFiche.length === 0, liste(sansFiche, "tous"));

  verdict(`${s.title} · le nombre d’exercices annoncé`, s.exercises === exos.length, `${s.exercises} annoncés, ${exos.length} écrits`);

  const estime = estimerMinutes(exos.map(itemDExercice));
  verdict(`${s.title} · la durée affichée est l’estimation de l’app`, s.duration === estime, `${s.duration} min affichées, ${estime} estimées`);

  const express = (s.collections ?? []).includes("express");
  verdict(`${s.title} · « Séances express » si et seulement si 15 min ou moins`, express === (s.duration <= 15),
    `${s.duration} min, ${express ? "dans" : "hors de"} express`);

  const tete = s.collections?.[0];
  if (vague10.includes(s)) {
    verdict(`${s.title} · sa première collection est « Haltères à la maison » ou son format`,
      !!tete && (tete === "halteres" || FORMATS.includes(tete))
      && !!s.collections?.some((c) => c === "halteres" || c === "kettlebell"), (s.collections ?? []).join(", "));
  } else if (vague9.includes(s)) {
    verdict(`${s.title} · sa première collection est une collection du lot 3 (ou Full body pour une séance du dehors)`,
      !!tete && (LOT3.includes(tete) || (tete === "fullbody" && !!s.collections?.includes("dehors"))), String(tete));
  } else if (vague7.includes(s)) {
    verdict(`${s.title} · sa zone est sa première collection`, !!tete && ZONES.includes(tete), String(tete));
  } else {
    verdict(`${s.title} · sa première collection est sa zone ou son format, et elle entre dans un format`,
      !!tete && (ZONES.includes(tete) || FORMATS.includes(tete) || ["haut", "fullbody"].includes(tete))
      && FORMATS.some((f) => s.collections?.includes(f)), (s.collections ?? []).join(", "));
  }

  /* Le titre ne promet pas une durée que la carte contredit : la durée
     affichée compte l'échauffement (« Jambes en 10 minutes » est devenue
     « Jambes, l’essentiel » au lot 1 pour cette raison). Depuis le lot 3,
     un titre peut annoncer ses minutes si ce sont celles de la carte
     (« Réveil en 5 minutes », une routine sans échauffement compté). */
  const annonce = minutesDuTitre(s.title);
  verdict(`${s.title} · son titre n’annonce que les minutes de sa carte`, annonce === null || annonce === s.duration,
    annonce === null ? "aucune" : `${annonce} annoncées, ${s.duration} affichées`);

  verdict(`${s.title} · son titre retrouve la séance`, SESSION_SLUGS[s.title] === s.id && resolveSessionId(s.title) === s.id,
    String(resolveSessionId(s.title)));
}

/* ── Ce qui s'écrit dans les séances par zone ─────────────────────────── */

{
  const textes: { ou: string; texte: string }[] = [];
  for (const s of [...vague7, ...vague8, ...vague9, ...vague10]) {
    textes.push({ ou: `${s.id} (titre)`, texte: s.title }, { ou: `${s.id} (sous-titre)`, texte: s.subtitle });
    exerciseData[s.id].forEach((e, i) => {
      textes.push(
        { ou: `${s.id} #${i + 1} (répétitions)`, texte: e.reps },
        { ou: `${s.id} #${i + 1} (consigne)`, texte: e.tip },
        { ou: `${s.id} #${i + 1} (bénéfice)`, texte: e.benefit },
        ...(e.repsParSerie ?? []).map((r, k) => ({ ou: `${s.id} #${i + 1} (série ${k + 1})`, texte: r })),
      );
    });
  }
  const fautes = (test: (t: string) => boolean) => textes.filter(({ texte }) => test(texte)).map(({ ou }) => ou);

  const TIRET_CADRATIN = String.fromCharCode(0x2014);
  verdict("aucun tiret cadratin", fautes((t) => t.includes(TIRET_CADRATIN)).length === 0,
    liste(fautes((t) => t.includes(TIRET_CADRATIN))));
  verdict("aucune apostrophe droite", fautes((t) => t.includes("'")).length === 0, liste(fautes((t) => t.includes("'"))));

  /* Avant « : ; ? ! », une espace insécable, jamais une espace ordinaire
     (le signe passerait seul à la ligne). Le plus simple reste de ne pas
     en écrire : une consigne est une phrase qui dit quoi faire. */
  const espaceAvantSigne = /[ ][:;?!]/;
  verdict("aucune espace ordinaire devant « : ; ? ! »", fautes((t) => espaceAvantSigne.test(t)).length === 0,
    liste(fautes((t) => espaceAvantSigne.test(t))));

  const controle = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
  verdict("aucun caractère de contrôle", fautes((t) => controle.test(t)).length === 0, liste(fautes((t) => controle.test(t))));
  verdict("aucune double espace", fautes((t) => t.includes("  ")).length === 0, liste(fautes((t) => t.includes("  "))));

  /* Une séance d'abdos rend la sangle plus forte ; elle ne fait pas fondre
     le ventre à cet endroit (Vispute 2011). */
  const promesse = /ventre plat|br[ûu]le|graisse|affine|fondre/i;
  verdict("aucune promesse sur le ventre ni sur la graisse", fautes((t) => promesse.test(t)).length === 0,
    liste(fautes((t) => promesse.test(t))));

  /* Aucun accord de genre pour la personne qui lit (« allongé », « prêt »…).
     Le verbe reste permis : « Allonge le bras » ne parle pas de la personne. */
  const accord = /(?<!\p{L})(allongée?s?|assise?s?|prête?s?|installée?s?|motivée?s?|concentrée?s?)(?!\p{L})/iu;
  const consignes = textes.filter(({ ou }) => ou.endsWith("(consigne)") || ou.endsWith("(bénéfice)"));
  const genrees = consignes.filter(({ texte }) => accord.test(texte)).map(({ ou }) => ou);
  verdict("aucun accord de genre pour la personne qui lit", genrees.length === 0, liste(genrees));

  /* Une durée écrite dans les répétitions déclenche le chrono du lecteur :
     elle doit être voulue, donc portée par `auto` ou `hiit`. */
  const chronoCache = [...vague7, ...vague8, ...vague9, ...vague10].flatMap((s) => exerciseData[s.id]
    .filter((e) => /\d+\s*(?:secondes?|sec|s|min)\b/i.test(e.reps) && !e.auto && !e.hiit)
    .map((e) => `${s.id} · ${e.name} (${e.reps})`));
  verdict("une durée dans les répétitions a toujours son chrono déclaré", chronoCache.length === 0, liste(chronoCache));

  /* L'estimation compte deux côtés pour « par jambe », « par bras » ou
     « par main », pas pour « par côté » (lib/dureeLibre.ts). Le lot 3
     écrit donc ce qu'elle lit, et une tenue d'un côté puis de l'autre en
     deux séries qui alternent. */
  const parCote = [...vague9, ...vague10].flatMap((s) => exerciseData[s.id]
    .filter((e) => /par\s+c[ôo]t[ée]/i.test(e.reps)).map((e) => `${s.id} · ${e.name} (${e.reps})`));
  verdict("les lots 3 et 6 n’écrivent pas « par côté » dans les répétitions", parCote.length === 0, liste(parCote));
  const alterne = vague9.flatMap((s) => exerciseData[s.id]
    .filter((e) => e.tip.startsWith("Un côté puis l’autre") && (e.sets % 2 !== 0 || !e.auto))
    .map((e) => `${s.id} · ${e.name}`));
  verdict("une tenue d’un côté puis de l’autre a un nombre pair de séries, au chrono", alterne.length === 0, liste(alterne));
}

/* ── Les zones ────────────────────────────────────────────────────────── */

const page = readFileSync(path.join(RACINE, "src/app/progression/page.tsx"), "utf8");
for (const zone of ZONES) {
  const dedans = seances.filter((s) => s.collections?.includes(zone));
  const incluses = dedans.filter((s) => s.access !== "premium").length;
  verdict(`${zone} · une base incluse et au moins trois séances`, incluses >= 1 && dedans.length >= 3,
    `${incluses} incluse(s) sur ${dedans.length}`);

  /* La grande carte d'une zone née avec la vague 7 est la première séance
     Vaiiya+ du tableau : elle doit être une séance écrite pour cette zone,
     pas une plus ancienne qui l'a rejointe. Abdos et jambes existaient
     avant : leurs premières cartes sont tenues plus bas. */
  if (!["abdos", "jambes"].includes(zone)) {
    const premiere = dedans.find((s) => s.access === "premium");
    verdict(`${zone} · la grande carte Vaiiya+ est une séance de la zone`, !!premiere && premiere.collections?.[0] === zone,
      premiere ? premiere.title : "aucune");
  }

  const tuile = new RegExp(`id: "${zone}", famille: "zone", name: "[^"]+", tag: "[^"]+",\\s*img: "([a-z0-9-]+)"`).exec(page);
  verdict(`${zone} · une tuile dans « Une zone », avec une photo qui existe`,
    !!tuile && existsSync(path.join(RACINE, "public/entrainement", `${tuile[1]}.webp`)), tuile ? tuile[1] : "pas de tuile");
}

/* ── Les formats ──────────────────────────────────────────────────────── */

verdict("« Un format » se range entre « Une zone » et « Un terrain »",
  /\{ id: "zone", label: "Une zone" \},\s*\{ id: "format", label: "Un format" \},\s*\{ id: "terrain"/.test(page), "FAMILLES");
for (const format of FORMATS) {
  const dedans = seances.filter((s) => s.collections?.includes(format));
  verdict(`${format} · au moins trois séances, et toutes jouent ce format`, dedans.length >= 3, `${dedans.length} séances`);

  /* Une collection de format ne se remplit que de collections déclarées :
     une création perso n'y entre pas par un mot de son titre. */
  const tuile = new RegExp(`id: "${format}", famille: "format", name: "[^"]+", tag: "[^"]+",\\s*img: "([a-z0-9-]+)", match: matchCollection\\("${format}", \\(\\) => false\\)`).exec(page);
  verdict(`${format} · une tuile dans « Un format », avec une photo qui existe`,
    !!tuile && existsSync(path.join(RACINE, "public/entrainement", `${tuile[1]}.webp`)), tuile ? tuile[1] : "pas de tuile");
}

/* ── Les collections du lot 3 ─────────────────────────────────────────
   Une collection n'a sa tuile qu'avec trois séances au moins : une tuile
   qui dirait « Bientôt » serait un chantier visible. « Dehors » attend
   donc les séances qui demandent des mouvements à dessiner (la marche,
   l'escalier). */
{
  const FAMILLE_LOT3: Record<string, string> = {
    routines: "moment", joursans: "moment", tete: "objectif", voyage: "terrain", dehors: "terrain",
    halteres: "terrain", kettlebell: "terrain",
  };
  for (const [col, fam] of Object.entries(FAMILLE_LOT3)) {
    const dedans = seances.filter((s) => s.collections?.includes(col as CatalogCollection));
    const tuile = new RegExp(`id: "${col}", famille: "${fam}", name: "[^"]+", tag: "[^"]+",\\s*img: "([a-z0-9-]+)"(?:, pos: "[^"]+")?, match: matchCollection\\("${col}", \\(\\) => false\\)`).exec(page);
    const ailleurs = page.includes(`id: "${col}",`);
    if (dedans.length >= 3) {
      verdict(`${col} · au moins trois séances et une tuile, avec une photo qui existe`,
        !!tuile && existsSync(path.join(RACINE, "public/entrainement", `${tuile[1]}.webp`)),
        `${dedans.length} séances, ${tuile ? tuile[1] : "pas de tuile"}`);
    } else {
      verdict(`${col} · pas de tuile tant qu’il n’y a pas trois séances`, !ailleurs, `${dedans.length} séance(s)`);
    }
  }
}

/* La page Premium (InfosPremium) promet « pour chaque objectif et chaque
   zone du corps des séances accessibles sans rien payer ». Un format peut
   être tout Vaiiya+ (EMOM, séries longues) ; un objectif ou une zone, non. */
{
  const promises: CatalogCollection[] = ["express", "masse", "perte", "renfo", "cardiohiit", "tete", ...ZONES, "haut", "fullbody"];
  const sansBase = promises.filter((c) => !seances.some((s) => s.collections?.includes(c) && s.access !== "premium"));
  verdict("chaque objectif et chaque zone garde une séance incluse (page Premium)", sansBase.length === 0, liste(sansBase));
}

/* ── Les photos choisies à la main ────────────────────────────────────── */

{
  const titres = new Set(seances.map((s) => s.title.toLowerCase()));
  const inconnues = Object.keys(PHOTO_PAR_TITRE).filter((t) => !titres.has(t));
  verdict("chaque photo choisie à la main vise un titre du catalogue", inconnues.length === 0, liste(inconnues));

  const hors = Object.entries(PHOTO_PAR_TITRE)
    .filter(([, img]) => !Object.values(FAMILY).some((f) => f.variants.includes(img))
      || !existsSync(path.join(RACINE, "public/entrainement", `${img}.webp`)))
    .map(([t, img]) => `${t} → ${img}`);
  verdict("chaque photo choisie à la main existe et appartient à une famille", hors.length === 0, liste(hors));

  const suivies = Object.entries(PHOTO_PAR_TITRE)
    .filter(([t, img]) => resolveArt({ title: `${t} Force` }).img !== img)
    .map(([t]) => t);
  verdict("la photo choisie suit le titre jusque dans la semaine (titre et type)", suivies.length === 0, liste(suivies));
}

/* ── Les collections d'avant gardent leur première carte ──────────────────
   Une séance ajoutée se range après elles : ouvrir « Séances express »
   ou « Mobilité & posture » montre les mêmes cartes en tête qu'avant le
   lot 1. Changer une première carte se décide : on met alors ce témoin à
   jour, avec la raison. Depuis la vague 7 (décidé) : « Prise de masse »
   s'ouvre sur « Fessiers lourds », « Abdos & gainage » sur ses nouvelles
   séances (« Gainage, les bases », « Le tronc dans tous les sens ») et
   les incluses de « Jambes » sur « Jambes, l’essentiel ». Les formats
   (vague 8) sont tenus depuis leur naissance : « Force » s’ouvre sur
   « Le 5 × 5 de la salle », « Circuits et supersets » sur « Haut du corps
   en circuit », « EMOM » sur « EMOM 20 » et « Tenir et ralentir » sur
   « Tenir partout ». « Séries longues » et « EMOM » n’ont aucune séance
   incluse : c’est la proposition validée par Louis (2026-10-27). */
{
  const TETES: Record<string, [string | null, string | null]> = {
    force: ["force-haut", "cinq-cinq-salle"],
    longues: [null, "fessiers-300"],
    circuits: ["circuit-maison", "haut-circuit"],
    emom: [null, "emom-20"],
    intervalles: ["hiit", "tabata-express"],
    isometrie: ["gainage-bases", "tenir-partout"],
    abdos: ["gainage-bases", "tronc-sens"],
    express: ["express-12", "appartement-silencieux"],
    masse: ["force-haut", "fessiers-lourds"],
    perte: ["cardio-sans-saut", "fullbody-inter"],
    renfo: ["force-haut", "appartement-silencieux"],
    cardiohiit: ["cardio-sans-saut", "fullbody-inter"],
    salle: ["force-haut", "cardio-salle"],
    sansmateriel: ["fullbody-deb", "appartement-silencieux"],
    debuter: ["salle-decouverte", "lendemain-seance"],
    mobilite: ["mobilite", "hanches-libres"],
    recup: ["recup-active", "recup-jambes"],
    haut: ["force-haut", "haut-corps-sol"],
    jambes: ["jambes-essentiel", "jambes-poids-corps"],
    /* Le lot 3 (2026-10-28) : ses collections s'ouvrent sur ses séances. */
    routines: ["reveil", "matin-tonique"],
    joursans: ["pas-la-forme", "mauvaise-journee"],
    tete: ["respirer", "mauvaise-journee"],
    voyage: ["apres-trajet", "chambre-hotel"],
    /* Le lot 6 : « Haltères à la maison » s'ouvre sur sa séance incluse et
       sur « La force aux haltères » (lot 2), la première du tableau. */
    halteres: ["corps-entier-halteres", "force-halteres"],
  };
  for (const [col, [libre, plus]] of Object.entries(TETES)) {
    const dedans = seances.filter((s) => s.collections?.includes(col as CatalogCollection));
    const tl = dedans.find((s) => s.access !== "premium")?.id ?? null;
    const tp = dedans.find((s) => s.access === "premium")?.id ?? null;
    verdict(`${col} · ses premières cartes`, tl === libre && tp === plus, `${tl} puis ${tp}`);
  }
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
