/* ════════════════════════════════════════════════════════════════════
   check:agent — le banc HORS LIGNE du test « agent » (2026-10-13).

     npm run check:agent

   Il ne parle à aucun modèle : un faux modèle joue des scripts d'appels
   d'outils, et l'on vérifie que la boucle, le planning simulé et le
   correcteur disent ce qu'ils doivent dire. Le vrai test (le vrai modèle)
   a tourné sur une préversion, par une route temporaire retirée depuis :
   voir docs/planning-sur-mesure/test-agent.md.

   Un correcteur qui ne sait pas échouer ne prouve rien : chaque témoin
   ci-dessous doit faire tomber le critère qu'il vise, et lui seul.
   ════════════════════════════════════════════════════════════════════ */
import { FIN_EN_PARLANT, jouerAgent, type AppelerModele } from "@/lib/agent/boucle";
import { compteDeTest, controlerPlanning, corriger, OUTILS_PLANNING, projeter } from "@/lib/agent/banc/planningSimule";
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

async function jouer(etapes: Geste[][], periode: Periode = "ce_mois", appeler?: AppelerModele, avecControle = false) {
  const initial = compteDeTest();
  const etat = compteDeTest();
  const cr = await jouerAgent({
    consigne: "test", demande: "test", outils: OUTILS_PLANNING, etat, appeler: appeler ?? script(etapes),
    controle: avecControle ? controlerPlanning(initial) : undefined,
  });
  return { cr, etat, v: corriger(initial, etat, periode, cr.fin, cr.messageFinal) };
}

/** Un faux modèle qui joue des gestes, ou finit en parlant (une chaîne). */
function scriptMixte(tours: (Geste[] | string)[]): AppelerModele {
  let i = 0;
  return async () => {
    const tour = i < tours.length ? tours[i] : [["presenter_apercu", { message: "Voilà, tu valides ?" }] as Geste];
    i++;
    if (typeof tour === "string") return { texte: tour, appels: [], jetonsEntree: 1, jetonsSortie: 1, finRaison: "stop" };
    return { texte: null, appels: tour.map(([nom, args], k) => ({ id: `m-${i}-${k}`, nom, arguments: JSON.stringify(args) })), jetonsEntree: 1, jetonsSortie: 1, finRaison: "tool_calls" };
  };
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

  const enTrop = await jouer([LIRE, [REPORTS_OCTOBRE, ["poser_exceptions", { exceptions: [{ date: "2026-10-17", genre: "seance_en_plus" }] }]], [ADAPTE_OCTOBRE]]);
  verdict("témoin « une séance en trop » → nombre", !enTrop.v.criteres.nombre && enTrop.v.criteres.mercredi, enTrop.v.details.join(" ; "));

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

  // ── Le contrôle de fin : deux règles, valables pour n'importe quelle demande ──
  const controle = controlerPlanning(compteDeTest());
  const refuse = { outil: "adapter_periode", arguments: {}, resultat: { erreur: "Une adaptation ne commence pas dans le passé." }, refuse: true };
  const reussi = { outil: "adapter_periode", arguments: {}, resultat: { ok: true }, refuse: false };
  const seulRefus = controle(compteDeTest(), [refuse]);
  verdict("contrôle : un refus sans suite est signalé, avec sa raison",
    seulRefus.length === 1 && seulRefus[0].includes("adapter_periode") && seulRefus[0].includes("dans le passé"), seulRefus.join(" | "));
  verdict("contrôle : un refus suivi d'un succès ne l'est plus", controle(compteDeTest(), [refuse, reussi]).length === 0);
  const sansMercredis = compteDeTest();
  jours.executer({ du: "2026-10-13", au: "2026-10-31", retirer: ["mercredi"] }, sansMercredis);
  const semaines = controle(sansMercredis, []);
  verdict("contrôle : les trois semaines qui perdent une séance sont signalées",
    semaines.length === 3 && semaines[0].startsWith("semaine du lundi 12 octobre : 2 séance(s) prévue(s) avant tes changements, 1 maintenant"), semaines.join(" | "));
  const vacances = compteDeTest();
  OUTILS_PLANNING.find((o) => o.nom === "poser_absence")!.executer({ debut: "2026-10-19", fin: "2026-10-25" }, vacances);
  verdict("contrôle : une absence retire des séances sans être un problème", controle(vacances, []).length === 0, controle(vacances, []).join(" | "));
  const parJoursComplet = compteDeTest();
  jours.executer({ du: "2026-10-13", au: "2026-10-31", retirer: ["mercredi"], ajouter: ["jeudi"] }, parJoursComplet);
  verdict("contrôle : mercredis reportés au jeudi, rien à redire", controle(parJoursComplet, []).length === 0);

  /* L'essai raté du 2026-10-13 (B1), rejoué tel quel : adaptation datée
     dans le passé (refusée, jamais retentée), mercredis retirés sans
     report, puis conclusion en parlant. */
  const B1: (Geste[] | string)[] = [
    [["adapter_periode", { debut: "2026-10-01", fin: "2026-10-31", duree_max_min: 30, accent_zones: ["fessiers"] }]],
    [["changer_jours_periode", { du: "2026-10-14", au: "2026-10-31", retirer: ["mercredi"] }]],
    "Voici les changements préparés : pas de séance le mercredi, 30 minutes, focus fessiers.",
  ];
  const sansControle = await jouer([], "ce_mois", scriptMixte(B1));
  verdict("B1 sans contrôle : échoue comme sur la préversion", !sansControle.v.reussi && sansControle.cr.fin === "texte", sansControle.v.details.join(" ; "));
  const corrige: (Geste[] | string)[] = [
    ...B1,
    [ADAPTE_OCTOBRE, ["changer_jours_periode", { du: "2026-10-14", au: "2026-10-31", ajouter: ["jeudi"] }]],
  ];
  const avec = await jouer([], "ce_mois", scriptMixte(corrige), true);
  verdict("B1 avec contrôle : renvoyé une fois au travail (4 problèmes + fini en parlant), puis réussi",
    avec.v.reussi && avec.cr.fin === "apercu" && avec.cr.relances.length === 1 && avec.cr.relances[0].length === 5 && avec.cr.relances[0][4] === FIN_EN_PARLANT,
    `${avec.cr.relances.length} relance(s), ${avec.cr.relances[0]?.length ?? 0} problème(s) ; ` + avec.v.details.join(" ; "));

  // Finir en parlant sans rien à corriger : renvoyé une fois vers l'aperçu, pas deux.
  const parleBien = await jouer([], "ce_mois", scriptMixte([[ADAPTE_OCTOBRE, ["changer_jours_periode", { du: "2026-10-13", au: "2026-10-31", retirer: ["mercredi"], ajouter: ["jeudi"] }]], "C'est prêt, tu valides ?"]), true);
  verdict("contrôle : finir en parlant renvoie vers presenter_apercu, une fois",
    parleBien.cr.fin === "apercu" && parleBien.v.reussi && parleBien.cr.relances.length === 1 && parleBien.cr.relances[0].join() === FIN_EN_PARLANT,
    `${parleBien.cr.fin}, ${JSON.stringify(parleBien.cr.relances)}`);
  const parleDeuxFois = await jouer([], "ce_mois", scriptMixte([[ADAPTE_OCTOBRE], "C'est prêt.", "C'est prêt, je te jure."]), true);
  verdict("contrôle : s'il reparle, on le laisse conclure (et le correcteur juge)",
    parleDeuxFois.cr.fin === "texte" && parleDeuxFois.cr.relances.length === 1, `${parleDeuxFois.cr.fin}, ${parleDeuxFois.cr.relances.length} relance(s)`);

  /* Un nom d'outil écorché (C2 : « resenter_apercu ») : le fournisseur
     refuse toute la réponse. La boucle le montre à l'agent au lieu de
     s'arrêter, deux fois au plus. */
  const ecorche = (fois: number, message = "400 Tool call validation failed: tool call validation failed: attempted to call tool 'resenter_apercu' which was not in request.tools"): AppelerModele => {
    let tour = 0;
    const suite = scriptMixte([[ADAPTE_OCTOBRE, ["changer_jours_periode", { du: "2026-10-13", au: "2026-10-31", retirer: ["mercredi"], ajouter: ["jeudi"] }]]]);
    return async (m, o) => {
      tour++;
      if (tour > 1 && tour <= 1 + fois) throw Object.assign(new Error(message), { status: 400 });
      return suite(m, o);
    };
  };
  const rattrape = await jouer([], "ce_mois", ecorche(1), true);
  verdict("appel d'outil illisible : rattrapé, puis réussi", rattrape.cr.fin === "apercu" && rattrape.v.reussi && rattrape.cr.illisibles === 1,
    `${rattrape.cr.fin}, ${rattrape.cr.illisibles} illisible(s) ${rattrape.cr.erreur ?? ""}`);
  const troisFois = await jouer([], "ce_mois", ecorche(3), true);
  verdict("appel d'outil illisible trois fois : c'est une panne", troisFois.cr.fin === "erreur" && troisFois.cr.illisibles === 2, `${troisFois.cr.fin}, ${troisFois.cr.illisibles}`);
  const autre400 = await jouer([], "ce_mois", ecorche(1, "400 context length exceeded"), true);
  verdict("une autre erreur 400 reste une panne", autre400.cr.fin === "erreur" && autre400.cr.illisibles === 0, `${autre400.cr.fin}`);

  // Un agent qui ignore le contrôle conclut quand même : le code signale, il ne bloque pas à l'infini.
  const tetu = await jouer([], "ce_mois", scriptMixte([B1[1], [["presenter_apercu", { message: "Voilà." }]], [["presenter_apercu", { message: "Voilà." }]]]), true);
  verdict("contrôle : signalé une fois, puis l'agent peut conclure",
    tetu.cr.fin === "apercu" && tetu.cr.relances.length === 1 && !tetu.v.criteres.nombre,
    `${tetu.cr.fin}, ${tetu.cr.relances.length} relance(s)`);

  console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
  process.exit(echecs ? 1 : 0);
}

main();
