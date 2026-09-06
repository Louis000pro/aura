/* ════════════════════════════════════════════════════════════════════
   check:programme — le banc d'essai de la transition V4.5.

     npm run check:programme

   ⚠️ IL EXERCE LE VRAI CODE (`src/lib/programme.ts`, `src/lib/planning.ts`),
   pas une recopie qui divergerait au premier changement.

   Ce qu'il peut vérifier ici, et pourquoi c'est justement ça : l'app est
   auth-gated et les clés Supabase ne sont pas en local, donc les écritures
   ne se testent pas depuis cette machine. En revanche TOUTES LES DÉCISIONS
   du mécanisme sont des fonctions pures (que crée-t-on, avec combien
   d'étapes, dans quel ordre, quelle est la suivante), et ce sont elles qui
   décident du comportement. Le reste (unicité, idempotence, RLS, curseur en
   base, planning intact) se vérifie contre la vraie base, dans une
   transaction annulée.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync } from "node:fs";
import { verrouDeFermeture } from "@/lib/finSeance";
import { etapesDuCycle, etapeSuivante, nomDeProgramme, positionRefermee, POSITION_INITIALE } from "@/lib/programme";
import { etatJournee, intentionDeLEtape, lancementDuJour, libelleReservation, repetitionDuJour } from "@/lib/journee";
import {
  cycleDeReference, seancesDuCycle, previewWeek, weekDates, ANCIEN, NOUVEAU,
  ordonner, parDate, principale, supplements, seancesDuJour, prochaineSeanceDuJour,
  refModele, lienProgramme, prochainsJours, todayYmd,
  type PlanningDay,
} from "@/lib/planning";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " — " + detail);
}

/* ── 1. Ce qui ne doit RIEN créer ───────────────────────────────────── */
for (const [libelle, valeur] of [
  ["aucune réponse (null)", null],
  ["aucune réponse (undefined)", undefined],
  ["a répondu 0 séance", 0],
  ["valeur absurde (négative)", -3],
  ["valeur absurde (NaN)", Number.NaN],
] as [string, number | null | undefined][]) {
  verdict("rien créé · " + libelle, etapesDuCycle(valeur) === null, "→ null");
}

/* ── 2. La forme du cycle, de 1 à 14 séances visées ─────────────────── */
for (let cible = 1; cible <= 14; cible++) {
  const etapes = etapesDuCycle(cible);
  if (!etapes) { verdict("cycle · cible " + cible, false, "aucun cycle rendu"); continue; }

  const attendu = Math.min(6, cible);
  const positions = etapes.map((e) => e.position);
  const bonnesPositions = positions.every((p, i) => p === POSITION_INITIALE + i);
  const toutesSeances = etapes.every((e) => e.nature === "seance");
  const dureesLibres = etapes.every((e) => e.dureeMin === null);
  const origines = etapes.every((e) => e.origine === "systeme");
  const nomsUniques = new Set(etapes.map((e) => e.nom)).size === etapes.length;

  verdict(
    "cycle · cible " + cible,
    etapes.length === attendu && bonnesPositions && toutesSeances && dureesLibres && origines && nomsUniques,
    etapes.length + " étape(s), positions " + positions.join("/") + " : " + etapes.map((e) => e.nom).join(" · "),
  );
}

/* ── 3. Le cycle est CELUI DE L'ANCIEN MOTEUR ────────────────────────
   C'est le cœur de la transition : le programme ne propose pas une
   rotation nouvelle, il persiste celle que le produit applique déjà.
   On rejoue donc la génération de semaine existante et on compare.     */
for (let cible = 1; cible <= 7; cible++) {
  const semaine = previewWeek(
    { ctx: "salle", sessions: cible, goals: ["masse"], level: "debutant", variant: 0, seed: "banc" },
    weekDates(new Date("2026-09-07T00:00:00")),
  );
  const titresAncien: string[] = [];
  for (const j of semaine) if (j.title && !titresAncien.includes(j.title)) titresAncien.push(j.title);
  const cycle = cycleDeReference(cible);
  verdict(
    "même rotation que l'ancien moteur · cible " + cible,
    JSON.stringify(titresAncien) === JSON.stringify(cycle),
    "ancien [" + titresAncien.join(", ") + "] / cycle [" + cycle.join(", ") + "]",
  );
  verdict(
    "aucune séance datée dans le cycle · cible " + cible,
    etapesDuCycle(cible)!.every((e) => !("date" in e)),
    seancesDuCycle(cible) + " étape(s), zéro date",
  );
}

/* ── 4. Le curseur dérivé ────────────────────────────────────────────── */
{
  const cycle = etapesDuCycle(3)!;                       // positions 1, 2, 3
  const nomDe = (p: number | null) => (p === null ? "aucune" : String(p));

  const depart = etapeSuivante(cycle, null);
  verdict("curseur · rien de consommé", depart?.position === 1, "→ étape " + depart?.position + " (" + depart?.nom + ")");

  for (const [consommee, attendue] of [[1, 2], [2, 3], [3, 1]] as [number, number][]) {
    const suivante = etapeSuivante(cycle, consommee);
    verdict(
      "curseur · après l'étape " + nomDe(consommee),
      suivante?.position === attendue,
      "→ étape " + suivante?.position + " (attendue " + attendue + ")",
    );
  }

  // Le cycle TOURNE : c'est ce qui permet à trois lignes de tenir des mois.
  let position: number | null = null;
  const parcours: number[] = [];
  for (let i = 0; i < 7; i++) { position = etapeSuivante(cycle, position)!.position; parcours.push(position); }
  verdict("curseur · le cycle tourne", JSON.stringify(parcours) === "[1,2,3,1,2,3,1]", "sept séances → " + parcours.join(","));

  // Étape d'une version archivée : on repart du point de report, jamais « rien à faire ».
  const inconnue = etapeSuivante(cycle, 99);
  verdict("curseur · étape inconnue", inconnue?.position === POSITION_INITIALE, "→ étape " + inconnue?.position);

  // L'ordre d'arrivée des lignes ne doit rien changer.
  const melange = [cycle[2], cycle[0], cycle[1]];
  verdict("curseur · lignes en désordre", etapeSuivante(melange, 1)?.position === 2, "→ étape " + etapeSuivante(melange, 1)?.position);

  verdict("curseur · cycle vide", etapeSuivante([], null) === null, "→ null");

  // `position_initiale` reporte le curseur d'une version à l'autre.
  verdict("curseur · report de position", etapeSuivante(cycle, null, 3)?.position === 3, "position_initiale=3 → étape 3");
}

/* ── 5. Le nom du programme ──────────────────────────────────────────── */
verdict("nom · objectif connu", nomDeProgramme(["masse"]) === "Prise de masse", nomDeProgramme(["masse"]));
verdict("nom · ancien vocabulaire", nomDeProgramme(["prise_de_masse"]) === "Prise de masse", nomDeProgramme(["prise_de_masse"]));
verdict("nom · aucun objectif", nomDeProgramme(null) === "Mon programme", nomDeProgramme(null));
verdict("nom · liste vide", nomDeProgramme([]) === "Mon programme", nomDeProgramme([]));

/* ── 6. Lire n'écrit plus rien ────────────────────────────────────────
   ⚠️ Ce contrôle lit le SOURCE, et c'est volontaire. « Consulter sa
   semaine n'écrit plus » est une propriété du CHEMIN de lecture, pas
   d'une valeur : la seule façon de la tenir dans le temps est de vérifier
   qu'aucune écriture n'y est réintroduite. C'est exactement la régression
   qui repasserait inaperçue, puisqu'elle ne casse rien et ne se voit
   qu'en base.                                                           */
{
  const source = readFileSync(new URL("../src/lib/planning.ts", import.meta.url), "utf8");
  const corpsDe = (nom: string) => {
    const debut = source.indexOf("export async function " + nom);
    if (debut === -1) return null;
    const suite = source.indexOf("\nexport ", debut + 10);
    return source.slice(debut, suite === -1 ? source.length : suite);
  };
  const ECRITURES = [".insert(", ".upsert(", ".delete(", ".update("];
  for (const nom of ["lireSemaine", "lireJour", "fetchRange"]) {
    const corps = corpsDe(nom);
    const fautes = corps === null ? ["fonction introuvable"] : ECRITURES.filter((e) => corps.includes(e));
    verdict("lecture pure · " + nom, fautes.length === 0, fautes.length ? "écrit : " + fautes.join(" ") : "aucune écriture");
  }
  verdict(
    "l'ancien moteur a disparu · ensureWeek",
    !source.includes("export async function ensureWeek"),
    "plus exporté par planning.ts",
  );
}

/* ── 7. Les deux vocabulaires (V6) ────────────────────────────────────
   ⚠️ Une vue de compatibilité protégerait le NOM de la table, pas le SENS
   de ses valeurs : un déploiement qui lit `status` et reçoit `prevue` ne
   plante pas, il comprend de travers, et « faite » cesse silencieusement
   d'être reconnue. D'où deux tables de traduction, et ce contrôle qui
   vérifie qu'elles sont bien l'inverse l'une de l'autre : une seule
   entrée oubliée ferait passer une séance faite pour une séance à faire.  */
for (const s of [ANCIEN, NOUVEAU]) {
  const statuts = ["planned", "done", "skipped"] as const;
  const allerRetour = statuts.every((st) => s.versCode[s.versBase[st]] === st);
  verdict(
    "vocabulaire · " + s.table,
    allerRetour && Object.keys(s.versCode).length === statuts.length,
    statuts.map((st) => st + "→" + s.versBase[st]).join(" · "),
  );
}
verdict(
  "vocabulaire · les deux contrats sont bien distincts",
  ANCIEN.colStatut !== NOUVEAU.colStatut && ANCIEN.table !== NOUVEAU.table,
  ANCIEN.colStatut + " / " + NOUVEAU.colStatut,
);

{
  // Plus aucun écran ne doit nommer la table en dur : le nom se résout.
  const dossiers = ["src/lib", "src/app", "src/components", "src/context"];
  const enDur: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const chemin = d + "/" + e.name;
      if (e.isDirectory()) { parcourir(chemin); continue; }
      if (!/[.]tsx?$/.test(e.name)) continue;
      const t = readFileSync(chemin, "utf8");
      // planning.ts a le droit : c'est lui qui DÉCLARE l'ancien contrat.
      if (t.includes('"planning_days"') && !chemin.endsWith("lib/planning.ts")) enDur.push(chemin);
    }
  };
  for (const d of dossiers) parcourir(d);
  verdict("plus aucune table nommée en dur", enDur.length === 0, enDur.length ? enDur.join(", ") : "toutes les lectures passent par le schéma résolu");
}

/* ── 8. La journée à plusieurs intentions (V6b) ───────────────────────
   ⚠️ TOUT SE JOUE ICI : ce sont des fonctions PURES, donc la hiérarchie
   d'une journée se vérifie hors ligne, sur une app pourtant auth-gated.
   Le défaut qu'elles empêchent est le pire de la vague : une seconde
   séance écrite en base et qui n'apparaît nulle part.                   */
{
  const intention = (p: Partial<PlanningDay>): PlanningDay => ({
    id: null, date: "2026-09-10", type: "Force", title: "Séance",
    difficulty: "Intermédiaire", location: null,
    exerciseList: [{ name: "Pompes", sets: 3, reps: "12", rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] }],
    sessionId: null, status: "planned", etapeId: null, creeLe: null, ...p,
  });

  const etape   = intention({ id: "a", title: "Push", etapeId: "e1", creeLe: "2026-09-09T18:00:00Z" });
  const vieille = intention({ id: "b", title: "Ancienne", creeLe: "2026-09-01T08:00:00Z" });
  const recente = intention({ id: "c", title: "Récente", creeLe: "2026-09-09T20:00:00Z" });
  const neuve   = intention({ id: null, title: "Pas encore écrite" });

  const ordre = ordonner([recente, vieille, etape, neuve]).map((i) => i.title);
  verdict(
    "journée · l'étape d'abord, les suppléments ensuite",
    ordre.join(" · ") === "Push · Ancienne · Récente · Pas encore écrite",
    ordre.join(" · "),
  );

  /* Une seule séance sur un jour : rien ne change, et c'est le contrôle
     qui compte le plus, parce que c'est le cas de tout le monde. */
  const seule = [intention({ id: "z", title: "Full Body", creeLe: "2026-09-02T08:00:00Z" })];
  verdict(
    "journée · une seule séance, comportement identique",
    principale(seule)?.title === "Full Body" && supplements(seule).length === 0,
    "principale = Full Body, 0 supplément",
  );

  /* Deux séances le même jour : les DEUX existent, et l'ordre est stable. */
  const deux = [vieille, recente];
  verdict(
    "journée · séance + supplément, les deux existent",
    principale(deux)?.title === "Ancienne" && supplements(deux).map((i) => i.title).join() === "Récente",
    "principale = Ancienne, supplément = Récente",
  );

  /* ⚠️ LE DÉFAUT QUE L'ANCIEN `parDate` AVAIT : il indexait par date, donc
     la seconde intention d'une même journée ÉCRASAIT la première dans le
     Record. Elle était en base, lue, et invisible. */
  const index = parDate([vieille, recente, intention({ id: "d", date: "2026-09-11", title: "Autre jour" })]);
  verdict(
    "journée · aucune intention perdue à l'indexation",
    index["2026-09-10"]?.length === 2 && index["2026-09-11"]?.length === 1,
    (index["2026-09-10"]?.length ?? 0) + " le 10, " + (index["2026-09-11"]?.length ?? 0) + " le 11",
  );

  /* Un repos ne se lance pas, et il ne compte pas comme une séance. */
  const repos = intention({ id: "r", type: "Repos", title: "", exerciseList: [], creeLe: "2026-09-01T07:00:00Z" });
  verdict(
    "journée · un repos n'est jamais compté comme une séance",
    seancesDuJour([repos, vieille]).map((i) => i.title).join() === "Ancienne",
    "1 séance retenue sur 2 intentions",
  );

  /* La prochaine séance À FAIRE, pas la première ligne : une journée peut
     porter une séance déjà faite et un extra encore prévu. */
  const faiteEtExtra = [
    intention({ id: "f", title: "Déjà faite", status: "done", creeLe: "2026-09-01T08:00:00Z" }),
    intention({ id: "g", title: "Extra du soir", creeLe: "2026-09-09T19:00:00Z" }),
  ];
  verdict(
    "journée · la prochaine séance est celle qui reste à faire",
    prochaineSeanceDuJour(faiteEtExtra)?.title === "Extra du soir",
    prochaineSeanceDuJour(faiteEtExtra)?.title ?? "aucune",
  );

  verdict("journée · une journée vide n'a pas de principale", principale([]) === null, "null");
}

/* ── 9. Plus rien ne s'appuie sur `UNIQUE (user_id, date)` (V6b) ──────
   ⚠️ CE CONTRÔLE LIT LE SOURCE, ET C'EST VOLONTAIRE. La contrainte
   disparaît en base : un `on_conflict=user_id,date` oublié quelque part
   ne casserait pas le typecheck, il échouerait à l'exécution, sur une
   écriture, chez quelqu'un. Et `marquerIntention` par la date créditerait
   d'un coup la séance ET le supplément du même jour.                    */
{
  const source = readFileSync(new URL("../src/lib/planning.ts", import.meta.url), "utf8");
  const programme = readFileSync(new URL("../src/lib/programme.ts", import.meta.url), "utf8");

  const fautes: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const chemin = d + "/" + e.name;
      if (e.isDirectory()) { parcourir(chemin); continue; }
      if (!/[.]tsx?$/.test(e.name)) continue;
      const t = readFileSync(chemin, "utf8");
      /* On ne regarde que les fichiers qui écrivent DANS LES INTENTIONS :
         d'autres tables ont une unicité (user_id, date) parfaitement
         légitime (la pesée du jour, la présence), et elles la gardent. */
      if (t.includes("schemaIntentions") && /onConflict:\s*"user_id,date"/.test(t)) fautes.push(chemin);
    }
  };
  for (const d of ["src/lib", "src/app", "src/components", "src/context"]) parcourir(d);
  verdict(
    "V6b · plus aucun on_conflict sur (user_id, date) pour les intentions",
    fautes.length === 0,
    fautes.length ? fautes.join(", ") : "toutes les écritures désignent une ligne",
  );

  verdict(
    "V6b · consommerEtape ENREGISTRE le fait, il n'écrase plus la journée",
    programme.includes("await supabase.from(sc.table).insert({") && !programme.includes('onConflict: "user_id,date"'),
    "insert, plus d'upsert sur la date",
  );

  /* ── Le renvoi vers un modèle de la bibliothèque ──
     ⚠️ CE CONTRÔLE EXISTE PARCE QUE LE DÉFAUT A VÉCU TROIS MOIS SANS SE
     VOIR. `session_id` a une clé étrangère vers `custom_sessions` : y poser
     le slug d'une séance du catalogue fait refuser l'écriture par la base
     (23503 → 409), et « Ajouter à ma semaine » ne posait donc rien. Un test
     de fonction pure suffit à le tenir, sur une app pourtant auth-gated. */
  for (const [libelle, entree, attendu] of [
    ["une séance perso garde son renvoi", "custom-1785365610133", "custom-1785365610133"],
    ["un slug du catalogue n'en est pas un", "hiit", null],
    ["un slug composé non plus", "force-haut", null],
    ["rien reste rien", null, null],
  ] as [string, string | null, string | null][]) {
    verdict("V6b · session_id : " + libelle, refModele(entree) === attendu, String(refModele(entree)));
  }

  const ecran = readFileSync(new URL("../src/app/progression/page.tsx", import.meta.url), "utf8");
  verdict(
    "V6b · planifierSeance ne renvoie au modèle que pour une séance perso",
    ecran.includes("sessionId: s.perso ? s.id : null"),
    "le catalogue n'a pas de modèle en bibliothèque",
  );

  verdict(
    "V6b · dayToRow passe le renvoi par le garde-fou",
    source.includes("session_id: refModele(") && !source.includes("session_id: d.sessionId"),
    "aucun appelant ne peut réintroduire un renvoi dans le vide",
  );

  const corpsMarquer = source.slice(source.indexOf("export async function marquerIntention"));
  const corps = corpsMarquer.slice(0, corpsMarquer.indexOf("\n}"));
  verdict(
    "V6b · marquerIntention vise une intention, jamais une date",
    corps.includes('.eq("id", intentionId)') && !corps.includes('.eq("date"'),
    "cible = id",
  );
}

/* ── 8. V7A · le héros de la journée, et l'autorité unique de fin de séance ──
   Ce que ce bloc tient ne se voit ni au typecheck ni au build : ce sont
   des propriétés du CHEMIN (qui écrit, qui lit, qui crée), et ce sont
   exactement celles qui repasseraient inaperçues, puisqu'elles ne
   cassent rien et ne se constatent qu'en base. */
{
  const lire = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf8");
  const ecran = lire("src/app/progression/page.tsx");
  const hook = lire("src/hooks/useJournee.ts");
  const heros = lire("src/components/entrainement/HeroJournee.tsx");
  const lanceur = lire("src/context/WorkoutLaunchContext.tsx");
  const bienvenue = lire("src/components/bienvenue/ParcoursBienvenue.tsx");

  /* ── L'état de la journée, sur ses sept états ──
     La décision vivait dans un écran de 4 000 lignes derrière
     l'authentification, donc elle n'était vérifiable nulle part. */
  const seance = (over: Partial<PlanningDay> = {}): PlanningDay => ({
    id: "i1", date: "2026-09-06", type: "Force", title: "Push",
    difficulty: "Intermédiaire", location: null,
    exerciseList: [{ name: "Pompes", sets: 3, reps: "12 reps", rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] }],
    sessionId: null, status: "planned",
    ...over,
  });
  /* ⚠️ LA NATURE SE DÉDUIT DU LIBELLÉ, pas d'une colonne du modèle
     d'écran : c'est `natureDe` qui décide, et c'est exactement ce qu'on
     veut exercer ici. */
  const repos = (): PlanningDay => seance({ type: "Repos", title: "Repos", exerciseList: [] });
  const etapeBidon = { id: "e1", position: 1, nom: "Push", nature: "seance", dureeMin: null, origine: "systeme" };

  for (const [libelle, entree, attendu] of [
    ["on n'a pas encore lu", { pret: false, besoinSetup: false, jour: null, etape: etapeBidon }, "loading"],
    ["le questionnaire n'est pas fait", { pret: true, besoinSetup: true, jour: null, etape: null }, "setup"],
    ["une séance datée aujourd'hui", { pret: true, besoinSetup: false, jour: seance(), etape: etapeBidon }, "seance"],
    ["elle est faite", { pret: true, besoinSetup: false, jour: seance({ status: "done" }), etape: etapeBidon }, "done"],
    ["un repos posé", { pret: true, besoinSetup: false, jour: repos(), etape: etapeBidon }, "repos"],
    ["rien aujourd'hui, mais un programme", { pret: true, besoinSetup: false, jour: null, etape: etapeBidon }, "etape"],
    ["rien du tout", { pret: true, besoinSetup: false, jour: null, etape: null }, "libre"],
  ] as [string, Parameters<typeof etatJournee>[0], string][]) {
    verdict("V7A · état de la journée : " + libelle, etatJournee(entree) === attendu, etatJournee(entree));
  }

  /* ⚠️ LE CAS QUI COÛTERAIT LE PLUS CHER : une journée vide n'est PAS un
     repos. C'est la promesse de V5, et elle se rejoue ici parce que rien
     d'autre ne la tient. */
  verdict(
    "V7A · une journée sans ligne n'est jamais annoncée comme un repos",
    etatJournee({ pret: true, besoinSetup: false, jour: null, etape: null }) !== "repos",
    "libre",
  );

  /* ── Une seule autorité de fin de séance ── */
  verdict(
    "V7A · un seul tunnel : /progression n'en monte plus",
    !/<WorkoutGuideModal/.test(ecran) && /<WorkoutGuideModal/.test(lanceur),
    "le lecteur guidé vit dans WorkoutLaunchContext",
  );
  verdict(
    "V7A · le lanceur global referme ce que la séance referme",
    lanceur.includes("terminerSeance(") && lanceur.includes("onComplete="),
    "onComplete → terminerSeance",
  );
  /* ⚠️ ON BALAYE TOUT `src/`, ET PAS UNE LISTE ÉCRITE À LA MAIN.
     Première version, ce contrôle nommait trois fichiers : l'écran, le
     héros et le hook. Il les a bien tenus, et il a laissé passer
     `WeeklyProgramme`, qui montait son propre lecteur guidé et appelait
     `marquerIntention` lui-même depuis « Organiser » — c'est-à-dire la
     seconde autorité de fin de séance que toute la vague existe pour
     supprimer. Un contrôle qui énumère ses cibles ne protège que ce à
     quoi on a pensé ; celui-ci part des fichiers. */
  const fichiersSrc: string[] = [];
  (function parcourir(dir: string) {
    for (const e of readdirSync(new URL("../" + dir, import.meta.url), { withFileTypes: true })) {
      if (e.isDirectory()) parcourir(dir + "/" + e.name);
      else if (/\.tsx?$/.test(e.name)) fichiersSrc.push(dir + "/" + e.name);
    }
  })("src");

  const AUTORISES = ["src/lib/finSeance.ts", "src/lib/planning.ts", "src/lib/programme.ts"];
  const coupables = fichiersSrc.filter(
    (f) => !AUTORISES.includes(f) && /consommerEtape\(|marquerIntention\(/.test(lire(f)),
  );
  verdict(
    "V7A · personne d'autre que `finSeance` ne referme une séance",
    coupables.length === 0,
    coupables.length === 0 ? "une seule autorité dans tout src/" : coupables.join(", "),
  );
  void ecran; void heros; void hook;

  /* ── Ouvrir l'accueil ne crée aucune structure ──
     ⚠️ C'est la décision de V7A la plus facile à défaire sans s'en
     apercevoir : `getOrCreateProgramme` s'appelle exactement comme
     `lireProgrammeActif`, et l'écart ne se voit qu'en base. */
  verdict(
    "V7A · le hook ne crée un programme que si on l'y autorise",
    hook.includes("creerProgramme = false") && hook.includes("? await getOrCreateProgramme(") && hook.includes(": await lireProgrammeActif("),
    "creerProgramme ? créer : lire",
  );
  verdict(
    "V7A · le héros de l'accueil n'arme pas la création",
    /useJournee\(\)/.test(heros) && !heros.includes("creerProgramme"),
    "useJournee() sans option",
  );
  verdict(
    "V7A · seul Entraînement garde le repli de création",
    ecran.includes("useJournee({ creerProgramme: true })"),
    "repli des comptes plus anciens",
  );
  verdict(
    "V7A · le premier programme naît à la sortie du questionnaire",
    bienvenue.includes("getOrCreateProgramme("),
    "/bienvenue crée, l'accueil lit",
  );

  /* ── Le héros a bien changé d'écran ── */
  verdict(
    "V7A · le héros est monté sur l'accueil",
    lire("src/app/AccueilClient.tsx").includes("<HeroJournee />"),
    "AccueilClient → HeroJournee",
  );
  verdict(
    "V7A · il ne se dessine plus sur Entraînement",
    !ecran.includes("<TodayHero"),
    "un seul héros dans l'app",
  );

  /* ── Lire n'écrit toujours rien (V5), y compris par le nouveau chemin ── */
  verdict(
    "V7A · le hook de lecture n'écrit aucune intention",
    !/\.insert\(|\.upsert\(|\.delete\(|\.update\(/.test(hook),
    "aucune écriture dans useJournee",
  );
}

/* ── 9. V7A · CE QUI FAIT AVANCER LE CYCLE, ET CE QUI NE LE FAIT PAS ──
   Le défaut que ce bloc ferme : « Lui donner un jour » depuis l'état
   `etape` écrivait une séance ORDINAIRE. On la faisait, elle passait
   « faite », le cycle n'avançait pas, et le héros reproposait la même
   étape le lendemain, indéfiniment.

   La chaîne est jouée sur le VRAI code de bout en bout : ce que le geste
   fabrique (`intentionDeLEtape`), ce que la base recevrait
   (`lienProgramme`), ce que le curseur en déduit (`positionRefermee`) et
   quelle étape vient ensuite (`etapeSuivante`). */
{
  const cycle = etapesDuCycle(3)!.map((e, i) => ({ ...e, id: "etape-" + (i + 1) }));
  const enCours = cycle[0];                       // position 1, « Push »
  const T = "2026-09-06T18:00:00.000Z";

  /** Le journal d'après la séance, puis l'étape que le héros proposera. */
  const apres = (journal: { etapeId: string | null; resolue: boolean; consommeeLe: string | null }[]) =>
    etapeSuivante(cycle, positionRefermee(journal, cycle), POSITION_INITIALE)?.position ?? null;

  /* La ligne que `consommerEtape` écrit quand on lance l'étape sans date. */
  const faitDirect = { etapeId: enCours.id, resolue: true, consommeeLe: T };
  verdict(
    "V7A · prochaine étape libre → terminer → le cycle avance",
    apres([faitDirect]) === 2,
    "→ étape " + apres([faitDirect]),
  );

  /* « Lui donner un jour » : l'intention DATÉE doit porter son étape. */
  const reservee = intentionDeLEtape({
    date: "2026-09-11", programmeId: "prog-1",
    etape: { id: enCours.id, nom: enCours.nom },
    difficulty: "Intermédiaire", location: "salle",
    exerciseList: [{ name: "Pompes", sets: 3, reps: "12 reps", rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] }],
  });
  const lienReserve = lienProgramme(reservee);
  verdict(
    "V7A · dater l'étape écrit bien le lien vers le programme",
    lienReserve.programme_id === "prog-1"
      && lienReserve.etape_consommee_id === enCours.id
      && lienReserve.programme_seance_id === enCours.id,
    "programme + provenance + étape refermée",
  );
  /* Terminer cette intention : `marquerIntention` pose statut et
     `consommee_le`, la ligne garde son étape. */
  const faitDate = { etapeId: lienReserve.etape_consommee_id, resolue: true, consommeeLe: T };
  verdict(
    "V7A · étape datée via « Lui donner un jour » → terminer → le cycle avance",
    apres([faitDate]) === 2,
    "→ étape " + apres([faitDate]),
  );

  /* Déplacée : `saveDay` réécrit la ligne entière depuis le `PlanningDay`
     relu, donc le lien doit survivre au changement de date. C'est
     exactement ce que `rowToDay` rapatrie et ce que `dayToRow` réécrit. */
  const deplacee = { ...reservee, id: "int-1", date: "2026-09-12" };
  const lienDeplace = lienProgramme(deplacee);
  verdict(
    "V7A · déplacer l'étape datée ne perd pas son lien",
    lienDeplace.programme_id === "prog-1" && lienDeplace.etape_consommee_id === enCours.id,
    "le déplacement garde programme + étape",
  );
  const faitDeplace = { etapeId: lienDeplace.etape_consommee_id, resolue: true, consommeeLe: T };
  verdict(
    "V7A · étape datée puis déplacée → terminer → le cycle avance",
    apres([faitDeplace]) === 2,
    "→ étape " + apres([faitDeplace]),
  );

  /* ⚠️ ET CE QUI NE DOIT RIEN FAIRE AVANCER. Le titre ne décide de rien :
     un supplément appelé comme l'étape reste un supplément. */
  const supplement: PlanningDay = {
    id: "int-2", date: "2026-09-11", type: "Force", title: enCours.nom,
    difficulty: "Intermédiaire", location: "salle",
    exerciseList: [{ name: "Pompes", sets: 3, reps: "12 reps", rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] }],
    sessionId: null, status: "planned",
  };
  const lienSupp = lienProgramme(supplement);
  verdict(
    "V7A · un supplément du même jour ne déclare aucune étape",
    lienSupp.programme_id === null && lienSupp.etape_consommee_id === null,
    "aucun lien, malgré le même titre",
  );
  verdict(
    "V7A · supplément terminé → le cycle ne bouge pas",
    apres([{ etapeId: lienSupp.etape_consommee_id, resolue: true, consommeeLe: T }]) === 1,
    "→ toujours étape 1",
  );

  /* Une séance du catalogue posée normalement : même chose. */
  const catalogue: PlanningDay = { ...supplement, id: "int-3", title: "HIIT 20/10", type: "HIIT" };
  verdict(
    "V7A · séance du catalogue → le cycle ne bouge pas",
    apres([{ etapeId: lienProgramme(catalogue).etape_consommee_id, resolue: true, consommeeLe: T }]) === 1,
    "→ toujours étape 1",
  );

  /* Et une intention encore PRÉVUE ne referme rien : réserver n'est pas
     faire. Sans ça, dater l'étape la ferait avancer avant la séance. */
  verdict(
    "V7A · réserver l'étape ne la referme pas",
    apres([{ etapeId: lienReserve.etape_consommee_id, resolue: false, consommeeLe: null }]) === 1,
    "→ toujours étape 1 tant qu'elle n'est pas faite",
  );

  /* ── L'étape réservée pour plus tard, et lancée avant ──
     ⚠️ CE BLOC REJOUE UN DÉFAUT RÉEL, TROUVÉ LE 2026-09-06 SUR LA
     PRÉVERSION. Push était réservée pour le mardi 8. Le dimanche 6,
     l'accueil l'a présentée comme une étape LIBRE (« quand tu veux ») :
     il ne regarde que les intentions d'aujourd'hui, et `etapeSuivante`
     ne dérive son curseur que des étapes REFERMÉES, donc une réservation
     en attente est invisible aux deux. La terminer a INSÉRÉ une seconde
     ligne portant la même étape, et la base ne pouvait pas la refuser :
     `uniq_intention_par_etape` ne couvre que les intentions prévues, or
     la ligne insérée naît « faite ». Le banc, lui, joue sur des dates
     fixes : ce défaut ne se voyait que si la réservation tombait hors
     d'aujourd'hui, donc presque tous les jours. */
  const AUJ = "2026-09-06";                       // un dimanche
  const posee: PlanningDay = { ...reservee, id: "int-reserve", date: "2026-09-08" }; // mardi

  verdict(
    "V7A · étape libre → le héros dit « quand tu veux »",
    lancementDuJour({ jour: null, reservation: null, etape: enCours, instancePrete: true })?.genre === "etape",
    "aucune réservation → aucune date à annoncer",
  );
  verdict(
    "V7A · étape réservée dans 2 jours → le héros connaît sa date",
    libelleReservation(posee.date, AUJ) === "mardi 8"
      && libelleReservation("2026-09-07", AUJ) === "demain"
      && libelleReservation(AUJ, AUJ) === "aujourd’hui",
    libelleReservation(posee.date, AUJ),
  );

  const anticipe = lancementDuJour({ jour: null, reservation: posee, etape: enCours, instancePrete: true });
  verdict(
    "V7A · lancement anticipé → il vise l'intention existante, pas une nouvelle étape",
    anticipe?.genre === "intention" && anticipe.intention.id === "int-reserve",
    anticipe ? anticipe.genre : "rien",
  );
  verdict(
    "V7A · aucune seconde intention n'est créée pour une étape réservée",
    anticipe?.genre !== "etape",
    "la branche qui INSÈRE reste fermée tant qu'une réservation existe",
  );
  /* Et la fermeture de cette intention fait bien avancer le cycle une fois. */
  verdict(
    "V7A · réservation lancée en avance → terminer → le cycle avance d'une étape",
    apres([{ etapeId: lienProgramme(posee).etape_consommee_id, resolue: true, consommeeLe: T }]) === 2,
    "→ étape " + apres([{ etapeId: lienProgramme(posee).etape_consommee_id, resolue: true, consommeeLe: T }]),
  );
  /* Le supplément du même jour n'entre jamais dans cette décision : il ne
     porte aucune étape, donc il ne peut pas être pris pour la réservation. */
  verdict(
    "V7A · un supplément ne peut pas être pris pour la réservation de l'étape",
    lienProgramme(supplement).etape_consommee_id === null
      && lancementDuJour({ jour: null, reservation: null, etape: enCours, instancePrete: true })?.genre === "etape",
    "la réservation se cherche par l'étape, jamais par la journée",
  );

  /* ⚠️ ET LE GARDE-FOU RESTE, POUR UN APPELANT FUTUR OU UN ÉTAT PÉRIMÉ.
     Le chemin normal ne déclare plus `cible: etape` sur une étape
     réservée, mais rien n'empêche un écran resté sur une lecture d'il y
     a dix minutes de le faire. La défense vit dans l'autorité unique de
     fin de séance, donc elle couvre tous les lanceurs d'un coup. */
  const finSeance = readFileSync(new URL("../src/lib/finSeance.ts", import.meta.url), "utf8");
  const brancheEtape = finSeance.slice(finSeance.indexOf("} else {"));
  verdict(
    "V7A · terminerSeance refuse d'insérer si l'étape a déjà une réservation",
    brancheEtape.includes("reservationDeLEtape(")
      && brancheEtape.indexOf("reservationDeLEtape(") < brancheEtape.indexOf("consommerEtape("),
    "on cherche la réservation AVANT d'écrire",
  );
  verdict(
    "V7A · une séance faite est datée du jour où elle a eu lieu",
    finSeance.includes('marquerIntention(userId, cible.intentionId, "done", aujourdhui)')
      && readFileSync(new URL("../src/lib/planning.ts", import.meta.url), "utf8").includes("{ date: dateDuFait }"),
    "plus de séance « faite mardi » terminée un dimanche",
  );
  /* La correction est à sa SOURCE, pas seulement dans le garde-fou : la
     lecture de la journée doit connaître la réservation, et le héros doit
     la dire. Deux propriétés du chemin, donc deux contrôles de source. */
  verdict(
    "V7A · la source de journée connaît la réservation de l'étape suivante",
    readFileSync(new URL("../src/hooks/useJournee.ts", import.meta.url), "utf8")
      .includes("reservationDeLEtape(user.id, suivante.id)"),
    "elle la cherche en base, pas dans la semaine chargée",
  );
  verdict(
    "V7A · le héros annonce le jour de l'étape au lieu de « quand tu veux »",
    readFileSync(new URL("../src/components/entrainement/TodayHero.tsx", import.meta.url), "utf8")
      .includes('{reserveLe ?? "Quand tu veux"}'),
    "« quand tu veux » ne reste vrai que sans réservation",
  );

  /* ── L'ÉTAT `done` : « REFAIRE LA SÉANCE » REFAIT LA SÉANCE ──
     ⚠️ CE BLOC FERME UN DÉFAUT SIGNALÉ PAR LOUIS LE 2026-09-06. Le
     bouton de l'état `done` partageait `onStart` avec les autres états,
     donc il passait par `lancementDuJour`, c'est-à-dire par la
     résolution de la PROCHAINE action : il annonçait la séance qu'on
     vient de terminer et en lançait une autre. Le mode d'échec dépendait
     des données, ce qui est le pire des deux : une séance faite qui
     porte encore ses exercices était bien relancée, mais AVEC SA CIBLE,
     donc la terminer refermait une seconde fois une étape déjà refermée
     (`date` et `consommee_le` du fait d'origine réécrits) ; une séance
     faite sans contenu tombait jusqu'à l'étape suivante et lançait Pull
     sous un bouton qui promettait Push.

     Le cycle joué ici est celui de cinq étapes, pour que « la prochaine
     étape reste Pull » veuille dire exactement ça. */
  const cycle5 = etapesDuCycle(5)!.map((e, i) => ({ ...e, id: "e5-" + (i + 1) }));
  const push5 = cycle5[0];
  const T5 = "2026-09-06T19:06:54.063Z";
  const suivante5 = (journal: { etapeId: string | null; resolue: boolean; consommeeLe: string | null }[]) =>
    etapeSuivante(cycle5, positionRefermee(journal, cycle5), POSITION_INITIALE);

  /* La séance du jour, terminée : la ligne porte son étape ET son
     contenu, comme celle d'une vraie séance faite depuis l'accueil. */
  const pushFaite: PlanningDay = {
    ...intentionDeLEtape({
      date: "2026-09-06", programmeId: "prog-5",
      etape: { id: push5.id, nom: push5.nom },
      difficulty: "Intermédiaire", location: "poids",
      exerciseList: [{ name: "Pompes diamant", sets: 3, reps: "15", rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] }],
    }),
    id: "int-push-faite", status: "done",
  };
  /* Le journal après la vraie séance : UNE consommation de Push. */
  const journalPush = [{ etapeId: lienProgramme(pushFaite).etape_consommee_id, resolue: true, consommeeLe: T5 }];

  const refaite = repetitionDuJour(pushFaite);
  verdict(
    "V7A · done → « Refaire la séance » relance le contenu terminé",
    refaite?.id === pushFaite.id
      && refaite?.title === push5.nom
      /* La MÊME liste d'exercices, pas une liste équivalente : c'est ce
         qui distingue « refaire cette séance » de « refaire une séance
         qui lui ressemble ». */
      && refaite?.exerciseList === pushFaite.exerciseList,
    refaite ? refaite.title + " · le même contenu, " + refaite.exerciseList.length + " exercice(s)" : "rien",
  );
  verdict(
    "V7A · rien à refaire tant que la séance n'est pas terminée",
    repetitionDuJour({ ...pushFaite, status: "planned" }) === null
      && repetitionDuJour({ ...pushFaite, exerciseList: [] }) === null
      && repetitionDuJour(null) === null,
    "ni une séance prévue, ni une ligne sans contenu",
  );

  /* ⚠️ ET C'EST UNE PROPRIÉTÉ DU CHEMIN, DONC ELLE SE LIT DANS LA SOURCE.
     Le défaut ne venait pas d'un mauvais calcul mais d'un mauvais
     câblage : le bouton posait la question de la prochaine action. */
  const heroDone = readFileSync(new URL("../src/components/entrainement/TodayHero.tsx", import.meta.url), "utf8");
  const heroJournee = readFileSync(new URL("../src/components/entrainement/HeroJournee.tsx", import.meta.url), "utf8");
  const journee = readFileSync(new URL("../src/hooks/useJournee.ts", import.meta.url), "utf8");
  verdict(
    "V7A · « Refaire la séance » a sa propre action, pas celle du héros",
    /onClick=\{onRedo\}[\s\S]*Refaire la séance/.test(heroDone)
      && heroJournee.includes("onRedo={j.refaire}")
      && journee.includes("repetitionDuJour(jour)"),
    "le bouton ne passe plus par `lancementDuJour`",
  );
  verdict(
    "V7A · la répétition ne déclare aucune cible → aucun doublon de consommation",
    journee.includes("!options?.repetition && d.id ? { genre: \"intention\", intentionId: d.id } : undefined")
      && journalPush.filter((f) => f.etapeId === push5.id).length === 1,
    "sans cible, la fin de séance n'écrit rien dans les intentions",
  );

  /* Et la conséquence, sur le vrai curseur : refaire ne rejoue pas le
     fait. Le journal ne gagne aucune ligne portant une étape, donc la
     position refermée ne bouge pas d'un cran. */
  verdict(
    "V7A · cycle inchangé après cette répétition",
    positionRefermee(journalPush, cycle5) === 1
      && suivante5(journalPush)?.position === 2,
    "→ toujours refermée à l'étape " + positionRefermee(journalPush, cycle5),
  );
  verdict(
    "V7A · après avoir refait Push, la prochaine étape reste Pull",
    suivante5(journalPush)?.nom === "Pull",
    "→ " + (suivante5(journalPush)?.nom ?? "rien"),
  );

  /* ── Une fermeture par lancement ──
     ⚠️ ON NE S'EN REMET PAS À « React ne devrait rappeler `onComplete`
     qu'une fois ». Pour une étape, la fermeture est un `insert` : rejouée,
     elle écrirait une seconde séance sur la journée. */
  const dejaFerme = verrouDeFermeture();
  const lancement = { sessionId: "etape-1" };
  const autre = { sessionId: "etape-2" };
  verdict(
    "V7A · double callback du même lancement → une seule fermeture",
    dejaFerme(lancement) === true && dejaFerme(lancement) === false,
    "la seconde est refusée",
  );
  verdict(
    "V7A · un autre lancement referme normalement",
    dejaFerme(autre) === true,
    "le verrou porte sur le lancement, pas sur la cible",
  );

  /* Le contrat d'écriture : les trois colonnes vont ensemble ou pas du
     tout (FK composites + deux CHECK en base). */
  verdict(
    "V7A · une étape sans son programme n'est jamais écrite seule",
    lienProgramme({ programmeId: null, etapeId: "etape-1" }).etape_consommee_id === null
      && lienProgramme({ programmeId: "prog-1", etapeId: null }).programme_id === null,
    "les deux, ou aucun",
  );
  verdict(
    "V7A · le lien s'écrit TOUJOURS, même à null",
    ["programme_id", "programme_seance_id", "etape_consommee_id"]
      .every((c) => c in lienProgramme({ programmeId: null, etapeId: null })),
    "un remplacement ne peut pas hériter d'une étape",
  );
  verdict(
    "V7A · dayToRow passe par le lien, il ne le recompose pas",
    readFileSync(new URL("../src/lib/planning.ts", import.meta.url), "utf8").includes("...lienProgramme(d)"),
    "une seule règle d'écriture du lien",
  );
}

/* ── 10. V7A · LE SÉLECTEUR DE JOUR PROPOSE DE VRAIS JOURS FUTURS ─────
   Le défaut, signalé un DIMANCHE : « Quel jour ? » déroulait la semaine
   CIVILE (`weekDates()`, lundi → dimanche de la semaine en cours) puis
   grisait tout ce qui est passé. Le samedi il restait deux jours, le
   dimanche UN SEUL, et dater sa prochaine étape devenait impossible.
   C'est le genre de défaut qui ne se voit qu'un jour sur sept. */
{
  /* Le défaut, reproduit sur une date fixe : le 2026-09-06 est un
     dimanche, et la semaine civile n'y offre plus qu'une seule case. */
  const dimanche = "2026-09-06";
  const semaineCivile = weekDates(new Date(dimanche + "T00:00:00"));
  verdict(
    "V7A · le défaut : un dimanche, la semaine civile n'offre qu'un jour",
    semaineCivile.filter((d) => d >= dimanche).length === 1,
    semaineCivile.filter((d) => d >= dimanche).length + " case(s) choisissable(s)",
  );

  const fenetre = prochainsJours(15);
  const aujourdhui = todayYmd();
  verdict(
    "V7A · la fenêtre commence aujourd'hui et n'offre aucun jour passé",
    fenetre.length === 15 && fenetre[0] === aujourdhui && fenetre.every((d) => d >= aujourdhui),
    fenetre[0] + " → " + fenetre[14],
  );
  verdict(
    "V7A · elle est strictement croissante, sans doublon",
    fenetre.every((d, i) => i === 0 || d > fenetre[i - 1]),
    "15 jours distincts et ordonnés",
  );
  /* ⚠️ LA PROPRIÉTÉ QUI COMPTE, ET ELLE VAUT N'IMPORTE QUEL JOUR DE LA
     SEMAINE : la fenêtre déborde toujours la semaine courante, donc la
     semaine prochaine est TOUJOURS atteignable. */
  const finDeSemaine = weekDates()[6];
  verdict(
    "V7A · la semaine prochaine est toujours atteignable",
    fenetre.filter((d) => d > finDeSemaine).length >= 7,
    fenetre.filter((d) => d > finDeSemaine).length + " jour(s) au-delà de dimanche",
  );

  /* ⚠️ ON LIT LE CODE, PAS LES COMMENTAIRES. Ce fichier EXPLIQUE le défaut
     qu'il corrige, donc il cite `weekDates()` en toutes lettres : chercher
     la chaîne brute ferait échouer le contrôle sur sa propre explication. */
  const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const picker = sansCommentaires(
    readFileSync(new URL("../src/components/entrainement/ChoixJour.tsx", import.meta.url), "utf8"),
  );
  verdict(
    "V7A · le sélecteur ne déroule plus la semaine civile",
    !picker.includes("weekDates(") && picker.includes("prochainsJours("),
    "fenêtre glissante depuis aujourd'hui",
  );
  verdict(
    "V7A · plus aucune ligne grisée : ce qui est proposé est choisissable",
    !picker.includes("disabled"),
    "aucun jour mort dans la liste",
  );
  /* ⚠️ IL LIT SA PROPRE FENÊTRE. Les écrans ne connaissent que la semaine
     courante : recevoir `week` lui ferait affirmer « Rien de prévu » sur
     des journées qu'il n'a jamais lues. */
  verdict(
    "V7A · le sélecteur lit lui-même les journées qu'il montre",
    picker.includes("fetchRange(") && !picker.includes("week:"),
    "une requête sur exactement les dates montrées",
  );
  verdict(
    "V7A · il ne dit jamais « rien de prévu » avant d'avoir lu",
    picker.includes("parJour === null"),
    "« je ne sais pas » n'est pas « il n'y a rien »",
  );
  /* Une seule source pour les deux appelants. */
  const appelants = ["src/app/progression/page.tsx", "src/components/entrainement/HeroJournee.tsx"]
    .filter((f) => readFileSync(new URL("../" + f, import.meta.url), "utf8").includes("<ChoixJour "));
  verdict(
    "V7A · le héros et le menu d'une séance partagent le même sélecteur",
    appelants.length === 2,
    appelants.length + " appelant(s) de <ChoixJour>",
  );
  /* ⚠️ ET LA RÉSERVATION SE CHERCHE EN BASE, PAS DANS LA SEMAINE CHARGÉE :
     une étape datée la semaine prochaine est hors de tout ce que l'écran
     a lu, donc la chercher là rendrait le défaut intermittent. */
  verdict(
    "V7A · redonner un jour retrouve la réservation où qu'elle soit",
    readFileSync(new URL("../src/hooks/useJournee.ts", import.meta.url), "utf8").includes("reservationDeLEtape("),
    "la clé de l'invariant, interrogée en base",
  );
}

console.log("\n" + (echecs === 0 ? "Tout passe." : echecs + " échec(s)."));
process.exit(echecs === 0 ? 0 : 1);
