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
  etatDepuisExp, missionsAuraVides,
  MISSIONS, MISSIONS_JOUR, MISSIONS_PREMIUM, MISSIONS_PREMIUM_SEMAINE, MISSIONS_SEMAINE,
  type EtatAura, type MissionId,
} from "@/lib/aura";
import {
  actionRestante, apercuPremiumDuJour, compteMissionsJour,
  marqueursDuJour, missionDebloquee, MARQUEURS,
} from "@/lib/missionsAccueil";
import {
  cycleDeReference, seancesDuCycle, previewWeek, weekDates, ANCIEN, NOUVEAU,
  ordonner, parDate, principale, supplements, seancesDuJour, prochaineSeanceDuJour,
  refModele, lienProgramme, prochainsJours, todayYmd,
  cibleRemplacable, estMobilier,
  type PlanningDay, type CycleSemaine,
} from "@/lib/planning";
import {
  consequenceDeplacement, consequencePose, consequenceRetrait, consequenceSemaine,
  etapeParNom, resoudreCibles,
} from "@/lib/gestePlanning";
import { ASSISTANT_TOOLS } from "@/lib/assistantTools";
import {
  etatMoteur, invaliderMoteur, resumeMoteur, TTL_MOTEUR_MS,
  type EtatMoteur, type SeanceMoteur,
} from "@/lib/guideMoteur";
import {
  etatNutrition, invaliderNutrition, repasFrais, semaineFraiche,
  MAX_REPAS, TTL_NUTRITION_MS, EVT_NUTRITION,
  type EtatNutrition, type JourNutrition, type RepasDetail,
} from "@/lib/guideNutrition";
import {
  adaptationActive, ajouterJours, chevauchent, datesEntre, estExpiree, etapeMasquee,
  etapesCompatibles, finParDefaut, idsMasques, libelleJour, REEVALUATION_SEMAINES,
  reservationsEnConflit, validerAxes, validerPeriode,
  type Adaptation,
} from "@/lib/adaptation";

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

  /* ⚠️ LA PROVENANCE SANS LA RÉSERVATION : LES DEUX COLONNES DE V4 SONT
     ENFIN TOUTES LES DEUX ÉCRITES (2026-09-08). Une séance composée par
     « Refais ma semaine » vient d'une étape, mais elle n'en referme
     aucune : la base l'accepte (`intentions_provenance_check` ne demande
     que le programme), elle échappe à `uniq_intention_par_etape`, et le
     curseur ne bouge pas d'un cran. */
  const regeneree: PlanningDay = {
    ...supplement, id: "int-4",
    programmeId: "prog-1", provenanceId: enCours.id, etapeId: null,
  };
  const lienRegen = lienProgramme(regeneree);
  verdict(
    "V8 · une séance régénérée déclare sa provenance sans refermer l'étape",
    lienRegen.programme_id === "prog-1"
      && lienRegen.programme_seance_id === enCours.id
      && lienRegen.etape_consommee_id === null,
    "provenance oui, consommation non",
  );
  verdict(
    "V8 · … donc terminer une séance régénérée ne fait PAS avancer le cycle",
    apres([{ etapeId: lienRegen.etape_consommee_id, resolue: true, consommeeLe: T }]) === 1,
    "→ toujours étape 1",
  );
  verdict(
    "V8 · une provenance sans programme n'écrit rien du tout",
    lienProgramme({ ...regeneree, programmeId: null }).programme_seance_id === null,
    "les deux ou aucun : la clé étrangère est composite",
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


/* ════════════════════════════════════════════════════════════════════
   V7B · L'ACCUEIL RÉPOND À LA JOURNÉE

   Ce que ces contrôles verrouillent, et pourquoi : la vague a déplacé des
   missions et fusionné deux blocs, donc les régressions possibles sont des
   régressions de PROVENANCE (qui compte quoi, qui lit quoi, qui reste
   visible où). Elles ne cassent rien et ne se voient qu'en regardant très
   précisément le bon écran, c'est-à-dire jamais.
   ════════════════════════════════════════════════════════════════════ */
{
  const lire = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  /* ⚠️ ON LIT LE CODE, PAS LES COMMENTAIRES. Les fichiers de cette vague
     EXPLIQUENT ce qu'ils refusent de faire, donc ils citent en toutes
     lettres les chaînes qu'on cherche justement à interdire. */
  const net = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const ACCUEIL = net(lire("src/components/AccueilSignature.tsx"));
  const JOURNEE = net(lire("src/components/accueil/MaJournee.tsx"));
  const FEUILLE = net(lire("src/components/accueil/FeuilleMissions.tsx"));
  const REGLES = net(lire("src/lib/missionsAccueil.ts"));
  const PROFIL = net(lire("src/app/profil/page.tsx"));
  const OFFRE = net(lire("src/app/premium/InfosPremium.tsx"));
  const NEUFS = [JOURNEE, FEUILLE, REGLES, ACCUEIL];

  /** Une aura fabriquée, où seules les missions nommées sont remplies. */
  const auraAvec = (faites: MissionId[]): EtatAura => {
    const missions = missionsAuraVides();
    for (const id of faites) {
      missions[id] = { ...missions[id], progress: missions[id].target, complete: true, earned: true };
    }
    return etatDepuisExp(0, undefined, missions);
  };

  /* ── Le compteur vient de l'évaluation existante, pas d'un second
        moteur. `aura.missions` est ce que rend `etat_missions_aura` : le
        seul vrai risque de cette vague était de recompter les séances dans
        un composant, ce qui rouvrirait l'écart entre le chiffre affiché et
        le chiffre crédité, fermé le 2026-08-21. ── */
  verdict(
    "V7B · le compteur du jour est le catalogue, pas un 4 écrit à la main",
    compteMissionsJour(auraAvec([])).total === MISSIONS_JOUR.length,
    "dénominateur = " + MISSIONS_JOUR.length + " missions du jour",
  );
  verdict(
    "V7B · il compte ce que la base a évalué",
    compteMissionsJour(auraAvec(["connexion"])).fait === 1 &&
      compteMissionsJour(auraAvec(["connexion", "seance"])).fait === 2 &&
      compteMissionsJour(auraAvec(["connexion", "seance", "repas", "journee"])).fait === 4,
    "0 → 1 → 2 → 4, lus dans `complete`",
  );
  verdict(
    "V7B · aucun second moteur de missions dans les composants",
    NEUFS.every((t) => !t.includes("supabase") && !t.includes("workout_sessions") && !t.includes(".rpc(")),
    "ni requête ni recomptage",
  );

  /* ── Les marqueurs. « Présence » et jamais « Venu » ; trois et pas
        quatre, parce que « Journée complète » se remplit toute seule. ── */
  const marques = marqueursDuJour(auraAvec(["connexion", "repas"]));
  verdict(
    "V7B · trois marqueurs, et « Journée complète » n'en est pas un",
    marques.length === 3 && !marques.some((m) => m.id === "journee") && MARQUEURS.length === 3,
    marques.map((m) => m.libelle).join(" · "),
  );
  verdict(
    "V7B · « Présence », jamais « Venu »",
    marques[0].libelle === "Présence" && NEUFS.every((t) => !/\bVenu\b/.test(t)),
    "le mot dit un état, pas un exploit",
  );
  verdict(
    "V7B · un marqueur suit la mission qu'il nomme",
    marques[0].acquis && !marques[1].acquis && marques[2].acquis,
    "Présence ✓ · Séance ○ · Repas ✓",
  );

  /* ── L'action ne duplique jamais le héros. C'est la règle produit la
        plus facile à défaire sans s'en apercevoir : reproposer la séance
        ici, ce serait deux fois le même chemin à cent pixels d'écart. ── */
  verdict(
    "V7B · l'action restante ne propose jamais la séance du héros",
    actionRestante(auraAvec([]))?.id === "repas" &&
      actionRestante(auraAvec(["connexion"]))?.id === "repas",
    "seul « Noter un repas » a le droit de devenir une action",
  );
  verdict(
    "V7B · plus rien à proposer quand le repas est noté",
    actionRestante(auraAvec(["repas"])) === null,
    "aucune ligne d'action",
  );
  verdict(
    "V7B · la connexion reste un état, jamais une action",
    actionRestante(auraAvec([]))?.id !== "connexion",
    "on ne demande pas d'ouvrir l'app qu'on vient d'ouvrir",
  );

  /* ── La rotation Premium. Un `Math.random()` changerait la mission entre
        le rendu serveur et le rendu client : React signalerait un écart
        d'hydratation et la ligne bougerait sous les yeux. ── */
  const jours = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"];
  const tires = jours.map((j) => apercuPremiumDuJour(j)?.id);
  verdict(
    "V7B · la mission Premium du jour est stable pour une même date",
    apercuPremiumDuJour(jours[0])?.id === tires[0] &&
      apercuPremiumDuJour(jours[3])?.id === tires[3],
    "même date → même mission, appel après appel",
  );
  verdict(
    "V7B · elle tourne, et les quatre passent en quatre jours",
    new Set(tires).size === MISSIONS_PREMIUM.length,
    tires.join(" → "),
  );
  {
    let toutes = true;
    for (let i = 0; i < 60; i++) {
      const jour = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
      const m = apercuPremiumDuJour(jour);
      if (!m || !MISSIONS_PREMIUM.includes(m)) toutes = false;
    }
    verdict(
      "V7B · sur 60 jours, elle sort toujours du catalogue Premium",
      toutes && !REGLES.includes("Math.random"),
      "déterministe, jamais tirée au sort",
    );
  }

  /* ── L'entitlement. Un abonné ne doit JAMAIS voir sa propre mission
        présentée comme inaccessible : ce serait lui vendre ce qu'il paie. ── */
  const premiumJour = MISSIONS_PREMIUM[0];
  const gratuiteJour = MISSIONS_JOUR[0];
  verdict(
    "V7B · non-Premium : la mission Premium est verrouillée",
    missionDebloquee(premiumJour, false) === false,
    premiumJour.titre + " → cadenas",
  );
  verdict(
    "V7B · Premium : sa propre mission n'est jamais verrouillée",
    missionDebloquee(premiumJour, true) === true,
    premiumJour.titre + " → simplement une mission",
  );
  verdict(
    "V7B · une mission gratuite n'est verrouillée pour personne",
    missionDebloquee(gratuiteJour, false) === true,
    gratuiteJour.titre,
  );

  /* ── La feuille porte le catalogue entier : 4 + 4 + 3. ── */
  verdict(
    "V7B · la feuille = 4 du jour + 4 Premium + 3 de la semaine",
    MISSIONS_JOUR.length === 4 && MISSIONS_PREMIUM.length === 4 && MISSIONS_SEMAINE.length === 3,
    MISSIONS_JOUR.length + " + " + MISSIONS_PREMIUM.length + " + " + MISSIONS_SEMAINE.length,
  );
  verdict(
    "V7B · et elle rend les trois listes du catalogue",
    ["MISSIONS_JOUR", "MISSIONS_PREMIUM", "MISSIONS_SEMAINE"].every((c) => FEUILLE.includes(c)),
    "les trois constantes, jamais une liste recopiée",
  );
  verdict(
    "V7B · c'est une feuille, pas un accordéon qui rallonge l'accueil",
    FEUILLE.includes("Sheet") && ACCUEIL.includes("FeuilleMissions"),
    "le composant `Sheet` partagé, ouvert depuis l'accueil",
  );

  /* ── Le Guide. Son visage est là même quand il se tait, et V7B ne lui
        donne aucun déclencheur métier nouveau. ── */
  verdict(
    "V7B · Nora ou Sasha reste visible même sans message",
    ACCUEIL.includes('etat={moment?.etat ?? "welcome"}'),
    "c'est la PHRASE qui est conditionnelle, pas la présence",
  );
  verdict(
    "V7B · toute la zone ouvre le vrai Assistant, jamais un second chat",
    ACCUEIL.includes("useAssistant()") && !ACCUEIL.includes("sendMessage("),
    "`open()` sur la feuille globale",
  );
  {
    const moments = net(lire("src/lib/momentAccueil.ts"));
    const cles = ["absence.longue", "absence.courte", "debut", "palier", "serie", "jour"];
    verdict(
      "V7B · aucun déclencheur métier nouveau pour le Guide",
      cles.every((c) => moments.includes(c)) && NEUFS.every((t) => !t.includes("momentAccueil(")),
      "les six moments existants, et rien de plus",
    );
  }

  /* ── Le héros de V7A n'est pas touché : l'accueil lui donne sa place, il
        ne le fabrique pas et ne juge rien à sa place. ── */
  verdict(
    "V7B · l'accueil ne touche pas au moteur du héros",
    ACCUEIL.includes("{heros}") &&
      NEUFS.every((t) => !t.includes("lancementDuJour") && !t.includes("etatJournee") && !t.includes("terminerSeance")),
    "le héros arrive en prop, comme en V7A",
  );
  verdict(
    "V7B · aucune logique « séance ratée » ajoutée",
    NEUFS.every((t) => !t.includes("seanceNonFaite") && !t.includes("intentions_entrainement")),
    "un cercle vide n'est pas un reproche",
  );

  /* ── Un seul affichage principal d'EXP. L'ancien écran écrivait « EXP »
        quinze fois ; il ne reste que la ligne du rang, la mission Premium
        du jour portant son propre gain via le composant partagé. ── */
  verdict(
    "V7B · un seul affichage d'EXP sur l'accueil lui-même",
    (ACCUEIL.match(/EXP/g) ?? []).length === 1 && !ACCUEIL.includes("PLAFOND_JOUR_"),
    "la ligne « où j'en suis », et rien d'autre",
  );
  verdict(
    "V7B · l'accueil ne liste plus aucune famille de missions",
    !ACCUEIL.includes("MISSIONS_") && !ACCUEIL.includes("premiumVault") && !ACCUEIL.includes("poster"),
    "ni liste du jour, ni semaine, ni coffre, ni affiche Premium",
  );

  /* ── ⚠️ LE CACHE D'EXP NE VAUT PAS UNE ÉVALUATION DES MISSIONS. Le cache
        localStorage de l'accueil ne garde QUE l'EXP : rendre « Ma journée »
        dessus afficherait « 0 / 4 » et « Noter un repas » à quelqu'un qui
        vient de le noter, le temps d'un aller-retour. Le défaut clignoterait
        une demi-seconde, donc personne ne le signalerait jamais. ── */
  {
    const CLIENT = net(lire("src/app/AccueilClient.tsx"));
    verdict(
      "V7B · « Ma journée » attend la vraie évaluation, pas le cache d'EXP",
      ACCUEIL.includes("{missionsLues && (") && !ACCUEIL.includes("{auraLoaded && ("),
      "le groupe est gardé par `missionsLues`",
    );
    verdict(
      "V7B · et ce drapeau ne se lève que sur la réponse de la base",
      (CLIENT.match(/setMissionsLues\(true\)/g) ?? []).length === 1 &&
        CLIENT.indexOf("setMissionsLues(true)") > CLIENT.indexOf("calculerAura("),
      "un seul point de levée, dans le `then` de calculerAura",
    );
  }

  /* ── Les atterrissages. Une mission qui crédite sans s'afficher est un
        bonus caché : c'est la règle du catalogue lui-même. Il n'en reste
        donc que DEUX, et c'est la correction du 2026-09-07 : Profil ›
        Progrès a rendu les trois hebdomadaires (elles y avaient été
        posées la veille), la feuille « Voir tout » les porte déjà, et
        deux endroits pour la même liste, c'est un de trop. ── */
  verdict(
    "V7B · Profil › Progrès ne porte plus aucune mission",
    !PROFIL.includes("MISSIONS_") && !PROFIL.includes("LigneMission"),
    "constance, historique, progression, et rien d'autre",
  );
  verdict(
    "V7B · la feuille reste le seul accès quotidien aux hebdomadaires",
    FEUILLE.includes("MISSIONS_SEMAINE"),
    "à un geste de l'accueil, jamais deux listes à tenir d'accord",
  );

  /* ── /premium montre CINQ missions Premium, pas quatre, et la cinquième
        est hebdomadaire. L'oublier laissait une mission qui crédite sans
        jamais se montrer là où on l'achète. ── */
  const premiums = MISSIONS.filter((m) => m.premium);
  verdict(
    "V7B · le catalogue compte cinq missions Premium, quatre + une",
    premiums.length === MISSIONS_PREMIUM.length + MISSIONS_PREMIUM_SEMAINE.length &&
      MISSIONS_PREMIUM_SEMAINE.length === 1,
    premiums.map((m) => m.titre).join(" · "),
  );
  verdict(
    "V7B · /premium rend les deux familles depuis le catalogue",
    OFFRE.includes("MISSIONS_PREMIUM.map") &&
      OFFRE.includes("MISSIONS_PREMIUM_SEMAINE.map") &&
      OFFRE.includes("LigneMission"),
    "les quotidiennes et l'hebdomadaire, jamais une liste recopiée",
  );
  verdict(
    "V7B · l'hebdomadaire n'entre pas dans le total « par jour »",
    MISSIONS_PREMIUM.every((m) => m.periode === "jour") &&
      MISSIONS_PREMIUM_SEMAINE.every((m) => m.periode === "semaine") &&
      OFFRE.includes("MISSIONS_PREMIUM_SEMAINE.reduce"),
    "deux totaux séparés, +X / jour et +Y / semaine",
  );

  /* ── Et rien ne se perd en route : les trois familles rendues par la
        feuille SONT le catalogue entier. Une mission ajoutée à `MISSIONS`
        sans période exploitable disparaîtrait de tous les écrans. ── */
  {
    const rendues = [...MISSIONS_JOUR, ...MISSIONS_PREMIUM, ...MISSIONS_SEMAINE];
    verdict(
      "V7B · les trois listes de la feuille couvrent tout le catalogue",
      rendues.length === MISSIONS.length &&
        MISSIONS.every((m) => rendues.includes(m)),
      rendues.length + " missions sur " + MISSIONS.length,
    );
  }

  verdict(
    "V7B · une seule écriture de la ligne de mission dans tout le produit",
    [
      "src/components/accueil/FeuilleMissions.tsx",
      "src/components/accueil/MaJournee.tsx",
      "src/app/premium/InfosPremium.tsx",
    ].every((f) => lire(f).includes("@/components/missions/LigneMission")),
    "trois surfaces, un seul composant",
  );
}


/* ════════════════════════════════════════════════════════════════════
   V8 · LES ADAPTATIONS TEMPORAIRES

   ⚠️ CE QUE CE BLOC PROTÈGE N'EST PAS UN AFFICHAGE, C'EST UNE
   SÉMANTIQUE. « Éviter » n'est pas « sauter » : une étape masquée ne
   doit RIEN consommer, ne rien écrire, et ne pas faire bouger le
   curseur d'un cran. Si quelqu'un « simplifie » un jour en refermant
   l'étape masquée, l'app continuera de fonctionner, l'écran continuera
   d'avoir l'air juste, et l'historique dira qu'une séance a eu lieu
   alors qu'elle n'a jamais eu lieu. C'est exactement le genre de
   régression qui ne se voit qu'en base, des mois plus tard.
   ════════════════════════════════════════════════════════════════════ */
{
  const lireV8 = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  const netV8 = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const ADAPTATION = lireV8("src/lib/adaptation.ts");
  const MIGRATION = lireV8("supabase/migrations/20260907_moteur_v8_adaptations.sql");

  /* Le cycle du scénario de l'audit. */
  const CYCLE = [
    { id: "e-push", position: 1, nom: "Push" },
    { id: "e-pull", position: 2, nom: "Pull" },
    { id: "e-bas", position: 3, nom: "Bas du corps" },
    { id: "e-haut", position: 4, nom: "Haut du corps" },
    { id: "e-cardio", position: 5, nom: "Cardio / HIIT" },
  ];
  const couche = (etapes: string[], debut = "2026-09-07", fin = "2026-09-16"): Adaptation => ({
    id: "a1", userId: "u1", programmeId: "p1", debut, fin,
    statut: "active", motif: null, axes: { eviter_etapes: etapes },
    axesVersion: 1, origine: "utilisateur", fermeeLe: null,
  });

  /* ── 1. Le vocabulaire est FERMÉ, et il refuse au lieu de corriger ── */
  for (const [libelle, brut, attenduOk] of [
    ["une étape du cycle", { eviter_etapes: ["e-push"] }, true],
    ["deux étapes du cycle", { eviter_etapes: ["e-push", "e-haut"] }, true],
    ["un axe inconnu", { duree_max_min: 30 }, false],
    ["un axe inconnu à côté d’un axe valide", { eviter_etapes: ["e-push"], seances_max: 2 }, false],
    ["un tableau vide", { eviter_etapes: [] }, false],
    ["un doublon", { eviter_etapes: ["e-push", "e-push"] }, false],
    ["une étape d’un autre programme", { eviter_etapes: ["e-inconnue"] }, false],
    ["un NOM d’étape au lieu d’un identifiant", { eviter_etapes: ["Push"] }, false],
    ["autre chose qu’un objet", ["e-push"], false],
    ["rien du tout", {}, false],
  ] as [string, unknown, boolean][]) {
    const r = validerAxes(brut, CYCLE);
    verdict("V8 · axes · " + libelle, r.ok === attenduOk, r.ok ? "accepté" : r.raison);
  }

  /* ── 2. La période ─────────────────────────────────────────────── */
  verdict(
    "V8 · une adaptation sans fin est refusée",
    !validerPeriode("2026-09-07", "").ok && !validerPeriode("", "2026-09-16").ok,
    "« jusqu’à nouvel ordre » n’existe pas",
  );
  verdict(
    "V8 · une fin avant le début est refusée, un seul jour reste valide",
    !validerPeriode("2026-09-16", "2026-09-07").ok
      && validerPeriode("2026-09-07", "2026-09-07").ok,
    "fin >= debut",
  );
  verdict(
    "V8 · « je ne sais pas encore » propose quatre semaines",
    REEVALUATION_SEMAINES === 4 && finParDefaut("2026-09-07") === "2026-10-05",
    "2026-09-07 → " + finParDefaut("2026-09-07"),
  );
  /* ⚠️ L'arithmétique se fait en UTC depuis la CHAÎNE : repassée par le
     fuseau du navigateur, une date de calendrier recule d'un jour à
     l'ouest de Greenwich. Même piège que la rotation Premium de V7B. */
  verdict(
    "V8 · les dates traversent mois et années sans dériver",
    ajouterJours("2026-12-28", 7) === "2027-01-04"
      && ajouterJours("2026-02-27", 2) === "2026-03-01"
      && ajouterJours("2026-09-30", 1) === "2026-10-01",
    "28 déc + 7 = " + ajouterJours("2026-12-28", 7),
  );
  verdict(
    "V8 · la fin se dit en français sans dépendre de l’ICU du runtime",
    libelleJour("2026-09-17") === "17 sept." && libelleJour("2026-08-01") === "1 août",
    libelleJour("2026-09-17") + " · " + libelleJour("2026-08-01"),
  );

  /* ── 3. L'expiration se DÉDUIT, elle n'attend aucune écriture ──
     C'est le remède au défaut de `challenge_runs`, restée `en_cours` à
     vie parce que rien ne la fermait. */
  {
    const a = couche(["e-push"], "2026-09-07", "2026-09-16");
    verdict(
      "V8 · une adaptation expirée n’agit plus, même déclarée active",
      adaptationActive([a], "2026-09-17") === null && estExpiree(a, "2026-09-17"),
      "statut active, fin au 16, lue le 17 → aucune",
    );
    verdict(
      "V8 · elle n’agit pas avant son premier jour",
      adaptationActive([a], "2026-09-06") === null,
      "déclarée pour le 7, lue le 6",
    );
    verdict(
      "V8 · elle agit sur ses deux bornes, incluses",
      !!adaptationActive([a], "2026-09-07") && !!adaptationActive([a], "2026-09-16"),
      "du 7 au 16, les deux compris",
    );
    verdict(
      "V8 · une adaptation terminée n’agit jamais",
      adaptationActive([{ ...a, statut: "terminee" }], "2026-09-10") === null,
      "statut terminee",
    );
  }

  /* ── 4. Le chevauchement, lu comme la base le lira ──
     `daterange(debut, fin, '[]')` : bornes incluses des deux côtés. Avec
     la borne haute exclusive par défaut de PostgreSQL, le dernier jour
     d'une adaptation cesserait d'être protégé. */
  verdict(
    "V8 · deux adaptations bout à bout (le 17 puis le 18) sont compatibles",
    !chevauchent({ debut: "2026-09-07", fin: "2026-09-17" }, { debut: "2026-09-18", fin: "2026-09-30" }),
    "aucune journée partagée",
  );
  verdict(
    "V8 · deux adaptations qui partagent UNE journée se chevauchent",
    chevauchent({ debut: "2026-09-07", fin: "2026-09-17" }, { debut: "2026-09-17", fin: "2026-09-30" })
      && chevauchent({ debut: "2026-09-07", fin: "2026-09-07" }, { debut: "2026-09-07", fin: "2026-09-07" }),
    "le 17 des deux côtés",
  );
  verdict(
    "V8 · la base porte la même lecture que l’écran",
    MIGRATION.includes("daterange(debut, fin, '[]') with &&")
      && MIGRATION.includes("where (statut = 'active')"),
    "EXCLUDE gist sur la plage inclusive, actives seulement",
  );

  /* ── 5. LE CŒUR : une étape masquée est TRAVERSÉE, jamais consommée ── */
  {
    verdict(
      "V8 · sans adaptation, rien ne change (Push reste la première)",
      etapeSuivante(CYCLE, null, 1)?.id === "e-push",
      String(etapeSuivante(CYCLE, null, 1)?.nom),
    );

    const a = couche(["e-push"]);
    const masque = (e: { id: string }) => etapeMasquee(e.id, a);
    verdict(
      "V8 · Push masquée → Pull est proposée",
      etapeSuivante(CYCLE, null, 1, masque)?.id === "e-pull",
      String(etapeSuivante(CYCLE, null, 1, masque)?.nom),
    );
    verdict(
      "V8 · Pull faite → Bas du corps, le cycle continue normalement",
      etapeSuivante(CYCLE, 2, 1, masque)?.id === "e-bas",
      "aucune étape n’a été refermée en trop",
    );
    verdict(
      "V8 · au tour suivant, Push est de nouveau TRAVERSÉE",
      etapeSuivante(CYCLE, 5, 1, masque)?.id === "e-pull",
      "après Cardio, on repasse devant Push masquée",
    );

    /* ⚠️ LA PREUVE QUE « MASQUER » N'EST PAS « SAUTER » : le journal ne
       bouge pas d'une ligne, donc le curseur non plus. Une implémentation
       qui refermerait l'étape masquée écrirait ici une intention `passee`
       avec un `consommee_le`, et l'historique dirait qu'une séance a eu
       lieu alors qu'elle n'a jamais eu lieu. */
    const journal = [{ etapeId: "e-pull", resolue: true, consommeeLe: "2026-09-10T18:00:00Z" }];
    verdict(
      "V8 · le curseur est le même avec et sans adaptation",
      positionRefermee(journal, CYCLE) === 2,
      "dernière étape refermée = Pull (2), l’adaptation n’y touche pas",
    );

    /* Plusieurs étapes masquées : on prend la première COMPATIBLE. */
    const b = couche(["e-push", "e-pull", "e-bas"]);
    const masque3 = (e: { id: string }) => etapeMasquee(e.id, b);
    verdict(
      "V8 · trois étapes masquées → Haut du corps, la première compatible",
      etapeSuivante(CYCLE, null, 1, masque3)?.id === "e-haut",
      String(etapeSuivante(CYCLE, null, 1, masque3)?.nom),
    );

    /* Tout masqué : on ne propose RIEN. Inventer une séance de
       remplacement serait promettre ce que V8 ne sait pas faire (elle
       n'adapte pas encore le CONTENU d'une étape). */
    const tout = couche(CYCLE.map((e) => e.id));
    const masqueTout = (e: { id: string }) => etapeMasquee(e.id, tout);
    verdict(
      "V8 · tout le cycle masqué → aucune étape compatible, aucune séance inventée",
      etapeSuivante(CYCLE, null, 1, masqueTout) === null
        && etapesCompatibles(CYCLE, tout).length === 0,
      "null, jamais une séance vide",
    );
    verdict(
      "V8 · l’écran le DIT au lieu d’écrire « rien de prévu »",
      etatJournee({ pret: true, besoinSetup: false, jour: null, etape: null, adaptationBloque: true }) === "aucune_compatible"
        && etatJournee({ pret: true, besoinSetup: false, jour: null, etape: null }) === "libre",
      "aucune_compatible n’est pas libre",
    );
    /* ⚠️ APRÈS l'étape, jamais avant : une adaptation qui laisse une
       étape compatible ne doit pas faire apparaître cet état. */
    verdict(
      "V8 · une étape compatible passe avant « aucune compatible »",
      etatJournee({ pret: true, besoinSetup: false, jour: null, etape: CYCLE[1], adaptationBloque: true }) === "etape",
      "l’étape gagne",
    );

    /* Fin de l'adaptation : plus de filtre, et AUCUNE écriture n'a été
       nécessaire pour ça. */
    verdict(
      "V8 · l’adaptation finie, Push redevient proposable sans une écriture",
      etapeSuivante(CYCLE, null, 1)?.id === "e-push"
        && etapesCompatibles(CYCLE, null).length === CYCLE.length,
      "le programme de référence n’a jamais bougé",
    );

    verdict(
      "V8 · « Refais ma semaine » masque par IDENTIFIANT, plus par nom",
      idsMasques(CYCLE, a).join("|") === "e-push"
        && idsMasques(CYCLE, b).join("|") === "e-push|e-pull|e-bas"
        && idsMasques(CYCLE, null).length === 0
        && idsMasques(CYCLE, couche(["e-dune-autre-version"])).length === 0,
      "bornés au cycle : une étape d’une version archivée ne masque rien",
    );

    /* Et le générateur de semaine les respecte VRAIMENT. */
    {
      const dates = weekDates(new Date("2026-09-07T00:00:00"));
      const genSem = { ctx: "salle" as const, sessions: 5, goals: [], level: "intermediaire", variant: 0, seed: "u1" };
      const cyc = (masquees: string[]): CycleSemaine => ({
        programmeId: "p1",
        etapes: CYCLE.map((e) => ({ id: e.id, nom: e.nom })),
        masquees,
      });
      const normale = previewWeek(genSem, dates, cyc([])).filter((d) => d.title);
      const adaptee = previewWeek(genSem, dates, cyc(["e-push"])).filter((d) => d.title);
      const vide = previewWeek(genSem, dates, cyc(CYCLE.map((e) => e.id))).filter((d) => d.title);
      verdict(
        "V8 · la semaine régénérée ne repose pas une étape masquée",
        normale.some((d) => d.title === "Push")
          && !adaptee.some((d) => d.title === "Push")
          && adaptee.length > 0,
        normale.length + " séances → " + adaptee.length + " sans Push",
      );
      verdict(
        "V8 · tout masqué → la semaine régénérée ne pose aucune séance",
        vide.length === 0,
        "aucune séance inventée pour remplir",
      );

      /* ⭐ LE DÉFAUT DU 2026-09-08, REJOUÉ TEL QU'IL S'EST PRODUIT.
         « Refais ma semaine » posait une séance dont le contenu vient
         d'une étape du cycle SANS écrire le moindre lien vers le
         programme : la ligne n'avait plus qu'un titre, donc l'adaptation
         qui masque cette étape ne pouvait pas la voir, et elle
         s'activait par-dessus la séance du jour sans un mot. */
      verdict(
        "V8 · une semaine régénérée porte la PROVENANCE de chaque séance",
        normale.every((d) => d.programmeId === "p1" && !!d.provenanceId)
          && normale.find((d) => d.title === "Pull")?.provenanceId === "e-pull",
        normale.map((d) => d.title + "→" + String(d.provenanceId)).join(" · "),
      );
      verdict(
        "V8 · … et elle ne RÉSERVE aucune étape",
        normale.every((d) => !d.etapeId),
        "la rotation ignore le curseur : provenir n’est pas refermer",
      );
      verdict(
        "V8 · sans cycle lu, la semaine reste celle d’avant (aucun lien inventé)",
        previewWeek(genSem, dates).filter((d) => d.title).every((d) => !d.programmeId && !d.provenanceId),
        "un programme illisible ne fabrique pas de fausse provenance",
      );

      /* Et c'est bien ce lien qui rend le conflit visible. */
      const posee = normale.find((d) => d.title === "Pull")!;
      const fenetreReelle = { debut: "2026-09-08", fin: "2026-10-06", axes: { eviter_etapes: ["e-pull"] } };
      verdict(
        "V8 · une séance RÉGÉNÉRÉE sur l’étape masquée bloque l’activation",
        reservationsEnConflit([posee], fenetreReelle).length === 1,
        "le cas réel du 2026-09-08 : Pull posée aujourd’hui, adaptation sur Pull",
      );
      verdict(
        "V8 · … et le titre n’y est pour rien",
        reservationsEnConflit(
          [{ ...posee, programmeId: null, provenanceId: null, etapeId: null }],
          fenetreReelle,
        ).length === 0,
        "une séance nommée « Pull » sans identité d’étape ne bloque rien",
      );
    }
  }

  /* ── 6. Les réservations : on MONTRE, on ne réécrit jamais ──
     Supprimer, déplacer ou substituer automatiquement ce que quelqu'un a
     posé serait la réécriture silencieuse que le modèle s'interdit. */
  {
    const intention = (over: Partial<PlanningDay>): PlanningDay => ({
      id: "i1", date: "2026-09-10", type: "Force", title: "Push",
      difficulty: "Intermédiaire", location: "salle", exerciseList: [],
      sessionId: null, status: "planned", etapeId: null, programmeId: null, ...over,
    });
    const fenetre = { debut: "2026-09-07", fin: "2026-09-16", axes: { eviter_etapes: ["e-push"] } };

    const dedans = intention({ id: "conflit", etapeId: "e-push", programmeId: "p1" });
    const autreEtape = intention({ id: "ok-etape", etapeId: "e-pull", programmeId: "p1" });
    const horsFenetre = intention({ id: "ok-date", date: "2026-09-30", etapeId: "e-push", programmeId: "p1" });
    const supplement = intention({ id: "ok-extra", title: "Push (catalogue)" });
    const dejaFaite = intention({ id: "ok-faite", etapeId: "e-push", programmeId: "p1", status: "done" });

    const conflits = reservationsEnConflit([dedans, autreEtape, horsFenetre, supplement, dejaFaite], fenetre);
    verdict(
      "V8 · une réservation de l’étape masquée, dans la fenêtre, bloque",
      conflits.length === 1 && conflits[0].id === "conflit",
      conflits.map((c) => c.id).join(", ") || "aucun",
    );
    verdict(
      "V8 · une réservation d’une étape autorisée ne bloque pas",
      !conflits.includes(autreEtape),
      "Pull reste posée",
    );
    verdict(
      "V8 · une réservation hors de la fenêtre ne bloque pas",
      !conflits.includes(horsFenetre),
      "le 30 septembre, hors période",
    );
    verdict(
      "V8 · un supplément (sans étape) ne bloque jamais",
      !conflits.includes(supplement),
      "une séance du catalogue ne consomme rien, même si elle s’appelle Push",
    );
    verdict(
      "V8 · une séance déjà faite n’est jamais un conflit",
      !conflits.includes(dejaFaite),
      "on ne réécrit jamais un fait",
    );
  }

  /* ── 6bis. RÉSOUDRE UN CONFLIT DEPUIS LA CARTE (2026-09-08) ────────
     Le blocage fonctionnait, mais il envoyait la personne fermer la
     feuille, retrouver la séance dans sa semaine, la modifier, puis
     revenir. Les deux gestes vivent maintenant sur la ligne du conflit.
     Ce qui se vérifie hors ligne, c'est ce que la LISTE devient après
     chacun d'eux, et le fait qu'aucun ne consomme quoi que ce soit. */
  {
    const conflit = (over: Partial<PlanningDay>): PlanningDay => ({
      id: "c1", date: "2026-09-09", type: "Force", title: "Bas du corps",
      difficulty: "Intermédiaire", location: "salle", exerciseList: [],
      sessionId: null, status: "planned",
      programmeId: "p1", etapeId: null, provenanceId: "e-bas", ...over,
    });
    const fenetre = { debut: "2026-09-08", fin: "2026-10-06", axes: { eviter_etapes: ["e-bas", "e-pull"] } };
    /* Les deux natures de conflit, celles du vrai compte : une séance
       RÉGÉNÉRÉE (provenance seule) et une RÉSERVATION V7A (étape). */
    const regeneree = conflit({});
    const reservation = conflit({ id: "c2", date: "2026-09-10", title: "Pull", etapeId: "e-pull", provenanceId: null });

    verdict(
      "V8 · deux séances incompatibles font deux conflits, pas un",
      reservationsEnConflit([regeneree, reservation], fenetre).length === 2,
      "on les résout une par une",
    );
    verdict(
      "V8 · un conflit décalé HORS de la période disparaît de la liste",
      reservationsEnConflit([{ ...regeneree, date: "2026-10-07" }, reservation], fenetre)
        .every((c) => c.id !== "c1"),
      "le lendemain de la fin : plus rien à lui reprocher",
    );
    verdict(
      "V8 · un conflit décalé DANS la période reste un conflit",
      reservationsEnConflit([{ ...regeneree, date: "2026-09-30" }, reservation], fenetre)
        .some((c) => c.id === "c1"),
      "croire l’écran plutôt que la base rouvrirait le bouton",
    );
    verdict(
      "V8 · un conflit retiré ne bloque plus, et l’autre reste",
      reservationsEnConflit([reservation], fenetre).map((c) => c.id).join("|") === "c2",
      "en résoudre un ne résout pas le second",
    );
    verdict(
      "V8 · le dernier conflit résolu laisse la liste vide",
      reservationsEnConflit([], fenetre).length === 0,
      "le bouton redevient disponible, et le clic final reste volontaire",
    );

    /* ⚠️ DÉCALER NE TOUCHE NI À L'IDENTITÉ NI AU LIEN, ET C'EST TOUTE LA
       RAISON DE PASSER PAR `saveDay` : on réécrit LA ligne, donc les
       trois colonnes du programme restent exactement les mêmes. */
    const bougee = { ...regeneree, date: "2026-10-07" };
    verdict(
      "V8 · décaler conserve l’identité, la provenance et le lien programme",
      bougee.id === regeneree.id
        && JSON.stringify(lienProgramme(bougee)) === JSON.stringify(lienProgramme(regeneree))
        && lienProgramme(bougee).etape_consommee_id === null,
      "une séance régénérée provient d’une étape et n’en referme aucune",
    );
    const reservationBougee = { ...reservation, date: "2026-09-11" };
    verdict(
      "V8 · une réservation V7A décalée réserve toujours la MÊME étape",
      lienProgramme(reservationBougee).etape_consommee_id === "e-pull"
        && lienProgramme(reservationBougee).programme_seance_id === "e-pull",
      "changer de jour ne change pas ce qu’une séance réserve",
    );
    const jours = datesEntre(fenetre.debut, fenetre.fin);
    verdict(
      "V8 · la fenêtre relue porte ses deux bornes",
      jours[0] === "2026-09-08" && jours[jours.length - 1] === "2026-10-06" && jours.length === 29,
      jours.length + " jours interrogés en base",
    );
  }

  /* ── 7. LES CONTRÔLES DE SOURCE ────────────────────────────────────
     ⚠️ « Le programme de référence reste intact » et « une adaptation ne
     consomme rien » sont des propriétés du CHEMIN. Elles ne cassent rien
     quand on les perd, elles ne se voient qu'en base, et ce sont donc
     exactement celles qui repasseraient inaperçues. */
  {
    const propre = netV8(ADAPTATION);
    verdict(
      "V8 · le module d’adaptation n’écrit jamais dans le programme",
      !propre.includes("programmes") && !propre.includes("programme_seances"),
      "aucune écriture du programme de référence, par construction",
    );
    verdict(
      "V8 · il ne referme aucune étape et ne marque aucune intention",
      !propre.includes("consommerEtape") && !propre.includes("marquerIntention")
        && !propre.includes("consommee_le"),
      "masquer n’est pas consommer",
    );
    verdict(
      "V8 · il n’écrit que dans sa propre table",
      (propre.match(/\.from\(/g) ?? []).length
        === (propre.match(/from\("adaptations_entrainement"\)/g) ?? []).length,
      "adaptations_entrainement, et rien d’autre",
    );
    verdict(
      "V8 · la lecture de la journée passe le filtre à l’étape suivante",
      netV8(lireV8("src/hooks/useJournee.ts")).includes("etapeSuivanteDe(user.id, actif, (e) => etapeMasquee(e.id, couche))"),
      "sinon l’adaptation serait lue, affichée, et sans effet",
    );
    verdict(
      "V8 · « Refais ma semaine » reçoit le cycle, pas une liste de noms",
      netV8(lireV8("src/components/WeeklyProgramme.tsx")).includes("reposerLaSemaine(user.id, gen, dates, cycleStable)")
        && netV8(lireV8("src/app/progression/page.tsx")).includes("cycle={journee.cycleSemaine}"),
      "le second chemin qui pose une étape connaît son identité",
    );
    /* ⚠️ LE TROISIÈME CHEMIN, OUBLIÉ EN V8 ET TROUVÉ PAR LE TEST RÉEL DU
       2026-09-08 : « refais ma semaine » DIT AU GUIDE compose la même
       semaine et écrivait, elle, sans aucun cycle. C'est de là que venait
       la séance Pull sans identité. */
    verdict(
      "V8 · le Guide aussi compose sa semaine AVEC le cycle",
      netV8(lireV8("src/context/AssistantContext.tsx")).includes("previewWeek(gen, dates, cycleSemaine)"),
      "les trois chemins qui posent une étape la nomment de la même façon",
    );
    /* ⚠️ ET AUCUN D'EUX NE PEUT PLUS RECONNAÎTRE UNE ÉTAPE AU TITRE : la
       provenance se résout sur le cycle persisté, dans `generateWeek`, et
       nulle part ailleurs. */
    verdict(
      "V8 · l’identité d’une séance posée ne se déduit jamais du titre",
      !/title\s*===\s*["'`]/.test(netV8(lireV8("src/lib/adaptation.ts"))),
      "« Push » est une chaîne d’affichage, pas une identité métier",
    );
    /* ⚠️ Le vocabulaire compte : `effet_cycle = saut` sera une AUTRE
       action, explicite, qui consommera réellement une étape. Employer ce
       mot ici, c'est préparer la confusion qui fera refermer une étape
       masquée. */
    /* ── Les deux gestes de résolution : ils RÉUTILISENT les autorités,
       ils n'en inventent pas. C'est une propriété du chemin, donc de
       celles qui repasseraient inaperçues : écrire un statut au lieu de
       supprimer, ou créer une seconde intention au lieu de déplacer,
       ne casserait rien à l'écran et ne se verrait qu'en base. ── */
    const feuille = netV8(lireV8("src/components/entrainement/AdaptationSheet.tsx"));
    verdict(
      "V8 · « Décaler » DÉPLACE l’intention, il n’en crée pas une seconde",
      feuille.includes('saveDay(userId, { ...c, date }, "utilisateur")')
        && !feuille.includes("ajouterIntention"),
      "saveDay sur un id modifie LA ligne : même identité, même provenance",
    );
    verdict(
      "V8 · « Retirer » supprime, il ne marque jamais faite ni passée",
      feuille.includes("retirerIntention(userId, c.id)")
        && !/["'](done|skipped|passee|faite)["']/.test(feuille),
      "une intention retirée n’est pas un fait, c’est l’absence de fait",
    );
    verdict(
      "V8 · la feuille n’écrit toujours aucune table elle-même",
      !feuille.includes("programme_seances") && !feuille.includes('from("'),
      "elle déclare des gestes, les autorités écrivent",
    );
    verdict(
      "V8 · après un geste, les conflits se relisent À LA SOURCE",
      feuille.includes("chargerConflits(userId,")
        && feuille.includes("setTick((t) => t + 1)")
        && feuille.includes("|${tick}`"),
      "la clé change, donc la liste redevient « je ne sais pas »",
    );
    verdict(
      "V8 · rien n’active l’adaptation à la place de la personne",
      !/\bactiver\(/.test(feuille)
        && feuille.includes("onClick={peutActiver ? activer : undefined}"),
      "aucun appel : le seul chemin vers l’activation est le clic",
    );
    verdict(
      "V8 · le choix du jour reste le sélecteur unique de l’app",
      feuille.includes("<ChoixJour onChoisir="),
      "celui du héros et du menu d’une séance, pas un second",
    );
    verdict(
      "V8 · retirer une intention vise son id et épargne ce qui est fait",
      /retirerIntention[\s\S]*?\.eq\("id", intentionId\)[\s\S]*?\.neq\(sc\.colStatut, sc\.versBase\.done\)/
        .test(netV8(lireV8("src/lib/planning.ts"))),
      "libérer la journée emporterait le supplément posé à côté",
    );

    verdict(
      "V8 · le code métier ne dit jamais « saut » ni « skip »",
      !/\b(skip|saut)\b/i.test(propre),
      "une étape évitée est MASQUÉE",
    );
    verdict(
      "V8 · la migration ferme le vocabulaire en base, elle ne l’ignore pas",
      MIGRATION.includes("adaptation_axes_valides")
        && MIGRATION.includes("k not in ('eviter_etapes')")
        && MIGRATION.includes("axes_version"),
      "une clé inconnue est refusée à l’écriture",
    );
    verdict(
      "V8 · la trace sur l’intention ne détruit jamais rien",
      MIGRATION.includes("add column if not exists adaptation_id uuid")
        && MIGRATION.includes("references public.adaptations_entrainement(id) on delete set null"),
      "ON DELETE SET NULL : supprimer une adaptation ne touche pas aux faits",
    );
    verdict(
      "V8 · le défaut de position_initiale est corrigé au passage",
      MIGRATION.includes("alter column position_initiale set default 1"),
      "les positions du cycle commencent à 1",
    );
  }
}


/* ════════════════════════════════════════════════════════════════════
   V9A · LE GUIDE VOIT LE MOTEUR (2026-09-08)

   Le Guide ne savait RIEN du programme : le paramètre `programme` de
   `buildSystemPrompt` n'était plus renseigné par personne depuis V0. Ce
   bloc exerce les deux choses que V9A ajoute, et elles sont toutes les
   deux vérifiables hors ligne sur une app pourtant auth-gated :
   `resumeMoteur`, qui est PURE, et la FRAÎCHEUR du cache, qui se pilote
   par sa lecture injectée.

   ⚠️ CE QUI SE VÉRIFIE ICI, C'EST AUSSI CE QUI N'A PAS BOUGÉ : le prompt
   de l'aiguilleur, la liste des outils, et le fait que le module neuf
   n'écrive rien. Une vague de LECTURE se prouve autant par ses absences.
   ════════════════════════════════════════════════════════════════════ */
{
  const AUJ = "2026-09-08";                 // un mardi
  const CYCLE = [
    { id: "e-push", nom: "Push", position: 1 },
    { id: "e-pull", nom: "Pull", position: 2 },
    { id: "e-bas", nom: "Bas du corps", position: 3 },
    { id: "e-haut", nom: "Haut du corps", position: 4 },
    { id: "e-cardio", nom: "Cardio", position: 5 },
  ];
  const COUCHE: Adaptation = {
    id: "a1", userId: "u1", programmeId: "p1",
    debut: "2026-09-08", fin: "2026-10-06", statut: "active",
    motif: "épaule sensible", axes: { eviter_etapes: ["e-push"] },
    axesVersion: 1, origine: "utilisateur", fermeeLe: null,
  };
  const seance = (date: string, titre: string, over: Partial<SeanceMoteur> = {}): SeanceMoteur => ({
    date, titre, faite: false, etapeId: null, provenanceId: null, supplement: false, ...over,
  });
  const etat = (over: Partial<EtatMoteur> = {}): EtatMoteur => ({
    aujourdhui: AUJ,
    programme: { id: "p1", nom: "Santé générale" },
    cycle: CYCLE,
    etapeBrute: { id: "e-pull", nom: "Pull" },
    etape: { id: "e-pull", nom: "Pull" },
    reserveLe: null,
    adaptation: null,
    masquees: [],
    aVenir: [],
    recent: [],
    contexte: { seancesCible: 5, dureeCibleMin: null },
    ...over,
  });

  /* ── 1. Ce que le résumé dit, état par état ─────────────────────── */

  verdict(
    "V9A · rien à lire → aucun bloc, et surtout pas un bloc vide",
    resumeMoteur(null) === null,
    "le prompt du coach ne porte alors PAS la section entraînement",
  );

  {
    /* Un compte SANS programme n'est pas un compte cassé : il peut avoir
       des séances datées. On dit l'absence, on n'invente aucune étape. */
    const r = resumeMoteur(etat({
      programme: null, cycle: [], etapeBrute: null, etape: null, contexte: null,
      aVenir: [seance("2026-09-10", "HIIT 20/10")],
    })) ?? "";
    verdict(
      "V9A · sans programme, on le dit et on n’invente aucune étape",
      r.includes("Programme actif : aucun.") && !r.includes("Prochaine étape") && r.includes("HIIT 20/10"),
      "ce qui n’est pas écrit dans le bloc n’existe pas pour le coach",
    );
  }

  {
    const r = resumeMoteur(etat()) ?? "";
    verdict(
      "V9A · programme sans planning → la prochaine étape, et « rien de daté »",
      r.includes("Santé générale") && r.includes("Cycle qui tourne : Push, Pull, Bas du corps, Haut du corps, Cardio.")
        && r.includes("Prochaine étape : Pull, pas encore datée (quand il veut).")
        && r.includes("Prévu (7 jours) : rien de daté."),
      "« quand tu veux » est la vérité d’une étape sans date (V5)",
    );
  }

  {
    /* La réservation V7A : l'étape a DÉJÀ un jour, et le taire est ce qui
       avait autorisé une seconde fermeture le 2026-09-06. */
    const r = resumeMoteur(etat({ reserveLe: "2026-09-10" })) ?? "";
    verdict(
      "V9A · une étape réservée dit son jour, jamais « quand tu veux »",
      r.includes("Prochaine étape : Pull, prévue jeudi 10.") && !r.includes("quand il veut"),
      "elle se cherche en base, où qu’elle soit posée dans le calendrier",
    );
  }

  {
    const r = resumeMoteur(etat({
      aVenir: [
        seance(AUJ, "Bas du corps", { etapeId: "e-bas" }),
        seance(AUJ, "Cardio doux", { supplement: true }),
        seance("2026-09-09", "Pull"),
      ],
    })) ?? "";
    verdict(
      "V9A · deux séances le même jour : la principale, puis le supplément",
      r.includes("aujourd’hui Bas du corps · aujourd’hui Cardio doux (en plus) · demain Pull."),
      "la hiérarchie se déduit (V6b), elle ne se stocke pas",
    );
  }

  {
    /* Le cas du scénario : le curseur pointe Push, l'adaptation la masque,
       et le Guide doit pouvoir répondre « pourquoi tu me proposes Pull ? ». */
    const r = resumeMoteur(etat({
      etapeBrute: { id: "e-push", nom: "Push" }, adaptation: COUCHE, masquees: ["Push"],
    })) ?? "";
    verdict(
      "V9A · l’adaptation explique POURQUOI c’est cette étape-là",
      r.includes("Prochaine étape : Pull") && r.includes("Push vient avant dans le cycle, mais elle est mise de côté")
        && r.includes("Adaptation en cours jusqu’au 6 oct. : Push mise(s) de côté."),
      "la cinquième question du scénario se répond sans un seul outil de lecture",
    );
  }

  {
    /* V8 · l'adaptation masque TOUT le cycle : ce n'est ni « libre » ni
       « repos », et surtout on n'invente aucune séance de remplacement. */
    const r = resumeMoteur(etat({
      etapeBrute: null, etape: null, adaptation: COUCHE,
      masquees: CYCLE.map((e) => e.nom),
    })) ?? "";
    verdict(
      "V9A · tout le cycle masqué → on le dit, on ne propose rien d’inventé",
      r.includes("l’adaptation en cours met tout le cycle de côté")
        && !r.includes("Prochaine étape : Pull"),
      "V9A n’adapte pas le CONTENU : en proposer un serait promettre ce qu’on ne sait pas faire",
    );
  }

  {
    /* Une adaptation expirée n'arrive jamais jusqu'ici : `adaptationDuJour`
       recalcule sa fenêtre et rend `null`. Le résumé ne doit alors porter
       aucune trace d'adaptation. */
    verdict(
      "V9A · adaptation expirée → pas une ligne dans le résumé",
      estExpiree(COUCHE, "2026-10-07")
        && !(resumeMoteur(etat({ adaptation: null })) ?? "").includes("Adaptation"),
      "l’expiration se DÉDUIT, elle n’attend aucune écriture (V8)",
    );
  }

  {
    const faits = [
      seance("2026-09-07", "Push", { faite: true, etapeId: "e-push" }),
      seance("2026-09-04", "Cardio", { faite: true }),
    ];
    const r = resumeMoteur(etat({ recent: faits })) ?? "";
    verdict(
      "V9A · « qu’est-ce que j’ai fait ? » se répond depuis la même fenêtre",
      r.includes("Fait récemment : lundi 7 Push · vendredi 4 Cardio."),
      "sept jours devant et sept derrière : c’est UNE requête, pas deux",
    );
  }

  /* ── 2. Le résumé est BORNÉ, et c'est la promesse de la vague ──
     « Pas de gros contexte envoyé au modèle » ne tient que si le bloc ne
     grossit pas avec les données de quelqu'un. */
  {
    const beaucoup = Array.from({ length: 20 }, (_, i) =>
      seance("2026-09-" + String(9 + (i % 6)).padStart(2, "0"), "Une séance au titre interminable numéro " + i));
    const r = resumeMoteur(etat({
      aVenir: beaucoup,
      recent: beaucoup.map((s) => ({ ...s, faite: true })),
      adaptation: { ...COUCHE, motif: "M".repeat(400) },
      masquees: ["Push"],
    })) ?? "";
    verdict(
      "V9A · le résumé reste borné, quel que soit le planning",
      r.length < 1200 && r.includes("et 14 autre(s)") && !r.includes("M".repeat(70)),
      r.length + " caractères pour 20 séances à venir, 20 faites et un motif de 400",
    );
    const nu = resumeMoteur(etat({ reserveLe: "2026-09-10", adaptation: COUCHE, masquees: ["Push"] })) ?? "";
    verdict(
      "V9A · dans un état normal, il tient en quelques centaines de caractères",
      nu.length > 0 && nu.length < 600,
      nu.length + " caractères",
    );
  }

  /* ── 3. LA FRAÎCHEUR. C'est le défaut d'`ensureContext()` qu'on
     s'interdit : lire une fois par session et ne jamais relire est
     acceptable pour un profil, faux pour un moteur. ── */
  {
    let lectures = 0;
    let prochaine = "Pull";
    const lire = async () => { lectures++; return etat({ etape: { id: "e-x", nom: prochaine } }); };

    const a = resumeMoteur(await etatMoteur("u1", lire)) ?? "";
    const b = resumeMoteur(await etatMoteur("u1", lire)) ?? "";
    verdict(
      "V9A · deux messages d’affilée ne relisent pas le moteur",
      lectures === 1 && a === b && a.includes("Pull"),
      "une rafale de messages ne coûte pas sept requêtes par message",
    );

    /* Le témoin du scénario : message 1 → Pull, la journée change,
       message 2 → Bas du corps, SANS recréer la conversation. */
    prochaine = "Bas du corps";
    invaliderMoteur();
    const c = resumeMoteur(await etatMoteur("u1", lire)) ?? "";
    verdict(
      "V9A · après un évènement de journée, le message suivant voit le nouvel état",
      lectures === 2 && c.includes("Bas du corps") && !c.includes("Prochaine étape : Pull"),
      "sans ça, le Guide annoncerait Pull une heure après que Pull a été faite",
    );

    const avant = lectures;
    await etatMoteur("u2", lire);
    verdict(
      "V9A · le cache est nominatif : changer de compte relit",
      lectures === avant + 1,
      "un cache qui servirait l’état d’autrui serait pire que pas de cache",
    );
    invaliderMoteur();
    verdict(
      "V9A · le cache est court par lui-même",
      TTL_MOTEUR_MS > 0 && TTL_MOTEUR_MS <= 60_000,
      TTL_MOTEUR_MS / 1000 + " s, et `EVT_JOURNEE` le vide avant l’heure",
    );
  }

  /* ── 4. LES CONTRÔLES DE SOURCE ────────────────────────────────────
     Ce sont des propriétés du CHEMIN (qui lit, qui écrit, qui grossit),
     donc exactement celles qui repasseraient inaperçues. ── */
  {
    const lireF = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
    const net = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const MOTEUR = net(lireF("src/lib/guideMoteur.ts"));
    const ROUTE = net(lireF("src/app/api/chat/route.ts"));
    const CTX = net(lireF("src/context/AssistantContext.tsx"));
    const ROUTEUR = lireF("src/lib/assistantRouter.ts");
    const OUTILS = net(lireF("src/lib/assistantTools.ts"));

    verdict(
      "V9A · le Guide REGARDE : `guideMoteur` n’écrit rien du tout",
      !/\.(insert|upsert|update|delete)\(/.test(MOTEUR),
      "aucune écriture, aucune carte, aucune migration dans cette vague",
    );
    verdict(
      "V9A · il ne touche ni au programme de référence ni aux adaptations",
      !MOTEUR.includes('from("programmes")') && !MOTEUR.includes('from("programme_seances")')
        && !MOTEUR.includes('from("adaptations_entrainement")'),
      "il passe par `lireProgrammeActif` et `adaptationDuJour`, pas par les tables",
    );
    verdict(
      "V9A · il compose les autorités, il ne redécide rien",
      MOTEUR.includes("lireProgrammeActif(") && MOTEUR.includes("positionConsommee(")
        && MOTEUR.includes("etapeSuivante(") && MOTEUR.includes("etapeMasquee(")
        && MOTEUR.includes("reservationDeLEtape(") && MOTEUR.includes("principale("),
      "le curseur, le masquage, la réservation et la hiérarchie restent chez eux",
    );
    verdict(
      "V9A · aucune identité ne se devine par un titre",
      MOTEUR.includes("etat.etapeBrute.id !== etat.etape.id")
        && !/\.(nom|titre|title)\s*===/.test(MOTEUR),
      "les noms ne servent qu’à ÉCRIRE le résumé, jamais à décider",
    );
    verdict(
      "V9A · le curseur ne se lit qu’UNE fois pour deux dérivations",
      (MOTEUR.match(/positionConsommee\(/g) ?? []).length === 1
        && (MOTEUR.match(/etapeSuivante[<(]/g) ?? []).length === 2,
      "passer deux fois par `etapeSuivanteDe` referait la requête pour rien",
    );
    verdict(
      "V9A · la fraîcheur est branchée sur l’évènement que tout le monde émet déjà",
      MOTEUR.includes("addEventListener(EVT_JOURNEE, invaliderMoteur)"),
      "une fin de séance rend le message suivant conscient du nouvel état",
    );

    verdict(
      "V9A · le paramètre mort de `buildSystemPrompt` est REMPLACÉ, pas doublé",
      ROUTE.includes("moteur?: string | null") && !ROUTE.includes("Programme actuel")
        && !/\bbody\.programme\b/.test(ROUTE),
      "deux chemins vers le même bloc, c’est la divergence programmée",
    );
    verdict(
      "V9A · le bloc interdit d’inventer au-delà de ce qu’il contient",
      ROUTE.includes("N’invente JAMAIS une étape, une date ou une séance qui n’y figure pas"),
      "un coach qui comble un trou est pire qu’un coach qui dit « rien de prévu »",
    );
    verdict(
      "V9A · l’assistant envoie le résumé, relu à chaque message",
      CTX.includes("resumeMoteur(await etatMoteur(user.id)") && CTX.includes("moteur,"),
      "il ne passe PAS par `ensureContext`, qui ne relit jamais",
    );

    /* ⚠️ L'AIGUILLEUR RESTE AVEUGLE, ET C'EST LA MESURE QUI COMMANDE
       TOUTE LA VAGUE : 241 caractères → l'outil est appelé 6 fois sur 6 ;
       5 371 → 1 fois sur 6. Chaque caractère ajouté ici abîme une
       décision d'action qui marche à 24 cas sur 25. */
    const prompt = (ROUTEUR.match(/const PROMPT = `([\s\S]*?)`;/) ?? [])[1] ?? "";
    verdict(
      "V9A · le prompt de l’aiguilleur n’a pas grossi d’un caractère",
      prompt.length > 0 && prompt.length <= 400,
      prompt.length + " caractères (la fiabilité s’effondre bien avant 5 371)",
    );
    verdict(
      "V9A · l’aiguilleur ne sait rien du moteur",
      !/guideMoteur|resumeMoteur|etatMoteur/.test(ROUTEUR),
      "il appelle l’outil sans connaître le nom de l’étape : c’est le CODE qui résout",
    );
    verdict(
      "V9A · aucun outil de lecture n’a été créé",
      ASSISTANT_TOOLS.length === 13 && !OUTILS.includes("guideMoteur")
        && !ASSISTANT_TOOLS.some((t) => /lire|read|get_|voir|etat_|moteur/.test(t.function.name)),
      ASSISTANT_TOOLS.length + " outils, tous des ACTIONS",
    );
    verdict(
      "V9A · aucun outil d’ÉCRITURE au-delà de ce que V9B ouvre",
      !ASSISTANT_TOOLS.some((t) => /sauter|substitu|supplement|adaptation/.test(t.function.name)),
      "substitution, saut, supplément et adaptation attendent V9C et V9D",
    );
  }
}

/* ════════════════════════════════════════════════════════════════════
   V9A bis · LE GUIDE VOIT LE JOURNAL DU JOUR (2026-09-09)

   Défaut réel : l'écran Nutrition affichait 286 kcal pour aujourd'hui et
   le Guide répondait « aucun repas n'est encore enregistré ». La ligne
   était en base, à la bonne date : ce n'était pas la source, c'était la
   FRAÎCHEUR. `ensureContext()` lit une fois par session et ne relit
   jamais, donc le prompt disait « 0 kcal » et n'écrivait aucune ligne
   « Repas du jour ». Le Guide n'a rien inventé : on lui avait menti.

   ⚠️ CE BLOC TIENT LES DEUX MOITIÉS. La fusion, qui est PURE, et le fait
   qu'AUCUNE écriture du journal n'oublie de le signaler : une seule
   oubliée et le défaut revient sur ce chemin-là uniquement, donc de
   façon intermittente, c'est-à-dire de la pire façon.
   ════════════════════════════════════════════════════════════════════ */
{
  const JOUR = "2026-09-09";
  const HIER = "2026-09-08";
  const etatN = (over: Partial<EtatNutrition> = {}): EtatNutrition => ({
    jour: JOUR, repas: [], calories: 0, proteines: 0, ...over,
  });
  const BARRES = {
    mealType: "gouter", name: "Barres protéinées maison chocolat-cacahuète",
    calories: 286, proteins: 16, time: "16:35", description: null,
  };
  const ANCIEN: RepasDetail[] = [
    { date: JOUR, name: "Ce que le contexte croyait" },
    { date: HIER, name: "Riz au lait", calories: 311 },
  ];

  /* ── 1. La fusion, pure ─────────────────────────────────────────── */

  verdict(
    "V9A bis · le cas réel : le repas du jour entre dans le contexte du coach",
    (() => {
      const r = repasFrais([{ date: HIER, name: "Riz au lait" }], etatN({ repas: [BARRES], calories: 286, proteines: 16 }));
      return r.length === 2 && r[0].date === JOUR && r[0].calories === 286
        && r[0].name.startsWith("Barres");
    })(),
    "c’est cette ligne-là qui devient « Repas du jour : Goûter … » dans le prompt",
  );
  verdict(
    "V9A bis · la journée est REMPLACÉE, jamais fusionnée ligne à ligne",
    (() => {
      const r = repasFrais(ANCIEN, etatN({ repas: [BARRES], calories: 286 }));
      const duJour = r.filter((m) => m.date === JOUR);
      return duJour.length === 1 && duJour[0].name.startsWith("Barres")
        && r.some((m) => m.date === HIER);
    })(),
    "un repas périmé disparaît, les jours précédents restent",
  );
  verdict(
    "V9A bis · un repas supprimé disparaît vraiment du contexte",
    (() => {
      const r = repasFrais(ANCIEN, etatN({ repas: [] }));
      return r.every((m) => m.date !== JOUR) && r.some((m) => m.date === HIER);
    })(),
    "sans quoi le Guide continuerait de citer un repas effacé sur l’écran",
  );
  verdict(
    "V9A bis · une lecture ratée laisse le contexte de session intact",
    (() => {
      const r = repasFrais(ANCIEN, null);
      return r.length === ANCIEN.length && r[0].name === ANCIEN[0].name;
    })(),
    "on ne remplace JAMAIS une donnée par une absence de donnée",
  );
  verdict(
    "V9A bis · la liste reste bornée, quelle que soit la journée",
    (() => {
      const gros = Array.from({ length: 30 }, (_, i) => ({ ...BARRES, name: "Repas " + i }));
      return repasFrais(ANCIEN, etatN({ repas: gros })).length <= MAX_REPAS;
    })(),
    "même borne qu’avant (12) : un contexte qui grossit avec la journée n’en est plus un",
  );

  /* ── 2. LA FRAÎCHEUR, le cœur du correctif ──────────────────────── */
  {
    let lectures = 0;
    let courant: EtatNutrition | null = etatN();          // journée vide
    const lire = async () => { lectures++; return courant; };

    invaliderNutrition();
    const a = await etatNutrition("u1", lire);
    const b = await etatNutrition("u1", lire);
    verdict(
      "V9A bis · deux messages d’affilée ne relisent pas le journal",
      lectures === 1 && a?.calories === 0 && b?.calories === 0,
      lectures + " lecture pour deux messages",
    );

    // Le geste réel : on note un repas sur l’écran Nutrition.
    courant = etatN({ repas: [BARRES], calories: 286, proteines: 16 });
    verdict(
      "V9A bis · sans signal, le Guide resterait sur la journée d’avant",
      (await etatNutrition("u1", lire))?.calories === 0,
      "c’est EXACTEMENT le défaut du 2026-09-09, reproduit ici",
    );
    invaliderNutrition();                                  // ce que fait EVT_NUTRITION
    verdict(
      "V9A bis · après un repas noté, le message suivant voit les 286 kcal",
      (await etatNutrition("u1", lire))?.calories === 286,
      "le Guide ne peut plus dire « aucun repas » quand le journal en contient un",
    );
    const avant = lectures;
    await etatNutrition("u2", lire);
    verdict(
      "V9A bis · le cache est nominatif : changer de compte relit",
      lectures === avant + 1,
      "un journal alimentaire ne se partage pas entre deux comptes",
    );
    invaliderNutrition();

    verdict(
      "V9A bis · le cache est court par lui-même",
      TTL_NUTRITION_MS > 0 && TTL_NUTRITION_MS <= 60_000,
      TTL_NUTRITION_MS / 1000 + " s, et `EVT_NUTRITION` le vide avant l’heure",
    );
  }

  /* ── 3. LES CONTRÔLES DE SOURCE ─────────────────────────────────── */
  {
    const lireF = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
    const net = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const NUT = net(lireF("src/lib/guideNutrition.ts"));
    const CTX = net(lireF("src/context/AssistantContext.tsx"));
    const ECRAN = net(lireF("src/components/NutritionTab.tsx"));
    const ROUTE = net(lireF("src/app/api/chat/route.ts"));
    const ROUTEUR = lireF("src/lib/assistantRouter.ts");

    // Une écriture du journal = un signal. C'est la propriété qui empêche
    // le défaut de revenir par un chemin qu'on aurait oublié.
    const ecritures = (t: string) => (t.match(/nutrition_logs"\)[\s\S]{0,60}?\.(insert|delete)\(/g) ?? []).length;
    const signaux = (t: string) => (t.match(/signalerRepas\(\)/g) ?? []).length;

    verdict(
      "V9A bis · les six écritures de l’écran Nutrition signalent toutes",
      ecritures(ECRAN) >= 6 && signaux(ECRAN) === ecritures(ECRAN),
      ecritures(ECRAN) + " écritures, " + signaux(ECRAN) + " signaux",
    );
    verdict(
      "V9A bis · les deux cartes de repas du Guide signalent aussi",
      ecritures(CTX) >= 2 && signaux(CTX) === ecritures(CTX),
      ecritures(CTX) + " écritures, " + signaux(CTX) + " signaux",
    );
    verdict(
      "V9A bis · `guideNutrition` REGARDE : il n’écrit rien du tout",
      !/\.(insert|upsert|update|delete)\(/.test(NUT),
      "une lecture, une seule, sur le jour courant",
    );
    verdict(
      "V9A bis · la fraîcheur est branchée sur l’évènement des repas",
      NUT.includes("addEventListener(EVT_NUTRITION") && NUT.includes(EVT_NUTRITION),
      "sans ça le cache ne serait qu’un TTL, donc un état périmé de 30 s",
    );
    verdict(
      "V9A bis · le jour se lit en LOCAL, comme l’écrit l’écran Nutrition",
      NUT.includes("localDateStr()") && !/toISOString\(\)\.slice\(0, 10\)/.test(NUT),
      "en UTC, le Guide interrogeait la veille entre minuit et 2 h du matin",
    );
    verdict(
      "V9A bis · les repas notés par le Guide se datent du même jour que l’écran",
      (CTX.match(/date: localDateStr\(now\)/g) ?? []).length === 2
        && !/date: now\.toISOString\(\)/.test(CTX),
      "sinon un repas noté la nuit atterrissait la veille, invisible sur le journal",
    );
    verdict(
      "V9A bis · l’assistant relit le journal à CHAQUE message",
      /await etatNutrition\(/.test(CTX) && /repasFrais\(/.test(CTX),
      "c’est la promesse de V9A appliquée à la nutrition",
    );
    verdict(
      "V9A bis · le contexte de session est ATTENDU, plus seulement lancé",
      /await contexteCharge/.test(CTX) && !/void ensureContext\(\)/.test(CTX),
      "le premier message ne part plus avec un profil et un journal encore nuls",
    );
    verdict(
      "V9A bis · une seule autorité sur les repas du jour, en deux branches",
      ROUTE.split("Repas du jour").length - 1 === 2
        && ROUTE.split("m.name").length - 1 === 1,
      "« présent » et « absent » sont les deux branches de la MÊME ligne, jamais un second bloc",
    );
    verdict(
      "V9A bis · l’aiguilleur reste aveugle à la nutrition aussi",
      !/guideNutrition|etatNutrition|repasFrais/.test(ROUTEUR),
      "son prompt ne bouge pas d’un caractère",
    );
  }
}

/* ════════════════════════════════════════════════════════════════════
   V9A ter · UN REPAS SUPPRIMÉ DISPARAÎT DE PARTOUT (2026-09-09)

   Défaut réel, trouvé par Louis juste après V9A bis : on ajoute un repas,
   le Guide le voit, on le supprime depuis Nutrition, l'écran ne le montre
   plus, et le Guide continue de le citer en boucle sans recharger la page.

   L'ajout était donc devenu frais, la suppression non. Deux survivants,
   tous deux structurels : `nutritionWeek`, jamais rafraîchie, qui comptait
   encore la journée supprimée ; et surtout le PROMPT, qui n'écrivait la
   ligne « Repas du jour » que s'il y avait un repas, donc laissait une
   journée vidée sans aucune trace. Une absence de ligne est une absence
   d'information, jamais une information d'absence : privé de tout fait sur
   sa journée, le coach retombait sur sa propre réponse d'avant.

   ⚠️ CE BLOC TIENT LES DEUX MOITIÉS : le payload nutritionnel du coach,
   assemblé exactement comme `sendMessage`, et la source qui prouve que le
   vrai assemblage remplace bien les quatre représentations.
   ════════════════════════════════════════════════════════════════════ */
{
  const JOUR = "2026-09-09";
  const HIER = "2026-09-08";
  const etatN = (over: Partial<EtatNutrition> = {}): EtatNutrition => ({
    jour: JOUR, repas: [], calories: 0, proteines: 0, ...over,
  });
  const BARRES = {
    mealType: "gouter", name: "Barres protéinées maison chocolat-cacahuète",
    calories: 286, proteins: 16, time: "16:35", description: null,
  };
  const OEUFS = {
    mealType: "petit_dejeuner", name: "Deux œufs au plat",
    calories: 160, proteins: 13, time: "08:10", description: null,
  };

  type Session = { calories: number; mealsDetail: RepasDetail[]; nutritionWeek: JourNutrition[] };

  /* Le même assemblage que `sendMessage`. Les contrôles de SOURCE plus bas
     vérifient que le vrai code fait bien ces quatre remplacements. */
  const payload = (session: Session, nut: EtatNutrition | null) => nut
    ? {
        calories: nut.calories,
        mealsDetail: repasFrais(session.mealsDetail, nut),
        nutritionWeek: semaineFraiche(session.nutritionWeek, nut),
        journalDuJourLu: true as boolean | undefined,
      }
    : {
        calories: session.calories,
        mealsDetail: session.mealsDetail,
        nutritionWeek: session.nutritionWeek,
        journalDuJourLu: undefined as boolean | undefined,
      };

  /* L'instantané de session, pris quand le repas existait encore. */
  const AVEC: Session = {
    calories: 286,
    mealsDetail: [
      { date: JOUR, mealType: "gouter", name: BARRES.name, calories: 286, proteins: 16 },
      { date: HIER, name: "Riz au lait", calories: 311 },
    ],
    nutritionWeek: [
      { date: JOUR, calories: 286, proteins: 16 },
      { date: HIER, calories: 311, proteins: 9 },
    ],
  };

  /* ── 1. LE CAS RÉEL : on supprime le seul repas du jour ─────────── */

  const apres = payload(AVEC, etatN());

  verdict(
    "V9A ter · le repas supprimé quitte le détail des repas du jour",
    apres.mealsDetail.every((m) => m.date !== JOUR) && apres.mealsDetail.some((m) => m.date === HIER),
    "les jours précédents, eux, ne bougent pas",
  );
  verdict(
    "V9A ter · il quitte AUSSI la moyenne 7 jours",
    apres.nutritionWeek.every((d) => d.date !== JOUR) && apres.nutritionWeek.some((d) => d.date === HIER),
    "c’est la représentation qui survivait : elle comptait encore la journée effacée",
  );
  verdict(
    "V9A ter · les calories du jour retombent à 0",
    apres.calories === 0,
    "et l’écran Nutrition affiche la même chose",
  );
  verdict(
    "V9A ter · PLUS AUCUNE trace du repas dans tout le payload nutrition",
    !JSON.stringify(apres).includes("Barres"),
    "c’est le contrôle qui attrapera la prochaine copie qu’on oublierait",
  );
  verdict(
    "V9A ter · et la journée vide est DÉCLARÉE, plus seulement muette",
    apres.journalDuJourLu === true,
    "sans ce drapeau, le prompt n’écrit rien et le coach retombe sur sa réponse d’avant",
  );

  const moyenne = (w: JourNutrition[]) =>
    w.length ? Math.round(w.reduce((s, d) => s + d.calories, 0) / w.length) : null;
  verdict(
    "V9A ter · la moyenne 7 jours cesse de compter le repas effacé",
    moyenne(AVEC.nutritionWeek) === 299 && moyenne(apres.nutritionWeek) === 311,
    "« 299 kcal/j en moyenne » sur une journée vidée, c’est le même mensonge en plus discret",
  );

  /* ── 2. DEUX REPAS, ON N'EN SUPPRIME QU'UN ──────────────────────── */

  const DEUX: Session = {
    calories: 446,
    mealsDetail: [
      { date: JOUR, mealType: "petit_dejeuner", name: OEUFS.name, calories: 160 },
      { date: JOUR, mealType: "gouter", name: BARRES.name, calories: 286 },
      { date: HIER, name: "Riz au lait", calories: 311 },
    ],
    nutritionWeek: [
      { date: JOUR, calories: 446, proteins: 29 },
      { date: HIER, calories: 311, proteins: 9 },
    ],
  };
  const reste = payload(DEUX, etatN({ repas: [OEUFS], calories: 160, proteines: 13 }));

  verdict(
    "V9A ter · l’autre repas reste, le supprimé disparaît",
    reste.mealsDetail.filter((m) => m.date === JOUR).length === 1
      && reste.mealsDetail.some((m) => m.name === OEUFS.name)
      && !JSON.stringify(reste).includes("Barres"),
    "une suppression ne vide pas la journée entière",
  );
  verdict(
    "V9A ter · et la moyenne suit le repas qui reste",
    reste.nutritionWeek.find((d) => d.date === JOUR)?.calories === 160,
    "446 est un total qui n’existe plus",
  );

  /* ── 3. « JOURNÉE VIDE » N'EST JAMAIS « LECTURE RATÉE » ─────────── */

  const rate = payload(AVEC, null);
  verdict(
    "V9A ter · une lecture ratée ne fabrique JAMAIS une journée vide",
    rate.calories === 286
      && rate.mealsDetail.some((m) => m.date === JOUR)
      && rate.nutritionWeek.some((d) => d.date === JOUR),
    "on ne remplace pas une donnée par une absence de donnée",
  );
  verdict(
    "V9A ter · et elle ne DÉCLARE pas la journée lue",
    rate.journalDuJourLu !== true,
    "donc le prompt n’écrit pas « aucun repas » : affirmer le vide sur un doute est le mensonge inverse",
  );
  verdict(
    "V9A ter · `[]` et `null` sont impossibles à confondre dans le payload",
    apres.journalDuJourLu === true && rate.journalDuJourLu !== true
      && apres.mealsDetail.length !== rate.mealsDetail.length,
    "`[]` = aucun repas, c’est une vérité ; `null` = je ne sais pas, on ne touche à rien",
  );
  verdict(
    "V9A ter · une lecture RÉUSSIE sur journée vide rend un état, pas `null`",
    (() => {
      const e = etatN();
      return e.repas.length === 0 && e.calories === 0 && e.jour === JOUR;
    })(),
    "c’est la forme que `lireEtatNutrition` rend quand la requête ne ramène aucune ligne",
  );

  /* ── 4. LE CACHE NE GARDE PAS UN ÉCHEC ──────────────────────────── */
  {
    let lectures = 0;
    let reponse: EtatNutrition | null = null;
    const lire = async () => { lectures++; return reponse; };

    invaliderNutrition();
    await etatNutrition("u9", lire);
    await etatNutrition("u9", lire);
    verdict(
      "V9A ter · une lecture ratée ne se met pas en cache",
      lectures === 2,
      "sinon un échec réseau figerait le contexte 30 s de plus, sans rien pour le dire",
    );
    reponse = etatN({ repas: [BARRES], calories: 286, proteines: 16 });
    verdict(
      "V9A ter · et le message suivant récupère tout seul",
      (await etatNutrition("u9", lire))?.calories === 286,
      "la récupération est immédiate, pas au bout du TTL",
    );
    invaliderNutrition();
  }

  /* ── 5. LES CONTRÔLES DE SOURCE ─────────────────────────────────── */
  {
    const lireF = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
    const net = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const CTX = net(lireF("src/context/AssistantContext.tsx"));
    const ROUTE = net(lireF("src/app/api/chat/route.ts"));
    const NUT = net(lireF("src/lib/guideNutrition.ts"));

    verdict(
      "V9A ter · le contexte remplace les QUATRE représentations du jour",
      CTX.includes("todayDate: nut.jour")
        && CTX.includes("mealsDetail: repasFrais(")
        && CTX.includes("nutritionWeek: semaineFraiche(")
        && CTX.includes("journalDuJourLu: true"),
      "une seule oubliée, et un fait supprimé survit dans le prompt",
    );
    verdict(
      "V9A ter · la route sait ÉCRIRE l’absence de repas",
      ROUTE.includes("aucun repas enregistré aujourd"),
      "une absence de ligne n’est pas une information d’absence",
    );
    verdict(
      "V9A ter · et elle ne l’écrit QUE si la journée a vraiment été lue",
      ROUTE.includes("} else if (rich.journalDuJourLu) {"),
      "le drapeau est la seule chose qui sépare « rien » de « je ne sais pas »",
    );
    verdict(
      "V9A ter · la note nutrition d’une séance lit le journal frais",
      CTX.includes("const buildNutritionNote = useCallback(async")
        && CTX.includes("await buildNutritionNote()"),
      "elle lisait l’instantané de session : c’était le troisième survivant",
    );
    verdict(
      "V9A ter · une journée vide sort de la moyenne au lieu d’y peser 0",
      semaineFraiche([{ date: JOUR, calories: 286, proteins: 16 }], etatN()).length === 0,
      "sinon la moyenne 7 jours plongerait au lieu de perdre un jour",
    );
    verdict(
      "V9A ter · le cache d’échec est refusé dans le module, pas seulement au banc",
      NUT.includes("cache = etat ? { userId, a: Date.now(), etat } : null;"),
      "un `null` veut dire « je ne sais pas » : on réessaie, on ne le garde pas",
    );
  }
}

/* ════════════════════════════════════════════════════════════════════
   V9B · LE GUIDE DÉPLACE ET RETIRE, ET IL NE DÉTRUIT PLUS RIEN EN SILENCE

   Deux défauts prouvés, tous deux ANTÉRIEURS à cette vague et tous deux
   MUETS, ce qui est le seul point commun qui compte :

   • `plan_set` composait `{ id: null, … }` sans identité de programme.
     `poser` visait alors « la première intention non résolue » du jour,
     or `ordonner` met justement l'étape en tête : une réservation V7A
     était donc réécrite, et `lienProgramme` écrivant ses trois colonnes
     même à `null`, elle cessait d'être une réservation. Toujours là,
     toujours prévue, mais sans son étape. Le curseur ne bougeait pas, le
     héros reproposait l'étape comme libre, et personne n'était prévenu.

   • `plan_regen` libérait TOUS les jours à venir : réservations,
     suppléments et séances posées à la main partaient ensemble, alors que
     le bouton d'Entraînement ne retire que le mobilier système depuis V5.

   ⚠️ TOUT CE QUI DÉCIDE EST PUR, ET C'EST CE QUI REND LA VAGUE
   VÉRIFIABLE : quelle ligne un geste vise, ce qu'il change pour le
   programme, ce qu'il préserve. Le reste est une propriété du CHEMIN (qui
   écrit, et qui n'écrit plus), donc des contrôles de SOURCE.
   ════════════════════════════════════════════════════════════════════ */
{
  const lireV9B = (f: string) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  const PLAN9B = lireV9B("src/lib/planning.ts");
  const GESTE = lireV9B("src/lib/gestePlanning.ts");
  const CTX9B = lireV9B("src/context/AssistantContext.tsx");

  const ex = [{ name: "Pompes", sets: 3, reps: "12 reps", rest: 60, restAfter: 90, tip: "", benefit: "", muscles: [] }];
  const inte = (over: Partial<PlanningDay> = {}): PlanningDay => ({
    id: "i1", date: "2026-09-10", type: "Force", title: "Push",
    difficulty: "Intermédiaire", location: "salle", exerciseList: ex,
    sessionId: null, status: "planned", origine: "systeme", ...over,
  });

  /* Les natures de ligne du modèle, telles qu'elles vivent vraiment en base. */
  const RESERVATION = inte({
    id: "r1", title: "Push", origine: "utilisateur",
    programmeId: "p1", etapeId: "e-push", provenanceId: "e-push", adaptationId: "a1",
  });
  const REGENEREE = inte({ id: "g1", title: "Pull", programmeId: "p1", provenanceId: "e-pull" });
  const SUPPLEMENT = inte({ id: "s1", title: "HIIT 20/10", type: "HIIT", origine: "utilisateur" });
  const FAITE = inte({ id: "f1", title: "Bas du corps", status: "done", origine: "utilisateur" });
  const CYCLE = [
    { id: "e-push", nom: "Push" },
    { id: "e-pull", nom: "Pull" },
    { id: "e-bas", nom: "Bas du corps" },
  ];

  /* ── 1. LE DÉFAUT `plan_set` : UNE RÉSERVATION N'EST PLUS UNE CIBLE ── */

  verdict(
    "V9B · une journée qui ne porte qu'une réservation n'a AUCUNE cible remplaçable",
    cibleRemplacable([RESERVATION]) === null,
    "c'est le défaut : `poser` la visait, et elle cessait d'être une réservation",
  );
  verdict(
    "V9B · une séance ordinaire, elle, reste remplaçable",
    cibleRemplacable([REGENEREE])?.id === "g1",
    "sa provenance disait d'où venait son contenu : le contenu change, elle tombe avec lui",
  );
  verdict(
    "V9B · avec une réservation ET un supplément, c'est le supplément qui est visé",
    cibleRemplacable([RESERVATION, SUPPLEMENT])?.id === "s1",
    "`ordonner` met l'étape en tête : c'est elle que l'ancienne règle prenait",
  );
  verdict(
    "V9B · une séance FAITE n'est jamais une cible",
    cibleRemplacable([FAITE]) === null,
    "réécrire un fait pour y mettre une intention, ce serait effacer l'historique",
  );
  verdict(
    "V9B · et une journée vide non plus",
    cibleRemplacable([]) === null && cibleRemplacable(null) === null,
    "le geste devient alors un ajout, jamais un écrasement",
  );
  verdict(
    "V9B · la réservation garde ses TROIS colonnes quand on réécrit la ligne",
    (() => {
      const l = lienProgramme(RESERVATION);
      return l.programme_id === "p1" && l.programme_seance_id === "e-push" && l.etape_consommee_id === "e-push";
    })(),
    "c'est exactement ce que `plan_set` remettait à null",
  );
  verdict(
    "V9B · une séance sans lien écrit toujours ses trois `null`",
    (() => {
      const l = lienProgramme(SUPPLEMENT);
      return l.programme_id === null && l.programme_seance_id === null && l.etape_consommee_id === null;
    })(),
    "le lien s'écrit TOUJOURS, même à null : c'est la règle posée en V7A",
  );

  /* ── 2. LE DÉFAUT `plan_regen` : CE QUI EST DU MOBILIER, ET CE QUI NE L'EST PAS ── */

  verdict(
    "V9B · une séance système encore prévue EST du mobilier",
    estMobilier(REGENEREE),
    "c'est ce que « refais ma semaine » a le droit de retirer",
  );
  verdict(
    "V9B · une RÉSERVATION n'est jamais du mobilier",
    !estMobilier(RESERVATION) && !estMobilier(inte({ etapeId: "e-push", programmeId: "p1" })),
    "même écrite par le système : une étape réservée ne se retire pas au passage",
  );
  verdict(
    "V9B · un SUPPLÉMENT posé à la main ou par le Guide n'est pas du mobilier",
    !estMobilier(SUPPLEMENT) && !estMobilier(inte({ origine: "guide" })),
    "l'ancienne libération les emportait avec le reste, sans un mot",
  );
  verdict(
    "V9B · une séance FAITE n'est pas du mobilier",
    !estMobilier(FAITE),
    "un fait ne se libère pas",
  );
  verdict(
    "V9B · une origine inconnue PROTÈGE la ligne au lieu de l'exposer",
    !estMobilier(inte({ origine: null })) && !estMobilier(inte({ origine: undefined })),
    "dans le doute on protège : le mauvais échec serait d'effacer ce qu'on n'a pas compris",
  );
  verdict(
    "V9B · et la colonne `origine` est enfin RELUE",
    PLAN9B.includes("etape_consommee_id, origine, created_at")
      && PLAN9B.includes("origine: (r.origine as Origine | null) ?? null,"),
    "sans elle, le Guide ne peut pas distinguer le mobilier d'une séance posée à la main",
  );

  /* ── 3. DÉSIGNER UNE LIGNE : L'IDENTITÉ D'ABORD, LE TITRE ENSUITE ── */

  const SEMAINE = [RESERVATION, REGENEREE, SUPPLEMENT, FAITE];

  verdict(
    "V9B · « déplace Push » passe par l'ÉTAPE du cycle, pas par le titre",
    (() => {
      const r = resoudreCibles(SEMAINE, { nom: "Push" }, CYCLE);
      return r.length === 1 && r[0].id === "r1";
    })(),
    "le nom est traduit en identité d'étape, puis on cherche qui la porte",
  );
  verdict(
    "V9B · une séance du catalogue nommée « Push » n'est PAS l'étape Push",
    (() => {
      const sosie = inte({ id: "x1", title: "Push", origine: "utilisateur" });
      const r = resoudreCibles([RESERVATION, sosie], { nom: "Push" }, CYCLE);
      return r.length === 1 && r[0].id === "r1";
    })(),
    "la ressemblance des titres ne désigne rien quand une identité existe",
  );
  verdict(
    "V9B · le titre reste le repli pour ce qui ne porte aucune identité",
    resoudreCibles(SEMAINE, { nom: "HIIT" }, CYCLE).map((d) => d.id).join() === "s1",
    "une séance perso ou du catalogue ne se désigne QUE par son nom",
  );
  verdict(
    "V9B · si aucune ligne ne porte l'étape, on retombe sur le titre",
    (() => {
      const sosie = inte({ id: "x1", title: "Push", origine: "utilisateur" });
      return resoudreCibles([sosie], { nom: "Push" }, CYCLE).map((d) => d.id).join() === "x1";
    })(),
    "sinon une séance visible à l'écran deviendrait introuvable pour le Guide",
  );
  verdict(
    "V9B · une séance FAITE n'est jamais désignée",
    resoudreCibles(SEMAINE, { nom: "Bas du corps" }, CYCLE).length === 0,
    "on ne déplace pas un fait, et on ne le retire pas non plus",
  );
  verdict(
    "V9B · un jour de repos n'est pas une séance à déplacer",
    resoudreCibles([inte({ id: "z1", type: "Repos", title: "Repos", exerciseList: [] })], {}, CYCLE).length === 0,
    "`hasSeance` tient la règle ici comme partout",
  );
  verdict(
    "V9B · le jour dit filtre, et le résultat est ordonné par date",
    (() => {
      const tard = inte({ id: "t1", date: "2026-09-14", title: "Pull", programmeId: "p1", provenanceId: "e-pull" });
      const tous = resoudreCibles([tard, REGENEREE], {}, CYCLE).map((d) => d.id).join();
      const cible = resoudreCibles([tard, REGENEREE], { date: "2026-09-14" }, CYCLE).map((d) => d.id).join();
      return tous === "g1,t1" && cible === "t1";
    })(),
    "« ma séance » veut dire la prochaine : le tri par date est une décision, pas un hasard",
  );
  verdict(
    "V9B · PLUSIEURS correspondances remontent toutes : c'est ce qui déclenche la question",
    resoudreCibles(
      [REGENEREE, inte({ id: "g2", date: "2026-09-12", title: "Pull", programmeId: "p1", provenanceId: "e-pull" })],
      { nom: "Pull" }, CYCLE,
    ).length === 2,
    "on demande laquelle, on n'écrit rien, et on ne repasse pas par le modèle",
  );
  verdict(
    "V9B · sans cycle lisible, on désigne par le titre et rien ne casse",
    resoudreCibles(SEMAINE, { nom: "Pull" }, null).map((d) => d.id).join() === "g1",
    "un programme illisible ne doit pas rendre le Guide muet",
  );
  verdict(
    "V9B · `etapeParNom` ne sort jamais du cycle persisté",
    etapeParNom(CYCLE, "Push")?.id === "e-push"
      && etapeParNom(CYCLE, "bas du corps")?.id === "e-bas"
      && etapeParNom(CYCLE, "Yoga") === null
      && etapeParNom(null, "Push") === null,
    "c'est la seule traduction nom vers identité de la vague, et elle est bornée",
  );

  /* ── 4. CE QU'UN DÉPLACEMENT PRÉSERVE ── */

  const deplacee: PlanningDay = { ...RESERVATION, date: "2026-09-12", status: "planned" };
  verdict(
    "V9B · déplacer une réservation garde ses trois identités de programme",
    deplacee.programmeId === "p1" && deplacee.etapeId === "e-push" && deplacee.provenanceId === "e-push",
    "elle change de jour, elle ne change pas de nature",
  );
  verdict(
    "V9B · elle garde aussi son identité de ligne et son adaptation",
    deplacee.id === "r1" && deplacee.adaptationId === "a1",
    "même `id` = un UPDATE, donc aucun doublon et aucune seconde réservation",
  );
  verdict(
    "V9B · déplacer une séance régénérée garde sa provenance",
    (() => {
      const d: PlanningDay = { ...REGENEREE, date: "2026-09-12", status: "planned" };
      const l = lienProgramme(d);
      return l.programme_seance_id === "e-pull" && l.etape_consommee_id === null;
    })(),
    "sinon l'adaptation cesserait de voir le conflit dès qu'on bouge la séance d'un jour",
  );
  verdict(
    "V9B · déplacer vers un jour occupé n'écrase rien",
    GESTE.includes('case "deplacer":') && GESTE.includes("await saveDay(userId, geste.jour, origine)")
      && PLAN9B.includes("const cible = day.id"),
    "c'est un UPDATE par identité : ce qui est posé au jour d'arrivée reste, la journée en porte deux",
  );
  verdict(
    "V9B · et la seule suppression au jour d'arrivée reste la règle repos/séance",
    PLAN9B.includes('i.status !== "done" && natureDe(i) !== natureDe(day)'),
    "elle ne touche jamais une intention faite, et jamais une séance de même nature",
  );

  /* ── 5. CE QUE LE GESTE ANNONCE, AVANT LE CLIC ── */

  verdict(
    "V9B · déplacer une réservation le DIT",
    consequenceDeplacement(RESERVATION).includes("séance de programme")
      && consequenceDeplacement(REGENEREE).includes("ne change pas"),
    "la conséquence se déduit de la ligne, jamais du modèle",
  );
  verdict(
    "V9B · retirer une réservation dit que l'étape RESTE",
    consequenceRetrait(RESERVATION).includes("tape reste dans ton programme")
      && consequenceRetrait(RESERVATION).includes("ni faite ni saut"),
    "elle n'est ni consommée ni sautée : elle sera reproposée",
  );
  verdict(
    "V9B · retirer un supplément dit que le cycle ne bouge pas",
    consequenceRetrait(SUPPLEMENT).includes("Ton cycle ne change pas"),
    "il ne réservait rien, donc il ne libère rien",
  );
  verdict(
    "V9B · poser à côté d'une réservation le DIT avant le clic",
    consequencePose(null, RESERVATION).includes("reste réservée")
      && consequencePose(SUPPLEMENT, null).includes("ne change pas")
      && consequencePose(null, null).startsWith("Rien"),
    "c'est le contraire de `plan_set`, qui l'écrasait sans un mot",
  );
  verdict(
    "V9B · la semaine régénérée NOMME les jours qu'elle garde",
    consequenceSemaine([]).includes("posées automatiquement")
      && consequenceSemaine(["jeudi"]).includes("jeudi ne bouge pas")
      && consequenceSemaine(["jeudi", "vendredi"]).includes("jeudi et vendredi ne bougent pas"),
    "« refais ma semaine » ne veut pas dire « efface tout ce qui était prévu »",
  );

  /* ── 6. LES CONTRÔLES DE SOURCE : DES PROPRIÉTÉS DU CHEMIN ── */

  verdict(
    "V9B · `poser` passe par la règle unique de ciblage",
    PLAN9B.includes("cibleRemplacable(jour)?.id ?? null")
      && !PLAN9B.includes('ordonner(jour).find((i) => i.status !== "done")?.id'),
    "une seconde règle écrite ailleurs annoncerait autre chose que ce qui s'écrit",
  );
  verdict(
    "V9B · une mise à jour qui ne touche AUCUNE ligne échoue au lieu de se taire",
    PLAN9B.includes("if (!data || data.length === 0) throw new Error"),
    "le Guide déclare son identité à l'affichage et l'écrit au clic : entre les deux, elle peut disparaître",
  );
  verdict(
    "V9B · et une écriture ne réécrit jamais une séance FAITE",
    /\.update\(dayToRow\([\s\S]{0,900}?\.neq\(sc\.colStatut, sc\.versBase\.done\)[\s\S]{0,300}?\.select\("id"\)/.test(PLAN9B),
    "`retirerIntention` portait ce filtre depuis V8, `poser` ne l'avait pas",
  );
  verdict(
    "V9B · la libération du Guide ne vise QUE le mobilier",
    PLAN9B.includes('.eq("origine", "systeme")')
      && PLAN9B.includes('.is("etape_consommee_id", null)'),
    "les trois conditions d'`estMobilier`, appliquées en base et pas sur ce que l'écran a lu",
  );
  verdict(
    "V9B · `confirmPlan` n'écrit plus rien lui-même",
    CTX9B.includes("await appliquerGeste(user.id, pendingPlan.geste")
      && !CTX9B.includes("await libererJours(")
      && !/for \(const w of pendingPlan\.writes\)/.test(CTX9B),
    "il décidait de la portée d'une suppression : c'était le second moteur de planning",
  );
  verdict(
    "V9B · plus aucune libération à la journée entière depuis le Guide",
    !CTX9B.includes("libererJours"),
    "elle emportait réservations et suppléments, et la carte n'en disait rien",
  );
  verdict(
    "V9B · l'autorité d'application ne fait que ROUTER",
    GESTE.includes("await saveDay(") && GESTE.includes("await ajouterIntention(")
      && GESTE.includes("await retirerIntention(") && GESTE.includes("await libererMobilier(")
      && !GESTE.includes(".from("),
    "aucune requête à elle : ajouter un geste en V9C ne doit pas rouvrir un moteur ici",
  );
  verdict(
    "V9B · le retrait passe UNIQUEMENT par `retirerIntention`, et n'écrit aucun statut",
    GESTE.includes("await retirerIntention(userId, geste.intentionId)")
      && !GESTE.includes('"passee"') && !GESTE.includes('"skipped"') && !GESTE.includes('"done"'),
    "écrire un statut dirait qu'une séance a été écartée alors qu'elle n'a jamais eu lieu",
  );
  verdict(
    "V9B · préparer une carte n'écrit RIEN",
    (() => {
      const bloc = (CTX9B.match(/const preparerSurCible = useCallback\(async \([\s\S]*?\n  \}, \[idPlanning\]\);/) ?? [""])[0];
      return bloc.length > 400 && !/appliquerGeste\(|\.insert\(|\.update\(|\.delete\(|saveDay\(|retirerIntention\(/.test(bloc);
    })(),
    "aucune écriture sans clic : c'est le bouton violet qui écrit",
  );
  verdict(
    "V9B · le Guide DÉCLARE l'identité qu'il vise, il ne la laisse plus deviner",
    CTX9B.includes("const cible = cibleRemplacable(jourVise)")
      && CTX9B.includes("id: cible?.id ?? null")
      && CTX9B.includes('geste: cible ? { type: "remplacer", jour: day } : { type: "ajouter", jour: day }'),
    "sans `id`, la base choisissait, et elle choisissait justement la réservation",
  );
  verdict(
    "V9B · la régénération ne libère que les jours qu'elle a le droit de toucher",
    CTX9B.includes("const garde = (d: string) => (existing[d] ?? []).some((i) => !estMobilier(i))")
      && CTX9B.includes('geste: { type: "semaine", poser: writes, liberer: modifiables }'),
    "un jour qui porte autre chose que du mobilier n'est ni libéré ni réécrit",
  );
  verdict(
    "V9B · une ambiguïté se lève par un IDENTIFIANT, jamais en renvoyant la phrase au modèle",
    CTX9B.includes('genre: "cible"') && CTX9B.includes("void lireIntention(compte, trouve.id)"),
    "renvoyer « jeudi 10 » à l'aiguilleur rouvrirait l'ambiguïté qu'on vient de lever",
  );
  verdict(
    "V9B · changer le jour d'une carte relit la journée d'arrivée",
    CTX9B.includes("void lireJour(compte, ymd).then")
      && CTX9B.includes("recalerCarte(prev, ymd, cibleRemplacable(jour)"),
    "sinon la carte annonce un jour et l'écriture en vise un autre",
  );
  verdict(
    "V9B · l'aiguilleur a gagné `plan_retirer`, et rien de plus",
    ASSISTANT_TOOLS.some((t) => t.function.name === "plan_retirer")
      && !ASSISTANT_TOOLS.some((t) => /sauter|substitu|supplement|adaptation/.test(t.function.name)),
    "saut, substitution, supplément et adaptation attendent V9C et V9D",
  );
  verdict(
    "V9B · `plan_move` comprend enfin CE QU'ON déplace",
    (() => {
      const move = ASSISTANT_TOOLS.find((t) => t.function.name === "plan_move");
      const ret = ASSISTANT_TOOLS.find((t) => t.function.name === "plan_retirer");
      return !!move && "quoi" in move.function.parameters.properties
        && !!ret && "quoi" in ret.function.parameters.properties
        && !move.function.parameters.required && !ret.function.parameters.required;
    })(),
    "« mets Bas du corps à vendredi » nomme la séance, et le jour cesse d'être obligatoire",
  );
}

console.log("\n" + (echecs === 0 ? "Tout passe." : echecs + " échec(s)."));
process.exit(echecs === 0 ? 0 : 1);
