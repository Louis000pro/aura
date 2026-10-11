import assert from "node:assert/strict";
import { verdictCibleReprise } from "@/lib/cibleReprise";
import { avancementDeReprise, decoderReprise, DUREE_REPRISE, effacerReprise, lireReprise, marquesDeReprise, observerReprise, positionDeReprise, prendreVerrouSeance, sauverReprise, type SeanceInterrompue } from "@/lib/seanceInterrompue";

const MOI = "00000000-0000-4000-8000-000000000001";
const AUTRE = "00000000-0000-4000-8000-000000000002";
const RUN = "00000000-0000-4000-8000-000000000003";
const RUN2 = "00000000-0000-4000-8000-000000000004";
const maintenant = Date.now();
const base: SeanceInterrompue = {
  version: 1, userId: MOI, executionId: RUN, demarreeLe: maintenant, actualiseeLe: maintenant,
  seance: { sessionId: "express-12", title: "Express 12", duration: 12, difficulty: "Débutant", heroImage: "/entrainement/push-pompes.webp",
    exerciseList: [
      { name: "Pompes", sets: 3, reps: "10 reps", rest: 45, tip: "Le geste", benefit: "Le bénéfice", muscles: ["Pectoraux"] },
      { name: "Planche", sets: 2, reps: "30 sec", auto: 30, rest: 30, tip: "", benefit: "", muscles: ["Abdos"] },
      { name: "Burpees", sets: 3, reps: "20 sec", hiit: true, rest: 0, tip: "", benefit: "", muscles: ["Corps entier"] },
    ] },
  avancement: { phase: "exercising", exerciseIdx: 0, setIdx: 1, doneMap: { 0: { 0: true } }, elapsed: 684,
    restCountdown: 0, restTotal: 0, restMode: "set", autoCountdown: 0, prep: 0, hiitSub: "work" },
};
let nombre = 0;
function verifier(nom: string, f: () => void) { f(); nombre++; console.log("[OK] " + nom); }
const copie = () => structuredClone(base);
const decoder = (b: unknown, compte = MOI, horloge = maintenant) => decoderReprise(JSON.stringify(b), compte, horloge);

verifier("reload : contenu, position et séries validées identiques", () => assert.deepEqual(decoder(base), base));
verifier("compte voisin : aucune reprise ni contenu", () => assert.equal(decoder(base, AUTRE), null));
verifier("fin, introduction et ancienne version ne se restaurent jamais", () => {
  for (const phase of ["done", "intro", "autre"]) { const b = copie(); (b.avancement as { phase: string }).phase = phase; assert.equal(decoder(b), null); }
  assert.equal(decoder({ ...base, version: 2 }), null);
});
verifier("plusieurs heures d’absence : zéro seconde ajoutée", () => {
  const b = decoder(base, MOI, maintenant + 4 * 60 * 60_000)!;
  assert.equal(avancementDeReprise(b).elapsed, 684);
  assert.deepEqual(positionDeReprise(b), b.avancement);
});
verifier("expiration : veille acceptée, sept jours refusés", () => {
  assert.ok(decoder(base, MOI, maintenant + DUREE_REPRISE - 1));
  assert.equal(decoder(base, MOI, maintenant + DUREE_REPRISE), null);
  assert.equal(decoder({ ...base, actualiseeLe: maintenant + 120_000 }), null);
});
verifier("JSON abîmé et taille excessive refusés sans exception", () => {
  for (const brut of ["{", "null", "[]", "{}", "x".repeat(250_001)]) assert.equal(decoderReprise(brut, MOI), null);
});
verifier("aucun index hors des exercices ou des séries", () => {
  for (const champ of ["exerciseIdx", "setIdx"] as const) {
    for (const valeur of [-1, 100, 0.5, NaN]) { const b = copie(); b.avancement[champ] = valeur; assert.equal(decoder(b), null); }
  }
});
verifier("durées et compteurs hors bornes refusés", () => {
  for (const champ of ["elapsed", "restTotal", "restCountdown", "autoCountdown", "prep"] as const) {
    for (const valeur of [-1, Infinity, 0.5]) { const b = copie(); b.avancement[champ] = valeur; assert.equal(decoder(b), null); }
  }
});
verifier("gainage : préparation ajoutée sans raccourcir l’effort", () => {
  const b = copie(); Object.assign(b.avancement, { exerciseIdx: 1, setIdx: 0, autoCountdown: 23 });
  assert.ok(decoder(b)); const reprise = avancementDeReprise(b);
  assert.equal(reprise.prep, 3); assert.equal(reprise.autoCountdown, 23);
  b.avancement.autoCountdown = 31; assert.equal(decoder(b), null);
});
verifier("HIIT : récupération conservée, sans fausse préparation d’effort", () => {
  const b = copie(); Object.assign(b.avancement, { exerciseIdx: 2, setIdx: 0, hiitSub: "rest", autoCountdown: 7 });
  assert.ok(decoder(b)); assert.equal(avancementDeReprise(b).prep, 0); assert.equal(avancementDeReprise(b).autoCountdown, 7);
  b.avancement.hiitSub = "work"; b.avancement.autoCountdown = 14;
  assert.equal(avancementDeReprise(b).prep, 3); assert.equal(avancementDeReprise(b).autoCountdown, 14);
});
verifier("repos entre séries : prochaine série affichée, repos gardé", () => {
  const b = copie(); Object.assign(b.avancement, { phase: "resting", setIdx: 0, restCountdown: 23, restTotal: 45 });
  assert.ok(decoder(b)); assert.deepEqual(positionDeReprise(b), { exerciseIdx: 0, setIdx: 1 });
  assert.equal(avancementDeReprise(b).restCountdown, 23);
  b.avancement.doneMap = {}; assert.equal(decoder(b), null);
});
verifier("transition : prochain exercice affiché, dernier set reste coché", () => {
  const b = copie(); Object.assign(b.avancement, { phase: "resting", setIdx: 2, restMode: "exercise", restCountdown: 23, restTotal: 45, doneMap: { 0: { 0: true, 1: true, 2: true } } });
  assert.ok(decoder(b)); assert.deepEqual(positionDeReprise(b), { exerciseIdx: 1, setIdx: 0 });
});
verifier("retour à un exercice terminé : les marques restent conservées", () => {
  const b = copie(); b.avancement.doneMap[0][1] = true; assert.ok(decoder(b));
});
verifier("R3 : séries, charges, répétitions et remplaçants survivent ensemble", () => {
  const b = copie();
  const exercice = { cle: "pompes", nom: "Pompes", chargeType: "poids_du_corps" as const };
  b.avancement.doneMap = {0: {0: {statut:"terminee",validation:"bouton",dureeS:null,reps:12,charge:null,exercice,marge:"1_2"}}};
  b.avancement.remplacements = {0: exercice}; b.avancement.chargeCourante = {0:null};
  b.avancement.repsSaisie = {emplacement:0,serie:1,reps:11}; b.avancement.questionsPosees=[0];
  assert.deepEqual(decoder(b),b);
  assert.deepEqual(marquesDeReprise(b.avancement), b.avancement.doneMap);
});
verifier("marques abîmées et charges hors bornes refusées", () => {
  const b = copie(); b.avancement.chargeCourante = {0:-1}; assert.equal(decoder(b),null);
  b.avancement.chargeCourante = {0:10000}; assert.equal(decoder(b),null);
  b.avancement.chargeCourante = {0:20}; b.avancement.doneMap[0][0]={statut:"terminee",validation:"bouton",dureeS:-1}; assert.equal(decoder(b),null);
});
verifier("ancienne marque : aucune charge ni répétition inventée", () => {
  assert.deepEqual(marquesDeReprise(base.avancement), {0:{0:{statut:"terminee",validation:"bouton",dureeS:null}}});
});
verifier("intention, substitution et adaptation conservent leurs identités", () => {
  const b = copie(); b.seance.cible = { genre: "intention", intentionId: RUN2 }; assert.deepEqual(decoder(b)?.seance.cible, b.seance.cible);
  b.seance.cible = { genre: "etape", programmeId: RUN2, etapeId: RUN, type: "Force", title: "Push", difficulty: "Débutant", location: "salle", exerciseList: b.seance.exerciseList, adaptationId: AUTRE };
  b.seance.cible.rang = 8; b.seance.cible.modeleId = RUN2;
  assert.deepEqual(decoder(b)?.seance.cible, b.seance.cible);
  b.seance.cible.etapeId = "Push"; assert.equal(decoder(b), null);
});
verifier("images et entrées d’exercices inattendues ne passent pas", () => {
  for (const heroImage of ["javascript:alert(1)", "/entrainement/../secret", "https://autre.test/image"]) assert.equal(decoder({ ...base, seance: { ...base.seance, heroImage } }), null);
  const b = copie(); b.seance.exerciseList[0].sets = 0; assert.equal(decoder(b), null);
});
verifier("cible restée prévue : son identité est gardée", () => assert.equal(verdictCibleReprise(true, false, false), "identique"));
verifier("intention retirée, terminée ou changée : aucune réécriture muette", () => {
  assert.equal(verdictCibleReprise(false, false, false), "modifie");
  assert.equal(verdictCibleReprise(true, true, false), "modifie");
  assert.equal(verdictCibleReprise(true, false, true), "modifie");
});

const store = new Map<string, string>();
const events = new EventTarget();
let ecritureBloquee = false;
const fakeWindow = {
  localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { if (ecritureBloquee) throw new Error("quota"); store.set(k, v); }, removeItem: (k: string) => { if (ecritureBloquee) throw new Error("quota"); store.delete(k); } },
  addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events), setInterval, clearInterval,
};
Object.assign(globalThis, { window: fakeWindow });

verifier("sauvegarde et lecture stables pour useSyncExternalStore", () => {
  assert.equal(sauverReprise(base), true); const a = lireReprise(MOI); assert.equal(lireReprise(MOI), a); assert.equal(lireReprise(AUTRE), null);
});
verifier("un nouveau lancement ne remplace pas silencieusement l’ancien", () => {
  assert.equal(sauverReprise({ ...base, executionId: RUN2 }), false); assert.equal(lireReprise(MOI)?.executionId, RUN);
});
verifier("une fermeture tardive ne peut effacer un autre lancement", () => {
  effacerReprise(MOI, RUN2); assert.equal(lireReprise(MOI)?.executionId, RUN);
});
verifier("abandon ou fin : aucune résurrection par un effet retardé", () => {
  effacerReprise(MOI, RUN); assert.equal(lireReprise(MOI), null); assert.equal(sauverReprise(base), false);
  assert.equal(sauverReprise({ ...base, executionId: RUN2 }), true);
});
verifier("observer : un signal après sauvegarde, nettoyage sans rappel", () => {
  let appels = 0; const stop = observerReprise(MOI, () => appels++);
  sauverReprise({ ...base, executionId: RUN2 }); assert.equal(appels, 1); stop();
  sauverReprise({ ...base, executionId: RUN2 }); assert.equal(appels, 1);
});
verifier("finalisation R1 en attente : le lecteur ne repart pas sur la dernière série", () => {
  store.set(`vaiiya_journal_attente_${MOI}`, JSON.stringify([{journal:{lancement_id:RUN2}}]));
  assert.equal(lireReprise(MOI),null);
  store.delete(`vaiiya_journal_attente_${MOI}`);
  assert.equal(lireReprise(MOI)?.executionId,RUN2);
});
verifier("transfert au journal R1 : retirer le brouillon masqué, sans toucher au journal", () => {
  const compte = "00000000-0000-4000-8000-000000000006";
  const b = {...base,userId:compte}; sauverReprise(b);
  const cleJournal = `vaiiya_journal_attente_${compte}`;
  store.set(cleJournal,JSON.stringify([{journal:{lancement_id:RUN}}]));
  assert.equal(lireReprise(compte),null); effacerReprise(compte,RUN);
  assert.ok(store.get(cleJournal)); store.delete(cleJournal);
  assert.equal(lireReprise(compte),null);
});
verifier("quota dépassé : la séance reste utilisable en mémoire et se nettoie", () => {
  ecritureBloquee = true;
  const b = { ...base, userId: AUTRE, executionId: RUN };
  assert.equal(sauverReprise(b), false); assert.equal(lireReprise(AUTRE)?.executionId, RUN);
  effacerReprise(AUTRE, RUN); assert.equal(lireReprise(AUTRE), null); assert.equal(sauverReprise(b), false);
  ecritureBloquee = false;
});
verifier("stockage devenu bloqué : une fin ne laisse pas de fausse reprise", () => {
  const b = { ...base, userId: AUTRE, executionId: RUN2 };
  assert.equal(sauverReprise(b), true);
  ecritureBloquee = true;
  effacerReprise(AUTRE, RUN2);
  assert.equal(lireReprise(AUTRE), null);
  ecritureBloquee = false;
});

let verrouPris = false;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: {
  request: async (_nom: string, _options: unknown, f: (lock: object | null) => unknown) => {
    if (verrouPris) return f(null); verrouPris = true;
    try { await f({}); } finally { verrouPris = false; }
  },
} } });
const liberer = await prendreVerrouSeance(MOI);
assert.ok(liberer); assert.equal(await prendreVerrouSeance(MOI), null); liberer();
await new Promise((r) => setTimeout(r, 0));
const reprendreApresFermeture = await prendreVerrouSeance(MOI); assert.ok(reprendreApresFermeture); reprendreApresFermeture();
nombre++;
console.log("[OK] deux onglets : un lecteur, puis reprise après libération");
console.log(`${nombre} scénarios de reprise passent.`);
