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
import { cycleDeReference, seancesDuCycle, previewWeek, weekDates, ANCIEN, NOUVEAU } from "@/lib/planning";

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
  for (const nom of ["lireSemaine", "fetchDay", "fetchRange"]) {
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

console.log("\n" + (echecs === 0 ? "Tout passe." : echecs + " échec(s)."));
process.exit(echecs === 0 ? 0 : 1);
