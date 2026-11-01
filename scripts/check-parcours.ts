/* ════════════════════════════════════════════════════════════════════
   check:parcours · LES PROGRAMMES, VÉRIFIÉS HORS LIGNE

     npm run check:parcours

   Ce qu'il tient (GO de Louis, 2026-11-01, maquette « Les programmes »,
   version 2) :
   · les huit programmes et leurs séances existent, et la copie que garde
     l'accueil (`SEANCES`) dit la même chose que le catalogue ;
   · un test au premier créneau, le même au dernier, les séances entre ;
   · le calendrier : le départ, la fin, une séance manquée qui glisse au
     jour libre suivant, jamais deux séances le même jour, un changement de
     jours qui repose la suite, rien d'écrit d'avance ;
   · les mots : « Les six semaines » de la fiche, les valeurs d'un test,
     aucune promesse sur le corps, aucun accord de genre, aucun tiret
     cadratin ;
   · « Reprendre le sport » inclus, les autres Vaiiya+ ouverts tant que la
     vente est fermée.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import { workoutSessions } from "@/lib/catalogueSeances";
import { exerciseData } from "@/lib/exercicesCatalogue";
import { resolveGuide } from "@/lib/exerciseGuides";
import { trouverExercice } from "@/lib/exerciseLibrary";
import {
  PROGRAMMES, SEANCES, calendrierDuDepart, dansLaPhrase, calendrierParcours, creneauxDe, dateEnLettres, departApresChangement,
  jourChoisi, nbCreneaux, planSemaines, programmeOuvert, programmeParId, programmesProposes, quandDit,
  semaineDuCalendrier, testMieux, titreCreneau, valeurCourte, valeurDite, type FaitsParcours,
} from "@/lib/parcours";

let ok = 0, ko = 0;
const t = (nom: string, cond: boolean, info = "") => {
  if (cond) ok++;
  else ko++;
  console.log("[" + (cond ? "OK   " : "ECHEC") + "] " + nom + (info ? " · " + info : ""));
};
const NB = String.fromCharCode(160);
const net = (s: string) => s.replace(new RegExp(NB, "g"), " ");

/* ── Les séances ── */
const utilisees = new Set(PROGRAMMES.flatMap((p) => p.phases.flatMap((ph) => ph.seances)).concat(PROGRAMMES.map((p) => p.photo)));
for (const id of utilisees) {
  const s = workoutSessions.find((x) => x.id === id);
  const copie = SEANCES[id];
  t(`la séance « ${id} » existe au catalogue`, !!s);
  if (!s || !copie) { t(`la séance « ${id} » est recopiée pour l'accueil`, !!copie); continue; }
  const n = (exerciseData[id] ?? []).length;
  t(`la copie de « ${id} » dit la même chose que le catalogue`,
    copie.titre === s.title && copie.minutes === s.duration && copie.exercices === n && copie.difficulte === s.difficulty && copie.categorie === s.category,
    `${copie.titre}/${s.title} · ${copie.minutes}/${s.duration} · ${copie.exercices}/${n} · ${copie.difficulte}/${s.difficulty}`);
  t(`« ${id} » n'est pas un classique (il a son propre lecteur)`, !(s.collections ?? []).includes("classiques"));
}
t("la copie ne garde aucune séance inutile", Object.keys(SEANCES).every((id) => utilisees.has(id)));

/* ── Les programmes ── */
t("huit programmes", PROGRAMMES.length === 8);
t("les identifiants sont uniques", new Set(PROGRAMMES.map((p) => p.id)).size === PROGRAMMES.length);
t("un seul programme inclus, et c'est Reprendre le sport",
  PROGRAMMES.filter((p) => p.acces === "inclus").map((p) => p.id).join() === "reprendre-le-sport");
t("Renfo du coureur et Prépa course hybride attendent leurs mouvements",
  !PROGRAMMES.some((p) => /coureur|hybride/.test(p.id)));
for (const p of PROGRAMMES) {
  const cr = creneauxDe(p);
  t(`${p.id} : ${p.semaines} semaines de ${p.parSemaine} créneaux`, cr.length === nbCreneaux(p) && cr.length === p.semaines * p.parSemaine);
  t(`${p.id} : le test au premier créneau, le même au dernier`,
    cr[0].genre === "test_depart" && cr[cr.length - 1].genre === "test_fin" && cr.slice(1, -1).every((c) => c.genre === "seance" && !!c.seance));
  t(`${p.id} : les phases couvrent toutes les semaines, dans l'ordre`,
    p.phases[p.phases.length - 1].jusqua === p.semaines && p.phases.every((ph, i) => i === 0 || ph.jusqua > p.phases[i - 1].jusqua));
  t(`${p.id} : chaque séance de chaque phase sert au moins une fois`,
    p.phases.every((ph) => ph.seances.every((s) => cr.some((c) => c.seance === s))));
  const guide = resolveGuide(p.test.mouvement);
  t(`${p.id} : le mouvement du test est animé et a sa fiche`, !!guide && !!trouverExercice(p.test.mouvement), p.test.mouvement);
  t(`${p.id} : un compte en répétitions a ses mots`, p.test.mesure !== "reps" || !!p.test.unite);
  t(`${p.id} : le programme suivant existe`, p.suivant === null || (!!programmeParId(p.suivant) && p.suivant !== p.id));
  const textes = [p.titre, p.accroche, p.lieu, p.test.titre, p.test.consigne, p.test.depart, p.refaire ?? ""].join(" ");
  t(`${p.id} : aucun tiret cadratin`, !/—/.test(textes));
  t(`${p.id} : aucune promesse sur le corps`, !/ventre plat|brûle|maigri|perdre du poids|kilos en moins|affin|sculpt|tonifi/i.test(textes));
  t(`${p.id} : aucun accord de genre pour la personne`, !/\b(prêt|prête|prêt\(e\)|motivée?|fier|fière|seule?)\b/i.test(textes));
  t(`${p.id} : les apostrophes sont courbes`, !/'/.test(textes));
  t(`${p.id} : le titre ne promet pas une durée qu'il ne tient pas`, !/minutes?/.test(p.titre));
}
t("le compte d'abdos ne promet jamais un ventre plat", !/ventre/.test(JSON.stringify(programmeParId("abdos-solides"))));

/* ── Ouvert ou pas ── */
const plus = programmeParId("premiere-traction")!, inclus = programmeParId("reprendre-le-sport")!;
t("tant que la vente est fermée, un programme Vaiiya+ est ouvert", programmeOuvert(plus, false, false));
t("vente ouverte, il est fermé pour un compte gratuit", !programmeOuvert(plus, false, true));
t("et ouvert pour un abonné", programmeOuvert(plus, true, true));
t("Reprendre le sport est ouvert pour tout le monde, toujours", programmeOuvert(inclus, false, true));
t("Prépa ski est proposé en novembre", programmesProposes("2026-11-01").some((p) => p.id === "prepa-ski"));
t("et pas en juin", !programmesProposes("2027-06-15").some((p) => p.id === "prepa-ski"));

/* ── Le calendrier ── */
const PT = plus; // Première traction : 18 créneaux
const dim = "2026-11-01"; // un dimanche
t("le premier jour choisi après un dimanche est le lundi", jourChoisi([1, 3, 5], dim) === "2026-11-02");
const depart = calendrierDuDepart(PT, [1, 3, 5], dim);
t("commencer un dimanche : le test tombe lundi 2 novembre", depart.prochain?.rang === 1 && depart.prochain.date === "2026-11-02" && net(dateEnLettres(depart.prochain.date)) === "lundi 2 novembre");
t("la fin tombe le vendredi 11 décembre, comme sur la maquette", depart.fin === "2026-12-11" && net(dateEnLettres(depart.fin)) === "vendredi 11 décembre");
t("rien n'est fait au départ", depart.faits === 0 && depart.total === 18);
t("jamais deux créneaux le même jour", new Set(depart.creneaux.map((c) => c.date)).size === 18);
t("les créneaux tombent sur les jours choisis", depart.creneaux.every((c) => [1, 3, 5].includes([7, 1, 2, 3, 4, 5, 6][new Date(c.date + "T00:00:00Z").getUTCDay()])));

/* La maquette, écran « Une séance manquée glisse » : semaine 3, six séances
   faites, lundi passé sans séance, aujourd'hui mardi. */
const debut = "2026-11-02";
const faitsSix: FaitsParcours = {
  jours: [1, 3, 5], debut, rangDebut: 1,
  seances: [{ rang: 2, date: "2026-11-04" }, { rang: 3, date: "2026-11-06" }, { rang: 4, date: "2026-11-09" }, { rang: 5, date: "2026-11-11" }, { rang: 6, date: "2026-11-13" }],
  testDepartLe: "2026-11-02", testFinLe: null,
};
const mardi = "2026-11-17";
const glisse = calendrierParcours(PT, faitsSix, mardi);
t("six créneaux faits", glisse.faits === 6);
t("la séance de lundi glisse à aujourd'hui", glisse.prochain?.rang === 7 && glisse.prochain.date === mardi && glisse.prochain.venueDe === "2026-11-16");
t("elle reste en semaine 3", glisse.prochain?.semaine === 3);
t("c'est « Dos large » (les deux séances alternent depuis le premier créneau)", glisse.prochain ? titreCreneau(glisse.prochain) === "Dos large" : false);
t("la suite garde ses jours : Tractions mercredi, Dos large vendredi",
  glisse.creneaux[7].date === "2026-11-18" && titreCreneau(glisse.creneaux[7]) === "Tractions, construire le mouvement" && glisse.creneaux[8].date === "2026-11-20" && titreCreneau(glisse.creneaux[8]) === "Dos large");
t("la fin ne bouge pas", glisse.fin === "2026-12-11");
const sem = semaineDuCalendrier(glisse, mardi);
t("dans la semaine, lundi dit qu'une séance a glissé", sem[0].glisse && !sem[0].creneau);
t("mardi porte la séance venue de lundi", sem[1].creneau?.rang === 7 && sem[1].creneau.venueDe === "2026-11-16");
t("mercredi et vendredi gardent les leurs", sem[2].creneau?.rang === 8 && sem[4].creneau?.rang === 9 && !sem[3].creneau);
t("« venue de » ne se dit que d'un jour passé", glisse.creneaux.filter((c) => c.venueDe).length === 1);

/* Fait aujourd'hui : la suivante attend le prochain jour choisi. */
const faitMardi = calendrierParcours(PT, { ...faitsSix, seances: [...faitsSix.seances, { rang: 7, date: mardi }] }, mardi);
t("une séance faite aujourd'hui : la suivante attend mercredi", faitMardi.prochain?.rang === 8 && faitMardi.prochain.date === "2026-11-18");

/* En retard ET déjà une séance faite aujourd'hui : jamais deux le même jour. */
const deuxRetards = calendrierParcours(PT, { ...faitsSix, seances: faitsSix.seances.filter((s) => s.rang < 6).concat([{ rang: 6, date: mardi }]) }, mardi);
t("déjà une séance aujourd'hui : la suivante en retard attend le prochain jour choisi", deuxRetards.prochain?.date === "2026-11-18");

/* Une longue absence : trois séances manquées. */
const absent = calendrierParcours(PT, { ...faitsSix, seances: faitsSix.seances.filter((s) => s.rang <= 3) }, "2026-11-19");
t("après une absence, la première séance en retard est pour aujourd'hui", absent.prochain?.rang === 4 && absent.prochain.date === "2026-11-19");
t("les autres reprennent sur les jours choisis, sans s'entasser",
  absent.creneaux[4].date === "2026-11-20" && absent.creneaux[5].date === "2026-11-23" && new Set(absent.creneaux.map((c) => c.date)).size === 18);
t("aucun jour de la suite n'est dans le passé", absent.creneaux.filter((c) => !c.fait).every((c) => c.date >= "2026-11-19"));

/* Faire en avance : le créneau de mercredi fait lundi. */
const avance = calendrierParcours(PT, { ...faitsSix, seances: [...faitsSix.seances], testDepartLe: "2026-11-02" }, "2026-11-14");
t("un samedi sans retard, la prochaine séance garde son lundi", avance.prochain?.date === "2026-11-16" && avance.prochain.venueDe === null);

/* Changer ses jours. */
const nouveau = departApresChangement(glisse, mardi);
t("changer ses jours repart du premier créneau qui reste", nouveau.rangDebut === 7 && nouveau.debut === mardi);
const change = calendrierParcours(PT, { ...faitsSix, jours: [2, 4, 6], debut: nouveau.debut, rangDebut: nouveau.rangDebut }, mardi);
t("sur les nouveaux jours, la suite commence aujourd'hui, mardi", change.prochain?.rang === 7 && change.prochain.date === mardi && change.prochain.venueDe === null);
t("puis jeudi et samedi", change.creneaux[7].date === "2026-11-19" && change.creneaux[8].date === "2026-11-21");
t("ce qui est fait ne bouge pas", change.creneaux.slice(0, 6).every((c, i) => c.fait && c.date === glisse.creneaux[i].date));

/* Tout fait. */
const tout = calendrierParcours(PT, {
  ...faitsSix, seances: Array.from({ length: 16 }, (_, i) => ({ rang: i + 2, date: "2026-12-09" })), testFinLe: "2026-12-11",
}, "2026-12-11");
t("tout fait : plus de prochain créneau", tout.prochain === null && tout.faits === 18);

/* ── Les mots ── */
t("« aujourd’hui », « demain », puis le jour et sa date",
  quandDit(mardi, mardi) === "aujourd’hui" && quandDit("2026-11-18", mardi) === "demain" && net(quandDit("2026-11-20", mardi)) === "vendredi 20");
const plan = planSemaines(PT).map((l) => `${l.quand} · ${net(l.quoi)}`);
t("« Les six semaines » de Première traction, comme sur la maquette", JSON.stringify(plan) === JSON.stringify([
  "Semaine 1 · Le test, puis « Tractions, construire le mouvement » et « Dos large »",
  "Semaines 2 à 5 · « Tractions, construire le mouvement » et « Dos large », en alternance",
  "Semaine 6 · « Tractions, construire le mouvement » et « Dos large », puis le test final",
]), JSON.stringify(plan));
const planPompes = planSemaines(programmeParId("cent-pompes")!).map((l) => l.quand);
t("des semaines qui font les mêmes séances se regroupent", JSON.stringify(planPompes) === JSON.stringify(["Semaine 1", "Semaine 2", "Semaines 3 et 4", "Semaine 5", "Semaine 6"]), JSON.stringify(planPompes));
for (const p of PROGRAMMES) {
  const lignes = planSemaines(p);
  t(`${p.id} : le plan commence par le test et finit par le test final`,
    lignes[0].quoi.startsWith("Le test") && /le test final$/i.test(lignes[lignes.length - 1].quoi));
}
const tr = plus.test;
t("zéro traction se dit « aucune traction »", valeurDite(tr, 0) === "aucune traction");
t("une traction, deux tractions", net(valeurDite(tr, 1)) === "1 traction" && net(valeurDite(tr, 2)) === "2 tractions");
const chaise = programmeParId("chaise-au-mur")!.test;
t("45 secondes, puis 1 min 20", net(valeurDite(chaise, 45)) === "45 secondes" && net(valeurDite(chaise, 80)) === "1 min 20" && net(valeurDite(chaise, 60)) === "1 min");
t("le chrono s'écrit 1:20", valeurCourte("secondes", 80) === "1:20" && valeurCourte("secondes", 5) === "0:05");
const force = programmeParId("force-5x5")!.test;
t("une charge s'écrit avec une virgule", net(valeurDite(force, 52.5)) === "52,5 kg" && valeurCourte("kg", 40) === "40");
t("un titre au milieu d’une phrase perd la capitale de son article", dansLaPhrase("La chaise au mur") === "la chaise au mur" && dansLaPhrase("Première traction") === "Première traction" && dansLaPhrase("Les classiques") === "les classiques");
t("un test égal ou moins bon n'est jamais un progrès affiché", !testMieux(3, 3) && !testMieux(3, 2) && testMieux(0, 2) && !testMieux(null, 2));

/* ── La fermeture d'une séance de programme, sur une base en mémoire ── */
const { fermerCible } = await import("@/lib/finSeance");
type Store = Parameters<typeof fermerCible>[0];
const ecrits: { parcoursId: string; rang: number; lancementId: string; date: string }[] = [];
const store = (reponse: "ok" | "doublon" | "clos" | "echec" | null): Store => ({
  parLancement: async () => ({ ok: true, id: null }),
  intention: async () => ({ ok: true, resolue: null }),
  reservation: async () => ({ ok: true, id: null }),
  marquer: async () => ({ ok: true, touchees: 0 }),
  inserer: async () => "echec",
  ...(reponse ? {
    insererParcours: async (_u: string, c: { parcoursId: string; rang: number }, f: { lancementId: string; date: string }) => {
      if (reponse === "ok") ecrits.push({ parcoursId: c.parcoursId, rang: c.rang, lancementId: f.lancementId, date: f.date });
      return reponse;
    },
  } : {}),
}) as Store;
const cible = {
  genre: "parcours" as const, parcoursId: "11111111-1111-4111-8111-111111111111", rang: 5, seanceId: "dos-large",
  type: "Force", title: "Dos large", difficulty: "Intermédiaire", location: null, exerciseList: [],
};
const fait = { lancementId: "22222222-2222-4222-8222-222222222222", consommeeLe: "2026-11-11T18:00:00Z", date: "2026-11-11" };
t("une séance de programme se referme : le fait est écrit avec son créneau", (await fermerCible(store("ok"), "u", cible, fait)) === "fermee"
  && ecrits.length === 1 && ecrits[0].rang === 5 && ecrits[0].date === "2026-11-11" && ecrits[0].lancementId === fait.lancementId);
t("rejouée, elle ne s'écrit pas deux fois", (await fermerCible(store("doublon"), "u", cible, fait)) === "deja");
t("un programme arrêté entre-temps : plus rien à refermer, rien à rejouer", (await fermerCible(store("clos"), "u", cible, fait)) === "introuvable");
t("une panne laisse le travail en attente", (await fermerCible(store("echec"), "u", cible, fait)) === "echec");
t("sans écriture de programme, on ne prétend rien", (await fermerCible(store(null), "u", cible, fait)) === "echec");

/* ── Le chemin ── */
const lire = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const src = lire("src/lib/parcours.ts");
t("la règle n'écrit rien et ne lit rien", !/createClient|supabase|fetch\(|localStorage|new Date\(\)/.test(src));
t("la règle ne charge pas le catalogue (l'accueil reste léger)", !/from "@\/lib\/(catalogueSeances|exercicesCatalogue)"/.test(src));
const fin = lire("src/lib/finSeance.ts");
t("le fait d'un programme ne porte aucune étape du cycle",
  /async insererParcours[\s\S]*?parcours_id: cible\.parcoursId,[\s\S]*?parcours_rang: cible\.rang,/.test(fin)
  && !/async insererParcours[\s\S]*?etape_consommee_id[\s\S]*?\n {4}},\n {2}};/.test(fin.slice(fin.indexOf("async insererParcours"))));
const hook = lire("src/hooks/useJournee.ts");
t("un programme en cours met le cycle en pause sur le héros",
  hook.includes(": prochainParcours ? \"parcours\" : etatBase;") && hook.includes("if (enCours) { lancerParcours(); return; }")
  && hook.includes("prevuLe: prochaine && !enCours"));
t("le lancement déclare le créneau du programme", hook.includes("genre: \"parcours\",") && hook.includes("rang: p.rang,"));
t("le héros ne télécharge pas le catalogue entier", hook.includes("import(\"@/lib/exercicesCatalogue\")") && !/^import .*exercicesCatalogue/m.test(hook));
const hero = lire("src/components/entrainement/TodayHero.tsx");
t("le héros montre le créneau, et un test ouvre son écran",
  hero.includes("state === \"parcours\" && parcours && parcours.prochain") && hero.includes("parcours.prochain.genre === \"seance\" ? onStart : onTest"));
const heroJ = lire("src/components/entrainement/HeroJournee.tsx");
t("les écrans du programme se chargent à l'ouverture", heroJ.includes("dynamic(() => import(\"@/components/parcours/ParcoursEcrans\")"));
const trouver = lire("src/components/catalogue/TrouverSeance.tsx");
const iToi = trouver.indexOf("<Rangee titre=\"Pour toi\"");
t("la rangée « Suivre un programme » vient juste après « Pour toi »",
  iToi > 0 && trouver.indexOf("{apresPourToi}") > iToi && trouver.indexOf("{apresPourToi}") < trouver.indexOf("titre=\"Pour équilibrer ta semaine\""));
const ecrans = ["FicheProgramme", "SemaineParcours", "TestParcours", "FinParcours", "RangeeProgrammes", "BandeSemaine", "ParcoursEcrans", "ChoixJours", "commun"]
  .map((n) => lire(`src/components/parcours/${n}.tsx`)).join("\n");
t("les écrans n'écrivent rien eux-mêmes", !/createClient|supabase\.|\.from\(|\.rpc\(/.test(ecrans.replace(/Array\.from\(/g, "")));
t("le Guide parle par guides.ts", /voix\(guide, "parcours\.fiche"/.test(ecrans) && /voix\(guide, "parcours\.(glisse|semaine)"/.test(ecrans)
  && /voix\(guide, "parcours\.depart"/.test(ecrans) && /voix\(guide, "parcours\.fin\.(mieux|fait)"/.test(ecrans));
t("les écrans n'ont aucun tiret cadratin", !/—/.test(ecrans.replace(/\/\*[\s\S]*?\*\//g, "")));
const guides = lire("src/lib/guides.ts");
t("les phrases du Guide n'accordent rien au genre et ne font aucun reproche",
  ["parcours.fiche", "parcours.glisse", "parcours.semaine", "parcours.depart", "parcours.fin.mieux", "parcours.fin.fait"].every((k) => guides.includes(`"${k}"`))
  && !/"parcours\.[^"]+": \{\s*commun: [^}]*(prêt|déçu|dommage|raté|tu aurais dû|en retard)/.test(guides));
const interrompue = lire("src/lib/seanceInterrompue.ts");
t("une séance de programme interrompue se reprend", interrompue.includes("if (c.genre === \"parcours\")"));
t("la reprise vérifie que le programme est toujours en cours", lire("src/lib/cibleReprise.ts").includes("if (cible.genre === \"parcours\")"));
const { badgeParSlug } = await import("@/lib/badges");
t("chaque programme a son badge, au catalogue", PROGRAMMES.every((p) => badgeParSlug(`programme-${p.id}`)?.nom === p.titre));
t("le Guide sait qu'un programme met le cycle en pause", lire("src/lib/guideMoteur.ts").includes("le cycle ci-dessous est en pause"));
const page = lire("src/app/progression/page.tsx");
t("pendant un programme, « Ma semaine » montre les séances du programme",
  page.includes("prevues={journee.parcours") && page.includes("journee.parcours ? setVueParcours({ genre: \"semaine\" }) : setSheet(\"semaine\")"));

console.log(`\n${ok} contrôles passent, ${ko} échouent.`);
if (ko > 0) process.exit(1);
