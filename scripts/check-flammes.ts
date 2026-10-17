/* ═══════════════════════════════════════════════════════════════════════
   check:flammes, le banc des cinq flammes de la série.

     npm run check:flammes

   ⚠️ IL EXERCE LE VRAI `etatFlamme` (`lib/flammesSerie.ts`), puis il lit la
   source des écrans qui montrent la série.

   CE QU'IL PROTÈGE (Louis, 2026-10-17, page « La série » du canevas) :
   · une seule flamme dans tout le produit, dessinée par Vaiiya (avant :
     l'emoji 🔥 de l'appareil sur l'accueil, et deux dessins plats
     différents dans la feuille et sur le profil) ;
   · cinq paliers, Lueur 1, Flamme 3, Feu 7, Brasier 30, Feu sacré 100, dont
     7, 30 et 100 sont aussi les seuils des badges de régularité ;
   · le palier se lit sur la série EN COURS, jamais sur le record ;
   · la tuile de l'accueil change d'habit à chaque flamme.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { etatFlamme, palierFlamme, PALIERS_FLAMME } from "@/lib/flammesSerie";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}

/* ── Les paliers ───────────────────────────────────────────────────────── */

const ATTENDUS: [number, string][] = [
  [-5, "lueur"], [0, "lueur"], [1, "lueur"], [2, "lueur"],
  [3, "flamme"], [6, "flamme"],
  [7, "feu"], [29, "feu"],
  [30, "brasier"], [99, "brasier"],
  [100, "sacre"], [365, "sacre"], [Number.NaN, "lueur"],
];
for (const [jours, id] of ATTENDUS) {
  const p = palierFlamme(jours);
  verdict(`${jours} jour(s) → ${id}`, p.id === id, p.nom);
}

/* ── Le cas réel : la série de Louis le 2026-10-17 ─────────────────────── */

{
  const e = etatFlamme(12);
  verdict(
    "12 jours → Feu, plus que 18 jours avant Brasier",
    e.palier.id === "feu" && e.suivant?.id === "brasier" && e.restant === 18 && !e.nouvelle,
    `${e.palier.nom}, ${e.restant} avant ${e.suivant?.nom ?? "rien"}`,
  );
}
{
  // Après une coupure, on repart d'une Lueur et la suivante est à deux jours.
  const e = etatFlamme(1);
  verdict("1 jour → Lueur, plus que 2 jours avant Flamme", e.palier.id === "lueur" && e.restant === 2 && e.suivant?.id === "flamme", `${e.restant}`);
}
{
  const e = etatFlamme(140);
  verdict("au dernier palier : plus de suivant, plus de reste", e.suivant === null && e.restant === 0, `${e.palier.nom}`);
}

/* ── Le jour où une flamme arrive, et seulement ce jour-là ─────────────── */

for (const p of PALIERS_FLAMME) {
  if (p.des === 1) {
    verdict("la Lueur n'est jamais « nouvelle »", !etatFlamme(1).nouvelle, "jour 1");
    continue;
  }
  verdict(`${p.nom} arrive le jour ${p.des}`, etatFlamme(p.des).nouvelle && etatFlamme(p.des).palier.id === p.id, "nouvelle");
  verdict(`${p.nom} n'est plus nouvelle le lendemain`, !etatFlamme(p.des + 1).nouvelle, `jour ${p.des + 1}`);
}

/* ── Balayage : la flamme ne recule jamais quand la série grandit ──────── */

{
  let bon = true;
  let rangPrecedent = 0;
  for (let j = 1; j <= 400; j++) {
    const e = etatFlamme(j);
    const rang = PALIERS_FLAMME.findIndex((p) => p.id === e.palier.id);
    if (rang < rangPrecedent) bon = false;
    if (e.suivant && j + e.restant !== e.suivant.des) bon = false;
    rangPrecedent = rang;
  }
  verdict("de 1 à 400 jours : jamais en recul, le reste tombe pile sur le palier suivant", bon, "balayage");
}

/* ── Les mêmes seuils que les badges de régularité ─────────────────────── */

const RACINE = path.resolve(import.meta.dirname, "..");
const lire = (fichier: string) => readFileSync(path.join(RACINE, fichier), "utf8");
/** Le code sans ses commentaires : une flamme citée en commentaire n'en affiche aucune. */
const code = (fichier: string) =>
  lire(fichier).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

{
  const seuils = [...lire("src/lib/badges.ts").matchAll(/derive\("serie",\s*(\d+),\s*"regularite"/g)].map((m) => Number(m[1]));
  const des = new Set(PALIERS_FLAMME.map((p) => p.des));
  verdict(
    "chaque badge de régularité tombe sur un palier de flamme",
    seuils.length >= 3 && seuils.every((s) => des.has(s)),
    seuils.join(", ") || "aucun badge lu",
  );
}

/* ── Par la source : une seule flamme, partout ─────────────────────────── */

const ECRANS = [
  "src/components/accueil/MaJournee.tsx",
  "src/components/accueil/FeuilleSerie.tsx",
  "src/app/profil/page.tsx",
  "src/app/profil/[username]/page.tsx",
  /* La fin de séance dessine la sienne dans ses morceaux (2026-10-17). */
  "src/components/seance/FinDeSeance.tsx",
  "src/components/accueil/RecapHier.tsx",
];
for (const fichier of ECRANS) {
  const source = code(fichier);
  verdict(`${fichier} dessine la série avec FlammeSerie`, source.includes("<FlammeSerie"), "le composant");
  verdict(`${fichier} n'affiche plus l'emoji 🔥`, !source.includes("🔥"), "aucun emoji");
}

{
  // Les deux dessins plats d'avant (la feuille, le profil), reconnaissables à leur tracé.
  const anciens = ["M20 2c2 8 12 13 12 25", "M12 1c1 5 7 8 7 15"];
  const fautifs = ECRANS.filter((f) => anciens.some((a) => lire(f).includes(a)));
  verdict("plus aucun ancien dessin de flamme", fautifs.length === 0, fautifs.join(", ") || "aucun");
}

{
  const dessin = lire("src/components/serie/FlammeSerie.tsx");
  const manquants = PALIERS_FLAMME.filter((p) => !new RegExp(`\\n  ${p.id}: "M`).test(dessin) || !new RegExp(`\\n  ${p.id}: \\{`).test(dessin));
  verdict("chaque palier a son contour et son dessin", manquants.length === 0, manquants.map((p) => p.id).join(", ") || "les cinq");
}

{
  const tuile = code("src/components/accueil/MaJournee.tsx");
  verdict("la tuile prend l'habit de son palier", /data-palier=\{flamme\.palier\.id\}/.test(tuile) && !tuile.includes("data-chaude"), "data-palier");
  const css = lire("src/components/accueil/MaJournee.module.css");
  // La Lueur aussi depuis la page « La traînée » (Louis, 2026-10-17) : une braise, plus le verre nu.
  // En début de ligne : `:global([data-theme="dark"]) .serie[...]` contient le même
  // sélecteur, et un habit sombre seul ne doit pas passer pour l'habit clair (témoin vérifié).
  const sansHabit = PALIERS_FLAMME.filter((p) => !new RegExp(`^\\.serie\\[data-palier="${p.id}"\\] \\{`, "m").test(css));
  verdict("chaque flamme a son habit, la Lueur comprise", sansHabit.length === 0 && !css.includes("data-chaude"), sansHabit.map((p) => p.id).join(", ") || "les cinq");
}

{
  const feuille = code("src/components/accueil/FeuilleSerie.tsx");
  verdict(
    "la rangée de la feuille suit la série en cours, jamais le record",
    /const tenue = p\.des <= serie;/.test(feuille) && feuille.includes("eteinte={!tenue}"),
    "FeuilleSerie.tsx",
  );
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
