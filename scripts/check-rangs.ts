/* ═══════════════════════════════════════════════════════════════════════
   check:rangs, le banc de la progression des rangs.

     npm run check:rangs

   ⚠️ IL EXERCE LE VRAI `progressionRang` (`lib/aura.ts`), puis il lit la
   source des quatre écrans qui montrent une progression de rang.

   LA RÈGLE QU'IL PROTÈGE (Louis, 2026-10-17) : la progression se compte
   DANS le rang en cours, et la galerie ne la montre que sur TON rang. La
   première galerie comptait `EXP / seuil` depuis zéro : un Or à 690 EXP y
   lisait 86 % sur son rang ET 86 % sur Platine (les deux visent 800), et
   23 % sur l'Éternel. La barre du profil, elle, disait 75 %.
   ═══════════════════════════════════════════════════════════════════════ */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cosmetiquesDuRang, JOKERS_PAR_MOIS, progressionRang, RANGS, RECOMPENSES_RANG, TITRE_DIAMANT } from "@/lib/aura";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}

/* ── Le cas réel : le compte de Louis le 2026-10-17 ───────────────────── */

{
  const p = progressionRang(690);
  verdict(
    "690 EXP → Or, 75 % vers Platine",
    p.rang.id === "or" && p.suivant?.id === "platine" && p.pourcent === 75,
    `${p.rang.nom}, ${p.pourcent} % vers ${p.suivant?.nom ?? "rien"}`,
  );
  verdict("690 EXP → plus que 110 EXP", p.restant === 110, `restant ${p.restant}`);
  verdict(
    "jamais le compte depuis zéro (690 / 800 = 86 %)",
    p.pourcent !== Math.floor((690 / 800) * 100),
    `${p.pourcent} %`,
  );
}

/* ── Chaque seuil : on entre dans un rang à 0 %, on le quitte avant 100 % ─ */

for (let i = 0; i < RANGS.length - 1; i++) {
  const rang = RANGS[i];
  const suivant = RANGS[i + 1];

  const debut = progressionRang(rang.min);
  verdict(
    `${rang.nom} tout juste atteint → 0 %`,
    debut.rang.id === rang.id && debut.part === 0 && debut.pourcent === 0,
    `${debut.pourcent} %`,
  );

  const veille = progressionRang(suivant.min - 1);
  verdict(
    `${rang.nom} à 1 EXP de ${suivant.nom} → jamais 100 %`,
    veille.rang.id === rang.id && veille.pourcent < 100 && veille.restant === 1,
    `${veille.pourcent} %, restant ${veille.restant}`,
  );
}

/* ── Le sommet : plus de chemin, donc plus de reste ───────────────────── */

for (const exp of [3000, 3001, 9999]) {
  const p = progressionRang(exp);
  verdict(
    `${exp} EXP → Éternel, plein, sans suivant`,
    p.rang.id === "eternel" && p.suivant === null && p.part === 1 && p.pourcent === 100 && p.restant === 0,
    `${p.pourcent} %, restant ${p.restant}`,
  );
}

/* ── Borné et jamais en recul à l'intérieur d'un rang ─────────────────── */

{
  let bon = true;
  let precedent = progressionRang(0);
  for (let exp = 1; exp <= 3200; exp++) {
    const p = progressionRang(exp);
    if (p.part < 0 || p.part > 1) bon = false;
    if (p.rang.id === precedent.rang.id && p.part < precedent.part) bon = false;
    precedent = p;
  }
  verdict("de 0 à 3200 EXP : part entre 0 et 1, jamais en recul dans un rang", bon, "balayage");
}

/* ── Par la source : une seule mesure, et un seul anneau ──────────────── */

const RACINE = path.resolve(import.meta.dirname, "..");
const lire = (fichier: string) => readFileSync(path.join(RACINE, fichier), "utf8");

{
  // Les deux formules qui ont existé à côté de `progressionRang` : la
  // recopie « dans le rang » des profils et de l'accueil, et le compte
  // depuis zéro de la première galerie.
  const formule = /exp\s*-\s*aura\.seuilBas|seuilHaut\s*-\s*aura\.seuilBas|expActuel\s*\/\s*cible/;
  const fautifs = (readdirSync(path.join(RACINE, "src"), { recursive: true }) as string[])
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(path.join("lib", "aura.ts")))
    .filter((f) => formule.test(readFileSync(path.join(RACINE, "src", f), "utf8")));
  verdict(
    "personne ne recalcule la progression à la main",
    fautifs.length === 0,
    fautifs.length ? fautifs.join(", ") : "aucun fichier",
  );
}

{
  const galerie = lire("src/components/rang/RangsModal.tsx");
  verdict(
    "l'anneau de la galerie ne se calcule que sur ton rang",
    /const prog = courant \? progressionRang\(expActuel\) : null/.test(galerie),
    "RangsModal.tsx",
  );
}

for (const fichier of [
  "src/app/profil/page.tsx",
  "src/app/profil/[username]/page.tsx",
  "src/components/accueil/MaJournee.tsx",
]) {
  verdict(`${fichier} lit progressionRang`, lire(fichier).includes("progressionRang("), "la même mesure");
}

/* ── Ce que chaque rang donne (2026-10-24, maquette « Le passage de rang ») ── */
{
  const sansRecompense = RANGS.filter((r) => !RECOMPENSES_RANG[r.id] || JOKERS_PAR_MOIS[r.id] === undefined).map((r) => r.id);
  verdict("chaque rang a ses récompenses et ses jokers", sansRecompense.length === 0, sansRecompense.join(", ") || `${RANGS.length} rangs`);

  const jokers = RANGS.map((r) => JOKERS_PAR_MOIS[r.id]);
  verdict(
    "1 joker à Argent, 2 à Or, 3 dès Platine",
    jokers.join(" ") === "0 1 2 3 3 3" && jokers.every((n, i) => i === 0 || n >= jokers[i - 1]),
    jokers.join(" "),
  );

  const decalages = RANGS.flatMap((r) =>
    RECOMPENSES_RANG[r.id]?.cadeaux.filter((c) => c.genre === "joker" && c.n !== JOKERS_PAR_MOIS[r.id]).map(() => r.id) ?? [],
  );
  verdict("la scène annonce les jokers que le rang donne vraiment", decalages.length === 0, decalages.join(", ") || "les mêmes nombres");

  const sansCarteNiCadre = RANGS.slice(1).filter((r) => {
    const genres = RECOMPENSES_RANG[r.id].cadeaux.map((c) => c.genre);
    return genres[0] !== "carte" || genres[1] !== "cadre" || genres.length !== 3;
  });
  verdict(
    "chaque passage ouvre trois cadeaux : la carte, le cadre, puis le reste",
    sansCarteNiCadre.length === 0 && RECOMPENSES_RANG.bronze.cadeaux.length === 0,
    sansCarteNiCadre.map((r) => r.id).join(", ") || "de l'Argent à l'Éternel, rien au Bronze",
  );

  const c = (id: string) => cosmetiquesDuRang(id);
  verdict(
    "le cadre dès l'Argent, le titre au Diamant, la lumière à l'Éternel",
    c("bronze").cadre === null && c("argent").cadre === "argent" && c("eternel").cadre === "eternel"
      && c("platine").titre === null && c("diamant").titre === TITRE_DIAMANT && !c("diamant").brillant && c("eternel").brillant,
    "cumulé, déduit du rang",
  );
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
