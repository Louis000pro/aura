/* ═══════════════════════════════════════════════════════════════════════
   check:trouver, le banc de « Trouver ma séance » (lib/trouverSeance).

     npm run check:trouver

   Il joue les filtres, la loupe et les propositions sur le VRAI
   catalogue : ce que chaque mot reconnu désigne, « sans saut » qui ne
   laisse rien passer qui saute, les mots qui excluent et qui ne se
   relâchent jamais, la durée qui sert de cible, les phrases de la
   maquette mot pour mot, et ce que l'écran a le droit de faire (lire,
   jamais écrire).
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { workoutSessions } from "@/lib/catalogueSeances";
import { cleExercice } from "@/lib/exerciceCle";
import type { RecordMouvement } from "@/lib/records";
import {
  DUREES, GROUPES, SANS_FILTRE, aDesSauts, aLaUne, chercher, compter, courtes, ditsDesFiltres, exercicesDe,
  faisableAvec, filtrer, lireSaisie, nouvelles, phrasePourToi, pourEquilibrer, pourToi, prochainPalier,
  type Contexte, type Filtres, type SeanceTrouvable,
} from "@/lib/trouverSeance";
import { WAVE_11_EXERCISES } from "@/lib/workoutWave11";
import { WAVE_12_EXERCISES } from "@/lib/workoutWave12";
import { WAVE_13_EXERCISES } from "@/lib/workoutWave13";
import { WAVE_14_EXERCISES } from "@/lib/workoutWave14";

const RACINE = process.cwd();
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");
let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " · " + detail : ""));
}
const NB = String.fromCharCode(160);
const S: (SeanceTrouvable & { title: string })[] = workoutSessions.map((s) => ({ ...s, perso: false }));
const seances = S.filter((s) => s.contentType !== "article");
const nomsDe = (s: SeanceTrouvable) => exercicesDe(s).map((e) => e.name);
const titres = (xs: { title: string }[]) => xs.map((s) => s.title).join(", ") || "aucune";
const F = (f: Partial<Filtres>): Filtres => ({ ...SANS_FILTRE, ...f });
/** Une séance sans collection déclarée (« Défi Gainage ») se juge à ses mots, comme le fait le module. */
const en = (s: SeanceTrouvable, c: string) => !s.collections || s.collections.includes(c as never);

/* ── Les mots que la loupe reconnaît ──────────────────────────────────── */
{
  const parCle = new Map<string, Set<string>>();
  for (const d of ditsDesFiltres()) parCle.set(d.cle, (parCle.get(d.cle) ?? new Set()).add(d.cible));
  const doubles = [...parCle].filter(([, c]) => c.size > 1).map(([k, c]) => `${k} → ${[...c].join(" / ")}`);
  verdict("aucun mot reconnu ne désigne deux filtres", doubles.length === 0, doubles.join(" ; "));

  const vides = GROUPES.filter((g) => g.id !== "duree").flatMap((g) => g.options
    .filter((o) => compter(S, F({ [g.id]: [o.id] } as Partial<Filtres>)) === 0).map((o) => `${g.id}:${o.id}`));
  verdict("chaque option de filtre trouve au moins une séance", vides.length === 0, vides.join(", "));

  const trous = DUREES.slice(1).filter((d, i) => d.min !== DUREES[i].max + 1).map((d) => d.label);
  verdict("les fenêtres de durée se suivent sans trou ni chevauchement", trous.length === 0 && DUREES[0].min === 0 && DUREES[DUREES.length - 1].max === Infinity, trous.join(", "));
}

/* ── Sans saut ────────────────────────────────────────────────────────── */
{
  const saute = (name: string) => aDesSauts({ id: "x", exerciseList: [{ name }] });
  const sauts = ["Squats sautés", "Fentes sautées", "Burpees", "Jumping jacks", "Corde à sauter", "Pompes explosives", "Box jump", "Skaters", "Sprint sur place"];
  const calmes = ["Squat", "Pompes", "Gainage", "Mountain climbers", "Chaise au mur", "Kettlebell swing", "Rameur", "Développé couché", "Thruster haltères", "Step up banc", "Bear crawl", "Fentes", "Montées de genoux"];
  verdict("les gestes qui sautent ou résonnent sont reconnus", sauts.every(saute), sauts.filter((n) => !saute(n)).join(", "));
  verdict("les gestes calmes ne sont pas pris pour des sauts", calmes.every((n) => !saute(n)), calmes.filter(saute).join(", "));
  const contradictions = seances.filter((s) => /sans saut/i.test(s.title) && aDesSauts(s));
  verdict("une séance qui dit « sans saut » n'en contient aucun", contradictions.length === 0, titres(contradictions));
}

/* ── Les filtres de la ligne ──────────────────────────────────────────── */
{
  const f = F({ duree: "20", ou: ["sansmateriel"], zones: ["pecs", "dos"] });
  const r = filtrer(S, f);
  verdict("ET entre deux groupes, OU dans un groupe", r.strict && r.seances.every((s) =>
    en(s, "sansmateriel") && (en(s, "pecs") || en(s, "dos"))), titres(r.seances));
  const ecarts = r.seances.map((s) => Math.abs(s.duration - 20));
  verdict("la durée sert de cible : 15 à 25 min, la plus proche d'abord",
    r.seances.every((s) => s.duration >= 15 && s.duration <= 25) && ecarts.every((e, i) => i === 0 || e >= ecarts[i - 1]),
    r.seances.map((s) => s.duration).join(", "));
  verdict("le bouton compte les séances qui réunissent tout", compter(S, f) === r.seances.length, String(compter(S, f)));

  const ss = filtrer(S, F({ sansSaut: true, objectifs: ["cardiohiit"], duree: "10" }));
  verdict("« Sans saut » tient même quand rien ne réunit tout", ss.seances.length > 0 && ss.seances.every((s) => !aDesSauts(s)),
    `${ss.strict ? "strict" : "relâché"} · ${titres(ss.seances.slice(0, 4))}`);

  const emom = filtrer(S, F({ formats: ["emom"] }));
  verdict("une séance Vaiiya+ est marquée, jamais cachée", emom.seances.some((s) => s.access === "premium"), titres(emom.seances));

  const salle = filtrer(S, F({ ou: ["salle"], zones: ["abdos"], duree: "10" }));
  verdict("le lieu ne se relâche jamais", salle.seances.every((s) => en(s, "salle")), titres(salle.seances));

  const aucun = compter(S, F({ ou: ["voyage"], formats: ["force"], niveaux: ["Avancé"] }));
  verdict("rien ne réunit tout : le bouton compte zéro", aucun === 0, String(aucun));
}

/* ── La loupe ─────────────────────────────────────────────────────────── */
{
  const l = lireSaisie("abdos sans bruit 15 min");
  verdict("« abdos sans bruit 15 min » se lit : abdos, sans saut, 15 min au plus",
    l.filtres.zones.join() === "abdos" && l.filtres.sansSaut && l.dureeMax === 15 && l.mots.length === 0, JSON.stringify(l));
  const r = chercher(S, "abdos sans bruit 15 min");
  verdict("la ligne dit ce que la loupe a compris (maquette)", r.ligne.startsWith(`Abdos & gainage · Sans saut · 15${NB}min ou moins · `), r.ligne);
  verdict("et ses séances tiennent tout", r.strict && r.seances.every((s) => s.duration <= 15 && !aDesSauts(s) && en(s, "abdos")), titres(r.seances));

  verdict("une faute de frappe sur un filtre : « abods »", lireSaisie("abods").filtres.zones.join() === "abdos");
  verdict("« haut du corps » avant « haut »", lireSaisie("haut du corps débutant").filtres.zones.join() === "haut"
    && lireSaisie("haut du corps débutant").filtres.niveaux.join() === "Débutant");
  const durees = [["1h", 60], ["20min", 20], ["une heure", 60], ["rapide", 15], ["1h30", 90], ["30", 30]] as const;
  const fausses = durees.filter(([t, n]) => lireSaisie(t).dureeMax !== n).map(([t]) => `${t} → ${lireSaisie(t).dureeMax}`);
  verdict("les durées tapées se lisent", fausses.length === 0, fausses.join(", "));

  const p = chercher(S, "pomps");
  verdict("un exercice mal tapé se corrige : « pomps » → « Pompes »", p.ligne.startsWith("Pompes · ") && p.seances.length > 0
    && p.seances.every((s) => nomsDe(s).some((n) => /pomp/i.test(n)) || /pomp/i.test(s.title)), p.ligne);
  const pompes = chercher(S, "pompes");
  verdict("un mot du titre passe devant", /pompes/i.test(pompes.seances[0]?.title ?? ""), titres(pompes.seances.slice(0, 3)));

  const k = chercher(S, "kangourou");
  verdict("un mot qu'aucune séance ne contient est dit, et rien ne s'affiche", k.seances.length === 0 && k.inconnus.join() === "kangourou", JSON.stringify(k.inconnus));
  const vide = chercher(S, "je veux une séance");
  verdict("des mots qui ne disent rien ne montrent pas tout le catalogue", vide.seances.length === 0 && vide.inconnus.length === 0);

  const d = chercher(S, "dos 8 min sans matériel");
  verdict("quand rien ne réunit tout, la phrase de la maquette", !d.strict
    && d.message === `Rien pour le dos en 8${NB}minutes. Voici les plus proches, toujours sans matériel.`, String(d.message));
  verdict("le Guide peut composer la séance qui manque", d.demande === `Une séance de 8${NB}minutes pour le dos, sans matériel.`, String(d.demande));
  verdict("les plus proches gardent le lieu et la zone", d.seances.length > 0
    && d.seances.every((s) => en(s, "sansmateriel") && en(s, "dos")), titres(d.seances));

  const b = chercher(S, "sans burpees cardio");
  verdict("« sans burpees » retire les séances qui en contiennent", b.seances.length > 0
    && b.seances.every((s) => !nomsDe(s).some((n) => /burpee/i.test(n))), `${b.ligne}`);
  verdict("une séance Vaiiya+ sort aussi par la loupe", chercher(S, "emom").seances.some((s) => s.access === "premium"));
}

/* ── Les propositions ─────────────────────────────────────────────────── */
{
  const ctx: Contexte = { lieu: { location: "maison", equip: "halteres" }, dureeCible: 30, niveau: "Débutant", premium: false, jour: "2026-11-01" };
  const toi = pourToi(S, ctx);
  verdict("« Pour toi » : la phrase de la maquette", toi?.phrase === `À la maison avec tes haltères, autour de 30${NB}minutes.`, String(toi?.phrase));
  verdict("« Pour toi » : trois cartes au plus, faisables avec ce qu'on a", !!toi && toi.seances.length > 0 && toi.seances.length <= 3
    && toi.seances.every((s) => faisableAvec(s, "halteres")), titres(toi?.seances ?? []));
  verdict("pour un compte gratuit, la grande carte est toujours incluse", toi?.seances[0]?.access !== "premium", toi?.seances[0]?.title ?? "");
  const aPart = toi?.seances.filter((s) => s.collections?.some((c) => ["classiques", "routines", "joursans"].includes(c)) || s.id in WAVE_11_EXERCISES || s.id in WAVE_13_EXERCISES || s.id in WAVE_14_EXERCISES) ?? [];
  verdict("ni classique, ni routine, ni séance écrite pour un sport ou pour ce qu'on mange", aPart.length === 0, titres(aPart));
  verdict("la même toute la journée", JSON.stringify(pourToi(S, ctx)?.seances.map((s) => s.id)) === JSON.stringify(toi?.seances.map((s) => s.id)));
  const semaine = Array.from({ length: 7 }, (_, i) => pourToi(S, { ...ctx, jour: `2026-11-0${i + 1}` })?.seances[0]?.id);
  verdict("la grande carte change d'un jour à l'autre", new Set(semaine).size > 1, semaine.join(", "));
  const debutant = Array.from({ length: 7 }, (_, i) => pourToi(S, { ...ctx, jour: `2026-11-0${i + 1}` })?.seances ?? []).flat();
  verdict("un débutant ne reçoit jamais d'avancé", debutant.every((s) => s.difficulty !== "Avancé"), titres(debutant.filter((s) => s.difficulty === "Avancé")));
  const phrases = [
    [{ ...ctx, lieu: { location: "salle", equip: null }, dureeCible: 45 }, `À la salle, autour de 45${NB}minutes.`],
    [{ ...ctx, lieu: { location: "maison", equip: "poids" }, dureeCible: null }, "À la maison, sans matériel."],
    [{ ...ctx, lieu: { location: null, equip: null }, dureeCible: null }, "D’après ton niveau."],
    [{ ...ctx, lieu: { location: null, equip: null }, dureeCible: null, niveau: null }, "Pour commencer."],
    [{ ...ctx, lieu: { location: null, equip: null }, dureeCible: 20 }, `Autour de 20${NB}minutes.`],
  ] as const;
  const mal = phrases.filter(([c, p]) => phrasePourToi(c as Contexte) !== p).map(([c]) => phrasePourToi(c as Contexte));
  verdict("la phrase de « Pour toi » suit les réglages", mal.length === 0, mal.join(" | "));

  const faites = [
    { titre: "Push, pectoraux et épaules", quand: "2026-10-28T10:00:00", exos: [] },
    { titre: "Pompes maîtrisées", quand: "2026-10-30T18:00:00", exos: [] },
  ];
  const eq = pourEquilibrer(S, faites, ctx);
  verdict("« Pour équilibrer » : la phrase dit ce qui a été fait et ce qui vient",
    eq?.phrase === "Mercredi et vendredi, les pecs. Voici le dos et les jambes.", String(eq?.phrase));
  verdict("et ses séances viennent du dos et des jambes", !!eq && eq.seances.length === 2
    && eq.seances[0].collections!.includes("dos") && eq.seances[1].collections!.some((c) => c === "jambes" || c === "fessiers"), titres(eq?.seances ?? []));
  verdict("sans séance ces sept jours, pas de rangée", pourEquilibrer(S, [], ctx) === null && pourEquilibrer(S, null, ctx) === null);
  const hier = pourEquilibrer(S, [{ titre: "Jambes, l’essentiel", quand: "2026-10-31T09:00:00", exos: [] }], ctx);
  verdict("hier se dit « hier »", hier?.phrase.startsWith("Hier, les jambes.") ?? false, String(hier?.phrase));
  const tout = pourEquilibrer(S, [
    { titre: "Push, pectoraux et épaules", quand: "2026-10-27T10:00:00", exos: [] },
    { titre: "Dos & Biceps", quand: "2026-10-28T10:00:00", exos: [] },
    { titre: "Jambes, l’essentiel", quand: "2026-10-29T10:00:00", exos: [] },
    { titre: "Gainage, les bases", quand: "2026-10-30T10:00:00", exos: [] },
  ], ctx);
  verdict("une semaine déjà équilibrée n'a rien à proposer", tout === null, String(tout?.phrase));
  const parExos = pourEquilibrer(S, [{ titre: "Ma séance à moi", quand: "2026-10-30T10:00:00", exos: ["Pompes", "Développé militaire haltères", "Pompes diamant"] }], ctx);
  verdict("une séance perso se lit par ses exercices", parExos?.phrase.startsWith("Vendredi, les pecs.") ?? false, String(parExos?.phrase));

  const cle = cleExercice("Pompes") ?? "nom:pompes";
  const rec = (c: string, nom: string, quand: string): RecordMouvement => ({ cle: c, nom, mesure: "reps", meilleur: { valeur: 15, reps: null, quand }, marches: [], seances: 3 });
  const palier = prochainPalier(S, [rec("introuvable", "Mouvement imaginaire", "2026-10-31T10:00:00"), rec(cle, "Pompes", "2026-10-20T10:00:00")], ctx);
  verdict("« Ton prochain palier » : le dernier record qu'une séance peut pousser", palier?.record.nom === "Pompes", palier?.record.nom ?? "aucun");
  verdict("deux séances au plus, qui contiennent le mouvement", !!palier && palier.seances.length > 0 && palier.seances.length <= 2
    && palier.seances.every((x) => (cleExercice(x.exercice.name) ?? "") === cle && !/\d+\s*(s|sec|min)\b/.test(String(x.exercice.reps))), palier?.seances.map((x) => `${x.seance.title} (${x.exercice.sets} × ${x.exercice.reps})`).join(", ") ?? "");
  verdict("sans record, pas de palier", prochainPalier(S, null, ctx) === null && prochainPalier(S, [], ctx) === null);

  const c = courtes(S, ctx);
  verdict("« Moins de 15 minutes » : quatre séances de 15 min au plus, sans classique", c.length === 4
    && c.every((s) => s.duration <= 15 && !s.collections?.includes("classiques")), titres(c));

  const lots = [WAVE_14_EXERCISES, WAVE_13_EXERCISES, WAVE_12_EXERCISES, WAVE_11_EXERCISES].map((w) => new Set(Object.keys(w)));
  const n = nouvelles(S, ctx);
  verdict("« Nouvelles séances » : deux par lot, les quatre lots les plus récents, le plus neuf d'abord", n.length === 8 && new Set(n.map((s) => s.id)).size === 8
    && n.every((s, i) => lots[Math.floor(i / 2)].has(s.id)), titres(n));
  verdict("la liste tourne d'un jour à l'autre", JSON.stringify(aLaUne([1, 2, 3], "2026-11-01")) !== JSON.stringify(aLaUne([1, 2, 3], "2026-11-02")));
}

/* ── Le chemin : l'écran lit, il ne décide ni n'écrit ─────────────────── */
{
  const ecran = lire("src/components/catalogue/TrouverSeance.tsx");
  const donnees = lire("src/components/catalogue/useDonneesTrouver.ts");
  const feuille = lire("src/components/catalogue/FeuilleFiltres.tsx");
  const cartes = lire("src/components/catalogue/CartesSeance.tsx");
  const ecrit = /\.(insert|update|upsert|delete|rpc)\(/;
  verdict("le catalogue n'écrit rien en base", ![ecran, donnees, feuille, cartes].some((t) => ecrit.test(t)));
  verdict("l'écran demande tout aux règles (lib/trouverSeance)", ["chercher(", "filtrer(", "pourToi(", "pourEquilibrer(", "prochainPalier(", "courtes(", "nouvelles("].every((f) => ecran.includes(f)));
  verdict("le bouton des feuilles compte avec la même règle", feuille.includes("compter(seances, brouillon)"));
  verdict("le Guide reçoit la séance qui manque, en une phrase de la personne", ecran.includes("onDemander(`Compose-moi ${"));
  const page = lire("src/app/progression/page.tsx");
  verdict("« Je choisis » monte le nouveau catalogue", page.includes("<TrouverSeance") && page.includes(`h2 className="vy-titre leading-tight" style={{ color: "var(--text-0)" }}>Je choisis</h2>`));
  verdict("une seule recherche : l'ancienne loupe d'Entraînement est partie", !page.includes("resultatsRecherche") && !page.includes("hayRecherche")
    && page.includes(`setChoisirCible("loupe")`));
  verdict("une seule résolution des exercices d'une séance", page.includes("return exercicesDe(s) as Exercise[];"));
  verdict("« Mes séances » passe dans le bouton en haut à droite", page.includes(`onClick={() => ouvrirCollection("tiennes", false)}`));
  const recettes = lire("src/lib/rechercheRecettes.ts");
  const texte = lire("src/lib/texteRecherche.ts");
  verdict("les deux loupes lisent le texte avec la même règle", recettes.includes(`from "@/lib/texteRecherche"`)
    && lire("src/lib/trouverSeance.ts").includes(`from "@/lib/texteRecherche"`) && !/recipeBank|collectionsRecettes/.test(texte));
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
