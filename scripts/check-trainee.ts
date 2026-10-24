/* ═══════════════════════════════════════════════════════════════════════
   check:trainee, le banc de la traînée qui chauffe.

     npm run check:trainee

   ⚠️ IL EXERCE LE VRAI `grilleTrainee` (`lib/traineeSerie.ts`) sur des
   séries écrites jour par jour, mesure le contraste de la gamme dans le
   VRAI module CSS, puis lit la source des écrans.

   CE QU'IL PROTÈGE (Louis, 2026-10-17, page « La traînée » du canevas
   « Les rangs et le profil ») :
   · chaque jour de série prend la couleur de la flamme qu'il avait
     allumée, et une série cassée repart d'une Lueur ;
   · la traînée ne se coupe plus en fin de semaine ;
   · le jour où une flamme est née porte sa flamme ;
   · la prochaine flamme attend sur sa date, et le chemin pour y aller ;
   · un jour sans n'est jamais colorié ;
   · le chiffre se lit sur chaque rond (4,5 pour 1 au moins), et la gamme
     brille de plus en plus : doux au début, éclatant à la fin ;
   · la Lueur de la tuile n'est plus le verre nu ;
   · un jour gardé par un joker (2026-10-24) relie la série sans compter,
     n'a pas de flamme et laisse passer le ruban.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { shiftDateStr } from "@/lib/dates";
import { PALIERS_FLAMME } from "@/lib/flammesSerie";
import { grilleTrainee, prochaineFlamme, rangsDesJours, type CaseJour } from "@/lib/traineeSerie";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}

/** Les jours d'une plage, bornes comprises. */
function plage(de: string, a: string): string[] {
  const jours: string[] = [];
  for (let j = de; j <= a; j = shiftDateStr(j, 1)) jours.push(j);
  return jours;
}

function octobre(actifs: string[], aujourdhui = "2026-10-17") {
  const rangs = rangsDesJours(actifs);
  const cases = grilleTrainee({ annee: 2026, mois: 9, rangs, aujourdhui }).filter((c): c is CaseJour => c !== null);
  const jour = (n: number) => cases[n - 1];
  return { rangs, cases, jour };
}

/* ── La capture de Louis : 3 jours, Flamme ─────────────────────────────── */
{
  const actifs = [...plage("2026-10-02", "2026-10-08"), ...plage("2026-10-11", "2026-10-13"), ...plage("2026-10-15", "2026-10-17")];
  const { cases, jour } = octobre(actifs);

  const attendus: Record<number, [number, string]> = {
    2: [1, "lueur"], 3: [2, "lueur"], 4: [3, "flamme"], 5: [4, "flamme"], 6: [5, "flamme"], 7: [6, "flamme"],
    8: [7, "feu"], 11: [1, "lueur"], 12: [2, "lueur"], 13: [3, "flamme"], 15: [1, "lueur"], 16: [2, "lueur"], 17: [3, "flamme"],
  };
  const faux = Object.entries(attendus).filter(([n, [rang, palier]]) => {
    const c = jour(Number(n));
    return c.serie?.rang !== rang || c.serie?.palier !== palier;
  });
  verdict("chaque jour prend la flamme qu'il avait allumée", faux.length === 0, faux.map(([n]) => n).join(", ") || "13 jours sur 13");
  verdict("une série cassée repart d'une Lueur", jour(11).serie?.palier === "lueur" && jour(15).serie?.palier === "lueur", "le 11 et le 15");

  const nees = cases.filter((c) => c.serie?.nee).map((c) => `${c.numero}:${c.serie?.nee}`);
  verdict("le jour où une flamme est née porte sa flamme", nees.join(" ") === "4:flamme 8:feu 13:flamme 17:flamme", nees.join(" "));

  const sans = [1, 9, 10, 14].map(jour);
  verdict("un jour sans n'est jamais colorié", sans.every((c) => !c.serie && !c.ruban), "1, 9, 10, 14");

  verdict(
    "la traînée passe d'une semaine à l'autre",
    jour(4).colonne === 6 && jour(4).ruban?.droite === "bord" && jour(5).colonne === 0 && jour(5).ruban?.gauche === "bord" &&
      jour(11).ruban?.droite === "bord" && jour(12).ruban?.gauche === "bord",
    "du 4 au 5, du 11 au 12",
  );
  verdict(
    "le ruban chauffe d'un jour à l'autre",
    jour(3).ruban?.palier === "lueur" && jour(3).ruban?.vers === "flamme" && jour(7).ruban?.vers === "feu" && jour(8).ruban?.droite === "centre",
    "le 3 vers la Flamme, le 7 vers le Feu, le 8 s'arrête",
  );

  const chemins = cases.filter((c) => c.chemin).map((c) => `${c.numero}${c.chemin?.gauche ? "<" : ""}${c.chemin?.droite ? ">" : ""}`);
  verdict("la prochaine flamme attend sur sa date", jour(21).prochaine === "feu" && cases.filter((c) => c.prochaine).length === 1, "le 21, le Feu");
  verdict("le chemin va d'aujourd'hui à cette date", chemins.join(" ") === "17> 18<> 19<> 20<> 21<", chemins.join(" "));
  verdict("aujourd'hui est la tête de la traînée", jour(17).aujourdhui && !!jour(17).serie && !jour(18).serie && jour(18).futur, "le 17");
}

/* ── Douze jours, après une série de treize finie le 4 ─────────────────── */
{
  const actifs = [...plage("2026-09-22", "2026-10-04"), ...plage("2026-10-06", "2026-10-17")];
  const { cases, jour } = octobre(actifs);
  verdict("une série du mois d'avant garde son rang", jour(1).serie?.rang === 10 && jour(4).serie?.palier === "feu", `le 1er au rang ${jour(1).serie?.rang}`);
  verdict("elle arrive en fondu par la gauche", jour(1).ruban?.gauche === "fondu", jour(1).ruban?.gauche ?? "aucun ruban");
  verdict("le lendemain d'un Feu, on repart d'une Lueur", jour(6).serie?.rang === 1 && jour(6).serie?.palier === "lueur", "le 6");
  verdict("la Flamme naît au 3ᵉ jour, le Feu au 7ᵉ", jour(8).serie?.nee === "flamme" && jour(12).serie?.nee === "feu", "le 8 et le 12");
  verdict(
    "une flamme qui tombe le mois suivant ne se pose pas dans celui-ci",
    cases.every((c) => !c.prochaine && !c.chemin) && prochaineFlamme(rangsDesJours(actifs), "2026-10-17")?.date === "2026-11-04",
    "le Brasier, le 4 novembre",
  );
}

/* ── Les deux bouts de la gamme ─────────────────────────────────────────── */
{
  const brasier = octobre(plage("2026-09-03", "2026-10-17"));
  verdict("45 jours : le Brasier est né le 2", brasier.jour(2).serie?.nee === "brasier" && brasier.jour(17).serie?.palier === "brasier", "rang 30 le 2 octobre");

  const sacre = octobre(plage("2026-06-24", "2026-10-17"));
  verdict("116 jours : le Feu sacré est né le 1er", sacre.jour(1).serie?.nee === "sacre" && sacre.jour(17).serie?.rang === 116, `rang ${sacre.jour(17).serie?.rang}`);
  verdict("le Feu sacré n'a pas de prochaine flamme", sacre.cases.every((c) => !c.prochaine && !c.chemin), "rien à attendre");
}

/* ── Aujourd'hui pas encore compté : la série tient jusqu'à minuit ─────── */
{
  const { jour } = octobre(plage("2026-10-15", "2026-10-16"));
  verdict(
    "la tête est hier, et la Flamme peut naître aujourd'hui",
    jour(17).prochaine === "flamme" && jour(16).chemin?.droite === true && jour(17).chemin?.gauche === true && !jour(17).serie,
    "le 17",
  );
  const finie = octobre(plage("2026-10-10", "2026-10-14"));
  verdict("une série finie n'annonce rien", finie.cases.every((c) => !c.prochaine && !c.chemin), "dernier jour le 14");
}

/* ── Le dernier jour d'un mois passé ─────────────────────────────────────── */
{
  const rangs = rangsDesJours(plage("2026-09-28", "2026-10-02"));
  const septembre = grilleTrainee({ annee: 2026, mois: 8, rangs, aujourdhui: "2026-10-17" }).filter((c): c is CaseJour => c !== null);
  const dernier = septembre[septembre.length - 1];
  verdict("vers le mois suivant, le ruban s'efface", dernier.numero === 30 && dernier.ruban?.droite === "fondu", `le 30 : ${dernier.ruban?.droite}`);
  verdict("le rang continue d'un mois à l'autre", rangs.get("2026-10-01") === 4, `le 1er octobre au rang ${rangs.get("2026-10-01")}`);
}

/* ── Les jokers : un jour couvert garde la série sans compter ──────────── */
function octobreJoker(actifs: string[], couverts: string[], aujourdhui: string) {
  const garde = new Set(couverts);
  const rangs = rangsDesJours(actifs, garde);
  const cases = grilleTrainee({ annee: 2026, mois: 9, rangs, aujourdhui, couverts: garde }).filter((c): c is CaseJour => c !== null);
  return { rangs, garde, cases, jour: (n: number) => cases[n - 1] };
}
{
  // La semaine de la maquette : du 13 au 19, le 16 gardé par un joker.
  const actifs = [...plage("2026-10-13", "2026-10-15"), ...plage("2026-10-17", "2026-10-19")];
  const { rangs, jour } = octobreJoker(actifs, ["2026-10-16"], "2026-10-19");
  verdict(
    "le jour d'après un joker continue la série",
    rangs.get("2026-10-17") === 4 && rangs.get("2026-10-19") === 6,
    `le 17 au rang ${rangs.get("2026-10-17")}, le 19 au rang ${rangs.get("2026-10-19")}`,
  );
  verdict("le jour couvert ne compte pas et n'a pas de flamme", !rangs.has("2026-10-16") && jour(16).joker && !jour(16).serie, "le 16");
  verdict(
    "le ruban traverse le jour couvert",
    jour(15).ruban?.droite === "bord" && jour(16).ruban?.gauche === "bord" && jour(16).ruban?.droite === "bord" && jour(17).ruban?.gauche === "bord",
    "du 15 au 17",
  );
  verdict(
    "il garde la couleur de la flamme qu'il protège",
    jour(16).ruban?.palier === jour(15).serie?.palier && jour(16).ruban?.vers === jour(17).serie?.palier,
    `${jour(16).ruban?.palier} vers ${jour(16).ruban?.vers}`,
  );
  verdict("seul le jour couvert porte le bouclier", jour(15).joker === false && jour(17).joker === false, "ni la veille ni le lendemain");
  verdict("sans le joker, le même trou casse la série", rangsDesJours(actifs).get("2026-10-17") === 1, "le 17 repart d'une Lueur");
}
{
  // À partir de Platine : trois jours couverts d'affilée.
  const { rangs, jour } = octobreJoker([...plage("2026-10-08", "2026-10-10"), "2026-10-14"], plage("2026-10-11", "2026-10-13"), "2026-10-14");
  verdict(
    "trois jokers d'affilée gardent la même série",
    rangs.get("2026-10-14") === 4 && [11, 12, 13].every((n) => jour(n).joker && !!jour(n).ruban),
    `le 14 au rang ${rangs.get("2026-10-14")}`,
  );
}
{
  // Argent : un seul joker, et le jour d'après sans rien casse la série.
  const { rangs, jour } = octobreJoker([...plage("2026-10-10", "2026-10-12"), "2026-10-15"], ["2026-10-13"], "2026-10-15");
  verdict(
    "après le joker, un jour sans rien casse la série",
    rangs.get("2026-10-15") === 1 && jour(13).ruban?.droite === "centre" && !jour(14).ruban && !jour(14).joker,
    "le 15 repart d'une Lueur",
  );
}
{
  // Hier gardé par un joker, aujourd'hui pas encore compté : la série tient.
  const { garde, rangs, jour } = octobreJoker(plage("2026-10-12", "2026-10-15"), ["2026-10-16"], "2026-10-17");
  const suite = prochaineFlamme(rangs, "2026-10-17", garde);
  verdict(
    "hier couvert, la série tient jusqu'à minuit",
    suite?.depuis === "2026-10-16" && suite?.date === "2026-10-19" && suite?.palier.id === "feu",
    `${suite?.palier.id ?? "rien"} le ${suite?.date ?? "?"}`,
  );
  verdict("le chemin part du jour couvert", jour(16).chemin?.droite === true && jour(19).prochaine === "feu", "du 16 au 19");
  verdict("sans le joker, la série d'hier est finie", prochaineFlamme(rangsDesJours(plage("2026-10-12", "2026-10-15")), "2026-10-17") === null, "rien à attendre");
}

/* ── La gamme, dans le vrai module CSS ─────────────────────────────────── */

const RACINE = path.resolve(import.meta.dirname, "..");
const lire = (fichier: string) => readFileSync(path.join(RACINE, fichier), "utf8");
/** Le code sans ses commentaires. */
const code = (fichier: string) =>
  lire(fichier).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function luminance(hex: string): number {
  const h = hex.length === 4 ? hex.slice(1).split("").map((c) => c + c).join("") : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

{
  const css = code("src/components/serie/CalendrierSerie.module.css");
  const regle = (id: string) => css.match(new RegExp(`\\.rond\\[data-feu="${id}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  const valeur = (bloc: string, nom: string) => bloc.match(new RegExp(`--${nom}:\\s*([^;]+);`))?.[1]?.trim() ?? "";

  const manquantes = PALIERS_FLAMME.filter((p) => !["rond", "encre", "halo", "profond", "lueur"].every((v) => valeur(regle(p.id), v)));
  verdict("chaque flamme a son rond dans la gamme", manquantes.length === 0, manquantes.map((p) => p.id).join(", ") || "les cinq");

  const illisibles: string[] = [];
  for (const p of PALIERS_FLAMME) {
    const bloc = regle(p.id);
    const encre = valeur(bloc, "encre");
    for (const fond of valeur(bloc, "rond").match(/#[0-9a-fA-F]{3,6}\b/g) ?? []) {
      const c = contraste(encre, fond);
      if (c < 4.5) illisibles.push(`${p.id} ${fond} ${c.toFixed(2)}`);
    }
  }
  verdict("le chiffre se lit sur chaque rond (4,5 pour 1 au moins)", illisibles.length === 0, illisibles.join(", ") || "les deux bouts de chaque dégradé");

  // L'intensité monte : la Lueur et la Flamme ne brillent pas, le Feu, le
  // Brasier et le Feu sacré oui, de plus en plus fort.
  const halos = PALIERS_FLAMME.map((p) => valeur(regle(p.id), "halo"));
  verdict(
    "doux au début, éclatant à la fin",
    halos[0] === "none" && halos[1] === "none" && halos.slice(2).every((h) => h !== "none" && h.length > 0) && halos[4].length >= halos[2].length,
    halos.map((h) => (h === "none" ? "·" : "✦")).join(" "),
  );

  const grille = css.match(/^\.grille\s*\{([^}]*)\}/m)?.[1] ?? "";
  const sombre = css.match(/:global\(\[data-theme="dark"\]\)\s*\.grille\s*\{([^}]*)\}/)?.[1] ?? "";
  const sansRuban = PALIERS_FLAMME.filter((p) => !valeur(grille, `ruban-${p.id}`) || !valeur(sombre, `ruban-${p.id}`));
  verdict("chaque flamme a son ruban, en clair et en sombre", sansRuban.length === 0, sansRuban.map((p) => p.id).join(", ") || "dix rubans");
}

/* ── Par la source ─────────────────────────────────────────────────────── */
{
  const calendrier = code("src/components/serie/CalendrierSerie.tsx");
  verdict(
    "le calendrier dessine ce que la règle décide",
    calendrier.includes("grilleTrainee(") && !/palierFlamme|etatFlamme|rangsDesJours/.test(calendrier),
    "CalendrierSerie.tsx",
  );
  verdict("aucune couleur écrite dans le calendrier", !/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(calendrier), "toutes dans le module");
  verdict(
    "le calendrier reçoit les jours couverts et les dessine",
    /grilleTrainee\(\{[^}]*couverts/.test(calendrier) && calendrier.includes("data-joker") && calendrier.includes("<IconeJoker"),
    "un bouclier sur le jour gardé",
  );
  verdict(
    "le jour couvert a son rond, sans couleur de flamme",
    /\.rond\[data-joker\]\s*\{[^}]*dashed/.test(code("src/components/serie/CalendrierSerie.module.css")),
    "pointillés dorés",
  );

  const regle = code("src/lib/traineeSerie.ts");
  verdict(
    "une seule règle de palier : celle des flammes",
    regle.includes("palierFlamme(") && !/des:\s*\d|PALIERS_FLAMME/.test(regle),
    "traineeSerie.ts",
  );

  const feuille = code("src/components/accueil/FeuilleSerie.tsx");
  verdict(
    "la feuille montre la traînée",
    feuille.includes("<CalendrierSerie") && feuille.includes("rangsDesJours(") && !feuille.includes("rgba(245,177,32") && !feuille.includes("i % 7"),
    "plus de ruban beige ni de coupure en fin de ligne",
  );
  verdict(
    "la feuille compte la série avec ses jokers",
    /rangsDesJours\([^)]*garde\)/.test(feuille) && /<CalendrierSerie[^>]*couverts=\{garde\}/.test(feuille),
    "les mêmes jours couverts pour le rang et le dessin",
  );

  const tuile = code("src/components/accueil/MaJournee.module.css");
  // En début de ligne : la règle du mode sombre contient le même sélecteur, et
  // elle ne doit pas pouvoir passer pour l'habit clair (témoin vérifié).
  const lueur = tuile.match(/^\.serie\[data-palier="lueur"\]\s*\{([^}]*)\}/m)?.[1] ?? "";
  verdict("la Lueur de la tuile porte une braise", /radial-gradient/.test(lueur) && /--trait-on/.test(lueur), lueur ? "son habit" : "aucun habit");
  verdict(
    "en sombre, la lumière part de la flamme",
    ["lueur", "flamme", "feu"].every((id) =>
      new RegExp(`:global\\(\\[data-theme="dark"\\]\\)\\s*\\.serie\\[data-palier="${id}"\\]\\s*\\{[^}]*radial-gradient\\(circle at 25px 28px`).test(tuile),
    ),
    "Lueur, Flamme, Feu",
  );
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
