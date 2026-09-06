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
import { etapesDuCycle, etapeSuivante, nomDeProgramme, POSITION_INITIALE } from "@/lib/programme";
import { etatJournee } from "@/lib/journee";
import {
  cycleDeReference, seancesDuCycle, previewWeek, weekDates, ANCIEN, NOUVEAU,
  ordonner, parDate, principale, supplements, seancesDuJour, prochaineSeanceDuJour,
  refModele,
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
  for (const [libelle, fichier, contenu] of [
    ["l'écran Entraînement", "src/app/progression/page.tsx", ecran],
    ["le héros de l'accueil", "src/components/entrainement/HeroJournee.tsx", heros],
    ["le hook de lecture", "src/hooks/useJournee.ts", hook],
  ] as [string, string, string][]) {
    void fichier;
    verdict(
      "V7A · " + libelle + " ne referme rien lui-même",
      !contenu.includes("consommerEtape(") && !contenu.includes("marquerIntention("),
      "aucune écriture de fin de séance",
    );
  }

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

console.log("\n" + (echecs === 0 ? "Tout passe." : echecs + " échec(s)."));
process.exit(echecs === 0 ? 0 : 1);
