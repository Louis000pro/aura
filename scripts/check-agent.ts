/* ════════════════════════════════════════════════════════════════════
   check:agent — le banc HORS LIGNE du test « agent » (2026-10-13).

     npm run check:agent

   Il ne parle à aucun modèle : un faux modèle joue des scripts d'appels
   d'outils, et l'on vérifie que la boucle, le planning simulé et le
   correcteur disent ce qu'ils doivent dire. Le vrai test (le vrai modèle,
   30 formulations) tourne sur la préversion, par /api/preuve-agent.

   Un correcteur qui ne sait pas échouer ne prouve rien : chaque témoin
   ci-dessous doit faire tomber le critère qu'il vise, et lui seul.
   ════════════════════════════════════════════════════════════════════ */
import { jouerAgent, type AppelerModele } from "@/lib/agent/boucle";
import { compteDeTest, corriger, OUTILS_PLANNING, projeter } from "@/lib/agent/banc/planningSimule";
import { FORMULATIONS, type Periode } from "@/lib/agent/banc/formulations";
import { consigneCourte, consigneLongue } from "@/lib/agent/banc/consigne";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " — " + detail : ""));
}

type Geste = [string, Record<string, unknown>];

/** Un faux modèle qui joue un script, étape par étape, puis présente. */
function script(etapes: Geste[][], message = "Je t'ai préparé ça, tu valides ?"): AppelerModele {
  let i = 0;
  return async () => {
    const gestes = i < etapes.length ? etapes[i] : [["presenter_apercu", { message }] as Geste];
    i++;
    return {
      texte: null,
      appels: gestes.map(([nom, args], k) => ({ id: `appel-${i}-${k}`, nom, arguments: JSON.stringify(args) })),
      jetonsEntree: 100,
      jetonsSortie: 20,
      finRaison: "tool_calls",
    };
  };
}

async function jouer(etapes: Geste[][], periode: Periode = "ce_mois", appeler?: AppelerModele) {
  const initial = compteDeTest();
  const etat = compteDeTest();
  const cr = await jouerAgent({ consigne: "test", demande: "test", outils: OUTILS_PLANNING, etat, appeler: appeler ?? script(etapes) });
  return { cr, etat, v: corriger(initial, etat, periode, cr.fin, cr.messageFinal) };
}

const LIRE: Geste[] = [["lire_programme", {}], ["lire_planning", { du: "2026-10-13", au: "2026-10-31" }]];
const REPORTS_OCTOBRE: Geste = ["poser_exceptions", { exceptions: [
  { date: "2026-10-14", genre: "pas_de_seance" }, { date: "2026-10-15", genre: "seance_en_plus" },
  { date: "2026-10-21", genre: "pas_de_seance" }, { date: "2026-10-22", genre: "seance_en_plus" },
  { date: "2026-10-28", genre: "pas_de_seance" }, { date: "2026-10-29", genre: "seance_en_plus" },
] }];
const ADAPTE_OCTOBRE: Geste = ["adapter_periode", { debut: "2026-10-13", fin: "2026-10-31", duree_max_min: 30, accent_zones: ["fessiers"] }];

async function main() {
  // ── Le faux compte et sa projection ──
  const p = projeter(compteDeTest(), "2026-10-25");
  const seances = p.filter((j) => j.seance).map((j) => `${j.date.slice(8)} ${j.seance!.etape}`);
  verdict("projection : le cycle reprend à Haut du corps, lundi-mercredi-vendredi",
    seances.join(" | ") === "14 Haut du corps | 16 Bas du corps | 19 Full Body | 21 Haut du corps | 23 Bas du corps",
    seances.join(" | "));
  verdict("30 formulations", FORMULATIONS.length === 30, String(FORMULATIONS.length));
  verdict("consigne courte < consigne longue", consigneCourte().length < consigneLongue().length,
    `${consigneCourte().length} / ${consigneLongue().length} caractères`);

  // ── Le bon chemin ──
  const bon = await jouer([LIRE, [REPORTS_OCTOBRE], [ADAPTE_OCTOBRE], [["lire_planning", { du: "2026-10-13", au: "2026-11-15" }]]]);
  verdict("le bon chemin réussit", bon.v.reussi && bon.cr.fin === "apercu", bon.v.details.join(" ; ") || `${bon.cr.etapes.length} étapes`);
  const apresReport = projeter(bon.etat, "2026-10-17").filter((j) => j.seance).map((j) => j.date.slice(8));
  verdict("le report garde l'ordre : jeudi puis vendredi", apresReport.join(",") === "15,16", apresReport.join(","));

  // Le même résultat par l'outil qui calcule les dates à la place du modèle.
  const parJours = await jouer([LIRE, [["changer_jours_periode", { du: "2026-10-13", au: "2026-10-31", retirer: ["mercredi"], ajouter: ["jeudi"] }]], [ADAPTE_OCTOBRE]]);
  verdict("par jours de la semaine : mercredis retirés, jeudis ajoutés, réussi",
    parJours.v.reussi && Object.keys(parJours.etat.exceptions).sort().join(",") === "2026-10-14,2026-10-15,2026-10-21,2026-10-22,2026-10-28,2026-10-29",
    Object.keys(parJours.etat.exceptions).sort().join(",") + " " + parJours.v.details.join(" ; "));
  const jours = OUTILS_PLANNING.find((o) => o.nom === "changer_jours_periode")!;
  const mauvais = jours.executer({ du: "2026-10-13", au: "2026-10-31", retirer: ["dimanche"] }, compteDeTest()) as { erreur?: string };
  verdict("par jours de la semaine : retirer un jour qui n'est pas habituel est refusé", !!mauvais.erreur, mauvais.erreur);

  // ── Les témoins : chacun doit faire tomber SON critère ──
  const permanent = await jouer([LIRE, [["changer_jours_habituels", { jours: ["lundi", "jeudi", "vendredi"] }], ["changer_priorites", { zones: ["fessiers"] }]], [["adapter_periode", { debut: "2026-10-13", fin: "2026-10-31", duree_max_min: 30, accent_zones: ["fessiers"] }]]]);
  verdict("témoin « pour de bon » → périmètre", !permanent.v.criteres.perimetre && permanent.v.criteres.mercredi, permanent.v.details.join(" ; "));

  const oubli = await jouer([LIRE, [ADAPTE_OCTOBRE]]);
  verdict("témoin « mercredi oublié » → mercredi", !oubli.v.criteres.mercredi && oubli.v.criteres.duree && oubli.v.criteres.accent, oubli.v.details.join(" ; "));

  const sansReport = await jouer([LIRE, [["poser_exceptions", { exceptions: [
    { date: "2026-10-14", genre: "pas_de_seance" }, { date: "2026-10-21", genre: "pas_de_seance" }, { date: "2026-10-28", genre: "pas_de_seance" },
  ] }]], [ADAPTE_OCTOBRE]]);
  verdict("témoin « mercredis retirés sans report » → nombre", !sansReport.v.criteres.nombre && sansReport.v.criteres.mercredi, sansReport.v.details.join(" ; "));

  const tropLoin = await jouer([LIRE, [REPORTS_OCTOBRE], [["adapter_periode", { debut: "2026-10-13", fin: "2026-11-30", duree_max_min: 30, accent_zones: ["fessiers"] }]]], "fin_du_mois");
  verdict("témoin « adaptation trop longue » → périmètre", !tropLoin.v.criteres.perimetre, tropLoin.v.details.join(" ; "));

  const deux = await jouer([LIRE, [REPORTS_OCTOBRE], [["adapter_periode", { debut: "2026-10-13", fin: "2026-10-31", duree_max_min: 30 }]], [["adapter_periode", { debut: "2026-10-13", fin: "2026-10-31", accent_zones: ["fessiers"] }]]]);
  const refus = deux.cr.etapes.flatMap((e) => e.gestes).filter((g) => g.refuse).length;
  verdict("témoin « deux adaptations » → la seconde est refusée, l'accent manque", refus === 1 && !deux.v.criteres.accent && deux.v.criteres.duree, `${refus} refus ; ` + deux.v.details.join(" ; "));

  const question: AppelerModele = async () => ({ texte: "Tu veux combien de séances ?", appels: [], jetonsEntree: 50, jetonsSortie: 10, finRaison: "stop" });
  const q = await jouer([], "ce_mois", question);
  verdict("témoin « pose une question » → aperçu", !q.v.criteres.apercu && q.cr.fin === "texte", q.v.details.join(" ; "));

  const unMois = await jouer([LIRE, [REPORTS_OCTOBRE], [["adapter_periode", { debut: "2026-10-13", fin: "2026-11-12", duree_max_min: 30, accent_zones: ["fessiers"] }]]], "un_mois");
  verdict("témoin « un mois, mercredis traités en octobre seulement » → mercredi", !unMois.v.criteres.mercredi, unMois.v.details.join(" ; "));

  // Finir en parlant APRÈS avoir tout préparé vaut aperçu, avec un avertissement.
  let tour = 0;
  const parle: AppelerModele = async () => {
    tour++;
    if (tour === 1) return { texte: null, appels: [REPORTS_OCTOBRE, ADAPTE_OCTOBRE].map(([nom, args], k) => ({ id: `p-${k}`, nom, arguments: JSON.stringify(args) })), jetonsEntree: 1, jetonsSortie: 1, finRaison: "tool_calls" };
    return { texte: "Je t'ai préparé ça, valide quand tu veux.", appels: [], jetonsEntree: 1, jetonsSortie: 1, finRaison: "stop" };
  };
  const enParlant = await jouer([], "ce_mois", parle);
  verdict("finir en parlant après avoir tout préparé → réussi, avec avertissement",
    enParlant.v.reussi && enParlant.v.avertissements.length === 1, enParlant.v.avertissements.join(" ; "));

  // ── Ce que les outils rendent au modèle ──
  const lire = OUTILS_PLANNING.find((o) => o.nom === "lire_planning")!;
  const lu = lire.executer({ du: "2026-10-12", au: "2026-10-15" }, compteDeTest()) as { jours: string[] };
  verdict("lecture compacte, une ligne par jour",
    lu.jours.join(" | ") === "2026-10-12 lundi : Full Body (faite) | 2026-10-13 mardi : rien | 2026-10-14 mercredi : Haut du corps, 45 min | 2026-10-15 jeudi : rien",
    lu.jours.join(" | "));
  const poserSeul = OUTILS_PLANNING.find((o) => o.nom === "poser_exceptions")!;
  const seul = poserSeul.executer({ exceptions: [{ date: "2026-10-14", genre: "pas_de_seance" }] }, compteDeTest()) as { consequences?: string[] };
  verdict("retirer un mercredi sans report : la conséquence est dite", seul.consequences?.[0] === "semaine du lundi 12 octobre : 2 → 1 séance(s)", String(seul.consequences));
  const paire = poserSeul.executer({ exceptions: [{ date: "2026-10-14", genre: "pas_de_seance" }, { date: "2026-10-15", genre: "seance_en_plus" }] }, compteDeTest()) as { consequences?: string[] };
  verdict("un report dans la même semaine ne signale rien", !paire.consequences, String(paire.consequences));

  // ── Les refus des outils ──
  const etat = compteDeTest();
  const poser = OUTILS_PLANNING.find((o) => o.nom === "poser_exceptions")!;
  const r = poser.executer({ exceptions: [
    { date: "2026-10-12", genre: "pas_de_seance" },
    { date: "2026-10-16", genre: "seance_en_plus" },
    { date: "2026-10-15", genre: "pas_de_seance" },
  ] }, etat) as { preparees: string[]; refusees?: string[] };
  verdict("exceptions : passé, jour déjà habituel et jour vide refusés", (r.refusees?.length ?? 0) === 3 && r.preparees.length === 0, (r.refusees ?? []).join(" | "));
  const adapter = OUTILS_PLANNING.find((o) => o.nom === "adapter_periode")!;
  const z = adapter.executer({ debut: "2026-10-13", fin: "2026-10-31", accent_zones: ["fesses"] }, compteDeTest()) as { ok?: boolean };
  verdict("adaptation : « fesses » se comprend comme fessiers", z.ok === true);

  console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
  process.exit(echecs ? 1 : 0);
}

main();
